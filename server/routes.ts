/**
 * server/routes.ts — Route Registry
 *
 * Mounts all domain routers onto the Express app.
 * Business logic lives in server/routers/<domain>Router.ts
 *
 * ─── Mount strategy ───────────────────────────────────────────────────────────
 *
 * Group A — pure single-domain routers
 *   Each router defines paths relative to its mount prefix.
 *   e.g. pricingRouter has router.get("/", ...) and router.get("/:id", ...)
 *        mounted at /api/pricing → handles GET /api/pricing and GET /api/pricing/:id
 *
 * Group B — multi-domain routers (mounted at /api)
 *   These routers span several path families under /api.
 *   e.g. businessRouter handles /api/business, /api/subscription, /api/settings, etc.
 *   Internal paths are relative to /api (no /api/ prefix in route strings).
 *
 * Group C — hybrid routers with static pages (mounted at root)
 *   publicRouter: /api/public/* API routes + /privacy, /terms, /calculators HTML pages
 *   portalRouter: /api/portal/* API routes + /portal-manifest/* routes
 */

import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { acquireLock, releaseLock } from "./lockManager";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { initStripeClient } from "./clients";
import { expireOldQuotes } from "./storage";
import {
  processPendingFollowUps,
  sendStaleQuoteNudges,
  sendWeeklyDigestEmails,
  sendActivationNudges,
  generateRecurringJobs,
  sendWinLossFollowUps,
} from "./helpers";
import { processDeferredReferralCredits } from "./cron/referralCredits";

// ─── Payment + Intelligence routers ──────────────────────────────────────────
import paymentsRouter from "./routers/paymentsRouter";     // → /api/payments
import financeAIRouter from "./routers/financeAIRouter";   // → /api/intelligence

// ─── Group A — pure single-domain routers ─────────────────────────────────────
import adminRouter from "./routers/adminRouter";           // → /api/admin
import npsRouter from "./routers/npsRouter";               // → /api/nps
import autopilotRouter from "./routers/autopilotRouter";   // → /api/autopilot
import revenuecatRouter from "./routers/revenuecatRouter"; // → /api/webhooks
import employeeRouter from "./routers/employeeRouter";     // → /api/employee
import marketRatesRouter from "./routers/marketRatesRouter"; // → /api/market-rates
import pricingRouter from "./routers/pricingRouter";       // → /api/pricing
import { supportRouter } from "./routers/supportRouter";   // → /api/support
import { quoteDoctorRouter } from "./routers/quoteDoctorRouter"; // → /api/quote-doctor
import recurringRouter from "./routers/recurringRouter";         // → /api/recurring-schedules
import staffRouter from "./routers/staffRouter";                 // → /api/staff/*
import bookingWidgetRouter from "./routers/bookingWidgetRouter"; // → /api/booking/*
import locationsRouter from "./routers/locationsRouter";         // → /api/locations/*
import availabilityRouter from "./routers/availabilityRouter";   // → /api/availability/*
import publicBookingRouter from "./routers/publicBookingRouter"; // → /book/:token, /api/book/:token

// ─── Group B — multi-domain routers (all mounted at /api) ─────────────────────
import authRouter from "./routers/authRouter";             // /api/auth/*, /api/consent, /api/crash-report
import quotesRouter from "./routers/quotesRouter";         // /api/quotes/*, /api/commercial/*
import customersRouter from "./routers/customersRouter";   // /api/customers/*, /api/intake-requests/*
import jobsRouter from "./routers/jobsRouter";             // /api/jobs/*, /api/schedule/*, /api/dispatch/*
import businessRouter from "./routers/businessRouter";     // /api/business/*, /api/subscription/*, /api/settings, /api/preferences, /api/files, /api/tasks, /api/referrals, /api/badges, /api/communications, /api/analytics, /api/geocode, /api/lead-link, /api/tip-settings, /api/tips
import aiRouter from "./routers/ai/index";                  // /api/ai/*, /api/send/*, /api/lead-finder/*
import automationsRouter from "./routers/automationsRouter"; // /api/automations, /api/social/*, /api/streaks
import integrationsRouter from "./routers/integrationsRouter"; // /api/google-calendar/*, /api/stripe/*, /api/api-keys, /api/webhook-endpoints, /api/internal/*
import gbpRouter from "./routers/gbpRouter"; // /api/gbp/*

