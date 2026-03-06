import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  Dimensions,
  useWindowDimensions,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getApiUrl, getPublicBaseUrl } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { SectionHeader } from "@/components/SectionHeader";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ProGate } from "@/components/ProGate";
import { useLanguage } from "@/context/LanguageContext";
import { useApp } from "@/context/AppContext";
import { useSubscription } from "@/context/SubscriptionContext";
import * as Clipboard from "expo-clipboard";
import * as SMS from "expo-sms";
import { trackEvent } from "@/lib/analytics";

type RouteParams = {
  JobDetail: { jobId: string };
};

interface Job {
  id: string;
  customerId: string | null;
  quoteId: string | null;
  jobType: string;
  status: string;
  detailedStatus?: string;
  startDatetime: string;
  endDatetime: string | null;
  recurrence: string;
  internalNotes: string;
  address: string;
  total: number | null;
  startedAt: string | null;
  completedAt: string | null;
  satisfactionRating: number | null;
  ratingComment: string | null;
  updateToken?: string | null;
  customer?: { firstName: string; lastName: string; phone?: string; email?: string } | null;
}

interface ChecklistItem {
  id: string;
  jobId: string;
  label: string;
  completed: boolean;
  roomGroup?: string;
  customerVisible?: boolean;
}

interface JobPhoto {
  id: string;
  jobId: string;
  photoUrl: string;
  photoType: string;
  caption: string | null;
  customerVisible?: boolean;
  createdAt: string;
}

interface TimelineEntry {
  id: string;
  job_id: string;
  status: string;
  note: string;
  created_at: string;
}

interface JobNote {
  id: string;
  job_id: string;
  content: string;
  customer_visible: boolean;
  created_at: string;
}

type TabKey = "overview" | "progress" | "checklist" | "photos";

const JOB_TYPES: Record<string, string> = {
  regular: "Standard",
  deep_clean: "Deep Clean",
  move_in_out: "Move In/Out",
  post_construction: "Post Construction",
  airbnb_turnover: "Airbnb Turnover",
};

const DETAILED_STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  en_route: "En Route",
  service_started: "Service Started",
  in_progress: "In Progress",
  final_touches: "Final Touches",
  completed: "Completed",
};

const DETAILED_STATUS_ICONS: Record<string, string> = {
  scheduled: "calendar",
  en_route: "navigation",
  service_started: "play-circle",
  in_progress: "tool",
  final_touches: "star",
  completed: "check-circle",
};

const STATUS_FLOW = ["scheduled", "en_route", "service_started", "in_progress", "final_touches", "completed"];

function getStatusProgress(status: string): number {
  const map: Record<string, number> = { scheduled: 0, en_route: 15, service_started: 30, in_progress: 55, final_touches: 80, completed: 100 };
  return map[status] || 0;
}

