import React, { useState } from "react";
import { View, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { SectionHeader } from "@/components/SectionHeader";
import { useTheme } from "@/hooks/useTheme";
import { useAIConsent } from "@/context/AIConsentContext";
import { useApp } from "@/context/AppContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";
import { CommercialWalkthrough, CommercialLaborEstimate, CommercialPricing, CommercialTier, CommercialFrequency } from "../types";

interface ProposalPreviewScreenProps {
  walkthrough: CommercialWalkthrough;
  laborEstimate: CommercialLaborEstimate;
  pricing: CommercialPricing;
  tiers: CommercialTier[];
  quoteId?: string;
  onAccept: () => void;
  onBack: () => void;
  onScopeUpdate?: (tierIndex: number, scopeText: string) => void;
}

const FREQUENCY_LABELS: Record<CommercialFrequency, string> = {
  "1x": "1x per week",
  "2x": "2x per week",
  "3x": "3x per week",
  "5x": "5x per week",
  daily: "Daily (Mon-Fri)",
  custom: "Custom schedule",
};

export default function ProposalPreviewScreen({
  walkthrough,
  laborEstimate,
  pricing,
  tiers,
  quoteId,
  onAccept,
  onBack,
  onScopeUpdate,
}: ProposalPreviewScreenProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { requestConsent } = useAIConsent();
  const { businessProfile } = useApp();

  const [scopeLoading, setScopeLoading] = useState(false);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskWarnings, setRiskWarnings] = useState<string[]>([]);
  const [editingScopeIndex, setEditingScopeIndex] = useState<number | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const companyName = businessProfile?.companyName || "Our Company";

  const handleGenerateScope = async () => {
    const consented = await requestConsent();
    if (!consented) return;

    setScopeLoading(true);
    try {
      const res = await apiRequest("POST", "/api/commercial/generate-scope", {
        walkthrough,
        tiers,
      });
      const data = await res.json();
      if (data.scopes && Array.isArray(data.scopes)) {
        data.scopes.forEach((scope: string, i: number) => {
          if (onScopeUpdate && i < tiers.length) {
            onScopeUpdate(i, scope);
          }
        });
      }
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      Alert.alert("Error", "Could not generate scope. Please try again.");
    } finally {
      setScopeLoading(false);
    }
  };

  const handleRiskScan = async () => {
    const consented = await requestConsent();
    if (!consented) return;

    setRiskLoading(true);
    try {
      const res = await apiRequest("POST", "/api/commercial/risk-scan", {
        walkthrough,
        pricing,
        laborEstimate,
        tiers,
      });
      const data = await res.json();
      if (data.warnings && Array.isArray(data.warnings)) {
        setRiskWarnings(data.warnings);
      }
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      Alert.alert("Error", "Could not perform risk scan. Please try again.");
    } finally {
      setRiskLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!quoteId) {
      Alert.alert("Save First", "Please save the quote before exporting a PDF.");
      return;
    }
    setPdfLoading(true);
    try {
      const res = await apiRequest("GET", `/api/quotes/${quoteId}/commercial-pdf`);
      const data = await res.json();
      if (!data.html) throw new Error("No PDF data");

      if (Platform.OS === "web") {
        const win = window.open("", "_blank");
        if (win) {
          win.document.write(data.html);
          win.document.close();
          win.print();
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html: data.html });
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Commercial Proposal - ${walkthrough.facilityName || "Facility"}`,
          UTI: "com.adobe.pdf",
        });
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      Alert.alert("Export Failed", "Could not generate PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleAccept = () => {
    onAccept();
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="emphasis" style={styles.coverCard}>
          <View style={styles.coverHeader}>
            <ThemedText type="h2">{companyName}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
              Commercial Cleaning Proposal
            </ThemedText>
          </View>
          <View style={[styles.coverDivider, { backgroundColor: theme.border }]} />
          <View style={styles.coverDetails}>
            <View style={styles.coverRow}>
              <Feather name="briefcase" size={16} color={theme.textSecondary} />
              <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>{walkthrough.facilityName || "Facility"}</ThemedText>
            </View>
            <View style={styles.coverRow}>
              <Feather name="map-pin" size={16} color={theme.textSecondary} />
              <ThemedText type="small" style={{ marginLeft: Spacing.sm, color: theme.textSecondary }}>{walkthrough.siteAddress || "Address not specified"}</ThemedText>
            </View>
            <View style={styles.coverRow}>
              <Feather name="grid" size={16} color={theme.textSecondary} />
              <ThemedText type="small" style={{ marginLeft: Spacing.sm, color: theme.textSecondary }}>
                {walkthrough.facilityType} - {walkthrough.totalSqFt.toLocaleString()} sqft
              </ThemedText>
            </View>
          </View>
        </Card>

        <SectionHeader title="Scope of Work" />

        <View style={styles.aiButtonsRow}>
          <Pressable
            style={[styles.aiButton, { backgroundColor: isDark ? `${theme.primary}20` : `${theme.primary}10`, borderColor: `${theme.primary}30` }]}
            onPress={handleGenerateScope}
            disabled={scopeLoading}
            testID="button-generate-scope"
          >
            {scopeLoading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Feather name="zap" size={16} color={theme.primary} />
            )}
            <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600", marginLeft: Spacing.xs }}>
              AI Generate Scope
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.aiButton, { backgroundColor: isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.3)" }]}
            onPress={handleRiskScan}
            disabled={riskLoading}
            testID="button-risk-scan"
          >
            {riskLoading ? (
              <ActivityIndicator size="small" color={theme.warning} />
            ) : (
              <Feather name="alert-triangle" size={16} color={theme.warning} />
            )}
            <ThemedText type="small" style={{ color: theme.warning, fontWeight: "600", marginLeft: Spacing.xs }}>
              AI Risk Scan
            </ThemedText>
          </Pressable>
        </View>

        {riskWarnings.length > 0 ? (
          <Card variant="warning" style={styles.riskCard}>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm }}>Risk Warnings</ThemedText>
            {riskWarnings.map((warning, i) => (
              <View key={`warn-${i}`} style={styles.warningRow}>
                <Feather name="alert-circle" size={14} color={theme.warning} style={{ marginTop: 3 }} />
                <ThemedText type="small" style={{ flex: 1, marginLeft: Spacing.sm, color: theme.text }}>{warning}</ThemedText>
              </View>
            ))}
          </Card>
        ) : null}

        {tiers.map((tier, index) => (
          <Card key={`scope-${index}`} style={styles.scopeCard}>
            <View style={styles.scopeHeader}>
              <ThemedText type="h4">{tier.name}</ThemedText>
              <Pressable onPress={() => setEditingScopeIndex(editingScopeIndex === index ? null : index)} testID={`button-edit-scope-${index}`}>
                <Feather name={editingScopeIndex === index ? "check" : "edit-2"} size={16} color={theme.primary} />
              </Pressable>
            </View>
            {editingScopeIndex === index ? (
              <TextInput
                style={[styles.scopeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBackground }]}
                value={tier.scopeText}
                onChangeText={(text) => {
                  if (onScopeUpdate) onScopeUpdate(index, text);
                }}
                multiline
                textAlignVertical="top"
                testID={`input-scope-${index}`}
              />
            ) : (
              <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 20 }}>
                {tier.scopeText}
              </ThemedText>
            )}

            <View style={styles.scopeBullets}>
              <ThemedText type="caption" style={{ color: theme.success, fontWeight: "600", marginBottom: Spacing.xs }}>INCLUDED</ThemedText>
              {tier.includedBullets.map((b, i) => (
                <View key={`inc-${i}`} style={styles.bulletRow}>
                  <Feather name="check" size={12} color={theme.success} style={{ marginTop: 3 }} />
                  <ThemedText type="small" style={{ flex: 1, marginLeft: Spacing.xs }}>{b}</ThemedText>
                </View>
              ))}
            </View>
            <View style={styles.scopeBullets}>
              <ThemedText type="caption" style={{ color: theme.error, fontWeight: "600", marginBottom: Spacing.xs }}>NOT INCLUDED</ThemedText>
              {tier.excludedBullets.map((b, i) => (
                <View key={`exc-${i}`} style={styles.bulletRow}>
                  <Feather name="x" size={12} color={theme.error} style={{ marginTop: 3 }} />
                  <ThemedText type="small" style={{ flex: 1, marginLeft: Spacing.xs, color: theme.textSecondary }}>{b}</ThemedText>
                </View>
              ))}
            </View>
          </Card>
        ))}

        <SectionHeader title="Schedule & Frequency" />
        <Card style={styles.scheduleCard}>
          <View style={styles.scheduleRow}>
            <Feather name="calendar" size={16} color={theme.primary} />
            <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>{FREQUENCY_LABELS[walkthrough.frequency]}</ThemedText>
          </View>
          {walkthrough.preferredDays ? (
            <View style={styles.scheduleRow}>
              <Feather name="clock" size={16} color={theme.textSecondary} />
              <ThemedText type="small" style={{ marginLeft: Spacing.sm, color: theme.textSecondary }}>
                Preferred: {walkthrough.preferredDays}
                {walkthrough.preferredTimeWindow ? `, ${walkthrough.preferredTimeWindow}` : ""}
              </ThemedText>
            </View>
          ) : null}
          {walkthrough.afterHoursRequired ? (
            <View style={styles.scheduleRow}>
              <Feather name="moon" size={16} color={theme.warning} />
              <ThemedText type="small" style={{ marginLeft: Spacing.sm, color: theme.textSecondary }}>After-hours service required</ThemedText>
            </View>
          ) : null}
        </Card>

        <SectionHeader title="Pricing Summary" />
        <Card variant="emphasis" style={styles.pricingCard}>
          <View style={styles.pricingTableHeader}>
            <ThemedText type="caption" style={[styles.pricingColName, { color: theme.textSecondary }]}>Tier</ThemedText>
            <ThemedText type="caption" style={[styles.pricingColPrice, { color: theme.textSecondary }]}>Per Visit</ThemedText>
            <ThemedText type="caption" style={[styles.pricingColPrice, { color: theme.textSecondary }]}>Monthly</ThemedText>
          </View>
          {tiers.map((tier, index) => (
            <View key={`price-${index}`} style={[styles.pricingTableRow, index === 1 ? { backgroundColor: isDark ? `${theme.primary}12` : `${theme.primary}06` } : {}]}>
              <ThemedText type="small" style={[styles.pricingColName, { fontWeight: "600" }]}>{tier.name}</ThemedText>
              <ThemedText type="body" style={[styles.pricingColPrice, { fontWeight: "700", color: theme.primary }]}>${tier.pricePerVisit.toFixed(0)}</ThemedText>
              <ThemedText type="body" style={[styles.pricingColPrice, { fontWeight: "700", color: theme.primary }]}>${tier.monthlyPrice.toFixed(0)}</ThemedText>
            </View>
          ))}
        </Card>

        <SectionHeader title="Terms & Conditions" />
        <Card style={styles.termsCard}>
          <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 20 }}>
            This proposal is valid for 30 days from the date of issue. Services will begin upon signed acceptance and completed onboarding. Either party may terminate with 30 days written notice. Pricing is based on the scope described above; additional services will be quoted separately. {walkthrough.suppliesByClient ? "Client provides all cleaning supplies and equipment." : "All cleaning supplies and equipment included."} {walkthrough.restroomConsumablesIncluded ? "Restroom consumables (soap, paper products) are included." : "Restroom consumables are not included."}
          </ThemedText>
        </Card>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.backgroundRoot, paddingBottom: insets.bottom + Spacing.md, borderTopColor: theme.border }]}>
        <View style={styles.footerRow}>
          <Button
            mode="outlined"
            onPress={onBack}
            style={styles.footerBtnSmall}
            testID="button-proposal-back"
          >
            Back
          </Button>
          <Button
            mode="outlined"
            onPress={handleExportPdf}
            disabled={pdfLoading}
            style={styles.footerBtnSmall}
            testID="button-export-pdf"
          >
            {pdfLoading ? "Exporting..." : "Export PDF"}
          </Button>
          <Button
            onPress={handleAccept}
            style={styles.footerBtnSmall}
            testID="button-accept-proposal"
          >
            Accept Proposal
          </Button>
        </View>
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
  coverCard: {
    marginTop: Spacing["2xl"],
  },
  coverHeader: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  coverDivider: {
    height: 1,
    marginBottom: Spacing.lg,
  },
  coverDetails: {
    gap: Spacing.sm,
  },
  coverRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiButtonsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  aiButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  riskCard: {
    marginBottom: Spacing.lg,
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  scopeCard: {
    marginBottom: Spacing.md,
  },
  scopeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  scopeInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    fontSize: 14,
    minHeight: 80,
    marginBottom: Spacing.sm,
  },
  scopeBullets: {
    marginTop: Spacing.md,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  scheduleCard: {
    marginBottom: Spacing.md,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  pricingCard: {
    marginBottom: Spacing.md,
  },
  pricingTableHeader: {
    flexDirection: "row",
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  pricingTableRow: {
    flexDirection: "row",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.xs,
  },
  pricingColName: {
    flex: 2,
  },
  pricingColPrice: {
    flex: 1,
    textAlign: "right",
  },
  termsCard: {
    marginBottom: Spacing.xl,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  footerRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  footerBtnSmall: {
    flex: 1,
  },
});
