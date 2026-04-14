import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { updateUser, getUserById } from "../storage";
import { sendEmail, PLATFORM_FROM_EMAIL, PLATFORM_FROM_NAME } from "../mail";
import { trackEvent } from "../analytics";
import { AnalyticsEvents } from "../../shared/analytics-events";
import { getStripe } from "../clients";

const router = Router();

// ── RevenueCat key helper ──────────────────────────────────────────────────
// Supports both REVENUECAT_SECRET_KEY (preferred) and REVENUECAT_API_KEY (fallback)
function getRcKey(): string | undefined {
  return process.env.REVENUECAT_SECRET_KEY || process.env.REVENUECAT_API_KEY;
}

// ── Product ID → Tier mapping ──────────────────────────────────────────────
const PRODUCT_TO_TIER: Record<string, string> = {
  "com.quotepro.starter": "starter",
  "com.quotepro.growth": "growth",
  "com.quotepro.growth.annual": "growth",
  "com.quotepro.pro": "pro",
  "com.quotepro.pro.annual": "pro",
};

// Entitlement name that maps from tier for RevenueCat promotional grants
const TIER_TO_ENTITLEMENT: Record<string, string> = {
  starter: "starter",
  growth: "growth",
  pro: "pro",
};

const TIER_RANK: Record<string, number> = { free: 0, starter: 1, growth: 2, pro: 3 };

function mapProductToTier(productId: string): string {
  if (!productId) return "free";
  // Try direct match
  if (PRODUCT_TO_TIER[productId]) return PRODUCT_TO_TIER[productId];
  // Fuzzy: contains
  const lower = productId.toLowerCase();
  if (lower.includes("pro")) return "pro";
  if (lower.includes("growth")) return "growth";
  if (lower.includes("starter")) return "starter";
  return "free";
}

