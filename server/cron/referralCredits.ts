/**
 * server/cron/referralCredits.ts
 *
 * Retries deferred referral credits for referred users whose 30-day paid
 * subscription requirement has now elapsed.
 *
 * The Stripe webhook skips crediting immediately when the referred user
 * has been on a paid plan for fewer than 30 days. This cron runs nightly
 * and credits those that have crossed the 30-day threshold since then.
 *
 * Idempotency: the NOT EXISTS sub-query checks analytics_events for a
 * prior REFERRAL_CREDIT_APPLIED event — keyed to the referrer's business_id
 * (via a JOIN) and the referred user's id stored in properties.
 * This covers both webhook-applied and cron-applied credits.
 */

import { pool } from "../db";
import { trackEvent } from "../analytics";
import { AnalyticsEvents } from "../../shared/analytics-events";

export async function processDeferredReferralCredits(): Promise<void> {
  try {
    // Find every (referrer, referred_user) pair that is now eligible:
    //   • referred user has been on a paid plan for > 30 days
    //   • no REFERRAL_CREDIT_APPLIED event has been logged for this pair yet
    //
    // NOTE: analytics_events stores business_id, not user_id, so the NOT EXISTS
    // sub-query must JOIN through businesses to correlate back to the referrer user.
    const { rows } = await pool.query<{
      referrer_id: string;
      referral_credits_months: number | null;
      referred_user_id: string;
    }>(`
      SELECT DISTINCT
        r.id                        AS referrer_id,
        r.referral_credits_months,
        u.id                        AS referred_user_id
      FROM users u
      JOIN users r ON r.referral_code = u.referred_by
      WHERE u.referred_by IS NOT NULL
        AND u.subscription_started_at IS NOT NULL
        AND u.subscription_started_at < NOW() - INTERVAL '30 days'
        AND u.subscription_tier IN ('starter', 'growth', 'pro')
        AND NOT EXISTS (
          SELECT 1
          FROM analytics_events ae
          JOIN businesses b ON b.id = ae.business_id
          WHERE b.owner_user_id = r.id
            AND ae.event_name = $1
            AND ae.properties->>'referredUserId' = u.id::text
        )
    `, [AnalyticsEvents.REFERRAL_CREDIT_APPLIED]);

    if (rows.length === 0) return;

    console.log(`[referral-credits] ${rows.length} deferred credit(s) eligible`);

    for (const row of rows) {
      // Fast path: skip if referrer is already visibly at cap.
      // The UPDATE WHERE clause enforces this atomically anyway,
      // but skipping here avoids a needless round-trip.
      if ((row.referral_credits_months ?? 0) >= 6) {
        console.log(`[referral-credits] Cap already reached for referrer ${row.referrer_id}, skipping`);
        continue;
      }

      // Atomic conditional increment — same guard used in the Stripe webhook path.
      const creditResult = await pool.query(
        `UPDATE users
         SET referral_credits_months = COALESCE(referral_credits_months, 0) + 1, updated_at = NOW()
         WHERE id = $1 AND COALESCE(referral_credits_months, 0) < 6
         RETURNING referral_credits_months`,
        [row.referrer_id]
      );

      if (creditResult.rows.length === 0) {
        // Another process (or a concurrent iteration) already applied the 6th credit.
        console.log(`[referral-credits] Cap enforced atomically for referrer ${row.referrer_id}`);
        continue;
      }

      const newTotal = creditResult.rows[0].referral_credits_months;

      // Record the event so subsequent cron runs (and the NOT EXISTS check) skip this pair.
      await trackEvent(row.referrer_id, AnalyticsEvents.REFERRAL_CREDIT_APPLIED, {
        referredUserId: row.referred_user_id,
        deferred: true,
        newTotal,
      });

      console.log(
        `[referral-credits] Deferred credit applied: referrer=${row.referrer_id} ` +
        `<- referred=${row.referred_user_id} (now ${newTotal} months)`
      );
    }
  } catch (e) {
    console.error("[referral-credits] Cron error:", e);
  }
}
