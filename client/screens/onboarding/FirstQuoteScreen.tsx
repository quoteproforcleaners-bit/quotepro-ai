import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import * as SMS from "expo-sms";
import * as MailComposer from "expo-mail-composer";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  calculateQuoteOption,
  calculateBaseHours,
  getServiceTypeById,
} from "@/lib/quoteCalculator";
import {
  HomeDetails,
  AddOns,
  PricingSettings,
  DEFAULT_PRICING_SETTINGS,
  QuoteOption,
} from "@/types";

const MAX_CONTENT_WIDTH = 560;

const CLEANING_TYPES = [
  { id: "regular", label: "Standard Clean" },
  { id: "deep-clean", label: "Deep Clean" },
  { id: "move-in-out", label: "Move-Out Clean" },
];

const EMPTY_ADDONS: AddOns = {
  insideFridge: false,
  insideOven: false,
  insideCabinets: false,
  interiorWindows: false,
  blindsDetail: false,
  baseboardsDetail: false,
  laundryFoldOnly: false,
  dishes: false,
  organizationTidy: false,
  biannualDeepClean: false,
};

interface Props {
  pricingSettings: PricingSettings;
  onComplete: (quoteDetails: {
    total: number;
    tierName: string;
    homeDetails: any;
    tiers: any;
  }) => void;
}

type Phase = "welcome" | "input" | "results";

