import { pool } from "../db";

export interface ConciergeInsights {
  windowDays: number;
  totalConversations: number;
  totalMessages: number;
  acceptedAfterChat: number;
  negotiations: number;
  offersMade: number;
  offersAccepted: number;
  avgDiscountPct: number; // mean discount pct across accepted offers
  totalRevenueRecovered: number; // sum of (originalTotal - acceptedTotal) … negative? we report savings to customer = revenue concession
  topQuestions: { signal_type: string; count: number }[];
  topIntents: { intent: string; count: number }[];
  conversionLiftEstimate: number; // ratio: accept_rate_with_chat - accept_rate_without_chat (within window)
  languageBreakdown: { language: string; count: number }[];
}

export async function getConciergeInsights(userId: string, windowDays = 7): Promise<ConciergeInsights> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  // Conversation aggregates
  const conv = await pool.query(
    `SELECT
        COUNT(*)::int AS total_convs,
        COALESCE(SUM(c.total_messages),0)::int AS total_msgs,
        COUNT(*) FILTER (WHERE c.resulted_in_negotiation)::int AS negotiations,
        COUNT(*) FILTER (WHERE c.final_negotiated_total IS NOT NULL)::int AS offers_accepted
     FROM quote_ai_conversations c
     LEFT JOIN quotes q ON q.id = c.quote_id
     LEFT JOIN businesses b ON b.id = q.business_id
     WHERE b.owner_user_id = $1 AND c.last_message_at >= $2`,
    [userId, since]
  );
  const convRow = conv.rows[0] || {};

  // Avg discount pct + revenue concession
  const disc = await pool.query(
    `SELECT
        AVG( ((q.total::numeric - c.final_negotiated_total::numeric) / NULLIF(q.total::numeric,0)) * 100.0 )::float AS avg_pct,
        SUM(  q.total::numeric - c.final_negotiated_total::numeric )::float AS concession
     FROM quote_ai_conversations c
     LEFT JOIN quotes q ON q.id = c.quote_id
     LEFT JOIN businesses b ON b.id = q.business_id
     WHERE b.owner_user_id = $1 AND c.last_message_at >= $2 AND c.final_negotiated_total IS NOT NULL`,
    [userId, since]
  );
  const discRow = disc.rows[0] || {};

  // Offers made = count of assistant messages with content_type = 'offer'
  const offers = await pool.query(
    `SELECT COUNT(*)::int AS n
     FROM quote_ai_messages m
     JOIN quote_ai_conversations c ON c.id = m.conversation_id
     LEFT JOIN quotes q ON q.id = c.quote_id
     LEFT JOIN businesses b ON b.id = q.business_id
     WHERE b.owner_user_id = $1 AND m.created_at >= $2 AND m.role = 'assistant' AND m.content_type = 'offer'`,
    [userId, since]
  );
  const offersMade = offers.rows[0]?.n ?? 0;

  // Accepted-after-chat: quotes that have a conversation AND are accepted
  const acc = await pool.query(
    `SELECT COUNT(DISTINCT q.id)::int AS n
     FROM quotes q
     JOIN quote_ai_conversations c ON c.quote_id = q.id
     LEFT JOIN businesses b ON b.id = q.business_id
     WHERE b.owner_user_id = $1 AND q.accepted_at >= $2`,
    [userId, since]
  );
  const acceptedAfterChat = acc.rows[0]?.n ?? 0;

  // Conversion lift: accepted/sent for chats vs all
  const convRates = await pool.query(
    `WITH owned AS (
       SELECT q.id, q.status, q.accepted_at,
              EXISTS (SELECT 1 FROM quote_ai_conversations c WHERE c.quote_id = q.id AND c.total_messages > 0) AS had_chat
       FROM quotes q
       LEFT JOIN businesses b ON b.id = q.business_id
       WHERE b.owner_user_id = $1 AND (q.created_at >= $2 OR q.sent_at >= $2)
     )
     SELECT
       COUNT(*) FILTER (WHERE had_chat)::int AS chat_total,
       COUNT(*) FILTER (WHERE had_chat AND status = 'accepted')::int AS chat_accepted,
       COUNT(*) FILTER (WHERE NOT had_chat)::int AS no_chat_total,
       COUNT(*) FILTER (WHERE NOT had_chat AND status = 'accepted')::int AS no_chat_accepted
     FROM owned`,
    [userId, since]
  );
  const cr = convRates.rows[0] || {};
  const chatRate = cr.chat_total > 0 ? cr.chat_accepted / cr.chat_total : 0;
  const noChatRate = cr.no_chat_total > 0 ? cr.no_chat_accepted / cr.no_chat_total : 0;
  const conversionLift = chatRate - noChatRate;

  // Top questions / intents from intent_signals
  const sigs = await pool.query(
    `SELECT signal_type, COUNT(*)::int AS count
     FROM quote_ai_intent_signals
     WHERE user_id = $1 AND created_at >= $2
     GROUP BY signal_type
     ORDER BY count DESC LIMIT 5`,
    [userId, since]
  );

  // Language breakdown
  const langs = await pool.query(
    `SELECT c.detected_language AS language, COUNT(*)::int AS count
     FROM quote_ai_conversations c
     LEFT JOIN quotes q ON q.id = c.quote_id
     LEFT JOIN businesses b ON b.id = q.business_id
     WHERE b.owner_user_id = $1 AND c.last_message_at >= $2
     GROUP BY c.detected_language
     ORDER BY count DESC`,
    [userId, since]
  );

  return {
    windowDays,
    totalConversations: convRow.total_convs ?? 0,
    totalMessages: convRow.total_msgs ?? 0,
    acceptedAfterChat,
    negotiations: convRow.negotiations ?? 0,
    offersMade,
    offersAccepted: convRow.offers_accepted ?? 0,
    avgDiscountPct: Math.round((discRow.avg_pct ?? 0) * 10) / 10,
    totalRevenueRecovered: Math.round((discRow.concession ?? 0) * 100) / 100,
    topQuestions: sigs.rows,
    topIntents: sigs.rows.map((r: any) => ({ intent: r.signal_type, count: r.count })),
    conversionLiftEstimate: Math.round(conversionLift * 1000) / 1000,
    languageBreakdown: langs.rows,
  };
}
