import React, { useState } from "react";
import { View, StyleSheet, Pressable, Modal, ScrollView, ActivityIndicator, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import OnboardingProgressBar from "@/components/OnboardingProgressBar";

const GOAL_CTA: Record<string, { heading: string; sub: string }> = {
  send_quote: { heading: "Send It", sub: "Your quote is ready. Who's it for?" },
  convert_recurring: { heading: "Lock In a Recurring Client", sub: "Send this quote and start building steady income" },
  raise_prices: { heading: "Send Your New Price", sub: "Confident pricing starts with a professional quote" },
  more_repeat: { heading: "Win a Repeat Customer", sub: "A great first impression brings them back" },
};

interface TierOption {
  name: string;
  price: number;
  serviceType?: string;
  scope?: string;
}

interface Props {
  selectedTierPrice: number;
  selectedTierName: string;
  businessName: string;
  goal?: string;
  tiers?: { good: TierOption; better: TierOption; best: TierOption };
  selectedTier?: string;
  onSend: (contact: { name: string; email: string; phone: string }) => void;
  onSkip: () => void;
  onBack: () => void;
  isSending?: boolean;
  sendError?: string | null;
}

export default function SendQuoteScreen({
  selectedTierPrice,
  selectedTierName,
  businessName,
  goal,
  tiers,
  selectedTier,
  onSend,
  onSkip,
  onBack,
  isSending,
  sendError,
}: Props) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const canSend = name.trim().length > 0 && email.trim().length > 0;

  const handlePreviewAndSend = () => {
    if (!canSend) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowPreview(true);
  };

  const handleConfirmSend = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowPreview(false);
    onSend({ name: name.trim(), email: email.trim(), phone: phone.trim() });
  };

  const tiersList = tiers ? [
    { key: "good", ...tiers.good },
    { key: "better", ...tiers.better },
    { key: "best", ...tiers.best },
  ] : [];

  return (
    <>
      <KeyboardAwareScrollViewCompat
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing["3xl"] }, useMaxWidth ? { alignItems: "center" } : undefined]}
      >
        <View style={useMaxWidth ? { maxWidth: 560, width: "100%" } : { width: "100%" }}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>

        <OnboardingProgressBar currentStep={5} />
        <ThemedText type="h2" style={{ marginBottom: Spacing.xs }}>{(GOAL_CTA[goal || "send_quote"] || GOAL_CTA.send_quote).heading}</ThemedText>
        <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing.xl }}>
          {(GOAL_CTA[goal || "send_quote"] || GOAL_CTA.send_quote).sub}
        </ThemedText>

        <View style={[styles.quoteSummary, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", borderColor: theme.border }]}>
          <View style={styles.summaryRow}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>Service</ThemedText>
            <ThemedText type="subtitle">{selectedTierName}</ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.summaryRow}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>Price</ThemedText>
            <ThemedText type="h3" style={{ color: theme.primary }}>${selectedTierPrice}</ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.summaryRow}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>From</ThemedText>
            <ThemedText type="subtitle">{businessName}</ThemedText>
          </View>
        </View>

        <ThemedText type="subtitle" style={{ marginTop: Spacing.xl, marginBottom: Spacing.sm }}>Customer Info</ThemedText>

        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Jane Smith"
          leftIcon="user"
        />

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="jane@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon="mail"
        />

        <Input
          label="Phone (optional)"
          value={phone}
          onChangeText={setPhone}
          placeholder="(555) 123-4567"
          keyboardType="phone-pad"
          leftIcon="phone"
        />

        {sendError ? (
          <View style={[styles.errorBanner, { backgroundColor: isDark ? "rgba(220, 38, 38, 0.12)" : "#FEF2F2", borderColor: isDark ? "rgba(220, 38, 38, 0.25)" : "#FECACA" }]}>
            <Feather name="alert-circle" size={16} color={theme.error} />
            <ThemedText type="small" style={{ color: theme.error, flex: 1, marginLeft: Spacing.sm }}>
              {sendError}
            </ThemedText>
          </View>
        ) : null}

        <Pressable
          testID="button-preview-quote"
          onPress={handlePreviewAndSend}
          style={[styles.sendBtn, { backgroundColor: theme.primary, opacity: canSend && !isSending ? 1 : 0.5 }]}
          disabled={!canSend || isSending}
        >
          {isSending ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Feather name="eye" size={18} color="#FFFFFF" />
              <ThemedText type="subtitle" style={{ color: "#FFFFFF", fontWeight: "700" }}>Preview & Send</ThemedText>
            </>
          )}
        </Pressable>

        <Pressable onPress={onSkip} style={styles.skipBtn}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>Skip and send later</ThemedText>
        </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>

      <Modal visible={showPreview} transparent animationType="slide">
        <View style={[styles.previewOverlay]}>
          <View style={[styles.previewModal, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.previewHeader}>
              <ThemedText type="h3">Email Preview</ThemedText>
              <Pressable onPress={() => setShowPreview(false)} hitSlop={12}>
                <Feather name="x" size={22} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.previewScroll} showsVerticalScrollIndicator={false}>
              <View style={[styles.previewEmailMeta, { borderColor: theme.border }]}>
                <View style={styles.metaRow}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, width: 50 }}>To:</ThemedText>
                  <ThemedText type="body" style={{ flex: 1 }}>{email.trim()}</ThemedText>
                </View>
                <View style={styles.metaRow}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, width: 50 }}>From:</ThemedText>
                  <ThemedText type="body" style={{ flex: 1 }}>{businessName}</ThemedText>
                </View>
                <View style={styles.metaRow}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, width: 50 }}>Subject:</ThemedText>
                  <ThemedText type="body" style={{ flex: 1, fontWeight: "600" }}>Your {businessName} Quote</ThemedText>
                </View>
              </View>

              <View style={[styles.previewBody, { borderColor: theme.border }]}>
                <View style={styles.previewLogoArea}>
                  <View style={[styles.previewLogoBadge, { backgroundColor: theme.primary + "15" }]}>
                    <Feather name="file-text" size={24} color={theme.primary} />
                  </View>
                  <ThemedText type="h3" style={{ marginTop: Spacing.sm }}>Your Quote Options</ThemedText>
                  <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.xs, textAlign: "center" }}>
                    Hi {name.trim()}, please select the option that works best for you.
                  </ThemedText>
                </View>

                {tiersList.length > 0 ? (
                  <View style={styles.previewTiers}>
                    {tiersList.map((tier) => {
                      const isSelected = tier.key === (selectedTier || "better");
                      return (
                        <View
                          key={tier.key}
                          style={[
                            styles.previewTierCard,
                            {
                              borderColor: isSelected ? theme.primary : theme.border,
                              borderWidth: isSelected ? 2 : 1,
                              backgroundColor: isSelected ? theme.primary + "08" : "transparent",
                            },
                          ]}
                        >
                          {isSelected ? (
                            <View style={[styles.previewBadge, { backgroundColor: theme.primary }]}>
                              <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 9 }}>RECOMMENDED</ThemedText>
                            </View>
                          ) : null}
                          <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: "600", textTransform: "uppercase" }}>
                            {tier.name}
                          </ThemedText>
                          <ThemedText type="h3" style={{ color: theme.primary, marginVertical: Spacing.xs }}>
                            ${tier.price}
                          </ThemedText>
                          {tier.scope ? (
                            <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "center" }} numberOfLines={2}>
                              {tier.scope}
                            </ThemedText>
                          ) : null}
                          <View style={[styles.previewAcceptBtn, { backgroundColor: theme.primary }]}>
                            <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700" }}>Accept {tier.name}</ThemedText>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={[styles.previewTierCard, { borderColor: theme.primary, borderWidth: 2, alignSelf: "center", width: "80%" }]}>
                    <ThemedText type="subtitle">{selectedTierName}</ThemedText>
                    <ThemedText type="h2" style={{ color: theme.primary, marginVertical: Spacing.xs }}>${selectedTierPrice}</ThemedText>
                    <View style={[styles.previewAcceptBtn, { backgroundColor: theme.primary }]}>
                      <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "700" }}>Accept Quote</ThemedText>
                    </View>
                  </View>
                )}

                <View style={[styles.previewFooter, { borderTopColor: theme.border }]}>
                  <ThemedText type="subtitle" style={{ fontSize: 13 }}>{businessName}</ThemedText>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>
                    Sent via QuotePro
                  </ThemedText>
                </View>
              </View>
            </ScrollView>

            <View style={[styles.previewActions, { borderTopColor: theme.border }]}>
              <Pressable
                onPress={() => setShowPreview(false)}
                style={[styles.previewCancelBtn, { borderColor: theme.border }]}
              >
                <ThemedText type="body" style={{ color: theme.textSecondary, fontWeight: "600" }}>Edit</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleConfirmSend}
                style={[styles.previewSendBtn, { backgroundColor: theme.primary }]}
                testID="button-confirm-send"
              >
                <Feather name="send" size={16} color="#FFFFFF" />
                <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "700", marginLeft: Spacing.sm }}>Send Now</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl },
  backBtn: { marginBottom: Spacing.lg },
  quoteSummary: { padding: Spacing.lg, borderRadius: BorderRadius.sm, borderWidth: 1 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: Spacing.xs },
  divider: { height: 1, marginVertical: Spacing.sm },
  errorBanner: { flexDirection: "row", alignItems: "center", padding: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1, marginTop: Spacing.md },
  sendBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, height: 56, borderRadius: BorderRadius.md, marginTop: Spacing.xl },
  skipBtn: { alignItems: "center", padding: Spacing.md },
  previewOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  previewModal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92%", overflow: "hidden" },
  previewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  previewScroll: { paddingHorizontal: Spacing.xl },
  previewEmailMeta: { borderWidth: 1, borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.lg },
  metaRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  previewBody: { borderWidth: 1, borderRadius: BorderRadius.sm, overflow: "hidden", marginBottom: Spacing.lg },
  previewLogoArea: { alignItems: "center", padding: Spacing.xl },
  previewLogoBadge: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  previewTiers: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  previewTierCard: { alignItems: "center", padding: Spacing.md, borderRadius: BorderRadius.sm, marginBottom: Spacing.sm, position: "relative" },
  previewBadge: { position: "absolute", top: -8, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  previewAcceptBtn: { marginTop: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.sm, alignItems: "center" },
  previewFooter: { borderTopWidth: 1, padding: Spacing.lg, alignItems: "center" },
  previewActions: { flexDirection: "row", padding: Spacing.xl, gap: Spacing.md, borderTopWidth: 1 },
  previewCancelBtn: { flex: 1, height: 48, borderRadius: BorderRadius.md, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  previewSendBtn: { flex: 2, height: 48, borderRadius: BorderRadius.md, flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
