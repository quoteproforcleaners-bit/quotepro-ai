import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import OnboardingProgressBar from "@/components/OnboardingProgressBar";
import {
  calculateAllOptions,
} from "@/lib/quoteCalculator";
import { HomeDetails, AddOns, DEFAULT_PRICING_SETTINGS, PricingSettings } from "@/types";

const ADD_ONS_LIST = [
  { id: "insideFridge", label: "Inside Fridge", price: 35 },
  { id: "insideOven", label: "Inside Oven", price: 35 },
  { id: "insideCabinets", label: "Inside Cabinets", price: 75 },
  { id: "interiorWindows", label: "Interior Windows", price: 75 },
];

const MAX_CONTENT_WIDTH = 560;

interface Props {
  pricingSettings: PricingSettings;
  onComplete: (quoteDetails: { total: number; tierName: string; homeDetails: any; tiers: any }) => void;
  onBack: () => void;
}

export default function QuickQuoteScreen({ pricingSettings, onComplete, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > MAX_CONTENT_WIDTH + 40;

  const [showResults, setShowResults] = useState(false);

  const demoHomeDetails: HomeDetails = {
    sqft: 2100,
    beds: 3,
    baths: 2,
    halfBaths: 0,
    conditionScore: 4,
    peopleCount: 2,
    petType: "dog",
    petShedding: false,
    homeType: "house",
    kitchensCount: 1,
  };

  const emptyAddOns: AddOns = {
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

  const settings = pricingSettings || DEFAULT_PRICING_SETTINGS;

  const tiers = useMemo(() => {
    return calculateAllOptions(demoHomeDetails, emptyAddOns, "one-time", settings, true);
  }, [settings]);

  const handleGenerate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setShowResults(true);
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete({
      total: tiers.better.price,
      tierName: tiers.better.serviceTypeName,
      homeDetails: demoHomeDetails,
      tiers,
    });
  };

  const yearlyBiweekly = tiers.better.price * 26;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing["3xl"] }, useMaxWidth ? { alignItems: "center" } : undefined]}
      showsVerticalScrollIndicator={false}
    >
      <View style={useMaxWidth ? { maxWidth: MAX_CONTENT_WIDTH, width: "100%" } : { width: "100%" }}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>

        <OnboardingProgressBar currentStep={3} totalSteps={3} />
        <ThemedText type="h2" style={{ marginBottom: Spacing.xs }}>See QuotePro in Action</ThemedText>
        <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.xl }}>
          Try a sample deep clean quote
        </ThemedText>

        <View style={[styles.demoCard, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", borderColor: theme.border }]}>
          <View style={styles.demoHeader}>
            <View style={[styles.demoIconCircle, { backgroundColor: theme.primary + "15" }]}>
              <Feather name="home" size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="subtitle" style={{ fontWeight: "600" }}>Deep Clean</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>Sample property</ThemedText>
            </View>
          </View>

          <View style={styles.demoDetails}>
            <View style={styles.demoDetailRow}>
              <Feather name="maximize" size={14} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary }}>2,100 sq ft</ThemedText>
            </View>
            <View style={styles.demoDetailRow}>
              <Feather name="moon" size={14} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary }}>3 beds / 2 baths</ThemedText>
            </View>
            <View style={styles.demoDetailRow}>
              <Feather name="heart" size={14} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary }}>1 pet (dog)</ThemedText>
            </View>
            <View style={styles.demoDetailRow}>
              <Feather name="alert-circle" size={14} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Needs extra attention</ThemedText>
            </View>
          </View>
        </View>

        {!showResults ? (
          <Pressable
            testID="button-generate-demo"
            onPress={handleGenerate}
            style={[styles.generateBtn, { backgroundColor: theme.primary }]}
          >
            <LinearGradient
              colors={[theme.primary, isDark ? "#1D4ED8" : "#1D4ED8"]}
              style={styles.generateGradient}
            >
              <Feather name="zap" size={22} color="#FFFFFF" />
              <ThemedText type="h3" style={{ color: "#FFFFFF", fontWeight: "700" }}>Generate Quote</ThemedText>
            </LinearGradient>
          </Pressable>
        ) : (
          <View style={styles.resultsSection}>
            <View style={styles.tiersRow}>
              {[
                { key: "good", tier: tiers.good, badge: null },
                { key: "better", tier: tiers.better, badge: "Best Value" },
                { key: "best", tier: tiers.best, badge: "Premium" },
              ].map(({ key, tier, badge }) => {
                const isBetter = key === "better";
                return (
                  <View
                    key={key}
                    style={[
                      styles.tierCard,
                      {
                        backgroundColor: isBetter ? theme.primary + "10" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                        borderColor: isBetter ? theme.primary : theme.border,
                        borderWidth: isBetter ? 2 : 1,
                      },
                    ]}
                  >
                    {badge ? (
                      <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                        <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 9 }}>{badge}</ThemedText>
                      </View>
                    ) : null}
                    <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: "600", textTransform: "uppercase", fontSize: 10 }}>{tier.name}</ThemedText>
                    <ThemedText type="h3" style={{ color: isBetter ? theme.primary : theme.text, marginVertical: 2 }}>${tier.price}</ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", fontSize: 10 }} numberOfLines={2}>{tier.scope}</ThemedText>
                  </View>
                );
              })}
            </View>

            <ThemedText type="subtitle" style={{ marginTop: Spacing.xl, marginBottom: Spacing.sm }}>Available Add-ons</ThemedText>
            {ADD_ONS_LIST.map((ao) => (
              <View key={ao.id} style={[styles.addOnRow, { borderColor: theme.border }]}>
                <ThemedText type="body" style={{ flex: 1 }}>{ao.label}</ThemedText>
                <ThemedText type="subtitle" style={{ color: theme.primary }}>+${ao.price}</ThemedText>
              </View>
            ))}

            <View style={[styles.marginCard, { backgroundColor: isDark ? theme.successSoft : "#ECFDF5", borderColor: theme.successBorder }]}>
              <View style={styles.marginHeader}>
                <Feather name="trending-up" size={16} color={theme.success} />
                <ThemedText type="subtitle" style={{ color: theme.success, fontWeight: "700" }}>Margin Impact</ThemedText>
              </View>
              <ThemedText type="body" style={{ color: theme.text }}>
                At ${tiers.better.price}/visit biweekly, this client is worth <ThemedText type="subtitle" style={{ color: theme.success, fontWeight: "700" }}>${yearlyBiweekly.toLocaleString()}/year</ThemedText>
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Most cleaners underquote by 15-25%. QuotePro helps prevent that.
              </ThemedText>
            </View>

            <View style={[styles.aiPreviewCard, { backgroundColor: isDark ? "rgba(59,130,246,0.10)" : "#EFF6FF", borderColor: theme.primary + "30" }]}>
              <View style={styles.aiHeader}>
                <Feather name="message-circle" size={16} color={theme.primary} />
                <ThemedText type="subtitle" style={{ color: theme.primary, fontWeight: "700" }}>AI Follow-up Preview</ThemedText>
              </View>
              <ThemedText type="small" style={{ color: theme.textSecondary, fontStyle: "italic" }}>
                "Hi! Just following up on your deep clean quote for ${tiers.better.price}. We'd love to get your home sparkling. Want to lock in a time this week?"
              </ThemedText>
            </View>

            <Pressable
              testID="button-demo-continue"
              onPress={handleContinue}
              style={[styles.continueBtn, { backgroundColor: theme.primary }]}
            >
              <ThemedText type="subtitle" style={{ color: "#FFFFFF", fontWeight: "700" }}>Continue</ThemedText>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl },
  backBtn: { marginBottom: Spacing.lg },
  demoCard: { padding: Spacing.lg, borderRadius: BorderRadius.sm, borderWidth: 1 },
  demoHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.md },
  demoIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  demoDetails: { gap: Spacing.sm },
  demoDetailRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  generateBtn: { marginTop: Spacing.xl, borderRadius: BorderRadius.md, overflow: "hidden" },
  generateGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, height: 64, borderRadius: BorderRadius.md },
  resultsSection: { marginTop: Spacing.xl },
  tiersRow: { flexDirection: "row", gap: Spacing.sm },
  tierCard: { flex: 1, alignItems: "center", padding: Spacing.md, borderRadius: BorderRadius.sm, position: "relative" },
  badge: { position: "absolute", top: -10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  addOnRow: { flexDirection: "row", alignItems: "center", padding: Spacing.md, borderRadius: BorderRadius.xs, borderWidth: 1, marginBottom: Spacing.sm },
  marginCard: { padding: Spacing.lg, borderRadius: BorderRadius.sm, borderWidth: 1, marginTop: Spacing.lg },
  marginHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.sm },
  aiPreviewCard: { padding: Spacing.lg, borderRadius: BorderRadius.sm, borderWidth: 1, marginTop: Spacing.md },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.sm },
  continueBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, height: 56, borderRadius: BorderRadius.md, marginTop: Spacing.xl },
});
