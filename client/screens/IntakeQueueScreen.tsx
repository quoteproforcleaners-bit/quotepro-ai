import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Share,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SERVICE_LABELS: Record<string, string> = {
  standard_cleaning: "Standard Clean",
  deep_clean: "Deep Clean",
  move_in_out: "Move-In/Out",
  recurring: "Recurring",
  airbnb: "Airbnb",
  post_construction: "Post-Construction",
};

const FREQ_LABELS: Record<string, string> = {
  "one-time": "One-Time",
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  monthly: "Monthly",
};

function timeAgo(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

interface IntakeRequest {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  rawText?: string;
  extractedFields: {
    serviceType?: string | null;
    beds?: number | null;
    baths?: number | null;
    sqft?: number | null;
    frequency?: string | null;
    pets?: boolean | null;
    petType?: string | null;
    addOns?: Record<string, boolean>;
    notes?: string | null;
  };
  status: string;
  source: string;
  createdAt: string;
}

function IntakeCard({ item, onConvert, onDismiss }: { item: IntakeRequest; onConvert: () => void; onDismiss: () => void }) {
  const { theme } = useTheme();
  const f = item.extractedFields || {};
  const propertyLine = [
    f.beds ? `${f.beds} bed` : null,
    f.baths ? `${f.baths} bath` : null,
    f.sqft ? `${f.sqft.toLocaleString()} sq ft` : null,
  ].filter(Boolean).join(" · ");

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary + "20" }]}>
          <ThemedText style={[styles.avatarText, { color: theme.colors.primary }]}>
            {item.customerName.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.cardNameRow}>
            <ThemedText style={styles.customerName} numberOfLines={1}>{item.customerName}</ThemedText>
            {f.serviceType ? (
              <View style={[styles.badge, { backgroundColor: theme.colors.primary + "15" }]}>
                <ThemedText style={[styles.badgeText, { color: theme.colors.primary }]}>
                  {SERVICE_LABELS[f.serviceType] || f.serviceType}
                </ThemedText>
              </View>
            ) : null}
          </View>
          {item.customerPhone ? (
            <ThemedText style={styles.contactText}>{item.customerPhone}</ThemedText>
          ) : item.customerEmail ? (
            <ThemedText style={styles.contactText}>{item.customerEmail}</ThemedText>
          ) : null}
          {propertyLine ? (
            <ThemedText style={styles.propertyLine}>{propertyLine}</ThemedText>
          ) : null}
        </View>
        <ThemedText style={styles.timeText}>{timeAgo(item.createdAt)}</ThemedText>
      </View>

      {f.frequency && f.frequency !== "one-time" ? (
        <View style={[styles.freqBadge, { backgroundColor: "#10B98115" }]}>
          <Feather name="repeat" size={11} color="#10B981" />
          <ThemedText style={styles.freqText}>{FREQ_LABELS[f.frequency]}</ThemedText>
        </View>
      ) : null}

      {f.notes ? (
        <View style={[styles.notes, { backgroundColor: theme.colors.card }]}>
          <ThemedText style={styles.notesText} numberOfLines={2}>"{f.notes}"</ThemedText>
        </View>
      ) : null}

      <View style={styles.cardActions}>
        <Pressable
          testID={`button-convert-${item.id}`}
          onPress={onConvert}
          style={[styles.convertBtn, { backgroundColor: theme.colors.primary }]}
        >
          <Feather name="check-circle" size={14} color="#fff" />
          <ThemedText style={styles.convertBtnText}>Convert to Quote</ThemedText>
        </Pressable>
        <Pressable
          testID={`button-dismiss-${item.id}`}
          onPress={onDismiss}
          style={[styles.dismissBtn, { borderColor: theme.colors.border }]}
        >
          <Feather name="x" size={16} color={theme.colors.textSecondary} />
        </Pressable>
      </View>
    </Card>
  );
}

