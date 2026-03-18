import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, Pressable, Platform, useWindowDimensions } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import {
  CustomerInfo,
  HomeDetails,
  AddOns,
  ServiceFrequency,
} from "@/types";
import { apiRequest } from "@/lib/query-client";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { calculateAllOptions } from "@/lib/quoteCalculator";
import { saveGuestDraft, loadGuestDraft, clearGuestDraft } from "@/lib/guestDraft";
import AuthGateModal from "@/components/AuthGateModal";
import CustomerInfoScreen from "@/screens/quote/CustomerInfoScreen";
import HomeDetailsScreen from "@/screens/quote/HomeDetailsScreen";
import ServiceAddOnsScreen from "@/screens/quote/ServiceAddOnsScreen";
import QuotePreviewScreen from "@/screens/quote/QuotePreviewScreen";
import { FeatureFlags } from "@/lib/featureFlags";
import { trackEvent } from "@/lib/analytics";

type QuoteType = "residential" | "commercial" | "walkthrough";

const STEPS = ["Type", "Customer", "Property", "Services", "Quote"];

export default function QuoteCalculatorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;
  const { pricingSettings, businessProfile } = useApp();
  const { user, isGuest } = useAuth();
  const { isPro, isGrowth, isStarter } = useSubscription();
  const queryClient = useQueryClient();

  const { data: quoteCountData } = useQuery<{ count: number; limit: number | null }>({
    queryKey: ["/api/quotes/count"],
    enabled: !!user && isStarter && !isGrowth,
    staleTime: 30000,
  });
  const routeParams = (route.params as any) || {};
  const prefill = routeParams.prefillCustomer;
  const editQuoteId = routeParams.editQuoteId as string | undefined;
  const editQuoteData = routeParams.editQuoteData as any | undefined;
  const isEditMode = !!editQuoteId;
  const [currentStep, setCurrentStep] = useState(isEditMode ? 1 : 0);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [pendingAction, setPendingAction] = useState<"save" | "saveAndSend" | null>(null);
  const [quoteType, setQuoteType] = useState<QuoteType>("residential");

  const isGuestMode = !user;

  const [customer, setCustomer] = useState<CustomerInfo>(() => {
    if (editQuoteData) {
      const pd = editQuoteData.propertyDetails || {};
      return {
        name: pd.customerName || prefill?.name || "",
        phone: pd.customerPhone || prefill?.phone || "",
        email: pd.customerEmail || prefill?.email || "",
        address: pd.customerAddress || prefill?.address || "",
        datePreference: pd.datePreference || "",
      };
    }
    return {
      name: prefill?.name || "",
      phone: prefill?.phone || "",
      email: prefill?.email || "",
      address: prefill?.address || "",
      datePreference: "",
    };
  });

  const [homeDetails, setHomeDetails] = useState<HomeDetails>(() => {
    if (editQuoteData) {
      const pd = editQuoteData.propertyDetails || {};
      return {
        sqft: editQuoteData.propertySqft || pd.sqft || 0,
        beds: editQuoteData.propertyBeds || pd.beds || 3,
        baths: Math.floor(editQuoteData.propertyBaths || pd.baths || 2),
        halfBaths: pd.halfBaths || 0,
        conditionScore: pd.conditionScore || 7,
        peopleCount: pd.peopleCount || 2,
        petType: editQuoteData.petType || pd.petType || "none",
        petShedding: pd.petShedding || false,
        homeType: pd.homeType || "house",
        kitchensCount: pd.kitchensCount || 1,
      };
    }
    return {
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
    };
  });

  const [frequency, setFrequency] = useState<ServiceFrequency>(
    editQuoteData?.frequencySelected || "one-time"
  );
  const [addOns, setAddOns] = useState<AddOns>(() => {
    if (editQuoteData?.addOns) {
      return {
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
        ...editQuoteData.addOns,
      };
    }
    return {
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
    };
  });
  const [selectedOption, setSelectedOption] = useState<"good" | "better" | "best">(
    editQuoteData?.selectedOption || "better"
  );
  const [recommendedOption, setRecommendedOption] = useState<"good" | "better" | "best">(
    editQuoteData?.recommendedOption || "better"
  );
  const savedQuoteIdRef = React.useRef<string | null>(isEditMode ? editQuoteId! : null);

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
    if (isGuestMode && currentStep > 1) {
      saveGuestDraft({ customer, homeDetails, addOns, frequency, selectedOption });
    }
  }, [currentStep, customer, homeDetails, addOns, frequency, selectedOption]);

  const handleNext = () => {
    if (currentStep === 0 && quoteType === "walkthrough") {
      if (Platform.OS !== "web") {
        Haptics.selectionAsync();
      }
      trackEvent("walkthrough_ai_selected");
      navigation.navigate("WalkthroughAI" as any);
      return;
    }

    if (currentStep === 0 && quoteType === "commercial") {
      if (Platform.OS !== "web") {
        Haptics.selectionAsync();
      }
      navigation.navigate("CommercialQuote" as any, {
        customerName: customer.name,
        customerAddress: customer.address,
      });
      return;
    }

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
    const minStep = isEditMode ? 1 : 0;
    setCurrentStep((prev) => {
      if (prev > minStep) {
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

    if (!isEditMode && !isPro) {
      try {
        const countRes = await apiRequest("GET", "/api/quotes/count");
        const countData = await countRes.json();
        if (!countData.isPro && countData.count >= countData.limit) {
          trackEvent("quote_limit_hit", { count: countData.count, limit: countData.limit });
          navigation.navigate("Paywall", { trigger_source: "quote_limit" });
          return;
        }
      } catch (e) {
        console.warn("Quote count check failed:", e);
      }
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
      ...(isEditMode ? {} : { status: "draft" }),
    };
  };

  const performSave = async () => {
    try {
      const payload = buildQuotePayload();
      if (isEditMode && editQuoteId) {
        await apiRequest("PUT", `/api/quotes/${editQuoteId}`, payload);
        queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
        queryClient.invalidateQueries({ queryKey: ['/api/quotes', editQuoteId] });
        queryClient.invalidateQueries({ queryKey: ['/api/reports/stats'] });
        navigation.goBack();
      } else {
        const res = await apiRequest("POST", "/api/quotes", payload);
        if (res.status === 403) {
          const errData = await res.json();
          if (errData.quoteLimitReached) {
            navigation.navigate("Paywall", { trigger_source: "quote_limit" });
            return;
          }
        }
        const newQuote = await res.json();
        queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
        queryClient.invalidateQueries({ queryKey: ['/api/reports/stats'] });
        await clearGuestDraft();
        navigation.replace("QuoteDetail", { quoteId: newQuote.id });
      }
    } catch (error: any) {
      if (error?.message?.includes("403") || error?.status === 403) {
        navigation.navigate("Paywall", { trigger_source: "quote_limit" });
        return;
      }
      console.error("Failed to save quote:", error);
    }
  };

  const performSaveForSend = async (priceOverrides?: { good?: number; better?: number; best?: number }): Promise<string | null> => {
    if (isEditMode && editQuoteId) {
      try {
        const payload = buildQuotePayload(priceOverrides);
        await apiRequest("PUT", `/api/quotes/${editQuoteId}`, payload);
        queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
        queryClient.invalidateQueries({ queryKey: ['/api/quotes', editQuoteId] });
        queryClient.invalidateQueries({ queryKey: ['/api/reports/stats'] });
        return editQuoteId;
      } catch (error) {
        console.error("Failed to update quote:", error);
        return null;
      }
    }
    if (savedQuoteIdRef.current) return savedQuoteIdRef.current;
    try {
      const payload = buildQuotePayload(priceOverrides);
      const res = await apiRequest("POST", "/api/quotes", payload);
      if (res.status === 403) {
        const errData = await res.json();
        if (errData.quoteLimitReached) {
          navigation.navigate("Paywall", { trigger_source: "quote_limit" });
          return null;
        }
      }
      const newQuote = await res.json();
      savedQuoteIdRef.current = newQuote.id;
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/stats'] });
      await clearGuestDraft();
      return newQuote.id;
    } catch (error: any) {
      if (error?.message?.includes("403") || error?.status === 403) {
        navigation.navigate("Paywall", { trigger_source: "quote_limit" });
        return null;
      }
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
        return true;
      case 1:
        return customer.name.trim().length > 0;
      case 2:
        return homeDetails.sqft > 0;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const renderQuoteTypeSelector = () => {
    const commercialEnabled = FeatureFlags.commercialQuotingEnabled;

    const typeCards: Array<{
      key: QuoteType;
      icon: React.ComponentProps<typeof Feather>["name"];
      title: string;
      description: string;
      badge?: string;
      color: string;
      enabled: boolean;
    }> = [
      {
        key: "residential",
        icon: "home",
        title: "Residential",
        description: "Room-by-room pricing based on bedrooms, bathrooms, and square footage",
        color: theme.primary,
        enabled: true,
      },
      {
        key: "commercial",
        icon: "briefcase",
        title: "Commercial",
        description: "Full walkthrough with labor estimates, tiered pricing, and professional proposals",
        color: theme.success,
        enabled: commercialEnabled,
      },
      {
        key: "walkthrough",
        icon: "mic",
        title: "Walkthrough AI",
        description: "Describe the job by voice or text and get a smart quote recommendation.",
        badge: "AI-Powered",
        color: theme.primary,
        enabled: true,
      },
    ];

    return (
      <ScrollView
        style={styles.typeSelectorScroll}
        contentContainerStyle={styles.typeSelector}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="h2" style={styles.typeSelectorTitle}>
          What are you quoting?
        </ThemedText>

        {isStarter && !isGrowth && quoteCountData ? (
          <Pressable
            onPress={() => navigation.navigate("Paywall", { required_tier: "growth", trigger_source: "quote_limit" } as any)}
            style={[
              styles.quoteCounter,
              {
                backgroundColor: (quoteCountData.limit !== null && quoteCountData.count >= (quoteCountData.limit - 3))
                  ? `${theme.warning}22`
                  : `${theme.primary}11`,
                borderColor: (quoteCountData.limit !== null && quoteCountData.count >= (quoteCountData.limit - 3))
                  ? `${theme.warning}55`
                  : `${theme.primary}22`,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Feather
                name="file-text"
                size={13}
                color={(quoteCountData.limit !== null && quoteCountData.count >= (quoteCountData.limit - 3)) ? theme.warning : theme.primary}
              />
              <ThemedText
                type="caption"
                style={{
                  color: (quoteCountData.limit !== null && quoteCountData.count >= (quoteCountData.limit - 3)) ? theme.warning : theme.primary,
                  fontWeight: "600",
                }}
              >
                {quoteCountData.limit !== null
                  ? `${quoteCountData.count} of ${quoteCountData.limit} quotes used this month`
                  : `${quoteCountData.count} quotes created this month`}
              </ThemedText>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>
                Go unlimited
              </ThemedText>
              <Feather name="chevron-right" size={12} color={theme.primary} />
            </View>
          </Pressable>
        ) : null}

        <View style={styles.typeCardsContainer}>
          {typeCards.map((card) => {
            const isSelected = quoteType === card.key;
            return (
              <Pressable
                key={card.key}
                onPress={() => {
                  if (card.key === "walkthrough" && !isGrowth && !isGuestMode) {
                    navigation.navigate("Paywall", { required_tier: "growth", trigger_source: "ai_builder_gate" } as any);
                    return;
                  }
                  if (card.enabled) {
                    setQuoteType(card.key);
                    if (Platform.OS !== "web") Haptics.selectionAsync();
                  }
                }}
                style={[
                  styles.typeCard,
                  {
                    backgroundColor: isDark ? theme.surface1 : theme.surface0,
                    borderColor: isSelected ? card.color : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                  !card.enabled ? { opacity: 0.4 } : null,
                ]}
                testID={`button-type-${card.key}`}
              >
                {isSelected ? (
                  <View style={[styles.selectedIndicator, { backgroundColor: card.color }]}>
                    <Feather name="check" size={12} color="#fff" />
                  </View>
                ) : null}
                {card.badge ? (
                  <View style={[styles.aiBadge, { backgroundColor: `${card.color}15` }]}>
                    <ThemedText type="caption" style={{ color: card.color, fontWeight: "700", fontSize: 11 }}>
                      {card.badge}
                    </ThemedText>
                  </View>
                ) : null}
                <View style={styles.typeCardRow}>
                  <View style={[styles.typeCardIcon, { backgroundColor: `${card.color}15` }]}>
                    <Feather name={card.icon} size={22} color={card.color} />
                  </View>
                  <View style={styles.typeCardText}>
                    <ThemedText type="body" style={{ fontWeight: "700" }}>
                      {card.title}
                    </ThemedText>
                    {!card.enabled ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Feather name="lock" size={11} color={theme.textSecondary} />
                        <ThemedText type="caption" style={{ color: theme.textSecondary, fontSize: 12 }}>
                          Coming Soon
                        </ThemedText>
                      </View>
                    ) : null}
                    <ThemedText type="caption" style={{ color: theme.textSecondary, fontSize: 12, lineHeight: 16 }}>
                      {card.description}
                    </ThemedText>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return renderQuoteTypeSelector();
      case 1:
        return <CustomerInfoScreen data={customer} onUpdate={setCustomer} />;
      case 2:
        return <HomeDetailsScreen data={homeDetails} onUpdate={setHomeDetails} />;
      case 3:
        return (
          <ServiceAddOnsScreen
            frequency={frequency}
            addOns={addOns}
            pricingSettings={pricingSettings}
            onFrequencyChange={setFrequency}
            onAddOnsChange={setAddOns}
          />
        );
      case 4:
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
            onAddOnsChange={setAddOns}
            isGuestMode={isGuestMode}
            isEditMode={isEditMode}
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
        {currentStep > (isEditMode ? 1 : 0) ? (
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
            {isEditMode ? `Edit - ${STEPS[currentStep]}` : STEPS[currentStep]}
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

      <View style={[styles.content, ...(useMaxWidth ? [{ maxWidth: 560, alignSelf: "center" as const, width: "100%" as const }] : [])]}>{renderCurrentStep()}</View>

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
  typeSelectorScroll: {
    flex: 1,
  },
  typeSelector: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
  },
  typeSelectorTitle: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  quoteCounter: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  typeCardsContainer: {
    width: "100%",
    gap: Spacing.sm,
  },
  typeCard: {
    width: "100%",
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 16,
    position: "relative",
  },
  typeCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  typeCardText: {
    flex: 1,
    gap: 2,
  },
  typeCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  aiBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.md,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  selectedIndicator: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
