import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";
import DashboardScreen from "@/screens/DashboardScreen";
import CustomersScreen from "@/screens/CustomersScreen";
import QuotesScreen from "@/screens/QuotesScreen";
import JobsScreen from "@/screens/JobsScreen";
import RevenueScreen from "@/screens/RevenueScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type MainTabParamList = {
  HomeTab: undefined;
  CustomersTab: undefined;
  QuotesTab: undefined;
  JobsTab: undefined;
  RevenueTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const screenOptions = useScreenOptions();
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
          }),
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
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
          title: "Home",
          headerTitle: () => <HeaderTitle title="QuotePro" />,
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CustomersTab"
        component={CustomersScreen}
        options={{
          title: "Customers",
          headerTitle: "Customers",
          tabBarIcon: ({ color, size }) => (
            <Feather name="users" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="QuotesTab"
        component={QuotesScreen}
        options={{
          title: "Quotes",
          headerTitle: "Quotes",
          tabBarIcon: ({ color, size }) => (
            <Feather name="file-text" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="JobsTab"
        component={JobsScreen}
        options={{
          title: "Jobs",
          headerTitle: "Jobs",
          tabBarIcon: ({ color, size }) => (
            <Feather name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="RevenueTab"
        component={RevenueScreen}
        options={{
          title: "Revenue",
          headerTitle: "Revenue",
          tabBarIcon: ({ color, size }) => (
            <Feather name="trending-up" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: "Settings",
          headerTitle: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
