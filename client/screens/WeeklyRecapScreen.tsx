import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { StatCard } from "@/components/StatCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest, queryClient } from "@/lib/query-client";
import { trackEvent } from "@/lib/analytics";

interface WeeklyRecapData {
  quotesSent: number;
  quotesAccepted: number;
  quotesDeclined: number;
  quotesExpired: number;
  closeRate: number;
  revenueWon: number;
  biggestWin: {
    id: string;
    total: number;
    customerFirstName: string;
    customerLastName: string;
  } | null;
  mostAtRiskOpen: {
    id: string;
    total: number;
    sentAt: string;
    customerFirstName: string;
    customerLastName: string;
  } | null;
}

interface Preferences {
  weeklyGoal?: string;
  weeklyGoalTarget?: number;
  [key: string]: any;
}

interface StreakData {
  currentStreak?: number;
  weekStreak?: number;
  [key: string]: any;
}

function useDesignTokens() {
  const { theme, isDark } = useTheme();
  return useMemo(
    () => ({
      surfacePrimary: theme.cardBackground,
      surfaceSecondary: isDark
        ? "rgba(255,255,255,0.04)"
        : "rgba(0,0,0,0.02)",
      borderPrimary: isDark
        ? "rgba(255,255,255,0.12)"
        : "rgba(0,0,0,0.08)",
      textPrimary: theme.text,
      textSecondary: theme.textSecondary,
      textMuted: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)",
      accent: theme.primary,
      accentSoft: isDark
        ? "rgba(100,160,255,0.12)"
        : "rgba(0,122,255,0.08)",
    }),
    [theme, isDark],
  );
}

