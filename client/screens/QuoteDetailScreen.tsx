import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useApp } from "@/context/AppContext";

type RouteParams = {
  QuoteDetail: { quoteId: string };
};

type DraftPurpose = "initial_quote" | "follow_up" | "thank_you" | "booking_confirmation" | "reschedule";

export default function QuoteDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, "QuoteDetail">>();
  const { theme } = useTheme();
  const { businessProfile } = useApp();
  const queryClient = useQueryClient();

  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [aiDraftType, setAiDraftType] = useState<"email" | "sms">("email");
  const [aiDraftPurpose, setAiDraftPurpose] = useState<DraftPurpose>("initial_quote");
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [showAiDraft, setShowAiDraft] = useState(false);

  const { data: quote, isLoading } = useQuery<any>({
    queryKey: ['/api/quotes', route.params.quoteId],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/quotes/${route.params.quoteId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/stats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/quotes/${route.params.quoteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/stats'] });
      navigation.goBack();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { channel: string; content: string }) => {
      const res = await apiRequest("POST", `/api/quotes/${route.params.quoteId}/send`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/stats'] });
    },
  });

  const handleStatusChange = async (status: string) => {
    updateMutation.mutate({ status });
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Quote",
      "Are you sure you want to delete this quote?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  const handleMarkSent = () => {
    sendMutation.mutate({ channel: "manual", content: "" });
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const fetchAiDraft = useCallback(async (type: "email" | "sms", purpose: DraftPurpose) => {
    if (!quote) return;
    setAiDraftType(type);
    setAiDraftPurpose(purpose);
    setAiDraftLoading(true);
    setShowAiDraft(true);
    setAiDraft(null);

    try {
      const selectedOpt = quote.options?.[quote.selectedOption || "better"];
      const res = await apiRequest("POST", "/api/ai/communication-draft", {
        type,
        purpose,
        customerName: quote.propertyDetails?.customerName || "Customer",
        companyName: businessProfile?.companyName || "Our Company",
        senderName: businessProfile?.senderName || "Team",
        quoteDetails: {
          selectedOption: selectedOpt?.serviceTypeName || selectedOpt?.name || "Cleaning",
          price: quote.total || selectedOpt?.price || 0,
          scope: selectedOpt?.scope || "Professional cleaning service",
          propertyInfo: `${quote.propertyBeds || 0} bed, ${quote.propertyBaths || 0} bath, ${quote.propertySqft || 0} sqft`,
        },
        bookingLink: businessProfile?.bookingLink || "",
      });
      const data = await res.json();
      if (data.draft) {
        setAiDraft(data.draft);
      }
    } catch (err) {
      console.log("AI draft unavailable");
      setAiDraft(null);
    } finally {
      setAiDraftLoading(false);
    }
  }, [quote, businessProfile]);

  const handleCopyDraft = async () => {
    if (!aiDraft) return;
    await Clipboard.setStringAsync(aiDraft);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleCopyEmail = async () => {
    if (!quote) return;
    const customerName = quote.propertyDetails?.customerName || "Customer";
    const companyName = businessProfile?.companyName || "Our Company";
    const price = quote.total || 0;
    const email = `Hi ${customerName},\n\nThank you for your interest in ${companyName}!\n\nBased on your property details, we've prepared a cleaning quote for $${price.toFixed(0)}.\n\nPlease let us know if you'd like to proceed or have any questions.\n\nBest regards,\n${businessProfile?.senderName || companyName}`;
    await Clipboard.setStringAsync(email);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleCopySms = async () => {
    if (!quote) return;
    const customerName = quote.propertyDetails?.customerName || "there";
    const companyName = businessProfile?.companyName || "us";
    const price = quote.total || 0;
    const sms = `Hi ${customerName}! This is ${companyName}. Your cleaning quote is ready: $${price.toFixed(0)}. Reply YES to book or let us know if you have questions!`;
    await Clipboard.setStringAsync(sms);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  if (isLoading || !quote) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.loading}>
          <ThemedText type="body">Loading...</ThemedText>
        </View>
      </View>
    );
  }

  const statusColors: Record<string, string> = {
    draft: theme.warning,
    sent: theme.primary,
    accepted: theme.success,
    declined: theme.error,
    expired: theme.textSecondary,
  };

  const customerName = quote.propertyDetails?.customerName || "Quick Quote";
  const beds = quote.propertyBeds || 0;
  const baths = quote.propertyBaths || 0;
  const sqft = quote.propertySqft || 0;
  const frequency = quote.frequencySelected || "one-time";
  const status = quote.status || "draft";
  const statusColor = statusColors[status] || theme.textSecondary;
  const options = quote.options || {};
  const selectedOpt = quote.selectedOption || "better";

  const purposeLabels: Record<DraftPurpose, string> = {
    initial_quote: "Send Quote",
    follow_up: "Follow Up",
    thank_you: "Thank You",
    booking_confirmation: "Confirm Booking",
    reschedule: "Reschedule",
  };

  const purposeIcons: Record<DraftPurpose, string> = {
    initial_quote: "send",
    follow_up: "clock",
    thank_you: "heart",
    booking_confirmation: "check-circle",
    reschedule: "calendar",
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl + 80,
          },
        ]}
      >
        <View
          style={[
            styles.customerCard,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}
        >
          <View style={styles.customerHeader}>
            <ThemedText type="h3">{customerName}</ThemedText>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${statusColor}15` },
              ]}
            >
              <ThemedText
                type="small"
                style={{ color: statusColor, fontWeight: "600", textTransform: "capitalize" }}
              >
                {status}
              </ThemedText>
            </View>
          </View>
          {quote.propertyDetails?.customerPhone ? (
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginTop: 4 }}
            >
              {quote.propertyDetails.customerPhone}
            </ThemedText>
          ) : null}
          {quote.propertyDetails?.customerEmail ? (
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginTop: 2 }}
            >
              {quote.propertyDetails.customerEmail}
            </ThemedText>
          ) : null}
        </View>

        <View
          style={[
            styles.detailsCard,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}
        >
          <View style={styles.detailRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Property
            </ThemedText>
            <ThemedText type="body">
              {beds} bed, {baths} bath - {sqft} sqft
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Frequency
            </ThemedText>
            <ThemedText type="body" style={{ textTransform: "capitalize" }}>
              {frequency}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Created
            </ThemedText>
            <ThemedText type="body">
              {new Date(quote.createdAt).toLocaleDateString()}
            </ThemedText>
          </View>
        </View>

        <SectionHeader title="Pricing Options" />

        <View style={styles.optionsContainer}>
          {["good", "better", "best"].map((key) => {
            const opt = options[key];
            if (!opt) return null;
            const isSelected = selectedOpt === key;
            return (
              <Pressable
                key={key}
                onPress={() => updateMutation.mutate({ selectedOption: key })}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: isSelected ? `${theme.primary}10` : theme.cardBackground,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                testID={`option-${key}`}
              >
                <View style={styles.optionHeader}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    {opt.serviceTypeName || opt.name || key}
                  </ThemedText>
                  {isSelected ? (
                    <Feather name="check-circle" size={18} color={theme.primary} />
                  ) : null}
                </View>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {opt.serviceTypeName || opt.name || key}
                </ThemedText>
                <ThemedText type="h3" style={{ color: theme.primary, marginTop: Spacing.sm }}>
                  ${opt.price?.toFixed(0) || "0"}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.totalCard, { backgroundColor: theme.primary }]}>
          <ThemedText type="body" style={{ color: "#FFFFFF" }}>Total</ThemedText>
          <ThemedText type="h2" style={{ color: "#FFFFFF" }}>
            ${quote.total?.toFixed(0) || "0"}
          </ThemedText>
        </View>

        <SectionHeader title="Quick Actions" />

        <View style={styles.actions}>
          <Pressable
            onPress={handleCopyEmail}
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            testID="copy-email-btn"
          >
            <Feather name="mail" size={20} color={theme.primary} />
            <ThemedText type="small" style={{ marginTop: 4 }}>Copy Email</ThemedText>
          </Pressable>

          <Pressable
            onPress={handleCopySms}
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            testID="copy-sms-btn"
          >
            <Feather name="message-square" size={20} color={theme.primary} />
            <ThemedText type="small" style={{ marginTop: 4 }}>Copy SMS</ThemedText>
          </Pressable>

          {status === "draft" ? (
            <Pressable
              onPress={handleMarkSent}
              style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
              testID="mark-sent-btn"
            >
              <Feather name="send" size={20} color={theme.success} />
              <ThemedText type="small" style={{ marginTop: 4 }}>Mark Sent</ThemedText>
            </Pressable>
          ) : null}

          <Pressable
            onPress={handleDelete}
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            testID="delete-quote-btn"
          >
            <Feather name="trash-2" size={20} color={theme.error} />
            <ThemedText type="small" style={{ marginTop: 4, color: theme.error }}>Delete</ThemedText>
          </Pressable>
        </View>

        <View style={styles.sectionRow}>
          <SectionHeader title="AI Message Writer" />
          <View style={[styles.aiBadge, { backgroundColor: `${theme.primary}15` }]}>
            <Feather name="zap" size={12} color={theme.primary} />
            <ThemedText type="caption" style={{ color: theme.primary, marginLeft: 4 }}>
              AI Powered
            </ThemedText>
          </View>
        </View>

        <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
          Generate personalized messages for your customer
        </ThemedText>

        <View style={styles.purposeRow}>
          {(["initial_quote", "follow_up", "thank_you", "booking_confirmation", "reschedule"] as DraftPurpose[]).map((purpose) => (
            <Pressable
              key={purpose}
              onPress={() => setAiDraftPurpose(purpose)}
              style={[
                styles.purposeChip,
                {
                  backgroundColor: aiDraftPurpose === purpose ? theme.primary : theme.backgroundSecondary,
                },
              ]}
              testID={`purpose-${purpose}`}
            >
              <Feather
                name={purposeIcons[purpose] as any}
                size={14}
                color={aiDraftPurpose === purpose ? "#FFFFFF" : theme.textSecondary}
              />
              <ThemedText
                type="caption"
                style={{
                  color: aiDraftPurpose === purpose ? "#FFFFFF" : theme.text,
                  marginLeft: 4,
                  fontWeight: aiDraftPurpose === purpose ? "600" : "400",
                }}
              >
                {purposeLabels[purpose]}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.aiButtonRow}>
          <Pressable
            onPress={() => fetchAiDraft("email", aiDraftPurpose)}
            style={[styles.aiGenerateBtn, { backgroundColor: theme.primary }]}
            testID="ai-email-btn"
          >
            <Feather name="mail" size={16} color="#FFFFFF" />
            <ThemedText type="small" style={{ color: "#FFFFFF", marginLeft: 6, fontWeight: "600" }}>
              Write Email
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => fetchAiDraft("sms", aiDraftPurpose)}
            style={[styles.aiGenerateBtn, { backgroundColor: theme.primary }]}
            testID="ai-sms-btn"
          >
            <Feather name="message-square" size={16} color="#FFFFFF" />
            <ThemedText type="small" style={{ color: "#FFFFFF", marginLeft: 6, fontWeight: "600" }}>
              Write SMS
            </ThemedText>
          </Pressable>
        </View>

        {showAiDraft ? (
          <View
            style={[
              styles.aiDraftCard,
              { backgroundColor: theme.cardBackground, borderColor: theme.border },
            ]}
          >
            <View style={styles.aiDraftHeader}>
              <View style={styles.draftTitleRow}>
                <Feather
                  name={aiDraftType === "email" ? "mail" : "message-square"}
                  size={16}
                  color={theme.primary}
                />
                <ThemedText type="body" style={{ fontWeight: "600", marginLeft: 8 }}>
                  {aiDraftType === "email" ? "Email" : "SMS"} - {purposeLabels[aiDraftPurpose]}
                </ThemedText>
              </View>
              <Pressable onPress={() => setShowAiDraft(false)}>
                <Feather name="x" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>

            {aiDraftLoading ? (
              <View style={styles.draftLoading}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 8 }}>
                  AI is writing your message...
                </ThemedText>
              </View>
            ) : aiDraft ? (
              <>
                <ThemedText type="small" style={styles.draftText}>
                  {aiDraft}
                </ThemedText>
                <View style={styles.aiDraftActions}>
                  <Pressable onPress={handleCopyDraft} style={styles.draftAction} testID="copy-ai-draft">
                    <Feather name="copy" size={16} color={theme.primary} />
                    <ThemedText type="small" style={{ color: theme.primary, marginLeft: 4 }}>
                      Copy
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => fetchAiDraft(aiDraftType, aiDraftPurpose)}
                    style={styles.draftAction}
                    testID="regenerate-ai-draft"
                  >
                    <Feather name="refresh-cw" size={16} color={theme.primary} />
                    <ThemedText type="small" style={{ color: theme.primary, marginLeft: 4 }}>
                      Regenerate
                    </ThemedText>
                  </Pressable>
                </View>
              </>
            ) : (
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Could not generate draft. Please try again.
              </ThemedText>
            )}
          </View>
        ) : null}

        <SectionHeader title="Update Status" />

        <View style={styles.statusButtons}>
          {["draft", "sent", "accepted", "declined", "expired"].map((s) => (
            <Pressable
              key={s}
              onPress={() => handleStatusChange(s)}
              style={[
                styles.statusButton,
                {
                  backgroundColor:
                    status === s
                      ? statusColors[s] || theme.textSecondary
                      : theme.backgroundSecondary,
                },
              ]}
              testID={`status-${s}-btn`}
            >
              <ThemedText
                type="small"
                style={{
                  color: status === s ? "#FFFFFF" : theme.text,
                  fontWeight: status === s ? "600" : "400",
                  textTransform: "capitalize",
                }}
              >
                {s}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </ScrollView>
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
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  customerCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  customerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  detailsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  optionCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
  },
  optionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  totalCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.xl,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: 80,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  purposeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  purposeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  aiButtonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  aiGenerateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  aiDraftCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  aiDraftHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  draftTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  draftLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
  },
  draftText: {
    lineHeight: 20,
  },
  aiDraftActions: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  draftAction: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  statusButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
});
