import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { getApiUrl } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";

const PIN_LENGTH = 4;

interface Props {
  onAuthSuccess: (token: string, staff: any) => void;
}

export default function StaffLoginScreen({ onAuthSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [businessId, setBusinessId] = useState("");
  const [pin, setPin] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"business" | "pin">("business");

  function addDigit(digit: string) {
    if (pin.length >= PIN_LENGTH) return;
    const next = [...pin, digit];
    setPin(next);
    if (next.length === PIN_LENGTH) {
      handleLogin(next.join(""));
    }
  }

  function removeDigit() {
    setPin(prev => prev.slice(0, -1));
    setError("");
  }

  async function handleLogin(fullPin: string) {
    if (!businessId.trim()) {
      setError("Please enter your business ID");
      setStep("business");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const url = new URL("/api/staff/auth", getApiUrl());
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: businessId.trim(), pin: fullPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      await AsyncStorage.setItem("staff_token", data.token);
      await AsyncStorage.setItem("staff_profile", JSON.stringify(data.staff));
      onAuthSuccess(data.token, data.staff);
    } catch (err: any) {
      setError(err.message || "Invalid PIN. Try again.");
      setPin([]);
    } finally {
      setLoading(false);
    }
  }

  const Pad = () => {
    const digits = [
      ["1","2","3"],
      ["4","5","6"],
      ["7","8","9"],
      ["","0","⌫"],
    ];
    return (
      <View style={styles.pad}>
        {digits.map((row, ri) => (
          <View key={ri} style={styles.padRow}>
            {row.map((d, di) => {
              if (d === "") return <View key={di} style={styles.padEmpty} />;
              const isBack = d === "⌫";
              return (
                <Pressable
                  key={di}
                  testID={`pin-digit-${d}`}
                  style={({ pressed }) => [
                    styles.padKey,
                    { backgroundColor: pressed ? theme.cardBorder : theme.card },
                    isBack && { backgroundColor: "transparent" },
                  ]}
                  onPress={() => isBack ? removeDigit() : addDigit(d)}
                  disabled={loading}
                >
                  <Text style={[styles.padKeyText, { color: theme.text }]}>
                    {d}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior="padding"
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Icon + title */}
        <View style={styles.header}>
          <View style={[styles.iconBg, { backgroundColor: "#10b981" }]}>
            <Feather name="briefcase" size={28} color="#fff" />
          </View>
          <ThemedText type="title" style={styles.title}>Cleaner Sign In</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
            Enter your Business ID and 4-digit PIN to access your jobs
          </ThemedText>
        </View>

        {/* Business ID */}
        {step === "business" && (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.label}>Business ID</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.cardBorder, color: theme.text, backgroundColor: theme.card }]}
              placeholder="e.g. abc123-xyz"
              placeholderTextColor={theme.textSecondary}
              value={businessId}
              onChangeText={t => { setBusinessId(t); setError(""); }}
              autoCapitalize="none"
              autoCorrect={false}
              testID="input-business-id"
            />
            <Pressable
              testID="button-next"
              style={[styles.nextBtn, { backgroundColor: theme.primary }]}
              onPress={() => {
                if (!businessId.trim()) { setError("Please enter your Business ID"); return; }
                setStep("pin");
                setError("");
              }}
            >
              <Text style={styles.nextBtnText}>Continue</Text>
            </Pressable>
          </View>
        )}

        {/* PIN pad */}
        {step === "pin" && (
          <View style={styles.section}>
            <Pressable onPress={() => { setStep("business"); setPin([]); setError(""); }} style={styles.back}>
              <Feather name="arrow-left" size={16} color={theme.textSecondary} />
              <Text style={[styles.backText, { color: theme.textSecondary }]}>{businessId}</Text>
            </Pressable>

            <ThemedText type="defaultSemiBold" style={styles.label}>Enter your 4-digit PIN</ThemedText>

            {/* PIN dots */}
            <View style={styles.dots}>
              {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { borderColor: theme.cardBorder },
                    i < pin.length && { backgroundColor: "#10b981", borderColor: "#10b981" },
                  ]}
                />
              ))}
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#10b981" style={{ marginVertical: Spacing.lg }} />
            ) : (
              <Pad />
            )}
          </View>
        )}

        {/* Error */}
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: "#fee2e2" }]}>
            <Feather name="alert-circle" size={14} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl, alignItems: "center" },
  header: { alignItems: "center", marginBottom: Spacing.xl },
  iconBg: {
    width: 64, height: 64, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    marginBottom: Spacing.md,
  },
  title: { fontSize: 26, marginBottom: Spacing.xs, textAlign: "center" },
  section: { width: "100%", alignItems: "center" },
  label: { alignSelf: "flex-start", marginBottom: Spacing.sm },
  input: {
    width: "100%", height: 50, borderWidth: 1,
    borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  nextBtn: {
    width: "100%", height: 50, borderRadius: BorderRadius.lg,
    alignItems: "center", justifyContent: "center",
    marginTop: Spacing.md,
  },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  back: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginBottom: Spacing.md, gap: 4 },
  backText: { fontSize: 14 },
  dots: { flexDirection: "row", gap: 16, marginVertical: Spacing.lg },
  dot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2,
  },
  pad: { width: "100%", gap: 12 },
  padRow: { flexDirection: "row", justifyContent: "center", gap: 12 },
  padKey: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
  },
  padEmpty: { width: 80, height: 80 },
  padKeyText: { fontSize: 26, fontWeight: "500" },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md, marginTop: Spacing.md,
    width: "100%",
  },
  errorText: { color: "#ef4444", fontSize: 13, flex: 1 },
});
