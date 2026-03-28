import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ActionEmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor?: string;
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
  testID?: string;
}

export function ActionEmptyState({
  icon,
  iconColor,
  title,
  description,
  ctaLabel,
  onCta,
  testID,
}: ActionEmptyStateProps) {
  const { theme } = useTheme();
  const color = iconColor || theme.primary;

  return (
    <View style={styles.container} testID={testID}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}12` }]}>
        <Feather name={icon} size={32} color={color} />
      </View>
      <ThemedText type="h4" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText type="body" style={[styles.description, { color: theme.textSecondary }]}>
        {description}
      </ThemedText>
      {ctaLabel && onCta ? (
        <Pressable
          onPress={onCta}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          testID={testID ? `${testID}-cta` : "action-empty-cta"}
        >
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700" }}>
            {ctaLabel}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
    paddingVertical: Spacing["4xl"],
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  description: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  cta: {
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    minWidth: 180,
    alignItems: "center",
  },
});
