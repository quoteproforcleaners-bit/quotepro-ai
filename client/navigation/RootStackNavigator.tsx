import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import OnboardingNavigator from "@/navigation/OnboardingNavigator";
import QuoteCalculatorScreen from "@/screens/QuoteCalculatorScreen";
import QuoteDetailScreen from "@/screens/QuoteDetailScreen";
import CustomerDetailScreen from "@/screens/CustomerDetailScreen";
import PricingScreen from "@/screens/PricingScreen";
import PaywallScreen from "@/screens/PaywallScreen";
import LoginScreen from "@/screens/auth/LoginScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";

export type RootStackParamList = {
  Login: undefined;
  Onboarding: undefined;
  Main: undefined;
  QuoteCalculator: undefined;
  QuoteDetail: { quoteId: string };
  CustomerDetail: { customerId: string };
  PricingSettings: undefined;
  Paywall: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isLoading: authLoading, user, needsOnboarding: authNeedsOnboarding } = useAuth();
  const { isLoading: appLoading, needsOnboarding: appNeedsOnboarding } = useApp();
  const { theme } = useTheme();

  if (authLoading || (user && appLoading)) {
    return (
      <View
        style={[styles.loading, { backgroundColor: theme.backgroundRoot }]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const showOnboarding = user && (authNeedsOnboarding || appNeedsOnboarding);

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!user ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : showOnboarding ? (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingNavigator}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="QuoteCalculator"
            component={QuoteCalculatorScreen}
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="QuoteDetail"
            component={QuoteDetailScreen}
            options={{
              headerTitle: "Quote Details",
            }}
          />
          <Stack.Screen
            name="CustomerDetail"
            component={CustomerDetailScreen}
            options={{
              headerTitle: "Customer",
            }}
          />
          <Stack.Screen
            name="PricingSettings"
            component={PricingScreen}
            options={{
              headerTitle: "Pricing & Services",
            }}
          />
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
