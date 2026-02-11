import React from "react";
import { View, StyleSheet, FlatList, RefreshControl, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { FAB } from "@/components/FAB";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useApp } from "@/context/AppContext";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { theme } = useTheme();
  const { businessProfile: profile } = useApp();

  const { data: stats, refetch: refetchStats } = useQuery<{
    totalQuotes: number;
    sentQuotes: number;
    acceptedQuotes: number;
    declinedQuotes: number;
    expiredQuotes: number;
    totalRevenue: number;
    avgQuoteValue: number;
    closeRate: number;
  }>({
    queryKey: ['/api/reports/stats'],
  });

  const { data: recentQuotes = [], refetch: refetchQuotes } = useQuery<any[]>({
    queryKey: ['/api/quotes'],
  });

  const { data: customers = [], refetch: refetchCustomers } = useQuery<any[]>({
    queryKey: ['/api/customers'],
  });

  const { data: tasks = [], refetch: refetchTasks } = useQuery<any[]>({
    queryKey: ['/api/tasks'],
  });

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchQuotes(), refetchCustomers(), refetchTasks()]);
    setRefreshing(false);
  };

  const handleNewQuote = () => {
    navigation.navigate("QuoteCalculator");
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const pendingTasks = (tasks || []).filter((t: any) => !t.completed);
  const recent5Quotes = (recentQuotes || []).slice(0, 5);
  const activeLeads = (customers || []).filter((c: any) => c.status === "lead").length;

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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
          title="Revenue"
          value={`$${(stats?.totalRevenue || 0).toLocaleString()}`}
          icon="trending-up"
          color={theme.success}
        />
        <StatCard
          title="Close Rate"
          value={`${stats?.closeRate || 0}%`}
          icon="target"
          color={theme.primary}
        />
        <StatCard
          title="Leads"
          value={activeLeads.toString()}
          icon="users"
          color={theme.warning}
        />
      </View>

      {pendingTasks.length > 0 ? (
        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>Tasks Due</ThemedText>
          {pendingTasks.slice(0, 3).map((task: any) => (
            <Pressable
              key={task.id}
              style={[styles.taskRow, { borderColor: theme.border }]}
              onPress={() => {}}
              testID={`task-row-${task.id}`}
            >
              <View style={[styles.taskDot, { backgroundColor: theme.warning }]} />
              <View style={styles.taskContent}>
                <ThemedText type="small" numberOfLines={1}>{task.title}</ThemedText>
                {task.dueDate ? (
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    {formatDate(task.dueDate)}
                  </ThemedText>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {recent5Quotes.length > 0 ? (
        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>Recent Quotes</ThemedText>
        </View>
      ) : null}
    </View>
  );

  const renderQuoteItem = ({ item }: { item: any }) => (
    <Card
      style={styles.quoteCard}
      onPress={() => navigation.navigate("QuoteDetail", { quoteId: item.id })}
    >
      <View style={styles.quoteRow}>
        <View style={styles.quoteInfo}>
          <ThemedText type="body" numberOfLines={1}>
            {item.customerId ? "Customer Quote" : "Quick Quote"}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {formatDate(item.createdAt)}
          </ThemedText>
        </View>
        <View style={styles.quoteRight}>
          <ThemedText type="h4">${item.total.toFixed(0)}</ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <ThemedText type="caption" style={{ color: getStatusColor(item.status) }}>
              {item.status}
            </ThemedText>
          </View>
        </View>
      </View>
    </Card>
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
        data={recent5Quotes}
        keyExtractor={(item) => item.id}
        renderItem={renderQuoteItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl + 80,
          },
          recent5Quotes.length === 0 && styles.emptyContent,
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
  greeting: {
    marginBottom: Spacing.xl,
  },
  stats: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  taskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.md,
  },
  taskContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
});
