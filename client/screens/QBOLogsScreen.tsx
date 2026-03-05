import React, { useCallback } from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

type SyncLogEntry = {
  id: string;
  userId: string;
  quoteId: string | null;
  action: string;
  requestSummary: any;
  responseSummary: any;
  status: string;
  errorMessage: string | null;
  createdAt: string;
};

const ACTION_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  connect: "link",
  disconnect: "link-2",
  test_connection: "activity",
  create_invoice: "file-text",
  create_customer: "user-plus",
  refresh_token: "refresh-cw",
  oauth_callback: "log-in",
};

function getActionIcon(action: string): keyof typeof Feather.glyphMap {
  return ACTION_ICONS[action] || "zap";
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function QBOLogsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const { data: logs, isLoading, refetch, isRefetching } = useQuery<SyncLogEntry[]>({
    queryKey: ["/api/integrations/qbo/logs"],
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderItem = useCallback(({ item }: { item: SyncLogEntry }) => {
    const isOk = item.status === "ok";
    const statusColor = isOk ? theme.success : theme.error;

    return (
      <View style={[styles.logCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.logHeader}>
          <View style={[styles.logIcon, { backgroundColor: `${statusColor}15` }]}>
            <Feather name={getActionIcon(item.action)} size={16} color={statusColor} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {item.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </ThemedText>
          </View>
          <View style={[styles.statusPill, { backgroundColor: `${statusColor}15` }]}>
            <ThemedText type="caption" style={{ color: statusColor, fontWeight: "700" }}>
              {isOk ? "OK" : "Failed"}
            </ThemedText>
          </View>
        </View>

        {item.errorMessage ? (
          <View style={[styles.errorBanner, { backgroundColor: `${theme.error}08`, borderColor: `${theme.error}20` }]}>
            <Feather name="alert-circle" size={14} color={theme.error} />
            <ThemedText type="small" style={{ color: theme.error, marginLeft: Spacing.sm, flex: 1 }}>
              {item.errorMessage}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.logFooter}>
          <Feather name="clock" size={12} color={theme.textMuted} />
          <ThemedText type="caption" style={{ color: theme.textMuted, marginLeft: 4 }}>
            {formatRelativeTime(item.createdAt)}
          </ThemedText>
          {item.quoteId ? (
            <>
              <View style={[styles.dot, { backgroundColor: theme.textMuted }]} />
              <Feather name="file-text" size={12} color={theme.textMuted} />
              <ThemedText type="caption" style={{ color: theme.textMuted, marginLeft: 4 }}>
                Quote
              </ThemedText>
            </>
          ) : null}
        </View>
      </View>
    );
  }, [theme]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <EmptyState
        icon="inbox"
        title="No Sync Logs"
        description="QuickBooks sync activity will appear here once you start creating invoices."
      />
    );
  }, [isLoading]);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={logs || []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
          (logs || []).length === 0 ? { flex: 1 } : undefined,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            progressViewOffset={headerHeight}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
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
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginLeft: Spacing.sm,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  logFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: Spacing.sm,
  },
});
