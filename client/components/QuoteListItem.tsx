import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Quote } from "@/types";

interface QuoteListItemProps {
  quote: Quote;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function QuoteListItem({ quote, onPress }: QuoteListItemProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const statusColors = {
    draft: theme.warning,
    sent: theme.primary,
    accepted: theme.success,
    expired: theme.textSecondary,
  };

  const statusLabels = {
    draft: "Draft",
    sent: "Sent",
    accepted: "Accepted",
    expired: "Expired",
  };

  const selectedOption = quote.options[quote.selectedOption];
  const formattedDate = new Date(quote.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>
            {quote.customer.name}
          </ThemedText>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${statusColors[quote.status]}15` },
            ]}
          >
            <ThemedText
              type="caption"
              style={{ color: statusColors[quote.status], fontWeight: "600" }}
            >
              {statusLabels[quote.status]}
            </ThemedText>
          </View>
        </View>
        <ThemedText
          type="small"
          style={[styles.details, { color: theme.textSecondary }]}
        >
          {quote.homeDetails.beds} bed, {quote.homeDetails.baths} bath -{" "}
          {quote.homeDetails.sqft} sqft
        </ThemedText>
        <View style={styles.footer}>
          <ThemedText type="h4" style={{ color: theme.primary }}>
            ${selectedOption.price}
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary }}
          >
            {formattedDate}
          </ThemedText>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  details: {
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
