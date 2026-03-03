import React, { useState } from "react";
import { View, StyleSheet, Pressable, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import OnboardingProgressBar from "@/components/OnboardingProgressBar";

interface Props {
  onNext: (data: { businessType: string; hourlyTarget: number; minJobPrice: number; autoUpsells: boolean }) => void;
  onBack: () => void;
}

const MAX_CONTENT_WIDTH = 560;

const BUSINESS_TYPES = [
  { id: "residential", label: "Residential", icon: "home" as const },
  { id: "commercial", label: "Commercial", icon: "briefcase" as const },
  { id: "both", label: "Both", icon: "grid" as const },
];

export default function BusinessBasicsScreen({ onNext, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [businessType, setBusinessType] = useState("residential");
  const [hourlyTarget, setHourlyTarget] = useState("60");
  const [minJobPrice, setMinJobPrice] = useState("179");
  const [autoUpsells, setAutoUpsells] = useState(true);
  const useMaxWidth = screenWidth > MAX_CONTENT_WIDTH + 40;

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing["3xl"] }, useMaxWidth ? { alignItems: "center" } : undefined]}
    >
      <View style={useMaxWidth ? { maxWidth: MAX_CONTENT_WIDTH, width: "100%" } : { width: "100%" }}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>

        <OnboardingProgressBar currentStep={2} totalSteps={3} />
        <ThemedText type="h2" style={{ marginBottom: Spacing.xs }}>Business Basics</ThemedText>
        <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing["2xl"] }}>
          Set your pricing defaults
        </ThemedText>

        <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm }}>Business Type</ThemedText>
        <View style={styles.chipRow}>
          {BUSINESS_TYPES.map((bt) => {
            const sel = businessType === bt.id;
            return (
              <Pressable
                key={bt.id}
                testID={`biz-type-${bt.id}`}
                onPress={() => { setBusinessType(bt.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: sel ? theme.primary + "12" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                    borderColor: sel ? theme.primary : theme.border,
                  },
                ]}
              >
                <Feather name={bt.icon} size={18} color={sel ? theme.primary : theme.textSecondary} />
                <ThemedText type="small" style={{ color: sel ? theme.primary : theme.text, fontWeight: sel ? "600" : "400" }}>{bt.label}</ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={{ marginTop: Spacing.xl }}>
          <Input
            label="Hourly Target ($)"
            value={hourlyTarget}
            onChangeText={setHourlyTarget}
            placeholder="60"
            keyboardType="number-pad"
            leftIcon="dollar-sign"
            testID="input-hourly-target"
          />
        </View>

        <Input
          label="Minimum Job Price ($)"
          value={minJobPrice}
          onChangeText={setMinJobPrice}
          placeholder="179"
          keyboardType="number-pad"
          leftIcon="dollar-sign"
          testID="input-min-job-price"
        />

        <Pressable
          testID="toggle-auto-upsells"
          onPress={() => { setAutoUpsells(!autoUpsells); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[styles.toggleRow, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", borderColor: theme.border }]}
        >
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle">Auto-suggest upsells</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
              Recommend add-ons to boost ticket size
            </ThemedText>
          </View>
          <View style={[styles.toggleTrack, { backgroundColor: autoUpsells ? theme.primary : isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" }]}>
            <View style={[styles.toggleThumb, { transform: [{ translateX: autoUpsells ? 20 : 0 }] }]} />
          </View>
        </Pressable>

        <Pressable
          testID="button-basics-next"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onNext({
              businessType,
              hourlyTarget: parseInt(hourlyTarget) || 60,
              minJobPrice: parseInt(minJobPrice) || 179,
              autoUpsells,
            });
          }}
          style={[styles.nextBtn, { backgroundColor: theme.primary }]}
        >
          <ThemedText type="subtitle" style={{ color: "#FFFFFF", fontWeight: "700" }}>Continue</ThemedText>
          <Feather name="arrow-right" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl },
  backBtn: { marginBottom: Spacing.lg },
  chipRow: { flexDirection: "row", gap: Spacing.sm },
  typeChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: BorderRadius.xs, borderWidth: 1.5 },
  toggleRow: { flexDirection: "row", alignItems: "center", padding: Spacing.lg, borderRadius: BorderRadius.sm, borderWidth: 1, marginTop: Spacing.md, gap: Spacing.md },
  toggleTrack: { width: 48, height: 28, borderRadius: 14, padding: 4, justifyContent: "center" },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, height: 56, borderRadius: BorderRadius.md, marginTop: Spacing["2xl"] },
});
