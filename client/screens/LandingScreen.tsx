import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  ScrollView,
  Platform,
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

const BENEFITS = [
  { icon: "zap" as const, titleKey: "instantQuotes", descKey: "instantQuotesDesc" },
  { icon: "users" as const, titleKey: "customerManagement", descKey: "customerManagementDesc" },
  { icon: "calendar" as const, titleKey: "jobScheduling", descKey: "jobSchedulingDesc" },
  { icon: "trending-up" as const, titleKey: "growthTools", descKey: "growthToolsDesc" },
];

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { enterGuestMode } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [showBenefits, setShowBenefits] = useState(false);

  const landing = t.landing;

  const handleCreateQuote = () => {
    enterGuestMode();
    navigation.navigate("GuestQuoteCalculator" as any);
  };

  const handleSignIn = () => {
    navigation.navigate("Login");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top + Spacing.xl }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
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
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
            {landing.tagline}
          </ThemedText>
        </View>

        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          onPress={handleCreateQuote}
          testID="button-create-free-quote"
        >
          <Feather name="file-text" size={20} color="#FFFFFF" />
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: Spacing.sm }}>
            {landing.createFreeQuote}
          </ThemedText>
        </Pressable>

        <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
          {landing.noAccountNeeded}
        </ThemedText>

        <View style={[styles.divider, { marginVertical: Spacing["2xl"] }]}>
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
          <Feather name="log-in" size={18} color={theme.text} />
          <ThemedText type="body" style={{ fontWeight: "600", marginLeft: Spacing.sm }}>
            {landing.signIn}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => setShowBenefits(true)}
          style={styles.benefitsLink}
          testID="button-why-account"
        >
          <Feather name="info" size={14} color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600", marginLeft: 6 }}>
            {landing.whyCreateAccount}
          </ThemedText>
        </Pressable>

        <View style={[styles.featuresGrid, { marginTop: Spacing["3xl"] }]}>
          {BENEFITS.map((b, i) => (
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
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle" style={{ fontWeight: "700", flex: 1 }}>
                {landing.benefitsTitle}
              </ThemedText>
              <Pressable onPress={() => setShowBenefits(false)} hitSlop={12}>
                <Feather name="x" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
            {BENEFITS.map((b, i) => (
              <View key={i} style={[styles.benefitRow, i < BENEFITS.length - 1 ? { borderBottomWidth: 1, borderBottomColor: theme.border } : undefined]}>
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
    marginBottom: Spacing["2xl"],
  },
  languageChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
  },
  branding: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  appLogo: {
    width: 88,
    height: 88,
    borderRadius: 22,
    marginBottom: Spacing.lg,
  },
  appName: {
    fontSize: 34,
    fontWeight: "800",
    marginBottom: Spacing.sm,
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
    height: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
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
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
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
