import React, { useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Platform, Modal, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/context/SubscriptionContext";
import { Spacing, BorderRadius } from "@/constants/theme";

const FEATURES = [
  { icon: "edit-3" as const, title: "AI-Written Messages", description: "Generate personalized emails and texts in seconds" },
  { icon: "send" as const, title: "Direct Sending", description: "Send quotes via email or SMS right from the app" },
  { icon: "zap" as const, title: "Smart Descriptions", description: "AI-enhanced service descriptions for your quotes" },
  { icon: "refresh-cw" as const, title: "One-Tap Regeneration", description: "Regenerate messages until they're perfect" },
  { icon: "users" as const, title: "Full CRM Access", description: "Notes, tags, and communication history" },
  { icon: "calendar" as const, title: "Job Scheduling", description: "Schedule jobs with checklists and status tracking" },
];

type ModalState = {
  visible: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
};

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { purchase, restore, currentOffering, isLoading: subscriptionLoading } = useSubscription();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [modal, setModal] = useState<ModalState>({ visible: false, type: "info", title: "", message: "" });

  const monthlyPrice = currentOffering?.monthly?.product?.priceString || "$14.99";

  const showModal = (type: ModalState["type"], title: string, message: string) => {
    setModal({ visible: true, type, title, message });
  };

  const dismissModal = () => {
    const wasSuccess = modal.type === "success";
    setModal((m) => ({ ...m, visible: false }));
    if (wasSuccess) {
      navigation.goBack();
    }
  };

  const handlePurchase = async () => {
    if (subscriptionLoading) return;

    if (!currentOffering?.monthly && Platform.OS !== "web") {
      showModal("error", "Not Available", "The subscription offering couldn't be loaded. Please check your internet connection and try again.");
      return;
    }

    setPurchasing(true);
    try {
      const success = await purchase();
      if (success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        showModal("success", "Welcome to QuotePro AI!", "You now have access to all AI features and direct sending.");
      }
    } catch (error: any) {
      const message = error?.message?.includes("cancelled")
        ? "Purchase was cancelled."
        : "Something went wrong with the purchase. Please try again.";
      if (!error?.userCancelled) {
        showModal("error", "Purchase Failed", message);
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const success = await restore();
      if (success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        showModal("success", "Subscription Restored", "Your QuotePro AI access has been restored.");
      } else {
        showModal("info", "No Subscription Found", "We couldn't find an active subscription for this account.");
      }
    } catch {
      showModal("error", "Restore Failed", "Something went wrong. Please try again.");
    } finally {
      setRestoring(false);
    }
  };

  const modalIcon = modal.type === "success" ? "check-circle" : modal.type === "error" ? "alert-circle" : "info";
  const modalColor = modal.type === "success" ? theme.success : modal.type === "error" ? theme.error : theme.primary;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.closeBtn, { backgroundColor: theme.backgroundSecondary }]}
          testID="button-close-paywall"
        >
          <Feather name="x" size={22} color={theme.text} />
        </Pressable>

        <View style={[styles.iconContainer, { backgroundColor: `${theme.accent}15` }]}>
          <Feather name="zap" size={36} color={theme.accent} />
        </View>

        <ThemedText type="h2" style={styles.title}>
          QuotePro AI
        </ThemedText>

        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          Supercharge your cleaning business with AI
        </ThemedText>

        <View style={styles.featuresList}>
          {FEATURES.map((feature, i) => (
            <View key={i} style={[styles.featureRow, { borderBottomColor: theme.border }]} testID={`feature-row-${i}`}>
              <View style={[styles.featureIcon, { backgroundColor: `${theme.accent}12` }]}>
                <Feather name={feature.icon} size={18} color={theme.accent} />
              </View>
              <View style={styles.featureText}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {feature.title}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                  {feature.description}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.pricingContainer}>
          <ThemedText type="h3" style={styles.price}>
            {monthlyPrice}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            per month
          </ThemedText>
        </View>

        <Pressable
          onPress={handlePurchase}
          disabled={purchasing || restoring}
          style={[styles.purchaseBtn, { backgroundColor: theme.accent, opacity: purchasing ? 0.7 : 1 }]}
          testID="button-purchase"
        >
          {purchasing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Feather name="zap" size={20} color="#FFFFFF" />
              <ThemedText type="body" style={styles.purchaseBtnText}>
                Subscribe Now
              </ThemedText>
            </>
          )}
        </Pressable>

        <ThemedText type="caption" style={[styles.freeNote, { color: theme.textSecondary }]}>
          Free plan includes unlimited quoting and customer management
        </ThemedText>

        <Pressable
          onPress={handleRestore}
          disabled={purchasing || restoring}
          style={styles.restoreBtn}
          testID="button-restore"
        >
          {restoring ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
              Restore Purchases
            </ThemedText>
          )}
        </Pressable>
      </ScrollView>

      <Modal
        visible={modal.visible}
        transparent
        animationType="fade"
        onRequestClose={dismissModal}
      >
        <Pressable style={styles.modalOverlay} onPress={dismissModal}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: `${modalColor}15` }]}>
              <Feather name={modalIcon} size={28} color={modalColor} />
            </View>
            <ThemedText type="h3" style={styles.modalTitle}>
              {modal.title}
            </ThemedText>
            <ThemedText type="body" style={[styles.modalMessage, { color: theme.textSecondary }]}>
              {modal.message}
            </ThemedText>
            <Pressable
              onPress={dismissModal}
              style={[styles.modalDismissBtn, { backgroundColor: modal.type === "success" ? theme.accent : theme.backgroundSecondary }]}
              testID="button-dismiss-modal"
            >
              <ThemedText
                type="body"
                style={{ fontWeight: "600", color: modal.type === "success" ? "#FFFFFF" : theme.text }}
              >
                {modal.type === "success" ? "Let's Go" : "OK"}
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
  },
  closeBtn: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  featuresList: {
    width: "100%",
    marginBottom: Spacing.xl,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
  },
  pricingContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  price: {
    fontSize: 32,
    fontWeight: "800",
  },
  purchaseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  purchaseBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
  },
  freeNote: {
    textAlign: "center",
    marginTop: Spacing.md,
  },
  restoreBtn: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    alignItems: "center",
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  modalMessage: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  modalDismissBtn: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
});
