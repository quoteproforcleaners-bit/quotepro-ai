import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Linking,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface RouteParams {
  job: {
    jobId: string;
    assignmentId: string;
    customerName: string;
    address: string;
    scheduledTime: string;
    internalNotes: string;
    specialRequests: string | null;
    accessCode: string | null;
    parkingNotes: string | null;
    status: string;
    beforePhotoCount: number;
    afterPhotoCount: number;
  };
}

async function staffFetch(method: string, path: string, body?: any) {
  const token = await AsyncStorage.getItem("staff_token");
  const url = new URL(path, getApiUrl());
  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

async function uploadPhoto(jobId: string, uri: string, phase: "before" | "after") {
  const token = await AsyncStorage.getItem("staff_token");
  const url = new URL(`/api/staff/jobs/${jobId}/photos`, getApiUrl());
  const formData = new FormData();

  // React Native FormData with file URI
  formData.append("photo", {
    uri,
    type: "image/jpeg",
    name: `${phase}-${Date.now()}.jpg`,
  } as any);
  formData.append("phase", phase);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return res.json();
}

function formatDateTime(dt: string) {
  return new Date(dt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function openMaps(address: string) {
  const encoded = encodeURIComponent(address);
  const url = Platform.OS === "ios"
    ? `maps://?q=${encoded}`
    : `geo:0,0?q=${encoded}`;
  Linking.openURL(url).catch(() => {
    Linking.openURL(`https://maps.google.com/maps?q=${encoded}`);
  });
}

export default function StaffJobDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const qc = useQueryClient();

  const { job: initial } = route.params as RouteParams;
  const [job, setJob] = useState(initial);

  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  async function pickAndUpload(phase: "before" | "after") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError("Camera permission is required to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const uri = result.assets[0].uri;
    setUploading(true);
    setError("");
    try {
      await uploadPhoto(job.jobId, uri, phase);
      if (phase === "before") setBeforePhotos(p => [...p, uri]);
      else setAfterPhotos(p => [...p, uri]);
      setJob(j => ({
        ...j,
        beforePhotoCount: j.beforePhotoCount + (phase === "before" ? 1 : 0),
        afterPhotoCount: j.afterPhotoCount + (phase === "after" ? 1 : 0),
      }));
    } catch (e: any) {
      setError("Photo upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function markComplete() {
    setCompleting(true);
    setError("");
    try {
      const res = await staffFetch("POST", `/api/staff/jobs/${job.jobId}/complete`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      qc.invalidateQueries({ queryKey: ["staff-today"] });
      setJob(j => ({ ...j, status: "completed" }));
      setShowConfirm(false);
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || "Could not mark complete.");
      setShowConfirm(false);
    } finally {
      setCompleting(false);
    }
  }

  const totalAfter = job.afterPhotoCount + afterPhotos.length;
  const canComplete = totalAfter >= 1 && job.status !== "completed" && job.status !== "complete";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + 120 },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        {/* Customer + Address */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.customerName, { color: theme.text }]}>{job.customerName}</Text>
          <Text style={[styles.dateText, { color: theme.textSecondary }]}>{formatDateTime(job.scheduledTime)}</Text>

          <Pressable
            testID="button-open-maps"
            style={[styles.mapBtn, { backgroundColor: theme.primary + "15", borderColor: theme.primary + "30" }]}
            onPress={() => openMaps(job.address)}
          >
            <Feather name="map-pin" size={15} color={theme.primary} />
            <Text style={[styles.mapBtnText, { color: theme.primary }]} numberOfLines={2}>
              {job.address}
            </Text>
            <Feather name="external-link" size={14} color={theme.primary} />
          </Pressable>
        </View>

        {/* Job details */}
        {(job.accessCode || job.parkingNotes || job.internalNotes || job.specialRequests) ? (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Job Details</Text>
            {job.accessCode ? <InfoRow icon="key" label="Access Code" value={job.accessCode} theme={theme} /> : null}
            {job.parkingNotes ? <InfoRow icon="truck" label="Parking" value={job.parkingNotes} theme={theme} /> : null}
            {job.specialRequests ? <InfoRow icon="star" label="Special Requests" value={job.specialRequests} theme={theme} /> : null}
            {job.internalNotes ? <InfoRow icon="file-text" label="Notes" value={job.internalNotes} theme={theme} /> : null}
          </View>
        ) : null}

        {/* Before photos */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.photoHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Before Photos</Text>
            <Text style={[styles.photoCount, { color: theme.textSecondary }]}>
              {job.beforePhotoCount + beforePhotos.length} taken
            </Text>
          </View>
          <View style={styles.photoGrid}>
            {beforePhotos.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.thumb} />
            ))}
            <Pressable
              testID="button-before-photo"
              style={[styles.addPhotoBtn, { borderColor: theme.cardBorder }]}
              onPress={() => pickAndUpload("before")}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <>
                  <Feather name="camera" size={22} color={theme.primary} />
                  <Text style={[styles.addPhotoText, { color: theme.primary }]}>Take Photo</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* After photos */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.photoHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>After Photos</Text>
            <Text style={[styles.photoCount, { color: theme.textSecondary }]}>
              {totalAfter} taken
            </Text>
          </View>
          {totalAfter === 0 && (
            <Text style={[styles.photoHint, { color: theme.textSecondary }]}>
              At least 1 after photo required before completing
            </Text>
          )}
          <View style={styles.photoGrid}>
            {afterPhotos.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.thumb} />
            ))}
            <Pressable
              testID="button-after-photo"
              style={[styles.addPhotoBtn, { borderColor: theme.cardBorder }]}
              onPress={() => pickAndUpload("after")}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <>
                  <Feather name="camera" size={22} color={theme.primary} />
                  <Text style={[styles.addPhotoText, { color: theme.primary }]}>Take Photo</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md, backgroundColor: theme.background, borderTopColor: theme.cardBorder }]}>
        {job.status === "completed" || job.status === "complete" ? (
          <View style={[styles.doneBtn, { backgroundColor: "#10b98120" }]}>
            <Feather name="check-circle" size={18} color="#10b981" />
            <Text style={[styles.doneBtnText, { color: "#10b981" }]}>Job Complete</Text>
          </View>
        ) : (
          <Pressable
            testID="button-mark-complete"
            style={[styles.completeBtn, { backgroundColor: canComplete ? "#10b981" : theme.cardBorder }]}
            onPress={() => setShowConfirm(true)}
            disabled={!canComplete || completing}
          >
            {completing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="check-circle" size={18} color="#fff" />
                <Text style={styles.completeBtnText}>
                  {canComplete ? "Mark Complete" : "Add after photo to complete"}
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* Confirm modal */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: theme.card }]}>
            <Feather name="check-circle" size={32} color="#10b981" style={{ marginBottom: Spacing.sm }} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Mark Job Complete?</Text>
            <Text style={[styles.modalBody, { color: theme.textSecondary }]}>
              This will mark the job as done for {job.customerName}.
            </Text>
            <View style={styles.modalBtns}>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: theme.background, borderColor: theme.cardBorder }]}
                onPress={() => setShowConfirm(false)}
              >
                <Text style={{ color: theme.text, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="button-confirm-complete"
                style={[styles.modalBtn, { backgroundColor: "#10b981" }]}
                onPress={markComplete}
                disabled={completing}
              >
                {completing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "600" }}>Confirm</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ icon, label, value, theme }: { icon: any; label: string; value: string; theme: any }) {
  return (
    <View style={styles.infoRow}>
      <Feather name={icon} size={14} color={theme.textSecondary} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.md },
  card: {
    borderWidth: 1, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
  },
  customerName: { fontSize: 20, fontWeight: "800", marginBottom: 2 },
  dateText: { fontSize: 13, marginBottom: Spacing.sm },
  mapBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderWidth: 1, borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  mapBtnText: { flex: 1, fontSize: 14, fontWeight: "500" },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: Spacing.sm },
  infoRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  infoLabel: { fontSize: 11, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 14, marginTop: 1 },
  photoHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.sm },
  photoCount: { fontSize: 13 },
  photoHint: { fontSize: 12, marginBottom: Spacing.sm },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumb: { width: 80, height: 80, borderRadius: 8 },
  addPhotoBtn: {
    width: 80, height: 80, borderRadius: 8,
    borderWidth: 2, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", gap: 2,
  },
  addPhotoText: { fontSize: 10, fontWeight: "600" },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fee2e2", padding: Spacing.sm,
    borderRadius: BorderRadius.md, marginTop: Spacing.sm,
  },
  errorText: { color: "#ef4444", fontSize: 13, flex: 1 },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  completeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 52, borderRadius: BorderRadius.lg,
  },
  completeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  doneBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 52, borderRadius: BorderRadius.lg,
  },
  doneBtnText: { fontSize: 16, fontWeight: "700" },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center",
    padding: Spacing.xl,
  },
  modal: {
    width: "100%", borderRadius: BorderRadius.xl,
    padding: Spacing.xl, alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: Spacing.xs },
  modalBody: { fontSize: 14, textAlign: "center", marginBottom: Spacing.lg },
  modalBtns: { flexDirection: "row", gap: Spacing.sm, width: "100%" },
  modalBtn: {
    flex: 1, height: 46, borderRadius: BorderRadius.lg,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
});
