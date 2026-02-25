import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import OnboardingProgressBar from "@/components/OnboardingProgressBar";

const CADENCE_PRESETS = [
  {
    id: "light" as const,
    label: "Light Touch",
    icon: "clock" as const,
    desc: "1 follow-up after 3 days",
    detail: "Low pressure, great for referrals",
  },
  {
    id: "standard" as const,
    label: "Standard",
    icon: "repeat" as const,
    desc: "2 follow-ups over 5 days",
    detail: "Best balance of persistence and respect",
    recommended: true,
  },
  {
    id: "aggressive" as const,
    label: "Closer",
    icon: "zap" as const,
    desc: "3 follow-ups over 7 days",
    detail: "Maximum conversion for hot leads",
  },
];

const TONES = [
  { id: "friendly" as const, label: "Warm & Friendly", icon: "smile" as const, sample: "Hey Jane! Just checking in on your quote..." },
  { id: "confident" as const, label: "Confident Pro", icon: "award" as const, sample: "Hi Jane, following up on your cleaning estimate..." },
  { id: "direct" as const, label: "Direct", icon: "target" as const, sample: "Jane, your quote expires soon. Book now to lock in..." },
];

interface Props {
  onNext: (data: { cadence: "light" | "standard" | "aggressive"; tone: "friendly" | "confident" | "direct" }) => void;
  onSkip: () => void;
  onBack: () => void;
}

const MAX_CONTENT_WIDTH = 560;

export default function FollowUpSetupScreen({ onNext, onSkip, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > MAX_CONTENT_WIDTH + 40;
  const [cadence, setCadence] = useState<"light" | "standard" | "aggressive">("standard");
  const [tone, setTone] = useState<"friendly" | "confident" | "direct">("friendly");

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing["3xl"] }, useMaxWidth ? { alignItems: "center" } : undefined]}
      showsVerticalScrollIndicator={false}
    >
      <View style={useMaxWidth ? { maxWidth: MAX_CONTENT_WIDTH, width: "100%" } : { width: "100%" }}>
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
        <Feather name="arrow-left" size={22} color={theme.text} />
      </Pressable>

      <OnboardingProgressBar currentStep={6} />
      <ThemedText type="h2" style={{ marginBottom: Spacing.xs }}>Auto Follow-ups</ThemedText>
      <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.xl }}>
        80% of jobs close after a follow-up. Set yours on autopilot.
      </ThemedText>

      <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm }}>Follow-up Cadence</ThemedText>
      <View style={styles.optionsList}>
        {CADENCE_PRESETS.map((c) => {
          const sel = cadence === c.id;
          return (
            <Pressable
              key={c.id}
              testID={`cadence-${c.id}`}
              onPress={() => { setCadence(c.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[
                styles.optionCard,
                {
                  backgroundColor: sel ? theme.primary + "10" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                  borderColor: sel ? theme.primary : theme.border,
                  borderWidth: sel ? 2 : 1,
                },
              ]}
            >
              <View style={styles.optionTop}>
                <View style={[styles.optionIcon, { backgroundColor: sel ? theme.primary + "20" : theme.backgroundSecondary }]}>
                  <Feather name={c.icon} size={18} color={sel ? theme.primary : theme.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.labelRow}>
                    <ThemedText type="subtitle" style={{ fontWeight: "600" }}>{c.label}</ThemedText>
                    {c.recommended ? (
                      <View style={[styles.recBadge, { backgroundColor: theme.primary }]}>
                        <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 10 }}>Best</ThemedText>
                      </View>
                    ) : null}
                  </View>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>{c.desc}</ThemedText>
                </View>
                <View style={[styles.radio, { borderColor: sel ? theme.primary : theme.border }]}>
                  {sel ? <View style={[styles.radioInner, { backgroundColor: theme.primary }]} /> : null}
                </View>
              </View>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>{c.detail}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ThemedText type="subtitle" style={{ marginTop: Spacing.xl, marginBottom: Spacing.sm }}>Message Tone</ThemedText>
      <View style={styles.optionsList}>
        {TONES.map((t) => {
          const sel = tone === t.id;
          return (
            <Pressable
              key={t.id}
              testID={`tone-${t.id}`}
              onPress={() => { setTone(t.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[
                styles.toneCard,
                {
                  backgroundColor: sel ? theme.primary + "10" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                  borderColor: sel ? theme.primary : theme.border,
                  borderWidth: sel ? 2 : 1,
                },
              ]}
            >
              <View style={styles.toneTop}>
                <Feather name={t.icon} size={18} color={sel ? theme.primary : theme.textSecondary} />
                <ThemedText type="subtitle" style={{ flex: 1, fontWeight: "600" }}>{t.label}</ThemedText>
                <View style={[styles.radio, { borderColor: sel ? theme.primary : theme.border }]}>
                  {sel ? <View style={[styles.radioInner, { backgroundColor: theme.primary }]} /> : null}
                </View>
              </View>
              <ThemedText type="caption" style={{ color: theme.textSecondary, fontStyle: "italic", marginTop: 4 }}>
                "{t.sample}"
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        testID="button-followup-next"
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onNext({ cadence, tone }); }}
        style={[styles.nextBtn, { backgroundColor: theme.primary }]}
      >
        <ThemedText type="subtitle" style={{ color: "#FFFFFF", fontWeight: "700" }}>Enable Follow-ups</ThemedText>
        <Feather name="arrow-right" size={18} color="#FFFFFF" />
      </Pressable>

      <Pressable onPress={onSkip} style={styles.skipBtn}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>Maybe later</ThemedText>
      </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl },
  backBtn: { marginBottom: Spacing.lg },
  optionsList: { gap: Spacing.sm },
  optionCard: { padding: Spacing.lg, borderRadius: BorderRadius.sm },
  optionTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  optionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  labelRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  recBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  toneCard: { padding: Spacing.md, borderRadius: BorderRadius.sm },
  toneTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, height: 56, borderRadius: BorderRadius.md, marginTop: Spacing.xl },
  skipBtn: { alignItems: "center", padding: Spacing.md },
});
