import { Router, Request, Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import crypto from "crypto";
import { db } from "../db";
import { quotes } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  handleQuestion,
  loadQuoteContext,
  buildSuggestedPrompts,
  acceptOffer,
  buildNudge,
  markNudgeEngaged,
  handleAddAddon,
  handleReschedule,
} from "../services/aiConcierge";
import { trackEvent } from "../analytics";
import { AnalyticsEvents } from "@shared/analytics-events";

const router = Router();

const messageLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const ipPart = ipKeyGenerator(req.ip || "");
    const token = (req.params && req.params.token) || "no-token";
    return `concierge:${ipPart}:${token}`;
  },
  message: { error: "rate_limited", message: "Too many messages — please slow down a bit." },
});

const globalIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 200,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `concierge-ip:${ipKeyGenerator(req.ip || "")}`,
  message: { error: "rate_limited", message: "Too many requests — please try again later." },
});

const offerLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const ipPart = ipKeyGenerator(req.ip || "");
    const token = (req.params && req.params.token) || "no-token";
    return `concierge-offer:${ipPart}:${token}`;
  },
  message: { error: "rate_limited", message: "Too many offer attempts — please slow down." },
});

async function loadQuoteByToken(token: string) {
  if (!token || typeof token !== "string" || token.length < 8) return null;
  const [q] = await db.select().from(quotes).where(eq(quotes.publicToken, token)).limit(1);
  return q || null;
}

function ensureSessionId(req: Request, res: Response): string {
  const cookieSid = (req as any).cookies?.qpc_sid || "";
  if (cookieSid && /^[a-zA-Z0-9-]{8,64}$/.test(cookieSid)) return cookieSid;
  const fresh = crypto.randomUUID();
  res.cookie("qpc_sid", fresh, {
    httpOnly: false,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === "production",
  });
  return fresh;
}

/* ─── GET /init ──────────────────────────────────────────────────────────── */
router.get("/api/q/:token/ai/init", globalIpLimiter, async (req: Request, res: Response) => {
  try {
    const q = await loadQuoteByToken(req.params.token);
    if (!q) return res.status(404).json({ error: "quote_not_found" });
    if (q.aiWidgetEnabled === false) return res.json({ enabled: false });
    const ctx = await loadQuoteContext(q.id);
    if (!ctx) return res.status(404).json({ error: "quote_not_found" });
    if (!ctx.ownerSettings.enabled) return res.json({ enabled: false });

    const sessionId = ensureSessionId(req, res);
    const businessName =
      (ctx.business as any)?.companyName ||
      (ctx.business as any)?.businessName ||
      "your cleaner";

    // Track widget opened (analytics) — fire once per session per quote on first init
    const ownerId = (ctx.business as any)?.ownerUserId;
    if (ownerId) {
      trackEvent(ownerId, AnalyticsEvents.CONCIERGE_WIDGET_OPENED, {
        quoteId: q.id,
        sessionId,
        postAcceptance: ctx.isPostAcceptance,
      }).catch(() => {});
    }

    return res.json({
      enabled: true,
      sessionId,
      businessName,
      brandColor: (ctx.business as any)?.primaryColor || "#1e3a5f",
      isPostAcceptance: ctx.isPostAcceptance,
      // Capability flags drive the customer-facing widget UI
      ownerCanNegotiate: ctx.ownerCanNegotiate,
      ownerCanMultilingual: ctx.ownerCanMultilingual,
      ownerCanProactiveNudge: ctx.ownerCanProactiveNudge,
      ownerCanPostBookingActions: ctx.ownerCanPostBookingActions,
      // T206: white-label flag — false on Starter/Growth (show "Powered by QuotePro" footer)
      whitelabel: ctx.ownerWhitelabel,
      personality: ctx.ownerSettings.personality,
      suggestedPrompts: buildSuggestedPrompts(ctx),
    });
  } catch (e: any) {
    console.error("[ai-concierge] init error:", e?.message);
    return res.status(500).json({ error: "init_failed" });
  }
});

/* ─── POST /message ──────────────────────────────────────────────────────── */
router.post(
  "/api/q/:token/ai/message",
  globalIpLimiter,
  messageLimiter,
  async (req: Request, res: Response) => {
    try {
      const { message, inputMethod } = req.body || {};
      if (typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ error: "message_required" });
      }
      if (message.length > 1000) {
        return res.status(400).json({ error: "message_too_long" });
      }

      const q = await loadQuoteByToken(req.params.token);
      if (!q) return res.status(404).json({ error: "quote_not_found" });
      if (q.aiWidgetEnabled === false) return res.status(403).json({ error: "widget_disabled" });

      const sessionId = ensureSessionId(req, res);
      const result = await handleQuestion({
        quoteId: q.id,
        sessionId,
        message: message.trim(),
        inputMethod:
          inputMethod === "suggested_prompt" || inputMethod === "proactive_nudge"
            ? inputMethod
            : "text",
      });

      return res.json({
        content: result.content,
        contentType: result.contentType,
        structuredPayload: result.structuredPayload,
        intent: result.intent,
        conversationId: result.conversationId,
        sessionId,
        detectedLanguage: result.detectedLanguage,
        suggestedFollowups: result.suggestedFollowups,
        pendingOwnerApproval: result.pendingOwnerApproval || null,
      });
    } catch (e: any) {
      console.error("[ai-concierge] message error:", e?.message);
      if (e?.message === "quote_not_found") return res.status(404).json({ error: "quote_not_found" });
      return res.status(500).json({ error: "concierge_failed" });
    }
  }
);

