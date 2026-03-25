import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import * as Haptics from "expo-haptics";
import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { apiRequest } from "@/lib/query-client";

interface Props {
  onNext: (minimumTicket: number) => void;
  onBack: () => void;
}

export default function OnboardingPricingScreen({ onNext, onBack }: Props) {
  const [minimumTicket, setMinimumTicket] = useState(150);
  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      await apiRequest("PUT", "/api/pricing", { minimumTicket }).catch(() => {});
    } finally {
      setSaving(false);
    }
    onNext(minimumTicket);
  };

  const handleSliderChange = (value: number) => {
    const snapped = Math.round(value / 5) * 5;
    setMinimumTicket(snapped);
    Haptics.selectionAsync();
  };

  return (
    <LinearGradient colors={["#020617", "#0f172a", "#0c1a3a"]} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Progress dots */}
          <View style={styles.progressRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, i === 1 && styles.dotActive, i === 0 && styles.dotDone]} />
            ))}
          </View>

          <View style={styles.iconWrap}>
            <Feather name="dollar-sign" size={28} color="#4ade80" />
          </View>
          <Text style={styles.heading}>What do you charge for a standard house clean?</Text>
          <Text style={styles.subheading}>This sets your minimum ticket — we generate Good/Better/Best quotes from here</Text>

          {/* Price display */}
          <View style={styles.priceCard}>
            <Text style={styles.currencySign}>$</Text>
            <TextInput
              style={styles.priceInput}
              value={String(minimumTicket)}
              onChangeText={(t) => {
                const n = parseInt(t, 10);
                if (!isNaN(n)) setMinimumTicket(Math.max(50, Math.min(5000, n)));
              }}
              keyboardType="number-pad"
              selectTextOnFocus
            />
          </View>

          {/* Slider */}
          <Slider
            style={{ width: "100%", height: 40 }}
            minimumValue={50}
            maximumValue={500}
            step={5}
            value={minimumTicket}
            onValueChange={handleSliderChange}
            minimumTrackTintColor="#4ade80"
            maximumTrackTintColor="#1e293b"
            thumbTintColor="#4ade80"
          />
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>$50</Text>
            <Text style={[styles.sliderLabel, { color: "#4ade80" }]}>Industry avg: $120–$180</Text>
            <Text style={styles.sliderLabel}>$500+</Text>
          </View>

          {/* Info card */}
          <View style={styles.infoCard}>
            <Feather name="info" size={14} color="#94a3b8" style={{ marginTop: 2 }} />
            <Text style={styles.infoText}>
              QuotePro AI generates <Text style={{ color: "#f1f5f9", fontWeight: "700" }}>Good / Better / Best</Text> options from this price. You can refine all rates in Settings anytime.
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
              <Feather name="arrow-left" size={18} color="#94a3b8" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              onPress={handleNext}
              disabled={saving}
              activeOpacity={0.8}
            >
              <LinearGradient colors={["#16a34a", "#15803d"]} style={styles.buttonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={styles.buttonText}>{saving ? "Saving..." : "Continue"}</Text>
                  {!saving && <Feather name="arrow-right" size={16} color="#fff" />}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: 28, paddingTop: 70 },
  progressRow: { flexDirection: "row", gap: 8, marginBottom: 40, justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#1e293b" },
  dotActive: { backgroundColor: "#4ade80", width: 24 },
  dotDone: { backgroundColor: "#166534" },
  iconWrap: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: "rgba(74,222,128,0.12)",
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  heading: { fontSize: 24, fontWeight: "700", color: "#f1f5f9", marginBottom: 10 },
  subheading: { fontSize: 14, color: "#94a3b8", marginBottom: 32, lineHeight: 20 },
  priceCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#1e293b", borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1.5, borderColor: "#166534",
  },
  currencySign: { fontSize: 36, fontWeight: "700", color: "#4ade80", marginRight: 4 },
  priceInput: { fontSize: 52, fontWeight: "800", color: "#f1f5f9", minWidth: 120, textAlign: "center" },
  sliderLabels: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  sliderLabel: { fontSize: 12, color: "#475569" },
  infoCard: {
    flexDirection: "row", gap: 10, backgroundColor: "rgba(30,41,59,0.8)",
    borderRadius: 14, padding: 14, marginBottom: 36,
    borderWidth: 1, borderColor: "#334155",
  },
  infoText: { fontSize: 13, color: "#94a3b8", flex: 1, lineHeight: 19 },
  buttonRow: { flexDirection: "row", gap: 12 },
  backButton: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: "#1e293b",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#334155",
  },
  button: { flex: 1, borderRadius: 16, overflow: "hidden" },
  buttonDisabled: { opacity: 0.4 },
  buttonGradient: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 17, fontWeight: "700", color: "#fff" },
});
