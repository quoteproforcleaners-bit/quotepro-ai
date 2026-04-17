import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express, { type Request, type Response, type NextFunction } from "express";
import type { AddressInfo } from "net";
import type { Server } from "http";
import type { Store, ClientRateLimitInfo, Options } from "express-rate-limit";
import {
  createQuoteEmailLimiter,
  QUOTE_EMAIL_RATE_LIMIT_MAX,
  QUOTE_EMAIL_RATE_LIMIT_MESSAGE,
} from "./quoteEmailLimiter";

declare module "express-serve-static-core" {
  interface Request {
    session?: { userId?: string };
  }
}

function createMemoryStore(): Store {
  const counters = new Map<string, { count: number; expiresAt: number }>();
  let windowMs = 60_000;
  return {
    init(opts: Options) {
      windowMs = opts.windowMs;
    },
    async increment(key: string): Promise<ClientRateLimitInfo> {
      const now = Date.now();
      const existing = counters.get(key);
      if (!existing || existing.expiresAt <= now) {
        const fresh = { count: 1, expiresAt: now + windowMs };
        counters.set(key, fresh);
        return { totalHits: 1, resetTime: new Date(fresh.expiresAt) };
      }
      existing.count += 1;
      return { totalHits: existing.count, resetTime: new Date(existing.expiresAt) };
    },
    async decrement(key: string) {
      const existing = counters.get(key);
      if (existing) existing.count = Math.max(0, existing.count - 1);
    },
    async resetKey(key: string) {
      counters.delete(key);
    },
    async resetAll() {
      counters.clear();
    },
  };
}

// Builds an Express app sharing one limiter+store, where the session userId
// is read from an `x-test-user` header so a single app/store can serve
// requests from multiple simulated users.
function buildSharedTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const headerUser = req.header("x-test-user");
    req.session = { userId: headerUser ?? "anonymous" };
    next();
  });
  const limiter = createQuoteEmailLimiter(createMemoryStore());
  const ok = (_req: Request, res: Response) => res.json({ ok: true });
  app.post("/quotes/:id/send-with-pdf", limiter, ok);
  app.post("/quotes/:id/onboarding-send", limiter, ok);
  return app;
}

async function startServer(app: express.Express): Promise<{ server: Server; baseUrl: string }> {
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function postAs(baseUrl: string, userId: string, path: string) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-test-user": userId,
    },
    body: JSON.stringify({ to: "customer@example.com" }),
  });
}

describe("quote email rate limiter", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    ({ server, baseUrl } = await startServer(buildSharedTestApp()));
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("blocks the 6th request with HTTP 429 when mixing both quote email endpoints under one session", async () => {
    const userId = "user-rate-limit-test";
    const calls = [
      "/quotes/q1/send-with-pdf",
      "/quotes/q1/onboarding-send",
      "/quotes/q2/send-with-pdf",
      "/quotes/q2/onboarding-send",
      "/quotes/q3/send-with-pdf",
      "/quotes/q3/onboarding-send", // 6th — should be blocked
    ];

    expect(calls.length).toBe(QUOTE_EMAIL_RATE_LIMIT_MAX + 1);

    const responses: Response[] = [];
    for (const path of calls) {
      responses.push(await postAs(baseUrl, userId, path));
    }

    const statuses = responses.map((r) => r.status);
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);

    const blockedBody = await responses[5].json();
    expect(blockedBody).toEqual(QUOTE_EMAIL_RATE_LIMIT_MESSAGE);
  });

  it("scopes the limit per session userId on the same limiter instance", async () => {
    // Burn through the limit for one user, then confirm a different user on
    // the SAME app/limiter/store is unaffected.
    const heavyUser = "user-heavy";
    for (let i = 0; i < QUOTE_EMAIL_RATE_LIMIT_MAX; i++) {
      const res = await postAs(baseUrl, heavyUser, "/quotes/q-heavy/send-with-pdf");
      expect(res.status).toBe(200);
    }
    const blocked = await postAs(baseUrl, heavyUser, "/quotes/q-heavy/onboarding-send");
    expect(blocked.status).toBe(429);

    const otherUser = "user-fresh";
    const otherRes = await postAs(baseUrl, otherUser, "/quotes/q-fresh/send-with-pdf");
    expect(otherRes.status).toBe(200);
  });
});
