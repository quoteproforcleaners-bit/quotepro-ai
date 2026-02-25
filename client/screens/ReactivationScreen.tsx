import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { ProGate } from "@/components/ProGate";
import { useAIConsent } from "@/context/AIConsentContext";

function useDesignTokens() {
  const { theme, isDark } = useTheme();
  return useMemo(() => ({
    surface: theme.surface0,
    surfaceSecondary: theme.surface1,
    border: theme.border,
    accent: theme.primary,
    accentSoft: theme.primarySoft,
    textPrimary: theme.text,
    textSecondary: theme.textSecondary,
    overlay: theme.overlay,
  }), [theme, isDark]);
}

type Segment = "dormant" | "lost" | "custom";

interface CampaignTemplate {
  name: string;
  icon: keyof typeof Feather.glyphMap;
  segment: Segment;
  description: string;
  promptSuggestions: string[];
}

const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  { name: "Spring Cleaning Special", icon: "sun", segment: "dormant", description: "Reach out to past customers with a spring refresh offer", promptSuggestions: ["Mention a discount or special rate", "Focus on allergen and dust removal", "Highlight window and deep carpet cleaning"] },
  { name: "Holiday Deep Clean", icon: "gift", segment: "dormant", description: "Offer pre-holiday deep cleaning to all past customers", promptSuggestions: ["Mention getting ready for holiday guests", "Offer a pre-holiday discount", "Focus on kitchen and living area deep clean"] },
  { name: "New Year Fresh Start", icon: "star", segment: "dormant", description: "Ring in the new year with a clean home promotion", promptSuggestions: ["Tie into New Year's resolutions", "Offer a fresh-start package deal", "Mention starting the year clutter-free"] },
  { name: "Back to School Clean", icon: "book-open", segment: "dormant", description: "Target families getting ready for the school year", promptSuggestions: ["Focus on kid-friendly cleaning", "Mention getting organized for school routines", "Offer a family home refresh package"] },
  { name: "Win Back Lost Leads", icon: "refresh-cw", segment: "lost", description: "Follow up on quotes that were never accepted", promptSuggestions: ["Offer a limited-time discount on their original quote", "Mention availability opening up", "Keep it brief and no-pressure"] },
  { name: "VIP Customer Appreciation", icon: "heart", segment: "custom", description: "Send a thank-you offer to your best customers", promptSuggestions: ["Include a loyalty discount", "Thank them for referrals", "Offer priority scheduling"] },
];

