import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, FlatList } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ConvSummary {
  id: string;
  publicToken: string | null;
  quoteTotal: string | null;
  quoteStatus: string | null;
  startedAt: string;
  lastMessageAt: string;
  language: string;
  totalMessages: number;
  accepted: boolean;
  negotiated: boolean;
  finalNegotiatedTotal: string | null;
  customerName: string;
  tier: string | null;
  frequency: string | null;
}

interface ConvDetail {
  messages: {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    contentType: string;
    structuredPayload: any;
    inputMethod: string;
    createdAt: string;
  }[];
  intentSignals: any[];
}

function fmtTime(s: string) {
  try {
    const d = new Date(s);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60_000) return "just now";
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

export default function AIConciergeConversationsScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ conversations: ConvSummary[] }>({
    queryKey: ["/api/business/ai-concierge/conversations"],
  });

  const detail = useQuery<ConvDetail>({
    queryKey: ["/api/business/ai-concierge/conversations", openId],
    enabled: !!openId,
  });

  const styles = makeStyles(theme);

  if (openId) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <Pressable
          onPress={() => setOpenId(null)}
          style={[styles.detailHeader, { paddingTop: headerHeight + 8, borderBottomColor: theme.border }]}
          testID="button-close-detail"
        >
          <Feather name="chevron-left" size={22} color={theme.text} />
          <ThemedText type="body" style={{ marginLeft: 6 }}>Back</ThemedText>
        </Pressable>
        {detail.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }}
            scrollIndicatorInsets={{ bottom: insets.bottom }}
          >
            {detail.data?.messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.bubble,
                  m.role === "user"
                    ? { alignSelf: "flex-end", backgroundColor: theme.accent }
                    : { alignSelf: "flex-start", backgroundColor: theme.surface1, borderColor: theme.border, borderWidth: 1 },
                ]}
              >
                <ThemedText
                  type="body"
                  style={{ color: m.role === "user" ? "#fff" : theme.text }}
                  testID={`text-msg-${m.id}`}
                >
                  {m.content}
                </ThemedText>
                {m.structuredPayload?.type === "offer" ? (
                  <View style={[styles.offerSnippet, { borderColor: m.role === "user" ? "rgba(255,255,255,0.4)" : theme.border }]}>
                    <ThemedText
                      type="caption"
                      style={{ color: m.role === "user" ? "rgba(255,255,255,0.85)" : theme.textSecondary }}
                    >
                      Offer: ${m.structuredPayload.originalTotal} → ${m.structuredPayload.offeredTotal} ({m.structuredPayload.discountPct}%)
                    </ThemedText>
                  </View>
                ) : null}
                {m.structuredPayload?.type === "comparison_card" ? (
                  <ThemedText
                    type="caption"
                    style={{ color: m.role === "user" ? "rgba(255,255,255,0.85)" : theme.textSecondary, marginTop: 4 }}
                  >
                    Comparison vs {m.structuredPayload.competitor}
                  </ThemedText>
                ) : null}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { paddingTop: headerHeight }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  const items = data?.conversations || [];

  if (!items.length) {
    return (
      <View style={[styles.center, { paddingTop: headerHeight + Spacing.xl, paddingHorizontal: Spacing.lg }]}>
        <Feather name="message-square" size={48} color={theme.textSecondary} />
        <ThemedText type="defaultSemiBold" style={{ marginTop: Spacing.md, textAlign: "center" }}>
          No conversations yet
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", marginTop: 6 }}>
          When customers chat with the AI on a quote page, the transcripts will appear here.
        </ThemedText>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ padding: Spacing.lg, paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => setOpenId(item.id)}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginBottom: Spacing.sm }]}
          testID={`row-conversation-${item.id}`}
        >
          <Card variant="base" style={{ padding: Spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold" testID={`text-customer-${item.id}`}>
                  {item.customerName}
                </ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                  ${item.quoteTotal || "—"}
                  {item.frequency ? ` · ${item.frequency}` : ""}
                  {item.tier ? ` · ${item.tier}` : ""}
                  {" · "}{item.totalMessages} msgs
                  {" · "}{fmtTime(item.lastMessageAt)}
                </ThemedText>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                {item.accepted ? (
                  <View style={[styles.tag, { backgroundColor: theme.accent + "22" }]}>
                    <ThemedText type="caption" style={{ color: theme.accent }}>Accepted</ThemedText>
                  </View>
                ) : null}
                {item.negotiated ? (
                  <View style={[styles.tag, { backgroundColor: "rgba(245,158,11,0.15)", marginTop: 4 }]}>
                    <ThemedText type="caption" style={{ color: "#b45309" }}>
                      Negotiated{item.finalNegotiatedTotal ? ` $${Number(item.finalNegotiatedTotal).toFixed(0)}` : ""}
                    </ThemedText>
                  </View>
                ) : null}
                {item.language && item.language !== "en" ? (
                  <View style={[styles.tag, { backgroundColor: theme.border + "55", marginTop: 4 }]}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>{item.language.toUpperCase()}</ThemedText>
                  </View>
                ) : null}
              </View>
            </View>
          </Card>
        </Pressable>
      )}
    />
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background },
    detailHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.lg, paddingBottom: 10, borderBottomWidth: 1 },
    bubble: { padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm, maxWidth: "85%" },
    offerSnippet: { marginTop: 6, padding: 6, borderRadius: BorderRadius.sm, borderWidth: 1 },
    tag: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  });