/* ─── POST /accept-offer ─────────────────────────────────────────────────── */
router.post(
  "/api/q/:token/ai/accept-offer",
  globalIpLimiter,
  offerLimiter,
  async (req: Request, res: Response) => {
    try {
      const { offeredTotal, conversationId } = req.body || {};
      const offered = parseFloat(String(offeredTotal));
      if (!isFinite(offered) || offered <= 0) {
        return res.status(400).json({ error: "offered_total_required" });
      }
      if (!conversationId || typeof conversationId !== "string") {
        return res.status(400).json({ error: "conversation_id_required" });
      }
      const q = await loadQuoteByToken(req.params.token);
      if (!q) return res.status(404).json({ error: "quote_not_found" });
      if (q.aiWidgetEnabled === false) return res.status(403).json({ error: "widget_disabled" });
      if (q.status !== "sent") return res.status(400).json({ error: "quote_not_open" });

      const sessionId = ensureSessionId(req, res);
      const result = await acceptOffer({ quoteId: q.id, sessionId, offeredTotal: offered, conversationId });
      if (!result) return res.status(400).json({ error: "offer_invalid" });

      return res.json({
        ok: true,
        finalTotal: result.finalTotal,
        conversationId: result.conversationId,
        sessionId,
      });
    } catch (e: any) {
      console.error("[ai-concierge] accept-offer error:", e?.message);
      return res.status(500).json({ error: "accept_failed" });
    }
  }
);

/* ─── GET /nudge ─────────────────────────────────────────────────────────── */
router.get("/api/q/:token/ai/nudge", globalIpLimiter, async (req: Request, res: Response) => {
  try {
    const trigger = (req.query.trigger as string) || "idle_90s";
    const valid = ["idle_90s", "scroll_past_price", "tier_toggle", "page_revisit", "mobile_zoom_pricing"];
    if (!valid.includes(trigger)) return res.status(400).json({ error: "bad_trigger" });

    const q = await loadQuoteByToken(req.params.token);
    if (!q) return res.status(404).json({ error: "quote_not_found" });
    if (q.aiWidgetEnabled === false) return res.json({ shouldShow: false });

    const sessionId = ensureSessionId(req, res);
    const result = await buildNudge({ quoteId: q.id, sessionId, trigger: trigger as any });
    if (!result) return res.status(404).json({ error: "quote_not_found" });
    return res.json(result);
  } catch (e: any) {
    console.error("[ai-concierge] nudge error:", e?.message);
    return res.status(500).json({ error: "nudge_failed" });
  }
});

/* ─── POST /nudge-engaged (analytics) ────────────────────────────────────── */
router.post("/api/q/:token/ai/nudge-engaged", globalIpLimiter, async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.body || {};
    if (typeof conversationId !== "string" || conversationId.length < 8) {
      return res.status(400).json({ error: "conversation_required" });
    }
    const q = await loadQuoteByToken(req.params.token);
    if (!q) return res.status(404).json({ error: "quote_not_found" });

    await markNudgeEngaged(conversationId);
    const ctx = await loadQuoteContext(q.id);
    const ownerId = (ctx?.business as any)?.ownerUserId;
    if (ownerId) {
      trackEvent(ownerId, AnalyticsEvents.CONCIERGE_NUDGE_CLICKED, { quoteId: q.id }).catch(() => {});
    }
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: "engaged_failed" });
  }
});

/* ─── T209: POST /add-addon ──────────────────────────────────────────────── */
router.post(
  "/api/q/:token/ai/add-addon",
  globalIpLimiter,
  offerLimiter,
  async (req: Request, res: Response) => {
    try {
      const { addonKey, conversationId } = req.body || {};
      if (typeof addonKey !== "string" || !addonKey.trim()) {
        return res.status(400).json({ error: "addon_required" });
      }
      if (typeof conversationId !== "string" || conversationId.length < 8) {
        return res.status(400).json({ error: "conversation_required" });
      }
      const q = await loadQuoteByToken(req.params.token);
      if (!q) return res.status(404).json({ error: "quote_not_found" });
      if (q.aiWidgetEnabled === false) return res.status(403).json({ error: "widget_disabled" });

      const sessionId = ensureSessionId(req, res);
      const result = await handleAddAddon({
        quoteId: q.id,
        sessionId,
        conversationId,
        addonKey: addonKey.trim(),
      });
      if (!result) return res.status(400).json({ error: "addon_failed" });
      return res.json({ ok: true, ...result, sessionId });
    } catch (e: any) {
      console.error("[ai-concierge] add-addon error:", e?.message);
      return res.status(500).json({ error: "addon_failed" });
    }
  }
);

/* ─── T210: POST /reschedule ─────────────────────────────────────────────── */
router.post(
  "/api/q/:token/ai/reschedule",
  globalIpLimiter,
  offerLimiter,
  async (req: Request, res: Response) => {
    try {
      const { datetime, conversationId } = req.body || {};
      if (typeof datetime !== "string" || !datetime.trim()) {
        return res.status(400).json({ error: "datetime_required" });
      }
      if (typeof conversationId !== "string" || conversationId.length < 8) {
        return res.status(400).json({ error: "conversation_required" });
      }
      const q = await loadQuoteByToken(req.params.token);
      if (!q) return res.status(404).json({ error: "quote_not_found" });
      if (q.aiWidgetEnabled === false) return res.status(403).json({ error: "widget_disabled" });

      const sessionId = ensureSessionId(req, res);
      const result = await handleReschedule({
        quoteId: q.id,
        sessionId,
        conversationId,
        datetime: datetime.trim(),
      });
      if (!result) return res.status(400).json({ error: "reschedule_failed" });
      return res.json({ ok: true, ...result, sessionId });
    } catch (e: any) {
      console.error("[ai-concierge] reschedule error:", e?.message);
      return res.status(500).json({ error: "reschedule_failed" });
    }
  }
);

export default router;
