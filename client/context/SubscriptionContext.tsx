import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Platform } from "react-native";
import Purchases, { PurchasesOffering, CustomerInfo } from "react-native-purchases";
import Constants from "expo-constants";
import { useAuth } from "@/context/AuthContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useQueryClient } from "@tanstack/react-query";

function isExpoGo(): boolean {
  return Constants.executionEnvironment === "storeClient";
}

interface SubscriptionContextType {
  isPro: boolean;
  isLoading: boolean;
  currentOffering: PurchasesOffering | null;
  purchase: () => Promise<boolean>;
  restore: () => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const ENTITLEMENT_ID = "pro";

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [revenueCatReady, setRevenueCatReady] = useState(false);

  const checkEntitlements = useCallback((customerInfo: CustomerInfo) => {
    const hasEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    setIsPro(hasEntitlement);
    return hasEntitlement;
  }, []);

  const syncSubscriptionToServer = useCallback(async (hasPro: boolean) => {
    try {
      await apiRequest("POST", "/api/subscription/sync", {
        tier: hasPro ? "pro" : "free",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (error) {
      console.error("Failed to sync subscription:", error);
    }
  }, [queryClient]);

  useEffect(() => {
    const initRevenueCat = async () => {
      if (!user) {
        setIsLoading(false);
        setIsPro(false);
        return;
      }

      try {
        if (Platform.OS === "web" || isExpoGo()) {
          console.log(isExpoGo() ? "Expo Go app detected. Using RevenueCat in Browser Mode." : "Web platform detected. Using RevenueCat in Browser Mode.");
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

        if (apiKey) {
          try {
            Purchases.configure({ apiKey, appUserID: user.id });
            setRevenueCatReady(true);
          } catch (configError: any) {
            console.warn("RevenueCat configure error:", configError);
            setIsPro(user.subscriptionTier === "pro");
            return;
          }

          try {
            const customerInfo = await Purchases.getCustomerInfo();
            const hasPro = checkEntitlements(customerInfo);
            await syncSubscriptionToServer(hasPro);
          } catch (infoError: any) {
            console.warn("RevenueCat getCustomerInfo error:", infoError);
            setIsPro(user.subscriptionTier === "pro");
          }

          try {
            const offerings = await Purchases.getOfferings();
            if (offerings.current) {
              setCurrentOffering(offerings.current);
            }
          } catch (offerError: any) {
            console.warn("RevenueCat getOfferings error:", offerError);
          }

          try {
            Purchases.addCustomerInfoUpdateListener((info) => {
              const updatedPro = checkEntitlements(info);
              syncSubscriptionToServer(updatedPro);
            });
          } catch (listenerError: any) {
            console.warn("RevenueCat listener error:", listenerError);
          }
        } else {
          setIsPro(user.subscriptionTier === "pro");
        }
      } catch (error) {
        console.warn("Subscription init error:", error);
        setIsPro(user.subscriptionTier === "pro");
      } finally {
        setIsLoading(false);
      }
    };

    initRevenueCat();
  }, [user, checkEntitlements, syncSubscriptionToServer]);

  const purchase = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === "web" || !revenueCatReady) {
        await apiRequest("POST", "/api/subscription/upgrade");
        setIsPro(true);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        return true;
      }

      if (!currentOffering?.monthly) {
        console.error("No monthly package available");
        return false;
      }

      const { customerInfo } = await Purchases.purchasePackage(currentOffering.monthly);
      const hasPro = checkEntitlements(customerInfo);
      await syncSubscriptionToServer(hasPro);
      return hasPro;
    } catch (error: any) {
      if (error.userCancelled) {
        return false;
      }
      console.error("Purchase error:", error);
      throw error;
    }
  }, [currentOffering, revenueCatReady, checkEntitlements, syncSubscriptionToServer, queryClient]);

  const restore = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === "web" || !revenueCatReady) {
        return false;
      }

      const customerInfo = await Purchases.restorePurchases();
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
        purchase,
        restore,
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
