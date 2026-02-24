import React, { useState } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useApp } from "@/context/AppContext";
import { Spacing } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import {
  CommercialWalkthrough,
  CommercialLaborEstimate,
  CommercialPricing,
  CommercialTier,
  DEFAULT_WALKTHROUGH,
} from "../types";
import {
  calculateLaborEstimate,
  calculateCommercialPricing,
  generateDefaultTiers,
  FREQUENCY_VISITS_PER_MONTH,
} from "../laborModel";
import WalkthroughScreen from "./WalkthroughScreen";
import LaborEstimateScreen from "./LaborEstimateScreen";
import PricingEngineScreen from "./PricingEngineScreen";
import TierBuilderScreen from "./TierBuilderScreen";
import ProposalPreviewScreen from "./ProposalPreviewScreen";

type Phase = "walkthrough" | "labor" | "pricing" | "tiers" | "proposal";

const PHASES: { key: Phase; label: string }[] = [
  { key: "walkthrough", label: "Walkthrough" },
  { key: "labor", label: "Labor" },
  { key: "pricing", label: "Pricing" },
  { key: "tiers", label: "Tiers" },
  { key: "proposal", label: "Proposal" },
];

interface Props {
  customerName?: string;
  customerAddress?: string;
}

export default function CommercialQuoteScreen({ customerName, customerAddress }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { pricingSettings, businessProfile } = useApp();

  const [phase, setPhase] = useState<Phase>("walkthrough");
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);

  const [walkthrough, setWalkthrough] = useState<CommercialWalkthrough>({
    ...DEFAULT_WALKTHROUGH,
    facilityName: customerName || "",
    siteAddress: customerAddress || "",
  });

  const defaultRate = pricingSettings?.hourlyRate || 55;

  const [laborEstimate, setLaborEstimate] = useState<CommercialLaborEstimate>(() =>
    calculateLaborEstimate({
      ...DEFAULT_WALKTHROUGH,
      facilityName: customerName || "",
      siteAddress: customerAddress || "",
    })
  );

  const [pricing, setPricing] = useState<CommercialPricing>({
    hourlyRate: defaultRate,
    overheadPct: 15,
    targetMarginPct: 20,
    suppliesSurcharge: 0,
    suppliesSurchargeType: "fixed",
    finalPricePerVisit: 0,
    monthlyPrice: 0,
    roundingRule: "5",
  });

  const [tiers, setTiers] = useState<CommercialTier[]>([]);

  const phaseIndex = PHASES.findIndex((p) => p.key === phase);

  const handleWalkthroughComplete = () => {
    const newEstimate = calculateLaborEstimate(walkthrough);
    setLaborEstimate(newEstimate);
    const newPricing = calculateCommercialPricing(newEstimate, {
      hourlyRate: pricing.hourlyRate,
      overheadPct: pricing.overheadPct,
      targetMarginPct: pricing.targetMarginPct,
      suppliesSurcharge: pricing.suppliesSurcharge,
      suppliesSurchargeType: pricing.suppliesSurchargeType,
      roundingRule: pricing.roundingRule,
      frequency: walkthrough.frequency,
    });
    setPricing(newPricing);
    setPhase("labor");
    haptic();
  };

  const handleLaborNext = () => {
    const newPricing = calculateCommercialPricing(laborEstimate, {
      hourlyRate: pricing.hourlyRate,
      overheadPct: pricing.overheadPct,
      targetMarginPct: pricing.targetMarginPct,
      suppliesSurcharge: pricing.suppliesSurcharge,
      suppliesSurchargeType: pricing.suppliesSurchargeType,
      roundingRule: pricing.roundingRule,
      frequency: walkthrough.frequency,
    });
    setPricing(newPricing);
    setPhase("pricing");
    haptic();
  };

  const handlePricingNext = () => {
    const newTiers = generateDefaultTiers(walkthrough, laborEstimate, pricing);
    setTiers(newTiers);
    setPhase("tiers");
    haptic();
  };

  const handleTiersNext = () => {
    setPhase("proposal");
    haptic();
  };

  const handleBack = (target: Phase) => {
    setPhase(target);
    haptic();
  };

  const haptic = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
  };

  const handleAccept = async () => {
    try {
      const quoteId = savedQuoteId || (await saveCommercialQuote());
      if (quoteId) {
        await apiRequest("PUT", `/api/quotes/${quoteId}`, { status: "accepted", acceptedAt: new Date() });
        queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        navigation.replace("QuoteDetail", { quoteId });
      }
    } catch (error) {
      console.error("Failed to accept commercial quote:", error);
    }
  };

  const saveCommercialQuote = async (): Promise<string | null> => {
    try {
      const payload = {
        propertySqft: walkthrough.totalSqFt,
        propertyDetails: {
          quoteType: "commercial",
          customerName: walkthrough.facilityName,
          customerAddress: walkthrough.siteAddress,
          commercialData: {
            walkthrough,
            laborEstimate,
            pricing,
            tiers,
            status: "draft",
          },
        },
        options: {
          good: { name: tiers[0]?.name || "Basic", serviceTypeName: "Commercial", scope: tiers[0]?.scopeText || "", price: tiers[0]?.pricePerVisit || 0, addOnsIncluded: tiers[0]?.includedBullets || [] },
          better: { name: tiers[1]?.name || "Enhanced", serviceTypeName: "Commercial", scope: tiers[1]?.scopeText || "", price: tiers[1]?.pricePerVisit || 0, addOnsIncluded: tiers[1]?.includedBullets || [] },
          best: { name: tiers[2]?.name || "Premium", serviceTypeName: "Commercial", scope: tiers[2]?.scopeText || "", price: tiers[2]?.pricePerVisit || 0, addOnsIncluded: tiers[2]?.includedBullets || [] },
        },
        selectedOption: "better",
        subtotal: tiers[1]?.monthlyPrice || pricing.monthlyPrice,
        tax: 0,
        total: tiers[1]?.monthlyPrice || pricing.monthlyPrice,
        frequencySelected: walkthrough.frequency,
        status: "draft",
      };
      const res = await apiRequest("POST", "/api/quotes", payload);
      const newQuote = await res.json();
      setSavedQuoteId(newQuote.id);
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      return newQuote.id;
    } catch (error) {
      console.error("Failed to save commercial quote:", error);
      return null;
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const renderPhase = () => {
    switch (phase) {
      case "walkthrough":
        return (
          <WalkthroughScreen
            walkthrough={walkthrough}
            onUpdate={setWalkthrough}
            onComplete={handleWalkthroughComplete}
            onCancel={handleCancel}
          />
        );
      case "labor":
        return (
          <LaborEstimateScreen
            walkthrough={walkthrough}
            laborEstimate={laborEstimate}
            onUpdate={setLaborEstimate}
            onNext={handleLaborNext}
          />
        );
      case "pricing":
        return (
          <PricingEngineScreen
            laborEstimate={laborEstimate}
            pricing={pricing}
            frequency={walkthrough.frequency}
            onUpdate={setPricing}
            onNext={handlePricingNext}
          />
        );
      case "tiers":
        return (
          <TierBuilderScreen
            walkthrough={walkthrough}
            laborEstimate={laborEstimate}
            pricing={pricing}
            tiers={tiers}
            onUpdate={setTiers}
            onNext={handleTiersNext}
            onBack={() => handleBack("pricing")}
          />
        );
      case "proposal":
        return (
          <ProposalPreviewScreen
            walkthrough={walkthrough}
            laborEstimate={laborEstimate}
            pricing={pricing}
            tiers={tiers}
            quoteId={savedQuoteId || undefined}
            onAccept={handleAccept}
            onBack={() => handleBack("tiers")}
          />
        );
      default:
        return null;
    }
  };

  if (phase === "walkthrough") {
    return renderPhase();
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.phaseHeader, { borderBottomColor: theme.border, paddingTop: insets.top }]}>
        {phase !== "labor" ? (
          <Pressable
            onPress={() => {
              const prevIndex = phaseIndex - 1;
              if (prevIndex >= 0) {
                setPhase(PHASES[prevIndex].key);
                haptic();
              }
            }}
            style={styles.headerButton}
            testID="button-phase-back"
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Feather name="chevron-left" size={20} color={theme.primary} />
              <ThemedText type="link">Back</ThemedText>
            </View>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => { setPhase("walkthrough"); haptic(); }}
            style={styles.headerButton}
            testID="button-back-walkthrough"
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Feather name="chevron-left" size={20} color={theme.primary} />
              <ThemedText type="link">Walkthrough</ThemedText>
            </View>
          </Pressable>
        )}
        <View style={styles.headerCenter}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            {PHASES[phaseIndex]?.label || ""}
          </ThemedText>
          <View style={styles.phaseIndicator}>
            {PHASES.map((p, index) => (
              <View
                key={p.key}
                style={[
                  styles.phaseDot,
                  {
                    backgroundColor:
                      index <= phaseIndex ? theme.primary : theme.border,
                    width: index === phaseIndex ? 16 : 8,
                  },
                ]}
              />
            ))}
          </View>
        </View>
        <Pressable
          onPress={async () => {
            await saveCommercialQuote();
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }}
          style={styles.headerButton}
          testID="button-save-draft"
        >
          <ThemedText type="link">Save</ThemedText>
        </Pressable>
      </View>
      <View style={styles.content}>{renderPhase()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  phaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerButton: {
    minWidth: 80,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  phaseIndicator: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
    alignItems: "center",
  },
  phaseDot: {
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
});