export default function ReactivationScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  const dt = useDesignTokens();
  const { requestConsent } = useAIConsent();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;

  const [segment, setSegment] = useState<"dormant" | "lost">("dormant");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalStep, setModalStep] = useState<"templates" | "custom" | "customize">("templates");
  const [campaignName, setCampaignName] = useState("");
  const [campaignSegment, setCampaignSegment] = useState<Segment>("dormant");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [generatingContent, setGeneratingContent] = useState(false);
  const [viewingCampaign, setViewingCampaign] = useState<any>(null);
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedPromptChips, setSelectedPromptChips] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [editingSubject, setEditingSubject] = useState("");
  const [editingContent, setEditingContent] = useState("");
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);

  const dormantQuery = useQuery<any[]>({ queryKey: ["/api/opportunities/dormant"], enabled: segment === "dormant" });
  const lostQuery = useQuery<any[]>({ queryKey: ["/api/opportunities/lost"], enabled: segment === "lost" });
  const customersQuery = useQuery<any[]>({ queryKey: ["/api/customers"] });
  const campaignsQuery = useQuery<any[]>({ queryKey: ["/api/campaigns"] });

  const data = segment === "dormant" ? dormantQuery.data : lostQuery.data;
  const isLoading = segment === "dormant" ? dormantQuery.isLoading : lostQuery.isLoading;
  const isRefetching = segment === "dormant" ? dormantQuery.isRefetching : lostQuery.isRefetching;

  const totalDormant = dormantQuery.data?.length ?? 0;
  const estimatedValue = dormantQuery.data?.reduce((sum: number, c: any) => sum + (c.avgTicket ?? 0), 0) ?? 0;

  const filteredCustomers = useMemo(() => {
    if (!customersQuery.data) return [];
    const search = customerSearch.toLowerCase();
    return customersQuery.data.filter((c: any) => {
      if (!search) return true;
      return (c.name || "").toLowerCase().includes(search) || (c.email || "").toLowerCase().includes(search) || (c.phone || "").includes(search);
    });
  }, [customersQuery.data, customerSearch]);

  const toggleCustomer = (id: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleReachOut = async (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await apiRequest("POST", "/api/growth-tasks", {
      type: "REACTIVATION",
      customerId: item.customerId ?? item.id,
      estimatedValue: item.avgTicket,
    });
    queryClient.invalidateQueries({ queryKey: ["/api/opportunities/dormant"] });
  };

  const handleRecover = async (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await apiRequest("POST", "/api/growth-tasks", {
      type: "ABANDONED_RECOVERY",
      customerId: item.customerId ?? item.id,
      quoteId: item.quoteId ?? item.id,
      estimatedValue: item.total,
    });
    queryClient.invalidateQueries({ queryKey: ["/api/opportunities/lost"] });
  };

  const buildFullPrompt = () => {
    const parts = [...selectedPromptChips];
    if (customPrompt.trim()) parts.push(customPrompt.trim());
    return parts.join(". ");
  };

  const generateAndAttachContent = async (campaign: any, _prompt?: string) => {
    const consented = await requestConsent();
    if (!consented) return;
    try {
      setGeneratingContent(true);
      setAiError(false);
      const aiRes = await apiRequest("POST", "/api/ai/generate-campaign-content", {
        campaignName: campaign.name,
        segment: campaign.segment,
        channel: campaign.channel || "email",
      });
      const aiData = await aiRes.json();
      if (!aiData.content) {
        setAiError(true);
        return;
      }
      await apiRequest("PUT", `/api/campaigns/${campaign.id}`, {
        messageContent: aiData.content,
        messageSubject: aiData.subject || "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setViewingCampaign((prev: any) => prev?.id === campaign.id ? { ...prev, messageContent: aiData.content, messageSubject: aiData.subject || "" } : prev);
      setEditingSubject(aiData.subject || "");
      setEditingContent(aiData.content);
      setHasUnsavedEdits(false);
    } catch (e) {
      console.error("AI content generation error:", e);
      setAiError(true);
    } finally {
      setGeneratingContent(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const prompt = buildFullPrompt();
      const campaignRes = await apiRequest("POST", "/api/campaigns", {
        name: campaignName,
        segment: campaignSegment,
        channel: "email",
        customerIds: selectedCustomerIds.length > 0 ? selectedCustomerIds : undefined,
        messageContent: "",
        messageSubject: "",
      });
      const campaign = await campaignRes.json();
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      resetModal();
      setViewingCampaign(campaign);
      setEditingSubject("");
      setEditingContent("");
      setHasUnsavedEdits(false);
      generateAndAttachContent(campaign, prompt);
    } catch (error) {
      console.error("Campaign creation error:", error);
    }
  };

  const handleSelectTemplate = (template: CampaignTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedTemplate(template);
    setSelectedPromptChips([]);
    setCustomPrompt("");
    setModalStep("customize");
  };

  const handleConfirmTemplate = async () => {
    if (!selectedTemplate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const prompt = buildFullPrompt();
    try {
      const campaignRes = await apiRequest("POST", "/api/campaigns", {
        name: selectedTemplate.name,
        segment: selectedTemplate.segment,
        channel: "email",
        templateKey: selectedTemplate.name,
        messageContent: "",
        messageSubject: "",
      });
      const campaign = await campaignRes.json();
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      resetModal();
      setViewingCampaign(campaign);
      setEditingSubject("");
      setEditingContent("");
      setHasUnsavedEdits(false);
      generateAndAttachContent(campaign, prompt);
    } catch (error) {
      console.error("Campaign creation error:", error);
    }
  };

  const togglePromptChip = (chip: string) => {
    setSelectedPromptChips((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  const openModal = () => {
    setModalVisible(true);
    setModalStep("templates");
    setCampaignName("");
    setCampaignSegment("dormant");
    setSelectedCustomerIds([]);
    setCustomerSearch("");
    setSelectedTemplate(null);
    setSelectedPromptChips([]);
    setCustomPrompt("");
  };

  const resetModal = () => {
    setModalVisible(false);
    setCampaignName("");
    setSelectedCustomerIds([]);
    setCustomerSearch("");
    setModalStep("templates");
    setSelectedTemplate(null);
    setSelectedPromptChips([]);
    setCustomPrompt("");
  };

  const refetch = () => {
    if (segment === "dormant") dormantQuery.refetch();
    else lostQuery.refetch();
  };

  const renderDormantItem = ({ item }: { item: any }) => (
    <Card style={styles.listCard}>
      <View style={styles.itemRow}>
        <View style={{ flex: 1 }}>
          <ThemedText type="subtitle">{item.customerName ?? item.name}</ThemedText>
          <ThemedText type="caption" style={{ color: dt.textSecondary }}>
            Last job: {item.lastJobDate ?? "N/A"}
          </ThemedText>
          <ThemedText type="small" style={{ color: dt.accent }}>
            Avg ticket: ${item.avgTicket?.toFixed(0) ?? "0"}
          </ThemedText>
        </View>
        <Pressable
          testID={`button-reach-out-${item.id}`}
          onPress={() => handleReachOut(item)}
          style={[styles.actionBtn, { backgroundColor: dt.accentSoft }]}
        >
          <Feather name="phone" size={14} color={dt.accent} />
          <ThemedText type="caption" style={{ color: dt.accent, marginLeft: 4 }}>Reach Out</ThemedText>
        </Pressable>
      </View>
    </Card>
  );

  const renderLostItem = ({ item }: { item: any }) => (
    <Card style={styles.listCard}>
      <View style={styles.itemRow}>
        <View style={{ flex: 1 }}>
          <ThemedText type="subtitle">{item.customerName ?? item.name}</ThemedText>
          <ThemedText type="caption" style={{ color: dt.textSecondary }}>
            Total: ${item.total?.toFixed(0) ?? "0"}
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: item.status === "expired" ? theme.warning + "20" : theme.error + "20" }]}>
            <ThemedText type="caption" style={{ color: item.status === "expired" ? theme.warning : theme.error }}>
              {item.status ?? "expired"}
            </ThemedText>
          </View>
        </View>
        <Pressable
          testID={`button-recover-${item.id}`}
          onPress={() => handleRecover(item)}
          style={[styles.actionBtn, { backgroundColor: theme.success + "15" }]}
        >
          <Feather name="refresh-cw" size={14} color={theme.success} />
          <ThemedText type="caption" style={{ color: theme.success, marginLeft: 4 }}>Recover</ThemedText>
        </Pressable>
      </View>
    </Card>
  );

  const SegmentOption = ({ label, value }: { label: string; value: "dormant" | "lost" }) => (
    <Pressable
      testID={`tab-${value}`}
      onPress={() => setSegment(value)}
      style={[styles.segmentTab, segment === value ? { backgroundColor: dt.accent } : { backgroundColor: dt.surfaceSecondary }]}
    >
      <ThemedText type="small" style={{ color: segment === value ? "#FFFFFF" : dt.textPrimary }}>{label}</ThemedText>
    </Pressable>
  );

  const renderTemplatesStep = () => {
    if (generatingContent) return (
      <View style={{ alignItems: "center", paddingVertical: 60 }}>
        <ActivityIndicator size="large" color={dt.accent} />
        <ThemedText type="subtitle" style={{ color: dt.textPrimary, marginTop: Spacing.lg }}>Creating your campaign...</ThemedText>
        <ThemedText type="caption" style={{ color: dt.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
          AI is writing a personalized message for your customers
        </ThemedText>
      </View>
    );
    return (
    <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
      <ThemedText type="small" style={{ color: dt.textSecondary, marginBottom: Spacing.lg, lineHeight: 20 }}>
        Choose a ready-made campaign or start from scratch.
      </ThemedText>
      {CAMPAIGN_TEMPLATES.map((template, idx) => (
        <Pressable
          key={idx}
          onPress={() => handleSelectTemplate(template)}
          style={[styles.templateCard, { backgroundColor: dt.surfaceSecondary, borderColor: dt.border }]}
        >
          <View style={[styles.templateIcon, { backgroundColor: dt.accentSoft }]}>
            <Feather name={template.icon} size={18} color={dt.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle" style={{ marginBottom: 2 }}>{template.name}</ThemedText>
            <ThemedText type="caption" style={{ color: dt.textSecondary }}>{template.description}</ThemedText>
          </View>
          <Feather name="chevron-right" size={18} color={dt.textSecondary} />
        </Pressable>
      ))}
      <Pressable
        onPress={() => { setModalStep("custom"); setCampaignName(""); setCampaignSegment("dormant"); }}
        style={[styles.templateCard, { backgroundColor: dt.accentSoft, borderColor: dt.accent, borderStyle: "dashed" as any }]}
      >
        <View style={[styles.templateIcon, { backgroundColor: dt.accent }]}>
          <Feather name="plus" size={18} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="subtitle" style={{ color: dt.accent }}>Custom Campaign</ThemedText>
          <ThemedText type="caption" style={{ color: dt.textSecondary }}>Build your own from scratch</ThemedText>
        </View>
        <Feather name="chevron-right" size={18} color={dt.accent} />
      </Pressable>
    </ScrollView>
    );
  };

  const renderCustomizeStep = () => {
    if (!selectedTemplate) return null;
    return (
      <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.templateCard, { backgroundColor: dt.accentSoft, borderColor: dt.accent, marginBottom: Spacing.lg }]}>
          <View style={[styles.templateIcon, { backgroundColor: dt.accent }]}>
            <Feather name={selectedTemplate.icon} size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle">{selectedTemplate.name}</ThemedText>
            <ThemedText type="caption" style={{ color: dt.textSecondary }}>{selectedTemplate.description}</ThemedText>
          </View>
        </View>

        <ThemedText type="small" style={{ color: dt.textSecondary, marginBottom: Spacing.sm }}>Customize your message (optional)</ThemedText>
        <ThemedText type="caption" style={{ color: dt.textSecondary, marginBottom: Spacing.md, lineHeight: 18 }}>
          Select any suggestions below or write your own instructions for the AI.
        </ThemedText>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginBottom: Spacing.lg }}>
          {selectedTemplate.promptSuggestions.map((suggestion, idx) => {
            const isSelected = selectedPromptChips.includes(suggestion);
            return (
              <Pressable
                key={idx}
                onPress={() => togglePromptChip(suggestion)}
                style={{
                  paddingHorizontal: Spacing.md,
                  paddingVertical: Spacing.sm,
                  borderRadius: 20,
                  borderWidth: 1,
                  backgroundColor: isSelected ? dt.accentSoft : dt.surfaceSecondary,
                  borderColor: isSelected ? dt.accent : dt.border,
                }}
              >
                <ThemedText type="caption" style={{ color: isSelected ? dt.accent : dt.textPrimary, fontWeight: isSelected ? "600" : "400" }}>
                  {suggestion}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <ThemedText type="small" style={{ color: dt.textSecondary, marginBottom: Spacing.sm }}>Your own instructions</ThemedText>
        <TextInput
          testID="input-custom-prompt"
          value={customPrompt}
          onChangeText={setCustomPrompt}
          placeholder="e.g. Offer 15% off for first-time rebookers"
          placeholderTextColor={dt.textSecondary}
          multiline
          numberOfLines={3}
          style={[styles.input, { backgroundColor: theme.inputBackground, color: dt.textPrimary, borderColor: dt.border, minHeight: 80, textAlignVertical: "top" }]}
        />

        <Pressable
          testID="button-confirm-template"
          onPress={handleConfirmTemplate}
          style={[styles.createBtn, { backgroundColor: dt.accent, marginTop: Spacing.lg, flexDirection: "row", justifyContent: "center", gap: Spacing.xs }]}
        >
          <Feather name="zap" size={16} color="#FFFFFF" />
          <ThemedText type="subtitle" style={{ color: "#FFFFFF" }}>Generate Campaign</ThemedText>
        </Pressable>
      </ScrollView>
    );
  };

  const renderCustomStep = () => {
    if (generatingContent) return (
      <View style={{ alignItems: "center", paddingVertical: 60 }}>
        <ActivityIndicator size="large" color={dt.accent} />
        <ThemedText type="subtitle" style={{ color: dt.textPrimary, marginTop: Spacing.lg }}>Creating your campaign...</ThemedText>
        <ThemedText type="caption" style={{ color: dt.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
          AI is writing a personalized message for your customers
        </ThemedText>
      </View>
    );
    return (
    <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
      <ThemedText type="small" style={{ color: dt.textSecondary, marginBottom: Spacing.sm }}>Campaign Name</ThemedText>
      <TextInput
        testID="input-campaign-name"
        value={campaignName}
        onChangeText={setCampaignName}
        placeholder="e.g. Spring Reactivation"
        placeholderTextColor={dt.textSecondary}
        style={[styles.input, { backgroundColor: theme.inputBackground, color: dt.textPrimary, borderColor: dt.border }]}
      />

      <ThemedText type="small" style={{ color: dt.textSecondary, marginBottom: Spacing.sm }}>Target Audience</ThemedText>
      <View style={styles.pickerRow}>
        {([
          { value: "dormant" as Segment, label: "Dormant" },
          { value: "lost" as Segment, label: "Lost Quotes" },
          { value: "custom" as Segment, label: "Manual" },
        ]).map(({ value, label }) => (
          <Pressable
            key={value}
            testID={`picker-segment-${value}`}
            onPress={() => setCampaignSegment(value)}
            style={[styles.pickerOption, campaignSegment === value ? { backgroundColor: dt.accentSoft, borderColor: dt.accent } : { borderColor: dt.border }]}
          >
            <ThemedText type="small" style={{ color: campaignSegment === value ? dt.accent : dt.textPrimary }}>
              {label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {campaignSegment === "custom" ? (
        <View style={{ marginBottom: Spacing.lg }}>
          <ThemedText type="small" style={{ color: dt.textSecondary, marginBottom: Spacing.sm }}>
            Select Customers ({selectedCustomerIds.length} selected)
          </ThemedText>
          <TextInput
            testID="input-customer-search"
            value={customerSearch}
            onChangeText={setCustomerSearch}
            placeholder="Search by name, email, or phone..."
            placeholderTextColor={dt.textSecondary}
            style={[styles.input, { backgroundColor: theme.inputBackground, color: dt.textPrimary, borderColor: dt.border, marginBottom: Spacing.sm }]}
          />
          <View style={[styles.customerList, { borderColor: dt.border }]}>
            {customersQuery.isLoading ? (
              <ActivityIndicator color={dt.accent} style={{ padding: Spacing.lg }} />
            ) : filteredCustomers.length === 0 ? (
              <ThemedText type="caption" style={{ color: dt.textSecondary, padding: Spacing.md, textAlign: "center" }}>
                No customers found
              </ThemedText>
            ) : (
              <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                {filteredCustomers.map((c: any) => {
                  const isSelected = selectedCustomerIds.includes(c.id.toString());
                  return (
                    <Pressable
                      key={c.id}
                      testID={`customer-${c.id}`}
                      onPress={() => toggleCustomer(c.id.toString())}
                      style={[styles.customerRow, { backgroundColor: isSelected ? dt.accentSoft : "transparent" }]}
                    >
                      <View style={[styles.checkbox, { borderColor: isSelected ? dt.accent : dt.border, backgroundColor: isSelected ? dt.accent : "transparent" }]}>
                        {isSelected ? <Feather name="check" size={12} color="#FFFFFF" /> : null}
                      </View>
                      <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                        <ThemedText type="small">{c.name || "Unnamed"}</ThemedText>
                        {c.email ? <ThemedText type="caption" style={{ color: dt.textSecondary }}>{c.email}</ThemedText> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      ) : null}

      <ThemedText type="small" style={{ color: dt.textSecondary, marginBottom: Spacing.sm }}>Custom AI Instructions (optional)</ThemedText>
      <TextInput
        testID="input-custom-prompt-custom"
        value={customPrompt}
        onChangeText={setCustomPrompt}
        placeholder="e.g. Mention a 10% discount, keep the tone casual"
        placeholderTextColor={dt.textSecondary}
        multiline
        numberOfLines={3}
        style={[styles.input, { backgroundColor: theme.inputBackground, color: dt.textPrimary, borderColor: dt.border, minHeight: 70, textAlignVertical: "top" }]}
      />

      <Pressable
        testID="button-create-campaign"
        onPress={handleCreateCampaign}
        style={[styles.createBtn, { backgroundColor: dt.accent, opacity: campaignName.trim() ? 1 : 0.5 }]}
        disabled={!campaignName.trim()}
      >
        <ThemedText type="subtitle" style={{ color: "#FFFFFF" }}>Create Campaign</ThemedText>
      </Pressable>
    </ScrollView>
    );
  };

  return (
    <ProGate featureName="Reactivation Campaigns">
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item, i) => item.id?.toString() ?? i.toString()}
        renderItem={segment === "dormant" ? renderDormantItem : renderLostItem}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={dt.accent} />}
        contentContainerStyle={{ paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + 100, paddingHorizontal: Spacing.lg, ...(useMaxWidth ? { maxWidth: 560, alignSelf: "center" as const, width: "100%" } : undefined) }}
        ListHeaderComponent={
          <>
            <Card style={{ marginBottom: Spacing.md, padding: Spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm }}>
                <Feather name="info" size={16} color={dt.accent} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" style={{ color: dt.textSecondary, lineHeight: 20, marginBottom: Spacing.sm }}>
                    <ThemedText type="small" style={{ fontWeight: "700", color: dt.textPrimary }}>Dormant Customers</ThemedText>
                    {" "}are customers who had a completed job but haven't booked again in over 60 days. They already know your work and are the easiest to win back.
                  </ThemedText>
                  <ThemedText type="small" style={{ color: dt.textSecondary, lineHeight: 20 }}>
                    <ThemedText type="small" style={{ fontWeight: "700", color: dt.textPrimary }}>Lost Quotes</ThemedText>
                    {" "}are quotes you sent that were never accepted and have since expired (over 30 days old). A quick follow-up can often recover this revenue.
                  </ThemedText>
                </View>
              </View>
            </Card>

            <Card style={{...styles.summaryCard, borderColor: dt.border}}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <ThemedText type="h2" testID="text-dormant-count">{totalDormant}</ThemedText>
                  <ThemedText type="caption" style={{ color: dt.textSecondary }}>Dormant Customers</ThemedText>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: dt.border }]} />
                <View style={styles.summaryItem}>
                  <ThemedText type="h2" testID="text-recovery-value">${estimatedValue.toLocaleString()}</ThemedText>
                  <ThemedText type="caption" style={{ color: dt.textSecondary }}>Est. Recovery Value</ThemedText>
                </View>
              </View>
            </Card>
            {(campaignsQuery.data?.length ?? 0) > 0 ? (
              <View style={{ marginBottom: Spacing.lg }}>
                <ThemedText type="h4" style={{ marginBottom: Spacing.sm }}>Your Campaigns</ThemedText>
                {campaignsQuery.data?.slice(0, 5).map((campaign: any) => {
                  const customerCount = Array.isArray(campaign.customerIds) ? campaign.customerIds.length : 0;
                  return (
                    <Pressable
                      key={campaign.id}
                      onPress={() => {
                        setViewingCampaign(campaign);
                        setEditingSubject(campaign.messageSubject || "");
                        setEditingContent(campaign.messageContent || "");
                        setHasUnsavedEdits(false);
                        if (!campaign.messageContent) {
                          generateAndAttachContent(campaign);
                        }
                      }}
                      style={{ flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: dt.border }}
                    >
                      <View style={{ flex: 1 }}>
                        <ThemedText type="subtitle">{campaign.name}</ThemedText>
                        <ThemedText type="caption" style={{ color: dt.textSecondary }}>
                          Email{customerCount > 0 ? ` \u00B7 ${customerCount} customer${customerCount !== 1 ? "s" : ""}` : ""}{` \u00B7 ${campaign.status}`}
                        </ThemedText>
                      </View>
                      <Feather name="chevron-right" size={18} color={dt.textSecondary} />
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.segmentRow}>
              <SegmentOption label="Dormant" value="dormant" />
              <SegmentOption label="Lost Quotes" value="lost" />
            </View>
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={dt.accent} style={{ marginTop: Spacing["3xl"] }} />
          ) : (
            <View style={styles.emptyState}>
              <Feather name="users" size={48} color={dt.textSecondary} />
              <ThemedText type="subtitle" style={{ color: dt.textSecondary, marginTop: Spacing.md }}>
                {segment === "dormant" ? "No dormant customers found" : "No lost quotes found"}
              </ThemedText>
              <ThemedText type="caption" style={{ color: dt.textSecondary, marginTop: Spacing.xs, textAlign: "center", paddingHorizontal: Spacing.xl }}>
                {segment === "dormant"
                  ? "Customers who haven't booked in 60+ days will appear here"
                  : "Quotes sent but not accepted after 30+ days will show up here"}
              </ThemedText>
            </View>
          )
        }
      />

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md, backgroundColor: theme.backgroundRoot, borderTopColor: dt.border }]}>
        <Pressable
          testID="fab-create-campaign"
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); openModal(); }}
          style={[styles.campaignButton, { backgroundColor: dt.accent }]}
        >
          <Feather name="plus" size={20} color="#FFFFFF" />
          <ThemedText type="subtitle" style={{ color: "#FFFFFF", marginLeft: Spacing.sm }}>New Campaign</ThemedText>
        </Pressable>
      </View>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={resetModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={[styles.modalOverlay, { backgroundColor: dt.overlay, justifyContent: "flex-start", paddingTop: 80 }]}>
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
                  {modalStep !== "templates" ? (
                    <Pressable onPress={() => setModalStep("templates")} hitSlop={8}>
                      <Feather name="arrow-left" size={20} color={dt.textPrimary} />
                    </Pressable>
                  ) : null}
                  <ThemedText type="h3">{modalStep === "templates" ? "New Campaign" : modalStep === "customize" ? "Customize Campaign" : "Campaign Details"}</ThemedText>
                </View>
                <Pressable testID="button-close-modal" onPress={resetModal}>
                  <Feather name="x" size={24} color={dt.textPrimary} />
                </Pressable>
              </View>

              {modalStep === "templates" ? renderTemplatesStep() : modalStep === "customize" ? renderCustomizeStep() : renderCustomStep()}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!viewingCampaign} transparent animationType="slide" onRequestClose={() => { setViewingCampaign(null); setConfirmSend(false); setSendResult(null); setHasUnsavedEdits(false); }}>
        <View style={{ flex: 1, backgroundColor: dt.overlay, justifyContent: "flex-end" }}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.xl, maxHeight: "80%", marginHorizontal: 0 }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h3" style={{ flex: 1 }}>{viewingCampaign?.name}</ThemedText>
              <Pressable onPress={() => { setViewingCampaign(null); setConfirmSend(false); setSendResult(null); setAiError(false); }} hitSlop={8}>
                <Feather name="x" size={24} color={dt.textPrimary} />
              </Pressable>
            </View>
            
            <View style={{ flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg }}>
              <View style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: 16, backgroundColor: dt.accentSoft }}>
                <ThemedText type="caption" style={{ color: dt.accent, fontWeight: "600" }}>
                  Email
                </ThemedText>
              </View>
              <View style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: 16, backgroundColor: viewingCampaign?.status === "active" || viewingCampaign?.status === "sent" ? theme.success + "20" : dt.surfaceSecondary }}>
                <ThemedText type="caption" style={{ color: viewingCampaign?.status === "active" ? theme.success : dt.textSecondary, fontWeight: "600" }}>
                  {viewingCampaign?.status}
                </ThemedText>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: Spacing.lg }} keyboardShouldPersistTaps="handled">
              {(viewingCampaign?.messageContent || editingContent) ? (
                <View style={{ marginBottom: Spacing.md }}>
                  <ThemedText type="caption" style={{ color: dt.textSecondary, marginBottom: 4 }}>Subject</ThemedText>
                  <TextInput
                    value={editingSubject}
                    onChangeText={(text) => { setEditingSubject(text); setHasUnsavedEdits(true); }}
                    style={{ fontSize: 16, fontWeight: "600", color: dt.textPrimary, backgroundColor: dt.surfaceSecondary, borderRadius: BorderRadius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: dt.border }}
                    placeholderTextColor={dt.textSecondary}
                    placeholder="Enter subject line..."
                  />
                </View>
              ) : null}
              
              <ThemedText type="caption" style={{ color: dt.textSecondary, marginBottom: 4 }}>Message</ThemedText>
              {(viewingCampaign?.messageContent || editingContent) ? (
                <View style={{ backgroundColor: dt.surfaceSecondary, borderRadius: BorderRadius.sm, padding: Spacing.md, borderWidth: 1, borderColor: dt.border }}>
                  <TextInput
                    value={editingContent}
                    onChangeText={(text) => { setEditingContent(text); setHasUnsavedEdits(true); }}
                    style={{ fontSize: 15, lineHeight: 22, color: dt.textPrimary, minHeight: 200 }}
                    multiline
                    textAlignVertical="top"
                    placeholderTextColor={dt.textSecondary}
                    placeholder="Enter message content..."
                  />
                </View>
              ) : generatingContent ? (
                <View style={{ alignItems: "center", paddingVertical: Spacing.xl }}>
                  <ActivityIndicator size="large" color={dt.accent} />
                  <ThemedText type="caption" style={{ color: dt.textSecondary, marginTop: Spacing.sm }}>AI is writing your message...</ThemedText>
                </View>
              ) : (
                <View style={{ alignItems: "center", paddingVertical: Spacing.xl }}>
                  <Feather name={aiError ? "alert-circle" : "file-text"} size={32} color={aiError ? theme.error : dt.textSecondary} />
                  <ThemedText type="caption" style={{ color: aiError ? theme.error : dt.textSecondary, marginTop: Spacing.sm }}>
                    {aiError ? "Failed to generate content. Tap below to try again." : "No message content yet"}
                  </ThemedText>
                  <Pressable
                    onPress={() => {
                      if (viewingCampaign) generateAndAttachContent(viewingCampaign);
                    }}
                    style={{ marginTop: Spacing.md, flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.sm, backgroundColor: dt.accentSoft }}
                  >
                    <Feather name="zap" size={16} color={dt.accent} />
                    <ThemedText type="small" style={{ color: dt.accent, fontWeight: "600", marginLeft: Spacing.xs }}>Generate with AI</ThemedText>
                  </Pressable>
                </View>
              )}
              
              {Array.isArray(viewingCampaign?.customerIds) && viewingCampaign.customerIds.length > 0 ? (
                <View style={{ marginTop: Spacing.lg }}>
                  <ThemedText type="caption" style={{ color: dt.textSecondary, marginBottom: 4 }}>
                    {viewingCampaign.customerIds.length} customer{viewingCampaign.customerIds.length !== 1 ? "s" : ""} targeted
                  </ThemedText>
                </View>
              ) : null}
            </ScrollView>

            {sendResult ? (
              <View style={{ alignItems: "center", paddingVertical: Spacing.md }}>
                <Feather name="check-circle" size={32} color={theme.success} />
                <ThemedText type="subtitle" style={{ marginTop: Spacing.sm, color: theme.success }}>Campaign Sent</ThemedText>
                <ThemedText type="body" style={{ color: dt.textSecondary, marginTop: 4 }}>
                  {sendResult.sent} of {sendResult.total} messages delivered
                </ThemedText>
                {sendResult.failed > 0 ? (
                  <ThemedText type="caption" style={{ color: theme.error, marginTop: 4 }}>
                    {sendResult.failed} failed (missing contact info)
                  </ThemedText>
                ) : null}
                <Pressable
                  onPress={() => { setSendResult(null); setViewingCampaign(null); }}
                  style={{ marginTop: Spacing.lg, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.sm, backgroundColor: dt.accent }}
                >
                  <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600" }}>Done</ThemedText>
                </Pressable>
              </View>
            ) : confirmSend ? (
              <View>
                <View style={{ backgroundColor: theme.warning + "15", borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.md }}>
                  <ThemedText type="subtitle" style={{ marginBottom: 4 }}>Confirm Send</ThemedText>
                  <ThemedText type="body" style={{ color: dt.textSecondary }}>
                    This will send the email to all {viewingCampaign?.segment === "dormant" ? "past customers" : viewingCampaign?.segment === "lost" ? "quote leads" : "targeted customers"}. This cannot be undone.
                  </ThemedText>
                </View>
                <View style={{ flexDirection: "row", gap: Spacing.sm }}>
                  <Pressable
                    onPress={() => setConfirmSend(false)}
                    style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: dt.border }}
                  >
                    <ThemedText type="small" style={{ color: dt.textSecondary, fontWeight: "600" }}>Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={async () => {
                      setConfirmSend(false);
                      setSendingCampaign(true);
                      try {
                        const res = await apiRequest("POST", `/api/campaigns/${viewingCampaign?.id}/send`, {});
                        const data = await res.json();
                        setSendResult(data);
                        setViewingCampaign((prev: any) => prev ? { ...prev, status: "sent" } : prev);
                        queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
                      } catch (e: any) {
                        let msg = "Failed to send campaign";
                        try { const errData = await e?.response?.json(); msg = errData?.message || msg; } catch {}
                        setSendResult({ sent: 0, failed: 1, total: 1 });
                      } finally {
                        setSendingCampaign(false);
                      }
                    }}
                    style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: Spacing.md, borderRadius: BorderRadius.sm, backgroundColor: theme.error }}
                  >
                    <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600" }}>Send Now</ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ gap: Spacing.sm }}>
                {hasUnsavedEdits ? (
                  <Pressable
                    onPress={async () => {
                      try {
                        await apiRequest("PUT", `/api/campaigns/${viewingCampaign?.id}`, {
                          messageContent: editingContent,
                          messageSubject: editingSubject,
                        });
                        queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
                        setViewingCampaign({ ...viewingCampaign, messageContent: editingContent, messageSubject: editingSubject });
                        setHasUnsavedEdits(false);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      } catch (e) {
                        console.error("Save edit error:", e);
                      }
                    }}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: Spacing.md, borderRadius: BorderRadius.sm, backgroundColor: dt.accent }}
                  >
                    <Feather name="check" size={16} color="#FFFFFF" />
                    <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.xs }}>Save Changes</ThemedText>
                  </Pressable>
                ) : null}
                {viewingCampaign?.status !== "sent" ? (
                  <Pressable
                    onPress={() => setConfirmSend(true)}
                    disabled={!editingContent || generatingContent || sendingCampaign || hasUnsavedEdits}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: Spacing.md, borderRadius: BorderRadius.sm, backgroundColor: !editingContent || generatingContent || hasUnsavedEdits ? dt.surfaceSecondary : theme.success, opacity: !editingContent || generatingContent || hasUnsavedEdits ? 0.5 : 1 }}
                  >
                    {sendingCampaign ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Feather name="send" size={16} color="#FFFFFF" />
                        <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.xs }}>
                          Send Emails
                        </ThemedText>
                      </>
                    )}
                  </Pressable>
                ) : null}
                <View style={{ flexDirection: "row", gap: Spacing.sm }}>
                  <Pressable
                    onPress={async () => {
                      const consented = await requestConsent();
                      if (!consented) return;
                      try {
                        setGeneratingContent(true);
                        setAiError(false);
                        const templateMatch = CAMPAIGN_TEMPLATES.find(t => t.name === viewingCampaign?.name);
                        const aiRes = await apiRequest("POST", "/api/ai/generate-campaign-content", {
                          campaignName: viewingCampaign?.name || viewingCampaign?.templateKey,
                          segment: viewingCampaign?.segment,
                          channel: viewingCampaign?.channel || "email",
                          useAI: true,
                        });
                        const aiData = await aiRes.json();
                        if (!aiData.content) {
                          setAiError(true);
                          return;
                        }
                        await apiRequest("PUT", `/api/campaigns/${viewingCampaign?.id}`, {
                          messageContent: aiData.content,
                          messageSubject: aiData.subject || "",
                        });
                        queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
                        setViewingCampaign({ ...viewingCampaign, messageContent: aiData.content, messageSubject: aiData.subject || "" });
                        setEditingSubject(aiData.subject || "");
                        setEditingContent(aiData.content);
                        setHasUnsavedEdits(false);
                      } catch (e) {
                        console.error("Regenerate error:", e);
                        setAiError(true);
                      } finally {
                        setGeneratingContent(false);
                      }
                    }}
                    style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: dt.border }}
                    disabled={generatingContent || sendingCampaign}
                  >
                    {generatingContent ? (
                      <ActivityIndicator size="small" color={dt.accent} />
                    ) : (
                      <>
                        <Feather name="refresh-cw" size={16} color={dt.accent} />
                        <ThemedText type="small" style={{ color: dt.accent, fontWeight: "600", marginLeft: Spacing.xs }}>Regenerate</ThemedText>
                      </>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => { setViewingCampaign(null); setConfirmSend(false); setSendResult(null); }}
                    style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: Spacing.md, borderRadius: BorderRadius.sm, backgroundColor: dt.accent }}
                  >
                    <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600" }}>Done</ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
    </ProGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryCard: { marginBottom: Spacing.lg, borderWidth: 1 },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryDivider: { width: 1, height: 40 },
  segmentRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
  segmentTab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, alignItems: "center" },
  listCard: { marginBottom: Spacing.sm },
  itemRow: { flexDirection: "row", alignItems: "center" },
  actionBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.xs },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.xs, marginTop: 4 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: Spacing["5xl"] },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  campaignButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  modalOverlay: { flex: 1 },
  modalContent: { borderRadius: BorderRadius.xl, padding: Spacing.xl, marginHorizontal: Spacing.lg },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xl },
  input: { borderWidth: 1, borderRadius: BorderRadius.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: 16, marginBottom: Spacing.lg },
  pickerRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
  pickerOption: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: Spacing.sm, borderRadius: BorderRadius.xs, borderWidth: 1 },
  createBtn: { paddingVertical: Spacing.md, borderRadius: BorderRadius.sm, alignItems: "center", marginTop: Spacing.sm },
  templateCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  templateIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  customerList: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    overflow: "hidden",
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
