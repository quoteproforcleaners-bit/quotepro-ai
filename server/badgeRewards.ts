/**
 * server/badgeRewards.ts
 *
 * Central badge award + reward + notification handler.
 * Each badge carries a real, tangible reward beyond a label.
 *
 * Usage:
 *   await maybeAwardBadge(businessId, userId, 'first_quote_accepted')
 *
 * Idempotent — safe to call multiple times; hasBadge() guards duplicates.
 */

import { pool } from "./db";
import { hasBadge, createBadge, getUserById } from "./storage";
import { trackEvent } from "./analytics";
import { sendPush } from "./pushNotifications";
import { sendEmail } from "./mail";

const PLATFORM_FROM_NAME = "QuotePro AI";

interface BadgeConfig {
  pushTitle: string;
  pushBody: string;
  applyReward: (businessId: string, userId: string) => Promise<void>;
}

const BADGE_CONFIGS: Record<string, BadgeConfig> = {
  // ── First Closed Deal ────────────────────────────────────────────────────
  first_quote_accepted: {
    pushTitle: "First Closed Deal unlocked!",
    pushBody: "You've unlocked 5 professional proposal templates.",
    async applyReward(_businessId, userId) {
      await pool.query(
        "UPDATE users SET proposal_templates_unlocked = true WHERE id = $1",
        [userId]
      );
    },
  },

  // ── 10 Quotes Sent ────────────────────────────────────────────────────────
  ten_quotes_sent: {
    pushTitle: "10 quotes milestone!",
    pushBody: "You've unlocked a 7-day preview of AI follow-ups — free.",
    async applyReward(_businessId, userId) {
      const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await pool.query(
        "UPDATE users SET growth_preview_until = $1 WHERE id = $2",
        [until, userId]
      );
    },
  },

  // ── First Recurring Job ───────────────────────────────────────────────────
  first_recurring_job: {
    pushTitle: "Recurring revenue unlocked!",
    pushBody: "You've unlocked the Recurring Revenue Dashboard.",
    async applyReward(_businessId, userId) {
      await pool.query(
        "UPDATE users SET mrr_dashboard_unlocked = true WHERE id = $1",
        [userId]
      );
    },
  },

  // ── 5 Jobs Completed ─────────────────────────────────────────────────────
  five_jobs_completed: {
    pushTitle: "5 jobs milestone!",
    pushBody: "Outstanding work — keep delivering great cleans!",
    async applyReward() {
      // App Store review is triggered client-side (AsyncStorage flag).
      // Nothing server-side needed — the badge itself is the signal.
    },
  },

  // ── $1k Revenue Milestone ─────────────────────────────────────────────────
  revenue_milestone_1k: {
    pushTitle: "$1,000 in quotes processed!",
    pushBody: "Incredible milestone — would you share your story with us?",
    async applyReward(_businessId, userId) {
      const user = await getUserById(userId);
      if (!user?.email) return;
      await sendEmail({
        to: user.email,
        subject: "You've processed $1,000 in quotes with QuotePro — share your story?",
        html: `<p>Hi ${user.name || "there"},</p>
<p>You've now processed <strong>$1,000 in quotes</strong> with QuotePro AI — that's a real milestone worth celebrating.</p>
<p>We'd love to feature your story on our site to inspire other cleaning business owners just getting started. Would you be open to a quick 5-minute chat or just a few written sentences about your experience?</p>
<p>Just reply to this email and we'll take it from there.</p>
<p>— The QuotePro AI Team</p>`,
        text: `Hi ${user.name || "there"}, you've processed $1,000 in quotes with QuotePro AI! Reply to share your story.`,
        fromName: PLATFORM_FROM_NAME,
      }).catch(() => {});
    },
  },

  // ── $10k Revenue Milestone ────────────────────────────────────────────────
  revenue_milestone_10k: {
    pushTitle: "$10,000 processed — you're in the big leagues!",
    pushBody: "You've earned a permanent 10% loyalty discount on any plan upgrade.",
    async applyReward(_businessId, userId) {
      await pool.query(
        "UPDATE users SET loyalty_discount_pct = 10 WHERE id = $1",
        [userId]
      );
    },
  },
};

/**
 * Award a badge (if not already earned) and apply its reward.
 * Completely idempotent — safe to call on every relevant event.
 */
export async function maybeAwardBadge(
  businessId: string,
  userId: string,
  badgeKey: string
): Promise<boolean> {
  try {
    if (await hasBadge(businessId, badgeKey)) return false;

    await createBadge({ businessId, badgeKey });
    trackEvent(userId, "BADGE_EARNED", { badgeKey }).catch(() => {});

    const config = BADGE_CONFIGS[badgeKey];
    if (!config) return true;

    // Apply reward (fire-and-forget, non-fatal)
    config.applyReward(businessId, userId).catch((e) =>
      console.error(`[badge] reward error for ${badgeKey}:`, e.message)
    );

    // Send push notification (fire-and-forget)
    sendPush(userId, {
      title: config.pushTitle,
      body: config.pushBody,
      data: { badgeKey },
      channel: "growth",
    }).catch(() => {});

    return true;
  } catch (err: any) {
    console.error(`[badge] Error awarding ${badgeKey}:`, err.message);
    return false;
  }
}
