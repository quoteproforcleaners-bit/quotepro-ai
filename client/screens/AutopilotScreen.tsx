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
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/context/SubscriptionContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { AutopilotUpsellModal } from "@/components/AutopilotUpsellModal";
import { HeroCard } from "@/components/HeroCard";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { AppleButton } from "@/components/AppleButton";
import { ListGroup } from "@/components/ListRow";
import { IOSTypography, Radius } from "@/styles/tokens";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending_quote: { label: "Quoting", color: "#FF9500", icon: "edit-3" },
  pending_response: { label: "Awaiting Reply", color: "#007AFF", icon: "mail" },
  pending_contract: { label: "Contract Sent", color: "#AF52DE", icon: "file-text" },
  pending_review: { label: "Review Pending", color: "#34C759", icon: "star" },
  complete: { label: "Complete", color: "#8E8E93", icon: "check-circle" },
  paused: { label: "Paused", color: "#FF3B30", icon: "pause" },
};

function EnrollModal({ visible, onClose, onEnroll }: {
  visible: boolean;
  onClose: () => void;
  onEnroll: (leadId: string) => void;
}) {
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

function JobRow({ item, onPause, onResume, isPausing, isResuming }: {
  item: any;
  onPause: () => void;
  onResume: () => void;
  isPausing: boolean;
  isResuming: boolean;
}) {
  const { theme, isDark } = useTheme();
  const cfg = STATUS_CONFIG[item.status] || { label: item.status, color: "#8E8E93", icon: "circle" };
  const isPaused = item.status === "paused";
  const isComplete = item.status === "complete";

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  return (
    <View
      style={[
        styles.jobRow,
        {
          backgroundColor: isDark ? theme.surface1 : theme.surface0,
          borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)",
          opacity: isComplete ? 0.55 : 1,
        },
      ]}
    >
      <View style={styles.jobTop}>
        <View style={[styles.jobAvatar, { backgroundColor: cfg.color + "1A" }]}>
          <ThemedText style={[styles.jobAvatarText, { color: cfg.color }]}>
            {(item.lead_name || "?")[0].toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.jobInfo}>
          <ThemedText style={[styles.jobName, { color: theme.colorTextPrimary }]} numberOfLines={1}>
            {(item.lead_name || "Unknown Lead").trim() || "Unknown Lead"}
          </ThemedText>
          <ThemedText style={[styles.jobEmail, { color: theme.colorTextMuted }]} numberOfLines={1}>
            {item.lead_email || "No email"}
          </ThemedText>
        </View>
        <StatusPill label={cfg.label} color={cfg.color} icon={cfg.icon as any} />
      </View>

      <View style={[styles.jobMeta, { borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}>
        <View style={styles.metaItem}>
          <ThemedText style={[styles.metaLabel, { color: theme.colorTextMuted }]}>Last action</ThemedText>
          <ThemedText style={[styles.metaValue, { color: theme.colorTextPrimary }]}>{formatDate(item.last_action_at)}</ThemedText>
        </View>
        <View style={styles.metaItem}>
          <ThemedText style={[styles.metaLabel, { color: theme.colorTextMuted }]}>Next action</ThemedText>
          <ThemedText style={[styles.metaValue, { color: theme.colorTextPrimary }]}>{formatDate(item.next_action_at)}</ThemedText>
        </View>
        {!isComplete ? (
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync();
              isPaused ? onResume() : onPause();
            }}
            style={({ pressed }) => [
              styles.pauseBtn,
              {
                borderColor: isPaused ? "#007AFF40" : (isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)"),
                backgroundColor: isPaused ? "#007AFF14" : "transparent",
                opacity: pressed ? 0.65 : 1,
              },
            ]}
            testID={`button-${isPaused ? "resume" : "pause"}-${item.id}`}
          >
            <Feather
              name={isPaused ? "play" : "pause"}
              size={11}
              color={isPaused ? "#007AFF" : theme.textSecondary}
            />
            <ThemedText style={[styles.pauseBtnText, { color: isPaused ? "#007AFF" : theme.textSecondary }]}>
              {isPaused ? "Resume" : "Pause"}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export default function AutopilotScreen() {
  const { theme, isDark } = useTheme();
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

  const heroBg: [string, string, string] = isDark
    ? ["#1A2744", "#0E1620", "#060C14"]
    : ["#0A84FF", "#007AFF", "#0055CC"];

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={jobsLoading} onRefresh={refetch} tintColor={theme.primary} />}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.md,
          paddingHorizontal: Spacing.lg,
          paddingBottom: insets.bottom + 120,
          gap: Spacing.md,
        }}
        ListHeaderComponent={() => (
          <View style={{ gap: Spacing.md }}>
            <HeroCard colors={heroBg}>
              <View style={styles.heroContent}>
                <View style={styles.heroLeft}>
                  <View style={styles.heroIconWrap}>
                    <Feather name="zap" size={20} color="rgba(255,255,255,0.95)" />
                  </View>
                  <View>
                    <ThemedText style={styles.heroTitle}>Autopilot Active</ThemedText>
                    <ThemedText style={styles.heroSub}>
                      {jobs.length > 0
                        ? `${jobs.filter((j) => j.status !== "complete" && j.status !== "paused").length} leads being nurtured`
                        : "Enroll a lead to start"}
                    </ThemedText>
                  </View>
                </View>
                <AppleButton
                  label="Enroll"
                  onPress={handleEnrollPress}
                  icon="plus"
                  variant="primary"
                  size="sm"
                  color="rgba(255,255,255,0.22)"
                  textStyle={{ color: "#FFFFFF" }}
                  style={{ borderWidth: 1, borderColor: "rgba(255,255,255,0.30)" }}
                  testID="button-enroll-lead"
                />
              </View>
            </HeroCard>

            <View style={styles.metricsRow}>
              <MetricCard
                value={stats?.enrolledThisMonth ?? 0}
                label="Enrolled"
                icon="user-plus"
                color="#007AFF"
              />
              <MetricCard
                value={stats?.quotesSent ?? 0}
                label="Quoted"
                icon="file-text"
                color="#FF9500"
              />
              <MetricCard
                value={stats?.followUpsFired ?? 0}
                label="Follow-ups"
                icon="send"
                color="#AF52DE"
              />
              <MetricCard
                value={stats?.reviewsRequested ?? 0}
                label="Reviews"
                icon="star"
                color="#34C759"
              />
            </View>

            {jobs.length > 0 ? (
              <View style={styles.sectionRow}>
                <ThemedText style={[styles.sectionTitle, { color: theme.colorTextSecondary }]}>
                  ACTIVE JOBS
                </ThemedText>
                <ThemedText style={[styles.sectionCount, { color: theme.colorTextMuted }]}>
                  {jobs.length}
                </ThemedText>
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={() => (
          !jobsLoading ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: "#007AFF14" }]}>
                <Feather name="zap" size={28} color="#007AFF" />
              </View>
              <ThemedText style={[styles.emptyTitle, { color: theme.colorTextPrimary }]}>No active jobs</ThemedText>
              <ThemedText style={[styles.emptySubtext, { color: theme.colorTextSecondary }]}>
                Enroll a lead and Autopilot will handle quoting, follow-up, and reviews automatically.
              </ThemedText>
              <AppleButton
                label="Enroll your first lead"
                onPress={handleEnrollPress}
                icon="plus"
                variant="primary"
                size="md"
                color="#007AFF"
                style={{ marginTop: Spacing.md, alignSelf: "center" }}
              />
            </View>
          ) : null
        )}
        renderItem={({ item }) => (
          <JobRow
            item={item}
            onPause={() => pauseMutation.mutate(item.id)}
            onResume={() => resumeMutation.mutate(item.id)}
            isPausing={pauseMutation.isPending}
            isResuming={resumeMutation.isPending}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
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

  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 20,
  },
  heroSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 17,
    marginTop: 1,
  },

  metricsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: "500",
  },

  jobRow: {
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  jobTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  jobAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  jobAvatarText: {
    fontSize: 16,
    fontWeight: "700",
  },
  jobInfo: {
    flex: 1,
  },
  jobName: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 19,
  },
  jobEmail: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  jobMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexWrap: "wrap",
  },
  metaItem: {
    flex: 1,
    minWidth: 100,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  pauseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  pauseBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
  },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  closeBtn: { padding: 8 },
  modalSubhead: { fontSize: 14, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  leadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  leadAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  leadAvatarText: { fontSize: 16, fontWeight: "700" },
  leadName: { fontSize: 15, fontWeight: "600" },
  leadEmail: { fontSize: 12, marginTop: 2 },
  emptyText: { fontSize: 14, textAlign: "center", marginTop: Spacing.md },
});
