import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTutorial } from "@/context/TutorialContext";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TourOverlay() {
  const {
    activeTour,
    currentStepIndex,
    isActive,
    nextStep,
    previousStep,
    skipTour,
  } = useTutorial();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const progress = useSharedValue(0);
  const cardScale = useSharedValue(0.9);
  const iconRotation = useSharedValue(0);

  useEffect(() => {
    if (isActive && activeTour) {
      progress.value = withTiming(
        (currentStepIndex + 1) / activeTour.steps.length,
        { duration: 400 }
      );
      cardScale.value = 0.92;
      cardScale.value = withSpring(1, { damping: 14, stiffness: 180 });
      iconRotation.value = 0;
      iconRotation.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 120 }));
    }
  }, [currentStepIndex, isActive]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as any,
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(iconRotation.value > 0.5 ? 1 : 0.5, { damping: 10 }) },
      { rotate: `${iconRotation.value * 360}deg` },
    ],
    opacity: withTiming(iconRotation.value > 0 ? 1 : 0, { duration: 200 }),
  }));

  if (!isActive || !activeTour) return null;

  const step = activeTour.steps[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === activeTour.steps.length - 1;
  const totalSteps = activeTour.steps.length;

  const handleNext = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    nextStep();
  };

  const handlePrevious = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    previousStep();
  };

  const handleSkip = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    skipTour();
  };

  const overlayColor = isDark ? "rgba(0,0,0,0.82)" : "rgba(0,0,0,0.65)";
  const cardBg = isDark ? "#131F33" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(47,123,255,0.2)" : "rgba(0,122,255,0.12)";

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={[styles.overlay, { backgroundColor: overlayColor }]}
      pointerEvents="box-none"
    >
      <Pressable style={styles.overlayTouch} onPress={handleNext}>
        <View
          style={[
            styles.cardContainer,
            {
              paddingBottom: insets.bottom + 20,
              paddingTop: insets.top + 20,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: cardBg,
                borderColor: cardBorder,
                shadowColor: isDark ? "#3B82F6" : "#007AFF",
              },
              cardAnimStyle,
            ]}
          >
            <View style={styles.cardTop}>
              <Animated.View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isDark
                      ? "rgba(47,123,255,0.15)"
                      : "rgba(0,122,255,0.08)",
                  },
                  iconAnimStyle,
                ]}
              >
                <Feather
                  name={(step.icon as any) || "info"}
                  size={24}
                  color={theme.primary}
                />
              </Animated.View>

              <Pressable
                onPress={handleSkip}
                hitSlop={12}
                style={styles.skipBtn}
              >
                <ThemedText
                  type="caption"
                  style={{ color: theme.textMuted, fontWeight: "500" }}
                >
                  Skip tour
                </ThemedText>
              </Pressable>
            </View>

            <ThemedText type="h3" style={[styles.title, { color: isDark ? "#F5F7FF" : "#0F172A" }]}>
              {step.title}
            </ThemedText>
            <ThemedText
              type="body"
              style={[styles.description, { color: isDark ? "#C0CAE0" : "#64748B" }]}
            >
              {step.description}
            </ThemedText>

            <View style={styles.progressSection}>
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" },
                ]}
              >
                <Animated.View style={[styles.progressFill, progressBarStyle]}>
                  <LinearGradient
                    colors={["#2563EB", "#3B82F6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.progressGradient}
                  />
                </Animated.View>
              </View>
              <ThemedText
                type="caption"
                style={{ color: theme.textMuted, marginTop: 6 }}
              >
                {currentStepIndex + 1} of {totalSteps}
              </ThemedText>
            </View>

            <View style={styles.actions}>
              {!isFirst ? (
                <Pressable
                  onPress={handlePrevious}
                  style={[
                    styles.backBtn,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)",
                    },
                  ]}
                >
                  <Feather name="arrow-left" size={16} color={theme.textSecondary} />
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary, marginLeft: 4, fontWeight: "500" }}
                  >
                    Back
                  </ThemedText>
                </Pressable>
              ) : (
                <View />
              )}

              <Pressable onPress={handleNext}>
                <LinearGradient
                  colors={["#2563EB", "#3B82F6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.nextBtn}
                >
                  <ThemedText
                    type="small"
                    style={{ color: "#FFFFFF", fontWeight: "700", marginRight: isLast ? 0 : 4 }}
                  >
                    {isLast ? "Got it!" : "Next"}
                  </ThemedText>
                  {!isLast ? (
                    <Feather name="arrow-right" size={16} color="#FFFFFF" />
                  ) : (
                    <Feather name="check" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>

          <View style={styles.stepDots}>
            {activeTour.steps.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === currentStepIndex
                    ? { backgroundColor: theme.primary, width: 20 }
                    : {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.2)"
                          : "rgba(0,0,0,0.15)",
                      },
                ]}
              />
            ))}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  overlayTouch: {
    flex: 1,
    justifyContent: "center",
  },
  cardContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    lineHeight: 22,
    marginBottom: 20,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressGradient: {
    flex: 1,
    borderRadius: 2,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  stepDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
  },
});
