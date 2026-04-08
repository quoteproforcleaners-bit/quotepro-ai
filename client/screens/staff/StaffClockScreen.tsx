import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// @ts-ignore — expo-location installed via Expo Go native module
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

async function staffFetch(method: string, path: string, body?: any) {
  const token = await AsyncStorage.getItem("staff_token");
  const url = new URL(path, getApiUrl());
  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatTime(dt: string | null | undefined): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

interface ClockStatus {
  clockedIn: boolean;
  clockInTime: string | null;
  totalMinutesToday: number;
}

export default function StaffClockScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const qc = useQueryClient();

  const [elapsed, setElapsed] = useState(0);

  const { data: status, isLoading } = useQuery<ClockStatus>({
    queryKey: ["staff-clock-status"],
    queryFn: () => staffFetch("GET", "/api/staff/clock-status"),
    refetchInterval: 30000,
  });

  // Live elapsed timer when clocked in
  useEffect(() => {
    if (!status?.clockedIn || !status.clockInTime) {
      setElapsed(0);
      return;
    }
    const start = new Date(status.clockInTime).getTime();
    const tick = () => setElapsed(Math.round((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [status?.clockedIn, status?.clockInTime]);

  async function getGps(): Promise<{ latitude: number; longitude: number } | undefined> {
    try {
      const [perm] = await Promise.all([Location.requestForegroundPermissionsAsync()]);
      if (!perm.granted) return undefined;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    } catch {
      return undefined;
    }
  }

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const gps = await getGps();
      return staffFetch("POST", "/api/staff/clock-in", gps);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-clock-status"] }),
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const gps = await getGps();
      return staffFetch("POST", "/api/staff/clock-out", gps);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff-clock-status"] }),
  });

  const isMutating = clockInMutation.isPending || clockOutMutation.isPending;
  const clockedIn = status?.clockedIn ?? false;
  const totalMin = (status?.totalMinutesToday ?? 0) + (clockedIn ? elapsed / 60 : 0);

  const btnColor = clockedIn ? "#ef4444" : "#10b981";
  const btnLabel = clockedIn ? "Clock Out" : "Clock In";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.content, { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}>

        {/* Status card */}
        <View style={[styles.statusCard, { backgroundColor: clockedIn ? "#10b98115" : theme.card, borderColor: clockedIn ? "#10b98140" : theme.cardBorder }]}>
          <View style={[styles.statusDot, { backgroundColor: clockedIn ? "#10b981" : "#9ca3af" }]} />
          <Text style={[styles.statusText, { color: clockedIn ? "#10b981" : theme.textSecondary }]}>
            {clockedIn ? "Currently Clocked In" : "Not Clocked In"}
          </Text>
          {clockedIn && status?.clockInTime ? (
            <Text style={[styles.clockInTime, { color: theme.textSecondary }]}>
              Since {formatTime(status.clockInTime)}
            </Text>
          ) : null}
        </View>

        {/* Hours display */}
        <View style={styles.hoursDisplay}>
          <Text style={[styles.hoursLabel, { color: theme.textSecondary }]}>Today's Total Hours</Text>
          <Text style={[styles.hoursValue, { color: theme.text }]}>
            {isLoading ? "—" : formatDuration(Math.max(0, totalMin))}
          </Text>
          {clockedIn && elapsed > 0 && (
            <View style={styles.timerBadge}>
              <Feather name="clock" size={12} color="#10b981" />
              <Text style={styles.timerText}>{formatDuration(elapsed / 60)} this session</Text>
            </View>
          )}
        </View>

        {/* Big clock button */}
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.primary} />
        ) : (
          <Pressable
            testID={clockedIn ? "button-clock-out" : "button-clock-in"}
            style={({ pressed }) => [
              styles.clockBtn,
              { backgroundColor: btnColor, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => clockedIn ? clockOutMutation.mutate() : clockInMutation.mutate()}
            disabled={isMutating}
          >
            {isMutating ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <>
                <Feather name={clockedIn ? "log-out" : "log-in"} size={32} color="#fff" />
                <Text style={styles.clockBtnText}>{btnLabel}</Text>
              </>
            )}
          </Pressable>
        )}

        {clockInMutation.isError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{(clockInMutation.error as any)?.message}</Text>
          </View>
        )}
        {clockOutMutation.isError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{(clockOutMutation.error as any)?.message}</Text>
          </View>
        )}

        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          {Platform.OS !== "web"
            ? "GPS location is recorded automatically on clock in/out"
            : "Location capture available on mobile devices"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: Spacing.xl, gap: Spacing.lg,
  },
  statusCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    alignSelf: "stretch",
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 15, fontWeight: "600", flex: 1 },
  clockInTime: { fontSize: 13 },
  hoursDisplay: { alignItems: "center" },
  hoursLabel: { fontSize: 14, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5 },
  hoursValue: { fontSize: 56, fontWeight: "800", lineHeight: 64, marginTop: 4 },
  timerBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#10b98115", borderRadius: BorderRadius.full,
    paddingHorizontal: 10, paddingVertical: 4, marginTop: 4,
  },
  timerText: { color: "#10b981", fontSize: 12, fontWeight: "600" },
  clockBtn: {
    width: 160, height: 160, borderRadius: 80,
    alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
  clockBtnText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  errorBox: {
    backgroundColor: "#fee2e2", borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    alignSelf: "stretch",
  },
  errorText: { color: "#ef4444", fontSize: 13, textAlign: "center" },
  hint: { fontSize: 12, textAlign: "center" },
});
