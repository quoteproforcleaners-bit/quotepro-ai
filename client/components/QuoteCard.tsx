import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { QuoteOption } from "@/types";

interface QuoteCardProps {
  option: QuoteOption;
  isSelected: boolean;
  isRecommended?: boolean;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function QuoteCard({
  option,
  isSelected,
  isRecommended,
  onPress,
}: QuoteCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        {
          backgroundColor: theme.cardBackground,
          borderColor: isSelected ? theme.primary : theme.border,
          borderWidth: isSelected ? 2 : 1,
        },
        animatedStyle,
      ]}
    >
      {isRecommended ? (
        <View
          style={[styles.recommendedBadge, { backgroundColor: theme.primary }]}
        >
          <ThemedText
            type="caption"
            style={{ color: "#FFFFFF", fontWeight: "600" }}
          >
            Recommended
          </ThemedText>
        </View>
      ) : null}
      <View style={styles.header}>
        <View>
          <ThemedText type="h4">{option.name}</ThemedText>
          <ThemedText
            type="small"
            style={[styles.serviceType, { color: theme.textSecondary }]}
          >
            {option.serviceTypeName}
          </ThemedText>
        </View>
        <View style={styles.priceContainer}>
          <ThemedText type="h3" style={{ color: theme.primary }}>
            ${option.price}
          </ThemedText>
        </View>
      </View>
      <ThemedText
        type="small"
        style={[styles.scope, { color: theme.textSecondary }]}
      >
        {option.scope}
      </ThemedText>
      {option.addOnsIncluded.length > 0 ? (
        <View style={styles.addOns}>
          {option.addOnsIncluded.map((addOn) => (
            <View
              key={addOn}
              style={[
                styles.addOnChip,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <Feather
                name="check"
                size={12}
                color={theme.success}
                style={styles.addOnIcon}
              />
              <ThemedText type="caption">{addOn}</ThemedText>
            </View>
          ))}
        </View>
      ) : null}
      <View style={styles.selectIndicator}>
        <View
          style={[
            styles.radio,
            {
              borderColor: isSelected ? theme.primary : theme.border,
              backgroundColor: isSelected ? theme.primary : "transparent",
            },
          ]}
        >
          {isSelected ? (
            <Feather name="check" size={14} color="#FFFFFF" />
          ) : null}
        </View>
        <ThemedText
          type="small"
          style={{ color: isSelected ? theme.primary : theme.textSecondary }}
        >
          {isSelected ? "Selected" : "Select this option"}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    position: "relative",
    overflow: "hidden",
  },
  recommendedBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderBottomLeftRadius: BorderRadius.xs,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  serviceType: {
    marginTop: 2,
    textTransform: "capitalize",
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  scope: {
    marginBottom: Spacing.md,
  },
  addOns: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  addOnChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  addOnIcon: {
    marginRight: 4,
  },
  selectIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
