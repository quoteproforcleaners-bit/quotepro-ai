import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  ScrollView,
  useWindowDimensions,
  Animated,
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

const TRUST_BADGES = [
  { icon: "check-circle" as const, label: "Built for cleaning companies" },
  { icon: "award" as const, label: "Professional customer-facing quotes" },
  { icon: "trending-up" as const, label: "Increase average ticket size" },
];

const PRICING_TIERS = [
  { id: "good", label: "Good", price: "$180", desc: "Basic clean", popular: false },
  { id: "better", label: "Better", price: "$240", desc: "Deep clean", popular: true },
  { id: "best", label: "Best", price: "$320", desc: "Premium", popular: false },
];

const OUTCOME_FEATURES = [
  { icon: "zap" as const, titleKey: "winMoreJobs", descKey: "winMoreJobsDesc" },
  { icon: "bell" as const, titleKey: "neverMissFollowUps", descKey: "neverMissFollowUpsDesc" },
  { icon: "award" as const, titleKey: "lookMoreProfessional", descKey: "lookMoreProfessionalDesc" },
  { icon: "trending-up" as const, titleKey: "growRevenueFaster", descKey: "growRevenueFasterDesc" },
];

function LanguageSelector({ language, setLanguage }: { language: Language; setLanguage: (l: Language) => void }) {
  const { theme } = useTheme();
  return (
    <View style={styles.languageRow}>
      {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => {
        const active = language === lang;
        return (
          <Pressable
            key={lang}
            onPress={() => setLanguage(lang)}
            style={[
              styles.languageChip,
              {
                backgroundColor: active ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.06)",
                borderColor: active ? theme.primary : "rgba(255,255,255,0.10)",
              },
            ]}
          >
            <ThemedText
              type="small"
              style={{
                color: active ? theme.primary : "rgba(255,255,255,0.45)",
                fontWeight: active ? "700" : "400",
                fontSize: 12,
              }}
            >
              {LANGUAGE_LABELS[lang]}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function HeroSection() {
  const { theme } = useTheme();
  return (
    <View style={styles.heroSection}>
      <View style={styles.logoWrapper}>
        <Image source={appIcon} style={styles.appLogo} />
        <View style={styles.logoGlow} />
      </View>
      <ThemedText style={styles.appName}>QuotePro</ThemedText>
      <ThemedText style={styles.headline}>
        Close More Cleaning{"\n"}Jobs in 30 Seconds
      </ThemedText>
      <ThemedText style={[styles.subheadline, { color: "rgba(255,255,255,0.55)" }]}>
        Create professional Good / Better / Best quotes{"\n"}that help customers say yes faster.
      </ThemedText>
    </View>
  );
}

function TrustBadges() {
  return (
    <View style={styles.trustRow}>
      {TRUST_BADGES.map((badge, i) => (
        <View key={i} style={styles.trustBadge}>
          <Feather name={badge.icon} size={12} color="#3B82F6" />
          <ThemedText style={styles.trustLabel}>{badge.label}</ThemedText>
        </View>
      ))}
    </View>
  );
}

function SampleQuoteCard() {
  const { theme } = useTheme();
  const [selected, setSelected] = useState("better");

  return (
    <View style={styles.quoteCard}>
      <View style={styles.quoteCardInner}>
        <View style={styles.quoteCardHeader}>
          <View style={styles.sampleBadge}>
            <Feather name="eye" size={10} color="#3B82F6" />
            <ThemedText style={styles.sampleBadgeText}>SEE WHAT YOUR CUSTOMER SEES</ThemedText>
          </View>
        </View>

        <View style={styles.propertyRow}>
          <Feather name="home" size={13} color="rgba(255,255,255,0.4)" />
          <ThemedText style={styles.propertyLabel}>3 bed / 2 bath home</ThemedText>
        </View>

        <View style={styles.tiersRow}>
          {PRICING_TIERS.map((tier) => {
            const isSelected = selected === tier.id;
            return (
              <Pressable
                key={tier.id}
                onPress={() => setSelected(tier.id)}
                style={[
                  styles.tierCard,
                  isSelected
                    ? { backgroundColor: "rgba(59,130,246,0.18)", borderColor: "#3B82F6" }
                    : { backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" },
                ]}
              >
                {tier.popular ? (
                  <View style={styles.popularPill}>
                    <ThemedText style={styles.popularPillText}>POPULAR</ThemedText>
                  </View>
                ) : null}
                <ThemedText
                  style={[
                    styles.tierLabel,
                    { color: isSelected ? "#3B82F6" : "rgba(255,255,255,0.45)" },
                  ]}
                >
                  {tier.label}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.tierPrice,
                    { color: isSelected ? "#FFFFFF" : "rgba(255,255,255,0.7)" },
                  ]}
                >
                  {tier.price}
                </ThemedText>
                <ThemedText style={styles.tierDesc}>{tier.desc}</ThemedText>
              </Pressable>
            );
          })}
        </View>

        <ThemedText style={styles.quoteFootnote}>
          Customers are more likely to choose mid-tier and premium options when presented clearly.
        </ThemedText>
      </View>
    </View>
  );
}

function PrimaryCTA({ onPress }: { onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
  };

  return (
    <View style={styles.ctaWrapper}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }], width: "100%" }}>
        <Pressable
          style={styles.primaryButton}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          testID="button-create-free-quote"
        >
          <View style={styles.primaryButtonGlow} />
          <Feather name="file-text" size={18} color="#FFFFFF" />
          <ThemedText style={styles.primaryButtonText}>Create Free Quote</ThemedText>
          <Feather name="arrow-right" size={16} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
        </Pressable>
      </Animated.View>
      <ThemedText style={styles.ctaSubtext}>No complicated setup</ThemedText>
    </View>
  );
}

