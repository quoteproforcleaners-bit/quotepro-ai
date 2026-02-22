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
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Elevation, GlowEffects } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { FeatureFlags } from "@/lib/featureFlags";
import { runAiCommand, EXAMPLE_PROMPTS, AiCommandResult } from "@/lib/aiCommandRouter";
import { useLanguage } from "@/context/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import OnboardingBanner from "@/components/OnboardingBanner";
import { useProGate } from "@/components/ProGate";

type WidgetId = "followUp" | "streak" | "aiCommand" | "quickActions" | "glance" | "opportunities" | "recap";

const DEFAULT_WIDGET_ORDER: WidgetId[] = ["followUp", "streak", "aiCommand", "quickActions", "glance", "opportunities", "recap"];

const WIDGET_LABELS: Record<WidgetId, { en: string; icon: keyof typeof Feather.glyphMap }> = {
  followUp: { en: "Follow-Up Focus", icon: "alert-circle" },
  streak: { en: "Follow-Up Streak", icon: "zap" },
  aiCommand: { en: "AI Command Center", icon: "cpu" },
  quickActions: { en: "Quick Actions", icon: "grid" },
  glance: { en: "Today at a Glance", icon: "eye" },
  opportunities: { en: "Opportunities", icon: "repeat" },

  recap: { en: "Weekly Recap", icon: "bar-chart" },
};

/*
 * ─── Design Tokens (Home Screen) ───
 * Adjust these to tweak the visual polish.
 * "dt" = design token
 */
