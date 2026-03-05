import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Platform,
  useWindowDimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Elevation } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useLanguage } from "@/context/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import { ensureInstallDate, incrementSessionCount } from "@/lib/growthLoop";
import OnboardingBanner from "@/components/OnboardingBanner";
import SocialProofBanner from "@/components/SocialProofBanner";
import { useProGate } from "@/components/ProGate";
import { useTutorial } from "@/context/TutorialContext";
import { DASHBOARD_TOUR } from "@/lib/tourDefinitions";

type WidgetId = "hero" | "quickQuote" | "momentum" | "streak" | "aiEngine" | "glance";

const DEFAULT_WIDGET_ORDER: WidgetId[] = ["hero", "quickQuote", "momentum", "streak", "aiEngine", "glance"];

const WIDGET_LABELS: Record<WidgetId, { en: string; icon: keyof typeof Feather.glyphMap }> = {
  hero: { en: "Revenue Leak Detector", icon: "alert-triangle" },
  quickQuote: { en: "Quick Quote", icon: "zap" },
  momentum: { en: "Sales Momentum", icon: "trending-up" },
  streak: { en: "Follow-Up Streak", icon: "target" },
  aiEngine: { en: "AI Revenue Engine", icon: "cpu" },
  glance: { en: "Today at a Glance", icon: "eye" },
};

function useSemanticTokens() {
  const { theme, isDark } = useTheme();
  return useMemo(() => {
    const t = theme as any;
    return {
      pageBg: t.colorPageBg || (isDark ? "#000000" : "#F6F8FB"),
      cardBg: t.colorCardBg || (isDark ? "#1C1C1E" : "#FFFFFF"),
      primary: t.colorPrimary || theme.primary,
      primaryText: t.colorPrimaryText || theme.primaryText,
      urgency: t.colorUrgency || theme.warning,
      urgencyBg: t.colorUrgencyBg || (isDark ? "rgba(245,158,11,0.08)" : "rgba(217,119,6,0.06)"),
      urgencyBorder: t.colorUrgencyBorder || theme.warningBorder,
      success: t.colorSuccess || theme.success,
      successBg: t.colorSuccessBg || (isDark ? "rgba(34,197,94,0.08)" : "rgba(22,163,74,0.06)"),
      danger: t.colorDanger || theme.error,
      dangerBg: t.colorDangerBg || "rgba(220,38,38,0.06)",
      textPrimary: t.colorTextPrimary || theme.text,
      textSecondary: t.colorTextSecondary || theme.textSecondary,
      textMuted: t.colorTextMuted || theme.textMuted,
      divider: t.colorDivider || theme.border,
      border: theme.border,
      primarySoft: theme.primarySoft,
      surface: isDark ? (t.surface2 || "#3A3A3C") : (t.surface1 || "#F6F8FB"),
      isDark,
    };
  }, [theme, isDark]);
}

function getRiskState(oldestDays: number): { label: string; borderColor: (st: ReturnType<typeof useSemanticTokens>) => string; pillColor: (st: ReturnType<typeof useSemanticTokens>) => string; pillBg: (st: ReturnType<typeof useSemanticTokens>) => string } {
  if (oldestDays >= 5) return {
    label: "Critical",
    borderColor: (st) => st.urgency,
    pillColor: (st) => st.danger,
    pillBg: (st) => st.dangerBg,
  };
  if (oldestDays >= 3) return {
    label: "Cold",
    borderColor: (st) => st.urgency,
    pillColor: (st) => st.urgency,
    pillBg: (st) => st.urgencyBg,
  };
  return {
    label: "Cooling",
    borderColor: (st) => st.isDark ? "rgba(217,160,50,0.4)" : "rgba(180,130,30,0.3)",
    pillColor: (st) => st.isDark ? "#E0A830" : "#B08020",
    pillBg: (st) => st.isDark ? "rgba(224,168,48,0.08)" : "rgba(176,128,32,0.06)",
  };
}

