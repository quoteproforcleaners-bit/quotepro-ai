import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiRequest } from "@/lib/query-client";
import { trackEvent } from "@/lib/analytics";

export function setupNotificationHandler() {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn("Failed to setup notification handler:", e);
  }
}

/**
 * Register Android notification channels.
 * Must be called once on app launch before any notifications are scheduled.
 * No-op on iOS and web.
 */
export async function setupAndroidNotificationChannels(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync("quotes", {
      name: "Quote Updates",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
      description: "Alerts when quotes are viewed or accepted by customers",
      enableVibrate: true,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync("jobs", {
      name: "Job Alerts",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      description: "Reminders for upcoming jobs and schedule changes",
      enableVibrate: true,
      showBadge: true,
    });
    await Notifications.setNotificationChannelAsync("growth", {
      name: "Growth & Tips",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
      description: "Weekly recaps and growth coaching tips (silent)",
      enableVibrate: false,
      showBadge: false,
    });
    console.log("[notifications] Android channels registered");
  } catch (e) {
    console.warn("[notifications] Failed to setup Android channels:", e);
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

function getDailyNotificationContent(context?: {
  amountAtRisk?: number;
  quoteCount?: number;
}): { title: string; body: string } | null {
  const amount = context?.amountAtRisk || 0;
  const count = context?.quoteCount || 0;

  if (count === 0 && amount === 0) {
    return null;
  }

  if (amount > 0) {
    return {
      title: `You have $${amount.toLocaleString()} at risk today.`,
      body: count === 1
        ? "1 quote waiting - don't lose it."
        : `${count} quotes need your attention.`,
    };
  }

  if (count === 1) {
    return {
      title: "1 quote waiting - don't lose it.",
      body: "Open your follow-up queue to take action.",
    };
  }

  return {
    title: `${count} quotes need follow-up`,
    body: "Open your follow-up queue to take action.",
  };
}

function getWeeklyRecapContent(context?: {
  quotesSent?: number;
  quotesWon?: number;
  closeRate?: number;
}): { title: string; body: string } {
  const sent = context?.quotesSent || 0;
  const won = context?.quotesWon || 0;
  const rate = context?.closeRate || 0;

  if (sent > 0) {
    return {
      title: `Last week: ${sent} quotes sent, ${won} won. ${rate}% close rate.`,
      body: "Tap to see your full weekly performance breakdown.",
    };
  }

  return {
    title: "Your weekly recap is ready",
    body: "See how your week went and set goals for the next one.",
  };
}

export async function scheduleDailyPulse(
  enabled: boolean,
  time: string = "08:00",
  context?: { amountAtRisk?: number; quoteCount?: number },
) {
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_PULSE_ID).catch(() => {});
    if (!enabled || Platform.OS === "web") return;

    const content = getDailyNotificationContent(context);
    if (!content) return;

    const { hour, minute } = parseTime(time);

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_PULSE_ID,
      content: {
        title: content.title,
        body: content.body,
        sound: true,
        data: { screen: "FollowUpQueue" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    trackEvent("daily_notification_sent");
  } catch (e) {
    console.warn("Failed to schedule daily pulse:", e);
  }
}

export async function scheduleWeeklyRecap(
  enabled: boolean,
  day: number = 1,
  context?: { quotesSent?: number; quotesWon?: number; closeRate?: number },
) {
  try {
    await Notifications.cancelScheduledNotificationAsync(WEEKLY_RECAP_ID).catch(() => {});
    if (!enabled || Platform.OS === "web") return;

    const content = getWeeklyRecapContent(context);

    await Notifications.scheduleNotificationAsync({
      identifier: WEEKLY_RECAP_ID,
      content: {
        title: content.title,
        body: content.body,
        sound: true,
        data: { screen: "WeeklyRecap" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: day === 0 ? 1 : day + 1,
        hour: 9,
        minute: 0,
      },
    });
    trackEvent("weekly_notification_sent");
  } catch (e) {
    console.warn("Failed to schedule weekly recap:", e);
  }
}

export async function syncNotificationSchedule(prefs: {
  dailyPulseEnabled: boolean;
  dailyPulseTime: string;
  weeklyRecapEnabled: boolean;
  weeklyRecapDay: number;
  dailyContext?: { amountAtRisk?: number; quoteCount?: number };
  weeklyContext?: { quotesSent?: number; quotesWon?: number; closeRate?: number };
}) {
  await scheduleDailyPulse(prefs.dailyPulseEnabled, prefs.dailyPulseTime, prefs.dailyContext);
  await scheduleWeeklyRecap(prefs.weeklyRecapEnabled, prefs.weeklyRecapDay, prefs.weeklyContext);
}

const ONBOARDING_NUDGE_ID = "onboarding-nudge";
const ONBOARDING_WIN_ID = "onboarding-first-win";

export async function scheduleOnboardingNudge() {
  try {
    if (Platform.OS === "web") return;
    await Notifications.cancelScheduledNotificationAsync(ONBOARDING_NUDGE_ID).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier: ONBOARDING_NUDGE_ID,
      content: {
        title: "Your first quote is 2 minutes away",
        body: "Finish setup and send a pro quote to your next customer.",
        sound: true,
        data: { screen: "Onboarding" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 24 * 60 * 60,
      },
    });
  } catch (e) {
    console.warn("Failed to schedule onboarding nudge:", e);
  }
}

export async function cancelOnboardingNudge() {
  try {
    await Notifications.cancelScheduledNotificationAsync(ONBOARDING_NUDGE_ID).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(ONBOARDING_WIN_ID).catch(() => {});
  } catch {}
}

export async function scheduleFirstWinCelebration() {
  try {
    if (Platform.OS === "web") return;

    await Notifications.scheduleNotificationAsync({
      identifier: ONBOARDING_WIN_ID,
      content: {
        title: "Your quote is working for you",
        body: "Check the Growth tab for follow-up tips to close the deal.",
        sound: true,
        data: { screen: "GrowthDashboard" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2 * 60 * 60,
      },
    });
  } catch (e) {
    console.warn("Failed to schedule first win celebration:", e);
  }
}

export async function cancelAllScheduledNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn("Failed to cancel notifications:", e);
  }
}
