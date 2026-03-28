/**
 * server/notificationScheduler.ts
 * Server-side smart push notification trigger system.
 *
 * Manages the lifecycle of scheduled and event-based push triggers:
 *   - Activation nudges: 24 / 48 / 70 h after sign-up if user hasn't sent a quote
 *   - First-quote congrats: fired immediately on the first ever quote send
 *   - Quote expiry alerts: 24 h before a sent quote expires
 *   - Dormant-customer digest: every Monday at 9 AM
 *
 * All sends are guarded by:
 *   - Per-type pushPrefs (activationReminders, quoteExpiryAlerts, dormantCustomerAlerts)
 *   - Channel-level pushPrefs (growth / quotes)  — checked inside sendPush
 *   - Quiet hours  (9 PM – 8 AM server time)
 *   - ≤ 2 push notifications per user per 24 h
 *   - 30-day inactivity guard
 */

import { pool } from "./db";
import { sendPush } from "./pushNotifications";

// ── Constants ────────────────────────────────────────────────────────────────

const QUIET_START    = 21;  // 9 PM
const QUIET_END      = 8;   // 8 AM
const MAX_PER_DAY    = 2;
const INACTIVITY_DAYS = 30;

// ── Guard helpers ────────────────────────────────────────────────────────────

function isQuietHours(): boolean {
  const h = new Date().getHours();
  return h >= QUIET_START || h < QUIET_END;
}

async function notifsSentToday(userId: string): Promise<number> {
  const r = await pool.query(
    `SELECT COUNT(*) AS c FROM notification_triggers
     WHERE user_id = $1 AND sent_at >= NOW() - INTERVAL '24 hours'`,
    [userId],
  );
  return parseInt(r.rows[0]?.c ?? "0", 10);
}

