/**
 * server/analytics.ts
 * Server-side analytics tracking and churn signal processing.
 *
 * trackEvent() is safe to call fire-and-forget — it never throws.
 */

import { pool } from "./db";
import { AnalyticsEvents, type AnalyticsEventName } from "../shared/analytics-events";
import { sendEmail, PLATFORM_FROM_NAME } from "./mail";

/* ─── Core track function ────────────────────────────────────────────────────── */

/**
 * Track an analytics event for a user.
 * - Looks up businessId from userId automatically.
 * - Deduplicates any event starting with "first_" — only the first occurrence is stored.
 * - Never throws. All errors are swallowed and logged silently.
 */
export async function trackEvent(
  userId: string,
  event: AnalyticsEventName,
  properties?: Record<string, any>
): Promise<void> {
  try {
    const bizRow = await pool.query(
      `SELECT id FROM businesses WHERE owner_user_id = $1 LIMIT 1`,
      [userId]
    );
    if (bizRow.rows.length === 0) return;
    const businessId = bizRow.rows[0].id;

    // Deduplicate "first_*" events
    if (event.startsWith("first_")) {
      const dupe = await pool.query(
        `SELECT id FROM analytics_events WHERE business_id = $1 AND event_name = $2 LIMIT 1`,
        [businessId, event]
      );
      if (dupe.rows.length > 0) return;
    }

    await pool.query(
      `INSERT INTO analytics_events (id, business_id, event_name, properties, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
      [businessId, event, JSON.stringify(properties ?? {})]
    );
  } catch (err: any) {
    console.warn(`[analytics] trackEvent(${event}) failed for user ${userId}:`, err.message);
  }
}

/* ─── Churn signal helpers ───────────────────────────────────────────────────── */

const DRIP_REPLY_TO = "quoteproforcleaners@gmail.com";
const CHURN_FROM_NAME = "Mike at QuotePro";
const APP_BASE_URL = process.env.PUBLIC_APP_URL || "https://getquotepro.ai";

function churnLayout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>QuotePro</title></head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <tr><td style="background:#1d3557;border-radius:12px 12px 0 0;padding:24px 40px;">
        <span style="font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.3px;">QuotePro AI</span>
      </td></tr>
      <tr><td style="background:#fff;padding:36px 40px;border-left:1px solid #e8e8e0;border-right:1px solid #e8e8e0;">${body}</td></tr>
      <tr><td style="background:#f9f9f7;border:1px solid #e8e8e0;border-top:none;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">
          <a href="${APP_BASE_URL}/app" style="color:#1d3557;text-decoration:none;">Open QuotePro</a>
          &nbsp;&bull;&nbsp;
          <a href="mailto:quoteproforcleaners@gmail.com" style="color:#9ca3af;text-decoration:none;">Reply to this email</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

async function hasChurnEmailSentRecently(
  userId: string,
  signalEvent: AnalyticsEventName,
  withinDays = 7
): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT ae.id FROM analytics_events ae
       JOIN businesses b ON b.id = ae.business_id
       WHERE b.owner_user_id = $1
         AND ae.event_name = $2
         AND ae.created_at > NOW() - INTERVAL '${withinDays} days'
       LIMIT 1`,
      [userId, signalEvent]
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

/* ─── Churn signal: inactive trial ──────────────────────────────────────────── */

async function processInactiveTrialSignals(): Promise<void> {
  const result = await pool.query<{
    id: string;
    email: string;
    name: string | null;
    trial_drip_enrolled_at: Date;
  }>(
    `SELECT u.id, u.email, u.name, u.trial_drip_enrolled_at
     FROM users u
     WHERE u.subscription_tier = 'free'
       AND u.trial_drip_enrolled_at IS NOT NULL
       AND u.trial_drip_enrolled_at > NOW() - INTERVAL '14 days'
       AND (u.last_login_at IS NULL OR u.last_login_at < NOW() - INTERVAL '7 days')`
  );

  for (const user of result.rows) {
    try {
      const alreadySent = await hasChurnEmailSentRecently(
        user.id,
        AnalyticsEvents.CHURN_RISK_INACTIVE_TRIAL,
        7
      );
      if (alreadySent) continue;

      const enrolledAt = new Date(user.trial_drip_enrolled_at);
      const daysLeft = Math.max(
        0,
        14 - Math.floor((Date.now() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24))
      );
      const firstName = user.name?.trim().split(/\s+/)[0] || user.email.split("@")[0];

      const html = churnLayout(`
        <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1d3557;">Are you still there, ${firstName}?</h2>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.7;">
          You signed up for QuotePro ${14 - daysLeft} days ago, but we haven't seen you back since.
          That's completely okay — life gets busy. Just wanted to check in.
        </p>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.7;">
          You have <strong>${daysLeft} day${daysLeft !== 1 ? "s" : ""} left</strong> in your Growth trial —
          all AI features are still unlocked and waiting for you.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr><td style="background:#1d3557;border-radius:8px;">
            <a href="${APP_BASE_URL}/app/quotes/new" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;">
              Send a quote in 60 seconds
            </a>
          </td></tr>
        </table>
        <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
          If you hit any friction getting started, just reply to this email — I'm the founder and I personally read every reply.
        </p>
        <hr style="border:none;border-top:1px solid #e8e8e0;margin:24px 0;"/>
        <p style="margin:0;font-size:13px;color:#9ca3af;font-style:italic;">
          — Mike, founder of QuotePro
        </p>
      `);

      await sendEmail({
        to: user.email,
        subject: `Are you still there, ${firstName}? Your trial has ${daysLeft} days left`,
        html,
        fromName: CHURN_FROM_NAME,
        replyTo: DRIP_REPLY_TO,
      });

      await trackEvent(user.id, AnalyticsEvents.CHURN_RISK_INACTIVE_TRIAL, {
        daysLeft,
        triggerType: "inactive_trial",
      });
    } catch (err: any) {
      console.warn(`[analytics] Churn signal (inactive trial) failed for ${user.email}:`, err.message);
    }
  }
}

/* ─── Churn signal: paid user no recent quote ────────────────────────────────── */

async function processPaidInactiveSignals(): Promise<void> {
  const result = await pool.query<{
    id: string;
    email: string;
    name: string | null;
  }>(
    `SELECT u.id, u.email, u.name
     FROM users u
     JOIN businesses b ON b.owner_user_id = u.id
     WHERE u.subscription_tier != 'free'
       AND NOT EXISTS (
         SELECT 1 FROM quotes q
         WHERE q.business_id = b.id
           AND q.created_at > NOW() - INTERVAL '14 days'
       )`
  );

  for (const user of result.rows) {
    try {
      const alreadySent = await hasChurnEmailSentRecently(
        user.id,
        AnalyticsEvents.CHURN_RISK_PAID_INACTIVE,
        14
      );
      if (alreadySent) continue;

      const firstName = user.name?.trim().split(/\s+/)[0] || user.email.split("@")[0];

      const html = churnLayout(`
        <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1d3557;">We noticed you haven't sent a quote in 2 weeks</h2>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.7;">
          Hey ${firstName} — everything okay over there? We noticed you haven't sent a quote through QuotePro in the last two weeks.
        </p>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.7;">
          If things slowed down, we totally understand. If something in QuotePro isn't working for you, I'd genuinely love to know — hit reply and tell me.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr><td style="background:#1d3557;border-radius:8px;">
            <a href="${APP_BASE_URL}/app/quotes/new" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;">
              Send a quote now
            </a>
          </td></tr>
        </table>
        <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
          Your account and all your data are safe. Just wanted to check in.
        </p>
        <hr style="border:none;border-top:1px solid #e8e8e0;margin:24px 0;"/>
        <p style="margin:0;font-size:13px;color:#9ca3af;font-style:italic;">
          — Mike, QuotePro
        </p>
      `);

      await sendEmail({
        to: user.email,
        subject: `Is everything okay, ${firstName}? You haven't sent a quote in 2 weeks`,
        html,
        fromName: CHURN_FROM_NAME,
        replyTo: DRIP_REPLY_TO,
      });

      await trackEvent(user.id, AnalyticsEvents.CHURN_RISK_PAID_INACTIVE, {
        triggerType: "paid_no_quote_14d",
      });
    } catch (err: any) {
      console.warn(`[analytics] Churn signal (paid inactive) failed for ${user.email}:`, err.message);
    }
  }
}

/* ─── Churn signal: upgrade abandoned ───────────────────────────────────────── */

async function processUpgradeAbandonedSignals(): Promise<void> {
  // Find users who clicked upgrade but never completed it — within last 48h window (48-96h ago so we don't fire too early)
  const result = await pool.query<{
    user_id: string;
    email: string;
    name: string | null;
  }>(
    `SELECT DISTINCT u.id AS user_id, u.email, u.name
     FROM analytics_events ae
     JOIN businesses b ON b.id = ae.business_id
     JOIN users u ON u.id = b.owner_user_id
     WHERE ae.event_name = 'upgrade_clicked'
       AND ae.created_at BETWEEN NOW() - INTERVAL '96 hours' AND NOW() - INTERVAL '48 hours'
       AND NOT EXISTS (
         SELECT 1 FROM analytics_events ae2
         WHERE ae2.business_id = ae.business_id
           AND ae2.event_name = 'upgrade_completed'
           AND ae2.created_at > ae.created_at
       )`
  );

  for (const user of result.rows) {
    try {
      const alreadySent = await hasChurnEmailSentRecently(
        user.user_id,
        AnalyticsEvents.CHURN_RISK_UPGRADE_ABANDONED,
        7
      );
      if (alreadySent) continue;

      const firstName = user.name?.trim().split(/\s+/)[0] || user.email.split("@")[0];

      const html = churnLayout(`
        <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1d3557;">You were this close, ${firstName}</h2>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.7;">
          We noticed you visited the upgrade page but didn't complete your subscription. Totally fine — but I wanted to reach out in case you had questions.
        </p>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.7;">
          Common questions I hear:
        </p>
        <ul style="margin:0 0 16px;padding-left:20px;">
          <li style="margin-bottom:10px;font-size:15px;color:#374151;line-height:1.6;"><strong>"Can I cancel anytime?"</strong> — Yes. No contracts, no questions asked.</li>
          <li style="margin-bottom:10px;font-size:15px;color:#374151;line-height:1.6;"><strong>"Is it worth it for a small cleaning business?"</strong> — Most cleaners recover the cost from one extra job per month.</li>
          <li style="margin-bottom:10px;font-size:15px;color:#374151;line-height:1.6;"><strong>"Do I need technical skills?"</strong> — No. If you can send a text message, you can use QuotePro.</li>
        </ul>
        <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
          <tr><td style="background:#1d3557;border-radius:8px;">
            <a href="${APP_BASE_URL}/app/pricing" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;">
              See plans and pricing
            </a>
          </td></tr>
        </table>
        <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
          Or just reply to this email with your question — I'll answer personally, usually within a few hours.
        </p>
        <hr style="border:none;border-top:1px solid #e8e8e0;margin:24px 0;"/>
        <p style="margin:0;font-size:13px;color:#9ca3af;font-style:italic;">
          — Mike, QuotePro founder
        </p>
      `);

      await sendEmail({
        to: user.email,
        subject: `Any questions about upgrading, ${firstName}?`,
        html,
        fromName: CHURN_FROM_NAME,
        replyTo: DRIP_REPLY_TO,
      });

      await trackEvent(user.user_id, AnalyticsEvents.CHURN_RISK_UPGRADE_ABANDONED, {
        triggerType: "upgrade_clicked_no_complete",
      });
    } catch (err: any) {
      console.warn(`[analytics] Churn signal (upgrade abandoned) failed for ${user.email}:`, err.message);
    }
  }
}

/* ─── Retention milestone tracker ────────────────────────────────────────────── */

async function processRetentionMilestones(): Promise<void> {
  const milestones = [
    { days: 7, event: AnalyticsEvents.DAY_7_ACTIVE },
    { days: 14, event: AnalyticsEvents.DAY_14_ACTIVE },
    { days: 30, event: AnalyticsEvents.DAY_30_ACTIVE },
  ];

  for (const { days, event } of milestones) {
    try {
      const result = await pool.query<{ id: string; email: string }>(
        `SELECT u.id, u.email
         FROM users u
         WHERE u.created_at BETWEEN NOW() - INTERVAL '${days + 1} days' AND NOW() - INTERVAL '${days - 1} days'
           AND u.last_login_at > NOW() - INTERVAL '2 days'
           AND NOT EXISTS (
             SELECT 1 FROM analytics_events ae
             JOIN businesses b2 ON b2.id = ae.business_id
             WHERE b2.owner_user_id = u.id AND ae.event_name = $1
           )`,
        [event]
      );

      for (const user of result.rows) {
        await trackEvent(user.id, event as AnalyticsEventName, { daysMilestone: days });
      }
    } catch (err: any) {
      console.warn(`[analytics] Retention milestone (day ${days}) failed:`, err.message);
    }
  }
}

/* ─── Main cron entry point ──────────────────────────────────────────────────── */

export async function processChurnSignals(): Promise<void> {
  console.log("[analytics] Running daily churn signal check...");
  try {
    await Promise.allSettled([
      processInactiveTrialSignals(),
      processPaidInactiveSignals(),
      processUpgradeAbandonedSignals(),
      processRetentionMilestones(),
    ]);
  } catch (err: any) {
    console.error("[analytics] Churn signal batch failed:", err.message);
  }
  console.log("[analytics] Churn signal check complete.");
}
