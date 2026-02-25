import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TextInput, Pressable, useWindowDimensions } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ProGate } from "@/components/ProGate";

export default function SocialSettingsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/social/automation"],
  });

  const { data: connections = [] } = useQuery<any[]>({
    queryKey: ["/api/social/connections"],
  });

  const [autoReplies, setAutoReplies] = useState(false);
  const [threshold, setThreshold] = useState("70");
  const [quietHours, setQuietHours] = useState(false);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("08:00");
  const [template, setTemplate] = useState("");

  useEffect(() => {
    if (settings) {
      setAutoReplies(settings.autoRepliesEnabled ?? false);
      setThreshold(String(Math.round((settings.intentThreshold ?? 0.7) * 100)));
      setQuietHours(settings.quietHoursEnabled ?? false);
      setQuietStart(settings.quietHoursStart ?? "22:00");
      setQuietEnd(settings.quietHoursEnd ?? "08:00");
      setTemplate(settings.replyTemplate ?? "");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/social/automation", {
        autoRepliesEnabled: autoReplies,
        intentThreshold: parseInt(threshold) / 100,
        quietHoursEnabled: quietHours,
        quietHoursStart: quietStart,
        quietHoursEnd: quietEnd,
        replyTemplate: template,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/automation"] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/social/connections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/social/connections"] });
    },
  });

  return (
    <ProGate featureName="Social Settings">
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
          ...(useMaxWidth ? { maxWidth: 560, alignSelf: "center" as const, width: "100%" } : undefined),
        }}
      >
        <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>Connected Channels</ThemedText>
      {connections.length > 0 ? (
        connections.map((conn: any) => (
          <View key={conn.id} style={[styles.connectionRow, { backgroundColor: theme.backgroundDefault }]}>
            <View style={[styles.channelIcon, { backgroundColor: conn.channel === "instagram" ? "#E1306C20" : `${theme.text}15` }]}>
              <Feather name={conn.channel === "instagram" ? "instagram" : "video"} size={20} color={conn.channel === "instagram" ? "#E1306C" : theme.text} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="subtitle">{conn.channel}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {conn.status === "dev_mode" ? "Dev Mode" : conn.status}
              </ThemedText>
            </View>
            <Pressable onPress={() => disconnectMutation.mutate(conn.id)} testID={`button-disconnect-${conn.channel}`}>
              <ThemedText type="small" style={{ color: theme.error }}>Disconnect</ThemedText>
            </Pressable>
          </View>
        ))
      ) : (
        <View style={[styles.emptyConnections, { backgroundColor: theme.backgroundSecondary }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>No channels connected</ThemedText>
        </View>
      )}

      <ThemedText type="h4" style={{ marginTop: Spacing.xl, marginBottom: Spacing.md }}>Automation Rules</ThemedText>

      <Card>
        <Pressable onPress={() => setAutoReplies(!autoReplies)} style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle">Auto-Replies</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Send automatic replies when buying intent is detected
            </ThemedText>
          </View>
          <View style={[styles.toggle, { backgroundColor: autoReplies ? theme.primary : theme.backgroundTertiary }]}>
            <View style={[styles.toggleDot, { alignSelf: autoReplies ? "flex-end" : "flex-start" }]} />
          </View>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle">Intent Threshold</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Minimum confidence to trigger auto-reply (%)
            </ThemedText>
          </View>
          <TextInput
            value={threshold}
            onChangeText={setThreshold}
            keyboardType="numeric"
            style={[styles.thresholdInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
            testID="input-threshold"
          />
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <Pressable onPress={() => setQuietHours(!quietHours)} style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle">Quiet Hours</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Pause auto-replies during off-hours
            </ThemedText>
          </View>
          <View style={[styles.toggle, { backgroundColor: quietHours ? theme.primary : theme.backgroundTertiary }]}>
            <View style={[styles.toggleDot, { alignSelf: quietHours ? "flex-end" : "flex-start" }]} />
          </View>
        </Pressable>

        {quietHours ? (
          <View style={styles.quietHoursRow}>
            <View style={{ flex: 1 }}>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: 4 }}>Start</ThemedText>
              <TextInput
                value={quietStart}
                onChangeText={setQuietStart}
                style={[styles.timeInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                testID="input-quiet-start"
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: 4 }}>End</ThemedText>
              <TextInput
                value={quietEnd}
                onChangeText={setQuietEnd}
                style={[styles.timeInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                testID="input-quiet-end"
              />
            </View>
          </View>
        ) : null}
      </Card>

      <ThemedText type="h4" style={{ marginTop: Spacing.xl, marginBottom: Spacing.md }}>Reply Template</ThemedText>
      <Card>
        <TextInput
          value={template}
          onChangeText={setTemplate}
          multiline
          numberOfLines={4}
          style={[styles.templateInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
          testID="input-template"
        />
        <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
          Use {"{link}"} where the quote link should appear
        </ThemedText>
      </Card>

      <Button
        onPress={() => saveMutation.mutate()}
        style={{ marginTop: Spacing.xl }}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? "Saving..." : "Save Settings"}
      </Button>
      </ScrollView>
    </ProGate>
  );
}

const styles = StyleSheet.create({
  connectionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyConnections: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
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
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  thresholdInput: {
    width: 60,
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    padding: Spacing.sm,
    textAlign: "center",
    fontSize: 14,
  },
  quietHoursRow: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    padding: Spacing.sm,
    fontSize: 14,
  },
  templateInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: "top",
  },
});
