import React, { useState, useCallback, useMemo } from "react";
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

const QUICK_ACTIONS = [
  {
    id: "new-quote",
    label: "New Quote",
    sub: "Build with AI",
    icon: "zap" as const,
    color: "#2563EB",
    screen: "QuoteCalculator",
    testID: "quick-action-new-quote",
  },
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
    id: "add-customer",
    label: "Customers",
    sub: "Add and manage",
    icon: "users" as const,
    color: "#16A34A",
    screen: "Main",
    screenParams: { screen: "CustomersTab" },
    testID: "quick-action-add-customer",
  },
  {
    id: "schedule-job",
    label: "View Jobs",
    sub: "Manage schedule",
    icon: "calendar" as const,
    color: "#D97706",
    screen: "Main",
    screenParams: { screen: "JobsTab" },
    testID: "quick-action-jobs",
  },
];

function QuickActionCard({
  action,
  intakeBadge,
  onPress,
}: {
  action: (typeof QUICK_ACTIONS)[number];
  intakeBadge?: number;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      testID={action.testID}
      style={({ pressed }) => [
        s.quickCard,
        { backgroundColor: theme.cardBackground, borderColor: theme.border, opacity: pressed ? 0.88 : 1 },
        Elevation.e1,
      ]}
    >
      <View style={[s.quickIconWrap, { backgroundColor: action.color + "14" }]}>
        <Feather name={action.icon} size={20} color={action.color} />
        {intakeBadge != null && intakeBadge > 0 ? (
          <View style={s.quickBadge}>
            <ThemedText style={s.quickBadgeText}>{intakeBadge > 9 ? "9+" : intakeBadge}</ThemedText>
          </View>
        ) : null}
      </View>
      <ThemedText style={[s.quickLabel, { color: theme.text }]}>{action.label}</ThemedText>
      <ThemedText style={[s.quickSub, { color: theme.textSecondary }]} numberOfLines={1}>{action.sub}</ThemedText>
    </Pressable>
  );
}

