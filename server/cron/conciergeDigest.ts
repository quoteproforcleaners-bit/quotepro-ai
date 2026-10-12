import { pool } from "../db";
import { sendEmail, BASE_APP_URL } from "../mail";
import { acquireLock, releaseLock } from "../lockManager";
import { getConciergeInsights } from "../services/conciergeInsights";
import { buildConciergeWeeklyDigestEmail } from "../emails/conciergeWeeklyDigest";
import { trackEvent } from "../analytics";

export async function sendConciergeDigests(opts?: { force?: boolean; userIdFilter?: string }) {
  const force = !!opts?.force;
  const filter = opts?.userIdFilter;

  // Eligible: growth+ tier, has concierge enabled (default true), has at least one conversation in the past 30d (or force)
  const recipientsRes = await pool.query(
    `SELECT u.id as user_id, u.email, u.first_name, u.subscription_tier, b.id as business_id, b.name as business_name, b.brand_color
     FROM users u
     JOIN businesses b ON b.owner_user_id = u.id
     WHERE u.email IS NOT NULL
       AND u.subscription_tier IN ('growth', 'pro')
       AND COALESCE((u.ai_widget_settings->>'enabled')::boolean, true) = true
       ${filter ? "AND u.id = $1" : ""}`,
    filter ? [filter] : []
  );

  let sent = 0;
  let skipped = 0;
  for (const row of recipientsRes.rows) {
    try {
      const insights = await getConciergeInsights(row.user_id, 7);
      if (!force && insights.totalConversations === 0) {
        skipped++;
        continue;
      }
      const email = buildConciergeWeeklyDigestEmail({
        ownerFirstName: row.first_name || "there",
        businessName: row.business_name || "Your business",
        brandColor: row.brand_color || "#1E40AF",
        insights,
        appUrl: BASE_APP_URL,
      });
      await sendEmail({
        to: row.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      try {
        const { AnalyticsEvents } = await import("@shared/analytics-events");
        await trackEvent(row.user_id, AnalyticsEvents.CONCIERGE_WEEKLY_DIGEST_SENT, {
          totalConversations: insights.totalConversations,
          acceptedAfterChat: insights.acceptedAfterChat,
          offersMade: insights.offersMade,
        });
      } catch {}
      sent++;
    } catch (e: any) {
      console.error(`[concierge-digest] Failed for user ${row.user_id}:`, e?.message);
    }
  }
  console.log(`[concierge-digest] Run complete: sent=${sent}, skipped=${skipped}, total=${recipientsRes.rows.length}`);
  return { sent, skipped, total: recipientsRes.rows.length };
}

/** ISO week key (UTC), e.g. "2026-W17". Used to dedupe weekly digest runs
 *  across process restarts and partial-failure retries within the same week. */
function isoWeekKeyUtc(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Thursday in current week decides the year (ISO 8601)
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Schedule weekly Monday 9am UTC. */
export function startConciergeDigestCron() {
  const tick = async () => {
    const now = new Date();
    const isMonday = now.getUTCDay() === 1;
    const hour = now.getUTCHours();
    if (!isMonday || hour !== 9) return;
    // Week-keyed dedupe lock: name embeds the ISO week, so each new week
    // produces a fresh lock automatically. TTL = 8 days (in minutes — note
    // acquireLock takes ttlMinutes, not seconds) so the lock comfortably
    // outlives the current Monday window and any redeploys, but still
    // expires before next Monday's run.
    const weekKey = isoWeekKeyUtc(now);
    const lockName = `concierge-weekly-digest-${weekKey}`;
    if (!(await acquireLock(lockName, 8 * 24 * 60))) return;
    try {
      await sendConciergeDigests();
    } catch (e: any) {
      console.error("[concierge-digest] Cron error:", e?.message);
      // Release on uncaught failure so the next 15-min tick can retry within
      // the same Monday window. Per-recipient failures are caught inside
      // sendConciergeDigests and intentionally do NOT release — the digest
      // attempt was made and we don't want to spam owners with duplicates.
      await releaseLock(lockName).catch(() => {});
    }
  };
  // Check every 15 minutes
  setInterval(tick, 15 * 60 * 1000);
  // Run once at startup so freshly-deployed servers don't miss the window
  tick().catch(() => {});
  console.log("[concierge-digest] Weekly cron scheduled (Mondays 9:00 UTC)");
}
