import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Pressable, Share,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { useTheme } from "@/hooks/useTheme";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:5000";

// ─── Parser (shared logic with web) ───────────────────────────────────────────
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

// ─── Tier color config ─────────────────────────────────────────────────────────
const TIER_COLORS: Record<string, { bg: string; accent: string; badgeBg: string; badgeText: string; labelBg: string; labelText: string; border: string }> = {
  good:   { bg: "#fff",    accent: "#0ea5e9", badgeBg: "#0ea5e9", badgeText: "#fff", labelBg: "#e0f2fe", labelText: "#0369a1", border: "#bae6fd" },
  better: { bg: "#faf5ff", accent: "#7c3aed", badgeBg: "#7c3aed", badgeText: "#fff", labelBg: "#ede9fe", labelText: "#6d28d9", border: "#7c3aed" },
  best:   { bg: "#fffbeb", accent: "#d97706", badgeBg: "#d97706", badgeText: "#fff", labelBg: "#fde68a", labelText: "#b45309", border: "#fcd34d" },
};

export default function QuoteDoctorScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();

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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { setError("Photo library access is needed to upload a screenshot."); return; }
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
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingTop: headerHeight + 16, paddingBottom: tabBarHeight + 40, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={{ alignItems: "center", paddingBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#d1fae5", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginBottom: 18, borderWidth: 1, borderColor: "#6ee7b7" }}>
            <Feather name="zap" size={13} color="#059669" />
            <Text style={{ fontSize: 12.5, fontWeight: "700", color: "#065f46" }}>Free AI Tool — No Account Needed</Text>
          </View>
          <Text style={{ fontSize: 30, fontWeight: "900", textAlign: "center", lineHeight: 36, marginBottom: 12, letterSpacing: -0.5, color: theme.text }}>
            Is Your Quote{"\n"}Losing You Jobs?
          </Text>
          <Text style={{ fontSize: 15, textAlign: "center", lineHeight: 23, color: theme.textSecondary, paddingHorizontal: 8 }}>
            Paste your quote or upload a screenshot. Quote Doctor rewrites it to win more jobs — free, in seconds.
          </Text>
        </View>

        {/* Input Card */}
        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border, marginBottom: 16 }]}>
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
              style={[styles.optimizeBtn, loading && { opacity: 0.7 }]}>
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

        {/* ─── Result ─── */}
        {optimized && parsed ? (
          <View style={{ gap: 12 }}>

            {/* Success banner */}
            <View style={[styles.successBanner, { borderColor: "#86efac" }]}>
              <View style={styles.successIcon}>
                <Feather name="check" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, fontWeight: "800", color: "#14532d", marginBottom: 2 }}>Quote Optimized</Text>
                <Text style={{ fontSize: 12, color: "#15803d", lineHeight: 17 }}>Rewritten to build trust, justify pricing, and convert more jobs</Text>
              </View>
            </View>

            {/* Proposal Card */}
            <View style={[styles.proposalCard, { borderColor: theme.border }]}>
              {/* Gradient header */}
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
                  {["✓ Licensed & Insured", "✓ Satisfaction Guaranteed", "Valid 7 days"].map((b) => (
                    <View key={b} style={styles.headerPill}>
                      <Text style={{ fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.85)" }}>{b}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>

              {/* Body */}
              <View style={[styles.proposalBody, { backgroundColor: "#f8fafc" }]}>
                {/* Intro */}
                {parsed.intro.length > 0 && (
                  <View style={[styles.textBlock, { backgroundColor: "#fff", borderColor: "#e2e8f0", marginBottom: 20 }]}>
                    {parsed.intro.map((line, i) => (
                      <Text key={i} style={{ fontSize: 14.5, lineHeight: 23, color: "#374151", marginBottom: i < parsed.intro.length - 1 ? 10 : 0 }}>
                        {line}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Pricing tiers */}
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

                {/* Closing */}
                {parsed.closing.length > 0 && (
                  <View style={[styles.textBlock, { backgroundColor: "#fff", borderColor: "#e2e8f0", marginTop: 16, marginBottom: 0 }]}>
                    {parsed.closing.map((line, i) => (
                      <Text key={i} style={{ fontSize: 14.5, lineHeight: 23, color: "#374151", marginBottom: i < parsed.closing.length - 1 ? 10 : 0 }}>
                        {line}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Fallback */}
                {!parsed.tiers.length && !parsed.intro.length && !parsed.closing.length && (
                  <View style={[styles.textBlock, { backgroundColor: "#fff", borderColor: "#e2e8f0" }]}>
                    <Text style={{ fontSize: 14, lineHeight: 22, color: "#374151" }}>{parsed.raw}</Text>
                  </View>
                )}
              </View>

              {/* Footer strip */}
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

            {/* Action buttons */}
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

            {/* CTA */}
            <LinearGradient
              colors={["#0f172a", "#1e3a8a", "#2563eb"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.ctaCard}
            >
              <Text style={{ fontSize: 17, fontWeight: "900", color: "#fff", textAlign: "center", marginBottom: 8, lineHeight: 24 }}>
                QuotePro sends quotes like this automatically
              </Text>
              <Text style={{ fontSize: 13.5, color: "rgba(147,197,253,0.9)", textAlign: "center", lineHeight: 21, marginBottom: 20 }}>
                Beautiful proposals, auto follow-up, built-in CRM — from your phone in 60 seconds.
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL("https://getquotepro.ai/register")}
                activeOpacity={0.88}
                style={styles.trialBtn}
              >
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#fff" }}>Start My Free 7-Day Trial</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </TouchableOpacity>
              <Text style={{ fontSize: 11.5, color: "rgba(148,163,184,0.7)", textAlign: "center", marginTop: 10 }}>
                No credit card required. Cancel anytime.
              </Text>
            </LinearGradient>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  ctaCard: { borderRadius: 20, padding: 28 },
  trialBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#16a34a", borderRadius: 14, paddingVertical: 16, paddingHorizontal: 24 },
});
