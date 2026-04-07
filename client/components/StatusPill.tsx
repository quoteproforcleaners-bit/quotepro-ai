import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";

interface StatusPillProps {
  label: string;
  color: string;
  icon?: keyof typeof Feather.glyphMap;
  size?: "sm" | "md";
}

export function StatusPill({ label, color, icon, size = "sm" }: StatusPillProps) {
  const isSmall = size === "sm";
  return (
    <View
      style={[
        styles.pill,
        isSmall ? styles.pillSm : styles.pillMd,
        { backgroundColor: color + "1A", borderColor: color + "40" },
      ]}
    >
      {icon ? <Feather name={icon} size={isSmall ? 10 : 12} color={color} /> : null}
      <ThemedText style={[styles.label, isSmall ? styles.labelSm : styles.labelMd, { color }]}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 9999,
    alignSelf: "flex-start",
  },
  pillSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillMd: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  label: {
    fontWeight: "600",
  },
  labelSm: {
    fontSize: 11,
    lineHeight: 14,
  },
  labelMd: {
    fontSize: 13,
    lineHeight: 16,
  },
});
