import React, { useMemo } from "react";
import { View, ScrollView, StyleSheet, TextInput, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Card } from "@/components/Card";
import { ThemedText } from "@/components/ThemedText";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  CommercialWalkthrough,
  CommercialLaborEstimate,
} from "../types";
import {
  calculateLaborEstimate,
  DEFAULT_TARGET_MINUTES_PER_CLEANER,
} from "../laborModel";

interface LaborEstimateScreenProps {
  walkthrough: CommercialWalkthrough;
  laborEstimate: CommercialLaborEstimate;
  onUpdate: (estimate: CommercialLaborEstimate) => void;
  onNext: () => void;
}

function BreakdownRow({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: any;
}) {
  return (
    <View style={styles.breakdownRow}>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
      <ThemedText type="body" style={{ fontWeight: "600" }}>
        {value}
      </ThemedText>
    </View>
  );
}

export default function LaborEstimateScreen({
  walkthrough,
  laborEstimate,
  onUpdate,
  onNext,
}: LaborEstimateScreenProps) {
  const { theme, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;

  const rawEstimate = useMemo(
    () => calculateLaborEstimate(walkthrough),
    [walkthrough]
  );

  const effectiveHours =
    laborEstimate.overrideHours ?? laborEstimate.rawHours;
  const effectiveMinutes = Math.round(effectiveHours * 60);
  const effectiveCleaners = Math.max(
    1,
    Math.ceil(effectiveMinutes / laborEstimate.targetMinutesPerCleaner)
  );

  const handleOverrideHours = (text: string) => {
    const parsed = parseFloat(text);
    if (text === "" || text === ".") {
      onUpdate({ ...laborEstimate, overrideHours: undefined });
      return;
    }
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdate({ ...laborEstimate, overrideHours: parsed });
    }
  };

  const handleTargetMinutes = (text: string) => {
    const parsed = parseInt(text, 10);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdate({ ...laborEstimate, targetMinutesPerCleaner: parsed });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, ...(useMaxWidth ? [{ maxWidth: 560, alignSelf: "center" as const, width: "100%" as any }] : [])]}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          title="Labor Estimate"
          subtitle="Review the calculated labor requirements"
        />

        <Card variant="emphasis" style={styles.summaryCard}>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Feather
                name="clock"
                size={24}
                color={theme.primary}
                style={styles.summaryIcon}
              />
              <ThemedText type="h2" style={{ color: theme.primary }}>
                {effectiveHours.toFixed(1)}
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary }}
              >
                hours/visit
              </ThemedText>
            </View>
            <View
              style={[styles.summaryDivider, { backgroundColor: theme.border }]}
            />
            <View style={styles.summaryItem}>
              <Feather
                name="users"
                size={24}
                color={theme.primary}
                style={styles.summaryIcon}
              />
              <ThemedText type="h2" style={{ color: theme.primary }}>
                {effectiveCleaners}
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary }}
              >
                cleaners
              </ThemedText>
            </View>
            <View
              style={[styles.summaryDivider, { backgroundColor: theme.border }]}
            />
            <View style={styles.summaryItem}>
              <Feather
                name="activity"
                size={24}
                color={theme.primary}
                style={styles.summaryIcon}
              />
              <ThemedText type="h2" style={{ color: theme.primary }}>
                {effectiveMinutes}
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary }}
              >
                min/visit
              </ThemedText>
            </View>
          </View>
        </Card>

        <SectionHeader
          title="Calculation Breakdown"
          subtitle="How we arrived at this estimate"
        />

        <Card style={styles.breakdownCard}>
          <BreakdownRow
            label="Facility type"
            value={walkthrough.facilityType}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <BreakdownRow
            label="Total area"
            value={`${walkthrough.totalSqFt.toLocaleString()} sq ft`}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <BreakdownRow
            label="Floors"
            value={`${walkthrough.floors}`}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <BreakdownRow
            label="Bathrooms"
            value={`${walkthrough.bathroomCount}`}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <BreakdownRow
            label="Breakrooms"
            value={`${walkthrough.breakroomCount}`}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <BreakdownRow
            label="Trash points"
            value={`${walkthrough.trashPointCount}`}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <BreakdownRow
            label="Glass level"
            value={walkthrough.glassLevel}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <BreakdownRow
            label="High-touch focus"
            value={walkthrough.highTouchFocus ? "Yes" : "No"}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <BreakdownRow
            label="Carpet / Hard floor"
            value={`${walkthrough.carpetPercent}% / ${walkthrough.hardFloorPercent}%`}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.divider }]} />
          <BreakdownRow
            label="Raw estimate"
            value={`${rawEstimate.rawMinutes} min (${rawEstimate.rawHours} hrs)`}
            theme={theme}
          />
        </Card>

        <SectionHeader
          title="Override Settings"
          subtitle="Adjust if you know the job better"
        />

        <Card style={styles.overrideCard}>
          <View style={styles.overrideRow}>
            <View style={styles.overrideLabel}>
              <ThemedText type="body" style={{ fontWeight: "500" }}>
                Labor hours/visit
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary }}
              >
                Leave blank to use calculated estimate
              </ThemedText>
            </View>
            <TextInput
              style={[
                styles.overrideInput,
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={
                laborEstimate.overrideHours !== undefined
                  ? String(laborEstimate.overrideHours)
                  : ""
              }
              onChangeText={handleOverrideHours}
              placeholder={String(rawEstimate.rawHours)}
              placeholderTextColor={theme.textMuted}
              keyboardType="decimal-pad"
              testID="input-override-hours"
            />
          </View>

          <View
            style={[styles.divider, { backgroundColor: theme.divider }]}
          />

          <View style={styles.overrideRow}>
            <View style={styles.overrideLabel}>
              <ThemedText type="body" style={{ fontWeight: "500" }}>
                Target min/cleaner
              </ThemedText>
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary }}
              >
                Default: {DEFAULT_TARGET_MINUTES_PER_CLEANER} minutes
              </ThemedText>
            </View>
            <TextInput
              style={[
                styles.overrideInput,
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={String(laborEstimate.targetMinutesPerCleaner)}
              onChangeText={handleTargetMinutes}
              keyboardType="number-pad"
              testID="input-target-minutes"
            />
          </View>
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View
        style={[styles.footer, { backgroundColor: theme.backgroundDefault, borderTopColor: theme.border }]}
      >
        <Button onPress={onNext} testID="button-next-pricing">
          Next: Pricing
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
  summaryCard: {
    marginBottom: Spacing.lg,
  },
  summaryGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryIcon: {
    marginBottom: Spacing.sm,
  },
  summaryDivider: {
    width: 1,
    height: 60,
  },
  breakdownCard: {
    marginBottom: Spacing.lg,
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
  overrideCard: {
    marginBottom: Spacing.lg,
  },
  overrideRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  overrideLabel: {
    flex: 1,
    marginRight: Spacing.md,
  },
  overrideInput: {
    width: 80,
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
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