function PipelineStat({ label, value, icon, color, onPress, theme }: {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  onPress?: () => void;
  theme: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.pipelineStat, { backgroundColor: theme.cardBackground, borderColor: theme.border }, Elevation.e1]}
      testID={`pipeline-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <View style={[s.pipelineIconWrap, { backgroundColor: color + "12" }]}>
        <Feather name={icon} size={13} color={color} />
      </View>
      <ThemedText style={[s.pipelineValue, { color: theme.text }]}>{value}</ThemedText>
      <ThemedText style={[s.pipelineLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
    </Pressable>
  );
}

function ActivityRow({ icon, iconColor, title, subtitle, time, theme }: {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  title: string;
  subtitle?: string;
  time: string;
  theme: any;
}) {
  return (
    <View style={[s.activityRow, { borderBottomColor: theme.border }]}>
      <View style={[s.activityIconWrap, { backgroundColor: iconColor + "12" }]}>
        <Feather name={icon} size={13} color={iconColor} />
      </View>
      <View style={s.activityText}>
        <ThemedText style={[s.activityTitle, { color: theme.text }]} numberOfLines={1}>{title}</ThemedText>
        {subtitle ? (
          <ThemedText style={[s.activitySub, { color: theme.textSecondary }]} numberOfLines={1}>{subtitle}</ThemedText>
        ) : null}
      </View>
      <ThemedText style={[s.activityTime, { color: theme.textMuted }]}>{time}</ThemedText>
    </View>
  );
}

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
    totalQuotes: number;
    sentQuotes: number;
    acceptedQuotes: number;
    totalRevenue: number;
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

  const { data: intakeCount } = useQuery<{ count: number; newCount: number; reviewCount: number }>({
    queryKey: ["/api/intake-requests/count"],
    staleTime: 60000,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchFollowUp(), refetchStats(), refetchQuotes(), refetchCustomers(), refetchJobs()]);
    setRefreshing(false);
  }, [refetchFollowUp, refetchStats, refetchQuotes, refetchCustomers, refetchJobs]);

  // Revenue Alert
  const amountAtRisk = useMemo(() =>
    followUpQueue.reduce((sum: number, q: any) => sum + (q.total || 0), 0),
    [followUpQueue]
  );
  const oldestDays = useMemo(() => {
    if (followUpQueue.length === 0) return 0;
    const now = Date.now();
    let oldest = 0;
    followUpQueue.forEach((q: any) => {
      const sent = q.sentAt ? new Date(q.sentAt).getTime() : new Date(q.createdAt).getTime();
      const d = Math.floor((now - sent) / 86400000);
      if (d > oldest) oldest = d;
    });
    return oldest;
  }, [followUpQueue]);

  // Pipeline stats
  const jobsThisWeek = useMemo(() => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return (allJobs || []).filter((j: any) => {
      const d = new Date(j.scheduledDate || j.createdAt);
      return d >= weekStart;
    }).length;
  }, [allJobs]);

  const sentThisWeek = useMemo(() => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    return (quotes || []).filter((q: any) => {
      const d = new Date(q.sentAt || q.createdAt);
      return d >= weekStart && (q.status === "sent" || q.sentAt);
    }).length;
  }, [quotes]);

  // Recent activity feed (quotes + jobs + customers, sorted by date)
  const recentActivity = useMemo(() => {
    const events: { id: string; type: "quote" | "job" | "customer"; icon: keyof typeof Feather.glyphMap; iconColor: string; title: string; subtitle?: string; date: Date }[] = [];

    (quotes || []).slice(0, 15).forEach((q: any) => {
      const date = new Date(q.sentAt || q.updatedAt || q.createdAt);
      if (q.status === "accepted") {
        events.push({ id: `q-won-${q.id}`, type: "quote", icon: "check-circle", iconColor: "#16A34A", title: "Quote accepted", subtitle: q.customerName || q.customer?.name, date });
      } else if (q.status === "sent" || q.sentAt) {
        events.push({ id: `q-sent-${q.id}`, type: "quote", icon: "send", iconColor: "#2563EB", title: "Quote sent", subtitle: q.customerName || q.customer?.name, date });
      } else if (q.status === "draft") {
        events.push({ id: `q-draft-${q.id}`, type: "quote", icon: "file-text", iconColor: "#94A3B8", title: "Quote created", subtitle: q.customerName || q.customer?.name, date });
      }
    });

    (allJobs || []).slice(0, 10).forEach((j: any) => {
      events.push({ id: `j-${j.id}`, type: "job", icon: "calendar", iconColor: "#D97706", title: j.status === "completed" ? "Job completed" : "Job scheduled", subtitle: j.customerName || j.title, date: new Date(j.updatedAt || j.createdAt) });
    });

    (customers || []).slice(0, 5).forEach((c: any) => {
      events.push({ id: `c-${c.id}`, type: "customer", icon: "user-plus", iconColor: "#16A34A", title: "Customer added", subtitle: c.name, date: new Date(c.createdAt) });
    });

    return events
      .filter(e => !isNaN(e.date.getTime()))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 6);
  }, [quotes, allJobs, customers]);

  const maxWidth = screenWidth > 600;

  function navigate(screen: string, params?: any) {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen, params);
  }

  const firstName = useMemo(() => {
    const name = profile?.companyName || "";
    return name.split(" ")[0] || "there";
  }, [profile]);

  return (
    <View style={[s.root, { backgroundColor: isDark ? "#000" : "#F6F8FB" }]}>
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingTop: headerHeight + Spacing.sm, paddingBottom: tabBarHeight + Spacing.xl },
          maxWidth ? { maxWidth: 560, alignSelf: "center" as const, width: "100%" } : undefined,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <ProfileAvatar
              config={profile?.avatarConfig || null}
              size={40}
              fallbackInitials={profile?.companyName}
              style={{ marginRight: Spacing.sm }}
            />
            <View>
              <ThemedText style={[s.greetingText, { color: theme.textSecondary }]}>{greeting()}</ThemedText>
              <ThemedText style={[s.businessName, { color: theme.text }]} numberOfLines={1}>{profile?.companyName || "Your Business"}</ThemedText>
            </View>
          </View>
          <Pressable
            onPress={() => navigation.navigate("Main", { screen: "SettingsTab" })}
            style={[s.headerIconBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", borderColor: theme.border }]}
            testID="settings-btn"
          >
            <Feather name="settings" size={15} color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* Onboarding / trial banner */}
        <View style={{ paddingHorizontal: Spacing.lg }}>
          <OnboardingBanner />
        </View>

        {/* Setup card */}
        {showSetupCard ? (
          <Pressable
            onPress={() => navigate("ProSetupChecklist")}
            style={[s.setupCard, { backgroundColor: theme.primary + "10", borderColor: theme.primary + "30" }]}
            testID="button-pro-setup"
          >
            <View style={[s.setupIcon, { backgroundColor: theme.primary + "20" }]}>
              <Feather name="clipboard" size={18} color={theme.primary} />
            </View>
            <View style={s.setupText}>
              <ThemedText style={[s.setupTitle, { color: theme.text }]}>Complete Your Setup</ThemedText>
              <ThemedText style={[s.setupSub, { color: theme.textSecondary }]}>
                {subscriptionStatus === "trial" && trialDaysLeft != null
                  ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? "s" : ""} left in trial — get started now`
                  : "Finish setup to start quoting like a pro"}
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={theme.primary} />
          </Pressable>
        ) : null}

        {/* Section: Quick Actions */}
        <View style={s.section}>
          <ThemedText style={[s.sectionTitle, { color: theme.text }]}>Quick Actions</ThemedText>
          <View style={s.quickGrid}>
            {QUICK_ACTIONS.map(action => (
              <QuickActionCard
                key={action.id}
                action={action}
                intakeBadge={action.id === "smart-intake" ? intakeCount?.count : undefined}
                onPress={() => navigate(action.screen, (action as any).screenParams)}
              />
            ))}
          </View>
        </View>

        {/* Section: Revenue Alert */}
        {followUpQueue.length > 0 ? (
          <View style={s.section}>
            <View style={[s.alertCard, { backgroundColor: theme.cardBackground, borderColor: "#D97706" + "40", borderLeftColor: "#D97706" }, Elevation.e1]}>
              <View style={s.alertHeader}>
                <View style={[s.alertIconWrap, { backgroundColor: "#D9770610" }]}>
                  <Feather name="alert-triangle" size={14} color="#D97706" />
                </View>
                <View style={s.alertText}>
                  <ThemedText style={[s.alertTitle, { color: theme.text }]}>Revenue at Risk</ThemedText>
                  <ThemedText style={[s.alertSub, { color: theme.textSecondary }]}>
                    {followUpQueue.length} {followUpQueue.length === 1 ? "quote" : "quotes"} waiting
                    {oldestDays > 0 ? ` · oldest ${oldestDays}d ago` : ""}
                    {amountAtRisk > 0 ? ` · $${amountAtRisk.toLocaleString()} at risk` : ""}
                  </ThemedText>
                </View>
              </View>
              <View style={s.alertActions}>
                <Pressable
                  onPress={() => navigate("FollowUpQueue")}
                  style={[s.alertBtnPrimary, { backgroundColor: "#D97706" }]}
                  testID="hero-follow-up-cta"
                >
                  <Feather name="zap" size={13} color="#fff" />
                  <ThemedText style={s.alertBtnPrimaryText}>Follow Up Now</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => navigate("Main", { screen: "QuotesTab" })}
                  style={[s.alertBtnSecondary, { borderColor: "#D97706" + "40" }]}
                  testID="hero-view-quotes"
                >
                  <ThemedText style={[s.alertBtnSecondaryText, { color: "#D97706" }]}>View All</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {/* Section: Pipeline Snapshot */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <ThemedText style={[s.sectionTitle, { color: theme.text }]}>Pipeline</ThemedText>
            <Pressable onPress={() => navigate("Main", { screen: "GrowthTab" })} testID="pipeline-view-reports">
              <ThemedText style={[s.sectionLink, { color: theme.primary }]}>Reports</ThemedText>
            </Pressable>
          </View>
          <View style={s.pipelineGrid}>
            <PipelineStat
              label="Awaiting Reply"
              value={String(followUpQueue.length)}
              icon="clock"
              color={followUpQueue.length > 0 ? "#D97706" : "#94A3B8"}
              onPress={() => navigate("FollowUpQueue")}
              theme={theme}
            />
            <PipelineStat
              label="Sent This Week"
              value={String(sentThisWeek)}
              icon="send"
              color="#2563EB"
              onPress={() => navigate("Main", { screen: "QuotesTab" })}
              theme={theme}
            />
            <PipelineStat
              label="Jobs This Week"
              value={String(jobsThisWeek)}
              icon="calendar"
              color="#D97706"
              onPress={() => navigate("Main", { screen: "JobsTab" })}
              theme={theme}
            />
            <PipelineStat
              label="Close Rate"
              value={stats?.closeRate != null ? `${Math.round(stats.closeRate)}%` : "—"}
              icon="percent"
              color="#16A34A"
              onPress={() => navigate("Main", { screen: "GrowthTab" })}
              theme={theme}
            />
          </View>
        </View>

        {/* Section: Recent Activity */}
        {recentActivity.length > 0 ? (
          <View style={s.section}>
            <ThemedText style={[s.sectionTitle, { color: theme.text }]}>Recent Activity</ThemedText>
            <View style={[s.activityCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }, Elevation.e1]}>
              {recentActivity.map((event, i) => (
                <ActivityRow
                  key={event.id}
                  icon={event.icon}
                  iconColor={event.iconColor}
                  title={event.title}
                  subtitle={event.subtitle}
                  time={timeAgo(event.date.toISOString())}
                  theme={theme}
                />
              ))}
            </View>
          </View>
        ) : recentActivity.length === 0 && (quotes.length > 0 || allJobs.length > 0) ? null : (
          <View style={s.section}>
            <View style={[s.emptyActivity, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <View style={[s.emptyActivityIcon, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }]}>
                <Feather name="activity" size={22} color={theme.textMuted} />
              </View>
              <ThemedText style={[s.emptyActivityTitle, { color: theme.text }]}>No activity yet</ThemedText>
              <ThemedText style={[s.emptyActivitySub, { color: theme.textSecondary }]}>
                Create your first quote or add a customer to get started.
              </ThemedText>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 0 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 },
  greetingText: { fontSize: 12, fontWeight: "400" },
  businessName: { fontSize: 17, fontWeight: "700", marginTop: 1 },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },

  setupCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  setupIcon: {
    width: 36, height: 36, borderRadius: BorderRadius.md,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  setupText: { flex: 1, minWidth: 0 },
  setupTitle: { fontSize: 14, fontWeight: "600" },
  setupSub: { fontSize: 12, marginTop: 1 },

  section: { marginBottom: Spacing.lg, paddingHorizontal: Spacing.lg },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 0.1, marginBottom: Spacing.sm },
  sectionLink: { fontSize: 13, fontWeight: "600" },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  quickCard: {
    width: "47.5%",
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  quickIconWrap: {
    width: 40, height: 40, borderRadius: BorderRadius.lg,
    alignItems: "center", justifyContent: "center",
    marginBottom: Spacing.sm,
    position: "relative",
  },
  quickBadge: {
    position: "absolute",
    top: -5, right: -5,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3,
  },
  quickBadgeText: { fontSize: 9, color: "#fff", fontWeight: "800" },
  quickLabel: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  quickSub: { fontSize: 12 },

  alertCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: Spacing.md,
  },
  alertHeader: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm, marginBottom: Spacing.md },
  alertIconWrap: {
    width: 32, height: 32, borderRadius: BorderRadius.sm,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  alertText: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: "700" },
  alertSub: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  alertActions: { flexDirection: "row", gap: Spacing.sm },
  alertBtnPrimary: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 9, borderRadius: BorderRadius.lg,
  },
  alertBtnPrimaryText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  alertBtnSecondary: {
    paddingVertical: 9, paddingHorizontal: 16, borderRadius: BorderRadius.lg, borderWidth: 1,
  },
  alertBtnSecondaryText: { fontSize: 13, fontWeight: "600" },

  pipelineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  pipelineStat: {
    width: "47.5%",
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pipelineIconWrap: {
    width: 26, height: 26, borderRadius: BorderRadius.sm,
    alignItems: "center", justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  pipelineValue: { fontSize: 22, fontWeight: "700" },
  pipelineLabel: { fontSize: 12, marginTop: 2 },

  activityCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 11,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  activityIconWrap: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  activityText: { flex: 1, minWidth: 0 },
  activityTitle: { fontSize: 13, fontWeight: "500" },
  activitySub: { fontSize: 11, marginTop: 1 },
  activityTime: { fontSize: 11, flexShrink: 0 },

  emptyActivity: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  emptyActivityIcon: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
    marginBottom: Spacing.md,
  },
  emptyActivityTitle: { fontSize: 15, fontWeight: "600", marginBottom: 6 },
  emptyActivitySub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
});
