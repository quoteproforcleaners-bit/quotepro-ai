import React, { useState, useCallback, useMemo } from "react";
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
  TextInput,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
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
import { ProGate } from "@/components/ProGate";
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

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
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

function formatPickerDate(date: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const day = days[date.getDay()];
  const month = months[date.getMonth()];
  const dayNum = date.getDate();
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours === 0 ? 12 : hours;
  const minuteStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${day}, ${month} ${dayNum}, ${year} at ${hours}:${minuteStr} ${ampm}`;
}

export default function JobsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useLanguage();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;

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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateSelected, setDateSelected] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [total, setTotal] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");

  const {
    data: jobs = [],
    isLoading,
    refetch,
  } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const q = customerSearch.toLowerCase();
    return customers.filter((c) => {
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      return fullName.includes(q) || (c.phone && c.phone.includes(q)) || (c.email && c.email.toLowerCase().includes(q));
    }).slice(0, 5);
  }, [customerSearch, customers]);

  const createMutation = useMutation({
    mutationFn: async (data: {
      jobType: string;
      recurrence: string;
      startDatetime: string;
      address: string;
      internalNotes: string;
      total: number | null;
      customerId?: string | null;
      estimatedDuration?: number | null;
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
    setSelectedDate(new Date());
    setDateSelected(false);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setAddress("");
    setNotes("");
    setTotal("");
    setSelectedCustomerId(null);
    setCustomerSearch("");
    setShowCustomerDropdown(false);
    setEstimatedDuration("");
    setIsNewCustomer(false);
    setNewFirstName("");
    setNewLastName("");
    setNewPhone("");
    setNewEmail("");
    setNewCustomerAddress("");
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleAddJob = () => {
    setModalVisible(true);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerSearch(`${customer.firstName} ${customer.lastName}`);
    setShowCustomerDropdown(false);
    if (customer.address && !address.trim()) {
      setAddress(customer.address);
    }
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId(null);
    setCustomerSearch("");
    setShowCustomerDropdown(false);
    setIsNewCustomer(false);
    setNewFirstName("");
    setNewLastName("");
    setNewPhone("");
    setNewEmail("");
    setNewCustomerAddress("");
  };

  const handleAddNewCustomer = () => {
    setShowCustomerDropdown(false);
    setIsNewCustomer(true);
  };

  const handleDateChange = (_event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (date) {
        const newDate = new Date(selectedDate);
        newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        setSelectedDate(newDate);
        setDateSelected(true);
        setTimeout(() => setShowTimePicker(true), 300);
      }
    } else {
      if (date) {
        setSelectedDate(date);
        setDateSelected(true);
      }
    }
  };

  const handleTimeChange = (_event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
      if (date) {
        const newDate = new Date(selectedDate);
        newDate.setHours(date.getHours(), date.getMinutes());
        setSelectedDate(newDate);
        setDateSelected(true);
      }
    } else {
      if (date) {
        setSelectedDate(date);
        setDateSelected(true);
      }
    }
  };

  const handleSaveJob = async () => {
    if (!dateSelected || !address.trim()) return;
    let custId = selectedCustomerId;
    if (isNewCustomer && newFirstName.trim()) {
      try {
        const res = await apiRequest("POST", "/api/customers", {
          firstName: newFirstName.trim(),
          lastName: newLastName.trim(),
          phone: newPhone.trim(),
          email: newEmail.trim(),
          address: newCustomerAddress.trim(),
        });
        const newCust = await res.json();
        custId = newCust.id;
        queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      } catch (err) {
        Alert.alert("Error", "Could not create customer. Please try again.");
        return;
      }
    }
    createMutation.mutate({
      jobType,
      recurrence,
      startDatetime: selectedDate.toISOString(),
      address: address.trim(),
      internalNotes: notes.trim(),
      total: total.trim() ? parseFloat(total.trim()) : null,
      customerId: custId,
      estimatedDuration: estimatedDuration.trim() ? parseFloat(estimatedDuration.trim()) : null,
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

  const selectedCustomer = selectedCustomerId
    ? customers.find((c) => c.id === selectedCustomerId)
    : null;

  return (
    <ProGate featureName="Job Scheduling">
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
          ...(useMaxWidth ? [{ maxWidth: 560, alignSelf: "center" as const, width: "100%" as const }] : []),
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
            {/* Customer Search */}
            <ThemedText type="small" style={styles.label}>
              {t.jobs.customer}
            </ThemedText>
            {selectedCustomer ? (
              <View style={[styles.selectedCustomerCard, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                <View style={styles.selectedCustomerInfo}>
                  <View style={[styles.customerAvatar, { backgroundColor: `${theme.primary}20` }]}>
                    <Feather name="user" size={16} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="subtitle">
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </ThemedText>
                    {selectedCustomer.phone ? (
                      <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                        {selectedCustomer.phone}
                      </ThemedText>
                    ) : null}
                  </View>
                  <Pressable testID="clear-customer" onPress={handleClearCustomer} hitSlop={8}>
                    <Feather name="x-circle" size={20} color={theme.textSecondary} />
                  </Pressable>
                </View>
              </View>
            ) : isNewCustomer ? (
              <View style={[styles.newCustomerCard, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                <View style={styles.newCustomerHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Feather name="user-plus" size={16} color={theme.primary} style={{ marginRight: Spacing.sm }} />
                    <ThemedText type="subtitle">{t.jobs.newCustomer}</ThemedText>
                  </View>
                  <Pressable testID="cancel-new-customer" onPress={handleClearCustomer} hitSlop={8}>
                    <Feather name="x-circle" size={20} color={theme.textSecondary} />
                  </Pressable>
                </View>
                <View style={styles.newCustomerFields}>
                  <View style={styles.nameRow2}>
                    <View style={{ flex: 1, marginRight: Spacing.sm }}>
                      <Input
                        testID="input-new-first-name"
                        label={t.jobs.firstName}
                        placeholder={t.jobs.firstName}
                        value={newFirstName}
                        onChangeText={setNewFirstName}
                        leftIcon="user"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Input
                        testID="input-new-last-name"
                        label={t.jobs.lastName}
                        placeholder={t.jobs.lastName}
                        value={newLastName}
                        onChangeText={setNewLastName}
                      />
                    </View>
                  </View>
                  <Input
                    testID="input-new-phone"
                    label={t.jobs.phone}
                    placeholder={t.jobs.phonePlaceholder}
                    value={newPhone}
                    onChangeText={setNewPhone}
                    keyboardType="phone-pad"
                    leftIcon="phone"
                  />
                  <Input
                    testID="input-new-email"
                    label={t.jobs.email}
                    placeholder={t.jobs.emailPlaceholder}
                    value={newEmail}
                    onChangeText={setNewEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    leftIcon="mail"
                  />
                  <Input
                    testID="input-new-customer-address"
                    label={t.jobs.address}
                    placeholder={t.jobs.addressPlaceholder}
                    value={newCustomerAddress}
                    onChangeText={(text) => {
                      setNewCustomerAddress(text);
                      if (!address.trim()) setAddress(text);
                    }}
                    leftIcon="map-pin"
                  />
                </View>
              </View>
            ) : (
              <View style={{ marginBottom: Spacing.lg, zIndex: 10 }}>
                <View style={[styles.searchInputContainer, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <Feather name="search" size={18} color={theme.textSecondary} style={{ marginLeft: Spacing.md, marginRight: Spacing.sm }} />
                  <TextInput
                    testID="input-customer-search"
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder={t.jobs.searchCustomer}
                    placeholderTextColor={theme.textSecondary}
                    value={customerSearch}
                    onChangeText={(text) => {
                      setCustomerSearch(text);
                      setShowCustomerDropdown(text.trim().length > 0);
                      if (!text.trim()) setSelectedCustomerId(null);
                    }}
                    onFocus={() => {
                      if (customerSearch.trim().length > 0) setShowCustomerDropdown(true);
                    }}
                  />
                </View>
                {showCustomerDropdown && filteredCustomers.length > 0 ? (
                  <View style={[styles.dropdown, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                    {filteredCustomers.map((c) => (
                      <Pressable
                        key={c.id}
                        testID={`customer-option-${c.id}`}
                        style={[styles.dropdownItem, { borderBottomColor: theme.border }]}
                        onPress={() => handleSelectCustomer(c)}
                      >
                        <View style={[styles.customerAvatar, { backgroundColor: `${theme.primary}20` }]}>
                          <Feather name="user" size={14} color={theme.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText type="body">{c.firstName} {c.lastName}</ThemedText>
                          {c.address ? (
                            <ThemedText type="caption" style={{ color: theme.textSecondary }} numberOfLines={1}>
                              {c.address}
                            </ThemedText>
                          ) : null}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                {showCustomerDropdown && customerSearch.trim().length > 0 && filteredCustomers.length === 0 ? (
                  <View style={[styles.dropdown, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                    <Pressable
                      testID="add-new-customer-btn"
                      style={styles.addNewCustomerItem}
                      onPress={handleAddNewCustomer}
                    >
                      <View style={[styles.customerAvatar, { backgroundColor: `${theme.success}20` }]}>
                        <Feather name="user-plus" size={14} color={theme.success} />
                      </View>
                      <ThemedText type="body" style={{ color: theme.primary, fontWeight: "600" }}>
                        {t.jobs.addNewCustomer}
                      </ThemedText>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            )}

            {/* Job Type */}
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

            {/* Recurrence */}
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

            {/* Date & Time Picker */}
            <ThemedText type="small" style={styles.label}>
              {t.jobs.startDateTime}
            </ThemedText>
            {Platform.OS === "ios" ? (
              <View style={[styles.datePickerContainer, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                <DateTimePicker
                  testID="date-time-picker"
                  value={selectedDate}
                  mode="datetime"
                  display="compact"
                  onChange={(_e: any, date?: Date) => {
                    if (date) {
                      setSelectedDate(date);
                      setDateSelected(true);
                    }
                  }}
                  minimumDate={new Date()}
                  themeVariant="dark"
                  style={styles.iosPicker}
                />
              </View>
            ) : (
              <View style={{ marginBottom: Spacing.lg }}>
                <Pressable
                  testID="open-date-picker"
                  style={[styles.dateButton, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Feather name="calendar" size={20} color={theme.textSecondary} style={{ marginRight: Spacing.sm }} />
                  <ThemedText type="body" style={{ color: dateSelected ? theme.text : theme.textSecondary, flex: 1 }}>
                    {dateSelected ? formatPickerDate(selectedDate) : t.jobs.selectDateTime}
                  </ThemedText>
                  <Feather name="chevron-down" size={18} color={theme.textSecondary} />
                </Pressable>
                {showDatePicker ? (
                  <DateTimePicker
                    testID="android-date-picker"
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                ) : null}
                {showTimePicker ? (
                  <DateTimePicker
                    testID="android-time-picker"
                    value={selectedDate}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                  />
                ) : null}
              </View>
            )}

            {/* Address */}
            <Input
              testID="input-address"
              label={t.jobs.address}
              placeholder={t.jobs.addressPlaceholder}
              value={address}
              onChangeText={setAddress}
              leftIcon="map-pin"
            />

            {/* Estimated Duration */}
            <Input
              testID="input-duration"
              label={t.jobs.estimatedDuration}
              placeholder={t.jobs.durationPlaceholder}
              value={estimatedDuration}
              onChangeText={setEstimatedDuration}
              keyboardType="decimal-pad"
              leftIcon="clock"
            />

            {/* Internal Notes */}
            <Input
              testID="input-notes"
              label={t.jobs.internalNotes}
              placeholder={t.jobs.notesPlaceholder}
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            {/* Total Amount */}
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
                !dateSelected ||
                !address.trim() ||
                (isNewCustomer && !newFirstName.trim()) ||
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
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    height: Spacing.inputHeight,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: Spacing.sm,
    fontSize: 16,
  },
  dropdown: {
    position: "absolute",
    top: Spacing.inputHeight + 2,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    maxHeight: 220,
    zIndex: 100,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  noResultsItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  customerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  selectedCustomerCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  selectedCustomerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  newCustomerCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  newCustomerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  newCustomerFields: {
  },
  nameRow2: {
    flexDirection: "row",
  },
  addNewCustomerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  datePickerContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: "flex-start",
  },
  iosPicker: {
    marginLeft: -8,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.md,
  },
});
