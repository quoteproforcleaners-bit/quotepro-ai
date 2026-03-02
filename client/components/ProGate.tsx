import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/context/SubscriptionContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useLanguage } from "@/context/LanguageContext";

interface ProGateProps {
  children: React.ReactNode;
  featureName?: string;
}

export function ProGate({ children, featureName }: ProGateProps) {
  const { isPro, isLoading } = useSubscription();

  if (isLoading) {
    return <>{children}</>;
  }

  if (isPro) {
    return <>{children}</>;
  }

  return <ProGateOverlay featureName={featureName} />;
}

function ProGateOverlay({ featureName }: { featureName?: string }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { t } = useLanguage();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;

  const tabBarHeight = useBottomTabBarHeight();

  const handleUpgrade = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    navigation.navigate("Paywall");
  };

  const FEATURES = [
    { icon: "users" as const, label: t.paywall.crmAccess },
    { icon: "calendar" as const, label: t.paywall.jobScheduling },
    { icon: "edit-3" as const, label: t.paywall.aiMessages },
    { icon: "trending-up" as const, label: t.paywall.smartDescriptions },
    { icon: "send" as const, label: t.paywall.directSending },
    { icon: "refresh-cw" as const, label: t.paywall.regeneration },
  ];

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
          {featureName ? `${featureName}` : "Pro Feature"}
        </ThemedText>

        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          {t.paywall.subtitle}
        </ThemedText>

        <View style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={[styles.featureRow, { borderBottomColor: theme.border }]}>
              <View style={[styles.featureIcon, { backgroundColor: `${theme.accent}10` }]}>
                <Feather name={f.icon} size={16} color={theme.accent} />
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
            {t.paywall.subscribeNow}
          </ThemedText>
        </Pressable>

        <ThemedText type="caption" style={[styles.priceNote, { color: theme.textSecondary }]}>
          $19.99/month
        </ThemedText>
      </View>
    </View>
  );
}

export function useProGate() {
  const { isPro, isLoading } = useSubscription();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const requirePro = (callback?: () => void) => {
    if (isPro) {
      callback?.();
      return true;
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    navigation.navigate("Paywall");
    return false;
  };

  return { isPro, isLoading, requirePro };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  title: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  featureList: {
    width: "100%",
    marginBottom: Spacing.xl,
  },
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
  upgradeBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
  },
  priceNote: {
    marginTop: Spacing.sm,
    textAlign: "center",
  },
});
