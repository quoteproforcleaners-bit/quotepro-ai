/**
 * Generates proper TypeScript router files from the extracted route blocks.
 * Run after split-routes.mjs.
 *
 * Usage: node scripts/generate-routers.mjs
 */

import fs from "fs";

const routerDir = "server/routers";

// ─── Common imports used by every router ─────────────────────────────────────

const COMMON_IMPORTS = `import { Router, type Request, type Response } from "express";
import { pool, db } from "../db";
import { eq, and, desc, asc, gte, lte, lt, gt, isNull, isNotNull, inArray, sql } from "drizzle-orm";
import { requireAuth, requireGrowth, requireStarter, requirePro, authLimiter, loginFailureLimiter } from "../middleware";
import { openai, getStripe, getPublicBaseUrl, getLangInstruction, getEffectiveLang, generateRevenuePlaybook, generateJobUpdatePageHtml } from "../clients";
import {
  buildJobCardEmail, buildCleanerEmailHtml, buildCleanerUpdateEmailHtml,
  getAutoProgressTiming, computeAutoProgressStatus,
  generateQuotePdfHtml, generateFollowUpMessage, sendFollowUpNow,
  createShortLink, jobberGQL, jobberGetOrCreateClient, jobberGetOrCreateProperty,
  generateIntakeCode, ensureIntakeCode, getOrCreateShortUrl,
  slugify, ensurePublicSlug, lookupIntakeBusiness,
  processPendingFollowUps, sendStaleQuoteNudges, sendWeeklyDigestEmails,
  dispatchWebhook, deliverWebhook,
  initQBOTables, initJobberTables, initOAuthStatesTable,
  createQBOInvoiceForQuote, generateICS, buildGoogleCalendarUrl,
  generateInvoicePdfHtml, db_getBusinessById, formatUser, formatBusiness,
  getQuickQuoteHTML, getPrivacyPolicyHTML, getTermsOfServiceHTML, getDeleteAccountHTML,
  syncJobToGoogleCalendar,
} from "../helpers";`;

// ─── Storage imports (broad — tree-shaken at build time) ─────────────────────

const STORAGE_IMPORTS = `import {
  getUserById, getUserByEmail, getUserByProviderId, createUser, updateUser,
  getBusinessByOwner, createBusiness, updateBusiness,
  getPricingByBusiness, upsertPricingSettings,
  getCustomersByBusiness, getCustomerById, createCustomer, updateCustomer, deleteCustomer,
  getQuotesByBusiness, getQuoteById, getQuoteByToken, createQuote, updateQuote,
  deleteQuote as deleteQuoteRow,
  getLineItemsByQuote, createLineItem, deleteLineItemsByQuote,
  getJobsByBusiness, getJobById, createJob, updateJob, deleteJob,
  getChecklistByJob, createChecklistItem, updateChecklistItem, deleteChecklistItem,
  getCommunicationsByBusiness, createCommunication, cancelPendingCommunicationsForQuote,
  getScheduledFollowUpsForQuote, getCommunicationById,
  getAutomationRules, upsertAutomationRules,
  getTasksByBusiness, getTaskById, createTask, updateTask, deleteTask,
  getQuoteStats, getRevenueByPeriod, expireOldQuotes,
  getPendingCommunications, updateCommunication,
  getPhotosByJob, createJobPhoto, deleteJobPhoto,
  upsertPushToken, deletePushToken,
  getFollowUpsByQuote, getFollowUpsByBusiness, createFollowUp, updateFollowUp, deleteFollowUp,
  getUnfollowedQuotes,
  getGoogleCalendarToken, upsertGoogleCalendarToken, deleteGoogleCalendarToken,
  getFollowUpQueueQuotes, createFollowUpTouch,
  getStreakByBusiness, upsertStreak,
  getPreferencesByBusiness, upsertPreferences,
  createAnalyticsEvent, getBadgesByBusiness, createBadge, hasBadge,
  getWeeklyRecapStats, getDormantCustomers, getLostQuotes,
  getGrowthTasksByBusiness, getGrowthTaskById, createGrowthTask, updateGrowthTask, deleteGrowthTask,
  getActiveGrowthTasksForQuote, countTodayTasksForCustomer, createGrowthTaskEvent, getEventsByTask,
  getReviewRequestsByBusiness, getReviewRequestByJob, createReviewRequest, updateReviewRequest,
  getMarketingPrefsByCustomer, upsertMarketingPrefs,
  getGrowthAutomationSettings, upsertGrowthAutomationSettings,
  getSalesStrategy, upsertSalesStrategy,
  getCampaignsByBusiness, getCampaignById, createCampaign, updateCampaign,
  getUpsellOpportunities, getAutoRebookCandidates, getForecastData,
  getRecommendationsByQuote, createRecommendation, updateRecommendation,
  getPushTokensByUser, rateJob, getRatingsSummary, getJobByRatingToken,
  createInvoicePacket, getInvoicePacketsByQuoteId, getInvoicePacketById,
  createCalendarEventStub, getCalendarEventStubsByQuoteId,
  createApiKey, getApiKeysByUserId, deactivateApiKey, getApiKeyByHash,
  createWebhookEndpoint, getWebhookEndpointsByUserId, updateWebhookEndpoint, deleteWebhookEndpoint,
  getActiveWebhookEndpointsForBusiness, createWebhookEvent, getWebhookEventsByUserId,
  getWebhookEventById, createWebhookDelivery, getWebhookDeliveriesByEventId, updateWebhookDelivery,
  getStaleQuotesForNudge, markQuoteNudgeSent,
  markMilestoneCelebrated, markWeeklyDigestSent, getWeeklyQuoteStats,
  getAllBusinessIds, markReviewRequestSent,
  getBookingAvailability, upsertBookingAvailability, generateBookingSlots,
  createRecurringSeries, getRecurringSeriesByBusiness, getRecurringSeriesById,
  updateRecurringSeries, cancelRecurringSeries, skipSeriesOccurrence, generateSeriesJobs,
} from "../storage";`;

