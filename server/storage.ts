import { eq, and, desc, asc, gte, lte, ilike, or, sql, isNotNull, isNull, lt, inArray } from "drizzle-orm";
import { db, pool } from "./db";
import {
  users,
  businesses,
  pricingSettings,
  customers,
  quotes,
  quoteFollowUps,
  quoteLineItems,
  recurringCleanSeries,
  type RecurringCleanSeries,
  jobs,
  jobChecklistItems,
  jobPhotos,
  pushTokens,
  communications,
  automationRules,
  tasks,
  followUpTouches,
  streaks,
  userPreferences,
  analyticsEvents,
  badges,
  salesRecommendations,
  bookingAvailabilitySettings,
  type User,
  type Business,
  type PricingSettingsRow,
  type Customer,
  type QuoteRow,
  type QuoteFollowUp,
  type QuoteLineItem,
  type Job,
  type JobChecklistItem,
  type JobPhoto,
  type PushToken,
  type Communication,
  type AutomationRule,
  type Task,
  googleCalendarTokens,
  type GoogleCalendarToken,
  type FollowUpTouch,
  type Streak,
  type UserPreference,
  type AnalyticsEvent,
  type Badge,
  growthTasks,
  growthTaskEvents,
  reviewRequests,
  customerMarketingPrefs,
  growthAutomationSettings,
  salesStrategySettings,
  campaigns,
  type GrowthTask,
  type GrowthTaskEvent,
  type ReviewRequest,
  type CustomerMarketingPref,
  type GrowthAutomationSetting,
  type SalesStrategySetting,
  type Campaign,
  invoicePackets,
  calendarEventStubs,
  apiKeys,
  webhookEndpoints,
  webhookEvents,
  webhookDeliveries,
  type InvoicePacket,
  type CalendarEventStub,
  type ApiKey,
  type WebhookEndpoint,
  type WebhookEvent,
  type WebhookDelivery,
  leadFinderSettings,
  leadFinderLeads,
  leadFinderReplies,
  leadFinderEvents,
  type LeadFinderSettings,
  type LeadFinderLead,
  type LeadFinderReply,
} from "@shared/schema";

export async function getUserById(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()));
  return user;
}

export async function getUserByProviderId(
  provider: string,
  providerId: string
): Promise<User | undefined> {
  const results = await db
    .select()
    .from(users)
    .where(eq(users.providerId, providerId));
  return results.find((u) => u.authProvider === provider);
}

export async function createUser(data: {
  email: string;
  name?: string;
  passwordHash?: string;
  authProvider: string;
  providerId?: string;
}): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({
      email: data.email.toLowerCase(),
      name: data.name || null,
      passwordHash: data.passwordHash || null,
      authProvider: data.authProvider,
      providerId: data.providerId || null,
    })
    .returning();
  return user;
}

export async function updateUser(userId: string, data: Partial<{
  subscriptionTier: string;
  subscriptionExpiresAt: Date | null;
}>): Promise<User> {
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return user;
}

export async function getBusinessByOwner(
  userId: string
): Promise<Business | undefined> {
  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId));
  return business;
}

export async function createBusiness(userId: string): Promise<Business> {
  const [business] = await db
    .insert(businesses)
    .values({ ownerUserId: userId })
    .returning();
  return business;
}

export async function updateBusiness(
  businessId: string,
  data: Partial<{
    companyName: string;
    email: string;
    phone: string;
    address: string;
    logoUri: string | null;
    primaryColor: string;
    senderName: string;
    senderTitle: string;
    bookingLink: string;
    timezone: string;
    appLanguage: string;
    commLanguage: string;
    onboardingComplete: boolean;
    stripeAccountId: string | null;
    stripeOnboardingComplete: boolean;
    emailSignature: string;
    smsSignature: string;
    venmoHandle: string | null;
    cashappHandle: string | null;
    paymentOptions: unknown;
    paymentNotes: string | null;
    quotePreferences: unknown;
    sendgridApiKey: string | null;
  }>
): Promise<Business> {
  const [business] = await db
    .update(businesses)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(businesses.id, businessId))
    .returning();
  return business;
}

export async function getPricingByBusiness(
  businessId: string
): Promise<PricingSettingsRow | undefined> {
  const [row] = await db
    .select()
    .from(pricingSettings)
    .where(eq(pricingSettings.businessId, businessId));
  return row;
}

