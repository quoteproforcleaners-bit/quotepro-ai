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
    if (!user.email) continue;
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
      if (!user.email) { continue; }
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

/* ─── Churn Risk Scoring (daily 6am cron) ───────────────────────────────────── */

const TIER_MRR: Record<string, number> = { starter: 19, growth: 49, pro: 99 };

export async function computeAndUpdateChurnScores(): Promise<void> {
  console.log("[churn] Starting churn risk scoring...");
  try {
    // All paid users
    const usersResult = await pool.query(`
      SELECT u.id, u.email, u.name, u.subscription_tier,
             u.last_active_at, u.created_at, u.trial_started_at,
             u.churn_intervention_sent_at,
             EXTRACT(EPOCH FROM (NOW() - u.last_active_at)) / 86400 AS days_since_active
      FROM users u
      WHERE u.subscription_tier IN ('starter','growth','pro')
         OR (u.subscription_tier = 'free' AND u.created_at > NOW() - INTERVAL '21 days')
      ORDER BY u.id
    `);

    for (const user of usersResult.rows) {
      let score = 0;
      const isPaid = user.subscription_tier !== "free";
      const daysSinceActive = parseFloat(user.days_since_active) || 999;

      // ── Risk signals (add points) ───────────────────────────────
      if (isPaid && daysSinceActive > 7) score += 30;
      if (daysSinceActive > 3 && !isPaid) score += 10;

      // No quote sent in 14 days
      const quoteSentRow = await pool.query(
        `SELECT last_quote_sent_at FROM users WHERE id = $1`,
        [user.id]
      );
      const lastQuoteSent = quoteSentRow.rows[0]?.last_quote_sent_at;
      const daysSinceQuote = lastQuoteSent
        ? (Date.now() - new Date(lastQuoteSent).getTime()) / 86_400_000
        : 999;
      if (daysSinceQuote > 14) score += 20;

      // Quota hit but didn't upgrade within 48h
      const quotaHit = await pool.query(
        `SELECT COUNT(*) AS cnt FROM analytics_events
         WHERE business_id IN (SELECT id FROM businesses WHERE owner_user_id = $1)
           AND event_name = 'quote_limit_reached'
           AND created_at > NOW() - INTERVAL '48 hours'`,
        [user.id]
      );
      if (parseInt(quotaHit.rows[0]?.cnt) > 0 && !isPaid) score += 15;

      // Opened cancel flow
      const cancelInitiated = await pool.query(
        `SELECT COUNT(*) AS cnt FROM analytics_events
         WHERE business_id IN (SELECT id FROM businesses WHERE owner_user_id = $1)
           AND event_name = 'cancel_initiated'
           AND created_at > NOW() - INTERVAL '14 days'`,
        [user.id]
      );
      if (parseInt(cancelInitiated.rows[0]?.cnt) > 0) score += 15;

      // Trial with 2 days left, not upgraded
      const trialRef = user.trial_started_at || user.created_at;
      const trialAgeDays = (Date.now() - new Date(trialRef).getTime()) / 86_400_000;
      if (!isPaid && trialAgeDays > 12 && trialAgeDays < 14) score += 10;

      // Zero jobs scheduled
      const jobCount = await pool.query(
        `SELECT COUNT(*) AS cnt FROM jobs
         WHERE business_id IN (SELECT id FROM businesses WHERE owner_user_id = $1)`,
        [user.id]
      );
      if (parseInt(jobCount.rows[0]?.cnt) === 0) score += 5;

      // ── Health signals (subtract points) ───────────────────────
      // Quote accepted in last 7 days
      const recentAccepted = await pool.query(
        `SELECT COUNT(*) AS cnt FROM quotes
         WHERE business_id IN (SELECT id FROM businesses WHERE owner_user_id = $1)
           AND status = 'accepted'
           AND updated_at > NOW() - INTERVAL '7 days'`,
        [user.id]
      );
      if (parseInt(recentAccepted.rows[0]?.cnt) > 0) score -= 20;

      // Job completed in last 7 days
      const recentJob = await pool.query(
        `SELECT COUNT(*) AS cnt FROM jobs
         WHERE business_id IN (SELECT id FROM businesses WHERE owner_user_id = $1)
           AND status = 'completed'
           AND updated_at > NOW() - INTERVAL '7 days'`,
        [user.id]
      );
      if (parseInt(recentJob.rows[0]?.cnt) > 0) score -= 15;

      // AI agent used in last 3 days
      const recentAI = await pool.query(
        `SELECT COUNT(*) AS cnt FROM analytics_events
         WHERE business_id IN (SELECT id FROM businesses WHERE owner_user_id = $1)
           AND event_name ILIKE 'ai_%'
           AND created_at > NOW() - INTERVAL '3 days'`,
        [user.id]
      );
      if (parseInt(recentAI.rows[0]?.cnt) > 0) score -= 10;

      // Logged in today
      if (daysSinceActive < 1) score -= 10;

      // Clamp
      score = Math.max(0, Math.min(100, score));

      // Update score
      await pool.query(
        "UPDATE users SET churn_risk_score = $1 WHERE id = $2",
        [score, user.id]
      );

      // ── Interventions ───────────────────────────────────────────
      if (!isPaid) continue; // only intervene on paid users
      if (!user.email) continue; // skip users with no email address

      const lastIntervention = user.churn_intervention_sent_at
        ? (Date.now() - new Date(user.churn_intervention_sent_at).getTime()) / 86_400_000
        : 999;

      const mrr = TIER_MRR[user.subscription_tier] || 0;

      if (score >= 70 && lastIntervention > 7) {
        // HIGH RISK
        await sendEmail({
          to: user.email,
          subject: `Everything ok, ${user.name?.split(" ")[0] || "there"}?`,
          html: `<div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;color:#1a1a1a;line-height:1.7">
<p>Hey ${user.name?.split(" ")[0] || "there"},</p>
<p>I noticed you haven't logged into QuotePro in a while. I wanted to reach out personally.</p>
<p>Is there something we could be doing better? Are you running into any roadblocks?</p>
<p>Hit reply — I personally read every response and usually get back within a few hours.</p>
<p>— Mike<br><span style="color:#6b7280;font-size:0.875rem">Founder, QuotePro AI</span></p>
</div>`,
        });
        await pool.query(
          "UPDATE users SET churn_intervention_sent_at = NOW() WHERE id = $1",
          [user.id]
        );
        // Flag high-value accounts for manual outreach
        if (mrr >= 49) {
          console.log(`[churn] HIGH-RISK account flagged for manual outreach: ${user.email} ($${mrr}/mo, score=${score})`);
        }
        console.log(`[churn] High-risk intervention sent to ${user.email} (score=${score})`);
      } else if (score >= 40 && score < 70 && lastIntervention > 14) {
        // MEDIUM RISK — feature nudge
        const hasNeverUsedAI = parseInt((await pool.query(
          `SELECT COUNT(*) AS cnt FROM analytics_events
           WHERE business_id IN (SELECT id FROM businesses WHERE owner_user_id = $1)
             AND event_name ILIKE 'ai_%'`,
          [user.id]
        )).rows[0]?.cnt) === 0;

        const subject = hasNeverUsedAI
          ? "Your quotes are going cold — here's the 60-second fix"
          : `A QuotePro feature you haven't tried yet`;
        const body = hasNeverUsedAI
          ? `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;line-height:1.6">
<p>Hey ${user.name?.split(" ")[0] || "there"},</p>
<p>Did you know QuotePro can automatically follow up with customers whose quotes you haven't heard back on?</p>
<p>Most cleaning businesses lose 30% of potential jobs just from slow follow-up. Our AI sends a personalized nudge in your voice — while you're on a job.</p>
<p><a href="${process.env.EXPO_PUBLIC_DOMAIN || "https://quotepro.ai"}/app/follow-ups" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Try AI Follow-Ups</a></p>
<p style="color:#6b7280;font-size:0.875rem">Takes 60 seconds to set up. No extra charge on your Growth plan.</p>
</div>`
          : `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;line-height:1.6">
<p>Hey ${user.name?.split(" ")[0] || "there"},</p>
<p>Just wanted to make sure you're getting the most out of QuotePro. A lot of cleaning businesses on your plan are using the AI Coach to map out their next $10k in revenue.</p>
<p><a href="${process.env.EXPO_PUBLIC_DOMAIN || "https://quotepro.ai"}/app/ai-assistant" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">Try the AI Coach</a></p>
</div>`;

        await sendEmail({ to: user.email, subject, html: body });
        await pool.query(
          "UPDATE users SET churn_intervention_sent_at = NOW() WHERE id = $1",
          [user.id]
        );
        console.log(`[churn] Medium-risk intervention sent to ${user.email} (score=${score})`);
      }
    }
  } catch (err: any) {
    console.error("[churn] Scoring cron failed:", err.message);
  }
  console.log("[churn] Churn risk scoring complete.");
}