export default function FirstQuoteScreen({ pricingSettings, onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > MAX_CONTENT_WIDTH + 40;

  const [phase, setPhase] = useState<Phase>("welcome");
  const [sqft, setSqft] = useState("1500");
  const [beds, setBeds] = useState("3");
  const [baths, setBaths] = useState("2");
  const [selectedType, setSelectedType] = useState("regular");
  const [copiedLink, setCopiedLink] = useState(false);

  const settings = pricingSettings || DEFAULT_PRICING_SETTINGS;

  const results = useMemo(() => {
    if (phase !== "results") return null;
    const homeDetails: HomeDetails = {
      sqft: parseInt(sqft) || 1500,
      beds: parseInt(beds) || 3,
      baths: parseInt(baths) || 2,
      halfBaths: 0,
      conditionScore: 5,
      peopleCount: 2,
      petType: "none",
      petShedding: false,
      homeType: "house",
      kitchensCount: 1,
    };

    const typeIds = ["regular", "deep-clean", "move-in-out"];
    const options: { id: string; label: string; option: QuoteOption; recommended: boolean }[] = [];
    typeIds.forEach((id) => {
      const svc = getServiceTypeById(settings, id);
      if (svc) {
        const opt = calculateQuoteOption(homeDetails, EMPTY_ADDONS, "one-time", svc, settings, svc.name);
        options.push({
          id,
          label: id === "regular" ? "Standard Clean" : id === "deep-clean" ? "Deep Clean" : "Move-Out Clean",
          option: opt,
          recommended: id === selectedType,
        });
      }
    });
    return { homeDetails, options };
  }, [phase, sqft, beds, baths, selectedType, settings]);

  const handleStart = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase("input");
  };

  const handleGenerate = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPhase("results");
  };

  const handleContinueToDashboard = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const recommended = results?.options.find((o) => o.recommended) || results?.options[0];
    onComplete({
      total: recommended?.option.price || 0,
      tierName: recommended?.option.serviceTypeName || "Standard",
      homeDetails: results?.homeDetails,
      tiers: results?.options,
    });
  };

  const getQuoteSummary = () => {
    if (!results) return "";
    const lines = results.options.map(
      (o) => `${o.label}: $${o.option.price}`
    );
    return `Cleaning Quote\n${parseInt(sqft).toLocaleString()} sq ft | ${beds} bed | ${baths} bath\n\n${lines.join("\n")}\n\nGenerated with QuotePro`;
  };

  const handleSendText = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "web") {
      await Clipboard.setStringAsync(getQuoteSummary());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      return;
    }
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      await SMS.sendSMSAsync([], getQuoteSummary());
    }
  };

  const handleSendEmail = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "web") {
      const subject = encodeURIComponent("Your Cleaning Quote");
      const body = encodeURIComponent(getQuoteSummary());
      window.open(`mailto:?subject=${subject}&body=${body}`);
      return;
    }
    const isAvailable = await MailComposer.isAvailableAsync();
    if (isAvailable) {
      await MailComposer.composeAsync({
        subject: "Your Cleaning Quote",
        body: getQuoteSummary(),
      });
    }
  };

  const handleCopyLink = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(getQuoteSummary());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const NumberStepper = ({
    value,
    onValueChange,
    min,
    max,
    label,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    min: number;
    max: number;
    label: string;
  }) => {
    const num = parseInt(value) || min;
    return (
      <View style={[styles.stepperContainer, { flex: 1 }]}>
        <ThemedText type="subtitle" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>
          {label}
        </ThemedText>
        <View style={[styles.stepperRow, { borderColor: theme.border }]}>
          <Pressable
            onPress={() => {
              if (num > min) onValueChange(String(num - 1));
              if (Platform.OS !== "web") Haptics.selectionAsync();
            }}
            style={[styles.compactStepperBtn, { borderRightWidth: 1, borderColor: theme.border }]}
          >
            <Feather name="minus" size={18} color={num <= min ? theme.textSecondary + "40" : theme.text} />
          </Pressable>
          <View style={styles.stepperValue}>
            <ThemedText type="h3">{num}</ThemedText>
          </View>
          <Pressable
            onPress={() => {
              if (num < max) onValueChange(String(num + 1));
              if (Platform.OS !== "web") Haptics.selectionAsync();
            }}
            style={[styles.compactStepperBtn, { borderLeftWidth: 1, borderColor: theme.border }]}
          >
            <Feather name="plus" size={18} color={num >= max ? theme.textSecondary + "40" : theme.text} />
          </Pressable>
        </View>
      </View>
    );
  };

  const SqftStepper = () => {
    const num = parseInt(sqft) || 500;
    const step = 100;
    return (
      <View style={styles.stepperContainer}>
        <ThemedText type="subtitle" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>
          Square Footage
        </ThemedText>
        <View style={[styles.stepperRow, { borderColor: theme.border }]}>
          <Pressable
            onPress={() => {
              if (num > 500) setSqft(String(num - step));
              if (Platform.OS !== "web") Haptics.selectionAsync();
            }}
            style={[styles.stepperBtn, { borderRightWidth: 1, borderColor: theme.border }]}
          >
            <Feather name="minus" size={20} color={num <= 500 ? theme.textSecondary + "40" : theme.text} />
          </Pressable>
          <View style={styles.stepperValue}>
            <ThemedText type="h3">{num.toLocaleString()}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>sq ft</ThemedText>
          </View>
          <Pressable
            onPress={() => {
              if (num < 10000) setSqft(String(num + step));
              if (Platform.OS !== "web") Haptics.selectionAsync();
            }}
            style={[styles.stepperBtn, { borderLeftWidth: 1, borderColor: theme.border }]}
          >
            <Feather name="plus" size={20} color={num >= 10000 ? theme.textSecondary + "40" : theme.text} />
          </Pressable>
        </View>
      </View>
    );
  };

  if (phase === "welcome") {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <ScrollView
          contentContainerStyle={[
            styles.welcomeContent,
            {
              paddingTop: insets.top + Spacing["3xl"],
              paddingBottom: insets.bottom + Spacing["3xl"],
            },
            useMaxWidth ? { alignItems: "center" } : undefined,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={useMaxWidth ? { maxWidth: MAX_CONTENT_WIDTH, width: "100%" } : { width: "100%" }}>
            <View style={styles.welcomeIconWrap}>
              <View style={[styles.welcomeIcon, { backgroundColor: theme.primary + "15" }]}>
                <Feather name="file-text" size={40} color={theme.primary} />
              </View>
            </View>

            <ThemedText type="h1" style={styles.welcomeTitle}>
              Create Your First Cleaning Quote in 30 Seconds
            </ThemedText>

            <ThemedText type="body" style={[styles.welcomeSubtitle, { color: theme.textSecondary }]}>
              See exactly how much to charge based on the property details. No guesswork.
            </ThemedText>

            <View style={styles.welcomeFeatures}>
              {[
                { icon: "zap" as const, text: "Instant pricing based on your rates" },
                { icon: "layers" as const, text: "Standard, Deep Clean, and Move-Out options" },
                { icon: "send" as const, text: "Share with your customer instantly" },
              ].map((f) => (
                <View key={f.text} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: theme.primary + "10" }]}>
                    <Feather name={f.icon} size={16} color={theme.primary} />
                  </View>
                  <ThemedText type="body" style={{ flex: 1, color: theme.text }}>
                    {f.text}
                  </ThemedText>
                </View>
              ))}
            </View>

            <Pressable
              testID="button-generate-first-quote"
              onPress={handleStart}
              style={{ borderRadius: BorderRadius.md, overflow: "hidden", marginTop: Spacing.xl }}
            >
              <LinearGradient
                colors={[theme.primary, "#1D4ED8"]}
                style={styles.ctaButton}
              >
                <Feather name="zap" size={22} color="#FFFFFF" />
                <ThemedText type="h3" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                  Generate My First Quote
                </ThemedText>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (phase === "input") {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + Spacing.xl,
              paddingBottom: insets.bottom + Spacing["3xl"],
            },
            useMaxWidth ? { alignItems: "center" } : undefined,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={useMaxWidth ? { maxWidth: MAX_CONTENT_WIDTH, width: "100%" } : { width: "100%" }}>
            <Pressable onPress={() => setPhase("welcome")} style={styles.backBtn} hitSlop={12}>
              <Feather name="arrow-left" size={22} color={theme.text} />
            </Pressable>

            <ThemedText type="h2" style={{ marginBottom: Spacing.xs }}>
              Property Details
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.xl }}>
              Enter the basics to get an instant quote
            </ThemedText>

            <SqftStepper />

            <View style={styles.twoCol}>
              <NumberStepper value={beds} onValueChange={setBeds} min={1} max={10} label="Bedrooms" />
              <NumberStepper value={baths} onValueChange={setBaths} min={1} max={10} label="Bathrooms" />
            </View>

            <ThemedText type="subtitle" style={{ color: theme.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.lg }}>
              Cleaning Type
            </ThemedText>
            <View style={styles.typeGrid}>
              {CLEANING_TYPES.map((ct) => {
                const isSelected = selectedType === ct.id;
                return (
                  <Pressable
                    key={ct.id}
                    testID={`button-type-${ct.id}`}
                    onPress={() => {
                      setSelectedType(ct.id);
                      if (Platform.OS !== "web") Haptics.selectionAsync();
                    }}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: isSelected ? theme.primary + "15" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                        borderColor: isSelected ? theme.primary : theme.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    <Feather
                      name={ct.id === "regular" ? "home" : ct.id === "deep-clean" ? "refresh-cw" : "truck"}
                      size={18}
                      color={isSelected ? theme.primary : theme.textSecondary}
                    />
                    <ThemedText
                      type="subtitle"
                      style={{ color: isSelected ? theme.primary : theme.text, fontWeight: isSelected ? "700" : "500" }}
                    >
                      {ct.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              testID="button-generate-quote"
              onPress={handleGenerate}
              style={{ borderRadius: BorderRadius.md, overflow: "hidden", marginTop: Spacing["2xl"] }}
            >
              <LinearGradient
                colors={[theme.primary, "#1D4ED8"]}
                style={styles.ctaButton}
              >
                <Feather name="zap" size={22} color="#FFFFFF" />
                <ThemedText type="h3" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                  Generate Quote
                </ThemedText>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing["3xl"],
          },
          useMaxWidth ? { alignItems: "center" } : undefined,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={useMaxWidth ? { maxWidth: MAX_CONTENT_WIDTH, width: "100%" } : { width: "100%" }}>
          <Pressable onPress={() => setPhase("input")} style={styles.backBtn} hitSlop={12}>
            <Feather name="arrow-left" size={22} color={theme.text} />
          </Pressable>

          <ThemedText type="h2" style={{ marginBottom: Spacing.xs }}>
            Your Quote is Ready
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
            {parseInt(sqft).toLocaleString()} sq ft | {beds} bed | {baths} bath
          </ThemedText>

          <View style={styles.resultsCards}>
            {results?.options.map((o) => {
              const isRecommended = o.recommended;
              return (
                <View
                  key={o.id}
                  style={[
                    styles.resultCard,
                    {
                      backgroundColor: isRecommended
                        ? theme.primary + "10"
                        : isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(0,0,0,0.02)",
                      borderColor: isRecommended ? theme.primary : theme.border,
                      borderWidth: isRecommended ? 2 : 1,
                    },
                  ]}
                >
                  {isRecommended ? (
                    <View style={[styles.recommendedBadge, { backgroundColor: theme.primary }]}>
                      <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 10 }}>
                        Recommended
                      </ThemedText>
                    </View>
                  ) : null}
                  <View style={styles.resultCardContent}>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="subtitle" style={{ fontWeight: "700", color: isRecommended ? theme.primary : theme.text }}>
                        {o.label}
                      </ThemedText>
                      <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                        {o.option.scope}
                      </ThemedText>
                    </View>
                    <ThemedText type="h2" style={{ color: isRecommended ? theme.primary : theme.text }}>
                      ${o.option.price}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={[styles.sendCard, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", borderColor: theme.border }]}>
            <ThemedText type="subtitle" style={{ fontWeight: "600", marginBottom: Spacing.md, textAlign: "center" }}>
              Send this as a professional quote to your customer.
            </ThemedText>

            <View style={styles.sendButtons}>
              <Pressable
                testID="button-send-text"
                onPress={handleSendText}
                style={[styles.sendBtn, { backgroundColor: theme.primary }]}
              >
                <Feather name="message-circle" size={18} color="#FFFFFF" />
                <ThemedText type="subtitle" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                  Send via Text
                </ThemedText>
              </Pressable>

              <Pressable
                testID="button-send-email"
                onPress={handleSendEmail}
                style={[styles.sendBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)", borderWidth: 1, borderColor: theme.border }]}
              >
                <Feather name="mail" size={18} color={theme.text} />
                <ThemedText type="subtitle" style={{ color: theme.text, fontWeight: "600" }}>
                  Send via Email
                </ThemedText>
              </Pressable>

              <Pressable
                testID="button-copy-link"
                onPress={handleCopyLink}
                style={[styles.sendBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)", borderWidth: 1, borderColor: theme.border }]}
              >
                <Feather name={copiedLink ? "check" : "copy"} size={18} color={copiedLink ? theme.success : theme.text} />
                <ThemedText type="subtitle" style={{ color: copiedLink ? theme.success : theme.text, fontWeight: "600" }}>
                  {copiedLink ? "Copied!" : "Copy Quote"}
                </ThemedText>
              </Pressable>
            </View>
          </View>

          <Pressable
            testID="button-continue-dashboard"
            onPress={handleContinueToDashboard}
            style={{ borderRadius: BorderRadius.md, overflow: "hidden", marginTop: Spacing.xl }}
          >
            <LinearGradient
              colors={[theme.primary, "#1D4ED8"]}
              style={styles.ctaButton}
            >
              <ThemedText type="h3" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                Go to Dashboard
              </ThemedText>
              <Feather name="arrow-right" size={20} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl },
  welcomeContent: { paddingHorizontal: Spacing.xl, flexGrow: 1, justifyContent: "center" },
  backBtn: { marginBottom: Spacing.lg },
  welcomeIconWrap: { alignItems: "center", marginBottom: Spacing["2xl"] },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
    lineHeight: 36,
  },
  welcomeSubtitle: {
    textAlign: "center",
    marginBottom: Spacing["2xl"],
    lineHeight: 22,
  },
  welcomeFeatures: { gap: Spacing.md, marginBottom: Spacing.lg },
  featureRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 64,
    borderRadius: BorderRadius.md,
  },
  stepperContainer: { marginBottom: Spacing.lg },
  stepperRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    height: 56,
  },
  stepperBtn: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  compactStepperBtn: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  twoCol: { flexDirection: "row", gap: Spacing.md },
  typeGrid: { gap: Spacing.sm },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  resultsCards: { gap: Spacing.md, marginBottom: Spacing.xl },
  resultCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    position: "relative",
    overflow: "hidden",
  },
  resultCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recommendedBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderBottomLeftRadius: BorderRadius.sm,
  },
  sendCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  sendButtons: { gap: Spacing.sm },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 48,
    borderRadius: BorderRadius.md,
  },
});
