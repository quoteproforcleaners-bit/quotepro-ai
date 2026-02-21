import React, { useState } from "react";
import { View, StyleSheet, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface Props {
  initialName?: string;
  onNext: (data: { businessName: string; zipCode: string; logoUri: string | null }) => void;
  onBack: () => void;
}

export default function BusinessBasicsScreen({ initialName, onNext, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [businessName, setBusinessName] = useState(initialName || "");
  const [zipCode, setZipCode] = useState("");
  const [logoUri, setLogoUri] = useState<string | null>(null);

  const handlePickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLogoUri(result.assets[0].uri);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}
    >
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
        <Feather name="arrow-left" size={22} color={theme.text} />
      </Pressable>

      <ThemedText type="caption" style={{ color: theme.primary, fontWeight: "600", marginBottom: Spacing.xs }}>
        STEP 2 OF 7
      </ThemedText>
      <ThemedText type="h2" style={{ marginBottom: Spacing.xs }}>Your Business</ThemedText>
      <ThemedText type="body" style={{ color: theme.textSecondary, marginBottom: Spacing["2xl"] }}>
        This info appears on your quotes
      </ThemedText>

      <Pressable
        onPress={handlePickLogo}
        style={[styles.logoContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
      >
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.logo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Feather name="camera" size={28} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: 4 }}>Add Logo</ThemedText>
          </View>
        )}
      </Pressable>

      <Input
        label="Business Name"
        value={businessName}
        onChangeText={setBusinessName}
        placeholder="Your cleaning company"
        leftIcon="briefcase"
      />

      <Input
        label="Zip Code (optional)"
        value={zipCode}
        onChangeText={setZipCode}
        placeholder="12345"
        keyboardType="number-pad"
        leftIcon="map-pin"
      />

      <Pressable
        testID="button-basics-next"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onNext({ businessName, zipCode, logoUri });
        }}
        style={[styles.nextBtn, { backgroundColor: theme.primary, opacity: businessName.trim() ? 1 : 0.5 }]}
        disabled={!businessName.trim()}
      >
        <ThemedText type="subtitle" style={{ color: "#FFFFFF", fontWeight: "700" }}>Continue</ThemedText>
        <Feather name="arrow-right" size={18} color="#FFFFFF" />
      </Pressable>

      <Pressable onPress={() => onNext({ businessName: businessName || "My Cleaning Co", zipCode: "", logoUri: null })} style={styles.skipBtn}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>Skip for now</ThemedText>
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.xl },
  backBtn: { marginBottom: Spacing.lg },
  logoContainer: { width: 100, height: 100, borderRadius: BorderRadius.md, alignSelf: "center", marginBottom: Spacing["2xl"], overflow: "hidden", borderWidth: 2, borderStyle: "dashed" },
  logo: { width: "100%", height: "100%" },
  logoPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.sm, height: 56, borderRadius: BorderRadius.md, marginTop: Spacing.xl },
  skipBtn: { alignItems: "center", padding: Spacing.md },
});
