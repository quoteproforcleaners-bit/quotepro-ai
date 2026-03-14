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

type Nav = NativeStackNavigationProp<any>;

function formatMoney(n: number) {
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

interface ReportCardProps {
  title: string;
  value: string;
  sub?: string;
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  trend?: { value: string; positive: boolean };
  onPress?: () => void;
  theme: any;
}

function ReportCard({ title, value, sub, icon, iconColor, trend, onPress, theme }: ReportCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.reportCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }, Elevation.e1]}
    >
      <View style={s.reportCardHeader}>
        <View style={[s.reportCardIcon, { backgroundColor: iconColor + "14" }]}>
          <Feather name={icon} size={14} color={iconColor} />
        </View>
        {trend ? (
          <View style={[s.trendBadge, { backgroundColor: trend.positive ? "#16A34A14" : "#EF444414" }]}>
            <Feather name={trend.positive ? "trending-up" : "trending-down"} size={10} color={trend.positive ? "#16A34A" : "#EF4444"} />
            <ThemedText style={[s.trendText, { color: trend.positive ? "#16A34A" : "#EF4444" }]}>{trend.value}</ThemedText>
          </View>
        ) : null}
      </View>
      <ThemedText style={[s.reportCardValue, { color: theme.text }]}>{value}</ThemedText>
      <ThemedText style={[s.reportCardTitle, { color: theme.textSecondary }]}>{title}</ThemedText>
      {sub ? <ThemedText style={[s.reportCardSub, { color: theme.textMuted }]}>{sub}</ThemedText> : null}
    </Pressable>
  );
}

