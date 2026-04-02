import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { Platform } from "react-native";
import type { PurchasesOffering, PurchasesPackage, CustomerInfo } from "react-native-purchases";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { useQueryClient } from "@tanstack/react-query";
import { trackEvent } from "@/lib/analytics";

export type PlanTier = "free" | "starter" | "growth" | "pro";

const RC_IOS_PUBLIC_KEY = "appl_knabujvvumnLXQVLBCGIcyDScWl";

let PurchasesModule: typeof import("react-native-purchases").default | null = null;

function getPurchases() {
  if (PurchasesModule) return PurchasesModule;
  try {
    PurchasesModule = require("react-native-purchases").default;
    return PurchasesModule;
  } catch (e) {
    return null;
  }
}

export const TIER_RANK: Record<PlanTier, number> = { free: 0, starter: 1, growth: 2, pro: 3 };

const ENTITLEMENT_TO_TIER: Record<string, PlanTier> = {
  pro: "pro",
  Pro: "pro",
  "QuotePro for Cleaners Pro": "pro",
  growth: "growth",
  starter: "starter",
};

function getActiveTier(customerInfo: CustomerInfo): PlanTier {
  const active = customerInfo.entitlements.active;
  if (active["pro"] || active["Pro"] || active["QuotePro for Cleaners Pro"]) return "pro";
  if (active["growth"]) return "growth";
  if (active["starter"]) return "starter";
  return "free";
}

export function hasAccessToTier(currentTier: PlanTier, requiredTier: PlanTier): boolean {
  return TIER_RANK[currentTier] >= TIER_RANK[requiredTier];
}

// Derive best-guess tier from RC package identifier when entitlements are ambiguous.
// Used as a fallback after purchase when getActiveTier returns "free" unexpectedly.
function tierFromPackageIdentifier(identifier: string): PlanTier {
  const id = identifier.toLowerCase();
  if (id.includes("pro")) return "pro";
  // $rc_monthly and $rc_annual are the Growth packages
  if (id.includes("growth") || id === "$rc_monthly" || id === "$rc_annual") return "growth";
  if (id.includes("starter")) return "starter";
  return "starter"; // Conservative fallback: at least grant Starter if we bought something
}

type OfferingsStatus = "idle" | "loading" | "ready" | "error";
type SubscriptionStatus = "free" | "trial" | "active" | "expired";

export interface TrialInfo {
  hasFreeTrial: boolean;
  trialDurationDays: number | null;
  trialDurationText: string | null;
}

