import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import crypto from "node:crypto";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import OpenAI from "openai";
import Stripe from "stripe";
import { pool } from "./db";
import { google } from "googleapis";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { getUncachableGoogleCalendarClient, isGoogleCalendarConnected } from "./googleCalendarClient";
import { QBOClient, encryptToken, decryptToken, logSync } from "./qbo-client";
import { JobberClient, buildJobberAuthUrl, exchangeJobberCode, logJobberSync, syncQuoteToJobber } from "./jobber-client";

let stripe: Stripe | null = null;

async function initStripeClient() {
  try {
    stripe = await getUncachableStripeClient();
    console.log("Stripe client initialized via Replit connection");
  } catch (e) {
    console.warn("Stripe not available:", (e as Error).message);
    stripe = null;
  }
}

initStripeClient();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});
import {
  getUserById,
  getUserByEmail,
  getUserByProviderId,
  createUser,
  updateUser,
  getBusinessByOwner,
  createBusiness,
  updateBusiness,
  getPricingByBusiness,
  upsertPricingSettings,
  getCustomersByBusiness,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getQuotesByBusiness,
  getQuoteById,
  getQuoteByToken,
  createQuote,
  updateQuote,
  deleteQuote as deleteQuoteRow,
  getLineItemsByQuote,
  createLineItem,
  deleteLineItemsByQuote,
  getJobsByBusiness,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getChecklistByJob,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  getCommunicationsByBusiness,
  createCommunication,
  cancelPendingCommunicationsForQuote,
  getAutomationRules,
  upsertAutomationRules,
  getTasksByBusiness,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getQuoteStats,
  getRevenueByPeriod,
  expireOldQuotes,
  getPendingCommunications,
  updateCommunication,
  getPhotosByJob,
  createJobPhoto,
  deleteJobPhoto,
  upsertPushToken,
  deletePushToken,
  getFollowUpsByQuote,
  getFollowUpsByBusiness,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  getUnfollowedQuotes,
  getGoogleCalendarToken,
  upsertGoogleCalendarToken,
  deleteGoogleCalendarToken,
  getFollowUpQueueQuotes,
  createFollowUpTouch,
  getStreakByBusiness,
  upsertStreak,
  getPreferencesByBusiness,
  upsertPreferences,
  createAnalyticsEvent,
  getBadgesByBusiness,
  createBadge,
  hasBadge,
  getWeeklyRecapStats,
  getDormantCustomers,
  getLostQuotes,
  getGrowthTasksByBusiness,
  getGrowthTaskById,
  createGrowthTask,
  updateGrowthTask,
  deleteGrowthTask,
  getActiveGrowthTasksForQuote,
  countTodayTasksForCustomer,
  createGrowthTaskEvent,
  getEventsByTask,
  getReviewRequestsByBusiness,
  getReviewRequestByJob,
  createReviewRequest,
  updateReviewRequest,
  getMarketingPrefsByCustomer,
  upsertMarketingPrefs,
  getGrowthAutomationSettings,
  upsertGrowthAutomationSettings,
  getSalesStrategy,
  upsertSalesStrategy,
  getCampaignsByBusiness,
  getCampaignById,
  createCampaign,
  updateCampaign,
  getUpsellOpportunities,
  getAutoRebookCandidates,
  getForecastData,
  getRecommendationsByQuote,
  createRecommendation,
  updateRecommendation,
  getPushTokensByUser,
  rateJob,
  getRatingsSummary,
  getJobByRatingToken,
  createInvoicePacket,
  getInvoicePacketsByQuoteId,
  getInvoicePacketById,
  createCalendarEventStub,
  getCalendarEventStubsByQuoteId,
  createApiKey,
  getApiKeysByUserId,
  deactivateApiKey,
  getApiKeyByHash,
  createWebhookEndpoint,
  getWebhookEndpointsByUserId,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  getActiveWebhookEndpointsForBusiness,
  createWebhookEvent,
  getWebhookEventsByUserId,
  getWebhookEventById,
  createWebhookDelivery,
  getWebhookDeliveriesByEventId,
  updateWebhookDelivery,
} from "./storage";
import {
  getChannelConnectionsByBusiness,
  getChannelConnection,
  upsertChannelConnection,
  deleteChannelConnection,
  getConversationsByBusiness,
  getConversationById,
  createConversation,
  updateConversation,
  getMessagesByConversation,
  createMessage,
  getSocialLeadsByBusiness,
  getSocialLeadById,
  createSocialLead,
  updateSocialLead,
  createAttributionEvent,
  getAttributionEventsByBusiness,
  getSocialAutomationSettings,
  upsertSocialAutomationSettings,
  getSocialOptOutsByBusiness,
  getSocialStats,
} from "./social-storage";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const pendingAuthTokens = new Map<string, { userId: string; needsOnboarding: boolean; expiresAt: number }>();

function generateAuthToken(userId: string, needsOnboarding: boolean): string {
  const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);
  pendingAuthTokens.set(token, { userId, needsOnboarding, expiresAt: Date.now() + 60000 });
  return token;
}

