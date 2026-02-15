import { apiRequest } from "@/lib/query-client";

type EventName =
  | "app_open"
  | "followup_queue_open"
  | "followup_text_tap"
  | "followup_email_tap"
  | "followup_call_tap"
  | "followup_mark_contacted"
  | "followup_snooze"
  | "weekly_recap_open"
  | "opportunities_open"
  | "reactivation_text_tap"
  | "reactivation_email_tap"
  | "reactivation_mark_attempted"
  | "notification_daily_sent"
  | "notification_daily_opened"
  | "notification_weekly_sent"
  | "notification_weekly_opened"
  | "streak_updated"
  | "badge_earned"
  | "preferences_updated";

export async function trackEvent(
  name: EventName,
  properties?: Record<string, any>,
): Promise<void> {
  if (__DEV__) {
    console.log(`[Analytics] ${name}`, properties || {});
  }
  try {
    await apiRequest("POST", "/api/analytics/events", {
      eventName: name,
      properties: properties || {},
    });
  } catch (e) {
    if (__DEV__) {
      console.warn("[Analytics] Failed to track event:", e);
    }
  }
}
