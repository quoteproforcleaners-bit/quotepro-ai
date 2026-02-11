import { eq, and, desc, asc, gte, lte, ilike, or, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  businesses,
  pricingSettings,
  customers,
  quotes,
  quoteLineItems,
  jobs,
  jobChecklistItems,
  communications,
  automationRules,
  tasks,
  type User,
  type Business,
  type PricingSettingsRow,
  type Customer,
  type QuoteRow,
  type QuoteLineItem,
  type Job,
  type JobChecklistItem,
  type Communication,
  type AutomationRule,
  type Task,
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
    onboardingComplete: boolean;
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
  opts?: { status?: string; customerId?: string; from?: Date; to?: Date }
): Promise<Job[]> {
  const conditions = [eq(jobs.businessId, businessId)];
  if (opts?.status) conditions.push(eq(jobs.status, opts.status));
  if (opts?.customerId) conditions.push(eq(jobs.customerId, opts.customerId));
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

export async function createJob(data: {
  businessId: string;
  customerId?: string;
  quoteId?: string;
  jobType: string;
  status?: string;
  startDatetime: Date;
  endDatetime?: Date;
  recurrence?: string;
  internalNotes?: string;
  address?: string;
  total?: number;
}): Promise<Job> {
  const [j] = await db
    .insert(jobs)
    .values({
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
      total: data.total || null,
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
  }>
): Promise<Communication> {
  const [c] = await db
    .update(communications)
    .set(data)
    .where(eq(communications.id, id))
    .returning();
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
  const respondedCount = accepted + declined;
  const closeRate = respondedCount > 0 ? (accepted / respondedCount) * 100 : 0;

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

// ─── Background Jobs ───

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
