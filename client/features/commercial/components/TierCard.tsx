import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { CommercialTier, CommercialFrequency } from "../types";

interface TierCardProps {
  tier: CommercialTier;
  index: number;
  onUpdate: (updated: CommercialTier) => void;
  highlighted?: boolean;
}

const TIER_ICONS: string[] = ["star", "shield", "award"];
const TIER_LABELS: string[] = ["Basic", "Enhanced", "Premium"];

export function TierCard({ tier, index, onUpdate, highlighted = false }: TierCardProps) {
  const { theme, isDark } = useTheme();
  const [editingName, setEditingName] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [newBullet, setNewBullet] = useState("");

  const frequencyLabel = (f: CommercialFrequency) => {
    const map: Record<CommercialFrequency, string> = {
      "1x": "1x/week",
      "2x": "2x/week",
      "3x": "3x/week",
      "5x": "5x/week",
      daily: "Daily",
      custom: "Custom",
    };
    return map[f] || f;
  };

  const iconName = TIER_ICONS[index] || "star";

  const handleRemoveIncluded = (i: number) => {
    const updated = [...tier.includedBullets];
    updated.splice(i, 1);
    onUpdate({ ...tier, includedBullets: updated });
  };

  const handleRemoveExcluded = (i: number) => {
    const updated = [...tier.excludedBullets];
    updated.splice(i, 1);
    onUpdate({ ...tier, excludedBullets: updated });
  };

  const handleAddIncluded = () => {
    if (!newBullet.trim()) return;
    onUpdate({ ...tier, includedBullets: [...tier.includedBullets, newBullet.trim()] });
    setNewBullet("");
  };

  return (
    <Card
      variant={highlighted ? "emphasis" : "base"}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: isDark ? `${theme.primary}25` : `${theme.primary}12` }]}>
          <Feather name={iconName as any} size={20} color={theme.primary} />
        </View>
        <View style={styles.headerText}>
          {editingName ? (
            <TextInput
              style={[styles.nameInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBackground }]}
              value={tier.name}
              onChangeText={(text) => onUpdate({ ...tier, name: text })}
              onBlur={() => setEditingName(false)}
              autoFocus
              testID={`input-tier-name-${index}`}
            />
          ) : (
            <Pressable onPress={() => setEditingName(true)} style={styles.editableRow}>
              <ThemedText type="h4">{tier.name}</ThemedText>
              <Feather name="edit-2" size={14} color={theme.textSecondary} style={{ marginLeft: Spacing.xs }} />
            </Pressable>
          )}
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
            {frequencyLabel(tier.frequency)}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.pricingRow, { backgroundColor: isDark ? `${theme.primary}12` : `${theme.primary}06`, borderColor: `${theme.primary}20` }]}>
        <View style={styles.priceCol}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>Per Visit</ThemedText>
          {editingPrice ? (
            <TextInput
              style={[styles.priceInput, { color: theme.primary, borderColor: theme.border }]}
              value={String(tier.pricePerVisit)}
              onChangeText={(text) => {
                const val = parseFloat(text) || 0;
                const visitsMap: Record<CommercialFrequency, number> = { "1x": 4, "2x": 8, "3x": 12, "5x": 20, daily: 22, custom: 4 };
                onUpdate({ ...tier, pricePerVisit: val, monthlyPrice: Math.round(val * visitsMap[tier.frequency]) });
              }}
              onBlur={() => setEditingPrice(false)}
              keyboardType="numeric"
              autoFocus
              testID={`input-tier-price-${index}`}
            />
          ) : (
            <Pressable onPress={() => setEditingPrice(true)} style={styles.editableRow}>
              <ThemedText type="h3" style={{ color: theme.primary }}>${tier.pricePerVisit.toFixed(0)}</ThemedText>
              <Feather name="edit-2" size={12} color={theme.textSecondary} style={{ marginLeft: Spacing.xs }} />
            </Pressable>
          )}
        </View>
        <View style={[styles.priceDivider, { backgroundColor: `${theme.primary}20` }]} />
        <View style={styles.priceCol}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>Monthly</ThemedText>
          <ThemedText type="h3" style={{ color: theme.primary }}>${tier.monthlyPrice.toFixed(0)}</ThemedText>
        </View>
      </View>

      <View style={styles.bulletsSection}>
        <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm }}>Included</ThemedText>
        {tier.includedBullets.map((bullet, i) => (
          <View key={`inc-${i}`} style={styles.bulletRow}>
            <Feather name="check" size={14} color={theme.success} style={{ marginTop: 3 }} />
            <ThemedText type="small" style={[styles.bulletText, { color: theme.text }]}>{bullet}</ThemedText>
            <Pressable onPress={() => handleRemoveIncluded(i)} hitSlop={8} testID={`button-remove-included-${index}-${i}`}>
              <Feather name="x" size={14} color={theme.textMuted} />
            </Pressable>
          </View>
        ))}
        <View style={styles.addBulletRow}>
          <TextInput
            style={[styles.addBulletInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBackground }]}
            value={newBullet}
            onChangeText={setNewBullet}
            placeholder="Add item..."
            placeholderTextColor={theme.textMuted}
            onSubmitEditing={handleAddIncluded}
            testID={`input-add-bullet-${index}`}
          />
          <Pressable onPress={handleAddIncluded} style={[styles.addBtn, { backgroundColor: theme.primary }]} testID={`button-add-bullet-${index}`}>
            <Feather name="plus" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <View style={styles.bulletsSection}>
        <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm }}>Not Included</ThemedText>
        {tier.excludedBullets.map((bullet, i) => (
          <View key={`exc-${i}`} style={styles.bulletRow}>
            <Feather name="x" size={14} color={theme.error} style={{ marginTop: 3 }} />
            <ThemedText type="small" style={[styles.bulletText, { color: theme.textSecondary }]}>{bullet}</ThemedText>
            <Pressable onPress={() => handleRemoveExcluded(i)} hitSlop={8} testID={`button-remove-excluded-${index}-${i}`}>
              <Feather name="x" size={14} color={theme.textMuted} />
            </Pressable>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  editableRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  nameInput: {
    fontSize: 18,
    fontWeight: "600",
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minWidth: 150,
  },
  pricingRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  priceCol: {
    flex: 1,
    alignItems: "center",
  },
  priceDivider: {
    width: 1,
    height: 40,
    marginHorizontal: Spacing.md,
  },
  priceInput: {
    fontSize: 20,
    fontWeight: "700",
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    textAlign: "center",
    minWidth: 80,
  },
  bulletsSection: {
    marginBottom: Spacing.md,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  bulletText: {
    flex: 1,
    lineHeight: 20,
  },
  addBulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  addBulletInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: 14,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
