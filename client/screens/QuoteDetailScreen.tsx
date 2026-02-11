import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, Platform } from "react-native";
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

export default function QuoteDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<RouteParams, "QuoteDetail">>();
  const { theme } = useTheme();
  const { businessProfile } = useApp();
  const queryClient = useQueryClient();

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
