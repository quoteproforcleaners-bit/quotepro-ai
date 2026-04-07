import React from "react";
import { Pressable, StyleSheet, ViewStyle, TextStyle, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@expo/vector-icons";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING = { damping: 15, mass: 0.3, stiffness: 150, overshootClamping: true };

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive" | "tinted";

interface AppleButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Feather.glyphMap;
  iconRight?: keyof typeof Feather.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
  size?: "sm" | "md" | "lg";
  color?: string;
}

export function AppleButton({
  label,
  onPress,
  variant = "primary",
  icon,
  iconRight,
  disabled,
  style,
  textStyle,
  testID,
  size = "md",
  color = "#007AFF",
}: AppleButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const bg = variant === "primary"
    ? color
    : variant === "tinted"
    ? color + "18"
    : variant === "destructive"
    ? "#FF3B30"
    : "transparent";

  const textColor = variant === "primary" || variant === "destructive"
    ? "#FFFFFF"
    : variant === "tinted"
    ? color
    : color;

  const borderColor = variant === "secondary" ? color + "40" : "transparent";

  const height = size === "sm" ? 34 : size === "lg" ? 52 : 42;
  const px = size === "sm" ? 14 : size === "lg" ? 22 : 18;
  const fontSize = size === "sm" ? 13 : size === "lg" ? 17 : 15;
  const iconSize = size === "sm" ? 13 : size === "lg" ? 17 : 15;

  return (
    <AnimatedPressable
      testID={testID}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={() => { scale.value = withSpring(0.96, SPRING); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING); }}
      style={[
        animStyle,
        styles.btn,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === "secondary" ? 1 : 0,
          height,
          paddingHorizontal: px,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={iconSize} color={textColor} /> : null}
      <ThemedText style={[styles.label, { color: textColor, fontSize, fontWeight: "600" }, textStyle]}>
        {label}
      </ThemedText>
      {iconRight ? <Feather name={iconRight} size={iconSize} color={textColor} /> : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 9999,
    alignSelf: "flex-start",
  },
  label: {
    lineHeight: 20,
  },
});
