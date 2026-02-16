import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Switch,
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

type ProfileKey = "professional" | "friendly" | "premium" | "urgent";

interface Profile {
  key: ProfileKey;
  label: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  preview: string;
}

const profiles: Profile[] = [
  { key: "professional", label: "Professional", description: "Polished, respectful, straight to the point", icon: "briefcase", color: "#007AFF", preview: "Hi [Name], thank you for requesting a cleaning estimate. I have availability this week and would be happy to schedule your service at your convenience. Please let me know a time that works for you." },
  { key: "friendly", label: "Friendly", description: "Warm, casual, like texting a neighbor", icon: "smile", color: "#10B981", preview: "Hey [Name]! Hope you're having a great week. Just wanted to check in about your cleaning quote - I'd love to help keep your place looking amazing. What day works best for you?" },
  { key: "premium", label: "Premium", description: "Luxury feel, white-glove, exclusive", icon: "award", color: "#8B5CF6", preview: "Good afternoon [Name]. As part of our commitment to exceptional service, I'd like to personally extend priority scheduling for your home. We ensure meticulous attention to every detail." },
  { key: "urgent", label: "Urgent", description: "Direct, time-sensitive, creates action", icon: "zap", color: "#F59E0B", preview: "[Name], quick heads up - your quote expires tomorrow and I only have 2 openings left this week. Reply now to lock in your rate before it's gone!" },
];

const escalationStages = [
  { stage: 1, label: "Soft Touch", tone: "Gentle reminder", example: "Just a friendly reminder about your cleaning quote. No rush - let us know if you have any questions!", color: "#10B981" },
  { stage: 2, label: "Value Add", tone: "Highlight benefits", example: "Did you know? Our deep clean includes baseboards, inside appliances, and window sills at no extra charge.", color: "#007AFF" },
  { stage: 3, label: "Urgency", tone: "Limited availability", example: "Heads up - our schedule is filling fast for next week. We'd hate for you to miss out on your preferred time.", color: "#F59E0B" },
  { stage: 4, label: "Final", tone: "Last chance", example: "Last chance! Your custom quote expires tomorrow. After that, we'll need to re-estimate based on current rates.", color: "#EF4444" },
];

interface StrategyData {
  profile: ProfileKey;
  escalationEnabled: boolean;
}

