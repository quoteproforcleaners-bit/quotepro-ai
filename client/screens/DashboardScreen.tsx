import React, { useState, useCallback, useMemo, useEffect } from "react";
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
import { ThemedText } from "@/components/ThemedText";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Elevation } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { trackEvent } from "@/lib/analytics";
import { ensureInstallDate, incrementSessionCount } from "@/lib/growthLoop";
import OnboardingBanner from "@/components/OnboardingBanner";
import { useProGate } from "@/components/ProGate";
import MilestoneCelebrationModal from "@/components/MilestoneCelebrationModal";
import { apiRequest } from "@/lib/query-client";

type Nav = NativeStackNavigationProp<any>;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function timeAgo(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const SECONDARY_ACTIONS = [
  {
    id: "smart-intake",
    label: "Smart Intake",
    sub: "Capture leads",
    icon: "inbox" as const,
    color: "#8B5CF6",
    screen: "IntakeQueue",
    testID: "quick-action-smart-intake",
  },
  {
    id: "quote-requests",
    label: "Quote Requests",
    sub: "Share your link",
    icon: "link" as const,
    color: "#0EA5E9",
    screen: "LeadCaptureSettings",
    testID: "quick-action-quote-requests",
  },
];

function SectionLabel({ title, action, onAction, theme, isDark }: {
  title: string;
  action?: string;
  onAction?: () => void;
  theme: any;
  isDark?: boolean;
}) {
  return (
    <View style={sl.row}>
      <ThemedText style={[sl.label, { color: theme.textMuted }]}>{title.toUpperCase()}</ThemedText>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <ThemedText style={[sl.action, { color: theme.primary }]}>{action}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const sl = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  label: { fontSize: 11, fontWeight: "600", letterSpacing: 0.7 },
  action: { fontSize: 12, fontWeight: "500" },
});

export default function DashboardScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const navigation = useNavigation<Nav>();
  const { theme, isDark } = useTheme();
  const { businessProfile: profile } = useApp();
  const { isPro } = useProGate();
  const { subscriptionStatus, trialDaysLeft } = useSubscription();

  const [refreshing, setRefreshing] = useState(false);
  const [setupSkipped, setSetupSkipped] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [setupLoaded, setSetupLoaded] = useState(false);
  const [milestoneModal, setMilestoneModal] = useState<{ milestone: number; totalRevenue: number } | null>(null);

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
      ensureInstallDate().catch(() => {});
      incrementSessionCount().catch(() => {});
      trackEvent("home_view");
    }, [])
  );

  const showSetupCard = setupLoaded && isPro && !setupCompleted && !setupSkipped;

  const { data: followUpQueue = [], refetch: refetchFollowUp } = useQuery<any[]>({
    queryKey: ["/api/followup-queue"],
  });
  const { data: stats, refetch: refetchStats } = useQuery<{
    totalQuotes: number; sentQuotes: number; acceptedQuotes: number;
    totalRevenue: number; closeRate: number;
  }>({ queryKey: ["/api/reports/stats"] });
  const { data: quotes = [], refetch: refetchQuotes } = useQuery<any[]>({ queryKey: ["/api/quotes"] });
  const { data: customers = [], refetch: refetchCustomers } = useQuery<any[]>({ queryKey: ["/api/customers"] });
  const { data: allJobs = [], refetch: refetchJobs } = useQuery<any[]>({ queryKey: ["/api/jobs"] });
  const { data: intakeCount } = useQuery<{ count: number; newCount: number; reviewCount: number }>({
    queryKey: ["/api/intake-requests/count"],
    staleTime: 60000,
  });

  const { data: milestoneData } = useQuery<{
    nextMilestone: number | null;
    totalRevenue: number;
    celebrated: number[];
  }>({
    queryKey: ["/api/milestones/check"],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!milestoneData) return;
    const { nextMilestone, totalRevenue } = milestoneData;
    if (!nextMilestone || milestoneModal) return;
    setMilestoneModal({ milestone: nextMilestone, totalRevenue });
  }, [milestoneData]);

  const handleMilestoneDismiss = useCallback(async () => {
    if (!milestoneModal) return;
    setMilestoneModal(null);
    try {
      await apiRequest("POST", "/api/milestones/celebrate", { milestone: milestoneModal.milestone });
    } catch {}
  }, [milestoneModal]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchFollowUp(), refetchStats(), refetchQuotes(), refetchCustomers(), refetchJobs()]);
    setRefreshing(false);
  }, [refetchFollowUp, refetchStats, refetchQuotes, refetchCustomers, refetchJobs]);

  const amountAtRisk = useMemo(() =>
    followUpQueue.reduce((sum: number, q: any) => sum + (q.total || 0), 0),
    [followUpQueue]
  );
  const oldestDays = useMemo(() => {
    if (!followUpQueue.length) return 0;
    const now = Date.now();
    let oldest = 0;
    followUpQueue.forEach((q: any) => {
      const sent = q.sentAt ? new Date(q.sentAt).getTime() : new Date(q.createdAt).getTime();
      const d = Math.floor((now - sent) / 86400000);
      if (d > oldest) oldest = d;
    });
    return oldest;
  }, [followUpQueue]);

  const jobsThisWeek = useMemo(() => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return (allJobs || []).filter((j: any) => new Date(j.scheduledDate || j.createdAt) >= weekStart).length;
  }, [allJobs]);

  const sentThisWeek = useMemo(() => {
    const cutoff = new Date(Date.now() - 7 * 86400000);
    return (quotes || []).filter((q: any) =>
      new Date(q.sentAt || q.createdAt) >= cutoff && (q.status === "sent" || q.sentAt)
    ).length;
  }, [quotes]);

  const recentActivity = useMemo(() => {
    const events: { id: string; icon: keyof typeof Feather.glyphMap; iconColor: string; title: string; subtitle?: string; date: Date }[] = [];

    (quotes || []).slice(0, 15).forEach((q: any) => {
      const date = new Date(q.sentAt || q.updatedAt || q.createdAt);
      const name = q.customerName || q.customer?.name;
      if (q.status === "accepted") {
        events.push({ id: `q-won-${q.id}`, icon: "check-circle", iconColor: "#16A34A", title: "Quote accepted", subtitle: name, date });
      } else if (q.status === "sent" || q.sentAt) {
        events.push({ id: `q-sent-${q.id}`, icon: "send", iconColor: "#2563EB", title: "Quote sent", subtitle: name, date });
      } else {
        events.push({ id: `q-draft-${q.id}`, icon: "file-text", iconColor: "#94A3B8", title: "Quote created", subtitle: name, date });
      }
    });
    (allJobs || []).slice(0, 10).forEach((j: any) => {
      events.push({ id: `j-${j.id}`, icon: "calendar", iconColor: "#D97706", title: j.status === "completed" ? "Job completed" : "Job scheduled", subtitle: j.customerName || j.title, date: new Date(j.updatedAt || j.createdAt) });
    });
    (customers || []).slice(0, 5).forEach((c: any) => {
      events.push({ id: `c-${c.id}`, icon: "user-plus", iconColor: "#16A34A", title: "Customer added", subtitle: c.name, date: new Date(c.createdAt) });
    });

    return events
      .filter(e => !isNaN(e.date.getTime()))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);
  }, [quotes, allJobs, customers]);

  const maxWidth = screenWidth > 600;
  const bg = isDark ? "#000" : "#F5F6F8";
  const cardBg = isDark ? "#1C1C1E" : "#FFFFFF";
  const divider = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  function nav(screen: string, params?: any) {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen, params);
  }

  return (
    <View style={[s.root, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: tabBarHeight + Spacing["2xl"] },
          maxWidth ? { maxWidth: 540, alignSelf: "center" as const, width: "100%" } : undefined,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <ProfileAvatar
              config={profile?.avatarConfig || null}
              size={38}
              fallbackInitials={profile?.companyName}
              style={{ marginRight: 11 }}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <ThemedText style={[s.greetLabel, { color: theme.textMuted }]}>{greeting()}</ThemedText>
              <ThemedText style={[s.greetName, { color: theme.text }]} numberOfLines={1}>
                {profile?.companyName || "Your Business"}
              </ThemedText>
            </View>
          </View>
          <Pressable
            onPress={() => nav("Main", { screen: "SettingsTab" })}
            style={[s.headerBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)" }]}
            testID="settings-btn"
          >
            <Feather name="settings" size={15} color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* Banners */}
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <OnboardingBanner />
        </View>

        {/* Setup card */}
        {showSetupCard ? (
          <Pressable
            onPress={() => nav("ProSetupChecklist")}
            style={[s.setupCard, { backgroundColor: theme.primary + "0D", borderColor: theme.primary + "25" }]}
            testID="button-pro-setup"
          >
            <View style={[s.setupIconWrap, { backgroundColor: theme.primary + "18" }]}>
              <Feather name="clipboard" size={16} color={theme.primary} />
            </View>
            <View style={s.setupTextWrap}>
              <ThemedText style={[s.setupTitle, { color: theme.text }]}>Complete Your Setup</ThemedText>
              <ThemedText style={[s.setupSub, { color: theme.textSecondary }]}>
                {subscriptionStatus === "trial" && trialDaysLeft != null
                  ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} left in trial`
                  : "Finish setup to quote like a pro"}
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={16} color={theme.primary + "80"} />
          </Pressable>
        ) : null}

        {/* ── Revenue Alert ── */}
        {followUpQueue.length > 0 ? (
          <View style={s.section}>
            <View style={[s.alertCard, {
              backgroundColor: isDark ? "rgba(217,119,6,0.10)" : "rgba(217,119,6,0.06)",
              borderColor: isDark ? "rgba(217,119,6,0.22)" : "rgba(217,119,6,0.18)",
            }]}>
              <View style={s.alertTop}>
                <Feather name="alert-triangle" size={13} color="#D97706" />
                <ThemedText style={[s.alertTitle, { color: isDark ? "#FBBF24" : "#B45309" }]}>Revenue at Risk</ThemedText>
              </View>
              <ThemedText style={[s.alertBody, { color: theme.textSecondary }]}>
                {followUpQueue.length} {followUpQueue.length === 1 ? "quote" : "quotes"} without a reply
                {oldestDays > 0 ? ` · oldest ${oldestDays}d ago` : ""}
                {amountAtRisk > 0 ? ` · $${amountAtRisk.toLocaleString()} at risk` : ""}
              </ThemedText>
              <View style={s.alertActions}>
                <Pressable
                  onPress={() => nav("FollowUpQueue")}
                  style={[s.alertPrimary, { backgroundColor: "#D97706" }]}
                  testID="hero-follow-up-cta"
                >
                  <ThemedText style={s.alertPrimaryTxt}>Follow Up Now</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => nav("Main", { screen: "QuotesTab" })}
                  style={s.alertSecondary}
                  testID="hero-view-quotes"
                >
                  <ThemedText style={[s.alertSecondaryTxt, { color: isDark ? "#FBBF24" : "#B45309" }]}>View All</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {/* ── Quick Actions ── */}
        <View style={s.section}>
          <SectionLabel title="Quick Actions" theme={theme} isDark={isDark} />

          {/* Primary: New Quote */}
          <Pressable
            onPress={() => nav("QuoteCalculator")}
            style={({ pressed }) => [
              s.primaryAction,
              { backgroundColor: isDark ? theme.primary + "20" : theme.primary + "0E", borderColor: theme.primary + "30", opacity: pressed ? 0.88 : 1 },
            ]}
            testID="quick-action-new-quote"
          >
            <View style={[s.primaryActionIcon, { backgroundColor: theme.primary }]}>
              <Feather name="zap" size={18} color="#fff" />
            </View>
            <View style={s.primaryActionText}>
              <ThemedText style={[s.primaryActionLabel, { color: theme.text }]}>New Quote</ThemedText>
              <ThemedText style={[s.primaryActionSub, { color: theme.textSecondary }]}>Build and send a quote with AI</ThemedText>
            </View>
            <Feather name="arrow-right" size={16} color={theme.primary + "80"} />
          </Pressable>

          {/* Secondary: 3 in a row */}
          <View style={s.secondaryRow}>
            {SECONDARY_ACTIONS.map(action => (
              <Pressable
                key={action.id}
                onPress={() => nav(action.screen, (action as any).screenParams)}
                testID={action.testID}
                style={({ pressed }) => [
                  s.secondaryCard,
                  { backgroundColor: cardBg, borderColor: divider, opacity: pressed ? 0.85 : 1 },
                  Elevation.e1,
                ]}
              >
                <View style={[s.secondaryIconWrap, { backgroundColor: action.color + "12" }]}>
                  <Feather name={action.icon} size={16} color={action.color} />
                  {action.id === "smart-intake" && intakeCount != null && intakeCount.count > 0 ? (
                    <View style={s.badge}>
                      <ThemedText style={s.badgeTxt}>{intakeCount.count > 9 ? "9+" : intakeCount.count}</ThemedText>
                    </View>
                  ) : null}
                </View>
                <ThemedText style={[s.secondaryLabel, { color: theme.text }]} numberOfLines={1}>{action.label}</ThemedText>
                <ThemedText style={[s.secondarySub, { color: theme.textMuted }]} numberOfLines={1}>{action.sub}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Pipeline ── */}
        <View style={s.section}>
          <SectionLabel
            title="Pipeline"
            action="Reports"
            onAction={() => nav("Main", { screen: "GrowthTab" })}
            theme={theme}
            isDark={isDark}
          />
          <View style={s.statsRow}>
            {[
              {
                value: String(followUpQueue.length),
                label: "Awaiting Reply",
                urgent: followUpQueue.length > 0,
                onPress: () => nav("FollowUpQueue"),
                testID: "pipeline-awaiting-reply",
              },
              {
                value: String(sentThisWeek),
                label: "Sent This Week",
                urgent: false,
                onPress: () => nav("Main", { screen: "QuotesTab" }),
                testID: "pipeline-sent-this-week",
              },
              {
                value: String(jobsThisWeek),
                label: "Jobs This Week",
                urgent: false,
                onPress: () => nav("Main", { screen: "JobsTab" }),
                testID: "pipeline-jobs-this-week",
              },
              {
                value: stats?.closeRate != null ? `${Math.round(stats.closeRate)}%` : "—",
                label: "Close Rate",
                urgent: false,
                onPress: () => nav("Main", { screen: "GrowthTab" }),
                testID: "pipeline-close-rate",
              },
            ].map((stat, i) => (
              <Pressable
                key={i}
                onPress={stat.onPress}
                testID={stat.testID}
                style={({ pressed }) => [
                  s.statCard,
                  { backgroundColor: cardBg, borderColor: divider, opacity: pressed ? 0.85 : 1 },
                  Elevation.e1,
                ]}
              >
                <ThemedText style={[s.statValue, { color: stat.urgent ? "#D97706" : theme.text }]}>
                  {stat.value}
                </ThemedText>
                <ThemedText style={[s.statLabel, { color: theme.textMuted }]}>{stat.label}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Recent Activity ── */}
        {recentActivity.length > 0 ? (
          <View style={s.section}>
            <SectionLabel title="Recent Activity" theme={theme} isDark={isDark} />
            <View style={[s.activityCard, { backgroundColor: cardBg, borderColor: divider }, Elevation.e1]}>
              {recentActivity.map((event, i) => (
                <View
                  key={event.id}
                  style={[
                    s.activityRow,
                    { borderBottomColor: divider, borderBottomWidth: i < recentActivity.length - 1 ? StyleSheet.hairlineWidth : 0 },
                  ]}
                >
                  <View style={[s.activityDot, { backgroundColor: event.iconColor + "18" }]}>
                    <Feather name={event.icon} size={11} color={event.iconColor} />
                  </View>
                  <View style={s.activityTextWrap}>
                    <ThemedText style={[s.activityTitle, { color: theme.text }]} numberOfLines={1}>{event.title}</ThemedText>
                    {event.subtitle ? (
                      <ThemedText style={[s.activitySub, { color: theme.textMuted }]} numberOfLines={1}>{event.subtitle}</ThemedText>
                    ) : null}
                  </View>
                  <ThemedText style={[s.activityTime, { color: theme.textMuted }]}>{timeAgo(event.date.toISOString())}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={s.section}>
            <View style={[s.emptyState, { backgroundColor: cardBg, borderColor: divider }]}>
              <Feather name="activity" size={20} color={theme.textMuted} style={{ marginBottom: 10 }} />
              <ThemedText style={[s.emptyTitle, { color: theme.text }]}>No activity yet</ThemedText>
              <ThemedText style={[s.emptySub, { color: theme.textSecondary }]}>
                Create a quote or add a customer to get started.
              </ThemedText>
            </View>
          </View>
        )}
      </ScrollView>

      <MilestoneCelebrationModal
        visible={milestoneModal !== null}
        milestone={milestoneModal?.milestone ?? 1000}
        totalRevenue={milestoneModal?.totalRevenue ?? 0}
        onDismiss={handleMilestoneDismiss}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 0 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 },
  greetLabel: { fontSize: 11, fontWeight: "400", letterSpacing: 0.2 },
  greetName: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  headerBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },

  // Setup card
  setupCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  setupIconWrap: {
    width: 34, height: 34, borderRadius: BorderRadius.sm,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  setupTextWrap: { flex: 1, minWidth: 0 },
  setupTitle: { fontSize: 13, fontWeight: "600" },
  setupSub: { fontSize: 12, marginTop: 1 },

  // Section wrapper
  section: { marginBottom: Spacing["2xl"], paddingHorizontal: Spacing.lg },

  // Revenue alert
  alertCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  alertTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 },
  alertTitle: { fontSize: 13, fontWeight: "600" },
  alertBody: { fontSize: 13, lineHeight: 19, marginBottom: Spacing.md },
  alertActions: { flexDirection: "row", gap: Spacing.sm },
  alertPrimary: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 10, borderRadius: BorderRadius.sm,
  },
  alertPrimaryTxt: { fontSize: 13, fontWeight: "600", color: "#fff" },
  alertSecondary: {
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderRadius: BorderRadius.sm,
  },
  alertSecondaryTxt: { fontSize: 13, fontWeight: "500" },

  // Primary action (New Quote)
  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  primaryActionIcon: {
    width: 40, height: 40, borderRadius: BorderRadius.sm,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  primaryActionText: { flex: 1, minWidth: 0 },
  primaryActionLabel: { fontSize: 15, fontWeight: "600", letterSpacing: -0.1 },
  primaryActionSub: { fontSize: 12, marginTop: 2 },

  // Secondary actions (3-up row)
  secondaryRow: { flexDirection: "row", gap: Spacing.sm },
  secondaryCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "flex-start",
  },
  secondaryIconWrap: {
    width: 34, height: 34, borderRadius: BorderRadius.xs,
    alignItems: "center", justifyContent: "center",
    marginBottom: Spacing.sm,
    position: "relative",
  },
  badge: {
    position: "absolute", top: -5, right: -5,
    minWidth: 15, height: 15, borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeTxt: { fontSize: 9, color: "#fff", fontWeight: "800", lineHeight: 11, includeFontPadding: false } as any,
  secondaryLabel: { fontSize: 12, fontWeight: "600", marginBottom: 1 },
  secondarySub: { fontSize: 11 },

  // Pipeline stats
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  statCard: {
    width: "47.5%",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "flex-start",
  },
  statValue: { fontSize: 26, fontWeight: "700", letterSpacing: -0.8 },
  statLabel: { fontSize: 11, fontWeight: "500", marginTop: 4, letterSpacing: 0.1 },

  // Activity
  activityCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  activityDot: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  activityTextWrap: { flex: 1, minWidth: 0 },
  activityTitle: { fontSize: 13, fontWeight: "500" },
  activitySub: { fontSize: 11, marginTop: 1 },
  activityTime: { fontSize: 11, flexShrink: 0 },

  // Empty state
  emptyState: {
    padding: Spacing["3xl"],
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  emptyTitle: { fontSize: 14, fontWeight: "600", marginBottom: 5 },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
});
