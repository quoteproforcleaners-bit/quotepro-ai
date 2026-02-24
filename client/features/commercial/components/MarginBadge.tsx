import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface MarginBadgeProps {
  actualMargin: number;
  targetMargin: number;
}

export function MarginBadge({ actualMargin, targetMargin }: MarginBadgeProps) {
  const { theme } = useTheme();

  const diff = actualMargin - targetMargin;
  let status: "green" | "yellow" | "red";
  let label: string;

  if (diff >= 0) {
    status = "green";
    label = "Healthy";
  } else if (diff >= -5) {
    status = "yellow";
    label = "Tight";
  } else {
    status = "red";
    label = "Below Target";
  }

  const colorMap = {
    green: {
      bg: theme.successSoft,
      border: theme.successBorder,
      text: theme.success,
    },
    yellow: {
      bg: theme.warningSoft,
      border: theme.warningBorder,
      text: theme.warning,
    },
    red: {
      bg: "rgba(239, 68, 68, 0.10)",
      border: "rgba(239, 68, 68, 0.25)",
      text: theme.error,
    },
  };

  const colors = colorMap[status];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: colors.text }]} />
      <ThemedText type="small" style={[styles.text, { color: colors.text }]}>
        {label}
      </ThemedText>
      <ThemedText
        type="caption"
        style={[styles.percent, { color: colors.text }]}
      >
        {actualMargin.toFixed(1)}%
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.sm,
    alignSelf: "flex-start",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontWeight: "600",
  },
  percent: {
    fontWeight: "500",
  },
});
