import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Alert,
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
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { ActionEmptyState } from "@/components/ActionEmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";
import { trackEvent } from "@/lib/analytics";
import { ProGate } from "@/components/ProGate";
import {
  getDormantSmsTemplate,
  getDormantEmailTemplate,
  getLostSmsTemplate,
  getLostEmailTemplate,
} from "@/lib/messageTemplates";

// ── Types ──────────────────────────────────────────────────────────────────

interface DormantCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  lastJobDate: string;
  avgTicket: number | null;
  smsOptOut: boolean;
}

interface LostQuote {
  id: string;
  total: number;
  status: string;
  customerId: string;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  declinedAt: string | null;
  expiresAt: string | null;
  propertyDetails: any;
}

interface Preferences {
  dormantThresholdDays?: number;
}

type TabType = "dormant" | "lost";

// ── Constants ──────────────────────────────────────────────────────────────

const THRESHOLD_OPTIONS = [60, 90, 120];

/** Recovery value estimated as 25% of a dormant customer's average ticket. */
const DORMANT_RECOVERY_RATE = 0.25;

/** Recovery value for a declined quote (10% of quote total). */
const LOST_DECLINED_RECOVERY_RATE = 0.10;

/** Recovery value for an expired quote (20% of quote total). */
const LOST_EXPIRED_RECOVERY_RATE = 0.20;

// ── Helper Functions ───────────────────────────────────────────────────────

function getDaysAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 60) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  return `${months} months ago`;
}

function getDormantEstimate(avgTicket: number | null): number {
  return (avgTicket || 150) * DORMANT_RECOVERY_RATE;
}

function getLostEstimate(total: number, status: string): number {
  return status === "expired"
    ? total * LOST_EXPIRED_RECOVERY_RATE
    : total * LOST_DECLINED_RECOVERY_RATE;
}

function getLostDisplayName(item: LostQuote): string {
  if (item.customerFirstName) {
    return `${item.customerFirstName} ${item.customerLastName || ""}`.trim();
  }
  const pd = item.propertyDetails;
  if (pd && typeof pd === "object") {
    if (pd.customerName) return pd.customerName;
    if (pd.commercialData?.walkthrough?.facilityName) return pd.commercialData.walkthrough.facilityName;
  }
  return "Unnamed Quote";
}

function getLostFirstName(item: LostQuote): string {
  if (item.customerFirstName) return item.customerFirstName;
  const pd = item.propertyDetails;
  if (pd && typeof pd === "object" && pd.customerName) {
    return pd.customerName.split(" ")[0];
  }
  return "there";
}

function getLostPhone(item: LostQuote): string | null {
  if (item.customerPhone) return item.customerPhone;
  const pd = item.propertyDetails;
  if (pd && typeof pd === "object" && pd.customerPhone) return pd.customerPhone;
  return null;
}

