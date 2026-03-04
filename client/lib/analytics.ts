import { apiRequest } from "@/lib/query-client";

type EventName =
  | "app_open"
  | "home_view"
  | "followup_queue_open"
  | "followup_text_tap"
  | "followup_email_tap"
  | "followup_call_tap"
  | "followup_mark_contacted"
  | "followup_action"
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
  | "daily_notification_sent"
  | "daily_notification_opened"
  | "weekly_notification_sent"
  | "weekly_notification_opened"
  | "streak_updated"
  | "streak_increment"
  | "badge_earned"
  | "preferences_updated"
  | "onboarding_started"
  | "onboarding_skipped"
  | "onboarding_goal_selected"
  | "onboarding_business_saved"
  | "onboarding_quote_created"
  | "onboarding_quote_sent"
  | "onboarding_followup_configured"
  | "onboarding_completed"
  | "demo_quote_started"
  | "demo_quote_completed"
  | "first_real_quote_started"
  | "first_real_quote_completed"
  | "paywall_viewed"
  | "cancel_paywall"
  | "trial_started"
  | "subscription_purchase_attempted"
  | "subscription_purchase_success"
  | "subscription_purchase_failed"
  | "restore_purchases_tapped"
  | "restore_purchases_success"
  | "restore_purchases_failed"
  | "ai_message_generated"
  | "quote_completed"
  | "quote_limit_hit"
  | "founder_modal_viewed"
  | "founder_modal_share_tapped"
  | "founder_modal_community_tapped"
  | "founder_modal_dismissed"
  | "share_sheet_opened"
  | "share_completed"
  | "banner_viewed"
  | "banner_dismissed"
  | "banner_share_tapped"
  | "review_eligible"
  | "review_prompt_shown"
  | "review_prompt_dismissed"
  | "review_prompt_leave_review_tapped";

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
