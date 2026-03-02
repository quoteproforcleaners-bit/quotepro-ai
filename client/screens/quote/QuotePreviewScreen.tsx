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

  const [showEmail, setShowEmail] = useState(false);
  const [showSms, setShowSms] = useState(false);
  const [sendingDraft, setSendingDraft] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [aiDescriptions, setAiDescriptions] = useState<{ good: string; better: string; best: string } | null>(null);
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiEmailDraft, setAiEmailDraft] = useState<string | null>(null);
  const [aiEmailLoading, setAiEmailLoading] = useState(false);
  const [aiSmsDraft, setAiSmsDraft] = useState<string | null>(null);
  const [aiSmsLoading, setAiSmsLoading] = useState(false);
  const [includeQuoteLink, setIncludeQuoteLink] = useState(true);
  const [priceOverrides, setPriceOverrides] = useState<{ good?: number; better?: number; best?: number }>({});

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
    if (isPro && aiEmailDraft) {
      setAiEmailDraft(null);
      fetchAiEmailDraft();
    }
    if (isPro && aiSmsDraft) {
      setAiSmsDraft(null);
      fetchAiSmsDraft();
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

  const paymentMethodsText = useMemo(() => {
    const po = getPaymentOptions(businessProfile.paymentOptions);
    const enabled = getEnabledPaymentMethods(po);
    if (enabled.length === 0) return "";
    return enabled.map(({ label }) => label).join(", ");
  }, [businessProfile.paymentOptions]);

  const fetchAiEmailDraft = useCallback(async () => {
    if (!isPro) return;
    const consented = await requestConsent();
    if (!consented) return;
    setAiEmailLoading(true);
    try {
      const selectedOpt = options[selectedOption];
      const baseUrl = getPublicBaseUrl();
      const linkPlaceholder = includeQuoteLink && baseUrl
        ? `${baseUrl}/q/VIEW_QUOTE_LINK`
        : "";
      const res = await apiRequest("POST", "/api/ai/communication-draft", {
        type: "email",
        purpose: "initial_quote",
        customerName: customer.name || "Customer",
        companyName: businessProfile.companyName || "Our Company",
        senderName: businessProfile.senderName || "Team",
        quoteDetails: {
          selectedOption: selectedOpt.serviceTypeName,
          price: selectedOpt.price,
          scope: aiDescriptions?.[(selectedOption as keyof typeof aiDescriptions)] || selectedOpt.scope,
          propertyInfo: `${homeDetails.beds} bed, ${homeDetails.baths} bath, ${homeDetails.sqft} sqft`,
        },
        bookingLink: businessProfile.bookingLink || "",
        quoteLink: linkPlaceholder,
        paymentMethodsText,
        language: communicationLanguage,
      });
      const data = await res.json();
      if (data.draft) {
        setAiEmailDraft(data.draft);
      }
    } catch (err) {
      console.log("AI email draft unavailable");
    } finally {
      setAiEmailLoading(false);
    }
  }, [customer, businessProfile, homeDetails, options, selectedOption, aiDescriptions, isPro, includeQuoteLink]);

  const fetchAiSmsDraft = useCallback(async () => {
    if (!isPro) return;
    const consented = await requestConsent();
    if (!consented) return;
    setAiSmsLoading(true);
    try {
      const selectedOpt = options[selectedOption];
      const baseUrl = getPublicBaseUrl();
      const linkPlaceholder = includeQuoteLink && baseUrl
        ? `${baseUrl}/q/VIEW_QUOTE_LINK`
        : "";
      const res = await apiRequest("POST", "/api/ai/communication-draft", {
        type: "sms",
        purpose: "initial_quote",
        customerName: customer.name || "Customer",
        companyName: businessProfile.companyName || "Our Company",
        senderName: businessProfile.senderName || "Team",
        quoteDetails: {
          selectedOption: selectedOpt.serviceTypeName,
          price: selectedOpt.price,
          scope: selectedOpt.scope,
          propertyInfo: `${homeDetails.beds} bed, ${homeDetails.baths} bath, ${homeDetails.sqft} sqft`,
        },
        bookingLink: businessProfile.bookingLink || "",
        quoteLink: linkPlaceholder,
        paymentMethodsText,
        language: communicationLanguage,
      });
      const data = await res.json();
      if (data.draft) {
        setAiSmsDraft(data.draft);
      }
    } catch (err) {
      console.log("AI SMS draft unavailable");
    } finally {
      setAiSmsLoading(false);
    }
  }, [customer, businessProfile, homeDetails, options, selectedOption, isPro, includeQuoteLink]);

  const handleCopyEmail = async () => {
    const text = aiEmailDraft || emailDraft;
    await Clipboard.setStringAsync(text);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleCopySms = async () => {
    const text = aiSmsDraft || smsDraft;
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
    const text = aiSmsDraft || smsDraft;
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
    const text = aiEmailDraft || emailDraft;
    await Share.share({ message: text });
  };

  const handleSendAiDraft = async (type: "email" | "sms") => {
    const draft = type === "email" ? aiEmailDraft : aiSmsDraft;
    if (!draft) return;

    const recipientEmail = customer.email;
    const recipientPhone = customer.phone;

    if (type === "email" && !businessProfile?.email) {
      Alert.alert("Business Email Required", "Please add your email address in Settings before sending emails.");
      return;
    }
    if (type === "email" && !recipientEmail) {
      Alert.alert("No Email", "This customer doesn't have an email address. Add one to send emails.");
      return;
    }
    if (type === "sms" && !recipientPhone) {
      Alert.alert("No Phone", "This customer doesn't have a phone number. Add one to send texts.");
      return;
    }

    if (type === "sms") {
      try {
        const isAvailable = await SMS.isAvailableAsync();
        if (!isAvailable) {
          Alert.alert("SMS Not Available", "Text messaging is not available on this device. You can copy the message and send it manually.");
          return;
        }
        const smsBody = businessProfile?.smsSignature
          ? `${draft}\n\n${businessProfile.smsSignature}`
          : draft;
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

      const subjectMatch = draft.match(/^Subject:\s*(.+?)(?:\n|$)/i);
      const subject = subjectMatch ? subjectMatch[1].trim() : `Quote from ${businessProfile?.companyName || "QuotePro"}`;
      const bodyText = subjectMatch ? draft.replace(/^Subject:\s*.+?\n+/i, "").trim() : draft;

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
    if (!aiEmailDraft && !aiEmailLoading) {
      await fetchAiEmailDraft();
    }
    handleSave();
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

        <SectionHeader title="Deliver This Quote" subtitle="Choose how to send your quote to the customer" />

        {isPro ? (
          <View style={{ gap: Spacing.md }}>
            <View style={[styles.deliveryCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Pressable
                onPress={() => {
                  if (!aiEmailDraft && !aiEmailLoading) fetchAiEmailDraft();
                  setShowEmail(!showEmail);
                  setShowSms(false);
                  setSendSuccess(null);
                }}
                style={styles.deliveryRow}
                testID="ai-write-email-btn"
              >
                <View style={[styles.deliveryIconWrap, { backgroundColor: `${theme.primary}10` }]}>
                  <Feather name="mail" size={18} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>Send via Email</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 1 }}>AI-powered personalized email</ThemedText>
                </View>
                <Feather name={showEmail ? "chevron-up" : "chevron-right"} size={20} color={theme.textSecondary} />
              </Pressable>

              {showEmail ? (
                <View style={[styles.deliveryExpanded, { borderTopColor: theme.border }]}>
                  <Toggle
                    label="Include Quote Link"
                    description="AI will include a link where the customer can view and accept the quote online"
                    value={includeQuoteLink}
                    onChange={setIncludeQuoteLink}
                  />
                </View>
              ) : null}
            </View>

            <View style={styles.quickActionsRow}>
              <Pressable
                onPress={() => {
                  if (!aiSmsDraft && !aiSmsLoading) fetchAiSmsDraft();
                  setShowSms(!showSms);
                  setShowEmail(false);
                  setSendSuccess(null);
                }}
                style={[styles.quickActionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                testID="ai-write-sms-btn"
              >
                <View style={[styles.quickActionIcon, { backgroundColor: `${theme.primary}12` }]}>
                  <Feather name="message-square" size={16} color={theme.primary} />
                </View>
                <ThemedText type="small" style={{ fontWeight: "600", marginTop: Spacing.xs }}>Send via SMS</ThemedText>
              </Pressable>

              <Pressable
                onPress={handleCopyQuoteLink}
                style={[styles.quickActionCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                testID="copy-quote-link-btn"
              >
                <View style={[styles.quickActionIcon, { backgroundColor: `${theme.primary}12` }]}>
                  <Feather name="link" size={16} color={theme.primary} />
                </View>
                <ThemedText type="small" style={{ fontWeight: "600", marginTop: Spacing.xs }}>Copy Quote Link</ThemedText>
              </Pressable>
            </View>

            {showEmail ? (
              <View style={[styles.draftCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={styles.draftTitleRow}>
                  <View style={[styles.draftIconWrap, { backgroundColor: `${theme.primary}10` }]}>
                    <Feather name="mail" size={14} color={theme.primary} />
                  </View>
                  <ThemedText type="body" style={{ fontWeight: "600", marginLeft: 8 }}>Email Draft</ThemedText>
                  {aiEmailDraft ? (
                    <View style={[styles.aiSmallBadge, { backgroundColor: `${theme.primary}12` }]}>
                      <Feather name="zap" size={10} color={theme.primary} />
                      <ThemedText type="caption" style={{ color: theme.primary, marginLeft: 2, fontWeight: "500" }}>AI</ThemedText>
                    </View>
                  ) : null}
                </View>
                {aiEmailLoading ? (
                  <View style={styles.draftLoading}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 8 }}>AI is writing your email...</ThemedText>
                  </View>
                ) : (
                  <>
                    <View style={[styles.draftPreview, { backgroundColor: theme.backgroundSecondary }]}>
                      <FormattedDraftText text={aiEmailDraft || emailDraft} />
                    </View>
                    {sendSuccess ? (
                      <View style={[styles.sendSuccessBanner, { backgroundColor: `${theme.success}12` }]}>
                        <Feather name="check-circle" size={16} color={theme.success} />
                        <ThemedText type="small" style={{ color: theme.success, marginLeft: 6, fontWeight: "600" }}>{sendSuccess}</ThemedText>
                      </View>
                    ) : null}
                    <View style={[styles.draftActions, { borderTopColor: theme.border }]}>
                      {aiEmailDraft && !sendSuccess ? (
                        <Pressable
                          onPress={() => handleSendAiDraft("email")}
                          disabled={sendingDraft}
                          style={[styles.sendButton, { backgroundColor: theme.primary, opacity: sendingDraft ? 0.7 : 1 }]}
                          testID="send-email-btn"
                        >
                          {sendingDraft ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Feather name="send" size={14} color="#FFFFFF" />
                          )}
                          <ThemedText type="small" style={{ color: "#FFFFFF", marginLeft: 6, fontWeight: "600" }}>
                            {sendingDraft ? "Sending..." : "Send Email"}
                          </ThemedText>
                        </Pressable>
                      ) : null}
                      <Pressable onPress={handleCopyEmail} style={styles.draftAction}>
                        <Feather name="copy" size={16} color={theme.primary} />
                        <ThemedText type="small" style={{ color: theme.primary, marginLeft: 4 }}>Copy</ThemedText>
                      </Pressable>
                      {aiEmailDraft ? (
                        <Pressable onPress={() => { setAiEmailDraft(null); setSendSuccess(null); fetchAiEmailDraft(); }} style={styles.draftAction}>
                          <Feather name="refresh-cw" size={16} color={theme.primary} />
                          <ThemedText type="small" style={{ color: theme.primary, marginLeft: 4 }}>Regenerate</ThemedText>
                        </Pressable>
                      ) : null}
                    </View>
                  </>
                )}
              </View>
            ) : null}

            {showSms ? (
              <View style={[styles.draftCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <View style={styles.draftTitleRow}>
                  <View style={[styles.draftIconWrap, { backgroundColor: `${theme.primary}12` }]}>
                    <Feather name="message-square" size={14} color={theme.primary} />
                  </View>
                  <ThemedText type="body" style={{ fontWeight: "600", marginLeft: 8 }}>SMS Draft</ThemedText>
                  {aiSmsDraft ? (
                    <View style={[styles.aiSmallBadge, { backgroundColor: `${theme.primary}12` }]}>
                      <Feather name="zap" size={10} color={theme.primary} />
                      <ThemedText type="caption" style={{ color: theme.primary, marginLeft: 2, fontWeight: "500" }}>AI</ThemedText>
                    </View>
                  ) : null}
                </View>
                {aiSmsLoading ? (
                  <View style={styles.draftLoading}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 8 }}>AI is writing your SMS...</ThemedText>
                  </View>
                ) : (
                  <>
                    <View style={[styles.draftPreview, { backgroundColor: theme.backgroundSecondary }]}>
                      <FormattedDraftText text={aiSmsDraft || smsDraft} />
                    </View>
                    {sendSuccess ? (
                      <View style={[styles.sendSuccessBanner, { backgroundColor: `${theme.success}12` }]}>
                        <Feather name="check-circle" size={16} color={theme.success} />
                        <ThemedText type="small" style={{ color: theme.success, marginLeft: 6, fontWeight: "600" }}>{sendSuccess}</ThemedText>
                      </View>
                    ) : null}
                    <View style={[styles.draftActions, { borderTopColor: theme.border }]}>
                      {aiSmsDraft && !sendSuccess ? (
                        <Pressable
                          onPress={() => handleSendAiDraft("sms")}
                          disabled={sendingDraft}
                          style={[styles.sendButton, { backgroundColor: theme.primary, opacity: sendingDraft ? 0.7 : 1 }]}
                          testID="send-sms-btn"
                        >
                          {sendingDraft ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Feather name="message-square" size={14} color="#FFFFFF" />
                          )}
                          <ThemedText type="small" style={{ color: "#FFFFFF", marginLeft: 6, fontWeight: "600" }}>
                            Open in Messages
                          </ThemedText>
                        </Pressable>
                      ) : null}
                      <Pressable onPress={handleCopySms} style={styles.draftAction}>
                        <Feather name="copy" size={16} color={theme.primary} />
                        <ThemedText type="small" style={{ color: theme.primary, marginLeft: 4 }}>Copy</ThemedText>
                      </Pressable>
                      {aiSmsDraft ? (
                        <Pressable onPress={() => { setAiSmsDraft(null); setSendSuccess(null); fetchAiSmsDraft(); }} style={styles.draftAction}>
                          <Feather name="refresh-cw" size={16} color={theme.primary} />
                          <ThemedText type="small" style={{ color: theme.primary, marginLeft: 4 }}>Regenerate</ThemedText>
                        </Pressable>
                      ) : null}
                    </View>
                  </>
                )}
              </View>
            ) : null}
          </View>
        ) : (
          <Pressable onPress={() => navigation.navigate("Paywall")} testID="upgrade-send-quote">
            <View style={[styles.upgradeCard, { backgroundColor: theme.primary }]}>
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

        <View style={[styles.sectionDivider, { backgroundColor: theme.border }]} />

        <SectionHeader title="Manual Drafts" subtitle="Copy and paste these drafts" />

        <Pressable
          onPress={() => {
            setShowEmail(!showEmail);
            setShowSms(false);
          }}
          style={[
            styles.draftHeader,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}
        >
          <View style={styles.draftTitleRow}>
            <Feather name="mail" size={18} color={theme.primary} />
            <ThemedText type="body" style={{ fontWeight: "600", marginLeft: 8 }}>
              Email Draft
            </ThemedText>
          </View>
          <Feather
            name={showEmail && !isPro ? "chevron-up" : "chevron-down"}
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>

        {showEmail && !isPro ? (
          <View
            style={[
              styles.draftContent,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <FormattedDraftText text={emailDraft} />
            <View style={[styles.draftActions, { borderTopColor: theme.border }]}>
              <Pressable onPress={handleCopyEmail} style={styles.draftAction}>
                <Feather name="copy" size={16} color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.primary, marginLeft: 4 }}>Copy</ThemedText>
              </Pressable>
              <Pressable onPress={handleShareEmail} style={styles.draftAction}>
                <Feather name="share" size={16} color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.primary, marginLeft: 4 }}>Share</ThemedText>
              </Pressable>
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={() => {
            setShowSms(!showSms);
            setShowEmail(false);
          }}
          style={[
            styles.draftHeader,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
            { marginTop: Spacing.sm },
          ]}
        >
          <View style={styles.draftTitleRow}>
            <Feather name="message-square" size={18} color={theme.primary} />
            <ThemedText type="body" style={{ fontWeight: "600", marginLeft: 8 }}>
              SMS Draft
            </ThemedText>
          </View>
          <Feather
            name={showSms && !isPro ? "chevron-up" : "chevron-down"}
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>

        {showSms && !isPro ? (
          <View
            style={[
              styles.draftContent,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <FormattedDraftText text={smsDraft} />
            <View style={[styles.draftActions, { borderTopColor: theme.border }]}>
              <Pressable onPress={handleSendNativeSms} style={styles.draftAction}>
                <Feather name="message-square" size={16} color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.primary, marginLeft: 4 }}>Open in Messages</ThemedText>
              </Pressable>
              <Pressable onPress={handleCopySms} style={styles.draftAction}>
                <Feather name="copy" size={16} color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.primary, marginLeft: 4 }}>Copy</ThemedText>
              </Pressable>
            </View>
          </View>
        ) : null}
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
  deliveryCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  deliveryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  deliveryExpanded: {
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  quickActionCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  draftCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    overflow: "hidden",
  },
  draftPreview: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  upgradeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  upgradeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  sendSuccessBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
  },
  draftHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  draftTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  draftIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  draftContent: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  draftLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
  },
  draftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  draftAction: {
    flexDirection: "row",
    alignItems: "center",
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
});
