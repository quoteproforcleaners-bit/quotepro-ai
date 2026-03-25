/**
 * GlassCard — cross-platform elevated card component.
 *
 * iOS 26+   : Liquid Glass via expo-glass-effect GlassView
 * iOS < 26  : Frosted blur via expo-blur BlurView
 * Android   : Material-style elevated card (white bg, shadow, rounded)
 * Web       : Standard card with backdrop-filter blur fallback
 */
import React from "react";
import { View, StyleSheet, Platform, ViewStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius } from "@/constants/theme";

let GlassView: any = null;
let BlurView: any = null;

if (Platform.OS === "ios") {
  try {
    GlassView = require("expo-glass-effect").GlassView;
  } catch {}
  try {
    BlurView = require("expo-blur").BlurView;
  } catch {}
}

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  intensity?: number;           // blur intensity 0-100 (iOS < 26 fallback)
  glassStyle?: "clear" | "regular";
  padding?: number;
  radius?: number;
}

export default function GlassCard({
  children,
  style,
  intensity = 60,
  glassStyle = "regular",
  padding = 16,
  radius = BorderRadius.lg,
}: GlassCardProps) {
  const { theme } = useTheme();

  const innerStyle: ViewStyle = {
    padding,
    borderRadius: radius,
    overflow: "hidden",
  };

  // ── Android & Web: Material-style elevated card ───────────────────────────
  if (Platform.OS === "android" || Platform.OS === "web") {
    return (
      <View
        style={[
          innerStyle,
          styles.androidCard,
          {
            backgroundColor: theme.cardBackground,
            borderRadius: radius,
          },
          style as ViewStyle,
        ]}
      >
        {children}
      </View>
    );
  }

  // ── iOS 26+ Liquid Glass ──────────────────────────────────────────────────
  if (GlassView) {
    return (
      <GlassView
        glassEffectStyle={glassStyle}
        style={[innerStyle, { borderRadius: radius }, style as ViewStyle]}
      >
        {children}
      </GlassView>
    );
  }

  // ── iOS < 26: Blur fallback ───────────────────────────────────────────────
  if (BlurView) {
    return (
      <BlurView
        intensity={intensity}
        tint={theme.background === "#000000" ? "dark" : "light"}
        style={[
          innerStyle,
          {
            borderRadius: radius,
            overflow: "hidden",
            borderWidth: 0.5,
            borderColor: `${theme.border}80`,
          },
          style as ViewStyle,
        ]}
      >
        {children}
      </BlurView>
    );
  }

  // ── Fallback (no glass, no blur available) ────────────────────────────────
  return (
    <View
      style={[
        innerStyle,
        styles.fallbackCard,
        { backgroundColor: theme.cardBackground, borderRadius: radius, borderColor: theme.border },
        style as ViewStyle,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  androidCard: {
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  fallbackCard: {
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
});