// ─── Group C — hybrid routers with static pages (mounted at root) ─────────────
import publicRouter from "./routers/publicRouter";         // /api/public/*, /q, /privacy, /terms, /calculators
import portalRouter from "./routers/portalRouter";         // /api/portal/*, /portal-manifest/*, /api/portal-stats
import winLossRouter from "./routers/winLossRouter";       // /feedback/:token (public), /api/win-loss

import { processAutopilotJobs } from "./services/autopilotService";
import cron from "node-cron";
import { buildWidgetJs } from "./widgetTemplate";
import { mcpRouter } from "./mcp/index";

// Session type extension
declare module "express-session" {
  interface SessionData {
    userId: string;
    appleOAuthState?: string;
  }
}

// ─── Session Setup ────────────────────────────────────────────────────────────

function setupSession(app: Express) {
  const PgStore = connectPg(session);
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.REPLIT_DEPLOYMENT === "1";

  if (isProduction) {
    app.set("trust proxy", 1);
  }

  app.use(
    session({
      store: new PgStore({
        pool: pool as any,
        createTableIfMissing: true,
      }),
      secret: (() => {
        const s = process.env.SESSION_SECRET;
        if (!s) {
          throw new Error("[FATAL] SESSION_SECRET environment variable is not set. Set it before starting the server.");
        }
        return s;
      })(),
      name: "quotepro_session",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );
}

// ─── Main Route Registration ──────────────────────────────────────────────────

export async function registerRoutes(app: Express): Promise<Server> {
  // 1. Initialise external clients
  await initStripeClient();

  // 2. Session middleware
  setupSession(app);

  // 3. Mount Group A — pure single-domain routers
  app.use("/api/admin", adminRouter);
  app.use("/api/nps", npsRouter);
  app.use("/api/autopilot", autopilotRouter);
  app.use("/api/webhooks", revenuecatRouter);
  app.use("/api/employee", employeeRouter);
  app.use("/api/market-rates", marketRatesRouter);
  app.use("/api/pricing", pricingRouter);
  app.use("/api/support", supportRouter);
  app.use("/api/quote-doctor", quoteDoctorRouter);
  app.use("/api", recurringRouter);
  app.use("/api", staffRouter);
  app.use("/api/booking", bookingWidgetRouter);
  app.use("/api", locationsRouter);
  app.use("/api/availability", availabilityRouter);
  app.use(publicBookingRouter);

  // 4. Mount Group B — multi-domain routers at /api
  app.use("/api/payments", paymentsRouter);
  app.use("/api/intelligence", financeAIRouter);
  app.use("/api", authRouter);
  app.use("/api", quotesRouter);
  app.use("/api", customersRouter);
  app.use("/api", jobsRouter);
  app.use("/api", aiRouter);
  app.use("/api", automationsRouter);
  app.use("/api", integrationsRouter);
  app.use("/api/gbp", gbpRouter);
  app.use("/api", businessRouter);

  // 5. Mount Group C — hybrid routers at root (API + static pages)
  app.use(publicRouter);
  app.use(portalRouter);
  app.use(winLossRouter);

  // 5c. MCP (Model Context Protocol) server — GET/POST /mcp, GET /mcp/manifest
  app.use("/mcp", mcpRouter);

  // 5b. Booking widget JS — GET /widget/:businessId.js
  app.get("/widget/:businessId.js", async (req, res) => {
    const { businessId } = req.params;
    const baseUrl =
      process.env.REPLIT_DOMAINS?.split(",")[0]
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : "https://app.getquotepro.ai";
    const js = buildWidgetJs(businessId, baseUrl);
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(js);
  });

  // 6. HTTP server
  const httpServer = createServer(app);

  // 7. Background workers
  // — 5-minute Autopilot cron
  setInterval(async () => {
    if (!await acquireLock("autopilot", 4)) return;
    try {
      await processAutopilotJobs();
    } catch (e) {
      console.error("[autopilot] Cron error:", e);
    } finally {
      await releaseLock("autopilot");
    }
  }, 5 * 60 * 1000);

  // — Quote expiry: every hour on the hour
  cron.schedule("0 * * * *", async () => {
    if (!await acquireLock("quote-expiry", 10)) return;
    try {
      await expireOldQuotes();
    } catch (e) {
      console.error("[worker] Quote expiry error:", e);
    } finally {
      await releaseLock("quote-expiry");
    }
  });

  // — Follow-up processing: every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    if (!await acquireLock("follow-up-processing", 25)) return;
    try {
      const { sent, canceled } = await processPendingFollowUps();
      if (sent > 0 || canceled > 0) {
        console.log(`Follow-ups processed: ${sent} sent, ${canceled} canceled`);
      }
    } catch (e) {
      console.error("[worker] Follow-up processing error:", e);
    } finally {
      await releaseLock("follow-up-processing");
    }
  });

  // — Stale quote nudges: daily at 9am
  cron.schedule("0 9 * * *", async () => {
    if (!await acquireLock("stale-quote-nudges", 30)) return;
    try {
      await sendStaleQuoteNudges();
    } catch (e) {
      console.error("[worker] Stale quote nudges error:", e);
    } finally {
      await releaseLock("stale-quote-nudges");
    }
  });

  // — Weekly digest emails: Mondays at 8am
  cron.schedule("0 8 * * 1", async () => {
    if (!await acquireLock("weekly-digest", 60)) return;
    try {
      await sendWeeklyDigestEmails();
    } catch (e) {
      console.error("[worker] Weekly digest emails error:", e);
    } finally {
      await releaseLock("weekly-digest");
    }
  });

  // — Activation nudges, recurring job generation, win-loss follow-ups: every hour
  cron.schedule("0 * * * *", async () => {
    if (!await acquireLock("hourly-jobs", 50)) return;
    try {
      await sendActivationNudges();
      await generateRecurringJobs();
      await sendWinLossFollowUps();
    } catch (e) {
      console.error("[worker] Hourly jobs error:", e);
    } finally {
      await releaseLock("hourly-jobs");
    }
  });

  // — Monthly AI follow-up reset: 1st of month at midnight
  cron.schedule("0 0 1 * *", async () => {
    if (!await acquireLock("monthly-ai-reset", 10)) return;
    try {
      await pool.query("UPDATE users SET ai_follow_ups_used_this_month = 0");
      console.log("[worker] Monthly AI follow-up counter reset");
    } catch (e) {
      console.error("[worker] Monthly AI reset error:", e);
    } finally {
      await releaseLock("monthly-ai-reset");
    }
  });

  // — Analytics TTL cleanup: daily at 2am
  cron.schedule("0 2 * * *", async () => {
    if (!await acquireLock("analytics-ttl", 10)) return;
    try {
      const result = await pool.query(
        `DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '90 days'`
      );
      const deleted = result.rowCount ?? 0;
      console.log(`[analytics-ttl] Purged ${deleted} events older than 90 days`);
    } catch (e) {
      console.error("[analytics-ttl] Purge error:", e);
    } finally {
      await releaseLock("analytics-ttl");
    }
  });

  // — Deferred referral credits: daily at 4am
  cron.schedule("0 4 * * *", async () => {
    if (!await acquireLock("deferred-referral-credits", 15)) return;
    try {
      await processDeferredReferralCredits();
    } catch (e) {
      console.error("[worker] Deferred referral credits error:", e);
    } finally {
      await releaseLock("deferred-referral-credits");
    }
  });

  // — Lead finder worker: every hour on the hour
  cron.schedule("0 * * * *", async () => {
    if (!await acquireLock("lead-finder", 50)) return;
    try {
      if ((app as any).__leadFinderWorker) {
        await (app as any).__leadFinderWorker();
      }
    } catch (e) {
      console.error("[worker] Lead finder error:", e);
    } finally {
      await releaseLock("lead-finder");
    }
  });

  return httpServer;
}
