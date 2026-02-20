import React, { useState, useMemo } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface UnderpricingAlertProps {
  total: number;
  sqft: number | null;
  beds: number | null;
  baths: number | null;
  frequency: string | null;
}

function getFrequencyDiscount(frequency: string | null): number {
  if (!frequency) return 0;
  const f = frequency.toLowerCase();
  if (f.includes("weekly") && !f.includes("bi")) return 0.15;
  if (f.includes("biweekly") || f.includes("bi-weekly") || f.includes("every other")) return 0.10;
  if (f.includes("monthly")) return 0.05;
  return 0;
}

function calculateMarketRate(
  sqft: number | null,
  beds: number | null,
  baths: number | null,
  frequency: string | null
): { low: number; high: number; baseline: number } {
  const sqftVal = sqft || 0;
  const bedsVal = beds || 0;
  const bathsVal = baths || 0;

  const baseLow = Math.max(120, sqftVal * 0.10 + bedsVal * 15 + bathsVal * 20);
  const baseHigh = Math.max(120, sqftVal * 0.15 + bedsVal * 15 + bathsVal * 20);
  const baseBaseline = Math.max(120, sqftVal * 0.12 + bedsVal * 15 + bathsVal * 20);

  const discount = getFrequencyDiscount(frequency);

  return {
    low: Math.round(baseLow * (1 - discount)),
    high: Math.round(baseHigh * (1 - discount)),
    baseline: Math.round(baseBaseline * (1 - discount)),
  };
}

export function UnderpricingAlert({ total, sqft, beds, baths, frequency }: UnderpricingAlertProps) {
  const { theme } = useTheme();
  const [dismissed, setDismissed] = useState(false);

  const marketRate = useMemo(
    () => calculateMarketRate(sqft, beds, baths, frequency),
    [sqft, beds, baths, frequency]
  );

  const isUnderpriced = total < marketRate.baseline * 0.8;

  if (dismissed || !isUnderpriced) return null;

  const warningBg = theme.gradientWarning;
  const warningBorder = `${theme.warning}40`;
  const warningText = theme.warning;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: warningBg, borderColor: warningBorder },
      ]}
      testID="underpricing-alert"
    >
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: `${theme.warning}20` }]}>
          <Feather name="alert-triangle" size={18} color={warningText} />
        </View>
        <View style={styles.textWrap}>
          <ThemedText type="small" style={{ fontWeight: "600", color: warningText }}>
            Your price may be below market rate
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
            {"Based on property size, the typical rate is $"}{marketRate.low}{"-$"}{marketRate.high}{". Your quote is $"}{total.toFixed(2)}{"."}
          </ThemedText>
        </View>
      </View>
      <Pressable
        onPress={() => setDismissed(true)}
        style={[styles.dismissBtn, { backgroundColor: `${theme.warning}15` }]}
        hitSlop={8}
        testID="underpricing-dismiss-btn"
      >
        <ThemedText type="caption" style={{ color: warningText, fontWeight: "600" }}>
          Dismiss
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  dismissBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
});
