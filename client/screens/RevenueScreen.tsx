import React from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, useWindowDimensions } from "react-native";
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
import { useLanguage } from "@/context/LanguageContext";

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
  const { t } = useLanguage();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;

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

  if (!isPro) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: headerHeight + Spacing.xl,
              paddingBottom: tabBarHeight + Spacing.xl,
            },
            ...(useMaxWidth ? [{ maxWidth: 560, alignSelf: "center" as const, width: "100%" as const }] : []),
          ]}
        >
          <View style={styles.paywallContainer}>
            <View style={[styles.paywallIcon, { backgroundColor: `${theme.primary}15` }]}>
              <Feather name="trending-up" size={40} color={theme.primary} />
            </View>
            <ThemedText type="h3" style={{ textAlign: "center", marginTop: Spacing.lg }}>
              {t.revenue.revenueIntelligence}
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
              {t.revenue.revenueIntelligenceDesc}
            </ThemedText>
            <View style={styles.featureList}>
              {[
                { icon: "dollar-sign", text: t.revenue.pipelineTracking },
                { icon: "bell", text: t.revenue.smartAlerts },
                { icon: "zap", text: t.revenue.aiSalesAssistant },
                { icon: "bar-chart-2", text: t.revenue.closeRateAnalytics },
              ].map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Feather name={f.icon as any} size={16} color={theme.primary} />
                  <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>{f.text}</ThemedText>
                </View>
              ))}
            </View>
            <Pressable
              onPress={() => navigation.navigate("Paywall")}
              style={[styles.upgradeBtn, { backgroundColor: theme.primary }]}
              testID="revenue-upgrade-btn"
            >
              <Feather name="zap" size={18} color="#FFFFFF" />
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: Spacing.sm }}>
                {t.revenue.upgradeToAI}
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
          ...(useMaxWidth ? [{ maxWidth: 560, alignSelf: "center" as const, width: "100%" as const }] : []),
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Card
          style={[styles.aiCard, { borderWidth: 1.5, borderColor: '#9B59B6' }]}
          onPress={() => navigation.navigate("AIAssistant")}
        >
          <View style={styles.aiRow}>
            <View style={[styles.aiIcon, { backgroundColor: '#9B59B615' }]}>
              <Feather name="zap" size={20} color="#9B59B6" />
            </View>
            <View style={styles.aiContent}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {t.revenue.aiSalesAssistant}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {t.revenue.getInsights}
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </View>
        </Card>

        <View style={styles.statsRow}>
          <StatCard
            title={t.revenue.pipeline}
            value={`$${(pipeline?.totalPipeline || 0).toLocaleString()}`}
            icon="dollar-sign"
            color={theme.primary}
          />
          <StatCard
            title={t.revenue.openQuotes}
            value={(pipeline?.openQuotes || 0).toString()}
            icon="file-text"
            color={theme.warning}
          />
        </View>

        <View style={styles.statsRow}>
          <StatCard
            title={t.revenue.expected}
            value={`$${(pipeline?.expectedValue || 0).toLocaleString()}`}
            icon="trending-up"
            color={theme.success}
          />
          <StatCard
            title={t.revenue.avgAge}
            value={`${pipeline?.avgAgeDays || 0}d`}
            icon="clock"
            color={theme.textSecondary}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h4">{t.revenue.needsFollowUp}</ThemedText>
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
                : t.revenue.noCustomer;

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
                        {t.revenue.sentDaysAgo.replace("{days}", daysAgo.toString())}
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
              title={t.revenue.allCaughtUp}
              description={t.revenue.allCaughtUpDesc}
            />
          )}
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
  paywallContainer: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl * 2,
  },
  paywallIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  featureList: {
    width: "100%",
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xl,
    width: "100%",
  },
});
