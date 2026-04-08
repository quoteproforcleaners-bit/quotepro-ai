import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { useHeaderHeight } from "@react-navigation/elements";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";

async function fetchStaffApi(path: string) {
  const token = await AsyncStorage.getItem("staff_token");
  const url = new URL(path, getApiUrl());
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load");
  return res.json();
}

function formatTime(dt: string | null | undefined) {
  if (!dt) return "";
  return new Date(dt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function statusColor(status: string): string {
  if (status === "completed" || status === "complete") return "#10b981";
  if (status === "in_progress") return "#f59e0b";
  return "#6366f1";
}

function statusLabel(status: string): string {
  if (status === "completed" || status === "complete") return "Complete";
  if (status === "in_progress") return "In Progress";
  return "Scheduled";
}

interface TodayJob {
  jobId: string;
  assignmentId: string;
  status: string;
  scheduledTime: string;
  address: string;
  customerName: string;
  internalNotes: string;
  total: number | null;
  beforePhotoCount: number;
  afterPhotoCount: number;
}

export default function StaffTodayScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<any>();

  const { data: jobs = [], isLoading, refetch, isRefetching } = useQuery<TodayJob[]>({
    queryKey: ["staff-today"],
    queryFn: () => fetchStaffApi("/api/staff/today"),
    refetchInterval: 60000,
  });

  const renderJob = useCallback(({ item }: { item: TodayJob }) => {
    const color = statusColor(item.status);
    return (
      <Pressable
        testID={`job-card-${item.jobId}`}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.cardBorder, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={() => navigation.navigate("StaffJobDetail", { job: item })}
      >
        {/* Status bar */}
        <View style={[styles.statusBar, { backgroundColor: color }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.customerName, { color: theme.text }]} numberOfLines={1}>
                {item.customerName || "Job"}
              </Text>
              <Text style={[styles.address, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: color + "20" }]}>
              <Text style={[styles.badgeText, { color }]}>{statusLabel(item.status)}</Text>
            </View>
          </View>

          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Feather name="clock" size={13} color={theme.textSecondary} />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                {formatTime(item.scheduledTime)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="camera" size={13} color={theme.textSecondary} />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                {item.beforePhotoCount}B / {item.afterPhotoCount}A
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={theme.textSecondary} />
          </View>
        </View>
      </Pressable>
    );
  }, [theme, navigation]);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <FlatList
      data={jobs}
      keyExtractor={j => j.jobId}
      renderItem={renderJob}
      contentContainerStyle={[
        styles.list,
        { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />
      }
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <Text style={[styles.dateText, { color: theme.textSecondary }]}>{today}</Text>
          <Text style={[styles.countText, { color: theme.text }]}>
            {jobs.length === 0 ? "No jobs today" : `${jobs.length} job${jobs.length !== 1 ? "s" : ""} scheduled`}
          </Text>
        </View>
      }
      ListEmptyComponent={
        isLoading ? (
          <View style={styles.empty}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <View style={styles.empty}>
            <Feather name="check-circle" size={48} color="#10b981" style={{ marginBottom: Spacing.md }} />
            <ThemedText type="defaultSemiBold" style={{ color: theme.text }}>
              No jobs scheduled today
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginTop: 4 }}>
              Enjoy your day off — check back tomorrow!
            </ThemedText>
          </View>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: Spacing.md },
  listHeader: { marginBottom: Spacing.md },
  dateText: { fontSize: 13, fontWeight: "500" },
  countText: { fontSize: 20, fontWeight: "700", marginTop: 2 },
  card: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  statusBar: { width: 4 },
  cardBody: { flex: 1, padding: Spacing.md },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm, marginBottom: 8 },
  customerName: { fontSize: 16, fontWeight: "700" },
  address: { fontSize: 13, marginTop: 2 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.full,
    flexShrink: 0,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12 },
  empty: {
    alignItems: "center", justifyContent: "center",
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.xl,
  },
});
