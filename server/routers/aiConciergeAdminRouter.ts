import { Router, Request, Response } from "express";
import { db, pool } from "../db";
import {
  users,
  quotes,
  customers,
  quoteAiConversations,
  quoteAiMessages,
  quoteAiIntentSignals,
  quoteNegotiationGuardrails,
  businesses,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireGrowth, requirePro, isGrowthOrAbove, isProTier } from "../middleware";
import { handleQuestion, normalizePersonality, PERSONALITY_PRESETS } from "../services/aiConcierge";
import { getConciergeInsights } from "../services/conciergeInsights";
import crypto from "crypto";

const router = Router();

/* ─── Settings ──────────────────────────────────────────────────────────── */

router.get("/api/business/ai-concierge/settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!u) return res.status(404).json({ error: "user_not_found" });

    const tier = (u as any).subscriptionTier;
    const settings = (u as any).aiWidgetSettings || {};
    const [guard] = await db
      .select()
      .from(quoteNegotiationGuardrails)
      .where(eq(quoteNegotiationGuardrails.userId, userId))
      .limit(1);

    res.json({
      tier,
      canNegotiate: isGrowthOrAbove(tier),
      canMultilingual: isGrowthOrAbove(tier),
      canPostBookingActions: isGrowthOrAbove(tier),
      canCustomPersonality: isProTier(tier),
      canWhitelabel: isProTier(tier),
      canApiAccess: isProTier(tier),
      canSandbox: isGrowthOrAbove(tier),
      defaultEnabled: settings.enabled !== false,
      // Always return canonical personality (legacy mapping handled here)
      personality: normalizePersonality(settings.personality),
      personalityOptions: PERSONALITY_PRESETS,
      defaultPrompts: settings.defaultPrompts || [],
      voiceTone: settings.voiceTone || "",
      bannedTopics: settings.bannedTopics || [],
      // Pro-only custom training fields
      customSystemPrompt: settings.customSystemPrompt || "",
      brandVoiceDescription: settings.brandVoiceDescription || "",
      sampleResponses: Array.isArray(settings.sampleResponses) ? settings.sampleResponses : [],
      guardrails: guard
        ? {
            maxDiscountPercent: parseFloat(String(guard.maxDiscountPercent ?? 15)),
            autoApproveThreshold: parseFloat(String(guard.autoApproveThreshold ?? 5)),
            requiresOwnerApprovalAbove: parseFloat(String(guard.requiresOwnerApprovalAbove ?? 15)),
            removableAddons: guard.removableAddons || [],
            nonNegotiableItems: guard.nonNegotiableItems || [],
          }
        : {
            maxDiscountPercent: 15,
            autoApproveThreshold: 5,
            requiresOwnerApprovalAbove: 15,
            removableAddons: [],
            nonNegotiableItems: [],
          },
    });
  } catch (e: any) {
    console.error("[ai-concierge-admin] settings error:", e?.message);
    res.status(500).json({ error: "settings_failed" });
  }
});

