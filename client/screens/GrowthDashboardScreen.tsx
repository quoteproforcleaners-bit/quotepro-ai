import React, { useState, useMemo, useCallback } from "react";
import {
  View, StyleSheet, ScrollView, RefreshControl, Pressable, Platform, useWindowDimensions,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Elevation } from "@/constants/theme";
import { ProGate } from "@/components/ProGate";
import { ActionEmptyState } from "@/components/ActionEmptyState";

type Nav = NativeStackNavigationProp<any>;

function fmt(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}

function timeAgo(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Shared section label (same as dashboard) ──
function SectionLabel({ title, action, onAction, theme }: {
  title: string; action?: string; onAction?: () => void; theme: any;
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

// ── Stat metric card (icon-free, number-forward) ──
function MetricCard({ value, label, sub, accent, onPress, cardBg, divider, theme }: {
  value: string; label: string; sub?: string; accent?: boolean;
  onPress?: () => void; cardBg: string; divider: string; theme: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        mc.card,
        { backgroundColor: cardBg, borderColor: divider, opacity: pressed ? 0.85 : 1 },
        Elevation.e1,
      ]}
    >
      <ThemedText style={[mc.value, { color: accent ? theme.primary : theme.text }]}>{value}</ThemedText>
      <ThemedText style={[mc.label, { color: theme.textSecondary }]}>{label}</ThemedText>
      {sub ? <ThemedText style={[mc.sub, { color: theme.textMuted }]}>{sub}</ThemedText> : null}
    </Pressable>
  );
}
const mc = StyleSheet.create({
  card: { width: "47.5%", padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: StyleSheet.hairlineWidth },
  value: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  label: { fontSize: 12, marginTop: 4, fontWeight: "500" },
  sub: { fontSize: 11, marginTop: 2 },
});

const TASK_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  review_request: "star", upsell: "trending-up", rebook: "repeat",
  reactivation: "user-plus", follow_up: "phone", default: "check-circle",
};

