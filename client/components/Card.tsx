import React from "react";
import { StyleSheet, Pressable, ViewStyle, View, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Elevation, GlowEffects } from "@/constants/theme";

export type CardVariant = "base" | "raised" | "emphasis" | "warning" | "heroWarning";

interface CardProps {
  elevation?: number;
  variant?: CardVariant;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const HERO_RADIUS = 22;

function getVariantStyles(variant: CardVariant, theme: any, isDark: boolean) {
  switch (variant) {
    case "raised":
      return {
        backgroundColor: isDark ? theme.surface2 || theme.surface1 : theme.surface1,
        borderColor: theme.border,
        borderWidth: 1,
        ...Elevation.e2,
      };
    case "emphasis":
      return {
        backgroundColor: isDark ? theme.surface2 : theme.surface1,
        borderColor: isDark ? `${theme.primary}35` : `${theme.primary}25`,
        borderWidth: 1,
        ...Elevation.e2,
      };
    case "warning":
      return {
        backgroundColor: theme.surface0,
        borderColor: theme.warningBorder,
        borderWidth: 1,
        ...Elevation.e2,
      };
    case "heroWarning":
      return {
        borderColor: theme.warningBorder,
        borderWidth: 1,
        borderRadius: HERO_RADIUS,
        ...Elevation.e3,
        ...(isDark ? GlowEffects.glowWarning : {}),
      };
    case "base":
    default:
      return {
        backgroundColor: isDark ? theme.surface1 : theme.surface0,
        borderColor: theme.border,
        borderWidth: 1,
        ...Elevation.e1,
      };
  }
}

export function Card({
  elevation = 1,
  variant = "base",
  title,
  description,
  children,
  onPress,
  style,
}: CardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const variantStyles = getVariantStyles(variant, theme, isDark);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, springConfig);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfig);
  };

  if (variant === "heroWarning" && isDark) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          variantStyles,
          { overflow: "hidden", padding: 0, backgroundColor: "transparent" },
          animatedStyle,
          style,
        ]}
      >
        <LinearGradient
          colors={["#1E273A", "#121B2B"]}
          style={[styles.heroGradient, { borderRadius: HERO_RADIUS - 1 }]}
        >
          <View style={[styles.heroHighlight, { borderTopLeftRadius: HERO_RADIUS - 1, borderTopRightRadius: HERO_RADIUS - 1 }]} />
          {title ? (
            <ThemedText type="h4" style={styles.cardTitle}>
              {title}
            </ThemedText>
          ) : null}
          {description ? (
            <ThemedText type="small" style={styles.cardDescription}>
              {description}
            </ThemedText>
          ) : null}
          {children}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        variantStyles,
        animatedStyle,
        style,
      ]}
    >
      {title ? (
        <ThemedText type="h4" style={styles.cardTitle}>
          {title}
        </ThemedText>
      ) : null}
      {description ? (
        <ThemedText type="small" style={styles.cardDescription}>
          {description}
        </ThemedText>
      ) : null}
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.xl,
    borderRadius: HERO_RADIUS,
  },
  cardTitle: {
    marginBottom: Spacing.sm,
  },
  cardDescription: {
    opacity: 0.7,
  },
  heroGradient: {
    padding: Spacing.xl,
  },
  heroHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
});
