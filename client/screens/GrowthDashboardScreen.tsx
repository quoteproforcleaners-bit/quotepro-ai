import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, Platform } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useLanguage } from "@/context/LanguageContext";
import OnboardingBanner from "@/components/OnboardingBanner";

function useDesignTokens() {
  const { theme, isDark } = useTheme();
  return useMemo(() => ({
    gradientTop: isDark ? "#162034" : "#F0F4F9",
    gradientBottom: isDark ? "#0B1120" : "#E8ECF2",
    surfacePrimary: theme.cardBackground,
    surfaceSecondary: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
    borderSecondary: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    textPrimary: theme.text,
    textSecondary: theme.textSecondary,
    textMuted: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)",
    accent: theme.primary,
    accentSoft: isDark ? "rgba(100,160,255,0.12)" : "rgba(0,122,255,0.08)",
    chipBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
    chipBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    shadow: isDark
      ? { boxShadow: "0px 4px 12px rgba(0,0,0,0.25)" }
      : { boxShadow: "0px 2px 8px rgba(0,0,0,0.06)" },
  }), [theme, isDark]);
}

const TASK_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  review_request: "star", upsell: "trending-up", rebook: "repeat",
  reactivation: "user-plus", follow_up: "phone", default: "check-circle",
};

function getTimeAgo(dateStr: string, t: any): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return t.growth.justNow;
  if (mins < 60) return `${mins}${t.growth.minutesAgo}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}${t.growth.hoursAgo}`;
  return `${Math.floor(hrs / 24)}${t.growth.daysAgo}`;
}

function CircularProgress({ score, color, bgColor, label }: { score: number; color: string; bgColor: string; label: string }) {
  const pct = Math.min(Math.max(score, 0), 100) / 100;
  return (
    <View style={{ width: 120, height: 120, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 8, borderColor: bgColor, position: "absolute" }} />
      <View style={{
        width: 120, height: 120, borderRadius: 60, borderWidth: 8, position: "absolute",
        transform: [{ rotate: "-90deg" }],
        borderTopColor: pct >= 0.25 ? color : "transparent",
        borderRightColor: pct >= 0.5 ? color : "transparent",
        borderBottomColor: pct >= 0.75 ? color : "transparent",
        borderLeftColor: pct >= 1 ? color : "transparent",
      }} />
      <ThemedText type="h1" style={{ fontWeight: "800" }}>{score}</ThemedText>
      <ThemedText type="caption" style={{ color, fontWeight: "600", marginTop: -2 }}>{label}</ThemedText>
    </View>
  );
}

