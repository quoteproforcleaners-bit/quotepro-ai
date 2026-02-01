import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface OptionPickerProps<T extends string> {
  label: string;
  options: { label: string; value: T; icon?: keyof typeof Feather.glyphMap }[];
  value: T;
  onChange: (value: T) => void;
}

export function OptionPicker<T extends string>({
  label,
  options,
  value,
  onChange,
}: OptionPickerProps<T>) {
  const { theme } = useTheme();

  const handleSelect = (val: T) => {
    if (val !== value) {
      Haptics.selectionAsync();
      onChange(val);
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText type="body" style={styles.label}>
        {label}
      </ThemedText>
      <View style={styles.options}>
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => handleSelect(option.value)}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected
                    ? theme.primary
                    : theme.backgroundSecondary,
                  borderColor: isSelected ? theme.primary : theme.border,
                },
              ]}
            >
              {option.icon ? (
                <Feather
                  name={option.icon}
                  size={18}
                  color={isSelected ? "#FFFFFF" : theme.text}
                  style={styles.optionIcon}
                />
              ) : null}
              <ThemedText
                type="small"
                style={{
                  color: isSelected ? "#FFFFFF" : theme.text,
                  fontWeight: isSelected ? "600" : "400",
                }}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontWeight: "500",
    marginBottom: Spacing.sm,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  optionIcon: {
    marginRight: Spacing.xs,
  },
});
