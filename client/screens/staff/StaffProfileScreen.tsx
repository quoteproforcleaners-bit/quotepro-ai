import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";

async function staffFetch(path: string) {
  const token = await AsyncStorage.getItem("staff_token");
  const url = new URL(path, getApiUrl());
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load profile");
  return res.json();
}

interface Props {
  onSignOut: () => void;
}

export default function StaffProfileScreen({ onSignOut }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const { data: me } = useQuery({
    queryKey: ["staff-me"],
    queryFn: () => staffFetch("/api/staff/me"),
  });

  function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("staff_token");
          await AsyncStorage.removeItem("staff_profile");
          onSignOut();
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
      ]}
    >
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, { backgroundColor: "#10b981" }]}>
          <Text style={styles.avatarText}>
            {me?.name ? me.name.charAt(0).toUpperCase() : "?"}
          </Text>
        </View>
        <ThemedText type="title" style={styles.name}>{me?.name || "Cleaner"}</ThemedText>
        {me?.email ? (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>{me.email}</ThemedText>
        ) : null}
      </View>

      {/* Today stats */}
      <View style={[styles.statsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: theme.text }]}>{me?.todayJobCount ?? 0}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Jobs Today</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
        <View style={styles.stat}>
          <Feather name="check-circle" size={24} color="#10b981" />
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Verified</Text>
        </View>
      </View>

      {/* Sign out */}
      <Pressable
        testID="button-sign-out"
        style={({ pressed }) => [
          styles.signOutBtn,
          { backgroundColor: "#fee2e2", opacity: pressed ? 0.8 : 1 },
        ]}
        onPress={handleSignOut}
      >
        <Feather name="log-out" size={18} color="#ef4444" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.xl, alignItems: "center" },
  avatarWrap: { alignItems: "center", marginBottom: Spacing.xl },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
    marginBottom: Spacing.md,
  },
  avatarText: { fontSize: 36, fontWeight: "800", color: "#fff" },
  name: { fontSize: 24, fontWeight: "800" },
  statsCard: {
    flexDirection: "row", width: "100%",
    borderWidth: 1, borderRadius: BorderRadius.xl,
    padding: Spacing.lg, marginBottom: Spacing.xl,
  },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 28, fontWeight: "800" },
  statLabel: { fontSize: 12, fontWeight: "500" },
  divider: { width: 1, marginHorizontal: Spacing.md },
  signOutBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    width: "100%", height: 52, borderRadius: BorderRadius.lg,
    justifyContent: "center",
  },
  signOutText: { color: "#ef4444", fontSize: 16, fontWeight: "700" },
});
