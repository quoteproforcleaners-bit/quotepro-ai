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
  timezone: text("timezone").notNull().default("America/New_York"),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
export type QuoteLineItem = typeof quoteLineItems.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type JobChecklistItem = typeof jobChecklistItems.$inferSelect;
export type Communication = typeof communications.$inferSelect;
export type AutomationRule = typeof automationRules.$inferSelect;
export type Task = typeof tasks.$inferSelect;
