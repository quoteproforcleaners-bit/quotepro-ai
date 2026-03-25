import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { Feather } from "@expo/vector-icons";
import { apiRequest } from "@/lib/query-client";

interface Props {
  onNext: (data: { companyName: string; logoUri?: string }) => void;
  initialName?: string;
}

export default function OnboardingBusinessScreen({ onNext, initialName = "" }: Props) {
  const { theme } = useTheme();
  const [companyName, setCompanyName] = useState(initialName);
  const [logoUri, setLogoUri] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const pickLogo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setLogoUri(asset.uri);
    }
  };

  const handleNext = async () => {
    if (!companyName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      await apiRequest("PATCH", "/api/business", { companyName: companyName.trim() }).catch(() => {});
    } finally {
      setSaving(false);
    }
    onNext({ companyName: companyName.trim(), logoUri });
  };

  return (
    <LinearGradient colors={["#020617", "#0f172a", "#0c1a3a"]} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Progress dots */}
          <View style={styles.progressRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.iconWrap}>
            <Feather name="briefcase" size={28} color="#60a5fa" />
          </View>
          <Text style={styles.heading}>What's your business name?</Text>
          <Text style={styles.subheading}>This appears on every quote you send</Text>

          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: "#1e293b" }]}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="e.g. Sparkling Clean Co."
            placeholderTextColor="#475569"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleNext}
          />

          {/* Logo picker */}
          <Text style={styles.logoLabel}>Logo (optional)</Text>
          <TouchableOpacity style={styles.logoPicker} onPress={pickLogo} activeOpacity={0.7}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoPreview} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Feather name="image" size={22} color="#64748b" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.logoPickerTitle}>{logoUri ? "Change logo" : "Upload logo"}</Text>
              <Text style={styles.logoPickerSub}>Shown on your quotes — optional</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#475569" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, (!companyName.trim() || saving) && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={!companyName.trim() || saving}
            activeOpacity={0.8}
          >
            <LinearGradient colors={["#3b82f6", "#2563eb"]} style={styles.buttonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {saving ? (
                <Text style={styles.buttonText}>Saving...</Text>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={styles.buttonText}>Continue</Text>
                  <Feather name="arrow-right" size={16} color="#fff" />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
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
  dotActive: { backgroundColor: "#3b82f6", width: 24 },
  iconWrap: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: "rgba(59,130,246,0.15)",
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  heading: { fontSize: 26, fontWeight: "700", color: "#f1f5f9", marginBottom: 8 },
  subheading: { fontSize: 15, color: "#94a3b8", marginBottom: 32 },
  input: {
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 17, marginBottom: 24,
  },
  logoLabel: { fontSize: 12, fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  logoPicker: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#1e293b", borderRadius: 14, padding: 14, marginBottom: 40,
    borderWidth: 1, borderColor: "#334155",
  },
  logoPreview: { width: 48, height: 48, borderRadius: 10, backgroundColor: "#fff" },
  logoPlaceholder: {
    width: 48, height: 48, borderRadius: 10, backgroundColor: "#0f172a",
    alignItems: "center", justifyContent: "center",
  },
  logoPickerTitle: { fontSize: 15, fontWeight: "600", color: "#e2e8f0" },
  logoPickerSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  button: { borderRadius: 16, overflow: "hidden" },
  buttonDisabled: { opacity: 0.4 },
  buttonGradient: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 17, fontWeight: "700", color: "#fff" },
});
