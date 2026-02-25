import React, { useEffect } from "react";
import { StyleSheet, LogBox, Platform, Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import { AuthProvider } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { AIConsentProvider } from "@/context/AIConsentContext";
import { TutorialProvider } from "@/context/TutorialContext";
import { TourOverlay } from "@/components/TourOverlay";
import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary, sendCrashReport } from "@/components/ErrorBoundary";
import { setupNotificationHandler, registerForPushNotificationsAsync, savePushTokenToServer } from "@/lib/notifications";

function SafeKeyboardProvider({ children }: { children: React.ReactNode }) {
  try {
    const { KeyboardProvider: KP } = require("react-native-keyboard-controller");
    return <KP>{children}</KP>;
  } catch (e: any) {
    console.warn("KeyboardProvider failed:", e);
    sendCrashReport(e instanceof Error ? e : new Error(String(e)), undefined, "SafeKeyboardProvider");
    return <>{children}</>;
  }
}

LogBox.ignoreLogs([
  "shadow*",
  "props.pointerEvents",
  "expo-notifications",
]);

const _originalGlobalHandler = typeof ErrorUtils !== "undefined" ? ErrorUtils.getGlobalHandler() : null;
if (typeof ErrorUtils !== "undefined") {
  ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    const msg = error?.message || String(error);
    console.warn("[QuotePro] JS Error (fatal=" + isFatal + "):", msg);
    try {
      const err = error instanceof Error ? error : new Error(msg);
      sendCrashReport(err, undefined, "GlobalHandler_fatal=" + isFatal);
    } catch {}
    try {
      Alert.alert(
        "QuotePro Debug",
        "Error: " + msg.substring(0, 300),
        [{ text: "OK" }]
      );
    } catch {}
    if (isFatal) {
      return;
    }
    if (_originalGlobalHandler) {
      try { _originalGlobalHandler(error, isFatal); } catch {}
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
            <SafeKeyboardProvider>
              <LanguageProvider>
                <AuthProvider>
                  <AppProvider>
                    <SubscriptionProvider>
                      <AIConsentProvider>
                        <NavigationContainer>
                          <RootStackNavigator />
                        </NavigationContainer>
                      </AIConsentProvider>
                    </SubscriptionProvider>
                  </AppProvider>
                </AuthProvider>
              </LanguageProvider>
              <StatusBar style="auto" />
            </SafeKeyboardProvider>
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
