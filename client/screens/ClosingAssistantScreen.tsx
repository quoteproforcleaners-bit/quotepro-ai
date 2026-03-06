import React, { useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { trackEvent } from "@/lib/analytics";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "ClosingAssistant">;

type MessageType =
  | "text_message"
  | "email"
  | "follow_up"
  | "objection_handling"
  | "recurring_upsell"
  | "deep_clean_first";

type Tone =
  | "professional"
  | "friendly"
  | "premium"
  | "warm"
  | "direct"
  | "confident";

type Language = "en" | "es" | "pt" | "ru";

const MESSAGE_TYPES: { value: MessageType; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: "text_message", label: "Text Message", icon: "message-square" },
  { value: "email", label: "Email", icon: "mail" },
  { value: "follow_up", label: "Follow-up", icon: "repeat" },
  { value: "objection_handling", label: "Objection Handling", icon: "shield" },
  { value: "recurring_upsell", label: "Recurring Upsell", icon: "trending-up" },
  { value: "deep_clean_first", label: "Deep Clean First", icon: "star" },
];

const TONES: { value: Tone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "premium", label: "Premium" },
  { value: "warm", label: "Warm" },
  { value: "direct", label: "Direct" },
  { value: "confident", label: "Confident" },
];

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "pt", label: "Portuguese" },
  { value: "ru", label: "Russian" },
];

