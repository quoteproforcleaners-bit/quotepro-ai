import React, { useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, TextInput } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ProBanner } from "@/components/ProBanner";
import { StatCard } from "@/components/StatCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

type WizardStep = "welcome" | "connect" | "automation" | "template" | "done";

function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<WizardStep>("welcome");
  const [autoReplies, setAutoReplies] = useState(true);
  const [replyTemplate, setReplyTemplate] = useState(
    "Hi! Thanks for reaching out. Here's a quick link to get an instant quote: {link}"
  );

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PUT", "/api/social/automation", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/automation"] });
    },
  });

  const connectMutation = useMutation({
    mutationFn: async (channel: string) => {
      await apiRequest("POST", "/api/social/connections", {
        channel,
        status: "dev_mode",
        igUsername: "demo_account",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/connections"] });
    },
  });

  const steps: { key: WizardStep; label: string }[] = [
    { key: "welcome", label: "Welcome" },
    { key: "connect", label: "Connect" },
    { key: "automation", label: "Rules" },
    { key: "template", label: "Template" },
    { key: "done", label: "Done" },
  ];
  const currentIdx = steps.findIndex(s => s.key === step);

  const renderStep = () => {
    switch (step) {
      case "welcome":
        return (
          <View style={styles.wizardContent}>
            <View style={[styles.wizardIcon, { backgroundColor: `${theme.accent}15` }]}>
              <Feather name="message-circle" size={48} color={theme.accent} />
            </View>
            <ThemedText type="h2" style={[styles.wizardTitle, { color: theme.accent }]}>AI Sales Assistant</ThemedText>
            <ThemedText type="body" style={[styles.wizardDesc, { color: theme.text }]}>
              Automatically capture leads from Instagram and TikTok DMs. Our AI detects buying intent and sends instant quote links.
            </ThemedText>
            <View style={styles.socialIcons}>
              <View style={[styles.socialIconBubble, { backgroundColor: "#E1306C15" }]}>
                <Feather name="instagram" size={28} color="#E1306C" />
              </View>
              <View style={[styles.socialIconBubble, { backgroundColor: `${theme.text}10` }]}>
                <Feather name="video" size={28} color={theme.text} />
              </View>
            </View>
            <View style={[styles.featureList, { backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border }]}>
              {[
                { icon: "zap" as const, text: "AI-powered intent detection" },
                { icon: "send" as const, text: "Auto-reply with quote links" },
                { icon: "bar-chart-2" as const, text: "Track social lead attribution" },
                { icon: "users" as const, text: "Convert DMs to customers" },
              ].map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Feather name={f.icon} size={16} color={theme.accent} />
                  <ThemedText type="small" style={{ marginLeft: Spacing.sm, color: theme.text }}>{f.text}</ThemedText>
                </View>
              ))}
            </View>
            <Button onPress={() => setStep("connect")} style={styles.wizardBtn}>Get Started</Button>
          </View>
        );

      case "connect":
        return (
          <View style={styles.wizardContent}>
            <ThemedText type="h3" style={styles.wizardTitle}>Connect Your Accounts</ThemedText>
            <ThemedText type="small" style={[styles.wizardDesc, { color: theme.textSecondary }]}>
              Instagram uses Meta's API (requires Business account approval). For now, we'll use Dev Mode to test with simulated DMs.
            </ThemedText>
            <Pressable
              onPress={() => connectMutation.mutate("instagram")}
              style={[styles.channelCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
            >
              <View style={[styles.channelIcon, { backgroundColor: "#E1306C20" }]}>
                <Feather name="instagram" size={24} color="#E1306C" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="subtitle">Instagram</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>Dev Mode (simulated DMs)</ThemedText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${theme.success}20` }]}>
                <ThemedText type="caption" style={{ color: theme.success }}>Ready</ThemedText>
              </View>
            </Pressable>
            <Pressable
              onPress={() => connectMutation.mutate("tiktok")}
              style={[styles.channelCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
            >
              <View style={[styles.channelIcon, { backgroundColor: "#00000015" }]}>
                <Feather name="video" size={24} color={theme.text} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="subtitle">TikTok</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>Manual lead capture</ThemedText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${theme.success}20` }]}>
                <ThemedText type="caption" style={{ color: theme.success }}>Ready</ThemedText>
              </View>
            </Pressable>
            <Button onPress={() => setStep("automation")} style={styles.wizardBtn}>Continue</Button>
          </View>
        );

      case "automation":
        return (
          <View style={styles.wizardContent}>
            <ThemedText type="h3" style={styles.wizardTitle}>Automation Rules</ThemedText>
            <ThemedText type="small" style={[styles.wizardDesc, { color: theme.textSecondary }]}>
              Configure how the AI handles incoming DMs.
            </ThemedText>
            <Pressable
              onPress={() => setAutoReplies(!autoReplies)}
              style={[styles.toggleRow, { backgroundColor: theme.backgroundSecondary }]}
            >
              <View style={{ flex: 1 }}>
                <ThemedText type="subtitle">Auto-Replies</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  AI sends quote links when buying intent is detected
                </ThemedText>
              </View>
              <View style={[styles.toggle, { backgroundColor: autoReplies ? theme.primary : theme.backgroundTertiary }]}>
                <View style={[styles.toggleDot, { alignSelf: autoReplies ? "flex-end" : "flex-start" }]} />
              </View>
            </Pressable>
            <View style={[styles.infoBox, { backgroundColor: theme.gradientAccent }]}>
              <Feather name="info" size={14} color={theme.accent} />
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: Spacing.sm, flex: 1 }}>
                AI only replies when confidence is above 70%. Customers can opt out anytime by saying "stop".
              </ThemedText>
            </View>
            <Button onPress={() => setStep("template")} style={styles.wizardBtn}>Continue</Button>
          </View>
        );

      case "template":
        return (
          <View style={styles.wizardContent}>
            <ThemedText type="h3" style={styles.wizardTitle}>Reply Template</ThemedText>
            <ThemedText type="small" style={[styles.wizardDesc, { color: theme.textSecondary }]}>
              Customize your auto-reply message. Use {"{link}"} where the quote link should go.
            </ThemedText>
            <TextInput
              value={replyTemplate}
              onChangeText={setReplyTemplate}
              multiline
              numberOfLines={4}
              style={[styles.templateInput, {
                backgroundColor: theme.inputBackground,
                color: theme.text,
                borderColor: theme.border,
              }]}
              placeholderTextColor={theme.textSecondary}
              testID="input-reply-template"
            />
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
              Preview: {replyTemplate.replace("{link}", "quotepro.app/q/abc123")}
            </ThemedText>
            <Button
              onPress={async () => {
                await saveMutation.mutateAsync({
                  autoRepliesEnabled: autoReplies,
                  replyTemplate,
                  socialOnboardingComplete: true,
                });
                setStep("done");
              }}
              style={styles.wizardBtn}
            >
              Save & Finish
            </Button>
          </View>
        );

      case "done":
        return (
          <View style={styles.wizardContent}>
            <View style={[styles.wizardIcon, { backgroundColor: `${theme.accent}15` }]}>
              <Feather name="check-circle" size={48} color={theme.accent} />
            </View>
            <ThemedText type="h2" style={[styles.wizardTitle, { color: theme.accent }]}>All Set!</ThemedText>
            <ThemedText type="body" style={[styles.wizardDesc, { color: theme.textSecondary }]}>
              Your AI Sales Assistant is ready. Try sending a test DM to see it in action.
            </ThemedText>
            <Button onPress={onComplete} style={styles.wizardBtn}>Go to Dashboard</Button>
          </View>
        );
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.progressBar}>
        {steps.map((s, i) => (
          <View
            key={s.key}
            style={[
              styles.progressDot,
              {
                backgroundColor: i <= currentIdx ? theme.accent : theme.backgroundTertiary,
                flex: i <= currentIdx ? 2 : 1,
              },
            ]}
          />
        ))}
      </View>
      <ThemedText type="caption" style={[styles.stepLabel, { color: theme.textSecondary }]}>
        Step {currentIdx + 1} of {steps.length}
      </ThemedText>
      {renderStep()}
    </View>
  );
}

