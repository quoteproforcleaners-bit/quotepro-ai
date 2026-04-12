import React, { useState, useCallback } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/query-client";

export type SmsContext =
  | "follow_up"
  | "quote_sent"
  | "booking_confirm"
  | "review_request"
  | "custom";

const CONTEXT_OPTIONS: { value: SmsContext; label: string }[] = [
  { value: "follow_up", label: "Follow-Up" },
  { value: "quote_sent", label: "Quote Sent" },
  { value: "booking_confirm", label: "Booking Confirm" },
  { value: "review_request", label: "Review Request" },
  { value: "custom", label: "Custom" },
];

const MAX_CHARS = 160;
const WARN_CHARS = 155;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  clientPhone: string;
  context?: SmsContext;
  quoteAmount?: number;
  serviceDate?: string;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function SmsSendModal({
  isOpen,
  onClose,
  clientName,
  clientPhone,
  context: initialContext = "follow_up",
  quoteAmount,
  serviceDate,
}: Props) {
  const { theme } = useTheme();
  const [selectedContext, setSelectedContext] = useState<SmsContext>(initialContext);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [customNote, setCustomNote] = useState("");

  const { data: business } = useQuery<{ companyName?: string }>({
    queryKey: ["/api/business"],
  });

  const companyName = business?.companyName || "Your Cleaning Company";

  const generateDraft = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(new URL("/api/sms/generate-draft", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          clientName,
          context: selectedContext,
          quoteAmount,
          serviceDate,
          companyName,
          customNote: selectedContext === "custom" ? customNote : undefined,
        }),
      });
      const data = await res.json();
      if (data.draft) setMessage(data.draft);
    } catch {
      // silently fail — user can type manually
    } finally {
      setLoading(false);
    }
  }, [clientName, selectedContext, quoteAmount, serviceDate, companyName, customNote]);

  const openMessages = () => {
    const uri = `sms:${clientPhone}${Platform.OS === "ios" ? "&" : "?"}body=${encodeURIComponent(message)}`;
    Linking.openURL(uri);
  };

  const charCount = message.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isNearLimit = charCount >= WARN_CHARS;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={onClose} style={styles.closeBtn} testID="sms-modal-close">
            <Feather name="x" size={20} color={theme.textSecondary} />
          </Pressable>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Send Text to {clientName}
          </ThemedText>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Phone number */}
          <View style={[styles.phoneRow, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <Feather name="smartphone" size={16} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.text, marginLeft: Spacing.sm }}>
              {formatPhone(clientPhone)}
            </ThemedText>
          </View>

          {/* Context selector */}
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
            CONTEXT
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contextScroll}>
            {CONTEXT_OPTIONS.map((opt) => {
              const active = selectedContext === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setSelectedContext(opt.value)}
                  style={[
                    styles.contextChip,
                    {
                      backgroundColor: active ? theme.primary : theme.backgroundDefault,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                  testID={`sms-context-${opt.value}`}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: active ? "#fff" : theme.textSecondary, fontWeight: active ? "600" : "400" }}
                  >
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Custom note input when context = custom */}
          {selectedContext === "custom" ? (
            <TextInput
              placeholder="Describe what this message is about…"
              placeholderTextColor={theme.textSecondary}
              value={customNote}
              onChangeText={setCustomNote}
              style={[styles.customInput, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
              multiline
              testID="sms-custom-note"
            />
          ) : null}

          {/* Generate button */}
          <Pressable
            onPress={generateDraft}
            disabled={loading}
            style={[styles.generateBtn, { borderColor: theme.primary, opacity: loading ? 0.6 : 1 }]}
            testID="sms-generate-draft"
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Feather name="zap" size={15} color={theme.primary} />
            )}
            <ThemedText type="body" style={{ color: theme.primary, marginLeft: 6, fontWeight: "600" }}>
              {message ? "Regenerate" : "Generate Draft"}
            </ThemedText>
          </Pressable>

          {/* Message textarea */}
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
            MESSAGE
          </ThemedText>
          <View style={[styles.textareaWrapper, { borderColor: isOverLimit ? "#ef4444" : isNearLimit ? "#f97316" : theme.border }]}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              multiline
              placeholder="Tap Generate Draft or type your message…"
              placeholderTextColor={theme.textSecondary}
              style={[styles.textarea, { color: theme.text, backgroundColor: theme.backgroundDefault }]}
              testID="sms-message-input"
            />
            <View style={styles.charCountRow}>
              <ThemedText
                type="caption"
                style={{ color: isOverLimit ? "#ef4444" : isNearLimit ? "#f97316" : theme.textSecondary }}
              >
                {charCount}/{MAX_CHARS}
              </ThemedText>
            </View>
          </View>
        </ScrollView>

        {/* Bottom actions */}
        <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.backgroundRoot }]}>
          <Pressable
            onPress={openMessages}
            disabled={!message.trim() || isOverLimit}
            style={[
              styles.sendBtn,
              {
                backgroundColor: (!message.trim() || isOverLimit) ? theme.border : "#16a34a",
              },
            ]}
            testID="sms-open-messages"
          >
            <Feather name="message-circle" size={18} color="#fff" />
            <ThemedText type="body" style={styles.sendBtnText}>
              Open in Messages
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  closeBtn: { padding: 6 },
  headerTitle: { flex: 1, textAlign: "center" },
  content: { padding: Spacing.lg, gap: Spacing.md },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: -4,
  },
  contextScroll: { flexGrow: 0 },
  contextChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  customInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 60,
    fontSize: 14,
    textAlignVertical: "top",
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: 9999,
    paddingVertical: 10,
    paddingHorizontal: Spacing.xl,
  },
  textareaWrapper: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  textarea: {
    padding: Spacing.md,
    minHeight: 110,
    fontSize: 15,
    textAlignVertical: "top",
  },
  charCountRow: {
    alignItems: "flex-end",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  sendBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