function SectionHeader({ title, action, onAction, theme }: {
  title: string; action?: string; onAction?: () => void; theme: any;
}) {
  return (
    <View style={s.sectionHeaderRow}>
      <ThemedText style={[s.sectionTitle, { color: theme.text }]}>{title}</ThemedText>
      {action ? (
        <Pressable onPress={onAction}>
          <ThemedText style={[s.sectionAction, { color: theme.primary }]}>{action}</ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

function OpportunityChip({ icon, label, count, color, onPress, theme }: {
  icon: keyof typeof Feather.glyphMap; label: string; count: number; color: string; onPress: () => void; theme: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.oppChip, { backgroundColor: theme.cardBackground, borderColor: theme.border }, Elevation.e1]}
    >
      <View style={[s.oppChipIcon, { backgroundColor: color + "14" }]}>
        <Feather name={icon} size={15} color={color} />
      </View>
      <ThemedText style={[s.oppChipCount, { color: theme.text }]}>{count}</ThemedText>
      <ThemedText style={[s.oppChipLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
    </Pressable>
  );
}

function ActivityItem({ icon, iconColor, title, subtitle, time, theme }: {
  icon: keyof typeof Feather.glyphMap; iconColor: string; title: string; subtitle?: string; time: string; theme: any;
}) {
  return (
    <View style={[s.activityItem, { borderBottomColor: theme.border }]}>
      <View style={[s.activityItemIcon, { backgroundColor: iconColor + "12" }]}>
        <Feather name={icon} size={12} color={iconColor} />
      </View>
      <View style={s.activityItemText}>
        <ThemedText style={[s.activityItemTitle, { color: theme.text }]} numberOfLines={1}>{title}</ThemedText>
        {subtitle ? <ThemedText style={[s.activityItemSub, { color: theme.textSecondary }]} numberOfLines={1}>{subtitle}</ThemedText> : null}
      </View>
      <ThemedText style={[s.activityItemTime, { color: theme.textMuted }]}>{time}</ThemedText>
    </View>
  );
}

const TASK_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  review_request: "star",
  upsell: "trending-up",
  rebook: "repeat",
  reactivation: "user-plus",
  follow_up: "phone",
  default: "check-circle",
};

export default function GrowthDashboardScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<Nav>();
  const { theme, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const maxWidth = screenWidth > 600;

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

  const totalRevenue = stats?.totalRevenue || 0;
  const sentQuotes = stats?.sentQuotes || 0;
  const acceptedQuotes = stats?.acceptedQuotes || 0;
  const closeRate = Math.round(stats?.closeRate || 0);
  const avgValue = Math.round(stats?.avgQuoteValue || 0);
  const openQuoteValue = forecast?.openQuoteValue || 0;
  const forecastedRevenue = forecast?.forecastedRevenue || 0;

  const amountAtRisk = useMemo(() =>
    followUpQueue.reduce((sum: number, q: any) => sum + (q.total || 0), 0),
    [followUpQueue]
  );

  const recentActivity = useMemo(() => {
    const tasks = [...(growthTasks || [])]
      .filter((t: any) => t.completedAt || t.createdAt)
      .sort((a: any, b: any) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
      .slice(0, 5);
    return tasks;
  }, [growthTasks]);

  const TASK_ICON_COLORS: Record<string, string> = {
    review_request: "#F59E0B",
    upsell: "#10B981",
    rebook: "#3B82F6",
    reactivation: "#EF4444",
    follow_up: "#8B5CF6",
    default: "#94A3B8",
  };

  function nav(screen: string, params?: any) {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(screen, params);
  }

  return (
    <ProGate featureName="Reports">
      <View style={[s.root, { backgroundColor: isDark ? "#000" : "#F6F8FB" }]}>
        <ScrollView
          contentContainerStyle={[
            s.content,
            { paddingTop: headerHeight + Spacing.md, paddingBottom: tabBarHeight + Spacing.xl },
            maxWidth ? { maxWidth: 560, alignSelf: "center" as const, width: "100%" } : undefined,
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Quote Performance */}
          <View style={s.section}>
            <SectionHeader title="Quote Performance" theme={theme} />
            <View style={s.grid2x2}>
              <ReportCard
                title="Quotes Sent"
                value={String(sentQuotes)}
                icon="send"
                iconColor="#2563EB"
                sub="all time"
                theme={theme}
              />
              <ReportCard
                title="Close Rate"
                value={closeRate > 0 ? `${closeRate}%` : "—"}
                icon="percent"
                iconColor="#16A34A"
                sub="accepted / sent"
                theme={theme}
              />
              <ReportCard
                title="Avg Quote Value"
                value={avgValue > 0 ? formatMoney(avgValue) : "—"}
                icon="dollar-sign"
                iconColor="#8B5CF6"
                sub="per quote"
                theme={theme}
              />
              <ReportCard
                title="Accepted"
                value={String(acceptedQuotes)}
                icon="check-circle"
                iconColor="#16A34A"
                sub="quotes won"
                theme={theme}
              />
            </View>
          </View>

          {/* Revenue */}
          <View style={s.section}>
            <SectionHeader title="Revenue" theme={theme} />
            <View style={s.grid2x2}>
              <ReportCard
                title="Total Revenue"
                value={totalRevenue > 0 ? formatMoney(totalRevenue) : "—"}
                icon="trending-up"
                iconColor="#16A34A"
                sub="all time"
                theme={theme}
              />
              <ReportCard
                title="Open Pipeline"
                value={openQuoteValue > 0 ? formatMoney(openQuoteValue) : "—"}
                icon="bar-chart-2"
                iconColor="#2563EB"
                sub="quotes pending"
                theme={theme}
              />
              <ReportCard
                title="Forecasted"
                value={forecastedRevenue > 0 ? formatMoney(forecastedRevenue) : "—"}
                icon="activity"
                iconColor="#8B5CF6"
                sub="estimated closings"
                theme={theme}
              />
              <ReportCard
                title="Revenue at Risk"
                value={amountAtRisk > 0 ? formatMoney(amountAtRisk) : "$0"}
                icon="alert-triangle"
                iconColor={amountAtRisk > 0 ? "#D97706" : "#94A3B8"}
                sub={`${followUpQueue.length} quotes`}
                onPress={() => nav("FollowUpQueue")}
                theme={theme}
              />
            </View>
          </View>

          {/* Growth Opportunities */}
          <View style={s.section}>
            <SectionHeader
              title="Growth Opportunities"
              action="View Tasks"
              onAction={() => nav("TasksQueue")}
              theme={theme}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm, paddingBottom: 2 }}>
              <OpportunityChip
                icon="star" label="Reviews" count={reviewRequests.length}
                color="#F59E0B" onPress={() => nav("ReviewsReferrals")} theme={theme}
              />
              <OpportunityChip
                icon="trending-up" label="Upsells" count={upsellOpps.length}
                color="#10B981" onPress={() => nav("UpsellOpportunities")} theme={theme}
              />
              <OpportunityChip
                icon="repeat" label="Rebook" count={rebookCandidates.length}
                color="#2563EB" onPress={() => nav("TasksQueue")} theme={theme}
              />
              <OpportunityChip
                icon="user-plus" label="Reactivation" count={dormantOpps.length}
                color="#EF4444" onPress={() => nav("ReactivationCampaigns")} theme={theme}
              />
              <OpportunityChip
                icon="clock" label="Follow-ups" count={followUpQueue.length}
                color="#D97706" onPress={() => nav("FollowUpQueue")} theme={theme}
              />
            </ScrollView>
          </View>

          {/* Quick Reports Links */}
          <View style={s.section}>
            <SectionHeader title="Explore" theme={theme} />
            <View style={[s.exploreCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }, Elevation.e1]}>
              {[
                { label: "Follow-Up Queue", sub: `${followUpQueue.length} quotes waiting`, icon: "phone-missed" as const, color: "#D97706", screen: "FollowUpQueue" },
                { label: "Automations", sub: "Manage AI sequences", icon: "cpu" as const, color: "#8B5CF6", screen: "AutomationsHub" },
                { label: "Upsell Opportunities", sub: `${upsellOpps.length} clients to grow`, icon: "trending-up" as const, color: "#10B981", screen: "UpsellOpportunities" },
                { label: "Reactivation", sub: `${dormantOpps.length} dormant clients`, icon: "user-plus" as const, color: "#EF4444", screen: "ReactivationCampaigns" },
                { label: "Reviews & Referrals", sub: `${reviewRequests.length} pending`, icon: "star" as const, color: "#F59E0B", screen: "ReviewsReferrals" },
              ].map((item, i, arr) => (
                <Pressable
                  key={item.label}
                  onPress={() => nav(item.screen)}
                  style={[s.exploreRow, { borderBottomWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: theme.border }]}
                  testID={`explore-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                >
                  <View style={[s.exploreIcon, { backgroundColor: item.color + "14" }]}>
                    <Feather name={item.icon} size={14} color={item.color} />
                  </View>
                  <View style={s.exploreText}>
                    <ThemedText style={[s.exploreLabel, { color: theme.text }]}>{item.label}</ThemedText>
                    <ThemedText style={[s.exploreSub, { color: theme.textSecondary }]}>{item.sub}</ThemedText>
                  </View>
                  <Feather name="chevron-right" size={14} color={theme.textMuted} />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Recent Activity */}
          {recentActivity.length > 0 ? (
            <View style={s.section}>
              <SectionHeader title="Recent Activity" action="View All" onAction={() => nav("TasksQueue")} theme={theme} />
              <View style={[s.activityCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }, Elevation.e1]}>
                {recentActivity.map((item: any, i: number) => (
                  <ActivityItem
                    key={item.id || i}
                    icon={TASK_ICONS[item.taskType] || TASK_ICONS.default}
                    iconColor={TASK_ICON_COLORS[item.taskType] || TASK_ICON_COLORS.default}
                    title={item.title || item.taskType || "Activity"}
                    subtitle={item.customerName}
                    time={timeAgo(item.completedAt || item.createdAt)}
                    theme={theme}
                  />
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

  section: { marginBottom: Spacing.lg, paddingHorizontal: Spacing.lg },
  sectionHeaderRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: Spacing.sm,
  },
  sectionTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 0.1 },
  sectionAction: { fontSize: 13, fontWeight: "600" },

  grid2x2: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  reportCard: {
    width: "47.5%",
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reportCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.sm },
  reportCardIcon: {
    width: 30, height: 30, borderRadius: BorderRadius.sm,
    alignItems: "center", justifyContent: "center",
  },
  trendBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  trendText: { fontSize: 10, fontWeight: "700" },
  reportCardValue: { fontSize: 22, fontWeight: "700" },
  reportCardTitle: { fontSize: 12, marginTop: 2 },
  reportCardSub: { fontSize: 11, marginTop: 1 },

  oppChip: {
    width: 108,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  oppChipIcon: {
    width: 36, height: 36, borderRadius: BorderRadius.md,
    alignItems: "center", justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  oppChipCount: { fontSize: 20, fontWeight: "700" },
  oppChipLabel: { fontSize: 11, marginTop: 2, textAlign: "center" },

  exploreCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  exploreRow: {
    flexDirection: "row", alignItems: "center",
    gap: Spacing.sm, paddingVertical: 12, paddingHorizontal: Spacing.md,
  },
  exploreIcon: {
    width: 32, height: 32, borderRadius: BorderRadius.sm,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  exploreText: { flex: 1, minWidth: 0 },
  exploreLabel: { fontSize: 14, fontWeight: "500" },
  exploreSub: { fontSize: 12, marginTop: 1 },

  activityCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  activityItem: {
    flexDirection: "row", alignItems: "center",
    gap: Spacing.sm, paddingVertical: 11, paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  activityItemIcon: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  activityItemText: { flex: 1, minWidth: 0 },
  activityItemTitle: { fontSize: 13, fontWeight: "500" },
  activityItemSub: { fontSize: 11, marginTop: 1 },
  activityItemTime: { fontSize: 11, flexShrink: 0 },
});
