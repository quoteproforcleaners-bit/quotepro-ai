import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface PhotoEstimate {
  spaceType: string;
  estimatedSqft: number;
  cleanLevel: "light" | "standard" | "deep";
  timeRangeHours: { min: number; max: number };
  priceRange: { min: number; max: number };
  observations: string[];
  confidence: "low" | "medium" | "high";
}

const CONFIDENCE_COLORS = {
  low: "#f59e0b",
  medium: "#2563eb",
  high: "#16a34a",
};

const CLEAN_LEVEL_LABELS = {
  light: "Light Clean",
  standard: "Standard Clean",
  deep: "Deep Clean",
};

const CLEAN_LEVEL_COLORS = {
  light: "#16a34a",
  standard: "#2563eb",
  deep: "#dc2626",
};

export default function PhotoToQuoteScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<PhotoEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prompt immediately on mount
    showOptions();
  }, []);

  const showOptions = () => {
    Alert.alert(
      "Add a Photo",
      "Choose how to add your photo",
      [
        { text: "Take a Photo", onPress: () => pickImage("camera") },
        { text: "Choose from Library", onPress: () => pickImage("library") },
        { text: "Cancel", style: "cancel", onPress: () => navigation.goBack() },
      ]
    );
  };

  const pickImage = async (source: "camera" | "library") => {
    let result: ImagePicker.ImagePickerResult;

    if (source === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Camera permission is required to take photos.");
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        base64: true,
        allowsEditing: false,
      });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Photo library permission is required.");
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        base64: true,
        allowsEditing: false,
      });
    }

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setImageUri(asset.uri);
    setEstimate(null);
    setError(null);
    analyzeImage(asset);
  };

  const analyzeImage = async (asset: ImagePicker.ImagePickerAsset) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      const mimeType = asset.mimeType || "image/jpeg";
      const filename = asset.fileName || "photo.jpg";

      // React Native FormData file object
      formData.append("photo", {
        uri: asset.uri,
        type: mimeType,
        name: filename,
      } as any);
      formData.append("propertyType", "residential");

      const apiUrl = new URL("/api/ai/photo-to-quote", getApiUrl()).toString();
      const res = await fetch(apiUrl, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 403 && body.error === "limit_reached") {
          setError(`Monthly limit reached. ${body.message || "Upgrade your plan for more photo quotes."}`);
        } else {
          setError(body.message || "Could not analyze the photo. Please try again.");
        }
        return;
      }

      const data: PhotoEstimate = await res.json();
      setEstimate(data);
    } catch (e) {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBuildQuote = () => {
    if (!estimate) return;
    navigation.navigate("QuoteCalculator", {
      prefillPhotoEstimate: estimate,
    });
  };

  return (
    <ThemedView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Image preview */}
        {imageUri ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="cover"
            />
            {!loading && !estimate && (
              <Pressable
                onPress={showOptions}
                style={[styles.retakeBtn, { backgroundColor: "rgba(0,0,0,0.55)" }]}
              >
                <Feather name="camera" size={14} color="white" />
                <ThemedText type="small" style={{ color: "white", fontWeight: "700", marginLeft: 4 }}>
                  Retake
                </ThemedText>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={[styles.placeholder, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <Feather name="camera" size={32} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              No photo selected
            </ThemedText>
            <Pressable
              onPress={showOptions}
              style={[styles.addPhotoBtn, { backgroundColor: theme.primary }]}
            >
              <ThemedText type="small" style={{ color: "white", fontWeight: "700" }}>
                Add a Photo
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* Loading state */}
        {loading && (
          <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <ActivityIndicator size="large" color={theme.primary} style={{ marginBottom: Spacing.md }} />
            <ThemedText type="body" style={{ fontWeight: "700", textAlign: "center" }}>
              Analyzing your space...
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center", marginTop: 4 }}>
              Our AI is estimating cleaning requirements
            </ThemedText>
          </View>
        )}

        {/* Error state */}
        {error && (
          <View style={[styles.card, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]}>
            <Feather name="alert-circle" size={20} color="#dc2626" style={{ marginBottom: Spacing.sm }} />
            <ThemedText type="body" style={{ color: "#991b1b", fontWeight: "700", textAlign: "center" }}>
              {error}
            </ThemedText>
            <Pressable
              onPress={showOptions}
              style={[styles.retryBtn, { backgroundColor: "#dc2626" }]}
            >
              <ThemedText type="small" style={{ color: "white", fontWeight: "700" }}>
                Try Another Photo
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* Estimate result card */}
        {estimate && !loading && (
          <>
            <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              {/* Header */}
              <View style={styles.estimateHeader}>
                <View style={[styles.sparkleIcon, { backgroundColor: "#eff6ff" }]}>
                  <Feather name="zap" size={16} color="#2563eb" />
                </View>
                <ThemedText type="body" style={{ fontWeight: "800", flex: 1, marginLeft: Spacing.sm }}>
                  AI Estimate
                </ThemedText>
                <View
                  style={[
                    styles.confidenceBadge,
                    { backgroundColor: `${CONFIDENCE_COLORS[estimate.confidence]}18` },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{
                      color: CONFIDENCE_COLORS[estimate.confidence],
                      fontWeight: "700",
                      textTransform: "capitalize",
                    }}
                  >
                    {estimate.confidence} confidence
                  </ThemedText>
                </View>
              </View>

              {/* Key facts */}
              <View style={styles.factsGrid}>
                <View style={[styles.factBox, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>Space</ThemedText>
                  <ThemedText type="body" style={{ fontWeight: "700", textTransform: "capitalize" }}>
                    {estimate.spaceType}
                  </ThemedText>
                </View>
                <View style={[styles.factBox, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>Est. Size</ThemedText>
                  <ThemedText type="body" style={{ fontWeight: "700" }}>
                    ~{estimate.estimatedSqft} sqft
                  </ThemedText>
                </View>
                <View style={[styles.factBox, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>Service</ThemedText>
                  <ThemedText
                    type="body"
                    style={{ fontWeight: "700", color: CLEAN_LEVEL_COLORS[estimate.cleanLevel] }}
                  >
                    {CLEAN_LEVEL_LABELS[estimate.cleanLevel]}
                  </ThemedText>
                </View>
                <View style={[styles.factBox, { backgroundColor: theme.backgroundSecondary }]}>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>Time</ThemedText>
                  <ThemedText type="body" style={{ fontWeight: "700" }}>
                    {estimate.timeRangeHours.min}–{estimate.timeRangeHours.max} hrs
                  </ThemedText>
                </View>
              </View>

              {/* Price range */}
              <View style={[styles.priceBox, { backgroundColor: "#eff6ff" }]}>
                <ThemedText type="small" style={{ color: "#1e40af", fontWeight: "600" }}>
                  Suggested Price Range
                </ThemedText>
                <ThemedText type="title" style={{ color: "#1e40af", fontSize: 28, fontWeight: "900" }}>
                  ${estimate.priceRange.min}–${estimate.priceRange.max}
                </ThemedText>
              </View>

              {/* Observations */}
              {estimate.observations.length > 0 && (
                <View style={{ marginTop: Spacing.md }}>
                  <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: "600", marginBottom: Spacing.xs }}>
                    Key Observations
                  </ThemedText>
                  {estimate.observations.map((obs, i) => (
                    <View key={i} style={styles.obsRow}>
                      <View style={[styles.obsDot, { backgroundColor: theme.primary }]} />
                      <ThemedText type="small" style={{ flex: 1, color: theme.text, lineHeight: 18 }}>
                        {obs}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Actions */}
            <Pressable
              onPress={handleBuildQuote}
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              testID="button-build-quote-from-photo"
            >
              <Feather name="file-text" size={16} color="white" />
              <ThemedText type="body" style={{ color: "white", fontWeight: "700", marginLeft: Spacing.sm }}>
                Build Quote from This
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={showOptions}
              style={[styles.secondaryBtn, { borderColor: theme.border }]}
            >
              <Feather name="camera" size={15} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, fontWeight: "600", marginLeft: Spacing.sm }}>
                Try a Different Photo
              </ThemedText>
            </Pressable>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  imageContainer: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    position: "relative",
    height: 220,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  retakeBtn: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  placeholder: {
    height: 180,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  addPhotoBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  estimateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sparkleIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  factsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  factBox: {
    flex: 1,
    minWidth: "45%",
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    gap: 2,
  },
  priceBox: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
    gap: 4,
  },
  obsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: 6,
  },
  obsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
    flexShrink: 0,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  retryBtn: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignSelf: "center",
  },
  obsContainer: {
    gap: 4,
  },
});
