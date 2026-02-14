import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  Pressable,
  FlatList,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { FeatureFlags } from "@/lib/featureFlags";
import { runAiCommand, EXAMPLE_PROMPTS, AiCommandResult } from "@/lib/aiCommandRouter";

function RotatingPrompts({ onTap }: { onTap: (prompt: string) => void }) {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(() => Math.floor(Math.random() * EXAMPLE_PROMPTS.length));
  const [displayText, setDisplayText] = useState(EXAMPLE_PROMPTS[currentIndex]);
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const lastIndex = useRef(currentIndex);

  const getNextIndex = useCallback(() => {
    let next: number;
    do {
      next = Math.floor(Math.random() * EXAMPLE_PROMPTS.length);
    } while (next === lastIndex.current && EXAMPLE_PROMPTS.length > 1);
    lastIndex.current = next;
    return next;
  }, []);

  const updateText = useCallback((idx: number) => {
    setDisplayText(EXAMPLE_PROMPTS[idx]);
    setCurrentIndex(idx);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      opacity.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) }, () => {
        const nextIdx = getNextIndex();
        runOnJS(updateText)(nextIdx);
        translateY.value = 8;
        opacity.value = withTiming(1, { duration: 300, easing: Easing.in(Easing.ease) });
        translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Pressable onPress={() => onTap(displayText)} testID="rotating-prompt">
      <Animated.View style={[styles.promptContainer, animStyle]}>
        <Feather name="zap" size={14} color={theme.primary} style={{ marginRight: 6 }} />
        <ThemedText type="small" style={{ color: theme.primary, flex: 1 }} numberOfLines={1}>
          {displayText}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

const QUICK_ACTIONS = [
  { label: "New Quote", icon: "file-plus" as const, action: "create_quote" },
  { label: "Follow up quotes", icon: "refresh-cw" as const, action: "follow_up" },
  { label: "This month booked", icon: "bar-chart-2" as const, action: "metrics" },
  { label: "Draft a reply", icon: "edit-3" as const, action: "draft" },
  { label: "Unpaid invoices", icon: "alert-circle" as const, action: "invoices" },
  { label: "Schedule a job", icon: "calendar" as const, action: "schedule" },
];

function QuickActionChips({ onAction }: { onAction: (action: string) => void }) {
  const { theme } = useTheme();
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={QUICK_ACTIONS}
      keyExtractor={(item) => item.action}
      contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.sm }}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => {
            if (item.action === "invoices") return;
            onAction(item.action);
          }}
          style={[
            styles.chip,
            {
              backgroundColor: item.action === "invoices" ? theme.backgroundSecondary : theme.cardBackground,
              borderColor: theme.border,
              opacity: item.action === "invoices" ? 0.6 : 1,
            },
          ]}
          testID={`chip-${item.action}`}
        >
          <Feather name={item.icon} size={14} color={item.action === "invoices" ? theme.textSecondary : theme.primary} />
          <ThemedText
            type="caption"
            style={{
              color: item.action === "invoices" ? theme.textSecondary : theme.text,
              marginLeft: 6,
            }}
          >
            {item.action === "invoices" ? "Coming soon" : item.label}
          </ThemedText>
        </Pressable>
      )}
    />
  );
}

