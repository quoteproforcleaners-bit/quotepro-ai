import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Pressable, TextInput, Platform } from "react-native";
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
  onSetRecommended?: () => void;
  onPriceChange?: (newPrice: number) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function QuoteCard({
  option,
  isSelected,
  isRecommended,
  onPress,
  onSetRecommended,
  onPriceChange,
}: QuoteCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceText, setPriceText] = useState(String(option.price));
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setPriceText(String(option.price));
  }, [option.price]);

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

  const handlePriceTap = () => {
    if (!onPriceChange) return;
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setEditingPrice(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handlePriceSubmit = () => {
    const parsed = parseFloat(priceText);
    if (!isNaN(parsed) && parsed >= 0 && onPriceChange) {
      const rounded = Math.round(parsed * 100) / 100;
      onPriceChange(rounded);
      setPriceText(String(rounded));
    } else {
      setPriceText(String(option.price));
    }
    setEditingPrice(false);
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
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
          }}
          style={[styles.recommendedBadge, { backgroundColor: theme.primary }]}
        >
          <Feather name="award" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
          <ThemedText
            type="caption"
            style={{ color: "#FFFFFF", fontWeight: "600" }}
          >
            Recommended
          </ThemedText>
        </Pressable>
      ) : onSetRecommended ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            Haptics.selectionAsync();
            onSetRecommended();
          }}
          style={[styles.setRecommendedBadge, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
          hitSlop={8}
        >
          <Feather name="award" size={11} color={theme.textSecondary} style={{ marginRight: 4 }} />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, fontWeight: "500" }}
          >
            Set as Recommended
          </ThemedText>
        </Pressable>
      ) : null}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <ThemedText type="h4">{option.name}</ThemedText>
          <ThemedText
            type="small"
            style={[styles.serviceType, { color: theme.textSecondary }]}
          >
            {option.serviceTypeName}
          </ThemedText>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            handlePriceTap();
          }}
          style={[
            styles.priceContainer,
            onPriceChange ? {
              backgroundColor: editingPrice ? `${theme.primary}20` : `${theme.primary}08`,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: BorderRadius.sm,
              borderWidth: 1,
              borderColor: editingPrice ? theme.primary : `${theme.primary}25`,
              borderStyle: "dashed" as any,
            } : null,
          ]}
          hitSlop={8}
        >
          {editingPrice ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ThemedText type="h3" style={{ color: theme.primary }}>$</ThemedText>
              <TextInput
                ref={inputRef}
                value={priceText}
                onChangeText={setPriceText}
                onBlur={handlePriceSubmit}
                onSubmitEditing={handlePriceSubmit}
                keyboardType="decimal-pad"
                returnKeyType="done"
                selectTextOnFocus
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: theme.primary,
                  minWidth: 60,
                  padding: 0,
                  margin: 0,
                }}
              />
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <ThemedText type="h3" style={{ color: theme.primary }}>
                ${option.price}
              </ThemedText>
              {onPriceChange ? (
                <Feather name="edit-2" size={13} color={theme.primary} style={{ opacity: 0.6 }} />
              ) : null}
            </View>
          )}
        </Pressable>
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
    flexDirection: "row",
    alignItems: "center",
  },
  setRecommendedBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomLeftRadius: BorderRadius.xs,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
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
