import React, { useState, useMemo, useEffect, useCallback } from "react";
import { View, StyleSheet, Switch, TextInput, RefreshControl, ActivityIndicator, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import * as Haptics from "expo-haptics";

function useDesignTokens() {
  const { theme, isDark } = useTheme();
  return useMemo(() => ({
    surface: theme.cardBackground,
    border: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
    accent: theme.primary,
    accentSoft: isDark ? "rgba(100,160,255,0.12)" : "rgba(0,122,255,0.08)",
    textPrimary: theme.text,
    textSecondary: theme.textSecondary,
  }), [theme, isDark]);
}

interface QuotePreferences {
  showLogo: boolean;
  showCompanyName: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showSignatureLine: boolean;
  showEstimatedTime: boolean;
  showPaymentOptions: boolean;
  showBookingLink: boolean;
  showTerms: boolean;
  termsText: string;
  brandColor: string;
  defaultExpirationDays: number;
}

const BRAND_COLORS = [
  "#2563EB", "#3B82F6", "#0EA5E9", "#06B6D4", "#14B8A6", "#10B981",
  "#22C55E", "#84CC16", "#EAB308", "#F59E0B", "#F97316", "#EF4444",
  "#DC2626", "#E11D48", "#EC4899", "#D946EF", "#A855F7", "#8B5CF6",
  "#6366F1", "#4F46E5", "#1E3A5F", "#1E293B", "#374151", "#6B7280",
];

const defaultPreferences: QuotePreferences = {
  showLogo: true,
  showCompanyName: true,
  showAddress: true,
  showPhone: true,
  showEmail: true,
  showSignatureLine: false,
  showEstimatedTime: false,
  showPaymentOptions: true,
  showBookingLink: false,
  showTerms: false,
  termsText: "",
  brandColor: "#2563EB",
  defaultExpirationDays: 14,
};

const businessInfoToggles: { key: keyof QuotePreferences; label: string; description: string }[] = [
  { key: "showLogo", label: "Show Logo", description: "Display your business logo on the quote" },
  { key: "showCompanyName", label: "Show Company Name", description: "Display your company name at the top" },
  { key: "showAddress", label: "Show Company Address", description: "Include your business address on the quote" },
  { key: "showPhone", label: "Show Phone Number", description: "Display your phone number for customer contact" },
  { key: "showEmail", label: "Show Email", description: "Include your email address on the quote" },
];

const quoteDetailToggles: { key: keyof QuotePreferences; label: string; description: string }[] = [
  { key: "showSignatureLine", label: "Show Signature Line", description: "Add a line for the customer to sign" },
  { key: "showEstimatedTime", label: "Show Estimated Time", description: "Display estimated time to complete the job" },
  { key: "showPaymentOptions", label: "Show Payment Options", description: "List accepted payment methods on the quote" },
  { key: "showBookingLink", label: "Show Booking Link", description: "Include a link for customers to book directly" },
  { key: "showTerms", label: "Show Terms & Conditions", description: "Display your terms and conditions text" },
];

export default function QuotePreferencesScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  const dt = useDesignTokens();

  const { data: serverPrefs, isLoading } = useQuery<QuotePreferences>({
    queryKey: ["/api/quote-preferences"],
  });

  const [prefs, setPrefs] = useState<QuotePreferences>(defaultPreferences);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (serverPrefs) {
      setPrefs({ ...defaultPreferences, ...serverPrefs });
      setHasChanges(false);
    }
  }, [serverPrefs]);

  const updatePref = useCallback((key: keyof QuotePreferences, value: any) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    Haptics.selectionAsync();
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await apiRequest("PUT", "/api/quote-preferences", prefs);
      queryClient.invalidateQueries({ queryKey: ["/api/quote-preferences"] });
      setHasChanges(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  }, [prefs, queryClient]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop: headerHeight + Spacing.xl }]}>
        <ActivityIndicator color={dt.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <KeyboardAwareScrollViewCompat
        style={styles.container}
        contentContainerStyle={{ paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + 80, paddingHorizontal: Spacing.lg }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => queryClient.invalidateQueries({ queryKey: ["/api/quote-preferences"] })} tintColor={dt.accent} />}
      >
        <ThemedText type="h4" style={styles.sectionTitle}>Business Info on Quote</ThemedText>
        <Card style={styles.sectionCard}>
          {businessInfoToggles.map((toggle, index) => (
            <ToggleRow
              key={toggle.key}
              label={toggle.label}
              description={toggle.description}
              value={prefs[toggle.key] as boolean}
              onValueChange={(v) => updatePref(toggle.key, v)}
              dt={dt}
              last={index === businessInfoToggles.length - 1}
              testID={`switch-${toggle.key}`}
            />
          ))}
        </Card>

        <ThemedText type="h4" style={styles.sectionTitle}>Quote Details</ThemedText>
        <Card style={styles.sectionCard}>
          {quoteDetailToggles.map((toggle, index) => (
            <ToggleRow
              key={toggle.key}
              label={toggle.label}
              description={toggle.description}
              value={prefs[toggle.key] as boolean}
              onValueChange={(v) => updatePref(toggle.key, v)}
              dt={dt}
              last={index === quoteDetailToggles.length - 1}
              testID={`switch-${toggle.key}`}
            />
          ))}
        </Card>

        <ThemedText type="h4" style={styles.sectionTitle}>Branding</ThemedText>
        <Card style={styles.sectionCard}>
          <ThemedText type="small" style={{ color: dt.textSecondary, marginBottom: Spacing.sm }}>
            Set a brand color that appears on your customer-facing quotes.
          </ThemedText>
          <View style={styles.colorPalette}>
            {BRAND_COLORS.map((color) => {
              const isSelected = prefs.brandColor.toUpperCase() === color.toUpperCase();
              return (
                <Pressable
                  key={color}
                  testID={`color-${color}`}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updatePref("brandColor", color);
                  }}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color },
                    isSelected ? styles.colorSwatchSelected : undefined,
                  ]}
                >
                  {isSelected ? (
                    <Feather name="check" size={18} color="#FFFFFF" />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.colorRow, { marginTop: Spacing.md }]}>
            <TextInput
              testID="input-brand-color"
              value={prefs.brandColor}
              onChangeText={(t) => updatePref("brandColor", t)}
              placeholder="#2563EB"
              placeholderTextColor={dt.textSecondary}
              autoCapitalize="characters"
              style={[styles.colorInput, { backgroundColor: theme.inputBackground, color: dt.textPrimary, borderColor: dt.border }]}
            />
            <View style={[styles.colorPreview, { backgroundColor: prefs.brandColor || "#2563EB", borderColor: dt.border }]} />
          </View>
        </Card>

        <ThemedText type="h4" style={styles.sectionTitle}>Default Terms</ThemedText>
        <Card>
          <ThemedText type="small" style={{ color: dt.textSecondary, marginBottom: Spacing.sm }}>
            Custom terms and conditions text that appears on your quotes when enabled.
          </ThemedText>
          <TextInput
            testID="input-terms-text"
            value={prefs.termsText}
            onChangeText={(t) => updatePref("termsText", t)}
            placeholder="Enter your terms and conditions..."
            placeholderTextColor={dt.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[styles.termsInput, { backgroundColor: theme.inputBackground, color: dt.textPrimary, borderColor: dt.border }]}
          />
        </Card>

        <ThemedText type="h4" style={styles.sectionTitle}>Quote Expiration</ThemedText>
        <Card style={styles.sectionCard}>
          <ThemedText type="small" style={{ color: dt.textSecondary, marginBottom: Spacing.md }}>
            Set a default expiration period for new quotes. Expired quotes are automatically marked and shown to customers.
          </ThemedText>
          {[7, 14, 30, 0].map((days) => {
            const isSelected = prefs.defaultExpirationDays === days;
            const label = days === 0 ? "No expiration" : `${days} days`;
            return (
              <Pressable
                key={days}
                testID={`expiration-${days}`}
                onPress={() => updatePref("defaultExpirationDays", days)}
                style={[
                  styles.expirationOption,
                  {
                    backgroundColor: isSelected ? dt.accentSoft : "transparent",
                    borderColor: isSelected ? dt.accent : dt.border,
                  },
                ]}
              >
                <ThemedText type="subtitle" style={isSelected ? { color: dt.accent, fontWeight: "600" } : undefined}>
                  {label}
                </ThemedText>
                {isSelected ? <Feather name="check" size={18} color={dt.accent} /> : null}
              </Pressable>
            );
          })}
        </Card>
      </KeyboardAwareScrollViewCompat>

      {hasChanges ? (
        <View style={[styles.saveButtonContainer, { paddingBottom: insets.bottom + Spacing.md }]}>
          <Pressable
            testID="button-save-preferences"
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveButton, { backgroundColor: dt.accent, opacity: saving ? 0.7 : 1 }]}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Feather name="check" size={20} color="#FFFFFF" style={{ marginRight: Spacing.sm }} />
                <ThemedText type="subtitle" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                  Save Changes
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ToggleRow({ label, description, value, onValueChange, dt, last, testID }: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  dt: any;
  last?: boolean;
  testID: string;
}) {
  return (
    <View style={[styles.toggleRow, !last ? { borderBottomWidth: 1, borderBottomColor: dt.border } : undefined]}>
      <View style={{ flex: 1, marginRight: Spacing.md }}>
        <ThemedText type="subtitle">{label}</ThemedText>
        <ThemedText type="caption" style={{ color: dt.textSecondary, marginTop: 2 }}>{description}</ThemedText>
      </View>
      <Switch
        testID={testID}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: dt.border, true: dt.accent + "80" }}
        thumbColor={value ? dt.accent : "#ccc"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: { marginBottom: Spacing.md, marginTop: Spacing.lg },
  sectionCard: { marginBottom: Spacing.sm },
  toggleRow: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md },
  colorPalette: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  colorSwatch: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  colorSwatchSelected: { borderWidth: 3, borderColor: "#FFFFFF" },
  colorRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  colorInput: { flex: 1, borderWidth: 1, borderRadius: BorderRadius.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: 14 },
  colorPreview: { width: 44, height: 44, borderRadius: BorderRadius.xs, borderWidth: 1 },
  termsInput: { borderWidth: 1, borderRadius: BorderRadius.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: 14, minHeight: 100 },
  expirationOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.sm,
  },
  saveButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: "transparent",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