export async function upsertPricingSettings(
  businessId: string,
  settings: unknown
): Promise<PricingSettingsRow> {
  const existing = await getPricingByBusiness(businessId);
  if (existing) {
    const [row] = await db
      .update(pricingSettings)
      .set({ settings, updatedAt: new Date() })
      .where(eq(pricingSettings.id, existing.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(pricingSettings)
    .values({ businessId, settings })
    .returning();
  return row;
}

// ─── Customers ───

export async function getCustomersByBusiness(
  businessId: string,
  opts?: { search?: string; status?: string }
): Promise<Customer[]> {
  let query = db.select().from(customers).where(eq(customers.businessId, businessId));

  if (opts?.status) {
    query = query.where(and(eq(customers.businessId, businessId), eq(customers.status, opts.status))) as any;
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
    ) as any;
  }

  return (query as any).orderBy(desc(customers.updatedAt));
}

export async function getCustomerById(id: string): Promise<Customer | undefined> {
  const [c] = await db.select().from(customers).where(eq(customers.id, id));
  return c;
}

export async function createCustomer(data: {
  businessId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  tags?: string[];
  leadSource?: string;
  status?: string;
}): Promise<Customer> {
  const [c] = await db
    .insert(customers)
    .values({
      businessId: data.businessId,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || "",
      email: data.email || "",
      address: data.address || "",
      notes: data.notes || "",
      tags: data.tags || [],
      leadSource: data.leadSource || null,
      status: data.status || "lead",
    })
    .returning();
  return c;
}

export async function updateCustomer(
  id: string,
  data: Partial<{
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
    tags: string[];
    leadSource: string;
    status: string;
    smsOptOut: boolean;
    isVip: boolean;
    preferredLanguage: string | null;
  }>
): Promise<Customer> {
  const [c] = await db
    .update(customers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning();
  return c;
}

export async function deleteCustomer(id: string): Promise<void> {
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

// ─── Quotes ───

export async function getQuotesByBusiness(
  businessId: string,
  opts?: { status?: string; customerId?: string }
): Promise<QuoteRow[]> {
  const conditions = [eq(quotes.businessId, businessId)];
  if (opts?.status) conditions.push(eq(quotes.status, opts.status));
  if (opts?.customerId) conditions.push(eq(quotes.customerId, opts.customerId));

  return db
    .select()
    .from(quotes)
    .where(and(...conditions))
    .orderBy(desc(quotes.createdAt));
}

export async function getQuoteById(id: string): Promise<QuoteRow | undefined> {
  const [q] = await db.select().from(quotes).where(eq(quotes.id, id));
  return q;
}

export async function getQuoteByToken(token: string): Promise<QuoteRow | undefined> {
  const [q] = await db.select().from(quotes).where(eq(quotes.publicToken, token));
  return q;
}

export async function createQuote(data: {
  businessId: string;
  customerId?: string;
  propertyBeds: number;
  propertyBaths: number;
  propertySqft: number;
  propertyDetails: any;
  addOns: any;
  frequencySelected: string;
  selectedOption: string;
  options: any;
  subtotal: number;
  tax: number;
  total: number;
  status?: string;
  emailDraft?: string;
  smsDraft?: string;
  expiresAt?: Date;
}): Promise<QuoteRow> {
  const [q] = await db
    .insert(quotes)
    .values({
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
      expiresAt: data.expiresAt || null,
    })
    .returning();
  return q;
}

export async function updateQuote(
  id: string,
  data: Partial<{
    customerId: string | null;
    status: string;
    sentVia: string;
    sentAt: Date;
    acceptedAt: Date;
    declinedAt: Date;
    expiresAt: Date;
    selectedOption: string;
    subtotal: number;
    tax: number;
    total: number;
    emailDraft: string;
    smsDraft: string;
    depositRequired: boolean;
    depositAmount: number;
    depositPaid: boolean;
    options: any;
    addOns: any;
    propertyDetails: any;
    frequencySelected: string;
    propertyBeds: number;
    propertyBaths: number;
    propertySqft: number;
    lastContactAt: Date;
    closeProbability: number;
    expectedValue: number;
    aiNotes: string;
    paymentStatus: string;
    paymentIntentId: string;
    paymentAmount: number;
    paidAt: Date;
    acceptedFrequency: string;
    acceptedSource: string;
    acceptedNotes: string;
    acceptedPreferences: any;
  }>
): Promise<QuoteRow> {
  const [q] = await db
    .update(quotes)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(quotes.id, id))
    .returning();
  return q;
}

export async function deleteQuote(id: string): Promise<void> {
  await db.delete(quotes).where(eq(quotes.id, id));
}

// ─── Quote Line Items ───

export async function getLineItemsByQuote(quoteId: string): Promise<QuoteLineItem[]> {
  return db
    .select()
    .from(quoteLineItems)
    .where(eq(quoteLineItems.quoteId, quoteId));
}

export async function createLineItem(data: {
  quoteId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  type: string;
}): Promise<QuoteLineItem> {
  const [li] = await db.insert(quoteLineItems).values(data).returning();
  return li;
}

export async function deleteLineItemsByQuote(quoteId: string): Promise<void> {
  await db.delete(quoteLineItems).where(eq(quoteLineItems.quoteId, quoteId));
}

// ─── Jobs ───

export async function getJobsByBusiness(
  businessId: string,
  opts?: { status?: string; customerId?: string; quoteId?: string; from?: Date; to?: Date }
): Promise<Job[]> {
  const conditions = [eq(jobs.businessId, businessId)];
  if (opts?.status) conditions.push(eq(jobs.status, opts.status));
  if (opts?.customerId) conditions.push(eq(jobs.customerId, opts.customerId));
  if (opts?.quoteId) conditions.push(eq(jobs.quoteId, opts.quoteId));
  if (opts?.from) conditions.push(gte(jobs.startDatetime, opts.from));
  if (opts?.to) conditions.push(lte(jobs.startDatetime, opts.to));

  return db
    .select()
    .from(jobs)
    .where(and(...conditions))
    .orderBy(asc(jobs.startDatetime));
}

export async function getJobById(id: string): Promise<Job | undefined> {
  const [j] = await db.select().from(jobs).where(eq(jobs.id, id));
  return j;
}

export async function getJobByRatingToken(token: string): Promise<Job | undefined> {
  const [j] = await db.select().from(jobs).where(eq(jobs.ratingToken, token));
  return j;
}

export async function createJob(data: {
  businessId: string;
  customerId?: string;
  quoteId?: string;
  seriesId?: string;
  seriesException?: boolean;
  skipped?: boolean;
  jobType: string;
  status?: string;
  startDatetime: Date;
  endDatetime?: Date;
  recurrence?: string;
  internalNotes?: string;
  address?: string;
  total?: number;
  teamMembers?: string[];
}): Promise<Job> {
  const [j] = await db
    .insert(jobs)
    .values({
      businessId: data.businessId,
      customerId: data.customerId || null,
      quoteId: data.quoteId || null,
      seriesId: data.seriesId || null,
      seriesException: data.seriesException || false,
      skipped: data.skipped || false,
      jobType: data.jobType,
      status: data.status || "scheduled",
      startDatetime: data.startDatetime,
      endDatetime: data.endDatetime || null,
      recurrence: data.recurrence || "none",
      internalNotes: data.internalNotes || "",
      address: data.address || "",
      total: data.total || null,
      teamMembers: data.teamMembers || [],
    })
    .returning();
  return j;
}

export async function updateJob(
  id: string,
  data: Partial<{
    customerId: string | null;
    quoteId: string | null;
    jobType: string;
    status: string;
    startDatetime: Date;
    endDatetime: Date | null;
    recurrence: string;
    internalNotes: string;
    address: string;
    total: number | null;
    startedAt: Date | null;
    completedAt: Date | null;
  }>
): Promise<Job> {
  const [j] = await db
    .update(jobs)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(jobs.id, id))
    .returning();
  return j;
}

export async function deleteJob(id: string): Promise<void> {
  await db.delete(jobs).where(eq(jobs.id, id));
}

// ─── Recurring Clean Series ────────────────────────────────────────────────

function addWeeks(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n * 7);
  return d;
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

export function getOccurrenceDates(
  series: RecurringCleanSeries,
  from: Date,
  to: Date
): Date[] {
  const results: Date[] = [];
  const start = new Date(series.startDate + "T00:00:00");
  const endDate = series.endDate ? new Date(series.endDate + "T00:00:00") : null;

  let cursor = new Date(start);
  const maxIter = 500;
  let iter = 0;

  while (cursor <= to && iter < maxIter) {
    iter++;
    if (endDate && cursor > endDate) break;

    if (cursor >= from) {
      results.push(new Date(cursor));
    }

    switch (series.frequency) {
      case "weekly":
        cursor = addWeeks(cursor, 1);
        break;
      case "biweekly":
        cursor = addWeeks(cursor, 2);
        break;
      case "monthly":
        cursor = addMonths(cursor, 1);
        break;
      case "custom":
        if (series.intervalUnit === "months") {
          cursor = addMonths(cursor, series.intervalValue || 1);
        } else {
          cursor = addWeeks(cursor, series.intervalValue || 1);
        }
        break;
      default:
        cursor = addWeeks(cursor, 1);
    }
  }

  return results;
}

export async function generateSeriesJobs(
  seriesId: string,
  daysAhead = 90
): Promise<void> {
  const [series] = await db
    .select()
    .from(recurringCleanSeries)
    .where(eq(recurringCleanSeries.id, seriesId));

  if (!series || series.status === "cancelled") return;

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + daysAhead);

  const occurrences = getOccurrenceDates(series, from, to);

  const existing = await db
    .select({ startDatetime: jobs.startDatetime })
    .from(jobs)
    .where(
      and(
        eq(jobs.seriesId, seriesId),
        eq(jobs.skipped, false),
        gte(jobs.startDatetime, from),
        lte(jobs.startDatetime, to)
      )
    );

  const existingDates = new Set(
    existing.map((j) => j.startDatetime.toISOString().slice(0, 10))
  );

  const [hr, mn] = (series.arrivalTime || "09:00").split(":").map(Number);

  for (const dateOnly of occurrences) {
    const dateStr = dateOnly.toISOString().slice(0, 10);
    if (existingDates.has(dateStr)) continue;

    const start = new Date(dateStr + "T00:00:00");
    start.setHours(hr, mn, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + (series.durationHours || 3));

    await db.insert(jobs).values({
      businessId: series.businessId,
      customerId: series.customerId || null,
      quoteId: series.quoteId || null,
      seriesId: series.id,
      seriesException: false,
      skipped: false,
      jobType: series.jobType,
      status: "scheduled",
      startDatetime: start,
      endDatetime: end,
      recurrence: series.frequency,
      internalNotes: series.internalNotes || "",
      address: series.address || "",
      total: series.defaultPrice || null,
      teamMembers: (series.teamMembers as string[]) || [],
    });
  }
}

export async function createRecurringSeries(data: {
  businessId: string;
  customerId?: string;
  quoteId?: string;
  frequency: string;
  intervalValue?: number;
  intervalUnit?: string;
  startDate: string;
  endDate?: string;
  defaultPrice?: number;
  jobType?: string;
  address?: string;
  durationHours?: number;
  teamMembers?: string[];
  internalNotes?: string;
  arrivalTime?: string;
}): Promise<RecurringCleanSeries> {
  const [series] = await db
    .insert(recurringCleanSeries)
    .values({
      businessId: data.businessId,
      customerId: data.customerId || null,
      quoteId: data.quoteId || null,
      frequency: data.frequency,
      intervalValue: data.intervalValue || 1,
      intervalUnit: data.intervalUnit || "weeks",
      startDate: data.startDate,
      endDate: data.endDate || null,
      status: "active",
      defaultPrice: data.defaultPrice || null,
      jobType: data.jobType || "regular",
      address: data.address || "",
      durationHours: data.durationHours || 3,
      teamMembers: data.teamMembers || [],
      internalNotes: data.internalNotes || "",
      arrivalTime: data.arrivalTime || "09:00",
    })
    .returning();

  await generateSeriesJobs(series.id, 90);
  return series;
}

export async function getRecurringSeriesByBusiness(
  businessId: string
): Promise<RecurringCleanSeries[]> {
  return db
    .select()
    .from(recurringCleanSeries)
    .where(eq(recurringCleanSeries.businessId, businessId))
    .orderBy(desc(recurringCleanSeries.createdAt));
}

export async function getRecurringSeriesById(
  id: string
): Promise<RecurringCleanSeries | undefined> {
  const [s] = await db
    .select()
    .from(recurringCleanSeries)
    .where(eq(recurringCleanSeries.id, id));
  return s;
}

export async function updateRecurringSeries(
  id: string,
  data: Partial<{
    frequency: string;
    intervalValue: number;
    intervalUnit: string;
    startDate: string;
    endDate: string | null;
    status: string;
    defaultPrice: number | null;
    jobType: string;
    address: string;
    durationHours: number;
    teamMembers: string[];
    internalNotes: string;
    arrivalTime: string;
  }>,
  regenerate = true
): Promise<RecurringCleanSeries> {
  const [series] = await db
    .update(recurringCleanSeries)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(recurringCleanSeries.id, id))
    .returning();

  if (regenerate && series.status !== "cancelled") {
    await generateSeriesJobs(series.id, 90);
  }
  return series;
}

export async function cancelRecurringSeries(id: string): Promise<void> {
  await db
    .update(recurringCleanSeries)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(recurringCleanSeries.id, id));

  await db
    .update(jobs)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(jobs.seriesId, id),
        eq(jobs.status, "scheduled"),
        eq(jobs.skipped, false),
        eq(jobs.seriesException, false)
      )
    );
}

export async function skipSeriesOccurrence(jobId: string): Promise<Job> {
  const [j] = await db
    .update(jobs)
    .set({ skipped: true, status: "cancelled", updatedAt: new Date() })
    .where(eq(jobs.id, jobId))
    .returning();
  return j;
}

// ─── Job Checklist Items ───

export async function getChecklistByJob(jobId: string): Promise<JobChecklistItem[]> {
  return db
    .select()
    .from(jobChecklistItems)
    .where(eq(jobChecklistItems.jobId, jobId))
    .orderBy(asc(jobChecklistItems.sortOrder));
}

