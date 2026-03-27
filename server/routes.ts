/**
 * server/routes.ts — Route Registry
 *
 * Registers all domain routers onto the Express app.
 * Business logic, route handlers, and helper functions live in:
 *   • server/routers/<domain>Router.ts  — route handlers
 *   • server/helpers.ts                 — shared helper functions
 *   • server/clients.ts                 — shared singletons (openai, stripe, etc.)
 *   • server/middleware.ts              — auth / rate-limit middleware
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

// Domain routers
import adminRouter from "./routers/adminRouter";
import authRouter from "./routers/authRouter";
import quotesRouter from "./routers/quotesRouter";
import customersRouter from "./routers/customersRouter";
import jobsRouter from "./routers/jobsRouter";
import pricingRouter from "./routers/pricingRouter";
import aiRouter from "./routers/aiRouter";
import automationsRouter from "./routers/automationsRouter";
import integrationsRouter from "./routers/integrationsRouter";
import businessRouter from "./routers/businessRouter";
import publicRouter from "./routers/publicRouter";
import revenuecatRouter from "./routers/revenuecatRouter";
import npsRouter from "./routers/npsRouter";
import { quoteDoctorRouter } from "./routers/quoteDoctorRouter";

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

// ─── Main Route Registration ──────────────────────────────────────────────────

export async function registerRoutes(app: Express): Promise<Server> {
  // 1. Initialise external clients
  await initStripeClient();

  // 2. Session middleware
  setupSession(app);

  // 3. Mount domain routers
  app.use(adminRouter);
  app.use(authRouter);
  app.use(quotesRouter);
  app.use(customersRouter);
  app.use(jobsRouter);
  app.use(pricingRouter);
  app.use(aiRouter);
  app.use(automationsRouter);
  app.use(integrationsRouter);
  app.use(businessRouter);
  app.use(revenuecatRouter);
  app.use(npsRouter);
  app.use(quoteDoctorRouter);
  app.use(publicRouter);

  // 4. HTTP server
  const httpServer = createServer(app);

  // 5. Background workers (hourly tick)
  setInterval(async () => {
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
    }
  }, 60 * 60 * 1000);

  return httpServer;
}
