import React from "react";
import { View, StyleSheet, FlatList, RefreshControl, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { FAB } from "@/components/FAB";
import { Card } from "@/components/Card";
import { ProBanner } from "@/components/ProBanner";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useApp } from "@/context/AppContext";

function GettingStartedItem({ icon, label, completed, onPress, theme }: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  completed: boolean;
  onPress: () => void;
  theme: any;
}) {
  return (
    <Pressable onPress={onPress} style={styles.gettingStartedItem}>
      <View style={[
        styles.gettingStartedCheck,
        { backgroundColor: completed ? theme.success : theme.backgroundSecondary, borderColor: completed ? theme.success : theme.border }
      ]}>
        {completed ? (
          <Feather name="check" size={14} color="#FFFFFF" />
        ) : null}
      </View>
      <ThemedText type="body" style={[
        styles.gettingStartedLabel,
        completed ? { color: theme.textSecondary, textDecorationLine: "line-through" } : {}
      ]}>
        {label}
      </ThemedText>
      <Feather name="chevron-right" size={16} color={theme.textSecondary} />
    </Pressable>
  );
}

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

  const { data: communications = [], refetch: refetchComms } = useQuery<any[]>({
    queryKey: ['/api/communications'],
  });

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchQuotes(), refetchCustomers(), refetchTasks(), refetchComms()]);
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
  const recentComms = (communications || []).slice(0, 5);
  const activeLeads = (customers || []).filter((c: any) => c.status === "lead").length;

  const getChannelIcon = (channel: string): "mail" | "message-square" | "phone" => {
    switch (channel) {
      case "email": return "mail";
      case "sms": return "message-square";
      case "phone": return "phone";
      default: return "message-square";
    }
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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const renderHeader = () => (
    <View>
      <View style={styles.greeting}>
        <View>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: 2, textTransform: "uppercase", letterSpacing: 1, fontWeight: "600" }}>
            {getGreeting()}
          </ThemedText>
          <ThemedText type="h1">
            {profile?.companyName || "QuotePro"}
          </ThemedText>
        </View>
      </View>

      {(stats?.totalQuotes === 0 || !stats) && customers.length === 0 ? (
        <View style={[styles.gettingStarted, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <ThemedText type="h4" style={styles.gettingStartedTitle}>Getting Started</ThemedText>
          <ThemedText type="small" style={[styles.gettingStartedSubtitle, { color: theme.textSecondary }]}>
            Complete these steps to set up your business
          </ThemedText>
          <GettingStartedItem
            icon="briefcase"
            label="Set up your business profile"
            completed={!!profile?.companyName}
            onPress={() => navigation.navigate("MainTabs", { screen: "Settings" })}
            theme={theme}
          />
          <GettingStartedItem
            icon="dollar-sign"
            label="Configure your pricing"
            completed={false}
            onPress={() => navigation.navigate("PricingSettings")}
            theme={theme}
          />
          <GettingStartedItem
            icon="users"
            label="Add your first customer"
            completed={customers.length > 0}
            onPress={() => navigation.navigate("MainTabs", { screen: "Customers" })}
            theme={theme}
          />
          <GettingStartedItem
            icon="file-text"
            label="Create your first quote"
            completed={(stats?.totalQuotes || 0) > 0}
            onPress={handleNewQuote}
            theme={theme}
          />
        </View>
      ) : null}

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

      <ProBanner message="Unlock AI-powered messages, direct sending, and smart descriptions" />

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

      {recentComms.length > 0 ? (
        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>Recent Activity</ThemedText>
          {recentComms.map((comm: any) => (
            <View
              key={comm.id}
              style={[styles.activityRow, { borderColor: theme.border }]}
            >
              <View style={[styles.activityIcon, { backgroundColor: `${theme.primary}15` }]}>
                <Feather name={getChannelIcon(comm.channel)} size={14} color={theme.primary} />
              </View>
              <View style={styles.activityContent}>
                <ThemedText type="small" numberOfLines={1} style={{ fontWeight: "500" }}>
                  {comm.subject || `${(comm.channel || "").charAt(0).toUpperCase() + (comm.channel || "").slice(1)} communication`}
                </ThemedText>
                {comm.content ? (
                  <ThemedText type="caption" numberOfLines={1} style={{ color: theme.textSecondary }}>
                    {comm.content}
                  </ThemedText>
                ) : null}
              </View>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {formatDate(comm.createdAt)}
              </ThemedText>
            </View>
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
      icon="file-text"
      iconColor={theme.primary}
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
    letterSpacing: 0.3,
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
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: {
    flex: 1,
    gap: 2,
  },
  gettingStarted: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  gettingStartedTitle: {
    marginBottom: 4,
  },
  gettingStartedSubtitle: {
    marginBottom: Spacing.lg,
  },
  gettingStartedItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  gettingStartedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  gettingStartedLabel: {
    flex: 1,
  },
});
