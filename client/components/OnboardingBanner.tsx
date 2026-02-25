import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  getOnboardingStatus,
  getProgressPercent,
  OnboardingStatus,
} from "@/lib/onboardingStore";

interface Props {
  onResume?: () => void;
}

const STEP_LABELS = [
  "Set your goals",
  "Add business info",
  "Create a quote",
  "Review pricing",
  "Send to customer",
  "Set up follow-ups",
  "Finish setup",
];

export default function OnboardingBanner({ onResume }: Props) {
  const { theme, isDark } = useTheme();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    getOnboardingStatus().then((s) => {
      if (!s.completed && !s.skipped) {
        setStatus(null);
        return;
      }
      if (s.completed) {
        setStatus(null);
        return;
      }
      if (s.skipped && s.currentStep < 7) {
        setStatus(s);
        const pct = getProgressPercent(s);
        progressWidth.value = withTiming(pct, { duration: 800 });
      }
    });
  }, []);

  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDismissed(true);
  }, []);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  if (!status || dismissed) return null;

  const progress = getProgressPercent(status);
  const nextStep = status.currentStep < STEP_LABELS.length ? STEP_LABELS[status.currentStep] : "Complete setup";

  return (
    <View style={[styles.banner, { backgroundColor: isDark ? "#101B2D" : "#EFF6FF", borderColor: theme.primary + "18" }]}>
      <View style={styles.topRow}>
        <View style={[styles.iconCircle, { backgroundColor: theme.primary + "15" }]}>
          <Feather name="target" size={16} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="subtitle" style={{ fontWeight: "700" }}>Finish Setup</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>{progress}% complete</ThemedText>
        </View>
        <Pressable onPress={handleDismiss} hitSlop={12}>
          <Feather name="x" size={16} color={theme.textSecondary} />
        </Pressable>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSecondary }]}>
        <Animated.View style={[styles.progressFill, { backgroundColor: theme.primary }, progressBarStyle]} />
      </View>

      <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
        Next: {nextStep}
      </ThemedText>

      {onResume ? (
        <Pressable
          testID="button-resume-onboarding"
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onResume(); }}
          style={[styles.resumeBtn, { backgroundColor: theme.primary }]}
        >
          <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "700" }}>Continue Setup</ThemedText>
          <Feather name="arrow-right" size={14} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { marginHorizontal: Spacing.lg, padding: Spacing.lg, borderRadius: BorderRadius.sm, borderWidth: 1, marginBottom: Spacing.md },
  topRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  progressTrack: { height: 6, borderRadius: 3, marginTop: Spacing.sm, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  resumeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xs, marginTop: Spacing.md },
});
