import React, { useEffect } from "react";
import { StyleSheet, LogBox, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import { AuthProvider } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { setupNotificationHandler, registerForPushNotificationsAsync, savePushTokenToServer } from "@/lib/notifications";

LogBox.ignoreLogs([
  "shadow*",
  "props.pointerEvents",
  "expo-notifications",
]);

if (typeof ErrorUtils !== "undefined") {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    console.warn("Global JS error caught:", error?.message || error);
    if (originalHandler) {
      try {
        originalHandler(error, isFatal);
      } catch {}
    }
  });
}

try {
  setupNotificationHandler();
} catch (e) {
  console.warn("Notification handler setup failed:", e);
}

export default function App() {
  useEffect(() => {
    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          savePushTokenToServer(token);
        }
      })
      .catch(() => {});
  }, []);
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <KeyboardProvider>
              <AuthProvider>
                <AppProvider>
                  <SubscriptionProvider>
                    <NavigationContainer>
                      <RootStackNavigator />
                    </NavigationContainer>
                  </SubscriptionProvider>
                </AppProvider>
              </AuthProvider>
              <StatusBar style="auto" />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
