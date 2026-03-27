import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Pressable, ActivityIndicator, Clipboard,
  KeyboardAvoidingView, Platform, Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest } from "@/lib/query-client";
import { getApiUrl } from "@/lib/query-client";

const FREE_LIMIT = 3;

interface OptimizeResult {
  optimized: string;
  improvements: string[];
  usesCount: number;
  remaining: number;
}

function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Feather name="check-circle" size={12} color="#059669" />
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export default function QuoteDoctorScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();

  const [quoteText, setQuoteText] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleOptimize = async () => {
    setError(null);
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (!quoteText.trim()) { setError("Please paste your quote text."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address."); return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const data = await apiRequest("POST", "/api/quote-doctor/optimize", {
        email: email.trim(),
        quoteText: quoteText.trim(),
      }) as OptimizeResult;
      setResult(data);
      setRemaining(data.remaining);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (e: any) {
      if (e?.message === "limit_reached" || e?.status === 429) {
        setLimitReached(true);
      } else {
        setError(e?.message || "Something went wrong. Please try again.");
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setLoading(false);
  };

  const copyOptimized = () => {
    if (!result?.optimized) return;
    Clipboard.setString(result.optimized);
    setCopied(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyShareLink = () => {
    Clipboard.setString("https://getquotepro.ai/quote-doctor");
    setLinkCopied(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const openSignup = () => {
    Linking.openURL("https://getquotepro.ai/register").catch(() => {});
  };

  const isDark = theme.backgroundDefault === "#000000" || theme.backgroundDefault?.includes("1a") || false;
  const cardBg = isDark ? "#1e1e1e" : "#ffffff";
  const borderColor = isDark ? "#333" : "#e2e8f0";
  const mutedText = isDark ? "#94a3b8" : "#64748b";

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: headerHeight + 16, paddingBottom: tabBarHeight + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Feather name="zap" size={13} color="#059669" />
            <Text style={styles.heroBadgeText}>Free AI Tool</Text>
          </View>
          <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>
            Is Your Quote{"\n"}Losing You Jobs?
          </Text>
          <Text style={[styles.heroSub, { color: mutedText }]}>
            Paste your current quote below. Quote Doctor will rewrite it to convert more jobs — free, in seconds.
          </Text>
          {remaining !== null ? (
            <Text style={styles.usageText}>
              {remaining > 0
                ? `${remaining} free optimization${remaining !== 1 ? "s" : ""} remaining`
                : "All 3 free optimizations used"}
            </Text>
          ) : (
            <Text style={[styles.usageText, { color: mutedText }]}>3 free optimizations · no credit card ever</Text>
          )}
        </View>

        {/* Input Card */}
        {!limitReached && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.cardLabel, { color: mutedText }]}>Paste Your Quote</Text>
            <TextInput
              value={quoteText}
              onChangeText={setQuoteText}
              placeholder={'E.g. "Hi Sarah, your quote for a 3-bed clean is $180. Let me know. Thanks, Mike"'}
              placeholderTextColor={mutedText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={[styles.quoteInput, { color: theme.textPrimary, borderColor, backgroundColor: isDark ? "#111" : "#f8fafc" }]}
            />

            <Text style={[styles.cardLabel, { color: mutedText, marginTop: 12 }]}>Your Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Where should we send your optimized quote?"
              placeholderTextColor={mutedText}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.emailInput, { color: theme.textPrimary, borderColor, backgroundColor: isDark ? "#111" : "#f8fafc" }]}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleOptimize}
              disabled={loading}
              activeOpacity={0.85}
              style={[styles.optimizeBtn, loading && { opacity: 0.7 }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Feather name="zap" size={18} color="#fff" />
              )}
              <Text style={styles.optimizeBtnText}>
                {loading ? "Optimizing..." : "Optimize My Quote ⚡"}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.noCard, { color: mutedText }]}>
              Takes 10 seconds. No credit card. Ever.
            </Text>
          </View>
        )}

        {/* Limit Reached */}
        {limitReached && (
          <View style={[styles.card, styles.limitCard, { backgroundColor: "#fffbeb", borderColor: "#fcd34d" }]}>
            <Text style={styles.limitEmoji}>⚡</Text>
            <Text style={styles.limitTitle}>You've Used All 3 Free Optimizations</Text>
            <Text style={[styles.limitSub, { color: mutedText }]}>
              Start your free trial to get unlimited Quote Doctor access plus the full QuotePro AI platform.
            </Text>
            <TouchableOpacity onPress={openSignup} style={styles.trialBtn} activeOpacity={0.85}>
              <Text style={styles.trialBtnText}>Start My Free 7-Day Trial</Text>
              <Feather name="arrow-right" size={16} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.noCard, { color: mutedText }]}>No credit card required. Cancel anytime.</Text>
          </View>
        )}

        {/* Results */}
        {result && (
          <View style={styles.resultsSection}>
            {/* Original */}
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
              <Text style={[styles.resultLabel, { color: mutedText }]}>Your Original Quote</Text>
              <Text style={[styles.originalText, { color: mutedText }]}>{quoteText}</Text>
            </View>

            {/* Optimized */}
            <View style={[styles.card, styles.optimizedCard, { backgroundColor: isDark ? "#0d2b1e" : "#f0fdf4", borderColor: "#34d399" }]}>
              <View style={styles.optimizedHeader}>
                <Text style={styles.optimizedLabel}>Optimized Version ✓</Text>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>AI Enhanced</Text>
                </View>
              </View>
              <Text style={[styles.optimizedText, { color: theme.textPrimary }]}>{result.optimized}</Text>
            </View>

            {/* Improvement Badges */}
            <View style={styles.badgesWrap}>
              {result.improvements.map((imp, i) => (
                <Badge key={i} label={imp} />
              ))}
            </View>

            {/* Action Buttons */}
            <TouchableOpacity onPress={copyOptimized} style={styles.copyBtn} activeOpacity={0.85}>
              <Feather name={copied ? "check" : "copy"} size={18} color="#fff" />
              <Text style={styles.copyBtnText}>{copied ? "Copied!" : "Copy Optimized Quote"}</Text>
            </TouchableOpacity>

            {/* Conversion CTA */}
            <View style={[styles.card, styles.ctaCard, { borderColor: "#34d399" }]}>
              <Text style={styles.ctaTitle}>⚡ QuotePro sends quotes like this automatically</Text>
              <Text style={[styles.ctaSub, { color: mutedText }]}>
                In 60 seconds, from your phone, with built-in follow-up so you never lose a lead.
              </Text>
              <TouchableOpacity onPress={openSignup} style={styles.trialBtn} activeOpacity={0.85}>
                <Text style={styles.trialBtnText}>Start My Free 7-Day Trial</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </TouchableOpacity>
              <Text style={[styles.noCard, { color: mutedText }]}>No credit card required. Cancel anytime.</Text>
            </View>

            {/* Share */}
            <View style={styles.shareSection}>
              <Text style={[styles.shareText, { color: mutedText }]}>
                Know another cleaning business owner with a weak quote? Share Quote Doctor:
              </Text>
              <TouchableOpacity onPress={copyShareLink} style={[styles.shareBtn, { borderColor }]} activeOpacity={0.8}>
                <Feather name="share-2" size={15} color={theme.primary} />
                <Text style={[styles.shareBtnText, { color: theme.primary }]}>
                  {linkCopied ? "Link copied!" : "Copy Share Link"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  hero: { alignItems: "center", paddingBottom: 20 },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#d1fae5", paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, marginBottom: 16,
  },
  heroBadgeText: { fontSize: 13, fontWeight: "600", color: "#059669" },
  heroTitle: { fontSize: 30, fontWeight: "800", textAlign: "center", lineHeight: 36, marginBottom: 12, letterSpacing: -0.5 },
  heroSub: { fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 8 },
  usageText: { fontSize: 13, fontWeight: "600", color: "#d97706", textAlign: "center" },
  card: {
    borderRadius: 16, borderWidth: 1.5, padding: 16, marginBottom: 12,
  },
  cardLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  quoteInput: {
    borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14,
    lineHeight: 20, minHeight: 140,
  },
  emailInput: {
    borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 46,
  },
  errorBox: { backgroundColor: "#fee2e2", borderRadius: 10, padding: 12, marginTop: 8 },
  errorText: { fontSize: 13, color: "#dc2626" },
  optimizeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, backgroundColor: "#10b981", borderRadius: 14,
    paddingVertical: 17, marginTop: 14,
  },
  optimizeBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  noCard: { fontSize: 12, textAlign: "center", marginTop: 8 },
  limitCard: { alignItems: "center", gap: 8 },
  limitEmoji: { fontSize: 40, marginBottom: 4 },
  limitTitle: { fontSize: 18, fontWeight: "700", color: "#92400e", textAlign: "center" },
  limitSub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  trialBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#10b981", borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 24, marginTop: 8, width: "100%",
  },
  trialBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  resultsSection: { gap: 0 },
  resultLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  originalText: { fontSize: 13, lineHeight: 20 },
  optimizedCard: { borderWidth: 2 },
  optimizedHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  optimizedLabel: { fontSize: 11, fontWeight: "700", color: "#059669", textTransform: "uppercase", letterSpacing: 0.5 },
  aiBadge: { backgroundColor: "#d1fae5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  aiBadgeText: { fontSize: 10, fontWeight: "700", color: "#059669" },
  optimizedText: { fontSize: 13, lineHeight: 21, fontWeight: "500" },
  badgesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 12 },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#ecfdf5", borderWidth: 1, borderColor: "#a7f3d0",
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  badgeText: { fontSize: 12, fontWeight: "500", color: "#059669" },
  copyBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, backgroundColor: "#0f172a", borderRadius: 14,
    paddingVertical: 17, marginBottom: 12,
  },
  copyBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  ctaCard: { backgroundColor: "#f0fdf4", borderWidth: 2, alignItems: "center" },
  ctaTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", textAlign: "center", marginBottom: 6 },
  ctaSub: { fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 12 },
  shareSection: { alignItems: "center", paddingVertical: 20 },
  shareText: { fontSize: 13, textAlign: "center", marginBottom: 12, lineHeight: 19 },
  shareBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12,
  },
  shareBtnText: { fontSize: 14, fontWeight: "600" },
});
