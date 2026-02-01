import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface NumberStepperProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
}

export function NumberStepper({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  suffix,
}: NumberStepperProps) {
  const { theme } = useTheme();

  const handleIncrement = () => {
    if (value < max) {
      Haptics.selectionAsync();
      onChange(Math.min(max, value + step));
    }
  };

  const handleDecrement = () => {
    if (value > min) {
      Haptics.selectionAsync();
      onChange(Math.max(min, value - step));
    }
  };

  const canDecrement = value > min;
  const canIncrement = value < max;

  return (
    <View style={styles.container}>
      <ThemedText type="body" style={{ fontWeight: "500" }}>
        {label}
      </ThemedText>
      <View style={styles.controls}>
        <Pressable
          onPress={handleDecrement}
          disabled={!canDecrement}
          style={[
            styles.button,
            {
              backgroundColor: theme.backgroundSecondary,
              opacity: canDecrement ? 1 : 0.4,
            },
          ]}
        >
          <Feather
            name="minus"
            size={20}
            color={canDecrement ? theme.text : theme.textSecondary}
          />
        </Pressable>
        <View style={styles.valueContainer}>
          <ThemedText type="h4">
            {value}
            {suffix ? (
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {" "}
                {suffix}
              </ThemedText>
            ) : null}
          </ThemedText>
        </View>
        <Pressable
          onPress={handleIncrement}
          disabled={!canIncrement}
          style={[
            styles.button,
            {
              backgroundColor: theme.backgroundSecondary,
              opacity: canIncrement ? 1 : 0.4,
            },
          ]}
        >
          <Feather
            name="plus"
            size={20}
            color={canIncrement ? theme.text : theme.textSecondary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  valueContainer: {
    minWidth: 60,
    alignItems: "center",
  },
});
