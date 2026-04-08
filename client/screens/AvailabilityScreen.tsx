import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
  Alert,
  Platform,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { IOSShadow } from "@/styles/tokens";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => {
  const ampm = i >= 12 ? "PM" : "AM";
  const h = i % 12 === 0 ? 12 : i % 12;
  return { value: `${String(i).padStart(2, "0")}:00`, label: `${h}:00 ${ampm}` };
});

function SectionCard({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }, IOSShadow.card]}>
      {children}
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  const { theme } = useTheme();
  return <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{title}</Text>;
}

function RowPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View>
      <Pressable
        onPress={() => setOpen(!open)}
        style={({ pressed }) => [
          styles.pickerRow,
          { borderBottomColor: theme.border, backgroundColor: pressed ? `${theme.primary}08` : "transparent" },
        ]}
      >
        <Text style={[styles.pickerLabel, { color: theme.text }]}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={[styles.pickerValue, { color: theme.primary }]}>{selected?.label || value}</Text>
          <Feather name={open ? "chevron-up" : "chevron-down"} size={14} color={theme.textSecondary} />
        </View>
      </Pressable>
      {open && (
        <View style={[styles.pickerDropdown, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          {options.map((o) => (
            <Pressable
              key={o.value}
              onPress={() => { onChange(o.value); setOpen(false); }}
              style={({ pressed }) => [
                styles.pickerOption,
                { borderBottomColor: theme.border, backgroundColor: pressed ? `${theme.primary}10` : "transparent" },
              ]}
            >
              <Text style={[styles.pickerOptionText, { color: o.value === value ? theme.primary : theme.text }]}>
                {o.label}
              </Text>
              {o.value === value && <Feather name="check" size={14} color={theme.primary} />}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default function AvailabilityScreen() {
  const { theme } = useTheme();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/availability"],
  });

  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [slotDuration, setSlotDuration] = useState(120);
  const [bufferMinutes, setBufferMinutes] = useState(30);
  const [advanceBookingDays, setAdvanceBookingDays] = useState(30);
  const [minNoticeHours, setMinNoticeHours] = useState(24);
  const [blockedDates, setBlockedDates] = useState<{ date: string; reason?: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (data && !loaded) {
      const s = data.settings;
      if (s) {
        setWorkingDays(s.working_days || [1, 2, 3, 4, 5]);
        setStartTime(s.start_time || "08:00");
        setEndTime(s.end_time || "17:00");
        setSlotDuration(s.slot_duration_minutes || 120);
        setBufferMinutes(s.buffer_minutes || 30);
        setAdvanceBookingDays(s.advance_booking_days || 30);
        setMinNoticeHours(s.min_notice_hours || 24);
      }
      if (data.blockedDates) {
        setBlockedDates(data.blockedDates.map((bd: any) => ({
          date: bd.blocked_date,
          reason: bd.reason,
        })));
      }
      setLoaded(true);
    }
  }, [data, loaded]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/availability", {
        workingDays,
        startTime,
        endTime,
        slotDurationMinutes: slotDuration,
        bufferMinutes,
        advanceBookingDays,
        minNoticeHours,
        blockedDates,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      Alert.alert("Error", "Failed to save availability settings.");
    },
  });

  const toggleDay = (day: number) => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await saveMutation.mutateAsync();
    setSaving(false);
  };

  const addBlockedDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const dateStr = today.toISOString().slice(0, 10);
    setBlockedDates((prev) => [...prev, { date: dateStr }]);
  };

  const removeBlockedDate = (index: number) => {
    setBlockedDates((prev) => prev.filter((_, i) => i !== index));
  };

  const DURATION_OPTIONS = [
    { value: 60, label: "1 hour" },
    { value: 90, label: "1.5 hours" },
    { value: 120, label: "2 hours" },
    { value: 180, label: "3 hours" },
    { value: 240, label: "4 hours" },
  ];

  const BUFFER_OPTIONS = [
    { value: 0, label: "No buffer" },
    { value: 15, label: "15 min" },
    { value: 30, label: "30 min" },
    { value: 45, label: "45 min" },
    { value: 60, label: "1 hour" },
  ];

  const ADVANCE_OPTIONS = [
    { value: 7, label: "1 week" },
    { value: 14, label: "2 weeks" },
    { value: 30, label: "1 month" },
    { value: 60, label: "2 months" },
    { value: 90, label: "3 months" },
  ];

  const NOTICE_OPTIONS = [
    { value: 2, label: "2 hours" },
    { value: 4, label: "4 hours" },
    { value: 12, label: "12 hours" },
    { value: 24, label: "1 day" },
    { value: 48, label: "2 days" },
  ];

  return (
    <KeyboardAwareScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.md,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
      }}
      showsVerticalScrollIndicator={false}
    >
      <SectionTitle title="WORKING DAYS" />
      <SectionCard>
        <View style={styles.daysRow}>
          {DAYS.map((day, i) => {
            const active = workingDays.includes(i);
            return (
              <Pressable
                key={day}
                onPress={() => toggleDay(i)}
                style={[
                  styles.dayPill,
                  {
                    backgroundColor: active ? theme.primary : (theme.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
                testID={`toggle-day-${day}`}
              >
                <Text style={[styles.dayText, { color: active ? "#fff" : theme.textSecondary }]}>{day}</Text>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <SectionTitle title="WORKING HOURS" />
      <SectionCard>
        <RowPicker
          label="Start time"
          value={startTime}
          options={HOURS}
          onChange={setStartTime}
        />
        <RowPicker
          label="End time"
          value={endTime}
          options={HOURS}
          onChange={setEndTime}
        />
      </SectionCard>

      <SectionTitle title="BOOKING SLOTS" />
      <SectionCard>
        <RowPicker
          label="Appointment duration"
          value={String(slotDuration)}
          options={DURATION_OPTIONS.map((o) => ({ ...o, value: String(o.value) }))}
          onChange={(v) => setSlotDuration(Number(v))}
        />
        <RowPicker
          label="Buffer between slots"
          value={String(bufferMinutes)}
          options={BUFFER_OPTIONS.map((o) => ({ ...o, value: String(o.value) }))}
          onChange={(v) => setBufferMinutes(Number(v))}
        />
        <RowPicker
          label="Advance booking window"
          value={String(advanceBookingDays)}
          options={ADVANCE_OPTIONS.map((o) => ({ ...o, value: String(o.value) }))}
          onChange={(v) => setAdvanceBookingDays(Number(v))}
        />
        <RowPicker
          label="Minimum notice required"
          value={String(minNoticeHours)}
          options={NOTICE_OPTIONS.map((o) => ({ ...o, value: String(o.value) }))}
          onChange={(v) => setMinNoticeHours(Number(v))}
        />
      </SectionCard>

      <View style={styles.blockedHeader}>
        <SectionTitle title="BLOCKED DATES" />
        <Pressable onPress={addBlockedDate} style={styles.addBlockBtn}>
          <Feather name="plus" size={16} color={theme.primary} />
          <Text style={[styles.addBlockLabel, { color: theme.primary }]}>Add</Text>
        </Pressable>
      </View>

      {blockedDates.length > 0 ? (
        <SectionCard>
          {blockedDates.map((bd, idx) => (
            <View
              key={idx}
              style={[styles.blockedRow, { borderBottomColor: theme.border, borderBottomWidth: idx < blockedDates.length - 1 ? 1 : 0 }]}
            >
              <View>
                <Text style={[styles.blockedDate, { color: theme.text }]}>
                  {new Date(bd.date + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "short", month: "short", day: "numeric", year: "numeric",
                  })}
                </Text>
                {bd.reason ? (
                  <Text style={[styles.blockedReason, { color: theme.textSecondary }]}>{bd.reason}</Text>
                ) : null}
              </View>
              <Pressable onPress={() => removeBlockedDate(idx)} hitSlop={12}>
                <Feather name="x" size={16} color={theme.textSecondary} />
              </Pressable>
            </View>
          ))}
        </SectionCard>
      ) : (
        <SectionCard>
          <View style={styles.emptyBlocked}>
            <Feather name="calendar" size={20} color={theme.textSecondary} />
            <Text style={[styles.emptyBlockedText, { color: theme.textSecondary }]}>
              No blocked dates. Add dates when you're unavailable.
            </Text>
          </View>
        </SectionCard>
      )}

      <Pressable
        onPress={handleSave}
        disabled={saving}
        style={({ pressed }) => [
          styles.saveBtn,
          { backgroundColor: theme.primary, opacity: pressed || saving ? 0.7 : 1 },
        ]}
        testID="button-save-availability"
      >
        <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Availability"}</Text>
      </Pressable>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginBottom: -4,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  dayPill: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: { fontSize: 12, fontWeight: "700" },
  pickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  pickerLabel: { fontSize: 15 },
  pickerValue: { fontSize: 15, fontWeight: "600" },
  pickerDropdown: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  pickerOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
  },
  pickerOptionText: { fontSize: 15 },
  blockedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addBlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addBlockLabel: { fontSize: 15, fontWeight: "600" },
  blockedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  blockedDate: { fontSize: 15, fontWeight: "500" },
  blockedReason: { fontSize: 13, marginTop: 2 },
  emptyBlocked: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: Spacing.md,
  },
  emptyBlockedText: { fontSize: 14, flex: 1, lineHeight: 20 },
  saveBtn: {
    padding: 16,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
