import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const PURPLE = "#7C3AED";

type RouteParams = RouteProp<RootStackParamList, "AIQuoteAssistantThread">;

function StatusBadge({ thread, theme }: { thread: any; theme: any }) {
  if (!thread) return null;
  const isHuman = thread.handoffStatus === "human";
  const isPaused = thread.aiStatus === "paused";
  const color = isHuman ? "#EF4444" : isPaused ? "#6B7280" : PURPLE;
  const label = isHuman ? "Needs Human" : isPaused ? "AI Paused" : "AI Active";
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + "22" }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText style={[styles.statusText, { color }]}>{label}</ThemedText>
    </View>
  );
}

function IntakeCard({ intake, theme }: { intake: any; theme: any }) {
  if (!intake) return null;
  const score = intake.completionScore ?? 0;
  const fields = [
    ["Service", intake.serviceType],
    ["ZIP", intake.zipCode],
    ["Bedrooms", intake.bedrooms],
    ["Bathrooms", intake.bathrooms],
    ["Sq. Ft.", intake.squareFootage],
    ["Pets", intake.pets],
    ["Frequency", intake.frequency],
    ["Preferred Date", intake.preferredDate],
  ].filter(([, v]) => !!v);

  return (
    <View style={[styles.intakeCard, { backgroundColor: PURPLE + "10", borderColor: PURPLE + "33" }]}>
      <View style={styles.intakeHeader}>
        <Feather name="clipboard" size={14} color={PURPLE} />
        <ThemedText style={[styles.intakeTitle, { color: PURPLE }]}>Intake Progress — {score}%</ThemedText>
      </View>
      <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
        <View style={[styles.progressFill, { width: `${score}%` as any, backgroundColor: PURPLE }]} />
      </View>
      {fields.map(([label, val]) => (
        <ThemedText key={label as string} style={[styles.intakeField, { color: theme.text }]}>
          <ThemedText style={{ color: theme.textMuted }}>{label}: </ThemedText>
          {val}
        </ThemedText>
      ))}
    </View>
  );
}

function MessageBubble({ message, theme }: { message: any; theme: any }) {
  const isInbound = message.direction === "inbound";
  return (
    <View style={[styles.bubbleRow, isInbound ? styles.bubbleLeft : styles.bubbleRight]}>
      <View style={[
        styles.bubble,
        { backgroundColor: isInbound ? theme.surface : PURPLE, borderColor: theme.border },
        isInbound ? styles.bubbleInbound : styles.bubbleOutbound,
      ]}>
        <ThemedText style={[styles.bubbleText, { color: isInbound ? theme.text : "#fff" }]}>
          {message.body}
        </ThemedText>
        <ThemedText style={[styles.bubbleTime, { color: isInbound ? theme.textMuted : "#ffffff99" }]}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {!isInbound && message.provider === "linq" ? "  AI" : ""}
        </ThemedText>
      </View>
    </View>
  );
}

