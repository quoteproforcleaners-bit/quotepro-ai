import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
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
import { calculateAllOptions } from "@/lib/quoteCalculator";
import CustomerInfoScreen from "@/screens/quote/CustomerInfoScreen";
import HomeDetailsScreen from "@/screens/quote/HomeDetailsScreen";
import ServiceAddOnsScreen from "@/screens/quote/ServiceAddOnsScreen";
import QuotePreviewScreen from "@/screens/quote/QuotePreviewScreen";

const STEPS = ["Customer", "Property", "Services", "Quote"];

export default function QuoteCalculatorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { pricingSettings, businessProfile } = useApp();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);

  const [customer, setCustomer] = useState<CustomerInfo>({
    name: "",
    phone: "",
    email: "",
    address: "",
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
  });
  const [selectedOption, setSelectedOption] = useState<"good" | "better" | "best">(
    "better"
  );

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      if (Platform.OS !== "web") {
        Haptics.selectionAsync();
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      if (Platform.OS !== "web") {
        Haptics.selectionAsync();
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleSave = async () => {
    const options = calculateAllOptions(
      homeDetails,
      addOns,
      frequency,
      pricingSettings,
      true
    );

    const selectedPrice = options[selectedOption]?.price || 0;
    const taxRate = pricingSettings?.taxRate || 0;
    const tax = selectedPrice * (taxRate / 100);

    try {
      const res = await apiRequest("POST", "/api/quotes", {
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
        options,
        subtotal: selectedPrice,
        tax,
        total: selectedPrice + tax,
        status: "draft",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/stats'] });
      navigation.goBack();
    } catch (error) {
      console.error("Failed to save quote:", error);
    }
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
            onSave={handleSave}
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
        <Pressable onPress={handleCancel} style={styles.headerButton} testID="button-cancel">
          <ThemedText type="link">Cancel</ThemedText>
        </Pressable>
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

      {currentStep > 0 && currentStep < STEPS.length - 1 ? (
        <Pressable
          onPress={handleBack}
          style={[
            styles.backButton,
            { backgroundColor: theme.backgroundSecondary, bottom: insets.bottom + 20 },
          ]}
          testID="button-back-step"
        >
          <Feather name="arrow-left" size={20} color={theme.text} />
        </Pressable>
      ) : null}
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
    width: 60,
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
  backButton: {
    position: "absolute",
    left: Spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
