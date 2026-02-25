import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ProBadge } from "@/components/ProBadge";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface QuoteListItemProps {
  quote: any;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function QuoteListItem({ quote, onPress }: QuoteListItemProps) {
  const { theme, isDark } = useTheme();
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

  const statusColors: Record<string, string> = {
    draft: theme.warning,
    sent: theme.primary,
    accepted: theme.success,
    declined: theme.error,
    expired: theme.textSecondary,
  };

  const statusLabels: Record<string, string> = {
    draft: "Draft",
    sent: "Sent",
    accepted: "Accepted",
    declined: "Declined",
    expired: "Expired",
  };

  const price = quote.total || 0;
  const customerName = quote.customerName || quote.propertyDetails?.customerName || quote.customer?.name || (quote.customerId ? "Customer" : "Quick Quote");
  const beds = quote.propertyBeds ?? quote.homeDetails?.beds ?? 0;
  const baths = quote.propertyBaths ?? quote.homeDetails?.baths ?? 0;
  const sqft = quote.propertySqft ?? quote.homeDetails?.sqft ?? 0;
  const status = quote.status || "draft";
  const statusColor = statusColors[status] || theme.textSecondary;
  const isCommercial = quote.propertyDetails && typeof quote.propertyDetails === "object" && quote.propertyDetails.quoteType === "commercial";

  const formattedDate = new Date(quote.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const commercialBorderColor = isDark
    ? "rgba(47, 123, 255, 0.18)"
    : "rgba(0, 122, 255, 0.12)";
  const defaultBorderColor = theme.border;

  const accentLineColor = isDark
    ? "rgba(47, 123, 255, 0.35)"
    : "rgba(0, 122, 255, 0.2)";

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        {
          backgroundColor: theme.cardBackground,
          borderColor: isCommercial ? commercialBorderColor : defaultBorderColor,
        },
        animatedStyle,
      ]}
      testID={`quote-row-${quote.id}`}
    >
      {isCommercial ? (
        <View style={[styles.accentLine, { backgroundColor: accentLineColor }]} />
      ) : null}

      {isCommercial ? (
        <View style={styles.cornerAccent}>
          <LinearGradient
            colors={isDark
              ? ["rgba(47,123,255,0.12)", "transparent"]
              : ["rgba(0,122,255,0.06)", "transparent"]
            }
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.cornerGradient}
          />
        </View>
      ) : null}

      <View style={[styles.content, isCommercial && styles.contentCommercial]}>
        <View style={styles.header}>
          <View style={styles.nameRow}>
            <ThemedText type="body" style={{ fontWeight: "600", flex: 1 }}>
              {customerName}
            </ThemedText>
            {isCommercial ? <ProBadge size="small" /> : null}
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor}15` },
            ]}
          >
            <ThemedText
              type="caption"
              style={{ color: statusColor, fontWeight: "600" }}
            >
              {statusLabels[status] || status}
            </ThemedText>
          </View>
        </View>

        <View style={styles.detailsRow}>
          {isCommercial ? (
            <View style={styles.commercialDetails}>
              <View style={styles.detailWithIcon}>
                <Feather name="briefcase" size={11} color={theme.textSecondary} style={styles.detailIcon} />
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {sqft > 0 ? `${sqft.toLocaleString()} sqft` : "Commercial"}
                </ThemedText>
              </View>
              <ThemedText
                type="caption"
                style={[styles.proposalLabel, { color: isDark ? theme.primary : theme.accent }]}
              >
                Commercial Proposal
              </ThemedText>
            </View>
          ) : (
            <ThemedText
              type="small"
              style={[styles.details, { color: theme.textSecondary }]}
            >
              {beds} bed, {baths} bath - {sqft} sqft
            </ThemedText>
          )}
        </View>

        <View style={styles.footer}>
          <ThemedText type="h4" style={{ color: theme.primary }}>
            ${price.toFixed(0)}
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
    overflow: "hidden",
    position: "relative",
  },
  accentLine: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  cornerAccent: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 60,
    height: 60,
    overflow: "hidden",
    borderTopRightRadius: BorderRadius.sm,
  },
  cornerGradient: {
    width: 60,
    height: 60,
  },
  content: {
    flex: 1,
  },
  contentCommercial: {
    paddingLeft: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
    marginRight: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  detailsRow: {
    marginBottom: Spacing.sm,
  },
  details: {},
  commercialDetails: {
    gap: 2,
  },
  detailWithIcon: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailIcon: {
    marginRight: 4,
  },
  proposalLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
