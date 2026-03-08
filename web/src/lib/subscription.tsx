import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useAuth } from "./auth";
import { apiPost } from "./api";

interface SubscriptionContextType {
  isPro: boolean;
  tier: string;
  showPaywall: () => void;
  hidePaywall: () => void;
  paywallVisible: boolean;
  startCheckout: () => Promise<void>;
  openPortal: () => Promise<void>;
  checkoutLoading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const tier = (user as any)?.subscriptionTier || "free";
  const isPro = tier === "pro";

  const showPaywall = useCallback(() => setPaywallVisible(true), []);
  const hidePaywall = useCallback(() => setPaywallVisible(false), []);

  const startCheckout = useCallback(async () => {
    setCheckoutLoading(true);
    try {
      const data: any = await apiPost("/api/subscription/create-checkout");
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
    try {
      const data: any = await apiPost("/api/subscription/create-portal");
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Portal error:", err);
    }
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{ isPro, tier, showPaywall, hidePaywall, paywallVisible, startCheckout, openPortal, checkoutLoading }}
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
