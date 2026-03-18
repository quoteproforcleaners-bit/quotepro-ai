import React, { useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { trackEvent } from "@/lib/analytics";
import { useAIConsent } from "@/context/AIConsentContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "ClosingAssistant">;

type ObjectionType =
  | "price_objection"
  | "need_to_think"
  | "recurring_hesitation"
  | "deep_clean_resistance"
  | "one_time_only"
  | "follow_up";

type Tone = "professional" | "friendly" | "warm" | "direct" | "confident" | "premium";
type Language = "en" | "es" | "pt" | "ru";

const OBJECTION_TYPES: { value: ObjectionType; label: string; icon: keyof typeof Feather.glyphMap; example: string }[] = [
  { value: "price_objection", label: "Too Expensive", icon: "dollar-sign", example: "Can you do it cheaper?" },
  { value: "need_to_think", label: "Need to Think", icon: "clock", example: "I'll think about it." },
  { value: "recurring_hesitation", label: "No Recurring", icon: "repeat", example: "I just want a one-time clean." },
  { value: "deep_clean_resistance", label: "Skip Deep Clean", icon: "star", example: "I don't need a deep clean." },
  { value: "one_time_only", label: "One-Time Only", icon: "calendar", example: "I only want this once." },
  { value: "follow_up", label: "Follow-Up", icon: "send", example: "Checking back in after the quote." },
];

const TONES: { value: Tone; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "warm", label: "Warm" },
  { value: "confident", label: "Confident" },
  { value: "direct", label: "Direct" },
  { value: "premium", label: "Premium" },
];

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "pt", label: "Portuguese" },
  { value: "ru", label: "Russian" },
];

interface GeneratedResult {
  primaryReply: string;
  alternateReply: string;
  objectionType: string;
  nextMove: string;
}

