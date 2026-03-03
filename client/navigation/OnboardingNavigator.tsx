import React, { useCallback } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import GoalPickerScreen from "@/screens/onboarding/GoalPickerScreen";
import BusinessBasicsScreen from "@/screens/onboarding/BusinessBasicsScreen";
import QuickQuoteScreen from "@/screens/onboarding/QuickQuoteScreen";
import { useApp } from "@/context/AppContext";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import {
  setOnboardingStatus,
  markCompleted,
  markSkipped,
} from "@/lib/onboardingStore";
import {
  scheduleOnboardingNudge,
  cancelOnboardingNudge,
} from "@/lib/notifications";
import { trackEvent } from "@/lib/analytics";

export let pendingPostOnboardingPaywall = false;
export function clearPendingPaywall() {
  pendingPostOnboardingPaywall = false;
}

export type OnboardingStackParamList = {
  GoalPicker: undefined;
  BusinessBasics: undefined;
  DemoQuote: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  const {
    pricingSettings,
    updatePricingSettings,
    completeOnboarding,
  } = useApp();
  const screenOptions = useScreenOptions();

  const handleSkipAll = useCallback(async () => {
    await markSkipped();
    scheduleOnboardingNudge();
    trackEvent("onboarding_skipped");
    await completeOnboarding();
  }, [completeOnboarding]);

  const handleGoalNext = useCallback(async (goals: string[], navigation: any) => {
    await setOnboardingStatus({ primaryGoal: goals.join(","), startedAt: new Date().toISOString(), currentStep: 1 });
    trackEvent("onboarding_started");
    trackEvent("onboarding_goal_selected", { goals });
    navigation.navigate("BusinessBasics");
  }, []);

  const handleBasicsNext = useCallback(async (data: { businessType: string; hourlyTarget: number; minJobPrice: number; autoUpsells: boolean }, navigation: any) => {
    const updatedSettings = {
      ...pricingSettings,
      hourlyRate: data.hourlyTarget,
      minimumTicket: data.minJobPrice,
    };
    await updatePricingSettings(updatedSettings);
    await setOnboardingStatus({ currentStep: 2 });
    trackEvent("onboarding_business_saved", { businessType: data.businessType, hourlyTarget: data.hourlyTarget, minJobPrice: data.minJobPrice, autoUpsells: data.autoUpsells });
    navigation.navigate("DemoQuote");
  }, [pricingSettings, updatePricingSettings]);

  const handleDemoComplete = useCallback(async (quoteDetails: { total: number; tierName: string; homeDetails: any; tiers: any }, navigation: any) => {
    trackEvent("demo_quote_started");
    trackEvent("demo_quote_completed", { total: quoteDetails.total, tierName: quoteDetails.tierName });
    await setOnboardingStatus({ currentStep: 3, quoteDraft: quoteDetails });
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
      <Stack.Screen name="GoalPicker">
        {({ navigation }) => (
          <GoalPickerScreen
            onNext={(goals) => handleGoalNext(goals, navigation)}
            onSkip={handleSkipAll}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="BusinessBasics">
        {({ navigation }) => (
          <BusinessBasicsScreen
            onNext={(d) => handleBasicsNext(d, navigation)}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="DemoQuote">
        {({ navigation }) => (
          <QuickQuoteScreen
            pricingSettings={pricingSettings}
            onComplete={(details) => handleDemoComplete(details, navigation)}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
