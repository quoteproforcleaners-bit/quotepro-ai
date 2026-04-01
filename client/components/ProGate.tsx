import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform, useWindowDimensions, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription, usePlanGate, type PlanTier } from "@/context/SubscriptionContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { trackEvent } from "@/lib/analytics";

interface ProGateProps {
  children: React.ReactNode;
  featureName?: string;
  minTier?: PlanTier;
}

export function ProGate({ children, featureName, minTier = "growth" }: ProGateProps) {
  const { hasAccess, isLoading } = usePlanGate(minTier);

  // While subscription state loads, show the locked overlay (not the premium content).
  // Never expose premium content before entitlement is confirmed.
  if (isLoading) return <ProGateOverlay featureName={featureName} minTier={minTier} isLoading />;
  if (hasAccess) return <>{children}</>;

  return <ProGateOverlay featureName={featureName} minTier={minTier} />;
}

const TIER_LABEL: Record<PlanTier, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};

// Feature-specific value taglines — shown as the subtitle on the gate overlay
const FEATURE_TAGLINES: Record<string, string> = {
  "AI Quote Builder": "Generate accurate, professional quotes in seconds — not minutes.",
  "Follow-Up Queue": "Never let a hot lead go cold. Automated nudges that win jobs.",
  "Walkthrough AI": "Let AI price rooms from a photo walkthrough — close on the spot.",
  "Upsell Opportunities": "Add-ons and upsells that grow your average ticket automatically.",
  "Revenue Dashboard": "See exactly what's earning and where your next dollar is coming from.",
  "Customer Management": "Full CRM to track leads, history, and lifetime value.",
  "Commercial Quote Builder": "Win bigger commercial contracts with professional proposals.",
  "Lead Finder": "Find homeowners actively looking for cleaning services near you.",
  "Automations Hub": "Set triggers and rules that run your business while you're on jobs.",
  "Advanced Integrations": "Connect to Zapier, Make, and webhooks to automate anything.",
  "Social Leads": "Turn social media comments into booked appointments.",
};

const TIER_FEATURES: Record<PlanTier, { icon: string; label: string }[]> = {
  starter: [
    { icon: "edit-3", label: "Up to 20 quotes per month" },
    { icon: "home", label: "Good / Better / Best quoting" },
    { icon: "link", label: "Branded intake form" },
    { icon: "users", label: "Basic CRM & lead capture" },
  ],
  growth: [
    { icon: "zap", label: "Unlimited quotes" },
    { icon: "cpu", label: "AI quote builder" },
    { icon: "trending-up", label: "Smart upsell recommendations" },
    { icon: "send", label: "Automated follow-ups" },
    { icon: "users", label: "Full CRM & customer management" },
    { icon: "bar-chart-2", label: "Revenue dashboard" },
  ],
  pro: [
    { icon: "zap", label: "Everything in Growth" },
    { icon: "settings", label: "Advanced automation rules" },
    { icon: "activity", label: "Revenue intelligence & analytics" },
    { icon: "search", label: "Lead finder & outreach tools" },
    { icon: "briefcase", label: "Commercial quote builder" },
    { icon: "link", label: "QBO integrations" },
  ],
  free: [],
};

