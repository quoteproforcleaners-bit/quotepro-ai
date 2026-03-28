import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ProGate } from "@/components/ProGate";
import { useAIConsent } from "@/context/AIConsentContext";

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
    success: theme.success,
    successSoft: theme.successSoft,
    warning: theme.warning,
    warningSoft: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.08)",
    error: theme.error,
    overlay: theme.overlay,
  }), [theme, isDark]);
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  sent: { label: "Sent", color: "#007AFF", bg: "rgba(0,122,255,0.12)" },
  clicked: { label: "Clicked", color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
  completed: { label: "Completed", color: "#16A34A", bg: "rgba(22,163,74,0.12)" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <View style={[s.badge, { backgroundColor: config.bg }]} testID={`badge-status-${status}`}>
      <ThemedText type="caption" style={{ color: config.color, fontWeight: "600" }}>
        {config.label}
      </ThemedText>
    </View>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={s.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Feather
          key={i}
          name="star"
          size={14}
          color={i <= rating ? "#F59E0B" : "rgba(150,150,150,0.3)"}
          style={{ marginRight: 2 }}
        />
      ))}
    </View>
  );
}

export default function ReviewsReferralsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const dt = useDesignTokens();
  const queryClient = useQueryClient();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;
  const { requestConsent } = useAIConsent();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [reviewEmailSubject, setReviewEmailSubject] = useState("");
  const [reviewEmailContent, setReviewEmailContent] = useState("");
  const [generatingReview, setGeneratingReview] = useState(false);
  const [sendingReview, setSendingReview] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  const { data: reviewRequests = [], refetch } = useQuery<any[]>({
    queryKey: ["/api/review-requests"],
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  const getFullName = (c: any) => {
    const first = c.firstName || "";
    const last = c.lastName || "";
    const full = `${first} ${last}`.trim();
    return full || c.name || "";
  };

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const query = customerSearch.toLowerCase();
    return customers.filter((c: any) => {
      const name = getFullName(c).toLowerCase();
      const email = (c.email || "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [customers, customerSearch]);

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c: any) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const stats = useMemo(() => {
    const sent = reviewRequests.filter((r: any) => r.status !== "pending").length;
    const clicks = reviewRequests.filter((r: any) => r.reviewClicked).length;
    const referrals = reviewRequests.filter((r: any) => r.referralSent).length;
    return { sent, clicks, referrals };
  }, [reviewRequests]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSendReview = useCallback(async (id: number) => {
    setLoadingId(`review-${id}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await apiRequest("PUT", `/api/review-requests/${id}`, { reviewClicked: true });
      queryClient.invalidateQueries({ queryKey: ["/api/review-requests"] });
    } catch {}
    setLoadingId(null);
  }, [queryClient]);

  const handleAskReferral = useCallback(async (id: number) => {
    setLoadingId(`referral-${id}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await apiRequest("PUT", `/api/review-requests/${id}`, { referralSent: true });
      queryClient.invalidateQueries({ queryKey: ["/api/review-requests"] });
    } catch {}
    setLoadingId(null);
  }, [queryClient]);

  const handleCreateRequest = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedCustomerId(null);
    setReviewEmailSubject("");
    setReviewEmailContent("");
    setCustomerSearch("");
    setGeneratingReview(false);
    setSendingReview(false);
    setReviewModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setReviewModalVisible(false);
    setSelectedCustomerId(null);
    setReviewEmailSubject("");
    setReviewEmailContent("");
    setCustomerSearch("");
    setGeneratingReview(false);
    setSendingReview(false);
  }, []);

  const generateEmailContent = useCallback(async () => {
    const consented = await requestConsent();
    if (!consented) return;
    setGeneratingReview(true);
    const fallbackSubject = "We would love your feedback";
    const fallbackBody =
      "Thank you for choosing our services. We strive to provide the best experience possible and your feedback helps us improve.\n\nWould you take a moment to share your experience? Your review means a lot to us and helps other customers find quality service.\n\nThank you for your time.";
    try {
      const res = await apiRequest("POST", "/api/ai/generate-review-email", {});
      const data = await res.json();
      const content = data.content || data.body || "";
      let subject = data.subject || "";
      if (!content) {
        setReviewEmailSubject(fallbackSubject);
        setReviewEmailContent(fallbackBody);
        setGeneratingReview(false);
        return;
      }
      if (!subject && content) {
        const subjectMatch = content.match(/^(?:Subject:\s*)(.+?)(?:\n|$)/i);
        if (subjectMatch) {
          subject = subjectMatch[1].trim();
        } else {
          subject = fallbackSubject;
        }
      }
      let body = content;
      body = body.replace(/^Subject:\s*.+?\n/i, "").trim();
      setReviewEmailSubject(subject || fallbackSubject);
      setReviewEmailContent(body || fallbackBody);
    } catch {
      setReviewEmailSubject(fallbackSubject);
      setReviewEmailContent(fallbackBody);
    }
    setGeneratingReview(false);
  }, []);

  const handleSelectCustomer = useCallback(async (customerId: number) => {
    Haptics.selectionAsync();
    setSelectedCustomerId(customerId);
    setGeneratingReview(true);
    setReviewEmailSubject("");
    setReviewEmailContent("");
    await generateEmailContent();
  }, [generateEmailContent]);

  const handleRegenerateEmail = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await generateEmailContent();
  }, [generateEmailContent]);

  const handleSendEmail = useCallback(async () => {
    if (!selectedCustomerId || !reviewEmailSubject || !reviewEmailContent) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSendingReview(true);
    try {
      await apiRequest("POST", "/api/review-requests", {
        customerId: selectedCustomerId,
      });
      await apiRequest("POST", "/api/communications", {
        customerId: selectedCustomerId,
        type: "email",
        channel: "email",
        subject: reviewEmailSubject,
        content: reviewEmailContent,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/review-requests"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleCloseModal();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setSendingReview(false);
  }, [selectedCustomerId, reviewEmailSubject, reviewEmailContent, queryClient, handleCloseModal]);

  const handleBackToCustomerPicker = useCallback(() => {
    Haptics.selectionAsync();
    setSelectedCustomerId(null);
    setReviewEmailSubject("");
    setReviewEmailContent("");
  }, []);

  const getCustomerName = (item: any) => {
    if (item.metadata?.customerName) return item.metadata.customerName;
    if (item.customerName) return item.customerName;
    return `Customer #${item.customerId || item.id}`;
  };

  const renderItem = useCallback(({ item }: { item: any }) => (
    <View
      style={[s.card, { backgroundColor: dt.surfacePrimary, borderColor: dt.borderSecondary }]}
      testID={`card-review-${item.id}`}
    >
      <View style={s.cardHeader}>
        <View style={s.cardHeaderLeft}>
          <View style={[s.avatar, { backgroundColor: dt.accentSoft }]}>
            <Feather name="user" size={18} color={dt.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle" numberOfLines={1}>{getCustomerName(item)}</ThemedText>
            {item.jobId ? (
              <ThemedText type="caption" style={{ color: dt.textMuted }}>
                {`Job #${item.jobId}`}
              </ThemedText>
            ) : null}
          </View>
        </View>
        <StatusBadge status={item.status || "pending"} />
      </View>

      {item.rating ? <StarRating rating={item.rating} /> : null}

      <View style={s.actions}>
        <Pressable
          testID={`button-send-review-${item.id}`}
          onPress={() => handleSendReview(item.id)}
          disabled={loadingId === `review-${item.id}`}
          style={[s.actionBtn, { backgroundColor: dt.accentSoft }]}
        >
          {loadingId === `review-${item.id}` ? (
            <ActivityIndicator size="small" color={dt.accent} />
          ) : (
            <>
              <Feather name="send" size={14} color={dt.accent} />
              <ThemedText type="caption" style={{ color: dt.accent, fontWeight: "600", marginLeft: 4 }}>
                {"Send Review Link"}
              </ThemedText>
            </>
          )}
        </Pressable>

        <Pressable
          testID={`button-ask-referral-${item.id}`}
          onPress={() => handleAskReferral(item.id)}
          disabled={loadingId === `referral-${item.id}`}
          style={[s.actionBtn, { backgroundColor: dt.successSoft }]}
        >
          {loadingId === `referral-${item.id}` ? (
            <ActivityIndicator size="small" color={dt.success} />
          ) : (
            <>
              <Feather name="gift" size={14} color={dt.success} />
              <ThemedText type="caption" style={{ color: dt.success, fontWeight: "600", marginLeft: 4 }}>
                {"Ask Referral"}
              </ThemedText>
            </>
          )}
        </Pressable>
      </View>
    </View>
  ), [dt, loadingId, handleSendReview, handleAskReferral]);

  const ListHeader = useMemo(() => (
    <View style={s.statsRow} testID="stats-row">
      {[
        { label: "Reviews Sent", value: stats.sent, icon: "send" as const, color: dt.accent },
        { label: "Review Clicks", value: stats.clicks, icon: "mouse-pointer" as const, color: dt.warning },
        { label: "Referrals Sent", value: stats.referrals, icon: "gift" as const, color: dt.success },
      ].map((stat) => (
        <View
          key={stat.label}
          style={[s.statCard, { backgroundColor: dt.surfacePrimary, borderColor: dt.borderSecondary }]}
          testID={`stat-${stat.label.replace(/\s/g, "-").toLowerCase()}`}
        >
          <View style={[s.statIcon, { backgroundColor: `${stat.color}15` }]}>
            <Feather name={stat.icon} size={16} color={stat.color} />
          </View>
          <ThemedText type="h3" style={{ marginTop: Spacing.xs }}>{stat.value}</ThemedText>
          <ThemedText type="caption" style={{ color: dt.textSecondary }}>{stat.label}</ThemedText>
        </View>
      ))}
    </View>
  ), [stats, dt]);

  const EmptyState = useMemo(() => (
    <View style={s.empty} testID="empty-state-reviews">
      <View style={[s.emptyIcon, { backgroundColor: dt.accentSoft }]}>
        <Feather name="star" size={32} color={dt.accent} />
      </View>
      <ThemedText type="h4" style={{ textAlign: "center", marginTop: Spacing.lg }}>
        {"No Review Requests Yet"}
      </ThemedText>
      <ThemedText type="small" style={{ color: dt.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
        {"Ask your first customer for a review after completing a job. Reviews help you win more business."}
      </ThemedText>
      <Pressable
        onPress={() => navigation.navigate("Main", { screen: "JobsTab" })}
        style={[s.emptyCtaBtn, { backgroundColor: dt.accent }]}
        testID="button-view-completed-jobs"
      >
        <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700" }}>
          {"View Completed Jobs"}
        </ThemedText>
      </Pressable>
    </View>
  ), [dt, navigation]);

  const renderCustomerPickerStep = () => (
    <View style={{ flex: 1 }}>
      <View style={s.modalHeader}>
        <ThemedText type="h4">{"Select a Customer"}</ThemedText>
        <Pressable onPress={handleCloseModal} testID="button-close-modal" hitSlop={12}>
          <Feather name="x" size={24} color={dt.textPrimary} />
        </Pressable>
      </View>

      <View style={[s.searchContainer, { backgroundColor: dt.surfaceSecondary, borderColor: dt.borderSecondary }]}>
        <Feather name="search" size={16} color={dt.textMuted} />
        <TextInput
          testID="input-customer-search"
          style={[s.searchInput, { color: dt.textPrimary }]}
          placeholder="Search customers..."
          placeholderTextColor={dt.textMuted}
          value={customerSearch}
          onChangeText={setCustomerSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {customerSearch.length > 0 ? (
          <Pressable onPress={() => setCustomerSearch("")} hitSlop={8}>
            <Feather name="x-circle" size={16} color={dt.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: Spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {filteredCustomers.length > 0 ? (
          filteredCustomers.map((customer: any) => (
            <Pressable
              key={customer.id}
              testID={`button-select-customer-${customer.id}`}
              onPress={() => handleSelectCustomer(customer.id)}
              style={[s.customerRow, { borderColor: dt.borderSecondary }]}
            >
              <View style={[s.avatar, { backgroundColor: dt.accentSoft }]}>
                <Feather name="user" size={18} color={dt.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="subtitle" numberOfLines={1}>
                  {getFullName(customer) || `Customer #${customer.id}`}
                </ThemedText>
                {customer.email ? (
                  <ThemedText type="caption" style={{ color: dt.textMuted }} numberOfLines={1}>
                    {customer.email}
                  </ThemedText>
                ) : null}
              </View>
              <Feather name="chevron-right" size={18} color={dt.textMuted} />
            </Pressable>
          ))
        ) : (
          <View style={s.emptyCustomers}>
            <Feather name="users" size={24} color={dt.textMuted} />
            <ThemedText type="small" style={{ color: dt.textMuted, marginTop: Spacing.sm }}>
              {"No customers found"}
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </View>
  );

  const renderEmailDraftStep = () => (
    <View style={{ flex: 1 }}>
      <View style={s.modalHeader}>
        <Pressable onPress={handleBackToCustomerPicker} testID="button-back-to-picker" hitSlop={12}>
          <Feather name="arrow-left" size={24} color={dt.textPrimary} />
        </Pressable>
        <ThemedText type="h4" style={{ flex: 1, marginLeft: Spacing.sm }}>{"Review Request Email"}</ThemedText>
        <Pressable onPress={handleCloseModal} testID="button-close-modal-draft" hitSlop={12}>
          <Feather name="x" size={24} color={dt.textPrimary} />
        </Pressable>
      </View>

      {selectedCustomer ? (
        <View style={[s.recipientBanner, { backgroundColor: dt.accentSoft, borderColor: dt.borderSecondary }]}>
          <Feather name="mail" size={16} color={dt.accent} />
          <View style={{ flex: 1, marginLeft: Spacing.sm }}>
            <ThemedText type="caption" style={{ color: dt.textSecondary }}>{"To"}</ThemedText>
            <ThemedText type="subtitle" numberOfLines={1}>
              {getFullName(selectedCustomer) || `Customer #${selectedCustomer.id}`}
            </ThemedText>
          </View>
        </View>
      ) : null}

      {generatingReview ? (
        <View style={s.generatingContainer}>
          <ActivityIndicator size="large" color={dt.accent} />
          <ThemedText type="subtitle" style={{ color: dt.textSecondary, marginTop: Spacing.lg }}>
            {"Drafting your review request..."}
          </ThemedText>
          <ThemedText type="caption" style={{ color: dt.textMuted, marginTop: Spacing.xs }}>
            {"AI is generating a personalized email"}
          </ThemedText>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: Spacing.xl }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ marginBottom: Spacing.md }}>
            <ThemedText type="caption" style={{ color: dt.textSecondary, marginBottom: Spacing.xs, fontWeight: "600" }}>
              {"Subject"}
            </ThemedText>
            <TextInput
              testID="input-email-subject"
              style={[s.emailInput, { color: dt.textPrimary, backgroundColor: dt.surfaceSecondary, borderColor: dt.borderSecondary }]}
              value={reviewEmailSubject}
              onChangeText={setReviewEmailSubject}
              placeholder="Email subject"
              placeholderTextColor={dt.textMuted}
            />
          </View>

          <View style={{ marginBottom: Spacing.lg }}>
            <ThemedText type="caption" style={{ color: dt.textSecondary, marginBottom: Spacing.xs, fontWeight: "600" }}>
              {"Body"}
            </ThemedText>
            <TextInput
              testID="input-email-body"
              style={[s.emailBodyInput, { color: dt.textPrimary, backgroundColor: dt.surfaceSecondary, borderColor: dt.borderSecondary }]}
              value={reviewEmailContent}
              onChangeText={setReviewEmailContent}
              placeholder="Email content"
              placeholderTextColor={dt.textMuted}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={s.draftActions}>
            <Pressable
              testID="button-regenerate-email"
              onPress={handleRegenerateEmail}
              disabled={generatingReview}
              style={[s.secondaryBtn, { borderColor: dt.borderPrimary }]}
            >
              <Feather name="refresh-cw" size={16} color={dt.accent} />
              <ThemedText type="subtitle" style={{ color: dt.accent, marginLeft: Spacing.xs }}>
                {"Regenerate"}
              </ThemedText>
            </Pressable>

            <Pressable
              testID="button-send-email"
              onPress={handleSendEmail}
              disabled={sendingReview || !reviewEmailSubject || !reviewEmailContent}
              style={[
                s.primaryBtn,
                { backgroundColor: dt.accent, opacity: sendingReview || !reviewEmailSubject || !reviewEmailContent ? 0.5 : 1 },
              ]}
            >
              {sendingReview ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="send" size={16} color="#FFFFFF" />
                  <ThemedText type="subtitle" style={{ color: "#FFFFFF", marginLeft: Spacing.xs }}>
                    {"Send Email"}
                  </ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );

  return (
    <ProGate featureName="Reviews & Referrals">
    <View style={s.flex}>
      <FlatList
        data={reviewRequests}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyState}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl + 80,
          gap: Spacing.md,
          ...(useMaxWidth ? { maxWidth: 560, alignSelf: "center" as const, width: "100%" } : undefined),
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={dt.accent} />
        }
        showsVerticalScrollIndicator={false}
        testID="list-review-requests"
      />

      <Pressable
        testID="fab-request-review"
        onPress={handleCreateRequest}
        style={[s.fab, { backgroundColor: theme.primary, bottom: insets.bottom + Spacing.xl }]}
      >
        <Feather name="plus" size={24} color="#FFFFFF" />
      </Pressable>

      <Modal
        visible={reviewModalVisible}
        animationType="slide"
        transparent={false}
        presentationStyle="fullScreen"
        onRequestClose={handleCloseModal}
        testID="modal-review-request"
      >
        <KeyboardAvoidingView
          style={[s.flex, { backgroundColor: dt.surfacePrimary }]}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          <View style={[s.flex, { backgroundColor: dt.surfacePrimary, paddingTop: insets.top, paddingBottom: insets.bottom + Spacing.lg, paddingHorizontal: Spacing.lg }]}>
            {selectedCustomerId ? renderEmailDraftStep() : renderCustomerPickerStep()}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
    </ProGate>
  );
}

const centered = { alignItems: "center" as const, justifyContent: "center" as const };
const s = StyleSheet.create({
  flex: { flex: 1 },
  statsRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.sm },
  statCard: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, ...centered },
  statIcon: { width: 32, height: 32, borderRadius: 16, ...centered },
  card: { padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.sm },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, flex: 1, marginRight: Spacing.sm },
  avatar: { width: 36, height: 36, borderRadius: 18, ...centered },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  starsRow: { flexDirection: "row", marginBottom: Spacing.sm, marginLeft: 44 },
  actions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.xs },
  actionBtn: { flex: 1, flexDirection: "row", ...centered, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, minHeight: 36 },
  empty: { ...centered, paddingVertical: Spacing["5xl"] },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, ...centered },
  emptyCtaBtn: { marginTop: Spacing.lg, paddingHorizontal: Spacing["2xl"], paddingVertical: Spacing.md, borderRadius: BorderRadius.sm, minWidth: 200, alignItems: "center" },
  fab: { position: "absolute", right: Spacing.lg, width: 56, height: 56, borderRadius: 28, ...centered },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    maxHeight: "90%",
    minHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 2,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  emptyCustomers: {
    ...centered,
    paddingVertical: Spacing["3xl"],
  },
  recipientBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  generatingContainer: {
    flex: 1,
    ...centered,
    paddingVertical: Spacing["3xl"],
  },
  emailInput: {
    fontSize: 15,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  emailBodyInput: {
    fontSize: 15,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minHeight: 180,
  },
  draftActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    ...centered,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    ...centered,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
});
