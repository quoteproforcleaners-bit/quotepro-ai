import React from "react";
import { View, StyleSheet } from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Toggle } from "@/components/Toggle";
import { Input } from "@/components/Input";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { CommercialWalkthrough } from "../types";

interface Props {
  data: CommercialWalkthrough;
  onUpdate: (data: CommercialWalkthrough) => void;
}

export default function SuppliesEquipmentStep({ data, onUpdate }: Props) {
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
        <ThemedText type="h3">Supplies & Equipment</ThemedText>
        <ThemedText
          type="small"
          style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
        >
          Who provides cleaning supplies and any special requirements?
        </ThemedText>
      </View>

      <SectionHeader title="Supply Responsibility" />

      <Toggle
        label="Client Provides Supplies"
        description="The client will supply all cleaning products and equipment"
        value={data.suppliesByClient}
        onChange={(v) => updateField("suppliesByClient", v)}
      />

      <Toggle
        label="Restroom Consumables Included"
        description="Toilet paper, hand soap, paper towels restocking"
        value={data.restroomConsumablesIncluded}
        onChange={(v) => updateField("restroomConsumablesIncluded", v)}
      />

      <SectionHeader title="Special Requirements" />

      <Input
        label="Special Chemicals or Equipment"
        value={data.specialChemicals}
        onChangeText={(v) => updateField("specialChemicals", v)}
        placeholder="Green-certified products, specific disinfectants, etc."
        multiline
        numberOfLines={4}
        testID="input-special-chemicals"
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
