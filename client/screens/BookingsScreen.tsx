import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { IOSShadow } from "@/styles/tokens";

const STATUS_COLOR: Record<string, string> = {
  confirmed: "#34C759",
  pending: "#FF9500",
  cancelled: "#FF3B30",
  completed: "#8E8E93",
};

function BookingCard({ item }: { item: any }) {
  const { theme, isDark } = useTheme();
  const color = STATUS_COLOR[item.status] || "#8E8E93";

  const displayDate = item.scheduled_date
    ? new Date(item.scheduled_date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric",
      })
    : "—";

  const formatTime = (t: string | null) => {
    if (!t) return "—";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const quoteAmt = item.quote_amount ? `$${parseFloat(item.quote_amount).toFixed(0)}` : null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? theme.surface1 : theme.surface0,
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        },
        IOSShadow.card,
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: color + "1A" }]}>
          <Text style={[styles.avatarText, { color }]}>
            {(item.customer_name || "?")[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.customerName, { color: theme.text }]} numberOfLines={1}>
            {item.customer_name || "Unknown Customer"}
          </Text>
          {item.address ? (
            <Text style={[styles.address, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.address}
            </Text>
          ) : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: color + "18" }]}>
          <Text style={[styles.statusText, { color }]}>{item.status}</Text>
        </View>
      </View>

      <View style={[styles.metaRow, { borderTopColor: theme.border }]}>
        <View style={styles.metaItem}>
          <Feather name="calendar" size={13} color={theme.textSecondary} />
          <Text style={[styles.metaText, { color: theme.text }]}>{displayDate}</Text>
        </View>
        <View style={styles.metaDot} />
        <View style={styles.metaItem}>
          <Feather name="clock" size={13} color={theme.textSecondary} />
          <Text style={[styles.metaText, { color: theme.text }]}>{formatTime(item.scheduled_time)}</Text>
        </View>
        {quoteAmt ? (
          <>
            <View style={styles.metaDot} />
            <View style={styles.metaItem}>
              <Feather name="dollar-sign" size={13} color={theme.textSecondary} />
              <Text style={[styles.metaText, { color: theme.text }]}>{quoteAmt}</Text>
            </View>
          </>
        ) : null}
      </View>

      {item.service_type ? (
        <View style={styles.serviceRow}>
          <Text style={[styles.serviceText, { color: theme.textSecondary }]}>
            {item.service_type}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function BookingsScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<any>();

  const { data: bookings = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/autopilot/bookings"],
  });

  const upcoming = bookings.filter(
    (b) => b.status !== "cancelled" && b.status !== "completed"
  );
  const past = bookings.filter(
    (b) => b.status === "completed" || b.status === "cancelled"
  );

  return (
    <FlatList
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.md,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
      }}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />
      }
      data={[...upcoming, ...past]}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <BookingCard item={item} />}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      ListHeaderComponent={() => (
        <View style={{ gap: Spacing.sm, marginBottom: Spacing.sm }}>
          <View style={styles.headerRow}>
            <Text style={[styles.screenTitle, { color: theme.text }]}>
              {upcoming.length} Upcoming
            </Text>
            <Pressable
              onPress={() => navigation.navigate("Availability")}
              style={({ pressed }) => [styles.settingsBtn, { opacity: pressed ? 0.6 : 1, borderColor: theme.border }]}
              testID="button-availability-settings"
            >
              <Feather name="settings" size={15} color={theme.textSecondary} />
              <Text style={[styles.settingsBtnText, { color: theme.textSecondary }]}>Availability</Text>
            </Pressable>
          </View>
        </View>
      )}
      ListEmptyComponent={() =>
        !isLoading ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: "#34C75914" }]}>
              <Feather name="calendar" size={28} color="#34C759" />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No bookings yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              When leads accept quotes and book through Autopilot, they will appear here.
            </Text>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  screenTitle: { fontSize: 17, fontWeight: "700" },
  settingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  settingsBtnText: { fontSize: 13, fontWeight: "600" },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700" },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  customerName: { fontSize: 15, fontWeight: "600" },
  address: { fontSize: 13 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
    flexWrap: "wrap",
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13, fontWeight: "500" },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#C7C7CC" },
  serviceRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 10,
  },
  serviceText: { fontSize: 13 },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: Spacing.xl },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  emptySubtext: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
