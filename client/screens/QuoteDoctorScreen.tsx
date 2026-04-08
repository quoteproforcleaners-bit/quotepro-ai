import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Pressable, Share, Modal,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/context/SubscriptionContext";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:5000";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalysisResult {
  verdict: "too_low" | "fair" | "too_high";
  margin_risk: "high" | "medium" | "low";
  suggested_range_low: number;
  suggested_range_high: number;
  coaching_note: string;
}

interface PricingTier {
  label: string;
  title: string;
  badge?: string;
  bullets: string[];
  price?: string;
}
interface ParsedProposal {
  intro: string[];
  tiers: PricingTier[];
  closing: string[];
  raw: string;
}

// ─── Proposal parser ──────────────────────────────────────────────────────────

function parseProposal(text: string): ParsedProposal {
  const lines = text.split("\n");
  const tiers: PricingTier[] = [];
  const intro: string[] = [];
  const closing: string[] = [];
  let current: PricingTier | null = null;
  let inTierSection = false;
  let pastTiers = false;

  const TIER_RE = /^[\*\#\s]*(Good|Better|Best)\s*[:–-]\s*(.+)/i;
  const BULLET_RE = /^\s*[-•*]\s+(.+)/;
  const HEADER_RE = /^#+\s+(.+)/;
  const PRICE_RE = /total\s*[:=]?\s*\$?([\d,]+\.?\d*)/i;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line === "---") continue;
    const clean = line.replace(/\*\*/g, "").replace(/\*/g, "").replace(/^#+\s*/, "");
    const tierMatch = TIER_RE.exec(clean);
    if (tierMatch) {
      if (current) tiers.push(current);
      const fullTitle = tierMatch[2].replace(/\(most popular\)/i, "").trim();
      const isMostPopular = /most popular/i.test(tierMatch[2]) || tierMatch[1].toLowerCase() === "better";
      current = { label: tierMatch[1], title: fullTitle, badge: isMostPopular ? "Most Popular" : undefined, bullets: [] };
      inTierSection = true;
      continue;
    }
    if (HEADER_RE.test(line)) { inTierSection = false; continue; }
    if (current) {
      const bMatch = BULLET_RE.exec(line);
      if (bMatch) {
        const bt = bMatch[1].replace(/\*\*/g, "").replace(/\*/g, "");
        const priceMatch = PRICE_RE.exec(bt);
        if (priceMatch) { current.price = `$${priceMatch[1]}`; }
        else { current.bullets.push(bt); }
      } else if (line && !HEADER_RE.test(line)) {
        if (current) { tiers.push(current); current = null; pastTiers = true; }
        closing.push(clean);
      }
    } else if (!inTierSection && !pastTiers) {
      intro.push(clean);
    } else if (pastTiers || (!inTierSection && tiers.length > 0)) {
      closing.push(clean);
    } else {
      intro.push(clean);
    }
  }
  if (current) tiers.push(current);
  return { intro, tiers, closing, raw: text };
}

// ─── Verdict config ───────────────────────────────────────────────────────────

const VERDICT_CONFIG = {
  too_low: {
    bg: "#FEF2F2",
    border: "#FECACA",
    iconBg: "#EF4444",
    label: "Priced Too Low",
    labelColor: "#DC2626",
    emoji: "arrow-down",
    gradient: ["#DC2626", "#B91C1C"] as const,
  },
  fair: {
    bg: "#F0FDF4",
    border: "#86EFAC",
    iconBg: "#16A34A",
    label: "Fair Price",
    labelColor: "#15803D",
    emoji: "check-circle",
    gradient: ["#16A34A", "#15803D"] as const,
  },
  too_high: {
    bg: "#FFFBEB",
    border: "#FCD34D",
    iconBg: "#D97706",
    label: "Priced High",
    labelColor: "#B45309",
    emoji: "arrow-up",
    gradient: ["#D97706", "#B45309"] as const,
  },
};

const MARGIN_RISK_CONFIG = {
  high: { color: "#DC2626", bg: "#FEE2E2", label: "High Risk" },
  medium: { color: "#D97706", bg: "#FEF3C7", label: "Medium Risk" },
  low: { color: "#16A34A", bg: "#DCFCE7", label: "Low Risk" },
};

const TIER_COLORS: Record<string, { bg: string; accent: string; badgeBg: string; badgeText: string; labelBg: string; labelText: string; border: string }> = {
  good:   { bg: "#fff",    accent: "#0ea5e9", badgeBg: "#0ea5e9", badgeText: "#fff", labelBg: "#e0f2fe", labelText: "#0369a1", border: "#bae6fd" },
  better: { bg: "#faf5ff", accent: "#7c3aed", badgeBg: "#7c3aed", badgeText: "#fff", labelBg: "#ede9fe", labelText: "#6d28d9", border: "#7c3aed" },
  best:   { bg: "#fffbeb", accent: "#d97706", badgeBg: "#d97706", badgeText: "#fff", labelBg: "#fde68a", labelText: "#b45309", border: "#fcd34d" },
};

