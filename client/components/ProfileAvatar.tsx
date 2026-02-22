import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { AvatarConfig } from "@/types";

export const AVATAR_COLORS = [
  "#2F7BFF",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#EC4899",
  "#EF4444",
  "#F59E0B",
  "#F97316",
  "#10B981",
  "#14B8A6",
  "#06B6D4",
  "#3B82F6",
  "#1E3A5F",
  "#374151",
  "#6B7280",
  "#0EA5E9",
];

export const AVATAR_ICONS: Array<{ name: keyof typeof Feather.glyphMap; label: string }> = [
  { name: "user", label: "Person" },
  { name: "briefcase", label: "Business" },
  { name: "home", label: "Home" },
  { name: "star", label: "Star" },
  { name: "award", label: "Award" },
  { name: "shield", label: "Shield" },
  { name: "heart", label: "Heart" },
  { name: "zap", label: "Bolt" },
  { name: "sun", label: "Sun" },
  { name: "droplet", label: "Drop" },
  { name: "feather", label: "Feather" },
  { name: "coffee", label: "Coffee" },
  { name: "compass", label: "Compass" },
  { name: "target", label: "Target" },
  { name: "flag", label: "Flag" },
  { name: "truck", label: "Truck" },
  { name: "tool", label: "Tool" },
  { name: "smile", label: "Smile" },
  { name: "globe", label: "Globe" },
  { name: "layers", label: "Layers" },
];

interface ProfileAvatarProps {
  config: AvatarConfig | null;
  size?: number;
  fallbackInitials?: string;
  style?: ViewStyle;
}

function getInitials(text?: string): string {
  if (!text) return "QP";
  const words = text.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return text.slice(0, 2).toUpperCase();
}

export function ProfileAvatar({ config, size = 56, fallbackInitials, style }: ProfileAvatarProps) {
  const bgColor = config?.backgroundColor || "#2F7BFF";
  const iconSize = size * 0.45;
  const fontSize = size * 0.38;
  const borderRadius = size / 2;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: bgColor,
        },
        style,
      ]}
    >
      {config?.style === "icon" && config.icon ? (
        <Feather
          name={config.icon as keyof typeof Feather.glyphMap}
          size={iconSize}
          color="#FFFFFF"
        />
      ) : (
        <ThemedText
          type="body"
          style={[
            styles.initials,
            { fontSize, lineHeight: fontSize * 1.2 },
          ]}
        >
          {config?.initials || getInitials(fallbackInitials)}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
  },
});
