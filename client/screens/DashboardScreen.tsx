import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  Pressable,
  FlatList,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { FeatureFlags } from "@/lib/featureFlags";
import { runAiCommand, EXAMPLE_PROMPTS, AiCommandResult } from "@/lib/aiCommandRouter";
import { useLanguage } from "@/context/LanguageContext";
import { trackEvent } from "@/lib/analytics";

/*
 * ─── Design Tokens (Home Screen) ───
 * Adjust these to tweak the visual polish.
 * "dt" = design token
 */
function useDesignTokens() {
  const { theme, isDark } = useTheme();
  return useMemo(() => ({
    gradientTop: isDark ? "#162034" : "#F0F4F9",
    gradientBottom: isDark ? "#0B1120" : "#E8ECF2",
    surfacePrimary: theme.cardBackground,
    surfaceSecondary: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
    borderPrimary: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
    borderSecondary: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    borderAccent: isDark ? `${theme.primary}35` : `${theme.primary}25`,
    textPrimary: theme.text,
    textSecondary: theme.textSecondary,
    textMuted: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)",
    accent: theme.primary,
    accentMuted: isDark ? "rgba(100,160,255,0.55)" : "rgba(0,100,200,0.5)",
    accentSoft: isDark ? "rgba(100,160,255,0.12)" : "rgba(0,122,255,0.08)",
    chipBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
    chipBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    shadowPrimary: isDark
      ? { boxShadow: "0px 4px 12px rgba(0,0,0,0.25)" }
      : { boxShadow: "0px 2px 8px rgba(0,0,0,0.06)" },
  }), [theme, isDark]);
}

function RotatingPrompts({ onTap }: { onTap: (prompt: string) => void }) {
  const dt = useDesignTokens();
  const [currentIndex, setCurrentIndex] = useState(() => Math.floor(Math.random() * EXAMPLE_PROMPTS.length));
  const [displayText, setDisplayText] = useState(EXAMPLE_PROMPTS[currentIndex]);
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const lastIndex = useRef(currentIndex);

  const rotateToNext = useCallback(() => {
    let next: number;
    do {
      next = Math.floor(Math.random() * EXAMPLE_PROMPTS.length);
    } while (next === lastIndex.current && EXAMPLE_PROMPTS.length > 1);
    lastIndex.current = next;
    setDisplayText(EXAMPLE_PROMPTS[next]);
    setCurrentIndex(next);
    translateY.value = 8;
    opacity.value = withTiming(1, { duration: 300, easing: Easing.in(Easing.ease) });
    translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      opacity.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) }, (finished) => {
        if (finished) {
          runOnJS(rotateToNext)();
        }
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [rotateToNext]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Pressable onPress={() => onTap(displayText)} testID="rotating-prompt">
      <Animated.View style={[styles.promptContainer, animStyle]}>
        <Feather name="zap" size={13} color={dt.accent} style={{ marginRight: 6 }} />
        <ThemedText type="small" style={{ color: dt.accentMuted, flex: 1, fontSize: 13 }} numberOfLines={1}>
          {displayText}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

function useQuickActions() {
  const { t } = useLanguage();
  return [
    { label: t.dashboard.newQuote, icon: "file-plus" as const, action: "create_quote" },
    { label: t.dashboard.followUpQuotes, icon: "refresh-cw" as const, action: "follow_up" },
    { label: t.dashboard.thisMonthBooked, icon: "bar-chart-2" as const, action: "metrics" },
    { label: t.dashboard.draftReply, icon: "edit-3" as const, action: "draft" },
    { label: t.dashboard.unpaidInvoices, icon: "alert-circle" as const, action: "invoices" },
    { label: t.jobs.scheduleJob, icon: "calendar" as const, action: "schedule" },
  ];
}

function QuickActionChips({ onAction }: { onAction: (action: string) => void }) {
  const dt = useDesignTokens();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const quickActions = useQuickActions();
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={quickActions}
      keyExtractor={(item) => item.action}
      contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.sm }}
      renderItem={({ item }) => {
        const disabled = item.action === "invoices";
        return (
          <Pressable
            onPress={() => {
              if (disabled) return;
              onAction(item.action);
            }}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: pressed && !disabled ? dt.accentSoft : dt.chipBg,
                borderColor: dt.chipBorder,
                opacity: disabled ? 0.5 : 1,
              },
            ]}
            testID={`chip-${item.action}`}
          >
            <Feather name={item.icon} size={13} color={disabled ? dt.textMuted : theme.textSecondary} />
            <ThemedText
              type="caption"
              style={{
                color: disabled ? dt.textMuted : dt.textPrimary,
                marginLeft: 6,
                fontWeight: "500",
              }}
            >
              {disabled ? t.common.comingSoon : item.label}
            </ThemedText>
          </Pressable>
        );
      }}
    />
  );
}

