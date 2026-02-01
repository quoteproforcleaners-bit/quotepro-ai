import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Input } from "@/components/Input";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { PricingSettings, DEFAULT_PRICING_SETTINGS } from "@/types";
import { getPricingSettings, savePricingSettings } from "@/lib/storage";

export default function PricingScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const [settings, setSettings] = useState<PricingSettings>(
    DEFAULT_PRICING_SETTINGS
  );

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const loadSettings = async () => {
    const data = await getPricingSettings();
    setSettings(data);
  };

  const updateSetting = async <K extends keyof PricingSettings>(
    key: K,
    value: PricingSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await savePricingSettings(newSettings);
    Haptics.selectionAsync();
  };

  const updateAddOnPrice = async (
    key: keyof PricingSettings["addOnPrices"],
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;
    const newSettings = {
      ...settings,
      addOnPrices: { ...settings.addOnPrices, [key]: numValue },
    };
    setSettings(newSettings);
    await savePricingSettings(newSettings);
  };

  const updateDiscount = async (
    key: keyof PricingSettings["frequencyDiscounts"],
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;
    const newSettings = {
      ...settings,
      frequencyDiscounts: { ...settings.frequencyDiscounts, [key]: numValue },
    };
    setSettings(newSettings);
    await savePricingSettings(newSettings);
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <SectionHeader
        title="Base Rates"
        subtitle="Your standard pricing configuration"
      />

      <Input
        label="Hourly Rate ($)"
        value={settings.hourlyRate.toString()}
        onChangeText={(v) => updateSetting("hourlyRate", parseFloat(v) || 0)}
        keyboardType="decimal-pad"
        leftIcon="dollar-sign"
      />

      <Input
        label="Minimum Ticket ($)"
        value={settings.minimumTicket.toString()}
        onChangeText={(v) => updateSetting("minimumTicket", parseFloat(v) || 0)}
        keyboardType="decimal-pad"
        leftIcon="tag"
      />

      <Input
        label="Tax Rate (%)"
        value={settings.taxRate.toString()}
        onChangeText={(v) => updateSetting("taxRate", parseFloat(v) || 0)}
        keyboardType="decimal-pad"
        leftIcon="percent"
      />

      <SectionHeader
        title="Add-on Pricing"
        subtitle="Prices for additional services"
      />

      <View style={styles.addOnsGrid}>
        <View style={styles.addOnRow}>
          <Input
            label="Inside Fridge"
            value={settings.addOnPrices.insideFridge.toString()}
            onChangeText={(v) => updateAddOnPrice("insideFridge", v)}
            keyboardType="decimal-pad"
            style={styles.gridInput}
          />
          <Input
            label="Inside Oven"
            value={settings.addOnPrices.insideOven.toString()}
            onChangeText={(v) => updateAddOnPrice("insideOven", v)}
            keyboardType="decimal-pad"
            style={styles.gridInput}
          />
        </View>
        <View style={styles.addOnRow}>
          <Input
            label="Inside Cabinets"
            value={settings.addOnPrices.insideCabinets.toString()}
            onChangeText={(v) => updateAddOnPrice("insideCabinets", v)}
            keyboardType="decimal-pad"
            style={styles.gridInput}
          />
          <Input
            label="Interior Windows"
            value={settings.addOnPrices.interiorWindows.toString()}
            onChangeText={(v) => updateAddOnPrice("interiorWindows", v)}
            keyboardType="decimal-pad"
            style={styles.gridInput}
          />
        </View>
        <View style={styles.addOnRow}>
          <Input
            label="Blinds Detail"
            value={settings.addOnPrices.blindsDetail.toString()}
            onChangeText={(v) => updateAddOnPrice("blindsDetail", v)}
            keyboardType="decimal-pad"
            style={styles.gridInput}
          />
          <Input
            label="Baseboards"
            value={settings.addOnPrices.baseboardsDetail.toString()}
            onChangeText={(v) => updateAddOnPrice("baseboardsDetail", v)}
            keyboardType="decimal-pad"
            style={styles.gridInput}
          />
        </View>
        <View style={styles.addOnRow}>
          <Input
            label="Laundry Fold"
            value={settings.addOnPrices.laundryFoldOnly.toString()}
            onChangeText={(v) => updateAddOnPrice("laundryFoldOnly", v)}
            keyboardType="decimal-pad"
            style={styles.gridInput}
          />
          <Input
            label="Dishes"
            value={settings.addOnPrices.dishes.toString()}
            onChangeText={(v) => updateAddOnPrice("dishes", v)}
            keyboardType="decimal-pad"
            style={styles.gridInput}
          />
        </View>
        <Input
          label="Organization/Tidy"
          value={settings.addOnPrices.organizationTidy.toString()}
          onChangeText={(v) => updateAddOnPrice("organizationTidy", v)}
          keyboardType="decimal-pad"
        />
      </View>

      <SectionHeader
        title="Frequency Discounts"
        subtitle="Discounts for recurring customers"
      />

      <Input
        label="Weekly Discount (%)"
        value={settings.frequencyDiscounts.weekly.toString()}
        onChangeText={(v) => updateDiscount("weekly", v)}
        keyboardType="decimal-pad"
        leftIcon="percent"
      />

      <Input
        label="Biweekly Discount (%)"
        value={settings.frequencyDiscounts.biweekly.toString()}
        onChangeText={(v) => updateDiscount("biweekly", v)}
        keyboardType="decimal-pad"
        leftIcon="percent"
      />

      <Input
        label="Monthly Discount (%)"
        value={settings.frequencyDiscounts.monthly.toString()}
        onChangeText={(v) => updateDiscount("monthly", v)}
        keyboardType="decimal-pad"
        leftIcon="percent"
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
  },
  addOnsGrid: {},
  addOnRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  gridInput: {
    flex: 1,
  },
});