interface SubscriptionContextType {
  tier: PlanTier;
  isPro: boolean;      // true for Growth OR Pro (Growth+ features)
  isGrowth: boolean;   // true for Growth OR Pro (alias of isPro, kept for clarity)
  isStarter: boolean;  // true for Starter, Growth, or Pro
  isProOnly: boolean;  // true ONLY for Pro tier (Pro-exclusive features)
  isLoading: boolean;
  currentOffering: PurchasesOffering | null;
  offeringsStatus: OfferingsStatus;
  offeringsError: string | null;
  isConfigured: boolean;
  subscriptionStatus: SubscriptionStatus;
  trialDaysLeft: number | null;
  trialInfo: TrialInfo;
  isInFreeTrial: boolean;       // true if account < 14 days old and on free tier
  freeTrialDaysLeft: number;    // days remaining in the product-level free trial
  // Platform awareness
  platform: "stripe" | "revenuecat" | null;
  canManageOnWeb: boolean;      // can manage on web (Stripe)
  canManageOnIOS: boolean;      // can manage on iOS (RevenueCat / App Store)
  purchase: (pkg?: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
  retryLoadOfferings: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function extractTrialInfo(offering: PurchasesOffering | null): TrialInfo {
  const noTrial: TrialInfo = { hasFreeTrial: false, trialDurationDays: null, trialDurationText: null };
  if (!offering) return noTrial;

  const pkg = offering.monthly || (offering.availablePackages?.length ? offering.availablePackages[0] : null);
  if (!pkg?.product) return noTrial;

  const product = pkg.product as any;
  let priceAmount: number | null = null;
  let unit: string | number | null = null;
  let count: number = 1;

  const intro = product.introPrice;
  if (intro && typeof intro === "object") {
    const rawPrice = intro.price ?? intro.priceAmountMicros;
    if (rawPrice !== undefined && rawPrice !== null) {
      priceAmount = typeof rawPrice === "string" ? parseFloat(rawPrice) : Number(rawPrice);
    }
    unit = intro.periodUnit ?? intro.subscriptionPeriod ?? null;
    count = intro.periodNumberOfUnits || intro.cycles || 1;
  }

  if (priceAmount === null && product.introPriceAmountMicros !== undefined) {
    const micros = Number(product.introPriceAmountMicros);
    priceAmount = isNaN(micros) ? null : micros;
    if (typeof product.introPricePeriod === "string") {
      const iso = product.introPricePeriod;
      if (iso.includes("D")) { const m = iso.match(/(\d+)D/); unit = "DAY"; count = m ? parseInt(m[1], 10) : 1; }
      else if (iso.includes("W")) { const m = iso.match(/(\d+)W/); unit = "WEEK"; count = m ? parseInt(m[1], 10) : 1; }
      else if (iso.includes("M")) { const m = iso.match(/(\d+)M/); unit = "MONTH"; count = m ? parseInt(m[1], 10) : 1; }
      else if (iso.includes("Y")) { const m = iso.match(/(\d+)Y/); unit = "YEAR"; count = m ? parseInt(m[1], 10) : 1; }
    }
    if (product.introPriceCycles) count = Number(product.introPriceCycles) || count;
  }

  if (priceAmount === null || isNaN(priceAmount) || priceAmount > 0) return noTrial;

  let days: number | null = null;
  let text: string | null = null;
  if (unit === "DAY" || unit === "day" || unit === 0) { days = count; text = count === 1 ? "1 day" : `${count} days`; }
  else if (unit === "WEEK" || unit === "week" || unit === 1) { days = count * 7; text = count === 1 ? "1 week" : `${count} weeks`; }
  else if (unit === "MONTH" || unit === "month" || unit === 2) { days = count * 30; text = count === 1 ? "1 month" : `${count} months`; }
  else if (unit === "YEAR" || unit === "year" || unit === 3) { days = count * 365; text = count === 1 ? "1 year" : `${count} years`; }

  if (days !== null) return { hasFreeTrial: true, trialDurationDays: days, trialDurationText: text };
  return noTrial;
}

function tierFromDbString(dbTier: string | null | undefined): PlanTier {
  if (dbTier === "pro") return "pro";
  if (dbTier === "growth") return "growth";
  if (dbTier === "starter") return "starter";
  return "free";
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tier, setTier] = useState<PlanTier>("free");
  const [isLoading, setIsLoading] = useState(true);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [revenueCatReady, setRevenueCatReady] = useState(false);
  const [offeringsStatus, setOfferingsStatus] = useState<OfferingsStatus>("idle");
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>("free");
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [trialInfo, setTrialInfo] = useState<TrialInfo>({ hasFreeTrial: false, trialDurationDays: null, trialDurationText: null });
  const configuredRef = useRef(false);

  // Platform awareness state
  const [platform, setPlatform] = useState<"stripe" | "revenuecat" | null>(null);
  const [canManageOnWeb, setCanManageOnWeb] = useState(true);
  const [canManageOnIOS, setCanManageOnIOS] = useState(false);

  // Fetch unified subscription status for platform fields
  useEffect(() => {
    if (!user) return;
    apiRequest("GET", "/api/subscription/status")
      .then((data: any) => {
        if (data?.platform !== undefined) setPlatform(data.platform ?? null);
        if (data?.canManageOnWeb !== undefined) setCanManageOnWeb(data.canManageOnWeb);
        if (data?.canManageOnIOS !== undefined) setCanManageOnIOS(data.canManageOnIOS);
        // Override tier if server knows better (e.g. Stripe web purchase)
        if (data?.tier && data.tier !== "free") {
          const serverTier = tierFromDbString(data.tier);
          setTier(prev => TIER_RANK[serverTier] > TIER_RANK[prev] ? serverTier : prev);
        }
      })
      .catch(() => {});
  }, [user]);

  const isPro = tier === "growth" || tier === "pro";       // Growth+ access (Growth-gated features)
  const isGrowth = tier === "growth" || tier === "pro";    // Same as isPro, explicit alias
  const isStarter = tier === "starter" || tier === "growth" || tier === "pro";
  const isProOnly = tier === "pro";                        // Strictly Pro-tier-only features

  // Product-level free trial: 14 days from account creation, no payment required
  const FREE_TRIAL_DAYS = 14;
  const userAgeMs = user?.createdAt ? Date.now() - new Date(user.createdAt).getTime() : Infinity;
  const isInFreeTrial = tier === "free" && userAgeMs < FREE_TRIAL_DAYS * 86_400_000;
  const freeTrialDaysLeft = isInFreeTrial
    ? Math.max(0, FREE_TRIAL_DAYS - Math.floor(userAgeMs / 86_400_000))
    : 0;

  const deriveSubscriptionStatus = useCallback((customerInfo: CustomerInfo) => {
    const activeTier = getActiveTier(customerInfo);
    if (activeTier !== "free") {
      const entIds = Object.keys(customerInfo.entitlements.active);
      const activeEnt = entIds.length > 0 ? customerInfo.entitlements.active[entIds[0]] : null;
      const periodType = activeEnt ? (activeEnt as any).periodType : null;
      if (periodType === "trial" || periodType === "TRIAL") {
        setSubscriptionStatus("trial");
        const expDate = activeEnt?.expirationDate ? new Date(activeEnt.expirationDate) : null;
        if (expDate) {
          const diffMs = expDate.getTime() - Date.now();
          setTrialDaysLeft(Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24))));
        } else {
          setTrialDaysLeft(null);
        }
      } else {
        setSubscriptionStatus("active");
        setTrialDaysLeft(null);
      }
    } else {
      setSubscriptionStatus("free");
      setTrialDaysLeft(null);
    }
  }, []);

  const syncToServer = useCallback(async (newTier: PlanTier) => {
    try {
      let appUserId: string | undefined;
      if (Platform.OS !== "web") {
        try {
          const RC = getPurchases();
          if (RC) appUserId = await RC.getAppUserID();
        } catch (_) {}
      }
      await apiRequest("POST", "/api/subscription/sync", { tier: newTier, appUserId });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (error) {
      console.warn("[RC] Sync to server failed:", error);
    }
  }, [queryClient]);

  const applyCustomerInfo = useCallback((customerInfo: CustomerInfo, dbTier: PlanTier) => {
    const rcTier = getActiveTier(customerInfo);
    deriveSubscriptionStatus(customerInfo);
    setTier(rcTier);
    if (rcTier !== dbTier) {
      syncToServer(rcTier);
    }
    return rcTier;
  }, [deriveSubscriptionStatus, syncToServer]);

  const loadOfferings = useCallback(async (): Promise<void> => {
    const RC = getPurchases();
    if (!RC) return;

    setOfferingsStatus("loading");
    setOfferingsError(null);

    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        if (attempt > 0) await delay([500, 1500][attempt - 1]);
        const offerings = await RC.getOfferings();
        console.log("[RC] Offerings loaded, packages:", offerings.current?.availablePackages?.length || 0);
        if (offerings.current && offerings.current.availablePackages.length > 0) {
          setCurrentOffering(offerings.current);
          setTrialInfo(extractTrialInfo(offerings.current));
          setOfferingsStatus("ready");
          setOfferingsError(null);
          trackEvent("offerings_load_success", { packageCount: offerings.current.availablePackages.length });
          return;
        }
      } catch (err: any) {
        if (attempt === 2) {
          setOfferingsStatus("error");
          setOfferingsError("Couldn't load subscription options. Please try again.");
          trackEvent("offerings_load_failed", { reason: err?.message });
        }
      }
    }
    if (offeringsStatus !== "ready") {
      setOfferingsStatus("error");
      setOfferingsError("No subscription packages found.");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!user) {
        setIsLoading(false);
        setTier("free");
        return;
      }

      const dbTier = tierFromDbString(user.subscriptionTier);

      if (Platform.OS === "web") {
        setTier(dbTier);
        setSubscriptionStatus(dbTier !== "free" ? "active" : "free");
        setIsLoading(false);
        return;
      }

      // Only iOS and Android support native RevenueCat SDK
      if (Platform.OS !== "ios" && Platform.OS !== "android") {
        setTier(dbTier);
        setIsLoading(false);
        return;
      }

      const apiKey =
        Platform.OS === "android"
          ? process.env.EXPO_PUBLIC_RC_ANDROID_KEY || ""
          : (process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || RC_IOS_PUBLIC_KEY);
      if (!apiKey) {
        console.warn("[RC] No RevenueCat API key available");
        setTier(dbTier);
        setIsLoading(false);
        return;
      }

      const RC = getPurchases();
      if (!RC) {
        setTier(dbTier);
        setIsLoading(false);
        return;
      }

      if (!configuredRef.current) {
        try {
          RC.configure({ apiKey, appUserID: String(user.id) });
          configuredRef.current = true;
          setRevenueCatReady(true);
          console.log("[RC] Configured for user:", user.id);
        } catch (configError: any) {
          console.warn("[RC] Configure error:", configError);
          setTier(dbTier);
          setIsLoading(false);
          return;
        }
      }

      try {
        const customerInfo = await RC.getCustomerInfo();
        applyCustomerInfo(customerInfo, dbTier);
      } catch (infoError: any) {
        console.warn("[RC] getCustomerInfo error:", infoError);
        setTier(dbTier);
        setSubscriptionStatus(dbTier !== "free" ? "active" : "free");
      }

      await loadOfferings();

      try {
        RC.addCustomerInfoUpdateListener((info) => {
          const updatedTier = getActiveTier(info);
          deriveSubscriptionStatus(info);
          setTier(updatedTier);
          syncToServer(updatedTier);
        });
      } catch (listenerError: any) {
        console.warn("[RC] Listener error:", listenerError);
      }

      setIsLoading(false);
    };

    init();
  }, [user, applyCustomerInfo, syncToServer, loadOfferings, deriveSubscriptionStatus]);

  const purchase = useCallback(async (pkg?: PurchasesPackage): Promise<boolean> => {
    try {
      if (Platform.OS === "web") {
        await apiRequest("POST", "/api/subscription/upgrade");
        setTier("pro");
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        return true;
      }

      const RC = getPurchases();
      if (!RC) throw new Error("Subscription service not available on this device.");

      if (!configuredRef.current) {
        const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || RC_IOS_PUBLIC_KEY;
        if (apiKey && user?.id) {
          RC.configure({ apiKey, appUserID: String(user.id) });
          configuredRef.current = true;
          setRevenueCatReady(true);
        }
      }

      if (!configuredRef.current) {
        throw new Error("Subscription service is not ready. Please restart the app and try again.");
      }

      let targetPkg = pkg;

      if (!targetPkg) {
        let offering = currentOffering;
        if (!offering || offering.availablePackages.length === 0) {
          const offerings = await RC.getOfferings();
          if (offerings.current && offerings.current.availablePackages.length > 0) {
            setCurrentOffering(offerings.current);
            setTrialInfo(extractTrialInfo(offerings.current));
            setOfferingsStatus("ready");
            offering = offerings.current;
          }
        }
        targetPkg = offering?.monthly || (offering?.availablePackages?.[0] ?? null) || undefined;
      }

      if (!targetPkg) {
        throw new Error("No subscription package available. Please check your connection and try again.");
      }

      console.log("[RC] Purchasing:", targetPkg.identifier);
      const { customerInfo } = await RC.purchasePackage(targetPkg);

      const rcTier = getActiveTier(customerInfo);
      // If RC entitlements are clear, use them. Otherwise derive tier from the
      // package identifier. This handles Expo Go Preview Mode and transient
      // entitlement propagation delays.
      const resolvedTier = rcTier !== "free"
        ? rcTier
        : tierFromPackageIdentifier(targetPkg.identifier);
      deriveSubscriptionStatus(customerInfo);
      setTier(resolvedTier);
      await syncToServer(resolvedTier);
      console.log("[RC] Purchase resolved tier:", resolvedTier, "(rc:", rcTier, "pkg:", targetPkg.identifier, ")");
      return true;
    } catch (error: any) {
      if (
        error.userCancelled ||
        error.code === "1" ||
        error.code === "PURCHASE_CANCELLED" ||
        error.message?.includes("cancelled") ||
        error.message?.includes("canceled")
      ) {
        return false;
      }
      console.error("[RC] Purchase error:", error?.message, error?.code);
      throw error;
    }
  }, [currentOffering, revenueCatReady, deriveSubscriptionStatus, syncToServer, queryClient, user]);

  const restore = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === "web" || !revenueCatReady) return false;

      const RC = getPurchases();
      if (!RC) return false;

      const customerInfo = await RC.restorePurchases();
      const restoredTier = getActiveTier(customerInfo);
      deriveSubscriptionStatus(customerInfo);
      setTier(restoredTier);
      await syncToServer(restoredTier);
      return restoredTier !== "free";
    } catch (error) {
      console.error("[RC] Restore error:", error);
      throw error;
    }
  }, [revenueCatReady, deriveSubscriptionStatus, syncToServer]);

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        isPro,
        isGrowth,
        isStarter,
        isProOnly,
        isLoading,
        currentOffering,
        offeringsStatus,
        offeringsError,
        isConfigured: revenueCatReady,
        subscriptionStatus,
        trialDaysLeft,
        trialInfo,
        isInFreeTrial,
        freeTrialDaysLeft,
        platform,
        canManageOnWeb,
        canManageOnIOS,
        purchase,
        restore,
        retryLoadOfferings: loadOfferings,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return context;
}

export function usePlanGate(requiredTier: PlanTier): { hasAccess: boolean; isLoading: boolean; tier: PlanTier } {
  const { tier, isLoading } = useSubscription();
  return { hasAccess: hasAccessToTier(tier, requiredTier), isLoading, tier };
}
