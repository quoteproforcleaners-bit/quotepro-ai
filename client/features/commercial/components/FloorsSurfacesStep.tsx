import React from "react";
import { View, StyleSheet } from "react-native";
import { ScrollView } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { SliderInput } from "@/components/SliderInput";
import { OptionPicker } from "@/components/OptionPicker";
import { Toggle } from "@/components/Toggle";
import { SectionHeader } from "@/components/SectionHeader";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { CommercialWalkthrough, GlassLevel } from "../types";

interface Props {
  data: CommercialWalkthrough;
  onUpdate: (data: CommercialWalkthrough) => void;
}

const GLASS_OPTIONS: { label: string; value: GlassLevel }[] = [
  { label: "None", value: "None" },
  { label: "Some", value: "Some" },
  { label: "Lots", value: "Lots" },
];

export default function FloorsSurfacesStep({ data, onUpdate }: Props) {
  const { theme } = useTheme();

  const updateField = <K extends keyof CommercialWalkthrough>(
    key: K,
    value: CommercialWalkthrough[K]
  ) => {
    onUpdate({ ...data, [key]: value });
  };

  const handleCarpetChange = (v: number) => {
    const carpet = Math.round(v);
    updateField("carpetPercent", carpet);
    onUpdate({ ...data, carpetPercent: carpet, hardFloorPercent: 100 - carpet });
  };

  const surfaceSum = data.carpetPercent + data.hardFloorPercent;
  const surfaceValid = surfaceSum === 100;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <ThemedText type="h3">Floors & Surfaces</ThemedText>
        <ThemedText
          type="small"
          style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
        >
          Describe the flooring and surface types in the facility.
        </ThemedText>
      </View>

      <SectionHeader title="Floor Coverage" />

      <SliderInput
        label="Carpet Coverage"
        value={data.carpetPercent}
        minimumValue={0}
        maximumValue={100}
        step={5}
        onChange={handleCarpetChange}
        formatValue={(v) => `${Math.round(v)}%`}
      />

      <SliderInput
        label="Hard Floor Coverage"
        value={data.hardFloorPercent}
        minimumValue={0}
        maximumValue={100}
        step={5}
        onChange={(v) => {
          const hard = Math.round(v);
          onUpdate({ ...data, hardFloorPercent: hard, carpetPercent: 100 - hard });
        }}
        formatValue={(v) => `${Math.round(v)}%`}
      />

      {!surfaceValid ? (
        <Card variant="warning" style={{ marginBottom: Spacing.lg }}>
          <ThemedText type="small" style={{ color: theme.warning }}>
            {"Carpet + Hard Floor must equal 100%. Currently: " + surfaceSum + "%"}
          </ThemedText>
        </Card>
      ) : null}

      <SectionHeader title="Glass & Windows" />

      <OptionPicker
        label="Glass Level"
        options={GLASS_OPTIONS}
        value={data.glassLevel}
        onChange={(v) => updateField("glassLevel", v)}
      />

      <SectionHeader title="Sanitization" />

      <Toggle
        label="High-Touch Focus"
        description="Extra attention to handles, switches, and shared surfaces"
        value={data.highTouchFocus}
        onChange={(v) => updateField("highTouchFocus", v)}
      />
    </ScrollView>
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
