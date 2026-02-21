import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const SERVICE_TYPES = [
  { id: "regular", label: "Standard", icon: "home" as const },
  { id: "deep-clean", label: "Deep Clean", icon: "zap" as const },
  { id: "move-in-out", label: "Move Out/In", icon: "truck" as const },
  { id: "airbnb", label: "Office/Commercial", icon: "briefcase" as const },
];

const SIZE_BUCKETS = [
  { id: "small", label: "Small", sqft: 1000 },
  { id: "medium", label: "Medium", sqft: 2000 },
  { id: "large", label: "Large", sqft: 3000 },
  { id: "xlarge", label: "Extra Large", sqft: 4000 },
];

const FREQUENCIES = [
  { id: "one-time", label: "One-time" },
  { id: "weekly", label: "Weekly" },
  { id: "biweekly", label: "Biweekly" },
  { id: "monthly", label: "Monthly" },
];

interface Props {
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

export default function QuickQuoteScreen({ onNext, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [serviceType, setServiceType] = useState("regular");
  const [sizeIdx, setSizeIdx] = useState(1);
  const [beds, setBeds] = useState(3);
  const [baths, setBaths] = useState(2);
  const [condition, setCondition] = useState<"maintained" | "needs_love">("maintained");
  const [frequency, setFrequency] = useState("biweekly");

  const selectedSize = SIZE_BUCKETS[sizeIdx];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing["3xl"] }]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
        <Feather name="arrow-left" size={22} color={theme.text} />
      </Pressable>

      <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600", marginBottom: Spacing.xs }}>
        STEP 3 OF 7
      </ThemedText>
      <ThemedText type="h2" style={{ marginBottom: Spacing.xs }}>Create your first quote</ThemedText>
      <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing["2xl"] }}>
        Takes about 60 seconds
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
      <View style={styles.chipRow}>
        {SIZE_BUCKETS.map((s, i) => {
          const sel = sizeIdx === i;
          return (
            <Pressable
              key={s.id}
              testID={`size-${s.id}`}
              onPress={() => { setSizeIdx(i); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.chip, { backgroundColor: sel ? theme.primary + "12" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", borderColor: sel ? theme.primary : theme.border }]}
            >
              <ThemedText type="small" style={{ color: sel ? theme.primary : theme.text, fontWeight: sel ? "600" : "400" }}>{s.label}</ThemedText>
            </Pressable>
          );
        })}
      </View>
      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>~{selectedSize.sqft.toLocaleString()} sq ft</ThemedText>

      <View style={[styles.counterRow, { marginTop: Spacing.xl }]}>
        <View style={styles.counterItem}>
          <ThemedText type="subtitle">Bedrooms</ThemedText>
          <View style={styles.counterControls}>
            <Pressable onPress={() => setBeds(Math.max(1, beds - 1))} style={[styles.counterBtn, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="minus" size={16} color={theme.text} />
            </Pressable>
            <ThemedText type="h3" style={{ minWidth: 30, textAlign: "center" }}>{beds}</ThemedText>
            <Pressable onPress={() => setBeds(Math.min(8, beds + 1))} style={[styles.counterBtn, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="plus" size={16} color={theme.text} />
            </Pressable>
          </View>
        </View>
        <View style={styles.counterItem}>
          <ThemedText type="subtitle">Bathrooms</ThemedText>
          <View style={styles.counterControls}>
            <Pressable onPress={() => setBaths(Math.max(1, baths - 1))} style={[styles.counterBtn, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="minus" size={16} color={theme.text} />
            </Pressable>
            <ThemedText type="h3" style={{ minWidth: 30, textAlign: "center" }}>{baths}</ThemedText>
            <Pressable onPress={() => setBaths(Math.min(8, baths + 1))} style={[styles.counterBtn, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="plus" size={16} color={theme.text} />
            </Pressable>
          </View>
        </View>
      </View>

      <ThemedText type="subtitle" style={{ marginTop: Spacing.xl, marginBottom: Spacing.sm }}>Condition</ThemedText>
      <View style={styles.chipRow}>
        {[
          { id: "maintained" as const, label: "Maintained", icon: "check-circle" as const },
          { id: "needs_love" as const, label: "Needs Love", icon: "alert-circle" as const },
        ].map((c) => {
          const sel = condition === c.id;
          return (
            <Pressable
              key={c.id}
              testID={`condition-${c.id}`}
              onPress={() => { setCondition(c.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.chip, { flex: 1, backgroundColor: sel ? theme.primary + "12" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", borderColor: sel ? theme.primary : theme.border }]}
            >
              <Feather name={c.icon} size={16} color={sel ? theme.primary : theme.textSecondary} />
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
              testID={`freq-${f.id}`}
              onPress={() => { setFrequency(f.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[styles.chip, { backgroundColor: sel ? theme.primary + "12" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", borderColor: sel ? theme.primary : theme.border }]}
            >
              <ThemedText type="small" style={{ color: sel ? theme.primary : theme.text, fontWeight: sel ? "600" : "400" }}>{f.label}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        testID="button-generate-quote"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onNext({
            serviceType,
            sqft: selectedSize.sqft,
            beds,
            baths,
            condition,
            frequency,
          });
        }}
        style={[styles.nextBtn, { backgroundColor: theme.primary }]}
      >
        <Feather name="zap" size={18} color="#FFFFFF" />
        <ThemedText type="subtitle" style={{ color: "#FFFFFF", fontWeight: "700" }}>Generate Quote</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl },
  backBtn: { marginBottom: Spacing.lg },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xs, borderWidth: 1.5 },
  counterRow: { flexDirection: "row", gap: Spacing.xl },
  counterItem: { flex: 1 },
  counterControls: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginTop: Spacing.sm },
  counterBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, height: 56, borderRadius: BorderRadius.md, marginTop: Spacing["2xl"] },
});
