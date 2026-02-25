import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ProGate } from "@/components/ProGate";

type TaskType =
  | "QUOTE_FOLLOWUP"
  | "ABANDONED_RECOVERY"
  | "REBOOK_NUDGE"
  | "REVIEW_REQUEST"
  | "REFERRAL_ASK"
  | "UPSELL_DEEP_CLEAN"
  | "REACTIVATION";

const TASK_META: Record<TaskType, { icon: keyof typeof Feather.glyphMap; color: string; label: string }> = {
  QUOTE_FOLLOWUP: { icon: "message-circle", color: "#007AFF", label: "Quote Follow-Up" },
  ABANDONED_RECOVERY: { icon: "alert-circle", color: "#EF4444", label: "Quote Recovery" },
  REBOOK_NUDGE: { icon: "repeat", color: "#F97316", label: "Rebook Nudge" },
  REVIEW_REQUEST: { icon: "star", color: "#8B5CF6", label: "Review Request" },
  REFERRAL_ASK: { icon: "gift", color: "#2F7BFF", label: "Referral Ask" },
  UPSELL_DEEP_CLEAN: { icon: "trending-up", color: "#8B5CF6", label: "Deep Clean Upsell" },
  REACTIVATION: { icon: "refresh-cw", color: "#F59E0B", label: "Reactivation" },
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "QUOTE_FOLLOWUP", label: "Follow Up" },
  { key: "REVIEW_REQUEST", label: "Reviews" },
  { key: "REBOOK_NUDGE", label: "Rebook" },
  { key: "UPSELL_DEEP_CLEAN", label: "Upsell" },
];

function useDesignTokens() {
  const { theme, isDark } = useTheme();
  return useMemo(() => ({
    surfacePrimary: theme.surface0,
    surfaceSecondary: theme.surface1,
    borderPrimary: theme.border,
    borderSecondary: theme.divider,
    textPrimary: theme.text,
    textSecondary: theme.textSecondary,
    textMuted: theme.textMuted,
    accent: theme.primary,
    accentSoft: theme.primarySoft,
    chipBg: isDark ? theme.divider : "rgba(0,0,0,0.03)",
    chipBorder: theme.border,
    chipActiveBg: isDark ? "rgba(47, 123, 255, 0.18)" : "rgba(0,122,255,0.1)",
    chipActiveBorder: isDark ? "rgba(47, 123, 255, 0.35)" : "rgba(0,122,255,0.25)",
    actionBg: isDark ? theme.divider : "rgba(0,0,0,0.04)",
  }), [theme, isDark]);
}

function getPriorityBadge(priority: number): { label: string; color: string } {
  if (priority >= 70) return { label: "High", color: "#EF4444" };
  if (priority >= 40) return { label: "Med", color: "#F59E0B" };
  return { label: "Low", color: "#2F7BFF" };
}

function formatDueDate(dateStr?: string): string {
  if (!dateStr) return "";
  const due = new Date(dateStr);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 0) {
    const overdue = Math.abs(diffHours);
    if (overdue < 24) return `${overdue}h overdue`;
    return `${Math.round(overdue / 24)}d overdue`;
  }
  if (diffHours < 24) return `Due in ${diffHours}h`;
  return `Due in ${Math.round(diffHours / 24)}d`;
}

function EscalationDots({ stage, color }: { stage: number; color: string }) {
  return (
    <View style={styles.dotsRow}>
      {[1, 2, 3].map((s) => (
        <View
          key={s}
          style={[
            styles.dot,
            { backgroundColor: s <= stage ? color : "rgba(128,128,128,0.25)" },
          ]}
        />
      ))}
    </View>
  );
}

