import React, { useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useAIConsent } from "@/context/AIConsentContext";
import { AIConsentGate } from "@/components/AIConsentGate";
import { ProGate } from "@/components/ProGate";

interface Script {
  label: string;
  content: string;
}

interface CoachResponse {
  mode: string;
  quickTakeaway: string;
  approach: string;
  scripts: Script[];
  alternateVersions: Script[];
  nextStep: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  structured?: CoachResponse;
  isLoading?: boolean;
  isError?: boolean;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { text: "Write a follow-up for a quote with no response", icon: "send" as const },
  { text: "How do I handle 'That's too expensive'?", icon: "dollar-sign" as const },
  { text: "How do I push recurring service without being pushy?", icon: "repeat" as const },
  { text: "Write a script to explain why a deep clean comes first", icon: "star" as const },
  { text: "Give me a follow-up sequence for a residential quote", icon: "list" as const },
  { text: "What should I say after sending a quote?", icon: "clock" as const },
];

const MODE_LABELS: Record<string, string> = {
  "follow-up": "Follow-Up",
  objection: "Objection",
  script: "Script",
  strategy: "Strategy",
  coaching: "Coaching",
};

const MODE_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  "follow-up": "send",
  objection: "shield",
  script: "edit-3",
  strategy: "trending-up",
  coaching: "award",
};

function CopyButton({ text, label, theme }: { text: string; label?: string; theme: any }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Pressable
      onPress={handleCopy}
      style={[
        cs.copyBtn,
        {
          backgroundColor: copied ? `${theme.success}15` : `${theme.primary}10`,
          borderColor: copied ? `${theme.success}40` : `${theme.primary}25`,
        },
      ]}
    >
      <Feather name={copied ? "check" : "copy"} size={12} color={copied ? theme.success : theme.primary} />
      <ThemedText type="caption" style={{ color: copied ? theme.success : theme.primary, fontWeight: "600", fontSize: 11 }}>
        {copied ? "Copied" : (label || "Copy")}
      </ThemedText>
    </Pressable>
  );
}

function ScriptBlock({ script, theme, isDark }: { script: Script; theme: any; isDark: boolean }) {
  return (
    <View style={[cs.scriptBlock, { backgroundColor: isDark ? theme.surface0 : theme.backgroundSecondary, borderColor: theme.border }]}>
      <View style={cs.scriptHeader}>
        <View style={[cs.scriptLabelPill, { backgroundColor: `${theme.primary}12` }]}>
          <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "700", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6 }}>
            {script.label}
          </ThemedText>
        </View>
        <CopyButton text={script.content} theme={theme} />
      </View>
      <ThemedText type="small" style={{ color: theme.text, lineHeight: 20, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md }}>{script.content}</ThemedText>
    </View>
  );
}

