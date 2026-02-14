import React, { useState, useMemo, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Share, Pressable, ActivityIndicator, Platform, Alert } from "react-native";
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
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useSubscription } from "@/context/SubscriptionContext";
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
import { apiRequest } from "@/lib/query-client";
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
  onSave: () => void;
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
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { isPro } = useSubscription();
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

  const options = useMemo(() => {
    return calculateAllOptions(
      homeDetails,
      addOns,
      frequency,
      pricingSettings,
      true
    );
  }, [homeDetails, addOns, frequency, pricingSettings]);

  const enhancedOptions = useMemo(() => {
    if (!aiDescriptions) return options;
    return {
      good: { ...options.good, scope: aiDescriptions.good },
      better: { ...options.better, scope: aiDescriptions.better },
      best: { ...options.best, scope: aiDescriptions.best },
    };
  }, [options, aiDescriptions]);

  const emailDraft = useMemo(() => {
    return generateEmailDraft(
      customer.name || "Customer",
      businessProfile.companyName || "Our Cleaning Company",
      businessProfile.senderName || "Team",
      options,
      businessProfile.bookingLink
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

  const fetchAiDescriptions = useCallback(async () => {
    if (!isPro) return;
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

  const fetchAiEmailDraft = useCallback(async () => {
    if (!isPro) return;
    setAiEmailLoading(true);
    try {
      const selectedOpt = options[selectedOption];
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
  }, [customer, businessProfile, homeDetails, options, selectedOption, aiDescriptions, isPro]);

  const fetchAiSmsDraft = useCallback(async () => {
    if (!isPro) return;
    setAiSmsLoading(true);
    try {
      const selectedOpt = options[selectedOption];
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
  }, [customer, businessProfile, homeDetails, options, selectedOption, isPro]);

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
      const subjectMatch = draft.match(/^Subject:\s*(.+?)(?:\n|$)/i);
      const subject = subjectMatch ? subjectMatch[1].trim() : `Quote from ${businessProfile?.companyName || "QuotePro"}`;
      const bodyText = subjectMatch ? draft.replace(/^Subject:\s*.+?\n+/i, "").trim() : draft;

      const res = await apiRequest("POST", "/api/send/email", { to: recipientEmail, subject, body: bodyText });
      const data = await res.json();

      if (data.success) {
        setSendSuccess("Email sent!");
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        <View style={styles.header}>
          <ThemedText type="h3">Quote Preview</ThemedText>
          <ThemedText
            type="small"
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            Select an option and save your quote.
          </ThemedText>
        </View>

        <View
          style={[
            styles.customerSummary,
            { backgroundColor: theme.cardBackground, borderColor: theme.border },
          ]}
        >
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            {customer.name || "Customer"}
          </ThemedText>
          <ThemedText
            type="small"
            style={{ color: theme.textSecondary, marginTop: 2 }}
          >
            {homeDetails.beds} bed, {homeDetails.baths} bath - {homeDetails.sqft}{" "}
            sqft | {frequency}
          </ThemedText>
        </View>

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
          onPress={() => onSelectOption("good")}
        />

        <QuoteCard
          option={enhancedOptions.better}
          isSelected={selectedOption === "better"}
          isRecommended
          onPress={() => onSelectOption("better")}
        />

        <QuoteCard
          option={enhancedOptions.best}
          isSelected={selectedOption === "best"}
          onPress={() => onSelectOption("best")}
        />

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

        <SectionHeader title="Send This Quote" />

        {isPro ? (
          <View style={{ gap: Spacing.sm }}>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>
              AI writes a personalized message and sends it directly
            </ThemedText>
            <View style={styles.aiButtonRow}>
              <Pressable
                onPress={() => {
                  if (!aiEmailDraft && !aiEmailLoading) fetchAiEmailDraft();
                  setShowEmail(true);
                  setShowSms(false);
                  setSendSuccess(null);
                }}
                style={[styles.aiGenerateBtn, { backgroundColor: theme.primary }]}
                testID="ai-write-email-btn"
              >
                <Feather name="mail" size={16} color="#FFFFFF" />
                <ThemedText type="small" style={{ color: "#FFFFFF", marginLeft: 6, fontWeight: "600" }}>
                  Write Email
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (!aiSmsDraft && !aiSmsLoading) fetchAiSmsDraft();
                  setShowSms(true);
                  setShowEmail(false);
                  setSendSuccess(null);
                }}
                style={[styles.aiGenerateBtn, { backgroundColor: theme.primary }]}
                testID="ai-write-sms-btn"
              >
                <Feather name="message-square" size={16} color="#FFFFFF" />
                <ThemedText type="small" style={{ color: "#FFFFFF", marginLeft: 6, fontWeight: "600" }}>
                  Write SMS
                </ThemedText>
              </Pressable>
            </View>

            {showEmail ? (
              <View style={[styles.draftContent, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1, borderRadius: BorderRadius.sm }]}>
                <View style={styles.draftTitleRow}>
                  <Feather name="mail" size={16} color={theme.primary} />
                  <ThemedText type="body" style={{ fontWeight: "600", marginLeft: 8 }}>Email Draft</ThemedText>
                  {aiEmailDraft ? (
                    <View style={[styles.aiSmallBadge, { backgroundColor: `${theme.primary}15` }]}>
                      <Feather name="zap" size={10} color={theme.primary} />
                      <ThemedText type="caption" style={{ color: theme.primary, marginLeft: 2 }}>AI</ThemedText>
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
                    <FormattedDraftText text={aiEmailDraft || emailDraft} />
                    {sendSuccess ? (
                      <View style={[styles.sendSuccessBanner, { backgroundColor: `${theme.success}15` }]}>
                        <Feather name="check-circle" size={16} color={theme.success} />
                        <ThemedText type="small" style={{ color: theme.success, marginLeft: 6, fontWeight: "600" }}>{sendSuccess}</ThemedText>
                      </View>
                    ) : null}
                    <View style={styles.draftActions}>
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
              <View style={[styles.draftContent, { backgroundColor: theme.cardBackground, borderColor: theme.border, borderWidth: 1, borderRadius: BorderRadius.sm }]}>
                <View style={styles.draftTitleRow}>
                  <Feather name="message-square" size={16} color={theme.primary} />
                  <ThemedText type="body" style={{ fontWeight: "600", marginLeft: 8 }}>SMS Draft</ThemedText>
                  {aiSmsDraft ? (
                    <View style={[styles.aiSmallBadge, { backgroundColor: `${theme.primary}15` }]}>
                      <Feather name="zap" size={10} color={theme.primary} />
                      <ThemedText type="caption" style={{ color: theme.primary, marginLeft: 2 }}>AI</ThemedText>
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
                    <FormattedDraftText text={aiSmsDraft || smsDraft} />
                    {sendSuccess ? (
                      <View style={[styles.sendSuccessBanner, { backgroundColor: `${theme.success}15` }]}>
                        <Feather name="check-circle" size={16} color={theme.success} />
                        <ThemedText type="small" style={{ color: theme.success, marginLeft: 6, fontWeight: "600" }}>{sendSuccess}</ThemedText>
                      </View>
                    ) : null}
                    <View style={styles.draftActions}>
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
            <View style={[styles.upgradeCard, { backgroundColor: '#009B82' }]}>
              <View style={styles.upgradeIcon}>
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
            <View style={styles.draftActions}>
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
            <View style={styles.draftActions}>
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
        <Button onPress={handleSave}>Save Quote</Button>
      </View>
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
  header: {
    marginBottom: Spacing.lg,
  },
  subtitle: {
    marginTop: Spacing.xs,
  },
  customerSummary: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    marginBottom: Spacing.md,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginLeft: 8,
  },
  aiButtonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  aiGenerateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
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
  draftHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  draftTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  draftContent: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.xs,
  },
  draftLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
  },
  draftActions: {
    flexDirection: "row",
    alignItems: "center",
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
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  paymentMethodsCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
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
