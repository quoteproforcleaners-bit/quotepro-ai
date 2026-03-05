import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable, Platform, Modal, ScrollView, Switch, useWindowDimensions, TextInput as RNTextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { v4 as uuidv4 } from "uuid";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Input } from "@/components/Input";
import { SectionHeader } from "@/components/SectionHeader";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ServiceTypeConfig, PricingSettings } from "@/types";
import { useApp } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";

export default function PricingScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { pricingSettings: settings, updatePricingSettings } = useApp();
  const queryClient = useQueryClient();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;
  const [editingService, setEditingService] = useState<ServiceTypeConfig | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);

  const { data: growthSettings, refetch: refetchGrowthSettings } = useQuery<any>({
    queryKey: ["/api/growth-automation-settings"],
  });
  const [reviewLinkInput, setReviewLinkInput] = useState("");
  const [reviewEnabled, setReviewEnabled] = useState(false);

  useEffect(() => {
    if (growthSettings) {
      const link = growthSettings.googleReviewLink || "";
      setReviewLinkInput(link);
      setReviewEnabled(link.trim().length > 0);
    }
  }, [growthSettings]);

  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch { return false; }
  };

  const updateGrowthSetting = useCallback(async (updates: Record<string, any>) => {
    try {
      await apiRequest("PUT", "/api/growth-automation-settings", { ...(growthSettings || {}), ...updates });
      queryClient.invalidateQueries({ queryKey: ["/api/growth-automation-settings"] });
      if (Platform.OS !== "web") Haptics.selectionAsync();
    } catch (e) {
      console.warn("Failed to update growth setting:", e);
    }
  }, [growthSettings, queryClient]);

  const updateSetting = async <K extends keyof PricingSettings>(
    key: K,
    value: PricingSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    await updatePricingSettings(newSettings);
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
  };

  const updateAddOnPrice = async (
    key: keyof PricingSettings["addOnPrices"],
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;
    const newSettings = {
      ...settings,
      addOnPrices: { ...settings.addOnPrices, [key]: numValue },
    };
    await updatePricingSettings(newSettings);
  };

  const updateDiscount = async (
    key: keyof PricingSettings["frequencyDiscounts"],
    value: string
  ) => {
    const numValue = parseFloat(value) || 0;
    const newSettings = {
      ...settings,
      frequencyDiscounts: { ...settings.frequencyDiscounts, [key]: numValue },
    };
    await updatePricingSettings(newSettings);
  };

  const handleAddService = () => {
    setEditingService({
      id: uuidv4(),
      name: "",
      multiplier: 1.0,
      scope: "",
      isDefault: false,
    });
    setShowServiceModal(true);
  };

  const handleEditService = (service: ServiceTypeConfig) => {
    setEditingService({ ...service });
    setShowServiceModal(true);
  };

  const handleSaveService = async () => {
    if (!editingService || !editingService.name.trim()) return;

    const existingIndex = settings.serviceTypes.findIndex(
      (s) => s.id === editingService.id
    );

    let newServiceTypes: ServiceTypeConfig[];
    if (existingIndex >= 0) {
      newServiceTypes = [...settings.serviceTypes];
      newServiceTypes[existingIndex] = editingService;
    } else {
      newServiceTypes = [...settings.serviceTypes, editingService];
    }

    const newSettings = { ...settings, serviceTypes: newServiceTypes };
    await updatePricingSettings(newSettings);
    setShowServiceModal(false);
    setEditingService(null);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleDeleteService = async () => {
    if (!editingService) return;

    const newServiceTypes = settings.serviceTypes.filter(
      (s) => s.id !== editingService.id
    );

    let newGoodId = settings.goodOptionId;
    let newBetterId = settings.betterOptionId;
    let newBestId = settings.bestOptionId;

    if (settings.goodOptionId === editingService.id && newServiceTypes.length > 0) {
      newGoodId = newServiceTypes[0].id;
    }
    if (settings.betterOptionId === editingService.id && newServiceTypes.length > 1) {
      newBetterId = newServiceTypes[1].id;
    }
    if (settings.bestOptionId === editingService.id && newServiceTypes.length > 2) {
      newBestId = newServiceTypes[2].id;
    }

    const newSettings = {
      ...settings,
      serviceTypes: newServiceTypes,
      goodOptionId: newGoodId,
      betterOptionId: newBetterId,
      bestOptionId: newBestId,
    };
    await updatePricingSettings(newSettings);
    setShowServiceModal(false);
    setEditingService(null);
  };

  const renderServiceTypeRow = (service: ServiceTypeConfig) => (
    <Pressable
      key={service.id}
      onPress={() => handleEditService(service)}
      style={[
        styles.serviceRow,
        { backgroundColor: theme.cardBackground, borderColor: theme.border },
      ]}
    >
      <View style={styles.serviceInfo}>
        <ThemedText type="body" style={{ fontWeight: "600" }}>
          {service.name}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {service.scope}
        </ThemedText>
      </View>
      <View style={styles.serviceMultiplier}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {(service.multiplier * 100).toFixed(0)}%
        </ThemedText>
        <Feather name="chevron-right" size={16} color={theme.textSecondary} />
      </View>
    </Pressable>
  );

  return (
    <>
      <KeyboardAwareScrollViewCompat
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
          ...(useMaxWidth ? [{ maxWidth: 560, alignSelf: "center" as const, width: "100%" as const }] : []),
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <SectionHeader
          title="Base Rates"
          subtitle="Your standard pricing configuration"
        />

        <Input
          label="Hourly Rate ($)"
          value={settings.hourlyRate.toString()}
          onChangeText={(v) => updateSetting("hourlyRate", parseFloat(v) || 0)}
          keyboardType="decimal-pad"
          leftIcon="dollar-sign"
        />

        <Input
          label="Minimum Ticket ($)"
          value={settings.minimumTicket.toString()}
          onChangeText={(v) => updateSetting("minimumTicket", parseFloat(v) || 0)}
          keyboardType="decimal-pad"
          leftIcon="tag"
        />

        <Input
          label="Tax Rate (%)"
          value={settings.taxRate.toString()}
          onChangeText={(v) => updateSetting("taxRate", parseFloat(v) || 0)}
          keyboardType="decimal-pad"
          leftIcon="percent"
        />

        <SectionHeader
          title="Service Types"
          subtitle="Configure your cleaning service options"
          rightAction={
            <Pressable onPress={handleAddService} style={styles.addButton}>
              <Feather name="plus" size={20} color={theme.primary} />
            </Pressable>
          }
        />

        <View style={styles.serviceList}>
          {settings.serviceTypes.map(renderServiceTypeRow)}
        </View>

        <SectionHeader
          title="Quote Package Mapping"
          subtitle="Which service type for each package tier"
        />

        <View style={styles.mappingContainer}>
          <View style={[styles.mappingRow, { borderBottomColor: theme.border }]}>
            <ThemedText type="body">Good Option</ThemedText>
            <Pressable
              style={[styles.mappingSelect, { borderColor: theme.border }]}
              onPress={() => {
                const options = settings.serviceTypes.map((s) => s.id);
                const currentIndex = options.indexOf(settings.goodOptionId);
                const nextIndex = (currentIndex + 1) % options.length;
                updateSetting("goodOptionId", options[nextIndex]);
              }}
            >
              <ThemedText type="small">
                {settings.serviceTypes.find((s) => s.id === settings.goodOptionId)?.name || "Select"}
              </ThemedText>
              <Feather name="chevron-down" size={14} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View style={[styles.mappingRow, { borderBottomColor: theme.border }]}>
            <ThemedText type="body">Better Option</ThemedText>
            <Pressable
              style={[styles.mappingSelect, { borderColor: theme.border }]}
              onPress={() => {
                const options = settings.serviceTypes.map((s) => s.id);
                const currentIndex = options.indexOf(settings.betterOptionId);
                const nextIndex = (currentIndex + 1) % options.length;
                updateSetting("betterOptionId", options[nextIndex]);
              }}
            >
              <ThemedText type="small">
                {settings.serviceTypes.find((s) => s.id === settings.betterOptionId)?.name || "Select"}
              </ThemedText>
              <Feather name="chevron-down" size={14} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.mappingRow}>
            <ThemedText type="body">Best Option</ThemedText>
            <Pressable
              style={[styles.mappingSelect, { borderColor: theme.border }]}
              onPress={() => {
                const options = settings.serviceTypes.map((s) => s.id);
                const currentIndex = options.indexOf(settings.bestOptionId);
                const nextIndex = (currentIndex + 1) % options.length;
                updateSetting("bestOptionId", options[nextIndex]);
              }}
            >
              <ThemedText type="small">
                {settings.serviceTypes.find((s) => s.id === settings.bestOptionId)?.name || "Select"}
              </ThemedText>
              <Feather name="chevron-down" size={14} color={theme.textSecondary} />
            </Pressable>
          </View>
        </View>

        <SectionHeader
          title="Add-on Pricing"
          subtitle="Prices for additional services"
        />

        <View style={styles.addOnsGrid}>
          <View style={styles.addOnRow}>
            <Input
              label="Inside Fridge"
              value={settings.addOnPrices.insideFridge.toString()}
              onChangeText={(v) => updateAddOnPrice("insideFridge", v)}
              keyboardType="decimal-pad"
              style={styles.gridInput}
            />
            <Input
              label="Inside Oven"
              value={settings.addOnPrices.insideOven.toString()}
              onChangeText={(v) => updateAddOnPrice("insideOven", v)}
              keyboardType="decimal-pad"
              style={styles.gridInput}
            />
          </View>
          <View style={styles.addOnRow}>
            <Input
              label="Inside Cabinets"
              value={settings.addOnPrices.insideCabinets.toString()}
              onChangeText={(v) => updateAddOnPrice("insideCabinets", v)}
              keyboardType="decimal-pad"
              style={styles.gridInput}
            />
            <Input
              label="Interior Windows"
              value={settings.addOnPrices.interiorWindows.toString()}
              onChangeText={(v) => updateAddOnPrice("interiorWindows", v)}
              keyboardType="decimal-pad"
              style={styles.gridInput}
            />
          </View>
          <View style={styles.addOnRow}>
            <Input
              label="Blinds Detail"
              value={settings.addOnPrices.blindsDetail.toString()}
              onChangeText={(v) => updateAddOnPrice("blindsDetail", v)}
              keyboardType="decimal-pad"
              style={styles.gridInput}
            />
            <Input
              label="Baseboards"
              value={settings.addOnPrices.baseboardsDetail.toString()}
              onChangeText={(v) => updateAddOnPrice("baseboardsDetail", v)}
              keyboardType="decimal-pad"
              style={styles.gridInput}
            />
          </View>
          <View style={styles.addOnRow}>
            <Input
              label="Laundry Fold"
              value={settings.addOnPrices.laundryFoldOnly.toString()}
              onChangeText={(v) => updateAddOnPrice("laundryFoldOnly", v)}
              keyboardType="decimal-pad"
              style={styles.gridInput}
            />
            <Input
              label="Dishes"
              value={settings.addOnPrices.dishes.toString()}
              onChangeText={(v) => updateAddOnPrice("dishes", v)}
              keyboardType="decimal-pad"
              style={styles.gridInput}
            />
          </View>
          <Input
            label="Organization/Tidy"
            value={settings.addOnPrices.organizationTidy.toString()}
            onChangeText={(v) => updateAddOnPrice("organizationTidy", v)}
            keyboardType="decimal-pad"
          />
          <Input
            label="Biannual Deep Clean"
            value={(settings.addOnPrices.biannualDeepClean ?? 199).toString()}
            onChangeText={(v) => updateAddOnPrice("biannualDeepClean", v)}
            keyboardType="decimal-pad"
          />
        </View>

        <SectionHeader
          title="Frequency Discounts"
          subtitle="Discounts for recurring customers"
        />

        <Input
          label="Weekly Discount (%)"
          value={settings.frequencyDiscounts.weekly.toString()}
          onChangeText={(v) => updateDiscount("weekly", v)}
          keyboardType="decimal-pad"
          leftIcon="percent"
        />

        <Input
          label="Biweekly Discount (%)"
          value={settings.frequencyDiscounts.biweekly.toString()}
          onChangeText={(v) => updateDiscount("biweekly", v)}
          keyboardType="decimal-pad"
          leftIcon="percent"
        />

        <Input
          label="Monthly Discount (%)"
          value={settings.frequencyDiscounts.monthly.toString()}
          onChangeText={(v) => updateDiscount("monthly", v)}
          keyboardType="decimal-pad"
          leftIcon="percent"
        />

        <SectionHeader title="Google Reviews" />

        <View style={[styles.reviewCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.reviewToggleRow}>
            <View style={[styles.reviewIcon, { backgroundColor: `${theme.primary}15` }]}>
              <Feather name="star" size={18} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Include Google Review Link
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                Add your review link to quotes and messages
              </ThemedText>
            </View>
            <Switch
              value={reviewEnabled}
              onValueChange={(val) => {
                setReviewEnabled(val);
                if (!val) {
                  setReviewLinkInput("");
                  updateGrowthSetting({ googleReviewLink: "", includeReviewOnPdf: false, includeReviewInMessages: false });
                }
              }}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#FFFFFF"
              testID="switch-review-enabled"
            />
          </View>

          {reviewEnabled ? (
            <View style={[styles.reviewInputArea, { borderTopColor: theme.border }]}>
              <ThemedText type="small" style={{ fontWeight: "600", marginBottom: Spacing.xs }}>
                Google Review URL
              </ThemedText>
              <RNTextInput
                value={reviewLinkInput}
                onChangeText={setReviewLinkInput}
                onBlur={() => {
                  const trimmed = reviewLinkInput.trim();
                  if (trimmed === (growthSettings?.googleReviewLink || "")) return;
                  if (trimmed.length === 0) {
                    updateGrowthSetting({ googleReviewLink: "" });
                    return;
                  }
                  if (!isValidUrl(trimmed)) return;
                  updateGrowthSetting({ googleReviewLink: trimmed });
                }}
                placeholder="https://g.page/r/your-business/review"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={[styles.reviewInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
                testID="input-google-review-link"
              />
              {reviewLinkInput.trim().length > 0 && !isValidUrl(reviewLinkInput) ? (
                <ThemedText type="caption" style={{ color: theme.error, marginTop: 4 }}>
                  Please enter a valid URL starting with https://
                </ThemedText>
              ) : null}
              {isValidUrl(reviewLinkInput) ? (
                <>
                  <View style={[styles.reviewSubToggle, { borderTopColor: theme.border }]}>
                    <ThemedText type="small" style={{ flex: 1 }}>Include on quote PDFs</ThemedText>
                    <Switch
                      value={growthSettings?.includeReviewOnPdf ?? false}
                      onValueChange={(val) => updateGrowthSetting({ includeReviewOnPdf: val })}
                      trackColor={{ false: theme.border, true: theme.primary }}
                      thumbColor="#FFFFFF"
                      testID="switch-review-on-pdf"
                    />
                  </View>
                  <View style={[styles.reviewSubToggle, { borderTopColor: theme.border }]}>
                    <ThemedText type="small" style={{ flex: 1 }}>Include in messages</ThemedText>
                    <Switch
                      value={growthSettings?.includeReviewInMessages ?? false}
                      onValueChange={(val) => updateGrowthSetting({ includeReviewInMessages: val })}
                      trackColor={{ false: theme.border, true: theme.primary }}
                      thumbColor="#FFFFFF"
                      testID="switch-review-in-messages"
                    />
                  </View>
                </>
              ) : null}
            </View>
          ) : null}
        </View>
      </KeyboardAwareScrollViewCompat>

      <Modal
        visible={showServiceModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowServiceModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Pressable onPress={() => setShowServiceModal(false)}>
              <ThemedText type="link">Cancel</ThemedText>
            </Pressable>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {editingService?.isDefault === false && settings.serviceTypes.find((s) => s.id === editingService?.id)
                ? "Edit Service"
                : "New Service"}
            </ThemedText>
            <Pressable onPress={handleSaveService}>
              <ThemedText type="link">Save</ThemedText>
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          >
            <Input
              label="Service Name"
              value={editingService?.name || ""}
              onChangeText={(v) =>
                setEditingService((prev) => (prev ? { ...prev, name: v } : null))
              }
              placeholder="e.g., Deep Clean"
            />

            <Input
              label="Description"
              value={editingService?.scope || ""}
              onChangeText={(v) =>
                setEditingService((prev) => (prev ? { ...prev, scope: v } : null))
              }
              placeholder="e.g., Thorough first-time or catch-up cleaning"
            />

            <Input
              label="Price Multiplier (%)"
              value={editingService ? (editingService.multiplier * 100).toString() : "100"}
              onChangeText={(v) =>
                setEditingService((prev) =>
                  prev ? { ...prev, multiplier: (parseFloat(v) || 100) / 100 } : null
                )
              }
              keyboardType="decimal-pad"
              placeholder="100"
            />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: -Spacing.md, marginBottom: Spacing.lg }}>
              100% = base rate. Higher = more expensive, lower = cheaper.
            </ThemedText>

            {editingService && settings.serviceTypes.find((s) => s.id === editingService.id) ? (
              <Pressable
                onPress={handleDeleteService}
                style={[styles.deleteButton, { backgroundColor: theme.error + "15" }]}
              >
                <Feather name="trash-2" size={18} color={theme.error} />
                <ThemedText type="body" style={{ color: theme.error, marginLeft: Spacing.sm }}>
                  Delete Service
                </ThemedText>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  addOnsGrid: {},
  addOnRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  gridInput: {
    flex: 1,
  },
  addButton: {
    padding: Spacing.xs,
  },
  serviceList: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceMultiplier: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  mappingContainer: {
    marginBottom: Spacing.lg,
  },
  mappingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  mappingSelect: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xl,
  },
  reviewCard: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  reviewToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  reviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewInputArea: {
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  reviewInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
  },
  reviewSubToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Spacing.md,
    marginTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