export async function createChecklistItem(data: {
  jobId: string;
  label: string;
  sortOrder?: number;
}): Promise<JobChecklistItem> {
  const [item] = await db
    .insert(jobChecklistItems)
    .values({ jobId: data.jobId, label: data.label, sortOrder: data.sortOrder || 0 })
    .returning();
  return item;
}

export async function updateChecklistItem(
  id: string,
  data: Partial<{ label: string; completed: boolean; sortOrder: number }>
): Promise<JobChecklistItem> {
  const [item] = await db
    .update(jobChecklistItems)
    .set(data)
    .where(eq(jobChecklistItems.id, id))
    .returning();
  return item;
}

export async function deleteChecklistItem(id: string): Promise<void> {
  await db.delete(jobChecklistItems).where(eq(jobChecklistItems.id, id));
}

// ─── Job Photos ───

export async function getPhotosByJob(jobId: string): Promise<JobPhoto[]> {
  return db.select().from(jobPhotos).where(eq(jobPhotos.jobId, jobId)).orderBy(desc(jobPhotos.createdAt));
}

export async function createJobPhoto(data: { jobId: string; photoUrl: string; photoType?: string; caption?: string }): Promise<JobPhoto> {
  const [photo] = await db.insert(jobPhotos).values({
    jobId: data.jobId,
    photoUrl: data.photoUrl,
    photoType: data.photoType || "after",
    caption: data.caption || "",
  }).returning();
  return photo;
}

export async function deleteJobPhoto(id: string): Promise<void> {
  await db.delete(jobPhotos).where(eq(jobPhotos.id, id));
}

// ─── Push Tokens ───

export async function getPushTokensByUser(userId: string): Promise<PushToken[]> {
  return db.select().from(pushTokens).where(eq(pushTokens.userId, userId));
}

export async function upsertPushToken(data: { userId: string; token: string; platform?: string }): Promise<PushToken> {
  const existing = await db.select().from(pushTokens).where(eq(pushTokens.token, data.token));
  if (existing.length > 0) {
    const [updated] = await db.update(pushTokens).set({ userId: data.userId }).where(eq(pushTokens.token, data.token)).returning();
    return updated;
  }
  const [token] = await db.insert(pushTokens).values({
    userId: data.userId,
    token: data.token,
    platform: data.platform || "ios",
  }).returning();
  return token;
}

export async function deletePushToken(token: string): Promise<void> {
  await db.delete(pushTokens).where(eq(pushTokens.token, token));
}

// ─── Communications ───

export async function getCommunicationsByBusiness(
  businessId: string,
  opts?: { customerId?: string; quoteId?: string; jobId?: string }
): Promise<Communication[]> {
  const conditions = [eq(communications.businessId, businessId)];
  if (opts?.customerId) conditions.push(eq(communications.customerId, opts.customerId));
  if (opts?.quoteId) conditions.push(eq(communications.quoteId, opts.quoteId));
  if (opts?.jobId) conditions.push(eq(communications.jobId, opts.jobId));

  return db
    .select()
    .from(communications)
    .where(and(...conditions))
    .orderBy(desc(communications.createdAt));
}

export async function createCommunication(data: {
  businessId: string;
  customerId?: string;
  quoteId?: string;
  jobId?: string;
  channel: string;
  direction?: string;
  templateKey?: string;
  content: string;
  status?: string;
  scheduledFor?: Date;
}): Promise<Communication> {
  const [c] = await db
    .insert(communications)
    .values({
      businessId: data.businessId,
      customerId: data.customerId || null,
      quoteId: data.quoteId || null,
      jobId: data.jobId || null,
      channel: data.channel,
      direction: data.direction || "outbound",
      templateKey: data.templateKey || null,
      content: data.content,
      status: data.status || "queued",
      scheduledFor: data.scheduledFor || null,
    })
    .returning();
  return c;
}

export async function updateCommunication(
  id: string,
  data: Partial<{
    status: string;
    providerMessageId: string;
    sentAt: Date;
    errorMessage: string;
    content: string;
    scheduledFor: Date;
  }>
): Promise<Communication> {
  const [c] = await db
    .update(communications)
    .set(data)
    .where(eq(communications.id, id))
    .returning();
  return c;
}

export async function getScheduledFollowUpsForQuote(quoteId: string): Promise<Communication[]> {
  return db
    .select()
    .from(communications)
    .where(
      and(
        eq(communications.quoteId, quoteId),
        eq(communications.status, "queued")
      )
    )
    .orderBy(asc(communications.scheduledFor));
}

export async function getCommunicationById(id: string): Promise<Communication | undefined> {
  const [c] = await db
    .select()
    .from(communications)
    .where(eq(communications.id, id));
  return c;
}

export async function getPendingCommunications(): Promise<Communication[]> {
  return db
    .select()
    .from(communications)
    .where(
      and(
        eq(communications.status, "queued"),
        lte(communications.scheduledFor, new Date())
      )
    )
    .orderBy(asc(communications.scheduledFor));
}

export async function cancelPendingCommunicationsForQuote(quoteId: string): Promise<void> {
  await db
    .update(communications)
    .set({ status: "canceled" })
    .where(
      and(
        eq(communications.quoteId, quoteId),
        eq(communications.status, "queued")
      )
    );
}

// ─── Automation Rules ───

export async function getAutomationRules(businessId: string): Promise<AutomationRule | undefined> {
  const [rule] = await db
    .select()
    .from(automationRules)
    .where(eq(automationRules.businessId, businessId));
  return rule;
}

export async function upsertAutomationRules(
  businessId: string,
  data: Partial<{
    enabled: boolean;
    quoteFollowupsEnabled: boolean;
    followupSchedule: any;
    quoteExpirationDays: number;
    jobRemindersEnabled: boolean;
    jobReminderMinutesBefore: number;
    followupChannel: string;
    messageTemplates: any;
  }>
): Promise<AutomationRule> {
  const existing = await getAutomationRules(businessId);
  if (existing) {
    const [rule] = await db
      .update(automationRules)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(automationRules.id, existing.id))
      .returning();
    return rule;
  }
  const [rule] = await db
    .insert(automationRules)
    .values({ businessId, ...data })
    .returning();
  return rule;
}

// ─── Tasks ───

export async function getTasksByBusiness(
  businessId: string,
  opts?: { completed?: boolean; customerId?: string; dueToday?: boolean }
): Promise<Task[]> {
  const conditions = [eq(tasks.businessId, businessId)];
  if (opts?.completed !== undefined) conditions.push(eq(tasks.completed, opts.completed));
  if (opts?.customerId) conditions.push(eq(tasks.customerId, opts.customerId));
  if (opts?.dueToday) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    conditions.push(gte(tasks.dueDate, today));
    conditions.push(lte(tasks.dueDate, tomorrow));
  }

  return db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(asc(tasks.dueDate));
}

export async function getTaskById(id: string): Promise<Task | undefined> {
  const [t] = await db.select().from(tasks).where(eq(tasks.id, id));
  return t;
}

export async function createTask(data: {
  businessId: string;
  customerId?: string;
  title: string;
  description?: string;
  type?: string;
  dueDate?: Date;
}): Promise<Task> {
  const [t] = await db
    .insert(tasks)
    .values({
      businessId: data.businessId,
      customerId: data.customerId || null,
      title: data.title,
      description: data.description || "",
      type: data.type || "follow_up",
      dueDate: data.dueDate || null,
    })
    .returning();
  return t;
}

export async function updateTask(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    type: string;
    dueDate: Date | null;
    completed: boolean;
    completedAt: Date | null;
  }>
): Promise<Task> {
  const [t] = await db
    .update(tasks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  return t;
}

export async function deleteTask(id: string): Promise<void> {
  await db.delete(tasks).where(eq(tasks.id, id));
}

// ─── Reporting ───

export async function getQuoteStats(businessId: string): Promise<{
  totalQuotes: number;
  sentQuotes: number;
  acceptedQuotes: number;
  declinedQuotes: number;
  expiredQuotes: number;
  totalRevenue: number;
  avgQuoteValue: number;
  closeRate: number;
}> {
  const allQuotes = await db
    .select()
    .from(quotes)
    .where(eq(quotes.businessId, businessId));

  const sent = allQuotes.filter((q) => q.status === "sent").length;
  const accepted = allQuotes.filter((q) => q.status === "accepted").length;
  const declined = allQuotes.filter((q) => q.status === "declined").length;
  const expired = allQuotes.filter((q) => q.status === "expired").length;
  const totalRevenue = allQuotes
    .filter((q) => q.status === "accepted")
    .reduce((sum, q) => sum + q.total, 0);
  const avgQuoteValue =
    allQuotes.length > 0
      ? allQuotes.reduce((sum, q) => sum + q.total, 0) / allQuotes.length
      : 0;
  const closeRate = allQuotes.length > 0 ? (accepted / allQuotes.length) * 100 : 0;

  return {
    totalQuotes: allQuotes.length,
    sentQuotes: sent,
    acceptedQuotes: accepted,
    declinedQuotes: declined,
    expiredQuotes: expired,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    avgQuoteValue: Math.round(avgQuoteValue * 100) / 100,
    closeRate: Math.round(closeRate * 10) / 10,
  };
}

export async function getRevenueByPeriod(
  businessId: string,
  days: number = 30
): Promise<{ date: string; revenue: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const acceptedQuotes = await db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.businessId, businessId),
        eq(quotes.status, "accepted"),
        gte(quotes.acceptedAt, since)
      )
    );

  const byDate: Record<string, number> = {};
  for (const q of acceptedQuotes) {
    const d = q.acceptedAt?.toISOString().split("T")[0] || "";
    byDate[d] = (byDate[d] || 0) + q.total;
  }

  return Object.entries(byDate)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Quote Follow-Ups ───

