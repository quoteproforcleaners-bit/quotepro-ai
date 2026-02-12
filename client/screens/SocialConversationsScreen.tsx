import React from "react";
import { View, StyleSheet, FlatList, Pressable, RefreshControl } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

export default function SocialConversationsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { theme } = useTheme();

  const { data: conversations = [], refetch, isLoading } = useQuery<any[]>({
    queryKey: ["/api/social/conversations"],
  });

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  };

  const renderItem = ({ item }: { item: any }) => (
    <Pressable
      onPress={() => navigation.navigate("SocialConversationDetail", { conversationId: item.id })}
      style={[styles.convItem, { backgroundColor: theme.backgroundDefault }]}
      testID={`conversation-item-${item.id}`}
    >
      <View style={[styles.avatar, { backgroundColor: item.channel === "instagram" ? "#E1306C20" : `${theme.text}15` }]}>
        <Feather
          name={item.channel === "instagram" ? "instagram" : "video"}
          size={20}
          color={item.channel === "instagram" ? "#E1306C" : theme.text}
        />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.nameRow}>
          <ThemedText type="subtitle" style={{ flex: 1 }}>{item.senderName || "Unknown"}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {formatTime(item.lastMessageAt || item.createdAt)}
          </ThemedText>
        </View>
        <View style={styles.statusRow}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>{item.channel}</ThemedText>
          {item.autoReplied ? (
            <View style={[styles.badge, { backgroundColor: `${theme.success}20` }]}>
              <ThemedText type="caption" style={{ color: theme.success, fontSize: 10 }}>Auto-replied</ThemedText>
            </View>
          ) : null}
          {item.optedOut ? (
            <View style={[styles.badge, { backgroundColor: `${theme.error}20` }]}>
              <ThemedText type="caption" style={{ color: theme.error, fontSize: 10 }}>Opted out</ThemedText>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.md,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
        flexGrow: 1,
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      ListEmptyComponent={
        <EmptyState
          icon="message-circle"
          iconColor={theme.accent}
          title="No Conversations"
          description="Conversations from Instagram DMs will appear here."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
});
