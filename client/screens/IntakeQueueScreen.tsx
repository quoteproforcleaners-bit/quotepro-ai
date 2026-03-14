import React, { useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Share,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/context/SubscriptionContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type TabKey = "new" | "review" | "done";

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

const ADDON_LABELS: Record<string, string> = {
  insideFridge: "Fridge",
  insideOven: "Oven",
  insideCabinets: "Cabinets",
  interiorWindows: "Windows",
  blindsDetail: "Blinds",
  baseboardsDetail: "Baseboards",
  laundryFoldOnly: "Laundry",
  dishes: "Dishes",
  organizationTidy: "Organization",
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
  customerAddress: string;
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
    clarificationQuestions?: string[];
    address?: string | null;
  };
  status: "pending" | "needs_review" | "converted" | "dismissed";
  confidence: "high" | "medium" | "low";
  reviewNotes: string;
  missingFieldFlags: string[];
  followUpSent: boolean;
  source: string;
  createdAt: string;
}

function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const color = level === "high" ? "#10B981" : level === "medium" ? "#F59E0B" : "#EF4444";
  const label = level === "high" ? "High Confidence" : level === "medium" ? "Review Fields" : "Needs Review";
  return (
    <View style={[styles.confBadge, { backgroundColor: color + "18" }]}>
      <View style={[styles.confDot, { backgroundColor: color }]} />
      <ThemedText style={[styles.confText, { color }]}>{label}</ThemedText>
    </View>
  );
}

