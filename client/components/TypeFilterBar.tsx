import React from "react";
import { View, StyleSheet, Platform, Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";

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
      width: segmentWidth.value - 6,
      transform: [
        {
          translateX: withSpring(selectedIndex * segmentWidth.value + 3, {
            damping: 16,
            stiffness: 200,
            mass: 0.7,
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

  const outerBg = isDark ? "#0E1929" : "#EAF0F7";

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.glassWrap,
          {
            backgroundColor: outerBg,
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
            shadowColor: isDark ? "#000" : "#64748B",
          },
        ]}
      >
        <View
          style={styles.innerTrack}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            segmentWidth.value = w / options.length;
          }}
        >
          <Animated.View style={[styles.pillOuter, pillStyle]}>
            <LinearGradient
              colors={isDark ? ["#2563EB", "#3B82F6"] : ["#0071E3", "#2E9BFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pillGradient}
            >
              <View style={styles.pillHighlight} />
            </LinearGradient>
            <View
              style={[
                styles.pillGlow,
                { shadowColor: isDark ? "#3B82F6" : "#007AFF" },
              ]}
            />
          </Animated.View>

          {options.map((option) => (
            <Segment
              key={option.value}
              option={option}
              isActive={option.value === value}
              onPress={() => handleSelect(option.value)}
              theme={theme}
              isDark={isDark}
            />
          ))}
        </View>
      </View>
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

  React.useEffect(() => {}, [isActive]);

  const containerAnimStyle = useAnimatedStyle(() => {
    const baseScale = isActive
      ? withSpring(1.03 - pressed.value * 0.02, { damping: 18, stiffness: 260 })
      : withSpring(1 - pressed.value * 0.04, { damping: 18, stiffness: 260 });
    return {
      transform: [{ scale: baseScale }],
      opacity: withTiming(isActive ? 1 : (pressed.value > 0.5 ? 0.6 : 1), { duration: 100 }),
    };
  });

  const inactiveColor = isDark ? "#8E9AB6" : "#64748B";
  const iconColor = isActive ? "#FFFFFF" : inactiveColor;
  const textColor = isActive ? "#FFFFFF" : inactiveColor;

  return (
    <AnimatedPressable
      style={[styles.segment, containerAnimStyle]}
      onPress={onPress}
      onPressIn={() => { pressed.value = withTiming(1, { duration: 60 }); }}
      onPressOut={() => { pressed.value = withTiming(0, { duration: 180 }); }}
    >
      <View style={styles.segmentInner}>
        <Feather
          name={option.icon}
          size={15}
          color={iconColor}
          style={styles.segmentIcon}
        />
        <ThemedText
          type="small"
          style={[
            styles.segmentText,
            { color: textColor },
            isActive ? styles.segmentTextActive : styles.segmentTextInactive,
          ]}
        >
          {option.label}
        </ThemedText>
      </View>
      {isActive ? <View style={styles.activeDot} /> : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  glassWrap: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  innerTrack: {
    flexDirection: "row",
    borderRadius: 22,
    position: "relative",
  },
  pillOuter: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 20,
    overflow: "visible",
  },
  pillGradient: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  pillHighlight: {
    position: "absolute",
    top: 0,
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 1,
  },
  pillGlow: {
    position: "absolute",
    top: 2,
    left: 4,
    right: 4,
    bottom: -2,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 0,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    zIndex: 1,
  },
  segmentInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentIcon: {
    marginRight: 6,
  },
  segmentText: {
    textAlign: "center",
    fontSize: 13,
    letterSpacing: 0.15,
  },
  segmentTextActive: {
    fontWeight: "700",
  },
  segmentTextInactive: {
    fontWeight: "500",
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.5)",
    marginTop: 3,
  },
});