export default function GrowthDashboardScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<Nav>();
  const { theme, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const maxWidth = screenWidth > 600;

  const cardBg = isDark ? "#1C1C1E" : "#FFFFFF";
  const divider = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const bg = isDark ? "#000" : "#F5F6F8";

  const { data: stats, refetch: r1 } = useQuery<{
    totalQuotes: number; sentQuotes: number; acceptedQuotes: number;
    declinedQuotes: number; totalRevenue: number; avgQuoteValue: number; closeRate: number;
  }>({ queryKey: ["/api/reports/stats"] });

  const { data: forecast, refetch: r2 } = useQuery<any>({ queryKey: ["/api/forecast"] });
  const { data: reviewRequests = [], refetch: r3 } = useQuery<any[]>({ queryKey: ["/api/review-requests"] });
  const { data: upsellOpps = [], refetch: r4 } = useQuery<any[]>({ queryKey: ["/api/upsell-opportunities"] });
  const { data: rebookCandidates = [], refetch: r5 } = useQuery<any[]>({ queryKey: ["/api/rebook-candidates"] });
  const { data: dormantOpps = [], refetch: r6 } = useQuery<any[]>({ queryKey: ["/api/opportunities/dormant"] });
  const { data: growthTasks = [], refetch: r7 } = useQuery<any[]>({ queryKey: ["/api/growth-tasks"] });
  const { data: followUpQueue = [], refetch: r8 } = useQuery<any[]>({ queryKey: ["/api/followup-queue"] });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([r1(), r2(), r3(), r4(), r5(), r6(), r7(), r8()]);
    setRefreshing(false);
  }, [r1, r2, r3, r4, r5, r6, r7, r8]);

  const sentQuotes = stats?.sentQuotes || 0;
  const acceptedQuotes = stats?.acceptedQuotes || 0;
  const closeRate = Math.round(stats?.closeRate || 0);
  const avgValue = Math.round(stats?.avgQuoteValue || 0);
  const totalRevenue = stats?.totalRevenue || 0;
  const openQuoteValue = forecast?.openQuoteValue || 0;
  const forecastedRevenue = forecast?.forecastedRevenue || 0;
  const amountAtRisk = useMemo(
    () => followUpQueue.reduce((s: number, q: any) => s + (q.total || 0), 0),
    [followUpQueue]
  );

  const recentActivity = useMemo(() =>
    [...(growthTasks || [])]
      .filter((t: any) => t.completedAt || t.createdAt)
      .sort((a: any, b: any) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
      .slice(0, 5),
    [growthTasks]
  );

  function nav(screen: string, params?: any) {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen, params);
  }

  // Explore items
  const exploreItems = [
    { label: "Follow-Up Queue", sub: `${followUpQueue.length} quote${followUpQueue.length !== 1 ? "s" : ""} waiting`, icon: "clock" as const, screen: "FollowUpQueue" },
    { label: "Automations", sub: "Manage AI sequences", icon: "cpu" as const, screen: "AutomationsHub" },
    { label: "Upsell Opportunities", sub: `${upsellOpps.length} client${upsellOpps.length !== 1 ? "s" : ""} to grow`, icon: "trending-up" as const, screen: "UpsellOpportunities" },
    { label: "Campaigns", sub: `${dormantOpps.length} dormant client${dormantOpps.length !== 1 ? "s" : ""}`, icon: "user-plus" as const, screen: "ReactivationCampaigns" },
    { label: "Reviews & Referrals", sub: `${reviewRequests.length} pending`, icon: "star" as const, screen: "ReviewsReferrals" },
  ];

  // Opportunity counts for pills
  const pills = [
    { label: "Follow-ups", count: followUpQueue.length, icon: "clock" as const, screen: "FollowUpQueue" },
    { label: "Upsells", count: upsellOpps.length, icon: "trending-up" as const, screen: "UpsellOpportunities" },
    { label: "Reviews", count: reviewRequests.length, icon: "star" as const, screen: "ReviewsReferrals" },
    { label: "Rebook", count: rebookCandidates.length, icon: "repeat" as const, screen: "TasksQueue" },
    { label: "Campaigns", count: dormantOpps.length, icon: "user-plus" as const, screen: "ReactivationCampaigns" },
  ];

  return (
    <ProGate featureName="Reports">
      <View style={[s.root, { backgroundColor: bg }]}>
        <ScrollView
          contentContainerStyle={[
            s.content,
            { paddingTop: headerHeight + Spacing.lg, paddingBottom: tabBarHeight + Spacing["2xl"] },
            maxWidth ? { maxWidth: 540, alignSelf: "center" as const, width: "100%" } : undefined,
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Quote Performance & Revenue (or Welcome Card) ── */}
          {stats?.totalQuotes === 0 ? (
            <View style={[s.section, { paddingTop: Spacing.sm }]}>
              <View style={[s.welcomeCard, { backgroundColor: cardBg, borderColor: theme.primary }]}>
                <View style={[s.welcomeIconWrap, { backgroundColor: `${theme.primary}12` }]}>
                  <Feather name="bar-chart-2" size={28} color={theme.primary} />
                </View>
                <ThemedText style={[s.welcomeTitle, { color: theme.text }]}>
                  Welcome to your Growth Dashboard
                </ThemedText>
                <ThemedText style={[s.welcomeBody, { color: theme.textSecondary }]}>
                  Your stats will appear here as you send quotes and win jobs. Start by creating your first quote.
                </ThemedText>
                <Pressable
                  onPress={() => nav("QuoteCalculator")}
                  style={({ pressed }) => [s.welcomeBtn, { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 }]}
                  testID="button-create-first-quote"
                >
                  <Feather name="plus" size={16} color="#FFFFFF" />
                  <ThemedText style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15, marginLeft: 6 }}>
                    Create First Quote
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              {/* ── Quote Performance ── */}
              <View style={s.section}>
                <SectionLabel title="Quote Performance" theme={theme} />
                <View style={s.grid}>
                  <MetricCard
                    value={String(sentQuotes)} label="Sent" sub="all time"
                    cardBg={cardBg} divider={divider} theme={theme}
                  />
                  <MetricCard
                    value={closeRate > 0 ? `${closeRate}%` : "—"} label="Close Rate" sub="accepted / sent"
                    accent cardBg={cardBg} divider={divider} theme={theme}
                  />
                  <MetricCard
                    value={avgValue > 0 ? fmt(avgValue) : "—"} label="Avg Value" sub="per quote"
                    cardBg={cardBg} divider={divider} theme={theme}
                  />
                  <MetricCard
                    value={String(acceptedQuotes)} label="Accepted" sub="quotes won"
                    cardBg={cardBg} divider={divider} theme={theme}
                  />
                </View>
              </View>

              {/* ── Revenue ── */}
              <View style={s.section}>
                <SectionLabel title="Revenue" theme={theme} />
                <View style={s.grid}>
                  <MetricCard
                    value={totalRevenue > 0 ? fmt(totalRevenue) : "—"} label="Total Revenue" sub="all time"
                    accent cardBg={cardBg} divider={divider} theme={theme}
                  />
                  <MetricCard
                    value={openQuoteValue > 0 ? fmt(openQuoteValue) : "—"} label="Open Pipeline" sub="pending quotes"
                    cardBg={cardBg} divider={divider} theme={theme}
                  />
                  <MetricCard
                    value={forecastedRevenue > 0 ? fmt(forecastedRevenue) : "—"} label="Forecasted" sub="est. closings"
                    cardBg={cardBg} divider={divider} theme={theme}
                  />
                  <MetricCard
                    value={amountAtRisk > 0 ? fmt(amountAtRisk) : "$0"} label="At Risk"
                    sub={`${followUpQueue.length} without reply`}
                    onPress={() => nav("FollowUpQueue")}
                    cardBg={cardBg} divider={divider} theme={theme}
                  />
                </View>
              </View>
            </>
          )}

          {/* ── Opportunities ── */}
          <View style={s.section}>
            <SectionLabel title="Opportunities" action="View Tasks" onAction={() => nav("TasksQueue")} theme={theme} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, paddingBottom: 2 }}>
              {pills.map(p => (
                <Pressable
                  key={p.label}
                  onPress={() => nav(p.screen)}
                  style={({ pressed }) => [
                    s.pill,
                    { backgroundColor: cardBg, borderColor: divider, opacity: pressed ? 0.85 : 1 },
                    Elevation.e1,
                  ]}
                >
                  <View style={[s.pillIconWrap, { backgroundColor: divider }]}>
                    <Feather name={p.icon} size={13} color={theme.textSecondary} />
                  </View>
                  <ThemedText style={[s.pillCount, { color: p.count > 0 ? theme.text : theme.textMuted }]}>{p.count}</ThemedText>
                  <ThemedText style={[s.pillLabel, { color: theme.textMuted }]}>{p.label}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* ── Explore ── */}
          <View style={s.section}>
            <SectionLabel title="Explore" theme={theme} />
            <View style={[s.listCard, { backgroundColor: cardBg, borderColor: divider }, Elevation.e1]}>
              {exploreItems.map((item, i) => (
                <Pressable
                  key={item.label}
                  onPress={() => nav(item.screen)}
                  style={({ pressed }) => [
                    s.listRow,
                    {
                      borderBottomWidth: i < exploreItems.length - 1 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: divider,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                  testID={`explore-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <View style={[s.listIconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}>
                    <Feather name={item.icon} size={13} color={theme.textSecondary} />
                  </View>
                  <View style={s.listTextWrap}>
                    <ThemedText style={[s.listLabel, { color: theme.text }]}>{item.label}</ThemedText>
                    <ThemedText style={[s.listSub, { color: theme.textMuted }]}>{item.sub}</ThemedText>
                  </View>
                  <Feather name="chevron-right" size={13} color={theme.textMuted} />
                </Pressable>
              ))}
            </View>
          </View>

          {/* ── Recent Activity ── */}
          {recentActivity.length > 0 ? (
            <View style={s.section}>
              <SectionLabel title="Recent Activity" action="View All" onAction={() => nav("TasksQueue")} theme={theme} />
              <View style={[s.listCard, { backgroundColor: cardBg, borderColor: divider }, Elevation.e1]}>
                {recentActivity.map((item: any, i: number) => (
                  <View
                    key={item.id || i}
                    style={[
                      s.listRow,
                      {
                        borderBottomWidth: i < recentActivity.length - 1 ? StyleSheet.hairlineWidth : 0,
                        borderBottomColor: divider,
                      },
                    ]}
                  >
                    <View style={[s.listIconWrap, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}>
                      <Feather name={TASK_ICONS[item.taskType] || TASK_ICONS.default} size={13} color={theme.textSecondary} />
                    </View>
                    <View style={s.listTextWrap}>
                      <ThemedText style={[s.listLabel, { color: theme.text }]} numberOfLines={1}>
                        {item.title || item.taskType || "Activity"}
                      </ThemedText>
                      {item.customerName ? (
                        <ThemedText style={[s.listSub, { color: theme.textMuted }]} numberOfLines={1}>{item.customerName}</ThemedText>
                      ) : null}
                    </View>
                    <ThemedText style={[s.activityTime, { color: theme.textMuted }]}>{timeAgo(item.completedAt || item.createdAt)}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

        </ScrollView>
      </View>
    </ProGate>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 0 },

  section: { marginBottom: Spacing["2xl"], paddingHorizontal: Spacing.lg },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },

  pill: {
    width: 96,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  pillIconWrap: {
    width: 30, height: 30, borderRadius: BorderRadius.xs,
    alignItems: "center", justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  pillCount: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
  pillLabel: { fontSize: 10, fontWeight: "500", marginTop: 2, textAlign: "center", letterSpacing: 0.1 },

  listCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 13,
    paddingHorizontal: Spacing.md,
  },
  listIconWrap: {
    width: 28, height: 28, borderRadius: BorderRadius.xs,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  listTextWrap: { flex: 1, minWidth: 0 },
  listLabel: { fontSize: 14, fontWeight: "500" },
  listSub: { fontSize: 12, marginTop: 1 },
  activityTime: { fontSize: 11, flexShrink: 0 },

  welcomeCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    padding: Spacing.xl,
    alignItems: "center",
  },
  welcomeIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  welcomeBody: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: Spacing.xl,
  },
  welcomeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
});
