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
import { useLanguage } from "@/context/LanguageContext";

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
  const { t } = useLanguage();

  const FEATURES = [
    { icon: "edit-3" as const, title: t.paywall.aiMessages, description: t.paywall.aiMessagesDesc },
    { icon: "send" as const, title: t.paywall.directSending, description: t.paywall.directSendingDesc },
    { icon: "zap" as const, title: t.paywall.smartDescriptions, description: t.paywall.smartDescriptionsDesc },
    { icon: "refresh-cw" as const, title: t.paywall.regeneration, description: t.paywall.regenerationDesc },
    { icon: "users" as const, title: t.paywall.crmAccess, description: t.paywall.crmAccessDesc },
    { icon: "calendar" as const, title: t.paywall.jobScheduling, description: t.paywall.jobSchedulingDesc },
  ];
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
      showModal("error", t.paywall.notAvailableTitle, t.paywall.notAvailableMessage);
      return;
    }

    setPurchasing(true);
    try {
      const success = await purchase();
      if (success) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        showModal("success", t.paywall.welcomeTitle, t.paywall.welcomeMessage);
      }
    } catch (error: any) {
      const message = error?.message?.includes("cancelled")
        ? t.paywall.purchaseCancelled
        : t.paywall.purchaseFailedMessage;
      if (!error?.userCancelled) {
        showModal("error", t.paywall.purchaseFailed, message);
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
        showModal("success", t.paywall.restoreSuccess, t.paywall.restoreSuccessMessage);
      } else {
        showModal("info", t.paywall.noSubscription, t.paywall.noSubscriptionMessage);
      }
    } catch {
      showModal("error", t.paywall.restoreFailed, t.paywall.restoreFailedMessage);
    } finally {
      setRestoring(false);
    }
  };

  const modalIcon = modal.type === "success" ? "check-circle" : modal.type === "error" ? "alert-circle" : "info";
  const modalColor = modal.type === "success" ? theme.success : modal.type === "error" ? theme.error : theme.primary;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl + 40 }]}
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
          {t.paywall.subtitle}
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
            {t.paywall.perMonth}
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
                {t.paywall.subscribeNow}
              </ThemedText>
            </>
          )}
        </Pressable>

        <ThemedText type="caption" style={[styles.freeNote, { color: theme.textSecondary }]}>
          {t.paywall.freePlanNote}
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
              {t.paywall.restorePurchases}
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
                {modal.type === "success" ? t.paywall.letsGo : t.common.ok}
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
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  title: {
    textAlign: "center",
    marginBottom: 2,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  featuresList: {
    width: "100%",
    marginBottom: Spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: Spacing.sm,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
  },
  pricingContainer: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  price: {
    fontSize: 28,
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
