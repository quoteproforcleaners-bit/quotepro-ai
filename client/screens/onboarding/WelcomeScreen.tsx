import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface Props {
  onStart: () => void;
  onSkip: () => void;
}

export default function WelcomeScreen({ onStart, onSkip }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.content, { paddingTop: insets.top + Spacing["5xl"], paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.heroSection}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primary + "15" }]}>
            <LinearGradient
              colors={[theme.primary, isDark ? "#0062CC" : "#0052B3"]}
              style={styles.iconGradient}
            >
              <Feather name="zap" size={40} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <ThemedText type="hero" style={styles.title}>
            Let's close your next job faster.
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            In 2 minutes, you'll send a pro quote that wins work.
          </ThemedText>
        </View>

        <View style={styles.features}>
          {[
            { icon: "file-text" as const, label: "Create professional quotes" },
            { icon: "send" as const, label: "Send to customers instantly" },
            { icon: "repeat" as const, label: "Auto follow-ups that close deals" },
          ].map((f, i) => (
            <View key={i} style={[styles.featureRow, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)" }]}>
              <View style={[styles.featureIcon, { backgroundColor: theme.primary + "15" }]}>
                <Feather name={f.icon} size={16} color={theme.primary} />
              </View>
              <ThemedText type="subtitle" style={{ flex: 1 }}>{f.label}</ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable
            testID="button-onboarding-start"
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onStart(); }}
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
          >
            <ThemedText type="subtitle" style={{ color: "#FFFFFF", fontWeight: "700" }}>
              Start (Recommended)
            </ThemedText>
            <Feather name="arrow-right" size={18} color="#FFFFFF" />
          </Pressable>

          <Pressable
            testID="button-onboarding-skip"
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSkip(); }}
            style={styles.skipBtn}
          >
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Explore app
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: Spacing.xl, justifyContent: "space-between" },
  heroSection: { alignItems: "center", marginTop: Spacing["3xl"] },
  iconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", marginBottom: Spacing["2xl"] },
  iconGradient: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  title: { textAlign: "center", marginBottom: Spacing.md },
  subtitle: { textAlign: "center", maxWidth: 280 },
  features: { gap: Spacing.sm },
  featureRow: { flexDirection: "row", alignItems: "center", padding: Spacing.lg, borderRadius: BorderRadius.sm, gap: Spacing.md },
  featureIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  actions: { gap: Spacing.md },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, height: 56, borderRadius: BorderRadius.md },
  skipBtn: { alignItems: "center", padding: Spacing.md },
});
