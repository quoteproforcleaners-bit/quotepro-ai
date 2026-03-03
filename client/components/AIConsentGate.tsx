import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAIConsent } from "@/context/AIConsentContext";
import { useLanguage } from "@/context/LanguageContext";
import { Spacing, BorderRadius } from "@/constants/theme";

interface AIConsentGateProps {
  children: React.ReactNode;
}

export function AIConsentGate({ children }: AIConsentGateProps) {
  const { hasConsented, isLoading } = useAIConsent();

  if (isLoading) {
    return <>{children}</>;
  }

  if (hasConsented) {
    return <>{children}</>;
  }

  return <AIConsentBlockingOverlay />;
}

function AIConsentBlockingOverlay() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { requestConsent } = useAIConsent();
  const { t } = useLanguage();

  const consent = t.aiConsent;

  const handleAllow = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await requestConsent();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: insets.top + 60, paddingBottom: insets.bottom + Spacing.xl }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: isDark ? "rgba(217, 119, 6, 0.15)" : "#FEF3C7" }]}>
          <Feather name="alert-triangle" size={32} color={theme.warning} />
        </View>

        <ThemedText type="h2" style={styles.title}>
          {consent.gateTitle || "Data Sharing Permission Required"}
        </ThemedText>

        <ThemedText type="body" style={[styles.description, { color: theme.textSecondary }]}>
          {consent.gateDescription || "This feature uses a third-party AI service (OpenAI) to process your data. Before continuing, you must review and consent to sharing your personal data."}
        </ThemedText>

        <View style={[styles.dataBox, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F9FAFB", borderColor: theme.border }]}>
          <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm }}>
            {consent.gateDataTitle || "Personal data that will be shared with OpenAI:"}
          </ThemedText>
          {[
            consent.dataItem1,
            consent.dataItem2,
            consent.dataItem3,
            consent.dataItem4,
          ].map((item, i) => (
            <View key={i} style={styles.dataRow}>
              <View style={[styles.bullet, { backgroundColor: theme.warning }]} />
              <ThemedText type="body" style={{ flex: 1, color: theme.textSecondary }}>
                {item}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={[styles.providerBox, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#EFF6FF", borderColor: theme.primary + "30" }]}>
          <View style={styles.providerRow}>
            <Feather name="globe" size={16} color={theme.primary} />
            <ThemedText type="subtitle" style={{ marginLeft: Spacing.sm }}>
              {consent.gateProviderLabel || "Third-Party Service: OpenAI"}
            </ThemedText>
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
            {consent.providerDescription}
          </ThemedText>
        </View>

        <ThemedText type="caption" style={[styles.note, { color: theme.textSecondary }]}>
          {consent.gateNote || "You can revoke this permission at any time in Settings. Your data is never used to train AI models."}
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.allowBtn, { backgroundColor: theme.primary }]}
          onPress={handleAllow}
          testID="button-ai-consent-gate-allow"
        >
          <Feather name="shield" size={18} color="#FFFFFF" />
          <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: Spacing.sm }}>
            {consent.gateAllowButton || "Allow Data Sharing & Continue"}
          </ThemedText>
        </Pressable>

        <ThemedText type="caption" style={[styles.footerNote, { color: theme.textSecondary }]}>
          {consent.gateFooter || "AI features are unavailable without data sharing permission."}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  description: {
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  dataBox: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.sm,
  },
  providerBox: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  note: {
    textAlign: "center",
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
  actions: {
    paddingTop: Spacing.lg,
  },
  allowBtn: {
    width: "100%",
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  footerNote: {
    textAlign: "center",
    lineHeight: 16,
    marginBottom: Spacing.sm,
  },
});
