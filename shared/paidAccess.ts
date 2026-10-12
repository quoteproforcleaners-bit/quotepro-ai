/** Internal tier names are retained for compatibility with the published app. */
export type AccessTier = "free" | "starter" | "growth" | "pro";
export interface PaidAccess {
  tier: AccessTier;
  expiresAt: string | null;
  platform: "revenuecat" | "stripe" | null;
}
export const NO_ACCESS: PaidAccess = { tier: "free", expiresAt: null, platform: null };
export const WEEKLY_PRODUCTS = {
  quotepro_basic_weekly: "starter",
  quotepro_ai_weekly: "growth",
} as const;

export function isWeeklyProduct(product: {
  identifier: string; subscriptionPeriod: string | null; introPrice?: { price: number } | null;
}) {
  return Object.hasOwn(WEEKLY_PRODUCTS, product.identifier) &&
    product.subscriptionPeriod === "P1W" && !product.introPrice;
}

/** Cancellation retains paid time; trials, refunds and promotional grants do not. */
export function accessFromSubscriber(subscriber: any, now = Date.now(), allowSandbox = false): PaidAccess {
  const ranks: Record<AccessTier, number> = { free: 0, starter: 1, growth: 2, pro: 3 };
  const tiers: Record<string, AccessTier> = {
    basic: "starter", ai: "growth", starter: "starter", growth: "growth",
    pro: "pro", Pro: "pro", "QuotePro for Cleaners Pro": "pro",
  };
  let result = { ...NO_ACCESS };
  for (const [id, ent] of Object.entries(subscriber?.entitlements ?? {}) as [string, any][]) {
    const tier = tiers[id];
    const transaction = subscriber?.subscriptions?.[ent.product_identifier];
    const expires = Math.min(Date.parse(ent.expires_date ?? ""), Date.parse(transaction?.expires_date ?? ""));
    if (!tier || !transaction || !Number.isFinite(expires) || expires <= now) continue;
    if (transaction.refunded_at || (transaction.is_sandbox && !allowSandbox)) continue;
    if (String(transaction.period_type).toLowerCase() === "trial") continue;
    if (!["app_store", "play_store"].includes(transaction.store)) continue;
    const productTier = WEEKLY_PRODUCTS[ent.product_identifier as keyof typeof WEEKLY_PRODUCTS];
    const effectiveTier = productTier && ranks[productTier] < ranks[tier] ? productTier : tier;
    if (ranks[effectiveTier] > ranks[result.tier]) {
      result = { tier: effectiveTier, expiresAt: new Date(expires).toISOString(), platform: "revenuecat" };
    }
  }
  return result;
}
