import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

function useDesignTokens() {
  const { theme, isDark } = useTheme();
  return useMemo(() => ({
    surfacePrimary: theme.cardBackground,
    surfaceSecondary: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
    borderPrimary: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
    borderSecondary: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    textPrimary: theme.text,
    textSecondary: theme.textSecondary,
    textMuted: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)",
    accent: theme.primary,
    accentSoft: isDark ? "rgba(100,160,255,0.12)" : "rgba(0,122,255,0.08)",
    success: theme.success,
    successSoft: isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)",
  }), [theme, isDark]);
}

function getDaysAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never had a deep clean";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return "Last deep clean: today";
  if (days === 1) return "Last deep clean: 1 day ago";
  return `Last deep clean: ${days} days ago`;
}

export default function UpsellOpportunitiesScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const dt = useDesignTokens();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const { data: opportunities = [], refetch } = useQuery<any[]>({
    queryKey: ["/api/upsell-opportunities"],
  });

  const summary = useMemo(() => {
    const count = opportunities.length;
    const totalRevenue = opportunities.reduce((sum: number, opp: any) => {
      const avg = opp.avgTicket || opp.averageTicket || 0;
      return sum + avg * 1.5;
    }, 0);
    return { count, totalRevenue: Math.round(totalRevenue) };
  }, [opportunities]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCreateTask = useCallback(async (opp: any) => {
    setLoadingId(opp.id || opp.customerId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const avgTicket = opp.avgTicket || opp.averageTicket || 0;
      await apiRequest("POST", "/api/growth-tasks", {
        type: "UPSELL_DEEP_CLEAN",
        customerId: opp.customerId,
        estimatedValue: Math.round(avgTicket * 1.5),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/growth-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/upsell-opportunities"] });
    } catch {}
    setLoadingId(null);
  }, [queryClient]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    const avgTicket = item.avgTicket || item.averageTicket || 0;
    const itemId = item.id || item.customerId;
    const isLoading = loadingId === itemId;

    return (
      <View
        style={[s.card, { backgroundColor: dt.surfacePrimary, borderColor: dt.borderSecondary }]}
        testID={`card-upsell-${itemId}`}
      >
        <View style={s.cardTop}>
          <View style={[s.avatar, { backgroundColor: dt.accentSoft }]}>
            <Feather name="trending-up" size={18} color={dt.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle" numberOfLines={1}>
              {item.customerName || `Customer #${item.customerId}`}
            </ThemedText>
            <ThemedText type="caption" style={{ color: dt.textMuted }}>
              {getDaysAgo(item.lastDeepClean)}
            </ThemedText>
          </View>
        </View>

        <View style={s.detailRow}>
          <View style={s.detailItem}>
            <ThemedText type="caption" style={{ color: dt.textSecondary }}>{"Avg Ticket"}</ThemedText>
            <ThemedText type="subtitle">{`$${avgTicket.toFixed(0)}`}</ThemedText>
          </View>
          <View style={s.detailItem}>
            <ThemedText type="caption" style={{ color: dt.textSecondary }}>{"Upsell Value"}</ThemedText>
            <ThemedText type="subtitle" style={{ color: dt.success }}>
              {`$${Math.round(avgTicket * 1.5)}`}
            </ThemedText>
          </View>
        </View>

        <Pressable
          testID={`button-create-task-${itemId}`}
          onPress={() => handleCreateTask(item)}
          disabled={isLoading}
          style={[s.actionBtn, { backgroundColor: dt.accentSoft }]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={dt.accent} />
          ) : (
            <>
              <Feather name="plus-circle" size={16} color={dt.accent} />
              <ThemedText type="small" style={{ color: dt.accent, fontWeight: "600", marginLeft: Spacing.xs }}>
                {"Create Task"}
              </ThemedText>
            </>
          )}
        </Pressable>
      </View>
    );
  }, [dt, loadingId, handleCreateTask]);

  const ListHeader = useMemo(() => (
    <View
      style={[s.summaryCard, { backgroundColor: dt.surfacePrimary, borderColor: dt.borderSecondary }]}
      testID="card-upsell-summary"
    >
      <View style={[s.summaryIcon, { backgroundColor: dt.successSoft }]}>
        <Feather name="trending-up" size={24} color={dt.success} />
      </View>
      <ThemedText type="h4" style={{ marginTop: Spacing.md }}>{"Upsell Opportunities"}</ThemedText>
      <View style={s.summaryStats}>
        <View style={s.summaryItem}>
          <ThemedText type="h2">{summary.count}</ThemedText>
          <ThemedText type="caption" style={{ color: dt.textSecondary }}>{"Opportunities"}</ThemedText>
        </View>
        <View style={[s.divider, { backgroundColor: dt.borderSecondary }]} />
        <View style={s.summaryItem}>
          <ThemedText type="h2" style={{ color: dt.success }}>{`$${summary.totalRevenue}`}</ThemedText>
          <ThemedText type="caption" style={{ color: dt.textSecondary }}>{"Potential Revenue"}</ThemedText>
        </View>
      </View>
    </View>
  ), [summary, dt]);

  const EmptyState = useMemo(() => (
    <View style={s.empty} testID="empty-state-upsells">
      <View style={[s.emptyIcon, { backgroundColor: dt.accentSoft }]}>
        <Feather name="trending-up" size={32} color={dt.accent} />
      </View>
      <ThemedText type="h4" style={{ textAlign: "center", marginTop: Spacing.lg }}>
        {"No Upsell Opportunities"}
      </ThemedText>
      <ThemedText type="small" style={{ color: dt.textSecondary, textAlign: "center", marginTop: Spacing.xs }}>
        {"Opportunities will appear here when customers are due for a deep clean."}
      </ThemedText>
    </View>
  ), [dt]);

  return (
    <View style={s.flex}>
      <FlatList
        data={opportunities}
        keyExtractor={(item) => String(item.id || item.customerId)}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyState}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
          gap: Spacing.md,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={dt.accent} />
        }
        showsVerticalScrollIndicator={false}
        testID="list-upsell-opportunities"
      />
    </View>
  );
}

const centered = { alignItems: "center" as const, justifyContent: "center" as const };
const s = StyleSheet.create({
  flex: { flex: 1 },
  summaryCard: { padding: Spacing.xl, borderRadius: BorderRadius.lg, borderWidth: 1, alignItems: "center" },
  summaryIcon: { width: 48, height: 48, borderRadius: 24, ...centered },
  summaryStats: { flexDirection: "row", alignItems: "center", marginTop: Spacing.lg, gap: Spacing.xl },
  summaryItem: { alignItems: "center" },
  divider: { width: 1, height: 40 },
  card: { padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.md },
  avatar: { width: 36, height: 36, borderRadius: 18, ...centered },
  detailRow: { flexDirection: "row", gap: Spacing.xl, marginBottom: Spacing.md, marginLeft: 44 },
  detailItem: { gap: 2 },
  actionBtn: { flexDirection: "row", ...centered, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, minHeight: 40 },
  empty: { ...centered, paddingVertical: Spacing["5xl"] },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, ...centered },
});
