import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/context/SubscriptionContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { AutopilotUpsellModal } from "@/components/AutopilotUpsellModal";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending_quote: { label: "Quoting", color: "#f59e0b", icon: "edit-3" },
  pending_response: { label: "Awaiting Reply", color: "#3b82f6", icon: "mail" },
  pending_contract: { label: "Contract Sent", color: "#8b5cf6", icon: "file-text" },
  pending_review: { label: "Review Pending", color: "#10b981", icon: "star" },
  complete: { label: "Complete", color: "#6b7280", icon: "check-circle" },
  paused: { label: "Paused", color: "#ef4444", icon: "pause" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "#6b7280", icon: "circle" };
  return (
    <View style={[styles.badge, { backgroundColor: cfg.color + "18", borderColor: cfg.color + "40" }]}>
      <Feather name={cfg.icon as any} size={11} color={cfg.color} />
      <ThemedText style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</ThemedText>
    </View>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  const { theme } = useTheme();
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon as any} size={16} color={color} />
      </View>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
    </Card>
  );
}

function EnrollModal({ visible, onClose, onEnroll }: { visible: boolean; onClose: () => void; onEnroll: (leadId: string) => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { data: leads = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/intake-requests"],
    enabled: visible,
  });

  const uncontacted = leads.filter((l: any) => l.status === "pending" || l.status === "needs_review");

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.modalHeader}>
          <ThemedText style={styles.modalTitle}>Enroll a Lead</ThemedText>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>
        <ThemedText style={[styles.modalSubhead, { color: theme.textSecondary }]}>
          Select an uncontacted lead to enroll in Autopilot
        </ThemedText>
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={theme.primary} />
        ) : uncontacted.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={32} color={theme.textSecondary} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              No uncontacted leads available
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={uncontacted}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onEnroll(item.id);
                }}
                style={({ pressed }) => [
                  styles.leadRow,
                  { backgroundColor: theme.backgroundDefault, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                ]}
                testID={`button-enroll-${item.id}`}
              >
                <View style={[styles.leadAvatar, { backgroundColor: theme.primary + "18" }]}>
                  <ThemedText style={[styles.leadAvatarText, { color: theme.primary }]}>
                    {(item.customerName || item.customer_name || "?")[0].toUpperCase()}
                  </ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.leadName}>{item.customerName || item.customer_name || "Unknown"}</ThemedText>
                  <ThemedText style={[styles.leadEmail, { color: theme.textSecondary }]}>
                    {item.customerEmail || item.customer_email || "No email"}
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={16} color={theme.textSecondary} />
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