export default function GrowthDashboardScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { theme } = useTheme();
  const dt = useDesignTokens();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);

  const { data: growthTasks = [], refetch: r1 } = useQuery<any[]>({ queryKey: ["/api/growth-tasks"] });
  const { data: forecast, refetch: r2 } = useQuery<any>({ queryKey: ["/api/forecast"] });
  const { data: reviewRequests = [], refetch: r3 } = useQuery<any[]>({ queryKey: ["/api/review-requests"] });
  const { data: upsellOpps = [], refetch: r4 } = useQuery<any[]>({ queryKey: ["/api/upsell-opportunities"] });
  const { data: rebookCandidates = [], refetch: r5 } = useQuery<any[]>({ queryKey: ["/api/rebook-candidates"] });
  const { data: dormantOpps = [], refetch: r6 } = useQuery<any[]>({ queryKey: ["/api/opportunities/dormant"] });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([r1(), r2(), r3(), r4(), r5(), r6()]);
    setRefreshing(false);
  }, [r1, r2, r3, r4, r5, r6]);

  const pending = useMemo(() => (growthTasks || []).filter((t: any) => t.status === "pending"), [growthTasks]);
  const completed = useMemo(() => (growthTasks || []).filter((t: any) => t.status === "completed"), [growthTasks]);
  const topTasks = pending.slice(0, 3);

  const recentActivity = useMemo(() =>
    [...(growthTasks || [])]
      .filter((t: any) => t.completedAt || t.createdAt)
      .sort((a: any, b: any) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
      .slice(0, 5),
  [growthTasks]);

  const growthScore = useMemo(() => {
    const s1 = Math.min(pending.length * 5, 30);
    const s2 = Math.min(completed.length * 3, 40);
    const s3 = Math.min(Math.round((forecast?.closeRate || 0) * 30), 30);
    return Math.min(s1 + s2 + s3, 100);
  }, [pending, completed, forecast]);

  const opportunities = [
    { label: t.growth.reviews, count: reviewRequests.length, icon: "star" as const, color: theme.warning, nav: "ReviewsReferrals" },
    { label: t.growth.upsells, count: upsellOpps.length, icon: "trending-up" as const, color: theme.success, nav: "UpsellOpportunities" },
    { label: t.growth.rebook, count: rebookCandidates.length, icon: "repeat" as const, color: theme.primary, nav: "TasksQueue" },
    { label: t.growth.reactivation, count: dormantOpps.length, icon: "user-plus" as const, color: theme.error, nav: "ReactivationCampaigns" },
  ];

  const quickActions = [
    { label: t.growth.generateTasks, icon: "zap" as const, screen: "TasksQueue", color: "#F59E0B" },
    { label: t.growth.sendCampaign, icon: "send" as const, screen: "ReactivationCampaigns", color: "#10B981" },
    { label: t.growth.viewAutomations, icon: "settings" as const, screen: "AutomationsHub", color: "#8B5CF6" },
  ];

  const cardStyle = (extra?: any) => [s.card, { backgroundColor: dt.surfacePrimary, borderColor: dt.borderSecondary, ...(Platform.OS === "ios" ? dt.shadow : {}) }, extra];

  return (
    <LinearGradient colors={[dt.gradientTop, dt.gradientBottom]} style={s.flex}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.lg, paddingTop: headerHeight + Spacing.xl, paddingBottom: tabBarHeight + Spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <OnboardingBanner />

        <View style={{ flexDirection: "row", gap: Spacing.sm }}>
          {quickActions.map((a) => (
            <Pressable
              key={a.label}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); navigation.navigate(a.screen); }}
              style={({ pressed }) => [s.quickAction, { backgroundColor: pressed ? `${a.color}25` : `${a.color}12`, borderColor: `${a.color}30` }]}
              testID={`quick-${a.label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <View style={[s.quickActionIcon, { backgroundColor: `${a.color}20` }]}>
                <Feather name={a.icon} size={18} color={a.color} />
              </View>
              <ThemedText type="caption" style={{ color: dt.textPrimary, fontWeight: "700", marginTop: Spacing.xs }} numberOfLines={1}>{a.label}</ThemedText>
              {a.screen === "TasksQueue" && pending.length > 0 ? (
                <View style={s.redBadge}>
                  <ThemedText type="caption" style={s.redBadgeText}>
                    {pending.length > 99 ? "99+" : String(pending.length)}
                  </ThemedText>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>

        <View style={cardStyle({ flexDirection: "row", gap: Spacing.xl })}>
          <CircularProgress score={growthScore} color={dt.accent} bgColor={dt.accentSoft} label={t.growth.growthScore} />
          <View style={{ flex: 1, gap: Spacing.sm }}>
            {[
              { icon: "check-circle" as const, color: theme.success, text: `${completed.length} ${t.growth.completed}` },
              { icon: "clock" as const, color: theme.warning, text: `${pending.length} ${t.growth.pending}` },
              { icon: "percent" as const, color: dt.accent, text: `${Math.round((forecast?.closeRate || 0) * 100)}% ${t.growth.closeRate}` },
            ].map((r) => (
              <View key={r.text} style={s.row}>
                <Feather name={r.icon} size={14} color={r.color} />
                <ThemedText type="small" style={{ marginLeft: 6 }}>{r.text}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <Pressable onPress={() => navigation.navigate("TasksQueue")} style={cardStyle()} testID="todays-focus-card">
          <View style={s.sectionHeader}>
            <View style={{ flex: 1 }}>
              <ThemedText type="subtitle" style={{ fontWeight: "700" }}>{t.growth.todaysFocus}</ThemedText>
              <ThemedText type="caption" style={{ color: dt.textSecondary, marginTop: 2 }}>
                {pending.length > 0 ? `${pending.length} ${pending.length === 1 ? t.growth.taskPending : t.growth.tasksPending}` : t.growth.noPendingTasks}
              </ThemedText>
            </View>
            <View style={[s.viewAll, { backgroundColor: dt.accentSoft }]}>
              <ThemedText type="caption" style={{ color: dt.accent, fontWeight: "600" }}>{t.growth.viewAll}</ThemedText>
              <Feather name="chevron-right" size={14} color={dt.accent} />
            </View>
          </View>
          {topTasks.length > 0 ? (
            <View style={{ marginTop: Spacing.md }}>
              {topTasks.map((task: any, i: number) => (
                <View key={task.id || i} style={[s.taskRow, { borderTopColor: dt.borderSecondary }]}>
                  <View style={[s.iconCircle, { backgroundColor: dt.accentSoft }]}>
                    <Feather name={TASK_ICONS[task.taskType] || TASK_ICONS.default} size={14} color={dt.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="small" numberOfLines={1} style={{ fontWeight: "500" }}>{task.title || task.taskType || "Task"}</ThemedText>
                    <ThemedText type="caption" style={{ color: dt.textSecondary }} numberOfLines={1}>{task.customerName || ""}</ThemedText>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={s.empty}>
              <Feather name="check-circle" size={20} color={theme.success} />
              <ThemedText type="small" style={{ color: dt.textSecondary, marginTop: Spacing.xs }}>{t.growth.allCaughtUp}</ThemedText>
            </View>
          )}
        </Pressable>

        <View style={cardStyle()}>
          <ThemedText type="subtitle" style={{ fontWeight: "700", marginBottom: Spacing.md }}>{t.growth.pipelineSnapshot}</ThemedText>
          <View style={s.grid}>
            {[
              { label: t.growth.openQuotes, value: `$${(forecast?.openQuoteValue || 0).toLocaleString()}` },
              { label: t.growth.forecasted, value: `$${(forecast?.forecastedRevenue || 0).toLocaleString()}` },
              { label: t.growth.closeRate, value: `${Math.round((forecast?.closeRate || 0) * 100)}%` },
              { label: t.growth.confidence, value: forecast?.confidenceBand || "---" },
            ].map((stat) => (
              <View key={stat.label} style={[s.statCell, { backgroundColor: dt.surfaceSecondary }]}>
                <ThemedText type="caption" style={{ color: dt.textSecondary }}>{stat.label}</ThemedText>
                <ThemedText type="h3" style={{ marginTop: 4 }}>{stat.value}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <ThemedText type="subtitle" style={{ fontWeight: "700", paddingTop: Spacing.xs }}>{t.growth.growthOpportunities}</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
          {opportunities.map((c) => (
            <Pressable
              key={c.label}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate(c.nav); }}
              style={[s.oppCard, { backgroundColor: dt.surfacePrimary, borderColor: dt.borderSecondary }]}
              testID={`opportunity-${c.label.toLowerCase()}`}
            >
              <View style={[s.iconCircle, { backgroundColor: `${c.color}15` }]}>
                <Feather name={c.icon} size={16} color={c.color} />
              </View>
              <ThemedText type="h3" style={{ marginTop: Spacing.sm }}>{c.count.toString()}</ThemedText>
              <ThemedText type="caption" style={{ color: dt.textSecondary, marginTop: 2 }}>{c.label}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {recentActivity.length > 0 ? (
          <View style={cardStyle()}>
            <ThemedText type="subtitle" style={{ fontWeight: "700", marginBottom: Spacing.md }}>{t.growth.recentActivity}</ThemedText>
            {recentActivity.map((item: any, i: number) => (
              <View key={item.id || i} style={[s.actRow, i > 0 ? { borderTopWidth: 1, borderTopColor: dt.borderSecondary } : {}]}>
                <View style={[s.dot, { backgroundColor: dt.accent }]} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" numberOfLines={1}>{item.title || item.taskType || "Activity"}</ThemedText>
                  <ThemedText type="caption" style={{ color: dt.textSecondary }}>{item.customerName || ""}</ThemedText>
                </View>
                <ThemedText type="caption" style={{ color: dt.textMuted }}>{getTimeAgo(item.completedAt || item.createdAt, t)}</ThemedText>
              </View>
            ))}
          </View>
        ) : null}

        
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  card: { padding: Spacing.lg, borderRadius: BorderRadius["2xl"], borderWidth: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  viewAll: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.xs, gap: 2 },
  taskRow: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm, borderTopWidth: 1, gap: Spacing.sm },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", paddingVertical: Spacing.xl },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  statCell: { width: "48%", flexGrow: 1, padding: Spacing.md, borderRadius: BorderRadius.sm },
  oppCard: { width: 110, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, alignItems: "center" },
  actRow: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm, gap: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  quickAction: { flex: 1, alignItems: "center", paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderRadius: BorderRadius.xl, borderWidth: 1.5, position: "relative" as const },
  quickActionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  redBadge: { position: "absolute" as const, top: -6, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: "#FF3B30", alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: 5, borderWidth: 2, borderColor: "#FFFFFF" },
  redBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" as const, lineHeight: 13 },
});
