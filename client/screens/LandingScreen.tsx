import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  ScrollView,
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

type HeadlineVariant = "A" | "B" | "C" | "D";
const ONBOARDING_HEADLINE_VARIANT: HeadlineVariant = "A";

const COPY = {
  headline: {
    A: "Close More Cleaning Jobs\nin 30 Seconds",
    B: "Stop Losing Jobs\nto Better Quotes",
    C: "Turn Quotes Into\nClosed Jobs With AI",
    D: "Add $5,000/Month\nWith Better Quotes",
  } as Record<HeadlineVariant, string>,
  tension: "Most cleaners lose jobs because their quotes look unprofessional. Fix it in minutes.",
  cta: "createFreeQuote",
  noAccount: "noAccountNeeded",
  speedLine: "speedLine",
  trust1: "builtBy",
  trust2: "designedToHelp",
  previewTitle: "previewTitle",
  previewCaption: "previewSubline",
  signIn: "signIn",
  saveLink: "whyCreateAccount",
};

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
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top + Spacing.md }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + Spacing.xl,
            maxWidth: containerMaxWidth,
            alignSelf: isWide ? "center" : undefined,
            width: isWide ? containerMaxWidth : undefined,
          },
        ]}
        showsVerticalScrollIndicator={false}
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
          <ThemedText type="h1" style={[styles.appName, { color: theme.text }]}>
            QuotePro
          </ThemedText>
          <ThemedText type="h3" style={styles.headline}>
            {landing.tagline || COPY.headline[ONBOARDING_HEADLINE_VARIANT]}
          </ThemedText>
          <ThemedText type="small" style={[styles.tensionText, { color: theme.textSecondary }]}>
            {landing.tensionCopy || COPY.tension}
          </ThemedText>
        </View>

        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          onPress={handleCreateQuote}
          testID="button-create-free-quote"
        >
          <Feather name="file-text" size={20} color="#FFFFFF" />
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: Spacing.sm }}>
            {landing[COPY.cta as keyof typeof landing]}
          </ThemedText>
        </Pressable>

        <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
          {landing[COPY.noAccount as keyof typeof landing]}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", marginTop: 4, opacity: 0.6 }}>
          {landing[COPY.speedLine as keyof typeof landing] || "Start in under 30 seconds."}
        </ThemedText>

        <View style={[styles.proofSection, { marginTop: Spacing.md }]}>
          <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }}>
            {landing[COPY.trust1 as keyof typeof landing]}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", marginTop: 2 }}>
            {landing[COPY.trust2 as keyof typeof landing]}
          </ThemedText>
        </View>

        <View style={[styles.previewCard, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", borderColor: theme.border }]}>
          <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: "600", marginBottom: Spacing.sm, textAlign: "center" }}>
            {landing[COPY.previewTitle as keyof typeof landing]}
          </ThemedText>
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
          <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
            {landing[COPY.previewCaption as keyof typeof landing]}
          </ThemedText>
        </View>

        <View style={[styles.divider, { marginVertical: Spacing.lg }]}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <ThemedText type="small" style={{ marginHorizontal: Spacing.md, color: theme.textSecondary }}>
            {t.common.or}
          </ThemedText>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        <Pressable
          style={[styles.secondaryButton, { borderColor: theme.border }]}
          onPress={handleSignIn}
          testID="button-sign-in"
        >
          <Feather name="log-in" size={18} color={theme.textSecondary} />
          <ThemedText type="body" style={{ fontWeight: "600", marginLeft: Spacing.sm, color: theme.textSecondary }}>
            {landing[COPY.signIn as keyof typeof landing]}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => setShowBenefits(true)}
          style={styles.benefitsLink}
          testID="button-why-account"
        >
          <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
            {landing[COPY.saveLink as keyof typeof landing]}
          </ThemedText>
        </Pressable>

        <View style={[styles.featuresGrid, { marginTop: Spacing.xl }]}>
          {OUTCOME_FEATURES.map((b, i) => (
            <View key={i} style={styles.featureCard}>
              <Feather name={b.icon} size={22} color={theme.primary} />
              <ThemedText type="small" style={{ fontWeight: "600", marginTop: Spacing.xs, textAlign: "center", color: theme.textSecondary }}>
                {landing[b.titleKey as keyof typeof landing]}
              </ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>

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
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
  },
  languageRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    flexWrap: "wrap",
  },
  languageChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
  },
  branding: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  appLogo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    marginBottom: Spacing.sm,
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 4,
  },
  headline: {
    textAlign: "center",
    marginBottom: Spacing.xs,
    maxWidth: 320,
  },
  tensionText: {
    textAlign: "center",
    maxWidth: 300,
    lineHeight: 20,
  },
  primaryButton: {
    width: "100%",
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  secondaryButton: {
    width: "100%",
    height: 46,
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
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  benefitsLink: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  proofSection: {
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  previewCard: {
    width: "100%",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
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
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    justifyContent: "center",
    width: "100%",
  },
  featureCard: {
    width: "47%",
    paddingVertical: Spacing.md,
    alignItems: "center",
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
