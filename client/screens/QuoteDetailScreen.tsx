import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, Platform, ActivityIndicator, TextInput, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as SMS from "expo-sms";
import * as WebBrowser from "expo-web-browser";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getApiUrl, getPublicBaseUrl } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getPaymentOptions, getEnabledPaymentMethods, PAYMENT_METHOD_LABELS } from "@/lib/paymentOptions";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAIConsent } from "@/context/AIConsentContext";
import { ProBadge } from "@/components/ProBadge";

type RouteParams = {
  QuoteDetail: { quoteId: string };
};

type DraftPurpose = "initial_quote" | "follow_up" | "thank_you" | "booking_confirmation" | "reschedule";

function FormattedDraftText({ text, style }: { text: string; style?: any }) {
  const paragraphs = text.split(/\n\n+/);
  return (
    <View style={{ gap: 10 }}>
      {paragraphs.map((paragraph, index) => {
        const lines = paragraph.split(/\n/);
        return (
          <ThemedText key={index} type="small" style={[{ lineHeight: 20 }, style]}>
            {lines.map((line, lineIndex) =>
              lineIndex < lines.length - 1 ? (
                <ThemedText key={lineIndex} type="small" style={[{ lineHeight: 20 }, style]}>
                  {line}{"\n"}
                </ThemedText>
              ) : (
                line
              )
            )}
          </ThemedText>
        );
      })}
    </View>
  );
}

