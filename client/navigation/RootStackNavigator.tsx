import React, { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
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
import JobsScreen from "@/screens/JobsScreen";
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
import QBOSettingsScreen from "@/screens/QBOSettingsScreen";
import QBOLogsScreen from "@/screens/QBOLogsScreen";
import IntakeQueueScreen from "@/screens/IntakeQueueScreen";
import WalkthroughAIScreen from "@/screens/WalkthroughAIScreen";
import WalkthroughResultsScreen from "@/screens/WalkthroughResultsScreen";
import WalkthroughEditScreen from "@/screens/WalkthroughEditScreen";
import ClosingAssistantScreen from "@/screens/ClosingAssistantScreen";
import LeadFinderScreen from "@/screens/LeadFinderScreen";
import LeadFinderDetailScreen from "@/screens/LeadFinderDetailScreen";
import LeadFinderSettingsScreen from "@/screens/LeadFinderSettingsScreen";
import LeadCaptureSettingsScreen from "@/screens/LeadCaptureSettingsScreen";
import AIAgentIntroScreen from "@/screens/AIAgentIntroScreen";
import NPSSurveyModal from "@/screens/NPSSurveyModal";

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
  AllJobs: undefined;
  QuoteCalculator: { prefillCustomer?: { name: string; phone: string; email: string; address: string; customerId: string }; editQuoteId?: string; editQuoteData?: any } | undefined;
  QuoteDetail: { quoteId: string };
  CustomerDetail: { customerId: string };
  JobDetail: { jobId: string };
  PricingSettings: undefined;
  Paywall: { trigger_source?: string; required_tier?: string } | undefined;
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
  QBOSettings: undefined;
  QBOLogs: undefined;
  IntakeQueue: undefined;
  WalkthroughAI: undefined;
  WalkthroughResults: { extractedFields: any; assumptions: string[]; confidence: string; description: string };
  WalkthroughEdit: { extractedFields: any; assumptions: string[]; confidence: string; description: string };
  ClosingAssistant: { quoteAmount?: number; serviceType?: string; frequency?: string; addOns?: string[]; customerName?: string; notes?: string; pricingSummary?: string } | undefined;
  LeadFinder: undefined;
  LeadFinderDetail: { leadId: string };
  LeadFinderSettings: undefined;
  LeadCaptureSettings: undefined;
  AIAgentIntro: undefined;

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

function NPSSurveyTrigger() {
  const { user } = useAuth();
  const [showNPS, setShowNPS] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!user || checkedRef.current) return;
    checkedRef.current = true;
    // Wait 5s after mount to avoid jarring the user
    const timer = setTimeout(async () => {
      try {
        const { apiRequest } = await import("@/lib/query-client");
        const data: any = await apiRequest("GET", "/api/nps/status");
        if (data?.shouldShow) {
          setShowNPS(true);
        }
      } catch {
        // Non-fatal
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [user]);

  return (
    <NPSSurveyModal visible={showNPS} onClose={() => setShowNPS(false)} />
  );
}

function PostOnboardingAIIntroTrigger() {
  const navigation = useNavigation<any>();
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    AsyncStorage.getItem("ai_intro_shown").then((val) => {
      if (!val && !triggered.current) {
        triggered.current = true;
        const timer = setTimeout(() => {
          try {
            navigation.navigate("AIAgentIntro");
          } catch {}
        }, 800);
        return () => clearTimeout(timer);
      }
    });
  }, [navigation]);

  return null;
}

function NotificationTapHandler() {
  const navigation = useNavigation<any>();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response.notification.request.content.data ?? {}) as Record<string, any>;
      if (!data.screen) return;
      try {
        switch (data.screen) {
          case "QuoteCalculator":
            navigation.navigate("QuoteCalculator");
            break;
          case "FollowUpQueue":
            navigation.navigate("Main", { screen: "Growth" });
            break;
          case "Opportunities":
            navigation.navigate("Main", { screen: "Growth" });
            break;
          case "JobDetail":
            if (data.jobId) navigation.navigate("JobDetail", { jobId: data.jobId });
            break;
          default:
            break;
        }
      } catch {}
    });
    return () => sub.remove();
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
              presentation: "fullScreenModal",
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
                <PostOnboardingAIIntroTrigger />
                <NPSSurveyTrigger />
                <NotificationTapHandler />
                <MainTabNavigator />
              </>
            )}
          </Stack.Screen>
          <Stack.Screen
            name="QuoteCalculator"
            component={QuoteCalculatorScreen}
            options={{
              presentation: "fullScreenModal",
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
            name="AllJobs"
            component={JobsScreen}
            options={{
              headerTitle: "All Jobs",
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
              presentation: "fullScreenModal",
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
              headerTitle: "Win-Back Opportunities",
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
              headerTitle: "Campaigns",
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
          <Stack.Screen
            name="QBOSettings"
            component={QBOSettingsScreen}
            options={{
              headerTitle: "QuickBooks",
            }}
          />
          <Stack.Screen
            name="QBOLogs"
            component={QBOLogsScreen}
            options={{
              headerTitle: "Sync History",
            }}
          />
          <Stack.Screen
            name="IntakeQueue"
            component={IntakeQueueScreen}
            options={{
              headerTitle: "Quote Requests",
            }}
          />
          <Stack.Screen
            name="WalkthroughAI"
            component={WalkthroughAIScreen}
            options={{
              headerTitle: "Walkthrough AI",
            }}
          />
          <Stack.Screen
            name="WalkthroughResults"
            component={WalkthroughResultsScreen}
            options={{
              headerTitle: "Quote Results",
            }}
          />
          <Stack.Screen
            name="WalkthroughEdit"
            component={WalkthroughEditScreen}
            options={{
              headerTitle: "Edit Details",
            }}
          />
          <Stack.Screen
            name="ClosingAssistant"
            component={ClosingAssistantScreen}
            options={{
              headerTitle: "Objection Assistant",
            }}
          />
          <Stack.Screen
            name="LeadFinder"
            component={LeadFinderScreen}
            options={{
              headerTitle: "Local Lead Finder",
            }}
          />
          <Stack.Screen
            name="LeadFinderDetail"
            component={LeadFinderDetailScreen}
            options={{
              headerTitle: "Lead Detail",
            }}
          />
          <Stack.Screen
            name="LeadFinderSettings"
            component={LeadFinderSettingsScreen}
            options={{
              headerTitle: "Lead Finder Settings",
            }}
          />
          <Stack.Screen
            name="LeadCaptureSettings"
            component={LeadCaptureSettingsScreen}
            options={{
              headerTitle: "Lead Capture Link",
            }}
          />
          <Stack.Screen
            name="AIAgentIntro"
            options={{
              presentation: "fullScreenModal",
              animation: "slide_from_bottom",
              headerShown: false,
            }}
          >
            {({ navigation }) => (
              <AIAgentIntroScreen
                onDone={() => {
                  AsyncStorage.setItem("ai_intro_shown", "true").catch(() => {});
                  navigation.goBack();
                }}
              />
            )}
          </Stack.Screen>
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
