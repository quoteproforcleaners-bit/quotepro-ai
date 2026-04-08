import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, RefreshControl, useWindowDimensions, Pressable } from "react-native";
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
import { TypeFilterBar } from "@/components/TypeFilterBar";
import { ProBanner } from "@/components/ProBanner";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { useLanguage } from "@/context/LanguageContext";
import { useTutorial } from "@/context/TutorialContext";
import { QUOTES_TOUR } from "@/lib/tourDefinitions";

type FilterType = "all" | "draft" | "sent" | "accepted";
type TypeFilter = "all" | "residential" | "commercial";

export default function QuotesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;
  const { startTour, hasCompletedTour, isActive: tourActive } = useTutorial();
  const [filter, setFilter] = useState<FilterType>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const { data: quotes = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['/api/quotes'],
  });

  const [refreshing, setRefreshing] = useState(false);

  React.useEffect(() => {
    if (!hasCompletedTour(QUOTES_TOUR.id) && !tourActive) {
      const timer = setTimeout(() => startTour(QUOTES_TOUR), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleNewQuote = () => {
    navigation.navigate("QuoteCalculator");
  };

  const handlePhotoToQuote = () => {
    navigation.navigate("PhotoToQuote");
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Pressable
            onPress={handlePhotoToQuote}
            style={{ padding: 8 }}
            testID="button-photo-to-quote"
            hitSlop={8}
          >
            <Feather name="camera" size={22} color={theme.primary} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, theme]);

  const handleQuotePress = (quote: any) => {
    navigation.navigate("QuoteDetail", { quoteId: quote.id });
  };

  const getQuoteType = (q: any): string => {
    const pd = q.propertyDetails;
    if (pd && typeof pd === "object" && pd.quoteType === "commercial") {
      return "commercial";
    }
    return "residential";
  };

  const filteredQuotes = (quotes || []).filter((q: any) => {
    if (filter !== "all" && q.status !== filter) return false;
    if (typeFilter !== "all" && getQuoteType(q) !== typeFilter) return false;
    return true;
  });

  const filterOptions = [
    { label: t.common.all, value: "all" as FilterType },
    { label: t.quotes.draft, value: "draft" as FilterType },
    { label: t.quotes.sent, value: "sent" as FilterType },
    { label: t.quotes.accepted, value: "accepted" as FilterType },
  ];

  const typeFilterOptions: { label: string; value: TypeFilter; icon: "grid" | "home" | "briefcase" }[] = [
    { label: t.common.all, value: "all", icon: "grid" },
    { label: "Residential", value: "residential", icon: "home" },
    { label: "Commercial", value: "commercial", icon: "briefcase" },
  ];

  const renderHeader = () => (
    <View>
      <ProBanner message={t.quotes.sendDirectBanner} />
      <View style={styles.filterContainer}>
        <SegmentedControl
          options={filterOptions}
          value={filter}
          onChange={setFilter}
        />
      </View>
      <TypeFilterBar
        options={typeFilterOptions}
        value={typeFilter}
        onChange={setTypeFilter}
      />
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      icon="file-text"
      iconColor={theme.primary}
      title={t.quotes.noQuotes}
      description={t.quotes.noQuotesDesc}
      actionLabel={t.quotes.createQuote}
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
          ...(useMaxWidth ? [{ maxWidth: 560, alignSelf: "center" as const, width: "100%" as const }] : []),
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
    marginBottom: Spacing.sm,
  },
});
