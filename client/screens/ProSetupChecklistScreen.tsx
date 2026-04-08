import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform, useWindowDimensions, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { trackEvent } from "@/lib/analytics";
import { apiRequest } from "@/lib/query-client";

const STORAGE_KEY = "@quotepro_setup_checklist";
const ACTIVATION_START_KEY = "@quotepro_activation_start";
const ACTIVATION_WINDOW_HOURS = 72;

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  action: string;
  category: "critical" | "essentials" | "features" | "growth";
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "first_quote",
    title: "Create your first real quote",
    description: "Enter a real customer's info and generate a professional 3-tier quote.",
    icon: "file-text",
    action: "QuoteCalculator",
    category: "critical",
  },
  {
    id: "send_quote",
    title: "Send a quote to a customer",
    description: "Text or email a quote directly from the app to see how customers receive it.",
    icon: "send",
    action: "QuoteCalculator",
    category: "critical",
  },
  {
    id: "business_profile",
    title: "Complete your business profile",
    description: "Add your company name, logo, and service area so quotes look professional.",
    icon: "briefcase",
    action: "Settings",
    category: "essentials",
  },
  {
    id: "pricing",
    title: "Set your pricing",
    description: "Configure base rates, add-on prices, and frequency discounts for your market.",
    icon: "dollar-sign",
    action: "PricingSettings",
    category: "essentials",
  },
  {
    id: "ai_draft",
    title: "Try AI-generated messages",
    description: "Open a saved quote and tap 'Generate AI Draft' to see AI write a follow-up for you.",
    icon: "zap",
    action: "Quotes",
    category: "features",
  },
  {
    id: "followup_queue",
    title: "Check your Follow-Up Queue",
    description: "See which customers need a follow-up and take action with one tap.",
    icon: "repeat",
    action: "FollowUpQueue",
    category: "features",
  },
  {
    id: "notifications",
    title: "Enable daily notifications",
    description: "Get a morning reminder of who needs follow-up so no job slips through the cracks.",
    icon: "bell",
    action: "Settings",
    category: "growth",
  },
  {
    id: "calendar",
    title: "Connect Google Calendar",
    description: "Sync accepted quotes to your calendar so jobs are automatically scheduled.",
    icon: "calendar",
    action: "Settings",
    category: "growth",
  },
];

const CATEGORY_LABELS = {
  essentials: { title: "Getting Started", icon: "play-circle" as const },
  features: { title: "Explore Pro Features", icon: "star" as const },
  growth: { title: "Set Up for Growth", icon: "trending-up" as const },
};

function getTimeRemaining(startTime: number) {
  const elapsedMs = Date.now() - startTime;
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const remainingHours = ACTIVATION_WINDOW_HOURS - elapsedHours;
  if (remainingHours <= 0) return { hours: 0, minutes: 0, expired: true };
  const h = Math.floor(remainingHours);
  const m = Math.floor((remainingHours - h) * 60);
  return { hours: h, minutes: m, expired: false };
}

