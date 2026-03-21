import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useSubscription } from "@/context/SubscriptionContext";
import { QuickAddCleanModal } from "@/components/QuickAddCleanModal";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

interface CalJob {
  id: string;
  customerName: string;
  jobType: string;
  status: string;
  startDatetime: string;
  endDatetime: string | null;
  total: number | null;
  address: string;
  quoteId: string | null;
}

interface UnscheduledQuote {
  id: string;
  customerName: string;
  customerId: string | null;
  total: number | null;
  selectedOption: string;
  options: any;
  frequencySelected: string;
  acceptedAt: string | null;
  address: string;
  propertyDetails: any;
}

// ─── Month Calendar ───────────────────────────────────────────────────────────

function MonthCalendar({
  currentMonth,
  jobs,
  selectedDay,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}: {
  currentMonth: Date;
  jobs: CalJob[];
  selectedDay: Date;
  onSelectDay: (d: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const { theme } = useTheme();
  const today = startOfDay(new Date());
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDate = addDays(firstDay, -firstDay.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(startDate, i));

  const monthRevenue = jobs
    .filter((j) => {
      const d = new Date(j.startDatetime);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((s, j) => s + (j.total || 0), 0);

  const hasJobOnDay = (d: Date) =>
    jobs.some((j) => isSameDay(new Date(j.startDatetime), d));

  return (
    <Card style={styles.calendarCard}>
      {/* Month header */}
      <View style={styles.monthHeader}>
        <Pressable onPress={onPrevMonth} style={styles.navBtn} hitSlop={8}>
          <Feather name="chevron-left" size={20} color={theme.textSecondary} />
        </Pressable>
        <View style={styles.monthTitleWrap}>
          <ThemedText style={styles.monthTitle}>
            {MONTH_NAMES[month]} {year}
          </ThemedText>
          {monthRevenue > 0 ? (
            <ThemedText style={[styles.monthRevenue, { color: theme.success || "#16a34a" }]}>
              ${monthRevenue.toLocaleString()} this month
            </ThemedText>
          ) : null}
        </View>
        <Pressable onPress={onNextMonth} style={styles.navBtn} hitSlop={8}>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>

      {/* Day labels */}
      <View style={styles.dayLabels}>
        {DAYS_SHORT.map((d, i) => (
          <View key={i} style={styles.dayLabelCell}>
            <ThemedText style={[styles.dayLabel, { color: theme.textSecondary }]}>{d}</ThemedText>
          </View>
        ))}
      </View>

      {/* Cells grid */}
      <View style={styles.cellGrid}>
        {cells.map((day, idx) => {
          const isCurrentMonth = day.getMonth() === month;
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDay);
          const hasJob = hasJobOnDay(day);

          return (
            <Pressable
              key={idx}
              onPress={() => {
                onSelectDay(day);
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              style={[
                styles.dayCell,
                isSelected && { backgroundColor: theme.primary },
                isToday && !isSelected && { borderWidth: 1.5, borderColor: theme.primary },
              ]}
            >
              <ThemedText
                style={[
                  styles.dayNumber,
                  !isCurrentMonth && { color: theme.textSecondary, opacity: 0.35 },
                  isSelected && { color: "#fff" },
                  isToday && !isSelected && { color: theme.primary, fontWeight: "700" },
                ]}
              >
                {day.getDate()}
              </ThemedText>
              {hasJob ? (
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: isSelected ? "#fff" : theme.primary },
                  ]}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

// ─── Day Events ───────────────────────────────────────────────────────────────

function DayEvents({
  day,
  jobs,
  onJobPress,
}: {
  day: Date;
  jobs: CalJob[];
  onJobPress: (job: CalJob) => void;
}) {
  const { theme } = useTheme();
  const dayJobs = jobs.filter((j) => isSameDay(new Date(j.startDatetime), day));
  const revenue = dayJobs.reduce((s, j) => s + (j.total || 0), 0);

  const isToday = isSameDay(day, new Date());
  const label = isToday
    ? "Today"
    : day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <View style={styles.dayEventsSection}>
      <View style={styles.dayEventsHeader}>
        <ThemedText style={styles.dayEventsTitle}>{label}</ThemedText>
        {revenue > 0 ? (
          <View style={[styles.revenueBadge, { backgroundColor: (theme.success || "#16a34a") + "20" }]}>
            <ThemedText style={[styles.revenueBadgeText, { color: theme.success || "#16a34a" }]}>
              ${revenue.toFixed(0)}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {dayJobs.length === 0 ? (
        <View style={[styles.emptyDay, { borderColor: theme.border }]}>
          <Feather name="calendar" size={28} color={theme.textSecondary} style={{ opacity: 0.4 }} />
          <ThemedText style={[styles.emptyDayText, { color: theme.textSecondary }]}>
            No jobs scheduled
          </ThemedText>
        </View>
      ) : (
        dayJobs
          .sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime())
          .map((job) => {
            const statusColor =
              job.status === "completed"
                ? "#16a34a"
                : job.status === "in_progress"
                ? "#d97706"
                : theme.primary;

            return (
              <Pressable
                key={job.id}
                onPress={() => onJobPress(job)}
                style={({ pressed }) => [
                  styles.jobCard,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderLeftColor: statusColor,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={styles.jobCardContent}>
                  <View style={styles.jobCardLeft}>
                    <ThemedText style={styles.jobCardCustomer} numberOfLines={1}>
                      {job.customerName || job.jobType}
                    </ThemedText>
                    <ThemedText style={[styles.jobCardType, { color: theme.textSecondary }]} numberOfLines={1}>
                      {job.jobType}
                    </ThemedText>
                    <View style={styles.jobCardMeta}>
                      <Feather name="clock" size={11} color={theme.textSecondary} />
                      <ThemedText style={[styles.jobCardMetaText, { color: theme.textSecondary }]}>
                        {formatTime(job.startDatetime)}
                        {job.endDatetime ? ` – ${formatTime(job.endDatetime)}` : ""}
                      </ThemedText>
                    </View>
                  </View>
                  {job.total ? (
                    <View>
                      <ThemedText style={[styles.jobCardTotal, { color: statusColor }]}>
                        ${job.total.toFixed(0)}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })
      )}
    </View>
  );
}

// ─── Unscheduled Panel ────────────────────────────────────────────────────────

function UnscheduledBanner({
  quotes,
  onSchedule,
}: {
  quotes: UnscheduledQuote[];
  onSchedule: (q: UnscheduledQuote) => void;
}) {
  const { theme } = useTheme();
  if (!quotes.length) return null;

  return (
    <View style={[styles.unscheduledBanner, { backgroundColor: "#fef9c3", borderColor: "#fde047" }]}>
      <View style={styles.unscheduledHeader}>
        <View style={styles.pulsingDot} />
        <ThemedText style={styles.unscheduledTitle}>
          {quotes.length} {quotes.length === 1 ? "quote needs" : "quotes need"} scheduling
        </ThemedText>
      </View>
      {quotes.map((q) => (
        <View key={q.id} style={[styles.unscheduledItem, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.unscheduledItemInfo}>
            <ThemedText style={styles.unscheduledCustomer} numberOfLines={1}>
              {q.customerName}
            </ThemedText>
            <ThemedText style={[styles.unscheduledService, { color: theme.textSecondary }]} numberOfLines={1}>
              {q.options?.[q.selectedOption]?.name || q.selectedOption}
              {q.total ? ` · $${q.total.toFixed(0)}` : ""}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => onSchedule(q)}
            style={[styles.scheduleBtn, { backgroundColor: theme.primary }]}
          >
            <Feather name="plus" size={12} color="#fff" />
            <ThemedText style={styles.scheduleBtnText}>Schedule</ThemedText>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// ─── Schedule Modal ───────────────────────────────────────────────────────────

function ScheduleModal({
  quote,
  preselectedDate,
  onClose,
}: {
  quote: UnscheduledQuote;
  preselectedDate: Date;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(preselectedDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState<"1.5" | "2" | "3" | "4">("3");
  const [notes, setNotes] = useState("");

  const serviceLabel =
    quote.options?.[quote.selectedOption]?.name ||
    (quote.selectedOption
      ? `${quote.selectedOption.charAt(0).toUpperCase()}${quote.selectedOption.slice(1)} Service`
      : "Cleaning");

  const scheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = new URL("/api/jobs", getApiUrl());
      return apiRequest("POST", url.toString(), data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes/unscheduled-accepted"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onClose();
    },
    onError: (e: any) => {
      Alert.alert("Error", e?.message || "Failed to schedule");
    },
  });

  const handleSchedule = () => {
    const end = new Date(date);
    end.setHours(end.getHours() + parseFloat(duration));
    scheduleMutation.mutate({
      quoteId: quote.id,
      customerId: quote.customerId,
      jobType: serviceLabel,
      startDatetime: date.toISOString(),
      endDatetime: end.toISOString(),
      address: quote.address || quote.propertyDetails?.customerAddress || "",
      total: quote.total,
      status: "scheduled",
      internalNotes: notes,
    });
  };

  const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const dateStr = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalSheet, { backgroundColor: theme.backgroundDefault }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          <View style={[styles.modalHeader, { backgroundColor: theme.primary }]}>
            <View>
              <ThemedText style={styles.modalHeaderLabel}>Schedule Clean</ThemedText>
              <ThemedText style={styles.modalHeaderCustomer}>{quote.customerName}</ThemedText>
              <ThemedText style={styles.modalHeaderService}>{serviceLabel}</ThemedText>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {/* Date/time row */}
            <View style={styles.scheduleRow}>
              <Pressable
                onPress={() => { setShowDatePicker(true); setShowTimePicker(false); }}
                style={[styles.scheduleField, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
              >
                <Feather name="calendar" size={14} color={theme.textSecondary} />
                <View>
                  <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Date</ThemedText>
                  <ThemedText style={styles.fieldValue}>{dateStr}</ThemedText>
                </View>
              </Pressable>
              <Pressable
                onPress={() => { setShowTimePicker(true); setShowDatePicker(false); }}
                style={[styles.scheduleField, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
              >
                <Feather name="clock" size={14} color={theme.textSecondary} />
                <View>
                  <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Time</ThemedText>
                  <ThemedText style={styles.fieldValue}>{timeStr}</ThemedText>
                </View>
              </Pressable>
            </View>

            {showDatePicker || showTimePicker ? (
              <View style={{ alignItems: "center", marginBottom: Spacing.md }}>
                <DateTimePicker
                  value={date}
                  mode={showDatePicker ? "date" : "time"}
                  display="spinner"
                  onChange={(_e, selected) => {
                    if (selected) setDate(selected);
                    if (Platform.OS === "android") {
                      setShowDatePicker(false);
                      setShowTimePicker(false);
                    }
                  }}
                  textColor={theme.text}
                />
                {Platform.OS === "ios" ? (
                  <Button
                    onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }}
                    style={{ marginTop: Spacing.sm }}
                  >Done</Button>
                ) : null}
              </View>
            ) : null}

            {/* Duration */}
            <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              Estimated Duration
            </ThemedText>
            <View style={styles.durationRow}>
              {(["1.5", "2", "3", "4"] as const).map((h) => (
                <Pressable
                  key={h}
                  onPress={() => setDuration(h)}
                  style={[
                    styles.durationBtn,
                    {
                      backgroundColor: duration === h ? theme.primary : theme.backgroundSecondary,
                      borderColor: duration === h ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.durationBtnText,
                      { color: duration === h ? "#fff" : theme.text },
                    ]}
                  >
                    {h}h
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            {/* Address */}
            {(quote.address || quote.propertyDetails?.customerAddress) ? (
              <View style={[styles.addressBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <Feather name="map-pin" size={13} color={theme.textSecondary} />
                <ThemedText style={[styles.addressText, { color: theme.textSecondary }]} numberOfLines={2}>
                  {quote.address || quote.propertyDetails?.customerAddress}
                </ThemedText>
              </View>
            ) : null}

            {/* Notes */}
            <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              Internal Notes (optional)
            </ThemedText>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Access instructions, special requests…"
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
              style={[
                styles.notesInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundSecondary,
                },
              ]}
            />

            <Button
              onPress={handleSchedule}
              disabled={scheduleMutation.isPending}
              style={{ marginTop: Spacing.md, marginBottom: Spacing.xl }}
            >
              {scheduleMutation.isPending ? "Scheduling…" : "Schedule Clean"}
            </Button>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const queryClient = useQueryClient();
  const { isGrowth, isInFreeTrial } = useSubscription();

  const [currentMonth, setCurrentMonth] = useState(startOfDay(new Date()));
  const [selectedDay, setSelectedDay] = useState(startOfDay(new Date()));
  const [scheduleQuote, setScheduleQuote] = useState<UnscheduledQuote | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Compute date range for fetch
  const { from, to } = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    return {
      from: new Date(y, m - 1, 1).toISOString(),
      to: new Date(y, m + 2, 0, 23, 59, 59).toISOString(),
    };
  }, [currentMonth]);

  const { data: jobs = [], isLoading } = useQuery<CalJob[]>({
    queryKey: ["/api/jobs/calendar", from, to],
    queryFn: async () => {
      const url = new URL("/api/jobs/calendar", getApiUrl());
      url.searchParams.set("from", from);
      url.searchParams.set("to", to);
      const res = await fetch(url.toString(), { credentials: "include" });
      return res.json();
    },
  });

  const { data: unscheduled = [] } = useQuery<UnscheduledQuote[]>({
    queryKey: ["/api/quotes/unscheduled-accepted"],
    queryFn: async () => {
      const url = new URL("/api/quotes/unscheduled-accepted", getApiUrl());
      const res = await fetch(url.toString(), { credentials: "include" });
      return res.json();
    },
  });

  const prevMonth = useCallback(() => {
    setCurrentMonth((d) => {
      const c = new Date(d);
      c.setMonth(c.getMonth() - 1);
      return c;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setCurrentMonth((d) => {
      const c = new Date(d);
      c.setMonth(c.getMonth() + 1);
      return c;
    });
  }, []);

  const handleJobPress = useCallback(
    (job: CalJob) => navigation.navigate("JobDetail", { jobId: job.id }),
    [navigation]
  );

  const canQuickAdd = isGrowth || isInFreeTrial;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: tabBarHeight + Spacing.xl + 72,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Unscheduled banner */}
        {unscheduled.length > 0 ? (
          <UnscheduledBanner quotes={unscheduled} onSchedule={setScheduleQuote} />
        ) : null}

        {/* Month calendar */}
        <MonthCalendar
          currentMonth={currentMonth}
          jobs={jobs}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
        />

        {/* Day events */}
        {isLoading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing.xl }} />
        ) : (
          <DayEvents day={selectedDay} jobs={jobs} onJobPress={handleJobPress} />
        )}
      </ScrollView>

      {/* Quick Add FAB */}
      <Pressable
        onPress={() => {
          if (!canQuickAdd) {
            Alert.alert("Growth Plan Required", "Quick Add Clean is available on the Growth plan. Upgrade to unlock instant scheduling.");
            return;
          }
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowQuickAdd(true);
        }}
        style={[
          styles.fab,
          {
            backgroundColor: theme.primary,
            bottom: tabBarHeight + Spacing.lg,
            right: Spacing.lg,
            opacity: canQuickAdd ? 1 : 0.65,
          },
        ]}
        testID="btn-quick-add-clean"
      >
        <Feather name="plus" size={22} color="#fff" />
        <ThemedText style={styles.fabLabel}>Quick Add Clean</ThemedText>
      </Pressable>

      {/* Schedule modal (from unscheduled banner) */}
      {scheduleQuote ? (
        <ScheduleModal
          quote={scheduleQuote}
          preselectedDate={selectedDay}
          onClose={() => setScheduleQuote(null)}
        />
      ) : null}

      {/* Quick Add Clean modal */}
      <QuickAddCleanModal
        visible={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        prefilledDate={selectedDay}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, gap: Spacing.md },

  fab: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    borderRadius: BorderRadius.full,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabLabel: { fontSize: 14, fontWeight: "700", color: "#fff" },

  calendarCard: { padding: Spacing.md },

  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  navBtn: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  monthTitleWrap: { alignItems: "center" },
  monthTitle: { fontSize: 17, fontWeight: "700" },
  monthRevenue: { fontSize: 12, fontWeight: "600", marginTop: 2 },

  dayLabels: {
    flexDirection: "row",
    marginBottom: Spacing.xs,
  },
  dayLabelCell: { flex: 1, alignItems: "center" },
  dayLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },

  cellGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.285714%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.full,
    position: "relative",
  },
  dayNumber: { fontSize: 13, fontWeight: "500" },
  dot: {
    position: "absolute",
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  dayEventsSection: { paddingBottom: Spacing.sm },
  dayEventsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  dayEventsTitle: { fontSize: 15, fontWeight: "700" },
  revenueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  revenueBadgeText: { fontSize: 12, fontWeight: "700" },

  emptyDay: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  emptyDayText: { fontSize: 14, opacity: 0.7 },

  jobCard: {
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  jobCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  jobCardLeft: { flex: 1, marginRight: Spacing.md },
  jobCardCustomer: { fontSize: 15, fontWeight: "700" },
  jobCardType: { fontSize: 13, marginTop: 1 },
  jobCardMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  jobCardMetaText: { fontSize: 12 },
  jobCardTotal: { fontSize: 18, fontWeight: "800" },

  unscheduledBanner: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  unscheduledHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ca8a04",
  },
  unscheduledTitle: { fontSize: 13, fontWeight: "700", color: "#92400e" },
  unscheduledItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  unscheduledItemInfo: { flex: 1 },
  unscheduledCustomer: { fontSize: 13, fontWeight: "700" },
  unscheduledService: { fontSize: 12, marginTop: 1 },
  scheduleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  scheduleBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },

  // Modal styles
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    overflow: "hidden",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginVertical: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: Spacing.lg,
    paddingTop: Spacing.md,
  },
  modalHeaderLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  modalHeaderCustomer: { fontSize: 18, fontWeight: "800", color: "#fff", marginTop: 2 },
  modalHeaderService: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  modalBody: { padding: Spacing.lg },

  scheduleRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md },
  scheduleField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  fieldLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  fieldValue: { fontSize: 13, fontWeight: "600", marginTop: 1 },

  sectionLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.sm, marginTop: Spacing.sm },

  durationRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md },
  durationBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  durationBtnText: { fontSize: 14, fontWeight: "700" },

  addressBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  addressText: { flex: 1, fontSize: 13 },

  notesInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: 14,
    textAlignVertical: "top",
    minHeight: 72,
  },
});
