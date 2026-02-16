import React, { useCallback, useMemo } from "react";
import { View, Platform, StyleSheet, Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { HeaderButton } from "@react-navigation/elements";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import DashboardScreen from "@/screens/DashboardScreen";
import CustomersScreen from "@/screens/CustomersScreen";
import QuotesScreen from "@/screens/QuotesScreen";
import JobsScreen from "@/screens/JobsScreen";
import GrowthDashboardScreen from "@/screens/GrowthDashboardScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useLanguage } from "@/context/LanguageContext";

export type MainTabParamList = {
  HomeTab: undefined;
  CustomersTab: undefined;
  QuotesTab: undefined;
  JobsTab: undefined;
  GrowthTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const pillSpring: WithSpringConfig = {
  damping: 18,
  mass: 0.6,
  stiffness: 200,
  overshootClamping: false,
};

function TabIcon({ name, color, size, focused, isHome, badgeCount }: {
  name: keyof typeof Feather.glyphMap;
  color: string;
  size: number;
  focused: boolean;
  isHome?: boolean;
  badgeCount?: number;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(focused ? 1 : 0);
  const iconScale = useSharedValue(focused ? 1.08 : 1);

  React.useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0, pillSpring);
    iconScale.value = withSpring(focused ? 1.08 : 1, pillSpring);
  }, [focused]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: scale.value * 0.12,
    transform: [{ scaleX: 0.6 + scale.value * 0.4 }, { scaleY: 0.6 + scale.value * 0.4 }],
  }));

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const showBadge = badgeCount != null && badgeCount > 0;

  return (
    <View style={styles.tabIconWrapper}>
      <Animated.View
        style={[
          styles.pill,
          { backgroundColor: theme.primary },
          pillStyle,
        ]}
      />
      <Animated.View style={iconAnimStyle}>
        <Feather name={name} size={focused ? size + 2 : size} color={color} />
      </Animated.View>
      {isHome && focused ? (
        <View style={[styles.boltBadge, { backgroundColor: theme.primary }]}>
          <Feather name="zap" size={8} color="#FFF" />
        </View>
      ) : null}
      {showBadge ? (
        <View style={styles.notifBadge}>
          <Text style={styles.notifBadgeText}>
            {badgeCount > 99 ? "99+" : String(badgeCount)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function QuotesHeaderRight() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  return (
    <HeaderButton onPress={() => navigation.navigate("QuotePreferences")}>
      <Feather name="settings" size={22} color={theme.primary} />
    </HeaderButton>
  );
}

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const screenOptions = useScreenOptions();
  const { t } = useLanguage();

  const { data: growthTasks = [] } = useQuery<any[]>({ queryKey: ["/api/growth-tasks"] });
  const pendingTaskCount = useMemo(() =>
    (growthTasks || []).filter((t: any) => t.status === "pending").length,
  [growthTasks]);

  const handleTabPress = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          height: Platform.select({ ios: 86, android: 72, default: 72 }),
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundDefault,
            default: theme.backgroundDefault,
          }),
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          elevation: 12,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: isDark ? 0.3 : 0.08,
              shadowRadius: 12,
            },
            default: {},
          }),
          paddingTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          gap: 2,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
          letterSpacing: 0.2,
        },
        tabBarBackground: () => {
          if (Platform.OS !== "ios") return null;
          try {
            return (
              <View style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" }]}>
                <BlurView
                  intensity={isDark ? 80 : 100}
                  tint={isDark ? "dark" : "light"}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            );
          } catch {
            return (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundDefault, borderTopLeftRadius: 24, borderTopRightRadius: 24 }]} />
            );
          }
        },
        headerTitleAlign: screenOptions.headerTitleAlign,
        headerTransparent: screenOptions.headerTransparent,
        headerTintColor: screenOptions.headerTintColor,
        headerStyle: screenOptions.headerStyle as any,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={DashboardScreen}
        options={{
          title: t.tabs.home,
          headerTitle: () => <HeaderTitle title="QuotePro" />,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="home" color={color} size={size} focused={focused} isHome />
          ),
        }}
        listeners={{ tabPress: handleTabPress }}
      />
      <Tab.Screen
        name="CustomersTab"
        component={CustomersScreen}
        options={{
          title: t.tabs.customers,
          headerTitle: t.tabs.customers,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="users" color={color} size={size} focused={focused} />
          ),
        }}
        listeners={{ tabPress: handleTabPress }}
      />
      <Tab.Screen
        name="QuotesTab"
        component={QuotesScreen}
        options={{
          title: t.tabs.quotes,
          headerTitle: t.tabs.quotes,
          headerRight: () => <QuotesHeaderRight />,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="file-text" color={color} size={size} focused={focused} />
          ),
        }}
        listeners={{ tabPress: handleTabPress }}
      />
      <Tab.Screen
        name="JobsTab"
        component={JobsScreen}
        options={{
          title: t.tabs.jobs,
          headerTitle: t.tabs.jobs,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="calendar" color={color} size={size} focused={focused} />
          ),
        }}
        listeners={{ tabPress: handleTabPress }}
      />
      <Tab.Screen
        name="GrowthTab"
        component={GrowthDashboardScreen}
        options={{
          title: t.tabs.growth,
          headerTitle: t.tabs.growth,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="trending-up" color={color} size={size} focused={focused} badgeCount={pendingTaskCount} />
          ),
        }}
        listeners={{ tabPress: handleTabPress }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: t.tabs.settings,
          headerTitle: t.tabs.settings,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="settings" color={color} size={size} focused={focused} />
          ),
        }}
        listeners={{ tabPress: handleTabPress }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconWrapper: {
    width: 48,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  boltBadge: {
    position: "absolute",
    top: -2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  notifBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 12,
  },
});
