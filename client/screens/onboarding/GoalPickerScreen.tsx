import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const GOALS = [
  { id: "send_quote", label: "Send a quote today", icon: "send" as const },
  { id: "convert_recurring", label: "Convert one-time clients to recurring", icon: "repeat" as const },
  { id: "raise_prices", label: "Raise prices without losing clients", icon: "trending-up" as const },
  { id: "more_repeat", label: "Get more repeat customers", icon: "users" as const },
];

interface Props {
  onNext: (goal: string) => void;
  onBack: () => void;
}

export default function GoalPickerScreen({ onNext, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [selected, setSelected] = useState("send_quote");

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>

        <View style={styles.header}>
          <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600", marginBottom: Spacing.xs }}>
            STEP 1 OF 7
          </ThemedText>
          <ThemedText type="h2">What are you here to do?</ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
            We'll customize your experience
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
                <ThemedText type="subtitle" style={{ flex: 1 }}>{g.label}</ThemedText>
                <View style={[styles.radio, { borderColor: isSelected ? theme.primary : theme.border }]}>
                  {isSelected ? <View style={[styles.radioInner, { backgroundColor: theme.primary }]} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: Spacing.xl },
  backBtn: { marginBottom: Spacing.lg },
  header: { marginBottom: Spacing["2xl"] },
  goalsList: { flex: 1, gap: Spacing.sm },
  goalCard: { flexDirection: "row", alignItems: "center", padding: Spacing.lg, borderRadius: BorderRadius.sm, borderWidth: 1.5, gap: Spacing.md },
  goalIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, height: 56, borderRadius: BorderRadius.md },
});