async function isUserActive(userId: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM analytics_events
     WHERE user_id = $1
       AND created_at >= NOW() - INTERVAL '${INACTIVITY_DAYS} days'
     LIMIT 1`,
    [userId],
  );
  return r.rows.length > 0;
}

async function getUserPushPrefs(userId: string): Promise<Record<string, boolean>> {
  try {
    const r = await pool.query(
      `SELECT up.push_prefs
       FROM user_preferences up
       JOIN businesses b ON b.id = up.business_id
       WHERE b.owner_user_id = $1
       LIMIT 1`,
      [userId],
    );
    return (r.rows[0]?.push_prefs as Record<string, boolean>) ?? {};
  } catch {
    return {};
  }
}

async function canSend(userId: string): Promise<boolean> {
  if (isQuietHours()) return false;
  if ((await notifsSentToday(userId)) >= MAX_PER_DAY) return false;
  if (!(await isUserActive(userId))) return false;
  return true;
}

async function hasPushToken(userId: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM push_tokens WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  return r.rows.length > 0;
}

async function sentQuoteCount(userId: string): Promise<number> {
  const r = await pool.query(
    `SELECT COUNT(*) AS c
     FROM quotes q
     JOIN businesses b ON b.id = q.business_id
     WHERE b.owner_user_id = $1
       AND q.status IN ('sent','viewed','accepted','declined')
       AND q.deleted_at IS NULL`,
    [userId],
  );
  return parseInt(r.rows[0]?.c ?? "0", 10);
}

// ── Table bootstrap ──────────────────────────────────────────────────────────

export async function initNotificationTables(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_triggers (
        id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       VARCHAR     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        trigger_type  VARCHAR(60) NOT NULL,
        scheduled_for TIMESTAMPTZ NOT NULL,
        sent_at       TIMESTAMPTZ,
        cancelled_at  TIMESTAMPTZ,
        payload       JSONB       DEFAULT '{}'::jsonb,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_ntrig_user_type
       ON notification_triggers(user_id, trigger_type)`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_ntrig_due
       ON notification_triggers(scheduled_for)
       WHERE sent_at IS NULL AND cancelled_at IS NULL`,
    );
    console.log("[notif-scheduler] notification_triggers table ready");
  } catch (e: any) {
    console.error("[notif-scheduler] initNotificationTables failed:", e.message);
  }
}

// ── Seed activation triggers for newly registered users ──────────────────────

async function seedActivationTriggers(): Promise<void> {
  try {
    const result = await pool.query(`
      SELECT id, created_at FROM users
      WHERE created_at >= NOW() - INTERVAL '25 hours'
        AND id NOT IN (
          SELECT DISTINCT user_id FROM notification_triggers
          WHERE trigger_type IN ('activation_24h','activation_48h','activation_70h')
        )
    `);

    for (const u of result.rows) {
      const t = new Date(u.created_at).getTime();
      await pool.query(
        `INSERT INTO notification_triggers (user_id, trigger_type, scheduled_for)
         VALUES
           ($1, 'activation_24h', $2),
           ($1, 'activation_48h', $3),
           ($1, 'activation_70h', $4)
         ON CONFLICT DO NOTHING`,
        [
          u.id,
          new Date(t + 24 * 3_600_000),
          new Date(t + 48 * 3_600_000),
          new Date(t + 70 * 3_600_000),
        ],
      );
    }
  } catch (e: any) {
    console.error("[notif-scheduler] seedActivationTriggers failed:", e.message);
  }
}

// ── Activation trigger copy ───────────────────────────────────────────────────

const ACTIVATION_COPY: Record<string, { title: string; body: string }> = {
  activation_24h: {
    title: "Your first quote is waiting",
    body: "You signed up yesterday. Sending takes 60 seconds — try it now.",
  },
  activation_48h: {
    title: "Still time to activate your trial",
    body: "Most QuotePro users send their first quote within 24 hours. Don't let yours go to waste.",
  },
  activation_70h: {
    title: "2 hours left in your activation window",
    body: "Send one quote before your 72-hour window closes — it takes 60 seconds.",
  },
};

// ── Fire due activation triggers ─────────────────────────────────────────────

async function fireDueActivationTriggers(): Promise<void> {
  try {
    const rows = await pool.query(`
      SELECT id, user_id, trigger_type
      FROM notification_triggers
      WHERE scheduled_for <= NOW()
        AND sent_at IS NULL
        AND cancelled_at IS NULL
        AND trigger_type IN ('activation_24h','activation_48h','activation_70h')
      ORDER BY scheduled_for ASC
      LIMIT 50
    `);

    for (const trig of rows.rows) {
      try {
        const userId: string = trig.user_id;

        if ((await sentQuoteCount(userId)) > 0) {
          await pool.query(
            `UPDATE notification_triggers SET cancelled_at = NOW() WHERE id = $1`,
            [trig.id],
          );
          continue;
        }

        if (!(await hasPushToken(userId))) {
          await pool.query(
            `UPDATE notification_triggers SET cancelled_at = NOW() WHERE id = $1`,
            [trig.id],
          );
          continue;
        }

        if (!(await canSend(userId))) continue;

        const prefs = await getUserPushPrefs(userId);
        if (prefs.activationReminders === false) {
          await pool.query(
            `UPDATE notification_triggers SET cancelled_at = NOW() WHERE id = $1`,
            [trig.id],
          );
          continue;
        }

        const copy = ACTIVATION_COPY[trig.trigger_type];
        if (!copy) continue;

        await sendPush(userId, {
          title: copy.title,
          body: copy.body,
          data: { screen: "QuoteCalculator" },
          channel: "growth",
        });

        await pool.query(
          `UPDATE notification_triggers SET sent_at = NOW() WHERE id = $1`,
          [trig.id],
        );
      } catch (e: any) {
        console.error(`[notif-scheduler] trigger ${trig.id} failed:`, e.message);
      }
    }
  } catch (e: any) {
    console.error("[notif-scheduler] fireDueActivationTriggers failed:", e.message);
  }
}

// ── Event: first quote sent ───────────────────────────────────────────────────

export async function onFirstQuoteSent(userId: string): Promise<void> {
  try {
    await pool.query(
      `UPDATE notification_triggers
       SET cancelled_at = NOW()
       WHERE user_id = $1
         AND trigger_type IN ('activation_24h','activation_48h','activation_70h')
         AND sent_at IS NULL AND cancelled_at IS NULL`,
      [userId],
    );

    if (!(await hasPushToken(userId))) return;

    const prefs = await getUserPushPrefs(userId);
    if (prefs.activationReminders === false) return;

    await sendPush(userId, {
      title: "First quote sent. Nice work.",
      body: "Follow up in 24 hours to double your close rate.",
      data: { screen: "FollowUpQueue" },
      channel: "growth",
    });

    await pool.query(
      `INSERT INTO notification_triggers (user_id, trigger_type, scheduled_for, sent_at)
       VALUES ($1, 'first_quote_congrats', NOW(), NOW())`,
      [userId],
    );
  } catch (e: any) {
    console.error("[notif-scheduler] onFirstQuoteSent failed:", e.message);
  }
}

// ── Quote expiry reminders (24 h before) ─────────────────────────────────────

async function fireQuoteExpiryReminders(): Promise<void> {
  try {
    const rows = await pool.query(`
      SELECT q.id,
             b.owner_user_id AS user_id,
             TRIM(COALESCE(NULLIF(TRIM(c.first_name || ' ' || COALESCE(c.last_name, '')), ''), 'Your customer')) AS customer_name
      FROM quotes q
      JOIN businesses b ON b.id = q.business_id
      LEFT JOIN customers c ON c.id = q.customer_id
      WHERE q.status = 'sent'
        AND q.expires_at BETWEEN NOW() + INTERVAL '23 hours 55 minutes'
                              AND NOW() + INTERVAL '25 hours'
        AND q.deleted_at IS NULL
        AND q.id::text NOT IN (
          SELECT COALESCE(payload->>'quoteId', '')
          FROM notification_triggers
          WHERE trigger_type = 'quote_expiry_reminder'
            AND sent_at IS NOT NULL
        )
    `);

    for (const row of rows.rows) {
      try {
        const userId: string = row.user_id;
        if (!(await hasPushToken(userId))) continue;
        if (!(await canSend(userId))) continue;

        const prefs = await getUserPushPrefs(userId);
        if (prefs.quoteExpiryAlerts === false) continue;

        await sendPush(userId, {
          title: `${row.customer_name}'s quote expires tomorrow`,
          body: "Follow up now before they choose another cleaner.",
          data: { screen: "FollowUpQueue", quoteId: row.id },
          channel: "quotes",
        });

        await pool.query(
          `INSERT INTO notification_triggers (user_id, trigger_type, scheduled_for, sent_at, payload)
           VALUES ($1, 'quote_expiry_reminder', NOW(), NOW(), $2)`,
          [userId, JSON.stringify({ quoteId: row.id })],
        );
      } catch (e: any) {
        console.error(`[notif-scheduler] quote expiry ${row.id} failed:`, e.message);
      }
    }
  } catch (e: any) {
    console.error("[notif-scheduler] fireQuoteExpiryReminders failed:", e.message);
  }
}