export default function AutopilotScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  const { isPro, isGrowth, isStarter, tier } = useSubscription();
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [upsellVisible, setUpsellVisible] = useState(false);

  const hasAccess = isPro || isGrowth;

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/autopilot/stats"],
    enabled: hasAccess,
  });

  const { data: jobs = [], isLoading: jobsLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/autopilot/jobs"],
    enabled: hasAccess,
  });

  const pauseMutation = useMutation({
    mutationFn: (jobId: string) => apiRequest("POST", `/api/autopilot/jobs/${jobId}/pause`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/autopilot/jobs"] }),
  });

  const resumeMutation = useMutation({
    mutationFn: (jobId: string) => apiRequest("POST", `/api/autopilot/jobs/${jobId}/resume`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/autopilot/jobs"] }),
  });

  const enrollMutation = useMutation({
    mutationFn: (leadId: string) => apiRequest("POST", "/api/autopilot/enroll", { leadId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/autopilot/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/autopilot/stats"] });
      setEnrollModalVisible(false);
    },
  });

  const handleEnrollPress = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!hasAccess) { setUpsellVisible(true); return; }
    setEnrollModalVisible(true);
  }, [hasAccess]);

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  if (!hasAccess) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: headerHeight + Spacing.xl }]}>
        <AutopilotUpsellModal
          visible={true}
          onClose={() => {}}
          embedded
          tier={tier}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={jobsLoading} onRefresh={refetch} />}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.md,
          paddingHorizontal: Spacing.md,
          paddingBottom: insets.bottom + 100,
          gap: Spacing.sm,
        }}
        ListHeaderComponent={() => (
          <View style={{ gap: Spacing.md, marginBottom: Spacing.md }}>
            <View style={styles.statsRow}>
              <StatCard label="Enrolled" value={stats?.enrolledThisMonth || 0} icon="user-plus" color="#3b82f6" />
              <StatCard label="Quoted" value={stats?.quotesSent || 0} icon="file-text" color="#f59e0b" />
              <StatCard label="Follow-ups" value={stats?.followUpsFired || 0} icon="send" color="#8b5cf6" />
              <StatCard label="Reviews" value={stats?.reviewsRequested || 0} icon="star" color="#10b981" />
            </View>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Active Jobs</ThemedText>
              <Pressable
                onPress={handleEnrollPress}
                style={({ pressed }) => [styles.enrollBtn, { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 }]}
                testID="button-enroll-lead"
              >
                <Feather name="plus" size={15} color="#fff" />
                <ThemedText style={styles.enrollBtnText}>Enroll a Lead</ThemedText>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          !jobsLoading ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.primary + "12" }]}>
                <Feather name="zap" size={28} color={theme.primary} />
              </View>
              <ThemedText style={styles.emptyTitle}>No active jobs</ThemedText>
              <ThemedText style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                Enroll a lead and Autopilot will handle quoting, follow-up, and reviews automatically.
              </ThemedText>
              <Pressable
                onPress={handleEnrollPress}
                style={({ pressed }) => [styles.enrollBtn, { backgroundColor: theme.primary, marginTop: Spacing.lg, opacity: pressed ? 0.8 : 1 }]}
              >
                <Feather name="plus" size={15} color="#fff" />
                <ThemedText style={styles.enrollBtnText}>Enroll your first lead</ThemedText>
              </Pressable>
            </View>
          ) : null
        )}
        renderItem={({ item }) => {
          const isPaused = item.status === "paused";
          const isComplete = item.status === "complete";
          return (
            <Card style={[styles.jobCard, isComplete && { opacity: 0.6 }]}>
              <View style={styles.jobHeader}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.jobName} numberOfLines={1}>
                    {(item.lead_name || "Unknown Lead").trim() || "Unknown Lead"}
                  </ThemedText>
                  <ThemedText style={[styles.jobEmail, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.lead_email || "No email"}
                  </ThemedText>
                </View>
                <StatusBadge status={item.status} />
              </View>
              <View style={[styles.jobMeta, { borderTopColor: theme.border }]}>
                <View style={styles.metaItem}>
                  <ThemedText style={[styles.metaLabel, { color: theme.textSecondary }]}>Last action</ThemedText>
                  <ThemedText style={styles.metaValue}>{formatDate(item.last_action_at)}</ThemedText>
                </View>
                <View style={styles.metaItem}>
                  <ThemedText style={[styles.metaLabel, { color: theme.textSecondary }]}>Next action</ThemedText>
                  <ThemedText style={styles.metaValue}>{formatDate(item.next_action_at)}</ThemedText>
                </View>
                {!isComplete && (
                  <Pressable
                    onPress={() => {
                      if (Platform.OS !== "web") Haptics.selectionAsync();
                      isPaused ? resumeMutation.mutate(item.id) : pauseMutation.mutate(item.id);
                    }}
                    style={({ pressed }) => [
                      styles.pauseBtn,
                      {
                        borderColor: isPaused ? theme.primary : theme.border,
                        backgroundColor: isPaused ? theme.primary + "12" : "transparent",
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                    testID={`button-${isPaused ? "resume" : "pause"}-${item.id}`}
                  >
                    <Feather name={isPaused ? "play" : "pause"} size={12} color={isPaused ? theme.primary : theme.textSecondary} />
                    <ThemedText style={[styles.pauseBtnText, { color: isPaused ? theme.primary : theme.textSecondary }]}>
                      {isPaused ? "Resume" : "Pause"}
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </Card>
          );
        }}
      />
      <EnrollModal
        visible={enrollModalVisible}
        onClose={() => setEnrollModalVisible(false)}
        onEnroll={(leadId) => enrollMutation.mutate(leadId)}
      />
      <AutopilotUpsellModal
        visible={upsellVisible}
        onClose={() => setUpsellVisible(false)}
        tier={tier}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsRow: { flexDirection: "row", gap: Spacing.sm },
  statCard: { flex: 1, alignItems: "center", padding: Spacing.sm, gap: 4 },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 10, fontWeight: "500", textAlign: "center" },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  enrollBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  enrollBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  jobCard: { padding: Spacing.md, gap: 0 },
  jobHeader: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm, marginBottom: Spacing.sm },
  jobName: { fontSize: 15, fontWeight: "700" },
  jobEmail: { fontSize: 12, marginTop: 2 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  jobMeta: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, flexWrap: "wrap" },
  metaItem: { flex: 1, minWidth: 100 },
  metaLabel: { fontSize: 10, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  metaValue: { fontSize: 12, fontWeight: "600" },
  pauseBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
  pauseBtnText: { fontSize: 12, fontWeight: "600" },
  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: Spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptySubtext: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.md, marginBottom: Spacing.xs },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  closeBtn: { padding: 8 },
  modalSubhead: { fontSize: 14, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  leadRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1 },
  leadAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  leadAvatarText: { fontSize: 16, fontWeight: "700" },
  leadName: { fontSize: 15, fontWeight: "600" },
  leadEmail: { fontSize: 12, marginTop: 2 },
  emptyText: { fontSize: 14, textAlign: "center", marginTop: Spacing.md },
});
