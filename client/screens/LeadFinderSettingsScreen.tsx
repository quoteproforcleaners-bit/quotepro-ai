import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

const DEFAULT_KEYWORDS = [
  "house cleaner", "cleaning service", "maid service",
  "deep cleaning", "move out cleaning", "recurring cleaning",
];

const DEFAULT_SUBREDDITS = [
  "cleaningtips", "moving", "homeowners", "firsttimehomebuyer",
  "landlord", "airbnb", "PropertyManagement", "Tenant",
];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function CityTagEditor({
  values,
  onChange,
  theme,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  theme: any;
}) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debouncedInput = useDebounce(input, 350);

  useEffect(() => {
    if (debouncedInput.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(debouncedInput)}&format=json&limit=6&featuretype=city&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    )
      .then((r) => r.json())
      .then((data: any[]) => {
        const cities = data
          .filter((d) => d.address)
          .map((d) => {
            const city = d.address.city || d.address.town || d.address.village || d.name;
            const state = d.address.state_code || d.address.state || "";
            return city && state ? `${city}, ${state}` : city || d.display_name.split(",")[0];
          })
          .filter(Boolean)
          .filter((c: string) => !values.includes(c));
        const unique = [...new Set(cities)] as string[];
        setSuggestions(unique.slice(0, 5));
      })
      .catch(() => setSuggestions([]))
      .finally(() => setLoadingSuggestions(false));
  }, [debouncedInput]);

  const add = useCallback((city?: string) => {
    const val = (city ?? input).trim();
    if (!val || values.includes(val)) { setInput(""); setSuggestions([]); return; }
    onChange([...values, val]);
    setInput("");
    setSuggestions([]);
  }, [input, values, onChange]);

  const remove = useCallback((v: string) => {
    onChange(values.filter((x) => x !== v));
  }, [values, onChange]);

  return (
    <View style={styles.tagEditorWrap}>
      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>TARGET CITIES</ThemedText>
      <View style={styles.tagInputRow}>
        <TextInput
          style={[styles.tagInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
          value={input}
          onChangeText={setInput}
          placeholder="e.g. Austin"
          placeholderTextColor={theme.textSecondary}
          onSubmitEditing={() => add()}
          returnKeyType="done"
          autoCorrect={false}
        />
        <Pressable style={[styles.addTagBtn, { backgroundColor: theme.primary }]} onPress={() => add()}>
          {loadingSuggestions
            ? <ActivityIndicator size="small" color="#fff" />
            : <Feather name="plus" size={16} color="#fff" />}
        </Pressable>
      </View>
      {suggestions.length > 0 ? (
        <View style={[styles.suggestionBox, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          {suggestions.map((s) => (
            <Pressable
              key={s}
              style={[styles.suggestionItem, { borderBottomColor: theme.border }]}
              onPress={() => add(s)}
            >
              <Feather name="map-pin" size={12} color={theme.textSecondary} style={{ marginRight: 6 }} />
              <ThemedText style={[styles.suggestionText, { color: theme.text }]}>{s}</ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.tagList}>
        {values.map((v) => (
          <Pressable
            key={v}
            style={[styles.tag, { backgroundColor: theme.primary + "15", borderColor: theme.primary + "30" }]}
            onPress={() => remove(v)}
          >
            <ThemedText style={[styles.tagText, { color: theme.primary }]}>{v}</ThemedText>
            <Feather name="x" size={12} color={theme.primary} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function TagEditor({
  label,
  values,
  onChange,
  placeholder,
  theme,
  normalize = (s: string) => s.trim(),
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  theme: any;
  normalize?: (s: string) => string;
}) {
  const [input, setInput] = useState("");

  const add = useCallback(() => {
    const val = normalize(input);
    if (!val || values.includes(val)) { setInput(""); return; }
    onChange([...values, val]);
    setInput("");
  }, [input, values, onChange, normalize]);

  const remove = useCallback((v: string) => {
    onChange(values.filter((x) => x !== v));
  }, [values, onChange]);

  return (
    <View style={styles.tagEditorWrap}>
      <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
      <View style={styles.tagInputRow}>
        <TextInput
          style={[styles.tagInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
          value={input}
          onChangeText={setInput}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          onSubmitEditing={add}
          returnKeyType="done"
          autoCorrect={false}
          autoCapitalize="none"
        />
        <Pressable style={[styles.addTagBtn, { backgroundColor: theme.primary }]} onPress={add}>
          <Feather name="plus" size={16} color="#fff" />
        </Pressable>
      </View>
      <View style={styles.tagList}>
        {values.length > 0 ? values.map((v) => (
          <Pressable
            key={v}
            style={[styles.tag, { backgroundColor: theme.primary + "15", borderColor: theme.primary + "30" }]}
            onPress={() => remove(v)}
          >
            <ThemedText style={[styles.tagText, { color: theme.primary }]}>{v}</ThemedText>
            <Feather name="x" size={12} color={theme.primary} />
          </Pressable>
        )) : (
          <ThemedText style={[styles.emptyTags, { color: theme.textSecondary }]}>
            None added — tap + to add
          </ThemedText>
        )}
      </View>
    </View>
  );
}

export default function LeadFinderSettingsScreen() {
  const theme = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const initialized = useRef(false);

  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ["/api/lead-finder/settings"],
    queryFn: async () => {
      const res = await fetch("/api/lead-finder/settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const [enabled, setEnabled] = useState(true);
  const [notifyNewLeads, setNotifyNewLeads] = useState(true);
  const [radiusMiles, setRadiusMiles] = useState("25");
  const [targetCities, setTargetCities] = useState<string[]>([]);
  const [targetZips, setTargetZips] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS);
  const [subreddits, setSubreddits] = useState<string[]>(DEFAULT_SUBREDDITS);

  useEffect(() => {
    if (!settings || initialized.current) return;
    initialized.current = true;
    setEnabled(settings.enabled ?? true);
    setNotifyNewLeads(settings.notifyNewLeads ?? true);
    setRadiusMiles(String(settings.radiusMiles ?? 25));
    setTargetCities((settings.targetCities as string[]) ?? []);
    setTargetZips((settings.targetZips as string[]) ?? []);
    const kw = (settings.keywords as string[]) ?? [];
    setKeywords(kw.length > 0 ? kw : DEFAULT_KEYWORDS);
    const subs = (settings.subreddits as string[]) ?? [];
    setSubreddits(subs.length > 0 ? subs : DEFAULT_SUBREDDITS);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/lead-finder/settings", {
        enabled,
        notifyNewLeads,
        radiusMiles: Number(radiusMiles) || 25,
        targetCities,
        targetZips,
        keywords,
        subreddits,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/lead-finder/settings"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.background }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.md,
        paddingBottom: insets.bottom + Spacing["3xl"],
        paddingHorizontal: Spacing.md,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={styles.section}>
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <ThemedText style={styles.switchTitle}>Lead Finder Enabled</ThemedText>
            <ThemedText style={[styles.switchSub, { color: theme.textSecondary }]}>
              Automatically scan Reddit for new leads every hour
            </ThemedText>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#fff"
          />
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <ThemedText style={styles.switchTitle}>Push Notifications</ThemedText>
            <ThemedText style={[styles.switchSub, { color: theme.textSecondary }]}>
              Notify when new leads are found
            </ThemedText>
          </View>
          <Switch
            value={notifyNewLeads}
            onValueChange={setNotifyNewLeads}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Service Area</ThemedText>
        <CityTagEditor values={targetCities} onChange={setTargetCities} theme={theme} />
        <TagEditor
          label="ZIP CODES"
          values={targetZips}
          onChange={setTargetZips}
          placeholder="e.g. 78701"
          theme={theme}
          normalize={(s) => s.trim()}
        />
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>RADIUS (MILES)</ThemedText>
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
            value={radiusMiles}
            onChangeText={setRadiusMiles}
            keyboardType="number-pad"
            placeholder="25"
            placeholderTextColor={theme.textSecondary}
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>Search Settings</ThemedText>
        <TagEditor
          label="KEYWORDS TO TRACK"
          values={keywords}
          onChange={setKeywords}
          placeholder="e.g. house cleaner"
          theme={theme}
          normalize={(s) => s.trim().toLowerCase()}
        />
        <TagEditor
          label="SUBREDDITS"
          values={subreddits}
          onChange={setSubreddits}
          placeholder="e.g. chicago (no r/)"
          theme={theme}
          normalize={(s) => s.trim().replace(/^r\//i, "")}
        />
        <View style={[styles.subredditTip, { backgroundColor: theme.primary + "0D", borderColor: theme.primary + "25" }]}>
          <Feather name="info" size={13} color={theme.primary} style={{ marginTop: 1 }} />
          <ThemedText style={[styles.subredditTipText, { color: theme.textSecondary }]}>
            <ThemedText style={{ color: theme.primary, fontWeight: "700" }}>How it works: </ThemedText>
            QuotePro scans Reddit for posts matching your keywords inside these subreddits. Local city subreddits (e.g. "chicago", "Austin") are great sources. Airbnb hosts, landlords, and homeowners frequently post cleaning requests.
          </ThemedText>
        </View>
      </Card>

      <Pressable
        style={[styles.saveBtn, { backgroundColor: theme.primary }]}
        onPress={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <ThemedText style={styles.saveBtnText}>Save Settings</ThemedText>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },
  section: { marginBottom: Spacing.md, padding: Spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 16 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  switchLabel: { flex: 1 },
  switchTitle: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  switchSub: { fontSize: 12, lineHeight: 17 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  tagEditorWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6, letterSpacing: 0.5 },
  tagInputRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  addTagBtn: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    marginTop: -4,
    marginBottom: 8,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionText: { fontSize: 14 },
  tagList: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: { fontSize: 13, fontWeight: "600" },
  emptyTags: { fontSize: 12, fontStyle: "italic" },
  fieldGroup: { marginBottom: 4 },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    width: 100,
  },
  subredditTip: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    padding: 10,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  subredditTipText: { flex: 1, fontSize: 12, lineHeight: 17 },
  saveBtn: {
    padding: 16,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
