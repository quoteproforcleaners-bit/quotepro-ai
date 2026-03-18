import React from "react";
import { View, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { usePlanGate } from "@/context/SubscriptionContext";
import { ProGateOverlay } from "@/components/ProGate";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

type SyncLogEntry = {
  id: string;
  action: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  quoteId: string | null;
};

const ACTION_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  connect: "link",
  disconnect: "link-2",
  test_connection: "activity",
  sync_quote: "upload",
  create_client: "user-plus",
  refresh: "refresh-cw",
};

function getActionIcon(action: string): keyof typeof Feather.glyphMap {
  return ACTION_ICONS[action] || "zap";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function JobberLogsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { hasAccess, isLoading: subLoading } = usePlanGate("pro");

  const { data: logs, isLoading } = useQuery<SyncLogEntry[]>({
    queryKey: ["/api/integrations/jobber/logs"],
  });

  if (subLoading || !hasAccess) {
    return <ProGateOverlay featureName="Jobber Integration" minTier="pro" isLoading={subLoading} />;
  }

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: SyncLogEntry }) => (
    <View style={[styles.logCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={styles.logHeader}>
        <View style={[styles.logIcon, { backgroundColor: item.status === "ok" ? `${theme.success}15` : `${theme.error}15` }]}>
          <Feather name={getActionIcon(item.action)} size={16} color={item.status === "ok" ? theme.success : theme.error} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            {item.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
            {formatDate(item.createdAt)}
          </ThemedText>
        </View>
        <View style={[styles.statusPill, { backgroundColor: item.status === "ok" ? `${theme.success}15` : `${theme.error}15` }]}>
          <ThemedText type="caption" style={{ color: item.status === "ok" ? theme.success : theme.error, fontWeight: "600" }}>
            {item.status === "ok" ? "OK" : "Failed"}
          </ThemedText>
        </View>
      </View>
      {item.errorMessage ? (
        <ThemedText type="small" style={{ color: theme.error, marginTop: Spacing.sm }}>
          {item.errorMessage}
        </ThemedText>
      ) : null}
    </View>
  );

  return (
    <FlatList
      data={logs || []}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      ListEmptyComponent={
        <View style={[styles.emptyContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Feather name="inbox" size={40} color={theme.textMuted} />
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
            No sync logs yet
          </ThemedText>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  logIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  emptyContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing["3xl"],
    alignItems: "center",
  },
});
