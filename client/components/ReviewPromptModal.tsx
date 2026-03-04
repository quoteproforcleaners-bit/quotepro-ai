import React from "react";
import { View, StyleSheet, Modal, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { trackEvent } from "@/lib/analytics";
import { openAppStoreReview, markReviewPrompted } from "@/lib/growthLoop";

interface ReviewPromptModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function ReviewPromptModal({ visible, onDismiss }: ReviewPromptModalProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  React.useEffect(() => {
    if (visible) {
      trackEvent("review_prompt_shown", { type: "custom" });
    }
  }, [visible]);

  const handleLeaveReview = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    trackEvent("review_prompt_leave_review_tapped");
    await markReviewPrompted();
    await openAppStoreReview();
    onDismiss();
  };

  const handleDismiss = async () => {
    trackEvent("review_prompt_dismissed");
    await markReviewPrompted();
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.cardBackground,
              marginBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: `${theme.warning}15` }]}>
            <Feather name="star" size={24} color={theme.warning} />
          </View>

          <ThemedText type="h3" style={styles.title}>
            Enjoying QuotePro?
          </ThemedText>

          <ThemedText type="body" style={[styles.body, { color: theme.textSecondary }]}>
            Would you mind leaving a quick review? It helps other cleaners find QuotePro.
          </ThemedText>

          <Pressable
            onPress={handleLeaveReview}
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            testID="button-review-leave"
          >
            <Feather name="star" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700" }}>
              Leave a Review
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={handleDismiss}
            style={styles.dismissButton}
            testID="button-review-dismiss"
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  card: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  body: {
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 48,
    borderRadius: BorderRadius.lg,
  },
  dismissButton: {
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
});
