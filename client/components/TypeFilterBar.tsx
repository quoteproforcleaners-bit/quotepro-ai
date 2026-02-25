import React from "react";
import { View, StyleSheet, Platform, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
  runOnJS,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TypeFilterOption<T extends string> {
  label: string;
  value: T;
  icon: keyof typeof Feather.glyphMap;
}

interface TypeFilterBarProps<T extends string> {
  options: TypeFilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function TypeFilterBar<T extends string>({
  options,
  value,
  onChange,
}: TypeFilterBarProps<T>) {
  const { theme, isDark } = useTheme();
  const selectedIndex = options.findIndex((o) => o.value === value);
  const segmentWidth = useSharedValue(0);

  const pillStyle = useAnimatedStyle(() => {
    if (segmentWidth.value === 0) return { opacity: 0 };
    return {
      opacity: 1,
      width: segmentWidth.value - 4,
      transform: [
        {
          translateX: withSpring(selectedIndex * segmentWidth.value + 2, {
            damping: 18,
            stiffness: 220,
            mass: 0.8,
          }),
        },
      ],
    };
  });

  const fireHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleSelect = (val: T) => {
    if (val !== value) {
      fireHaptic();
      onChange(val);
    }
  };

  const bgStart = isDark ? "#0C1524" : "#E8EDF5";
  const bgEnd = isDark ? "#111D32" : "#F0F3F9";

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={[bgStart, bgEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.container,
          {
            shadowColor: isDark ? "#000" : "#334155",
          },
        ]}
        onLayout={(e) => {
          const innerWidth = e.nativeEvent.layout.width - 12;
          segmentWidth.value = innerWidth / options.length;
        }}
      >
        <Animated.View style={[styles.pillTrack, pillStyle]}>
          <LinearGradient
            colors={isDark ? ["#2467DE", "#3B82F6"] : ["#007AFF", "#3B9EFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.pillGradient,
              {
                shadowColor: isDark ? "#3B82F6" : "#007AFF",
              },
            ]}
          />
        </Animated.View>

        {options.map((option, index) => (
          <Segment
            key={option.value}
            option={option}
            isActive={option.value === value}
            onPress={() => handleSelect(option.value)}
            theme={theme}
            isDark={isDark}
          />
        ))}
      </LinearGradient>
    </View>
  );
}

function Segment<T extends string>({
  option,
  isActive,
  onPress,
  theme,
  isDark,
}: {
  option: TypeFilterOption<T>;
  isActive: boolean;
  onPress: () => void;
  theme: any;
  isDark: boolean;
}) {
  const pressed = useSharedValue(0);
  const activeProgress = useSharedValue(isActive ? 1 : 0);

  React.useEffect(() => {
    activeProgress.value = withSpring(isActive ? 1 : 0, {
      damping: 16,
      stiffness: 180,
    });
  }, [isActive]);

  const containerAnimStyle = useAnimatedStyle(() => {
    const scale = isActive
      ? withSpring(1.03 - pressed.value * 0.02, { damping: 20, stiffness: 300 })
      : withSpring(1 - pressed.value * 0.03, { damping: 20, stiffness: 300 });
    return {
      transform: [{ scale }],
    };
  });

  const textAnimStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isActive ? 1 : 0.55, { duration: 150 }),
    };
  });

  const iconColor = isActive ? "#FFFFFF" : (isDark ? theme.textMuted : theme.textSecondary);
  const textColor = isActive ? "#FFFFFF" : (isDark ? theme.textMuted : theme.textSecondary);

  return (
    <AnimatedPressable
      style={[styles.segment, containerAnimStyle]}
      onPress={onPress}
      onPressIn={() => { pressed.value = withTiming(1, { duration: 80 }); }}
      onPressOut={() => { pressed.value = withTiming(0, { duration: 150 }); }}
    >
      <Animated.View style={[styles.segmentInner, textAnimStyle]}>
        <Feather
          name={option.icon}
          size={14}
          color={iconColor}
          style={styles.segmentIcon}
        />
        <ThemedText
          type="small"
          style={[
            styles.segmentText,
            { color: textColor },
            isActive && styles.segmentTextActive,
          ]}
        >
          {option.label}
        </ThemedText>
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  container: {
    flexDirection: "row",
    borderRadius: 24,
    padding: 6,
    position: "relative",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  pillTrack: {
    position: "absolute",
    top: 6,
    bottom: 6,
    left: 0,
    borderRadius: 20,
    overflow: "hidden",
  },
  pillGradient: {
    flex: 1,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    zIndex: 1,
  },
  segmentInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentIcon: {
    marginRight: 5,
  },
  segmentText: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  segmentTextActive: {
    fontWeight: "700",
  },
});
