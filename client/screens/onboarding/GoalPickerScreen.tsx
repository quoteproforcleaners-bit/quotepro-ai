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
  { id: "send_quote", label: "Send a quote today", icon: "send" as const, hint: "Most popular" },
  { id: "convert_recurring", label: "Convert one-time clients to recurring", icon: "repeat" as const, hint: null },
  { id: "raise_prices", label: "Raise prices without losing clients", icon: "trending-up" as const, hint: null },
  { id: "more_repeat", label: "Get more repeat customers", icon: "users" as const, hint: null },
];

interface Props {
  onNext: (goal: string) => void;
  onBack: () => void;
}

export default function GoalPickerScreen({ onNext, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [selected, setSelected] = useState("send_quote");

  const useMaxWidth = screenWidth > MAX_CONTENT_WIDTH + 40;

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
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
            <Feather name="arrow-left" size={22} color={theme.text} />
          </Pressable>

          <OnboardingProgressBar currentStep={1} />
          <View style={styles.header}>
            <ThemedText type="h2">What matters most right now?</ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
              We'll highlight tips that match your priority
            </ThemedText>
          </View>

          <View style={styles.goalsList}>
            {GOALS.map((g) => {
              const isSelected = selected === g.id;
              return (
                <Pressable
                  key={g.id}
                  testID={`goal-${g.id}`}
                  onPress={() => { setSelected(g.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[
                    styles.goalCard,
                    {
                      backgroundColor: isSelected ? theme.primary + "10" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                      borderColor: isSelected ? theme.primary : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
                    },
                  ]}
                >
                  <View style={[styles.goalIcon, { backgroundColor: isSelected ? theme.primary + "20" : theme.backgroundSecondary }]}>
                    <Feather name={g.icon} size={20} color={isSelected ? theme.primary : theme.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="subtitle">{g.label}</ThemedText>
                    {g.hint ? (
                      <ThemedText type="caption" style={{ color: theme.primary, marginTop: 2 }}>{g.hint}</ThemedText>
                    ) : null}
                  </View>
                  <View style={[styles.radio, { borderColor: isSelected ? theme.primary : theme.border }]}>
                    {isSelected ? <View style={[styles.radioInner, { backgroundColor: theme.primary }]} /> : null}
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
            style={[styles.nextBtn, { backgroundColor: theme.primary }]}
          >
            <ThemedText type="subtitle" style={{ color: "#FFFFFF", fontWeight: "700" }}>Continue</ThemedText>
            <Feather name="arrow-right" size={18} color="#FFFFFF" />
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
  backBtn: { marginBottom: Spacing.lg },
  header: { marginBottom: Spacing["2xl"] },
  goalsList: { gap: Spacing.sm },
  goalCard: { flexDirection: "row", alignItems: "center", padding: Spacing.lg, borderRadius: BorderRadius.sm, borderWidth: 1.5, gap: Spacing.md },
  goalIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  footer: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, alignItems: "center" },
  footerInner: { width: "100%" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, height: 56, borderRadius: BorderRadius.md },
});
