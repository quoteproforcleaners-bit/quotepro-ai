import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import StaffTodayScreen from "@/screens/staff/StaffTodayScreen";
import StaffClockScreen from "@/screens/staff/StaffClockScreen";
import StaffProfileScreen from "@/screens/staff/StaffProfileScreen";
import StaffJobDetailScreen from "@/screens/staff/StaffJobDetailScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

interface Props {
  onSignOut: () => void;
}

function TodayStack() {
  const screenOptions = useScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="StaffToday"
        component={StaffTodayScreen}
        options={{ title: "Today's Jobs" }}
      />
      <Stack.Screen
        name="StaffJobDetail"
        component={StaffJobDetailScreen}
        options={{ title: "Job Details" }}
      />
    </Stack.Navigator>
  );
}

export default function StaffTabNavigator({ onSignOut }: Props) {
  const { theme } = useTheme();
  const screenOptions = useScreenOptions();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#10b981",
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.cardBorder,
        },
      }}
    >
      <Tab.Screen
        name="TodayTab"
        component={TodayStack}
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ClockTab"
        options={{
          title: "Clock",
          tabBarIcon: ({ color, size }) => <Feather name="clock" size={size} color={color} />,
        }}
      >
        {() => (
          <Stack.Navigator screenOptions={screenOptions}>
            <Stack.Screen
              name="StaffClock"
              component={StaffClockScreen}
              options={{ title: "Time & Clock" }}
            />
          </Stack.Navigator>
        )}
      </Tab.Screen>
      <Tab.Screen
        name="ProfileTab"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      >
        {() => (
          <Stack.Navigator screenOptions={screenOptions}>
            <Stack.Screen
              name="StaffProfile"
              options={{ title: "My Profile" }}
            >
              {() => <StaffProfileScreen onSignOut={onSignOut} />}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
