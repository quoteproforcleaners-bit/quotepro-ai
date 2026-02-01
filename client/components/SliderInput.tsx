import React from "react";
import { View, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface SliderInputProps {
  label: string;
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  description?: string;
}

export function SliderInput({
  label,
  value,
  minimumValue,
  maximumValue,
  step = 1,
  onChange,
  formatValue,
  description,
}: SliderInputProps) {
  const { theme } = useTheme();

  const displayValue = formatValue ? formatValue(value) : value.toString();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <ThemedText type="body" style={{ fontWeight: "500" }}>
            {label}
          </ThemedText>
          {description ? (
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginTop: 2 }}
            >
              {description}
            </ThemedText>
          ) : null}
        </View>
        <View
          style={[
            styles.valueContainer,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            {displayValue}
          </ThemedText>
        </View>
      </View>
      <Slider
        value={value}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        onValueChange={onChange}
        minimumTrackTintColor={theme.primary}
        maximumTrackTintColor={theme.backgroundTertiary}
        thumbTintColor={theme.primary}
        style={styles.slider}
      />
      <View style={styles.labels}>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {formatValue ? formatValue(minimumValue) : minimumValue}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {formatValue ? formatValue(maximumValue) : maximumValue}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  valueContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
