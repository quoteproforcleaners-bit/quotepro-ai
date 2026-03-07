import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { Platform } from "react-native";
import type { PurchasesOffering, CustomerInfo } from "react-native-purchases";
import Constants from "expo-constants";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useQueryClient } from "@tanstack/react-query";
import { trackEvent } from "@/lib/analytics";

function isExpoGo(): boolean {
  try {
    return Constants.appOwnership === "expo";
  } catch {
    return false;
  }
}

let PurchasesModule: typeof import("react-native-purchases").default | null = null;

function getPurchases() {
  if (PurchasesModule) return PurchasesModule;
  try {
    PurchasesModule = require("react-native-purchases").default;
    return PurchasesModule;
  } catch (e) {
    console.warn("RevenueCat native module not available:", e);
    return null;
  }
}

type OfferingsStatus = "idle" | "loading" | "ready" | "error";
type SubscriptionStatus = "free" | "trial" | "active" | "expired";

interface TrialInfo {
  hasFreeTrial: boolean;
  trialDurationDays: number | null;
  trialDurationText: string | null;
}

interface SubscriptionContextType {
  isPro: boolean;
  isLoading: boolean;
  currentOffering: PurchasesOffering | null;
  offeringsStatus: OfferingsStatus;
  offeringsError: string | null;
  isConfigured: boolean;
  subscriptionStatus: SubscriptionStatus;
  trialDaysLeft: number | null;
  trialInfo: TrialInfo;
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
  retryLoadOfferings: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const ENTITLEMENT_IDS = ["Pro", "QuotePro for Cleaners Pro", "pro"];

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
    if (typeof product.introPricePeriod === "string" && product.introPricePeriod.length > 0) {
      const iso = product.introPricePeriod;
      if (iso.includes("D")) {
        const match = iso.match(/(\d+)D/);
        unit = "DAY";
        count = match ? parseInt(match[1], 10) : 1;
      } else if (iso.includes("W")) {
        const match = iso.match(/(\d+)W/);
        unit = "WEEK";
        count = match ? parseInt(match[1], 10) : 1;
      } else if (iso.includes("M")) {
        const match = iso.match(/(\d+)M/);
        unit = "MONTH";
        count = match ? parseInt(match[1], 10) : 1;
      } else if (iso.includes("Y")) {
        const match = iso.match(/(\d+)Y/);
        unit = "YEAR";
        count = match ? parseInt(match[1], 10) : 1;
      }
    }
    if (product.introPriceCycles) {
      count = Number(product.introPriceCycles) || count;
    }
  }

  const introductory = product.introductoryPrice;
  if (priceAmount === null && introductory && typeof introductory === "object") {
    const rawPrice = introductory.price ?? introductory.priceAmountMicros;
    if (rawPrice !== undefined && rawPrice !== null) {
      priceAmount = typeof rawPrice === "string" ? parseFloat(rawPrice) : Number(rawPrice);
    }
    unit = unit ?? introductory.periodUnit ?? introductory.subscriptionPeriod ?? null;
    count = introductory.periodNumberOfUnits || introductory.cycles || count;
  }

  if (priceAmount === null || isNaN(priceAmount) || priceAmount > 0) return noTrial;

  let days: number | null = null;
  let text: string | null = null;

  if (unit === "DAY" || unit === "day" || unit === 0) {
    days = count;
    text = count === 1 ? "1 day" : `${count} days`;
  } else if (unit === "WEEK" || unit === "week" || unit === 1) {
    days = count * 7;
    text = count === 1 ? "1 week" : `${count} weeks`;
  } else if (unit === "MONTH" || unit === "month" || unit === 2) {
    days = count * 30;
    text = count === 1 ? "1 month" : `${count} months`;
  } else if (unit === "YEAR" || unit === "year" || unit === 3) {
    days = count * 365;
    text = count === 1 ? "1 year" : `${count} years`;
  } else if (typeof unit === "string" && unit.length > 0) {
    days = count;
    text = `${count} ${unit.toLowerCase()}`;
  }

  if (days !== null) {
    return { hasFreeTrial: true, trialDurationDays: days, trialDurationText: text };
  }

  return noTrial;
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [revenueCatReady, setRevenueCatReady] = useState(false);
  const [offeringsStatus, setOfferingsStatus] = useState<OfferingsStatus>("idle");
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>("free");
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [trialInfo, setTrialInfo] = useState<TrialInfo>({ hasFreeTrial: false, trialDurationDays: null, trialDurationText: null });
  const configuredRef = useRef(false);

  const deriveSubscriptionStatus = useCallback((customerInfo: CustomerInfo) => {
    for (const id of ENTITLEMENT_IDS) {
      const ent = customerInfo.entitlements.active[id];
      if (ent) {
        const periodType = (ent as any).periodType;
        if (periodType === "trial" || periodType === "TRIAL") {
          setSubscriptionStatus("trial");
          const expDate = ent.expirationDate ? new Date(ent.expirationDate) : null;
          if (expDate) {
            const now = new Date();
            const diffMs = expDate.getTime() - now.getTime();
            const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
            setTrialDaysLeft(diffDays);
          } else {
            setTrialDaysLeft(null);
          }
        } else {
          setSubscriptionStatus("active");
          setTrialDaysLeft(null);
        }
        return;
      }
    }
    for (const id of ENTITLEMENT_IDS) {
      const allEnts = customerInfo.entitlements.all;
      if (allEnts && allEnts[id]) {
        setSubscriptionStatus("expired");
        setTrialDaysLeft(null);
        return;
      }
    }
    setSubscriptionStatus("free");
    setTrialDaysLeft(null);
  }, []);

  const checkEntitlements = useCallback((customerInfo: CustomerInfo) => {
    const hasEntitlement = ENTITLEMENT_IDS.some(id => customerInfo.entitlements.active[id] !== undefined);
    setIsPro(hasEntitlement);
    deriveSubscriptionStatus(customerInfo);
    return hasEntitlement;
  }, [deriveSubscriptionStatus]);

  const syncSubscriptionToServer = useCallback(async (hasPro: boolean) => {
    try {
      if (hasPro) {
        await apiRequest("POST", "/api/subscription/upgrade");
      } else {
        await apiRequest("POST", "/api/subscription/sync", {
          tier: "free",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (error) {
      console.error("Failed to sync subscription:", error);
    }
  }, [queryClient]);

  const loadOfferings = useCallback(async (retryCount = 0): Promise<void> => {
    const RC = getPurchases();
    if (!RC) return;

    setOfferingsStatus("loading");
    setOfferingsError(null);

    const maxRetries = 2;
    const retryDelays = [500, 1200];

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await delay(retryDelays[attempt - 1]);
        }
        const offerings = await RC.getOfferings();
        console.log("RevenueCat offerings loaded, current:", offerings.current?.identifier);
        console.log("RevenueCat packages count:", offerings.current?.availablePackages?.length || 0);

        if (offerings.current && offerings.current.availablePackages.length > 0) {
          setCurrentOffering(offerings.current);
          setTrialInfo(extractTrialInfo(offerings.current));
          setOfferingsStatus("ready");
          setOfferingsError(null);
          trackEvent("offerings_load_success", {
            offeringId: offerings.current.identifier,
            packageCount: offerings.current.availablePackages.length,
          });
          return;
        }

        if (attempt === maxRetries) {
          setOfferingsStatus("error");
          setOfferingsError("No subscription packages found. Please try again.");
          console.warn("RevenueCat: No packages in current offering after retries");
          trackEvent("offerings_load_failed", { reason: "no_packages" });
        }
      } catch (err: any) {
        console.warn(`RevenueCat getOfferings attempt ${attempt + 1} failed:`, err?.message);
        if (attempt === maxRetries) {
          setOfferingsStatus("error");
          setOfferingsError("Couldn't load subscription options. Please try again.");
          trackEvent("offerings_load_failed", { reason: err?.message });
        }
      }
    }
  }, []);

  useEffect(() => {
    const initRevenueCat = async () => {
      if (!user) {
        setIsLoading(false);
        setIsPro(false);
        return;
      }

      try {
        if (Platform.OS === "web" || isExpoGo()) {
          console.log(isExpoGo() ? "Expo Go detected — RevenueCat Browser Mode" : "Web platform — RevenueCat Browser Mode", "appOwnership:", Constants.appOwnership, "executionEnvironment:", Constants.executionEnvironment);
          const dbPro = user.subscriptionTier === "pro";
          setIsPro(dbPro);
          setSubscriptionStatus(dbPro ? "active" : "free");
          setIsLoading(false);
          return;
        }

        const baseUrl = getApiUrl();
        const configRes = await fetch(new URL("/api/subscription/config", baseUrl), {
          credentials: "include",
        });

        if (!configRes.ok) {
          trackEvent("revenuecat_init_failed", { reason: "config_fetch_failed", status: configRes.status });
          setIsPro(user.subscriptionTier === "pro");
          setIsLoading(false);
          return;
        }

        const config = await configRes.json();
        const apiKey = Platform.OS === "android"
          ? (config.googleApiKey || config.apiKey)
          : config.apiKey;

        if (!apiKey) {
          console.warn("RevenueCat: No API key available");
          trackEvent("revenuecat_init_failed", { reason: "no_api_key" });
          setIsPro(user.subscriptionTier === "pro");
          setIsLoading(false);
          return;
        }

        const RC = getPurchases();
        if (!RC) {
          console.warn("RevenueCat native module not available, using database status");
          trackEvent("revenuecat_init_failed", { reason: "native_module_unavailable" });
          setIsPro(user.subscriptionTier === "pro");
          setIsLoading(false);
          return;
        }

        if (!configuredRef.current) {
          try {
            RC.configure({ apiKey, appUserID: user.id });
            configuredRef.current = true;
            setRevenueCatReady(true);
            console.log("RevenueCat configured with key:", apiKey.slice(0, 8) + "...");
          } catch (configError: any) {
            console.warn("RevenueCat configure error:", configError);
            trackEvent("revenuecat_init_failed", { reason: "configure_error", error: configError?.message });
            setIsPro(user.subscriptionTier === "pro");
            setIsLoading(false);
            return;
          }
        }

        try {
          const customerInfo = await RC.getCustomerInfo();
          const rcHasPro = ENTITLEMENT_IDS.some(id => customerInfo.entitlements.active[id] !== undefined);
          deriveSubscriptionStatus(customerInfo);

          if (rcHasPro) {
            setIsPro(true);
            if (user.subscriptionTier !== "pro") {
              await syncSubscriptionToServer(true);
            }
          } else if (!rcHasPro && user.subscriptionTier === "pro") {
            setIsPro(false);
            await syncSubscriptionToServer(false);
          } else {
            setIsPro(false);
          }
        } catch (infoError: any) {
          console.warn("RevenueCat getCustomerInfo error:", infoError);
          const dbPro = user.subscriptionTier === "pro";
          setIsPro(dbPro);
          setSubscriptionStatus(dbPro ? "active" : "free");
        }

        await loadOfferings();

        try {
          RC.addCustomerInfoUpdateListener((info) => {
            const rcUpdatedPro = ENTITLEMENT_IDS.some(id => info.entitlements.active[id] !== undefined);
            deriveSubscriptionStatus(info);
            if (rcUpdatedPro) {
              setIsPro(true);
              syncSubscriptionToServer(true);
            } else {
              setIsPro(false);
              syncSubscriptionToServer(false);
            }
          });
        } catch (listenerError: any) {
          console.warn("RevenueCat listener error:", listenerError);
        }
      } catch (error) {
        console.warn("Subscription init error:", error);
        trackEvent("revenuecat_init_failed", { reason: "init_error" });
        setIsPro(user.subscriptionTier === "pro");
      } finally {
        setIsLoading(false);
      }
    };

    initRevenueCat();
  }, [user, checkEntitlements, syncSubscriptionToServer, loadOfferings]);

  const purchase = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === "web") {
        await apiRequest("POST", "/api/subscription/upgrade");
        setIsPro(true);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        return true;
      }

      const RC = getPurchases();
      if (!RC) throw new Error("Subscription service is not available on this device.");

      if (!configuredRef.current) {
        console.log("Purchase: RevenueCat not configured, attempting configuration...");
        const baseUrl = getApiUrl();
        const configRes = await fetch(new URL("/api/subscription/config", baseUrl), {
          credentials: "include",
        });
        if (configRes.ok) {
          const config = await configRes.json();
          const apiKey = Platform.OS === "android"
            ? (config.googleApiKey || config.apiKey)
            : config.apiKey;
          if (apiKey) {
            RC.configure({ apiKey, appUserID: user?.id });
            configuredRef.current = true;
            setRevenueCatReady(true);
            console.log("Purchase: RevenueCat configured successfully");
          }
        }
      }

      if (!configuredRef.current) {
        throw new Error("Subscription service is not ready. Please restart the app and try again.");
      }

      let offering = currentOffering;
      if (!offering || offering.availablePackages.length === 0) {
        console.log("Purchase: No cached offering, fetching from RevenueCat...");
        const offerings = await RC.getOfferings();
        console.log("Purchase: Offerings fetched, current:", offerings.current?.identifier, "packages:", offerings.current?.availablePackages?.length);
        if (offerings.current && offerings.current.availablePackages.length > 0) {
          setCurrentOffering(offerings.current);
          setTrialInfo(extractTrialInfo(offerings.current));
          setOfferingsStatus("ready");
          offering = offerings.current;
        }
      }

      const pkg = offering?.monthly || (offering?.availablePackages?.length ? offering.availablePackages[0] : null);

      if (!pkg) {
        throw new Error("No subscription package available. Please check your internet connection and try again.");
      }

      console.log("Purchase: Purchasing package:", pkg.identifier, pkg.product?.identifier);
      const { customerInfo } = await RC.purchasePackage(pkg);

      console.log("Purchase: Complete. Active entitlements:", Object.keys(customerInfo.entitlements.active));
      const hasPro = checkEntitlements(customerInfo);

      if (!hasPro) {
        console.warn("Purchase: Payment succeeded but entitlement not found. Active:", Object.keys(customerInfo.entitlements.active), "Expected one of:", ENTITLEMENT_IDS);
        setIsPro(true);
        await syncSubscriptionToServer(true);
        return true;
      }

      await syncSubscriptionToServer(hasPro);
      return true;
    } catch (error: any) {
      if (error.userCancelled || error.code === "1" || error.code === "PURCHASE_CANCELLED" || error.message?.includes("cancelled") || error.message?.includes("canceled")) {
        return false;
      }
      console.error("Purchase error:", error?.message, error?.code, error);
      throw error;
    }
  }, [currentOffering, revenueCatReady, checkEntitlements, syncSubscriptionToServer, queryClient]);

  const restore = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === "web" || !revenueCatReady) {
        return false;
      }

      const RC = getPurchases();
      if (!RC) return false;
      const customerInfo = await RC.restorePurchases();
      const hasPro = checkEntitlements(customerInfo);
      await syncSubscriptionToServer(hasPro);
      return hasPro;
    } catch (error) {
      console.error("Restore error:", error);
      throw error;
    }
  }, [revenueCatReady, checkEntitlements, syncSubscriptionToServer]);

  return (
    <SubscriptionContext.Provider
      value={{
        isPro,
        isLoading,
        currentOffering,
        offeringsStatus,
        offeringsError,
        isConfigured: revenueCatReady,
        subscriptionStatus,
        trialDaysLeft,
        trialInfo,
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
  if (!context) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
