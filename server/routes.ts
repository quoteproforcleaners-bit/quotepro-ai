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
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { initStripeClient } from "./clients";
import { expireOldQuotes } from "./storage";
import {
  processPendingFollowUps,
  sendStaleQuoteNudges,
  sendWeeklyDigestEmails,
} from "./helpers";

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

// ─── Group B — multi-domain routers (all mounted at /api) ─────────────────────
import authRouter from "./routers/authRouter";             // /api/auth/*, /api/consent, /api/crash-report
import quotesRouter from "./routers/quotesRouter";         // /api/quotes/*, /api/commercial/*
import customersRouter from "./routers/customersRouter";   // /api/customers/*, /api/intake-requests/*
import jobsRouter from "./routers/jobsRouter";             // /api/jobs/*, /api/schedule/*, /api/dispatch/*
import businessRouter from "./routers/businessRouter";     // /api/business/*, /api/subscription/*, /api/settings, /api/preferences, /api/files, /api/tasks, /api/referrals, /api/badges, /api/communications, /api/analytics, /api/geocode, /api/lead-link, /api/tip-settings, /api/tips
import aiRouter from "./routers/aiRouter";                 // /api/ai/*, /api/send/*
import automationsRouter from "./routers/automationsRouter"; // /api/automations, /api/social/*, /api/streaks
import integrationsRouter from "./routers/integrationsRouter"; // /api/google-calendar/*, /api/stripe/*, /api/api-keys, /api/webhook-endpoints, /api/internal/*

// ─── Group C — hybrid routers with static pages (mounted at root) ─────────────
import publicRouter from "./routers/publicRouter";         // /api/public/*, /q, /privacy, /terms, /calculators
import portalRouter from "./routers/portalRouter";         // /api/portal/*, /portal-manifest/*, /api/portal-stats

import { processAutopilotJobs } from "./services/autopilotService";

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

  // 4. Mount Group B — multi-domain routers at /api
  app.use("/api", authRouter);
  app.use("/api", quotesRouter);
  app.use("/api", customersRouter);
  app.use("/api", jobsRouter);
  app.use("/api", aiRouter);
  app.use("/api", automationsRouter);
  app.use("/api", integrationsRouter);
  app.use("/api", businessRouter);

  // 5. Mount Group C — hybrid routers at root (API + static pages)
  app.use(publicRouter);
  app.use(portalRouter);

  // 6. HTTP server
  const httpServer = createServer(app);

  // 7. Background workers
  // — 15-minute Autopilot cron
  setInterval(async () => {
    try {
      await processAutopilotJobs();
    } catch (e) {
      console.error("[autopilot] Cron error:", e);
    }
  }, 15 * 60 * 1000);

  // — Hourly cron
  let isWorkerRunning = false;
  setInterval(async () => {
    if (isWorkerRunning) {
      console.warn("Background worker tick skipped — previous run still in progress");
      return;
    }
    isWorkerRunning = true;
    try {
      await expireOldQuotes();
      const { sent, canceled } = await processPendingFollowUps();
      if (sent > 0 || canceled > 0) {
        console.log(`Follow-ups processed: ${sent} sent, ${canceled} canceled`);
      }
      await sendStaleQuoteNudges();
      await sendWeeklyDigestEmails();
      if ((app as any).__leadFinderWorker) {
        await (app as any).__leadFinderWorker();
      }
    } catch (e) {
      console.error("Background worker error:", e);
    } finally {
      isWorkerRunning = false;
    }
  }, 60 * 60 * 1000);

  return httpServer;
}
