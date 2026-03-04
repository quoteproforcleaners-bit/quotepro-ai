import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Elevation } from "@/constants/theme";
import { trackEvent } from "@/lib/analytics";
import { shouldShowBanner, dismissBanner, openShareSheet } from "@/lib/growthLoop";

export default function SocialProofBanner() {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    shouldShowBanner().then((show) => {
      if (show) {
        setVisible(true);
        trackEvent("banner_viewed");
      }
    });
  }, []);

  const handleDismiss = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    trackEvent("banner_dismissed");
    await dismissBanner();
    setVisible(false);
  };

  const handleShare = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    trackEvent("banner_share_tapped");
    trackEvent("share_sheet_opened", { source: "banner" });
    const activityType = await openShareSheet("banner");
    if (activityType) {
      trackEvent("share_completed", { activity_type: activityType });
    }
  };

  if (!visible) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.cardBackground, borderColor: theme.border },
        Elevation.e1,
      ]}
      testID="banner-social-proof"
    >
      <Pressable
        onPress={handleDismiss}
        style={styles.closeButton}
        hitSlop={12}
        testID="button-banner-dismiss"
      >
        <Feather name="x" size={16} color={theme.textMuted} />
      </Pressable>

      <ThemedText type="subtitle" style={{ fontWeight: "600" }}>
        Used by cleaning businesses across the United States
      </ThemedText>

      <ThemedText type="small" style={[styles.subtext, { color: theme.textSecondary }]}>
        Join the early adopters building faster quoting + better margins.
      </ThemedText>

      <Pressable
        onPress={handleShare}
        style={[styles.shareButton, { backgroundColor: `${theme.primary}12` }]}
        testID="button-banner-share"
      >
        <Feather name="share-2" size={14} color={theme.primary} style={{ marginRight: 6 }} />
        <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
          Share QuotePro
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    zIndex: 1,
  },
  subtext: {
    marginTop: 4,
    marginBottom: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
});