function ProgressRing({
  percent,
  size = 96,
  strokeWidth = 8,
  color,
  trackColor,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(percent, 100) / 100);

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

export default function ProSetupChecklistScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;
  const { theme, isDark } = useTheme();
  const { businessProfile } = useApp();
  const { subscriptionStatus, trialDaysLeft } = useSubscription();
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [activationStart, setActivationStart] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; expired: boolean } | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const successTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const successScale = useSharedValue(0.8);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) {
        try {
          const parsed = JSON.parse(val);
          setCompletedItems(new Set(parsed));
        } catch {}
      }
    });
    trackEvent("app_open", { screen: "pro_setup_checklist" });
    loadActivationStart();
  }, []);

  const loadActivationStart = async () => {
    try {
      const stored = await AsyncStorage.getItem(ACTIVATION_START_KEY);
      if (stored) {
        setActivationStart(Number(stored));
        return;
      }
      const data = await apiRequest("GET", "/api/auth/me") as any;
      const createdAt = data?.user?.createdAt;
      if (createdAt) {
        const ts = new Date(createdAt).getTime();
        await AsyncStorage.setItem(ACTIVATION_START_KEY, String(ts));
        setActivationStart(ts);
      } else {
        const now = Date.now();
        await AsyncStorage.setItem(ACTIVATION_START_KEY, String(now));
        setActivationStart(now);
      }
    } catch {
      const now = Date.now();
      AsyncStorage.setItem(ACTIVATION_START_KEY, String(now)).catch(() => {});
      setActivationStart(now);
    }
  };

  useEffect(() => {
    if (activationStart == null) return;
    setCountdown(getTimeRemaining(activationStart));
    intervalRef.current = setInterval(() => {
      setCountdown(getTimeRemaining(activationStart));
    }, 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activationStart]);

  const completedCount = completedItems.size;
  const totalCount = CHECKLIST_ITEMS.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const sendQuoteDone = completedItems.has("send_quote");
  const showCountdownBanner =
    countdown != null && !sendQuoteDone;

  const successAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));

  const toggleItem = useCallback(
    async (id: string) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setCompletedItems((prev) => {
        const next = new Set(prev);
        const wasCompleted = next.has(id);
        if (wasCompleted) {
          next.delete(id);
        } else {
          next.add(id);
          if (id === "send_quote") {
            successScale.value = withSequence(withSpring(1.08), withSpring(1.0));
            setShowSuccessBanner(true);
            if (successTimeout.current) clearTimeout(successTimeout.current);
            successTimeout.current = setTimeout(() => setShowSuccessBanner(false), 4000);
          }
        }
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next])).catch(() => {});
        return next;
      });
    },
    []
  );

  useEffect(() => {
    return () => {
      if (successTimeout.current) clearTimeout(successTimeout.current);
    };
  }, []);

  const handleItemAction = useCallback(
    (item: ChecklistItem) => {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      try {
        if (item.action === "Settings") {
          navigation.navigate("Settings");
        } else if (item.action === "Quotes") {
          navigation.navigate("Main", { screen: "QuotesTab" });
        } else {
          navigation.navigate(item.action as any);
        }
      } catch {}
    },
    [navigation]
  );

  const handleSkipAttempt = () => setShowSkipModal(true);

  const handleSkipConfirm = async () => {
    setShowSkipModal(false);
    await AsyncStorage.setItem("@quotepro_setup_skipped", "true");
    trackEvent("onboarding_skipped", { stage: "pro_setup_checklist" });
    navigation.goBack();
  };

  const trialMessage =
    subscriptionStatus === "trial" && trialDaysLeft != null
      ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} left in your trial`
      : subscriptionStatus === "active"
      ? "Pro subscription active"
      : "Complete setup to get the most out of QuotePro";

  const renderChecklistItem = (item: ChecklistItem, isCritical = false) => {
    const done = completedItems.has(item.id);
    return (
      <View
        key={item.id}
        style={[
          styles.checklistItem,
          {
            backgroundColor: theme.cardBackground,
            borderColor: done ? `${theme.success}30` : theme.border,
          },
          isCritical && {
            borderLeftWidth: 3,
            borderLeftColor: done ? theme.success : theme.warning,
          },
        ]}
      >
        <Pressable
          onPress={() => toggleItem(item.id)}
          style={[
            styles.checkbox,
            {
              backgroundColor: done ? theme.success : "transparent",
              borderColor: done ? theme.success : theme.border,
            },
          ]}
          testID={`checkbox-${item.id}`}
        >
          {done ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
        </Pressable>

        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
          <ThemedText
            type="body"
            style={{
              fontWeight: "600",
              textDecorationLine: done ? "line-through" : "none",
              color: done ? theme.textSecondary : theme.text,
            }}
          >
            {item.title}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
            {item.description}
          </ThemedText>
        </View>

        <Pressable
          onPress={() => handleItemAction(item)}
          style={[styles.goBtn, { backgroundColor: `${theme.primary}10` }]}
          testID={`go-${item.id}`}
        >
          <Feather name="arrow-right" size={16} color={theme.primary} />
        </Pressable>
      </View>
    );
  };

  const renderCategory = (category: "essentials" | "features" | "growth") => {
    const items = CHECKLIST_ITEMS.filter((i) => i.category === category);
    const catLabel = CATEGORY_LABELS[category];
    const allDone = items.every((i) => completedItems.has(i.id));

    return (
      <View key={category} style={{ marginBottom: Spacing.lg }}>
        <View style={styles.categoryHeader}>
          <Feather name={catLabel.icon} size={14} color={allDone ? theme.success : theme.primary} />
          <ThemedText type="subtitle" style={{ fontWeight: "700", marginLeft: Spacing.xs, flex: 1 }}>
            {catLabel.title}
          </ThemedText>
          {allDone ? (
            <View style={[styles.doneBadge, { backgroundColor: `${theme.success}15` }]}>
              <Feather name="check" size={12} color={theme.success} />
              <ThemedText type="caption" style={{ color: theme.success, fontWeight: "600", marginLeft: 4 }}>
                Done
              </ThemedText>
            </View>
          ) : null}
        </View>
        {items.map((item) => renderChecklistItem(item, false))}
      </View>
    );
  };

  const countdownBannerBg = countdown?.expired
    ? `${theme.error}15`
    : `${theme.warning}15`;
  const countdownBannerBorder = countdown?.expired ? theme.error : theme.warning;
  const countdownIconColor = countdown?.expired ? theme.error : theme.warning;

  const countdownText = countdown?.expired
    ? "Your 72-hour activation window has passed — send a quote now to get back on track"
    : `Send your first quote within ${countdown?.hours}h ${countdown?.minutes}m to maximize your chances of keeping new clients`;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl + 40,
          },
          useMaxWidth
            ? { maxWidth: 560, alignSelf: "center" as const, width: "100%" }
            : undefined,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { backgroundColor: theme.backgroundSecondary }]}
            testID="button-back"
          >
            <Feather name="arrow-left" size={20} color={theme.text} />
          </Pressable>

          <View style={{ flex: 1 }} />

          <Pressable onPress={handleSkipAttempt} testID="button-skip-setup">
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Skip for now
            </ThemedText>
          </Pressable>
        </View>

        {showSuccessBanner ? (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(400)}
            style={[
              styles.successBanner,
              { backgroundColor: `${theme.success}15`, borderColor: `${theme.success}40` },
            ]}
          >
            <Animated.View style={successAnimStyle}>
              <Feather name="check-circle" size={20} color={theme.success} />
            </Animated.View>
            <ThemedText type="body" style={{ color: theme.success, fontWeight: "700", marginLeft: Spacing.sm, flex: 1 }}>
              Quote sent! You're officially on track.
            </ThemedText>
          </Animated.View>
        ) : null}

        {showCountdownBanner ? (
          <Animated.View
            entering={FadeIn.duration(400)}
            style={[
              styles.countdownBanner,
              {
                backgroundColor: countdownBannerBg,
                borderColor: countdownBannerBorder,
              },
            ]}
            testID="countdown-banner"
          >
            <View style={styles.countdownBannerRow}>
              <Feather name="clock" size={16} color={countdownIconColor} />
              <ThemedText
                type="small"
                style={{
                  color: countdownIconColor,
                  fontWeight: "700",
                  marginLeft: Spacing.xs,
                  flex: 1,
                  lineHeight: 18,
                }}
              >
                {countdownText}
              </ThemedText>
            </View>
          </Animated.View>
        ) : null}

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? "#1C1C1E" : `${theme.primary}08`,
              borderColor: `${theme.primary}15`,
            },
          ]}
        >
          <View style={styles.heroRingRow}>
            <View style={styles.heroRingContainer}>
              <ProgressRing
                percent={progressPercent}
                size={96}
                strokeWidth={8}
                color={progressPercent === 100 ? theme.success : theme.primary}
                trackColor={isDark ? "#2C2C2E" : theme.backgroundSecondary}
              />
              <View style={styles.heroRingCenter}>
                <ThemedText type="h3" style={{ color: theme.text, fontWeight: "800", lineHeight: 24 }}>
                  {progressPercent}%
                </ThemedText>
              </View>
            </View>

            <View style={{ flex: 1, marginLeft: Spacing.lg }}>
              <ThemedText type="h3" style={{ color: theme.text, fontWeight: "800" }}>
                Pro Setup Guide
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {trialMessage}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                {completedCount} of {totalCount} steps complete
              </ThemedText>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.tipCard,
            {
              backgroundColor: isDark ? "#1C1C1E" : "#FFF7ED",
              borderColor: isDark ? "#3A3A3C" : "#FDBA7440",
            },
          ]}
        >
          <Feather name="info" size={14} color={theme.warning} />
          <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1, marginLeft: Spacing.sm }}>
            Users who complete all steps are 4x more likely to close their first job with QuotePro.
          </ThemedText>
        </View>

        <View style={{ marginBottom: Spacing.lg }}>
          <View style={styles.categoryHeader}>
            <Feather name="alert-circle" size={14} color={theme.warning} />
            <ThemedText
              type="subtitle"
              style={{ fontWeight: "800", marginLeft: Spacing.xs, flex: 1, color: theme.warning }}
            >
              CRITICAL — Do These First
            </ThemedText>
          </View>
          {CHECKLIST_ITEMS.filter((i) => i.category === "critical").map((item) =>
            renderChecklistItem(item, true)
          )}
        </View>

        {renderCategory("essentials")}
        {renderCategory("features")}
        {renderCategory("growth")}
      </ScrollView>

      <Modal
        visible={showSkipModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSkipModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSkipModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
            <View style={[styles.modalIcon, { backgroundColor: `${theme.warning}15` }]}>
              <Feather name="alert-circle" size={28} color={theme.warning} />
            </View>
            <ThemedText type="h3" style={styles.modalTitle}>
              Skip setup?
            </ThemedText>
            <ThemedText type="body" style={[styles.modalMessage, { color: theme.textSecondary }]}>
              We recommend completing the setup guide to get the most out of your trial. You can always come
              back to it from your dashboard.
            </ThemedText>
            <Pressable
              onPress={() => setShowSkipModal(false)}
              style={[styles.modalPrimaryBtn, { backgroundColor: theme.primary }]}
              testID="button-continue-setup"
            >
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                Continue Setup
              </ThemedText>
            </Pressable>
            <Pressable onPress={handleSkipConfirm} style={styles.modalSecondaryBtn} testID="button-skip-confirm">
              <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "600" }}>
                Skip anyway
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg },
  header: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.lg },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  countdownBanner: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  countdownBannerRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.xs },
  heroCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  heroRingRow: { flexDirection: "row", alignItems: "center" },
  heroRingContainer: { width: 96, height: 96, position: "relative", alignItems: "center", justifyContent: "center" },
  heroRingCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  categoryHeader: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  goBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: "center",
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  modalTitle: { textAlign: "center", marginBottom: Spacing.sm },
  modalMessage: { textAlign: "center", marginBottom: Spacing.xl, lineHeight: 22 },
  modalPrimaryBtn: {
    width: "100%",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  modalSecondaryBtn: { paddingVertical: Spacing.sm },
});