router.put("/api/business/ai-concierge/settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!u) return res.status(404).json({ error: "user_not_found" });

    const tier = (u as any).subscriptionTier;
    const body = req.body || {};
    // Accept canonical presets + legacy (mapped via normalizePersonality)
    const canonicalAll = ["professional", "friendly", "concierge", "custom"];
    const legacyAll = ["concierge", "sales", "casual"]; // legacy synonyms
    const allowed = isProTier(tier)
      ? new Set([...canonicalAll, ...legacyAll])
      : new Set([...canonicalAll.filter((p) => p !== "custom"), ...legacyAll]);

    const settings: any = (u as any).aiWidgetSettings || {};
    if (typeof body.defaultEnabled === "boolean") settings.enabled = body.defaultEnabled;
    if (typeof body.personality === "string" && allowed.has(body.personality)) {
      // Normalize legacy values to canonical on save
      settings.personality = normalizePersonality(body.personality);
    }
    if (Array.isArray(body.defaultPrompts)) {
      settings.defaultPrompts = body.defaultPrompts.filter((p: any) => typeof p === "string").slice(0, 8);
    }
    if (typeof body.voiceTone === "string" && isProTier(tier)) {
      settings.voiceTone = body.voiceTone.slice(0, 500);
    }
    if (Array.isArray(body.bannedTopics)) {
      settings.bannedTopics = body.bannedTopics.filter((t: any) => typeof t === "string").slice(0, 12);
    }
    // T205: Pro-only custom personality training
    if (isProTier(tier)) {
      if (typeof body.customSystemPrompt === "string") {
        settings.customSystemPrompt = body.customSystemPrompt.slice(0, 4000);
      }
      if (typeof body.brandVoiceDescription === "string") {
        settings.brandVoiceDescription = body.brandVoiceDescription.slice(0, 1000);
      }
      if (Array.isArray(body.sampleResponses)) {
        settings.sampleResponses = body.sampleResponses
          .filter((s: any) => s && typeof s.question === "string" && typeof s.answer === "string")
          .slice(0, 10)
          .map((s: any) => ({
            question: String(s.question).slice(0, 300),
            answer: String(s.answer).slice(0, 800),
          }));
      }
    }

    await db.update(users).set({ aiWidgetSettings: settings }).where(eq(users.id, userId));

    // Save guardrails if owner is on growth+ tier
    if (isGrowthOrAbove(tier) && body.guardrails && typeof body.guardrails === "object") {
      const g = body.guardrails;
      const maxDiscount = Math.max(0, Math.min(40, parseFloat(String(g.maxDiscountPercent ?? 15)) || 15));
      const autoApprove = Math.max(0, Math.min(maxDiscount, parseFloat(String(g.autoApproveThreshold ?? 5)) || 5));
      const requiresApproval = Math.max(0, Math.min(50, parseFloat(String(g.requiresOwnerApprovalAbove ?? 15)) || 15));
      const removable = Array.isArray(g.removableAddons)
        ? g.removableAddons.filter((x: any) => typeof x === "string").slice(0, 30)
        : [];
      const nonNeg = Array.isArray(g.nonNegotiableItems)
        ? g.nonNegotiableItems.filter((x: any) => typeof x === "string").slice(0, 30)
        : [];

      await pool.query(
        `INSERT INTO quote_negotiation_guardrails
           (user_id, max_discount_percent, auto_approve_threshold, requires_owner_approval_above, removable_addons, non_negotiable_items, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           max_discount_percent = EXCLUDED.max_discount_percent,
           auto_approve_threshold = EXCLUDED.auto_approve_threshold,
           requires_owner_approval_above = EXCLUDED.requires_owner_approval_above,
           removable_addons = EXCLUDED.removable_addons,
           non_negotiable_items = EXCLUDED.non_negotiable_items,
           updated_at = NOW()`,
        [
          userId,
          maxDiscount.toFixed(2),
          autoApprove.toFixed(2),
          requiresApproval.toFixed(2),
          JSON.stringify(removable),
          JSON.stringify(nonNeg),
        ]
      );
    }

    res.json({ ok: true });
  } catch (e: any) {
    console.error("[ai-concierge-admin] settings save error:", e?.message);
    res.status(500).json({ error: "save_failed" });
  }
});

/* ─── Conversations list + detail ────────────────────────────────────────── */

