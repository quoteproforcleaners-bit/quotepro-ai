import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { ProGate } from "@/components/ProGate";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

type PersonalityPreset = "professional" | "friendly" | "concierge" | "custom";

interface ConciergeSettings {
  tier: string;
  canNegotiate: boolean;
  canCustomPersonality: boolean;
  canSandbox: boolean;
  defaultEnabled: boolean;
  /** Server now returns canonical preset; legacy values are mapped by the API. */
  personality: PersonalityPreset | string;
  defaultPrompts: string[];
  voiceTone: string;
  bannedTopics: string[];
  guardrails: {
    maxDiscountPercent: number;
    autoApproveThreshold: number;
    requiresOwnerApprovalAbove: number;
    removableAddons: string[];
    nonNegotiableItems: string[];
  };
}

const PERSONALITIES: { value: PersonalityPreset; label: string; desc: string }[] = [
  { value: "professional", label: "Professional", desc: "Crisp, factual, all business" },
  { value: "friendly", label: "Friendly", desc: "Warm, conversational, approachable" },
  { value: "concierge", label: "Concierge", desc: "Polished, attentive, white-glove" },
  { value: "custom", label: "Custom (Pro)", desc: "Train on your own brand voice" },
];

/**
 * Map any legacy server value into one of the four canonical presets.
 * MUST match server/services/aiConcierge.ts > normalizePersonality() exactly,
 * otherwise the UI displays one preset while the AI behaves as another:
 *   - casual  -> friendly
 *   - sales   -> concierge   (old "confident/persuasive" → new "premium/white-glove")
 *   - <other> -> professional
 */
function normalizeClientPersonality(raw: string | null | undefined): PersonalityPreset {
  const v = String(raw || "").toLowerCase().trim();
  if (v === "professional" || v === "friendly" || v === "concierge" || v === "custom") return v;
  if (v === "casual") return "friendly";
  if (v === "sales") return "concierge";
  return "professional";
}