// ─── Extra imports per router ─────────────────────────────────────────────────

const EXTRA_IMPORTS = {
  auth: `import bcrypt from "bcryptjs";
import { pendingAuthTokens, generateAuthToken } from "../clients";`,

  public: `import { getHouseCleaningPriceCalculatorPage, getDeepCleaningPriceCalculatorPage, getMoveInOutCleaningCalculatorPage, getCleaningQuoteGeneratorPage } from "../seo-pages";
import { getCalculatorBySlug, renderCalculatorPage, renderCalculatorIndex } from "../calculator-engine";`,

  integrations: `import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient";
import { getUncachableGoogleCalendarClient, isGoogleCalendarConnected } from "../googleCalendarClient";
import { QBOClient, encryptToken, decryptToken, logSync } from "../qbo-client";
import { JobberClient, buildJobberAuthUrl, exchangeJobberCode, logJobberSync, syncQuoteToJobber } from "../jobber-client";
import { google } from "googleapis";`,

  ai: `import { sendEmail, getBusinessSendParams, PLATFORM_FROM_EMAIL, PLATFORM_FROM_NAME } from "../mail";`,

  automations: `import {
  getChannelConnectionsByBusiness, getChannelConnection, upsertChannelConnection, deleteChannelConnection,
  getConversationsByBusiness, getConversationById, createConversation, updateConversation,
  getMessagesByConversation, createMessage,
  getSocialLeadsByBusiness, getSocialLeadById, createSocialLead, updateSocialLead,
  createAttributionEvent, getAttributionEventsByBusiness,
  getSocialAutomationSettings, upsertSocialAutomationSettings,
  getSocialOptOutsByBusiness, getSocialStats,
} from "../social-storage";
import { sendEmail, getBusinessSendParams, PLATFORM_FROM_EMAIL, PLATFORM_FROM_NAME } from "../mail";`,

  quotes: `import { sendEmail, getBusinessSendParams, PLATFORM_FROM_EMAIL, PLATFORM_FROM_NAME } from "../mail";`,

  jobs: `import { sendEmail, getBusinessSendParams, PLATFORM_FROM_EMAIL, PLATFORM_FROM_NAME } from "../mail";`,

  customers: `import { sendEmail, getBusinessSendParams, PLATFORM_FROM_EMAIL, PLATFORM_FROM_NAME } from "../mail";`,

  business: `import { sendEmail, getBusinessSendParams, PLATFORM_FROM_EMAIL, PLATFORM_FROM_NAME } from "../mail";`,
};

