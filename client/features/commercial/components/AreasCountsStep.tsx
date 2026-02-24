import React from "react";
import { View, StyleSheet } from "react-native";
import { ScrollView } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { NumberStepper } from "@/components/NumberStepper";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { CommercialWalkthrough } from "../types";

interface Props {
  data: CommercialWalkthrough;
  onUpdate: (data: CommercialWalkthrough) => void;
}

export default function AreasCountsStep({ data, onUpdate }: Props) {
  const { theme } = useTheme();

  const updateField = <K extends keyof CommercialWalkthrough>(
    key: K,
    value: CommercialWalkthrough[K]
  ) => {
    onUpdate({ ...data, [key]: value });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <ThemedText type="h3">Areas & Counts</ThemedText>
        <ThemedText
          type="small"
          style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
        >
          How many of each area type does the facility have?
        </ThemedText>
      </View>

      <SectionHeader title="Restrooms & Break Areas" />

      <NumberStepper
        label="Bathrooms"
        value={data.bathroomCount}
        min={0}
        max={50}
        onChange={(v) => updateField("bathroomCount", v)}
      />

      <NumberStepper
        label="Breakrooms"
        value={data.breakroomCount}
        min={0}
        max={20}
        onChange={(v) => updateField("breakroomCount", v)}
      />

      <SectionHeader title="Office & Meeting Spaces" />

      <NumberStepper
        label="Conference Rooms"
        value={data.conferenceRoomCount}
        min={0}
        max={30}
        onChange={(v) => updateField("conferenceRoomCount", v)}
      />

      <NumberStepper
        label="Private Offices"
        value={data.privateOfficeCount}
        min={0}
        max={50}
        onChange={(v) => updateField("privateOfficeCount", v)}
      />

      <NumberStepper
        label="Open Areas"
        value={data.openAreaCount}
        min={0}
        max={20}
        onChange={(v) => updateField("openAreaCount", v)}
      />

      <SectionHeader title="Common Areas" />

      <NumberStepper
        label="Entry / Lobby Areas"
        value={data.entryLobbyCount}
        min={0}
        max={10}
        onChange={(v) => updateField("entryLobbyCount", v)}
      />

      <NumberStepper
        label="Trash Points"
        value={data.trashPointCount}
        min={0}
        max={100}
        onChange={(v) => updateField("trashPointCount", v)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing["3xl"],
  },
  header: {
    marginBottom: Spacing.lg,
  },
});
