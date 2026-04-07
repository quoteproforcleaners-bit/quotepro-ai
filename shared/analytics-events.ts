/**
 * shared/analytics-events.ts
 * Typed enum of every trackable funnel event across web and mobile.
 * Import on both client and server — no platform-specific code here.
 */

export const AnalyticsEvents = {
  // ─── Acquisition ────────────────────────────────────────────────────────────
  ACCOUNT_CREATED: "account_created",
  TRIAL_STARTED: "trial_started",

  // ─── Security ───────────────────────────────────────────────────────────────
  INVALID_FILE_UPLOAD_REJECTED: "invalid_file_upload_rejected",

  // ─── Activation (first value moments) ──────────────────────────────────────
  FIRST_QUOTE_CREATED: "first_quote_created",
  FIRST_QUOTE_SENT: "first_quote_sent",
  FIRST_QUOTE_VIEWED_BY_CUSTOMER: "first_quote_viewed",
  FIRST_QUOTE_ACCEPTED: "first_quote_accepted",
  FIRST_JOB_COMPLETED: "first_job_completed",

  // ─── Engagement ─────────────────────────────────────────────────────────────
  AI_AGENT_OPENED: "ai_agent_opened",
  AI_AGENT_MY_BUSINESS_USED: "ai_agent_my_business",
  AI_AGENT_COACH_USED: "ai_agent_coach",
  AI_FOLLOWUP_SENT: "ai_followup_sent",
  AI_FOLLOWUP_CONVERTED: "ai_followup_converted",
  CALCULATOR_USED: "calculator_used",

  // ─── Revenue ────────────────────────────────────────────────────────────────
  UPGRADE_CLICKED: "upgrade_clicked",
  UPGRADE_COMPLETED: "upgrade_completed",
  PLAN_CHANGED: "plan_changed",

  // ─── Retention signals ──────────────────────────────────────────────────────
  DAY_7_ACTIVE: "day_7_active",
  DAY_14_ACTIVE: "day_14_active",
  DAY_30_ACTIVE: "day_30_active",

  // ─── Churn signals ──────────────────────────────────────────────────────────
  CANCEL_INITIATED: "cancel_initiated",
  QUOTE_QUOTA_HIT: "quote_quota_hit",

  // ─── Internal churn signal markers (not displayed in funnel) ────────────────
  CHURN_RISK_INACTIVE_TRIAL: "churn_risk_inactive_trial",
  CHURN_RISK_PAID_INACTIVE: "churn_risk_paid_inactive",
  CHURN_RISK_UPGRADE_ABANDONED: "churn_risk_upgrade_abandoned",
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

/** Core funnel steps in order, used for admin dashboard ordering. */
export const FUNNEL_STEPS: AnalyticsEventName[] = [
  AnalyticsEvents.ACCOUNT_CREATED,
  AnalyticsEvents.TRIAL_STARTED,
  AnalyticsEvents.FIRST_QUOTE_SENT,
  AnalyticsEvents.FIRST_QUOTE_ACCEPTED,
  AnalyticsEvents.UPGRADE_COMPLETED,
  AnalyticsEvents.DAY_30_ACTIVE,
];