function TaskCard({ task, onAction }: { task: any; onAction: (id: number, type: string, payload?: any) => void }) {
  const dt = useDesignTokens();
  const meta = TASK_META[task.type as TaskType] || TASK_META.QUOTE_FOLLOWUP;
  const priority = getPriorityBadge(task.priority || 50);

  return (
    <View style={[styles.taskCard, { backgroundColor: dt.surfacePrimary, borderColor: dt.borderSecondary }]}>
      <View style={styles.taskRow}>
        <View style={[styles.typeIconWrap, { backgroundColor: meta.color + "15" }]}>
          <Feather name={meta.icon} size={18} color={meta.color} />
        </View>

        <View style={styles.taskCenter}>
          <ThemedText type="subtitle" numberOfLines={1} style={{ fontWeight: "600" }}>
            {task.customerName || "Customer"}
          </ThemedText>
          <ThemedText type="caption" style={{ color: meta.color, fontWeight: "500", marginTop: 2 }}>
            {meta.label}
          </ThemedText>
          {task.messagePreview ? (
            <ThemedText type="small" numberOfLines={1} style={{ color: dt.textSecondary, marginTop: 2 }}>
              {task.messagePreview}
            </ThemedText>
          ) : null}
          {task.scheduledFor ? (
            <ThemedText type="caption" style={{ color: dt.textMuted, marginTop: 2 }}>
              {formatDueDate(task.scheduledFor)}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.taskRight}>
          <View style={[styles.priorityBadge, { backgroundColor: priority.color + "15" }]}>
            <ThemedText type="caption" style={{ color: priority.color, fontWeight: "700", fontSize: 10 }}>
              {priority.label}
            </ThemedText>
          </View>
          <EscalationDots stage={task.escalationStage || 1} color={meta.color} />
        </View>
      </View>

      <View style={[styles.actionsRow, { borderTopColor: dt.borderSecondary }]}>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: dt.actionBg }]}
          onPress={() => onAction(task.id, "sms")}
          testID={`action-sms-${task.id}`}
        >
          <Feather name="phone" size={14} color={dt.accent} />
          <ThemedText type="caption" style={{ color: dt.textPrimary, marginLeft: 4, fontWeight: "500" }}>SMS</ThemedText>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, { backgroundColor: dt.actionBg }]}
          onPress={() => onAction(task.id, "email")}
          testID={`action-email-${task.id}`}
        >
          <Feather name="mail" size={14} color={dt.accent} />
          <ThemedText type="caption" style={{ color: dt.textPrimary, marginLeft: 4, fontWeight: "500" }}>Email</ThemedText>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, { backgroundColor: dt.actionBg }]}
          onPress={() => onAction(task.id, "snooze")}
          testID={`action-snooze-${task.id}`}
        >
          <Feather name="clock" size={14} color="#F59E0B" />
          <ThemedText type="caption" style={{ color: dt.textPrimary, marginLeft: 4, fontWeight: "500" }}>Snooze</ThemedText>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, { backgroundColor: dt.actionBg }]}
          onPress={() => onAction(task.id, "done")}
          testID={`action-done-${task.id}`}
        >
          <Feather name="check" size={14} color="#16A34A" />
          <ThemedText type="caption" style={{ color: dt.textPrimary, marginLeft: 4, fontWeight: "500" }}>Done</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyState() {
  const dt = useDesignTokens();
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconWrap, { backgroundColor: dt.accentSoft }]}>
        <Feather name="check-circle" size={32} color={dt.accent} />
      </View>
      <ThemedText type="h4" style={{ marginTop: Spacing.lg, textAlign: "center" }}>
        All caught up!
      </ThemedText>
      <ThemedText type="body" style={{ color: dt.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
        No growth tasks right now. Your automation engine will queue new tasks as opportunities arise.
      </ThemedText>
    </View>
  );
}

export default function TasksQueueScreen() {
  const insets = useSafeAreaInsets();
  const dt = useDesignTokens();
  const queryClient = useQueryClient();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: tasks = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/growth-tasks"],
  });

  const filteredTasks = useMemo(() => {
    if (activeFilter === "all") return tasks;
    return tasks.filter((t: any) => t.type === activeFilter);
  }, [tasks, activeFilter]);

  const handleAction = useCallback(async (id: number, type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (type === "sms" || type === "email") {
        await apiRequest("POST", `/api/growth-tasks/${id}/action`, {
          action: "sent",
          channel: type,
        });
      } else if (type === "snooze") {
        await apiRequest("POST", `/api/growth-tasks/${id}/snooze`, {
          hours: 24,
        });
      } else if (type === "done") {
        await apiRequest("POST", `/api/growth-tasks/${id}/action`, {
          action: "completed",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/growth-tasks"] });
    } catch (e) {
      console.error("Task action failed:", e);
    }
  }, [queryClient]);

  const renderItem = useCallback(({ item }: { item: any }) => (
    <TaskCard task={item} onAction={handleAction} />
  ), [handleAction]);

  const keyExtractor = useCallback((item: any) => String(item.id), []);

  return (
    <ProGate featureName="Growth Tasks">
    <View style={[styles.container, { backgroundColor: dt.surfaceSecondary }]}>
      <View style={{ paddingTop: Spacing.xl }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveFilter(tab.key);
                }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? dt.chipActiveBg : dt.chipBg,
                    borderColor: isActive ? dt.chipActiveBorder : dt.chipBorder,
                  },
                ]}
                testID={`filter-${tab.key}`}
              >
                <ThemedText
                  type="caption"
                  style={{
                    color: isActive ? dt.accent : dt.textSecondary,
                    fontWeight: isActive ? "700" : "500",
                  }}
                >
                  {tab.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={dt.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing.xl },
            ...(useMaxWidth ? [{ maxWidth: 560, alignSelf: "center" as const, width: "100%" as const }] : []),
          ]}
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
    </ProGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterRow: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  taskCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  taskRow: {
    flexDirection: "row",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  typeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  taskCenter: {
    flex: 1,
    justifyContent: "center",
  },
  taskRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  actionsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
    paddingTop: Spacing["5xl"],
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
