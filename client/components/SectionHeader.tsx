import React, { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: ReactNode;
}

export function SectionHeader({ title, subtitle, rightAction }: SectionHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View style={styles.titleContent}>
          <ThemedText type="h4">{title}</ThemedText>
          {subtitle ? (
            <ThemedText
              type="small"
              style={[styles.subtitle, { color: theme.textSecondary }]}
            >
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {rightAction ? rightAction : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
    marginTop: Spacing.xl,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleContent: {
    flex: 1,
  },
  subtitle: {
    marginTop: Spacing.xs,
  },
});
