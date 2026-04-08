import React, { useState } from "react";
import { View, StyleSheet, Pressable, Platform, useWindowDimensions } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { CommercialWalkthrough, DEFAULT_WALKTHROUGH } from "../types";
import SiteBasicsStep from "../components/SiteBasicsStep";
import AreasCountsStep from "../components/AreasCountsStep";
import FloorsSurfacesStep from "../components/FloorsSurfacesStep";
import FrequencyTimingStep from "../components/FrequencyTimingStep";
import SuppliesEquipmentStep from "../components/SuppliesEquipmentStep";
import NotesPhotosStep from "../components/NotesPhotosStep";

const STEPS = ["Site Basics", "Areas", "Floors", "Frequency", "Supplies", "Notes"];

interface Props {
  walkthrough: CommercialWalkthrough;
  onUpdate: (data: CommercialWalkthrough) => void;
  onComplete: () => void;
  onCancel: () => void;
}

export default function WalkthroughScreen({ walkthrough, onUpdate, onComplete, onCancel }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      if (Platform.OS !== "web") {
        Haptics.selectionAsync();
      }
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      if (Platform.OS !== "web") {
        Haptics.selectionAsync();
      }
      setCurrentStep(currentStep - 1);
    } else {
      onCancel();
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return walkthrough.facilityName.trim().length > 0 && walkthrough.totalSqFt > 0;
      case 1:
        return true;
      case 2:
        return walkthrough.carpetPercent + walkthrough.hardFloorPercent === 100;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return <SiteBasicsStep data={walkthrough} onUpdate={onUpdate} />;
      case 1:
        return <AreasCountsStep data={walkthrough} onUpdate={onUpdate} />;
      case 2:
        return <FloorsSurfacesStep data={walkthrough} onUpdate={onUpdate} />;
      case 3:
        return <FrequencyTimingStep data={walkthrough} onUpdate={onUpdate} />;
      case 4:
        return <SuppliesEquipmentStep data={walkthrough} onUpdate={onUpdate} />;
      case 5:
        return <NotesPhotosStep data={walkthrough} onUpdate={onUpdate} />;
      default:
        return null;
    }
  };

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top }]}>
        <Pressable onPress={handleBack} style={styles.headerButton} testID="button-walkthrough-back">
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Feather name="chevron-left" size={20} color={theme.primary} />
            <ThemedText type="link">
              {currentStep > 0 ? "Back" : "Cancel"}
            </ThemedText>
          </View>
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            {STEPS[currentStep]}
          </ThemedText>
          <View style={styles.stepIndicator}>
            {STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      index <= currentStep ? theme.primary : theme.border,
                  },
                ]}
              />
            ))}
          </View>
        </View>
        <Pressable
          onPress={handleNext}
          disabled={!canProceed()}
          style={[styles.headerButton, !canProceed() ? { opacity: 0.4 } : null]}
          testID="button-walkthrough-next"
        >
          <ThemedText type="link" style={{ textAlign: "right" }}>
            {isLastStep ? "Done" : "Next"}
          </ThemedText>
        </Pressable>
      </View>

      <View style={[styles.content, ...(useMaxWidth ? [{ maxWidth: 560, alignSelf: "center" as const, width: "100%" as any }] : [])]}>{renderCurrentStep()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerButton: {
    minWidth: 60,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  stepIndicator: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
});
