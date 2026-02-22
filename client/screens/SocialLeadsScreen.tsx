import React, { useState } from "react";
import { View, StyleSheet, FlatList, Pressable, RefreshControl } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { SegmentedControl } from "@/components/SegmentedControl";

const FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Quoted", value: "quoted" },
  { label: "Converted", value: "converted" },
];
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ProGate } from "@/components/ProGate";

export default function SocialLeadsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [filter, setFilter] = useState("all");

  const { data: leads = [], refetch } = useQuery<any[]>({
    queryKey: ["/api/social/leads"],
  });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const filteredLeads = filter === "all" ? leads : leads.filter((l: any) => l.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "converted": return theme.success;
      case "quoted": return theme.primary;
      case "contacted": return theme.accent;
      default: return theme.warning;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.leadItem, { backgroundColor: theme.backgroundDefault }]}>
      <View style={[styles.channelDot, { backgroundColor: item.channel === "instagram" ? "#E1306C" : theme.text }]} />
      <View style={{ flex: 1 }}>
        <ThemedText type="subtitle">{item.senderName}</ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {item.channel} - {item.attribution?.replace(/_/g, " ")} - {formatDate(item.createdAt)}
        </ThemedText>
        {item.dmText ? (
          <ThemedText type="caption" numberOfLines={1} style={{ color: theme.textSecondary, marginTop: 2 }}>
            "{item.dmText}"
          </ThemedText>
        ) : null}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
        <ThemedText type="caption" style={{ color: getStatusColor(item.status), fontSize: 11 }}>
          {item.status}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <ProGate featureName="Social Leads">
      <View style={{ flex: 1 }}>
        <View style={{ paddingTop: headerHeight + Spacing.md, paddingHorizontal: Spacing.lg }}>
          <SegmentedControl
            options={FILTER_OPTIONS}
            value={filter}
            onChange={setFilter}
          />
        </View>
        <FlatList
          data={filteredLeads}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingTop: Spacing.md,
            paddingBottom: insets.bottom + Spacing.xl,
            paddingHorizontal: Spacing.lg,
            flexGrow: 1,
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          ListEmptyComponent={
            <EmptyState
              icon="user-plus"
              iconColor={theme.accent}
              title="No Social Leads"
              description="Leads from Instagram DMs will appear here when the AI detects buying intent."
            />
          }
        />
      </View>
    </ProGate>
  );
}

const styles = StyleSheet.create({
  leadItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  channelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
});
