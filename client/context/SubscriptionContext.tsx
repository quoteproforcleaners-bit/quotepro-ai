import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { Platform } from "react-native";
import type { PurchasesOffering, CustomerInfo } from "react-native-purchases";
import Constants from "expo-constants";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useQueryClient } from "@tanstack/react-query";

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

interface SubscriptionContextType {
  isPro: boolean;
  isLoading: boolean;
  currentOffering: PurchasesOffering | null;
  offeringsStatus: OfferingsStatus;
  offeringsError: string | null;
  isConfigured: boolean;
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
  retryLoadOfferings: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const ENTITLEMENT_IDS = ["Pro", "QuotePro for Cleaners Pro", "pro"];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [revenueCatReady, setRevenueCatReady] = useState(false);
  const [offeringsStatus, setOfferingsStatus] = useState<OfferingsStatus>("idle");
  const [offeringsError, setOfferingsError] = useState<string | null>(null);
  const configuredRef = useRef(false);

  const checkEntitlements = useCallback((customerInfo: CustomerInfo) => {
    const hasEntitlement = ENTITLEMENT_IDS.some(id => customerInfo.entitlements.active[id] !== undefined);
    setIsPro(hasEntitlement);
    return hasEntitlement;
  }, []);

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
          setOfferingsStatus("ready");
          setOfferingsError(null);
          return;
        }

        if (attempt === maxRetries) {
          setOfferingsStatus("error");
          setOfferingsError("No subscription packages found. Please try again.");
          console.warn("RevenueCat: No packages in current offering after retries");
        }
      } catch (err: any) {
        console.warn(`RevenueCat getOfferings attempt ${attempt + 1} failed:`, err?.message);
        if (attempt === maxRetries) {
          setOfferingsStatus("error");
          setOfferingsError("Couldn't load subscription options. Please try again.");
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
          setIsPro(user.subscriptionTier === "pro");
          setIsLoading(false);
          return;
        }

        const baseUrl = getApiUrl();
        const configRes = await fetch(new URL("/api/subscription/config", baseUrl), {
          credentials: "include",
        });

        if (!configRes.ok) {
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
          setIsPro(user.subscriptionTier === "pro");
          setIsLoading(false);
          return;
        }

        const RC = getPurchases();
        if (!RC) {
          console.warn("RevenueCat native module not available, using database status");
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
            setIsPro(user.subscriptionTier === "pro");
            setIsLoading(false);
            return;
          }
        }

        try {
          const customerInfo = await RC.getCustomerInfo();
          const hasPro = checkEntitlements(customerInfo);
          if (!hasPro && user.subscriptionTier === "pro") {
            await syncSubscriptionToServer(false);
          } else if (hasPro && user.subscriptionTier !== "pro") {
            console.log("RevenueCat reports pro but server says free — user should restore purchases");
          }
        } catch (infoError: any) {
          console.warn("RevenueCat getCustomerInfo error:", infoError);
          setIsPro(user.subscriptionTier === "pro");
        }

        await loadOfferings();

        try {
          RC.addCustomerInfoUpdateListener((info) => {
            const updatedPro = checkEntitlements(info);
            if (!updatedPro) {
              syncSubscriptionToServer(false);
            }
          });
        } catch (listenerError: any) {
          console.warn("RevenueCat listener error:", listenerError);
        }
      } catch (error) {
        console.warn("Subscription init error:", error);
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