export async function getFollowUpsByQuote(quoteId: string): Promise<QuoteFollowUp[]> {
  return db
    .select()
    .from(quoteFollowUps)
    .where(eq(quoteFollowUps.quoteId, quoteId))
    .orderBy(asc(quoteFollowUps.scheduledFor));
}

export async function getFollowUpsByBusiness(businessId: string, opts?: { status?: string }): Promise<QuoteFollowUp[]> {
  const conditions = [eq(quoteFollowUps.businessId, businessId)];
  if (opts?.status) conditions.push(eq(quoteFollowUps.status, opts.status));
  return db
    .select()
    .from(quoteFollowUps)
    .where(and(...conditions))
    .orderBy(asc(quoteFollowUps.scheduledFor));
}

export async function createFollowUp(data: {
  quoteId: string;
  businessId: string;
  scheduledFor: Date;
  channel?: string;
  message?: string;
}): Promise<QuoteFollowUp> {
  const [fu] = await db.insert(quoteFollowUps).values({
    quoteId: data.quoteId,
    businessId: data.businessId,
    scheduledFor: data.scheduledFor,
    channel: data.channel || "sms",
    message: data.message || "",
  }).returning();
  return fu;
}

export async function updateFollowUp(
  id: string,
  data: Partial<{ status: string; sentAt: Date; message: string; scheduledFor: Date; channel: string }>
): Promise<QuoteFollowUp> {
  const [fu] = await db.update(quoteFollowUps).set(data).where(eq(quoteFollowUps.id, id)).returning();
  return fu;
}

export async function deleteFollowUp(id: string): Promise<void> {
  await db.delete(quoteFollowUps).where(eq(quoteFollowUps.id, id));
}

export async function getUnfollowedQuotes(businessId: string): Promise<QuoteRow[]> {
  const allSent = await db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.businessId, businessId),
        eq(quotes.status, "sent")
      )
    )
    .orderBy(asc(quotes.sentAt));

  const results: QuoteRow[] = [];
  for (const q of allSent) {
    const comms = await db
      .select()
      .from(communications)
      .where(
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

// ─── Background Jobs ───

// ─── Google Calendar Tokens ───

export async function getGoogleCalendarToken(userId: string): Promise<GoogleCalendarToken | undefined> {
  const [token] = await db.select().from(googleCalendarTokens).where(eq(googleCalendarTokens.userId, userId));
  return token;
}

export async function upsertGoogleCalendarToken(userId: string, data: {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  calendarId?: string;
}): Promise<GoogleCalendarToken> {
  const existing = await getGoogleCalendarToken(userId);
  if (existing) {
    const [token] = await db
      .update(googleCalendarTokens)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(googleCalendarTokens.userId, userId))
      .returning();
    return token;
  }
  const [token] = await db
    .insert(googleCalendarTokens)
    .values({ userId, ...data })
    .returning();
  return token;
}

export async function deleteGoogleCalendarToken(userId: string): Promise<void> {
  await db.delete(googleCalendarTokens).where(eq(googleCalendarTokens.userId, userId));
}

export async function expireOldQuotes(): Promise<number> {
  const now = new Date();
  const result = await db
    .update(quotes)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        eq(quotes.status, "sent"),
        lte(quotes.expiresAt, now)
      )
    )
    .returning();
  return result.length;
}

// ─── Follow-Up Touches ───

export async function getFollowUpTouchesByQuote(quoteId: string): Promise<FollowUpTouch[]> {
  return db
    .select()
    .from(followUpTouches)
    .where(eq(followUpTouches.quoteId, quoteId))
    .orderBy(desc(followUpTouches.createdAt));
}

export async function getFollowUpTouchesByBusiness(businessId: string): Promise<FollowUpTouch[]> {
  return db
    .select()
    .from(followUpTouches)
    .where(eq(followUpTouches.businessId, businessId))
    .orderBy(desc(followUpTouches.createdAt));
}

export async function createFollowUpTouch(data: {
  businessId: string;
  quoteId: string;
  customerId?: string;
  channel: string;
  snoozedUntil?: Date;
}): Promise<FollowUpTouch> {
  const [touch] = await db
    .insert(followUpTouches)
    .values({
      businessId: data.businessId,
      quoteId: data.quoteId,
      customerId: data.customerId || null,
      channel: data.channel,
      snoozedUntil: data.snoozedUntil || null,
    })
    .returning();
  return touch;
}

export async function getLastTouchForQuote(quoteId: string): Promise<FollowUpTouch | undefined> {
  const [touch] = await db
    .select()
    .from(followUpTouches)
    .where(eq(followUpTouches.quoteId, quoteId))
    .orderBy(desc(followUpTouches.createdAt))
    .limit(1);
  return touch;
}

// ─── Streaks ───

export async function getStreakByBusiness(businessId: string): Promise<Streak | undefined> {
  const [streak] = await db
    .select()
    .from(streaks)
    .where(eq(streaks.businessId, businessId));
  return streak;
}

export async function upsertStreak(
  businessId: string,
  data: { currentStreak: number; longestStreak: number; lastActionDate: string }
): Promise<Streak> {
  const existing = await getStreakByBusiness(businessId);
  if (existing) {
    const [streak] = await db
      .update(streaks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(streaks.businessId, businessId))
      .returning();
    return streak;
  }
  const [streak] = await db
    .insert(streaks)
    .values({ businessId, ...data })
    .returning();
  return streak;
}

// ─── User Preferences ───

export async function getPreferencesByBusiness(businessId: string): Promise<UserPreference | undefined> {
  const [pref] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.businessId, businessId));
  return pref;
}

export async function upsertPreferences(
  businessId: string,
  data: Partial<{
    dailyPulseEnabled: boolean;
    dailyPulseTime: string;
    weeklyRecapEnabled: boolean;
    weeklyRecapDay: number;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    dormantThresholdDays: number;
    maxFollowUpsPerDay: number;
    weeklyGoal: string | null;
    weeklyGoalTarget: number | null;
  }>
): Promise<UserPreference> {
  const existing = await getPreferencesByBusiness(businessId);
  if (existing) {
    const [pref] = await db
      .update(userPreferences)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userPreferences.businessId, businessId))
      .returning();
    return pref;
  }
  const [pref] = await db
    .insert(userPreferences)
    .values({ businessId, ...data })
    .returning();
  return pref;
}

// ─── Analytics Events ───

export async function createAnalyticsEvent(data: {
  businessId: string;
  eventName: string;
  properties?: any;
}): Promise<AnalyticsEvent> {
  const [event] = await db
    .insert(analyticsEvents)
    .values({
      businessId: data.businessId,
      eventName: data.eventName,
      properties: data.properties || {},
    })
    .returning();
  return event;
}

export async function getAnalyticsEvents(businessId: string, limit: number = 100): Promise<AnalyticsEvent[]> {
  return db
    .select()
    .from(analyticsEvents)
    .where(eq(analyticsEvents.businessId, businessId))
    .orderBy(desc(analyticsEvents.createdAt))
    .limit(limit);
}

// ─── Badges ───

export async function getBadgesByBusiness(businessId: string): Promise<Badge[]> {
  return db
    .select()
    .from(badges)
    .where(eq(badges.businessId, businessId))
    .orderBy(desc(badges.earnedAt));
}

export async function createBadge(data: { businessId: string; badgeKey: string }): Promise<Badge> {
  const [badge] = await db
    .insert(badges)
    .values({ businessId: data.businessId, badgeKey: data.badgeKey })
    .returning();
  return badge;
}

export async function hasBadge(businessId: string, badgeKey: string): Promise<boolean> {
  const results = await db
    .select()
    .from(badges)
    .where(
      and(
        eq(badges.businessId, businessId),
        eq(badges.badgeKey, badgeKey)
      )
    )
    .limit(1);
  return results.length > 0;
}

// ─── Follow-Up Queue ───

export async function getFollowUpQueueQuotes(businessId: string): Promise<any[]> {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const sentQuotes = await db
    .select({
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
      customerEmail: customers.email,
    })
    .from(quotes)
    .leftJoin(customers, eq(quotes.customerId, customers.id))
    .where(
      and(
        eq(quotes.businessId, businessId),
        eq(quotes.status, "sent"),
        lte(quotes.sentAt, twentyFourHoursAgo)
      )
    )
    .orderBy(asc(quotes.sentAt));

  const now = new Date();
  const results: any[] = [];

  for (const q of sentQuotes) {
    const snoozedTouches = await db
      .select()
      .from(followUpTouches)
      .where(
        and(
          eq(followUpTouches.quoteId, q.id),
          gte(followUpTouches.snoozedUntil, now)
        )
      )
      .limit(1);

    if (snoozedTouches.length > 0) continue;

    const lastTouch = await getLastTouchForQuote(q.id);

    const details = q.propertyDetails as Record<string, any> | null;
    const customerFirstName = q.customerFirstName || details?.customerName?.split(" ")[0] || null;
    const customerLastName = q.customerLastName || (details?.customerName?.split(" ").slice(1).join(" ")) || null;
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
      lastTouchedAt: lastTouch?.createdAt || null,
    });
  }

  return results;
}