function IntakeCard({
  item,
  onConvert,
  onAiQuote,
  onDismiss,
  onMarkReview,
  onNotesSaved,
  onUpgrade,
  tab,
  isPro,
}: {
  item: IntakeRequest;
  onConvert: () => void;
  onAiQuote: () => Promise<void>;
  onDismiss: () => void;
  onMarkReview: () => void;
  onNotesSaved: (notes: string) => void;
  onUpgrade: () => void;
  tab: TabKey;
  isPro: boolean;
}) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [notesMode, setNotesMode] = useState(false);
  const [notes, setNotes] = useState(item.reviewNotes || "");
  const [aiLoading, setAiLoading] = useState(false);
  const notesRef = useRef<TextInput>(null);

  const f = item.extractedFields || {};
  const propertyLine = [
    f.beds != null ? `${f.beds} bed` : null,
    f.baths != null ? `${f.baths} bath` : null,
    f.sqft != null ? `${f.sqft.toLocaleString()} sqft` : null,
  ].filter(Boolean).join(" · ");

  const addOnKeys = Object.entries(f.addOns || {}).filter(([, v]) => v).map(([k]) => ADDON_LABELS[k] || k);
  const isDone = tab === "done";
  const contactLine = item.customerPhone || item.customerEmail || "";

  async function handleNoteBlur() {
    setNotesMode(false);
    if (notes !== item.reviewNotes) onNotesSaved(notes);
  }

  async function handleAiQuote() {
    if (!isPro) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onUpgrade();
      return;
    }
    setAiLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await onAiQuote();
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <Card style={[styles.card, isDone ? { opacity: 0.7 } : undefined]}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: theme.primary + "20" }]}>
          <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
            {item.customerName.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.cardMeta}>
          <View style={styles.nameRow}>
            <ThemedText style={styles.customerName} numberOfLines={1}>{item.customerName}</ThemedText>
            {!isDone ? <ConfidenceBadge level={item.confidence || "low"} /> : null}
          </View>
          {contactLine ? (
            <ThemedText style={[styles.contactLine, { color: theme.textSecondary }]} numberOfLines={1}>
              {contactLine}
            </ThemedText>
          ) : null}
          {propertyLine ? (
            <ThemedText style={[styles.propLine, { color: theme.textSecondary }]}>
              {propertyLine}
            </ThemedText>
          ) : null}
          {item.customerAddress ? (
            <ThemedText style={[styles.propLine, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.customerAddress}
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.cardRight}>
          <ThemedText style={[styles.timeText, { color: theme.textMuted ?? theme.textSecondary }]}>{timeAgo(item.createdAt)}</ThemedText>
          {f.frequency && f.frequency !== "one-time" ? (
            <View style={[styles.freqBadge, { backgroundColor: "#10B98115" }]}>
              <Feather name="repeat" size={10} color="#10B981" />
              <ThemedText style={styles.freqText}>{FREQ_LABELS[f.frequency]}</ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.tagsRow}>
        {f.serviceType ? (
          <View style={[styles.tag, { backgroundColor: theme.primary + "12" }]}>
            <ThemedText style={[styles.tagText, { color: theme.primary }]}>
              {SERVICE_LABELS[f.serviceType] || f.serviceType}
            </ThemedText>
          </View>
        ) : null}
        {f.pets ? (
          <View style={[styles.tag, { backgroundColor: "#F59E0B12" }]}>
            <ThemedText style={[styles.tagText, { color: "#D97706" }]}>
              Pet{f.petType ? ` · ${f.petType}` : ""}
            </ThemedText>
          </View>
        ) : null}
        {addOnKeys.length > 0 ? (
          <View style={[styles.tag, { backgroundColor: theme.border }]}>
            <ThemedText style={[styles.tagText, { color: theme.textSecondary }]}>
              +{addOnKeys.slice(0, 2).join(", ")}{addOnKeys.length > 2 ? ` +${addOnKeys.length - 2}` : ""}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {item.missingFieldFlags && item.missingFieldFlags.length > 0 && !isDone ? (
        <View style={[styles.missingBar, { backgroundColor: "#F59E0B0A", borderColor: "#F59E0B20" }]}>
          <Feather name="alert-triangle" size={11} color="#F59E0B" />
          <ThemedText style={[styles.missingText, { color: "#D97706" }]} numberOfLines={1}>
            Missing: {item.missingFieldFlags.slice(0, 3).join(" · ")}{item.missingFieldFlags.length > 3 ? ` +${item.missingFieldFlags.length - 3}` : ""}
          </ThemedText>
        </View>
      ) : null}

      {f.notes ? (
        <View style={[styles.notesBox, { backgroundColor: theme.cardBackground }]}>
          <Feather name="message-square" size={11} color={theme.textSecondary} />
          <ThemedText style={[styles.notesText, { color: theme.textSecondary }]} numberOfLines={2}>
            {f.notes}
          </ThemedText>
        </View>
      ) : null}

      {f.clarificationQuestions && f.clarificationQuestions.length > 0 && !isDone ? (
        <View style={[styles.clarifyBox, { backgroundColor: "#F59E0B0A", borderColor: "#F59E0B25" }]}>
          <ThemedText style={[styles.clarifyLabel, { color: "#D97706" }]}>Ask the customer:</ThemedText>
          {f.clarificationQuestions.map((q, i) => (
            <ThemedText key={i} style={[styles.clarifyQ, { color: theme.textSecondary }]}>{i + 1}. {q}</ThemedText>
          ))}
        </View>
      ) : null}

      {item.rawText ? (
        <Pressable onPress={() => setExpanded(e => !e)} style={styles.expandRow}>
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={12} color={theme.textSecondary} />
          <ThemedText style={[styles.expandText, { color: theme.textSecondary }]}>
            {expanded ? "Hide original message" : "View original message"}
          </ThemedText>
        </Pressable>
      ) : null}

      {expanded && item.rawText ? (
        <View style={[styles.rawBox, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <ThemedText style={[styles.rawText, { color: theme.textSecondary }]}>"{item.rawText}"</ThemedText>
        </View>
      ) : null}

      {!isDone ? (
        <Pressable
          onPress={() => { setNotesMode(true); setTimeout(() => notesRef.current?.focus(), 100); }}
          style={[styles.notesInput, { borderColor: notesMode ? theme.primary : theme.border, backgroundColor: theme.cardBackground }]}
        >
          {notesMode ? (
            <TextInput
              ref={notesRef}
              value={notes}
              onChangeText={setNotes}
              onBlur={handleNoteBlur}
              placeholder="Add a review note..."
              placeholderTextColor={theme.textSecondary}
              style={[styles.notesInputText, { color: theme.text }]}
              multiline
              maxLength={500}
            />
          ) : (
            <ThemedText style={[styles.notesInputText, { color: notes ? theme.text : theme.textSecondary, opacity: notes ? 1 : 0.5 }]} numberOfLines={2}>
              {notes || "Add a review note..."}
            </ThemedText>
          )}
          {!notesMode ? <Feather name="edit-2" size={12} color={theme.textSecondary} style={{ opacity: 0.4 }} /> : null}
        </Pressable>
      ) : item.reviewNotes ? (
        <View style={[styles.notesBox, { backgroundColor: theme.cardBackground }]}>
          <Feather name="file-text" size={11} color={theme.textSecondary} />
          <ThemedText style={[styles.notesText, { color: theme.textSecondary }]}>{item.reviewNotes}</ThemedText>
        </View>
      ) : null}

      {!isDone ? (
        <View style={styles.actionsCol}>
          <View style={styles.actionsRow}>
            <Pressable
              testID={`button-convert-${item.id}`}
              onPress={onConvert}
              style={[styles.buildBtn, { backgroundColor: theme.primary }]}
            >
              <Feather name="file-plus" size={13} color="#fff" />
              <ThemedText style={styles.buildBtnText}>Build Quote</ThemedText>
            </Pressable>
            {tab === "new" ? (
              <Pressable
                testID={`button-review-${item.id}`}
                onPress={onMarkReview}
                style={[styles.iconBtn, { borderColor: "#F59E0B40", backgroundColor: "#F59E0B0F" }]}
              >
                <Feather name="flag" size={13} color="#D97706" />
              </Pressable>
            ) : null}
            <Pressable
              testID={`button-dismiss-${item.id}`}
              onPress={onDismiss}
              style={[styles.iconBtn, { borderColor: theme.border }]}
            >
              <Feather name="x" size={15} color={theme.textSecondary} />
            </Pressable>
          </View>

          <Pressable
            testID={`button-ai-quote-${item.id}`}
            onPress={handleAiQuote}
            disabled={aiLoading}
            style={[styles.aiBtn, !isPro ? styles.aiBtnLocked : undefined, { opacity: aiLoading ? 0.8 : 1 }]}
          >
            {aiLoading ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <ThemedText style={styles.aiBtnText}>Generating quote...</ThemedText>
              </>
            ) : isPro ? (
              <>
                <Feather name="zap" size={13} color="#fff" />
                <ThemedText style={styles.aiBtnText}>Build Quote with AI</ThemedText>
              </>
            ) : (
              <>
                <Feather name="lock" size={13} color="#fff" />
                <ThemedText style={styles.aiBtnText}>Build Quote with AI</ThemedText>
                <View style={styles.proBadge}>
                  <ThemedText style={styles.proBadgeText}>PRO</ThemedText>
                </View>
              </>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={[styles.doneTag, { borderTopColor: theme.border }]}>
          <Feather
            name={item.status === "converted" ? "check-circle" : "x-circle"}
            size={12}
            color={item.status === "converted" ? "#10B981" : theme.textSecondary}
          />
          <ThemedText style={[styles.doneText, { color: item.status === "converted" ? "#10B981" : theme.textSecondary }]}>
            {item.status === "converted" ? "Converted to quote" : "Dismissed"}
          </ThemedText>
        </View>
      )}
    </Card>
  );
}

function SendLinkModal({
  visible,
  intakeUrl,
  businessName,
  onClose,
}: {
  visible: boolean;
  intakeUrl: string;
  businessName: string;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const [toEmail, setToEmail] = useState("");
  const [toName, setToName] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState("");

  async function handleCopy() {
    await Clipboard.setStringAsync(intakeUrl);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleShare() {
    await Share.share({ message: `Request a quote from ${businessName}: ${intakeUrl}` });
  }

  async function handleSendEmail() {
    if (!toEmail.trim()) return;
    setSending(true);
    setSendError("");
    try {
      await apiRequest("POST", "/api/intake-requests/send-link", {
        toEmail: toEmail.trim(),
        toName: toName.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSent(true);
      setToEmail("");
      setToName("");
      setTimeout(() => { setSent(false); onClose(); }, 2000);
    } catch {
      setSendError("Failed to send. Check your email settings.");
    } finally {
      setSending(false);
    }
  }

  function handleClose() {
    setSent(false);
    setSendError("");
    setToEmail("");
    setToName("");
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <KeyboardAvoidingView behavior="padding">
        <View style={[styles.modalSheet, { backgroundColor: theme.cardBackground, paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />

          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Send Intake Link</ThemedText>
            <Pressable onPress={handleClose} style={[styles.modalClose, { backgroundColor: theme.cardBackground }]}>
              <Feather name="x" size={16} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
            Share this link so leads can submit a quote request
          </ThemedText>

          <View style={[styles.linkRow, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <ThemedText style={[styles.linkText, { color: theme.textSecondary }]} numberOfLines={1}>
              {intakeUrl || "Loading..."}
            </ThemedText>
            <Pressable
              onPress={handleCopy}
              style={[styles.copyBtn, { backgroundColor: copied ? "#10B981" : theme.primary }]}
            >
              <Feather name={copied ? "check" : "copy"} size={13} color="#fff" />
              <ThemedText style={styles.copyBtnText}>{copied ? "Copied" : "Copy"}</ThemedText>
            </Pressable>
          </View>

          <Pressable
            onPress={handleShare}
            style={[styles.shareRow, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}
          >
            <Feather name="share-2" size={16} color={theme.primary} />
            <ThemedText style={[styles.shareText, { color: theme.primary }]}>Share Link</ThemedText>
          </Pressable>

          <View style={[styles.dividerRow, { borderTopColor: theme.border }]}>
            <ThemedText style={[styles.dividerText, { color: theme.textSecondary }]}>or send by email</ThemedText>
          </View>

          {sent ? (
            <View style={[styles.sentBanner, { backgroundColor: "#10B98115" }]}>
              <Feather name="check-circle" size={16} color="#10B981" />
              <ThemedText style={[styles.sentText, { color: "#10B981" }]}>Link sent successfully</ThemedText>
            </View>
          ) : (
            <View style={styles.emailSection}>
              <TextInput
                value={toName}
                onChangeText={setToName}
                placeholder="Contact name (optional)"
                placeholderTextColor={theme.textSecondary}
                style={[styles.emailInput, { borderColor: theme.border, backgroundColor: theme.cardBackground, color: theme.text }]}
              />
              <TextInput
                value={toEmail}
                onChangeText={setToEmail}
                placeholder="Email address"
                placeholderTextColor={theme.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.emailInput, { borderColor: theme.border, backgroundColor: theme.cardBackground, color: theme.text, marginTop: Spacing.sm }]}
              />
              {sendError ? (
                <ThemedText style={[styles.sendError, { color: "#EF4444" }]}>{sendError}</ThemedText>
              ) : null}
              <Pressable
                onPress={handleSendEmail}
                disabled={!toEmail.trim() || sending}
                style={[styles.sendBtn, { backgroundColor: theme.primary, opacity: !toEmail.trim() ? 0.45 : 1 }]}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="send" size={14} color="#fff" />
                    <ThemedText style={styles.sendBtnText}>Send Link by Email</ThemedText>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function IntakeQueueScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<Nav>();
  const { theme } = useTheme();
  const { isPro } = useSubscription();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("new");
  const [sendLinkVisible, setSendLinkVisible] = useState(false);

  const { data: linkData } = useQuery<{ url: string; code: string }>({
    queryKey: ["/api/intake-requests/my-link"],
    staleTime: 5 * 60 * 1000,
  });

  const intakeUrl = linkData?.url || "";

  const { data: requests = [], isLoading, refetch } = useQuery<IntakeRequest[]>({
    queryKey: ["/api/intake-requests", activeTab],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/intake-requests?filter=${activeTab}`);
      return res.json();
    },
  });

  const { data: countData } = useQuery<{ count: number; newCount: number; reviewCount: number }>({
    queryKey: ["/api/intake-requests/count"],
    staleTime: 30000,
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/intake-requests/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/intake-requests"] });
      qc.invalidateQueries({ queryKey: ["/api/intake-requests/count"] });
    },
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      apiRequest("PATCH", `/api/intake-requests/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/intake-requests"] });
      qc.invalidateQueries({ queryKey: ["/api/intake-requests/count"] });
    },
  });

  const handleConvert = useCallback((item: IntakeRequest) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const f = item.extractedFields || {};
    navigation.navigate("QuoteCalculator", {
      prefillCustomer: {
        name: item.customerName,
        phone: item.customerPhone,
        email: item.customerEmail,
        address: item.customerAddress || f.address || "",
        customerId: "",
      },
      editQuoteData: {
        fromIntake: true,
        intakeId: item.id,
        propertyBeds: f.beds ?? 2,
        propertyBaths: f.baths ?? 1,
        propertySqft: f.sqft ?? 0,
        serviceTypeId: f.serviceType ?? undefined,
        frequencySelected: f.frequency ?? "one-time",
        petType: f.petType ?? "none",
        hasPets: f.pets ?? false,
        addOns: f.addOns ?? {},
        notes: f.notes ?? item.reviewNotes ?? "",
      },
    });
  }, [navigation]);

  const handleAiQuote = useCallback(async (item: IntakeRequest) => {
    try {
      const res = await apiRequest("POST", `/api/intake-requests/${item.id}/ai-quote`, {});
      const data = await res.json();
      if (!data.quoteId) throw new Error("No quote ID returned");
      qc.invalidateQueries({ queryKey: ["/api/intake-requests"] });
      qc.invalidateQueries({ queryKey: ["/api/intake-requests/count"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate("QuoteDetail", { quoteId: data.quoteId });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [navigation, qc]);

  const handleDismiss = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dismissMutation.mutate(id);
  }, [dismissMutation]);

  const handleMarkReview = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    patchMutation.mutate({ id, data: { status: "needs_review" } });
  }, [patchMutation]);

  const handleSaveNotes = useCallback((id: string, notes: string) => {
    patchMutation.mutate({ id, data: { reviewNotes: notes } });
  }, [patchMutation]);

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: "new", label: "New", count: countData?.newCount },
    { key: "review", label: "Review", count: countData?.reviewCount },
    { key: "done", label: "Done" },
  ];

  const TabBar = useCallback(() => (
    <View style={[styles.tabBar, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      {TABS.map(tab => {
        const active = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tabItem, active ? [styles.tabItemActive, { borderBottomColor: theme.primary }] : undefined]}
          >
            <ThemedText style={[styles.tabLabel, { color: active ? theme.primary : theme.textSecondary, fontWeight: active ? "700" : "500" }]}>
              {tab.label}
            </ThemedText>
            {tab.count != null && tab.count > 0 ? (
              <View style={[styles.tabCount, { backgroundColor: tab.key === "review" ? "#F59E0B" : theme.primary }]}>
                <ThemedText style={styles.tabCountText}>{tab.count > 9 ? "9+" : tab.count}</ThemedText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  ), [activeTab, theme, countData]);

  const ListHeader = useCallback(() => (
    <View style={styles.listHeader}>
      <View style={[styles.linkCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={[styles.linkIconWrap, { backgroundColor: theme.primary + "15" }]}>
          <Feather name="link-2" size={15} color={theme.primary} />
        </View>
        <View style={styles.linkInfo}>
          <ThemedText style={[styles.linkTitle, { color: theme.text }]}>Your Quote Request Link</ThemedText>
          <ThemedText style={[styles.linkSub, { color: theme.textSecondary }]} numberOfLines={1}>
            {intakeUrl || "Loading..."}
          </ThemedText>
        </View>
        <Pressable
          onPress={() => setSendLinkVisible(true)}
          style={[styles.sendLinkBtn, { backgroundColor: theme.primary }]}
          testID="button-send-link"
        >
          <Feather name="send" size={13} color="#fff" />
          <ThemedText style={styles.sendLinkBtnText}>Send</ThemedText>
        </Pressable>
      </View>
      <TabBar />
      {requests.length > 0 ? (
        <ThemedText style={[styles.countLabel, { color: theme.textSecondary }]}>
          {requests.length} {activeTab === "new" ? "new" : activeTab === "review" ? "flagged for review" : "completed"} {requests.length === 1 ? "request" : "requests"}
        </ThemedText>
      ) : null}
    </View>
  ), [theme, intakeUrl, activeTab, requests.length, countData]);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <FlatList
        data={requests}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl, paddingHorizontal: Spacing.lg }}
        ListHeaderComponent={ListHeader}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />}
        renderItem={({ item }) => (
          <IntakeCard
            item={item}
            tab={activeTab}
            isPro={isPro}
            onConvert={() => handleConvert(item)}
            onAiQuote={() => handleAiQuote(item)}
            onUpgrade={() => navigation.navigate("Paywall")}
            onDismiss={() => handleDismiss(item.id)}
            onMarkReview={() => handleMarkReview(item.id)}
            onNotesSaved={(notes) => handleSaveNotes(item.id, notes)}
          />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.cardBackground }]}>
                <Feather name={activeTab === "done" ? "check-circle" : "inbox"} size={28} color={theme.textSecondary} />
              </View>
              <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
                {activeTab === "new" ? "No new requests" : activeTab === "review" ? "Nothing to review" : "No completed requests"}
              </ThemedText>
              <ThemedText style={[styles.emptySub, { color: theme.textSecondary }]}>
                {activeTab === "new" ? "Send your intake link to start getting quote requests." : activeTab === "review" ? "Flag requests from the New tab to review them here." : "Converted and dismissed requests appear here."}
              </ThemedText>
            </View>
          ) : null
        }
      />
      <SendLinkModal
        visible={sendLinkVisible}
        intakeUrl={intakeUrl}
        businessName=""
        onClose={() => setSendLinkVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  listHeader: { gap: Spacing.md, marginBottom: Spacing.md },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  linkIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  linkInfo: { flex: 1, minWidth: 0 },
  linkTitle: { fontSize: 13, fontWeight: "600", marginBottom: 1 },
  linkSub: { fontSize: 11 },
  sendLinkBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  sendLinkBtnText: { fontSize: 12, color: "#fff", fontWeight: "600" },

  tabBar: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {},
  tabLabel: { fontSize: 13 },
  tabCount: {
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabCountText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "700",
    lineHeight: 12,
    includeFontPadding: false,
  } as any,
  countLabel: { fontSize: 12, marginTop: 2 },

  card: { marginBottom: Spacing.md, padding: Spacing.md },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm, marginBottom: Spacing.sm },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarText: { fontSize: 15, fontWeight: "700" },
  cardMeta: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 2 },
  customerName: { fontSize: 14, fontWeight: "600" },
  contactLine: { fontSize: 11, marginBottom: 1 },
  propLine: { fontSize: 11, marginBottom: 1 },
  cardRight: { alignItems: "flex-end", gap: 4, flexShrink: 0 },
  timeText: { fontSize: 11 },

  confBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  confDot: { width: 5, height: 5, borderRadius: 3 },
  confText: { fontSize: 10, fontWeight: "600" },

  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: Spacing.xs },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: { fontSize: 11, fontWeight: "600" },

  freqBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  freqText: { fontSize: 10, fontWeight: "600", color: "#10B981" },

  missingBar: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, marginBottom: Spacing.xs,
  },
  missingText: { fontSize: 10, fontWeight: "500", flex: 1 },

  notesBox: {
    flexDirection: "row", gap: 6, padding: 8,
    borderRadius: 8, marginBottom: Spacing.xs,
  },
  notesText: { fontSize: 11, flex: 1, lineHeight: 15 },

  clarifyBox: {
    padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: Spacing.xs,
  },
  clarifyLabel: { fontSize: 10, fontWeight: "700", marginBottom: 4 },
  clarifyQ: { fontSize: 11, lineHeight: 15 },

  expandRow: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingVertical: 5, marginBottom: 2,
  },
  expandText: { fontSize: 11 },

  rawBox: {
    padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: Spacing.xs,
  },
  rawText: { fontSize: 11, lineHeight: 16, fontStyle: "italic" },

  notesInput: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderRadius: 10, padding: 10,
    minHeight: 38, marginBottom: Spacing.sm,
  },
  notesInputText: { fontSize: 12, flex: 1 },

  actionsCol: { gap: Spacing.sm },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  buildBtn: {
    flex: 1,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 11, borderRadius: BorderRadius.sm,
  },
  buildBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  iconBtn: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  aiBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    paddingVertical: 11, borderRadius: BorderRadius.sm,
    backgroundColor: "#7C3AED",
  },
  aiBtnLocked: { backgroundColor: "#6B7280" },
  aiBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  proBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 2,
  },
  proBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800", lineHeight: 11, includeFontPadding: false } as any,

  doneTag: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingTop: Spacing.sm, borderTopWidth: 1, marginTop: 2,
  },
  doneText: { fontSize: 11, fontWeight: "500" },

  empty: { alignItems: "center", paddingTop: 48, paddingHorizontal: Spacing.xl },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 18,
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", marginBottom: 6, textAlign: "center" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 19 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: Spacing.sm, paddingHorizontal: Spacing.lg,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: Spacing.lg },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalClose: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  modalSubtitle: { fontSize: 13, marginBottom: Spacing.md },

  linkRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, borderWidth: 1, overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  linkText: { flex: 1, fontSize: 12, paddingHorizontal: Spacing.md },
  copyBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  copyBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  shareRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    padding: 13, borderRadius: 12, borderWidth: 1, marginBottom: Spacing.md,
  },
  shareText: { fontSize: 14, fontWeight: "600" },

  dividerRow: { borderTopWidth: 1, paddingTop: Spacing.md, marginBottom: Spacing.md, alignItems: "center" },
  dividerText: { fontSize: 12 },

  sentBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 16, borderRadius: 12,
  },
  sentText: { fontSize: 14, fontWeight: "600" },

  emailSection: {},
  emailInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14,
  },
  sendError: { fontSize: 12, marginTop: 6 },
  sendBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    padding: 14, borderRadius: 12, marginTop: Spacing.sm,
  },
  sendBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
