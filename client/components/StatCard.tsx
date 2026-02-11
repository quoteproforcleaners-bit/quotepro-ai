import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface StatCardProps {
  title: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  color?: string;
}

export function StatCard({ title, value, icon, color }: StatCardProps) {
  const { theme } = useTheme();
  const iconColor = color || theme.primary;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.cardBackground, borderColor: theme.border },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: iconColor }]} />
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
          <Feather name={icon} size={16} color={iconColor} />
        </View>
        <ThemedText type="h2" style={styles.value}>
          {value}
        </ThemedText>
        <ThemedText
          type="caption"
          style={[styles.title, { color: theme.textSecondary }]}
        >
          {title}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  accentBar: {
    height: 3,
    width: "100%",
  },
  content: {
    padding: Spacing.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  value: {
    marginBottom: 2,
  },
  title: {},
});
