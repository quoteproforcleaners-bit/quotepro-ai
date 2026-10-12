import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Modal,
  ScrollView,
  Linking,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription, type PlanTier } from "@/context/SubscriptionContext";
import { useAuth } from "@/context/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useLanguage } from "@/context/LanguageContext";
import { trackEvent } from "@/lib/analytics";
import type { PurchasesPackage } from "react-native-purchases";
import { isWeeklyProduct, WEEKLY_PRODUCTS } from "../../shared/paidAccess";

type PaywallParams = {
  Paywall: { trigger_source?: string; required_tier?: PlanTier } | undefined;
};

const PRIVACY_POLICY_URL = "https://www.freeprivacypolicy.com/live/9ac71f0a-aa27-477d-98b2-5f8c103f766a";
const TERMS_URL = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

type ModalState = { visible: boolean; type: "success" | "error" | "info"; title: string; message: string };
type BillingInterval = "monthly" | "annual";
type SelectedPlan = "starter" | "growth" | "pro";

interface PlanDefinition {
  id: SelectedPlan;
  label: string;
  monthlyPrice: string;
  annualPrice?: string;
  annualPerMonth?: string;
  savings?: string;
  subtitle: string;
  features: { icon: string; label: string }[];
  highlight?: boolean;
  supportsAnnual: boolean;
}

const PLAN_FEATURES: PlanDefinition[] = [
  {
    id: "starter",
    label: "Basic",
    monthlyPrice: "",
    subtitle: "Start winning more jobs",
    supportsAnnual: false,
    features: [
      { icon: "home", label: "Professional Good / Better / Best quoting" },
      { icon: "file-text", label: "Unlimited manual quotes" },
      { icon: "link", label: "Branded client intake link" },
      { icon: "users", label: "Basic CRM & lead tracking" },
      { icon: "download", label: "PDF quote export" },
    ],
  },
  {
    id: "growth",
    label: "AI",
    monthlyPrice: "",
    subtitle: "Best for most cleaning businesses",
    supportsAnnual: false,
    highlight: true,
    features: [
      { icon: "check-circle", label: "Everything in Basic, plus AI assistance" },
      { icon: "cpu", label: "AI quote builder — quote any job by voice" },
      { icon: "trending-up", label: "Smart upsells — add $40-80 per job on average" },
      { icon: "send", label: "Automated follow-ups that close more leads" },
      { icon: "users", label: "Full CRM — notes, history & job tracking" },
      { icon: "bar-chart-2", label: "Revenue & close-rate dashboard" },
      { icon: "star", label: "Review request automation" },
    ],
  },
];

