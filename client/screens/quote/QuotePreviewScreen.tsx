import React, { useState, useMemo, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Share, Pressable, ActivityIndicator, Platform, Alert, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import * as SMS from "expo-sms";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ThemedText } from "@/components/ThemedText";
import { QuoteCard } from "@/components/QuoteCard";
import { Button } from "@/components/Button";
import { SectionHeader } from "@/components/SectionHeader";
import { Toggle } from "@/components/Toggle";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  CustomerInfo,
  HomeDetails,
  AddOns,
  ServiceFrequency,
  PricingSettings,
  BusinessProfile,
  QuoteOption,
} from "@/types";
import {
  calculateAllOptions,
  generateEmailDraft,
  generateSmsDraft,
} from "@/lib/quoteCalculator";
import { apiRequest, getPublicBaseUrl } from "@/lib/query-client";
import { useAIConsent } from "@/context/AIConsentContext";
import { getPaymentOptions, getEnabledPaymentMethods, PAYMENT_METHOD_LABELS, formatPaymentOptionsForMessage } from "@/lib/paymentOptions";

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

interface Props {
  customer: CustomerInfo;
  homeDetails: HomeDetails;
  addOns: AddOns;
  frequency: ServiceFrequency;
  pricingSettings: PricingSettings;
  businessProfile: BusinessProfile;
  selectedOption: "good" | "better" | "best";
  onSelectOption: (option: "good" | "better" | "best") => void;
  recommendedOption: "good" | "better" | "best";
  onSetRecommended: (option: "good" | "better" | "best") => void;
  onSave: () => void;
  onSaveForSend?: (priceOverrides?: { good?: number; better?: number; best?: number }) => Promise<string | null>;
  isGuestMode?: boolean;
  isEditMode?: boolean;
}