export default function AIQuoteAssistantThreadScreen() {
  const theme = useTheme();
  const route = useRoute<RouteParams>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  const { threadId } = route.params;
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestedReply, setSuggestedReply] = useState("");
  const [generatingSuggestion, setGeneratingSuggestion] = useState(false);

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/ai-assistant/threads", threadId],
    queryFn: async () => {
      const { getApiUrl } = await import("@/lib/query-client");
      const url = new URL(`/api/ai-assistant/threads/${threadId}`, getApiUrl());
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load thread");
      return res.json();
    },
  });

  const thread = data?.thread;
  const messages: any[] = data?.messages || [];
  const intake = data?.intake;

  async function sendReply() {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await apiRequest("POST", `/api/ai-assistant/threads/${threadId}/reply`, { body: replyText.trim() });
      setReplyText("");
      setSuggestedReply("");
      refetch();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  async function takeOver() {
    try {
      await apiRequest("POST", `/api/ai-assistant/threads/${threadId}/take-over`, {});
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/ai-assistant/threads"] });
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }

  async function resumeAI() {
    try {
      await apiRequest("POST", `/api/ai-assistant/threads/${threadId}/release-to-ai`, {});
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/ai-assistant/threads"] });
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }

  async function generateSuggestion() {
    setGeneratingSuggestion(true);
    try {
      const res = await apiRequest("POST", `/api/ai-assistant/threads/${threadId}/generate-suggested-reply`, {});
      setSuggestedReply(res.suggestedReply || "");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setGeneratingSuggestion(false);
    }
  }

  const isHuman = thread?.handoffStatus === "human";
  const isAiActive = thread?.aiStatus === "active";

  if (isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={PURPLE} />
      </ThemedView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding" keyboardVerticalOffset={0}>
      <FlatList
        data={messages}
        keyExtractor={(m) => m.id}
        inverted={messages.length > 0}
        contentContainerStyle={{ paddingTop: headerHeight + Spacing.sm, paddingBottom: Spacing.md, paddingHorizontal: Spacing.md }}
        ListHeaderComponent={
          <View>
            {/* Status / Actions */}
            <View style={styles.topActions}>
              <StatusBadge thread={thread} theme={theme} />
              <View style={styles.actionBtns}>
                {isAiActive && !isHuman ? (
                  <Pressable style={[styles.actionBtn, { backgroundColor: "#EF444422", borderColor: "#EF4444" }]} onPress={takeOver}>
                    <ThemedText style={{ color: "#EF4444", fontSize: 13, fontWeight: "700" }}>Take Over</ThemedText>
                  </Pressable>
                ) : (
                  <Pressable style={[styles.actionBtn, { backgroundColor: PURPLE + "22", borderColor: PURPLE }]} onPress={resumeAI}>
                    <ThemedText style={{ color: PURPLE, fontSize: 13, fontWeight: "700" }}>Resume AI</ThemedText>
                  </Pressable>
                )}
              </View>
            </View>
            {/* Intake */}
            {intake ? <IntakeCard intake={intake} theme={theme} /> : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>No messages yet.</ThemedText>
          </View>
        }
        renderItem={({ item }) => <MessageBubble message={item} theme={theme} />}
      />

      {/* Suggested Reply */}
      {suggestedReply.length > 0 && (
        <Pressable
          style={[styles.suggestionBanner, { backgroundColor: PURPLE + "15", borderColor: PURPLE + "44" }]}
          onPress={() => setReplyText(suggestedReply)}
        >
          <Feather name="zap" size={14} color={PURPLE} style={{ marginRight: 6 }} />
          <ThemedText style={[styles.suggestionText, { color: PURPLE }]} numberOfLines={2}>
            {suggestedReply}
          </ThemedText>
          <ThemedText style={[styles.tapUse, { color: PURPLE }]}>Tap to use</ThemedText>
        </Pressable>
      )}

      {/* Input */}
      <View style={[styles.inputContainer, { borderTopColor: theme.border, paddingBottom: insets.bottom + 8 }]}>
        <Pressable style={styles.suggestionBtn} onPress={generateSuggestion} disabled={generatingSuggestion}>
          {generatingSuggestion ? (
            <ActivityIndicator size="small" color={PURPLE} />
          ) : (
            <Feather name="zap" size={18} color={PURPLE} />
          )}
        </Pressable>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
          placeholder="Type a reply..."
          placeholderTextColor={theme.textMuted}
          value={replyText}
          onChangeText={setReplyText}
          multiline
          maxLength={500}
        />
        <Pressable
          style={[styles.sendBtn, { backgroundColor: replyText.trim() ? PURPLE : theme.border }]}
          onPress={sendReply}
          disabled={sending || !replyText.trim()}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="send" size={18} color="#fff" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 15 },
  topActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: Spacing.sm },
  statusBadge: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusText: { fontSize: 12, fontWeight: "700" },
  actionBtns: { flexDirection: "row", gap: 8 },
  actionBtn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  intakeCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.md },
  intakeHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  intakeTitle: { fontSize: 13, fontWeight: "700" },
  progressBar: { height: 4, borderRadius: 2, marginBottom: 10, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  intakeField: { fontSize: 13, marginBottom: 3 },
  bubbleRow: { marginBottom: 8 },
  bubbleLeft: { alignItems: "flex-start" },
  bubbleRight: { alignItems: "flex-end" },
  bubble: { maxWidth: "80%", borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleInbound: { borderBottomLeftRadius: 4 },
  bubbleOutbound: { borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontSize: 11, marginTop: 4, textAlign: "right" },
  suggestionBanner: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, paddingVertical: 10, borderTopWidth: 1 },
  suggestionText: { flex: 1, fontSize: 13, lineHeight: 17 },
  tapUse: { fontSize: 11, fontWeight: "700", marginLeft: 8 },
  inputContainer: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: Spacing.md, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  suggestionBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  input: { flex: 1, borderRadius: BorderRadius.lg, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
});
