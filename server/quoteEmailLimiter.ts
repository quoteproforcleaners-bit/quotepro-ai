import rateLimit, { type Store } from "express-rate-limit";
import type { Request } from "express";

export const QUOTE_EMAIL_RATE_LIMIT_MAX = 5;
export const QUOTE_EMAIL_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const QUOTE_EMAIL_RATE_LIMIT_MESSAGE = {
  message: "Too many emails sent. Please wait before sending another.",
};

export function createQuoteEmailLimiter(store?: Store) {
  return rateLimit({
    windowMs: QUOTE_EMAIL_RATE_LIMIT_WINDOW_MS,
    max: QUOTE_EMAIL_RATE_LIMIT_MAX,
    keyGenerator: (req: Request) => String(req.session?.userId ?? "unknown"),
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    message: QUOTE_EMAIL_RATE_LIMIT_MESSAGE,
    ...(store ? { store } : {}),
  });
}