function ResponseCard({ result, onDismiss, onAction }: {
  result: AiCommandResult;
  onDismiss: () => void;
  onAction: (action: string) => void;
}) {
  const { theme } = useTheme();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 250 });
    translateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.responseCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }, animStyle]}>
      <View style={styles.responseHeader}>
        <View style={[styles.responseIconBg, { backgroundColor: `${theme.primary}15` }]}>
          <Feather name="cpu" size={16} color={theme.primary} />
        </View>
        <ThemedText type="small" style={{ fontWeight: "600", flex: 1 }}>QuotePro</ThemedText>
        <Pressable onPress={onDismiss} hitSlop={12}>
          <Feather name="x" size={16} color={theme.textSecondary} />
        </Pressable>
      </View>
      <ThemedText type="body" style={{ marginTop: Spacing.sm }}>
        {result.responseText}
      </ThemedText>
      {result.metricValue ? (
        <ThemedText type="h1" style={{ color: theme.primary, marginTop: Spacing.sm }}>
          {result.metricValue}
        </ThemedText>
      ) : null}
      {result.suggestedActions && result.suggestedActions.length > 0 ? (
        <View style={styles.suggestedRow}>
          {result.suggestedActions.map((a, i) => (
            <Pressable
              key={i}
              style={[styles.suggestedChip, { backgroundColor: `${theme.primary}10`, borderColor: `${theme.primary}30` }]}
              onPress={() => onAction(a)}
            >
              <ThemedText type="caption" style={{ color: theme.primary }}>{a}</ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

function GlanceCard({ title, value, icon, color, onPress }: {
  title: string; value: string; icon: keyof typeof Feather.glyphMap; color: string; onPress?: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      style={[styles.glanceCard, { backgroundColor: theme.cardBackground }]}
      onPress={onPress}
      testID={`glance-${title.toLowerCase().replace(/\s/g, "-")}`}
    >
      <View style={[styles.glanceIcon, { backgroundColor: `${color}15` }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <ThemedText type="h3" style={{ marginTop: 6 }}>{value}</ThemedText>
      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>{title}</ThemedText>
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
  const inputRef = useRef<TextInput>(null);

  const [commandText, setCommandText] = useState("");
  const [commandResult, setCommandResult] = useState<AiCommandResult | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: stats, refetch: refetchStats } = useQuery<{
    totalQuotes: number;
    sentQuotes: number;
    acceptedQuotes: number;
    declinedQuotes: number;
    expiredQuotes: number;
    totalRevenue: number;
    avgQuoteValue: number;
    closeRate: number;
  }>({ queryKey: ["/api/reports/stats"] });

  const { data: quotes = [], refetch: refetchQuotes } = useQuery<any[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: customers = [], refetch: refetchCustomers } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  const { data: allJobs = [], refetch: refetchJobs } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchQuotes(), refetchCustomers(), refetchJobs()]);
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const followUpCount = useMemo(() => {
    return (quotes || []).filter((q: any) => q.status === "sent" || q.status === "draft").length;
  }, [quotes]);

  const todayJobCount = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    return (allJobs || []).filter((j: any) => {
      if (!j.startDatetime) return false;
      return j.startDatetime.slice(0, 10) === todayStr && j.status !== "cancelled";
    }).length;
  }, [allJobs]);

  const monthRevenue = stats?.totalRevenue || 0;

  const appData = useMemo(() => ({
    stats,
    quotes,
    customers,
    jobs: allJobs,
  }), [stats, quotes, customers, allJobs]);

  const executeCommand = useCallback((text: string) => {
    if (!text.trim()) return;
    const result = runAiCommand(text, appData);
    setCommandResult(result);

    if (result.navigation) {
      setTimeout(() => {
        if (result.navigation!.screen) {
          navigation.navigate(result.navigation!.screen, result.navigation!.params || {});
        } else if (result.navigation!.tab) {
          navigation.navigate("Main", { screen: result.navigation!.tab });
        }
      }, 600);
    }
  }, [appData, navigation]);

  const handleSubmit = () => {
    executeCommand(commandText);
    setCommandText("");
  };

  const handlePromptTap = (prompt: string) => {
    setCommandText(prompt);
    executeCommand(prompt);
  };

  const handleChipAction = (action: string) => {
    switch (action) {
      case "create_quote":
        navigation.navigate("QuoteCalculator");
        break;
      case "follow_up":
        executeCommand("Show quotes I haven't followed up on");
        break;
      case "metrics":
        executeCommand("How many cleans booked this month?");
        break;
      case "draft":
        navigation.navigate("AIAssistant");
        break;
      case "schedule":
        navigation.navigate("Main", { screen: "JobsTab" });
        break;
    }
  };

  const handleSuggestedAction = (action: string) => {
    const lower = action.toLowerCase();
    if (lower.includes("quote") && lower.includes("create")) {
      navigation.navigate("QuoteCalculator");
    } else if (lower.includes("revenue") || lower.includes("report")) {
      navigation.navigate("Main", { screen: "RevenueTab" });
    } else if (lower.includes("follow")) {
      executeCommand("follow up quotes");
    } else if (lower.includes("draft") || lower.includes("message")) {
      navigation.navigate("AIAssistant");
    } else if (lower.includes("customer") || lower.includes("search")) {
      navigation.navigate("Main", { screen: "CustomersTab" });
    } else if (lower.includes("quote")) {
      navigation.navigate("Main", { screen: "QuotesTab" });
    } else {
      executeCommand(action);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.greetingRow}>
          <ThemedText type="caption" style={{ color: theme.textSecondary, textTransform: "uppercase", letterSpacing: 1, fontWeight: "600" }}>
            {getGreeting()}
          </ThemedText>
          <ThemedText type="h4" numberOfLines={1} style={{ marginTop: 2 }}>
            {profile?.companyName || "QuotePro"}
          </ThemedText>
        </View>

        <View style={[styles.commandCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.sm }}>
            What would you like to do?
          </ThemedText>
          <View style={[styles.inputRow, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            <TextInput
              ref={inputRef}
              style={[styles.commandInput, { color: theme.text }]}
              placeholder="Ask QuotePro..."
              placeholderTextColor={theme.textSecondary}
              value={commandText}
              onChangeText={setCommandText}
              onSubmitEditing={handleSubmit}
              returnKeyType="send"
              testID="command-input"
            />
            <Pressable
              onPress={handleSubmit}
              style={[styles.sendBtn, { backgroundColor: commandText.trim() ? theme.primary : theme.backgroundSecondary }]}
              testID="command-send"
            >
              <Feather name="send" size={16} color={commandText.trim() ? "#FFF" : theme.textSecondary} />
            </Pressable>
          </View>
          <RotatingPrompts onTap={handlePromptTap} />
        </View>

        {commandResult ? (
          <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg }}>
            <ResponseCard
              result={commandResult}
              onDismiss={() => setCommandResult(null)}
              onAction={handleSuggestedAction}
            />
          </View>
        ) : null}

        {!FeatureFlags.aiEnabled ? (
          <View style={[styles.aiBanner, { backgroundColor: `${theme.primary}08`, borderColor: `${theme.primary}20` }]}>
            <View style={styles.aiBannerContent}>
              <Feather name="zap" size={16} color={theme.primary} />
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <ThemedText type="small" style={{ fontWeight: "600" }}>
                  AI features launch in ~1-2 weeks
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                  Smart replies, auto follow-ups, and more
                </ThemedText>
              </View>
            </View>
            <Pressable
              style={[styles.upgradeCta, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate("Paywall")}
              testID="upgrade-cta"
            >
              <ThemedText type="caption" style={{ color: "#FFF", fontWeight: "600" }}>Learn More</ThemedText>
            </Pressable>
          </View>
        ) : null}

        <View style={{ marginBottom: Spacing.lg }}>
          <QuickActionChips onAction={handleChipAction} />
        </View>

        <View style={styles.sectionHeader}>
          <ThemedText type="h4">Today at a glance</ThemedText>
          <Pressable onPress={() => navigation.navigate("Main", { screen: "QuotesTab" })} testID="recent-quotes-link">
            <ThemedText type="caption" style={{ color: theme.primary }}>Recent Quotes</ThemedText>
          </Pressable>
        </View>

        <View style={styles.glanceRow}>
          <GlanceCard
            title="Need follow-up"
            value={followUpCount.toString()}
            icon="phone-missed"
            color={theme.warning}
            onPress={() => navigation.navigate("Main", { screen: "QuotesTab" })}
          />
          <GlanceCard
            title="Jobs today"
            value={todayJobCount.toString()}
            icon="calendar"
            color={theme.primary}
            onPress={() => navigation.navigate("Main", { screen: "JobsTab" })}
          />
          <GlanceCard
            title="This month"
            value={`$${monthRevenue.toLocaleString()}`}
            icon="trending-up"
            color={theme.success}
            onPress={() => navigation.navigate("Main", { screen: "RevenueTab" })}
          />
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
    flexGrow: 1,
  },
  greetingRow: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  commandCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingLeft: Spacing.md,
    paddingRight: 4,
    height: 48,
  },
  commandInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  promptContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingVertical: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  responseCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  responseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  responseIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestedRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  suggestedChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  aiBanner: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  aiBannerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  upgradeCta: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
    marginLeft: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  glanceRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  glanceCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  glanceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