function formatJobType(jobType: string): string {
  return JOB_TYPES[jobType] || jobType;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = days[date.getDay()];
  const month = months[date.getMonth()];
  const dayNum = date.getDate();
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours === 0 ? 12 : hours;
  const minuteStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${day}, ${month} ${dayNum} at ${hours}:${minuteStr} ${ampm}`;
}

function getStatusColor(status: string, theme: any): string {
  switch (status) {
    case "scheduled": return theme.primary;
    case "en_route": return "#EA580C";
    case "service_started": return "#16A34A";
    case "in_progress": return theme.warning;
    case "final_touches": return "#9333EA";
    case "completed": return theme.success;
    case "canceled": return theme.error;
    default: return theme.textSecondary;
  }
}

const screenWidth = Dimensions.get("window").width;
const photoSize = (screenWidth - Spacing.lg * 2 - Spacing.sm * 2) / 3;

export default function JobDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const route = useRoute<RouteProp<RouteParams, "JobDetail">>();
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const jobId = route.params.jobId;
  const { businessProfile } = useApp();
  const { isPro } = useSubscription();
  const { t, communicationLanguage } = useLanguage();
  const { width: screenW } = useWindowDimensions();
  const useMaxWidth = screenW > 600;

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [selectedPhoto, setSelectedPhoto] = useState<JobPhoto | null>(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [addPhotoModalVisible, setAddPhotoModalVisible] = useState(false);
  const [photoType, setPhotoType] = useState<"before" | "after">("before");
  const [caption, setCaption] = useState("");
  const [selectedBase64, setSelectedBase64] = useState<string | null>(null);
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [reviewSending, setReviewSending] = useState(false);
  const [sendUpdateModalVisible, setSendUpdateModalVisible] = useState(false);
  const [updateLink, setUpdateLink] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState("");
  const [aiDraftType, setAiDraftType] = useState<"sms" | "email">("sms");
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteVisible, setNewNoteVisible] = useState(false);

  const { data: job, isLoading: jobLoading, isError: jobError } = useQuery<Job>({
    queryKey: ["/api/jobs", jobId],
  });

  const { data: growthSettings } = useQuery<any>({
    queryKey: ["/api/growth-automation-settings"],
  });

  const { data: photos = [] } = useQuery<JobPhoto[]>({
    queryKey: [`/api/jobs/${jobId}/photos`],
  });

  const { data: checklist = [] } = useQuery<ChecklistItem[]>({
    queryKey: [`/api/jobs/${jobId}/checklist`],
  });

  const { data: timeline = [] } = useQuery<TimelineEntry[]>({
    queryKey: [`/api/jobs/${jobId}/timeline`],
  });

  const { data: notes = [] } = useQuery<JobNote[]>({
    queryKey: [`/api/jobs/${jobId}/notes`],
  });

  const toggleChecklistMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await apiRequest("PUT", `/api/checklist/${id}`, { completed });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}/checklist`] });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (data: { photoData: string; photoType: string; caption: string }) => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/photos`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}/photos`] });
      resetAddPhotoForm();
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      await apiRequest("DELETE", `/api/jobs/${jobId}/photos/${photoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}/photos`] });
      setPhotoModalVisible(false);
      setSelectedPhoto(null);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, note }: { status: string; note?: string }) => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/update-status`, { status, note });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}/timeline`] });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      trackEvent("live_update_status_changed", { jobId, status: "updated" });
    },
  });

  const rateMutation = useMutation({
    mutationFn: async (data: { rating: number; comment?: string }) => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/rate`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["/api/ratings/summary"] });
      setRatingSubmitted(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (data: { content: string; customerVisible: boolean }) => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/notes`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}/notes`] });
      setNewNoteText("");
      setNewNoteVisible(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      await apiRequest("DELETE", `/api/jobs/${jobId}/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${jobId}/notes`] });
    },
  });

  const handleStarPress = (star: number) => {
    setSelectedRating(star);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmitRating = () => {
    if (selectedRating < 1) return;
    rateMutation.mutate({ rating: selectedRating, comment: ratingComment.trim() || undefined });
  };

  const resetAddPhotoForm = () => {
    setSelectedBase64(null);
    setSelectedUri(null);
    setCaption("");
    setPhotoType("before");
    setAddPhotoModalVisible(false);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setSelectedBase64(result.assets[0].base64);
      setSelectedUri(result.assets[0].uri);
      setAddPhotoModalVisible(true);
    }
  };

  const handleUploadPhoto = () => {
    if (!selectedBase64) return;
    uploadPhotoMutation.mutate({ photoData: selectedBase64, photoType, caption: caption.trim() });
  };

  const handleDeletePhoto = (photo: JobPhoto) => {
    Alert.alert("Delete Photo", "Are you sure you want to delete this photo?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deletePhotoMutation.mutate(photo.id) },
    ]);
  };

  const handleToggleChecklist = (item: ChecklistItem) => {
    toggleChecklistMutation.mutate({ id: item.id, completed: !item.completed });
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleStatusUpdate = (status: string) => {
    const label = DETAILED_STATUS_LABELS[status] || status;
    Alert.alert(`Update Status`, `Mark this job as "${label}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: () => updateStatusMutation.mutate({ status }) },
    ]);
  };

  const handleSendUpdatePage = useCallback(async () => {
    if (!isPro) {
      navigation.navigate("Paywall", { trigger_source: "live_update" });
      return;
    }
    try {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/generate-update-token`);
      const data = await res.json();
      if (data.token) {
        const link = `${getPublicBaseUrl()}/j/${data.token}`;
        setUpdateLink(link);
        setSendUpdateModalVisible(true);
        trackEvent("live_update_page_generated", { jobId });
      }
    } catch (e) {
      console.warn("Failed to generate update link:", e);
    }
  }, [jobId, isPro]);

  const handleGenerateAiMessage = useCallback(async (type: "sms" | "email") => {
    if (!updateLink || !job) return;
    setAiDraftType(type);
    setAiDraftLoading(true);
    setAiDraft("");
    try {
      const customerName = job.customer ? `${job.customer.firstName || ""}`.trim() : "Customer";
      const res = await apiRequest("POST", "/api/ai/job-update-message", {
        type,
        customerName,
        companyName: businessProfile?.companyName || "Our Company",
        senderName: businessProfile?.senderName || "Team",
        updateLink,
        language: communicationLanguage,
      });
      const data = await res.json();
      if (data.draft) setAiDraft(data.draft);
    } catch (e) {
      console.warn("Failed to generate AI message:", e);
    } finally {
      setAiDraftLoading(false);
    }
  }, [updateLink, job, businessProfile, communicationLanguage]);

  const handleCopyLink = async () => {
    if (!updateLink) return;
    await Clipboard.setStringAsync(updateLink);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    trackEvent("live_update_sent", { jobId, method: "copy" });
  };

  const handleCopyDraft = async () => {
    if (!aiDraft) return;
    await Clipboard.setStringAsync(aiDraft);
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    trackEvent("live_update_sent", { jobId, method: aiDraftType });
  };

  const handleSmsDraft = async () => {
    if (!aiDraft || !job?.customer) return;
    try {
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable && job.customer.phone) {
        await SMS.sendSMSAsync([job.customer.phone], aiDraft);
        trackEvent("live_update_sent", { jobId, method: "sms" });
      } else {
        await Clipboard.setStringAsync(aiDraft);
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      await Clipboard.setStringAsync(aiDraft);
    }
  };

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    addNoteMutation.mutate({ content: newNoteText.trim(), customerVisible: newNoteVisible });
  };

  const REVIEW_REQUEST_LINES: Record<string, string> = {
    en: "After your service, would you mind leaving a quick review?",
    es: "Despu\u00e9s de su servicio, \u00bfle importar\u00eda dejarnos una rese\u00f1a r\u00e1pida?",
    pt: "Ap\u00f3s o servi\u00e7o, voc\u00ea se importaria de deixar uma avalia\u00e7\u00e3o r\u00e1pida?",
    ru: "\u041f\u043e\u0441\u043b\u0435 \u043e\u0431\u0441\u043b\u0443\u0436\u0438\u0432\u0430\u043d\u0438\u044f, \u043d\u0435 \u043c\u043e\u0433\u043b\u0438 \u0431\u044b \u0432\u044b \u043e\u0441\u0442\u0430\u0432\u0438\u0442\u044c \u0431\u044b\u0441\u0442\u0440\u044b\u0439 \u043e\u0442\u0437\u044b\u0432?",
  };

  const handleSendJobReviewRequest = async () => {
    if (!job || !growthSettings?.googleReviewLink?.trim()) return;
    const customerName = job.customer ? `${job.customer.firstName || ""} ${job.customer.lastName || ""}`.trim() : "there";
    const reviewLink = growthSettings.googleReviewLink.trim();
    const line = REVIEW_REQUEST_LINES[communicationLanguage] || REVIEW_REQUEST_LINES.en;
    const msg = `Hi ${customerName}! ${line} ${reviewLink}`;
    setReviewSending(true);
    try {
      const phone = job.customer?.phone;
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable && phone) {
        await SMS.sendSMSAsync([phone], msg);
        trackEvent("review_request_sent", { channel: "sms", language: communicationLanguage });
      } else {
        await Clipboard.setStringAsync(msg);
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        trackEvent("review_request_copy_tapped", {});
      }
    } catch {
      await Clipboard.setStringAsync(msg);
      trackEvent("review_request_copy_tapped", {});
    }
    setReviewSending(false);
  };

  if (jobLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  if (jobError || !job) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.loadingContainer}>
          <ThemedText type="body">Job not found</ThemedText>
        </View>
      </View>
    );
  }

  const detailedStatus = (job as any).detailedStatus || job.status;
  const statusColor = getStatusColor(detailedStatus, theme);
  const customerName = job.customer ? `${job.customer.firstName} ${job.customer.lastName}` : null;
  const isCompleted = job.status === "completed";
  const isCanceled = job.status === "canceled";
  const progress = getStatusProgress(detailedStatus);

  const jobDuration = (() => {
    if (job.startedAt && job.completedAt) {
      const startMs = new Date(job.startedAt).getTime();
      const endMs = new Date(job.completedAt).getTime();
      if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) return null;
      const totalMin = Math.round((endMs - startMs) / 60000);
      const hrs = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      if (hrs > 0) return `${hrs}h ${mins}m`;
      return `${mins}m`;
    }
    return null;
  })();

  const currentStepIndex = STATUS_FLOW.indexOf(detailedStatus);
  const nextStatuses = STATUS_FLOW.filter((_, i) => i > currentStepIndex && i <= currentStepIndex + 2);

  const checklistGroups: Record<string, ChecklistItem[]> = {};
  checklist.forEach((item) => {
    const group = item.roomGroup || "General";
    if (!checklistGroups[group]) checklistGroups[group] = [];
    checklistGroups[group].push(item);
  });

  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "info" },
    { key: "progress", label: "Progress", icon: "activity" },
    { key: "checklist", label: "Checklist", icon: "check-square" },
    { key: "photos", label: "Photos", icon: "camera" },
  ];

  return (
    <ProGate featureName="Job Details">
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: headerHeight + Spacing.xl,
              paddingBottom: insets.bottom + Spacing.xl + 80,
            },
            ...(useMaxWidth ? [{ maxWidth: 560, alignSelf: "center" as const, width: "100%" as const }] : []),
          ]}
          scrollIndicatorInsets={{ bottom: insets.bottom }}
        >
          <Card style={styles.headerCard}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="h3">{formatJobType(job.jobType)}</ThemedText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                <ThemedText type="caption" style={{ color: statusColor, fontWeight: "600" }}>
                  {DETAILED_STATUS_LABELS[detailedStatus] || detailedStatus}
                </ThemedText>
              </View>
            </View>

            {customerName ? (
              <View style={styles.detailRow}>
                <Feather name="user" size={14} color={theme.textSecondary} style={styles.detailIcon} />
                <ThemedText type="small" style={{ color: theme.textSecondary }}>{customerName}</ThemedText>
              </View>
            ) : null}

            {job.address ? (
              <View style={styles.detailRow}>
                <Feather name="map-pin" size={14} color={theme.textSecondary} style={styles.detailIcon} />
                <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>{job.address}</ThemedText>
              </View>
            ) : null}

            <View style={styles.detailRow}>
              <Feather name="calendar" size={14} color={theme.textSecondary} style={styles.detailIcon} />
              <ThemedText type="small" style={{ color: theme.textSecondary }}>{formatDate(job.startDatetime)}</ThemedText>
            </View>

            {job.recurrence !== "none" ? (
              <View style={[styles.recurrenceBadge, { backgroundColor: `${theme.accent}15` }]}>
                <Feather name="repeat" size={12} color={theme.accent} />
                <ThemedText type="caption" style={{ color: theme.accent, marginLeft: 4, textTransform: "capitalize" }}>{job.recurrence}</ThemedText>
              </View>
            ) : null}

            {job.total !== null && job.total !== undefined ? (
              <View style={styles.detailRow}>
                <Feather name="dollar-sign" size={14} color={theme.textSecondary} style={styles.detailIcon} />
                <ThemedText type="small" style={{ color: theme.textSecondary }}>{`$${Number(job.total).toFixed(2)}`}</ThemedText>
              </View>
            ) : null}

            <View style={[styles.progressBarBg, { marginTop: Spacing.md }]}>
              <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: statusColor }]} />
            </View>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>{progress}% complete</ThemedText>
          </Card>

          {!isCanceled && !isCompleted ? (
            <Pressable
              testID="send-update-page-btn"
              onPress={handleSendUpdatePage}
              style={[styles.sendUpdateBtn, { backgroundColor: isPro ? theme.primary : theme.textSecondary }]}
            >
              <Feather name="share-2" size={18} color="#FFFFFF" />
              <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.sm }}>
                Send Update Page
              </ThemedText>
            </Pressable>
          ) : null}

          <View style={styles.tabBar}>
            {TABS.map((tab) => (
              <Pressable
                key={tab.key}
                testID={`tab-${tab.key}`}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tabItem,
                  { borderBottomColor: activeTab === tab.key ? theme.primary : "transparent" },
                ]}
              >
                <Feather
                  name={tab.icon as any}
                  size={16}
                  color={activeTab === tab.key ? theme.primary : theme.textSecondary}
                />
                <ThemedText
                  type="caption"
                  style={{
                    color: activeTab === tab.key ? theme.primary : theme.textSecondary,
                    fontWeight: activeTab === tab.key ? "600" : "400",
                    marginLeft: 4,
                  }}
                >
                  {tab.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {activeTab === "overview" ? (
            <>
              {jobDuration ? (
                <Card style={styles.infoCard}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Feather name="clock" size={16} color={theme.success} />
                    <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.sm }}>Duration:</ThemedText>
                    <ThemedText type="body" style={{ fontWeight: "700", marginLeft: Spacing.xs }}>{jobDuration}</ThemedText>
                  </View>
                </Card>
              ) : null}

              {job.internalNotes ? (
                <>
                  <SectionHeader title="Internal Notes" />
                  <Card style={styles.infoCard}>
                    <ThemedText type="body" style={{ lineHeight: 22 }}>{job.internalNotes}</ThemedText>
                  </Card>
                </>
              ) : null}

              {isCompleted && growthSettings?.askReviewAfterComplete && growthSettings?.googleReviewLink?.trim() ? (
                <Pressable
                  testID="send-review-request-job-btn"
                  onPress={handleSendJobReviewRequest}
                  style={[styles.actionButton, { backgroundColor: theme.warning, marginBottom: Spacing.md }]}
                >
                  {reviewSending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name="star" size={20} color="#FFFFFF" />
                      <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.sm }}>
                        Send Review Request
                      </ThemedText>
                    </>
                  )}
                </Pressable>
              ) : null}

              {isCompleted ? (
                <>
                  <SectionHeader title={t.ratings.rateThisJob} />
                  <Card style={styles.ratingCard}>
                    {job.satisfactionRating ? (
                      <>
                        <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
                          {t.ratings.ratingSubmitted}
                        </ThemedText>
                        <View style={styles.starsRow}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Feather key={star} name="star" size={28} color={star <= job.satisfactionRating! ? "#F59E0B" : theme.textMuted} style={{ marginRight: Spacing.xs }} />
                          ))}
                        </View>
                        {job.ratingComment ? (
                          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>{job.ratingComment}</ThemedText>
                        ) : null}
                      </>
                    ) : ratingSubmitted ? (
                      <View style={styles.ratingSuccessRow}>
                        <Feather name="check-circle" size={20} color={theme.success} />
                        <ThemedText type="body" style={{ color: theme.success, fontWeight: "600", marginLeft: Spacing.sm }}>
                          {t.ratings.ratingSubmitted}
                        </ThemedText>
                      </View>
                    ) : (
                      <>
                        <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
                          {t.ratings.howWasTheJob}
                        </ThemedText>
                        <View style={styles.starsRow}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Pressable key={star} testID={`rating-star-${star}`} onPress={() => handleStarPress(star)}>
                              <Feather name="star" size={36} color={star <= selectedRating ? "#F59E0B" : theme.textMuted} style={{ marginRight: Spacing.sm }} />
                            </Pressable>
                          ))}
                        </View>
                        <TextInput
                          testID="input-rating-comment"
                          value={ratingComment}
                          onChangeText={setRatingComment}
                          placeholder={t.ratings.addComment}
                          placeholderTextColor={theme.textMuted}
                          style={[styles.textInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
                          multiline
                        />
                        <Pressable
                          testID="submit-rating-btn"
                          onPress={handleSubmitRating}
                          disabled={selectedRating < 1 || rateMutation.isPending}
                          style={[styles.submitBtn, { backgroundColor: selectedRating > 0 ? theme.primary : theme.backgroundTertiary, opacity: selectedRating > 0 ? 1 : 0.5 }]}
                        >
                          {rateMutation.isPending ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <ThemedText type="body" style={{ color: selectedRating > 0 ? "#FFFFFF" : theme.textMuted, fontWeight: "600" }}>
                              {t.ratings.submitRating}
                            </ThemedText>
                          )}
                        </Pressable>
                      </>
                    )}
                  </Card>
                </>
              ) : null}
            </>
          ) : null}

          {activeTab === "progress" ? (
            <>
              {!isCompleted && !isCanceled ? (
                <>
                  <SectionHeader title="Quick Status Update" />
                  <View style={styles.statusButtonGrid}>
                    {nextStatuses.map((s) => {
                      const sc = getStatusColor(s, theme);
                      return (
                        <Pressable
                          key={s}
                          testID={`status-btn-${s}`}
                          onPress={() => handleStatusUpdate(s)}
                          disabled={updateStatusMutation.isPending}
                          style={[styles.statusBtn, { backgroundColor: `${sc}15`, borderColor: `${sc}40` }]}
                        >
                          <Feather name={DETAILED_STATUS_ICONS[s] as any} size={18} color={sc} />
                          <ThemedText type="small" style={{ color: sc, fontWeight: "600", marginLeft: Spacing.sm }}>
                            {DETAILED_STATUS_LABELS[s]}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                    {nextStatuses.length === 0 && detailedStatus !== "completed" ? (
                      <Pressable
                        testID="status-btn-completed"
                        onPress={() => handleStatusUpdate("completed")}
                        disabled={updateStatusMutation.isPending}
                        style={[styles.statusBtn, { backgroundColor: `${theme.success}15`, borderColor: `${theme.success}40` }]}
                      >
                        <Feather name="check-circle" size={18} color={theme.success} />
                        <ThemedText type="small" style={{ color: theme.success, fontWeight: "600", marginLeft: Spacing.sm }}>
                          Completed
                        </ThemedText>
                      </Pressable>
                    ) : null}
                  </View>

                  <View style={styles.statusFlowContainer}>
                    {STATUS_FLOW.map((s, i) => {
                      const isDone = i <= currentStepIndex;
                      const isCurrent = i === currentStepIndex;
                      const sc = isDone ? getStatusColor(s, theme) : theme.textMuted;
                      return (
                        <View key={s} style={styles.statusFlowItem}>
                          <View style={[styles.statusFlowDot, { backgroundColor: isDone ? sc : `${theme.textMuted}30`, borderColor: isCurrent ? sc : "transparent" }]}>
                            {isDone ? <Feather name="check" size={10} color="#FFFFFF" /> : null}
                          </View>
                          <ThemedText type="caption" style={{ color: isDone ? theme.text : theme.textMuted, fontSize: 10, marginTop: 2, textAlign: "center" }}>
                            {DETAILED_STATUS_LABELS[s]?.split(" ")[0]}
                          </ThemedText>
                          {i < STATUS_FLOW.length - 1 ? (
                            <View style={[styles.statusFlowLine, { backgroundColor: isDone ? sc : `${theme.textMuted}30` }]} />
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <SectionHeader title="Timeline" subtitle={timeline.length > 0 ? `${timeline.length} update${timeline.length !== 1 ? "s" : ""}` : undefined} />
              {timeline.length > 0 ? (
                <Card style={styles.infoCard}>
                  {[...timeline].reverse().map((entry, i) => {
                    const ec = getStatusColor(entry.status, theme);
                    return (
                      <View key={entry.id} style={[styles.timelineItem, i < timeline.length - 1 ? { borderBottomWidth: 1, borderBottomColor: `${theme.border}50` } : null]}>
                        <View style={[styles.timelineDot, { backgroundColor: `${ec}20` }]}>
                          <Feather name={DETAILED_STATUS_ICONS[entry.status] as any || "circle"} size={14} color={ec} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText type="small" style={{ fontWeight: "600" }}>{DETAILED_STATUS_LABELS[entry.status] || entry.status}</ThemedText>
                          <ThemedText type="caption" style={{ color: theme.textSecondary }}>{formatDate(entry.created_at)}</ThemedText>
                          {entry.note ? <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 2 }}>{entry.note}</ThemedText> : null}
                        </View>
                      </View>
                    );
                  })}
                </Card>
              ) : (
                <Card style={styles.emptyCard}>
                  <Feather name="clock" size={28} color={theme.textMuted} />
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
                    No timeline entries yet. Update the job status to start tracking progress.
                  </ThemedText>
                </Card>
              )}
            </>
          ) : null}

          {activeTab === "checklist" ? (
            <>
              <SectionHeader
                title="Checklist"
                subtitle={checklist.length > 0 ? `${checklist.filter(c => c.completed).length}/${checklist.length} completed` : undefined}
              />
              {Object.keys(checklistGroups).length > 0 ? (
                Object.entries(checklistGroups).map(([groupName, items]) => {
                  const doneCount = items.filter(i => i.completed).length;
                  return (
                    <Card key={groupName} style={[styles.checklistCard, { marginBottom: Spacing.sm }]}>
                      <View style={styles.checklistGroupHeader}>
                        <ThemedText type="small" style={{ fontWeight: "700" }}>{groupName}</ThemedText>
                        <ThemedText type="caption" style={{ color: theme.textSecondary }}>{doneCount}/{items.length}</ThemedText>
                      </View>
                      {items.map((item) => (
                        <Pressable
                          key={item.id}
                          testID={`checklist-item-${item.id}`}
                          onPress={() => handleToggleChecklist(item)}
                          style={styles.checklistRow}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              {
                                borderColor: item.completed ? theme.success : theme.border,
                                backgroundColor: item.completed ? theme.success : "transparent",
                              },
                            ]}
                          >
                            {item.completed ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
                          </View>
                          <ThemedText
                            type="body"
                            style={[styles.checklistLabel, item.completed ? { textDecorationLine: "line-through", opacity: 0.6 } : null]}
                          >
                            {item.label}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </Card>
                  );
                })
              ) : (
                <Card style={styles.emptyCard}>
                  <Feather name="check-square" size={28} color={theme.textMuted} />
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
                    No checklist items yet.
                  </ThemedText>
                </Card>
              )}
            </>
          ) : null}

          {activeTab === "photos" ? (
            <>
              <SectionHeader
                title="Photos"
                subtitle={photos.length > 0 ? `${photos.length} photo${photos.length !== 1 ? "s" : ""}` : undefined}
                rightAction={
                  <Pressable testID="add-photo-btn" onPress={handlePickImage} style={[styles.addPhotoBtn, { backgroundColor: `${theme.primary}15` }]}>
                    <Feather name="camera" size={16} color={theme.primary} />
                    <ThemedText type="small" style={{ color: theme.primary, marginLeft: Spacing.xs }}>Add</ThemedText>
                  </Pressable>
                }
              />
              {photos.length > 0 ? (
                <View style={styles.photoGrid}>
                  {photos.map((photo) => {
                    const photoUri = `${getApiUrl()}${photo.photoUrl}`;
                    return (
                      <Pressable
                        key={photo.id}
                        testID={`photo-${photo.id}`}
                        onPress={() => { setSelectedPhoto(photo); setPhotoModalVisible(true); }}
                        style={styles.photoWrapper}
                      >
                        <Image source={{ uri: photoUri }} style={styles.photoThumb} contentFit="cover" />
                        <View style={[styles.photoTypeBadge, { backgroundColor: photo.photoType === "before" ? `${theme.warning}CC` : `${theme.success}CC` }]}>
                          <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                            {photo.photoType === "before" ? "Before" : "After"}
                          </ThemedText>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Card style={styles.emptyCard}>
                  <Feather name="image" size={28} color={theme.textMuted} />
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
                    No photos yet. Add before and after photos.
                  </ThemedText>
                </Card>
              )}

              <SectionHeader
                title="Notes"
                subtitle={notes.length > 0 ? `${notes.length} note${notes.length !== 1 ? "s" : ""}` : undefined}
              />
              <Card style={styles.infoCard}>
                <TextInput
                  testID="input-new-note"
                  value={newNoteText}
                  onChangeText={setNewNoteText}
                  placeholder="Add a note..."
                  placeholderTextColor={theme.textMuted}
                  style={[styles.textInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text, marginBottom: Spacing.sm }]}
                  multiline
                />
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Feather name={newNoteVisible ? "eye" : "eye-off"} size={14} color={theme.textSecondary} />
                    <ThemedText type="caption" style={{ color: theme.textSecondary, marginLeft: 4 }}>
                      {newNoteVisible ? "Visible to customer" : "Internal only"}
                    </ThemedText>
                    <Switch
                      value={newNoteVisible}
                      onValueChange={setNewNoteVisible}
                      trackColor={{ false: theme.border, true: `${theme.primary}60` }}
                      thumbColor={newNoteVisible ? theme.primary : theme.textMuted}
                      style={{ marginLeft: Spacing.sm, transform: [{ scale: 0.8 }] }}
                    />
                  </View>
                  <Pressable
                    testID="add-note-btn"
                    onPress={handleAddNote}
                    disabled={!newNoteText.trim() || addNoteMutation.isPending}
                    style={[styles.addNoteBtn, { backgroundColor: newNoteText.trim() ? theme.primary : theme.backgroundTertiary }]}
                  >
                    {addNoteMutation.isPending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <ThemedText type="caption" style={{ color: newNoteText.trim() ? "#FFFFFF" : theme.textMuted, fontWeight: "600" }}>Add</ThemedText>
                    )}
                  </Pressable>
                </View>
              </Card>

              {notes.length > 0 ? (
                <View style={{ marginTop: Spacing.sm }}>
                  {notes.map((note) => (
                    <Card key={note.id} style={[styles.noteCard, { marginBottom: Spacing.sm }]}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <View style={{ flex: 1 }}>
                          <ThemedText type="body" style={{ lineHeight: 20 }}>{note.content}</ThemedText>
                          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 }}>
                            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                              {formatDate(note.created_at)}
                            </ThemedText>
                            <View style={[styles.visibilityBadge, { backgroundColor: note.customer_visible ? `${theme.success}15` : `${theme.textMuted}15` }]}>
                              <Feather name={note.customer_visible ? "eye" : "eye-off"} size={10} color={note.customer_visible ? theme.success : theme.textMuted} />
                              <ThemedText type="caption" style={{ color: note.customer_visible ? theme.success : theme.textMuted, marginLeft: 2, fontSize: 10 }}>
                                {note.customer_visible ? "Customer" : "Internal"}
                              </ThemedText>
                            </View>
                          </View>
                        </View>
                        <Pressable testID={`delete-note-${note.id}`} onPress={() => deleteNoteMutation.mutate(note.id)} style={{ padding: 4 }}>
                          <Feather name="trash-2" size={14} color={theme.textMuted} />
                        </Pressable>
                      </View>
                    </Card>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>

        <Modal visible={sendUpdateModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSendUpdateModalVisible(false)}>
          <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
            <View style={styles.modalHeader}>
              <Pressable testID="close-update-modal" onPress={() => { setSendUpdateModalVisible(false); setAiDraft(""); }}>
                <ThemedText type="body" style={{ color: theme.primary }}>Close</ThemedText>
              </Pressable>
              <ThemedText type="h4">Send Update Page</ThemedText>
              <View style={{ width: 50 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <Card style={styles.infoCard}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.md }}>
                  <Feather name="link" size={18} color={theme.primary} />
                  <ThemedText type="small" style={{ fontWeight: "600", marginLeft: Spacing.sm, flex: 1 }}>Customer Update Link</ThemedText>
                </View>
                <View style={[styles.linkBox, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, flex: 1 }} numberOfLines={2}>
                    {updateLink || "Generating..."}
                  </ThemedText>
                </View>
                <Pressable testID="copy-link-btn" onPress={handleCopyLink} style={[styles.copyBtn, { backgroundColor: theme.primary }]}>
                  <Feather name="copy" size={16} color="#FFFFFF" />
                  <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.sm }}>Copy Link</ThemedText>
                </Pressable>
              </Card>

              <SectionHeader title="AI Message Generator" />
              <View style={styles.aiButtonRow}>
                <Pressable
                  testID="ai-sms-btn"
                  onPress={() => handleGenerateAiMessage("sms")}
                  style={[styles.aiBtn, { backgroundColor: `${theme.primary}15` }]}
                >
                  <Feather name="message-square" size={16} color={theme.primary} />
                  <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600", marginLeft: Spacing.sm }}>Write SMS</ThemedText>
                </Pressable>
                <Pressable
                  testID="ai-email-btn"
                  onPress={() => handleGenerateAiMessage("email")}
                  style={[styles.aiBtn, { backgroundColor: `${theme.primary}15` }]}
                >
                  <Feather name="mail" size={16} color={theme.primary} />
                  <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600", marginLeft: Spacing.sm }}>Write Email</ThemedText>
                </Pressable>
              </View>

              {aiDraftLoading ? (
                <Card style={styles.infoCard}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
                    Generating message...
                  </ThemedText>
                </Card>
              ) : null}

              {aiDraft ? (
                <Card style={styles.infoCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm }}>
                    <Feather name={aiDraftType === "sms" ? "message-square" : "mail"} size={14} color={theme.primary} />
                    <ThemedText type="small" style={{ fontWeight: "600", marginLeft: Spacing.sm }}>
                      {aiDraftType === "sms" ? "SMS Draft" : "Email Draft"}
                    </ThemedText>
                  </View>
                  <TextInput
                    testID="input-ai-draft"
                    value={aiDraft}
                    onChangeText={setAiDraft}
                    style={[styles.draftInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
                    multiline
                    scrollEnabled={false}
                  />
                  <View style={[styles.aiButtonRow, { marginTop: Spacing.md }]}>
                    <Pressable testID="copy-draft-btn" onPress={handleCopyDraft} style={[styles.aiBtn, { backgroundColor: theme.primary, flex: 1 }]}>
                      <Feather name="copy" size={14} color="#FFFFFF" />
                      <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: 4 }}>Copy</ThemedText>
                    </Pressable>
                    {aiDraftType === "sms" ? (
                      <Pressable testID="send-sms-btn" onPress={handleSmsDraft} style={[styles.aiBtn, { backgroundColor: theme.success, flex: 1 }]}>
                        <Feather name="send" size={14} color="#FFFFFF" />
                        <ThemedText type="small" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: 4 }}>Send SMS</ThemedText>
                      </Pressable>
                    ) : null}
                  </View>
                </Card>
              ) : null}
            </ScrollView>
          </View>
        </Modal>

        <Modal visible={photoModalVisible} animationType="fade" transparent onRequestClose={() => { setPhotoModalVisible(false); setSelectedPhoto(null); }}>
          <View style={styles.photoModalOverlay}>
            <Pressable testID="photo-modal-close" onPress={() => { setPhotoModalVisible(false); setSelectedPhoto(null); }} style={styles.photoModalCloseBtn}>
              <Feather name="x" size={24} color="#FFFFFF" />
            </Pressable>
            {selectedPhoto ? (
              <View style={styles.photoModalContent}>
                <Image source={{ uri: `${getApiUrl()}${selectedPhoto.photoUrl}` }} style={styles.photoModalImage} contentFit="contain" />
                <View style={styles.photoModalInfo}>
                  <View style={[styles.photoModalTypeBadge, { backgroundColor: selectedPhoto.photoType === "before" ? `${theme.warning}CC` : `${theme.success}CC` }]}>
                    <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                      {selectedPhoto.photoType === "before" ? "Before" : "After"}
                    </ThemedText>
                  </View>
                  {selectedPhoto.caption ? (
                    <ThemedText type="small" style={{ color: "#FFFFFF", marginTop: Spacing.sm }}>{selectedPhoto.caption}</ThemedText>
                  ) : null}
                  <ThemedText type="caption" style={{ color: "rgba(255,255,255,0.6)", marginTop: Spacing.xs }}>
                    {new Date(selectedPhoto.createdAt).toLocaleDateString()}
                  </ThemedText>
                </View>
                <Pressable testID="delete-photo-btn" onPress={() => handleDeletePhoto(selectedPhoto)} style={styles.deletePhotoBtn}>
                  <Feather name="trash-2" size={18} color="#FFFFFF" />
                  <ThemedText type="small" style={{ color: "#FFFFFF", marginLeft: Spacing.xs }}>Delete</ThemedText>
                </Pressable>
              </View>
            ) : null}
          </View>
        </Modal>

        <Modal visible={addPhotoModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={resetAddPhotoForm}>
          <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
            <View style={styles.modalHeader}>
              <Pressable testID="add-photo-cancel" onPress={resetAddPhotoForm}>
                <ThemedText type="body" style={{ color: theme.primary }}>Cancel</ThemedText>
              </Pressable>
              <ThemedText type="h4">Add Photo</ThemedText>
              <View style={{ width: 60 }} />
            </View>
            <ScrollView contentContainerStyle={styles.modalContent}>
              {selectedUri ? (
                <Image source={{ uri: selectedUri }} style={styles.previewImage} contentFit="cover" />
              ) : null}
              <ThemedText type="small" style={{ fontWeight: "500", marginBottom: Spacing.sm }}>Photo Type</ThemedText>
              <View style={styles.photoTypeRow}>
                <Pressable
                  testID="photo-type-before"
                  onPress={() => setPhotoType("before")}
                  style={[styles.photoTypeChip, { backgroundColor: photoType === "before" ? theme.warning : theme.backgroundSecondary, borderColor: photoType === "before" ? theme.warning : theme.border }]}
                >
                  <ThemedText type="small" style={{ color: photoType === "before" ? "#FFFFFF" : theme.text, fontWeight: photoType === "before" ? "600" : "400" }}>Before</ThemedText>
                </Pressable>
                <Pressable
                  testID="photo-type-after"
                  onPress={() => setPhotoType("after")}
                  style={[styles.photoTypeChip, { backgroundColor: photoType === "after" ? theme.success : theme.backgroundSecondary, borderColor: photoType === "after" ? theme.success : theme.border }]}
                >
                  <ThemedText type="small" style={{ color: photoType === "after" ? "#FFFFFF" : theme.text, fontWeight: photoType === "after" ? "600" : "400" }}>After</ThemedText>
                </Pressable>
              </View>
              <ThemedText type="small" style={{ fontWeight: "500", marginBottom: Spacing.sm, marginTop: Spacing.lg }}>Caption (optional)</ThemedText>
              <TextInput
                testID="input-caption"
                value={caption}
                onChangeText={setCaption}
                placeholder="Add a caption..."
                placeholderTextColor={theme.textSecondary}
                style={[styles.textInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
                multiline
              />
              <Button onPress={handleUploadPhoto} disabled={!selectedBase64 || uploadPhotoMutation.isPending} style={{ marginTop: Spacing.xl }}>
                {uploadPhotoMutation.isPending ? "Uploading..." : "Upload Photo"}
              </Button>
            </ScrollView>
          </View>
        </Modal>
      </View>
    </ProGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerCard: { padding: Spacing.lg },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  detailRow: { flexDirection: "row", alignItems: "center", marginTop: Spacing.xs },
  detailIcon: { marginRight: Spacing.xs },
  recurrenceBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full, alignSelf: "flex-start", marginTop: Spacing.sm },
  progressBarBg: { width: "100%", height: 6, backgroundColor: "#E2E8F0", borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 3 },
  sendUpdateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  tabBar: {
    flexDirection: "row",
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
  },
  statusButtonGrid: { gap: Spacing.sm, marginBottom: Spacing.lg },
  statusBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  statusFlowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  statusFlowItem: { alignItems: "center", flex: 1, position: "relative" },
  statusFlowDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  statusFlowLine: {
    position: "absolute",
    top: 9,
    left: "60%",
    right: "-40%",
    height: 2,
    zIndex: -1,
  },
  infoCard: { padding: Spacing.lg },
  checklistCard: { padding: Spacing.md },
  checklistGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  checklistRow: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.sm },
  checkbox: { width: 24, height: 24, borderRadius: BorderRadius.xs, borderWidth: 2, alignItems: "center", justifyContent: "center", marginRight: Spacing.md },
  checklistLabel: { flex: 1 },
  addPhotoBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  photoWrapper: { width: photoSize, height: photoSize, borderRadius: BorderRadius.md, overflow: "hidden" },
  photoThumb: { width: "100%", height: "100%" },
  photoTypeBadge: { position: "absolute", bottom: Spacing.xs, left: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  emptyCard: { padding: Spacing.xl, alignItems: "center" },
  noteCard: { padding: Spacing.md },
  visibilityBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.full },
  addNoteBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  textInput: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: 14, minHeight: 60, textAlignVertical: "top" },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing["2xl"],
  },
  ratingCard: { padding: Spacing.lg },
  starsRow: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm },
  submitBtn: { alignItems: "center", justifyContent: "center", paddingVertical: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.md },
  ratingSuccessRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: Spacing.md },
  timelineItem: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm, paddingVertical: Spacing.sm },
  timelineDot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.lg },
  modalContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: 60 },
  linkBox: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  copyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: Spacing.md, borderRadius: BorderRadius.md },
  aiButtonRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md },
  aiBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.md },
  photoModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  photoModalCloseBtn: { position: "absolute", top: 60, right: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  photoModalContent: { width: "100%", alignItems: "center", paddingHorizontal: Spacing.lg },
  photoModalImage: { width: "100%", height: 400, borderRadius: BorderRadius.lg },
  photoModalInfo: { width: "100%", marginTop: Spacing.lg, alignItems: "flex-start" },
  photoModalTypeBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: BorderRadius.full },
  deletePhotoBtn: { flexDirection: "row", alignItems: "center", marginTop: Spacing.xl, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: "rgba(239,68,68,0.8)" },
  previewImage: { width: "100%", height: 250, borderRadius: BorderRadius.lg, marginBottom: Spacing.xl },
  photoTypeRow: { flexDirection: "row", gap: Spacing.sm },
  photoTypeChip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1 },
  draftInput: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: 15, lineHeight: 22, minHeight: 100, textAlignVertical: "top" },
});
