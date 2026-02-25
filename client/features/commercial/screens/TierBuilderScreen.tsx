import React from "react";
import { View, StyleSheet, ScrollView, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { CommercialTier, CommercialWalkthrough, CommercialLaborEstimate, CommercialPricing } from "../types";
import { generateDefaultTiers } from "../laborModel";
import { TierCard } from "../components/TierCard";

interface TierBuilderScreenProps {
  walkthrough: CommercialWalkthrough;
  laborEstimate: CommercialLaborEstimate;
  pricing: CommercialPricing;
  tiers: CommercialTier[];
  onUpdate: (tiers: CommercialTier[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function TierBuilderScreen({
  walkthrough,
  laborEstimate,
  pricing,
  tiers,
  onUpdate,
  onNext,
  onBack,
}: TierBuilderScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;

  const currentTiers = tiers.length > 0 ? tiers : generateDefaultTiers(walkthrough, laborEstimate, pricing);

  if (tiers.length === 0 && currentTiers.length > 0) {
    onUpdate(currentTiers);
  }

  const handleTierUpdate = (index: number, updated: CommercialTier) => {
    const newTiers = [...currentTiers];
    newTiers[index] = updated;
    onUpdate(newTiers);
  };

  const handleRegenerate = () => {
    const fresh = generateDefaultTiers(walkthrough, laborEstimate, pricing);
    onUpdate(fresh);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl + 80 }, ...(useMaxWidth ? [{ maxWidth: 560, alignSelf: "center" as const, width: "100%" }] : [])]}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          title="Service Tiers"
          subtitle="Three tiers auto-generated from your walkthrough and pricing. Customize names, tasks, and prices."
        />

        {currentTiers.map((tier, index) => (
          <TierCard
            key={`tier-${index}`}
            tier={tier}
            index={index}
            onUpdate={(updated) => handleTierUpdate(index, updated)}
            highlighted={index === 1}
          />
        ))}

        <Button
          mode="outlined"
          onPress={handleRegenerate}
          style={styles.regenButton}
          testID="button-regenerate-tiers"
        >
          Regenerate Tiers
        </Button>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.backgroundRoot, paddingBottom: insets.bottom + Spacing.md, borderTopColor: theme.border }]}>
        <Button
          mode="outlined"
          onPress={onBack}
          style={styles.footerBtn}
          testID="button-tier-back"
        >
          Back
        </Button>
        <Button
          onPress={onNext}
          style={styles.footerBtn}
          testID="button-tier-next"
        >
          Preview Proposal
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  regenButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
  },
});
