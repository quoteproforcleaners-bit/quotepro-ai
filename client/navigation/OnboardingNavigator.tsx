import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BusinessProfileScreen from "@/screens/onboarding/BusinessProfileScreen";
import PricingSetupScreen from "@/screens/onboarding/PricingSetupScreen";
import { useApp } from "@/context/AppContext";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type OnboardingStackParamList = {
  OnboardingProfile: undefined;
  OnboardingPricing: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  const {
    businessProfile,
    pricingSettings,
    updateBusinessProfile,
    updatePricingSettings,
    completeOnboarding,
  } = useApp();
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator
      screenOptions={{
        ...screenOptions,
        headerShown: false,
      }}
    >
      <Stack.Screen name="OnboardingProfile">
        {(props) => (
          <BusinessProfileScreen
            {...props}
            profile={businessProfile}
            onUpdate={updateBusinessProfile}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="OnboardingPricing">
        {(props) => (
          <PricingSetupScreen
            {...props}
            settings={pricingSettings}
            onUpdate={updatePricingSettings}
            onComplete={completeOnboarding}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
