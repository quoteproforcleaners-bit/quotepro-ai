/**
 * Shared Express middleware for QuotePro.
 *
 * Tier hierarchy (ascending):
 *   free < starter < growth < pro
 *
 * - requireAuth    — any logged-in user
 * - requireStarter — Starter tier or above
 * - requireGrowth  — Growth tier or above (was "requirePro" historically)
 * - requirePro     — Pro tier only
 */

import type { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { pool } from "./db";
import { getUserById } from "./storage";
import { createPgRateLimitStore } from "./rateLimitStore";
import {
  isGrowthOrAbove as _isGrowthOrAbove,
  isStarterOrAbove as _isStarterOrAbove,
} from "../shared/plans";

// ─── Tier helpers — re-exported from shared/plans for backwards compat ─────────

export function isStarterOrAbove(tier: string | null | undefined): boolean {
  return _isStarterOrAbove(tier);
}

export function isGrowthOrAbove(tier: string | null | undefined): boolean {
  return _isGrowthOrAbove(tier);
}

export function isProTier(tier: string | null | undefined): boolean {
  return tier === "pro";
}

// ─── Auth middleware ──────────────────────────────────────────────────────────

/** Requires a valid session. Returns 401 if the user is not logged in. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }
  // Fire-and-forget: never awaited, adds zero latency
  pool.query("UPDATE users SET last_active_at = NOW() WHERE id = $1", [req.session.userId]).catch(() => {});
  next();
}

/** Requires Starter tier or above. */
export async function requireStarter(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getUserById(req.session.userId!);
    if (!user || !isStarterOrAbove(user.subscriptionTier)) {
      res.status(403).json({
        message: "This feature requires a Starter or higher subscription",
        requiresUpgrade: true,
      });
      return;
    }
    next();
  } catch {
    res.status(500).json({ message: "Subscription check failed" });
  }
}

/**
 * Requires Growth tier or above.
 * This was historically named "requirePro" in the codebase before the tier
 * hierarchy was formalised. All Growth-gated routes use this middleware.
 */
export async function requireGrowth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getUserById(req.session.userId!);
    if (!user || !isGrowthOrAbove(user.subscriptionTier)) {
      res.status(403).json({
        message: "This feature requires a Growth or Pro subscription",
        requiresUpgrade: true,
      });
      return;
    }
    next();
  } catch {
    res.status(500).json({ message: "Subscription check failed" });
  }
}

/**
 * Requires Pro tier only.
 * Use for features exclusively available to Pro subscribers.
 */
export async function requirePro(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getUserById(req.session.userId!);
    if (!user || !isProTier(user.subscriptionTier)) {
      res.status(403).json({
        message: "This feature requires a Pro subscription",
        requiresUpgrade: true,
      });
      return;
    }
    next();
  } catch {
    res.status(500).json({ message: "Subscription check failed" });
  }
}

// ─── Rate limiters ────────────────────────────────────────────────────────────

/** General auth limiter: 10 requests per minute per IP. */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Try again later." },
  store: createPgRateLimitStore(pool, "auth:"),
});

/** Strict login limiter: 5 failed attempts per 15 minutes per IP.
 *  Only counts failed requests (skipSuccessfulRequests: true). */
export const loginFailureLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Too many attempts. Try again later." },
  store: createPgRateLimitStore(pool, "login-failure:"),
});
