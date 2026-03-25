import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "./auth";
import { apiPost } from "./api";

export type PlanTier = "free" | "starter" | "growth" | "pro";
export type BillingInterval = "monthly" | "annual";

export const PLAN_LIMITS: Record<PlanTier, { quotesPerMonth: number; label: string }> = {
  free: { quotesPerMonth: 3, label: "Free" },
  starter: { quotesPerMonth: 20, label: "Starter" },
  growth: { quotesPerMonth: Infinity, label: "Growth" },
  pro: { quotesPerMonth: Infinity, label: "Pro" },
};

const FREE_TRIAL_DAYS = 14;

interface SubscriptionContextType {
  tier: PlanTier;
  isPro: boolean;
  isGrowth: boolean;
  isStarter: boolean;
  isFree: boolean;
  isInFreeTrial: boolean;
  freeTrialDaysLeft: number;
  hasUnlimitedQuotes: boolean;
  hasAI: boolean;
  hasPremium: boolean;
  quotesPerMonth: number;
  showPaywall: () => void;
  hidePaywall: () => void;
  paywallVisible: boolean;
  startCheckout: (plan?: PlanTier, interval?: BillingInterval) => Promise<void>;
  openPortal: () => Promise<void>;
  checkoutLoading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const tier = ((user as any)?.subscriptionTier || "free") as PlanTier;

  const isPro = tier === "pro";
  const isGrowth = tier === "growth" || tier === "pro";
  const isStarter = tier === "starter";
  const isFree = tier === "free";
  const hasUnlimitedQuotes = isGrowth;
  const hasAI = isGrowth;
  const hasPremium = isPro;
  const quotesPerMonth = PLAN_LIMITS[tier]?.quotesPerMonth ?? 3;

  // 14-day product-level free trial, anchored to trialStartedAt (falls back to createdAt)
  const trialRef = (user as any)?.trialStartedAt ?? (user as any)?.createdAt;
  const userAgeMs = trialRef
    ? Date.now() - new Date(trialRef).getTime()
    : Infinity;
  const isInFreeTrial = isFree && userAgeMs < FREE_TRIAL_DAYS * 86_400_000;
  const freeTrialDaysLeft = isInFreeTrial
    ? Math.max(0, FREE_TRIAL_DAYS - Math.floor(userAgeMs / 86_400_000))
    : 0;

  const showPaywall = useCallback(() => setPaywallVisible(true), []);
  const hidePaywall = useCallback(() => setPaywallVisible(false), []);

  const startCheckout = useCallback(async (plan: PlanTier = "growth", interval: BillingInterval = "monthly") => {
    setCheckoutLoading(true);
    try {
      const data: any = await apiPost("/api/subscription/create-checkout", { plan, interval });
      if (data.alreadyPro) {
        window.location.reload();
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setCheckoutLoading(false);
    }
  }, []);

  const openPortal = useCallback(async () => {
    const data: any = await apiPost("/api/subscription/create-portal");
    if (data.url) {
      window.open(data.url, "_blank");
    }
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        tier, isPro, isGrowth, isStarter, isFree,
        isInFreeTrial, freeTrialDaysLeft,
        hasUnlimitedQuotes, hasAI, hasPremium, quotesPerMonth,
        showPaywall, hidePaywall, paywallVisible,
        startCheckout, openPortal, checkoutLoading,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
