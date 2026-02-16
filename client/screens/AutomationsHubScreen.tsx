import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  Switch,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

function useDesignTokens() {
  const { theme, isDark } = useTheme();
  return useMemo(() => ({
    surface: theme.cardBackground,
    border: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
    accent: theme.primary,
    accentSoft: isDark ? "rgba(100,160,255,0.12)" : "rgba(0,122,255,0.08)",
    textPrimary: theme.text,
    textSecondary: theme.textSecondary,
  }), [theme, isDark]);
}

interface AutomationSettings {
  marketingModeEnabled: boolean;
  abandonedQuoteRecovery: boolean;
  weeklyReactivation: boolean;
  reviewRequestWorkflow: boolean;
  referralAskWorkflow: boolean;
  rebookNudges: boolean;
  upsellTriggers: boolean;
  maxSendsPerDay: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  maxFollowUpsPerQuote: number;
  rebookNudgeDaysMin: number;
  rebookNudgeDaysMax: number;
  deepCleanIntervalMonths: number;
  googleReviewLink: string;
}

const defaultSettings: AutomationSettings = {
  marketingModeEnabled: false,
  abandonedQuoteRecovery: true,
  weeklyReactivation: true,
  reviewRequestWorkflow: true,
  referralAskWorkflow: false,
  rebookNudges: true,
  upsellTriggers: false,
  maxSendsPerDay: 50,
  quietHoursStart: "20:00",
  quietHoursEnd: "08:00",
  maxFollowUpsPerQuote: 3,
  rebookNudgeDaysMin: 14,
  rebookNudgeDaysMax: 45,
  deepCleanIntervalMonths: 6,
  googleReviewLink: "",
};

const automations: { key: keyof AutomationSettings; icon: keyof typeof Feather.glyphMap; label: string; description: string }[] = [
  { key: "abandonedQuoteRecovery", icon: "rotate-ccw", label: "Abandoned Quote Recovery", description: "Follow up on quotes that weren't accepted" },
  { key: "weeklyReactivation", icon: "users", label: "Weekly Reactivation", description: "Re-engage customers who haven't booked recently" },
  { key: "reviewRequestWorkflow", icon: "star", label: "Review Request Workflow", description: "Ask happy customers for reviews after jobs" },
  { key: "referralAskWorkflow", icon: "gift", label: "Referral Ask Workflow", description: "Request referrals from satisfied customers" },
  { key: "rebookNudges", icon: "calendar", label: "Rebook Nudges", description: "Remind customers to schedule their next cleaning" },
  { key: "upsellTriggers", icon: "trending-up", label: "Upsell Triggers", description: "Suggest additional services based on history" },
];

export default function AutomationsHubScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  const dt = useDesignTokens();

  const { data: serverSettings, isLoading } = useQuery<AutomationSettings>({
    queryKey: ["/api/growth-automation-settings"],
  });

  const [settings, setSettings] = useState<AutomationSettings>(defaultSettings);

  useEffect(() => {
    if (serverSettings) setSettings({ ...defaultSettings, ...serverSettings });
  }, [serverSettings]);

  const updateSetting = async (key: keyof AutomationSettings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    try {
      await apiRequest("PUT", "/api/growth-automation-settings", updated);
    } catch (e) {
      setSettings(settings);
    }
  };

  const updateNumber = (key: keyof AutomationSettings, text: string) => {
    const num = parseInt(text, 10);
    if (!isNaN(num)) updateSetting(key, num);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: headerHeight + Spacing.xl }]}>
        <ActivityIndicator color={dt.accent} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{ paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl, paddingHorizontal: Spacing.lg }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => queryClient.invalidateQueries({ queryKey: ["/api/growth-automation-settings"] })} tintColor={dt.accent} />}
    >
      <Card style={{...styles.masterCard, borderColor: dt.accent + "40"}}>
        <View style={styles.masterRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.masterLabel}>
              <Feather name="zap" size={20} color={dt.accent} />
              <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>Marketing Mode</ThemedText>
            </View>
            <ThemedText type="small" style={{ color: dt.textSecondary, marginTop: Spacing.xs }}>
              When enabled, QuotePro will automatically create growth tasks for your business.
            </ThemedText>
          </View>
          <Switch
            testID="switch-marketing-mode"
            value={settings.marketingModeEnabled}
            onValueChange={(v) => updateSetting("marketingModeEnabled", v)}
            trackColor={{ false: dt.border, true: dt.accent + "80" }}
            thumbColor={settings.marketingModeEnabled ? dt.accent : "#ccc"}
          />
        </View>
      </Card>

      <ThemedText type="h4" style={styles.sectionTitle}>Automations</ThemedText>
      {automations.map((auto) => (
        <Card key={auto.key} style={styles.automationCard}>
          <View style={styles.automationRow}>
            <View style={[styles.iconCircle, { backgroundColor: dt.accentSoft }]}>
              <Feather name={auto.icon} size={18} color={dt.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <ThemedText type="subtitle">{auto.label}</ThemedText>
              <ThemedText type="caption" style={{ color: dt.textSecondary }}>{auto.description}</ThemedText>
            </View>
            <Switch
              testID={`switch-${auto.key}`}
              value={settings[auto.key] as boolean}
              onValueChange={(v) => updateSetting(auto.key, v)}
              trackColor={{ false: dt.border, true: dt.accent + "80" }}
              thumbColor={(settings[auto.key] as boolean) ? dt.accent : "#ccc"}
            />
          </View>
        </Card>
      ))}

      <ThemedText type="h4" style={styles.sectionTitle}>Google Review Link</ThemedText>
      <Card>
        <ThemedText type="small" style={{ color: dt.textSecondary, marginBottom: Spacing.sm }}>
          Paste your Google Business review URL so customers can leave reviews easily.
        </ThemedText>
        <TextInput
          testID="input-google-review-link"
          value={settings.googleReviewLink}
          onChangeText={(t) => updateSetting("googleReviewLink", t)}
          placeholder="https://g.page/r/your-business/review"
          placeholderTextColor={dt.textSecondary}
          autoCapitalize="none"
          keyboardType="url"
          style={[styles.input, { backgroundColor: theme.inputBackground, color: dt.textPrimary, borderColor: dt.border }]}
        />
      </Card>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  masterCard: { marginBottom: Spacing.xl, borderWidth: 1 },
  masterRow: { flexDirection: "row", alignItems: "center" },
  masterLabel: { flexDirection: "row", alignItems: "center" },
  sectionTitle: { marginBottom: Spacing.md, marginTop: Spacing.lg },
  automationCard: { marginBottom: Spacing.sm },
  automationRow: { flexDirection: "row", alignItems: "center" },
  iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  input: { borderWidth: 1, borderRadius: BorderRadius.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: 14 },
});
