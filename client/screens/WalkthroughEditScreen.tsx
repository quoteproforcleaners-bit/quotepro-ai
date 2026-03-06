import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  TextInput,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { NumberStepper } from "@/components/NumberStepper";
import { OptionPicker } from "@/components/OptionPicker";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { ExtractedFields } from "@/lib/pricingRecommendationService";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type EditRoute = RouteProp<RootStackParamList, "WalkthroughEdit">;

const PROPERTY_TYPES = [
  { label: "House", value: "house" },
  { label: "Apartment", value: "apartment" },
  { label: "Townhome", value: "townhome" },
  { label: "Condo", value: "condo" },
  { label: "Office", value: "office" },
  { label: "Retail", value: "retail" },
  { label: "Medical", value: "medical" },
  { label: "Other", value: "other" },
];

const SERVICE_CATEGORIES = [
  { label: "Regular", value: "regular" },
  { label: "Deep Clean", value: "deep-clean" },
  { label: "Move In/Out", value: "move-in-out" },
  { label: "Post Construction", value: "post-construction" },
  { label: "Airbnb Turnover", value: "airbnb" },
  { label: "Touch Up", value: "touch-up" },
];

const FREQUENCY_OPTIONS = [
  { label: "One-time", value: "one-time" },
  { label: "Weekly", value: "weekly" },
  { label: "Biweekly", value: "biweekly" },
  { label: "Monthly", value: "monthly" },
];

const CONDITION_OPTIONS = [
  { label: "Excellent", value: "excellent" },
  { label: "Good", value: "good" },
  { label: "Average", value: "average" },
  { label: "Dirty", value: "dirty" },
  { label: "Very Dirty", value: "very dirty" },
];

const PET_TYPE_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Cat", value: "cat" },
  { label: "Dog", value: "dog" },
  { label: "Multiple", value: "multiple" },
];

const ADD_ON_OPTIONS = [
  { key: "fridge", label: "Inside Fridge" },
  { key: "oven", label: "Inside Oven" },
  { key: "cabinets", label: "Inside Cabinets" },
  { key: "windows", label: "Interior Windows" },
  { key: "blinds", label: "Blinds Detail" },
  { key: "baseboards", label: "Baseboards Detail" },
  { key: "laundry", label: "Laundry" },
  { key: "dishes", label: "Dishes" },
  { key: "organization", label: "Organization/Tidy" },
];

