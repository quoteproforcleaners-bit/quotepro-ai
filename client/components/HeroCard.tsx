import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { IOSShadow, Radius } from "@/styles/tokens";

interface HeroCardProps {
  colors: [string, string, ...string[]];
  children: React.ReactNode;
  style?: ViewStyle;
  gradientStyle?: ViewStyle;
}

export function HeroCard({ colors, children, style, gradientStyle }: HeroCardProps) {
  return (
    <View style={[styles.wrapper, style]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, gradientStyle]}
      >
        <View style={styles.shimmer} />
        {children}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius["2xl"],
    overflow: "hidden",
    ...IOSShadow.hero,
  } as any,
  gradient: {
    borderRadius: Radius["2xl"],
    overflow: "hidden",
    padding: 20,
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderTopLeftRadius: Radius["2xl"],
    borderTopRightRadius: Radius["2xl"],
  },
});
