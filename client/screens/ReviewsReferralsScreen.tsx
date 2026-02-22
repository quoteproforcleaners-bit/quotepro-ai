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
import { Card } from "@/components/Card";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ProGate } from "@/components/ProGate";

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
    warning: theme.warning,
    warningSoft: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.08)",
    error: theme.error,
  }), [theme, isDark]);
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  sent: { label: "Sent", color: "#007AFF", bg: "rgba(0,122,255,0.12)" },
  clicked: { label: "Clicked", color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
  completed: { label: "Completed", color: "#10B981", bg: "rgba(16,185,129,0.12)" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <View style={[s.badge, { backgroundColor: config.bg }]} testID={`badge-status-${status}`}>
      <ThemedText type="caption" style={{ color: config.color, fontWeight: "600" }}>
        {config.label}
      </ThemedText>
    </View>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={s.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Feather
          key={i}
          name="star"
          size={14}
          color={i <= rating ? "#F59E0B" : "rgba(150,150,150,0.3)"}
          style={{ marginRight: 2 }}
        />
      ))}
    </View>
  );
}

export default function ReviewsReferralsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const dt = useDesignTokens();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const { data: reviewRequests = [], refetch } = useQuery<any[]>({
    queryKey: ["/api/review-requests"],
  });

  const stats = useMemo(() => {
    const sent = reviewRequests.filter((r: any) => r.status !== "pending").length;
    const clicks = reviewRequests.filter((r: any) => r.reviewClicked).length;
    const referrals = reviewRequests.filter((r: any) => r.referralSent).length;
    return { sent, clicks, referrals };
  }, [reviewRequests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSendReview = useCallback(async (id: number) => {
    setLoadingId(`review-${id}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await apiRequest("PUT", `/api/review-requests/${id}`, { reviewClicked: true });
      queryClient.invalidateQueries({ queryKey: ["/api/review-requests"] });
    } catch {}
    setLoadingId(null);
  }, [queryClient]);

  const handleAskReferral = useCallback(async (id: number) => {
    setLoadingId(`referral-${id}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await apiRequest("PUT", `/api/review-requests/${id}`, { referralSent: true });
      queryClient.invalidateQueries({ queryKey: ["/api/review-requests"] });
    } catch {}
    setLoadingId(null);
  }, [queryClient]);

  const handleCreateRequest = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const getCustomerName = (item: any) => {
    if (item.metadata?.customerName) return item.metadata.customerName;
    if (item.customerName) return item.customerName;
    return `Customer #${item.customerId || item.id}`;
  };

  const renderItem = useCallback(({ item }: { item: any }) => (
    <View
      style={[s.card, { backgroundColor: dt.surfacePrimary, borderColor: dt.borderSecondary }]}
      testID={`card-review-${item.id}`}
    >
      <View style={s.cardHeader}>
        <View style={s.cardHeaderLeft}>
          <View style={[s.avatar, { backgroundColor: dt.accentSoft }]}>
            <Feather name="user" size={18} color={dt.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle" numberOfLines={1}>{getCustomerName(item)}</ThemedText>
            {item.jobId ? (
              <ThemedText type="caption" style={{ color: dt.textMuted }}>
                {`Job #${item.jobId}`}
              </ThemedText>
            ) : null}
          </View>
        </View>
        <StatusBadge status={item.status || "pending"} />
      </View>

      {item.rating ? <StarRating rating={item.rating} /> : null}

      <View style={s.actions}>
        <Pressable
          testID={`button-send-review-${item.id}`}
          onPress={() => handleSendReview(item.id)}
          disabled={loadingId === `review-${item.id}`}
          style={[s.actionBtn, { backgroundColor: dt.accentSoft }]}
        >
          {loadingId === `review-${item.id}` ? (
            <ActivityIndicator size="small" color={dt.accent} />
          ) : (
            <>
              <Feather name="send" size={14} color={dt.accent} />
              <ThemedText type="caption" style={{ color: dt.accent, fontWeight: "600", marginLeft: 4 }}>
                {"Send Review Link"}
              </ThemedText>
            </>
          )}
        </Pressable>

        <Pressable
          testID={`button-ask-referral-${item.id}`}
          onPress={() => handleAskReferral(item.id)}
          disabled={loadingId === `referral-${item.id}`}
          style={[s.actionBtn, { backgroundColor: dt.successSoft }]}
        >
          {loadingId === `referral-${item.id}` ? (
            <ActivityIndicator size="small" color={dt.success} />
          ) : (
            <>
              <Feather name="gift" size={14} color={dt.success} />
              <ThemedText type="caption" style={{ color: dt.success, fontWeight: "600", marginLeft: 4 }}>
                {"Ask Referral"}
              </ThemedText>
            </>
          )}
        </Pressable>
      </View>
    </View>
  ), [dt, loadingId, handleSendReview, handleAskReferral]);

  const ListHeader = useMemo(() => (
    <View style={s.statsRow} testID="stats-row">
      {[
        { label: "Reviews Sent", value: stats.sent, icon: "send" as const, color: dt.accent },
        { label: "Review Clicks", value: stats.clicks, icon: "mouse-pointer" as const, color: dt.warning },
        { label: "Referrals Sent", value: stats.referrals, icon: "gift" as const, color: dt.success },
      ].map((stat) => (
        <View
          key={stat.label}
          style={[s.statCard, { backgroundColor: dt.surfacePrimary, borderColor: dt.borderSecondary }]}
          testID={`stat-${stat.label.replace(/\s/g, "-").toLowerCase()}`}
        >
          <View style={[s.statIcon, { backgroundColor: `${stat.color}15` }]}>
            <Feather name={stat.icon} size={16} color={stat.color} />
          </View>
          <ThemedText type="h3" style={{ marginTop: Spacing.xs }}>{stat.value}</ThemedText>
          <ThemedText type="caption" style={{ color: dt.textSecondary }}>{stat.label}</ThemedText>
        </View>
      ))}
    </View>
  ), [stats, dt]);

  const EmptyState = useMemo(() => (
    <View style={s.empty} testID="empty-state-reviews">
      <View style={[s.emptyIcon, { backgroundColor: dt.accentSoft }]}>
        <Feather name="star" size={32} color={dt.accent} />
      </View>
      <ThemedText type="h4" style={{ textAlign: "center", marginTop: Spacing.lg }}>
        {"No Review Requests Yet"}
      </ThemedText>
      <ThemedText type="small" style={{ color: dt.textSecondary, textAlign: "center", marginTop: Spacing.xs }}>
        {"Tap the button below to request a review from a customer."}
      </ThemedText>
    </View>
  ), [dt]);

  return (
    <ProGate featureName="Reviews & Referrals">
    <View style={s.flex}>
      <FlatList
        data={reviewRequests}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyState}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl + 80,
          gap: Spacing.md,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={dt.accent} />
        }
        showsVerticalScrollIndicator={false}
        testID="list-review-requests"
      />

      <Pressable
        testID="fab-request-review"
        onPress={handleCreateRequest}
        style={[s.fab, { backgroundColor: theme.primary, bottom: insets.bottom + Spacing.xl }]}
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
      </Pressable>
    </View>
    </ProGate>
  );
}

const centered = { alignItems: "center" as const, justifyContent: "center" as const };
const s = StyleSheet.create({
  flex: { flex: 1 },
  statsRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.sm },
  statCard: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, ...centered },
  statIcon: { width: 32, height: 32, borderRadius: 16, ...centered },
  card: { padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.sm },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, flex: 1, marginRight: Spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, ...centered },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  starsRow: { flexDirection: "row", marginBottom: Spacing.sm, marginLeft: 44 },
  actions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.xs },
  actionBtn: { flex: 1, flexDirection: "row", ...centered, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, minHeight: 36 },
  empty: { ...centered, paddingVertical: Spacing["5xl"] },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, ...centered },
  fab: { position: "absolute", right: Spacing.lg, width: 56, height: 56, borderRadius: 28, ...centered },
});
