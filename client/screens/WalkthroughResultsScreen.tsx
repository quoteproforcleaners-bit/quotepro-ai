import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { trackEvent } from "@/lib/analytics";
import {
  calculatePricingRecommendations,
  ExtractedFields,
  PricingRecommendation,
  RecommendedOption,
  CommercialRecommendedOption,
} from "@/lib/pricingRecommendationService";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type ResultsRoute = RouteProp<RootStackParamList, "WalkthroughResults">;

function formatCurrency(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`;
}

function buildTextSummary(
  fields: ExtractedFields,
  recommendation: PricingRecommendation,
  assumptions: string[],
  confidence: string
): string {
  const lines: string[] = ["Walkthrough AI Summary", ""];

  lines.push("--- Job Details ---");
  if (fields.propertyType) lines.push(`Property: ${fields.propertyType}`);
  if (fields.bedrooms) lines.push(`Bedrooms: ${fields.bedrooms}`);
  if (fields.bathrooms) lines.push(`Bathrooms: ${fields.bathrooms}`);
  if (fields.sqft) lines.push(`Sq Ft: ${fields.sqft.toLocaleString()}`);
  if (fields.frequency) lines.push(`Frequency: ${fields.frequency}`);
  if (fields.serviceCategory) lines.push(`Service: ${fields.serviceCategory}`);
  if (fields.petCount) lines.push(`Pets: ${fields.petCount} ${fields.petType || ""}`);
  if (fields.conditionLevel) lines.push(`Condition: ${fields.conditionLevel}`);
  if (fields.notes) lines.push(`Notes: ${fields.notes}`);
  lines.push("");

  lines.push("--- Recommended Pricing ---");
  if (recommendation.residentialOptions) {
    for (const opt of recommendation.residentialOptions) {
      const tag = opt.isRecommended ? " (Recommended)" : "";
      lines.push(`${opt.name}: ${formatCurrency(opt.price)}${tag}`);
    }
  }
  if (recommendation.commercialOptions) {
    for (const opt of recommendation.commercialOptions) {
      const tag = opt.isRecommended ? " (Recommended)" : "";
      lines.push(`${opt.tierName}: ${formatCurrency(opt.pricePerVisit)}/visit, ${formatCurrency(opt.monthlyPrice)}/mo${tag}`);
    }
  }
  lines.push("");

  lines.push(`Estimated Labor: ${recommendation.estimatedLaborHours} hrs`);
  lines.push(`Suggested Crew: ${recommendation.suggestedCrewSize}`);
  lines.push(`Confidence: ${confidence}`);

  if (assumptions.length > 0) {
    lines.push("");
    lines.push("Assumptions: " + assumptions.join("; "));
  }

  return lines.join("\n");
}

export default function WalkthroughResultsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ResultsRoute>();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { pricingSettings } = useApp();

  const { extractedFields, assumptions, confidence, description } = route.params;
  const fields = extractedFields as ExtractedFields;

  const recommendation = useMemo(
    () => calculatePricingRecommendations(fields, pricingSettings),
    [fields, pricingSettings]
  );

  React.useEffect(() => {
    trackEvent("walkthrough_quote_generated");
  }, []);

  const handleCreateQuote = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackEvent("walkthrough_create_quote_clicked");

    if (recommendation.isCommercial && fields.isCommercial !== false) {
      navigation.navigate("CommercialQuote", {
        customerName: "",
        customerAddress: "",
      });
    } else {
      const bestOption = recommendation.residentialOptions?.find((o) => o.isRecommended) || recommendation.residentialOptions?.[0];
      const conditionMap: Record<string, number> = {
        excellent: 9, good: 7, average: 5, dirty: 3, "very dirty": 1,
      };
      const condScore = fields.conditionLevel
        ? conditionMap[fields.conditionLevel.toLowerCase()] || 7
        : 7;

      const petTypeMap: Record<string, string> = {
        dog: "dog", cat: "cat", dogs: "dog", cats: "cat",
      };
      const mappedPetType = fields.petType
        ? petTypeMap[fields.petType.toLowerCase()] || (fields.petCount ? "dog" : "none")
        : fields.petCount ? "dog" : "none";

      const frequencyMap: Record<string, string> = {
        weekly: "weekly", biweekly: "biweekly", monthly: "monthly",
        "one-time": "one-time", "bi-weekly": "biweekly",
      };
      const mappedFreq = fields.frequency
        ? frequencyMap[fields.frequency.toLowerCase()] || "one-time"
        : "one-time";

      const addOnsList = fields.addOns || [];
      const addOnsObj: Record<string, boolean> = {};
      const addOnMap: Record<string, string> = {
        fridge: "insideFridge",
        "inside fridge": "insideFridge",
        refrigerator: "insideFridge",
        oven: "insideOven",
        "inside oven": "insideOven",
        stove: "insideOven",
        cabinets: "insideCabinets",
        "inside cabinets": "insideCabinets",
        windows: "interiorWindows",
        "interior windows": "interiorWindows",
        "window cleaning": "interiorWindows",
        blinds: "blindsDetail",
        "blinds detail": "blindsDetail",
        baseboards: "baseboardsDetail",
        "baseboards detail": "baseboardsDetail",
        laundry: "laundryFoldOnly",
        "laundry fold": "laundryFoldOnly",
        "laundry fold only": "laundryFoldOnly",
        dishes: "dishes",
        organization: "organizationTidy",
        organizing: "organizationTidy",
        "organization/tidy": "organizationTidy",
        tidy: "organizationTidy",
      };
      for (const a of addOnsList) {
        const key = addOnMap[a.toLowerCase()];
        if (key) addOnsObj[key] = true;
      }

      navigation.navigate("QuoteCalculator", {
        editQuoteData: {
          propertyBeds: fields.bedrooms || 3,
          propertyBaths: fields.bathrooms || 2,
          propertySqft: fields.sqft || 0,
          frequencySelected: mappedFreq,
          addOns: addOnsObj,
          propertyDetails: {
            conditionScore: condScore,
            petType: mappedPetType,
            petShedding: (fields.petType || "").toLowerCase().includes("dog"),
            homeType: fields.propertyType || "house",
            notes: fields.notes || "",
          },
          fromWalkthrough: true,
        },
      });
    }
  };

  const handleEditDetails = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    navigation.navigate("WalkthroughEdit", {
      extractedFields: fields,
      assumptions,
      confidence,
      description,
    });
  };

  const handleClosingMessage = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    const recOption = recommendation.isCommercial
      ? recommendation.commercialOptions?.find((o) => o.isRecommended)
      : recommendation.residentialOptions?.find((o) => o.isRecommended);

    const amount = recommendation.isCommercial
      ? (recOption as CommercialRecommendedOption)?.pricePerVisit || 0
      : (recOption as RecommendedOption)?.price || 0;

    navigation.navigate("ClosingAssistant", {
      quoteAmount: amount,
      serviceType: fields.serviceCategory || "cleaning",
      frequency: fields.frequency || "one-time",
      addOns: fields.addOns || [],
      notes: fields.notes || "",
    });
  };

  const handleCopySummary = async () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const text = buildTextSummary(fields, recommendation, assumptions, confidence);
    await Clipboard.setStringAsync(text);
  };

  const confidenceColor =
    confidence === "high"
      ? theme.success
      : confidence === "medium"
        ? theme.warning
        : theme.error;

  const detailItems: { label: string; value: string }[] = [];
  if (fields.propertyType) detailItems.push({ label: "Property Type", value: fields.propertyType });
  if (fields.bedrooms) detailItems.push({ label: "Bedrooms", value: String(fields.bedrooms) });
  if (fields.bathrooms) detailItems.push({ label: "Bathrooms", value: String(fields.bathrooms) });
  if (fields.sqft) detailItems.push({ label: "Square Feet", value: fields.sqft.toLocaleString() });
  if (fields.frequency) detailItems.push({ label: "Frequency", value: fields.frequency });
  if (fields.serviceCategory) detailItems.push({ label: "Service Type", value: fields.serviceCategory });
  if (fields.petCount) detailItems.push({ label: "Pets", value: `${fields.petCount} ${fields.petType || ""}`.trim() });
  if (fields.conditionLevel) detailItems.push({ label: "Condition", value: fields.conditionLevel });
  if (fields.addOns && fields.addOns.length > 0) {
    const formatAddOn = (a: string) =>
      a.includes(" ")
        ? a.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
        : a.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
    detailItems.push({ label: "Add-Ons", value: fields.addOns.map(formatAddOn).join(", ") });
  }
  if (fields.notes) detailItems.push({ label: "Notes", value: fields.notes });

  const { breakdown } = recommendation;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <Card variant="base" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${theme.primary}15` }]}>
              <Feather name="clipboard" size={18} color={theme.primary} />
            </View>
            <ThemedText type="h4">Detected Job Details</ThemedText>
          </View>
          {detailItems.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.detailRow,
                idx < detailItems.length - 1
                  ? { borderBottomWidth: 1, borderBottomColor: theme.divider }
                  : null,
              ]}
            >
              <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
                {item.label}
              </ThemedText>
              <ThemedText type="small" style={{ fontWeight: "600", flex: 1.5, textAlign: "right" }}>
                {item.value}
              </ThemedText>
            </View>
          ))}
        </Card>

        <Card variant="emphasis" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${theme.success}15` }]}>
              <Feather name="dollar-sign" size={18} color={theme.success} />
            </View>
            <ThemedText type="h4">Recommended Quote Options</ThemedText>
          </View>

          {recommendation.residentialOptions
            ? recommendation.residentialOptions.map((opt, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: opt.isRecommended
                        ? isDark
                          ? `${theme.primary}20`
                          : `${theme.primary}08`
                        : isDark
                          ? theme.surface0
                          : theme.backgroundRoot,
                      borderColor: opt.isRecommended ? theme.primary : theme.border,
                      borderWidth: opt.isRecommended ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.optionHeader}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="body" style={{ fontWeight: "700" }}>
                        {opt.name}
                      </ThemedText>
                      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                        {opt.scope}
                      </ThemedText>
                    </View>
                    <ThemedText type="h3" style={{ color: theme.primary }}>
                      {formatCurrency(opt.price)}
                    </ThemedText>
                  </View>
                  {opt.isRecommended ? (
                    <View style={[styles.recommendedBadge, { backgroundColor: `${theme.primary}15` }]}>
                      <Feather name="star" size={12} color={theme.primary} />
                      <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "700" }}>
                        Recommended
                      </ThemedText>
                    </View>
                  ) : null}
                  {opt.addOnsIncluded.length > 0 ? (
                    <ThemedText type="caption" style={{ color: theme.textMuted, marginTop: Spacing.xs }}>
                      Includes: {opt.addOnsIncluded.join(", ")}
                    </ThemedText>
                  ) : null}
                </View>
              ))
            : null}

          {recommendation.commercialOptions
            ? recommendation.commercialOptions.map((opt, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: opt.isRecommended
                        ? isDark
                          ? `${theme.primary}20`
                          : `${theme.primary}08`
                        : isDark
                          ? theme.surface0
                          : theme.backgroundRoot,
                      borderColor: opt.isRecommended ? theme.primary : theme.border,
                      borderWidth: opt.isRecommended ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.optionHeader}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="body" style={{ fontWeight: "700" }}>
                        {opt.tierName}
                      </ThemedText>
                      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                        {opt.scopeText}
                      </ThemedText>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <ThemedText type="h3" style={{ color: theme.primary }}>
                        {formatCurrency(opt.pricePerVisit)}
                      </ThemedText>
                      <ThemedText type="caption" style={{ color: theme.textMuted }}>
                        {formatCurrency(opt.monthlyPrice)}/mo
                      </ThemedText>
                    </View>
                  </View>
                  {opt.isRecommended ? (
                    <View style={[styles.recommendedBadge, { backgroundColor: `${theme.primary}15` }]}>
                      <Feather name="star" size={12} color={theme.primary} />
                      <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "700" }}>
                        Recommended
                      </ThemedText>
                    </View>
                  ) : null}
                  {opt.includedBullets.length > 0 ? (
                    <View style={{ marginTop: Spacing.sm }}>
                      {opt.includedBullets.map((b, i) => (
                        <View key={i} style={styles.bulletRow}>
                          <Feather name="check" size={12} color={theme.success} />
                          <ThemedText type="caption" style={{ color: theme.textSecondary, flex: 1 }}>
                            {b}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))
            : null}
        </Card>

        <Card variant="base" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${theme.warning}15` }]}>
              <Feather name="bar-chart-2" size={18} color={theme.warning} />
            </View>
            <ThemedText type="h4">Pricing Breakdown</ThemedText>
          </View>
          <View style={styles.breakdownRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Base Price</ThemedText>
            <ThemedText type="small" style={{ fontWeight: "600" }}>{formatCurrency(breakdown.base)}</ThemedText>
          </View>
          {breakdown.bedroomAdj > 0 ? (
            <View style={styles.breakdownRow}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Bedroom Adjustment</ThemedText>
              <ThemedText type="small" style={{ fontWeight: "600" }}>+{formatCurrency(breakdown.bedroomAdj)}</ThemedText>
            </View>
          ) : null}
          {breakdown.bathroomAdj > 0 ? (
            <View style={styles.breakdownRow}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Bathroom Adjustment</ThemedText>
              <ThemedText type="small" style={{ fontWeight: "600" }}>+{formatCurrency(breakdown.bathroomAdj)}</ThemedText>
            </View>
          ) : null}
          {breakdown.petFee > 0 ? (
            <View style={styles.breakdownRow}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Pet Fee</ThemedText>
              <ThemedText type="small" style={{ fontWeight: "600" }}>+{formatCurrency(breakdown.petFee)}</ThemedText>
            </View>
          ) : null}
          {breakdown.addOnsTotal > 0 ? (
            <View style={styles.breakdownRow}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Add-Ons</ThemedText>
              <ThemedText type="small" style={{ fontWeight: "600" }}>+{formatCurrency(breakdown.addOnsTotal)}</ThemedText>
            </View>
          ) : null}
          {breakdown.frequencyDiscount > 0 ? (
            <View style={styles.breakdownRow}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Frequency Discount</ThemedText>
              <ThemedText type="small" style={{ fontWeight: "600", color: theme.success }}>-{breakdown.frequencyDiscount}%</ThemedText>
            </View>
          ) : null}
          {breakdown.conditionMultiplier !== 1.0 ? (
            <View style={styles.breakdownRow}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Condition Multiplier</ThemedText>
              <ThemedText type="small" style={{ fontWeight: "600" }}>{breakdown.conditionMultiplier}x</ThemedText>
            </View>
          ) : null}
          {breakdown.minimumCharge > 0 ? (
            <View style={[styles.breakdownRow, { borderTopWidth: 1, borderTopColor: theme.divider, paddingTop: Spacing.sm }]}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Minimum Charge</ThemedText>
              <ThemedText type="small" style={{ fontWeight: "600" }}>{formatCurrency(breakdown.minimumCharge)}</ThemedText>
            </View>
          ) : null}
        </Card>

        <Card variant="base" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${theme.primary}15` }]}>
              <Feather name="clock" size={18} color={theme.primary} />
            </View>
            <ThemedText type="h4">Estimated Labor</ThemedText>
          </View>
          <View style={styles.laborGrid}>
            <View style={[styles.laborItem, { backgroundColor: isDark ? theme.surface0 : theme.backgroundRoot }]}>
              <ThemedText type="h2" style={{ color: theme.primary }}>
                {recommendation.estimatedLaborHours}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Hours
              </ThemedText>
            </View>
            <View style={[styles.laborItem, { backgroundColor: isDark ? theme.surface0 : theme.backgroundRoot }]}>
              <ThemedText type="h2" style={{ color: theme.primary }}>
                {recommendation.suggestedCrewSize}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Crew Size
              </ThemedText>
            </View>
          </View>
        </Card>

        <Card variant="base" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${confidenceColor}15` }]}>
              <Feather name="info" size={18} color={confidenceColor} />
            </View>
            <ThemedText type="h4">Assumptions & Confidence</ThemedText>
          </View>
          <View style={[styles.confidenceBadge, { backgroundColor: `${confidenceColor}15` }]}>
            <View style={[styles.confidenceDot, { backgroundColor: confidenceColor }]} />
            <ThemedText type="small" style={{ color: confidenceColor, fontWeight: "700", textTransform: "capitalize" }}>
              {confidence} Confidence
            </ThemedText>
          </View>
          {assumptions.length > 0 ? (
            <View style={{ marginTop: Spacing.md }}>
              {assumptions.map((a: string, i: number) => (
                <View key={i} style={styles.assumptionRow}>
                  <Feather name="alert-circle" size={14} color={theme.textMuted} />
                  <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
                    {a}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}
        </Card>

        {recommendation.upsellSuggestions.length > 0 || recommendation.warnings.length > 0 ? (
          <Card variant="base" style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: `${theme.success}15` }]}>
                <Feather name="trending-up" size={18} color={theme.success} />
              </View>
              <ThemedText type="h4">AI Recommendations</ThemedText>
            </View>
            {recommendation.upsellSuggestions.map((s, i) => (
              <View key={`u-${i}`} style={styles.suggestionRow}>
                <Feather name="zap" size={14} color={theme.success} />
                <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
                  {s}
                </ThemedText>
              </View>
            ))}
            {recommendation.warnings.map((w, i) => (
              <View key={`w-${i}`} style={styles.suggestionRow}>
                <Feather name="alert-triangle" size={14} color={theme.warning} />
                <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
                  {w}
                </ThemedText>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.actionsContainer,
          {
            backgroundColor: theme.backgroundRoot,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + Spacing.md,
          },
        ]}
      >
        <View style={styles.actionsRow}>
          <Pressable
            onPress={handleCreateQuote}
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            testID="button-create-quote"
          >
            <Feather name="file-plus" size={18} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700" }}>
              Create Quote
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.secondaryRow}>
          <Pressable
            onPress={handleEditDetails}
            style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: isDark ? theme.surface1 : theme.surface0 }]}
            testID="button-edit-details"
          >
            <Feather name="edit-2" size={16} color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
              Edit Details
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={handleClosingMessage}
            style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: isDark ? theme.surface1 : theme.surface0 }]}
            testID="button-closing-message"
          >
            <Feather name="message-circle" size={16} color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
              Closing Message
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={handleCopySummary}
            style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: isDark ? theme.surface1 : theme.surface0 }]}
            testID="button-copy-summary"
          >
            <Feather name="copy" size={16} color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
              Copy
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  optionCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  optionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  recommendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: 2,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  laborGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  laborItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  confidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  assumptionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  actionsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  actionsRow: {
    marginBottom: Spacing.sm,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
  },
  secondaryRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
});
