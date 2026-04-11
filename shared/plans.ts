/**
 * shared/plans.ts — Single source of truth for plan tiers, limits, and pricing.
 *
 * Import from here in BOTH frontend and backend to avoid drift between
 * what the UI shows and what the server enforces.
 */

export type PlanTier = "free" | "starter" | "growth" | "pro";
export type BillingInterval = "monthly" | "annual";

export const FREE_TRIAL_DAYS = 14;

// ─── Plan metadata ────────────────────────────────────────────────────────────

export const PLAN_META: Record<PlanTier, {
  label: string;
  monthlyPrice: number | null;
  annualMonthlyPrice: number | null;
  quotesPerMonth: number;
  aiFollowUpsPerMonth: number;
}> = {
  free: {
    label: "Free",
    monthlyPrice: null,
    annualMonthlyPrice: null,
    quotesPerMonth: 3,
    aiFollowUpsPerMonth: 0,
  },
  starter: {
    label: "Starter",
    monthlyPrice: 19,
    annualMonthlyPrice: 19,
    quotesPerMonth: 20,
    aiFollowUpsPerMonth: 3,
  },
  growth: {
    label: "Growth",
    monthlyPrice: 49,
    annualMonthlyPrice: 41,
    quotesPerMonth: Infinity,
    aiFollowUpsPerMonth: Infinity,
  },
  pro: {
    label: "Pro",
    monthlyPrice: 99,
    annualMonthlyPrice: 83,
    quotesPerMonth: Infinity,
    aiFollowUpsPerMonth: Infinity,
  },
};

// ─── Tier helpers ─────────────────────────────────────────────────────────────

export function tierRank(tier: PlanTier): number {
  const ranks: Record<PlanTier, number> = { free: 0, starter: 1, growth: 2, pro: 3 };
  return ranks[tier] ?? 0;
}

/** Is this tier Growth or higher (unlimited quotes, AI access)? */
export function isGrowthOrAbove(tier: string | null | undefined): boolean {
  return tier === "growth" || tier === "pro";
}

/** Is this tier Starter or higher? */
export function isStarterOrAbove(tier: string | null | undefined): boolean {
  return tier === "starter" || tier === "growth" || tier === "pro";
}

/** Resolve the quote cap for a given tier. Returns Infinity for unlimited. */
export function getQuoteCap(
  tier: PlanTier,
  isInFreeTrial: boolean,
): number {
  if (isGrowthOrAbove(tier)) return Infinity;
  if (tier === "starter") return PLAN_META.starter.quotesPerMonth;
  return isInFreeTrial ? PLAN_META.starter.quotesPerMonth : PLAN_META.free.quotesPerMonth;
}

/** Format a price for display ("$49/mo", "Free", etc.) */
export function formatPlanPrice(tier: PlanTier, interval: BillingInterval = "monthly"): string {
  const meta = PLAN_META[tier];
  if (meta.monthlyPrice === null) return "Free";
  const price = interval === "annual" ? meta.annualMonthlyPrice! : meta.monthlyPrice;
  return `$${price}/mo`;
}
