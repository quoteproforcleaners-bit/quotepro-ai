import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Pressable, Share,
  KeyboardAvoidingView, Platform,
} from "react-native";
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

export default function QuoteDoctorScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();

  const [tab, setTab] = useState<"paste" | "upload">("paste");
  const [quoteText, setQuoteText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreviewUri, setImagePreviewUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimized, setOptimized] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const isDark = theme.backgroundDefault === "#000000" || (theme.backgroundDefault || "").includes("1a");
  const cardBg = isDark ? "#1e1e1e" : "#ffffff";
  const borderColor = isDark ? "#333" : "#e2e8f0";
  const mutedText = isDark ? "#94a3b8" : "#64748b";
  const inputBg = isDark ? "#111" : "#f8fafc";

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError("Photo library access is needed to upload a screenshot.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
      base64: true,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImagePreviewUri(asset.uri);
      setImageBase64(asset.base64 ?? null);
      setError(null);
    }
  };

  const clearImage = () => {
    setImageBase64(null);
    setImagePreviewUri(null);
  };

  const handleOptimize = async () => {
    setError(null);
    if (tab === "paste" && !quoteText.trim()) { setError("Please paste your quote text."); return; }
    if (tab === "upload" && !imageBase64) { setError("Please select a screenshot first."); return; }
    setLoading(true);
    setOptimized(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const body: Record<string, string> = {};
      if (tab === "paste") body.quoteText = quoteText.trim();
      else { body.imageBase64 = imageBase64!; body.imageMimeType = "image/jpeg"; }

      const res = await fetch(`${API_BASE}/api/quote-doctor/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setOptimized(data.optimized);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch {
      setError("Something went wrong. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!optimized) return;
    try {
      await Clipboard.setStringAsync(optimized);
    } catch {
      await Share.share({ message: optimized });
    }
    setCopied(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!optimized) return;
    await Share.share({ message: optimized, title: "Optimized Cleaning Quote" });
  };

  const handleReset = () => {
    setOptimized(null);
    setQuoteText("");
    clearImage();
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
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: headerHeight + 16, paddingBottom: tabBarHeight + 28 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.freeBadge}>
            <Feather name="zap" size={13} color="#059669" />
            <Text style={styles.freeBadgeText}>Free AI Tool</Text>
          </View>
          <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>
            Is Your Quote{"\n"}Losing You Jobs?
          </Text>
          <Text style={[styles.heroSub, { color: mutedText }]}>
            Paste your quote or upload a screenshot. Quote Doctor rewrites it to win more jobs — free, in seconds.
          </Text>
          <Text style={[styles.noAccount, { color: mutedText }]}>
            No account needed. No credit card. Ever.
          </Text>
        </View>

        {/* Input Card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          {/* Tab selector */}
          <View style={[styles.tabRow, { borderColor }]}>
            {(["paste", "upload"] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={[
                  styles.tabBtn,
                  tab === t && styles.tabBtnActive,
                  t === "paste" && { borderRightWidth: 1, borderColor },
                ]}
              >
                <Feather name={t === "paste" ? "file-text" : "upload"} size={14} color={tab === t ? "#059669" : mutedText} />
                <Text style={[styles.tabLabel, { color: tab === t ? "#059669" : mutedText }, tab === t && styles.tabLabelActive]}>
                  {t === "paste" ? "Paste Quote" : "Upload Screenshot"}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.inputArea}>
            {tab === "paste" ? (
              <TextInput
                value={quoteText}
                onChangeText={setQuoteText}
                placeholder={"Paste your current quote here...\n\nExample:\nHi Sarah,\nYour clean is $180. Let me know.\n- Mike"}
                placeholderTextColor={mutedText}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                style={[styles.textarea, { color: theme.textPrimary, borderColor, backgroundColor: inputBg }]}
              />
            ) : (
              <View>
                {imagePreviewUri ? (
                  <View style={styles.imagePreviewWrap}>
                    <View style={[styles.imagePlaceholder, { backgroundColor: inputBg, borderColor }]}>
                      <Feather name="image" size={32} color="#059669" />
                      <Text style={[styles.imageName, { color: theme.textPrimary }]}>Screenshot selected</Text>
                      <Text style={[styles.imageHint, { color: mutedText }]}>Ready to optimize</Text>
                    </View>
                    <TouchableOpacity onPress={clearImage} style={styles.clearImageBtn} activeOpacity={0.8}>
                      <Feather name="x" size={16} color="#dc2626" />
                      <Text style={styles.clearImageText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={pickImage}
                    activeOpacity={0.8}
                    style={[styles.uploadArea, { borderColor: borderColor, backgroundColor: inputBg }]}
                  >
                    <View style={styles.uploadIcon}>
                      <Feather name="upload" size={24} color="#059669" />
                    </View>
                    <Text style={[styles.uploadTitle, { color: theme.textPrimary }]}>Tap to upload a screenshot</Text>
                    <Text style={[styles.uploadHint, { color: mutedText }]}>Any quote screenshot from your camera roll</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {error ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleOptimize}
              disabled={loading}
              activeOpacity={0.85}
              style={[styles.optimizeBtn, loading && { opacity: 0.7 }]}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Feather name="zap" size={18} color="#fff" />}
              <Text style={styles.optimizeBtnText}>
                {loading ? "Optimizing..." : "Optimize My Quote"}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.disclaimer, { color: mutedText }]}>
              Takes about 10 seconds. No account needed. No credit card. Ever.
            </Text>
          </View>
        </View>

        {/* Result */}
        {optimized ? (
          <View style={styles.resultSection}>
            {/* Optimized output */}
            <View style={[styles.card, styles.resultCard, { backgroundColor: isDark ? "#0d2b1e" : "#f0fdf4", borderColor: "#34d399" }]}>
              <View style={styles.resultHeader}>
                <View style={styles.resultHeaderLeft}>
                  <Feather name="check-circle" size={15} color="#059669" />
                  <Text style={styles.resultLabel}>Optimized Version</Text>
                </View>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>AI Enhanced</Text>
                </View>
              </View>
              <Text style={[styles.resultText, { color: theme.textPrimary }]}>{optimized}</Text>
            </View>

            {/* Action buttons */}
            <TouchableOpacity onPress={handleCopy} activeOpacity={0.85} style={styles.copyBtn}>
              <Feather name={copied ? "check" : "copy"} size={17} color="#fff" />
              <Text style={styles.copyBtnText}>{copied ? "Copied!" : "Copy Quote"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleShare} activeOpacity={0.85}
              style={[styles.shareBtn, { borderColor, backgroundColor: cardBg }]}>
              <Feather name="share-2" size={17} color={theme.textPrimary} />
              <Text style={[styles.shareBtnText, { color: theme.textPrimary }]}>Share Quote</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleReset} activeOpacity={0.7} style={styles.resetBtn}>
              <Text style={[styles.resetText, { color: mutedText }]}>Optimize another quote</Text>
            </TouchableOpacity>

            {/* CTA */}
            <View style={[styles.card, styles.ctaCard, { backgroundColor: isDark ? "#0d2b1e" : "#f0fdf4", borderColor: "#34d399" }]}>
              <Text style={[styles.ctaTitle, { color: theme.textPrimary }]}>
                QuotePro sends quotes like this automatically
              </Text>
              <Text style={[styles.ctaSub, { color: mutedText }]}>
                In 60 seconds, from your phone, with built-in follow-up so you never lose a job to a faster competitor.
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL("https://getquotepro.ai/register")}
                style={styles.trialBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.trialBtnText}>Start My Free 7-Day Trial</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </TouchableOpacity>
              <Text style={[styles.noAccount, { color: mutedText }]}>No credit card required. Cancel anytime.</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  hero: { alignItems: "center", paddingBottom: 20 },
  freeBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#d1fae5", paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, marginBottom: 16,
  },
  freeBadgeText: { fontSize: 13, fontWeight: "600", color: "#059669" },
  heroTitle: {
    fontSize: 30, fontWeight: "800", textAlign: "center",
    lineHeight: 36, marginBottom: 12, letterSpacing: -0.5,
  },
  heroSub: { fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 6 },
  noAccount: { fontSize: 12, textAlign: "center" },
  card: { borderRadius: 16, borderWidth: 1.5, marginBottom: 12, overflow: "hidden" },
  tabRow: {
    flexDirection: "row", borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 13, backgroundColor: "#f8fafc",
  },
  tabBtnActive: { backgroundColor: "#ffffff" },
  tabLabel: { fontSize: 13, fontWeight: "500" },
  tabLabelActive: { fontWeight: "700", color: "#059669" },
  inputArea: { padding: 16, gap: 12 },
  textarea: {
    borderWidth: 1, borderRadius: 12, padding: 12,
    fontSize: 14, lineHeight: 21, minHeight: 160,
  },
  uploadArea: {
    borderWidth: 2, borderStyle: "dashed", borderRadius: 12,
    padding: 32, alignItems: "center", gap: 8,
  },
  uploadIcon: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: "#d1fae5",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  uploadTitle: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  uploadHint: { fontSize: 12, textAlign: "center" },
  imagePreviewWrap: { gap: 8 },
  imagePlaceholder: {
    borderWidth: 1, borderRadius: 12, padding: 24, alignItems: "center", gap: 6,
  },
  imageName: { fontSize: 14, fontWeight: "600" },
  imageHint: { fontSize: 12 },
  clearImageBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#fee2e2",
  },
  clearImageText: { fontSize: 13, fontWeight: "600", color: "#dc2626" },
  errorBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#fee2e2", borderRadius: 10, padding: 12,
  },
  errorText: { fontSize: 13, color: "#dc2626", flex: 1, lineHeight: 18 },
  optimizeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, backgroundColor: "#10b981", borderRadius: 14, paddingVertical: 17,
  },
  optimizeBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  disclaimer: { fontSize: 12, textAlign: "center" },
  resultSection: { gap: 0 },
  resultCard: { borderWidth: 2 },
  resultHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 14, borderBottomWidth: 1, borderColor: "#a7f3d0",
  },
  resultHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 7 },
  resultLabel: { fontSize: 12, fontWeight: "700", color: "#059669", textTransform: "uppercase", letterSpacing: 0.5 },
  aiBadge: { backgroundColor: "#d1fae5", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  aiBadgeText: { fontSize: 10, fontWeight: "700", color: "#059669" },
  resultText: { fontSize: 13, lineHeight: 21, fontWeight: "500", padding: 16 },
  copyBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, backgroundColor: "#0f172a", borderRadius: 14,
    paddingVertical: 17, marginBottom: 10,
  },
  copyBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  shareBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, borderWidth: 1.5, borderRadius: 14,
    paddingVertical: 15, marginBottom: 10,
  },
  shareBtnText: { fontSize: 15, fontWeight: "600" },
  resetBtn: { alignItems: "center", paddingVertical: 8, marginBottom: 12 },
  resetText: { fontSize: 13, textDecorationLine: "underline" },
  ctaCard: { borderWidth: 2, padding: 20, alignItems: "center", gap: 8 },
  ctaTitle: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  ctaSub: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  trialBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#10b981", borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 24, width: "100%",
  },
  trialBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
