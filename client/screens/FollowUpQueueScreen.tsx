import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Linking,
  Modal,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as SMS from "expo-sms";
import * as MailComposer from "expo-mail-composer";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { MomentumToast } from "@/components/MomentumToast";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";
import { trackEvent } from "@/lib/analytics";
import { ProGate } from "@/components/ProGate";

interface FollowUpItem {
  id: number;
  total: number;
  status: string;
  sentAt: string | null;
  createdAt: string;
  lastContactAt: string | null;
  customerId: number | null;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  lastTouchedAt: string | null;
  snoozedUntil: string | null;
}

type FilterTab = "overdue" | "due_today" | "upcoming";

function getDaysSince(dateStr: string | null, fallback: string): number {
  const date = new Date(dateStr || fallback).getTime();
  return Math.max(0, Math.floor((Date.now() - date) / (1000 * 60 * 60 * 24)));
}

function getRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "never";
  const days = getDaysSince(dateStr, dateStr);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function getCustomerDisplayName(item: FollowUpItem): string {
  const first = item.customerFirstName?.trim();
  const last = item.customerLastName?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  return "Unlinked Quote";
}

function getSmsTemplate(age: number, firstName: string, quoteTotal: string, senderName: string): string {
  const name = firstName || "there";
  if (age >= 10) {
    return `Hi ${name}, just following up one last time on your cleaning quote for $${quoteTotal}. Should I keep this open or close it out? - ${senderName}`;
  }
  if (age >= 7) {
    return `Hi ${name}, any questions about the cleaning quote? Happy to adjust anything to make it work for you. - ${senderName}`;
  }
  if (age >= 5) {
    return `Hi ${name}! Just a heads up - our schedule is filling up. Want to lock in your spot for the $${quoteTotal} cleaning? - ${senderName}`;
  }
  if (age >= 3) {
    return `Hi ${name}, wanted to make sure you saw the quote for $${quoteTotal}. We'd love to take care of your home! - ${senderName}`;
  }
  return `Hi ${name}! Just checking in on the cleaning quote I sent over for $${quoteTotal}. Would love to get you on the schedule! - ${senderName}`;
}

function getEmailTemplate(age: number, firstName: string, quoteTotal: string, senderName: string): { subject: string; body: string } {
  const name = firstName || "there";
  if (age >= 10) {
    return {
      subject: `Following up on your cleaning quote`,
      body: `Hi ${name},\n\nI wanted to follow up one last time on the cleaning quote for $${quoteTotal} that I sent over. I completely understand if the timing isn't right.\n\nShould I keep this quote open for you, or would you prefer I close it out? Either way, no pressure at all.\n\nBest,\n${senderName}`,
    };
  }
  if (age >= 7) {
    return {
      subject: `Any questions about your cleaning quote?`,
      body: `Hi ${name},\n\nI wanted to check in about the cleaning quote I sent over. If you have any questions or if there's anything I can adjust to make it work better for you, I'm happy to help.\n\nFeel free to reach out anytime - I'd love to get you taken care of.\n\nBest,\n${senderName}`,
    };
  }
  if (age >= 5) {
    return {
      subject: `Our schedule is filling up!`,
      body: `Hi ${name}!\n\nJust a heads up that our schedule is starting to fill up. I wanted to reach out before your preferred time slot gets taken.\n\nWant to lock in your spot for the $${quoteTotal} cleaning? Just reply to this email and we'll get you on the calendar.\n\nBest,\n${senderName}`,
    };
  }
  if (age >= 3) {
    return {
      subject: `Your cleaning quote for $${quoteTotal}`,
      body: `Hi ${name},\n\nI wanted to make sure you received the cleaning quote I sent over for $${quoteTotal}. We'd love the opportunity to take care of your home.\n\nLet me know if you have any questions or if you're ready to get started!\n\nBest,\n${senderName}`,
    };
  }
  return {
    subject: `Checking in on your cleaning quote`,
    body: `Hi ${name}!\n\nJust checking in on the cleaning quote I sent over for $${quoteTotal}. I'd love to get you on the schedule whenever works best for you.\n\nFeel free to reach out if you have any questions at all!\n\nBest,\n${senderName}`,
  };
}

