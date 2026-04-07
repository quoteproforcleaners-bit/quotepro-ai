import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { IOSShadow, Radius } from "@/styles/tokens";

interface MetricCardProps {
  value: string | number;
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  color?: string;
  style?: ViewStyle;
}

export function MetricCard({ value, label, icon, color = "#007AFF", style }: MetricCardProps) {
  const { theme, isDark } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? theme.surface1 : theme.surface0,
          borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
          ...IOSShadow.card,
        },
        style,
      ]}
    >
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: color + "18" }]}>
          <Feather name={icon} size={14} color={color} />
        </View>
      ) : null}
      <ThemedText style={[styles.value, { color: theme.colorTextPrimary }]}>{value}</ThemedText>
      <ThemedText style={[styles.label, { color: theme.colorTextMuted }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 4,
  } as any,
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  value: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 26,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0.2,
  },
});
