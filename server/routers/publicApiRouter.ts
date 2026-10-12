import { Router, Request, Response, NextFunction } from "express";
import { db, pool } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { isProTier } from "../middleware";
import crypto from "crypto";

const router = Router();

interface AuthedReq extends Request {
  apiUser?: { id: string; subscriptionTier: string };
}

async function requireApiKey(req: AuthedReq, res: Response, next: NextFunction) {
  try {
    const auth = req.header("Authorization") || "";
    const m = /^Bearer\s+(.+)$/i.exec(auth);
    if (!m) return res.status(401).json({ error: "missing_bearer_token" });
    const raw = m[1].trim();
    if (!raw.startsWith("qp_")) return res.status(401).json({ error: "invalid_token_format" });
    const hash = crypto.createHash("sha256").update(raw).digest("hex");
    const result = await pool.query(
      `SELECT id, subscription_tier FROM users WHERE api_key_hash = $1 LIMIT 1`,
      [hash]
    );
    const u = result.rows[0];
    if (!u) return res.status(401).json({ error: "invalid_token" });
    if (!isProTier(u.subscription_tier)) {
      return res.status(403).json({ error: "tier_required", required: "pro" });
    }
    req.apiUser = { id: u.id, subscriptionTier: u.subscription_tier };
    next();
  } catch (e: any) {
    console.error("[public-api] auth error:", e?.message);
    res.status(500).json({ error: "auth_failed" });
  }
}

/**
 * GET /api/v1/conversations
 * Paginated list of AI Concierge conversations for the authenticated owner.
 * Query params: limit (1-100, default 25), offset (default 0)
 */
router.get("/api/v1/conversations", requireApiKey, async (req: AuthedReq, res: Response) => {
  try {
    const userId = req.apiUser!.id;
    const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || "25"), 10) || 25));
    const offset = Math.max(0, parseInt(String(req.query.offset || "0"), 10) || 0);

    const r = await pool.query(
      `SELECT c.id, c.quote_id, c.started_at, c.last_message_at,
              c.detected_language, c.total_messages,
              c.resulted_in_acceptance, c.resulted_in_negotiation,
              c.final_negotiated_total,
              q.public_token, q.total as quote_total, q.status as quote_status,
              cu.first_name, cu.last_name, cu.email as customer_email
       FROM quote_ai_conversations c
       LEFT JOIN quotes q ON q.id = c.quote_id
       LEFT JOIN businesses b ON b.id = q.business_id
       LEFT JOIN customers cu ON cu.id = q.customer_id
       WHERE b.owner_user_id = $1
       ORDER BY c.last_message_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countRes = await pool.query(
      `SELECT COUNT(*)::int as n FROM quote_ai_conversations c
       LEFT JOIN quotes q ON q.id = c.quote_id
       LEFT JOIN businesses b ON b.id = q.business_id
       WHERE b.owner_user_id = $1`,
      [userId]
    );

    res.json({
      conversations: r.rows.map((row) => ({
        id: row.id,
        quoteId: row.quote_id,
        publicToken: row.public_token,
        quoteTotal: row.quote_total ? parseFloat(row.quote_total) : null,
        quoteStatus: row.quote_status,
        startedAt: row.started_at,
        lastMessageAt: row.last_message_at,
        language: row.detected_language,
        totalMessages: row.total_messages,
        accepted: row.resulted_in_acceptance,
        negotiated: row.resulted_in_negotiation,
        finalNegotiatedTotal: row.final_negotiated_total ? parseFloat(row.final_negotiated_total) : null,
        customerName: [row.first_name, row.last_name].filter(Boolean).join(" ") || null,
        customerEmail: row.customer_email || null,
      })),
      pagination: {
        limit,
        offset,
        total: countRes.rows[0]?.n ?? 0,
      },
    });
  } catch (e: any) {
    console.error("[public-api] conversations list error:", e?.message);
    res.status(500).json({ error: "list_failed" });
  }
});

/**
 * GET /api/v1/conversations/:id
 * Full conversation detail including messages + intent signals.
 */
router.get("/api/v1/conversations/:id", requireApiKey, async (req: AuthedReq, res: Response) => {
  try {
    const userId = req.apiUser!.id;
    const convId = req.params.id;

    const owns = await pool.query(
      `SELECT c.id, c.quote_id, c.detected_language, c.total_messages,
              c.resulted_in_acceptance, c.resulted_in_negotiation,
              c.final_negotiated_total, c.started_at, c.last_message_at,
              q.public_token, q.total as quote_total, q.status as quote_status,
              cu.first_name, cu.last_name, cu.email as customer_email
       FROM quote_ai_conversations c
       LEFT JOIN quotes q ON q.id = c.quote_id
       LEFT JOIN businesses b ON b.id = q.business_id
       LEFT JOIN customers cu ON cu.id = q.customer_id
       WHERE c.id = $1 AND b.owner_user_id = $2`,
      [convId, userId]
    );
    const conv = owns.rows[0];
    if (!conv) return res.status(404).json({ error: "conversation_not_found" });

    const msgs = await pool.query(
      `SELECT id, role, content, content_type, structured_payload, input_method, created_at
       FROM quote_ai_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [convId]
    );

    const signals = await pool.query(
      `SELECT signal_type, signal_detail, created_at
       FROM quote_ai_intent_signals
       WHERE quote_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [conv.quote_id]
    );

    res.json({
      id: conv.id,
      quoteId: conv.quote_id,
      publicToken: conv.public_token,
      quoteTotal: conv.quote_total ? parseFloat(conv.quote_total) : null,
      quoteStatus: conv.quote_status,
      startedAt: conv.started_at,
      lastMessageAt: conv.last_message_at,
      language: conv.detected_language,
      totalMessages: conv.total_messages,
      accepted: conv.resulted_in_acceptance,
      negotiated: conv.resulted_in_negotiation,
      finalNegotiatedTotal: conv.final_negotiated_total ? parseFloat(conv.final_negotiated_total) : null,
      customerName: [conv.first_name, conv.last_name].filter(Boolean).join(" ") || null,
      customerEmail: conv.customer_email || null,
      messages: msgs.rows.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        contentType: m.content_type,
        structuredPayload: m.structured_payload,
        inputMethod: m.input_method,
        createdAt: m.created_at,
      })),
      intentSignals: signals.rows.map((s) => ({
        type: s.signal_type,
        detail: s.signal_detail,
        createdAt: s.created_at,
      })),
    });
  } catch (e: any) {
    console.error("[public-api] conversation detail error:", e?.message);
    res.status(500).json({ error: "detail_failed" });
  }
});

export default router;
