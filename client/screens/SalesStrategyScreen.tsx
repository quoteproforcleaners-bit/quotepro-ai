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
import { useLanguage } from "@/context/LanguageContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { ProGate } from "@/components/ProGate";

function useDesignTokens() {
  const { theme, isDark } = useTheme();
  return useMemo(() => ({
    surface: theme.surface0,
    border: theme.border,
    accent: theme.primary,
    accentSoft: theme.primarySoft,
    textPrimary: theme.text,
    textSecondary: theme.textSecondary,
  }), [theme, isDark]);
}

type ProfileKey = "professional" | "friendly" | "premium" | "urgent";

const profileMeta: { key: ProfileKey; icon: keyof typeof Feather.glyphMap; color: string }[] = [
  { key: "professional", icon: "briefcase", color: "#007AFF" },
  { key: "friendly", icon: "smile", color: "#2F7BFF" },
  { key: "premium", icon: "award", color: "#8B5CF6" },
  { key: "urgent", icon: "zap", color: "#F59E0B" },
];

const stageColors = ["#2F7BFF", "#2467DE", "#F59E0B", "#EF4444"];

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
  const { t, tc } = useLanguage();
  const ss = t.salesStrategy;
  const ssc = tc.salesStrategy;

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

  const getProfileLabel = (key: ProfileKey) => ss[key];
  const getProfileDesc = (key: ProfileKey) => ss[`${key}Desc` as keyof typeof ss];
  const getProfilePreview = (key: ProfileKey) => ssc[`${key}Preview` as keyof typeof ssc];

  const stageKeys = [
    { labelKey: "softTouch" as const, toneKey: "softTouchTone" as const, exampleKey: "softTouchExample" as const },
    { labelKey: "valueAdd" as const, toneKey: "valueAddTone" as const, exampleKey: "valueAddExample" as const },
    { labelKey: "urgencyStage" as const, toneKey: "urgencyStageTone" as const, exampleKey: "urgencyStageExample" as const },
    { labelKey: "finalStage" as const, toneKey: "finalStageTone" as const, exampleKey: "finalStageExample" as const },
  ];

  const activeMeta = profileMeta.find((p) => p.key === selectedProfile) ?? profileMeta[0];

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={dt.accent} size="large" />
      </View>
    );
  }

  return (
    <ProGate featureName="Sales Strategy">
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{ paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl, paddingHorizontal: Spacing.lg }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => queryClient.invalidateQueries({ queryKey: ["/api/sales-strategy"] })} tintColor={dt.accent} />}
    >
      <ThemedText type="h3" style={styles.sectionTitle}>{ss.salesProfile}</ThemedText>
      <ThemedText type="small" style={{ color: dt.textSecondary, marginBottom: Spacing.lg }}>
        {ss.salesProfileDesc}
      </ThemedText>

      {profileMeta.map((p) => {
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
                <ThemedText type="subtitle">{getProfileLabel(p.key)}</ThemedText>
                <ThemedText type="caption" style={{ color: dt.textSecondary }}>{getProfileDesc(p.key)}</ThemedText>
              </View>
              <View style={[styles.radio, isSelected ? { borderColor: p.color } : { borderColor: dt.border }]}>
                {isSelected ? <View style={[styles.radioDot, { backgroundColor: p.color }]} /> : null}
              </View>
            </View>
            {isSelected ? (
              <View style={[styles.previewBox, { backgroundColor: p.color + "0A", borderColor: p.color + "25" }]}>
                <ThemedText type="caption" style={{ color: dt.textSecondary, fontStyle: "italic" }}>
                  "{getProfilePreview(p.key)}"
                </ThemedText>
              </View>
            ) : null}
          </Card>
        );
      })}

      <ThemedText type="h3" style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>{ss.escalationEngine}</ThemedText>
      <Card style={styles.escalationToggleCard}>
        <View style={styles.escalationRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle">{ss.autoEscalation}</ThemedText>
            <ThemedText type="caption" style={{ color: dt.textSecondary }}>
              {ss.autoEscalationDesc}
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
          {stageKeys.map((sk, index) => {
            const color = stageColors[index];
            return (
              <View key={index} style={styles.stageRow}>
                <View style={styles.stageTimeline}>
                  <View style={[styles.stageDot, { backgroundColor: color }]} />
                  {index < stageKeys.length - 1 ? <View style={[styles.stageLine, { backgroundColor: dt.border }]} /> : null}
                </View>
                <Card style={{...styles.stageCard, borderLeftWidth: 3, borderLeftColor: color}}>
                  <View style={styles.stageHeader}>
                    <ThemedText type="subtitle">{ss.stage} {index + 1}: {ss[sk.labelKey]}</ThemedText>
                    <View style={[styles.toneBadge, { backgroundColor: color + "18" }]}>
                      <ThemedText type="caption" style={{ color }}>{ss[sk.toneKey]}</ThemedText>
                    </View>
                  </View>
                  <ThemedText type="caption" style={{ color: dt.textSecondary, marginTop: Spacing.xs, fontStyle: "italic" }}>
                    "{ssc[sk.exampleKey]}"
                  </ThemedText>
                </Card>
              </View>
            );
          })}
        </View>
      ) : null}

      <ThemedText type="h3" style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>{ss.aiMessagePreview}</ThemedText>
      <Card style={{...styles.previewCard, borderColor: activeMeta.color + "30", borderWidth: 1}}>
        <View style={styles.previewHeader}>
          <Feather name="message-circle" size={18} color={activeMeta.color} />
          <ThemedText type="subtitle" style={{ marginLeft: Spacing.sm }}>{ss.previewDesc}</ThemedText>
        </View>
        <View style={[styles.messagePreview, { backgroundColor: activeMeta.color + "0A" }]}>
          <ThemedText type="small" style={{ color: dt.textPrimary }}>
            "{getProfilePreview(selectedProfile)}"
          </ThemedText>
        </View>
        <View style={styles.previewMeta}>
          <View style={[styles.toneBadge, { backgroundColor: activeMeta.color + "18" }]}>
            <ThemedText type="caption" style={{ color: activeMeta.color }}>{getProfileLabel(selectedProfile)}</ThemedText>
          </View>
          <ThemedText type="caption" style={{ color: dt.textSecondary }}>
            {escalationEnabled ? ss.escalationOn : ss.escalationOff}
          </ThemedText>
        </View>
      </Card>
    </ScrollView>
    </ProGate>
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