export default function QuoteDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;
  const route = useRoute<RouteProp<RouteParams, "QuoteDetail">>();
  const { theme } = useTheme();
  const { businessProfile } = useApp();
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const { communicationLanguage } = useLanguage();
  const { requestConsent } = useAIConsent();
  const queryClient = useQueryClient();

  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [aiDraftType, setAiDraftType] = useState<"email" | "sms">("email");
  const [aiDraftPurpose, setAiDraftPurpose] = useState<DraftPurpose>("initial_quote");
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [showAiDraft, setShowAiDraft] = useState(false);
  const [sendingDraft, setSendingDraft] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const { data: quote, isLoading, isError, error, refetch: refetchQuote } = useQuery<any>({
    queryKey: ['/api/quotes', route.params.quoteId],
  });

  useFocusEffect(
    useCallback(() => {
      refetchQuote();
    }, [refetchQuote])
  );

  const { data: stripeStatus } = useQuery({
    queryKey: ["/api/stripe/status"],
  });

  const quoteId = route.params.quoteId;

  const { data: recommendations } = useQuery<any[]>({
    queryKey: ['/api/quotes', quoteId, 'recommendations'],
    enabled: quote?.status === "accepted",
  });

  const recommendationMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/recommendations/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes', quoteId, 'recommendations'] });
    },
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

  const handleRequestPayment = async () => {
    try {
      setPaymentLoading(true);
      const res = await fetch(new URL("/api/stripe/create-payment", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quoteId: route.params.quoteId }),
      });
      const data = await res.json();
      if (data.url) {
        await Clipboard.setStringAsync(data.url);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSendSuccess("Payment link copied!");
        setTimeout(() => setSendSuccess(null), 3000);
      }
    } catch (e) {
      console.error("Payment link error:", e);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const data: any = { status: newStatus };
    if (newStatus === "accepted" && !quote?.acceptedAt) {
      data.acceptedAt = new Date().toISOString();
      data.acceptedSource = "manual";
    }
    updateMutation.mutate(data);
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
    if (!isPro) {
      navigation.navigate("Paywall");
      return;
    }
    const consented = await requestConsent();
    if (!consented) return;
    setAiDraftType(type);
    setAiDraftPurpose(purpose);
    setAiDraftLoading(true);
    setShowAiDraft(true);
    setAiDraft(null);
    setSendSuccess(null);

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
        quoteLink: quote.publicToken ? `${getPublicBaseUrl()}/q/${quote.publicToken}` : "",
        bookingLink: businessProfile?.bookingLink || "",
        paymentMethodsText: (() => {
          const po = getPaymentOptions(businessProfile?.paymentOptions);
          const enabled = getEnabledPaymentMethods(po);
          return enabled.length > 0 ? enabled.map(({ label }) => label).join(", ") : "";
        })(),
        language: communicationLanguage,
      });
      const data = await res.json();
      if (data.draft) {
        setAiDraft(data.draft);
      }
    } catch (err: any) {
      if (err?.message?.includes("403") || err?.status === 403) {
        navigation.navigate("Paywall");
        setShowAiDraft(false);
      }
      setAiDraft(null);
    } finally {
      setAiDraftLoading(false);
    }
  }, [quote, businessProfile, isPro]);

  const handleCopyDraft = async () => {
    if (!aiDraft) return;
    await Clipboard.setStringAsync(aiDraft);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleSendDraft = async () => {
    if (!aiDraft || !quote) return;

    const recipientEmail = quote.propertyDetails?.customerEmail;
    const recipientPhone = quote.propertyDetails?.customerPhone;

    if (aiDraftType === "email" && !businessProfile?.email) {
      Alert.alert("Business Email Required", "Please add your email address in Settings before sending emails. This ensures customer replies go directly to you.");
      return;
    }
    if (aiDraftType === "email" && !recipientEmail) {
      Alert.alert("No Email", "This customer doesn't have an email address on file. Please add one first.");
      return;
    }
    if (aiDraftType === "sms" && !recipientPhone) {
      Alert.alert("No Phone", "This customer doesn't have a phone number on file. Please add one first.");
      return;
    }

    if (aiDraftType === "sms") {
      try {
        const isAvailable = await SMS.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert("SMS Not Available", "Text messaging is not available on this device. You can copy the message and send it manually.");
          return;
        }
        const smsBody = businessProfile?.smsSignature
          ? `${aiDraft}\n\n${businessProfile.smsSignature}`
          : aiDraft;
        const { result } = await SMS.sendSMSAsync([recipientPhone!], smsBody);
        if (result === "sent") {
          setSendSuccess("SMS opened!");
          sendMutation.mutate({ channel: "sms", content: aiDraft });
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      } catch (err) {
        Alert.alert("SMS Error", "Could not open Messages. You can copy the message and send it manually.");
      }
      return;
    }

    setSendingDraft(true);
    setSendSuccess(null);

    try {
      const subjectMatch = aiDraft.match(/^Subject:\s*(.+?)(?:\n|$)/i);
      const subject = subjectMatch ? subjectMatch[1].trim() : `Quote from ${businessProfile?.companyName || "QuotePro"}`;
      const bodyText = subjectMatch ? aiDraft.replace(/^Subject:\s*.+?\n+/i, "").trim() : aiDraft;

      const payload = { to: recipientEmail, subject, body: bodyText, customerId: quote.customerId, quoteId: quote.id, includeQuoteLink: true };

      const res = await apiRequest("POST", "/api/send/email", payload);
      const data = await res.json();

      if (data.success) {
        setSendSuccess("Email sent!");
        sendMutation.mutate({ channel: "email", content: aiDraft });
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Alert.alert("Send Failed", data.message || "Could not send email. Please try again.");
      }
    } catch (err: any) {
      const msg = err?.message || "Could not send email.";
      if (msg.includes("503") || msg.includes("not configured")) {
        Alert.alert("Service Not Connected", "Email service isn't set up yet. You can still copy the message and send it manually.");
      } else {
        Alert.alert("Send Failed", "Could not send email. You can copy it and send manually.");
      }
    } finally {
      setSendingDraft(false);
    }
  };

  const [pdfLoading, setPdfLoading] = useState(false);

  const handleExportPdf = async () => {
    if (!quote) return;
    setPdfLoading(true);
    try {
      const res = await apiRequest("GET", `/api/quotes/${quote.id}/pdf`);
      const data = await res.json();
      if (!data.html) throw new Error("No PDF data");

      if (Platform.OS === "web") {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(data.html);
          win.document.close();
          win.print();
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html: data.html });
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Quote for ${data.customerName || "Customer"}`,
          UTI: "com.adobe.pdf",
        });
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      Alert.alert("Export Failed", "Could not generate PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleCopyEmail = async () => {
    if (!quote) return;
    const name = quote.propertyDetails?.customerName || "Customer";
    const company = businessProfile?.companyName || "Our Company";
    const price = quote.total || 0;
    const po = getPaymentOptions(businessProfile?.paymentOptions);
    const enabled = getEnabledPaymentMethods(po);
    const pmLine = enabled.length > 0 ? `\n\nWe accept: ${enabled.map(({ label }) => label).join(", ")}.` : "";
    const email = `Hi ${name},\n\nThank you for your interest in ${company}!\n\nBased on your property details, we've prepared a cleaning quote for $${price.toFixed(0)}.${pmLine}\n\nPlease let us know if you'd like to proceed or have any questions.\n\nBest regards,\n${businessProfile?.senderName || company}`;
    await Clipboard.setStringAsync(email);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleSendNativeSms = async () => {
    if (!quote) return;
    const phone = quote.propertyDetails?.customerPhone;
    const name = quote.propertyDetails?.customerName || "there";
    const company = businessProfile?.companyName || "us";
    const price = quote.total || 0;
    let sms = `Hi ${name}! This is ${company}. Your cleaning quote is ready: $${price.toFixed(0)}. Reply YES to book or let us know if you have questions!`;
    if (businessProfile?.smsSignature) {
      sms += `\n\n${businessProfile.smsSignature}`;
    }

    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (!isAvailable) {
        await Clipboard.setStringAsync(sms);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert("Copied", "SMS is not available on this device. The message has been copied to your clipboard.");
        return;
      }
      await SMS.sendSMSAsync(phone ? [phone] : [], sms);
    } catch (err) {
      await Clipboard.setStringAsync(sms);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.loading}>
          <ThemedText type="body">Loading...</ThemedText>
        </View>
      </View>
    );
  }

  if (isError || !quote) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.loading}>
          <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm }}>Could not load quote</ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg, textAlign: "center" }}>
            {error?.message?.includes("401") ? "Please log in again to view this quote." : "Something went wrong. Please try again."}
          </ThemedText>
          <Pressable
            onPress={() => refetchQuote()}
            style={{ backgroundColor: theme.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.sm }}
          >
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>Retry</ThemedText>
          </Pressable>
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
  const isCommercial = quote.propertyDetails && typeof quote.propertyDetails === "object" && quote.propertyDetails.quoteType === "commercial";
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
          ...(useMaxWidth ? [{ maxWidth: 560, alignSelf: "center" as const, width: "100%" as const }] : []),
        ]}
      >
        <View
          style={[
            styles.customerCard,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}
        >
          <View style={styles.customerHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, marginRight: 8 }}>
              <ThemedText type="h3" style={{ flexShrink: 1 }}>{customerName}</ThemedText>
              {isCommercial ? <ProBadge size="medium" /> : null}
            </View>
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
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <View>
              <ThemedText type="body" style={{ color: "#FFFFFF" }}>Total</ThemedText>
              <ThemedText type="h2" style={{ color: "#FFFFFF" }}>
                ${quote.total?.toFixed(0) || "0"}
              </ThemedText>
            </View>
            {quote.paymentStatus === "paid" ? (
              <View style={{ backgroundColor: "#FFFFFF30", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  Paid
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>

        {(stripeStatus as any)?.connected && quote.paymentStatus !== "paid" ? (
          <Pressable
            onPress={handleRequestPayment}
            disabled={paymentLoading}
            style={[
              styles.detailsCard,
              {
                backgroundColor: "#635BFF",
                borderColor: "#635BFF",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: Spacing.sm,
                paddingVertical: 14,
              },
            ]}
            testID="button-request-payment"
          >
            {paymentLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather name="credit-card" size={18} color="#FFFFFF" />
            )}
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
              Copy Payment Link
            </ThemedText>
          </Pressable>
        ) : null}

        {(businessProfile.venmoHandle || businessProfile.cashappHandle) && quote.paymentStatus !== "paid" ? (
          <View style={{ flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md }}>
            {businessProfile.venmoHandle ? (
              <Pressable
                onPress={async () => {
                  await Clipboard.setStringAsync(`https://venmo.com/${businessProfile.venmoHandle}?txn=pay&amount=${quote.totalBetter || quote.totalGood || 0}`);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setSendSuccess("Venmo link copied!");
                  setTimeout(() => setSendSuccess(null), 3000);
                }}
                style={[
                  styles.detailsCard,
                  {
                    backgroundColor: "#008CFF",
                    borderColor: "#008CFF",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: Spacing.sm,
                    paddingVertical: 14,
                    flex: 1,
                    marginBottom: 0,
                  },
                ]}
                testID="button-venmo-link"
              >
                <Feather name="dollar-sign" size={18} color="#FFFFFF" />
                <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  Venmo
                </ThemedText>
              </Pressable>
            ) : null}
            {businessProfile.cashappHandle ? (
              <Pressable
                onPress={async () => {
                  await Clipboard.setStringAsync(`https://cash.app/$${businessProfile.cashappHandle}/${quote.totalBetter || quote.totalGood || 0}`);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setSendSuccess("Cash App link copied!");
                  setTimeout(() => setSendSuccess(null), 3000);
                }}
                style={[
                  styles.detailsCard,
                  {
                    backgroundColor: "#00D632",
                    borderColor: "#00D632",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: Spacing.sm,
                    paddingVertical: 14,
                    flex: 1,
                    marginBottom: 0,
                  },
                ]}
                testID="button-cashapp-link"
              >
                <Feather name="dollar-sign" size={18} color="#FFFFFF" />
                <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  Cash App
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {(() => {
          const po = getPaymentOptions(businessProfile?.paymentOptions);
          const enabled = getEnabledPaymentMethods(po);
          if (enabled.length === 0) return null;
          return (
            <View style={[styles.paymentMethodsCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm }}>
                <Feather name="credit-card" size={16} color={theme.primary} />
                <ThemedText type="body" style={{ fontWeight: "600", marginLeft: 8, color: theme.primary }}>
                  Payment Methods Accepted
                </ThemedText>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {enabled.map(({ key, label }) => (
                  <View key={key} style={[styles.paymentTag, { backgroundColor: `${theme.primary}10`, borderColor: `${theme.primary}25` }]}>
                    <Feather name={(PAYMENT_METHOD_LABELS[key]?.icon || "check") as any} size={12} color={theme.primary} />
                    <ThemedText type="caption" style={{ color: theme.primary, marginLeft: 4 }}>
                      {label}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {status === "accepted" ? (() => {
          const prefs = typeof quote.acceptedPreferences === "string"
            ? (() => { try { return JSON.parse(quote.acceptedPreferences); } catch { return null; } })()
            : quote.acceptedPreferences;
          const days = prefs?.preferredDays;
          const daysStr = Array.isArray(days) && days.length > 0 ? days.join(", ") : null;
          const optionLabel = quote.selectedOption
            ? (() => {
                const opts = typeof quote.options === "string" ? (() => { try { return JSON.parse(quote.options); } catch { return {}; } })() : (quote.options || {});
                const optVal = opts[quote.selectedOption];
                const name = optVal && typeof optVal === "object" && optVal.name ? optVal.name : quote.selectedOption;
                return name.charAt(0).toUpperCase() + name.slice(1);
              })()
            : null;
          const hasDetails = quote.acceptedFrequency || daysStr || quote.acceptedNotes || quote.acceptedSource || optionLabel;
          if (!hasDetails && !quote.acceptedAt) return null;
          return (
            <View>
              <SectionHeader title="Acceptance Details" />
              <View
                style={[
                  styles.detailsCard,
                  { backgroundColor: theme.cardBackground, borderColor: theme.border, marginBottom: Spacing.md },
                ]}
              >
                {quote.acceptedAt ? (
                  <View style={styles.detailRow}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Accepted On
                    </ThemedText>
                    <ThemedText type="body">
                      {new Date(quote.acceptedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </ThemedText>
                  </View>
                ) : null}
                {optionLabel ? (
                  <View style={styles.detailRow}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Package Selected
                    </ThemedText>
                    <ThemedText type="body" style={{ fontWeight: "600", color: theme.primary }}>
                      {optionLabel}
                    </ThemedText>
                  </View>
                ) : null}
                {quote.acceptedFrequency ? (
                  <View style={styles.detailRow}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Preferred Frequency
                    </ThemedText>
                    <ThemedText type="body" style={{ textTransform: "capitalize" }}>
                      {quote.acceptedFrequency.replace(/-/g, " ")}
                    </ThemedText>
                  </View>
                ) : null}
                {daysStr ? (
                  <View style={styles.detailRow}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Preferred Days
                    </ThemedText>
                    <ThemedText type="body">{daysStr}</ThemedText>
                  </View>
                ) : null}
                {quote.acceptedSource ? (
                  <View style={styles.detailRow}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      Source
                    </ThemedText>
                    <ThemedText type="body" style={{ textTransform: "capitalize" }}>
                      {quote.acceptedSource.replace(/_/g, " ")}
                    </ThemedText>
                  </View>
                ) : null}
                {quote.acceptedNotes ? (
                  <View style={[styles.detailRow, { flexDirection: "column", alignItems: "flex-start" }]}>
                    <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: 4 }}>
                      Customer Notes
                    </ThemedText>
                    <ThemedText type="body" style={{ backgroundColor: theme.cardBackground, padding: Spacing.sm, borderRadius: BorderRadius.sm, width: "100%" }}>
                      {quote.acceptedNotes}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })() : null}

        {status === "accepted" && recommendations && recommendations.length > 0 ? (
          <View>
            <SectionHeader title="Revenue Playbook" />
            <View style={{ gap: Spacing.sm, marginBottom: Spacing.lg }}>
              {recommendations.map((rec: any) => {
                const typeIcons: Record<string, string> = {
                  follow_up: "calendar",
                  frequency_upgrade: "trending-up",
                  addon_suggestion: "plus-circle",
                  referral_ask: "users",
                  review_request: "star",
                  seasonal_offer: "sun",
                };
                const iconName = typeIcons[rec.type] || "zap";
                const isPending = rec.status === "pending";
                const isCompleted = rec.status === "completed";
                const isDismissed = rec.status === "dismissed";

                return (
                  <View
                    key={rec.id}
                    style={[
                      styles.recommendationCard,
                      {
                        backgroundColor: theme.cardBackground,
                        borderColor: isDismissed ? theme.border : isCompleted ? theme.success : theme.border,
                        opacity: isDismissed ? 0.6 : 1,
                      },
                    ]}
                  >
                    <View style={styles.recommendationHeader}>
                      <View style={[styles.recommendationIcon, { backgroundColor: `${theme.primary}15` }]}>
                        <Feather name={iconName as any} size={16} color={theme.primary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs }}>
                          <ThemedText type="body" style={{ fontWeight: "600", flex: 1 }}>
                            {rec.title}
                          </ThemedText>
                          {isCompleted ? (
                            <Feather name="check-circle" size={16} color={theme.success} />
                          ) : isDismissed ? (
                            <View style={[styles.statusDot, { backgroundColor: theme.textSecondary }]} />
                          ) : (
                            <View style={[styles.statusDot, { backgroundColor: theme.warning }]} />
                          )}
                        </View>
                        <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                          {rec.rationale}
                        </ThemedText>
                        {rec.suggestedDate ? (
                          <ThemedText type="caption" style={{ color: theme.primary, marginTop: 4 }}>
                            Suggested: {new Date(rec.suggestedDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </ThemedText>
                        ) : null}
                      </View>
                    </View>
                    {isPending ? (
                      <View style={styles.recommendationActions}>
                        <Pressable
                          onPress={() => recommendationMutation.mutate({ id: rec.id, status: "completed" })}
                          style={[styles.recActionBtn, { backgroundColor: `${theme.success}15` }]}
                          testID={`rec-done-${rec.id}`}
                        >
                          <Feather name="check" size={14} color={theme.success} />
                          <ThemedText type="caption" style={{ color: theme.success, marginLeft: 4, fontWeight: "600" }}>
                            Mark Done
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          onPress={() => recommendationMutation.mutate({ id: rec.id, status: "dismissed" })}
                          style={[styles.recActionBtn, { backgroundColor: theme.backgroundSecondary }]}
                          testID={`rec-dismiss-${rec.id}`}
                        >
                          <Feather name="x" size={14} color={theme.textSecondary} />
                          <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 4 }}>
                            Dismiss
                          </ThemedText>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {sendSuccess ? (
          <View style={{ backgroundColor: `${theme.success}15`, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md }}>
            <ThemedText type="small" style={{ color: theme.success, textAlign: "center", fontWeight: "600" }}>
              {sendSuccess}
            </ThemedText>
          </View>
        ) : null}

        <SectionHeader title="Send This Quote" />

        {isPro ? (
          <View style={{ gap: Spacing.sm, marginBottom: Spacing.lg }}>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>
              AI writes a personalized message and sends it directly to your customer
            </ThemedText>
          </View>
        ) : (
          <Pressable onPress={() => navigation.navigate("Paywall")} testID="upgrade-prompt">
            <View style={[styles.upgradeCard, { backgroundColor: '#2F7BFF' }]}>
              <View style={styles.upgradeIconCircle}>
                <Feather name="zap" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="body" style={{ fontWeight: "700", color: "#FFFFFF" }}>
                  Send with QuotePro AI
                </ThemedText>
                <ThemedText type="small" style={{ color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
                  AI writes and sends professional emails and texts in seconds - $14.99/mo
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.8)" />
            </View>
          </Pressable>
        )}

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
            style={[styles.aiGenerateBtn, { backgroundColor: isPro ? theme.primary : theme.textSecondary }]}
            testID="ai-email-btn"
          >
            <Feather name="mail" size={16} color="#FFFFFF" />
            <ThemedText type="small" style={{ color: "#FFFFFF", marginLeft: 6, fontWeight: "600" }}>
              Write Email
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => fetchAiDraft("sms", aiDraftPurpose)}
            style={[styles.aiGenerateBtn, { backgroundColor: isPro ? theme.primary : theme.textSecondary }]}
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
              <Pressable onPress={() => { setShowAiDraft(false); setSendSuccess(null); }}>
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
                <FormattedDraftText text={aiDraft} />

                {sendSuccess ? (
                  <View style={[styles.sendSuccessBanner, { backgroundColor: `${theme.success}15` }]}>
                    <Feather name="check-circle" size={16} color={theme.success} />
                    <ThemedText type="small" style={{ color: theme.success, marginLeft: 6, fontWeight: "600" }}>
                      {sendSuccess}
                    </ThemedText>
                  </View>
                ) : null}

                <View style={styles.aiDraftActions}>
                  <Pressable
                    onPress={handleSendDraft}
                    disabled={sendingDraft || !!sendSuccess}
                    style={[
                      styles.sendButton,
                      {
                        backgroundColor: sendSuccess ? theme.textSecondary : theme.primary,
                        opacity: sendingDraft ? 0.7 : 1,
                      },
                    ]}
                    testID="send-draft-btn"
                  >
                    {sendingDraft ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Feather name="send" size={14} color="#FFFFFF" />
                    )}
                    <ThemedText type="small" style={{ color: "#FFFFFF", marginLeft: 6, fontWeight: "600" }}>
                      {sendingDraft ? "Sending..." : sendSuccess ? "Sent" : aiDraftType === "email" ? "Send Email" : "Open in Messages"}
                    </ThemedText>
                  </Pressable>

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

        <SectionHeader title="Quick Actions" />

        <View style={styles.actions}>
          {!isCommercial ? (
            <Pressable
              onPress={() => {
                navigation.navigate("QuoteCalculator", {
                  editQuoteId: quote.id,
                  editQuoteData: quote,
                });
              }}
              style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
              testID="edit-quote-btn"
            >
              <Feather name="edit-2" size={20} color={theme.primary} />
              <ThemedText type="small" style={{ marginTop: 4 }}>Edit</ThemedText>
            </Pressable>
          ) : null}

          <Pressable
            onPress={handleCopyEmail}
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            testID="copy-email-btn"
          >
            <Feather name="mail" size={20} color={theme.primary} />
            <ThemedText type="small" style={{ marginTop: 4 }}>Copy Email</ThemedText>
          </Pressable>

          <Pressable
            onPress={handleSendNativeSms}
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            testID="send-sms-btn"
          >
            <Feather name="message-square" size={20} color={theme.primary} />
            <ThemedText type="small" style={{ marginTop: 4 }}>Text</ThemedText>
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
            onPress={handleExportPdf}
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            testID="export-pdf-btn"
          >
            {pdfLoading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Feather name="file-text" size={20} color={theme.primary} />
            )}
            <ThemedText type="small" style={{ marginTop: 4 }}>Export PDF</ThemedText>
          </Pressable>

          <Pressable
            onPress={async () => {
              const link = `${getPublicBaseUrl()}/q/${quote.publicToken}`;
              await Clipboard.setStringAsync(link);
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              setSendSuccess("Quote link copied!");
              setTimeout(() => setSendSuccess(null), 3000);
            }}
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            testID="copy-link-btn"
          >
            <Feather name="link" size={20} color={theme.primary} />
            <ThemedText type="small" style={{ marginTop: 4 }}>Copy Link</ThemedText>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            testID="delete-quote-btn"
          >
            <Feather name="trash-2" size={20} color={theme.error} />
            <ThemedText type="small" style={{ marginTop: 4, color: theme.error }}>Delete</ThemedText>
          </Pressable>
        </View>

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

        <SectionHeader title="Activity Timeline" />

        <View style={[styles.timelineCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          {(() => {
            const events: { icon: string; title: string; date: string; color: string; subtitle?: string }[] = [];

            events.push({
              icon: "plus-circle",
              title: "Created",
              date: new Date(quote.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
              color: theme.primary,
            });

            if (quote.sentAt) {
              events.push({
                icon: "send",
                title: "Sent",
                date: new Date(quote.sentAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
                color: theme.primary,
                subtitle: quote.sentVia ? `via ${quote.sentVia}` : undefined,
              });
            }

            if (quote.aiNotes && typeof quote.aiNotes === "string" && quote.aiNotes.includes("viewed_at:")) {
              const viewMatch = quote.aiNotes.match(/viewed_at:\s*(.+?)(?:\n|$)/);
              events.push({
                icon: "eye",
                title: "Viewed",
                date: viewMatch ? new Date(viewMatch[1].trim()).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Viewed",
                color: theme.success,
              });
            }

            if (quote.acceptedAt) {
              events.push({
                icon: "check-circle",
                title: "Accepted",
                date: new Date(quote.acceptedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
                color: theme.success,
              });
            }

            if (quote.declinedAt) {
              events.push({
                icon: "x-circle",
                title: "Declined",
                date: new Date(quote.declinedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
                color: theme.error,
              });
            }

            if (quote.expiresAt && new Date(quote.expiresAt) < new Date() && status !== "accepted") {
              events.push({
                icon: "clock",
                title: "Expired",
                date: new Date(quote.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
                color: theme.textSecondary,
              });
            }

            return events.map((event, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineDotColumn}>
                  <View style={[styles.timelineDot, { backgroundColor: event.color }]}>
                    <Feather name={event.icon as any} size={12} color="#FFFFFF" />
                  </View>
                  {index < events.length - 1 ? (
                    <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
                  ) : null}
                </View>
                <View style={styles.timelineContent}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>{event.title}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {event.date}
                    {event.subtitle ? ` \u2022 ${event.subtitle}` : ""}
                  </ThemedText>
                </View>
              </View>
            ));
          })()}
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
  proBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  upgradeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  upgradeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
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
  sendSuccessBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.md,
  },
  aiDraftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
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
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: "center",
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  proFeatures: {
    width: "100%",
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  proFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  upgradeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.lg,
  },
  dismissButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  paymentMethodsCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  paymentTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  timelineCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  timelineItem: {
    flexDirection: "row",
    minHeight: 48,
  },
  timelineDotColumn: {
    alignItems: "center",
    width: 28,
    marginRight: Spacing.sm,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.md,
  },
  recommendationCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  recommendationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  recommendationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recommendationActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  recActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.xs,
  },
});
