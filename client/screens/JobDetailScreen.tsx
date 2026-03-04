import React, { useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { SectionHeader } from "@/components/SectionHeader";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Elevation } from "@/constants/theme";
import { ProGate } from "@/components/ProGate";
import { useLanguage } from "@/context/LanguageContext";
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
  startDatetime: string;
  endDatetime: string | null;
  recurrence: string;
  internalNotes: string;
  address: string;
  total: number | null;
  satisfactionRating: number | null;
  ratingComment: string | null;
  customer?: { firstName: string; lastName: string } | null;
}

interface ChecklistItem {
  id: string;
  jobId: string;
  label: string;
  completed: boolean;
}

interface JobPhoto {
  id: string;
  jobId: string;
  photoUrl: string;
  photoType: string;
  caption: string | null;
  createdAt: string;
}

const JOB_TYPES: Record<string, string> = {
  regular: "Standard",
  deep_clean: "Deep Clean",
  move_in_out: "Move In/Out",
  post_construction: "Post Construction",
  airbnb_turnover: "Airbnb Turnover",
};

function formatJobType(jobType: string): string {
  return JOB_TYPES[jobType] || jobType;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
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
    case "scheduled":
      return theme.primary;
    case "in_progress":
      return theme.warning;
    case "completed":
      return theme.success;
    case "canceled":
      return theme.error;
    default:
      return theme.textSecondary;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "scheduled":
      return "Scheduled";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "canceled":
      return "Canceled";
    default:
      return status;
  }
}

const screenWidth = Dimensions.get("window").width;
const photoSize = (screenWidth - Spacing.lg * 2 - Spacing.sm * 2) / 3;