function ResponseCard({ result, onDismiss, onAction }: {
  result: AiCommandResult;
  onDismiss: () => void;
  onAction: (action: string) => void;
}) {
  const dt = useDesignTokens();
  const { theme } = useTheme();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 250 });
    translateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.responseCard, { backgroundColor: dt.surfacePrimary, borderColor: dt.borderSecondary }, animStyle]}>
      <View style={styles.responseHeader}>
        <View style={[styles.responseIconBg, { backgroundColor: dt.accentSoft }]}>
          <Feather name="cpu" size={16} color={dt.accent} />
        </View>
        <ThemedText type="small" style={{ fontWeight: "600", flex: 1 }}>QuotePro</ThemedText>
        <Pressable onPress={onDismiss} hitSlop={12}>
          <Feather name="x" size={16} color={dt.textMuted} />
        </Pressable>
      </View>
      <ThemedText type="body" style={{ marginTop: Spacing.sm }}>
        {result.responseText}
      </ThemedText>
      {result.metricValue ? (
        <ThemedText type="h1" style={{ color: dt.accent, marginTop: Spacing.sm }}>
          {result.metricValue}
        </ThemedText>
      ) : null}
      {result.suggestedActions && result.suggestedActions.length > 0 ? (
        <View style={styles.suggestedRow}>
          {result.suggestedActions.map((a, i) => (
            <Pressable
              key={i}
              style={[styles.suggestedChip, { backgroundColor: dt.accentSoft, borderColor: "transparent" }]}
              onPress={() => onAction(a)}
            >
              <ThemedText type="caption" style={{ color: dt.accent }}>{a}</ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

function GlanceCard({ title, value, icon, color, onPress }: {
  title: string; value: string; icon: keyof typeof Feather.glyphMap; color: string; onPress?: () => void;
}) {
  const dt = useDesignTokens();
  return (
    <Pressable
      style={[styles.glanceCard, { backgroundColor: dt.surfaceSecondary }]}
      onPress={onPress}
      testID={`glance-${title.toLowerCase().replace(/\s/g, "-")}`}
    >
      <View style={[styles.glanceIcon, { backgroundColor: `${color}12` }]}>
        <Feather name={icon} size={15} color={color} />
      </View>
      <ThemedText type="h3" style={{ marginTop: 6 }}>{value}</ThemedText>
      <ThemedText type="caption" style={{ color: dt.textSecondary, marginTop: 2 }}>{title}</ThemedText>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { theme } = useTheme();
  const dt = useDesignTokens();
  const { businessProfile: profile } = useApp();
  const { t } = useLanguage();
  const inputRef = useRef<TextInput>(null);

  const [commandText, setCommandText] = useState("");
  const [commandResult, setCommandResult] = useState<AiCommandResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    trackEvent("app_open");
    trackEvent("home_view");
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

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchQuotes(), refetchCustomers(), refetchJobs(), refetchFollowUpQueue(), refetchStreak(), refetchDormant(), refetchLost()]);
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.dashboard.goodMorning;
    if (hour < 17) return t.dashboard.goodAfternoon;
    return t.dashboard.goodEvening;
  };

  const todayJobCount = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    return (allJobs || []).filter((j: any) => {
      if (!j.startDatetime) return false;
      return j.startDatetime.slice(0, 10) === todayStr && j.status !== "cancelled";
    }).length;
  }, [allJobs]);

  const monthRevenue = stats?.totalRevenue || 0;

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

  const totalOpportunities = opportunitiesDormant.length + opportunitiesLost.length;
  const estimatedRecoverable = useMemo(() => {
    let total = 0;
    opportunitiesDormant.forEach((c: any) => {
      total += (c.avgTicket || 150) * 0.25;
    });
    opportunitiesLost.forEach((q: any) => {
      total += q.status === "expired" ? (q.total || 0) * 0.2 : (q.total || 0) * 0.1;
    });
    return Math.round(total);
  }, [opportunitiesDormant, opportunitiesLost]);

  const currentStreak = streakData?.currentStreak || 0;

  const appData = useMemo(() => ({
    stats,
    quotes,
    customers,
    jobs: allJobs,
  }), [stats, quotes, customers, allJobs]);

  const executeCommand = useCallback((text: string) => {
    if (!text.trim()) return;
    const result = runAiCommand(text, appData);
    setCommandResult(result);

    if (result.navigation) {
      setTimeout(() => {
        if (result.navigation!.screen) {
          navigation.navigate(result.navigation!.screen, result.navigation!.params || {});
        } else if (result.navigation!.tab) {
          navigation.navigate("Main", { screen: result.navigation!.tab });
        }
      }, 600);
    }
  }, [appData, navigation]);

  const handleSubmit = () => {
    executeCommand(commandText);
    setCommandText("");
  };

  const handlePromptTap = (prompt: string) => {
    setCommandText(prompt);
    executeCommand(prompt);
  };

  const handleChipAction = (action: string) => {
    switch (action) {
      case "create_quote":
        navigation.navigate("QuoteCalculator");
        break;
      case "follow_up":
        navigation.navigate("FollowUpQueue");
        break;
      case "metrics":
        executeCommand("How many cleans booked this month?");
        break;
      case "draft":
        navigation.navigate("Main", { screen: "CustomersTab" });
        break;
      case "schedule":
        navigation.navigate("Main", { screen: "JobsTab" });
        break;
    }
  };

  const handleSuggestedAction = (action: string) => {
    const lower = action.toLowerCase();
    if (lower.includes("quote") && lower.includes("create")) {
      navigation.navigate("QuoteCalculator");
    } else if (lower.includes("revenue") || lower.includes("report")) {
      navigation.navigate("Main", { screen: "RevenueTab" });
    } else if (lower.includes("follow")) {
      executeCommand("follow up quotes");
    } else if (lower.includes("draft") || lower.includes("message")) {
      navigation.navigate("AIAssistant");
    } else if (lower.includes("customer") || lower.includes("search")) {
      navigation.navigate("Main", { screen: "CustomersTab" });
    } else if (lower.includes("quote")) {
      navigation.navigate("Main", { screen: "QuotesTab" });
    } else {
      executeCommand(action);
    }
  };

  return (
    <LinearGradient
      colors={[dt.gradientTop, dt.gradientBottom]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.greetingRow}>
          <ThemedText type="caption" style={{ color: dt.textMuted, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: "500", fontSize: 11 }}>
            {getGreeting()}
          </ThemedText>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <ThemedText type="h4" numberOfLines={1} style={{ marginTop: 2, flex: 1 }}>
              {profile?.companyName || "QuotePro"}
            </ThemedText>
            {currentStreak > 0 ? (
              <View style={[styles.streakBadge, { backgroundColor: dt.accentSoft }]}>
                <Feather name="zap" size={12} color={theme.warning} />
                <ThemedText type="caption" style={{ color: theme.warning, fontWeight: "700", marginLeft: 3 }}>
                  {currentStreak.toString()}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>

        {followUpQueueCount > 0 ? (
          <Pressable
            onPress={() => navigation.navigate("FollowUpQueue")}
            style={[
              styles.focusCard,
              {
                backgroundColor: dt.surfacePrimary,
                borderColor: theme.warning + "40",
                ...(Platform.OS === "ios" ? dt.shadowPrimary : {}),
              },
            ]}
            testID="todays-focus-card"
          >
            <View style={styles.focusCardHeader}>
              <View style={[styles.focusIcon, { backgroundColor: theme.warning + "15" }]}>
                <Feather name="alert-circle" size={16} color={theme.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="subtitle" style={{ fontWeight: "700" }}>
                  {`$${amountAtRisk.toLocaleString()} ${t.dashboard.atRisk}`}
                </ThemedText>
                <ThemedText type="caption" style={{ color: dt.textSecondary, marginTop: 2 }}>
                  {followUpQueueCount === 1 ? `1 ${t.dashboard.quoteNeedsAttention}` : `${followUpQueueCount} ${t.dashboard.quotesNeedAttention}`}
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color={dt.textMuted} />
            </View>
            <ThemedText type="small" style={{ color: dt.textSecondary, marginTop: Spacing.sm, marginLeft: 44 }}>
              {`${t.dashboard.oldestQuote}: ${oldestQuoteDays} ${oldestQuoteDays === 1 ? t.common.day : t.common.days}`}
            </ThemedText>
            <View style={[styles.focusCta, { backgroundColor: theme.warning + "12" }]}>
              <Feather name="arrow-right" size={14} color={theme.warning} />
              <ThemedText type="small" style={{ color: theme.warning, fontWeight: "600", marginLeft: 6 }}>{t.dashboard.followUpNow}</ThemedText>
            </View>
          </Pressable>
        ) : (
          <View
            style={[
              styles.focusCard,
              {
                backgroundColor: dt.surfacePrimary,
                borderColor: theme.success + "30",
              },
            ]}
          >
            <View style={styles.focusCardHeader}>
              <View style={[styles.focusIcon, { backgroundColor: theme.success + "15" }]}>
                <Feather name="check-circle" size={16} color={theme.success} />
              </View>
              <ThemedText type="subtitle" style={{ fontWeight: "600", flex: 1 }}>{t.growth.allCaughtUp}</ThemedText>
            </View>
            <ThemedText type="small" style={{ color: dt.textSecondary, marginTop: Spacing.xs }}>
              {t.dashboard.noRevenueAtRisk}
            </ThemedText>
          </View>
        )}

        <View style={[styles.streakCard, { backgroundColor: dt.surfaceSecondary, borderColor: dt.borderSecondary }]}>
          <View style={styles.streakCardRow}>
            <Feather name="zap" size={16} color={currentStreak > 0 ? theme.warning : dt.textMuted} />
            <ThemedText type="body" style={{ fontWeight: "700", marginLeft: Spacing.sm }}>
              {currentStreak > 0 ? `${t.dashboard.followUpStreak}: ${currentStreak} ${currentStreak === 1 ? t.common.day : t.common.days}` : t.dashboard.followUpStreak}
            </ThemedText>
          </View>
          <ThemedText type="caption" style={{ color: dt.textSecondary, marginTop: 4, marginLeft: 28 }}>
            {currentStreak === 0 ? t.dashboard.startStreakToday : currentStreak >= 7 ? t.dashboard.revenueDisciplineUnlocked : currentStreak >= 3 ? t.dashboard.momentumBuilding : `${currentStreak} ${currentStreak === 1 ? t.common.day : t.common.days} ${t.dashboard.daysStrong}`}
          </ThemedText>
          {currentStreak === 0 ? (
            <Pressable onPress={() => navigation.navigate("FollowUpQueue")} style={styles.streakGoBtn} testID="streak-nudge-cta">
              <View style={styles.streakGoBtnInner}>
                <ThemedText type="body" style={styles.streakGoText}>{t.dashboard.go}</ThemedText>
                <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </View>
            </Pressable>
          ) : null}
        </View>

        <View style={[
          styles.commandCard,
          {
            backgroundColor: dt.surfacePrimary,
            borderColor: dt.borderAccent,
            ...(Platform.OS === "ios" ? dt.shadowPrimary : {}),
          },
        ]}>
          <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm, fontWeight: "600" }}>
            {t.dashboard.whatToDo}
          </ThemedText>
          <View style={[styles.inputRow, { backgroundColor: dt.surfaceSecondary, borderColor: dt.borderSecondary }]}>
            <TextInput
              ref={inputRef}
              style={[styles.commandInput, { color: dt.textPrimary }]}
              placeholder={t.dashboard.askPlaceholder}
              placeholderTextColor={dt.textMuted}
              value={commandText}
              onChangeText={setCommandText}
              onSubmitEditing={handleSubmit}
              returnKeyType="send"
              testID="command-input"
            />
            <Pressable
              onPress={handleSubmit}
              style={[styles.sendBtn, { backgroundColor: commandText.trim() ? dt.accent : dt.chipBg }]}
              testID="command-send"
            >
              <Feather name="send" size={15} color={commandText.trim() ? "#FFF" : dt.textMuted} />
            </Pressable>
          </View>
          <RotatingPrompts onTap={handlePromptTap} />
        </View>

        {commandResult ? (
          <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg }}>
            <ResponseCard
              result={commandResult}
              onDismiss={() => setCommandResult(null)}
              onAction={handleSuggestedAction}
            />
          </View>
        ) : null}

        {!FeatureFlags.aiEnabled ? (
          <View style={[styles.aiBanner, { backgroundColor: dt.surfaceSecondary, borderColor: dt.borderSecondary }]}>
            <View style={styles.aiBannerContent}>
              <View style={[styles.aiBannerIcon, { backgroundColor: dt.accentSoft }]}>
                <Feather name="zap" size={14} color={dt.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <ThemedText type="small" style={{ fontWeight: "600", fontSize: 13 }}>
                  {t.dashboard.unlockAI}
                </ThemedText>
                <ThemedText type="caption" style={{ color: dt.textMuted, marginTop: 1, fontSize: 11 }}>
                  {t.dashboard.aiSubtitle}
                </ThemedText>
              </View>
            </View>
            <Pressable
              style={[styles.upgradeCta, { borderColor: dt.accent }]}
              onPress={() => navigation.navigate("Paywall")}
              testID="upgrade-cta"
            >
              <ThemedText type="caption" style={{ color: dt.accent, fontWeight: "600", fontSize: 12 }}>
                {t.dashboard.seeAIFeatures}
              </ThemedText>
              <Feather name="arrow-right" size={12} color={dt.accent} style={{ marginLeft: 4 }} />
            </Pressable>
          </View>
        ) : null}

        <View style={{ marginBottom: Spacing.lg }}>
          <QuickActionChips onAction={handleChipAction} />
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle" style={{ fontWeight: "600", fontSize: 15 }}>{t.dashboard.todayAtGlance}</ThemedText>
          <Pressable onPress={() => navigation.navigate("Main", { screen: "QuotesTab" })} testID="recent-quotes-link">
            <ThemedText type="caption" style={{ color: dt.accentMuted, fontSize: 12 }}>{t.dashboard.recentQuotes}</ThemedText>
          </Pressable>
        </View>

        <View style={styles.glanceRow}>
          <GlanceCard
            title={t.dashboard.needFollowUp}
            value={followUpQueueCount.toString()}
            icon="phone-missed"
            color={theme.warning}
            onPress={() => navigation.navigate("FollowUpQueue")}
          />
          <GlanceCard
            title={t.dashboard.jobsToday}
            value={todayJobCount.toString()}
            icon="calendar"
            color={theme.primary}
            onPress={() => navigation.navigate("Main", { screen: "JobsTab" })}
          />
          <GlanceCard
            title={t.dashboard.thisMonth}
            value={`$${monthRevenue.toLocaleString()}`}
            icon="trending-up"
            color={theme.success}
            onPress={() => navigation.navigate("Main", { screen: "RevenueTab" })}
          />
        </View>

        {totalOpportunities > 0 ? (
          <Pressable
            onPress={() => navigation.navigate("Opportunities")}
            style={[styles.opportunityCard, { backgroundColor: dt.surfacePrimary, borderColor: theme.success + "30" }]}
            testID="opportunities-card"
          >
            <View style={styles.focusCardHeader}>
              <View style={[styles.focusIcon, { backgroundColor: theme.success + "15" }]}>
                <Feather name="repeat" size={16} color={theme.success} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" style={{ fontWeight: "600" }}>
                  {`${t.dashboard.reactivationOpportunities}: ${totalOpportunities}`}
                </ThemedText>
                <ThemedText type="caption" style={{ color: dt.textSecondary, marginTop: 2 }}>
                  {`${t.dashboard.estimatedRecoverable}: $${estimatedRecoverable.toLocaleString()}`}
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color={dt.textMuted} />
            </View>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => navigation.navigate("WeeklyRecap")}
          style={[styles.recapLink, { backgroundColor: dt.surfaceSecondary, borderColor: dt.borderSecondary }]}
          testID="weekly-recap-link"
        >
          <Feather name="bar-chart" size={14} color={dt.accent} />
          <ThemedText type="small" style={{ color: dt.accent, fontWeight: "600", marginLeft: Spacing.sm, flex: 1 }}>
            {t.dashboard.viewWeeklyRecap}
          </ThemedText>
          <Feather name="chevron-right" size={16} color={dt.textMuted} />
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  greetingRow: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  commandCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingLeft: Spacing.md,
    paddingRight: 4,
    height: 46,
  },
  commandInput: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  promptContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  responseCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
  },
  responseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  responseIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestedRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  suggestedChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  aiBanner: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  aiBannerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiBannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeCta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginTop: Spacing.sm,
    marginLeft: 40,
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
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  glanceIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  focusCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  focusCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  focusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  focusStats: {
    flexDirection: "row",
    marginTop: Spacing.md,
    alignItems: "center",
  },
  focusStat: {
    flex: 1,
    alignItems: "center",
  },
  focusDivider: {
    width: 1,
    height: 28,
  },
  focusCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  streakCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.md,
  },
  streakCardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  streakGoBtn: {
    position: "absolute",
    right: Spacing.xl,
    top: Spacing.sm,
  },
  streakGoBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0088FF",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    boxShadow: "0 0 12px rgba(0,136,255,0.6), 0 0 24px rgba(0,136,255,0.3)",
  },
  streakGoText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 1,
  },
  opportunityCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  recapLink: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xl,
  },
});
