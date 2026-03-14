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
  ScrollView,
  KeyboardAvoidingView,
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

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useApp } from "@/context/AppContext";
import { apiRequest, getPublicBaseUrl } from "@/lib/query-client";
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

function timeAgo(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return `${d}d ago`;
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

function MissingFieldsBar({ fields }: { fields: string[] }) {
  if (!fields || fields.length === 0) return null;
  return (
    <View style={styles.missingBar}>
      <Feather name="alert-triangle" size={11} color="#F59E0B" />
      <ThemedText style={styles.missingText} numberOfLines={1}>
        Missing: {fields.slice(0, 3).join(" · ")}{fields.length > 3 ? ` +${fields.length - 3}` : ""}
      </ThemedText>
    </View>
  );
}

function IntakeCard({
  item,
  onConvert,
  onDismiss,
  onMarkReview,
  onNotesSaved,
  tab,
}: {
  item: IntakeRequest;
  onConvert: () => void;
  onDismiss: () => void;
  onMarkReview: () => void;
  onNotesSaved: (notes: string) => void;
  tab: TabKey;
}) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [notesMode, setNotesMode] = useState(false);
  const [notes, setNotes] = useState(item.reviewNotes || "");
  const notesRef = useRef<TextInput>(null);

  const f = item.extractedFields || {};
  const propertyLine = [
    f.beds != null ? `${f.beds} bed` : null,
    f.baths != null ? `${f.baths} bath` : null,
    f.sqft != null ? `${f.sqft.toLocaleString()} sqft` : null,
  ].filter(Boolean).join(" · ");

  const isDone = tab === "done";
  const contactLine = item.customerPhone || item.customerEmail || "";

  function handleNoteBlur() {
    setNotesMode(false);
    if (notes !== item.reviewNotes) onNotesSaved(notes);
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
        </View>
        <View style={styles.cardRight}>
          <ThemedText style={[styles.timeText, { color: theme.textSecondary }]}>{timeAgo(item.createdAt)}</ThemedText>
          {f.frequency && f.frequency !== "one-time" ? (
            <View style={[styles.freqBadge, { backgroundColor: "#10B98115" }]}>
              <Feather name="repeat" size={10} color="#10B981" />
              <ThemedText style={styles.freqText}>{FREQ_LABELS[f.frequency]}</ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      {f.serviceType ? (
        <View style={[styles.serviceBadge, { backgroundColor: theme.primary + "12" }]}>
          <ThemedText style={[styles.serviceText, { color: theme.primary }]}>
            {SERVICE_LABELS[f.serviceType] || f.serviceType}
          </ThemedText>
        </View>
      ) : null}

      {!isDone ? <MissingFieldsBar fields={item.missingFieldFlags} /> : null}

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
        <View style={styles.actions}>
          <Pressable
            testID={`button-convert-${item.id}`}
            onPress={onConvert}
            style={[styles.convertBtn, { backgroundColor: theme.primary }]}
          >
            <Feather name="file-plus" size={13} color="#fff" />
            <ThemedText style={styles.convertBtnText}>Build Quote</ThemedText>
          </Pressable>
          {tab === "new" ? (
            <Pressable
              testID={`button-review-${item.id}`}
              onPress={onMarkReview}
              style={[styles.reviewBtn, { borderColor: "#F59E0B40", backgroundColor: "#F59E0B0F" }]}
            >
              <Feather name="flag" size={13} color="#D97706" />
            </Pressable>
          ) : null}
          <Pressable
            testID={`button-dismiss-${item.id}`}
            onPress={onDismiss}
            style={[styles.dismissBtn, { borderColor: theme.border }]}
          >
            <Feather name="x" size={15} color={theme.textSecondary} />
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
  const qc = useQueryClient();

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
    } catch (e: any) {
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
      <Pressable style={styles.modalBackdrop} onPress={handleClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalKAV}
      >
        <View style={[styles.modalSheet, { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.lg }]}>
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
              {intakeUrl}
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
    </Modal>
  );
}

export default function IntakeQueueScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<Nav>();
  const { theme } = useTheme();
  const { businessProfile } = useApp();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("new");
  const [sendLinkVisible, setSendLinkVisible] = useState(false);

  const intakeUrl = businessProfile?.id ? `${getPublicBaseUrl()}/intake/${businessProfile.id}` : "";

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
        propertyBeds: f.beds || 2,
        propertyBaths: f.baths || 1,
        propertySqft: f.sqft || 0,
        serviceTypeId: f.serviceType || undefined,
        frequency: f.frequency || "one-time",
        petType: f.petType || "none",
        addOns: f.addOns || {},
        notes: f.notes || item.reviewNotes || "",
      },
    });
  }, [navigation]);

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
  ), [theme, intakeUrl, requests.length, activeTab, TabBar]);

  const ListEmpty = useCallback(() => {
    const msgs: Record<TabKey, { icon: string; title: string; sub: string }> = {
      new: {
        icon: "inbox",
        title: "No new requests",
        sub: "Share your intake link with leads. New requests appear here as they come in.",
      },
      review: {
        icon: "flag",
        title: "No flagged requests",
        sub: "When AI is unsure about a request, or you flag one manually, it appears here for review.",
      },
      done: {
        icon: "check-circle",
        title: "Nothing here yet",
        sub: "Converted and dismissed requests will appear here.",
      },
    };
    const msg = msgs[activeTab];
    return (
      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.cardBackground }]}>
          <Feather name={msg.icon as any} size={26} color={theme.textSecondary} />
        </View>
        <ThemedText style={styles.emptyTitle}>{msg.title}</ThemedText>
        <ThemedText style={[styles.emptySub, { color: theme.textSecondary }]}>{msg.sub}</ThemedText>
        {activeTab === "new" ? (
          <Pressable
            onPress={() => setSendLinkVisible(true)}
            style={[styles.emptyAction, { backgroundColor: theme.primary }]}
          >
            <Feather name="send" size={14} color="#fff" />
            <ThemedText style={styles.emptyActionText}>Send Intake Link</ThemedText>
          </Pressable>
        ) : null}
      </View>
    );
  }, [theme, activeTab]);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <IntakeCard
            item={item}
            tab={activeTab}
            onConvert={() => handleConvert(item)}
            onDismiss={() => handleDismiss(item.id)}
            onMarkReview={() => handleMarkReview(item.id)}
            onNotesSaved={notes => handleSaveNotes(item.id, notes)}
          />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={isLoading ? null : ListEmpty}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />}
        contentContainerStyle={[
          styles.list,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      />

      <SendLinkModal
        visible={sendLinkVisible}
        intakeUrl={intakeUrl}
        businessName={businessProfile?.companyName || "Us"}
        onClose={() => setSendLinkVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: { paddingHorizontal: Spacing.lg },
  listHeader: { marginBottom: Spacing.sm },

  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  linkIconWrap: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  linkInfo: { flex: 1, minWidth: 0 },
  linkTitle: { fontSize: 13, fontWeight: "600" },
  linkSub: { fontSize: 11, marginTop: 1 },
  sendLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.lg,
  },
  sendLinkBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },

  tabBar: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
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
  tabCountText: { fontSize: 10, color: "#fff", fontWeight: "700" },
  countLabel: { fontSize: 12, marginBottom: Spacing.xs, marginTop: 2 },

  card: { marginBottom: Spacing.md, padding: Spacing.md },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm, marginBottom: Spacing.xs },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarText: { fontSize: 15, fontWeight: "700" },
  cardMeta: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" },
  customerName: { fontSize: 14, fontWeight: "600" },
  contactLine: { fontSize: 11, marginTop: 2 },
  propLine: { fontSize: 11, marginTop: 2 },
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

  freqBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  freqText: { fontSize: 10, fontWeight: "600", color: "#10B981" },

  serviceBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: Spacing.xs,
  },
  serviceText: { fontSize: 11, fontWeight: "600" },

  missingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#FEF3C708",
    marginBottom: Spacing.xs,
  },
  missingText: { fontSize: 11, color: "#D97706", flex: 1 },

  notesBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  notesText: { fontSize: 12, flex: 1, lineHeight: 17 },

  clarifyBox: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  clarifyLabel: { fontSize: 11, fontWeight: "700", marginBottom: 3 },
  clarifyQ: { fontSize: 11, lineHeight: 16, marginTop: 1 },

  expandRow: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 3, marginBottom: Spacing.xs },
  expandText: { fontSize: 11 },
  rawBox: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  rawText: { fontSize: 12, lineHeight: 17, fontStyle: "italic" },

  notesInput: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
    minHeight: 38,
  },
  notesInputText: { fontSize: 12, flex: 1, lineHeight: 17 },

  actions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
  convertBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6,
    paddingVertical: 9, borderRadius: BorderRadius.lg,
  },
  convertBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  reviewBtn: {
    width: 38, height: 38, borderRadius: BorderRadius.lg,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  dismissBtn: {
    width: 38, height: 38, borderRadius: BorderRadius.lg,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  doneTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
  },
  doneText: { fontSize: 12, fontWeight: "500" },

  empty: { alignItems: "center", paddingVertical: 52, paddingHorizontal: 28 },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: "center", justifyContent: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8, textAlign: "center" },
  emptySub: { fontSize: 13, lineHeight: 19, textAlign: "center", marginBottom: 20 },
  emptyAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
  },
  emptyActionText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalKAV: { justifyContent: "flex-end" },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: Spacing.md },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalClose: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  modalSubtitle: { fontSize: 13, marginBottom: Spacing.md },

  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  linkText: { flex: 1, fontSize: 12, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: BorderRadius.md,
    flexShrink: 0,
  },
  copyBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },

  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  shareText: { fontSize: 14, fontWeight: "600" },

  dividerRow: {
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: "center",
  },
  dividerText: { fontSize: 12 },

  sentBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  sentText: { fontSize: 14, fontWeight: "600" },

  emailSection: {},
  emailInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    fontSize: 14,
  },
  sendError: { fontSize: 12, marginTop: 6 },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  sendBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