function getProtectionScore(healthPercent: number, followUpCount: number, closeRate: number): { score: number; grade: string } {
  if (followUpCount === 0) return { score: 100, grade: "A+" };
  const healthWeight = healthPercent * 0.5;
  const closeWeight = Math.min(closeRate, 100) * 0.3;
  const responsiveness = followUpCount <= 2 ? 20 : followUpCount <= 5 ? 10 : 0;
  const score = Math.round(healthWeight + closeWeight + responsiveness);
  let grade = "F";
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B+";
  else if (score >= 70) grade = "B";
  else if (score >= 60) grade = "C";
  else if (score >= 50) grade = "D";
  return { score, grade };
}

function ProtectionScoreBar({ score, st }: { score: number; st: ReturnType<typeof useSemanticTokens> }) {
  const amberColor = st.isDark ? "#E0A830" : "#B08020";
  const barColor = score >= 90 ? st.primary : score >= 70 ? amberColor : st.danger;
  return (
    <View style={{ marginTop: Spacing.md }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <ThemedText type="caption" style={{ color: st.textMuted, fontWeight: "600", fontSize: 11 }}>Revenue Protection Score</ThemedText>
        <ThemedText type="caption" style={{ color: barColor, fontWeight: "700", fontSize: 11 }}>{score}/100</ThemedText>
      </View>
      <View style={{ height: 5, backgroundColor: st.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderRadius: 3, overflow: "hidden" }}>
        <View style={{ height: 5, width: `${Math.min(score, 100)}%`, backgroundColor: barColor, borderRadius: 3 }} />
      </View>
    </View>
  );
}

function PulsingCta({ children, style }: { children: React.ReactNode; style?: any }) {
  const pulseVal = useSharedValue(1);

  useEffect(() => {
    pulseVal.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseVal.value }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

function FunnelStep({ label, value, color, isLast, st }: { label: string; value: number; color: string; isLast?: boolean; st: ReturnType<typeof useSemanticTokens> }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <ThemedText type="h3" style={{ color, fontWeight: "800" }}>{value}</ThemedText>
      <ThemedText type="caption" style={{ color: st.textMuted, marginTop: 2, fontSize: 11 }}>{label}</ThemedText>
      {!isLast ? (
        <View style={{ position: "absolute", right: -4, top: 6 }}>
          <Feather name="chevron-right" size={12} color={st.textMuted} />
        </View>
      ) : null}
    </View>
  );
}

function StreakDots({ days, streak, st }: { days: string[]; streak: number; st: ReturnType<typeof useSemanticTokens> }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, marginTop: Spacing.sm }}>
      {days.map((day, i) => {
        const active = i < streak;
        return (
          <View key={day} style={{ alignItems: "center", flex: 1 }}>
            <View style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: active ? st.success : (st.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"),
              alignItems: "center",
              justifyContent: "center",
              borderWidth: active ? 0 : 1,
              borderColor: st.divider,
            }}>
              {active ? <Feather name="check" size={12} color="#FFF" /> : null}
            </View>
            <ThemedText type="caption" style={{ color: active ? st.success : st.textMuted, fontSize: 9, marginTop: 2, fontWeight: "600" }}>{day}</ThemedText>
          </View>
        );
      })}
    </View>
  );
}

