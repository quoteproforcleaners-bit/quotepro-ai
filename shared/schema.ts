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
  depositRequired: boolean("deposit_required").notNull().default(false),
  depositAmount: real("deposit_amount"),
  depositPaid: boolean("deposit_paid").notNull().default(false),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
});

export const jobPhotos = pgTable("job_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  photoUrl: text("photo_url").notNull(),
  photoType: text("photo_type").notNull().default("after"),
  caption: text("caption").notNull().default(""),
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
