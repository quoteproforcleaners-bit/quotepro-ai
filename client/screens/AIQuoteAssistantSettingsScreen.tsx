import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ProGate } from "@/components/ProGate";
import { useSubscription } from "@/context/SubscriptionContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

const PURPLE = "#7C3AED";
const TONES = ["professional", "friendly", "concise"];

function SettingRow({
  label,
  description,
  value,
  onToggle,
  theme,
}: {
  label: string;
  description?: string;
  value: boolean;
  onToggle: () => void;
  theme: any;
}) {
  return (
    <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <ThemedText style={styles.settingLabel}>{label}</ThemedText>
        {description ? (
          <ThemedText style={[styles.settingDesc, { color: theme.textMuted }]}>{description}</ThemedText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.border, true: PURPLE }}
        thumbColor="#fff"
      />
    </View>
  );
}

export default function AIQuoteAssistantSettingsScreen() {
  const theme = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { isPro } = useSubscription();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({
    enabled: false,
    autoReplyEnabled: true,
    businessTone: "professional",
    responseHoursOnly: false,
    requireHandoffOnDiscount: true,
    requireHandoffOnAngry: true,
    requireHandoffOnCommercial: true,
    requireHandoffOnLowConfidence: true,
    lowConfidenceThreshold: 70,
    allowFaqAutoAnswers: true,
    allowIntakeAutomation: true,
    autoCreateQuoteDraft: true,
    autoSendQuote: false,
  });

  const { data: serverSettings, isLoading } = useQuery<any>({
    queryKey: ["/api/ai-assistant/settings"],
    enabled: isPro,
  });

  useEffect(() => {
    if (serverSettings) setSettings((prev: any) => ({ ...prev, ...serverSettings }));
  }, [serverSettings]);

  if (!isPro) {
    return <ProGate featureName="AI Quote Assistant"><View /></ProGate>;
  }

  const toggle = (key: string) => setSettings((prev: any) => ({ ...prev, [key]: !prev[key] }));

  async function save() {
    setSaving(true);
    try {
      await apiRequest("POST", "/api/ai-assistant/settings", settings);
      queryClient.invalidateQueries({ queryKey: ["/api/ai-assistant/settings"] });
      Alert.alert("Saved", "Your settings have been saved.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={PURPLE} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.sm,
          paddingHorizontal: Spacing.md,
          paddingBottom: insets.bottom + Spacing.xl,
        }}
      >
        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: PURPLE + "15", borderColor: PURPLE + "33" }]}>
          <Feather name="cpu" size={24} color={PURPLE} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <ThemedText style={[styles.heroTitle, { color: PURPLE }]}>AI Quote Assistant</ThemedText>
            <ThemedText style={[styles.heroDesc, { color: theme.textMuted }]}>
              Let AI handle common quote and FAQ conversations, then bring you in when a customer needs a human touch.
            </ThemedText>
          </View>
        </View>

        {/* General */}
        <ThemedText style={[styles.sectionHeader, { color: theme.textMuted }]}>General</ThemedText>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <SettingRow label="Enable AI Quote Assistant" description="Turn on AI-powered automatic replies" value={settings.enabled} onToggle={() => toggle("enabled")} theme={theme} />
          <SettingRow label="Auto Reply" description="AI will automatically respond to inbound messages" value={settings.autoReplyEnabled} onToggle={() => toggle("autoReplyEnabled")} theme={theme} />
        </View>

        {/* Tone */}
        <ThemedText style={[styles.sectionHeader, { color: theme.textMuted }]}>Tone</ThemedText>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {TONES.map((tone) => (
            <Pressable
              key={tone}
              style={[styles.toneRow, { borderBottomColor: theme.border }]}
              onPress={() => setSettings((p: any) => ({ ...p, businessTone: tone }))}
            >
              <ThemedText style={styles.toneLabel}>{tone.charAt(0).toUpperCase() + tone.slice(1)}</ThemedText>
              {settings.businessTone === tone && <Feather name="check" size={18} color={PURPLE} />}
            </Pressable>
          ))}
        </View>

        {/* Automation */}
        <ThemedText style={[styles.sectionHeader, { color: theme.textMuted }]}>Automation</ThemedText>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <SettingRow label="FAQ Auto-Answers" description="Let AI answer common questions automatically" value={settings.allowFaqAutoAnswers} onToggle={() => toggle("allowFaqAutoAnswers")} theme={theme} />
          <SettingRow label="Quote Intake Automation" description="AI collects quote details through conversation" value={settings.allowIntakeAutomation} onToggle={() => toggle("allowIntakeAutomation")} theme={theme} />
          <SettingRow label="Auto-Create Quote Draft" description="When intake is complete, create a draft quote" value={settings.autoCreateQuoteDraft} onToggle={() => toggle("autoCreateQuoteDraft")} theme={theme} />
          <SettingRow label="Auto-Send Quote" description="Automatically send quote without owner review (not recommended for beta)" value={settings.autoSendQuote} onToggle={() => toggle("autoSendQuote")} theme={theme} />
        </View>

        {/* Escalation */}
        <ThemedText style={[styles.sectionHeader, { color: theme.textMuted }]}>Escalation Rules</ThemedText>
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <SettingRow label="Hand Off on Discount Request" value={settings.requireHandoffOnDiscount} onToggle={() => toggle("requireHandoffOnDiscount")} theme={theme} />
          <SettingRow label="Hand Off on Upset Customer" value={settings.requireHandoffOnAngry} onToggle={() => toggle("requireHandoffOnAngry")} theme={theme} />
          <SettingRow label="Hand Off on Commercial Request" value={settings.requireHandoffOnCommercial} onToggle={() => toggle("requireHandoffOnCommercial")} theme={theme} />
          <SettingRow label="Hand Off on Low Confidence" description={`Threshold: ${settings.lowConfidenceThreshold}%`} value={settings.requireHandoffOnLowConfidence} onToggle={() => toggle("requireHandoffOnLowConfidence")} theme={theme} />
        </View>

        {/* Save */}
        <Pressable
          style={[styles.saveBtn, { backgroundColor: PURPLE, opacity: saving ? 0.7 : 1 }]}
          onPress={save}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.saveBtnText}>Save Settings</ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  heroCard: { flexDirection: "row", alignItems: "flex-start", borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.md, marginBottom: Spacing.lg },
  heroTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  heroDesc: { fontSize: 13, lineHeight: 18 },
  sectionHeader: { fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8, marginTop: Spacing.md },
  section: { borderRadius: BorderRadius.lg, borderWidth: 1, overflow: "hidden", marginBottom: Spacing.md },
  settingRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  settingLabel: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  settingDesc: { fontSize: 12, lineHeight: 16 },
  toneRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: Spacing.md, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  toneLabel: { fontSize: 15 },
  saveBtn: { borderRadius: BorderRadius.lg, paddingVertical: 16, alignItems: "center", marginTop: Spacing.lg },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
