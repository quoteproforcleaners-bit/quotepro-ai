import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, Platform, ActivityIndicator, TextInput, TextInput as RNTextInput, useWindowDimensions, Modal, Linking } from "react-native";
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
import DateTimePicker from "@react-native-community/datetimepicker";
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
import { trackEvent } from "@/lib/analytics";
import FounderModal from "@/components/FounderModal";
import ReviewPromptModal from "@/components/ReviewPromptModal";
import { shouldShowFounderModal, shouldPromptReview, triggerNativeReview, markReviewPrompted } from "@/lib/growthLoop";
import { useTutorial } from "@/context/TutorialContext";
import { QUOTE_DETAIL_TOUR } from "@/lib/tourDefinitions";

type RouteParams = {
  QuoteDetail: { quoteId: string };
};

type DraftPurpose = "initial_quote" | "follow_up" | "thank_you" | "booking_confirmation" | "reschedule" | "payment_failed";

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
  const { startTour, hasCompletedTour, isActive: tourActive } = useTutorial();

  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [aiDraftType, setAiDraftType] = useState<"email" | "sms">("email");
  const [aiDraftPurpose, setAiDraftPurpose] = useState<DraftPurpose>("initial_quote");
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [showAiDraft, setShowAiDraft] = useState(false);
  const [sendingDraft, setSendingDraft] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [showReviewLinkPrompt, setShowReviewLinkPrompt] = useState(false);
  const [reviewLinkDraftInput, setReviewLinkDraftInput] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showFollowUpNudge, setShowFollowUpNudge] = useState(false);
  const [nudgeChecked, setNudgeChecked] = useState(false);
  const [showFounderModal, setShowFounderModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [growthChecked, setGrowthChecked] = useState(false);
  const [reviewRequestSending, setReviewRequestSending] = useState(false);

  const [showInvoicePacketModal, setShowInvoicePacketModal] = useState(false);
  const [invoicePacketLoading, setInvoicePacketLoading] = useState(false);
  const [invoicePacketData, setInvoicePacketData] = useState<any>(null);

  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarDuration, setCalendarDuration] = useState(120);
  const [calendarLocation, setCalendarLocation] = useState("");
  const [calendarTitle, setCalendarTitle] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [calendarResult, setCalendarResult] = useState<{ icsContent: string; googleCalendarUrl: string } | null>(null);

  const [qboCreating, setQboCreating] = useState(false);
  const [jobberSyncing, setJobberSyncing] = useState(false);

  const { data: quote, isLoading, isError, error, refetch: refetchQuote } = useQuery<any>({
    queryKey: ['/api/quotes', route.params.quoteId],
  });

  const { data: stats } = useQuery<any>({
    queryKey: ['/api/reports/stats'],
  });

  const { data: growthSettings } = useQuery<any>({
    queryKey: ['/api/growth-automation-settings'],
  });

  const { data: qboStatus } = useQuery<any>({
    queryKey: ['/api/integrations/qbo/status'],
  });

  const { data: qboInvoiceLink, refetch: refetchQboLink } = useQuery<any>({
    queryKey: ['/api/integrations/qbo/invoice-link', route.params.quoteId],
    enabled: qboStatus?.status === "connected",
  });

  const { data: jobberStatus } = useQuery<any>({
    queryKey: ['/api/integrations/jobber/status'],
  });

  const { data: jobberSyncStatus, refetch: refetchJobberSync } = useQuery<any>({
    queryKey: ['/api/integrations/jobber/sync-status', route.params.quoteId],
    enabled: jobberStatus?.connected === true,
  });

  useFocusEffect(
    useCallback(() => {
      refetchQuote();
    }, [refetchQuote])
  );

  useEffect(() => {
    if (!nudgeChecked && quote && stats && !isPro) {
      setNudgeChecked(true);
      const totalQuotes = stats.totalQuotes || stats.total || 0;
      if (totalQuotes === 1 && quote.status === "draft") {
        setShowFollowUpNudge(true);
        trackEvent("first_real_quote_completed", { quoteId: route.params.quoteId });
      }
    }
  }, [quote, stats, nudgeChecked, isPro]);

  useEffect(() => {
    if (!growthChecked && quote && stats) {
      setGrowthChecked(true);
      const isDemo = quote.isDemo === true;
      const totalQuotes = stats.totalQuotes || stats.total || 0;

      trackEvent("quote_completed", {
        quote_type: quote.quoteType || "residential",
        total: quote.selectedTotal || quote.totalPrice || 0,
        is_demo: isDemo,
        quote_number_for_user: totalQuotes,
      });

      if (isDemo) return;

      (async () => {
        if (totalQuotes === 1) {
          const showFounder = await shouldShowFounderModal();
          if (showFounder) {
            setTimeout(() => setShowFounderModal(true), 800);
          }
        }
        if (totalQuotes >= 3) {
          trackEvent("review_eligible", { quote_count: totalQuotes });
          const showReview = await shouldPromptReview(totalQuotes);
          if (showReview) {
            const nativeWorked = await triggerNativeReview();
            if (nativeWorked) {
              trackEvent("review_prompt_shown", { type: "native" });
              await markReviewPrompted();
            } else {
              setTimeout(() => setShowReviewModal(true), 800);
            }
          }
        }
      })();
    }
  }, [quote, stats, growthChecked]);

  useEffect(() => {
    if (quote && !tourActive && !hasCompletedTour(QUOTE_DETAIL_TOUR.id)) {
      const timer = setTimeout(() => startTour(QUOTE_DETAIL_TOUR), 800);
      return () => clearTimeout(timer);
    }
  }, [quote, tourActive, startTour, hasCompletedTour]);

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
    if (newStatus === "accepted" && jobberStatus?.connected === true) {
      if (jobberStatus?.autoSync) {
        setSendSuccess("Job created in Jobber");
        setTimeout(() => setSendSuccess(null), 3000);
      } else {
        setSendSuccess("Send to Jobber?");
        setTimeout(() => setSendSuccess(null), 4000);
      }
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
        if (purpose === "payment_failed") {
          trackEvent("ai_message_payment_failed_sent", {
            quoteId: quote.id,
            customerId: quote.customerId || "",
            deliveryMethod: type,
          });
        }
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

  const handleSaveReviewLink = useCallback(async () => {
    const trimmed = reviewLinkDraftInput.trim();
    if (!trimmed) return;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return;
    } catch { return; }
    try {
      await apiRequest("PUT", "/api/growth-automation-settings", {
        ...(growthSettings || {}),
        googleReviewLink: trimmed,
        includeReviewInMessages: true,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/growth-automation-settings"] });
      setShowReviewLinkPrompt(false);
      setReviewLinkDraftInput("");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn("Failed to save review link:", e);
    }
  }, [reviewLinkDraftInput, growthSettings, queryClient]);

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

  const REVIEW_REQUEST_LINES: Record<string, string> = {
    en: "After your service, would you mind leaving a quick review?",
    es: "Despu\u00e9s de su servicio, \u00bfle importar\u00eda dejarnos una rese\u00f1a r\u00e1pida?",
    pt: "Ap\u00f3s o servi\u00e7o, voc\u00ea se importaria de deixar uma avalia\u00e7\u00e3o r\u00e1pida?",
    ru: "\u041f\u043e\u0441\u043b\u0435 \u043e\u0431\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u043d\u0438\u044f, \u043d\u0435 \u043c\u043e\u0433\u043b\u0438 \u0431\u044b \u0432\u044b \u043e\u0441\u0442\u0430\u0432\u0438\u0442\u044c \u0431\u044b\u0441\u0442\u0440\u044b\u0439 \u043e\u0442\u0437\u044b\u0432?",
  };

  const getReviewAppendLine = () => {
    if (!growthSettings?.includeReviewInMessages || !growthSettings?.googleReviewLink?.trim()) return "";
    const line = REVIEW_REQUEST_LINES[communicationLanguage] || REVIEW_REQUEST_LINES.en;
    return `\n\n${line} ${growthSettings.googleReviewLink.trim()}`;
  };

  const handleCopyEmail = async () => {
    if (!quote) return;
    const name = quote.propertyDetails?.customerName || "Customer";
    const company = businessProfile?.companyName || "Our Company";
    const price = quote.total || 0;
    const po = getPaymentOptions(businessProfile?.paymentOptions);
    const enabled = getEnabledPaymentMethods(po);
    const pmLine = enabled.length > 0 ? `\n\nWe accept: ${enabled.map(({ label }) => label).join(", ")}.` : "";
    const reviewLine = getReviewAppendLine();
    const email = `Hi ${name},\n\nThank you for your interest in ${company}!\n\nBased on your property details, we've prepared a cleaning quote for $${price.toFixed(0)}.${pmLine}\n\nPlease let us know if you'd like to proceed or have any questions.${reviewLine}\n\nBest regards,\n${businessProfile?.senderName || company}`;
    await Clipboard.setStringAsync(email);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (reviewLine) trackEvent("review_link_included_in_quote", { quote_id: route.params.quoteId });
  };

  const handleSendNativeSms = async () => {
    if (!quote) return;
    const phone = quote.propertyDetails?.customerPhone;
    const name = quote.propertyDetails?.customerName || "there";
    const company = businessProfile?.companyName || "us";
    const price = quote.total || 0;
    let sms = `Hi ${name}! This is ${company}. Your cleaning quote is ready: $${price.toFixed(0)}. Reply YES to book or let us know if you have questions!`;
    const reviewLine = getReviewAppendLine();
    if (reviewLine) {
      sms += reviewLine;
      trackEvent("review_link_included_in_quote", { quote_id: route.params.quoteId });
    }
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

  const handleSendReviewRequest = async () => {
    if (!quote || !growthSettings?.googleReviewLink?.trim()) return;
    const phone = quote.propertyDetails?.customerPhone;
    const name = quote.propertyDetails?.customerName || "there";
    const company = businessProfile?.companyName || "us";
    const reviewLink = growthSettings.googleReviewLink.trim();
    const line = REVIEW_REQUEST_LINES[communicationLanguage] || REVIEW_REQUEST_LINES.en;
    const msg = `Hi ${name}! Thank you for choosing ${company}. ${line} ${reviewLink}`;

    setReviewRequestSending(true);
    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable && phone) {
        await SMS.sendSMSAsync([phone], msg);
        trackEvent("review_request_sent", { channel: "sms", language: communicationLanguage });
      } else {
        await Clipboard.setStringAsync(msg);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        trackEvent("review_request_copy_tapped", {});
        setSendSuccess("Review request copied!");
        setTimeout(() => setSendSuccess(null), 3000);
      }
    } catch {
      await Clipboard.setStringAsync(msg);
      trackEvent("review_request_copy_tapped", {});
    }
    setReviewRequestSending(false);
  };

  const handleSendReferralOffer = async () => {
    if (!quote) return;
    const phone = quote.propertyDetails?.customerPhone;
    const name = quote.propertyDetails?.customerName || "there";
    const amount = growthSettings?.referralOfferAmount || 25;
    const bookingLink = growthSettings?.referralBookingLink?.trim() || businessProfile?.bookingLink || "";
    const msg = `Hi ${name}! If you have a friend who needs a cleaner, we'll give you $${amount} off your next cleaning.${bookingLink ? ` Here's our booking link: ${bookingLink}` : ""}`;

    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable && phone) {
        await SMS.sendSMSAsync([phone], msg);
        trackEvent("referral_offer_sent", { channel: "sms" });
      } else {
        await Clipboard.setStringAsync(msg);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setSendSuccess("Referral offer copied!");
        setTimeout(() => setSendSuccess(null), 3000);
      }
    } catch {
      await Clipboard.setStringAsync(msg);
    }
  };

  const handleCreateQboInvoice = async () => {
    if (!quote || qboCreating) return;
    setQboCreating(true);
    try {
      const res = await apiRequest("POST", "/api/integrations/qbo/create-invoice", { quoteId: quote.id });
      const data = await res.json();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetchQboLink();
      Alert.alert("Invoice Created", `QuickBooks Invoice${data.docNumber ? ` #${data.docNumber}` : ""} created successfully.`);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", e.message || "Failed to create QuickBooks invoice");
    } finally {
      setQboCreating(false);
    }
  };

  const handleJobberSync = async () => {
    if (!quote || jobberSyncing) return;
    setJobberSyncing(true);
    trackEvent("jobber_sync_manual_clicked");
    try {
      const res = await apiRequest("POST", `/api/integrations/jobber/sync-quote/${quote.id}`);
      const data = await res.json();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refetchJobberSync();
      setSendSuccess(`Synced to Jobber${data.jobberJobNumber ? ` #${data.jobberJobNumber}` : ""}`);
      setTimeout(() => setSendSuccess(null), 3000);
      trackEvent("jobber_sync_success");
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setSendSuccess("Jobber sync failed — tap Retry");
      setTimeout(() => setSendSuccess(null), 4000);
      trackEvent("jobber_sync_failed");
    } finally {
      setJobberSyncing(false);
    }
  };

  const handleGenerateInvoicePacket = async () => {
    if (!quote) return;
    setInvoicePacketLoading(true);
    setInvoicePacketData(null);
    setShowInvoicePacketModal(true);
    try {
      const res = await apiRequest("POST", `/api/quotes/${quote.id}/invoice-packet`);
      const data = await res.json();
      if (data.success && data.packet) {
        setInvoicePacketData(data.packet);
      }
    } catch (err) {
      Alert.alert("Error", "Could not generate invoice packet. Please try again.");
      setShowInvoicePacketModal(false);
    } finally {
      setInvoicePacketLoading(false);
    }
  };

  const handleInvoiceDownloadPdf = async () => {
    if (!invoicePacketData?.pdfHtml) return;
    try {
      if (Platform.OS === "web") {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(invoicePacketData.pdfHtml);
          win.document.close();
          win.print();
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html: invoicePacketData.pdfHtml });
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Invoice ${invoicePacketData.invoiceNumber || ""}`,
          UTI: "com.adobe.pdf",
        });
      }
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert("Error", "Could not generate PDF.");
    }
  };

  const handleInvoiceDownloadCsv = async () => {
    if (!invoicePacketData?.csvText) return;
    try {
      await Clipboard.setStringAsync(invoicePacketData.csvText);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setSendSuccess("CSV copied to clipboard!");
      setTimeout(() => setSendSuccess(null), 3000);
    } catch {
      Alert.alert("Error", "Could not copy CSV.");
    }
  };

  const handleInvoiceCopyText = async () => {
    if (!invoicePacketData?.plainText) return;
    await Clipboard.setStringAsync(invoicePacketData.plainText);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setSendSuccess("Invoice text copied!");
    setTimeout(() => setSendSuccess(null), 3000);
  };

  const handleInvoiceEmailSelf = async () => {
    if (!invoicePacketData?.plainText || !businessProfile?.email) {
      Alert.alert("No Email", "Please add your business email in Settings first.");
      return;
    }
    try {
      const payload = {
        to: businessProfile.email,
        subject: `Invoice ${invoicePacketData.invoiceNumber || ""} - ${quote?.propertyDetails?.customerName || "Customer"}`,
        body: invoicePacketData.plainText,
      };
      const res = await apiRequest("POST", "/api/send/email", payload);
      const data = await res.json();
      if (data.success) {
        setSendSuccess("Invoice emailed to you!");
        setTimeout(() => setSendSuccess(null), 3000);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Alert.alert("Send Failed", data.message || "Could not send email.");
      }
    } catch {
      Alert.alert("Error", "Could not send email. You can copy the text and send manually.");
    }
  };

  const handleOpenCalendarModal = () => {
    if (!quote) return;
    const customerName = quote.propertyDetails?.customerName || "Customer";
    setCalendarTitle(`Cleaning - ${customerName}`);
    setCalendarLocation(quote.propertyDetails?.address || "");
    setCalendarDate(new Date());
    setCalendarDuration(120);
    setCalendarResult(null);
    setShowCalendarModal(true);
  };

  const handleCreateCalendarEvent = async () => {
    if (!quote) return;
    setCalendarLoading(true);
    try {
      const res = await apiRequest("POST", `/api/quotes/${quote.id}/calendar-event`, {
        startDatetime: calendarDate.toISOString(),
        durationMinutes: calendarDuration,
        title: calendarTitle,
        location: calendarLocation,
      });
      const data = await res.json();
      if (data.success) {
        setCalendarResult({
          icsContent: data.icsContent,
          googleCalendarUrl: data.googleCalendarUrl,
        });
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch {
      Alert.alert("Error", "Could not create calendar event. Please try again.");
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleOpenGoogleCalendar = async () => {
    if (!calendarResult?.googleCalendarUrl) return;
    try {
      if (Platform.OS === "web") {
        window.open(calendarResult.googleCalendarUrl, "_blank");
      } else {
        await WebBrowser.openBrowserAsync(calendarResult.googleCalendarUrl);
      }
    } catch {
      await Clipboard.setStringAsync(calendarResult.googleCalendarUrl);
      setSendSuccess("Google Calendar link copied!");
      setTimeout(() => setSendSuccess(null), 3000);
    }
  };

  const handleCopyIcs = async () => {
    if (!calendarResult?.icsContent) return;
    await Clipboard.setStringAsync(calendarResult.icsContent);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setSendSuccess("ICS content copied!");
    setTimeout(() => setSendSuccess(null), 3000);
  };

  const reminderTemplates = [
    {
      label: "Confirmation",
      icon: "check-circle" as const,
      getMessage: () => {
        const name = quote?.propertyDetails?.customerName || "there";
        const company = businessProfile?.companyName || "us";
        const dateStr = calendarDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
        const timeStr = calendarDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        return `Hi ${name}! This is ${company} confirming your cleaning appointment on ${dateStr} at ${timeStr}. Please let us know if you need to make any changes. See you then!`;
      },
    },
    {
      label: "24hr Reminder",
      icon: "clock" as const,
      getMessage: () => {
        const name = quote?.propertyDetails?.customerName || "there";
        const company = businessProfile?.companyName || "us";
        const timeStr = calendarDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        return `Hi ${name}! Just a friendly reminder from ${company} - your cleaning is scheduled for tomorrow at ${timeStr}. Please make sure the space is accessible. See you soon!`;
      },
    },
    {
      label: "On My Way",
      icon: "navigation" as const,
      getMessage: () => {
        const name = quote?.propertyDetails?.customerName || "there";
        const company = businessProfile?.companyName || "us";
        return `Hi ${name}! This is ${company} - I'm on my way to your place now and should arrive in about 15 minutes. See you shortly!`;
      },
    },
  ];

  const handleCopyReminder = async (message: string) => {
    await Clipboard.setStringAsync(message);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setSendSuccess("Reminder copied!");
    setTimeout(() => setSendSuccess(null), 3000);
  };

  const DURATION_OPTIONS = [
    { label: "1 hr", value: 60 },
    { label: "1.5 hr", value: 90 },
    { label: "2 hr", value: 120 },
    { label: "2.5 hr", value: 150 },
    { label: "3 hr", value: 180 },
    { label: "4 hr", value: 240 },
  ];

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
    payment_failed: "Payment Failed",
  };

  const purposeIcons: Record<DraftPurpose, string> = {
    initial_quote: "send",
    follow_up: "clock",
    thank_you: "heart",
    booking_confirmation: "check-circle",
    reschedule: "calendar",
    payment_failed: "alert-circle",
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
                  AI writes and sends professional emails and texts in seconds - $19.99/mo
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.8)" />
            </View>
          </Pressable>
        )}

        <View style={styles.purposeRow}>
          {(["initial_quote", "follow_up", "thank_you", "booking_confirmation", "reschedule", "payment_failed"] as DraftPurpose[]).map((purpose) => (
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

                {aiDraftPurpose === "thank_you" && !growthSettings?.googleReviewLink?.trim() ? (
                  showReviewLinkPrompt ? (
                    <View style={[styles.reviewLinkPrompt, { backgroundColor: `${theme.primary}08`, borderColor: `${theme.primary}20` }]}>
                      <ThemedText type="small" style={{ fontWeight: "600", marginBottom: Spacing.sm }}>
                        Add Your Google Review Link
                      </ThemedText>
                      <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
                        Paste your Google Business review URL so customers can leave reviews after you thank them.
                      </ThemedText>
                      <RNTextInput
                        value={reviewLinkDraftInput}
                        onChangeText={setReviewLinkDraftInput}
                        placeholder="https://g.page/r/your-business/review"
                        placeholderTextColor={theme.textSecondary}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                        style={{
                          borderWidth: 1,
                          borderColor: theme.border,
                          borderRadius: BorderRadius.sm,
                          paddingHorizontal: Spacing.md,
                          paddingVertical: Spacing.sm,
                          fontSize: 14,
                          color: theme.text,
                          backgroundColor: theme.backgroundSecondary,
                        }}
                        testID="input-review-link-draft"
                      />
                      <View style={{ flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm }}>
                        <Pressable
                          onPress={() => { setShowReviewLinkPrompt(false); setReviewLinkDraftInput(""); }}
                          style={[styles.reviewLinkBtn, { backgroundColor: theme.backgroundSecondary }]}
                        >
                          <ThemedText type="small" style={{ color: theme.textSecondary }}>Later</ThemedText>
                        </Pressable>
                        <Pressable
                          onPress={handleSaveReviewLink}
                          style={[styles.reviewLinkBtn, { backgroundColor: theme.primary, flex: 1, opacity: reviewLinkDraftInput.trim().length > 0 ? 1 : 0.5 }]}
                          disabled={reviewLinkDraftInput.trim().length === 0}
                          testID="button-save-review-link"
                        >
                          <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600" }}>Save</ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => setShowReviewLinkPrompt(true)}
                      style={[styles.reviewLinkSuggestion, { backgroundColor: `${theme.primary}08`, borderColor: `${theme.primary}20` }]}
                      testID="button-add-review-link-prompt"
                    >
                      <Feather name="star" size={16} color={theme.primary} />
                      <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                        <ThemedText type="small" style={{ fontWeight: "600" }}>
                          Add a Google Review link?
                        </ThemedText>
                        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                          Include it in thank you messages to collect more reviews
                        </ThemedText>
                      </View>
                      <Feather name="chevron-right" size={16} color={theme.primary} />
                    </Pressable>
                  )
                ) : null}
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
            onPress={handleGenerateInvoicePacket}
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            testID="invoice-packet-btn"
          >
            <Feather name="file-text" size={20} color={theme.primary} />
            <ThemedText type="small" style={{ marginTop: 4 }}>Invoice</ThemedText>
          </Pressable>

          <Pressable
            onPress={handleOpenCalendarModal}
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            testID="add-to-calendar-btn"
          >
            <Feather name="calendar" size={20} color={theme.primary} />
            <ThemedText type="small" style={{ marginTop: 4 }}>Calendar</ThemedText>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("AutomationsIntegrations" as any)}
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            testID="automations-btn"
          >
            <Feather name="zap" size={20} color={theme.primary} />
            <ThemedText type="small" style={{ marginTop: 4 }}>Automations</ThemedText>
          </Pressable>

          {qboStatus?.status === "connected" ? (
            qboInvoiceLink ? (
              <View
                style={[styles.actionButton, { backgroundColor: "#16a34a15" }]}
                testID="qbo-invoice-linked"
              >
                <Feather name="check-circle" size={20} color="#16a34a" />
                <ThemedText type="small" style={{ marginTop: 4, color: "#16a34a" }}>
                  QB #{qboInvoiceLink.qboDocNumber || "Synced"}
                </ThemedText>
              </View>
            ) : (
              <Pressable
                onPress={handleCreateQboInvoice}
                style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
                testID="qbo-create-invoice-btn"
                disabled={qboCreating}
              >
                {qboCreating ? (
                  <ActivityIndicator size={20} color={theme.primary} />
                ) : (
                  <Feather name="book-open" size={20} color={theme.primary} />
                )}
                <ThemedText type="small" style={{ marginTop: 4 }}>QuickBooks</ThemedText>
              </Pressable>
            )
          ) : null}

          {jobberStatus?.connected === true ? (
            jobberSyncStatus?.syncStatus === "success" ? (
              <View
                style={[styles.actionButton, { backgroundColor: "#16a34a15" }]}
                testID="jobber-synced"
              >
                <Feather name="check-circle" size={20} color="#16a34a" />
                <ThemedText type="small" style={{ marginTop: 4, color: "#16a34a" }}>
                  Jobber {jobberSyncStatus.jobberJobNumber ? `#${jobberSyncStatus.jobberJobNumber}` : "Synced"}
                </ThemedText>
              </View>
            ) : jobberSyncStatus?.syncStatus === "failed" ? (
              <Pressable
                onPress={handleJobberSync}
                style={[styles.actionButton, { backgroundColor: `${theme.error}10` }]}
                testID="jobber-retry-btn"
                disabled={jobberSyncing}
              >
                {jobberSyncing ? (
                  <ActivityIndicator size={20} color={theme.error} />
                ) : (
                  <Feather name="refresh-cw" size={20} color={theme.error} />
                )}
                <ThemedText type="small" style={{ marginTop: 4, color: theme.error }}>Retry Jobber</ThemedText>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleJobberSync}
                style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
                testID="jobber-sync-btn"
                disabled={jobberSyncing}
              >
                {jobberSyncing ? (
                  <ActivityIndicator size={20} color={theme.primary} />
                ) : (
                  <Feather name="briefcase" size={20} color={theme.primary} />
                )}
                <ThemedText type="small" style={{ marginTop: 4 }}>Jobber</ThemedText>
              </Pressable>
            )
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

        <SectionHeader title="Jobber Sync" />
        <View
          style={[
            styles.detailsCard,
            { backgroundColor: theme.cardBackground, borderColor: theme.border, marginBottom: Spacing.md },
          ]}
          testID="jobber-sync-card"
        >
          {jobberStatus?.connected !== true ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${theme.primary}15`, alignItems: "center", justifyContent: "center" }}>
                <Feather name="briefcase" size={18} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Connect Jobber to sync accepted quotes into your operations workflow.
                </ThemedText>
              </View>
            </View>
          ) : jobberSyncing ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
              <ActivityIndicator size="small" color={theme.primary} />
              <ThemedText type="body" style={{ fontWeight: "600" }}>Syncing...</ThemedText>
            </View>
          ) : jobberSyncStatus?.syncStatus === "success" ? (
            <View style={{ gap: Spacing.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                <Feather name="briefcase" size={18} color={theme.success} />
                <ThemedText type="body" style={{ fontWeight: "600", flex: 1 }}>Jobber</ThemedText>
                <View style={{ backgroundColor: `${theme.success}15`, paddingHorizontal: 10, paddingVertical: 3, borderRadius: BorderRadius.full }}>
                  <ThemedText type="caption" style={{ color: theme.success, fontWeight: "600" }}>Synced</ThemedText>
                </View>
              </View>
              {jobberSyncStatus.jobberJobNumber ? (
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Job #{jobberSyncStatus.jobberJobNumber}
                </ThemedText>
              ) : null}
              {jobberSyncStatus.createdAt ? (
                <ThemedText type="caption" style={{ color: theme.textMuted }}>
                  {new Date(jobberSyncStatus.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                </ThemedText>
              ) : null}
            </View>
          ) : jobberSyncStatus?.syncStatus === "failed" ? (
            <View style={{ gap: Spacing.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                <Feather name="briefcase" size={18} color={theme.error} />
                <ThemedText type="body" style={{ fontWeight: "600", flex: 1 }}>Jobber</ThemedText>
                <View style={{ backgroundColor: `${theme.error}15`, paddingHorizontal: 10, paddingVertical: 3, borderRadius: BorderRadius.full }}>
                  <ThemedText type="caption" style={{ color: theme.error, fontWeight: "600" }}>Failed</ThemedText>
                </View>
              </View>
              {jobberSyncStatus.errorMessage ? (
                <ThemedText type="small" style={{ color: theme.error }}>
                  {jobberSyncStatus.errorMessage}
                </ThemedText>
              ) : null}
              <Pressable
                onPress={handleJobberSync}
                style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs, alignSelf: "flex-start", paddingVertical: Spacing.xs }}
                testID="jobber-sync-retry-btn"
              >
                <Feather name="refresh-cw" size={14} color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>Retry Sync</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${theme.primary}15`, alignItems: "center", justifyContent: "center" }}>
                <Feather name="briefcase" size={18} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>Jobber</ThemedText>
                  <View style={{ backgroundColor: `${theme.warning}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full }}>
                    <ThemedText type="caption" style={{ color: theme.warning, fontWeight: "600" }}>Not Synced</ThemedText>
                  </View>
                </View>
              </View>
            </View>
          )}
          {jobberStatus?.connected !== true ? (
            <Pressable
              onPress={() => {
                trackEvent("jobber_connect_cta_clicked", { source: "quote_detail" });
                navigation.navigate("JobberSettings" as any);
              }}
              style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs, marginTop: Spacing.md, alignSelf: "flex-start" }}
              testID="jobber-connect-btn"
            >
              <Feather name="link" size={14} color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>Connect Jobber</ThemedText>
            </Pressable>
          ) : !jobberSyncing && jobberSyncStatus?.syncStatus !== "success" && jobberSyncStatus?.syncStatus !== "failed" ? (
            <Pressable
              onPress={handleJobberSync}
              style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs, marginTop: Spacing.md, alignSelf: "flex-start" }}
              testID="jobber-send-btn"
            >
              <Feather name="send" size={14} color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>Send to Jobber</ThemedText>
            </Pressable>
          ) : null}
        </View>

        {growthSettings?.googleReviewLink?.trim() && (status === "accepted" || status === "sent") ? (
          <>
            <SectionHeader title="Review & Referral" />
            <View style={{ flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md }}>
              <Pressable
                onPress={handleSendReviewRequest}
                style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary, flex: 1, paddingVertical: Spacing.md }]}
                testID="send-review-request-btn"
              >
                {reviewRequestSending ? (
                  <ActivityIndicator size="small" color={theme.warning} />
                ) : (
                  <Feather name="star" size={20} color={theme.warning} />
                )}
                <ThemedText type="small" style={{ marginTop: 4, textAlign: "center" }}>Send Review Request</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSendReferralOffer}
                style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary, flex: 1, paddingVertical: Spacing.md }]}
                testID="send-referral-offer-btn"
              >
                <Feather name="gift" size={20} color={theme.primary} />
                <ThemedText type="small" style={{ marginTop: 4, textAlign: "center" }}>Send Referral Offer</ThemedText>
              </Pressable>
            </View>
          </>
        ) : null}

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

      <Modal
        visible={showFollowUpNudge}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFollowUpNudge(false)}
      >
        <View style={styles.nudgeOverlay}>
          <View style={[styles.nudgeContent, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.nudgeIconCircle, { backgroundColor: `${theme.primary}15` }]}>
              <Feather name="message-circle" size={28} color={theme.primary} />
            </View>
            <ThemedText type="h4" style={{ textAlign: "center", marginTop: Spacing.lg }}>
              Want QuotePro to generate the follow-up message that closes this job?
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
              AI-crafted follow-ups get 3x more responses than generic templates
            </ThemedText>
            <Pressable
              onPress={() => {
                setShowFollowUpNudge(false);
                if (!isPro) {
                  navigation.navigate("Paywall", { trigger_source: "follow_up_nudge" });
                } else {
                  fetchAiDraft("email", "follow_up");
                }
              }}
              style={[styles.nudgeCta, { backgroundColor: theme.primary }]}
              testID="button-nudge-generate"
            >
              <Feather name="zap" size={16} color="#FFFFFF" />
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: Spacing.sm }}>
                {isPro ? "Generate Follow-Up" : "Generate (Pro)"}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setShowFollowUpNudge(false)}
              style={styles.nudgeDismiss}
              testID="button-nudge-dismiss"
            >
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Not now
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showInvoicePacketModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInvoicePacketModal(false)}
      >
        <View style={styles.invoiceOverlay}>
          <View style={[styles.invoiceContent, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.invoiceHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                <View style={[styles.invoiceIconCircle, { backgroundColor: `${theme.primary}15` }]}>
                  <Feather name="file-text" size={20} color={theme.primary} />
                </View>
                <ThemedText type="h4">Invoice Packet</ThemedText>
              </View>
              <Pressable onPress={() => setShowInvoicePacketModal(false)} testID="close-invoice-modal">
                <Feather name="x" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>

            {invoicePacketLoading ? (
              <View style={styles.invoiceLoading}>
                <ActivityIndicator size="large" color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                  Generating invoice packet...
                </ThemedText>
              </View>
            ) : invoicePacketData ? (
              <View style={{ gap: Spacing.sm }}>
                <View style={[styles.invoiceInfoRow, { backgroundColor: `${theme.success}10`, borderColor: `${theme.success}25` }]}>
                  <Feather name="check-circle" size={16} color={theme.success} />
                  <ThemedText type="small" style={{ color: theme.success, marginLeft: Spacing.sm, fontWeight: "600" }}>
                    Invoice {invoicePacketData.invoiceNumber} generated
                  </ThemedText>
                </View>

                <Pressable
                  onPress={handleInvoiceDownloadPdf}
                  style={[styles.invoiceActionBtn, { backgroundColor: theme.primary }]}
                  testID="invoice-download-pdf"
                >
                  <Feather name="download" size={18} color="#FFFFFF" />
                  <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.sm }}>
                    Download PDF
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={handleInvoiceDownloadCsv}
                  style={[styles.invoiceActionBtn, { backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border }]}
                  testID="invoice-download-csv"
                >
                  <Feather name="grid" size={18} color={theme.text} />
                  <ThemedText type="body" style={{ fontWeight: "600", marginLeft: Spacing.sm }}>
                    Copy CSV (QuickBooks)
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={handleInvoiceCopyText}
                  style={[styles.invoiceActionBtn, { backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border }]}
                  testID="invoice-copy-text"
                >
                  <Feather name="copy" size={18} color={theme.text} />
                  <ThemedText type="body" style={{ fontWeight: "600", marginLeft: Spacing.sm }}>
                    Copy Text
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={handleInvoiceEmailSelf}
                  style={[styles.invoiceActionBtn, { backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border }]}
                  testID="invoice-email-self"
                >
                  <Feather name="mail" size={18} color={theme.text} />
                  <ThemedText type="body" style={{ fontWeight: "600", marginLeft: Spacing.sm }}>
                    Email to Myself
                  </ThemedText>
                </Pressable>

                <View style={[styles.invoiceDisclaimer, { backgroundColor: `${theme.warning}10` }]}>
                  <Feather name="info" size={14} color={theme.warning} />
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: Spacing.xs, flex: 1 }}>
                    Designed for easy entry/import into QuickBooks. Not a live sync.
                  </ThemedText>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCalendarModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <View style={styles.invoiceOverlay}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: Spacing.xl }}>
            <View style={[styles.calendarContent, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.invoiceHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                  <View style={[styles.invoiceIconCircle, { backgroundColor: `${theme.primary}15` }]}>
                    <Feather name="calendar" size={20} color={theme.primary} />
                  </View>
                  <ThemedText type="h4">Add to Calendar</ThemedText>
                </View>
                <Pressable onPress={() => setShowCalendarModal(false)} testID="close-calendar-modal">
                  <Feather name="x" size={22} color={theme.textSecondary} />
                </Pressable>
              </View>

              {calendarResult ? (
                <View style={{ gap: Spacing.sm }}>
                  <View style={[styles.invoiceInfoRow, { backgroundColor: `${theme.success}10`, borderColor: `${theme.success}25` }]}>
                    <Feather name="check-circle" size={16} color={theme.success} />
                    <ThemedText type="small" style={{ color: theme.success, marginLeft: Spacing.sm, fontWeight: "600" }}>
                      Calendar event created
                    </ThemedText>
                  </View>

                  <Pressable
                    onPress={handleOpenGoogleCalendar}
                    style={[styles.invoiceActionBtn, { backgroundColor: theme.primary }]}
                    testID="open-google-calendar"
                  >
                    <Feather name="external-link" size={18} color="#FFFFFF" />
                    <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.sm }}>
                      Open in Google Calendar
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    onPress={handleCopyIcs}
                    style={[styles.invoiceActionBtn, { backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border }]}
                    testID="copy-ics"
                  >
                    <Feather name="copy" size={18} color={theme.text} />
                    <ThemedText type="body" style={{ fontWeight: "600", marginLeft: Spacing.sm }}>
                      Copy ICS Data
                    </ThemedText>
                  </Pressable>

                  <View style={{ marginTop: Spacing.md }}>
                    <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm }}>
                      Reminder Templates
                    </ThemedText>
                    {reminderTemplates.map((tmpl) => (
                      <Pressable
                        key={tmpl.label}
                        onPress={() => handleCopyReminder(tmpl.getMessage())}
                        style={[styles.reminderCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                        testID={`reminder-${tmpl.label.toLowerCase().replace(/\s/g, "-")}`}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                          <View style={[styles.reminderIcon, { backgroundColor: `${theme.primary}15` }]}>
                            <Feather name={tmpl.icon} size={14} color={theme.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <ThemedText type="small" style={{ fontWeight: "600" }}>{tmpl.label}</ThemedText>
                            <ThemedText type="caption" style={{ color: theme.textSecondary }} numberOfLines={2}>
                              {tmpl.getMessage()}
                            </ThemedText>
                          </View>
                          <Feather name="copy" size={16} color={theme.textSecondary} />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={{ gap: Spacing.md }}>
                  <View>
                    <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>
                      Title
                    </ThemedText>
                    <TextInput
                      value={calendarTitle}
                      onChangeText={setCalendarTitle}
                      style={[styles.calendarInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
                      placeholderTextColor={theme.textMuted}
                      testID="calendar-title-input"
                    />
                  </View>

                  <View>
                    <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>
                      Date
                    </ThemedText>
                    <Pressable
                      onPress={() => setShowDatePicker(true)}
                      style={[styles.calendarInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, justifyContent: "center" }]}
                      testID="calendar-date-picker"
                    >
                      <ThemedText type="body">
                        {calendarDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                      </ThemedText>
                    </Pressable>
                    {showDatePicker ? (
                      <DateTimePicker
                        value={calendarDate}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={(event: any, date?: Date) => {
                          setShowDatePicker(Platform.OS === "ios");
                          if (date) {
                            const updated = new Date(calendarDate);
                            updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                            setCalendarDate(updated);
                          }
                        }}
                        testID="calendar-date-picker-native"
                      />
                    ) : null}
                  </View>

                  <View>
                    <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>
                      Time
                    </ThemedText>
                    <Pressable
                      onPress={() => setShowTimePicker(true)}
                      style={[styles.calendarInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, justifyContent: "center" }]}
                      testID="calendar-time-picker"
                    >
                      <ThemedText type="body">
                        {calendarDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      </ThemedText>
                    </Pressable>
                    {showTimePicker ? (
                      <DateTimePicker
                        value={calendarDate}
                        mode="time"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={(event: any, date?: Date) => {
                          setShowTimePicker(Platform.OS === "ios");
                          if (date) {
                            const updated = new Date(calendarDate);
                            updated.setHours(date.getHours(), date.getMinutes());
                            setCalendarDate(updated);
                          }
                        }}
                        testID="calendar-time-picker-native"
                      />
                    ) : null}
                  </View>

                  <View>
                    <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>
                      Duration
                    </ThemedText>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs }}>
                      {DURATION_OPTIONS.map((opt) => (
                        <Pressable
                          key={opt.value}
                          onPress={() => setCalendarDuration(opt.value)}
                          style={[
                            styles.durationChip,
                            {
                              backgroundColor: calendarDuration === opt.value ? theme.primary : theme.backgroundSecondary,
                            },
                          ]}
                          testID={`duration-${opt.value}`}
                        >
                          <ThemedText
                            type="caption"
                            style={{
                              color: calendarDuration === opt.value ? "#FFFFFF" : theme.text,
                              fontWeight: calendarDuration === opt.value ? "600" : "400",
                            }}
                          >
                            {opt.label}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View>
                    <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>
                      Location
                    </ThemedText>
                    <TextInput
                      value={calendarLocation}
                      onChangeText={setCalendarLocation}
                      style={[styles.calendarInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
                      placeholder="Service address"
                      placeholderTextColor={theme.textMuted}
                      testID="calendar-location-input"
                    />
                  </View>

                  <Pressable
                    onPress={handleCreateCalendarEvent}
                    disabled={calendarLoading}
                    style={[styles.invoiceActionBtn, { backgroundColor: theme.primary, opacity: calendarLoading ? 0.7 : 1 }]}
                    testID="create-calendar-event-btn"
                  >
                    {calendarLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Feather name="calendar" size={18} color="#FFFFFF" />
                    )}
                    <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.sm }}>
                      {calendarLoading ? "Creating..." : "Create Event"}
                    </ThemedText>
                  </Pressable>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      <FounderModal
        visible={showFounderModal}
        onDismiss={() => setShowFounderModal(false)}
        trigger="first_quote"
      />

      <ReviewPromptModal
        visible={showReviewModal}
        onDismiss={() => setShowReviewModal(false)}
      />

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
  nudgeOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  nudgeContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: BorderRadius.md,
    padding: Spacing["2xl"],
    alignItems: "center",
  },
  nudgeIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  nudgeCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.lg,
  },
  nudgeDismiss: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  invoiceOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  invoiceContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
  },
  invoiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  invoiceIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  invoiceLoading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["3xl"],
  },
  invoiceInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  invoiceActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
  invoiceDisclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.xs,
  },
  calendarContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignSelf: "center",
  },
  calendarInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  durationChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  reminderCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  reminderIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewLinkPrompt: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  reviewLinkSuggestion: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  reviewLinkBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
});