function GlanceCard({ title, value, icon, color, onPress, st }: {
  title: string; value: string; icon: keyof typeof Feather.glyphMap; color: string; onPress?: () => void; st: ReturnType<typeof useSemanticTokens>;
}) {
  return (
    <Pressable
      style={[s.glanceCard, { backgroundColor: st.cardBg, borderColor: st.divider }, Elevation.e1]}
      onPress={onPress}
      testID={`glance-${title.toLowerCase().replace(/\s/g, "-")}`}
    >
      <View style={[s.glanceIcon, { backgroundColor: `${color}14` }]}>
        <Feather name={icon} size={15} color={color} />
      </View>
      <ThemedText type="h3" style={{ marginTop: 6 }}>{value}</ThemedText>
      <ThemedText type="caption" style={{ color: st.textSecondary, marginTop: 2 }}>{title}</ThemedText>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { isDark } = useTheme();
  const st = useSemanticTokens();
  const { businessProfile: profile } = useApp();
  const { t } = useLanguage();
  const { isPro, requirePro } = useProGate();
  const { subscriptionStatus, trialDaysLeft } = useSubscription();
  const { startTour, hasCompletedTour, isActive: tourActive } = useTutorial();

  const [refreshing, setRefreshing] = useState(false);
  const [setupSkipped, setSetupSkipped] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [setupLoaded, setSetupLoaded] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(DEFAULT_WIDGET_ORDER);
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<WidgetId>>(new Set());
  const [isEditingWidgets, setIsEditingWidgets] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const skipped = await AsyncStorage.getItem("@quotepro_setup_skipped");
          const checklistData = await AsyncStorage.getItem("@quotepro_setup_checklist");
          setSetupSkipped(skipped === "true");
          if (checklistData) {
            const items = JSON.parse(checklistData);
            setSetupCompleted(items.length >= 8);
          }
          setSetupLoaded(true);
        } catch {
          setSetupLoaded(true);
        }
      })();
    }, [])
  );

  const showSetupCard = setupLoaded && isPro && !setupCompleted && !setupSkipped;

  useEffect(() => {
    ensureInstallDate().catch(() => {});
    incrementSessionCount().catch(() => {});
    trackEvent("app_open");
    trackEvent("home_view");
    (async () => {
      try {
        const savedOrder = await AsyncStorage.getItem("dashboardWidgetOrderV2");
        const savedHidden = await AsyncStorage.getItem("dashboardHiddenWidgetsV2");
        if (savedOrder) {
          const parsed = JSON.parse(savedOrder) as WidgetId[];
          const validIds = new Set<string>(DEFAULT_WIDGET_ORDER);
          const filtered = parsed.filter((id) => validIds.has(id));
          DEFAULT_WIDGET_ORDER.forEach((id) => {
            if (!filtered.includes(id)) filtered.push(id);
          });
          setWidgetOrder(filtered);
        }
        if (savedHidden) {
          setHiddenWidgets(new Set(JSON.parse(savedHidden) as WidgetId[]));
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!hasCompletedTour(DASHBOARD_TOUR.id) && !tourActive) {
      const timer = setTimeout(() => {
        startTour(DASHBOARD_TOUR);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const { data: followUpQueue = [], refetch: refetchFollowUpQueue } = useQuery<any[]>({
    queryKey: ["/api/followup-queue"],
  });

  const { data: streakData, refetch: refetchStreak } = useQuery<{
    currentStreak: number;
    longestStreak: number;
    lastActionDate: string | null;
  }>({ queryKey: ["/api/streaks"] });

  const { data: opportunitiesDormant = [], refetch: refetchDormant } = useQuery<any[]>({
    queryKey: ["/api/opportunities/dormant"],
  });

  const { data: opportunitiesLost = [], refetch: refetchLost } = useQuery<any[]>({
    queryKey: ["/api/opportunities/lost"],
  });

  const { data: stats, refetch: refetchStats } = useQuery<{
    totalQuotes: number;
    sentQuotes: number;
    acceptedQuotes: number;
    declinedQuotes: number;
    expiredQuotes: number;
    totalRevenue: number;
    avgQuoteValue: number;
    closeRate: number;
  }>({ queryKey: ["/api/reports/stats"] });

  const { data: quotes = [], refetch: refetchQuotes } = useQuery<any[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: customers = [], refetch: refetchCustomers } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  const { data: allJobs = [], refetch: refetchJobs } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: ratingSummary } = useQuery<{ average: number; total: number; distribution: Record<number, number> }>({
    queryKey: ["/api/ratings/summary"],
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchQuotes(), refetchCustomers(), refetchJobs(), refetchFollowUpQueue(), refetchStreak(), refetchDormant(), refetchLost()]);
    setRefreshing(false);
  };

  const followUpQueueCount = followUpQueue.length;
  const amountAtRisk = useMemo(() => {
    return followUpQueue.reduce((sum: number, q: any) => sum + (q.total || 0), 0);
  }, [followUpQueue]);
  const oldestQuoteDays = useMemo(() => {
    if (followUpQueue.length === 0) return 0;
    const now = Date.now();
    let oldest = 0;
    followUpQueue.forEach((q: any) => {
      const sent = q.sentAt ? new Date(q.sentAt).getTime() : new Date(q.createdAt).getTime();
      const days = Math.floor((now - sent) / (1000 * 60 * 60 * 24));
      if (days > oldest) oldest = days;
    });
    return oldest;
  }, [followUpQueue]);

  const currentStreak = streakData?.currentStreak || 0;
  const monthRevenue = stats?.totalRevenue || 0;
  const sentQuotes = stats?.sentQuotes || 0;
  const acceptedQuotes = stats?.acceptedQuotes || 0;
  const wonQuotes = acceptedQuotes;
  const closeRate = stats?.closeRate || 0;

  const viewedQuotes = useMemo(() => {
    return (quotes || []).filter((q: any) => q.viewedAt || q.status === "viewed").length;
  }, [quotes]);

  const followUpHealthPercent = useMemo(() => {
    if (followUpQueueCount === 0) return 100;
    const recentlyFollowedUp = followUpQueue.filter((q: any) => {
      if (!q.lastFollowUpAt) return false;
      const daysSince = (Date.now() - new Date(q.lastFollowUpAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 2;
    }).length;
    return Math.round((recentlyFollowedUp / followUpQueueCount) * 100);
  }, [followUpQueue, followUpQueueCount]);

  const protectionScore = useMemo(() => {
    return getProtectionScore(followUpHealthPercent, followUpQueueCount, closeRate);
  }, [followUpHealthPercent, followUpQueueCount, closeRate]);

  const estimatedLoss = useMemo(() => {
    if (followUpQueueCount === 0) return 0;
    const rate = closeRate > 0 ? closeRate / 100 : 0.45;
    return Math.round(amountAtRisk * (1 - rate));
  }, [amountAtRisk, closeRate, followUpQueueCount]);

  const riskState = useMemo(() => getRiskState(oldestQuoteDays), [oldestQuoteDays]);

  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const streakDaysToShow = Math.min(currentStreak, 7);

  const saveWidgetConfig = useCallback(async (order: WidgetId[], hidden: Set<WidgetId>) => {
    try {
      await AsyncStorage.setItem("dashboardWidgetOrderV2", JSON.stringify(order));
      await AsyncStorage.setItem("dashboardHiddenWidgetsV2", JSON.stringify([...hidden]));
    } catch {}
  }, []);

  const moveWidget = useCallback((widgetId: WidgetId, direction: "up" | "down") => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setWidgetOrder((prev) => {
      const idx = prev.indexOf(widgetId);
      if (idx < 0) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      saveWidgetConfig(next, hiddenWidgets);
      return next;
    });
  }, [hiddenWidgets, saveWidgetConfig]);

  const toggleWidgetVisibility = useCallback((widgetId: WidgetId) => {
    setHiddenWidgets((prev) => {
      const next = new Set(prev);
      if (next.has(widgetId)) {
        next.delete(widgetId);
      } else {
        next.add(widgetId);
      }
      saveWidgetConfig(widgetOrder, next);
      return next;
    });
  }, [widgetOrder, saveWidgetConfig]);

  const riskBorderColor = riskState.borderColor(st);
  const riskPillColor = riskState.pillColor(st);
  const riskPillBg = riskState.pillBg(st);

  const renderWidget = useCallback((widgetId: WidgetId) => {
    switch (widgetId) {
      case "hero":
        return (
          <View key="hero">
            {followUpQueueCount > 0 ? (
              <View
                style={[s.card, { backgroundColor: st.cardBg, borderColor: st.divider, borderLeftWidth: 3, borderLeftColor: riskBorderColor }, Elevation.e1]}
                testID="hero-revenue-card"
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.sm }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Feather name="alert-triangle" size={14} color={st.urgency} />
                    <ThemedText type="caption" style={{ color: st.urgency, fontWeight: "700", marginLeft: 6, letterSpacing: 0.5, fontSize: 11 }}>REVENUE LEAK DETECTOR</ThemedText>
                  </View>
                  <View style={[s.riskPill, { backgroundColor: riskPillBg, borderColor: `${riskPillColor}30` }]}>
                    <ThemedText type="caption" style={{ color: riskPillColor, fontWeight: "700", fontSize: 10 }}>{riskState.label}</ThemedText>
                  </View>
                </View>

                <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: Spacing.xs }}>
                  <ThemedText type="h2" style={{ color: st.urgency, fontWeight: "800" }}>
                    ${amountAtRisk.toLocaleString()}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: st.textSecondary, marginLeft: 6 }}>at risk</ThemedText>
                </View>

                <ThemedText type="small" style={{ color: st.textSecondary, marginTop: 6 }}>
                  {followUpQueueCount} {followUpQueueCount === 1 ? "quote" : "quotes"} slipping  {"\u00B7"}  Oldest: {oldestQuoteDays} {oldestQuoteDays === 1 ? "day" : "days"}
                </ThemedText>

                <ThemedText type="caption" style={{ color: st.textMuted, marginTop: 4, fontStyle: "italic", lineHeight: 16 }}>
                  If your close rate stays at {Math.round(closeRate || 45)}%, you're likely losing ~${estimatedLoss.toLocaleString()}.
                </ThemedText>

                <View style={{ flexDirection: "row", alignItems: "center", marginTop: Spacing.sm }}>
                  <ThemedText type="caption" style={{ color: st.textMuted, fontWeight: "600", fontSize: 11 }}>
                    Score: {protectionScore.score}/100 ({protectionScore.grade})
                  </ThemedText>
                </View>
                <ProtectionScoreBar score={protectionScore.score} st={st} />

                <View style={{ flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.lg }}>
                  <PulsingCta style={{ flex: 1 }}>
                    <Pressable
                      onPress={() => navigation.navigate("FollowUpQueue")}
                      style={[s.ctaButton, { backgroundColor: st.urgency }]}
                      testID="hero-follow-up-cta"
                    >
                      <Feather name="shield" size={14} color="#FFF" />
                      <ThemedText type="body" style={{ color: "#FFF", fontWeight: "700", marginLeft: 6 }}>Stop the Leak</ThemedText>
                    </Pressable>
                  </PulsingCta>
                </View>
                <Pressable
                  onPress={() => navigation.navigate("Main", { screen: "QuotesTab" })}
                  style={{ alignSelf: "center", marginTop: Spacing.md }}
                  testID="hero-view-quotes"
                >
                  <ThemedText type="small" style={{ color: st.primary, fontWeight: "600" }}>See what's leaking</ThemedText>
                </Pressable>
              </View>
            ) : (
              <View style={[s.card, { backgroundColor: st.cardBg, borderColor: st.divider, borderLeftWidth: 3, borderLeftColor: st.success }, Elevation.e1]}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={[s.iconCircle, { backgroundColor: st.successBg }]}>
                    <Feather name="check-circle" size={16} color={st.success} />
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <ThemedText type="subtitle" style={{ fontWeight: "700" }}>All Caught Up</ThemedText>
                    <ThemedText type="small" style={{ color: st.textSecondary, marginTop: 2 }}>No revenue at risk. Keep the momentum going.</ThemedText>
                  </View>
                </View>
                <ProtectionScoreBar score={100} st={st} />
              </View>
            )}
          </View>
        );

      case "quickQuote":
        return (
          <Pressable
            key="quickQuote"
            onPress={() => navigation.navigate("QuoteCalculator")}
            style={[s.card, { backgroundColor: st.cardBg, borderColor: st.divider }, Elevation.e1]}
            testID="quick-quote-card"
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={[s.iconCircle, { backgroundColor: st.primarySoft }]}>
                <Feather name="zap" size={18} color={st.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <ThemedText type="subtitle" style={{ fontWeight: "700" }}>Quick Quote</ThemedText>
                <ThemedText type="caption" style={{ color: st.textSecondary, marginTop: 2 }}>
                  Create and send a quote with AI.
                </ThemedText>
              </View>
              <View style={[s.ctaCircle, { backgroundColor: st.primary }]}>
                <Feather name="plus" size={16} color="#FFF" />
              </View>
            </View>
          </Pressable>
        );

      case "momentum":
        return (
          <View key="momentum" style={[s.card, { backgroundColor: st.cardBg, borderColor: st.divider }, Elevation.e1]}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.md }}>
              <Feather name="trending-up" size={14} color={st.primary} />
              <ThemedText type="small" style={{ fontWeight: "700", marginLeft: 6, letterSpacing: 0.3 }}>SALES MOMENTUM</ThemedText>
            </View>
            <View style={{ flexDirection: "row" }}>
              <FunnelStep label="Sent" value={sentQuotes} color={st.primary} st={st} />
              <FunnelStep label="Viewed" value={viewedQuotes} color={st.textSecondary} st={st} />
              <FunnelStep label="Accepted" value={acceptedQuotes} color={st.textSecondary} st={st} />
              <FunnelStep label="Won" value={wonQuotes} color={st.success} isLast st={st} />
            </View>
            {stats?.closeRate != null ? (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: st.divider }}>
                <ThemedText type="caption" style={{ color: st.textMuted, fontWeight: "600" }}>
                  Close rate
                </ThemedText>
                <ThemedText type="small" style={{ color: st.textPrimary, fontWeight: "700", marginLeft: 6 }}>
                  {Math.round(stats.closeRate)}%
                </ThemedText>
              </View>
            ) : null}
          </View>
        );

      case "streak":
        return (
          <View key="streak" style={[s.card, { backgroundColor: st.cardBg, borderColor: st.divider }, Elevation.e1]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Feather name="target" size={16} color={currentStreak > 0 ? st.success : st.textMuted} />
              <ThemedText type="body" style={{ fontWeight: "700", marginLeft: Spacing.sm, flex: 1 }}>
                Follow-Up Streak: {currentStreak} {currentStreak === 1 ? "day" : "days"}
              </ThemedText>
            </View>
            <ThemedText type="caption" style={{ color: st.textSecondary, marginTop: 4 }}>
              Top closers follow up daily.
            </ThemedText>
            <StreakDots days={weekDays} streak={streakDaysToShow} st={st} />
            <Pressable
              onPress={() => navigation.navigate("FollowUpQueue")}
              style={[s.ctaButton, { backgroundColor: currentStreak > 0 ? st.success : st.primary, marginTop: Spacing.md }]}
              testID="keep-streak-cta"
            >
              <Feather name="zap" size={14} color="#FFF" />
              <ThemedText type="small" style={{ color: "#FFF", fontWeight: "700", marginLeft: 6 }}>
                {currentStreak > 0 ? "Keep streak alive" : "Start your streak"}
              </ThemedText>
            </Pressable>
          </View>
        );

      case "aiEngine":
        return (
          <View key="aiEngine" style={[s.card, { backgroundColor: st.cardBg, borderColor: st.divider }, Elevation.e1]}>
            {isPro ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={[s.iconCircle, { backgroundColor: st.successBg }]}>
                    <Feather name="cpu" size={16} color={st.success} />
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <ThemedText type="subtitle" style={{ fontWeight: "700" }}>AI Revenue Engine</ThemedText>
                      <ThemedText type="caption" style={{ color: st.success, fontWeight: "700", marginLeft: 8 }}>ON</ThemedText>
                    </View>
                    <ThemedText type="caption" style={{ color: st.textSecondary, marginTop: 2 }}>
                      Auto follow-ups and smart replies active.
                    </ThemedText>
                  </View>
                  <View style={[s.statusDot, { backgroundColor: st.success }]} />
                </View>
                <Pressable
                  onPress={() => navigation.navigate("AutomationsHub")}
                  style={[s.outlineButton, { borderColor: st.primary, marginTop: Spacing.md }]}
                  testID="manage-sequences-cta"
                >
                  <ThemedText type="small" style={{ color: st.primary, fontWeight: "600" }}>Manage Sequences</ThemedText>
                  <Feather name="chevron-right" size={14} color={st.primary} style={{ marginLeft: 4 }} />
                </Pressable>
              </>
            ) : (
              <>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={[s.iconCircle, { backgroundColor: st.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }]}>
                    <Feather name="cpu" size={16} color={st.textMuted} />
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <ThemedText type="subtitle" style={{ fontWeight: "700" }}>AI Revenue Engine</ThemedText>
                      <ThemedText type="caption" style={{ color: st.textMuted, fontWeight: "700", marginLeft: 8 }}>OFF</ThemedText>
                    </View>
                    <ThemedText type="caption" style={{ color: st.textSecondary, marginTop: 2 }}>
                      Turn on to close more quotes automatically.
                    </ThemedText>
                  </View>
                </View>
                <View style={{ marginTop: Spacing.md, marginLeft: 44 }}>
                  {["Auto follow-ups", "Smart objection replies", "Quote descriptions that sell"].map(item => (
                    <View key={item} style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                      <Feather name="check" size={12} color={st.primary} />
                      <ThemedText type="small" style={{ color: st.textSecondary, marginLeft: 8 }}>{item}</ThemedText>
                    </View>
                  ))}
                </View>
                <Pressable
                  onPress={() => navigation.navigate("Paywall")}
                  style={[s.ctaButton, { backgroundColor: st.primary, marginTop: Spacing.md }]}
                  testID="activate-ai-cta"
                >
                  <Feather name="zap" size={14} color="#FFF" />
                  <ThemedText type="body" style={{ color: "#FFF", fontWeight: "700", marginLeft: 6 }}>Activate AI Engine</ThemedText>
                </Pressable>
              </>
            )}
          </View>
        );

      case "glance":
        return (
          <View key="glance">
            <View style={s.sectionHeader}>
              <ThemedText type="subtitle" style={{ fontWeight: "700", fontSize: 15 }}>Today at a Glance</ThemedText>
            </View>
            <View style={s.glanceRow}>
              <GlanceCard
                title="Need follow-up"
                value={followUpQueueCount.toString()}
                icon="phone-missed"
                color={st.urgency}
                onPress={() => navigation.navigate("FollowUpQueue")}
                st={st}
              />
              <GlanceCard
                title="Quotes out"
                value={sentQuotes.toString()}
                icon="send"
                color={st.primary}
                onPress={() => navigation.navigate("Main", { screen: "QuotesTab" })}
                st={st}
              />
              <GlanceCard
                title="Won this month"
                value={`$${monthRevenue.toLocaleString()}`}
                icon="trending-up"
                color={st.success}
                onPress={() => navigation.navigate("Main", { screen: "GrowthTab" })}
                st={st}
              />
            </View>
          </View>
        );

      default:
        return null;
    }
  }, [followUpQueueCount, amountAtRisk, oldestQuoteDays, followUpHealthPercent, currentStreak, sentQuotes, viewedQuotes, acceptedQuotes, wonQuotes, monthRevenue, st, isDark, navigation, isPro, stats, closeRate, estimatedLoss, protectionScore, riskState, riskBorderColor, riskPillColor, riskPillBg, streakDaysToShow, weekDays]);

  return (
    <View style={[s.container, { backgroundColor: st.pageBg }]}>
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: tabBarHeight + Spacing.xl },
          useMaxWidth ? { maxWidth: 560, alignSelf: "center" as const, width: "100%" } : undefined,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <ProfileAvatar
              config={profile?.avatarConfig || null}
              size={44}
              fallbackInitials={profile?.companyName}
              style={{ marginRight: Spacing.sm }}
            />
            <View style={{ flex: 1 }}>
              <ThemedText type="h4" numberOfLines={1} style={{ fontWeight: "800" }}>
                QuotePro
              </ThemedText>
              <View style={[s.salesBadge, { backgroundColor: st.primarySoft }]}>
                <Feather name="zap" size={10} color={st.primary} />
                <ThemedText type="caption" style={{ color: st.primary, fontWeight: "700", marginLeft: 3, fontSize: 10, letterSpacing: 0.3 }}>
                  Revenue OS
                </ThemedText>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
            <Pressable
              onPress={() => setIsEditingWidgets(!isEditingWidgets)}
              style={[s.headerBtn, { backgroundColor: isEditingWidgets ? st.primarySoft : (st.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"), borderColor: isEditingWidgets ? st.primary : st.divider }]}
              testID="customize-widgets-btn"
            >
              <Feather name={isEditingWidgets ? "check" : "sliders"} size={14} color={isEditingWidgets ? st.primary : st.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Main", { screen: "SettingsTab" })}
              style={[s.headerBtn, { backgroundColor: st.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", borderColor: st.divider }]}
              testID="settings-btn"
            >
              <Feather name="settings" size={14} color={st.textSecondary} />
            </Pressable>
          </View>
        </View>

        <OnboardingBanner />

        {showSetupCard ? (
          <Pressable
            onPress={() => navigation.navigate("ProSetupChecklist" as any)}
            style={[s.card, { backgroundColor: st.cardBg, borderColor: st.primary + "30", borderWidth: 1 }, Elevation.e1]}
            testID="button-pro-setup"
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: st.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Feather name="clipboard" size={20} color={st.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <ThemedText type="subtitle" style={{ fontWeight: "700" }}>
                  Complete Your Pro Setup
                </ThemedText>
                <ThemedText type="small" style={{ color: st.textSecondary, marginTop: 2 }}>
                  {subscriptionStatus === "trial" && trialDaysLeft != null
                    ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} left in trial — get set up now`
                    : "Follow our guided setup to start quoting like a pro"}
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color={st.primary} />
            </View>
          </Pressable>
        ) : null}

        <SocialProofBanner />

        {isEditingWidgets ? (
          <View style={[s.card, { backgroundColor: st.cardBg, borderColor: st.divider }, Elevation.e1]}>
            <View style={s.editorHeader}>
              <Feather name="layout" size={16} color={st.primary} />
              <ThemedText type="subtitle" style={{ fontWeight: "700", marginLeft: Spacing.sm, flex: 1 }}>
                Customize Dashboard
              </ThemedText>
              <Pressable onPress={() => setIsEditingWidgets(false)} hitSlop={12} testID="editor-done-btn">
                <ThemedText type="small" style={{ color: st.primary, fontWeight: "600" }}>Done</ThemedText>
              </Pressable>
            </View>
            {widgetOrder.map((widgetId, index) => {
              const isHidden = hiddenWidgets.has(widgetId);
              const label = WIDGET_LABELS[widgetId];
              return (
                <View key={widgetId} style={[s.editorRow, { borderTopColor: st.divider }]}>
                  <Feather name="menu" size={14} color={st.textMuted} style={{ marginRight: Spacing.xs }} />
                  <Pressable
                    onPress={() => {
                      if (Platform.OS !== "web") {
                        Haptics.selectionAsync();
                      }
                      toggleWidgetVisibility(widgetId);
                    }}
                    style={[s.editorVisibilityBtn, { backgroundColor: isHidden ? "transparent" : st.primarySoft }]}
                    testID={`toggle-${widgetId}`}
                  >
                    <Feather name={isHidden ? "eye-off" : "eye"} size={14} color={isHidden ? st.textMuted : st.primary} />
                  </Pressable>
                  <Feather name={label.icon} size={14} color={isHidden ? st.textMuted : st.textSecondary} style={{ marginLeft: Spacing.sm }} />
                  <ThemedText
                    type="small"
                    style={{ flex: 1, marginLeft: Spacing.sm, color: isHidden ? st.textMuted : st.textPrimary, fontWeight: "500" }}
                    numberOfLines={1}
                  >
                    {label.en}
                  </ThemedText>
                  <View style={s.editorArrows}>
                    <Pressable
                      onPress={() => moveWidget(widgetId, "up")}
                      style={[s.editorArrowBtn, { opacity: index === 0 ? 0.3 : 1 }]}
                      disabled={index === 0}
                      testID={`move-up-${widgetId}`}
                    >
                      <Feather name="chevron-up" size={16} color={st.textSecondary} />
                    </Pressable>
                    <Pressable
                      onPress={() => moveWidget(widgetId, "down")}
                      style={[s.editorArrowBtn, { opacity: index === widgetOrder.length - 1 ? 0.3 : 1 }]}
                      disabled={index === widgetOrder.length - 1}
                      testID={`move-down-${widgetId}`}
                    >
                      <Feather name="chevron-down" size={16} color={st.textSecondary} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {widgetOrder.map((widgetId) => {
          if (hiddenWidgets.has(widgetId)) return null;
          return renderWidget(widgetId);
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  salesBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: 2,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  card: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.md,
  },
  riskPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: BorderRadius.full,
  },
  outlineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  glanceRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  glanceCard: {
    flex: 1,
    borderRadius: 18,
    padding: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  glanceIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: Spacing.sm,
  },
  editorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  editorVisibilityBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  editorArrows: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  editorArrowBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
});
