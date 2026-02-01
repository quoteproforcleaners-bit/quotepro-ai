import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Share, Pressable } from "react-native";
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
  const [showEmail, setShowEmail] = useState(false);
  const [showSms, setShowSms] = useState(false);

  const options = useMemo(() => {
    return calculateAllOptions(
      homeDetails,
      addOns,
      frequency,
      pricingSettings,
      true
    );
  }, [homeDetails, addOns, frequency, pricingSettings]);

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

  const handleCopyEmail = async () => {
    await Clipboard.setStringAsync(emailDraft);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleCopySms = async () => {
    await Clipboard.setStringAsync(smsDraft);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleShareEmail = async () => {
    await Share.share({ message: emailDraft });
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

        <SectionHeader title="Quote Options" />

        <QuoteCard
          option={options.good}
          isSelected={selectedOption === "good"}
          onPress={() => onSelectOption("good")}
        />

        <QuoteCard
          option={options.better}
          isSelected={selectedOption === "better"}
          isRecommended
          onPress={() => onSelectOption("better")}
        />

        <QuoteCard
          option={options.best}
          isSelected={selectedOption === "best"}
          onPress={() => onSelectOption("best")}
        />

        <SectionHeader title="Message Drafts" />

        <Pressable
          onPress={() => setShowEmail(!showEmail)}
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
            <ThemedText type="small" style={styles.draftText}>
              {emailDraft}
            </ThemedText>
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
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={() => setShowSms(!showSms)}
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
            <ThemedText type="small" style={styles.draftText}>
              {smsDraft}
            </ThemedText>
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
  draftText: {
    lineHeight: 20,
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