export default function PaywallScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<PaywallParams, "Paywall">>();
  const triggerSource = route.params?.trigger_source || "settings";
  const requiredTier = route.params?.required_tier;
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
    trialInfo,
    tier: currentTier,
  } = useSubscription();
  const { t } = useLanguage();

  const defaultPlan: SelectedPlan = requiredTier === "growth" || requiredTier === "pro" ? "growth" : "starter";
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan>(defaultPlan);
  const [billing, setBilling] = useState<BillingInterval>("monthly");
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [modal, setModal] = useState<ModalState>({ visible: false, type: "info", title: "", message: "" });

  const useMaxWidth = screenWidth > 600;
  const canPurchase = offeringsStatus === "ready" && Platform.OS === "ios";
  const planDef = PLAN_FEATURES.find(p => p.id === selectedPlan) || PLAN_FEATURES[1];

  useEffect(() => {
    trackEvent("paywall_viewed", { trigger_source: triggerSource, selected_plan: selectedPlan });
  }, [triggerSource]);

  const selectedPackage: PurchasesPackage | null = useMemo(() => {
    if (!currentOffering) return null;
    const pkgs = currentOffering.availablePackages;

    return pkgs.find(p => isWeeklyProduct(p.product) &&
      WEEKLY_PRODUCTS[p.product.identifier as keyof typeof WEEKLY_PRODUCTS] === selectedPlan) ?? null;
  }, [currentOffering, selectedPlan, billing]);

  // PRIMARY price = what is actually charged (Apple requires this to be most prominent)
  const displayPrice = useMemo(() => {
    return selectedPackage?.product.priceString ? `${selectedPackage.product.priceString}/week` : "Price unavailable";
  }, [selectedPackage, billing, planDef]);

  // SECONDARY note = subordinate info (monthly equivalent, savings, trial)
  const displayBilledNote = useMemo(() => {
    return "Billed weekly · No free trial";
  }, [billing, planDef, trialInfo, selectedPlan]);

  const contextualHeader = triggerSource === "quote_limit"
    ? "You've hit your quote limit"
    : triggerSource === "ai_builder_gate"
    ? "Quote faster with AI"
    : triggerSource === "feature_gate"
    ? "Unlock this feature"
    : "Choose your plan";

  const showModal = (type: ModalState["type"], title: string, message: string) => {
    setModal({ visible: true, type, title, message });
  };

  const dismissModal = () => {
    const wasSuccess = modal.type === "success";
    setModal(m => ({ ...m, visible: false }));
    if (wasSuccess) {
      if (navigation.canGoBack()) navigation.goBack();
    }
  };

  const handleRetryOfferings = async () => {
    setRetrying(true);
    try { await retryLoadOfferings(); }
    catch { showModal("error", "Unable to verify subscription", "Please retry when your connection is available."); }
    finally { setRetrying(false); }
  };

  const handlePurchase = async () => {
    if (subscriptionLoading || purchasing) return;
    setPurchasing(true);
    trackEvent("subscription_purchase_attempted", { trigger_source: triggerSource, plan: selectedPlan, billing });

    try {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (!canPurchase) {
        await retryLoadOfferings();
        await new Promise(r => setTimeout(r, 500));
      }

      const success = await purchase(selectedPackage ?? undefined);
      if (success) {
        trackEvent("subscription_purchase_success", { plan: selectedPlan, billing });
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showModal("success", t.paywall.welcomeTitle, t.paywall.welcomeMessage);
      }
    } catch (error: any) {
      if (!error?.userCancelled && !error?.message?.includes("userCancelled")) {
        trackEvent("subscription_purchase_failed", { plan: selectedPlan, error: error?.message });
        showModal("error", t.paywall.purchaseFailed, error?.message || t.paywall.purchaseFailedMessage);
      } else {
        trackEvent("cancel_paywall", { plan: selectedPlan });
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    trackEvent("restore_purchases_tapped");
    try {
      const success = await restore();
      if (success) {
        trackEvent("restore_purchases_success");
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

  const handleDismiss = () => {
    trackEvent("cancel_paywall", { plan: selectedPlan });
    navigation.goBack();
  };

  const ctaText = (() => {
    if (offeringsStatus === "loading" && Platform.OS !== "web") return "Loading...";
    return selectedPackage ? `Subscribe to ${planDef.label} — ${displayPrice}` : "Subscription unavailable";
  })();

  const modalIcon = modal.type === "success" ? "check-circle" : modal.type === "error" ? "alert-circle" : "info";
  const modalColor = modal.type === "success" ? theme.success : modal.type === "error" ? theme.error : theme.primary;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl + 40 },
          useMaxWidth ? { maxWidth: 560, alignSelf: "center" as const, width: "100%" as const } : undefined,
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

        <ThemedText type="h2" style={styles.title}>
          {contextualHeader}
        </ThemedText>

        {triggerSource === "quote_limit" ? (
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Move to Growth for unlimited quotes and the tools to close more jobs.
          </ThemedText>
        ) : triggerSource === "ai_builder_gate" ? (
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Describe the job by voice and get a professional quote in seconds.
          </ThemedText>
        ) : (
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Built for cleaning businesses ready to quote faster and win more jobs.
          </ThemedText>
        )}

        <View style={[styles.planTabs, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          {PLAN_FEATURES.map(plan => (
            <Pressable
              key={plan.id}
              onPress={() => {
                setSelectedPlan(plan.id);
                if (!plan.supportsAnnual) setBilling("monthly");
                if (Platform.OS !== "web") Haptics.selectionAsync();
              }}
              style={[
                styles.planTab,
                selectedPlan === plan.id && { backgroundColor: theme.primary },
              ]}
              testID={`tab-plan-${plan.id}`}
            >
              <ThemedText
                type="small"
                style={[
                  styles.planTabText,
                  { color: selectedPlan === plan.id ? "#FFFFFF" : theme.textSecondary },
                ]}
              >
                {plan.label}
              </ThemedText>
              {plan.highlight && selectedPlan !== plan.id ? (
                <View style={[styles.popularBadge, { backgroundColor: `${theme.accent}20` }]}>
                  <ThemedText style={{ fontSize: 9, color: theme.accent, fontWeight: "700" }}>
                    POPULAR
                  </ThemedText>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>

        {planDef.supportsAnnual ? (
          <View style={[styles.billingToggle, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <Pressable
              onPress={() => setBilling("monthly")}
              style={[styles.billingBtn, billing === "monthly" && { backgroundColor: theme.background }]}
              testID="toggle-billing-monthly"
            >
              <ThemedText type="small" style={{ color: billing === "monthly" ? theme.text : theme.textSecondary, fontWeight: billing === "monthly" ? "600" : "400" }}>
                Monthly
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setBilling("annual")}
              style={[styles.billingBtn, billing === "annual" && { backgroundColor: theme.background }]}
              testID="toggle-billing-annual"
            >
              <ThemedText type="small" style={{ color: billing === "annual" ? theme.text : theme.textSecondary, fontWeight: billing === "annual" ? "600" : "400" }}>
                Annual
              </ThemedText>
              {planDef.savings ? (
                <View style={[styles.savingsBadge, { backgroundColor: `${theme.success}20` }]}>
                  <ThemedText style={{ fontSize: 9, color: theme.success, fontWeight: "700" }}>
                    2 MONTHS FREE
                  </ThemedText>
                </View>
              ) : null}
            </Pressable>
          </View>
        ) : null}

        <View style={styles.pricingRow}>
          <ThemedText type="h2" style={styles.priceAmount}>
            {displayPrice}
          </ThemedText>
          <ThemedText type="small" style={[styles.billedNote, { color: theme.textSecondary }]}>
            {displayBilledNote}
          </ThemedText>
        </View>

        <View style={[styles.featureCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <ThemedText type="subtitle" style={{ fontWeight: "700" }}>
            {planDef.label}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
            {planDef.subtitle}
          </ThemedText>
          {planDef.features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.featureCheck, { backgroundColor: `${theme.success}15` }]}>
                <Feather name="check" size={14} color={theme.success} />
              </View>
              <ThemedText type="body" style={{ flex: 1, fontSize: 14 }}>
                {f.label}
              </ThemedText>
            </View>
          ))}
        </View>

        {offeringsStatus === "loading" && Platform.OS !== "web" ? (
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
                <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "600" }}>Back</ThemedText>
              </Pressable>
            </View>
          </View>
        ) : null}

        {!user ? (
          <Pressable onPress={() => (navigation as any).navigate("Login")} style={styles.retryBtn}>
            <ThemedText type="link">Sign in to subscribe</ThemedText>
          </Pressable>
        ) : null}

        <ThemedText type="caption" style={[styles.disclosureText, { color: theme.textSecondary }]}>
          Payment charged to your Apple ID at purchase confirmation. Subscription auto-renews unless canceled at least 24 hours before the billing period ends. Manage in Apple Account Settings.
        </ThemedText>

        <Pressable
          onPress={handlePurchase}
          disabled={purchasing || restoring || subscriptionLoading || !canPurchase || !selectedPackage}
          style={[
            styles.purchaseBtn,
            {
              backgroundColor: theme.accent,
              opacity: (purchasing || subscriptionLoading || !canPurchase || !selectedPackage) ? 0.5 : 1,
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
                {ctaText}
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

          <Pressable onPress={handleDismiss} style={styles.restoreBtn} testID="button-not-now">
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
              Terms of Use
            </ThemedText>
          </Pressable>
        </View>

        {__DEV__ ? (
          <View style={[styles.debugCard, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="caption" style={{ color: theme.textSecondary, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}>
              {`RC: ${isConfigured ? "configured" : "not configured"}\nOfferings: ${offeringsStatus}\nPackages: ${currentOffering?.availablePackages?.length || 0}\nSelected pkg: ${selectedPackage?.identifier || "none"}\nTier: ${currentTier}`}
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={modal.visible} transparent animationType="fade" onRequestClose={dismissModal}>
        <Pressable style={styles.modalOverlay} onPress={dismissModal}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: `${modalColor}15` }]}>
              <Feather name={modalIcon} size={28} color={modalColor} />
            </View>
            <ThemedText type="h3" style={styles.modalTitle}>{modal.title}</ThemedText>
            <ThemedText type="body" style={[styles.modalMessage, { color: theme.textSecondary }]}>{modal.message}</ThemedText>
            <Pressable
              onPress={dismissModal}
              style={[styles.modalDismissBtn, { backgroundColor: modal.type === "success" ? theme.accent : theme.backgroundSecondary }]}
              testID="button-dismiss-modal"
            >
              <ThemedText type="body" style={{ fontWeight: "600", color: modal.type === "success" ? "#FFFFFF" : theme.text }}>
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
  container: { flex: 1 },
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
    marginBottom: Spacing.md,
  },
  title: { textAlign: "center", marginBottom: Spacing.xs },
  subtitle: { textAlign: "center", marginBottom: Spacing.lg, paddingHorizontal: Spacing.md },
  planTabs: {
    flexDirection: "row",
    width: "100%",
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: 4,
    marginBottom: Spacing.md,
    gap: 4,
  },
  planTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    flexDirection: "row",
    gap: 4,
  },
  planTabText: { fontWeight: "600", fontSize: 13 },
  popularBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  billingToggle: {
    flexDirection: "row",
    width: "100%",
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: 3,
    marginBottom: Spacing.md,
    gap: 3,
  },
  billingBtn: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.xs - 2,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  savingsBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  pricingRow: { alignItems: "center", marginBottom: Spacing.md },
  priceAmount: { fontSize: 36, fontWeight: "800", lineHeight: 44 },
  billedNote: { textAlign: "center", marginTop: 2 },
  featureCard: {
    width: "100%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 3,
  },
  featureCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
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
  errorActions: { flexDirection: "row", gap: Spacing.sm },
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
  disclosureText: {
    textAlign: "center",
    marginBottom: Spacing.md,
    lineHeight: 16,
    paddingHorizontal: Spacing.sm,
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
  purchaseBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 17 },
  secondaryActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  restoreBtn: { paddingVertical: Spacing.sm },
  legalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xl,
    paddingTop: Spacing.md,
  },
  legalLink: { fontWeight: "500", textDecorationLine: "underline" },
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
  modalTitle: { textAlign: "center", marginBottom: Spacing.sm },
  modalMessage: { textAlign: "center", marginBottom: Spacing.xl, lineHeight: 20 },
  modalDismissBtn: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
});
