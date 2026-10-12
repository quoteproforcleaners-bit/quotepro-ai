import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { AppState, Platform } from "react-native";
import type { PurchasesOffering, PurchasesPackage } from "react-native-purchases";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { isWeeklyProduct, type AccessTier } from "../../shared/paidAccess";

export type PlanTier = AccessTier;
export const TIER_RANK: Record<PlanTier, number> = { free: 0, starter: 1, growth: 2, pro: 3 };
export function hasAccessToTier(current: PlanTier, required: PlanTier) {
  return current !== "free" && TIER_RANK[current] >= Math.min(TIER_RANK[required], TIER_RANK.growth);
}
const RC_IOS_PUBLIC_KEY = "appl_knabujvvumnLXQVLBCGIcyDScWl";
function sdk(): typeof import("react-native-purchases").default {
  return require("react-native-purchases").default;
}
export interface TrialInfo { hasFreeTrial: boolean; trialDurationDays: number | null; trialDurationText: string | null }
interface SubscriptionContextType {
  tier: PlanTier; isPro: boolean; isGrowth: boolean; isStarter: boolean; isProOnly: boolean;
  isLoading: boolean; isConfigured: boolean;
  currentOffering: PurchasesOffering | null;
  offeringsStatus: "idle" | "loading" | "ready" | "error"; offeringsError: string | null;
  subscriptionStatus: "free" | "trial" | "active" | "expired";
  trialDaysLeft: number | null; trialInfo: TrialInfo; isInFreeTrial: boolean; freeTrialDaysLeft: number;
  platform: "stripe" | "revenuecat" | null; subscriptionInterval: "weekly" | "monthly" | "annual";
  canManageOnWeb: boolean; canManageOnIOS: boolean;
  purchase: (pkg?: PurchasesPackage) => Promise<boolean>; restore: () => Promise<boolean>;
  retryLoadOfferings: () => Promise<void>;
}
const Context = createContext<SubscriptionContextType | undefined>(undefined);
export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const identity = useRef(userId);
  identity.current = userId;
  const configured = useRef(false);
  const [owner, setOwner] = useState<string | undefined>();
  const [tier, setTier] = useState<PlanTier>("free");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isConfigured, setConfigured] = useState(false);
  const [currentOffering, setOffering] = useState<PurchasesOffering | null>(null);
  const [offeringsStatus, setOfferingsStatus] = useState<SubscriptionContextType["offeringsStatus"]>("idle");
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<"stripe" | "revenuecat" | null>(null);
  const sequence = useRef(0);
  const refresh = useCallback(async (sync = false) => {
    const requestOwner = userId;
    const requestSequence = ++sequence.current;
    if (!requestOwner) return false;
    try {
      const response = await apiRequest(sync ? "POST" : "GET", sync ? "/api/subscription/sync" : "/api/subscription/status", sync ? {} : undefined);
      const data = await response.json();
      if (identity.current !== requestOwner || requestSequence !== sequence.current) return false;
      const valid = data.expiresAt && Date.parse(data.expiresAt) > Date.now();
      const verified: PlanTier = valid && ["starter", "growth", "pro"].includes(data.tier) ? data.tier : "free";
      setOwner(requestOwner); setTier(verified); setExpiresAt(data.expiresAt ?? null); setPlatform(data.platform ?? null);
      return verified !== "free";
    } catch (error) {
      if (identity.current === requestOwner && requestSequence === sequence.current) {
        setTier("free"); setExpiresAt(null); setOwner(requestOwner);
      }
      throw error;
    }
  }, [userId]);
  const loadOfferings = useCallback(async () => {
    setOfferingsStatus("loading"); setOfferingsError(null);
    try {
      if (Platform.OS !== "ios" || !configured.current) throw new Error();
      const offerings = await sdk().getOfferings();
      if (!offerings.current) throw new Error();
      setOffering(offerings.current); setOfferingsStatus("ready");
    } catch {
      setOffering(null); setOfferingsStatus("error");
      setOfferingsError("Subscription options are unavailable. Please retry on your iPhone.");
    }
  }, []);
  useEffect(() => {
    let disposed = false;
    let removeListener: (() => void) | undefined;
    setTier("free"); setExpiresAt(null); setOwner(undefined); setConfigured(false); setLoading(true);
    if (!userId) { setLoading(false); return; }
    (async () => {
      if (Platform.OS === "ios") {
        try {
          const rc = sdk();
          if (!configured.current) {
            rc.configure({ apiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || RC_IOS_PUBLIC_KEY,
              appUserID: userId, storeKitVersion: rc.STOREKIT_VERSION.STOREKIT_2 });
            configured.current = true;
          } else await rc.logIn(userId);
          if (disposed) return;
          setConfigured(true);
          const listener = () => { refresh(true).catch(() => {}); };
          rc.addCustomerInfoUpdateListener(listener);
          removeListener = () => rc.removeCustomerInfoUpdateListener(listener);
          await loadOfferings();
        } catch { setOfferingsStatus("error"); setOfferingsError("Store unavailable. Please retry."); }
      }
      if (!disposed) {
        try { await refresh(); } catch { /* Access stays closed. */ }
        if (!disposed) setLoading(false);
      }
    })();
    return () => { disposed = true; removeListener?.(); };
  }, [userId, refresh, loadOfferings]);
  useEffect(() => {
    const sub = AppState.addEventListener("change", state => {
      if (state === "active" && userId) {
        refresh().catch(() => {});
      }
    });
    return () => sub.remove();
  }, [refresh, userId]);
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setTimeout(() => {
      setTier("free"); refresh().catch(() => {});
    }, Math.max(0, Math.min(Date.parse(expiresAt) - Date.now(), 2147483647)));
    return () => clearTimeout(timer);
  }, [expiresAt, refresh]);
  const purchase = useCallback(async (pkg?: PurchasesPackage) => {
    if (!userId || identity.current !== userId || Platform.OS !== "ios" || !isConfigured) throw new Error("Store unavailable.");
    if (!pkg || !isWeeklyProduct(pkg.product)) throw new Error("Weekly subscription configuration is unavailable.");
    const purchaseOwner = userId;
    try {
      await sdk().purchasePackage(pkg);
      if (identity.current !== purchaseOwner) return false;
      if (!await refresh(true)) throw new Error("Purchase verification pending. Please use Restore Purchases to retry.");
      return true;
    } catch (error: any) {
      if (error.userCancelled) return false;
      throw error;
    }
  }, [userId, isConfigured, refresh]);
  const restore = useCallback(async () => {
    if (Platform.OS !== "ios" || !isConfigured || !userId) throw new Error("Restore purchases on your iPhone.");
    const restoreOwner = userId;
    await sdk().restorePurchases();
    if (identity.current !== restoreOwner) return false;
    return refresh(true);
  }, [refresh, isConfigured, userId]);
  const retry = useCallback(async () => { await loadOfferings(); await refresh(); }, [loadOfferings, refresh]);
  const effectiveTier = owner === userId && !isLoading && expiresAt && Date.parse(expiresAt) > Date.now() ? tier : "free";
  const ai = effectiveTier === "growth" || effectiveTier === "pro";
  return <Context.Provider value={{
    tier: effectiveTier, isPro: ai, isGrowth: ai, isProOnly: ai, isStarter: effectiveTier !== "free",
    isLoading, isConfigured, currentOffering, offeringsStatus, offeringsError,
    subscriptionStatus: effectiveTier === "free" ? "expired" : "active",
    trialDaysLeft: null, trialInfo: { hasFreeTrial: false, trialDurationDays: null, trialDurationText: null },
    isInFreeTrial: false, freeTrialDaysLeft: 0, platform,
    subscriptionInterval: platform === "stripe" ? "monthly" : "weekly",
    canManageOnWeb: platform === "stripe", canManageOnIOS: platform !== "stripe",
    purchase, restore, retryLoadOfferings: retry,
  }}>{children}</Context.Provider>;
}
export function useSubscription() {
  const value = useContext(Context);
  if (!value) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return value;
}
export function usePlanGate(requiredTier: PlanTier) {
  const { tier, isLoading } = useSubscription();
  return { hasAccess: !isLoading && hasAccessToTier(tier, requiredTier), isLoading, tier };
}