export default function FollowUpQueueScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { theme, isDark } = useTheme();
  const { businessProfile } = useApp();
  const queryClient = useQueryClient();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;

  const [activeTab, setActiveTab] = useState<FilterTab>("due_today");
  const [snoozeQuoteId, setSnoozeQuoteId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastStreak, setToastStreak] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const senderName = businessProfile.senderName || businessProfile.companyName;

  useEffect(() => {
    trackEvent("followup_queue_open");
  }, []);

  useEffect(() => {
    if (feedbackMsg) {
      const t = setTimeout(() => setFeedbackMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [feedbackMsg]);

  const { data: queue = [], refetch, isLoading } = useQuery<FollowUpItem[]>({
    queryKey: ["/api/followup-queue"],
  });

  const touchMutation = useMutation({
    mutationFn: async (body: { quoteId: number; channel: string; snoozedUntil?: string }) => {
      await apiRequest("POST", "/api/followup-touches", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/followup-queue"] });
    },
  });

  const showMomentumToast = useCallback(async () => {
    try {
      const res = await apiRequest("POST", "/api/streaks/action", { actionType: "followup" });
      const data = await res.json();
      const streak = data?.currentStreak || 1;
      setToastStreak(streak);
      setToastVisible(true);
      trackEvent("streak_increment", { streakLength: streak });
      trackEvent("followup_action");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/streaks"] });
    } catch {
      setToastStreak(1);
      setToastVisible(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [queryClient]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const categorized = useMemo(() => {
    const overdue: FollowUpItem[] = [];
    const dueToday: FollowUpItem[] = [];
    const upcoming: FollowUpItem[] = [];

    queue.forEach((item) => {
      const age = getDaysSince(item.sentAt, item.createdAt);
      if (age > 3) {
        overdue.push(item);
      } else if (age >= 1) {
        dueToday.push(item);
      } else {
        upcoming.push(item);
      }
    });

    return { overdue, dueToday, upcoming };
  }, [queue]);

  const filteredItems = useMemo(() => {
    switch (activeTab) {
      case "overdue": return categorized.overdue;
      case "due_today": return categorized.dueToday;
      case "upcoming": return categorized.upcoming;
    }
  }, [activeTab, categorized]);

  const totalAtRisk = useMemo(() => {
    return queue.reduce((sum, item) => sum + (item.total || 0), 0);
  }, [queue]);

  const showNoContactInfo = useCallback((type: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setFeedbackMsg(`No ${type} on file. Open the quote to add a customer first.`);
  }, []);

  const handleText = useCallback(async (item: FollowUpItem) => {
    trackEvent("followup_text_tap");
    if (!item.customerPhone) {
      showNoContactInfo("phone number");
      return;
    }
    const age = getDaysSince(item.sentAt, item.createdAt);
    const message = getSmsTemplate(age, item.customerFirstName || "", item.total.toLocaleString(), senderName);
    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (!isAvailable) {
        setFeedbackMsg("SMS is not available on this device");
        return;
      }
      await SMS.sendSMSAsync([item.customerPhone], message);
      touchMutation.mutate({ quoteId: item.id, channel: "sms" });
      showMomentumToast();
    } catch (e: any) {
      setFeedbackMsg("Could not open messaging app");
    }
  }, [senderName, touchMutation, showMomentumToast, showNoContactInfo]);

  const handleEmail = useCallback(async (item: FollowUpItem) => {
    trackEvent("followup_email_tap");
    if (!item.customerEmail) {
      showNoContactInfo("email address");
      return;
    }
    const age = getDaysSince(item.sentAt, item.createdAt);
    const { subject, body } = getEmailTemplate(age, item.customerFirstName || "", item.total.toLocaleString(), senderName);
    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        setFeedbackMsg("Email is not available on this device");
        return;
      }
      await MailComposer.composeAsync({
        recipients: [item.customerEmail],
        subject,
        body,
      });
      touchMutation.mutate({ quoteId: item.id, channel: "email" });
      showMomentumToast();
    } catch (e: any) {
      setFeedbackMsg("Could not open email app");
    }
  }, [senderName, touchMutation, showMomentumToast, showNoContactInfo]);

  const handleCall = useCallback(async (item: FollowUpItem) => {
    trackEvent("followup_call_tap");
    if (!item.customerPhone) {
      showNoContactInfo("phone number");
      return;
    }
    try {
      const url = `tel:${item.customerPhone}`;
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        setFeedbackMsg("Phone calls are not supported on this device");
        return;
      }
      await Linking.openURL(url);
      touchMutation.mutate({ quoteId: item.id, channel: "call" });
      showMomentumToast();
    } catch {
      setFeedbackMsg("Could not open phone app");
    }
  }, [touchMutation, showMomentumToast, showNoContactInfo]);

  const handleMarkContacted = useCallback(async (item: FollowUpItem) => {
    trackEvent("followup_mark_contacted");
    touchMutation.mutate({ quoteId: item.id, channel: "manual" });
    showMomentumToast();
  }, [touchMutation, showMomentumToast]);

  const handleSnooze = useCallback((duration: number) => {
    if (snoozeQuoteId === null) return;
    const label = duration === 24 ? "24h" : duration === 48 ? "48h" : "7d";
    trackEvent("followup_snooze", { duration: label });
    const snoozedUntil = new Date(Date.now() + duration * 60 * 60 * 1000).toISOString();
    touchMutation.mutate({ quoteId: snoozeQuoteId, channel: "manual", snoozedUntil });
    setSnoozeQuoteId(null);
  }, [snoozeQuoteId, touchMutation]);

  const handleViewQuote = useCallback((item: FollowUpItem) => {
    navigation.navigate("QuoteDetail", { quoteId: item.id });
  }, [navigation]);

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "overdue", label: "Overdue", count: categorized.overdue.length },
    { key: "due_today", label: "Due Today", count: categorized.dueToday.length },
    { key: "upcoming", label: "Upcoming", count: categorized.upcoming.length },
  ];

  const surfaceBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  const renderItem = useCallback(({ item }: { item: FollowUpItem }) => {
    const age = getDaysSince(item.sentAt, item.createdAt);
    const lastTouched = getRelativeTime(item.lastTouchedAt);
    const customerName = getCustomerDisplayName(item);
    const ageColor = age > 3 ? theme.error : age >= 1 ? theme.warning : theme.success;
    const hasPhone = !!item.customerPhone;
    const hasEmail = !!item.customerEmail;
    const hasCustomer = !!item.customerId || !!item.customerFirstName || !!item.customerLastName;

    return (
      <Pressable onPress={() => handleViewQuote(item)}>
        <Card style={styles.itemCard}>
          <View style={styles.itemTop}>
            <View style={{ flex: 1 }}>
              <ThemedText type="subtitle" numberOfLines={1}>{customerName}</ThemedText>
              {!hasCustomer ? (
                <ThemedText type="caption" style={{ color: theme.warning, marginTop: 2 }}>
                  {"No customer linked - tap to view quote"}
                </ThemedText>
              ) : null}
              <View style={styles.itemMeta}>
                <View style={[styles.ageBadge, { backgroundColor: `${ageColor}15` }]}>
                  <ThemedText type="caption" style={{ color: ageColor, fontWeight: "600" }}>
                    {age === 0 ? "Today" : `${age}d`}
                  </ThemedText>
                </View>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  {"Last: "}
                  {lastTouched}
                </ThemedText>
              </View>
            </View>
            <ThemedText type="h4" style={{ color: theme.text }}>
              {"$"}
              {item.total.toLocaleString()}
            </ThemedText>
          </View>

          <View style={[styles.actionRow, { borderTopColor: borderColor }]}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed ? { opacity: 0.6 } : null]}
              onPress={() => handleText(item)}
              testID={`action-text-${item.id}`}
            >
              <Feather name="message-square" size={18} color={hasPhone ? theme.primary : theme.textSecondary + "60"} />
              <ThemedText type="caption" style={{ color: hasPhone ? theme.primary : theme.textSecondary + "60", marginLeft: 4 }}>{"Text"}</ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed ? { opacity: 0.6 } : null]}
              onPress={() => handleEmail(item)}
              testID={`action-email-${item.id}`}
            >
              <Feather name="mail" size={18} color={hasEmail ? theme.primary : theme.textSecondary + "60"} />
              <ThemedText type="caption" style={{ color: hasEmail ? theme.primary : theme.textSecondary + "60", marginLeft: 4 }}>{"Email"}</ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed ? { opacity: 0.6 } : null]}
              onPress={() => handleCall(item)}
              testID={`action-call-${item.id}`}
            >
              <Feather name="phone" size={18} color={hasPhone ? theme.primary : theme.textSecondary + "60"} />
              <ThemedText type="caption" style={{ color: hasPhone ? theme.primary : theme.textSecondary + "60", marginLeft: 4 }}>{"Call"}</ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed ? { opacity: 0.6 } : null]}
              onPress={() => handleMarkContacted(item)}
              testID={`action-mark-${item.id}`}
            >
              <Feather name="check-circle" size={18} color={theme.success} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed ? { opacity: 0.6 } : null]}
              onPress={() => setSnoozeQuoteId(item.id)}
              testID={`action-snooze-${item.id}`}
            >
              <Feather name="clock" size={18} color={theme.textSecondary} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed ? { opacity: 0.6 } : null]}
              onPress={() => handleViewQuote(item)}
              testID={`action-view-${item.id}`}
            >
              <Feather name="eye" size={16} color={theme.primary} />
              <ThemedText type="caption" style={{ color: theme.primary, marginLeft: 2, fontSize: 10 }}>{"View"}</ThemedText>
            </Pressable>
          </View>
        </Card>
      </Pressable>
    );
  }, [theme, borderColor, handleText, handleEmail, handleCall, handleMarkContacted, handleViewQuote, navigation]);

  return (
    <ProGate featureName="Automated Follow-Ups">
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: headerHeight + Spacing.md }, useMaxWidth ? { maxWidth: 560, alignSelf: "center" as const, width: "100%" } : undefined]}>
        <View style={[styles.atRiskCard, { backgroundColor: surfaceBg }]}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>{"Total at-risk revenue"}</ThemedText>
          <ThemedText type="h2" style={{ color: theme.warning }}>
            {"$"}
            {totalAtRisk.toLocaleString()}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {queue.length.toString()}
            {" quotes pending follow-up"}
          </ThemedText>
        </View>

        <View style={styles.tabRow}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[
                  styles.tab,
                  {
                    backgroundColor: isActive ? theme.primary : surfaceBg,
                    borderColor: isActive ? theme.primary : borderColor,
                  },
                ]}
                onPress={() => setActiveTab(tab.key)}
                testID={`tab-${tab.key}`}
              >
                <ThemedText
                  type="caption"
                  style={{
                    color: isActive ? "#FFFFFF" : theme.text,
                    fontWeight: "600",
                  }}
                >
                  {tab.label}
                </ThemedText>
                <View
                  style={[
                    styles.countBadge,
                    {
                      backgroundColor: isActive ? "rgba(255,255,255,0.25)" : `${theme.primary}15`,
                    },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{
                      color: isActive ? "#FFFFFF" : theme.primary,
                      fontWeight: "700",
                      fontSize: 11,
                    }}
                  >
                    {tab.count.toString()}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + Spacing.xl },
            ...(useMaxWidth ? [{ maxWidth: 560, alignSelf: "center" as const, width: "100%" as const }] : []),
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <EmptyState
              icon="check-circle"
              iconColor={theme.success}
              title="All caught up!"
              description="No follow-ups needed right now."
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {feedbackMsg ? (
        <View style={[styles.feedbackBanner, { backgroundColor: isDark ? "#2D2D2D" : "#333333" }]}>
          <Feather name="info" size={16} color="#FFFFFF" style={{ marginRight: Spacing.sm }} />
          <ThemedText type="caption" style={{ color: "#FFFFFF", flex: 1 }}>{feedbackMsg}</ThemedText>
        </View>
      ) : null}

      <Modal
        visible={snoozeQuoteId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSnoozeQuoteId(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSnoozeQuoteId(null)}>
          <View style={[styles.modalSheet, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.lg }}>{"Snooze Follow-Up"}</ThemedText>

            <Pressable
              style={({ pressed }) => [styles.snoozeOption, { backgroundColor: pressed ? surfaceBg : "transparent" }]}
              onPress={() => handleSnooze(24)}
              testID="snooze-24h"
            >
              <Feather name="clock" size={18} color={theme.primary} />
              <ThemedText type="body" style={{ marginLeft: Spacing.md }}>{"Snooze 24 hours"}</ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.snoozeOption, { backgroundColor: pressed ? surfaceBg : "transparent" }]}
              onPress={() => handleSnooze(48)}
              testID="snooze-48h"
            >
              <Feather name="clock" size={18} color={theme.primary} />
              <ThemedText type="body" style={{ marginLeft: Spacing.md }}>{"Snooze 48 hours"}</ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.snoozeOption, { backgroundColor: pressed ? surfaceBg : "transparent" }]}
              onPress={() => handleSnooze(168)}
              testID="snooze-7d"
            >
              <Feather name="clock" size={18} color={theme.primary} />
              <ThemedText type="body" style={{ marginLeft: Spacing.md }}>{"Snooze 7 days"}</ThemedText>
            </Pressable>

            <Pressable
              style={[styles.cancelBtn, { borderTopColor: borderColor }]}
              onPress={() => setSnoozeQuoteId(null)}
              testID="snooze-cancel"
            >
              <ThemedText type="body" style={{ color: theme.error, fontWeight: "600" }}>{"Cancel"}</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <MomentumToast
        visible={toastVisible}
        streakCount={toastStreak}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
    </ProGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
  },
  atRiskCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  tabRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
    minWidth: 20,
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  itemCard: {
    marginBottom: Spacing.sm,
  },
  itemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: 4,
  },
  ageBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackBanner: {
    position: "absolute",
    bottom: 100,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  snoozeOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
