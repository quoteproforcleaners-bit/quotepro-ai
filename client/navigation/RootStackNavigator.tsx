import React, { useEffect, useRef } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import OnboardingNavigator from "@/navigation/OnboardingNavigator";
import QuoteCalculatorScreen from "@/screens/QuoteCalculatorScreen";
import QuoteDetailScreen from "@/screens/QuoteDetailScreen";
import CustomerDetailScreen from "@/screens/CustomerDetailScreen";
import PricingScreen from "@/screens/PricingScreen";
import PaywallScreen from "@/screens/PaywallScreen";
import JobDetailScreen from "@/screens/JobDetailScreen";
import AIAssistantScreen from "@/screens/AIAssistantScreen";
import FollowUpQueueScreen from "@/screens/FollowUpQueueScreen";
import WeeklyRecapScreen from "@/screens/WeeklyRecapScreen";
import OpportunitiesScreen from "@/screens/OpportunitiesScreen";
import TasksQueueScreen from "@/screens/TasksQueueScreen";
import ReviewsReferralsScreen from "@/screens/ReviewsReferralsScreen";
import UpsellOpportunitiesScreen from "@/screens/UpsellOpportunitiesScreen";
import ReactivationScreen from "@/screens/ReactivationScreen";
import AutomationsHubScreen from "@/screens/AutomationsHubScreen";
import AutomationsIntegrationsScreen from "@/screens/AutomationsIntegrationsScreen";
import SalesStrategyScreen from "@/screens/SalesStrategyScreen";
import QuotePreferencesScreen from "@/screens/QuotePreferencesScreen";
import HelpGuideScreen from "@/screens/HelpGuideScreen";
import AvatarBuilderScreen from "@/screens/AvatarBuilderScreen";
import CommercialQuoteCalculatorScreen from "@/screens/CommercialQuoteCalculatorScreen";
import ProSetupChecklistScreen from "@/screens/ProSetupChecklistScreen";
import LoginScreen from "@/screens/auth/LoginScreen";
import LandingScreen from "@/screens/LandingScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/context/AuthContext";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/hooks/useTheme";
import { pendingPostOnboardingPaywall, clearPendingPaywall } from "@/navigation/OnboardingNavigator";

export type RootStackParamList = {
  Landing: undefined;
  Login: undefined;
  GuestQuoteCalculator: undefined;
  Onboarding: undefined;
  Main: undefined;
  QuoteCalculator: { prefillCustomer?: { name: string; phone: string; email: string; address: string; customerId: string }; editQuoteId?: string; editQuoteData?: any } | undefined;
  QuoteDetail: { quoteId: string };
  CustomerDetail: { customerId: string };
  JobDetail: { jobId: string };
  PricingSettings: undefined;
  Paywall: { trigger_source?: string } | undefined;
  AIAssistant: undefined;
  FollowUpQueue: undefined;
  WeeklyRecap: undefined;
  Opportunities: undefined;
  TasksQueue: undefined;
  ReviewsReferrals: undefined;
  UpsellOpportunities: undefined;
  ReactivationCampaigns: undefined;
  AutomationsHub: undefined;
  AutomationsIntegrations: undefined;
  SalesStrategy: undefined;
  QuotePreferences: undefined;
  HelpGuide: undefined;
  AvatarBuilder: undefined;
  ProSetupChecklist: undefined;
  CommercialQuote: { customerName?: string; customerAddress?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function PostOnboardingPaywallTrigger() {
  const navigation = useNavigation<any>();
  const triggered = useRef(false);

  useEffect(() => {
    if (pendingPostOnboardingPaywall && !triggered.current) {
      triggered.current = true;
      clearPendingPaywall();
      const timer = setTimeout(() => {
        try {
          navigation.navigate("Paywall", { trigger_source: "after_demo" });
        } catch {}
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [navigation]);

  return null;
}

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isLoading: authLoading, user, isGuest, needsOnboarding: authNeedsOnboarding } = useAuth();
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
        <>
          <Stack.Screen
            name="Landing"
            component={LandingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="GuestQuoteCalculator"
            component={QuoteCalculatorScreen}
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
              headerShown: false,
            }}
          />
        </>
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
            options={{ headerShown: false }}
          >
            {() => (
              <>
                <PostOnboardingPaywallTrigger />
                <MainTabNavigator />
              </>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="QuoteCalculator"
            component={QuoteCalculatorScreen}
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="CommercialQuote"
            component={CommercialQuoteCalculatorScreen}
            options={{
              animation: "slide_from_right",
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
            name="JobDetail"
            component={JobDetailScreen}
            options={{
              headerTitle: "Job Details",
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
              animation: "slide_from_bottom",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="AIAssistant"
            component={AIAssistantScreen}
            options={{
              headerTitle: "AI Sales Assistant",
            }}
          />
          <Stack.Screen
            name="FollowUpQueue"
            component={FollowUpQueueScreen}
            options={{
              headerTitle: "Follow-Up Queue",
            }}
          />
          <Stack.Screen
            name="WeeklyRecap"
            component={WeeklyRecapScreen}
            options={{
              headerTitle: "Weekly Recap",
            }}
          />
          <Stack.Screen
            name="Opportunities"
            component={OpportunitiesScreen}
            options={{
              headerTitle: "Opportunities",
            }}
          />
          <Stack.Screen
            name="TasksQueue"
            component={TasksQueueScreen}
            options={{
              headerTitle: "Growth Tasks",
            }}
          />
          <Stack.Screen
            name="ReviewsReferrals"
            component={ReviewsReferralsScreen}
            options={{
              headerTitle: "Reviews & Referrals",
            }}
          />
          <Stack.Screen
            name="UpsellOpportunities"
            component={UpsellOpportunitiesScreen}
            options={{
              headerTitle: "Upsell Opportunities",
            }}
          />
          <Stack.Screen
            name="ReactivationCampaigns"
            component={ReactivationScreen}
            options={{
              headerTitle: "Reactivation",
            }}
          />
          <Stack.Screen
            name="AutomationsHub"
            component={AutomationsHubScreen}
            options={{
              headerTitle: "Automations",
            }}
          />
          <Stack.Screen
            name="AutomationsIntegrations"
            component={AutomationsIntegrationsScreen}
            options={{
              headerTitle: "API & Webhooks",
            }}
          />
          <Stack.Screen
            name="SalesStrategy"
            component={SalesStrategyScreen}
            options={{
              headerTitle: "Sales Strategy",
            }}
          />
          <Stack.Screen
            name="QuotePreferences"
            component={QuotePreferencesScreen}
            options={{
              headerTitle: "Quote Preferences",
            }}
          />
          <Stack.Screen
            name="HelpGuide"
            component={HelpGuideScreen}
            options={{
              headerTitle: "Help & Guide",
            }}
          />
          <Stack.Screen
            name="AvatarBuilder"
            component={AvatarBuilderScreen}
            options={{
              headerTitle: "Profile Avatar",
            }}
          />
          <Stack.Screen
            name="ProSetupChecklist"
            component={ProSetupChecklistScreen}
            options={{
              headerShown: false,
              animation: "slide_from_bottom",
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
