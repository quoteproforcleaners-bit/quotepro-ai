import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Modal,
  View,
  Animated,
  StyleSheet,
  Pressable,
  Share,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const CONFETTI_COLORS = [
  "#7C3AED", "#4F46E5", "#2563EB", "#059669",
  "#D97706", "#DC2626", "#EC4899", "#0891B2",
  "#7C3AED", "#10B981", "#F59E0B",
];

const PARTICLE_COUNT = 36;

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  rot: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
  size: number;
  shape: "circle" | "rect";
  startX: number;
}

function useConfetti(active: boolean): Particle[] {
  const particles = useRef<Particle[]>([]);

  if (particles.current.length === 0) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.current.push({
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        rot: new Animated.Value(0),
        opacity: new Animated.Value(0),
        scale: new Animated.Value(0),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: randomBetween(6, 12),
        shape: i % 3 === 0 ? "rect" : "circle",
        startX: randomBetween(0.05, 0.95),
      });
    }
  }

  useEffect(() => {
    if (!active) return;
    particles.current.forEach((p, i) => {
      p.x.setValue(0);
      p.y.setValue(0);
      p.rot.setValue(0);
      p.opacity.setValue(0);
      p.scale.setValue(0);

      const delay = i * 55;
      const duration = randomBetween(1600, 2600);
      const targetX = randomBetween(-0.5, 0.5);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(p.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(p.scale, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(p.y, { toValue: 1, duration: duration, useNativeDriver: true }),
          Animated.timing(p.x, { toValue: targetX, duration: duration, useNativeDriver: true }),
          Animated.timing(p.rot, {
            toValue: randomBetween(-3, 3),
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(duration * 0.7),
            Animated.timing(p.opacity, { toValue: 0, duration: duration * 0.3, useNativeDriver: true }),
          ]),
        ]),
      ]).start();
    });
  }, [active]);

  return particles.current;
}

interface Props {
  visible: boolean;
  milestone: number;
  totalRevenue: number;
  onDismiss: () => void;
}

export default function MilestoneCelebrationModal({ visible, milestone, totalRevenue, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const particles = useConfetti(visible);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (visible) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      const t = setTimeout(() => setShowContent(true), 300);
      return () => clearTimeout(t);
    } else {
      setShowContent(false);
    }
  }, [visible]);

  const handleShare = useCallback(async () => {
    const amount = `$${milestone >= 1000 ? `${(milestone / 1000).toFixed(0)}K` : milestone}`;
    try {
      await Share.share({
        message: `Just crossed ${amount} in revenue with QuotePro! Building something real, one quote at a time.`,
        title: `${amount} Revenue Milestone`,
      });
    } catch {}
  }, [milestone]);

  const formatMilestone = (m: number) => {
    if (m >= 1000000) return `$${(m / 1000000).toFixed(0)}M`;
    if (m >= 1000) return `$${(m / 1000).toFixed(0)}K`;
    return `$${m}`;
  };

  const milestoneLabel = formatMilestone(milestone);
  const nextMilestones = [1000, 5000, 10000, 25000, 50000, 100000];
  const nextIdx = nextMilestones.indexOf(milestone) + 1;
  const nextMilestone = nextIdx < nextMilestones.length ? formatMilestone(nextMilestones[nextIdx]) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        {particles.map((p, i) => {
          const translateX = p.x.interpolate({
            inputRange: [-0.5, 0.5],
            outputRange: [-SCREEN_W * 0.4, SCREEN_W * 0.4],
          });
          const translateY = p.y.interpolate({
            inputRange: [0, 1],
            outputRange: [-20, SCREEN_H + 40],
          });
          const rotate = p.rot.interpolate({
            inputRange: [-3, 3],
            outputRange: ["-360deg", "360deg"],
          });

          return (
            <Animated.View
              key={i}
              style={[
                styles.particle,
                {
                  left: p.startX * SCREEN_W,
                  top: 0,
                  width: p.size,
                  height: p.shape === "rect" ? p.size * 0.5 : p.size,
                  borderRadius: p.shape === "circle" ? p.size / 2 : 2,
                  backgroundColor: p.color,
                  transform: [{ translateX }, { translateY }, { rotate }, { scale: p.scale }],
                  opacity: p.opacity,
                },
              ]}
            />
          );
        })}

        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />

        {showContent ? (
          <Animated.View style={[styles.card, { backgroundColor: theme.cardBackground, paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.emojiRow}>
              <View style={[styles.trophyBadge, { backgroundColor: "#7C3AED15" }]}>
                <Feather name="award" size={40} color="#7C3AED" />
              </View>
            </View>

            <ThemedText style={styles.headline}>Revenue Milestone</ThemedText>
            <ThemedText style={[styles.amount, { color: "#7C3AED" }]}>{milestoneLabel}</ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              You have crossed {milestoneLabel} in total revenue. Keep building.
            </ThemedText>

            <View style={[styles.statsRow, { backgroundColor: theme.background }]}>
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: "#7C3AED" }]}>
                  ${totalRevenue >= 1000 ? `${(totalRevenue / 1000).toFixed(1)}K` : totalRevenue.toFixed(0)}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Total Revenue</ThemedText>
              </View>
              {nextMilestone ? (
                <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
              ) : null}
              {nextMilestone ? (
                <View style={styles.statItem}>
                  <ThemedText style={[styles.statValue, { color: "#059669" }]}>{nextMilestone}</ThemedText>
                  <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>Next Goal</ThemedText>
                </View>
              ) : null}
            </View>

            <Pressable
              style={[styles.shareBtn, { backgroundColor: "#7C3AED" }]}
              onPress={handleShare}
            >
              <Feather name="share-2" size={16} color="#fff" />
              <ThemedText style={styles.shareBtnText}>Share This Win</ThemedText>
            </Pressable>

            <Pressable onPress={onDismiss} style={styles.dismissBtn}>
              <ThemedText style={[styles.dismissText, { color: theme.textSecondary }]}>Keep going</ThemedText>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
    alignItems: "center",
    overflow: "hidden",
  },
  particle: {
    position: "absolute",
  },
  card: {
    width: "100%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.xl,
    paddingTop: 28,
    alignItems: "center",
  },
  emojiRow: {
    marginBottom: 16,
  },
  trophyBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headline: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    opacity: 0.5,
    marginBottom: 6,
  },
  amount: {
    fontSize: 52,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    width: "100%",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: "100%",
    justifyContent: "center",
    marginBottom: 12,
  },
  shareBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  dismissBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  dismissText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