function CoachingCard({ msg, theme, isDark }: { msg: Message; theme: any; isDark: boolean }) {
  const [showAlternates, setShowAlternates] = useState(false);
  const r = msg.structured!;
  const modeLabel = MODE_LABELS[r.mode] || "Coaching";
  const modeIcon = MODE_ICONS[r.mode] || "award";

  return (
    <View style={cs.coachCard}>
      {/* Mode badge */}
      <View style={cs.modeBadgeRow}>
        <View style={[cs.modeBadge, { backgroundColor: `${theme.primary}12`, borderColor: `${theme.primary}25` }]}>
          <Feather name={modeIcon} size={11} color={theme.primary} />
          <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "700", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6 }}>
            {modeLabel}
          </ThemedText>
        </View>
      </View>

      {/* Quick takeaway */}
      {r.quickTakeaway ? (
        <View style={[cs.takeawayBox, { backgroundColor: isDark ? `${theme.primary}15` : `${theme.primary}08`, borderLeftColor: theme.primary }]}>
          <ThemedText type="defaultSemiBold" style={{ color: theme.text, lineHeight: 22 }}>
            {r.quickTakeaway}
          </ThemedText>
        </View>
      ) : null}

      {/* Approach */}
      {r.approach ? (
        <View style={cs.approachBox}>
          <ThemedText type="caption" style={[cs.sectionLabel, { color: theme.textMuted }]}>APPROACH</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 20 }}>{r.approach}</ThemedText>
        </View>
      ) : null}

      {/* Scripts */}
      {r.scripts.length > 0 ? (
        <View style={cs.scriptsSection}>
          <ThemedText type="caption" style={[cs.sectionLabel, { color: theme.textMuted }]}>READY-TO-SEND</ThemedText>
          {r.scripts.map((s, i) => (
            <ScriptBlock key={i} script={s} theme={theme} isDark={isDark} />
          ))}
        </View>
      ) : null}

      {/* Alternate versions */}
      {r.alternateVersions.length > 0 ? (
        <View>
          <Pressable
            onPress={() => setShowAlternates((v) => !v)}
            style={cs.alternatesToggle}
          >
            <Feather name={showAlternates ? "chevron-up" : "chevron-down"} size={13} color={theme.textMuted} />
            <ThemedText type="caption" style={{ color: theme.textMuted, fontWeight: "600" }}>
              {showAlternates ? "Hide alternates" : `${r.alternateVersions.length} alternate version${r.alternateVersions.length > 1 ? "s" : ""}`}
            </ThemedText>
          </Pressable>
          {showAlternates ? (
            <View style={{ gap: Spacing.sm }}>
              {r.alternateVersions.map((s, i) => (
                <ScriptBlock key={i} script={s} theme={theme} isDark={isDark} />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Next step */}
      {r.nextStep ? (
        <View style={[cs.nextStepBox, { backgroundColor: isDark ? theme.surface1 : theme.surface0, borderColor: theme.border }]}>
          <View style={cs.nextStepHeader}>
            <Feather name="arrow-right-circle" size={13} color={theme.primary} />
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "700", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Next Move
            </ThemedText>
          </View>
          <ThemedText type="caption" style={{ color: theme.textSecondary, lineHeight: 18 }}>{r.nextStep}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function MessageBubble({ msg, theme, isDark }: { msg: Message; theme: any; isDark: boolean }) {
  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <View style={[cs.userBubbleWrap]}>
        <View style={[cs.userBubble, { backgroundColor: theme.primary }]}>
          <ThemedText type="small" style={{ color: "#fff", lineHeight: 20 }}>{msg.content}</ThemedText>
        </View>
      </View>
    );
  }

  if (msg.isLoading) {
    return (
      <View style={cs.loadingWrap}>
        <View style={[cs.loadingIcon, { backgroundColor: `${theme.primary}15` }]}>
          <Feather name="award" size={14} color={theme.primary} />
        </View>
        <View style={[cs.loadingBubble, { backgroundColor: isDark ? theme.surface1 : theme.backgroundSecondary, borderColor: theme.border }]}>
          <ActivityIndicator size="small" color={theme.primary} />
          <ThemedText type="caption" style={{ color: theme.textMuted }}>Thinking through the best sales move...</ThemedText>
        </View>
      </View>
    );
  }

  if (msg.isError) {
    return (
      <View style={cs.loadingWrap}>
        <View style={[cs.loadingIcon, { backgroundColor: `${theme.error}15` }]}>
          <Feather name="alert-circle" size={14} color={theme.error} />
        </View>
        <View style={[cs.errorBubble, { backgroundColor: `${theme.error}08`, borderColor: `${theme.error}25` }]}>
          <ThemedText type="small" style={{ color: theme.error }}>{msg.content}</ThemedText>
        </View>
      </View>
    );
  }

  if (msg.structured) {
    return (
      <View style={cs.assistantWrap}>
        <View style={[cs.coachIcon, { backgroundColor: `${theme.primary}15` }]}>
          <Feather name="award" size={14} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <CoachingCard msg={msg} theme={theme} isDark={isDark} />
        </View>
      </View>
    );
  }

  return (
    <View style={cs.loadingWrap}>
      <View style={[cs.loadingIcon, { backgroundColor: `${theme.primary}15` }]}>
        <Feather name="award" size={14} color={theme.primary} />
      </View>
      <View style={[cs.plainBubble, { backgroundColor: isDark ? theme.surface1 : theme.backgroundSecondary, borderColor: theme.border }]}>
        <ThemedText type="small" style={{ color: theme.text, lineHeight: 20 }}>{msg.content}</ThemedText>
      </View>
    </View>
  );
}

export default function AIAssistantScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { requestConsent } = useAIConsent();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const consented = await requestConsent();
    if (!consented) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };
    const loadingMsg: Message = {
      id: "loading",
      role: "assistant",
      content: "",
      isLoading: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [loadingMsg, userMsg, ...prev]);
    setInput("");
    setIsLoading(true);

    const allMsgs = [userMsg, ...messages];
    const conversationHistory = allMsgs
      .filter((m) => !m.isLoading && !m.isError)
      .slice(0, 4)
      .reverse()
      .map((m) => ({
        role: m.role,
        content: m.structured ? JSON.stringify(m.structured) : m.content,
      }));

    try {
      const res = await apiRequest("POST", "/api/ai/sales-chat", {
        message: text.trim(),
        conversationHistory,
      });
      const data = await res.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "",
        structured: data.mode ? {
          mode: data.mode,
          quickTakeaway: data.quickTakeaway || "",
          approach: data.approach || "",
          scripts: data.scripts || [],
          alternateVersions: data.alternateVersions || [],
          nextStep: data.nextStep || "",
        } : undefined,
        timestamp: new Date(),
      };

      setMessages((prev) => prev.map((m) => (m.id === "loading" ? assistantMsg : m)));
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Something went wrong. Please check your connection and try again.",
        isError: true,
        timestamp: new Date(),
      };
      setMessages((prev) => prev.map((m) => (m.id === "loading" ? errMsg : m)));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, requestConsent]);

  const renderItem = useCallback(({ item }: { item: Message }) => (
    <MessageBubble msg={item} theme={theme} isDark={isDark} />
  ), [theme, isDark]);

  const EmptyState = () => (
    <View style={cs.emptyState}>
      <View style={[cs.emptyIcon, { backgroundColor: `${theme.primary}15` }]}>
        <Feather name="award" size={28} color={theme.primary} />
      </View>
      <ThemedText type="h3" style={[cs.emptyTitle, { color: theme.text }]}>Sales Coach</ThemedText>
      <ThemedText type="small" style={[cs.emptyDesc, { color: theme.textSecondary }]}>
        Ask anything about closing jobs, handling objections, or growing your cleaning business.
      </ThemedText>
      <View style={cs.promptGrid}>
        {QUICK_PROMPTS.map((p) => (
          <Pressable
            key={p.text}
            onPress={() => sendMessage(p.text)}
            style={[cs.promptChip, { borderColor: theme.border, backgroundColor: isDark ? theme.surface1 : theme.surface0 }]}
            testID={`chip-prompt-${p.icon}`}
          >
            <Feather name={p.icon} size={13} color={theme.primary} />
            <ThemedText type="caption" style={{ color: theme.text, flex: 1, lineHeight: 16 }}>{p.text}</ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <ProGate featureName="AI Business Advisor">
      <AIConsentGate>
        <KeyboardAvoidingView
          style={[cs.container, { backgroundColor: theme.backgroundRoot }]}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={flatListRef}
            inverted={messages.length > 0}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={EmptyState}
            contentContainerStyle={[
              cs.listContent,
              { paddingTop: headerHeight + Spacing.md },
              messages.length === 0 ? cs.emptyListContent : undefined,
            ]}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
          />

          <View
            style={[
              cs.inputBar,
              {
                backgroundColor: theme.backgroundDefault,
                borderTopColor: theme.border,
                paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.sm,
              },
            ]}
          >
            <TextInput
              style={[
                cs.textInput,
                {
                  backgroundColor: isDark ? theme.surface1 : theme.backgroundSecondary,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Ask your sales coach..."
              placeholderTextColor={theme.textMuted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage(input)}
              returnKeyType="send"
              multiline
              maxLength={1200}
              testID="input-message"
            />
            <Pressable
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              style={[
                cs.sendBtn,
                {
                  backgroundColor: input.trim() && !isLoading ? theme.primary : (isDark ? theme.surface1 : theme.backgroundSecondary),
                },
              ]}
              testID="button-send"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={input.trim() ? "#fff" : theme.textMuted} />
              ) : (
                <Feather name="send" size={18} color={input.trim() ? "#fff" : theme.textMuted} />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </AIConsentGate>
    </ProGate>
  );
}

const cs = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.md },
  emptyListContent: { flexGrow: 1, justifyContent: "center" },
  emptyState: { alignItems: "center", paddingHorizontal: Spacing.lg, gap: Spacing.md },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  emptyTitle: { textAlign: "center" },
  emptyDesc: { textAlign: "center", lineHeight: 20 },
  promptGrid: { width: "100%", gap: Spacing.sm, marginTop: Spacing.sm },
  promptChip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },

  userBubbleWrap: { alignSelf: "flex-end", maxWidth: "80%" },
  userBubble: { padding: Spacing.md, borderRadius: BorderRadius.md, borderBottomRightRadius: 4 },

  loadingWrap: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  loadingIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 2 },
  loadingBubble: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  errorBubble: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1 },
  plainBubble: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1 },

  assistantWrap: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  coachIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 4 },

  coachCard: { flex: 1, gap: Spacing.md },
  modeBadgeRow: { flexDirection: "row" },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  takeawayBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderLeftWidth: 3,
  },
  approachBox: { gap: 4 },
  sectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.7, textTransform: "uppercase" },
  scriptsSection: { gap: Spacing.sm },
  scriptBlock: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: "hidden",
  },
  scriptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  scriptLabelPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  alternatesToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: Spacing.xs,
  },
  nextStepBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  nextStepHeader: { flexDirection: "row", alignItems: "center", gap: 5 },

  inputBar: {
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
    fontSize: 15,
    lineHeight: 20,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

