import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { ProGate } from "@/components/ProGate";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type TabKey = "new" | "saved" | "contacted" | "all";

const TABS: { key: TabKey; label: string }[] = [
  { key: "new", label: "New" },
  { key: "saved", label: "Saved" },
  { key: "contacted", label: "Contacted" },
  { key: "all", label: "All" },
];

const INTENT_LABELS: Record<string, string> = {
  recommendation_request: "Recommendation",
  quote_request: "Quote Request",
  recurring_cleaning: "Recurring",
  deep_clean: "Deep Clean",
  move_out: "Move-Out",
  move_in: "Move-In",
  one_time_clean: "One-Time",
  other: "General",
};

function timeAgo(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function ScoreBadge({ score, theme }: { score: number; theme: any }) {
  const color = score >= 70 ? "#059669" : score >= 40 ? "#D97706" : "#6b7280";
  return (
    <View style={[styles.scoreBadge, { backgroundColor: color + "20", borderColor: color + "40" }]}>
      <ThemedText style={[styles.scoreText, { color }]}>{score}</ThemedText>
    </View>
  );
}

function StatusBadge({ status, theme }: { status: string; theme: any }) {
  const map: Record<string, { label: string; color: string }> = {
    new: { label: "New", color: "#7C3AED" },
    saved: { label: "Saved", color: "#2563EB" },
    contacted: { label: "Contacted", color: "#059669" },
    dismissed: { label: "Dismissed", color: "#6b7280" },
  };
  const item = map[status] ?? { label: status, color: "#6b7280" };
  return (
    <View style={[styles.statusBadge, { backgroundColor: item.color + "18" }]}>
      <ThemedText style={[styles.statusText, { color: item.color }]}>{item.label}</ThemedText>
    </View>
  );
}

export default function LeadFinderScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>("new");
  const [refreshing, setRefreshing] = useState(false);
  const [polling, setPolling] = useState(false);

  const queryKey = ["/api/lead-finder/leads", activeTab];

  const { data, isLoading } = useQuery<{ leads: any[]; total: number }>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ status: activeTab === "all" ? "" : activeTab, limit: "30" });
      const res = await fetch(`/api/lead-finder/leads?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const leads = data?.leads ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ["/api/lead-finder/leads"] });
    setRefreshing(false);
  }, [qc]);

  const handlePoll = useCallback(async () => {
    setPolling(true);
    try {
      await apiRequest("POST", "/api/lead-finder/poll", {});
      await qc.invalidateQueries({ queryKey: ["/api/lead-finder/leads"] });
      await qc.invalidateQueries({ queryKey: ["/api/lead-finder/count"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setPolling(false);
  }, [qc]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("POST", `/api/lead-finder/leads/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/lead-finder/leads"] });
      qc.invalidateQueries({ queryKey: ["/api/lead-finder/count"] });
    },
  });

  const renderLead = useCallback(({ item }: { item: any }) => {
    const postedDate = item.postedAt ? timeAgo(item.postedAt) : "unknown";
    const excerpt = (item.body ?? "").slice(0, 120).trim();

    return (
      <Pressable
        onPress={() => navigation.navigate("LeadFinderDetail", { leadId: item.id })}
        style={({ pressed }) => [styles.cardWrap, { opacity: pressed ? 0.85 : 1 }]}
      >
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.subredditPill, { backgroundColor: theme.primary + "15" }]}>
                <ThemedText style={[styles.subredditText, { color: theme.primary }]}>
                  r/{item.subreddit ?? "reddit"}
                </ThemedText>
              </View>
              <ThemedText style={[styles.timeAgo, { color: theme.textSecondary }]}>
                {postedDate}
              </ThemedText>
            </View>
            <View style={styles.cardHeaderRight}>
              <ScoreBadge score={item.leadScore ?? 0} theme={theme} />
              {item.status !== "new" ? <StatusBadge status={item.status} theme={theme} /> : null}
            </View>
          </View>

          <ThemedText style={styles.leadTitle} numberOfLines={2}>{item.title}</ThemedText>

          {excerpt.length > 0 ? (
            <ThemedText style={[styles.leadExcerpt, { color: theme.textSecondary }]} numberOfLines={2}>
              {excerpt}
            </ThemedText>
          ) : null}

          <View style={styles.cardMeta}>
            {item.detectedLocation ? (
              <View style={styles.metaChip}>
                <Feather name="map-pin" size={11} color={theme.textSecondary} />
                <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
                  {item.detectedLocation}
                </ThemedText>
              </View>
            ) : null}
            {item.intent ? (
              <View style={styles.metaChip}>
                <Feather name="tag" size={11} color={theme.textSecondary} />
                <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
                  {INTENT_LABELS[item.intent] ?? item.intent}
                </ThemedText>
              </View>
            ) : null}
            {item.matchedKeyword ? (
              <View style={styles.metaChip}>
                <Feather name="search" size={11} color={theme.textSecondary} />
                <ThemedText style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {item.matchedKeyword}
                </ThemedText>
              </View>
            ) : null}
          </View>

          <View style={[styles.cardActions, { borderTopColor: theme.border }]}>
            {item.status === "new" ? (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#2563EB15" }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); statusMutation.mutate({ id: item.id, status: "saved" }); }}
              >
                <Feather name="bookmark" size={13} color="#2563EB" />
                <ThemedText style={[styles.actionText, { color: "#2563EB" }]}>Save</ThemedText>
              </Pressable>
            ) : null}
            {item.status !== "contacted" ? (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#05966915" }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); statusMutation.mutate({ id: item.id, status: "contacted" }); }}
              >
                <Feather name="check" size={13} color="#059669" />
                <ThemedText style={[styles.actionText, { color: "#059669" }]}>Contacted</ThemedText>
              </Pressable>
            ) : null}
            {item.status !== "dismissed" ? (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: theme.border }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); statusMutation.mutate({ id: item.id, status: "dismissed" }); }}
              >
                <Feather name="x" size={13} color={theme.textSecondary} />
                <ThemedText style={[styles.actionText, { color: theme.textSecondary }]}>Dismiss</ThemedText>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.actionBtn, { backgroundColor: "#7C3AED15" }]}
              onPress={() => navigation.navigate("LeadFinderDetail", { leadId: item.id })}
            >
              <Feather name="message-square" size={13} color="#7C3AED" />
              <ThemedText style={[styles.actionText, { color: "#7C3AED" }]}>Reply</ThemedText>
            </Pressable>
          </View>
        </Card>
      </Pressable>
    );
  }, [navigation, theme, statusMutation]);

  return (
    <ProGate featureName="Local Lead Finder">
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setActiveTab(t.key)}
            style={[
              styles.tab,
              activeTab === t.key && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
            ]}
          >
            <ThemedText
              style={[
                styles.tabLabel,
                { color: activeTab === t.key ? theme.primary : theme.textSecondary },
              ]}
            >
              {t.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={leads}
        keyExtractor={(item) => item.id}
        renderItem={renderLead}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: Spacing.md,
            paddingBottom: tabBarHeight + Spacing["2xl"],
          },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Feather name="search" size={32} color={theme.textSecondary} style={{ marginBottom: 12 }} />
              <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>No leads yet</ThemedText>
              <ThemedText style={[styles.emptySub, { color: theme.textSecondary }]}>
                Try adjusting your cities, ZIP codes, subreddits, or keywords, then run a scan.
              </ThemedText>
              <Pressable
                style={[styles.scanBtn, { backgroundColor: theme.primary }]}
                onPress={handlePoll}
                disabled={polling}
              >
                {polling ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.scanBtnText}>Run Scan Now</ThemedText>
                )}
              </Pressable>
            </View>
          )
        }
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              Find people in your area already asking for cleaning help online.
            </ThemedText>
            <View style={styles.headerActions}>
              <Pressable
                style={[styles.scanBtn, { backgroundColor: theme.primary }]}
                onPress={handlePoll}
                disabled={polling}
              >
                {polling ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="refresh-cw" size={14} color="#fff" />
                    <ThemedText style={styles.scanBtnText}>Run Scan Now</ThemedText>
                  </>
                )}
              </Pressable>
              <Pressable
                style={[styles.settingsBtn, { borderColor: theme.border }]}
                onPress={() => navigation.navigate("LeadFinderSettings")}
              >
                <Feather name="settings" size={16} color={theme.textSecondary} />
              </Pressable>
            </View>
          </View>
        }
      />
    </View>
    </ProGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: { fontSize: 13, fontWeight: "600" },
  listContent: { paddingHorizontal: Spacing.md },
  listHeader: { marginBottom: Spacing.md },
  subtitle: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
    flex: 1,
    justifyContent: "center",
  },
  scanBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardWrap: { marginBottom: Spacing.sm },
  card: { padding: Spacing.md },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  cardHeaderRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  subredditPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  subredditText: { fontSize: 11, fontWeight: "700" },
  timeAgo: { fontSize: 11 },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
  },
  scoreText: { fontSize: 11, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: "700" },
  leadTitle: { fontSize: 14, fontWeight: "600", lineHeight: 20, marginBottom: 4 },
  leadExcerpt: { fontSize: 12, lineHeight: 17, marginBottom: 8 },
  cardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11 },
  cardActions: {
    flexDirection: "row",
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.sm,
  },
  actionText: { fontSize: 12, fontWeight: "600" },
  emptyState: {
    margin: Spacing.md,
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 16 },
});
