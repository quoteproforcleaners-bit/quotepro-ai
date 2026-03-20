var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  analyticsEvents: () => analyticsEvents,
  apiKeys: () => apiKeys,
  attributionEvents: () => attributionEvents,
  automationRules: () => automationRules,
  badges: () => badges,
  businessFiles: () => businessFiles,
  businesses: () => businesses,
  calendarEventStubs: () => calendarEventStubs,
  campaigns: () => campaigns,
  channelConnections: () => channelConnections,
  communications: () => communications,
  customerMarketingPrefs: () => customerMarketingPrefs,
  customers: () => customers,
  followUpTouches: () => followUpTouches,
  googleCalendarTokens: () => googleCalendarTokens,
  growthAutomationSettings: () => growthAutomationSettings,
  growthTaskEvents: () => growthTaskEvents,
  growthTasks: () => growthTasks,
  importedJobs: () => importedJobs,
  insertUserSchema: () => insertUserSchema,
  invoicePackets: () => invoicePackets,
  jobChecklistItems: () => jobChecklistItems,
  jobNotes: () => jobNotes,
  jobPhotos: () => jobPhotos,
  jobStatusHistory: () => jobStatusHistory,
  jobberClientMappings: () => jobberClientMappings,
  jobberConnections: () => jobberConnections,
  jobberJobLinks: () => jobberJobLinks,
  jobberSyncLog: () => jobberSyncLog,
  jobs: () => jobs,
  leadFinderEvents: () => leadFinderEvents,
  leadFinderLeads: () => leadFinderLeads,
  leadFinderReplies: () => leadFinderReplies,
  leadFinderSettings: () => leadFinderSettings,
  pricingAnalyses: () => pricingAnalyses,
  pricingQuestionnaires: () => pricingQuestionnaires,
  pricingRules: () => pricingRules,
  pricingSettings: () => pricingSettings,
  publishedPricingProfiles: () => publishedPricingProfiles,
  pushTokens: () => pushTokens,
  qboConnections: () => qboConnections,
  qboCustomerMappings: () => qboCustomerMappings,
  qboInvoiceLinks: () => qboInvoiceLinks,
  qboSyncLog: () => qboSyncLog,
  quoteFollowUps: () => quoteFollowUps,
  quoteLineItems: () => quoteLineItems,
  quotes: () => quotes,
  reviewRequests: () => reviewRequests,
  salesRecommendations: () => salesRecommendations,
  salesStrategySettings: () => salesStrategySettings,
  sequenceEnrollments: () => sequenceEnrollments,
  socialAutomationSettings: () => socialAutomationSettings,
  socialConversations: () => socialConversations,
  socialLeads: () => socialLeads,
  socialMessages: () => socialMessages,
  socialOptOuts: () => socialOptOuts,
  streaks: () => streaks,
  tasks: () => tasks,
  userPreferences: () => userPreferences,
  users: () => users,
  webhookDeliveries: () => webhookDeliveries,
  webhookEndpoints: () => webhookEndpoints,
  webhookEvents: () => webhookEvents
});
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  jsonb,
  integer,
  real
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users, businesses, pricingSettings, customers, quotes, salesRecommendations, quoteFollowUps, quoteLineItems, jobs, jobChecklistItems, jobPhotos, jobStatusHistory, jobNotes, pushTokens, communications, automationRules, tasks, channelConnections, socialConversations, socialMessages, socialLeads, attributionEvents, socialAutomationSettings, socialOptOuts, googleCalendarTokens, followUpTouches, streaks, userPreferences, analyticsEvents, badges, growthTasks, growthTaskEvents, reviewRequests, customerMarketingPrefs, growthAutomationSettings, salesStrategySettings, campaigns, insertUserSchema, invoicePackets, calendarEventStubs, apiKeys, webhookEndpoints, webhookEvents, webhookDeliveries, qboConnections, qboCustomerMappings, qboInvoiceLinks, qboSyncLog, jobberConnections, jobberClientMappings, jobberJobLinks, jobberSyncLog, leadFinderSettings, leadFinderLeads, leadFinderReplies, leadFinderEvents, businessFiles, sequenceEnrollments, importedJobs, pricingQuestionnaires, pricingRules, pricingAnalyses, publishedPricingProfiles;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      email: text("email").notNull().unique(),
      name: text("name"),
      passwordHash: text("password_hash"),
      authProvider: text("auth_provider").notNull().default("email"),
      providerId: text("provider_id"),
      subscriptionTier: text("subscription_tier").notNull().default("free"),
      subscriptionInterval: text("subscription_interval").default("monthly"),
      subscriptionExpiresAt: timestamp("subscription_expires_at"),
      stripeCustomerId: text("stripe_customer_id"),
      quotesThisMonth: integer("quotes_this_month").default(0),
      quotesMonthResetAt: timestamp("quotes_month_reset_at"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    businesses = pgTable("businesses", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      ownerUserId: varchar("owner_user_id").notNull().references(() => users.id),
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
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    pricingSettings = pgTable("pricing_settings", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      settings: jsonb("settings").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    customers = pgTable("customers", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
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
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    quotes = pgTable("quotes", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      customerId: varchar("customer_id").references(() => customers.id),
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
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    salesRecommendations = pgTable("sales_recommendations", {
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
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    quoteFollowUps = pgTable("quote_follow_ups", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      scheduledFor: timestamp("scheduled_for").notNull(),
      channel: text("channel").notNull().default("sms"),
      message: text("message").notNull().default(""),
      status: text("status").notNull().default("scheduled"),
      sentAt: timestamp("sent_at"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    quoteLineItems = pgTable("quote_line_items", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
      name: text("name").notNull(),
      quantity: integer("quantity").notNull().default(1),
      unitPrice: real("unit_price").notNull().default(0),
      totalPrice: real("total_price").notNull().default(0),
      type: text("type").notNull().default("base"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    jobs = pgTable("jobs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      customerId: varchar("customer_id").references(() => customers.id),
      quoteId: varchar("quote_id").references(() => quotes.id),
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
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    jobChecklistItems = pgTable("job_checklist_items", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
      label: text("label").notNull(),
      completed: boolean("completed").notNull().default(false),
      sortOrder: integer("sort_order").notNull().default(0),
      roomGroup: text("room_group").notNull().default("General"),
      customerVisible: boolean("customer_visible").notNull().default(true)
    });
    jobPhotos = pgTable("job_photos", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
      photoUrl: text("photo_url").notNull(),
      photoType: text("photo_type").notNull().default("after"),
      caption: text("caption").notNull().default(""),
      customerVisible: boolean("customer_visible").notNull().default(true),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    jobStatusHistory = pgTable("job_status_history", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
      status: text("status").notNull(),
      note: text("note").notNull().default(""),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    jobNotes = pgTable("job_notes", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
      content: text("content").notNull(),
      customerVisible: boolean("customer_visible").notNull().default(false),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    pushTokens = pgTable("push_tokens", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      token: text("token").notNull().unique(),
      platform: text("platform").notNull().default("ios"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    communications = pgTable("communications", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      customerId: varchar("customer_id").references(() => customers.id),
      quoteId: varchar("quote_id").references(() => quotes.id),
      jobId: varchar("job_id").references(() => jobs.id),
      channel: text("channel").notNull().default("sms"),
      direction: text("direction").notNull().default("outbound"),
      templateKey: text("template_key"),
      content: text("content").notNull().default(""),
      status: text("status").notNull().default("queued"),
      providerMessageId: text("provider_message_id"),
      scheduledFor: timestamp("scheduled_for"),
      sentAt: timestamp("sent_at"),
      errorMessage: text("error_message"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    automationRules = pgTable("automation_rules", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      enabled: boolean("enabled").notNull().default(true),
      quoteFollowupsEnabled: boolean("quote_followups_enabled").notNull().default(false),
      followupSchedule: jsonb("followup_schedule").notNull().default(sql`'[{"delayMinutes":60,"templateKey":"followup_1h"},{"delayMinutes":1440,"templateKey":"followup_24h"},{"delayMinutes":4320,"templateKey":"followup_3d"},{"delayMinutes":10080,"templateKey":"followup_7d"}]'::jsonb`),
      quoteExpirationDays: integer("quote_expiration_days").notNull().default(7),
      jobRemindersEnabled: boolean("job_reminders_enabled").notNull().default(false),
      jobReminderMinutesBefore: integer("job_reminder_minutes_before").notNull().default(1440),
      followupChannel: text("followup_channel").notNull().default("sms"),
      messageTemplates: jsonb("message_templates").notNull().default(sql`'{}'::jsonb`),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    tasks = pgTable("tasks", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      customerId: varchar("customer_id").references(() => customers.id),
      title: text("title").notNull(),
      description: text("description").notNull().default(""),
      type: text("type").notNull().default("follow_up"),
      dueDate: timestamp("due_date"),
      completed: boolean("completed").notNull().default(false),
      completedAt: timestamp("completed_at"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    channelConnections = pgTable("channel_connections", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
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
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    socialConversations = pgTable("social_conversations", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      channelConnectionId: varchar("channel_connection_id").references(() => channelConnections.id),
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
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    socialMessages = pgTable("social_messages", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      conversationId: varchar("conversation_id").notNull().references(() => socialConversations.id, { onDelete: "cascade" }),
      direction: text("direction").notNull().default("inbound"),
      content: text("content").notNull().default(""),
      externalMessageId: text("external_message_id"),
      intentDetected: boolean("intent_detected"),
      intentConfidence: real("intent_confidence"),
      intentCategory: text("intent_category"),
      autoReplyContent: text("auto_reply_content"),
      quoteLink: text("quote_link"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    socialLeads = pgTable("social_leads", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      customerId: varchar("customer_id").references(() => customers.id),
      conversationId: varchar("conversation_id").references(() => socialConversations.id),
      channel: text("channel").notNull(),
      attribution: text("attribution").notNull().default("auto_dm"),
      senderName: text("sender_name").notNull().default(""),
      senderHandle: text("sender_handle"),
      dmText: text("dm_text"),
      quoteId: varchar("quote_id").references(() => quotes.id),
      status: text("status").notNull().default("new"),
      revenue: real("revenue"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    attributionEvents = pgTable("attribution_events", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      socialLeadId: varchar("social_lead_id").references(() => socialLeads.id),
      conversationId: varchar("conversation_id").references(() => socialConversations.id),
      channel: text("channel").notNull(),
      eventType: text("event_type").notNull(),
      metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    socialAutomationSettings = pgTable("social_automation_settings", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      autoRepliesEnabled: boolean("auto_replies_enabled").notNull().default(false),
      intentThreshold: real("intent_threshold").notNull().default(0.7),
      quietHoursEnabled: boolean("quiet_hours_enabled").notNull().default(false),
      quietHoursStart: text("quiet_hours_start").notNull().default("22:00"),
      quietHoursEnd: text("quiet_hours_end").notNull().default("08:00"),
      replyTemplate: text("reply_template").notNull().default("Hi! Thanks for reaching out. Here's a quick link to get an instant quote: {link}"),
      optOutKeywords: jsonb("opt_out_keywords").notNull().default(sql`'["stop","unsubscribe","quit","opt out"]'::jsonb`),
      socialOnboardingComplete: boolean("social_onboarding_complete").notNull().default(false),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    socialOptOuts = pgTable("social_opt_outs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      channel: text("channel").notNull(),
      externalUserId: text("external_user_id").notNull(),
      senderName: text("sender_name"),
      reason: text("reason"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    googleCalendarTokens = pgTable("google_calendar_tokens", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      accessToken: text("access_token").notNull(),
      refreshToken: text("refresh_token").notNull(),
      expiresAt: timestamp("expires_at").notNull(),
      calendarId: text("calendar_id").default("primary"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    followUpTouches = pgTable("follow_up_touches", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      quoteId: varchar("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
      customerId: varchar("customer_id").references(() => customers.id),
      channel: text("channel").notNull(),
      snoozedUntil: timestamp("snoozed_until"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    streaks = pgTable("streaks", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id).unique(),
      currentStreak: integer("current_streak").notNull().default(0),
      longestStreak: integer("longest_streak").notNull().default(0),
      lastActionDate: text("last_action_date"),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    userPreferences = pgTable("user_preferences", {
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
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    analyticsEvents = pgTable("analytics_events", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      eventName: text("event_name").notNull(),
      properties: jsonb("properties").notNull().default(sql`'{}'::jsonb`),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    badges = pgTable("badges", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      badgeKey: text("badge_key").notNull(),
      earnedAt: timestamp("earned_at").defaultNow().notNull()
    });
    growthTasks = pgTable("growth_tasks", {
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
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    growthTaskEvents = pgTable("growth_task_events", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      taskId: varchar("task_id").notNull().references(() => growthTasks.id, { onDelete: "cascade" }),
      action: text("action").notNull(),
      channel: text("channel"),
      metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    reviewRequests = pgTable("review_requests", {
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
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    customerMarketingPrefs = pgTable("customer_marketing_prefs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      customerId: varchar("customer_id").notNull().references(() => customers.id),
      doNotContact: boolean("do_not_contact").notNull().default(false),
      preferredChannel: text("preferred_channel").notNull().default("sms"),
      lastReviewRequestAt: timestamp("last_review_request_at"),
      reviewRequestCooldownDays: integer("review_request_cooldown_days").notNull().default(90),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    growthAutomationSettings = pgTable("growth_automation_settings", {
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
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    salesStrategySettings = pgTable("sales_strategy_settings", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id).unique(),
      selectedProfile: text("selected_profile").notNull().default("professional"),
      escalationEnabled: boolean("escalation_enabled").notNull().default(true),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    campaigns = pgTable("campaigns", {
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
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    insertUserSchema = createInsertSchema(users).pick({
      email: true,
      name: true,
      passwordHash: true,
      authProvider: true,
      providerId: true
    });
    invoicePackets = pgTable("invoice_packets", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    calendarEventStubs = pgTable("calendar_event_stubs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      quoteId: varchar("quote_id").references(() => quotes.id),
      userId: varchar("user_id").references(() => users.id),
      businessId: varchar("business_id").references(() => businesses.id),
      startDatetime: timestamp("start_datetime").notNull(),
      endDatetime: timestamp("end_datetime").notNull(),
      location: text("location"),
      title: text("title").notNull(),
      description: text("description"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    apiKeys = pgTable("api_keys", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      keyHash: text("key_hash").notNull(),
      keyPrefix: text("key_prefix").notNull(),
      label: text("label"),
      isActive: boolean("is_active").notNull().default(true),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      rotatedAt: timestamp("rotated_at")
    });
    webhookEndpoints = pgTable("webhook_endpoints", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      url: text("url").notNull(),
      isActive: boolean("is_active").notNull().default(true),
      enabledEvents: jsonb("enabled_events").default(sql`'[]'::jsonb`),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    webhookEvents = pgTable("webhook_events", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      eventType: text("event_type").notNull(),
      payloadJson: jsonb("payload_json"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    webhookDeliveries = pgTable("webhook_deliveries", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      webhookEventId: varchar("webhook_event_id").notNull().references(() => webhookEvents.id),
      endpointId: varchar("endpoint_id").notNull().references(() => webhookEndpoints.id),
      attemptNumber: integer("attempt_number").notNull().default(1),
      statusCode: integer("status_code"),
      responseBodyExcerpt: text("response_body_excerpt"),
      nextRetryAt: timestamp("next_retry_at"),
      deliveredAt: timestamp("delivered_at"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    qboConnections = pgTable("qbo_connections", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().unique().references(() => users.id),
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
      autoCreateInvoice: boolean("auto_create_invoice").notNull().default(false)
    });
    qboCustomerMappings = pgTable("qbo_customer_mappings", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      qpCustomerId: varchar("qp_customer_id").notNull().references(() => customers.id),
      qboCustomerId: text("qbo_customer_id").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    qboInvoiceLinks = pgTable("qbo_invoice_links", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      quoteId: varchar("quote_id").notNull().references(() => quotes.id),
      qboInvoiceId: text("qbo_invoice_id").notNull(),
      qboDocNumber: text("qbo_doc_number"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    qboSyncLog = pgTable("qbo_sync_log", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      quoteId: varchar("quote_id"),
      action: text("action").notNull(),
      requestSummary: jsonb("request_summary"),
      responseSummary: jsonb("response_summary"),
      status: text("status").notNull(),
      errorMessage: text("error_message"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    jobberConnections = pgTable("jobber_connections", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().unique().references(() => users.id),
      accessTokenEncrypted: text("access_token_encrypted"),
      refreshTokenEncrypted: text("refresh_token_encrypted"),
      accessTokenExpiresAt: timestamp("access_token_expires_at"),
      connectedAt: timestamp("connected_at"),
      disconnectedAt: timestamp("disconnected_at"),
      scopes: text("scopes"),
      status: text("status").notNull().default("disconnected"),
      lastError: text("last_error"),
      autoCreateJobOnQuoteAccept: boolean("auto_create_job_on_quote_accept").notNull().default(false)
    });
    jobberClientMappings = pgTable("jobber_client_mappings", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      qpCustomerId: varchar("qp_customer_id").notNull().references(() => customers.id),
      jobberClientId: text("jobber_client_id").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    jobberJobLinks = pgTable("jobber_job_links", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      quoteId: varchar("quote_id").notNull().references(() => quotes.id),
      jobberClientId: text("jobber_client_id").notNull(),
      jobberJobId: text("jobber_job_id").notNull(),
      jobberJobNumber: text("jobber_job_number"),
      syncStatus: text("sync_status").notNull().default("success"),
      syncTrigger: text("sync_trigger").notNull().default("manual"),
      errorMessage: text("error_message"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    jobberSyncLog = pgTable("jobber_sync_log", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      quoteId: varchar("quote_id"),
      action: text("action").notNull(),
      requestSummary: jsonb("request_summary"),
      responseSummary: jsonb("response_summary"),
      status: text("status").notNull(),
      errorMessage: text("error_message"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    leadFinderSettings = pgTable("lead_finder_settings", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      enabled: boolean("enabled").notNull().default(true),
      targetCities: jsonb("target_cities").default([]),
      targetZips: jsonb("target_zips").default([]),
      radiusMiles: integer("radius_miles").notNull().default(25),
      keywords: jsonb("keywords").default([]),
      subreddits: jsonb("subreddits").default([]),
      notifyNewLeads: boolean("notify_new_leads").notNull().default(true),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    leadFinderLeads = pgTable("lead_finder_leads", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
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
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    leadFinderReplies = pgTable("lead_finder_replies", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      leadId: varchar("lead_id").notNull().references(() => leadFinderLeads.id),
      tone: text("tone").notNull(),
      replyText: text("reply_text").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    leadFinderEvents = pgTable("lead_finder_events", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      leadId: varchar("lead_id").references(() => leadFinderLeads.id),
      userId: varchar("user_id").references(() => users.id),
      eventType: text("event_type").notNull(),
      metadata: jsonb("metadata"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    businessFiles = pgTable("business_files", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      originalName: text("original_name").notNull(),
      fileName: text("file_name").notNull(),
      fileType: text("file_type").notNull(),
      fileSize: integer("file_size").notNull().default(0),
      fileUrl: text("file_url").notNull(),
      description: text("description").notNull().default(""),
      category: text("category").notNull().default("general"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    sequenceEnrollments = pgTable("sequence_enrollments", {
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
      notes: text("notes").notNull().default("")
    });
    importedJobs = pgTable("imported_jobs", {
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
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    pricingQuestionnaires = pgTable("pricing_questionnaires", {
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
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    pricingRules = pgTable("pricing_rules", {
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
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    pricingAnalyses = pgTable("pricing_analyses", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      status: text("status").default("pending"),
      jobCount: integer("job_count").default(0),
      inferredSummary: jsonb("inferred_summary").default({}),
      revenueOpportunities: jsonb("revenue_opportunities").default([]),
      recommendedRules: jsonb("recommended_rules").default([]),
      rawAiOutput: text("raw_ai_output").default(""),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    publishedPricingProfiles = pgTable("published_pricing_profiles", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      businessId: varchar("business_id").notNull().references(() => businesses.id),
      version: integer("version").default(1),
      rules: jsonb("rules").notNull().default([]),
      publishedAt: timestamp("published_at").defaultNow().notNull(),
      changeSummary: text("change_summary").default("")
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  pool: () => pool
});
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    db = drizzle(pool, { schema: schema_exports });
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  cancelPendingCommunicationsForQuote: () => cancelPendingCommunicationsForQuote,
  countNewLeadFinderLeads: () => countNewLeadFinderLeads,
  countTodayTasksForCustomer: () => countTodayTasksForCustomer,
  createAnalyticsEvent: () => createAnalyticsEvent,
  createApiKey: () => createApiKey,
  createBadge: () => createBadge,
  createBusiness: () => createBusiness,
  createCalendarEventStub: () => createCalendarEventStub,
  createCampaign: () => createCampaign,
  createChecklistItem: () => createChecklistItem,
  createCommunication: () => createCommunication,
  createCustomer: () => createCustomer,
  createFollowUp: () => createFollowUp,
  createFollowUpTouch: () => createFollowUpTouch,
  createGrowthTask: () => createGrowthTask,
  createGrowthTaskEvent: () => createGrowthTaskEvent,
  createInvoicePacket: () => createInvoicePacket,
  createJob: () => createJob,
  createJobPhoto: () => createJobPhoto,
  createLeadIfNotExists: () => createLeadIfNotExists,
  createLineItem: () => createLineItem,
  createQuote: () => createQuote,
  createRecommendation: () => createRecommendation,
  createReviewRequest: () => createReviewRequest,
  createTask: () => createTask,
  createUser: () => createUser,
  createWebhookDelivery: () => createWebhookDelivery,
  createWebhookEndpoint: () => createWebhookEndpoint,
  createWebhookEvent: () => createWebhookEvent,
  deactivateApiKey: () => deactivateApiKey,
  deleteChecklistItem: () => deleteChecklistItem,
  deleteCustomer: () => deleteCustomer,
  deleteFollowUp: () => deleteFollowUp,
  deleteGoogleCalendarToken: () => deleteGoogleCalendarToken,
  deleteGrowthTask: () => deleteGrowthTask,
  deleteJob: () => deleteJob,
  deleteJobPhoto: () => deleteJobPhoto,
  deleteLineItemsByQuote: () => deleteLineItemsByQuote,
  deletePushToken: () => deletePushToken,
  deleteQuote: () => deleteQuote,
  deleteTask: () => deleteTask,
  deleteWebhookEndpoint: () => deleteWebhookEndpoint,
  expireOldQuotes: () => expireOldQuotes,
  findBusinessesWithLeadFinderEnabled: () => findBusinessesWithLeadFinderEnabled,
  getActiveGrowthTasksForCustomer: () => getActiveGrowthTasksForCustomer,
  getActiveGrowthTasksForQuote: () => getActiveGrowthTasksForQuote,
  getActiveWebhookEndpointsForBusiness: () => getActiveWebhookEndpointsForBusiness,
  getAllBusinessIds: () => getAllBusinessIds,
  getAnalyticsEvents: () => getAnalyticsEvents,
  getApiKeyByHash: () => getApiKeyByHash,
  getApiKeysByUserId: () => getApiKeysByUserId,
  getAutoRebookCandidates: () => getAutoRebookCandidates,
  getAutomationRules: () => getAutomationRules,
  getBadgesByBusiness: () => getBadgesByBusiness,
  getBusinessById: () => getBusinessById,
  getBusinessByOwner: () => getBusinessByOwner,
  getCalendarEventStubsByQuoteId: () => getCalendarEventStubsByQuoteId,
  getCampaignById: () => getCampaignById,
  getCampaignsByBusiness: () => getCampaignsByBusiness,
  getChecklistByJob: () => getChecklistByJob,
  getCommunicationById: () => getCommunicationById,
  getCommunicationsByBusiness: () => getCommunicationsByBusiness,
  getCustomerById: () => getCustomerById,
  getCustomersByBusiness: () => getCustomersByBusiness,
  getDormantCustomers: () => getDormantCustomers,
  getEventsByTask: () => getEventsByTask,
  getFollowUpQueueQuotes: () => getFollowUpQueueQuotes,
  getFollowUpTouchesByBusiness: () => getFollowUpTouchesByBusiness,
  getFollowUpTouchesByQuote: () => getFollowUpTouchesByQuote,
  getFollowUpsByBusiness: () => getFollowUpsByBusiness,
  getFollowUpsByQuote: () => getFollowUpsByQuote,
  getForecastData: () => getForecastData,
  getGeneratedReplies: () => getGeneratedReplies,
  getGoogleCalendarToken: () => getGoogleCalendarToken,
  getGrowthAutomationSettings: () => getGrowthAutomationSettings,
  getGrowthTaskById: () => getGrowthTaskById,
  getGrowthTasksByBusiness: () => getGrowthTasksByBusiness,
  getInvoicePacketById: () => getInvoicePacketById,
  getInvoicePacketsByQuoteId: () => getInvoicePacketsByQuoteId,
  getJobById: () => getJobById,
  getJobByRatingToken: () => getJobByRatingToken,
  getJobsByBusiness: () => getJobsByBusiness,
  getLastTouchForQuote: () => getLastTouchForQuote,
  getLeadFinderLeadById: () => getLeadFinderLeadById,
  getLeadFinderLeads: () => getLeadFinderLeads,
  getLeadFinderSettings: () => getLeadFinderSettings,
  getLineItemsByQuote: () => getLineItemsByQuote,
  getLostQuotes: () => getLostQuotes,
  getMarketingPrefsByCustomer: () => getMarketingPrefsByCustomer,
  getPendingCommunications: () => getPendingCommunications,
  getPhotosByJob: () => getPhotosByJob,
  getPreferencesByBusiness: () => getPreferencesByBusiness,
  getPricingByBusiness: () => getPricingByBusiness,
  getPushTokensByUser: () => getPushTokensByUser,
  getQuoteById: () => getQuoteById,
  getQuoteByToken: () => getQuoteByToken,
  getQuoteStats: () => getQuoteStats,
  getQuotesByBusiness: () => getQuotesByBusiness,
  getRatingsSummary: () => getRatingsSummary,
  getRecommendationsByQuote: () => getRecommendationsByQuote,
  getRevenueByPeriod: () => getRevenueByPeriod,
  getReviewRequestByJob: () => getReviewRequestByJob,
  getReviewRequestsByBusiness: () => getReviewRequestsByBusiness,
  getSalesStrategy: () => getSalesStrategy,
  getScheduledFollowUpsForQuote: () => getScheduledFollowUpsForQuote,
  getStaleQuotesForNudge: () => getStaleQuotesForNudge,
  getStreakByBusiness: () => getStreakByBusiness,
  getTaskById: () => getTaskById,
  getTasksByBusiness: () => getTasksByBusiness,
  getUnfollowedQuotes: () => getUnfollowedQuotes,
  getUpsellOpportunities: () => getUpsellOpportunities,
  getUserByEmail: () => getUserByEmail,
  getUserById: () => getUserById,
  getUserByProviderId: () => getUserByProviderId,
  getWebhookDeliveriesByEventId: () => getWebhookDeliveriesByEventId,
  getWebhookEndpointsByUserId: () => getWebhookEndpointsByUserId,
  getWebhookEventById: () => getWebhookEventById,
  getWebhookEventsByUserId: () => getWebhookEventsByUserId,
  getWeeklyQuoteStats: () => getWeeklyQuoteStats,
  getWeeklyRecapStats: () => getWeeklyRecapStats,
  hasBadge: () => hasBadge,
  logLeadFinderEvent: () => logLeadFinderEvent,
  markMilestoneCelebrated: () => markMilestoneCelebrated,
  markQuoteNudgeSent: () => markQuoteNudgeSent,
  markReviewRequestSent: () => markReviewRequestSent,
  markWeeklyDigestSent: () => markWeeklyDigestSent,
  rateJob: () => rateJob,
  saveGeneratedReplies: () => saveGeneratedReplies,
  updateBusiness: () => updateBusiness,
  updateCampaign: () => updateCampaign,
  updateChecklistItem: () => updateChecklistItem,
  updateCommunication: () => updateCommunication,
  updateCustomer: () => updateCustomer,
  updateFollowUp: () => updateFollowUp,
  updateGrowthTask: () => updateGrowthTask,
  updateJob: () => updateJob,
  updateLeadStatus: () => updateLeadStatus,
  updateQuote: () => updateQuote,
  updateRecommendation: () => updateRecommendation,
  updateReviewRequest: () => updateReviewRequest,
  updateTask: () => updateTask,
  updateUser: () => updateUser,
  updateWebhookDelivery: () => updateWebhookDelivery,
  updateWebhookEndpoint: () => updateWebhookEndpoint,
  upsertAutomationRules: () => upsertAutomationRules,
  upsertGoogleCalendarToken: () => upsertGoogleCalendarToken,
  upsertGrowthAutomationSettings: () => upsertGrowthAutomationSettings,
  upsertLeadFinderSettings: () => upsertLeadFinderSettings,
  upsertMarketingPrefs: () => upsertMarketingPrefs,
  upsertPreferences: () => upsertPreferences,
  upsertPricingSettings: () => upsertPricingSettings,
  upsertPushToken: () => upsertPushToken,
  upsertSalesStrategy: () => upsertSalesStrategy,
  upsertStreak: () => upsertStreak
});
import { eq, and, desc, asc, gte, lte, ilike, or, sql as sql2, isNotNull, isNull, lt } from "drizzle-orm";
async function getUserById(id) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}
async function getUserByEmail(email) {
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  return user;
}
async function getUserByProviderId(provider, providerId) {
  const results = await db.select().from(users).where(eq(users.providerId, providerId));
  return results.find((u) => u.authProvider === provider);
}
async function createUser(data) {
  const [user] = await db.insert(users).values({
    email: data.email.toLowerCase(),
    name: data.name || null,
    passwordHash: data.passwordHash || null,
    authProvider: data.authProvider,
    providerId: data.providerId || null
  }).returning();
  return user;
}
async function updateUser(userId, data) {
  const [user] = await db.update(users).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, userId)).returning();
  return user;
}
async function getBusinessByOwner(userId) {
  const [business] = await db.select().from(businesses).where(eq(businesses.ownerUserId, userId));
  return business;
}
async function createBusiness(userId) {
  const [business] = await db.insert(businesses).values({ ownerUserId: userId }).returning();
  return business;
}
async function updateBusiness(businessId, data) {
  const [business] = await db.update(businesses).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(businesses.id, businessId)).returning();
  return business;
}
async function getPricingByBusiness(businessId) {
  const [row] = await db.select().from(pricingSettings).where(eq(pricingSettings.businessId, businessId));
  return row;
}
async function upsertPricingSettings(businessId, settings) {
  const existing = await getPricingByBusiness(businessId);
  if (existing) {
    const [row2] = await db.update(pricingSettings).set({ settings, updatedAt: /* @__PURE__ */ new Date() }).where(eq(pricingSettings.id, existing.id)).returning();
    return row2;
  }
  const [row] = await db.insert(pricingSettings).values({ businessId, settings }).returning();
  return row;
}
async function getCustomersByBusiness(businessId, opts) {
  let query = db.select().from(customers).where(eq(customers.businessId, businessId));
  if (opts?.status) {
    query = query.where(and(eq(customers.businessId, businessId), eq(customers.status, opts.status)));
  }
  if (opts?.search) {
    const s = `%${opts.search}%`;
    query = db.select().from(customers).where(
      and(
        eq(customers.businessId, businessId),
        or(
          ilike(customers.firstName, s),
          ilike(customers.lastName, s),
          ilike(customers.email, s),
          ilike(customers.phone, s)
        )
      )
    );
  }
  return query.orderBy(desc(customers.updatedAt));
}
async function getCustomerById(id) {
  const [c] = await db.select().from(customers).where(eq(customers.id, id));
  return c;
}
async function createCustomer(data) {
  const [c] = await db.insert(customers).values({
    businessId: data.businessId,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone || "",
    email: data.email || "",
    address: data.address || "",
    notes: data.notes || "",
    tags: data.tags || [],
    leadSource: data.leadSource || null,
    status: data.status || "lead"
  }).returning();
  return c;
}
async function updateCustomer(id, data) {
  const [c] = await db.update(customers).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(customers.id, id)).returning();
  return c;
}
async function deleteCustomer(id) {
  const customerQuotes = await db.select({ id: quotes.id }).from(quotes).where(eq(quotes.customerId, id));
  for (const q of customerQuotes) {
    await db.delete(quoteLineItems).where(eq(quoteLineItems.quoteId, q.id));
  }
  await db.delete(quotes).where(eq(quotes.customerId, id));
  const customerJobs = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.customerId, id));
  for (const j of customerJobs) {
    await db.delete(jobChecklistItems).where(eq(jobChecklistItems.jobId, j.id));
    await db.delete(jobPhotos).where(eq(jobPhotos.jobId, j.id));
  }
  await db.delete(jobs).where(eq(jobs.customerId, id));
  await db.delete(communications).where(eq(communications.customerId, id));
  await db.delete(tasks).where(eq(tasks.customerId, id));
  await db.delete(customers).where(eq(customers.id, id));
}
async function getQuotesByBusiness(businessId, opts) {
  const conditions = [eq(quotes.businessId, businessId)];
  if (opts?.status) conditions.push(eq(quotes.status, opts.status));
  if (opts?.customerId) conditions.push(eq(quotes.customerId, opts.customerId));
  return db.select().from(quotes).where(and(...conditions)).orderBy(desc(quotes.createdAt));
}
async function getQuoteById(id) {
  const [q] = await db.select().from(quotes).where(eq(quotes.id, id));
  return q;
}
async function getQuoteByToken(token) {
  const [q] = await db.select().from(quotes).where(eq(quotes.publicToken, token));
  return q;
}
async function createQuote(data) {
  const [q] = await db.insert(quotes).values({
    businessId: data.businessId,
    customerId: data.customerId || null,
    propertyBeds: data.propertyBeds,
    propertyBaths: data.propertyBaths,
    propertySqft: data.propertySqft,
    propertyDetails: data.propertyDetails,
    addOns: data.addOns,
    frequencySelected: data.frequencySelected,
    selectedOption: data.selectedOption,
    options: data.options,
    subtotal: data.subtotal,
    tax: data.tax,
    total: data.total,
    status: data.status || "draft",
    emailDraft: data.emailDraft || null,
    smsDraft: data.smsDraft || null,
    expiresAt: data.expiresAt || null
  }).returning();
  return q;
}
async function updateQuote(id, data) {
  const [q] = await db.update(quotes).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(quotes.id, id)).returning();
  return q;
}
async function deleteQuote(id) {
  await db.delete(quotes).where(eq(quotes.id, id));
}
async function getLineItemsByQuote(quoteId) {
  return db.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, quoteId));
}
async function createLineItem(data) {
  const [li] = await db.insert(quoteLineItems).values(data).returning();
  return li;
}
async function deleteLineItemsByQuote(quoteId) {
  await db.delete(quoteLineItems).where(eq(quoteLineItems.quoteId, quoteId));
}
async function getJobsByBusiness(businessId, opts) {
  const conditions = [eq(jobs.businessId, businessId)];
  if (opts?.status) conditions.push(eq(jobs.status, opts.status));
  if (opts?.customerId) conditions.push(eq(jobs.customerId, opts.customerId));
  if (opts?.from) conditions.push(gte(jobs.startDatetime, opts.from));
  if (opts?.to) conditions.push(lte(jobs.startDatetime, opts.to));
  return db.select().from(jobs).where(and(...conditions)).orderBy(asc(jobs.startDatetime));
}
async function getJobById(id) {
  const [j] = await db.select().from(jobs).where(eq(jobs.id, id));
  return j;
}
async function getJobByRatingToken(token) {
  const [j] = await db.select().from(jobs).where(eq(jobs.ratingToken, token));
  return j;
}
async function createJob(data) {
  const [j] = await db.insert(jobs).values({
    businessId: data.businessId,
    customerId: data.customerId || null,
    quoteId: data.quoteId || null,
    jobType: data.jobType,
    status: data.status || "scheduled",
    startDatetime: data.startDatetime,
    endDatetime: data.endDatetime || null,
    recurrence: data.recurrence || "none",
    internalNotes: data.internalNotes || "",
    address: data.address || "",
    total: data.total || null
  }).returning();
  return j;
}
async function updateJob(id, data) {
  const [j] = await db.update(jobs).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(jobs.id, id)).returning();
  return j;
}
async function deleteJob(id) {
  await db.delete(jobs).where(eq(jobs.id, id));
}
async function getChecklistByJob(jobId) {
  return db.select().from(jobChecklistItems).where(eq(jobChecklistItems.jobId, jobId)).orderBy(asc(jobChecklistItems.sortOrder));
}
async function createChecklistItem(data) {
  const [item] = await db.insert(jobChecklistItems).values({ jobId: data.jobId, label: data.label, sortOrder: data.sortOrder || 0 }).returning();
  return item;
}
async function updateChecklistItem(id, data) {
  const [item] = await db.update(jobChecklistItems).set(data).where(eq(jobChecklistItems.id, id)).returning();
  return item;
}
async function deleteChecklistItem(id) {
  await db.delete(jobChecklistItems).where(eq(jobChecklistItems.id, id));
}
async function getPhotosByJob(jobId) {
  return db.select().from(jobPhotos).where(eq(jobPhotos.jobId, jobId)).orderBy(desc(jobPhotos.createdAt));
}
async function createJobPhoto(data) {
  const [photo] = await db.insert(jobPhotos).values({
    jobId: data.jobId,
    photoUrl: data.photoUrl,
    photoType: data.photoType || "after",
    caption: data.caption || ""
  }).returning();
  return photo;
}
async function deleteJobPhoto(id) {
  await db.delete(jobPhotos).where(eq(jobPhotos.id, id));
}
async function getPushTokensByUser(userId) {
  return db.select().from(pushTokens).where(eq(pushTokens.userId, userId));
}
async function upsertPushToken(data) {
  const existing = await db.select().from(pushTokens).where(eq(pushTokens.token, data.token));
  if (existing.length > 0) {
    const [updated] = await db.update(pushTokens).set({ userId: data.userId }).where(eq(pushTokens.token, data.token)).returning();
    return updated;
  }
  const [token] = await db.insert(pushTokens).values({
    userId: data.userId,
    token: data.token,
    platform: data.platform || "ios"
  }).returning();
  return token;
}
async function deletePushToken(token) {
  await db.delete(pushTokens).where(eq(pushTokens.token, token));
}
async function getCommunicationsByBusiness(businessId, opts) {
  const conditions = [eq(communications.businessId, businessId)];
  if (opts?.customerId) conditions.push(eq(communications.customerId, opts.customerId));
  if (opts?.quoteId) conditions.push(eq(communications.quoteId, opts.quoteId));
  if (opts?.jobId) conditions.push(eq(communications.jobId, opts.jobId));
  return db.select().from(communications).where(and(...conditions)).orderBy(desc(communications.createdAt));
}
async function createCommunication(data) {
  const [c] = await db.insert(communications).values({
    businessId: data.businessId,
    customerId: data.customerId || null,
    quoteId: data.quoteId || null,
    jobId: data.jobId || null,
    channel: data.channel,
    direction: data.direction || "outbound",
    templateKey: data.templateKey || null,
    content: data.content,
    status: data.status || "queued",
    scheduledFor: data.scheduledFor || null
  }).returning();
  return c;
}
async function updateCommunication(id, data) {
  const [c] = await db.update(communications).set(data).where(eq(communications.id, id)).returning();
  return c;
}
async function getScheduledFollowUpsForQuote(quoteId) {
  return db.select().from(communications).where(
    and(
      eq(communications.quoteId, quoteId),
      eq(communications.status, "queued")
    )
  ).orderBy(asc(communications.scheduledFor));
}
async function getCommunicationById(id) {
  const [c] = await db.select().from(communications).where(eq(communications.id, id));
  return c;
}
async function getPendingCommunications() {
  return db.select().from(communications).where(
    and(
      eq(communications.status, "queued"),
      lte(communications.scheduledFor, /* @__PURE__ */ new Date())
    )
  ).orderBy(asc(communications.scheduledFor));
}
async function cancelPendingCommunicationsForQuote(quoteId) {
  await db.update(communications).set({ status: "canceled" }).where(
    and(
      eq(communications.quoteId, quoteId),
      eq(communications.status, "queued")
    )
  );
}
async function getAutomationRules(businessId) {
  const [rule] = await db.select().from(automationRules).where(eq(automationRules.businessId, businessId));
  return rule;
}
async function upsertAutomationRules(businessId, data) {
  const existing = await getAutomationRules(businessId);
  if (existing) {
    const [rule2] = await db.update(automationRules).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(automationRules.id, existing.id)).returning();
    return rule2;
  }
  const [rule] = await db.insert(automationRules).values({ businessId, ...data }).returning();
  return rule;
}
async function getTasksByBusiness(businessId, opts) {
  const conditions = [eq(tasks.businessId, businessId)];
  if (opts?.completed !== void 0) conditions.push(eq(tasks.completed, opts.completed));
  if (opts?.customerId) conditions.push(eq(tasks.customerId, opts.customerId));
  if (opts?.dueToday) {
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    conditions.push(gte(tasks.dueDate, today));
    conditions.push(lte(tasks.dueDate, tomorrow));
  }
  return db.select().from(tasks).where(and(...conditions)).orderBy(asc(tasks.dueDate));
}
async function getTaskById(id) {
  const [t] = await db.select().from(tasks).where(eq(tasks.id, id));
  return t;
}
async function createTask(data) {
  const [t] = await db.insert(tasks).values({
    businessId: data.businessId,
    customerId: data.customerId || null,
    title: data.title,
    description: data.description || "",
    type: data.type || "follow_up",
    dueDate: data.dueDate || null
  }).returning();
  return t;
}
async function updateTask(id, data) {
  const [t] = await db.update(tasks).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(tasks.id, id)).returning();
  return t;
}
async function deleteTask(id) {
  await db.delete(tasks).where(eq(tasks.id, id));
}
async function getQuoteStats(businessId) {
  const allQuotes = await db.select().from(quotes).where(eq(quotes.businessId, businessId));
  const sent = allQuotes.filter((q) => q.status === "sent").length;
  const accepted = allQuotes.filter((q) => q.status === "accepted").length;
  const declined = allQuotes.filter((q) => q.status === "declined").length;
  const expired = allQuotes.filter((q) => q.status === "expired").length;
  const totalRevenue = allQuotes.filter((q) => q.status === "accepted").reduce((sum, q) => sum + q.total, 0);
  const avgQuoteValue = allQuotes.length > 0 ? allQuotes.reduce((sum, q) => sum + q.total, 0) / allQuotes.length : 0;
  const closeRate = allQuotes.length > 0 ? accepted / allQuotes.length * 100 : 0;
  return {
    totalQuotes: allQuotes.length,
    sentQuotes: sent,
    acceptedQuotes: accepted,
    declinedQuotes: declined,
    expiredQuotes: expired,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    avgQuoteValue: Math.round(avgQuoteValue * 100) / 100,
    closeRate: Math.round(closeRate * 10) / 10
  };
}
async function getRevenueByPeriod(businessId, days = 30) {
  const since = /* @__PURE__ */ new Date();
  since.setDate(since.getDate() - days);
  const acceptedQuotes = await db.select().from(quotes).where(
    and(
      eq(quotes.businessId, businessId),
      eq(quotes.status, "accepted"),
      gte(quotes.acceptedAt, since)
    )
  );
  const byDate = {};
  for (const q of acceptedQuotes) {
    const d = q.acceptedAt?.toISOString().split("T")[0] || "";
    byDate[d] = (byDate[d] || 0) + q.total;
  }
  return Object.entries(byDate).map(([date, revenue]) => ({ date, revenue })).sort((a, b) => a.date.localeCompare(b.date));
}
async function getFollowUpsByQuote(quoteId) {
  return db.select().from(quoteFollowUps).where(eq(quoteFollowUps.quoteId, quoteId)).orderBy(asc(quoteFollowUps.scheduledFor));
}
async function getFollowUpsByBusiness(businessId, opts) {
  const conditions = [eq(quoteFollowUps.businessId, businessId)];
  if (opts?.status) conditions.push(eq(quoteFollowUps.status, opts.status));
  return db.select().from(quoteFollowUps).where(and(...conditions)).orderBy(asc(quoteFollowUps.scheduledFor));
}
async function createFollowUp(data) {
  const [fu] = await db.insert(quoteFollowUps).values({
    quoteId: data.quoteId,
    businessId: data.businessId,
    scheduledFor: data.scheduledFor,
    channel: data.channel || "sms",
    message: data.message || ""
  }).returning();
  return fu;
}
async function updateFollowUp(id, data) {
  const [fu] = await db.update(quoteFollowUps).set(data).where(eq(quoteFollowUps.id, id)).returning();
  return fu;
}
async function deleteFollowUp(id) {
  await db.delete(quoteFollowUps).where(eq(quoteFollowUps.id, id));
}
async function getUnfollowedQuotes(businessId) {
  const allSent = await db.select().from(quotes).where(
    and(
      eq(quotes.businessId, businessId),
      eq(quotes.status, "sent")
    )
  ).orderBy(asc(quotes.sentAt));
  const results = [];
  for (const q of allSent) {
    const comms = await db.select().from(communications).where(
      and(
        eq(communications.quoteId, q.id),
        eq(communications.direction, "outbound")
      )
    );
    if (comms.length <= 1) {
      results.push(q);
    }
  }
  return results;
}
async function getGoogleCalendarToken(userId) {
  const [token] = await db.select().from(googleCalendarTokens).where(eq(googleCalendarTokens.userId, userId));
  return token;
}
async function upsertGoogleCalendarToken(userId, data) {
  const existing = await getGoogleCalendarToken(userId);
  if (existing) {
    const [token2] = await db.update(googleCalendarTokens).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(googleCalendarTokens.userId, userId)).returning();
    return token2;
  }
  const [token] = await db.insert(googleCalendarTokens).values({ userId, ...data }).returning();
  return token;
}
async function deleteGoogleCalendarToken(userId) {
  await db.delete(googleCalendarTokens).where(eq(googleCalendarTokens.userId, userId));
}
async function expireOldQuotes() {
  const now = /* @__PURE__ */ new Date();
  const result = await db.update(quotes).set({ status: "expired", updatedAt: now }).where(
    and(
      eq(quotes.status, "sent"),
      lte(quotes.expiresAt, now)
    )
  ).returning();
  return result.length;
}
async function getFollowUpTouchesByQuote(quoteId) {
  return db.select().from(followUpTouches).where(eq(followUpTouches.quoteId, quoteId)).orderBy(desc(followUpTouches.createdAt));
}
async function getFollowUpTouchesByBusiness(businessId) {
  return db.select().from(followUpTouches).where(eq(followUpTouches.businessId, businessId)).orderBy(desc(followUpTouches.createdAt));
}
async function createFollowUpTouch(data) {
  const [touch] = await db.insert(followUpTouches).values({
    businessId: data.businessId,
    quoteId: data.quoteId,
    customerId: data.customerId || null,
    channel: data.channel,
    snoozedUntil: data.snoozedUntil || null
  }).returning();
  return touch;
}
async function getLastTouchForQuote(quoteId) {
  const [touch] = await db.select().from(followUpTouches).where(eq(followUpTouches.quoteId, quoteId)).orderBy(desc(followUpTouches.createdAt)).limit(1);
  return touch;
}
async function getStreakByBusiness(businessId) {
  const [streak] = await db.select().from(streaks).where(eq(streaks.businessId, businessId));
  return streak;
}
async function upsertStreak(businessId, data) {
  const existing = await getStreakByBusiness(businessId);
  if (existing) {
    const [streak2] = await db.update(streaks).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(streaks.businessId, businessId)).returning();
    return streak2;
  }
  const [streak] = await db.insert(streaks).values({ businessId, ...data }).returning();
  return streak;
}
async function getPreferencesByBusiness(businessId) {
  const [pref] = await db.select().from(userPreferences).where(eq(userPreferences.businessId, businessId));
  return pref;
}
async function upsertPreferences(businessId, data) {
  const existing = await getPreferencesByBusiness(businessId);
  if (existing) {
    const [pref2] = await db.update(userPreferences).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(userPreferences.businessId, businessId)).returning();
    return pref2;
  }
  const [pref] = await db.insert(userPreferences).values({ businessId, ...data }).returning();
  return pref;
}
async function createAnalyticsEvent(data) {
  const [event] = await db.insert(analyticsEvents).values({
    businessId: data.businessId,
    eventName: data.eventName,
    properties: data.properties || {}
  }).returning();
  return event;
}
async function getAnalyticsEvents(businessId, limit = 100) {
  return db.select().from(analyticsEvents).where(eq(analyticsEvents.businessId, businessId)).orderBy(desc(analyticsEvents.createdAt)).limit(limit);
}
async function getBadgesByBusiness(businessId) {
  return db.select().from(badges).where(eq(badges.businessId, businessId)).orderBy(desc(badges.earnedAt));
}
async function createBadge(data) {
  const [badge] = await db.insert(badges).values({ businessId: data.businessId, badgeKey: data.badgeKey }).returning();
  return badge;
}
async function hasBadge(businessId, badgeKey) {
  const results = await db.select().from(badges).where(
    and(
      eq(badges.businessId, businessId),
      eq(badges.badgeKey, badgeKey)
    )
  ).limit(1);
  return results.length > 0;
}
async function getFollowUpQueueQuotes(businessId) {
  const twentyFourHoursAgo = /* @__PURE__ */ new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
  const sentQuotes = await db.select({
    id: quotes.id,
    businessId: quotes.businessId,
    customerId: quotes.customerId,
    total: quotes.total,
    status: quotes.status,
    sentAt: quotes.sentAt,
    createdAt: quotes.createdAt,
    lastContactAt: quotes.lastContactAt,
    propertyDetails: quotes.propertyDetails,
    customerFirstName: customers.firstName,
    customerLastName: customers.lastName,
    customerPhone: customers.phone,
    customerEmail: customers.email
  }).from(quotes).leftJoin(customers, eq(quotes.customerId, customers.id)).where(
    and(
      eq(quotes.businessId, businessId),
      eq(quotes.status, "sent"),
      lte(quotes.sentAt, twentyFourHoursAgo)
    )
  ).orderBy(asc(quotes.sentAt));
  const now = /* @__PURE__ */ new Date();
  const results = [];
  for (const q of sentQuotes) {
    const snoozedTouches = await db.select().from(followUpTouches).where(
      and(
        eq(followUpTouches.quoteId, q.id),
        gte(followUpTouches.snoozedUntil, now)
      )
    ).limit(1);
    if (snoozedTouches.length > 0) continue;
    const lastTouch = await getLastTouchForQuote(q.id);
    const details = q.propertyDetails;
    const customerFirstName = q.customerFirstName || details?.customerName?.split(" ")[0] || null;
    const customerLastName = q.customerLastName || details?.customerName?.split(" ").slice(1).join(" ") || null;
    const customerPhone = q.customerPhone || details?.customerPhone || null;
    const customerEmail = q.customerEmail || details?.customerEmail || null;
    results.push({
      id: q.id,
      businessId: q.businessId,
      customerId: q.customerId,
      total: q.total,
      status: q.status,
      sentAt: q.sentAt,
      createdAt: q.createdAt,
      lastContactAt: q.lastContactAt,
      customerFirstName,
      customerLastName,
      customerPhone,
      customerEmail,
      lastTouchedAt: lastTouch?.createdAt || null
    });
  }
  return results;
}
async function getWeeklyRecapStats(businessId, weekStart, weekEnd) {
  const allQuotesInRange = await db.select().from(quotes).where(
    and(
      eq(quotes.businessId, businessId),
      gte(quotes.createdAt, weekStart),
      lte(quotes.createdAt, weekEnd)
    )
  );
  const quotesSent = allQuotesInRange.length;
  const acceptedInRange = await db.select().from(quotes).where(
    and(
      eq(quotes.businessId, businessId),
      eq(quotes.status, "accepted"),
      gte(quotes.acceptedAt, weekStart),
      lte(quotes.acceptedAt, weekEnd)
    )
  );
  const declinedInRange = await db.select().from(quotes).where(
    and(
      eq(quotes.businessId, businessId),
      eq(quotes.status, "declined"),
      gte(quotes.declinedAt, weekStart),
      lte(quotes.declinedAt, weekEnd)
    )
  );
  const expiredInRange = await db.select().from(quotes).where(
    and(
      eq(quotes.businessId, businessId),
      eq(quotes.status, "expired"),
      gte(quotes.updatedAt, weekStart),
      lte(quotes.updatedAt, weekEnd)
    )
  );
  const quotesAccepted = acceptedInRange.length;
  const quotesDeclined = declinedInRange.length;
  const quotesExpired = expiredInRange.length;
  const closeRate = quotesSent > 0 ? Math.round(quotesAccepted / quotesSent * 1e3) / 10 : 0;
  const revenueWon = acceptedInRange.reduce((sum, q) => sum + q.total, 0);
  const biggestWin = acceptedInRange.length > 0 ? Math.max(...acceptedInRange.map((q) => q.total)) : 0;
  const openQuotes = await db.select().from(quotes).where(
    and(
      eq(quotes.businessId, businessId),
      eq(quotes.status, "sent")
    )
  ).orderBy(asc(quotes.sentAt)).limit(1);
  const mostAtRiskOpen = openQuotes.length > 0 ? openQuotes[0] : null;
  return {
    quotesSent,
    quotesAccepted,
    quotesDeclined,
    quotesExpired,
    closeRate,
    revenueWon: Math.round(revenueWon * 100) / 100,
    biggestWin: Math.round(biggestWin * 100) / 100,
    mostAtRiskOpen
  };
}
async function getDormantCustomers(businessId, thresholdDays) {
  const threshold = /* @__PURE__ */ new Date();
  threshold.setDate(threshold.getDate() - thresholdDays);
  const allCustomers = await db.select().from(customers).where(eq(customers.businessId, businessId));
  const results = [];
  for (const c of allCustomers) {
    const customerJobs = await db.select().from(jobs).where(
      and(
        eq(jobs.customerId, c.id),
        eq(jobs.businessId, businessId)
      )
    ).orderBy(desc(jobs.startDatetime));
    if (customerJobs.length === 0) continue;
    const lastJob = customerJobs[0];
    const lastJobDate = lastJob.endDatetime || lastJob.startDatetime;
    if (lastJobDate && lastJobDate < threshold) {
      const avgTicket = customerJobs.reduce((sum, j) => sum + (j.total || 0), 0) / customerJobs.length;
      results.push({
        ...c,
        lastJobDate,
        avgTicket: Math.round(avgTicket * 100) / 100
      });
    }
  }
  return results;
}
async function getLostQuotes(businessId, daysSince) {
  const since = /* @__PURE__ */ new Date();
  since.setDate(since.getDate() - daysSince);
  const lostQuotes = await db.select({
    id: quotes.id,
    businessId: quotes.businessId,
    customerId: quotes.customerId,
    total: quotes.total,
    status: quotes.status,
    sentAt: quotes.sentAt,
    declinedAt: quotes.declinedAt,
    expiresAt: quotes.expiresAt,
    createdAt: quotes.createdAt,
    propertyDetails: quotes.propertyDetails,
    customerFirstName: customers.firstName,
    customerLastName: customers.lastName,
    customerPhone: customers.phone,
    customerEmail: customers.email
  }).from(quotes).leftJoin(customers, eq(quotes.customerId, customers.id)).where(
    and(
      eq(quotes.businessId, businessId),
      or(
        eq(quotes.status, "expired"),
        eq(quotes.status, "declined")
      ),
      gte(quotes.updatedAt, since)
    )
  ).orderBy(desc(quotes.updatedAt));
  return lostQuotes;
}
async function getGrowthTasksByBusiness(businessId, opts) {
  const conditions = [eq(growthTasks.businessId, businessId)];
  if (opts?.type) conditions.push(eq(growthTasks.type, opts.type));
  if (opts?.status) conditions.push(eq(growthTasks.status, opts.status));
  if (opts?.customerId) conditions.push(eq(growthTasks.customerId, opts.customerId));
  return db.select().from(growthTasks).where(and(...conditions)).orderBy(desc(growthTasks.priority), asc(growthTasks.dueAt));
}
async function getGrowthTaskById(id) {
  const [t] = await db.select().from(growthTasks).where(eq(growthTasks.id, id));
  return t;
}
async function createGrowthTask(data) {
  const [t] = await db.insert(growthTasks).values({
    businessId: data.businessId,
    customerId: data.customerId || null,
    quoteId: data.quoteId || null,
    jobId: data.jobId || null,
    type: data.type,
    channel: data.channel || "sms",
    dueAt: data.dueAt || null,
    priority: data.priority || 50,
    escalationStage: data.escalationStage || 1,
    maxEscalation: data.maxEscalation || 4,
    templateKey: data.templateKey || null,
    message: data.message || "",
    estimatedValue: data.estimatedValue || 0,
    metadata: data.metadata || {}
  }).returning();
  return t;
}
async function updateGrowthTask(id, data) {
  const [t] = await db.update(growthTasks).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(growthTasks.id, id)).returning();
  return t;
}
async function deleteGrowthTask(id) {
  await db.delete(growthTasks).where(eq(growthTasks.id, id));
}
async function getActiveGrowthTasksForQuote(quoteId) {
  return db.select().from(growthTasks).where(
    and(
      eq(growthTasks.quoteId, quoteId),
      eq(growthTasks.status, "pending")
    )
  );
}
async function getActiveGrowthTasksForCustomer(customerId) {
  return db.select().from(growthTasks).where(
    and(
      eq(growthTasks.customerId, customerId),
      or(
        eq(growthTasks.status, "pending"),
        eq(growthTasks.status, "snoozed")
      )
    )
  );
}
async function countTodayTasksForCustomer(businessId, customerId) {
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const results = await db.select().from(growthTasks).where(
    and(
      eq(growthTasks.businessId, businessId),
      eq(growthTasks.customerId, customerId),
      gte(growthTasks.lastActionAt, today),
      lte(growthTasks.lastActionAt, tomorrow)
    )
  );
  return results.length;
}
async function createGrowthTaskEvent(data) {
  const [e] = await db.insert(growthTaskEvents).values({
    taskId: data.taskId,
    action: data.action,
    channel: data.channel || null,
    metadata: data.metadata || {}
  }).returning();
  return e;
}
async function getEventsByTask(taskId) {
  return db.select().from(growthTaskEvents).where(eq(growthTaskEvents.taskId, taskId)).orderBy(desc(growthTaskEvents.createdAt));
}
async function getReviewRequestsByBusiness(businessId) {
  return db.select().from(reviewRequests).where(eq(reviewRequests.businessId, businessId)).orderBy(desc(reviewRequests.createdAt));
}
async function getReviewRequestByJob(jobId) {
  const [r] = await db.select().from(reviewRequests).where(eq(reviewRequests.jobId, jobId));
  return r;
}
async function createReviewRequest(data) {
  const [r] = await db.insert(reviewRequests).values({
    businessId: data.businessId,
    customerId: data.customerId || null,
    jobId: data.jobId || null,
    status: data.status || "pending"
  }).returning();
  return r;
}
async function updateReviewRequest(id, data) {
  const [r] = await db.update(reviewRequests).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(reviewRequests.id, id)).returning();
  return r;
}
async function getMarketingPrefsByCustomer(customerId) {
  const [p] = await db.select().from(customerMarketingPrefs).where(eq(customerMarketingPrefs.customerId, customerId));
  return p;
}
async function upsertMarketingPrefs(businessId, customerId, data) {
  const existing = await getMarketingPrefsByCustomer(customerId);
  if (existing) {
    const [p2] = await db.update(customerMarketingPrefs).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(customerMarketingPrefs.id, existing.id)).returning();
    return p2;
  }
  const [p] = await db.insert(customerMarketingPrefs).values({ businessId, customerId, ...data }).returning();
  return p;
}
async function getGrowthAutomationSettings(businessId) {
  const [s] = await db.select().from(growthAutomationSettings).where(eq(growthAutomationSettings.businessId, businessId));
  return s;
}
async function upsertGrowthAutomationSettings(businessId, data) {
  const existing = await getGrowthAutomationSettings(businessId);
  if (existing) {
    const [s2] = await db.update(growthAutomationSettings).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(growthAutomationSettings.businessId, businessId)).returning();
    return s2;
  }
  const [s] = await db.insert(growthAutomationSettings).values({ businessId, ...data }).returning();
  return s;
}
async function getSalesStrategy(businessId) {
  const [s] = await db.select().from(salesStrategySettings).where(eq(salesStrategySettings.businessId, businessId));
  return s;
}
async function upsertSalesStrategy(businessId, data) {
  const existing = await getSalesStrategy(businessId);
  if (existing) {
    const [s2] = await db.update(salesStrategySettings).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(salesStrategySettings.businessId, businessId)).returning();
    return s2;
  }
  const [s] = await db.insert(salesStrategySettings).values({ businessId, ...data }).returning();
  return s;
}
async function getCampaignsByBusiness(businessId) {
  return db.select().from(campaigns).where(eq(campaigns.businessId, businessId)).orderBy(desc(campaigns.createdAt));
}
async function getCampaignById(id) {
  const [c] = await db.select().from(campaigns).where(eq(campaigns.id, id));
  return c;
}
async function createCampaign(data) {
  const [c] = await db.insert(campaigns).values({
    businessId: data.businessId,
    name: data.name,
    segment: data.segment,
    channel: data.channel || "sms",
    templateKey: data.templateKey || null,
    customerIds: data.customerIds || null,
    taskCount: data.taskCount || 0
  }).returning();
  return c;
}
async function updateCampaign(id, data) {
  const [c] = await db.update(campaigns).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(campaigns.id, id)).returning();
  return c;
}
async function getUpsellOpportunities(businessId) {
  const sixMonthsAgo = /* @__PURE__ */ new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const allCustomers = await db.select().from(customers).where(eq(customers.businessId, businessId));
  const results = [];
  for (const c of allCustomers) {
    const customerJobs = await db.select().from(jobs).where(
      and(
        eq(jobs.customerId, c.id),
        eq(jobs.businessId, businessId)
      )
    ).orderBy(desc(jobs.startDatetime));
    if (customerJobs.length === 0) continue;
    const deepCleanJobs = customerJobs.filter((j) => j.jobType === "deep_clean");
    const lastDeepClean = deepCleanJobs.length > 0 ? deepCleanJobs[0] : null;
    if (!lastDeepClean || lastDeepClean.startDatetime < sixMonthsAgo) {
      const avgTicket = customerJobs.reduce((sum, j) => sum + (j.total || 0), 0) / customerJobs.length;
      const lastDeepCleanDate = lastDeepClean?.startDatetime || null;
      const daysSince = lastDeepCleanDate ? Math.floor((Date.now() - lastDeepCleanDate.getTime()) / (1e3 * 60 * 60 * 24)) : null;
      results.push({
        customer: c,
        lastDeepClean: lastDeepCleanDate,
        daysSince,
        avgTicket: Math.round(avgTicket * 100) / 100
      });
    }
  }
  return results;
}
async function getAutoRebookCandidates(businessId, minDays, maxDays) {
  const minDate = /* @__PURE__ */ new Date();
  minDate.setDate(minDate.getDate() - maxDays);
  const maxDate = /* @__PURE__ */ new Date();
  maxDate.setDate(maxDate.getDate() - minDays);
  const allCustomers = await db.select().from(customers).where(eq(customers.businessId, businessId));
  const results = [];
  for (const c of allCustomers) {
    const customerJobs = await db.select().from(jobs).where(
      and(
        eq(jobs.customerId, c.id),
        eq(jobs.businessId, businessId)
      )
    ).orderBy(desc(jobs.startDatetime));
    if (customerJobs.length === 0) continue;
    const lastJob = customerJobs[0];
    const lastJobDate = lastJob.endDatetime || lastJob.startDatetime;
    if (lastJobDate && lastJobDate >= minDate && lastJobDate <= maxDate) {
      const hasRecurrence = customerJobs.some((j) => j.recurrence && j.recurrence !== "none");
      if (hasRecurrence) continue;
      const pendingRebookTasks = await db.select().from(growthTasks).where(
        and(
          eq(growthTasks.customerId, c.id),
          eq(growthTasks.type, "REBOOK_NUDGE"),
          eq(growthTasks.status, "pending")
        )
      );
      if (pendingRebookTasks.length > 0) continue;
      results.push({
        customer: c,
        lastJobDate,
        lastJobTotal: lastJob.total || 0
      });
    }
  }
  return results;
}
async function getForecastData(businessId) {
  const openQuotes = await db.select().from(quotes).where(
    and(
      eq(quotes.businessId, businessId),
      eq(quotes.status, "sent")
    )
  );
  const openQuoteValue = openQuotes.reduce((sum, q) => sum + q.total, 0);
  const allQuotes = await db.select().from(quotes).where(eq(quotes.businessId, businessId));
  const accepted = allQuotes.filter((q) => q.status === "accepted").length;
  const closeRate = allQuotes.length > 0 ? accepted / allQuotes.length * 100 : 0;
  const forecastedRevenue = openQuoteValue * (closeRate / 100);
  const confidenceLow = forecastedRevenue * 0.8;
  const confidenceHigh = forecastedRevenue * 1.2;
  const scheduledJobs = await db.select().from(jobs).where(
    and(
      eq(jobs.businessId, businessId),
      eq(jobs.status, "scheduled")
    )
  );
  const scheduledJobsValue = scheduledJobs.reduce((sum, j) => sum + (j.total || 0), 0);
  return {
    openQuoteValue: Math.round(openQuoteValue * 100) / 100,
    closeRate: Math.round(closeRate * 10) / 10,
    forecastedRevenue: Math.round(forecastedRevenue * 100) / 100,
    confidenceLow: Math.round(confidenceLow * 100) / 100,
    confidenceHigh: Math.round(confidenceHigh * 100) / 100,
    scheduledJobsValue: Math.round(scheduledJobsValue * 100) / 100
  };
}
async function getRecommendationsByQuote(quoteId) {
  return db.select().from(salesRecommendations).where(eq(salesRecommendations.quoteId, quoteId)).orderBy(asc(salesRecommendations.createdAt));
}
async function createRecommendation(data) {
  const [rec] = await db.insert(salesRecommendations).values(data).returning();
  return rec;
}
async function updateRecommendation(id, data) {
  const [rec] = await db.update(salesRecommendations).set(data).where(eq(salesRecommendations.id, id)).returning();
  return rec;
}
async function rateJob(jobId, rating, comment) {
  const [j] = await db.update(jobs).set({ satisfactionRating: rating, ratingComment: comment ?? null, updatedAt: /* @__PURE__ */ new Date() }).where(eq(jobs.id, jobId)).returning();
  return j;
}
async function getRatingsSummary(businessId) {
  const ratedJobs = await db.select({ satisfactionRating: jobs.satisfactionRating }).from(jobs).where(
    and(
      eq(jobs.businessId, businessId),
      isNotNull(jobs.satisfactionRating)
    )
  );
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const row of ratedJobs) {
    const r = row.satisfactionRating;
    distribution[r] = (distribution[r] || 0) + 1;
    sum += r;
  }
  const total = ratedJobs.length;
  const average = total > 0 ? Math.round(sum / total * 10) / 10 : 0;
  return { average, total, distribution };
}
async function createInvoicePacket(data) {
  const [r] = await db.insert(invoicePackets).values(data).returning();
  return r;
}
async function getInvoicePacketsByQuoteId(quoteId) {
  return db.select().from(invoicePackets).where(eq(invoicePackets.quoteId, quoteId)).orderBy(desc(invoicePackets.createdAt));
}
async function getInvoicePacketById(id) {
  const [r] = await db.select().from(invoicePackets).where(eq(invoicePackets.id, id));
  return r;
}
async function createCalendarEventStub(data) {
  const [r] = await db.insert(calendarEventStubs).values(data).returning();
  return r;
}
async function getCalendarEventStubsByQuoteId(quoteId) {
  return db.select().from(calendarEventStubs).where(eq(calendarEventStubs.quoteId, quoteId)).orderBy(desc(calendarEventStubs.createdAt));
}
async function createApiKey(data) {
  const [r] = await db.insert(apiKeys).values(data).returning();
  return r;
}
async function getApiKeysByUserId(userId) {
  return db.select().from(apiKeys).where(and(eq(apiKeys.userId, userId), eq(apiKeys.isActive, true))).orderBy(desc(apiKeys.createdAt));
}
async function deactivateApiKey(id, userId) {
  await db.update(apiKeys).set({ isActive: false }).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
}
async function getApiKeyByHash(keyHash) {
  const [r] = await db.select().from(apiKeys).where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)));
  return r;
}
async function createWebhookEndpoint(data) {
  const [r] = await db.insert(webhookEndpoints).values(data).returning();
  return r;
}
async function getWebhookEndpointsByUserId(userId) {
  return db.select().from(webhookEndpoints).where(eq(webhookEndpoints.userId, userId)).orderBy(desc(webhookEndpoints.createdAt));
}
async function updateWebhookEndpoint(id, userId, data) {
  const [r] = await db.update(webhookEndpoints).set(data).where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.userId, userId))).returning();
  return r;
}
async function deleteWebhookEndpoint(id, userId) {
  await db.delete(webhookEndpoints).where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.userId, userId)));
}
async function getActiveWebhookEndpointsForBusiness(businessId) {
  return db.select().from(webhookEndpoints).where(and(eq(webhookEndpoints.businessId, businessId), eq(webhookEndpoints.isActive, true)));
}
async function createWebhookEvent(data) {
  const [r] = await db.insert(webhookEvents).values(data).returning();
  return r;
}
async function getWebhookEventsByUserId(userId, limit = 50) {
  return db.select().from(webhookEvents).where(eq(webhookEvents.userId, userId)).orderBy(desc(webhookEvents.createdAt)).limit(limit);
}
async function getWebhookEventById(id) {
  const [r] = await db.select().from(webhookEvents).where(eq(webhookEvents.id, id));
  return r;
}
async function createWebhookDelivery(data) {
  const [r] = await db.insert(webhookDeliveries).values(data).returning();
  return r;
}
async function getWebhookDeliveriesByEventId(eventId) {
  return db.select().from(webhookDeliveries).where(eq(webhookDeliveries.webhookEventId, eventId)).orderBy(asc(webhookDeliveries.attemptNumber));
}
async function updateWebhookDelivery(id, data) {
  await db.update(webhookDeliveries).set(data).where(eq(webhookDeliveries.id, id));
}
async function getStaleQuotesForNudge(hoursOld = 48) {
  const cutoff = new Date(Date.now() - hoursOld * 60 * 60 * 1e3);
  return db.select({
    id: quotes.id,
    businessId: quotes.businessId,
    customerId: quotes.customerId,
    propertyDetails: quotes.propertyDetails,
    total: quotes.total,
    sentAt: quotes.sentAt
  }).from(quotes).where(
    and(
      eq(quotes.status, "sent"),
      lt(quotes.sentAt, cutoff),
      isNull(quotes.nudgeSentAt)
    )
  );
}
async function markQuoteNudgeSent(quoteId) {
  await db.update(quotes).set({ nudgeSentAt: /* @__PURE__ */ new Date() }).where(eq(quotes.id, quoteId));
}
async function markReviewRequestSent(quoteId) {
  await db.update(quotes).set({ reviewRequestSentAt: /* @__PURE__ */ new Date() }).where(eq(quotes.id, quoteId));
}
async function getAllBusinessIds() {
  const rows = await db.select({ id: businesses.id }).from(businesses);
  return rows.map((r) => r.id);
}
async function markMilestoneCelebrated(businessId, milestone) {
  const prefs = await getPreferencesByBusiness(businessId);
  const current = Array.isArray(prefs?.celebratedMilestones) ? prefs.celebratedMilestones : [];
  if (current.includes(milestone)) return;
  const updated = [...current, milestone];
  await upsertPreferences(businessId, { celebratedMilestones: updated });
}
async function markWeeklyDigestSent(businessId) {
  await db.update(userPreferences).set({ lastWeeklyDigestAt: /* @__PURE__ */ new Date() }).where(eq(userPreferences.businessId, businessId));
}
async function getWeeklyQuoteStats(businessId) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
  const allQuotes = await db.select().from(quotes).where(and(eq(quotes.businessId, businessId), gte(quotes.createdAt, since)));
  const sentCount = allQuotes.filter((q) => ["sent", "accepted", "declined"].includes(q.status)).length;
  const acceptedCount = allQuotes.filter((q) => q.status === "accepted").length;
  const revenueWon = allQuotes.filter((q) => q.status === "accepted").reduce((s, q) => s + (Number(q.total) || 0), 0);
  const pendingAll = await db.select().from(quotes).where(and(eq(quotes.businessId, businessId), eq(quotes.status, "sent"))).orderBy(asc(quotes.sentAt)).limit(5);
  const pendingQuotes = pendingAll.map((q) => ({
    id: q.id,
    customerName: q.propertyDetails?.customerName || "Customer",
    total: Number(q.total) || 0,
    sentAt: q.sentAt
  }));
  return { sentCount, acceptedCount, revenueWon, pendingQuotes };
}
async function getLeadFinderSettings(userId, businessId) {
  const [row] = await db.select().from(leadFinderSettings).where(and(eq(leadFinderSettings.userId, userId), eq(leadFinderSettings.businessId, businessId)));
  return row;
}
async function upsertLeadFinderSettings(userId, businessId, payload) {
  const existing = await getLeadFinderSettings(userId, businessId);
  if (existing) {
    const [updated] = await db.update(leadFinderSettings).set({ ...payload, updatedAt: /* @__PURE__ */ new Date() }).where(eq(leadFinderSettings.id, existing.id)).returning();
    return updated;
  }
  const [created] = await db.insert(leadFinderSettings).values({ userId, businessId, ...payload }).returning();
  return created;
}
async function createLeadIfNotExists(data) {
  const [existing] = await db.select().from(leadFinderLeads).where(
    and(
      eq(leadFinderLeads.businessId, data.businessId),
      eq(leadFinderLeads.source, data.source),
      eq(leadFinderLeads.externalId, data.externalId)
    )
  );
  if (existing) return { lead: existing, created: false };
  const [lead] = await db.insert(leadFinderLeads).values({
    userId: data.userId,
    businessId: data.businessId,
    source: data.source,
    externalId: data.externalId,
    subreddit: data.subreddit,
    title: data.title,
    body: data.body,
    author: data.author,
    postUrl: data.postUrl,
    permalink: data.permalink,
    matchedKeyword: data.matchedKeyword,
    detectedLocation: data.detectedLocation,
    intent: data.intent,
    aiClassification: data.aiClassification,
    aiConfidence: data.aiConfidence,
    aiReason: data.aiReason,
    leadScore: data.leadScore ?? 0,
    postedAt: data.postedAt,
    metadata: data.metadata
  }).returning();
  return { lead, created: true };
}
async function getLeadFinderLeads(userId, businessId, filters = {}) {
  const limit = Math.min(filters.limit ?? 20, 50);
  const offset = ((filters.page ?? 1) - 1) * limit;
  const conditions = [
    eq(leadFinderLeads.userId, userId),
    eq(leadFinderLeads.businessId, businessId)
  ];
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(leadFinderLeads.status, filters.status));
  }
  if (filters.keyword) {
    conditions.push(eq(leadFinderLeads.matchedKeyword, filters.keyword));
  }
  const leads = await db.select().from(leadFinderLeads).where(and(...conditions)).orderBy(desc(leadFinderLeads.leadScore), desc(leadFinderLeads.postedAt)).limit(limit).offset(offset);
  const [{ count }] = await db.select({ count: sql2`count(*)` }).from(leadFinderLeads).where(and(...conditions));
  return { leads, total: Number(count) };
}
async function getLeadFinderLeadById(id, userId, businessId) {
  const [lead] = await db.select().from(leadFinderLeads).where(
    and(
      eq(leadFinderLeads.id, id),
      eq(leadFinderLeads.userId, userId),
      eq(leadFinderLeads.businessId, businessId)
    )
  );
  return lead;
}
async function updateLeadStatus(id, userId, businessId, status) {
  const [updated] = await db.update(leadFinderLeads).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(
    and(
      eq(leadFinderLeads.id, id),
      eq(leadFinderLeads.userId, userId),
      eq(leadFinderLeads.businessId, businessId)
    )
  ).returning();
  return updated;
}
async function countNewLeadFinderLeads(userId, businessId) {
  const [{ count }] = await db.select({ count: sql2`count(*)` }).from(leadFinderLeads).where(
    and(
      eq(leadFinderLeads.userId, userId),
      eq(leadFinderLeads.businessId, businessId),
      eq(leadFinderLeads.status, "new")
    )
  );
  return Number(count);
}
async function saveGeneratedReplies(leadId, replies) {
  await db.delete(leadFinderReplies).where(eq(leadFinderReplies.leadId, leadId));
  const inserted = await db.insert(leadFinderReplies).values(replies.map((r) => ({ leadId, tone: r.tone, replyText: r.replyText }))).returning();
  return inserted;
}
async function getGeneratedReplies(leadId) {
  return db.select().from(leadFinderReplies).where(eq(leadFinderReplies.leadId, leadId)).orderBy(asc(leadFinderReplies.createdAt));
}
async function findBusinessesWithLeadFinderEnabled() {
  const rows = await db.select().from(leadFinderSettings).where(eq(leadFinderSettings.enabled, true));
  return rows.map((s) => ({ userId: s.userId, businessId: s.businessId, settings: s }));
}
async function logLeadFinderEvent(leadId, userId, eventType, metadata) {
  await db.insert(leadFinderEvents).values({
    leadId: leadId ?? void 0,
    userId,
    eventType,
    metadata
  });
}
async function getBusinessById(id) {
  const [b] = await db.select().from(businesses).where(eq(businesses.id, id));
  return b;
}
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/services/lead-finder/reddit.ts
var reddit_exports = {};
__export(reddit_exports, {
  fetchRedditLeads: () => fetchRedditLeads,
  getMockLeads: () => getMockLeads
});
function buildSearchUrl(query, subreddit) {
  const encoded = encodeURIComponent(query);
  if (subreddit) {
    return `https://www.reddit.com/r/${subreddit}/search.json?q=${encoded}&restrict_sr=1&sort=new&limit=25&t=month`;
  }
  return `https://www.reddit.com/search.json?q=${encoded}&sort=new&limit=25&t=month`;
}
async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
async function fetchRedditSearch(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8e3);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; QuoteProBot/1.0; +https://getquotepro.ai)",
        "Accept": "application/json"
      }
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data?.children ?? [];
  } catch {
    return [];
  }
}
async function fetchRedditLeads(params) {
  const keywords = (params.keywords ?? []).length > 0 ? params.keywords : DEFAULT_KEYWORDS;
  const subreddits = (params.subreddits ?? []).length > 0 ? params.subreddits : DEFAULT_SUBREDDITS;
  const cities = params.targetCities ?? [];
  const seen = /* @__PURE__ */ new Set();
  const results = [];
  const searches = [];
  for (const kw of keywords.slice(0, 4)) {
    searches.push({ keyword: kw });
    for (const sub of subreddits.slice(0, 2)) {
      searches.push({ keyword: kw, subreddit: sub });
    }
  }
  for (const city of cities.slice(0, 3)) {
    searches.push({ keyword: `house cleaner ${city}` });
    searches.push({ keyword: `cleaning service ${city}` });
    searches.push({ keyword: `maid service ${city}` });
  }
  const batches = searches.slice(0, 8);
  for (let i = 0; i < batches.length; i++) {
    if (i > 0) await sleep(300);
    const { keyword, subreddit } = batches[i];
    const url = buildSearchUrl(keyword, subreddit);
    const posts = await fetchRedditSearch(url);
    for (const child of posts) {
      const post = child?.data;
      if (!post?.id || !post?.title) continue;
      if (seen.has(post.id)) continue;
      seen.add(post.id);
      const postedAt = post.created_utc ? new Date(post.created_utc * 1e3) : /* @__PURE__ */ new Date();
      results.push({
        externalId: post.id,
        subreddit: post.subreddit ?? "",
        title: post.title ?? "",
        body: post.selftext ?? "",
        author: post.author ?? "[deleted]",
        postUrl: `https://reddit.com${post.permalink}`,
        permalink: post.permalink ?? "",
        matchedKeyword: keyword,
        postedAt,
        metadata: {
          score: post.score,
          numComments: post.num_comments,
          upvoteRatio: post.upvote_ratio,
          flair: post.link_flair_text
        }
      });
    }
  }
  return results;
}
function getMockLeads(targetCities = []) {
  const now = Date.now();
  const h = (n) => new Date(now - n * 60 * 60 * 1e3);
  const base = [
    {
      externalId: "mock_001",
      subreddit: "moving",
      title: "Need move-out cleaning service for end of month \u2014 recommendations?",
      body: "Moving out of my apartment on the 30th and my lease requires professional cleaning. 3 bed 2 bath, about 1,400 sq ft. Looking for something reasonably priced that will pass the landlord inspection.",
      author: "movingmonth_throwaway",
      postUrl: "https://reddit.com/r/moving/comments/mock002",
      permalink: "/r/moving/comments/mock002",
      matchedKeyword: "move out cleaning",
      postedAt: h(2),
      metadata: { score: 5, numComments: 3 }
    },
    {
      externalId: "mock_002",
      subreddit: "homeowners",
      title: "Deep cleaning before listing house for sale \u2014 worth it?",
      body: "Getting ready to sell our home. Agent recommended a professional deep clean before photos. Is it worth hiring a cleaning service? What should I expect to pay for a 4BR/3BA? Anyone have good experiences?",
      author: "firsttimeseller_help",
      postUrl: "https://reddit.com/r/homeowners/comments/mock003",
      permalink: "/r/homeowners/comments/mock003",
      matchedKeyword: "deep cleaning",
      postedAt: h(8),
      metadata: { score: 18, numComments: 14 }
    },
    {
      externalId: "mock_003",
      subreddit: "airbnb",
      title: "Looking for reliable cleaning crew for Airbnb turnover \u2014 how do you find them?",
      body: "I have a 2BR Airbnb and need reliable same-day turnover cleaning. My current cleaner is inconsistent. How do you find trustworthy cleaners for short-term rentals?",
      author: "airbnb_host_99",
      postUrl: "https://reddit.com/r/airbnb/comments/mock004",
      permalink: "/r/airbnb/comments/mock004",
      matchedKeyword: "cleaning service",
      postedAt: h(5),
      metadata: { score: 22, numComments: 19 }
    },
    {
      externalId: "mock_004",
      subreddit: "firsttimehomebuyer",
      title: "Do I need a professional cleaner before moving in? Previous owners left it messy",
      body: "Closing on my first home next week. The previous owners left it pretty dirty \u2014 greasy kitchen, filthy bathrooms. Is it worth hiring a professional cleaning service or just DIY? How much do move-in cleans typically cost for a 3/2 house?",
      author: "newhomeowner2024",
      postUrl: "https://reddit.com/r/firsttimehomebuyer/comments/mock005",
      permalink: "/r/firsttimehomebuyer/comments/mock005",
      matchedKeyword: "cleaning service",
      postedAt: h(14),
      metadata: { score: 31, numComments: 27 }
    },
    {
      externalId: "mock_005",
      subreddit: "landlord",
      title: "How do you handle tenant move-out cleaning? Use a pro service or charge tenant?",
      body: "My tenant just moved out and the place needs serious cleaning. Is it worth hiring a professional cleaning company and billing the tenant, or just doing it yourself? Looking for a cost-effective approach for future properties too.",
      author: "landlord_ohio",
      postUrl: "https://reddit.com/r/landlord/comments/mock006",
      permalink: "/r/landlord/comments/mock006",
      matchedKeyword: "cleaning service",
      postedAt: h(20),
      metadata: { score: 9, numComments: 11 }
    },
    {
      externalId: "mock_006",
      subreddit: "personalfinance",
      title: "Is hiring a biweekly house cleaner worth it? How much do you pay?",
      body: "Considering hiring a cleaning service for biweekly visits. We're a family of 4 with 2 dogs in a 2,200 sq ft house. Currently spending most of Sunday cleaning. Is it worth the cost? What's a fair price to expect?",
      author: "busyparent_finances",
      postUrl: "https://reddit.com/r/personalfinance/comments/mock007",
      permalink: "/r/personalfinance/comments/mock007",
      matchedKeyword: "biweekly cleaning",
      postedAt: h(3),
      metadata: { score: 87, numComments: 62 }
    },
    {
      externalId: "mock_007",
      subreddit: "PropertyManagement",
      title: "Best cleaning company for multi-unit turnover? Need reliable recurring service",
      body: "Managing 12 units and our current cleaning company keeps dropping the ball on move-out turnovers. Looking for a reliable service that can handle multiple units per month with consistent quality.",
      author: "propertymanager_pro",
      postUrl: "https://reddit.com/r/PropertyManagement/comments/mock008",
      permalink: "/r/PropertyManagement/comments/mock008",
      matchedKeyword: "recurring cleaning",
      postedAt: h(11),
      metadata: { score: 14, numComments: 9 }
    },
    {
      externalId: "mock_008",
      subreddit: "Tenant",
      title: "My landlord wants professional cleaning receipt at move-out \u2014 what service do you recommend?",
      body: "Lease says I need to provide proof of professional cleaning at move-out. 1BR apartment in good shape. Just need it documented. Does any cleaning service provide receipts that satisfy landlords?",
      author: "tenant_nyc_throwaway",
      postUrl: "https://reddit.com/r/Tenant/comments/mock009",
      permalink: "/r/Tenant/comments/mock009",
      matchedKeyword: "cleaning service",
      postedAt: h(6),
      metadata: { score: 7, numComments: 5 }
    },
    {
      externalId: "mock_009",
      subreddit: "malelivingspace",
      title: "Finally admitted I need to hire a house cleaner \u2014 what should I look for?",
      body: "Work 60+ hours a week, 3BR house is a disaster. Ready to hire a cleaning service for the first time. How do I find a good one? What's the difference between deep clean and regular service? Any red flags to avoid?",
      author: "overworked_engineer_23",
      postUrl: "https://reddit.com/r/malelivingspace/comments/mock010",
      permalink: "/r/malelivingspace/comments/mock010",
      matchedKeyword: "house cleaner",
      postedAt: h(1),
      metadata: { score: 43, numComments: 38 }
    },
    {
      externalId: "mock_010",
      subreddit: "cleaningtips",
      title: "Inherited a house that hasn't been cleaned in years \u2014 hire a pro or DIY deep clean?",
      body: "Just inherited a house from a relative. The place has not been properly cleaned in probably 3-4 years. Heavy grease in kitchen, mold in bathrooms, heavy dust everywhere. Should I hire a professional deep cleaning service first or is DIY feasible?",
      author: "estate_cleanup_help",
      postUrl: "https://reddit.com/r/cleaningtips/comments/mock011",
      permalink: "/r/cleaningtips/comments/mock011",
      matchedKeyword: "deep cleaning",
      postedAt: h(18),
      metadata: { score: 56, numComments: 47 }
    },
    {
      externalId: "mock_011",
      subreddit: "homeowners",
      title: "Recurring cleaning service recommendations \u2014 how do you manage vetting?",
      body: "We've had bad experiences with independent cleaners no-showing or doing poor work. Thinking about using a cleaning company for recurring monthly service on our 4/3 house. How do you vet them? What companies are worth it?",
      author: "suburban_homeowner_44",
      postUrl: "https://reddit.com/r/homeowners/comments/mock012",
      permalink: "/r/homeowners/comments/mock012",
      matchedKeyword: "recurring cleaning",
      postedAt: h(32),
      metadata: { score: 28, numComments: 24 }
    },
    {
      externalId: "mock_012",
      subreddit: "moving",
      title: "Moving cross-country \u2014 need move-in clean at destination before truck arrives",
      body: "Closing on our new house in 3 weeks and flying out 2 days before the moving truck arrives. Want to have the house professionally cleaned before our stuff arrives. Previous owners left carpets dirty. How do I find a reliable cleaning service remotely?",
      author: "crosscountry_move2024",
      postUrl: "https://reddit.com/r/moving/comments/mock013",
      permalink: "/r/moving/comments/mock013",
      matchedKeyword: "move-in cleaning",
      postedAt: h(9),
      metadata: { score: 19, numComments: 15 }
    },
    {
      externalId: "mock_013",
      subreddit: "femalelivingspace",
      title: "Worth splitting a cleaning service with my roommate? How do you handle the cost?",
      body: "My roommate and I have a 2BR/2BA apartment. We're both really busy and the place gets gross. Is it worth hiring a maid service together? How do you coordinate with a roommate for this? What's a reasonable monthly cost to budget?",
      author: "apartment_roommates_help",
      postUrl: "https://reddit.com/r/femalelivingspace/comments/mock014",
      permalink: "/r/femalelivingspace/comments/mock014",
      matchedKeyword: "maid service",
      postedAt: h(4),
      metadata: { score: 34, numComments: 29 }
    },
    {
      externalId: "mock_014",
      subreddit: "airbnb",
      title: "How to automate Airbnb cleaning turnover scheduling? Need reliable system",
      body: "Running 3 Airbnb units and turnover cleaning is my biggest headache. Have to manually coordinate cleaners every checkout. Is there a service that handles scheduling automatically? How do other hosts manage this?",
      author: "airbnb_multi_host",
      postUrl: "https://reddit.com/r/airbnb/comments/mock015",
      permalink: "/r/airbnb/comments/mock015",
      matchedKeyword: "cleaning service",
      postedAt: h(7),
      metadata: { score: 47, numComments: 41 }
    },
    {
      externalId: "mock_015",
      subreddit: "landlord",
      title: "Post-renovation cleaning before new tenant \u2014 worth hiring professionals?",
      body: "Just finished a kitchen and bathroom renovation. There's drywall dust, paint splatters, and construction debris throughout the 3BR house. New tenant moves in next week. Do I hire a professional post-construction cleaning crew or can I manage this myself?",
      author: "landlord_renovator",
      postUrl: "https://reddit.com/r/landlord/comments/mock016",
      permalink: "/r/landlord/comments/mock016",
      matchedKeyword: "cleaning service",
      postedAt: h(26),
      metadata: { score: 13, numComments: 10 }
    }
  ];
  if (targetCities.length > 0) {
    const cityLeads = targetCities.slice(0, 3).flatMap((city, idx) => [
      {
        externalId: `mock_city_${idx}_a`,
        subreddit: city.toLowerCase().replace(/\s+/g, ""),
        title: `Recommendations for a reliable house cleaner in ${city}?`,
        body: `Looking for a trustworthy cleaning service in ${city} for biweekly service on our 3BR/2BA home. We have 1 dog and need someone reliable. Budget around $150-200 per visit. Any local recommendations from people who have used someone they love?`,
        author: `${city.toLowerCase().replace(/\s+/g, "_")}_local`,
        postUrl: `https://reddit.com/r/${city.toLowerCase().replace(/\s+/g, "")}/comments/mock_city_${idx}_a`,
        permalink: `/r/${city.toLowerCase().replace(/\s+/g, "")}/comments/mock_city_${idx}_a`,
        matchedKeyword: `house cleaner ${city}`,
        postedAt: new Date(now - (idx * 3 + 1) * 60 * 60 * 1e3),
        metadata: { score: 8 + idx * 3, numComments: 6 + idx * 2 }
      },
      {
        externalId: `mock_city_${idx}_b`,
        subreddit: city.toLowerCase().replace(/\s+/g, ""),
        title: `Move-out cleaning in ${city} \u2014 anyone have a good service to recommend?`,
        body: `Moving out of my apartment in ${city} at end of the month. Need professional cleaning that will satisfy my landlord. 2BR/1BA, about 950 sq ft. Looking for quality service that provides a receipt for my landlord.`,
        author: `renting_in_${city.toLowerCase().replace(/\s+/g, "")}_3`,
        postUrl: `https://reddit.com/r/${city.toLowerCase().replace(/\s+/g, "")}/comments/mock_city_${idx}_b`,
        permalink: `/r/${city.toLowerCase().replace(/\s+/g, "")}/comments/mock_city_${idx}_b`,
        matchedKeyword: `cleaning service ${city}`,
        postedAt: new Date(now - (idx * 4 + 2) * 60 * 60 * 1e3),
        metadata: { score: 5 + idx * 2, numComments: 4 + idx }
      }
    ]);
    return [...cityLeads, ...base];
  }
  return base;
}
var DEFAULT_KEYWORDS, DEFAULT_SUBREDDITS;
var init_reddit = __esm({
  "server/services/lead-finder/reddit.ts"() {
    "use strict";
    DEFAULT_KEYWORDS = [
      "house cleaner",
      "cleaning service",
      "maid service",
      "deep cleaning",
      "move out cleaning",
      "move-in cleaning",
      "recurring cleaning",
      "biweekly cleaning",
      "recommend a cleaner",
      "need a cleaner",
      "cleaning quote",
      "apartment cleaning",
      "home cleaning"
    ];
    DEFAULT_SUBREDDITS = [
      "cleaningtips",
      "moving",
      "homeowners",
      "firsttimehomebuyer",
      "landlord",
      "airbnb",
      "PropertyManagement",
      "Tenant",
      "malelivingspace",
      "femalelivingspace",
      "personalfinance"
    ];
  }
});

// server/services/lead-finder/classifier.ts
var classifier_exports = {};
__export(classifier_exports, {
  classifyLead: () => classifyLead,
  shouldStoreLead: () => shouldStoreLead
});
import OpenAI from "openai";
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}
async function classifyLead(title, body, subreddit) {
  const content = `Subreddit: r/${subreddit}
Title: ${title}

${body.slice(0, 800)}`;
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content }
      ],
      max_completion_tokens: 200,
      response_format: { type: "json_object" }
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      classification: parsed.classification ?? "no",
      confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
      intent: parsed.intent ?? "other",
      detectedLocation: parsed.detectedLocation ?? "",
      reason: parsed.reason ?? ""
    };
  } catch (e) {
    console.error("[classifier] Error:", e);
    return null;
  }
}
function shouldStoreLead(result) {
  if (result.classification === "yes") return true;
  if (result.classification === "maybe" && result.confidence >= 40) return true;
  return false;
}
var _openai, SYSTEM_PROMPT;
var init_classifier = __esm({
  "server/services/lead-finder/classifier.ts"() {
    "use strict";
    _openai = null;
    SYSTEM_PROMPT = `You are a lead classification assistant for a residential cleaning business.

Your job is to determine if a Reddit post is from a real potential customer who is looking for residential cleaning services.

Classify as "yes" if the post is:
- Someone asking for cleaner/maid service recommendations
- Someone requesting a quote for house cleaning
- Someone looking for recurring, deep clean, move-in, or move-out cleaning
- Clear buying intent for residential cleaning

Classify as "maybe" if the post:
- Could be a cleaning lead but is ambiguous
- Asks general questions about cleaning services/prices without clear location
- Is tangentially related (e.g. "what do you tip cleaners?")

Classify as "no" if the post is:
- A joke, meme, or sarcastic comment
- Someone talking about cleaning their own home themselves
- A job seeker advertising cleaning services
- B2B, commercial, or janitorial company hiring
- A news article or discussion with no buying intent
- Irrelevant use of the word "cleaning" (e.g. computer cleaning, political cleaning)
- Someone complaining about a cleaner they already have

Be conservative. When in doubt between "maybe" and "no", pick "no".
Only "yes" or strong "maybe" posts are worth showing as leads.

Respond ONLY with valid JSON in this exact format:
{
  "classification": "yes" | "maybe" | "no",
  "confidence": 0-100,
  "intent": "recommendation_request" | "quote_request" | "recurring_cleaning" | "deep_clean" | "move_out" | "move_in" | "one_time_clean" | "other",
  "detectedLocation": "city name or empty string",
  "reason": "one sentence explanation"
}`;
  }
});

// server/services/lead-finder/scoring.ts
var scoring_exports = {};
__export(scoring_exports, {
  scoreLead: () => scoreLead
});
function scoreLead(classification, postedAt) {
  const breakdown = {};
  let score = 0;
  const intent = classification.intent;
  const isExplicitRequest = intent === "recommendation_request" || intent === "quote_request";
  if (isExplicitRequest) {
    breakdown["Explicitly asking for a cleaner"] = 50;
    score += 50;
  } else if (intent !== "other") {
    breakdown["Clear cleaning intent"] = 20;
    score += 20;
  }
  if (classification.detectedLocation && classification.detectedLocation.length > 1) {
    breakdown["Location detected"] = 20;
    score += 20;
  }
  if (intent === "recurring_cleaning") {
    breakdown["Recurring cleaning request"] = 15;
    score += 15;
  }
  if (intent === "move_out" || intent === "deep_clean") {
    breakdown["High-value service type"] = 10;
    score += 10;
  }
  if (intent === "move_in") {
    breakdown["Move-in clean"] = 8;
    score += 8;
  }
  const hoursOld = (Date.now() - postedAt.getTime()) / (1e3 * 60 * 60);
  if (hoursOld < 24) {
    breakdown["Posted in last 24 hours"] = 10;
    score += 10;
  }
  const confidenceBonus = Math.floor((classification.confidence - 50) / 10);
  if (confidenceBonus > 0) {
    breakdown["AI confidence bonus"] = confidenceBonus;
    score += confidenceBonus;
  }
  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown
  };
}
var init_scoring = __esm({
  "server/services/lead-finder/scoring.ts"() {
    "use strict";
  }
});

// server/services/lead-finder/reply-generator.ts
var reply_generator_exports = {};
__export(reply_generator_exports, {
  generateReplies: () => generateReplies
});
import OpenAI2 from "openai";
function getOpenAI2() {
  if (!_openai2) _openai2 = new OpenAI2({ apiKey: process.env.OPENAI_API_KEY });
  return _openai2;
}
async function generateReplies(params) {
  const { postTitle, postBody, subreddit, businessName, detectedLocation, intent } = params;
  const context = `Reddit post from r/${subreddit}:
Title: ${postTitle}
Body: ${postBody.slice(0, 600)}
${detectedLocation ? `Location: ${detectedLocation}` : ""}
${intent ? `Intent: ${intent}` : ""}`;
  const systemPrompt = `You are writing Reddit replies on behalf of a residential cleaning business called "${businessName}".

Write 3 short, helpful Reddit replies to someone who appears to be looking for cleaning services.
DO NOT be spammy or salesy. Sound like a real, helpful person who happens to run a cleaning business.
DO NOT include phone numbers or URLs \u2014 just make a natural, friendly introduction.
Each reply should be 2-4 sentences max.

Return ONLY valid JSON in this format:
{
  "professional": "...",
  "warm": "...",
  "concise": "..."
}

professional: polished, clear, focused on value
warm: friendly, personal, relatable
concise: 1-2 sentences, gets straight to the point`;
  try {
    const completion = await getOpenAI2().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: context }
      ],
      max_completion_tokens: 400,
      response_format: { type: "json_object" }
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty response");
    const parsed = JSON.parse(raw);
    return [
      { tone: "professional", replyText: parsed.professional ?? "" },
      { tone: "warm", replyText: parsed.warm ?? "" },
      { tone: "concise", replyText: parsed.concise ?? "" }
    ].filter((r) => r.replyText.length > 0);
  } catch (e) {
    console.error("[reply-generator] Error:", e);
    return [
      {
        tone: "professional",
        replyText: `Hi! We're a local cleaning service and would love to help. Feel free to reach out if you'd like a quote \u2014 happy to answer any questions.`
      },
      {
        tone: "warm",
        replyText: `Hey! We run a local cleaning service and this is exactly the kind of thing we help with. Drop us a message if you want a hand!`
      },
      {
        tone: "concise",
        replyText: `We're a local cleaning service that handles exactly this. Happy to give you a quick quote!`
      }
    ];
  }
}
var _openai2;
var init_reply_generator = __esm({
  "server/services/lead-finder/reply-generator.ts"() {
    "use strict";
    _openai2 = null;
  }
});

// server/pricingEngine.ts
var pricingEngine_exports = {};
__export(pricingEngine_exports, {
  buildDefaultRulesFromQuestionnaire: () => buildDefaultRulesFromQuestionnaire,
  runPricingEngine: () => runPricingEngine
});
function runPricingEngine(job, rules) {
  const activeRules = [...rules].filter((r) => r.active).sort((a, b) => a.sortOrder - b.sortOrder);
  let subtotal = 0;
  const breakdown = [];
  const warnings = [];
  let baseSet = false;
  for (const rule of activeRules) {
    const { formula, ruleType } = rule;
    let effect = 0;
    let lineType = "add";
    switch (ruleType) {
      case "base_price": {
        if (!baseSet) {
          effect = formula.value ?? 0;
          subtotal = effect;
          baseSet = true;
          lineType = "add";
        }
        break;
      }
      case "base_by_service": {
        if (!baseSet) {
          const serviceMap = formula.value;
          if (typeof serviceMap === "object" && job.serviceType) {
            effect = serviceMap[job.serviceType] ?? serviceMap["standard"] ?? 0;
          } else {
            effect = formula.value ?? 0;
          }
          subtotal = effect;
          baseSet = true;
          lineType = "add";
        }
        break;
      }
      case "sqft_range": {
        if (!job.sqft || !formula.ranges) break;
        const sqft = job.sqft;
        const match = formula.ranges.find((r) => sqft >= r.min && sqft <= r.max);
        if (match) {
          if (!baseSet) {
            subtotal = match.price;
            effect = match.price;
            baseSet = true;
          } else {
            effect = match.price - subtotal;
            subtotal = match.price;
          }
          lineType = "add";
        }
        break;
      }
      case "bed_adjustment": {
        if (!job.beds) break;
        const perBed = formula.value ?? 0;
        effect = job.beds * perBed;
        subtotal += effect;
        lineType = "add";
        break;
      }
      case "bath_adjustment": {
        if (!job.baths) break;
        const perBath = formula.value ?? 0;
        effect = Math.floor(job.baths) * perBath;
        subtotal += effect;
        lineType = "add";
        break;
      }
      case "half_bath_adjustment": {
        if (!job.halfBaths || job.halfBaths === 0) break;
        const perHalf = formula.value ?? 0;
        effect = job.halfBaths * perHalf;
        subtotal += effect;
        lineType = "add";
        break;
      }
      case "condition_multiplier": {
        if (!job.conditionLevel) break;
        const multiplierMap = formula.value;
        let mult = 1;
        if (typeof multiplierMap === "object" && multiplierMap[job.conditionLevel]) {
          mult = multiplierMap[job.conditionLevel];
        } else if (typeof formula.value === "number") {
          const condMap = {
            light: 0.9,
            standard: 1,
            heavy: 1.25
          };
          mult = condMap[job.conditionLevel] ?? 1;
        }
        if (mult !== 1) {
          effect = subtotal * (mult - 1);
          subtotal = subtotal * mult;
          lineType = "multiply";
        }
        break;
      }
      case "frequency_discount": {
        if (!job.frequency) break;
        const discountMap = formula.value;
        let discountPct = 0;
        if (typeof discountMap === "object") {
          discountPct = discountMap[job.frequency] ?? 0;
        } else if (job.frequency === "recurring" || job.frequency === "weekly" || job.frequency === "biweekly" || job.frequency === "monthly") {
          discountPct = typeof formula.value === "number" ? formula.value : 10;
        }
        if (discountPct > 0) {
          effect = -(subtotal * discountPct / 100);
          subtotal += effect;
          lineType = "discount";
        }
        break;
      }
      case "pet_surcharge": {
        if (!job.pets) break;
        effect = formula.value ?? 25;
        subtotal += effect;
        lineType = "add";
        break;
      }
      case "addon_price": {
        const addonMap = formula.value;
        if (!job.addOns || !addonMap || typeof addonMap !== "object") break;
        for (const addon of job.addOns) {
          if (addonMap[addon]) {
            effect += addonMap[addon];
          }
        }
        if (effect > 0) {
          subtotal += effect;
          lineType = "add";
        }
        break;
      }
      case "zip_surcharge": {
        if (!job.zipCode) break;
        const zipMap = formula.value;
        if (typeof zipMap === "object" && zipMap[job.zipCode]) {
          effect = zipMap[job.zipCode];
          subtotal += effect;
          lineType = "add";
        } else if (typeof formula.value === "number") {
          effect = formula.value;
          subtotal += effect;
          lineType = "add";
        }
        break;
      }
      case "first_time_multiplier": {
        if (job.frequency !== "one-time") break;
        const mult = formula.value ?? 1;
        if (mult !== 1) {
          effect = subtotal * (mult - 1);
          subtotal = subtotal * mult;
          lineType = "multiply";
        }
        break;
      }
      case "minimum_floor": {
        const floor = formula.value ?? 0;
        if (subtotal < floor) {
          effect = floor - subtotal;
          subtotal = floor;
          lineType = "floor";
        }
        break;
      }
    }
    if (effect !== 0 || ruleType === "minimum_floor") {
      breakdown.push({
        ruleId: rule.id,
        label: rule.label,
        effect: Math.round(effect * 100) / 100,
        type: lineType,
        explanation: rule.explanation,
        runningTotal: Math.round(subtotal * 100) / 100
      });
    }
  }
  if (!baseSet) {
    warnings.push("No base price rule was applied. Add a base price or sqft range rule.");
  }
  return {
    total: Math.round(Math.max(subtotal, 0) * 100) / 100,
    breakdown,
    rulesApplied: breakdown.length,
    warnings
  };
}
function buildDefaultRulesFromQuestionnaire(q) {
  const rules = [];
  let order = 0;
  const baseStandard = q.minJobPrice ?? 100;
  rules.push({
    label: "Base Price by Service Type",
    ruleType: "base_by_service",
    inputVariables: ["serviceType"],
    formula: {
      type: "fixed",
      value: {
        standard: baseStandard,
        "deep-clean": Math.round(baseStandard * (q.deepCleanMultiplier ?? 1.5)),
        "move-in-out": Math.round(baseStandard * (q.moveOutMultiplier ?? 1.75)),
        recurring: Math.round(baseStandard * 0.9),
        commercial: Math.round(baseStandard * 2)
      }
    },
    explanation: `Starting price varies by service type. Deep clean is ${q.deepCleanMultiplier ?? 1.5}x and move-in/out is ${q.moveOutMultiplier ?? 1.75}x the standard base.`,
    source: "inferred",
    active: true,
    sortOrder: order++
  });
  rules.push({
    label: "Square Footage Pricing",
    ruleType: "sqft_range",
    inputVariables: ["sqft"],
    formula: {
      type: "range_lookup",
      ranges: [
        { min: 0, max: 800, price: Math.round(baseStandard * 0.85) },
        { min: 801, max: 1200, price: baseStandard },
        { min: 1201, max: 1600, price: Math.round(baseStandard * 1.15) },
        { min: 1601, max: 2e3, price: Math.round(baseStandard * 1.3) },
        { min: 2001, max: 2500, price: Math.round(baseStandard * 1.5) },
        { min: 2501, max: 3200, price: Math.round(baseStandard * 1.7) },
        { min: 3201, max: 99999, price: Math.round(baseStandard * 2) }
      ]
    },
    explanation: "Adjusts pricing based on the square footage of the home. Larger homes take more time and supplies.",
    source: "inferred",
    active: true,
    sortOrder: order++
  });
  rules.push({
    label: "Bedroom Adjustment",
    ruleType: "bed_adjustment",
    inputVariables: ["beds"],
    formula: { type: "per_unit", value: 10 },
    explanation: "Each bedroom adds to the quote to account for additional time spent dusting, vacuuming, and making beds.",
    source: "inferred",
    active: true,
    sortOrder: order++
  });
  rules.push({
    label: "Bathroom Adjustment",
    ruleType: "bath_adjustment",
    inputVariables: ["baths"],
    formula: { type: "per_unit", value: 15 },
    explanation: "Each full bathroom adds to the quote \u2014 bathrooms are time-intensive and require more supplies.",
    source: "inferred",
    active: true,
    sortOrder: order++
  });
  rules.push({
    label: "Half Bath Adjustment",
    ruleType: "half_bath_adjustment",
    inputVariables: ["halfBaths"],
    formula: { type: "per_unit", value: 8 },
    explanation: "Half baths (toilet + sink only) require less time than full bathrooms.",
    source: "inferred",
    active: true,
    sortOrder: order++
  });
  rules.push({
    label: "Condition Level Multiplier",
    ruleType: "condition_multiplier",
    inputVariables: ["conditionLevel"],
    formula: {
      type: "multiplier",
      value: { light: 0.9, standard: 1, heavy: 1.25 }
    },
    explanation: "Homes in heavy condition take significantly more time. Light condition homes get a small discount.",
    source: "inferred",
    active: true,
    sortOrder: order++
  });
  if (q.petSurcharge && q.petSurcharge > 0) {
    rules.push({
      label: "Pet Surcharge",
      ruleType: "pet_surcharge",
      inputVariables: ["pets"],
      formula: { type: "fixed", value: q.petSurcharge },
      explanation: `Homes with pets require extra vacuuming and dander removal. Adds $${q.petSurcharge} to the quote.`,
      source: "inferred",
      active: true,
      sortOrder: order++
    });
  }
  if (q.recurringDiscount && q.recurringDiscount > 0) {
    rules.push({
      label: "Recurring Client Discount",
      ruleType: "frequency_discount",
      inputVariables: ["frequency"],
      formula: {
        type: "percent_discount",
        value: {
          recurring: q.recurringDiscount,
          weekly: q.recurringDiscount,
          biweekly: q.recurringDiscount,
          monthly: Math.round(q.recurringDiscount / 2),
          "one-time": 0
        }
      },
      explanation: `Recurring clients receive a ${q.recurringDiscount}% loyalty discount to encourage long-term relationships.`,
      source: "inferred",
      active: true,
      sortOrder: order++
    });
  }
  if (q.travelSurcharge && q.travelSurcharge > 0) {
    rules.push({
      label: "Travel / Distance Surcharge",
      ruleType: "zip_surcharge",
      inputVariables: ["zipCode"],
      formula: { type: "fixed", value: q.travelSurcharge },
      explanation: `A flat travel surcharge of $${q.travelSurcharge} applies to jobs outside your primary service area.`,
      source: "inferred",
      active: false,
      sortOrder: order++
    });
  }
  rules.push({
    label: "Minimum Job Price Floor",
    ruleType: "minimum_floor",
    inputVariables: [],
    formula: { type: "fixed", value: q.neverGoBelow ?? 80 },
    explanation: `No job should be quoted below $${q.neverGoBelow ?? 80}. This protects your minimum profitability.`,
    source: "inferred",
    active: true,
    sortOrder: order++
  });
  return rules;
}
var init_pricingEngine = __esm({
  "server/pricingEngine.ts"() {
    "use strict";
  }
});

// server/index.ts
import express from "express";

// server/routes.ts
init_db();
init_schema();
import { createServer } from "node:http";
import crypto2 from "node:crypto";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import OpenAI3 from "openai";
import { eq as eq3, and as and3, desc as desc3 } from "drizzle-orm";
import { google } from "googleapis";

// server/stripeClient.ts
import Stripe from "stripe";
var cachedCredentials = null;
async function getCredentials() {
  if (cachedCredentials) return cachedCredentials;
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY) {
    cachedCredentials = {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      secretKey: process.env.STRIPE_SECRET_KEY
    };
    return cachedCredentials;
  }
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY ? "repl " + process.env.REPL_IDENTITY : process.env.WEB_REPL_RENEWAL ? "depl " + process.env.WEB_REPL_RENEWAL : null;
  if (!xReplitToken || !hostname) {
    throw new Error("No Stripe credentials found. Set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY.");
  }
  const connectorName = "stripe";
  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
  const targetEnvironment = isProduction ? "production" : "development";
  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", connectorName);
  url.searchParams.set("environment", targetEnvironment);
  const response = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json",
      "X_REPLIT_TOKEN": xReplitToken
    }
  });
  const data = await response.json();
  const connectionSettings = data.items?.[0];
  if (!connectionSettings || (!connectionSettings.settings.publishable || !connectionSettings.settings.secret)) {
    throw new Error(`Stripe ${targetEnvironment} connection not found`);
  }
  cachedCredentials = {
    publishableKey: connectionSettings.settings.publishable,
    secretKey: connectionSettings.settings.secret
  };
  return cachedCredentials;
}
async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey);
}

// server/qbo-client.ts
init_db();
import crypto from "node:crypto";
var INTUIT_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
var QBO_SANDBOX_URL = "https://sandbox-quickbooks.api.intuit.com";
var QBO_PRODUCTION_URL = "https://quickbooks.api.intuit.com";
function getEncryptionKey() {
  const key = process.env.QBO_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("QBO_ENCRYPTION_KEY must be set (32+ hex chars)");
  }
  return Buffer.from(key.slice(0, 32), "utf8");
}
function encryptToken(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", crypto.createHash("sha256").update(key).digest(), iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return iv.toString("hex") + ":" + tag + ":" + encrypted;
}
function decryptToken(ciphertext) {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted token format");
  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv("aes-256-gcm", crypto.createHash("sha256").update(key).digest(), iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
async function logSync(userId, quoteId, action, requestSummary, responseSummary, status, errorMessage) {
  try {
    await pool.query(
      `INSERT INTO qbo_sync_log (id, user_id, quote_id, action, request_summary, response_summary, status, error_message, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())`,
      [userId, quoteId, action, JSON.stringify(requestSummary), JSON.stringify(responseSummary), status, errorMessage || null]
    );
  } catch (e) {
    console.error("Failed to log QBO sync:", e);
  }
}
var QBOClient = class {
  userId;
  connection = null;
  constructor(userId) {
    this.userId = userId;
  }
  async loadConnection() {
    const result = await pool.query(
      `SELECT id, user_id as "userId", realm_id as "realmId",
              access_token_encrypted as "accessTokenEncrypted",
              refresh_token_encrypted as "refreshTokenEncrypted",
              access_token_expires_at as "accessTokenExpiresAt",
              environment, status, company_name as "companyName",
              auto_create_invoice as "autoCreateInvoice"
       FROM qbo_connections WHERE user_id = $1 AND status != 'disconnected'`,
      [this.userId]
    );
    this.connection = result.rows[0] || null;
    return this.connection;
  }
  getConnection() {
    return this.connection;
  }
  getBaseUrl() {
    if (!this.connection) throw new Error("No QBO connection loaded");
    return this.connection.environment === "sandbox" ? QBO_SANDBOX_URL : QBO_PRODUCTION_URL;
  }
  async ensureValidToken() {
    if (!this.connection) throw new Error("No QBO connection loaded");
    const now = /* @__PURE__ */ new Date();
    const expiresAt = new Date(this.connection.accessTokenExpiresAt);
    const fiveMinFromNow = new Date(now.getTime() + 5 * 60 * 1e3);
    if (expiresAt > fiveMinFromNow) {
      return decryptToken(this.connection.accessTokenEncrypted);
    }
    const clientId = process.env.INTUIT_CLIENT_ID;
    const clientSecret = process.env.INTUIT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("INTUIT_CLIENT_ID and INTUIT_CLIENT_SECRET must be set");
    }
    const refreshToken = decryptToken(this.connection.refreshTokenEncrypted);
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch(INTUIT_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
        "Accept": "application/json"
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken
      }).toString()
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("QBO token refresh failed:", response.status, errorBody);
      await pool.query(
        `UPDATE qbo_connections SET status = 'needs_reauth', last_error = $1 WHERE user_id = $2`,
        [`Token refresh failed: ${response.status}`, this.userId]
      );
      await logSync(this.userId, null, "refresh", {}, { status: response.status }, "failed", "Token refresh failed - reconnection required");
      throw new Error("QBO token refresh failed - user needs to reconnect");
    }
    const tokens = await response.json();
    const newAccessToken = tokens.access_token;
    const newRefreshToken = tokens.refresh_token || refreshToken;
    const expiresIn = tokens.expires_in || 3600;
    const newExpiresAt = new Date(now.getTime() + expiresIn * 1e3);
    await pool.query(
      `UPDATE qbo_connections
       SET access_token_encrypted = $1,
           refresh_token_encrypted = $2,
           access_token_expires_at = $3,
           refresh_token_last_rotated_at = NOW(),
           status = 'connected',
           last_error = NULL
       WHERE user_id = $4`,
      [encryptToken(newAccessToken), encryptToken(newRefreshToken), newExpiresAt, this.userId]
    );
    this.connection.accessTokenEncrypted = encryptToken(newAccessToken);
    this.connection.refreshTokenEncrypted = encryptToken(newRefreshToken);
    this.connection.accessTokenExpiresAt = newExpiresAt;
    this.connection.status = "connected";
    await logSync(this.userId, null, "refresh", {}, { success: true }, "ok");
    return newAccessToken;
  }
  async request(method, path2, body, retryCount = 0) {
    const maxRetries = 3;
    const accessToken = await this.ensureValidToken();
    const url = `${this.getBaseUrl()}/v3/company/${this.connection.realmId}${path2}`;
    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
      "Content-Type": "application/json"
    };
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : void 0
    });
    if (response.status === 401 && retryCount === 0) {
      this.connection.accessTokenExpiresAt = /* @__PURE__ */ new Date(0);
      return this.request(method, path2, body, retryCount + 1);
    }
    if ((response.status === 429 || response.status >= 500) && retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1e3 + Math.random() * 500;
      await new Promise((resolve2) => setTimeout(resolve2, delay));
      return this.request(method, path2, body, retryCount + 1);
    }
    const data = await response.json();
    if (!response.ok) {
      const errorMsg = data?.Fault?.Error?.[0]?.Detail || data?.Fault?.Error?.[0]?.Message || JSON.stringify(data);
      throw new Error(`QBO API error ${response.status}: ${errorMsg}`);
    }
    return data;
  }
  async queryCustomer(email, displayName) {
    let query = "select * from Customer where ";
    const conditions = [];
    if (email) conditions.push(`PrimaryEmailAddr = '${email.replace(/'/g, "\\'")}'`);
    if (displayName) conditions.push(`DisplayName = '${displayName.replace(/'/g, "\\'")}'`);
    if (conditions.length === 0) return null;
    query += conditions.join(" OR ");
    query += " MAXRESULTS 1";
    const data = await this.request("GET", `/query?query=${encodeURIComponent(query)}`);
    const customers2 = data?.QueryResponse?.Customer;
    return customers2 && customers2.length > 0 ? customers2[0] : null;
  }
  async createCustomer(displayName, email, phone, address) {
    const customerData = { DisplayName: displayName };
    if (email) customerData.PrimaryEmailAddr = { Address: email };
    if (phone) customerData.PrimaryPhone = { FreeFormNumber: phone };
    if (address) {
      customerData.BillAddr = { Line1: address };
    }
    const data = await this.request("POST", "/customer", customerData);
    return data.Customer;
  }
  async createInvoice(customerRefId, lines, privateNote, txnDate) {
    const invoiceLines = lines.map((line, idx) => ({
      DetailType: "SalesItemLineDetail",
      Amount: line.amount,
      Description: line.description,
      SalesItemLineDetail: {
        UnitPrice: line.amount,
        Qty: 1
      },
      LineNum: idx + 1
    }));
    const invoiceData = {
      CustomerRef: { value: customerRefId },
      Line: invoiceLines
    };
    if (privateNote) invoiceData.PrivateNote = privateNote;
    if (txnDate) invoiceData.TxnDate = txnDate;
    const data = await this.request("POST", "/invoice", invoiceData);
    return data.Invoice;
  }
  async getCompanyInfo() {
    if (!this.connection) throw new Error("No QBO connection loaded");
    const data = await this.request("GET", `/companyinfo/${this.connection.realmId}`);
    return data.CompanyInfo;
  }
};

// server/seo-pages.ts
function faqSchema(faq) {
  const items = faq.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer
    }
  }));
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items
  });
}
function renderSection(s) {
  const tag = s.level;
  return `<section id="${s.id}" class="content-section"><${tag}>${s.heading}</${tag}>${s.content}</section>`;
}
function getBaseUrl() {
  const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPL_SLUG + ".replit.app";
  return `https://${domain}`;
}
function renderSEOPage(config) {
  const baseUrl = getBaseUrl();
  const canonicalUrl = `${baseUrl}/${config.slug}`;
  const sectionsHTML = config.sections.map(renderSection).join("\n");
  const faqHTML = config.faq.map(
    (f) => `<div class="faq-item"><h3 class="faq-q">${f.question}</h3><p class="faq-a">${f.answer}</p></div>`
  ).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${config.title}</title>
<meta name="description" content="${config.metaDescription}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${canonicalUrl}">
<meta property="og:title" content="${config.title}">
<meta property="og:description" content="${config.metaDescription}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonicalUrl}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${config.title}">
<meta name="twitter:description" content="${config.metaDescription}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script type="application/ld+json">${faqSchema(config.faq)}</script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',system-ui,-apple-system,sans-serif;color:#0f172a;background:#f8fafc;-webkit-font-smoothing:antialiased;line-height:1.7}
a{color:#2563eb;text-decoration:none}
a:hover{text-decoration:underline}

.seo-header{background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#3b82f6 100%);color:#fff;padding:3rem 1.5rem 2.5rem;text-align:center}
.seo-header h1{font-size:2.25rem;font-weight:800;line-height:1.2;margin-bottom:0.75rem;letter-spacing:-0.02em}
.seo-header .intro{max-width:640px;margin:0 auto;font-size:1.05rem;color:rgba(255,255,255,0.88);line-height:1.7}
.breadcrumb{max-width:800px;margin:1rem auto 0;font-size:0.8rem;color:rgba(255,255,255,0.6)}
.breadcrumb a{color:rgba(255,255,255,0.75)}
.breadcrumb a:hover{color:#fff}

.page-body{max-width:800px;margin:0 auto;padding:2rem 1.5rem 4rem}

.content-section{margin-bottom:2.5rem}
.content-section h2{font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:1rem;letter-spacing:-0.01em}
.content-section h3{font-size:1.2rem;font-weight:600;color:#1e293b;margin-bottom:0.75rem}
.content-section p{color:#475569;margin-bottom:1rem;font-size:0.95rem}
.content-section ul,.content-section ol{color:#475569;margin-bottom:1rem;padding-left:1.5rem;font-size:0.95rem}
.content-section li{margin-bottom:0.4rem}

.free-badge-row{display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-bottom:0.35rem}
.free-badge{display:inline-flex;align-items:center;gap:0.35rem;padding:0.25rem 0.75rem;background:linear-gradient(135deg,#059669,#047857);color:#fff;font-size:0.68rem;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;border-radius:20px;box-shadow:0 2px 8px rgba(5,150,105,0.25)}
.free-badge svg{width:12px;height:12px}
.free-subtext{text-align:center;font-size:0.82rem;color:#64748b;margin-bottom:1.25rem}
.calc-wrapper{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:2rem;margin:2rem 0;box-shadow:0 4px 24px rgba(0,0,0,0.06)}
.calc-wrapper h2{font-size:1.35rem;font-weight:700;color:#0f172a;margin-bottom:0.35rem;text-align:center}
.quote-upsell-text{text-align:center;font-size:0.88rem;color:#475569;font-weight:500;margin-bottom:0.75rem;margin-top:0.25rem}
.calc-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.calc-field{display:flex;flex-direction:column;gap:0.35rem}
.calc-field.full{grid-column:1/-1}
.calc-field label{font-size:0.82rem;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.04em}
.calc-field input,.calc-field select{padding:0.65rem 0.85rem;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.95rem;font-family:inherit;color:#0f172a;background:#f8fafc;transition:border-color 0.2s,box-shadow 0.2s}
.calc-field input:focus,.calc-field select:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.12)}
.calc-btn{display:block;width:100%;padding:0.85rem;margin-top:1.25rem;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:1rem;font-weight:700;border:none;border-radius:12px;cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;box-shadow:0 4px 14px rgba(37,99,235,0.3)}
.calc-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(37,99,235,0.35)}
.calc-btn:active{transform:translateY(0)}

.calc-results{display:none;margin-top:1.5rem;animation:fadeUp 0.4s ease-out}
.tier-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:0.75rem}
.tier-card{background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:1.25rem 1rem;text-align:center;transition:border-color 0.2s,transform 0.2s}
.tier-card.popular{border-color:#2563eb;background:#eff6ff;position:relative}
.tier-card.popular::before{content:'Most Popular';position:absolute;top:-10px;left:50%;transform:translateX(-50%);background:#2563eb;color:#fff;font-size:0.65rem;font-weight:700;padding:2px 10px;border-radius:10px;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap}
.tier-card:hover{transform:translateY(-2px)}
.tier-name{font-size:0.8rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem}
.tier-price{font-size:1.75rem;font-weight:800;color:#0f172a}
.tier-price span{font-size:0.85rem;font-weight:500;color:#94a3b8}
.calc-note{text-align:center;color:#94a3b8;font-size:0.78rem;margin-top:0.75rem}

.faq-section{margin-bottom:2.5rem}
.faq-section h2{font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:1.25rem}
.faq-item{border-bottom:1px solid #e2e8f0;padding:1rem 0}
.faq-item:last-child{border-bottom:none}
.faq-q{font-size:1rem;font-weight:600;color:#1e293b;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:0.5rem}
.faq-q::after{content:'+';font-size:1.25rem;color:#94a3b8;transition:transform 0.2s;flex-shrink:0}
.faq-item.open .faq-q::after{transform:rotate(45deg)}
.faq-a{color:#475569;font-size:0.92rem;line-height:1.7;max-height:0;overflow:hidden;transition:max-height 0.3s ease,padding 0.3s ease;padding-top:0}
.faq-item.open .faq-a{max-height:500px;padding-top:0.75rem}

.toolkit-cta{background:linear-gradient(135deg,#1e293b,#334155);border-radius:16px;padding:2.5rem 2rem;text-align:center;color:#fff;margin:2rem 0}
.toolkit-cta h2{font-size:1.35rem;font-weight:700;margin-bottom:0.5rem}
.toolkit-cta p{color:rgba(255,255,255,0.75);font-size:0.95rem;margin-bottom:1.25rem;max-width:480px;margin-left:auto;margin-right:auto}
.toolkit-cta a{display:inline-block;padding:0.75rem 2rem;background:#fff;color:#1e293b;font-weight:700;border-radius:10px;font-size:0.95rem;transition:transform 0.15s,box-shadow 0.15s;box-shadow:0 2px 8px rgba(0,0,0,0.15)}
.toolkit-cta a:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,0,0,0.2);text-decoration:none}

.seo-footer{background:#1e293b;color:rgba(255,255,255,0.6);text-align:center;padding:2rem 1.5rem;font-size:0.82rem}
.seo-footer a{color:rgba(255,255,255,0.75)}

.quote-preview{display:none;margin-top:2rem;animation:fadeUp 0.5s ease-out}
.quote-card{background:#fff;border:2px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08)}
.quote-card-header{background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:1.25rem 1.5rem;display:flex;align-items:center;gap:0.75rem}
.quote-card-header svg{width:24px;height:24px;color:#fff;flex-shrink:0}
.quote-card-header h3{color:#fff;font-size:1.1rem;font-weight:700;margin:0}
.quote-card-header span{color:rgba(255,255,255,0.7);font-size:0.8rem;font-weight:500}
.quote-card-body{padding:1.5rem}
.quote-row{display:flex;justify-content:space-between;align-items:center;padding:0.65rem 0;border-bottom:1px solid #f1f5f9}
.quote-row:last-child{border-bottom:none}
.quote-row-label{font-size:0.85rem;color:#64748b;font-weight:500}
.quote-row-value{font-size:0.9rem;color:#0f172a;font-weight:600}
.quote-row-value.price{font-size:1.15rem;color:#2563eb;font-weight:800}
.quote-card-footer{padding:1.25rem 1.5rem;background:#f8fafc;border-top:1px solid #e2e8f0}
.generate-quote-btn{display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;padding:0.85rem;background:linear-gradient(135deg,#059669,#047857);color:#fff;font-size:0.95rem;font-weight:700;border:none;border-radius:12px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 14px rgba(5,150,105,0.3)}
.generate-quote-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(5,150,105,0.35)}
.generate-quote-btn svg{width:18px;height:18px}

.proposal-overlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:1000;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);overflow-y:auto;padding:2rem 1rem}
.proposal-container{max-width:680px;margin:0 auto;animation:fadeUp 0.4s ease-out}
.proposal-close{display:flex;align-items:center;gap:0.5rem;color:rgba(255,255,255,0.8);font-size:0.85rem;font-weight:500;background:none;border:none;cursor:pointer;margin-bottom:1rem;padding:0.5rem 0}
.proposal-close:hover{color:#fff}
.proposal-doc{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,0.2)}
.proposal-doc-header{background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#3b82f6 100%);padding:2.5rem 2rem;text-align:center;color:#fff}
.proposal-doc-header h2{font-size:1.5rem;font-weight:800;margin-bottom:0.25rem;letter-spacing:-0.02em}
.proposal-doc-header p{color:rgba(255,255,255,0.75);font-size:0.88rem;font-weight:400}
.proposal-section{padding:1.5rem 2rem;border-bottom:1px solid #f1f5f9}
.proposal-section:last-child{border-bottom:none}
.proposal-section-title{font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#2563eb;margin-bottom:1rem}
.proposal-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem}
.proposal-detail{background:#f8fafc;border-radius:10px;padding:0.85rem 1rem}
.proposal-detail-label{font-size:0.72rem;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.2rem}
.proposal-detail-value{font-size:0.95rem;color:#0f172a;font-weight:600}
.scope-list{list-style:none;padding:0}
.scope-list li{display:flex;align-items:flex-start;gap:0.6rem;padding:0.5rem 0;font-size:0.9rem;color:#334155}
.scope-list li svg{width:18px;height:18px;color:#059669;flex-shrink:0;margin-top:1px}
.proposal-price-box{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #bfdbfe;border-radius:14px;padding:1.5rem;text-align:center}
.proposal-price-label{font-size:0.78rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.35rem}
.proposal-price-amount{font-size:2.5rem;font-weight:800;color:#1e3a8a;letter-spacing:-0.02em}
.proposal-price-note{font-size:0.78rem;color:#64748b;margin-top:0.35rem}
.proposal-addons{margin-top:1rem}
.proposal-addon-item{display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0.85rem;background:#fefce8;border-radius:8px;margin-bottom:0.5rem;font-size:0.85rem}
.proposal-addon-name{color:#854d0e;font-weight:500}
.proposal-addon-price{color:#a16207;font-weight:700}
.proposal-cta-section{padding:1.5rem 2rem 2rem;text-align:center}
.send-quote-btn{display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;padding:1rem;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:1.05rem;font-weight:700;border:none;border-radius:14px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 16px rgba(37,99,235,0.35)}
.send-quote-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(37,99,235,0.4)}
.send-quote-btn svg{width:20px;height:20px}
.proposal-cta-note{font-size:0.78rem;color:#94a3b8;margin-top:0.75rem}

.signup-modal-overlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:2000;background:rgba(15,23,42,0.7);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:1rem}
.signup-modal{background:#fff;border-radius:20px;max-width:420px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,0.25);animation:fadeUp 0.35s ease-out;overflow:hidden}
.signup-modal-header{background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:2rem 2rem 1.5rem;text-align:center;color:#fff}
.signup-modal-header h3{font-size:1.25rem;font-weight:700;margin-bottom:0.35rem}
.signup-modal-header p{color:rgba(255,255,255,0.75);font-size:0.85rem}
.signup-modal-body{padding:1.5rem 2rem 2rem}
.signup-field{margin-bottom:1rem}
.signup-field label{display:block;font-size:0.8rem;font-weight:600;color:#475569;margin-bottom:0.35rem;text-transform:uppercase;letter-spacing:0.04em}
.signup-field input{width:100%;padding:0.7rem 0.85rem;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.95rem;font-family:inherit;color:#0f172a;background:#f8fafc;transition:border-color 0.2s,box-shadow 0.2s}
.signup-field input:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.12)}
.signup-submit{display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;padding:0.85rem;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:1rem;font-weight:700;border:none;border-radius:12px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 14px rgba(37,99,235,0.3);margin-top:0.5rem}
.signup-submit:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(37,99,235,0.35)}
.signup-submit:disabled{opacity:0.6;cursor:not-allowed;transform:none}
.signup-error{background:#fef2f2;color:#dc2626;border-radius:8px;padding:0.65rem 0.85rem;font-size:0.82rem;font-weight:500;margin-bottom:1rem;display:none}
.signup-modal-footer{text-align:center;padding:0 2rem 1.5rem;font-size:0.78rem;color:#94a3b8}
.signup-modal-close{position:absolute;top:1rem;right:1rem;background:rgba(255,255,255,0.15);border:none;color:#fff;width:28px;height:28px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.1rem;transition:background 0.2s}
.signup-modal-close:hover{background:rgba(255,255,255,0.25)}

@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

@media(max-width:640px){
  .seo-header{padding:2rem 1.25rem 2rem}
  .seo-header h1{font-size:1.65rem}
  .page-body{padding:1.5rem 1.25rem 3rem}
  .calc-grid{grid-template-columns:1fr}
  .tier-cards{grid-template-columns:1fr}
  .tier-card{padding:1rem}
  .toolkit-cta{padding:2rem 1.5rem}
  .proposal-detail-grid{grid-template-columns:1fr}
  .proposal-doc-header{padding:2rem 1.5rem}
  .proposal-section{padding:1.25rem 1.5rem}
  .proposal-cta-section{padding:1.25rem 1.5rem 1.5rem}
  .proposal-price-amount{font-size:2rem}
  .signup-modal-header{padding:1.5rem 1.5rem 1.25rem}
  .signup-modal-body{padding:1.25rem 1.5rem 1.5rem}
}
</style>
</head>
<body>

<header class="seo-header">
  <nav class="breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/calculators">Calculators</a> &rsaquo; ${config.h1}</nav>
  <h1>${config.h1}</h1>
  <p class="intro">${config.introParagraph}</p>
</header>

<div class="page-body">
  ${sectionsHTML}

  <div class="calc-wrapper" id="calculator">
    <div class="free-badge-row">
      <span class="free-badge"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg> Free Tool</span>
    </div>
    ${config.calculatorHTML}
    <p class="free-subtext">This calculator is completely free to use. No signup required.</p>

    <div class="quote-preview" id="quotePreview">
      <p class="quote-upsell-text">Want to send this as a professional quote to your customer?</p>
      <div class="quote-card">
        <div class="quote-card-header">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
          <div>
            <h3>Your Estimate Preview</h3>
            <span>Based on your inputs</span>
          </div>
        </div>
        <div class="quote-card-body">
          <div class="quote-row"><span class="quote-row-label">Service Type</span><span class="quote-row-value" id="qpServiceType">--</span></div>
          <div class="quote-row"><span class="quote-row-label">Home Size</span><span class="quote-row-value" id="qpSqft">--</span></div>
          <div class="quote-row"><span class="quote-row-label">Bedrooms</span><span class="quote-row-value" id="qpBeds">--</span></div>
          <div class="quote-row"><span class="quote-row-label">Bathrooms</span><span class="quote-row-value" id="qpBaths">--</span></div>
          <div class="quote-row"><span class="quote-row-label">Estimated Price</span><span class="quote-row-value price" id="qpPrice">--</span></div>
        </div>
        <div class="quote-card-footer">
          <button class="generate-quote-btn" onclick="showProposal()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" /></svg>
            Generate Professional Quote
          </button>
        </div>
      </div>
    </div>
  </div>

  <div class="proposal-overlay" id="proposalOverlay">
    <div class="proposal-container">
      <button class="proposal-close" onclick="hideProposal()">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
        Back to Calculator
      </button>
      <div class="proposal-doc">
        <div class="proposal-doc-header">
          <h2>Cleaning Service Proposal</h2>
          <p>Professional Estimate</p>
        </div>
        <div class="proposal-section">
          <div class="proposal-section-title">Service Details</div>
          <div class="proposal-detail-grid">
            <div class="proposal-detail"><div class="proposal-detail-label">Service</div><div class="proposal-detail-value" id="prServiceType">--</div></div>
            <div class="proposal-detail"><div class="proposal-detail-label">Frequency</div><div class="proposal-detail-value" id="prFrequency">--</div></div>
            <div class="proposal-detail"><div class="proposal-detail-label">Bedrooms</div><div class="proposal-detail-value" id="prBeds">--</div></div>
            <div class="proposal-detail"><div class="proposal-detail-label">Bathrooms</div><div class="proposal-detail-value" id="prBaths">--</div></div>
            <div class="proposal-detail"><div class="proposal-detail-label">Square Footage</div><div class="proposal-detail-value" id="prSqft">--</div></div>
            <div class="proposal-detail"><div class="proposal-detail-label">Date</div><div class="proposal-detail-value" id="prDate">--</div></div>
          </div>
        </div>
        <div class="proposal-section">
          <div class="proposal-section-title">Scope of Work</div>
          <ul class="scope-list" id="prScopeList"></ul>
        </div>
        <div class="proposal-section">
          <div class="proposal-section-title">Estimated Investment</div>
          <div class="proposal-price-box">
            <div class="proposal-price-label">Recommended Price</div>
            <div class="proposal-price-amount" id="prPriceAmount">$0</div>
            <div class="proposal-price-note">Based on "Better" tier pricing</div>
          </div>
          <div class="proposal-addons" id="prAddons"></div>
        </div>
        <div class="proposal-cta-section">
          <button class="send-quote-btn" onclick="handleSendQuote()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
            Send This Quote to Your Customer
          </button>
          <p class="proposal-cta-note">Create your free QuotePro account to send, track, and manage professional quotes</p>
        </div>
      </div>
    </div>
  </div>

  <div class="signup-modal-overlay" id="signupOverlay">
    <div class="signup-modal" style="position:relative">
      <button class="signup-modal-close" onclick="hideSignup()">&times;</button>
      <div class="signup-modal-header">
        <h3>Create Your Free Account</h3>
        <p>Send this quote and manage all your estimates in one place</p>
      </div>
      <div class="signup-modal-body">
        <div class="signup-error" id="signupError"></div>
        <div class="signup-field">
          <label for="signupEmail">Email</label>
          <input type="email" id="signupEmail" placeholder="you@company.com">
        </div>
        <div class="signup-field">
          <label for="signupPassword">Password</label>
          <input type="password" id="signupPassword" placeholder="Create a password (min. 6 characters)">
        </div>
        <button class="signup-submit" id="signupSubmitBtn" onclick="submitSignup()">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
          Create Account &amp; Send Quote
        </button>
      </div>
      <div class="signup-modal-footer">By signing up you agree to our Terms of Service</div>
    </div>
  </div>

  <section class="faq-section" id="faq">
    <h2>Frequently Asked Questions</h2>
    ${faqHTML}
  </section>

  <div class="toolkit-cta">
    <h2>${config.toolkitCTA || "Explore More Free Tools"}</h2>
    <p>Get calculators, pricing templates, scripts, and growth tools built for cleaning business owners.</p>
    <a href="/app/toolkit">Browse the Cleaning Business Toolkit</a>
  </div>
</div>

<footer class="seo-footer">
  <p>&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} QuotePro &middot; <a href="/privacy">Privacy</a> &middot; <a href="/terms">Terms</a></p>
</footer>

<script>
document.querySelectorAll('.faq-item').forEach(function(item){
  item.querySelector('.faq-q').addEventListener('click',function(){
    item.classList.toggle('open');
  });
});

var _quoteData = {};
var _serviceLabels = {regular:'Regular Cleaning',deep_clean:'Deep Cleaning',move_in_out:'Move In / Move Out'};
var _freqLabels = {'one-time':'One-Time',weekly:'Weekly',biweekly:'Bi-Weekly',monthly:'Monthly'};
var _defaultScopeItems = {
  regular: ['Dust all surfaces and furniture','Vacuum and mop all floors','Clean and sanitize bathrooms','Clean kitchen counters and appliances','Empty trash and replace liners','Wipe mirrors and glass surfaces'],
  deep_clean: ['All standard cleaning tasks','Inside oven, microwave, and refrigerator','Baseboard and wall spot cleaning','Interior window and track detailing','Behind and under furniture','Detailed grout and tile scrubbing','Light fixtures and ceiling fans','Cabinet fronts and door frames'],
  move_in_out: ['Complete deep cleaning of all rooms','Inside all cabinets, drawers, and closets','Inside all appliances','All light fixtures and switch plates','Window sills, tracks, and interior glass','Wall spot cleaning and baseboard detailing','Garage sweeping (if applicable)','Move-in/move-out ready guarantee']
};
var _customScopeItems = ${config.scopeItems ? JSON.stringify(config.scopeItems) : "null"};
var _customServiceLabel = ${config.serviceLabel ? JSON.stringify(config.serviceLabel) : "null"};
var _checkSvg = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>';

function updateQuotePreview(data) {
  _quoteData = data;
  var st = data.service_type || 'regular';
  document.getElementById('qpServiceType').textContent = _customServiceLabel || _serviceLabels[st] || st;
  document.getElementById('qpSqft').textContent = (data.square_footage || 0).toLocaleString() + ' sq ft';
  document.getElementById('qpBeds').textContent = data.bedrooms || 0;
  document.getElementById('qpBaths').textContent = data.bathrooms || 0;
  document.getElementById('qpPrice').textContent = '$' + (data.estimated_price || 0);
  document.getElementById('quotePreview').style.display = 'block';
  document.getElementById('quotePreview').style.animation = 'fadeUp 0.5s ease-out';
}

function showProposal() {
  var d = _quoteData;
  var st = d.service_type || 'regular';
  var serviceLabel = _customServiceLabel || _serviceLabels[st] || st;
  document.getElementById('prServiceType').textContent = serviceLabel;
  document.getElementById('prFrequency').textContent = _freqLabels[d.frequency] || d.frequency || 'One-Time';
  document.getElementById('prBeds').textContent = d.bedrooms || 0;
  document.getElementById('prBaths').textContent = d.bathrooms || 0;
  document.getElementById('prSqft').textContent = (d.square_footage || 0).toLocaleString() + ' sq ft';
  document.getElementById('prDate').textContent = new Date().toLocaleDateString('en-US', {month:'long',day:'numeric',year:'numeric'});
  document.getElementById('prPriceAmount').textContent = '$' + (d.estimated_price || 0);

  var items = _customScopeItems || _defaultScopeItems[st] || _defaultScopeItems.regular;
  document.getElementById('prScopeList').innerHTML = items.map(function(t){return '<li>'+_checkSvg+' '+t+'</li>';}).join('');

  var addonsHtml = '';
  if (d.add_ons) {
    var addons = d.add_ons;
    if (addons.garage) addonsHtml += '<div class="proposal-addon-item"><span class="proposal-addon-name">Garage Cleaning</span><span class="proposal-addon-price">+$75</span></div>';
    if (addons.carpets) addonsHtml += '<div class="proposal-addon-item"><span class="proposal-addon-name">Carpet Treatment</span><span class="proposal-addon-price">+$100</span></div>';
  }
  document.getElementById('prAddons').innerHTML = addonsHtml;

  document.getElementById('proposalOverlay').style.display = 'block';
  document.body.style.overflow = 'hidden';
  window.scrollTo(0,0);
}

function hideProposal() {
  document.getElementById('proposalOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

function handleSendQuote() {
  document.getElementById('signupOverlay').style.display = 'flex';
}

function hideSignup() {
  document.getElementById('signupOverlay').style.display = 'none';
  document.getElementById('signupError').style.display = 'none';
}

function submitSignup() {
  var email = document.getElementById('signupEmail').value.trim();
  var password = document.getElementById('signupPassword').value;
  var errEl = document.getElementById('signupError');
  var btn = document.getElementById('signupSubmitBtn');

  if (!email || !password) { errEl.textContent = 'Please enter both email and password.'; errEl.style.display = 'block'; return; }
  if (password.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; errEl.style.display = 'block'; return; }

  errEl.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = 'Creating account...';

  fetch('/api/public/calculator-signup', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    credentials: 'include',
    body: JSON.stringify({ email: email, password: password, quoteData: _quoteData })
  })
  .then(function(r){ return r.json().then(function(d){ return {ok:r.ok,data:d}; }); })
  .then(function(res){
    if (!res.ok) { throw new Error(res.data.message || 'Signup failed'); }
    window.location.href = res.data.redirectUrl || '/app/dashboard';
  })
  .catch(function(err){
    errEl.textContent = err.message;
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = 'Create Account & Send Quote';
  });
}

document.getElementById('proposalOverlay').addEventListener('click', function(e){
  if (e.target === this) hideProposal();
});
document.getElementById('signupOverlay').addEventListener('click', function(e){
  if (e.target === this) hideSignup();
});
</script>
</body>
</html>`;
}
function getCleaningQuoteGeneratorPage() {
  const baseUrl = getBaseUrl();
  const canonicalUrl = `${baseUrl}/cleaning-quote-generator`;
  const faq = [
    { question: "How much should I charge for a house cleaning?", answer: "House cleaning prices typically range from $120 to $350+ depending on the home size, condition, and service type. Standard cleaning for a 3-bedroom, 2-bathroom home averages $180 to $240. Deep cleaning costs 40-60% more. Use our free quote generator above to get an instant estimate." },
    { question: "What should a professional cleaning quote include?", answer: "A professional cleaning quote should include the service type, property details (bedrooms, bathrooms, square footage), scope of work, any add-on services, pricing tiers, frequency discounts, and an expiration date. QuotePro generates all of this automatically." },
    { question: "How do I send a cleaning estimate to a customer?", answer: "With QuotePro, generate your estimate using the calculator above, then click 'Send This Quote to Your Customer.' Create a free account and your quote is instantly saved. From your dashboard, you can email a professional PDF proposal directly to your customer." },
    { question: "Should I offer Good/Better/Best pricing?", answer: "Yes. Tiered pricing (Good/Better/Best) is proven to increase average ticket size by 15-25%. Most customers choose the middle option. QuotePro automatically generates three pricing tiers for every quote." },
    { question: "How do I price recurring cleaning services?", answer: "Recurring services are typically discounted: weekly (15-20% off), biweekly (10-15% off), monthly (5-10% off). The recurring discount is offset by guaranteed revenue and reduced customer acquisition costs." },
    { question: "What add-ons increase my cleaning revenue?", answer: "The highest-value add-ons are inside oven cleaning ($35-50), inside refrigerator cleaning ($30-45), interior window cleaning ($40-75), carpet cleaning, and garage cleaning. Offering add-ons can increase your average ticket by 20-35%." },
    { question: "Is this quote generator free?", answer: "Yes. The quote generator is completely free to use with no signup required. If you want to save and send professional proposals to customers, you can create a free QuotePro account." }
  ];
  const faqSchemaJSON = faqSchema(faq);
  const faqHTML = faq.map((f) => `<div class="faq-item"><h3 class="faq-q">${f.question}</h3><p class="faq-a">${f.answer}</p></div>`).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Cleaning Quote Generator | Create Cleaning Estimates Online</title>
<meta name="description" content="Generate professional cleaning quotes in seconds. Create residential or commercial cleaning estimates and send proposals to customers.">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${canonicalUrl}">
<meta property="og:title" content="Cleaning Quote Generator | Create Cleaning Estimates Online">
<meta property="og:description" content="Generate professional cleaning quotes in seconds. Create residential or commercial cleaning estimates and send proposals to customers.">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonicalUrl}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="Cleaning Quote Generator | Create Cleaning Estimates Online">
<meta name="twitter:description" content="Generate professional cleaning quotes in seconds. Create residential or commercial cleaning estimates and send proposals to customers.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script type="application/ld+json">${faqSchemaJSON}</script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',system-ui,-apple-system,sans-serif;color:#0f172a;background:#f8fafc;-webkit-font-smoothing:antialiased;line-height:1.7}
a{color:#2563eb;text-decoration:none}
a:hover{text-decoration:underline}

.hero{background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 40%,#3b82f6 100%);color:#fff;padding:4rem 1.5rem 3.5rem;text-align:center;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle at 30% 50%,rgba(255,255,255,0.04) 0%,transparent 50%);pointer-events:none}
.hero h1{font-size:2.5rem;font-weight:800;line-height:1.15;margin-bottom:0.75rem;letter-spacing:-0.03em;max-width:700px;margin-left:auto;margin-right:auto;position:relative}
.hero .sub{max-width:540px;margin:0 auto 2rem;font-size:1.1rem;color:rgba(255,255,255,0.85);line-height:1.6;position:relative}
.hero-btns{display:flex;align-items:center;justify-content:center;gap:0.75rem;flex-wrap:wrap;position:relative}
.hero-btn-primary{display:inline-flex;align-items:center;gap:0.5rem;padding:0.85rem 2rem;background:#fff;color:#1e3a8a;font-size:1rem;font-weight:700;border:none;border-radius:12px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 14px rgba(0,0,0,0.15)}
.hero-btn-primary:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.2);text-decoration:none}
.hero-btn-secondary{display:inline-flex;align-items:center;gap:0.5rem;padding:0.85rem 2rem;background:rgba(255,255,255,0.12);color:#fff;font-size:1rem;font-weight:600;border:1.5px solid rgba(255,255,255,0.3);border-radius:12px;cursor:pointer;transition:all 0.2s;backdrop-filter:blur(4px)}
.hero-btn-secondary:hover{background:rgba(255,255,255,0.2);border-color:rgba(255,255,255,0.5);text-decoration:none}
.hero-trust{margin-top:2rem;display:flex;align-items:center;justify-content:center;gap:1.5rem;flex-wrap:wrap;position:relative}
.hero-trust span{font-size:0.8rem;color:rgba(255,255,255,0.6);display:flex;align-items:center;gap:0.35rem}
.hero-trust svg{width:14px;height:14px}

.page-body{max-width:800px;margin:0 auto;padding:2.5rem 1.5rem 4rem}

.free-badge-row{display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-bottom:0.5rem}
.free-badge{display:inline-flex;align-items:center;gap:0.35rem;padding:0.25rem 0.75rem;background:linear-gradient(135deg,#059669,#047857);color:#fff;font-size:0.68rem;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;border-radius:20px;box-shadow:0 2px 8px rgba(5,150,105,0.25)}
.free-badge svg{width:12px;height:12px}
.free-subtext{text-align:center;font-size:0.82rem;color:#64748b;margin-bottom:1.25rem}

.gen-wrapper{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:2rem;margin-bottom:2.5rem;box-shadow:0 4px 24px rgba(0,0,0,0.06)}
.gen-wrapper h2{font-size:1.35rem;font-weight:700;color:#0f172a;margin-bottom:0.35rem;text-align:center}

.calc-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
.calc-field{display:flex;flex-direction:column;gap:0.35rem}
.calc-field.full{grid-column:1/-1}
.calc-field label{font-size:0.82rem;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.04em}
.calc-field input,.calc-field select{padding:0.65rem 0.85rem;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.95rem;font-family:inherit;color:#0f172a;background:#f8fafc;transition:border-color 0.2s,box-shadow 0.2s}
.calc-field input:focus,.calc-field select:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.12)}

.addons-section{margin-top:1.25rem;padding-top:1rem;border-top:1px solid #f1f5f9}
.addons-title{font-size:0.82rem;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.75rem}
.addons-grid{display:flex;flex-wrap:wrap;gap:0.5rem}
.addon-chip{display:flex;align-items:center;gap:0.5rem;padding:0.5rem 0.85rem;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;cursor:pointer;transition:all 0.2s;font-size:0.85rem;color:#475569;user-select:none}
.addon-chip:hover{border-color:#93c5fd;background:#eff6ff}
.addon-chip.active{background:#eff6ff;border-color:#3b82f6;color:#1e40af}
.addon-chip input{display:none}
.addon-check{width:16px;height:16px;border:1.5px solid #cbd5e1;border-radius:4px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0}
.addon-chip.active .addon-check{background:#2563eb;border-color:#2563eb}
.addon-chip.active .addon-check svg{display:block}
.addon-check svg{display:none;width:10px;height:10px;color:#fff}
.addon-price{font-size:0.75rem;color:#94a3b8;font-weight:500}

.calc-btn{display:block;width:100%;padding:0.85rem;margin-top:1.25rem;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:1rem;font-weight:700;border:none;border-radius:12px;cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;box-shadow:0 4px 14px rgba(37,99,235,0.3)}
.calc-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(37,99,235,0.35)}
.calc-btn:active{transform:translateY(0)}

.quote-result{display:none;margin-top:2rem;animation:fadeUp 0.5s ease-out}
.proposal-card{background:#fff;border:2px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.08)}
.proposal-header{background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:1.5rem;text-align:center;color:#fff}
.proposal-header h3{font-size:1.2rem;font-weight:700;margin-bottom:0.15rem}
.proposal-header span{font-size:0.8rem;color:rgba(255,255,255,0.7)}
.proposal-body{padding:1.5rem}
.proposal-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1.25rem}
.proposal-item{background:#f8fafc;border-radius:10px;padding:0.75rem 1rem}
.proposal-item-label{font-size:0.72rem;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.15rem}
.proposal-item-value{font-size:0.95rem;color:#0f172a;font-weight:600}
.scope-title{font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#2563eb;margin-bottom:0.75rem}
.scope-list{list-style:none;padding:0;margin-bottom:1.25rem}
.scope-list li{display:flex;align-items:flex-start;gap:0.5rem;padding:0.4rem 0;font-size:0.88rem;color:#334155}
.scope-list li svg{width:16px;height:16px;color:#059669;flex-shrink:0;margin-top:2px}
.addons-summary{margin-bottom:1.25rem}
.addon-line{display:flex;justify-content:space-between;align-items:center;padding:0.5rem 0.75rem;background:#fefce8;border-radius:8px;margin-bottom:0.35rem;font-size:0.85rem}
.addon-line-name{color:#854d0e;font-weight:500}
.addon-line-price{color:#a16207;font-weight:700}
.price-box{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:2px solid #bfdbfe;border-radius:14px;padding:1.25rem;text-align:center;margin-bottom:1rem}
.price-label{font-size:0.78rem;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.25rem}
.price-amount{font-size:2.25rem;font-weight:800;color:#1e3a8a;letter-spacing:-0.02em}
.price-note{font-size:0.75rem;color:#64748b;margin-top:0.25rem}

.conversion-cta{text-align:center;padding:1.25rem 1.5rem;background:#f8fafc;border-top:1px solid #e2e8f0}
.upsell-text{font-size:0.9rem;color:#475569;font-weight:500;margin-bottom:0.75rem}
.send-btn{display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;padding:0.9rem;background:linear-gradient(135deg,#059669,#047857);color:#fff;font-size:1rem;font-weight:700;border:none;border-radius:12px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 14px rgba(5,150,105,0.3)}
.send-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(5,150,105,0.35)}
.send-btn svg{width:18px;height:18px}

.signup-overlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;z-index:2000;background:rgba(15,23,42,0.7);backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:1rem}
.signup-modal{background:#fff;border-radius:20px;max-width:420px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,0.25);animation:fadeUp 0.35s ease-out;overflow:hidden;position:relative}
.signup-modal-header{background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:2rem 2rem 1.5rem;text-align:center;color:#fff}
.signup-modal-header h3{font-size:1.2rem;font-weight:700;margin-bottom:0.35rem}
.signup-modal-header p{color:rgba(255,255,255,0.75);font-size:0.85rem}
.signup-modal-body{padding:1.5rem 2rem 2rem}
.signup-field{margin-bottom:1rem}
.signup-field label{display:block;font-size:0.8rem;font-weight:600;color:#475569;margin-bottom:0.35rem;text-transform:uppercase;letter-spacing:0.04em}
.signup-field input{width:100%;padding:0.7rem 0.85rem;border:1.5px solid #e2e8f0;border-radius:10px;font-size:0.95rem;font-family:inherit;color:#0f172a;background:#f8fafc;transition:border-color 0.2s,box-shadow 0.2s}
.signup-field input:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,0.12)}
.signup-submit{display:flex;align-items:center;justify-content:center;gap:0.5rem;width:100%;padding:0.85rem;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:1rem;font-weight:700;border:none;border-radius:12px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 14px rgba(37,99,235,0.3);margin-top:0.5rem}
.signup-submit:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(37,99,235,0.35)}
.signup-submit:disabled{opacity:0.6;cursor:not-allowed;transform:none}
.signup-error{background:#fef2f2;color:#dc2626;border-radius:8px;padding:0.65rem 0.85rem;font-size:0.82rem;font-weight:500;margin-bottom:1rem;display:none}
.signup-close{position:absolute;top:1rem;right:1rem;background:rgba(255,255,255,0.15);border:none;color:#fff;width:28px;height:28px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.1rem;transition:background 0.2s}
.signup-close:hover{background:rgba(255,255,255,0.25)}

.benefits{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:2.5rem 2rem;margin-bottom:2.5rem;box-shadow:0 2px 12px rgba(0,0,0,0.04)}
.benefits h2{font-size:1.4rem;font-weight:700;color:#0f172a;text-align:center;margin-bottom:0.35rem;letter-spacing:-0.01em}
.benefits .benefits-sub{text-align:center;font-size:0.9rem;color:#64748b;margin-bottom:2rem;max-width:500px;margin-left:auto;margin-right:auto}
.benefits-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem}
.benefit-card{display:flex;gap:0.85rem;align-items:flex-start}
.benefit-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.benefit-icon svg{width:20px;height:20px;color:#fff}
.benefit-text h3{font-size:0.95rem;font-weight:700;color:#0f172a;margin-bottom:0.2rem}
.benefit-text p{font-size:0.82rem;color:#64748b;line-height:1.5}

.faq-section{margin-bottom:2.5rem}
.faq-section h2{font-size:1.4rem;font-weight:700;color:#0f172a;margin-bottom:1.25rem}
.faq-item{border-bottom:1px solid #e2e8f0;padding:1rem 0}
.faq-item:last-child{border-bottom:none}
.faq-q{font-size:1rem;font-weight:600;color:#1e293b;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:0.5rem}
.faq-q::after{content:'+';font-size:1.25rem;color:#94a3b8;transition:transform 0.2s;flex-shrink:0}
.faq-item.open .faq-q::after{transform:rotate(45deg)}
.faq-a{color:#475569;font-size:0.92rem;line-height:1.7;max-height:0;overflow:hidden;transition:max-height 0.3s ease,padding 0.3s ease;padding-top:0}
.faq-item.open .faq-a{max-height:500px;padding-top:0.75rem}

.final-cta{background:linear-gradient(135deg,#1e293b,#334155);border-radius:16px;padding:2.5rem 2rem;text-align:center;color:#fff;margin-bottom:2.5rem}
.final-cta h2{font-size:1.35rem;font-weight:700;margin-bottom:0.5rem}
.final-cta p{color:rgba(255,255,255,0.75);font-size:0.95rem;margin-bottom:1.25rem;max-width:480px;margin-left:auto;margin-right:auto}
.final-cta a{display:inline-block;padding:0.75rem 2rem;background:#fff;color:#1e293b;font-weight:700;border-radius:10px;font-size:0.95rem;box-shadow:0 2px 8px rgba(0,0,0,0.15);transition:transform 0.15s}
.final-cta a:hover{transform:translateY(-1px);text-decoration:none}

.seo-footer{background:#1e293b;color:rgba(255,255,255,0.6);text-align:center;padding:2rem 1.5rem;font-size:0.82rem}
.seo-footer a{color:rgba(255,255,255,0.75)}

@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

@media(max-width:640px){
  .hero{padding:3rem 1.25rem 2.5rem}
  .hero h1{font-size:1.75rem}
  .page-body{padding:1.5rem 1.25rem 3rem}
  .calc-grid{grid-template-columns:1fr}
  .proposal-grid{grid-template-columns:1fr}
  .benefits-grid{grid-template-columns:1fr}
  .benefits{padding:2rem 1.5rem}
}
</style>
</head>
<body>

<header class="hero">
  <h1>Generate a Professional Cleaning Quote in 30 Seconds</h1>
  <p class="sub">Create polished cleaning quotes for residential or commercial jobs. Free to use, no signup required.</p>
  <div class="hero-btns">
    <a href="#generator" class="hero-btn-primary" onclick="document.getElementById('generator').scrollIntoView({behavior:'smooth'});return false">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" /></svg>
      Generate Quote
    </a>
    <a href="#example" class="hero-btn-secondary" onclick="showExample();return false">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
      View Example
    </a>
  </div>
  <div class="hero-trust">
    <span><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg> Free to use</span>
    <span><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg> No signup required</span>
    <span><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg> Instant results</span>
  </div>
</header>

<div class="page-body">
  <div class="gen-wrapper" id="generator">
    <div class="free-badge-row">
      <span class="free-badge"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg> Free Tool</span>
    </div>
    <h2>Create Your Cleaning Quote</h2>
    <p class="free-subtext">This tool is completely free. No signup required.</p>

    <form id="quoteForm" onsubmit="return generateQuote(event)">
      <div class="calc-grid">
        <div class="calc-field">
          <label for="serviceType">Service Type</label>
          <select id="serviceType">
            <option value="regular" selected>Regular Cleaning</option>
            <option value="deep_clean">Deep Cleaning</option>
            <option value="move_in_out">Move In / Move Out</option>
          </select>
        </div>
        <div class="calc-field">
          <label for="sqft">Square Footage</label>
          <input type="number" id="sqft" value="1500" min="200" max="20000" step="100">
        </div>
        <div class="calc-field">
          <label for="beds">Bedrooms</label>
          <input type="number" id="beds" value="3" min="1" max="10">
        </div>
        <div class="calc-field">
          <label for="baths">Bathrooms</label>
          <input type="number" id="baths" value="2" min="1" max="10">
        </div>
      </div>

      <div class="addons-section">
        <div class="addons-title">Optional Add-ons</div>
        <div class="addons-grid">
          <label class="addon-chip" id="chip-oven" onclick="toggleAddon('oven')">
            <input type="checkbox" id="addon-oven">
            <span class="addon-check"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></span>
            Inside Oven <span class="addon-price">+$45</span>
          </label>
          <label class="addon-chip" id="chip-fridge" onclick="toggleAddon('fridge')">
            <input type="checkbox" id="addon-fridge">
            <span class="addon-check"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></span>
            Inside Fridge <span class="addon-price">+$40</span>
          </label>
          <label class="addon-chip" id="chip-windows" onclick="toggleAddon('windows')">
            <input type="checkbox" id="addon-windows">
            <span class="addon-check"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></span>
            Interior Windows <span class="addon-price">+$60</span>
          </label>
        </div>
      </div>

      <button type="submit" class="calc-btn">Generate Quote</button>
    </form>

    <div class="quote-result" id="quoteResult">
      <div class="proposal-card">
        <div class="proposal-header">
          <h3>Cleaning Service Proposal</h3>
          <span id="proposalDate"></span>
        </div>
        <div class="proposal-body">
          <div class="proposal-grid">
            <div class="proposal-item"><div class="proposal-item-label">Service Type</div><div class="proposal-item-value" id="rServiceType">--</div></div>
            <div class="proposal-item"><div class="proposal-item-label">Home Size</div><div class="proposal-item-value" id="rSqft">--</div></div>
            <div class="proposal-item"><div class="proposal-item-label">Bedrooms</div><div class="proposal-item-value" id="rBeds">--</div></div>
            <div class="proposal-item"><div class="proposal-item-label">Bathrooms</div><div class="proposal-item-value" id="rBaths">--</div></div>
          </div>
          <div class="scope-title">Scope of Work</div>
          <ul class="scope-list" id="rScope"></ul>
          <div class="addons-summary" id="rAddons"></div>
          <div class="price-box">
            <div class="price-label">Estimated Investment</div>
            <div class="price-amount" id="rPrice">$0</div>
            <div class="price-note">Based on Better tier pricing</div>
          </div>
        </div>
        <div class="conversion-cta">
          <p class="upsell-text">Want to send this as a professional quote to your customer?</p>
          <button class="send-btn" onclick="showSignup()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
            Send This Quote to Your Customer
          </button>
        </div>
      </div>
    </div>
  </div>

  <div class="benefits" id="benefits">
    <h2>Why Cleaning Pros Use QuotePro</h2>
    <p class="benefits-sub">Everything you need to quote faster, close more jobs, and grow your cleaning business.</p>
    <div class="benefits-grid">
      <div class="benefit-card">
        <div class="benefit-icon" style="background:linear-gradient(135deg,#2563eb,#1d4ed8)">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
        </div>
        <div class="benefit-text">
          <h3>Create Quotes Faster</h3>
          <p>Generate professional cleaning quotes in under 30 seconds. No spreadsheets, no guesswork.</p>
        </div>
      </div>
      <div class="benefit-card">
        <div class="benefit-icon" style="background:linear-gradient(135deg,#059669,#047857)">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
        </div>
        <div class="benefit-text">
          <h3>Send Professional Proposals</h3>
          <p>Impress customers with polished, branded proposals that build trust and win more jobs.</p>
        </div>
      </div>
      <div class="benefit-card">
        <div class="benefit-icon" style="background:linear-gradient(135deg,#7c3aed,#6d28d9)">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
        </div>
        <div class="benefit-text">
          <h3>Manage Your Leads</h3>
          <p>Track every lead, follow up automatically, and never lose a potential customer again.</p>
        </div>
      </div>
      <div class="benefit-card">
        <div class="benefit-icon" style="background:linear-gradient(135deg,#ea580c,#c2410c)">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>
        </div>
        <div class="benefit-text">
          <h3>Increase Close Rates</h3>
          <p>Businesses using QuotePro close 35% more jobs with professional proposals and automated follow-ups.</p>
        </div>
      </div>
    </div>
  </div>

  <div class="faq-section">
    <h2>Frequently Asked Questions</h2>
    ${faqHTML}
  </div>

  <div class="final-cta">
    <h2>Ready to Send Professional Quotes?</h2>
    <p>Join thousands of cleaning professionals who quote faster and close more jobs with QuotePro.</p>
    <a href="#generator" onclick="document.getElementById('generator').scrollIntoView({behavior:'smooth'});return false">Generate Your First Quote</a>
  </div>
</div>

<footer class="seo-footer">
  <p>&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} QuotePro &middot; <a href="/privacy">Privacy</a> &middot; <a href="/terms">Terms</a></p>
</footer>

<div class="signup-overlay" id="signupOverlay">
  <div class="signup-modal">
    <button class="signup-close" onclick="hideSignup()">&times;</button>
    <div class="signup-modal-header">
      <h3>Save & Send Your Quote</h3>
      <p>Create a free QuotePro account to send this proposal to your customer.</p>
    </div>
    <div class="signup-modal-body">
      <div class="signup-error" id="signupError"></div>
      <div class="signup-field">
        <label for="signupEmail">Email Address</label>
        <input type="email" id="signupEmail" placeholder="you@company.com" required>
      </div>
      <div class="signup-field">
        <label for="signupPassword">Password</label>
        <input type="password" id="signupPassword" placeholder="At least 6 characters" minlength="6" required>
      </div>
      <button class="signup-submit" id="signupBtn" onclick="submitSignup()">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg>
        Create Account & Send Quote
      </button>
    </div>
    <div style="text-align:center;padding:0 2rem 1.5rem;font-size:0.78rem;color:#94a3b8">
      Already have an account? Your quote will be added to your dashboard.
    </div>
  </div>
</div>

<script>
document.querySelectorAll('.faq-item').forEach(function(item){
  item.querySelector('.faq-q').addEventListener('click',function(){
    item.classList.toggle('open');
  });
});

var _quoteData = {};
var _checkSvg = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>';
var _serviceLabels = {regular:'Regular Cleaning',deep_clean:'Deep Cleaning',move_in_out:'Move In / Move Out'};
var _scopeItems = {
  regular: ['Dust all surfaces and furniture','Vacuum and mop all floors','Clean and sanitize bathrooms','Clean kitchen counters and appliances','Empty trash and replace liners','Wipe mirrors and glass surfaces'],
  deep_clean: ['All standard cleaning tasks','Inside oven, microwave, and refrigerator','Baseboard and wall spot cleaning','Interior window and track detailing','Behind and under furniture','Detailed grout and tile scrubbing','Light fixtures and ceiling fans','Cabinet fronts and door frames'],
  move_in_out: ['Complete deep cleaning of all rooms','Inside all cabinets, drawers, and closets','Inside all appliances','All light fixtures and switch plates','Window sills, tracks, and interior glass','Wall spot cleaning and baseboard detailing','Garage sweeping (if applicable)','Move-in/move-out ready guarantee']
};
var _addonLabels = {oven:'Inside Oven Cleaning',fridge:'Inside Fridge Cleaning',windows:'Interior Window Cleaning'};
var _addonPrices = {oven:45,fridge:40,windows:60};

function toggleAddon(name) {
  var cb = document.getElementById('addon-'+name);
  cb.checked = !cb.checked;
  document.getElementById('chip-'+name).classList.toggle('active', cb.checked);
}

function generateQuote(e) {
  e.preventDefault();
  var st = document.getElementById('serviceType').value;
  var sqft = parseInt(document.getElementById('sqft').value) || 1500;
  var beds = parseInt(document.getElementById('beds').value) || 3;
  var baths = parseInt(document.getElementById('baths').value) || 2;

  var baseRate = 40;
  var baseHours = sqft * 0.01 + beds * 0.25 + baths * 0.5;
  var mult = 1;
  if (st === 'deep_clean') mult = 1.5;
  if (st === 'move_in_out') mult = 2;
  var total = Math.max(baseRate * baseHours * mult, 100 * mult);

  var addOns = {};
  var addonsHtml = '';
  ['oven','fridge','windows'].forEach(function(a){
    if (document.getElementById('addon-'+a).checked) {
      addOns[a] = true;
      total += _addonPrices[a];
      addonsHtml += '<div class="addon-line"><span class="addon-line-name">'+_addonLabels[a]+'</span><span class="addon-line-price">+$'+_addonPrices[a]+'</span></div>';
    }
  });

  var estimated = Math.round(total);

  document.getElementById('rServiceType').textContent = _serviceLabels[st] || st;
  document.getElementById('rSqft').textContent = sqft.toLocaleString() + ' sq ft';
  document.getElementById('rBeds').textContent = beds;
  document.getElementById('rBaths').textContent = baths;
  document.getElementById('proposalDate').textContent = new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  document.getElementById('rPrice').textContent = '$' + estimated;

  var items = _scopeItems[st] || _scopeItems.regular;
  document.getElementById('rScope').innerHTML = items.map(function(t){return '<li>'+_checkSvg+' '+t+'</li>';}).join('');
  document.getElementById('rAddons').innerHTML = addonsHtml;

  _quoteData = {service_type:st, square_footage:sqft, bedrooms:beds, bathrooms:baths, estimated_price:estimated, frequency:'one-time', add_ons:addOns};

  var el = document.getElementById('quoteResult');
  el.style.display = 'block';
  el.style.animation = 'fadeUp 0.5s ease-out';
  el.scrollIntoView({behavior:'smooth',block:'start'});
  return false;
}

function showExample() {
  document.getElementById('serviceType').value = 'deep_clean';
  document.getElementById('sqft').value = '2200';
  document.getElementById('beds').value = '4';
  document.getElementById('baths').value = '3';
  document.getElementById('addon-oven').checked = true;
  document.getElementById('chip-oven').classList.add('active');
  document.getElementById('addon-fridge').checked = true;
  document.getElementById('chip-fridge').classList.add('active');
  generateQuote({preventDefault:function(){}});
}

function showSignup() {
  var ov = document.getElementById('signupOverlay');
  ov.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function hideSignup() {
  document.getElementById('signupOverlay').style.display = 'none';
  document.body.style.overflow = '';
}

document.getElementById('signupOverlay').addEventListener('click', function(e){
  if (e.target === this) hideSignup();
});

function submitSignup() {
  var email = document.getElementById('signupEmail').value.trim();
  var pw = document.getElementById('signupPassword').value;
  var errEl = document.getElementById('signupError');
  var btn = document.getElementById('signupBtn');

  errEl.style.display = 'none';

  if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
    errEl.textContent = 'Please enter a valid email address.';
    errEl.style.display = 'block';
    return;
  }
  if (!pw || pw.length < 6) {
    errEl.textContent = 'Password must be at least 6 characters.';
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating account...';

  fetch('/api/public/calculator-signup', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({email:email, password:pw, quoteData:_quoteData})
  })
  .then(function(r){return r.json().then(function(d){return {ok:r.ok,data:d}})})
  .then(function(res){
    if (!res.ok) {
      errEl.textContent = res.data.message || 'Something went wrong.';
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg> Create Account & Send Quote';
      return;
    }
    window.location.href = res.data.redirectUrl || '/app/dashboard';
  })
  .catch(function(){
    errEl.textContent = 'Network error. Please try again.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg> Create Account & Send Quote';
  });
}
</script>

</body>
</html>`;
}

// server/calculator-engine.ts
function renderField(f) {
  const cls = f.fullWidth ? "calc-field full" : "calc-field";
  if (f.type === "select" && f.options) {
    const opts = f.options.map(
      (o) => `<option value="${o.value}"${o.selected ? " selected" : ""}>${o.label}</option>`
    ).join("");
    return `<div class="${cls}"><label for="${f.id}">${f.label}</label><select id="${f.id}">${opts}</select></div>`;
  }
  const attrs = [
    `type="number"`,
    `id="${f.id}"`,
    `value="${f.defaultValue}"`,
    f.min !== void 0 ? `min="${f.min}"` : "",
    f.max !== void 0 ? `max="${f.max}"` : "",
    f.step !== void 0 ? `step="${f.step}"` : ""
  ].filter(Boolean).join(" ");
  return `<div class="${cls}"><label for="${f.id}">${f.label}</label><input ${attrs}></div>`;
}
function buildCalculatorHTML(def) {
  const fieldsHTML = def.fields.map(renderField).join("\n            ");
  const readVars = def.fields.map((f) => {
    if (f.type === "number") {
      return `var ${f.id}=parseInt(document.getElementById('${f.id}').value)||${f.defaultValue};`;
    }
    return `var ${f.id}=document.getElementById('${f.id}').value;`;
  }).join("\n        ");
  return `
      <h2>${def.calcTitle}</h2>
      <form id="calcForm" onsubmit="return calcPrice(event)">
        <div class="calc-grid">
            ${fieldsHTML}
        </div>
        <button type="submit" class="calc-btn">Calculate Price</button>
      </form>
      <div class="calc-results" id="calcResults">
        <div class="tier-cards">
          <div class="tier-card">
            <div class="tier-name">Good</div>
            <div class="tier-price" id="priceGood">$0</div>
          </div>
          <div class="tier-card popular">
            <div class="tier-name">Better</div>
            <div class="tier-price" id="priceBetter">$0</div>
          </div>
          <div class="tier-card">
            <div class="tier-name">Best</div>
            <div class="tier-price" id="priceBest">$0</div>
          </div>
        </div>
        <p class="calc-note">${def.calcNote}</p>
      </div>
      <script>
      function calcPrice(e){
        e.preventDefault();
        ${readVars}
        ${def.formula}
        document.getElementById('priceGood').innerHTML='$'+good;
        document.getElementById('priceBetter').innerHTML='$'+better;
        document.getElementById('priceBest').innerHTML='$'+best;
        document.getElementById('calcResults').style.display='block';
        document.getElementById('calcResults').style.animation='fadeUp 0.4s ease-out';
        updateQuotePreview({service_type:${def.serviceTypeExpr},square_footage:typeof sqft!=='undefined'?sqft:(typeof squareFootage!=='undefined'?squareFootage:1500),bedrooms:typeof beds!=='undefined'?beds:3,bathrooms:typeof baths!=='undefined'?baths:2,estimated_price:better,frequency:${def.frequencyExpr || "'one-time'"},add_ons:${def.addOnsExpr || "{}"}});
        return false;
      }
      </script>
    `;
}
function renderCalculatorPage(def) {
  return renderSEOPage({
    slug: "calculators/" + def.slug,
    title: def.title,
    metaDescription: def.metaDescription,
    h1: def.h1,
    introParagraph: def.introParagraph,
    sections: def.sections,
    calculatorHTML: buildCalculatorHTML(def),
    faq: def.faq,
    toolkitCTA: def.toolkitCTA || "Explore More Free Cleaning Business Tools",
    scopeItems: def.scopeItems,
    serviceLabel: def.calcTitle
  });
}
var calculators = [
  {
    slug: "house-cleaning-price-calculator",
    title: "House Cleaning Price Calculator | Free Estimate Tool - QuotePro",
    metaDescription: "Calculate house cleaning prices instantly. Free calculator for bedrooms, bathrooms, square footage, service type, and frequency. Get accurate cleaning estimates in seconds.",
    h1: "House Cleaning Price Calculator",
    introParagraph: "Get an instant, data-driven estimate for your next house cleaning job. Adjust property size, service type, and frequency to see real-world pricing for Good, Better, and Best service tiers.",
    calcTitle: "Calculate Your Cleaning Price",
    calcNote: "Estimates based on industry averages. Actual pricing may vary by market and condition.",
    fields: [
      { id: "beds", label: "Bedrooms", type: "number", defaultValue: 3, min: 1, max: 10 },
      { id: "baths", label: "Bathrooms", type: "number", defaultValue: 2, min: 1, max: 10 },
      { id: "sqft", label: "Square Footage", type: "number", defaultValue: 1500, min: 200, max: 2e4, step: 100 },
      { id: "serviceType", label: "Service Type", type: "select", defaultValue: "regular", options: [
        { value: "regular", label: "Regular Cleaning" },
        { value: "deep_clean", label: "Deep Clean" },
        { value: "move_in_out", label: "Move In / Move Out" }
      ] },
      { id: "frequency", label: "Frequency", type: "select", defaultValue: "biweekly", fullWidth: true, options: [
        { value: "one-time", label: "One-Time" },
        { value: "weekly", label: "Weekly" },
        { value: "biweekly", label: "Bi-Weekly", selected: true },
        { value: "monthly", label: "Monthly" }
      ] }
    ],
    formula: `var baseRate=40;var sqftFactor=0.01;var minTicket=100;
        var baseHours=sqft*sqftFactor+beds*0.25+baths*0.5;
        var mult=1;
        if(serviceType==='deep_clean')mult=1.5;
        if(serviceType==='move_in_out')mult=2;
        var total=Math.max(baseRate*baseHours*mult,minTicket);
        var freqDisc=1;
        if(frequency==='weekly')freqDisc=0.8;
        if(frequency==='biweekly')freqDisc=0.85;
        if(frequency==='monthly')freqDisc=0.9;
        total=total*freqDisc;
        var good=Math.round(total*0.8);
        var better=Math.round(total);
        var best=Math.round(total*1.3);`,
    serviceTypeExpr: "serviceType",
    frequencyExpr: "frequency",
    scopeItems: ["Dust all surfaces and furniture", "Vacuum and mop all floors", "Clean and sanitize bathrooms", "Clean kitchen counters and appliances", "Empty trash and replace liners", "Wipe mirrors and glass surfaces"],
    sections: [
      {
        id: "how-to-price",
        heading: "How to Price a House Cleaning Job",
        level: "h2",
        content: `<p>Pricing a house cleaning job accurately is the difference between winning the job and leaving money on the table. The most reliable approach combines square footage, room count, and service complexity into a single formula.</p>
          <p>Here is a proven method used by thousands of cleaning professionals:</p>
          <ol>
            <li><strong>Start with square footage.</strong> This is your baseline. A 1,500 sq ft home takes roughly 2&ndash;3 hours for a standard clean.</li>
            <li><strong>Add room complexity.</strong> Bedrooms add roughly 15 minutes each. Bathrooms add 25&ndash;30 minutes due to fixtures, tile, and detail work.</li>
            <li><strong>Apply a service multiplier.</strong> Deep cleans take 1.5x longer than standard cleans. Move-in/move-out jobs can take 2x or more.</li>
            <li><strong>Factor in frequency.</strong> Weekly clients get the biggest discount (15&ndash;20%) because recurring homes stay cleaner between visits.</li>
            <li><strong>Set a floor price.</strong> Never go below your minimum profitable ticket, typically $100&ndash;150 depending on your market.</li>
          </ol>`
      },
      {
        id: "pricing-mistakes",
        heading: "Common Pricing Mistakes",
        level: "h2",
        content: `<p>Most cleaning businesses undercharge early on. Here are the mistakes to avoid:</p>
          <ul>
            <li><strong>Charging by the hour.</strong> Clients want predictable pricing. Flat-rate quotes based on property specs win more jobs.</li>
            <li><strong>Not accounting for drive time.</strong> Your price should cover travel, setup, and breakdown time &mdash; not just cleaning.</li>
            <li><strong>Skipping the walkthrough.</strong> Every home is different. Pets, clutter level, and flooring types significantly impact time.</li>
            <li><strong>Offering only one price.</strong> Give three tiers (Good / Better / Best). Most clients pick the middle option, which increases your average ticket.</li>
            <li><strong>Forgetting supply costs.</strong> Factor in cleaning products, equipment wear, and replacement costs per job.</li>
          </ul>`
      },
      {
        id: "average-rates",
        heading: "Average House Cleaning Rates in 2025",
        level: "h2",
        content: `<p>Cleaning rates vary by region, but here are typical ranges across the U.S.:</p>
          <ul>
            <li><strong>Standard Cleaning:</strong> $120 &ndash; $250 for a 3-bed, 2-bath home</li>
            <li><strong>Deep Cleaning:</strong> $200 &ndash; $400 for the same property</li>
            <li><strong>Move-In/Move-Out:</strong> $250 &ndash; $500+ depending on condition</li>
            <li><strong>Recurring (bi-weekly):</strong> $100 &ndash; $200 per visit with a 10&ndash;15% frequency discount</li>
          </ul>
          <p>Urban markets like New York, San Francisco, and Los Angeles tend to run 20&ndash;40% higher than national averages. Rural areas may be 10&ndash;20% lower.</p>`
      },
      {
        id: "tips",
        heading: "Practical Tips for Pricing Your Cleaning Jobs",
        level: "h2",
        content: `<p>Use these actionable tips to price with confidence:</p>
          <ul>
            <li><strong>Always quote in person or via photos.</strong> Blind quotes lead to undercharging and unhappy surprises.</li>
            <li><strong>Use Good / Better / Best pricing.</strong> Anchor your preferred option as the middle tier and mark it "Most Popular."</li>
            <li><strong>Raise prices for new clients first.</strong> Test higher rates with leads before adjusting existing clients.</li>
            <li><strong>Track your actual time per job.</strong> After 20&ndash;30 jobs, you will know your real hourly output. Use it to calibrate.</li>
            <li><strong>Include add-ons.</strong> Oven cleaning, fridge interior, laundry, and window interiors are easy upsells that boost your ticket by $25&ndash;$75.</li>
            <li><strong>Communicate value, not just price.</strong> List what is included in each tier. Clients pay more when they understand what they are getting.</li>
          </ul>`
      }
    ],
    faq: [
      { question: "How much should I charge to clean a 3 bedroom house?", answer: "A standard cleaning for a 3-bedroom, 2-bathroom home typically costs between $120 and $200 depending on square footage, condition, and your market. Deep cleans run $200 to $350 for the same property. Use the calculator above for a personalized estimate." },
      { question: "Should I charge by the hour or a flat rate?", answer: "Flat-rate pricing is strongly recommended. Clients prefer predictable pricing, and flat rates protect you from undercharging on difficult jobs. Calculate your flat rate based on estimated hours, then present it as a fixed quote." },
      { question: "How do I calculate square footage pricing?", answer: "A common formula is $0.05 to $0.15 per square foot for standard cleaning, with adjustments for room count and service type. A 2,000 sq ft home at $0.10/sqft would start at $200 before frequency discounts." },
      { question: "What is Good/Better/Best pricing?", answer: "Good/Better/Best is a tiered pricing strategy where you offer three options at different price points. The 'Good' tier is a basic clean, 'Better' includes extras like appliance exteriors and baseboards, and 'Best' is a comprehensive deep clean. Most clients choose the middle option, increasing your average revenue." },
      { question: "How much of a discount should I give for recurring cleaning?", answer: "Industry standard discounts are 15-20% for weekly, 10-15% for bi-weekly, and 5-10% for monthly clients. Recurring clients are worth more long-term because they reduce your marketing costs and provide stable income." },
      { question: "How do I price a deep cleaning vs. a regular cleaning?", answer: "Deep cleans typically cost 1.5x to 2x more than a standard cleaning. They include areas like inside ovens, behind appliances, detailed baseboard cleaning, interior windows, and thorough bathroom sanitization. The first visit for a new client should almost always be a deep clean." },
      { question: "What is a good minimum price for a cleaning job?", answer: "Most successful cleaning businesses set a minimum job price of $100 to $150. This ensures every job covers your travel time, supplies, and overhead costs even for small spaces." }
    ]
  },
  {
    slug: "deep-cleaning-price-calculator",
    title: "Deep Cleaning Price Calculator | Free Estimate Tool - QuotePro",
    metaDescription: "Calculate deep cleaning prices for any home. Instant estimates based on bedrooms, bathrooms, square footage, and condition. Free tool for cleaning professionals.",
    h1: "Deep Cleaning Price Calculator",
    introParagraph: "Estimate deep cleaning prices accurately with this free calculator. Deep cleans require more time, supplies, and attention to detail than standard cleanings. Get tiered pricing instantly.",
    calcTitle: "Calculate Your Deep Cleaning Price",
    calcNote: "Deep clean estimates. Includes inside appliances, baseboards, and detail work.",
    fields: [
      { id: "beds", label: "Bedrooms", type: "number", defaultValue: 3, min: 1, max: 10 },
      { id: "baths", label: "Bathrooms", type: "number", defaultValue: 2, min: 1, max: 10 },
      { id: "sqft", label: "Square Footage", type: "number", defaultValue: 1500, min: 200, max: 2e4, step: 100 },
      { id: "condition", label: "Home Condition", type: "select", defaultValue: "average", fullWidth: true, options: [
        { value: "maintained", label: "Well Maintained" },
        { value: "average", label: "Average", selected: true },
        { value: "neglected", label: "Neglected (3+ months)" }
      ] }
    ],
    formula: `var baseRate=40;var sqftFactor=0.01;var minTicket=100;
        var baseHours=sqft*sqftFactor+beds*0.25+baths*0.5;
        var condMult=1.5;
        if(condition==='maintained')condMult=1.4;
        if(condition==='neglected')condMult=1.85;
        var total=Math.max(baseRate*baseHours*condMult,minTicket*1.5);
        var good=Math.round(total*0.8);
        var better=Math.round(total);
        var best=Math.round(total*1.3);`,
    serviceTypeExpr: "'deep_clean'",
    scopeItems: ["All standard cleaning tasks", "Inside oven, microwave, and refrigerator", "Baseboard and wall spot cleaning", "Interior window and track detailing", "Behind and under furniture", "Detailed grout and tile scrubbing", "Light fixtures and ceiling fans", "Cabinet fronts and door frames"],
    sections: [
      {
        id: "what-is-deep-clean",
        heading: "What Is a Deep Cleaning?",
        level: "h2",
        content: `<p>A deep cleaning goes beyond surface-level maintenance. It targets built-up grime, neglected areas, and details that standard cleanings skip. Most cleaning professionals charge 1.5x to 2x more for a deep clean compared to a regular cleaning.</p>
          <p>Typical deep cleaning tasks include:</p>
          <ul><li>Inside oven, microwave, and refrigerator</li><li>Baseboard cleaning and wall spot treatment</li><li>Interior window cleaning and track detailing</li><li>Shower/tub deep scrub and grout cleaning</li><li>Behind and under furniture and appliances</li><li>Light fixture and ceiling fan detailing</li><li>Cabinet fronts, door frames, and switch plates</li></ul>`
      },
      {
        id: "pricing-deep-clean",
        heading: "How to Price a Deep Cleaning Job",
        level: "h2",
        content: `<p>The best approach to pricing a deep clean is to start with your standard clean price and apply a multiplier:</p>
          <ol><li><strong>Calculate your standard clean rate</strong> using square footage, room count, and your hourly base rate.</li><li><strong>Apply a 1.5x multiplier</strong> for a standard deep clean.</li><li><strong>Adjust for condition.</strong> Homes not cleaned in months may warrant a 1.75x or 2x multiplier.</li><li><strong>Add specific extras.</strong> Charge separately for inside-fridge, inside-oven, or window cleaning if they are not standard deep clean inclusions.</li></ol>
          <p>A 3-bedroom, 2-bathroom home that costs $150 for a standard clean would price at $225&ndash;$300 for a deep clean.</p>`
      },
      {
        id: "when-to-deep-clean",
        heading: "When to Recommend a Deep Clean",
        level: "h2",
        content: `<p>Smart cleaning businesses use deep cleans strategically to maximize revenue and set client expectations:</p>
          <ul><li><strong>First visit for new clients.</strong> Always start with a deep clean to bring the home up to your standard.</li><li><strong>Seasonal transitions.</strong> Offer "spring deep cleans" or "holiday prep cleans" as upsell opportunities.</li><li><strong>Move-in / move-out.</strong> These are essentially deep cleans with higher expectations for detail.</li><li><strong>Quarterly maintenance.</strong> Recurring clients benefit from a quarterly deep clean add-on.</li></ul>`
      },
      {
        id: "tips",
        heading: "Tips for Quoting Deep Cleans Profitably",
        level: "h2",
        content: `<p>Follow these tips to price deep cleans without undercharging:</p>
          <ul><li><strong>Always do a walkthrough or request photos.</strong></li><li><strong>Itemize what is included.</strong> Clients will pay more when they see the detailed list.</li><li><strong>Use the deep clean as a gateway.</strong> Convert clients to a recurring plan at the standard rate.</li><li><strong>Set time expectations.</strong> Tell clients a deep clean takes 4&ndash;6 hours for a typical 3-bed home.</li><li><strong>Price by value, not just time.</strong> A deep clean transforms a home. Charge accordingly.</li></ul>`
      }
    ],
    faq: [
      { question: "How much does a deep cleaning cost?", answer: "A deep cleaning for a 3-bedroom, 2-bathroom home typically costs between $200 and $400 depending on square footage and condition. Neglected homes may cost more due to extra time and supplies required." },
      { question: "How long does a deep clean take?", answer: "A thorough deep clean takes 4 to 8 hours for a typical 3-bedroom home, depending on condition. Plan for 2 to 3 times longer than a standard cleaning." },
      { question: "What is the difference between a deep clean and regular clean?", answer: "A regular clean covers surfaces, vacuuming, mopping, and bathroom sanitizing. A deep clean adds inside appliances, baseboards, detailed grout work, interior windows, behind furniture, and other neglected areas." },
      { question: "Should I deep clean before starting a recurring schedule?", answer: "Yes. Starting with a deep clean brings the home up to a maintainable standard. Without it, your regular cleans will take longer and yield worse results." },
      { question: "How do I charge for a deep clean vs. move-in/move-out?", answer: "Move-in/move-out cleans are essentially deep cleans with additional expectations for perfection. Price them at 1.75x to 2x your standard rate, compared to 1.5x for a standard deep clean." }
    ]
  },
  {
    slug: "move-in-out-cleaning-calculator",
    title: "Move In/Move Out Cleaning Price Calculator - QuotePro",
    metaDescription: "Calculate move-in and move-out cleaning costs instantly. Free pricing tool based on property size, condition, and extras. Trusted by cleaning professionals.",
    h1: "Move In / Move Out Cleaning Price Calculator",
    introParagraph: "Get instant pricing for move-in and move-out cleaning jobs. These jobs require the highest level of detail and command premium rates. Use our calculator to quote with confidence.",
    calcTitle: "Calculate Your Move-In/Move-Out Price",
    calcNote: "Move-in/move-out estimates. Premium pricing for deposit-level results.",
    fields: [
      { id: "beds", label: "Bedrooms", type: "number", defaultValue: 3, min: 1, max: 10 },
      { id: "baths", label: "Bathrooms", type: "number", defaultValue: 2, min: 1, max: 10 },
      { id: "sqft", label: "Square Footage", type: "number", defaultValue: 1500, min: 200, max: 2e4, step: 100 },
      { id: "extras", label: "Extras", type: "select", defaultValue: "none", fullWidth: true, options: [
        { value: "none", label: "No Extras" },
        { value: "garage", label: "+ Garage Cleaning" },
        { value: "carpets", label: "+ Carpet Treatment" },
        { value: "both", label: "+ Garage & Carpets" }
      ] }
    ],
    formula: `var baseRate=40;var sqftFactor=0.01;var minTicket=100;
        var baseHours=sqft*sqftFactor+beds*0.25+baths*0.5;
        var total=Math.max(baseRate*baseHours*2,minTicket*2);
        if(extras==='garage')total+=75;
        if(extras==='carpets')total+=100;
        if(extras==='both')total+=150;
        var good=Math.round(total*0.85);
        var better=Math.round(total);
        var best=Math.round(total*1.25);`,
    serviceTypeExpr: "'move_in_out'",
    addOnsExpr: `(function(){var a={};if(extras==='garage'){a.garage=true}if(extras==='carpets'){a.carpets=true}if(extras==='both'){a.garage=true;a.carpets=true}return a})()`,
    scopeItems: ["Complete deep cleaning of all rooms", "Inside all cabinets, drawers, and closets", "Inside all appliances", "All light fixtures and switch plates", "Window sills, tracks, and interior glass", "Wall spot cleaning and baseboard detailing", "Garage sweeping (if applicable)", "Move-in/move-out ready guarantee"],
    sections: [
      {
        id: "move-clean-pricing",
        heading: "How to Price Move-In/Move-Out Cleaning",
        level: "h2",
        content: `<p>Move-in/move-out cleaning is the most profitable service type for cleaning businesses. The empty home allows you to reach every surface, and clients (or landlords) expect deposit-level perfection.</p>
          <p>Pricing formula:</p>
          <ol><li><strong>Start with your standard rate</strong> based on property square footage and room count.</li><li><strong>Apply a 2x multiplier.</strong> Move cleans take roughly twice as long as standard cleans.</li><li><strong>Adjust for extras.</strong> Garage cleaning, appliance deep-cleaning, and carpet spot treatment are common add-ons.</li><li><strong>Never discount below 1.75x.</strong> The detail work required makes these jobs significantly more labor-intensive.</li></ol>`
      },
      {
        id: "what-to-include",
        heading: "What to Include in a Move Clean",
        level: "h2",
        content: `<ul><li>All standard and deep clean tasks</li><li>Inside all cabinets, drawers, and closets</li><li>Inside oven, refrigerator, dishwasher, and microwave</li><li>All light fixtures, switch plates, and outlet covers</li><li>Window sills, tracks, and interior glass</li><li>Garage sweeping (if applicable)</li><li>Wall spot cleaning and baseboard detailing</li></ul>`
      },
      {
        id: "tips",
        heading: "Tips for Move-In/Move-Out Jobs",
        level: "h2",
        content: `<ul><li><strong>Get clear expectations in writing.</strong> Property managers often have specific checklists.</li><li><strong>Charge a premium for occupied move-outs.</strong> Cleaning around furniture adds significant time.</li><li><strong>Take before/after photos.</strong> Protect yourself and build your portfolio.</li><li><strong>Offer a guarantee.</strong> A "move-in ready" guarantee builds trust and justifies premium pricing.</li><li><strong>Build relationships with realtors and property managers.</strong> They are the highest-volume source of move clean leads.</li></ul>`
      }
    ],
    faq: [
      { question: "How much does a move-out cleaning cost?", answer: "Move-out cleaning for a 3-bedroom, 2-bathroom home typically costs $300 to $500. This includes inside all cabinets, appliances, and detailed baseboard work." },
      { question: "Is move-in cleaning the same as move-out cleaning?", answer: "Essentially yes. Both require deposit-level attention to detail. Move-in cleans sometimes include less appliance work if the home was recently cleaned, but the scope is generally the same." },
      { question: "How long does a move-out clean take?", answer: "Expect 5 to 10 hours for a typical 3-bedroom home. Move cleans take roughly twice as long as standard cleanings." },
      { question: "Should I charge extra for garage cleaning?", answer: "Yes. Garage cleaning is not a standard inclusion and adds 30 to 60 minutes. Charge $50 to $100 extra depending on the garage size and condition." },
      { question: "How do I get more move-in/move-out clients?", answer: "Partner with local realtors, property management companies, and apartment complexes for the highest-volume, most consistent source of move cleaning jobs." }
    ]
  },
  {
    slug: "office-cleaning-bid-calculator",
    title: "Office Cleaning Bid Calculator | Free Pricing Tool - QuotePro",
    metaDescription: "Calculate commercial office cleaning bids instantly. Free pricing tool based on office size, frequency, and cleaning scope. Win more janitorial contracts.",
    h1: "Office Cleaning Bid Calculator",
    introParagraph: "Calculate competitive office cleaning bids based on square footage, number of offices, restrooms, and cleaning frequency. Get Good/Better/Best pricing tiers to win commercial contracts.",
    calcTitle: "Calculate Your Office Cleaning Bid",
    calcNote: "Commercial cleaning estimates. Pricing based on typical U.S. janitorial rates.",
    fields: [
      { id: "sqft", label: "Office Square Footage", type: "number", defaultValue: 3e3, min: 500, max: 1e5, step: 500 },
      { id: "offices", label: "Number of Offices/Rooms", type: "number", defaultValue: 6, min: 1, max: 50 },
      { id: "restrooms", label: "Restrooms", type: "number", defaultValue: 2, min: 1, max: 20 },
      { id: "frequency", label: "Frequency", type: "select", defaultValue: "3x", fullWidth: true, options: [
        { value: "1x", label: "1x Per Week" },
        { value: "3x", label: "3x Per Week", selected: true },
        { value: "5x", label: "5x Per Week (Nightly)" }
      ] }
    ],
    formula: `var ratePerSqft=0.08;
        var officeRate=12;var restroomRate=25;
        var baseCost=sqft*ratePerSqft+offices*officeRate+restrooms*restroomRate;
        var freqMult=1;
        if(frequency==='3x')freqMult=2.6;
        if(frequency==='5x')freqMult=4.2;
        var monthlyTotal=Math.round(baseCost*freqMult);
        var good=Math.round(monthlyTotal*0.85);
        var better=monthlyTotal;
        var best=Math.round(monthlyTotal*1.3);`,
    serviceTypeExpr: "'regular'",
    frequencyExpr: "'monthly'",
    scopeItems: ["Empty all trash receptacles and replace liners", "Vacuum all carpeted areas", "Mop and sanitize hard floors", "Clean and sanitize all restrooms", "Wipe desks, counters, and common surfaces", "Clean break room and kitchen area", "Dust window sills and ledges", "Spot clean glass and mirrors"],
    sections: [
      {
        id: "how-to-bid",
        heading: "How to Bid on Office Cleaning Jobs",
        level: "h2",
        content: `<p>Bidding on commercial office cleaning contracts requires a different approach than residential pricing. You are typically quoting a monthly rate for a set frequency.</p>
          <ol><li><strong>Measure or confirm square footage.</strong> This is the primary cost driver for commercial cleaning.</li><li><strong>Count restrooms.</strong> Restrooms are the most labor-intensive area in any office and should be priced separately.</li><li><strong>Determine frequency.</strong> Most offices need 3x or 5x per week cleaning. 1x per week is common for small offices.</li><li><strong>Add specialty services.</strong> Window cleaning, carpet extraction, and floor stripping are high-margin add-ons.</li></ol>`
      },
      {
        id: "pricing-factors",
        heading: "Key Pricing Factors for Office Cleaning",
        level: "h2",
        content: `<ul><li><strong>Square footage:</strong> $0.05&ndash;$0.15 per sq ft per visit depending on market</li><li><strong>Restrooms:</strong> $20&ndash;$40 per restroom per visit for full sanitization</li><li><strong>Frequency discount:</strong> Higher frequency contracts command a lower per-visit rate but higher monthly revenue</li><li><strong>After-hours premium:</strong> Most offices require evening or weekend cleaning, which may affect staffing costs</li><li><strong>Supply costs:</strong> Commercial accounts typically expect you to provide all supplies and equipment</li></ul>`
      },
      {
        id: "tips",
        heading: "Tips for Winning Office Cleaning Contracts",
        level: "h2",
        content: `<ul><li><strong>Always do a walkthrough.</strong> Square footage alone does not tell the full story.</li><li><strong>Present a professional proposal.</strong> Office managers compare multiple bids. A polished quote wins.</li><li><strong>Include a scope of work.</strong> Detail exactly what is included at each visit.</li><li><strong>Offer a trial period.</strong> A 30-day trial lowers risk for the client and gets you in the door.</li><li><strong>Build relationships with property managers.</strong> They manage multiple buildings and can send you repeat business.</li></ul>`
      }
    ],
    faq: [
      { question: "How much should I charge to clean an office?", answer: "Office cleaning typically costs $0.05 to $0.15 per square foot per visit. A 5,000 sq ft office cleaned 3x per week would cost $600 to $1,800 per month depending on scope and market." },
      { question: "How do I calculate a janitorial bid?", answer: "Start with square footage times your per-sqft rate, add restroom and specialty charges, multiply by visit frequency, and present as a monthly total. Always do a walkthrough to verify conditions." },
      { question: "What is included in standard office cleaning?", answer: "Standard office cleaning includes trash removal, vacuuming, mopping, restroom sanitization, surface wiping, and break room cleaning. Deep cleaning tasks like carpet extraction and floor waxing are typically priced separately." },
      { question: "Should I charge per visit or monthly for office cleaning?", answer: "Monthly pricing is industry standard for commercial cleaning contracts. It provides predictable revenue for you and predictable costs for the client. Quote a monthly rate based on per-visit costs times frequency." }
    ]
  },
  {
    slug: "carpet-cleaning-price-calculator",
    title: "Carpet Cleaning Price Calculator | Free Estimate Tool - QuotePro",
    metaDescription: "Calculate carpet cleaning prices per room or square foot. Free pricing calculator for residential and commercial carpet cleaning jobs.",
    h1: "Carpet Cleaning Price Calculator",
    introParagraph: "Get instant carpet cleaning price estimates based on the number of rooms, square footage, carpet condition, and cleaning method. Use this calculator to quote carpet cleaning jobs accurately.",
    calcTitle: "Calculate Your Carpet Cleaning Price",
    calcNote: "Carpet cleaning estimates based on industry-standard pricing per room and method.",
    fields: [
      { id: "rooms", label: "Number of Rooms", type: "number", defaultValue: 4, min: 1, max: 20 },
      { id: "sqft", label: "Total Carpet Sq Ft", type: "number", defaultValue: 800, min: 100, max: 1e4, step: 50 },
      { id: "method", label: "Cleaning Method", type: "select", defaultValue: "steam", options: [
        { value: "steam", label: "Hot Water Extraction (Steam)" },
        { value: "dry", label: "Dry Cleaning / Encapsulation" },
        { value: "shampooing", label: "Shampooing" }
      ] },
      { id: "carpetCondition", label: "Carpet Condition", type: "select", defaultValue: "average", fullWidth: true, options: [
        { value: "good", label: "Good (light soiling)" },
        { value: "average", label: "Average", selected: true },
        { value: "heavy", label: "Heavy Soiling / Pet Stains" }
      ] }
    ],
    formula: `var perRoom=45;
        var perSqft=0.25;
        var methodMult=1;
        if(method==='dry')methodMult=0.85;
        if(method==='shampooing')methodMult=1.1;
        var condMult=1;
        if(carpetCondition==='good')condMult=0.85;
        if(carpetCondition==='heavy')condMult=1.4;
        var total=Math.max((rooms*perRoom+sqft*perSqft)*methodMult*condMult,75);
        var good=Math.round(total*0.8);
        var better=Math.round(total);
        var best=Math.round(total*1.3);`,
    serviceTypeExpr: "'regular'",
    scopeItems: ["Pre-treatment of stains and high-traffic areas", "Full carpet cleaning with selected method", "Spot treatment for stubborn stains", "Deodorizing treatment", "Post-cleaning grooming and speed drying", "Furniture moving (light items)"],
    sections: [
      {
        id: "how-to-price",
        heading: "How to Price Carpet Cleaning Jobs",
        level: "h2",
        content: `<p>Carpet cleaning is typically priced per room or per square foot. Most professionals use a per-room model for residential and per-sqft for commercial.</p>
          <ul><li><strong>Per room:</strong> $30&ndash;$75 per room depending on size and condition</li><li><strong>Per square foot:</strong> $0.20&ndash;$0.40 per sq ft for hot water extraction</li><li><strong>Minimum charge:</strong> Most carpet cleaners set a minimum of $75&ndash;$150</li><li><strong>Stain treatment:</strong> Add $15&ndash;$30 per spot for specialty stain removal</li></ul>`
      },
      {
        id: "methods",
        heading: "Carpet Cleaning Methods Compared",
        level: "h2",
        content: `<ul><li><strong>Hot Water Extraction (Steam):</strong> The most thorough method. Uses hot water and cleaning solution injected into carpet fibers. Industry standard for deep cleaning.</li><li><strong>Dry Cleaning / Encapsulation:</strong> Low-moisture method using chemical compounds. Faster drying time. Good for maintenance cleans.</li><li><strong>Shampooing:</strong> Traditional method using foaming detergent. Effective but slower drying. Best for heavily soiled carpets.</li></ul>`
      },
      {
        id: "tips",
        heading: "Tips for Carpet Cleaning Pricing",
        level: "h2",
        content: `<ul><li><strong>Always inspect the carpet first.</strong> Condition dramatically affects time and pricing.</li><li><strong>Charge extra for pet odor and stain treatment.</strong> These require specialized products and extra time.</li><li><strong>Offer maintenance plans.</strong> Quarterly carpet cleaning keeps carpets in good condition and provides recurring revenue.</li><li><strong>Upsell protective treatments.</strong> Scotchgard or similar protectants are high-margin add-ons.</li></ul>`
      }
    ],
    faq: [
      { question: "How much does carpet cleaning cost per room?", answer: "Carpet cleaning costs $30 to $75 per room on average, depending on room size, carpet condition, and cleaning method. Steam cleaning (hot water extraction) is typically at the higher end." },
      { question: "Is steam cleaning or dry cleaning better for carpets?", answer: "Steam cleaning (hot water extraction) provides the deepest clean and is recommended by most carpet manufacturers. Dry cleaning is faster and better for maintenance between deep cleans." },
      { question: "How often should carpets be professionally cleaned?", answer: "Every 12 to 18 months for most homes, or every 6 months for homes with pets, children, or allergies. High-traffic commercial areas may need quarterly cleaning." },
      { question: "Should I charge extra for stairs?", answer: "Yes. Stairs are labor-intensive and should be priced at $2 to $5 per step or $20 to $40 per flight. Always list stairs as a separate line item." }
    ]
  },
  {
    slug: "window-cleaning-price-calculator",
    title: "Window Cleaning Price Calculator | Free Pricing Tool - QuotePro",
    metaDescription: "Calculate window cleaning prices per pane or per window. Free pricing calculator for residential and commercial window washing services.",
    h1: "Window Cleaning Price Calculator",
    introParagraph: "Estimate window cleaning prices based on the number of windows, stories, and cleaning type. Get tiered pricing to quote window washing jobs with confidence.",
    calcTitle: "Calculate Your Window Cleaning Price",
    calcNote: "Window cleaning estimates. Pricing varies by window accessibility and size.",
    fields: [
      { id: "windows", label: "Number of Windows", type: "number", defaultValue: 15, min: 1, max: 100 },
      { id: "stories", label: "Number of Stories", type: "select", defaultValue: "1", options: [
        { value: "1", label: "1 Story" },
        { value: "2", label: "2 Stories" },
        { value: "3", label: "3+ Stories" }
      ] },
      { id: "cleanType", label: "Cleaning Type", type: "select", defaultValue: "both", options: [
        { value: "exterior", label: "Exterior Only" },
        { value: "interior", label: "Interior Only" },
        { value: "both", label: "Interior + Exterior", selected: true }
      ] },
      { id: "screenCleaning", label: "Screen Cleaning", type: "select", defaultValue: "no", fullWidth: true, options: [
        { value: "no", label: "No Screen Cleaning" },
        { value: "yes", label: "Include Screen Cleaning (+$3/window)" }
      ] }
    ],
    formula: `var perWindow=8;
        if(cleanType==='both')perWindow=12;
        if(cleanType==='interior')perWindow=6;
        var storyMult=1;
        if(stories==='2')storyMult=1.5;
        if(stories==='3')storyMult=2;
        var total=windows*perWindow*storyMult;
        if(screenCleaning==='yes')total+=windows*3;
        total=Math.max(total,75);
        var good=Math.round(total*0.85);
        var better=Math.round(total);
        var best=Math.round(total*1.25);`,
    serviceTypeExpr: "'regular'",
    scopeItems: ["Clean all window glass (interior and/or exterior)", "Wipe window frames and sills", "Clean window tracks and channels", "Screen removal and reinstallation", "Spot-free rinse and detailing", "Hard water stain treatment"],
    sections: [
      {
        id: "how-to-price",
        heading: "How to Price Window Cleaning",
        level: "h2",
        content: `<p>Window cleaning is typically priced per pane or per window. Understanding the difference is key to accurate quoting:</p>
          <ul><li><strong>Per window:</strong> $4&ndash;$15 per window depending on size and accessibility</li><li><strong>Per pane:</strong> $2&ndash;$8 per pane for multi-pane windows</li><li><strong>Interior + Exterior:</strong> Roughly 1.5x the price of exterior-only</li><li><strong>Multi-story premium:</strong> Add 50&ndash;100% for second-story and above</li><li><strong>Minimum charge:</strong> Most window cleaners set a minimum of $75&ndash;$150</li></ul>`
      },
      {
        id: "equipment",
        heading: "Equipment and Method Considerations",
        level: "h2",
        content: `<ul><li><strong>Water-fed pole systems:</strong> Allow ground-level cleaning of 2nd and 3rd story windows safely</li><li><strong>Squeegee method:</strong> Traditional technique, best for interior and accessible exterior windows</li><li><strong>Hard water stain removal:</strong> Requires specialty products and commands premium pricing</li><li><strong>Screen cleaning:</strong> Easy upsell at $2&ndash;$5 per screen</li></ul>`
      },
      {
        id: "tips",
        heading: "Tips for Window Cleaning Pricing",
        level: "h2",
        content: `<ul><li><strong>Count windows during the walkthrough.</strong> Never estimate window count over the phone.</li><li><strong>Offer interior + exterior as a package.</strong> Most clients prefer both and the upsell is easy.</li><li><strong>Charge extra for French windows and divided panes.</strong> They take significantly more time.</li><li><strong>Sell recurring plans.</strong> Quarterly or bi-annual window cleaning provides consistent revenue.</li></ul>`
      }
    ],
    faq: [
      { question: "How much does window cleaning cost per window?", answer: "Window cleaning costs $4 to $15 per window for exterior only, and $8 to $20 per window for interior and exterior combined. Multi-story windows cost more due to accessibility challenges." },
      { question: "How often should windows be professionally cleaned?", answer: "Most homes benefit from window cleaning 2 to 4 times per year. Commercial properties may need monthly service, especially storefronts." },
      { question: "Should I charge more for second-story windows?", answer: "Yes. Second-story windows should be priced 50% to 100% higher than ground-level windows due to the additional time, equipment, and safety considerations required." },
      { question: "Is window cleaning profitable?", answer: "Window cleaning has some of the highest margins in the cleaning industry at 50-70% profit margins. Low supply costs and high per-hour earnings make it an excellent add-on or standalone service." }
    ]
  },
  {
    slug: "pressure-washing-price-calculator",
    title: "Pressure Washing Price Calculator | Free Estimate Tool - QuotePro",
    metaDescription: "Calculate pressure washing prices for driveways, decks, siding, and more. Free pricing tool for power washing professionals and homeowners.",
    h1: "Pressure Washing Price Calculator",
    introParagraph: "Get instant pressure washing estimates based on surface type, square footage, and condition. Use tiered pricing to quote power washing jobs accurately and win more bids.",
    calcTitle: "Calculate Your Pressure Washing Price",
    calcNote: "Pressure washing estimates based on average U.S. power washing rates.",
    fields: [
      { id: "sqft", label: "Surface Area (sq ft)", type: "number", defaultValue: 500, min: 50, max: 1e4, step: 50 },
      { id: "surface", label: "Surface Type", type: "select", defaultValue: "driveway", options: [
        { value: "driveway", label: "Driveway / Concrete" },
        { value: "deck", label: "Deck / Patio" },
        { value: "siding", label: "House Siding" },
        { value: "fence", label: "Fence" }
      ] },
      { id: "surfaceCondition", label: "Condition", type: "select", defaultValue: "average", fullWidth: true, options: [
        { value: "light", label: "Light Dirt / Maintenance" },
        { value: "average", label: "Average", selected: true },
        { value: "heavy", label: "Heavy Buildup / Mold" }
      ] }
    ],
    formula: `var rate=0.15;
        if(surface==='deck')rate=0.30;
        if(surface==='siding')rate=0.35;
        if(surface==='fence')rate=0.25;
        var condMult=1;
        if(surfaceCondition==='light')condMult=0.8;
        if(surfaceCondition==='heavy')condMult=1.5;
        var total=Math.max(sqft*rate*condMult,100);
        var good=Math.round(total*0.8);
        var better=Math.round(total);
        var best=Math.round(total*1.35);`,
    serviceTypeExpr: "'regular'",
    scopeItems: ["Surface preparation and pre-treatment", "Pressure washing at appropriate PSI", "Mold and mildew treatment", "Stain spot treatment", "Rinse and debris cleanup", "Post-wash inspection"],
    sections: [
      {
        id: "how-to-price",
        heading: "How to Price Pressure Washing Jobs",
        level: "h2",
        content: `<p>Pressure washing is priced primarily by square footage, with adjustments for surface type and condition:</p>
          <ul><li><strong>Driveways:</strong> $0.08&ndash;$0.20 per sq ft</li><li><strong>Decks:</strong> $0.25&ndash;$0.45 per sq ft (more delicate, requires care)</li><li><strong>House siding:</strong> $0.25&ndash;$0.50 per sq ft</li><li><strong>Fences:</strong> $0.15&ndash;$0.35 per sq ft</li><li><strong>Minimum charge:</strong> $100&ndash;$200 regardless of size</li></ul>`
      },
      {
        id: "considerations",
        heading: "Important Pricing Considerations",
        level: "h2",
        content: `<ul><li><strong>Water access:</strong> If you need to bring water, add $50&ndash;$100 for water hauling</li><li><strong>Chemical treatments:</strong> Soft washing for siding and roofs requires specialty chemicals ($20&ndash;$50 extra)</li><li><strong>Sealing and staining:</strong> Offer as an upsell after pressure washing decks and concrete for $0.50&ndash;$1.50 per sq ft</li><li><strong>Time of year:</strong> Spring is peak season, allowing for premium pricing</li></ul>`
      },
      {
        id: "tips",
        heading: "Tips for Pressure Washing Pricing",
        level: "h2",
        content: `<ul><li><strong>Always visit the property first.</strong> Photos help but cannot capture the actual condition accurately.</li><li><strong>Bundle services.</strong> Offer driveway + sidewalk + patio packages for higher tickets.</li><li><strong>Upsell sealing.</strong> After pressure washing concrete or wood, sealing protects the surface and is a high-margin add-on.</li><li><strong>Account for setup time.</strong> Equipment setup and teardown can add 30&ndash;60 minutes to every job.</li></ul>`
      }
    ],
    faq: [
      { question: "How much does pressure washing cost?", answer: "Pressure washing costs $0.08 to $0.50 per square foot depending on the surface type. A typical driveway costs $100 to $300, while a full house exterior can cost $300 to $600." },
      { question: "Is pressure washing profitable?", answer: "Pressure washing has excellent profit margins of 50-70%. Equipment costs are moderate, and the per-hour earning potential of $75 to $200 makes it one of the most profitable cleaning services." },
      { question: "What is the difference between pressure washing and soft washing?", answer: "Pressure washing uses high-pressure water to clean hard surfaces like concrete. Soft washing uses low pressure with chemical solutions for delicate surfaces like siding and roofs. Many professionals offer both." },
      { question: "Should I charge extra for mold and mildew removal?", answer: "Yes. Heavy mold and mildew require pre-treatment chemicals and extra time. Add 30-50% to your base price for heavily affected surfaces." }
    ]
  },
  {
    slug: "airbnb-cleaning-price-calculator",
    title: "Airbnb & Vacation Rental Cleaning Price Calculator - QuotePro",
    metaDescription: "Calculate Airbnb and vacation rental cleaning prices. Free turnover cleaning pricing tool based on property size, beds, and extras.",
    h1: "Airbnb & Vacation Rental Cleaning Price Calculator",
    introParagraph: "Calculate turnover cleaning prices for Airbnb, VRBO, and vacation rental properties. Turnover cleans require speed, consistency, and attention to detail. Get instant tiered pricing.",
    calcTitle: "Calculate Your Turnover Cleaning Price",
    calcNote: "Airbnb/vacation rental turnover estimates. Pricing includes linen change and restocking.",
    fields: [
      { id: "beds", label: "Bedrooms", type: "number", defaultValue: 2, min: 1, max: 10 },
      { id: "baths", label: "Bathrooms", type: "number", defaultValue: 2, min: 1, max: 10 },
      { id: "sqft", label: "Square Footage", type: "number", defaultValue: 1200, min: 200, max: 1e4, step: 100 },
      { id: "linens", label: "Linen Service", type: "select", defaultValue: "change", fullWidth: true, options: [
        { value: "none", label: "No Linen Service" },
        { value: "change", label: "Strip & Re-make Beds", selected: true },
        { value: "laundry", label: "Full Laundry Service" }
      ] }
    ],
    formula: `var baseRate=45;var sqftFactor=0.012;
        var baseHours=sqft*sqftFactor+beds*0.35+baths*0.45;
        var total=Math.max(baseRate*baseHours,90);
        if(linens==='change')total+=beds*10;
        if(linens==='laundry')total+=beds*25;
        var good=Math.round(total*0.85);
        var better=Math.round(total);
        var best=Math.round(total*1.25);`,
    serviceTypeExpr: "'regular'",
    scopeItems: ["Full property cleaning and sanitization", "Strip and re-make all beds", "Restock toiletries and supplies", "Check for damages and report", "Take photos for host records", "Trash removal and recycling", "Laundry (if included)", "Welcome setup and staging"],
    sections: [
      {
        id: "how-to-price",
        heading: "How to Price Airbnb Turnover Cleans",
        level: "h2",
        content: `<p>Turnover cleaning is unique because speed and consistency matter as much as quality. Guests expect hotel-level cleanliness, and hosts need fast turnarounds between bookings.</p>
          <ol><li><strong>Base your price on bedroom and bathroom count.</strong> These are the most labor-intensive areas in a vacation rental.</li><li><strong>Add linen service.</strong> Bed stripping and remaking adds $8&ndash;$15 per bed. Full laundry adds $20&ndash;$30 per bed.</li><li><strong>Include restocking.</strong> Most hosts provide supplies that need replenishing between guests.</li><li><strong>Factor in inspection time.</strong> Checking for damages and reporting to the host is part of the job.</li></ol>`
      },
      {
        id: "market-rates",
        heading: "Vacation Rental Cleaning Rates",
        level: "h2",
        content: `<ul><li><strong>Studio/1-bed:</strong> $65&ndash;$100 per turnover</li><li><strong>2-bedroom:</strong> $90&ndash;$150 per turnover</li><li><strong>3-bedroom:</strong> $120&ndash;$200 per turnover</li><li><strong>4+ bedroom:</strong> $175&ndash;$300+ per turnover</li><li><strong>Premium for same-day turnover:</strong> Add 25&ndash;50% for tight scheduling windows</li></ul>`
      },
      {
        id: "tips",
        heading: "Tips for Vacation Rental Cleaning",
        level: "h2",
        content: `<ul><li><strong>Create a detailed checklist.</strong> Consistency is critical for maintaining host ratings.</li><li><strong>Offer photo documentation.</strong> Hosts love receiving photos after each clean as proof of quality.</li><li><strong>Negotiate volume pricing.</strong> Hosts with high booking rates provide steady, predictable income.</li><li><strong>Charge for same-day turnovers.</strong> When checkout is at 11am and check-in is at 3pm, your time is premium.</li></ul>`
      }
    ],
    faq: [
      { question: "How much should I charge for Airbnb cleaning?", answer: "Airbnb turnover cleaning typically costs $65 to $200+ depending on property size. Most hosts pass the cleaning fee to guests, so they are willing to pay competitive rates for reliable service." },
      { question: "What is included in a vacation rental turnover clean?", answer: "A turnover clean includes full cleaning of all rooms, bed stripping and remaking, bathroom sanitization, kitchen cleaning, restocking supplies, trash removal, and a damage check." },
      { question: "How long does an Airbnb turnover take?", answer: "A typical 2-bedroom vacation rental takes 1.5 to 2.5 hours for a turnover clean. Larger properties with laundry service can take 3 to 4 hours." },
      { question: "Should I charge Airbnb hosts differently than regular clients?", answer: "Yes. Turnover cleans are faster-paced and require additional tasks like linen service and restocking. Price them as a specialized service, not a discounted regular clean." }
    ]
  },
  {
    slug: "post-construction-cleaning-calculator",
    title: "Post Construction Cleaning Price Calculator - QuotePro",
    metaDescription: "Calculate post-construction cleaning prices based on square footage, construction type, and cleanup phase. Free pricing tool for builders and cleaners.",
    h1: "Post Construction Cleaning Price Calculator",
    introParagraph: "Estimate post-construction cleaning costs based on project size, construction type, and cleanup phase. These are premium jobs that command top rates. Get instant tiered pricing.",
    calcTitle: "Calculate Your Post-Construction Cleaning Price",
    calcNote: "Post-construction estimates. Pricing reflects the labor-intensive nature of construction cleanup.",
    fields: [
      { id: "sqft", label: "Square Footage", type: "number", defaultValue: 2500, min: 500, max: 5e4, step: 500 },
      { id: "constructionType", label: "Construction Type", type: "select", defaultValue: "remodel", options: [
        { value: "new_build", label: "New Construction" },
        { value: "remodel", label: "Remodel / Renovation", selected: true },
        { value: "commercial", label: "Commercial Build-Out" }
      ] },
      { id: "phase", label: "Cleanup Phase", type: "select", defaultValue: "final", fullWidth: true, options: [
        { value: "rough", label: "Rough Clean (remove debris)" },
        { value: "final", label: "Final Clean (detail work)", selected: true },
        { value: "touchup", label: "Touch-Up Clean (punch list)" }
      ] }
    ],
    formula: `var rate=0.15;
        if(constructionType==='new_build')rate=0.20;
        if(constructionType==='commercial')rate=0.18;
        var phaseMult=1;
        if(phase==='rough')phaseMult=0.6;
        if(phase==='touchup')phaseMult=0.4;
        var total=Math.max(sqft*rate*phaseMult,200);
        var good=Math.round(total*0.85);
        var better=Math.round(total);
        var best=Math.round(total*1.3);`,
    serviceTypeExpr: "'deep_clean'",
    scopeItems: ["Remove construction dust from all surfaces", "Clean all windows and glass", "Vacuum and mop all floors", "Detail clean all fixtures and hardware", "Clean inside cabinets and drawers", "Remove stickers, labels, and protective film", "Sanitize bathrooms and kitchen", "Final inspection walkthrough"],
    sections: [
      {
        id: "how-to-price",
        heading: "How to Price Post-Construction Cleaning",
        level: "h2",
        content: `<p>Post-construction cleaning is one of the highest-paying cleaning services. It is also one of the most demanding. Pricing is based on square footage and the phase of cleanup:</p>
          <ol><li><strong>Rough Clean:</strong> $0.05&ndash;$0.15 per sq ft. Removing large debris, sweeping, and initial cleanup after framing and drywall.</li><li><strong>Final Clean:</strong> $0.15&ndash;$0.30 per sq ft. Detailed cleaning of every surface, window, fixture, and floor.</li><li><strong>Touch-Up Clean:</strong> $0.05&ndash;$0.10 per sq ft. Quick clean before final walkthrough or occupancy.</li></ol>`
      },
      {
        id: "what-to-include",
        heading: "What Post-Construction Cleaning Includes",
        level: "h2",
        content: `<ul><li>Dust removal from every surface including ceilings, walls, and floors</li><li>Window cleaning including sticker and film removal</li><li>All fixture and hardware detailing</li><li>Inside all cabinets, drawers, and closets</li><li>Floor cleaning (vacuum, mop, or buff depending on floor type)</li><li>Bathroom and kitchen deep cleaning</li><li>Removal of paint spots and adhesive residue</li></ul>`
      },
      {
        id: "tips",
        heading: "Tips for Post-Construction Jobs",
        level: "h2",
        content: `<ul><li><strong>Always quote after a walkthrough.</strong> Construction sites vary dramatically in cleanup needs.</li><li><strong>Get clear scope in writing.</strong> Define exactly what is included to avoid scope creep.</li><li><strong>Build relationships with builders.</strong> General contractors are the best source of repeat post-construction work.</li><li><strong>Require payment before or at completion.</strong> Construction cleanup is expensive to perform, so do not extend credit.</li></ul>`
      }
    ],
    faq: [
      { question: "How much does post-construction cleaning cost?", answer: "Post-construction cleaning costs $0.10 to $0.30 per square foot for the final clean. A 2,500 sq ft home would cost $250 to $750. Rough cleaning and touch-up cleans cost less." },
      { question: "How long does post-construction cleaning take?", answer: "Final cleaning takes 6 to 12 hours for a typical home. Larger commercial projects may take multiple days with a team. Rough cleaning is faster at 2 to 4 hours." },
      { question: "What is the difference between rough and final clean?", answer: "Rough cleaning removes debris and does initial sweeping after framing and drywall. Final cleaning is a detailed, thorough cleaning of every surface before occupancy." },
      { question: "Is post-construction cleaning profitable?", answer: "Yes. Post-construction cleaning commands premium rates of $40 to $80+ per hour. The work is physically demanding but margins are typically 40-60%." }
    ]
  },
  {
    slug: "janitorial-bidding-calculator",
    title: "Janitorial Bidding Calculator | Commercial Cleaning Bid Tool - QuotePro",
    metaDescription: "Calculate janitorial service bids for commercial buildings. Free bidding calculator based on building size, service frequency, and scope of work.",
    h1: "Janitorial Bidding Calculator",
    introParagraph: "Build competitive janitorial bids for commercial properties. Enter building details and cleaning frequency to get a monthly pricing estimate with Good/Better/Best tiers for your proposals.",
    calcTitle: "Calculate Your Janitorial Bid",
    calcNote: "Janitorial bid estimates for commercial contracts. Monthly pricing shown.",
    fields: [
      { id: "sqft", label: "Building Square Footage", type: "number", defaultValue: 1e4, min: 1e3, max: 5e5, step: 1e3 },
      { id: "restrooms", label: "Number of Restrooms", type: "number", defaultValue: 4, min: 1, max: 50 },
      { id: "frequency", label: "Cleaning Frequency", type: "select", defaultValue: "5x", options: [
        { value: "2x", label: "2x Per Week" },
        { value: "3x", label: "3x Per Week" },
        { value: "5x", label: "5x Per Week (Nightly)", selected: true },
        { value: "7x", label: "7x Per Week (Daily)" }
      ] },
      { id: "scope", label: "Service Scope", type: "select", defaultValue: "standard", fullWidth: true, options: [
        { value: "basic", label: "Basic (trash, vacuum, restrooms)" },
        { value: "standard", label: "Standard (+ mopping, dusting)", selected: true },
        { value: "full", label: "Full Service (+ windows, floors, deep clean)" }
      ] }
    ],
    formula: `var ratePerSqft=0.06;
        if(scope==='basic')ratePerSqft=0.04;
        if(scope==='full')ratePerSqft=0.10;
        var restroomCost=restrooms*30;
        var visitCost=sqft*ratePerSqft+restroomCost;
        var visitsPerMonth=8;
        if(frequency==='3x')visitsPerMonth=13;
        if(frequency==='5x')visitsPerMonth=22;
        if(frequency==='7x')visitsPerMonth=30;
        var total=Math.round(visitCost*visitsPerMonth);
        var good=Math.round(total*0.85);
        var better=total;
        var best=Math.round(total*1.3);`,
    serviceTypeExpr: "'regular'",
    frequencyExpr: "'monthly'",
    scopeItems: ["Empty all trash receptacles", "Vacuum carpeted areas and rugs", "Mop and sanitize hard floors", "Clean and restock all restrooms", "Wipe and sanitize all high-touch surfaces", "Clean break rooms and kitchen areas", "Dust surfaces, vents, and ledges", "Lock up and security check"],
    sections: [
      {
        id: "how-to-bid",
        heading: "How to Bid on Janitorial Contracts",
        level: "h2",
        content: `<p>Janitorial bidding requires understanding the full scope of the building and client expectations:</p>
          <ol><li><strong>Walk the building.</strong> Measure or verify square footage. Note floor types, restroom count, and special areas.</li><li><strong>Calculate per-visit cost.</strong> Use your rate per square foot plus restroom and specialty charges.</li><li><strong>Multiply by frequency.</strong> Present monthly pricing for consistency.</li><li><strong>Include supply costs.</strong> Most commercial contracts expect you to supply all cleaning products and equipment.</li><li><strong>Add margin.</strong> Target 30&ndash;50% gross margin to cover overhead and profit.</li></ol>`
      },
      {
        id: "scope-levels",
        heading: "Understanding Service Scope Levels",
        level: "h2",
        content: `<ul><li><strong>Basic:</strong> Trash removal, vacuuming, and restroom cleaning. Suitable for small offices with low traffic.</li><li><strong>Standard:</strong> Basic plus mopping, surface wiping, and dust removal. The most common scope for mid-size offices.</li><li><strong>Full Service:</strong> Standard plus window cleaning, floor care (stripping/waxing), deep cleaning, and specialty services.</li></ul>`
      },
      {
        id: "tips",
        heading: "Tips for Winning Janitorial Contracts",
        level: "h2",
        content: `<ul><li><strong>Present a professional proposal.</strong> Decision-makers compare multiple bids. Quality presentation wins.</li><li><strong>Offer a trial month.</strong> Reduce risk for the client and demonstrate your quality.</li><li><strong>Include a detailed scope of work.</strong> List every task performed at each visit.</li><li><strong>Highlight your insurance and certifications.</strong> Commercial clients require proof of liability coverage.</li><li><strong>Follow up persistently.</strong> Many contracts are awarded 30&ndash;90 days after bidding.</li></ul>`
      }
    ],
    faq: [
      { question: "How do I calculate a janitorial bid?", answer: "Calculate per-visit cost using square footage rate ($0.04-$0.10/sqft) plus restroom charges ($25-$40 each), multiply by monthly visits, and add your margin. A 10,000 sqft building cleaned 5x/week typically costs $2,000-$5,000 per month." },
      { question: "What profit margin should I target for janitorial contracts?", answer: "Target 30-50% gross margin on janitorial contracts. This covers labor, supplies, equipment depreciation, insurance, and overhead while leaving a healthy profit." },
      { question: "How do I price restroom cleaning separately?", answer: "Restroom cleaning should be priced at $25 to $40 per restroom per visit. Restrooms require specialized sanitization and are the most labor-intensive area in commercial cleaning." },
      { question: "What is included in a standard janitorial service?", answer: "Standard janitorial includes trash removal, vacuuming, mopping, restroom sanitization, surface wiping, dust removal, and break room cleaning. Floor care and window cleaning are typically additional services." }
    ]
  }
];
var calculatorMap = /* @__PURE__ */ new Map();
for (const calc of calculators) {
  calculatorMap.set(calc.slug, calc);
}
function getCalculatorBySlug(slug) {
  return calculatorMap.get(slug);
}
function renderCalculatorIndex() {
  const baseUrl = getBaseUrl2();
  const calcCards = calculators.map((c) => `
    <a href="/calculators/${c.slug}" class="calc-index-card">
      <span class="card-free-badge">Free</span>
      <h3>${c.h1}</h3>
      <p>${c.metaDescription.substring(0, 120)}...</p>
      <span class="calc-index-link">Open Calculator &rarr;</span>
    </a>`).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Free Cleaning Business Calculators | Pricing Tools - QuotePro</title>
<meta name="description" content="Free pricing calculators for cleaning businesses. House cleaning, deep cleaning, carpet cleaning, window cleaning, pressure washing, office cleaning, and more. Get instant estimates.">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${baseUrl}/calculators">
<meta property="og:title" content="Free Cleaning Business Calculators - QuotePro">
<meta property="og:description" content="The largest library of free pricing calculators for cleaning professionals. Get instant estimates for any cleaning service.">
<meta property="og:type" content="website">
<meta property="og:url" content="${baseUrl}/calculators">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',system-ui,-apple-system,sans-serif;color:#0f172a;background:#f8fafc;-webkit-font-smoothing:antialiased;line-height:1.7}
a{color:inherit;text-decoration:none}
.idx-header{background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#3b82f6 100%);color:#fff;padding:3rem 1.5rem 2.5rem;text-align:center}
.idx-header h1{font-size:2.25rem;font-weight:800;line-height:1.2;margin-bottom:0.75rem;letter-spacing:-0.02em}
.idx-header p{max-width:640px;margin:0 auto;font-size:1.05rem;color:rgba(255,255,255,0.88);line-height:1.7}
.idx-header .count{display:inline-block;background:rgba(255,255,255,0.15);padding:0.25rem 0.85rem;border-radius:20px;font-size:0.82rem;font-weight:600;margin-top:0.75rem}
.idx-body{max-width:900px;margin:0 auto;padding:2rem 1.5rem 4rem}
.idx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.25rem}
.calc-index-card{display:block;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:1.5rem;transition:all 0.2s;box-shadow:0 2px 8px rgba(0,0,0,0.04);position:relative}
.calc-index-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.08);border-color:#bfdbfe;text-decoration:none}
.card-free-badge{display:inline-block;padding:0.15rem 0.55rem;background:#ecfdf5;color:#059669;font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;border-radius:6px;border:1px solid #a7f3d0;margin-bottom:0.5rem}
.calc-index-card h3{font-size:1rem;font-weight:700;color:#0f172a;margin-bottom:0.5rem}
.calc-index-card p{font-size:0.85rem;color:#64748b;margin-bottom:0.75rem;line-height:1.5}
.calc-index-link{font-size:0.82rem;font-weight:600;color:#2563eb}
.toolkit-cta{background:linear-gradient(135deg,#1e293b,#334155);border-radius:16px;padding:2.5rem 2rem;text-align:center;color:#fff;margin:2.5rem 0}
.toolkit-cta h2{font-size:1.35rem;font-weight:700;margin-bottom:0.5rem}
.toolkit-cta p{color:rgba(255,255,255,0.75);font-size:0.95rem;margin-bottom:1.25rem;max-width:480px;margin-left:auto;margin-right:auto}
.toolkit-cta a{display:inline-block;padding:0.75rem 2rem;background:#fff;color:#1e293b;font-weight:700;border-radius:10px;font-size:0.95rem;box-shadow:0 2px 8px rgba(0,0,0,0.15);transition:transform 0.15s}
.toolkit-cta a:hover{transform:translateY(-1px);text-decoration:none}
.seo-footer{background:#1e293b;color:rgba(255,255,255,0.6);text-align:center;padding:2rem 1.5rem;font-size:0.82rem}
.seo-footer a{color:rgba(255,255,255,0.75)}
@media(max-width:640px){.idx-header{padding:2rem 1.25rem}.idx-header h1{font-size:1.65rem}.idx-body{padding:1.5rem 1.25rem 3rem}.idx-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<header class="idx-header">
  <h1>Free Cleaning Business Calculators</h1>
  <p>The largest library of free pricing calculators for cleaning professionals. Get instant estimates for any cleaning service.</p>
  <span class="count">${calculators.length} Free Calculators</span>
</header>
<div class="idx-body">
  <div class="idx-grid">
    ${calcCards}
  </div>
  <div class="toolkit-cta">
    <h2>Explore More Free Tools</h2>
    <p>Get templates, scripts, and growth tools built for cleaning business owners.</p>
    <a href="/app/toolkit">Browse the Cleaning Business Toolkit</a>
  </div>
</div>
<footer class="seo-footer">
  <p>&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} QuotePro &middot; <a href="/privacy">Privacy</a> &middot; <a href="/terms">Terms</a></p>
</footer>
</body>
</html>`;
}
function getBaseUrl2() {
  const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPL_SLUG + ".replit.app";
  return `https://${domain}`;
}

// server/jobber-client.ts
init_db();
function parseAddressString(addr) {
  if (!addr || !addr.trim()) return {};
  const parts = addr.split(",").map((s) => s.trim());
  if (parts.length >= 3) {
    const street = parts[0];
    const city = parts[1];
    const stateZip = parts[2].trim().split(/\s+/);
    const province = stateZip[0] || "";
    const postalCode = stateZip[1] || "";
    const country = parts[3] || "US";
    return { street, city, province, postalCode, country };
  }
  if (parts.length === 2) {
    return { street: parts[0], city: parts[1], country: "US" };
  }
  return { street: addr, country: "US" };
}
var JOBBER_AUTH_URL = "https://api.getjobber.com/api/oauth/authorize";
var JOBBER_TOKEN_URL = "https://api.getjobber.com/api/oauth/token";
var JOBBER_GRAPHQL_URL = "https://api.getjobber.com/api/graphql";
var JOBBER_GRAPHQL_VERSION = "2023-11-15";
async function logJobberSync(userId, quoteId, action, requestSummary, responseSummary, status, errorMessage) {
  try {
    await pool.query(
      `INSERT INTO jobber_sync_log (id, user_id, quote_id, action, request_summary, response_summary, status, error_message, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())`,
      [userId, quoteId, action, requestSummary || null, responseSummary || null, status, errorMessage || null]
    );
  } catch (e) {
    console.error("Failed to log Jobber sync:", e);
  }
}
var JOBBER_SCOPES = [
  "read_clients",
  "write_clients",
  "read_jobs",
  "write_jobs",
  "read_invoices",
  "write_invoices",
  "read_quotes",
  "write_quotes"
].join(" ");
function buildJobberAuthUrl(redirectUri, state) {
  const clientId = process.env.JOBBER_CLIENT_ID;
  if (!clientId) throw new Error("JOBBER_CLIENT_ID is not configured");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: JOBBER_SCOPES,
    state
  });
  return `${JOBBER_AUTH_URL}?${params.toString()}`;
}
async function exchangeJobberCode(code, redirectUri) {
  const clientId = process.env.JOBBER_CLIENT_ID;
  const clientSecret = process.env.JOBBER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Jobber token exchange: missing credentials", { hasClientId: !!clientId, hasClientSecret: !!clientSecret });
    throw new Error(`Jobber credentials not configured (id: ${!!clientId}, secret: ${!!clientSecret})`);
  }
  const response = await fetch(JOBBER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    }).toString()
  });
  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Jobber token exchange failed (${response.status}): ${errBody}`);
  }
  const tokens = await response.json();
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in || 3600
  };
}
var JobberClient = class {
  userId;
  connection = null;
  constructor(userId) {
    this.userId = userId;
  }
  async loadConnection() {
    const result = await pool.query(
      `SELECT id, user_id as "userId",
              access_token_encrypted as "accessTokenEncrypted",
              refresh_token_encrypted as "refreshTokenEncrypted",
              access_token_expires_at as "accessTokenExpiresAt",
              status,
              auto_create_job_on_quote_accept as "autoCreateJobOnQuoteAccept"
       FROM jobber_connections WHERE user_id = $1 AND status != 'disconnected'`,
      [this.userId]
    );
    this.connection = result.rows[0] || null;
    return this.connection;
  }
  getConnection() {
    return this.connection;
  }
  async ensureValidToken() {
    if (!this.connection) throw new Error("No Jobber connection loaded");
    const now = /* @__PURE__ */ new Date();
    const expiresAt = new Date(this.connection.accessTokenExpiresAt);
    const fiveMinFromNow = new Date(now.getTime() + 5 * 60 * 1e3);
    if (expiresAt > fiveMinFromNow) {
      return decryptToken(this.connection.accessTokenEncrypted);
    }
    const clientId = process.env.JOBBER_CLIENT_ID;
    const clientSecret = process.env.JOBBER_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("JOBBER_CLIENT_ID and JOBBER_CLIENT_SECRET must be set");
    }
    const refreshToken = decryptToken(this.connection.refreshTokenEncrypted);
    const response = await fetch(JOBBER_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret
      }).toString()
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Jobber token refresh failed:", response.status, errorBody);
      await pool.query(
        `UPDATE jobber_connections SET status = 'needs_reauth', last_error = $1 WHERE user_id = $2`,
        [`Token refresh failed: ${response.status}`, this.userId]
      );
      await logJobberSync(this.userId, null, "refresh", {}, { status: response.status }, "failed", "Token refresh failed");
      throw new Error("Jobber token refresh failed - user needs to reconnect");
    }
    const tokens = await response.json();
    const newAccessToken = tokens.access_token;
    const newRefreshToken = tokens.refresh_token || refreshToken;
    const expiresIn = tokens.expires_in || 3600;
    const newExpiresAt = new Date(now.getTime() + expiresIn * 1e3);
    await pool.query(
      `UPDATE jobber_connections
       SET access_token_encrypted = $1,
           refresh_token_encrypted = $2,
           access_token_expires_at = $3,
           status = 'connected',
           last_error = NULL
       WHERE user_id = $4`,
      [encryptToken(newAccessToken), encryptToken(newRefreshToken), newExpiresAt, this.userId]
    );
    this.connection.accessTokenEncrypted = encryptToken(newAccessToken);
    this.connection.refreshTokenEncrypted = encryptToken(newRefreshToken);
    this.connection.accessTokenExpiresAt = newExpiresAt;
    this.connection.status = "connected";
    await logJobberSync(this.userId, null, "refresh", {}, { success: true }, "ok");
    return newAccessToken;
  }
  async graphql(query, variables, retryCount = 0) {
    const maxRetries = 2;
    const accessToken = await this.ensureValidToken();
    const response = await fetch(JOBBER_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-JOBBER-GRAPHQL-VERSION": JOBBER_GRAPHQL_VERSION
      },
      body: JSON.stringify({ query, variables })
    });
    if (response.status === 401 && retryCount === 0) {
      this.connection.accessTokenExpiresAt = /* @__PURE__ */ new Date(0);
      return this.graphql(query, variables, retryCount + 1);
    }
    if ((response.status === 429 || response.status >= 500) && retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1e3 + Math.random() * 500;
      await new Promise((resolve2) => setTimeout(resolve2, delay));
      return this.graphql(query, variables, retryCount + 1);
    }
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Jobber GraphQL error ${response.status}: ${errText}`);
    }
    const data = await response.json();
    if (data.errors && data.errors.length > 0) {
      throw new Error(`Jobber GraphQL errors: ${data.errors.map((e) => e.message).join(", ")}`);
    }
    return data.data;
  }
  async createClient(input) {
    const mutation = `
      mutation CreateClient($input: ClientCreateInput!) {
        clientCreate(input: $input) {
          client {
            id
            firstName
            lastName
          }
          userErrors {
            message
            path
          }
        }
      }
    `;
    const clientInput = {
      firstName: input.firstName,
      lastName: input.lastName
    };
    if (input.companyName) clientInput.companyName = input.companyName;
    if (input.email) {
      clientInput.emails = [{
        description: "MAIN",
        primary: true,
        address: input.email
      }];
    }
    if (input.phone) {
      clientInput.phones = [{
        description: "MAIN",
        primary: true,
        number: input.phone
      }];
    }
    if (input.address) {
      clientInput.billingAddress = {
        street1: input.address.street1 || "",
        city: input.address.city || "",
        province: input.address.province || "",
        postalCode: input.address.postalCode || "",
        country: input.address.country || "US"
      };
      if (input.address.street2) {
        clientInput.billingAddress.street2 = input.address.street2;
      }
    }
    const data = await this.graphql(mutation, { input: clientInput });
    const result = data.clientCreate;
    if (result.userErrors && result.userErrors.length > 0) {
      throw new Error(`Jobber client creation failed: ${result.userErrors.map((e) => e.message).join(", ")}`);
    }
    return result.client;
  }
  async getClientPropertyId(clientId) {
    const query = `
      query GetClientProperties($clientId: ID!) {
        client(id: $clientId) {
          properties {
            nodes { id }
          }
        }
      }
    `;
    try {
      const data = await this.graphql(query, { clientId });
      const nodes = data?.client?.properties?.nodes || [];
      return nodes.length > 0 ? nodes[0].id : null;
    } catch {
      return null;
    }
  }
  async createProperty(clientId, address) {
    const esc = (s) => (s || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const street = esc(address.street || "N/A");
    const city = esc(address.city || "");
    const province = esc(address.province || "");
    const postalCode = esc(address.postalCode || "");
    const country = esc(address.country || "US");
    const addrBlock = `address: { street1: "${street}", city: "${city}", province: "${province}", postalCode: "${postalCode}", country: "${country}" }`;
    const attempts = [
      // 1. input.properties = list of PropertyAttributes (most likely based on naming)
      [`mutation { propertyCreate(clientId: "${clientId}", input: { properties: [{ ${addrBlock} }] }) { properties { id } userErrors { message path } } }`, "input.properties[{address}]"],
      // 2. input directly is list of PropertyAttributes
      [`mutation { propertyCreate(clientId: "${clientId}", input: [{ ${addrBlock} }]) { properties { id } userErrors { message path } } }`, "input=[{address}]"],
      // 3. input.property = single PropertyAttributes (singular field name)
      [`mutation { propertyCreate(clientId: "${clientId}", input: { property: { ${addrBlock} } }) { properties { id } userErrors { message path } } }`, "input.property{address}"],
      // 4. input.serviceAddress = AddressAttributes directly (alternate field name)
      [`mutation { propertyCreate(clientId: "${clientId}", input: { serviceAddress: { street1: "${street}", city: "${city}", province: "${province}", postalCode: "${postalCode}", country: "${country}" } }) { properties { id } userErrors { message path } } }`, "input.serviceAddress"],
      // 5. Empty input — Jobber may create property from client billing address
      [`mutation { propertyCreate(clientId: "${clientId}", input: {}) { properties { id } userErrors { message path } } }`, "input={}"]
    ];
    for (let i = 0; i < attempts.length; i++) {
      const [mutation, label] = attempts[i];
      try {
        const data = await this.graphql(mutation);
        const result = data?.propertyCreate;
        if (result?.userErrors?.length > 0) {
          console.warn(`[Jobber propertyCreate] attempt "${label}" userErrors:`, JSON.stringify(result.userErrors));
          continue;
        }
        const id = result?.properties?.[0]?.id || null;
        if (id) {
          console.log(`[Jobber propertyCreate] attempt "${label}" succeeded, propertyId=${id}`);
          return id;
        }
        console.warn(`[Jobber propertyCreate] attempt "${label}" returned no property id`);
      } catch (e) {
        console.warn(`[Jobber propertyCreate] attempt "${label}" threw: ${e.message}`);
      }
    }
    console.error("[Jobber propertyCreate] all attempts exhausted \u2014 property could not be created");
    return null;
  }
  async introspectPropertyCreateInput() {
    try {
      const data = await this.graphql(`
        {
          pci: __type(name: "PropertyCreateInput") {
            name
            inputFields { name type { name kind ofType { name kind ofType { name kind } } } }
          }
          pa: __type(name: "PropertyAttributes") {
            name
            inputFields { name type { name kind ofType { name kind ofType { name kind } } } }
          }
          aa: __type(name: "AddressAttributes") {
            name
            inputFields { name type { name kind ofType { name kind ofType { name kind } } } }
          }
          m: __schema {
            mutationType {
              fields(includeDeprecated: true) {
                name
                args { name type { name kind ofType { name kind ofType { name kind } } } }
              }
            }
          }
        }
      `);
      const propCreate = data?.m?.mutationType?.fields?.find((f) => f.name === "propertyCreate");
      console.log("[Jobber schema] PropertyCreateInput fields:", JSON.stringify(data?.pci?.inputFields?.map((f) => f.name)));
      console.log("[Jobber schema] PropertyAttributes fields:", JSON.stringify(data?.pa?.inputFields?.map((f) => f.name)));
      console.log("[Jobber schema] AddressAttributes fields:", JSON.stringify(data?.aa?.inputFields?.map((f) => f.name)));
      console.log("[Jobber schema] propertyCreate args:", JSON.stringify(propCreate?.args?.map((a) => ({ name: a.name, type: a.type?.name || a.type?.ofType?.name || a.type?.ofType?.ofType?.name }))));
    } catch (e) {
      console.log("[Jobber schema] introspection failed:", e.message);
    }
  }
  async getOrCreatePropertyId(clientId, addressStr) {
    const existing = await this.getClientPropertyId(clientId);
    if (existing) return existing;
    await this.introspectPropertyCreateInput();
    const address = parseAddressString(addressStr || "");
    console.log(`[Jobber getOrCreateProperty] clientId=${clientId} rawAddress="${addressStr}" parsed=${JSON.stringify(address)}`);
    const created = await this.createProperty(clientId, address);
    if (created) return created;
    console.error(`[Jobber getOrCreateProperty] FAILED clientId=${clientId} address="${addressStr}"`);
    throw new Error(
      "Could not find or create a service property for this Jobber client. Please add a service address to the client in Jobber and try again."
    );
  }
  async createJob(input) {
    const propertyId = await this.getOrCreatePropertyId(input.clientId, input.addressStr);
    const mutation = `
      mutation CreateJob($propertyId: ID!, $title: String!, $instructions: String) {
        jobCreate(input: {
          propertyId: $propertyId,
          title: $title,
          instructions: $instructions,
          invoicing: {
            billingType: FLAT_RATE
          }
        }) {
          job {
            id
            jobNumber
            title
          }
          userErrors {
            message
            path
          }
        }
      }
    `;
    const data = await this.graphql(mutation, {
      propertyId,
      title: input.title,
      instructions: input.instructions || null
    });
    const result = data.jobCreate;
    if (!result) {
      throw new Error("jobCreate returned no data");
    }
    if (result.userErrors && result.userErrors.length > 0) {
      throw new Error(`Jobber job creation failed: ${result.userErrors.map((e) => e.message).join(", ")}`);
    }
    if (result.job?.id && input.lineItems && input.lineItems.length > 0) {
      const lineItemText = input.lineItems.map((li) => `\u2022 ${li.name}${li.description ? ` (${li.description})` : ""}: $${li.unitPrice}`).join("\n");
      const total = input.total ? `
Total: $${input.total.toFixed(2)}` : "";
      await this.addJobNote(result.job.id, `Services:
${lineItemText}${total}`).catch(() => {
      });
    }
    return result.job;
  }
  async addJobNote(jobId, note) {
    const mutation = `
      mutation AddJobNote($jobId: ID!, $note: String!) {
        jobCreateNote(input: {
          jobId: $jobId,
          note: $note
        }) {
          note { id }
          userErrors { message }
        }
      }
    `;
    await this.graphql(mutation, { jobId, note });
  }
  async disconnectApp() {
    const mutation = `
      mutation AppDisconnect {
        appDisconnect {
          success
        }
      }
    `;
    try {
      await this.graphql(mutation);
    } catch (e) {
      console.warn("appDisconnect mutation failed (token may already be invalid):", e.message);
    }
  }
};
async function syncQuoteToJobber(userId, quoteId, trigger = "manual", force = false) {
  const existingLink = await pool.query(
    `SELECT id, jobber_client_id as "jobberClientId", jobber_job_id as "jobberJobId",
            jobber_job_number as "jobberJobNumber", sync_status as "syncStatus"
     FROM jobber_job_links WHERE user_id = $1 AND quote_id = $2`,
    [userId, quoteId]
  );
  if (existingLink.rows.length > 0 && existingLink.rows[0].syncStatus === "success" && !force) {
    return {
      success: true,
      jobberClientId: existingLink.rows[0].jobberClientId,
      jobberJobId: existingLink.rows[0].jobberJobId,
      jobberJobNumber: existingLink.rows[0].jobberJobNumber
    };
  }
  const client = new JobberClient(userId);
  const conn = await client.loadConnection();
  if (!conn) {
    return { success: false, error: "Jobber is not connected" };
  }
  const quoteResult = await pool.query(
    `SELECT q.id, q.customer_id as "customerId", q.total, q.status,
            q.frequency_selected as "frequency",
            q.property_beds as "beds", q.property_baths as "baths", q.property_sqft as "sqft",
            q.selected_option as "selectedOption", q.options,
            q.add_ons as "addOns", q.property_details as "propertyDetails",
            c.first_name as "firstName", c.last_name as "lastName",
            c.email, c.phone, c.address
     FROM quotes q
     LEFT JOIN customers c ON q.customer_id = c.id
     WHERE q.id = $1`,
    [quoteId]
  );
  if (quoteResult.rows.length === 0) {
    return { success: false, error: "Quote not found" };
  }
  const quote = quoteResult.rows[0];
  const firstName = quote.firstName || "Unknown";
  const lastName = quote.lastName || "Customer";
  const total = quote.total ? Number(quote.total).toFixed(2) : "0.00";
  try {
    let jobberClientId;
    const existingMapping = await pool.query(
      `SELECT jobber_client_id as "jobberClientId" FROM jobber_client_mappings
       WHERE user_id = $1 AND qp_customer_id = $2`,
      [userId, quote.customerId]
    );
    if (existingMapping.rows.length > 0) {
      jobberClientId = existingMapping.rows[0].jobberClientId;
    } else {
      const addressParts = {};
      if (quote.address) addressParts.street1 = quote.address;
      const jobberClient = await client.createClient({
        firstName,
        lastName,
        email: quote.email || void 0,
        phone: quote.phone || void 0,
        address: Object.keys(addressParts).length > 0 ? addressParts : void 0
      });
      jobberClientId = jobberClient.id;
      if (quote.customerId) {
        await pool.query(
          `INSERT INTO jobber_client_mappings (id, user_id, qp_customer_id, jobber_client_id, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, NOW())
           ON CONFLICT (user_id, qp_customer_id) DO UPDATE SET jobber_client_id = $3`,
          [userId, quote.customerId, jobberClientId]
        );
      }
      await logJobberSync(userId, quoteId, "create_client", { firstName, lastName }, { jobberClientId }, "ok");
    }
    const frequency = quote.frequency || "one-time";
    const SERVICE_NAMES = {
      good: "Standard Clean",
      better: "Deep Clean",
      best: "Premium Clean"
    };
    const FREQUENCY_LABELS = {
      weekly: "Weekly",
      "bi-weekly": "Bi-Weekly",
      biweekly: "Bi-Weekly",
      monthly: "Monthly",
      "every-4-weeks": "Every 4 Weeks",
      "one-time": "",
      onetime: ""
    };
    const serviceName = SERVICE_NAMES[quote.selectedOption] || "Cleaning";
    const frequencyTag = FREQUENCY_LABELS[frequency] ?? "";
    const propertySummary = [
      quote.beds ? `${quote.beds}bd` : null,
      quote.baths ? `${quote.baths}ba` : null,
      quote.sqft ? `${quote.sqft}sqft` : null
    ].filter(Boolean).join("/");
    const titleParts = [
      serviceName,
      propertySummary || null,
      frequencyTag || null,
      `${firstName} ${lastName}`
    ].filter(Boolean);
    const title = titleParts.join(" \u2014 ");
    const lineItems = [];
    const options = quote.options;
    const selectedTierData = options && quote.selectedOption ? options[quote.selectedOption] : null;
    const tierPrice = selectedTierData ? Number(selectedTierData.price ?? selectedTierData.subtotal ?? selectedTierData.total ?? quote.total) : Number(quote.total);
    const propertyDesc = [
      propertySummary,
      frequencyTag ? `${frequencyTag} service` : "One-time service"
    ].filter(Boolean).join(" \xB7 ");
    lineItems.push({
      name: serviceName,
      description: propertyDesc || void 0,
      unitPrice: tierPrice.toFixed(2),
      quantity: 1
    });
    const addOns = quote.addOns;
    const ADD_ON_PRICES = {
      inside_oven: 35,
      inside_fridge: 25,
      interior_windows: 40,
      laundry: 30,
      dishes: 20,
      baseboards: 20,
      blinds: 25,
      wall_spots: 15,
      garage: 45,
      patio: 35,
      carpet_vacuum: 15
    };
    if (addOns && typeof addOns === "object") {
      for (const [key, val] of Object.entries(addOns)) {
        if (val === true) {
          const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          const addOnPrice = ADD_ON_PRICES[key] ?? 0;
          lineItems.push({
            name: label,
            unitPrice: addOnPrice.toFixed(2),
            quantity: 1
          });
        }
      }
    }
    const noteLines = [
      `Synced from QuotePro`,
      `Quote Total: $${total}`,
      frequencyTag ? `Frequency: ${frequencyTag}` : "Service: One-time"
    ];
    if (quote.beds) noteLines.push(`Bedrooms: ${quote.beds}`);
    if (quote.baths) noteLines.push(`Bathrooms: ${quote.baths}`);
    if (quote.sqft) noteLines.push(`Sq Ft: ${quote.sqft}`);
    if (quote.address) noteLines.push(`Address: ${quote.address}`);
    const jobberJob = await client.createJob({
      clientId: jobberClientId,
      title,
      instructions: noteLines.join("\n"),
      total: Number(total),
      addressStr: quote.address,
      lineItems
    });
    if (existingLink.rows.length > 0) {
      await pool.query(
        `UPDATE jobber_job_links SET jobber_client_id = $1, jobber_job_id = $2, jobber_job_number = $3,
                sync_status = 'success', sync_trigger = $4, error_message = NULL, created_at = NOW()
         WHERE id = $5`,
        [jobberClientId, jobberJob.id, jobberJob.jobNumber?.toString() || null, trigger, existingLink.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO jobber_job_links (id, user_id, quote_id, jobber_client_id, jobber_job_id, jobber_job_number, sync_status, sync_trigger, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'success', $6, NOW())`,
        [userId, quoteId, jobberClientId, jobberJob.id, jobberJob.jobNumber?.toString() || null, trigger]
      );
    }
    await logJobberSync(userId, quoteId, "sync_quote", { trigger, quoteId }, {
      jobberClientId,
      jobberJobId: jobberJob.id,
      jobberJobNumber: jobberJob.jobNumber
    }, "ok");
    return {
      success: true,
      jobberClientId,
      jobberJobId: jobberJob.id,
      jobberJobNumber: jobberJob.jobNumber?.toString() || void 0
    };
  } catch (error) {
    console.error("Jobber sync failed:", error.message);
    if (existingLink.rows.length > 0) {
      await pool.query(
        `UPDATE jobber_job_links SET sync_status = 'failed', error_message = $1 WHERE id = $2`,
        [error.message, existingLink.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO jobber_job_links (id, user_id, quote_id, jobber_client_id, jobber_job_id, jobber_job_number, sync_status, sync_trigger, error_message, created_at)
         VALUES (gen_random_uuid(), $1, $2, '', '', NULL, 'failed', $3, $4, NOW())`,
        [userId, quoteId, trigger, error.message]
      );
    }
    await logJobberSync(userId, quoteId, "sync_quote", { trigger, quoteId }, { error: error.message }, "failed", error.message);
    return { success: false, error: error.message };
  }
}

// server/routes.ts
init_storage();

// server/social-storage.ts
init_db();
init_schema();
import { eq as eq2, and as and2, desc as desc2, asc as asc2, gte as gte2 } from "drizzle-orm";
async function getChannelConnectionsByBusiness(businessId) {
  return db.select().from(channelConnections).where(eq2(channelConnections.businessId, businessId)).orderBy(desc2(channelConnections.updatedAt));
}
async function getChannelConnectionByChannel(businessId, channel) {
  const [c] = await db.select().from(channelConnections).where(and2(eq2(channelConnections.businessId, businessId), eq2(channelConnections.channel, channel)));
  return c;
}
async function upsertChannelConnection(businessId, channel, data) {
  const existing = await getChannelConnectionByChannel(businessId, channel);
  if (existing) {
    const [c2] = await db.update(channelConnections).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(channelConnections.id, existing.id)).returning();
    return c2;
  }
  const [c] = await db.insert(channelConnections).values({ businessId, channel, ...data }).returning();
  return c;
}
async function deleteChannelConnection(id) {
  await db.delete(channelConnections).where(eq2(channelConnections.id, id));
}
async function getConversationsByBusiness(businessId, opts) {
  const conditions = [eq2(socialConversations.businessId, businessId)];
  if (opts?.channel) conditions.push(eq2(socialConversations.channel, opts.channel));
  let query = db.select().from(socialConversations).where(and2(...conditions)).orderBy(desc2(socialConversations.lastMessageAt));
  if (opts?.limit) return query.limit(opts.limit);
  return query;
}
async function createConversation(data) {
  const [c] = await db.insert(socialConversations).values({
    businessId: data.businessId,
    channelConnectionId: data.channelConnectionId || null,
    channel: data.channel,
    externalConversationId: data.externalConversationId || null,
    senderName: data.senderName,
    senderExternalId: data.senderExternalId || null,
    senderProfileUrl: data.senderProfileUrl || null,
    lastMessageAt: /* @__PURE__ */ new Date()
  }).returning();
  return c;
}
async function updateConversation(id, data) {
  const [c] = await db.update(socialConversations).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(socialConversations.id, id)).returning();
  return c;
}
async function getMessagesByConversation(conversationId) {
  return db.select().from(socialMessages).where(eq2(socialMessages.conversationId, conversationId)).orderBy(asc2(socialMessages.createdAt));
}
async function createMessage(data) {
  const [m] = await db.insert(socialMessages).values({
    conversationId: data.conversationId,
    direction: data.direction,
    content: data.content,
    externalMessageId: data.externalMessageId || null,
    intentDetected: data.intentDetected ?? null,
    intentConfidence: data.intentConfidence ?? null,
    intentCategory: data.intentCategory || null,
    autoReplyContent: data.autoReplyContent || null,
    quoteLink: data.quoteLink || null
  }).returning();
  return m;
}
async function getSocialLeadsByBusiness(businessId, opts) {
  const conditions = [eq2(socialLeads.businessId, businessId)];
  if (opts?.channel) conditions.push(eq2(socialLeads.channel, opts.channel));
  if (opts?.status) conditions.push(eq2(socialLeads.status, opts.status));
  return db.select().from(socialLeads).where(and2(...conditions)).orderBy(desc2(socialLeads.createdAt));
}
async function getSocialLeadById(id) {
  const [l] = await db.select().from(socialLeads).where(eq2(socialLeads.id, id));
  return l;
}
async function createSocialLead(data) {
  const [l] = await db.insert(socialLeads).values({
    businessId: data.businessId,
    customerId: data.customerId || null,
    conversationId: data.conversationId || null,
    channel: data.channel,
    attribution: data.attribution || "auto_dm",
    senderName: data.senderName,
    senderHandle: data.senderHandle || null,
    dmText: data.dmText || null,
    quoteId: data.quoteId || null,
    status: data.status || "new",
    revenue: data.revenue || null
  }).returning();
  return l;
}
async function updateSocialLead(id, data) {
  const [l] = await db.update(socialLeads).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(socialLeads.id, id)).returning();
  return l;
}
async function createAttributionEvent(data) {
  const [e] = await db.insert(attributionEvents).values({
    businessId: data.businessId,
    socialLeadId: data.socialLeadId || null,
    conversationId: data.conversationId || null,
    channel: data.channel,
    eventType: data.eventType,
    metadata: data.metadata || {}
  }).returning();
  return e;
}
async function getAttributionEventsByBusiness(businessId, opts) {
  const conditions = [eq2(attributionEvents.businessId, businessId)];
  if (opts?.channel) conditions.push(eq2(attributionEvents.channel, opts.channel));
  if (opts?.days) {
    const since = /* @__PURE__ */ new Date();
    since.setDate(since.getDate() - opts.days);
    conditions.push(gte2(attributionEvents.createdAt, since));
  }
  return db.select().from(attributionEvents).where(and2(...conditions)).orderBy(desc2(attributionEvents.createdAt));
}
async function getSocialAutomationSettings(businessId) {
  const [s] = await db.select().from(socialAutomationSettings).where(eq2(socialAutomationSettings.businessId, businessId));
  return s;
}
async function upsertSocialAutomationSettings(businessId, data) {
  const existing = await getSocialAutomationSettings(businessId);
  if (existing) {
    const [s2] = await db.update(socialAutomationSettings).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(socialAutomationSettings.id, existing.id)).returning();
    return s2;
  }
  const [s] = await db.insert(socialAutomationSettings).values({ businessId, ...data }).returning();
  return s;
}
async function getSocialOptOutsByBusiness(businessId) {
  return db.select().from(socialOptOuts).where(eq2(socialOptOuts.businessId, businessId)).orderBy(desc2(socialOptOuts.createdAt));
}
async function getSocialStats(businessId, days = 30) {
  const since = /* @__PURE__ */ new Date();
  since.setDate(since.getDate() - days);
  const leads = await db.select().from(socialLeads).where(and2(eq2(socialLeads.businessId, businessId), gte2(socialLeads.createdAt, since)));
  const conversations = await db.select().from(socialConversations).where(and2(eq2(socialConversations.businessId, businessId), gte2(socialConversations.createdAt, since)));
  const totalLeads = leads.length;
  const quotedLeads = leads.filter((l) => l.quoteId);
  const totalQuotes = quotedLeads.length;
  const totalRevenue = leads.reduce((s, l) => s + (l.revenue || 0), 0);
  const autoRepliedConvos = conversations.filter((c) => c.autoReplied && c.lastMessageAt && c.createdAt);
  const avgResponseTime = autoRepliedConvos.length > 0 ? autoRepliedConvos.reduce((s, c) => {
    const diff = (c.lastMessageAt.getTime() - c.createdAt.getTime()) / 1e3;
    return s + diff;
  }, 0) / autoRepliedConvos.length : 0;
  const leadsByChannel = {};
  const quotesByChannel = {};
  const revenueByChannel = {};
  for (const l of leads) {
    leadsByChannel[l.channel] = (leadsByChannel[l.channel] || 0) + 1;
    if (l.quoteId) quotesByChannel[l.channel] = (quotesByChannel[l.channel] || 0) + 1;
    if (l.revenue) revenueByChannel[l.channel] = (revenueByChannel[l.channel] || 0) + l.revenue;
  }
  return { totalLeads, totalQuotes, totalRevenue: Math.round(totalRevenue * 100) / 100, avgResponseTime: Math.round(avgResponseTime), leadsByChannel, quotesByChannel, revenueByChannel };
}

// server/routes.ts
var stripe = null;
async function initStripeClient() {
  try {
    stripe = await getUncachableStripeClient();
    console.log("Stripe client initialized via Replit connection");
  } catch (e) {
    console.warn("Stripe not available:", e.message);
    stripe = null;
  }
}
initStripeClient();
var openai = new OpenAI3({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});
var pendingAuthTokens = /* @__PURE__ */ new Map();
function generateAuthToken(userId, needsOnboarding) {
  const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);
  pendingAuthTokens.set(token, { userId, needsOnboarding, expiresAt: Date.now() + 6e4 });
  return token;
}
function setupSession(app2) {
  const PgStore = connectPg(session);
  const isProduction = process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1";
  if (isProduction) {
    app2.set("trust proxy", 1);
  }
  app2.use(
    session({
      store: new PgStore({
        pool,
        createTableIfMissing: true
      }),
      secret: process.env.SESSION_SECRET || "quotepro-dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1e3,
        sameSite: "lax"
      }
    })
  );
}
function getPublicBaseUrl(req) {
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT) {
    const forwardedHost = req.header("x-forwarded-host");
    const host2 = forwardedHost || req.get("host") || "localhost";
    return `https://${host2}`;
  }
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) {
    return `https://${devDomain}:5000`;
  }
  const host = req.get("host") || "localhost:5000";
  return `https://${host}`;
}
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}
function isGrowthOrAbove(tier) {
  return tier === "growth" || tier === "pro";
}
async function requirePro(req, res, next) {
  try {
    const user = await getUserById(req.session.userId);
    if (!user || !isGrowthOrAbove(user.subscriptionTier)) {
      return res.status(403).json({
        message: "This feature requires a Growth or Pro subscription",
        requiresUpgrade: true
      });
    }
    next();
  } catch {
    return res.status(500).json({ message: "Subscription check failed" });
  }
}
async function generateRevenuePlaybook(quote, business, customer) {
  const recs = [];
  const total = Number(quote.total) || 0;
  const freq = quote.acceptedFrequency || quote.frequencySelected;
  const now = /* @__PURE__ */ new Date();
  const followUpDate = new Date(now);
  followUpDate.setDate(followUpDate.getDate() + 2);
  recs.push({
    type: "follow_up",
    title: "Send a thank-you message",
    rationale: `A quick thank-you after acceptance builds trust and sets expectations. Reach out within 48 hours to confirm scheduling details.`,
    suggestedDate: followUpDate
  });
  if (!freq || freq === "one-time") {
    recs.push({
      type: "frequency_upgrade",
      title: "Suggest recurring service",
      rationale: `This is a one-time booking at $${total.toFixed(2)}. After the first clean, suggest a recurring plan. Bi-weekly clients average 24x/year revenue vs 1x. Potential annual value: $${(total * 24).toFixed(0)}.`
    });
  }
  recs.push({
    type: "addon_suggestion",
    title: "Offer a deep clean add-on",
    rationale: `After completing the initial service, offer a deep clean upgrade or add-on services like window cleaning, oven cleaning, or organization. This typically adds 30-50% to the base price.`
  });
  const referralDate = new Date(now);
  referralDate.setDate(referralDate.getDate() + 7);
  recs.push({
    type: "referral_ask",
    title: "Ask for a referral",
    rationale: `Happy customers are your best marketing channel. After a successful first clean, ask if they know anyone who might need cleaning services. Offer a referral discount to incentivize.`,
    suggestedDate: referralDate
  });
  const reviewDate = new Date(now);
  reviewDate.setDate(reviewDate.getDate() + 3);
  recs.push({
    type: "review_request",
    title: "Request a review",
    rationale: `Online reviews are critical for new customer acquisition. After service completion, send a friendly review request with a direct link to your Google Business page.`,
    suggestedDate: reviewDate
  });
  const month = now.getMonth();
  if (month >= 2 && month <= 4) {
    recs.push({
      type: "seasonal_offer",
      title: "Promote spring deep cleaning",
      rationale: `Spring is prime time for deep cleaning. Offer a seasonal deep clean package at a special rate to capitalize on the momentum of this booking.`
    });
  } else if (month >= 9 && month <= 11) {
    recs.push({
      type: "seasonal_offer",
      title: "Holiday prep cleaning package",
      rationale: `The holiday season is approaching. Offer a pre-holiday deep clean package to help customers prepare for gatherings and guests.`
    });
  }
  for (const rec of recs) {
    try {
      await createRecommendation({
        businessId: quote.businessId,
        quoteId: quote.id,
        customerId: quote.customerId || void 0,
        type: rec.type,
        title: rec.title,
        rationale: rec.rationale,
        suggestedDate: rec.suggestedDate
      });
    } catch (_e) {
    }
  }
}
async function registerRoutes(app2) {
  setupSession(app2);
  app2.get("/download/session-transcript", (_req, res) => {
    const filePath = __require("path").resolve(process.cwd(), "session-transcript.md");
    res.download(filePath, "quotepro-agent-session-transcript.md");
  });
  app2.post("/api/crash-report", async (req, res) => {
    try {
      const { error, stack, componentStack, source } = req.body;
      console.error("[CRASH REPORT]", {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        source,
        error,
        stack: stack?.substring(0, 500),
        componentStack: componentStack?.substring(0, 500)
      });
      res.json({ received: true });
    } catch {
      res.status(200).json({ received: true });
    }
  });
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const existing = await getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await createUser({
        email,
        name: name || null,
        passwordHash,
        authProvider: "email"
      });
      const business = await createBusiness(user.id);
      req.session.userId = user.id;
      return res.json({
        user: formatUser(user),
        business: formatBusiness(business),
        needsOnboarding: !business.onboardingComplete
      });
    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({ message: "Registration failed" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const user = await getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      const business = await getBusinessByOwner(user.id);
      req.session.userId = user.id;
      return res.json({
        user: formatUser(user),
        business: business ? formatBusiness(business) : null,
        needsOnboarding: !business?.onboardingComplete
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Login failed" });
    }
  });
  app2.get("/api/auth/apple/start", async (req, res) => {
    try {
      const clientId = process.env.APPLE_SERVICE_ID;
      if (!clientId) {
        return res.status(500).json({ message: "Apple Sign In not configured for web" });
      }
      const baseUrl = getPublicBaseUrl(req);
      const redirectUri = `${baseUrl}/api/auth/apple/callback`;
      const state = crypto2.randomBytes(32).toString("hex");
      req.session.appleOAuthState = state;
      await new Promise((resolve2) => req.session.save(() => resolve2()));
      const url = `https://appleid.apple.com/auth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code%20id_token&scope=name%20email&response_mode=form_post&state=${encodeURIComponent(state)}`;
      return res.json({ url });
    } catch (error) {
      console.error("Apple auth start error:", error);
      return res.status(500).json({ message: "Failed to start Apple sign-in" });
    }
  });
  app2.post("/api/auth/apple/callback", async (req, res) => {
    try {
      const { id_token, user: userJson, state } = req.body;
      const expectedState = req.session.appleOAuthState;
      if (!state || !expectedState || state !== expectedState) {
        console.error("Apple callback: state mismatch");
        return res.redirect("/app/login?error=apple_failed");
      }
      delete req.session.appleOAuthState;
      if (!id_token) {
        return res.redirect("/app/login?error=apple_failed");
      }
      const parts = id_token.split(".");
      if (parts.length !== 3) {
        return res.redirect("/app/login?error=apple_failed");
      }
      let payload;
      try {
        payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
      } catch {
        return res.redirect("/app/login?error=apple_failed");
      }
      if (payload.iss !== "https://appleid.apple.com") {
        console.error("Apple callback: invalid issuer", payload.iss);
        return res.redirect("/app/login?error=apple_failed");
      }
      const clientId = process.env.APPLE_SERVICE_ID;
      if (payload.aud !== clientId) {
        console.error("Apple callback: audience mismatch", payload.aud, clientId);
        return res.redirect("/app/login?error=apple_failed");
      }
      if (payload.exp && payload.exp * 1e3 < Date.now()) {
        console.error("Apple callback: token expired");
        return res.redirect("/app/login?error=apple_failed");
      }
      const email = payload.email;
      const providerId = payload.sub;
      if (!email || !providerId) {
        return res.redirect("/app/login?error=apple_failed");
      }
      let parsedUser = null;
      if (userJson) {
        try {
          parsedUser = typeof userJson === "string" ? JSON.parse(userJson) : userJson;
        } catch {
        }
      }
      const name = parsedUser?.name ? `${parsedUser.name.firstName || ""} ${parsedUser.name.lastName || ""}`.trim() : void 0;
      let user = await getUserByProviderId("apple", providerId);
      if (!user) {
        user = await getUserByEmail(email);
        if (user) {
          return res.redirect("/app/login?error=account_exists");
        }
        user = await createUser({ email, name, authProvider: "apple", providerId });
        await createBusiness(user.id);
      }
      req.session.userId = user.id;
      return new Promise((resolve2) => {
        req.session.save(() => {
          res.redirect("/app/dashboard");
          resolve2();
        });
      });
    } catch (error) {
      console.error("Apple callback error:", error);
      return res.redirect("/app/login?error=apple_failed");
    }
  });
  app2.post("/api/auth/apple", async (req, res) => {
    try {
      const { identityToken, user: appleUser, fullName, email: appleEmail } = req.body;
      if (!identityToken) {
        return res.status(400).json({ message: "Identity token is required" });
      }
      const parts = identityToken.split(".");
      if (parts.length !== 3) {
        return res.status(400).json({ message: "Invalid token format" });
      }
      let payload;
      try {
        payload = JSON.parse(
          Buffer.from(parts[1], "base64").toString("utf8")
        );
      } catch {
        return res.status(400).json({ message: "Invalid token" });
      }
      const email = payload.email || appleEmail;
      const providerId = payload.sub || appleUser;
      if (!email || !providerId) {
        return res.status(400).json({ message: "Could not extract user info from token" });
      }
      let user = await getUserByProviderId("apple", providerId);
      if (!user) {
        user = await getUserByEmail(email);
        if (user) {
          return res.status(409).json({
            message: "An account with this email already exists. Please sign in with your email and password."
          });
        }
        const name = fullName?.givenName && fullName?.familyName ? `${fullName.givenName} ${fullName.familyName}` : void 0;
        user = await createUser({
          email,
          name,
          authProvider: "apple",
          providerId
        });
        const business2 = await createBusiness(user.id);
        req.session.userId = user.id;
        return res.json({
          user: formatUser(user),
          business: formatBusiness(business2),
          needsOnboarding: true
        });
      }
      const business = await getBusinessByOwner(user.id);
      req.session.userId = user.id;
      return res.json({
        user: formatUser(user),
        business: business ? formatBusiness(business) : null,
        needsOnboarding: !business?.onboardingComplete
      });
    } catch (error) {
      console.error("Apple auth error:", error);
      return res.status(500).json({ message: "Apple sign-in failed" });
    }
  });
  app2.post("/api/auth/google", async (req, res) => {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ message: "ID token is required" });
      }
      const parts = idToken.split(".");
      if (parts.length !== 3) {
        return res.status(400).json({ message: "Invalid token format" });
      }
      let payload;
      try {
        payload = JSON.parse(
          Buffer.from(parts[1], "base64").toString("utf8")
        );
      } catch {
        return res.status(400).json({ message: "Invalid token" });
      }
      const email = payload.email;
      const providerId = payload.sub;
      const name = payload.name;
      if (!email || !providerId) {
        return res.status(400).json({ message: "Could not extract user info from token" });
      }
      let user = await getUserByProviderId("google", providerId);
      if (!user) {
        user = await getUserByEmail(email);
        if (user) {
          return res.status(409).json({
            message: "An account with this email already exists. Please sign in with your original method."
          });
        }
        user = await createUser({
          email,
          name,
          authProvider: "google",
          providerId
        });
        const business2 = await createBusiness(user.id);
        req.session.userId = user.id;
        return res.json({
          user: formatUser(user),
          business: formatBusiness(business2),
          needsOnboarding: true
        });
      }
      const business = await getBusinessByOwner(user.id);
      req.session.userId = user.id;
      return res.json({
        user: formatUser(user),
        business: business ? formatBusiness(business) : null,
        needsOnboarding: !business?.onboardingComplete
      });
    } catch (error) {
      console.error("Google auth error:", error);
      return res.status(500).json({ message: "Google sign-in failed" });
    }
  });
  app2.get("/api/auth/google/start", async (req, res) => {
    try {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(500).json({ message: "Google OAuth not configured" });
      }
      const platform = req.query.platform === "web" ? "web" : "mobile";
      const redirectUri = `https://${req.get("host")}/api/auth/google/callback`;
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );
      const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["openid", "email", "profile"],
        prompt: "select_account",
        state: platform
      });
      return res.json({ url });
    } catch (error) {
      console.error("Google auth start error:", error);
      return res.status(500).json({ message: "Failed to start Google sign-in" });
    }
  });
  app2.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      const isWeb = state === "web";
      if (!code) {
        return res.status(400).send("Missing authorization code");
      }
      const redirectUri = `https://${req.get("host")}/api/auth/google/callback`;
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );
      const { tokens } = await oauth2Client.getToken(code);
      if (!tokens.id_token) {
        return res.status(400).send("No ID token received from Google");
      }
      const parts = tokens.id_token.split(".");
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
      const email = payload.email;
      const providerId = payload.sub;
      const name = payload.name;
      if (!email || !providerId) {
        return res.status(400).send("Could not extract user info");
      }
      let user = await getUserByProviderId("google", providerId);
      let needsOnboarding = false;
      if (!user) {
        user = await getUserByEmail(email);
        if (user) {
          if (isWeb) {
            return res.redirect("/app/login?error=account_exists");
          }
          return res.send(`<!DOCTYPE html><html><head><title>Sign In Error</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;}
.card{text-align:center;padding:40px;background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:400px;}
h2{margin:0 0 8px;color:#333;}p{color:#666;margin:0;}</style>
</head><body><div class="card"><h2>Account Exists</h2><p>An account with this email already exists. Please sign in with your original method.</p></div></body></html>`);
        }
        user = await createUser({ email, name, authProvider: "google", providerId });
        await createBusiness(user.id);
        needsOnboarding = true;
      } else {
        const business = await getBusinessByOwner(user.id);
        needsOnboarding = !business?.onboardingComplete;
      }
      if (isWeb) {
        req.session.userId = user.id;
        return new Promise((resolve2) => {
          req.session.save(() => {
            res.redirect("/app/dashboard");
            resolve2();
          });
        });
      }
      const authToken = generateAuthToken(user.id, needsOnboarding);
      const callbackUrl = `quotepro://auth-callback?token=${authToken}`;
      return res.send(`<!DOCTYPE html><html><head><title>Signed In</title>
<meta http-equiv="refresh" content="1;url=${callbackUrl}">
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;}
.card{text-align:center;padding:40px;background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
.check{font-size:48px;margin-bottom:16px;color:#34C759;}h2{margin:0 0 8px;color:#333;}p{color:#666;margin:0;}</style>
</head><body><div class="card"><div class="check">&#10003;</div><h2>Signed In!</h2><p>Returning to QuotePro...</p></div>
<script>setTimeout(function(){window.location.href='${callbackUrl}';},500);</script>
</body></html>`);
    } catch (error) {
      console.error("Google auth callback error:", error);
      return res.status(500).send("Google sign-in failed. Please try again.");
    }
  });
  app2.post("/api/auth/exchange-token", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ message: "Missing token" });
      const pending = pendingAuthTokens.get(token);
      if (!pending) return res.status(401).json({ message: "Invalid or expired token" });
      if (Date.now() > pending.expiresAt) {
        pendingAuthTokens.delete(token);
        return res.status(401).json({ message: "Token expired" });
      }
      pendingAuthTokens.delete(token);
      const user = await getUserById(pending.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      req.session.userId = user.id;
      req.session.save(() => {
        return res.json({
          user: { id: user.id, email: user.email, name: user.name, subscriptionTier: user.subscriptionTier || "free" },
          needsOnboarding: pending.needsOnboarding
        });
      });
    } catch (error) {
      return res.status(500).json({ message: "Token exchange failed" });
    }
  });
  app2.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const user = await getUserById(req.session.userId);
      if (!user) {
        req.session.destroy(() => {
        });
        return res.status(401).json({ message: "User not found" });
      }
      const business = await getBusinessByOwner(user.id);
      return res.json({
        user: formatUser(user),
        business: business ? formatBusiness(business) : null,
        needsOnboarding: !business?.onboardingComplete
      });
    } catch (error) {
      console.error("Auth check error:", error);
      return res.status(500).json({ message: "Auth check failed" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out" });
    });
  });
  app2.get("/api/consent", requireAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT ai_consent_accepted_at, terms_accepted_at, consent_version FROM users WHERE id = $1`,
        [req.session.userId]
      );
      const row = result.rows[0] ?? {};
      return res.json({
        aiConsentAcceptedAt: row.ai_consent_accepted_at ?? null,
        termsAcceptedAt: row.terms_accepted_at ?? null,
        consentVersion: row.consent_version ?? null
      });
    } catch (err) {
      console.error("GET /api/consent error:", err);
      return res.status(500).json({ message: "Failed to fetch consent" });
    }
  });
  app2.post("/api/consent", requireAuth, async (req, res) => {
    const { type, version } = req.body;
    const now = /* @__PURE__ */ new Date();
    const ver = version ?? "1.0";
    try {
      if (type === "ai") {
        await pool.query(
          `UPDATE users SET ai_consent_accepted_at = $1, consent_version = $2 WHERE id = $3`,
          [now, ver, req.session.userId]
        );
      } else if (type === "terms") {
        await pool.query(
          `UPDATE users SET terms_accepted_at = $1, consent_version = $2 WHERE id = $3`,
          [now, ver, req.session.userId]
        );
      } else if (type === "both") {
        await pool.query(
          `UPDATE users SET ai_consent_accepted_at = $1, terms_accepted_at = $1, consent_version = $2 WHERE id = $3`,
          [now, ver, req.session.userId]
        );
      } else {
        return res.status(400).json({ message: "Invalid consent type" });
      }
      return res.json({ ok: true, acceptedAt: now.toISOString() });
    } catch (err) {
      console.error("POST /api/consent error:", err);
      return res.status(500).json({ message: "Failed to record consent" });
    }
  });
  app2.post("/api/auth/delete-account", requireAuth, async (req, res) => {
    const client = await pool.connect();
    try {
      const userId = req.session.userId;
      await client.query("BEGIN");
      const business = await getBusinessByOwner(userId);
      const bid = business?.id;
      if (bid) {
        const jobIds = (await client.query(`SELECT id FROM jobs WHERE business_id = $1`, [bid])).rows.map((r) => r.id);
        if (jobIds.length > 0) {
          await client.query(`DELETE FROM job_photos WHERE job_id = ANY($1)`, [jobIds]);
          await client.query(`DELETE FROM job_checklist_items WHERE job_id = ANY($1)`, [jobIds]);
          await client.query(`DELETE FROM job_status_history WHERE job_id = ANY($1)`, [jobIds]);
          await client.query(`DELETE FROM job_notes WHERE job_id = ANY($1)`, [jobIds]);
        }
        await client.query(`DELETE FROM jobs WHERE business_id = $1`, [bid]);
        const quoteIds = (await client.query(`SELECT id FROM quotes WHERE business_id = $1`, [bid])).rows.map((r) => r.id);
        if (quoteIds.length > 0) {
          await client.query(`DELETE FROM sales_recommendations WHERE quote_id = ANY($1)`, [quoteIds]);
          await client.query(`DELETE FROM quote_follow_ups WHERE quote_id = ANY($1)`, [quoteIds]);
          await client.query(`DELETE FROM quote_line_items WHERE quote_id = ANY($1)`, [quoteIds]);
          await client.query(`DELETE FROM invoice_packets WHERE quote_id = ANY($1)`, [quoteIds]);
        }
        await client.query(`DELETE FROM quotes WHERE business_id = $1`, [bid]);
        const custIds = (await client.query(`SELECT id FROM customers WHERE business_id = $1`, [bid])).rows.map((r) => r.id);
        if (custIds.length > 0) {
          await client.query(`DELETE FROM communications WHERE customer_id = ANY($1)`, [custIds]);
          await client.query(`DELETE FROM review_requests WHERE customer_id = ANY($1)`, [custIds]);
          await client.query(`DELETE FROM customer_marketing_prefs WHERE customer_id = ANY($1)`, [custIds]);
          await client.query(`DELETE FROM follow_up_touches WHERE customer_id = ANY($1)`, [custIds]);
        }
        await client.query(`DELETE FROM customers WHERE business_id = $1`, [bid]);
        const safeDeletes = [
          "pricing_settings",
          "automation_rules",
          "tasks",
          "channel_connections",
          "social_conversations",
          "social_messages",
          "social_leads",
          "attribution_events",
          "social_automation_settings",
          "social_opt_outs",
          "growth_tasks",
          "growth_task_events",
          "growth_automation_settings",
          "sales_strategy_settings",
          "campaigns",
          "calendar_event_stubs",
          "api_keys",
          "webhook_endpoints",
          "webhook_events",
          "webhook_deliveries",
          "qbo_connections",
          "qbo_customer_mappings",
          "qbo_invoice_links",
          "qbo_sync_log"
        ];
        for (const table of safeDeletes) {
          try {
            await client.query(`DELETE FROM ${table} WHERE business_id = $1`, [bid]);
          } catch (_) {
          }
        }
        await client.query(`DELETE FROM businesses WHERE id = $1`, [bid]);
      }
      const userTables = [
        "push_tokens",
        "google_calendar_tokens",
        "streaks",
        "user_preferences",
        "analytics_events",
        "badges",
        "business_profiles"
      ];
      for (const table of userTables) {
        try {
          await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
        } catch (_) {
        }
      }
      await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
      await client.query("COMMIT");
      req.session.destroy(() => {
      });
      res.clearCookie("connect.sid");
      return res.json({ message: "Account deleted" });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Delete account error:", error);
      return res.status(500).json({ message: "Failed to delete account" });
    } finally {
      client.release();
    }
  });
  app2.get("/api/business", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      return res.json(formatBusiness(business));
    } catch (error) {
      console.error("Get business error:", error);
      return res.status(500).json({ message: "Failed to get business" });
    }
  });
  app2.put("/api/business", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const updated = await updateBusiness(business.id, req.body);
      return res.json(formatBusiness(updated));
    } catch (error) {
      console.error("Update business error:", error);
      return res.status(500).json({ message: "Failed to update business" });
    }
  });
  app2.patch("/api/business", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const updated = await updateBusiness(business.id, req.body);
      return res.json(formatBusiness(updated));
    } catch (error) {
      console.error("Update business error:", error);
      return res.status(500).json({ message: "Failed to update business" });
    }
  });
  app2.get("/api/pricing", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const pricing = await getPricingByBusiness(business.id);
      return res.json(pricing?.settings || null);
    } catch (error) {
      console.error("Get pricing error:", error);
      return res.status(500).json({ message: "Failed to get pricing" });
    }
  });
  app2.put("/api/pricing", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      const row = await upsertPricingSettings(business.id, req.body);
      return res.json(row.settings);
    } catch (error) {
      console.error("Update pricing error:", error);
      return res.status(500).json({ message: "Failed to update pricing" });
    }
  });
  app2.get("/api/customers", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { search, status } = req.query;
      const list = await getCustomersByBusiness(business.id, { search, status });
      return res.json(list);
    } catch (error) {
      console.error("Get customers error:", error);
      return res.status(500).json({ message: "Failed to get customers" });
    }
  });
  app2.get("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const c = await getCustomerById(req.params.id);
      if (!c) return res.status(404).json({ message: "Customer not found" });
      return res.json(c);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get customer" });
    }
  });
  app2.post("/api/customers", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const c = await createCustomer({ ...req.body, businessId: business.id });
      return res.json(c);
    } catch (error) {
      console.error("Create customer error:", error);
      return res.status(500).json({ message: "Failed to create customer" });
    }
  });
  app2.put("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      const c = await updateCustomer(req.params.id, req.body);
      return res.json(c);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update customer" });
    }
  });
  app2.delete("/api/customers/:id", requireAuth, async (req, res) => {
    try {
      await deleteCustomer(req.params.id);
      return res.json({ message: "Deleted" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to delete customer" });
    }
  });
  app2.get("/api/quotes", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { status, customerId } = req.query;
      const list = await getQuotesByBusiness(business.id, { status, customerId });
      const customerIds = [...new Set(list.filter((q) => q.customerId).map((q) => q.customerId))];
      const customerMap = {};
      for (const cid of customerIds) {
        const c = await getCustomerById(cid);
        if (c) customerMap[cid] = `${c.firstName} ${c.lastName}`.trim();
      }
      const enriched = list.map((q) => ({
        ...q,
        customerName: q.customerId ? customerMap[q.customerId] || null : null
      }));
      return res.json(enriched);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get quotes" });
    }
  });
  app2.get("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      const q = await getQuoteById(req.params.id);
      if (!q) return res.status(404).json({ message: "Quote not found" });
      const lineItems = await getLineItemsByQuote(q.id);
      let customerAddress = "";
      let customerName = "";
      let customerEmail = "";
      let customerPhone = "";
      if (q.customerId) {
        const custResult = await pool.query(
          `SELECT address, first_name, last_name, email, phone FROM customers WHERE id = $1`,
          [q.customerId]
        );
        if (custResult.rows.length > 0) {
          const c = custResult.rows[0];
          customerAddress = c.address || "";
          customerName = [c.first_name, c.last_name].filter(Boolean).join(" ");
          customerEmail = c.email || "";
          customerPhone = c.phone || "";
        }
      }
      return res.json({
        ...q,
        lineItems,
        address: customerAddress,
        customerName: customerName || q.propertyDetails?.customerName || "",
        customerEmail: customerEmail || q.propertyDetails?.customerEmail || "",
        customerPhone: customerPhone || q.propertyDetails?.customerPhone || ""
      });
    } catch (error) {
      return res.status(500).json({ message: "Failed to get quote" });
    }
  });
  app2.get("/api/quotes/count", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const allQuotes = await getQuotesByBusiness(business.id);
      const user = await getUserById(req.session.userId);
      const tier = user?.subscriptionTier || "free";
      const isPaid = isGrowthOrAbove(tier);
      const isStarter = tier === "starter";
      const limit = isStarter ? 20 : isPaid ? Infinity : 3;
      return res.json({ count: allQuotes.length, limit: limit === Infinity ? null : limit, isPro: isPaid });
    } catch (error) {
      return res.status(500).json({ message: "Failed to get quote count" });
    }
  });
  app2.post("/api/quotes", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const user = await getUserById(req.session.userId);
      if (user && !isGrowthOrAbove(user.subscriptionTier)) {
        const existingQuotes = await getQuotesByBusiness(business.id);
        const FREE_TRIAL_DAYS = 14;
        const userAgeDays = user.createdAt ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 864e5) : 999;
        const isInFreeTrial = user.subscriptionTier === "free" && userAgeDays < FREE_TRIAL_DAYS;
        const quoteCap = user.subscriptionTier === "starter" ? 20 : isInFreeTrial ? 20 : 3;
        if (existingQuotes.length >= quoteCap) {
          return res.status(403).json({
            message: user.subscriptionTier === "starter" ? `You've reached your ${quoteCap} quote monthly limit. Upgrade to Growth for unlimited quotes.` : isInFreeTrial ? `You've used all ${quoteCap} trial quotes. Upgrade to continue quoting.` : `You've used ${quoteCap} of ${quoteCap} free quotes. Upgrade to Growth for unlimited quotes.`,
            quoteLimitReached: true
          });
        }
      }
      const rules = await getAutomationRules(business.id);
      const qPrefs = business.quotePreferences;
      const expirationDays = qPrefs?.defaultExpirationDays ?? rules?.quoteExpirationDays ?? 14;
      let expiresAt;
      if (expirationDays > 0) {
        expiresAt = /* @__PURE__ */ new Date();
        expiresAt.setDate(expiresAt.getDate() + expirationDays);
      }
      const q = await createQuote({ ...req.body, businessId: business.id, expiresAt });
      if (req.body.lineItems) {
        for (const li of req.body.lineItems) {
          await createLineItem({ ...li, quoteId: q.id });
        }
      }
      dispatchWebhook(business.id, req.session.userId, "quote.created", { quoteId: q.id, total: q.total, status: q.status }).catch(() => {
      });
      return res.json(q);
    } catch (error) {
      console.error("Create quote error:", error);
      return res.status(500).json({ message: "Failed to create quote" });
    }
  });
  app2.put("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      const { lineItems, ...data } = req.body;
      const dateFields = ["acceptedAt", "declinedAt", "sentAt", "expiresAt", "lastContactAt"];
      for (const field of dateFields) {
        if (typeof data[field] === "string") {
          data[field] = new Date(data[field]);
        }
      }
      const oldQuote = await getQuoteById(req.params.id);
      const q = await updateQuote(req.params.id, data);
      if (lineItems) {
        await deleteLineItemsByQuote(q.id);
        for (const li of lineItems) {
          await createLineItem({ ...li, quoteId: q.id });
        }
      }
      if (data.status && oldQuote && data.status !== oldQuote.status) {
        const eventMap = { sent: "quote.sent", accepted: "quote.accepted", declined: "quote.declined" };
        const eventType = eventMap[data.status];
        if (eventType && q.businessId) {
          dispatchWebhook(q.businessId, req.session.userId, eventType, { quoteId: q.id, total: q.total, status: q.status }).catch(() => {
          });
        }
        if (data.status === "accepted") {
          pool.query(
            `SELECT auto_create_invoice FROM qbo_connections WHERE user_id = $1 AND status = 'connected'`,
            [req.session.userId]
          ).then((connResult) => {
            if (connResult.rows.length > 0 && connResult.rows[0].auto_create_invoice) {
              createQBOInvoiceForQuote(req.session.userId, q.id).catch((err) => {
                console.error("Auto QBO invoice creation failed:", err.message);
                logSync(req.session.userId, q.id, "create_invoice", { auto: true }, { error: err.message }, "failed", err.message);
              });
            }
          }).catch(() => {
          });
          pool.query(
            `SELECT auto_create_job_on_quote_accept FROM jobber_connections WHERE user_id = $1 AND status = 'connected'`,
            [req.session.userId]
          ).then((jobberResult) => {
            if (jobberResult.rows.length > 0 && jobberResult.rows[0].auto_create_job_on_quote_accept) {
              syncQuoteToJobber(req.session.userId, q.id, "automatic").catch((err) => {
                console.error("Auto Jobber sync failed:", err.message);
              });
            }
          }).catch(() => {
          });
        }
      }
      return res.json(q);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update quote" });
    }
  });
  app2.post("/api/quotes/:id/send", requireAuth, async (req, res) => {
    try {
      const { channel, content } = req.body;
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const quote = await getQuoteById(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      const q = await updateQuote(req.params.id, {
        status: "sent",
        sentVia: channel,
        sentAt: /* @__PURE__ */ new Date()
      });
      await createCommunication({
        businessId: business.id,
        customerId: quote.customerId || void 0,
        quoteId: quote.id,
        channel: channel || "sms",
        content: content || "",
        status: "sent"
      });
      const rules = await getAutomationRules(business.id);
      const followupsEnabled = !rules || rules.quoteFollowupsEnabled !== false;
      if (followupsEnabled) {
        const existingScheduled = await getScheduledFollowUpsForQuote(quote.id);
        if (existingScheduled.length === 0) {
          const firstStep = rules?.followupSchedule?.[0];
          const delayMinutes = firstStep?.delayMinutes ?? 1440;
          const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1e3);
          const followupChannel = rules?.followupChannel || channel || "sms";
          await createCommunication({
            businessId: business.id,
            customerId: quote.customerId || void 0,
            quoteId: quote.id,
            channel: followupChannel,
            content: "",
            status: "queued",
            scheduledFor
          });
        }
      }
      return res.json(q);
    } catch (error) {
      console.error("Send quote error:", error);
      return res.status(500).json({ message: "Failed to send quote" });
    }
  });
  app2.delete("/api/quotes/:id", requireAuth, async (req, res) => {
    try {
      await deleteQuote(req.params.id);
      return res.json({ message: "Deleted" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to delete quote" });
    }
  });
  app2.get("/api/public/quote/:token", async (req, res) => {
    try {
      const q = await getQuoteByToken(req.params.token);
      if (!q) return res.status(404).json({ message: "Quote not found" });
      const business = await db_getBusinessById(q.businessId);
      const customer = q.customerId ? await getCustomerById(q.customerId) : null;
      const lineItems = await getLineItemsByQuote(q.id);
      const qpPreview = business?.quotePreferences;
      return res.json({
        quote: {
          id: q.id,
          options: q.options,
          selectedOption: q.selectedOption,
          addOns: q.addOns,
          frequencySelected: q.frequencySelected,
          subtotal: q.subtotal,
          tax: q.tax,
          total: q.total,
          status: q.status,
          expiresAt: q.expiresAt,
          lineItems,
          paymentStatus: q.paymentStatus,
          paidAt: q.paidAt
        },
        business: business ? {
          companyName: business.companyName,
          email: business.email,
          phone: business.phone,
          logoUri: business.logoUri,
          primaryColor: qpPreview?.brandColor || business.primaryColor,
          senderName: business.senderName,
          senderTitle: business.senderTitle
        } : null,
        customer: customer ? { firstName: customer.firstName, lastName: customer.lastName } : null,
        paymentEnabled: !!(business?.stripeAccountId && business?.stripeOnboardingComplete)
      });
    } catch (error) {
      console.error("Public quote error:", error);
      return res.status(500).json({ message: "Failed to load quote" });
    }
  });
  app2.post("/api/public/quote/:token/respond", async (req, res) => {
    try {
      const { action } = req.body;
      const q = await getQuoteByToken(req.params.token);
      if (!q) return res.status(404).json({ message: "Quote not found" });
      if (q.status !== "sent") {
        return res.status(400).json({ message: "Quote is no longer open for response" });
      }
      if (action === "accept") {
        await updateQuote(q.id, { status: "accepted", acceptedAt: /* @__PURE__ */ new Date() });
        await cancelPendingCommunicationsForQuote(q.id);
        if (q.customerId) {
          await updateCustomer(q.customerId, { status: "active" });
        }
      } else if (action === "decline") {
        await updateQuote(q.id, { status: "declined", declinedAt: /* @__PURE__ */ new Date() });
        await cancelPendingCommunicationsForQuote(q.id);
      }
      return res.json({ message: "Response recorded" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to respond to quote" });
    }
  });
  app2.get("/api/jobs", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { status, customerId, from, to } = req.query;
      const list = await getJobsByBusiness(business.id, {
        status,
        customerId,
        from: from ? new Date(from) : void 0,
        to: to ? new Date(to) : void 0
      });
      return res.json(list);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get jobs" });
    }
  });
  app2.get("/api/jobs/:id", requireAuth, async (req, res) => {
    try {
      const j = await getJobById(req.params.id);
      if (!j) return res.status(404).json({ message: "Job not found" });
      const checklist = await getChecklistByJob(j.id);
      let customer = null;
      if (j.customerId) {
        const c = await getCustomerById(j.customerId);
        if (c) customer = { firstName: c.firstName, lastName: c.lastName, phone: c.phone, email: c.email };
      }
      return res.json({ ...j, checklist, customer });
    } catch (error) {
      return res.status(500).json({ message: "Failed to get job" });
    }
  });
  app2.post("/api/jobs", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const j = await createJob({
        ...req.body,
        businessId: business.id,
        startDatetime: new Date(req.body.startDatetime),
        endDatetime: req.body.endDatetime ? new Date(req.body.endDatetime) : void 0
      });
      if (req.body.checklist) {
        for (let i = 0; i < req.body.checklist.length; i++) {
          await createChecklistItem({
            jobId: j.id,
            label: req.body.checklist[i].label || req.body.checklist[i],
            sortOrder: i
          });
        }
      }
      try {
        let customerName = "Customer";
        if (j.customerId) {
          const customer = await getCustomerById(j.customerId);
          if (customer) customerName = `${customer.firstName} ${customer.lastName}`.trim();
        }
        await syncJobToGoogleCalendar(req.session.userId, j, customerName);
      } catch (calErr) {
        console.error("Auto calendar sync error (create):", calErr);
      }
      return res.json(j);
    } catch (error) {
      console.error("Create job error:", error);
      return res.status(500).json({ message: "Failed to create job" });
    }
  });
  app2.put("/api/jobs/:id", requireAuth, async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.startDatetime) data.startDatetime = new Date(data.startDatetime);
      if (data.endDatetime) data.endDatetime = new Date(data.endDatetime);
      const j = await updateJob(req.params.id, data);
      try {
        let customerName = "Customer";
        if (j.customerId) {
          const customer = await getCustomerById(j.customerId);
          if (customer) customerName = `${customer.firstName} ${customer.lastName}`.trim();
        }
        await syncJobToGoogleCalendar(req.session.userId, j, customerName);
      } catch (calErr) {
        console.error("Auto calendar sync error (update):", calErr);
      }
      return res.json(j);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update job" });
    }
  });
  app2.delete("/api/jobs/:id", requireAuth, async (req, res) => {
    try {
      await deleteJob(req.params.id);
      return res.json({ message: "Deleted" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to delete job" });
    }
  });
  app2.post("/api/jobs/:jobId/checklist", requireAuth, async (req, res) => {
    try {
      const item = await createChecklistItem({ jobId: req.params.jobId, ...req.body });
      return res.json(item);
    } catch (error) {
      return res.status(500).json({ message: "Failed to create checklist item" });
    }
  });
  app2.put("/api/checklist/:id", requireAuth, async (req, res) => {
    try {
      const item = await updateChecklistItem(req.params.id, req.body);
      return res.json(item);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update checklist item" });
    }
  });
  app2.delete("/api/checklist/:id", requireAuth, async (req, res) => {
    try {
      await deleteChecklistItem(req.params.id);
      return res.json({ message: "Deleted" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to delete checklist item" });
    }
  });
  app2.get("/api/jobs/:jobId/photos", requireAuth, async (req, res) => {
    try {
      const photos = await getPhotosByJob(req.params.jobId);
      return res.json(photos);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get photos" });
    }
  });
  app2.post("/api/jobs/:jobId/photos", requireAuth, async (req, res) => {
    try {
      const { photoData, photoType, caption } = req.body;
      if (!photoData) return res.status(400).json({ message: "Photo data required" });
      const fs2 = await import("fs");
      const path2 = await import("path");
      const uploadsDir = path2.join(process.cwd(), "uploads", "job-photos");
      if (!fs2.existsSync(uploadsDir)) {
        fs2.mkdirSync(uploadsDir, { recursive: true });
      }
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const filePath = path2.join(uploadsDir, fileName);
      const base64Data = photoData.replace(/^data:image\/\w+;base64,/, "");
      fs2.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
      const photoUrl = `/uploads/job-photos/${fileName}`;
      const photo = await createJobPhoto({
        jobId: req.params.jobId,
        photoUrl,
        photoType: photoType || "after",
        caption: caption || ""
      });
      return res.json(photo);
    } catch (error) {
      console.error("Photo upload error:", error);
      return res.status(500).json({ message: "Failed to upload photo" });
    }
  });
  app2.delete("/api/photos/:id", requireAuth, async (req, res) => {
    try {
      await deleteJobPhoto(req.params.id);
      return res.json({ message: "Deleted" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to delete photo" });
    }
  });
  app2.post("/api/jobs/:id/start", requireAuth, async (req, res) => {
    try {
      const job = await getJobById(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
      if (job.status !== "scheduled") {
        return res.status(409).json({ message: `Cannot start a job that is ${job.status}` });
      }
      const updatedJob = await updateJob(req.params.id, {
        status: "in_progress",
        startedAt: /* @__PURE__ */ new Date()
      });
      return res.json(updatedJob);
    } catch (error) {
      return res.status(500).json({ message: "Failed to start job" });
    }
  });
  app2.post("/api/jobs/:id/complete", requireAuth, async (req, res) => {
    try {
      const job = await getJobById(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
      if (job.status === "completed" || job.status === "canceled") {
        return res.status(409).json({ message: `Cannot complete a job that is ${job.status}` });
      }
      const now = /* @__PURE__ */ new Date();
      const updatedJob = await updateJob(req.params.id, {
        status: "completed",
        startedAt: job.startedAt || now,
        completedAt: now,
        endDatetime: now
      });
      let nextJob = null;
      if (job.recurrence && job.recurrence !== "none") {
        const currentDate = new Date(job.startDatetime);
        let nextDate;
        switch (job.recurrence) {
          case "weekly":
            nextDate = new Date(currentDate);
            nextDate.setDate(nextDate.getDate() + 7);
            break;
          case "biweekly":
            nextDate = new Date(currentDate);
            nextDate.setDate(nextDate.getDate() + 14);
            break;
          case "monthly":
            nextDate = new Date(currentDate);
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
          case "quarterly":
            nextDate = new Date(currentDate);
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
          default:
            nextDate = new Date(currentDate);
            nextDate.setDate(nextDate.getDate() + 7);
        }
        nextJob = await createJob({
          businessId: job.businessId,
          customerId: job.customerId || void 0,
          quoteId: job.quoteId || void 0,
          jobType: job.jobType,
          startDatetime: nextDate,
          recurrence: job.recurrence,
          internalNotes: job.internalNotes,
          address: job.address,
          total: job.total || void 0
        });
        const checklist = await getChecklistByJob(job.id);
        for (let i = 0; i < checklist.length; i++) {
          await createChecklistItem({
            jobId: nextJob.id,
            label: checklist[i].label,
            sortOrder: checklist[i].sortOrder
          });
        }
      }
      let ratingUrl = null;
      if (updatedJob.ratingToken) {
        ratingUrl = `${getPublicBaseUrl(req)}/rate/${updatedJob.ratingToken}`;
      }
      return res.json({
        completedJob: updatedJob,
        nextJob,
        ratingUrl,
        message: nextJob ? `Job completed! Next ${job.recurrence} job scheduled.` : "Job completed!"
      });
    } catch (error) {
      console.error("Complete job error:", error);
      return res.status(500).json({ message: "Failed to complete job" });
    }
  });
  app2.post("/api/jobs/:id/rate", requireAuth, async (req, res) => {
    try {
      const { rating, comment } = req.body;
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      const job = await getJobById(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
      const updated = await rateJob(req.params.id, rating, comment);
      return res.json(updated);
    } catch (error) {
      console.error("Rate job error:", error);
      return res.status(500).json({ message: "Failed to rate job" });
    }
  });
  app2.get("/api/ratings/summary", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const summary = await getRatingsSummary(business.id);
      return res.json(summary);
    } catch (error) {
      console.error("Ratings summary error:", error);
      return res.status(500).json({ message: "Failed to get ratings summary" });
    }
  });
  app2.post("/api/jobs/:id/generate-update-token", requireAuth, async (req, res) => {
    try {
      const job = await getJobById(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
      const existing = await pool.query(`SELECT update_token FROM jobs WHERE id = $1`, [req.params.id]);
      if (existing.rows[0]?.update_token && existing.rows[0].update_token.length <= 16) {
        return res.json({ token: existing.rows[0].update_token });
      }
      const crypto3 = await import("crypto");
      const token = crypto3.randomBytes(8).toString("hex");
      await pool.query(`UPDATE jobs SET update_token = $1 WHERE id = $2`, [token, req.params.id]);
      return res.json({ token });
    } catch (error) {
      console.error("Generate update token error:", error);
      return res.status(500).json({ message: "Failed to generate update token" });
    }
  });
  app2.get("/api/jobs/:id/update-token", requireAuth, async (req, res) => {
    try {
      const result = await pool.query(`SELECT update_token FROM jobs WHERE id = $1`, [req.params.id]);
      return res.json({ token: result.rows[0]?.update_token || null });
    } catch (error) {
      return res.status(500).json({ message: "Failed to get update token" });
    }
  });
  const MANUAL_CLEANER_STATUSES = ["scheduled", "en_route", "service_started", "completed"];
  function getAutoProgressTiming(jobType) {
    if (jobType === "deep_clean" || jobType === "move_in_out") {
      return { inProgressMinutes: 45, finalTouchesMinutes: 90 };
    }
    return { inProgressMinutes: 30, finalTouchesMinutes: 60 };
  }
  function computeAutoProgressStatus(detailedStatus, jobType, serviceStartedAt, completedAt) {
    if (detailedStatus === "completed" || completedAt) return "completed";
    if (!serviceStartedAt || detailedStatus === "scheduled" || detailedStatus === "en_route") {
      return detailedStatus;
    }
    const { inProgressMinutes, finalTouchesMinutes } = getAutoProgressTiming(jobType || "regular");
    const elapsedMs = Date.now() - serviceStartedAt.getTime();
    const elapsedMinutes = elapsedMs / 6e4;
    if (elapsedMinutes >= finalTouchesMinutes) return "final_touches";
    if (elapsedMinutes >= inProgressMinutes) return "in_progress";
    return "service_started";
  }
  app2.post("/api/jobs/:id/update-status", requireAuth, async (req, res) => {
    try {
      const { status, note } = req.body;
      if (!status) return res.status(400).json({ message: "Status is required" });
      const validStatuses = ["scheduled", "en_route", "service_started", "in_progress", "final_touches", "completed"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const job = await getJobById(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
      await pool.query(`UPDATE jobs SET detailed_status = $1, updated_at = NOW() WHERE id = $2`, [status, req.params.id]);
      const coreStatus = status === "completed" ? "completed" : status === "scheduled" ? "scheduled" : "in_progress";
      await pool.query(`UPDATE jobs SET status = $1 WHERE id = $2`, [coreStatus, req.params.id]);
      if (status === "en_route") {
        await pool.query(`UPDATE jobs SET started_at = COALESCE(started_at, NOW()), en_route_at = COALESCE(en_route_at, NOW()) WHERE id = $1`, [req.params.id]);
      }
      if (status === "service_started") {
        await pool.query(`UPDATE jobs SET started_at = COALESCE(started_at, NOW()), service_started_at = COALESCE(service_started_at, NOW()) WHERE id = $1`, [req.params.id]);
      }
      if (status === "completed") {
        await pool.query(`UPDATE jobs SET completed_at = COALESCE(completed_at, NOW()) WHERE id = $1`, [req.params.id]);
      }
      await pool.query(
        `INSERT INTO job_status_history (id, job_id, status, note, created_at, auto_generated) VALUES (gen_random_uuid(), $1, $2, $3, NOW(), false)`,
        [req.params.id, status, note || ""]
      );
      const updated = await getJobById(req.params.id);
      return res.json(updated);
    } catch (error) {
      console.error("Update job status error:", error);
      return res.status(500).json({ message: "Failed to update status" });
    }
  });
  app2.get("/api/jobs/:id/timeline", requireAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM job_status_history WHERE job_id = $1 ORDER BY created_at ASC`,
        [req.params.id]
      );
      return res.json(result.rows);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get timeline" });
    }
  });
  app2.post("/api/jobs/:id/notes", requireAuth, async (req, res) => {
    try {
      const { content, customerVisible } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Content is required" });
      const result = await pool.query(
        `INSERT INTO job_notes (id, job_id, content, customer_visible, created_at) VALUES (gen_random_uuid(), $1, $2, $3, NOW()) RETURNING *`,
        [req.params.id, content.trim(), customerVisible || false]
      );
      return res.json(result.rows[0]);
    } catch (error) {
      return res.status(500).json({ message: "Failed to create note" });
    }
  });
  app2.get("/api/jobs/:id/notes", requireAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT * FROM job_notes WHERE job_id = $1 ORDER BY created_at DESC`,
        [req.params.id]
      );
      return res.json(result.rows);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get notes" });
    }
  });
  app2.delete("/api/jobs/:id/notes/:noteId", requireAuth, async (req, res) => {
    try {
      await pool.query(`DELETE FROM job_notes WHERE id = $1 AND job_id = $2`, [req.params.noteId, req.params.id]);
      return res.json({ message: "Deleted" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to delete note" });
    }
  });
  app2.post("/api/ai/job-update-message", requireAuth, requirePro, async (req, res) => {
    try {
      const { type, customerName, companyName, senderName, updateLink, language: commLang } = req.body;
      if (!type || !updateLink) return res.status(400).json({ message: "type and updateLink are required" });
      const langInstruction = commLang === "es" ? " Write entirely in Spanish." : " Write entirely in English.";
      let systemPrompt;
      let userPrompt;
      if (type === "sms") {
        systemPrompt = `Write a very short SMS (2-3 sentences max) for a cleaning company. No emojis. Be warm but extremely brief. IMPORTANT: Start with "Hi ${customerName || "there"}, this is ${senderName || "your team"} from ${companyName || "our company"}." Then one short sentence about tracking their service, then the link. Nothing else.${langInstruction}`;
        userPrompt = `SMS with this link: ${updateLink}. Reply with ONLY the message text. Keep it under 200 characters excluding the link.`;
      } else {
        systemPrompt = `Write a short professional email (under 120 words) for "${companyName || "our company"}". Sign as "${senderName || "Team"}". No emojis. Include this link: ${updateLink}. Start with "Subject: " on line 1, blank line, then body. IMPORTANT: The greeting MUST introduce the sender and company name, e.g. "Hi [name], this is [sender] from ${companyName || "our company"}"${langInstruction}`;
        userPrompt = `Email telling ${customerName || "Customer"} their live service update page is ready. They can view real-time service details, progress updates, checklist items, and completion photos. Reply with ONLY the email, nothing else.`;
      }
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_completion_tokens: type === "sms" ? 100 : 250
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) return res.status(500).json({ message: "No response from AI" });
      return res.json({ draft: content.trim() });
    } catch (error) {
      console.error("Job update message error:", error);
      return res.status(500).json({ message: "Failed to generate message" });
    }
  });
  app2.get("/api/public/job-updates/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const jobResult = await pool.query(
        `SELECT j.*, c.first_name as customer_first_name, c.last_name as customer_last_name,
                b.id as bid, b.owner_user_id
         FROM jobs j
         LEFT JOIN customers c ON j.customer_id = c.id
         LEFT JOIN businesses b ON j.business_id = b.id
         WHERE j.update_token = $1`,
        [token]
      );
      if (jobResult.rows.length === 0) return res.status(404).json({ message: "Not found" });
      const job = jobResult.rows[0];
      let profile = {};
      try {
        const businessProfile = await pool.query(
          `SELECT * FROM business_profiles WHERE user_id = $1`,
          [job.owner_user_id]
        );
        profile = businessProfile.rows[0] || {};
      } catch (profileErr) {
        if (profileErr.code !== "42P01") throw profileErr;
      }
      if (!profile.company_name && job.bid) {
        try {
          const biz = await pool.query(`SELECT company_name FROM businesses WHERE id = $1`, [job.bid]);
          if (biz.rows[0]?.company_name) profile.company_name = biz.rows[0].company_name;
        } catch (_) {
        }
      }
      const timeline = await pool.query(
        `SELECT * FROM job_status_history WHERE job_id = $1 ORDER BY created_at ASC`,
        [job.id]
      );
      const checklist = await pool.query(
        `SELECT * FROM job_checklist_items WHERE job_id = $1 AND customer_visible = true ORDER BY room_group, sort_order`,
        [job.id]
      );
      const photos = await pool.query(
        `SELECT * FROM job_photos WHERE job_id = $1 AND customer_visible = true ORDER BY created_at DESC`,
        [job.id]
      );
      const notes = await pool.query(
        `SELECT * FROM job_notes WHERE job_id = $1 AND customer_visible = true ORDER BY created_at DESC`,
        [job.id]
      );
      const serviceStartedAt = job.service_started_at ? new Date(job.service_started_at) : null;
      const completedAt = job.completed_at ? new Date(job.completed_at) : null;
      const computedStatus = computeAutoProgressStatus(
        job.detailed_status || job.status || "scheduled",
        job.job_type || "regular",
        serviceStartedAt,
        completedAt
      );
      const STATUS_ORDER = ["scheduled", "en_route", "service_started", "in_progress", "final_touches", "completed"];
      const dbStatusIdx = STATUS_ORDER.indexOf(job.detailed_status || "scheduled");
      const computedStatusIdx = STATUS_ORDER.indexOf(computedStatus);
      if (computedStatusIdx > dbStatusIdx && !completedAt) {
        try {
          await pool.query(
            `UPDATE jobs SET detailed_status = $1, updated_at = NOW() WHERE id = $2`,
            [computedStatus, job.id]
          );
          for (let i = dbStatusIdx + 1; i <= computedStatusIdx; i++) {
            const autoStatus = STATUS_ORDER[i];
            if (autoStatus !== "in_progress" && autoStatus !== "final_touches") continue;
            const existing = timeline.rows.find((r) => r.status === autoStatus && r.auto_generated);
            if (!existing) {
              const { inProgressMinutes, finalTouchesMinutes } = getAutoProgressTiming(job.job_type || "regular");
              const minutesOffset = autoStatus === "in_progress" ? inProgressMinutes : finalTouchesMinutes;
              const autoTimestamp = new Date(serviceStartedAt.getTime() + minutesOffset * 6e4);
              await pool.query(
                `INSERT INTO job_status_history (id, job_id, status, note, created_at, auto_generated) VALUES (gen_random_uuid(), $1, $2, $3, $4, true)`,
                [job.id, autoStatus, "", autoTimestamp]
              );
            }
          }
          const updatedTimeline = await pool.query(
            `SELECT * FROM job_status_history WHERE job_id = $1 ORDER BY created_at ASC`,
            [job.id]
          );
          timeline.rows = updatedTimeline.rows;
        } catch (autoErr) {
          console.warn("Auto-progression write error:", autoErr.message);
        }
      }
      const effectiveDetailedStatus = computedStatus;
      const { inProgressMinutes: ipm, finalTouchesMinutes: ftm } = getAutoProgressTiming(job.job_type || "regular");
      return res.json({
        jobType: job.job_type,
        status: job.status,
        detailedStatus: effectiveDetailedStatus,
        startDatetime: job.start_datetime,
        endDatetime: job.end_datetime,
        address: job.address,
        total: job.total,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        serviceStartedAt: job.service_started_at || null,
        autoProgressTiming: { inProgressMinutes: ipm, finalTouchesMinutes: ftm },
        companyName: profile.company_name || "Cleaning Service",
        companyLogo: profile.logo_url || null,
        brandColor: profile.brand_color || "#2563EB",
        customerName: `${job.customer_first_name || ""} ${job.customer_last_name || ""}`.trim() || "Customer",
        timeline: timeline.rows,
        checklist: checklist.rows,
        photos: photos.rows.map((p) => ({
          ...p,
          photo_url: p.photo_url
        })),
        notes: notes.rows
      });
    } catch (error) {
      console.error("Public job update error:", error);
      return res.status(500).json({ message: "Failed to load job update" });
    }
  });
  app2.get("/job-updates/:token", (req, res) => {
    res.redirect(301, `/j/${req.params.token}`);
  });
  app2.get("/j/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const jobResult = await pool.query(
        `SELECT j.id FROM jobs j WHERE j.update_token = $1`,
        [token]
      );
      if (jobResult.rows.length === 0) {
        return res.status(404).send("<html><body><h1>Update page not found</h1></body></html>");
      }
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const apiUrl = `${baseUrl}/api/public/job-updates/${token}`;
      const assetsBase = baseUrl;
      res.send(generateJobUpdatePageHtml(apiUrl, assetsBase, token));
    } catch (error) {
      console.error("Job update page error:", error);
      return res.status(500).send("<html><body><h1>Error loading update page</h1></body></html>");
    }
  });
  function generateJobUpdatePageHtml(apiUrl, assetsBase, token) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live Service Update</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F8FAFC; color: #1E293B; min-height: 100vh; }
    .header { padding: 24px 20px 20px; text-align: center; color: white; position: relative; }
    .header::after { content: ''; position: absolute; bottom: -20px; left: 0; right: 0; height: 40px; background: inherit; border-radius: 0 0 24px 24px; }
    .logo-container { width: 56px; height: 56px; border-radius: 16px; background: rgba(255,255,255,0.2); margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; overflow: hidden; backdrop-filter: blur(10px); }
    .logo-container img { width: 100%; height: 100%; object-fit: cover; }
    .logo-placeholder { font-size: 24px; font-weight: 700; color: white; }
    .company-name { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
    .container { max-width: 480px; margin: 0 auto; padding: 8px 16px 40px; }
    .card { background: white; border-radius: 16px; padding: 20px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .card-title { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #94A3B8; margin-bottom: 12px; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; }
    .progress-bar-bg { width: 100%; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden; margin-top: 12px; }
    .progress-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
    .progress-pct { font-size: 28px; font-weight: 700; margin-top: 4px; }
    .detail-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #F1F5F9; }
    .detail-row:last-child { border-bottom: none; }
    .detail-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
    .detail-label { font-size: 12px; color: #94A3B8; }
    .detail-value { font-size: 14px; font-weight: 500; }
    .timeline-item { display: flex; gap: 12px; padding-bottom: 16px; position: relative; }
    .timeline-item:not(:last-child)::after { content: ''; position: absolute; left: 15px; top: 32px; bottom: 0; width: 2px; background: #E2E8F0; }
    .timeline-dot { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 14px; }
    .timeline-content { flex: 1; padding-top: 4px; }
    .timeline-status { font-size: 14px; font-weight: 600; }
    .timeline-time { font-size: 12px; color: #94A3B8; margin-top: 2px; }
    .timeline-note { font-size: 13px; color: #64748B; margin-top: 4px; }
    .checklist-group { margin-bottom: 16px; }
    .checklist-group-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
    .checklist-count { font-size: 12px; color: #94A3B8; font-weight: 400; }
    .checklist-item { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
    .check-icon { width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; }
    .check-done { background: #10B981; color: white; }
    .check-pending { background: #E2E8F0; color: #94A3B8; }
    .checklist-label { font-size: 14px; }
    .checklist-label.done { text-decoration: line-through; color: #94A3B8; }
    .photo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .photo-item { border-radius: 12px; overflow: hidden; aspect-ratio: 1; position: relative; }
    .photo-item img { width: 100%; height: 100%; object-fit: cover; }
    .photo-badge { position: absolute; bottom: 6px; left: 6px; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; color: white; }
    .note-item { padding: 12px; background: #F8FAFC; border-radius: 10px; margin-bottom: 8px; font-size: 14px; line-height: 1.5; }
    .note-time { font-size: 11px; color: #94A3B8; margin-top: 4px; }
    .completed-banner { text-align: center; padding: 24px; background: linear-gradient(135deg, #10B981, #059669); color: white; border-radius: 16px; margin-bottom: 12px; }
    .completed-banner h2 { font-size: 20px; margin-bottom: 4px; }
    .completed-banner p { font-size: 14px; opacity: 0.9; }
    .pulse { animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
    .loading { text-align: center; padding: 40px; color: #94A3B8; }
    .empty-state { text-align: center; padding: 20px; color: #94A3B8; font-size: 14px; }
  </style>
</head>
<body>
  <div id="app">
    <div class="loading"><p>Loading service update...</p></div>
  </div>
  <script>
    const API_URL = "${apiUrl}";
    const ASSETS_BASE = "${assetsBase}";

    const STATUS_LABELS = {
      scheduled: "Scheduled",
      en_route: "En Route",
      service_started: "Service Started",
      in_progress: "In Progress",
      final_touches: "Final Touches",
      completed: "Completed"
    };

    const STATUS_COLORS = {
      scheduled: { bg: "#EFF6FF", text: "#2563EB", dot: "#2563EB" },
      en_route: { bg: "#FFF7ED", text: "#EA580C", dot: "#EA580C" },
      service_started: { bg: "#F0FDF4", text: "#16A34A", dot: "#16A34A" },
      in_progress: { bg: "#FFFBEB", text: "#D97706", dot: "#D97706" },
      final_touches: { bg: "#FAF5FF", text: "#9333EA", dot: "#9333EA" },
      completed: { bg: "#F0FDF4", text: "#16A34A", dot: "#16A34A" }
    };

    const STATUS_ICONS = {
      scheduled: "&#128197;",
      en_route: "&#128663;",
      service_started: "&#9989;",
      in_progress: "&#128736;",
      final_touches: "&#10024;",
      completed: "&#127937;"
    };

    function getProgress(status) {
      const map = { scheduled: 0, en_route: 15, service_started: 30, in_progress: 55, final_touches: 80, completed: 100 };
      return map[status] || 0;
    }

    function formatTime(dateStr) {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function formatDate(dateStr) {
      const d = new Date(dateStr);
      const opts = { weekday: 'short', month: 'short', day: 'numeric' };
      return d.toLocaleDateString(undefined, opts);
    }

    function formatDateTime(dateStr) {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' at ' + formatTime(dateStr);
    }

    function formatMinutes(mins) {
      if (mins >= 60) {
        var h = Math.floor(mins / 60);
        var m = mins % 60;
        return m > 0 ? h + 'h ' + m + 'm' : h + 'h';
      }
      return mins + ' min';
    }

    // Live smooth progress bar animation
    function getLiveProgress(data) {
      var status = data.detailedStatus || data.status || "scheduled";
      if (status === "completed") return 100;
      if (!data.serviceStartedAt) return getProgress(status);
      var started = new Date(data.serviceStartedAt).getTime();
      var now = Date.now();
      var elapsedMs = now - started;
      var timing = data.autoProgressTiming || { inProgressMinutes: 30, finalTouchesMinutes: 60 };
      var ipMs = timing.inProgressMinutes * 60000;
      var ftMs = timing.finalTouchesMinutes * 60000;
      // Interpolate smoothly through the three active zones
      if (elapsedMs < ipMs) {
        // service_started \u2192 in_progress: 30% \u2192 55%
        return 30 + Math.min(25, (elapsedMs / ipMs) * 25);
      } else if (elapsedMs < ftMs) {
        // in_progress \u2192 final_touches: 55% \u2192 80%
        return 55 + Math.min(25, ((elapsedMs - ipMs) / (ftMs - ipMs)) * 25);
      } else {
        // final_touches \u2192 80% and holding until cleaner taps Complete
        return 80;
      }
    }

    function render(data) {
      const status = data.detailedStatus || data.status || "scheduled";
      const sc = STATUS_COLORS[status] || STATUS_COLORS.scheduled;
      const rawProgress = getProgress(status);
      const liveProgress = status !== "completed" && data.serviceStartedAt ? getLiveProgress(data) : rawProgress;
      const progress = Math.round(liveProgress);
      const brandColor = data.brandColor || "#2563EB";
      const isComplete = status === "completed";

      let html = '<div class="header" style="background:' + brandColor + '">';
      if (data.companyLogo) {
        html += '<div class="logo-container"><img src="' + ASSETS_BASE + data.companyLogo + '" alt="Logo"></div>';
      } else {
        html += '<div class="logo-container"><span class="logo-placeholder">' + (data.companyName || "C").charAt(0) + '</span></div>';
      }
      html += '<div class="company-name">' + (data.companyName || "Cleaning Service") + '</div>';
      html += '</div><div class="container">';

      if (isComplete) {
        html += '<div class="completed-banner"><h2>Service Complete</h2><p>Your cleaning has been finished</p></div>';
      }

      // Status & Progress
      html += '<div class="card">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center">';
      html += '<div><div class="card-title">Status</div>';
      html += '<div class="status-badge" style="background:' + sc.bg + ';color:' + sc.text + '">';
      if (!isComplete) html += '<span class="status-dot pulse" style="background:' + sc.dot + '"></span>';
      html += (STATUS_LABELS[status] || status) + '</div></div>';
      html += '<div style="text-align:right"><div class="progress-pct" style="color:' + brandColor + '">' + progress + '%</div></div>';
      html += '</div>';
      html += '<div class="progress-bar-bg"><div class="progress-bar-fill" style="width:' + progress + '%;background:' + brandColor + '"></div></div>';
      html += '</div>';

      // Details
      html += '<div class="card"><div class="card-title">Service Details</div>';
      var jobTypes = { regular: "Standard Cleaning", deep_clean: "Deep Clean", move_in_out: "Move In/Out", post_construction: "Post Construction", airbnb_turnover: "Airbnb Turnover" };
      var serviceLabel = data.jobType ? (jobTypes[data.jobType] || data.jobType) : "Cleaning Service";
      html += '<div class="detail-row"><div class="detail-icon" style="background:#EFF6FF">&#128466;</div><div><div class="detail-label">Service</div><div class="detail-value">' + serviceLabel + '</div></div></div>';
      if (data.startDatetime) {
        html += '<div class="detail-row"><div class="detail-icon" style="background:#F0FDF4">&#128197;</div><div><div class="detail-label">Date</div><div class="detail-value">' + formatDate(data.startDatetime) + '</div></div></div>';
        html += '<div class="detail-row"><div class="detail-icon" style="background:#FFFBEB">&#128337;</div><div><div class="detail-label">Arrival Window</div><div class="detail-value">' + formatTime(data.startDatetime) + (data.endDatetime ? ' - ' + formatTime(data.endDatetime) : '') + '</div></div></div>';
      }
      if (data.customerName) {
        html += '<div class="detail-row"><div class="detail-icon" style="background:#FAF5FF">&#128100;</div><div><div class="detail-label">Customer</div><div class="detail-value">' + data.customerName + '</div></div></div>';
      }
      html += '</div>';

      // Auto-update hint: show next expected stage when in progress
      if (!isComplete && data.serviceStartedAt && (status === 'service_started' || status === 'in_progress' || status === 'final_touches')) {
        var timing = data.autoProgressTiming || { inProgressMinutes: 30, finalTouchesMinutes: 60 };
        var startedMs = new Date(data.serviceStartedAt).getTime();
        var nowMs = Date.now();
        var elapsedMin = (nowMs - startedMs) / 60000;
        var nextStageLabel = null;
        var minsUntilNext = null;
        if (status === 'service_started' && elapsedMin < timing.inProgressMinutes) {
          nextStageLabel = 'In Progress';
          minsUntilNext = Math.ceil(timing.inProgressMinutes - elapsedMin);
        } else if (status === 'in_progress' && elapsedMin < timing.finalTouchesMinutes) {
          nextStageLabel = 'Final Touches';
          minsUntilNext = Math.ceil(timing.finalTouchesMinutes - elapsedMin);
        }
        if (nextStageLabel && minsUntilNext !== null && minsUntilNext > 0) {
          html += '<div class="card" style="background:#F0F9FF;border:1px solid #BAE6FD">';
          html += '<div style="display:flex;align-items:center;gap:8px">';
          html += '<div style="width:28px;height:28px;border-radius:8px;background:#0EA5E9;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px">&#128336;</div>';
          html += '<div><div style="font-size:13px;font-weight:600;color:#0369A1">Auto-updating to ' + nextStageLabel + '</div>';
          html += '<div style="font-size:12px;color:#0284C7">Expected in ~' + formatMinutes(minsUntilNext) + ' &middot; This page refreshes automatically</div></div>';
          html += '</div></div>';
        }
      }

      // Timeline
      if (data.timeline && data.timeline.length > 0) {
        html += '<div class="card"><div class="card-title">Timeline</div>';
        data.timeline.forEach(function(t) {
          const tsc = STATUS_COLORS[t.status] || STATUS_COLORS.scheduled;
          html += '<div class="timeline-item">';
          html += '<div class="timeline-dot" style="background:' + tsc.bg + '">' + (STATUS_ICONS[t.status] || "&#9679;") + '</div>';
          html += '<div class="timeline-content">';
          var autoTag = t.auto_generated ? ' <span style="font-size:10px;color:#94A3B8;font-weight:400;margin-left:4px">auto</span>' : '';
          html += '<div class="timeline-status">' + (STATUS_LABELS[t.status] || t.status) + autoTag + '</div>';
          html += '<div class="timeline-time">' + formatDateTime(t.created_at) + '</div>';
          if (t.note) html += '<div class="timeline-note">' + t.note + '</div>';
          html += '</div></div>';
        });
        html += '</div>';
      }

      // Checklist
      if (data.checklist && data.checklist.length > 0) {
        html += '<div class="card"><div class="card-title">Checklist</div>';
        var groups = {};
        data.checklist.forEach(function(item) {
          var g = item.room_group || "General";
          if (!groups[g]) groups[g] = [];
          groups[g].push(item);
        });
        Object.keys(groups).forEach(function(groupName) {
          var items = groups[groupName];
          var doneCount = items.filter(function(i) { return i.completed; }).length;
          html += '<div class="checklist-group">';
          html += '<div class="checklist-group-title">' + groupName + '<span class="checklist-count">' + doneCount + '/' + items.length + '</span></div>';
          items.forEach(function(item) {
            html += '<div class="checklist-item">';
            html += '<div class="check-icon ' + (item.completed ? 'check-done' : 'check-pending') + '">' + (item.completed ? '&#10003;' : '') + '</div>';
            html += '<span class="checklist-label ' + (item.completed ? 'done' : '') + '">' + item.label + '</span>';
            html += '</div>';
          });
          html += '</div>';
        });
        html += '</div>';
      }

      // Photos
      if (data.photos && data.photos.length > 0) {
        html += '<div class="card"><div class="card-title">Photos</div>';
        html += '<div class="photo-grid">';
        data.photos.forEach(function(p) {
          html += '<div class="photo-item">';
          html += '<img src="' + ASSETS_BASE + p.photo_url + '" alt="Job photo" loading="lazy">';
          html += '<div class="photo-badge" style="background:' + (p.photo_type === 'before' ? '#D97706' : '#16A34A') + '">' + (p.photo_type === 'before' ? 'Before' : 'After') + '</div>';
          if (p.caption) html += '<div style="position:absolute;bottom:28px;left:6px;right:6px;font-size:11px;color:white;text-shadow:0 1px 2px rgba(0,0,0,0.8)">' + p.caption + '</div>';
          html += '</div>';
        });
        html += '</div></div>';
      }

      // Notes
      if (data.notes && data.notes.length > 0) {
        html += '<div class="card"><div class="card-title">Notes</div>';
        data.notes.forEach(function(n) {
          html += '<div class="note-item">' + n.content + '<div class="note-time">' + formatDateTime(n.created_at) + '</div></div>';
        });
        html += '</div>';
      }

      html += '<div style="text-align:center;padding:20px;color:#CBD5E1;font-size:12px">Powered by QuotePro</div>';
      html += '</div>';
      document.getElementById('app').innerHTML = html;
    }

    function fetchData() {
      fetch(API_URL)
        .then(function(r) { return r.json(); })
        .then(function(data) { render(data); })
        .catch(function(e) {
          document.getElementById('app').innerHTML = '<div class="loading"><p>Unable to load update. Please try again.</p></div>';
        });
    }

    fetchData();
    setInterval(fetchData, 10000);
  </script>
</body>
</html>`;
  }
  app2.post("/api/push-token", requireAuth, async (req, res) => {
    try {
      const { token, platform } = req.body;
      if (!token) return res.status(400).json({ message: "Token required" });
      const saved = await upsertPushToken({
        userId: req.session.userId,
        token,
        platform: platform || "ios"
      });
      return res.json(saved);
    } catch (error) {
      return res.status(500).json({ message: "Failed to save push token" });
    }
  });
  app2.delete("/api/push-token", requireAuth, async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ message: "Token required" });
      await deletePushToken(token);
      return res.json({ message: "Deleted" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to delete push token" });
    }
  });
  async function generateQuotePdfHtml(quote, business, growthSettings) {
    const customerName = quote.propertyDetails?.customerName || "Customer";
    const customerEmail = quote.propertyDetails?.customerEmail || "";
    const customerPhone = quote.propertyDetails?.customerPhone || "";
    const customerAddress = quote.propertyDetails?.customerAddress || "";
    const options = quote.options;
    const addOnLabels = {
      insideFridge: "Inside Fridge",
      insideOven: "Inside Oven",
      insideCabinets: "Inside Cabinets",
      interiorWindows: "Interior Windows",
      blindsDetail: "Blinds Detail",
      baseboardsDetail: "Baseboards Detail",
      laundryFoldOnly: "Laundry (Fold Only)",
      dishes: "Dishes",
      organizationTidy: "Organization/Tidy"
    };
    const activeAddOns = Object.entries(quote.addOns || {}).filter(([_, v]) => v).map(([k]) => addOnLabels[k] || k);
    const optionRows = ["good", "better", "best"].map((key) => {
      const opt = options?.[key];
      if (!opt) return "";
      const isSelected = quote.selectedOption === key;
      return `<tr style="${isSelected ? "background:#EBF5FF;font-weight:600;" : ""}">
          <td style="padding:12px;border-bottom:1px solid #eee;">${opt.serviceTypeName || opt.name || key}${isSelected ? " *" : ""}</td>
          <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">$${(opt.price || 0).toFixed(2)}</td>
        </tr>`;
    }).join("");
    const qp = business.quotePreferences;
    const primaryColor = qp?.brandColor || business.primaryColor || "#2563EB";
    let paymentHtml = "";
    const po = business.paymentOptions;
    if (po) {
      const methodLabels = { cash: "Cash", check: "Check", creditCard: "Credit Card", venmo: "Venmo", cashApp: "Cash App", zelle: "Zelle", applePay: "Apple Pay", ach: "ACH / Bank Transfer", other: "Other" };
      const pMethods = [];
      for (const [key, label] of Object.entries(methodLabels)) {
        const opt = po[key];
        if (opt?.enabled) {
          let line = opt.label || label;
          if (key === "venmo" && business.venmoHandle) line += ` (@${business.venmoHandle})`;
          if (key === "cashApp" && business.cashappHandle) line += ` ($${business.cashappHandle})`;
          if (opt.handle && key !== "venmo" && key !== "cashApp") line += ` (${opt.handle})`;
          if (opt.feeNote) line += ` - ${opt.feeNote}`;
          pMethods.push(line);
        }
      }
      if (pMethods.length > 0) {
        paymentHtml = `<div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;"><div style="font-size:14px;font-weight:600;color:${primaryColor};margin-bottom:8px;">Payment Methods Accepted</div><ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#334155;">`;
        for (const m of pMethods) paymentHtml += `<li style="margin-bottom:4px;">${m}</li>`;
        paymentHtml += `</ul>`;
        if (business.paymentNotes) paymentHtml += `<p style="margin:12px 0 0;font-size:12px;color:#64748b;font-style:italic;">${business.paymentNotes}</p>`;
        paymentHtml += `</div>`;
      }
    }
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;margin:0;padding:40px;color:#1a1a1a;font-size:14px;}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;border-bottom:3px solid ${primaryColor};padding-bottom:20px;}
.company{font-size:24px;font-weight:700;color:${primaryColor};}
.company-details{font-size:12px;color:#666;margin-top:4px;}
.quote-badge{background:${primaryColor};color:white;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:600;}
.section{margin-bottom:24px;}
.section-title{font-size:16px;font-weight:600;color:${primaryColor};margin-bottom:12px;border-bottom:1px solid #eee;padding-bottom:6px;}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.info-item{font-size:13px;}.info-label{color:#666;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;}
table{width:100%;border-collapse:collapse;}
th{text-align:left;padding:12px;background:#f8f9fa;border-bottom:2px solid #dee2e6;font-size:13px;}
.total-row{background:${primaryColor};color:white;}
.total-row td{padding:14px;font-size:16px;font-weight:700;}
.footer{margin-top:40px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:16px;}
.addons{display:flex;flex-wrap:wrap;gap:6px;}.addon-tag{background:#f0f4ff;color:${primaryColor};padding:4px 10px;border-radius:12px;font-size:11px;}
</style></head><body>
<div class="header">
<div><div class="company">${business.companyName || "QuotePro"}</div>
<div class="company-details">${business.email ? business.email + "<br>" : ""}${business.phone || ""}${business.address ? "<br>" + business.address : ""}</div></div>
<div class="quote-badge">QUOTE</div>
</div>
<div class="section"><div class="section-title">Customer</div>
<div class="info-grid">
<div class="info-item"><div class="info-label">Name</div>${customerName}</div>
<div class="info-item"><div class="info-label">Email</div>${customerEmail || "N/A"}</div>
<div class="info-item"><div class="info-label">Phone</div>${customerPhone || "N/A"}</div>
<div class="info-item"><div class="info-label">Address</div>${customerAddress || "N/A"}</div>
</div></div>
<div class="section"><div class="section-title">Property Details</div>
<div class="info-grid">
<div class="info-item"><div class="info-label">Square Footage</div>${quote.propertySqft} sqft</div>
<div class="info-item"><div class="info-label">Bedrooms</div>${quote.propertyBeds}</div>
<div class="info-item"><div class="info-label">Bathrooms</div>${quote.propertyBaths}</div>
<div class="info-item"><div class="info-label">Frequency</div>${(quote.frequencySelected || "one-time").replace(/-/g, " ")}</div>
</div></div>
${activeAddOns.length > 0 ? `<div class="section"><div class="section-title">Add-On Services</div><div class="addons">${activeAddOns.map((a) => `<span class="addon-tag">${a}</span>`).join("")}</div></div>` : ""}
<div class="section"><div class="section-title">Pricing Options</div>
<table><thead><tr><th>Service Level</th><th style="text-align:right;">Price</th></tr></thead>
<tbody>${optionRows}
<tr class="total-row"><td style="padding:14px;">Selected Total</td><td style="padding:14px;text-align:right;">$${(quote.total || 0).toFixed(2)}</td></tr>
</tbody></table></div>
${quote.tax > 0 ? `<div style="text-align:right;margin-top:8px;font-size:13px;color:#666;">Tax: $${quote.tax.toFixed(2)} | Subtotal: $${quote.subtotal.toFixed(2)}</div>` : ""}
${paymentHtml}
${growthSettings?.includeReviewOnPdf && growthSettings?.googleReviewLink?.trim() ? `<div style="margin-top:24px;padding:16px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a;text-align:center;"><div style="font-size:14px;font-weight:600;color:${primaryColor};margin-bottom:6px;">Review Us</div><div style="font-size:12px;color:#64748b;margin-bottom:8px;">If you loved our service, please leave a quick review:</div><a href="${growthSettings.googleReviewLink.trim()}" style="color:${primaryColor};font-size:13px;word-break:break-all;">${growthSettings.googleReviewLink.trim()}</a></div>` : ""}
<div class="footer">Quote generated by ${business.companyName || "QuotePro"} | ${(/* @__PURE__ */ new Date()).toLocaleDateString()}</div>
</body></html>`;
    return html;
  }
  app2.get("/api/quotes/:id/pdf", requireAuth, async (req, res) => {
    try {
      const quote = await getQuoteById(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const customerName = quote.propertyDetails?.customerName || "Customer";
      const gs = await getGrowthAutomationSettings(business.id);
      const html = await generateQuotePdfHtml(quote, business, gs);
      return res.json({ html, customerName, total: quote.total });
    } catch (error) {
      console.error("PDF generation error:", error);
      return res.status(500).json({ message: "Failed to generate PDF" });
    }
  });
  app2.post("/api/commercial/generate-scope", requireAuth, requirePro, async (req, res) => {
    try {
      const { walkthrough, tier } = req.body;
      if (!walkthrough) return res.status(400).json({ message: "walkthrough data is required" });
      const facilityName = walkthrough.facilityName || "the facility";
      const facilityType = walkthrough.facilityType || "Office";
      const totalSqFt = walkthrough.totalSqFt || 0;
      const frequency = walkthrough.frequency || "3x";
      const bathroomCount = walkthrough.bathroomCount || 0;
      const breakroomCount = walkthrough.breakroomCount || 0;
      const carpetPercent = walkthrough.carpetPercent || 0;
      const hardFloorPercent = walkthrough.hardFloorPercent || 0;
      const glassLevel = walkthrough.glassLevel || "None";
      const highTouchFocus = walkthrough.highTouchFocus || false;
      const tierName = tier?.name || "Standard";
      const tierIncluded = tier?.includedBullets?.join(", ") || "";
      const tierExcluded = tier?.excludedBullets?.join(", ") || "";
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional commercial cleaning proposal writer. Generate a scope of work for a commercial cleaning contract. Respond with JSON: {"scopeParagraph": string, "includedTasks": string[], "excludedTasks": string[], "rotationTasks": [{"task": string, "frequency": string}]}. Keep the scope paragraph professional but concise (2-3 sentences). Include 5-8 included tasks and 3-5 excluded tasks. Rotation tasks are periodic tasks done weekly/monthly/quarterly.`
          },
          {
            role: "user",
            content: `Facility: "${facilityName}" (${facilityType}), ${totalSqFt} sqft. Cleaning frequency: ${frequency}/week. ${bathroomCount} bathrooms, ${breakroomCount} breakrooms. Floors: ${carpetPercent}% carpet, ${hardFloorPercent}% hard floor. Glass level: ${glassLevel}. High-touch focus: ${highTouchFocus ? "yes" : "no"}. Tier: ${tierName}. Currently included: ${tierIncluded}. Currently excluded: ${tierExcluded}.`
          }
        ],
        response_format: { type: "json_object" }
      });
      const content = completion.choices[0]?.message?.content;
      let parsed = {};
      try {
        parsed = JSON.parse(content || "{}");
      } catch {
      }
      return res.json({
        scopeParagraph: parsed.scopeParagraph || `Professional janitorial services for ${facilityName}.`,
        includedTasks: parsed.includedTasks || [],
        excludedTasks: parsed.excludedTasks || [],
        rotationTasks: parsed.rotationTasks || []
      });
    } catch (error) {
      console.error("Commercial generate-scope error:", error);
      return res.status(500).json({ message: "Failed to generate scope" });
    }
  });
  app2.post("/api/commercial/risk-scan", requireAuth, requirePro, async (req, res) => {
    try {
      const { walkthrough, laborEstimate, pricing, tiers } = req.body;
      if (!walkthrough || !pricing) return res.status(400).json({ message: "walkthrough and pricing data are required" });
      const facilityName = walkthrough.facilityName || "the facility";
      const facilityType = walkthrough.facilityType || "Office";
      const totalSqFt = walkthrough.totalSqFt || 0;
      const frequency = walkthrough.frequency || "3x";
      const pricePerVisit = pricing.finalPricePerVisit || 0;
      const monthlyPrice = pricing.monthlyPrice || 0;
      const hourlyRate = pricing.hourlyRate || 0;
      const targetMargin = pricing.targetMarginPct || 0;
      const rawHours = laborEstimate?.rawHours || 0;
      const overrideHours = laborEstimate?.overrideHours;
      const recommendedCleaners = laborEstimate?.recommendedCleaners || 1;
      const tierCount = tiers?.length || 0;
      const lowestTierPrice = tiers?.length > 0 ? Math.min(...tiers.map((t) => t.pricePerVisit || 0)) : 0;
      const highestTierPrice = tiers?.length > 0 ? Math.max(...tiers.map((t) => t.pricePerVisit || 0)) : 0;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a commercial cleaning business advisor. Analyze a commercial cleaning quote for potential risks and issues. Respond with JSON: {"warnings": [{"severity": "high"|"medium"|"low", "title": string, "description": string}], "suggestedClauses": string[], "overallAssessment": string}. Check for underpricing, unusual labor-to-sqft ratios, missing contract protections, facility-specific hazards, and margin concerns. Be specific and actionable.`
          },
          {
            role: "user",
            content: `Facility: "${facilityName}" (${facilityType}), ${totalSqFt} sqft. Frequency: ${frequency}/week. Labor estimate: ${rawHours} hours/visit${overrideHours ? ` (overridden to ${overrideHours}h)` : ""}, ${recommendedCleaners} cleaners. Pricing: $${pricePerVisit}/visit, $${monthlyPrice}/month, $${hourlyRate}/hr rate, ${targetMargin}% target margin. ${tierCount} tiers priced from $${lowestTierPrice} to $${highestTierPrice}. Per-sqft rate: $${totalSqFt > 0 ? (pricePerVisit / (totalSqFt / 1e3)).toFixed(2) : "N/A"}/1000sqft.`
          }
        ],
        response_format: { type: "json_object" }
      });
      const content = completion.choices[0]?.message?.content;
      let parsed = {};
      try {
        parsed = JSON.parse(content || "{}");
      } catch {
      }
      return res.json({
        warnings: parsed.warnings || [],
        suggestedClauses: parsed.suggestedClauses || [],
        overallAssessment: parsed.overallAssessment || "Unable to generate assessment."
      });
    } catch (error) {
      console.error("Commercial risk-scan error:", error);
      return res.status(500).json({ message: "Failed to run risk scan" });
    }
  });
  app2.get("/api/quotes/:id/commercial-pdf", requireAuth, async (req, res) => {
    try {
      const quote = await getQuoteById(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const gs = await getGrowthAutomationSettings(business.id);
      const pd = quote.propertyDetails || {};
      const commercialData = pd.commercialData || pd;
      const walkthrough = commercialData.walkthrough || {};
      const laborEstimate = commercialData.laborEstimate || {};
      const pricing = commercialData.pricing || {};
      const tiers = commercialData.tiers || [];
      const quoteType = commercialData.quoteType || pd.quoteType;
      if (quoteType !== "commercial") {
        return res.status(400).json({ message: "This is not a commercial quote" });
      }
      const primaryColor = business.quotePreferences?.brandColor || business.primaryColor || "#2563EB";
      const facilityName = walkthrough.facilityName || "Commercial Facility";
      const siteAddress = walkthrough.siteAddress || "";
      const facilityType = walkthrough.facilityType || "";
      const totalSqFt = walkthrough.totalSqFt || 0;
      const frequency = walkthrough.frequency || "";
      const customerName = pd.customerName || "Client";
      const customerEmail = pd.customerEmail || "";
      const customerPhone = pd.customerPhone || "";
      const tierRowsHtml = tiers.map(
        (tier, index) => `
        <tr style="${index === 1 ? "background:#EBF5FF;font-weight:600;" : ""}">
          <td style="padding:14px;border-bottom:1px solid #eee;">
            <div style="font-weight:600;font-size:15px;">${tier.name || `Tier ${index + 1}`}</div>
            <div style="font-size:12px;color:#666;margin-top:4px;">${tier.scopeText || ""}</div>
          </td>
          <td style="padding:14px;border-bottom:1px solid #eee;text-align:center;font-size:13px;">${tier.frequency || frequency}</td>
          <td style="padding:14px;border-bottom:1px solid #eee;text-align:right;">$${(tier.pricePerVisit || 0).toFixed(2)}</td>
          <td style="padding:14px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">$${(tier.monthlyPrice || 0).toFixed(2)}</td>
        </tr>`
      ).join("");
      const includedExcludedHtml = tiers.map(
        (tier) => `
        <div style="margin-bottom:20px;">
          <div style="font-weight:600;font-size:14px;margin-bottom:8px;color:${primaryColor};">${tier.name || "Service Tier"}</div>
          ${tier.includedBullets?.length > 0 ? `<div style="margin-bottom:8px;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#666;margin-bottom:4px;">Included</div><ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#334155;">${tier.includedBullets.map((b) => `<li style="margin-bottom:3px;">${b}</li>`).join("")}</ul></div>` : ""}
          ${tier.excludedBullets?.length > 0 ? `<div><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#666;margin-bottom:4px;">Not Included</div><ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#94a3b8;">${tier.excludedBullets.map((b) => `<li style="margin-bottom:3px;">${b}</li>`).join("")}</ul></div>` : ""}
        </div>`
      ).join("");
      const scheduleInfo = [
        walkthrough.preferredDays ? `Preferred Days: ${walkthrough.preferredDays}` : "",
        walkthrough.preferredTimeWindow ? `Time Window: ${walkthrough.preferredTimeWindow}` : "",
        walkthrough.afterHoursRequired ? "After-hours service required" : "",
        walkthrough.suppliesByClient ? "Supplies provided by client" : "Supplies provided by cleaning company",
        walkthrough.restroomConsumablesIncluded ? "Restroom consumables included" : "Restroom consumables not included"
      ].filter(Boolean).map((s) => `<li style="margin-bottom:4px;">${s}</li>`).join("");
      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0;color:#1a1a1a;font-size:14px;background:#fff;}
.page{padding:40px;max-width:800px;margin:0 auto;}
.cover{text-align:center;padding:60px 40px;border-bottom:4px solid ${primaryColor};margin-bottom:32px;}
.company-name{font-size:28px;font-weight:700;color:${primaryColor};margin-bottom:4px;}
.company-details{font-size:12px;color:#666;margin-bottom:24px;}
.proposal-badge{display:inline-block;background:${primaryColor};color:white;padding:8px 24px;border-radius:24px;font-size:14px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:24px;}
.facility-name{font-size:22px;font-weight:600;color:#1a1a1a;margin-bottom:4px;}
.facility-meta{font-size:13px;color:#666;}
.section{margin-bottom:28px;}
.section-title{font-size:16px;font-weight:600;color:${primaryColor};margin-bottom:12px;border-bottom:2px solid ${primaryColor}22;padding-bottom:6px;}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.info-item{font-size:13px;}.info-label{color:#666;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;}
table{width:100%;border-collapse:collapse;}
th{text-align:left;padding:12px;background:#f8f9fa;border-bottom:2px solid #dee2e6;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#666;}
.terms{background:#f8fafc;padding:20px;border-radius:8px;border:1px solid #e2e8f0;font-size:12px;color:#64748b;line-height:1.6;}
.terms h4{color:#334155;margin:0 0 8px;font-size:13px;}
.acceptance{border:2px solid ${primaryColor};border-radius:12px;padding:24px;margin-top:32px;}
.acceptance h3{color:${primaryColor};margin:0 0 16px;font-size:16px;}
.sig-line{border-bottom:1px solid #ccc;height:32px;margin-bottom:4px;}
.sig-label{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.5px;}
.footer{margin-top:40px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:16px;}
</style></head><body>
<div class="page">
<div class="cover">
  <div class="company-name">${business.companyName || "QuotePro"}</div>
  <div class="company-details">${business.email ? business.email + " | " : ""}${business.phone || ""}${business.address ? " | " + business.address : ""}</div>
  <div class="proposal-badge">Commercial Cleaning Proposal</div>
  <div class="facility-name">${facilityName}</div>
  <div class="facility-meta">${siteAddress}${facilityType ? " | " + facilityType : ""}${totalSqFt ? " | " + totalSqFt.toLocaleString() + " sqft" : ""}</div>
</div>

<div class="section">
  <div class="section-title">Prepared For</div>
  <div class="info-grid">
    <div class="info-item"><div class="info-label">Name</div>${customerName}</div>
    <div class="info-item"><div class="info-label">Email</div>${customerEmail || "N/A"}</div>
    <div class="info-item"><div class="info-label">Phone</div>${customerPhone || "N/A"}</div>
    <div class="info-item"><div class="info-label">Facility</div>${facilityName}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Facility Overview</div>
  <div class="info-grid">
    <div class="info-item"><div class="info-label">Facility Type</div>${facilityType}</div>
    <div class="info-item"><div class="info-label">Total Area</div>${totalSqFt ? totalSqFt.toLocaleString() + " sqft" : "N/A"}</div>
    <div class="info-item"><div class="info-label">Floors</div>${walkthrough.floors || 1}</div>
    <div class="info-item"><div class="info-label">Cleaning Frequency</div>${frequency}/week</div>
    <div class="info-item"><div class="info-label">Bathrooms</div>${walkthrough.bathroomCount || 0}</div>
    <div class="info-item"><div class="info-label">Breakrooms</div>${walkthrough.breakroomCount || 0}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Scope of Work</div>
  ${includedExcludedHtml}
</div>

<div class="section">
  <div class="section-title">Schedule & Service Details</div>
  <ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#334155;">
    <li style="margin-bottom:4px;">Cleaning frequency: ${frequency}/week</li>
    ${scheduleInfo}
  </ul>
</div>

<div class="section">
  <div class="section-title">Pricing</div>
  <table>
    <thead>
      <tr>
        <th>Service Level</th>
        <th style="text-align:center;">Frequency</th>
        <th style="text-align:right;">Per Visit</th>
        <th style="text-align:right;">Monthly</th>
      </tr>
    </thead>
    <tbody>
      ${tierRowsHtml}
    </tbody>
  </table>
</div>

<div class="section">
  <div class="terms">
    <h4>Terms & Conditions</h4>
    <p>1. This proposal is valid for 30 days from the date below.</p>
    <p>2. Service may be cancelled by either party with 30 days written notice.</p>
    <p>3. Pricing is based on the scope described above. Additional services or scope changes may adjust pricing.</p>
    <p>4. Payment terms: Net 15 from date of invoice unless otherwise agreed.</p>
    <p>5. The cleaning company maintains general liability insurance and workers' compensation coverage.</p>
    ${walkthrough.accessConstraints ? `<p>6. Access: ${walkthrough.accessConstraints}</p>` : ""}
    ${walkthrough.specialChemicals ? `<p>${walkthrough.accessConstraints ? "7" : "6"}. Special requirements: ${walkthrough.specialChemicals}</p>` : ""}
  </div>
</div>

<div class="acceptance">
  <h3>Acceptance</h3>
  <p style="font-size:13px;color:#666;margin:0 0 20px;">By signing below, you agree to the scope of work and pricing outlined in this proposal.</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Client Signature</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Date</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Printed Name</div>
    </div>
    <div>
      <div class="sig-line"></div>
      <div class="sig-label">Title</div>
    </div>
  </div>
</div>

${gs?.includeReviewOnPdf && gs?.googleReviewLink?.trim() ? `<div style="margin-top:24px;padding:16px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a;text-align:center;"><div style="font-size:14px;font-weight:600;color:${primaryColor};margin-bottom:6px;">Review Us</div><div style="font-size:12px;color:#64748b;margin-bottom:8px;">If you loved our service, please leave a quick review:</div><a href="${gs.googleReviewLink.trim()}" style="color:${primaryColor};font-size:13px;word-break:break-all;">${gs.googleReviewLink.trim()}</a></div>` : ""}
<div class="footer">
  Proposal prepared by ${business.companyName || "QuotePro"} | ${(/* @__PURE__ */ new Date()).toLocaleDateString()} | Powered by QuotePro
</div>
</div>
</body></html>`;
      return res.json({
        html,
        customerName,
        facilityName,
        total: pricing.monthlyPrice || quote.total
      });
    } catch (error) {
      console.error("Commercial PDF generation error:", error);
      return res.status(500).json({ message: "Failed to generate commercial PDF" });
    }
  });
  app2.post("/api/quotes/:id/send-with-pdf", requireAuth, requirePro, async (req, res) => {
    try {
      const quote = await getQuoteById(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { to, cc, subject, customBody, attachmentFileIds } = req.body;
      if (!to) {
        return res.status(400).json({ message: "to (recipient email) is required" });
      }
      const sgApiKey = process.env.SENDGRID_API_KEY;
      if (!sgApiKey) {
        return res.status(503).json({ message: "Email service not configured. Please connect SendGrid in settings." });
      }
      const brandedFromEmail = process.env.SENDGRID_FROM_EMAIL || "quotes@myreminder.ai";
      const fromName = business.companyName || "QuotePro";
      const replyToEmail = business.email || void 0;
      if (!replyToEmail) {
        return res.status(400).json({ success: false, message: "Please add your email address in Settings before sending emails." });
      }
      const customerName = quote.propertyDetails?.customerName || "Customer";
      const gs = await getGrowthAutomationSettings(business.id);
      const quoteHtml = await generateQuotePdfHtml(quote, business, gs);
      const qpSend = business.quotePreferences;
      const primaryColor = qpSend?.brandColor || business.primaryColor || "#2563EB";
      const quoteUrl = `${getPublicBaseUrl(req)}/q/${quote.publicToken}`;
      const propertyDetails = quote.propertyDetails || {};
      const beds = propertyDetails.beds;
      const baths = propertyDetails.baths;
      const sqft = propertyDetails.sqft;
      const options = quote.options || {};
      const optionsArray = [
        {
          key: "good",
          label: "Good",
          name: options.good?.name || "Good",
          scope: options.good?.scope || "",
          price: options.good?.price || 0
        },
        {
          key: "better",
          label: "Better",
          name: options.better?.name || "Better",
          scope: options.better?.scope || "",
          price: options.better?.price || 0
        },
        {
          key: "best",
          label: "Best",
          name: options.best?.name || "Best",
          scope: options.best?.scope || "",
          price: options.best?.price || 0
        }
      ];
      const propertyInfoHtml = beds || baths || sqft ? `
      <tr><td align="center" style="padding:24px 20px;background-color:#ffffff;border-bottom:1px solid #eeeeee;">
        <table width="100%" cellpadding="0" cellspacing="0" align="center">
          <tr>
            ${beds ? `<td align="center" style="padding:0 16px;font-size:14px;"><div style="font-weight:600;color:#333333;">${beds}</div><div style="color:#666666;font-size:12px;">Beds</div></td>` : ""}
            ${baths ? `<td align="center" style="padding:0 16px;font-size:14px;"><div style="font-weight:600;color:#333333;">${baths}</div><div style="color:#666666;font-size:12px;">Baths</div></td>` : ""}
            ${sqft ? `<td align="center" style="padding:0 16px;font-size:14px;"><div style="font-weight:600;color:#333333;">${sqft}</div><div style="color:#666666;font-size:12px;">Sq Ft</div></td>` : ""}
          </tr>
        </table>
      </td></tr>` : "";
      const savedRecommended = quote.recommendedOption || "better";
      const optionsCardsHtml = optionsArray.map((option, index) => {
        const isRecommended = option.key === savedRecommended;
        const borderColor = isRecommended ? primaryColor : "#eeeeee";
        const backgroundColor = isRecommended ? "#f9f9ff" : "#ffffff";
        const badgeHtml = isRecommended ? `<div style="display:inline-block;background:${primaryColor};color:white;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;margin-bottom:12px;">RECOMMENDED</div><br/>` : "";
        return `
      <tr><td style="padding:16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${borderColor};border-radius:8px;background-color:${backgroundColor};">
          <tr><td style="padding:20px;">
            ${badgeHtml}
            <div style="font-size:18px;font-weight:700;color:#333333;margin-bottom:4px;">${option.name}</div>
            ${option.scope ? `<div style="font-size:14px;color:#666666;margin-bottom:16px;line-height:1.4;">${option.scope}</div>` : ""}
            <div style="font-size:28px;font-weight:700;color:${primaryColor};margin-bottom:20px;">$${option.price.toFixed(2)}</div>
            <a href="${quoteUrl}?option=${option.key}" style="display:block;background:${primaryColor};color:white;padding:14px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:16px;text-align:center;">Accept ${option.name}</a>
          </td></tr>
        </table>
      </td></tr>`;
      }).join("");
      const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;background-color:#ffffff;">
        <!-- Header with company info -->
        <tr><td style="padding:32px 20px;text-align:center;border-bottom:1px solid #eeeeee;">
          ${business.logoUri ? `<div style="margin-bottom:16px;"><img src="${business.logoUri}" alt="${business.companyName}" style="max-height:50px;max-width:200px;"></div>` : ""}
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#333333;">${business.companyName || "QuotePro"}</h1>
        </td></tr>
        ${customBody ? `
        <!-- Custom email body -->
        <tr><td style="padding:24px 32px;background-color:#ffffff;border-bottom:1px solid #eeeeee;">
          <div style="font-size:15px;color:#333333;line-height:1.7;white-space:pre-wrap;">${customBody.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        </td></tr>
        <tr><td style="padding:16px 20px 8px;text-align:center;">
          <h2 style="margin:0;font-size:18px;font-weight:700;color:#333333;">Your Quote Options</h2>
          <p style="margin:8px 0 0;font-size:13px;color:#666666;">Select the option that works best for you.</p>
        </td></tr>` : `
        <tr><td style="padding:16px 20px;text-align:center;border-bottom:1px solid #eeeeee;">
          <p style="margin:0;font-size:14px;color:#666666;">Hi ${customerName}, please select the option that works best for you.</p>
        </td></tr>`}
        
        <!-- Property Info (if available) -->
        ${propertyInfoHtml}
        
        <!-- Options Cards -->
        <tr><td style="padding:24px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
            ${optionsCardsHtml}
          </table>
        </td></tr>
        
        <!-- Fallback Text -->
        <tr><td style="padding:20px;text-align:center;background-color:#f9f9f9;border-top:1px solid #eeeeee;">
          <p style="margin:0;font-size:12px;color:#666666;line-height:1.5;">
            If buttons don't work, reply with <strong>1</strong> (Good), <strong>2</strong> (Better), or <strong>3</strong> (Best) to select your option.
          </p>
        </td></tr>
        
        <!-- Footer with Business Info -->
        ${gs?.includeReviewInMessages && gs?.googleReviewLink?.trim() ? `<tr><td style="padding:16px 20px;text-align:center;background-color:#fffbeb;border-top:1px solid #fde68a;"><div style="font-size:13px;color:#92400e;margin-bottom:4px;">After your service, would you mind leaving a quick review?</div><a href="${gs.googleReviewLink.trim()}" style="color:${primaryColor};font-size:13px;text-decoration:underline;">${gs.googleReviewLink.trim()}</a></td></tr>` : ""}
        <tr><td style="padding:24px 20px;text-align:center;border-top:1px solid #eeeeee;background-color:#ffffff;">
          <div style="font-weight:600;color:#333333;margin-bottom:8px;">${business.companyName || "QuotePro"}</div>
          ${business.phone ? `<div style="font-size:13px;color:#666666;margin-bottom:4px;">Phone: <a href="tel:${business.phone}" style="color:${primaryColor};text-decoration:none;">${business.phone}</a></div>` : ""}
          ${replyToEmail ? `<div style="font-size:13px;color:#666666;">Email: <a href="mailto:${replyToEmail}" style="color:${primaryColor};text-decoration:none;">${replyToEmail}</a></div>` : ""}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
      const personalization = { to: [{ email: to }] };
      if (cc) {
        const ccList = Array.isArray(cc) ? cc : [cc];
        const validCc = ccList.filter((e) => e && e.includes("@"));
        if (validCc.length > 0) personalization.cc = validCc.map((e) => ({ email: e }));
      }
      const plainBody = customBody ? `${customBody}

View your quote online: ${quoteUrl}` : `Hi ${customerName},

Please see your quote details below.

To view and accept your quote online, visit: ${quoteUrl}`;
      const emailPayload = {
        personalizations: [personalization],
        from: { email: brandedFromEmail, name: fromName },
        subject: subject || `Your ${business.companyName || "QuotePro"} Quote`,
        content: [
          { type: "text/plain", value: plainBody },
          { type: "text/html", value: emailHtml }
        ]
      };
      if (replyToEmail) {
        emailPayload.reply_to = { email: replyToEmail, name: fromName };
      }
      if (attachmentFileIds && Array.isArray(attachmentFileIds) && attachmentFileIds.length > 0) {
        const fsLib = await import("fs");
        const pathLib = await import("path");
        const attachedFiles = await db.select().from(businessFiles).where(and3(eq3(businessFiles.businessId, business.id)));
        const requested = attachedFiles.filter((f) => attachmentFileIds.includes(f.id));
        const sgAttachments = [];
        for (const f of requested) {
          try {
            const absPath = pathLib.join(process.cwd(), f.fileUrl);
            const buf = fsLib.readFileSync(absPath);
            sgAttachments.push({
              content: buf.toString("base64"),
              filename: f.originalName,
              type: f.fileType || "application/octet-stream",
              disposition: "attachment"
            });
          } catch (e) {
            console.error("Failed to read attachment:", f.fileUrl, e);
          }
        }
        if (sgAttachments.length > 0) {
          emailPayload.attachments = sgAttachments;
        }
      }
      const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sgApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(emailPayload)
      });
      if (!sgRes.ok) {
        const errText = await sgRes.text();
        console.error("SendGrid error:", sgRes.status, errText);
        let errorDetail = "Failed to send email";
        try {
          const errJson = JSON.parse(errText);
          if (errJson.errors && errJson.errors.length > 0) {
            errorDetail = errJson.errors.map((e) => e.message).join("; ");
          }
        } catch {
        }
        return res.status(502).json({ message: errorDetail });
      }
      console.log(`Quote email sent via SendGrid: from=${brandedFromEmail}, to=${to}, quoteId=${quote.id}, status=${sgRes.status}`);
      await createCommunication({
        businessId: business.id,
        quoteId: quote.id,
        customerId: quote.customerId || void 0,
        channel: "email",
        direction: "outbound",
        content: `Quote email sent to ${to}${cc ? ` (cc: ${cc})` : ""}`,
        status: "sent"
      });
      return res.json({ success: true, message: "Quote email sent successfully" });
    } catch (error) {
      console.error("Send quote email error:", error);
      return res.status(500).json({ message: "Failed to send quote email" });
    }
  });
  app2.post("/api/quotes/:id/generate-email", requireAuth, async (req, res) => {
    try {
      const quote = await getQuoteById(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { tone = "professional", extraInstructions } = req.body;
      const customerName = quote.propertyDetails?.customerName || "there";
      const companyName = business.companyName || "QuotePro";
      const senderName = business.senderName || companyName;
      const options = quote.options || {};
      const recommendedKey = quote.recommendedOption || "better";
      const recommendedOption = options[recommendedKey] || {};
      const selectedKey = quote.selectedOption || recommendedKey;
      const selectedOption = options[selectedKey] || recommendedOption;
      const frequency = quote.frequencySelected || "one-time";
      const total = Number(quote.total) || 0;
      const propertyDetails = quote.propertyDetails || {};
      const expiresAt = quote.expiresAt;
      const expirationStr = expiresAt ? new Date(expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;
      const toneMap = {
        professional: "professional and polished",
        friendly: "friendly and conversational",
        warm: "warm and personable",
        concise: "brief and direct \u2014 no fluff"
      };
      const toneDesc = toneMap[tone] || toneMap.professional;
      const systemPrompt = `You are a sales email writer for ${companyName}, a residential cleaning company. Write emails in a ${toneDesc} tone. Keep the email under 150 words. No emojis. Sound human, not like a template. Start directly \u2014 no "I hope this email finds you well." Return a JSON object with two fields: "subject" (string) and "body" (string, plain text with newlines).`;
      const userPrompt = `Write a quote email to ${customerName}:
- Recommended plan: "${selectedOption.name || "Standard Clean"}" at $${total.toFixed(0)}
- Frequency: ${frequency}
- Property: ${propertyDetails.beds ? `${propertyDetails.beds} bed` : ""} ${propertyDetails.baths ? `${propertyDetails.baths} bath` : ""}${propertyDetails.sqft ? ` ${propertyDetails.sqft} sqft` : ""}
${expirationStr ? `- Quote expires: ${expirationStr}` : ""}
${extraInstructions ? `- Extra context: ${extraInstructions}` : ""}
- Sender: ${senderName} from ${companyName}

The email should:
1. Greet ${customerName} by name
2. Reference their quote and the recommended package
3. Create gentle urgency around the expiration if applicable
4. Invite them to reply with questions
5. Sign off warmly from ${senderName}`;
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 400
        });
        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error("No AI response");
        const parsed = JSON.parse(content);
        return res.json({
          subject: parsed.subject || `Your Cleaning Quote from ${companyName}`,
          body: parsed.body || ""
        });
      } catch {
        const fallbackSubject = `Your Cleaning Quote from ${companyName}`;
        const fallbackBody = `Hi ${customerName},

Thank you for the opportunity to provide your cleaning quote.

Based on your property details, the recommended option is ${selectedOption.name || "Standard Clean"} at $${total.toFixed(0)}${expirationStr ? ` \u2014 valid until ${expirationStr}` : ""}.

Simply reply to this email to get scheduled, or click the link to view your full quote online.

Let us know if you have any questions!

Best,
${senderName}
${companyName}`;
        return res.json({ subject: fallbackSubject, body: fallbackBody });
      }
    } catch (error) {
      console.error("Generate quote email error:", error);
      return res.status(500).json({ message: "Failed to generate email" });
    }
  });
  app2.post("/api/quotes/:id/onboarding-send", requireAuth, async (req, res) => {
    try {
      const quote = await getQuoteById(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { to, subject } = req.body;
      if (!to) {
        return res.status(400).json({ message: "Recipient email is required" });
      }
      const sgApiKey = process.env.SENDGRID_API_KEY;
      if (!sgApiKey) {
        return res.status(503).json({ message: "Email service not configured" });
      }
      const brandedFromEmail = process.env.SENDGRID_FROM_EMAIL || "quotes@myreminder.ai";
      const fromName = business.companyName || "QuotePro";
      const replyToEmail = business.email || void 0;
      const customerName = quote.propertyDetails?.customerName || "Customer";
      const primaryColor = business.primaryColor || "#2563EB";
      const quoteUrl = `${getPublicBaseUrl(req)}/q/${quote.publicToken}`;
      const propertyDetails = quote.propertyDetails || {};
      const beds = propertyDetails.beds;
      const baths = propertyDetails.baths;
      const sqft = propertyDetails.sqft;
      const options = quote.options || {};
      const optionsArray = [
        { key: "good", label: "Good", name: options.good?.name || "Good", scope: options.good?.scope || "", price: options.good?.price || 0 },
        { key: "better", label: "Better", name: options.better?.name || "Better", scope: options.better?.scope || "", price: options.better?.price || 0 },
        { key: "best", label: "Best", name: options.best?.name || "Best", scope: options.best?.scope || "", price: options.best?.price || 0 }
      ];
      const propertyInfoHtml = beds || baths || sqft ? `
      <tr><td align="center" style="padding:24px 20px;background-color:#ffffff;border-bottom:1px solid #eeeeee;">
        <table width="100%" cellpadding="0" cellspacing="0" align="center">
          <tr>
            ${beds ? `<td align="center" style="padding:0 16px;font-size:14px;"><div style="font-weight:600;color:#333333;">${beds}</div><div style="color:#666666;font-size:12px;">Beds</div></td>` : ""}
            ${baths ? `<td align="center" style="padding:0 16px;font-size:14px;"><div style="font-weight:600;color:#333333;">${baths}</div><div style="color:#666666;font-size:12px;">Baths</div></td>` : ""}
            ${sqft ? `<td align="center" style="padding:0 16px;font-size:14px;"><div style="font-weight:600;color:#333333;">${sqft}</div><div style="color:#666666;font-size:12px;">Sq Ft</div></td>` : ""}
          </tr>
        </table>
      </td></tr>` : "";
      const savedRecommended = quote.recommendedOption || "better";
      const optionsCardsHtml = optionsArray.map((option) => {
        const isRecommended = option.key === savedRecommended;
        const borderColor = isRecommended ? primaryColor : "#eeeeee";
        const backgroundColor = isRecommended ? "#f9f9ff" : "#ffffff";
        const badgeHtml = isRecommended ? `<div style="display:inline-block;background:${primaryColor};color:white;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;margin-bottom:12px;">RECOMMENDED</div><br/>` : "";
        return `
      <tr><td style="padding:16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${borderColor};border-radius:8px;background-color:${backgroundColor};">
          <tr><td style="padding:20px;">
            ${badgeHtml}
            <div style="font-size:18px;font-weight:700;color:#333333;margin-bottom:4px;">${option.name}</div>
            ${option.scope ? `<div style="font-size:14px;color:#666666;margin-bottom:16px;line-height:1.4;">${option.scope}</div>` : ""}
            <div style="font-size:28px;font-weight:700;color:${primaryColor};margin-bottom:20px;">$${option.price.toFixed(2)}</div>
            <a href="${quoteUrl}?option=${option.key}" style="display:block;background:${primaryColor};color:white;padding:14px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:16px;text-align:center;">Accept ${option.name}</a>
          </td></tr>
        </table>
      </td></tr>`;
      }).join("");
      const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;background-color:#ffffff;">
        <tr><td style="padding:32px 20px;text-align:center;border-bottom:1px solid #eeeeee;">
          ${business.logoUri ? `<div style="margin-bottom:16px;"><img src="${business.logoUri}" alt="${business.companyName}" style="max-height:50px;max-width:200px;"></div>` : ""}
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#333333;">Your Quote Options</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#666666;">Hi ${customerName}, please select the option that works best for you.</p>
        </td></tr>
        ${propertyInfoHtml}
        <tr><td style="padding:24px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
            ${optionsCardsHtml}
          </table>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;background-color:#f9f9f9;border-top:1px solid #eeeeee;">
          <p style="margin:0;font-size:12px;color:#666666;line-height:1.5;">
            If buttons don't work, reply with <strong>1</strong> (Good), <strong>2</strong> (Better), or <strong>3</strong> (Best) to select your option.
          </p>
        </td></tr>
        <tr><td style="padding:24px 20px;text-align:center;border-top:1px solid #eeeeee;background-color:#ffffff;">
          <div style="font-weight:600;color:#333333;margin-bottom:8px;">${business.companyName || "QuotePro"}</div>
          ${business.phone ? `<div style="font-size:13px;color:#666666;margin-bottom:4px;">Phone: <a href="tel:${business.phone}" style="color:${primaryColor};text-decoration:none;">${business.phone}</a></div>` : ""}
          ${replyToEmail ? `<div style="font-size:13px;color:#666666;">Email: <a href="mailto:${replyToEmail}" style="color:${primaryColor};text-decoration:none;">${replyToEmail}</a></div>` : ""}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
      const emailPayload = {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: brandedFromEmail, name: fromName },
        subject: subject || `Your ${business.companyName || "QuotePro"} Quote`,
        content: [
          { type: "text/plain", value: `Hi ${customerName},

Please see your quote details below.

To view and accept your quote online, visit: ${quoteUrl}` },
          { type: "text/html", value: emailHtml }
        ]
      };
      if (replyToEmail) {
        emailPayload.reply_to = { email: replyToEmail, name: fromName };
      }
      const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sgApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(emailPayload)
      });
      if (!sgRes.ok) {
        const errText = await sgRes.text();
        console.error("SendGrid onboarding error:", sgRes.status, errText);
        let errorDetail = "Failed to send email";
        try {
          const errJson = JSON.parse(errText);
          if (errJson.errors && errJson.errors.length > 0) {
            errorDetail = errJson.errors.map((e) => e.message).join("; ");
          }
        } catch {
        }
        return res.status(502).json({ message: errorDetail });
      }
      console.log(`Onboarding quote email sent: from=${brandedFromEmail}, to=${to}, quoteId=${quote.id}`);
      await createCommunication({
        businessId: business.id,
        quoteId: quote.id,
        customerId: quote.customerId || void 0,
        channel: "email",
        direction: "outbound",
        content: `Quote email sent to ${to}`,
        status: "sent"
      });
      await updateQuote(quote.id, { status: "sent" });
      return res.json({ success: true, message: "Quote email sent successfully" });
    } catch (error) {
      console.error("Onboarding send quote error:", error);
      return res.status(500).json({ message: "Failed to send quote email" });
    }
  });
  app2.get("/api/communications", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { customerId, quoteId, jobId } = req.query;
      const list = await getCommunicationsByBusiness(business.id, { customerId, quoteId, jobId });
      return res.json(list);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get communications" });
    }
  });
  app2.post("/api/communications", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const c = await createCommunication({ ...req.body, businessId: business.id });
      return res.json(c);
    } catch (error) {
      return res.status(500).json({ message: "Failed to create communication" });
    }
  });
  async function generateFollowUpMessage(quote, customer, business, channel) {
    const ageDays = Math.round((Date.now() - (quote.sentAt?.getTime() || quote.createdAt.getTime())) / (1e3 * 60 * 60 * 24) * 10) / 10;
    const msgType = channel === "email" ? "email" : "SMS";
    const maxLen = channel === "email" ? 200 : 160;
    const quoteUrl = `${process.env.APP_URL || "https://quotepro.app"}/q/${quote.publicToken}`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Write a ${msgType} follow-up (under ${maxLen} chars for SMS) for "${business?.companyName || "our cleaning company"}". Quote is $${quote.total} sent ${ageDays} days ago. Quote link: ${quoteUrl}. Be warm, not pushy. No emojis. Sign as "${business?.senderName || "Team"}". For email: start with "Subject: " then blank line then body. Do NOT put the raw URL in the email body; a button will be added automatically.`
        },
        {
          role: "user",
          content: `Write a friendly follow-up ${msgType} for ${customer?.firstName || "the customer"} asking if they had a chance to review their cleaning quote. Reply with ONLY the message text.`
        }
      ],
      max_completion_tokens: channel === "email" ? 250 : 100
    });
    return completion.choices[0]?.message?.content?.trim() || "";
  }
  async function sendFollowUpNow(commId, req) {
    const comm = await getCommunicationById(commId);
    if (!comm) return { success: false, message: "Follow-up not found" };
    const quote = comm.quoteId ? await getQuoteById(comm.quoteId) : null;
    if (!quote) return { success: false, message: "Quote not found" };
    if (quote.status === "accepted") return { success: false, message: "Quote already accepted - no follow-up needed" };
    if (quote.status === "expired") return { success: false, message: "Quote has expired" };
    const customer = quote.customerId ? await getCustomerById(quote.customerId) : null;
    const business = await db_getBusinessById(quote.businessId);
    let messageText = comm.content?.trim() || "";
    if (!messageText) {
      messageText = await generateFollowUpMessage(quote, customer, business, comm.channel);
    }
    const channel = comm.channel;
    if (channel === "email") {
      const sgApiKey = process.env.SENDGRID_API_KEY;
      if (!sgApiKey) return { success: false, message: "Email service not configured" };
      const toEmail = customer?.email;
      if (!toEmail) return { success: false, message: "Customer email not found" };
      const fromEmail = process.env.SENDGRID_FROM_EMAIL || "quotes@myreminder.ai";
      const replyTo = business?.email;
      const fromName = business?.companyName || "QuotePro";
      const quoteUrl = `${process.env.APP_URL || `https://${req.get("host")}`}/q/${quote.publicToken}`;
      const primaryColor = business?.primaryColor || "#2563EB";
      const quoteButtonHtml = `<div style="margin-top:24px;text-align:center;"><a href="${quoteUrl}" style="display:inline-block;background:${primaryColor};color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">View & Accept Your Quote</a></div>`;
      const subjectMatch = messageText.match(/^Subject:\s*(.+)/i);
      const subject = subjectMatch ? subjectMatch[1].trim() : `Following up on your quote from ${fromName}`;
      const body = subjectMatch ? messageText.replace(/^Subject:.*\n\n?/i, "").trim() : messageText;
      const htmlBody = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);"><tr><td style="background:linear-gradient(135deg,#007AFF,#5856D6);padding:24px 32px;"><h2 style="color:#fff;margin:0;font-size:20px;">${fromName}</h2></td></tr><tr><td style="padding:32px;">${body.split("\n").map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333;">${l}</p>`).join("")}${quoteButtonHtml}</td></tr><tr><td style="padding:16px 32px 24px;border-top:1px solid #eee;"><p style="margin:0;font-size:12px;color:#999;">Sent via QuotePro</p></td></tr></table></td></tr></table></body></html>`;
      const emailPayload = {
        personalizations: [{ to: [{ email: toEmail }] }],
        from: { email: fromEmail, name: fromName },
        subject,
        content: [{ type: "text/plain", value: body }, { type: "text/html", value: htmlBody }]
      };
      if (replyTo) emailPayload.reply_to = { email: replyTo, name: fromName };
      const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${sgApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(emailPayload)
      });
      if (!sgRes.ok) {
        const errText = await sgRes.text();
        console.error("Follow-up email error:", sgRes.status, errText);
        return { success: false, message: "Failed to send follow-up email" };
      }
    } else {
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
      if (!twilioSid || !twilioToken || !twilioFrom) return { success: false, message: "SMS service not configured" };
      const toPhone = customer?.phone;
      if (!toPhone) return { success: false, message: "Customer phone not found" };
      const quoteUrl = `${process.env.APP_URL || `https://${req.get("host")}`}/q/${quote.publicToken}`;
      const smsText = `${messageText}
${quoteUrl}`;
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const twilioRes = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Authorization": "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ From: twilioFrom, To: toPhone, Body: smsText }).toString()
      });
      if (!twilioRes.ok) {
        const errText = await twilioRes.text();
        console.error("Follow-up SMS error:", twilioRes.status, errText);
        return { success: false, message: "Failed to send follow-up SMS" };
      }
    }
    await updateCommunication(commId, { status: "sent", sentAt: /* @__PURE__ */ new Date(), content: messageText });
    return { success: true, message: "Follow-up sent successfully" };
  }
  app2.get("/api/quotes/:id/scheduled-followups", requireAuth, async (req, res) => {
    try {
      const followUps = await getScheduledFollowUpsForQuote(req.params.id);
      return res.json(followUps);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get scheduled follow-ups" });
    }
  });
  app2.post("/api/quotes/:id/followup-preview", requireAuth, requirePro, async (req, res) => {
    try {
      const quote = await getQuoteById(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      const customer = quote.customerId ? await getCustomerById(quote.customerId) : null;
      const business = await db_getBusinessById(quote.businessId);
      const channel = req.body.channel || "sms";
      const draft = await generateFollowUpMessage(quote, customer, business, channel);
      return res.json({ draft });
    } catch (error) {
      console.error("Followup preview error:", error);
      return res.status(500).json({ message: "Failed to generate preview" });
    }
  });
  app2.put("/api/communications/:id", requireAuth, async (req, res) => {
    try {
      const { content, scheduledFor, channel } = req.body;
      const updates = {};
      if (content !== void 0) updates.content = content;
      if (scheduledFor) updates.scheduledFor = new Date(scheduledFor);
      if (channel) updates.channel = channel;
      const comm = await updateCommunication(req.params.id, updates);
      return res.json(comm);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update communication" });
    }
  });
  app2.delete("/api/communications/:id", requireAuth, async (req, res) => {
    try {
      await updateCommunication(req.params.id, { status: "canceled" });
      return res.json({ message: "Follow-up canceled" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to cancel follow-up" });
    }
  });
  app2.post("/api/communications/:id/send-now", requireAuth, async (req, res) => {
    try {
      const result = await sendFollowUpNow(req.params.id, req);
      if (!result.success) return res.status(400).json({ message: result.message });
      return res.json({ success: true, message: result.message });
    } catch (error) {
      console.error("Send follow-up now error:", error);
      return res.status(500).json({ message: "Failed to send follow-up" });
    }
  });
  app2.get("/api/automations", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const rules = await getAutomationRules(business.id);
      return res.json(rules || null);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get automation rules" });
    }
  });
  app2.put("/api/automations", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const rules = await upsertAutomationRules(business.id, req.body);
      return res.json(rules);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update automation rules" });
    }
  });
  app2.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { completed, customerId, dueToday } = req.query;
      const list = await getTasksByBusiness(business.id, {
        completed: completed === "true" ? true : completed === "false" ? false : void 0,
        customerId,
        dueToday: dueToday === "true"
      });
      return res.json(list);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get tasks" });
    }
  });
  app2.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const data = { ...req.body, businessId: business.id };
      if (data.dueDate) data.dueDate = new Date(data.dueDate);
      const t = await createTask(data);
      return res.json(t);
    } catch (error) {
      return res.status(500).json({ message: "Failed to create task" });
    }
  });
  app2.put("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.dueDate) data.dueDate = new Date(data.dueDate);
      if (data.completed && !data.completedAt) data.completedAt = /* @__PURE__ */ new Date();
      const t = await updateTask(req.params.id, data);
      return res.json(t);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update task" });
    }
  });
  app2.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      await deleteTask(req.params.id);
      return res.json({ message: "Deleted" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to delete task" });
    }
  });
  app2.get("/api/reports/stats", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const stats = await getQuoteStats(business.id);
      return res.json(stats);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get stats" });
    }
  });
  app2.get("/api/reports/revenue", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const days = parseInt(req.query.days) || 30;
      const data = await getRevenueByPeriod(business.id, days);
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get revenue data" });
    }
  });
  app2.get("/api/revenue/unfollowed", requireAuth, requirePro, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const unfollowed = await getUnfollowedQuotes(business.id);
      const withCustomers = await Promise.all(
        unfollowed.map(async (q) => {
          const customer = q.customerId ? await getCustomerById(q.customerId) : null;
          return { ...q, customer };
        })
      );
      return res.json(withCustomers);
    } catch (error) {
      console.error("Get unfollowed quotes error:", error);
      return res.status(500).json({ message: "Failed to get unfollowed quotes" });
    }
  });
  app2.get("/api/revenue/pipeline", requireAuth, requirePro, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const [sentQuotes, viewedQuotes] = await Promise.all([
        getQuotesByBusiness(business.id, { status: "sent" }),
        getQuotesByBusiness(business.id, { status: "viewed" })
      ]);
      const open = [...sentQuotes, ...viewedQuotes];
      const pipelineValue = open.reduce((sum, q) => sum + q.total, 0);
      const expectedValue = open.reduce((sum, q) => sum + (q.expectedValue || q.total * 0.5), 0);
      const avgAge = open.length > 0 ? open.reduce((sum, q) => {
        const age = (Date.now() - (q.sentAt?.getTime() || q.createdAt.getTime())) / (1e3 * 60 * 60 * 24);
        return sum + age;
      }, 0) / open.length : 0;
      return res.json({
        totalPipeline: Math.round(pipelineValue * 100) / 100,
        expectedValue: Math.round(expectedValue * 100) / 100,
        openQuotes: open.length,
        avgAgeDays: Math.round(avgAge * 10) / 10,
        quotes: open.map((q) => ({
          ...q,
          ageDays: Math.round((Date.now() - (q.sentAt?.getTime() || q.createdAt.getTime())) / (1e3 * 60 * 60 * 24) * 10) / 10
        }))
      });
    } catch (error) {
      return res.status(500).json({ message: "Failed to get pipeline" });
    }
  });
  app2.get("/api/follow-ups", requireAuth, requirePro, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { status } = req.query;
      const followUps = await getFollowUpsByBusiness(business.id, { status });
      return res.json(followUps);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get follow-ups" });
    }
  });
  app2.get("/api/follow-ups/quote/:quoteId", requireAuth, requirePro, async (req, res) => {
    try {
      const followUps = await getFollowUpsByQuote(req.params.quoteId);
      return res.json(followUps);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get follow-ups" });
    }
  });
  app2.post("/api/follow-ups", requireAuth, requirePro, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { quoteId, scheduledFor, channel, message } = req.body;
      if (!quoteId || !scheduledFor) {
        return res.status(400).json({ message: "quoteId and scheduledFor are required" });
      }
      const fu = await createFollowUp({
        quoteId,
        businessId: business.id,
        scheduledFor: new Date(scheduledFor),
        channel,
        message
      });
      return res.json(fu);
    } catch (error) {
      return res.status(500).json({ message: "Failed to create follow-up" });
    }
  });
  app2.put("/api/follow-ups/:id", requireAuth, requirePro, async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.scheduledFor) data.scheduledFor = new Date(data.scheduledFor);
      if (data.sentAt) data.sentAt = new Date(data.sentAt);
      const fu = await updateFollowUp(req.params.id, data);
      return res.json(fu);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update follow-up" });
    }
  });
  app2.delete("/api/follow-ups/:id", requireAuth, requirePro, async (req, res) => {
    try {
      await deleteFollowUp(req.params.id);
      return res.json({ message: "Deleted" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to delete follow-up" });
    }
  });
  app2.get("/api/subscription", requireAuth, async (req, res) => {
    try {
      const user = await getUserById(req.session.userId);
      if (!user) return res.status(401).json({ message: "Not found" });
      return res.json({
        tier: user.subscriptionTier || "free",
        expiresAt: user.subscriptionExpiresAt
      });
    } catch {
      return res.status(500).json({ message: "Failed to get subscription" });
    }
  });
  app2.post("/api/subscription/upgrade", requireAuth, async (req, res) => {
    try {
      const user = await updateUser(req.session.userId, {
        subscriptionTier: "pro",
        subscriptionExpiresAt: null
      });
      return res.json({ tier: user.subscriptionTier, message: "Upgraded to Pro" });
    } catch {
      return res.status(500).json({ message: "Upgrade failed" });
    }
  });
  app2.get("/api/subscription/config", requireAuth, async (_req, res) => {
    return res.json({
      apiKey: process.env.REVENUECAT_API_KEY || "",
      googleApiKey: process.env.REVENUECAT_GOOGLE_API_KEY || "",
      entitlementId: "pro"
    });
  });
  app2.post("/api/subscription/sync", requireAuth, async (req, res) => {
    try {
      const { tier } = req.body;
      const validTiers = ["free", "starter", "growth", "pro"];
      if (!tier || !validTiers.includes(tier)) {
        return res.status(400).json({ message: "Invalid tier" });
      }
      const user = await updateUser(req.session.userId, {
        subscriptionTier: tier
      });
      return res.json({ tier: user.subscriptionTier });
    } catch {
      return res.status(500).json({ message: "Sync failed" });
    }
  });
  app2.post("/api/subscription/create-checkout", requireAuth, async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ message: "Stripe is not configured" });
      const user = await getUserById(req.session.userId);
      if (!user) return res.status(401).json({ message: "Not found" });
      const plan = req.body.plan || "growth";
      const interval = req.body.interval || "monthly";
      const tierRank = { free: 0, starter: 1, growth: 2, pro: 3 };
      const currentRank = tierRank[user.subscriptionTier] ?? 0;
      const requestedRank = tierRank[plan] ?? 2;
      if (currentRank >= requestedRank) return res.json({ alreadyPro: true });
      const PLAN_CONFIG = {
        starter: {
          name: "QuotePro Starter",
          desc: "20 quotes/month, Good/Better/Best quoting, CRM basics, branded intake forms",
          monthlyAmount: 1900,
          annualAmount: 1900 * 12,
          trialDays: 0
        },
        growth: {
          name: "QuotePro Growth",
          desc: "Unlimited quotes, AI tools, smart upsells, follow-up automations, full CRM, revenue dashboard",
          monthlyAmount: 4900,
          annualAmount: 49e3,
          trialDays: 7
        },
        pro: {
          name: "QuotePro Pro",
          desc: "Everything in Growth plus advanced automation, reporting, priority support, and premium capabilities",
          monthlyAmount: 9900,
          annualAmount: 99e3,
          trialDays: 7
        }
      };
      const config = PLAN_CONFIG[plan] ?? PLAN_CONFIG.growth;
      const isAnnual = interval === "annual";
      const unitAmount = isAnnual ? config.annualAmount : config.monthlyAmount;
      const recurringInterval = isAnnual ? "year" : "month";
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: String(user.id) }
        });
        stripeCustomerId = customer.id;
        await updateUser(user.id, { stripeCustomerId: customer.id });
      }
      const host = req.get("host");
      const protocol = host.includes("localhost") ? "http" : "https";
      const sessionParams = {
        customer: stripeCustomerId,
        mode: "subscription",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: config.name, description: config.desc },
              recurring: { interval: recurringInterval },
              unit_amount: unitAmount
            },
            quantity: 1
          }
        ],
        success_url: `${protocol}://${host}/app/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${protocol}://${host}/app/pricing`,
        subscription_data: {
          metadata: { userId: String(user.id), plan, interval },
          ...config.trialDays > 0 ? { trial_period_days: config.trialDays } : {}
        },
        metadata: { plan, interval },
        allow_promotion_codes: true
      };
      const session2 = await stripe.checkout.sessions.create(sessionParams);
      return res.json({ url: session2.url });
    } catch (error) {
      console.error("Subscription checkout error:", error?.message || error);
      return res.status(500).json({ message: "Failed to create checkout session" });
    }
  });
  app2.get("/api/subscription/verify-session", requireAuth, async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ message: "Stripe is not configured" });
      const { session_id } = req.query;
      if (!session_id) return res.status(400).json({ message: "Missing session_id" });
      const session2 = await stripe.checkout.sessions.retrieve(session_id);
      const sessionUserId = session2.subscription_data?.metadata?.userId || session2.metadata?.userId || (session2.customer ? void 0 : void 0);
      const user = await getUserById(req.session.userId);
      if (sessionUserId && sessionUserId !== String(req.session.userId)) {
        return res.status(403).json({ message: "Session does not belong to this user" });
      }
      if (user && user.stripeCustomerId && session2.customer !== user.stripeCustomerId) {
        return res.status(403).json({ message: "Session customer mismatch" });
      }
      if (session2.payment_status === "paid" || session2.status === "complete") {
        const planFromMeta = session2.metadata?.plan || "growth";
        const intervalFromMeta = session2.metadata?.interval || "monthly";
        await updateUser(req.session.userId, {
          subscriptionTier: planFromMeta,
          subscriptionInterval: intervalFromMeta,
          subscriptionExpiresAt: null
        });
        return res.json({ success: true, tier: planFromMeta });
      }
      return res.json({ success: false, status: session2.status });
    } catch (error) {
      console.error("Verify session error:", error);
      return res.status(500).json({ message: "Failed to verify session" });
    }
  });
  app2.post("/api/subscription/webhook", async (req, res) => {
    try {
      if (!stripe) return res.status(503).send("Stripe not configured");
      const sig = req.headers["stripe-signature"];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      let event;
      if (sig && webhookSecret) {
        try {
          event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } catch (err) {
          console.error("Webhook signature verification failed:", err.message);
          return res.status(400).send(`Webhook Error: ${err.message}`);
        }
      } else {
        event = req.body;
      }
      switch (event.type) {
        case "checkout.session.completed": {
          const session2 = event.data.object;
          const userId = session2.subscription_data?.metadata?.userId || session2.metadata?.userId;
          if (userId && session2.mode === "subscription") {
            const planMeta = session2.subscription_data?.metadata?.plan || session2.metadata?.plan || "growth";
            const intervalMeta = session2.subscription_data?.metadata?.interval || session2.metadata?.interval || "monthly";
            await updateUser(userId, { subscriptionTier: planMeta, subscriptionInterval: intervalMeta, subscriptionExpiresAt: null });
            console.log(`Subscription activated for user ${userId} on plan ${planMeta}`);
          }
          break;
        }
        case "customer.subscription.deleted":
        case "customer.subscription.updated": {
          const subscription = event.data.object;
          const userId = subscription.metadata?.userId;
          if (userId) {
            const isActive = subscription.status === "active" || subscription.status === "trialing";
            const planFromMeta = subscription.metadata?.plan || "growth";
            await updateUser(userId, {
              subscriptionTier: isActive ? planFromMeta : "free",
              subscriptionExpiresAt: isActive ? null : /* @__PURE__ */ new Date()
            });
            console.log(`Subscription ${isActive ? "active (" + planFromMeta + ")" : "cancelled"} for user ${userId}`);
          }
          break;
        }
      }
      return res.json({ received: true });
    } catch (error) {
      console.error("Webhook error:", error);
      return res.status(500).json({ message: "Webhook processing failed" });
    }
  });
  app2.post("/api/subscription/create-portal", requireAuth, async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ message: "Stripe is not configured" });
      const user = await getUserById(req.session.userId);
      if (!user) return res.status(401).json({ message: "Not found" });
      const stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) return res.status(400).json({ message: "No billing account found" });
      const host = req.get("host");
      const protocol = host.includes("localhost") ? "http" : "https";
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${protocol}://${host}/app/settings`
      });
      return res.json({ url: portalSession.url });
    } catch (error) {
      console.error("Portal session error:", error);
      return res.status(500).json({ message: "Failed to create portal session" });
    }
  });
  app2.post("/api/ai/analyze-quote", requireAuth, requirePro, async (req, res) => {
    try {
      const { quoteId } = req.body;
      if (!quoteId) return res.status(400).json({ message: "quoteId is required" });
      const quote = await getQuoteById(quoteId);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      const customer = quote.customerId ? await getCustomerById(quote.customerId) : null;
      const comms = await getCommunicationsByBusiness(quote.businessId, { quoteId });
      const ageDays = Math.round((Date.now() - (quote.sentAt?.getTime() || quote.createdAt.getTime())) / (1e3 * 60 * 60 * 24) * 10) / 10;
      const lastComm = comms.length > 0 ? comms[0] : null;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an AI sales assistant for a residential cleaning company. Analyze a quote and provide actionable insights. Respond with JSON: {"closeProbability": number 0-100, "suggestedAction": string, "followUpMessage": string, "notes": string}`
          },
          {
            role: "user",
            content: `Quote: $${quote.total}, sent ${ageDays} days ago, status: ${quote.status}, ${comms.length} communications sent. Customer: ${customer ? `${customer.firstName} ${customer.lastName}, status: ${customer.status}` : "Unknown"}. Last contact: ${lastComm ? `${lastComm.channel} ${lastComm.createdAt}` : "None"}.`
          }
        ],
        response_format: { type: "json_object" }
      });
      const content = completion.choices[0]?.message?.content;
      let parsed = {};
      try {
        parsed = JSON.parse(content || "{}");
      } catch {
      }
      await updateQuote(quoteId, {
        closeProbability: parsed.closeProbability || null,
        expectedValue: quote.total * ((parsed.closeProbability || 50) / 100),
        aiNotes: parsed.notes || null
      });
      return res.json({
        closeProbability: parsed.closeProbability || 50,
        suggestedAction: parsed.suggestedAction || "Follow up with the customer",
        followUpMessage: parsed.followUpMessage || "",
        notes: parsed.notes || ""
      });
    } catch (error) {
      console.error("AI analyze quote error:", error);
      return res.status(500).json({ message: "Failed to analyze quote" });
    }
  });
  app2.post("/api/ai/generate-followup", requireAuth, requirePro, async (req, res) => {
    try {
      const { quoteId, channel, context, language: commLang } = req.body;
      if (!quoteId) return res.status(400).json({ message: "quoteId is required" });
      const quote = await getQuoteById(quoteId);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      const customer = quote.customerId ? await getCustomerById(quote.customerId) : null;
      const business = await db_getBusinessById(quote.businessId);
      const ageDays = Math.round((Date.now() - (quote.sentAt?.getTime() || quote.createdAt.getTime())) / (1e3 * 60 * 60 * 24) * 10) / 10;
      const msgType = channel === "email" ? "email" : "SMS";
      const maxLen = channel === "email" ? 200 : 160;
      const langInstruction = commLang === "es" ? " Write the message entirely in Spanish." : " Write the message entirely in English.";
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Write a ${msgType} follow-up message (under ${maxLen} chars for SMS) for "${business?.companyName || "our company"}". The quote is $${quote.total} sent ${ageDays} days ago. Be warm, not pushy. No emojis. Sign as "${business?.senderName || "Team"}".${context ? ` Context: ${context}` : ""}${langInstruction}`
          },
          {
            role: "user",
            content: `Generate a follow-up ${msgType} for ${customer ? `${customer.firstName}` : "the customer"}. Reply with ONLY the message text.`
          }
        ],
        max_completion_tokens: channel === "email" ? 250 : 100
      });
      const draft = completion.choices[0]?.message?.content?.trim() || "";
      return res.json({ draft });
    } catch (error) {
      console.error("AI generate followup error:", error);
      return res.status(500).json({ message: "Failed to generate follow-up" });
    }
  });
  app2.post("/api/ai/sales-chat", requireAuth, requirePro, async (req, res) => {
    try {
      const { message, conversationHistory } = req.body;
      if (!message) return res.status(400).json({ message: "message is required" });
      const business = await getBusinessByOwner(req.session.userId);
      let contextStr = "No business data yet \u2014 give general cleaning sales coaching.";
      const now = /* @__PURE__ */ new Date();
      if (business) {
        const [stats, allQuotes, customers2, jobs2, comms] = await Promise.all([
          getQuoteStats(business.id),
          getQuotesByBusiness(business.id),
          getCustomersByBusiness(business.id),
          getJobsByBusiness(business.id),
          getCommunicationsByBusiness(business.id)
        ]);
        const sentQuotes = allQuotes.filter((q) => q.status === "sent");
        const acceptedQuotes = allQuotes.filter((q) => q.status === "accepted");
        const declinedQuotes = allQuotes.filter((q) => q.status === "declined");
        const completedJobs = jobs2.filter((j) => j.status === "completed");
        const scheduledJobs = jobs2.filter((j) => j.status === "scheduled");
        const customerMap = new Map(customers2.map((c) => [c.id, c]));
        const pipelineValue = sentQuotes.reduce((s, q) => s + q.total, 0);
        const avgAcceptedTotal = acceptedQuotes.length > 0 ? acceptedQuotes.reduce((s, q) => s + q.total, 0) / acceptedQuotes.length : 0;
        const recurringCount = acceptedQuotes.filter((q) => q.frequencySelected !== "one-time").length;
        const openQuoteDetails = sentQuotes.sort((a, b) => (a.sentAt?.getTime() || a.createdAt.getTime()) - (b.sentAt?.getTime() || b.createdAt.getTime())).slice(0, 8).map((q) => {
          const cust = q.customerId ? customerMap.get(q.customerId) : null;
          const name = cust ? `${cust.firstName} ${cust.lastName}`.trim() : "Unknown";
          const sentDate = q.sentAt || q.createdAt;
          const ageDays = Math.round((now.getTime() - sentDate.getTime()) / (1e3 * 60 * 60 * 24));
          const quoteComms = comms.filter((c) => c.quoteId === q.id);
          const followUpAge = quoteComms.length > 0 ? Math.round((now.getTime() - new Date(quoteComms[0].createdAt).getTime()) / (1e3 * 60 * 60 * 24)) : null;
          return `  - ${name}: $${q.total.toFixed(0)} ${q.frequencySelected} (${q.selectedOption}), ${ageDays}d old${followUpAge !== null ? `, last follow-up ${followUpAge}d ago` : ", no follow-up sent"}`;
        });
        const dormantCount = customers2.filter((c) => {
          const lastJob = jobs2.filter((j) => j.customerId === c.id && j.status === "completed").sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
          if (!lastJob) return false;
          return (now.getTime() - new Date(lastJob.updatedAt).getTime()) / (1e3 * 60 * 60 * 24) > 45;
        }).length;
        const recentWins = acceptedQuotes.sort((a, b) => (b.acceptedAt?.getTime() || 0) - (a.acceptedAt?.getTime() || 0)).slice(0, 4).map((q) => {
          const name = q.customerId ? (() => {
            const c = customerMap.get(q.customerId);
            return c ? `${c.firstName} ${c.lastName}`.trim() : "Unknown";
          })() : "Unknown";
          return `  - ${name}: $${q.total.toFixed(0)} ${q.frequencySelected}`;
        });
        const contextParts = [
          `Business: ${business.companyName} | Date: ${now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`,
          `Close rate: ${stats.closeRate}% | Pipeline: ${sentQuotes.length} quotes worth $${pipelineValue.toFixed(0)} | Avg quote: $${avgAcceptedTotal.toFixed(0)}`,
          `Won: ${stats.acceptedQuotes} quotes (${recurringCount} recurring) | Lost: ${declinedQuotes.length} | Scheduled jobs: ${scheduledJobs.length}`,
          `Customers: ${customers2.length} total, ${dormantCount} dormant (45d+), ${customers2.filter((c) => c.isVip).length} VIP`
        ];
        if (openQuoteDetails.length > 0) contextParts.push(`Open quotes needing follow-up:
${openQuoteDetails.join("\n")}`);
        if (recentWins.length > 0) contextParts.push(`Recent wins:
${recentWins.join("\n")}`);
        contextStr = contextParts.join("\n");
      }
      const businessName = business?.companyName || "your cleaning business";
      const systemPrompt = `You are an elite AI sales coach for "${businessName}", a residential cleaning company. Your job is to help the owner close more jobs, handle objections, and grow recurring revenue.

RESPONSE FORMAT \u2014 return ONLY valid JSON, no other text:
{
  "mode": "follow-up" | "objection" | "script" | "strategy" | "coaching",
  "quickTakeaway": "1-2 sentences. The single most important thing to do right now.",
  "approach": "2-4 sentences. The reasoning, framing, and recommended tactic.",
  "scripts": [
    { "label": "Text message", "content": "Ready-to-send script \u2014 direct and conversational" },
    { "label": "Email", "content": "Ready-to-send email with subject line on first line" }
  ],
  "alternateVersions": [
    { "label": "More direct", "content": "..." }
  ],
  "nextStep": "1-2 sentences. What to do if no response after 48 hours."
}

RULES:
- scripts: include 1-3 that are relevant. Omit irrelevant types. Always include a text message if a script is needed.
- alternateVersions: include 1-2 when useful (softer, more direct, more premium, recurring-focused, phone). Omit if not helpful.
- All scripts must sound human, not robotic. No placeholders like [Name]. Use real names from data if available.
- Stay focused on cleaning service sales: one-time, recurring, deep clean, weekly/biweekly/monthly, move-in/out, add-ons.
- When business data is available, reference real names, dollar amounts, and timelines. Never be generic.
- Key sales principles: 48hr follow-up sweet spot; recurring = 3-5x value of one-time; price objection = reframe value saved per hour; "thinking about it" = create gentle urgency; deep clean first = sets the standard for recurring.
- Do NOT write essay-length answers. Be direct, decisive, tactical.

BUSINESS DATA:
${contextStr}`;
      const chatMessages = [{ role: "system", content: systemPrompt }];
      if (conversationHistory && Array.isArray(conversationHistory)) {
        for (const msg of conversationHistory.slice(-4)) {
          chatMessages.push({ role: msg.role, content: msg.content });
        }
      }
      chatMessages.push({ role: "user", content: message });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: chatMessages,
        max_completion_tokens: 800,
        response_format: { type: "json_object" }
      });
      const rawContent = completion.choices[0]?.message?.content?.trim() || "";
      if (!rawContent) {
        return res.json({ reply: "I'm having trouble generating a response right now. Please try again.", mode: "coaching", quickTakeaway: "", approach: "", scripts: [], alternateVersions: [], nextStep: "" });
      }
      let structured = {};
      try {
        structured = JSON.parse(rawContent);
      } catch {
        structured = { mode: "coaching", quickTakeaway: rawContent, approach: "", scripts: [], alternateVersions: [], nextStep: "" };
      }
      return res.json({
        reply: rawContent,
        mode: structured.mode || "coaching",
        quickTakeaway: structured.quickTakeaway || "",
        approach: structured.approach || "",
        scripts: Array.isArray(structured.scripts) ? structured.scripts : [],
        alternateVersions: Array.isArray(structured.alternateVersions) ? structured.alternateVersions : [],
        nextStep: structured.nextStep || ""
      });
    } catch (error) {
      console.error("AI sales chat error:", error?.message || error);
      return res.status(500).json({ message: "Failed to process your question. Please try again." });
    }
  });
  app2.post("/api/send/email", requireAuth, requirePro, async (req, res) => {
    try {
      const { to, subject, body, customerId, quoteId, includeQuoteLink } = req.body;
      if (!to || !body) {
        return res.status(400).json({ message: "to and body are required" });
      }
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const sgApiKey = process.env.SENDGRID_API_KEY;
      if (!sgApiKey) {
        return res.status(503).json({ message: "Email service not configured. Please connect SendGrid in settings." });
      }
      const brandedFromEmail = process.env.SENDGRID_FROM_EMAIL || "quotes@myreminder.ai";
      const fromName = business.companyName || "QuotePro";
      const replyToEmail = business.email || void 0;
      if (!replyToEmail) {
        return res.status(400).json({ success: false, message: "Please add your email address in Settings before sending emails. This ensures customer replies go directly to you." });
      }
      let bodyContent = body;
      let quoteButtonHtml = "";
      if (includeQuoteLink && quoteId) {
        const quote = await getQuoteById(quoteId);
        if (quote && quote.publicToken) {
          const quoteUrl = `${getPublicBaseUrl(req)}/q/${quote.publicToken}`;
          const qpEmail = business.quotePreferences;
          const primaryColor = qpEmail?.brandColor || business.primaryColor || "#2563EB";
          quoteButtonHtml = `
<div style="margin-top:24px;text-align:center;">
  <a href="${quoteUrl}" style="display:inline-block;background:${primaryColor};color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">View & Accept Your Quote</a>
</div>`;
        }
      }
      const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#007AFF,#5856D6);padding:24px 32px;">
          <h2 style="color:#ffffff;margin:0;font-size:20px;">${fromName}</h2>
        </td></tr>
        <tr><td style="padding:32px;">
          ${bodyContent.split("\n").map((line) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333333;">${line}</p>`).join("")}
          ${quoteButtonHtml}
        </td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#999999;">Sent via QuotePro</p>
          <p style="margin:4px 0 0;font-size:11px;color:#bbbbbb;">If you no longer wish to receive these emails, please reply with "unsubscribe".</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
      const emailPayload = {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: brandedFromEmail, name: fromName },
        subject: subject || `Message from ${fromName}`,
        content: [
          { type: "text/plain", value: bodyContent },
          { type: "text/html", value: htmlBody }
        ]
      };
      if (replyToEmail) {
        emailPayload.reply_to = { email: replyToEmail, name: fromName };
      }
      const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sgApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(emailPayload)
      });
      if (!sgRes.ok) {
        const errText = await sgRes.text();
        console.error("SendGrid error:", sgRes.status, errText);
        let errorDetail = "Failed to send email";
        try {
          const errJson = JSON.parse(errText);
          if (errJson.errors && errJson.errors.length > 0) {
            errorDetail = errJson.errors.map((e) => e.message).join("; ");
          }
        } catch {
        }
        return res.status(502).json({ message: errorDetail });
      }
      console.log(`Email sent via SendGrid: from=${brandedFromEmail}, to=${to}, replyTo=${replyToEmail}, status=${sgRes.status}`);
      await createCommunication({
        businessId: business.id,
        customerId: customerId || void 0,
        quoteId: quoteId || void 0,
        channel: "email",
        direction: "outbound",
        content: bodyContent,
        status: "sent"
      });
      return res.json({ success: true, message: "Email sent successfully" });
    } catch (error) {
      console.error("Send email error:", error);
      return res.status(500).json({ message: "Failed to send email" });
    }
  });
  app2.post("/api/send/sms", requireAuth, requirePro, async (req, res) => {
    try {
      const { to, body, customerId, quoteId } = req.body;
      if (!to || !body) {
        return res.status(400).json({ message: "to and body are required" });
      }
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
      if (!twilioSid || !twilioToken || !twilioFrom) {
        return res.status(503).json({ message: "SMS service not configured. Please connect Twilio in settings." });
      }
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const twilioRes = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          "Authorization": "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          To: to,
          From: twilioFrom,
          Body: body
        }).toString()
      });
      if (!twilioRes.ok) {
        const errText = await twilioRes.text();
        console.error("Twilio error:", errText);
        return res.status(502).json({ message: "Failed to send SMS" });
      }
      const twilioData = await twilioRes.json();
      await createCommunication({
        businessId: business.id,
        customerId: customerId || void 0,
        quoteId: quoteId || void 0,
        channel: "sms",
        direction: "outbound",
        content: body,
        status: "sent"
      });
      return res.json({ success: true, message: "SMS sent successfully", sid: twilioData.sid });
    } catch (error) {
      console.error("Send SMS error:", error);
      return res.status(500).json({ message: "Failed to send SMS" });
    }
  });
  app2.post("/api/ai/quote-descriptions", requireAuth, requirePro, async (req, res) => {
    try {
      const { homeDetails, serviceTypes, addOns, companyName } = req.body;
      if (!homeDetails || !serviceTypes) {
        return res.status(400).json({ message: "homeDetails and serviceTypes are required" });
      }
      const addOnsList = [];
      if (addOns) {
        if (addOns.insideFridge) addOnsList.push("inside fridge cleaning");
        if (addOns.insideOven) addOnsList.push("inside oven cleaning");
        if (addOns.insideWindows) addOnsList.push("inside window cleaning");
        if (addOns.insideCabinets) addOnsList.push("inside cabinet cleaning");
        if (addOns.laundry) addOnsList.push("laundry");
        if (addOns.dishes) addOnsList.push("dishes");
      }
      const propertyDescription = [
        homeDetails.sqft ? `${homeDetails.sqft} sq ft` : null,
        homeDetails.beds ? `${homeDetails.beds} bedroom(s)` : null,
        homeDetails.baths ? `${homeDetails.baths} bathroom(s)` : null,
        homeDetails.halfBaths ? `${homeDetails.halfBaths} half bath(s)` : null,
        homeDetails.homeType ? `${homeDetails.homeType}` : null,
        homeDetails.petType && homeDetails.petType !== "none" ? `has ${homeDetails.petType}` : null,
        homeDetails.conditionScore ? `condition score ${homeDetails.conditionScore}/5` : null
      ].filter(Boolean).join(", ");
      const systemPrompt = `You are a professional cleaning company copywriter for ${companyName || "our company"}. Generate scope-of-work descriptions for three cleaning service tiers (good, better, best). Rules:
- Write 1-2 sentences per option, professional but warm tone
- Include specific property details: ${propertyDescription}
- Differentiate clearly between the three options
- Never mention hours or time estimates
- Never mention pricing or costs
${addOnsList.length > 0 ? `- The best option includes these add-ons: ${addOnsList.join(", ")}` : ""}
Respond with a JSON object with keys "good", "better", "best", each containing the description string.`;
      const userPrompt = `Property: ${propertyDescription}
Good tier: ${serviceTypes.good || "Basic Cleaning"}
Better tier: ${serviceTypes.better || "Standard Cleaning"}
Best tier: ${serviceTypes.best || "Deep Clean"}
${addOnsList.length > 0 ? `Add-ons included in best: ${addOnsList.join(", ")}` : ""}`;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: "No response from AI" });
      }
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = {
          good: content,
          better: content,
          best: content
        };
      }
      return res.json({
        good: parsed.good || "",
        better: parsed.better || "",
        best: parsed.best || ""
      });
    } catch (error) {
      console.error("AI quote descriptions error:", error);
      return res.status(500).json({ message: "Failed to generate quote descriptions" });
    }
  });
  app2.post("/api/ai/pricing-suggestion", requireAuth, requirePro, async (req, res) => {
    try {
      const { homeDetails, addOns, frequency, currentPrices, pricingSettings: ps, businessHistory } = req.body;
      if (!homeDetails || !currentPrices) return res.status(400).json({ message: "homeDetails and currentPrices required" });
      const propertyDesc = [
        homeDetails.sqft ? `${homeDetails.sqft} sqft` : null,
        homeDetails.beds ? `${homeDetails.beds} bed` : null,
        homeDetails.baths ? `${homeDetails.baths} bath` : null,
        homeDetails.halfBaths ? `${homeDetails.halfBaths} half bath` : null,
        homeDetails.homeType || null,
        homeDetails.conditionScore ? `condition ${homeDetails.conditionScore}/10` : null,
        homeDetails.peopleCount ? `${homeDetails.peopleCount} people` : null,
        homeDetails.petType && homeDetails.petType !== "none" ? `pet: ${homeDetails.petType}${homeDetails.petShedding ? " (shedding)" : ""}` : null
      ].filter(Boolean).join(", ");
      const addOnsList = [];
      if (addOns) {
        Object.entries(addOns).forEach(([k, v]) => {
          if (v) addOnsList.push(k.replace(/([A-Z])/g, " $1").toLowerCase().trim());
        });
      }
      const historyContext = businessHistory ? `Business stats: ${businessHistory.totalQuotes || 0} quotes sent, ${businessHistory.acceptRate || 0}% acceptance rate, avg quote $${businessHistory.avgQuote || 0}, hourly rate $${ps?.hourlyRate || 55}. ${businessHistory.recentAccepted ? `Recent accepted quotes ranged $${businessHistory.recentAcceptedMin}-$${businessHistory.recentAcceptedMax}.` : ""}` : `Hourly rate: $${ps?.hourlyRate || 55}. No historical data available.`;
      const systemPrompt = `You are a pricing strategist for residential cleaning. Suggest optimal Good/Better/Best prices. Be concise. Round to nearest $5. Respond with JSON: {"good":{"suggestedPrice":number,"reasoning":"1 sentence"},"better":{"suggestedPrice":number,"reasoning":"1 sentence"},"best":{"suggestedPrice":number,"reasoning":"1 sentence"},"overallAssessment":"1-2 sentences","confidence":"low"|"medium"|"high","keyInsight":"1 sentence"}`;
      const userPrompt = `Property: ${propertyDesc}
Frequency: ${frequency || "one-time"}
Add-ons: ${addOnsList.length > 0 ? addOnsList.join(", ") : "none"}

Current prices:
- Good: $${currentPrices.good}
- Better: $${currentPrices.better}
- Best: $${currentPrices.best}

${historyContext}`;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 300
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) return res.status(500).json({ message: "No response from AI" });
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        return res.status(500).json({ message: "Invalid AI response" });
      }
      return res.json({
        good: { suggestedPrice: parsed.good?.suggestedPrice || currentPrices.good, reasoning: parsed.good?.reasoning || "" },
        better: { suggestedPrice: parsed.better?.suggestedPrice || currentPrices.better, reasoning: parsed.better?.reasoning || "" },
        best: { suggestedPrice: parsed.best?.suggestedPrice || currentPrices.best, reasoning: parsed.best?.reasoning || "" },
        overallAssessment: parsed.overallAssessment || "",
        confidence: parsed.confidence || "medium",
        keyInsight: parsed.keyInsight || ""
      });
    } catch (error) {
      console.error("AI pricing suggestion error:", error);
      return res.status(500).json({ message: "Failed to generate pricing suggestion" });
    }
  });
  app2.post("/api/ai/walkthrough-extract", requireAuth, requirePro, async (req, res) => {
    try {
      const raw = req.body.description || req.body.notes || "";
      const description = typeof raw === "string" ? raw.trim() : "";
      if (!description) {
        return res.status(400).json({ message: "A job description is required" });
      }
      const business = await getBusinessByOwner(req.session.userId);
      if (business) {
        try {
          await createAnalyticsEvent({
            businessId: business.id,
            eventName: "walkthrough_analysis_started",
            properties: { descriptionLength: description.length }
          });
        } catch (_e) {
        }
      }
      const systemPrompt = `You are an expert quoting assistant for residential and commercial cleaning businesses. A cleaning company owner will paste rough notes, walkthrough text, a customer message, or a property description. Your job is to extract all useful quoting details and return a structured JSON response.

You understand cleaning-industry terminology:
- "first-time clean" or "initial clean" \u2192 isFirstTimeClean: true, often implies deep clean
- "maintenance clean" or "recurring" \u2192 standard recurring service
- "deep clean" \u2192 isDeepClean: true, serviceCategory: "deep"
- "move-in" / "move-out" / "vacant" \u2192 isMoveInOut: true, serviceCategory: "move-in-out"
- "biweekly" / "every two weeks" \u2192 frequency: "bi-weekly"
- "very dirty" / "hasn't been cleaned in months" / "heavy buildup" \u2192 conditionLevel: "heavy" or "extreme"
- "light" / "pretty clean" / "just needs a touch-up" \u2192 conditionLevel: "light"
- "inside fridge" / "inside oven" \u2192 add to addOns
- "Airbnb" / "turnover clean" / "short-term rental" \u2192 note in serviceNotes, may be recurring one-time
- "salon" / "office" / "boutique" / "medical" / "restaurant" \u2192 isCommercial: true, set propertyType

Return ONLY a valid JSON object with this exact structure:
{
  "extractedFields": {
    "propertyType": "house" | "apartment" | "condo" | "townhouse" | "office" | "retail" | "medical" | "restaurant" | "gym" | "airbnb" | "other" | null,
    "serviceCategory": "standard" | "deep" | "move-in-out" | "post-construction" | "recurring" | "one-time" | null,
    "isCommercial": boolean,
    "bedrooms": number | null,
    "bathrooms": number | null,
    "halfBaths": number | null,
    "sqft": number | null,
    "occupants": number | null,
    "frequency": "one-time" | "weekly" | "bi-weekly" | "monthly" | null,
    "isFirstTimeClean": boolean,
    "isDeepClean": boolean,
    "isMoveInOut": boolean,
    "petCount": number | null,
    "petType": "dog" | "cat" | "both" | "other" | "none" | null,
    "petShedding": boolean | null,
    "addOns": string[],
    "conditionLevel": "light" | "moderate" | "heavy" | "extreme" | null,
    "conditionReasoning": string | null,
    "urgency": "normal" | "rush" | "flexible" | null,
    "customerName": string | null,
    "address": string | null,
    "serviceNotes": string | null
  },
  "missingFields": string[],
  "recommendations": string[],
  "serviceReasoning": string,
  "assumptions": string[],
  "confidence": "high" | "medium" | "low"
}

Field rules:
- Use null for any field not mentioned or inferable. Never guess without strong signal.
- isFirstTimeClean / isDeepClean / isMoveInOut default to false if not mentioned.
- isCommercial defaults to false.
- addOns: use plain English strings like "inside oven", "inside fridge", "window cleaning", "laundry", "organizing", "baseboards", "blinds", "carpet cleaning", "wall washing", "garage", "pet hair treatment".
- missingFields: list what a cleaner would need to finalize a quote but couldn't determine, e.g. ["square footage", "service frequency", "cleaning type"].
- recommendations: 1-3 short, practical suggestions for the cleaner, e.g. "First-time deep clean recommended given language about dirtiness", "Ask about preferred recurring schedule after initial clean".
- serviceReasoning: one sentence explaining why you chose the serviceCategory you did.
- assumptions: list any inferences you made that aren't explicitly stated.
- confidence: high = most key fields filled, medium = some gaps, low = very sparse.
- NEVER include prices, costs, rates, or dollar amounts.`;
      let completion;
      try {
        completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: description }
          ],
          response_format: { type: "json_object" }
        });
      } catch (aiError) {
        console.error("Walkthrough AI call failed:", aiError?.message || aiError);
        return res.status(500).json({ message: "AI service is temporarily unavailable. Please try again in a moment." });
      }
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        console.error("Walkthrough AI empty response");
        return res.status(500).json({ message: "AI returned an empty response. Please try again." });
      }
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        console.error("Walkthrough AI JSON parse failed:", content?.slice(0, 200));
        return res.status(500).json({ message: "AI response could not be parsed. Please try again." });
      }
      const extractedFields = parsed.extractedFields || {};
      const missingFields = Array.isArray(parsed.missingFields) ? parsed.missingFields : [];
      const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
      const serviceReasoning = typeof parsed.serviceReasoning === "string" ? parsed.serviceReasoning : "";
      const assumptions = Array.isArray(parsed.assumptions) ? parsed.assumptions : [];
      const confidence = ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "low";
      if (business) {
        try {
          await createAnalyticsEvent({
            businessId: business.id,
            eventName: "walkthrough_analysis_completed",
            properties: {
              confidence,
              isCommercial: extractedFields.isCommercial || false,
              propertyType: extractedFields.propertyType || "unknown",
              assumptionCount: assumptions.length
            }
          });
        } catch (_e) {
        }
      }
      return res.json({
        extractedFields,
        missingFields,
        recommendations,
        serviceReasoning,
        assumptions,
        confidence
      });
    } catch (error) {
      console.error("AI walkthrough extract error:", error);
      return res.status(500).json({ message: "Failed to analyze the job description. Please try again." });
    }
  });
  app2.post("/api/ai/closing-message", requireAuth, requirePro, async (req, res) => {
    try {
      const {
        objectionText,
        objectionType: objType,
        tone,
        language: msgLanguage,
        quoteAmount,
        serviceType,
        frequency,
        addOns,
        customerName,
        notes,
        pricingSummary,
        messageType
      } = req.body;
      if (!tone) {
        return res.status(400).json({ message: "Tone is required" });
      }
      const business = await getBusinessByOwner(req.session.userId);
      if (business) {
        try {
          await createAnalyticsEvent({
            businessId: business.id,
            eventName: "objection_assistant_used",
            properties: { objectionType: objType || messageType || "general", tone, language: msgLanguage || "en" }
          });
        } catch (_e) {
        }
      }
      const businessName = business?.companyName || "our company";
      const languageMap = { en: "English", es: "Spanish", pt: "Portuguese", ru: "Russian" };
      const targetLanguage = languageMap[msgLanguage || "en"] || "English";
      const systemPrompt = `You are an elite AI sales assistant for cleaning businesses. Your job is to help the business owner craft the perfect response to a customer objection or hesitation so they can close more jobs.

You will analyze the customer's message and generate a structured JSON response with:
1. primaryReply \u2014 a ready-to-send message that addresses the objection and guides toward booking
2. alternateReply \u2014 a different angle (e.g. softer, more direct, or differently framed)
3. objectionType \u2014 classify the objection in 2-4 words (e.g., "Price objection", "Commitment hesitation", "Recurring resistance", "Deep clean resistance", "One-time preference")
4. nextMove \u2014 a short tactical tip for what the business owner should do after sending the reply

Rules:
- Write ENTIRELY in ${targetLanguage}
- Tone: ${tone}
- Replies must feel human and genuine \u2014 never robotic or salesy
- Keep replies concise and text-message ready (unless the context suggests email)
- Reference cleaning-specific details: deep clean, recurring service, weekly/biweekly/monthly, quote amount, first-time clean
- Use the customer's name if provided; otherwise write naturally without one
- Business: ${businessName}
- Do NOT use emojis
- Do NOT use placeholder brackets like [Name]
- Return ONLY a valid JSON object, no other text

Return exactly this JSON structure:
{
  "primaryReply": "...",
  "alternateReply": "...",
  "objectionType": "...",
  "nextMove": "..."
}`;
      const contextParts = [];
      if (objectionText) contextParts.push(`Customer's message: "${objectionText}"`);
      if (customerName) contextParts.push(`Customer name: ${customerName}`);
      if (quoteAmount) contextParts.push(`Quote amount: $${Number(quoteAmount).toFixed(2)}`);
      if (serviceType) contextParts.push(`Service type: ${serviceType}`);
      if (frequency) contextParts.push(`Cleaning frequency: ${frequency}`);
      if (addOns && Array.isArray(addOns) && addOns.length > 0) contextParts.push(`Add-ons: ${addOns.join(", ")}`);
      if (notes) contextParts.push(`Additional context: ${notes}`);
      if (pricingSummary) contextParts.push(`Pricing summary: ${pricingSummary}`);
      if (objType || messageType) contextParts.push(`Objection category: ${(objType || messageType || "").replace(/_/g, " ")}`);
      const userMessage = contextParts.length > 0 ? `Generate an objection response with a ${tone} tone:

${contextParts.join("\n")}` : `Generate a sample price objection response with a ${tone} tone for a cleaning business. Example objection: "That's more than I expected."`;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        max_completion_tokens: 800,
        response_format: { type: "json_object" }
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) return res.status(500).json({ message: "No response from AI" });
      let parsed = {};
      try {
        parsed = JSON.parse(content);
      } catch {
        return res.json({ message: content.trim(), primaryReply: content.trim() });
      }
      return res.json({
        message: parsed.primaryReply || content.trim(),
        primaryReply: parsed.primaryReply || "",
        alternateReply: parsed.alternateReply || "",
        objectionType: parsed.objectionType || "",
        nextMove: parsed.nextMove || ""
      });
    } catch (error) {
      console.error("AI objection assistant error:", error);
      return res.status(500).json({ message: "Failed to generate reply. Please try again." });
    }
  });
  app2.post("/api/ai/objection-extract", requireAuth, requirePro, async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) return res.status(400).json({ message: "Image is required" });
      const dataUrl = `data:${mimeType || "image/jpeg"};base64,${imageBase64}`;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract the visible text from this screenshot of a text message or chat conversation. Return ONLY the extracted text, preserving the conversation flow. Focus especially on the customer's most recent message or objection. Do not add any commentary."
              },
              {
                type: "image_url",
                image_url: { url: dataUrl }
              }
            ]
          }
        ],
        max_completion_tokens: 400
      });
      const extractedText = completion.choices[0]?.message?.content?.trim() || "";
      return res.json({ text: extractedText });
    } catch (error) {
      console.error("Objection extract error:", error);
      return res.status(500).json({ message: "Could not extract text from image. Please type the message manually." });
    }
  });
  app2.post("/api/ai/communication-draft", requireAuth, requirePro, async (req, res) => {
    try {
      const { type, purpose, customerName, companyName, senderName, quoteDetails, bookingLink, quoteLink, paymentMethodsText, language: commLang } = req.body;
      if (!type || !purpose) {
        return res.status(400).json({ message: "type and purpose are required" });
      }
      const purposeDescriptions = {
        send_quote: "sending a new quote to the customer for the first time - be enthusiastic, highlight the value and services included, mention the quote is ready for them to review, and encourage them to accept. If a quote link is available, invite them to click it to view and accept",
        initial_quote: "sending an initial quote - be enthusiastic and highlight value",
        follow_up: "a gentle follow-up on a previously sent quote - be polite and not pushy",
        thank_you: "thanking the customer for their business - be grateful and warm",
        booking_confirmation: "confirming a booking - be professional and include key details",
        reschedule: "requesting or confirming a reschedule - be understanding and accommodating",
        payment_failed: "notifying the customer that their payment could not be processed - be polite and professional, avoid blaming the customer, keep the tone helpful, encourage quick resolution, mention they can retry the payment. If a payment link or quote link is available include it. Keep under 120 words"
      };
      const purposeInstruction = purposeDescriptions[purpose] || `purpose: ${purpose}`;
      const quoteContext = quoteDetails ? ` Quote: ${quoteDetails.selectedOption || "Cleaning"} $${quoteDetails.price || ""}. ${quoteDetails.scope || ""}. ${quoteDetails.propertyInfo || ""}.` : "";
      let systemPrompt;
      let userPrompt;
      const paymentInfo = paymentMethodsText ? ` Mention accepted payment methods: ${paymentMethodsText}.` : "";
      const langInstruction = commLang === "es" ? " Write entirely in Spanish." : " Write entirely in English.";
      if (type === "sms") {
        systemPrompt = `Write a short SMS (under 160 chars) for a cleaning company called "${companyName || "our company"}". Sign as "${senderName || "Team"}". No hours/time estimates. No emojis. Be friendly but brief.${bookingLink ? ` Include link: ${bookingLink}` : ""}${quoteLink ? ` Include this quote link for the customer to view and accept: ${quoteLink}` : ""}${langInstruction}`;
        userPrompt = `SMS for ${purposeInstruction}. Customer: ${customerName || "Customer"}.${quoteContext}${paymentInfo} Reply with ONLY the message text, nothing else.`;
      } else {
        systemPrompt = `Write a short professional email (under 150 words) for "${companyName || "our company"}". Sign as "${senderName || "Team"}". No hours/time estimates. No emojis.${bookingLink ? ` Include link: ${bookingLink}` : ""}${quoteLink ? ` Do NOT include the raw URL in the email body. Instead, write a sentence like "You can view and accept your quote by clicking the link below." A styled button with the link will be automatically added after your email.` : ""} Start with "Subject: " on line 1, blank line, then body.${langInstruction}`;
        userPrompt = `Email for ${purposeInstruction}. Customer: ${customerName || "Customer"}.${quoteContext}${paymentInfo} Reply with ONLY the email, nothing else.`;
      }
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_completion_tokens: type === "sms" ? 100 : 250
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: "No response from AI" });
      }
      let draft = content.trim();
      if (draft.startsWith('"') && draft.endsWith('"')) {
        draft = draft.slice(1, -1);
      }
      if (draft.startsWith("{")) {
        try {
          const parsed = JSON.parse(draft);
          draft = parsed.draft || content;
        } catch {
        }
      }
      draft = draft.replace(/\\n/g, "\n");
      return res.json({ draft });
    } catch (error) {
      console.error("AI communication draft error:", error);
      return res.status(500).json({ message: "Failed to generate communication draft" });
    }
  });
  app2.get("/api/social/connections", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const connections = await getChannelConnectionsByBusiness(business.id);
      return res.json(connections.map((c) => ({
        id: c.id,
        channel: c.channel,
        status: c.status,
        pageName: c.pageName,
        igUsername: c.igUsername,
        webhookVerified: c.webhookVerified,
        lastWebhookAt: c.lastWebhookAt,
        tokenExpiresAt: c.tokenExpiresAt,
        permissions: c.permissions
      })));
    } catch (error) {
      console.error("Get connections error:", error);
      return res.status(500).json({ message: "Failed to get connections" });
    }
  });
  app2.post("/api/social/connections", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { channel, status, pageName, igUsername } = req.body;
      if (!channel) return res.status(400).json({ message: "channel is required" });
      const conn = await upsertChannelConnection(business.id, channel, {
        status: status || "connected",
        pageName: pageName || null,
        igUsername: igUsername || null,
        webhookVerified: true,
        lastWebhookAt: /* @__PURE__ */ new Date()
      });
      return res.json(conn);
    } catch (error) {
      console.error("Create connection error:", error);
      return res.status(500).json({ message: "Failed to create connection" });
    }
  });
  app2.delete("/api/social/connections/:id", requireAuth, async (req, res) => {
    try {
      await deleteChannelConnection(req.params.id);
      return res.json({ message: "Disconnected" });
    } catch (error) {
      return res.status(500).json({ message: "Failed to disconnect" });
    }
  });
  app2.get("/api/social/automation", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const settings = await getSocialAutomationSettings(business.id);
      return res.json(settings || {
        autoRepliesEnabled: false,
        intentThreshold: 0.7,
        quietHoursEnabled: false,
        quietHoursStart: "22:00",
        quietHoursEnd: "08:00",
        replyTemplate: "Hi! Thanks for reaching out. Here's a quick link to get an instant quote: {link}",
        optOutKeywords: ["stop", "unsubscribe", "quit", "opt out"],
        socialOnboardingComplete: false
      });
    } catch (error) {
      return res.status(500).json({ message: "Failed to get automation settings" });
    }
  });
  app2.put("/api/social/automation", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const settings = await upsertSocialAutomationSettings(business.id, req.body);
      return res.json(settings);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update automation settings" });
    }
  });
  app2.get("/api/social/conversations", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { channel } = req.query;
      const conversations = await getConversationsByBusiness(business.id, { channel });
      return res.json(conversations);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get conversations" });
    }
  });
  app2.get("/api/social/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const messages = await getMessagesByConversation(req.params.id);
      return res.json(messages);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get messages" });
    }
  });
  app2.get("/api/social/leads", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { channel, status } = req.query;
      const leads = await getSocialLeadsByBusiness(business.id, { channel, status });
      return res.json(leads);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get social leads" });
    }
  });
  app2.get("/api/social/leads/:id", requireAuth, async (req, res) => {
    try {
      const lead = await getSocialLeadById(req.params.id);
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      return res.json(lead);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get lead" });
    }
  });
  app2.post("/api/social/leads", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const lead = await createSocialLead({ ...req.body, businessId: business.id });
      await createAttributionEvent({
        businessId: business.id,
        socialLeadId: lead.id,
        channel: lead.channel,
        eventType: "lead_created",
        metadata: { attribution: lead.attribution }
      });
      return res.json(lead);
    } catch (error) {
      console.error("Create social lead error:", error);
      return res.status(500).json({ message: "Failed to create lead" });
    }
  });
  app2.put("/api/social/leads/:id", requireAuth, async (req, res) => {
    try {
      const lead = await updateSocialLead(req.params.id, req.body);
      return res.json(lead);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update lead" });
    }
  });
  app2.get("/api/social/stats", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { days } = req.query;
      const stats = await getSocialStats(business.id, days ? parseInt(days) : 30);
      return res.json(stats);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get social stats" });
    }
  });
  app2.get("/api/social/attribution", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { channel, days } = req.query;
      const events = await getAttributionEventsByBusiness(business.id, { channel, days: days ? parseInt(days) : 30 });
      return res.json(events);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get attribution events" });
    }
  });
  app2.get("/api/social/optouts", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const optouts = await getSocialOptOutsByBusiness(business.id);
      return res.json(optouts);
    } catch (error) {
      return res.status(500).json({ message: "Failed to get opt-outs" });
    }
  });
  app2.post("/api/social/simulate-dm", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { message, channel, senderName } = req.body;
      if (!message) return res.status(400).json({ message: "message is required" });
      const dmChannel = channel || "instagram";
      const dmSender = senderName || "Test User";
      const conversation = await createConversation({
        businessId: business.id,
        channel: dmChannel,
        senderName: dmSender,
        senderExternalId: `sim_${Date.now()}`
      });
      const inboundMsg = await createMessage({
        conversationId: conversation.id,
        direction: "inbound",
        content: message
      });
      let intentResult = { intent: false, confidence: 0, category: "general_question" };
      try {
        const intentCompletion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an AI intent classifier for a cleaning business. Classify the following DM message. Determine if it shows buying intent (asking about pricing, availability, booking, or services). Categories: pricing_request, booking_request, service_area, general_question, spam. Respond with JSON: {"intent": boolean, "confidence": 0-1, "category": string}`
            },
            { role: "user", content: message }
          ],
          response_format: { type: "json_object" }
        });
        const parsed = JSON.parse(intentCompletion.choices[0]?.message?.content || "{}");
        intentResult = {
          intent: parsed.intent ?? false,
          confidence: parsed.confidence ?? 0,
          category: parsed.category ?? "general_question"
        };
      } catch (e) {
        console.error("Intent classification error:", e);
      }
      const automationSettings = await getSocialAutomationSettings(business.id);
      const threshold = automationSettings?.intentThreshold ?? 0.7;
      const autoEnabled = automationSettings?.autoRepliesEnabled ?? false;
      let autoReplyContent;
      let quoteLink;
      if (intentResult.intent && intentResult.confidence >= threshold && autoEnabled) {
        const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || process.env.REPLIT_DEV_DOMAIN || "localhost:5000";
        quoteLink = `https://${domain}/q?u=${business.id}&ch=${dmChannel}&cid=${conversation.id}`;
        try {
          const replyCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are a friendly AI assistant for ${business.companyName || "a cleaning company"}. Generate a short, friendly auto-reply to a potential customer's DM. Rules:
- Under 320 characters
- At most 1 question
- Include this quote link: ${quoteLink}
- Be warm and professional
- Don't mention pricing numbers
Respond with JSON: {"reply": string}`
              },
              { role: "user", content: message }
            ],
            response_format: { type: "json_object" }
          });
          const parsed = JSON.parse(replyCompletion.choices[0]?.message?.content || "{}");
          autoReplyContent = parsed.reply || `Thanks for reaching out! Get an instant quote here: ${quoteLink}`;
        } catch (e) {
          console.error("Reply generation error:", e);
          autoReplyContent = `Thanks for reaching out! Get an instant quote here: ${quoteLink}`;
        }
        await createMessage({
          conversationId: conversation.id,
          direction: "outbound",
          content: autoReplyContent,
          intentDetected: true,
          intentConfidence: intentResult.confidence,
          intentCategory: intentResult.category,
          autoReplyContent,
          quoteLink
        });
        await updateConversation(conversation.id, { autoReplied: true, lastMessageAt: /* @__PURE__ */ new Date() });
        const lead = await createSocialLead({
          businessId: business.id,
          conversationId: conversation.id,
          channel: dmChannel,
          attribution: "auto_dm",
          senderName: dmSender,
          dmText: message
        });
        await createAttributionEvent({
          businessId: business.id,
          socialLeadId: lead.id,
          conversationId: conversation.id,
          channel: dmChannel,
          eventType: "auto_reply_sent"
        });
      }
      await createMessage({
        conversationId: conversation.id,
        direction: "inbound",
        content: message,
        intentDetected: intentResult.intent,
        intentConfidence: intentResult.confidence,
        intentCategory: intentResult.category,
        autoReplyContent: autoReplyContent || void 0,
        quoteLink: quoteLink || void 0
      });
      return res.json({
        success: true,
        conversation,
        intent: intentResult,
        autoReplied: !!autoReplyContent,
        autoReplyContent: autoReplyContent || null,
        quoteLink: quoteLink || null
      });
    } catch (error) {
      console.error("Simulate DM error:", error);
      return res.status(500).json({ message: "Failed to simulate DM" });
    }
  });
  app2.post("/api/social/tiktok-lead", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { dmText, senderName, senderHandle } = req.body;
      if (!dmText) return res.status(400).json({ message: "dmText is required" });
      let extractedFields = {};
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Extract relevant cleaning lead information from a TikTok DM. Return JSON with: {"name": string, "serviceType": "regular"|"deep_clean"|"move_in_out"|"other", "bedrooms": number|null, "bathrooms": number|null, "sqft": number|null, "notes": string}`
            },
            { role: "user", content: dmText }
          ],
          response_format: { type: "json_object" }
        });
        extractedFields = JSON.parse(completion.choices[0]?.message?.content || "{}");
      } catch (e) {
        console.error("TikTok field extraction error:", e);
      }
      const lead = await createSocialLead({
        businessId: business.id,
        channel: "tiktok",
        attribution: "manual_dm",
        senderName: senderName || extractedFields.name || "TikTok User",
        senderHandle: senderHandle || null,
        dmText
      });
      await createAttributionEvent({
        businessId: business.id,
        socialLeadId: lead.id,
        channel: "tiktok",
        eventType: "lead_created",
        metadata: { attribution: "manual_dm", extractedFields }
      });
      return res.json({ lead, extractedFields });
    } catch (error) {
      console.error("TikTok lead error:", error);
      return res.status(500).json({ message: "Failed to create TikTok lead" });
    }
  });
  app2.get("/q", (_req, res) => {
    res.send(getQuickQuoteHTML());
  });
  app2.post("/api/public/quick-quote", async (req, res) => {
    try {
      const { businessId, channel, conversationId, name, phone, email, zip, beds, baths, sqft, serviceType, frequency } = req.body;
      if (!businessId) return res.status(400).json({ message: "businessId is required" });
      const pricing = await getPricingByBusiness(businessId);
      const settings = pricing?.settings;
      if (!settings) return res.status(404).json({ message: "Pricing not configured" });
      const baseRate = settings.hourlyRate || 40;
      const minTicket = settings.minimumTicket || 100;
      const bedWeight = 0.25;
      const bathWeight = 0.5;
      const sqftFactor = settings.sqftFactor || 0.01;
      let baseHours = (sqft || 1500) * sqftFactor;
      baseHours += (beds || 3) * bedWeight;
      baseHours += (baths || 2) * bathWeight;
      let multiplier = 1;
      if (serviceType === "deep_clean") multiplier = 1.5;
      if (serviceType === "move_in_out") multiplier = 2;
      let total = Math.max(baseRate * baseHours * multiplier, minTicket);
      let freqDiscount = 1;
      if (frequency === "weekly") freqDiscount = 0.8;
      else if (frequency === "biweekly") freqDiscount = 0.85;
      else if (frequency === "monthly") freqDiscount = 0.9;
      total *= freqDiscount;
      total = Math.round(total * 100) / 100;
      const quote = await createQuote({
        businessId,
        propertyBeds: beds || 3,
        propertyBaths: baths || 2,
        propertySqft: sqft || 1500,
        propertyDetails: { zip, serviceType, frequency },
        addOns: {},
        frequencySelected: frequency || "one-time",
        selectedOption: "better",
        options: { good: total * 0.8, better: total, best: total * 1.3 },
        subtotal: total,
        tax: 0,
        total,
        status: "sent"
      });
      if (name || email || phone) {
        const nameParts = (name || "").split(" ");
        const customer = await createCustomer({
          businessId,
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          phone: phone || "",
          email: email || "",
          address: zip || "",
          leadSource: channel || "social"
        });
        await updateQuote(quote.id, { customerId: customer.id });
        if (conversationId) {
          const lead = await createSocialLead({
            businessId,
            customerId: customer.id,
            conversationId,
            channel: channel || "instagram",
            attribution: "quick_quote",
            senderName: name || "",
            quoteId: quote.id
          });
          await createAttributionEvent({
            businessId,
            socialLeadId: lead.id,
            conversationId,
            channel: channel || "instagram",
            eventType: "quote_created",
            metadata: { quoteTotal: total }
          });
        }
      }
      const business = await db_getBusinessById(businessId);
      return res.json({
        quote: {
          id: quote.id,
          total,
          breakdown: {
            baseRate,
            sqft: sqft || 1500,
            beds: beds || 3,
            baths: baths || 2,
            serviceType: serviceType || "regular",
            frequency: frequency || "one-time",
            multiplier,
            freqDiscount
          }
        },
        business: business ? { companyName: business.companyName, phone: business.phone, email: business.email, logoUri: business.logoUri } : null
      });
    } catch (error) {
      console.error("Quick quote error:", error);
      return res.status(500).json({ message: "Failed to create quick quote" });
    }
  });
  app2.post("/api/public/toolkit-lead", async (req, res) => {
    try {
      const { email, firstName, resource } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }
      const cleanEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ message: "Invalid email" });
      }
      await pool.query(
        `INSERT INTO toolkit_leads (email, first_name, resource) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`,
        [cleanEmail, firstName || null, resource || null]
      );
      return res.json({ success: true });
    } catch (error) {
      console.error("Toolkit lead error:", error);
      return res.status(500).json({ message: "Failed to save lead" });
    }
  });
  const _calcSignupAttempts = /* @__PURE__ */ new Map();
  app2.post("/api/public/calculator-signup", async (req, res) => {
    try {
      const { email, password, quoteData } = req.body;
      if (!email || typeof email !== "string" || !password || typeof password !== "string") {
        return res.status(400).json({ message: "Email and password are required" });
      }
      const cleanEmail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      const ip = req.ip || "unknown";
      const rateKey = `${ip}:${cleanEmail}`;
      const now = Date.now();
      const attempt = _calcSignupAttempts.get(rateKey);
      if (attempt && attempt.resetAt > now && attempt.count >= 5) {
        return res.status(429).json({ message: "Too many attempts. Please try again in a few minutes." });
      }
      if (!attempt || attempt.resetAt <= now) {
        _calcSignupAttempts.set(rateKey, { count: 1, resetAt: now + 5 * 60 * 1e3 });
      } else {
        attempt.count++;
      }
      const existing = await getUserByEmail(cleanEmail);
      let user;
      let business;
      let isNewUser = false;
      if (existing) {
        if (!existing.passwordHash) {
          return res.status(400).json({ message: "This account uses social login. Please sign in with Google or Apple." });
        }
        const valid = await bcrypt.compare(password, existing.passwordHash);
        if (!valid) {
          return res.status(401).json({ message: "Invalid email or password" });
        }
        user = existing;
        business = await getBusinessByOwner(user.id);
        if (!business) {
          business = await createBusiness(user.id);
        }
      } else {
        const passwordHash = await bcrypt.hash(password, 12);
        user = await createUser({
          email: cleanEmail,
          name: null,
          passwordHash,
          authProvider: "email"
        });
        business = await createBusiness(user.id);
        isNewUser = true;
      }
      req.session.userId = user.id;
      let quoteId = null;
      if (quoteData && typeof quoteData === "object" && business) {
        const validServiceTypes = ["regular", "deep_clean", "move_in_out"];
        const validFrequencies = ["one-time", "weekly", "biweekly", "monthly"];
        const serviceType = validServiceTypes.includes(quoteData.service_type) ? quoteData.service_type : "regular";
        const frequency = validFrequencies.includes(quoteData.frequency) ? quoteData.frequency : "one-time";
        const beds = Math.max(1, Math.min(10, parseInt(quoteData.bedrooms) || 3));
        const baths = Math.max(1, Math.min(10, parseInt(quoteData.bathrooms) || 2));
        const sqft = Math.max(200, Math.min(2e4, parseInt(quoteData.square_footage) || 1500));
        const baseRate = 40;
        const baseHours = sqft * 0.01 + beds * 0.25 + baths * 0.5;
        let mult = 1;
        if (serviceType === "deep_clean") mult = 1.5;
        if (serviceType === "move_in_out") mult = 2;
        let freqDisc = 1;
        if (frequency === "weekly") freqDisc = 0.8;
        if (frequency === "biweekly") freqDisc = 0.85;
        if (frequency === "monthly") freqDisc = 0.9;
        let total = Math.max(baseRate * baseHours * mult, 100 * mult) * freqDisc;
        const sanitizedAddOns = {};
        if (quoteData.add_ons && typeof quoteData.add_ons === "object") {
          if (quoteData.add_ons.garage) {
            sanitizedAddOns.garage = true;
            total += 75;
          }
          if (quoteData.add_ons.carpets) {
            sanitizedAddOns.carpets = true;
            total += 100;
          }
          if (quoteData.add_ons.oven) {
            sanitizedAddOns.oven = true;
            total += 45;
          }
          if (quoteData.add_ons.fridge) {
            sanitizedAddOns.fridge = true;
            total += 40;
          }
          if (quoteData.add_ons.windows) {
            sanitizedAddOns.windows = true;
            total += 60;
          }
        }
        const estimated = Math.round(total);
        const good = Math.round(estimated * 0.8);
        const best = Math.round(estimated * 1.3);
        const expiresAt = /* @__PURE__ */ new Date();
        expiresAt.setDate(expiresAt.getDate() + 14);
        const q = await createQuote({
          businessId: business.id,
          customerId: null,
          propertyBeds: beds,
          propertyBaths: baths,
          propertySqft: sqft,
          propertyDetails: { serviceType },
          addOns: sanitizedAddOns,
          frequencySelected: frequency,
          selectedOption: "better",
          recommendedOption: "better",
          options: {
            good: { price: good, label: "Good" },
            better: { price: estimated, label: "Better" },
            best: { price: best, label: "Best" }
          },
          subtotal: estimated,
          tax: 0,
          total: estimated,
          status: "draft",
          expiresAt
        });
        quoteId = q.id;
      }
      return res.json({
        success: true,
        quoteId,
        isNewUser,
        redirectUrl: quoteId ? `/app/quotes/${quoteId}` : "/app/dashboard"
      });
    } catch (error) {
      console.error("Calculator signup error:", error);
      return res.status(500).json({ message: "Registration failed. Please try again." });
    }
  });
  app2.post("/api/internal/cron", async (_req, res) => {
    try {
      const expiredCount = await expireOldQuotes();
      if (expiredCount > 0) console.log(`Expired ${expiredCount} quotes`);
      const { sent, canceled } = await processPendingFollowUps();
      return res.json({ expired: expiredCount, followupsSent: sent, followupsCanceled: canceled });
    } catch (error) {
      console.error("Cron error:", error);
      return res.status(500).json({ message: "Cron failed" });
    }
  });
  app2.get("/api/google-calendar/status", requireAuth, async (req, res) => {
    try {
      const tokens = await getGoogleCalendarToken(req.session.userId);
      if (tokens) {
        return res.json({ connected: true, calendarId: tokens.calendarId });
      }
      return res.json({ connected: false });
    } catch (error) {
      console.error("Calendar status error:", error);
      return res.status(500).json({ message: "Failed to check calendar status" });
    }
  });
  app2.get("/api/google-calendar/connect", requireAuth, async (req, res) => {
    try {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(503).json({ message: "Google Calendar is not set up yet. Contact support to enable calendar sync." });
      }
      const state = crypto2.randomBytes(32).toString("hex");
      await pool.query(
        `INSERT INTO oauth_states (state, user_id, provider, created_at)
         VALUES ($1, $2, 'google_calendar', NOW())`,
        [state, req.session.userId]
      );
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `https://${req.get("host")}/api/google-calendar/callback`
      );
      const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/calendar.events"],
        prompt: "consent",
        state
      });
      return res.json({ url });
    } catch (error) {
      console.error("Calendar connect error:", error);
      return res.status(500).json({ message: "Failed to generate auth URL" });
    }
  });
  app2.get("/api/google-calendar/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) {
        return res.status(400).send("Missing code or state");
      }
      const stateResult = await pool.query(
        `DELETE FROM oauth_states WHERE state = $1 AND provider = 'google_calendar'
         AND created_at > NOW() - INTERVAL '10 minutes' RETURNING user_id`,
        [state]
      );
      if (stateResult.rows.length === 0) {
        return res.status(403).send("Invalid or expired OAuth state. Please try connecting again.");
      }
      const userId = stateResult.rows[0].user_id;
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `https://${req.get("host")}/api/google-calendar/callback`
      );
      const { tokens } = await oauth2Client.getToken(code);
      await upsertGoogleCalendarToken(userId, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expiry_date)
      });
      return res.send(`<!DOCTYPE html>
<html><head><title>Calendar Connected</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;}
.card{text-align:center;padding:40px;background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
.check{font-size:48px;margin-bottom:16px;}h2{margin:0 0 8px;color:#333;}p{color:#666;margin:0;}</style>
</head><body><div class="card"><div class="check">&#10003;</div><h2>Calendar Connected!</h2><p>You can close this window.</p></div></body></html>`);
    } catch (error) {
      console.error("Calendar callback error:", error);
      return res.status(500).send("Failed to connect calendar. Please try again.");
    }
  });
  app2.delete("/api/google-calendar/disconnect", requireAuth, async (req, res) => {
    try {
      await deleteGoogleCalendarToken(req.session.userId);
      return res.json({ message: "Disconnected" });
    } catch (error) {
      console.error("Calendar disconnect error:", error);
      return res.status(500).json({ message: "Failed to disconnect calendar" });
    }
  });
  app2.post("/api/google-calendar/sync-job", requireAuth, async (req, res) => {
    try {
      const { jobId } = req.body;
      if (!jobId) return res.status(400).json({ message: "jobId is required" });
      const job = await getJobById(jobId);
      if (!job) return res.status(404).json({ message: "Job not found" });
      let customerName = "Customer";
      if (job.customerId) {
        const customer = await getCustomerById(job.customerId);
        if (customer) customerName = `${customer.firstName} ${customer.lastName}`.trim();
      }
      await syncJobToGoogleCalendar(req.session.userId, job, customerName);
      return res.json({ message: "Synced to Google Calendar" });
    } catch (error) {
      console.error("Calendar sync error:", error);
      return res.status(500).json({ message: "Failed to sync to calendar" });
    }
  });
  app2.get("/api/stripe/status", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      if (business.stripeAccountId && business.stripeOnboardingComplete) {
        return res.json({ connected: true, accountId: business.stripeAccountId });
      }
      return res.json({ connected: false, accountId: business.stripeAccountId || null });
    } catch (error) {
      console.error("Stripe status error:", error);
      return res.status(500).json({ message: "Failed to check Stripe status" });
    }
  });
  app2.post("/api/stripe/connect", requireAuth, async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ message: "Stripe is not configured. Please add your Stripe API keys to enable payments." });
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      let accountId = business.stripeAccountId;
      if (!accountId) {
        const account = await stripe.accounts.create({
          country: "US",
          email: business.email || void 0,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true }
          },
          business_profile: {
            name: business.companyName || "Cleaning Business"
          },
          metadata: { businessId: business.id }
        });
        accountId = account.id;
        await updateBusiness(business.id, { stripeAccountId: accountId });
      }
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `https://${req.get("host")}/api/stripe/connect-refresh?userId=${req.session.userId}`,
        return_url: `https://${req.get("host")}/api/stripe/connect-callback?userId=${req.session.userId}`,
        type: "account_onboarding"
      });
      return res.json({ url: accountLink.url });
    } catch (error) {
      console.error("Stripe connect error:", error?.message || error);
      const msg = error?.message || "";
      if (error?.type === "StripeInvalidRequestError" && (msg.includes("signed up for Connect") || msg.includes("platform profile"))) {
        return res.status(400).json({ message: "Stripe Connect setup is incomplete. Please visit dashboard.stripe.com/connect to finish platform setup, then try again." });
      }
      if (error?.type === "StripeInvalidRequestError" && msg.includes("No such account")) {
        const business = await getBusinessByOwner(req.session.userId);
        if (business) {
          await updateBusiness(business.id, { stripeAccountId: null, stripeOnboardingComplete: false });
        }
        return res.status(400).json({ message: "Previous Stripe account was invalid. Please try connecting again." });
      }
      return res.status(500).json({ message: "Failed to connect Stripe. Please try again." });
    }
  });
  app2.get("/api/stripe/connect-callback", async (req, res) => {
    try {
      if (!stripe) return res.status(503).send("Stripe not configured");
      const { userId } = req.query;
      if (!userId) return res.status(400).send("Missing userId");
      const business = await getBusinessByOwner(userId);
      if (!business || !business.stripeAccountId) return res.status(400).send("No Stripe account found");
      const account = await stripe.accounts.retrieve(business.stripeAccountId);
      const isComplete = !!(account.charges_enabled && account.details_submitted);
      if (isComplete) {
        await updateBusiness(business.id, { stripeOnboardingComplete: true });
      }
      return res.send(`<!DOCTYPE html>
<html><head><title>Stripe Connected</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;}
.card{text-align:center;padding:40px;background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
.check{font-size:48px;margin-bottom:16px;}h2{margin:0 0 8px;color:#333;}p{color:#666;margin:0;}</style>
</head><body><div class="card"><div class="check">&#10003;</div><h2>${isComplete ? "Stripe Connected!" : "Almost Done"}</h2><p>${isComplete ? "You can now accept payments. Close this window." : "Please complete the remaining steps in Stripe."}</p></div></body></html>`);
    } catch (error) {
      console.error("Stripe callback error:", error);
      return res.status(500).send("Failed to verify Stripe connection.");
    }
  });
  app2.get("/api/stripe/connect-refresh", async (req, res) => {
    try {
      if (!stripe) return res.status(503).send("Stripe not configured");
      const { userId } = req.query;
      if (!userId) return res.status(400).send("Missing userId");
      const business = await getBusinessByOwner(userId);
      if (!business || !business.stripeAccountId) return res.status(400).send("No Stripe account");
      const accountLink = await stripe.accountLinks.create({
        account: business.stripeAccountId,
        refresh_url: `https://${req.get("host")}/api/stripe/connect-refresh?userId=${userId}`,
        return_url: `https://${req.get("host")}/api/stripe/connect-callback?userId=${userId}`,
        type: "account_onboarding"
      });
      return res.redirect(accountLink.url);
    } catch (error) {
      console.error("Stripe refresh error:", error);
      return res.status(500).send("Failed to refresh onboarding");
    }
  });
  app2.delete("/api/stripe/disconnect", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      await updateBusiness(business.id, { stripeAccountId: null, stripeOnboardingComplete: false });
      return res.json({ message: "Stripe disconnected" });
    } catch (error) {
      console.error("Stripe disconnect error:", error);
      return res.status(500).json({ message: "Failed to disconnect Stripe" });
    }
  });
  app2.post("/api/stripe/create-payment", requireAuth, async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ message: "Stripe is not configured" });
      const { quoteId } = req.body;
      if (!quoteId) return res.status(400).json({ message: "quoteId is required" });
      const quote = await getQuoteById(quoteId);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      const business = await db_getBusinessById(quote.businessId);
      if (!business || !business.stripeAccountId || !business.stripeOnboardingComplete) {
        return res.status(400).json({ message: "Stripe is not connected for this business" });
      }
      const amount = Math.round(quote.total * 100);
      const session2 = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `Cleaning Service Quote`,
              description: `${quote.frequencySelected} cleaning - ${quote.selectedOption} option`
            },
            unit_amount: amount
          },
          quantity: 1
        }],
        success_url: `https://${req.get("host")}/api/stripe/payment-success?quoteId=${quoteId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://${req.get("host")}/api/stripe/payment-cancel?quoteId=${quoteId}`,
        metadata: { quoteId, businessId: business.id }
      }, {
        stripeAccount: business.stripeAccountId
      });
      return res.json({ url: session2.url });
    } catch (error) {
      console.error("Create payment error:", error);
      return res.status(500).json({ message: "Failed to create payment session" });
    }
  });
  app2.post("/api/public/quote/:token/pay", async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ message: "Payments not available" });
      const quote = await getQuoteByToken(req.params.token);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      if (quote.paymentStatus === "paid") return res.status(400).json({ message: "Already paid" });
      const business = await db_getBusinessById(quote.businessId);
      if (!business || !business.stripeAccountId || !business.stripeOnboardingComplete) {
        return res.status(400).json({ message: "Payments not enabled for this business" });
      }
      const amount = Math.round(quote.total * 100);
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `Cleaning Service - ${business.companyName || "Quote"}`,
              description: `${quote.frequencySelected} cleaning - ${quote.selectedOption} option`
            },
            unit_amount: amount
          },
          quantity: 1
        }],
        success_url: `https://${req.get("host")}/api/stripe/payment-success?quoteId=${quote.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://${req.get("host")}/api/stripe/payment-cancel?quoteId=${quote.id}`,
        metadata: { quoteId: quote.id, businessId: business.id }
      }, {
        stripeAccount: business.stripeAccountId
      });
      return res.json({ url: checkoutSession.url });
    } catch (error) {
      console.error("Public payment error:", error);
      return res.status(500).json({ message: "Failed to create payment" });
    }
  });
  app2.post("/api/public/quote/:token/pay-deposit", async (req, res) => {
    try {
      if (!stripe) return res.status(503).json({ message: "Payments not available" });
      const quote = await getQuoteByToken(req.params.token);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      if (quote.depositPaid) return res.status(400).json({ message: "Deposit already paid" });
      if (!quote.depositRequired || !quote.depositAmount) return res.status(400).json({ message: "No deposit required" });
      const business = await db_getBusinessById(quote.businessId);
      if (!business || !business.stripeAccountId || !business.stripeOnboardingComplete) {
        return res.status(400).json({ message: "Payments not enabled", noStripe: true });
      }
      const amount = Math.round(Number(quote.depositAmount) * 100);
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `Deposit - ${business.companyName || "Quote"}`,
              description: `Deposit for cleaning service`
            },
            unit_amount: amount
          },
          quantity: 1
        }],
        success_url: `https://${req.get("host")}/api/stripe/deposit-success?quoteId=${quote.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://${req.get("host")}/q/${quote.publicToken}`,
        metadata: { quoteId: quote.id, businessId: business.id, type: "deposit" }
      }, {
        stripeAccount: business.stripeAccountId
      });
      return res.json({ url: checkoutSession.url });
    } catch (error) {
      console.error("Public deposit payment error:", error);
      return res.status(500).json({ message: "Failed to create deposit payment" });
    }
  });
  app2.get("/api/stripe/deposit-success", async (req, res) => {
    try {
      const { quoteId, session_id } = req.query;
      if (!quoteId || !session_id || !stripe) {
        return res.redirect("/");
      }
      const quote = await getQuoteById(quoteId);
      if (!quote) return res.redirect("/");
      const business = await db_getBusinessById(quote.businessId);
      const stripeOpts = business?.stripeAccountId ? { stripeAccount: business.stripeAccountId } : void 0;
      const checkoutSession = await stripe.checkout.sessions.retrieve(session_id, stripeOpts);
      if (!checkoutSession || checkoutSession.payment_status !== "paid") {
        return res.redirect(`/q/${quote.publicToken}?payment=failed`);
      }
      if (checkoutSession.metadata?.quoteId !== quoteId || checkoutSession.metadata?.type !== "deposit") {
        return res.redirect(`/q/${quote.publicToken}?payment=failed`);
      }
      const expectedAmountCents = Math.round(Number(quote.depositAmount || 0) * 100);
      if (expectedAmountCents > 0 && checkoutSession.amount_total !== expectedAmountCents) {
        return res.redirect(`/q/${quote.publicToken}?payment=failed`);
      }
      await updateQuote(quoteId, {
        depositPaid: true,
        status: "accepted",
        acceptedAt: /* @__PURE__ */ new Date(),
        paymentIntentId: checkoutSession.payment_intent || void 0,
        paymentAmount: (checkoutSession.amount_total || 0) / 100
      });
      await cancelPendingCommunicationsForQuote(quoteId);
      return res.redirect(`/q/${quote.publicToken}`);
    } catch (error) {
      console.error("Deposit success error:", error);
      return res.redirect("/");
    }
  });
  app2.get("/api/stripe/payment-success", async (req, res) => {
    try {
      const { quoteId, session_id } = req.query;
      if (quoteId) {
        await updateQuote(quoteId, {
          paymentStatus: "paid",
          paymentAmount: void 0,
          paidAt: /* @__PURE__ */ new Date(),
          status: "accepted",
          acceptedAt: /* @__PURE__ */ new Date()
        });
        if (stripe && session_id) {
          try {
            const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);
            if (checkoutSession.payment_intent) {
              await updateQuote(quoteId, {
                paymentIntentId: checkoutSession.payment_intent,
                paymentAmount: (checkoutSession.amount_total || 0) / 100
              });
            }
          } catch (e) {
            console.error("Error retrieving checkout session:", e);
          }
        }
      }
      return res.send(`<!DOCTYPE html>
<html><head><title>Payment Successful</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;}
.card{text-align:center;padding:40px;background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
.check{font-size:48px;margin-bottom:16px;color:#22c55e;}h2{margin:0 0 8px;color:#333;}p{color:#666;margin:0;}</style>
</head><body><div class="card"><div class="check">&#10003;</div><h2>Payment Successful!</h2><p>Thank you for your payment. You may close this window.</p></div></body></html>`);
    } catch (error) {
      console.error("Payment success error:", error);
      return res.status(500).send("An error occurred processing your payment confirmation.");
    }
  });
  app2.get("/api/stripe/payment-cancel", async (_req, res) => {
    return res.send(`<!DOCTYPE html>
<html><head><title>Payment Cancelled</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;}
.card{text-align:center;padding:40px;background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
.icon{font-size:48px;margin-bottom:16px;}h2{margin:0 0 8px;color:#333;}p{color:#666;margin:0;}</style>
</head><body><div class="card"><div class="icon">&#10007;</div><h2>Payment Cancelled</h2><p>No charge was made. You can close this window.</p></div></body></html>`);
  });
  app2.get("/privacy", (_req, res) => {
    res.send(getPrivacyPolicyHTML());
  });
  app2.get("/terms", (_req, res) => {
    res.send(getTermsOfServiceHTML());
  });
  app2.get("/delete-account", (_req, res) => {
    res.send(getDeleteAccountHTML());
  });
  app2.get("/calculators", (_req, res) => {
    res.send(renderCalculatorIndex());
  });
  app2.get("/calculators/:slug", (req, res) => {
    const def = getCalculatorBySlug(req.params.slug);
    if (!def) return res.status(404).send("Calculator not found");
    res.send(renderCalculatorPage(def));
  });
  app2.get("/house-cleaning-price-calculator", (_req, res) => {
    res.redirect(301, "/calculators/house-cleaning-price-calculator");
  });
  app2.get("/deep-cleaning-price-calculator", (_req, res) => {
    res.redirect(301, "/calculators/deep-cleaning-price-calculator");
  });
  app2.get("/move-in-out-cleaning-calculator", (_req, res) => {
    res.redirect(301, "/calculators/move-in-out-cleaning-calculator");
  });
  app2.get("/cleaning-quote-generator", (_req, res) => {
    res.send(getCleaningQuoteGeneratorPage());
  });
  app2.get("/api/followup-queue", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const queue = await getFollowUpQueueQuotes(business.id);
      return res.json(queue);
    } catch (error) {
      console.error("Get follow-up queue error:", error);
      return res.status(500).json({ message: "Failed to get follow-up queue" });
    }
  });
  app2.post("/api/followup-touches", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { quoteId, channel, snoozedUntil } = req.body;
      if (!quoteId || !channel) {
        return res.status(400).json({ message: "quoteId and channel are required" });
      }
      const quote = await getQuoteById(quoteId);
      const touch = await createFollowUpTouch({
        businessId: business.id,
        quoteId,
        customerId: quote?.customerId || void 0,
        channel,
        snoozedUntil: snoozedUntil ? new Date(snoozedUntil) : void 0
      });
      return res.json(touch);
    } catch (error) {
      console.error("Create follow-up touch error:", error);
      return res.status(500).json({ message: "Failed to create follow-up touch" });
    }
  });
  app2.get("/api/streaks", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const streak = await getStreakByBusiness(business.id);
      return res.json(streak || { currentStreak: 0, longestStreak: 0, lastActionDate: null });
    } catch (error) {
      console.error("Get streak error:", error);
      return res.status(500).json({ message: "Failed to get streak" });
    }
  });
  app2.post("/api/streaks/action", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const existing = await getStreakByBusiness(business.id);
      let currentStreak = 1;
      let longestStreak = 1;
      if (existing) {
        if (existing.lastActionDate === today) {
          return res.json(existing);
        }
        const yesterday = /* @__PURE__ */ new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        if (existing.lastActionDate === yesterdayStr) {
          currentStreak = existing.currentStreak + 1;
        }
        longestStreak = Math.max(currentStreak, existing.longestStreak);
      }
      const streak = await upsertStreak(business.id, {
        currentStreak,
        longestStreak,
        lastActionDate: today
      });
      return res.json(streak);
    } catch (error) {
      console.error("Streak action error:", error);
      return res.status(500).json({ message: "Failed to update streak" });
    }
  });
  const MILESTONES = [1e3, 5e3, 1e4, 25e3, 5e4, 1e5];
  app2.get("/api/milestones/check", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const prefs = await getPreferencesByBusiness(business.id);
      const stats = await getQuoteStats(business.id);
      const totalRevenue = stats.totalRevenue;
      const celebrated = Array.isArray(prefs?.celebratedMilestones) ? prefs.celebratedMilestones : [];
      const nextMilestone = MILESTONES.find((m) => totalRevenue >= m && !celebrated.includes(m)) || null;
      return res.json({ totalRevenue, nextMilestone, celebrated });
    } catch (e) {
      return res.status(500).json({ message: "Failed to check milestones" });
    }
  });
  app2.post("/api/milestones/celebrate", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { milestone } = req.body;
      if (!milestone || !MILESTONES.includes(Number(milestone))) return res.status(400).json({ message: "Invalid milestone" });
      await markMilestoneCelebrated(business.id, Number(milestone));
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ message: "Failed to record milestone" });
    }
  });
  app2.get("/api/preferences", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const prefs = await getPreferencesByBusiness(business.id);
      return res.json(prefs || {
        dailyPulseEnabled: true,
        dailyPulseTime: "08:00",
        weeklyRecapEnabled: true,
        weeklyRecapDay: 1,
        quietHoursEnabled: false,
        quietHoursStart: "21:00",
        quietHoursEnd: "08:00",
        dormantThresholdDays: 90,
        maxFollowUpsPerDay: 1,
        weeklyGoal: null,
        weeklyGoalTarget: null
      });
    } catch (error) {
      console.error("Get preferences error:", error);
      return res.status(500).json({ message: "Failed to get preferences" });
    }
  });
  app2.put("/api/preferences", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { dailyPulseEnabled, dailyPulseTime, weeklyRecapEnabled, weeklyRecapDay, quietHoursEnabled, quietHoursStart, quietHoursEnd, dormantThresholdDays, maxFollowUpsPerDay, weeklyGoal, weeklyGoalTarget } = req.body;
      const prefs = await upsertPreferences(business.id, { dailyPulseEnabled, dailyPulseTime, weeklyRecapEnabled, weeklyRecapDay, quietHoursEnabled, quietHoursStart, quietHoursEnd, dormantThresholdDays, maxFollowUpsPerDay, weeklyGoal, weeklyGoalTarget });
      return res.json(prefs);
    } catch (error) {
      console.error("Update preferences error:", error);
      return res.status(500).json({ message: "Failed to update preferences" });
    }
  });
  app2.post("/api/analytics/events", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { eventName, properties } = req.body;
      if (!eventName) {
        return res.status(400).json({ message: "eventName is required" });
      }
      const event = await createAnalyticsEvent({
        businessId: business.id,
        eventName,
        properties: properties || {}
      });
      return res.json(event);
    } catch (error) {
      console.error("Create analytics event error:", error);
      return res.status(500).json({ message: "Failed to create analytics event" });
    }
  });
  app2.get("/api/quote-preferences", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const stored = business.quotePreferences;
      return res.json(stored || {
        showLogo: true,
        showCompanyName: true,
        showAddress: true,
        showPhone: true,
        showEmail: true,
        showSignatureLine: false,
        showEstimatedTime: false,
        showPaymentOptions: true,
        showBookingLink: false,
        showTerms: false,
        termsText: "",
        brandColor: "#2563EB"
      });
    } catch (error) {
      return res.status(500).json({ message: "Failed to get quote preferences" });
    }
  });
  app2.put("/api/quote-preferences", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      await updateBusiness(business.id, { quotePreferences: req.body });
      return res.json(req.body);
    } catch (error) {
      return res.status(500).json({ message: "Failed to update quote preferences" });
    }
  });
  app2.get("/api/badges", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const badgeList = await getBadgesByBusiness(business.id);
      return res.json(badgeList);
    } catch (error) {
      console.error("Get badges error:", error);
      return res.status(500).json({ message: "Failed to get badges" });
    }
  });
  app2.get("/api/weekly-recap", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const weekOffset = parseInt(req.query.weekOffset) || 0;
      const now = /* @__PURE__ */ new Date();
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek + weekOffset * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const stats = await getWeeklyRecapStats(business.id, weekStart, weekEnd);
      return res.json({ ...stats, weekStart, weekEnd });
    } catch (error) {
      console.error("Get weekly recap error:", error);
      return res.status(500).json({ message: "Failed to get weekly recap" });
    }
  });
  app2.get("/api/opportunities/dormant", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const thresholdDays = parseInt(req.query.thresholdDays) || 90;
      const dormant = await getDormantCustomers(business.id, thresholdDays);
      return res.json(dormant);
    } catch (error) {
      console.error("Get dormant customers error:", error);
      return res.status(500).json({ message: "Failed to get dormant customers" });
    }
  });
  app2.get("/api/opportunities/lost", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const daysSince = parseInt(req.query.daysSince) || 180;
      const lost = await getLostQuotes(business.id, daysSince);
      return res.json(lost);
    } catch (error) {
      console.error("Get lost quotes error:", error);
      return res.status(500).json({ message: "Failed to get lost quotes" });
    }
  });
  app2.put("/api/customers/:id/do-not-contact", requireAuth, async (req, res) => {
    try {
      const customer = await getCustomerById(req.params.id);
      if (!customer) return res.status(404).json({ message: "Customer not found" });
      const updated = await updateCustomer(req.params.id, {
        smsOptOut: !customer.smsOptOut
      });
      return res.json(updated);
    } catch (error) {
      console.error("Toggle do-not-contact error:", error);
      return res.status(500).json({ message: "Failed to update do-not-contact" });
    }
  });
  app2.get("/api/growth-tasks", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { type, status } = req.query;
      const list = await getGrowthTasksByBusiness(business.id, { type, status });
      return res.json(list);
    } catch (error) {
      console.error("Get growth tasks error:", error);
      return res.status(500).json({ message: "Failed to get growth tasks" });
    }
  });
  app2.get("/api/growth-tasks/:id", requireAuth, async (req, res) => {
    try {
      const task = await getGrowthTaskById(req.params.id);
      if (!task) return res.status(404).json({ message: "Growth task not found" });
      return res.json(task);
    } catch (error) {
      console.error("Get growth task error:", error);
      return res.status(500).json({ message: "Failed to get growth task" });
    }
  });
  app2.post("/api/growth-tasks", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { type, customerId, quoteId, jobId, channel, dueAt, priority, escalationStage, message, estimatedValue, metadata } = req.body;
      const task = await createGrowthTask({
        businessId: business.id,
        type,
        customerId,
        quoteId,
        jobId,
        channel,
        dueAt: dueAt ? new Date(dueAt) : void 0,
        priority,
        escalationStage,
        message,
        estimatedValue,
        metadata
      });
      return res.json(task);
    } catch (error) {
      console.error("Create growth task error:", error);
      return res.status(500).json({ message: "Failed to create growth task" });
    }
  });
  app2.put("/api/growth-tasks/:id", requireAuth, async (req, res) => {
    try {
      const existing = await getGrowthTaskById(req.params.id);
      if (!existing) return res.status(404).json({ message: "Growth task not found" });
      const { status, channel, priority, escalationStage, message, snoozedUntil, completedAt, lastActionAt } = req.body;
      const updated = await updateGrowthTask(req.params.id, {
        status,
        channel,
        priority,
        escalationStage,
        message,
        snoozedUntil: snoozedUntil ? new Date(snoozedUntil) : void 0,
        completedAt: completedAt ? new Date(completedAt) : void 0,
        lastActionAt: lastActionAt ? new Date(lastActionAt) : void 0
      });
      return res.json(updated);
    } catch (error) {
      console.error("Update growth task error:", error);
      return res.status(500).json({ message: "Failed to update growth task" });
    }
  });
  app2.delete("/api/growth-tasks/:id", requireAuth, async (req, res) => {
    try {
      const existing = await getGrowthTaskById(req.params.id);
      if (!existing) return res.status(404).json({ message: "Growth task not found" });
      await deleteGrowthTask(req.params.id);
      return res.json({ message: "Deleted" });
    } catch (error) {
      console.error("Delete growth task error:", error);
      return res.status(500).json({ message: "Failed to delete growth task" });
    }
  });
  app2.post("/api/growth-tasks/:id/action", requireAuth, async (req, res) => {
    try {
      const task = await getGrowthTaskById(req.params.id);
      if (!task) return res.status(404).json({ message: "Growth task not found" });
      const { action, channel } = req.body;
      await createGrowthTaskEvent({ taskId: task.id, action, channel });
      const updateData = { lastActionAt: /* @__PURE__ */ new Date() };
      if (action === "completed") {
        updateData.status = "completed";
        updateData.completedAt = /* @__PURE__ */ new Date();
      }
      const updated = await updateGrowthTask(task.id, updateData);
      return res.json(updated);
    } catch (error) {
      console.error("Record growth task action error:", error);
      return res.status(500).json({ message: "Failed to record action" });
    }
  });
  app2.post("/api/growth-tasks/:id/snooze", requireAuth, async (req, res) => {
    try {
      const task = await getGrowthTaskById(req.params.id);
      if (!task) return res.status(404).json({ message: "Growth task not found" });
      const { hours } = req.body;
      const snoozedUntil = /* @__PURE__ */ new Date();
      snoozedUntil.setHours(snoozedUntil.getHours() + (hours || 1));
      const updated = await updateGrowthTask(task.id, { status: "snoozed", snoozedUntil });
      return res.json(updated);
    } catch (error) {
      console.error("Snooze growth task error:", error);
      return res.status(500).json({ message: "Failed to snooze task" });
    }
  });
  app2.get("/api/review-requests", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const list = await getReviewRequestsByBusiness(business.id);
      return res.json(list);
    } catch (error) {
      console.error("Get review requests error:", error);
      return res.status(500).json({ message: "Failed to get review requests" });
    }
  });
  app2.post("/api/review-requests", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { customerId, jobId } = req.body;
      const request = await createReviewRequest({ businessId: business.id, customerId, jobId });
      return res.json(request);
    } catch (error) {
      console.error("Create review request error:", error);
      return res.status(500).json({ message: "Failed to create review request" });
    }
  });
  app2.put("/api/review-requests/:id", requireAuth, async (req, res) => {
    try {
      const { rating, feedbackText, reviewClicked, referralSent } = req.body;
      const updateData = {};
      if (rating !== void 0) updateData.rating = rating;
      if (feedbackText !== void 0) updateData.feedbackText = feedbackText;
      if (reviewClicked) {
        updateData.reviewClicked = true;
        updateData.reviewClickedAt = /* @__PURE__ */ new Date();
      }
      if (referralSent) {
        updateData.referralSent = true;
        updateData.referralSentAt = /* @__PURE__ */ new Date();
      }
      const updated = await updateReviewRequest(req.params.id, updateData);
      return res.json(updated);
    } catch (error) {
      console.error("Update review request error:", error);
      return res.status(500).json({ message: "Failed to update review request" });
    }
  });
  app2.get("/api/customers/:id/marketing-prefs", requireAuth, async (req, res) => {
    try {
      const prefs = await getMarketingPrefsByCustomer(req.params.id);
      return res.json(prefs || null);
    } catch (error) {
      console.error("Get marketing prefs error:", error);
      return res.status(500).json({ message: "Failed to get marketing prefs" });
    }
  });
  app2.put("/api/customers/:id/marketing-prefs", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { doNotContact, preferredChannel, reviewRequestCooldownDays } = req.body;
      const prefs = await upsertMarketingPrefs(business.id, req.params.id, { doNotContact, preferredChannel, reviewRequestCooldownDays });
      return res.json(prefs);
    } catch (error) {
      console.error("Update marketing prefs error:", error);
      return res.status(500).json({ message: "Failed to update marketing prefs" });
    }
  });
  app2.get("/api/growth-automation-settings", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const settings = await getGrowthAutomationSettings(business.id);
      return res.json(settings || null);
    } catch (error) {
      console.error("Get growth automation settings error:", error);
      return res.status(500).json({ message: "Failed to get growth automation settings" });
    }
  });
  app2.put("/api/growth-automation-settings", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const existing = await getGrowthAutomationSettings(business.id);
      const wasMarketingModeEnabled = existing?.marketingModeEnabled || false;
      const { marketingModeEnabled, abandonedQuoteRecovery, weeklyReactivation, reviewRequestWorkflow, referralAskWorkflow, rebookNudges, upsellTriggers, quietHoursStart, quietHoursEnd, maxSendsPerDay, maxFollowUpsPerQuote, rebookNudgeDaysMin, rebookNudgeDaysMax, deepCleanIntervalMonths, googleReviewLink, includeReviewOnPdf, includeReviewInMessages, askReviewAfterComplete, referralOfferAmount, referralBookingLink, connectedSendingEnabled } = req.body;
      const settings = await upsertGrowthAutomationSettings(business.id, { marketingModeEnabled, abandonedQuoteRecovery, weeklyReactivation, reviewRequestWorkflow, referralAskWorkflow, rebookNudges, upsellTriggers, quietHoursStart, quietHoursEnd, maxSendsPerDay, maxFollowUpsPerQuote, rebookNudgeDaysMin, rebookNudgeDaysMax, deepCleanIntervalMonths, googleReviewLink, includeReviewOnPdf, includeReviewInMessages, askReviewAfterComplete, referralOfferAmount, referralBookingLink, connectedSendingEnabled });
      if (req.body.marketingModeEnabled === true && !wasMarketingModeEnabled) {
        console.log(`[Growth] Marketing mode enabled for business ${business.id} - batch default growth tasks creation pending`);
      }
      return res.json(settings);
    } catch (error) {
      console.error("Update growth automation settings error:", error);
      return res.status(500).json({ message: "Failed to update growth automation settings" });
    }
  });
  app2.get("/api/sales-strategy", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const strategy = await getSalesStrategy(business.id);
      return res.json(strategy || null);
    } catch (error) {
      console.error("Get sales strategy error:", error);
      return res.status(500).json({ message: "Failed to get sales strategy" });
    }
  });
  app2.put("/api/sales-strategy", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { selectedProfile, escalationEnabled } = req.body;
      const strategy = await upsertSalesStrategy(business.id, { selectedProfile, escalationEnabled });
      return res.json(strategy);
    } catch (error) {
      console.error("Update sales strategy error:", error);
      return res.status(500).json({ message: "Failed to update sales strategy" });
    }
  });
  app2.get("/api/campaigns", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const list = await getCampaignsByBusiness(business.id);
      return res.json(list);
    } catch (error) {
      console.error("Get campaigns error:", error);
      return res.status(500).json({ message: "Failed to get campaigns" });
    }
  });
  app2.post("/api/campaigns", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { name, segment, channel, templateKey, customerIds, messageContent, messageSubject } = req.body;
      const campaign = await createCampaign({ businessId: business.id, name, segment, channel, templateKey, customerIds: customerIds || null, messageContent: messageContent || null, messageSubject: messageSubject || null });
      return res.json(campaign);
    } catch (error) {
      console.error("Create campaign error:", error);
      return res.status(500).json({ message: "Failed to create campaign" });
    }
  });
  app2.put("/api/campaigns/:id", requireAuth, async (req, res) => {
    try {
      const existing = await getCampaignById(req.params.id);
      if (!existing) return res.status(404).json({ message: "Campaign not found" });
      const { name, status, completedCount, customerIds, messageContent, messageSubject } = req.body;
      const updateData = {};
      if (name !== void 0) updateData.name = name;
      if (status !== void 0) updateData.status = status;
      if (completedCount !== void 0) updateData.completedCount = completedCount;
      if (customerIds !== void 0) updateData.customerIds = customerIds;
      if (messageContent !== void 0) updateData.messageContent = messageContent;
      if (messageSubject !== void 0) updateData.messageSubject = messageSubject;
      const updated = await updateCampaign(req.params.id, updateData);
      return res.json(updated);
    } catch (error) {
      console.error("Update campaign error:", error);
      return res.status(500).json({ message: "Failed to update campaign" });
    }
  });
  app2.post("/api/campaigns/:id/send", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const campaign = await getCampaignById(req.params.id);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      if (!campaign.messageContent) return res.status(400).json({ message: "Campaign has no message content. Generate a message first." });
      let targetCustomers = [];
      if (Array.isArray(campaign.customerIds) && campaign.customerIds.length > 0) {
        for (const cid of campaign.customerIds) {
          const c = await getCustomerById(cid);
          if (c) targetCustomers.push(c);
        }
      } else if (campaign.segment === "dormant") {
        targetCustomers = await getDormantCustomers(business.id, 90);
      } else if (campaign.segment === "lost") {
        const lostQuotes = await getLostQuotes(business.id, 180);
        const seen = /* @__PURE__ */ new Set();
        for (const lq of lostQuotes) {
          const cid = lq.customerId;
          if (cid && !seen.has(cid)) {
            seen.add(cid);
            const c = await getCustomerById(cid);
            if (c) targetCustomers.push(c);
          }
        }
      } else {
        const allCustomers = await getCustomersByBusiness(business.id);
        targetCustomers = allCustomers;
      }
      if (targetCustomers.length === 0) {
        return res.status(400).json({ message: "No customers found to send to." });
      }
      const isEmail = campaign.channel === "email";
      let sentCount = 0;
      let failCount = 0;
      const errors = [];
      if (isEmail) {
        const sgApiKey = process.env.SENDGRID_API_KEY;
        if (!sgApiKey) return res.status(503).json({ message: "Email service not configured. Please connect SendGrid in settings." });
        const brandedFromEmail = process.env.SENDGRID_FROM_EMAIL || "quotes@myreminder.ai";
        const fromName = business.companyName || "QuotePro";
        const replyToEmail = business.email || void 0;
        if (!replyToEmail) return res.status(400).json({ message: "Please add your email address in Settings before sending emails." });
        for (const customer of targetCustomers) {
          const email = customer.email;
          if (!email) {
            failCount++;
            continue;
          }
          const customerName = `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Customer";
          const personalizedContent = campaign.messageContent.replace(/\[Customer\]/gi, customerName);
          const personalizedSubject = (campaign.messageSubject || `Message from ${fromName}`).replace(/\[Customer\]/gi, customerName);
          const htmlBody = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,${business.primaryColor || "#007AFF"},#5856D6);padding:24px 32px;">
          <h2 style="color:#ffffff;margin:0;font-size:20px;">${fromName}</h2>
        </td></tr>
        <tr><td style="padding:32px;">
          ${personalizedContent.split("\n").map((line) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333333;">${line}</p>`).join("")}
        </td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#999999;">Sent via QuotePro</p>
          <p style="margin:4px 0 0;font-size:11px;color:#bbbbbb;">If you no longer wish to receive these emails, please reply with "unsubscribe".</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
          try {
            const emailPayload = {
              personalizations: [{ to: [{ email }] }],
              from: { email: brandedFromEmail, name: fromName },
              subject: personalizedSubject,
              content: [
                { type: "text/plain", value: personalizedContent },
                { type: "text/html", value: htmlBody }
              ]
            };
            if (replyToEmail) emailPayload.reply_to = { email: replyToEmail, name: fromName };
            const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
              method: "POST",
              headers: { "Authorization": `Bearer ${sgApiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify(emailPayload)
            });
            if (sgRes.ok || sgRes.status === 202) {
              sentCount++;
              await createCommunication({ businessId: business.id, customerId: customer.id, channel: "email", direction: "outbound", content: personalizedContent, status: "sent" });
            } else {
              failCount++;
            }
          } catch (e) {
            failCount++;
          }
        }
      }
      await updateCampaign(campaign.id, { status: "sent", completedCount: sentCount, taskCount: targetCustomers.length });
      return res.json({ success: true, sent: sentCount, failed: failCount, total: targetCustomers.length });
    } catch (error) {
      console.error("Send campaign error:", error);
      return res.status(500).json({ message: "Failed to send campaign" });
    }
  });
  app2.get("/api/upsell-opportunities", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const opportunities = await getUpsellOpportunities(business.id);
      return res.json(opportunities);
    } catch (error) {
      console.error("Get upsell opportunities error:", error);
      return res.status(500).json({ message: "Failed to get upsell opportunities" });
    }
  });
  app2.get("/api/rebook-candidates", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const minDays = parseInt(req.query.minDays) || 21;
      const maxDays = parseInt(req.query.maxDays) || 35;
      const candidates = await getAutoRebookCandidates(business.id, minDays, maxDays);
      return res.json(candidates);
    } catch (error) {
      console.error("Get rebook candidates error:", error);
      return res.status(500).json({ message: "Failed to get rebook candidates" });
    }
  });
  app2.get("/api/forecast", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const forecast = await getForecastData(business.id);
      return res.json(forecast);
    } catch (error) {
      console.error("Get forecast error:", error);
      return res.status(500).json({ message: "Failed to get forecast data" });
    }
  });
  app2.get("/api/quotes/:id/recommendations", requireAuth, async (req, res) => {
    try {
      const recommendations = await getRecommendationsByQuote(req.params.id);
      return res.json(recommendations);
    } catch (error) {
      console.error("Get recommendations error:", error);
      return res.status(500).json({ message: "Failed to get recommendations" });
    }
  });
  app2.patch("/api/recommendations/:id", requireAuth, async (req, res) => {
    try {
      const { status } = req.body;
      const updateData = { status };
      if (status === "completed") updateData.completedAt = /* @__PURE__ */ new Date();
      const rec = await updateRecommendation(req.params.id, updateData);
      if (!rec) return res.status(404).json({ message: "Recommendation not found" });
      return res.json(rec);
    } catch (error) {
      console.error("Update recommendation error:", error);
      return res.status(500).json({ message: "Failed to update recommendation" });
    }
  });
  app2.post("/api/ai/generate-campaign-content", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { campaignName, segment, customPrompt, useAI } = req.body;
      const businessName = business.companyName || "our cleaning company";
      const ownerName = business.senderName || business.companyName || "Your cleaning team";
      const signOff = ownerName;
      const instantTemplates = {
        "Holiday Deep Clean": {
          subject: `Holiday Deep Clean - ${businessName}`,
          content: `Hi [Customer],

The holidays are almost here! Let ${businessName} get your home guest-ready with a thorough deep clean.

We'll tackle kitchens, bathrooms, and living spaces so every room sparkles for your gatherings.

Reply to book and we'll schedule at your convenience.

Best regards,
${signOff}`
        },
        "Spring Cleaning Special": {
          subject: `Spring Cleaning Special - ${businessName}`,
          content: `Hi [Customer],

Spring is here! Time to refresh your home after winter with a deep clean from ${businessName}.

We'll dust, scrub, and polish every corner so your space feels brand new for the warmer months.

Reply to book your spring cleaning today.

Best regards,
${signOff}`
        },
        "New Year Fresh Start": {
          subject: `Start the New Year Fresh - ${businessName}`,
          content: `Hi [Customer],

Happy New Year! Start fresh with a spotless home from ${businessName}.

A clean home sets the tone for a great year ahead. Let us handle the deep clean so you can focus on your goals.

Reply to book and kick off the year right.

Best regards,
${signOff}`
        },
        "Back to School Clean": {
          subject: `Back to School Clean - ${businessName}`,
          content: `Hi [Customer],

School is starting! Get your home refreshed after a busy summer with ${businessName}.

We'll deep clean every room so your family can settle into a clean, organized routine.

Reply to book your back-to-school cleaning.

Best regards,
${signOff}`
        },
        "Win Back Lost Leads": {
          subject: `We'd Love to Hear from You - ${businessName}`,
          content: `Hi [Customer],

It's been a while since we connected. We'd love the chance to earn your business at ${businessName}.

Whether your needs have changed or you're ready for a fresh quote, we're here to help.

Reply to this email and we'll get you taken care of.

Best regards,
${signOff}`
        },
        "VIP Customer Appreciation": {
          subject: `Thank You from ${businessName}`,
          content: `Hi [Customer],

Thank you for being a valued customer of ${businessName}. We truly appreciate your continued trust.

As a loyal client, we'd love to offer you priority booking for your next cleaning.

Reply to book and we'll schedule you at your preferred time.

Warm regards,
${signOff}`
        }
      };
      if (!useAI && !customPrompt?.trim() && instantTemplates[campaignName]) {
        const template = instantTemplates[campaignName];
        return res.json({ content: template.content, subject: template.subject, channel: "email" });
      }
      const targetDesc = segment === "dormant" ? "past customers who haven't booked in a while" : segment === "lost" ? "leads whose quotes expired" : "customers";
      const customInstruction = customPrompt?.trim() ? ` Focus: ${customPrompt.trim()}.` : "";
      const systemPrompt = `Write a short marketing email for "${businessName}" (${ownerName}) to ${targetDesc}. Theme: "${campaignName}".${customInstruction} Rules: first line "Subject: ..." then blank line then body under 60 words in 3 short paragraphs. Use [Customer] as name. Sign off as ${signOff}. No links, no emojis. End with "Reply to book".`;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Write the email." }
        ]
      });
      const raw = completion.choices[0]?.message?.content?.trim() || "";
      if (!raw) {
        const fallback = instantTemplates[campaignName] || { content: `Hi [Customer],

We wanted to reach out from ${businessName} about our ${campaignName} offer.

We'd love to serve you${segment === "dormant" ? " again" : ""}. Reply to schedule your next cleaning.

Best regards,
${signOff}`, subject: campaignName };
        return res.json({ content: fallback.content, subject: fallback.subject, channel: "email" });
      }
      let subject = "";
      let content = raw;
      const subjectMatch = raw.match(/^Subject:\s*(.+)/i);
      if (subjectMatch) {
        subject = subjectMatch[1].trim();
        content = raw.substring(raw.indexOf("\n") + 1).trim();
      }
      return res.json({ content, subject: subject || campaignName, channel: "email" });
    } catch (error) {
      console.error("AI generate campaign content error:", error?.message || error, error?.code, error?.status);
      return res.status(500).json({ message: "Failed to generate campaign content" });
    }
  });
  app2.post("/api/ai/generate-review-email", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const businessName = business.companyName || "our cleaning company";
      const ownerName = business.senderName || "";
      const growthSettings = await getGrowthAutomationSettings(business.id);
      const googleReviewLink = growthSettings?.googleReviewLink?.trim() || "";
      const linkInstruction = googleReviewLink ? `Include this Google review link in the email naturally: ${googleReviewLink} \u2014 encourage them to click it to leave a review.` : `No links/URLs. Ask them to reply with their feedback or leave a review.`;
      const systemPrompt = `Write a short, warm email from "${businessName}"${ownerName ? ` (${ownerName})` : ""} asking a customer for a review of their cleaning service. Format: first line "Subject: ...", blank line, then body under 100 words. Use [Customer] for their name. No placeholders for company/owner - use real names. ${linkInstruction} No emojis. Keep it personal and genuine.`;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate a review request email." }
        ],
        max_completion_tokens: 250
      });
      const raw = completion.choices[0]?.message?.content?.trim() || "";
      let subject = "";
      let content = raw;
      if (raw.startsWith("Subject:")) {
        const lines = raw.split("\n");
        subject = lines[0].replace("Subject:", "").trim();
        content = lines.slice(1).join("\n").trim();
      }
      const fallbackLink = googleReviewLink ? `

Leave us a review here: ${googleReviewLink}` : "";
      if (!content) {
        return res.json({
          content: `Dear [Customer],

Thank you for choosing ${businessName}. We hope you were happy with our service.

Would you take a moment to share your experience? Your feedback helps us improve and means a lot to our team.${fallbackLink}

We appreciate your time!

Best regards,
${ownerName || businessName}`,
          subject: "We would love your feedback",
          channel: "email"
        });
      }
      return res.json({ content, subject, channel: "email" });
    } catch (error) {
      console.error("AI generate review email error:", error?.message || error);
      const business = await getBusinessByOwner(req.session.userId).catch(() => null);
      const businessName = business?.companyName || "our cleaning company";
      const ownerName = business?.senderName || businessName;
      let fallbackLink = "";
      try {
        if (business) {
          const gs = await getGrowthAutomationSettings(business.id);
          if (gs?.googleReviewLink?.trim()) fallbackLink = `

Leave us a review here: ${gs.googleReviewLink.trim()}`;
        }
      } catch {
      }
      return res.json({
        content: `Dear [Customer],

Thank you for choosing ${businessName}. We hope you were happy with our service.

Would you take a moment to share your experience? Your feedback helps us improve and means a lot to our team.${fallbackLink}

We appreciate your time!

Best regards,
${ownerName}`,
        subject: "We would love your feedback",
        channel: "email"
      });
    }
  });
  app2.post("/api/ai/generate-message", requireAuth, async (req, res) => {
    try {
      const { messageType, customerContext, strategyProfile, escalationStage, channel, language: commLang } = req.body;
      const msgChannel = channel || "sms";
      const profile = strategyProfile || "warm";
      const stage = escalationStage || 1;
      const toneMap = {
        warm: "warm",
        direct: "direct",
        premium: "premium",
        urgent: "urgent"
      };
      const tone = toneMap[profile] || "warm";
      const lengthInstruction = msgChannel === "sms" ? "Keep under 240 characters." : "Keep under 120 words.";
      const langInstruction = commLang === "es" ? " Write entirely in Spanish." : " Write entirely in English.";
      const systemPrompt = `You are a professional message writer for a residential cleaning business. Generate a ${msgChannel} message. Strategy: ${profile}. Escalation stage: ${stage} of 4. Message type: ${messageType}. Keep it ${tone} based on profile. ${lengthInstruction} Never be rude. Use the customer's first name.${langInstruction}`;
      const userPrompt = `Customer first name: ${customerContext?.firstName || "there"}. ${customerContext?.quoteTotal ? `Quote total: $${customerContext.quoteTotal}.` : ""} ${customerContext?.serviceType ? `Service type: ${customerContext.serviceType}.` : ""} ${customerContext?.lastServiceDate ? `Last service date: ${customerContext.lastServiceDate}.` : ""} ${customerContext?.homeSize ? `Home size: ${customerContext.homeSize}.` : ""}`;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });
      const generatedMessage = completion.choices[0]?.message?.content?.trim() || "";
      return res.json({ message: generatedMessage, channel: msgChannel });
    } catch (error) {
      console.error("AI generate message error:", error);
      return res.status(500).json({ message: "Failed to generate message" });
    }
  });
  app2.post("/api/public/rate/:token", async (req, res) => {
    try {
      const job = await getJobByRatingToken(req.params.token);
      if (!job) return res.status(404).json({ message: "Job not found" });
      const { rating, comment } = req.body;
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      if (job.satisfactionRating) {
        return res.status(400).json({ message: "This job has already been rated" });
      }
      const updated = await rateJob(job.id, rating, comment);
      return res.json({ success: true, rating: updated.satisfactionRating });
    } catch (error) {
      console.error("Public rate error:", error);
      return res.status(500).json({ message: "Failed to submit rating" });
    }
  });
  app2.get("/rate/:token", async (req, res) => {
    try {
      const job = await getJobByRatingToken(req.params.token);
      if (!job) {
        return res.status(404).send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Not Found</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}.card{background:#fff;border-radius:16px;padding:48px 32px;text-align:center;max-width:420px;width:100%;box-shadow:0 1px 3px rgba(0,0,0,0.08)}.icon{width:48px;height:48px;margin:0 auto 16px}h1{font-size:22px;font-weight:700;color:#1E293B;margin-bottom:8px}p{font-size:15px;color:#64748B;line-height:1.5}</style></head><body><div class="card"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><h1>Not Found</h1><p>This rating link is invalid or has been removed.</p></div></body></html>`);
      }
      const business = await db_getBusinessById(job.businessId);
      const brandColor = business?.primaryColor || "#2563EB";
      const companyName = business?.companyName || "Our Company";
      const logoUri = business?.logoUri || "";
      const alreadyRated = job.satisfactionRating !== null && job.satisfactionRating !== void 0;
      const starSvg = `<svg viewBox="0 0 24 24" width="44" height="44"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Rate Your Service - ${companyName}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
.card{background:#fff;border-radius:16px;padding:40px 32px;text-align:center;max-width:480px;width:100%;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
.logo{width:64px;height:64px;border-radius:50%;object-fit:cover;margin-bottom:12px}
.logo-placeholder{width:64px;height:64px;border-radius:50%;background:${brandColor};display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:28px;font-weight:700;color:#fff}
.company{font-size:18px;font-weight:700;color:#1E293B;margin-bottom:24px}
h1{font-size:22px;font-weight:700;color:#1E293B;margin-bottom:8px}
p{font-size:15px;color:#64748B;line-height:1.5}
.stars{display:flex;justify-content:center;gap:8px;margin:24px 0}
.star{cursor:pointer;transition:transform 0.15s}
.star:hover{transform:scale(1.15)}
.star svg{fill:#D1D5DB;stroke:none;transition:fill 0.15s}
.star.active svg{fill:#FBBF24}
.star.hover-active svg{fill:#FCD34D}
textarea{width:100%;min-height:80px;border:1px solid #E2E8F0;border-radius:12px;padding:12px 16px;font-family:inherit;font-size:15px;resize:vertical;margin-top:16px;outline:none;transition:border-color 0.15s}
textarea:focus{border-color:${brandColor}}
.btn{display:inline-block;width:100%;padding:14px 24px;background:${brandColor};color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;margin-top:20px;transition:opacity 0.15s}
.btn:hover{opacity:0.9}
.btn:disabled{opacity:0.5;cursor:not-allowed}
.success-check{width:64px;height:64px;border-radius:50%;background:#DCFCE7;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
.success-check svg{width:32px;height:32px;stroke:#16A34A;fill:none;stroke-width:3}
.rated-stars{display:flex;justify-content:center;gap:4px;margin:16px 0}
.rated-stars svg{width:28px;height:28px;fill:#FBBF24;stroke:none}
.rated-stars svg.empty{fill:#D1D5DB}
.error-msg{color:#EF4444;font-size:14px;margin-top:8px;display:none}
#form-view,#success-view,#rated-view{display:none}
</style>
</head>
<body>
<div class="card">
${logoUri ? `<img class="logo" src="${logoUri}" alt="${companyName}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="logo-placeholder" style="display:none">${companyName.charAt(0).toUpperCase()}</div>` : `<div class="logo-placeholder">${companyName.charAt(0).toUpperCase()}</div>`}
<div class="company">${companyName}</div>

<div id="rated-view">
<div class="success-check"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></div>
<h1>Thank You for Your Feedback!</h1>
<p>You rated your service:</p>
<div class="rated-stars" id="rated-stars"></div>
${job.ratingComment ? `<p style="margin-top:12px;font-style:italic">"${job.ratingComment.replace(/</g, "&lt;").replace(/>/g, "&gt;")}"</p>` : ""}
</div>

<div id="form-view">
<h1>How was your cleaning service?</h1>
<p>We'd love to hear about your experience</p>
<div class="stars" id="stars">
<span class="star" data-value="1">${starSvg}</span>
<span class="star" data-value="2">${starSvg}</span>
<span class="star" data-value="3">${starSvg}</span>
<span class="star" data-value="4">${starSvg}</span>
<span class="star" data-value="5">${starSvg}</span>
</div>
<textarea id="comment" placeholder="Any comments? (optional)"></textarea>
<div class="error-msg" id="error-msg"></div>
<button class="btn" id="submit-btn" disabled onclick="submitRating()">Submit Rating</button>
</div>

<div id="success-view">
<div class="success-check"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></div>
<h1>Thank You!</h1>
<p>Your feedback helps us improve our service.</p>
</div>
</div>

<script>
var selectedRating = 0;
var alreadyRated = ${alreadyRated ? "true" : "false"};
var existingRating = ${job.satisfactionRating || 0};

function init() {
  if (alreadyRated) {
    document.getElementById('rated-view').style.display = 'block';
    var ratedStars = document.getElementById('rated-stars');
    for (var i = 1; i <= 5; i++) {
      var svg = document.createElement('span');
      svg.innerHTML = '${starSvg.replace(/'/g, "\\'")}';
      var svgEl = svg.querySelector('svg');
      svgEl.setAttribute('width', '28');
      svgEl.setAttribute('height', '28');
      if (i > existingRating) svgEl.classList.add('empty');
      ratedStars.appendChild(svgEl);
    }
  } else {
    document.getElementById('form-view').style.display = 'block';
    var stars = document.querySelectorAll('.star');
    stars.forEach(function(star) {
      star.addEventListener('click', function() {
        selectedRating = parseInt(this.getAttribute('data-value'));
        updateStars();
        document.getElementById('submit-btn').disabled = false;
      });
      star.addEventListener('mouseenter', function() {
        var val = parseInt(this.getAttribute('data-value'));
        stars.forEach(function(s) {
          var sv = parseInt(s.getAttribute('data-value'));
          if (sv <= val) { s.classList.add('hover-active'); } else { s.classList.remove('hover-active'); }
        });
      });
      star.addEventListener('mouseleave', function() {
        stars.forEach(function(s) { s.classList.remove('hover-active'); });
      });
    });
  }
}

function updateStars() {
  var stars = document.querySelectorAll('.star');
  stars.forEach(function(s) {
    var val = parseInt(s.getAttribute('data-value'));
    if (val <= selectedRating) { s.classList.add('active'); } else { s.classList.remove('active'); }
  });
}

function submitRating() {
  if (selectedRating < 1) return;
  var btn = document.getElementById('submit-btn');
  var errEl = document.getElementById('error-msg');
  btn.disabled = true;
  btn.textContent = 'Submitting...';
  errEl.style.display = 'none';

  var comment = document.getElementById('comment').value.trim();
  var body = { rating: selectedRating };
  if (comment) body.comment = comment;

  fetch('/api/public/rate/${req.params.token}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(function(r) {
    if (!r.ok) return r.json().then(function(d) { throw new Error(d.message || 'Failed'); });
    return r.json();
  }).then(function() {
    document.getElementById('form-view').style.display = 'none';
    document.getElementById('success-view').style.display = 'block';
  }).catch(function(e) {
    errEl.textContent = e.message || 'Something went wrong. Please try again.';
    errEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Submit Rating';
  });
}

init();
</script>
</body>
</html>`;
      return res.send(html);
    } catch (error) {
      console.error("Rating page error:", error);
      return res.status(500).send("Something went wrong");
    }
  });
  app2.get("/q/:token", async (req, res) => {
    try {
      const q = await getQuoteByToken(req.params.token);
      if (!q) {
        return res.status(404).send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Quote Not Found</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',system-ui,sans-serif;background:#F8FAFC;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}.card{background:#fff;border-radius:16px;padding:48px 32px;text-align:center;max-width:420px;width:100%;box-shadow:0 4px 12px rgba(0,0,0,0.08)}.icon{font-size:48px;margin-bottom:16px}h1{font-size:22px;font-weight:700;color:#0F172A;margin-bottom:8px}p{font-size:15px;color:#64748B;line-height:1.5}</style></head><body><div class="card"><div class="icon">&#128269;</div><h1>Quote Not Found</h1><p>This quote link is invalid or has been removed. Please contact the business for a new quote.</p></div></body></html>`);
      }
      const escHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
      const business = await db_getBusinessById(q.businessId);
      const customer = q.customerId ? await getCustomerById(q.customerId) : null;
      const lineItems = await getLineItemsByQuote(q.id);
      const qpPublic = business?.quotePreferences;
      const brandColor = (qpPublic?.brandColor || business?.primaryColor || "#2563EB").replace(/[^#a-fA-F0-9]/g, "");
      const companyName = escHtml(business?.companyName || "Our Company");
      const logoUri = escHtml(business?.logoUri || "");
      try {
        if (!q.viewedAt) {
          await updateQuote(q.id, { viewedAt: /* @__PURE__ */ new Date() });
          const existingFollowUps = await getFollowUpsByQuote(q.id);
          const hasPendingFollowUp = existingFollowUps.some((f) => f.status === "scheduled");
          if (!hasPendingFollowUp && q.status !== "accepted" && q.status !== "declined") {
            const followUpDelay = 24 * 60 * 60 * 1e3;
            const scheduledFor = new Date(Date.now() + followUpDelay);
            await createFollowUp({
              quoteId: q.id,
              businessId: q.businessId,
              scheduledFor,
              channel: "sms",
              message: "",
              status: "scheduled"
            });
          }
        }
      } catch (_e) {
      }
      if (q.expiresAt && new Date(q.expiresAt) < /* @__PURE__ */ new Date()) {
        return res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Quote Expired</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',system-ui,sans-serif;background:#F8FAFC;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}.card{background:#fff;border-radius:16px;padding:48px 32px;text-align:center;max-width:420px;width:100%;box-shadow:0 4px 12px rgba(0,0,0,0.08)}.icon{width:72px;height:72px;border-radius:50%;background:#FEF3C7;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px}h1{font-size:22px;font-weight:800;color:#0F172A;margin-bottom:8px}p{font-size:15px;color:#64748B;line-height:1.5}.brand{color:${brandColor};font-weight:600}</style></head><body><div class="card"><div class="icon">&#9203;</div><h1>Quote Expired</h1><p>This quote from <span class="brand">${companyName}</span> has expired. Please contact us for an updated quote.</p>${business?.phone ? `<p style="margin-top:16px"><a href="tel:${business.phone}" style="color:${brandColor};text-decoration:none;font-weight:600">${business.phone}</a></p>` : ""}</div></body></html>`);
      }
      if (q.status === "accepted") {
        const acceptedDate = q.acceptedAt ? new Date(q.acceptedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
        return res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Quote Accepted</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',system-ui,sans-serif;background:#F8FAFC;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}.card{background:#fff;border-radius:16px;padding:48px 32px;text-align:center;max-width:420px;width:100%;box-shadow:0 4px 12px rgba(0,0,0,0.08)}.icon{width:72px;height:72px;border-radius:50%;background:#DCFCE7;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px;color:#16A34A}h1{font-size:22px;font-weight:800;color:#0F172A;margin-bottom:8px}p{font-size:15px;color:#64748B;line-height:1.5}.brand{color:${brandColor};font-weight:600}.total{font-size:32px;font-weight:800;color:#16A34A;margin:16px 0;letter-spacing:-1px}</style></head><body><div class="card"><div class="icon">&#10003;</div><h1>You're All Set!</h1><p>You accepted this quote from <span class="brand">${companyName}</span>${acceptedDate ? ` on ${acceptedDate}` : ""}.</p><div class="total">$${Number(q.total).toFixed(2)}</div><p>We'll be in touch to confirm your appointment.</p>${business?.phone ? `<p style="margin-top:16px"><a href="tel:${business.phone}" style="color:${brandColor};text-decoration:none;font-weight:600">${business.phone}</a></p>` : ""}</div></body></html>`);
      }
      const opts = q.options || {};
      const addOns = q.addOns || {};
      const details = q.propertyDetails || {};
      const customerName = escHtml(customer ? `${customer.firstName} ${customer.lastName}`.trim() : "");
      const customerAddress = escHtml(customer?.address || details?.address || "");
      const rawOption = req.query.option || q.selectedOption || q.recommendedOption || "";
      const preselectedOption = ["good", "better", "best", ""].includes(rawOption) ? rawOption : "";
      const oneTimeAddOnKeys = ["insideFridge", "insideOven", "insideCabinets", "interiorWindows", "blindsDetail", "baseboardsDetail", "laundryFoldOnly", "dishes", "organizationTidy"];
      const builtInServiceTypes = ["deep-clean", "move-in-out", "post-construction"];
      const isRecurring = q.frequencySelected && q.frequencySelected !== "one-time";
      const hasOneTimeAddOns = oneTimeAddOnKeys.some((k) => {
        const v = addOns[k];
        return v && (typeof v === "object" ? v.selected : v);
      });
      let oneTimeAddOnTotal = 0;
      let pricingSettings2 = null;
      try {
        pricingSettings2 = await getPricingByBusiness(q.businessId);
      } catch (_e) {
      }
      const addOnPrices = pricingSettings2?.addOnPrices || {};
      if (isRecurring && hasOneTimeAddOns) {
        for (const k of oneTimeAddOnKeys) {
          const v = addOns[k];
          const isEnabled = v && (typeof v === "object" ? v.selected : v);
          if (isEnabled) {
            const addonPrice = typeof v === "object" && v.price ? Number(v.price) : addOnPrices[k] ? Number(addOnPrices[k]) : 0;
            oneTimeAddOnTotal += addonPrice;
          }
        }
      }
      const optionLabels = { good: "Good", better: "Better", best: "Best" };
      const optionDescriptions = {
        good: "Essential cleaning for a tidy home",
        better: "Thorough cleaning with extra attention to detail",
        best: "Premium deep clean with all the extras"
      };
      const optionDataItems = [];
      let optionsHtml = "";
      for (const key of ["good", "better", "best"]) {
        const optVal = opts[key];
        if (optVal === void 0) continue;
        const price = typeof optVal === "object" ? optVal.price : optVal;
        if (price === void 0) continue;
        const name = escHtml(typeof optVal === "object" && optVal.name ? optVal.name : optionLabels[key] || key);
        const scope = escHtml(typeof optVal === "object" && optVal.scope ? optVal.scope : optionDescriptions[key] || "");
        const serviceTypeId = typeof optVal === "object" && optVal.serviceTypeId ? optVal.serviceTypeId : "";
        const isBuiltIn = builtInServiceTypes.includes(serviceTypeId);
        const showRecurring = isRecurring && hasOneTimeAddOns && !isBuiltIn && oneTimeAddOnTotal > 0;
        const recurringPrice = showRecurring ? Math.max(0, Number(price) - oneTimeAddOnTotal) : null;
        optionDataItems.push({ key, price: Number(price), name, scope, recurringPrice });
        const isSelected = preselectedOption === key;
        const publicRecommended = q.recommendedOption || "better";
        const isRecommendedPublic = key === publicRecommended;
        const recurringHtml = recurringPrice !== null ? `<div class="option-recurring">Then $${recurringPrice.toFixed(2)}/visit</div>` : "";
        const recommendedBadgeHtml = isRecommendedPublic ? `<div class="recommended-badge">MOST POPULAR</div>` : "";
        optionsHtml += `<div class="option-card${isSelected ? " selected" : ""}" data-key="${key}" onclick="selectOption('${key}')">
          ${recommendedBadgeHtml}
          <div class="option-row">
            <div class="option-radio"><div class="option-radio-inner"></div></div>
            <div class="option-info">
              <div class="option-name">${name}</div>
              <div class="option-scope">${scope}</div>
            </div>
            <div class="option-price-col">
              <div class="option-price">$${Number(price).toFixed(2)}</div>
              ${recurringHtml}
            </div>
          </div>
        </div>`;
      }
      const addonDataItems = [];
      let addOnsHtml = "";
      const allAddonKeys = Object.keys(addOns);
      if (allAddonKeys.length > 0) {
        for (const key of allAddonKeys) {
          const v = addOns[key];
          if (!v) continue;
          const isEnabled = typeof v === "object" ? v.selected : v;
          const price = typeof v === "object" && v.price ? Number(v.price) : addOnPrices[key] ? Number(addOnPrices[key]) : 0;
          const label = escHtml(key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).replace(/_/g, " "));
          addonDataItems.push({ key, name: label, price, selected: !!isEnabled });
          const checkedClass = isEnabled ? " checked" : "";
          addOnsHtml += `<div class="addon-row" onclick="toggleAddon(this,'${key}')">
            <div class="addon-left">
              <div class="addon-check${checkedClass}"><svg viewBox="0 0 12 12"><path d="M10 3L4.5 8.5 2 6"/></svg></div>
              <span class="addon-name">${label}</span>
            </div>
            ${price > 0 ? `<span class="addon-price">+$${price.toFixed(2)}</span>` : `<span class="addon-included">Included</span>`}
          </div>`;
        }
      }
      let lineItemsHtml = "";
      if (lineItems.length > 0) {
        for (const li of lineItems) {
          lineItemsHtml += `<div class="line-item-row"><span class="line-item-name">${escHtml(li.name)}${li.quantity > 1 ? ` x${li.quantity}` : ""}</span><span class="line-item-price">$${Number(li.totalPrice).toFixed(2)}</span></div>`;
        }
      }
      const propertyPills = [];
      if (q.propertyBeds) propertyPills.push(`${q.propertyBeds} Bed`);
      if (q.propertyBaths) propertyPills.push(`${q.propertyBaths} Bath`);
      if (q.propertySqft) propertyPills.push(`${q.propertySqft.toLocaleString()} sq ft`);
      if (customerAddress) propertyPills.push(customerAddress);
      const firstName = customerName ? customerName.split(" ")[0] : "";
      const greeting = firstName ? `Hi ${firstName},` : "Your Cleaning Quote";
      const subtitleText = firstName ? "Here's your personalized quote. Review your options and accept when ready." : "Review the details below and accept when ready.";
      const freqLabels = { weekly: "Weekly", biweekly: "Bi-weekly", monthly: "Monthly", quarterly: "Quarterly" };
      const frequencyLabel = q.frequencySelected && q.frequencySelected !== "one-time" ? freqLabels[q.frequencySelected] || q.frequencySelected : "";
      const freqOptions = ["one-time", "weekly", "biweekly", "monthly", "quarterly"];
      const freqOptionLabels = { "one-time": "One-time", weekly: "Weekly", biweekly: "Bi-weekly", monthly: "Monthly", quarterly: "Quarterly" };
      let frequencyOptionsHtml = "";
      for (const f of freqOptions) {
        const selected = q.frequencySelected === f || !q.frequencySelected && f === "one-time" ? " selected" : "";
        frequencyOptionsHtml += `<option value="${f}"${selected}>${freqOptionLabels[f]}</option>`;
      }
      const depositRequired = q.depositRequired || false;
      const depositAmount = Number(q.depositAmount) || 0;
      const lineItemsSum = lineItems.reduce((s, li) => s + (Number(li.totalPrice) || 0), 0);
      const totalNum = Number(q.total) > 0 ? Number(q.total) : lineItemsSum > 0 ? lineItemsSum : 0;
      console.log(`[quote render] token=${req.params.token} q.total=${q.total} lineItemsSum=${lineItemsSum} totalNum=${totalNum} lineItems=${lineItems.length}`);
      const depositFormatted = depositAmount.toFixed(2);
      const balanceFormatted = Math.max(0, totalNum - depositAmount).toFixed(2);
      const expiresAtMs = q.expiresAt ? new Date(q.expiresAt).getTime() : 0;
      const hasExpiry = !!q.expiresAt;
      const expiryText = q.expiresAt ? `Valid until ${new Date(q.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : "";
      const expiryUrgentClass = q.expiresAt && new Date(q.expiresAt).getTime() - Date.now() < 1728e5 ? "urgent" : "";
      let reviewsData = [];
      let avgRating = 0;
      try {
        const reviewResult = await pool.query(
          `SELECT rating, feedback_text as "feedbackText", 
            (SELECT first_name FROM customers WHERE id = rr.customer_id) as "firstName"
           FROM review_requests rr
           WHERE business_id = $1 AND rating >= 4 AND feedback_text IS NOT NULL AND feedback_text != ''
           ORDER BY created_at DESC LIMIT 3`,
          [q.businessId]
        );
        reviewsData = reviewResult.rows;
        if (reviewsData.length > 0) {
          avgRating = Math.round(reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length * 10) / 10;
        }
      } catch (_e) {
      }
      let testimonialsHtml = "";
      for (const r of reviewsData) {
        const authorName = escHtml(r.firstName ? `${r.firstName}` : "Customer");
        const stars = "&#9733;".repeat(r.rating);
        const safeText = escHtml(r.feedbackText || "");
        testimonialsHtml += `<div class="testimonial-card"><div style="color:#F59E0B;font-size:14px;margin-bottom:4px">${stars}</div><div class="testimonial-text">"${safeText}"</div><div class="testimonial-author">&mdash; ${authorName}</div></div>`;
      }
      const trustStarsHtml = Array(5).fill(0).map((_, i) => `<svg class="trust-star" viewBox="0 0 20 20"${i < Math.round(avgRating) ? "" : ' style="fill:#E2E8F0"'}><path d="M10 1l2.39 4.84L17.5 6.7l-3.75 3.66.89 5.14L10 13.09l-4.64 2.41.89-5.14L2.5 6.7l5.11-.86z"/></svg>`).join("");
      let trustBadgesHtml = "";
      if (business?.phone || business?.email) {
        trustBadgesHtml += `<span class="trust-badge-item"><svg viewBox="0 0 20 20"><path d="M10 1a9 9 0 100 18 9 9 0 000-18zm1 13H9v-2h2v2zm0-4H9V5h2v5z"/></svg>Licensed &amp; Insured</span>`;
      }
      const trustNote = "";
      const hasTrust = reviewsData.length > 0 || trustBadgesHtml.length > 0;
      const acceptButtonText = depositRequired && depositAmount > 0 ? "Accept &amp; Pay Deposit" : "Accept Quote";
      const acceptModalTitle = depositRequired && depositAmount > 0 ? "Accept & Pay Deposit" : "Accept Quote";
      const todayDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const fs2 = await import("fs");
      const path2 = await import("path");
      let template = fs2.readFileSync(path2.join(process.cwd(), "server/templates/instant-quote.html"), "utf-8");
      const replacements = {
        "{{brandColor}}": brandColor,
        "{{companyName}}": companyName,
        "{{greeting}}": greeting,
        "{{subtitleText}}": subtitleText,
        "{{totalFormatted}}": totalNum.toFixed(2),
        "{{publicToken}}": q.publicToken || "",
        "{{preselectedOption}}": preselectedOption,
        "{{optionDataJson}}": JSON.stringify(optionDataItems),
        "{{addonDataJson}}": JSON.stringify(addonDataItems),
        "{{optionsHtml}}": optionsHtml,
        "{{addOnsHtml}}": addOnsHtml,
        "{{lineItemsHtml}}": lineItemsHtml,
        "{{frequencyOptionsHtml}}": frequencyOptionsHtml,
        "{{depositFormatted}}": depositFormatted,
        "{{balanceFormatted}}": balanceFormatted,
        "{{depositRequired}}": String(depositRequired),
        "{{depositAmountNum}}": String(depositAmount),
        "{{expiresAtMs}}": String(expiresAtMs),
        "{{expiryText}}": expiryText,
        "{{expiryUrgentClass}}": expiryUrgentClass,
        "{{testimonialsHtml}}": testimonialsHtml,
        "{{trustStarsHtml}}": trustStarsHtml,
        "{{avgRating}}": String(avgRating),
        "{{reviewCount}}": String(reviewsData.length),
        "{{trustBadgesHtml}}": trustBadgesHtml,
        "{{trustNote}}": trustNote,
        "{{acceptButtonText}}": acceptButtonText,
        "{{acceptModalTitle}}": acceptModalTitle,
        "{{todayDate}}": todayDate,
        "{{businessPhone}}": escHtml(business?.phone || ""),
        "{{businessEmail}}": escHtml(business?.email || ""),
        "{{frequencyLabel}}": frequencyLabel,
        "{{storedTotal}}": String(totalNum)
      };
      for (const [key, val] of Object.entries(replacements)) {
        template = template.split(key).join(val);
      }
      const conditionalSections = {
        "logoUri": !!logoUri,
        "hasPropertyInfo": propertyPills.length > 0,
        "hasMultipleOptions": optionDataItems.length > 1,
        "hasSingleOption": optionDataItems.length === 1,
        "hasAddOns": addonDataItems.length > 0,
        "hasLineItems": lineItems.length > 0,
        "hasDeposit": depositRequired && depositAmount > 0,
        "hasExpiry": hasExpiry,
        "hasTrust": hasTrust,
        "hasReviews": reviewsData.length > 0,
        "hasTrustBadges": trustBadgesHtml.length > 0,
        "frequencyLabel": !!frequencyLabel,
        "businessPhone": !!business?.phone,
        "businessEmail": !!business?.email,
        "trustNote": !!trustNote
      };
      for (const [key, show] of Object.entries(conditionalSections)) {
        const openTag = `{{#${key}}}`;
        const closeTag = `{{/${key}}}`;
        if (show) {
          template = template.split(openTag).join("").split(closeTag).join("");
        } else {
          const regex = new RegExp(`\\{\\{#${key}\\}\\}[\\s\\S]*?\\{\\{\\/${key}\\}\\}`, "g");
          template = template.replace(regex, "");
        }
      }
      if (logoUri) {
        template = template.replace("{{logoUri}}", logoUri);
      }
      if (propertyPills.length > 0) {
        const pillsHtml = propertyPills.map((p) => `<span class="property-pill">${p}</span>`).join("");
        template = template.replace(/\{\{#propertyPills\}\}[\s\S]*?\{\{\/propertyPills\}\}/g, pillsHtml);
      }
      if (optionDataItems.length === 1) {
        const singleOpt = optionDataItems[0];
        const singleHtml = `<div class="single-option-card">
          <div class="option-row">
            <div class="option-info"><div class="option-name">${singleOpt.name}</div><div class="option-scope">${singleOpt.scope}</div></div>
            <div class="option-price-col"><div class="option-price">$${singleOpt.price.toFixed(2)}</div>${singleOpt.recurringPrice !== null ? `<div class="option-recurring">Then $${singleOpt.recurringPrice.toFixed(2)}/visit</div>` : ""}</div>
          </div>
        </div>`;
        template = template.replace("{{singleOptionHtml}}", singleHtml);
      }
      return res.send(template);
    } catch (error) {
      console.error("Public quote page error:", error);
      return res.status(500).send(`<!DOCTYPE html><html><head><title>Error</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:'Inter',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F8FAFC}.card{text-align:center;padding:48px 32px;background:#fff;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.08);max-width:420px}h1{font-size:22px;font-weight:800;color:#0F172A;margin-bottom:8px}p{font-size:15px;color:#64748B;line-height:1.5}</style></head><body><div class="card"><h1>Something went wrong</h1><p>Please try again or contact the business directly.</p></div></body></html>`);
    }
  });
  app2.post("/q/:token/accept", async (req, res) => {
    try {
      const q = await getQuoteByToken(req.params.token);
      if (!q) return res.status(404).json({ success: false, message: "Quote not found" });
      if (q.expiresAt && new Date(q.expiresAt) < /* @__PURE__ */ new Date()) {
        return res.status(400).json({ success: false, message: "This quote has expired" });
      }
      if (q.status === "accepted") {
        return res.json({ success: true, already: true });
      }
      if (q.status === "declined") {
        return res.status(400).json({ success: false, message: "This quote has been declined" });
      }
      const { acceptedName, selectedOption, phone, acceptedFrequency, acceptedNotes, acceptedPreferences, selectedAddons } = req.body;
      if (!acceptedName || typeof acceptedName !== "string" || !acceptedName.trim()) {
        return res.status(400).json({ success: false, message: "Please provide your name" });
      }
      const existingDetails = q.propertyDetails || {};
      const updatedDetails = {
        ...existingDetails,
        acceptanceSignature: acceptedName.trim(),
        acceptedVia: "web",
        acceptedIp: req.ip || req.headers["x-forwarded-for"] || "unknown"
      };
      const updateData = {
        status: "accepted",
        acceptedAt: /* @__PURE__ */ new Date(),
        propertyDetails: updatedDetails,
        acceptedSource: "email_link"
      };
      if (acceptedFrequency) updateData.acceptedFrequency = acceptedFrequency;
      if (acceptedNotes) updateData.acceptedNotes = acceptedNotes;
      if (acceptedPreferences) updateData.acceptedPreferences = acceptedPreferences;
      if (phone) {
        updatedDetails.acceptedPhone = phone;
        updateData.propertyDetails = updatedDetails;
      }
      if (selectedOption && ["good", "better", "best"].includes(selectedOption)) {
        updateData.selectedOption = selectedOption;
        const opts = q.options || {};
        const optVal = opts[selectedOption];
        if (optVal !== void 0) {
          const price = typeof optVal === "object" ? optVal.price : optVal;
          if (price !== void 0) {
            updateData.total = Number(price);
          }
        }
      }
      if (selectedAddons && typeof selectedAddons === "object") {
        const existingAddOns = q.addOns || {};
        const validatedAddOns = {};
        for (const [key, val] of Object.entries(selectedAddons)) {
          if (existingAddOns[key]) {
            const storedPrice = typeof existingAddOns[key] === "object" && existingAddOns[key].price ? Number(existingAddOns[key].price) : 0;
            validatedAddOns[key] = {
              selected: !!val?.selected,
              price: storedPrice,
              name: val?.name || key
            };
          }
        }
        updateData.addOns = validatedAddOns;
        let addOnsTotal = 0;
        for (const val of Object.values(validatedAddOns)) {
          if (val.selected && val.price) addOnsTotal += Number(val.price);
        }
        const basePrice = updateData.total || Number(q.total) || 0;
        updateData.total = basePrice + addOnsTotal;
      }
      await updateQuote(q.id, updateData);
      await cancelPendingCommunicationsForQuote(q.id);
      try {
        const business = await db_getBusinessById(q.businessId);
        const customer = q.customerId ? await getCustomerById(q.customerId) : null;
        const updatedQuote = { ...q, ...updateData };
        generateRevenuePlaybook(updatedQuote, business, customer).catch(() => {
        });
      } catch (_e) {
      }
      if (q.customerId) {
        try {
          const customerUpdate = { status: "active" };
          if (phone) customerUpdate.phone = phone;
          await updateCustomer(q.customerId, customerUpdate);
        } catch (_e) {
        }
      }
      try {
        const business = await db_getBusinessById(q.businessId);
        if (business?.userId) {
          const tokens = await getPushTokensByUser(business.userId);
          const customer = q.customerId ? await getCustomerById(q.customerId) : null;
          const customerName = customer ? `${customer.firstName} ${customer.lastName}`.trim() : acceptedName.trim();
          const total = updateData.total || q.total;
          for (const tokenRow of tokens) {
            try {
              await fetch("https://exp.host/--/api/v2/push/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  to: tokenRow.token,
                  title: "Quote Accepted!",
                  body: `${customerName} accepted your quote for $${Number(total).toFixed(2)}`,
                  data: { type: "quote_accepted", quoteId: q.id },
                  sound: "default",
                  badge: 1
                })
              });
            } catch (_pushErr) {
            }
          }
        }
      } catch (_notifErr) {
      }
      try {
        const business = q.businessId ? await db_getBusinessById(q.businessId) : null;
        if (business?.userId) {
          pool.query(
            `SELECT auto_create_job_on_quote_accept FROM jobber_connections WHERE user_id = $1 AND status = 'connected'`,
            [business.userId]
          ).then((jobberResult) => {
            if (jobberResult.rows.length > 0 && jobberResult.rows[0].auto_create_job_on_quote_accept) {
              syncQuoteToJobber(business.userId, q.id, "automatic").catch((err) => {
                console.error("Auto Jobber sync (public accept) failed:", err.message);
              });
            }
          }).catch(() => {
          });
          pool.query(
            `SELECT auto_create_invoice FROM qbo_connections WHERE user_id = $1 AND status = 'connected'`,
            [business.userId]
          ).then((connResult) => {
            if (connResult.rows.length > 0 && connResult.rows[0].auto_create_invoice) {
              createQBOInvoiceForQuote(business.userId, q.id).catch((err) => {
                console.error("Auto QBO invoice (public accept) failed:", err.message);
              });
            }
          }).catch(() => {
          });
        }
      } catch (_syncErr) {
      }
      return res.json({ success: true });
    } catch (error) {
      console.error("Accept quote error:", error);
      return res.status(500).json({ success: false, message: "Failed to accept quote" });
    }
  });
  app2.post("/q/:token/decline", async (req, res) => {
    try {
      const q = await getQuoteByToken(req.params.token);
      if (!q) return res.status(404).json({ success: false, message: "Quote not found" });
      if (q.status === "accepted") {
        return res.status(400).json({ success: false, message: "This quote has already been accepted" });
      }
      await updateQuote(q.id, {
        status: "declined",
        declinedAt: /* @__PURE__ */ new Date()
      });
      await cancelPendingCommunicationsForQuote(q.id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Decline quote error:", error);
      return res.status(500).json({ success: false, message: "Failed to decline quote" });
    }
  });
  app2.post("/q/:token/request-changes", async (req, res) => {
    try {
      const q = await getQuoteByToken(req.params.token);
      if (!q) return res.status(404).json({ success: false, message: "Quote not found" });
      const { message } = req.body;
      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ success: false, message: "Please provide a message" });
      }
      const existingNotes = q.aiNotes || "";
      const changeRequest = `[Change Request ${(/* @__PURE__ */ new Date()).toISOString()}]: ${message.trim()}`;
      const newNotes = existingNotes ? `${existingNotes}
${changeRequest}` : changeRequest;
      await updateQuote(q.id, { aiNotes: newNotes });
      return res.json({ success: true });
    } catch (error) {
      console.error("Request changes error:", error);
      return res.status(500).json({ success: false, message: "Failed to submit change request" });
    }
  });
  app2.post("/q/:token/track", async (req, res) => {
    try {
      const q = await getQuoteByToken(req.params.token);
      if (!q) return res.status(404).json({ ok: false });
      const { event, data } = req.body;
      const existing = q.aiNotes || "";
      const entry = `[Analytics ${(/* @__PURE__ */ new Date()).toISOString()}] ${event}${data ? " " + JSON.stringify(data) : ""}`;
      const notes = existing ? `${existing}
${entry}` : entry;
      await updateQuote(q.id, { aiNotes: notes });
      return res.json({ ok: true });
    } catch (_e) {
      return res.json({ ok: true });
    }
  });
  app2.post("/api/quotes/:id/invoice-packet", requireAuth, async (req, res) => {
    try {
      const quote = await getQuoteById(req.params.id);
      if (!quote || quote.businessId !== req.businessId) return res.status(404).json({ error: "Quote not found" });
      const business = await getBusinessByOwner(req.session.userId);
      const customer = quote.customerId ? await getCustomerById(quote.customerId) : null;
      const lineItems = await getLineItemsByQuote(quote.id);
      const options = quote.options || [];
      const selectedOpt = options.find((o) => o.id === quote.selectedOption) || options[0];
      const customerInfo = {
        displayName: customer ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim() : "Walk-in Customer",
        email: customer?.email || "",
        phone: customer?.phone || "",
        address: customer?.address || "",
        serviceAddress: quote.propertyDetails?.address || customer?.address || ""
      };
      const items = lineItems.length > 0 ? lineItems.map((li) => ({
        name: li.name || li.description || "Service",
        description: li.description || "",
        quantity: li.quantity || 1,
        unitPrice: parseFloat(li.unitPrice || li.price || "0"),
        amount: parseFloat(li.amount || li.total || "0")
      })) : selectedOpt ? [{
        name: selectedOpt.name || "Cleaning Service",
        description: selectedOpt.description || "",
        quantity: 1,
        unitPrice: parseFloat(selectedOpt.price || selectedOpt.total || "0"),
        amount: parseFloat(selectedOpt.price || selectedOpt.total || "0")
      }] : [{
        name: "Cleaning Service",
        description: "",
        quantity: 1,
        unitPrice: parseFloat(String(quote.total || "0")),
        amount: parseFloat(String(quote.total || "0"))
      }];
      const subtotal = parseFloat(String(quote.subtotal || quote.total || "0"));
      const tax = parseFloat(String(quote.tax || "0"));
      const total = parseFloat(String(quote.total || "0"));
      const invoiceNumber = `INV-${quote.id.slice(0, 8).toUpperCase()}`;
      const totals = { subtotal, tax, total };
      const csvHeader = "customer_display_name,customer_email,customer_phone,billing_address_line1,billing_city,billing_state,billing_zip,service_date,item_name,item_description,item_qty,item_rate,item_amount,tax_amount,total_amount,memo";
      const csvRows = items.map((item) => {
        const addr = customerInfo.serviceAddress || customerInfo.address;
        return `"${customerInfo.displayName}","${customerInfo.email}","${customerInfo.phone}","${addr}","","","","","${item.name}","${item.description}",${item.quantity},${item.unitPrice.toFixed(2)},${item.amount.toFixed(2)},${tax.toFixed(2)},${total.toFixed(2)},"${quote.notes || ""}"`;
      });
      const csvText = [csvHeader, ...csvRows].join("\n");
      const plainLines = [
        `INVOICE ${invoiceNumber}`,
        `Date: ${(/* @__PURE__ */ new Date()).toLocaleDateString()}`,
        ``,
        `Bill To: ${customerInfo.displayName}`,
        customerInfo.email ? `Email: ${customerInfo.email}` : "",
        customerInfo.phone ? `Phone: ${customerInfo.phone}` : "",
        customerInfo.address ? `Address: ${customerInfo.address}` : "",
        ``,
        `---`,
        ...items.map((item) => `${item.name} (x${item.quantity}) - $${item.amount.toFixed(2)}`),
        `---`,
        `Subtotal: $${subtotal.toFixed(2)}`,
        tax > 0 ? `Tax: $${tax.toFixed(2)}` : "",
        `Total: $${total.toFixed(2)}`,
        ``,
        quote.notes ? `Notes: ${quote.notes}` : ""
      ].filter(Boolean).join("\n");
      const primaryColor = business?.primaryColor || "#2563EB";
      const pdfHtml = generateInvoicePdfHtml({
        invoiceNumber,
        business,
        customerInfo,
        items,
        totals,
        notes: quote.notes || "",
        primaryColor,
        quoteDate: quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : (/* @__PURE__ */ new Date()).toLocaleDateString()
      });
      const packet = await createInvoicePacket({
        quoteId: quote.id,
        businessId: req.businessId,
        userId: req.session.userId,
        status: "generated",
        lineItemsJson: items,
        customerInfoJson: customerInfo,
        totalsJson: totals,
        invoiceNumber,
        pdfHtml,
        csvText,
        plainText: plainLines
      });
      await dispatchWebhook(req.businessId, req.session.userId, "invoice_packet.created", { invoicePacketId: packet.id, quoteId: quote.id, invoiceNumber });
      res.json({ success: true, packet });
    } catch (e) {
      console.error("Invoice packet error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/invoice-packets/:id", requireAuth, async (req, res) => {
    try {
      const packet = await getInvoicePacketById(req.params.id);
      if (!packet || packet.businessId !== req.businessId) return res.status(404).json({ error: "Not found" });
      res.json(packet);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/quotes/:id/calendar-event", requireAuth, async (req, res) => {
    try {
      const quote = await getQuoteById(req.params.id);
      if (!quote || quote.businessId !== req.businessId) return res.status(404).json({ error: "Quote not found" });
      const customer = quote.customerId ? await getCustomerById(quote.customerId) : null;
      const { startDatetime, durationMinutes = 120 } = req.body;
      if (!startDatetime) return res.status(400).json({ error: "startDatetime required" });
      const start = new Date(startDatetime);
      const end = new Date(start.getTime() + durationMinutes * 60 * 1e3);
      const customerName = customer ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim() : "Customer";
      const title = req.body.title || `Cleaning - ${customerName}`;
      const location = req.body.location || quote.propertyDetails?.address || customer?.address || "";
      const lineItems = await getLineItemsByQuote(quote.id);
      const options = quote.options || [];
      const selectedOpt = options.find((o) => o.id === quote.selectedOption) || options[0];
      const descParts = [
        `Quote #${quote.id.slice(0, 8).toUpperCase()}`,
        `Total: $${parseFloat(String(quote.total || "0")).toFixed(2)}`,
        ``,
        `Customer: ${customerName}`,
        customer?.phone ? `Phone: ${customer.phone}` : "",
        customer?.email ? `Email: ${customer.email}` : "",
        ``
      ];
      if (lineItems.length > 0) {
        descParts.push("Services:");
        lineItems.forEach((li) => descParts.push(`- ${li.name || li.description || "Service"}`));
      } else if (selectedOpt) {
        descParts.push(`Service: ${selectedOpt.name || "Cleaning"}`);
      }
      if (quote.notes) {
        descParts.push("", `Notes: ${quote.notes}`);
      }
      const description = descParts.filter(Boolean).join("\n");
      const stub = await createCalendarEventStub({
        quoteId: quote.id,
        userId: req.session.userId,
        businessId: req.businessId,
        startDatetime: start,
        endDatetime: end,
        location,
        title,
        description
      });
      const icsContent = generateICS({ title, description, location, start, end, id: stub.id });
      const gcalUrl = buildGoogleCalendarUrl({ title, description, location, start, end });
      await dispatchWebhook(req.businessId, req.session.userId, "calendar_stub.created", { calendarEventId: stub.id, quoteId: quote.id });
      res.json({ success: true, stub, icsContent, googleCalendarUrl: gcalUrl });
    } catch (e) {
      console.error("Calendar event error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/calendar-events/quote/:id", requireAuth, async (req, res) => {
    try {
      const stubs = await getCalendarEventStubsByQuoteId(req.params.id);
      res.json(stubs);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/api-keys", requireAuth, async (req, res) => {
    try {
      const rawKey = `qp_${crypto2.randomBytes(32).toString("hex")}`;
      const keyHash = crypto2.createHash("sha256").update(rawKey).digest("hex");
      const keyPrefix = rawKey.slice(-8);
      const label = req.body.label || "API Key";
      const user = await getUserById(req.session.userId);
      if (!user) return res.status(401).json({ error: "User not found" });
      const business = await getBusinessByOwner(user.id);
      if (!business) return res.status(400).json({ error: "Business not found" });
      const apiKey = await createApiKey({
        userId: req.session.userId,
        businessId: business.id,
        keyHash,
        keyPrefix,
        label,
        isActive: true
      });
      res.json({ success: true, rawKey, apiKey });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/api-keys", requireAuth, async (req, res) => {
    try {
      const keys = await getApiKeysByUserId(req.session.userId);
      res.json(keys.map((k) => ({ id: k.id, keyPrefix: k.keyPrefix, label: k.label, isActive: k.isActive, createdAt: k.createdAt })));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/api-keys/:id", requireAuth, async (req, res) => {
    try {
      await deactivateApiKey(req.params.id, req.session.userId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/webhook-endpoints", requireAuth, async (req, res) => {
    try {
      const { url, enabledEvents = [] } = req.body;
      if (!url) return res.status(400).json({ error: "url required" });
      const endpoint = await createWebhookEndpoint({
        userId: req.session.userId,
        businessId: req.businessId,
        url,
        isActive: true,
        enabledEvents
      });
      res.json({ success: true, endpoint });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/webhook-endpoints", requireAuth, async (req, res) => {
    try {
      const endpoints = await getWebhookEndpointsByUserId(req.session.userId);
      res.json(endpoints);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/webhook-endpoints/:id", requireAuth, async (req, res) => {
    try {
      const { url, isActive, enabledEvents } = req.body;
      const updated = await updateWebhookEndpoint(req.params.id, req.session.userId, { url, isActive, enabledEvents });
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json({ success: true, endpoint: updated });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/webhook-endpoints/:id", requireAuth, async (req, res) => {
    try {
      await deleteWebhookEndpoint(req.params.id, req.session.userId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/webhook-endpoints/:id/test", requireAuth, async (req, res) => {
    try {
      const endpoints = await getWebhookEndpointsByUserId(req.session.userId);
      const ep = endpoints.find((e) => e.id === req.params.id);
      if (!ep) return res.status(404).json({ error: "Not found" });
      const testPayload = {
        event_type: "test",
        event_id: crypto2.randomUUID(),
        occurred_at: (/* @__PURE__ */ new Date()).toISOString(),
        account_id: req.businessId,
        data: { message: "This is a test webhook from QuotePro" }
      };
      const keys = await getApiKeysByUserId(req.session.userId);
      const activeKey = keys[0];
      const body = JSON.stringify(testPayload);
      const signature = activeKey ? crypto2.createHmac("sha256", activeKey.keyHash).update(body).digest("hex") : "no-api-key";
      try {
        const response = await fetch(ep.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-QP-Signature": signature },
          body,
          signal: AbortSignal.timeout(1e4)
        });
        res.json({ success: true, statusCode: response.status, statusText: response.statusText });
      } catch (fetchErr) {
        res.json({ success: false, error: fetchErr.message });
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/webhook-events", requireAuth, async (req, res) => {
    try {
      const events = await getWebhookEventsByUserId(req.session.userId);
      const eventsWithStatus = await Promise.all(
        events.map(async (evt) => {
          const deliveries = await getWebhookDeliveriesByEventId(evt.id);
          const allDelivered = deliveries.length > 0 && deliveries.every((d) => d.deliveredAt);
          const anyRetrying = deliveries.some((d) => d.nextRetryAt && !d.deliveredAt);
          const status = allDelivered ? "delivered" : anyRetrying ? "retrying" : deliveries.length > 0 ? "failed" : "pending";
          return { ...evt, deliveryStatus: status, deliveryCount: deliveries.length };
        })
      );
      res.json(eventsWithStatus);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/webhook-events/:id", requireAuth, async (req, res) => {
    try {
      const evt = await getWebhookEventById(req.params.id);
      if (!evt || evt.userId !== req.session.userId) return res.status(404).json({ error: "Not found" });
      const deliveries = await getWebhookDeliveriesByEventId(evt.id);
      res.json({ ...evt, deliveries });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/reminder-templates/:quoteId", requireAuth, async (req, res) => {
    try {
      const quote = await getQuoteById(req.params.quoteId);
      if (!quote || quote.businessId !== req.businessId) return res.status(404).json({ error: "Quote not found" });
      const customer = quote.customerId ? await getCustomerById(quote.customerId) : null;
      const customerName = customer ? customer.firstName || "there" : "there";
      const business = await getBusinessByOwner(req.session.userId);
      const bName = business?.companyName || "us";
      const templates = [
        {
          id: "confirmation",
          label: "Confirmation",
          message: `Hi ${customerName}! This is ${bName} confirming your cleaning appointment. We look forward to seeing you! Please let us know if you have any questions.`
        },
        {
          id: "reminder_24h",
          label: "24-Hour Reminder",
          message: `Hi ${customerName}! Just a friendly reminder that your cleaning with ${bName} is scheduled for tomorrow. Please make sure the space is accessible. See you soon!`
        },
        {
          id: "on_my_way",
          label: "On My Way",
          message: `Hi ${customerName}! This is ${bName} - I'm on my way to your location now. I should arrive shortly. See you soon!`
        }
      ];
      res.json(templates);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/integrations/qbo/status", requireAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT status, company_name as "companyName", realm_id as "realmId", environment,
                last_error as "lastError", auto_create_invoice as "autoCreateInvoice"
         FROM qbo_connections WHERE user_id = $1`,
        [req.session.userId]
      );
      if (result.rows.length === 0) {
        return res.json({ status: "not_connected", companyName: null, realmId: null, environment: "production", lastError: null, autoCreateInvoice: false });
      }
      res.json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/integrations/qbo/connect", requireAuth, async (req, res) => {
    try {
      const clientId = process.env.INTUIT_CLIENT_ID;
      if (!clientId) return res.status(500).json({ error: "QuickBooks integration not configured" });
      const host = req.get("host") || process.env.REPLIT_DEV_DOMAIN || "";
      const protocol = host.includes("localhost") ? "http" : "https";
      const redirectUri = `${protocol}://${host}/api/integrations/qbo/callback`;
      const state = crypto2.randomBytes(32).toString("hex");
      await pool.query(
        `INSERT INTO oauth_states (state, user_id, provider, created_at)
         VALUES ($1, $2, 'qbo', NOW())`,
        [state, req.session.userId]
      );
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "com.intuit.quickbooks.accounting",
        state
      });
      const url = `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
      res.json({ url });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/integrations/qbo/callback", async (req, res) => {
    try {
      const { code, state, realmId } = req.query;
      if (!code || !state || !realmId) {
        return res.status(400).send("Missing required OAuth parameters");
      }
      const stateResult = await pool.query(
        `DELETE FROM oauth_states WHERE state = $1 AND provider = 'qbo'
         AND created_at > NOW() - INTERVAL '10 minutes' RETURNING user_id`,
        [state]
      );
      if (stateResult.rows.length === 0) {
        return res.status(403).send("Invalid or expired OAuth state. Please try connecting again.");
      }
      const userId = stateResult.rows[0].user_id;
      const clientId = process.env.INTUIT_CLIENT_ID;
      const clientSecret = process.env.INTUIT_CLIENT_SECRET;
      if (!clientId || !clientSecret) return res.status(500).send("QuickBooks not configured");
      const host = req.get("host") || process.env.REPLIT_DEV_DOMAIN || "";
      const protocol = host.includes("localhost") ? "http" : "https";
      const redirectUri = `${protocol}://${host}/api/integrations/qbo/callback`;
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const tokenResponse = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": `Basic ${basicAuth}`,
          "Accept": "application/json"
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri
        }).toString()
      });
      if (!tokenResponse.ok) {
        const errBody = await tokenResponse.text();
        console.error("QBO token exchange failed:", tokenResponse.status, errBody);
        await logSync(userId, null, "connect", {}, { error: errBody }, "failed", "Token exchange failed");
        return res.status(400).send("Failed to exchange authorization code");
      }
      const tokens = await tokenResponse.json();
      const accessToken = tokens.access_token;
      const refreshToken = tokens.refresh_token;
      const expiresIn = tokens.expires_in || 3600;
      const expiresAt = new Date(Date.now() + expiresIn * 1e3);
      let companyName = null;
      try {
        const infoRes = await fetch(
          `https://quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`,
          { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } }
        );
        if (infoRes.ok) {
          const infoData = await infoRes.json();
          companyName = infoData?.CompanyInfo?.CompanyName || null;
        }
      } catch {
      }
      await pool.query(
        `INSERT INTO qbo_connections (id, user_id, realm_id, access_token_encrypted, refresh_token_encrypted,
           access_token_expires_at, connected_at, scopes, environment, status, company_name)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), $6, 'production', 'connected', $7)
         ON CONFLICT (user_id) DO UPDATE SET
           realm_id = $2, access_token_encrypted = $3, refresh_token_encrypted = $4,
           access_token_expires_at = $5, connected_at = NOW(), scopes = $6,
           status = 'connected', company_name = $7, last_error = NULL, disconnected_at = NULL`,
        [userId, realmId, encryptToken(accessToken), encryptToken(refreshToken), expiresAt, "com.intuit.quickbooks.accounting", companyName]
      );
      await logSync(userId, null, "connect", { realmId }, { companyName, success: true }, "ok");
      res.send(`<!DOCTYPE html><html><head><title>QuickBooks Connected</title><style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8f9fa;margin:0}.card{text-align:center;padding:40px;border-radius:16px;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,0.1);max-width:400px}h1{color:#16a34a;margin-bottom:8px}p{color:#64748b}</style></head><body><div class="card"><h1>Connected!</h1><p>QuickBooks is now connected${companyName ? ` to ${companyName}` : ""}. You can close this window and return to QuotePro.</p></div></body></html>`);
    } catch (e) {
      console.error("QBO callback error:", e);
      res.status(500).send("An error occurred during QuickBooks connection");
    }
  });
  app2.post("/api/integrations/qbo/disconnect", requireAuth, async (req, res) => {
    try {
      await pool.query(
        `UPDATE qbo_connections SET status = 'disconnected', disconnected_at = NOW(),
                access_token_encrypted = NULL, refresh_token_encrypted = NULL
         WHERE user_id = $1`,
        [req.session.userId]
      );
      await logSync(req.session.userId, null, "disconnect", {}, { success: true }, "ok");
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/integrations/qbo/test", requireAuth, async (req, res) => {
    try {
      const client = new QBOClient(req.session.userId);
      const conn = await client.loadConnection();
      if (!conn) return res.status(404).json({ error: "No QuickBooks connection found" });
      const info = await client.getCompanyInfo();
      await logSync(req.session.userId, null, "test_connection", {}, { companyName: info.CompanyName }, "ok");
      res.json({ success: true, companyName: info.CompanyName });
    } catch (e) {
      await logSync(req.session.userId, null, "test_connection", {}, { error: e.message }, "failed", e.message);
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/integrations/qbo/create-invoice", requireAuth, async (req, res) => {
    try {
      const { quoteId } = req.body;
      if (!quoteId) return res.status(400).json({ error: "quoteId is required" });
      const result = await createQBOInvoiceForQuote(req.session.userId, quoteId);
      if (!result) return res.status(400).json({ error: "QuickBooks not connected or quote not found" });
      res.json(result);
    } catch (e) {
      await logSync(req.session.userId, req.body?.quoteId || null, "create_invoice", { quoteId: req.body?.quoteId }, { error: e.message }, "failed", e.message);
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/integrations/qbo/logs", requireAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, user_id as "userId", quote_id as "quoteId", action,
                request_summary as "requestSummary", response_summary as "responseSummary",
                status, error_message as "errorMessage", created_at as "createdAt"
         FROM qbo_sync_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [req.session.userId]
      );
      res.json(result.rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/integrations/qbo/settings", requireAuth, async (req, res) => {
    try {
      const { autoCreateInvoice } = req.body;
      await pool.query(
        `UPDATE qbo_connections SET auto_create_invoice = $1 WHERE user_id = $2`,
        [!!autoCreateInvoice, req.session.userId]
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/integrations/qbo/invoice-link/:quoteId", requireAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT qbo_invoice_id as "qboInvoiceId", qbo_doc_number as "qboDocNumber", created_at as "createdAt"
         FROM qbo_invoice_links WHERE user_id = $1 AND quote_id = $2`,
        [req.session.userId, req.params.quoteId]
      );
      if (result.rows.length === 0) return res.json(null);
      res.json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/integrations/jobber/connect", requireAuth, requirePro, async (req, res) => {
    try {
      const clientId = process.env.JOBBER_CLIENT_ID;
      const clientSecret = process.env.JOBBER_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        console.error("Jobber connect: missing credentials", { hasClientId: !!clientId, hasClientSecret: !!clientSecret });
        return res.status(500).json({ error: "Jobber integration not configured" });
      }
      const host = req.get("host") || process.env.REPLIT_DEV_DOMAIN || "";
      const protocol = host.includes("localhost") ? "http" : "https";
      const redirectUri = `${protocol}://${host}/api/integrations/jobber/callback`;
      const state = crypto2.randomBytes(32).toString("hex");
      await pool.query(
        `INSERT INTO oauth_states (state, user_id, provider, created_at)
         VALUES ($1, $2, 'jobber', NOW())`,
        [state, req.session.userId]
      );
      const url = buildJobberAuthUrl(redirectUri, state);
      res.json({ url });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/integrations/jobber/callback", async (req, res) => {
    let resolvedUserId = null;
    try {
      const { code, state } = req.query;
      if (!code || !state) {
        return res.status(400).send("Missing required OAuth parameters");
      }
      const stateResult = await pool.query(
        `DELETE FROM oauth_states WHERE state = $1 AND provider = 'jobber'
         AND created_at > NOW() - INTERVAL '10 minutes' RETURNING user_id`,
        [state]
      );
      if (stateResult.rows.length === 0) {
        return res.status(403).send("Invalid or expired OAuth state. Please try connecting again.");
      }
      resolvedUserId = stateResult.rows[0].user_id;
      const host = req.get("host") || process.env.REPLIT_DEV_DOMAIN || "";
      const protocol = host.includes("localhost") ? "http" : "https";
      const redirectUri = `${protocol}://${host}/api/integrations/jobber/callback`;
      const tokens = await exchangeJobberCode(code, redirectUri);
      const expiresAt = new Date(Date.now() + tokens.expiresIn * 1e3);
      await pool.query(
        `INSERT INTO jobber_connections (id, user_id, access_token_encrypted, refresh_token_encrypted,
           access_token_expires_at, connected_at, scopes, status)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), $5, 'connected')
         ON CONFLICT (user_id) DO UPDATE SET
           access_token_encrypted = $2, refresh_token_encrypted = $3,
           access_token_expires_at = $4, connected_at = NOW(), scopes = $5,
           status = 'connected', last_error = NULL, disconnected_at = NULL`,
        [resolvedUserId, encryptToken(tokens.accessToken), encryptToken(tokens.refreshToken), expiresAt, "read:clients,write:clients,read:jobs,write:jobs"]
      );
      await logJobberSync(resolvedUserId, null, "connect", {}, { success: true }, "ok");
      res.send(`<!DOCTYPE html><html><head><title>Jobber Connected</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f0fdf4}
.card{text-align:center;padding:40px;border-radius:16px;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,0.1);max-width:360px}
.icon{width:56px;height:56px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
h2{color:#16a34a;margin:0 0 8px;font-size:20px}p{color:#64748b;margin:0;font-size:14px}</style></head>
<body><div class="card"><div class="icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
<h2>Jobber Connected!</h2><p>You can close this window.</p></div>
<script>if(window.opener){window.opener.postMessage('jobber_connected','*');}setTimeout(()=>{window.close();},1500);</script>
</body></html>`);
    } catch (e) {
      console.error("Jobber callback error:", e);
      if (resolvedUserId) {
        try {
          await logJobberSync(resolvedUserId, null, "connect", {}, { error: e.message }, "failed", e.message);
        } catch (logErr) {
          console.error("Failed to log Jobber sync:", logErr);
        }
      }
      res.status(500).send("An error occurred during Jobber connection");
    }
  });
  app2.get("/api/integrations/jobber/status", requireAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, status, connected_at as "connectedAt", scopes,
                auto_create_job_on_quote_accept as "autoCreateJobOnQuoteAccept",
                last_error as "lastError"
         FROM jobber_connections WHERE user_id = $1`,
        [req.session.userId]
      );
      if (result.rows.length === 0) {
        return res.json({ connected: false });
      }
      const conn = result.rows[0];
      res.json({
        connected: conn.status === "connected",
        status: conn.status,
        connectedAt: conn.connectedAt,
        autoCreateJobOnQuoteAccept: conn.autoCreateJobOnQuoteAccept,
        lastError: conn.lastError
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/integrations/jobber/disconnect", requireAuth, requirePro, async (req, res) => {
    try {
      const jobberClient = new JobberClient(req.session.userId);
      const conn = await jobberClient.loadConnection();
      if (conn) {
        await jobberClient.ensureValidToken().catch(() => {
        });
        await jobberClient.disconnectApp();
      }
      await pool.query(
        `UPDATE jobber_connections SET status = 'disconnected', disconnected_at = NOW(),
                access_token_encrypted = NULL, refresh_token_encrypted = NULL
         WHERE user_id = $1`,
        [req.session.userId]
      );
      await logJobberSync(req.session.userId, null, "disconnect", {}, { success: true }, "ok");
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/integrations/jobber/settings", requireAuth, requirePro, async (req, res) => {
    try {
      const { autoCreateJobOnQuoteAccept } = req.body;
      await pool.query(
        `UPDATE jobber_connections SET auto_create_job_on_quote_accept = $1 WHERE user_id = $2`,
        [!!autoCreateJobOnQuoteAccept, req.session.userId]
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/integrations/jobber/sync-quote/:quoteId", requireAuth, requirePro, async (req, res) => {
    try {
      const { quoteId } = req.params;
      const force = req.body?.force === true;
      const result = await syncQuoteToJobber(req.session.userId, quoteId, "manual", force);
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  app2.get("/api/integrations/jobber/sync-status/:quoteId", requireAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT jobber_client_id as "jobberClientId", jobber_job_id as "jobberJobId",
                jobber_job_number as "jobberJobNumber", sync_status as "syncStatus",
                sync_trigger as "syncTrigger", error_message as "errorMessage",
                created_at as "createdAt"
         FROM jobber_job_links WHERE user_id = $1 AND quote_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [req.session.userId, req.params.quoteId]
      );
      if (result.rows.length === 0) return res.json(null);
      res.json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/integrations/jobber/logs", requireAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, user_id as "userId", quote_id as "quoteId", action,
                request_summary as "requestSummary", response_summary as "responseSummary",
                status, error_message as "errorMessage", created_at as "createdAt"
         FROM jobber_sync_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [req.session.userId]
      );
      res.json(result.rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/integrations/jobber/test", requireAuth, async (req, res) => {
    try {
      const client = new JobberClient(req.session.userId);
      const conn = await client.loadConnection();
      if (!conn) return res.status(404).json({ error: "No Jobber connection found" });
      await client.ensureValidToken();
      await logJobberSync(req.session.userId, null, "test_connection", {}, { success: true }, "ok");
      res.json({ success: true });
    } catch (e) {
      await logJobberSync(req.session.userId, null, "test_connection", {}, { error: e.message }, "failed", e.message);
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/integrations/jobber/introspect-property-input", requireAuth, async (req, res) => {
    try {
      const client = new JobberClient(req.session.userId);
      const conn = await client.loadConnection();
      if (!conn) return res.status(404).json({ error: "No connection" });
      await client.ensureValidToken();
      const data = await client.graphql(`
        {
          propertyInput: __type(name: "PropertyCreateInput") {
            name kind inputFields { name type { name kind ofType { name kind ofType { name kind } } } }
          }
          propertyPayload: __type(name: "PropertyCreatePayload") {
            name kind fields { name type { name kind ofType { name kind } } }
          }
          propertyMutation: __schema {
            mutationType {
              fields(includeDeprecated: true) {
                name
                args { name type { name kind ofType { name kind ofType { name kind } } } }
              }
            }
          }
        }
      `);
      const propMutation = data?.propertyMutation?.mutationType?.fields?.find((f) => f.name === "propertyCreate");
      res.json({
        PropertyCreateInput: data.propertyInput,
        PropertyCreatePayload: data.propertyPayload,
        propertyCreateArgs: propMutation?.args || []
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/integrations/jobber/introspect-mutations", requireAuth, async (req, res) => {
    try {
      const client = new JobberClient(req.session.userId);
      const conn = await client.loadConnection();
      if (!conn) return res.status(404).json({ error: "No connection" });
      await client.ensureValidToken();
      const data = await client.graphql(`
        { __schema { mutationType { fields { name args { name type { name kind ofType { name kind } } } } } } }
      `);
      const fields = data.__schema?.mutationType?.fields || [];
      const jobFields = fields.filter(
        (f) => f.name.toLowerCase().includes("job") || f.name.toLowerCase().includes("request") || f.name.toLowerCase().includes("work")
      );
      res.json({ jobMutations: jobFields, allCount: fields.length });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/integrations/jobber/dashboard-stats", requireAuth, async (req, res) => {
    try {
      const connResult = await pool.query(
        `SELECT status, connected_at as "connectedAt", auto_create_job_on_quote_accept as "autoSync"
         FROM jobber_connections WHERE user_id = $1`,
        [req.session.userId]
      );
      const conn = connResult.rows[0];
      if (!conn || conn.status === "disconnected") {
        return res.json({ connected: false });
      }
      const statsResult = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE sync_status = 'success') as "jobsCreated",
           COUNT(*) as "totalSyncs",
           COUNT(*) FILTER (WHERE sync_status = 'failed') as "failedSyncs"
         FROM jobber_job_links WHERE user_id = $1`,
        [req.session.userId]
      );
      const s = statsResult.rows[0];
      res.json({
        connected: true,
        connectedAt: conn.connectedAt,
        autoSyncEnabled: conn.autoSync,
        jobsCreated: parseInt(s.jobsCreated) || 0,
        totalSyncs: parseInt(s.totalSyncs) || 0,
        failedSyncs: parseInt(s.failedSyncs) || 0
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/integrations/jobber/clients", requireAuth, requirePro, async (req, res) => {
    try {
      const client = new JobberClient(req.session.userId);
      const conn = await client.loadConnection();
      if (!conn) return res.status(404).json({ error: "No Jobber connection found" });
      const cursor = req.query.cursor;
      const limit = Math.min(parseInt(req.query.limit) || 25, 50);
      const query = `
        query FetchClients($first: Int!, $after: String) {
          clients(first: $first, after: $after) {
            nodes {
              id
              firstName
              lastName
              companyName
              isCompany
              emails { address description primary }
              phones { number description primary }
              billingAddress { street1 street2 city province postalCode country }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
            totalCount
          }
        }
      `;
      const variables = { first: limit };
      if (cursor) variables.after = cursor;
      const data = await client.graphql(query, variables);
      const clients = data.clients;
      const existingMappings = await pool.query(
        `SELECT jobber_client_id as "jobberClientId" FROM jobber_client_mappings WHERE user_id = $1`,
        [req.session.userId]
      );
      const importedIds = new Set(existingMappings.rows.map((r) => r.jobberClientId));
      const mapped = clients.nodes.map((c) => {
        const primaryEmail = c.emails?.find((e) => e.primary)?.address || c.emails?.[0]?.address || null;
        const primaryPhone = c.phones?.find((p) => p.primary)?.number || c.phones?.[0]?.number || null;
        const addr = c.billingAddress;
        const address = addr ? [addr.street1, addr.street2, addr.city, addr.province, addr.postalCode].filter(Boolean).join(", ") : null;
        return {
          jobberId: c.id,
          firstName: c.firstName || "",
          lastName: c.lastName || "",
          companyName: c.companyName || null,
          email: primaryEmail,
          phone: primaryPhone,
          address,
          alreadyImported: importedIds.has(c.id)
        };
      });
      res.json({
        clients: mapped,
        hasNextPage: clients.pageInfo.hasNextPage,
        endCursor: clients.pageInfo.endCursor,
        totalCount: clients.totalCount
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/integrations/jobber/import-clients", requireAuth, requirePro, async (req, res) => {
    try {
      const { clientIds } = req.body;
      if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
        return res.status(400).json({ error: "clientIds array required" });
      }
      if (clientIds.length > 100) {
        return res.status(400).json({ error: "Maximum 100 clients per import" });
      }
      const client = new JobberClient(req.session.userId);
      const conn = await client.loadConnection();
      if (!conn) return res.status(404).json({ error: "No Jobber connection found" });
      const businessResult = await pool.query(
        `SELECT id FROM businesses WHERE user_id = $1`,
        [req.session.userId]
      );
      if (businessResult.rows.length === 0) {
        return res.status(400).json({ error: "Business not found" });
      }
      const businessId = businessResult.rows[0].id;
      const query = `
        query FetchClientsById($ids: [EncodedId!]!) {
          clients(filter: { ids: $ids }, first: 100) {
            nodes {
              id
              firstName
              lastName
              companyName
              isCompany
              emails { address description primary }
              phones { number description primary }
              billingAddress { street1 street2 city province postalCode country }
            }
          }
        }
      `;
      const data = await client.graphql(query, { ids: clientIds });
      const jobberClients = data.clients.nodes;
      let imported = 0;
      let skipped = 0;
      let failed = 0;
      const results = [];
      for (const jc of jobberClients) {
        try {
          const firstName = jc.firstName || "";
          const lastName = jc.lastName || jc.companyName || "Unknown";
          const email = jc.emails?.find((e) => e.primary)?.address || jc.emails?.[0]?.address || null;
          const phone = jc.phones?.find((p) => p.primary)?.number || jc.phones?.[0]?.number || null;
          const addr = jc.billingAddress;
          const existingMapping = await pool.query(
            `SELECT qp_customer_id FROM jobber_client_mappings WHERE user_id = $1 AND jobber_client_id = $2`,
            [req.session.userId, jc.id]
          );
          if (existingMapping.rows.length > 0) {
            skipped++;
            results.push({ jobberId: jc.id, name: `${firstName} ${lastName}`, status: "skipped", reason: "Already imported" });
            continue;
          }
          if (email) {
            const emailMatch = await pool.query(
              `SELECT id FROM customers WHERE business_id = $1 AND LOWER(email) = LOWER($2)`,
              [businessId, email]
            );
            if (emailMatch.rows.length > 0) {
              await pool.query(
                `INSERT INTO jobber_client_mappings (id, user_id, qp_customer_id, jobber_client_id, created_at)
                 VALUES (gen_random_uuid(), $1, $2, $3, NOW())
                 ON CONFLICT (user_id, qp_customer_id) DO NOTHING`,
                [req.session.userId, emailMatch.rows[0].id, jc.id]
              );
              skipped++;
              results.push({ jobberId: jc.id, name: `${firstName} ${lastName}`, status: "skipped", reason: "Email match found" });
              continue;
            }
          }
          if (phone) {
            const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
            if (normalizedPhone.length >= 10) {
              const phoneMatch = await pool.query(
                `SELECT id FROM customers WHERE business_id = $1 AND REPLACE(REPLACE(REPLACE(REPLACE(phone, '-', ''), '(', ''), ')', ''), ' ', '') LIKE $2`,
                [businessId, `%${normalizedPhone}`]
              );
              if (phoneMatch.rows.length > 0) {
                await pool.query(
                  `INSERT INTO jobber_client_mappings (id, user_id, qp_customer_id, jobber_client_id, created_at)
                   VALUES (gen_random_uuid(), $1, $2, $3, NOW())
                   ON CONFLICT (user_id, qp_customer_id) DO NOTHING`,
                  [req.session.userId, phoneMatch.rows[0].id, jc.id]
                );
                skipped++;
                results.push({ jobberId: jc.id, name: `${firstName} ${lastName}`, status: "skipped", reason: "Phone match found" });
                continue;
              }
            }
          }
          const address = addr ? addr.street1 || "" : "";
          const city = addr?.city || "";
          const state = addr?.province || "";
          const zip = addr?.postalCode || "";
          const insertResult = await pool.query(
            `INSERT INTO customers (id, business_id, first_name, last_name, email, phone, address, city, state, zip, company, status, lead_source, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'lead', 'jobber_import', NOW(), NOW())
             RETURNING id`,
            [businessId, firstName, lastName, email, phone, address, city, state, zip, jc.companyName || null]
          );
          await pool.query(
            `INSERT INTO jobber_client_mappings (id, user_id, qp_customer_id, jobber_client_id, created_at)
             VALUES (gen_random_uuid(), $1, $2, $3, NOW())
             ON CONFLICT (user_id, qp_customer_id) DO NOTHING`,
            [req.session.userId, insertResult.rows[0].id, jc.id]
          );
          imported++;
          results.push({ jobberId: jc.id, name: `${firstName} ${lastName}`, status: "imported" });
        } catch (err) {
          failed++;
          results.push({ jobberId: jc.id, name: `${jc.firstName || ""} ${jc.lastName || ""}`, status: "failed", reason: err.message });
        }
      }
      await logJobberSync(
        req.session.userId,
        null,
        "import_clients",
        { clientCount: clientIds.length },
        { imported, skipped, failed },
        failed === clientIds.length ? "failed" : "ok"
      );
      res.json({ imported, skipped, failed, results });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS intake_requests (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          business_id VARCHAR NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          customer_name TEXT NOT NULL DEFAULT '',
          customer_email TEXT NOT NULL DEFAULT '',
          customer_phone TEXT NOT NULL DEFAULT '',
          raw_text TEXT,
          extracted_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
          status TEXT NOT NULL DEFAULT 'pending',
          converted_quote_id VARCHAR REFERENCES quotes(id),
          source TEXT NOT NULL DEFAULT 'intake_form',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
    } catch (e) {
      console.error("intake_requests migration error:", e);
    }
  })();
  (async () => {
    try {
      await pool.query(`ALTER TABLE intake_requests ADD COLUMN IF NOT EXISTS confidence TEXT DEFAULT 'low'`);
      await pool.query(`ALTER TABLE intake_requests ADD COLUMN IF NOT EXISTS review_notes TEXT`);
      await pool.query(`ALTER TABLE intake_requests ADD COLUMN IF NOT EXISTS missing_field_flags JSONB DEFAULT '[]'::jsonb`);
      await pool.query(`ALTER TABLE intake_requests ADD COLUMN IF NOT EXISTS follow_up_sent BOOLEAN NOT NULL DEFAULT FALSE`);
      await pool.query(`ALTER TABLE intake_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP`);
      await pool.query(`ALTER TABLE intake_requests ADD COLUMN IF NOT EXISTS customer_address TEXT NOT NULL DEFAULT ''`);
    } catch (e) {
      console.error("intake_requests migration v2 error:", e);
    }
  })();
  (async () => {
    try {
      await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS intake_code VARCHAR(12) UNIQUE`);
    } catch (e) {
      console.error("businesses intake_code migration error:", e);
    }
  })();
  (async () => {
    try {
      await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS intake_short_url TEXT`);
    } catch (e) {
      console.error("businesses intake_short_url migration error:", e);
    }
  })();
  (async () => {
    try {
      await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS public_quote_slug VARCHAR(80) UNIQUE`);
      await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS public_quote_enabled BOOLEAN NOT NULL DEFAULT TRUE`);
      await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS public_quote_button_text TEXT NOT NULL DEFAULT 'Get a Free Quote'`);
      const bizRows = await pool.query(`SELECT id, company_name FROM businesses WHERE public_quote_slug IS NULL AND company_name != '' AND company_name IS NOT NULL`);
      for (const b of bizRows.rows) {
        await ensurePublicSlug(b.id, b.company_name);
      }
    } catch (e) {
      console.error("businesses public_quote migration error:", e);
    }
  })();
  function generateIntakeCode(len = 8) {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let code = "";
    for (let i = 0; i < len; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }
  async function ensureIntakeCode(businessId) {
    const existing = await pool.query(`SELECT intake_code FROM businesses WHERE id = $1`, [businessId]);
    if (existing.rows[0]?.intake_code) return existing.rows[0].intake_code;
    let code = generateIntakeCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await pool.query(`UPDATE businesses SET intake_code = $1 WHERE id = $2`, [code, businessId]);
        return code;
      } catch {
        code = generateIntakeCode();
      }
    }
    return code;
  }
  async function getOrCreateShortUrl(businessId, longUrl) {
    try {
      const cached = await pool.query(`SELECT intake_short_url FROM businesses WHERE id = $1`, [businessId]);
      if (cached.rows[0]?.intake_short_url) return cached.rows[0].intake_short_url;
      const resp = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
      if (!resp.ok) return longUrl;
      const shortUrl = (await resp.text()).trim();
      if (shortUrl.startsWith("http")) {
        await pool.query(`UPDATE businesses SET intake_short_url = $1 WHERE id = $2`, [shortUrl, businessId]);
        return shortUrl;
      }
    } catch {
    }
    return longUrl;
  }
  function slugify(text2) {
    return text2.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").substring(0, 60);
  }
  async function ensurePublicSlug(businessId, companyName) {
    const existing = await pool.query(`SELECT public_quote_slug FROM businesses WHERE id = $1`, [businessId]);
    if (existing.rows[0]?.public_quote_slug) return existing.rows[0].public_quote_slug;
    let base = slugify(companyName) || "my-cleaning-co";
    let slug = base;
    for (let i = 2; i <= 20; i++) {
      try {
        await pool.query(`UPDATE businesses SET public_quote_slug = $1 WHERE id = $2`, [slug, businessId]);
        return slug;
      } catch {
        slug = `${base}-${i}`;
      }
    }
    return slug;
  }
  async function lookupIntakeBusiness(codeOrId) {
    const r = await pool.query(
      `SELECT id, owner_user_id, company_name, logo_uri, primary_color, phone, email, intake_code FROM businesses WHERE intake_code = $1 OR id = $1 OR public_quote_slug = $1 LIMIT 1`,
      [codeOrId]
    );
    if (!r.rows.length) return null;
    const row = r.rows[0];
    return {
      id: row.id,
      ownerUserId: row.owner_user_id,
      companyName: row.company_name,
      logoUri: row.logo_uri,
      primaryColor: row.primary_color,
      phone: row.phone,
      email: row.email,
      intakeCode: row.intake_code
    };
  }
  app2.get("/api/public/intake-business/:businessId", async (req, res) => {
    try {
      const biz = await lookupIntakeBusiness(req.params.businessId);
      if (!biz) return res.status(404).json({ message: "Business not found" });
      res.json({
        id: biz.id,
        companyName: biz.companyName,
        logoUri: biz.logoUri,
        primaryColor: biz.primaryColor || "#2563EB",
        phone: biz.phone,
        email: biz.email
      });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
  app2.post("/api/public/intake/:businessId/extract", async (req, res) => {
    const { text: text2 } = req.body;
    if (!text2?.trim()) return res.status(400).json({ message: "text is required" });
    try {
      const biz = await lookupIntakeBusiness(req.params.businessId);
      if (!biz) return res.status(404).json({ message: "Business not found" });
      const owner = await getUserById(biz.ownerUserId);
      if (!owner || !isGrowthOrAbove(owner.subscriptionTier)) {
        return res.status(403).json({ message: "This feature requires a Growth or Pro subscription", requiresUpgrade: true });
      }
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a cleaning quote intake assistant. Extract structured fields from a customer's description of their cleaning job.

EXTRACTION RULES:
- Only extract what is explicitly mentioned or strongly implied. Never invent data.
- If the customer mentions "cleaning" or "clean my house" without specifying type \u2192 serviceType="standard_cleaning"
- If they mention "deep clean", "thorough", "first time", "catching up" \u2192 "deep_clean"
- If they mention "move" or "moving" \u2192 "move_in_out"
- If they mention "construction", "remodel", "build" \u2192 "post_construction"
- If they mention "airbnb", "rental", "guests", "turnover" \u2192 "airbnb"
- If they say "every week" or "weekly" \u2192 frequency="weekly"; "every 2 weeks", "biweekly", "twice a month" \u2192 "biweekly"; "monthly" \u2192 "monthly"
- For pets: "dog", "puppy", "pup" \u2192 petType="dog"; "cat", "kitten" \u2192 "cat"; multiple animals \u2192 "multiple"
- For sqft: if not mentioned, try to infer from beds/baths using typical averages, but set confidence to "medium" or "low" if inferred
- missingFields: list human-readable names of critical missing fields (e.g. "number of bedrooms", "square footage", "service type")
- confidence: "high" if beds, baths, serviceType, and frequency are all known; "medium" if 2-3 are known; "low" if fewer than 2 are known
- clarificationQuestions: up to 2 specific questions to ask the customer to fill in critical gaps

Return ONLY valid JSON:
{
  "serviceType": "standard_cleaning" | "deep_clean" | "move_in_out" | "recurring" | "airbnb" | "post_construction" | null,
  "beds": number | null,
  "baths": number | null,
  "sqft": number | null,
  "frequency": "one-time" | "weekly" | "biweekly" | "monthly" | null,
  "pets": boolean | null,
  "petType": "none" | "cat" | "dog" | "multiple" | null,
  "address": string | null,
  "addOns": {
    "insideFridge": boolean,
    "insideOven": boolean,
    "insideCabinets": boolean,
    "interiorWindows": boolean,
    "blindsDetail": boolean,
    "baseboardsDetail": boolean,
    "laundryFoldOnly": boolean,
    "dishes": boolean,
    "organizationTidy": boolean
  },
  "notes": string | null,
  "confidence": "high" | "medium" | "low",
  "missingFields": string[],
  "clarificationQuestions": string[]
}`
          },
          { role: "user", content: text2 }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });
      const extracted = JSON.parse(completion.choices[0].message.content || "{}");
      res.json({ extracted });
    } catch (e) {
      console.error("Intake extract error:", e);
      res.status(500).json({ message: "Extraction failed" });
    }
  });
  app2.post("/api/public/intake/:businessId", async (req, res) => {
    const { businessId } = req.params;
    const { customerName, customerEmail, customerPhone, customerAddress, rawText, extractedFields, source } = req.body;
    if (!customerName?.trim()) return res.status(400).json({ message: "Customer name is required" });
    if (!customerEmail?.trim() && !customerPhone?.trim()) return res.status(400).json({ message: "At least one contact method is required" });
    try {
      const biz = await lookupIntakeBusiness(businessId);
      if (!biz) return res.status(404).json({ message: "Business not found" });
      const ef = extractedFields || {};
      const confidence = ef.confidence || "low";
      const missingFieldFlags = ef.missingFields || ef.missingFieldFlags || [];
      const needsReview = confidence === "low" || missingFieldFlags.length >= 3;
      const status = needsReview ? "needs_review" : "pending";
      const result = await pool.query(
        `INSERT INTO intake_requests (business_id, customer_name, customer_email, customer_phone, customer_address, raw_text, extracted_fields, source, status, confidence, missing_field_flags)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [
          biz.id,
          (customerName || "").trim(),
          (customerEmail || "").trim(),
          (customerPhone || "").trim(),
          (customerAddress || "").trim(),
          rawText || null,
          JSON.stringify(ef),
          source || "intake_form",
          status,
          confidence,
          JSON.stringify(missingFieldFlags)
        ]
      );
      res.status(201).json({ id: result.rows[0].id, message: "Request submitted successfully", status });
    } catch (e) {
      console.error("Intake submit error:", e);
      res.status(500).json({ message: e.message });
    }
  });
  app2.get("/api/intake-requests", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const filter = req.query.filter || "new";
      let whereStatus;
      if (filter === "review") whereStatus = `status='needs_review'`;
      else if (filter === "done") whereStatus = `status IN ('converted','dismissed')`;
      else if (filter === "all") whereStatus = `status NOT IN ('dismissed')`;
      else whereStatus = `status='pending'`;
      const result = await pool.query(
        `SELECT * FROM intake_requests WHERE business_id=$1 AND ${whereStatus} ORDER BY created_at DESC`,
        [business.id]
      );
      res.json(result.rows.map((r) => ({
        id: r.id,
        customerName: r.customer_name,
        customerEmail: r.customer_email,
        customerPhone: r.customer_phone,
        customerAddress: r.customer_address || "",
        rawText: r.raw_text,
        extractedFields: r.extracted_fields || {},
        status: r.status,
        confidence: r.confidence || "low",
        reviewNotes: r.review_notes || "",
        missingFieldFlags: r.missing_field_flags || [],
        followUpSent: r.follow_up_sent || false,
        source: r.source,
        convertedQuoteId: r.converted_quote_id,
        createdAt: r.created_at,
        reviewedAt: r.reviewed_at
      })));
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
  app2.delete("/api/intake-requests/:id", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      await pool.query(
        `UPDATE intake_requests SET status='dismissed', updated_at=NOW() WHERE id=$1 AND business_id=$2`,
        [req.params.id, business.id]
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
  app2.patch("/api/intake-requests/:id", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { status, reviewNotes, extractedFields, confidence, missingFieldFlags } = req.body;
      const setClauses = ["updated_at=NOW()"];
      const values = [];
      let idx = 1;
      if (status !== void 0) {
        setClauses.push(`status=$${idx++}`);
        values.push(status);
        if (status === "pending") {
          setClauses.push(`reviewed_at=$${idx++}`);
          values.push(/* @__PURE__ */ new Date());
        }
      }
      if (reviewNotes !== void 0) {
        setClauses.push(`review_notes=$${idx++}`);
        values.push(reviewNotes);
      }
      if (extractedFields !== void 0) {
        setClauses.push(`extracted_fields=$${idx++}`);
        values.push(JSON.stringify(extractedFields));
      }
      if (confidence !== void 0) {
        setClauses.push(`confidence=$${idx++}`);
        values.push(confidence);
      }
      if (missingFieldFlags !== void 0) {
        setClauses.push(`missing_field_flags=$${idx++}`);
        values.push(JSON.stringify(missingFieldFlags));
      }
      values.push(req.params.id, business.id);
      const result = await pool.query(
        `UPDATE intake_requests SET ${setClauses.join(", ")} WHERE id=$${idx++} AND business_id=$${idx++} RETURNING *`,
        values
      );
      if (result.rows.length === 0) return res.status(404).json({ message: "Not found" });
      const r = result.rows[0];
      res.json({
        id: r.id,
        status: r.status,
        confidence: r.confidence,
        reviewNotes: r.review_notes,
        extractedFields: r.extracted_fields,
        missingFieldFlags: r.missing_field_flags
      });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
  app2.get("/api/intake-requests/my-link", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const code = await ensureIntakeCode(business.id);
      const reqHost = req.headers.host || req.hostname;
      const reqProto = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const baseUrl = `${reqProto}://${reqHost}`;
      const slugRow = await pool.query(
        `SELECT public_quote_slug FROM businesses WHERE id = $1 LIMIT 1`,
        [business.id]
      );
      const slug = slugRow.rows[0]?.public_quote_slug;
      const shortIdentifier = slug || code;
      const url = `${baseUrl}/intake/${shortIdentifier}`;
      res.json({ url, code, slug: slug || null, shortIdentifier, businessName: business.companyName });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
  app2.get("/api/public/slug-available/:slug", async (req, res) => {
    try {
      const raw = req.params.slug.toLowerCase().trim();
      const slug = slugify(raw);
      if (!slug || slug.length < 3) return res.json({ available: false, reason: "too_short" });
      const r = await pool.query(`SELECT id FROM businesses WHERE public_quote_slug = $1`, [slug]);
      res.json({ available: r.rows.length === 0, slug });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
  app2.get("/api/business/lead-capture-settings", requireAuth, requirePro, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const r = await pool.query(
        `SELECT public_quote_slug, public_quote_enabled, public_quote_button_text FROM businesses WHERE id = $1`,
        [business.id]
      );
      const row = r.rows[0] || {};
      let slug = row.public_quote_slug;
      if (!slug) slug = await ensurePublicSlug(business.id, business.companyName);
      const reqHost = req.headers.host || req.hostname;
      const reqProto = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const publicUrl = `${reqProto}://${reqHost}/request/${slug}`;
      res.json({
        slug,
        enabled: row.public_quote_enabled ?? true,
        buttonText: row.public_quote_button_text || "Get a Free Quote",
        publicUrl
      });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
  app2.put("/api/business/lead-capture-settings", requireAuth, requirePro, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { slug: rawSlug, enabled, buttonText } = req.body;
      const sets = ["updated_at=NOW()"];
      const vals = [];
      let idx = 1;
      if (enabled !== void 0) {
        sets.push(`public_quote_enabled=$${idx++}`);
        vals.push(Boolean(enabled));
      }
      if (buttonText !== void 0) {
        sets.push(`public_quote_button_text=$${idx++}`);
        vals.push(String(buttonText).substring(0, 80));
      }
      if (rawSlug !== void 0) {
        const slug = slugify(String(rawSlug));
        if (!slug || slug.length < 3) return res.status(400).json({ message: "Slug must be at least 3 characters" });
        const conflict = await pool.query(`SELECT id FROM businesses WHERE public_quote_slug = $1 AND id != $2`, [slug, business.id]);
        if (conflict.rows.length > 0) return res.status(409).json({ message: "That URL is already taken" });
        sets.push(`public_quote_slug=$${idx++}`);
        vals.push(slug);
      }
      vals.push(business.id);
      await pool.query(`UPDATE businesses SET ${sets.join(",")} WHERE id=$${idx}`, vals);
      const updated = await pool.query(
        `SELECT public_quote_slug, public_quote_enabled, public_quote_button_text FROM businesses WHERE id = $1`,
        [business.id]
      );
      const row = updated.rows[0];
      const reqHost = req.headers.host || req.hostname;
      const reqProto = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const publicUrl = `${reqProto}://${reqHost}/request/${row.public_quote_slug}`;
      res.json({
        slug: row.public_quote_slug,
        enabled: row.public_quote_enabled,
        buttonText: row.public_quote_button_text,
        publicUrl
      });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
  app2.post("/api/intake-requests/:id/ai-quote", requireAuth, requirePro, async (req, res) => {
    try {
      let calcSqftBaseHours2 = function(sqft) {
        if (sqft <= 1e3) return 1.5;
        if (sqft <= 1500) return 2.5;
        if (sqft <= 2e3) return 3;
        if (sqft <= 2500) return 3.5;
        if (sqft <= 3e3) return 4;
        if (sqft <= 3500) return 4.5;
        if (sqft <= 4e3) return 5;
        return 5 + Math.ceil((sqft - 4e3) / 750);
      }, roundHalfUp2 = function(h) {
        return Math.round(h * 2) / 2;
      }, roundNearest52 = function(n) {
        return Math.round(n / 5) * 5;
      };
      var calcSqftBaseHours = calcSqftBaseHours2, roundHalfUp = roundHalfUp2, roundNearest5 = roundNearest52;
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const intakeResult = await pool.query(
        `SELECT * FROM intake_requests WHERE id = $1 AND business_id = $2`,
        [req.params.id, business.id]
      );
      if (!intakeResult.rows.length) return res.status(404).json({ message: "Intake request not found" });
      const intake = intakeResult.rows[0];
      const f = intake.extracted_fields || {};
      let computedMin = 120;
      let computedMax = 350;
      let hourlyRate = 50;
      let minimumTicket = 100;
      try {
        const ps = await getPricingByBusiness(business.id);
        const pss = ps?.settings || {};
        hourlyRate = pss.hourlyRate || 50;
        minimumTicket = pss.minimumTicket || 100;
        const sqft = f.sqft || 1500;
        const beds = f.beds || 3;
        const baths = f.baths || 2;
        const sqftHours = calcSqftBaseHours2(sqft);
        const bathHours = Math.max(0, baths - 1) * 0.5;
        const bedHours = Math.max(0, beds - 2) * 0.25;
        const petHours = f.pets ? 0.5 : 0;
        const baseHours = sqftHours + bathHours + bedHours + petHours;
        const serviceTypeMultipliers = {
          standard_cleaning: 1,
          deep_clean: 1.5,
          move_in_out: 2,
          post_construction: 2,
          airbnb: 1.2,
          recurring: 1
        };
        const mult = serviceTypeMultipliers[f.serviceType || "standard_cleaning"] || 1;
        const totalHours = roundHalfUp2(baseHours * mult);
        let basePrice = totalHours * hourlyRate;
        basePrice = Math.max(basePrice, minimumTicket);
        const addOnPrices = pss.addOnPrices || {};
        let addOnTotal = 0;
        for (const [key, val] of Object.entries(f.addOns || {})) {
          if (val && addOnPrices[key]) addOnTotal += Number(addOnPrices[key]);
        }
        const freqDiscounts = pss.frequencyDiscounts || { weekly: 25, biweekly: 15, monthly: 10 };
        let freqDiscount = 0;
        if (f.frequency === "weekly") freqDiscount = freqDiscounts.weekly / 100;
        else if (f.frequency === "biweekly") freqDiscount = freqDiscounts.biweekly / 100;
        else if (f.frequency === "monthly") freqDiscount = freqDiscounts.monthly / 100;
        const computedPrice = roundNearest52((basePrice + addOnTotal) * (1 - freqDiscount));
        computedMin = Math.round(computedPrice * 0.92 / 5) * 5;
        computedMax = Math.round(computedPrice * 1.08 / 5) * 5;
        console.log(`[ai-quote] computed price: $${computedPrice} (range $${computedMin}-$${computedMax}), hourlyRate=${hourlyRate}, mult=${mult}, hours=${totalHours}`);
      } catch (pricingErr) {
        console.error("[ai-quote] pricing calc error:", pricingErr);
      }
      const serviceLabel = {
        standard_cleaning: "Standard Cleaning",
        deep_clean: "Deep Clean",
        move_in_out: "Move-In/Move-Out Clean",
        airbnb: "Airbnb Turnover Clean",
        post_construction: "Post-Construction Clean",
        recurring: "Recurring Cleaning"
      };
      const addOnsList = Object.entries(f.addOns || {}).filter(([, v]) => v).map(([k]) => k.replace(/([A-Z])/g, " $1").toLowerCase()).join(", ");
      const prompt = `You are an expert cleaning business pricing assistant. Generate a professional quote for the following job.

Customer: ${intake.customer_name || "Unknown"}
Address: ${intake.customer_address || f.address || "Not provided"}
Property: ${f.beds ?? "?"}BR / ${f.baths ?? "?"}BA${f.sqft ? `, ${f.sqft} sqft` : ""}
Service: ${serviceLabel[f.serviceType] || f.serviceType || "Standard Cleaning"}
Frequency: ${f.frequency || "one-time"}
Pets: ${f.pets ? `Yes (${f.petType || "unknown"})` : "No"}${addOnsList ? `
Add-ons: ${addOnsList}` : ""}${f.notes ? `
Customer notes: ${f.notes}` : ""}
Calculated price range: $${computedMin}\u2013$${computedMax} (based on configured hourly rate of $${hourlyRate}/hr)

Generate a professional quote. The total MUST be between $${computedMin} and $${computedMax}.
Return ONLY valid JSON:
{
  "total": <number between ${computedMin} and ${computedMax}>,
  "lineItems": [
    { "description": "<string>", "quantity": <number>, "unitPrice": <number>, "subtotal": <number> }
  ],
  "summary": "<one sentence describing the quote>"
}

Rules:
- 2-5 line items (base service + relevant extras)
- Total MUST equal the sum of all subtotals
- Total MUST be between $${computedMin} and $${computedMax} \u2014 do NOT go outside this range
- Never output markdown, only pure JSON`;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2
      });
      let aiData = {};
      try {
        aiData = JSON.parse(completion.choices[0].message.content || "{}");
      } catch {
      }
      const lineItems = Array.isArray(aiData.lineItems) ? aiData.lineItems : [];
      const lineItemsTotal = lineItems.reduce((s, li) => s + (Number(li.subtotal) || Number(li.unitPrice) || 0), 0);
      let total = typeof aiData.total === "number" && aiData.total > 0 ? aiData.total : lineItemsTotal;
      if (total < minimumTicket) {
        console.warn(`[ai-quote] AI returned total $${total} below minimum $${minimumTicket} \u2014 clamping`);
        total = minimumTicket;
      }
      if (total < computedMin) {
        console.warn(`[ai-quote] AI returned total $${total} below computed min $${computedMin} \u2014 clamping`);
        total = computedMin;
      }
      console.log(`[ai-quote] aiData.total=${aiData.total} lineItemsTotal=${lineItemsTotal} final total=${total}`);
      const propertyDetails = {
        customerName: intake.customer_name,
        customerPhone: intake.customer_phone,
        customerEmail: intake.customer_email,
        customerAddress: intake.customer_address,
        sqft: f.sqft || 0,
        beds: f.beds || 0,
        baths: f.baths || 0,
        petType: f.pets ? f.petType || "dog" : "none",
        conditionScore: 7,
        peopleCount: 2,
        homeType: "house",
        kitchensCount: 1,
        halfBaths: 0,
        petShedding: false
      };
      const q = await createQuote({
        businessId: business.id,
        propertyBeds: f.beds || 0,
        propertyBaths: f.baths || 0,
        propertySqft: f.sqft || 0,
        propertyDetails,
        addOns: f.addOns || {},
        frequencySelected: f.frequency || "one-time",
        selectedOption: "better",
        options: {},
        subtotal: total,
        tax: 0,
        total,
        status: "draft"
      });
      for (const li of lineItems) {
        await createLineItem({
          quoteId: q.id,
          name: li.description || li.name || "Cleaning Service",
          quantity: li.quantity || 1,
          unitPrice: li.unitPrice || li.subtotal || 0,
          totalPrice: li.subtotal || li.unitPrice || 0,
          type: "base"
        });
      }
      await pool.query(
        `UPDATE intake_requests SET status = 'converted', converted_quote_id = $1 WHERE id = $2`,
        [q.id, intake.id]
      );
      return res.json({ quoteId: q.id, total, lineItemCount: lineItems.length });
    } catch (e) {
      console.error("AI quote error:", e);
      res.status(500).json({ message: e.message });
    }
  });
  app2.post("/api/intake-requests/:id/convert", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { quoteId } = req.body;
      await pool.query(
        `UPDATE intake_requests SET status='converted', converted_quote_id=$1, updated_at=NOW() WHERE id=$2 AND business_id=$3`,
        [quoteId || null, req.params.id, business.id]
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
  app2.post("/api/intake-requests/send-link", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { toEmail, toName, customMessage } = req.body;
      if (!toEmail?.trim()) return res.status(400).json({ message: "Email is required" });
      const intakeCode = await ensureIntakeCode(business.id);
      const reqHost = req.headers.host || req.hostname;
      const reqProto = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const intakeUrl = `${reqProto}://${reqHost}/intake/${intakeCode}`;
      const recipientName = (toName || "there").trim();
      const defaultMessage = `Hi ${recipientName},

${business.companyName} would like to give you a personalized cleaning quote. Please fill out this quick form so we can prepare an accurate estimate:

${intakeUrl}

It only takes about 2 minutes.

Thanks,
${business.companyName}`;
      const bodyText = customMessage?.trim() || defaultMessage;
      const sgApiKey = process.env.SENDGRID_API_KEY;
      if (!sgApiKey) return res.status(500).json({ message: "Email not configured" });
      const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${sgApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: toEmail.trim(), name: toName || "" }] }],
          from: { email: business.email || "noreply@quotepro.app", name: business.companyName },
          subject: `${business.companyName} \u2014 Your personalized quote`,
          content: [{ type: "text/plain", value: bodyText }]
        })
      });
      if (!sgRes.ok) {
        const err = await sgRes.text();
        console.error("Send intake link email error:", err);
        return res.status(500).json({ message: "Failed to send email" });
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
  app2.get("/api/intake-requests/count", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const result = await pool.query(
        `SELECT
          COUNT(*) FILTER (WHERE status='pending') as new_count,
          COUNT(*) FILTER (WHERE status='needs_review') as review_count,
          COUNT(*) FILTER (WHERE status IN ('pending','needs_review')) as total
         FROM intake_requests WHERE business_id=$1`,
        [business.id]
      );
      const row = result.rows[0];
      res.json({
        count: parseInt(row.total),
        newCount: parseInt(row.new_count),
        reviewCount: parseInt(row.review_count)
      });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
  const httpServer = createServer(app2);
  async function processPendingFollowUps() {
    const pending = await getPendingCommunications();
    let sent = 0;
    let canceled = 0;
    for (const comm of pending) {
      try {
        if (!comm.quoteId) {
          await updateCommunication(comm.id, { status: "canceled" });
          canceled++;
          continue;
        }
        const quote = await getQuoteById(comm.quoteId);
        if (!quote || quote.status === "accepted" || quote.status === "expired") {
          await updateCommunication(comm.id, { status: "canceled" });
          canceled++;
          continue;
        }
        const customer = quote.customerId ? await getCustomerById(quote.customerId) : null;
        const business = await db_getBusinessById(quote.businessId);
        let messageText = comm.content?.trim() || "";
        if (!messageText) {
          messageText = await generateFollowUpMessage(quote, customer, business, comm.channel);
        }
        if (comm.channel === "email") {
          const sgApiKey = process.env.SENDGRID_API_KEY;
          const toEmail = customer?.email;
          if (!sgApiKey || !toEmail) {
            await updateCommunication(comm.id, { status: "failed", errorMessage: !sgApiKey ? "No SendGrid key" : "No customer email" });
            continue;
          }
          const fromEmail = process.env.SENDGRID_FROM_EMAIL || "quotes@myreminder.ai";
          const fromName = business?.companyName || "QuotePro";
          const replyTo = business?.email;
          const quoteUrl = `${process.env.APP_URL || "https://quotepro.app"}/q/${quote.publicToken}`;
          const primaryColor = business?.primaryColor || "#2563EB";
          const quoteButtonHtml = `<div style="margin-top:24px;text-align:center;"><a href="${quoteUrl}" style="display:inline-block;background:${primaryColor};color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">View & Accept Your Quote</a></div>`;
          const subjectMatch = messageText.match(/^Subject:\s*(.+)/i);
          const subject = subjectMatch ? subjectMatch[1].trim() : `Following up on your quote from ${fromName}`;
          const body = subjectMatch ? messageText.replace(/^Subject:.*\n\n?/i, "").trim() : messageText;
          const htmlBody = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);"><tr><td style="background:linear-gradient(135deg,#007AFF,#5856D6);padding:24px 32px;"><h2 style="color:#fff;margin:0;font-size:20px;">${fromName}</h2></td></tr><tr><td style="padding:32px;">${body.split("\n").map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333;">${l}</p>`).join("")}${quoteButtonHtml}</td></tr><tr><td style="padding:16px 32px 24px;border-top:1px solid #eee;"><p style="margin:0;font-size:12px;color:#999;">Sent via QuotePro</p></td></tr></table></td></tr></table></body></html>`;
          const emailPayload = {
            personalizations: [{ to: [{ email: toEmail }] }],
            from: { email: fromEmail, name: fromName },
            subject,
            content: [{ type: "text/plain", value: body }, { type: "text/html", value: htmlBody }]
          };
          if (replyTo) emailPayload.reply_to = { email: replyTo, name: fromName };
          const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: { Authorization: `Bearer ${sgApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify(emailPayload)
          });
          if (!sgRes.ok) {
            const errText = await sgRes.text();
            await updateCommunication(comm.id, { status: "failed", errorMessage: errText.slice(0, 200) });
            continue;
          }
        } else {
          const twilioSid = process.env.TWILIO_ACCOUNT_SID;
          const twilioToken = process.env.TWILIO_AUTH_TOKEN;
          const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
          const toPhone = customer?.phone;
          if (!twilioSid || !twilioToken || !twilioFrom || !toPhone) {
            await updateCommunication(comm.id, { status: "failed", errorMessage: !toPhone ? "No customer phone" : "Twilio not configured" });
            continue;
          }
          const quoteUrl = `${process.env.APP_URL || "https://quotepro.app"}/q/${quote.publicToken}`;
          const smsText = `${messageText}
${quoteUrl}`;
          const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
            method: "POST",
            headers: {
              "Authorization": "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64"),
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({ From: twilioFrom, To: toPhone, Body: smsText }).toString()
          });
          if (!twilioRes.ok) {
            const errText = await twilioRes.text();
            await updateCommunication(comm.id, { status: "failed", errorMessage: errText.slice(0, 200) });
            continue;
          }
        }
        await updateCommunication(comm.id, { status: "sent", sentAt: /* @__PURE__ */ new Date(), content: messageText });
        sent++;
        console.log(`Auto follow-up sent: commId=${comm.id}, channel=${comm.channel}, quoteId=${comm.quoteId}`);
      } catch (e) {
        console.error(`Failed to process follow-up ${comm.id}:`, e);
      }
    }
    return { sent, canceled };
  }
  {
    const {
      getLeadFinderSettings: getLeadFinderSettings2,
      upsertLeadFinderSettings: upsertLeadFinderSettings2,
      createLeadIfNotExists: createLeadIfNotExists2,
      getLeadFinderLeads: getLeadFinderLeads2,
      getLeadFinderLeadById: getLeadFinderLeadById2,
      updateLeadStatus: updateLeadStatus2,
      countNewLeadFinderLeads: countNewLeadFinderLeads2,
      saveGeneratedReplies: saveGeneratedReplies2,
      getGeneratedReplies: getGeneratedReplies2,
      findBusinessesWithLeadFinderEnabled: findBusinessesWithLeadFinderEnabled2,
      logLeadFinderEvent: logLeadFinderEvent2
    } = await Promise.resolve().then(() => (init_storage(), storage_exports));
    const { fetchRedditLeads: fetchRedditLeads2, getMockLeads: getMockLeads2 } = await Promise.resolve().then(() => (init_reddit(), reddit_exports));
    const { classifyLead: classifyLead2, shouldStoreLead: shouldStoreLead2 } = await Promise.resolve().then(() => (init_classifier(), classifier_exports));
    const { scoreLead: scoreLead2 } = await Promise.resolve().then(() => (init_scoring(), scoring_exports));
    const { generateReplies: generateReplies2 } = await Promise.resolve().then(() => (init_reply_generator(), reply_generator_exports));
    app2.get("/api/lead-finder/settings", requireAuth, requirePro, async (req, res) => {
      try {
        const business = await getBusinessByOwner(req.session.userId);
        if (!business) return res.status(404).json({ message: "Business not found" });
        const settings = await getLeadFinderSettings2(req.session.userId, business.id);
        return res.json(settings ?? {
          enabled: false,
          targetCities: [],
          targetZips: [],
          radiusMiles: 25,
          keywords: [],
          subreddits: [],
          notifyNewLeads: true
        });
      } catch (e) {
        return res.status(500).json({ message: "Failed to fetch settings" });
      }
    });
    app2.post("/api/lead-finder/settings", requireAuth, requirePro, async (req, res) => {
      try {
        const business = await getBusinessByOwner(req.session.userId);
        if (!business) return res.status(404).json({ message: "Business not found" });
        const {
          enabled,
          targetCities,
          targetZips,
          radiusMiles,
          keywords,
          subreddits,
          notifyNewLeads
        } = req.body;
        const settings = await upsertLeadFinderSettings2(req.session.userId, business.id, {
          enabled: enabled ?? true,
          targetCities: targetCities ?? [],
          targetZips: targetZips ?? [],
          radiusMiles: radiusMiles ?? 25,
          keywords: keywords ?? [],
          subreddits: subreddits ?? [],
          notifyNewLeads: notifyNewLeads ?? true
        });
        return res.json(settings);
      } catch (e) {
        return res.status(500).json({ message: "Failed to save settings" });
      }
    });
    app2.get("/api/lead-finder/leads", requireAuth, requirePro, async (req, res) => {
      try {
        const business = await getBusinessByOwner(req.session.userId);
        if (!business) return res.status(404).json({ message: "Business not found" });
        const {
          status,
          keyword,
          minScore,
          limit = "20",
          page = "1"
        } = req.query;
        const { leads, total } = await getLeadFinderLeads2(
          req.session.userId,
          business.id,
          {
            status,
            keyword,
            minScore: minScore ? Number(minScore) : void 0,
            limit: Number(limit),
            page: Number(page)
          }
        );
        return res.json({ leads, total, page: Number(page), limit: Number(limit) });
      } catch (e) {
        return res.status(500).json({ message: "Failed to fetch leads" });
      }
    });
    app2.get("/api/lead-finder/count", requireAuth, requirePro, async (req, res) => {
      try {
        const business = await getBusinessByOwner(req.session.userId);
        if (!business) return res.json({ count: 0 });
        const count = await countNewLeadFinderLeads2(req.session.userId, business.id);
        return res.json({ count });
      } catch {
        return res.json({ count: 0 });
      }
    });
    app2.get("/api/lead-finder/leads/:id", requireAuth, requirePro, async (req, res) => {
      try {
        const business = await getBusinessByOwner(req.session.userId);
        if (!business) return res.status(404).json({ message: "Business not found" });
        const lead = await getLeadFinderLeadById2(req.params.id, req.session.userId, business.id);
        if (!lead) return res.status(404).json({ message: "Lead not found" });
        const replies = await getGeneratedReplies2(lead.id);
        return res.json({ ...lead, replies });
      } catch (e) {
        return res.status(500).json({ message: "Failed to fetch lead" });
      }
    });
    app2.post("/api/lead-finder/leads/:id/status", requireAuth, requirePro, async (req, res) => {
      try {
        const business = await getBusinessByOwner(req.session.userId);
        if (!business) return res.status(404).json({ message: "Business not found" });
        const VALID = ["new", "saved", "dismissed", "contacted"];
        const { status } = req.body;
        if (!VALID.includes(status)) return res.status(400).json({ message: "Invalid status" });
        const updated = await updateLeadStatus2(req.params.id, req.session.userId, business.id, status);
        if (!updated) return res.status(404).json({ message: "Lead not found" });
        await logLeadFinderEvent2(req.params.id, req.session.userId, `status_${status}`);
        return res.json(updated);
      } catch (e) {
        return res.status(500).json({ message: "Failed to update status" });
      }
    });
    app2.post("/api/lead-finder/leads/:id/generate-replies", requireAuth, requirePro, async (req, res) => {
      try {
        const business = await getBusinessByOwner(req.session.userId);
        if (!business) return res.status(404).json({ message: "Business not found" });
        const lead = await getLeadFinderLeadById2(req.params.id, req.session.userId, business.id);
        if (!lead) return res.status(404).json({ message: "Lead not found" });
        const replies = await generateReplies2({
          postTitle: lead.title ?? "",
          postBody: lead.body ?? "",
          subreddit: lead.subreddit ?? "",
          businessName: business.companyName || "My Cleaning Business",
          detectedLocation: lead.detectedLocation ?? void 0,
          intent: lead.intent ?? void 0
        });
        const saved = await saveGeneratedReplies2(lead.id, replies);
        await logLeadFinderEvent2(lead.id, req.session.userId, "generate_replies");
        return res.json({ replies: saved });
      } catch (e) {
        return res.status(500).json({ message: "Failed to generate replies" });
      }
    });
    app2.post("/api/lead-finder/poll", requireAuth, requirePro, async (req, res) => {
      try {
        const business = await getBusinessByOwner(req.session.userId);
        if (!business) return res.status(404).json({ message: "Business not found" });
        const settings = await getLeadFinderSettings2(req.session.userId, business.id);
        const targetCities = settings?.targetCities ?? [];
        const keywords = settings?.keywords ?? [];
        const subreddits = settings?.subreddits ?? [];
        let posts = await fetchRedditLeads2({ keywords, subreddits, targetCities });
        const usedLive = posts.length > 0;
        if (!posts.length) posts = getMockLeads2(targetCities);
        const dayBucket = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "");
        posts = posts.map((p) => ({
          ...p,
          externalId: p.externalId.startsWith("mock_") ? `${p.externalId}_${dayBucket}` : p.externalId
        }));
        let stored = 0;
        let skipped = 0;
        let rejected = 0;
        for (const post of posts) {
          const classification = await classifyLead2(post.title, post.body, post.subreddit);
          if (!classification || !shouldStoreLead2(classification)) {
            rejected++;
            continue;
          }
          const { score } = scoreLead2(classification, post.postedAt);
          const { created } = await createLeadIfNotExists2({
            userId: req.session.userId,
            businessId: business.id,
            source: "reddit",
            externalId: post.externalId,
            subreddit: post.subreddit,
            title: post.title,
            body: post.body,
            author: post.author,
            postUrl: post.postUrl,
            permalink: post.permalink,
            matchedKeyword: post.matchedKeyword,
            detectedLocation: classification.detectedLocation,
            intent: classification.intent,
            aiClassification: classification.classification,
            aiConfidence: classification.confidence,
            aiReason: classification.reason,
            leadScore: score,
            postedAt: post.postedAt,
            metadata: post.metadata
          });
          if (created) stored++;
          else skipped++;
        }
        return res.json({
          ok: true,
          processed: posts.length,
          stored,
          skipped,
          rejected,
          usedLive
        });
      } catch (e) {
        console.error("[lead-finder poll]", e);
        return res.status(500).json({ message: "Poll failed", error: e.message });
      }
    });
    async function runLeadFinderWorker() {
      try {
        const businesses2 = await findBusinessesWithLeadFinderEnabled2();
        let totalStored = 0;
        for (const { userId, businessId, settings } of businesses2) {
          try {
            const targetCities = settings.targetCities ?? [];
            const keywords = settings.keywords ?? [];
            const subreddits = settings.subreddits ?? [];
            const posts = await fetchRedditLeads2({ keywords, subreddits, targetCities });
            let stored = 0;
            for (const post of posts) {
              const classification = await classifyLead2(post.title, post.body, post.subreddit);
              if (!classification || !shouldStoreLead2(classification)) continue;
              const { score } = scoreLead2(classification, post.postedAt);
              const { created } = await createLeadIfNotExists2({
                userId,
                businessId,
                source: "reddit",
                externalId: post.externalId,
                subreddit: post.subreddit,
                title: post.title,
                body: post.body,
                author: post.author,
                postUrl: post.postUrl,
                permalink: post.permalink,
                matchedKeyword: post.matchedKeyword,
                detectedLocation: classification.detectedLocation,
                intent: classification.intent,
                aiClassification: classification.classification,
                aiConfidence: classification.confidence,
                aiReason: classification.reason,
                leadScore: score,
                postedAt: post.postedAt,
                metadata: post.metadata
              });
              if (created) stored++;
            }
            if (stored > 0) {
              totalStored += stored;
              if (settings.notifyNewLeads) {
                const tokens = await getPushTokensByUser(userId);
                if (tokens.length) {
                  await fetch("https://exp.host/--/api/v2/push/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      to: tokens.map((t) => t.token),
                      title: "New cleaning lead found",
                      body: `Someone nearby is asking for cleaning help. Respond while it's fresh.`,
                      data: { screen: "LeadFinder" },
                      sound: "default"
                    })
                  });
                }
              }
              console.log(`[lead-finder] ${stored} new leads for business ${businessId}`);
            }
          } catch (e) {
            console.error(`[lead-finder] Error for business ${businessId}:`, e);
          }
        }
        if (totalStored > 0) console.log(`[lead-finder] Worker stored ${totalStored} total new leads`);
      } catch (e) {
        console.error("[lead-finder] Worker error:", e);
      }
    }
    const _originalWorker = runLeadFinderWorker;
    app2.__leadFinderWorker = _originalWorker;
  }
  async function sendStaleQuoteNudges() {
    try {
      const staleQuotes = await getStaleQuotesForNudge(48);
      if (!staleQuotes.length) return;
      for (const q of staleQuotes) {
        try {
          const biz = await (async () => {
            const r = await pool.query("SELECT owner_user_id, company_name FROM businesses WHERE id = $1", [q.businessId]);
            return r.rows[0];
          })();
          if (!biz?.owner_user_id) continue;
          const tokens = await getPushTokensByUser(biz.owner_user_id);
          if (!tokens.length) continue;
          const customerName = q.propertyDetails?.customerName || "a customer";
          const pushMessages = tokens.map((t) => ({
            to: t.token,
            title: "Quote still pending",
            body: `Your quote for ${customerName} ($${(q.total || 0).toFixed(0)}) hasn't been viewed. A quick follow-up can double your close rate.`,
            data: { screen: "QuoteDetail", quoteId: q.id },
            sound: "default"
          }));
          const res = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(pushMessages.length === 1 ? pushMessages[0] : pushMessages)
          });
          if (res.ok) {
            await markQuoteNudgeSent(q.id);
            console.log(`[nudge] Sent push for quote ${q.id} to business ${q.businessId}`);
          }
        } catch (e) {
          console.error(`[nudge] Error for quote ${q.id}:`, e);
        }
      }
    } catch (e) {
      console.error("[nudge] Failed to send stale quote nudges:", e);
    }
  }
  async function sendWeeklyDigestEmails() {
    const now = /* @__PURE__ */ new Date();
    if (now.getDay() !== 1) return;
    const hour = now.getHours();
    if (hour < 7 || hour > 9) return;
    const sgApiKey = process.env.SENDGRID_API_KEY;
    if (!sgApiKey) return;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || "quotes@myreminder.ai";
    try {
      const businessIds = await getAllBusinessIds();
      for (const businessId of businessIds) {
        try {
          const prefs = await getPreferencesByBusiness(businessId);
          if (!prefs?.weeklyRecapEnabled) continue;
          const lastSent = prefs.lastWeeklyDigestAt ? new Date(prefs.lastWeeklyDigestAt) : null;
          if (lastSent) {
            const hoursSinceSent = (now.getTime() - lastSent.getTime()) / (60 * 60 * 1e3);
            if (hoursSinceSent < 144) continue;
          }
          const bizRow = await pool.query(
            "SELECT owner_user_id, company_name, email FROM businesses WHERE id = $1",
            [businessId]
          );
          if (!bizRow.rows.length) continue;
          const { owner_user_id, company_name, email: bizEmail } = bizRow.rows[0];
          const user = await getUserById(owner_user_id);
          const toEmail = user?.email || bizEmail;
          if (!toEmail) continue;
          const stats = await getWeeklyQuoteStats(businessId);
          const totalStats = await getQuoteStats(businessId);
          const pendingListHtml = stats.pendingQuotes.length ? stats.pendingQuotes.map(
            (q) => `<tr><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;">${q.customerName}</td><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">$${q.total.toFixed(2)}</td></tr>`
          ).join("") : `<tr><td colspan="2" style="padding:8px 0;color:#6b7280;">No pending quotes \u2014 great job!</td></tr>`;
          const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:20px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#7C3AED,#4F46E5);padding:32px 28px;">
    <p style="color:rgba(255,255,255,0.8);margin:0 0 4px;font-size:13px;">WEEKLY SNAPSHOT</p>
    <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">${company_name || "Your Business"}</h1>
  </div>
  <div style="padding:28px;">
    <div style="display:flex;gap:12px;margin-bottom:24px;">
      <div style="flex:1;background:#f5f3ff;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#7C3AED;">${stats.sentCount}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px;">Quotes Sent</div>
      </div>
      <div style="flex:1;background:#ecfdf5;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#059669;">${stats.acceptedCount}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px;">Won</div>
      </div>
      <div style="flex:1;background:#eff6ff;border-radius:12px;padding:16px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#2563EB;">$${stats.revenueWon.toFixed(0)}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px;">Revenue Won</div>
      </div>
    </div>
    <div style="background:#fafafa;border-radius:12px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">All-Time Revenue</p>
      <p style="margin:0;font-size:24px;font-weight:700;color:#111;">$${totalStats.totalRevenue.toFixed(2)}</p>
    </div>
    ${stats.pendingQuotes.length > 0 ? `
    <h3 style="font-size:14px;font-weight:600;color:#374151;margin:0 0 8px;">Quotes Awaiting Reply</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">${pendingListHtml}</table>
    <a href="${process.env.BASE_URL || "https://quotepro.app"}" style="display:block;text-align:center;background:#7C3AED;color:#fff;padding:14px;border-radius:10px;font-weight:600;text-decoration:none;font-size:15px;">Follow Up Now</a>
    ` : `<p style="text-align:center;color:#6b7280;font-size:14px;">No open quotes \u2014 ready to send some new ones?</p>`}
  </div>
  <div style="padding:16px 28px;border-top:1px solid #f0f0f0;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">QuotePro Weekly Digest &bull; <a href="${process.env.BASE_URL || ""}/settings" style="color:#7C3AED;">Manage notifications</a></p>
  </div>
</div>
</body></html>`;
          const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: { "Authorization": `Bearer ${sgApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              personalizations: [{ to: [{ email: toEmail }] }],
              from: { email: fromEmail, name: "QuotePro" },
              subject: `Your week in review \u2014 ${stats.sentCount} quote${stats.sentCount !== 1 ? "s" : ""} sent, $${stats.revenueWon.toFixed(0)} won`,
              content: [
                { type: "text/plain", value: `${company_name} Weekly Snapshot
Quotes Sent: ${stats.sentCount}
Won: ${stats.acceptedCount}
Revenue Won: $${stats.revenueWon.toFixed(2)}
All-Time Revenue: $${totalStats.totalRevenue.toFixed(2)}` },
                { type: "text/html", value: emailHtml }
              ]
            })
          });
          if (sgRes.ok) {
            await markWeeklyDigestSent(businessId);
            console.log(`[digest] Weekly digest sent to ${toEmail} for business ${businessId}`);
          } else {
            const err = await sgRes.text();
            console.error(`[digest] SendGrid error for ${businessId}:`, err);
          }
        } catch (e) {
          console.error(`[digest] Error for business ${businessId}:`, e);
        }
      }
    } catch (e) {
      console.error("[digest] Failed to send weekly digests:", e);
    }
  }
  setInterval(async () => {
    try {
      await expireOldQuotes();
      const { sent, canceled } = await processPendingFollowUps();
      if (sent > 0 || canceled > 0) console.log(`Follow-ups processed: ${sent} sent, ${canceled} canceled`);
      await sendStaleQuoteNudges();
      await sendWeeklyDigestEmails();
      if (app2.__leadFinderWorker) await app2.__leadFinderWorker();
    } catch (e) {
      console.error("Auto-expire/followup error:", e);
    }
  }, 60 * 60 * 1e3);
  app2.get("/api/files", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const files = await db.select().from(businessFiles).where(eq3(businessFiles.businessId, business.id)).orderBy(desc3(businessFiles.createdAt));
      return res.json(files);
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch files" });
    }
  });
  app2.post("/api/files/upload", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { fileData, originalName, fileType, fileSize, description, category } = req.body;
      if (!fileData || !originalName) return res.status(400).json({ message: "File data and name required" });
      const fs2 = await import("fs");
      const path2 = await import("path");
      const uploadsDir = path2.join(process.cwd(), "uploads", "business-files");
      if (!fs2.existsSync(uploadsDir)) fs2.mkdirSync(uploadsDir, { recursive: true });
      const ext = originalName.split(".").pop() || "bin";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = path2.join(uploadsDir, fileName);
      const base64Data = fileData.replace(/^data:[^;]+;base64,/, "");
      fs2.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
      const fileUrl = `/uploads/business-files/${fileName}`;
      const [file] = await db.insert(businessFiles).values({
        businessId: business.id,
        originalName,
        fileName,
        fileType: fileType || "application/octet-stream",
        fileSize: fileSize || 0,
        fileUrl,
        description: description || "",
        category: category || "general"
      }).returning();
      return res.json(file);
    } catch (err) {
      console.error("File upload error:", err);
      return res.status(500).json({ message: "Failed to upload file" });
    }
  });
  app2.patch("/api/files/:id", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { description, category } = req.body;
      const [updated] = await db.update(businessFiles).set({ description: description || "", category: category || "general" }).where(and3(eq3(businessFiles.id, req.params.id), eq3(businessFiles.businessId, business.id))).returning();
      if (!updated) return res.status(404).json({ message: "File not found" });
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ message: "Failed to update file" });
    }
  });
  app2.delete("/api/files/:id", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const [file] = await db.select().from(businessFiles).where(and3(eq3(businessFiles.id, req.params.id), eq3(businessFiles.businessId, business.id)));
      if (!file) return res.status(404).json({ message: "File not found" });
      const fs2 = await import("fs");
      const path2 = await import("path");
      const filePath = path2.join(process.cwd(), file.fileUrl);
      try {
        fs2.unlinkSync(filePath);
      } catch {
      }
      await db.delete(businessFiles).where(eq3(businessFiles.id, req.params.id));
      return res.json({ message: "Deleted" });
    } catch (err) {
      return res.status(500).json({ message: "Failed to delete file" });
    }
  });
  const BUILT_IN_SEQUENCES = [
    {
      id: "seq-welcome-new-customer",
      name: "Welcome New Customer",
      description: "Onboard new clients with a warm 3-step series that sets expectations and encourages their first review.",
      category: "Onboarding",
      icon: "star",
      color: "blue",
      steps: [
        { subject: "Welcome to {{businessName}}! Here's what to expect", delayDays: 0, body: "Hi {{customerName}},\n\nWelcome aboard! We're thrilled to have you as a new customer.\n\nHere's what you can expect from us:\n- Thorough, professional cleaning every time\n- Fully vetted and insured cleaners\n- 100% satisfaction guarantee\n\nIf you have any questions before your first appointment, just reply to this email.\n\nLooking forward to making your home shine!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "How did your first clean go?", delayDays: 3, body: "Hi {{customerName}},\n\nWe hope your first clean with {{businessName}} went wonderfully!\n\nWe'd love to hear your thoughts. Your feedback helps us improve and serve you better.\n\nIf everything was great, we'd really appreciate a quick review \u2014 it means the world to a small business like ours:\n{{bookingLink}}\n\nIf anything fell short of your expectations, just reply to this email and we'll make it right.\n\nThank you for trusting us with your home!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Ready to make your cleaning recurring?", delayDays: 10, body: "Hi {{customerName}},\n\nWe've loved cleaning for you! Many of our customers find that scheduling recurring cleanings keeps their home consistently fresh without the hassle of rescheduling each time.\n\nWe offer weekly, bi-weekly, and monthly plans \u2014 and recurring clients get priority scheduling.\n\nInterested? Book your next visit here:\n{{bookingLink}}\n\nTalk soon!\n\n{{senderName}}\n{{businessName}}" }
      ]
    },
    {
      id: "seq-spring-cleaning",
      name: "Spring Cleaning Campaign",
      description: "Seasonal campaign to re-engage existing clients and attract new ones with a spring cleaning special.",
      category: "Seasonal",
      icon: "sun",
      color: "green",
      steps: [
        { subject: "Spring is here \u2014 is your home ready?", delayDays: 0, body: "Hi {{customerName}},\n\nSpring has arrived and there's no better time to refresh your home from top to bottom!\n\nOur Spring Deep Clean package covers all the spots that need extra attention after winter \u2014 baseboards, windows, behind appliances, and more.\n\nBook your spring clean now:\n{{bookingLink}}\n\nSpots are filling fast!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Last chance: Spring cleaning spots are almost gone", delayDays: 5, body: "Hi {{customerName}},\n\nJust a friendly reminder \u2014 our spring cleaning calendar is filling up quickly!\n\nDon't miss the chance to start the season with a sparkling clean home.\n\nBook now before we're fully booked:\n{{bookingLink}}\n\nWe'd love to help make your spring fresh and clean!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Still thinking about a spring clean?", delayDays: 10, body: "Hi {{customerName}},\n\nWe know life gets busy, but we wanted to reach out one more time.\n\nA thorough spring clean can make a real difference \u2014 less dust, better air quality, and a home you're proud of.\n\nWe still have a few openings. Claim yours here:\n{{bookingLink}}\n\nTalk soon!\n\n{{senderName}}\n{{businessName}}" }
      ]
    },
    {
      id: "seq-mothers-day",
      name: "Mother's Day Special",
      description: "Gift-focused campaign promoting cleaning services as the perfect Mother's Day present.",
      category: "Seasonal",
      icon: "heart",
      color: "pink",
      steps: [
        { subject: "Give Mom the gift of a clean home this Mother's Day", delayDays: 0, body: "Hi {{customerName}},\n\nMother's Day is coming up \u2014 and what better gift than a spotlessly clean home?\n\nGive the mom in your life the gift of relaxation with a professional cleaning from {{businessName}}.\n\nIt's thoughtful, practical, and something she'll truly appreciate.\n\nBook a Mother's Day clean here:\n{{bookingLink}}\n\nHappy early Mother's Day from all of us!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Mother's Day is almost here \u2014 have you booked Mom's clean?", delayDays: 5, body: "Hi {{customerName}},\n\nMother's Day is just around the corner!\n\nIf you're still searching for the perfect gift, a professional home cleaning is a wonderful way to show you care.\n\nOur team will leave her home looking and smelling amazing.\n\nBook now \u2014 limited spots remain:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Last call for Mother's Day cleaning gifts", delayDays: 9, body: "Hi {{customerName}},\n\nToday is your last chance to book a Mother's Day cleaning gift!\n\nWe have a very limited number of spots left before the holiday. Secure yours now:\n{{bookingLink}}\n\nWe'll make sure Mom's home is truly special.\n\n{{senderName}}\n{{businessName}}" }
      ]
    },
    {
      id: "seq-fall-deep-clean",
      name: "Fall Deep Clean",
      description: "Encourage clients to do a thorough clean before the holiday season and colder months ahead.",
      category: "Seasonal",
      icon: "wind",
      color: "orange",
      steps: [
        { subject: "Get your home ready for fall \u2014 book your deep clean", delayDays: 0, body: "Hi {{customerName}},\n\nFall is the perfect time to give your home a thorough refresh before the holiday season kicks in!\n\nOur Fall Deep Clean covers all the areas that tend to get overlooked during regular maintenance cleanings \u2014 vents, under furniture, kitchen appliances, and more.\n\nBook your fall deep clean now:\n{{bookingLink}}\n\nWarm regards,\n{{senderName}}\n{{businessName}}" },
        { subject: "Holiday season is coming \u2014 is your home ready?", delayDays: 7, body: "Hi {{customerName}},\n\nWith the holidays approaching, you'll soon be hosting family and friends. Starting with a beautifully clean home makes all the difference!\n\nOur team can take care of the deep cleaning so you can focus on the fun parts of the season.\n\nSchedule your clean here:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Don't wait until the holidays \u2014 book your clean now", delayDays: 14, body: "Hi {{customerName}},\n\nWe're heading into the busiest time of year, and our calendar is filling up fast.\n\nBook now to lock in your preferred date before the holiday rush:\n{{bookingLink}}\n\nWe look forward to helping you enjoy a clean, stress-free home this season!\n\n{{senderName}}\n{{businessName}}" }
      ]
    },
    {
      id: "seq-back-to-school",
      name: "Back to School Clean",
      description: "Target families getting back into routines after summer break with a reset cleaning campaign.",
      category: "Seasonal",
      icon: "book",
      color: "purple",
      steps: [
        { subject: "Back to school = back to routine. Start fresh with a clean home!", delayDays: 0, body: "Hi {{customerName}},\n\nSchool's back in session \u2014 and that means schedules, homework, and busy evenings. The last thing you want to worry about is cleaning!\n\nLet us handle it so you can focus on what matters most.\n\nBook your back-to-school clean:\n{{bookingLink}}\n\nHere's to a great school year!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Busy with school? Let us take cleaning off your plate", delayDays: 6, body: "Hi {{customerName}},\n\nWe know back-to-school season can be hectic. Between drop-offs, activities, and work, cleaning often falls to the bottom of the list.\n\nThat's where we come in! Let our team keep your home fresh while you focus on your family.\n\nEasy booking here:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Set up a recurring clean for the school year", delayDays: 12, body: "Hi {{customerName}},\n\nMany of our busiest clients set up recurring cleanings at the start of the school year so they never have to think about it again!\n\nWeekly, bi-weekly, or monthly \u2014 we'll work around your schedule.\n\nBook your recurring plan now:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" }
      ]
    },
    {
      id: "seq-win-back",
      name: "Win Back Inactive Client",
      description: "Re-engage clients who haven't booked in a while with a personalized outreach series.",
      category: "Retention",
      icon: "refresh-cw",
      color: "indigo",
      steps: [
        { subject: "We miss you, {{customerName}}!", delayDays: 0, body: "Hi {{customerName}},\n\nIt's been a while since we've had the pleasure of cleaning your home, and we wanted to reach out!\n\nWe've made some improvements to our service and would love the chance to impress you again.\n\nBook a cleaning at your convenience:\n{{bookingLink}}\n\nWe hope to hear from you soon!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Still thinking about booking? We're here for you", delayDays: 7, body: "Hi {{customerName}},\n\nWe wanted to follow up and let you know we'd love to have you back as a client.\n\nIf there's anything that prevented you from booking last time \u2014 pricing, scheduling, or otherwise \u2014 we'd love to chat and see if we can find a solution that works for you.\n\nJust reply to this email, or book directly here:\n{{bookingLink}}\n\nWarmly,\n{{senderName}}\n{{businessName}}" },
        { subject: "Last check-in from {{businessName}}", delayDays: 14, body: "Hi {{customerName}},\n\nThis is our last check-in, and we promise not to keep nudging you after this!\n\nIf you're ever ready for a fresh, professionally cleaned home, we'd be honored to help.\n\nWe're here whenever you need us:\n{{bookingLink}}\n\nWishing you all the best,\n\n{{senderName}}\n{{businessName}}" }
      ]
    },
    {
      id: "seq-deep-clean-upsell",
      name: "Deep Clean Upsell",
      description: "Upsell regular cleaning clients to a premium deep clean service.",
      category: "Growth",
      icon: "zap",
      color: "yellow",
      steps: [
        { subject: "Have you considered a deep clean? Here's why it's worth it", delayDays: 0, body: "Hi {{customerName}},\n\nYou've been a wonderful regular client, and we truly appreciate your loyalty!\n\nWe wanted to share something that many of our clients find incredibly valuable: our Deep Clean service.\n\nUnlike standard cleanings, our deep clean tackles the hidden spots \u2014 inside appliances, light fixtures, grout, behind furniture, and more. It's a full reset for your home.\n\nMany clients schedule one every season or after major events. Want to see what the difference feels like?\n\nBook a deep clean here:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Your home might be due for a deep clean \u2014 here's how to know", delayDays: 8, body: "Hi {{customerName}},\n\nHere are some signs it might be time for a deep clean:\n- It's been 6+ months since your last one\n- You're noticing buildup in hard-to-reach areas\n- You have guests coming or just moved in/out\n- Your standard clean doesn't feel thorough enough anymore\n\nOur deep clean goes far beyond the surface. Ready to experience it?\n\nBook now:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Ready for your deep clean?", delayDays: 14, body: "Hi {{customerName}},\n\nWe'd love to give your home the full treatment it deserves!\n\nOur deep clean clients consistently tell us it's one of the best decisions they've made. Schedule yours today:\n{{bookingLink}}\n\nLooking forward to hearing from you!\n\n{{senderName}}\n{{businessName}}" }
      ]
    },
    {
      id: "seq-holiday-special",
      name: "Holiday Cleaning Special",
      description: "Promote holiday cleaning packages to help clients prepare their homes for holiday entertaining.",
      category: "Seasonal",
      icon: "gift",
      color: "red",
      steps: [
        { subject: "Holiday entertaining? Let us get your home party-ready!", delayDays: 0, body: "Hi {{customerName}},\n\nThe holiday season is approaching, and if you're planning to host family and friends, there's no better time to get your home looking its absolute best!\n\nOur Holiday Clean package includes all the extra touches that make your home shine for guests \u2014 windows, baseboards, kitchen deep clean, and bathroom detail.\n\nBook your holiday clean:\n{{bookingLink}}\n\nWishing you a wonderful holiday season!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Hosting for the holidays? We've got you covered", delayDays: 6, body: "Hi {{customerName}},\n\nDon't let cleaning be one more thing on your holiday to-do list!\n\nLet our team handle it while you focus on decorating, cooking, and spending time with loved ones.\n\nWe're booking up fast for the holiday season \u2014 secure your spot now:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Final holiday cleaning spots available", delayDays: 12, body: "Hi {{customerName}},\n\nThis is it \u2014 our last available holiday cleaning slots are going fast!\n\nIf you want your home sparkling clean for the holidays, now is the time to book.\n\nDon't miss out:\n{{bookingLink}}\n\nHappy holidays from the entire {{businessName}} team!\n\n{{senderName}}\n{{businessName}}" }
      ]
    },
    {
      id: "seq-new-year",
      name: "New Year Fresh Start",
      description: "Kick off the new year with a campaign encouraging clients to start fresh with a clean home.",
      category: "Seasonal",
      icon: "sunrise",
      color: "cyan",
      steps: [
        { subject: "New year, fresh home \u2014 start 2025 clean!", delayDays: 0, body: "Hi {{customerName}},\n\nHappy New Year!\n\nWhat better way to kick off a fresh start than with a beautifully clean home?\n\nOur New Year Clean-Out package helps you declutter the old and welcome the new with a sparkling, refreshed living space.\n\nBook your new year clean:\n{{bookingLink}}\n\nHere's to a wonderful year ahead!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Still on your new year's list? Let us check 'clean home' off for you", delayDays: 8, body: "Hi {{customerName}},\n\nNew year resolutions are tricky \u2014 but a clean home doesn't have to be!\n\nLet us take this one off your plate so you can focus on the resolutions that matter most.\n\nBook your clean today:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Make clean home a habit this year \u2014 set up a recurring plan", delayDays: 15, body: "Hi {{customerName}},\n\nThe best way to always have a clean home? Schedule it so you never have to think about it!\n\nSet up a recurring cleaning plan with us this January and enjoy a fresh home all year long.\n\nChoose your plan here:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" }
      ]
    },
    {
      id: "seq-referral-request",
      name: "Referral Request Campaign",
      description: "Ask your happiest clients to refer friends and family to grow your business.",
      category: "Growth",
      icon: "users",
      color: "emerald",
      steps: [
        { subject: "Love your clean home? Share the love!", delayDays: 0, body: "Hi {{customerName}},\n\nWe hope you're loving your clean home! We've truly enjoyed working with you.\n\nIf you know anyone who could use a great cleaning service, we'd love a referral. Word of mouth means everything to a small business like ours.\n\nYou can share our booking link with them:\n{{bookingLink}}\n\nThank you so much for your continued support!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Know anyone who needs a cleaner? We appreciate your referrals!", delayDays: 10, body: "Hi {{customerName}},\n\nJust a friendly follow-up! If you have friends, family, or neighbors who are looking for a reliable cleaning service, we'd really appreciate you passing along our name.\n\nThey can book here:\n{{bookingLink}}\n\nThank you for being such a valued client!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "One last ask \u2014 do you know someone who needs a cleaner?", delayDays: 20, body: "Hi {{customerName}},\n\nWe truly value your business and your trust in us. If you've been happy with our service, the biggest compliment you can give us is referring a friend or neighbor.\n\nShare this link with anyone who might benefit:\n{{bookingLink}}\n\nThank you for helping us grow!\n\n{{senderName}}\n{{businessName}}" }
      ]
    },
    {
      id: "seq-summer-refresh",
      name: "Summer Refresh",
      description: "Seasonal campaign for summer cleaning to target clients before vacation season ends.",
      category: "Seasonal",
      icon: "droplet",
      color: "sky",
      steps: [
        { subject: "Beat the summer heat with a clean, fresh home", delayDays: 0, body: "Hi {{customerName}},\n\nSummer is in full swing \u2014 which means more foot traffic, open windows, and all the dust and pollen that comes with it!\n\nOur Summer Refresh clean helps you maintain a cool, clean home all season long.\n\nBook your summer refresh:\n{{bookingLink}}\n\nStay cool and enjoy the season!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Summer's almost over \u2014 get a clean-up before fall hits", delayDays: 14, body: "Hi {{customerName}},\n\nSummer is winding down, and it's a great time for a thorough clean before the fall season begins.\n\nGet ahead of it now while our schedule still has availability:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" },
        { subject: "End of summer clean \u2014 ready to book?", delayDays: 21, body: "Hi {{customerName}},\n\nAs summer comes to a close, treat yourself to a beautifully clean home before the busy fall season kicks off.\n\nBook your end-of-summer clean here:\n{{bookingLink}}\n\nThank you for your business!\n\n{{senderName}}\n{{businessName}}" }
      ]
    },
    {
      id: "seq-move-in-out",
      name: "Move-In / Move-Out Clean",
      description: "Target clients who are moving with a specialized move clean promotion.",
      category: "Promotion",
      icon: "home",
      color: "teal",
      steps: [
        { subject: "Moving soon? We handle the cleaning so you don't have to", delayDays: 0, body: "Hi {{customerName}},\n\nMoving is stressful enough without worrying about cleaning!\n\nOur Move-In / Move-Out cleaning service ensures your old home is spotless for the next occupants and your new home is fresh and ready for you.\n\nWe handle all the deep work \u2014 inside cabinets, appliances, closets, and every corner.\n\nBook your move clean:\n{{bookingLink}}\n\nWishing you a smooth move!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Need a move-out clean? We've got the details covered", delayDays: 5, body: "Hi {{customerName}},\n\nA thorough move-out clean is often required by landlords to get your full deposit back \u2014 and we make sure everything meets that standard.\n\nOur team covers every corner so you can focus on your next chapter.\n\nBook now:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Settled into your new home? Let us give it a fresh start", delayDays: 12, body: "Hi {{customerName}},\n\nHope the move went smoothly! Now that you're settling in, a professional move-in clean is a great way to start fresh in your new space.\n\nWe'd love to be your go-to cleaner in your new home!\n\nBook here:\n{{bookingLink}}\n\nWelcome to your new home!\n\n{{senderName}}\n{{businessName}}" }
      ]
    }
  ];
  app2.get("/api/email-sequences/library", requireAuth, async (_req, res) => {
    return res.json(BUILT_IN_SEQUENCES);
  });
  app2.get("/api/email-sequences/enrollments", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const enrollments = await db.select().from(sequenceEnrollments).where(eq3(sequenceEnrollments.businessId, business.id)).orderBy(desc3(sequenceEnrollments.enrolledAt));
      return res.json(enrollments);
    } catch (err) {
      return res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });
  app2.post("/api/email-sequences/:sequenceId/enroll", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { sequenceId } = req.params;
      const seq = BUILT_IN_SEQUENCES.find((s) => s.id === sequenceId);
      if (!seq) return res.status(404).json({ message: "Sequence not found" });
      const { contacts, notes } = req.body;
      if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        return res.status(400).json({ message: "At least one contact required" });
      }
      const results = [];
      for (const contact of contacts) {
        const { customerName, customerEmail, customerId } = contact;
        if (!customerName || !customerEmail) continue;
        const existing = await db.select().from(sequenceEnrollments).where(and3(
          eq3(sequenceEnrollments.businessId, business.id),
          eq3(sequenceEnrollments.sequenceId, sequenceId),
          eq3(sequenceEnrollments.customerEmail, customerEmail),
          eq3(sequenceEnrollments.status, "active")
        ));
        if (existing.length > 0) continue;
        const [enrollment] = await db.insert(sequenceEnrollments).values({
          businessId: business.id,
          sequenceId,
          customerName,
          customerEmail,
          customerId: customerId || null,
          status: "active",
          currentStep: 0,
          stepsCompleted: [],
          notes: notes || ""
        }).returning();
        results.push(enrollment);
      }
      return res.json({ enrolled: results.length, enrollments: results });
    } catch (err) {
      console.error("Enroll error:", err);
      return res.status(500).json({ message: "Failed to enroll contacts" });
    }
  });
  app2.post("/api/email-sequences/enrollments/:id/send-step", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const [enrollment] = await db.select().from(sequenceEnrollments).where(and3(eq3(sequenceEnrollments.id, req.params.id), eq3(sequenceEnrollments.businessId, business.id)));
      if (!enrollment) return res.status(404).json({ message: "Enrollment not found" });
      if (enrollment.status !== "active") return res.status(400).json({ message: "Enrollment is not active" });
      const seq = BUILT_IN_SEQUENCES.find((s) => s.id === enrollment.sequenceId);
      if (!seq) return res.status(404).json({ message: "Sequence not found" });
      const stepIndex = enrollment.currentStep;
      if (stepIndex >= seq.steps.length) {
        await db.update(sequenceEnrollments).set({ status: "completed", completedAt: /* @__PURE__ */ new Date() }).where(eq3(sequenceEnrollments.id, enrollment.id));
        return res.status(400).json({ message: "All steps already completed" });
      }
      const step = seq.steps[stepIndex];
      const sgApiKey = process.env.SENDGRID_API_KEY;
      if (!sgApiKey) return res.status(500).json({ message: "Email not configured" });
      const bookingLink = business.bookingLink || "";
      const senderName = business.senderName || business.companyName || "Your Cleaning Team";
      const businessName = business.companyName || "Your Cleaning Company";
      const senderEmail = business.contactEmail || "";
      if (!senderEmail) return res.status(400).json({ message: "Business contact email not set" });
      const replacePlaceholders = (text2) => text2.replace(/\{\{customerName\}\}/g, enrollment.customerName).replace(/\{\{businessName\}\}/g, businessName).replace(/\{\{senderName\}\}/g, senderName).replace(/\{\{bookingLink\}\}/g, bookingLink);
      const subject = replacePlaceholders(step.subject);
      const bodyText = replacePlaceholders(step.body);
      const htmlBody = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;line-height:1.6;">${bodyText.replace(/\n/g, "<br>")}</div>`;
      const seqEmailPayload = {
        personalizations: [{ to: [{ email: enrollment.customerEmail, name: enrollment.customerName }] }],
        from: { email: senderEmail, name: senderName },
        subject,
        content: [{ type: "text/plain", value: bodyText }, { type: "text/html", value: htmlBody }]
      };
      const { attachmentFileIds: seqAttachIds } = req.body;
      if (seqAttachIds && Array.isArray(seqAttachIds) && seqAttachIds.length > 0) {
        const fsLib2 = await import("fs");
        const pathLib2 = await import("path");
        const allBizFiles = await db.select().from(businessFiles).where(eq3(businessFiles.businessId, business.id));
        const requestedFiles = allBizFiles.filter((f) => seqAttachIds.includes(f.id));
        const sgFileAttachments = [];
        for (const f of requestedFiles) {
          try {
            const absPath = pathLib2.join(process.cwd(), f.fileUrl);
            const buf = fsLib2.readFileSync(absPath);
            sgFileAttachments.push({
              content: buf.toString("base64"),
              filename: f.originalName,
              type: f.fileType || "application/octet-stream",
              disposition: "attachment"
            });
          } catch (e) {
            console.error("Failed to read sequence attachment:", f.fileUrl, e);
          }
        }
        if (sgFileAttachments.length > 0) {
          seqEmailPayload.attachments = sgFileAttachments;
        }
      }
      const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sgApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(seqEmailPayload)
      });
      if (!sgRes.ok) {
        const errText = await sgRes.text();
        console.error("SendGrid sequence error:", sgRes.status, errText);
        return res.status(502).json({ message: "Failed to send email" });
      }
      const completedSteps = Array.isArray(enrollment.stepsCompleted) ? enrollment.stepsCompleted : [];
      const newCompleted = [...completedSteps, { stepIndex, sentAt: (/* @__PURE__ */ new Date()).toISOString(), subject }];
      const newStep = stepIndex + 1;
      const isCompleted = newStep >= seq.steps.length;
      await db.update(sequenceEnrollments).set({
        currentStep: newStep,
        stepsCompleted: newCompleted,
        lastSentAt: /* @__PURE__ */ new Date(),
        status: isCompleted ? "completed" : "active",
        completedAt: isCompleted ? /* @__PURE__ */ new Date() : null
      }).where(eq3(sequenceEnrollments.id, enrollment.id));
      return res.json({ message: "Email sent", stepIndex, isCompleted });
    } catch (err) {
      console.error("Send step error:", err);
      return res.status(500).json({ message: "Failed to send step" });
    }
  });
  app2.patch("/api/email-sequences/enrollments/:id/status", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { status } = req.body;
      if (!["active", "paused", "cancelled"].includes(status)) return res.status(400).json({ message: "Invalid status" });
      const [updated] = await db.update(sequenceEnrollments).set({ status }).where(and3(eq3(sequenceEnrollments.id, req.params.id), eq3(sequenceEnrollments.businessId, business.id))).returning();
      if (!updated) return res.status(404).json({ message: "Enrollment not found" });
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ message: "Failed to update status" });
    }
  });
  app2.delete("/api/email-sequences/enrollments/:id", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      await db.delete(sequenceEnrollments).where(and3(eq3(sequenceEnrollments.id, req.params.id), eq3(sequenceEnrollments.businessId, business.id)));
      return res.json({ message: "Deleted" });
    } catch (err) {
      return res.status(500).json({ message: "Failed to delete enrollment" });
    }
  });
  const { runPricingEngine: runPricingEngine2, buildDefaultRulesFromQuestionnaire: buildDefaultRulesFromQuestionnaire2 } = await Promise.resolve().then(() => (init_pricingEngine(), pricingEngine_exports));
  const {
    importedJobs: importedJobs2,
    pricingQuestionnaires: pricingQuestionnaires2,
    pricingRules: pricingRules2,
    pricingAnalyses: pricingAnalyses2,
    publishedPricingProfiles: publishedPricingProfiles2
  } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  app2.get("/api/pricing/jobs", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const jobs2 = await db.select().from(importedJobs2).where(eq3(importedJobs2.businessId, business.id)).orderBy(desc3(importedJobs2.createdAt));
      return res.json(jobs2);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  });
  app2.post("/api/pricing/jobs", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { customerName, serviceType, sqft, beds, baths, halfBaths, conditionLevel, pets, frequency, addOns, zipCode, estimatedHours, crewSize, finalPrice, won, notes } = req.body;
      if (finalPrice === void 0 || finalPrice === null) return res.status(400).json({ message: "finalPrice is required" });
      const [job] = await db.insert(importedJobs2).values({
        businessId: business.id,
        customerName: customerName || "",
        serviceType: serviceType || "standard",
        sqft: sqft ? parseInt(sqft) : null,
        beds: beds ? parseInt(beds) : null,
        baths: baths ? parseFloat(baths) : null,
        halfBaths: halfBaths ? parseInt(halfBaths) : 0,
        conditionLevel: conditionLevel || "standard",
        pets: pets === true || pets === "true",
        frequency: frequency || "one-time",
        addOns: addOns || [],
        zipCode: zipCode || "",
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        crewSize: crewSize ? parseInt(crewSize) : 1,
        finalPrice: parseFloat(finalPrice),
        won: won !== false && won !== "false",
        notes: notes || "",
        source: "manual"
      }).returning();
      return res.json(job);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  });
  app2.put("/api/pricing/jobs/:id", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const updates = {};
      const fields = ["customerName", "serviceType", "sqft", "beds", "baths", "halfBaths", "conditionLevel", "pets", "frequency", "addOns", "zipCode", "estimatedHours", "crewSize", "finalPrice", "won", "notes"];
      for (const f of fields) {
        if (req.body[f] !== void 0) updates[f] = req.body[f];
      }
      if (updates.sqft) updates.sqft = parseInt(updates.sqft);
      if (updates.beds) updates.beds = parseInt(updates.beds);
      if (updates.baths) updates.baths = parseFloat(updates.baths);
      if (updates.halfBaths) updates.halfBaths = parseInt(updates.halfBaths);
      if (updates.finalPrice) updates.finalPrice = parseFloat(updates.finalPrice);
      const [updated] = await db.update(importedJobs2).set(updates).where(and3(eq3(importedJobs2.id, req.params.id), eq3(importedJobs2.businessId, business.id))).returning();
      return res.json(updated);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  });
  app2.delete("/api/pricing/jobs/:id", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      await db.delete(importedJobs2).where(and3(eq3(importedJobs2.id, req.params.id), eq3(importedJobs2.businessId, business.id)));
      return res.json({ message: "Deleted" });
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  });
  app2.get("/api/pricing/questionnaire", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const [q] = await db.select().from(pricingQuestionnaires2).where(eq3(pricingQuestionnaires2.businessId, business.id)).orderBy(desc3(pricingQuestionnaires2.createdAt)).limit(1);
      return res.json(q || null);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  });
  app2.post("/api/pricing/questionnaire", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const [existing] = await db.select().from(pricingQuestionnaires2).where(eq3(pricingQuestionnaires2.businessId, business.id)).limit(1);
      const data = {
        minJobPrice: parseFloat(req.body.minJobPrice) || 100,
        targetHourlyRevenue: parseFloat(req.body.targetHourlyRevenue) || 50,
        preferredCrewSize: parseInt(req.body.preferredCrewSize) || 1,
        suppliesIncluded: req.body.suppliesIncluded !== false && req.body.suppliesIncluded !== "false",
        recurringDiscount: parseFloat(req.body.recurringDiscount) || 10,
        deepCleanMultiplier: parseFloat(req.body.deepCleanMultiplier) || 1.5,
        moveOutMultiplier: parseFloat(req.body.moveOutMultiplier) || 1.75,
        petSurcharge: parseFloat(req.body.petSurcharge) || 25,
        travelSurcharge: parseFloat(req.body.travelSurcharge) || 0,
        serviceAreas: req.body.serviceAreas || [],
        addOnPricing: req.body.addOnPricing || [],
        pricingByCondition: req.body.pricingByCondition !== false,
        pricingByFrequency: req.body.pricingByFrequency !== false,
        pricingBySqft: req.body.pricingBySqft !== false,
        neverGoBelow: parseFloat(req.body.neverGoBelow) || 80,
        notes: req.body.notes || "",
        updatedAt: /* @__PURE__ */ new Date()
      };
      if (existing) {
        const [updated] = await db.update(pricingQuestionnaires2).set(data).where(eq3(pricingQuestionnaires2.id, existing.id)).returning();
        return res.json(updated);
      } else {
        const [created] = await db.insert(pricingQuestionnaires2).values({ businessId: business.id, ...data }).returning();
        return res.json(created);
      }
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  });
  app2.post("/api/pricing/analyze", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const jobs2 = await db.select().from(importedJobs2).where(eq3(importedJobs2.businessId, business.id));
      if (jobs2.length < 3) return res.status(400).json({ message: "Upload at least 3 past jobs before running analysis." });
      const [q] = await db.select().from(pricingQuestionnaires2).where(eq3(pricingQuestionnaires2.businessId, business.id)).limit(1);
      const [analysis] = await db.insert(pricingAnalyses2).values({
        businessId: business.id,
        status: "running",
        jobCount: jobs2.length
      }).returning();
      const jobSummary = jobs2.map(
        (j) => `- ${j.customerName || "Customer"}: ${j.serviceType}, ${j.sqft || "?"}sqft, ${j.beds}bd/${j.baths}ba, condition=${j.conditionLevel}, pets=${j.pets}, frequency=${j.frequency}, price=$${j.finalPrice}, won=${j.won}`
      ).join("\n");
      const questionnaireSummary = q ? `
Questionnaire:
- Min job price: $${q.minJobPrice}
- Target hourly revenue: $${q.targetHourlyRevenue}/hr
- Preferred crew size: ${q.preferredCrewSize}
- Deep clean multiplier: ${q.deepCleanMultiplier}x
- Move-out multiplier: ${q.moveOutMultiplier}x
- Pet surcharge: $${q.petSurcharge}
- Recurring discount: ${q.recurringDiscount}%
- Never go below: $${q.neverGoBelow}
` : "No questionnaire completed.";
      const systemPrompt = `You are a pricing analyst for a residential cleaning business. Analyze the past jobs and questionnaire to produce structured pricing insights. Return ONLY valid JSON matching the schema exactly.`;
      const userPrompt = `Analyze these ${jobs2.length} past jobs for a cleaning business:

${jobSummary}

${questionnaireSummary}

Return a JSON object with this exact structure:
{
  "inferredSummary": {
    "avgPricePerSqft": number,
    "avgStandardPrice": number,
    "avgDeepCleanPrice": number,
    "avgMoveOutPrice": number,
    "estimatedHourlyRate": number,
    "pricingStyle": "string describing overall approach",
    "observations": ["array of 3-5 specific observations about current pricing patterns"]
  },
  "revenueOpportunities": [
    {
      "title": "short title",
      "description": "explanation in plain English",
      "estimatedImpact": "e.g. +$15-30 per job",
      "confidence": "high|medium|low",
      "dataPoints": "what data supports this suggestion"
    }
  ],
  "recommendedRules": [
    {
      "label": "rule label",
      "ruleType": "sqft_range|bed_adjustment|bath_adjustment|condition_multiplier|pet_surcharge|frequency_discount|minimum_floor|base_by_service",
      "inputVariables": ["array of variable names"],
      "formula": {"type": "fixed|per_unit|multiplier|range_lookup|percent_discount", "value": number_or_object},
      "explanation": "plain English explanation",
      "source": "ai-recommended",
      "reasoning": "why this rule was inferred from the data"
    }
  ]
}

Focus on real patterns in the data. Flag jobs that appear underpriced relative to their size/complexity. Identify missing surcharges. Be specific.`;
      let rawOutput = "";
      let parsedOutput = {};
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3
        });
        rawOutput = completion.choices[0]?.message?.content || "{}";
        parsedOutput = JSON.parse(rawOutput);
      } catch (aiErr) {
        console.error("AI analysis error:", aiErr.message);
        const avgPrice = jobs2.reduce((s, j) => s + j.finalPrice, 0) / jobs2.length;
        const standardJobs = jobs2.filter((j) => j.serviceType === "standard");
        const deepJobs = jobs2.filter((j) => j.serviceType === "deep-clean");
        const sqftJobs = jobs2.filter((j) => j.sqft && j.sqft > 0);
        const avgSqft = sqftJobs.length ? sqftJobs.reduce((s, j) => s + (j.sqft || 0), 0) / sqftJobs.length : 0;
        const avgPricePerSqft = sqftJobs.length ? sqftJobs.reduce((s, j) => s + j.finalPrice / (j.sqft || 1), 0) / sqftJobs.length : 0;
        parsedOutput = {
          inferredSummary: {
            avgPricePerSqft: Math.round(avgPricePerSqft * 100) / 100,
            avgStandardPrice: standardJobs.length ? Math.round(standardJobs.reduce((s, j) => s + j.finalPrice, 0) / standardJobs.length) : avgPrice,
            avgDeepCleanPrice: deepJobs.length ? Math.round(deepJobs.reduce((s, j) => s + j.finalPrice, 0) / deepJobs.length) : Math.round(avgPrice * 1.5),
            avgMoveOutPrice: Math.round(avgPrice * 1.75),
            estimatedHourlyRate: q?.targetHourlyRevenue || 50,
            pricingStyle: "Primarily based on service type and home size",
            observations: [
              `Average job price is $${Math.round(avgPrice)}`,
              `${standardJobs.length} standard cleans, ${deepJobs.length} deep cleans analyzed`,
              avgSqft > 0 ? `Average home size is ${Math.round(avgSqft)} sq ft at $${avgPricePerSqft.toFixed(2)}/sqft` : "Square footage data not consistently captured",
              jobs2.filter((j) => j.pets).length > 0 ? `${jobs2.filter((j) => j.pets).length} pet homes found \u2014 ensure pet surcharge is applied` : "No pet homes in sample"
            ]
          },
          revenueOpportunities: [
            {
              title: "Standardize Pet Surcharges",
              description: "Some pet homes may not be consistently charged a surcharge. A flat $25-35 pet surcharge protects your margins on these jobs.",
              estimatedImpact: "+$25-35 per pet home job",
              confidence: "high",
              dataPoints: `${jobs2.filter((j) => j.pets).length} pet home jobs found in your history`
            },
            {
              title: "Review Large Home Pricing",
              description: "Homes over 2,000 sqft may not be priced proportionally to the time required.",
              estimatedImpact: "+$20-50 per large home",
              confidence: "medium",
              dataPoints: `${jobs2.filter((j) => (j.sqft || 0) > 2e3).length} large homes found in history`
            }
          ],
          recommendedRules: []
        };
        rawOutput = JSON.stringify(parsedOutput);
      }
      await db.update(pricingAnalyses2).set({
        status: "completed",
        inferredSummary: parsedOutput.inferredSummary || {},
        revenueOpportunities: parsedOutput.revenueOpportunities || [],
        recommendedRules: parsedOutput.recommendedRules || [],
        rawAiOutput: rawOutput
      }).where(eq3(pricingAnalyses2.id, analysis.id));
      const existingRules = await db.select().from(pricingRules2).where(eq3(pricingRules2.businessId, business.id));
      if (existingRules.length === 0 && q) {
        const defaultRules = buildDefaultRulesFromQuestionnaire2(q);
        for (let i = 0; i < defaultRules.length; i++) {
          await db.insert(pricingRules2).values({ businessId: business.id, ...defaultRules[i] });
        }
        const aiRules = parsedOutput.recommendedRules || [];
        for (let i = 0; i < aiRules.length && i < 3; i++) {
          const r = aiRules[i];
          await db.insert(pricingRules2).values({
            businessId: business.id,
            label: r.label || "AI Recommended Rule",
            ruleType: r.ruleType || "minimum_floor",
            inputVariables: r.inputVariables || [],
            formula: r.formula || { type: "fixed", value: 0 },
            explanation: r.explanation || "",
            source: "ai-recommended",
            active: false,
            sortOrder: 100 + i
          });
        }
      }
      const [finalAnalysis] = await db.select().from(pricingAnalyses2).where(eq3(pricingAnalyses2.id, analysis.id));
      return res.json(finalAnalysis);
    } catch (e) {
      console.error("Pricing analysis error:", e.message);
      return res.status(500).json({ message: e.message });
    }
  });
  app2.get("/api/pricing/analysis", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const [analysis] = await db.select().from(pricingAnalyses2).where(eq3(pricingAnalyses2.businessId, business.id)).orderBy(desc3(pricingAnalyses2.createdAt)).limit(1);
      return res.json(analysis || null);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  });
  app2.get("/api/pricing/rules", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const rules = await db.select().from(pricingRules2).where(eq3(pricingRules2.businessId, business.id)).orderBy(pricingRules2.sortOrder, pricingRules2.createdAt);
      return res.json(rules);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  });
  app2.put("/api/pricing/rules/:id", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const updates = { updatedAt: /* @__PURE__ */ new Date() };
      const allowed = ["label", "explanation", "formula", "active", "sortOrder", "source"];
      for (const f of allowed) {
        if (req.body[f] !== void 0) updates[f] = req.body[f];
      }
      const [updated] = await db.update(pricingRules2).set(updates).where(and3(eq3(pricingRules2.id, req.params.id), eq3(pricingRules2.businessId, business.id))).returning();
      return res.json(updated);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  });
  app2.delete("/api/pricing/rules/:id", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      await db.delete(pricingRules2).where(and3(eq3(pricingRules2.id, req.params.id), eq3(pricingRules2.businessId, business.id)));
      return res.json({ message: "Deleted" });
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  });
  app2.post("/api/pricing/publish", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const rules = await db.select().from(pricingRules2).where(and3(eq3(pricingRules2.businessId, business.id), eq3(pricingRules2.active, true))).orderBy(pricingRules2.sortOrder);
      if (rules.length === 0) return res.status(400).json({ message: "No active rules to publish." });
      const [lastProfile] = await db.select().from(publishedPricingProfiles2).where(eq3(publishedPricingProfiles2.businessId, business.id)).orderBy(desc3(publishedPricingProfiles2.publishedAt)).limit(1);
      const version = lastProfile ? (lastProfile.version || 1) + 1 : 1;
      const [profile] = await db.insert(publishedPricingProfiles2).values({
        businessId: business.id,
        version,
        rules,
        changeSummary: req.body.changeSummary || `Published ${rules.length} pricing rules`
      }).returning();
      return res.json(profile);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  });
  app2.get("/api/pricing/profile", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const [profile] = await db.select().from(publishedPricingProfiles2).where(eq3(publishedPricingProfiles2.businessId, business.id)).orderBy(desc3(publishedPricingProfiles2.publishedAt)).limit(1);
      return res.json(profile || null);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  });
  app2.post("/api/pricing/calculate", requireAuth, async (req, res) => {
    try {
      const business = await getBusinessByOwner(req.session.userId);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const rules = await db.select().from(pricingRules2).where(and3(eq3(pricingRules2.businessId, business.id), eq3(pricingRules2.active, true))).orderBy(pricingRules2.sortOrder);
      if (rules.length === 0) return res.status(400).json({ message: "No pricing rules found. Set up and publish your pricing first." });
      const job = req.body;
      const result = runPricingEngine2(job, rules);
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  });
  return httpServer;
}
async function dispatchWebhook(businessId, userId, eventType, data) {
  try {
    const endpoints = await getActiveWebhookEndpointsForBusiness(businessId);
    if (endpoints.length === 0) return;
    const matchingEndpoints = endpoints.filter((ep) => {
      const enabled = ep.enabledEvents || [];
      return enabled.length === 0 || enabled.includes(eventType);
    });
    if (matchingEndpoints.length === 0) return;
    const event = await createWebhookEvent({ userId, businessId, eventType, payloadJson: data });
    const payload = {
      event_type: eventType,
      event_id: event.id,
      occurred_at: (/* @__PURE__ */ new Date()).toISOString(),
      account_id: businessId,
      data
    };
    const body = JSON.stringify(payload);
    const keys = await getApiKeysByUserId(userId);
    const activeKey = keys[0];
    const signature = activeKey ? crypto2.createHmac("sha256", activeKey.keyHash).update(body).digest("hex") : "no-api-key";
    for (const ep of matchingEndpoints) {
      deliverWebhook(ep, event.id, body, signature, 1);
    }
  } catch (e) {
    console.error("Webhook dispatch error:", e);
  }
}
async function deliverWebhook(endpoint, eventId, body, signature, attempt) {
  const delivery = await createWebhookDelivery({
    webhookEventId: eventId,
    endpointId: endpoint.id,
    attemptNumber: attempt,
    statusCode: null,
    responseBodyExcerpt: null,
    nextRetryAt: null,
    deliveredAt: null
  });
  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-QP-Signature": signature },
      body,
      signal: AbortSignal.timeout(15e3)
    });
    const responseText = await response.text().catch(() => "");
    const excerpt = responseText.slice(0, 500);
    if (response.ok) {
      await updateWebhookDelivery(delivery.id, { statusCode: response.status, responseBodyExcerpt: excerpt, deliveredAt: /* @__PURE__ */ new Date() });
    } else {
      const retryDelays = [6e4, 3e5, 9e5];
      const nextRetry = attempt < 3 ? new Date(Date.now() + retryDelays[attempt - 1]) : null;
      await updateWebhookDelivery(delivery.id, { statusCode: response.status, responseBodyExcerpt: excerpt, nextRetryAt: nextRetry });
      if (nextRetry) {
        setTimeout(() => deliverWebhook(endpoint, eventId, body, signature, attempt + 1), retryDelays[attempt - 1]);
      }
    }
  } catch (err) {
    const retryDelays = [6e4, 3e5, 9e5];
    const nextRetry = attempt < 3 ? new Date(Date.now() + retryDelays[attempt - 1]) : null;
    await updateWebhookDelivery(delivery.id, { statusCode: 0, responseBodyExcerpt: err.message?.slice(0, 500), nextRetryAt: nextRetry });
    if (nextRetry) {
      setTimeout(() => deliverWebhook(endpoint, eventId, body, signature, attempt + 1), retryDelays[attempt - 1]);
    }
  }
}
async function initQBOTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS qbo_connections (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id),
        realm_id TEXT,
        access_token_encrypted TEXT,
        refresh_token_encrypted TEXT,
        access_token_expires_at TIMESTAMP,
        refresh_token_last_rotated_at TIMESTAMP,
        connected_at TIMESTAMP,
        disconnected_at TIMESTAMP,
        scopes TEXT,
        environment TEXT NOT NULL DEFAULT 'production',
        status TEXT NOT NULL DEFAULT 'disconnected',
        last_error TEXT,
        company_name TEXT,
        auto_create_invoice BOOLEAN NOT NULL DEFAULT false
      );
      CREATE TABLE IF NOT EXISTS qbo_customer_mappings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        qp_customer_id VARCHAR NOT NULL REFERENCES customers(id),
        qbo_customer_id TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS qbo_invoice_links (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        quote_id VARCHAR NOT NULL REFERENCES quotes(id),
        qbo_invoice_id TEXT NOT NULL,
        qbo_doc_number TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, quote_id)
      );
      CREATE TABLE IF NOT EXISTS qbo_sync_log (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        quote_id VARCHAR,
        action TEXT NOT NULL,
        request_summary JSONB,
        response_summary JSONB,
        status TEXT NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  } catch (e) {
    console.warn("QBO tables init:", e.message);
  }
}
initQBOTables();
async function initJobberTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobber_connections (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id),
        access_token_encrypted TEXT,
        refresh_token_encrypted TEXT,
        access_token_expires_at TIMESTAMP,
        connected_at TIMESTAMP,
        disconnected_at TIMESTAMP,
        scopes TEXT,
        status TEXT NOT NULL DEFAULT 'disconnected',
        last_error TEXT,
        auto_create_job_on_quote_accept BOOLEAN NOT NULL DEFAULT false
      );
      CREATE TABLE IF NOT EXISTS jobber_client_mappings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        qp_customer_id VARCHAR NOT NULL REFERENCES customers(id),
        jobber_client_id TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, qp_customer_id)
      );
      CREATE TABLE IF NOT EXISTS jobber_job_links (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        quote_id VARCHAR NOT NULL REFERENCES quotes(id),
        jobber_client_id TEXT NOT NULL,
        jobber_job_id TEXT NOT NULL,
        jobber_job_number TEXT,
        sync_status TEXT NOT NULL DEFAULT 'success',
        sync_trigger TEXT NOT NULL DEFAULT 'manual',
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, quote_id)
      );
      CREATE TABLE IF NOT EXISTS jobber_sync_log (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        quote_id VARCHAR,
        action TEXT NOT NULL,
        request_summary JSONB,
        response_summary JSONB,
        status TEXT NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  } catch (e) {
    console.warn("Jobber tables init:", e.message);
  }
}
initJobberTables();
async function initOAuthStatesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS oauth_states (
        state VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        provider VARCHAR NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`DELETE FROM oauth_states WHERE created_at < NOW() - INTERVAL '1 hour'`);
  } catch (e) {
    console.warn("OAuth states table init:", e.message);
  }
}
initOAuthStatesTable();
(async () => {
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_consent_accepted_at TIMESTAMP`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_version TEXT`);
    await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS started_at TIMESTAMP`);
    await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`);
    await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS update_token VARCHAR UNIQUE`);
    await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS detailed_status TEXT NOT NULL DEFAULT 'scheduled'`);
    await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS en_route_at TIMESTAMP`);
    await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS service_started_at TIMESTAMP`);
    await pool.query(`ALTER TABLE job_status_history ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false`);
    await pool.query(`ALTER TABLE job_checklist_items ADD COLUMN IF NOT EXISTS room_group TEXT NOT NULL DEFAULT 'General'`);
    await pool.query(`ALTER TABLE job_checklist_items ADD COLUMN IF NOT EXISTS customer_visible BOOLEAN NOT NULL DEFAULT true`);
    await pool.query(`ALTER TABLE job_photos ADD COLUMN IF NOT EXISTS customer_visible BOOLEAN NOT NULL DEFAULT true`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_status_history (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id VARCHAR NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_notes (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id VARCHAR NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        customer_visible BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  } catch (e) {
    console.warn("Job columns migration:", e.message);
  }
  try {
    await pool.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP`);
    await pool.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_type TEXT NOT NULL DEFAULT 'fixed'`);
    await pool.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMP`);
  } catch (e) {
    console.warn("Quote columns migration:", e.message);
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoice_packets (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id VARCHAR REFERENCES quotes(id),
        business_id VARCHAR REFERENCES businesses(id),
        user_id VARCHAR REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'generated',
        line_items_json JSONB,
        customer_info_json JSONB,
        totals_json JSONB,
        invoice_number TEXT,
        pdf_html TEXT,
        csv_text TEXT,
        plain_text TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS calendar_event_stubs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id VARCHAR REFERENCES quotes(id),
        user_id VARCHAR REFERENCES users(id),
        business_id VARCHAR REFERENCES businesses(id),
        start_datetime TIMESTAMP NOT NULL,
        end_datetime TIMESTAMP NOT NULL,
        location TEXT,
        title TEXT NOT NULL,
        description TEXT,
        ics_data TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        key_hash TEXT NOT NULL,
        key_prefix TEXT,
        label TEXT NOT NULL DEFAULT 'API Key',
        is_active BOOLEAN NOT NULL DEFAULT true,
        last_used_at TIMESTAMP,
        rotated_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_endpoints (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        url TEXT NOT NULL,
        events TEXT[] NOT NULL DEFAULT '{}',
        is_active BOOLEAN NOT NULL DEFAULT true,
        secret TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        endpoint_id VARCHAR NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        payload JSONB,
        status TEXT NOT NULL DEFAULT 'pending',
        response_code INTEGER,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  } catch (e) {
    console.warn("Additional tables migration:", e.message);
  }
})();
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS toolkit_leads (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL,
        first_name TEXT,
        resource TEXT,
        source TEXT NOT NULL DEFAULT 'toolkit',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_toolkit_leads_email ON toolkit_leads (email)`);
  } catch (e) {
    console.warn("Toolkit leads migration:", e.message);
  }
})();
async function createQBOInvoiceForQuote(userId, quoteId) {
  const existingLink = await pool.query(
    `SELECT qbo_invoice_id, qbo_doc_number FROM qbo_invoice_links WHERE user_id = $1 AND quote_id = $2`,
    [userId, quoteId]
  );
  if (existingLink.rows.length > 0) {
    return { qboInvoiceId: existingLink.rows[0].qbo_invoice_id, docNumber: existingLink.rows[0].qbo_doc_number };
  }
  const client = new QBOClient(userId);
  const conn = await client.loadConnection();
  if (!conn || conn.status !== "connected") return null;
  const quote = await getQuoteById(quoteId);
  if (!quote) throw new Error("Quote not found");
  let customer = null;
  if (quote.customerId) {
    customer = await getCustomerById(quote.customerId);
  }
  let qboCustomerId = null;
  if (customer) {
    const mapping = await pool.query(
      `SELECT qbo_customer_id FROM qbo_customer_mappings WHERE user_id = $1 AND qp_customer_id = $2`,
      [userId, customer.id]
    );
    if (mapping.rows.length > 0) {
      qboCustomerId = mapping.rows[0].qbo_customer_id;
    } else {
      let found = null;
      if (customer.email) {
        found = await client.queryCustomer(customer.email);
      }
      if (!found && customer.name) {
        found = await client.queryCustomer(void 0, customer.name);
      }
      if (found) {
        qboCustomerId = found.Id;
      } else {
        const newCust = await client.createCustomer(
          customer.name || "Unknown Customer",
          customer.email || void 0,
          customer.phone || void 0,
          customer.address || void 0
        );
        qboCustomerId = newCust.Id;
        await logSync(userId, quoteId, "create_customer", { name: customer.name }, { qboId: newCust.Id }, "ok");
      }
      await pool.query(
        `INSERT INTO qbo_customer_mappings (id, user_id, qp_customer_id, qbo_customer_id) VALUES (gen_random_uuid(), $1, $2, $3)`,
        [userId, customer.id, qboCustomerId]
      );
    }
  } else {
    const defaultCust = await client.queryCustomer(void 0, "QuotePro Customer");
    if (defaultCust) {
      qboCustomerId = defaultCust.Id;
    } else {
      const newCust = await client.createCustomer("QuotePro Customer");
      qboCustomerId = newCust.Id;
    }
  }
  if (!qboCustomerId) throw new Error("Could not resolve QBO customer");
  const lineItems = await pool.query(`SELECT * FROM line_items WHERE quote_id = $1`, [quoteId]);
  const lines = [];
  if (lineItems.rows.length > 0) {
    for (const li of lineItems.rows) {
      lines.push({
        description: `${li.label || li.type || "Cleaning Service"}${li.description ? " - " + li.description : ""}`,
        amount: parseFloat(li.price) || 0
      });
    }
  } else {
    const totalAmount = parseFloat(quote.total) || 0;
    const desc4 = quote.propertyDetails ? `Cleaning Services - ${quote.propertyDetails?.sqft || ""} sqft` : "Cleaning Services";
    lines.push({ description: desc4, amount: totalAmount });
  }
  const privateNote = `QuotePro Quote #${quote.quoteNumber || quoteId}`;
  const txnDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const invoice = await client.createInvoice(qboCustomerId, lines, privateNote, txnDate);
  await pool.query(
    `INSERT INTO qbo_invoice_links (id, user_id, quote_id, qbo_invoice_id, qbo_doc_number)
     VALUES (gen_random_uuid(), $1, $2, $3, $4)
     ON CONFLICT (user_id, quote_id) DO NOTHING`,
    [userId, quoteId, invoice.Id, invoice.DocNumber || null]
  );
  await logSync(userId, quoteId, "create_invoice", { quoteId, lines: lines.length }, { invoiceId: invoice.Id, docNumber: invoice.DocNumber }, "ok");
  return { qboInvoiceId: invoice.Id, docNumber: invoice.DocNumber || null };
}
function generateICS(opts) {
  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escapeICS = (s) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//QuotePro//EN",
    "BEGIN:VEVENT",
    `UID:${opts.id}@quotepro.app`,
    `DTSTART:${fmt(opts.start)}`,
    `DTEND:${fmt(opts.end)}`,
    `SUMMARY:${escapeICS(opts.title)}`,
    `DESCRIPTION:${escapeICS(opts.description)}`,
    `LOCATION:${escapeICS(opts.location)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}
function buildGoogleCalendarUrl(opts) {
  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${fmt(opts.start)}/${fmt(opts.end)}`,
    details: opts.description,
    location: opts.location
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
function generateInvoicePdfHtml(opts) {
  const { invoiceNumber, business, customerInfo, items, totals, notes, primaryColor, quoteDate } = opts;
  const itemRows = items.map(
    (item) => `<tr><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0">${item.name}</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:center">${item.quantity}</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:right">$${item.unitPrice.toFixed(2)}</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:right">$${item.amount.toFixed(2)}</td></tr>`
  ).join("");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:40px;color:#1E293B;font-size:14px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
.company{font-size:20px;font-weight:700;color:${primaryColor}}
.invoice-label{font-size:28px;font-weight:700;color:#0F172A;text-align:right}
.invoice-meta{text-align:right;color:#64748B;font-size:13px;margin-top:4px}
.section{margin-bottom:24px}
.section-title{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748B;margin-bottom:8px;font-weight:600}
table{width:100%;border-collapse:collapse}
th{background:${primaryColor};color:#fff;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.5px}
th:nth-child(2),th:nth-child(3),th:nth-child(4){text-align:right}
th:nth-child(2){text-align:center}
.totals{margin-top:20px;text-align:right}
.totals .row{display:flex;justify-content:flex-end;gap:40px;padding:4px 12px}
.totals .total-row{font-weight:700;font-size:18px;color:${primaryColor};border-top:2px solid ${primaryColor};padding-top:8px;margin-top:4px}
.notes{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-top:24px;font-size:13px;color:#475569}
.disclaimer{margin-top:32px;text-align:center;color:#94A3B8;font-size:11px;border-top:1px solid #E2E8F0;padding-top:16px}
</style></head><body>
<div class="header">
<div><div class="company">${business.companyName || "QuotePro"}</div>
${business.email ? `<div style="color:#64748B;font-size:13px;margin-top:4px">${business.email}</div>` : ""}
${business.phone ? `<div style="color:#64748B;font-size:13px">${business.phone}</div>` : ""}
${business.address ? `<div style="color:#64748B;font-size:13px">${business.address}</div>` : ""}
</div>
<div><div class="invoice-label">INVOICE</div><div class="invoice-meta">${invoiceNumber}<br>Date: ${quoteDate}</div></div>
</div>
<div class="section"><div class="section-title">Bill To</div>
<div style="font-weight:600">${customerInfo.displayName}</div>
${customerInfo.email ? `<div style="color:#64748B">${customerInfo.email}</div>` : ""}
${customerInfo.phone ? `<div style="color:#64748B">${customerInfo.phone}</div>` : ""}
${customerInfo.serviceAddress ? `<div style="color:#64748B">${customerInfo.serviceAddress}</div>` : ""}
</div>
<table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${itemRows}</tbody></table>
<div class="totals">
<div class="row"><span>Subtotal:</span><span>$${totals.subtotal.toFixed(2)}</span></div>
${totals.tax > 0 ? `<div class="row"><span>Tax:</span><span>$${totals.tax.toFixed(2)}</span></div>` : ""}
<div class="row total-row"><span>Total:</span><span>$${totals.total.toFixed(2)}</span></div>
</div>
${notes ? `<div class="notes"><strong>Notes:</strong> ${notes}</div>` : ""}
<div class="disclaimer">Designed for easy entry/import into QuickBooks. Not a live sync.<br>Generated by QuotePro</div>
</body></html>`;
}
async function db_getBusinessById(businessId) {
  const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
  const { businesses: businesses2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
  const { eq: eq4 } = await import("drizzle-orm");
  const [b] = await db2.select().from(businesses2).where(eq4(businesses2.id, businessId));
  return b;
}
function formatUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    subscriptionTier: u.subscriptionTier || "free",
    createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null
  };
}
function getQuickQuoteHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Get Your Instant Quote</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC;color:#0F172A;min-height:100vh}
.container{max-width:480px;margin:0 auto;padding:20px}
.header{text-align:center;padding:32px 0 24px}
.header h1{font-size:24px;font-weight:700;color:#007AFF;margin-bottom:4px}
.header p{font-size:14px;color:#64748B}
.card{background:#fff;border-radius:16px;padding:24px;margin-bottom:16px}
.card h2{font-size:18px;font-weight:600;margin-bottom:16px}
label{display:block;font-size:13px;font-weight:500;color:#64748B;margin-bottom:6px}
input,select{width:100%;padding:12px;border:1px solid #E2E8F0;border-radius:10px;font-size:15px;margin-bottom:14px;background:#F8FAFC;color:#0F172A;outline:none;transition:border-color .2s}
input:focus,select:focus{border-color:#007AFF}
.row{display:flex;gap:12px}
.row>div{flex:1}
.btn{width:100%;padding:14px;background:#007AFF;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;transition:opacity .2s}
.btn:hover{opacity:.9}
.btn:disabled{opacity:.5;cursor:not-allowed}
.result{display:none;text-align:center;padding:32px 0}
.result .price{font-size:48px;font-weight:700;color:#007AFF;margin:16px 0 8px}
.result .label{font-size:14px;color:#64748B}
.result .biz{font-size:16px;font-weight:600;margin-top:16px}
.result .contact{font-size:14px;color:#64748B;margin-top:4px}
.powered{text-align:center;padding:16px 0;font-size:12px;color:#94A3B8}
</style>
</head>
<body>
<div class="container">
<div class="header">
<h1>Get Your Instant Quote</h1>
<p>Fill in your details for a quick estimate</p>
</div>
<form id="quoteForm">
<div class="card">
<h2>Your Info</h2>
<label>Full Name</label>
<input type="text" id="name" placeholder="John Smith" required>
<div class="row">
<div><label>Phone</label><input type="tel" id="phone" placeholder="(555) 123-4567"></div>
<div><label>Email</label><input type="email" id="email" placeholder="you@email.com"></div>
</div>
<label>ZIP Code</label>
<input type="text" id="zip" placeholder="12345" maxlength="10">
</div>
<div class="card">
<h2>Property Details</h2>
<div class="row">
<div><label>Bedrooms</label><input type="number" id="beds" value="3" min="1" max="10"></div>
<div><label>Bathrooms</label><input type="number" id="baths" value="2" min="1" max="10"></div>
</div>
<label>Square Footage</label>
<input type="number" id="sqft" value="1500" min="200" max="20000">
<label>Service Type</label>
<select id="serviceType">
<option value="regular">Regular Cleaning</option>
<option value="deep_clean">Deep Clean</option>
<option value="move_in_out">Move In/Out</option>
</select>
<label>Frequency</label>
<select id="frequency">
<option value="one-time">One-Time</option>
<option value="weekly">Weekly</option>
<option value="biweekly">Bi-Weekly</option>
<option value="monthly">Monthly</option>
</select>
</div>
<button type="submit" class="btn" id="submitBtn">Get My Quote</button>
</form>
<div class="result" id="result">
<div style="font-size:48px">&#x2728;</div>
<div class="price" id="priceDisplay">$0</div>
<div class="label">Estimated cleaning cost</div>
<div class="biz" id="bizName"></div>
<div class="contact" id="bizContact"></div>
<button class="btn" onclick="location.reload()" style="margin-top:24px">Get Another Quote</button>
</div>
<div class="powered">Powered by QuotePro</div>
</div>
<script>
const params = new URLSearchParams(location.search);
const businessId = params.get('u') || '';
const channel = params.get('ch') || '';
const conversationId = params.get('cid') || '';
document.getElementById('quoteForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Calculating...';
  try {
    const res = await fetch('/api/public/quick-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId, channel, conversationId,
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        zip: document.getElementById('zip').value,
        beds: parseInt(document.getElementById('beds').value),
        baths: parseInt(document.getElementById('baths').value),
        sqft: parseInt(document.getElementById('sqft').value),
        serviceType: document.getElementById('serviceType').value,
        frequency: document.getElementById('frequency').value,
      }),
    });
    const data = await res.json();
    if (data.quote) {
      document.getElementById('priceDisplay').textContent = '$' + data.quote.total.toFixed(0);
      if (data.business) {
        document.getElementById('bizName').textContent = data.business.companyName || '';
        const contact = [data.business.phone, data.business.email].filter(Boolean).join(' | ');
        document.getElementById('bizContact').textContent = contact;
      }
      document.getElementById('quoteForm').style.display = 'none';
      document.getElementById('result').style.display = 'block';
    }
  } catch(err) {
    btn.disabled = false;
    btn.textContent = 'Get My Quote';
  }
});
</script>
</body>
</html>`;
}
async function syncJobToGoogleCalendar(userId, job, customerName) {
  try {
    const tokens = await getGoogleCalendarToken(userId);
    if (!tokens) return;
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: new Date(tokens.expiresAt).getTime()
    });
    if (new Date(tokens.expiresAt) < /* @__PURE__ */ new Date()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await upsertGoogleCalendarToken(userId, {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || tokens.refreshToken,
        expiresAt: new Date(credentials.expiry_date)
      });
      oauth2Client.setCredentials(credentials);
    }
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const endTime = job.endDatetime || new Date(new Date(job.startDatetime).getTime() + 2 * 60 * 60 * 1e3);
    await calendar.events.insert({
      calendarId: tokens.calendarId || "primary",
      requestBody: {
        summary: `Clean - ${customerName}`,
        location: job.address || void 0,
        start: { dateTime: new Date(job.startDatetime).toISOString() },
        end: { dateTime: new Date(endTime).toISOString() },
        description: [
          job.jobType ? `Type: ${job.jobType}` : "",
          job.total ? `Total: $${job.total}` : "",
          job.internalNotes || ""
        ].filter(Boolean).join("\n")
      }
    });
  } catch (error) {
    console.error("Google Calendar sync error:", error);
  }
}
function formatBusiness(b) {
  return {
    id: b.id,
    companyName: b.companyName,
    email: b.email,
    phone: b.phone,
    address: b.address,
    logoUri: b.logoUri,
    primaryColor: b.primaryColor,
    senderName: b.senderName,
    senderTitle: b.senderTitle,
    bookingLink: b.bookingLink,
    emailSignature: b.emailSignature,
    smsSignature: b.smsSignature,
    timezone: b.timezone,
    onboardingComplete: b.onboardingComplete,
    venmoHandle: b.venmoHandle || null,
    cashappHandle: b.cashappHandle || null,
    paymentOptions: b.paymentOptions || null,
    paymentNotes: b.paymentNotes || null,
    avatarConfig: b.avatarConfig || null
  };
}
function getPrivacyPolicyHTML() {
  const styles = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC;color:#1E293B;line-height:1.7}.container{max-width:720px;margin:0 auto;padding:40px 24px}h1{font-size:28px;font-weight:700;color:#0F172A;margin-bottom:8px}h2{font-size:20px;font-weight:600;color:#0F172A;margin-top:32px;margin-bottom:12px}.updated{font-size:14px;color:#64748B;margin-bottom:32px}p,li{font-size:15px;margin-bottom:12px;color:#334155}ul{padding-left:20px}a{color:#2563EB;text-decoration:none}.back{display:inline-block;margin-bottom:24px;font-size:14px;color:#64748B}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Privacy Policy - QuotePro</title><style>${styles}</style></head><body><div class="container">
<a href="/" class="back">&larr; Back to QuotePro</a>
<h1>Privacy Policy</h1>
<p class="updated">Last updated: February 14, 2026</p>

<p>QuotePro ("we," "our," or "us") operates the QuotePro mobile application and web platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.</p>

<h2>Information We Collect</h2>
<p>We collect information you provide directly to us, including:</p>
<ul>
<li><strong>Account Information:</strong> Name, email address, and password when you create an account.</li>
<li><strong>Business Information:</strong> Company name, phone number, address, logo, and branding preferences.</li>
<li><strong>Customer Data:</strong> Names, contact information, property details, and communication history for your customers that you enter into the platform.</li>
<li><strong>Quote and Job Data:</strong> Pricing, service details, job schedules, checklists, and photos you create within the app.</li>
<li><strong>Payment Information:</strong> Subscription payment data is processed by RevenueCat and Apple/Google; we do not store your payment card details.</li>
</ul>

<h2>Third-Party Services</h2>
<p>We integrate with the following third-party services to provide our features:</p>
<ul>
<li><strong>Google Calendar:</strong> With your explicit consent, we access your Google Calendar to create and update events for scheduled jobs. We only request access to create and modify calendar events (calendar.events scope). We do not read your existing calendar data.</li>
<li><strong>SendGrid:</strong> Used to send emails on your behalf to your customers.</li>
<li><strong>OpenAI:</strong> Used to generate AI-powered content such as email drafts and business insights. Your business data may be sent to OpenAI for processing but is not used to train their models.</li>
<li><strong>RevenueCat:</strong> Manages subscription purchases and entitlements.</li>
</ul>

<h2>How We Use Your Information</h2>
<ul>
<li>To provide, maintain, and improve our services.</li>
<li>To create quotes, manage jobs, and track customer communications on your behalf.</li>
<li>To sync your job schedule with Google Calendar when you opt in.</li>
<li>To send emails and notifications related to your account and business.</li>
<li>To generate AI-powered content and business insights.</li>
<li>To process your subscription payments.</li>
</ul>

<h2>Data Storage and Security</h2>
<p>Your data is stored securely in our PostgreSQL database hosted by Neon. We use industry-standard security measures including encrypted connections (HTTPS/TLS), secure session management, and hashed passwords to protect your information.</p>

<h2>Data Sharing</h2>
<p>We do not sell, trade, or rent your personal information to third parties. We only share data with the third-party services listed above as necessary to provide our features, and with your explicit consent where required (such as Google Calendar access).</p>

<h2>Your Rights</h2>
<p>You have the right to:</p>
<ul>
<li>Access, update, or delete your account information.</li>
<li>Disconnect third-party integrations (such as Google Calendar) at any time.</li>
<li>Export your data upon request.</li>
<li>Delete your account and all associated data by contacting us.</li>
</ul>

<h2>Data Retention</h2>
<p>We retain your data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or regulatory purposes.</p>

<h2>Children's Privacy</h2>
<p>Our service is not directed to children under 13. We do not knowingly collect personal information from children under 13.</p>

<h2>Changes to This Policy</h2>
<p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.</p>

<h2>Contact Us</h2>
<p>If you have questions about this Privacy Policy, please contact us at <a href="mailto:quoteproforcleaners@gmail.com">quoteproforcleaners@gmail.com</a>.</p>
</div></body></html>`;
}
function getTermsOfServiceHTML() {
  const styles = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC;color:#1E293B;line-height:1.7}.container{max-width:720px;margin:0 auto;padding:40px 24px}h1{font-size:28px;font-weight:700;color:#0F172A;margin-bottom:8px}h2{font-size:20px;font-weight:600;color:#0F172A;margin-top:32px;margin-bottom:12px}.updated{font-size:14px;color:#64748B;margin-bottom:32px}p,li{font-size:15px;margin-bottom:12px;color:#334155}ul{padding-left:20px}a{color:#2563EB;text-decoration:none}.back{display:inline-block;margin-bottom:24px;font-size:14px;color:#64748B}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Terms of Service - QuotePro</title><style>${styles}</style></head><body><div class="container">
<a href="/" class="back">&larr; Back to QuotePro</a>
<h1>Terms of Service</h1>
<p class="updated">Last updated: February 14, 2026</p>

<p>Welcome to QuotePro. By using our mobile application and web platform ("Service"), you agree to these Terms of Service ("Terms"). Please read them carefully.</p>

<h2>1. Acceptance of Terms</h2>
<p>By creating an account or using QuotePro, you agree to be bound by these Terms. If you do not agree, do not use the Service.</p>

<h2>2. Description of Service</h2>
<p>QuotePro is a software platform designed for residential cleaning businesses to create quotes, manage customers, schedule jobs, and track communications. The Service includes both free and paid subscription tiers.</p>

<h2>3. Account Registration</h2>
<p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</p>

<h2>4. Subscription and Payments</h2>
<ul>
<li>QuotePro offers a free tier with basic quoting features and a paid "QuotePro AI" tier with additional features.</li>
<li>Paid subscriptions are billed through Apple App Store or Google Play Store via RevenueCat.</li>
<li>Subscription terms, pricing, and refund policies are governed by the respective app store's policies.</li>
<li>We reserve the right to change subscription pricing with reasonable notice.</li>
</ul>

<h2>5. Your Data</h2>
<p>You retain ownership of all data you enter into QuotePro, including customer information, quotes, and business details. You are responsible for ensuring you have the right to store and process your customers' personal information. Please refer to our <a href="/privacy">Privacy Policy</a> for details on how we handle data.</p>

<h2>6. Acceptable Use</h2>
<p>You agree not to:</p>
<ul>
<li>Use the Service for any unlawful purpose.</li>
<li>Attempt to gain unauthorized access to our systems or other users' accounts.</li>
<li>Upload malicious content or interfere with the Service's operation.</li>
<li>Resell or redistribute the Service without our written consent.</li>
<li>Use the Service to send unsolicited or spam communications.</li>
</ul>

<h2>7. Third-Party Integrations</h2>
<p>QuotePro integrates with third-party services including Google Calendar, SendGrid, and OpenAI. Your use of these integrations is subject to the respective third-party terms of service. We are not responsible for the availability or performance of third-party services.</p>

<h2>8. Limitation of Liability</h2>
<p>QuotePro is provided "as is" without warranties of any kind. To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to lost profits, data loss, or business interruption.</p>

<h2>9. Termination</h2>
<p>You may cancel your account at any time. We reserve the right to suspend or terminate accounts that violate these Terms. Upon termination, your right to use the Service ceases, and we may delete your data in accordance with our Privacy Policy.</p>

<h2>10. Changes to Terms</h2>
<p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms. We will notify you of material changes via email or in-app notification.</p>

<h2>11. Governing Law</h2>
<p>These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to conflict of law provisions.</p>

<h2>12. Contact</h2>
<p>For questions about these Terms, please contact us at <a href="mailto:quoteproforcleaners@gmail.com">quoteproforcleaners@gmail.com</a>.</p>
</div></body></html>`;
}
function getDeleteAccountHTML() {
  const styles = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC;color:#1E293B;line-height:1.7}.container{max-width:720px;margin:0 auto;padding:40px 24px}h1{font-size:28px;font-weight:700;color:#0F172A;margin-bottom:8px}h2{font-size:20px;font-weight:600;color:#0F172A;margin-top:32px;margin-bottom:12px}.updated{font-size:14px;color:#64748B;margin-bottom:32px}p,li{font-size:15px;margin-bottom:12px;color:#334155}ul{padding-left:20px}a{color:#2563EB;text-decoration:none}.back{display:inline-block;margin-bottom:24px;font-size:14px;color:#64748B}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Delete Account - QuotePro</title><style>${styles}</style></head><body><div class="container">
<a href="/" class="back">&larr; Back to QuotePro</a>
<h1>Delete Your Account</h1>
<p class="updated">QuotePro for Cleaners</p>

<h2>How to Request Account Deletion</h2>
<p>To request deletion of your QuotePro account and all associated data, please email us at <a href="mailto:quoteproforcleaners@gmail.com">quoteproforcleaners@gmail.com</a> with the subject line "Account Deletion Request" and include the email address associated with your account.</p>

<h2>What Happens When You Delete Your Account</h2>
<p>When you request account deletion, the following data will be permanently deleted within 30 days:</p>
<ul>
<li>Your account profile information (name, email address)</li>
<li>All quotes you have created</li>
<li>Customer information you have entered</li>
<li>Business profile and settings</li>
<li>Job history and records</li>
<li>Any AI-generated content associated with your account</li>
</ul>

<h2>Data We May Retain</h2>
<p>We may retain certain data as required by law or for legitimate business purposes, including:</p>
<ul>
<li>Transaction records related to subscription payments (retained for tax and accounting purposes)</li>
<li>Data necessary to comply with legal obligations</li>
</ul>

<h2>Subscription Cancellation</h2>
<p>Deleting your account does not automatically cancel your subscription. Before requesting account deletion, please cancel your subscription through the App Store or Google Play Store to avoid future charges.</p>

<h2>Contact</h2>
<p>If you have questions about the account deletion process, contact us at <a href="mailto:quoteproforcleaners@gmail.com">quoteproforcleaners@gmail.com</a>.</p>
</div></body></html>`;
}

// server/index.ts
import * as fs from "fs";
import * as path from "path";
var app = express();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      limit: "10mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, req, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host") || "";
  const currentBaseUrl = `${protocol}://${host}`;
  let manifest = fs.readFileSync(manifestPath, "utf-8");
  manifest = manifest.replace(/https?:\/\/[^/"]+/g, (match) => {
    try {
      const url = new URL(match);
      if (url.hostname.includes("replit") || url.hostname.includes("picard")) {
        return currentBaseUrl;
      }
    } catch {
    }
    return match;
  });
  const parsed = JSON.parse(manifest);
  if (parsed.extra?.expoClient?.hostUri) {
    parsed.extra.expoClient.hostUri = host + "/" + platform;
  }
  if (parsed.extra?.expoGo?.debuggerHost) {
    parsed.extra.expoGo.debuggerHost = host + "/" + platform;
  }
  res.send(JSON.stringify(parsed));
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/q/") || req.path === "/privacy" || req.path === "/terms") {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, req, res);
    }
    if (req.path === "/") {
      const host = req.hostname || req.headers.host || "";
      if (host.startsWith("app.")) {
        return res.redirect("/app");
      }
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app2.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
  app2.use(express.static(path.resolve(process.cwd(), "static-build")));
  const webDistPath = path.resolve(process.cwd(), "web", "dist");
  if (fs.existsSync(webDistPath)) {
    app2.use("/app", express.static(webDistPath));
    app2.get("/request/:slug", async (req, res) => {
      const slug = req.params.slug?.toLowerCase().trim();
      if (!slug) return res.redirect("/");
      try {
        const { pool: pool3 } = await Promise.resolve().then(() => (init_db(), db_exports));
        const r = await pool3.query(
          `SELECT intake_code, public_quote_enabled, company_name FROM businesses WHERE public_quote_slug = $1 LIMIT 1`,
          [slug]
        );
        if (!r.rows.length) {
          return res.status(404).type("html").send(`<!DOCTYPE html><html><head><title>Not Found</title></head><body style="font-family:sans-serif;text-align:center;padding:80px 20px"><h2>Quote Request Page Not Found</h2><p>This link may have changed or been removed.</p></body></html>`);
        }
        const { intake_code, public_quote_enabled, company_name } = r.rows[0];
        if (!public_quote_enabled) {
          return res.status(410).type("html").send(`<!DOCTYPE html><html><head><title>Not Available</title></head><body style="font-family:sans-serif;text-align:center;padding:80px 20px"><h2>${company_name}</h2><p>Online quote requests are currently turned off.</p></body></html>`);
        }
        return res.redirect(302, `/intake/${intake_code}`);
      } catch (e) {
        return res.redirect(`/intake/${slug}`);
      }
    });
    app2.use(async (req, res, next) => {
      if (req.path.startsWith("/app") || req.path.startsWith("/intake/")) {
        const indexPath = path.join(webDistPath, "index.html");
        if (fs.existsSync(indexPath)) {
          if (req.path.startsWith("/intake/")) {
            try {
              const code = req.path.split("/intake/")[1]?.split("/")[0];
              let title = "Quick Quote Form";
              if (code) {
                const { pool: pool3 } = await Promise.resolve().then(() => (init_db(), db_exports));
                const r = await pool3.query(
                  `SELECT company_name FROM businesses WHERE intake_code = $1 OR id = $1 LIMIT 1`,
                  [code]
                );
                if (r.rows[0]?.company_name) {
                  title = `${r.rows[0].company_name} \u2014 Quick Quote Form`;
                }
              }
              let html = fs.readFileSync(indexPath, "utf8");
              html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
              return res.type("html").send(html);
            } catch {
              return res.sendFile(indexPath);
            }
          }
          return res.sendFile(indexPath);
        }
      }
      next();
    });
    log("Web app: serving from /app");
  }
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
