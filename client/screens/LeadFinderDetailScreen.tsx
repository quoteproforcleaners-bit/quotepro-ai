import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  Share,
  Platform,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

const INTENT_LABELS: Record<string, string> = {
  recommendation_request: "Recommendation Request",
  quote_request: "Quote Request",
  recurring_cleaning: "Recurring Cleaning",
  deep_clean: "Deep Clean",
  move_out: "Move-Out Cleaning",
  move_in: "Move-In Cleaning",
  one_time_clean: "One-Time Clean",
  other: "General Inquiry",
};

function timeAgo(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const TONE_STYLES: Record<string, { color: string; label: string; icon: "briefcase" | "heart" | "zap" }> = {
  professional: { color: "#2563EB", label: "Professional", icon: "briefcase" },
  warm: { color: "#7C3AED", label: "Warm", icon: "heart" },
  concise: { color: "#059669", label: "Concise", icon: "zap" },
};

function ReplyCard({ reply, theme }: { reply: any; theme: any }) {
  const [copied, setCopied] = useState(false);
  const meta = TONE_STYLES[reply.tone] ?? { color: "#6b7280", label: reply.tone, icon: "message-square" };

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(reply.replyText);
    setCopied(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setCopied(false), 2000);
  }, [reply.replyText]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: reply.replyText });
    } catch {}
  }, [reply.replyText]);

  return (
    <View style={[styles.replyCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <View style={styles.replyHeader}>
        <View style={[styles.tonePill, { backgroundColor: meta.color + "15" }]}>
          <Feather name={meta.icon as any} size={12} color={meta.color} />
          <ThemedText style={[styles.toneLabel, { color: meta.color }]}>{meta.label}</ThemedText>
        </View>
        <View style={styles.replyActions}>
          <Pressable onPress={handleCopy} style={[styles.replyActionBtn, { borderColor: theme.border }]}>
            <Feather name={copied ? "check" : "copy"} size={14} color={copied ? "#059669" : theme.textSecondary} />
            <ThemedText style={[styles.replyActionText, { color: copied ? "#059669" : theme.textSecondary }]}>
              {copied ? "Copied" : "Copy"}
            </ThemedText>
          </Pressable>
          {Platform.OS !== "web" ? (
            <Pressable onPress={handleShare} style={[styles.replyActionBtn, { borderColor: theme.border }]}>
              <Feather name="share" size={14} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <ThemedText style={[styles.replyText, { color: theme.text }]}>{reply.replyText}</ThemedText>
    </View>
  );
}

export default function LeadFinderDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { leadId } = route.params;
  const theme = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data: lead, isLoading } = useQuery<any>({
    queryKey: ["/api/lead-finder/leads", leadId],
    queryFn: async () => {
      const res = await fetch(`/api/lead-finder/leads/${leadId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const [generating, setGenerating] = useState(false);
  const [replies, setReplies] = useState<any[]>(lead?.replies ?? []);

  React.useEffect(() => {
    if (lead?.replies?.length > 0) setReplies(lead.replies);
  }, [lead]);

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      apiRequest("POST", `/api/lead-finder/leads/${leadId}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/lead-finder/leads", leadId] });
      qc.invalidateQueries({ queryKey: ["/api/lead-finder/leads"] });
      qc.invalidateQueries({ queryKey: ["/api/lead-finder/count"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const handleGenerateReplies = useCallback(async () => {
    setGenerating(true);
    try {
      const result = await apiRequest("POST", `/api/lead-finder/leads/${leadId}/generate-replies`, {});
      setReplies(result.replies ?? []);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setGenerating(false);
  }, [leadId]);

  const handleViewPost = useCallback(() => {
    const url = lead?.postUrl;
    if (url) Linking.openURL(url);
  }, [lead]);

  if (isLoading || !lead) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const scoreColor = lead.leadScore >= 70 ? "#059669" : lead.leadScore >= 40 ? "#D97706" : "#6b7280";

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.background }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.md,
        paddingBottom: tabBarHeight + Spacing["3xl"],
        paddingHorizontal: Spacing.md,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <Card style={styles.section}>
        <View style={styles.metaRow}>
          <View style={[styles.subredditPill, { backgroundColor: theme.primary + "15" }]}>
            <ThemedText style={[styles.subredditText, { color: theme.primary }]}>
              r/{lead.subreddit ?? "reddit"}
            </ThemedText>
          </View>
          <View style={[styles.scoreBadge, { backgroundColor: scoreColor + "18", borderColor: scoreColor + "40" }]}>
            <ThemedText style={[styles.scoreText, { color: scoreColor }]}>Score: {lead.leadScore ?? 0}</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.title}>{lead.title}</ThemedText>

        {lead.body ? (
          <ThemedText style={[styles.body, { color: theme.textSecondary }]}>{lead.body}</ThemedText>
        ) : null}

        <Pressable
          onPress={handleViewPost}
          style={[styles.viewPostBtn, { borderColor: theme.border }]}
        >
          <Feather name="external-link" size={14} color={theme.primary} />
          <ThemedText style={[styles.viewPostText, { color: theme.primary }]}>View Original Post</ThemedText>
        </Pressable>
      </Card>

      <Card style={styles.section}>
        <ThemedText style={styles.sectionLabel}>AI Analysis</ThemedText>
        <View style={styles.aiRow}>
          <View style={styles.aiItem}>
            <ThemedText style={[styles.aiLabel, { color: theme.textSecondary }]}>Intent</ThemedText>
            <ThemedText style={styles.aiValue}>{INTENT_LABELS[lead.intent ?? ""] ?? lead.intent ?? "—"}</ThemedText>
          </View>
          {lead.detectedLocation ? (
            <View style={styles.aiItem}>
              <ThemedText style={[styles.aiLabel, { color: theme.textSecondary }]}>Location</ThemedText>
              <ThemedText style={styles.aiValue}>{lead.detectedLocation}</ThemedText>
            </View>
          ) : null}
          <View style={styles.aiItem}>
            <ThemedText style={[styles.aiLabel, { color: theme.textSecondary }]}>Confidence</ThemedText>
            <ThemedText style={styles.aiValue}>{lead.aiConfidence ?? 0}%</ThemedText>
          </View>
        </View>
        {lead.aiReason ? (
          <View style={[styles.reasonBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <ThemedText style={[styles.reasonText, { color: theme.textSecondary }]}>{lead.aiReason}</ThemedText>
          </View>
        ) : null}
      </Card>

      <View style={styles.statusActions}>
        <Pressable
          style={[styles.statusBtn, { backgroundColor: "#2563EB" }]}
          onPress={() => statusMutation.mutate("saved")}
          disabled={lead.status === "saved"}
        >
          <Feather name="bookmark" size={15} color="#fff" />
          <ThemedText style={styles.statusBtnText}>Save Lead</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.statusBtn, { backgroundColor: "#059669" }]}
          onPress={() => statusMutation.mutate("contacted")}
          disabled={lead.status === "contacted"}
        >
          <Feather name="check-circle" size={15} color="#fff" />
          <ThemedText style={styles.statusBtnText}>Mark Contacted</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.statusBtn, { backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border }]}
          onPress={() => { statusMutation.mutate("dismissed"); navigation.goBack(); }}
        >
          <Feather name="x" size={15} color={theme.textSecondary} />
          <ThemedText style={[styles.statusBtnText, { color: theme.textSecondary }]}>Dismiss</ThemedText>
        </Pressable>
      </View>

      <Card style={styles.section}>
        <View style={styles.repliesHeader}>
          <ThemedText style={styles.sectionLabel}>Suggested Replies</ThemedText>
          <Pressable
            style={[styles.generateBtn, { backgroundColor: "#7C3AED" }]}
            onPress={handleGenerateReplies}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="zap" size={13} color="#fff" />
                <ThemedText style={styles.generateBtnText}>Generate Reply</ThemedText>
              </>
            )}
          </Pressable>
        </View>
        <ThemedText style={[styles.repliesHelper, { color: theme.textSecondary }]}>
          Suggested replies are designed to sound helpful and human, not spammy.
        </ThemedText>
        {replies.length > 0
          ? replies.map((r) => <ReplyCard key={r.id ?? r.tone} reply={r} theme={theme} />)
          : (
            <View style={[styles.noReplies, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Feather name="message-square" size={24} color={theme.textSecondary} />
              <ThemedText style={[styles.noRepliesText, { color: theme.textSecondary }]}>
                Tap Generate Reply to create 3 tone variants
              </ThemedText>
            </View>
          )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },
  section: { marginBottom: Spacing.md, padding: Spacing.md },
  sectionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", opacity: 0.5, marginBottom: 12 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  subredditPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  subredditText: { fontSize: 11, fontWeight: "700" },
  scoreBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, borderWidth: 1 },
  scoreText: { fontSize: 11, fontWeight: "700" },
  title: { fontSize: 17, fontWeight: "700", lineHeight: 24, marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 21, marginBottom: 12 },
  viewPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  viewPostText: { fontSize: 13, fontWeight: "600" },
  aiRow: { flexDirection: "row", gap: 16, marginBottom: 10 },
  aiItem: { flex: 1 },
  aiLabel: { fontSize: 11, marginBottom: 2 },
  aiValue: { fontSize: 13, fontWeight: "600" },
  reasonBox: {
    padding: 10,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  reasonText: { fontSize: 13, lineHeight: 19 },
  statusActions: { flexDirection: "row", gap: 8, marginBottom: Spacing.md },
  statusBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  statusBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  repliesHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.sm,
  },
  generateBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  repliesHelper: { fontSize: 12, marginBottom: 12 },
  replyCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  replyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  tonePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  toneLabel: { fontSize: 11, fontWeight: "700" },
  replyActions: { flexDirection: "row", gap: 6 },
  replyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  replyActionText: { fontSize: 11, fontWeight: "600" },
  replyText: { fontSize: 13, lineHeight: 20 },
  noReplies: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  noRepliesText: { fontSize: 13, textAlign: "center" },
});
