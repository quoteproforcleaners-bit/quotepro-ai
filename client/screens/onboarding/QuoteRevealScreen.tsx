import React, { useState, useMemo, useRef } from "react";
import { View, StyleSheet, Pressable, ScrollView, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import OnboardingProgressBar from "@/components/OnboardingProgressBar";

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

const FREQUENCIES = [
  { id: "one-time", label: "One-time" },
  { id: "weekly", label: "Weekly" },
  { id: "biweekly", label: "Biweekly" },
  { id: "monthly", label: "Monthly" },
];

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

export default function QuoteRevealScreen({ tiers, frequency: initialFrequency, goal, onNext, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [selectedTier, setSelectedTier] = useState("better");
  const [addOns, setAddOns] = useState<string[]>([]);
  const [selectedFrequency, setSelectedFrequency] = useState(initialFrequency || "biweekly");
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number | null>>({});
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<TextInput>(null);

  const getTierPrice = (key: string, tier: QuoteTier) => {
    return priceOverrides[key] != null ? priceOverrides[key]! : tier.price;
  };

  const tierPrice = useMemo(() => {
    const t = selectedTier === "good" ? tiers.good : selectedTier === "best" ? tiers.best : tiers.better;
    return getTierPrice(selectedTier, t);
  }, [selectedTier, tiers, priceOverrides]);

  const addOnTotal = useMemo(() => {
    let total = 0;
    addOns.forEach((a) => {
      const found = ADD_ONS.find((ao) => ao.id === a);
      if (found) total += found.price;
    });
    return total;
  }, [addOns]);

  const currentPrice = tierPrice + addOnTotal;

  const moneyInsight = useMemo(() => {
    if (selectedFrequency === "one-time") {
      return { label: "One-time", value: tierPrice + addOnTotal };
    }
    const multiplier = selectedFrequency === "weekly" ? 52 : selectedFrequency === "biweekly" ? 26 : 12;
    return { label: `${selectedFrequency}/yr`, value: tierPrice * multiplier + addOnTotal };
  }, [tierPrice, addOnTotal, selectedFrequency]);

  const toggleAddOn = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAddOns((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);
  };

  const startEditing = (key: string, price: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingTier(key);
    setEditValue(String(price));
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const finishEditing = () => {
    if (editingTier) {
      const parsed = parseFloat(editValue);
      if (!isNaN(parsed) && parsed > 0) {
        setPriceOverrides((prev) => ({ ...prev, [editingTier]: Math.round(parsed * 100) / 100 }));
      }
      setEditingTier(null);
      setEditValue("");
    }
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
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
        <Feather name="arrow-left" size={22} color={theme.text} />
      </Pressable>

      <OnboardingProgressBar currentStep={4} />
      <ThemedText type="h2" style={{ marginBottom: Spacing.xs }}>Your Quote Options</ThemedText>
      <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.lg }}>
        Tap to select a tier, tap the price to edit
      </ThemedText>

      <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm }}>Frequency</ThemedText>
      <View style={styles.freqRow}>
        {FREQUENCIES.map((f) => {
          const sel = selectedFrequency === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => { setSelectedFrequency(f.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              style={[
                styles.freqChip,
                {
                  backgroundColor: sel ? theme.primary : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                  borderColor: sel ? theme.primary : theme.border,
                },
              ]}
            >
              <ThemedText
                type="caption"
                style={{
                  color: sel ? "#FFFFFF" : theme.textSecondary,
                  fontWeight: sel ? "700" : "500",
                }}
              >
                {f.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.tiersRow}>
        {tierEntries.map(({ key, tier, badge }) => {
          const sel = selectedTier === key;
          const displayPrice = getTierPrice(key, tier);
          const isEditing = editingTier === key;
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
              {isEditing ? (
                <View style={styles.editPriceRow}>
                  <ThemedText type="h2" style={{ color: sel ? theme.primary : theme.text }}>$</ThemedText>
                  <TextInput
                    ref={inputRef}
                    value={editValue}
                    onChangeText={setEditValue}
                    onBlur={finishEditing}
                    onSubmitEditing={finishEditing}
                    keyboardType="numeric"
                    style={[styles.priceInput, { color: sel ? theme.primary : theme.text }]}
                    selectTextOnFocus
                    testID={`price-input-${key}`}
                  />
                </View>
              ) : (
                <Pressable onPress={() => startEditing(key, displayPrice)} hitSlop={8}>
                  <View style={styles.editablePriceRow}>
                    <ThemedText type="h2" style={{ color: sel ? theme.primary : theme.text, marginVertical: 4 }}>${displayPrice}</ThemedText>
                    <Feather name="edit-2" size={10} color={theme.textMuted} style={{ marginLeft: 4 }} />
                  </View>
                </Pressable>
              )}
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
        {selectedFrequency === "one-time" ? (
          <View>
            <ThemedText type="h3" style={{ color: theme.success }}>${moneyInsight.value.toLocaleString()}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>One-time service</ThemedText>
          </View>
        ) : (
          <View style={styles.insightGrid}>
            {FREQUENCIES.filter((f) => f.id !== "one-time").map((f) => {
              const multiplier = f.id === "weekly" ? 52 : f.id === "biweekly" ? 26 : 12;
              const yearlyVal = tierPrice * multiplier + addOnTotal;
              const isSelected = f.id === selectedFrequency;
              return (
                <View key={f.id} style={styles.insightItem}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>If {f.label.toLowerCase()}</ThemedText>
                  <ThemedText type="h3" style={{ color: isSelected ? theme.success : theme.text }}>${yearlyVal.toLocaleString()}/yr</ThemedText>
                </View>
              );
            })}
          </View>
        )}
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
            <View style={{ alignItems: "flex-end" }}>
              <ThemedText type="subtitle" style={{ color: theme.primary }}>+${ao.price}</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, fontSize: 10 }}>one time</ThemedText>
            </View>
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
  freqRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.xl },
  freqChip: { flex: 1, alignItems: "center", paddingVertical: Spacing.sm, borderRadius: BorderRadius.xs, borderWidth: 1 },
  tiersRow: { flexDirection: "row", gap: Spacing.sm },
  tierCard: { flex: 1, alignItems: "center", padding: Spacing.md, borderRadius: BorderRadius.sm, position: "relative" },
  badge: { position: "absolute", top: -10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  editablePriceRow: { flexDirection: "row", alignItems: "center" },
  editPriceRow: { flexDirection: "row", alignItems: "center", marginVertical: 4 },
  priceInput: { fontSize: 22, fontWeight: "700", width: 60, textAlign: "center", padding: 0 },
  insightCard: { padding: Spacing.lg, borderRadius: BorderRadius.sm, borderWidth: 1, marginTop: Spacing.xl },
  insightHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.md },
  insightGrid: { flexDirection: "row", gap: Spacing.sm },
  insightItem: { flex: 1 },
  addOnRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.xs, borderWidth: 1, marginBottom: Spacing.sm },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, height: 56, borderRadius: BorderRadius.md, marginTop: Spacing.xl },
});
