/**
 * server/pushNotifications.ts
 * Expo push notification service.
 *
 * Handles token lookup, preference gating, and delivery via
 * Expo's unified push API (routes to APNs on iOS, FCM on Android).
 * Never throws — all errors are logged silently.
 */

import { pool } from "./db";

type PushChannel = "quotes" | "jobs" | "growth";

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  channel?: PushChannel;
}

/** Default prefs if no row exists in user_preferences */
const DEFAULT_PREFS = { quotes: true, jobs: true, growth: true };

async function getUserPushPrefs(userId: string): Promise<Record<PushChannel, boolean>> {
  try {
    const result = await pool.query(
      `SELECT up.push_prefs
       FROM user_preferences up
       JOIN businesses b ON b.id = up.business_id
       WHERE b.owner_user_id = $1
       LIMIT 1`,
      [userId]
    );
    if (result.rows.length === 0) return DEFAULT_PREFS;
    const prefs = result.rows[0].push_prefs;
    return {
      quotes: prefs?.quotes !== false,
      jobs: prefs?.jobs !== false,
      growth: prefs?.growth !== false,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

async function getUserPushTokens(userId: string): Promise<string[]> {
  try {
    const result = await pool.query(
      `SELECT token FROM push_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3`,
      [userId]
    );
    return result.rows.map((r: any) => r.token).filter(Boolean);
  } catch {
    return [];
  }
}

async function logPushCommunication(userId: string, payload: PushPayload): Promise<void> {
  try {
    const bizResult = await pool.query(
      "SELECT id FROM businesses WHERE owner_user_id = $1 LIMIT 1",
      [userId]
    );
    if (bizResult.rows.length === 0) return;
    const businessId = bizResult.rows[0].id;
    await pool.query(
      `INSERT INTO communications (id, business_id, channel, content, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, 'push', $2, 'sent', NOW(), NOW())`,
      [businessId, `${payload.title}: ${payload.body}`]
    );
  } catch {
    // Non-fatal
  }
}

/**
 * Send a push notification to a user.
 * Checks push preferences before sending.
 * Uses Expo's push API which handles both APNs (iOS) and FCM (Android).
 */
export async function sendPush(userId: string, notification: PushPayload): Promise<void> {
  try {
    const channel = notification.channel ?? "growth";

    // Check user preferences
    const prefs = await getUserPushPrefs(userId);
    if (!prefs[channel]) {
      console.log(`[push] Skipped (${channel} disabled) for user ${userId}`);
      return;
    }

    // Get tokens
    const tokens = await getUserPushTokens(userId);
    if (tokens.length === 0) {
      return;
    }

    // Build Expo push messages
    const messages = tokens.map(token => ({
      to: token,
      title: notification.title,
      body: notification.body,
      data: notification.data ?? {},
      channelId: channel,        // Android notification channel
      sound: channel !== "growth" ? "default" : undefined,
      priority: channel === "jobs" ? "high" : "normal",
    }));

    // Send via Expo Push API
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages.length === 1 ? messages[0] : messages),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[push] Expo API error (${response.status}):`, text.slice(0, 200));
      return;
    }

    const result = await response.json() as any;
    const tickets = Array.isArray(result.data) ? result.data : [result.data];

    // Clean up tokens that are no longer valid (unregistered device or bad credentials)
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket?.status === "error") {
        const msg: string = ticket.message || "";
        const isInvalid =
          msg.includes("DeviceNotRegistered") ||
          msg.includes("InvalidCredentials") ||
          msg.includes("APNs credentials") ||
          msg.includes("ExponentPushToken") && msg.includes("not registered");
        if (isInvalid && tokens[i]) {
          await pool.query("DELETE FROM push_tokens WHERE token = $1", [tokens[i]]).catch(() => {});
          console.log(`[push] Removed invalid token for user ${userId}: ${msg.slice(0, 60)}`);
        } else {
          console.warn(`[push] Ticket error for user ${userId}: ${msg.slice(0, 100)}`);
        }
      }
    }

    const successCount = tickets.filter((t: any) => t?.status !== "error").length;
    if (successCount > 0) {
      await logPushCommunication(userId, notification);
      console.log(`[push] Sent "${notification.title}" to user ${userId} (${successCount}/${tokens.length} token(s))`);
    }
  } catch (err: any) {
    console.error("[push] sendPush failed silently:", err.message);
  }
}

/**
 * Send a push to all users that have an active business.
 * Used for broadcast notifications (e.g. weekly recap).
 */
export async function sendPushToAll(
  filter: (userId: string) => boolean | Promise<boolean>,
  notification: PushPayload
): Promise<void> {
  try {
    const result = await pool.query(
      `SELECT DISTINCT b.owner_user_id FROM businesses b
       JOIN push_tokens pt ON pt.user_id = b.owner_user_id`
    );
    for (const row of result.rows) {
      try {
        if (await filter(row.owner_user_id)) {
          await sendPush(row.owner_user_id, notification);
        }
      } catch {}
    }
  } catch (err: any) {
    console.error("[push] sendPushToAll failed:", err.message);
  }
}
