import React, { useState } from "react";
import { View, StyleSheet, ScrollView, TextInput, useWindowDimensions } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ProGate } from "@/components/ProGate";

export default function TikTokLeadCreateScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;

  const [dmText, setDmText] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderHandle, setSenderHandle] = useState("");
  const [result, setResult] = useState<any>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/social/tiktok-lead", {
        dmText,
        senderName: senderName || undefined,
        senderHandle: senderHandle || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/social/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/social/stats"] });
    },
  });

  return (
    <ProGate featureName="Social Leads">
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
          paddingHorizontal: Spacing.lg,
          ...(useMaxWidth ? { maxWidth: 560, alignSelf: "center" as const, width: "100%" } : undefined),
        }}
      >
        <View style={[styles.infoCard, { backgroundColor: theme.gradientAccent }]}>
        <Feather name="info" size={16} color={theme.accent} />
        <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.sm, flex: 1 }}>
          Paste a TikTok DM and our AI will extract lead details like name, service type, and property info.
        </ThemedText>
      </View>

      <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm, marginTop: Spacing.lg }}>Sender Info (optional)</ThemedText>
      <TextInput
        value={senderName}
        onChangeText={setSenderName}
        placeholder="Sender's name"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
        testID="input-sender-name"
      />
      <TextInput
        value={senderHandle}
        onChangeText={setSenderHandle}
        placeholder="@tiktok_handle"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
        testID="input-sender-handle"
      />

      <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm, marginTop: Spacing.lg }}>DM Content</ThemedText>
      <TextInput
        value={dmText}
        onChangeText={setDmText}
        placeholder="Paste the TikTok DM message here..."
        placeholderTextColor={theme.textSecondary}
        multiline
        numberOfLines={6}
        style={[styles.textArea, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
        testID="input-dm-text"
      />

      <Button
        onPress={() => createMutation.mutate()}
        style={{ marginTop: Spacing.xl }}
        disabled={!dmText.trim() || createMutation.isPending}
      >
        {createMutation.isPending ? "Processing with AI..." : "Create Lead"}
      </Button>

      {result ? (
        <Card style={{ marginTop: Spacing.xl }}>
          <View style={styles.resultHeader}>
            <Feather name="check-circle" size={20} color={theme.success} />
            <ThemedText type="subtitle" style={{ marginLeft: Spacing.sm }}>Lead Created</ThemedText>
          </View>

          <View style={[styles.resultSection, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>AI Extracted Fields</ThemedText>
            {result.extractedFields ? (
              Object.entries(result.extractedFields).map(([key, value]: [string, any]) => (
                <View key={key} style={styles.fieldRow}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, textTransform: "capitalize" }}>
                    {key.replace(/_/g, " ")}
                  </ThemedText>
                  <ThemedText type="small">{value !== null ? String(value) : "N/A"}</ThemedText>
                </View>
              ))
            ) : (
              <ThemedText type="small" style={{ color: theme.textSecondary }}>No fields extracted</ThemedText>
            )}
          </View>

          <Button
            onPress={() => navigation.goBack()}
            style={{ marginTop: Spacing.md }}
          >
            Done
          </Button>
        </Card>
      ) : null}
      </ScrollView>
    </ProGate>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: "top",
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  resultSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
});
