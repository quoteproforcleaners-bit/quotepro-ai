import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ProGate } from "@/components/ProGate";
import { apiRequest } from "@/lib/query-client";
import { trackEvent } from "@/lib/analytics";
import { useAIConsent } from "@/context/AIConsentContext";

type VoiceState = "idle" | "requesting" | "recording" | "processing";

const PLACEHOLDER_TEXT =
  "Example: 3 bedroom, 2 bath house, about 1,800 sq ft. First-time deep clean, has 2 dogs, carpeted bedrooms. They want biweekly after the initial clean. Kitchen is greasy, bathrooms need extra attention. Add inside oven and fridge.";

function WalkthroughAIContent() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { theme, isDark } = useTheme();
  const { requestConsent } = useAIConsent();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { width: screenWidth } = useWindowDimensions();
  const useMaxWidth = screenWidth > 600;

  const [description, setDescription] = useState("");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pulseOpacity = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    trackEvent("walkthrough_ai_selected");
  }, []);

  useEffect(() => {
    if (voiceState === "recording") {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        false
      );
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(pulseOpacity);
      cancelAnimation(pulseScale);
      pulseOpacity.value = withTiming(1, { duration: 200 });
      pulseScale.value = withTiming(1, { duration: 200 });
    }
  }, [voiceState]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  const startVoiceRecording = async () => {
    setError(null);

    if (Platform.OS === "web") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setError("Speech recognition is not supported in this browser. Please type your description instead.");
        return;
      }

      try {
        setVoiceState("requesting");
        trackEvent("walkthrough_voice_started");

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognitionRef.current = recognition;

        let finalTranscript = description;

        recognition.onresult = (event: any) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += (finalTranscript ? " " : "") + transcript;
              setDescription(finalTranscript);
            } else {
              interim += transcript;
            }
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error === "not-allowed") {
            setError("Microphone permission was denied. Please allow microphone access or type your description.");
            trackEvent("walkthrough_voice_started", { error: "permission_denied" });
          } else if (event.error === "no-speech") {
            setError("No speech detected. Please try again or type your description.");
          } else {
            setError("Voice recognition failed. Please type your description instead.");
          }
          setVoiceState("idle");
        };

        recognition.onend = () => {
          setVoiceState("idle");
          trackEvent("walkthrough_voice_completed");
        };

        recognition.start();
        setVoiceState("recording");

        if (Platform.OS !== "web") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } catch (err) {
        setError("Could not start voice recognition. Please type your description.");
        setVoiceState("idle");
      }
    } else {
      setError("Voice input is available on the web version. Please type your description or run in a browser.");
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setVoiceState("idle");
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleClear = () => {
    setDescription("");
    setError(null);
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
  };

  const handleAnalyze = async () => {
    if (!description.trim()) {
      setError("Please describe the job before analyzing.");
      return;
    }

    const consented = await requestConsent();
    if (!consented) return;

    setError(null);
    setIsAnalyzing(true);
    trackEvent("walkthrough_analysis_started");

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const res = await apiRequest("POST", "/api/ai/walkthrough-extract", {
        description: description.trim(),
      });
      const data = await res.json();

      trackEvent("walkthrough_analysis_completed", {
        confidence: data.confidence,
        fieldCount: Object.keys(data.extractedFields || {}).length,
      });

      navigation.navigate("WalkthroughResults", {
        extractedFields: data.extractedFields,
        assumptions: data.assumptions,
        confidence: data.confidence,
        description: description.trim(),
      });
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("401") || msg.includes("403")) {
        setError("This feature requires a Pro subscription.");
      } else {
        setError("Analysis failed. Please check your connection and try again.");
      }
      trackEvent("walkthrough_analysis_started", { error: "api_failure" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const micColor = voiceState === "recording" ? theme.error : theme.primary;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
          useMaxWidth
            ? { maxWidth: 560, alignSelf: "center" as const, width: "100%" as const }
            : undefined,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ThemedText
          type="small"
          style={[styles.subtitle, { color: theme.textSecondary }]}
        >
          Describe the house, space, condition, frequency, and extras to generate
          a smart quote recommendation.
        </ThemedText>

        <View
          style={[
            styles.trustLine,
            { backgroundColor: isDark ? `${theme.primary}15` : `${theme.primary}08` },
          ]}
        >
          <Feather name="shield" size={14} color={theme.primary} />
          <ThemedText
            type="caption"
            style={{ color: theme.primary, fontWeight: "600" }}
          >
            Built from your pricing settings
          </ThemedText>
        </View>

        <View
          style={[
            styles.inputCard,
            {
              backgroundColor: isDark ? theme.surface1 : theme.surface0,
              borderColor: theme.border,
            },
          ]}
        >
          <TextInput
            style={[
              styles.textArea,
              {
                color: theme.text,
                backgroundColor: isDark ? theme.surface0 : theme.backgroundRoot,
                borderColor: theme.border,
              },
            ]}
            placeholder={PLACEHOLDER_TEXT}
            placeholderTextColor={theme.textMuted}
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              setError(null);
            }}
            editable={!isAnalyzing}
            testID="input-walkthrough-description"
          />

          <View style={styles.inputActions}>
            <Pressable
              onPress={
                voiceState === "recording"
                  ? stopVoiceRecording
                  : startVoiceRecording
              }
              disabled={isAnalyzing}
              style={[
                styles.micButton,
                {
                  backgroundColor:
                    voiceState === "recording"
                      ? `${theme.error}15`
                      : `${theme.primary}10`,
                },
                isAnalyzing ? { opacity: 0.4 } : null,
              ]}
              testID="button-walkthrough-mic"
            >
              <Animated.View style={voiceState === "recording" ? pulseStyle : undefined}>
                <Feather
                  name={voiceState === "recording" ? "mic-off" : "mic"}
                  size={22}
                  color={micColor}
                />
              </Animated.View>
            </Pressable>

            {description.length > 0 ? (
              <Pressable
                onPress={handleClear}
                disabled={isAnalyzing}
                style={[
                  styles.clearButton,
                  { backgroundColor: `${theme.textMuted}15` },
                  isAnalyzing ? { opacity: 0.4 } : null,
                ]}
                testID="button-walkthrough-clear"
              >
                <Feather name="x" size={18} color={theme.textMuted} />
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, fontWeight: "600" }}
                >
                  Clear
                </ThemedText>
              </Pressable>
            ) : null}
          </View>

          {voiceState === "recording" ? (
            <View
              style={[
                styles.recordingIndicator,
                { backgroundColor: `${theme.error}10` },
              ]}
            >
              <Animated.View style={pulseStyle}>
                <View
                  style={[styles.recordingDot, { backgroundColor: theme.error }]}
                />
              </Animated.View>
              <ThemedText
                type="caption"
                style={{ color: theme.error, fontWeight: "600" }}
              >
                Listening... Tap the mic to stop
              </ThemedText>
            </View>
          ) : null}
        </View>

        {error ? (
          <View
            style={[
              styles.errorContainer,
              {
                backgroundColor: `${theme.error}10`,
                borderColor: `${theme.error}30`,
              },
            ]}
          >
            <Feather name="alert-circle" size={16} color={theme.error} />
            <ThemedText
              type="small"
              style={{ color: theme.error, flex: 1 }}
            >
              {error}
            </ThemedText>
          </View>
        ) : null}

        <ThemedText
          type="caption"
          style={[styles.helperText, { color: theme.textMuted }]}
        >
          The AI interprets the job details. QuotePro calculates pricing using
          your saved settings.
        </ThemedText>

        <Pressable
          onPress={handleAnalyze}
          disabled={isAnalyzing || !description.trim()}
          style={[
            styles.analyzeButton,
            {
              backgroundColor: theme.primary,
              opacity: isAnalyzing || !description.trim() ? 0.5 : 1,
            },
          ]}
          testID="button-walkthrough-analyze"
        >
          {isAnalyzing ? (
            <View style={styles.analyzingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <ThemedText
                type="body"
                style={styles.analyzeButtonText}
              >
                Analyzing...
              </ThemedText>
            </View>
          ) : (
            <View style={styles.analyzingRow}>
              <Feather name="zap" size={20} color="#FFFFFF" />
              <ThemedText
                type="body"
                style={styles.analyzeButtonText}
              >
                Analyze Job
              </ThemedText>
            </View>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

export default function WalkthroughAIScreen() {
  return (
    <ProGate featureName="AI Quote Builder">
      <WalkthroughAIContent />
    </ProGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },
  subtitle: {
    textAlign: "center",
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    lineHeight: 20,
  },
  trustLine: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
  },
  inputCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  textArea: {
    minHeight: 160,
    maxHeight: 280,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: 15,
    lineHeight: 22,
  },
  inputActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  helperText: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  analyzeButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  analyzingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  analyzeButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17,
  },
});
