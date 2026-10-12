import React, { useState } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

interface Insights {
  windowDays: number;
  totalConversations: number;
  totalMessages: number;
  acceptedAfterChat: number;
  negotiations: number;
  offersMade: number;
  offersAccepted: number;
  avgDiscountPct: number;
  totalRevenueRecovered: number;
  topQuestions: { signal_type: string; count: number }[];
  topIntents: { intent: string; count: number }[];
  conversionLiftEstimate: number;
  languageBreakdown: { language: string; count: number }[];
}

export default function AIConciergeInsightsScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const [sendingTest, setSendingTest] = useState(false);

  const { data, isLoading, error } = useQuery<Insights>({
    queryKey: ["/api/business/ai-concierge/insights/latest"],
  });

  const sendTestDigest = async () => {
    if (sendingTest) return;
    setSendingTest(true);
    try {
      await Haptics.selectionAsync();
      const r: any = await apiRequest("POST", "/api/business/ai-concierge/digest/test", {});
      if (r?.sent > 0) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Test digest sent", "Check your inbox in a minute or two.");
      } else {
        Alert.alert("Couldn't send", "Make sure your account email is set.");
      }
    } catch (e: any) {
      Alert.alert("Couldn't send", e?.message || "Try again later.");
    } finally {
      setSendingTest(false);
    }
  };

  const styles = makeStyles(theme);

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: headerHeight }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.center, { paddingTop: headerHeight + Spacing.xl, paddingHorizontal: Spacing.lg }]}>
        <Feather name="bar-chart-2" size={48} color={theme.textSecondary} />
        <ThemedText type="defaultSemiBold" style={{ marginTop: Spacing.md, textAlign: "center" }}>
          Insights coming soon
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", marginTop: 6 }}>
          Insights unlock on Growth and Pro plans.
        </ThemedText>
      </View>
    );
  }

  const liftPct = (data.conversionLiftEstimate * 100).toFixed(1);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ padding: Spacing.lg, paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
        Last {data.windowDays} days
      </ThemedText>

      <View style={styles.statRow}>
        <Card variant="base" style={[styles.statCard, { marginRight: Spacing.sm }]}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>Conversations</ThemedText>
          <ThemedText type="title" style={{ marginTop: 4 }} testID="stat-conversations">{data.totalConversations}</ThemedText>
        </Card>
        <Card variant="base" style={styles.statCard}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>Accepted after chat</ThemedText>
          <ThemedText type="title" style={{ marginTop: 4 }} testID="stat-accepted">{data.acceptedAfterChat}</ThemedText>
        </Card>
      </View>

      <View style={[styles.statRow, { marginTop: Spacing.sm }]}>
        <Card variant="base" style={[styles.statCard, { marginRight: Spacing.sm }]}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>Offers made</ThemedText>
          <ThemedText type="title" style={{ marginTop: 4 }} testID="stat-offers-made">{data.offersMade}</ThemedText>
        </Card>
        <Card variant="base" style={styles.statCard}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>Offers accepted</ThemedText>
          <ThemedText type="title" style={{ marginTop: 4 }} testID="stat-offers-accepted">{data.offersAccepted}</ThemedText>
        </Card>
      </View>

      <Card variant="emphasis" style={{ padding: Spacing.lg, marginTop: Spacing.lg }}>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>Conversion lift (chat vs no-chat)</ThemedText>
        <ThemedText type="title" style={{ marginTop: 6, color: data.conversionLiftEstimate >= 0 ? theme.accent : "#b45309" }} testID="stat-lift">
          {data.conversionLiftEstimate >= 0 ? "+" : ""}{liftPct}%
        </ThemedText>
      </Card>

      <Card variant="base" style={{ padding: Spacing.lg, marginTop: Spacing.lg }}>
        <ThemedText type="defaultSemiBold">Negotiations</ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>
          {data.negotiations} negotiation conversations · avg discount {data.avgDiscountPct.toFixed(1)}% · ${data.totalRevenueRecovered.toFixed(0)} total concession given
        </ThemedText>
      </Card>

      {data.topQuestions.length ? (
        <Card variant="base" style={{ padding: Spacing.lg, marginTop: Spacing.lg }}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.sm }}>Top customer questions</ThemedText>
          {data.topQuestions.slice(0, 5).map((q, i) => (
            <View key={i} style={[styles.questionRow, i < data.topQuestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
              <ThemedText type="body" style={{ flex: 1, textTransform: "capitalize" }}>{q.signal_type.replace(/_/g, " ")}</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>{q.count}</ThemedText>
            </View>
          ))}
        </Card>
      ) : null}

      {data.languageBreakdown.length > 1 ? (
        <Card variant="base" style={{ padding: Spacing.lg, marginTop: Spacing.lg }}>
          <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.sm }}>Languages</ThemedText>
          {data.languageBreakdown.map((l, i) => (
            <View key={i} style={styles.questionRow}>
              <ThemedText type="body" style={{ flex: 1 }}>{(l.language || "en").toUpperCase()}</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>{l.count}</ThemedText>
            </View>
          ))}
        </Card>
      ) : null}

      <Pressable
        onPress={sendTestDigest}
        disabled={sendingTest}
        style={({ pressed }) => [
          {
            marginTop: Spacing.xl,
            paddingVertical: 14,
            borderRadius: BorderRadius.lg,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: "center",
            justifyContent: "center",
            minHeight: 48,
            opacity: sendingTest ? 0.7 : pressed ? 0.85 : 1,
          },
        ]}
        testID="button-send-test-digest"
      >
        {sendingTest ? (
          <ActivityIndicator color={theme.text} />
        ) : (
          <ThemedText type="body">Send me a test digest now</ThemedText>
        )}
      </Pressable>
    </ScrollView>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background },
    statRow: { flexDirection: "row" },
    statCard: { flex: 1, padding: Spacing.md },
    questionRow: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm },
  });