// ─── Weekly Recap Stats ───

export async function getWeeklyRecapStats(
  businessId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<{
  quotesSent: number;
  quotesAccepted: number;
  quotesDeclined: number;
  quotesExpired: number;
  closeRate: number;
  revenueWon: number;
  biggestWin: number;
  mostAtRiskOpen: any;
}> {
  const allQuotesInRange = await db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.businessId, businessId),
        gte(quotes.createdAt, weekStart),
        lte(quotes.createdAt, weekEnd)
      )
    );

  const quotesSent = allQuotesInRange.length;

  const acceptedInRange = await db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.businessId, businessId),
        eq(quotes.status, "accepted"),
        gte(quotes.acceptedAt, weekStart),
        lte(quotes.acceptedAt, weekEnd)
      )
    );

  const declinedInRange = await db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.businessId, businessId),
        eq(quotes.status, "declined"),
        gte(quotes.declinedAt, weekStart),
        lte(quotes.declinedAt, weekEnd)
      )
    );

  const expiredInRange = await db
    .select()
    .from(quotes)
    .where(
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
  const closeRate = quotesSent > 0 ? Math.round((quotesAccepted / quotesSent) * 1000) / 10 : 0;
  const revenueWon = acceptedInRange.reduce((sum, q) => sum + q.total, 0);
  const biggestWin = acceptedInRange.length > 0
    ? Math.max(...acceptedInRange.map(q => q.total))
    : 0;

  const openQuotes = await db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.businessId, businessId),
        eq(quotes.status, "sent")
      )
    )
    .orderBy(asc(quotes.sentAt))
    .limit(1);

  const mostAtRiskOpen = openQuotes.length > 0 ? openQuotes[0] : null;

  return {
    quotesSent,
    quotesAccepted,
    quotesDeclined,
    quotesExpired,
    closeRate,
    revenueWon: Math.round(revenueWon * 100) / 100,
    biggestWin: Math.round(biggestWin * 100) / 100,
    mostAtRiskOpen,
  };
}

// ─── Opportunities ───

export async function getDormantCustomers(
  businessId: string,
  thresholdDays: number
): Promise<any[]> {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - thresholdDays);

  const allCustomers = await db
    .select()
    .from(customers)
    .where(eq(customers.businessId, businessId));

  const results: any[] = [];

  for (const c of allCustomers) {
    const customerJobs = await db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.customerId, c.id),
          eq(jobs.businessId, businessId)
        )
      )
      .orderBy(desc(jobs.startDatetime));

    if (customerJobs.length === 0) continue;

    const lastJob = customerJobs[0];
    const lastJobDate = lastJob.endDatetime || lastJob.startDatetime;

    if (lastJobDate && lastJobDate < threshold) {
      const avgTicket = customerJobs.reduce((sum, j) => sum + (j.total || 0), 0) / customerJobs.length;
      results.push({
        ...c,
        lastJobDate,
        avgTicket: Math.round(avgTicket * 100) / 100,
      });
    }
  }

  return results;
}

export async function getLostQuotes(
  businessId: string,
  daysSince: number
): Promise<any[]> {
  const since = new Date();
  since.setDate(since.getDate() - daysSince);

  const lostQuotes = await db
    .select({
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
      customerEmail: customers.email,
    })
    .from(quotes)
    .leftJoin(customers, eq(quotes.customerId, customers.id))
    .where(
      and(
        eq(quotes.businessId, businessId),
        or(
          eq(quotes.status, "expired"),
          eq(quotes.status, "declined")
        ),
        gte(quotes.updatedAt, since)
      )
    )
    .orderBy(desc(quotes.updatedAt));

  return lostQuotes;
}

// ─── Growth Tasks ───

export async function getGrowthTasksByBusiness(
  businessId: string,
  opts?: { type?: string; status?: string; customerId?: string }
): Promise<GrowthTask[]> {
  const conditions = [eq(growthTasks.businessId, businessId)];
  if (opts?.type) conditions.push(eq(growthTasks.type, opts.type));
  if (opts?.status) conditions.push(eq(growthTasks.status, opts.status));
  if (opts?.customerId) conditions.push(eq(growthTasks.customerId, opts.customerId));

  return db
    .select()
    .from(growthTasks)
    .where(and(...conditions))
    .orderBy(desc(growthTasks.priority), asc(growthTasks.dueAt));
}

export async function getGrowthTaskById(id: string): Promise<GrowthTask | undefined> {
  const [t] = await db.select().from(growthTasks).where(eq(growthTasks.id, id));
  return t;
}

export async function createGrowthTask(data: {
  businessId: string;
  customerId?: string;
  quoteId?: string;
  jobId?: string;
  type: string;
  channel?: string;
  dueAt?: Date;
  priority?: number;
  escalationStage?: number;
  maxEscalation?: number;
  templateKey?: string;
  message?: string;
  estimatedValue?: number;
  metadata?: any;
}): Promise<GrowthTask> {
  const [t] = await db
    .insert(growthTasks)
    .values({
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
      metadata: data.metadata || {},
    })
    .returning();
  return t;
}

export async function updateGrowthTask(
  id: string,
  data: Partial<{
    status: string;
    channel: string;
    priority: number;
    escalationStage: number;
    message: string;
    snoozedUntil: Date | null;
    completedAt: Date | null;
    lastActionAt: Date | null;
    metadata: any;
  }>
): Promise<GrowthTask> {
  const [t] = await db
    .update(growthTasks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(growthTasks.id, id))
    .returning();
  return t;
}

export async function deleteGrowthTask(id: string): Promise<void> {
  await db.delete(growthTasks).where(eq(growthTasks.id, id));
}

export async function getActiveGrowthTasksForQuote(quoteId: string): Promise<GrowthTask[]> {
  return db
    .select()
    .from(growthTasks)
    .where(
      and(
        eq(growthTasks.quoteId, quoteId),
        eq(growthTasks.status, "pending")
      )
    );
}

export async function getActiveGrowthTasksForCustomer(customerId: string): Promise<GrowthTask[]> {
  return db
    .select()
    .from(growthTasks)
    .where(
      and(
        eq(growthTasks.customerId, customerId),
        or(
          eq(growthTasks.status, "pending"),
          eq(growthTasks.status, "snoozed")
        )
      )
    );
}

export async function countTodayTasksForCustomer(businessId: string, customerId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const results = await db
    .select()
    .from(growthTasks)
    .where(
      and(
        eq(growthTasks.businessId, businessId),
        eq(growthTasks.customerId, customerId),
        gte(growthTasks.lastActionAt, today),
        lte(growthTasks.lastActionAt, tomorrow)
      )
    );
  return results.length;
}

// ─── Growth Task Events ───

export async function createGrowthTaskEvent(data: {
  taskId: string;
  action: string;
  channel?: string;
  metadata?: any;
}): Promise<GrowthTaskEvent> {
  const [e] = await db
    .insert(growthTaskEvents)
    .values({
      taskId: data.taskId,
      action: data.action,
      channel: data.channel || null,
      metadata: data.metadata || {},
    })
    .returning();
  return e;
}

export async function getEventsByTask(taskId: string): Promise<GrowthTaskEvent[]> {
  return db
    .select()
    .from(growthTaskEvents)
    .where(eq(growthTaskEvents.taskId, taskId))
    .orderBy(desc(growthTaskEvents.createdAt));
}

// ─── Review Requests ───

export async function getReviewRequestsByBusiness(businessId: string): Promise<ReviewRequest[]> {
  return db
    .select()
    .from(reviewRequests)
    .where(eq(reviewRequests.businessId, businessId))
    .orderBy(desc(reviewRequests.createdAt));
}

export async function getReviewRequestByJob(jobId: string): Promise<ReviewRequest | undefined> {
  const [r] = await db
    .select()
    .from(reviewRequests)
    .where(eq(reviewRequests.jobId, jobId));
  return r;
}

export async function createReviewRequest(data: {
  businessId: string;
  customerId?: string;
  jobId?: string;
  status?: string;
}): Promise<ReviewRequest> {
  const [r] = await db
    .insert(reviewRequests)
    .values({
      businessId: data.businessId,
      customerId: data.customerId || null,
      jobId: data.jobId || null,
      status: data.status || "pending",
    })
    .returning();
  return r;
}

export async function updateReviewRequest(
  id: string,
  data: Partial<{
    status: string;
    rating: number;
    feedbackText: string;
    reviewClicked: boolean;
    reviewClickedAt: Date;
    referralSent: boolean;
    referralSentAt: Date;
  }>
): Promise<ReviewRequest> {
  const [r] = await db
    .update(reviewRequests)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(reviewRequests.id, id))
    .returning();
  return r;
}

// ─── Customer Marketing Prefs ───

