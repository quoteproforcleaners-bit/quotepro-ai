import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import OnboardingProgressBar from "@/components/OnboardingProgressBar";

const MAX_CONTENT_WIDTH = 560;

const GOALS = [
  { id: "quote_faster", label: "Quote faster", icon: "zap" as const },
  { id: "raise_prices", label: "Raise prices confidently", icon: "trending-up" as const },
  { id: "win_more_jobs", label: "Win more jobs", icon: "award" as const },
  { id: "follow_up_auto", label: "Follow up automatically", icon: "repeat" as const },
];

interface Props {
  onNext: (goals: string[]) => void;
  onSkip: () => void;
}

export default function GoalPickerScreen({ onNext, onSkip }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [selected, setSelected] = useState<string[]>(["quote_faster"]);

  const useMaxWidth = screenWidth > MAX_CONTENT_WIDTH + 40;

  const toggleGoal = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing["2xl"],
          },
          useMaxWidth ? { alignItems: "center" } : undefined,
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={[styles.innerContent, useMaxWidth ? { maxWidth: MAX_CONTENT_WIDTH, width: "100%" } : undefined]}>
          <OnboardingProgressBar currentStep={1} totalSteps={3} />
          <View style={styles.header}>
            <ThemedText type="h2">What matters most right now?</ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
              Select all that apply
            </ThemedText>
          </View>

          <View style={styles.goalsList}>
            {GOALS.map((g) => {
              const isSelected = selected.includes(g.id);
              return (
                <Pressable
                  key={g.id}
                  testID={`goal-${g.id}`}
                  onPress={() => toggleGoal(g.id)}
                  style={[
                    styles.goalChip,
                    {
                      backgroundColor: isSelected ? theme.primary + "12" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                      borderColor: isSelected ? theme.primary : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                    },
                  ]}
                >
                  <View style={[styles.chipIcon, { backgroundColor: isSelected ? theme.primary + "20" : theme.backgroundSecondary }]}>
                    <Feather name={g.icon} size={18} color={isSelected ? theme.primary : theme.textSecondary} />
                  </View>
                  <ThemedText type="subtitle" style={{ flex: 1, fontWeight: isSelected ? "600" : "400" }}>{g.label}</ThemedText>
                  <View style={[styles.checkbox, { borderColor: isSelected ? theme.primary : theme.border, backgroundColor: isSelected ? theme.primary : "transparent" }]}>
                    {isSelected ? <Feather name="check" size={12} color="#FFFFFF" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md, backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.footerInner, useMaxWidth ? { maxWidth: MAX_CONTENT_WIDTH } : undefined]}>
          <Pressable
            testID="button-goal-next"
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onNext(selected); }}
            style={[styles.nextBtn, { backgroundColor: theme.primary, opacity: selected.length > 0 ? 1 : 0.5 }]}
            disabled={selected.length === 0}
          >
            <ThemedText type="subtitle" style={{ color: "#FFFFFF", fontWeight: "700" }}>Continue</ThemedText>
            <Feather name="arrow-right" size={18} color="#FFFFFF" />
          </Pressable>

          <Pressable
            testID="button-onboarding-skip"
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSkip(); }}
            style={styles.skipBtn}
          >
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Skip setup
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: Spacing.xl },
  innerContent: { flex: 1 },
  header: { marginBottom: Spacing["2xl"] },
  goalsList: { gap: Spacing.sm },
  goalChip: { flexDirection: "row", alignItems: "center", padding: Spacing.lg, borderRadius: BorderRadius.sm, borderWidth: 1.5, gap: Spacing.md },
  chipIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  footer: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, alignItems: "center" },
  footerInner: { width: "100%" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, height: 56, borderRadius: BorderRadius.md },
  skipBtn: { alignItems: "center", padding: Spacing.md },
});
