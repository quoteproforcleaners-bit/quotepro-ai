import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  jsonb,
  integer,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  authProvider: text("auth_provider").notNull().default("email"),
  providerId: text("provider_id"),
  subscriptionTier: text("subscription_tier").notNull().default("free"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const businesses = pgTable("businesses", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ownerUserId: varchar("owner_user_id")
    .notNull()
    .references(() => users.id),
  companyName: text("company_name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  logoUri: text("logo_uri"),
  primaryColor: text("primary_color").notNull().default("#2563EB"),
  senderName: text("sender_name").notNull().default(""),
  senderTitle: text("sender_title").notNull().default(""),
  bookingLink: text("booking_link").notNull().default(""),
  emailSignature: text("email_signature").notNull().default(""),
  smsSignature: text("sms_signature").notNull().default(""),
  timezone: text("timezone").notNull().default("America/New_York"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  stripeAccountId: text("stripe_account_id"),
  stripeOnboardingComplete: boolean("stripe_onboarding_complete").notNull().default(false),
  venmoHandle: text("venmo_handle"),
  cashappHandle: text("cashapp_handle"),
  paymentOptions: jsonb("payment_options"),
  paymentNotes: text("payment_notes"),
  quotePreferences: jsonb("quote_preferences"),
  avatarConfig: jsonb("avatar_config"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pricingSettings = pgTable("pricing_settings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id),
  settings: jsonb("settings").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  address: text("address").notNull().default(""),
  notes: text("notes").notNull().default(""),
  tags: jsonb("tags").notNull().default(sql`'[]'::jsonb`),
  leadSource: text("lead_source"),
  status: text("status").notNull().default("lead"),
  smsOptOut: boolean("sms_opt_out").notNull().default(false),
  isVip: boolean("is_vip").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const quotes = pgTable("quotes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id),
  customerId: varchar("customer_id")
    .references(() => customers.id),
  propertyBeds: integer("property_beds").notNull().default(0),
  propertyBaths: real("property_baths").notNull().default(0),
  propertySqft: integer("property_sqft").notNull().default(0),
  propertyDetails: jsonb("property_details").notNull().default(sql`'{}'::jsonb`),
  addOns: jsonb("add_ons").notNull().default(sql`'{}'::jsonb`),
  frequencySelected: text("frequency_selected").notNull().default("one-time"),
  selectedOption: text("selected_option").notNull().default("better"),
  options: jsonb("options").notNull().default(sql`'{}'::jsonb`),
  subtotal: real("subtotal").notNull().default(0),
  tax: real("tax").notNull().default(0),
  total: real("total").notNull().default(0),
  status: text("status").notNull().default("draft"),
  sentVia: text("sent_via"),
  sentAt: timestamp("sent_at"),
  acceptedAt: timestamp("accepted_at"),
  declinedAt: timestamp("declined_at"),
  expiresAt: timestamp("expires_at"),
  publicToken: varchar("public_token").default(sql`gen_random_uuid()`),
  viewedAt: timestamp("viewed_at"),
  depositRequired: boolean("deposit_required").notNull().default(false),
  depositAmount: real("deposit_amount"),
  depositType: text("deposit_type").notNull().default("fixed"),
  depositPaid: boolean("deposit_paid").notNull().default(false),
  depositPaidAt: timestamp("deposit_paid_at"),
  emailDraft: text("email_draft"),
  smsDraft: text("sms_draft"),
  lastContactAt: timestamp("last_contact_at"),
  closeProbability: integer("close_probability"),
  expectedValue: real("expected_value"),
  aiNotes: text("ai_notes"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  paymentIntentId: text("payment_intent_id"),
  paymentAmount: real("payment_amount"),
  paidAt: timestamp("paid_at"),
  recommendedOption: text("recommended_option").notNull().default("better"),
  acceptedFrequency: text("accepted_frequency"),
  acceptedSource: text("accepted_source"),
  acceptedNotes: text("accepted_notes"),
  acceptedPreferences: jsonb("accepted_preferences").default(sql`'{}'::jsonb`),
  nudgeSentAt: timestamp("nudge_sent_at"),
  reviewRequestSentAt: timestamp("review_request_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const salesRecommendations = pgTable("sales_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").references(() => customers.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  rationale: text("rationale").notNull().default(""),
  suggestedDate: timestamp("suggested_date"),
  actionPayload: jsonb("action_payload").notNull().default(sql`'{}'::jsonb`),
  status: text("status").notNull().default("open"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quoteFollowUps = pgTable("quote_follow_ups", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id),
  scheduledFor: timestamp("scheduled_for").notNull(),
  channel: text("channel").notNull().default("sms"),
  message: text("message").notNull().default(""),
  status: text("status").notNull().default("scheduled"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quoteLineItems = pgTable("quote_line_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull().default(0),
  totalPrice: real("total_price").notNull().default(0),
  type: text("type").notNull().default("base"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id),
  customerId: varchar("customer_id")
    .references(() => customers.id),
  quoteId: varchar("quote_id")
    .references(() => quotes.id),
  jobType: text("job_type").notNull().default("regular"),
  status: text("status").notNull().default("scheduled"),
  startDatetime: timestamp("start_datetime").notNull(),
  endDatetime: timestamp("end_datetime"),
  recurrence: text("recurrence").notNull().default("none"),
  internalNotes: text("internal_notes").notNull().default(""),
  address: text("address").notNull().default(""),
  total: real("total"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  enRouteAt: timestamp("en_route_at"),
  serviceStartedAt: timestamp("service_started_at"),
  satisfactionRating: integer("satisfaction_rating"),
  ratingComment: text("rating_comment"),
  ratingToken: varchar("rating_token").default(sql`gen_random_uuid()`),
  updateToken: varchar("update_token").unique(),
  detailedStatus: text("detailed_status").notNull().default("scheduled"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const jobChecklistItems = pgTable("job_checklist_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  jobId: varchar("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  completed: boolean("completed").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  roomGroup: text("room_group").notNull().default("General"),
  customerVisible: boolean("customer_visible").notNull().default(true),
});

export const jobPhotos = pgTable("job_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  photoUrl: text("photo_url").notNull(),
  photoType: text("photo_type").notNull().default("after"),
  caption: text("caption").notNull().default(""),
  customerVisible: boolean("customer_visible").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobStatusHistory = pgTable("job_status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobNotes = pgTable("job_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  customerVisible: boolean("customer_visible").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pushTokens = pgTable("push_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  platform: text("platform").notNull().default("ios"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communications = pgTable("communications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id),
  customerId: varchar("customer_id")
    .references(() => customers.id),
  quoteId: varchar("quote_id")
    .references(() => quotes.id),
  jobId: varchar("job_id")
    .references(() => jobs.id),
  channel: text("channel").notNull().default("sms"),
  direction: text("direction").notNull().default("outbound"),
  templateKey: text("template_key"),
  content: text("content").notNull().default(""),
  status: text("status").notNull().default("queued"),
  providerMessageId: text("provider_message_id"),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const automationRules = pgTable("automation_rules", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id),
  enabled: boolean("enabled").notNull().default(true),
  quoteFollowupsEnabled: boolean("quote_followups_enabled").notNull().default(false),
  followupSchedule: jsonb("followup_schedule").notNull().default(sql`'[{"delayMinutes":60,"templateKey":"followup_1h"},{"delayMinutes":1440,"templateKey":"followup_24h"},{"delayMinutes":4320,"templateKey":"followup_3d"},{"delayMinutes":10080,"templateKey":"followup_7d"}]'::jsonb`),
  quoteExpirationDays: integer("quote_expiration_days").notNull().default(7),
  jobRemindersEnabled: boolean("job_reminders_enabled").notNull().default(false),
  jobReminderMinutesBefore: integer("job_reminder_minutes_before").notNull().default(1440),
  followupChannel: text("followup_channel").notNull().default("sms"),
  messageTemplates: jsonb("message_templates").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id),
  customerId: varchar("customer_id")
    .references(() => customers.id),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  type: text("type").notNull().default("follow_up"),
  dueDate: timestamp("due_date"),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const channelConnections = pgTable("channel_connections", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id),
  channel: text("channel").notNull(),
  status: text("status").notNull().default("disconnected"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  pageId: text("page_id"),
  pageName: text("page_name"),
  igUserId: text("ig_user_id"),
  igUsername: text("ig_username"),
  webhookVerified: boolean("webhook_verified").notNull().default(false),
  lastWebhookAt: timestamp("last_webhook_at"),
  permissions: jsonb("permissions").notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const socialConversations = pgTable("social_conversations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id),
  channelConnectionId: varchar("channel_connection_id")
    .references(() => channelConnections.id),
  channel: text("channel").notNull(),
  externalConversationId: text("external_conversation_id"),
  senderName: text("sender_name").notNull().default(""),
  senderExternalId: text("sender_external_id"),
  senderProfileUrl: text("sender_profile_url"),
  status: text("status").notNull().default("active"),
  autoReplied: boolean("auto_replied").notNull().default(false),
  optedOut: boolean("opted_out").notNull().default(false),
  leadId: varchar("lead_id"),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const socialMessages = pgTable("social_messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id")
    .notNull()
    .references(() => socialConversations.id, { onDelete: "cascade" }),
  direction: text("direction").notNull().default("inbound"),
  content: text("content").notNull().default(""),
  externalMessageId: text("external_message_id"),
  intentDetected: boolean("intent_detected"),
  intentConfidence: real("intent_confidence"),
  intentCategory: text("intent_category"),
  autoReplyContent: text("auto_reply_content"),
  quoteLink: text("quote_link"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const socialLeads = pgTable("social_leads", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id),
  customerId: varchar("customer_id")
    .references(() => customers.id),
  conversationId: varchar("conversation_id")
    .references(() => socialConversations.id),
  channel: text("channel").notNull(),
  attribution: text("attribution").notNull().default("auto_dm"),
  senderName: text("sender_name").notNull().default(""),
  senderHandle: text("sender_handle"),
  dmText: text("dm_text"),
  quoteId: varchar("quote_id")
    .references(() => quotes.id),
  status: text("status").notNull().default("new"),
  revenue: real("revenue"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const attributionEvents = pgTable("attribution_events", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id),
  socialLeadId: varchar("social_lead_id")
    .references(() => socialLeads.id),
  conversationId: varchar("conversation_id")
    .references(() => socialConversations.id),
  channel: text("channel").notNull(),
  eventType: text("event_type").notNull(),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const socialAutomationSettings = pgTable("social_automation_settings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id),
  autoRepliesEnabled: boolean("auto_replies_enabled").notNull().default(false),
  intentThreshold: real("intent_threshold").notNull().default(0.7),
  quietHoursEnabled: boolean("quiet_hours_enabled").notNull().default(false),
  quietHoursStart: text("quiet_hours_start").notNull().default("22:00"),
  quietHoursEnd: text("quiet_hours_end").notNull().default("08:00"),
  replyTemplate: text("reply_template").notNull().default("Hi! Thanks for reaching out. Here's a quick link to get an instant quote: {link}"),
  optOutKeywords: jsonb("opt_out_keywords").notNull().default(sql`'["stop","unsubscribe","quit","opt out"]'::jsonb`),
  socialOnboardingComplete: boolean("social_onboarding_complete").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const socialOptOuts = pgTable("social_opt_outs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id),
  channel: text("channel").notNull(),
  externalUserId: text("external_user_id").notNull(),
  senderName: text("sender_name"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const googleCalendarTokens = pgTable("google_calendar_tokens", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  calendarId: text("calendar_id").default("primary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const followUpTouches = pgTable("follow_up_touches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  customerId: varchar("customer_id").references(() => customers.id),
  channel: text("channel").notNull(),
  snoozedUntil: timestamp("snoozed_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const streaks = pgTable("streaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id).unique(),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActionDate: text("last_action_date"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id).unique(),
  dailyPulseEnabled: boolean("daily_pulse_enabled").notNull().default(true),
  dailyPulseTime: text("daily_pulse_time").notNull().default("08:00"),
  weeklyRecapEnabled: boolean("weekly_recap_enabled").notNull().default(true),
  weeklyRecapDay: integer("weekly_recap_day").notNull().default(1),
  quietHoursEnabled: boolean("quiet_hours_enabled").notNull().default(false),
  quietHoursStart: text("quiet_hours_start").notNull().default("21:00"),
  quietHoursEnd: text("quiet_hours_end").notNull().default("08:00"),
  dormantThresholdDays: integer("dormant_threshold_days").notNull().default(90),
  maxFollowUpsPerDay: integer("max_follow_ups_per_day").notNull().default(1),
  weeklyGoal: text("weekly_goal"),
  weeklyGoalTarget: integer("weekly_goal_target"),
  celebratedMilestones: jsonb("celebrated_milestones").notNull().default(sql`'[]'::jsonb`),
  lastWeeklyDigestAt: timestamp("last_weekly_digest_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  eventName: text("event_name").notNull(),
  properties: jsonb("properties").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const badges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  badgeKey: text("badge_key").notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

export const growthTasks = pgTable("growth_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  customerId: varchar("customer_id").references(() => customers.id),
  quoteId: varchar("quote_id").references(() => quotes.id),
  jobId: varchar("job_id").references(() => jobs.id),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  channel: text("channel").notNull().default("sms"),
  dueAt: timestamp("due_at"),
  priority: integer("priority").notNull().default(50),
  escalationStage: integer("escalation_stage").notNull().default(1),
  maxEscalation: integer("max_escalation").notNull().default(4),
  templateKey: text("template_key"),
  message: text("message").notNull().default(""),
  estimatedValue: real("estimated_value").notNull().default(0),
  snoozedUntil: timestamp("snoozed_until"),
  completedAt: timestamp("completed_at"),
  lastActionAt: timestamp("last_action_at"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const growthTaskEvents = pgTable("growth_task_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => growthTasks.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  channel: text("channel"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reviewRequests = pgTable("review_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  customerId: varchar("customer_id").references(() => customers.id),
  jobId: varchar("job_id").references(() => jobs.id),
  status: text("status").notNull().default("pending"),
  rating: integer("rating"),
  feedbackText: text("feedback_text"),
  reviewClicked: boolean("review_clicked").notNull().default(false),
  reviewClickedAt: timestamp("review_clicked_at"),
  referralSent: boolean("referral_sent").notNull().default(false),
  referralSentAt: timestamp("referral_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const customerMarketingPrefs = pgTable("customer_marketing_prefs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  customerId: varchar("customer_id").notNull().references(() => customers.id),
  doNotContact: boolean("do_not_contact").notNull().default(false),
  preferredChannel: text("preferred_channel").notNull().default("sms"),
  lastReviewRequestAt: timestamp("last_review_request_at"),
  reviewRequestCooldownDays: integer("review_request_cooldown_days").notNull().default(90),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const growthAutomationSettings = pgTable("growth_automation_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id).unique(),
  marketingModeEnabled: boolean("marketing_mode_enabled").notNull().default(false),
  abandonedQuoteRecovery: boolean("abandoned_quote_recovery").notNull().default(true),
  weeklyReactivation: boolean("weekly_reactivation").notNull().default(true),
  reviewRequestWorkflow: boolean("review_request_workflow").notNull().default(true),
  referralAskWorkflow: boolean("referral_ask_workflow").notNull().default(true),
  rebookNudges: boolean("rebook_nudges").notNull().default(true),
  upsellTriggers: boolean("upsell_triggers").notNull().default(true),
  quietHoursStart: text("quiet_hours_start").notNull().default("21:00"),
  quietHoursEnd: text("quiet_hours_end").notNull().default("08:00"),
  maxSendsPerDay: integer("max_sends_per_day").notNull().default(5),
  maxFollowUpsPerQuote: integer("max_follow_ups_per_quote").notNull().default(3),
  rebookNudgeDaysMin: integer("rebook_nudge_days_min").notNull().default(21),
  rebookNudgeDaysMax: integer("rebook_nudge_days_max").notNull().default(35),
  deepCleanIntervalMonths: integer("deep_clean_interval_months").notNull().default(6),
  googleReviewLink: text("google_review_link").notNull().default(""),
  includeReviewOnPdf: boolean("include_review_on_pdf").notNull().default(false),
  includeReviewInMessages: boolean("include_review_in_messages").notNull().default(false),
  askReviewAfterComplete: boolean("ask_review_after_complete").notNull().default(true),
  referralOfferAmount: integer("referral_offer_amount").notNull().default(25),
  referralBookingLink: text("referral_booking_link").notNull().default(""),
  connectedSendingEnabled: boolean("connected_sending_enabled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const salesStrategySettings = pgTable("sales_strategy_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id).unique(),
  selectedProfile: text("selected_profile").notNull().default("professional"),
  escalationEnabled: boolean("escalation_enabled").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  name: text("name").notNull(),
  segment: text("segment").notNull(),
  channel: text("channel").notNull().default("sms"),
  templateKey: text("template_key"),
  customerIds: jsonb("customer_ids"),
  messageContent: text("message_content"),
  messageSubject: text("message_subject"),
  status: text("status").notNull().default("draft"),
  taskCount: integer("task_count").notNull().default(0),
  completedCount: integer("completed_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  name: true,
  passwordHash: true,
  authProvider: true,
  providerId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type PricingSettingsRow = typeof pricingSettings.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type QuoteRow = typeof quotes.$inferSelect;
export type QuoteFollowUp = typeof quoteFollowUps.$inferSelect;
export type QuoteLineItem = typeof quoteLineItems.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type JobChecklistItem = typeof jobChecklistItems.$inferSelect;
export type JobPhoto = typeof jobPhotos.$inferSelect;
export type PushToken = typeof pushTokens.$inferSelect;
export type Communication = typeof communications.$inferSelect;
export type AutomationRule = typeof automationRules.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type ChannelConnection = typeof channelConnections.$inferSelect;
export type SocialConversation = typeof socialConversations.$inferSelect;
export type SocialMessage = typeof socialMessages.$inferSelect;
export type SocialLead = typeof socialLeads.$inferSelect;
export type AttributionEvent = typeof attributionEvents.$inferSelect;
export type SocialAutomationSetting = typeof socialAutomationSettings.$inferSelect;
export type SocialOptOut = typeof socialOptOuts.$inferSelect;
export type GoogleCalendarToken = typeof googleCalendarTokens.$inferSelect;
export type FollowUpTouch = typeof followUpTouches.$inferSelect;
export type Streak = typeof streaks.$inferSelect;
export type UserPreference = typeof userPreferences.$inferSelect;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type GrowthTask = typeof growthTasks.$inferSelect;
export type GrowthTaskEvent = typeof growthTaskEvents.$inferSelect;
export type ReviewRequest = typeof reviewRequests.$inferSelect;
export type CustomerMarketingPref = typeof customerMarketingPrefs.$inferSelect;
export type GrowthAutomationSetting = typeof growthAutomationSettings.$inferSelect;
export type SalesStrategySetting = typeof salesStrategySettings.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type SalesRecommendation = typeof salesRecommendations.$inferSelect;

export const invoicePackets = pgTable("invoice_packets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").references(() => quotes.id),
  businessId: varchar("business_id").references(() => businesses.id),
  userId: varchar("user_id").references(() => users.id),
  status: text("status").notNull().default("generated"),
  lineItemsJson: jsonb("line_items_json"),
  customerInfoJson: jsonb("customer_info_json"),
  totalsJson: jsonb("totals_json"),
  invoiceNumber: text("invoice_number"),
  pdfHtml: text("pdf_html"),
  csvText: text("csv_text"),
  plainText: text("plain_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const calendarEventStubs = pgTable("calendar_event_stubs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").references(() => quotes.id),
  userId: varchar("user_id").references(() => users.id),
  businessId: varchar("business_id").references(() => businesses.id),
  startDatetime: timestamp("start_datetime").notNull(),
  endDatetime: timestamp("end_datetime").notNull(),
  location: text("location"),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  label: text("label"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  rotatedAt: timestamp("rotated_at"),
});

export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  url: text("url").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  enabledEvents: jsonb("enabled_events").default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhookEvents = pgTable("webhook_events", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  eventType: text("event_type").notNull(),
  payloadJson: jsonb("payload_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  webhookEventId: varchar("webhook_event_id").notNull().references(() => webhookEvents.id),
  endpointId: varchar("endpoint_id").notNull().references(() => webhookEndpoints.id),
  attemptNumber: integer("attempt_number").notNull().default(1),
  statusCode: integer("status_code"),
  responseBodyExcerpt: text("response_body_excerpt"),
  nextRetryAt: timestamp("next_retry_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const qboConnections = pgTable("qbo_connections", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  realmId: text("realm_id"),
  accessTokenEncrypted: text("access_token_encrypted"),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenLastRotatedAt: timestamp("refresh_token_last_rotated_at"),
  connectedAt: timestamp("connected_at"),
  disconnectedAt: timestamp("disconnected_at"),
  scopes: text("scopes"),
  environment: text("environment").notNull().default("production"),
  status: text("status").notNull().default("disconnected"),
  lastError: text("last_error"),
  companyName: text("company_name"),
  autoCreateInvoice: boolean("auto_create_invoice").notNull().default(false),
});

export const qboCustomerMappings = pgTable("qbo_customer_mappings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  qpCustomerId: varchar("qp_customer_id")
    .notNull()
    .references(() => customers.id),
  qboCustomerId: text("qbo_customer_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const qboInvoiceLinks = pgTable("qbo_invoice_links", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  quoteId: varchar("quote_id")
    .notNull()
    .references(() => quotes.id),
  qboInvoiceId: text("qbo_invoice_id").notNull(),
  qboDocNumber: text("qbo_doc_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const qboSyncLog = pgTable("qbo_sync_log", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  quoteId: varchar("quote_id"),
  action: text("action").notNull(),
  requestSummary: jsonb("request_summary"),
  responseSummary: jsonb("response_summary"),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobberConnections = pgTable("jobber_connections", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  accessTokenEncrypted: text("access_token_encrypted"),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  connectedAt: timestamp("connected_at"),
  disconnectedAt: timestamp("disconnected_at"),
  scopes: text("scopes"),
  status: text("status").notNull().default("disconnected"),
  lastError: text("last_error"),
  autoCreateJobOnQuoteAccept: boolean("auto_create_job_on_quote_accept").notNull().default(false),
});

export const jobberClientMappings = pgTable("jobber_client_mappings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  qpCustomerId: varchar("qp_customer_id")
    .notNull()
    .references(() => customers.id),
  jobberClientId: text("jobber_client_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobberJobLinks = pgTable("jobber_job_links", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  quoteId: varchar("quote_id")
    .notNull()
    .references(() => quotes.id),
  jobberClientId: text("jobber_client_id").notNull(),
  jobberJobId: text("jobber_job_id").notNull(),
  jobberJobNumber: text("jobber_job_number"),
  syncStatus: text("sync_status").notNull().default("success"),
  syncTrigger: text("sync_trigger").notNull().default("manual"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobberSyncLog = pgTable("jobber_sync_log", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  quoteId: varchar("quote_id"),
  action: text("action").notNull(),
  requestSummary: jsonb("request_summary"),
  responseSummary: jsonb("response_summary"),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InvoicePacket = typeof invoicePackets.$inferSelect;
export type CalendarEventStub = typeof calendarEventStubs.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type WebhookEndpoint = typeof webhookEndpoints.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type QboConnection = typeof qboConnections.$inferSelect;
export type QboCustomerMapping = typeof qboCustomerMappings.$inferSelect;
export type QboInvoiceLink = typeof qboInvoiceLinks.$inferSelect;
export type QboSyncLogEntry = typeof qboSyncLog.$inferSelect;
export type JobberConnection = typeof jobberConnections.$inferSelect;
export type JobberClientMapping = typeof jobberClientMappings.$inferSelect;
export type JobberJobLink = typeof jobberJobLinks.$inferSelect;
export type JobberSyncLogEntry = typeof jobberSyncLog.$inferSelect;

// ─── Local Lead Finder ───────────────────────────────────────────────────────

export const leadFinderSettings = pgTable("lead_finder_settings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id),
  enabled: boolean("enabled").notNull().default(true),
  targetCities: jsonb("target_cities").default([]),
  targetZips: jsonb("target_zips").default([]),
  radiusMiles: integer("radius_miles").notNull().default(25),
  keywords: jsonb("keywords").default([]),
  subreddits: jsonb("subreddits").default([]),
  notifyNewLeads: boolean("notify_new_leads").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leadFinderLeads = pgTable("lead_finder_leads", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id),
  source: text("source").notNull().default("reddit"),
  externalId: text("external_id").notNull(),
  subreddit: text("subreddit"),
  title: text("title"),
  body: text("body"),
  author: text("author"),
  postUrl: text("post_url"),
  permalink: text("permalink"),
  matchedKeyword: text("matched_keyword"),
  detectedLocation: text("detected_location"),
  intent: text("intent"),
  aiClassification: text("ai_classification"),
  aiConfidence: integer("ai_confidence"),
  aiReason: text("ai_reason"),
  leadScore: integer("lead_score").default(0),
  status: text("status").notNull().default("new"),
  postedAt: timestamp("posted_at"),
  ingestedAt: timestamp("ingested_at").defaultNow(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leadFinderReplies = pgTable("lead_finder_replies", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id")
    .notNull()
    .references(() => leadFinderLeads.id),
  tone: text("tone").notNull(),
  replyText: text("reply_text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leadFinderEvents = pgTable("lead_finder_events", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").references(() => leadFinderLeads.id),
  userId: varchar("user_id").references(() => users.id),
  eventType: text("event_type").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type LeadFinderSettings = typeof leadFinderSettings.$inferSelect;
export type LeadFinderLead = typeof leadFinderLeads.$inferSelect;
export type LeadFinderReply = typeof leadFinderReplies.$inferSelect;
export type LeadFinderEvent = typeof leadFinderEvents.$inferSelect;

// ===== AI Quote Assistant =====

export const linqAccounts = pgTable("linq_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  provider: text("provider").notNull().default("linq"),
  environment: text("environment").notNull().default("sandbox"),
  linqWorkspaceId: text("linq_workspace_id"),
  webhookSecret: text("webhook_secret"),
  isConnected: boolean("is_connected").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const linqPhoneNumbers = pgTable("linq_phone_numbers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  linqAccountId: varchar("linq_account_id").references(() => linqAccounts.id),
  externalPhoneId: text("external_phone_id"),
  phoneNumber: text("phone_number").notNull(),
  displayName: text("display_name"),
  isPrimary: boolean("is_primary").notNull().default(true),
  status: text("status").notNull().default("active"),
  capabilities: jsonb("capabilities"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversationThreads = pgTable("conversation_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  customerId: varchar("customer_id").references(() => customers.id),
  channel: text("channel").notNull().default("sms"),
  externalThreadId: text("external_thread_id"),
  phoneNumber: text("phone_number").notNull(),
  customerName: text("customer_name"),
  aiStatus: text("ai_status").notNull().default("active"),
  handoffStatus: text("handoff_status").notNull().default("ai"),
  currentState: text("current_state").notNull().default("idle"),
  lastMessageAt: timestamp("last_message_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversationMessages = pgTable("conversation_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => conversationThreads.id),
  direction: text("direction").notNull(),
  provider: text("provider").notNull().default("linq"),
  externalMessageId: text("external_message_id"),
  sender: text("sender"),
  recipient: text("recipient"),
  body: text("body").notNull(),
  messageType: text("message_type").notNull().default("text"),
  status: text("status"),
  rawPayload: jsonb("raw_payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversationAutomations = pgTable("conversation_automations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => conversationThreads.id),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  automationType: text("automation_type").notNull(),
  state: jsonb("state"),
  isActive: boolean("is_active").notNull().default(true),
  lastAiConfidence: integer("last_ai_confidence"),
  lastIntent: text("last_intent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiQuoteAssistantSettings = pgTable("ai_quote_assistant_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  enabled: boolean("enabled").notNull().default(false),
  autoReplyEnabled: boolean("auto_reply_enabled").notNull().default(true),
  businessTone: text("business_tone").notNull().default("professional"),
  responseHoursOnly: boolean("response_hours_only").notNull().default(false),
  startHour: integer("start_hour"),
  endHour: integer("end_hour"),
  timezone: text("timezone"),
  requireHandoffOnDiscount: boolean("require_handoff_on_discount").notNull().default(true),
  requireHandoffOnAngry: boolean("require_handoff_on_angry").notNull().default(true),
  requireHandoffOnCommercial: boolean("require_handoff_on_commercial").notNull().default(true),
  requireHandoffOnLowConfidence: boolean("require_handoff_on_low_confidence").notNull().default(true),
  lowConfidenceThreshold: integer("low_confidence_threshold").notNull().default(70),
  allowFaqAutoAnswers: boolean("allow_faq_auto_answers").notNull().default(true),
  allowIntakeAutomation: boolean("allow_intake_automation").notNull().default(true),
  autoCreateQuoteDraft: boolean("auto_create_quote_draft").notNull().default(true),
  autoSendQuote: boolean("auto_send_quote").notNull().default(false),
  faqOverrides: jsonb("faq_overrides"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiQuoteIntakeSessions = pgTable("ai_quote_intake_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => conversationThreads.id),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  status: text("status").notNull().default("active"),
  serviceType: text("service_type"),
  zipCode: text("zip_code"),
  city: text("city"),
  squareFootage: text("square_footage"),
  bedrooms: text("bedrooms"),
  bathrooms: text("bathrooms"),
  pets: text("pets"),
  lastCleaned: text("last_cleaned"),
  frequency: text("frequency"),
  preferredDate: text("preferred_date"),
  notes: text("notes"),
  extractedStructuredData: jsonb("extracted_structured_data"),
  quoteDraftId: varchar("quote_draft_id"),
  completionScore: integer("completion_score").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type LinqAccount = typeof linqAccounts.$inferSelect;
export type LinqPhoneNumber = typeof linqPhoneNumbers.$inferSelect;
export type ConversationThread = typeof conversationThreads.$inferSelect;
export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type ConversationAutomation = typeof conversationAutomations.$inferSelect;
export type AiQuoteAssistantSettings = typeof aiQuoteAssistantSettings.$inferSelect;
export type AiQuoteIntakeSession = typeof aiQuoteIntakeSessions.$inferSelect;
