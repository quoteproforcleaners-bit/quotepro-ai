import React, { useState } from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { QuoteListItem } from "@/components/QuoteListItem";
import { EmptyState } from "@/components/EmptyState";
import { FAB } from "@/components/FAB";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

type FilterType = "all" | "draft" | "sent" | "accepted";

export default function QuotesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { theme } = useTheme();
  const [filter, setFilter] = useState<FilterType>("all");

  const { data: quotes = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/quotes'],
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleNewQuote = () => {
    navigation.navigate("QuoteCalculator");
  };

  const handleQuotePress = (quote: any) => {
    navigation.navigate("QuoteDetail", { quoteId: quote.id });
  };

  const filteredQuotes = (quotes || []).filter((q: any) => {
    if (filter === "all") return true;
    return q.status === filter;
  });

  const filterOptions = [
    { label: "All", value: "all" as FilterType },
    { label: "Draft", value: "draft" as FilterType },
    { label: "Sent", value: "sent" as FilterType },
    { label: "Accepted", value: "accepted" as FilterType },
  ];

  const renderHeader = () => (
    <View style={styles.filterContainer}>
      <SegmentedControl
        options={filterOptions}
        value={filter}
        onChange={setFilter}
      />
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      icon="file-text"
      iconColor={theme.primary}
      title="No quotes yet"
      description="Create your first quote to start tracking your proposals and close more deals."
      actionLabel="Create Quote"
      onAction={handleNewQuote}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={filteredQuotes}
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
          filteredQuotes.length === 0 && styles.emptyContent,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      <FAB onPress={handleNewQuote} testID="create-quote-fab" />
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
  filterContainer: {
    marginBottom: Spacing.lg,
  },
});
