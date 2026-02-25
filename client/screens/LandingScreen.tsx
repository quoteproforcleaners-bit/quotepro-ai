import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { LANGUAGE_LABELS, type Language } from "@/i18n";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const appIcon = require("../../assets/images/icon.png");

const OUTCOME_FEATURES = [
  { icon: "zap" as const, titleKey: "winMoreJobs", descKey: "winMoreJobsDesc" },
  { icon: "bell" as const, titleKey: "neverMissFollowUps", descKey: "neverMissFollowUpsDesc" },
  { icon: "award" as const, titleKey: "lookMoreProfessional", descKey: "lookMoreProfessionalDesc" },
  { icon: "trending-up" as const, titleKey: "growRevenueFaster", descKey: "growRevenueFasterDesc" },
];

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { enterGuestMode } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [showBenefits, setShowBenefits] = useState(false);
  const { width } = useWindowDimensions();

  const landing = t.landing;
  const isWide = width > 600;
  const containerMaxWidth = isWide ? 540 : undefined;

  const handleCreateQuote = () => {
    enterGuestMode();
    navigation.navigate("GuestQuoteCalculator" as any);
  };

  const handleSignIn = () => {
    navigation.navigate("Login");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.md,
            paddingBottom: insets.bottom + Spacing.md,
            maxWidth: containerMaxWidth,
            alignSelf: isWide ? "center" : undefined,
            width: isWide ? containerMaxWidth : undefined,
          },
        ]}
      >
        <View style={styles.languageRow}>
          {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => (
            <Pressable
              key={lang}
              onPress={() => setLanguage(lang)}
              style={[
                styles.languageChip,
                {
                  borderColor: language === lang ? theme.primary : theme.border,
                  backgroundColor: language === lang ? `${theme.primary}10` : "transparent",
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color: language === lang ? theme.primary : theme.textSecondary,
                  fontWeight: language === lang ? "600" : "400",
                }}
              >
                {LANGUAGE_LABELS[lang]}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.branding}>
          <Image source={appIcon} style={styles.appLogo} />
          <ThemedText type="h2" style={[styles.appName, { color: theme.text }]}>
            QuotePro
          </ThemedText>
          <ThemedText type="body" style={[styles.headline, { color: theme.textSecondary }]}>
            {landing.tagline}
          </ThemedText>
        </View>

        <View style={styles.previewCard}>
          <View style={styles.previewTiers}>
            {[
              { label: landing.previewGood || "Good", price: "$180" },
              { label: landing.previewBetter || "Better", price: "$240" },
              { label: landing.previewBest || "Best", price: "$320" },
            ].map((tier, i) => (
              <View
                key={i}
                style={[
                  styles.previewTier,
                  {
                    backgroundColor: i === 1 ? theme.primary + "15" : isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.01)",
                    borderColor: i === 1 ? theme.primary : theme.border,
                  },
                ]}
              >
                <ThemedText type="caption" style={{ color: i === 1 ? theme.primary : theme.textSecondary, fontWeight: "600" }}>
                  {tier.label}
                </ThemedText>
                <ThemedText type="subtitle" style={{ color: i === 1 ? theme.primary : theme.text, fontWeight: "700" }}>
                  {tier.price}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.buttonsSection}>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={handleCreateQuote}
            testID="button-create-free-quote"
          >
            <Feather name="file-text" size={18} color="#FFFFFF" />
            <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: Spacing.sm }}>
              {landing.createFreeQuote}
            </ThemedText>
          </Pressable>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <ThemedText type="small" style={{ marginHorizontal: Spacing.sm, color: theme.textSecondary }}>
              {t.common.or}
            </ThemedText>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          <Pressable
            style={[styles.secondaryButton, { borderColor: theme.border }]}
            onPress={handleSignIn}
            testID="button-sign-in"
          >
            <Feather name="log-in" size={16} color={theme.textSecondary} />
            <ThemedText type="body" style={{ fontWeight: "600", marginLeft: Spacing.sm, color: theme.textSecondary }}>
              {landing.signIn}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => setShowBenefits(true)}
            style={styles.benefitsLink}
            testID="button-why-account"
          >
            <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
              {landing.whyCreateAccount}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <Modal visible={showBenefits} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowBenefits(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault, maxWidth: containerMaxWidth, alignSelf: isWide ? "center" : undefined }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle" style={{ fontWeight: "700", flex: 1 }}>
                {landing.benefitsTitle}
              </ThemedText>
              <Pressable onPress={() => setShowBenefits(false)} hitSlop={12}>
                <Feather name="x" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
            {OUTCOME_FEATURES.map((b, i) => (
              <View key={i} style={[styles.benefitRow, i < OUTCOME_FEATURES.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.border } : undefined]}>
                <View style={[styles.benefitIcon, { backgroundColor: `${theme.primary}12` }]}>
                  <Feather name={b.icon} size={18} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    {landing[b.titleKey as keyof typeof landing]}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                    {landing[b.descKey as keyof typeof landing]}
                  </ThemedText>
                </View>
              </View>
            ))}
            <Pressable
              style={[styles.primaryButton, { backgroundColor: theme.primary, marginTop: Spacing.lg }]}
              onPress={() => {
                setShowBenefits(false);
                handleSignIn();
              }}
            >
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                {landing.signUpNow}
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
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: "center",
  },
  languageRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
    flexWrap: "wrap",
  },
  languageChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  branding: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  appLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    marginBottom: Spacing.sm,
  },
  appName: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 2,
  },
  headline: {
    textAlign: "center",
    maxWidth: 300,
  },
  previewCard: {
    width: "100%",
    marginBottom: Spacing.lg,
  },
  previewTiers: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  previewTier: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  buttonsSection: {
    alignItems: "center",
  },
  primaryButton: {
    width: "100%",
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  secondaryButton: {
    width: "100%",
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    opacity: 0.85,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  benefitsLink: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
