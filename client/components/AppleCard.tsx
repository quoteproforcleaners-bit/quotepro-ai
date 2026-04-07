import React from "react";
import { View, Pressable, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { IOSShadow, Radius } from "@/styles/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING = { damping: 15, mass: 0.3, stiffness: 150, overshootClamping: true };

interface AppleCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  elevated?: boolean;
  testID?: string;
}

export function AppleCard({ children, onPress, style, elevated = false, testID }: AppleCardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const content = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? theme.surface1 : theme.surface0,
          borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
          ...(elevated ? IOSShadow.cardMd : IOSShadow.card),
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) return content;

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, SPRING); }}
      onPressOut={() => { scale.value = withSpring(1, SPRING); }}
      style={animatedStyle}
    >
      {content}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    padding: 16,
  } as any,
});