const DAILY_QUOTES = [
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Every expert was once a beginner.", author: "Helen Hayes" },
  { text: "Your most unhappy customers are your greatest source of learning.", author: "Bill Gates" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Quality means doing it right when no one is looking.", author: "Henry Ford" },
  { text: "Go the extra mile. It's never crowded there.", author: "Wayne Dyer" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Hustle beats talent when talent doesn't hustle.", author: "Ross Simmonds" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Small business is the backbone of our economy.", author: "Tina Fey" },
  { text: "People don't buy what you do; they buy why you do it.", author: "Simon Sinek" },
  { text: "A satisfied customer is the best business strategy of all.", author: "Michael LeBoeuf" },
  { text: "Customer service is not a department, it's everyone's job.", author: "Anonymous" },
  { text: "The goal is not to be busy, it's to be productive.", author: "Tim Ferriss" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Work hard in silence. Let success make the noise.", author: "Frank Ocean" },
  { text: "Your reputation is built one clean at a time.", author: "QuotePro" },
  { text: "Consistency is what transforms average into excellence.", author: "Anonymous" },
  { text: "Make every detail perfect, and limit the number of details.", author: "Jack Dorsey" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "Revenue is vanity, profit is sanity, but cash is king.", author: "Anonymous" },
  { text: "If you're not taking care of your customer, your competitor will.", author: "Bob Hooey" },
  { text: "Do what you do so well that they want to see it again and bring their friends.", author: "Walt Disney" },
  { text: "There are no traffic jams along the extra mile.", author: "Roger Staubach" },
  { text: "The harder you work, the luckier you get.", author: "Gary Player" },
  { text: "Dream big. Start small. Act now.", author: "Robin Sharma" },
  { text: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
  { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  { text: "The best marketing strategy ever: care.", author: "Gary Vaynerchuk" },
  { text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
  { text: "A clean home is a happy home, and you make that happen.", author: "QuotePro" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Winners are not people who never fail but people who never quit.", author: "Edwin Louis Cole" },
  { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Price is what you pay. Value is what you get.", author: "Warren Buffett" },
  { text: "Business opportunities are like buses, there's always another one coming.", author: "Richard Branson" },
  { text: "Be so good they can't ignore you.", author: "Steve Martin" },
  { text: "It's not about ideas. It's about making ideas happen.", author: "Scott Belsky" },
  { text: "You don't build a business. You build people, and people build the business.", author: "Zig Ziglar" },
  { text: "The customer's perception is your reality.", author: "Kate Zabriskie" },
  { text: "Profit in business comes from repeat customers.", author: "W. Edwards Deming" },
  { text: "Take care of your employees and they'll take care of your business.", author: "Richard Branson" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Chase the vision, not the money; the money will end up following you.", author: "Tony Hsieh" },
  { text: "Don't find customers for your products, find products for your customers.", author: "Seth Godin" },
  { text: "Every day is a new opportunity to grow your business.", author: "QuotePro" },
  { text: "Your limitation is only your imagination.", author: "Anonymous" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Anonymous" },
  { text: "Great things never come from comfort zones.", author: "Anonymous" },
  { text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "Stop selling. Start helping.", author: "Zig Ziglar" },
  { text: "Make your product easier to buy than your competition, or you will lose.", author: "Mark Cuban" },
  { text: "The biggest risk is not taking any risk.", author: "Mark Zuckerberg" },
  { text: "Every accomplishment starts with the decision to try.", author: "John F. Kennedy" },
  { text: "Success doesn't come from what you do occasionally, it comes from what you do consistently.", author: "Marie Forleo" },
];

function getDailyQuote() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

function useDesignTokens() {
  const { theme, isDark } = useTheme();
  return useMemo(() => ({
    gradientTop: isDark ? "#080F1A" : theme.bg0,
    gradientBottom: isDark ? "#121E31" : theme.bg1,
    surfacePrimary: theme.surface0,
    surfaceSecondary: theme.surface1,
    surfaceRaised: (theme as any).surface2 || theme.surface1,
    surfaceHero: (theme as any).surface3 || theme.surface1,
    surfaceEmphasis: (theme as any).surface2 || theme.surface1,
    borderPrimary: theme.border,
    borderSecondary: theme.divider,
    borderAccent: isDark ? `${theme.primary}35` : `${theme.primary}25`,
    textPrimary: theme.text,
    textSecondary: theme.textSecondary,
    textMuted: theme.textMuted,
    accent: theme.primary,
    accentMuted: isDark ? "rgba(47, 123, 255, 0.55)" : "rgba(0,100,200,0.5)",
    accentSoft: theme.primarySoft,
    brandGlow: (theme as any).brandGlow || "rgba(47,123,255,0.25)",
    brandSoft: (theme as any).brandSoft || theme.primarySoft,
    warningSoft: (theme as any).warningSoft || "rgba(248,184,74,0.16)",
    warningBorder: (theme as any).warningBorder || "rgba(248,184,74,0.45)",
    warningGlow: (theme as any).warningGlow || "rgba(248,184,74,0.28)",
    warningGradientTop: isDark ? "#1E273A" : "#FFFBEB",
    warningGradientBottom: isDark ? "#121B2B" : "#FEF3C7",
    chipBg: isDark ? theme.divider : "rgba(0,0,0,0.03)",
    chipBorder: theme.border,
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
  const { isDark } = useTheme();
  return (
    <Pressable
      style={[styles.glanceCard, { backgroundColor: isDark ? dt.surfaceSecondary : dt.surfaceSecondary, borderColor: dt.borderSecondary }, Elevation.e1]}
      onPress={onPress}
      testID={`glance-${title.toLowerCase().replace(/\s/g, "-")}`}
    >
      <View style={[styles.glanceIcon, { backgroundColor: `${color}20` }]}>
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
  const { theme, isDark } = useTheme();
  const dt = useDesignTokens();
  const { businessProfile: profile } = useApp();
  const { t } = useLanguage();
  const inputRef = useRef<TextInput>(null);
  const { isPro, requirePro } = useProGate();

  const [commandText, setCommandText] = useState("");
  const [commandResult, setCommandResult] = useState<AiCommandResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(DEFAULT_WIDGET_ORDER);
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<WidgetId>>(new Set());
  const [isEditingWidgets, setIsEditingWidgets] = useState(false);

  useEffect(() => {
    trackEvent("app_open");
    trackEvent("home_view");
    (async () => {
      try {
        const savedOrder = await AsyncStorage.getItem("dashboardWidgetOrder");
        const savedHidden = await AsyncStorage.getItem("dashboardHiddenWidgets");
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
    if (!requirePro()) return;
    executeCommand(commandText);
    setCommandText("");
  };

  const handlePromptTap = (prompt: string) => {
    if (!requirePro()) return;
    setCommandText(prompt);
    executeCommand(prompt);
  };

  const handleChipAction = (action: string) => {
    switch (action) {
      case "create_quote":
        navigation.navigate("QuoteCalculator");
        break;
      case "follow_up":
        if (requirePro()) navigation.navigate("FollowUpQueue");
        break;
      case "metrics":
        if (requirePro()) executeCommand("How many cleans booked this month?");
        break;
      case "draft":
        if (requirePro()) navigation.navigate("Main", { screen: "CustomersTab" });
        break;
      case "schedule":
        if (requirePro()) navigation.navigate("Main", { screen: "JobsTab" });
        break;
    }
  };

  const handleSuggestedAction = (action: string) => {
    const lower = action.toLowerCase();
    if (lower.includes("quote") && lower.includes("create")) {
      navigation.navigate("QuoteCalculator");
    } else if (lower.includes("revenue") || lower.includes("report")) {
      navigation.navigate("WeeklyRecap");
    } else if (lower.includes("metric")) {
      if (requirePro()) executeCommand("How many cleans booked this month?");
    } else if (lower.includes("follow")) {
      if (requirePro()) executeCommand("follow up quotes");
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

  const saveWidgetConfig = useCallback(async (order: WidgetId[], hidden: Set<WidgetId>) => {
    try {
      await AsyncStorage.setItem("dashboardWidgetOrder", JSON.stringify(order));
      await AsyncStorage.setItem("dashboardHiddenWidgets", JSON.stringify([...hidden]));
    } catch {}
  }, []);

  const moveWidget = useCallback((widgetId: WidgetId, direction: "up" | "down") => {
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

  const renderWidget = useCallback((widgetId: WidgetId) => {
    switch (widgetId) {
      case "followUp":
        return (
          <View key="followUp">
            {followUpQueueCount > 0 ? (
              <Pressable
                onPress={() => navigation.navigate("FollowUpQueue")}
                style={[styles.focusCard, { borderColor: dt.warningBorder }, Elevation.e3, isDark ? GlowEffects.glowWarning : {}]}
                testID="todays-focus-card"
              >
                <LinearGradient
                  colors={[dt.warningGradientTop, dt.warningGradientBottom]}
                  style={styles.focusCardGradient}
                >
                  {isDark ? <View style={styles.heroCardHighlight} /> : null}
                  <View style={styles.focusCardHeader}>
                    <View style={[styles.focusIcon, { backgroundColor: dt.warningGlow }]}>
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
                  <View style={[styles.focusCta, { borderWidth: 1, borderColor: isDark ? "rgba(248,184,74,0.5)" : dt.warningBorder, backgroundColor: isDark ? "transparent" : "rgba(248,184,74,0.10)" }]}>
                    <Feather name="arrow-right" size={14} color={theme.warning} />
                    <ThemedText type="small" style={{ color: theme.warning, fontWeight: "600", marginLeft: 6 }}>{t.dashboard.followUpNow}</ThemedText>
                  </View>
                </LinearGradient>
              </Pressable>
            ) : (
              <View
                style={[
                  styles.focusCard,
                  {
                    backgroundColor: dt.surfacePrimary,
                    borderColor: theme.successBorder,
                    padding: Spacing.lg,
                  },
                  Elevation.e1,
                ]}
              >
                <View style={styles.focusCardHeader}>
                  <View style={[styles.focusIcon, { backgroundColor: theme.successSoft }]}>
                    <Feather name="check-circle" size={16} color={theme.success} />
                  </View>
                  <ThemedText type="subtitle" style={{ fontWeight: "600", flex: 1 }}>{t.growth.allCaughtUp}</ThemedText>
                </View>
                <ThemedText type="small" style={{ color: dt.textSecondary, marginTop: Spacing.xs }}>
                  {t.dashboard.noRevenueAtRisk}
                </ThemedText>
              </View>
            )}
          </View>
        );

      case "streak":
        return (
          <View key="streak" style={[styles.streakCard, { backgroundColor: isDark ? dt.surfaceRaised : dt.surfaceSecondary, borderColor: dt.borderSecondary }, Elevation.e2]}>
            <View style={styles.streakCardRow}>
              <View style={currentStreak > 0 && isDark ? [styles.zapGlow] : undefined}>
                <Feather name="zap" size={16} color={currentStreak > 0 ? theme.warning : dt.textMuted} />
              </View>
              <ThemedText type="body" style={{ fontWeight: "700", marginLeft: Spacing.sm }}>
                {currentStreak > 0 ? `${t.dashboard.followUpStreak}: ${currentStreak} ${currentStreak === 1 ? t.common.day : t.common.days}` : t.dashboard.followUpStreak}
              </ThemedText>
            </View>
            <ThemedText type="caption" style={{ color: dt.textSecondary, marginTop: 4, marginLeft: 28 }}>
              {currentStreak === 0 ? t.dashboard.startStreakToday : currentStreak >= 7 ? t.dashboard.revenueDisciplineUnlocked : currentStreak >= 3 ? t.dashboard.momentumBuilding : `${currentStreak} ${currentStreak === 1 ? t.common.day : t.common.days} ${t.dashboard.daysStrong}`}
            </ThemedText>
            {currentStreak === 0 ? (
              <Pressable onPress={() => navigation.navigate("FollowUpQueue")} style={styles.streakGoBtn} testID="streak-nudge-cta">
                <View style={[styles.streakGoBtnInner, Elevation.e3]}>
                  <ThemedText type="body" style={styles.streakGoText}>{t.dashboard.go}</ThemedText>
                  <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 4 }} />
                </View>
              </Pressable>
            ) : null}
          </View>
        );

      case "aiCommand":
        return (
          <View key="aiCommand">
            <View style={[
              styles.commandCard,
              {
                backgroundColor: isDark ? dt.surfaceRaised : dt.surfaceEmphasis,
                borderColor: dt.borderAccent,
              },
              Elevation.e2,
              isDark ? GlowEffects.glowBlueSubtle : {},
            ]}>
              <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm, fontWeight: "600" }}>
                {t.dashboard.whatToDo}
              </ThemedText>
              <View style={[styles.inputRow, { backgroundColor: isDark ? dt.surfaceRaised : dt.surfaceSecondary, borderColor: dt.borderSecondary }]}>
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
                  style={[
                    styles.sendBtn,
                    { backgroundColor: commandText.trim() ? dt.accent : dt.chipBg },
                    commandText.trim() ? Platform.select({
                      web: { boxShadow: `0px 2px 8px ${dt.brandGlow}` } as any,
                      default: { shadowColor: dt.accent, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
                    }) : {},
                  ]}
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
              <View style={[styles.aiBanner, { backgroundColor: isDark ? dt.surfaceRaised : dt.surfaceSecondary, borderColor: dt.borderAccent }, Elevation.e2]}>
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
                  style={[styles.upgradeCta, { borderColor: dt.accent, backgroundColor: dt.accentSoft }]}
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
          </View>
        );

      case "quickActions":
        return (
          <View key="quickActions" style={{ marginBottom: Spacing.lg }}>
            <QuickActionChips onAction={handleChipAction} />
          </View>
        );

      case "glance":
        return (
          <View key="glance">
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
          </View>
        );

      case "opportunities":
        return totalOpportunities > 0 ? (
          <Pressable
            key="opportunities"
            onPress={() => navigation.navigate("Opportunities")}
            style={[styles.opportunityCard, { backgroundColor: dt.surfacePrimary, borderColor: theme.successBorder }, Elevation.e1]}
            testID="opportunities-card"
          >
            <View style={styles.focusCardHeader}>
              <View style={[styles.focusIcon, { backgroundColor: theme.successSoft }]}>
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
        ) : null;

      case "recap":
        return (
          <Pressable
            key="recap"
            onPress={() => navigation.navigate("WeeklyRecap")}
            style={[styles.recapLink, { backgroundColor: dt.surfaceSecondary, borderColor: dt.borderSecondary }, Elevation.e1]}
            testID="weekly-recap-link"
          >
            <Feather name="bar-chart" size={14} color={dt.accent} />
            <ThemedText type="small" style={{ color: dt.accent, fontWeight: "600", marginLeft: Spacing.sm, flex: 1 }}>
              {t.dashboard.viewWeeklyRecap}
            </ThemedText>
            <Feather name="chevron-right" size={16} color={dt.textMuted} />
          </Pressable>
        );

      default:
        return null;
    }
  }, [followUpQueueCount, amountAtRisk, oldestQuoteDays, currentStreak, commandText, commandResult, dt, theme, isDark, t, navigation, handleSubmit, handlePromptTap, handleChipAction, handleSuggestedAction, todayJobCount, monthRevenue, totalOpportunities, estimatedRecoverable]);

  return (
    <LinearGradient
      colors={[dt.gradientTop, dt.gradientBottom]}
      style={styles.container}
    >
      {isDark ? (
        <>
          <View style={styles.vignetteTop} />
          <View style={styles.vignetteBottom} />
        </>
      ) : null}
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
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <ProfileAvatar
              config={profile?.avatarConfig || null}
              size={44}
              fallbackInitials={profile?.companyName}
              style={{ marginRight: Spacing.sm }}
            />
            <View style={{ flex: 1 }}>
              <ThemedText type="caption" style={{ color: dt.textMuted, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: "500", fontSize: 11 }}>
                {getGreeting()}
              </ThemedText>
              <ThemedText type="h4" numberOfLines={1} style={{ marginTop: 2 }}>
                {profile?.companyName || "QuotePro"}
              </ThemedText>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end" }}>
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

        <OnboardingBanner />

        <View style={styles.customizeRow}>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => setIsEditingWidgets(!isEditingWidgets)}
            style={[styles.customizeBtn, { backgroundColor: isEditingWidgets ? dt.accentSoft : dt.chipBg, borderColor: isEditingWidgets ? dt.accent : dt.chipBorder }]}
            testID="customize-widgets-btn"
          >
            <Feather name={isEditingWidgets ? "check" : "sliders"} size={13} color={isEditingWidgets ? dt.accent : dt.textSecondary} />
            <ThemedText type="caption" style={{ color: isEditingWidgets ? dt.accent : dt.textSecondary, fontWeight: "600", marginLeft: 5 }}>
              {isEditingWidgets ? t.common.done : t.dashboard.customizeWidgets}
            </ThemedText>
          </Pressable>
        </View>

        {isEditingWidgets ? (
          <View style={[styles.editorCard, { backgroundColor: dt.surfacePrimary, borderColor: dt.borderPrimary }, Elevation.e2]}>
            <View style={styles.editorHeader}>
              <Feather name="layout" size={16} color={dt.accent} />
              <ThemedText type="subtitle" style={{ fontWeight: "700", marginLeft: Spacing.sm, flex: 1 }}>
                {t.dashboard.editWidgets}
              </ThemedText>
              <Pressable onPress={() => setIsEditingWidgets(false)} hitSlop={12} testID="editor-done-btn">
                <ThemedText type="small" style={{ color: dt.accent, fontWeight: "600" }}>{t.common.done}</ThemedText>
              </Pressable>
            </View>
            {widgetOrder.map((widgetId, index) => {
              const isHidden = hiddenWidgets.has(widgetId);
              const label = WIDGET_LABELS[widgetId];
              return (
                <View key={widgetId} style={[styles.editorRow, { borderTopColor: dt.borderSecondary }]}>
                  <Pressable
                    onPress={() => toggleWidgetVisibility(widgetId)}
                    style={[styles.editorVisibilityBtn, { backgroundColor: isHidden ? "transparent" : dt.accentSoft }]}
                    testID={`toggle-${widgetId}`}
                  >
                    <Feather name={isHidden ? "eye-off" : "eye"} size={14} color={isHidden ? dt.textMuted : dt.accent} />
                  </Pressable>
                  <Feather name={label.icon} size={14} color={isHidden ? dt.textMuted : dt.textSecondary} style={{ marginLeft: Spacing.sm }} />
                  <ThemedText
                    type="small"
                    style={{ flex: 1, marginLeft: Spacing.sm, color: isHidden ? dt.textMuted : dt.textPrimary, fontWeight: "500" }}
                    numberOfLines={1}
                  >
                    {label.en}
                  </ThemedText>
                  <View style={styles.editorArrows}>
                    <Pressable
                      onPress={() => moveWidget(widgetId, "up")}
                      style={[styles.editorArrowBtn, { opacity: index === 0 ? 0.3 : 1 }]}
                      disabled={index === 0}
                      testID={`move-up-${widgetId}`}
                    >
                      <Feather name="chevron-up" size={16} color={dt.textSecondary} />
                    </Pressable>
                    <Pressable
                      onPress={() => moveWidget(widgetId, "down")}
                      style={[styles.editorArrowBtn, { opacity: index === widgetOrder.length - 1 ? 0.3 : 1 }]}
                      disabled={index === widgetOrder.length - 1}
                      testID={`move-down-${widgetId}`}
                    >
                      <Feather name="chevron-down" size={16} color={dt.textSecondary} />
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
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  quoteCard: {
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
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
    borderRadius: 22,
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
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  focusCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  focusCardGradient: {
    padding: Spacing.lg,
    borderRadius: 21,
    overflow: "hidden",
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
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  streakCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 22,
    borderWidth: 1,
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
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  recapLink: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xl,
  },
  ratingsSummaryCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: 18,
    padding: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.xl,
  },
  ratingsSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  ratingsSummaryBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ratingsSummaryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  ratingsSummaryStars: {
    flexDirection: "row",
    alignItems: "center",
  },
  customizeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  customizeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  editorCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  editorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
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
  vignetteTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: "rgba(0,0,0,0.22)",
    zIndex: 0,
  },
  vignetteBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "rgba(0,0,0,0.10)",
    zIndex: 0,
  },
  heroCardHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderTopLeftRadius: 21,
    borderTopRightRadius: 21,
  },
  zapGlow: {
    ...Platform.select({
      web: { filter: "drop-shadow(0px 0px 6px rgba(248,184,74,0.5))" } as any,
      default: {
        shadowColor: "#F8B84A",
        shadowOpacity: 0.5,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
      },
    }),
  },
});
