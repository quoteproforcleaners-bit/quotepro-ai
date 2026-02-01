import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { NumberStepper } from "@/components/NumberStepper";
import { SliderInput } from "@/components/SliderInput";
import { OptionPicker } from "@/components/OptionPicker";
import { SectionHeader } from "@/components/SectionHeader";
import { Toggle } from "@/components/Toggle";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { HomeDetails } from "@/types";

interface Props {
  data: HomeDetails;
  onUpdate: (data: HomeDetails) => void;
}

export default function HomeDetailsScreen({ data, onUpdate }: Props) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const updateField = <K extends keyof HomeDetails>(
    key: K,
    value: HomeDetails[K]
  ) => {
    onUpdate({ ...data, [key]: value });
  };

  const conditionLabels: Record<number, string> = {
    1: "Very Dirty",
    2: "Very Dirty",
    3: "Needs Work",
    4: "Needs Work",
    5: "Average",
    6: "Average",
    7: "Well Kept",
    8: "Well Kept",
    9: "Spotless",
    10: "Spotless",
  };

  return (
    <KeyboardAwareScrollViewCompat
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
        <ThemedText type="h3">Home Details</ThemedText>
        <ThemedText
          type="small"
          style={[styles.subtitle, { color: theme.textSecondary }]}
        >
          Provide details about the property to calculate pricing.
        </ThemedText>
      </View>

      <Input
        label="Square Footage"
        value={data.sqft > 0 ? data.sqft.toString() : ""}
        onChangeText={(v) => updateField("sqft", parseInt(v) || 0)}
        placeholder="2000"
        keyboardType="number-pad"
        leftIcon="square"
      />

      <SectionHeader title="Rooms" />

      <NumberStepper
        label="Bedrooms"
        value={data.beds}
        min={0}
        max={10}
        onChange={(v) => updateField("beds", v)}
      />

      <NumberStepper
        label="Full Bathrooms"
        value={data.baths}
        min={1}
        max={10}
        onChange={(v) => updateField("baths", v)}
      />

      <NumberStepper
        label="Half Bathrooms"
        value={data.halfBaths}
        min={0}
        max={5}
        onChange={(v) => updateField("halfBaths", v)}
      />

      <SectionHeader title="Property Details" />

      <OptionPicker
        label="Home Type"
        options={[
          { label: "House", value: "house", icon: "home" },
          { label: "Apartment", value: "apartment", icon: "square" },
          { label: "Townhome", value: "townhome", icon: "grid" },
        ]}
        value={data.homeType}
        onChange={(v) => updateField("homeType", v)}
      />

      <NumberStepper
        label="People Living Here"
        value={data.peopleCount}
        min={1}
        max={10}
        onChange={(v) => updateField("peopleCount", v)}
      />

      <SectionHeader title="Condition" />

      <SliderInput
        label="Current Cleanliness"
        description={conditionLabels[data.conditionScore]}
        value={data.conditionScore}
        minimumValue={1}
        maximumValue={10}
        step={1}
        onChange={(v) => updateField("conditionScore", Math.round(v))}
        formatValue={(v) => v.toString()}
      />

      <SectionHeader title="Pets" />

      <OptionPicker
        label="Pet Type"
        options={[
          { label: "None", value: "none" },
          { label: "Cat", value: "cat" },
          { label: "Dog", value: "dog" },
          { label: "Multiple", value: "multiple" },
        ]}
        value={data.petType}
        onChange={(v) => updateField("petType", v)}
      />

      {data.petType !== "none" ? (
        <Toggle
          label="Heavy Shedding"
          description="Pet sheds frequently"
          value={data.petShedding}
          onChange={(v) => updateField("petShedding", v)}
        />
      ) : null}
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
    marginBottom: Spacing.lg,
  },
  subtitle: {
    marginTop: Spacing.xs,
  },
});
