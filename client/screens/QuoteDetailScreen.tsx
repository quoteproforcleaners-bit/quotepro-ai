import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Share, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { ThemedText } from "@/components/ThemedText";
import { QuoteCard } from "@/components/QuoteCard";
import { Button } from "@/components/Button";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Quote, BusinessProfile } from "@/types";
import { getQuotes, saveQuote, deleteQuote, getBusinessProfile } from "@/lib/storage";
import { generateEmailDraft, generateSmsDraft } from "@/lib/quoteCalculator";

type RouteParams = {
  QuoteDetail: { quoteId: string };
};

export default function QuoteDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, "QuoteDetail">>();
  const { theme } = useTheme();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    loadData();
  }, [route.params.quoteId]);

  const loadData = async () => {
    const [quotes, profileData] = await Promise.all([
      getQuotes(),
      getBusinessProfile(),
    ]);
    const found = quotes.find((q) => q.id === route.params.quoteId);
    setQuote(found || null);
    setProfile(profileData);
  };

  const handleStatusChange = async (status: Quote["status"]) => {
    if (!quote) return;
    const updated = { ...quote, status };
    await saveQuote(updated);
    setQuote(updated);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
          onPress: async () => {
            if (quote) {
              await deleteQuote(quote.id);
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const handleCopyEmail = async () => {
    if (!quote || !profile) return;
    const email = generateEmailDraft(
      quote.customer.name,
      profile.companyName || "Your Company",
      profile.senderName || "Team",
      quote.options,
      profile.bookingLink
    );
    await Clipboard.setStringAsync(email);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleCopySms = async () => {
    if (!quote || !profile) return;
    const sms = generateSmsDraft(
      quote.customer.name,
      profile.companyName || "Your Company",
      quote.options.better.price,
      profile.bookingLink
    );
    await Clipboard.setStringAsync(sms);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (!quote) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.loading}>
          <ThemedText type="body">Loading...</ThemedText>
        </View>
      </View>
    );
  }

  const selectedOption = quote.options[quote.selectedOption];
  const statusColors = {
    draft: theme.warning,
    sent: theme.primary,
    accepted: theme.success,
    expired: theme.textSecondary,
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
            <ThemedText type="h3">{quote.customer.name}</ThemedText>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${statusColors[quote.status]}15` },
              ]}
            >
              <ThemedText
                type="small"
                style={{ color: statusColors[quote.status], fontWeight: "600" }}
              >
                {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
              </ThemedText>
            </View>
          </View>
          {quote.customer.phone ? (
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginTop: 4 }}
            >
              {quote.customer.phone}
            </ThemedText>
          ) : null}
          {quote.customer.email ? (
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginTop: 2 }}
            >
              {quote.customer.email}
            </ThemedText>
          ) : null}
          {quote.customer.address ? (
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginTop: 2 }}
            >
              {quote.customer.address}
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
              {quote.homeDetails.beds} bed, {quote.homeDetails.baths} bath -{" "}
              {quote.homeDetails.sqft} sqft
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Frequency
            </ThemedText>
            <ThemedText type="body" style={{ textTransform: "capitalize" }}>
              {quote.frequency}
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

        <SectionHeader title="Selected Quote" />

        <QuoteCard
          option={selectedOption}
          isSelected={true}
          isRecommended={quote.selectedOption === "better"}
          onPress={() => {}}
        />

        <SectionHeader title="Quick Actions" />

        <View style={styles.actions}>
          <Pressable
            onPress={handleCopyEmail}
            style={[
              styles.actionButton,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="mail" size={20} color={theme.primary} />
            <ThemedText type="small" style={{ marginTop: 4 }}>
              Copy Email
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleCopySms}
            style={[
              styles.actionButton,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="message-square" size={20} color={theme.primary} />
            <ThemedText type="small" style={{ marginTop: 4 }}>
              Copy SMS
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleDelete}
            style={[
              styles.actionButton,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="trash-2" size={20} color={theme.error} />
            <ThemedText type="small" style={{ marginTop: 4, color: theme.error }}>
              Delete
            </ThemedText>
          </Pressable>
        </View>

        <SectionHeader title="Update Status" />

        <View style={styles.statusButtons}>
          {(["draft", "sent", "accepted", "expired"] as const).map((status) => (
            <Pressable
              key={status}
              onPress={() => handleStatusChange(status)}
              style={[
                styles.statusButton,
                {
                  backgroundColor:
                    quote.status === status
                      ? statusColors[status]
                      : theme.backgroundSecondary,
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color: quote.status === status ? "#FFFFFF" : theme.text,
                  fontWeight: quote.status === status ? "600" : "400",
                  textTransform: "capitalize",
                }}
              >
                {status}
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
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
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
