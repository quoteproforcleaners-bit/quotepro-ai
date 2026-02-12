import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiRequest } from "@/lib/query-client";

export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    return tokenData.data;
  } catch {
    return null;
  }
}

export async function savePushTokenToServer(token: string): Promise<void> {
  try {
    await apiRequest("POST", "/api/push-token", {
      token,
      platform: Platform.OS,
    });
  } catch (error) {
    console.warn("Failed to save push token:", error);
  }
}