const FREQUENCY_OPTIONS = [
  { value: "one-time", label: "One-Time" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "deep clean", label: "Deep Clean" },
  { value: "move-in/out", label: "Move-In/Out" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuoteDoctorScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { isGrowth, tier } = useSubscription();

  // Mode
  const [activeSection, setActiveSection] = useState<"analyzer" | "optimizer">("analyzer");

  // ── Analyzer state ──
  const [quoteAmount, setQuoteAmount] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [sqft, setSqft] = useState("");
  const [frequency, setFrequency] = useState("one-time");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analyzerError, setAnalyzerError] = useState<string | null>(null);
  const [showFreqPicker, setShowFreqPicker] = useState(false);

  // ── Optimizer state ──
  const [tab, setTab] = useState<"paste" | "upload">("paste");
  const [quoteText, setQuoteText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreviewUri, setImagePreviewUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimized, setOptimized] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  // ── Analyzer logic ──

  const handleAnalyze = async () => {
    setAnalyzerError(null);
    if (!quoteAmount || !bedrooms || !bathrooms) {
      setAnalyzerError("Quote amount, bedrooms, and bathrooms are required.");
      return;
    }
    setAnalyzing(true);
    setAnalysisResult(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(`${API_BASE}/api/quote-doctor/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          quoteAmount: parseFloat(quoteAmount),
          bedrooms: parseInt(bedrooms),
          bathrooms: parseFloat(bathrooms),
          sqft: sqft ? parseInt(sqft) : undefined,
          frequency,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnalyzerError(data.error || "Analysis failed. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      setAnalysisResult(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 400);
    } catch {
      setAnalyzerError("Something went wrong. Check your connection and try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setAnalyzing(false);
  };

  const resetAnalyzer = () => {
    setAnalysisResult(null);
    setAnalyzerError(null);
    setQuoteAmount("");
    setBedrooms("");
    setBathrooms("");
    setSqft("");
    setCity("");
    setState("");
    setFrequency("one-time");
  };

  // ── Optimizer logic ──

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { setError("Photo library access is needed."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      quality: 0.82, base64: true, allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setImagePreviewUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
      setError(null);
    }
  };

  const clearImage = () => { setImageBase64(null); setImagePreviewUri(null); };

  const handleOptimize = async () => {
    setError(null);
    if (tab === "paste" && !quoteText.trim()) { setError("Please paste your quote text."); return; }
    if (tab === "upload" && !imageBase64) { setError("Please select a screenshot first."); return; }
    setLoading(true);
    setOptimized(null);
    setParsed(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const body: Record<string, string> = {};
      if (tab === "paste") body.quoteText = quoteText.trim();
      else { body.imageBase64 = imageBase64!; body.imageMimeType = "image/jpeg"; }

      const res = await fetch(`${API_BASE}/api/quote-doctor/optimize`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      const p = parseProposal(data.optimized);
      setOptimized(data.optimized);
      setParsed(p);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 400);
    } catch {
      setError("Something went wrong. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!optimized) return;
    try { await Clipboard.setStringAsync(optimized); }
    catch { await Share.share({ message: optimized }); }
    setCopied(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!optimized) return;
    await Share.share({ message: optimized, title: "Optimized Cleaning Quote" });
  };

  const handleReset = () => {
    setOptimized(null); setParsed(null);
    setQuoteText(""); clearImage();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // ── Selected freq label ──
  const freqLabel = FREQUENCY_OPTIONS.find(f => f.value === frequency)?.label || "One-Time";

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Frequency picker modal */}
      <Modal visible={showFreqPicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowFreqPicker(false)}>
          <View style={[styles.pickerSheet, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.pickerHandle} />
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Cleaning Frequency</Text>
            {FREQUENCY_OPTIONS.map(opt => (
              <Pressable
                key={opt.value}
                onPress={() => { setFrequency(opt.value); setShowFreqPicker(false); }}
                style={[styles.pickerOption, frequency === opt.value && { backgroundColor: "#EFF6FF" }]}
              >
                <Text style={[styles.pickerOptionText, { color: frequency === opt.value ? "#2563EB" : theme.text }]}>
                  {opt.label}
                </Text>
                {frequency === opt.value && <Feather name="check" size={16} color="#2563EB" />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingTop: headerHeight + 16,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── Section switcher ─── */}
        <View style={[styles.sectionSwitcher, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
          <Pressable
            onPress={() => setActiveSection("analyzer")}
            style={[styles.switcherBtn, activeSection === "analyzer" && styles.switcherBtnActive]}
            testID="button-analyzer-tab"
          >
            <Feather name="activity" size={14} color={activeSection === "analyzer" ? "#2563EB" : theme.textSecondary} />
            <Text style={[styles.switcherLabel, { color: activeSection === "analyzer" ? "#2563EB" : theme.textSecondary, fontWeight: activeSection === "analyzer" ? "700" : "500" }]}>
              Pricing Check
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveSection("optimizer")}
            style={[styles.switcherBtn, activeSection === "optimizer" && styles.switcherBtnActive]}
            testID="button-optimizer-tab"
          >
            <Feather name="zap" size={14} color={activeSection === "optimizer" ? "#2563EB" : theme.textSecondary} />
            <Text style={[styles.switcherLabel, { color: activeSection === "optimizer" ? "#2563EB" : theme.textSecondary, fontWeight: activeSection === "optimizer" ? "700" : "500" }]}>
              Quote Optimizer
            </Text>
          </Pressable>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════════
            ANALYZER SECTION
        ════════════════════════════════════════════════════════════════════════ */}
        {activeSection === "analyzer" && (
          <View style={{ gap: 16 }}>

            {/* Header */}
            <View style={{ alignItems: "center", paddingVertical: 12 }}>
              <View style={styles.featureBadge}>
                <Feather name="activity" size={12} color="#7C3AED" />
                <Text style={styles.featureBadgeText}>AI Pricing Coach</Text>
              </View>
              <Text style={[styles.heroTitle, { color: theme.text }]}>
                Is Your Quote{"\n"}Right for This Market?
              </Text>
              <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
                Enter job details and get an instant verdict — too low, fair, or too high — with market-specific coaching.
              </Text>
            </View>

            {/* ── Gate: non-Growth users see greyed card ── */}
            {!isGrowth ? (
              <View style={styles.gateWrapper}>
                {/* Greyed-out fake form */}
                <View style={[styles.analyzerCard, { backgroundColor: theme.cardBackground, borderColor: theme.border, opacity: 0.45 }]} pointerEvents="none">
                  <View style={styles.formRow}>
                    <View style={[styles.formField, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Quote Amount</Text>
                      <View style={[styles.inputBox, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
                        <Text style={{ color: theme.textSecondary, fontSize: 15, paddingVertical: 13, paddingHorizontal: 14 }}>$000</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.formRow}>
                    <View style={[styles.formField, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Bedrooms</Text>
                      <View style={[styles.inputBox, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
                        <Text style={{ color: theme.textSecondary, fontSize: 15, paddingVertical: 13, paddingHorizontal: 14 }}>3</Text>
                      </View>
                    </View>
                    <View style={[styles.formField, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Bathrooms</Text>
                      <View style={[styles.inputBox, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
                        <Text style={{ color: theme.textSecondary, fontSize: 15, paddingVertical: 13, paddingHorizontal: 14 }}>2</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.lockedBtn, { backgroundColor: "#6B7280" }]}>
                    <Feather name="lock" size={16} color="#fff" />
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Analyze My Quote</Text>
                  </View>
                </View>

                {/* Upgrade overlay */}
                <View style={styles.gateOverlay}>
                  <LinearGradient
                    colors={["#7C3AED", "#4F46E5"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.gateCard}
                  >
                    <View style={styles.gateLockIcon}>
                      <Feather name="lock" size={22} color="#fff" />
                    </View>
                    <Text style={styles.gateTitleText}>Growth Feature</Text>
                    <Text style={styles.gateBodyText}>
                      Quote Doctor's AI Pricing Check is available on the Growth plan and above.
                    </Text>
                    <TouchableOpacity
                      onPress={() => Linking.openURL("https://getquotepro.ai/upgrade")}
                      activeOpacity={0.88}
                      style={styles.gateBtn}
                      testID="button-upgrade-growth"
                    >
                      <Text style={styles.gateBtnText}>Upgrade to Growth — $49/mo</Text>
                      <Feather name="arrow-right" size={15} color="#7C3AED" />
                    </TouchableOpacity>
                    <Text style={styles.gateSubText}>Current plan: {tier.charAt(0).toUpperCase() + tier.slice(1)}</Text>
                  </LinearGradient>
                </View>
              </View>
            ) : (
              /* ── Growth+ user: full form ── */
              <View style={{ gap: 12 }}>
                <View style={[styles.analyzerCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>

                  {/* Quote amount */}
                  <View style={styles.formField}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Quote Amount *</Text>
                    <View style={[styles.inputBox, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
                      <Text style={[styles.currencyPrefix, { color: theme.textSecondary }]}>$</Text>
                      <TextInput
                        value={quoteAmount}
                        onChangeText={setQuoteAmount}
                        placeholder="e.g. 180"
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="decimal-pad"
                        style={[styles.inputText, { color: theme.text }]}
                        testID="input-quote-amount"
                      />
                    </View>
                  </View>

                  {/* Beds / Baths row */}
                  <View style={styles.formRow}>
                    <View style={[styles.formField, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Bedrooms *</Text>
                      <View style={[styles.inputBox, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
                        <TextInput
                          value={bedrooms}
                          onChangeText={setBedrooms}
                          placeholder="3"
                          placeholderTextColor={theme.textSecondary}
                          keyboardType="number-pad"
                          style={[styles.inputText, { color: theme.text }]}
                          testID="input-bedrooms"
                        />
                      </View>
                    </View>
                    <View style={[styles.formField, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Bathrooms *</Text>
                      <View style={[styles.inputBox, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
                        <TextInput
                          value={bathrooms}
                          onChangeText={setBathrooms}
                          placeholder="2"
                          placeholderTextColor={theme.textSecondary}
                          keyboardType="decimal-pad"
                          style={[styles.inputText, { color: theme.text }]}
                          testID="input-bathrooms"
                        />
                      </View>
                    </View>
                  </View>

                  {/* Sqft + Frequency row */}
                  <View style={styles.formRow}>
                    <View style={[styles.formField, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Sq Ft (optional)</Text>
                      <View style={[styles.inputBox, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
                        <TextInput
                          value={sqft}
                          onChangeText={setSqft}
                          placeholder="1400"
                          placeholderTextColor={theme.textSecondary}
                          keyboardType="number-pad"
                          style={[styles.inputText, { color: theme.text }]}
                          testID="input-sqft"
                        />
                      </View>
                    </View>
                    <View style={[styles.formField, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Frequency</Text>
                      <Pressable
                        onPress={() => setShowFreqPicker(true)}
                        style={[styles.inputBox, styles.selectBox, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}
                        testID="button-frequency-picker"
                      >
                        <Text style={[styles.inputText, { color: theme.text }]}>{freqLabel}</Text>
                        <Feather name="chevron-down" size={14} color={theme.textSecondary} />
                      </Pressable>
                    </View>
                  </View>

                  {/* City / State row */}
                  <View style={styles.formRow}>
                    <View style={[styles.formField, { flex: 2 }]}>
                      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>City</Text>
                      <View style={[styles.inputBox, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
                        <TextInput
                          value={city}
                          onChangeText={setCity}
                          placeholder="Austin"
                          placeholderTextColor={theme.textSecondary}
                          style={[styles.inputText, { color: theme.text }]}
                          testID="input-city"
                        />
                      </View>
                    </View>
                    <View style={[styles.formField, { flex: 1 }]}>
                      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>State</Text>
                      <View style={[styles.inputBox, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
                        <TextInput
                          value={state}
                          onChangeText={setState}
                          placeholder="TX"
                          placeholderTextColor={theme.textSecondary}
                          autoCapitalize="characters"
                          maxLength={2}
                          style={[styles.inputText, { color: theme.text }]}
                          testID="input-state"
                        />
                      </View>
                    </View>
                  </View>

                  {analyzerError ? (
                    <View style={styles.errorBox}>
                      <Feather name="alert-circle" size={14} color="#DC2626" />
                      <Text style={{ fontSize: 13, color: "#DC2626", flex: 1, lineHeight: 18 }}>{analyzerError}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    onPress={handleAnalyze}
                    disabled={analyzing}
                    activeOpacity={0.88}
                    style={[styles.analyzeBtn, analyzing && { opacity: 0.7 }]}
                    testID="button-analyze-quote"
                  >
                    {analyzing
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Feather name="activity" size={18} color="#fff" />}
                    <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff" }}>
                      {analyzing ? "Analyzing your quote..." : "Analyze My Quote"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* ── Result card ── */}
                {analysisResult ? (
                  <VerdictCard result={analysisResult} onReset={resetAnalyzer} theme={theme} />
                ) : null}
              </View>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            OPTIMIZER SECTION
        ════════════════════════════════════════════════════════════════════════ */}
        {activeSection === "optimizer" && (
          <View style={{ gap: 16 }}>

            {/* Header */}
            <View style={{ alignItems: "center", paddingVertical: 12 }}>
              <View style={[styles.featureBadge, { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" }]}>
                <Feather name="zap" size={12} color="#15803D" />
                <Text style={[styles.featureBadgeText, { color: "#15803D" }]}>AI Quote Rewriter</Text>
              </View>
              <Text style={[styles.heroTitle, { color: theme.text }]}>
                Rewrite Your Quote{"\n"}to Win More Jobs
              </Text>
              <Text style={[styles.heroSubtitle, { color: theme.textSecondary }]}>
                Paste your current quote or upload a screenshot. Quote Doctor rewrites it to convert better — free.
              </Text>
            </View>

            {/* Input Card */}
            <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              {/* Tabs */}
              <View style={[styles.tabRow, { borderColor: theme.border }]}>
                {(["paste", "upload"] as const).map((t) => (
                  <Pressable key={t} onPress={() => setTab(t)}
                    style={[styles.tabBtn, t === "paste" && { borderRightWidth: 1, borderColor: theme.border }, tab === t ? { backgroundColor: theme.cardBackground } : { backgroundColor: theme.backgroundDefault }]}>
                    <Feather name={t === "paste" ? "file-text" : "upload"} size={14} color={tab === t ? "#2563eb" : theme.textSecondary} />
                    <Text style={[styles.tabLabel, { color: tab === t ? "#2563eb" : theme.textSecondary, fontWeight: tab === t ? "700" : "500" }]}>
                      {t === "paste" ? "Paste Quote" : "Upload Screenshot"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={{ padding: 16, gap: 12 }}>
                {tab === "paste" ? (
                  <TextInput
                    value={quoteText}
                    onChangeText={setQuoteText}
                    placeholder={"Paste your current quote here...\n\nExample:\nHi Sarah,\nYour clean is $180. Let me know.\n- Mike"}
                    placeholderTextColor={theme.textSecondary}
                    multiline numberOfLines={8} textAlignVertical="top"
                    style={[styles.textarea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBackground }]}
                    testID="input-quote-text"
                  />
                ) : (
                  <View>
                    {imagePreviewUri ? (
                      <View style={{ gap: 8 }}>
                        <View style={[styles.imageSelectedBox, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center" }}>
                            <Feather name="image" size={24} color="#2563eb" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: "700", color: theme.text }}>Screenshot selected</Text>
                            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>Ready to optimize</Text>
                          </View>
                          <View style={{ backgroundColor: "#dcfce7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: "#15803d" }}>Ready</Text>
                          </View>
                        </View>
                        <TouchableOpacity onPress={clearImage} style={styles.clearBtn}>
                          <Feather name="x" size={14} color="#dc2626" />
                          <Text style={{ fontSize: 13, fontWeight: "600", color: "#dc2626" }}>Remove image</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={pickImage} activeOpacity={0.8}
                        style={[styles.uploadArea, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
                        <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                          <Feather name="upload" size={26} color="#2563eb" />
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: theme.text, marginBottom: 4 }}>Tap to upload a screenshot</Text>
                        <Text style={{ fontSize: 12.5, color: theme.textSecondary }}>Any quote screenshot from your camera roll</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {error ? (
                  <View style={styles.errorBox}>
                    <Feather name="alert-circle" size={14} color="#dc2626" />
                    <Text style={{ fontSize: 13, color: "#dc2626", flex: 1, lineHeight: 18 }}>{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity onPress={handleOptimize} disabled={loading} activeOpacity={0.88}
                  style={[styles.optimizeBtn, loading && { opacity: 0.7 }]}
                  testID="button-optimize-quote"
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Feather name="zap" size={18} color="#fff" />}
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff" }}>
                    {loading ? "Optimizing your quote..." : "Optimize My Quote — Free"}
                  </Text>
                </TouchableOpacity>

                <Text style={{ fontSize: 12, textAlign: "center", color: theme.textSecondary }}>
                  Takes about 10 seconds. No account needed.
                </Text>
              </View>
            </View>

            {/* Optimizer result */}
            {optimized && parsed ? (
              <View style={{ gap: 12 }}>
                <View style={[styles.successBanner, { borderColor: "#86efac" }]}>
                  <View style={styles.successIcon}>
                    <Feather name="check" size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: "800", color: "#14532d", marginBottom: 2 }}>Quote Optimized</Text>
                    <Text style={{ fontSize: 12, color: "#15803d", lineHeight: 17 }}>Rewritten to build trust, justify pricing, and convert more jobs</Text>
                  </View>
                </View>

                <View style={[styles.proposalCard, { borderColor: theme.border }]}>
                  <LinearGradient
                    colors={["#0f172a", "#1e3a8a", "#2563eb"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.proposalHeader}
                  >
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                      <View style={styles.eyebrow}>
                        <Text style={{ fontSize: 9, fontWeight: "800", color: "rgba(255,255,255,0.85)", letterSpacing: 0.8, textTransform: "uppercase" }}>
                          Cleaning Services Proposal
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: "900", color: "#fff", marginBottom: 14, lineHeight: 26, letterSpacing: -0.3 }}>
                      Your Personalized{"\n"}Cleaning Quote
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {["Licensed & Insured", "Satisfaction Guaranteed", "Valid 7 days"].map((b) => (
                        <View key={b} style={styles.headerPill}>
                          <Text style={{ fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.85)" }}>{b}</Text>
                        </View>
                      ))}
                    </View>
                  </LinearGradient>

                  <View style={[styles.proposalBody, { backgroundColor: "#f8fafc" }]}>
                    {parsed.intro.length > 0 && (
                      <View style={[styles.textBlock, { backgroundColor: "#fff", borderColor: "#e2e8f0", marginBottom: 20 }]}>
                        {parsed.intro.map((line, i) => (
                          <Text key={i} style={{ fontSize: 14.5, lineHeight: 23, color: "#374151", marginBottom: i < parsed.intro.length - 1 ? 10 : 0 }}>
                            {line}
                          </Text>
                        ))}
                      </View>
                    )}

                    {parsed.tiers.length > 0 && (
                      <View>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                          Service Options
                        </Text>
                        {parsed.tiers.map((tier) => {
                          const c = TIER_COLORS[tier.label.toLowerCase()] || TIER_COLORS.good;
                          const isPopular = !!tier.badge;
                          return (
                            <View key={tier.label} style={[
                              styles.tierCard,
                              { backgroundColor: c.bg, borderColor: isPopular ? c.accent : c.border },
                              isPopular && { shadowColor: c.accent, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
                            ]}>
                              {isPopular && (
                                <LinearGradient
                                  colors={[c.accent, "#6d28d9"]}
                                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                  style={styles.popularBadge}
                                >
                                  <Text style={{ fontSize: 8.5, fontWeight: "800", color: "#fff", textTransform: "uppercase", letterSpacing: 0.8 }}>
                                    Most Popular
                                  </Text>
                                </LinearGradient>
                              )}
                              <View style={styles.tierTop}>
                                <View style={{ flex: 1, marginRight: 12 }}>
                                  <View style={[styles.tierLabel, { backgroundColor: c.labelBg }]}>
                                    <Text style={{ fontSize: 9.5, fontWeight: "800", color: c.labelText, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                      {tier.label}
                                    </Text>
                                  </View>
                                  <Text style={{ fontSize: 15.5, fontWeight: "800", color: "#111827", marginTop: 6 }}>
                                    {tier.title}
                                  </Text>
                                </View>
                                {tier.price && (
                                  <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
                                    <Text style={{ fontSize: 22, fontWeight: "900", color: c.labelText, lineHeight: 26 }}>
                                      {tier.price}
                                    </Text>
                                  </View>
                                )}
                              </View>
                              {tier.bullets.map((b, i) => (
                                <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 8 }}>
                                  <Text style={{ color: c.accent, fontWeight: "800", fontSize: 13, marginTop: 1 }}>✓</Text>
                                  <Text style={{ fontSize: 13.5, color: "#374151", lineHeight: 21, flex: 1 }}>{b}</Text>
                                </View>
                              ))}
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {parsed.closing.length > 0 && (
                      <View style={[styles.textBlock, { backgroundColor: "#fff", borderColor: "#e2e8f0", marginTop: 16, marginBottom: 0 }]}>
                        {parsed.closing.map((line, i) => (
                          <Text key={i} style={{ fontSize: 14.5, lineHeight: 23, color: "#374151", marginBottom: i < parsed.closing.length - 1 ? 10 : 0 }}>
                            {line}
                          </Text>
                        ))}
                      </View>
                    )}

                    {!parsed.tiers.length && !parsed.intro.length && !parsed.closing.length && (
                      <View style={[styles.textBlock, { backgroundColor: "#fff", borderColor: "#e2e8f0" }]}>
                        <Text style={{ fontSize: 14, lineHeight: 22, color: "#374151" }}>{parsed.raw}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.proposalFooter}>
                    <Text style={{ fontSize: 13, color: "#374151", textAlign: "center", fontWeight: "600" }}>
                      Ready to book? Reply to this proposal to get started.
                    </Text>
                    <View style={{ flexDirection: "row", justifyContent: "center", gap: 20, marginTop: 10 }}>
                      {["Fully Insured", "Background Checked", "Satisfaction Guarantee"].map(t => (
                        <Text key={t} style={{ fontSize: 10.5, fontWeight: "700", color: "#059669" }}>✓ {t}</Text>
                      ))}
                    </View>
                  </View>
                </View>

                <TouchableOpacity onPress={handleCopy} activeOpacity={0.85} style={styles.copyBtn}>
                  <Feather name={copied ? "check" : "copy"} size={16} color="#fff" />
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>
                    {copied ? "Copied!" : "Copy Quote Text"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleShare} activeOpacity={0.85}
                  style={[styles.shareBtn, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
                  <Feather name="share-2" size={16} color={theme.text} />
                  <Text style={{ fontSize: 15, fontWeight: "600", color: theme.text }}>Share Quote</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleReset} activeOpacity={0.7} style={{ alignItems: "center", paddingVertical: 8 }}>
                  <Text style={{ fontSize: 13, textDecorationLine: "underline", color: theme.textSecondary }}>Optimize another quote</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Verdict Card Component ────────────────────────────────────────────────────

function VerdictCard({ result, onReset, theme }: { result: AnalysisResult; onReset: () => void; theme: any }) {
  const cfg = VERDICT_CONFIG[result.verdict];
  const marginCfg = MARGIN_RISK_CONFIG[result.margin_risk];

  const verdictLabel = {
    too_low: "Your Quote Is Too Low",
    fair: "Your Quote Is Fair",
    too_high: "Your Quote Seems High",
  }[result.verdict];

  const verdictSubtext = {
    too_low: "You may be leaving money on the table or signaling low quality.",
    fair: "You're in the right range for this market and job size.",
    too_high: "This could cause sticker shock — consider your positioning.",
  }[result.verdict];

  return (
    <View style={{ gap: 12 }}>
      {/* Main verdict card */}
      <View style={[styles.verdictCard, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
        {/* Gradient banner */}
        <LinearGradient
          colors={cfg.gradient}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.verdictBanner}
        >
          <View style={styles.verdictBannerLeft}>
            <View style={styles.verdictIconCircle}>
              <Feather name={cfg.emoji as any} size={20} color="#fff" />
            </View>
            <View>
              <Text style={styles.verdictBannerLabel}>{cfg.label}</Text>
              <Text style={styles.verdictBannerSub}>Pricing Analysis</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Body */}
        <View style={styles.verdictBody}>
          <Text style={[styles.verdictMainText, { color: cfg.labelColor }]}>{verdictLabel}</Text>
          <Text style={[styles.verdictSubText, { color: "#4B5563" }]}>{verdictSubtext}</Text>

          {/* Suggested range */}
          {(result.suggested_range_low > 0 || result.suggested_range_high > 0) ? (
            <View style={[styles.rangeBox, { backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" }]}>
              <Text style={styles.rangeLabel}>Market Rate for This Job</Text>
              <Text style={[styles.rangeValue, { color: "#111827" }]}>
                ${result.suggested_range_low} – ${result.suggested_range_high}
              </Text>
              <Text style={styles.rangeCaption}>Typical range for this market, size, and frequency</Text>
            </View>
          ) : null}

          {/* Margin risk chip */}
          <View style={styles.riskRow}>
            <Text style={[styles.riskLabel, { color: "#6B7280" }]}>Margin Risk:</Text>
            <View style={[styles.riskChip, { backgroundColor: marginCfg.bg }]}>
              <Text style={[styles.riskChipText, { color: marginCfg.color }]}>{marginCfg.label}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Coaching note */}
      {result.coaching_note ? (
        <View style={styles.coachingCard}>
          <View style={styles.coachingHeader}>
            <View style={styles.coachingIconBox}>
              <Feather name="message-circle" size={16} color="#7C3AED" />
            </View>
            <Text style={styles.coachingHeaderText}>Coach's Advice</Text>
          </View>
          <Text style={styles.coachingNote} testID="text-coaching-note">{result.coaching_note}</Text>
        </View>
      ) : null}

      {/* Reset */}
      <TouchableOpacity onPress={onReset} activeOpacity={0.7} style={{ alignItems: "center", paddingVertical: 8 }}>
        <Text style={{ fontSize: 13, textDecorationLine: "underline", color: "#6B7280" }}>Check another quote</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Section switcher
  sectionSwitcher: { flexDirection: "row", borderRadius: 14, borderWidth: 1, overflow: "hidden", marginBottom: 4 },
  switcherBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  switcherBtnActive: { backgroundColor: "#EFF6FF" },
  switcherLabel: { fontSize: 13.5 },

  // Feature badge
  featureBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#EDE9FE", borderWidth: 1, borderColor: "#C4B5FD", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 14 },
  featureBadgeText: { fontSize: 12, fontWeight: "700", color: "#7C3AED" },

  // Hero
  heroTitle: { fontSize: 28, fontWeight: "900", textAlign: "center", lineHeight: 36, marginBottom: 10, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 14.5, textAlign: "center", lineHeight: 22, paddingHorizontal: 8 },

  // Analyzer card
  analyzerCard: { borderRadius: 18, borderWidth: 1.5, padding: 18, gap: 12 },
  formRow: { flexDirection: "row", gap: 10 },
  formField: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginLeft: 2 },
  inputBox: { borderWidth: 1.5, borderRadius: 12, flexDirection: "row", alignItems: "center", paddingHorizontal: 14 },
  selectBox: { justifyContent: "space-between", paddingVertical: 0 },
  currencyPrefix: { fontSize: 15, marginRight: 2, paddingVertical: 13 },
  inputText: { flex: 1, fontSize: 15, paddingVertical: 13 },
  analyzeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 17, backgroundColor: "#7C3AED", marginTop: 4 },
  lockedBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 17, marginTop: 4 },

  // Gate
  gateWrapper: { position: "relative" },
  gateOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", padding: 20 },
  gateCard: { borderRadius: 22, padding: 28, alignItems: "center", width: "100%", gap: 10 },
  gateLockIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  gateTitleText: { fontSize: 19, fontWeight: "900", color: "#fff", letterSpacing: -0.3 },
  gateBodyText: { fontSize: 14, color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 21 },
  gateBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, marginTop: 8 },
  gateBtnText: { fontSize: 14.5, fontWeight: "800", color: "#7C3AED" },
  gateSubText: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4 },

  // Verdict card
  verdictCard: { borderRadius: 18, borderWidth: 1.5, overflow: "hidden" },
  verdictBanner: { padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  verdictBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  verdictIconCircle: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  verdictBannerLabel: { fontSize: 15, fontWeight: "800", color: "#fff" },
  verdictBannerSub: { fontSize: 11.5, color: "rgba(255,255,255,0.75)", marginTop: 1 },
  verdictBody: { padding: 18, gap: 12 },
  verdictMainText: { fontSize: 17, fontWeight: "800", lineHeight: 24 },
  verdictSubText: { fontSize: 13.5, lineHeight: 21 },
  rangeBox: { borderRadius: 12, borderWidth: 1, padding: 14, alignItems: "center", gap: 4 },
  rangeLabel: { fontSize: 11, fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5 },
  rangeValue: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  rangeCaption: { fontSize: 11.5, color: "#9CA3AF", textAlign: "center" },
  riskRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  riskLabel: { fontSize: 13, fontWeight: "600" },
  riskChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  riskChipText: { fontSize: 12.5, fontWeight: "700" },

  // Coaching card
  coachingCard: { backgroundColor: "#FAF5FF", borderRadius: 16, borderWidth: 1.5, borderColor: "#DDD6FE", padding: 18, gap: 12 },
  coachingHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  coachingIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center" },
  coachingHeaderText: { fontSize: 14, fontWeight: "700", color: "#6D28D9" },
  coachingNote: { fontSize: 14.5, lineHeight: 23, color: "#374151" },

  // Modal picker
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  pickerSheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 34, paddingTop: 14 },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB", alignSelf: "center", marginBottom: 16 },
  pickerTitle: { fontSize: 15, fontWeight: "700", paddingHorizontal: 20, marginBottom: 8 },
  pickerOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 20, borderRadius: 0 },
  pickerOptionText: { fontSize: 15 },

  // Optimizer (existing)
  card: { borderRadius: 18, borderWidth: 1.5, overflow: "hidden" },
  tabRow: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14 },
  tabLabel: { fontSize: 13 },
  textarea: { borderWidth: 1.5, borderRadius: 14, padding: 14, fontSize: 14, lineHeight: 22, minHeight: 160 },
  imageSelectedBox: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderRadius: 14, padding: 14 },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#fee2e2" },
  uploadArea: { borderWidth: 2, borderStyle: "dashed", borderRadius: 14, padding: 40, alignItems: "center" },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#fee2e2", borderRadius: 12, padding: 12 },
  optimizeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, paddingVertical: 18, backgroundColor: "#16a34a" },
  successBanner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#f0fdf4", borderRadius: 14, padding: 14, borderWidth: 1.5 },
  successIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#16a34a", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  proposalCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  proposalHeader: { padding: 24 },
  eyebrow: { backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 100, paddingHorizontal: 12, paddingVertical: 4 },
  headerPill: { backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  proposalBody: { padding: 20 },
  textBlock: { borderRadius: 14, padding: 18, borderWidth: 1 },
  tierCard: { borderRadius: 14, borderWidth: 2, padding: 18, marginBottom: 10, position: "relative", overflow: "hidden" },
  tierTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  tierLabel: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100 },
  popularBadge: { position: "absolute", top: 0, right: 0, paddingHorizontal: 12, paddingVertical: 5, borderBottomLeftRadius: 10 },
  proposalFooter: { backgroundColor: "#f0fdf4", borderTopWidth: 2, borderColor: "#bbf7d0", padding: 18 },
  copyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#0f172a", borderRadius: 16, paddingVertical: 18 },
  shareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1.5, borderRadius: 16, paddingVertical: 16 },
});