function getLostEmail(item: LostQuote): string | null {
  if (item.customerEmail) return item.customerEmail;
  const pd = item.propertyDetails;
  if (pd && typeof pd === "object" && pd.customerEmail) return pd.customerEmail;
  return null;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ActionButton({
  icon,
  label,
  onPress,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  color: string;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: `${color}12`, opacity: pressed ? 0.7 : 1 },
      ]}
      testID={`action-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <Feather name={icon} size={14} color={color} />
      <ThemedText type="caption" style={{ color, marginLeft: 4, fontWeight: "500" }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────

export default function OpportunitiesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { theme, isDark } = useTheme();
  const { businessProfile } = useApp();
  const queryClient = useQueryClient();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;

  const senderName = businessProfile?.senderName || businessProfile?.companyName || "Your Cleaner";

  const [activeTab, setActiveTab] = useState<TabType>("dormant");
  const [thresholdDays, setThresholdDays] = useState<number>(90);
  const [showThresholdPicker, setShowThresholdPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dncModalCustomer, setDncModalCustomer] = useState<{ id: string; name: string } | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const { data: preferences } = useQuery<Preferences>({
    queryKey: ["/api/preferences"],
  });

  useEffect(() => {
    if (preferences?.dormantThresholdDays) {
      setThresholdDays(preferences.dormantThresholdDays);
    }
  }, [preferences]);

  useEffect(() => {
    trackEvent("opportunities_open");
  }, []);

  const { data: dormantRaw = [], refetch: refetchDormant, isLoading: loadingDormant } = useQuery<DormantCustomer[]>({
    queryKey: ["/api/opportunities/dormant", `?thresholdDays=${thresholdDays}`],
  });

  const { data: lostRaw = [], refetch: refetchLost, isLoading: loadingLost } = useQuery<LostQuote[]>({
    queryKey: ["/api/opportunities/lost", "?daysSince=180"],
  });

  const dormant = useMemo(() => dormantRaw.filter((c) => !hiddenIds.has(c.id)), [dormantRaw, hiddenIds]);
  const lost = useMemo(() => lostRaw.filter((q) => !hiddenIds.has(`lost-${q.id}`)), [lostRaw, hiddenIds]);

  const totalCount = dormant.length + lost.length;

  const estimatedRecoverable = useMemo(() => {
    let total = 0;
    dormant.forEach((c) => { total += getDormantEstimate(c.avgTicket); });
    lost.forEach((q) => { total += getLostEstimate(q.total, q.status); });
    return Math.round(total);
  }, [dormant, lost]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchDormant(), refetchLost()]);
    setRefreshing(false);
  };

  const dncMutation = useMutation({
    mutationFn: async (customerId: string) => {
      await apiRequest("PUT", `/api/customers/${customerId}/do-not-contact`, { doNotContact: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
    },
  });

  const touchMutation = useMutation({
    mutationFn: async ({ quoteId, channel }: { quoteId: string; channel: string }) => {
      await apiRequest("POST", "/api/followup-touches", { quoteId, channel });
    },
  });

  const handleDnc = useCallback((customerId: string, name: string) => {
    setDncModalCustomer({ id: customerId, name });
  }, []);

  const confirmDnc = useCallback(async () => {
    if (!dncModalCustomer) return;
    try {
      await dncMutation.mutateAsync(dncModalCustomer.id);
      setHiddenIds((prev) => new Set(prev).add(dncModalCustomer.id));
    } catch {}
    setDncModalCustomer(null);
  }, [dncModalCustomer, dncMutation]);

  const handleDormantText = useCallback(async (item: DormantCustomer) => {
    trackEvent("reactivation_text_tap");
    if (!item.phone) {
      Alert.alert("No Phone Number", "This customer doesn't have a phone number on file. Try reaching out by email instead.");
      return;
    }
    const message = getDormantSmsTemplate(item.firstName, senderName);
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      await SMS.sendSMSAsync([item.phone], message);
    } else {
      Alert.alert("SMS Unavailable", "Text messaging is not available on this device.");
    }
  }, [senderName]);

  const handleDormantEmail = useCallback(async (item: DormantCustomer) => {
    trackEvent("reactivation_email_tap");
    if (!item.email) {
      Alert.alert("No Email Address", "This customer doesn't have an email address on file. Try reaching out by text instead.");
      return;
    }
    const template = getDormantEmailTemplate(item.firstName, senderName);
    await MailComposer.composeAsync({
      recipients: [item.email],
      subject: template.subject,
      body: template.body,
    });
  }, [senderName]);

  const handleLostText = useCallback(async (item: LostQuote) => {
    trackEvent("reactivation_text_tap");
    const phone = getLostPhone(item);
    if (!phone) {
      Alert.alert("No Phone Number", "This quote doesn't have a phone number on file. Try reaching out by email instead.");
      return;
    }
    const firstName = getLostFirstName(item);
    const message = getLostSmsTemplate(firstName, item.total, senderName);
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      await SMS.sendSMSAsync([phone], message);
    } else {
      Alert.alert("SMS Unavailable", "Text messaging is not available on this device.");
    }
  }, [senderName]);

  const handleLostEmail = useCallback(async (item: LostQuote) => {
    trackEvent("reactivation_email_tap");
    const email = getLostEmail(item);
    if (!email) {
      Alert.alert("No Email Address", "This quote doesn't have an email address on file. Try reaching out by text instead.");
      return;
    }
    const firstName = getLostFirstName(item);
    const template = getLostEmailTemplate(firstName, item.total, senderName);
    await MailComposer.composeAsync({
      recipients: [email],
      subject: template.subject,
      body: template.body,
    });
  }, [senderName]);

  const handleMarkAttempted = useCallback(async (quoteId: string) => {
    trackEvent("reactivation_mark_attempted");
    try {
      await touchMutation.mutateAsync({ quoteId, channel: "manual" });
      setHiddenIds((prev) => new Set(prev).add(`lost-${quoteId}`));
    } catch {}
  }, [touchMutation]);

  const renderDormantItem = useCallback(({ item }: { item: DormantCustomer }) => {
    const estimate = getDormantEstimate(item.avgTicket);
    return (
      <Card style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle" style={{ fontWeight: "600" }}>
              {item.firstName} {item.lastName}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
              {`Last job: ${getDaysAgo(item.lastJobDate)}`}
            </ThemedText>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {item.avgTicket ? (
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {`Avg: $${item.avgTicket}`}
              </ThemedText>
            ) : null}
            <ThemedText type="subtitle" style={{ color: theme.success, fontWeight: "600", marginTop: 2 }}>
              {`~$${Math.round(estimate)}`}
            </ThemedText>
          </View>
        </View>
        <View style={styles.actionsRow}>
          <ActionButton icon="message-square" label="Text" onPress={() => handleDormantText(item)} color={theme.primary} />
          <ActionButton icon="mail" label="Email" onPress={() => handleDormantEmail(item)} color={theme.primary} />
          <ActionButton icon="slash" label="DNC" onPress={() => handleDnc(item.id, `${item.firstName} ${item.lastName}`)} color={theme.error} />
        </View>
      </Card>
    );
  }, [theme, handleDormantText, handleDormantEmail, handleDnc]);

  const renderLostItem = useCallback(({ item }: { item: LostQuote }) => {
    const estimate = getLostEstimate(item.total, item.status);
    const dateStr = item.status === "declined" ? item.declinedAt : item.expiresAt;
    const statusColor = item.status === "expired" ? theme.warning : theme.error;
    const displayName = getLostDisplayName(item);
    return (
      <Card style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle" style={{ fontWeight: "600" }}>
              {displayName}
            </ThemedText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {`$${item.total}`}
              </ThemedText>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                <ThemedText type="caption" style={{ color: statusColor, fontWeight: "500" }}>
                  {item.status}
                </ThemedText>
              </View>
            </View>
            {dateStr ? (
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                {getDaysAgo(dateStr)}
              </ThemedText>
            ) : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <ThemedText type="subtitle" style={{ color: theme.success, fontWeight: "600" }}>
              {`~$${Math.round(estimate)}`}
            </ThemedText>
          </View>
        </View>
        <View style={styles.actionsRow}>
          <ActionButton icon="message-square" label="Text" onPress={() => handleLostText(item)} color={theme.primary} />
          <ActionButton icon="mail" label="Email" onPress={() => handleLostEmail(item)} color={theme.primary} />
          <ActionButton icon="check" label="Attempted" onPress={() => handleMarkAttempted(item.id)} color={theme.success} />
          <ActionButton icon="slash" label="DNC" onPress={() => handleDnc(item.customerId, displayName)} color={theme.error} />
        </View>
      </Card>
    );
  }, [theme, handleLostText, handleLostEmail, handleMarkAttempted, handleDnc]);

  const isLoading = activeTab === "dormant" ? loadingDormant : loadingLost;
  const listData = activeTab === "dormant" ? dormant : lost;

  return (
    <ProGate featureName="Opportunities">
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <FlatList
          data={listData as any[]}
          keyExtractor={(item: any) => activeTab === "dormant" ? item.id : `lost-${item.id}`}
          renderItem={activeTab === "dormant" ? renderDormantItem as any : renderLostItem as any}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingTop: headerHeight + Spacing.md,
              paddingBottom: insets.bottom + Spacing.xl,
            },
            ...(useMaxWidth ? [{ maxWidth: 560, alignSelf: "center" as const, width: "100%" as const }] : []),
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.primary + "10", borderWidth: 1, borderColor: theme.primary + "25", borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.sm }}>
                <Feather name="info" size={15} color={theme.primary} style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 18 }}>
                    Reach out to individual customers below, or create a bulk email campaign to contact everyone at once.
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => navigation.navigate("ReactivationCampaigns" as any)}
                  style={{ backgroundColor: theme.primary, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700" }}>Campaigns</ThemedText>
                  <Feather name="arrow-right" size={12} color="#FFFFFF" />
                </Pressable>
              </View>

              <Card style={[styles.summaryCard, { borderWidth: 1.5, borderColor: theme.primary }]}>
                <View style={styles.summaryRow}>
                  <View style={[styles.summaryIcon, { backgroundColor: `${theme.primary}15` }]}>
                    <Feather name="target" size={22} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="subtitle" style={{ fontWeight: "600" }}>
                      {`Reactivation Opportunities: ${totalCount}`}
                    </ThemedText>
                    <ThemedText type="h4" style={{ color: theme.success, marginTop: 2 }}>
                      {`Estimated Recoverable: $${estimatedRecoverable.toLocaleString()}`}
                    </ThemedText>
                  </View>
                </View>
              </Card>

              <View style={styles.tabRow}>
                <Pressable
                  onPress={() => setActiveTab("dormant")}
                  style={[
                    styles.tab,
                    activeTab === "dormant"
                      ? { backgroundColor: theme.primary }
                      : { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" },
                  ]}
                  testID="tab-dormant"
                >
                  <ThemedText
                    type="small"
                    style={{ color: activeTab === "dormant" ? "#FFFFFF" : theme.textSecondary, fontWeight: "600" }}
                  >
                    {`Dormant (${dormant.length})`}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setActiveTab("lost")}
                  style={[
                    styles.tab,
                    activeTab === "lost"
                      ? { backgroundColor: theme.primary }
                      : { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" },
                  ]}
                  testID="tab-lost"
                >
                  <ThemedText
                    type="small"
                    style={{ color: activeTab === "lost" ? "#FFFFFF" : theme.textSecondary, fontWeight: "600" }}
                  >
                    {`Lost Quotes (${lost.length})`}
                  </ThemedText>
                </Pressable>
              </View>

              {activeTab === "dormant" ? (
                <View style={styles.filterRow}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    {"Inactive for at least:"}
                  </ThemedText>
                  <Pressable
                    onPress={() => setShowThresholdPicker(!showThresholdPicker)}
                    style={[styles.filterBtn, { borderColor: theme.border }]}
                    testID="threshold-picker"
                  >
                    <ThemedText type="small" style={{ fontWeight: "500" }}>
                      {`${thresholdDays} days`}
                    </ThemedText>
                    <Feather name="chevron-down" size={14} color={theme.textSecondary} />
                  </Pressable>
                  {showThresholdPicker ? (
                    <View style={[styles.dropdownMenu, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                      {THRESHOLD_OPTIONS.map((opt) => (
                        <Pressable
                          key={opt}
                          onPress={() => { setThresholdDays(opt); setShowThresholdPicker(false); }}
                          style={[
                            styles.dropdownItem,
                            opt === thresholdDays ? { backgroundColor: `${theme.primary}15` } : {},
                          ]}
                          testID={`threshold-${opt}`}
                        >
                          <ThemedText
                            type="small"
                            style={{
                              fontWeight: opt === thresholdDays ? "600" : "400",
                              color: opt === thresholdDays ? theme.primary : theme.text,
                            }}
                          >
                            {`${opt} days`}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : activeTab === "dormant" ? (
              <ActionEmptyState
                icon="users"
                title="No dormant customers yet"
                description="As you complete jobs, past clients who haven't rebooked will appear here."
                ctaLabel="Schedule a Job"
                onCta={() => navigation.navigate("Main", { screen: "JobsTab" })}
                testID="empty-dormant"
              />
            ) : (
              <ActionEmptyState
                icon="file-text"
                title="No lost quotes"
                description="When sent quotes expire without a response, they'll appear here for recovery."
                ctaLabel="Send a Quote"
                onCta={() => navigation.navigate("QuoteCalculator")}
                testID="empty-lost-quotes"
              />
            )
          }
        />

        <Modal
          visible={dncModalCustomer !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setDncModalCustomer(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setDncModalCustomer(null)}>
            <Pressable style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
              <View style={[styles.modalIcon, { backgroundColor: `${theme.error}15` }]}>
                <Feather name="slash" size={28} color={theme.error} />
              </View>
              <ThemedText type="h4" style={{ textAlign: "center", marginTop: Spacing.md }}>
                {"Mark as Do Not Contact?"}
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
                {dncModalCustomer ? `${dncModalCustomer.name} will be removed from outreach lists.` : ""}
              </ThemedText>
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setDncModalCustomer(null)}
                  style={[styles.modalBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }]}
                  testID="dnc-cancel"
                >
                  <ThemedText type="subtitle" style={{ fontWeight: "600" }}>
                    {"Cancel"}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={confirmDnc}
                  style={[styles.modalBtn, { backgroundColor: theme.error }]}
                  testID="dnc-confirm"
                >
                  <ThemedText type="subtitle" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    {"Confirm"}
                  </ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </ProGate>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  summaryCard: {
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tabRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignItems: "center",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    position: "relative",
    zIndex: 10,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  dropdownMenu: {
    position: "absolute",
    top: 36,
    left: 130,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 20,
  },
  dropdownItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  itemCard: {
    marginBottom: Spacing.sm,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  loadingContainer: {
    paddingVertical: Spacing["4xl"],
    alignItems: "center",
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
    maxWidth: 340,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
});
