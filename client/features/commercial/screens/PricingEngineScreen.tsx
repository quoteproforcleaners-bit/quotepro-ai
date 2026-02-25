import React, { useMemo, useState } from "react";
import { View, ScrollView, StyleSheet, TextInput, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { ThemedText } from "@/components/ThemedText";
import { SectionHeader } from "@/components/SectionHeader";
import { SliderInput } from "@/components/SliderInput";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { MarginBadge } from "../components/MarginBadge";
import {
  CommercialLaborEstimate,
  CommercialPricing,
  RoundingRule,
  SuppliesSurchargeType,
  CommercialFrequency,
} from "../types";
import {
  calculateCommercialPricing,
  PricingInputs,
  FREQUENCY_VISITS_PER_MONTH,
} from "../laborModel";

interface PricingEngineScreenProps {
  laborEstimate: CommercialLaborEstimate;
  pricing: CommercialPricing;
  frequency: CommercialFrequency;
  onUpdate: (pricing: CommercialPricing) => void;
  onNext: () => void;
}

const ROUNDING_OPTIONS: { label: string; value: RoundingRule }[] = [
  { label: "None", value: "none" },
  { label: "$5", value: "5" },
  { label: "$10", value: "10" },
  { label: "$25", value: "25" },
];

const SURCHARGE_TYPE_OPTIONS: {
  label: string;
  value: SuppliesSurchargeType;
}[] = [
  { label: "Fixed $", value: "fixed" },
  { label: "Percent %", value: "percent" },
];

export default function PricingEngineScreen({
  laborEstimate,
  pricing,
  frequency,
  onUpdate,
  onNext,
}: PricingEngineScreenProps) {
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;

  const [hourlyRate, setHourlyRate] = useState(pricing.hourlyRate || 35);
  const [overheadPct, setOverheadPct] = useState(pricing.overheadPct || 15);
  const [targetMarginPct, setTargetMarginPct] = useState(
    pricing.targetMarginPct || 20
  );
  const [suppliesSurcharge, setSuppliesSurcharge] = useState(
    pricing.suppliesSurcharge || 0
  );
  const [suppliesSurchargeType, setSuppliesSurchargeType] =
    useState<SuppliesSurchargeType>(pricing.suppliesSurchargeType || "fixed");
  const [roundingRule, setRoundingRule] = useState<RoundingRule>(
    pricing.roundingRule || "none"
  );
  const [manualPrice, setManualPrice] = useState<string>("");

  const calculatedPricing = useMemo(() => {
    const inputs: PricingInputs = {
      hourlyRate,
      overheadPct,
      targetMarginPct,
      suppliesSurcharge,
      suppliesSurchargeType,
      roundingRule,
      frequency,
    };
    return calculateCommercialPricing(laborEstimate, inputs);
  }, [
    hourlyRate,
    overheadPct,
    targetMarginPct,
    suppliesSurcharge,
    suppliesSurchargeType,
    roundingRule,
    frequency,
    laborEstimate,
  ]);

  const finalPrice =
    manualPrice !== "" ? parseFloat(manualPrice) || 0 : calculatedPricing.finalPricePerVisit;

  const effectiveHours =
    laborEstimate.overrideHours ?? laborEstimate.rawHours;
  const laborCost = effectiveHours * hourlyRate;
  const overheadAmount = laborCost * (overheadPct / 100);
  const baseCost = laborCost + overheadAmount;
  let suppliesAmount = 0;
  if (suppliesSurchargeType === "fixed") {
    suppliesAmount = suppliesSurcharge;
  } else {
    suppliesAmount = baseCost * (suppliesSurcharge / 100);
  }
  const totalCost = baseCost + suppliesAmount;
  const actualMargin =
    finalPrice > 0 ? ((finalPrice - totalCost) / finalPrice) * 100 : 0;

  const visitsPerMonth = FREQUENCY_VISITS_PER_MONTH[frequency];
  const monthlyTotal = finalPrice * visitsPerMonth;

  const handleNext = () => {
    const updated: CommercialPricing = {
      hourlyRate,
      overheadPct,
      targetMarginPct,
      suppliesSurcharge,
      suppliesSurchargeType,
      finalPricePerVisit: finalPrice,
      monthlyPrice: monthlyTotal,
      roundingRule,
    };
    onUpdate(updated);
    onNext();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, ...(useMaxWidth ? [{ maxWidth: 560, alignSelf: "center" as const, width: "100%" }] : [])]}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          title="Pricing Engine"
          subtitle="Set your rates and margins"
        />

        <Card variant="emphasis" style={styles.priceCard}>
          <View style={styles.priceHeader}>
            <View style={styles.priceColumn}>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary }}
              >
                Per Visit
              </ThemedText>
              <ThemedText type="h1" style={{ color: theme.primary }}>
                ${finalPrice.toFixed(2)}
              </ThemedText>
            </View>
            <View
              style={[styles.priceDivider, { backgroundColor: theme.border }]}
            />
            <View style={styles.priceColumn}>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary }}
              >
                Monthly ({visitsPerMonth} visits)
              </ThemedText>
              <ThemedText type="h2" style={{ color: theme.primary }}>
                ${monthlyTotal.toFixed(2)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.badgeRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Margin Health
            </ThemedText>
            <MarginBadge
              actualMargin={actualMargin}
              targetMargin={targetMarginPct}
            />
          </View>
        </Card>

        <SectionHeader title="Labor Rate" />

        <Card style={styles.sectionCard}>
          <SliderInput
            label="Hourly Labor Rate"
            value={hourlyRate}
            minimumValue={15}
            maximumValue={100}
            step={1}
            onChange={setHourlyRate}
            formatValue={(v) => `$${v}`}
          />
        </Card>

        <SectionHeader title="Overhead & Margin" />

        <Card style={styles.sectionCard}>
          <SliderInput
            label="Overhead"
            value={overheadPct}
            minimumValue={0}
            maximumValue={50}
            step={1}
            onChange={setOverheadPct}
            formatValue={(v) => `${v}%`}
            description="Insurance, admin, equipment, etc."
          />
          <SliderInput
            label="Target Profit Margin"
            value={targetMarginPct}
            minimumValue={5}
            maximumValue={50}
            step={1}
            onChange={setTargetMarginPct}
            formatValue={(v) => `${v}%`}
          />
        </Card>

        <SectionHeader title="Supplies Surcharge" />

        <Card style={styles.sectionCard}>
          <SegmentedControl
            options={SURCHARGE_TYPE_OPTIONS}
            value={suppliesSurchargeType}
            onChange={setSuppliesSurchargeType}
          />
          <View style={styles.surchargeInput}>
            <SliderInput
              label={
                suppliesSurchargeType === "fixed"
                  ? "Surcharge Amount"
                  : "Surcharge Percentage"
              }
              value={suppliesSurcharge}
              minimumValue={0}
              maximumValue={suppliesSurchargeType === "fixed" ? 200 : 30}
              step={suppliesSurchargeType === "fixed" ? 5 : 1}
              onChange={setSuppliesSurcharge}
              formatValue={(v) =>
                suppliesSurchargeType === "fixed" ? `$${v}` : `${v}%`
              }
            />
          </View>
        </Card>

        <SectionHeader title="Rounding" />

        <Card style={styles.sectionCard}>
          <ThemedText
            type="small"
            style={[styles.roundingLabel, { color: theme.textSecondary }]}
          >
            Round to nearest
          </ThemedText>
          <SegmentedControl
            options={ROUNDING_OPTIONS}
            value={roundingRule}
            onChange={setRoundingRule}
          />
        </Card>

        <SectionHeader title="Manual Price Override" />

        <Card style={styles.sectionCard}>
          <View style={styles.manualRow}>
            <ThemedText type="body" style={{ fontWeight: "500" }}>
              Final price per visit
            </ThemedText>
            <View style={styles.manualInputWrap}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                $
              </ThemedText>
              <TextInput
                style={[
                  styles.manualInput,
                  {
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={manualPrice}
                onChangeText={setManualPrice}
                placeholder={calculatedPricing.finalPricePerVisit.toFixed(2)}
                placeholderTextColor={theme.textMuted}
                keyboardType="decimal-pad"
                testID="input-manual-price"
              />
            </View>
          </View>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
          >
            Leave blank to use the calculated price
          </ThemedText>
        </Card>

        <SectionHeader title="Cost Breakdown" />

        <Card style={styles.sectionCard}>
          <View style={styles.breakdownRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Labor ({effectiveHours.toFixed(1)} hrs x ${hourlyRate}/hr)
            </ThemedText>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              ${laborCost.toFixed(2)}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <View style={styles.breakdownRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Overhead ({overheadPct}%)
            </ThemedText>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              ${overheadAmount.toFixed(2)}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <View style={styles.breakdownRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Supplies
            </ThemedText>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              ${suppliesAmount.toFixed(2)}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <View style={styles.breakdownRow}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              Total Cost
            </ThemedText>
            <ThemedText type="body" style={{ fontWeight: "700" }}>
              ${totalCost.toFixed(2)}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <View style={styles.breakdownRow}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              Profit
            </ThemedText>
            <ThemedText
              type="body"
              style={{
                fontWeight: "700",
                color:
                  finalPrice - totalCost >= 0 ? theme.success : theme.error,
              }}
            >
              ${(finalPrice - totalCost).toFixed(2)}
            </ThemedText>
          </View>
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: theme.backgroundDefault, borderTopColor: theme.border },
        ]}
      >
        <Button onPress={handleNext} testID="button-next-tiers">
          Next: Tier Builder
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing["3xl"],
  },
  priceCard: {
    marginBottom: Spacing.lg,
  },
  priceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  priceColumn: {
    flex: 1,
    alignItems: "center",
  },
  priceDivider: {
    width: 1,
    height: 50,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionCard: {
    marginBottom: Spacing.lg,
  },
  surchargeInput: {
    marginTop: Spacing.lg,
  },
  roundingLabel: {
    marginBottom: Spacing.sm,
  },
  manualRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  manualInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  manualInput: {
    width: 100,
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  divider: {
    height: 1,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
  },
  bottomSpacer: {
    height: Spacing["3xl"],
  },
});