// ── Dormant customer weekly digest (Monday 9 AM) ─────────────────────────────

async function fireDormantCustomerDigests(): Promise<void> {
  const now = new Date();
  if (now.getDay() !== 1) return;    // Monday only
  if (now.getHours() !== 9) return;  // 9 AM only

  try {
    const rows = await pool.query(`
      SELECT DISTINCT b.owner_user_id AS user_id, b.id AS business_id
      FROM businesses b
      JOIN push_tokens pt ON pt.user_id = b.owner_user_id
      WHERE b.owner_user_id NOT IN (
        SELECT user_id FROM notification_triggers
        WHERE trigger_type = 'dormant_customer_digest'
          AND sent_at >= NOW() - INTERVAL '6 days'
      )
    `);

    for (const row of rows.rows) {
      try {
        const userId: string = row.user_id;
        if (!(await canSend(userId))) continue;

        const prefs = await getUserPushPrefs(userId);
        if (prefs.dormantCustomerAlerts === false) continue;

        const dormant = await pool.query(
          `SELECT COUNT(DISTINCT c.id) AS cnt
           FROM customers c
           LEFT JOIN jobs j
             ON j.customer_id = c.id
            AND j.scheduled_for >= NOW() - INTERVAL '90 days'
           WHERE c.business_id = $1
             AND (c.do_not_contact IS NULL OR c.do_not_contact = false)
             AND j.id IS NULL
             AND c.deleted_at IS NULL`,
          [row.business_id],
        );

        const count = parseInt(dormant.rows[0]?.cnt ?? "0", 10);
        if (count === 0) continue;

        await sendPush(userId, {
          title: `${count} client${count === 1 ? "" : "s"} haven't booked in 90 days`,
          body: "Reach out now to win them back before they forget you.",
          data: { screen: "Opportunities" },
          channel: "growth",
        });

        await pool.query(
          `INSERT INTO notification_triggers (user_id, trigger_type, scheduled_for, sent_at)
           VALUES ($1, 'dormant_customer_digest', NOW(), NOW())`,
          [userId],
        );
      } catch (e: any) {
        console.error(`[notif-scheduler] dormant digest ${row.user_id} failed:`, e.message);
      }
    }
  } catch (e: any) {
    console.error("[notif-scheduler] fireDormantCustomerDigests failed:", e.message);
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function runNotificationScheduler(): Promise<void> {
  try {
    await seedActivationTriggers();
    await fireDueActivationTriggers();
    await fireQuoteExpiryReminders();
    await fireDormantCustomerDigests();
  } catch (e: any) {
    console.error("[notif-scheduler] run failed:", e.message);
  }
}
