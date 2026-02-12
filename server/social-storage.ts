import { eq, and, desc, asc, gte, sql } from "drizzle-orm";
import { db } from "./db";
import {
  channelConnections,
  socialConversations,
  socialMessages,
  socialLeads,
  attributionEvents,
  socialAutomationSettings,
  socialOptOuts,
  type ChannelConnection,
  type SocialConversation,
  type SocialMessage,
  type SocialLead,
  type AttributionEvent,
  type SocialAutomationSetting,
  type SocialOptOut,
} from "@shared/schema";

export async function getChannelConnectionsByBusiness(businessId: string): Promise<ChannelConnection[]> {
  return db.select().from(channelConnections).where(eq(channelConnections.businessId, businessId)).orderBy(desc(channelConnections.updatedAt));
}

export async function getChannelConnection(id: string): Promise<ChannelConnection | undefined> {
  const [c] = await db.select().from(channelConnections).where(eq(channelConnections.id, id));
  return c;
}

export async function getChannelConnectionByChannel(businessId: string, channel: string): Promise<ChannelConnection | undefined> {
  const [c] = await db.select().from(channelConnections).where(and(eq(channelConnections.businessId, businessId), eq(channelConnections.channel, channel)));
  return c;
}

export async function upsertChannelConnection(businessId: string, channel: string, data: Partial<{
  status: string;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  pageId: string | null;
  pageName: string | null;
  igUserId: string | null;
  igUsername: string | null;
  webhookVerified: boolean;
  lastWebhookAt: Date | null;
  permissions: any;
}>): Promise<ChannelConnection> {
  const existing = await getChannelConnectionByChannel(businessId, channel);
  if (existing) {
    const [c] = await db.update(channelConnections).set({ ...data, updatedAt: new Date() }).where(eq(channelConnections.id, existing.id)).returning();
    return c;
  }
  const [c] = await db.insert(channelConnections).values({ businessId, channel, ...data }).returning();
  return c;
}

export async function deleteChannelConnection(id: string): Promise<void> {
  await db.delete(channelConnections).where(eq(channelConnections.id, id));
}

export async function getConversationsByBusiness(businessId: string, opts?: { channel?: string; limit?: number }): Promise<SocialConversation[]> {
  const conditions = [eq(socialConversations.businessId, businessId)];
  if (opts?.channel) conditions.push(eq(socialConversations.channel, opts.channel));
  let query = db.select().from(socialConversations).where(and(...conditions)).orderBy(desc(socialConversations.lastMessageAt));
  if (opts?.limit) return (query as any).limit(opts.limit);
  return query;
}

export async function getConversationById(id: string): Promise<SocialConversation | undefined> {
  const [c] = await db.select().from(socialConversations).where(eq(socialConversations.id, id));
  return c;
}

export async function createConversation(data: {
  businessId: string;
  channelConnectionId?: string;
  channel: string;
  externalConversationId?: string;
  senderName: string;
  senderExternalId?: string;
  senderProfileUrl?: string;
}): Promise<SocialConversation> {
  const [c] = await db.insert(socialConversations).values({
    businessId: data.businessId,
    channelConnectionId: data.channelConnectionId || null,
    channel: data.channel,
    externalConversationId: data.externalConversationId || null,
    senderName: data.senderName,
    senderExternalId: data.senderExternalId || null,
    senderProfileUrl: data.senderProfileUrl || null,
    lastMessageAt: new Date(),
  }).returning();
  return c;
}

export async function updateConversation(id: string, data: Partial<{
  status: string;
  autoReplied: boolean;
  optedOut: boolean;
  leadId: string | null;
  lastMessageAt: Date;
}>): Promise<SocialConversation> {
  const [c] = await db.update(socialConversations).set({ ...data, updatedAt: new Date() }).where(eq(socialConversations.id, id)).returning();
  return c;
}

export async function getMessagesByConversation(conversationId: string): Promise<SocialMessage[]> {
  return db.select().from(socialMessages).where(eq(socialMessages.conversationId, conversationId)).orderBy(asc(socialMessages.createdAt));
}

export async function createMessage(data: {
  conversationId: string;
  direction: string;
  content: string;
  externalMessageId?: string;
  intentDetected?: boolean;
  intentConfidence?: number;
  intentCategory?: string;
  autoReplyContent?: string;
  quoteLink?: string;
}): Promise<SocialMessage> {
  const [m] = await db.insert(socialMessages).values({
    conversationId: data.conversationId,
    direction: data.direction,
    content: data.content,
    externalMessageId: data.externalMessageId || null,
    intentDetected: data.intentDetected ?? null,
    intentConfidence: data.intentConfidence ?? null,
    intentCategory: data.intentCategory || null,
    autoReplyContent: data.autoReplyContent || null,
    quoteLink: data.quoteLink || null,
  }).returning();
  return m;
}

export async function getSocialLeadsByBusiness(businessId: string, opts?: { channel?: string; status?: string }): Promise<SocialLead[]> {
  const conditions = [eq(socialLeads.businessId, businessId)];
  if (opts?.channel) conditions.push(eq(socialLeads.channel, opts.channel));
  if (opts?.status) conditions.push(eq(socialLeads.status, opts.status));
  return db.select().from(socialLeads).where(and(...conditions)).orderBy(desc(socialLeads.createdAt));
}

export async function getSocialLeadById(id: string): Promise<SocialLead | undefined> {
  const [l] = await db.select().from(socialLeads).where(eq(socialLeads.id, id));
  return l;
}