export default function WalkthroughEditScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<EditRoute>();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const { extractedFields, assumptions, confidence, description } = route.params;
  const initial = extractedFields as ExtractedFields;

  const [propertyType, setPropertyType] = useState(initial.propertyType || "house");
  const [serviceCategory, setServiceCategory] = useState(initial.serviceCategory || "regular");
  const [bedrooms, setBedrooms] = useState(initial.bedrooms || 3);
  const [bathrooms, setBathrooms] = useState(initial.bathrooms || 2);
  const [sqft, setSqft] = useState(String(initial.sqft || ""));
  const [frequency, setFrequency] = useState(initial.frequency || "one-time");
  const [conditionLevel, setConditionLevel] = useState(initial.conditionLevel || "good");
  const [petType, setPetType] = useState(initial.petType || "none");
  const [petCount, setPetCount] = useState(initial.petCount || 0);
  const [addOns, setAddOns] = useState<string[]>(initial.addOns || []);
  const [notes, setNotes] = useState(initial.notes || "");

  const toggleAddOn = (addOnLabel: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setAddOns((prev) =>
      prev.includes(addOnLabel)
        ? prev.filter((a) => a !== addOnLabel)
        : [...prev, addOnLabel]
    );
  };

  const handleSave = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const isCommercial = ["office", "retail", "medical", "other"].includes(propertyType);

    const updatedFields: ExtractedFields = {
      propertyType,
      serviceCategory,
      isCommercial,
      bedrooms,
      bathrooms,
      sqft: parseInt(sqft, 10) || 0,
      frequency,
      isFirstTimeClean: initial.isFirstTimeClean,
      isDeepClean: serviceCategory === "deep-clean",
      isMoveInOut: serviceCategory === "move-in-out",
      petCount,
      petType,
      addOns,
      conditionLevel,
      kitchenCondition: initial.kitchenCondition,
      floors: initial.floors,
      stairs: initial.stairs,
      officeCount: initial.officeCount,
      officeBathrooms: initial.officeBathrooms,
      breakrooms: initial.breakrooms,
      heavySoil: initial.heavySoil,
      urgency: initial.urgency,
      notes,
    };

    navigation.navigate("WalkthroughResults", {
      extractedFields: updatedFields,
      assumptions,
      confidence,
      description,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <Card variant="base" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${theme.primary}15` }]}>
              <Feather name="home" size={18} color={theme.primary} />
            </View>
            <ThemedText type="h4">Property Details</ThemedText>
          </View>

          <OptionPicker
            label="Property Type"
            options={PROPERTY_TYPES}
            value={propertyType}
            onChange={setPropertyType}
          />

          <NumberStepper
            label="Bedrooms"
            value={bedrooms}
            min={0}
            max={10}
            onChange={setBedrooms}
          />

          <NumberStepper
            label="Bathrooms"
            value={bathrooms}
            min={0}
            max={10}
            onChange={setBathrooms}
          />

          <View style={styles.inputRow}>
            <ThemedText type="body" style={{ fontWeight: "500" }}>
              Square Feet
            </ThemedText>
            <TextInput
              style={[
                styles.sqftInput,
                {
                  color: theme.text,
                  backgroundColor: isDark ? theme.surface0 : theme.backgroundRoot,
                  borderColor: theme.border,
                },
              ]}
              value={sqft}
              onChangeText={setSqft}
              keyboardType="numeric"
              placeholder="e.g. 1800"
              placeholderTextColor={theme.textMuted}
              testID="input-edit-sqft"
            />
          </View>
        </Card>

        <Card variant="base" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${theme.success}15` }]}>
              <Feather name="layers" size={18} color={theme.success} />
            </View>
            <ThemedText type="h4">Service & Frequency</ThemedText>
          </View>

          <OptionPicker
            label="Service Type"
            options={SERVICE_CATEGORIES}
            value={serviceCategory}
            onChange={setServiceCategory}
          />

          <OptionPicker
            label="Frequency"
            options={FREQUENCY_OPTIONS}
            value={frequency}
            onChange={setFrequency}
          />
        </Card>

        <Card variant="base" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${theme.warning}15` }]}>
              <Feather name="thermometer" size={18} color={theme.warning} />
            </View>
            <ThemedText type="h4">Condition & Pets</ThemedText>
          </View>

          <OptionPicker
            label="Condition"
            options={CONDITION_OPTIONS}
            value={conditionLevel}
            onChange={setConditionLevel}
          />

          <OptionPicker
            label="Pet Type"
            options={PET_TYPE_OPTIONS}
            value={petType}
            onChange={(val) => {
              setPetType(val);
              if (val === "none") setPetCount(0);
              else if (petCount === 0) setPetCount(1);
            }}
          />

          {petType !== "none" ? (
            <NumberStepper
              label="Number of Pets"
              value={petCount}
              min={1}
              max={10}
              onChange={setPetCount}
            />
          ) : null}
        </Card>

        <Card variant="base" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${theme.primary}15` }]}>
              <Feather name="plus-circle" size={18} color={theme.primary} />
            </View>
            <ThemedText type="h4">Add-Ons</ThemedText>
          </View>

          <View style={styles.addOnGrid}>
            {ADD_ON_OPTIONS.map((opt) => {
              const isSelected = addOns.includes(opt.label);
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => toggleAddOn(opt.label)}
                  style={[
                    styles.addOnChip,
                    {
                      backgroundColor: isSelected
                        ? isDark
                          ? `${theme.primary}25`
                          : `${theme.primary}10`
                        : isDark
                          ? theme.surface0
                          : theme.backgroundRoot,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                  testID={`toggle-addon-${opt.key}`}
                >
                  <Feather
                    name={isSelected ? "check-circle" : "circle"}
                    size={16}
                    color={isSelected ? theme.primary : theme.textMuted}
                  />
                  <ThemedText
                    type="small"
                    style={{
                      color: isSelected ? theme.primary : theme.text,
                      fontWeight: isSelected ? "600" : "400",
                    }}
                  >
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card variant="base" style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${theme.textMuted}15` }]}>
              <Feather name="file-text" size={18} color={theme.textMuted} />
            </View>
            <ThemedText type="h4">Notes</ThemedText>
          </View>

          <TextInput
            style={[
              styles.notesInput,
              {
                color: theme.text,
                backgroundColor: isDark ? theme.surface0 : theme.backgroundRoot,
                borderColor: theme.border,
              },
            ]}
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
            placeholder="Additional notes..."
            placeholderTextColor={theme.textMuted}
            testID="input-edit-notes"
          />
        </Card>
      </KeyboardAwareScrollViewCompat>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.backgroundRoot,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + Spacing.md,
          },
        ]}
      >
        <Pressable
          onPress={handleSave}
          style={[styles.saveButton, { backgroundColor: theme.primary }]}
          testID="button-save-edits"
        >
          <Feather name="refresh-cw" size={18} color="#FFFFFF" />
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700" }}>
            Recalculate & View Results
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  sqftInput: {
    width: 120,
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    textAlign: "right",
  },
  addOnGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  addOnChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  notesInput: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  saveButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
});