export default function ClosingAssistantScreen({ route }: Props) {
  const { theme, isDark } = useTheme();
  const { requestConsent } = useAIConsent();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const params = route.params || {};
  const { quoteAmount, serviceType, frequency, customerName, notes } = params;

  const [objectionText, setObjectionText] = useState("");
  const [objectionType, setObjectionType] = useState<ObjectionType>("price_objection");
  const [tone, setTone] = useState<Tone>("friendly");
  const [language, setLanguage] = useState<Language>("en");
  const [showContext, setShowContext] = useState(!!(customerName || quoteAmount || serviceType));
  const [contextName, setContextName] = useState(customerName || "");
  const [contextAmount, setContextAmount] = useState(quoteAmount ? String(quoteAmount) : "");
  const [contextService, setContextService] = useState(serviceType || "");
  const [contextNotes, setContextNotes] = useState(notes || "");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [copiedPrimary, setCopiedPrimary] = useState(false);
  const [copiedAlternate, setCopiedAlternate] = useState(false);

  const handlePickImage = async () => {
    try {
      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert("Permission needed", "Please allow photo access to upload a screenshot.");
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        base64: true,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      if (!asset.base64) {
        setError("Could not read image. Please try again.");
        return;
      }
      const consented = await requestConsent();
      if (!consented) return;
      setIsExtracting(true);
      setError("");
      const mimeType = asset.mimeType || "image/jpeg";
      const res = await apiRequest("POST", "/api/ai/objection-extract", {
        imageBase64: asset.base64,
        mimeType,
      });
      const data = await res.json();
      if (data.text) {
        setObjectionText(data.text);
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setError("Could not extract text. Please type the message manually.");
      }
    } catch (e: any) {
      setError("Could not extract text from the screenshot. Please type it manually.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerate = async () => {
    if (!objectionText.trim() && !contextNotes.trim()) {
      setError("Please paste the customer's message or add some context first.");
      return;
    }
    const consented = await requestConsent();
    if (!consented) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await apiRequest("POST", "/api/ai/closing-message", {
        objectionText: objectionText.trim() || undefined,
        objectionType,
        tone,
        language,
        customerName: contextName || undefined,
        quoteAmount: contextAmount ? parseFloat(contextAmount) : quoteAmount,
        serviceType: contextService || serviceType || undefined,
        frequency,
        notes: contextNotes || undefined,
      });
      const data = await res.json();
      setResult({
        primaryReply: data.primaryReply || data.message || "",
        alternateReply: data.alternateReply || "",
        objectionType: data.objectionType || "",
        nextMove: data.nextMove || "",
      });
      trackEvent("objection_assistant_used", { objectionType, tone, language });
    } catch (e: any) {
      setError(e?.message || "Failed to generate reply. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (text: string, which: "primary" | "alternate") => {
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
      if (which === "primary") {
        setCopiedPrimary(true);
        setTimeout(() => setCopiedPrimary(false), 2000);
      } else {
        setCopiedAlternate(true);
        setTimeout(() => setCopiedAlternate(false), 2000);
      }
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const chipBg = (selected: boolean) =>
    selected
      ? isDark ? `${theme.primary}30` : `${theme.primary}12`
      : isDark ? theme.surface1 : theme.surface0;

  return (
    <ScrollView
      style={[s.root, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        s.content,
        { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing["3xl"] },
      ]}
      showsVerticalScrollIndicator={false}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      keyboardShouldPersistTaps="handled"
    >
      <ThemedText type="small" style={[s.subtitle, { color: theme.textSecondary }]}>
        Paste a customer objection or upload a screenshot to generate a reply that closes the job.
      </ThemedText>

      {/* — Customer message — */}
      <Card variant="base" style={s.section}>
        <View style={s.sectionHeader}>
          <Feather name="message-circle" size={15} color={theme.primary} />
          <ThemedText type="defaultSemiBold" style={{ color: theme.text }}>
            Customer Message
          </ThemedText>
        </View>
        <TextInput
          value={objectionText}
          onChangeText={setObjectionText}
          multiline
          placeholder={`Paste the customer's message here...\n\nExamples:\n• "That's more than I was expecting."\n• "I need to think about it."\n• "I only want a one-time clean."`}
          placeholderTextColor={theme.textMuted}
          style={[
            s.objectionInput,
            {
              color: theme.text,
              backgroundColor: isDark ? theme.surface0 : theme.backgroundSecondary,
              borderColor: theme.border,
            },
          ]}
          textAlignVertical="top"
          testID="input-objection-text"
        />
        <Pressable
          onPress={handlePickImage}
          disabled={isExtracting}
          style={[s.uploadBtn, { borderColor: theme.border, backgroundColor: isDark ? theme.surface1 : theme.surface0 }]}
          testID="button-upload-screenshot"
        >
          {isExtracting ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Feather name="image" size={15} color={theme.primary} />
          )}
          <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
            {isExtracting ? "Extracting text..." : "Upload Screenshot"}
          </ThemedText>
        </Pressable>
      </Card>

      {/* — Objection type — */}
      <ThemedText type="subtitle" style={s.sectionLabel}>
        Objection Type
      </ThemedText>
      <View style={s.chipGrid}>
        {OBJECTION_TYPES.map((ot) => {
          const selected = objectionType === ot.value;
          return (
            <Pressable
              key={ot.value}
              onPress={() => {
                setObjectionType(ot.value);
                if (Platform.OS !== "web") Haptics.selectionAsync();
              }}
              style={[s.chip, { backgroundColor: chipBg(selected), borderColor: selected ? theme.primary : theme.border }]}
              testID={`chip-objection-${ot.value}`}
            >
              <Feather name={ot.icon} size={13} color={selected ? theme.primary : theme.textMuted} />
              <ThemedText type="caption" style={{ color: selected ? theme.primary : theme.text, fontWeight: selected ? "600" : "400" }}>
                {ot.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* — Tone — */}
      <ThemedText type="subtitle" style={s.sectionLabel}>
        Tone
      </ThemedText>
      <View style={s.chipRow}>
        {TONES.map((t) => {
          const selected = tone === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={() => { setTone(t.value); if (Platform.OS !== "web") Haptics.selectionAsync(); }}
              style={[s.toneChip, { backgroundColor: chipBg(selected), borderColor: selected ? theme.primary : theme.border }]}
              testID={`chip-tone-${t.value}`}
            >
              <ThemedText type="caption" style={{ color: selected ? theme.primary : theme.text, fontWeight: selected ? "600" : "400" }}>
                {t.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* — Language — */}
      <ThemedText type="subtitle" style={s.sectionLabel}>
        Language
      </ThemedText>
      <View style={s.chipRow}>
        {LANGUAGES.map((l) => {
          const selected = language === l.value;
          return (
            <Pressable
              key={l.value}
              onPress={() => { setLanguage(l.value); if (Platform.OS !== "web") Haptics.selectionAsync(); }}
              style={[s.toneChip, { backgroundColor: chipBg(selected), borderColor: selected ? theme.primary : theme.border }]}
              testID={`chip-language-${l.value}`}
            >
              <ThemedText type="caption" style={{ color: selected ? theme.primary : theme.text, fontWeight: selected ? "600" : "400" }}>
                {l.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* — Optional context — */}
      <Pressable
        onPress={() => setShowContext((v) => !v)}
        style={s.contextToggle}
        testID="button-toggle-context"
      >
        <Feather name={showContext ? "chevron-up" : "chevron-down"} size={14} color={theme.textMuted} />
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {showContext ? "Hide quote context" : "Add quote context (optional)"}
        </ThemedText>
      </Pressable>

      {showContext ? (
        <Card variant="base" style={s.contextCard}>
          <View style={s.contextField}>
            <ThemedText type="caption" style={[s.fieldLabel, { color: theme.textMuted }]}>Customer name</ThemedText>
            <TextInput
              value={contextName}
              onChangeText={setContextName}
              placeholder="e.g. Sarah"
              placeholderTextColor={theme.textMuted}
              style={[s.fieldInput, { color: theme.text, borderColor: theme.border, backgroundColor: isDark ? theme.surface0 : theme.backgroundSecondary }]}
            />
          </View>
          <View style={s.contextField}>
            <ThemedText type="caption" style={[s.fieldLabel, { color: theme.textMuted }]}>Quote amount ($)</ThemedText>
            <TextInput
              value={contextAmount}
              onChangeText={setContextAmount}
              placeholder="e.g. 280"
              placeholderTextColor={theme.textMuted}
              keyboardType="numeric"
              style={[s.fieldInput, { color: theme.text, borderColor: theme.border, backgroundColor: isDark ? theme.surface0 : theme.backgroundSecondary }]}
            />
          </View>
          <View style={s.contextField}>
            <ThemedText type="caption" style={[s.fieldLabel, { color: theme.textMuted }]}>Service type</ThemedText>
            <TextInput
              value={contextService}
              onChangeText={setContextService}
              placeholder="e.g. Weekly recurring, Deep clean"
              placeholderTextColor={theme.textMuted}
              style={[s.fieldInput, { color: theme.text, borderColor: theme.border, backgroundColor: isDark ? theme.surface0 : theme.backgroundSecondary }]}
            />
          </View>
          <View style={s.contextField}>
            <ThemedText type="caption" style={[s.fieldLabel, { color: theme.textMuted }]}>Extra context</ThemedText>
            <TextInput
              value={contextNotes}
              onChangeText={setContextNotes}
              placeholder="e.g. Price-sensitive, resisting deep clean"
              placeholderTextColor={theme.textMuted}
              multiline
              style={[s.fieldInput, { color: theme.text, borderColor: theme.border, backgroundColor: isDark ? theme.surface0 : theme.backgroundSecondary, minHeight: 60 }]}
              textAlignVertical="top"
            />
          </View>
        </Card>
      ) : null}

      {/* — Error — */}
      {error ? (
        <View style={[s.errorBox, { backgroundColor: `${theme.error}10`, borderColor: `${theme.error}30` }]}>
          <Feather name="alert-circle" size={16} color={theme.error} />
          <ThemedText type="small" style={{ color: theme.error, flex: 1 }}>{error}</ThemedText>
        </View>
      ) : null}

      {/* — Generate — */}
      <Button onPress={handleGenerate} disabled={isLoading} style={s.generateBtn} testID="button-generate-closing">
        {isLoading ? "Analyzing objection..." : "Generate Reply"}
      </Button>

      {/* — Loading — */}
      {isLoading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
            Building your reply...
          </ThemedText>
        </View>
      ) : null}

      {/* — Results — */}
      {result ? (
        <View style={s.results}>
          {result.objectionType ? (
            <View style={[s.objTypeBadge, { backgroundColor: `${theme.primary}12`, borderColor: `${theme.primary}30` }]}>
              <Feather name="tag" size={12} color={theme.primary} />
              <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>
                {result.objectionType}
              </ThemedText>
            </View>
          ) : null}

          <ThemedText type="subtitle" style={s.sectionLabel}>Primary Reply</ThemedText>
          <Card variant="raised" style={s.replyCard}>
            <TextInput
              value={result.primaryReply}
              onChangeText={(v) => setResult((r) => r ? { ...r, primaryReply: v } : r)}
              multiline
              style={[s.replyText, { color: theme.text, backgroundColor: isDark ? theme.surface0 : theme.backgroundSecondary, borderColor: theme.border }]}
              textAlignVertical="top"
              testID="input-primary-reply"
            />
            <View style={s.replyActions}>
              <Pressable
                onPress={() => handleCopy(result.primaryReply, "primary")}
                style={[s.copyBtn, {
                  backgroundColor: copiedPrimary ? (isDark ? `${theme.success}30` : `${theme.success}12`) : (isDark ? theme.surface1 : theme.surface0),
                  borderColor: copiedPrimary ? theme.success : theme.border,
                }]}
                testID="button-copy-primary"
              >
                <Feather name={copiedPrimary ? "check" : "copy"} size={14} color={copiedPrimary ? theme.success : theme.primary} />
                <ThemedText type="caption" style={{ color: copiedPrimary ? theme.success : theme.primary, fontWeight: "600" }}>
                  {copiedPrimary ? "Copied" : "Copy Reply"}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={handleGenerate}
                disabled={isLoading}
                style={[s.copyBtn, { backgroundColor: isDark ? theme.surface1 : theme.surface0, borderColor: theme.border, opacity: isLoading ? 0.5 : 1 }]}
                testID="button-regenerate"
              >
                <Feather name="refresh-cw" size={14} color={theme.primary} />
                <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600" }}>Regenerate</ThemedText>
              </Pressable>
            </View>
          </Card>

          {result.alternateReply ? (
            <>
              <ThemedText type="subtitle" style={s.sectionLabel}>Alternate Version</ThemedText>
              <Card variant="base" style={s.replyCard}>
                <TextInput
                  value={result.alternateReply}
                  onChangeText={(v) => setResult((r) => r ? { ...r, alternateReply: v } : r)}
                  multiline
                  style={[s.replyText, { color: theme.text, backgroundColor: isDark ? theme.surface0 : theme.backgroundSecondary, borderColor: theme.border }]}
                  textAlignVertical="top"
                  testID="input-alternate-reply"
                />
                <Pressable
                  onPress={() => handleCopy(result.alternateReply, "alternate")}
                  style={[s.copyBtn, {
                    backgroundColor: copiedAlternate ? (isDark ? `${theme.success}30` : `${theme.success}12`) : (isDark ? theme.surface1 : theme.surface0),
                    borderColor: copiedAlternate ? theme.success : theme.border,
                    alignSelf: "flex-start",
                    marginTop: Spacing.sm,
                  }]}
                  testID="button-copy-alternate"
                >
                  <Feather name={copiedAlternate ? "check" : "copy"} size={14} color={copiedAlternate ? theme.success : theme.primary} />
                  <ThemedText type="caption" style={{ color: copiedAlternate ? theme.success : theme.primary, fontWeight: "600" }}>
                    {copiedAlternate ? "Copied" : "Copy"}
                  </ThemedText>
                </Pressable>
              </Card>
            </>
          ) : null}

          {result.nextMove ? (
            <Card variant="base" style={[s.nextMoveCard, { borderColor: `${theme.primary}25`, backgroundColor: isDark ? `${theme.primary}10` : `${theme.primary}06` }]}>
              <View style={s.nextMoveHeader}>
                <Feather name="arrow-right-circle" size={14} color={theme.primary} />
                <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Suggested Next Move
                </ThemedText>
              </View>
              <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 20 }}>
                {result.nextMove}
              </ThemedText>
            </Card>
          ) : null}
        </View>
      ) : null}

      {!result && !isLoading && !error ? (
        <View style={[s.emptyState, { borderColor: theme.border }]}>
          <Feather name="shield" size={28} color={theme.textMuted} />
          <ThemedText type="small" style={[s.emptyStateText, { color: theme.textMuted }]}>
            Paste a customer message above and tap Generate Reply to get a closing-ready response.
          </ThemedText>
        </View>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl },
  subtitle: { marginBottom: Spacing.lg },
  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.xs },
  sectionLabel: { marginTop: Spacing.lg, marginBottom: Spacing.sm },
  objectionInput: {
    minHeight: 120,
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: Spacing.sm,
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  toneChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  contextToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  contextCard: { gap: Spacing.sm },
  contextField: { gap: 4 },
  fieldLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  fieldInput: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    fontSize: 14,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  generateBtn: { marginTop: Spacing.xl },
  loadingBox: { alignItems: "center", paddingVertical: Spacing["2xl"] },
  results: { marginTop: Spacing.lg, gap: 0 },
  objTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  replyCard: { gap: 0 },
  replyText: {
    minHeight: 120,
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  replyActions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  nextMoveCard: { marginTop: Spacing.md, gap: Spacing.sm, borderWidth: 1 },
  nextMoveHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  emptyState: {
    marginTop: Spacing.xl,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.md,
  },
  emptyStateText: { textAlign: "center", lineHeight: 20 },
});
