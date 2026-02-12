import React from "react";
import { View, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

export default function SocialConversationDetailScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const { theme } = useTheme();
  const conversationId = route.params?.conversationId;

  const { data: messages = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/social/conversations/${conversationId}/messages`],
    enabled: !!conversationId,
  });

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: headerHeight }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const renderMessage = ({ item }: { item: any }) => {
    const isOutbound = item.direction === "outbound";
    return (
      <View style={[
        styles.messageBubble,
        isOutbound ? styles.outbound : styles.inbound,
        {
          backgroundColor: isOutbound ? theme.accent : theme.backgroundDefault,
        }
      ]}>
        <ThemedText type="small" style={{ color: isOutbound ? "#FFFFFF" : theme.text }}>
          {item.content}
        </ThemedText>
        <View style={styles.messageFooter}>
          {item.intentDetected ? (
            <View style={[styles.intentBadge, { backgroundColor: isOutbound ? "rgba(255,255,255,0.2)" : `${theme.accent}20` }]}>
              <Feather name="zap" size={10} color={isOutbound ? "#FFFFFF" : theme.accent} />
              <ThemedText type="caption" style={{ color: isOutbound ? "#FFFFFF" : theme.accent, fontSize: 10, marginLeft: 2 }}>
                {Math.round((item.intentConfidence || 0) * 100)}% {item.intentCategory}
              </ThemedText>
            </View>
          ) : null}
          <ThemedText type="caption" style={{ color: isOutbound ? "rgba(255,255,255,0.6)" : theme.textSecondary, fontSize: 10 }}>
            {formatTime(item.createdAt)}
          </ThemedText>
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={renderMessage}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.md,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
        flexGrow: 1,
      }}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Feather name="message-circle" size={32} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
            No messages in this conversation
          </ThemedText>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  inbound: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  outbound: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  intentBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["5xl"],
  },
});
