import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  price?: string;
}

const TRACK_WIDTH = 51;
const TRACK_HEIGHT = 31;
const THUMB_SIZE = 27;
const THUMB_OFFSET = 2;

export function Toggle({
  label,
  description,
  value,
  onChange,
  price,
}: ToggleProps) {
  const { theme } = useTheme();
  const progress = useSharedValue(value ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 200 });
  }, [value, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [theme.backgroundTertiary, theme.primary]
    ),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withSpring(
          progress.value * (TRACK_WIDTH - THUMB_SIZE - THUMB_OFFSET * 2),
          { damping: 20, stiffness: 200 }
        ),
      },
    ],
  }));

  const handlePress = () => {
    Haptics.selectionAsync();
    onChange(!value);
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <View style={styles.content}>
        <ThemedText type="body" style={styles.label}>
          {label}
        </ThemedText>
        {description ? (
          <ThemedText
            type="small"
            style={[styles.description, { color: theme.textSecondary }]}
          >
            {description}
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.rightContent}>
        {price ? (
          <ThemedText
            type="small"
            style={[styles.price, { color: theme.textSecondary }]}
          >
            {price}
          </ThemedText>
        ) : null}
        <Animated.View style={[styles.track, trackStyle]}>
          <Animated.View
            style={[
              styles.thumb,
              { backgroundColor: theme.backgroundDefault },
              thumbStyle,
            ]}
          />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
  },
  content: {
    flex: 1,
    marginRight: Spacing.md,
  },
  label: {
    fontWeight: "500",
  },
  description: {
    marginTop: 2,
  },
  rightContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  price: {
    fontWeight: "500",
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    padding: THUMB_OFFSET,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    boxShadow: "0px 2px 2px rgba(0,0,0,0.1)",
    elevation: 2,
  },
});
