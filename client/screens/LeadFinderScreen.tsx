import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Text,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { ProGate } from "@/components/ProGate";
import { useSubscription } from "@/context/SubscriptionContext";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const PURPLE = "#7C3AED";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type FilterKey = "all" | "new" | "saved" | "contacted";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "saved", label: "Saved" },
  { key: "contacted", label: "Contacted" },
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

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? "#059669" : score >= 40 ? "#D97706" : "#6b7280";
  return (
    <View style={[styles.scoreBadge, { backgroundColor: color + "20", borderColor: color + "40" }]}>
      <Text style={[styles.scoreText, { color }]}>{score}</Text>
    </View>
  );
}

export default function LeadFinderScreen() {
  const theme = useTheme();
  const { isPro } = useSubscription();
  const navigation = useNavigation<Nav>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const autoScanned = useRef(false);

  const { data, isLoading } = useQuery<{ leads: any[]; total: number }>({
    queryKey: ["/api/lead-finder/leads", "all"],
    queryFn: async () => {
      const params = new URLSearchParams({ status: "", limit: "100" });
      const res = await fetch(`/api/lead-finder/leads?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const allLeads = data?.leads ?? [];

  const triggerScan = useCallback(async (silent = false) => {
    if (!silent) setScanning(true);
    try {
      await apiRequest("POST", "/api/lead-finder/poll", {});
      await qc.invalidateQueries({ queryKey: ["/api/lead-finder/leads"] });
      await qc.invalidateQueries({ queryKey: ["/api/lead-finder/count"] });
      if (!silent) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    if (!silent) setScanning(false);
  }, [qc]);

  useEffect(() => {
    if (!isLoading && !autoScanned.current) {
      autoScanned.current = true;
      if (allLeads.length === 0) {
        triggerScan(true);
      }
    }
  }, [isLoading, allLeads.length]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("POST", `/api/lead-finder/leads/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/lead-finder/leads"] });
      qc.invalidateQueries({ queryKey: ["/api/lead-finder/count"] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await triggerScan(true);
    setRefreshing(false);
  }, [triggerScan]);

  const filteredLeads = allLeads.filter((lead) => {
    if (filter !== "all" && lead.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (lead.title ?? "").toLowerCase().includes(q) ||
        (lead.body ?? "").toLowerCase().includes(q) ||
        (lead.subreddit ?? "").toLowerCase().includes(q) ||
        (lead.detectedLocation ?? "").toLowerCase().includes(q) ||
        (lead.matchedKeyword ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const renderLead = useCallback(({ item }: { item: any }) => {
    const postedDate = item.postedAt ? timeAgo(item.postedAt) : "";
    const excerpt = (item.body ?? "").slice(0, 120).trim();
    const statusColor: Record<string, string> = {
      new: PURPLE,
      saved: "#2563EB",
      contacted: "#059669",
      dismissed: "#9CA3AF",
    };
    const sc = statusColor[item.status] ?? "#9CA3AF";

    return (
      <Pressable
        onPress={() => navigation.navigate("LeadFinderDetail", { leadId: item.id })}
        style={({ pressed }) => [styles.cardWrap, { opacity: pressed ? 0.85 : 1 }]}
        testID={`card-lead-${item.id}`}
      >
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={[styles.subredditPill, { backgroundColor: PURPLE + "15" }]}>
                <Text style={[styles.subredditText, { color: PURPLE }]}>r/{item.subreddit ?? "reddit"}</Text>
              </View>
              <ThemedText style={[styles.timeAgo, { color: theme.textSecondary }]}>{postedDate}</ThemedText>
            </View>
            <View style={styles.cardHeaderRight}>
              <ScoreBadge score={item.leadScore ?? 0} />
              <View style={[styles.statusDot, { backgroundColor: sc }]} />
            </View>
          </View>

          <ThemedText style={styles.leadTitle} numberOfLines={2}>{item.title}</ThemedText>

          {excerpt.length > 0 ? (
            <ThemedText style={[styles.leadExcerpt, { color: theme.textSecondary }]} numberOfLines={2}>
              {excerpt}
            </ThemedText>
          ) : null}

          {item.detectedLocation ? (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={11} color={theme.textSecondary} />
              <ThemedText style={[styles.locationText, { color: theme.textSecondary }]}>
                {item.detectedLocation}
              </ThemedText>
            </View>
          ) : null}

          <View style={[styles.cardActions, { borderTopColor: theme.border }]}>
            {item.status !== "saved" ? (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#2563EB15" }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); statusMutation.mutate({ id: item.id, status: "saved" }); }}
              >
                <Feather name="bookmark" size={13} color="#2563EB" />
                <Text style={[styles.actionText, { color: "#2563EB" }]}>Save</Text>
              </Pressable>
            ) : null}
            {item.status !== "contacted" ? (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#05966915" }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); statusMutation.mutate({ id: item.id, status: "contacted" }); }}
              >
                <Feather name="check" size={13} color="#059669" />
                <Text style={[styles.actionText, { color: "#059669" }]}>Contacted</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.actionBtn, { backgroundColor: PURPLE + "15", marginLeft: "auto" }]}
              onPress={() => navigation.navigate("LeadFinderDetail", { leadId: item.id })}
            >
              <Feather name="message-square" size={13} color={PURPLE} />
              <Text style={[styles.actionText, { color: PURPLE }]}>Reply</Text>
            </Pressable>
          </View>
        </Card>
      </Pressable>
    );
  }, [navigation, theme, statusMutation]);

  if (!isPro) {
    return <ProGate featureName="Local Lead Finder"><View /></ProGate>;
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.topBar, { paddingTop: headerHeight, backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <View style={[styles.searchRow, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Feather name="search" size={15} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search leads, subreddits, locations..."
            placeholderTextColor={theme.textSecondary}
            returnKeyType="search"
            autoCorrect={false}
            testID="input-lead-search"
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={15} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterChip,
                filter === f.key
                  ? { backgroundColor: PURPLE, borderColor: PURPLE }
                  : { backgroundColor: "transparent", borderColor: theme.border },
              ]}
            >
              <Text style={[styles.filterChipText, { color: filter === f.key ? "#fff" : theme.textSecondary }]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.refreshBtn, { borderColor: theme.border }]}
            onPress={() => triggerScan(false)}
            disabled={scanning}
            testID="button-run-scan"
          >
            {scanning
              ? <ActivityIndicator size="small" color={PURPLE} />
              : <Feather name="refresh-cw" size={15} color={PURPLE} />}
          </Pressable>
          <Pressable
            style={[styles.settingsBtn, { borderColor: theme.border }]}
            onPress={() => navigation.navigate("LeadFinderSettings")}
          >
            <Feather name="settings" size={15} color={theme.textSecondary} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filteredLeads}
        keyExtractor={(item) => item.id}
        renderItem={renderLead}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing["2xl"] },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        ListEmptyComponent={
          isLoading || scanning ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={PURPLE} size="large" />
              <ThemedText style={[styles.emptyTitle, { color: theme.text, marginTop: 12 }]}>
                Scanning Reddit for leads...
              </ThemedText>
              <ThemedText style={[styles.emptySub, { color: theme.textSecondary }]}>
                This takes about 10-15 seconds on first run.
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Feather name="search" size={32} color={theme.textSecondary} style={{ marginBottom: 12 }} />
              <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>No leads found</ThemedText>
              <ThemedText style={[styles.emptySub, { color: theme.textSecondary }]}>
                {search.trim()
                  ? "Try a different search term or clear the filter."
                  : "Add your target cities in Settings to find local leads, then tap the refresh icon to scan."}
              </ThemedText>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 12, fontWeight: "600" },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
  },
  settingsBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  cardWrap: { marginBottom: Spacing.sm },
  card: { padding: Spacing.md },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  cardHeaderRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  subredditPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  subredditText: { fontSize: 11, fontWeight: "700" },
  timeAgo: { fontSize: 11 },
  scoreBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, borderWidth: 1 },
  scoreText: { fontSize: 11, fontWeight: "700" },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  leadTitle: { fontSize: 14, fontWeight: "600", lineHeight: 20, marginBottom: 4 },
  leadExcerpt: { fontSize: 12, lineHeight: 17, marginBottom: 6 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  locationText: { fontSize: 11 },
  cardActions: {
    flexDirection: "row",
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    alignItems: "center",
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
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
});