// ─── Schema imports used by routers ──────────────────────────────────────────

const SCHEMA_IMPORTS = `import { businessFiles, sequenceEnrollments, employees, schedulePublications, cleanerScheduleNotifications, users, businesses, quotes, customers, jobs, communications, quoteFollowUps, analyticsEvents, pricingSettings, apiKeys, webhookEndpoints, webhookEvents, webhookDeliveries, tasks, photos, growthTasks, campaigns, automationRules, preferences, bookingAvailability, invoicePackets, calendarEventStubs, employeeShifts, checklistItems, jobNotes, badges, streaks, intakeRequests, pricingJobs, pricingRules, pricingQuestionnaires, leadCapture, recurringCleanSeries, salesRecommendations, pushTokens } from "../../shared/schema";`;

// ─── Generate each router file ────────────────────────────────────────────────

const routers = ["admin", "auth", "quotes", "customers", "jobs", "pricing", "ai", "automations", "integrations", "business", "public"];

for (const r of routers) {
  const blocksFile = `${routerDir}/${r}RouteBlocks.txt`;
  if (!fs.existsSync(blocksFile)) {
    console.log(`Skipping ${r} — no blocks file`);
    continue;
  }
  const blocks = fs.readFileSync(blocksFile, "utf8");

  // Replace old middleware names used in routes (requirePro → requireGrowth where appropriate)
  // The original code used requirePro to mean "growth or above" for most features.
  // We keep the same semantic but rename to requireGrowth to match the new naming.
  // Routes that use "requirePro" (the new true-pro gating) should be reviewed separately.
  // For safety, we keep requirePro as-is (it now means Pro-only in the new middleware).
  // Lines that have `requirePro as any` stay as-is — these will use the new pro-only check.
  const processedBlocks = blocks
    // Normalize `as any` casts on middleware (artifact of old type issues)
    .replace(/requirePro as any/g, "requireGrowth")
    .replace(/requireGrowth as any/g, "requireGrowth");

  const extra = EXTRA_IMPORTS[r] ? `\n${EXTRA_IMPORTS[r]}` : "";

  const content = `// Source: extracted from server/routes.ts
// Domain: ${r}
// Auto-generated by scripts/generate-routers.mjs — do NOT edit directly.

${COMMON_IMPORTS}
${STORAGE_IMPORTS}
${SCHEMA_IMPORTS}${extra}

const router = Router();

${processedBlocks}

export default router;
`;

  fs.writeFileSync(`${routerDir}/${r}Router.ts`, content);
  console.log(`Created ${routerDir}/${r}Router.ts`);
}

// Handle unmounted routes (add them to appropriate routers)
const unmounted = fs.existsSync(`${routerDir}/unmountedRouteBlocks.txt`)
  ? fs.readFileSync(`${routerDir}/unmountedRouteBlocks.txt`, "utf8")
  : "";
if (unmounted.trim()) {
  // Append unmounted routes to public router (job-updates redirects)
  // and business router (analytics events)
  const publicExtra = unmounted.split("\n\n").filter(b => 
    b.includes("/job-updates/") || b.includes("/live-update/") || b.includes("/j/")
  ).map(b => b.replace(/^  app\./, "  router.")).join("\n\n");
  const businessExtra = unmounted.split("\n\n").filter(b =>
    b.includes("/api/analytics/")
  ).map(b => b.replace(/^  app\./, "  router.")).join("\n\n");

  if (publicExtra.trim()) {
    const publicFile = `${routerDir}/publicRouter.ts`;
    const existing = fs.readFileSync(publicFile, "utf8");
    const updated = existing.replace("export default router;", `${publicExtra}\n\nexport default router;`);
    fs.writeFileSync(publicFile, updated);
    console.log("Appended unmounted public routes");
  }
  if (businessExtra.trim()) {
    const businessFile = `${routerDir}/businessRouter.ts`;
    const existing = fs.readFileSync(businessFile, "utf8");
    const updated = existing.replace("export default router;", `${businessExtra}\n\nexport default router;`);
    fs.writeFileSync(businessFile, updated);
    console.log("Appended unmounted business routes");
  }
}

console.log("\nAll router files generated.");
