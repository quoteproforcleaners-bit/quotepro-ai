import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";

type JobberStatus = {
  connected: boolean;
  status?: string;
  connectedAt?: string;
  autoCreateJobOnQuoteAccept?: boolean;
  lastError?: string | null;
};

type SyncLogEntry = {
  id: string;
  action: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
};

const ACTION_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  connect: "link",
  disconnect: "link-2",
  test_connection: "activity",
  sync_quote: "upload",
  create_client: "user-plus",
  refresh: "refresh-cw",
};

function getActionIcon(action: string): keyof typeof Feather.glyphMap {
  return ACTION_ICONS[action] || "zap";
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function JobberSettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const queryClient = useQueryClient();

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const { data: jobberStatus, isLoading, refetch } = useQuery<JobberStatus>({
    queryKey: ["/api/integrations/jobber/status"],
  });

  const { data: logs } = useQuery<SyncLogEntry[]>({
    queryKey: ["/api/integrations/jobber/logs"],
  });

  const recentLogs = (logs || []).slice(0, 5);

  const isConnected = jobberStatus?.connected === true;
  const needsReauth = jobberStatus?.status === "needs_reauth";

  const handleConnect = useCallback(async () => {
    try {
      setConnecting(true);
      const res = await apiRequest("GET", "/api/integrations/jobber/connect");
      const data = await res.json();
      if (data.url) {
        await WebBrowser.openBrowserAsync(data.url);
        queryClient.invalidateQueries({ queryKey: ["/api/integrations/jobber/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/integrations/jobber/logs"] });
        refetch();
      } else if (data.error) {
        Alert.alert("Connection Error", data.error);
      }
    } catch (e: any) {
      const raw = e?.message || "Failed to connect to Jobber";
      let msg = raw;
      try {
        const jsonPart = raw.substring(raw.indexOf("{"));
        const parsed = JSON.parse(jsonPart);
        msg = parsed.error || raw;
      } catch {}
      if (msg.includes("not configured")) {
        Alert.alert("Not Configured", "Jobber integration credentials have not been set up yet. Contact support.");
      } else {
        Alert.alert("Connection Error", msg);
      }
    } finally {
      setConnecting(false);
    }
  }, [refetch, queryClient]);

  const handleDisconnect = useCallback(() => {
    Alert.alert(
      "Disconnect Jobber",
      "Are you sure you want to disconnect your Jobber account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              setDisconnecting(true);
              await apiRequest("POST", "/api/integrations/jobber/disconnect");
              queryClient.invalidateQueries({ queryKey: ["/api/integrations/jobber/status"] });
              queryClient.invalidateQueries({ queryKey: ["/api/integrations/jobber/logs"] });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              refetch();
            } catch (e: any) {
              Alert.alert("Error", "Failed to disconnect Jobber. Please try again.");
            } finally {
              setDisconnecting(false);
            }
          },
        },
      ]
    );
  }, [refetch, queryClient]);

  const handleTest = useCallback(async () => {
    try {
      setTesting(true);
      setTestResult(null);
      await apiRequest("POST", "/api/integrations/jobber/test");
      setTestResult("Connection successful");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setTestResult("Connection test failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setTesting(false);
    }
  }, []);

  const handleToggleAutoSync = useCallback(async (value: boolean) => {
    try {
      setSettingsSaving(true);
      await apiRequest("PUT", "/api/integrations/jobber/settings", { autoCreateJobOnQuoteAccept: value });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/jobber/status"] });
      Haptics.selectionAsync();
    } catch (e: any) {
      Alert.alert("Error", "Failed to update Jobber settings.");
    } finally {
      setSettingsSaving(false);
    }
  }, [queryClient]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <SectionHeader title="Connection" />

      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
          },
        ]}
      >
        {isConnected ? (
          <>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
              <ThemedText type="body" style={{ fontWeight: "600", flex: 1 }}>
                Connected
              </ThemedText>
              <View style={[styles.statusBadge, { backgroundColor: `${theme.success}15` }]}>
                <ThemedText type="caption" style={{ color: theme.success, fontWeight: "600" }}>
                  Active
                </ThemedText>
              </View>
            </View>
            {jobberStatus?.connectedAt ? (
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Connected {formatRelativeTime(jobberStatus.connectedAt)}
              </ThemedText>
            ) : null}
          </>
        ) : needsReauth ? (
          <>
            <View style={[styles.warningBanner, { backgroundColor: `${theme.warning}10`, borderColor: `${theme.warning}30` }]}>
              <Feather name="alert-triangle" size={18} color={theme.warning} />
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  Reconnection Required
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                  Your Jobber session has expired. Please reconnect.
                </ThemedText>
                {jobberStatus?.lastError ? (
                  <ThemedText type="caption" style={{ color: theme.error, marginTop: Spacing.xs }}>
                    {jobberStatus.lastError}
                  </ThemedText>
                ) : null}
              </View>
            </View>
            <Pressable
              onPress={handleConnect}
              style={[styles.actionButton, { backgroundColor: theme.warning, marginTop: Spacing.md }]}
              testID="button-jobber-reconnect"
            >
              {connecting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="refresh-cw" size={18} color="#FFFFFF" />
                  <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.sm }}>
                    Reconnect
                  </ThemedText>
                </>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: theme.textMuted }]} />
              <ThemedText type="body" style={{ fontWeight: "600", flex: 1 }}>
                Not Connected
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              Connect Jobber to automatically turn accepted QuotePro quotes into Jobber clients and jobs.
            </ThemedText>
            <Pressable
              onPress={handleConnect}
              style={[styles.actionButton, { backgroundColor: theme.primary, marginTop: Spacing.lg }]}
              testID="button-jobber-connect"
            >
              {connecting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="briefcase" size={18} color="#FFFFFF" />
                  <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.sm }}>
                    Connect Jobber
                  </ThemedText>
                </>
              )}
            </Pressable>
          </>
        )}
      </View>

      {isConnected ? (
        <>
          <SectionHeader title="Actions" />

          <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Pressable
              onPress={handleTest}
              style={[styles.rowButton, { borderBottomColor: theme.border }]}
              testID="button-jobber-test"
            >
              <View style={[styles.rowIcon, { backgroundColor: `${theme.primary}15` }]}>
                <Feather name="activity" size={18} color={theme.primary} />
              </View>
              <ThemedText type="body" style={{ flex: 1, fontWeight: "500" }}>
                Test Connection
              </ThemedText>
              {testing ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Feather name="chevron-right" size={20} color={theme.textSecondary} />
              )}
            </Pressable>

            <Pressable
              onPress={handleDisconnect}
              style={styles.rowButton}
              testID="button-jobber-disconnect"
            >
              <View style={[styles.rowIcon, { backgroundColor: `${theme.error}15` }]}>
                <Feather name="link-2" size={18} color={theme.error} />
              </View>
              <ThemedText type="body" style={{ flex: 1, fontWeight: "500", color: theme.error }}>
                Disconnect
              </ThemedText>
              {disconnecting ? (
                <ActivityIndicator size="small" color={theme.error} />
              ) : (
                <Feather name="chevron-right" size={20} color={theme.textSecondary} />
              )}
            </Pressable>
          </View>

          {testResult ? (
            <View style={[styles.testResultBanner, { backgroundColor: `${theme.primary}10`, borderColor: `${theme.primary}30` }]}>
              <Feather name="info" size={16} color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.primary, marginLeft: Spacing.sm, flex: 1 }}>
                {testResult}
              </ThemedText>
            </View>
          ) : null}

          <SectionHeader title="Settings" />

          <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="body" style={{ fontWeight: "500" }}>
                  Auto-sync on Accept
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                  Automatically create a Jobber client and job when a quote is accepted
                </ThemedText>
              </View>
              <Switch
                value={jobberStatus?.autoCreateJobOnQuoteAccept || false}
                onValueChange={handleToggleAutoSync}
                disabled={settingsSaving}
                trackColor={{ false: theme.backgroundTertiary, true: `${theme.success}60` }}
                thumbColor={jobberStatus?.autoCreateJobOnQuoteAccept ? theme.success : theme.textMuted}
                testID="toggle-jobber-auto-sync"
              />
            </View>
          </View>

          <SectionHeader
            title="Recent Activity"
            rightAction={
              recentLogs.length > 0 ? (
                <Pressable
                  onPress={() => navigation.navigate("JobberLogs")}
                  testID="button-jobber-view-all-logs"
                >
                  <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
                    View All
                  </ThemedText>
                </Pressable>
              ) : undefined
            }
          />

          {recentLogs.length > 0 ? (
            <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              {recentLogs.map((log, index) => (
                <View
                  key={log.id}
                  style={[
                    styles.logRow,
                    index < recentLogs.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.border } : undefined,
                  ]}
                >
                  <View style={[styles.logIcon, { backgroundColor: log.status === "ok" ? `${theme.success}15` : `${theme.error}15` }]}>
                    <Feather
                      name={getActionIcon(log.action)}
                      size={14}
                      color={log.status === "ok" ? theme.success : theme.error}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="small" style={{ fontWeight: "500" }}>
                      {log.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </ThemedText>
                    {log.errorMessage ? (
                      <ThemedText type="caption" style={{ color: theme.error, marginTop: 2 }} numberOfLines={1}>
                        {log.errorMessage}
                      </ThemedText>
                    ) : null}
                  </View>
                  <View style={styles.logRight}>
                    <View style={[styles.statusPill, { backgroundColor: log.status === "ok" ? `${theme.success}15` : `${theme.error}15` }]}>
                      <ThemedText type="caption" style={{ color: log.status === "ok" ? theme.success : theme.error, fontWeight: "600" }}>
                        {log.status === "ok" ? "OK" : "Failed"}
                      </ThemedText>
                    </View>
                    <ThemedText type="caption" style={{ color: theme.textMuted, marginTop: 2 }}>
                      {formatRelativeTime(log.createdAt)}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border, alignItems: "center", paddingVertical: Spacing["3xl"] }]}>
              <Feather name="inbox" size={32} color={theme.textMuted} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                No sync activity yet
              </ThemedText>
            </View>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  warningBanner: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  rowButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 0,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  testResultBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  logIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  logRight: {
    alignItems: "flex-end",
    marginLeft: Spacing.sm,
  },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 1,
    borderRadius: BorderRadius.xs,
  },
});
