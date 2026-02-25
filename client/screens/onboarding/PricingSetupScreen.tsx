import React, { useState } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { PricingSettings, DEFAULT_PRICING_SETTINGS } from "@/types";

interface Props {
  navigation: NativeStackNavigationProp<any>;
  settings: PricingSettings;
  onUpdate: (settings: PricingSettings) => void;
  onComplete: () => void;
}

export default function PricingSetupScreen({
  navigation,
  settings,
  onUpdate,
  onComplete,
}: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;
  const [hourlyRate, setHourlyRate] = useState(settings.hourlyRate.toString());
  const [minimumTicket, setMinimumTicket] = useState(
    settings.minimumTicket.toString()
  );
  const [taxRate, setTaxRate] = useState(settings.taxRate.toString());

  const handleComplete = () => {
    onUpdate({
      ...settings,
      hourlyRate: parseFloat(hourlyRate) || DEFAULT_PRICING_SETTINGS.hourlyRate,
      minimumTicket:
        parseFloat(minimumTicket) || DEFAULT_PRICING_SETTINGS.minimumTicket,
      taxRate: parseFloat(taxRate) || 0,
    });
    onComplete();
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
        useMaxWidth ? { alignItems: "center" } : undefined,
      ]}
    >
      <View style={useMaxWidth ? { maxWidth: 560, width: "100%" } : { width: "100%" }}>
      <View style={styles.header}>
        <ThemedText type="hero" style={styles.title}>
          Set Your Pricing
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.subtitle, { color: theme.textSecondary }]}
        >
          Configure your base rates. You can adjust these anytime in Settings.
        </ThemedText>
      </View>

      <SectionHeader title="Base Rates" />

      <Input
        label="Hourly Rate"
        value={hourlyRate}
        onChangeText={setHourlyRate}
        placeholder="55"
        keyboardType="decimal-pad"
        leftIcon="dollar-sign"
      />

      <Input
        label="Minimum Ticket"
        value={minimumTicket}
        onChangeText={setMinimumTicket}
        placeholder="179"
        keyboardType="decimal-pad"
        leftIcon="tag"
      />

      <Input
        label="Tax Rate (%)"
        value={taxRate}
        onChangeText={setTaxRate}
        placeholder="0"
        keyboardType="decimal-pad"
        leftIcon="percent"
      />

      <SectionHeader
        title="Add-on Pricing"
        subtitle="Default prices for common add-on services"
      />

      <View
        style={[
          styles.infoBox,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Add-on prices use industry defaults. You can customize these later in
          the Pricing tab.
        </ThemedText>
      </View>

      <View style={styles.addOnsList}>
        <View style={styles.addOnRow}>
          <ThemedText type="body">Inside Fridge</ThemedText>
          <ThemedText
            type="body"
            style={{ color: theme.primary, fontWeight: "600" }}
          >
            ${settings.addOnPrices.insideFridge}
          </ThemedText>
        </View>
        <View style={styles.addOnRow}>
          <ThemedText type="body">Inside Oven</ThemedText>
          <ThemedText
            type="body"
            style={{ color: theme.primary, fontWeight: "600" }}
          >
            ${settings.addOnPrices.insideOven}
          </ThemedText>
        </View>
        <View style={styles.addOnRow}>
          <ThemedText type="body">Interior Windows</ThemedText>
          <ThemedText
            type="body"
            style={{ color: theme.primary, fontWeight: "600" }}
          >
            ${settings.addOnPrices.interiorWindows}
          </ThemedText>
        </View>
        <View style={styles.addOnRow}>
          <ThemedText type="body">Baseboards Detail</ThemedText>
          <ThemedText
            type="body"
            style={{ color: theme.primary, fontWeight: "600" }}
          >
            ${settings.addOnPrices.baseboardsDetail}
          </ThemedText>
        </View>
      </View>

      <View style={styles.actions}>
        <Button onPress={handleComplete} style={styles.completeButton}>
          Get Started
        </Button>
      </View>
      </View>
    </KeyboardAwareScrollViewCompat>
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
    marginBottom: Spacing.xl,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {},
  infoBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.lg,
  },
  addOnsList: {
    gap: Spacing.md,
  },
  addOnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  actions: {
    marginTop: Spacing["3xl"],
  },
  completeButton: {},
});
