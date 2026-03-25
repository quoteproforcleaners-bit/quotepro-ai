import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { updateUser, getUserById } from "../storage";
import { sendEmail, PLATFORM_FROM_EMAIL, PLATFORM_FROM_NAME } from "../mail";
import { trackEvent } from "../analytics";
import { AnalyticsEvents } from "../../shared/analytics-events";
import { getStripe } from "../clients";

const router = Router();

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
router.post("/api/webhooks/revenuecat", async (req: Request, res: Response) => {
  try {
    // 1. Verify webhook authenticity
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = req.headers["authorization"] as string | undefined;
      if (!authHeader || authHeader !== `Bearer ${webhookSecret}`) {
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
  const rcSecretKey = process.env.REVENUECAT_SECRET_KEY;
  if (!rcSecretKey) {
    console.warn("[RC] REVENUECAT_SECRET_KEY not set — skipping entitlement grant");
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
 * Get or create a RevenueCat subscriber and return their active tier.
 */
export async function getRevenueCatTier(appUserId: string): Promise<string> {
  const rcSecretKey = process.env.REVENUECAT_SECRET_KEY;
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
