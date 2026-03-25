import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  FlatList,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ModeCard {
  id: "business" | "coach" | "teach";
  label: string;
  icon: string;
  tagline: string;
  exampleQ: string;
  exampleA: string;
  colors: [string, string];
  iconColor: string;
}

const MODES: ModeCard[] = [
  {
    id: "business",
    label: "My Business",
    icon: "bar-chart-2",
    tagline: "Knows your data. Answers in seconds.",
    exampleQ: "Which of my quotes are about to expire this week?",
    exampleA: "You have 3 quotes expiring this week. Your largest is $340 for a 4-bed home sent 5 days ago. I'd follow up today — want me to draft the message?",
    colors: ["#1e3a5f", "#0c1a3a"],
    iconColor: "#60a5fa",
  },
  {
    id: "coach",
    label: "Coach Me",
    icon: "target",
    tagline: "Handles objections. Closes more jobs.",
    exampleQ: "How do I handle a customer who says my price is too high?",
    exampleA: "Don't drop your price. Anchor to your value. Say: 'Our clients tell us the reliability is worth every dollar. What specifically concerns you?' Then listen and address the real objection.",
    colors: ["#3b1f5e", "#1a0c3a"],
    iconColor: "#c084fc",
  },
  {
    id: "teach",
    label: "Teach Me",
    icon: "book-open",
    tagline: "Industry knowledge, on demand.",
    exampleQ: "What's a good profit margin for a residential cleaning business?",
    exampleA: "Aim for 15–25% net margin. Most owners run 40–55% gross before labor. Key levers: minimize drive time, match crew size to job, price recurring clients at a 5–10% discount that still clears 20% net.",
    colors: ["#1a3d2b", "#0c1a15"],
    iconColor: "#4ade80",
  },
];

const FINAL_CARD = { id: "final" };

interface Props {
  onDone: () => void;
}

export default function AIAgentIntroScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const allCards = [...MODES, FINAL_CARD];
  const isLastCard = currentIndex === allCards.length - 1;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < allCards.length - 1) {
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    }
  };

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDone();
  };

  const handleSkip = () => {
    onDone();
  };

  const renderModeCard = ({ item }: { item: ModeCard | typeof FINAL_CARD }) => {
    if (item.id === "final") {
      return (
        <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
          <LinearGradient colors={["#020617", "#0f172a"]} style={StyleSheet.absoluteFill} />
          <View style={styles.finalContent}>
            <View style={styles.finalIconWrap}>
              <Feather name="cpu" size={40} color="#60a5fa" />
            </View>
            <Text style={styles.finalHeading}>Your AI coach is ready</Text>
            <Text style={styles.finalSub}>
              3 modes. Unlimited questions. Zero judgment.
            </Text>

            <View style={styles.finalModeList}>
              {MODES.map((m) => (
                <View key={m.id} style={styles.finalModeRow}>
                  <Feather name={m.icon as any} size={14} color={m.iconColor} />
                  <Text style={styles.finalModeLabel}>{m.label}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.85}>
              <LinearGradient colors={["#3b82f6", "#2563eb"]} style={styles.startGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.startButtonText}>Start asking</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const card = item as ModeCard;
    return (
      <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
        <LinearGradient colors={["#020617", "#0f172a"]} style={StyleSheet.absoluteFill} />
        <View style={styles.cardContent}>
          <View style={[styles.modeIconBubble, { backgroundColor: card.iconColor + "20" }]}>
            <Feather name={card.icon as any} size={32} color={card.iconColor} />
          </View>
          <Text style={styles.modeLabel}>{card.label}</Text>
          <Text style={[styles.modeTagline, { color: card.iconColor }]}>{card.tagline}</Text>

          {/* Q&A preview */}
          <View style={styles.qaCard}>
            <LinearGradient colors={card.colors} style={styles.qaGradient}>
              <View style={styles.questionBubble}>
                <Text style={styles.questionText}>"{card.exampleQ}"</Text>
              </View>
              <View style={styles.answerRow}>
                <View style={[styles.aiAvatar, { backgroundColor: card.iconColor + "25" }]}>
                  <Feather name="cpu" size={12} color={card.iconColor} />
                </View>
                <View style={styles.answerBubble}>
                  <Text style={styles.answerText}>{card.exampleA}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.nextButtonText}>Next</Text>
            <Feather name="arrow-right" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient colors={["#020617", "#0f172a", "#0c1a3a"]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <Feather name="cpu" size={18} color="#60a5fa" />
          <Text style={styles.headerTitle}>AI Business Coach</Text>
        </View>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Progress dots */}
      <View style={styles.dotsRow}>
        {allCards.map((_, i) => (
          <View
            key={i}
            style={[styles.progressDot, currentIndex === i && styles.progressDotActive, currentIndex > i && styles.progressDotDone]}
          />
        ))}
      </View>

      {/* Cards */}
      <FlatList
        ref={flatListRef}
        data={allCards}
        renderItem={renderModeCard}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
        style={{ flex: 1 }}
      />

      <View style={{ height: insets.bottom + 24 }} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingBottom: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 15, fontWeight: "700", color: "#e2e8f0" },
  skipText: { fontSize: 14, color: "#64748b" },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6, paddingBottom: 20 },
  progressDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#1e293b" },
  progressDotActive: { width: 20, backgroundColor: "#3b82f6" },
  progressDotDone: { backgroundColor: "#1d4ed8" },

  slide: { flex: 1, justifyContent: "center" },
  cardContent: { paddingHorizontal: 28, alignItems: "center" },
  modeIconBubble: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  modeLabel: { fontSize: 32, fontWeight: "800", color: "#f1f5f9", marginBottom: 6 },
  modeTagline: { fontSize: 15, fontWeight: "500", marginBottom: 28 },
  qaCard: { width: "100%", borderRadius: 20, overflow: "hidden", marginBottom: 40 },
  qaGradient: { padding: 20, gap: 16 },
  questionBubble: {
    backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 14, padding: 14,
    alignSelf: "flex-end", maxWidth: "85%",
  },
  questionText: { color: "#e2e8f0", fontSize: 13, fontStyle: "italic", lineHeight: 18 },
  answerRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  aiAvatar: {
    width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center",
  },
  answerBubble: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)", borderRadius: 14, padding: 14 },
  answerText: { color: "#cbd5e1", fontSize: 13, lineHeight: 19 },
  nextButton: { flexDirection: "row", alignItems: "center", gap: 6 },
  nextButtonText: { fontSize: 15, color: "#94a3b8", fontWeight: "600" },

  finalContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  finalIconWrap: {
    width: 90, height: 90, borderRadius: 28,
    backgroundColor: "rgba(59,130,246,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  finalHeading: { fontSize: 30, fontWeight: "800", color: "#f1f5f9", textAlign: "center", marginBottom: 10 },
  finalSub: { fontSize: 15, color: "#64748b", textAlign: "center", marginBottom: 32, lineHeight: 22 },
  finalModeList: { gap: 12, marginBottom: 40, width: "100%" },
  finalModeRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 },
  finalModeLabel: { fontSize: 15, fontWeight: "600", color: "#94a3b8" },
  startButton: { width: "100%", borderRadius: 18, overflow: "hidden" },
  startGradient: { paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  startButtonText: { fontSize: 18, fontWeight: "800", color: "#fff" },
});