export default function AIConciergeSettingsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery<ConciergeSettings>({
    queryKey: ["/api/business/ai-concierge/settings"],
  });

  const [enabled, setEnabled] = useState(true);
  const [personality, setPersonality] = useState<PersonalityPreset>("professional");
  const [voiceTone, setVoiceTone] = useState("");
  const [maxDisc, setMaxDisc] = useState("15");
  const [autoApprove, setAutoApprove] = useState("5");
  const [promptsText, setPromptsText] = useState("");
  const [bannedText, setBannedText] = useState("");
  const [removableText, setRemovableText] = useState("");
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [sandboxInput, setSandboxInput] = useState("");
  const [sandboxResp, setSandboxResp] = useState<any>(null);
  const [sandboxBusy, setSandboxBusy] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.defaultEnabled);
    setPersonality(normalizeClientPersonality(settings.personality));
    setVoiceTone(settings.voiceTone || "");
    setMaxDisc(String(settings.guardrails.maxDiscountPercent));
    setAutoApprove(String(settings.guardrails.autoApproveThreshold));
    setPromptsText((settings.defaultPrompts || []).join("\n"));
    setBannedText((settings.bannedTopics || []).join("\n"));
    setRemovableText((settings.guardrails.removableAddons || []).join("\n"));
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const body: any = {
        defaultEnabled: enabled,
        personality,
        voiceTone,
        defaultPrompts: promptsText.split("\n").map((s) => s.trim()).filter(Boolean),
        bannedTopics: bannedText.split("\n").map((s) => s.trim()).filter(Boolean),
        guardrails: {
          maxDiscountPercent: Number(maxDisc) || 15,
          autoApproveThreshold: Number(autoApprove) || 5,
          requiresOwnerApprovalAbove: Number(maxDisc) || 15,
          removableAddons: removableText.split("\n").map((s) => s.trim()).filter(Boolean),
          nonNegotiableItems: settings?.guardrails.nonNegotiableItems || [],
        },
      };
      return apiRequest("PUT", "/api/business/ai-concierge/settings", body);
    },
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["/api/business/ai-concierge/settings"] });
    },
    onError: () => Alert.alert("Couldn't save", "Please try again."),
  });

  const runSandbox = useCallback(async () => {
    if (!sandboxInput.trim()) return;
    setSandboxBusy(true);
    setSandboxResp(null);
    try {
      const r: any = await apiRequest("POST", "/api/business/ai-concierge/sandbox", {
        message: sandboxInput.trim(),
      });
      setSandboxResp(r);
    } catch (e: any) {
      Alert.alert("Sandbox", e?.message || "Couldn't run sandbox");
    } finally {
      setSandboxBusy(false);
    }
  }, [sandboxInput]);

  const styles = makeStyles(theme);

  if (isLoading || !settings) {
    return (
      <View style={[styles.center, { paddingTop: headerHeight }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing["2xl"], paddingHorizontal: Spacing.lg }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <Card variant="base" style={styles.section}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold">AI Concierge</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
              Embedded chat on every quote page
            </ThemedText>
          </View>
          <Switch
            value={enabled}
            onValueChange={(v) => {
              Haptics.selectionAsync();
              setEnabled(v);
            }}
            trackColor={{ false: theme.border, true: theme.accent }}
            testID="switch-concierge-enabled"
          />
        </View>
      </Card>

      <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>Personality</ThemedText>
      <Card variant="base" style={styles.section}>
        {PERSONALITIES.map((p, i) => {
          const isLocked = p.value === "custom" && !settings.canCustomPersonality;
          const selected = personality === p.value;
          return (
            <Pressable
              key={p.value}
              onPress={() => {
                if (isLocked) {
                  navigation.navigate("Paywall", { trigger_source: "concierge_personality", required_tier: "pro" });
                  return;
                }
                Haptics.selectionAsync();
                setPersonality(p.value);
              }}
              style={[styles.optionRow, i < PERSONALITIES.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
              testID={`option-personality-${p.value}`}
            >
              <View style={{ flex: 1 }}>
                <ThemedText type="body">{p.label}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>{p.desc}</ThemedText>
              </View>
              {isLocked ? (
                <Feather name="lock" size={18} color={theme.textSecondary} />
              ) : selected ? (
                <Feather name="check-circle" size={20} color={theme.accent} />
              ) : (
                <Feather name="circle" size={20} color={theme.border} />
              )}
            </Pressable>
          );
        })}
      </Card>

      {personality === "custom" && settings.canCustomPersonality ? (
        <Card variant="base" style={styles.section}>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: 6 }}>Voice & tone description</ThemedText>
          <TextInput
            value={voiceTone}
            onChangeText={setVoiceTone}
            placeholder="e.g. Warm, calm, never pushy. Use plain English."
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[styles.input, { minHeight: 80, color: theme.text, borderColor: theme.border }]}
            testID="input-voice-tone"
          />
        </Card>
      ) : null}

      <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>Suggested prompts</ThemedText>
      <Card variant="base" style={styles.section}>
        <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: 6 }}>One per line. Shown as taps in the chat.</ThemedText>
        <TextInput
          value={promptsText}
          onChangeText={setPromptsText}
          placeholder={"What's included?\nHow long does it take?\nCan I skip a visit?"}
          placeholderTextColor={theme.textSecondary}
          multiline
          style={[styles.input, { minHeight: 110, color: theme.text, borderColor: theme.border }]}
          testID="input-prompts"
        />
      </Card>

      <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>Negotiation guardrails</ThemedText>
      {settings.canNegotiate ? (
        <Card variant="base" style={styles.section}>
          <View style={styles.fieldRow}>
            <View style={{ flex: 1 }}>
              <ThemedText type="body">Max discount</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>The deepest cut the AI can offer</ThemedText>
            </View>
            <View style={styles.numField}>
              <TextInput
                value={maxDisc}
                onChangeText={setMaxDisc}
                keyboardType="numeric"
                style={[styles.numInput, { color: theme.text, borderColor: theme.border }]}
                testID="input-max-discount"
              />
              <ThemedText type="body" style={{ marginLeft: 4 }}>%</ThemedText>
            </View>
          </View>
          <View style={[styles.fieldRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: Spacing.md }]}>
            <View style={{ flex: 1 }}>
              <ThemedText type="body">Auto-approve up to</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>No owner approval below this</ThemedText>
            </View>
            <View style={styles.numField}>
              <TextInput
                value={autoApprove}
                onChangeText={setAutoApprove}
                keyboardType="numeric"
                style={[styles.numInput, { color: theme.text, borderColor: theme.border }]}
                testID="input-auto-approve"
              />
              <ThemedText type="body" style={{ marginLeft: 4 }}>%</ThemedText>
            </View>
          </View>
          <View style={{ marginTop: Spacing.md }}>
            <ThemedText type="body">Removable add-ons</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: 6 }}>
              The AI may remove these to lower price (one per line)
            </ThemedText>
            <TextInput
              value={removableText}
              onChangeText={setRemovableText}
              placeholder={"Inside fridge\nInside oven\nInterior windows"}
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.input, { minHeight: 80, color: theme.text, borderColor: theme.border }]}
              testID="input-removable"
            />
          </View>
        </Card>
      ) : (
        <Card variant="base" style={[styles.section, { padding: Spacing.lg }]}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm }}>
            <Feather name="lock" size={18} color={theme.textSecondary} />
            <ThemedText type="defaultSemiBold" style={{ marginLeft: 8 }}>Growth feature</ThemedText>
          </View>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
            Let the AI close more deals by offering small, controlled discounts within your guardrails.
          </ThemedText>
          <Pressable
            onPress={() => navigation.navigate("Paywall", { trigger_source: "concierge_negotiation", required_tier: "growth" })}
            style={({ pressed }) => [
              styles.upgradeBtn,
              { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <ThemedText type="body" style={{ color: "#fff", fontWeight: "700" }}>Upgrade to Growth</ThemedText>
          </Pressable>
        </Card>
      )}

      <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>Banned topics</ThemedText>
      <Card variant="base" style={styles.section}>
        <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: 6 }}>
          The AI will refuse to discuss these (one per line).
        </ThemedText>
        <TextInput
          value={bannedText}
          onChangeText={setBannedText}
          placeholder={"Politics\nMedical advice"}
          placeholderTextColor={theme.textSecondary}
          multiline
          style={[styles.input, { minHeight: 70, color: theme.text, borderColor: theme.border }]}
          testID="input-banned"
        />
      </Card>

      {/* Sandbox */}
      <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>Sandbox tester</ThemedText>
      {settings.canSandbox ? (
        <Card variant="base" style={styles.section}>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: 8 }}>
            Try a customer message against a synthetic $250 biweekly Better-tier quote.
          </ThemedText>
          <TextInput
            value={sandboxInput}
            onChangeText={setSandboxInput}
            placeholder="e.g. Can you do $200?"
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[styles.input, { minHeight: 70, color: theme.text, borderColor: theme.border }]}
            testID="input-sandbox"
          />
          <Pressable
            onPress={runSandbox}
            disabled={sandboxBusy || !sandboxInput.trim()}
            style={({ pressed }) => [
              styles.upgradeBtn,
              {
                backgroundColor: theme.accent,
                marginTop: Spacing.sm,
                opacity: sandboxBusy || !sandboxInput.trim() ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
            testID="button-run-sandbox"
          >
            {sandboxBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText type="body" style={{ color: "#fff", fontWeight: "700" }}>Run sandbox</ThemedText>
            )}
          </Pressable>
          {sandboxResp ? (
            <View style={[styles.sandboxResp, { backgroundColor: theme.surface1, borderColor: theme.border }]}>
              <View style={{ flexDirection: "row", marginBottom: 4 }}>
                <View style={[styles.tag, { backgroundColor: theme.accent + "22" }]}>
                  <ThemedText type="caption" style={{ color: theme.accent }}>{sandboxResp.intent}</ThemedText>
                </View>
                {sandboxResp.detectedLanguage ? (
                  <View style={[styles.tag, { backgroundColor: theme.border + "55", marginLeft: 6 }]}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>{sandboxResp.detectedLanguage}</ThemedText>
                  </View>
                ) : null}
              </View>
              <ThemedText type="body" testID="text-sandbox-response">{sandboxResp.content}</ThemedText>
              {sandboxResp.structuredPayload?.type === "offer" ? (
                <View style={[styles.offerBox, { borderColor: theme.accent }]}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>OFFER</ThemedText>
                  <ThemedText type="body" style={{ marginTop: 2 }}>
                    ${sandboxResp.structuredPayload.originalTotal} → ${sandboxResp.structuredPayload.offeredTotal} ({sandboxResp.structuredPayload.discountPct}% off)
                  </ThemedText>
                </View>
              ) : null}
            </View>
          ) : null}
        </Card>
      ) : (
        <Card variant="base" style={[styles.section, { padding: Spacing.lg }]}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm }}>
            <Feather name="lock" size={18} color={theme.textSecondary} />
            <ThemedText type="defaultSemiBold" style={{ marginLeft: 8 }}>Growth feature</ThemedText>
          </View>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Test customer chats against a fake quote on Growth or Pro.
          </ThemedText>
        </Card>
      )}

      {/* Quick links */}
      <Pressable
        onPress={() => navigation.navigate("AIConciergeConversations")}
        style={({ pressed }) => [styles.link, { backgroundColor: theme.surface1, opacity: pressed ? 0.85 : 1 }]}
        testID="button-view-conversations"
      >
        <Feather name="message-square" size={18} color={theme.text} />
        <ThemedText type="body" style={{ flex: 1, marginLeft: 10 }}>View customer conversations</ThemedText>
        <Feather name="chevron-right" size={18} color={theme.textSecondary} />
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate("AIConciergeInsights")}
        style={({ pressed }) => [styles.link, { backgroundColor: theme.surface1, opacity: pressed ? 0.85 : 1, marginTop: Spacing.sm }]}
        testID="button-view-insights"
      >
        <Feather name="trending-up" size={18} color={theme.text} />
        <ThemedText type="body" style={{ flex: 1, marginLeft: 10 }}>This week's insights</ThemedText>
        <Feather name="chevron-right" size={18} color={theme.textSecondary} />
      </Pressable>

      <Pressable
        onPress={() => saveMut.mutate()}
        disabled={saveMut.isPending}
        style={({ pressed }) => [
          styles.saveBtn,
          { backgroundColor: theme.accent, opacity: saveMut.isPending ? 0.7 : pressed ? 0.85 : 1 },
        ]}
        testID="button-save-concierge"
      >
        {saveMut.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText type="body" style={{ color: "#fff", fontWeight: "700" }}>Save changes</ThemedText>
        )}
      </Pressable>
    </ScrollView>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background },
    section: { marginBottom: Spacing.lg, padding: Spacing.md },
    sectionLabel: { marginTop: Spacing.lg, marginBottom: Spacing.sm, color: theme.textSecondary, fontSize: 13, textTransform: "uppercase", letterSpacing: 0.4 },
    row: { flexDirection: "row", alignItems: "center" },
    optionRow: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md },
    fieldRow: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm },
    numField: { flexDirection: "row", alignItems: "center" },
    numInput: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 10, paddingVertical: 8, minWidth: 64, textAlign: "center", fontSize: 15 },
    input: { borderWidth: 1, borderRadius: BorderRadius.md, padding: 10, fontSize: 15, textAlignVertical: "top" },
    upgradeBtn: { paddingVertical: 12, borderRadius: BorderRadius.lg, alignItems: "center", justifyContent: "center", minHeight: 44 },
    sandboxResp: { marginTop: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1 },
    offerBox: { marginTop: Spacing.sm, padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1 },
    tag: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
    link: { flexDirection: "row", alignItems: "center", padding: Spacing.md, borderRadius: BorderRadius.lg, minHeight: 48 },
    saveBtn: { marginTop: Spacing.xl, paddingVertical: 14, borderRadius: BorderRadius.lg, alignItems: "center", justifyContent: "center", minHeight: 48 },
  });
