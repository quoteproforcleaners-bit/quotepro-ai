import React from "react";
import { View, StyleSheet } from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { NumberStepper } from "@/components/NumberStepper";
import { OptionPicker } from "@/components/OptionPicker";
import { Toggle } from "@/components/Toggle";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { CommercialWalkthrough, FacilityType } from "../types";

interface Props {
  data: CommercialWalkthrough;
  onUpdate: (data: CommercialWalkthrough) => void;
}

const FACILITY_OPTIONS: { label: string; value: FacilityType }[] = [
  { label: "Office", value: "Office" },
  { label: "Retail", value: "Retail" },
  { label: "Medical", value: "Medical" },
  { label: "Gym", value: "Gym" },
  { label: "School", value: "School" },
  { label: "Warehouse", value: "Warehouse" },
  { label: "Restaurant", value: "Restaurant" },
  { label: "Other", value: "Other" },
];

export default function SiteBasicsStep({ data, onUpdate }: Props) {
  const { theme } = useTheme();

  const updateField = <K extends keyof CommercialWalkthrough>(
    key: K,
    value: CommercialWalkthrough[K]
  ) => {
    onUpdate({ ...data, [key]: value });
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <ThemedText type="h3">Site Basics</ThemedText>
        <ThemedText
          type="small"
          style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
        >
          Enter the facility information for this commercial quote.
        </ThemedText>
      </View>

      <Input
        label="Business / Facility Name"
        value={data.facilityName}
        onChangeText={(v) => updateField("facilityName", v)}
        placeholder="ABC Office Building"
        leftIcon="briefcase"
        testID="input-facility-name"
      />

      <Input
        label="Site Address"
        value={data.siteAddress}
        onChangeText={(v) => updateField("siteAddress", v)}
        placeholder="123 Main St, Suite 100"
        leftIcon="map-pin"
        testID="input-site-address"
      />

      <OptionPicker
        label="Facility Type"
        options={FACILITY_OPTIONS}
        value={data.facilityType}
        onChange={(v) => updateField("facilityType", v)}
      />

      <Input
        label="Total Square Footage"
        value={data.totalSqFt > 0 ? data.totalSqFt.toString() : ""}
        onChangeText={(v) => updateField("totalSqFt", parseInt(v) || 0)}
        placeholder="5000"
        keyboardType="number-pad"
        leftIcon="square"
        testID="input-total-sqft"
      />

      <SectionHeader title="Building Details" />

      <NumberStepper
        label="Floors"
        value={data.floors}
        min={1}
        max={20}
        onChange={(v) => updateField("floors", v)}
      />

      <Toggle
        label="After-Hours Access Required"
        description="Cleaning will occur outside normal business hours"
        value={data.afterHoursRequired}
        onChange={(v) => updateField("afterHoursRequired", v)}
      />

      <Input
        label="Access Constraints"
        value={data.accessConstraints}
        onChangeText={(v) => updateField("accessConstraints", v)}
        placeholder="Key card needed, alarm code, etc."
        multiline
        numberOfLines={3}
        testID="input-access-constraints"
      />
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing["3xl"],
  },
  header: {
    marginBottom: Spacing.lg,
  },
});
