import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";

interface ProBadgeProps {
  size?: "small" | "medium";
}

export function ProBadge({ size = "small" }: ProBadgeProps) {
  const { isDark } = useTheme();
  const isSmall = size === "small";

  return (
    <View style={[styles.badgeWrap, { shadowColor: isDark ? "#D4A017" : "#B8860B" }]}>
      <LinearGradient
        colors={isDark ? ["#C5941A", "#E8B230", "#D4A017"] : ["#D4A017", "#EBC24D", "#C5941A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, isSmall ? styles.badgeSmall : styles.badgeMedium]}
      >
        <Feather
          name="zap"
          size={isSmall ? 8 : 10}
          color="#FFFFFF"
          style={styles.badgeIcon}
        />
        <ThemedText
          type="caption"
          style={[
            styles.badgeText,
            isSmall ? styles.badgeTextSmall : styles.badgeTextMedium,
          ]}
        >
          PRO
        </ThemedText>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeWrap: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeSmall: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeMedium: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeIcon: {
    marginRight: 2,
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  badgeTextSmall: {
    fontSize: 9,
  },
  badgeTextMedium: {
    fontSize: 11,
  },
});
