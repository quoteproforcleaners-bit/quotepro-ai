import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { SectionHeader } from "@/components/SectionHeader";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { CommercialWalkthrough } from "../types";

interface Props {
  data: CommercialWalkthrough;
  onUpdate: (data: CommercialWalkthrough) => void;
}

export default function NotesPhotosStep({ data, onUpdate }: Props) {
  const { theme } = useTheme();

  const updateField = <K extends keyof CommercialWalkthrough>(
    key: K,
    value: CommercialWalkthrough[K]
  ) => {
    onUpdate({ ...data, [key]: value });
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <ThemedText type="h3">Notes & Photos</ThemedText>
        <ThemedText
          type="small"
          style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
        >
          Add any additional notes or site photos.
        </ThemedText>
      </View>

      <SectionHeader title="Notes" />

      <Input
        label="Additional Notes"
        value={data.notes}
        onChangeText={(v) => updateField("notes", v)}
        placeholder="Any special instructions, areas of concern, or additional details..."
        multiline
        numberOfLines={6}
        testID="input-notes"
      />

      <SectionHeader title="Site Photos" />

      <Card variant="base" style={styles.photoPlaceholder}>
        <View style={styles.photoContent}>
          <View
            style={[
              styles.photoIconContainer,
              { backgroundColor: theme.primarySoft },
            ]}
          >
            <Feather name="camera" size={24} color={theme.primary} />
          </View>
          <ThemedText type="body" style={{ fontWeight: "500", marginTop: Spacing.md }}>
            {"Site Photos"}
          </ThemedText>
          <ThemedText
            type="small"
            style={{ color: theme.textSecondary, marginTop: Spacing.xs, textAlign: "center" }}
          >
            {"Photo capture will be available when running in Expo Go on your device."}
          </ThemedText>
          {data.photos.length > 0 ? (
            <ThemedText
              type="small"
              style={{ color: theme.primary, marginTop: Spacing.md }}
            >
              {data.photos.length + " photo(s) attached"}
            </ThemedText>
          ) : null}
        </View>
      </Card>
    </KeyboardAwareScrollViewCompat>
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
  photoPlaceholder: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  photoContent: {
    alignItems: "center",
  },
  photoIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
