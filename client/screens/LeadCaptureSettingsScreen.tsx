import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  ActivityIndicator,
  Share,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { ProGate } from "@/components/ProGate";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

interface LeadCaptureSettings {
  slug: string;
  enabled: boolean;
  buttonText: string;
  publicUrl: string;
}

export default function LeadCaptureSettingsScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [slugInput, setSlugInput] = useState("");
  const [slugEditing, setSlugEditing] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "error">("idle");
  const [buttonTextInput, setButtonTextInput] = useState("");
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [checkTimer, setCheckTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const { data: settings, isLoading } = useQuery<LeadCaptureSettings>({
    queryKey: ["/api/business/lead-capture-settings"],
  });

  useEffect(() => {
    if (settings) {
      setSlugInput(settings.slug || "");
      setButtonTextInput(settings.buttonText || "Get a Free Quote");
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<{ slug: string; enabled: boolean; buttonText: string }>) => {
      const res = await apiRequest("PUT", "/api/business/lead-capture-settings", updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/lead-capture-settings"] });
    },
  });

  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) { setSlugStatus("idle"); return; }
    if (slug === settings?.slug) { setSlugStatus("available"); return; }
    setSlugStatus("checking");
    try {
      const res = await apiRequest("GET", `/api/public/slug-available/${encodeURIComponent(slug)}`);
      const data = await res.json();
      setSlugStatus(data.available ? "available" : "taken");
    } catch {
      setSlugStatus("error");
    }
  }, [settings?.slug]);

  const handleSlugChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/--+/g, "-");
    setSlugInput(clean);
    setSlugStatus("idle");
    if (checkTimer) clearTimeout(checkTimer);
    setCheckTimer(setTimeout(() => checkSlugAvailability(clean), 600));
  };

  const handleSaveSlug = async () => {
    if (slugStatus !== "available" && slugInput !== settings?.slug) return;
    await updateMutation.mutateAsync({ slug: slugInput });
    setSlugEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleToggleEnabled = (val: boolean) => {
    updateMutation.mutate({ enabled: val });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveButtonText = async () => {
    await updateMutation.mutateAsync({ buttonText: buttonTextInput });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleCopy = async (type: "link" | "code") => {
    if (!settings) return;
    const text = type === "link" ? settings.publicUrl : htmlSnippet;
    await Clipboard.setStringAsync(text);
    setCopied(type);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleShare = async () => {
    if (!settings) return;
    await Share.share({ message: `Request a quote from us: ${settings.publicUrl}` });
  };

  const htmlSnippet = settings
    ? `<a href="${settings.publicUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-family:sans-serif;">${buttonTextInput || "Get a Free Quote"}</a>`
    : "";

  const slugStatusColor =
    slugStatus === "available" ? "#16a34a" :
    slugStatus === "taken" || slugStatus === "error" ? "#dc2626" :
    theme.textSecondary;

  const slugStatusText =
    slugStatus === "checking" ? "Checking..." :
    slugStatus === "available" ? (slugInput === settings?.slug ? "Your current URL" : "Available") :
    slugStatus === "taken" ? "Already taken" :
    slugStatus === "error" ? "Could not check" :
    "";

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <ProGate featureName="Lead Capture Link">
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.lg,
      }}
    >
      {/* Enable toggle */}
      <Card style={{ backgroundColor: theme.cardBackground }}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1, gap: 4 }}>
            <ThemedText style={styles.cardTitle}>Instant Quote Request Link</ThemedText>
            <ThemedText style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
              Customers tap your link and fill out a quote request. It lands directly in your inbox.
            </ThemedText>
          </View>
          <Switch
            value={settings?.enabled ?? true}
            onValueChange={handleToggleEnabled}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      {/* Public URL */}
      <Card style={{ backgroundColor: theme.cardBackground, gap: Spacing.md }}>
        <ThemedText style={styles.cardTitle}>Your Link</ThemedText>
        <View style={[styles.urlBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <ThemedText style={[styles.urlText, { color: theme.primary }]} numberOfLines={1}>
            {settings?.publicUrl || "Loading..."}
          </ThemedText>
        </View>
        <View style={styles.linkButtonRow}>
          <Pressable
            style={[styles.linkBtn, { backgroundColor: theme.primary }]}
            onPress={() => handleCopy("link")}
            testID="button-copy-link"
          >
            <Feather name={copied === "link" ? "check" : "copy"} size={14} color="#fff" />
            <ThemedText style={styles.linkBtnText}>{copied === "link" ? "Copied!" : "Copy Link"}</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.linkBtn, { backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border }]}
            onPress={handleShare}
            testID="button-share-link"
          >
            <Feather name="share-2" size={14} color={theme.primary} />
            <ThemedText style={[styles.linkBtnText, { color: theme.primary }]}>Share</ThemedText>
          </Pressable>
        </View>

        <View style={[styles.usageBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <ThemedText style={[styles.usageTitle, { color: theme.textSecondary }]}>Where to use it:</ThemedText>
          {[
            { icon: "globe" as const, text: "Website" },
            { icon: "search" as const, text: "Google Business Profile" },
            { icon: "instagram" as const, text: "Instagram bio" },
            { icon: "mail" as const, text: "Email signature" },
            { icon: "message-circle" as const, text: "Text messages" },
          ].map(({ icon, text }) => (
            <View key={text} style={styles.usageRow}>
              <Feather name={icon} size={13} color={theme.textSecondary} />
              <ThemedText style={[styles.usageItem, { color: theme.textSecondary }]}>{text}</ThemedText>
            </View>
          ))}
        </View>
      </Card>

      {/* Slug editor */}
      <Card style={{ backgroundColor: theme.cardBackground, gap: Spacing.md }}>
        <ThemedText style={styles.cardTitle}>Customize Your URL</ThemedText>
        <ThemedText style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
          Use your business name so customers recognize it.
        </ThemedText>
        <View style={styles.slugRow}>
          <ThemedText style={[styles.slugPrefix, { color: theme.textSecondary, backgroundColor: theme.background, borderColor: theme.border }]}>
            .../request/
          </ThemedText>
          <TextInput
            style={[styles.slugInput, { color: theme.text, borderColor: slugStatus === "taken" ? "#dc2626" : slugStatus === "available" && slugInput !== settings?.slug ? "#16a34a" : theme.border, backgroundColor: theme.background }]}
            value={slugInput}
            onChangeText={handleSlugChange}
            onFocus={() => setSlugEditing(true)}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="your-business-name"
            placeholderTextColor={theme.textSecondary}
            testID="input-slug"
          />
        </View>
        {slugStatusText ? (
          <ThemedText style={[styles.slugStatus, { color: slugStatusColor }]}>{slugStatusText}</ThemedText>
        ) : null}
        {(slugEditing || slugInput !== settings?.slug) && (
          <Pressable
            style={[styles.saveBtn, { backgroundColor: slugStatus === "available" || slugInput === settings?.slug ? theme.primary : theme.border }]}
            onPress={handleSaveSlug}
            disabled={updateMutation.isPending || (slugStatus !== "available" && slugInput !== settings?.slug)}
            testID="button-save-slug"
          >
            {updateMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.saveBtnText}>Save URL</ThemedText>
            )}
          </Pressable>
        )}
      </Card>

      {/* Website button generator */}
      <Card style={{ backgroundColor: theme.cardBackground, gap: Spacing.md }}>
        <ThemedText style={styles.cardTitle}>Website Quote Button</ThemedText>
        <ThemedText style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
          Copy this code and paste it into your website to add a "Get a Quote" button.
        </ThemedText>
        <View style={{ gap: Spacing.sm }}>
          <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Button Text</ThemedText>
          <TextInput
            style={[styles.textField, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            value={buttonTextInput}
            onChangeText={setButtonTextInput}
            onBlur={handleSaveButtonText}
            placeholder="Get a Free Quote"
            placeholderTextColor={theme.textSecondary}
            testID="input-button-text"
          />
        </View>
        <View style={[styles.codeBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <ThemedText style={[styles.codeText, { color: theme.textSecondary }]} selectable numberOfLines={4}>
            {htmlSnippet}
          </ThemedText>
        </View>
        <Pressable
          style={[styles.linkBtn, { backgroundColor: theme.primary, alignSelf: "flex-start" }]}
          onPress={() => handleCopy("code")}
          testID="button-copy-code"
        >
          <Feather name={copied === "code" ? "check" : "code"} size={14} color="#fff" />
          <ThemedText style={styles.linkBtnText}>{copied === "code" ? "Copied!" : "Copy Code"}</ThemedText>
        </Pressable>
      </Card>
    </ScrollView>
    </ProGate>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  cardSubtitle: { fontSize: 13, lineHeight: 18 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  urlBox: { borderRadius: BorderRadius.md, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  urlText: { fontSize: 13, fontWeight: "500" },
  linkButtonRow: { flexDirection: "row", gap: Spacing.sm },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: BorderRadius.md },
  linkBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  usageBox: { borderRadius: BorderRadius.md, borderWidth: 1, padding: 12, gap: 6 },
  usageTitle: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  usageRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  usageItem: { fontSize: 13 },
  slugRow: { flexDirection: "row", alignItems: "center", gap: 0 },
  slugPrefix: { fontSize: 12, paddingHorizontal: 10, paddingVertical: 10, borderWidth: 1, borderRightWidth: 0, borderTopLeftRadius: BorderRadius.md, borderBottomLeftRadius: BorderRadius.md },
  slugInput: { flex: 1, fontSize: 14, paddingHorizontal: 10, paddingVertical: 10, borderWidth: 1, borderTopRightRadius: BorderRadius.md, borderBottomRightRadius: BorderRadius.md },
  slugStatus: { fontSize: 12, marginTop: -4 },
  saveBtn: { borderRadius: BorderRadius.md, paddingVertical: 11, alignItems: "center" },
  saveBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  fieldLabel: { fontSize: 12, fontWeight: "500" },
  textField: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  codeBox: { borderRadius: BorderRadius.md, borderWidth: 1, padding: 12 },
  codeText: { fontSize: 11, fontFamily: "monospace", lineHeight: 18 },
});
