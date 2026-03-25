import React, { useCallback, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useApp } from "@/context/AppContext";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { markCompleted } from "@/lib/onboardingStore";
import { cancelOnboardingNudge } from "@/lib/notifications";
import { trackEvent } from "@/lib/analytics";
import OnboardingBusinessScreen from "@/screens/onboarding/OnboardingBusinessScreen";
import OnboardingPricingScreen from "@/screens/onboarding/OnboardingPricingScreen";
import FirstQuoteScreen from "@/screens/onboarding/FirstQuoteScreen";

export let pendingPostOnboardingPaywall = false;
export function clearPendingPaywall() {
  pendingPostOnboardingPaywall = false;
}

export type OnboardingStackParamList = {
  OnboardingBusiness: undefined;
  OnboardingPricing: undefined;
  FirstQuote: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  const { pricingSettings, completeOnboarding } = useApp();
  const screenOptions = useScreenOptions();

  const handleFirstQuoteComplete = useCallback(async (quoteDetails: { total: number; tierName: string; homeDetails: any; tiers: any }) => {
    trackEvent("first_quote_completed", { total: quoteDetails.total, tierName: quoteDetails.tierName });
    await markCompleted();
    cancelOnboardingNudge();
    trackEvent("onboarding_completed");
    pendingPostOnboardingPaywall = true;
    await completeOnboarding();
  }, [completeOnboarding]);

  return (
    <Stack.Navigator
      screenOptions={{
        ...screenOptions,
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="OnboardingBusiness">
        {({ navigation }) => (
          <OnboardingBusinessScreen
            onNext={(data) => {
              trackEvent("onboarding_business_step", { hasLogo: !!data.logoUri });
              navigation.navigate("OnboardingPricing");
            }}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="OnboardingPricing">
        {({ navigation }) => (
          <OnboardingPricingScreen
            onNext={(minimumTicket) => {
              trackEvent("onboarding_pricing_step", { minimumTicket });
              navigation.navigate("FirstQuote");
            }}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>

      <Stack.Screen name="FirstQuote">
        {() => (
          <FirstQuoteScreen
            pricingSettings={pricingSettings}
            onComplete={handleFirstQuoteComplete}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
