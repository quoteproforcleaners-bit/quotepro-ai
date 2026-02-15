import React, { useEffect, useRef, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface MomentumToastProps {
  visible: boolean;
  streakCount: number;
  onDismiss: () => void;
}

export function MomentumToast({ visible, streakCount, onDismiss }: MomentumToastProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const hasShown = useRef(false);

  const dismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    if (visible && !hasShown.current) {
      hasShown.current = true;
      translateY.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.back(1.5)) });
      opacity.value = withTiming(1, { duration: 250 });
      scale.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.back(1.5)) });

      translateY.value = withDelay(
        2000,
        withTiming(100, { duration: 300, easing: Easing.in(Easing.ease) })
      );
      opacity.value = withDelay(
        2000,
        withTiming(0, { duration: 300 }, (finished) => {
          if (finished) {
            runOnJS(dismiss)();
          }
        })
      );
    }
    if (!visible) {
      hasShown.current = false;
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  const bgColor = isDark ? "rgba(40, 40, 50, 0.95)" : "rgba(20, 20, 30, 0.92)";

  return (
    <Animated.View
      style={[
        styles.container,
        { bottom: insets.bottom + 24, backgroundColor: bgColor },
        animStyle,
      ]}
      pointerEvents="none"
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: theme.warning + "25" }]}>
          <Feather name="zap" size={16} color={theme.warning} />
        </View>
        <View style={styles.textCol}>
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>
            {"+1 Momentum"}
          </ThemedText>
          <ThemedText type="caption" style={{ color: "rgba(255,255,255,0.7)", marginTop: 1 }}>
            {streakCount > 0 ? `Streak: ${streakCount} day${streakCount === 1 ? "" : "s"}` : "Streak started!"}
          </ThemedText>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignSelf: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    minWidth: 200,
    zIndex: 9999,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
  },
});
