import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";

const FEATURES = [
  { icon: "zap", text: "AI qualifies and quotes leads automatically" },
  { icon: "send", text: "Follow-up emails sent at the right time, without you" },
  { icon: "file-text", text: "Welcome email when a quote is accepted" },
  { icon: "star", text: "Google review request after job completion" },
  { icon: "pause", text: "Pause or resume any job at any time" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  tier: string;
  embedded?: boolean;
}

export function AutopilotUpsellModal({ visible, onClose, tier, embedded = false }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isGrowth = tier === "growth";

  const handleUpgradeGrowth = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const url = new URL("/api/autopilot/checkout", getApiUrl());
      const res = await apiRequest<{ url: string }>("POST", url.pathname);
      if (res?.url) {
        await Linking.openURL(res.url);
      }
    } catch {
    }
  };

  const handleUpgradePro = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const content = (
    <View style={[
      styles.content,
      { backgroundColor: theme.backgroundDefault },
      embedded && { borderRadius: BorderRadius.xl, margin: Spacing.md },
    ]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.primary + "15" }]}>
        <Feather name="zap" size={28} color={theme.primary} />
      </View>
      <ThemedText style={styles.headline}>QuotePro Autopilot</ThemedText>
      <ThemedText style={[styles.subhead, { color: theme.textSecondary }]}>
        Your leads get quoted, followed up, and reviewed — automatically. While you're on the job.
      </ThemedText>

      <View style={[styles.featureList, { borderColor: theme.border }]}>
        {FEATURES.map((f, i) => (
          <View key={i} style={[styles.featureRow, i < FEATURES.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <View style={[styles.featureIcon, { backgroundColor: theme.primary + "12" }]}>
              <Feather name={f.icon as any} size={14} color={theme.primary} />
            </View>
            <ThemedText style={styles.featureText}>{f.text}</ThemedText>
          </View>
        ))}
      </View>

      {isGrowth ? (
        <Pressable
          onPress={handleUpgradeGrowth}
          style={({ pressed }) => [styles.primaryBtn, { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 }]}
          testID="button-autopilot-addon"
        >
          <Feather name="zap" size={16} color="#fff" />
          <ThemedText style={styles.primaryBtnText}>Add Autopilot — $29/mo</ThemedText>
        </Pressable>
      ) : (
        <Pressable
          onPress={handleUpgradePro}
          style={({ pressed }) => [styles.primaryBtn, { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 }]}
          testID="button-upgrade-pro"
        >
          <Feather name="arrow-up" size={16} color="#fff" />
          <ThemedText style={styles.primaryBtnText}>Upgrade to Pro — Autopilot Included</ThemedText>
        </Pressable>
      )}

      {!embedded && (
        <Pressable onPress={onClose} style={styles.dismissBtn}>
          <ThemedText style={[styles.dismissText, { color: theme.textSecondary }]}>Maybe later</ThemedText>
        </Pressable>
      )}
    </View>
  );

  if (embedded) return content;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalRoot, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top }]}>
        {!embedded && (
          <View style={styles.handle} />
        )}
        <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: insets.bottom + Spacing.xl }}>
          {content}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#d1d5db", alignSelf: "center", marginVertical: Spacing.sm },
  content: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: "center",
    gap: Spacing.md,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  headline: { fontSize: 24, fontWeight: "800", textAlign: "center" },
  subhead: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  featureList: { width: "100%", borderWidth: 1, borderRadius: BorderRadius.md, overflow: "hidden" },
  featureRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, padding: Spacing.md },
  featureIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureText: { flex: 1, fontSize: 14, fontWeight: "500", lineHeight: 18 },
  primaryBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.md,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  dismissBtn: { paddingVertical: Spacing.sm },
  dismissText: { fontSize: 14 },
});
