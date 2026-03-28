import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  ActivityIndicator,
  Text,
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

const PURPLE = "#7C3AED";

const DEFAULT_KEYWORDS = [
  "house cleaner", "cleaning service", "maid service",
  "deep cleaning", "move out cleaning", "recurring cleaning",
];

const DEFAULT_SUBREDDITS = [
  "cleaningtips", "moving", "homeowners", "firsttimehomebuyer",
  "landlord", "airbnb", "PropertyManagement", "Tenant",
];

function TagInput({
  label,
  tags,
  onAddTag,
  onRemoveTag,
  placeholder,
  theme,
  hint,
}: {
  label: string;
  tags: string[];
  onAddTag: (val: string) => void;
  onRemoveTag: (val: string) => void;
  placeholder: string;
  theme: any;
  hint?: string;
}) {
  const [text, setText] = useState("");

  const commit = () => {
    const val = text.trim();
    if (!val) return;
    onAddTag(val);
    setText("");
  };

  return (
    <View style={tagStyles.wrap}>
      <Text style={[tagStyles.label, { color: theme.textSecondary }]}>{label}</Text>
      <View style={tagStyles.inputRow}>
        <TextInput
          style={[tagStyles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          onSubmitEditing={commit}
          returnKeyType="done"
          autoCorrect={false}
          autoCapitalize="none"
          blurOnSubmit={false}
        />
        <Pressable
          style={[tagStyles.addBtn, { backgroundColor: PURPLE }]}
          onPress={commit}
          testID={`button-add-${label.toLowerCase().replace(/\s/g, "-")}`}
        >
          <Feather name="plus" size={18} color="#fff" />
        </Pressable>
      </View>
      {hint ? (
        <Text style={[tagStyles.hint, { color: theme.textSecondary }]}>{hint}</Text>
      ) : null}
      <View style={tagStyles.tagList}>
        {tags.length === 0 ? (
          <Text style={[tagStyles.emptyHint, { color: theme.textSecondary }]}>
            Type above and tap + to add
          </Text>
        ) : tags.map((t) => (
          <Pressable
            key={t}
            style={[tagStyles.tag, { backgroundColor: PURPLE + "15", borderColor: PURPLE + "35" }]}
            onPress={() => onRemoveTag(t)}
          >
            <Text style={[tagStyles.tagText, { color: PURPLE }]}>{t}</Text>
            <Feather name="x" size={12} color={PURPLE} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function CityInput({
  cities,
  onAddCity,
  onRemoveCity,
  theme,
}: {
  cities: string[];
  onAddCity: (c: string) => void;
  onRemoveCity: (c: string) => void;
  theme: any;
}) {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiRequest("GET", `/api/geocode/city-suggestions?q=${encodeURIComponent(q)}`);
        const data: { display: string; city: string; state: string }[] = await res.json();
        const found = data.map((d) => d.display).filter((c) => c && !cities.includes(c));
        setSuggestions(found.slice(0, 5));
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  };

  const pick = (city: string) => {
    onAddCity(city);
    setText("");
    setSuggestions([]);
  };

  const commit = () => {
    const val = text.trim();
    if (!val) return;
    pick(val);
  };

  return (
    <View style={tagStyles.wrap}>
      <Text style={[tagStyles.label, { color: theme.textSecondary }]}>TARGET CITIES</Text>
      <View style={tagStyles.inputRow}>
        <TextInput
          style={[tagStyles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
          value={text}
          onChangeText={(t) => { setText(t); fetchSuggestions(t); }}
          placeholder="e.g. Austin, Chicago"
          placeholderTextColor={theme.textSecondary}
          onSubmitEditing={commit}
          returnKeyType="done"
          autoCorrect={false}
          blurOnSubmit={false}
        />
        <Pressable style={[tagStyles.addBtn, { backgroundColor: PURPLE }]} onPress={commit}>
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Feather name="plus" size={18} color="#fff" />}
        </Pressable>
      </View>
      {suggestions.length > 0 ? (
        <View style={[tagStyles.suggestionBox, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          {suggestions.map((s) => (
            <Pressable
              key={s}
              style={[tagStyles.suggestionRow, { borderBottomColor: theme.border }]}
              onPress={() => pick(s)}
            >
              <Feather name="map-pin" size={12} color={theme.textSecondary} />
              <Text style={[tagStyles.suggestionText, { color: theme.text }]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={tagStyles.tagList}>
        {cities.length === 0 ? (
          <Text style={[tagStyles.emptyHint, { color: theme.textSecondary }]}>
            Type a city and tap + or select a suggestion
          </Text>
        ) : cities.map((c) => (
          <Pressable
            key={c}
            style={[tagStyles.tag, { backgroundColor: PURPLE + "15", borderColor: PURPLE + "35" }]}
            onPress={() => onRemoveCity(c)}
          >
            <Text style={[tagStyles.tagText, { color: PURPLE }]}>{c}</Text>
            <Feather name="x" size={12} color={PURPLE} />
          </Pressable>
        ))}
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
    staleTime: Infinity,
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
    setTargetCities(Array.isArray(settings.targetCities) ? settings.targetCities : []);
    setTargetZips(Array.isArray(settings.targetZips) ? settings.targetZips : []);
    const kw = Array.isArray(settings.keywords) ? settings.keywords : [];
    setKeywords(kw.length > 0 ? kw : DEFAULT_KEYWORDS);
    const subs = Array.isArray(settings.subreddits) ? settings.subreddits : [];
    setSubreddits(subs.length > 0 ? subs : DEFAULT_SUBREDDITS);
  }, [settings]);

  const addCity = (c: string) => setTargetCities((prev) => prev.includes(c) ? prev : [...prev, c]);
  const removeCity = (c: string) => setTargetCities((prev) => prev.filter((x) => x !== c));

  const addZip = (z: string) => {
    const val = z.trim();
    if (!val) return;
    setTargetZips((prev) => prev.includes(val) ? prev : [...prev, val]);
  };
  const removeZip = (z: string) => setTargetZips((prev) => prev.filter((x) => x !== z));

  const addKeyword = (k: string) => {
    const val = k.trim().toLowerCase();
    if (!val) return;
    setKeywords((prev) => prev.includes(val) ? prev : [...prev, val]);
  };
  const removeKeyword = (k: string) => setKeywords((prev) => prev.filter((x) => x !== k));

  const addSubreddit = (s: string) => {
    const val = s.trim().replace(/^r\//i, "");
    if (!val) return;
    setSubreddits((prev) => prev.includes(val) ? prev : [...prev, val]);
  };
  const removeSubreddit = (s: string) => setSubreddits((prev) => prev.filter((x) => x !== s));

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
        <ActivityIndicator color={PURPLE} />
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
            trackColor={{ false: theme.border, true: PURPLE }}
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
            trackColor={{ false: theme.border, true: PURPLE }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Service Area</ThemedText>
        <CityInput cities={targetCities} onAddCity={addCity} onRemoveCity={removeCity} theme={theme} />
        <TagInput
          label="ZIP CODES"
          tags={targetZips}
          onAddTag={addZip}
          onRemoveTag={removeZip}
          placeholder="e.g. 78701"
          theme={theme}
        />
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>RADIUS (MILES)</Text>
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
        <ThemedText style={styles.sectionTitle}>Search Settings</ThemedText>
        <TagInput
          label="KEYWORDS TO TRACK"
          tags={keywords}
          onAddTag={addKeyword}
          onRemoveTag={removeKeyword}
          placeholder="e.g. house cleaner"
          theme={theme}
        />
        <TagInput
          label="SUBREDDITS"
          tags={subreddits}
          onAddTag={addSubreddit}
          onRemoveTag={removeSubreddit}
          placeholder="e.g. chicago (no r/)"
          theme={theme}
          hint='Add your city name (e.g. "chicago") to find local leads. r/ is stripped automatically.'
        />
      </Card>

      <Pressable
        style={[styles.saveBtn, { backgroundColor: PURPLE }]}
        onPress={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        testID="button-save-settings"
      >
        {saveMutation.isPending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Save Settings</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const tagStyles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  label: { fontSize: 11, fontWeight: "700", marginBottom: 8, letterSpacing: 0.6 },
  inputRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { fontSize: 11, marginBottom: 8, lineHeight: 15 },
  suggestionBox: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    marginBottom: 8,
    overflow: "hidden",
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionText: { fontSize: 14 },
  tagList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: { fontSize: 13, fontWeight: "600" },
  emptyHint: { fontSize: 12, fontStyle: "italic" },
});

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
  fieldGroup: { marginBottom: 4 },
  fieldLabel: { fontSize: 11, fontWeight: "700", marginBottom: 8, letterSpacing: 0.6 },
  textInput: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    width: 100,
  },
  saveBtn: {
    padding: 16,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