function getWeekRange(weekOffset: number): { start: Date; end: Date; label: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatDate = (d: Date) => {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  return {
    start: monday,
    end: sunday,
    label: `Week of ${formatDate(monday)} - ${formatDate(sunday)}`,
  };
}

function getDaysAgo(dateStr: string): number {
  const date = new Date(dateStr).getTime();
  return Math.max(0, Math.round((Date.now() - date) / (1000 * 60 * 60 * 24)));
}

const GOAL_OPTIONS = [
  { label: "Send 5 quotes", goal: "send_quotes", target: 5 },
  { label: "Send 10 quotes", goal: "send_quotes", target: 10 },
  { label: "Send 15 quotes", goal: "send_quotes", target: 15 },
  { label: "Follow up daily", goal: "follow_up_daily", target: 7 },
];

export default function WeeklyRecapScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { theme } = useTheme();
  const dt = useDesignTokens();

  const [weekOffset, setWeekOffset] = useState(-1);
  const [refreshing, setRefreshing] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);

  const weekRange = useMemo(() => getWeekRange(weekOffset), [weekOffset]);

  useEffect(() => {
    trackEvent("weekly_recap_open");
  }, []);

  const {
    data: recap,
    refetch: refetchRecap,
    isLoading: recapLoading,
  } = useQuery<WeeklyRecapData>({
    queryKey: [`/api/weekly-recap?weekOffset=${weekOffset}`],
  });

  const { data: preferences, refetch: refetchPreferences } =
    useQuery<Preferences>({
      queryKey: ["/api/preferences"],
    });

  const { data: streaks } = useQuery<StreakData>({
    queryKey: ["/api/streaks"],
  });

  const saveGoalMutation = useMutation({
    mutationFn: async (params: { weeklyGoal: string; weeklyGoalTarget: number }) => {
      await apiRequest("PUT", "/api/preferences", params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchRecap(), refetchPreferences()]);
    setRefreshing(false);
  }, [refetchRecap, refetchPreferences]);

  const handleSelectGoal = (option: (typeof GOAL_OPTIONS)[number]) => {
    saveGoalMutation.mutate({
      weeklyGoal: option.goal,
      weeklyGoalTarget: option.target,
    });
    setGoalModalVisible(false);
  };

  const goalProgress = useMemo(() => {
    if (!preferences?.weeklyGoal || !preferences?.weeklyGoalTarget || !recap) {
      return null;
    }
    const target = preferences.weeklyGoalTarget;
    let current = 0;
    if (preferences.weeklyGoal === "send_quotes") {
      current = recap.quotesSent;
    } else if (preferences.weeklyGoal === "follow_up_daily") {
      current = streaks?.weekStreak ?? streaks?.currentStreak ?? 0;
    }
    return { current, target };
  }, [preferences, recap, streaks]);

  const goalLabel = useMemo(() => {
    if (!preferences?.weeklyGoal) return "";
    if (preferences.weeklyGoal === "send_quotes") {
      return `Send ${preferences.weeklyGoalTarget} quotes`;
    }
    return "Follow up daily";
  }, [preferences]);

  const isCurrentWeek = weekOffset === 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.weekNav}>
          <Pressable
            onPress={() => setWeekOffset((o) => o - 1)}
            hitSlop={12}
            testID="week-nav-left"
          >
            <Feather name="chevron-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h4" style={{ textAlign: "center", flex: 1 }}>
            {weekRange.label}
          </ThemedText>
          <Pressable
            onPress={() => {
              if (!isCurrentWeek) setWeekOffset((o) => o + 1);
            }}
            hitSlop={12}
            style={{ opacity: isCurrentWeek ? 0.3 : 1 }}
            testID="week-nav-right"
          >
            <Feather name="chevron-right" size={24} color={theme.text} />
          </Pressable>
        </View>

        {recapLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatCard
                title="Quotes Sent"
                value={(recap?.quotesSent ?? 0).toString()}
                icon="file-text"
                color={theme.primary}
              />
              <StatCard
                title="Accepted"
                value={(recap?.quotesAccepted ?? 0).toString()}
                icon="check-circle"
                color={theme.success}
              />
            </View>

            <View style={styles.statsRow}>
              <StatCard
                title="Declined / Expired"
                value={
                  (
                    (recap?.quotesDeclined ?? 0) +
                    (recap?.quotesExpired ?? 0)
                  ).toString()
                }
                icon="x-circle"
                color={theme.error}
              />
              <StatCard
                title="Close Rate"
                value={`${recap?.closeRate ?? 0}%`}
                icon="target"
                color={theme.primary}
              />
            </View>

            <View style={styles.statsRow}>
              <StatCard
                title="Revenue Won"
                value={`$${(recap?.revenueWon ?? 0).toLocaleString()}`}
                icon="dollar-sign"
                color={theme.success}
              />
              <StatCard
                title="Biggest Win"
                value={
                  recap?.biggestWin
                    ? `$${recap.biggestWin.total.toLocaleString()}`
                    : "--"
                }
                icon="award"
                color={theme.warning}
              />
            </View>

            {recap?.biggestWin ? (
              <View style={styles.biggestWinSubtext}>
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, textAlign: "center" }}
                >
                  {`Biggest win: ${recap.biggestWin.customerFirstName} ${recap.biggestWin.customerLastName}`}
                </ThemedText>
              </View>
            ) : null}

            {recap?.mostAtRiskOpen ? (
              <Card style={[styles.atRiskCard, { borderColor: theme.warning, borderWidth: 1.5 }]}>
                <View style={styles.atRiskHeader}>
                  <View
                    style={[
                      styles.atRiskIcon,
                      { backgroundColor: `${theme.warning}15` },
                    ]}
                  >
                    <Feather
                      name="alert-triangle"
                      size={18}
                      color={theme.warning}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="subtitle" style={{ fontWeight: "600" }}>
                      {"Most at risk"}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={{ color: theme.textSecondary, marginTop: 2 }}
                    >
                      {`${recap.mostAtRiskOpen.customerFirstName} ${recap.mostAtRiskOpen.customerLastName} - $${recap.mostAtRiskOpen.total.toLocaleString()} (sent ${getDaysAgo(recap.mostAtRiskOpen.sentAt)} days ago)`}
                    </ThemedText>
                  </View>
                </View>
                <Pressable
                  onPress={() => navigation.navigate("FollowUpQueue")}
                  style={[styles.followUpBtn, { backgroundColor: theme.warning }]}
                  testID="follow-up-btn"
                >
                  <Feather name="phone" size={14} color="#FFFFFF" />
                  <ThemedText
                    type="small"
                    style={{
                      color: "#FFFFFF",
                      fontWeight: "600",
                      marginLeft: Spacing.sm,
                    }}
                  >
                    {"Follow Up"}
                  </ThemedText>
                </Pressable>
              </Card>
            ) : null}

            <Card style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Feather name="flag" size={18} color={theme.primary} />
                <ThemedText
                  type="h4"
                  style={{ marginLeft: Spacing.sm, flex: 1 }}
                >
                  {"Weekly Goal"}
                </ThemedText>
                <Pressable
                  onPress={() => setGoalModalVisible(true)}
                  hitSlop={8}
                  testID="edit-goal-btn"
                >
                  <Feather
                    name="edit-2"
                    size={16}
                    color={theme.textSecondary}
                  />
                </Pressable>
              </View>

              {goalProgress ? (
                <View style={styles.goalContent}>
                  <ThemedText type="body" style={{ marginBottom: Spacing.sm }}>
                    {`${goalLabel} - ${goalProgress.current}/${goalProgress.target} completed`}
                  </ThemedText>
                  <View
                    style={[
                      styles.progressBarBg,
                      { backgroundColor: dt.surfaceSecondary },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          backgroundColor: theme.primary,
                          width: `${Math.min(100, (goalProgress.current / goalProgress.target) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText
                    type="caption"
                    style={{
                      color: theme.textSecondary,
                      marginTop: Spacing.xs,
                    }}
                  >
                    {goalProgress.current >= goalProgress.target
                      ? "Goal reached!"
                      : `${goalProgress.target - goalProgress.current} more to go`}
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.goalContent}>
                  <ThemedText
                    type="body"
                    style={{
                      color: theme.textSecondary,
                      marginBottom: Spacing.md,
                    }}
                  >
                    {"Set a weekly goal to stay on track and measure your progress."}
                  </ThemedText>
                  <Pressable
                    onPress={() => setGoalModalVisible(true)}
                    style={[
                      styles.setGoalBtn,
                      { backgroundColor: theme.primary },
                    ]}
                    testID="set-goal-btn"
                  >
                    <Feather name="target" size={16} color="#FFFFFF" />
                    <ThemedText
                      type="body"
                      style={{
                        color: "#FFFFFF",
                        fontWeight: "600",
                        marginLeft: Spacing.sm,
                      }}
                    >
                      {"Set a Goal"}
                    </ThemedText>
                  </Pressable>
                </View>
              )}
            </Card>
          </>
        )}
      </ScrollView>

      <Modal
        visible={goalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGoalModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setGoalModalVisible(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.cardBackground },
            ]}
          >
            <ThemedText type="h4" style={{ marginBottom: Spacing.lg }}>
              {"Choose a Goal"}
            </ThemedText>
            {GOAL_OPTIONS.map((option, idx) => (
              <Pressable
                key={idx}
                onPress={() => handleSelectGoal(option)}
                style={({ pressed }) => [
                  styles.goalOption,
                  {
                    backgroundColor: pressed
                      ? dt.accentSoft
                      : dt.surfaceSecondary,
                    borderColor: dt.borderPrimary,
                  },
                ]}
                testID={`goal-option-${idx}`}
              >
                <Feather
                  name={
                    option.goal === "send_quotes" ? "file-text" : "refresh-cw"
                  }
                  size={18}
                  color={theme.primary}
                />
                <ThemedText
                  type="body"
                  style={{ marginLeft: Spacing.md, flex: 1 }}
                >
                  {option.label}
                </ThemedText>
                {preferences?.weeklyGoal === option.goal &&
                preferences?.weeklyGoalTarget === option.target ? (
                  <Feather
                    name="check"
                    size={18}
                    color={theme.success}
                  />
                ) : null}
              </Pressable>
            ))}
            <Pressable
              onPress={() => setGoalModalVisible(false)}
              style={[styles.cancelBtn]}
              testID="goal-cancel-btn"
            >
              <ThemedText
                type="body"
                style={{ color: theme.textSecondary, textAlign: "center" }}
              >
                {"Cancel"}
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
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
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  loadingContainer: {
    paddingVertical: Spacing["5xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  biggestWinSubtext: {
    marginBottom: Spacing.lg,
    marginTop: Spacing.xs,
  },
  atRiskCard: {
    marginBottom: Spacing.lg,
  },
  atRiskHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  atRiskIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  followUpBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
    alignSelf: "flex-start",
  },
  goalCard: {
    marginBottom: Spacing.lg,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  goalContent: {},
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  setGoalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  goalOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  cancelBtn: {
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
});
