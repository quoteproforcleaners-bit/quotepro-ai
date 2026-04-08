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
  serial,
  index,
  numeric,
  uniqueIndex,
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
  subscriptionInterval: text("subscription_interval").default("monthly"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeSubscriptionStatus: text("stripe_subscription_status"),
  revenuecatUserId: text("revenuecat_user_id"),
  revenuecatEntitlement: text("revenuecat_entitlement"),
  subscriptionPlatform: text("subscription_platform"), // 'stripe' | 'revenuecat' | null
  subscriptionSyncedAt: timestamp("subscription_synced_at"),
  quotesThisMonth: integer("quotes_this_month").default(0),
  quotesMonthResetAt: timestamp("quotes_month_reset_at"),
  trialStartedAt: timestamp("trial_started_at"),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  referralCreditsMonths: integer("referral_credits_months").default(0),
  referralFraudFlagged: boolean("referral_fraud_flagged").default(false),
  signupIp: text("signup_ip"),
  // Badge rewards
  proposalTemplatesUnlocked: boolean("proposal_templates_unlocked").default(false),
  growthPreviewUntil: timestamp("growth_preview_until"),
  loyaltyDiscountPct: integer("loyalty_discount_pct").default(0),
  mrrDashboardUnlocked: boolean("mrr_dashboard_unlocked").default(false),
  aiFollowUpsUsedThisMonth: integer("ai_follow_ups_used_this_month").default(0),
  photoQuotesUsedThisMonth: integer("photo_quotes_used_this_month").default(0),
  activeLocationId: varchar("active_location_id"),
  isMultiLocationEnabled: boolean("is_multi_location_enabled").notNull().default(false),
  trialDripEnrolledAt: timestamp("trial_drip_enrolled_at"),
  trialDripLastSentDay: integer("trial_drip_last_sent_day").default(0),
  trialDripCompleted: boolean("trial_drip_completed").default(false),
  trialDripUnsubscribed: boolean("trial_drip_unsubscribed").default(false),
  lastLoginAt: timestamp("last_login_at"),
  // Churn detection + NPS
  lastActiveAt: timestamp("last_active_at"),
  lastQuoteSentAt: timestamp("last_quote_sent_at"),
  churnRiskScore: integer("churn_risk_score").default(0),
  churnInterventionSentAt: timestamp("churn_intervention_sent_at"),
  npsScore: integer("nps_score"),
  npsSurveyedAt: timestamp("nps_surveyed_at"),
  npsResponse: text("nps_response"),
  subscriptionStartedAt: timestamp("subscription_started_at"),
  emailUnreachable: boolean("email_unreachable").notNull().default(false),
  contactEmail: text("contact_email"),
  autopilotEnabled: boolean("autopilot_enabled").notNull().default(false),
  // Activation nudge tracking
  firstQuoteSentAt: timestamp("first_quote_sent_at"),
  activationNudge24hSent: boolean("activation_nudge_24h_sent").notNull().default(false),
  activationNudge48hSent: boolean("activation_nudge_48h_sent").notNull().default(false),
  activationNudge70hSent: boolean("activation_nudge_70h_sent").notNull().default(false),
  smsOptedOut: boolean("sms_opted_out").notNull().default(false),
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
  appLanguage: varchar("app_language", { length: 10 }).default("en"),
  commLanguage: varchar("comm_language", { length: 10 }).default("en"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  sendgridApiKey: text("sendgrid_api_key"),
  stripeAccountId: text("stripe_account_id"),
  stripeOnboardingComplete: boolean("stripe_onboarding_complete").notNull().default(false),
  venmoHandle: text("venmo_handle"),
  cashappHandle: text("cashapp_handle"),
  paymentOptions: jsonb("payment_options"),
  paymentNotes: text("payment_notes"),
  quotePreferences: jsonb("quote_preferences"),
  avatarConfig: jsonb("avatar_config"),
  bookingWidgetEnabled: boolean("booking_widget_enabled").notNull().default(false),
  bookingWidgetAccentColor: text("booking_widget_accent_color").notNull().default("#2563eb"),
  bookingWidgetBusinessName: text("booking_widget_business_name"),
  bookingWidgetServices: jsonb("booking_widget_services").$type<{ id: string; name: string; durationHours: number; priceCents: number }[]>(),
  bookingWidgetAvailableDays: integer("booking_widget_available_days").array(),
  bookingWidgetStartTime: text("booking_widget_start_time").notNull().default("08:00"),
  bookingWidgetEndTime: text("booking_widget_end_time").notNull().default("18:00"),
  bookingWidgetAdvanceNoticeHours: integer("booking_widget_advance_notice_hours").notNull().default(24),
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
  locationId: varchar("location_id"),
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
  preferredLanguage: varchar("preferred_language", { length: 10 }),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  businessIdIdx: index("customers_business_id_idx").on(table.businessId),
}));

