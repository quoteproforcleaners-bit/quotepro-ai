import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, ScrollView, Platform } from "react-native";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import OnboardingProgressBar from "@/components/OnboardingProgressBar";

const SERVICE_TYPES = [
  { id: "regular", label: "Standard", icon: "home" as const },
  { id: "deep-clean", label: "Deep Clean", icon: "zap" as const },
  { id: "move-in-out", label: "Move Out/In", icon: "truck" as const },
];

const SQFT_MIN = 1000;
const SQFT_MAX = 6000;
const SQFT_STEP = 100;

const FREQUENCIES = [
  { id: "one-time", label: "One-time" },
  { id: "weekly", label: "Weekly" },
  { id: "biweekly", label: "Biweekly" },
  { id: "monthly", label: "Monthly" },
];

const GOAL_SUBTITLES: Record<string, string> = {
  send_quote: "Build a real quote in about 60 seconds",
  convert_recurring: "Start with a quote, then set up recurring visits",
  raise_prices: "See what your services should really cost",
  more_repeat: "A great quote is the first step to repeat business",
};

interface Props {
  goal?: string;
  onNext: (quoteInput: {
    serviceType: string;
    sqft: number;
    beds: number;
    baths: number;
    condition: string;
    frequency: string;
  }) => void;
  onBack: () => void;
}

export default function QuickQuoteScreen({ goal, onNext, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [serviceType, setServiceType] = useState("regular");
  const [sqft, setSqft] = useState(2000);
  const [beds, setBeds] = useState(3);
  const [baths, setBaths] = useState(2);
  const [condition, setCondition] = useState<"maintained" | "needs_love">("maintained");
  const [frequency, setFrequency] = useState(goal === "convert_recurring" ? "biweekly" : goal === "raise_prices" ? "one-time" : "biweekly");

  const subtitle = GOAL_SUBTITLES[goal || "send_quote"] || GOAL_SUBTITLES.send_quote;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing["3xl"] }]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
        <Feather name="arrow-left" size={22} color={theme.text} />
      </Pressable>

      <OnboardingProgressBar currentStep={3} />
      <ThemedText type="h2" style={{ marginBottom: Spacing.xs }}>Create your first quote</ThemedText>
      <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing["2xl"] }}>
        {subtitle}
      </ThemedText>

      <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm }}>Service Type</ThemedText>
      <View style={styles.chipRow}>
        {SERVICE_TYPES.map((s) => {
          const sel = serviceType === s.id;
          return (
            <Pressable
              key={s.id}
              testID={`service-${s.id}`}
              onPress={() => { setServiceType(s.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.chip, { backgroundColor: sel ? theme.primary + "12" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", borderColor: sel ? theme.primary : theme.border }]}
            >
              <Feather name={s.icon} size={16} color={sel ? theme.primary : theme.textSecondary} />
              <ThemedText type="small" style={{ color: sel ? theme.primary : theme.text, fontWeight: sel ? "600" : "400" }}>{s.label}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ThemedText type="subtitle" style={{ marginTop: Spacing.xl, marginBottom: Spacing.sm }}>Home Size</ThemedText>
      <ThemedText type="h3" style={{ color: theme.primary, textAlign: "center", marginBottom: Spacing.xs }}>
        {sqft.toLocaleString()} sq ft
      </ThemedText>
      <Slider
        style={styles.slider}
        minimumValue={SQFT_MIN}
        maximumValue={SQFT_MAX}
        step={SQFT_STEP}
        value={sqft}
        onValueChange={(val) => setSqft(Math.round(val / SQFT_STEP) * SQFT_STEP)}
        minimumTrackTintColor={theme.primary}
        maximumTrackTintColor={isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}
        thumbTintColor={theme.primary}
      />
      <View style={styles.sliderLabels}>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>1,000</ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>6,000</ThemedText>
      </View>

      <View style={[styles.countersRow, { marginTop: Spacing.xl }]}>
        <View style={styles.counterBox}>
          <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm }}>Beds</ThemedText>
          <View style={styles.counter}>
            <Pressable
              onPress={() => { if (beds > 1) { setBeds(beds - 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
              style={[styles.counterBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}
            >
              <Feather name="minus" size={16} color={theme.text} />
            </Pressable>
            <ThemedText type="h3" style={{ width: 32, textAlign: "center" }}>{beds}</ThemedText>
            <Pressable
              onPress={() => { if (beds < 8) { setBeds(beds + 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
              style={[styles.counterBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}
            >
              <Feather name="plus" size={16} color={theme.text} />
            </Pressable>
          </View>
        </View>
        <View style={styles.counterBox}>
          <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm }}>Baths</ThemedText>
          <View style={styles.counter}>
            <Pressable
              onPress={() => { if (baths > 1) { setBaths(baths - 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
              style={[styles.counterBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}
            >
              <Feather name="minus" size={16} color={theme.text} />
            </Pressable>
            <ThemedText type="h3" style={{ width: 32, textAlign: "center" }}>{baths}</ThemedText>
            <Pressable
              onPress={() => { if (baths < 6) { setBaths(baths + 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
              style={[styles.counterBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}
            >
              <Feather name="plus" size={16} color={theme.text} />
            </Pressable>
          </View>
        </View>
      </View>

      <ThemedText type="subtitle" style={{ marginTop: Spacing.xl, marginBottom: Spacing.sm }}>Condition</ThemedText>
      <View style={styles.chipRow}>
        {([
          { id: "maintained", label: "Well Maintained" },
          { id: "needs_love", label: "Needs Extra Love" },
        ] as const).map((c) => {
          const sel = condition === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => { setCondition(c.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.chip, { flex: 1, backgroundColor: sel ? theme.primary + "12" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", borderColor: sel ? theme.primary : theme.border }]}
            >
              <ThemedText type="small" style={{ color: sel ? theme.primary : theme.text, fontWeight: sel ? "600" : "400" }}>{c.label}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ThemedText type="subtitle" style={{ marginTop: Spacing.xl, marginBottom: Spacing.sm }}>Frequency</ThemedText>
      <View style={styles.chipRow}>
        {FREQUENCIES.map((f) => {
          const sel = frequency === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => { setFrequency(f.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.chip, { backgroundColor: sel ? theme.primary + "12" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", borderColor: sel ? theme.primary : theme.border }]}
            >
              <ThemedText type="small" style={{ color: sel ? theme.primary : theme.text, fontWeight: sel ? "600" : "400" }}>{f.label}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        testID="button-quote-next"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onNext({ serviceType, sqft, beds, baths, condition, frequency });
        }}
        style={[styles.nextBtn, { backgroundColor: theme.primary }]}
      >
        <ThemedText type="subtitle" style={{ color: "#FFFFFF", fontWeight: "700" }}>See My Quote</ThemedText>
        <Feather name="arrow-right" size={18} color="#FFFFFF" />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl },
  backBtn: { marginBottom: Spacing.lg },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xs, borderWidth: 1 },
  countersRow: { flexDirection: "row", gap: Spacing.xl },
  counterBox: { flex: 1 },
  counter: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  counterBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  slider: { width: "100%", height: 40 },
  sliderLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: -Spacing.xs },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, height: 56, borderRadius: BorderRadius.md, marginTop: Spacing["3xl"] },
});