router.get("/api/business/ai-concierge/conversations", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const limit = Math.min(50, parseInt(String(req.query.limit || "30"), 10) || 30);

    const r = await pool.query(
      `SELECT c.id, c.quote_id, c.customer_session_id, c.started_at, c.last_message_at,
              c.detected_language, c.total_messages, c.resulted_in_acceptance,
              c.resulted_in_negotiation, c.final_negotiated_total,
              q.public_token, q.total as quote_total, q.status as quote_status,
              q.frequency_selected, q.selected_option,
              cu.first_name, cu.last_name
       FROM quote_ai_conversations c
       LEFT JOIN quotes q ON q.id = c.quote_id
       LEFT JOIN businesses b ON b.id = q.business_id
       LEFT JOIN customers cu ON cu.id = q.customer_id
       WHERE b.owner_user_id = $1
       ORDER BY c.last_message_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json({
      conversations: r.rows.map((row) => ({
        id: row.id,
        quoteId: row.quote_id,
        publicToken: row.public_token,
        quoteTotal: row.quote_total,
        quoteStatus: row.quote_status,
        frequency: row.frequency_selected,
        tier: row.selected_option,
        startedAt: row.started_at,
        lastMessageAt: row.last_message_at,
        language: row.detected_language,
        totalMessages: row.total_messages,
        accepted: row.resulted_in_acceptance,
        negotiated: row.resulted_in_negotiation,
        finalNegotiatedTotal: row.final_negotiated_total,
        customerName: [row.first_name, row.last_name].filter(Boolean).join(" ") || "Customer",
      })),
    });
  } catch (e: any) {
    console.error("[ai-concierge-admin] conv list error:", e?.message);
    res.status(500).json({ error: "list_failed" });
  }
});

router.get("/api/business/ai-concierge/conversations/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const convId = req.params.id;

    // Validate ownership
    const owns = await pool.query(
      `SELECT c.id FROM quote_ai_conversations c
       LEFT JOIN quotes q ON q.id = c.quote_id
       LEFT JOIN businesses b ON b.id = q.business_id
       WHERE c.id = $1 AND b.owner_user_id = $2`,
      [convId, userId]
    );
    if (!owns.rows[0]) return res.status(404).json({ error: "not_found" });

    const msgs = await db
      .select()
      .from(quoteAiMessages)
      .where(eq(quoteAiMessages.conversationId, convId))
      .orderBy(quoteAiMessages.createdAt);

    const signals = await pool.query(
      `SELECT * FROM quote_ai_intent_signals s
       JOIN quote_ai_conversations c ON c.quote_id = s.quote_id
       WHERE c.id = $1
       ORDER BY s.created_at DESC LIMIT 20`,
      [convId]
    );

    res.json({
      messages: msgs.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        contentType: m.contentType,
        structuredPayload: m.structuredPayload,
        inputMethod: m.inputMethod,
        createdAt: m.createdAt,
      })),
      intentSignals: signals.rows,
    });
  } catch (e: any) {
    console.error("[ai-concierge-admin] conv detail error:", e?.message);
    res.status(500).json({ error: "detail_failed" });
  }
});

/* ─── Per-quote toggle ──────────────────────────────────────────────────── */

router.put("/api/business/quotes/:quoteId/ai-widget", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const { enabled, personality } = req.body || {};

    // Validate ownership AND fetch tier in one go
    const owns = await pool.query(
      `SELECT q.id, u.subscription_tier FROM quotes q
       LEFT JOIN businesses b ON b.id = q.business_id
       LEFT JOIN users u ON u.id = b.owner_user_id
       WHERE q.id = $1 AND b.owner_user_id = $2`,
      [req.params.quoteId, userId]
    );
    if (!owns.rows[0]) return res.status(404).json({ error: "quote_not_found" });
    const tier = owns.rows[0].subscription_tier;

    const updates: any = {};
    if (typeof enabled === "boolean") updates.aiWidgetEnabled = enabled;
    // Per-quote personality override is a Growth+ feature (Starter is locked to default).
    if (typeof personality === "string") {
      if (!isGrowthOrAbove(tier)) {
        return res.status(403).json({ error: "tier_required", required: "growth" });
      }
      const allowedPerQuote = new Set([
        "professional", "friendly", "concierge", // canonical
        "sales", "casual", // legacy → mapped on save
      ]);
      if (allowedPerQuote.has(personality)) {
        updates.aiWidgetPersonality = normalizePersonality(personality);
      }
    }
    if (Object.keys(updates).length) {
      await db.update(quotes).set(updates).where(eq(quotes.id, req.params.quoteId));
    }
    res.json({ ok: true });
  } catch (e: any) {
    console.error("[ai-concierge-admin] quote-toggle error:", e?.message);
    res.status(500).json({ error: "toggle_failed" });
  }
});

/* ─── Sandbox tester (PRO only) ─────────────────────────────────────────── */

router.post("/api/business/ai-concierge/sandbox", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const tier = (u as any)?.subscriptionTier;
    if (!isGrowthOrAbove(tier)) {
      return res.status(403).json({ error: "tier_required", required: "growth" });
    }
    const { message, history } = req.body || {};
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message_required" });
    }

    const [biz] = await db.select().from(businesses).where(eq(businesses.ownerUserId, userId)).limit(1);
    if (!biz) return res.status(404).json({ error: "business_not_found" });

    const [guard] = await db
      .select()
      .from(quoteNegotiationGuardrails)
      .where(eq(quoteNegotiationGuardrails.userId, userId))
      .limit(1);

    // Build a synthetic 2-bed/2-bath quote at $250/biweekly Better tier
    const fakeQuote: any = {
      id: "sandbox-" + userId,
      businessId: (biz as any).id,
      customerId: null,
      propertyBeds: 2,
      propertyBaths: 2,
      propertySqft: 1200,
      frequencySelected: "Biweekly",
      selectedOption: "Better",
      subtotal: "230.00",
      tax: "20.00",
      total: "250.00",
      status: "sent",
      options: { Good: { total: 200 }, Better: { total: 250 }, Best: { total: 320 } },
      addOns: {},
      propertyDetails: {},
    };
    const fakeCust: any = { firstName: "Customer", lastName: "" };

    const settings = (u as any)?.aiWidgetSettings || {};
    const ownerSettings = {
      enabled: settings.enabled !== false,
      personality: settings.personality || "concierge",
      defaultPrompts: settings.defaultPrompts,
      voiceTone: settings.voiceTone,
      bannedTopics: settings.bannedTopics,
    };

    const ctx: any = {
      quote: fakeQuote,
      business: biz,
      customer: fakeCust,
      owner: u,
      guardrails: guard || null,
      ownerCanNegotiate: isGrowthOrAbove(tier),
      ownerCanCustomPersonality: isProTier(tier),
      ownerSettings,
      isPostAcceptance: false,
    };

    const result = await handleQuestion({
      quoteId: fakeQuote.id,
      sessionId: "sandbox-" + userId,
      message: message.trim(),
      ctxOverride: ctx,
    });

    res.json({
      content: result.content,
      contentType: result.contentType,
      structuredPayload: result.structuredPayload,
      intent: result.intent,
      detectedLanguage: result.detectedLanguage,
      suggestedFollowups: result.suggestedFollowups,
    });
  } catch (e: any) {
    console.error("[ai-concierge-admin] sandbox error:", e?.message);
    res.status(500).json({ error: "sandbox_failed" });
  }
});

/* ─── Insights / weekly digest data ─────────────────────────────────────── */

router.post(
  "/api/business/ai-concierge/digest/test",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const tier = (u as any)?.subscriptionTier;
      if (!isGrowthOrAbove(tier)) {
        return res.status(403).json({ error: "tier_required", required: "growth" });
      }
      const { sendConciergeDigests } = await import("../cron/conciergeDigest");
      const result = await sendConciergeDigests({ force: true, userIdFilter: userId });
      res.json({ ok: true, ...result });
    } catch (e: any) {
      console.error("[ai-concierge-admin] digest test error:", e?.message);
      res.status(500).json({ error: "digest_test_failed" });
    }
  }
);

router.get(
  "/api/business/ai-concierge/insights/latest",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const tier = (u as any)?.subscriptionTier;
      if (!isGrowthOrAbove(tier)) {
        return res.status(403).json({ error: "tier_required", required: "growth" });
      }
      const data = await getConciergeInsights(userId, 7);
      res.json(data);
    } catch (e: any) {
      console.error("[ai-concierge-admin] insights error:", e?.message);
      res.status(500).json({ error: "insights_failed" });
    }
  }
);

/* ─── T208: API key management (Pro only) ──────────────────────────────── */

router.get("/api/business/api-keys", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!u) return res.status(404).json({ error: "user_not_found" });
    const tier = (u as any).subscriptionTier;
    if (!isProTier(tier)) return res.status(403).json({ error: "tier_required", required: "pro" });
    res.json({
      hasKey: !!(u as any).apiKeyHash,
      createdAt: (u as any).apiKeyCreatedAt || null,
      // Never return the raw key — only metadata
    });
  } catch (e: any) {
    console.error("[api-keys] get error:", e?.message);
    res.status(500).json({ error: "fetch_failed" });
  }
});

router.post("/api/business/api-keys/rotate", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!u) return res.status(404).json({ error: "user_not_found" });
    const tier = (u as any).subscriptionTier;
    if (!isProTier(tier)) return res.status(403).json({ error: "tier_required", required: "pro" });

    // Generate a 32-byte random key, prefix with qp_
    const raw = "qp_" + crypto.randomBytes(32).toString("base64url");
    const hash = crypto.createHash("sha256").update(raw).digest("hex");

    await pool.query(
      `UPDATE users SET api_key_hash = $1, api_key_created_at = NOW() WHERE id = $2`,
      [hash, userId]
    );

    // Return the raw key ONCE — it cannot be retrieved later
    res.json({ ok: true, apiKey: raw, createdAt: new Date().toISOString() });
  } catch (e: any) {
    console.error("[api-keys] rotate error:", e?.message);
    res.status(500).json({ error: "rotate_failed" });
  }
});

export default router;
