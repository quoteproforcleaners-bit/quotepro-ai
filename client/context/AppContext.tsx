import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  BusinessProfile,
  PricingSettings,
  DEFAULT_BUSINESS_PROFILE,
  DEFAULT_PRICING_SETTINGS,
} from "@/types";
import {
  getBusinessProfile,
  saveBusinessProfile,
  getPricingSettings,
  savePricingSettings,
} from "@/lib/storage";

interface AppContextType {
  isLoading: boolean;
  needsOnboarding: boolean;
  businessProfile: BusinessProfile;
  pricingSettings: PricingSettings;
  updateBusinessProfile: (profile: BusinessProfile) => Promise<void>;
  updatePricingSettings: (settings: PricingSettings) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({
    ...DEFAULT_BUSINESS_PROFILE,
    id: uuidv4(),
  });
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(
    DEFAULT_PRICING_SETTINGS
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profile, pricing] = await Promise.all([
        getBusinessProfile(),
        getPricingSettings(),
      ]);
      setBusinessProfile(profile);
      setPricingSettings(pricing);
    } catch (error) {
      console.error("Error loading app data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateBusinessProfile = async (profile: BusinessProfile) => {
    setBusinessProfile(profile);
    await saveBusinessProfile(profile);
  };

  const updatePricingSettings = async (settings: PricingSettings) => {
    setPricingSettings(settings);
    await savePricingSettings(settings);
  };

  const completeOnboarding = async () => {
    const updatedProfile = { ...businessProfile, onboardingComplete: true };
    setBusinessProfile(updatedProfile);
    await saveBusinessProfile(updatedProfile);
  };

  const needsOnboarding = !businessProfile.onboardingComplete;

  return (
    <AppContext.Provider
      value={{
        isLoading,
        needsOnboarding,
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
