import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, Platform, ActivityIndicator, TextInput, TextInput as RNTextInput, useWindowDimensions, Modal, Linking } from "react-native";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as StoreReview from "expo-store-review";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { SmsSendModal } from "@/components/SmsSendModal";
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
import { shouldShowFounderModal, shouldPromptReview, triggerNativeReview, markReviewPrompted, markHasEverMadeQuote } from "@/lib/growthLoop";
import { useTutorial } from "@/context/TutorialContext";
import { QUOTE_DETAIL_TOUR } from "@/lib/tourDefinitions";
import { QuickAddCleanModal } from "@/components/QuickAddCleanModal";

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

  const [smsModalOpen, setSmsModalOpen] = useState(false);
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

  const [showScheduleJobModal, setShowScheduleJobModal] = useState(false);

  const [qboCreating, setQboCreating] = useState(false);
  const [stripeInvoiceSending, setStripeInvoiceSending] = useState(false);
  const [showFollowUpEdit, setShowFollowUpEdit] = useState(false);
  const [followUpEditText, setFollowUpEditText] = useState("");
  const [followUpEditLoading, setFollowUpEditLoading] = useState(false);
  const [followUpSendingNow, setFollowUpSendingNow] = useState(false);
  const [showTimingPicker, setShowTimingPicker] = useState(false);

  const [clientNarrative, setClientNarrative] = useState<string | null>(null);
  const [clientNarrativeLoading, setClientNarrativeLoading] = useState(false);
  const [clientNarrativeCopied, setClientNarrativeCopied] = useState(false);

  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [doctorResult, setDoctorResult] = useState<{
    verdict: string;
    suggested_range_low: number;
    suggested_range_high: number;
    coaching_note: string;
    margin_risk: string;
  } | null>(null);
  const [doctorCustomPrice, setDoctorCustomPrice] = useState(0);
  const [doctorApplying, setDoctorApplying] = useState(false);
  const [doctorToast, setDoctorToast] = useState<string | null>(null);

  const { data: quote, isLoading, isError, error, refetch: refetchQuote } = useQuery<any>({
    queryKey: ['/api/quotes', route.params.quoteId],
  });

  const { data: stats } = useQuery<any>({
    queryKey: ['/api/reports/stats'],
  });

  const { data: linkedJobs = [] } = useQuery<any[]>({
    queryKey: ['/api/jobs', { quoteId: route.params.quoteId }],
    queryFn: async () => {
      const url = new URL(`/api/jobs`, getApiUrl());
      url.searchParams.set("quoteId", route.params.quoteId);
      const res = await fetch(url.toString(), { credentials: "include" });
      return res.json();
    },
    enabled: !!route.params.quoteId,
  });
  const linkedJob = linkedJobs?.[0] || null;

  const { data: growthSettings } = useQuery<any>({
    queryKey: ['/api/growth-automation-settings'],
  });

  const { data: qboStatus } = useQuery<any>({
    queryKey: ['/api/integrations/qbo/status'],
  });

  const { data: automationRules, refetch: refetchAutomation } = useQuery<any>({
    queryKey: ['/api/automations'],
  });

  const { data: scheduledFollowUps, refetch: refetchFollowUps } = useQuery<any[]>({
    queryKey: ['/api/quotes', route.params.quoteId, 'scheduled-followups'],
    queryFn: async () => {
      const url = new URL(`/api/quotes/${route.params.quoteId}/scheduled-followups`, getApiUrl());
      const res = await fetch(url.toString(), { credentials: 'include' });
      return res.json();
    },
    enabled: !!quote && quote.status === 'sent',
    refetchInterval: 30000,
  });

  const { data: qboInvoiceLink, refetch: refetchQboLink } = useQuery<any>({
    queryKey: ['/api/integrations/qbo/invoice-link', route.params.quoteId],
    enabled: qboStatus?.status === "connected",
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
        total: quote.total || 0,
        is_demo: isDemo,
        quote_number_for_user: totalQuotes,
      });

      if (isDemo) return;

      (async () => {
        // Persist a device-level flag so we never re-show the founder modal
        // to an established user after a tier downgrade or quote-counter reset.
        await markHasEverMadeQuote();

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
    updateMutation.mutate(data, {
      onSuccess: () => {
        if (newStatus === "accepted" && !linkedJob) {
          setTimeout(() => setShowScheduleJobModal(true), 500);
        }
        if (newStatus === "accepted") {
          // App Store review: request once after first quote accepted
          AsyncStorage.getItem("review_requested").then((val) => {
            if (!val && Platform.OS !== "web") {
              setTimeout(async () => {
                try {
                  const isAvailable = await StoreReview.isAvailableAsync();
                  if (isAvailable) {
                    await StoreReview.requestReview();
                    await AsyncStorage.setItem("review_requested", "true");
                  }
                } catch {}
              }, 2000);
            }
          }).catch(() => {});
        }
      },
    });
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


  const handleOpenDoctor = useCallback(async () => {
    if (!quote) return;
    const currentTotal = quote.total || 0;
    setDoctorCustomPrice(currentTotal);
    setDoctorResult(null);
    setDoctorLoading(true);
    setShowDoctorModal(true);
    try {
      const res = await apiRequest("POST", "/api/quote-doctor/analyze", {
        quoteAmount: currentTotal,
        bedrooms: quote.propertyBeds || 0,
        bathrooms: quote.propertyBaths || 0,
        sqft: quote.propertySqft || 0,
        frequency: quote.frequencySelected || "one-time",
        city: (quote.propertyDetails?.customerAddress || "").split(",").slice(-2, -1)[0]?.trim() || undefined,
        state: (quote.propertyDetails?.customerAddress || "").split(",").slice(-1)[0]?.trim() || undefined,
      });
      const data = await res.json();
      setDoctorResult(data);
      const midpoint = Math.round(((data.suggested_range_low || currentTotal) + (data.suggested_range_high || currentTotal)) / 2);
      setDoctorCustomPrice(midpoint);
    } catch {
      setDoctorResult(null);
    } finally {
      setDoctorLoading(false);
    }
  }, [quote]);

  const handleApplyDoctorPrice = useCallback(async () => {
    if (!doctorCustomPrice) return;
    setDoctorApplying(true);
    try {
      await new Promise<void>((resolve, reject) => {
        updateMutation.mutate(
          { total: doctorCustomPrice },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['/api/quotes', route.params.quoteId] });
              resolve();
            },
            onError: reject,
          }
        );
      });
      setShowDoctorModal(false);
      setDoctorToast(`Price updated to $${doctorCustomPrice.toFixed(0)}`);
      setTimeout(() => setDoctorToast(null), 3000);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert("Error", "Failed to update price. Please try again.");
    } finally {
      setDoctorApplying(false);
    }
  }, [doctorCustomPrice, updateMutation, queryClient, route.params.quoteId]);

  const generateClientNarrative = useCallback(async () => {
    if (!quote) return;
    setClientNarrativeLoading(true);
    setClientNarrative(null);
    try {
      const url = new URL("/api/quote-doctor/client-narrative", getApiUrl());
      const res = await apiRequest("POST", url.toString(), {
        bedrooms: quote.propertyBeds || 0,
        bathrooms: quote.propertyBaths || 0,
        sqft: quote.propertySqft || 0,
        frequency: quote.frequencySelected || "one-time",
        amount: quote.total || 0,
      });
      const data = await res.json();
      if (data.narrative) {
        setClientNarrative(data.narrative);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setClientNarrative(data.error || "Unable to generate message.");
      }
    } catch {
      setClientNarrative("Unable to generate message. Please try again.");
    } finally {
      setClientNarrativeLoading(false);
    }
  }, [quote]);

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



  const handleSendStripeInvoice = async () => {
    if (!quote || stripeInvoiceSending) return;
    setStripeInvoiceSending(true);
    try {
      const res = await apiRequest("POST", `/api/quotes/${quote.id}/invoice`, {});
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send invoice");
      setSendSuccess(`Invoice sent to ${data.email}`);
      setTimeout(() => setSendSuccess(null), 4000);
      queryClient.invalidateQueries({ queryKey: [`/api/quotes/${route.params.quoteId}`] });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Invoice Error", e.message || "Could not send invoice. Please try again.");
    } finally {
      setStripeInvoiceSending(false);
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
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: Spacing.sm }}>
              <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
                {quote.propertyDetails.customerPhone}
              </ThemedText>
              <Pressable
                onPress={() => setSmsModalOpen(true)}
                style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, borderWidth: 1, borderColor: theme.primary, backgroundColor: theme.primarySoft }}
                testID="quote-send-text"
              >
                <Feather name="message-circle" size={13} color={theme.primary} />
                <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600", marginLeft: 4 }}>Text</ThemedText>
              </Pressable>
            </View>
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
                    {opt.name || (key.charAt(0).toUpperCase() + key.slice(1))}
                  </ThemedText>
                  {isSelected ? (
                    <Feather name="check-circle" size={18} color={theme.primary} />
                  ) : null}
                </View>
                {(opt.serviceTypeName || opt.scope) ? (
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {opt.serviceTypeName || opt.scope}
                  </ThemedText>
                ) : null}
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

        {/* National Benchmark Warning (shown after QuoteDoctor result) */}
        {doctorResult && doctorResult.verdict === "too_high" ? (() => {
          const abovePct = Math.round(((quote.total || 0) - doctorResult.suggested_range_high) / doctorResult.suggested_range_high * 100);
          return abovePct > 0 ? (
            <View style={[styles.benchmarkCard, { backgroundColor: `${theme.error}10`, borderColor: `${theme.error}30` }]}>
              <Feather name="alert-triangle" size={14} color={theme.error} />
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <ThemedText type="small" style={{ fontWeight: "700", color: theme.error }}>National Benchmark</ThemedText>
                <ThemedText type="caption" style={{ color: theme.error, marginTop: 2 }}>
                  {abovePct}% above national high — review your pricing
                </ThemedText>
              </View>
            </View>
          ) : null;
        })() : null}

        {/* QuoteDoctor Card */}
        <View style={[styles.doctorCard, { backgroundColor: theme.primary }]}>
          <View style={styles.doctorCardHeader}>
            <View style={[styles.doctorIconCircle, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
              <Feather name="activity" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700" }}>QuoteDoctor</ThemedText>
              <ThemedText type="caption" style={{ color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
                AI-optimize your price before sending
              </ThemedText>
            </View>
          </View>
          <Pressable
            onPress={handleOpenDoctor}
            style={[styles.doctorBtn, { backgroundColor: "rgba(255,255,255,0.2)" }]}
            testID="button-optimize-price-ai"
          >
            <Feather name="zap" size={14} color="#FFFFFF" />
            <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: 6 }}>
              Optimize Price with AI
            </ThemedText>
          </Pressable>
        </View>

        {/* Generate Client Message */}
        <Pressable
          onPress={generateClientNarrative}
          disabled={clientNarrativeLoading}
          testID="button-generate-client-message"
          style={[
            styles.detailsCard,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: Spacing.sm,
              paddingVertical: 14,
            },
          ]}
        >
          {clientNarrativeLoading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Feather name="edit-3" size={16} color={theme.primary} />
          )}
          <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
            {clientNarrativeLoading ? "Writing message..." : "Generate Client Message"}
          </ThemedText>
        </Pressable>

        {clientNarrative ? (
          <View
            style={[
              styles.detailsCard,
              { backgroundColor: theme.cardBackground, borderColor: theme.border, gap: Spacing.md },
            ]}
          >
            <TextInput
              multiline
              editable={false}
              value={clientNarrative}
              style={{
                color: theme.text,
                fontSize: 15,
                lineHeight: 23,
                fontFamily: "System",
              }}
              testID="text-client-narrative"
            />
            <Pressable
              onPress={async () => {
                await Clipboard.setStringAsync(clientNarrative);
                setClientNarrativeCopied(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setTimeout(() => setClientNarrativeCopied(false), 2500);
              }}
              style={[
                styles.statusBadge,
                {
                  backgroundColor: clientNarrativeCopied ? `${theme.success}18` : `${theme.primary}12`,
                  borderColor: clientNarrativeCopied ? theme.success : theme.primary,
                  borderWidth: 1,
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                },
              ]}
              testID="button-copy-client-narrative"
            >
              <Feather
                name={clientNarrativeCopied ? "check" : "copy"}
                size={14}
                color={clientNarrativeCopied ? theme.success : theme.primary}
              />
              <ThemedText
                type="small"
                style={{ color: clientNarrativeCopied ? theme.success : theme.primary, fontWeight: "600" }}
              >
                {clientNarrativeCopied ? "Copied!" : "Copy"}
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {(stripeStatus as any)?.connected && quote.paymentStatus !== "paid" ? (
          <>
            <SectionHeader title="Customer View" />
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
                <Feather name="eye" size={18} color="#FFFFFF" />
              )}
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                Preview Customer Quote
              </ThemedText>
            </Pressable>
          </>
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

        {quote?.status === 'sent' ? (
          <>
            <SectionHeader title="Follow-Up Automation" />
            <View style={{ backgroundColor: theme.backgroundSecondary, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}>
                  <ThemedText type="body" style={{ fontWeight: '600' }}>Auto Follow-Up</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                    Automatically send a reminder if quote is not accepted
                  </ThemedText>
                </View>
                <Pressable
                  testID="followup-toggle"
                  onPress={async () => {
                    const newVal = !(automationRules?.quoteFollowupsEnabled !== false);
                    await apiRequest('PUT', '/api/automations', { quoteFollowupsEnabled: newVal });
                    refetchAutomation();
                    if (!newVal) {
                      const fus = scheduledFollowUps || [];
                      for (const fu of fus) {
                        await apiRequest('DELETE', `/api/communications/${fu.id}`);
                      }
                      refetchFollowUps();
                    }
                  }}
                  style={{
                    width: 48,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: (automationRules?.quoteFollowupsEnabled !== false) ? theme.primary : theme.border,
                    justifyContent: 'center',
                    paddingHorizontal: 2,
                  }}
                >
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: '#fff',
                    alignSelf: (automationRules?.quoteFollowupsEnabled !== false) ? 'flex-end' : 'flex-start',
                  }} />
                </Pressable>
              </View>

              {(automationRules?.quoteFollowupsEnabled !== false) ? (
                <>
                  <View style={{ height: 1, backgroundColor: theme.border }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>Timing</ThemedText>
                    <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {[
                        { label: '12h', minutes: 720 },
                        { label: '24h', minutes: 1440 },
                        { label: '48h', minutes: 2880 },
                      ].map((opt) => {
                        const currentDelay = (automationRules?.followupSchedule as any[])?.[0]?.delayMinutes ?? 1440;
                        const isActive = currentDelay === opt.minutes;
                        return (
                          <Pressable
                            key={opt.label}
                            testID={`timing-${opt.label}`}
                            onPress={async () => {
                              await apiRequest('PUT', '/api/automations', {
                                followupSchedule: [{ delayMinutes: opt.minutes, templateKey: `followup_${opt.label}` }],
                              });
                              refetchAutomation();
                            }}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 4,
                              borderRadius: 20,
                              backgroundColor: isActive ? theme.primary : theme.background,
                              borderWidth: 1,
                              borderColor: isActive ? theme.primary : theme.border,
                            }}
                          >
                            <ThemedText type="caption" style={{ color: isActive ? '#fff' : theme.text, fontWeight: isActive ? '600' : '400' }}>
                              {opt.label}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {scheduledFollowUps && scheduledFollowUps.length > 0 ? (
                    <>
                      <View style={{ height: 1, backgroundColor: theme.border }} />
                      {scheduledFollowUps.map((fu: any) => {
                        const fuDate = new Date(fu.scheduledFor);
                        const now = Date.now();
                        const diffMs = fuDate.getTime() - now;
                        const diffHrs = diffMs / (1000 * 60 * 60);
                        let timeLabel = '';
                        if (diffHrs < 1) timeLabel = 'Less than an hour';
                        else if (diffHrs < 24) timeLabel = `In ${Math.round(diffHrs)} hours`;
                        else timeLabel = `${fuDate.toLocaleDateString()} at ${fuDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                        return (
                          <View key={fu.id} style={{ gap: Spacing.xs }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                              <Feather name="clock" size={14} color={theme.primary} />
                              <ThemedText type="small" style={{ color: theme.primary, fontWeight: '600' }}>
                                Scheduled: {timeLabel}
                              </ThemedText>
                              <View style={{ marginLeft: 'auto' as any }}>
                                <ThemedText type="caption" style={{ color: theme.textSecondary, textTransform: 'capitalize' }}>
                                  via {fu.channel}
                                </ThemedText>
                              </View>
                            </View>
                            {fu.content ? (
                              <ThemedText type="caption" style={{ color: theme.textSecondary, fontStyle: 'italic' }} numberOfLines={2}>
                                {fu.content}
                              </ThemedText>
                            ) : (
                              <ThemedText type="caption" style={{ color: theme.textSecondary, fontStyle: 'italic' }}>
                                AI will generate message at send time
                              </ThemedText>
                            )}
                            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs }}>
                              <Pressable
                                testID="followup-send-now"
                                disabled={followUpSendingNow}
                                onPress={async () => {
                                  setFollowUpSendingNow(true);
                                  try {
                                    const url = new URL(`/api/communications/${fu.id}/send-now`, getApiUrl());
                                    const res = await fetch(url.toString(), { method: 'POST', credentials: 'include' });
                                    const data = await res.json();
                                    if (res.ok) {
                                      Alert.alert('Sent', 'Follow-up sent successfully.');
                                      refetchFollowUps();
                                    } else {
                                      Alert.alert('Error', data.message || 'Failed to send');
                                    }
                                  } catch {
                                    Alert.alert('Error', 'Failed to send follow-up');
                                  } finally {
                                    setFollowUpSendingNow(false);
                                  }
                                }}
                                style={{
                                  flex: 1,
                                  paddingVertical: Spacing.xs,
                                  borderRadius: BorderRadius.md,
                                  backgroundColor: theme.primary,
                                  alignItems: 'center',
                                  flexDirection: 'row',
                                  justifyContent: 'center',
                                  gap: 4,
                                }}
                              >
                                {followUpSendingNow ? (
                                  <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                  <>
                                    <Feather name="send" size={13} color="#fff" />
                                    <ThemedText type="caption" style={{ color: '#fff', fontWeight: '600' }}>Send Now</ThemedText>
                                  </>
                                )}
                              </Pressable>
                              <Pressable
                                testID="followup-edit"
                                onPress={() => {
                                  setFollowUpEditText(fu.content || '');
                                  setShowFollowUpEdit(true);
                                }}
                                style={{
                                  flex: 1,
                                  paddingVertical: Spacing.xs,
                                  borderRadius: BorderRadius.md,
                                  backgroundColor: theme.backgroundSecondary,
                                  alignItems: 'center',
                                  flexDirection: 'row',
                                  justifyContent: 'center',
                                  gap: 4,
                                  borderWidth: 1,
                                  borderColor: theme.border,
                                }}
                              >
                                <Feather name="edit-2" size={13} color={theme.text} />
                                <ThemedText type="caption" style={{ fontWeight: '600' }}>Edit</ThemedText>
                              </Pressable>
                              <Pressable
                                testID="followup-cancel"
                                onPress={() => {
                                  Alert.alert('Cancel Follow-Up', 'Are you sure you want to cancel this follow-up?', [
                                    { text: 'No', style: 'cancel' },
                                    {
                                      text: 'Yes, Cancel',
                                      style: 'destructive',
                                      onPress: async () => {
                                        const url = new URL(`/api/communications/${fu.id}`, getApiUrl());
                                        await fetch(url.toString(), { method: 'DELETE', credentials: 'include' });
                                        refetchFollowUps();
                                      },
                                    },
                                  ]);
                                }}
                                style={{
                                  paddingVertical: Spacing.xs,
                                  paddingHorizontal: Spacing.sm,
                                  borderRadius: BorderRadius.md,
                                  backgroundColor: theme.backgroundSecondary,
                                  alignItems: 'center',
                                  borderWidth: 1,
                                  borderColor: theme.border,
                                }}
                              >
                                <Feather name="x" size={14} color={theme.error} />
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </>
                  ) : (
                    <ThemedText type="caption" style={{ color: theme.textSecondary, fontStyle: 'italic' }}>
                      No follow-up scheduled. Re-send the quote to schedule one.
                    </ThemedText>
                  )}
                </>
              ) : null}
            </View>

            <Modal visible={showFollowUpEdit} animationType="slide" transparent presentationStyle="overFullScreen">
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                <View style={{ backgroundColor: theme.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg, gap: Spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <ThemedText type="body" style={{ fontWeight: '700', fontSize: 17 }}>Edit Follow-Up Message</ThemedText>
                    <Pressable onPress={() => setShowFollowUpEdit(false)}>
                      <Feather name="x" size={22} color={theme.text} />
                    </Pressable>
                  </View>
                  <TextInput
                    value={followUpEditText}
                    onChangeText={setFollowUpEditText}
                    multiline
                    numberOfLines={6}
                    placeholder="Leave empty for AI to generate at send time..."
                    placeholderTextColor={theme.textSecondary}
                    style={{
                      backgroundColor: theme.backgroundSecondary,
                      borderRadius: BorderRadius.md,
                      padding: Spacing.md,
                      color: theme.text,
                      minHeight: 120,
                      textAlignVertical: 'top',
                      fontSize: 14,
                    }}
                    testID="followup-edit-input"
                  />
                  <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                    <Pressable
                      onPress={async () => {
                        if (!isPro) { navigation.navigate('Paywall'); return; }
                        setFollowUpEditLoading(true);
                        try {
                          const fu = (scheduledFollowUps || [])[0];
                          const url = new URL(`/api/quotes/${route.params.quoteId}/followup-preview`, getApiUrl());
                          const res = await fetch(url.toString(), {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ channel: fu?.channel || 'sms' }),
                          });
                          const data = await res.json();
                          if (data.draft) setFollowUpEditText(data.draft);
                        } catch { }
                        setFollowUpEditLoading(false);
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: Spacing.sm,
                        borderRadius: BorderRadius.md,
                        backgroundColor: theme.backgroundSecondary,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 4,
                        borderWidth: 1,
                        borderColor: theme.border,
                      }}
                    >
                      {followUpEditLoading ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : (
                        <>
                          <Feather name="zap" size={14} color={theme.primary} />
                          <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '600' }}>
                            {isPro ? 'AI Generate' : 'AI (Pro)'}
                          </ThemedText>
                        </>
                      )}
                    </Pressable>
                    <Pressable
                      testID="followup-save-msg"
                      onPress={async () => {
                        const fus = scheduledFollowUps || [];
                        for (const fu of fus) {
                          const url = new URL(`/api/communications/${fu.id}`, getApiUrl());
                          await fetch(url.toString(), {
                            method: 'PUT',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: followUpEditText }),
                          });
                        }
                        refetchFollowUps();
                        setShowFollowUpEdit(false);
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: Spacing.sm,
                        borderRadius: BorderRadius.md,
                        backgroundColor: theme.primary,
                        alignItems: 'center',
                      }}
                    >
                      <ThemedText type="caption" style={{ color: '#fff', fontWeight: '600' }}>Save</ThemedText>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>
          </>
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

          {status === "accepted" && !linkedJob ? (
            <Pressable
              onPress={() => setShowScheduleJobModal(true)}
              style={[styles.actionButton, { backgroundColor: `${theme.primary}15` }]}
              testID="schedule-clean-btn"
            >
              <Feather name="calendar" size={20} color={theme.primary} />
              <ThemedText type="small" style={{ marginTop: 4, color: theme.primary, fontWeight: "700" }}>Schedule</ThemedText>
            </Pressable>
          ) : null}
          {linkedJob ? (
            <Pressable
              onPress={() => navigation.navigate("JobDetail", { jobId: linkedJob.id })}
              style={[styles.actionButton, { backgroundColor: `${theme.success}15` }]}
              testID="view-job-btn"
            >
              <Feather name="calendar" size={20} color={theme.success} />
              <ThemedText type="small" style={{ marginTop: 4, color: theme.success, fontWeight: "700" }}>View Job</ThemedText>
            </Pressable>
          ) : null}
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
            onPress={async () => {
              const link = `${getPublicBaseUrl()}/q/${quote.publicToken}`;
              await WebBrowser.openBrowserAsync(link);
            }}
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            testID="preview-quote-btn"
          >
            <Feather name="eye" size={20} color={theme.primary} />
            <ThemedText type="small" style={{ marginTop: 4 }}>Preview</ThemedText>
          </Pressable>

          <Pressable
            onPress={handleGenerateInvoicePacket}
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            testID="invoice-packet-btn"
          >
            <Feather name="file-text" size={20} color={theme.primary} />
            <ThemedText type="small" style={{ marginTop: 4 }}>Invoice</ThemedText>
          </Pressable>

          {status === "accepted" && quote?.stripeInvoiceStatus !== "paid" ? (
            <Pressable
              onPress={handleSendStripeInvoice}
              style={[styles.actionButton, { backgroundColor: `${theme.primary}15` }]}
              testID="send-stripe-invoice-btn"
            >
              {stripeInvoiceSending ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Feather name="send" size={20} color={theme.primary} />
              )}
              <ThemedText type="small" style={{ marginTop: 4, color: theme.primary, fontWeight: "700" }}>
                {quote?.stripeInvoiceStatus === "sent" || quote?.stripeInvoiceStatus === "overdue"
                  ? "Resend Inv."
                  : "Send Inv."}
              </ThemedText>
            </Pressable>
          ) : null}

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

        <SectionHeader title="Quote Settings" />
        <View style={[styles.timelineCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={{ gap: Spacing.md }}>
            <View>
              <ThemedText type="small" style={{ fontWeight: "700", marginBottom: Spacing.xs, color: theme.textSecondary }}>Expiration</ThemedText>
              <View style={{ flexDirection: "row", gap: Spacing.sm, flexWrap: "wrap" }}>
                {[
                  { label: "No Expiry", value: "none" },
                  { label: "3 Days", value: "3" },
                  { label: "7 Days", value: "7" },
                  { label: "14 Days", value: "14" },
                  { label: "30 Days", value: "30" },
                ].map((opt) => {
                  const currentDays = quote.expiresAt
                    ? Math.round((new Date(quote.expiresAt).getTime() - new Date(quote.createdAt).getTime()) / 86400000)
                    : 0;
                  const isSelected = opt.value === "none" ? !quote.expiresAt : String(currentDays) === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => {
                        const expiresAt = opt.value === "none" ? null : new Date(Date.now() + parseInt(opt.value) * 86400000).toISOString();
                        updateMutation.mutate({ expiresAt });
                      }}
                      style={{
                        paddingHorizontal: Spacing.md,
                        paddingVertical: Spacing.sm,
                        borderRadius: BorderRadius.lg,
                        borderWidth: 2,
                        borderColor: isSelected ? theme.primary : theme.border,
                        backgroundColor: isSelected ? theme.primary + "10" : "transparent",
                      }}
                      testID={`expiry-option-${opt.value}`}
                    >
                      <ThemedText type="small" style={{ fontWeight: "600", color: isSelected ? theme.primary : theme.text }}>{opt.label}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              {quote.expiresAt ? (
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                  Expires {new Date(quote.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                </ThemedText>
              ) : null}
            </View>

            <View style={{ height: 1, backgroundColor: theme.border }} />

            <View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <ThemedText type="small" style={{ fontWeight: "700", color: theme.textSecondary }}>Require Deposit</ThemedText>
                <Pressable
                  onPress={() => {
                    updateMutation.mutate({
                      depositRequired: !quote.depositRequired,
                      depositAmount: quote.depositRequired ? 0 : (quote.depositAmount || Math.round((quote.total || 0) * 0.25)),
                    });
                  }}
                  style={{
                    width: 48,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: quote.depositRequired ? theme.primary : theme.border,
                    justifyContent: "center",
                    paddingHorizontal: 2,
                  }}
                  testID="deposit-toggle"
                >
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: "#fff",
                    alignSelf: quote.depositRequired ? "flex-end" : "flex-start",
                  }} />
                </Pressable>
              </View>
              {quote.depositRequired ? (
                <View style={{ marginTop: Spacing.sm }}>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: 4 }}>Deposit Amount ($)</ThemedText>
                  <TextInput
                    value={String(quote.depositAmount || "")}
                    onChangeText={(text) => {
                      const num = parseFloat(text) || 0;
                      updateMutation.mutate({ depositAmount: num });
                    }}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    style={{
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: BorderRadius.md,
                      padding: Spacing.sm,
                      fontSize: 15,
                      color: theme.text,
                      backgroundColor: theme.background,
                    }}
                    testID="deposit-amount-input"
                  />
                  {quote.depositPaid ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: Spacing.xs }}>
                      <Feather name="check-circle" size={14} color="#16A34A" />
                      <ThemedText type="small" style={{ color: "#16A34A", fontWeight: "600" }}>Deposit Paid</ThemedText>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          </View>
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

            if (quote.viewedAt) {
              events.push({
                icon: "eye",
                title: "Viewed by Customer",
                date: new Date(quote.viewedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
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

      {/* QuoteDoctor AI Modal */}
      <Modal
        visible={showDoctorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDoctorModal(false)}
      >
        <View style={styles.doctorOverlay}>
          <View style={[styles.doctorModal, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.doctorModalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                <View style={[styles.doctorIconCircle, { backgroundColor: `${theme.primary}15` }]}>
                  <Feather name="activity" size={18} color={theme.primary} />
                </View>
                <ThemedText type="h4">Optimize Price with AI</ThemedText>
              </View>
              <Pressable onPress={() => setShowDoctorModal(false)} testID="close-doctor-modal">
                <Feather name="x" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>

            {doctorLoading ? (
              <View style={styles.doctorLoadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
                  Analyzing your quote...
                </ThemedText>
              </View>
            ) : doctorResult ? (
              <View style={{ gap: Spacing.lg }}>
                {/* Before / After */}
                <View style={[styles.doctorCompareRow, { backgroundColor: theme.backgroundRoot, borderRadius: BorderRadius.sm, padding: Spacing.md }]}>
                  <View style={styles.doctorCompareCol}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>Current Price</ThemedText>
                    <ThemedText type="h3" style={{ textAlign: "center", marginTop: 4 }}>
                      ${(quote?.total || 0).toFixed(0)}
                    </ThemedText>
                  </View>
                  <Feather name="arrow-right" size={20} color={theme.textSecondary} />
                  <View style={styles.doctorCompareCol}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>Recommended</ThemedText>
                    <ThemedText type="h3" style={{ color: "#16A34A", textAlign: "center", marginTop: 4 }}>
                      ${doctorCustomPrice.toFixed(0)}
                    </ThemedText>
                  </View>
                </View>

                {/* Why */}
                <View style={[styles.doctorReasonCard, { backgroundColor: `${theme.primary}08`, borderColor: `${theme.primary}20`, borderWidth: 1, borderRadius: BorderRadius.sm, padding: Spacing.md }]}>
                  <ThemedText type="small" style={{ fontWeight: "700", color: theme.primary, marginBottom: 4 }}>Why</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 20 }}>
                    {doctorResult.coaching_note}
                  </ThemedText>
                </View>

                {/* Price Slider */}
                <View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      ${doctorResult.suggested_range_low}
                    </ThemedText>
                    <ThemedText type="small" style={{ fontWeight: "700", color: theme.primary }}>
                      ${doctorCustomPrice}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      ${doctorResult.suggested_range_high}
                    </ThemedText>
                  </View>
                  <Slider
                    minimumValue={Math.max(1, doctorResult.suggested_range_low)}
                    maximumValue={Math.max(doctorResult.suggested_range_low + 1, doctorResult.suggested_range_high)}
                    step={1}
                    value={doctorCustomPrice}
                    onValueChange={(v) => setDoctorCustomPrice(Math.round(v))}
                    minimumTrackTintColor={theme.primary}
                    maximumTrackTintColor={theme.border}
                    thumbTintColor={theme.primary}
                    testID="slider-doctor-price"
                  />
                </View>

                {/* Buttons */}
                <View style={{ flexDirection: "row", gap: Spacing.sm }}>
                  <Pressable
                    onPress={() => setShowDoctorModal(false)}
                    style={[styles.doctorBtnSecondary, { borderColor: theme.border }]}
                    testID="button-keep-current-price"
                  >
                    <ThemedText type="small" style={{ fontWeight: "600", color: theme.textSecondary }}>
                      Keep Current Price
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={handleApplyDoctorPrice}
                    disabled={doctorApplying}
                    style={[styles.doctorBtnPrimary, { backgroundColor: theme.primary, flex: 1 }]}
                    testID="button-apply-doctor-price"
                  >
                    {doctorApplying ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                        Apply This Price
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.doctorLoadingContainer}>
                <Feather name="alert-circle" size={28} color={theme.textSecondary} />
                <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
                  Analysis unavailable. Please try again.
                </ThemedText>
                <Pressable
                  onPress={() => setShowDoctorModal(false)}
                  style={[styles.doctorBtnSecondary, { borderColor: theme.border, marginTop: Spacing.md }]}
                >
                  <ThemedText type="small" style={{ fontWeight: "600", color: theme.textSecondary }}>Close</ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Success Toast */}
      {doctorToast ? (
        <View style={[styles.doctorToast, { backgroundColor: "#16A34A" }]}>
          <Feather name="check-circle" size={16} color="#FFFFFF" />
          <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.sm }}>
            {doctorToast}
          </ThemedText>
        </View>
      ) : null}

      <FounderModal
        visible={showFounderModal}
        onDismiss={() => setShowFounderModal(false)}
        trigger="first_quote"
      />

      <ReviewPromptModal
        visible={showReviewModal}
        onDismiss={() => setShowReviewModal(false)}
      />

      {/* Schedule Clean Modal — powered by QuickAddCleanModal */}
      <QuickAddCleanModal
        visible={showScheduleJobModal}
        onClose={() => setShowScheduleJobModal(false)}
        quotePrefill={quote ? {
          id: quote.id,
          customerName: quote.customerName || quote.propertyDetails?.customerName || "Customer",
          customerId: quote.customerId || null,
          address: quote.propertyDetails?.customerAddress || "",
          total: quote.total ?? null,
          jobType: (() => {
            const optVal = quote.options?.[quote.selectedOption];
            const name = optVal && typeof optVal === "object" && optVal.name ? optVal.name : quote.selectedOption;
            return name || "regular";
          })(),
        } : undefined}
      />

    {quote?.propertyDetails?.customerPhone ? (
      <SmsSendModal
        isOpen={smsModalOpen}
        onClose={() => setSmsModalOpen(false)}
        clientName={quote.propertyDetails.customerName || "Customer"}
        clientPhone={quote.propertyDetails.customerPhone}
        context="quote_sent"
        quoteAmount={quote.total ?? undefined}
      />
    ) : null}
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
  benchmarkCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  doctorCard: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  doctorCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  doctorIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  doctorBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: 6,
  },
  doctorOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  doctorModal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    gap: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  doctorModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  doctorLoadingContainer: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    gap: Spacing.sm,
  },
  doctorCompareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  doctorCompareCol: {
    alignItems: "center",
    flex: 1,
  },
  doctorReasonCard: {},
  doctorBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  doctorBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  doctorToast: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
});