export async function createSocialLead(data: {
  businessId: string;
  customerId?: string;
  conversationId?: string;
  channel: string;
  attribution?: string;
  senderName: string;
  senderHandle?: string;
  dmText?: string;
  quoteId?: string;
  status?: string;
  revenue?: number;
}): Promise<SocialLead> {
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
    revenue: data.revenue || null,
  }).returning();
  return l;
}

export async function updateSocialLead(id: string, data: Partial<{
  customerId: string | null;
  quoteId: string | null;
  status: string;
  revenue: number | null;
}>): Promise<SocialLead> {
  const [l] = await db.update(socialLeads).set({ ...data, updatedAt: new Date() }).where(eq(socialLeads.id, id)).returning();
  return l;
}

export async function createAttributionEvent(data: {
  businessId: string;
  socialLeadId?: string;
  conversationId?: string;
  channel: string;
  eventType: string;
  metadata?: any;
}): Promise<AttributionEvent> {
  const [e] = await db.insert(attributionEvents).values({
    businessId: data.businessId,
    socialLeadId: data.socialLeadId || null,
    conversationId: data.conversationId || null,
    channel: data.channel,
    eventType: data.eventType,
    metadata: data.metadata || {},
  }).returning();
  return e;
}

export async function getAttributionEventsByBusiness(businessId: string, opts?: { channel?: string; days?: number }): Promise<AttributionEvent[]> {
  const conditions = [eq(attributionEvents.businessId, businessId)];
  if (opts?.channel) conditions.push(eq(attributionEvents.channel, opts.channel));
  if (opts?.days) {
    const since = new Date();
    since.setDate(since.getDate() - opts.days);
    conditions.push(gte(attributionEvents.createdAt, since));
  }
  return db.select().from(attributionEvents).where(and(...conditions)).orderBy(desc(attributionEvents.createdAt));
}

export async function getSocialAutomationSettings(businessId: string): Promise<SocialAutomationSetting | undefined> {
  const [s] = await db.select().from(socialAutomationSettings).where(eq(socialAutomationSettings.businessId, businessId));
  return s;
}

export async function upsertSocialAutomationSettings(businessId: string, data: Partial<{
  autoRepliesEnabled: boolean;
  intentThreshold: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  replyTemplate: string;
  optOutKeywords: any;
  socialOnboardingComplete: boolean;
}>): Promise<SocialAutomationSetting> {
  const existing = await getSocialAutomationSettings(businessId);
  if (existing) {
    const [s] = await db.update(socialAutomationSettings).set({ ...data, updatedAt: new Date() }).where(eq(socialAutomationSettings.id, existing.id)).returning();
    return s;
  }
  const [s] = await db.insert(socialAutomationSettings).values({ businessId, ...data }).returning();
  return s;
}

export async function createSocialOptOut(data: {
  businessId: string;
  channel: string;
  externalUserId: string;
  senderName?: string;
  reason?: string;
}): Promise<SocialOptOut> {
  const [o] = await db.insert(socialOptOuts).values({
    businessId: data.businessId,
    channel: data.channel,
    externalUserId: data.externalUserId,
    senderName: data.senderName || null,
    reason: data.reason || null,
  }).returning();
  return o;
}

export async function getSocialOptOutsByBusiness(businessId: string): Promise<SocialOptOut[]> {
  return db.select().from(socialOptOuts).where(eq(socialOptOuts.businessId, businessId)).orderBy(desc(socialOptOuts.createdAt));
}

export async function getSocialStats(businessId: string, days: number = 30): Promise<{
  totalLeads: number;
  totalQuotes: number;
  totalRevenue: number;
  avgResponseTime: number;
  leadsByChannel: Record<string, number>;
  quotesByChannel: Record<string, number>;
  revenueByChannel: Record<string, number>;
}> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const leads = await db.select().from(socialLeads).where(and(eq(socialLeads.businessId, businessId), gte(socialLeads.createdAt, since)));
  const conversations = await db.select().from(socialConversations).where(and(eq(socialConversations.businessId, businessId), gte(socialConversations.createdAt, since)));

  const totalLeads = leads.length;
  const quotedLeads = leads.filter(l => l.quoteId);
  const totalQuotes = quotedLeads.length;
  const totalRevenue = leads.reduce((s, l) => s + (l.revenue || 0), 0);

  const autoRepliedConvos = conversations.filter(c => c.autoReplied && c.lastMessageAt && c.createdAt);
  const avgResponseTime = autoRepliedConvos.length > 0
    ? autoRepliedConvos.reduce((s, c) => {
        const diff = (c.lastMessageAt!.getTime() - c.createdAt.getTime()) / 1000;
        return s + diff;
      }, 0) / autoRepliedConvos.length
    : 0;

  const leadsByChannel: Record<string, number> = {};
  const quotesByChannel: Record<string, number> = {};
  const revenueByChannel: Record<string, number> = {};
  for (const l of leads) {
    leadsByChannel[l.channel] = (leadsByChannel[l.channel] || 0) + 1;
    if (l.quoteId) quotesByChannel[l.channel] = (quotesByChannel[l.channel] || 0) + 1;
    if (l.revenue) revenueByChannel[l.channel] = (revenueByChannel[l.channel] || 0) + l.revenue;
  }

  return { totalLeads, totalQuotes, totalRevenue: Math.round(totalRevenue * 100) / 100, avgResponseTime: Math.round(avgResponseTime), leadsByChannel, quotesByChannel, revenueByChannel };
}
