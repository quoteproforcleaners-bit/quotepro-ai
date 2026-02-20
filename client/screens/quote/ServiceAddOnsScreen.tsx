import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { ScrollView } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Toggle } from "@/components/Toggle";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { ServiceFrequency, AddOns, PricingSettings } from "@/types";

interface Props {
  frequency: ServiceFrequency;
  addOns: AddOns;
  pricingSettings: PricingSettings;
  onFrequencyChange: (frequency: ServiceFrequency) => void;
  onAddOnsChange: (addOns: AddOns) => void;
}

export default function ServiceAddOnsScreen({
  frequency,
  addOns,
  pricingSettings,
  onFrequencyChange,
  onAddOnsChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const frequencyOptions: { label: string; value: ServiceFrequency }[] = [
    { label: "One-time", value: "one-time" },
    { label: "Weekly", value: "weekly" },
    { label: "Biweekly", value: "biweekly" },
    { label: "Monthly", value: "monthly" },
  ];

  const updateAddOn = (key: keyof AddOns, value: boolean) => {
    onAddOnsChange({ ...addOns, [key]: value });
  };

  const { addOnPrices } = pricingSettings;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <View style={styles.header}>
        <ThemedText type="h3">Service Details</ThemedText>
        <ThemedText
          type="small"
          style={[styles.subtitle, { color: theme.textSecondary }]}
        >
          Choose frequency and any add-on services.
        </ThemedText>
      </View>

      <SectionHeader
        title="Service Frequency"
        subtitle="Recurring services receive discounts"
      />

      <SegmentedControl
        options={frequencyOptions}
        value={frequency}
        onChange={onFrequencyChange}
      />

      {frequency !== "one-time" ? (
        <View
          style={[
            styles.discountNote,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <ThemedText type="small" style={{ color: theme.success }}>
            {frequency === "weekly"
              ? "15%"
              : frequency === "biweekly"
                ? "10%"
                : "5%"}{" "}
            recurring discount applied
          </ThemedText>
        </View>
      ) : null}

      <SectionHeader
        title="Add-on Services"
        subtitle="Extra services at additional cost"
      />

      <View style={styles.toggleList}>
        <Toggle
          label="Inside Fridge"
          description="Deep clean refrigerator interior"
          value={addOns.insideFridge}
          onChange={(v) => updateAddOn("insideFridge", v)}
          price={`+$${addOnPrices.insideFridge}`}
        />

        <Toggle
          label="Inside Oven"
          description="Deep clean oven interior"
          value={addOns.insideOven}
          onChange={(v) => updateAddOn("insideOven", v)}
          price={`+$${addOnPrices.insideOven}`}
        />

        <Toggle
          label="Inside Cabinets"
          description="Clean cabinet interiors"
          value={addOns.insideCabinets}
          onChange={(v) => updateAddOn("insideCabinets", v)}
          price={`+$${addOnPrices.insideCabinets}`}
        />

        <Toggle
          label="Interior Windows"
          description="Clean interior window surfaces"
          value={addOns.interiorWindows}
          onChange={(v) => updateAddOn("interiorWindows", v)}
          price={`+$${addOnPrices.interiorWindows}`}
        />

        <Toggle
          label="Blinds Detail"
          description="Detailed blind cleaning"
          value={addOns.blindsDetail}
          onChange={(v) => updateAddOn("blindsDetail", v)}
          price={`+$${addOnPrices.blindsDetail}`}
        />

        <Toggle
          label="Baseboards Detail"
          description="Detailed baseboard cleaning"
          value={addOns.baseboardsDetail}
          onChange={(v) => updateAddOn("baseboardsDetail", v)}
          price={`+$${addOnPrices.baseboardsDetail}`}
        />

        <Toggle
          label="Laundry Fold Only"
          description="Fold clean laundry"
          value={addOns.laundryFoldOnly}
          onChange={(v) => updateAddOn("laundryFoldOnly", v)}
          price={`+$${addOnPrices.laundryFoldOnly}`}
        />

        <Toggle
          label="Dishes"
          description="Wash and put away dishes"
          value={addOns.dishes}
          onChange={(v) => updateAddOn("dishes", v)}
          price={`+$${addOnPrices.dishes}`}
        />

        <Toggle
          label="Organization/Tidy"
          description="General tidying and organization"
          value={addOns.organizationTidy}
          onChange={(v) => updateAddOn("organizationTidy", v)}
          price={`+$${addOnPrices.organizationTidy}`}
        />
      </View>

      <SectionHeader
        title="Recurring Revenue"
        subtitle="Auto-scheduled services for ongoing revenue"
      />

      <View style={styles.toggleList}>
        <Toggle
          label="Biannual Deep Clean"
          description="A deep clean auto-scheduled 6 months from service start. Customer can opt out."
          value={addOns.biannualDeepClean}
          onChange={(v) => updateAddOn("biannualDeepClean", v)}
          price={`+$${addOnPrices.biannualDeepClean}`}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  subtitle: {
    marginTop: Spacing.xs,
  },
  discountNote: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: "center",
  },
  toggleList: {
    gap: Spacing.xs,
  },
});
