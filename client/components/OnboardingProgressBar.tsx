import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

interface Props {
  currentStep: number;
  totalSteps?: number;
}

const STEP_ICONS: (keyof typeof Feather.glyphMap)[] = [
  "target",
  "briefcase",
  "file-text",
  "layers",
  "send",
  "repeat",
];

const STEP_LABELS = [
  "Goal",
  "Business",
  "Quote",
  "Options",
  "Send",
  "Follow-Up",
];

export default function OnboardingProgressBar({ currentStep, totalSteps = 6 }: Props) {
  const { theme, isDark } = useTheme();
  const progressWidth = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  const targetProgress = ((currentStep - 1) / (totalSteps - 1)) * 100;

  useEffect(() => {
    progressWidth.value = withTiming(targetProgress, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
    pulseScale.value = withSpring(1.15, { damping: 8, stiffness: 150 }, () => {
      pulseScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    });
  }, [currentStep]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const activeIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.barRow}>
        <View style={[styles.trackBackground, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}>
          <Animated.View
            style={[
              styles.trackFill,
              { backgroundColor: theme.primary },
              progressStyle,
            ]}
          />
        </View>
      </View>

      <View style={styles.stepsRow}>
        {Array.from({ length: totalSteps }).map((_, i) => {
          const stepNum = i + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          const isFuture = stepNum > currentStep;

          return (
            <View key={i} style={styles.stepItem}>
              {isCurrent ? (
                <Animated.View
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: theme.primary,
                      borderColor: `${theme.primary}40`,
                      borderWidth: 3,
                    },
                    activeIconStyle,
                  ]}
                >
                  <Feather name={STEP_ICONS[i]} size={12} color="#FFFFFF" />
                </Animated.View>
              ) : isCompleted ? (
                <View
                  style={[
                    styles.stepDot,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <Feather name="check" size={12} color="#FFFFFF" />
                </View>
              ) : (
                <View
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                      borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Feather
                    name={STEP_ICONS[i]}
                    size={12}
                    color={isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)"}
                  />
                </View>
              )}
              <ThemedText
                type="caption"
                style={[
                  styles.stepLabel,
                  {
                    color: isCurrent
                      ? theme.primary
                      : isCompleted
                      ? theme.text
                      : isDark
                      ? "rgba(255,255,255,0.3)"
                      : "rgba(0,0,0,0.25)",
                    fontWeight: isCurrent ? "700" : "500",
                  },
                ]}
              >
                {STEP_LABELS[i]}
              </ThemedText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  barRow: {
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.md,
  },
  trackBackground: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  trackFill: {
    height: "100%",
    borderRadius: 2,
  },
  stepsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 0,
  },
  stepItem: {
    alignItems: "center",
    flex: 1,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: "center",
  },
});
