import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  ActivityIndicator,
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

const DEFAULT_SUBREDDITS = ["cleaningtips", "moving", "homeowners"];

function TagEditor({
  label,
  values,
  onChange,
  placeholder,
  theme,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  theme: any;
}) {
  const [input, setInput] = useState("");

  const add = useCallback(() => {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed || values.includes(trimmed)) { setInput(""); return; }
    onChange([...values, trimmed]);
    setInput("");
  }, [input, values, onChange]);

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
        />
        <Pressable style={[styles.addTagBtn, { backgroundColor: theme.primary }]} onPress={add}>
          <Feather name="plus" size={16} color="#fff" />
        </Pressable>
      </View>
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

export default function LeadFinderSettingsScreen() {
  const theme = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const qc = useQueryClient();

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
    if (!settings) return;
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
        <TagEditor
          label="Target Cities"
          values={targetCities}
          onChange={setTargetCities}
          placeholder="e.g. Austin, Dallas"
          theme={theme}
        />
        <TagEditor
          label="ZIP Codes"
          values={targetZips}
          onChange={setTargetZips}
          placeholder="e.g. 78701"
          theme={theme}
        />
        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>Radius (miles)</ThemedText>
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
          label="Keywords to Track"
          values={keywords}
          onChange={setKeywords}
          placeholder="e.g. house cleaner"
          theme={theme}
        />
        <TagEditor
          label="Subreddits"
          values={subreddits}
          onChange={setSubreddits}
          placeholder="e.g. chicago (no r/)"
          theme={theme}
        />
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
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  tagInputRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  addTagBtn: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  tagList: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: { fontSize: 12, fontWeight: "600" },
  fieldGroup: { marginBottom: 4 },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
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