export default function IntakeQueueScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<Nav>();
  const { theme } = useTheme();
  const { business } = useApp();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: requests = [], isLoading, refetch } = useQuery<IntakeRequest[]>({
    queryKey: ["/api/intake-requests"],
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/intake-requests/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/intake-requests"] }),
  });

  const intakeUrl = business ? `${require("@/lib/query-client").getApiUrl().replace("/api", "")}/intake/${business.id}` : "";

  const handleCopyLink = useCallback(async () => {
    if (!intakeUrl) return;
    await Clipboard.setStringAsync(intakeUrl);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [intakeUrl]);

  const handleShare = useCallback(async () => {
    if (!intakeUrl) return;
    await Share.share({ message: `Request a quote from ${business?.companyName}: ${intakeUrl}` });
  }, [intakeUrl, business]);

  const handleConvert = useCallback((item: IntakeRequest) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const f = item.extractedFields || {};
    navigation.navigate("QuoteCalculator", {
      prefillCustomer: {
        name: item.customerName,
        phone: item.customerPhone,
        email: item.customerEmail,
        address: "",
        customerId: "",
      },
      editQuoteData: {
        fromIntake: true,
        intakeId: item.id,
        propertyBeds: f.beds || 2,
        propertyBaths: f.baths || 1,
        propertySqft: f.sqft || 0,
        serviceTypeId: f.serviceType || undefined,
        frequency: f.frequency || "one-time",
        petType: f.petType || "none",
        addOns: f.addOns || {},
        notes: f.notes || "",
      },
    });
  }, [navigation]);

  const handleDismiss = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dismiss.mutate(id);
  }, [dismiss]);

  const ListHeader = useCallback(() => (
    <View style={styles.header}>
      <View style={[styles.linkCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={[styles.linkIcon, { backgroundColor: theme.colors.primary + "15" }]}>
          <Feather name="link" size={16} color={theme.colors.primary} />
        </View>
        <View style={styles.linkInfo}>
          <ThemedText style={styles.linkTitle}>Your Intake Link</ThemedText>
          <ThemedText style={styles.linkSubtitle} numberOfLines={1}>{intakeUrl || "Loading..."}</ThemedText>
        </View>
        <View style={styles.linkButtons}>
          <Pressable onPress={handleCopyLink} style={[styles.linkBtn, { backgroundColor: theme.colors.primary }]}>
            <Feather name={copied ? "check" : "copy"} size={13} color="#fff" />
          </Pressable>
          <Pressable onPress={handleShare} style={[styles.linkBtn, { backgroundColor: theme.colors.border, marginLeft: 6 }]}>
            <Feather name="share" size={13} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      {requests.length > 0 ? (
        <ThemedText style={styles.sectionLabel}>
          {requests.length} pending request{requests.length !== 1 ? "s" : ""}
        </ThemedText>
      ) : null}
    </View>
  ), [theme, intakeUrl, copied, requests.length, handleCopyLink, handleShare]);

  const ListEmpty = useCallback(() => (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.colors.card }]}>
        <Feather name="inbox" size={28} color={theme.colors.textSecondary} />
      </View>
      <ThemedText style={styles.emptyTitle}>No pending requests</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        Share your intake link with leads. When they fill it out, their request will appear here for you to convert into a quote.
      </ThemedText>
    </View>
  ), [theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <IntakeCard
            item={item}
            onConvert={() => handleConvert(item)}
            onDismiss={() => handleDismiss(item.id)}
          />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={isLoading ? null : ListEmpty}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.colors.primary} />}
        contentContainerStyle={[
          styles.list,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: Spacing.lg },
  header: { marginBottom: Spacing.sm },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  linkIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  linkInfo: { flex: 1, minWidth: 0 },
  linkTitle: { fontSize: 13, fontWeight: "600" },
  linkSubtitle: { fontSize: 11, opacity: 0.5, marginTop: 2 },
  linkButtons: { flexDirection: "row", alignItems: "center" },
  linkBtn: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: { fontSize: 13, fontWeight: "600", opacity: 0.5, marginBottom: Spacing.sm },
  card: { marginBottom: Spacing.md, padding: Spacing.md },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 15, fontWeight: "700" },
  cardInfo: { flex: 1, minWidth: 0 },
  cardNameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  customerName: { fontSize: 14, fontWeight: "600" },
  contactText: { fontSize: 12, opacity: 0.55, marginTop: 2 },
  propertyLine: { fontSize: 12, opacity: 0.65, marginTop: 3 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  timeText: { fontSize: 11, opacity: 0.45 },
  freqBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.sm,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  freqText: { fontSize: 11, fontWeight: "600", color: "#10B981" },
  notes: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  notesText: { fontSize: 12, opacity: 0.7, fontStyle: "italic" },
  cardActions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.md },
  convertBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: BorderRadius.lg,
  },
  convertBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
  dismissBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8, textAlign: "center" },
  emptySubtitle: { fontSize: 13, opacity: 0.55, textAlign: "center", lineHeight: 19 },
});
