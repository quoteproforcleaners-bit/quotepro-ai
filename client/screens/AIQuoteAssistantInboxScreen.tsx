import React, { useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const PURPLE = "#7C3AED";

type Filter = "all" | "ai" | "handoff" | "intake" | "unread";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ai", label: "AI Active" },
  { key: "handoff", label: "Needs Human" },
  { key: "intake", label: "Intake" },
  { key: "unread", label: "Unread" },
];

function getStatusBadge(thread: any): { label: string; color: string } {
  if (thread.handoffStatus === "human") return { label: "Needs Human", color: "#EF4444" };
  if (thread.currentState === "intake") return { label: "Intake In Progress", color: "#F59E0B" };
  if (thread.currentState === "complete") return { label: "Quote Ready", color: "#10B981" };
  if (thread.aiStatus === "paused") return { label: "Paused", color: "#6B7280" };
  return { label: "AI Active", color: PURPLE };
}

function ThreadCard({ thread, onPress, theme }: { thread: any; onPress: () => void; theme: any }) {
  const badge = getStatusBadge(thread);
  const lastAt = thread.lastMessageAt
    ? new Date(thread.lastMessageAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "";

  return (
    <Pressable style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={onPress}>
      <View style={styles.cardRow}>
        <View style={styles.avatarCircle}>
          <Feather name="user" size={18} color={PURPLE} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <ThemedText style={styles.customerName}>
              {thread.customerName || thread.phoneNumber}
            </ThemedText>
            <ThemedText style={[styles.time, { color: theme.textMuted }]}>{lastAt}</ThemedText>
          </View>
          <ThemedText style={[styles.phoneText, { color: theme.textMuted }]}>{thread.phoneNumber}</ThemedText>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: badge.color + "22" }]}>
              <ThemedText style={[styles.badgeText, { color: badge.color }]}>{badge.label}</ThemedText>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function AIQuoteAssistantInboxScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const { data: threads = [], isLoading, refetch, isRefetching } = useQuery<any[]>({
    queryKey: ["/api/ai-assistant/threads"],
  });

  const filtered = (threads as any[]).filter((t) => {
    const matchFilter =
      filter === "all" ||
      (filter === "ai" && t.aiStatus === "active") ||
      (filter === "handoff" && t.handoffStatus === "human") ||
      (filter === "intake" && t.currentState === "intake") ||
      filter === "unread";
    const matchSearch =
      !search ||
      t.phoneNumber?.includes(search) ||
      t.customerName?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <ThemedView style={[styles.container, { paddingTop: headerHeight }]}>
      {/* Search */}
      <View style={[styles.searchRow, { borderColor: theme.border }]}>
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Feather name="search" size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search conversations..."
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => navigation.navigate("AIQuoteAssistantSettings")}
          style={styles.iconBtn}
        >
          <Feather name="settings" size={20} color={theme.textMuted} />
        </Pressable>
      </View>

      {/* Filters */}
      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(f) => f.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
        renderItem={({ item }) => {
          const active = filter === item.key;
          return (
            <Pressable
              onPress={() => setFilter(item.key)}
              style={[
                styles.filterChip,
                { backgroundColor: active ? PURPLE : theme.surface, borderColor: active ? PURPLE : theme.border },
              ]}
            >
              <ThemedText style={[styles.filterText, { color: active ? "#fff" : theme.textMuted }]}>
                {item.label}
              </ThemedText>
            </Pressable>
          );
        }}
      />

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={PURPLE} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Feather name="message-circle" size={48} color={theme.textMuted} style={{ marginBottom: 16 }} />
          <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>No conversations yet.</ThemedText>
          <ThemedText style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            Once customers text your business number, their conversations will appear here.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: insets.bottom + Spacing.xl }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={PURPLE} />}
          renderItem={({ item }) => (
            <ThreadCard
              thread={item}
              theme={theme}
              onPress={() => navigation.navigate("AIQuoteAssistantThread", { threadId: item.id })}
            />
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 8 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", borderRadius: BorderRadius.lg, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { flex: 1, fontSize: 15 },
  iconBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  filtersRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: 8 },
  filterChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  filterText: { fontSize: 13, fontWeight: "600" },
  card: { borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.sm, padding: Spacing.md },
  cardRow: { flexDirection: "row", gap: 12 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: PURPLE + "22", justifyContent: "center", alignItems: "center" },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  customerName: { fontSize: 15, fontWeight: "600" },
  time: { fontSize: 12 },
  phoneText: { fontSize: 13, marginBottom: 6 },
  badgeRow: { flexDirection: "row", gap: 6 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: Spacing.xl },
  emptyTitle: { fontSize: 17, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
