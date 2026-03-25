import React, { useState } from "react";
import {
  View, StyleSheet, Modal, Pressable, TextInput,
  ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

interface NPSSurveyModalProps {
  visible: boolean;
  onClose: () => void;
}

const LABELS: Record<string, string> = {
  promoter: "What do you love most about QuotePro?",
  passive: "What could we improve?",
  detractor: "What's not working for you?",
};

function getCategory(score: number): "promoter" | "passive" | "detractor" {
  if (score >= 9) return "promoter";
  if (score >= 7) return "passive";
  return "detractor";
}

function getScoreColor(score: number, primary: string, warning: string, error: string): string {
  if (score >= 9) return "#22c55e";
  if (score >= 7) return warning;
  return error;
}

export default function NPSSurveyModal({ visible, onClose }: NPSSurveyModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const category = selectedScore !== null ? getCategory(selectedScore) : null;
  const followUpLabel = category ? LABELS[category] : "";

  const handleScore = (s: number) => {
    Haptics.selectionAsync();
    setSelectedScore(s);
  };

  const handleSubmit = async () => {
    if (selectedScore === null) return;
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/nps/submit", { score: selectedScore, followUp });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitted(true);
    } catch {
      // non-blocking
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedScore(null);
    setFollowUp("");
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kav}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.cardBackground,
                paddingBottom: insets.bottom + Spacing.lg,
              },
            ]}
          >
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: theme.border }]} />

            {/* Close */}
            <Pressable onPress={handleClose} style={styles.closeBtn} testID="button-nps-close">
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>

            {submitted ? (
              <View style={styles.successContainer}>
                <View style={[styles.successIcon, { backgroundColor: "#22c55e20" }]}>
                  <Feather name="check-circle" size={40} color="#22c55e" />
                </View>
                <ThemedText type="h3" style={styles.successTitle}>
                  Thank you!
                </ThemedText>
                <ThemedText type="body" style={[styles.successSubtitle, { color: theme.textSecondary }]}>
                  Your feedback shapes every update we ship.
                </ThemedText>
                <Pressable
                  onPress={handleClose}
                  style={[styles.submitBtn, { backgroundColor: theme.primary }]}
                  testID="button-nps-done"
                >
                  <ThemedText type="body" style={styles.submitBtnText}>Done</ThemedText>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.content}
              >
                <ThemedText type="h3" style={styles.question}>
                  How likely are you to recommend QuotePro to another cleaning business owner?
                </ThemedText>

                {/* Score grid 0-10 */}
                <View style={styles.scoreRow}>
                  {Array.from({ length: 11 }, (_, i) => {
                    const isSelected = selectedScore === i;
                    const color = getScoreColor(i, theme.primary, theme.warning || "#f59e0b", theme.error || "#ef4444");
                    return (
                      <Pressable
                        key={i}
                        onPress={() => handleScore(i)}
                        style={[
                          styles.scoreBtn,
                          {
                            backgroundColor: isSelected ? color : theme.background,
                            borderColor: isSelected ? color : theme.border,
                          },
                        ]}
                        testID={`button-nps-score-${i}`}
                      >
                        <ThemedText
                          type="small"
                          style={[
                            styles.scoreBtnText,
                            {
                              color: isSelected ? "#fff" : theme.text,
                              fontWeight: isSelected ? "700" : "400",
                            },
                          ]}
                        >
                          {i}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.scoreLabels}>
                  <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10 }}>
                    Not at all likely
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10 }}>
                    Extremely likely
                  </ThemedText>
                </View>

                {/* Follow-up */}
                {selectedScore !== null && (
                  <View style={styles.followUpContainer}>
                    <ThemedText type="small" style={[styles.followUpLabel, { color: theme.textSecondary }]}>
                      {followUpLabel}
                    </ThemedText>
                    <TextInput
                      value={followUp}
                      onChangeText={setFollowUp}
                      placeholder="Optional — but incredibly helpful..."
                      placeholderTextColor={theme.textSecondary}
                      multiline
                      numberOfLines={4}
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.background,
                          borderColor: theme.border,
                          color: theme.text,
                        },
                      ]}
                      testID="input-nps-followup"
                    />
                    <Pressable
                      onPress={handleSubmit}
                      disabled={submitting}
                      style={[
                        styles.submitBtn,
                        { backgroundColor: theme.primary, opacity: submitting ? 0.7 : 1 },
                      ]}
                      testID="button-nps-submit"
                    >
                      <ThemedText type="body" style={styles.submitBtnText}>
                        {submitting ? "Submitting..." : "Submit feedback"}
                      </ThemedText>
                      {!submitting && <Feather name="chevron-right" size={18} color="#fff" />}
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  kav: {
    width: "100%",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: Spacing.lg,
    maxHeight: "80%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.md,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: Spacing.lg,
    padding: 4,
  },
  content: {
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  question: {
    marginBottom: Spacing.lg,
    lineHeight: 26,
  },
  scoreRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: Spacing.xs,
  },
  scoreBtn: {
    width: 42,
    height: 38,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBtnText: {
    fontSize: 13,
  },
  scoreLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
    marginTop: 2,
  },
  followUpContainer: {
    gap: Spacing.sm,
  },
  followUpLabel: {
    marginBottom: 2,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 14,
    minHeight: 90,
    textAlignVertical: "top",
  },
  submitBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: Spacing.xs,
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    textAlign: "center",
  },
  successSubtitle: {
    textAlign: "center",
    lineHeight: 22,
  },
});
