import React, { useEffect } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { PaperProvider } from "react-native-paper";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import { AuthProvider } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";
import { SubscriptionProvider } from "@/context/SubscriptionContext";
import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { setupNotificationHandler, registerForPushNotificationsAsync, savePushTokenToServer } from "@/lib/notifications";
import { PaperDarkTheme, PaperLightTheme } from "@/theme/paperTheme";

setupNotificationHandler();

export default function App() {
  const colorScheme = useColorScheme();
  const paperTheme = colorScheme === "dark" ? PaperDarkTheme : PaperLightTheme;

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        savePushTokenToServer(token);
      }
    });
  }, []);
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <PaperProvider theme={paperTheme}>
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
          </PaperProvider>
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