function setupSession(app: Express) {
  const PgStore = connectPg(session);
  const isProduction = process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1";

  if (isProduction) {
    app.set("trust proxy", 1);
  }

  app.use(
    session({
      store: new PgStore({
        pool: pool as any,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "quotepro-dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );
}

function getPublicBaseUrl(req: Request): string {
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT) {
    const forwardedHost = req.header("x-forwarded-host");
    const host = forwardedHost || req.get("host") || "localhost";
    return `https://${host}`;
  }
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) {
    return `https://${devDomain}:5000`;
  }
  const host = req.get("host") || "localhost:5000";
  return `https://${host}`;
}

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

async function requirePro(req: Request, res: Response, next: Function) {
  try {
    const user = await getUserById(req.session.userId!);
    if (!user || user.subscriptionTier !== "pro") {
      return res.status(403).json({ 
        message: "This feature requires a Pro subscription",
        requiresUpgrade: true,
      });
    }
    next();
  } catch {
    return res.status(500).json({ message: "Subscription check failed" });
  }
}

async function generateRevenuePlaybook(quote: any, business: any, customer: any) {
  const recs: Array<{ type: string; title: string; rationale: string; suggestedDate?: Date }> = [];
  const total = Number(quote.total) || 0;
  const freq = quote.acceptedFrequency || quote.frequencySelected;
  const now = new Date();

  const followUpDate = new Date(now);
  followUpDate.setDate(followUpDate.getDate() + 2);
  recs.push({
    type: "follow_up",
    title: "Send a thank-you message",
    rationale: `A quick thank-you after acceptance builds trust and sets expectations. Reach out within 48 hours to confirm scheduling details.`,
    suggestedDate: followUpDate,
  });

  if (!freq || freq === "one-time") {
    recs.push({
      type: "frequency_upgrade",
      title: "Suggest recurring service",
      rationale: `This is a one-time booking at $${total.toFixed(2)}. After the first clean, suggest a recurring plan. Bi-weekly clients average 24x/year revenue vs 1x. Potential annual value: $${(total * 24).toFixed(0)}.`,
    });
  }

  recs.push({
    type: "addon_suggestion",
    title: "Offer a deep clean add-on",
    rationale: `After completing the initial service, offer a deep clean upgrade or add-on services like window cleaning, oven cleaning, or organization. This typically adds 30-50% to the base price.`,
  });

  const referralDate = new Date(now);
  referralDate.setDate(referralDate.getDate() + 7);
  recs.push({
    type: "referral_ask",
    title: "Ask for a referral",
    rationale: `Happy customers are your best marketing channel. After a successful first clean, ask if they know anyone who might need cleaning services. Offer a referral discount to incentivize.`,
    suggestedDate: referralDate,
  });

  const reviewDate = new Date(now);
  reviewDate.setDate(reviewDate.getDate() + 3);
  recs.push({
    type: "review_request",
    title: "Request a review",
    rationale: `Online reviews are critical for new customer acquisition. After service completion, send a friendly review request with a direct link to your Google Business page.`,
    suggestedDate: reviewDate,
  });

  const month = now.getMonth();
  if (month >= 2 && month <= 4) {
    recs.push({
      type: "seasonal_offer",
      title: "Promote spring deep cleaning",
      rationale: `Spring is prime time for deep cleaning. Offer a seasonal deep clean package at a special rate to capitalize on the momentum of this booking.`,
    });
  } else if (month >= 9 && month <= 11) {
    recs.push({
      type: "seasonal_offer",
      title: "Holiday prep cleaning package",
      rationale: `The holiday season is approaching. Offer a pre-holiday deep clean package to help customers prepare for gatherings and guests.`,
    });
  }

  for (const rec of recs) {
    try {
      await createRecommendation({
        businessId: quote.businessId,
        quoteId: quote.id,
        customerId: quote.customerId || undefined,
        type: rec.type,
        title: rec.title,
        rationale: rec.rationale,
        suggestedDate: rec.suggestedDate,
      });
    } catch (_e) {}
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupSession(app);

  app.post("/api/crash-report", async (req: Request, res: Response) => {
    try {
      const { error, stack, componentStack, source } = req.body;
      console.error("[CRASH REPORT]", {
        timestamp: new Date().toISOString(),
        source,
        error,
        stack: stack?.substring(0, 500),
        componentStack: componentStack?.substring(0, 500),
      });
      res.json({ received: true });
    } catch {
      res.status(200).json({ received: true });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
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
        authProvider: "email",
      });

      const business = await createBusiness(user.id);

      req.session.userId = user.id;

      return res.json({
        user: formatUser(user),
        business: formatBusiness(business),
        needsOnboarding: !business.onboardingComplete,
      });
    } catch (error: any) {
      console.error("Register error:", error);
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
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
        needsOnboarding: !business?.onboardingComplete,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/apple", async (req: Request, res: Response) => {
    try {
      const { identityToken, user: appleUser, fullName, email: appleEmail } = req.body;

      if (!identityToken) {
        return res.status(400).json({ message: "Identity token is required" });
      }

      const parts = identityToken.split(".");
      if (parts.length !== 3) {
        return res.status(400).json({ message: "Invalid token format" });
      }

      let payload: any;
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
            message: "An account with this email already exists. Please sign in with your email and password.",
          });
        }

        const name =
          fullName?.givenName && fullName?.familyName
            ? `${fullName.givenName} ${fullName.familyName}`
            : undefined;

        user = await createUser({
          email,
          name,
          authProvider: "apple",
          providerId,
        });

        const business = await createBusiness(user.id);
        req.session.userId = user.id;

        return res.json({
          user: formatUser(user),
          business: formatBusiness(business),
          needsOnboarding: true,
        });
      }

      const business = await getBusinessByOwner(user.id);
      req.session.userId = user.id;

      return res.json({
        user: formatUser(user),
        business: business ? formatBusiness(business) : null,
        needsOnboarding: !business?.onboardingComplete,
      });
    } catch (error: any) {
      console.error("Apple auth error:", error);
      return res.status(500).json({ message: "Apple sign-in failed" });
    }
  });

  app.post("/api/auth/google", async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({ message: "ID token is required" });
      }

      const parts = idToken.split(".");
      if (parts.length !== 3) {
        return res.status(400).json({ message: "Invalid token format" });
      }

      let payload: any;
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
            message: "An account with this email already exists. Please sign in with your original method.",
          });
        }

        user = await createUser({
          email,
          name,
          authProvider: "google",
          providerId,
        });

        const business = await createBusiness(user.id);
        req.session.userId = user.id;

        return res.json({
          user: formatUser(user),
          business: formatBusiness(business),
          needsOnboarding: true,
        });
      }

      const business = await getBusinessByOwner(user.id);
      req.session.userId = user.id;

      return res.json({
        user: formatUser(user),
        business: business ? formatBusiness(business) : null,
        needsOnboarding: !business?.onboardingComplete,
      });
    } catch (error: any) {
      console.error("Google auth error:", error);
      return res.status(500).json({ message: "Google sign-in failed" });
    }
  });

  app.get("/api/auth/google/start", async (req: Request, res: Response) => {
    try {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(500).json({ message: "Google OAuth not configured" });
      }
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
      });
      return res.json({ url });
    } catch (error: any) {
      console.error("Google auth start error:", error);
      return res.status(500).json({ message: "Failed to start Google sign-in" });
    }
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    try {
      const { code } = req.query as { code: string };
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
    } catch (error: any) {
      console.error("Google auth callback error:", error);
      return res.status(500).send("Google sign-in failed. Please try again.");
    }
  });

  app.post("/api/auth/exchange-token", async (req: Request, res: Response) => {
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
          needsOnboarding: pending.needsOnboarding,
        });
      });
    } catch (error: any) {
      return res.status(500).json({ message: "Token exchange failed" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await getUserById(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }

      const business = await getBusinessByOwner(user.id);

      return res.json({
        user: formatUser(user),
        business: business ? formatBusiness(business) : null,
        needsOnboarding: !business?.onboardingComplete,
      });
    } catch (error: any) {
      console.error("Auth check error:", error);
      return res.status(500).json({ message: "Auth check failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out" });
    });
  });

  app.post("/api/auth/delete-account", requireAuth, async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const userId = req.session.userId!;
      await client.query("BEGIN");
      const business = await getBusinessByOwner(userId);
      const bid = business?.id;
      if (bid) {
        const jobIds = (await client.query(`SELECT id FROM jobs WHERE business_id = $1`, [bid])).rows.map((r: any) => r.id);
        if (jobIds.length > 0) {
          await client.query(`DELETE FROM job_photos WHERE job_id = ANY($1)`, [jobIds]);
          await client.query(`DELETE FROM job_checklist_items WHERE job_id = ANY($1)`, [jobIds]);
          await client.query(`DELETE FROM job_status_history WHERE job_id = ANY($1)`, [jobIds]);
          await client.query(`DELETE FROM job_notes WHERE job_id = ANY($1)`, [jobIds]);
        }
        await client.query(`DELETE FROM jobs WHERE business_id = $1`, [bid]);
        const quoteIds = (await client.query(`SELECT id FROM quotes WHERE business_id = $1`, [bid])).rows.map((r: any) => r.id);
        if (quoteIds.length > 0) {
          await client.query(`DELETE FROM sales_recommendations WHERE quote_id = ANY($1)`, [quoteIds]);
          await client.query(`DELETE FROM quote_follow_ups WHERE quote_id = ANY($1)`, [quoteIds]);
          await client.query(`DELETE FROM quote_line_items WHERE quote_id = ANY($1)`, [quoteIds]);
          await client.query(`DELETE FROM invoice_packets WHERE quote_id = ANY($1)`, [quoteIds]);
        }
        await client.query(`DELETE FROM quotes WHERE business_id = $1`, [bid]);
        const custIds = (await client.query(`SELECT id FROM customers WHERE business_id = $1`, [bid])).rows.map((r: any) => r.id);
        if (custIds.length > 0) {
          await client.query(`DELETE FROM communications WHERE customer_id = ANY($1)`, [custIds]);
          await client.query(`DELETE FROM review_requests WHERE customer_id = ANY($1)`, [custIds]);
          await client.query(`DELETE FROM customer_marketing_prefs WHERE customer_id = ANY($1)`, [custIds]);
          await client.query(`DELETE FROM follow_up_touches WHERE customer_id = ANY($1)`, [custIds]);
        }
        await client.query(`DELETE FROM customers WHERE business_id = $1`, [bid]);
        const safeDeletes = [
          "pricing_settings", "automation_rules", "tasks", "channel_connections",
          "social_conversations", "social_messages", "social_leads", "attribution_events",
          "social_automation_settings", "social_opt_outs", "growth_tasks", "growth_task_events",
          "growth_automation_settings", "sales_strategy_settings", "campaigns",
          "calendar_event_stubs", "api_keys", "webhook_endpoints", "webhook_events",
          "webhook_deliveries", "qbo_connections", "qbo_customer_mappings",
          "qbo_invoice_links", "qbo_sync_log",
        ];
        for (const table of safeDeletes) {
          try { await client.query(`DELETE FROM ${table} WHERE business_id = $1`, [bid]); } catch (_) {}
        }
        await client.query(`DELETE FROM businesses WHERE id = $1`, [bid]);
      }
      const userTables = [
        "push_tokens", "google_calendar_tokens", "streaks", "user_preferences",
        "analytics_events", "badges", "business_profiles",
      ];
      for (const table of userTables) {
        try { await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]); } catch (_) {}
      }
      await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
      await client.query("COMMIT");
      req.session.destroy(() => {});
      res.clearCookie("connect.sid");
      return res.json({ message: "Account deleted" });
    } catch (error: any) {
      await client.query("ROLLBACK");
      console.error("Delete account error:", error);
      return res.status(500).json({ message: "Failed to delete account" });
    } finally {
      client.release();
    }
  });

  app.get("/api/business", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      return res.json(formatBusiness(business));
    } catch (error: any) {
      console.error("Get business error:", error);
      return res.status(500).json({ message: "Failed to get business" });
    }
  });

  app.put("/api/business", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const updated = await updateBusiness(business.id, req.body);
      return res.json(formatBusiness(updated));
    } catch (error: any) {
      console.error("Update business error:", error);
      return res.status(500).json({ message: "Failed to update business" });
    }
  });

  app.patch("/api/business", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const updated = await updateBusiness(business.id, req.body);
      return res.json(formatBusiness(updated));
    } catch (error: any) {
      console.error("Update business error:", error);
      return res.status(500).json({ message: "Failed to update business" });
    }
  });

  app.get("/api/pricing", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const pricing = await getPricingByBusiness(business.id);
      return res.json(pricing?.settings || null);
    } catch (error: any) {
      console.error("Get pricing error:", error);
      return res.status(500).json({ message: "Failed to get pricing" });
    }
  });

  app.put("/api/pricing", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const row = await upsertPricingSettings(business.id, req.body);
      return res.json(row.settings);
    } catch (error: any) {
      console.error("Update pricing error:", error);
      return res.status(500).json({ message: "Failed to update pricing" });
    }
  });

  // ─── Customers ───

  app.get("/api/customers", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { search, status } = req.query as any;
      const list = await getCustomersByBusiness(business.id, { search, status });
      return res.json(list);
    } catch (error: any) {
      console.error("Get customers error:", error);
      return res.status(500).json({ message: "Failed to get customers" });
    }
  });

  app.get("/api/customers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const c = await getCustomerById(req.params.id);
      if (!c) return res.status(404).json({ message: "Customer not found" });
      return res.json(c);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get customer" });
    }
  });

  app.post("/api/customers", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const c = await createCustomer({ ...req.body, businessId: business.id });
      return res.json(c);
    } catch (error: any) {
      console.error("Create customer error:", error);
      return res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.put("/api/customers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const c = await updateCustomer(req.params.id, req.body);
      return res.json(c);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await deleteCustomer(req.params.id);
      return res.json({ message: "Deleted" });
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // ─── Quotes ───

  app.get("/api/quotes", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { status, customerId } = req.query as any;
      const list = await getQuotesByBusiness(business.id, { status, customerId });
      const customerIds = [...new Set(list.filter(q => q.customerId).map(q => q.customerId!))];
      const customerMap: Record<string, string> = {};
      for (const cid of customerIds) {
        const c = await getCustomerById(cid);
        if (c) customerMap[cid] = `${c.firstName} ${c.lastName}`.trim();
      }
      const enriched = list.map(q => ({
        ...q,
        customerName: q.customerId ? (customerMap[q.customerId] || null) : null,
      }));
      return res.json(enriched);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get quotes" });
    }
  });

  app.get("/api/quotes/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const q = await getQuoteById(req.params.id);
      if (!q) return res.status(404).json({ message: "Quote not found" });
      const lineItems = await getLineItemsByQuote(q.id);
      return res.json({ ...q, lineItems });
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get quote" });
    }
  });

  app.get("/api/quotes/count", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const allQuotes = await getQuotesByBusiness(business.id);
      const user = await getUserById(req.session.userId!);
      const isPro = user?.subscriptionTier === "pro";
      return res.json({ count: allQuotes.length, limit: 3, isPro });
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get quote count" });
    }
  });

  app.post("/api/quotes", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });

      const user = await getUserById(req.session.userId!);
      if (user && user.subscriptionTier !== "pro") {
        const existingQuotes = await getQuotesByBusiness(business.id);
        if (existingQuotes.length >= 3) {
          return res.status(403).json({
            message: "You've used 3 of 3 free quotes. Upgrade to Pro for unlimited quotes.",
            quoteLimitReached: true,
          });
        }
      }

      const rules = await getAutomationRules(business.id);
      const qPrefs = (business as any).quotePreferences as any;
      const expirationDays = qPrefs?.defaultExpirationDays ?? rules?.quoteExpirationDays ?? 14;
      let expiresAt: Date | undefined;
      if (expirationDays > 0) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expirationDays);
      }

      const q = await createQuote({ ...req.body, businessId: business.id, expiresAt });

      if (req.body.lineItems) {
        for (const li of req.body.lineItems) {
          await createLineItem({ ...li, quoteId: q.id });
        }
      }

      dispatchWebhook(business.id, req.session.userId!, "quote.created", { quoteId: q.id, total: q.total, status: q.status }).catch(() => {});

      return res.json(q);
    } catch (error: any) {
      console.error("Create quote error:", error);
      return res.status(500).json({ message: "Failed to create quote" });
    }
  });

  app.put("/api/quotes/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { lineItems, ...data } = req.body;
      const dateFields = ["acceptedAt", "declinedAt", "sentAt", "expiresAt", "lastContactAt"] as const;
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
        const eventMap: Record<string, string> = { sent: "quote.sent", accepted: "quote.accepted", declined: "quote.declined" };
        const eventType = eventMap[data.status];
        if (eventType && q.businessId) {
          dispatchWebhook(q.businessId, req.session.userId!, eventType, { quoteId: q.id, total: q.total, status: q.status }).catch(() => {});
        }

        if (data.status === "accepted") {
          pool.query(
            `SELECT auto_create_invoice FROM qbo_connections WHERE user_id = $1 AND status = 'connected'`,
            [req.session.userId]
          ).then((connResult) => {
            if (connResult.rows.length > 0 && connResult.rows[0].auto_create_invoice) {
              createQBOInvoiceForQuote(req.session.userId!, q.id).catch((err) => {
                console.error("Auto QBO invoice creation failed:", err.message);
                logSync(req.session.userId!, q.id, "create_invoice", { auto: true }, { error: err.message }, "failed", err.message);
              });
            }
          }).catch(() => {});

          pool.query(
            `SELECT auto_create_job_on_quote_accept FROM jobber_connections WHERE user_id = $1 AND status = 'connected'`,
            [req.session.userId]
          ).then((jobberResult) => {
            if (jobberResult.rows.length > 0 && jobberResult.rows[0].auto_create_job_on_quote_accept) {
              syncQuoteToJobber(req.session.userId!, q.id, "automatic").catch((err) => {
                console.error("Auto Jobber sync failed:", err.message);
              });
            }
          }).catch(() => {});
        }
      }

      return res.json(q);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to update quote" });
    }
  });

  app.post("/api/quotes/:id/send", requireAuth, async (req: Request, res: Response) => {
    try {
      const { channel, content } = req.body;
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });

      const quote = await getQuoteById(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      const q = await updateQuote(req.params.id, {
        status: "sent",
        sentVia: channel,
        sentAt: new Date(),
      });

      await createCommunication({
        businessId: business.id,
        customerId: quote.customerId || undefined,
        quoteId: quote.id,
        channel: channel || "sms",
        content: content || "",
        status: "sent",
      });

      const rules = await getAutomationRules(business.id);
      if (rules?.quoteFollowupsEnabled && rules.followupSchedule) {
        const schedule = rules.followupSchedule as any[];
        for (const step of schedule) {
          const scheduledFor = new Date();
          scheduledFor.setMinutes(scheduledFor.getMinutes() + step.delayMinutes);
          await createCommunication({
            businessId: business.id,
            customerId: quote.customerId || undefined,
            quoteId: quote.id,
            channel: rules.followupChannel || "sms",
            templateKey: step.templateKey,
            content: "",
            status: "queued",
            scheduledFor,
          });
        }
      }

      return res.json(q);
    } catch (error: any) {
      console.error("Send quote error:", error);
      return res.status(500).json({ message: "Failed to send quote" });
    }
  });

  app.delete("/api/quotes/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await deleteQuoteRow(req.params.id);
      return res.json({ message: "Deleted" });
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to delete quote" });
    }
  });

  // ─── Public Quote Page ───

  app.get("/api/public/quote/:token", async (req: Request, res: Response) => {
    try {
      const q = await getQuoteByToken(req.params.token);
      if (!q) return res.status(404).json({ message: "Quote not found" });

      const business = await db_getBusinessById(q.businessId);
      const customer = q.customerId ? await getCustomerById(q.customerId) : null;
      const lineItems = await getLineItemsByQuote(q.id);
      const qpPreview = (business as any)?.quotePreferences;

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
          paidAt: q.paidAt,
        },
        business: business
          ? {
              companyName: business.companyName,
              email: business.email,
              phone: business.phone,
              logoUri: business.logoUri,
              primaryColor: qpPreview?.brandColor || business.primaryColor,
              senderName: business.senderName,
              senderTitle: business.senderTitle,
            }
          : null,
        customer: customer
          ? { firstName: customer.firstName, lastName: customer.lastName }
          : null,
        paymentEnabled: !!(business?.stripeAccountId && business?.stripeOnboardingComplete),
      });
    } catch (error: any) {
      console.error("Public quote error:", error);
      return res.status(500).json({ message: "Failed to load quote" });
    }
  });

  app.post("/api/public/quote/:token/respond", async (req: Request, res: Response) => {
    try {
      const { action } = req.body;
      const q = await getQuoteByToken(req.params.token);
      if (!q) return res.status(404).json({ message: "Quote not found" });

      if (q.status !== "sent") {
        return res.status(400).json({ message: "Quote is no longer open for response" });
      }

      if (action === "accept") {
        await updateQuote(q.id, { status: "accepted", acceptedAt: new Date() });
        await cancelPendingCommunicationsForQuote(q.id);
        if (q.customerId) {
          await updateCustomer(q.customerId, { status: "active" });
        }
      } else if (action === "decline") {
        await updateQuote(q.id, { status: "declined", declinedAt: new Date() });
        await cancelPendingCommunicationsForQuote(q.id);
      }

      return res.json({ message: "Response recorded" });
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to respond to quote" });
    }
  });

  // ─── Jobs ───

  app.get("/api/jobs", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { status, customerId, from, to } = req.query as any;
      const list = await getJobsByBusiness(business.id, {
        status,
        customerId,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      });
      return res.json(list);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get jobs" });
    }
  });

  app.get("/api/jobs/:id", requireAuth, async (req: Request, res: Response) => {
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
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get job" });
    }
  });

  app.post("/api/jobs", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });

      const j = await createJob({
        ...req.body,
        businessId: business.id,
        startDatetime: new Date(req.body.startDatetime),
        endDatetime: req.body.endDatetime ? new Date(req.body.endDatetime) : undefined,
      });

      if (req.body.checklist) {
        for (let i = 0; i < req.body.checklist.length; i++) {
          await createChecklistItem({
            jobId: j.id,
            label: req.body.checklist[i].label || req.body.checklist[i],
            sortOrder: i,
          });
        }
      }

      try {
        let customerName = "Customer";
        if (j.customerId) {
          const customer = await getCustomerById(j.customerId);
          if (customer) customerName = `${customer.firstName} ${customer.lastName}`.trim();
        }
        await syncJobToGoogleCalendar(req.session.userId!, j, customerName);
      } catch (calErr) {
        console.error("Auto calendar sync error (create):", calErr);
      }

      return res.json(j);
    } catch (error: any) {
      console.error("Create job error:", error);
      return res.status(500).json({ message: "Failed to create job" });
    }
  });

  app.put("/api/jobs/:id", requireAuth, async (req: Request, res: Response) => {
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
        await syncJobToGoogleCalendar(req.session.userId!, j, customerName);
      } catch (calErr) {
        console.error("Auto calendar sync error (update):", calErr);
      }

      return res.json(j);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to update job" });
    }
  });

  app.delete("/api/jobs/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await deleteJob(req.params.id);
      return res.json({ message: "Deleted" });
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to delete job" });
    }
  });

  // ─── Job Checklist ───

  app.post("/api/jobs/:jobId/checklist", requireAuth, async (req: Request, res: Response) => {
    try {
      const item = await createChecklistItem({ jobId: req.params.jobId, ...req.body });
      return res.json(item);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to create checklist item" });
    }
  });

  app.put("/api/checklist/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const item = await updateChecklistItem(req.params.id, req.body);
      return res.json(item);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to update checklist item" });
    }
  });

  app.delete("/api/checklist/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await deleteChecklistItem(req.params.id);
      return res.json({ message: "Deleted" });
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to delete checklist item" });
    }
  });

  // ─── Job Photos ───

  app.get("/api/jobs/:jobId/photos", requireAuth, async (req: Request, res: Response) => {
    try {
      const photos = await getPhotosByJob(req.params.jobId);
      return res.json(photos);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get photos" });
    }
  });

  app.post("/api/jobs/:jobId/photos", requireAuth, async (req: Request, res: Response) => {
    try {
      const { photoData, photoType, caption } = req.body;
      if (!photoData) return res.status(400).json({ message: "Photo data required" });

      const fs = await import("fs");
      const path = await import("path");
      const uploadsDir = path.join(process.cwd(), "uploads", "job-photos");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const filePath = path.join(uploadsDir, fileName);

      const base64Data = photoData.replace(/^data:image\/\w+;base64,/, "");
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

      const photoUrl = `/uploads/job-photos/${fileName}`;
      const photo = await createJobPhoto({
        jobId: req.params.jobId,
        photoUrl,
        photoType: photoType || "after",
        caption: caption || "",
      });
      return res.json(photo);
    } catch (error: any) {
      console.error("Photo upload error:", error);
      return res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  app.delete("/api/photos/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await deleteJobPhoto(req.params.id);
      return res.json({ message: "Deleted" });
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to delete photo" });
    }
  });

  // ─── Recurring Job Automation ───

  app.post("/api/jobs/:id/start", requireAuth, async (req: Request, res: Response) => {
    try {
      const job = await getJobById(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });

      if (job.status !== "scheduled") {
        return res.status(409).json({ message: `Cannot start a job that is ${job.status}` });
      }

      const updatedJob = await updateJob(req.params.id, {
        status: "in_progress",
        startedAt: new Date(),
      });

      return res.json(updatedJob);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to start job" });
    }
  });

  app.post("/api/jobs/:id/complete", requireAuth, async (req: Request, res: Response) => {
    try {
      const job = await getJobById(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });

      if (job.status === "completed" || job.status === "canceled") {
        return res.status(409).json({ message: `Cannot complete a job that is ${job.status}` });
      }

      const now = new Date();
      const updatedJob = await updateJob(req.params.id, {
        status: "completed",
        startedAt: (job as any).startedAt || now,
        completedAt: now,
        endDatetime: now,
      });

      let nextJob = null;
      if (job.recurrence && job.recurrence !== "none") {
        const currentDate = new Date(job.startDatetime);
        let nextDate: Date;

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
          customerId: job.customerId || undefined,
          quoteId: job.quoteId || undefined,
          jobType: job.jobType,
          startDatetime: nextDate,
          recurrence: job.recurrence,
          internalNotes: job.internalNotes,
          address: job.address,
          total: job.total || undefined,
        });

        const checklist = await getChecklistByJob(job.id);
        for (let i = 0; i < checklist.length; i++) {
          await createChecklistItem({
            jobId: nextJob.id,
            label: checklist[i].label,
            sortOrder: checklist[i].sortOrder,
          });
        }
      }

      let ratingUrl: string | null = null;
      if (updatedJob.ratingToken) {
        ratingUrl = `${getPublicBaseUrl(req)}/rate/${updatedJob.ratingToken}`;
      }

      return res.json({
        completedJob: updatedJob,
        nextJob,
        ratingUrl,
        message: nextJob
          ? `Job completed! Next ${job.recurrence} job scheduled.`
          : "Job completed!",
      });
    } catch (error: any) {
      console.error("Complete job error:", error);
      return res.status(500).json({ message: "Failed to complete job" });
    }
  });

  // ─── Job Satisfaction Ratings ───

  app.post("/api/jobs/:id/rate", requireAuth, async (req: Request, res: Response) => {
    try {
      const { rating, comment } = req.body;
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      const job = await getJobById(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
      const updated = await rateJob(req.params.id, rating, comment);
      return res.json(updated);
    } catch (error: any) {
      console.error("Rate job error:", error);
      return res.status(500).json({ message: "Failed to rate job" });
    }
  });

  app.get("/api/ratings/summary", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const summary = await getRatingsSummary(business.id);
      return res.json(summary);
    } catch (error: any) {
      console.error("Ratings summary error:", error);
      return res.status(500).json({ message: "Failed to get ratings summary" });
    }
  });

  // ─── Live Job Updates ───

  app.post("/api/jobs/:id/generate-update-token", requireAuth, async (req: Request, res: Response) => {
    try {
      const job = await getJobById(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
      const existing = await pool.query(`SELECT update_token FROM jobs WHERE id = $1`, [req.params.id]);
      if (existing.rows[0]?.update_token && existing.rows[0].update_token.length <= 16) {
        return res.json({ token: existing.rows[0].update_token });
      }
      const crypto = await import("crypto");
      const token = crypto.randomBytes(8).toString("hex");
      await pool.query(`UPDATE jobs SET update_token = $1 WHERE id = $2`, [token, req.params.id]);
      return res.json({ token });
    } catch (error: any) {
      console.error("Generate update token error:", error);
      return res.status(500).json({ message: "Failed to generate update token" });
    }
  });

  app.get("/api/jobs/:id/update-token", requireAuth, async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`SELECT update_token FROM jobs WHERE id = $1`, [req.params.id]);
      return res.json({ token: result.rows[0]?.update_token || null });
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get update token" });
    }
  });

  app.post("/api/jobs/:id/update-status", requireAuth, async (req: Request, res: Response) => {
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

      const coreStatus = status === "completed" ? "completed" : (status === "scheduled" ? "scheduled" : "in_progress");
      await pool.query(`UPDATE jobs SET status = $1 WHERE id = $2`, [coreStatus, req.params.id]);

      if (status === "en_route" || status === "service_started") {
        await pool.query(`UPDATE jobs SET started_at = COALESCE(started_at, NOW()) WHERE id = $1`, [req.params.id]);
      }
      if (status === "completed") {
        await pool.query(`UPDATE jobs SET completed_at = COALESCE(completed_at, NOW()) WHERE id = $1`, [req.params.id]);
      }

      await pool.query(
        `INSERT INTO job_status_history (id, job_id, status, note, created_at) VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
        [req.params.id, status, note || ""]
      );

      const updated = await getJobById(req.params.id);
      return res.json(updated);
    } catch (error: any) {
      console.error("Update job status error:", error);
      return res.status(500).json({ message: "Failed to update status" });
    }
  });

  app.get("/api/jobs/:id/timeline", requireAuth, async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT * FROM job_status_history WHERE job_id = $1 ORDER BY created_at ASC`,
        [req.params.id]
      );
      return res.json(result.rows);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get timeline" });
    }
  });

  app.post("/api/jobs/:id/notes", requireAuth, async (req: Request, res: Response) => {
    try {
      const { content, customerVisible } = req.body;
      if (!content?.trim()) return res.status(400).json({ message: "Content is required" });
      const result = await pool.query(
        `INSERT INTO job_notes (id, job_id, content, customer_visible, created_at) VALUES (gen_random_uuid(), $1, $2, $3, NOW()) RETURNING *`,
        [req.params.id, content.trim(), customerVisible || false]
      );
      return res.json(result.rows[0]);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to create note" });
    }
  });

  app.get("/api/jobs/:id/notes", requireAuth, async (req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT * FROM job_notes WHERE job_id = $1 ORDER BY created_at DESC`,
        [req.params.id]
      );
      return res.json(result.rows);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get notes" });
    }
  });

  app.delete("/api/jobs/:id/notes/:noteId", requireAuth, async (req: Request, res: Response) => {
    try {
      await pool.query(`DELETE FROM job_notes WHERE id = $1 AND job_id = $2`, [req.params.noteId, req.params.id]);
      return res.json({ message: "Deleted" });
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to delete note" });
    }
  });

  app.post("/api/ai/job-update-message", requireAuth, requirePro as any, async (req: Request, res: Response) => {
    try {
      const { type, customerName, companyName, senderName, updateLink, language: commLang } = req.body;
      if (!type || !updateLink) return res.status(400).json({ message: "type and updateLink are required" });

      const langInstruction = commLang === "es" ? " Write entirely in Spanish." : " Write entirely in English.";

      let systemPrompt: string;
      let userPrompt: string;

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
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: type === "sms" ? 100 : 250,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return res.status(500).json({ message: "No response from AI" });
      return res.json({ draft: content.trim() });
    } catch (error: any) {
      console.error("Job update message error:", error);
      return res.status(500).json({ message: "Failed to generate message" });
    }
  });

  // ─── Public Job Updates Page ───

  app.get("/api/public/job-updates/:token", async (req: Request, res: Response) => {
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

      let profile: any = {};
      try {
        const businessProfile = await pool.query(
          `SELECT * FROM business_profiles WHERE user_id = $1`,
          [job.owner_user_id]
        );
        profile = businessProfile.rows[0] || {};
      } catch (profileErr: any) {
        if (profileErr.code !== "42P01") throw profileErr;
      }

      if (!profile.company_name && job.bid) {
        try {
          const biz = await pool.query(`SELECT company_name FROM businesses WHERE id = $1`, [job.bid]);
          if (biz.rows[0]?.company_name) profile.company_name = biz.rows[0].company_name;
        } catch (_) {}
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

      const effectiveDetailedStatus = (job.detailed_status && job.detailed_status !== "scheduled")
        ? job.detailed_status
        : (job.status === "in_progress" ? "in_progress" : (job.status === "completed" ? "completed" : job.detailed_status || job.status));

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
        companyName: profile.company_name || "Cleaning Service",
        companyLogo: profile.logo_url || null,
        brandColor: profile.brand_color || "#2563EB",
        customerName: `${job.customer_first_name || ""} ${job.customer_last_name || ""}`.trim() || "Customer",
        timeline: timeline.rows,
        checklist: checklist.rows,
        photos: photos.rows.map((p: any) => ({
          ...p,
          photo_url: p.photo_url,
        })),
        notes: notes.rows,
      });
    } catch (error: any) {
      console.error("Public job update error:", error);
      return res.status(500).json({ message: "Failed to load job update" });
    }
  });

  app.get("/job-updates/:token", (req: Request, res: Response) => {
    res.redirect(301, `/j/${req.params.token}`);
  });

  app.get("/j/:token", async (req: Request, res: Response) => {
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
      const apiUrl = `${baseUrl}/api/public/job-updates/${token}`; // API path stays the same
      const assetsBase = baseUrl;

      res.send(generateJobUpdatePageHtml(apiUrl, assetsBase, token));
    } catch (error: any) {
      console.error("Job update page error:", error);
      return res.status(500).send("<html><body><h1>Error loading update page</h1></body></html>");
    }
  });

  function generateJobUpdatePageHtml(apiUrl: string, assetsBase: string, token: string): string {
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

    function render(data) {
      const status = data.detailedStatus || data.status || "scheduled";
      const sc = STATUS_COLORS[status] || STATUS_COLORS.scheduled;
      const progress = getProgress(status);
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

      // Timeline
      if (data.timeline && data.timeline.length > 0) {
        html += '<div class="card"><div class="card-title">Timeline</div>';
        data.timeline.forEach(function(t) {
          const tsc = STATUS_COLORS[t.status] || STATUS_COLORS.scheduled;
          html += '<div class="timeline-item">';
          html += '<div class="timeline-dot" style="background:' + tsc.bg + '">' + (STATUS_ICONS[t.status] || "&#9679;") + '</div>';
          html += '<div class="timeline-content">';
          html += '<div class="timeline-status">' + (STATUS_LABELS[t.status] || t.status) + '</div>';
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

  // ─── Push Notifications ───

  app.post("/api/push-token", requireAuth, async (req: Request, res: Response) => {
    try {
      const { token, platform } = req.body;
      if (!token) return res.status(400).json({ message: "Token required" });
      const saved = await upsertPushToken({
        userId: req.session.userId!,
        token,
        platform: platform || "ios",
      });
      return res.json(saved);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to save push token" });
    }
  });

  app.delete("/api/push-token", requireAuth, async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ message: "Token required" });
      await deletePushToken(token);
      return res.json({ message: "Deleted" });
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to delete push token" });
    }
  });

  // ─── Quote PDF ───

  // Helper function to generate quote PDF HTML
  async function generateQuotePdfHtml(quote: any, business: any, growthSettings?: any): Promise<string> {
    const customerName = (quote.propertyDetails as any)?.customerName || "Customer";
    const customerEmail = (quote.propertyDetails as any)?.customerEmail || "";
    const customerPhone = (quote.propertyDetails as any)?.customerPhone || "";
    const customerAddress = (quote.propertyDetails as any)?.customerAddress || "";
    const options = quote.options as any;

    const addOnLabels: Record<string, string> = {
      insideFridge: "Inside Fridge",
      insideOven: "Inside Oven",
      insideCabinets: "Inside Cabinets",
      interiorWindows: "Interior Windows",
      blindsDetail: "Blinds Detail",
      baseboardsDetail: "Baseboards Detail",
      laundryFoldOnly: "Laundry (Fold Only)",
      dishes: "Dishes",
      organizationTidy: "Organization/Tidy",
    };

    const activeAddOns = Object.entries(quote.addOns as any || {})
      .filter(([_, v]) => v)
      .map(([k]) => addOnLabels[k] || k);

    const optionRows = ["good", "better", "best"]
      .map((key) => {
        const opt = options?.[key];
        if (!opt) return "";
        const isSelected = quote.selectedOption === key;
        return `<tr style="${isSelected ? "background:#EBF5FF;font-weight:600;" : ""}">
          <td style="padding:12px;border-bottom:1px solid #eee;">${opt.serviceTypeName || opt.name || key}${isSelected ? " *" : ""}</td>
          <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">$${(opt.price || 0).toFixed(2)}</td>
        </tr>`;
      })
      .join("");

    const qp = (business as any).quotePreferences;
    const primaryColor = qp?.brandColor || business.primaryColor || "#2563EB";

    let paymentHtml = "";
    const po = business.paymentOptions as any;
    if (po) {
      const methodLabels: Record<string, string> = { cash: "Cash", check: "Check", creditCard: "Credit Card", venmo: "Venmo", cashApp: "Cash App", zelle: "Zelle", applePay: "Apple Pay", ach: "ACH / Bank Transfer", other: "Other" };
      const pMethods: string[] = [];
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
${activeAddOns.length > 0 ? `<div class="section"><div class="section-title">Add-On Services</div><div class="addons">${activeAddOns.map(a => `<span class="addon-tag">${a}</span>`).join("")}</div></div>` : ""}
<div class="section"><div class="section-title">Pricing Options</div>
<table><thead><tr><th>Service Level</th><th style="text-align:right;">Price</th></tr></thead>
<tbody>${optionRows}
<tr class="total-row"><td style="padding:14px;">Selected Total</td><td style="padding:14px;text-align:right;">$${(quote.total || 0).toFixed(2)}</td></tr>
</tbody></table></div>
${quote.tax > 0 ? `<div style="text-align:right;margin-top:8px;font-size:13px;color:#666;">Tax: $${quote.tax.toFixed(2)} | Subtotal: $${quote.subtotal.toFixed(2)}</div>` : ""}
${paymentHtml}
${growthSettings?.includeReviewOnPdf && growthSettings?.googleReviewLink?.trim() ? `<div style="margin-top:24px;padding:16px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a;text-align:center;"><div style="font-size:14px;font-weight:600;color:${primaryColor};margin-bottom:6px;">Review Us</div><div style="font-size:12px;color:#64748b;margin-bottom:8px;">If you loved our service, please leave a quick review:</div><a href="${growthSettings.googleReviewLink.trim()}" style="color:${primaryColor};font-size:13px;word-break:break-all;">${growthSettings.googleReviewLink.trim()}</a></div>` : ""}
<div class="footer">Quote generated by ${business.companyName || "QuotePro"} | ${new Date().toLocaleDateString()}</div>
</body></html>`;

    return html;
  }

  app.get("/api/quotes/:id/pdf", requireAuth, async (req: Request, res: Response) => {
    try {
      const quote = await getQuoteById(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });

      const customerName = (quote.propertyDetails as any)?.customerName || "Customer";
      const gs = await getGrowthAutomationSettings(business.id);
      const html = await generateQuotePdfHtml(quote, business, gs);

      return res.json({ html, customerName, total: quote.total });
    } catch (error: any) {
      console.error("PDF generation error:", error);
      return res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  app.post("/api/commercial/generate-scope", requireAuth, async (req: Request, res: Response) => {
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
        model: "gpt-5-nano",
        messages: [
          {
            role: "system",
            content: `You are a professional commercial cleaning proposal writer. Generate a scope of work for a commercial cleaning contract. Respond with JSON: {"scopeParagraph": string, "includedTasks": string[], "excludedTasks": string[], "rotationTasks": [{"task": string, "frequency": string}]}. Keep the scope paragraph professional but concise (2-3 sentences). Include 5-8 included tasks and 3-5 excluded tasks. Rotation tasks are periodic tasks done weekly/monthly/quarterly.`,
          },
          {
            role: "user",
            content: `Facility: "${facilityName}" (${facilityType}), ${totalSqFt} sqft. Cleaning frequency: ${frequency}/week. ${bathroomCount} bathrooms, ${breakroomCount} breakrooms. Floors: ${carpetPercent}% carpet, ${hardFloorPercent}% hard floor. Glass level: ${glassLevel}. High-touch focus: ${highTouchFocus ? "yes" : "no"}. Tier: ${tierName}. Currently included: ${tierIncluded}. Currently excluded: ${tierExcluded}.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      let parsed: any = {};
      try {
        parsed = JSON.parse(content || "{}");
      } catch {}

      return res.json({
        scopeParagraph: parsed.scopeParagraph || `Professional janitorial services for ${facilityName}.`,
        includedTasks: parsed.includedTasks || [],
        excludedTasks: parsed.excludedTasks || [],
        rotationTasks: parsed.rotationTasks || [],
      });
    } catch (error: any) {
      console.error("Commercial generate-scope error:", error);
      return res.status(500).json({ message: "Failed to generate scope" });
    }
  });

  app.post("/api/commercial/risk-scan", requireAuth, async (req: Request, res: Response) => {
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
      const lowestTierPrice = tiers?.length > 0 ? Math.min(...tiers.map((t: any) => t.pricePerVisit || 0)) : 0;
      const highestTierPrice = tiers?.length > 0 ? Math.max(...tiers.map((t: any) => t.pricePerVisit || 0)) : 0;

      const completion = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          {
            role: "system",
            content: `You are a commercial cleaning business advisor. Analyze a commercial cleaning quote for potential risks and issues. Respond with JSON: {"warnings": [{"severity": "high"|"medium"|"low", "title": string, "description": string}], "suggestedClauses": string[], "overallAssessment": string}. Check for underpricing, unusual labor-to-sqft ratios, missing contract protections, facility-specific hazards, and margin concerns. Be specific and actionable.`,
          },
          {
            role: "user",
            content: `Facility: "${facilityName}" (${facilityType}), ${totalSqFt} sqft. Frequency: ${frequency}/week. Labor estimate: ${rawHours} hours/visit${overrideHours ? ` (overridden to ${overrideHours}h)` : ""}, ${recommendedCleaners} cleaners. Pricing: $${pricePerVisit}/visit, $${monthlyPrice}/month, $${hourlyRate}/hr rate, ${targetMargin}% target margin. ${tierCount} tiers priced from $${lowestTierPrice} to $${highestTierPrice}. Per-sqft rate: $${totalSqFt > 0 ? (pricePerVisit / (totalSqFt / 1000)).toFixed(2) : "N/A"}/1000sqft.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      let parsed: any = {};
      try {
        parsed = JSON.parse(content || "{}");
      } catch {}

      return res.json({
        warnings: parsed.warnings || [],
        suggestedClauses: parsed.suggestedClauses || [],
        overallAssessment: parsed.overallAssessment || "Unable to generate assessment.",
      });
    } catch (error: any) {
      console.error("Commercial risk-scan error:", error);
      return res.status(500).json({ message: "Failed to run risk scan" });
    }
  });

  app.get("/api/quotes/:id/commercial-pdf", requireAuth, async (req: Request, res: Response) => {
    try {
      const quote = await getQuoteById(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });

      const gs = await getGrowthAutomationSettings(business.id);

      const pd = (quote.propertyDetails as any) || {};
      const commercialData = pd.commercialData || pd;
      const walkthrough = commercialData.walkthrough || {};
      const laborEstimate = commercialData.laborEstimate || {};
      const pricing = commercialData.pricing || {};
      const tiers: any[] = commercialData.tiers || [];
      const quoteType = commercialData.quoteType || pd.quoteType;

      if (quoteType !== "commercial") {
        return res.status(400).json({ message: "This is not a commercial quote" });
      }

      const primaryColor = ((business as any).quotePreferences as any)?.brandColor || business.primaryColor || "#2563EB";
      const facilityName = walkthrough.facilityName || "Commercial Facility";
      const siteAddress = walkthrough.siteAddress || "";
      const facilityType = walkthrough.facilityType || "";
      const totalSqFt = walkthrough.totalSqFt || 0;
      const frequency = walkthrough.frequency || "";
      const customerName = pd.customerName || "Client";
      const customerEmail = pd.customerEmail || "";
      const customerPhone = pd.customerPhone || "";

      const tierRowsHtml = tiers
        .map(
          (tier: any, index: number) => `
        <tr style="${index === 1 ? "background:#EBF5FF;font-weight:600;" : ""}">
          <td style="padding:14px;border-bottom:1px solid #eee;">
            <div style="font-weight:600;font-size:15px;">${tier.name || `Tier ${index + 1}`}</div>
            <div style="font-size:12px;color:#666;margin-top:4px;">${tier.scopeText || ""}</div>
          </td>
          <td style="padding:14px;border-bottom:1px solid #eee;text-align:center;font-size:13px;">${tier.frequency || frequency}</td>
          <td style="padding:14px;border-bottom:1px solid #eee;text-align:right;">$${(tier.pricePerVisit || 0).toFixed(2)}</td>
          <td style="padding:14px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">$${(tier.monthlyPrice || 0).toFixed(2)}</td>
        </tr>`
        )
        .join("");

      const includedExcludedHtml = tiers
        .map(
          (tier: any) => `
        <div style="margin-bottom:20px;">
          <div style="font-weight:600;font-size:14px;margin-bottom:8px;color:${primaryColor};">${tier.name || "Service Tier"}</div>
          ${
            tier.includedBullets?.length > 0
              ? `<div style="margin-bottom:8px;"><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#666;margin-bottom:4px;">Included</div><ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#334155;">${tier.includedBullets.map((b: string) => `<li style="margin-bottom:3px;">${b}</li>`).join("")}</ul></div>`
              : ""
          }
          ${
            tier.excludedBullets?.length > 0
              ? `<div><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#666;margin-bottom:4px;">Not Included</div><ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#94a3b8;">${tier.excludedBullets.map((b: string) => `<li style="margin-bottom:3px;">${b}</li>`).join("")}</ul></div>`
              : ""
          }
        </div>`
        )
        .join("");

      const scheduleInfo = [
        walkthrough.preferredDays ? `Preferred Days: ${walkthrough.preferredDays}` : "",
        walkthrough.preferredTimeWindow ? `Time Window: ${walkthrough.preferredTimeWindow}` : "",
        walkthrough.afterHoursRequired ? "After-hours service required" : "",
        walkthrough.suppliesByClient ? "Supplies provided by client" : "Supplies provided by cleaning company",
        walkthrough.restroomConsumablesIncluded ? "Restroom consumables included" : "Restroom consumables not included",
      ]
        .filter(Boolean)
        .map((s) => `<li style="margin-bottom:4px;">${s}</li>`)
        .join("");

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
  Proposal prepared by ${business.companyName || "QuotePro"} | ${new Date().toLocaleDateString()} | Powered by QuotePro
</div>
</div>
</body></html>`;

      return res.json({
        html,
        customerName,
        facilityName,
        total: pricing.monthlyPrice || quote.total,
      });
    } catch (error: any) {
      console.error("Commercial PDF generation error:", error);
      return res.status(500).json({ message: "Failed to generate commercial PDF" });
    }
  });

  app.post("/api/quotes/:id/send-with-pdf", requireAuth, requirePro as any, async (req: Request, res: Response) => {
    try {
      const quote = await getQuoteById(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });

      const { to, subject } = req.body;
      if (!to) {
        return res.status(400).json({ message: "to (recipient email) is required" });
      }

      const sgApiKey = process.env.SENDGRID_API_KEY;
      if (!sgApiKey) {
        return res.status(503).json({ message: "Email service not configured. Please connect SendGrid in settings." });
      }

      const brandedFromEmail = process.env.SENDGRID_FROM_EMAIL || "quotes@myreminder.ai";
      const fromName = business.companyName || "QuotePro";
      const replyToEmail = business.email || undefined;

      if (!replyToEmail) {
        return res.status(400).json({ success: false, message: "Please add your email address in Settings before sending emails." });
      }

      const customerName = (quote.propertyDetails as any)?.customerName || "Customer";
      const gs = await getGrowthAutomationSettings(business.id);
      const quoteHtml = await generateQuotePdfHtml(quote, business, gs);
      const qpSend = (business as any).quotePreferences;
      const primaryColor = qpSend?.brandColor || business.primaryColor || "#2563EB";

      const quoteUrl = `${getPublicBaseUrl(req)}/q/${quote.publicToken}`;

      // Extract property details and options
      const propertyDetails = (quote.propertyDetails as any) || {};
      const beds = propertyDetails.beds;
      const baths = propertyDetails.baths;
      const sqft = propertyDetails.sqft;
      
      const options = (quote.options as any) || {};
      const optionsArray = [
        {
          key: 'good',
          label: 'Good',
          name: options.good?.name || 'Good',
          scope: options.good?.scope || '',
          price: options.good?.price || 0,
        },
        {
          key: 'better',
          label: 'Better',
          name: options.better?.name || 'Better',
          scope: options.better?.scope || '',
          price: options.better?.price || 0,
        },
        {
          key: 'best',
          label: 'Best',
          name: options.best?.name || 'Best',
          scope: options.best?.scope || '',
          price: options.best?.price || 0,
        },
      ];

      // Property info section
      const propertyInfoHtml = (beds || baths || sqft) ? `
      <tr><td align="center" style="padding:24px 20px;background-color:#ffffff;border-bottom:1px solid #eeeeee;">
        <table width="100%" cellpadding="0" cellspacing="0" align="center">
          <tr>
            ${beds ? `<td align="center" style="padding:0 16px;font-size:14px;"><div style="font-weight:600;color:#333333;">${beds}</div><div style="color:#666666;font-size:12px;">Beds</div></td>` : ''}
            ${baths ? `<td align="center" style="padding:0 16px;font-size:14px;"><div style="font-weight:600;color:#333333;">${baths}</div><div style="color:#666666;font-size:12px;">Baths</div></td>` : ''}
            ${sqft ? `<td align="center" style="padding:0 16px;font-size:14px;"><div style="font-weight:600;color:#333333;">${sqft}</div><div style="color:#666666;font-size:12px;">Sq Ft</div></td>` : ''}
          </tr>
        </table>
      </td></tr>` : '';

      const savedRecommended = (quote as any).recommendedOption || 'better';
      // Options cards HTML
      const optionsCardsHtml = optionsArray.map((option, index) => {
        const isRecommended = option.key === savedRecommended;
        const borderColor = isRecommended ? primaryColor : '#eeeeee';
        const backgroundColor = isRecommended ? '#f9f9ff' : '#ffffff';
        const badgeHtml = isRecommended ? `<div style="display:inline-block;background:${primaryColor};color:white;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;margin-bottom:12px;">RECOMMENDED</div><br/>` : '';
        
        return `
      <tr><td style="padding:16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${borderColor};border-radius:8px;background-color:${backgroundColor};">
          <tr><td style="padding:20px;">
            ${badgeHtml}
            <div style="font-size:18px;font-weight:700;color:#333333;margin-bottom:4px;">${option.name}</div>
            ${option.scope ? `<div style="font-size:14px;color:#666666;margin-bottom:16px;line-height:1.4;">${option.scope}</div>` : ''}
            <div style="font-size:28px;font-weight:700;color:${primaryColor};margin-bottom:20px;">$${option.price.toFixed(2)}</div>
            <a href="${quoteUrl}?option=${option.key}" style="display:block;background:${primaryColor};color:white;padding:14px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:16px;text-align:center;">Accept ${option.name}</a>
          </td></tr>
        </table>
      </td></tr>`;
      }).join('');

      // Create a branded wrapper email with option cards
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
          ${business.logoUri ? `<div style="margin-bottom:16px;"><img src="${business.logoUri}" alt="${business.companyName}" style="max-height:50px;max-width:200px;"></div>` : ''}
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#333333;">Your Quote Options</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#666666;">Hi ${customerName}, please select the option that works best for you.</p>
        </td></tr>
        
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
        ${gs?.includeReviewInMessages && gs?.googleReviewLink?.trim() ? `<tr><td style="padding:16px 20px;text-align:center;background-color:#fffbeb;border-top:1px solid #fde68a;"><div style="font-size:13px;color:#92400e;margin-bottom:4px;">After your service, would you mind leaving a quick review?</div><a href="${gs.googleReviewLink.trim()}" style="color:${primaryColor};font-size:13px;text-decoration:underline;">${gs.googleReviewLink.trim()}</a></td></tr>` : ''}
        <tr><td style="padding:24px 20px;text-align:center;border-top:1px solid #eeeeee;background-color:#ffffff;">
          <div style="font-weight:600;color:#333333;margin-bottom:8px;">${business.companyName || 'QuotePro'}</div>
          ${business.phone ? `<div style="font-size:13px;color:#666666;margin-bottom:4px;">Phone: <a href="tel:${business.phone}" style="color:${primaryColor};text-decoration:none;">${business.phone}</a></div>` : ''}
          ${replyToEmail ? `<div style="font-size:13px;color:#666666;">Email: <a href="mailto:${replyToEmail}" style="color:${primaryColor};text-decoration:none;">${replyToEmail}</a></div>` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      const emailPayload: any = {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: brandedFromEmail, name: fromName },
        subject: subject || `Your ${business.companyName || "QuotePro"} Quote`,
        content: [
          { type: "text/plain", value: `Hi ${customerName},\n\nPlease see your quote details below.\n\nTo view and accept your quote online, visit: ${quoteUrl}` },
          { type: "text/html", value: emailHtml },
        ],
      };
      if (replyToEmail) {
        emailPayload.reply_to = { email: replyToEmail, name: fromName };
      }

      const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sgApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      if (!sgRes.ok) {
        const errText = await sgRes.text();
        console.error("SendGrid error:", sgRes.status, errText);
        let errorDetail = "Failed to send email";
        try {
          const errJson = JSON.parse(errText);
          if (errJson.errors && errJson.errors.length > 0) {
            errorDetail = errJson.errors.map((e: any) => e.message).join("; ");
          }
        } catch {}
        return res.status(502).json({ message: errorDetail });
      }

      console.log(`Quote email sent via SendGrid: from=${brandedFromEmail}, to=${to}, quoteId=${quote.id}, status=${sgRes.status}`);

      await createCommunication({
        businessId: business.id,
        quoteId: quote.id,
        customerId: quote.customerId || undefined,
        channel: "email",
        direction: "outbound",
        content: `Quote email sent to ${to}`,
        status: "sent",
      });

      return res.json({ success: true, message: "Quote email sent successfully" });
    } catch (error: any) {
      console.error("Send quote email error:", error);
      return res.status(500).json({ message: "Failed to send quote email" });
    }
  });

  // ─── Onboarding Quote Send (no Pro requirement for first quote) ───
  app.post("/api/quotes/:id/onboarding-send", requireAuth, async (req: Request, res: Response) => {
    try {
      const quote = await getQuoteById(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      const business = await getBusinessByOwner(req.session.userId!);
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
      const replyToEmail = business.email || undefined;

      const customerName = (quote.propertyDetails as any)?.customerName || "Customer";
      const primaryColor = (business as any).primaryColor || "#2563EB";
      const quoteUrl = `${getPublicBaseUrl(req)}/q/${quote.publicToken}`;

      const propertyDetails = (quote.propertyDetails as any) || {};
      const beds = propertyDetails.beds;
      const baths = propertyDetails.baths;
      const sqft = propertyDetails.sqft;
      
      const options = (quote.options as any) || {};
      const optionsArray = [
        { key: 'good', label: 'Good', name: options.good?.name || 'Good', scope: options.good?.scope || '', price: options.good?.price || 0 },
        { key: 'better', label: 'Better', name: options.better?.name || 'Better', scope: options.better?.scope || '', price: options.better?.price || 0 },
        { key: 'best', label: 'Best', name: options.best?.name || 'Best', scope: options.best?.scope || '', price: options.best?.price || 0 },
      ];

      const propertyInfoHtml = (beds || baths || sqft) ? `
      <tr><td align="center" style="padding:24px 20px;background-color:#ffffff;border-bottom:1px solid #eeeeee;">
        <table width="100%" cellpadding="0" cellspacing="0" align="center">
          <tr>
            ${beds ? `<td align="center" style="padding:0 16px;font-size:14px;"><div style="font-weight:600;color:#333333;">${beds}</div><div style="color:#666666;font-size:12px;">Beds</div></td>` : ''}
            ${baths ? `<td align="center" style="padding:0 16px;font-size:14px;"><div style="font-weight:600;color:#333333;">${baths}</div><div style="color:#666666;font-size:12px;">Baths</div></td>` : ''}
            ${sqft ? `<td align="center" style="padding:0 16px;font-size:14px;"><div style="font-weight:600;color:#333333;">${sqft}</div><div style="color:#666666;font-size:12px;">Sq Ft</div></td>` : ''}
          </tr>
        </table>
      </td></tr>` : '';

      const savedRecommended = (quote as any).recommendedOption || 'better';
      const optionsCardsHtml = optionsArray.map((option) => {
        const isRecommended = option.key === savedRecommended;
        const borderColor = isRecommended ? primaryColor : '#eeeeee';
        const backgroundColor = isRecommended ? '#f9f9ff' : '#ffffff';
        const badgeHtml = isRecommended ? `<div style="display:inline-block;background:${primaryColor};color:white;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;margin-bottom:12px;">RECOMMENDED</div><br/>` : '';
        return `
      <tr><td style="padding:16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${borderColor};border-radius:8px;background-color:${backgroundColor};">
          <tr><td style="padding:20px;">
            ${badgeHtml}
            <div style="font-size:18px;font-weight:700;color:#333333;margin-bottom:4px;">${option.name}</div>
            ${option.scope ? `<div style="font-size:14px;color:#666666;margin-bottom:16px;line-height:1.4;">${option.scope}</div>` : ''}
            <div style="font-size:28px;font-weight:700;color:${primaryColor};margin-bottom:20px;">$${option.price.toFixed(2)}</div>
            <a href="${quoteUrl}?option=${option.key}" style="display:block;background:${primaryColor};color:white;padding:14px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:16px;text-align:center;">Accept ${option.name}</a>
          </td></tr>
        </table>
      </td></tr>`;
      }).join('');

      const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;background-color:#ffffff;">
        <tr><td style="padding:32px 20px;text-align:center;border-bottom:1px solid #eeeeee;">
          ${business.logoUri ? `<div style="margin-bottom:16px;"><img src="${business.logoUri}" alt="${business.companyName}" style="max-height:50px;max-width:200px;"></div>` : ''}
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
          <div style="font-weight:600;color:#333333;margin-bottom:8px;">${business.companyName || 'QuotePro'}</div>
          ${business.phone ? `<div style="font-size:13px;color:#666666;margin-bottom:4px;">Phone: <a href="tel:${business.phone}" style="color:${primaryColor};text-decoration:none;">${business.phone}</a></div>` : ''}
          ${replyToEmail ? `<div style="font-size:13px;color:#666666;">Email: <a href="mailto:${replyToEmail}" style="color:${primaryColor};text-decoration:none;">${replyToEmail}</a></div>` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      const emailPayload: any = {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: brandedFromEmail, name: fromName },
        subject: subject || `Your ${business.companyName || "QuotePro"} Quote`,
        content: [
          { type: "text/plain", value: `Hi ${customerName},\n\nPlease see your quote details below.\n\nTo view and accept your quote online, visit: ${quoteUrl}` },
          { type: "text/html", value: emailHtml },
        ],
      };
      if (replyToEmail) {
        emailPayload.reply_to = { email: replyToEmail, name: fromName };
      }

      const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sgApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      if (!sgRes.ok) {
        const errText = await sgRes.text();
        console.error("SendGrid onboarding error:", sgRes.status, errText);
        let errorDetail = "Failed to send email";
        try {
          const errJson = JSON.parse(errText);
          if (errJson.errors && errJson.errors.length > 0) {
            errorDetail = errJson.errors.map((e: any) => e.message).join("; ");
          }
        } catch {}
        return res.status(502).json({ message: errorDetail });
      }

      console.log(`Onboarding quote email sent: from=${brandedFromEmail}, to=${to}, quoteId=${quote.id}`);

      await createCommunication({
        businessId: business.id,
        quoteId: quote.id,
        customerId: quote.customerId || undefined,
        channel: "email",
        direction: "outbound",
        content: `Quote email sent to ${to}`,
        status: "sent",
      });

      await updateQuote(quote.id, { status: "sent" });

      return res.json({ success: true, message: "Quote email sent successfully" });
    } catch (error: any) {
      console.error("Onboarding send quote error:", error);
      return res.status(500).json({ message: "Failed to send quote email" });
    }
  });

  // ─── Communications ───

  app.get("/api/communications", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { customerId, quoteId, jobId } = req.query as any;
      const list = await getCommunicationsByBusiness(business.id, { customerId, quoteId, jobId });
      return res.json(list);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get communications" });
    }
  });

  app.post("/api/communications", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const c = await createCommunication({ ...req.body, businessId: business.id });
      return res.json(c);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to create communication" });
    }
  });

  // ─── Automation Rules ───

  app.get("/api/automations", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const rules = await getAutomationRules(business.id);
      return res.json(rules || null);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get automation rules" });
    }
  });

  app.put("/api/automations", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const rules = await upsertAutomationRules(business.id, req.body);
      return res.json(rules);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to update automation rules" });
    }
  });

  // ─── Tasks ───

  app.get("/api/tasks", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { completed, customerId, dueToday } = req.query as any;
      const list = await getTasksByBusiness(business.id, {
        completed: completed === "true" ? true : completed === "false" ? false : undefined,
        customerId,
        dueToday: dueToday === "true",
      });
      return res.json(list);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get tasks" });
    }
  });

  app.post("/api/tasks", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const data = { ...req.body, businessId: business.id };
      if (data.dueDate) data.dueDate = new Date(data.dueDate);
      const t = await createTask(data);
      return res.json(t);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = { ...req.body };
      if (data.dueDate) data.dueDate = new Date(data.dueDate);
      if (data.completed && !data.completedAt) data.completedAt = new Date();
      const t = await updateTask(req.params.id, data);
      return res.json(t);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await deleteTask(req.params.id);
      return res.json({ message: "Deleted" });
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // ─── Reporting ───

  app.get("/api/reports/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const stats = await getQuoteStats(business.id);
      return res.json(stats);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get stats" });
    }
  });

  app.get("/api/reports/revenue", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const days = parseInt(req.query.days as string) || 30;
      const data = await getRevenueByPeriod(business.id, days);
      return res.json(data);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get revenue data" });
    }
  });

  // ─── Revenue / Follow-Ups ───

  app.get("/api/revenue/unfollowed", requireAuth, requirePro as any, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const unfollowed = await getUnfollowedQuotes(business.id);
      const withCustomers = await Promise.all(
        unfollowed.map(async (q) => {
          const customer = q.customerId ? await getCustomerById(q.customerId) : null;
          return { ...q, customer };
        })
      );
      return res.json(withCustomers);
    } catch (error: any) {
      console.error("Get unfollowed quotes error:", error);
      return res.status(500).json({ message: "Failed to get unfollowed quotes" });
    }
  });

  app.get("/api/revenue/pipeline", requireAuth, requirePro as any, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const sent = await getQuotesByBusiness(business.id, { status: "sent" });
      const pipelineValue = sent.reduce((sum, q) => sum + q.total, 0);
      const expectedValue = sent.reduce((sum, q) => sum + (q.expectedValue || q.total * 0.5), 0);
      const avgAge = sent.length > 0
        ? sent.reduce((sum, q) => {
            const age = (Date.now() - (q.sentAt?.getTime() || q.createdAt.getTime())) / (1000 * 60 * 60 * 24);
            return sum + age;
          }, 0) / sent.length
        : 0;
      return res.json({
        totalPipeline: Math.round(pipelineValue * 100) / 100,
        expectedValue: Math.round(expectedValue * 100) / 100,
        openQuotes: sent.length,
        avgAgeDays: Math.round(avgAge * 10) / 10,
        quotes: sent.map(q => ({
          ...q,
          ageDays: Math.round(((Date.now() - (q.sentAt?.getTime() || q.createdAt.getTime())) / (1000 * 60 * 60 * 24)) * 10) / 10,
        })),
      });
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get pipeline" });
    }
  });

  app.get("/api/follow-ups", requireAuth, requirePro as any, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { status } = req.query as any;
      const followUps = await getFollowUpsByBusiness(business.id, { status });
      return res.json(followUps);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get follow-ups" });
    }
  });

  app.get("/api/follow-ups/quote/:quoteId", requireAuth, requirePro as any, async (req: Request, res: Response) => {
    try {
      const followUps = await getFollowUpsByQuote(req.params.quoteId);
      return res.json(followUps);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get follow-ups" });
    }
  });

  app.post("/api/follow-ups", requireAuth, requirePro as any, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
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
        message,
      });
      return res.json(fu);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to create follow-up" });
    }
  });

  app.put("/api/follow-ups/:id", requireAuth, requirePro as any, async (req: Request, res: Response) => {
    try {
      const data = { ...req.body };
      if (data.scheduledFor) data.scheduledFor = new Date(data.scheduledFor);
      if (data.sentAt) data.sentAt = new Date(data.sentAt);
      const fu = await updateFollowUp(req.params.id, data);
      return res.json(fu);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to update follow-up" });
    }
  });

  app.delete("/api/follow-ups/:id", requireAuth, requirePro as any, async (req: Request, res: Response) => {
    try {
      await deleteFollowUp(req.params.id);
      return res.json({ message: "Deleted" });
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to delete follow-up" });
    }
  });

  // ─── Subscription ───

  app.get("/api/subscription", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Not found" });
      return res.json({
        tier: user.subscriptionTier || "free",
        expiresAt: user.subscriptionExpiresAt,
      });
    } catch {
      return res.status(500).json({ message: "Failed to get subscription" });
    }
  });

  app.post("/api/subscription/upgrade", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await updateUser(req.session.userId!, {
        subscriptionTier: "pro",
        subscriptionExpiresAt: null,
      });
      return res.json({ tier: user.subscriptionTier, message: "Upgraded to Pro" });
    } catch {
      return res.status(500).json({ message: "Upgrade failed" });
    }
  });

  app.get("/api/subscription/config", requireAuth, async (_req: Request, res: Response) => {
    return res.json({
      apiKey: process.env.REVENUECAT_API_KEY || "",
      googleApiKey: process.env.REVENUECAT_GOOGLE_API_KEY || "",
      entitlementId: "pro",
    });
  });

  app.post("/api/subscription/sync", requireAuth, async (req: Request, res: Response) => {
    try {
      const { tier } = req.body;
      if (!tier || !["free", "pro"].includes(tier)) {
        return res.status(400).json({ message: "Invalid tier" });
      }
      const currentUser = await getUserById(req.session.userId!);
      if (tier === "pro" && currentUser?.subscriptionTier !== "pro") {
        return res.json({ tier: currentUser?.subscriptionTier || "free", message: "Use purchase or restore to upgrade" });
      }
      const user = await updateUser(req.session.userId!, {
        subscriptionTier: tier,
      });
      return res.json({ tier: user.subscriptionTier });
    } catch {
      return res.status(500).json({ message: "Sync failed" });
    }
  });

  // ─── AI Revenue Features ───

  app.post("/api/ai/analyze-quote", requireAuth, requirePro as any, async (req: Request, res: Response) => {
    try {
      const { quoteId } = req.body;
      if (!quoteId) return res.status(400).json({ message: "quoteId is required" });

      const quote = await getQuoteById(quoteId);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      const customer = quote.customerId ? await getCustomerById(quote.customerId) : null;
      const comms = await getCommunicationsByBusiness(quote.businessId, { quoteId });

      const ageDays = Math.round(((Date.now() - (quote.sentAt?.getTime() || quote.createdAt.getTime())) / (1000 * 60 * 60 * 24)) * 10) / 10;
      const lastComm = comms.length > 0 ? comms[0] : null;

      const completion = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          {
            role: "system",
            content: `You are an AI sales assistant for a residential cleaning company. Analyze a quote and provide actionable insights. Respond with JSON: {"closeProbability": number 0-100, "suggestedAction": string, "followUpMessage": string, "notes": string}`
          },
          {
            role: "user",
            content: `Quote: $${quote.total}, sent ${ageDays} days ago, status: ${quote.status}, ${comms.length} communications sent. Customer: ${customer ? `${customer.firstName} ${customer.lastName}, status: ${customer.status}` : "Unknown"}. Last contact: ${lastComm ? `${lastComm.channel} ${lastComm.createdAt}` : "None"}.`
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      let parsed: any = {};
      try { parsed = JSON.parse(content || "{}"); } catch {}

      await updateQuote(quoteId, {
        closeProbability: parsed.closeProbability || null,
        expectedValue: quote.total * ((parsed.closeProbability || 50) / 100),
        aiNotes: parsed.notes || null,
      });

      return res.json({
        closeProbability: parsed.closeProbability || 50,
        suggestedAction: parsed.suggestedAction || "Follow up with the customer",
        followUpMessage: parsed.followUpMessage || "",
        notes: parsed.notes || "",
      });
    } catch (error: any) {
      console.error("AI analyze quote error:", error);
      return res.status(500).json({ message: "Failed to analyze quote" });
    }
  });

  app.post("/api/ai/generate-followup", requireAuth, requirePro as any, async (req: Request, res: Response) => {
    try {
      const { quoteId, channel, context, language: commLang } = req.body;
      if (!quoteId) return res.status(400).json({ message: "quoteId is required" });

      const quote = await getQuoteById(quoteId);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      const customer = quote.customerId ? await getCustomerById(quote.customerId) : null;
      const business = await db_getBusinessById(quote.businessId);
      const ageDays = Math.round(((Date.now() - (quote.sentAt?.getTime() || quote.createdAt.getTime())) / (1000 * 60 * 60 * 24)) * 10) / 10;

      const msgType = channel === "email" ? "email" : "SMS";
      const maxLen = channel === "email" ? 200 : 160;
      const langInstruction = commLang === "es" ? " Write the message entirely in Spanish." : " Write the message entirely in English.";

      const completion = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          {
            role: "system",
            content: `Write a ${msgType} follow-up message (under ${maxLen} chars for SMS) for "${business?.companyName || "our company"}". The quote is $${quote.total} sent ${ageDays} days ago. Be warm, not pushy. No emojis. Sign as "${business?.senderName || "Team"}".${context ? ` Context: ${context}` : ""}${langInstruction}`
          },
          {
            role: "user",
            content: `Generate a follow-up ${msgType} for ${customer ? `${customer.firstName}` : "the customer"}. Reply with ONLY the message text.`
          },
        ],
        max_completion_tokens: channel === "email" ? 250 : 100,
      });

      const draft = completion.choices[0]?.message?.content?.trim() || "";
      return res.json({ draft });
    } catch (error: any) {
      console.error("AI generate followup error:", error);
      return res.status(500).json({ message: "Failed to generate follow-up" });
    }
  });

  app.post("/api/ai/sales-chat", requireAuth, requirePro as any, async (req: Request, res: Response) => {
    try {
      const { message, conversationHistory } = req.body;
      if (!message) return res.status(400).json({ message: "message is required" });

      const business = await getBusinessByOwner(req.session.userId!);

      let contextStr = "No business data available yet.";
      const now = new Date();

      if (business) {
        const stats = await getQuoteStats(business.id);
        const allQuotes = await getQuotesByBusiness(business.id);
        const customers = await getCustomersByBusiness(business.id);
        const jobs = await getJobsByBusiness(business.id);
        const comms = await getCommunicationsByBusiness(business.id);

        const sentQuotes = allQuotes.filter(q => q.status === "sent");
        const acceptedQuotes = allQuotes.filter(q => q.status === "accepted");
        const declinedQuotes = allQuotes.filter(q => q.status === "declined");
        const completedJobs = jobs.filter(j => j.status === "completed");
        const scheduledJobs = jobs.filter(j => j.status === "scheduled");

        const quotesThisMonth = allQuotes.filter(q => {
          const d = new Date(q.createdAt);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const quotesLastMonth = allQuotes.filter(q => {
          const d = new Date(q.createdAt);
          const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
        });
        const jobsThisMonth = completedJobs.filter(j => {
          const d = j.endDatetime ? new Date(j.endDatetime) : new Date(j.updatedAt);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        const customerMap = new Map(customers.map(c => [c.id, c]));

        const openQuoteDetails = sentQuotes
          .sort((a, b) => (a.sentAt?.getTime() || a.createdAt.getTime()) - (b.sentAt?.getTime() || b.createdAt.getTime()))
          .slice(0, 10)
          .map(q => {
            const cust = q.customerId ? customerMap.get(q.customerId) : null;
            const name = cust ? `${cust.firstName} ${cust.lastName}`.trim() : "Unknown";
            const sentDate = q.sentAt || q.createdAt;
            const ageDays = Math.round((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
            const quoteComms = comms.filter(c => c.quoteId === q.id);
            const lastFollowUp = quoteComms.length > 0 ? quoteComms[0] : null;
            const followUpAge = lastFollowUp ? Math.round((now.getTime() - new Date(lastFollowUp.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : null;
            return `  - ${name}: $${q.total.toFixed(0)} ${q.frequencySelected} (${q.selectedOption} tier), ${ageDays}d old${q.propertySqft ? `, ${q.propertySqft}sqft` : ""}${followUpAge !== null ? `, last follow-up ${followUpAge}d ago` : ", no follow-up sent"}`;
          });

        const recentWins = acceptedQuotes
          .sort((a, b) => (b.acceptedAt?.getTime() || 0) - (a.acceptedAt?.getTime() || 0))
          .slice(0, 5)
          .map(q => {
            const cust = q.customerId ? customerMap.get(q.customerId) : null;
            const name = cust ? `${cust.firstName} ${cust.lastName}`.trim() : "Unknown";
            return `  - ${name}: $${q.total.toFixed(0)} ${q.frequencySelected} (${q.selectedOption} tier)`;
          });

        const recentLosses = declinedQuotes
          .sort((a, b) => (b.declinedAt?.getTime() || 0) - (a.declinedAt?.getTime() || 0))
          .slice(0, 5)
          .map(q => {
            const cust = q.customerId ? customerMap.get(q.customerId) : null;
            const name = cust ? `${cust.firstName} ${cust.lastName}`.trim() : "Unknown";
            return `  - ${name}: $${q.total.toFixed(0)} ${q.frequencySelected} (${q.selectedOption} tier)`;
          });

        const topCustomers = customers
          .map(c => {
            const custQuotes = allQuotes.filter(q => q.customerId === c.id && q.status === "accepted");
            const totalSpent = custQuotes.reduce((s, q) => s + q.total, 0);
            const custJobs = jobs.filter(j => j.customerId === c.id && j.status === "completed");
            return { name: `${c.firstName} ${c.lastName}`.trim(), totalSpent, jobCount: custJobs.length, isVip: c.isVip };
          })
          .filter(c => c.totalSpent > 0)
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 5)
          .map(c => `  - ${c.name}: $${c.totalSpent.toFixed(0)} revenue, ${c.jobCount} jobs${c.isVip ? " (VIP)" : ""}`);

        const dormantCustomers = customers.filter(c => {
          const lastJob = jobs.filter(j => j.customerId === c.id && j.status === "completed")
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
          if (!lastJob) return false;
          const daysSince = (now.getTime() - new Date(lastJob.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
          return daysSince > 45;
        });

        const avgAcceptedTotal = acceptedQuotes.length > 0
          ? acceptedQuotes.reduce((s, q) => s + q.total, 0) / acceptedQuotes.length
          : 0;
        const recurringCount = acceptedQuotes.filter(q => q.frequencySelected !== "one-time").length;
        const oneTimeCount = acceptedQuotes.filter(q => q.frequencySelected === "one-time").length;

        const freqBreakdown = sentQuotes.reduce((acc, q) => {
          acc[q.frequencySelected] = (acc[q.frequencySelected] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const tierBreakdown = sentQuotes.reduce((acc, q) => {
          acc[q.selectedOption] = (acc[q.selectedOption] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const pipelineValue = sentQuotes.reduce((s, q) => s + q.total, 0);

        contextStr = [
          `=== BUSINESS SNAPSHOT (${now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}) ===`,
          `Business: ${business.companyName}`,
          ``,
          `--- PIPELINE ---`,
          `Close rate: ${stats.closeRate}% (${stats.acceptedQuotes} accepted of ${stats.totalQuotes} total)`,
          `Pipeline: ${sentQuotes.length} open quotes worth $${pipelineValue.toFixed(0)}`,
          `Avg accepted quote: $${avgAcceptedTotal.toFixed(0)}`,
          `Recurring vs one-time wins: ${recurringCount} recurring, ${oneTimeCount} one-time`,
          `Open quote tiers: ${Object.entries(tierBreakdown).map(([k, v]) => `${k}=${v}`).join(", ") || "none"}`,
          `Open quote frequencies: ${Object.entries(freqBreakdown).map(([k, v]) => `${k}=${v}`).join(", ") || "none"}`,
          ``,
          `--- REVENUE ---`,
          `Total revenue: $${stats.totalRevenue}`,
          `Quotes this month: ${quotesThisMonth.length} (last month: ${quotesLastMonth.length})`,
          `Cleans this month: ${jobsThisMonth.length}`,
          `Scheduled jobs: ${scheduledJobs.length}`,
          ``,
          openQuoteDetails.length > 0 ? `--- OPEN QUOTES (oldest first, need attention) ---\n${openQuoteDetails.join("\n")}` : "",
          ``,
          recentWins.length > 0 ? `--- RECENT WINS ---\n${recentWins.join("\n")}` : "",
          recentLosses.length > 0 ? `--- RECENT LOSSES ---\n${recentLosses.join("\n")}` : "",
          ``,
          topCustomers.length > 0 ? `--- TOP CUSTOMERS ---\n${topCustomers.join("\n")}` : "",
          ``,
          `--- HEALTH ---`,
          `${customers.length} total customers, ${dormantCustomers.length} dormant (45+ days since last job)`,
          `${customers.filter(c => c.isVip).length} VIP customers`,
        ].filter(s => s !== undefined).join("\n");
      }

      const businessName = business?.companyName || "your cleaning business";

      const systemPrompt = `You are a senior sales coach and business advisor for "${businessName}", a residential cleaning company. You have deep expertise in the cleaning industry, pricing strategy, customer retention, and sales psychology.

YOUR ROLE: Give specific, data-driven advice using the real business data below. Never be generic. Always reference actual customer names, dollar amounts, and timelines from the data.

RESPONSE RULES:
- Be direct and actionable. Lead with the most important insight.
- Use specific numbers, customer names, and dollar amounts from the data.
- Keep responses to 3-5 sentences. No fluff, no filler.
- When suggesting follow-ups, give the exact message approach (not just "follow up").
- When analyzing pipeline, identify the biggest risk and opportunity.

SALES EXPERTISE TO APPLY:
- Follow-up timing: Quotes over 3 days old without follow-up are at high risk. 48hrs is the sweet spot.
- Upselling: If a customer chose "good" tier, suggest how to pitch "better" by framing the value gap. One-time customers are upsell targets for recurring plans.
- Pricing: If close rate is below 40%, prices may be too high or follow-up is weak. Above 70% may mean underpricing. Sweet spot is 45-65%.
- Retention: Customers who haven't booked in 45+ days need a re-engagement offer (e.g., 10% off next clean).
- Recurring revenue: Recurring cleans are 3-5x more valuable than one-time. Always highlight opportunities to convert one-time to recurring.
- Objection handling: Price objection = reframe value per hour saved. "Too busy" = offer flexible scheduling. "Thinking about it" = create urgency with limited availability.

BUSINESS DATA:
${contextStr}`;

      const chatMessages: any[] = [
        { role: "system", content: systemPrompt },
      ];

      if (conversationHistory && Array.isArray(conversationHistory)) {
        for (const msg of conversationHistory.slice(-6)) {
          chatMessages.push({ role: msg.role, content: msg.content });
        }
      }
      chatMessages.push({ role: "user", content: message });

      const completion = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: chatMessages,
      });

      const reply = completion.choices[0]?.message?.content?.trim() || "";
      if (!reply) {
        console.error("AI sales chat: empty response from model", JSON.stringify(completion.choices[0]));
        return res.json({ reply: "I'm having trouble generating a response right now. Please try again in a moment." });
      }
      return res.json({ reply });
    } catch (error: any) {
      console.error("AI sales chat error:", error?.message || error, error?.stack);
      return res.status(500).json({ message: "Failed to process chat" });
    }
  });

  // ─── Send Email / SMS ───

  app.post("/api/send/email", requireAuth, requirePro as any, async (req: Request, res: Response) => {
    try {
      const { to, subject, body, customerId, quoteId, includeQuoteLink } = req.body;
      if (!to || !body) {
        return res.status(400).json({ message: "to and body are required" });
      }

      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });

      const sgApiKey = process.env.SENDGRID_API_KEY;
      if (!sgApiKey) {
        return res.status(503).json({ message: "Email service not configured. Please connect SendGrid in settings." });
      }

      const brandedFromEmail = process.env.SENDGRID_FROM_EMAIL || "quotes@myreminder.ai";
      const fromName = business.companyName || "QuotePro";
      const replyToEmail = business.email || undefined;

      if (!replyToEmail) {
        return res.status(400).json({ success: false, message: "Please add your email address in Settings before sending emails. This ensures customer replies go directly to you." });
      }

      let bodyContent = body;
      let quoteButtonHtml = "";

      // Add quote link button if requested
      if (includeQuoteLink && quoteId) {
        const quote = await getQuoteById(quoteId);
        if (quote && quote.publicToken) {
          const quoteUrl = `${getPublicBaseUrl(req)}/q/${quote.publicToken}`;
          const qpEmail = (business as any).quotePreferences;
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
          ${bodyContent.split('\n').map((line: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333333;">${line}</p>`).join('')}
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

      const emailPayload: any = {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: brandedFromEmail, name: fromName },
        subject: subject || `Message from ${fromName}`,
        content: [
          { type: "text/plain", value: bodyContent },
          { type: "text/html", value: htmlBody },
        ],
      };
      if (replyToEmail) {
        emailPayload.reply_to = { email: replyToEmail, name: fromName };
      }

      const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sgApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      if (!sgRes.ok) {
        const errText = await sgRes.text();
        console.error("SendGrid error:", sgRes.status, errText);
        let errorDetail = "Failed to send email";
        try {
          const errJson = JSON.parse(errText);
          if (errJson.errors && errJson.errors.length > 0) {
            errorDetail = errJson.errors.map((e: any) => e.message).join("; ");
          }
        } catch {}
        return res.status(502).json({ message: errorDetail });
      }

      console.log(`Email sent via SendGrid: from=${brandedFromEmail}, to=${to}, replyTo=${replyToEmail}, status=${sgRes.status}`);

      await createCommunication({
        businessId: business.id,
        customerId: customerId || undefined,
        quoteId: quoteId || undefined,
        channel: "email",
        direction: "outbound",
        content: bodyContent,
        status: "sent",
      });

      return res.json({ success: true, message: "Email sent successfully" });
    } catch (error: any) {
      console.error("Send email error:", error);
      return res.status(500).json({ message: "Failed to send email" });
    }
  });

  app.post("/api/send/sms", requireAuth, requirePro as any, async (req: Request, res: Response) => {
    try {
      const { to, body, customerId, quoteId } = req.body;
      if (!to || !body) {
        return res.status(400).json({ message: "to and body are required" });
      }

      const business = await getBusinessByOwner(req.session.userId!);
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
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: twilioFrom,
          Body: body,
        }).toString(),
      });

      if (!twilioRes.ok) {
        const errText = await twilioRes.text();
        console.error("Twilio error:", errText);
        return res.status(502).json({ message: "Failed to send SMS" });
      }

      const twilioData = await twilioRes.json() as any;

      await createCommunication({
        businessId: business.id,
        customerId: customerId || undefined,
        quoteId: quoteId || undefined,
        channel: "sms",
        direction: "outbound",
        content: body,
        status: "sent",
      });

      return res.json({ success: true, message: "SMS sent successfully", sid: twilioData.sid });
    } catch (error: any) {
      console.error("Send SMS error:", error);
      return res.status(500).json({ message: "Failed to send SMS" });
    }
  });

  // ─── AI Endpoints (Pro only) ───

  app.post("/api/ai/quote-descriptions", requireAuth, requirePro as any, async (req: Request, res: Response) => {
    try {
      const { homeDetails, serviceTypes, addOns, companyName } = req.body;

      if (!homeDetails || !serviceTypes) {
        return res.status(400).json({ message: "homeDetails and serviceTypes are required" });
      }

      const addOnsList: string[] = [];
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
        homeDetails.conditionScore ? `condition score ${homeDetails.conditionScore}/5` : null,
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
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: "No response from AI" });
      }

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = {
          good: content,
          better: content,
          best: content,
        };
      }

      return res.json({
        good: parsed.good || "",
        better: parsed.better || "",
        best: parsed.best || "",
      });
    } catch (error: any) {
      console.error("AI quote descriptions error:", error);
      return res.status(500).json({ message: "Failed to generate quote descriptions" });
    }
  });

  app.post("/api/ai/pricing-suggestion", requireAuth, requirePro as any, async (req: Request, res: Response) => {
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
        homeDetails.petType && homeDetails.petType !== "none" ? `pet: ${homeDetails.petType}${homeDetails.petShedding ? " (shedding)" : ""}` : null,
      ].filter(Boolean).join(", ");

      const addOnsList: string[] = [];
      if (addOns) {
        Object.entries(addOns).forEach(([k, v]) => { if (v) addOnsList.push(k.replace(/([A-Z])/g, " $1").toLowerCase().trim()); });
      }

      const historyContext = businessHistory
        ? `Business stats: ${businessHistory.totalQuotes || 0} quotes sent, ${businessHistory.acceptRate || 0}% acceptance rate, avg quote $${businessHistory.avgQuote || 0}, hourly rate $${ps?.hourlyRate || 55}. ${businessHistory.recentAccepted ? `Recent accepted quotes ranged $${businessHistory.recentAcceptedMin}-$${businessHistory.recentAcceptedMax}.` : ""}`
        : `Hourly rate: $${ps?.hourlyRate || 55}. No historical data available.`;

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
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 300,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return res.status(500).json({ message: "No response from AI" });

      let parsed: any;
      try { parsed = JSON.parse(content); } catch { return res.status(500).json({ message: "Invalid AI response" }); }

      return res.json({
        good: { suggestedPrice: parsed.good?.suggestedPrice || currentPrices.good, reasoning: parsed.good?.reasoning || "" },
        better: { suggestedPrice: parsed.better?.suggestedPrice || currentPrices.better, reasoning: parsed.better?.reasoning || "" },
        best: { suggestedPrice: parsed.best?.suggestedPrice || currentPrices.best, reasoning: parsed.best?.reasoning || "" },
        overallAssessment: parsed.overallAssessment || "",
        confidence: parsed.confidence || "medium",
        keyInsight: parsed.keyInsight || "",
      });
    } catch (error: any) {
      console.error("AI pricing suggestion error:", error);
      return res.status(500).json({ message: "Failed to generate pricing suggestion" });
    }
  });

  app.post("/api/ai/walkthrough-extract", requireAuth, requirePro as any, async (req: Request, res: Response) => {
    try {
      const { description } = req.body;
      if (!description || typeof description !== "string" || description.trim().length === 0) {
        return res.status(400).json({ message: "A job description is required" });
      }

      const business = await getBusinessByOwner(req.session.userId!);
      if (business) {
        try {
          await createAnalyticsEvent({
            businessId: business.id,
            eventName: "walkthrough_analysis_started",
            properties: { descriptionLength: description.length },
          });
        } catch (_e) {}
      }

      const systemPrompt = `You are a cleaning job detail extractor. Given a natural language description of a cleaning job, extract structured fields. You must NEVER return any prices, costs, rates, or dollar amounts — only physical property attributes and job characteristics.

Return a JSON object with these fields:
{
  "extractedFields": {
    "propertyType": "house" | "apartment" | "condo" | "townhouse" | "office" | "retail" | "warehouse" | "medical" | "restaurant" | "gym" | "school" | "church" | "other" | null,
    "serviceCategory": "standard" | "deep" | "move-in-out" | "post-construction" | "recurring" | "one-time" | null,
    "isCommercial": boolean,
    "bedrooms": number | null,
    "bathrooms": number | null,
    "sqft": number | null,
    "frequency": "one-time" | "weekly" | "bi-weekly" | "monthly" | null,
    "isFirstTimeClean": boolean | null,
    "isDeepClean": boolean | null,
    "isMoveInOut": boolean | null,
    "petCount": number | null,
    "petType": "dog" | "cat" | "both" | "other" | "none" | null,
    "addOns": string[],
    "conditionLevel": "light" | "moderate" | "heavy" | "extreme" | null,
    "kitchenCondition": "light" | "moderate" | "heavy" | null,
    "floors": number | null,
    "stairs": number | null,
    "officeCount": number | null,
    "officeBathrooms": number | null,
    "breakrooms": number | null,
    "heavySoil": boolean | null,
    "urgency": "normal" | "rush" | "flexible" | null,
    "notes": string | null
  },
  "assumptions": string[],
  "confidence": "high" | "medium" | "low"
}

Rules:
- Only extract information explicitly stated or strongly implied in the description.
- For any field not mentioned or inferable, use null.
- List assumptions you made (e.g., "Assumed standard residential since no commercial indicators mentioned").
- Set confidence based on how much detail was provided: high = most fields filled, medium = some gaps, low = very sparse description.
- addOns should be an array of strings like ["oven cleaning", "inside fridge", "window cleaning", "laundry", "organizing", "garage", "baseboards", "blinds", "carpet cleaning", "wall washing"].
- NEVER include any pricing, cost estimates, hourly rates, or dollar amounts in your response.`;

      let completion;
      try {
        completion = await openai.chat.completions.create({
          model: "gpt-5-nano",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: description.trim() },
          ],
          response_format: { type: "json_object" },
        });
      } catch (aiError: any) {
        console.error("Walkthrough AI call failed:", aiError?.message || aiError);
        return res.status(500).json({ message: "AI service temporarily unavailable. Please try again." });
      }

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        console.error("Walkthrough AI empty response:", JSON.stringify(completion.choices[0]));
        return res.status(500).json({ message: "AI returned an empty response. Please try again." });
      }

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        return res.status(500).json({ message: "Invalid AI response format" });
      }

      const extractedFields = parsed.extractedFields || {};
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
              assumptionCount: assumptions.length,
            },
          });
        } catch (_e) {}
      }

      return res.json({
        extractedFields,
        assumptions,
        confidence,
      });
    } catch (error: any) {
      console.error("AI walkthrough extract error:", error);
      return res.status(500).json({ message: "Failed to analyze job description" });
    }
  });

  app.post("/api/ai/closing-message", requireAuth, requirePro as any, async (req: Request, res: Response) => {
    try {
      const {
        quoteAmount,
        serviceType,
        frequency,
        addOns,
        customerName,
        notes,
        pricingSummary,
        messageType,
        tone,
        language: msgLanguage,
      } = req.body;

      if (!messageType || !tone) {
        return res.status(400).json({ message: "Message type and tone are required" });
      }

      const business = await getBusinessByOwner(req.session.userId!);
      if (business) {
        try {
          await createAnalyticsEvent({
            businessId: business.id,
            eventName: "walkthrough_closing_message_generated",
            properties: { messageType, tone, language: msgLanguage || "en" },
          });
        } catch (_e) {}
      }

      const businessName = business?.companyName || "our company";

      const languageMap: Record<string, string> = {
        en: "English",
        es: "Spanish",
        pt: "Portuguese",
        ru: "Russian",
      };
      const targetLanguage = languageMap[msgLanguage || "en"] || "English";

      const systemPrompt = `You are an expert sales copywriter for cleaning service businesses. Generate a closing message based on the given context.

Rules:
- Write in ${targetLanguage}.
- Tone: ${tone}.
- Message type: ${messageType.replace(/_/g, " ")}.
- Keep the message concise and action-oriented.
- For text messages, keep under 300 characters.
- For emails, include a subject line on the first line prefixed with "Subject: ".
- For follow-ups, reference the previous quote gently.
- For objection handling, address common price concerns with value framing.
- For recurring upsell, highlight savings and convenience of regular service.
- For deep-clean-first, explain why an initial deep clean leads to better recurring results.
- Never use placeholder brackets like [Name] — use the actual customer name if provided, or write naturally without a name.
- Be genuine and human, not salesy or pushy.
- Do NOT include any emojis.`;

      const contextParts: string[] = [];
      if (customerName) contextParts.push(`Customer: ${customerName}`);
      if (quoteAmount) contextParts.push(`Quote amount: $${Number(quoteAmount).toFixed(2)}`);
      if (serviceType) contextParts.push(`Service: ${serviceType}`);
      if (frequency) contextParts.push(`Frequency: ${frequency}`);
      if (addOns && Array.isArray(addOns) && addOns.length > 0) contextParts.push(`Add-ons: ${addOns.join(", ")}`);
      if (notes) contextParts.push(`Notes: ${notes}`);
      if (pricingSummary) contextParts.push(`Pricing summary: ${pricingSummary}`);
      contextParts.push(`Business name: ${businessName}`);

      const userMessage = contextParts.length > 0
        ? `Generate a ${messageType.replace(/_/g, " ")} with a ${tone} tone for this quote:\n\n${contextParts.join("\n")}`
        : `Generate a generic ${messageType.replace(/_/g, " ")} with a ${tone} tone for a cleaning service quote.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_completion_tokens: 600,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return res.status(500).json({ message: "No response from AI" });

      return res.json({ message: content.trim() });
    } catch (error: any) {
      console.error("AI closing message error:", error);
      return res.status(500).json({ message: "Failed to generate closing message" });
    }
  });

  app.post("/api/ai/communication-draft", requireAuth, requirePro as any, async (req: Request, res: Response) => {
    try {
      const { type, purpose, customerName, companyName, senderName, quoteDetails, bookingLink, quoteLink, paymentMethodsText, language: commLang } = req.body;

      if (!type || !purpose) {
        return res.status(400).json({ message: "type and purpose are required" });
      }

      const purposeDescriptions: Record<string, string> = {
        initial_quote: "sending an initial quote - be enthusiastic and highlight value",
        follow_up: "a gentle follow-up on a previously sent quote - be polite and not pushy",
        thank_you: "thanking the customer for their business - be grateful and warm",
        booking_confirmation: "confirming a booking - be professional and include key details",
        reschedule: "requesting or confirming a reschedule - be understanding and accommodating",
        payment_failed: "notifying the customer that their payment could not be processed - be polite and professional, avoid blaming the customer, keep the tone helpful, encourage quick resolution, mention they can retry the payment. If a payment link or quote link is available include it. Keep under 120 words",
      };

      const purposeInstruction = purposeDescriptions[purpose] || `purpose: ${purpose}`;

      const quoteContext = quoteDetails
        ? ` Quote: ${quoteDetails.selectedOption || "Cleaning"} $${quoteDetails.price || ""}. ${quoteDetails.scope || ""}. ${quoteDetails.propertyInfo || ""}.`
        : "";

      let systemPrompt: string;
      let userPrompt: string;

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
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: type === "sms" ? 100 : 250,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: "No response from AI" });
      }

      let draft = content.trim();
      if (draft.startsWith('"') && draft.endsWith('"')) {
        draft = draft.slice(1, -1);
      }
      if (draft.startsWith('{')) {
        try {
          const parsed = JSON.parse(draft);
          draft = parsed.draft || content;
        } catch {}
      }
      draft = draft.replace(/\\n/g, '\n');

      return res.json({ draft });
    } catch (error: any) {
      console.error("AI communication draft error:", error);
      return res.status(500).json({ message: "Failed to generate communication draft" });
    }
  });

  // ─── Social / AI Sales Assistant ───

  app.get("/api/social/connections", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const connections = await getChannelConnectionsByBusiness(business.id);
      return res.json(connections.map(c => ({
        id: c.id, channel: c.channel, status: c.status,
        pageName: c.pageName, igUsername: c.igUsername,
        webhookVerified: c.webhookVerified, lastWebhookAt: c.lastWebhookAt,
        tokenExpiresAt: c.tokenExpiresAt, permissions: c.permissions,
      })));
    } catch (error: any) {
      console.error("Get connections error:", error);
      return res.status(500).json({ message: "Failed to get connections" });
    }
  });

  app.post("/api/social/connections", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { channel, status, pageName, igUsername } = req.body;
      if (!channel) return res.status(400).json({ message: "channel is required" });
      const conn = await upsertChannelConnection(business.id, channel, {
        status: status || "connected",
        pageName: pageName || null,
        igUsername: igUsername || null,
        webhookVerified: true,
        lastWebhookAt: new Date(),
      });
      return res.json(conn);
    } catch (error: any) {
      console.error("Create connection error:", error);
      return res.status(500).json({ message: "Failed to create connection" });
    }
  });

  app.delete("/api/social/connections/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await deleteChannelConnection(req.params.id);
      return res.json({ message: "Disconnected" });
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to disconnect" });
    }
  });

  app.get("/api/social/automation", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const settings = await getSocialAutomationSettings(business.id);
      return res.json(settings || {
        autoRepliesEnabled: false, intentThreshold: 0.7,
        quietHoursEnabled: false, quietHoursStart: "22:00", quietHoursEnd: "08:00",
        replyTemplate: "Hi! Thanks for reaching out. Here's a quick link to get an instant quote: {link}",
        optOutKeywords: ["stop", "unsubscribe", "quit", "opt out"],
        socialOnboardingComplete: false,
      });
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get automation settings" });
    }
  });

  app.put("/api/social/automation", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const settings = await upsertSocialAutomationSettings(business.id, req.body);
      return res.json(settings);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to update automation settings" });
    }
  });

  app.get("/api/social/conversations", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { channel } = req.query as any;
      const conversations = await getConversationsByBusiness(business.id, { channel });
      return res.json(conversations);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get conversations" });
    }
  });

  app.get("/api/social/conversations/:id/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const messages = await getMessagesByConversation(req.params.id);
      return res.json(messages);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.get("/api/social/leads", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { channel, status } = req.query as any;
      const leads = await getSocialLeadsByBusiness(business.id, { channel, status });
      return res.json(leads);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get social leads" });
    }
  });

  app.get("/api/social/leads/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const lead = await getSocialLeadById(req.params.id);
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      return res.json(lead);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get lead" });
    }
  });

  app.post("/api/social/leads", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const lead = await createSocialLead({ ...req.body, businessId: business.id });
      await createAttributionEvent({
        businessId: business.id,
        socialLeadId: lead.id,
        channel: lead.channel,
        eventType: "lead_created",
        metadata: { attribution: lead.attribution },
      });
      return res.json(lead);
    } catch (error: any) {
      console.error("Create social lead error:", error);
      return res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.put("/api/social/leads/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const lead = await updateSocialLead(req.params.id, req.body);
      return res.json(lead);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.get("/api/social/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { days } = req.query as any;
      const stats = await getSocialStats(business.id, days ? parseInt(days) : 30);
      return res.json(stats);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get social stats" });
    }
  });

  app.get("/api/social/attribution", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { channel, days } = req.query as any;
      const events = await getAttributionEventsByBusiness(business.id, { channel, days: days ? parseInt(days) : 30 });
      return res.json(events);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get attribution events" });
    }
  });

  app.get("/api/social/optouts", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const optouts = await getSocialOptOutsByBusiness(business.id);
      return res.json(optouts);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get opt-outs" });
    }
  });

  app.post("/api/social/simulate-dm", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });

      const { message, channel, senderName } = req.body;
      if (!message) return res.status(400).json({ message: "message is required" });

      const dmChannel = channel || "instagram";
      const dmSender = senderName || "Test User";

      const conversation = await createConversation({
        businessId: business.id,
        channel: dmChannel,
        senderName: dmSender,
        senderExternalId: `sim_${Date.now()}`,
      });

      const inboundMsg = await createMessage({
        conversationId: conversation.id,
        direction: "inbound",
        content: message,
      });

      let intentResult = { intent: false, confidence: 0, category: "general_question" };
      try {
        const intentCompletion = await openai.chat.completions.create({
          model: "gpt-5-nano",
          messages: [
            {
              role: "system",
              content: `You are an AI intent classifier for a cleaning business. Classify the following DM message. Determine if it shows buying intent (asking about pricing, availability, booking, or services). Categories: pricing_request, booking_request, service_area, general_question, spam. Respond with JSON: {"intent": boolean, "confidence": 0-1, "category": string}`
            },
            { role: "user", content: message },
          ],
          response_format: { type: "json_object" },
        });
        const parsed = JSON.parse(intentCompletion.choices[0]?.message?.content || "{}");
        intentResult = {
          intent: parsed.intent ?? false,
          confidence: parsed.confidence ?? 0,
          category: parsed.category ?? "general_question",
        };
      } catch (e) {
        console.error("Intent classification error:", e);
      }

      const automationSettings = await getSocialAutomationSettings(business.id);
      const threshold = automationSettings?.intentThreshold ?? 0.7;
      const autoEnabled = automationSettings?.autoRepliesEnabled ?? false;

      let autoReplyContent: string | undefined;
      let quoteLink: string | undefined;

      if (intentResult.intent && intentResult.confidence >= threshold && autoEnabled) {
        const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || process.env.REPLIT_DEV_DOMAIN || "localhost:5000";
        quoteLink = `https://${domain}/q?u=${business.id}&ch=${dmChannel}&cid=${conversation.id}`;

        try {
          const replyCompletion = await openai.chat.completions.create({
            model: "gpt-5-nano",
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
              { role: "user", content: message },
            ],
            response_format: { type: "json_object" },
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
          quoteLink,
        });

        await updateConversation(conversation.id, { autoReplied: true, lastMessageAt: new Date() });

        const lead = await createSocialLead({
          businessId: business.id,
          conversationId: conversation.id,
          channel: dmChannel,
          attribution: "auto_dm",
          senderName: dmSender,
          dmText: message,
        });

        await createAttributionEvent({
          businessId: business.id,
          socialLeadId: lead.id,
          conversationId: conversation.id,
          channel: dmChannel,
          eventType: "auto_reply_sent",
        });
      }

      await createMessage({
        conversationId: conversation.id,
        direction: "inbound",
        content: message,
        intentDetected: intentResult.intent,
        intentConfidence: intentResult.confidence,
        intentCategory: intentResult.category,
        autoReplyContent: autoReplyContent || undefined,
        quoteLink: quoteLink || undefined,
      });

      return res.json({
        success: true,
        conversation: conversation,
        intent: intentResult,
        autoReplied: !!autoReplyContent,
        autoReplyContent: autoReplyContent || null,
        quoteLink: quoteLink || null,
      });
    } catch (error: any) {
      console.error("Simulate DM error:", error);
      return res.status(500).json({ message: "Failed to simulate DM" });
    }
  });

  app.post("/api/social/tiktok-lead", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });

      const { dmText, senderName, senderHandle } = req.body;
      if (!dmText) return res.status(400).json({ message: "dmText is required" });

      let extractedFields: any = {};
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-5-nano",
          messages: [
            {
              role: "system",
              content: `Extract relevant cleaning lead information from a TikTok DM. Return JSON with: {"name": string, "serviceType": "regular"|"deep_clean"|"move_in_out"|"other", "bedrooms": number|null, "bathrooms": number|null, "sqft": number|null, "notes": string}`
            },
            { role: "user", content: dmText },
          ],
          response_format: { type: "json_object" },
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
        dmText,
      });

      await createAttributionEvent({
        businessId: business.id,
        socialLeadId: lead.id,
        channel: "tiktok",
        eventType: "lead_created",
        metadata: { attribution: "manual_dm", extractedFields },
      });

      return res.json({ lead, extractedFields });
    } catch (error: any) {
      console.error("TikTok lead error:", error);
      return res.status(500).json({ message: "Failed to create TikTok lead" });
    }
  });

  // ─── Quick Quote Public Page ───

  app.get("/q", (_req: Request, res: Response) => {
    res.send(getQuickQuoteHTML());
  });

  app.post("/api/public/quick-quote", async (req: Request, res: Response) => {
    try {
      const { businessId, channel, conversationId, name, phone, email, zip, beds, baths, sqft, serviceType, frequency } = req.body;
      if (!businessId) return res.status(400).json({ message: "businessId is required" });

      const pricing = await getPricingByBusiness(businessId);
      const settings = pricing?.settings as any;
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
        status: "sent",
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
          leadSource: channel || "social",
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
            quoteId: quote.id,
          });

          await createAttributionEvent({
            businessId,
            socialLeadId: lead.id,
            conversationId,
            channel: channel || "instagram",
            eventType: "quote_created",
            metadata: { quoteTotal: total },
          });
        }
      }

      const business = await db_getBusinessById(businessId);

      return res.json({
        quote: {
          id: quote.id,
          total,
          breakdown: {
            baseRate, sqft: sqft || 1500, beds: beds || 3, baths: baths || 2,
            serviceType: serviceType || "regular", frequency: frequency || "one-time",
            multiplier, freqDiscount,
          },
        },
        business: business ? { companyName: business.companyName, phone: business.phone, email: business.email, logoUri: business.logoUri } : null,
      });
    } catch (error: any) {
      console.error("Quick quote error:", error);
      return res.status(500).json({ message: "Failed to create quick quote" });
    }
  });

  // ─── Background Cron (called periodically) ───

  app.post("/api/internal/cron", async (_req: Request, res: Response) => {
    try {
      const expiredCount = await expireOldQuotes();
      if (expiredCount > 0) console.log(`Expired ${expiredCount} quotes`);
      return res.json({ expired: expiredCount });
    } catch (error: any) {
      console.error("Cron error:", error);
      return res.status(500).json({ message: "Cron failed" });
    }
  });

  // ─── Google Calendar ───

  app.get("/api/google-calendar/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const tokens = await getGoogleCalendarToken(req.session.userId!);
      if (tokens) {
        return res.json({ connected: true, calendarId: tokens.calendarId });
      }
      return res.json({ connected: false });
    } catch (error: any) {
      console.error("Calendar status error:", error);
      return res.status(500).json({ message: "Failed to check calendar status" });
    }
  });

  app.get("/api/google-calendar/connect", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(503).json({ message: "Google Calendar is not set up yet. Contact support to enable calendar sync." });
      }
      const state = crypto.randomBytes(32).toString("hex");
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
        state,
      });
      return res.json({ url });
    } catch (error: any) {
      console.error("Calendar connect error:", error);
      return res.status(500).json({ message: "Failed to generate auth URL" });
    }
  });

  app.get("/api/google-calendar/callback", async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query as { code: string; state: string };
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
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiresAt: new Date(tokens.expiry_date!),
      });

      return res.send(`<!DOCTYPE html>
<html><head><title>Calendar Connected</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;}
.card{text-align:center;padding:40px;background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
.check{font-size:48px;margin-bottom:16px;}h2{margin:0 0 8px;color:#333;}p{color:#666;margin:0;}</style>
</head><body><div class="card"><div class="check">&#10003;</div><h2>Calendar Connected!</h2><p>You can close this window.</p></div></body></html>`);
    } catch (error: any) {
      console.error("Calendar callback error:", error);
      return res.status(500).send("Failed to connect calendar. Please try again.");
    }
  });

  app.delete("/api/google-calendar/disconnect", requireAuth, async (req: Request, res: Response) => {
    try {
      await deleteGoogleCalendarToken(req.session.userId!);
      return res.json({ message: "Disconnected" });
    } catch (error: any) {
      console.error("Calendar disconnect error:", error);
      return res.status(500).json({ message: "Failed to disconnect calendar" });
    }
  });

  app.post("/api/google-calendar/sync-job", requireAuth, async (req: Request, res: Response) => {
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

      await syncJobToGoogleCalendar(req.session.userId!, job, customerName);
      return res.json({ message: "Synced to Google Calendar" });
    } catch (error: any) {
      console.error("Calendar sync error:", error);
      return res.status(500).json({ message: "Failed to sync to calendar" });
    }
  });

  // ─── Stripe Connect ───

  app.get("/api/stripe/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      if (business.stripeAccountId && business.stripeOnboardingComplete) {
        return res.json({ connected: true, accountId: business.stripeAccountId });
      }
      return res.json({ connected: false, accountId: business.stripeAccountId || null });
    } catch (error: any) {
      console.error("Stripe status error:", error);
      return res.status(500).json({ message: "Failed to check Stripe status" });
    }
  });

  app.post("/api/stripe/connect", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!stripe) return res.status(503).json({ message: "Stripe is not configured. Please add your Stripe API keys to enable payments." });
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });

      let accountId = business.stripeAccountId;
      if (!accountId) {
        const account = await stripe.accounts.create({
          country: "US",
          email: business.email || undefined,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_profile: {
            name: business.companyName || "Cleaning Business",
          },
          metadata: { businessId: business.id },
        });
        accountId = account.id;
        await updateBusiness(business.id, { stripeAccountId: accountId });
      }

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `https://${req.get("host")}/api/stripe/connect-refresh?userId=${req.session.userId}`,
        return_url: `https://${req.get("host")}/api/stripe/connect-callback?userId=${req.session.userId}`,
        type: "account_onboarding",
      });

      return res.json({ url: accountLink.url });
    } catch (error: any) {
      console.error("Stripe connect error:", error?.message || error);
      const msg = error?.message || "";
      if (error?.type === "StripeInvalidRequestError" && (msg.includes("signed up for Connect") || msg.includes("platform profile"))) {
        return res.status(400).json({ message: "Stripe Connect setup is incomplete. Please visit dashboard.stripe.com/connect to finish platform setup, then try again." });
      }
      if (error?.type === "StripeInvalidRequestError" && msg.includes("No such account")) {
        const business = await getBusinessByOwner(req.session.userId!);
        if (business) {
          await updateBusiness(business.id, { stripeAccountId: null, stripeOnboardingComplete: false });
        }
        return res.status(400).json({ message: "Previous Stripe account was invalid. Please try connecting again." });
      }
      return res.status(500).json({ message: "Failed to connect Stripe. Please try again." });
    }
  });

  app.get("/api/stripe/connect-callback", async (req: Request, res: Response) => {
    try {
      if (!stripe) return res.status(503).send("Stripe not configured");
      const { userId } = req.query as { userId: string };
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
    } catch (error: any) {
      console.error("Stripe callback error:", error);
      return res.status(500).send("Failed to verify Stripe connection.");
    }
  });

  app.get("/api/stripe/connect-refresh", async (req: Request, res: Response) => {
    try {
      if (!stripe) return res.status(503).send("Stripe not configured");
      const { userId } = req.query as { userId: string };
      if (!userId) return res.status(400).send("Missing userId");

      const business = await getBusinessByOwner(userId);
      if (!business || !business.stripeAccountId) return res.status(400).send("No Stripe account");

      const accountLink = await stripe.accountLinks.create({
        account: business.stripeAccountId,
        refresh_url: `https://${req.get("host")}/api/stripe/connect-refresh?userId=${userId}`,
        return_url: `https://${req.get("host")}/api/stripe/connect-callback?userId=${userId}`,
        type: "account_onboarding",
      });

      return res.redirect(accountLink.url);
    } catch (error: any) {
      console.error("Stripe refresh error:", error);
      return res.status(500).send("Failed to refresh onboarding");
    }
  });

  app.delete("/api/stripe/disconnect", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      await updateBusiness(business.id, { stripeAccountId: null, stripeOnboardingComplete: false });
      return res.json({ message: "Stripe disconnected" });
    } catch (error: any) {
      console.error("Stripe disconnect error:", error);
      return res.status(500).json({ message: "Failed to disconnect Stripe" });
    }
  });

  app.post("/api/stripe/create-payment", requireAuth, async (req: Request, res: Response) => {
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

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `Cleaning Service Quote`,
              description: `${quote.frequencySelected} cleaning - ${quote.selectedOption} option`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        success_url: `https://${req.get("host")}/api/stripe/payment-success?quoteId=${quoteId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://${req.get("host")}/api/stripe/payment-cancel?quoteId=${quoteId}`,
        metadata: { quoteId, businessId: business.id },
      }, {
        stripeAccount: business.stripeAccountId,
      });

      return res.json({ url: session.url });
    } catch (error: any) {
      console.error("Create payment error:", error);
      return res.status(500).json({ message: "Failed to create payment session" });
    }
  });

  app.post("/api/public/quote/:token/pay", async (req: Request, res: Response) => {
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
              description: `${quote.frequencySelected} cleaning - ${quote.selectedOption} option`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        success_url: `https://${req.get("host")}/api/stripe/payment-success?quoteId=${quote.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://${req.get("host")}/api/stripe/payment-cancel?quoteId=${quote.id}`,
        metadata: { quoteId: quote.id, businessId: business.id },
      }, {
        stripeAccount: business.stripeAccountId,
      });

      return res.json({ url: checkoutSession.url });
    } catch (error: any) {
      console.error("Public payment error:", error);
      return res.status(500).json({ message: "Failed to create payment" });
    }
  });

  app.post("/api/public/quote/:token/pay-deposit", async (req: Request, res: Response) => {
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
              description: `Deposit for cleaning service`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        success_url: `https://${req.get("host")}/api/stripe/deposit-success?quoteId=${quote.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://${req.get("host")}/q/${quote.publicToken}`,
        metadata: { quoteId: quote.id, businessId: business.id, type: "deposit" },
      }, {
        stripeAccount: business.stripeAccountId,
      });

      return res.json({ url: checkoutSession.url });
    } catch (error: any) {
      console.error("Public deposit payment error:", error);
      return res.status(500).json({ message: "Failed to create deposit payment" });
    }
  });

  app.get("/api/stripe/deposit-success", async (req: Request, res: Response) => {
    try {
      const { quoteId, session_id } = req.query as { quoteId: string; session_id: string };
      if (!quoteId || !session_id || !stripe) {
        return res.redirect("/");
      }

      const quote = await getQuoteById(quoteId);
      if (!quote) return res.redirect("/");

      const business = await db_getBusinessById(quote.businessId);
      const stripeOpts = business?.stripeAccountId ? { stripeAccount: business.stripeAccountId } : undefined;

      const checkoutSession = await stripe.checkout.sessions.retrieve(session_id as string, stripeOpts);
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
        acceptedAt: new Date(),
        paymentIntentId: checkoutSession.payment_intent as string || undefined,
        paymentAmount: (checkoutSession.amount_total || 0) / 100,
      } as any);

      await cancelPendingCommunicationsForQuote(quoteId);

      return res.redirect(`/q/${quote.publicToken}`);
    } catch (error: any) {
      console.error("Deposit success error:", error);
      return res.redirect("/");
    }
  });

  app.get("/api/stripe/payment-success", async (req: Request, res: Response) => {
    try {
      const { quoteId, session_id } = req.query as { quoteId: string; session_id: string };
      if (quoteId) {
        await updateQuote(quoteId, {
          paymentStatus: "paid",
          paymentAmount: undefined,
          paidAt: new Date(),
          status: "accepted",
          acceptedAt: new Date(),
        });

        if (stripe && session_id) {
          try {
            const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);
            if (checkoutSession.payment_intent) {
              await updateQuote(quoteId, {
                paymentIntentId: checkoutSession.payment_intent as string,
                paymentAmount: (checkoutSession.amount_total || 0) / 100,
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
    } catch (error: any) {
      console.error("Payment success error:", error);
      return res.status(500).send("An error occurred processing your payment confirmation.");
    }
  });

  app.get("/api/stripe/payment-cancel", async (_req: Request, res: Response) => {
    return res.send(`<!DOCTYPE html>
<html><head><title>Payment Cancelled</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;}
.card{text-align:center;padding:40px;background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
.icon{font-size:48px;margin-bottom:16px;}h2{margin:0 0 8px;color:#333;}p{color:#666;margin:0;}</style>
</head><body><div class="card"><div class="icon">&#10007;</div><h2>Payment Cancelled</h2><p>No charge was made. You can close this window.</p></div></body></html>`);
  });

  app.get("/privacy", (_req: Request, res: Response) => {
    res.send(getPrivacyPolicyHTML());
  });

  app.get("/terms", (_req: Request, res: Response) => {
    res.send(getTermsOfServiceHTML());
  });

  app.get("/delete-account", (_req: Request, res: Response) => {
    res.send(getDeleteAccountHTML());
  });

  // ─── Sticky Product: Follow-Up Queue ───

  app.get("/api/followup-queue", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const queue = await getFollowUpQueueQuotes(business.id);
      return res.json(queue);
    } catch (error: any) {
      console.error("Get follow-up queue error:", error);
      return res.status(500).json({ message: "Failed to get follow-up queue" });
    }
  });

  app.post("/api/followup-touches", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { quoteId, channel, snoozedUntil } = req.body;
      if (!quoteId || !channel) {
        return res.status(400).json({ message: "quoteId and channel are required" });
      }
      const quote = await getQuoteById(quoteId);
      const touch = await createFollowUpTouch({
        businessId: business.id,
        quoteId,
        customerId: quote?.customerId || undefined,
        channel,
        snoozedUntil: snoozedUntil ? new Date(snoozedUntil) : undefined,
      });
      return res.json(touch);
    } catch (error: any) {
      console.error("Create follow-up touch error:", error);
      return res.status(500).json({ message: "Failed to create follow-up touch" });
    }
  });

  // ─── Sticky Product: Streaks ───

  app.get("/api/streaks", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const streak = await getStreakByBusiness(business.id);
      return res.json(streak || { currentStreak: 0, longestStreak: 0, lastActionDate: null });
    } catch (error: any) {
      console.error("Get streak error:", error);
      return res.status(500).json({ message: "Failed to get streak" });
    }
  });

  app.post("/api/streaks/action", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });

      const today = new Date().toISOString().split("T")[0];
      const existing = await getStreakByBusiness(business.id);

      let currentStreak = 1;
      let longestStreak = 1;

      if (existing) {
        if (existing.lastActionDate === today) {
          return res.json(existing);
        }

        const yesterday = new Date();
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
        lastActionDate: today,
      });
      return res.json(streak);
    } catch (error: any) {
      console.error("Streak action error:", error);
      return res.status(500).json({ message: "Failed to update streak" });
    }
  });

  // ─── Sticky Product: Preferences ───

  app.get("/api/preferences", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
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
        weeklyGoalTarget: null,
      });
    } catch (error: any) {
      console.error("Get preferences error:", error);
      return res.status(500).json({ message: "Failed to get preferences" });
    }
  });

  app.put("/api/preferences", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { dailyPulseEnabled, dailyPulseTime, weeklyRecapEnabled, weeklyRecapDay, quietHoursEnabled, quietHoursStart, quietHoursEnd, dormantThresholdDays, maxFollowUpsPerDay, weeklyGoal, weeklyGoalTarget } = req.body;
      const prefs = await upsertPreferences(business.id, { dailyPulseEnabled, dailyPulseTime, weeklyRecapEnabled, weeklyRecapDay, quietHoursEnabled, quietHoursStart, quietHoursEnd, dormantThresholdDays, maxFollowUpsPerDay, weeklyGoal, weeklyGoalTarget });
      return res.json(prefs);
    } catch (error: any) {
      console.error("Update preferences error:", error);
      return res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // ─── Sticky Product: Analytics ───

  app.post("/api/analytics/events", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { eventName, properties } = req.body;
      if (!eventName) {
        return res.status(400).json({ message: "eventName is required" });
      }
      const event = await createAnalyticsEvent({
        businessId: business.id,
        eventName,
        properties: properties || {},
      });
      return res.json(event);
    } catch (error: any) {
      console.error("Create analytics event error:", error);
      return res.status(500).json({ message: "Failed to create analytics event" });
    }
  });

  // ─── Quote Preferences ───

  app.get("/api/quote-preferences", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const stored = (business as any).quotePreferences;
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
        brandColor: "#2563EB",
      });
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to get quote preferences" });
    }
  });

  app.put("/api/quote-preferences", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      await updateBusiness(business.id, { quotePreferences: req.body });
      return res.json(req.body);
    } catch (error: any) {
      return res.status(500).json({ message: "Failed to update quote preferences" });
    }
  });

  // ─── Sticky Product: Badges ───

  app.get("/api/badges", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const badgeList = await getBadgesByBusiness(business.id);
      return res.json(badgeList);
    } catch (error: any) {
      console.error("Get badges error:", error);
      return res.status(500).json({ message: "Failed to get badges" });
    }
  });

  // ─── Sticky Product: Weekly Recap ───

  app.get("/api/weekly-recap", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });

      const weekOffset = parseInt(req.query.weekOffset as string) || 0;
      const now = new Date();
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek + (weekOffset * 7));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const stats = await getWeeklyRecapStats(business.id, weekStart, weekEnd);
      return res.json({ ...stats, weekStart, weekEnd });
    } catch (error: any) {
      console.error("Get weekly recap error:", error);
      return res.status(500).json({ message: "Failed to get weekly recap" });
    }
  });

  // ─── Sticky Product: Opportunities ───

  app.get("/api/opportunities/dormant", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const thresholdDays = parseInt(req.query.thresholdDays as string) || 90;
      const dormant = await getDormantCustomers(business.id, thresholdDays);
      return res.json(dormant);
    } catch (error: any) {
      console.error("Get dormant customers error:", error);
      return res.status(500).json({ message: "Failed to get dormant customers" });
    }
  });

  app.get("/api/opportunities/lost", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const daysSince = parseInt(req.query.daysSince as string) || 180;
      const lost = await getLostQuotes(business.id, daysSince);
      return res.json(lost);
    } catch (error: any) {
      console.error("Get lost quotes error:", error);
      return res.status(500).json({ message: "Failed to get lost quotes" });
    }
  });

  // ─── Sticky Product: Do Not Contact ───

  app.put("/api/customers/:id/do-not-contact", requireAuth, async (req: Request, res: Response) => {
    try {
      const customer = await getCustomerById(req.params.id);
      if (!customer) return res.status(404).json({ message: "Customer not found" });
      const updated = await updateCustomer(req.params.id, {
        smsOptOut: !customer.smsOptOut,
      });
      return res.json(updated);
    } catch (error: any) {
      console.error("Toggle do-not-contact error:", error);
      return res.status(500).json({ message: "Failed to update do-not-contact" });
    }
  });

  // ─── Growth Tasks API ───

  app.get("/api/growth-tasks", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { type, status } = req.query as any;
      const list = await getGrowthTasksByBusiness(business.id, { type, status });
      return res.json(list);
    } catch (error: any) {
      console.error("Get growth tasks error:", error);
      return res.status(500).json({ message: "Failed to get growth tasks" });
    }
  });

  app.get("/api/growth-tasks/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const task = await getGrowthTaskById(req.params.id);
      if (!task) return res.status(404).json({ message: "Growth task not found" });
      return res.json(task);
    } catch (error: any) {
      console.error("Get growth task error:", error);
      return res.status(500).json({ message: "Failed to get growth task" });
    }
  });

  app.post("/api/growth-tasks", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { type, customerId, quoteId, jobId, channel, dueAt, priority, escalationStage, message, estimatedValue, metadata } = req.body;
      const task = await createGrowthTask({
        businessId: business.id,
        type,
        customerId,
        quoteId,
        jobId,
        channel,
        dueAt: dueAt ? new Date(dueAt) : undefined,
        priority,
        escalationStage,
        message,
        estimatedValue,
        metadata,
      });
      return res.json(task);
    } catch (error: any) {
      console.error("Create growth task error:", error);
      return res.status(500).json({ message: "Failed to create growth task" });
    }
  });

  app.put("/api/growth-tasks/:id", requireAuth, async (req: Request, res: Response) => {
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
        snoozedUntil: snoozedUntil ? new Date(snoozedUntil) : undefined,
        completedAt: completedAt ? new Date(completedAt) : undefined,
        lastActionAt: lastActionAt ? new Date(lastActionAt) : undefined,
      });
      return res.json(updated);
    } catch (error: any) {
      console.error("Update growth task error:", error);
      return res.status(500).json({ message: "Failed to update growth task" });
    }
  });

  app.delete("/api/growth-tasks/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const existing = await getGrowthTaskById(req.params.id);
      if (!existing) return res.status(404).json({ message: "Growth task not found" });
      await deleteGrowthTask(req.params.id);
      return res.json({ message: "Deleted" });
    } catch (error: any) {
      console.error("Delete growth task error:", error);
      return res.status(500).json({ message: "Failed to delete growth task" });
    }
  });

  app.post("/api/growth-tasks/:id/action", requireAuth, async (req: Request, res: Response) => {
    try {
      const task = await getGrowthTaskById(req.params.id);
      if (!task) return res.status(404).json({ message: "Growth task not found" });
      const { action, channel } = req.body;
      await createGrowthTaskEvent({ taskId: task.id, action, channel });
      const updateData: any = { lastActionAt: new Date() };
      if (action === "completed") {
        updateData.status = "completed";
        updateData.completedAt = new Date();
      }
      const updated = await updateGrowthTask(task.id, updateData);
      return res.json(updated);
    } catch (error: any) {
      console.error("Record growth task action error:", error);
      return res.status(500).json({ message: "Failed to record action" });
    }
  });

  app.post("/api/growth-tasks/:id/snooze", requireAuth, async (req: Request, res: Response) => {
    try {
      const task = await getGrowthTaskById(req.params.id);
      if (!task) return res.status(404).json({ message: "Growth task not found" });
      const { hours } = req.body;
      const snoozedUntil = new Date();
      snoozedUntil.setHours(snoozedUntil.getHours() + (hours || 1));
      const updated = await updateGrowthTask(task.id, { status: "snoozed", snoozedUntil });
      return res.json(updated);
    } catch (error: any) {
      console.error("Snooze growth task error:", error);
      return res.status(500).json({ message: "Failed to snooze task" });
    }
  });

  // ─── Review Requests API ───

  app.get("/api/review-requests", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const list = await getReviewRequestsByBusiness(business.id);
      return res.json(list);
    } catch (error: any) {
      console.error("Get review requests error:", error);
      return res.status(500).json({ message: "Failed to get review requests" });
    }
  });

  app.post("/api/review-requests", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { customerId, jobId } = req.body;
      const request = await createReviewRequest({ businessId: business.id, customerId, jobId });
      return res.json(request);
    } catch (error: any) {
      console.error("Create review request error:", error);
      return res.status(500).json({ message: "Failed to create review request" });
    }
  });

  app.put("/api/review-requests/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { rating, feedbackText, reviewClicked, referralSent } = req.body;
      const updateData: any = {};
      if (rating !== undefined) updateData.rating = rating;
      if (feedbackText !== undefined) updateData.feedbackText = feedbackText;
      if (reviewClicked) {
        updateData.reviewClicked = true;
        updateData.reviewClickedAt = new Date();
      }
      if (referralSent) {
        updateData.referralSent = true;
        updateData.referralSentAt = new Date();
      }
      const updated = await updateReviewRequest(req.params.id, updateData);
      return res.json(updated);
    } catch (error: any) {
      console.error("Update review request error:", error);
      return res.status(500).json({ message: "Failed to update review request" });
    }
  });

  // ─── Customer Marketing Prefs API ───

  app.get("/api/customers/:id/marketing-prefs", requireAuth, async (req: Request, res: Response) => {
    try {
      const prefs = await getMarketingPrefsByCustomer(req.params.id);
      return res.json(prefs || null);
    } catch (error: any) {
      console.error("Get marketing prefs error:", error);
      return res.status(500).json({ message: "Failed to get marketing prefs" });
    }
  });

  app.put("/api/customers/:id/marketing-prefs", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { doNotContact, preferredChannel, reviewRequestCooldownDays } = req.body;
      const prefs = await upsertMarketingPrefs(business.id, req.params.id, { doNotContact, preferredChannel, reviewRequestCooldownDays });
      return res.json(prefs);
    } catch (error: any) {
      console.error("Update marketing prefs error:", error);
      return res.status(500).json({ message: "Failed to update marketing prefs" });
    }
  });

  // ─── Growth Automation Settings API ───

  app.get("/api/growth-automation-settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const settings = await getGrowthAutomationSettings(business.id);
      return res.json(settings || null);
    } catch (error: any) {
      console.error("Get growth automation settings error:", error);
      return res.status(500).json({ message: "Failed to get growth automation settings" });
    }
  });

  app.put("/api/growth-automation-settings", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const existing = await getGrowthAutomationSettings(business.id);
      const wasMarketingModeEnabled = existing?.marketingModeEnabled || false;
      const { marketingModeEnabled, abandonedQuoteRecovery, weeklyReactivation, reviewRequestWorkflow, referralAskWorkflow, rebookNudges, upsellTriggers, quietHoursStart, quietHoursEnd, maxSendsPerDay, maxFollowUpsPerQuote, rebookNudgeDaysMin, rebookNudgeDaysMax, deepCleanIntervalMonths, googleReviewLink, includeReviewOnPdf, includeReviewInMessages, askReviewAfterComplete, referralOfferAmount, referralBookingLink, connectedSendingEnabled } = req.body;
      const settings = await upsertGrowthAutomationSettings(business.id, { marketingModeEnabled, abandonedQuoteRecovery, weeklyReactivation, reviewRequestWorkflow, referralAskWorkflow, rebookNudges, upsellTriggers, quietHoursStart, quietHoursEnd, maxSendsPerDay, maxFollowUpsPerQuote, rebookNudgeDaysMin, rebookNudgeDaysMax, deepCleanIntervalMonths, googleReviewLink, includeReviewOnPdf, includeReviewInMessages, askReviewAfterComplete, referralOfferAmount, referralBookingLink, connectedSendingEnabled });
      if (req.body.marketingModeEnabled === true && !wasMarketingModeEnabled) {
        console.log(`[Growth] Marketing mode enabled for business ${business.id} - batch default growth tasks creation pending`);
      }
      return res.json(settings);
    } catch (error: any) {
      console.error("Update growth automation settings error:", error);
      return res.status(500).json({ message: "Failed to update growth automation settings" });
    }
  });

  // ─── Sales Strategy API ───

  app.get("/api/sales-strategy", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const strategy = await getSalesStrategy(business.id);
      return res.json(strategy || null);
    } catch (error: any) {
      console.error("Get sales strategy error:", error);
      return res.status(500).json({ message: "Failed to get sales strategy" });
    }
  });

  app.put("/api/sales-strategy", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { selectedProfile, escalationEnabled } = req.body;
      const strategy = await upsertSalesStrategy(business.id, { selectedProfile, escalationEnabled });
      return res.json(strategy);
    } catch (error: any) {
      console.error("Update sales strategy error:", error);
      return res.status(500).json({ message: "Failed to update sales strategy" });
    }
  });

  // ─── Campaigns API ───

  app.get("/api/campaigns", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const list = await getCampaignsByBusiness(business.id);
      return res.json(list);
    } catch (error: any) {
      console.error("Get campaigns error:", error);
      return res.status(500).json({ message: "Failed to get campaigns" });
    }
  });

  app.post("/api/campaigns", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const { name, segment, channel, templateKey, customerIds, messageContent, messageSubject } = req.body;
      const campaign = await createCampaign({ businessId: business.id, name, segment, channel, templateKey, customerIds: customerIds || null, messageContent: messageContent || null, messageSubject: messageSubject || null });
      return res.json(campaign);
    } catch (error: any) {
      console.error("Create campaign error:", error);
      return res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  app.put("/api/campaigns/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const existing = await getCampaignById(req.params.id);
      if (!existing) return res.status(404).json({ message: "Campaign not found" });
      const { name, status, completedCount, customerIds, messageContent, messageSubject } = req.body;
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (status !== undefined) updateData.status = status;
      if (completedCount !== undefined) updateData.completedCount = completedCount;
      if (customerIds !== undefined) updateData.customerIds = customerIds;
      if (messageContent !== undefined) updateData.messageContent = messageContent;
      if (messageSubject !== undefined) updateData.messageSubject = messageSubject;
      const updated = await updateCampaign(req.params.id, updateData);
      return res.json(updated);
    } catch (error: any) {
      console.error("Update campaign error:", error);
      return res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  app.post("/api/campaigns/:id/send", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });

      const campaign = await getCampaignById(req.params.id);
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
      if (!campaign.messageContent) return res.status(400).json({ message: "Campaign has no message content. Generate a message first." });

      let targetCustomers: any[] = [];

      if (Array.isArray(campaign.customerIds) && campaign.customerIds.length > 0) {
        for (const cid of campaign.customerIds as string[]) {
          const c = await getCustomerById(cid);
          if (c) targetCustomers.push(c);
        }
      } else if (campaign.segment === "dormant") {
        targetCustomers = await getDormantCustomers(business.id, 90);
      } else if (campaign.segment === "lost") {
        const lostQuotes = await getLostQuotes(business.id, 180);
        const seen = new Set<string>();
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
      const errors: string[] = [];

      if (isEmail) {
        const sgApiKey = process.env.SENDGRID_API_KEY;
        if (!sgApiKey) return res.status(503).json({ message: "Email service not configured. Please connect SendGrid in settings." });

        const brandedFromEmail = process.env.SENDGRID_FROM_EMAIL || "quotes@myreminder.ai";
        const fromName = business.companyName || "QuotePro";
        const replyToEmail = business.email || undefined;
        if (!replyToEmail) return res.status(400).json({ message: "Please add your email address in Settings before sending emails." });

        for (const customer of targetCustomers) {
          const email = customer.email;
          if (!email) { failCount++; continue; }

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
          ${personalizedContent.split('\n').map((line: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333333;">${line}</p>`).join('')}
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
            const emailPayload: any = {
              personalizations: [{ to: [{ email }] }],
              from: { email: brandedFromEmail, name: fromName },
              subject: personalizedSubject,
              content: [
                { type: "text/plain", value: personalizedContent },
                { type: "text/html", value: htmlBody },
              ],
            };
            if (replyToEmail) emailPayload.reply_to = { email: replyToEmail, name: fromName };

            const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
              method: "POST",
              headers: { "Authorization": `Bearer ${sgApiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify(emailPayload),
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
    } catch (error: any) {
      console.error("Send campaign error:", error);
      return res.status(500).json({ message: "Failed to send campaign" });
    }
  });

  // ─── Utility APIs ───

  app.get("/api/upsell-opportunities", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const opportunities = await getUpsellOpportunities(business.id);
      return res.json(opportunities);
    } catch (error: any) {
      console.error("Get upsell opportunities error:", error);
      return res.status(500).json({ message: "Failed to get upsell opportunities" });
    }
  });

  app.get("/api/rebook-candidates", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const minDays = parseInt(req.query.minDays as string) || 21;
      const maxDays = parseInt(req.query.maxDays as string) || 35;
      const candidates = await getAutoRebookCandidates(business.id, minDays, maxDays);
      return res.json(candidates);
    } catch (error: any) {
      console.error("Get rebook candidates error:", error);
      return res.status(500).json({ message: "Failed to get rebook candidates" });
    }
  });

  app.get("/api/forecast", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });
      const forecast = await getForecastData(business.id);
      return res.json(forecast);
    } catch (error: any) {
      console.error("Get forecast error:", error);
      return res.status(500).json({ message: "Failed to get forecast data" });
    }
  });

  // ─── Revenue Playbook - Sales Recommendations ───

  app.get("/api/quotes/:id/recommendations", requireAuth, async (req: Request, res: Response) => {
    try {
      const recommendations = await getRecommendationsByQuote(req.params.id);
      return res.json(recommendations);
    } catch (error: any) {
      console.error("Get recommendations error:", error);
      return res.status(500).json({ message: "Failed to get recommendations" });
    }
  });

  app.patch("/api/recommendations/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const updateData: any = { status };
      if (status === "completed") updateData.completedAt = new Date();
      const rec = await updateRecommendation(req.params.id, updateData);
      if (!rec) return res.status(404).json({ message: "Recommendation not found" });
      return res.json(rec);
    } catch (error: any) {
      console.error("Update recommendation error:", error);
      return res.status(500).json({ message: "Failed to update recommendation" });
    }
  });

  // ─── AI Message Generation ───

  app.post("/api/ai/generate-campaign-content", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });

      const { campaignName, segment, customPrompt, useAI } = req.body;

      const businessName = business.companyName || "our cleaning company";
      const ownerName = business.senderName || business.companyName || "Your cleaning team";
      const signOff = ownerName;

      const instantTemplates: Record<string, { subject: string; content: string }> = {
        "Holiday Deep Clean": {
          subject: `Holiday Deep Clean - ${businessName}`,
          content: `Hi [Customer],\n\nThe holidays are almost here! Let ${businessName} get your home guest-ready with a thorough deep clean.\n\nWe'll tackle kitchens, bathrooms, and living spaces so every room sparkles for your gatherings.\n\nReply to book and we'll schedule at your convenience.\n\nBest regards,\n${signOff}`,
        },
        "Spring Cleaning Special": {
          subject: `Spring Cleaning Special - ${businessName}`,
          content: `Hi [Customer],\n\nSpring is here! Time to refresh your home after winter with a deep clean from ${businessName}.\n\nWe'll dust, scrub, and polish every corner so your space feels brand new for the warmer months.\n\nReply to book your spring cleaning today.\n\nBest regards,\n${signOff}`,
        },
        "New Year Fresh Start": {
          subject: `Start the New Year Fresh - ${businessName}`,
          content: `Hi [Customer],\n\nHappy New Year! Start fresh with a spotless home from ${businessName}.\n\nA clean home sets the tone for a great year ahead. Let us handle the deep clean so you can focus on your goals.\n\nReply to book and kick off the year right.\n\nBest regards,\n${signOff}`,
        },
        "Back to School Clean": {
          subject: `Back to School Clean - ${businessName}`,
          content: `Hi [Customer],\n\nSchool is starting! Get your home refreshed after a busy summer with ${businessName}.\n\nWe'll deep clean every room so your family can settle into a clean, organized routine.\n\nReply to book your back-to-school cleaning.\n\nBest regards,\n${signOff}`,
        },
        "Win Back Lost Leads": {
          subject: `We'd Love to Hear from You - ${businessName}`,
          content: `Hi [Customer],\n\nIt's been a while since we connected. We'd love the chance to earn your business at ${businessName}.\n\nWhether your needs have changed or you're ready for a fresh quote, we're here to help.\n\nReply to this email and we'll get you taken care of.\n\nBest regards,\n${signOff}`,
        },
        "VIP Customer Appreciation": {
          subject: `Thank You from ${businessName}`,
          content: `Hi [Customer],\n\nThank you for being a valued customer of ${businessName}. We truly appreciate your continued trust.\n\nAs a loyal client, we'd love to offer you priority booking for your next cleaning.\n\nReply to book and we'll schedule you at your preferred time.\n\nWarm regards,\n${signOff}`,
        },
      };

      if (!useAI && !customPrompt?.trim() && instantTemplates[campaignName]) {
        const template = instantTemplates[campaignName];
        return res.json({ content: template.content, subject: template.subject, channel: "email" });
      }

      const targetDesc = segment === "dormant" ? "past customers who haven't booked in a while" : segment === "lost" ? "leads whose quotes expired" : "customers";
      const customInstruction = customPrompt?.trim() ? ` Focus: ${customPrompt.trim()}.` : "";
      
      const systemPrompt = `Write a short marketing email for "${businessName}" (${ownerName}) to ${targetDesc}. Theme: "${campaignName}".${customInstruction} Rules: first line "Subject: ..." then blank line then body under 60 words in 3 short paragraphs. Use [Customer] as name. Sign off as ${signOff}. No links, no emojis. End with "Reply to book".`;

      const completion = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Write the email." },
        ],
      });

      const raw = completion.choices[0]?.message?.content?.trim() || "";
      
      if (!raw) {
        const fallback = instantTemplates[campaignName] || { content: `Hi [Customer],\n\nWe wanted to reach out from ${businessName} about our ${campaignName} offer.\n\nWe'd love to serve you${segment === "dormant" ? " again" : ""}. Reply to schedule your next cleaning.\n\nBest regards,\n${signOff}`, subject: campaignName };
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
    } catch (error: any) {
      console.error("AI generate campaign content error:", error?.message || error, error?.code, error?.status);
      return res.status(500).json({ message: "Failed to generate campaign content" });
    }
  });

  app.post("/api/ai/generate-review-email", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });

      const businessName = business.companyName || "our cleaning company";
      const ownerName = business.senderName || "";

      const growthSettings = await getGrowthAutomationSettings(business.id);
      const googleReviewLink = growthSettings?.googleReviewLink?.trim() || "";

      const linkInstruction = googleReviewLink
        ? `Include this Google review link in the email naturally: ${googleReviewLink} — encourage them to click it to leave a review.`
        : `No links/URLs. Ask them to reply with their feedback or leave a review.`;

      const systemPrompt = `Write a short, warm email from "${businessName}"${ownerName ? ` (${ownerName})` : ""} asking a customer for a review of their cleaning service. Format: first line "Subject: ...", blank line, then body under 100 words. Use [Customer] for their name. No placeholders for company/owner - use real names. ${linkInstruction} No emojis. Keep it personal and genuine.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate a review request email." },
        ],
        max_completion_tokens: 250,
      });

      const raw = completion.choices[0]?.message?.content?.trim() || "";
      let subject = "";
      let content = raw;
      if (raw.startsWith("Subject:")) {
        const lines = raw.split("\n");
        subject = lines[0].replace("Subject:", "").trim();
        content = lines.slice(1).join("\n").trim();
      }

      const fallbackLink = googleReviewLink ? `\n\nLeave us a review here: ${googleReviewLink}` : "";
      if (!content) {
        return res.json({
          content: `Dear [Customer],\n\nThank you for choosing ${businessName}. We hope you were happy with our service.\n\nWould you take a moment to share your experience? Your feedback helps us improve and means a lot to our team.${fallbackLink}\n\nWe appreciate your time!\n\nBest regards,\n${ownerName || businessName}`,
          subject: "We would love your feedback",
          channel: "email",
        });
      }

      return res.json({ content, subject, channel: "email" });
    } catch (error: any) {
      console.error("AI generate review email error:", error?.message || error);
      const business = await getBusinessByOwner(req.session.userId!).catch(() => null);
      const businessName = business?.companyName || "our cleaning company";
      const ownerName = business?.senderName || businessName;
      let fallbackLink = "";
      try {
        if (business) {
          const gs = await getGrowthAutomationSettings(business.id);
          if (gs?.googleReviewLink?.trim()) fallbackLink = `\n\nLeave us a review here: ${gs.googleReviewLink.trim()}`;
        }
      } catch {}
      return res.json({
        content: `Dear [Customer],\n\nThank you for choosing ${businessName}. We hope you were happy with our service.\n\nWould you take a moment to share your experience? Your feedback helps us improve and means a lot to our team.${fallbackLink}\n\nWe appreciate your time!\n\nBest regards,\n${ownerName}`,
        subject: "We would love your feedback",
        channel: "email",
      });
    }
  });

  app.post("/api/ai/generate-message", requireAuth, async (req: Request, res: Response) => {
    try {
      const { messageType, customerContext, strategyProfile, escalationStage, channel, language: commLang } = req.body;
      const msgChannel = channel || "sms";
      const profile = strategyProfile || "warm";
      const stage = escalationStage || 1;

      const toneMap: Record<string, string> = {
        warm: "warm",
        direct: "direct",
        premium: "premium",
        urgent: "urgent",
      };
      const tone = toneMap[profile] || "warm";

      const lengthInstruction = msgChannel === "sms"
        ? "Keep under 240 characters."
        : "Keep under 120 words.";

      const langInstruction = commLang === "es" ? " Write entirely in Spanish." : " Write entirely in English.";
      const systemPrompt = `You are a professional message writer for a residential cleaning business. Generate a ${msgChannel} message. Strategy: ${profile}. Escalation stage: ${stage} of 4. Message type: ${messageType}. Keep it ${tone} based on profile. ${lengthInstruction} Never be rude. Use the customer's first name.${langInstruction}`;

      const userPrompt = `Customer first name: ${customerContext?.firstName || "there"}. ${customerContext?.quoteTotal ? `Quote total: $${customerContext.quoteTotal}.` : ""} ${customerContext?.serviceType ? `Service type: ${customerContext.serviceType}.` : ""} ${customerContext?.lastServiceDate ? `Last service date: ${customerContext.lastServiceDate}.` : ""} ${customerContext?.homeSize ? `Home size: ${customerContext.homeSize}.` : ""}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const generatedMessage = completion.choices[0]?.message?.content?.trim() || "";
      return res.json({ message: generatedMessage, channel: msgChannel });
    } catch (error: any) {
      console.error("AI generate message error:", error);
      return res.status(500).json({ message: "Failed to generate message" });
    }
  });

  // ─── Public Rating API ───

  app.post("/api/public/rate/:token", async (req: Request, res: Response) => {
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
    } catch (error: any) {
      console.error("Public rate error:", error);
      return res.status(500).json({ message: "Failed to submit rating" });
    }
  });

  // ─── Public Rating Page ───

  app.get("/rate/:token", async (req: Request, res: Response) => {
    try {
      const job = await getJobByRatingToken(req.params.token);
      if (!job) {
        return res.status(404).send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Not Found</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}.card{background:#fff;border-radius:16px;padding:48px 32px;text-align:center;max-width:420px;width:100%;box-shadow:0 1px 3px rgba(0,0,0,0.08)}.icon{width:48px;height:48px;margin:0 auto 16px}h1{font-size:22px;font-weight:700;color:#1E293B;margin-bottom:8px}p{font-size:15px;color:#64748B;line-height:1.5}</style></head><body><div class="card"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><h1>Not Found</h1><p>This rating link is invalid or has been removed.</p></div></body></html>`);
      }

      const business = await db_getBusinessById(job.businessId);
      const brandColor = business?.primaryColor || "#2563EB";
      const companyName = business?.companyName || "Our Company";
      const logoUri = business?.logoUri || "";
      const alreadyRated = job.satisfactionRating !== null && job.satisfactionRating !== undefined;

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
${job.ratingComment ? `<p style="margin-top:12px;font-style:italic">"${job.ratingComment.replace(/</g, '&lt;').replace(/>/g, '&gt;')}"</p>` : ''}
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
var alreadyRated = ${alreadyRated ? 'true' : 'false'};
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
    } catch (error: any) {
      console.error("Rating page error:", error);
      return res.status(500).send("Something went wrong");
    }
  });

  // ─── Public Quote Pages ───

  app.get("/q/:token", async (req: Request, res: Response) => {
    try {
      const q = await getQuoteByToken(req.params.token);
      if (!q) {
        return res.status(404).send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Quote Not Found</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',system-ui,sans-serif;background:#F8FAFC;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}.card{background:#fff;border-radius:16px;padding:48px 32px;text-align:center;max-width:420px;width:100%;box-shadow:0 4px 12px rgba(0,0,0,0.08)}.icon{font-size:48px;margin-bottom:16px}h1{font-size:22px;font-weight:700;color:#0F172A;margin-bottom:8px}p{font-size:15px;color:#64748B;line-height:1.5}</style></head><body><div class="card"><div class="icon">&#128269;</div><h1>Quote Not Found</h1><p>This quote link is invalid or has been removed. Please contact the business for a new quote.</p></div></body></html>`);
      }

      const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

      const business = await db_getBusinessById(q.businessId);
      const customer = q.customerId ? await getCustomerById(q.customerId) : null;
      const lineItems = await getLineItemsByQuote(q.id);
      const qpPublic = (business as any)?.quotePreferences;
      const brandColor = (qpPublic?.brandColor || business?.primaryColor || "#2563EB").replace(/[^#a-fA-F0-9]/g, "");
      const companyName = escHtml(business?.companyName || "Our Company");
      const logoUri = escHtml(business?.logoUri || "");

      try {
        if (!q.viewedAt) {
          await updateQuote(q.id, { viewedAt: new Date() } as any);
          const existingFollowUps = await getFollowUpsByQuote(q.id);
          const hasPendingFollowUp = existingFollowUps.some((f: any) => f.status === "scheduled");
          if (!hasPendingFollowUp && q.status !== "accepted" && q.status !== "declined") {
            const followUpDelay = 24 * 60 * 60 * 1000;
            const scheduledFor = new Date(Date.now() + followUpDelay);
            await createFollowUp({
              quoteId: q.id,
              businessId: q.businessId,
              scheduledFor,
              channel: "sms",
              message: "",
              status: "scheduled",
            });
          }
        }
      } catch (_e) {}

      if (q.expiresAt && new Date(q.expiresAt) < new Date()) {
        return res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Quote Expired</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',system-ui,sans-serif;background:#F8FAFC;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}.card{background:#fff;border-radius:16px;padding:48px 32px;text-align:center;max-width:420px;width:100%;box-shadow:0 4px 12px rgba(0,0,0,0.08)}.icon{width:72px;height:72px;border-radius:50%;background:#FEF3C7;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px}h1{font-size:22px;font-weight:800;color:#0F172A;margin-bottom:8px}p{font-size:15px;color:#64748B;line-height:1.5}.brand{color:${brandColor};font-weight:600}</style></head><body><div class="card"><div class="icon">&#9203;</div><h1>Quote Expired</h1><p>This quote from <span class="brand">${companyName}</span> has expired. Please contact us for an updated quote.</p>${business?.phone ? `<p style="margin-top:16px"><a href="tel:${business.phone}" style="color:${brandColor};text-decoration:none;font-weight:600">${business.phone}</a></p>` : ""}</div></body></html>`);
      }

      if (q.status === "accepted") {
        const acceptedDate = q.acceptedAt ? new Date(q.acceptedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";
        return res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Quote Accepted</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',system-ui,sans-serif;background:#F8FAFC;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}.card{background:#fff;border-radius:16px;padding:48px 32px;text-align:center;max-width:420px;width:100%;box-shadow:0 4px 12px rgba(0,0,0,0.08)}.icon{width:72px;height:72px;border-radius:50%;background:#DCFCE7;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px;color:#16A34A}h1{font-size:22px;font-weight:800;color:#0F172A;margin-bottom:8px}p{font-size:15px;color:#64748B;line-height:1.5}.brand{color:${brandColor};font-weight:600}.total{font-size:32px;font-weight:800;color:#16A34A;margin:16px 0;letter-spacing:-1px}</style></head><body><div class="card"><div class="icon">&#10003;</div><h1>You're All Set!</h1><p>You accepted this quote from <span class="brand">${companyName}</span>${acceptedDate ? ` on ${acceptedDate}` : ""}.</p><div class="total">$${Number(q.total).toFixed(2)}</div><p>We'll be in touch to confirm your appointment.</p>${business?.phone ? `<p style="margin-top:16px"><a href="tel:${business.phone}" style="color:${brandColor};text-decoration:none;font-weight:600">${business.phone}</a></p>` : ""}</div></body></html>`);
      }

      const opts = (q.options || {}) as any;
      const addOns = (q.addOns || {}) as any;
      const details = (q.propertyDetails || {}) as any;
      const customerName = escHtml(customer ? `${customer.firstName} ${customer.lastName}`.trim() : "");
      const customerAddress = escHtml(customer?.address || details?.address || "");
      const rawOption = (req.query.option as string) || q.selectedOption || q.recommendedOption || "";
      const preselectedOption = ["good", "better", "best", ""].includes(rawOption) ? rawOption : "";

      const oneTimeAddOnKeys = ["insideFridge", "insideOven", "insideCabinets", "interiorWindows", "blindsDetail", "baseboardsDetail", "laundryFoldOnly", "dishes", "organizationTidy"];
      const builtInServiceTypes = ["deep-clean", "move-in-out", "post-construction"];
      const isRecurring = q.frequencySelected && q.frequencySelected !== "one-time";
      const hasOneTimeAddOns = oneTimeAddOnKeys.some(k => {
        const v = addOns[k];
        return v && (typeof v === "object" ? v.selected : v);
      });

      let oneTimeAddOnTotal = 0;
      let pricingSettings: any = null;
      try { pricingSettings = await getPricingByBusiness(q.businessId); } catch (_e) {}
      const addOnPrices = pricingSettings?.addOnPrices || {};
      if (isRecurring && hasOneTimeAddOns) {
        for (const k of oneTimeAddOnKeys) {
          const v = addOns[k];
          const isEnabled = v && (typeof v === "object" ? v.selected : v);
          if (isEnabled) {
            const addonPrice = typeof v === "object" && v.price ? Number(v.price) : (addOnPrices[k] ? Number(addOnPrices[k]) : 0);
            oneTimeAddOnTotal += addonPrice;
          }
        }
      }

      const optionLabels: Record<string, string> = { good: "Good", better: "Better", best: "Best" };
      const optionDescriptions: Record<string, string> = {
        good: "Essential cleaning for a tidy home",
        better: "Thorough cleaning with extra attention to detail",
        best: "Premium deep clean with all the extras"
      };

      const optionDataItems: { key: string; price: number; name: string; scope: string; recurringPrice: number | null }[] = [];
      let optionsHtml = "";
      for (const key of ["good", "better", "best"]) {
        const optVal = opts[key];
        if (optVal === undefined) continue;
        const price = typeof optVal === "object" ? optVal.price : optVal;
        if (price === undefined) continue;
        const name = escHtml((typeof optVal === "object" && optVal.name) ? optVal.name : (optionLabels[key] || key));
        const scope = escHtml((typeof optVal === "object" && optVal.scope) ? optVal.scope : (optionDescriptions[key] || ""));
        const serviceTypeId = (typeof optVal === "object" && optVal.serviceTypeId) ? optVal.serviceTypeId : "";
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

      const addonDataItems: { key: string; name: string; price: number; selected: boolean }[] = [];
      let addOnsHtml = "";
      const allAddonKeys = Object.keys(addOns);
      if (allAddonKeys.length > 0) {
        for (const key of allAddonKeys) {
          const v = addOns[key];
          if (!v) continue;
          const isEnabled = typeof v === "object" ? v.selected : v;
          const price = typeof v === "object" && v.price ? Number(v.price) : (addOnPrices[key] ? Number(addOnPrices[key]) : 0);
          const label = escHtml(key.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase()).replace(/_/g, " "));
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

      const propertyPills: string[] = [];
      if (q.propertyBeds) propertyPills.push(`${q.propertyBeds} Bed`);
      if (q.propertyBaths) propertyPills.push(`${q.propertyBaths} Bath`);
      if (q.propertySqft) propertyPills.push(`${q.propertySqft.toLocaleString()} sq ft`);
      if (customerAddress) propertyPills.push(customerAddress);

      const firstName = customerName ? customerName.split(" ")[0] : "";
      const greeting = firstName ? `Hi ${firstName},` : "Your Cleaning Quote";
      const subtitleText = firstName ? "Here's your personalized quote. Review your options and accept when ready." : "Review the details below and accept when ready.";

      const freqLabels: Record<string, string> = { weekly: "Weekly", biweekly: "Bi-weekly", monthly: "Monthly", quarterly: "Quarterly" };
      const frequencyLabel = q.frequencySelected && q.frequencySelected !== "one-time" ? (freqLabels[q.frequencySelected] || q.frequencySelected) : "";

      const freqOptions = ["one-time", "weekly", "biweekly", "monthly", "quarterly"];
      const freqOptionLabels: Record<string, string> = { "one-time": "One-time", weekly: "Weekly", biweekly: "Bi-weekly", monthly: "Monthly", quarterly: "Quarterly" };
      let frequencyOptionsHtml = "";
      for (const f of freqOptions) {
        const selected = q.frequencySelected === f || (!q.frequencySelected && f === "one-time") ? " selected" : "";
        frequencyOptionsHtml += `<option value="${f}"${selected}>${freqOptionLabels[f]}</option>`;
      }

      const depositRequired = q.depositRequired || false;
      const depositAmount = Number(q.depositAmount) || 0;
      const totalNum = Number(q.total) || 0;
      const depositFormatted = depositAmount.toFixed(2);
      const balanceFormatted = Math.max(0, totalNum - depositAmount).toFixed(2);

      const expiresAtMs = q.expiresAt ? new Date(q.expiresAt).getTime() : 0;
      const hasExpiry = !!q.expiresAt;
      const expiryText = q.expiresAt ? `Valid until ${new Date(q.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : "";
      const expiryUrgentClass = q.expiresAt && (new Date(q.expiresAt).getTime() - Date.now()) < 172800000 ? "urgent" : "";

      let reviewsData: any[] = [];
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
          avgRating = Math.round((reviewsData.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewsData.length) * 10) / 10;
        }
      } catch (_e) {}

      let testimonialsHtml = "";
      for (const r of reviewsData) {
        const authorName = escHtml(r.firstName ? `${r.firstName}` : "Customer");
        const stars = "&#9733;".repeat(r.rating);
        const safeText = escHtml(r.feedbackText || "");
        testimonialsHtml += `<div class="testimonial-card"><div style="color:#F59E0B;font-size:14px;margin-bottom:4px">${stars}</div><div class="testimonial-text">"${safeText}"</div><div class="testimonial-author">&mdash; ${authorName}</div></div>`;
      }

      const trustStarsHtml = Array(5).fill(0).map((_, i) => `<svg class="trust-star" viewBox="0 0 20 20"${i < Math.round(avgRating) ? '' : ' style="fill:#E2E8F0"'}><path d="M10 1l2.39 4.84L17.5 6.7l-3.75 3.66.89 5.14L10 13.09l-4.64 2.41.89-5.14L2.5 6.7l5.11-.86z"/></svg>`).join("");

      let trustBadgesHtml = "";
      if (business?.phone || business?.email) {
        trustBadgesHtml += `<span class="trust-badge-item"><svg viewBox="0 0 20 20"><path d="M10 1a9 9 0 100 18 9 9 0 000-18zm1 13H9v-2h2v2zm0-4H9V5h2v5z"/></svg>Licensed &amp; Insured</span>`;
      }

      const trustNote = "";
      const hasTrust = reviewsData.length > 0 || trustBadgesHtml.length > 0;
      const acceptButtonText = depositRequired && depositAmount > 0 ? "Accept &amp; Pay Deposit" : "Accept Quote";
      const acceptModalTitle = depositRequired && depositAmount > 0 ? "Accept & Pay Deposit" : "Accept Quote";
      const todayDate = new Date().toISOString().split("T")[0];

      const fs = await import("fs");
      const path = await import("path");
      let template = fs.readFileSync(path.join(process.cwd(), "server/templates/instant-quote.html"), "utf-8");

      const replacements: Record<string, string> = {
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
      };

      for (const [key, val] of Object.entries(replacements)) {
        template = template.split(key).join(val);
      }

      const conditionalSections: Record<string, boolean> = {
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
        "trustNote": !!trustNote,
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
        const pillsHtml = propertyPills.map(p => `<span class="property-pill">${p}</span>`).join("");
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
    } catch (error: any) {
      console.error("Public quote page error:", error);
      return res.status(500).send(`<!DOCTYPE html><html><head><title>Error</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"><style>body{font-family:'Inter',system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F8FAFC}.card{text-align:center;padding:48px 32px;background:#fff;border-radius:16px;box-shadow:0 4px 12px rgba(0,0,0,0.08);max-width:420px}h1{font-size:22px;font-weight:800;color:#0F172A;margin-bottom:8px}p{font-size:15px;color:#64748B;line-height:1.5}</style></head><body><div class="card"><h1>Something went wrong</h1><p>Please try again or contact the business directly.</p></div></body></html>`);
    }
  });

  app.post("/q/:token/accept", async (req: Request, res: Response) => {
    try {
      const q = await getQuoteByToken(req.params.token);
      if (!q) return res.status(404).json({ success: false, message: "Quote not found" });

      if (q.expiresAt && new Date(q.expiresAt) < new Date()) {
        return res.status(400).json({ success: false, message: "This quote has expired" });
      }

      // Idempotency: if already accepted, return success
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

      const existingDetails = (q.propertyDetails || {}) as any;
      const updatedDetails = {
        ...existingDetails,
        acceptanceSignature: acceptedName.trim(),
        acceptedVia: "web",
        acceptedIp: req.ip || req.headers["x-forwarded-for"] || "unknown",
      };

      const updateData: any = {
        status: "accepted",
        acceptedAt: new Date(),
        propertyDetails: updatedDetails,
        acceptedSource: "email_link",
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
        const opts = (q.options || {}) as any;
        const optVal = opts[selectedOption];
        if (optVal !== undefined) {
          const price = typeof optVal === "object" ? optVal.price : optVal;
          if (price !== undefined) {
            updateData.total = Number(price);
          }
        }
      }

      if (selectedAddons && typeof selectedAddons === "object") {
        const existingAddOns = (q.addOns || {}) as any;
        const validatedAddOns: any = {};
        for (const [key, val] of Object.entries(selectedAddons as any)) {
          if (existingAddOns[key]) {
            const storedPrice = typeof existingAddOns[key] === "object" && existingAddOns[key].price ? Number(existingAddOns[key].price) : 0;
            validatedAddOns[key] = {
              selected: !!(val as any)?.selected,
              price: storedPrice,
              name: (val as any)?.name || key,
            };
          }
        }
        updateData.addOns = validatedAddOns;

        let addOnsTotal = 0;
        for (const val of Object.values(validatedAddOns) as any[]) {
          if (val.selected && val.price) addOnsTotal += Number(val.price);
        }
        const basePrice = updateData.total || Number(q.total) || 0;
        updateData.total = basePrice + addOnsTotal;
      }

      await updateQuote(q.id, updateData);
      await cancelPendingCommunicationsForQuote(q.id);

      // Generate Revenue Playbook recommendations
      try {
        const business = await db_getBusinessById(q.businessId);
        const customer = q.customerId ? await getCustomerById(q.customerId) : null;
        const updatedQuote = { ...q, ...updateData };
        generateRevenuePlaybook(updatedQuote, business, customer).catch(() => {});
      } catch (_e) {}

      if (q.customerId) {
        try {
          const customerUpdate: any = { status: "active" };
          if (phone) customerUpdate.phone = phone;
          await updateCustomer(q.customerId, customerUpdate);
        } catch (_e) {}
      }

      // Send push notification to business owner
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
                  badge: 1,
                }),
              });
            } catch (_pushErr) {}
          }
        }
      } catch (_notifErr) {}

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
          }).catch(() => {});

          pool.query(
            `SELECT auto_create_invoice FROM qbo_connections WHERE user_id = $1 AND status = 'connected'`,
            [business.userId]
          ).then((connResult) => {
            if (connResult.rows.length > 0 && connResult.rows[0].auto_create_invoice) {
              createQBOInvoiceForQuote(business.userId, q.id).catch((err) => {
                console.error("Auto QBO invoice (public accept) failed:", err.message);
              });
            }
          }).catch(() => {});
        }
      } catch (_syncErr) {}

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Accept quote error:", error);
      return res.status(500).json({ success: false, message: "Failed to accept quote" });
    }
  });

  app.post("/q/:token/decline", async (req: Request, res: Response) => {
    try {
      const q = await getQuoteByToken(req.params.token);
      if (!q) return res.status(404).json({ success: false, message: "Quote not found" });

      if (q.status === "accepted") {
        return res.status(400).json({ success: false, message: "This quote has already been accepted" });
      }

      await updateQuote(q.id, {
        status: "declined",
        declinedAt: new Date(),
      });

      await cancelPendingCommunicationsForQuote(q.id);

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Decline quote error:", error);
      return res.status(500).json({ success: false, message: "Failed to decline quote" });
    }
  });

  app.post("/q/:token/request-changes", async (req: Request, res: Response) => {
    try {
      const q = await getQuoteByToken(req.params.token);
      if (!q) return res.status(404).json({ success: false, message: "Quote not found" });

      const { message } = req.body;
      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ success: false, message: "Please provide a message" });
      }

      const existingNotes = q.aiNotes || "";
      const changeRequest = `[Change Request ${new Date().toISOString()}]: ${message.trim()}`;
      const newNotes = existingNotes ? `${existingNotes}\n${changeRequest}` : changeRequest;

      await updateQuote(q.id, { aiNotes: newNotes });

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Request changes error:", error);
      return res.status(500).json({ success: false, message: "Failed to submit change request" });
    }
  });

  app.post("/q/:token/track", async (req: Request, res: Response) => {
    try {
      const q = await getQuoteByToken(req.params.token);
      if (!q) return res.status(404).json({ ok: false });
      const { event, data } = req.body;
      const existing = q.aiNotes || "";
      const entry = `[Analytics ${new Date().toISOString()}] ${event}${data ? " " + JSON.stringify(data) : ""}`;
      const notes = existing ? `${existing}\n${entry}` : entry;
      await updateQuote(q.id, { aiNotes: notes });
      return res.json({ ok: true });
    } catch (_e) {
      return res.json({ ok: true });
    }
  });

  // ==================== INVOICE PACKET ====================

  app.post("/api/quotes/:id/invoice-packet", requireAuth, async (req: any, res) => {
    try {
      const quote = await getQuoteById(req.params.id);
      if (!quote || quote.businessId !== req.businessId) return res.status(404).json({ error: "Quote not found" });

      const business = await getBusinessByOwner(req.session.userId!);
      const customer = quote.customerId ? await getCustomerById(quote.customerId) : null;
      const lineItems = await getLineItemsByQuote(quote.id);
      const options = (quote as any).options as any[] || [];
      const selectedOpt = options.find((o: any) => o.id === (quote as any).selectedOption) || options[0];

      const customerInfo = {
        displayName: customer ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim() : "Walk-in Customer",
        email: customer?.email || "",
        phone: customer?.phone || "",
        address: customer?.address || "",
        serviceAddress: (quote as any).propertyDetails?.address || customer?.address || "",
      };

      const items = lineItems.length > 0
        ? lineItems.map((li: any) => ({
            name: li.name || li.description || "Service",
            description: li.description || "",
            quantity: li.quantity || 1,
            unitPrice: parseFloat(li.unitPrice || li.price || "0"),
            amount: parseFloat(li.amount || li.total || "0"),
          }))
        : selectedOpt
          ? [{
              name: selectedOpt.name || "Cleaning Service",
              description: selectedOpt.description || "",
              quantity: 1,
              unitPrice: parseFloat(selectedOpt.price || selectedOpt.total || "0"),
              amount: parseFloat(selectedOpt.price || selectedOpt.total || "0"),
            }]
          : [{
              name: "Cleaning Service",
              description: "",
              quantity: 1,
              unitPrice: parseFloat(String(quote.total || "0")),
              amount: parseFloat(String(quote.total || "0")),
            }];

      const subtotal = parseFloat(String(quote.subtotal || quote.total || "0"));
      const tax = parseFloat(String(quote.tax || "0"));
      const total = parseFloat(String(quote.total || "0"));
      const invoiceNumber = `INV-${quote.id.slice(0, 8).toUpperCase()}`;

      const totals = { subtotal, tax, total };

      const csvHeader = "customer_display_name,customer_email,customer_phone,billing_address_line1,billing_city,billing_state,billing_zip,service_date,item_name,item_description,item_qty,item_rate,item_amount,tax_amount,total_amount,memo";
      const csvRows = items.map((item: any) => {
        const addr = customerInfo.serviceAddress || customerInfo.address;
        return `"${customerInfo.displayName}","${customerInfo.email}","${customerInfo.phone}","${addr}","","","","","${item.name}","${item.description}",${item.quantity},${item.unitPrice.toFixed(2)},${item.amount.toFixed(2)},${tax.toFixed(2)},${total.toFixed(2)},"${(quote as any).notes || ""}"`;
      });
      const csvText = [csvHeader, ...csvRows].join("\n");

      const plainLines = [
        `INVOICE ${invoiceNumber}`,
        `Date: ${new Date().toLocaleDateString()}`,
        ``,
        `Bill To: ${customerInfo.displayName}`,
        customerInfo.email ? `Email: ${customerInfo.email}` : "",
        customerInfo.phone ? `Phone: ${customerInfo.phone}` : "",
        customerInfo.address ? `Address: ${customerInfo.address}` : "",
        ``,
        `---`,
        ...items.map((item: any) => `${item.name} (x${item.quantity}) - $${item.amount.toFixed(2)}`),
        `---`,
        `Subtotal: $${subtotal.toFixed(2)}`,
        tax > 0 ? `Tax: $${tax.toFixed(2)}` : "",
        `Total: $${total.toFixed(2)}`,
        ``,
        (quote as any).notes ? `Notes: ${(quote as any).notes}` : "",
      ].filter(Boolean).join("\n");

      const primaryColor = business?.primaryColor || "#2563EB";
      const pdfHtml = generateInvoicePdfHtml({
        invoiceNumber,
        business: business!,
        customerInfo,
        items,
        totals,
        notes: (quote as any).notes || "",
        primaryColor,
        quoteDate: quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
      });

      const packet = await createInvoicePacket({
        quoteId: quote.id,
        businessId: req.businessId,
        userId: req.session.userId!,
        status: "generated",
        lineItemsJson: items,
        customerInfoJson: customerInfo,
        totalsJson: totals,
        invoiceNumber,
        pdfHtml,
        csvText,
        plainText: plainLines,
      });

      await dispatchWebhook(req.businessId, req.session.userId!, "invoice_packet.created", { invoicePacketId: packet.id, quoteId: quote.id, invoiceNumber });

      res.json({ success: true, packet });
    } catch (e: any) {
      console.error("Invoice packet error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/invoice-packets/:id", requireAuth, async (req: any, res) => {
    try {
      const packet = await getInvoicePacketById(req.params.id);
      if (!packet || packet.businessId !== req.businessId) return res.status(404).json({ error: "Not found" });
      res.json(packet);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== CALENDAR EVENT STUBS ====================

  app.post("/api/quotes/:id/calendar-event", requireAuth, async (req: any, res) => {
    try {
      const quote = await getQuoteById(req.params.id);
      if (!quote || quote.businessId !== req.businessId) return res.status(404).json({ error: "Quote not found" });

      const customer = quote.customerId ? await getCustomerById(quote.customerId) : null;
      const { startDatetime, durationMinutes = 120 } = req.body;

      if (!startDatetime) return res.status(400).json({ error: "startDatetime required" });

      const start = new Date(startDatetime);
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
      const customerName = customer ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim() : "Customer";
      const title = req.body.title || `Cleaning - ${customerName}`;
      const location = req.body.location || (quote as any).propertyDetails?.address || customer?.address || "";

      const lineItems = await getLineItemsByQuote(quote.id);
      const options = (quote as any).options as any[] || [];
      const selectedOpt = options.find((o: any) => o.id === (quote as any).selectedOption) || options[0];

      const descParts = [
        `Quote #${quote.id.slice(0, 8).toUpperCase()}`,
        `Total: $${parseFloat(String(quote.total || "0")).toFixed(2)}`,
        ``,
        `Customer: ${customerName}`,
        customer?.phone ? `Phone: ${customer.phone}` : "",
        customer?.email ? `Email: ${customer.email}` : "",
        ``,
      ];
      if (lineItems.length > 0) {
        descParts.push("Services:");
        lineItems.forEach((li: any) => descParts.push(`- ${li.name || li.description || "Service"}`));
      } else if (selectedOpt) {
        descParts.push(`Service: ${selectedOpt.name || "Cleaning"}`);
      }
      if ((quote as any).notes) {
        descParts.push("", `Notes: ${(quote as any).notes}`);
      }
      const description = descParts.filter(Boolean).join("\n");

      const stub = await createCalendarEventStub({
        quoteId: quote.id,
        userId: req.session.userId!,
        businessId: req.businessId,
        startDatetime: start,
        endDatetime: end,
        location,
        title,
        description,
      });

      const icsContent = generateICS({ title, description, location, start, end, id: stub.id });

      const gcalUrl = buildGoogleCalendarUrl({ title, description, location, start, end });

      await dispatchWebhook(req.businessId, req.session.userId!, "calendar_stub.created", { calendarEventId: stub.id, quoteId: quote.id });

      res.json({ success: true, stub, icsContent, googleCalendarUrl: gcalUrl });
    } catch (e: any) {
      console.error("Calendar event error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/calendar-events/quote/:id", requireAuth, async (req: any, res) => {
    try {
      const stubs = await getCalendarEventStubsByQuoteId(req.params.id);
      res.json(stubs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== API KEYS ====================

  app.post("/api/api-keys", requireAuth, async (req: any, res) => {
    try {
      const rawKey = `qp_${crypto.randomBytes(32).toString("hex")}`;
      const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
      const keyPrefix = rawKey.slice(-8);
      const label = req.body.label || "API Key";

      const user = await getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ error: "User not found" });
      const business = await getBusinessByOwner(user.id);
      if (!business) return res.status(400).json({ error: "Business not found" });

      const apiKey = await createApiKey({
        userId: req.session.userId!,
        businessId: business.id,
        keyHash,
        keyPrefix,
        label,
        isActive: true,
      });

      res.json({ success: true, rawKey, apiKey });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/api-keys", requireAuth, async (req: any, res) => {
    try {
      const keys = await getApiKeysByUserId(req.session.userId!);
      res.json(keys.map((k: any) => ({ id: k.id, keyPrefix: k.keyPrefix, label: k.label, isActive: k.isActive, createdAt: k.createdAt })));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/api-keys/:id", requireAuth, async (req: any, res) => {
    try {
      await deactivateApiKey(req.params.id, req.session.userId!);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== WEBHOOK ENDPOINTS ====================

  app.post("/api/webhook-endpoints", requireAuth, async (req: any, res) => {
    try {
      const { url, enabledEvents = [] } = req.body;
      if (!url) return res.status(400).json({ error: "url required" });
      const endpoint = await createWebhookEndpoint({
        userId: req.session.userId!,
        businessId: req.businessId,
        url,
        isActive: true,
        enabledEvents,
      });
      res.json({ success: true, endpoint });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/webhook-endpoints", requireAuth, async (req: any, res) => {
    try {
      const endpoints = await getWebhookEndpointsByUserId(req.session.userId!);
      res.json(endpoints);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/webhook-endpoints/:id", requireAuth, async (req: any, res) => {
    try {
      const { url, isActive, enabledEvents } = req.body;
      const updated = await updateWebhookEndpoint(req.params.id, req.session.userId!, { url, isActive, enabledEvents });
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json({ success: true, endpoint: updated });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/webhook-endpoints/:id", requireAuth, async (req: any, res) => {
    try {
      await deleteWebhookEndpoint(req.params.id, req.session.userId!);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/webhook-endpoints/:id/test", requireAuth, async (req: any, res) => {
    try {
      const endpoints = await getWebhookEndpointsByUserId(req.session.userId!);
      const ep = endpoints.find((e: any) => e.id === req.params.id);
      if (!ep) return res.status(404).json({ error: "Not found" });

      const testPayload = {
        event_type: "test",
        event_id: crypto.randomUUID(),
        occurred_at: new Date().toISOString(),
        account_id: req.businessId,
        data: { message: "This is a test webhook from QuotePro" },
      };

      const keys = await getApiKeysByUserId(req.session.userId!);
      const activeKey = keys[0];
      const body = JSON.stringify(testPayload);
      const signature = activeKey
        ? crypto.createHmac("sha256", activeKey.keyHash).update(body).digest("hex")
        : "no-api-key";

      try {
        const response = await fetch(ep.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-QP-Signature": signature },
          body,
          signal: AbortSignal.timeout(10000),
        });
        res.json({ success: true, statusCode: response.status, statusText: response.statusText });
      } catch (fetchErr: any) {
        res.json({ success: false, error: fetchErr.message });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== WEBHOOK EVENTS + DELIVERIES ====================

  app.get("/api/webhook-events", requireAuth, async (req: any, res) => {
    try {
      const events = await getWebhookEventsByUserId(req.session.userId!);
      const eventsWithStatus = await Promise.all(
        events.map(async (evt: any) => {
          const deliveries = await getWebhookDeliveriesByEventId(evt.id);
          const allDelivered = deliveries.length > 0 && deliveries.every((d: any) => d.deliveredAt);
          const anyRetrying = deliveries.some((d: any) => d.nextRetryAt && !d.deliveredAt);
          const status = allDelivered ? "delivered" : anyRetrying ? "retrying" : deliveries.length > 0 ? "failed" : "pending";
          return { ...evt, deliveryStatus: status, deliveryCount: deliveries.length };
        })
      );
      res.json(eventsWithStatus);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/webhook-events/:id", requireAuth, async (req: any, res) => {
    try {
      const evt = await getWebhookEventById(req.params.id);
      if (!evt || evt.userId !== req.session.userId) return res.status(404).json({ error: "Not found" });
      const deliveries = await getWebhookDeliveriesByEventId(evt.id);
      res.json({ ...evt, deliveries });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== REMINDER TEMPLATES ====================

  app.get("/api/reminder-templates/:quoteId", requireAuth, async (req: any, res) => {
    try {
      const quote = await getQuoteById(req.params.quoteId);
      if (!quote || quote.businessId !== req.businessId) return res.status(404).json({ error: "Quote not found" });
      const customer = quote.customerId ? await getCustomerById(quote.customerId) : null;
      const customerName = customer ? (customer.firstName || "there") : "there";
      const business = await getBusinessByOwner(req.session.userId!);
      const bName = business?.companyName || "us";

      const templates = [
        {
          id: "confirmation",
          label: "Confirmation",
          message: `Hi ${customerName}! This is ${bName} confirming your cleaning appointment. We look forward to seeing you! Please let us know if you have any questions.`,
        },
        {
          id: "reminder_24h",
          label: "24-Hour Reminder",
          message: `Hi ${customerName}! Just a friendly reminder that your cleaning with ${bName} is scheduled for tomorrow. Please make sure the space is accessible. See you soon!`,
        },
        {
          id: "on_my_way",
          label: "On My Way",
          message: `Hi ${customerName}! This is ${bName} - I'm on my way to your location now. I should arrive shortly. See you soon!`,
        },
      ];

      res.json(templates);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ==================== QBO INTEGRATION ====================

  app.get("/api/integrations/qbo/status", requireAuth, async (req: any, res) => {
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
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/integrations/qbo/connect", requireAuth, async (req: any, res) => {
    try {
      const clientId = process.env.INTUIT_CLIENT_ID;
      if (!clientId) return res.status(500).json({ error: "QuickBooks integration not configured" });

      const host = req.get("host") || process.env.REPLIT_DEV_DOMAIN || "";
      const protocol = host.includes("localhost") ? "http" : "https";
      const redirectUri = `${protocol}://${host}/api/integrations/qbo/callback`;

      const state = crypto.randomBytes(32).toString("hex");
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
        state,
      });

      const url = `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
      res.json({ url });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/integrations/qbo/callback", async (req: any, res) => {
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
          "Accept": "application/json",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: redirectUri,
        }).toString(),
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
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      let companyName: string | null = null;
      try {
        const infoRes = await fetch(
          `https://quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`,
          { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } }
        );
        if (infoRes.ok) {
          const infoData = await infoRes.json();
          companyName = infoData?.CompanyInfo?.CompanyName || null;
        }
      } catch {}

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
    } catch (e: any) {
      console.error("QBO callback error:", e);
      res.status(500).send("An error occurred during QuickBooks connection");
    }
  });

  app.post("/api/integrations/qbo/disconnect", requireAuth, async (req: any, res) => {
    try {
      await pool.query(
        `UPDATE qbo_connections SET status = 'disconnected', disconnected_at = NOW(),
                access_token_encrypted = NULL, refresh_token_encrypted = NULL
         WHERE user_id = $1`,
        [req.session.userId]
      );
      await logSync(req.session.userId, null, "disconnect", {}, { success: true }, "ok");
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/integrations/qbo/test", requireAuth, async (req: any, res) => {
    try {
      const client = new QBOClient(req.session.userId);
      const conn = await client.loadConnection();
      if (!conn) return res.status(404).json({ error: "No QuickBooks connection found" });

      const info = await client.getCompanyInfo();
      await logSync(req.session.userId, null, "test_connection", {}, { companyName: info.CompanyName }, "ok");
      res.json({ success: true, companyName: info.CompanyName });
    } catch (e: any) {
      await logSync(req.session.userId, null, "test_connection", {}, { error: e.message }, "failed", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/integrations/qbo/create-invoice", requireAuth, async (req: any, res) => {
    try {
      const { quoteId } = req.body;
      if (!quoteId) return res.status(400).json({ error: "quoteId is required" });

      const result = await createQBOInvoiceForQuote(req.session.userId, quoteId);
      if (!result) return res.status(400).json({ error: "QuickBooks not connected or quote not found" });

      res.json(result);
    } catch (e: any) {
      await logSync(req.session.userId, req.body?.quoteId || null, "create_invoice", { quoteId: req.body?.quoteId }, { error: e.message }, "failed", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/integrations/qbo/logs", requireAuth, async (req: any, res) => {
    try {
      const result = await pool.query(
        `SELECT id, user_id as "userId", quote_id as "quoteId", action,
                request_summary as "requestSummary", response_summary as "responseSummary",
                status, error_message as "errorMessage", created_at as "createdAt"
         FROM qbo_sync_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [req.session.userId]
      );
      res.json(result.rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/integrations/qbo/settings", requireAuth, async (req: any, res) => {
    try {
      const { autoCreateInvoice } = req.body;
      await pool.query(
        `UPDATE qbo_connections SET auto_create_invoice = $1 WHERE user_id = $2`,
        [!!autoCreateInvoice, req.session.userId]
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/integrations/qbo/invoice-link/:quoteId", requireAuth, async (req: any, res) => {
    try {
      const result = await pool.query(
        `SELECT qbo_invoice_id as "qboInvoiceId", qbo_doc_number as "qboDocNumber", created_at as "createdAt"
         FROM qbo_invoice_links WHERE user_id = $1 AND quote_id = $2`,
        [req.session.userId, req.params.quoteId]
      );
      if (result.rows.length === 0) return res.json(null);
      res.json(result.rows[0]);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============ JOBBER INTEGRATION ENDPOINTS ============

  app.get("/api/integrations/jobber/connect", requireAuth, requirePro as any, async (req: any, res) => {
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

      const state = crypto.randomBytes(32).toString("hex");
      await pool.query(
        `INSERT INTO oauth_states (state, user_id, provider, created_at)
         VALUES ($1, $2, 'jobber', NOW())`,
        [state, req.session.userId]
      );

      const url = buildJobberAuthUrl(redirectUri, state);
      res.json({ url });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/integrations/jobber/callback", async (req: any, res) => {
    let resolvedUserId: string | null = null;
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

      const tokens = await exchangeJobberCode(code as string, redirectUri);
      const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

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

      res.send(`<!DOCTYPE html><html><head><title>Jobber Connected</title><style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8f9fa;margin:0}.card{text-align:center;padding:40px;border-radius:16px;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,0.1);max-width:400px}h1{color:#16a34a;margin-bottom:8px}p{color:#64748b}</style></head><body><div class="card"><h1>Connected!</h1><p>Jobber is now connected to QuotePro. You can close this window and return to the app.</p></div></body></html>`);
    } catch (e: any) {
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

  app.get("/api/integrations/jobber/status", requireAuth, async (req: any, res) => {
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
        lastError: conn.lastError,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/integrations/jobber/disconnect", requireAuth, requirePro as any, async (req: any, res) => {
    try {
      await pool.query(
        `UPDATE jobber_connections SET status = 'disconnected', disconnected_at = NOW(),
                access_token_encrypted = NULL, refresh_token_encrypted = NULL
         WHERE user_id = $1`,
        [req.session.userId]
      );
      await logJobberSync(req.session.userId, null, "disconnect", {}, { success: true }, "ok");
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/integrations/jobber/settings", requireAuth, requirePro as any, async (req: any, res) => {
    try {
      const { autoCreateJobOnQuoteAccept } = req.body;
      await pool.query(
        `UPDATE jobber_connections SET auto_create_job_on_quote_accept = $1 WHERE user_id = $2`,
        [!!autoCreateJobOnQuoteAccept, req.session.userId]
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/integrations/jobber/sync-quote/:quoteId", requireAuth, requirePro as any, async (req: any, res) => {
    try {
      const { quoteId } = req.params;
      const force = req.body?.force === true;
      const result = await syncQuoteToJobber(req.session.userId, quoteId, "manual", force);
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get("/api/integrations/jobber/sync-status/:quoteId", requireAuth, async (req: any, res) => {
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
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/integrations/jobber/logs", requireAuth, async (req: any, res) => {
    try {
      const result = await pool.query(
        `SELECT id, user_id as "userId", quote_id as "quoteId", action,
                request_summary as "requestSummary", response_summary as "responseSummary",
                status, error_message as "errorMessage", created_at as "createdAt"
         FROM jobber_sync_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [req.session.userId]
      );
      res.json(result.rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/integrations/jobber/test", requireAuth, async (req: any, res) => {
    try {
      const client = new JobberClient(req.session.userId);
      const conn = await client.loadConnection();
      if (!conn) return res.status(404).json({ error: "No Jobber connection found" });

      await client.ensureValidToken();
      await logJobberSync(req.session.userId, null, "test_connection", {}, { success: true }, "ok");
      res.json({ success: true });
    } catch (e: any) {
      await logJobberSync(req.session.userId, null, "test_connection", {}, { error: e.message }, "failed", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/integrations/jobber/dashboard-stats", requireAuth, async (req: any, res) => {
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
        failedSyncs: parseInt(s.failedSyncs) || 0,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/integrations/jobber/clients", requireAuth, requirePro as any, async (req: any, res) => {
    try {
      const client = new JobberClient(req.session.userId);
      const conn = await client.loadConnection();
      if (!conn) return res.status(404).json({ error: "No Jobber connection found" });

      const cursor = req.query.cursor as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 50);

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

      const variables: any = { first: limit };
      if (cursor) variables.after = cursor;

      const data = await client.graphql(query, variables);
      const clients = data.clients;

      const existingMappings = await pool.query(
        `SELECT jobber_client_id as "jobberClientId" FROM jobber_client_mappings WHERE user_id = $1`,
        [req.session.userId]
      );
      const importedIds = new Set(existingMappings.rows.map((r: any) => r.jobberClientId));

      const mapped = clients.nodes.map((c: any) => {
        const primaryEmail = c.emails?.find((e: any) => e.primary)?.address || c.emails?.[0]?.address || null;
        const primaryPhone = c.phones?.find((p: any) => p.primary)?.number || c.phones?.[0]?.number || null;
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
          alreadyImported: importedIds.has(c.id),
        };
      });

      res.json({
        clients: mapped,
        hasNextPage: clients.pageInfo.hasNextPage,
        endCursor: clients.pageInfo.endCursor,
        totalCount: clients.totalCount,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/integrations/jobber/import-clients", requireAuth, requirePro as any, async (req: any, res) => {
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
      const results: any[] = [];

      for (const jc of jobberClients) {
        try {
          const firstName = jc.firstName || "";
          const lastName = jc.lastName || jc.companyName || "Unknown";
          const email = jc.emails?.find((e: any) => e.primary)?.address || jc.emails?.[0]?.address || null;
          const phone = jc.phones?.find((p: any) => p.primary)?.number || jc.phones?.[0]?.number || null;
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
        } catch (err: any) {
          failed++;
          results.push({ jobberId: jc.id, name: `${jc.firstName || ""} ${jc.lastName || ""}`, status: "failed", reason: err.message });
        }
      }

      await logJobberSync(req.session.userId, null, "import_clients",
        { clientCount: clientIds.length },
        { imported, skipped, failed },
        failed === clientIds.length ? "failed" : "ok"
      );

      res.json({ imported, skipped, failed, results });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  const httpServer = createServer(app);

  setInterval(async () => {
    try {
      await expireOldQuotes();
    } catch (e) {
      console.error("Auto-expire error:", e);
    }
  }, 60 * 60 * 1000);

  return httpServer;
}

async function dispatchWebhook(businessId: string, userId: string, eventType: string, data: any) {
  try {
    const endpoints = await getActiveWebhookEndpointsForBusiness(businessId);
    if (endpoints.length === 0) return;

    const matchingEndpoints = endpoints.filter((ep: any) => {
      const enabled = ep.enabledEvents as string[] || [];
      return enabled.length === 0 || enabled.includes(eventType);
    });
    if (matchingEndpoints.length === 0) return;

    const event = await createWebhookEvent({ userId, businessId, eventType, payloadJson: data });

    const payload = {
      event_type: eventType,
      event_id: event.id,
      occurred_at: new Date().toISOString(),
      account_id: businessId,
      data,
    };
    const body = JSON.stringify(payload);

    const keys = await getApiKeysByUserId(userId);
    const activeKey = keys[0];
    const signature = activeKey
      ? crypto.createHmac("sha256", activeKey.keyHash).update(body).digest("hex")
      : "no-api-key";

    for (const ep of matchingEndpoints) {
      deliverWebhook(ep, event.id, body, signature, 1);
    }
  } catch (e) {
    console.error("Webhook dispatch error:", e);
  }
}

async function deliverWebhook(endpoint: any, eventId: string, body: string, signature: string, attempt: number) {
  const delivery = await createWebhookDelivery({
    webhookEventId: eventId,
    endpointId: endpoint.id,
    attemptNumber: attempt,
    statusCode: null,
    responseBodyExcerpt: null,
    nextRetryAt: null,
    deliveredAt: null,
  });

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-QP-Signature": signature },
      body,
      signal: AbortSignal.timeout(15000),
    });

    const responseText = await response.text().catch(() => "");
    const excerpt = responseText.slice(0, 500);

    if (response.ok) {
      await updateWebhookDelivery(delivery.id, { statusCode: response.status, responseBodyExcerpt: excerpt, deliveredAt: new Date() });
    } else {
      const retryDelays = [60000, 300000, 900000];
      const nextRetry = attempt < 3 ? new Date(Date.now() + retryDelays[attempt - 1]) : null;
      await updateWebhookDelivery(delivery.id, { statusCode: response.status, responseBodyExcerpt: excerpt, nextRetryAt: nextRetry });
      if (nextRetry) {
        setTimeout(() => deliverWebhook(endpoint, eventId, body, signature, attempt + 1), retryDelays[attempt - 1]);
      }
    }
  } catch (err: any) {
    const retryDelays = [60000, 300000, 900000];
    const nextRetry = attempt < 3 ? new Date(Date.now() + retryDelays[attempt - 1]) : null;
    await updateWebhookDelivery(delivery.id, { statusCode: 0, responseBodyExcerpt: err.message?.slice(0, 500), nextRetryAt: nextRetry });
    if (nextRetry) {
      setTimeout(() => deliverWebhook(endpoint, eventId, body, signature, attempt + 1), retryDelays[attempt - 1]);
    }
  }
}

// ============ QBO INTEGRATION ENDPOINTS ============

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
    console.warn("QBO tables init:", (e as Error).message);
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
    console.warn("Jobber tables init:", (e as Error).message);
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
    console.warn("OAuth states table init:", (e as Error).message);
  }
}

initOAuthStatesTable();

(async () => {
  try {
    await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS started_at TIMESTAMP`);
    await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`);
    await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS update_token VARCHAR UNIQUE`);
    await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS detailed_status TEXT NOT NULL DEFAULT 'scheduled'`);
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
    console.warn("Job columns migration:", (e as Error).message);
  }
  try {
    await pool.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMP`);
    await pool.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_type TEXT NOT NULL DEFAULT 'fixed'`);
    await pool.query(`ALTER TABLE quotes ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMP`);
  } catch (e) {
    console.warn("Quote columns migration:", (e as Error).message);
  }
})();

async function createQBOInvoiceForQuote(userId: string, quoteId: string): Promise<{ qboInvoiceId: string; docNumber: string | null } | null> {
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

  let customer: any = null;
  if (quote.customerId) {
    customer = await getCustomerById(quote.customerId);
  }

  let qboCustomerId: string | null = null;

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
        found = await client.queryCustomer(undefined, customer.name);
      }

      if (found) {
        qboCustomerId = found.Id;
      } else {
        const newCust = await client.createCustomer(
          customer.name || "Unknown Customer",
          customer.email || undefined,
          customer.phone || undefined,
          customer.address || undefined
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
    const defaultCust = await client.queryCustomer(undefined, "QuotePro Customer");
    if (defaultCust) {
      qboCustomerId = defaultCust.Id;
    } else {
      const newCust = await client.createCustomer("QuotePro Customer");
      qboCustomerId = newCust.Id;
    }
  }

  if (!qboCustomerId) throw new Error("Could not resolve QBO customer");

  const lineItems = await pool.query(`SELECT * FROM line_items WHERE quote_id = $1`, [quoteId]);
  const lines: Array<{ description: string; amount: number }> = [];

  if (lineItems.rows.length > 0) {
    for (const li of lineItems.rows) {
      lines.push({
        description: `${li.label || li.type || "Cleaning Service"}${li.description ? " - " + li.description : ""}`,
        amount: parseFloat(li.price) || 0,
      });
    }
  } else {
    const totalAmount = parseFloat(quote.total as any) || 0;
    const desc = quote.propertyDetails
      ? `Cleaning Services - ${(quote.propertyDetails as any)?.sqft || ""} sqft`
      : "Cleaning Services";
    lines.push({ description: desc, amount: totalAmount });
  }

  const privateNote = `QuotePro Quote #${quote.quoteNumber || quoteId}`;
  const txnDate = new Date().toISOString().split("T")[0];

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

function generateICS(opts: { title: string; description: string; location: string; start: Date; end: Date; id: string }): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escapeICS = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
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
    "END:VCALENDAR",
  ].join("\r\n");
}

function buildGoogleCalendarUrl(opts: { title: string; description: string; location: string; start: Date; end: Date }): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${fmt(opts.start)}/${fmt(opts.end)}`,
    details: opts.description,
    location: opts.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function generateInvoicePdfHtml(opts: {
  invoiceNumber: string;
  business: any;
  customerInfo: any;
  items: any[];
  totals: { subtotal: number; tax: number; total: number };
  notes: string;
  primaryColor: string;
  quoteDate: string;
}): string {
  const { invoiceNumber, business, customerInfo, items, totals, notes, primaryColor, quoteDate } = opts;
  const itemRows = items.map(
    (item: any) =>
      `<tr><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0">${item.name}</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:center">${item.quantity}</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:right">$${item.unitPrice.toFixed(2)}</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:right">$${item.amount.toFixed(2)}</td></tr>`
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

async function db_getBusinessById(businessId: string) {
  const { db } = await import("./db");
  const { businesses } = await import("@shared/schema");
  const { eq } = await import("drizzle-orm");
  const [b] = await db.select().from(businesses).where(eq(businesses.id, businessId));
  return b;
}

function formatUser(u: any) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    subscriptionTier: u.subscriptionTier || "free",
  };
}

function getQuickQuoteHTML(): string {
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

async function syncJobToGoogleCalendar(userId: string, job: any, customerName: string) {
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
      expiry_date: new Date(tokens.expiresAt).getTime(),
    });

    if (new Date(tokens.expiresAt) < new Date()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await upsertGoogleCalendarToken(userId, {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || tokens.refreshToken,
        expiresAt: new Date(credentials.expiry_date!),
      });
      oauth2Client.setCredentials(credentials);
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const endTime = job.endDatetime || new Date(new Date(job.startDatetime).getTime() + 2 * 60 * 60 * 1000);

    await calendar.events.insert({
      calendarId: tokens.calendarId || "primary",
      requestBody: {
        summary: `Clean - ${customerName}`,
        location: job.address || undefined,
        start: { dateTime: new Date(job.startDatetime).toISOString() },
        end: { dateTime: new Date(endTime).toISOString() },
        description: [
          job.jobType ? `Type: ${job.jobType}` : "",
          job.total ? `Total: $${job.total}` : "",
          job.internalNotes || "",
        ].filter(Boolean).join("\n"),
      },
    });
  } catch (error) {
    console.error("Google Calendar sync error:", error);
  }
}

function formatBusiness(b: any) {
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
    avatarConfig: b.avatarConfig || null,
  };
}

function getPrivacyPolicyHTML(): string {
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

function getTermsOfServiceHTML(): string {
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

function getDeleteAccountHTML(): string {
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