export default function JobDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const route = useRoute<RouteProp<RouteParams, "JobDetail">>();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const jobId = route.params.jobId;

  const { t, communicationLanguage } = useLanguage();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;

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

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId] });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
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

  const handleStarPress = (star: number) => {
    setSelectedRating(star);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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
    uploadPhotoMutation.mutate({
      photoData: selectedBase64,
      photoType,
      caption: caption.trim(),
    });
  };

  const handleDeletePhoto = (photo: JobPhoto) => {
    Alert.alert(
      "Delete Photo",
      "Are you sure you want to delete this photo?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deletePhotoMutation.mutate(photo.id),
        },
      ]
    );
  };

  const handleCompleteJob = () => {
    Alert.alert(
      "Complete Job",
      "Mark this job as completed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: () => completeMutation.mutate(),
        },
      ]
    );
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
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        trackEvent("review_request_copy_tapped", {});
      }
    } catch {
      await Clipboard.setStringAsync(msg);
      trackEvent("review_request_copy_tapped", {});
    }
    setReviewSending(false);
  };

  const handleToggleChecklist = (item: ChecklistItem) => {
    toggleChecklistMutation.mutate({ id: item.id, completed: !item.completed });
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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

  const statusColor = getStatusColor(job.status, theme);
  const customerName = job.customer
    ? `${job.customer.firstName} ${job.customer.lastName}`
    : null;
  const isCompleted = job.status === "completed";
  const isCanceled = job.status === "canceled";

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
                {getStatusLabel(job.status)}
              </ThemedText>
            </View>
          </View>

          {customerName ? (
            <View style={styles.detailRow}>
              <Feather name="user" size={14} color={theme.textSecondary} style={styles.detailIcon} />
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {customerName}
              </ThemedText>
            </View>
          ) : null}

          {job.address ? (
            <View style={styles.detailRow}>
              <Feather name="map-pin" size={14} color={theme.textSecondary} style={styles.detailIcon} />
              <ThemedText type="small" style={{ color: theme.textSecondary, flex: 1 }}>
                {job.address}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.detailRow}>
            <Feather name="calendar" size={14} color={theme.textSecondary} style={styles.detailIcon} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {formatDate(job.startDatetime)}
            </ThemedText>
          </View>

          {job.recurrence !== "none" ? (
            <View style={[styles.recurrenceBadge, { backgroundColor: `${theme.accent}15` }]}>
              <Feather name="repeat" size={12} color={theme.accent} />
              <ThemedText type="caption" style={{ color: theme.accent, marginLeft: 4, textTransform: "capitalize" }}>
                {job.recurrence}
              </ThemedText>
            </View>
          ) : null}

          {job.total !== null && job.total !== undefined ? (
            <View style={styles.detailRow}>
              <Feather name="dollar-sign" size={14} color={theme.textSecondary} style={styles.detailIcon} />
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {`$${Number(job.total).toFixed(2)}`}
              </ThemedText>
            </View>
          ) : null}
        </Card>

        {checklist.length > 0 ? (
          <>
            <SectionHeader title="Checklist" subtitle={`${checklist.filter(c => c.completed).length}/${checklist.length} completed`} />
            <Card style={styles.checklistCard}>
              {checklist.map((item) => (
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
                    {item.completed ? (
                      <Feather name="check" size={14} color="#FFFFFF" />
                    ) : null}
                  </View>
                  <ThemedText
                    type="body"
                    style={[
                      styles.checklistLabel,
                      item.completed ? { textDecorationLine: "line-through", opacity: 0.6 } : null,
                    ]}
                  >
                    {item.label}
                  </ThemedText>
                </Pressable>
              ))}
            </Card>
          </>
        ) : null}

        <SectionHeader
          title="Photos"
          subtitle={photos.length > 0 ? `${photos.length} photo${photos.length !== 1 ? "s" : ""}` : undefined}
          rightAction={
            <Pressable
              testID="add-photo-btn"
              onPress={handlePickImage}
              style={[styles.addPhotoBtn, { backgroundColor: `${theme.primary}15` }]}
            >
              <Feather name="camera" size={16} color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.primary, marginLeft: Spacing.xs }}>
                Add Photo
              </ThemedText>
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
                  onPress={() => {
                    setSelectedPhoto(photo);
                    setPhotoModalVisible(true);
                  }}
                  style={styles.photoWrapper}
                >
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.photoThumb}
                    contentFit="cover"
                  />
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
          <Card style={styles.emptyPhotos}>
            <View style={styles.emptyPhotosContent}>
              <Feather name="image" size={32} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: "center" }}>
                No photos yet. Add before and after photos to document your work.
              </ThemedText>
            </View>
          </Card>
        )}

        {job.internalNotes ? (
          <>
            <SectionHeader title="Internal Notes" />
            <Card style={styles.notesCard}>
              <ThemedText type="body" style={{ lineHeight: 22 }}>
                {job.internalNotes}
              </ThemedText>
            </Card>
          </>
        ) : null}

        {!isCompleted && !isCanceled ? (
          <Pressable
            testID="complete-job-btn"
            onPress={handleCompleteJob}
            style={[styles.completeButton, { backgroundColor: theme.success }]}
          >
            {completeMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather name="check-circle" size={20} color="#FFFFFF" />
                <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: Spacing.sm }}>
                  Complete Job
                </ThemedText>
              </>
            )}
          </Pressable>
        ) : null}

        {isCompleted && growthSettings?.askReviewAfterComplete && growthSettings?.googleReviewLink?.trim() ? (
          <Pressable
            testID="send-review-request-job-btn"
            onPress={handleSendJobReviewRequest}
            style={[styles.completeButton, { backgroundColor: theme.warning, marginBottom: Spacing.md }]}
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
                      <Feather
                        key={star}
                        name="star"
                        size={28}
                        color={star <= job.satisfactionRating! ? "#F59E0B" : theme.textMuted}
                        style={{ marginRight: Spacing.xs }}
                      />
                    ))}
                  </View>
                  {job.ratingComment ? (
                    <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
                      {job.ratingComment}
                    </ThemedText>
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
                      <Pressable
                        key={star}
                        testID={`rating-star-${star}`}
                        onPress={() => handleStarPress(star)}
                      >
                        <Feather
                          name="star"
                          size={36}
                          color={star <= selectedRating ? "#F59E0B" : theme.textMuted}
                          style={{ marginRight: Spacing.sm }}
                        />
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    testID="input-rating-comment"
                    value={ratingComment}
                    onChangeText={setRatingComment}
                    placeholder={t.ratings.addComment}
                    placeholderTextColor={theme.textMuted}
                    style={[
                      styles.ratingCommentInput,
                      {
                        backgroundColor: theme.inputBackground,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    multiline
                  />
                  <Pressable
                    testID="submit-rating-btn"
                    onPress={handleSubmitRating}
                    disabled={selectedRating < 1 || rateMutation.isPending}
                    style={[
                      styles.submitRatingBtn,
                      {
                        backgroundColor: selectedRating > 0 ? theme.primary : theme.backgroundTertiary,
                        opacity: selectedRating > 0 ? 1 : 0.5,
                      },
                    ]}
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
      </ScrollView>

      <Modal
        visible={photoModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setPhotoModalVisible(false);
          setSelectedPhoto(null);
        }}
      >
        <View style={styles.photoModalOverlay}>
          <Pressable
            testID="photo-modal-close"
            onPress={() => {
              setPhotoModalVisible(false);
              setSelectedPhoto(null);
            }}
            style={styles.photoModalCloseBtn}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </Pressable>

          {selectedPhoto ? (
            <View style={styles.photoModalContent}>
              <Image
                source={{ uri: `${getApiUrl()}${selectedPhoto.photoUrl}` }}
                style={styles.photoModalImage}
                contentFit="contain"
              />
              <View style={styles.photoModalInfo}>
                <View style={[styles.photoModalTypeBadge, { backgroundColor: selectedPhoto.photoType === "before" ? `${theme.warning}CC` : `${theme.success}CC` }]}>
                  <ThemedText type="caption" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    {selectedPhoto.photoType === "before" ? "Before" : "After"}
                  </ThemedText>
                </View>
                {selectedPhoto.caption ? (
                  <ThemedText type="small" style={{ color: "#FFFFFF", marginTop: Spacing.sm }}>
                    {selectedPhoto.caption}
                  </ThemedText>
                ) : null}
                <ThemedText type="caption" style={{ color: "rgba(255,255,255,0.6)", marginTop: Spacing.xs }}>
                  {new Date(selectedPhoto.createdAt).toLocaleDateString()}
                </ThemedText>
              </View>
              <Pressable
                testID="delete-photo-btn"
                onPress={() => handleDeletePhoto(selectedPhoto)}
                style={styles.deletePhotoBtn}
              >
                <Feather name="trash-2" size={18} color="#FFFFFF" />
                <ThemedText type="small" style={{ color: "#FFFFFF", marginLeft: Spacing.xs }}>
                  Delete
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={addPhotoModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={resetAddPhotoForm}
      >
        <View style={[styles.addPhotoModal, { backgroundColor: theme.backgroundRoot }]}>
          <View style={styles.addPhotoHeader}>
            <Pressable testID="add-photo-cancel" onPress={resetAddPhotoForm}>
              <ThemedText type="body" style={{ color: theme.primary }}>Cancel</ThemedText>
            </Pressable>
            <ThemedText type="h4">Add Photo</ThemedText>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={styles.addPhotoContent}>
            {selectedUri ? (
              <Image
                source={{ uri: selectedUri }}
                style={styles.previewImage}
                contentFit="cover"
              />
            ) : null}

            <ThemedText type="small" style={{ fontWeight: "500", marginBottom: Spacing.sm }}>
              Photo Type
            </ThemedText>
            <View style={styles.photoTypeRow}>
              <Pressable
                testID="photo-type-before"
                onPress={() => setPhotoType("before")}
                style={[
                  styles.photoTypeChip,
                  {
                    backgroundColor: photoType === "before" ? theme.warning : theme.backgroundSecondary,
                    borderColor: photoType === "before" ? theme.warning : theme.border,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: photoType === "before" ? "#FFFFFF" : theme.text,
                    fontWeight: photoType === "before" ? "600" : "400",
                  }}
                >
                  Before
                </ThemedText>
              </Pressable>
              <Pressable
                testID="photo-type-after"
                onPress={() => setPhotoType("after")}
                style={[
                  styles.photoTypeChip,
                  {
                    backgroundColor: photoType === "after" ? theme.success : theme.backgroundSecondary,
                    borderColor: photoType === "after" ? theme.success : theme.border,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: photoType === "after" ? "#FFFFFF" : theme.text,
                    fontWeight: photoType === "after" ? "600" : "400",
                  }}
                >
                  After
                </ThemedText>
              </Pressable>
            </View>

            <ThemedText type="small" style={{ fontWeight: "500", marginBottom: Spacing.sm, marginTop: Spacing.lg }}>
              Caption (optional)
            </ThemedText>
            <TextInput
              testID="input-caption"
              value={caption}
              onChangeText={setCaption}
              placeholder="Add a caption..."
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.captionInput,
                {
                  backgroundColor: theme.inputBackground,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              multiline
            />

            <Button
              onPress={handleUploadPhoto}
              disabled={!selectedBase64 || uploadPhotoMutation.isPending}
              style={styles.uploadButton}
            >
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
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCard: {
    padding: Spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  detailIcon: {
    marginRight: Spacing.xs,
  },
  recurrenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
    marginTop: Spacing.sm,
  },
  checklistCard: {
    padding: Spacing.md,
  },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.xs,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  checklistLabel: {
    flex: 1,
  },
  addPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  photoWrapper: {
    width: photoSize,
    height: photoSize,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  photoThumb: {
    width: "100%",
    height: "100%",
  },
  photoTypeBadge: {
    position: "absolute",
    bottom: Spacing.xs,
    left: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  emptyPhotos: {
    padding: Spacing.xl,
  },
  emptyPhotosContent: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  notesCard: {
    padding: Spacing.lg,
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing["2xl"],
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  photoModalCloseBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoModalContent: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  photoModalImage: {
    width: "100%",
    height: 400,
    borderRadius: BorderRadius.lg,
  },
  photoModalInfo: {
    width: "100%",
    marginTop: Spacing.lg,
    alignItems: "flex-start",
  },
  photoModalTypeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  deletePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(239,68,68,0.8)",
  },
  addPhotoModal: {
    flex: 1,
  },
  addPhotoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  addPhotoContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing["4xl"],
  },
  previewImage: {
    width: "100%",
    height: 250,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  photoTypeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  photoTypeChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  captionInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: "top",
  },
  uploadButton: {
    marginTop: Spacing.xl,
  },
  ratingCard: {
    padding: Spacing.lg,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  ratingCommentInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: "top",
    marginTop: Spacing.md,
  },
  submitRatingBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  ratingSuccessRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
  },
});