export default function SalesStrategyScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  const dt = useDesignTokens();

  const { data: serverStrategy, isLoading } = useQuery<StrategyData>({
    queryKey: ["/api/sales-strategy"],
  });

  const [selectedProfile, setSelectedProfile] = useState<ProfileKey>("professional");
  const [escalationEnabled, setEscalationEnabled] = useState(false);

  useEffect(() => {
    if (serverStrategy) {
      setSelectedProfile((serverStrategy as any).selectedProfile ?? "professional");
      setEscalationEnabled((serverStrategy as any).escalationEnabled ?? false);
    }
  }, [serverStrategy]);

  const saveStrategy = async (profile: ProfileKey, escalation: boolean) => {
    await apiRequest("PUT", "/api/sales-strategy", { selectedProfile: profile, escalationEnabled: escalation });
    queryClient.invalidateQueries({ queryKey: ["/api/sales-strategy"] });
  };

  const handleSelectProfile = (key: ProfileKey) => {
    setSelectedProfile(key);
    saveStrategy(key, escalationEnabled);
  };

  const handleToggleEscalation = (val: boolean) => {
    setEscalationEnabled(val);
    saveStrategy(selectedProfile, val);
  };

  const activeProfile = profiles.find((p) => p.key === selectedProfile) ?? profiles[0];

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={dt.accent} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{ paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl, paddingHorizontal: Spacing.lg }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => queryClient.invalidateQueries({ queryKey: ["/api/sales-strategy"] })} tintColor={dt.accent} />}
    >
      <ThemedText type="h3" style={styles.sectionTitle}>Sales Profile</ThemedText>
      <ThemedText type="small" style={{ color: dt.textSecondary, marginBottom: Spacing.lg }}>
        Choose a communication style for your follow-ups and outreach.
      </ThemedText>

      {profiles.map((p) => {
        const isSelected = selectedProfile === p.key;
        return (
          <Card
            key={p.key}
            onPress={() => handleSelectProfile(p.key)}
            style={{...styles.profileCard, ...(isSelected ? { borderColor: p.color, borderWidth: 2 } : { borderColor: dt.border, borderWidth: 1 })}}
          >
            <View style={styles.profileRow} testID={`card-profile-${p.key}`}>
              <View style={[styles.profileIcon, { backgroundColor: p.color + "18" }]}>
                <Feather name={p.icon} size={22} color={p.color} />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <ThemedText type="subtitle">{p.label}</ThemedText>
                <ThemedText type="caption" style={{ color: dt.textSecondary }}>{p.description}</ThemedText>
              </View>
              <View style={[styles.radio, isSelected ? { borderColor: p.color } : { borderColor: dt.border }]}>
                {isSelected ? <View style={[styles.radioDot, { backgroundColor: p.color }]} /> : null}
              </View>
            </View>
            {isSelected ? (
              <View style={[styles.previewBox, { backgroundColor: p.color + "0A", borderColor: p.color + "25" }]}>
                <ThemedText type="caption" style={{ color: dt.textSecondary, fontStyle: "italic" }}>
                  "{p.preview}"
                </ThemedText>
              </View>
            ) : null}
          </Card>
        );
      })}

      <ThemedText type="h3" style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Escalation Engine</ThemedText>
      <Card style={styles.escalationToggleCard}>
        <View style={styles.escalationRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle">Auto-Escalation</ThemedText>
            <ThemedText type="caption" style={{ color: dt.textSecondary }}>
              Automatically increase urgency after each follow-up
            </ThemedText>
          </View>
          <Switch
            testID="switch-escalation"
            value={escalationEnabled}
            onValueChange={handleToggleEscalation}
            trackColor={{ false: dt.border, true: dt.accent + "80" }}
            thumbColor={escalationEnabled ? dt.accent : "#ccc"}
          />
        </View>
      </Card>

      {escalationEnabled ? (
        <View style={styles.stagesContainer}>
          {escalationStages.map((stage, index) => (
            <View key={stage.stage} style={styles.stageRow}>
              <View style={styles.stageTimeline}>
                <View style={[styles.stageDot, { backgroundColor: stage.color }]} />
                {index < escalationStages.length - 1 ? <View style={[styles.stageLine, { backgroundColor: dt.border }]} /> : null}
              </View>
              <Card style={{...styles.stageCard, borderLeftWidth: 3, borderLeftColor: stage.color}}>
                <View style={styles.stageHeader}>
                  <ThemedText type="subtitle">Stage {stage.stage}: {stage.label}</ThemedText>
                  <View style={[styles.toneBadge, { backgroundColor: stage.color + "18" }]}>
                    <ThemedText type="caption" style={{ color: stage.color }}>{stage.tone}</ThemedText>
                  </View>
                </View>
                <ThemedText type="caption" style={{ color: dt.textSecondary, marginTop: Spacing.xs, fontStyle: "italic" }}>
                  "{stage.example}"
                </ThemedText>
              </Card>
            </View>
          ))}
        </View>
      ) : null}

      <ThemedText type="h3" style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>AI Message Preview</ThemedText>
      <Card style={{...styles.previewCard, borderColor: activeProfile.color + "30", borderWidth: 1}}>
        <View style={styles.previewHeader}>
          <Feather name="message-circle" size={18} color={activeProfile.color} />
          <ThemedText type="subtitle" style={{ marginLeft: Spacing.sm }}>Preview how your messages will sound</ThemedText>
        </View>
        <View style={[styles.messagePreview, { backgroundColor: activeProfile.color + "0A" }]}>
          <ThemedText type="small" style={{ color: dt.textPrimary }}>
            "{activeProfile.preview}"
          </ThemedText>
        </View>
        <View style={styles.previewMeta}>
          <View style={[styles.toneBadge, { backgroundColor: activeProfile.color + "18" }]}>
            <ThemedText type="caption" style={{ color: activeProfile.color }}>{activeProfile.label}</ThemedText>
          </View>
          <ThemedText type="caption" style={{ color: dt.textSecondary }}>
            {escalationEnabled ? "Escalation: ON" : "Escalation: OFF"}
          </ThemedText>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: { marginBottom: Spacing.sm },
  profileCard: { marginBottom: Spacing.sm },
  profileRow: { flexDirection: "row", alignItems: "center" },
  profileIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  previewBox: { marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.xs, borderWidth: 1 },
  escalationToggleCard: { marginBottom: Spacing.md },
  escalationRow: { flexDirection: "row", alignItems: "center" },
  stagesContainer: { marginTop: Spacing.sm },
  stageRow: { flexDirection: "row", marginBottom: 0 },
  stageTimeline: { width: 24, alignItems: "center" },
  stageDot: { width: 12, height: 12, borderRadius: 6, marginTop: 18 },
  stageLine: { width: 2, flex: 1, marginTop: 2 },
  stageCard: { flex: 1, marginLeft: Spacing.sm, marginBottom: Spacing.sm },
  stageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: Spacing.xs },
  toneBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.xs },
  previewCard: { marginBottom: Spacing.lg },
  previewHeader: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.md },
  messagePreview: { padding: Spacing.md, borderRadius: BorderRadius.xs, marginBottom: Spacing.md },
  previewMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
