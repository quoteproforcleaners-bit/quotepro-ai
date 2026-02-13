import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useSubscription } from "@/context/SubscriptionContext";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_ACTIONS = [
  "Review my pipeline",
  "Who needs follow-up?",
  "How can I improve close rate?",
  "Draft a follow-up message",
];

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function AIAssistantScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { theme } = useTheme();
  const { isPro } = useSubscription();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!isPro) {
      navigation.replace("Paywall");
    }
  }, [isPro]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    const loadingMessage: Message = {
      id: "loading",
      role: "assistant",
      content: "...",
      timestamp: new Date(),
    };

    setMessages((prev) => [loadingMessage, userMessage, ...prev]);
    setInput("");
    setIsLoading(true);

    const allMessages = [userMessage, ...messages];
    const conversationHistory = allMessages
      .slice(0, 6)
      .reverse()
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await apiRequest("POST", "/api/ai/sales-chat", {
        message: text.trim(),
        conversationHistory,
      });
      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) =>
        prev.map((m) => (m.id === "loading" ? assistantMessage : m))
      );
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I couldn't process your request. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) =>
        prev.map((m) => (m.id === "loading" ? errorMessage : m))
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    sendMessage(action);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    const isLoadingMsg = item.id === "loading";

    return (
      <View
        style={[
          styles.messageBubbleRow,
          isUser ? styles.userRow : styles.assistantRow,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser
              ? { backgroundColor: theme.primary }
              : { backgroundColor: theme.backgroundSecondary },
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          {isLoadingMsg ? (
            <ActivityIndicator
              size="small"
              color={theme.textSecondary}
              style={{ paddingVertical: Spacing.xs }}
            />
          ) : (
            <ThemedText
              type="body"
              style={isUser ? { color: "#FFFFFF" } : undefined}
            >
              {item.content}
            </ThemedText>
          )}
        </View>
        {!isLoadingMsg ? (
          <ThemedText
            type="caption"
            style={[
              styles.timestamp,
              { color: theme.textSecondary },
              isUser ? styles.timestampRight : styles.timestampLeft,
            ]}
          >
            {getRelativeTime(item.timestamp)}
          </ThemedText>
        ) : null}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View
        style={[
          styles.emptyIconContainer,
          { backgroundColor: `${theme.primary}15` },
        ]}
      >
        <Feather name="message-circle" size={32} color={theme.primary} />
      </View>
      <ThemedText type="h3" style={styles.emptyTitle}>
        AI Sales Assistant
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.emptyDescription, { color: theme.textSecondary }]}
      >
        Ask me anything about your sales pipeline, follow-ups, or strategy
      </ThemedText>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <FlatList
        ref={flatListRef}
        inverted={messages.length > 0}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: headerHeight },
          messages.length === 0 ? styles.emptyListContent : undefined,
        ]}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      />

      {messages.length === 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
          keyboardShouldPersistTaps="handled"
        >
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action}
              onPress={() => handleQuickAction(action)}
              style={[
                styles.chip,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
              testID={`chip-${action.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <ThemedText type="small">{action}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundDefault,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.sm,
          },
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: theme.inputBackground,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          placeholder="Ask about your sales..."
          placeholderTextColor={theme.textSecondary}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={1000}
          testID="input-message"
        />
        <Pressable
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || isLoading}
          style={[
            styles.sendButton,
            {
              backgroundColor:
                input.trim() && !isLoading
                  ? theme.primary
                  : theme.backgroundSecondary,
            },
          ]}
          testID="button-send"
        >
          <Feather
            name="send"
            size={20}
            color={
              input.trim() && !isLoading ? "#FFFFFF" : theme.textSecondary
            }
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  messageBubbleRow: {
    marginVertical: Spacing.xs,
    maxWidth: "80%",
  },
  userRow: {
    alignSelf: "flex-end",
  },
  assistantRow: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  userBubble: {
    borderBottomRightRadius: Spacing.xs,
  },
  assistantBubble: {
    borderBottomLeftRadius: Spacing.xs,
  },
  timestamp: {
    marginTop: Spacing.xs,
  },
  timestampRight: {
    textAlign: "right",
  },
  timestampLeft: {
    textAlign: "left",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    textAlign: "center",
  },
  chipsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minWidth: 140,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
