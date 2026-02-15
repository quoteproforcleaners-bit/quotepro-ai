import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiRequest } from "@/lib/query-client";

export function setupNotificationHandler() {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.warn("Failed to setup notification handler:", e);
  }
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return null;
    if (!Device.isDevice) return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.log("No EAS projectId found, skipping push token registration");
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return null;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenData.data;
  } catch (e) {
    console.warn("Push notification registration failed:", e);
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

const DAILY_PULSE_ID = "daily-pulse-notification";
const WEEKLY_RECAP_ID = "weekly-recap-notification";

function parseTime(timeStr: string): { hour: number; minute: number } {
  const [h, m] = timeStr.split(":").map(Number);
  return { hour: h || 8, minute: m || 0 };
}

export async function scheduleDailyPulse(enabled: boolean, time: string = "08:00") {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_PULSE_ID).catch(() => {});
    if (!enabled || Platform.OS === "web") return;

    const { hour, minute } = parseTime(time);

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_PULSE_ID,
      content: {
        title: "Your daily follow-up list is ready",
        body: "Check your follow-up queue and keep your streak going!",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch (e) {
    console.warn("Failed to schedule daily pulse:", e);
  }
}

export async function scheduleWeeklyRecap(enabled: boolean, day: number = 1) {
  try {
    await Notifications.cancelScheduledNotificationAsync(WEEKLY_RECAP_ID).catch(() => {});
    if (!enabled || Platform.OS === "web") return;

    await Notifications.scheduleNotificationAsync({
      identifier: WEEKLY_RECAP_ID,
      content: {
        title: "Your weekly recap is ready",
        body: "See how your week went and plan for the next one.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: day === 0 ? 1 : day + 1,
        hour: 9,
        minute: 0,
      },
    });
  } catch (e) {
    console.warn("Failed to schedule weekly recap:", e);
  }
}

export async function syncNotificationSchedule(prefs: {
  dailyPulseEnabled: boolean;
  dailyPulseTime: string;
  weeklyRecapEnabled: boolean;
  weeklyRecapDay: number;
}) {
  await scheduleDailyPulse(prefs.dailyPulseEnabled, prefs.dailyPulseTime);
  await scheduleWeeklyRecap(prefs.weeklyRecapEnabled, prefs.weeklyRecapDay);
}

export async function cancelAllScheduledNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn("Failed to cancel notifications:", e);
  }
}