export default function QuotePreviewScreen({
  customer,
  homeDetails,
  addOns,
  frequency,
  pricingSettings,
  businessProfile,
  selectedOption,
  onSelectOption,
  recommendedOption,
  onSetRecommended,
  onSave,
  onSaveForSend,
  isGuestMode = false,
  isEditMode = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const { requestConsent } = useAIConsent();
  const { communicationLanguage } = useLanguage();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  type DraftPurpose = "initial_quote" | "follow_up" | "thank_you" | "booking_confirmation" | "reschedule";

  const [sendingDraft, setSendingDraft] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [aiDescriptions, setAiDescriptions] = useState<{ good: string; better: string; best: string } | null>(null);
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [aiDraftType, setAiDraftType] = useState<"email" | "sms">("email");
  const [aiDraftPurpose, setAiDraftPurpose] = useState<DraftPurpose>("initial_quote");
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [showAiDraft, setShowAiDraft] = useState(false);
  const [includeQuoteLink, setIncludeQuoteLink] = useState(true);
  const [priceOverrides, setPriceOverrides] = useState<{ good?: number; better?: number; best?: number }>({});
  const [pdfLoading, setPdfLoading] = useState(false);
  const [aiPricing, setAiPricing] = useState<{
    good: { suggestedPrice: number; reasoning: string };
    better: { suggestedPrice: number; reasoning: string };
    best: { suggestedPrice: number; reasoning: string };
    overallAssessment: string;
    confidence: "low" | "medium" | "high";
    keyInsight: string;
  } | null>(null);
  const [aiPricingLoading, setAiPricingLoading] = useState(false);
  const [showAiPricing, setShowAiPricing] = useState(false);

  const baseOptions = useMemo(() => {
    return calculateAllOptions(
      homeDetails,
      addOns,
      frequency,
      pricingSettings,
      true
    );
  }, [homeDetails, addOns, frequency, pricingSettings]);

  const options = useMemo(() => {
    return {
      good: { ...baseOptions.good, price: priceOverrides.good ?? baseOptions.good.price },
      better: { ...baseOptions.better, price: priceOverrides.better ?? baseOptions.better.price },
      best: { ...baseOptions.best, price: priceOverrides.best ?? baseOptions.best.price },
    };
  }, [baseOptions, priceOverrides]);

  const enhancedOptions = useMemo(() => {
    if (!aiDescriptions) return options;
    return {
      good: { ...options.good, scope: aiDescriptions.good },
      better: { ...options.better, scope: aiDescriptions.better },
      best: { ...options.best, scope: aiDescriptions.best },
    };
  }, [options, aiDescriptions]);

  const selectedOpt = useMemo(() => options[selectedOption], [options, selectedOption]);

  const emailDraft = useMemo(() => {
    const po = getPaymentOptions(businessProfile.paymentOptions);
    const enabled = getEnabledPaymentMethods(po);
    const pmText = enabled.length > 0 ? enabled.map(({ label }) => label).join(", ") : undefined;
    return generateEmailDraft(
      customer.name || "Customer",
      businessProfile.companyName || "Our Cleaning Company",
      businessProfile.senderName || "Team",
      options,
      businessProfile.bookingLink,
      pmText
    );
  }, [customer, businessProfile, options]);

  const smsDraft = useMemo(() => {
    return generateSmsDraft(
      customer.name || "Customer",
      businessProfile.companyName || "our company",
      options.better.price,
      businessProfile.bookingLink,
      options.better.serviceTypeName
    );
  }, [customer, businessProfile, options]);

  useEffect(() => {
    if (isPro) {
      fetchAiDescriptions();
    }
  }, [isPro]);

  useEffect(() => {
    if (isPro && aiDraft && showAiDraft) {
      setAiDraft(null);
      fetchAiDraft(aiDraftType, aiDraftPurpose);
    }
  }, [includeQuoteLink]);

  const fetchAiDescriptions = useCallback(async () => {
    if (!isPro) return;
    const consented = await requestConsent();
    if (!consented) return;
    setAiDescLoading(true);
    try {
      const res = await apiRequest("POST", "/api/ai/quote-descriptions", {
        homeDetails: {
          sqft: homeDetails.sqft,
          beds: homeDetails.beds,
          baths: homeDetails.baths,
          halfBaths: homeDetails.halfBaths,
          homeType: homeDetails.homeType,
          petType: homeDetails.petType,
          conditionScore: homeDetails.conditionScore,
          petShedding: homeDetails.petShedding,
          peopleCount: homeDetails.peopleCount,
          kitchensCount: homeDetails.kitchensCount,
        },
        serviceTypes: {
          good: options.good.serviceTypeName,
          better: options.better.serviceTypeName,
          best: options.best.serviceTypeName,
        },
        addOns,
        companyName: businessProfile.companyName || "Our Company",
      });
      const data = await res.json();
      if (data.good && data.better && data.best) {
        setAiDescriptions(data);
      }
    } catch (err) {
      console.log("AI descriptions unavailable, using defaults");
    } finally {
      setAiDescLoading(false);
    }
  }, [homeDetails, options, addOns, businessProfile, isPro]);

  const fetchAiPricing = useCallback(async () => {
    if (!isPro) {
      navigation.navigate("Paywall");
      return;
    }
    const consented = await requestConsent();
    if (!consented) return;
    setAiPricingLoading(true);
    setShowAiPricing(true);
    try {
      const res = await apiRequest("POST", "/api/ai/pricing-suggestion", {
        homeDetails: {
          sqft: homeDetails.sqft,
          beds: homeDetails.beds,
          baths: homeDetails.baths,
          halfBaths: homeDetails.halfBaths,
          homeType: homeDetails.homeType,
          conditionScore: homeDetails.conditionScore,
          peopleCount: homeDetails.peopleCount,
          petType: homeDetails.petType,
          petShedding: homeDetails.petShedding,
        },
        addOns,
        frequency,
        currentPrices: {
          good: options.good.price,
          better: options.better.price,
          best: options.best.price,
        },
        pricingSettings: {
          hourlyRate: pricingSettings.hourlyRate,
        },
      });
      const data = await res.json();
      if (data.good && data.better && data.best) {
        setAiPricing(data);
      }
    } catch (err) {
      console.log("AI pricing suggestion unavailable");
    } finally {
      setAiPricingLoading(false);
    }
  }, [homeDetails, addOns, frequency, options, pricingSettings, isPro]);

  const paymentMethodsText = useMemo(() => {
    const po = getPaymentOptions(businessProfile.paymentOptions);
    const enabled = getEnabledPaymentMethods(po);
    if (enabled.length === 0) return "";
    return enabled.map(({ label }) => label).join(", ");
  }, [businessProfile.paymentOptions]);

  const fetchAiDraft = useCallback(async (type: "email" | "sms", purpose: DraftPurpose) => {
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
      const sel = options[selectedOption];
      const baseUrl = getPublicBaseUrl();
      const linkPlaceholder = includeQuoteLink && baseUrl
        ? `${baseUrl}/q/VIEW_QUOTE_LINK`
        : "";
      const res = await apiRequest("POST", "/api/ai/communication-draft", {
        type,
        purpose,
        customerName: customer.name || "Customer",
        companyName: businessProfile.companyName || "Our Company",
        senderName: businessProfile.senderName || "Team",
        quoteDetails: {
          selectedOption: sel.serviceTypeName,
          price: sel.price,
          scope: aiDescriptions?.[(selectedOption as keyof typeof aiDescriptions)] || sel.scope,
          propertyInfo: `${homeDetails.beds} bed, ${homeDetails.baths} bath, ${homeDetails.sqft} sqft`,
        },
        bookingLink: businessProfile.bookingLink || "",
        quoteLink: linkPlaceholder,
        paymentMethodsText,
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
  }, [customer, businessProfile, homeDetails, options, selectedOption, aiDescriptions, isPro, includeQuoteLink, paymentMethodsText, communicationLanguage]);

  const handleCopyDraft = async () => {
    if (!aiDraft) return;
    await Clipboard.setStringAsync(aiDraft);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleCopyEmail = async () => {
    const text = (aiDraft && aiDraftType === "email") ? aiDraft : emailDraft;
    await Clipboard.setStringAsync(text);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleCopySms = async () => {
    const text = (aiDraft && aiDraftType === "sms") ? aiDraft : smsDraft;
    await Clipboard.setStringAsync(text);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleCopyQuoteLink = async () => {
    Alert.alert(
      "Quote Link",
      "The shareable quote link will be available after you save this quote. You can copy and share it from the quote details screen.",
      [{ text: "OK" }]
    );
  };

  const handleSendNativeSms = async () => {
    const text = (aiDraft && aiDraftType === "sms") ? aiDraft : smsDraft;
    const phone = customer.phone;
    const smsBody = businessProfile?.smsSignature
      ? `${text}\n\n${businessProfile.smsSignature}`
      : text;
    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (!isAvailable) {
        await Clipboard.setStringAsync(smsBody);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert("Copied", "SMS is not available on this device. The message has been copied to your clipboard.");
        return;
      }
      await SMS.sendSMSAsync(phone ? [phone] : [], smsBody);
    } catch (err) {
      await Clipboard.setStringAsync(smsBody);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const handleShareEmail = async () => {
    await Share.share({ message: emailDraft });
  };

  const handleExportPdf = async () => {
    setPdfLoading(true);
    try {
      let quoteId: string | null = null;
      if (onSaveForSend) {
        quoteId = await onSaveForSend(priceOverrides);
      }
      if (!quoteId) {
        Alert.alert("Save Required", "Please save the quote first to export as PDF.");
        return;
      }
      const res = await apiRequest("GET", `/api/quotes/${quoteId}/pdf`);
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
          dialogTitle: `Quote for ${customer.name || "Customer"}`,
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

  const handleSendDraft = async () => {
    if (!aiDraft) return;

    const recipientEmail = customer.email;
    const recipientPhone = customer.phone;

    if (aiDraftType === "email" && !businessProfile?.email) {
      Alert.alert("Business Email Required", "Please add your email address in Settings before sending emails.");
      return;
    }
    if (aiDraftType === "email" && !recipientEmail) {
      Alert.alert("No Email", "This customer doesn't have an email address. Add one to send emails.");
      return;
    }
    if (aiDraftType === "sms" && !recipientPhone) {
      Alert.alert("No Phone", "This customer doesn't have a phone number. Add one to send texts.");
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
      let quoteId: string | null = null;
      if (onSaveForSend) {
        quoteId = await onSaveForSend(priceOverrides);
      }

      const subjectMatch = aiDraft.match(/^Subject:\s*(.+?)(?:\n|$)/i);
      const subject = subjectMatch ? subjectMatch[1].trim() : `Quote from ${businessProfile?.companyName || "QuotePro"}`;
      const bodyText = subjectMatch ? aiDraft.replace(/^Subject:\s*.+?\n+/i, "").trim() : aiDraft;

      const emailPayload: any = { to: recipientEmail, subject, body: bodyText };
      if (quoteId && includeQuoteLink) {
        emailPayload.quoteId = quoteId;
        emailPayload.includeQuoteLink = true;
      }

      const res = await apiRequest("POST", "/api/send/email", emailPayload);
      const data = await res.json();

      if (data.success) {
        setSendSuccess("Email sent!");
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        if (quoteId) {
          try {
            await apiRequest("PUT", `/api/quotes/${quoteId}`, { status: "sent", sentVia: "email", sentAt: new Date().toISOString() });
          } catch (updateErr) {
            console.error("Failed to update quote status:", updateErr);
          }
          navigation.replace("QuoteDetail" as any, { quoteId });
        }
      } else {
        Alert.alert("Send Failed", data.message || "Could not send email.");
      }
    } catch (err: any) {
      Alert.alert("Send Failed", "Could not send email. You can copy it and send manually.");
    } finally {
      setSendingDraft(false);
    }
  };

  const handleSave = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onSave();
  };

  const handleSaveAndSend = async () => {
    if (!isPro) {
      handleSave();
      return;
    }
    if (!aiDraft && !aiDraftLoading) {
      await fetchAiDraft("email", "initial_quote");
    }
    handleSave();
  };

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

  const taxRate = pricingSettings.taxRate || 0;
  const subtotal = selectedOpt.price;
  const taxAmount = taxRate > 0 ? Math.round(subtotal * (taxRate / 100) * 100) / 100 : 0;
  const total = subtotal + taxAmount;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl + 120,
          },
          ...(useMaxWidth ? [{ maxWidth: 560, alignSelf: "center" as const, width: "100%" as const }] : []),
        ]}
      >
        <View style={[styles.summaryCard, { backgroundColor: theme.gradientPrimary, borderColor: `${theme.primary}20` }]}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryLeft}>
              <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 }}>
                Selected Quote
              </ThemedText>
              <ThemedText type="hero" style={{ color: theme.primary, marginTop: 4 }}>
                {"$"}{total.toFixed(2)}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2, textTransform: "capitalize" }}>
                {selectedOpt.serviceTypeName}
              </ThemedText>
            </View>
            <View style={[styles.summaryIcon, { backgroundColor: `${theme.primary}15` }]}>
              <Feather name="file-text" size={24} color={theme.primary} />
            </View>
          </View>
        </View>

        <View
          style={[
            styles.customerCard,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}
        >
          <View style={[styles.customerIconWrap, { backgroundColor: `${theme.primary}10` }]}>
            <Feather name="user" size={18} color={theme.primary} />
          </View>
          <View style={styles.customerInfo}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {customer.name || "Customer"}
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginTop: 2 }}
            >
              {homeDetails.beds} bed, {homeDetails.baths} bath  -  {homeDetails.sqft}{" "}
              sqft  |  {frequency}
            </ThemedText>
            {customer.email ? (
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
                {customer.email}
              </ThemedText>
            ) : null}
          </View>
        </View>

        <View style={[styles.sectionDivider, { backgroundColor: theme.border }]} />

        <View style={styles.sectionRow}>
          <SectionHeader title="Quote Options" />
          {isPro ? (
            aiDescLoading ? (
              <View style={styles.aiLoadingBadge}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText type="caption" style={{ color: theme.primary, marginLeft: 4 }}>
                  AI enhancing...
                </ThemedText>
              </View>
            ) : aiDescriptions ? (
              <View style={[styles.aiBadge, { backgroundColor: `${theme.primary}15` }]}>
                <Feather name="zap" size={12} color={theme.primary} />
                <ThemedText type="caption" style={{ color: theme.primary, marginLeft: 4 }}>
                  AI Enhanced
                </ThemedText>
              </View>
            ) : null
          ) : null}
        </View>

        <QuoteCard
          option={enhancedOptions.good}
          isSelected={selectedOption === "good"}
          isRecommended={recommendedOption === "good"}
          onPress={() => onSelectOption("good")}
          onSetRecommended={() => onSetRecommended("good")}
          onPriceChange={(p) => setPriceOverrides((prev) => ({ ...prev, good: p }))}
        />

        <QuoteCard
          option={enhancedOptions.better}
          isSelected={selectedOption === "better"}
          isRecommended={recommendedOption === "better"}
          onPress={() => onSelectOption("better")}
          onSetRecommended={() => onSetRecommended("better")}
          onPriceChange={(p) => setPriceOverrides((prev) => ({ ...prev, better: p }))}
        />

        <QuoteCard
          option={enhancedOptions.best}
          isSelected={selectedOption === "best"}
          isRecommended={recommendedOption === "best"}
          onPress={() => onSelectOption("best")}
          onSetRecommended={() => onSetRecommended("best")}
          onPriceChange={(p) => setPriceOverrides((prev) => ({ ...prev, best: p }))}
        />

        <Pressable
          onPress={() => {
            if (!isPro) {
              navigation.navigate("Paywall");
              return;
            }
            if (aiPricing) {
              setShowAiPricing(!showAiPricing);
            } else {
              fetchAiPricing();
            }
          }}
          style={[styles.aiPricingButton, { backgroundColor: `${theme.primary}12`, borderColor: `${theme.primary}25` }]}
          testID="ai-price-check-btn"
        >
          <Feather name={isPro ? "cpu" : "lock"} size={16} color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.primary, marginLeft: 8, fontWeight: "600", flex: 1 }}>
            AI Price Check
          </ThemedText>
          {aiPricingLoading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Feather name={showAiPricing ? "chevron-up" : "chevron-down"} size={16} color={theme.primary} />
          )}
        </Pressable>

        {showAiPricing ? (
          aiPricingLoading ? (
            <View style={[styles.aiPricingCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: Spacing.lg }}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 8 }}>
                  Analyzing pricing...
                </ThemedText>
              </View>
            </View>
          ) : aiPricing ? (
            <View style={[styles.aiPricingCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <ThemedText type="small" style={{ color: theme.text, marginBottom: Spacing.sm }}>
                {aiPricing.overallAssessment}
              </ThemedText>

              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm, gap: 8 }}>
                <View style={[
                  styles.aiPricingConfidence,
                  {
                    backgroundColor: aiPricing.confidence === "high"
                      ? `${theme.success}15`
                      : aiPricing.confidence === "medium"
                        ? `${theme.primary}15`
                        : `${theme.warning}15`,
                  },
                ]}>
                  <ThemedText type="caption" style={{
                    color: aiPricing.confidence === "high"
                      ? theme.success
                      : aiPricing.confidence === "medium"
                        ? theme.primary
                        : theme.warning,
                    fontWeight: "600",
                    textTransform: "capitalize",
                  }}>
                    {aiPricing.confidence} confidence
                  </ThemedText>
                </View>
              </View>

              <ThemedText type="small" style={{ color: theme.textSecondary, fontStyle: "italic", marginBottom: Spacing.md }}>
                {aiPricing.keyInsight}
              </ThemedText>

              {(["good", "better", "best"] as const).map((tier) => {
                const current = options[tier].price;
                const suggested = aiPricing[tier].suggestedPrice;
                const diff = suggested - current;
                const diffColor = diff > 0 ? theme.success : diff < 0 ? theme.warning : theme.textSecondary;
                return (
                  <View key={tier} style={[styles.aiPricingRow, { borderBottomColor: theme.border }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <ThemedText type="small" style={{ fontWeight: "600", textTransform: "capitalize" }}>
                        {tier}
                      </ThemedText>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <ThemedText type="small" style={{ color: theme.textSecondary }}>
                          {"$"}{current.toFixed(2)}
                        </ThemedText>
                        <Feather name="arrow-right" size={12} color={diffColor} />
                        <ThemedText type="small" style={{ color: diffColor, fontWeight: "700" }}>
                          {"$"}{suggested.toFixed(2)}
                        </ThemedText>
                        <Pressable
                          onPress={() => setPriceOverrides((prev) => ({ ...prev, [tier]: suggested }))}
                          style={[styles.aiPricingApply, { backgroundColor: `${theme.primary}12` }]}
                          testID={`apply-ai-price-${tier}`}
                        >
                          <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>
                            Apply
                          </ThemedText>
                        </Pressable>
                      </View>
                    </View>
                    <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
                      {aiPricing[tier].reasoning}
                    </ThemedText>
                  </View>
                );
              })}

              <Pressable
                onPress={() => {
                  setPriceOverrides({
                    good: aiPricing.good.suggestedPrice,
                    better: aiPricing.better.suggestedPrice,
                    best: aiPricing.best.suggestedPrice,
                  });
                  if (Platform.OS !== "web") {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                }}
                style={[styles.aiPricingApplyAll, { backgroundColor: theme.primary }]}
                testID="apply-all-ai-prices"
              >
                <Feather name="check-circle" size={14} color="#FFFFFF" />
                <ThemedText type="small" style={{ color: "#FFFFFF", marginLeft: 6, fontWeight: "600" }}>
                  Apply All Suggestions
                </ThemedText>
              </Pressable>
            </View>
          ) : null
        ) : null}

        <View style={[styles.breakdownCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.breakdownRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Subtotal</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>{"$"}{subtotal.toFixed(2)}</ThemedText>
          </View>
          {taxRate > 0 ? (
            <View style={styles.breakdownRow}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {"Tax ("}{taxRate}{"%)"}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>{"$"}{taxAmount.toFixed(2)}</ThemedText>
            </View>
          ) : null}
          <View style={[styles.breakdownDivider, { backgroundColor: theme.border }]} />
          <View style={styles.breakdownRow}>
            <ThemedText type="body" style={{ fontWeight: "700" }}>Total</ThemedText>
            <ThemedText type="body" style={{ fontWeight: "700", color: theme.primary }}>{"$"}{total.toFixed(2)}</ThemedText>
          </View>
        </View>

        <View style={[styles.microcopyCard, { backgroundColor: `${theme.warning}08`, borderColor: `${theme.warning}20` }]}>
          <Feather name="trending-up" size={14} color={theme.warning} />
          <ThemedText type="caption" style={{ color: theme.textSecondary, flex: 1, marginLeft: Spacing.sm }}>
            Most cleaners underquote by 15-25%. QuotePro helps prevent that.
          </ThemedText>
        </View>

        {(() => {
          const po = getPaymentOptions(businessProfile.paymentOptions);
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

        <View style={[styles.sectionDivider, { backgroundColor: theme.border }]} />

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
          <Pressable onPress={() => navigation.navigate("Paywall")} testID="upgrade-send-quote">
            <View style={[styles.upgradeCard, { backgroundColor: '#2F7BFF' }]}>
              <View style={styles.upgradeIcon}>
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

        <View style={[styles.quoteLinkToggle, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <Toggle
            label="Include Quote Link"
            description="Include a link where the customer can view and accept the quote online"
            value={includeQuoteLink}
            onChange={setIncludeQuoteLink}
          />
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
            onPress={handleCopyQuoteLink}
            style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
            testID="copy-link-btn"
          >
            <Feather name="link" size={20} color={theme.primary} />
            <ThemedText type="small" style={{ marginTop: 4 }}>Copy Link</ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingBottom: insets.bottom + Spacing.md,
            borderTopColor: theme.border,
          },
        ]}
      >
        <View style={styles.footerButtons}>
          {isGuestMode ? (
            <View style={{ flex: 1 }}>
              <Button onPress={handleSave}>Sign Up to Save Quote</Button>
            </View>
          ) : (
            <>
              <Pressable
                onPress={handleSave}
                style={[styles.secondaryFooterBtn, { borderColor: theme.border }]}
              >
                <Feather name={isEditMode ? "check" : "bookmark"} size={16} color={theme.textSecondary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 6, fontWeight: "600" }}>{isEditMode ? "Update Quote" : "Save & Send Later"}</ThemedText>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Button onPress={handleSaveAndSend}>{isEditMode ? "Update & Send" : "Save & Send"}</Button>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  summaryCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLeft: {
    flex: 1,
  },
  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  customerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  customerInfo: {
    flex: 1,
  },
  sectionDivider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  aiLoadingBadge: {
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
    marginBottom: Spacing.sm,
  },
  aiSmallBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginLeft: 8,
  },
  breakdownCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  breakdownDivider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  upgradeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  upgradeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  quoteLinkToggle: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
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
  aiDraftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
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
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
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
  draftAction: {
    flexDirection: "row",
    alignItems: "center",
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
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderTopWidth: 1,
  },
  footerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  secondaryFooterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  paymentMethodsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  paymentTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  microcopyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  aiPricingButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  aiPricingCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  aiPricingRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    marginBottom: Spacing.xs,
  },
  aiPricingApply: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  aiPricingConfidence: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  aiPricingApplyAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.md,
  },
});
