import React, { useState, useCallback, useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WelcomeScreen from "@/screens/onboarding/WelcomeScreen";
import GoalPickerScreen from "@/screens/onboarding/GoalPickerScreen";
import BusinessBasicsScreen from "@/screens/onboarding/BusinessBasicsScreen";
import QuickQuoteScreen from "@/screens/onboarding/QuickQuoteScreen";
import QuoteRevealScreen from "@/screens/onboarding/QuoteRevealScreen";
import SendQuoteScreen from "@/screens/onboarding/SendQuoteScreen";
import FollowUpSetupScreen from "@/screens/onboarding/FollowUpSetupScreen";
import SuccessScreen from "@/screens/onboarding/SuccessScreen";
import { useApp } from "@/context/AppContext";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import {
  setOnboardingStatus,
  markCompleted,
  markSkipped,
} from "@/lib/onboardingStore";
import {
  calculateAllOptions,
  getServiceTypeById,
} from "@/lib/quoteCalculator";
import { apiRequest } from "@/lib/query-client";
import { HomeDetails, AddOns, DEFAULT_PRICING_SETTINGS } from "@/types";
import {
  scheduleOnboardingNudge,
  cancelOnboardingNudge,
  scheduleFirstWinCelebration,
} from "@/lib/notifications";
import { trackEvent } from "@/lib/analytics";

export type OnboardingStackParamList = {
  Welcome: undefined;
  GoalPicker: undefined;
  BusinessBasics: undefined;
  QuickQuote: undefined;
  QuoteReveal: undefined;
  SendQuote: undefined;
  FollowUpSetup: undefined;
  Success: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  const {
    businessProfile,
    pricingSettings,
    updateBusinessProfile,
    completeOnboarding,
  } = useApp();
  const screenOptions = useScreenOptions();

  const [goal, setGoal] = useState("send_quote");
  const [bizName, setBizName] = useState(businessProfile.companyName || "");
  const [logoUri, setLogoUri] = useState<string | null>(businessProfile.logoUri);
  const [quoteInput, setQuoteInput] = useState<any>(null);
  const [tiers, setTiers] = useState<any>(null);
  const [selectedTier, setSelectedTier] = useState("better");
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [sentQuote, setSentQuote] = useState(false);
  const [followupsEnabled, setFollowupsEnabled] = useState(false);

  const handleSkipAll = useCallback(async (navigation: any) => {
    await markSkipped();
    scheduleOnboardingNudge();
    trackEvent("onboarding_skipped");
    await completeOnboarding();
  }, [completeOnboarding]);

  const handleGoalNext = useCallback(async (selectedGoal: string, navigation: any) => {
    setGoal(selectedGoal);
    await setOnboardingStatus({ primaryGoal: selectedGoal, startedAt: new Date().toISOString(), currentStep: 1 });
    trackEvent("onboarding_goal_selected", { goal: selectedGoal });
    navigation.navigate("BusinessBasics");
  }, []);

  const handleBasicsNext = useCallback(async (data: { businessName: string; zipCode: string; logoUri: string | null }, navigation: any) => {
    setBizName(data.businessName);
    setLogoUri(data.logoUri);
    await updateBusinessProfile({ companyName: data.businessName, logoUri: data.logoUri });
    await setOnboardingStatus({ businessName: data.businessName, zipCode: data.zipCode, logoUri: data.logoUri, currentStep: 2 });
    trackEvent("onboarding_business_saved");
    navigation.navigate("QuickQuote");
  }, [updateBusinessProfile]);

  const handleQuoteGenerated = useCallback(async (input: any, navigation: any) => {
    setQuoteInput(input);
    const conditionScore = input.condition === "maintained" ? 8 : 4;
    const homeDetails: HomeDetails = {
      sqft: input.sqft,
      beds: input.beds,
      baths: input.baths,
      halfBaths: 0,
      conditionScore,
      peopleCount: 2,
      petType: "none",
      petShedding: false,
    };
    const emptyAddOns: AddOns = {
      insideFridge: false, insideOven: false, insideCabinets: false,
      interiorWindows: false, blindsDetail: false, baseboardsDetail: false,
      laundryFoldOnly: false, dishes: false, organizationTidy: false,
      biannualDeepClean: false,
    };
    const settings = pricingSettings || DEFAULT_PRICING_SETTINGS;
    const options = calculateAllOptions(homeDetails, emptyAddOns, input.frequency as any, settings, true);
    setTiers(options);
    await setOnboardingStatus({ quoteDraft: { homeDetails, options }, currentStep: 3 });
    trackEvent("onboarding_quote_created", { serviceType: input.serviceType, sqft: input.sqft });
    navigation.navigate("QuoteReveal");
  }, [pricingSettings]);

  const handleTierSelected = useCallback(async (tier: string, addOns: string[], navigation: any) => {
    setSelectedTier(tier);
    setSelectedAddOns(addOns);
    await setOnboardingStatus({ selectedTier: tier, selectedAddOns: addOns, currentStep: 4 });
    navigation.navigate("SendQuote");
  }, []);

  const handleSendQuote = useCallback(async (contact: { name: string; email: string; phone: string }, navigation: any) => {
    try {
      const tierData = selectedTier === "good" ? tiers.good : selectedTier === "best" ? tiers.best : tiers.better;

      let customerId: string | undefined;
      try {
        const custRes = await apiRequest("POST", "/api/customers", {
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          address: "",
        });
        const cust = await custRes.json();
        customerId = cust.id;
      } catch {}

      try {
        await apiRequest("POST", "/api/quotes", {
          customerId,
          customerName: contact.name,
          customerEmail: contact.email,
          customerPhone: contact.phone,
          homeDetails: quoteInput,
          options: [
            { name: "Good", ...tiers.good },
            { name: "Better", ...tiers.better },
            { name: "Best", ...tiers.best },
          ],
          selectedOption: selectedTier,
          status: "sent",
          frequency: quoteInput?.frequency || "one-time",
        });
      } catch {}

      setSentQuote(true);
      await setOnboardingStatus({ sentQuote: true, ownerContact: { email: contact.email, phone: contact.phone }, currentStep: 5 });
      cancelOnboardingNudge();
      scheduleFirstWinCelebration();
      trackEvent("onboarding_quote_sent", { tier: selectedTier });
    } catch {}

    navigation.navigate("FollowUpSetup");
  }, [selectedTier, tiers, quoteInput]);

  const handleFollowUpNext = useCallback(async (data: { cadence: string; tone: string }, navigation: any) => {
    setFollowupsEnabled(true);
    await setOnboardingStatus({ followupsEnabled: true, cadencePreset: data.cadence as any, tone: data.tone as any, currentStep: 6 });
    trackEvent("onboarding_followup_configured", { cadence: data.cadence, tone: data.tone });
    navigation.navigate("Success");
  }, []);

  const handleFinish = useCallback(async () => {
    await markCompleted();
    cancelOnboardingNudge();
    trackEvent("onboarding_completed");
    await completeOnboarding();
  }, [completeOnboarding]);

  const currentBizName = bizName || businessProfile.companyName || "My Cleaning Co";

  const currentTierPrice = useMemo(() => {
    if (!tiers) return 0;
    const t = selectedTier === "good" ? tiers.good : selectedTier === "best" ? tiers.best : tiers.better;
    return t?.price || 0;
  }, [tiers, selectedTier]);

  const currentTierName = useMemo(() => {
    if (!tiers) return "";
    const t = selectedTier === "good" ? tiers.good : selectedTier === "best" ? tiers.best : tiers.better;
    return t?.serviceTypeName || t?.name || "Standard";
  }, [tiers, selectedTier]);

  return (
    <Stack.Navigator
      screenOptions={{
        ...screenOptions,
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Welcome">
        {({ navigation }) => (
          <WelcomeScreen
            onStart={() => { trackEvent("onboarding_started"); navigation.navigate("GoalPicker"); }}
            onSkip={() => handleSkipAll(navigation)}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="GoalPicker">
        {({ navigation }) => (
          <GoalPickerScreen
            onNext={(g) => handleGoalNext(g, navigation)}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="BusinessBasics">
        {({ navigation }) => (
          <BusinessBasicsScreen
            initialName={currentBizName}
            onNext={(d) => handleBasicsNext(d, navigation)}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="QuickQuote">
        {({ navigation }) => (
          <QuickQuoteScreen
            goal={goal}
            onNext={(input) => handleQuoteGenerated(input, navigation)}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="QuoteReveal">
        {({ navigation }) => (
          tiers ? (
            <QuoteRevealScreen
              tiers={tiers}
              frequency={quoteInput?.frequency || "one-time"}
              goal={goal}
              onNext={(tier, addOns) => handleTierSelected(tier, addOns, navigation)}
              onBack={() => navigation.goBack()}
            />
          ) : null
        )}
      </Stack.Screen>
      <Stack.Screen name="SendQuote">
        {({ navigation }) => (
          <SendQuoteScreen
            selectedTierPrice={currentTierPrice}
            selectedTierName={currentTierName}
            businessName={currentBizName}
            goal={goal}
            onSend={(contact) => handleSendQuote(contact, navigation)}
            onSkip={() => {
              setOnboardingStatus({ currentStep: 5 });
              navigation.navigate("FollowUpSetup");
            }}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="FollowUpSetup">
        {({ navigation }) => (
          <FollowUpSetupScreen
            onNext={(d) => handleFollowUpNext(d, navigation)}
            onSkip={() => {
              setOnboardingStatus({ currentStep: 6 });
              navigation.navigate("Success");
            }}
            onBack={() => navigation.goBack()}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="Success">
        {() => (
          <SuccessScreen
            sentQuote={sentQuote}
            followupsEnabled={followupsEnabled}
            businessName={currentBizName}
            goal={goal}
            onFinish={handleFinish}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
