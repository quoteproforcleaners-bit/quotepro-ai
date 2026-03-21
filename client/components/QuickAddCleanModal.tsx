import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Modal,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QuickAddQuotePrefill {
  id: string;
  customerName: string;
  customerId: string | null;
  address: string;
  total: number | null;
  jobType: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

const SERVICE_TYPES = [
  { value: "regular", label: "Regular Clean" },
  { value: "deep-clean", label: "Deep Clean" },
  { value: "move-in", label: "Move-In Clean" },
  { value: "move-out", label: "Move-Out Clean" },
  { value: "post-construction", label: "Post-Construction" },
];

type PriceSource = "quote" | "previous" | "custom";
type CustomerMode = "existing" | "new";

// ─── Debounce hook ───────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Team Member Chip ────────────────────────────────────────────────────────

function TeamChip({ name, onRemove }: { name: string; onRemove: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={[chipStyles.chip, { backgroundColor: `${theme.primary}18`, borderColor: `${theme.primary}40` }]}>
      <ThemedText style={[chipStyles.label, { color: theme.primary }]}>{name}</ThemedText>
      <Pressable onPress={onRemove} hitSlop={8} style={chipStyles.remove}>
        <Feather name="x" size={12} color={theme.primary} />
      </Pressable>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  label: { fontSize: 13, fontWeight: "600" },
  remove: { marginLeft: 2 },
});

// ─── Main Component ──────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
  prefilledDate?: Date;
  quotePrefill?: QuickAddQuotePrefill;
}

