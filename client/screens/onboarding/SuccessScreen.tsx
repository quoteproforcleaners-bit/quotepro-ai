import React, { useEffect } from "react";
import { View, StyleSheet, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const GOAL_TIPS: Record<string, string> = {
  send_quote: "Check the Growth tab daily for smart follow-up suggestions and revenue opportunities.",
  convert_recurring: "Use the Jobs tab to schedule recurring visits and lock in steady income.",
  raise_prices: "Review your Pricing Settings to fine-tune rates as you gain confidence.",
  more_repeat: "The Growth tab shows which past customers are ready to rebook.",
};

const MAX_CONTENT_WIDTH = 560;

interface Props {
  sentQuote: boolean;
  followupsEnabled: boolean;
  businessName: string;
  goal?: string;
  onFinish: () => void;
}

export default function SuccessScreen({ sentQuote, followupsEnabled, businessName, goal, onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.value = withSpring(1, { damping: 12, stiffness: 90 });
    opacity.value = withTiming(1, { duration: 600 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const achievements = [
    { done: true, label: "Business profile created" },
    { done: true, label: "First quote generated" },
    { done: sentQuote, label: sentQuote ? "Quote sent to customer" : "Quote ready to send" },
    { done: followupsEnabled, label: followupsEnabled ? "Auto follow-ups enabled" : "Follow-ups available" },
  ];

  const useMaxWidth = screenWidth > MAX_CONTENT_WIDTH + 40;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing["5xl"],
            paddingBottom: insets.bottom + Spacing["2xl"],
          },
          useMaxWidth ? { alignItems: "center" } : undefined,
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={[styles.innerContent, useMaxWidth ? { maxWidth: MAX_CONTENT_WIDTH, width: "100%" } : undefined]}>
          <Animated.View style={[styles.heroSection, animStyle]}>
            <View style={[styles.successCircle, { backgroundColor: theme.success + "15" }]}>
              <LinearGradient
                colors={[theme.success, "#059669"]}
                style={styles.successGradient}
              >
                <Feather name="check" size={44} color="#FFFFFF" />
              </LinearGradient>
            </View>

            <ThemedText type="hero" style={styles.title}>
              You're all set!
            </ThemedText>
            <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
              {businessName} is ready to close more jobs
            </ThemedText>
          </Animated.View>

          <View style={styles.achievementsList}>
            {achievements.map((a, i) => (
              <View
                key={i}
                style={[styles.achievementRow, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)" }]}
              >
                <View style={[styles.achieveIcon, { backgroundColor: a.done ? theme.success + "20" : theme.backgroundSecondary }]}>
                  <Feather name={a.done ? "check-circle" : "circle"} size={18} color={a.done ? theme.success : theme.textSecondary} />
                </View>
                <ThemedText type="body" style={{ flex: 1, color: a.done ? theme.text : theme.textSecondary }}>
                  {a.label}
                </ThemedText>
              </View>
            ))}
          </View>

          <View style={[styles.tipCard, { backgroundColor: isDark ? "#101B2D" : "#EFF6FF", borderColor: theme.primary + "30" }]}>
            <View style={styles.tipHeader}>
              <Feather name="info" size={16} color={theme.primary} />
              <ThemedText type="subtitle" style={{ color: theme.primary, fontWeight: "600" }}>Pro Tip</ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {GOAL_TIPS[goal || "send_quote"] || GOAL_TIPS.send_quote}
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md, backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.footerInner, useMaxWidth ? { maxWidth: MAX_CONTENT_WIDTH } : undefined]}>
          <Pressable
            testID="button-onboarding-finish"
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onFinish(); }}
            style={[styles.finishBtn, { backgroundColor: theme.primary }]}
          >
            <ThemedText type="subtitle" style={{ color: "#FFFFFF", fontWeight: "700" }}>Go to Dashboard</ThemedText>
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
  heroSection: { alignItems: "center", marginBottom: Spacing["2xl"] },
  successCircle: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", marginBottom: Spacing["2xl"] },
  successGradient: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  title: { textAlign: "center", marginBottom: Spacing.sm },
  subtitle: { textAlign: "center", maxWidth: 280 },
  achievementsList: { gap: Spacing.sm, marginBottom: Spacing.xl },
  achievementRow: { flexDirection: "row", alignItems: "center", padding: Spacing.md, borderRadius: BorderRadius.xs, gap: Spacing.md },
  achieveIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  tipCard: { padding: Spacing.lg, borderRadius: BorderRadius.sm, borderWidth: 1, marginBottom: Spacing.lg },
  tipHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.sm },
  footer: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, alignItems: "center" },
  footerInner: { width: "100%" },
  finishBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, height: 56, borderRadius: BorderRadius.md },
});