export async function getMarketingPrefsByCustomer(customerId: string): Promise<CustomerMarketingPref | undefined> {
  const [p] = await db
    .select()
    .from(customerMarketingPrefs)
    .where(eq(customerMarketingPrefs.customerId, customerId));
  return p;
}

export async function upsertMarketingPrefs(
  businessId: string,
  customerId: string,
  data: Partial<{
    doNotContact: boolean;
    preferredChannel: string;
    lastReviewRequestAt: Date;
    reviewRequestCooldownDays: number;
  }>
): Promise<CustomerMarketingPref> {
  const existing = await getMarketingPrefsByCustomer(customerId);
  if (existing) {
    const [p] = await db
      .update(customerMarketingPrefs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customerMarketingPrefs.id, existing.id))
      .returning();
    return p;
  }
  const [p] = await db
    .insert(customerMarketingPrefs)
    .values({ businessId, customerId, ...data })
    .returning();
  return p;
}

// ─── Growth Automation Settings ───

export async function getGrowthAutomationSettings(businessId: string): Promise<GrowthAutomationSetting | undefined> {
  const [s] = await db
    .select()
    .from(growthAutomationSettings)
    .where(eq(growthAutomationSettings.businessId, businessId));
  return s;
}

export async function upsertGrowthAutomationSettings(
  businessId: string,
  data: Partial<{
    marketingModeEnabled: boolean;
    abandonedQuoteRecovery: boolean;
    weeklyReactivation: boolean;
    reviewRequestWorkflow: boolean;
    referralAskWorkflow: boolean;
    rebookNudges: boolean;
    upsellTriggers: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    maxSendsPerDay: number;
    maxFollowUpsPerQuote: number;
    rebookNudgeDaysMin: number;
    rebookNudgeDaysMax: number;
    deepCleanIntervalMonths: number;
    googleReviewLink: string;
    includeReviewOnPdf: boolean;
    includeReviewInMessages: boolean;
    askReviewAfterComplete: boolean;
    referralOfferAmount: number;
    referralBookingLink: string;
    connectedSendingEnabled: boolean;
  }>
): Promise<GrowthAutomationSetting> {
  const existing = await getGrowthAutomationSettings(businessId);
  if (existing) {
    const [s] = await db
      .update(growthAutomationSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(growthAutomationSettings.businessId, businessId))
      .returning();
    return s;
  }
  const [s] = await db
    .insert(growthAutomationSettings)
    .values({ businessId, ...data })
    .returning();
  return s;
}

// ─── Sales Strategy Settings ───

export async function getSalesStrategy(businessId: string): Promise<SalesStrategySetting | undefined> {
  const [s] = await db
    .select()
    .from(salesStrategySettings)
    .where(eq(salesStrategySettings.businessId, businessId));
  return s;
}

export async function upsertSalesStrategy(
  businessId: string,
  data: Partial<{
    selectedProfile: string;
    escalationEnabled: boolean;
  }>
): Promise<SalesStrategySetting> {
  const existing = await getSalesStrategy(businessId);
  if (existing) {
    const [s] = await db
      .update(salesStrategySettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(salesStrategySettings.businessId, businessId))
      .returning();
    return s;
  }
  const [s] = await db
    .insert(salesStrategySettings)
    .values({ businessId, ...data })
    .returning();
  return s;
}

// ─── Campaigns ───

export async function getCampaignsByBusiness(businessId: string): Promise<Campaign[]> {
  return db
    .select()
    .from(campaigns)
    .where(eq(campaigns.businessId, businessId))
    .orderBy(desc(campaigns.createdAt));
}

export async function getCampaignById(id: string): Promise<Campaign | undefined> {
  const [c] = await db.select().from(campaigns).where(eq(campaigns.id, id));
  return c;
}

export async function createCampaign(data: {
  businessId: string;
  name: string;
  segment: string;
  channel?: string;
  templateKey?: string;
  customerIds?: string[] | null;
  taskCount?: number;
}): Promise<Campaign> {
  const [c] = await db
    .insert(campaigns)
    .values({
      businessId: data.businessId,
      name: data.name,
      segment: data.segment,
      channel: data.channel || "sms",
      templateKey: data.templateKey || null,
      customerIds: data.customerIds || null,
      taskCount: data.taskCount || 0,
    })
    .returning();
  return c;
}

export async function updateCampaign(
  id: string,
  data: Partial<{
    name: string;
    status: string;
    completedCount: number;
    customerIds: string[] | null;
    messageContent: string;
    messageSubject: string;
  }>
): Promise<Campaign> {
  const [c] = await db
    .update(campaigns)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(campaigns.id, id))
    .returning();
  return c;
}

// ─── Growth Utility Functions ───

export async function getUpsellOpportunities(businessId: string): Promise<any[]> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const allCustomers = await db
    .select()
    .from(customers)
    .where(eq(customers.businessId, businessId));

  const results: any[] = [];

  for (const c of allCustomers) {
    const customerJobs = await db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.customerId, c.id),
          eq(jobs.businessId, businessId)
        )
      )
      .orderBy(desc(jobs.startDatetime));

    if (customerJobs.length === 0) continue;

    const deepCleanJobs = customerJobs.filter(j => j.jobType === "deep_clean");
    const lastDeepClean = deepCleanJobs.length > 0 ? deepCleanJobs[0] : null;

    if (!lastDeepClean || lastDeepClean.startDatetime < sixMonthsAgo) {
      const avgTicket = customerJobs.reduce((sum, j) => sum + (j.total || 0), 0) / customerJobs.length;
      const lastDeepCleanDate = lastDeepClean?.startDatetime || null;
      const daysSince = lastDeepCleanDate
        ? Math.floor((Date.now() - lastDeepCleanDate.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      results.push({
        customer: c,
        lastDeepClean: lastDeepCleanDate,
        daysSince,
        avgTicket: Math.round(avgTicket * 100) / 100,
      });
    }
  }

  return results;
}

export async function getAutoRebookCandidates(
  businessId: string,
  minDays: number,
  maxDays: number
): Promise<any[]> {
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - maxDays);
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() - minDays);

  const allCustomers = await db
    .select()
    .from(customers)
    .where(eq(customers.businessId, businessId));

  const results: any[] = [];

  for (const c of allCustomers) {
    const customerJobs = await db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.customerId, c.id),
          eq(jobs.businessId, businessId)
        )
      )
      .orderBy(desc(jobs.startDatetime));

    if (customerJobs.length === 0) continue;

    const lastJob = customerJobs[0];
    const lastJobDate = lastJob.endDatetime || lastJob.startDatetime;

    if (lastJobDate && lastJobDate >= minDate && lastJobDate <= maxDate) {
      const hasRecurrence = customerJobs.some(j => j.recurrence && j.recurrence !== "none");
      if (hasRecurrence) continue;

      const pendingRebookTasks = await db
        .select()
        .from(growthTasks)
        .where(
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
        lastJobTotal: lastJob.total || 0,
      });
    }
  }

  return results;
}

export async function getForecastData(businessId: string): Promise<{
  openQuoteValue: number;
  closeRate: number;
  forecastedRevenue: number;
  confidenceLow: number;
  confidenceHigh: number;
  scheduledJobsValue: number;
}> {
  const openQuotes = await db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.businessId, businessId),
        eq(quotes.status, "sent")
      )
    );

  const openQuoteValue = openQuotes.reduce((sum, q) => sum + q.total, 0);

  const allQuotes = await db
    .select()
    .from(quotes)
    .where(eq(quotes.businessId, businessId));

  const accepted = allQuotes.filter(q => q.status === "accepted").length;
  const closeRate = allQuotes.length > 0 ? (accepted / allQuotes.length) * 100 : 0;

  const forecastedRevenue = openQuoteValue * (closeRate / 100);
  const confidenceLow = forecastedRevenue * 0.8;
  const confidenceHigh = forecastedRevenue * 1.2;

  const scheduledJobs = await db
    .select()
    .from(jobs)
    .where(
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
    scheduledJobsValue: Math.round(scheduledJobsValue * 100) / 100,
  };
}

export async function getRecommendationsByQuote(quoteId: string) {
  return db
    .select()
    .from(salesRecommendations)
    .where(eq(salesRecommendations.quoteId, quoteId))
    .orderBy(asc(salesRecommendations.createdAt));
}

export async function createRecommendation(data: {
  businessId: string;
  quoteId: string;
  customerId?: string;
  type: string;
  title: string;
  rationale: string;
  suggestedDate?: Date;
  actionPayload?: any;
}) {
  const [rec] = await db
    .insert(salesRecommendations)
    .values(data)
    .returning();
  return rec;
}

export async function updateRecommendation(id: string, data: { status?: string; completedAt?: Date }) {
  const [rec] = await db
    .update(salesRecommendations)
    .set(data)
    .where(eq(salesRecommendations.id, id))
    .returning();
  return rec;
}

// ─── Job Satisfaction Ratings ───

export async function rateJob(jobId: string, rating: number, comment?: string): Promise<Job> {
  const [j] = await db
    .update(jobs)
    .set({ satisfactionRating: rating, ratingComment: comment ?? null, updatedAt: new Date() })
    .where(eq(jobs.id, jobId))
    .returning();
  return j;
}

