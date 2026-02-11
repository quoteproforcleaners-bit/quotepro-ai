import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import {
  BusinessProfile,
  PricingSettings,
  DEFAULT_BUSINESS_PROFILE,
  DEFAULT_PRICING_SETTINGS,
} from "@/types";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/context/AuthContext";

interface AppContextType {
  isLoading: boolean;
  needsOnboarding: boolean;
  businessProfile: BusinessProfile;
  pricingSettings: PricingSettings;
  updateBusinessProfile: (profile: Partial<BusinessProfile>) => Promise<void>;
  updatePricingSettings: (settings: PricingSettings) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, needsOnboarding, setNeedsOnboarding } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(
    DEFAULT_BUSINESS_PROFILE
  );
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(
    DEFAULT_PRICING_SETTINGS
  );

  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const baseUrl = getApiUrl();

      const [bizRes, pricingRes] = await Promise.all([
        fetch(new URL("/api/business", baseUrl), { credentials: "include" }),
        fetch(new URL("/api/pricing", baseUrl), { credentials: "include" }),
      ]);

      if (bizRes.ok) {
        const biz = await bizRes.json();
        setBusinessProfile({
          ...DEFAULT_BUSINESS_PROFILE,
          ...biz,
          onboardingComplete: biz.onboardingComplete ?? false,
        });
      }

      if (pricingRes.ok) {
        const pricing = await pricingRes.json();
        if (pricing) {
          setPricingSettings({
            ...DEFAULT_PRICING_SETTINGS,
            ...pricing,
            addOnPrices: {
              ...DEFAULT_PRICING_SETTINGS.addOnPrices,
              ...(pricing.addOnPrices || {}),
            },
            frequencyDiscounts: {
              ...DEFAULT_PRICING_SETTINGS.frequencyDiscounts,
              ...(pricing.frequencyDiscounts || {}),
            },
            serviceTypes: pricing.serviceTypes?.length > 0
              ? pricing.serviceTypes
              : DEFAULT_PRICING_SETTINGS.serviceTypes,
            goodOptionId: pricing.goodOptionId || DEFAULT_PRICING_SETTINGS.goodOptionId,
            betterOptionId: pricing.betterOptionId || DEFAULT_PRICING_SETTINGS.betterOptionId,
            bestOptionId: pricing.bestOptionId || DEFAULT_PRICING_SETTINGS.bestOptionId,
          });
        }
      }
    } catch (error) {
      console.error("Error loading app data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateBusinessProfile = async (updates: Partial<BusinessProfile>) => {
    const newProfile = { ...businessProfile, ...updates };
    setBusinessProfile(newProfile);

    try {
      const { id, ...rest } = newProfile;
      await apiRequest("PUT", "/api/business", rest);
    } catch (error) {
      console.error("Error saving business profile:", error);
    }
  };

  const updatePricingSettings = async (settings: PricingSettings) => {
    setPricingSettings(settings);

    try {
      await apiRequest("PUT", "/api/pricing", settings);
    } catch (error) {
      console.error("Error saving pricing settings:", error);
    }
  };

  const completeOnboarding = async () => {
    const updatedProfile = { ...businessProfile, onboardingComplete: true };
    setBusinessProfile(updatedProfile);
    setNeedsOnboarding(false);

    try {
      await apiRequest("PUT", "/api/business", { onboardingComplete: true });
    } catch (error) {
      console.error("Error completing onboarding:", error);
    }
  };

  return (
    <AppContext.Provider
      value={{
        isLoading,
        needsOnboarding: needsOnboarding,
        businessProfile,
        pricingSettings,
        updateBusinessProfile,
        updatePricingSettings,
        completeOnboarding,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