export const quotes = pgTable("quotes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id),
  locationId: varchar("location_id"),
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
  deletedAt: timestamp("deleted_at"),
  stripeInvoiceId: text("stripe_invoice_id"),
  stripeInvoiceStatus: text("stripe_invoice_status"),
  stripeInvoiceSentAt: timestamp("stripe_invoice_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  customerIdIdx: index("quotes_customer_id_idx").on(table.customerId),
  statusIdx:     index("quotes_status_idx").on(table.status),
  createdAtIdx:  index("quotes_created_at_idx").on(table.createdAt),
  deletedAtIdx:  index("quotes_deleted_at_idx").on(table.deletedAt),
}));

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
}, (table) => ({
  quoteIdIdx: index("quote_follow_ups_quote_id_idx").on(table.quoteId),
}));

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

export const recurringCleanSeries = pgTable("recurring_clean_series", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  customerId: varchar("customer_id").references(() => customers.id),
  quoteId: varchar("quote_id").references(() => quotes.id),
  frequency: text("frequency").notNull().default("weekly"),
  intervalValue: integer("interval_value").notNull().default(1),
  intervalUnit: text("interval_unit").notNull().default("weeks"),
  dayOfWeek: integer("day_of_week"),
  dayOfMonth: integer("day_of_month"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  status: text("status").notNull().default("active"),
  defaultPrice: real("default_price"),
  jobType: text("job_type").notNull().default("regular"),
  address: text("address").notNull().default(""),
  durationHours: real("duration_hours").notNull().default(3),
  teamMembers: jsonb("team_members").$type<string[]>().default([]),
  internalNotes: text("internal_notes").notNull().default(""),
  arrivalTime: text("arrival_time").notNull().default("09:00"),
  autoCharge: boolean("auto_charge").notNull().default(false),
  stripePaymentMethodId: text("stripe_payment_method_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type RecurringCleanSeries = typeof recurringCleanSeries.$inferSelect;
export type InsertRecurringCleanSeries = typeof recurringCleanSeries.$inferInsert;

export const jobs = pgTable("jobs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id),
  locationId: varchar("location_id"),
  customerId: varchar("customer_id")
    .references(() => customers.id),
  quoteId: varchar("quote_id")
    .references(() => quotes.id),
  seriesId: varchar("series_id").references(() => recurringCleanSeries.id),
  seriesException: boolean("series_exception").notNull().default(false),
  skipped: boolean("skipped").notNull().default(false),
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
  teamMembers: jsonb("team_members").$type<string[]>().default([]),
  cleanerNotes: text("cleaner_notes").notNull().default(""),
  checkinToken: varchar("checkin_token").unique().default(sql`gen_random_uuid()`),
  invoiced: boolean("invoiced").notNull().default(false),
  specialRequests: text("special_requests"),
  accessCode: varchar("access_code", { length: 100 }),
  parkingNotes: varchar("parking_notes", { length: 255 }),
  keyLocation: varchar("key_location", { length: 255 }),
  estimatedDurationMinutes: integer("estimated_duration_minutes"),
  roomCount: integer("room_count"),
  squareFootage: integer("square_footage"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  quoteIdIdx:       index("jobs_quote_id_idx").on(table.quoteId),
  startDatetimeIdx: index("jobs_start_datetime_idx").on(table.startDatetime),
  statusIdx:        index("jobs_status_idx").on(table.status),
}));

export const employees = pgTable("employees", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  businessId: varchar("business_id")
    .notNull()
    .references(() => businesses.id),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  role: text("role").notNull().default(""),
  status: text("status").notNull().default("active"),
  notes: text("notes").notNull().default(""),
  color: text("color").notNull().default("#6366f1"),
  pin: text("pin").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const jobAssignments = pgTable("job_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  businessId: varchar("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  assignedDate: text("assigned_date").notNull(),
  status: text("status").notNull().default("assigned"),
  checkinTime: timestamp("checkin_time"),
  checkoutTime: timestamp("checkout_time"),
  checkinLat: real("checkin_lat"),
  checkinLng: real("checkin_lng"),
  checkoutLat: real("checkout_lat"),
  checkoutLng: real("checkout_lng"),
  employeeNotes: text("employee_notes"),
  checkinPhotoUrl: varchar("checkin_photo_url"),
  checkoutPhotoUrl: varchar("checkout_photo_url"),
  durationMinutes: integer("duration_minutes"),
  adminNotifiedCheckin: boolean("admin_notified_checkin").notNull().default(false),
  adminNotifiedCheckout: boolean("admin_notified_checkout").notNull().default(false),
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
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  customerIdIdx: index("communications_customer_id_idx").on(table.customerId),
}));

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
  // Push notification preferences per channel
  pushPrefs: jsonb("push_prefs").default(sql`'{"quotes":true,"jobs":true,"growth":true}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  eventName: text("event_name").notNull(),
  properties: jsonb("properties").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  createdAtIdx: index("analytics_events_created_at_idx").on(table.createdAt),
}));

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
export type Employee = typeof employees.$inferSelect;
export type JobAssignment = typeof jobAssignments.$inferSelect;
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
  scopes: jsonb("scopes").$type<string[]>().notNull().default(sql`'["read:quotes"]'::jsonb`),
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

// ===== File Library =====
export const businessFiles = pgTable("business_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  originalName: text("original_name").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull().default(0),
  fileUrl: text("file_url").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("general"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BusinessFile = typeof businessFiles.$inferSelect;

// ===== Email Sequences =====
export const sequenceEnrollments = pgTable("sequence_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  sequenceId: text("sequence_id").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerId: varchar("customer_id").references(() => customers.id),
  status: text("status").notNull().default("active"),
  currentStep: integer("current_step").notNull().default(0),
  stepsCompleted: jsonb("steps_completed").notNull().default(sql`'[]'::jsonb`),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  lastSentAt: timestamp("last_sent_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes").notNull().default(""),
});

export type SequenceEnrollment = typeof sequenceEnrollments.$inferSelect;

// ===== Pricing Logic Engine =====

export const importedJobs = pgTable("imported_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  customerName: text("customer_name").default(""),
  serviceType: text("service_type").default("standard"),
  sqft: integer("sqft"),
  beds: integer("beds"),
  baths: real("baths"),
  halfBaths: integer("half_baths").default(0),
  conditionLevel: text("condition_level").default("standard"),
  pets: boolean("pets").default(false),
  frequency: text("frequency").default("one-time"),
  addOns: jsonb("add_ons").default([]),
  zipCode: text("zip_code").default(""),
  estimatedHours: real("estimated_hours"),
  crewSize: integer("crew_size").default(1),
  finalPrice: real("final_price").notNull(),
  won: boolean("won").default(true),
  notes: text("notes").default(""),
  source: text("source").default("manual"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pricingQuestionnaires = pgTable("pricing_questionnaires", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  minJobPrice: real("min_job_price").default(100),
  targetHourlyRevenue: real("target_hourly_revenue").default(50),
  preferredCrewSize: integer("preferred_crew_size").default(1),
  suppliesIncluded: boolean("supplies_included").default(true),
  recurringDiscount: real("recurring_discount").default(10),
  deepCleanMultiplier: real("deep_clean_multiplier").default(1.5),
  moveOutMultiplier: real("move_out_multiplier").default(1.75),
  petSurcharge: real("pet_surcharge").default(25),
  travelSurcharge: real("travel_surcharge").default(0),
  serviceAreas: jsonb("service_areas").default([]),
  addOnPricing: jsonb("add_on_pricing").default([]),
  pricingByCondition: boolean("pricing_by_condition").default(true),
  pricingByFrequency: boolean("pricing_by_frequency").default(true),
  pricingBySqft: boolean("pricing_by_sqft").default(true),
  neverGoBelow: real("never_go_below").default(80),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pricingRules = pgTable("pricing_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  label: text("label").notNull(),
  ruleType: text("rule_type").notNull(),
  inputVariables: jsonb("input_variables").default([]),
  formula: jsonb("formula").notNull(),
  explanation: text("explanation").default(""),
  source: text("source").default("user"),
  active: boolean("active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pricingAnalyses = pgTable("pricing_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  status: text("status").default("pending"),
  jobCount: integer("job_count").default(0),
  inferredSummary: jsonb("inferred_summary").default({}),
  revenueOpportunities: jsonb("revenue_opportunities").default([]),
  recommendedRules: jsonb("recommended_rules").default([]),
  rawAiOutput: text("raw_ai_output").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const publishedPricingProfiles = pgTable("published_pricing_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  version: integer("version").default(1),
  rules: jsonb("rules").notNull().default([]),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
  changeSummary: text("change_summary").default(""),
});

export type ImportedJob = typeof importedJobs.$inferSelect;
export type PricingQuestionnaire = typeof pricingQuestionnaires.$inferSelect;
export type PricingRule = typeof pricingRules.$inferSelect;
export type PricingAnalysis = typeof pricingAnalyses.$inferSelect;
export type PublishedPricingProfile = typeof publishedPricingProfiles.$inferSelect;

// ===== Self-Booking Portal =====

export const bookingAvailabilitySettings = pgTable("booking_availability_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().unique().references(() => businesses.id),
  enabled: boolean("enabled").notNull().default(false),
  allowedDays: integer("allowed_days").array().notNull().default([1, 2, 3, 4, 5]),
  timeWindows: jsonb("time_windows").notNull().default([{ start: "08:00", end: "17:00" }]),
  slotDurationHours: real("slot_duration_hours").notNull().default(3),
  slotIntervalHours: real("slot_interval_hours").notNull().default(2),
  minNoticeHours: integer("min_notice_hours").notNull().default(24),
  maxJobsPerDay: integer("max_jobs_per_day").notNull().default(4),
  blackoutDates: text("blackout_dates").array().notNull().default([]),
  serviceAreaNotes: text("service_area_notes").notNull().default(""),
  confirmationMessage: text("confirmation_message").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BookingAvailabilitySettings = typeof bookingAvailabilitySettings.$inferSelect;

// ===== AI Quote Assistant =====


// ===== Schedule Publications =====

export const schedulePublications = pgTable("schedule_publications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  weekStart: text("week_start").notNull(),
  weekEnd: text("week_end").notNull(),
  versionNumber: integer("version_number").notNull().default(1),
  publishedBy: varchar("published_by").notNull().references(() => users.id),
  publishScope: text("publish_scope").notNull().default("all"),
  snapshotJson: jsonb("snapshot_json").notNull().default({}),
  notes: text("notes").notNull().default(""),
  totalJobs: integer("total_jobs").notNull().default(0),
  totalCleaners: integer("total_cleaners").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SchedulePublication = typeof schedulePublications.$inferSelect;

export const cleanerScheduleNotifications = pgTable("cleaner_schedule_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  publicationId: varchar("publication_id").notNull().references(() => schedulePublications.id, { onDelete: "cascade" }),
  businessId: varchar("business_id").notNull(),
  cleanerId: varchar("cleaner_id").notNull().references(() => employees.id),
  cleanerName: text("cleaner_name").notNull(),
  cleanerEmail: text("cleaner_email").notNull().default(""),
  ackToken: varchar("ack_token").unique().default(sql`gen_random_uuid()`),
  sendStatus: text("send_status").notNull().default("pending"),
  sentAt: timestamp("sent_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
  ackStatus: text("ack_status").notNull().default("pending"),
  issueMessage: text("issue_message").notNull().default(""),
  cleanerSnapshotJson: jsonb("cleaner_snapshot_json").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CleanerScheduleNotification = typeof cleanerScheduleNotifications.$inferSelect;

// ─── AI Usage Logs ────────────────────────────────────────────────────────────

export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  route: text("route"),
  tokensUsed: integer("tokens_used").notNull().default(0),
  responseTimeMs: integer("response_time_ms").notNull().default(0),
  success: boolean("success").notNull().default(true),
  errorCode: text("error_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AIUsageLog = typeof aiUsageLogs.$inferSelect;

// ═══════════════════════════════════════════════════════════════════
// Sprint 23 — Customer Portal tables
// ═══════════════════════════════════════════════════════════════════
export const customerPortals = pgTable("customer_portals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  businessId: varchar("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).unique().notNull(),
  preferences: jsonb("preferences"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastViewedAt: timestamp("last_viewed_at"),
  viewCount: integer("view_count").notNull().default(0),
});

export const rescheduleRequests = pgTable("reschedule_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portalToken: varchar("portal_token", { length: 64 }).notNull(),
  jobId: varchar("job_id").references(() => jobs.id, { onDelete: "set null" }),
  requestedDate: text("requested_date").notNull(),
  preferredTime: text("preferred_time").notNull().default("either"),
  customerNote: text("customer_note").notNull().default(""),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CustomerPortal = typeof customerPortals.$inferSelect;
export type RescheduleRequest = typeof rescheduleRequests.$inferSelect;

// ═══════════════════════════════════════════════════════════════════
// Market Rate Intelligence — zip-level pricing benchmarks
// ═══════════════════════════════════════════════════════════════════
export const marketRates = pgTable(
  "market_rates",
  {
    id: serial("id").primaryKey(),
    zipCode: varchar("zip_code", { length: 10 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 2 }),
    bedrooms: integer("bedrooms"),
    bathrooms: numeric("bathrooms", { precision: 3, scale: 1 }),
    frequency: varchar("frequency", { length: 20 }),
    priceP10: numeric("price_p10", { precision: 8, scale: 2 }),
    priceP25: numeric("price_p25", { precision: 8, scale: 2 }),
    priceP50: numeric("price_p50", { precision: 8, scale: 2 }),
    priceP75: numeric("price_p75", { precision: 8, scale: 2 }),
    priceP90: numeric("price_p90", { precision: 8, scale: 2 }),
    sampleSize: integer("sample_size"),
    lastUpdated: timestamp("last_updated").defaultNow(),
  },
  (t) => ({
    uniqRate: uniqueIndex("market_rates_uniq").on(
      t.zipCode,
      t.bedrooms,
      t.bathrooms,
      t.frequency
    ),
    zipIdx: index("market_rates_zip_idx").on(t.zipCode),
    stateIdx: index("market_rates_state_idx").on(t.state),
  })
);

export type MarketRate = typeof marketRates.$inferSelect;
export type InsertMarketRate = typeof marketRates.$inferInsert;

// ─── Autopilot ────────────────────────────────────────────────────────────────

export const autopilotJobs = pgTable("autopilot_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  leadId: varchar("lead_id"),
  quoteId: varchar("quote_id"),
  status: text("status").notNull().default("pending_quote"),
  lastActionAt: timestamp("last_action_at"),
  nextActionAt: timestamp("next_action_at"),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AutopilotJob = typeof autopilotJobs.$inferSelect;
export type InsertAutopilotJob = typeof autopilotJobs.$inferInsert;

export const autopilotJobLogs = pgTable("autopilot_job_logs", {
  id: serial("id").primaryKey(),
  jobId: varchar("job_id").notNull().references(() => autopilotJobs.id),
  step: text("step").notNull(),
  action: text("action").notNull(),
  result: text("result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AutopilotJobLog = typeof autopilotJobLogs.$inferSelect;

// ─── Backward-compatibility aliases (used by auto-generated router imports) ───
export const photos = jobPhotos;
export const preferences = userPreferences;
export const bookingAvailability = bookingAvailabilitySettings;
export const checklistItems = jobChecklistItems;
// Stubs for tables referenced in generated router imports but not yet in schema
export const employeeShifts = employees;
export const intakeRequests = customers;
export const pricingJobs = pricingAnalyses;
export const leadCapture = socialLeads;

// ─── Win/Loss Responses ───────────────────────────────────────────────────────
// Automated follow-up records sent to customers after a quote expires or goes cold
export const winLossResponses = pgTable("win_loss_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  quoteId: varchar("quote_id").notNull().references(() => quotes.id),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  customerEmail: text("customer_email").notNull(),
  responseToken: text("response_token").notNull().unique(),
  reason: text("reason"),
  reasonCategory: text("reason_category"), // 'price_too_high' | 'went_with_competitor' | 'no_longer_needed' | 'no_response_yet' | 'other'
  competitorMentioned: text("competitor_mentioned"),
  respondedAt: timestamp("responded_at"),
  followUpSentAt: timestamp("follow_up_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WinLossResponse = typeof winLossResponses.$inferSelect;

// ─── Staff Clock Events ───────────────────────────────────────────────────────
// Free-standing clock-in/out events (not tied to a specific job assignment)
export const staffClockEvents = pgTable("staff_clock_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  businessId: varchar("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  jobId: varchar("job_id").references(() => jobs.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(), // 'clock_in' | 'clock_out'
  latitude: real("latitude"),
  longitude: real("longitude"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type StaffClockEvent = typeof staffClockEvents.$inferSelect;

// ─── Business Locations (Multi-location / franchise support) ──────────────────
export const businessLocations = pgTable("business_locations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  timezone: text("timezone").notNull().default("America/New_York"),
  active: boolean("active").notNull().default(true),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type BusinessLocation = typeof businessLocations.$inferSelect;
export type InsertBusinessLocation = typeof businessLocations.$inferInsert;
