import React, { useCallback } from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemedText } from "@/components/ThemedText";
import { StatCard } from "@/components/StatCard";
import { QuoteListItem } from "@/components/QuoteListItem";
import { EmptyState } from "@/components/EmptyState";
import { FAB } from "@/components/FAB";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { Quote } from "@/types";
import { getQuotes } from "@/lib/storage";
import { useApp } from "@/context/AppContext";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { theme } = useTheme();
  const { businessProfile: profile } = useApp();
  const [quotes, setQuotes] = React.useState<Quote[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadData = useCallback(async () => {
    const quotesData = await getQuotes();
    setQuotes(quotesData);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleNewQuote = () => {
    navigation.navigate("QuoteCalculator");
  };

  const handleQuotePress = (quote: Quote) => {
    navigation.navigate("QuoteDetail", { quoteId: quote.id });
  };

  const recentQuotes = quotes.slice(0, 5);

  const thisWeekRevenue = quotes
    .filter((q) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(q.createdAt) >= weekAgo && q.status === "accepted";
    })
    .reduce((sum, q) => sum + q.options[q.selectedOption].price, 0);

  const pendingQuotes = quotes.filter(
    (q) => q.status === "sent" || q.status === "draft"
  ).length;

  const avgQuoteValue =
    quotes.length > 0
      ? Math.round(
          quotes.reduce((sum, q) => sum + q.options[q.selectedOption].price, 0) /
            quotes.length
        )
      : 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const renderHeader = () => (
    <View>
      <View style={styles.greeting}>
        <ThemedText type="h2">
          {getGreeting()}
          {profile?.companyName ? `, ${profile.companyName}` : ""}
        </ThemedText>
      </View>

      <View style={styles.stats}>
        <StatCard
          title="This Week"
          value={`$${thisWeekRevenue.toLocaleString()}`}
          icon="trending-up"
          color={theme.success}
        />
        <StatCard
          title="Pending"
          value={pendingQuotes.toString()}
          icon="clock"
          color={theme.warning}
        />
        <StatCard
          title="Avg Quote"
          value={`$${avgQuoteValue}`}
          icon="bar-chart-2"
          color={theme.primary}
        />
      </View>

      {recentQuotes.length > 0 ? (
        <View style={styles.sectionHeader}>
          <ThemedText type="h4">Recent Quotes</ThemedText>
        </View>
      ) : null}
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-dashboard.png")}
      title="Ready to create your first quote?"
      description="Tap the + button to generate a professional cleaning quote in minutes."
      actionLabel="Create Quote"
      onAction={handleNewQuote}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={recentQuotes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <QuoteListItem quote={item} onPress={() => handleQuotePress(item)} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl + 80,
          },
          quotes.length === 0 && styles.emptyContent,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      <FAB onPress={handleNewQuote} />
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
  emptyContent: {
    flexGrow: 1,
  },
  greeting: {
    marginBottom: Spacing.xl,
  },
  stats: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
  },
});
