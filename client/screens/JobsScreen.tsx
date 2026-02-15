import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { ProBanner } from "@/components/ProBanner";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { FAB } from "@/components/FAB";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { SegmentedControl } from "@/components/SegmentedControl";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useLanguage } from "@/context/LanguageContext";

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
  customer?: { firstName: string; lastName: string } | null;
}

type StatusFilter = "all" | "scheduled" | "in_progress" | "completed";

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

function getStatusLabel(status: string, t: any): string {
  switch (status) {
    case "scheduled":
      return t.jobs.scheduled;
    case "in_progress":
      return t.jobs.inProgress;
    case "completed":
      return t.jobs.completed;
    case "canceled":
      return t.jobs.canceled;
    default:
      return status;
  }
}

export default function JobsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useLanguage();

  const filterOptions: { label: string; value: StatusFilter }[] = [
    { label: t.common.all, value: "all" },
    { label: t.jobs.scheduled, value: "scheduled" },
    { label: t.jobs.inProgress, value: "in_progress" },
    { label: t.jobs.completed, value: "completed" },
  ];

  const recurrenceOptions = [
    { label: t.jobs.oneTime, value: "none" },
    { label: t.jobs.weekly, value: "weekly" },
    { label: t.jobs.biweekly, value: "biweekly" },
    { label: t.jobs.monthly, value: "monthly" },
  ];

  const jobTypes = [
    { label: t.jobs.standard, value: "regular" },
    { label: t.jobs.deepClean, value: "deep_clean" },
    { label: t.jobs.moveInOut, value: "move_in_out" },
    { label: t.jobs.postConstruction, value: "post_construction" },
    { label: t.jobs.airbnbTurnover, value: "airbnb_turnover" },
  ];

  const formatJobType = (jobType: string): string => {
    const found = jobTypes.find((jt) => jt.value === jobType);
    return found ? found.label : jobType;
  };

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [jobType, setJobType] = useState("regular");
  const [recurrence, setRecurrence] = useState("none");
  const [startDate, setStartDate] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [total, setTotal] = useState("");

  const {
    data: jobs = [],
    isLoading,
    refetch,
  } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      jobType: string;
      recurrence: string;
      startDatetime: string;
      address: string;
      internalNotes: string;
      total: number | null;
    }) => {
      const res = await apiRequest("POST", "/api/jobs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      resetForm();
      setModalVisible(false);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/complete`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      if (data.nextJob) {
        Alert.alert("Job Completed", data.message);
      }
    },
  });

  const resetForm = () => {
    setJobType("regular");
    setRecurrence("none");
    setStartDate("");
    setAddress("");
    setNotes("");
    setTotal("");
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleAddJob = () => {
    setModalVisible(true);
  };

  const handleSaveJob = () => {
    if (!startDate.trim() || !address.trim()) return;
    const parsedDate = new Date(startDate.trim());
    if (isNaN(parsedDate.getTime())) return;
    createMutation.mutate({
      jobType,
      recurrence,
      startDatetime: parsedDate.toISOString(),
      address: address.trim(),
      internalNotes: notes.trim(),
      total: total.trim() ? parseFloat(total.trim()) : null,
    });
  };

  const sortedJobs = [...jobs].sort(
    (a, b) =>
      new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
  );

  const filteredJobs = sortedJobs.filter((job) => {
    if (statusFilter === "all") return true;
    return job.status === statusFilter;
  });

  const renderHeader = () => (
    <View>
      <ProBanner message={t.jobs.automateReminders} />
      <View style={styles.filterContainer}>
        <SegmentedControl
          options={filterOptions}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </View>
    </View>
  );

  const renderEmpty = () =>
    isLoading ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    ) : (
      <EmptyState
        icon="calendar"
        iconColor={theme.primary}
        title={t.jobs.noJobs}
        description={t.jobs.noJobsDesc}
        actionLabel={t.jobs.addJob}
        onAction={handleAddJob}
      />
    );

  const renderJobItem = ({ item }: { item: Job }) => {
    const statusColor = getStatusColor(item.status, theme);
    const customerName =
      item.customer
        ? `${item.customer.firstName} ${item.customer.lastName}`
        : null;

    return (
      <Card style={styles.jobCard}>
        <Pressable testID={`job-row-${item.id}`} style={styles.jobRow} onPress={() => navigation.navigate("JobDetail", { jobId: item.id })}>
          <View style={styles.jobInfo}>
            <View style={styles.nameRow}>
              <ThemedText type="h4" style={styles.jobTitle}>
                {formatJobType(item.jobType)}
              </ThemedText>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${statusColor}20` },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={[styles.statusText, { color: statusColor }]}
                >
                  {getStatusLabel(item.status, t)}
                </ThemedText>
              </View>
            </View>
            {item.recurrence !== "none" ? (
              <View style={[styles.recurrenceBadge, { backgroundColor: `${theme.accent}15` }]}>
                <Feather name="repeat" size={12} color={theme.accent} />
                <ThemedText type="caption" style={{ color: theme.accent, marginLeft: 4 }}>
                  {item.recurrence}
                </ThemedText>
              </View>
            ) : null}
            {customerName ? (
              <View style={styles.detailRow}>
                <Feather
                  name="user"
                  size={14}
                  color={theme.textSecondary}
                  style={styles.detailIcon}
                />
                <ThemedText
                  type="small"
                  style={{ color: theme.textSecondary }}
                >
                  {customerName}
                </ThemedText>
              </View>
            ) : null}
            <View style={styles.detailRow}>
              <Feather
                name="calendar"
                size={14}
                color={theme.textSecondary}
                style={styles.detailIcon}
              />
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {formatDate(item.startDatetime)}
              </ThemedText>
            </View>
            {item.address ? (
              <View style={styles.detailRow}>
                <Feather
                  name="map-pin"
                  size={14}
                  color={theme.textSecondary}
                  style={styles.detailIcon}
                />
                <ThemedText
                  type="small"
                  style={{ color: theme.textSecondary }}
                  numberOfLines={1}
                >
                  {item.address}
                </ThemedText>
              </View>
            ) : null}
            {item.total !== null && item.total !== undefined ? (
              <View style={styles.detailRow}>
                <Feather
                  name="dollar-sign"
                  size={14}
                  color={theme.textSecondary}
                  style={styles.detailIcon}
                />
                <ThemedText
                  type="small"
                  style={{ color: theme.textSecondary }}
                >
                  {`$${Number(item.total).toFixed(2)}`}
                </ThemedText>
              </View>
            ) : null}
          </View>
          {item.status !== "completed" && item.status !== "canceled" ? (
            <Pressable
              testID={`complete-job-${item.id}`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                completeMutation.mutate(item.id);
              }}
              style={[styles.completeBtn, { backgroundColor: `${theme.success}15` }]}
            >
              <Feather name="check-circle" size={22} color={theme.success} />
            </Pressable>
          ) : null}
        </Pressable>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        testID="jobs-list"
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        renderItem={renderJobItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl + 80,
          },
          filteredJobs.length === 0 ? styles.emptyContent : null,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      <FAB onPress={handleAddJob} testID="add-job-fab" />

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: theme.backgroundRoot },
          ]}
        >
          <View style={styles.modalHeader}>
            <Pressable
              testID="modal-close-button"
              onPress={() => {
                resetForm();
                setModalVisible(false);
              }}
            >
              <ThemedText type="body" style={{ color: theme.primary }}>
                {t.common.cancel}
              </ThemedText>
            </Pressable>
            <ThemedText type="h4">{t.jobs.newJob}</ThemedText>
            <View style={{ width: 60 }} />
          </View>
          <KeyboardAwareScrollViewCompat
            contentContainerStyle={styles.modalContent}
          >
            <ThemedText type="small" style={styles.label}>
              {t.jobs.jobType}
            </ThemedText>
            <View style={styles.jobTypeContainer}>
              {jobTypes.map((type) => {
                const isSelected = jobType === type.value;
                return (
                  <Pressable
                    key={type.value}
                    testID={`job-type-${type.value}`}
                    onPress={() => setJobType(type.value)}
                    style={[
                      styles.jobTypeChip,
                      {
                        backgroundColor: isSelected
                          ? theme.primary
                          : theme.backgroundSecondary,
                        borderColor: isSelected
                          ? theme.primary
                          : theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={{
                        color: isSelected ? "#FFFFFF" : theme.text,
                        fontWeight: isSelected ? "600" : "400",
                      }}
                    >
                      {type.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <ThemedText type="small" style={styles.label}>
              {t.jobs.recurrence}
            </ThemedText>
            <View style={styles.jobTypeContainer}>
              {recurrenceOptions.map((option) => {
                const isSelected = recurrence === option.value;
                return (
                  <Pressable
                    key={option.value}
                    testID={`recurrence-${option.value}`}
                    onPress={() => setRecurrence(option.value)}
                    style={[
                      styles.jobTypeChip,
                      {
                        backgroundColor: isSelected
                          ? theme.primary
                          : theme.backgroundSecondary,
                        borderColor: isSelected
                          ? theme.primary
                          : theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={{
                        color: isSelected ? "#FFFFFF" : theme.text,
                        fontWeight: isSelected ? "600" : "400",
                      }}
                    >
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <Input
              testID="input-start-date"
              label={t.jobs.startDateTime}
              placeholder={t.jobs.startDatePlaceholder}
              value={startDate}
              onChangeText={setStartDate}
              leftIcon="calendar"
            />
            <Input
              testID="input-address"
              label={t.jobs.address}
              placeholder={t.jobs.addressPlaceholder}
              value={address}
              onChangeText={setAddress}
              leftIcon="map-pin"
            />
            <Input
              testID="input-notes"
              label={t.jobs.internalNotes}
              placeholder={t.jobs.notesPlaceholder}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
            <Input
              testID="input-total"
              label={t.jobs.totalAmount}
              placeholder="0.00"
              value={total}
              onChangeText={setTotal}
              keyboardType="decimal-pad"
              leftIcon="dollar-sign"
            />
            <Button
              onPress={handleSaveJob}
              disabled={
                !startDate.trim() ||
                !address.trim() ||
                createMutation.isPending
              }
              style={styles.saveButton}
            >
              {createMutation.isPending ? t.common.saving : t.jobs.saveJob}
            </Button>
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  emptyContent: {
    flexGrow: 1,
  },
  filterContainer: {
    marginBottom: Spacing.lg,
  },
  jobCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.lg,
  },
  jobRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  jobInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  jobTitle: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontWeight: "600",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  detailIcon: {
    marginRight: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  modalContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing["4xl"],
  },
  label: {
    marginBottom: Spacing.xs,
    fontWeight: "500",
  },
  jobTypeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  jobTypeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  saveButton: {
    marginTop: Spacing.lg,
  },
  recurrenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    alignSelf: "flex-start",
    marginBottom: 2,
  },
  completeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
});
