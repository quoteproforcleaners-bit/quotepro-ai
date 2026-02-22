import React, { useState, useMemo } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface QuoteTier {
  name: string;
  price: number;
  serviceType: string;
  scope: string;
}

const GOAL_INSIGHT: Record<string, { title: string; tip: string }> = {
  send_quote: { title: "Revenue Potential", tip: "Biweekly is the most popular choice" },
  convert_recurring: { title: "Recurring Revenue", tip: "Switch one-time clients to biweekly and double your income from each customer" },
  raise_prices: { title: "What This Job Is Worth", tip: "Most cleaners undercharge by 20-30%. The Better tier is where you should be" },
  more_repeat: { title: "Lifetime Customer Value", tip: "A single repeat customer can be worth thousands per year" },
};

interface Props {
  tiers: { good: QuoteTier; better: QuoteTier; best: QuoteTier };
  frequency: string;
  goal?: string;
  onNext: (selectedTier: string, addOns: string[]) => void;
  onBack: () => void;
}

const ADD_ONS = [
  { id: "fridge", label: "Inside Fridge", price: 35 },
  { id: "oven", label: "Inside Oven", price: 35 },
  { id: "deepCleanReset", label: "Deep Clean Reset in 6 months", price: 199 },
];

export default function QuoteRevealScreen({ tiers, frequency, goal, onNext, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [selectedTier, setSelectedTier] = useState("better");
  const [addOns, setAddOns] = useState<string[]>([]);

  const currentPrice = useMemo(() => {
    const t = selectedTier === "good" ? tiers.good : selectedTier === "best" ? tiers.best : tiers.better;
    let addOnTotal = 0;
    addOns.forEach((a) => {
      const found = ADD_ONS.find((ao) => ao.id === a);
      if (found) addOnTotal += found.price;
    });
    return t.price + addOnTotal;
  }, [selectedTier, tiers, addOns]);

  const moneyInsight = useMemo(() => {
    return {
      weekly: currentPrice * 52,
      biweekly: currentPrice * 26,
      monthly: currentPrice * 12,
    };
  }, [currentPrice]);

  const toggleAddOn = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAddOns((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);
  };

  const tierEntries = [
    { key: "good", tier: tiers.good, badge: null },
    { key: "better", tier: tiers.better, badge: "Recommended" },
    { key: "best", tier: tiers.best, badge: "Premium" },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing["3xl"] }]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
        <Feather name="arrow-left" size={22} color={theme.text} />
      </Pressable>

      <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600", marginBottom: Spacing.xs }}>
        STEP 4 OF 7
      </ThemedText>
      <ThemedText type="h2" style={{ marginBottom: Spacing.xs }}>Your Quote Options</ThemedText>
      <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.xl }}>
        Tap to select a tier
      </ThemedText>

      <View style={styles.tiersRow}>
        {tierEntries.map(({ key, tier, badge }) => {
          const sel = selectedTier === key;
          return (
            <Pressable
              key={key}
              testID={`tier-${key}`}
              onPress={() => { setSelectedTier(key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
              style={[
                styles.tierCard,
                {
                  backgroundColor: sel ? theme.primary + "10" : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                  borderColor: sel ? theme.primary : theme.border,
                  borderWidth: sel ? 2 : 1,
                },
              ]}
            >
              {badge ? (
                <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                  <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 10 }}>{badge}</ThemedText>
                </View>
              ) : null}
              <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: "600", textTransform: "uppercase" }}>{tier.name}</ThemedText>
              <ThemedText type="h2" style={{ color: sel ? theme.primary : theme.text, marginVertical: 4 }}>${tier.price}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }} numberOfLines={2}>{tier.scope}</ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.insightCard, { backgroundColor: isDark ? theme.successSoft : "#ECFDF5", borderColor: theme.successBorder }]}>
        <View style={styles.insightHeader}>
          <Feather name="trending-up" size={18} color={theme.success} />
          <ThemedText type="subtitle" style={{ color: theme.success, fontWeight: "700" }}>{(GOAL_INSIGHT[goal || "send_quote"] || GOAL_INSIGHT.send_quote).title}</ThemedText>
        </View>
        <View style={styles.insightGrid}>
          <View style={styles.insightItem}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>If weekly</ThemedText>
            <ThemedText type="h3" style={{ color: theme.success }}>${moneyInsight.weekly.toLocaleString()}/yr</ThemedText>
          </View>
          <View style={styles.insightItem}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>If biweekly</ThemedText>
            <ThemedText type="h3" style={{ color: theme.text }}>${moneyInsight.biweekly.toLocaleString()}/yr</ThemedText>
          </View>
          <View style={styles.insightItem}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>If monthly</ThemedText>
            <ThemedText type="h3" style={{ color: theme.text }}>${moneyInsight.monthly.toLocaleString()}/yr</ThemedText>
          </View>
        </View>
        <ThemedText type="caption" style={{ color: theme.success, fontWeight: "600", marginTop: Spacing.sm }}>
          {(GOAL_INSIGHT[goal || "send_quote"] || GOAL_INSIGHT.send_quote).tip}
        </ThemedText>
      </View>

      <ThemedText type="subtitle" style={{ marginTop: Spacing.xl, marginBottom: Spacing.sm }}>Add-ons (optional)</ThemedText>
      {ADD_ONS.map((ao) => {
        const sel = addOns.includes(ao.id);
        return (
          <Pressable
            key={ao.id}
            testID={`addon-${ao.id}`}
            onPress={() => toggleAddOn(ao.id)}
            style={[styles.addOnRow, { backgroundColor: sel ? theme.primary + "08" : "transparent", borderColor: sel ? theme.primary : theme.border }]}
          >
            <View style={[styles.checkbox, { borderColor: sel ? theme.primary : theme.border, backgroundColor: sel ? theme.primary : "transparent" }]}>
              {sel ? <Feather name="check" size={12} color="#FFFFFF" /> : null}
            </View>
            <ThemedText type="body" style={{ flex: 1 }}>{ao.label}</ThemedText>
            <ThemedText type="subtitle" style={{ color: theme.primary }}>+${ao.price}</ThemedText>
          </Pressable>
        );
      })}

      <Pressable
        testID="button-quote-next"
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onNext(selectedTier, addOns); }}
        style={[styles.nextBtn, { backgroundColor: theme.primary }]}
      >
        <ThemedText type="subtitle" style={{ color: "#FFFFFF", fontWeight: "700" }}>Next: Send Quote</ThemedText>
        <Feather name="arrow-right" size={18} color="#FFFFFF" />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl },
  backBtn: { marginBottom: Spacing.lg },
  tiersRow: { flexDirection: "row", gap: Spacing.sm },
  tierCard: { flex: 1, alignItems: "center", padding: Spacing.md, borderRadius: BorderRadius.sm, position: "relative" },
  badge: { position: "absolute", top: -10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  insightCard: { padding: Spacing.lg, borderRadius: BorderRadius.sm, borderWidth: 1, marginTop: Spacing.xl },
  insightHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.md },
  insightGrid: { flexDirection: "row", gap: Spacing.sm },
  insightItem: { flex: 1 },
  addOnRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.xs, borderWidth: 1, marginBottom: Spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, height: 56, borderRadius: BorderRadius.md, marginTop: Spacing.xl },
});