export async function getRatingsSummary(businessId: string): Promise<{
  average: number;
  total: number;
  distribution: Record<number, number>;
}> {
  const ratedJobs = await db
    .select({ satisfactionRating: jobs.satisfactionRating })
    .from(jobs)
    .where(
      and(
        eq(jobs.businessId, businessId),
        isNotNull(jobs.satisfactionRating)
      )
    );

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const row of ratedJobs) {
    const r = row.satisfactionRating!;
    distribution[r] = (distribution[r] || 0) + 1;
    sum += r;
  }
  const total = ratedJobs.length;
  const average = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

  return { average, total, distribution };
}

export async function createInvoicePacket(data: Omit<InvoicePacket, "id" | "createdAt">): Promise<InvoicePacket> {
  const [r] = await db.insert(invoicePackets).values(data).returning();
  return r;
}

export async function getInvoicePacketsByQuoteId(quoteId: string): Promise<InvoicePacket[]> {
  return db.select().from(invoicePackets).where(eq(invoicePackets.quoteId, quoteId)).orderBy(desc(invoicePackets.createdAt));
}

export async function getInvoicePacketById(id: string): Promise<InvoicePacket | undefined> {
  const [r] = await db.select().from(invoicePackets).where(eq(invoicePackets.id, id));
  return r;
}

export async function createCalendarEventStub(data: Omit<CalendarEventStub, "id" | "createdAt">): Promise<CalendarEventStub> {
  const [r] = await db.insert(calendarEventStubs).values(data).returning();
  return r;
}

export async function getCalendarEventStubsByQuoteId(quoteId: string): Promise<CalendarEventStub[]> {
  return db.select().from(calendarEventStubs).where(eq(calendarEventStubs.quoteId, quoteId)).orderBy(desc(calendarEventStubs.createdAt));
}

export async function createApiKey(data: Omit<ApiKey, "id" | "createdAt" | "rotatedAt">): Promise<ApiKey> {
  const [r] = await db.insert(apiKeys).values(data).returning();
  return r;
}

export async function getApiKeysByUserId(userId: string): Promise<ApiKey[]> {
  return db.select().from(apiKeys).where(and(eq(apiKeys.userId, userId), eq(apiKeys.isActive, true))).orderBy(desc(apiKeys.createdAt));
}

export async function deactivateApiKey(id: string, userId: string): Promise<void> {
  await db.update(apiKeys).set({ isActive: false }).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
}

export async function getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
  const [r] = await db.select().from(apiKeys).where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isActive, true)));
  return r;
}

export async function createWebhookEndpoint(data: Omit<WebhookEndpoint, "id" | "createdAt">): Promise<WebhookEndpoint> {
  const [r] = await db.insert(webhookEndpoints).values(data).returning();
  return r;
}

export async function getWebhookEndpointsByUserId(userId: string): Promise<WebhookEndpoint[]> {
  return db.select().from(webhookEndpoints).where(eq(webhookEndpoints.userId, userId)).orderBy(desc(webhookEndpoints.createdAt));
}

export async function updateWebhookEndpoint(id: string, userId: string, data: Partial<Pick<WebhookEndpoint, "url" | "isActive" | "enabledEvents">>): Promise<WebhookEndpoint | undefined> {
  const [r] = await db.update(webhookEndpoints).set(data).where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.userId, userId))).returning();
  return r;
}

export async function deleteWebhookEndpoint(id: string, userId: string): Promise<void> {
  await db.delete(webhookEndpoints).where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.userId, userId)));
}

export async function getActiveWebhookEndpointsForBusiness(businessId: string): Promise<WebhookEndpoint[]> {
  return db.select().from(webhookEndpoints).where(and(eq(webhookEndpoints.businessId, businessId), eq(webhookEndpoints.isActive, true)));
}

export async function createWebhookEvent(data: Omit<WebhookEvent, "id" | "createdAt">): Promise<WebhookEvent> {
  const [r] = await db.insert(webhookEvents).values(data).returning();
  return r;
}

export async function getWebhookEventsByUserId(userId: string, limit = 50): Promise<WebhookEvent[]> {
  return db.select().from(webhookEvents).where(eq(webhookEvents.userId, userId)).orderBy(desc(webhookEvents.createdAt)).limit(limit);
}

export async function getWebhookEventById(id: string): Promise<WebhookEvent | undefined> {
  const [r] = await db.select().from(webhookEvents).where(eq(webhookEvents.id, id));
  return r;
}

export async function createWebhookDelivery(data: Omit<WebhookDelivery, "id" | "createdAt">): Promise<WebhookDelivery> {
  const [r] = await db.insert(webhookDeliveries).values(data).returning();
  return r;
}

export async function getWebhookDeliveriesByEventId(eventId: string): Promise<WebhookDelivery[]> {
  return db.select().from(webhookDeliveries).where(eq(webhookDeliveries.webhookEventId, eventId)).orderBy(asc(webhookDeliveries.attemptNumber));
}

export async function updateWebhookDelivery(id: string, data: Partial<Pick<WebhookDelivery, "statusCode" | "responseBodyExcerpt" | "nextRetryAt" | "deliveredAt">>): Promise<void> {
  await db.update(webhookDeliveries).set(data).where(eq(webhookDeliveries.id, id));
}

// ─── Retention Features ───

export async function getStaleQuotesForNudge(hoursOld: number = 48): Promise<any[]> {
  const cutoff = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
  return db
    .select({
      id: quotes.id,
      businessId: quotes.businessId,
      customerId: quotes.customerId,
      propertyDetails: quotes.propertyDetails,
      total: quotes.total,
      sentAt: quotes.sentAt,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.status, "sent"),
        lt(quotes.sentAt, cutoff),
        isNull(quotes.nudgeSentAt)
      )
    );
}

export async function markQuoteNudgeSent(quoteId: string): Promise<void> {
  await db.update(quotes).set({ nudgeSentAt: new Date() }).where(eq(quotes.id, quoteId));
}

export async function markReviewRequestSent(quoteId: string): Promise<void> {
  await db.update(quotes).set({ reviewRequestSentAt: new Date() }).where(eq(quotes.id, quoteId));
}

export async function getAllBusinessIds(): Promise<string[]> {
  const rows = await db.select({ id: businesses.id }).from(businesses);
  return rows.map((r) => r.id);
}

export async function markMilestoneCelebrated(businessId: string, milestone: number): Promise<void> {
  const prefs = await getPreferencesByBusiness(businessId);
  const current: number[] = Array.isArray(prefs?.celebratedMilestones) ? (prefs.celebratedMilestones as number[]) : [];
  if (current.includes(milestone)) return;
  const updated = [...current, milestone];
  await upsertPreferences(businessId, { celebratedMilestones: updated } as any);
}

export async function markWeeklyDigestSent(businessId: string): Promise<void> {
  await db
    .update(userPreferences)
    .set({ lastWeeklyDigestAt: new Date() })
    .where(eq(userPreferences.businessId, businessId));
}

export async function getWeeklyQuoteStats(businessId: string): Promise<{
  sentCount: number;
  acceptedCount: number;
  revenueWon: number;
  pendingQuotes: Array<{ id: string; customerName: string; total: number; sentAt: Date | null }>;
}> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const allQuotes = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.businessId, businessId), gte(quotes.createdAt, since)));

  const sentCount = allQuotes.filter((q) => ["sent", "accepted", "declined"].includes(q.status)).length;
  const acceptedCount = allQuotes.filter((q) => q.status === "accepted").length;
  const revenueWon = allQuotes.filter((q) => q.status === "accepted").reduce((s, q) => s + (Number(q.total) || 0), 0);

  const pendingAll = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.businessId, businessId), eq(quotes.status, "sent")))
    .orderBy(asc(quotes.sentAt))
    .limit(5);

  const pendingQuotes = pendingAll.map((q) => ({
    id: q.id,
    customerName: (q.propertyDetails as any)?.customerName || "Customer",
    total: Number(q.total) || 0,
    sentAt: q.sentAt,
  }));

  return { sentCount, acceptedCount, revenueWon, pendingQuotes };
}

// ─── Local Lead Finder Storage ───────────────────────────────────────────────

export async function getLeadFinderSettings(
  userId: string,
  businessId: string
): Promise<LeadFinderSettings | undefined> {
  const [row] = await db
    .select()
    .from(leadFinderSettings)
    .where(and(eq(leadFinderSettings.userId, userId), eq(leadFinderSettings.businessId, businessId)));
  return row;
}

