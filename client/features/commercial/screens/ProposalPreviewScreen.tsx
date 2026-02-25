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
  onScopeUpdate?: (tierIndex: number, scopeText: string, includedBullets?: string[], excludedBullets?: string[]) => void;
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
  const [riskResults, setRiskResults] = useState<{ warnings: { severity: string; title: string; description: string }[]; overallAssessment: string; suggestedClauses: string[] } | null>(null);
  const [editingScopeIndex, setEditingScopeIndex] = useState<number | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const companyName = businessProfile?.companyName || "Our Company";

  const handleGenerateScope = async () => {
    console.log("[ProposalPreview] Generate scope pressed");
    try {
      const consented = await requestConsent();
      console.log("[ProposalPreview] Consent result:", consented);
      if (!consented) return;

      setScopeLoading(true);
      const results = [];
      for (let i = 0; i < tiers.length; i++) {
        console.log("[ProposalPreview] Generating scope for tier", i, tiers[i].name);
        const res = await apiRequest("POST", "/api/commercial/generate-scope", {
          walkthrough,
          tier: tiers[i],
        });
        const data = await res.json();
        console.log("[ProposalPreview] Scope response for tier", i, JSON.stringify(data).slice(0, 200));
        results.push(data);
        if (onScopeUpdate) {
          const scopeText = data.scopeParagraph || tiers[i].scopeText;
          const included = data.includedTasks || tiers[i].includedBullets;
          const excluded = data.excludedTasks || tiers[i].excludedBullets;
          onScopeUpdate(i, scopeText, included, excluded);
        }
      }
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      console.error("[ProposalPreview] Generate scope error:", err?.message || err);
      Alert.alert("Error", `Could not generate scope: ${err?.message || "Unknown error"}`);
    } finally {
      setScopeLoading(false);
    }
  };

  const handleRiskScan = async () => {
    console.log("[ProposalPreview] Risk scan pressed");
    try {
      const consented = await requestConsent();
      console.log("[ProposalPreview] Risk consent result:", consented);
      if (!consented) return;

      setRiskLoading(true);
      console.log("[ProposalPreview] Calling risk-scan API...");
      const res = await apiRequest("POST", "/api/commercial/risk-scan", {
        walkthrough,
        pricing,
        laborEstimate,
        tiers,
      });
      const data = await res.json();
      console.log("[ProposalPreview] Risk scan response:", JSON.stringify(data).slice(0, 200));
      setRiskResults({
        warnings: data.warnings || [],
        overallAssessment: data.overallAssessment || "",
        suggestedClauses: data.suggestedClauses || [],
      });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      console.error("[ProposalPreview] Risk scan error:", err?.message || err);
      Alert.alert("Error", `Could not perform risk scan: ${err?.message || "Unknown error"}`);
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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl + 130 }]}
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

        {riskResults ? (
          <Card variant="warning" style={styles.riskCard}>
            <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm }}>Risk Analysis</ThemedText>
            {riskResults.overallAssessment ? (
              <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md, lineHeight: 20 }}>
                {riskResults.overallAssessment}
              </ThemedText>
            ) : null}
            {riskResults.warnings.map((w, i) => {
              const severityColor = w.severity === "high" ? theme.error : w.severity === "medium" ? theme.warning : theme.textSecondary;
              return (
                <View key={`warn-${i}`} style={[styles.warningRow, { marginBottom: Spacing.md }]}>
                  <Feather
                    name={w.severity === "high" ? "alert-octagon" : "alert-circle"}
                    size={16}
                    color={severityColor}
                    style={{ marginTop: 2 }}
                  />
                  <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                    <ThemedText type="small" style={{ fontWeight: "700", color: severityColor }}>
                      {w.title}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2, lineHeight: 18 }}>
                      {w.description}
                    </ThemedText>
                  </View>
                </View>
              );
            })}
            {riskResults.suggestedClauses.length > 0 ? (
              <View style={{ marginTop: Spacing.sm }}>
                <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "700", marginBottom: Spacing.xs }}>
                  SUGGESTED CONTRACT CLAUSES
                </ThemedText>
                {riskResults.suggestedClauses.map((clause, i) => (
                  <View key={`clause-${i}`} style={styles.bulletRow}>
                    <Feather name="file-text" size={12} color={theme.primary} style={{ marginTop: 3 }} />
                    <ThemedText type="small" style={{ flex: 1, marginLeft: Spacing.xs, color: theme.text }}>{clause}</ThemedText>
                  </View>
                ))}
              </View>
            ) : null}
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
        <Button
          onPress={handleAccept}
          style={{ marginBottom: Spacing.sm }}
          testID="button-accept-proposal"
        >
          Accept Proposal
        </Button>
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