export default function ClosingAssistantScreen({ route }: Props) {
  const { theme, isDark } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const params = route.params || {};
  const {
    quoteAmount,
    serviceType,
    frequency,
    addOns,
    customerName,
    notes,
    pricingSummary,
  } = params;

  const [messageType, setMessageType] = useState<MessageType>("text_message");
  const [tone, setTone] = useState<Tone>("friendly");
  const [language, setLanguage] = useState<Language>("en");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsLoading(true);
    setError("");
    setGeneratedMessage("");
    setCopied(false);

    try {
      const res = await apiRequest("POST", "/api/ai/closing-message", {
        quoteAmount,
        serviceType,
        frequency,
        addOns,
        customerName,
        notes,
        pricingSummary,
        messageType,
        tone,
        language,
      });
      const data = await res.json();
      setGeneratedMessage(data.message || "");
      trackEvent("walkthrough_closing_message_generated", {
        messageType,
        tone,
        language,
      });
    } catch (e: any) {
      setError(e?.message || "Failed to generate message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedMessage) return;
    try {
      await Clipboard.setStringAsync(generatedMessage);
      setCopied(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <ThemedText type="small" style={[styles.helperText, { color: theme.textSecondary }]}>
        Generate a closing message tailored to your quote details, tone, and language.
      </ThemedText>

      <ThemedText type="subtitle" style={styles.sectionLabel}>
        Message Type
      </ThemedText>
      <View style={styles.chipGrid}>
        {MESSAGE_TYPES.map((mt) => {
          const selected = messageType === mt.value;
          return (
            <Pressable
              key={mt.value}
              onPress={() => {
                setMessageType(mt.value);
                if (Platform.OS !== "web") Haptics.selectionAsync();
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: selected
                    ? isDark
                      ? `${theme.primary}30`
                      : `${theme.primary}12`
                    : isDark
                    ? theme.surface1
                    : theme.surface0,
                  borderColor: selected ? theme.primary : theme.border,
                },
              ]}
              testID={`chip-message-type-${mt.value}`}
            >
              <Feather
                name={mt.icon}
                size={14}
                color={selected ? theme.primary : theme.textMuted}
              />
              <ThemedText
                type="caption"
                style={{
                  color: selected ? theme.primary : theme.text,
                  fontWeight: selected ? "600" : "400",
                }}
              >
                {mt.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ThemedText type="subtitle" style={styles.sectionLabel}>
        Tone
      </ThemedText>
      <View style={styles.chipRow}>
        {TONES.map((t) => {
          const selected = tone === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={() => {
                setTone(t.value);
                if (Platform.OS !== "web") Haptics.selectionAsync();
              }}
              style={[
                styles.toneChip,
                {
                  backgroundColor: selected
                    ? isDark
                      ? `${theme.primary}30`
                      : `${theme.primary}12`
                    : isDark
                    ? theme.surface1
                    : theme.surface0,
                  borderColor: selected ? theme.primary : theme.border,
                },
              ]}
              testID={`chip-tone-${t.value}`}
            >
              <ThemedText
                type="caption"
                style={{
                  color: selected ? theme.primary : theme.text,
                  fontWeight: selected ? "600" : "400",
                }}
              >
                {t.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ThemedText type="subtitle" style={styles.sectionLabel}>
        Language
      </ThemedText>
      <View style={styles.chipRow}>
        {LANGUAGES.map((l) => {
          const selected = language === l.value;
          return (
            <Pressable
              key={l.value}
              onPress={() => {
                setLanguage(l.value);
                if (Platform.OS !== "web") Haptics.selectionAsync();
              }}
              style={[
                styles.toneChip,
                {
                  backgroundColor: selected
                    ? isDark
                      ? `${theme.primary}30`
                      : `${theme.primary}12`
                    : isDark
                    ? theme.surface1
                    : theme.surface0,
                  borderColor: selected ? theme.primary : theme.border,
                },
              ]}
              testID={`chip-language-${l.value}`}
            >
              <ThemedText
                type="caption"
                style={{
                  color: selected ? theme.primary : theme.text,
                  fontWeight: selected ? "600" : "400",
                }}
              >
                {l.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {customerName ? (
        <Card variant="base" style={styles.contextCard}>
          <View style={styles.contextRow}>
            <Feather name="user" size={14} color={theme.textMuted} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {customerName}
            </ThemedText>
          </View>
          {quoteAmount ? (
            <View style={styles.contextRow}>
              <Feather name="dollar-sign" size={14} color={theme.textMuted} />
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                ${Number(quoteAmount).toFixed(2)}
              </ThemedText>
            </View>
          ) : null}
          {serviceType ? (
            <View style={styles.contextRow}>
              <Feather name="briefcase" size={14} color={theme.textMuted} />
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {serviceType}
              </ThemedText>
            </View>
          ) : null}
          {frequency ? (
            <View style={styles.contextRow}>
              <Feather name="repeat" size={14} color={theme.textMuted} />
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {frequency}
              </ThemedText>
            </View>
          ) : null}
        </Card>
      ) : null}

      <Button
        onPress={handleGenerate}
        disabled={isLoading}
        style={styles.generateBtn}
        testID="button-generate-closing"
      >
        {isLoading ? "Generating..." : "Generate Message"}
      </Button>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: `${theme.error}10`, borderColor: `${theme.error}30` }]}>
          <Feather name="alert-circle" size={16} color={theme.error} />
          <ThemedText type="small" style={{ color: theme.error, flex: 1 }}>
            {error}
          </ThemedText>
        </View>
      ) : null}

      {generatedMessage ? (
        <View style={styles.resultSection}>
          <ThemedText type="subtitle" style={styles.sectionLabel}>
            Generated Message
          </ThemedText>
          <Card variant="raised" style={styles.messageCard}>
            <TextInput
              value={generatedMessage}
              onChangeText={setGeneratedMessage}
              multiline
              style={[
                styles.messageText,
                {
                  color: theme.text,
                  backgroundColor: isDark ? theme.surface0 : theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
              textAlignVertical="top"
              testID="input-generated-message"
            />
          </Card>

          <View style={styles.actionRow}>
            <Pressable
              onPress={handleCopy}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: copied
                    ? isDark
                      ? `${theme.success}30`
                      : `${theme.success}12`
                    : isDark
                    ? theme.surface1
                    : theme.surface0,
                  borderColor: copied ? theme.success : theme.border,
                },
              ]}
              testID="button-copy-message"
            >
              <Feather
                name={copied ? "check" : "copy"}
                size={16}
                color={copied ? theme.success : theme.primary}
              />
              <ThemedText
                type="small"
                style={{ color: copied ? theme.success : theme.primary, fontWeight: "600" }}
              >
                {copied ? "Copied" : "Copy"}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleRegenerate}
              disabled={isLoading}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: isDark ? theme.surface1 : theme.surface0,
                  borderColor: theme.border,
                  opacity: isLoading ? 0.5 : 1,
                },
              ]}
              testID="button-regenerate-message"
            >
              <Feather name="refresh-cw" size={16} color={theme.primary} />
              <ThemedText
                type="small"
                style={{ color: theme.primary, fontWeight: "600" }}
              >
                Regenerate
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText type="small" style={[styles.loadingText, { color: theme.textSecondary }]}>
            Crafting your message...
          </ThemedText>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  helperText: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  toneChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  contextCard: {
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  contextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  generateBtn: {
    marginTop: Spacing.xl,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  resultSection: {
    marginTop: Spacing.lg,
  },
  messageCard: {
    padding: 0,
  },
  messageText: {
    minHeight: 160,
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    gap: Spacing.md,
  },
  loadingText: {
    textAlign: "center",
  },
});