export async function upsertLeadFinderSettings(
  userId: string,
  businessId: string,
  payload: Partial<typeof leadFinderSettings.$inferInsert>
): Promise<LeadFinderSettings> {
  const existing = await getLeadFinderSettings(userId, businessId);
  if (existing) {
    const [updated] = await db
      .update(leadFinderSettings)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(leadFinderSettings.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(leadFinderSettings)
    .values({ userId, businessId, ...payload })
    .returning();
  return created;
}

export async function createLeadIfNotExists(data: {
  userId: string;
  businessId: string;
  source: string;
  externalId: string;
  subreddit?: string;
  title?: string;
  body?: string;
  author?: string;
  postUrl?: string;
  permalink?: string;
  matchedKeyword?: string;
  detectedLocation?: string;
  intent?: string;
  aiClassification?: string;
  aiConfidence?: number;
  aiReason?: string;
  leadScore?: number;
  postedAt?: Date;
  metadata?: any;
}): Promise<{ lead: LeadFinderLead; created: boolean }> {
  const [existing] = await db
    .select()
    .from(leadFinderLeads)
    .where(
      and(
        eq(leadFinderLeads.businessId, data.businessId),
        eq(leadFinderLeads.source, data.source),
        eq(leadFinderLeads.externalId, data.externalId)
      )
    );
  if (existing) return { lead: existing, created: false };

  const [lead] = await db
    .insert(leadFinderLeads)
    .values({
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
      metadata: data.metadata,
    })
    .returning();
  return { lead, created: true };
}

export async function getLeadFinderLeads(
  userId: string,
  businessId: string,
  filters: {
    status?: string;
    keyword?: string;
    minScore?: number;
    limit?: number;
    page?: number;
  } = {}
): Promise<{ leads: LeadFinderLead[]; total: number }> {
  const limit = Math.min(filters.limit ?? 20, 50);
  const offset = ((filters.page ?? 1) - 1) * limit;

  const conditions = [
    eq(leadFinderLeads.userId, userId),
    eq(leadFinderLeads.businessId, businessId),
  ];

  if (filters.status && filters.status !== "all") {
    conditions.push(eq(leadFinderLeads.status, filters.status));
  }
  if (filters.keyword) {
    conditions.push(eq(leadFinderLeads.matchedKeyword, filters.keyword));
  }

  const leads = await db
    .select()
    .from(leadFinderLeads)
    .where(and(...conditions))
    .orderBy(desc(leadFinderLeads.leadScore), desc(leadFinderLeads.postedAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(leadFinderLeads)
    .where(and(...conditions));

  return { leads, total: Number(count) };
}

export async function getLeadFinderLeadById(
  id: string,
  userId: string,
  businessId: string
): Promise<LeadFinderLead | undefined> {
  const [lead] = await db
    .select()
    .from(leadFinderLeads)
    .where(
      and(
        eq(leadFinderLeads.id, id),
        eq(leadFinderLeads.userId, userId),
        eq(leadFinderLeads.businessId, businessId)
      )
    );
  return lead;
}

export async function updateLeadStatus(
  id: string,
  userId: string,
  businessId: string,
  status: string
): Promise<LeadFinderLead | undefined> {
  const [updated] = await db
    .update(leadFinderLeads)
    .set({ status, updatedAt: new Date() })
    .where(
      and(
        eq(leadFinderLeads.id, id),
        eq(leadFinderLeads.userId, userId),
        eq(leadFinderLeads.businessId, businessId)
      )
    )
    .returning();
  return updated;
}

export async function countNewLeadFinderLeads(
  userId: string,
  businessId: string
): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(leadFinderLeads)
    .where(
      and(
        eq(leadFinderLeads.userId, userId),
        eq(leadFinderLeads.businessId, businessId),
        eq(leadFinderLeads.status, "new")
      )
    );
  return Number(count);
}

export async function saveGeneratedReplies(
  leadId: string,
  replies: Array<{ tone: string; replyText: string }>
): Promise<LeadFinderReply[]> {
  await db.delete(leadFinderReplies).where(eq(leadFinderReplies.leadId, leadId));
  const inserted = await db
    .insert(leadFinderReplies)
    .values(replies.map((r) => ({ leadId, tone: r.tone, replyText: r.replyText })))
    .returning();
  return inserted;
}

export async function getGeneratedReplies(leadId: string): Promise<LeadFinderReply[]> {
  return db
    .select()
    .from(leadFinderReplies)
    .where(eq(leadFinderReplies.leadId, leadId))
    .orderBy(asc(leadFinderReplies.createdAt));
}

export async function findBusinessesWithLeadFinderEnabled(): Promise<
  Array<{ userId: string; businessId: string; settings: LeadFinderSettings }>
> {
  const rows = await db
    .select()
    .from(leadFinderSettings)
    .where(eq(leadFinderSettings.enabled, true));
  return rows.map((s) => ({ userId: s.userId, businessId: s.businessId, settings: s }));
}

export async function logLeadFinderEvent(
  leadId: string | null,
  userId: string,
  eventType: string,
  metadata?: any
): Promise<void> {
  await db.insert(leadFinderEvents).values({
    leadId: leadId ?? undefined,
    userId,
    eventType,
    metadata,
  });
}

// ===== AI Quote Assistant Storage =====

export async function getBusinessById(id: string): Promise<Business | undefined> {
  const [b] = await db.select().from(businesses).where(eq(businesses.id, id));
  return b;
}

// ===== Self-Booking Availability =====

export async function getBookingAvailability(businessId: string) {
  const [row] = await db
    .select()
    .from(bookingAvailabilitySettings)
    .where(eq(bookingAvailabilitySettings.businessId, businessId));
  return row || null;
}

export async function upsertBookingAvailability(businessId: string, data: {
  enabled?: boolean;
  allowedDays?: number[];
  timeWindows?: { start: string; end: string }[];
  slotDurationHours?: number;
  slotIntervalHours?: number;
  minNoticeHours?: number;
  maxJobsPerDay?: number;
  blackoutDates?: string[];
  serviceAreaNotes?: string;
  confirmationMessage?: string;
}) {
  const existing = await getBookingAvailability(businessId);
  if (existing) {
    const [updated] = await db
      .update(bookingAvailabilitySettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(bookingAvailabilitySettings.businessId, businessId))
      .returning();
    return updated;
  } else {
    const [created] = await db
      .insert(bookingAvailabilitySettings)
      .values({ businessId, ...data })
      .returning();
    return created;
  }
}

export async function generateBookingSlots(
  businessId: string,
  fromDate: Date,
  toDate: Date
): Promise<{ date: string; slots: { start: string; end: string; label: string }[] }[]> {
  const settings = await getBookingAvailability(businessId);
  if (!settings || !settings.enabled) return [];

  const allowedDays = settings.allowedDays || [1, 2, 3, 4, 5];
  const timeWindows = (settings.timeWindows as any[]) || [{ start: "08:00", end: "17:00" }];
  const slotDuration = (settings.slotDurationHours || 3) * 60;
  const slotInterval = (settings.slotIntervalHours || 2) * 60;
  const minNoticeMs = (settings.minNoticeHours || 24) * 60 * 60 * 1000;
  const maxPerDay = settings.maxJobsPerDay || 4;
  const blackoutDates = settings.blackoutDates || [];

  const minAllowedStart = new Date(Date.now() + minNoticeMs);

  // Fetch existing jobs in range
  const existingJobs = await db
    .select({ startDatetime: jobs.startDatetime, endDatetime: jobs.endDatetime })
    .from(jobs)
    .where(
      and(
        eq(jobs.businessId, businessId),
        gte(jobs.startDatetime, fromDate),
        lte(jobs.startDatetime, toDate)
      )
    );

  const jobCountByDay: Record<string, number> = {};
  for (const j of existingJobs) {
    const dayKey = j.startDatetime.toISOString().slice(0, 10);
    jobCountByDay[dayKey] = (jobCountByDay[dayKey] || 0) + 1;
  }

  const results: { date: string; slots: { start: string; end: string; label: string }[] }[] = [];

  const current = new Date(fromDate);
  current.setHours(0, 0, 0, 0);

  while (current <= toDate) {
    const dayOfWeek = current.getDay();
    const dateStr = current.toISOString().slice(0, 10);

    if (allowedDays.includes(dayOfWeek) && !blackoutDates.includes(dateStr)) {
      const dayJobCount = jobCountByDay[dateStr] || 0;
      if (dayJobCount < maxPerDay) {
        const daySlots: { start: string; end: string; label: string }[] = [];

        for (const window of timeWindows) {
          const [startH, startM] = window.start.split(":").map(Number);
          const [endH, endM] = window.end.split(":").map(Number);
          const windowStart = startH * 60 + startM;
          const windowEnd = endH * 60 + endM;

          let slotStart = windowStart;
          while (slotStart + slotDuration <= windowEnd) {
            const slotEnd = slotStart + slotDuration;

            const slotStartDate = new Date(current);
            slotStartDate.setHours(Math.floor(slotStart / 60), slotStart % 60, 0, 0);
            const slotEndDate = new Date(current);
            slotEndDate.setHours(Math.floor(slotEnd / 60), slotEnd % 60, 0, 0);

            // Check min notice
            if (slotStartDate > minAllowedStart) {
              // Check overlap with existing jobs
              const overlaps = existingJobs.some(j => {
                const jStart = new Date(j.startDatetime).getTime();
                const jEnd = j.endDatetime ? new Date(j.endDatetime).getTime() : jStart + 3 * 60 * 60 * 1000;
                return slotStartDate.getTime() < jEnd && slotEndDate.getTime() > jStart;
              });

              if (!overlaps) {
                const fmtTime = (minutes: number) => {
                  const h = Math.floor(minutes / 60);
                  const m = minutes % 60;
                  const ampm = h >= 12 ? "PM" : "AM";
                  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
                  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
                };
                daySlots.push({
                  start: slotStartDate.toISOString(),
                  end: slotEndDate.toISOString(),
                  label: `${fmtTime(slotStart)} – ${fmtTime(slotEnd)}`,
                });
              }
            }
            slotStart += slotInterval;
          }
        }

        if (daySlots.length > 0) {
          results.push({ date: dateStr, slots: daySlots });
        }
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return results;
}