export function ProGateOverlay({ featureName, minTier = "growth", isLoading = false }: { featureName?: string; minTier?: PlanTier; isLoading?: boolean }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;
  const { restore } = useSubscription();
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);

  React.useEffect(() => {
    trackEvent("premium_feature_blocked", { feature: featureName || "unknown", required_tier: minTier });
  }, [featureName, minTier]);

  let tabBarHeight = 0;
  try {
    tabBarHeight = useBottomTabBarHeight();
  } catch {
    tabBarHeight = 0;
  }

  const handleUpgrade = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    navigation.navigate("Paywall", { trigger_source: "feature_gate", required_tier: minTier });
  };

  const handleRestore = async () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setRestoring(true);
    setRestoreMsg(null);
    try {
      const ok = await restore();
      setRestoreMsg(ok ? "Subscription restored!" : "No active subscription found.");
    } catch {
      setRestoreMsg("Restore failed. Try again.");
    } finally {
      setRestoring(false);
    }
  };

  const tierLabel = TIER_LABEL[minTier] || "Pro";
  const features = TIER_FEATURES[minTier] || TIER_FEATURES.growth;
  const tagline = featureName ? (FEATURE_TAGLINES[featureName] || `Upgrade to ${tierLabel} to unlock this and more.`) : `Upgrade to ${tierLabel} to unlock this feature and more.`;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingCenter, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 80 },
          useMaxWidth ? { maxWidth: 560, alignSelf: "center" as const, width: "100%" as const } : undefined,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconCircle, { backgroundColor: `${theme.accent}15` }]}>
          <Feather name="lock" size={32} color={theme.accent} />
        </View>

        <ThemedText type="h3" style={styles.title}>
          {featureName ?? `${tierLabel} Feature`}
        </ThemedText>

        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          {tagline}
        </ThemedText>

        <View style={styles.featureList}>
          {features.map((f, i) => (
            <View key={i} style={[styles.featureRow, { borderBottomColor: theme.border }]}>
              <View style={[styles.featureIcon, { backgroundColor: `${theme.accent}10` }]}>
                <Feather name={f.icon as any} size={16} color={theme.accent} />
              </View>
              <ThemedText type="body" style={{ flex: 1, fontSize: 14 }}>
                {f.label}
              </ThemedText>
              <Feather name="check" size={16} color={theme.accent} />
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[
        styles.bottomBar,
        {
          backgroundColor: theme.backgroundRoot,
          paddingBottom: tabBarHeight + Spacing.md,
          borderTopColor: theme.border,
        },
        useMaxWidth ? { maxWidth: 560, alignSelf: "center" as const, width: "100%" as const } : undefined,
      ]}>
        <Pressable
          onPress={handleUpgrade}
          style={[styles.upgradeBtn, { backgroundColor: theme.accent }]}
          testID="button-progate-upgrade"
        >
          <Feather name="zap" size={18} color="#FFFFFF" />
          <ThemedText type="body" style={styles.upgradeBtnText}>
            Upgrade to {tierLabel}
          </ThemedText>
        </Pressable>

        <ThemedText type="caption" style={[styles.priceNote, { color: theme.textSecondary }]}>
          {minTier === "starter" ? "From $19/month" : minTier === "growth" ? "From $49/month" : "From $99/month"}
        </ThemedText>

        {restoreMsg ? (
          <ThemedText type="caption" style={[styles.restoreMsg, { color: restoreMsg.startsWith("Subscription restored") ? theme.success : theme.textSecondary }]}>
            {restoreMsg}
          </ThemedText>
        ) : null}

        <Pressable
          onPress={handleRestore}
          disabled={restoring}
          style={styles.restoreBtn}
          testID="button-progate-restore"
        >
          {restoring ? (
            <ActivityIndicator size="small" color={theme.textSecondary} />
          ) : (
            <ThemedText type="caption" style={[styles.restoreText, { color: theme.textSecondary }]}>
              Already subscribed? Restore purchases
            </ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function useProGate(minTier: PlanTier = "growth") {
  const { hasAccess, isLoading } = usePlanGate(minTier);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const requireTier = (callback?: () => void) => {
    if (hasAccess) {
      callback?.();
      return true;
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    navigation.navigate("Paywall", { trigger_source: "feature_gate", required_tier: minTier });
    return false;
  };

  return { hasAccess, isLoading, requireTier };
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingCenter: { alignItems: "center", justifyContent: "center" },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    flexGrow: 1,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  title: { textAlign: "center", marginBottom: Spacing.xs },
  subtitle: { textAlign: "center", marginBottom: Spacing.xl, paddingHorizontal: Spacing.lg },
  featureList: { width: "100%", marginBottom: Spacing.xl },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  upgradeBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 17 },
  priceNote: { marginTop: Spacing.sm, textAlign: "center" },
  restoreBtn: { marginTop: Spacing.md, paddingVertical: Spacing.xs },
  restoreText: { textDecorationLine: "underline" },
  restoreMsg: { marginTop: Spacing.sm, textAlign: "center" },
});
