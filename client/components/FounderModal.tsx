import React, { useState } from "react";
import { View, StyleSheet, Modal, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { trackEvent } from "@/lib/analytics";
import {
  openShareSheet,
  openCommunity,
  markFounderModalSeen,
  markFounderModalDismissed,
  SHARE_MESSAGE,
} from "@/lib/growthLoop";

interface FounderModalProps {
  visible: boolean;
  onDismiss: () => void;
  trigger?: string;
}

export default function FounderModal({ visible, onDismiss, trigger = "first_quote" }: FounderModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [toastText, setToastText] = useState<string | null>(null);

  const handleShare = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    trackEvent("founder_modal_share_tapped");
    trackEvent("share_sheet_opened", { source: "founder_modal" });
    await markFounderModalSeen();
    const activityType = await openShareSheet("founder_modal");
    if (activityType) {
      trackEvent("share_completed", { activity_type: activityType });
      setToastText("Share link sent");
      setTimeout(() => { setToastText(null); onDismiss(); }, 1200);
      return;
    }
    onDismiss();
  };

  const handleCommunity = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    trackEvent("founder_modal_community_tapped");
    await markFounderModalSeen();
    await openCommunity();
    onDismiss();
  };

  const handleDismiss = async () => {
    trackEvent("founder_modal_dismissed");
    await markFounderModalDismissed();
    onDismiss();
  };

  React.useEffect(() => {
    if (visible) {
      trackEvent("founder_modal_viewed", { trigger });
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.cardBackground,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          <View style={[styles.iconCircle, { backgroundColor: `${theme.primary}15` }]}>
            <Feather name="heart" size={28} color={theme.primary} />
          </View>

          <ThemedText type="h2" style={styles.title}>
            Built by a Cleaning Business Owner
          </ThemedText>

          <ThemedText type="body" style={[styles.body, { color: theme.textSecondary }]}>
            I built QuotePro AI because quoting jobs and protecting margin was one of the hardest parts of running my cleaning business.
          </ThemedText>

          <ThemedText type="body" style={[styles.body, { color: theme.textSecondary }]}>
            If this app helps you, sharing it with another cleaning business owner helps a ton.
          </ThemedText>

          <Pressable
            onPress={handleShare}
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            testID="button-founder-share"
          >
            <Feather name="share" size={18} color="#FFFFFF" style={{ marginRight: Spacing.xs }} />
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700" }}>
              Share with another cleaner
            </ThemedText>
          </Pressable>

          <View style={styles.rowButtons}>
            <Pressable
              onPress={handleCommunity}
              style={[styles.halfButton, { borderColor: theme.primary }]}
              testID="button-founder-community"
            >
              <Feather name="users" size={16} color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600", marginTop: 4 }}>
                Join Community
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={async () => {
                await Clipboard.setStringAsync(SHARE_MESSAGE);
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setToastText("Share message copied");
                setTimeout(() => setToastText(null), 2000);
              }}
              style={[styles.halfButton, { borderColor: theme.border }]}
              testID="button-founder-copy"
            >
              <Feather name="copy" size={16} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "600", marginTop: 4 }}>
                Copy Message
              </ThemedText>
            </Pressable>
          </View>

          {toastText ? (
            <View style={[styles.toast, { backgroundColor: theme.success }]}>
              <Feather name="check" size={14} color="#FFFFFF" />
              <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: 6 }}>
                {toastText}
              </ThemedText>
            </View>
          ) : null}

          <Pressable
            onPress={handleDismiss}
            style={styles.tertiaryButton}
            testID="button-founder-dismiss"
          >
            <ThemedText type="small" style={{ color: theme.textMuted }}>
              Not now
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  body: {
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  rowButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    width: "100%",
    marginTop: Spacing.sm,
  },
  halfButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 52,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
  },
  tertiaryButton: {
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
});
