import React from "react";
import { View, StyleSheet } from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { OptionPicker } from "@/components/OptionPicker";
import { Input } from "@/components/Input";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { CommercialWalkthrough, CommercialFrequency } from "../types";

interface Props {
  data: CommercialWalkthrough;
  onUpdate: (data: CommercialWalkthrough) => void;
}

const FREQUENCY_OPTIONS: { label: string; value: CommercialFrequency }[] = [
  { label: "1x/week", value: "1x" },
  { label: "2x/week", value: "2x" },
  { label: "3x/week", value: "3x" },
  { label: "5x/week", value: "5x" },
  { label: "Daily", value: "daily" },
  { label: "Custom", value: "custom" },
];

export default function FrequencyTimingStep({ data, onUpdate }: Props) {
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
        <ThemedText type="h3">Frequency & Timing</ThemedText>
        <ThemedText
          type="small"
          style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
        >
          How often and when should the cleaning take place?
        </ThemedText>
      </View>

      <OptionPicker
        label="Cleaning Frequency"
        options={FREQUENCY_OPTIONS}
        value={data.frequency}
        onChange={(v) => updateField("frequency", v)}
      />

      <SectionHeader title="Scheduling Preferences" />

      <Input
        label="Preferred Days"
        value={data.preferredDays}
        onChangeText={(v) => updateField("preferredDays", v)}
        placeholder="Mon, Wed, Fri"
        leftIcon="calendar"
        testID="input-preferred-days"
      />

      <Input
        label="Preferred Time Window"
        value={data.preferredTimeWindow}
        onChangeText={(v) => updateField("preferredTimeWindow", v)}
        placeholder="6:00 PM - 10:00 PM"
        leftIcon="clock"
        testID="input-preferred-time"
      />

      <Input
        label="Max Duration Per Visit (minutes)"
        value={data.durationPerVisitConstraint > 0 ? data.durationPerVisitConstraint.toString() : ""}
        onChangeText={(v) => updateField("durationPerVisitConstraint", parseInt(v) || 0)}
        placeholder="No limit"
        keyboardType="number-pad"
        leftIcon="watch"
        testID="input-duration-constraint"
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
