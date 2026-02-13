import React from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useSubscription } from "@/context/SubscriptionContext";

interface PipelineData {
  totalPipeline: number;
  expectedValue: number;
  openQuotes: number;
  avgAgeDays: number;
  quotes: any[];
}

interface UnfollowedQuote {
  id: number;
  total: number;
  status: string;
  sentAt: string | null;
  createdAt: string;
  customer: {
    firstName: string;
    lastName: string;
  } | null;
}

export default function RevenueScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { theme } = useTheme();
  const { isPro } = useSubscription();

  const { data: pipeline, refetch: refetchPipeline } = useQuery<PipelineData>({
    queryKey: ["/api/revenue/pipeline"],
  });

  const { data: unfollowed = [], refetch: refetchUnfollowed } = useQuery<UnfollowedQuote[]>({
    queryKey: ["/api/revenue/unfollowed"],
  });

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchPipeline(), refetchUnfollowed()]);
    setRefreshing(false);
  };

  const getDaysAgo = (sentAt: string | null, createdAt: string) => {
    const date = new Date(sentAt || createdAt).getTime();
    return Math.round((Date.now() - date) / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted": return theme.success;
      case "sent": return theme.primary;
      case "draft": return theme.textSecondary;
      case "declined": return theme.error;
      case "expired": return theme.warning;
      default: return theme.textSecondary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsRow}>
          <StatCard
            title="Pipeline"
            value={`$${(pipeline?.totalPipeline || 0).toLocaleString()}`}
            icon="dollar-sign"
            color={theme.primary}
          />
          <StatCard
            title="Open Quotes"
            value={(pipeline?.openQuotes || 0).toString()}
            icon="file-text"
            color={theme.warning}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title="Expected"
            value={`$${(pipeline?.expectedValue || 0).toLocaleString()}`}
            icon="trending-up"
            color={theme.success}
          />
          <StatCard
            title="Avg Age"
            value={`${pipeline?.avgAgeDays || 0}d`}
            icon="clock"
            color={theme.textSecondary}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h4">Needs Follow-Up</ThemedText>
            {unfollowed.length > 0 ? (
              <View style={[styles.countBadge, { backgroundColor: `${theme.warning}20` }]}>
                <ThemedText type="caption" style={{ color: theme.warning, fontWeight: "600" }}>
                  {unfollowed.length}
                </ThemedText>
              </View>
            ) : null}
          </View>

          {unfollowed.length > 0 ? (
            unfollowed.map((quote) => {
              const daysAgo = getDaysAgo(quote.sentAt, quote.createdAt);
              const customerName = quote.customer
                ? `${quote.customer.firstName} ${quote.customer.lastName}`
                : "No customer";

              return (
                <Card
                  key={quote.id}
                  style={styles.quoteCard}
                  onPress={() => navigation.navigate("QuoteDetail", { quoteId: quote.id })}
                >
                  <View style={styles.quoteRow}>
                    <View style={styles.quoteInfo}>
                      <ThemedText type="body" numberOfLines={1} style={{ fontWeight: "500" }}>
                        {customerName}
                      </ThemedText>
                      <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                        Sent {daysAgo} days ago
                      </ThemedText>
                    </View>
                    <View style={styles.quoteRight}>
                      <ThemedText type="h4">
                        ${quote.total.toLocaleString()}
                      </ThemedText>
                      <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(quote.status)}20` }]}>
                        <ThemedText type="caption" style={{ color: getStatusColor(quote.status) }}>
                          {quote.status}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </Card>
              );
            })
          ) : (
            <EmptyState
              icon="check-circle"
              iconColor={theme.success}
              title="All Caught Up"
              description="No quotes need follow-up right now"
            />
          )}
        </View>

        {isPro ? (
          <Card
            style={styles.aiCard}
            onPress={() => navigation.navigate("AIAssistant")}
          >
            <View style={styles.aiRow}>
              <View style={[styles.aiIcon, { backgroundColor: `${theme.primary}15` }]}>
                <Feather name="zap" size={20} color={theme.primary} />
              </View>
              <View style={styles.aiContent}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  AI Sales Assistant
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Get insights to close more deals
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color={theme.textSecondary} />
            </View>
          </Card>
        ) : null}
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
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  section: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  quoteCard: {
    marginBottom: Spacing.sm,
  },
  quoteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quoteInfo: {
    flex: 1,
    gap: 2,
  },
  quoteRight: {
    alignItems: "flex-end",
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: 4,
  },
  aiCard: {
    marginBottom: Spacing.lg,
  },
  aiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  aiIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  aiContent: {
    flex: 1,
    gap: 2,
  },
});