function SimulateDMCard() {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [dmText, setDmText] = useState("");
  const [result, setResult] = useState<any>(null);

  const simulateMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/social/simulate-dm", { message, channel: "instagram", senderName: "Test User" });
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      setDmText("");
      queryClient.invalidateQueries({ queryKey: ["/api/social/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/stats"] });
    },
  });

  return (
    <Card style={styles.simulateCard}>
      <View style={styles.simulateHeader}>
        <Feather name="send" size={16} color={theme.accent} />
        <ThemedText type="subtitle" style={{ marginLeft: Spacing.sm }}>Simulate Test DM</ThemedText>
      </View>
      <TextInput
        value={dmText}
        onChangeText={setDmText}
        placeholder="Type a test DM message..."
        placeholderTextColor={theme.textSecondary}
        style={[styles.dmInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
        testID="input-simulate-dm"
      />
      <Button
        onPress={() => { if (dmText.trim()) simulateMutation.mutate(dmText.trim()); }}
        style={{ marginTop: Spacing.sm }}
        disabled={!dmText.trim() || simulateMutation.isPending}
      >
        {simulateMutation.isPending ? "Processing..." : "Send Test DM"}
      </Button>
      {result ? (
        <View style={[styles.resultBox, { backgroundColor: theme.backgroundSecondary }]}>
          <View style={styles.resultRow}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>Intent Detected</ThemedText>
            <ThemedText type="small" style={{ color: result.intent?.intent ? theme.success : theme.warning }}>
              {result.intent?.intent ? "Yes" : "No"} ({Math.round((result.intent?.confidence || 0) * 100)}%)
            </ThemedText>
          </View>
          <View style={styles.resultRow}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>Category</ThemedText>
            <ThemedText type="small">{result.intent?.category || "N/A"}</ThemedText>
          </View>
          <View style={styles.resultRow}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>Auto-Replied</ThemedText>
            <ThemedText type="small" style={{ color: result.autoReplied ? theme.success : theme.textSecondary }}>
              {result.autoReplied ? "Yes" : "No"}
            </ThemedText>
          </View>
          {result.autoReplyContent ? (
            <View style={[styles.replyPreview, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: 4 }}>Auto-Reply:</ThemedText>
              <ThemedText type="small">{result.autoReplyContent}</ThemedText>
            </View>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

export default function SocialScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const { data: automation, isLoading } = useQuery<any>({
    queryKey: ["/api/social/automation"],
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/social/stats"],
  });

  const { data: conversations = [] } = useQuery<any[]>({
    queryKey: ["/api/social/conversations"],
  });

  const { data: leads = [] } = useQuery<any[]>({
    queryKey: ["/api/social/leads"],
  });

  const { data: connections = [] } = useQuery<any[]>({
    queryKey: ["/api/social/connections"],
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/social/automation"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/social/stats"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/social/conversations"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/social/leads"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/social/connections"] }),
    ]);
    setRefreshing(false);
  };

  if (isLoading) return null;

  if (!automation?.socialOnboardingComplete) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
        contentContainerStyle={{ paddingTop: headerHeight + Spacing.lg, paddingBottom: tabBarHeight + Spacing.xl, paddingHorizontal: Spacing.lg }}
      >
        <OnboardingWizard onComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/social/automation"] });
        }} />
      </ScrollView>
    );
  }

  const recentConversations = conversations.slice(0, 5);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
    >
      <ProBanner message="Social AI features require QuotePro AI" />

      <View style={[styles.connectedPlatforms, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
        <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm }}>Connected Platforms</ThemedText>
        <View style={styles.platformRow}>
          <View style={[styles.platformBadge, { backgroundColor: "#E1306C15" }]}>
            <Feather name="instagram" size={20} color="#E1306C" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="small">Instagram</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>Dev Mode</ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${theme.accent}20` }]}>
            <ThemedText type="caption" style={{ color: theme.accent }}>Active</ThemedText>
          </View>
        </View>
        <View style={styles.platformRow}>
          <View style={[styles.platformBadge, { backgroundColor: `${theme.text}10` }]}>
            <Feather name="video" size={20} color={theme.text} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="small">TikTok</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>Manual Capture</ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${theme.accent}20` }]}>
            <ThemedText type="caption" style={{ color: theme.accent }}>Active</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatCard
          title="Social Leads"
          value={String(stats?.totalLeads ?? 0)}
          icon="users"
          color={theme.accent}
        />
        <StatCard
          title="Quotes Sent"
          value={String(stats?.totalQuotes ?? 0)}
          icon="file-text"
          color={theme.primary}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          title="Revenue"
          value={`$${stats?.totalRevenue ?? 0}`}
          icon="dollar-sign"
          color={theme.success}
        />
        <StatCard
          title="Channels"
          value={String(connections.length)}
          icon="link"
          color={theme.warning}
        />
      </View>

      <SimulateDMCard />

      <View style={styles.sectionHeader}>
        <ThemedText type="h4">Recent Conversations</ThemedText>
        <Pressable onPress={() => navigation.navigate("SocialConversations")} testID="button-view-all-conversations">
          <ThemedText type="link" style={{ color: theme.primary }}>View All</ThemedText>
        </Pressable>
      </View>

      {recentConversations.length > 0 ? (
        recentConversations.map((conv: any) => (
          <Pressable
            key={conv.id}
            onPress={() => navigation.navigate("SocialConversationDetail", { conversationId: conv.id })}
            style={[styles.convCard, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={[styles.avatarCircle, { backgroundColor: conv.channel === "instagram" ? "#E1306C20" : `${theme.text}15` }]}>
              <Feather name={conv.channel === "instagram" ? "instagram" : "video"} size={16} color={conv.channel === "instagram" ? "#E1306C" : theme.text} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="subtitle">{conv.senderName || "Unknown"}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {conv.channel} {conv.autoReplied ? " - Auto-replied" : ""}
              </ThemedText>
            </View>
            {conv.autoReplied ? (
              <View style={[styles.statusBadge, { backgroundColor: `${theme.success}20` }]}>
                <Feather name="check" size={12} color={theme.success} />
              </View>
            ) : null}
          </Pressable>
        ))
      ) : (
        <Card>
          <View style={{ alignItems: "center", padding: Spacing.xl }}>
            <Feather name="message-circle" size={32} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
              No conversations yet. Send a test DM above to get started.
            </ThemedText>
          </View>
        </Card>
      )}

      <View style={styles.sectionHeader}>
        <ThemedText type="h4">Social Leads</ThemedText>
        <Pressable onPress={() => navigation.navigate("SocialLeads")} testID="button-view-all-leads">
          <ThemedText type="link" style={{ color: theme.primary }}>View All</ThemedText>
        </Pressable>
      </View>

      {leads.length > 0 ? (
        leads.slice(0, 5).map((lead: any) => (
          <View
            key={lead.id}
            style={[styles.leadRow, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
          >
            <View style={{ flex: 1 }}>
              <ThemedText type="subtitle">{lead.senderName}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {lead.channel} - {lead.attribution?.replace(/_/g, " ")}
              </ThemedText>
            </View>
            <View style={[styles.statusBadge, {
              backgroundColor: lead.status === "converted" ? `${theme.success}20` : lead.status === "quoted" ? `${theme.primary}20` : `${theme.warning}20`
            }]}>
              <ThemedText type="caption" style={{
                color: lead.status === "converted" ? theme.success : lead.status === "quoted" ? theme.primary : theme.warning
              }}>
                {lead.status}
              </ThemedText>
            </View>
          </View>
        ))
      ) : (
        <Card>
          <View style={{ alignItems: "center", padding: Spacing.xl }}>
            <Feather name="user-plus" size={32} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
              No social leads yet. Leads appear when the AI detects buying intent in DMs.
            </ThemedText>
          </View>
        </Card>
      )}

      <View style={styles.sectionHeader}>
        <ThemedText type="h4">Quick Actions</ThemedText>
      </View>
      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => navigation.navigate("SocialSettings")}
          style={[styles.actionCard, { backgroundColor: theme.backgroundDefault }]}
          testID="button-social-settings"
        >
          <Feather name="sliders" size={20} color={theme.accent} />
          <ThemedText type="small" style={{ marginTop: Spacing.xs }}>Settings</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate("SocialLeads")}
          style={[styles.actionCard, { backgroundColor: theme.backgroundDefault }]}
          testID="button-social-leads"
        >
          <Feather name="trending-up" size={20} color={theme.primary} />
          <ThemedText type="small" style={{ marginTop: Spacing.xs }}>Leads</ThemedText>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate("TikTokLeadCreate")}
          style={[styles.actionCard, { backgroundColor: theme.backgroundDefault }]}
          testID="button-tiktok-lead"
        >
          <Feather name="plus-circle" size={20} color={theme.success} />
          <ThemedText type="small" style={{ marginTop: Spacing.xs }}>TikTok Lead</ThemedText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  convCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  leadRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionCard: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  connectedPlatforms: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  platformRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  platformBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  simulateCard: {
    marginTop: Spacing.md,
  },
  simulateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  dmInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    fontSize: 14,
    minHeight: 44,
  },
  resultBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    gap: Spacing.sm,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  replyPreview: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  wizardContent: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  wizardIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  wizardTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  wizardDesc: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  wizardBtn: {
    marginTop: Spacing.lg,
    minWidth: 200,
  },
  progressBar: {
    flexDirection: "row",
    gap: 4,
    marginBottom: Spacing.sm,
  },
  progressDot: {
    height: 4,
    borderRadius: 2,
  },
  stepLabel: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  featureList: {
    width: "100%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  socialIcons: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  socialIconBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  channelCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    width: "100%",
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  channelIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    width: "100%",
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    width: "100%",
    marginBottom: Spacing.md,
  },
  templateInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    fontSize: 14,
    minHeight: 100,
    width: "100%",
    textAlignVertical: "top",
  },
});
