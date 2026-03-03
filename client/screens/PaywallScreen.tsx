import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Platform, Modal, ScrollView, Linking, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/context/SubscriptionContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useLanguage } from "@/context/LanguageContext";
import { trackEvent } from "@/lib/analytics";

type PaywallParams = {
  Paywall: { trigger_source?: string } | undefined;
};

const PRIVACY_POLICY_URL = "https://www.freeprivacypolicy.com/live/9ac71f0a-aa27-477d-98b2-5f8c103f766a";
const TERMS_URL = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

type ModalState = {
  visible: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
};

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<PaywallParams, "Paywall">>();
  const triggerSource = route.params?.trigger_source || "settings";
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const {
    purchase,
    restore,
    currentOffering,
    isLoading: subscriptionLoading,
    offeringsStatus,
    offeringsError,
    isConfigured,
    retryLoadOfferings,
  } = useSubscription();
  const { t } = useLanguage();

  useEffect(() => {
    trackEvent("paywall_viewed", { trigger_source: triggerSource });
  }, [triggerSource]);

  const BENEFITS = [
    { icon: "clock" as const, label: "Quote in 10 seconds" },
    { icon: "shield" as const, label: "Protect your margin on every job" },
    { icon: "repeat" as const, label: "Auto-generate follow-ups that close" },
  ];

  const contextualHeader = triggerSource === "quote_limit"
    ? "You've hit your free limit"
    : triggerSource === "after_demo"
    ? "Unlock unlimited quotes + AI follow-ups"
    : triggerSource === "feature_gate"
    ? "This feature requires Pro"
    : "Upgrade to QuotePro Pro";
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [modal, setModal] = useState<ModalState>({ visible: false, type: "info", title: "", message: "" });

  const monthlyPrice = currentOffering?.monthly?.product?.priceString || "$19.99";
  const useMaxWidth = screenWidth > 600;
  const canPurchase = offeringsStatus === "ready" || Platform.OS === "web";

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

  const handleRetryOfferings = async () => {
    setRetrying(true);
    try {
      await retryLoadOfferings();
    } finally {
      setRetrying(false);
    }
  };

  const handlePurchase = async () => {
    if (subscriptionLoading || purchasing) return;

    setPurchasing(true);
    trackEvent("subscription_purchase_attempted", { trigger_source: triggerSource });
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      if (!canPurchase) {
        await retryLoadOfferings();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const success = await purchase();
      if (success) {
        trackEvent("subscription_purchase_success", { trigger_source: triggerSource });
        trackEvent("trial_started", { trigger_source: triggerSource });
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        showModal("success", t.paywall.welcomeTitle, t.paywall.welcomeMessage);
      }
    } catch (error: any) {
      if (!error?.userCancelled && !error?.message?.includes("userCancelled")) {
        trackEvent("subscription_purchase_failed", { trigger_source: triggerSource, error: error?.message });
        const message = error?.message || t.paywall.purchaseFailedMessage;
        showModal("error", t.paywall.purchaseFailed, message);
      } else {
        trackEvent("cancel_paywall", { trigger_source: triggerSource });
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    trackEvent("restore_purchases_tapped", { trigger_source: triggerSource });
    try {
      const success = await restore();
      if (success) {
        trackEvent("restore_purchases_success");
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        showModal("success", t.paywall.restoreSuccess, t.paywall.restoreSuccessMessage);
      } else {
        showModal("info", t.paywall.noSubscription, t.paywall.noSubscriptionMessage);
      }
    } catch {
      trackEvent("restore_purchases_failed");
      showModal("error", t.paywall.restoreFailed, t.paywall.restoreFailedMessage);
    } finally {
      setRestoring(false);
    }
  };

  const handleDismiss = () => {
    trackEvent("cancel_paywall", { trigger_source: triggerSource });
    navigation.goBack();
  };

  const modalIcon = modal.type === "success" ? "check-circle" : modal.type === "error" ? "alert-circle" : "info";
  const modalColor = modal.type === "success" ? theme.success : modal.type === "error" ? theme.error : theme.primary;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl + 40 },
          useMaxWidth ? { maxWidth: 560, alignSelf: "center", width: "100%" } : undefined,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={handleDismiss}
          style={[styles.closeBtn, { backgroundColor: theme.backgroundSecondary }]}
          testID="button-close-paywall"
        >
          <Feather name="x" size={22} color={theme.text} />
        </Pressable>

        <View style={[styles.iconContainer, { backgroundColor: `${theme.accent}15` }]}>
          <Feather name="zap" size={36} color={theme.accent} />
        </View>

        <ThemedText type="h2" style={styles.title}>
          {contextualHeader}
        </ThemedText>

        {triggerSource === "quote_limit" ? (
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            You've used 3 of 3 free quotes. Start your free trial to keep quoting.
          </ThemedText>
        ) : (
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Everything you need to quote faster, earn more, and close jobs.
          </ThemedText>
        )}

        <View style={styles.benefitsList}>
          {BENEFITS.map((benefit, i) => (
            <View key={i} style={styles.benefitRow} testID={`benefit-row-${i}`}>
              <View style={[styles.benefitCheck, { backgroundColor: `${theme.success}15` }]}>
                <Feather name="check" size={16} color={theme.success} />
              </View>
              <ThemedText type="body" style={{ flex: 1, fontWeight: "500" }}>
                {benefit.label}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={[styles.socialProofCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="star" size={14} color={theme.accent} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 6, fontStyle: "italic" }}>
            Built by a cleaning franchise owner
          </ThemedText>
        </View>

        <View style={styles.pricingContainer}>
          <ThemedText type="h3" style={styles.price}>
            {monthlyPrice}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            per month
          </ThemedText>
        </View>

        {offeringsStatus === "loading" ? (
          <View style={[styles.statusCard, { backgroundColor: theme.backgroundSecondary }]}>
            <ActivityIndicator size="small" color={theme.primary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>
              Loading subscription options...
            </ThemedText>
          </View>
        ) : null}

        {offeringsStatus === "error" && Platform.OS !== "web" ? (
          <View style={[styles.errorCard, { backgroundColor: theme.error + "10", borderColor: theme.error + "30" }]}>
            <View style={styles.errorHeader}>
              <Feather name="alert-circle" size={16} color={theme.error} />
              <ThemedText type="subtitle" style={{ color: theme.error, flex: 1 }}>
                Subscriptions temporarily unavailable
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
              {offeringsError || "Please check your connection and try again."}
            </ThemedText>
            <View style={styles.errorActions}>
              <Pressable
                onPress={handleRetryOfferings}
                disabled={retrying}
                style={[styles.retryBtn, { backgroundColor: theme.primary }]}
              >
                {retrying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600" }}>Retry</ThemedText>
                )}
              </Pressable>
              <Pressable
                onPress={() => navigation.goBack()}
                style={[styles.continueBtn, { borderColor: theme.border }]}
              >
                <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "600" }}>Continue Free</ThemedText>
              </Pressable>
            </View>
          </View>
        ) : null}

        <ThemedText type="caption" style={[styles.disclosureText, { color: theme.textSecondary }]}>
          Payment will be charged to your Apple ID at confirmation of purchase. Subscription automatically renews unless canceled at least 24 hours before the end of the billing period. You can manage or cancel your subscription in your Apple Account Settings.
        </ThemedText>

        <Pressable
          onPress={handlePurchase}
          disabled={purchasing || restoring || (offeringsStatus === "loading" && Platform.OS !== "web")}
          style={[
            styles.purchaseBtn,
            {
              backgroundColor: theme.accent,
              opacity: (purchasing || (offeringsStatus === "loading" && Platform.OS !== "web")) ? 0.5 : 1,
            },
          ]}
          testID="button-purchase"
        >
          {purchasing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Feather name="zap" size={20} color="#FFFFFF" />
              <ThemedText type="body" style={styles.purchaseBtnText}>
                {offeringsStatus === "loading" && Platform.OS !== "web"
                  ? "Loading..."
                  : "Start Free Trial"}
              </ThemedText>
            </>
          )}
        </Pressable>

        <View style={styles.secondaryActions}>
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

          <ThemedText type="small" style={{ color: theme.textSecondary }}> | </ThemedText>

          <Pressable
            onPress={handleDismiss}
            style={styles.restoreBtn}
            testID="button-not-now"
          >
            <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "600" }}>
              Not now
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.legalFooter}>
          <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} testID="link-privacy-policy">
            <ThemedText type="caption" style={[styles.legalLink, { color: theme.primary }]}>
              Privacy Policy
            </ThemedText>
          </Pressable>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>  |  </ThemedText>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)} testID="link-terms">
            <ThemedText type="caption" style={[styles.legalLink, { color: theme.primary }]}>
              Terms of Use (EULA)
            </ThemedText>
          </Pressable>
        </View>

        {__DEV__ ? (
          <View style={[styles.debugCard, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="caption" style={{ color: theme.textSecondary, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}>
              {`RC: ${isConfigured ? "configured" : "not configured"}\nOfferings: ${offeringsStatus}\nPackages: ${currentOffering?.availablePackages?.length || 0}`}
            </ThemedText>
          </View>
        ) : null}
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
  benefitsList: {
    width: "100%",
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  benefitCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  socialProofCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.lg,
  },
  secondaryActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  pricingContainer: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  price: {
    fontSize: 28,
    fontWeight: "800",
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  errorCard: {
    width: "100%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  errorActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  retryBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    minWidth: 80,
    alignItems: "center",
  },
  continueBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
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
  disclosureText: {
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 16,
    paddingHorizontal: Spacing.sm,
  },
  legalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xl,
    paddingTop: Spacing.md,
  },
  legalLink: {
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  debugCard: {
    width: "100%",
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.xl,
    opacity: 0.6,
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
    maxWidth: 400,
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
