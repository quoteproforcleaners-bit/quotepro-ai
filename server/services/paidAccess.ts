import { getUserById, updateUser } from "../storage";
import { getUncachableStripeClient } from "../stripeClient";
import { accessFromSubscriber, NO_ACCESS, type PaidAccess } from "../../shared/paidAccess";

export async function verifyPaidAccess(userId: string): Promise<PaidAccess> {
  const user = await getUserById(userId);
  if (!user || user.authProvider === "deleted") return { ...NO_ACCESS };
  const persist = async (access: PaidAccess) => {
    await updateUser(userId, {
      subscriptionTier: access.tier,
      subscriptionExpiresAt: access.expiresAt ? new Date(access.expiresAt) : null,
      subscriptionSyncedAt: new Date(),
      ...(access.platform ? { subscriptionPlatform: access.platform } : {}),
    });
    return access;
  };
  // Existing Stripe subscribers retain paid time; no database tier alone grants access.
  if (user.stripeSubscriptionId && user.stripeCustomerId) {
    const stripe = await getUncachableStripeClient();
    const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const expires = Math.min(...sub.items.data.map(item => item.current_period_end)) * 1000;
    const invoiceId = typeof sub.latest_invoice === "string" ? sub.latest_invoice : sub.latest_invoice?.id;
    if (customer === user.stripeCustomerId && sub.status === "active" && expires > Date.now() &&
        invoiceId && (sub.livemode || process.env.NODE_ENV !== "production")) {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      if (invoice.status === "paid" && invoice.amount_paid > 0) {
        const tier = user.subscriptionTier === "pro" ? "pro" :
          user.subscriptionTier === "growth" ? "growth" : "starter";
        return persist({ tier, expiresAt: new Date(expires).toISOString(), platform: "stripe" });
      }
    }
  }
  const key = process.env.REVENUECAT_SECRET_KEY;
  if (!key) throw new Error("RevenueCat server verification is not configured");
  // Bind provider lookup to authenticated server identity, never request-body IDs.
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.revenuecatUserId || user.id)}`,
    { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10000) },
  );
  if (!response.ok) throw new Error("RevenueCat verification unavailable");
  const data = await response.json() as any;
  return persist(accessFromSubscriber(data.subscriber, Date.now(), process.env.NODE_ENV !== "production"));
}
