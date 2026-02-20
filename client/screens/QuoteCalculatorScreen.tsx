import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import {
  CustomerInfo,
  HomeDetails,
  AddOns,
  ServiceFrequency,
  PricingSettings,
  BusinessProfile,
  Quote,
  DEFAULT_PRICING_SETTINGS,
  DEFAULT_BUSINESS_PROFILE,
} from "@/types";
import { apiRequest } from "@/lib/query-client";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { calculateAllOptions } from "@/lib/quoteCalculator";
import { saveGuestDraft, loadGuestDraft, clearGuestDraft } from "@/lib/guestDraft";
import AuthGateModal from "@/components/AuthGateModal";
import CustomerInfoScreen from "@/screens/quote/CustomerInfoScreen";
import HomeDetailsScreen from "@/screens/quote/HomeDetailsScreen";
import ServiceAddOnsScreen from "@/screens/quote/ServiceAddOnsScreen";
import QuotePreviewScreen from "@/screens/quote/QuotePreviewScreen";

const STEPS = ["Customer", "Property", "Services", "Quote"];

export default function QuoteCalculatorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { pricingSettings, businessProfile } = useApp();
  const { user, isGuest } = useAuth();
  const queryClient = useQueryClient();
  const routeParams = (route.params as any) || {};
  const prefill = routeParams.prefillCustomer;
  const [currentStep, setCurrentStep] = useState(0);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [pendingAction, setPendingAction] = useState<"save" | "saveAndSend" | null>(null);

  const isGuestMode = !user;

  const [customer, setCustomer] = useState<CustomerInfo>({
    name: prefill?.name || "",
    phone: prefill?.phone || "",
    email: prefill?.email || "",
    address: prefill?.address || "",
    datePreference: "",
  });

  const [homeDetails, setHomeDetails] = useState<HomeDetails>({
    sqft: 0,
    beds: 3,
    baths: 2,
    halfBaths: 0,
    conditionScore: 7,
    peopleCount: 2,
    petType: "none",
    petShedding: false,
    homeType: "house",
    kitchensCount: 1,
  });

  const [frequency, setFrequency] = useState<ServiceFrequency>("one-time");
  const [addOns, setAddOns] = useState<AddOns>({
    insideFridge: false,
    insideOven: false,
    insideCabinets: false,
    interiorWindows: false,
    blindsDetail: false,
    baseboardsDetail: false,
    laundryFoldOnly: false,
    dishes: false,
    organizationTidy: false,
    biannualDeepClean: false,
  });
  const [selectedOption, setSelectedOption] = useState<"good" | "better" | "best">(
    "better"
  );
  const [recommendedOption, setRecommendedOption] = useState<"good" | "better" | "best">(
    "better"
  );

  useEffect(() => {
    if (isGuestMode) {
      loadGuestDraft().then((draft) => {
        if (draft) {
          setCustomer(draft.customer);
          setHomeDetails(draft.homeDetails);
          setAddOns(draft.addOns);
          setFrequency(draft.frequency);
          setSelectedOption(draft.selectedOption);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (isGuestMode && currentStep > 0) {
      saveGuestDraft({ customer, homeDetails, addOns, frequency, selectedOption });
    }
  }, [currentStep, customer, homeDetails, addOns, frequency, selectedOption]);

  const handleNext = () => {
    setCurrentStep((prev) => {
      if (prev < STEPS.length - 1) {
        if (Platform.OS !== "web") {
          Haptics.selectionAsync();
        }
        return prev + 1;
      }
      return prev;
    });
  };

  const handleBack = () => {
    setCurrentStep((prev) => {
      if (prev > 0) {
        if (Platform.OS !== "web") {
          Haptics.selectionAsync();
        }
        return prev - 1;
      }
      return prev;
    });
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleSave = async () => {
    if (isGuestMode) {
      await saveGuestDraft({ customer, homeDetails, addOns, frequency, selectedOption });
      setPendingAction("save");
      setShowAuthGate(true);
      return;
    }

    await performSave();
  };

  const buildQuotePayload = (overrides?: { good?: number; better?: number; best?: number }) => {
    const baseOptions = calculateAllOptions(
      homeDetails,
      addOns,
      frequency,
      pricingSettings,
      true
    );
    const options = overrides ? {
      good: { ...baseOptions.good, price: overrides.good ?? baseOptions.good.price },
      better: { ...baseOptions.better, price: overrides.better ?? baseOptions.better.price },
      best: { ...baseOptions.best, price: overrides.best ?? baseOptions.best.price },
    } : baseOptions;
    const selectedPrice = options[selectedOption]?.price || 0;
    const taxRate = pricingSettings?.taxRate || 0;
    const tax = selectedPrice * (taxRate / 100);
    return {
      propertyBeds: homeDetails.beds,
      propertyBaths: homeDetails.baths + homeDetails.halfBaths * 0.5,
      propertySqft: homeDetails.sqft,
      propertyDetails: {
        conditionScore: homeDetails.conditionScore,
        peopleCount: homeDetails.peopleCount,
        petType: homeDetails.petType,
        petShedding: homeDetails.petShedding,
        homeType: homeDetails.homeType,
        kitchensCount: homeDetails.kitchensCount,
        halfBaths: homeDetails.halfBaths,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        customerAddress: customer.address,
      },
      addOns,
      frequencySelected: frequency,
      selectedOption,
      recommendedOption,
      options,
      subtotal: selectedPrice,
      tax,
      total: selectedPrice + tax,
      status: "draft",
    };
  };

  const performSave = async () => {
    try {
      const payload = buildQuotePayload();
      const res = await apiRequest("POST", "/api/quotes", payload);
      const newQuote = await res.json();
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/stats'] });
      await clearGuestDraft();
      navigation.replace("QuoteDetail", { quoteId: newQuote.id });
    } catch (error) {
      console.error("Failed to save quote:", error);
    }
  };

  const savedQuoteIdRef = React.useRef<string | null>(null);

  const performSaveForSend = async (priceOverrides?: { good?: number; better?: number; best?: number }): Promise<string | null> => {
    if (savedQuoteIdRef.current) return savedQuoteIdRef.current;
    try {
      const payload = buildQuotePayload(priceOverrides);
      const res = await apiRequest("POST", "/api/quotes", payload);
      const newQuote = await res.json();
      savedQuoteIdRef.current = newQuote.id;
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/stats'] });
      await clearGuestDraft();
      return newQuote.id;
    } catch (error) {
      console.error("Failed to save quote:", error);
      return null;
    }
  };

  const handleAuthGateAuthenticated = () => {
    setShowAuthGate(false);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return customer.name.trim().length > 0;
      case 1:
        return homeDetails.sqft > 0;
      case 2:
        return true;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <CustomerInfoScreen data={customer} onUpdate={setCustomer} />;
      case 1:
        return <HomeDetailsScreen data={homeDetails} onUpdate={setHomeDetails} />;
      case 2:
        return (
          <ServiceAddOnsScreen
            frequency={frequency}
            addOns={addOns}
            pricingSettings={pricingSettings}
            onFrequencyChange={setFrequency}
            onAddOnsChange={setAddOns}
          />
        );
      case 3:
        return (
          <QuotePreviewScreen
            customer={customer}
            homeDetails={homeDetails}
            addOns={addOns}
            frequency={frequency}
            pricingSettings={pricingSettings}
            businessProfile={businessProfile}
            selectedOption={selectedOption}
            onSelectOption={setSelectedOption}
            recommendedOption={recommendedOption}
            onSetRecommended={setRecommendedOption}
            onSave={handleSave}
            onSaveForSend={performSaveForSend}
            isGuestMode={isGuestMode}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.header,
          { borderBottomColor: theme.border, paddingTop: insets.top },
        ]}
      >
        {currentStep > 0 ? (
          <Pressable onPress={handleBack} style={styles.headerButton} testID="button-back-step-header">
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Feather name="chevron-left" size={20} color={theme.primary} />
              <ThemedText type="link">Back</ThemedText>
            </View>
          </Pressable>
        ) : (
          <Pressable onPress={handleCancel} style={styles.headerButton} testID="button-cancel">
            <ThemedText type="link">Cancel</ThemedText>
          </Pressable>
        )}
        <View style={styles.headerCenter}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            {STEPS[currentStep]}
          </ThemedText>
          <View style={styles.stepIndicator}>
            {STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      index <= currentStep ? theme.primary : theme.border,
                  },
                ]}
              />
            ))}
          </View>
        </View>
        {currentStep < STEPS.length - 1 ? (
          <Pressable
            onPress={handleNext}
            disabled={!canProceed()}
            style={[styles.headerButton, !canProceed() && { opacity: 0.4 }]}
            testID="button-next-step"
          >
            <ThemedText type="link">Next</ThemedText>
          </Pressable>
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>

      <View style={styles.content}>{renderCurrentStep()}</View>

      <AuthGateModal
        visible={showAuthGate}
        onClose={() => { setShowAuthGate(false); setPendingAction(null); }}
        onAuthenticated={handleAuthGateAuthenticated}
        message={undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerButton: {
    minWidth: 60,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  stepIndicator: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
});