function SecondaryCTA({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      style={styles.secondaryButton}
      onPress={onPress}
      testID="button-sign-in"
    >
      <Feather name="log-in" size={15} color="rgba(255,255,255,0.5)" />
      <ThemedText style={styles.secondaryButtonText}>Sign In to Your Account</ThemedText>
    </Pressable>
  );
}

function ReassuranceFooter({ onWhyTap }: { onWhyTap: () => void }) {
  return (
    <View style={styles.footer}>
      <ThemedText style={styles.reassuranceLine}>
        Save quotes, send them to customers, and close jobs faster.
      </ThemedText>
      <ThemedText style={styles.testimonialLine}>
        Cleaning companies use QuotePro to present higher-value options with confidence.
      </ThemedText>
      <Pressable onPress={onWhyTap} testID="button-why-account">
        <ThemedText style={styles.whyLink}>Why create a free account?</ThemedText>
      </Pressable>
    </View>
  );
}

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { enterGuestMode } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [showBenefits, setShowBenefits] = useState(false);
  const { width } = useWindowDimensions();

  const landing = t.landing;
  const isWide = width > 600;
  const maxWidth = isWide ? 540 : undefined;

  const handleCreateQuote = () => {
    enterGuestMode();
    navigation.navigate("GuestQuoteCalculator" as any);
  };

  const handleSignIn = () => {
    navigation.navigate("Login");
  };

  return (
    <View style={[styles.root, { backgroundColor: "#06060A" }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.sm,
            paddingBottom: insets.bottom + Spacing.xl,
            maxWidth: maxWidth,
            alignSelf: isWide ? "center" : undefined,
            width: isWide ? maxWidth : undefined,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <LanguageSelector language={language} setLanguage={setLanguage} />
        <HeroSection />
        <TrustBadges />
        <SampleQuoteCard />
        <PrimaryCTA onPress={handleCreateQuote} />

        <View style={styles.orDivider}>
          <View style={styles.orLine} />
          <ThemedText style={styles.orText}>or</ThemedText>
          <View style={styles.orLine} />
        </View>

        <SecondaryCTA onPress={handleSignIn} />
        <ReassuranceFooter onWhyTap={() => setShowBenefits(true)} />
      </ScrollView>

      <Modal visible={showBenefits} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowBenefits(false)}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: "#111118",
                paddingBottom: insets.bottom + Spacing.lg,
                maxWidth: maxWidth,
                alignSelf: isWide ? "center" : undefined,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalDragHandle} />
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>{landing.benefitsTitle}</ThemedText>
              <Pressable onPress={() => setShowBenefits(false)} hitSlop={16}>
                <Feather name="x" size={20} color="rgba(255,255,255,0.4)" />
              </Pressable>
            </View>
            {OUTCOME_FEATURES.map((b, i) => (
              <View
                key={i}
                style={[
                  styles.benefitRow,
                  i < OUTCOME_FEATURES.length - 1 && { borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
                ]}
              >
                <View style={styles.benefitIcon}>
                  <Feather name={b.icon} size={17} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.benefitTitle}>
                    {landing[b.titleKey as keyof typeof landing]}
                  </ThemedText>
                  <ThemedText style={styles.benefitDesc}>
                    {landing[b.descKey as keyof typeof landing]}
                  </ThemedText>
                </View>
              </View>
            ))}
            <Pressable
              style={styles.modalPrimaryButton}
              onPress={() => {
                setShowBenefits(false);
                handleSignIn();
              }}
            >
              <ThemedText style={styles.modalPrimaryButtonText}>
                {landing.signUpNow}
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const BLUE = "#3B82F6";

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },

  languageRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  languageChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },

  heroSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoWrapper: {
    position: "relative",
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  appLogo: {
    width: 72,
    height: 72,
    borderRadius: 18,
  },
  logoGlow: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(59,130,246,0.18)",
    zIndex: -1,
  },
  appName: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  headline: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subheadline: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    fontWeight: "400",
  },

  trustRow: {
    gap: 6,
    marginBottom: 24,
    alignItems: "center",
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trustLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "400",
  },

  quoteCard: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  quoteCardInner: {
    padding: 18,
  },
  quoteCardHeader: {
    alignItems: "center",
    marginBottom: 14,
  },
  sampleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(59,130,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.2)",
  },
  sampleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: BLUE,
    letterSpacing: 0.8,
  },
  propertyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 14,
  },
  propertyLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "500",
  },
  tiersRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  tierCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
    position: "relative",
  },
  popularPill: {
    position: "absolute",
    top: -10,
    backgroundColor: BLUE,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  popularPillText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  tierLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  tierPrice: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  tierDesc: {
    fontSize: 10,
    color: "rgba(255,255,255,0.3)",
    fontWeight: "400",
  },
  quoteFootnote: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
    lineHeight: 16,
    fontStyle: "italic",
  },

  ctaWrapper: {
    alignItems: "center",
    marginBottom: 12,
    width: "100%",
  },
  primaryButton: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    overflow: "hidden",
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  primaryButtonGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  ctaSubtext: {
    marginTop: 8,
    fontSize: 12,
    color: "rgba(255,255,255,0.3)",
    fontWeight: "400",
  },

  orDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
    gap: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  orText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.25)",
    fontWeight: "500",
  },

  secondaryButton: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 28,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
  },

  footer: {
    alignItems: "center",
    gap: 6,
  },
  reassuranceLine: {
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    fontWeight: "400",
    lineHeight: 18,
  },
  testimonialLine: {
    fontSize: 12,
    color: "rgba(255,255,255,0.22)",
    textAlign: "center",
    lineHeight: 17,
    fontStyle: "italic",
  },
  whyLink: {
    marginTop: 4,
    fontSize: 13,
    color: BLUE,
    fontWeight: "600",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    width: "100%",
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    gap: 14,
  },
  benefitIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: "rgba(59,130,246,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 18,
  },
  modalPrimaryButton: {
    marginTop: 20,
    width: "100%",
    height: 52,
    borderRadius: 14,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