export function QuickAddCleanModal({ visible, onClose, prefilledDate, quotePrefill }: Props) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  // ── Customer mode ───────────────────────────────────────────────────────
  const [mode, setMode] = useState<CustomerMode>(quotePrefill ? "existing" : "existing");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // New customer fields
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  // ── Pricing ─────────────────────────────────────────────────────────────
  const [price, setPrice] = useState(quotePrefill?.total != null ? String(quotePrefill.total) : "");
  const [priceSource, setPriceSource] = useState<PriceSource>(quotePrefill ? "quote" : "custom");

  // ── Service ─────────────────────────────────────────────────────────────
  const [serviceType, setServiceType] = useState(quotePrefill?.jobType || "regular");

  // ── Schedule ────────────────────────────────────────────────────────────
  const [date, setDate] = useState<Date>(() => {
    const d = prefilledDate ? new Date(prefilledDate) : new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState<"1.5" | "2" | "3" | "4">("3");

  // ── Team ─────────────────────────────────────────────────────────────────
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [teamInput, setTeamInput] = useState("");

  // ── Notes ────────────────────────────────────────────────────────────────
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const debouncedSearch = useDebounce(searchQuery, 300);

  // ── Reset on open ────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      setMode("existing");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedCustomer(null);
      setNewFirst(""); setNewLast(""); setNewAddress(""); setNewPhone(""); setNewEmail("");
      setPrice(quotePrefill?.total != null ? String(quotePrefill.total) : "");
      setPriceSource(quotePrefill ? "quote" : "custom");
      setServiceType(quotePrefill?.jobType || "regular");
      const d = prefilledDate ? new Date(prefilledDate) : new Date();
      d.setHours(9, 0, 0, 0);
      setDate(d);
      setDuration("3");
      setTeamMembers([]);
      setTeamInput("");
      setNotes("");
      setError("");
      setShowDatePicker(false);
      setShowTimePicker(false);
    }
  }, [visible]);

  // ── Customer search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "existing" || !debouncedSearch.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    const url = new URL("/api/customers", getApiUrl());
    url.searchParams.set("search", debouncedSearch.trim());
    fetch(url.toString(), { credentials: "include" })
      .then((r) => r.json())
      .then((data: Customer[]) => {
        setSearchResults(Array.isArray(data) ? data.slice(0, 6) : []);
      })
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
  }, [debouncedSearch, mode]);

  // ── Select existing customer ─────────────────────────────────────────────
  const selectCustomer = useCallback(async (c: Customer) => {
    setSelectedCustomer(c);
    setSearchQuery(`${c.firstName} ${c.lastName}`);
    setSearchResults([]);

    // Fetch last job for price prefill
    try {
      const url = new URL(`/api/customers/${c.id}/last-job`, getApiUrl());
      const res = await fetch(url.toString(), { credentials: "include" });
      const lastJob = await res.json();
      if (lastJob?.total != null) {
        setPrice(String(lastJob.total));
        setPriceSource("previous");
        if (lastJob.jobType) setServiceType(lastJob.jobType);
      } else {
        setPriceSource("custom");
      }
    } catch {
      setPriceSource("custom");
    }
  }, []);

  // ── Add team member ──────────────────────────────────────────────────────
  const addTeamMember = useCallback(() => {
    const name = teamInput.trim();
    if (name && !teamMembers.includes(name)) {
      setTeamMembers((prev) => [...prev, name]);
    }
    setTeamInput("");
  }, [teamInput, teamMembers]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = new URL("/api/jobs", getApiUrl());
      return apiRequest("POST", url.toString(), payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes/unscheduled-accepted"] });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onClose();
    },
    onError: (e: any) => {
      setError(e?.message || "Failed to save clean");
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = new URL("/api/customers", getApiUrl());
      return apiRequest("POST", url.toString(), data);
    },
  });

  const handleSave = useCallback(async () => {
    setError("");

    let customerId: string | null = null;
    let address = "";

    if (mode === "existing") {
      if (!selectedCustomer && !quotePrefill) {
        setError("Please search and select a customer.");
        return;
      }
      customerId = selectedCustomer?.id || quotePrefill?.customerId || null;
      address = selectedCustomer?.address || quotePrefill?.address || "";
    } else {
      if (!newFirst.trim() || !newLast.trim()) {
        setError("First and last name are required.");
        return;
      }
      try {
        const cust = await createCustomerMutation.mutateAsync({
          firstName: newFirst.trim(),
          lastName: newLast.trim(),
          address: newAddress.trim(),
          phone: newPhone.trim(),
          email: newEmail.trim(),
        });
        customerId = cust.id;
        address = newAddress.trim();
      } catch (e: any) {
        setError(e?.message || "Failed to create customer");
        return;
      }
    }

    if (!price.trim() || isNaN(Number(price))) {
      setError("Please enter a valid price.");
      return;
    }

    const startDt = new Date(date);
    const endDt = new Date(date);
    endDt.setHours(endDt.getHours() + parseFloat(duration));

    saveMutation.mutate({
      customerId,
      quoteId: quotePrefill?.id || null,
      jobType: serviceType,
      status: "scheduled",
      startDatetime: startDt.toISOString(),
      endDatetime: endDt.toISOString(),
      address,
      total: Number(price),
      internalNotes: notes,
      teamMembers,
    });
  }, [
    mode, selectedCustomer, quotePrefill, newFirst, newLast, newAddress, newPhone, newEmail,
    price, serviceType, date, duration, teamMembers, notes,
  ]);

  const priceSourceLabel: Record<PriceSource, string> = {
    quote: "From accepted quote",
    previous: "From previous clean",
    custom: "Custom price",
  };

  const dateStr = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[s.sheet, { backgroundColor: theme.backgroundDefault }]}>
          {/* Handle */}
          <View style={[s.handle, { backgroundColor: theme.border }]} />

          {/* Header */}
          <View style={[s.header, { backgroundColor: theme.primary }]}>
            <View style={{ flex: 1 }}>
              <ThemedText style={s.headerTitle}>Quick Add Clean</ThemedText>
              {quotePrefill ? (
                <ThemedText style={s.headerSub}>{quotePrefill.customerName}</ThemedText>
              ) : null}
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={22} color="rgba(255,255,255,0.8)" />
            </Pressable>
          </View>

          <ScrollView style={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* ── Customer Section ── */}
            {!quotePrefill ? (
              <View style={s.section}>
                <ThemedText style={[s.sectionLabel, { color: theme.textSecondary }]}>Customer</ThemedText>

                {/* Mode toggle */}
                <View style={[s.toggle, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  {(["existing", "new"] as CustomerMode[]).map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => { setMode(m); setSelectedCustomer(null); setSearchQuery(""); setSearchResults([]); setPriceSource("custom"); setPrice(""); }}
                      style={[s.toggleBtn, mode === m && { backgroundColor: theme.primary }]}
                    >
                      <ThemedText style={[s.toggleBtnText, mode === m && { color: "#fff" }]}>
                        {m === "existing" ? "Existing Customer" : "New Customer"}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>

                {mode === "existing" ? (
                  <View>
                    {/* Search input */}
                    <View style={[s.searchRow, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}>
                      <Feather name="search" size={16} color={theme.textSecondary} />
                      <TextInput
                        style={[s.searchInput, { color: theme.text }]}
                        placeholder="Search by name, email, or phone…"
                        placeholderTextColor={theme.textMuted}
                        value={searchQuery}
                        onChangeText={(t) => { setSearchQuery(t); if (!t) setSelectedCustomer(null); }}
                        autoCorrect={false}
                        autoCapitalize="none"
                        testID="input-customer-search"
                      />
                      {searchLoading ? <ActivityIndicator size="small" color={theme.primary} /> : null}
                      {selectedCustomer ? <Feather name="check-circle" size={16} color={theme.success} /> : null}
                    </View>

                    {/* Dropdown results */}
                    {searchResults.length > 0 ? (
                      <View style={[s.dropdown, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                        {searchResults.map((c) => (
                          <Pressable
                            key={c.id}
                            onPress={() => selectCustomer(c)}
                            style={[s.dropdownItem, { borderBottomColor: theme.border }]}
                          >
                            <ThemedText style={s.dropdownName}>{c.firstName} {c.lastName}</ThemedText>
                            {c.address ? (
                              <ThemedText style={[s.dropdownSub, { color: theme.textSecondary }]} numberOfLines={1}>{c.address}</ThemedText>
                            ) : null}
                          </Pressable>
                        ))}
                      </View>
                    ) : null}

                    {/* Selected customer card */}
                    {selectedCustomer ? (
                      <View style={[s.customerCard, { backgroundColor: `${theme.success}10`, borderColor: `${theme.success}30` }]}>
                        <Feather name="user" size={14} color={theme.success} />
                        <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                          <ThemedText style={{ fontWeight: "700", fontSize: 14 }}>{selectedCustomer.firstName} {selectedCustomer.lastName}</ThemedText>
                          {selectedCustomer.address ? (
                            <ThemedText style={{ fontSize: 12, color: theme.textSecondary, marginTop: 1 }}>{selectedCustomer.address}</ThemedText>
                          ) : null}
                          {selectedCustomer.phone ? (
                            <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>{selectedCustomer.phone}</ThemedText>
                          ) : null}
                        </View>
                        <Pressable onPress={() => { setSelectedCustomer(null); setSearchQuery(""); setPriceSource("custom"); setPrice(""); }} hitSlop={8}>
                          <Feather name="x" size={14} color={theme.textSecondary} />
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  /* New customer form */
                  <View style={s.newCustomerForm}>
                    <View style={s.nameRow}>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={[s.inputLabel, { color: theme.textSecondary }]}>First Name *</ThemedText>
                        <TextInput
                          style={[s.input, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                          value={newFirst}
                          onChangeText={setNewFirst}
                          placeholder="Jane"
                          placeholderTextColor={theme.textMuted}
                          testID="input-new-first"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={[s.inputLabel, { color: theme.textSecondary }]}>Last Name *</ThemedText>
                        <TextInput
                          style={[s.input, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                          value={newLast}
                          onChangeText={setNewLast}
                          placeholder="Smith"
                          placeholderTextColor={theme.textMuted}
                          testID="input-new-last"
                        />
                      </View>
                    </View>
                    <ThemedText style={[s.inputLabel, { color: theme.textSecondary }]}>Address</ThemedText>
                    <TextInput
                      style={[s.input, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                      value={newAddress}
                      onChangeText={setNewAddress}
                      placeholder="123 Main St, City, ST"
                      placeholderTextColor={theme.textMuted}
                      testID="input-new-address"
                    />
                    <View style={s.nameRow}>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={[s.inputLabel, { color: theme.textSecondary }]}>Phone</ThemedText>
                        <TextInput
                          style={[s.input, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                          value={newPhone}
                          onChangeText={setNewPhone}
                          placeholder="(555) 000-0000"
                          placeholderTextColor={theme.textMuted}
                          keyboardType="phone-pad"
                          testID="input-new-phone"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={[s.inputLabel, { color: theme.textSecondary }]}>Email</ThemedText>
                        <TextInput
                          style={[s.input, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                          value={newEmail}
                          onChangeText={setNewEmail}
                          placeholder="jane@email.com"
                          placeholderTextColor={theme.textMuted}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          testID="input-new-email"
                        />
                      </View>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              /* Quote prefill banner */
              <View style={[s.quoteBanner, { backgroundColor: `${theme.primary}10`, borderColor: `${theme.primary}30` }]}>
                <Feather name="check-circle" size={16} color={theme.primary} />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <ThemedText style={{ fontWeight: "700", fontSize: 14, color: theme.primary }}>{quotePrefill!.customerName}</ThemedText>
                  {quotePrefill!.address ? (
                    <ThemedText style={{ fontSize: 12, color: theme.textSecondary, marginTop: 1 }}>{quotePrefill!.address}</ThemedText>
                  ) : null}
                </View>
              </View>
            )}

            {/* ── Service Type ── */}
            <View style={s.section}>
              <ThemedText style={[s.sectionLabel, { color: theme.textSecondary }]}>Service Type</ThemedText>
              <View style={s.serviceGrid}>
                {SERVICE_TYPES.map((st) => (
                  <Pressable
                    key={st.value}
                    onPress={() => setServiceType(st.value)}
                    style={[
                      s.serviceBtn,
                      { borderColor: serviceType === st.value ? theme.primary : theme.border, backgroundColor: serviceType === st.value ? `${theme.primary}12` : theme.backgroundSecondary },
                    ]}
                    testID={`service-type-${st.value}`}
                  >
                    <ThemedText style={[s.serviceBtnText, { color: serviceType === st.value ? theme.primary : theme.text }]} numberOfLines={1}>
                      {st.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* ── Price ── */}
            <View style={s.section}>
              <View style={s.priceLabelRow}>
                <ThemedText style={[s.sectionLabel, { color: theme.textSecondary }]}>Price</ThemedText>
                <View style={[s.priceSourceBadge, { backgroundColor: priceSource === "quote" ? `${theme.primary}18` : priceSource === "previous" ? `${theme.success}18` : `${theme.border}50` }]}>
                  <ThemedText style={[s.priceSourceText, { color: priceSource === "quote" ? theme.primary : priceSource === "previous" ? theme.success : theme.textSecondary }]}>
                    {priceSourceLabel[priceSource]}
                  </ThemedText>
                </View>
              </View>
              <View style={[s.priceRow, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText style={[s.priceCurrency, { color: theme.textSecondary }]}>$</ThemedText>
                <TextInput
                  style={[s.priceInput, { color: theme.text }]}
                  value={price}
                  onChangeText={(t) => { setPrice(t); setPriceSource("custom"); }}
                  placeholder="0"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="decimal-pad"
                  testID="input-price"
                />
              </View>
            </View>

            {/* ── Date & Time ── */}
            <View style={s.section}>
              <ThemedText style={[s.sectionLabel, { color: theme.textSecondary }]}>Date & Time</ThemedText>
              <View style={s.dtRow}>
                <Pressable
                  onPress={() => { setShowDatePicker(true); setShowTimePicker(false); }}
                  style={[s.dtField, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
                  testID="btn-pick-date"
                >
                  <Feather name="calendar" size={14} color={theme.textSecondary} />
                  <View style={{ marginLeft: 6 }}>
                    <ThemedText style={[s.dtLabel, { color: theme.textSecondary }]}>Date</ThemedText>
                    <ThemedText style={s.dtValue}>{dateStr}</ThemedText>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => { setShowTimePicker(true); setShowDatePicker(false); }}
                  style={[s.dtField, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
                  testID="btn-pick-time"
                >
                  <Feather name="clock" size={14} color={theme.textSecondary} />
                  <View style={{ marginLeft: 6 }}>
                    <ThemedText style={[s.dtLabel, { color: theme.textSecondary }]}>Arrival</ThemedText>
                    <ThemedText style={s.dtValue}>{timeStr}</ThemedText>
                  </View>
                </Pressable>
              </View>

              {showDatePicker || showTimePicker ? (
                <View style={{ alignItems: "center", marginTop: Spacing.sm }}>
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
                      style={{ marginTop: Spacing.xs }}
                    >
                      Done
                    </Button>
                  ) : null}
                </View>
              ) : null}

              {/* Duration */}
              <ThemedText style={[s.durationLabel, { color: theme.textSecondary }]}>Duration</ThemedText>
              <View style={s.durRow}>
                {(["1.5", "2", "3", "4"] as const).map((h) => (
                  <Pressable
                    key={h}
                    onPress={() => setDuration(h)}
                    style={[s.durBtn, { borderColor: duration === h ? theme.primary : theme.border, backgroundColor: duration === h ? theme.primary : theme.backgroundSecondary }]}
                    testID={`btn-duration-${h}`}
                  >
                    <ThemedText style={[s.durBtnText, { color: duration === h ? "#fff" : theme.text }]}>{h}h</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* ── Team Members ── */}
            <View style={s.section}>
              <ThemedText style={[s.sectionLabel, { color: theme.textSecondary }]}>Team Members</ThemedText>
              {teamMembers.length > 0 ? (
                <View style={s.chipRow}>
                  {teamMembers.map((m) => (
                    <TeamChip key={m} name={m} onRemove={() => setTeamMembers((prev) => prev.filter((x) => x !== m))} />
                  ))}
                </View>
              ) : null}
              <View style={[s.teamInputRow, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="users" size={15} color={theme.textSecondary} />
                <TextInput
                  style={[s.teamInput, { color: theme.text }]}
                  placeholder="Add team member name…"
                  placeholderTextColor={theme.textMuted}
                  value={teamInput}
                  onChangeText={setTeamInput}
                  onSubmitEditing={addTeamMember}
                  returnKeyType="done"
                  blurOnSubmit={false}
                  testID="input-team-member"
                />
                {teamInput.trim() ? (
                  <Pressable onPress={addTeamMember} style={[s.addTeamBtn, { backgroundColor: theme.primary }]} hitSlop={8} testID="btn-add-team-member">
                    <Feather name="plus" size={14} color="#fff" />
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* ── Notes ── */}
            <View style={s.section}>
              <ThemedText style={[s.sectionLabel, { color: theme.textSecondary }]}>Internal Notes</ThemedText>
              <TextInput
                style={[s.notesInput, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Special instructions, access codes, etc."
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                testID="input-notes"
              />
            </View>

            {/* Error */}
            {error ? (
              <View style={[s.errorBox, { backgroundColor: "#fee2e2", borderColor: "#fca5a5" }]}>
                <Feather name="alert-circle" size={14} color="#dc2626" />
                <ThemedText style={s.errorText}>{error}</ThemedText>
              </View>
            ) : null}

            {/* Save */}
            <Button
              onPress={handleSave}
              loading={saveMutation.isPending || createCustomerMutation.isPending}
              style={{ marginHorizontal: Spacing.md, marginBottom: Spacing.xl }}
              testID="btn-save-quick-add"
            >
              Save & Schedule Clean
            </Button>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    overflow: "hidden",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 },

  body: { flex: 1 },

  section: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  sectionLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },

  // Toggle
  toggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  toggleBtnText: { fontSize: 13, fontWeight: "600" },

  // Search
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },

  // Dropdown
  dropdown: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  dropdownItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownName: { fontSize: 14, fontWeight: "600" },
  dropdownSub: { fontSize: 12, marginTop: 1 },

  // Customer card
  customerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: 4,
  },

  // Quote banner
  quoteBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },

  // New customer form
  newCustomerForm: { gap: Spacing.xs },
  nameRow: { flexDirection: "row", gap: Spacing.sm },
  inputLabel: { fontSize: 11, fontWeight: "600", marginBottom: 3 },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
  },

  // Service grid
  serviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  serviceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  serviceBtnText: { fontSize: 13, fontWeight: "600" },

  // Price
  priceLabelRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  priceSourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  priceSourceText: { fontSize: 11, fontWeight: "600" },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  priceCurrency: { fontSize: 18, fontWeight: "700", paddingVertical: 10 },
  priceInput: { flex: 1, fontSize: 22, fontWeight: "800", paddingLeft: 4, paddingVertical: 10 },

  // Date/time
  dtRow: { flexDirection: "row", gap: Spacing.sm },
  dtField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  dtLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  dtValue: { fontSize: 13, fontWeight: "700", marginTop: 1 },

  durationLabel: { fontSize: 12, fontWeight: "600", marginTop: Spacing.xs },
  durRow: { flexDirection: "row", gap: Spacing.xs },
  durBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  durBtnText: { fontSize: 13, fontWeight: "700" },

  // Team
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  teamInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  teamInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  addTeamBtn: { borderRadius: BorderRadius.full, padding: 4 },

  // Notes
  notesInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    minHeight: 72,
  },

  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  errorText: { flex: 1, fontSize: 13, color: "#dc2626" },
});