// ── RevenueCat Webhook ─────────────────────────────────────────────────────
// POST /api/webhooks/revenuecat
// RevenueCat sends Authorization: Bearer {REVENUECAT_WEBHOOK_SECRET}
router.post("/revenuecat", async (req: Request, res: Response) => {
  try {
    // 1. Verify webhook authenticity
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = req.headers["authorization"] as string | undefined;
      // RC sends the exact value set in the dashboard — accept both raw and Bearer-prefixed formats
      const valid = authHeader === webhookSecret || authHeader === `Bearer ${webhookSecret}`;
      if (!authHeader || !valid) {
        console.warn("RevenueCat webhook: invalid authorization header");
        return res.status(401).json({ message: "Unauthorized" });
      }
    }

    const payload = req.body as any;
    const event = payload?.event;
    if (!event) return res.status(400).json({ message: "Missing event payload" });

    const eventType: string = event.type || "";
    const appUserId: string = event.app_user_id || "";
    const productId: string = event.product_id || "";
    const expiresDateMs: number | null = event.expiration_at_ms || null;

    console.log(`[RC Webhook] type=${eventType} appUserId=${appUserId} product=${productId}`);

    // 2. Find user by revenuecat_user_id
    let userResult = await pool.query(
      "SELECT id, email, name, subscription_tier, stripe_customer_id, revenuecat_user_id, subscription_platform FROM users WHERE revenuecat_user_id = $1 LIMIT 1",
      [appUserId]
    );

    // Fallback: RC user_id might be the QuotePro user UUID
    if (userResult.rows.length === 0 && appUserId) {
      userResult = await pool.query(
        "SELECT id, email, name, subscription_tier, stripe_customer_id, revenuecat_user_id, subscription_platform FROM users WHERE id = $1 LIMIT 1",
        [appUserId]
      );
      // Save the revenuecat_user_id mapping for future lookups
      if (userResult.rows.length > 0) {
        await pool.query("UPDATE users SET revenuecat_user_id = $1 WHERE id = $2", [appUserId, userResult.rows[0].id]);
      }
    }

    if (userResult.rows.length === 0) {
      console.warn(`[RC Webhook] No user found for appUserId=${appUserId}`);
      return res.status(200).json({ received: true });
    }

    const user = userResult.rows[0];

    // Log every webhook event to analytics_events for audit / debugging
    trackEvent(user.id, AnalyticsEvents.REVENUECAT_WEBHOOK, {
      eventType,
      productId: productId || null,
      userId: user.id,
    }).catch(() => {});

    // 3. Handle event types
    if (["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"].includes(eventType)) {
      const newTier = mapProductToTier(productId);
      const currentTier = user.subscription_tier || "free";
      const currentPlatform = user.subscription_platform;

      // Conflict detection: user has active Stripe subscription and now purchasing on RC
      if (currentPlatform === "stripe" && currentTier !== "free") {
        const higherTier = TIER_RANK[newTier] >= TIER_RANK[currentTier] ? newTier : currentTier;
        console.warn(`[RC Webhook] CONFLICT detected: user ${user.id} has Stripe=${currentTier} and RC=${newTier}. Using higher tier=${higherTier}`);
        trackEvent(user.id, "SUBSCRIPTION_CONFLICT_DETECTED", {
          stripeTier: currentTier,
          rcTier: newTier,
          resolvedTier: higherTier,
        }).catch(() => {});
        // Alert admin
        sendEmail({
          to: process.env.ADMIN_EMAIL || "admin@quotepro.ai",
          from: { email: PLATFORM_FROM_EMAIL, name: PLATFORM_FROM_NAME },
          subject: `[Alert] Dual-platform subscription conflict — User ${user.id}`,
          html: `<p>User <strong>${user.id}</strong> (${user.email}) has active subscriptions on both Stripe (${currentTier}) and RevenueCat (${newTier}). Resolved to: <strong>${higherTier}</strong>. Manual review required.</p>`,
          text: `Subscription conflict for user ${user.id} (${user.email}). Stripe: ${currentTier}, RC: ${newTier}. Resolved: ${higherTier}. Manual review needed.`,
        }).catch(() => {});

        await updateUser(user.id, {
          subscriptionTier: higherTier,
          revenuecatEntitlement: TIER_TO_ENTITLEMENT[newTier] || newTier,
          subscriptionSyncedAt: new Date(),
        } as any);
        return res.status(200).json({ received: true });
      }

      // Normal upgrade
      await updateUser(user.id, {
        subscriptionTier: newTier,
        subscriptionPlatform: "revenuecat",
        revenuecatEntitlement: TIER_TO_ENTITLEMENT[newTier] || newTier,
        revenuecatUserId: appUserId,
        subscriptionSyncedAt: new Date(),
        subscriptionExpiresAt: expiresDateMs ? new Date(expiresDateMs) : null,
      } as any);

      trackEvent(user.id, AnalyticsEvents.UPGRADE_COMPLETED, {
        plan: newTier,
        platform: "revenuecat",
        eventType,
      }).catch(() => {});

      console.log(`[RC Webhook] ${eventType}: user ${user.id} upgraded to ${newTier}`);

      // 4. Create Stripe customer if they don't have one (for billing portal access on web)
      const stripe = getStripe();
      if (stripe && !user.stripe_customer_id && user.email) {
        try {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.name || undefined,
            metadata: { userId: user.id, source: "revenuecat_sync" },
          });
          await pool.query("UPDATE users SET stripe_customer_id = $1 WHERE id = $2", [customer.id, user.id]);
          console.log(`[RC Webhook] Created Stripe customer ${customer.id} for user ${user.id}`);
        } catch (stripeErr: any) {
          console.error("[RC Webhook] Failed to create Stripe customer:", stripeErr.message);
        }
      }

    } else if (["EXPIRATION", "CANCELLATION", "BILLING_ISSUE"].includes(eventType)) {
      // Downgrade to free
      await updateUser(user.id, {
        subscriptionTier: "free",
        subscriptionPlatform: null,
        revenuecatEntitlement: null,
        subscriptionSyncedAt: new Date(),
        subscriptionExpiresAt: new Date(),
      } as any);

      trackEvent(user.id, "CANCEL_INITIATED", { platform: "revenuecat", eventType }).catch(() => {});
      console.log(`[RC Webhook] ${eventType}: user ${user.id} downgraded to free`);

      // Churn intervention email
      try {
        await sendEmail({
          to: user.email,
          from: { email: PLATFORM_FROM_EMAIL, name: PLATFORM_FROM_NAME },
          subject: "We're sorry to see you go — here's what you're missing",
          html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
<h2 style="color:#0f172a">Your QuotePro subscription has ended</h2>
<p>Hi ${user.name || "there"},</p>
<p>Your QuotePro subscription has been cancelled. You'll still have access to the free tier — up to 3 quotes per month.</p>
<p>If you cancelled by mistake or want to resubscribe, tap below:</p>
<p><a href="${process.env.EXPO_PUBLIC_DOMAIN || "https://quotepro.ai"}/app/settings" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">Reactivate QuotePro</a></p>
<p style="color:#64748b;font-size:0.875rem">Have feedback? Reply to this email — we read every response.</p>
</div>`,
          text: `Hi ${user.name || "there"}, your QuotePro subscription has ended. Reactivate at: ${process.env.EXPO_PUBLIC_DOMAIN || "https://quotepro.ai"}/app/settings`,
        });
      } catch (emailErr: any) {
        console.error("[RC Webhook] Failed to send churn email:", emailErr.message);
      }
    } else {
      console.log(`[RC Webhook] Unhandled event type: ${eventType}`);
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("[RC Webhook] Error:", err.message);
    return res.status(500).json({ message: "Internal error" });
  }
});

export default router;

// ── Helpers exported for use in other routers ──────────────────────────────

/**
 * Grant a RevenueCat promotional entitlement for a user.
 * Called from Stripe webhook after successful checkout.
 */
export async function grantRevenueCatEntitlement(
  appUserId: string,
  entitlementId: string,
  durationMonths: number = 1
): Promise<void> {
  const rcSecretKey = getRcKey();
  if (!rcSecretKey) {
    console.warn("[RC] No RevenueCat API key configured — skipping entitlement grant");
    return;
  }

  // Duration must be one of: "daily", "three_day", "weekly", "monthly", "two_month", "three_month", "six_month", "yearly", "lifetime"
  const duration = durationMonths >= 12 ? "yearly" : "monthly";

  const url = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}/entitlements/${encodeURIComponent(entitlementId)}/promotional_entitlements`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${rcSecretKey}`,
      "Content-Type": "application/json",
      "X-Platform": "ios",
    },
    body: JSON.stringify({ duration }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`RevenueCat grant entitlement failed: ${resp.status} ${text}`);
  }
  console.log(`[RC] Granted entitlement ${entitlementId} (${duration}) to appUserId ${appUserId}`);
}

/**
 * Verify a user's RC subscription against the RC API and update the DB.
 * Safe to call on every web login — skips if synced within the last 4 hours.
 * Returns the verified tier string.
 */
export async function syncRcUserTier(userId: string, rcUserId: string, force = false): Promise<string> {
  const rcSecretKey = getRcKey();
  if (!rcSecretKey || !rcUserId) return "unknown";

  // Skip if recently synced (unless forced)
  if (!force) {
    const check = await pool.query(
      `SELECT subscription_synced_at FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    const syncedAt = check.rows[0]?.subscription_synced_at;
    if (syncedAt && Date.now() - new Date(syncedAt).getTime() < 4 * 60 * 60 * 1000) {
      return check.rows[0]?.subscription_tier ?? "free";
    }
  }

  try {
    const tier = await getRevenueCatTier(rcUserId);
    await pool.query(
      `UPDATE users SET subscription_tier = $1, subscription_synced_at = NOW() WHERE id = $2`,
      [tier, userId]
    );
    console.log(`[RC sync] user=${userId} rcUser=${rcUserId} → tier=${tier}`);
    return tier;
  } catch (err: any) {
    console.error(`[RC sync] Failed for user=${userId}:`, err.message);
    return "unknown";
  }
}

/**
 * Bulk-sync all RC users whose subscription_synced_at is stale (> 23 hours).
 * Called by the daily cron job.
 */
export async function bulkSyncRcUsers(): Promise<void> {
  const rcSecretKey = getRcKey();
  if (!rcSecretKey) {
    console.warn("[RC bulk sync] No RevenueCat API key configured — skipping");
    return;
  }

  const result = await pool.query(
    `SELECT id, revenuecat_user_id FROM users
     WHERE subscription_platform = 'revenuecat'
       AND revenuecat_user_id IS NOT NULL
       AND (subscription_synced_at IS NULL OR subscription_synced_at < NOW() - INTERVAL '23 hours')`
  );

  console.log(`[RC bulk sync] Syncing ${result.rows.length} RC users`);

  for (const row of result.rows) {
    try {
      await syncRcUserTier(row.id, row.revenuecat_user_id, true);
      // Small delay to avoid hammering RC API
      await new Promise(r => setTimeout(r, 200));
    } catch (err: any) {
      console.error(`[RC bulk sync] Error for user ${row.id}:`, err.message);
    }
  }

  console.log("[RC bulk sync] Complete");
}

/**
 * Get or create a RevenueCat subscriber and return their active tier.
 */
export async function getRevenueCatTier(appUserId: string): Promise<string> {
  const rcSecretKey = getRcKey();
  if (!rcSecretKey) return "free";

  const resp = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    { headers: { Authorization: `Bearer ${rcSecretKey}` } }
  );
  if (!resp.ok) return "free";

  const data = await resp.json() as any;
  const entitlements: Record<string, any> = data?.subscriber?.entitlements ?? {};

  const isActive = (id: string) => {
    const e = entitlements[id];
    if (!e) return false;
    if (!e.expires_date) return true;
    return new Date(e.expires_date) > new Date();
  };

  if (isActive("pro")) return "pro";
  if (isActive("growth")) return "growth";
  if (isActive("starter")) return "starter";
  return "free";
}
