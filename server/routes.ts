import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import OpenAI from "openai";
import Stripe from "stripe";
import { pool } from "./db";
import { google } from "googleapis";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-04-30.basil" as any })
  : null;

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

function setupSession(app: Express) {
  const PgStore = connectPg(session);

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
        secure: false,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );
}

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
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
      req.session.userId = user.id;
      req.session.save(() => {
        return res.send(`<!DOCTYPE html><html><head><title>Signed In</title>
<meta http-equiv="refresh" content="1;url=quotepro://auth-callback?success=true">
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;}
.card{text-align:center;padding:40px;background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
.check{font-size:48px;margin-bottom:16px;color:#34C759;}h2{margin:0 0 8px;color:#333;}p{color:#666;margin:0;}</style>
</head><body><div class="card"><div class="check">&#10003;</div><h2>Signed In!</h2><p>Returning to QuotePro...</p></div>
<script>setTimeout(function(){window.location.href='quotepro://auth-callback?success=true';},500);</script>
</body></html>`);
      });
    } catch (error: any) {
      console.error("Google auth callback error:", error);
      return res.status(500).send("Google sign-in failed. Please try again.");
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
        if (c) customerMap[cid] = c.name;
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

  app.post("/api/quotes", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });

      const rules = await getAutomationRules(business.id);
      const expirationDays = rules?.quoteExpirationDays || 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expirationDays);

      const q = await createQuote({ ...req.body, businessId: business.id, expiresAt });

      if (req.body.lineItems) {
        for (const li of req.body.lineItems) {
          await createLineItem({ ...li, quoteId: q.id });
        }
      }

      return res.json(q);
    } catch (error: any) {
      console.error("Create quote error:", error);
      return res.status(500).json({ message: "Failed to create quote" });
    }
  });

  app.put("/api/quotes/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { lineItems, ...data } = req.body;
      const q = await updateQuote(req.params.id, data);

      if (lineItems) {
        await deleteLineItemsByQuote(q.id);
        for (const li of lineItems) {
          await createLineItem({ ...li, quoteId: q.id });
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
              primaryColor: business.primaryColor,
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
      return res.json({ ...j, checklist });
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

  app.post("/api/jobs/:id/complete", requireAuth, async (req: Request, res: Response) => {
    try {
      const job = await getJobById(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });

      const updatedJob = await updateJob(req.params.id, {
        status: "completed",
        endDatetime: new Date(),
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

      return res.json({
        completedJob: updatedJob,
        nextJob,
        message: nextJob
          ? `Job completed! Next ${job.recurrence} job scheduled.`
          : "Job completed!",
      });
    } catch (error: any) {
      console.error("Complete job error:", error);
      return res.status(500).json({ message: "Failed to complete job" });
    }
  });

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

  app.get("/api/quotes/:id/pdf", requireAuth, async (req: Request, res: Response) => {
    try {
      const quote = await getQuoteById(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });

      const selectedOpt = (quote.options as any)?.[quote.selectedOption || "better"];
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

      const primaryColor = business.primaryColor || "#2563EB";

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
<div class="footer">Quote generated by ${business.companyName || "QuotePro"} | ${new Date().toLocaleDateString()}</div>
</body></html>`;

      return res.json({ html, customerName, total: quote.total });
    } catch (error: any) {
      console.error("PDF generation error:", error);
      return res.status(500).json({ message: "Failed to generate PDF" });
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

  // ─── Subscription Middleware ───

  const requirePro = async (req: Request, res: Response, next: Function) => {
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
  };

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
      const { quoteId, channel, context } = req.body;
      if (!quoteId) return res.status(400).json({ message: "quoteId is required" });

      const quote = await getQuoteById(quoteId);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      const customer = quote.customerId ? await getCustomerById(quote.customerId) : null;
      const business = await db_getBusinessById(quote.businessId);
      const ageDays = Math.round(((Date.now() - (quote.sentAt?.getTime() || quote.createdAt.getTime())) / (1000 * 60 * 60 * 24)) * 10) / 10;

      const msgType = channel === "email" ? "email" : "SMS";
      const maxLen = channel === "email" ? 200 : 160;

      const completion = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          {
            role: "system",
            content: `Write a ${msgType} follow-up message (under ${maxLen} chars for SMS) for "${business?.companyName || "our company"}". The quote is $${quote.total} sent ${ageDays} days ago. Be warm, not pushy. No emojis. Sign as "${business?.senderName || "Team"}".${context ? ` Context: ${context}` : ""}`
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
        const sentQuotes = allQuotes.filter(q => q.status === "sent");
        const customers = await getCustomersByBusiness(business.id);
        const jobs = await getJobsByBusiness(business.id);

        const completedJobs = jobs.filter(j => j.status === "completed");

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
          const d = j.completedAt ? new Date(j.completedAt) : new Date(j.updatedAt);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const jobsLastMonth = completedJobs.filter(j => {
          const d = j.completedAt ? new Date(j.completedAt) : new Date(j.updatedAt);
          const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
        });

        contextStr = [
          `Date: ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`,
          `Biz: ${business.companyName}.`,
          `Quotes: ${stats.totalQuotes} total, ${stats.acceptedQuotes} accepted, ${stats.closeRate}% close, $${stats.totalRevenue} rev, $${stats.avgQuoteValue} avg.`,
          `This mo: ${quotesThisMonth.length} quotes, last mo: ${quotesLastMonth.length}.`,
          `${sentQuotes.length} open quotes ($${sentQuotes.reduce((s, q) => s + q.total, 0).toFixed(0)}).`,
          `${customers.length} customers.`,
          `Jobs: ${completedJobs.length} done, ${jobs.filter(j => j.status === "scheduled").length} scheduled.`,
          `Cleans this mo: ${jobsThisMonth.length}, last mo: ${jobsLastMonth.length}.`,
        ].filter(Boolean).join(" ");
      }

      const businessName = business?.companyName || "your cleaning business";

      const chatMessages: any[] = [
        {
          role: "system",
          content: `You are a concise AI sales assistant for "${businessName}" (residential cleaning). Give short, actionable answers (2-4 sentences max). Data:\n${contextStr}`
        },
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
      const { to, subject, body, customerId, quoteId } = req.body;
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
          ${body.split('\n').map((line: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333333;">${line}</p>`).join('')}
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
          { type: "text/plain", value: body },
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
        content: body,
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

  app.post("/api/ai/communication-draft", requireAuth, requirePro as any, async (req: Request, res: Response) => {
    try {
      const { type, purpose, customerName, companyName, senderName, quoteDetails, bookingLink, paymentMethodsText } = req.body;

      if (!type || !purpose) {
        return res.status(400).json({ message: "type and purpose are required" });
      }

      const purposeDescriptions: Record<string, string> = {
        initial_quote: "sending an initial quote - be enthusiastic and highlight value",
        follow_up: "a gentle follow-up on a previously sent quote - be polite and not pushy",
        thank_you: "thanking the customer for their business - be grateful and warm",
        booking_confirmation: "confirming a booking - be professional and include key details",
        reschedule: "requesting or confirming a reschedule - be understanding and accommodating",
      };

      const purposeInstruction = purposeDescriptions[purpose] || `purpose: ${purpose}`;

      const quoteContext = quoteDetails
        ? ` Quote: ${quoteDetails.selectedOption || "Cleaning"} $${quoteDetails.price || ""}. ${quoteDetails.scope || ""}. ${quoteDetails.propertyInfo || ""}.`
        : "";

      let systemPrompt: string;
      let userPrompt: string;

      const paymentInfo = paymentMethodsText ? ` Mention accepted payment methods: ${paymentMethodsText}.` : "";

      if (type === "sms") {
        systemPrompt = `Write a short SMS (under 160 chars) for a cleaning company called "${companyName || "our company"}". Sign as "${senderName || "Team"}". No hours/time estimates. No emojis. Be friendly but brief.${bookingLink ? ` Include link: ${bookingLink}` : ""}`;
        userPrompt = `SMS for ${purposeInstruction}. Customer: ${customerName || "Customer"}.${quoteContext}${paymentInfo} Reply with ONLY the message text, nothing else.`;
      } else {
        systemPrompt = `Write a short professional email (under 150 words) for "${companyName || "our company"}". Sign as "${senderName || "Team"}". No hours/time estimates. No emojis.${bookingLink ? ` Include link: ${bookingLink}` : ""} Start with "Subject: " on line 1, blank line, then body.`;
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
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `https://${req.get("host")}/api/google-calendar/callback`
      );
      const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/calendar.events"],
        prompt: "consent",
        state: req.session.userId,
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

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `https://${req.get("host")}/api/google-calendar/callback`
      );

      const { tokens } = await oauth2Client.getToken(code);

      await upsertGoogleCalendarToken(state, {
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
      if (!stripe) return res.status(503).json({ message: "Stripe is not set up yet. Go to Settings > Integrations and add your Stripe API keys to start accepting payments." });
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) return res.status(404).json({ message: "Business not found" });

      let accountId = business.stripeAccountId;
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          email: business.email || undefined,
          business_type: "individual",
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
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
      console.error("Stripe connect error:", error);
      if (error?.type === "StripeInvalidRequestError" && error?.message?.includes("signed up for Connect")) {
        return res.status(400).json({ message: "Stripe Connect is not enabled on your Stripe account. Please enable Connect at dashboard.stripe.com/connect before accepting payments." });
      }
      return res.status(500).json({ message: "Failed to create Stripe account. Please try again." });
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
      const isComplete = account.charges_enabled && account.details_submitted;

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
        payment_intent_data: {
          application_fee_amount: Math.round(amount * 0.03),
          transfer_data: { destination: business.stripeAccountId },
        },
        success_url: `https://${req.get("host")}/api/stripe/payment-success?quoteId=${quoteId}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://${req.get("host")}/api/stripe/payment-cancel?quoteId=${quoteId}`,
        metadata: { quoteId, businessId: business.id },
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
        payment_intent_data: {
          application_fee_amount: Math.round(amount * 0.03),
          transfer_data: { destination: business.stripeAccountId },
        },
        success_url: `https://${req.get("host")}/api/stripe/payment-success?quoteId=${quote.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://${req.get("host")}/api/stripe/payment-cancel?quoteId=${quote.id}`,
        metadata: { quoteId: quote.id, businessId: business.id },
      });

      return res.json({ url: checkoutSession.url });
    } catch (error: any) {
      console.error("Public payment error:", error);
      return res.status(500).json({ message: "Failed to create payment" });
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
      const { marketingModeEnabled, abandonedQuoteRecovery, weeklyReactivation, reviewRequestWorkflow, referralAskWorkflow, rebookNudges, upsellTriggers, quietHoursStart, quietHoursEnd, maxSendsPerDay, maxFollowUpsPerQuote, rebookNudgeDaysMin, rebookNudgeDaysMax, deepCleanIntervalMonths, googleReviewLink, connectedSendingEnabled } = req.body;
      const settings = await upsertGrowthAutomationSettings(business.id, { marketingModeEnabled, abandonedQuoteRecovery, weeklyReactivation, reviewRequestWorkflow, referralAskWorkflow, rebookNudges, upsellTriggers, quietHoursStart, quietHoursEnd, maxSendsPerDay, maxFollowUpsPerQuote, rebookNudgeDaysMin, rebookNudgeDaysMax, deepCleanIntervalMonths, googleReviewLink, connectedSendingEnabled });
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
      const { name, segment, channel, templateKey } = req.body;
      const campaign = await createCampaign({ businessId: business.id, name, segment, channel, templateKey });
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
      const { name, status, completedCount } = req.body;
      const updated = await updateCampaign(req.params.id, { name, status, completedCount });
      return res.json(updated);
    } catch (error: any) {
      console.error("Update campaign error:", error);
      return res.status(500).json({ message: "Failed to update campaign" });
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

  // ─── AI Message Generation ───

  app.post("/api/ai/generate-message", requireAuth, async (req: Request, res: Response) => {
    try {
      const { messageType, customerContext, strategyProfile, escalationStage, channel } = req.body;
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

      const systemPrompt = `You are a professional message writer for a residential cleaning business. Generate a ${msgChannel} message. Strategy: ${profile}. Escalation stage: ${stage} of 4. Message type: ${messageType}. Keep it ${tone} based on profile. ${lengthInstruction} Never be rude. Use the customer's first name.`;

      const userPrompt = `Customer first name: ${customerContext?.firstName || "there"}. ${customerContext?.quoteTotal ? `Quote total: $${customerContext.quoteTotal}.` : ""} ${customerContext?.serviceType ? `Service type: ${customerContext.serviceType}.` : ""} ${customerContext?.lastServiceDate ? `Last service date: ${customerContext.lastServiceDate}.` : ""} ${customerContext?.homeSize ? `Home size: ${customerContext.homeSize}.` : ""}`;

      const completion = await openai.chat.completions.create({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      const generatedMessage = completion.choices[0]?.message?.content?.trim() || "";
      return res.json({ message: generatedMessage, channel: msgChannel });
    } catch (error: any) {
      console.error("AI generate message error:", error);
      return res.status(500).json({ message: "Failed to generate message" });
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
