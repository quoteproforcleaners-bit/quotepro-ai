import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { trackEvent } from "@/lib/analytics";

interface JobberClient {
  jobberId: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  alreadyImported: boolean;
}

interface JobberClientsResponse {
  clients: JobberClient[];
  hasNextPage: boolean;
  endCursor: string | null;
  totalCount: number;
}

interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
}

export default function JobberImportScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allClients, setAllClients] = useState<JobberClient[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [lastCursor, setLastCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resultModal, setResultModal] = useState<ImportResult | null>(null);

  const buildUrl = useCallback(() => {
    const base = "/api/integrations/jobber/clients";
    return cursor ? `${base}?cursor=${encodeURIComponent(cursor)}` : base;
  }, [cursor]);

  const { isLoading, isFetching } = useQuery<JobberClientsResponse>({
    queryKey: ["/api/integrations/jobber/clients", cursor || "initial"],
    queryFn: async () => {
      const url = cursor
        ? `/api/integrations/jobber/clients?cursor=${encodeURIComponent(cursor)}`
        : "/api/integrations/jobber/clients";
      const res = await apiRequest("GET", url);
      return res.json();
    },
    onSuccess: (data: JobberClientsResponse) => {
      if (cursor) {
        setAllClients((prev) => {
          const existingIds = new Set(prev.map((c) => c.jobberId));
          const newClients = data.clients.filter((c) => !existingIds.has(c.jobberId));
          return [...prev, ...newClients];
        });
      } else {
        setAllClients(data.clients);
      }
      setHasMore(data.hasNextPage);
      if (data.endCursor) {
        setLastCursor(data.endCursor);
      }
    },
  } as any);

  const selectableClients = allClients.filter((c) => !c.alreadyImported);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === selectableClients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableClients.map((c) => c.jobberId)));
    }
  };

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || !lastCursor) return;
    setLoadingMore(true);
    try {
      const url = `/api/integrations/jobber/clients?cursor=${encodeURIComponent(lastCursor)}`;
      const res = await apiRequest("GET", url);
      const data: JobberClientsResponse = await res.json();
      setAllClients((prev) => {
        const existingIds = new Set(prev.map((c) => c.jobberId));
        const newClients = data.clients.filter((c) => !existingIds.has(c.jobberId));
        return [...prev, ...newClients];
      });
      setHasMore(data.hasNextPage);
      if (data.endCursor) {
        setLastCursor(data.endCursor);
      }
    } catch (e) {
    } finally {
      setLoadingMore(false);
    }
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    trackEvent("jobber_import_started", { count });
    setImporting(true);
    try {
      const res = await apiRequest("POST", "/api/integrations/jobber/import-clients", {
        clientIds: Array.from(selectedIds),
      });
      const result: ImportResult = await res.json();
      trackEvent("jobber_import_completed", {
        imported: result.imported,
        skipped: result.skipped,
        failed: result.failed,
      });
      setResultModal(result);
      setSelectedIds(new Set());
      setAllClients((prev) =>
        prev.map((c) =>
          selectedIds.has(c.jobberId) ? { ...c, alreadyImported: true } : c
        )
      );
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    } catch (e) {
    } finally {
      setImporting(false);
    }
  };

  const allSelected = selectableClients.length > 0 && selectedIds.size === selectableClients.length;

  const renderItem = ({ item }: { item: JobberClient }) => {
    const isImported = item.alreadyImported;
    const isSelected = selectedIds.has(item.jobberId);

    return (
      <Pressable
        testID={`jobber-client-${item.jobberId}`}
        onPress={() => {
          if (!isImported) toggleSelect(item.jobberId);
        }}
        disabled={isImported}
        style={({ pressed }) => [
          styles.clientRow,
          {
            backgroundColor: isSelected ? `${theme.primary}10` : theme.cardBackground,
            borderColor: isSelected ? theme.primary : theme.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <View style={styles.checkboxArea}>
          {isImported ? (
            <View
              style={[
                styles.importedBadge,
                { backgroundColor: `${theme.success}15` },
              ]}
            >
              <Feather name="check-circle" size={16} color={theme.success} />
            </View>
          ) : (
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: isSelected ? theme.primary : theme.border,
                  backgroundColor: isSelected ? theme.primary : "transparent",
                },
              ]}
            >
              {isSelected ? (
                <Feather name="check" size={14} color="#FFFFFF" />
              ) : null}
            </View>
          )}
        </View>
        <View style={styles.clientInfo}>
          <View style={styles.clientNameRow}>
            <ThemedText type="subtitle" style={{ flex: 1 }}>
              {item.firstName} {item.lastName}
            </ThemedText>
            {isImported ? (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: `${theme.success}15` },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{ color: theme.success, fontWeight: "600" }}
                >
                  Already Imported
                </ThemedText>
              </View>
            ) : null}
          </View>
          {item.email ? (
            <View style={styles.detailRow}>
              <Feather
                name="mail"
                size={13}
                color={theme.textSecondary}
                style={styles.detailIcon}
              />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {item.email}
              </ThemedText>
            </View>
          ) : null}
          {item.phone ? (
            <View style={styles.detailRow}>
              <Feather
                name="phone"
                size={13}
                color={theme.textSecondary}
                style={styles.detailIcon}
              />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {item.phone}
              </ThemedText>
            </View>
          ) : null}
          {item.address ? (
            <View style={styles.detailRow}>
              <Feather
                name="map-pin"
                size={13}
                color={theme.textSecondary}
                style={styles.detailIcon}
              />
              <ThemedText
                type="caption"
                style={{ color: theme.textSecondary, flex: 1 }}
                numberOfLines={1}
              >
                {item.address}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerArea}>
      <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
        Select clients from Jobber to import into QuotePro. Already imported clients are marked.
      </ThemedText>
      {selectableClients.length > 0 ? (
        <Pressable
          testID="button-select-all"
          onPress={toggleSelectAll}
          style={[styles.selectAllRow, { borderColor: theme.border }]}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: allSelected ? theme.primary : theme.border,
                backgroundColor: allSelected ? theme.primary : "transparent",
              },
            ]}
          >
            {allSelected ? (
              <Feather name="check" size={14} color="#FFFFFF" />
            ) : null}
          </View>
          <ThemedText type="subtitle" style={{ marginLeft: Spacing.md }}>
            {allSelected ? "Deselect All" : "Select All"}
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, marginLeft: "auto" }}
          >
            {selectableClients.length} available
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );

  const renderFooter = () => (
    <View style={{ paddingVertical: Spacing.lg }}>
      {hasMore ? (
        <Pressable
          testID="button-load-more"
          onPress={handleLoadMore}
          disabled={loadingMore}
          style={({ pressed }) => [
            styles.loadMoreButton,
            { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          {loadingMore ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <ThemedText type="subtitle" style={{ color: theme.primary, textAlign: "center" }}>
              Load More
            </ThemedText>
          )}
        </Pressable>
      ) : null}
    </View>
  );

  const renderEmpty = () =>
    isLoading ? (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <ThemedText
          type="small"
          style={{ color: theme.textSecondary, marginTop: Spacing.md }}
        >
          Loading Jobber clients...
        </ThemedText>
      </View>
    ) : (
      <View style={styles.centerContainer}>
        <Feather name="users" size={48} color={theme.textMuted} />
        <ThemedText
          type="h4"
          style={{ marginTop: Spacing.lg, textAlign: "center" }}
        >
          No Clients Found
        </ThemedText>
        <ThemedText
          type="small"
          style={{
            color: theme.textSecondary,
            marginTop: Spacing.sm,
            textAlign: "center",
          }}
        >
          No clients were found in your Jobber account.
        </ThemedText>
      </View>
    );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        testID="jobber-clients-list"
        data={allClients}
        keyExtractor={(item) => item.jobberId}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={allClients.length > 0 ? renderFooter : undefined}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl + 100,
          },
          allClients.length === 0 ? styles.emptyContent : null,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      />

      {selectedIds.size > 0 ? (
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: theme.cardBackground,
              borderTopColor: theme.border,
              paddingBottom: insets.bottom + Spacing.md,
            },
          ]}
        >
          <Button
            testID="button-import-selected"
            onPress={handleImport}
            disabled={importing}
          >
            {importing
              ? "Importing..."
              : `Import Selected (${selectedIds.size})`}
          </Button>
        </View>
      ) : null}

      <Modal
        visible={resultModal !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setResultModal(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View
            style={[
              styles.resultCard,
              { backgroundColor: theme.cardBackground },
            ]}
          >
            <View style={styles.resultIconContainer}>
              <View
                style={[
                  styles.resultIconBg,
                  { backgroundColor: `${theme.success}15` },
                ]}
              >
                <Feather name="check-circle" size={32} color={theme.success} />
              </View>
            </View>
            <ThemedText type="h3" style={{ textAlign: "center", marginTop: Spacing.lg }}>
              Import Complete
            </ThemedText>
            <View style={styles.resultStats}>
              <View style={styles.resultStatRow}>
                <Feather name="user-plus" size={16} color={theme.success} />
                <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                  {resultModal?.imported ?? 0} imported
                </ThemedText>
              </View>
              {(resultModal?.skipped ?? 0) > 0 ? (
                <View style={styles.resultStatRow}>
                  <Feather name="skip-forward" size={16} color={theme.warning} />
                  <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                    {resultModal?.skipped} skipped (duplicates)
                  </ThemedText>
                </View>
              ) : null}
              {(resultModal?.failed ?? 0) > 0 ? (
                <View style={styles.resultStatRow}>
                  <Feather name="alert-circle" size={16} color={theme.error} />
                  <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                    {resultModal?.failed} failed
                  </ThemedText>
                </View>
              ) : null}
            </View>
            <Button
              testID="button-dismiss-results"
              onPress={() => setResultModal(null)}
              style={{ marginTop: Spacing.xl }}
            >
              Done
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  emptyContent: {
    flexGrow: 1,
  },
  headerArea: {
    marginBottom: Spacing.md,
  },
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  checkboxArea: {
    marginRight: Spacing.md,
    paddingTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  importedBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  clientInfo: {
    flex: 1,
  },
  clientNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  detailIcon: {
    marginRight: Spacing.xs,
  },
  loadMoreButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  resultCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: BorderRadius.lg,
    padding: Spacing["2xl"],
  },
  resultIconContainer: {
    alignItems: "center",
  },
  resultIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  resultStats: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  resultStatRow: {
    flexDirection: "row",
    alignItems: "center",
  },
});
