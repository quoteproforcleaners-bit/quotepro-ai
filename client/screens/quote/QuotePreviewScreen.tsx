import React, { useState, useMemo, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Share, Pressable, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { ThemedText } from "@/components/ThemedText";
import { QuoteCard } from "@/components/QuoteCard";
import { Button } from "@/components/Button";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
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
  const isPro = user?.subscriptionTier === "pro";

  const [showEmail, setShowEmail] = useState(false);
  const [showSms, setShowSms] = useState(false);
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
      businessProfile.companyName || "Your Cleaning Company",
      businessProfile.senderName || "Team",
      options,
      businessProfile.bookingLink
    );
  }, [customer, businessProfile, options]);

  const smsDraft = useMemo(() => {
    return generateSmsDraft(
      customer.name || "Customer",
      businessProfile.companyName || "Your Cleaning Company",
      options.better.price,
      businessProfile.bookingLink
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

  const handleShareEmail = async () => {
    const text = aiEmailDraft || emailDraft;
    await Share.share({ message: text });
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

        <SectionHeader title="Message Drafts" />

        <Pressable
          onPress={() => {
            if (!showEmail && !aiEmailDraft && !aiEmailLoading && isPro) {
              fetchAiEmailDraft();
            }
            setShowEmail(!showEmail);
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
            {aiEmailDraft ? (
              <View style={[styles.aiSmallBadge, { backgroundColor: `${theme.primary}15` }]}>
                <Feather name="zap" size={10} color={theme.primary} />
                <ThemedText type="caption" style={{ color: theme.primary, marginLeft: 2 }}>
                  AI
                </ThemedText>
              </View>
            ) : null}
          </View>
          <Feather
            name={showEmail ? "chevron-up" : "chevron-down"}
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>

        {showEmail ? (
          <View
            style={[
              styles.draftContent,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            {aiEmailLoading ? (
              <View style={styles.draftLoading}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 8 }}>
                  AI is writing your email...
                </ThemedText>
              </View>
            ) : (
              <FormattedDraftText text={aiEmailDraft || emailDraft} />
            )}
            <View style={styles.draftActions}>
              <Pressable onPress={handleCopyEmail} style={styles.draftAction}>
                <Feather name="copy" size={16} color={theme.primary} />
                <ThemedText
                  type="small"
                  style={{ color: theme.primary, marginLeft: 4 }}
                >
                  Copy
                </ThemedText>
              </Pressable>
              <Pressable onPress={handleShareEmail} style={styles.draftAction}>
                <Feather name="share" size={16} color={theme.primary} />
                <ThemedText
                  type="small"
                  style={{ color: theme.primary, marginLeft: 4 }}
                >
                  Share
                </ThemedText>
              </Pressable>
              {aiEmailDraft ? (
                <Pressable
                  onPress={() => {
                    setAiEmailDraft(null);
                    fetchAiEmailDraft();
                  }}
                  style={styles.draftAction}
                >
                  <Feather name="refresh-cw" size={16} color={theme.primary} />
                  <ThemedText
                    type="small"
                    style={{ color: theme.primary, marginLeft: 4 }}
                  >
                    Regenerate
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={() => {
            if (!showSms && !aiSmsDraft && !aiSmsLoading && isPro) {
              fetchAiSmsDraft();
            }
            setShowSms(!showSms);
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
            {aiSmsDraft ? (
              <View style={[styles.aiSmallBadge, { backgroundColor: `${theme.primary}15` }]}>
                <Feather name="zap" size={10} color={theme.primary} />
                <ThemedText type="caption" style={{ color: theme.primary, marginLeft: 2 }}>
                  AI
                </ThemedText>
              </View>
            ) : null}
          </View>
          <Feather
            name={showSms ? "chevron-up" : "chevron-down"}
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>

        {showSms ? (
          <View
            style={[
              styles.draftContent,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            {aiSmsLoading ? (
              <View style={styles.draftLoading}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 8 }}>
                  AI is writing your SMS...
                </ThemedText>
              </View>
            ) : (
              <FormattedDraftText text={aiSmsDraft || smsDraft} />
            )}
            <View style={styles.draftActions}>
              <Pressable onPress={handleCopySms} style={styles.draftAction}>
                <Feather name="copy" size={16} color={theme.primary} />
                <ThemedText
                  type="small"
                  style={{ color: theme.primary, marginLeft: 4 }}
                >
                  Copy
                </ThemedText>
              </Pressable>
              {aiSmsDraft ? (
                <Pressable
                  onPress={() => {
                    setAiSmsDraft(null);
                    fetchAiSmsDraft();
                  }}
                  style={styles.draftAction}
                >
                  <Feather name="refresh-cw" size={16} color={theme.primary} />
                  <ThemedText
                    type="small"
                    style={{ color: theme.primary, marginLeft: 4 }}
                  >
                    Regenerate
                  </ThemedText>
                </Pressable>
              ) : null}
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
});
