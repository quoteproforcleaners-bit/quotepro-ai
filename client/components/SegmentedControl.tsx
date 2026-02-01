import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { theme } = useTheme();
  const selectedIndex = options.findIndex((o) => o.value === value);
  const segmentWidth = useSharedValue(0);
  const containerWidth = useSharedValue(0);

  const indicatorStyle = useAnimatedStyle(() => {
    if (segmentWidth.value === 0) return { opacity: 0 };
    return {
      opacity: 1,
      transform: [
        {
          translateX: withSpring(selectedIndex * segmentWidth.value, {
            damping: 20,
            stiffness: 200,
          }),
        },
      ],
      width: segmentWidth.value,
    };
  });

  const handleSelect = (val: T) => {
    if (val !== value) {
      Haptics.selectionAsync();
      onChange(val);
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}
      onLayout={(e) => {
        containerWidth.value = e.nativeEvent.layout.width;
        segmentWidth.value = e.nativeEvent.layout.width / options.length;
      }}
    >
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: theme.backgroundDefault },
          indicatorStyle,
        ]}
      />
      {options.map((option) => (
        <Pressable
          key={option.value}
          style={styles.segment}
          onPress={() => handleSelect(option.value)}
        >
          <ThemedText
            type="small"
            style={[
              styles.segmentText,
              option.value === value && { fontWeight: "600" },
            ]}
          >
            {option.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: BorderRadius.xs,
    padding: 4,
    position: "relative",
  },
  indicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    borderRadius: BorderRadius.xs - 2,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    zIndex: 1,
  },
  segmentText: {
    textAlign: "center",
  },
});
