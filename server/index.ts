import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcryptjs";
import { pool } from "./db";
import { processDripQueue } from "./dripEmails";
import { processChurnSignals } from "./analytics";

const app = express();
const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    const origin = req.header("origin");

    // Allow localhost origins for Expo web development (any port)
    const isLocalhost =
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:");

    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      limit: "10mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, req: Request, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host") || "";
  const currentBaseUrl = `${protocol}://${host}`;

  let manifest = fs.readFileSync(manifestPath, "utf-8");
  manifest = manifest.replace(/https?:\/\/[^/"]+/g, (match) => {
    try {
      const url = new URL(match);
      if (url.hostname.includes("replit") || url.hostname.includes("picard")) {
        return currentBaseUrl;
      }
    } catch {}
    return match;
  });

  const parsed = JSON.parse(manifest);
  if (parsed.extra?.expoClient?.hostUri) {
    parsed.extra.expoClient.hostUri = host + "/" + platform;
  }
  if (parsed.extra?.expoGo?.debuggerHost) {
    parsed.extra.expoGo.debuggerHost = host + "/" + platform;
  }

  res.send(JSON.stringify(parsed));
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  log("Serving static Expo files with dynamic manifest routing");

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/q/") || req.path === "/privacy" || req.path === "/terms") {
      return next();
    }

    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, req, res);
    }

    if (req.path === "/") {
      const host = req.hostname || req.headers.host || "";
      if (host.startsWith("app.")) {
        return res.redirect("/app");
      }
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName,
      });
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  const webDistPath = path.resolve(process.cwd(), "web", "dist");
  if (fs.existsSync(webDistPath)) {
    app.use("/app", express.static(webDistPath));
    // /request/:slug — branded public lead capture redirect
    app.get("/request/:slug", async (req: Request, res: Response) => {
      const slug = req.params.slug?.toLowerCase().trim();
      if (!slug) return res.redirect("/");
      try {
        const { pool } = await import("./db");
        const r = await pool.query(
          `SELECT intake_code, public_quote_enabled, company_name FROM businesses WHERE public_quote_slug = $1 LIMIT 1`,
          [slug]
        );
        if (!r.rows.length) {
          return res.status(404).type("html").send(`<!DOCTYPE html><html><head><title>Not Found</title></head><body style="font-family:sans-serif;text-align:center;padding:80px 20px"><h2>Quote Request Page Not Found</h2><p>This link may have changed or been removed.</p></body></html>`);
        }
        let { intake_code, public_quote_enabled, company_name } = r.rows[0];
        if (!public_quote_enabled) {
          return res.status(410).type("html").send(`<!DOCTYPE html><html><head><title>Not Available</title></head><body style="font-family:sans-serif;text-align:center;padding:80px 20px"><h2>${company_name}</h2><p>Online quote requests are currently turned off.</p></body></html>`);
        }
        // If intake_code is null (business created before migration), use slug as fallback identifier
        // and generate a code in the background for next time
        if (!intake_code) {
          try {
            const biz = await pool.query(`SELECT id FROM businesses WHERE public_quote_slug = $1 LIMIT 1`, [slug]);
            if (biz.rows[0]?.id) {
              const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
              let newCode = "";
              for (let i = 0; i < 8; i++) newCode += chars[Math.floor(Math.random() * chars.length)];
              await pool.query(`UPDATE businesses SET intake_code = $1 WHERE id = $2 AND (intake_code IS NULL)`, [newCode, biz.rows[0].id]);
              intake_code = newCode;
            }
          } catch (_) {}
          if (!intake_code) {
            return res.redirect(302, `/intake/${slug}`);
          }
        }
        return res.redirect(302, `/intake/${intake_code}`);
      } catch (e) {
        return res.redirect(`/intake/${slug}`);
      }
    });

    app.use(async (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/app") || req.path.startsWith("/intake/")) {
        const indexPath = path.join(webDistPath, "index.html");
        if (fs.existsSync(indexPath)) {
          if (req.path.startsWith("/intake/")) {
            try {
              const code = req.path.split("/intake/")[1]?.split("/")[0];
              let title = "Quick Quote Form";
              if (code) {
                const { pool } = await import("./db");
                const r = await pool.query(
                  `SELECT company_name FROM businesses WHERE intake_code = $1 OR id = $1 LIMIT 1`,
                  [code]
                );
                if (r.rows[0]?.company_name) {
                  title = `${r.rows[0].company_name} — Quick Quote Form`;
                }
              }
              let html = fs.readFileSync(indexPath, "utf8");
              html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
              return res.type("html").send(html);
            } catch {
              return res.sendFile(indexPath);
            }
          }
          return res.sendFile(indexPath);
        }
      }
      next();
    });
    log("Web app: serving from /app");
  }

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });
}

async function seedDemoUser() {
  try {
    const email = "demo@quotepro.com";
    const password = "Demo1234!";
    const existing = await pool.query(`SELECT id FROM users WHERE LOWER(email) = $1`, [email]);
    let userId: string;
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      await pool.query(
        `UPDATE users SET subscription_tier = 'pro' WHERE LOWER(email) = $1`,
        [email]
      );
      log(`Demo account refreshed: ${email}`);
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
      userId = (await pool.query(`SELECT gen_random_uuid() AS id`)).rows[0].id;
      await pool.query(
        `INSERT INTO users (id, email, password_hash, name, subscription_tier, created_at)
         VALUES ($1, $2, $3, $4, 'pro', NOW())`,
        [userId, email, passwordHash, "Demo User"]
      );
      log(`Demo account created: ${email} / ${password}`);
    }
    // Ensure the demo user has a business profile
    const biz = await pool.query(`SELECT id FROM businesses WHERE owner_user_id = $1 LIMIT 1`, [userId]);
    if (biz.rows.length === 0) {
      const bizId = (await pool.query(`SELECT gen_random_uuid() AS id`)).rows[0].id;
      await pool.query(
        `INSERT INTO businesses (id, owner_user_id, company_name, sender_name, sender_title, booking_link, email_signature, sms_signature, primary_color, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [bizId, userId, "Demo Cleaning Co", "Demo User", "Owner", "", "", "", "#6366f1"]
      );
      log(`Demo business profile created for: ${email}`);
    }
  } catch (e: any) {
    console.error("seedDemoUser error:", e.message);
  }
}

(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  await seedDemoUser();

  // ─── Nightly auto-purge: hard-delete records soft-deleted more than 30 days ago ──
  async function purgeSoftDeleted() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    try {
      const [custResult, quoteResult] = await Promise.all([
        pool.query(
          `DELETE FROM customers WHERE deleted_at IS NOT NULL AND deleted_at < $1`,
          [cutoff]
        ),
        pool.query(
          `DELETE FROM quotes WHERE deleted_at IS NOT NULL AND deleted_at < $1`,
          [cutoff]
        ),
      ]);
      const customersPurged = custResult.rowCount ?? 0;
      const quotesPurged = quoteResult.rowCount ?? 0;
      if (customersPurged > 0 || quotesPurged > 0) {
        log(`[purge] Nightly purge: ${customersPurged} customers, ${quotesPurged} quotes permanently deleted`);
      }
    } catch (e: any) {
      console.error("[purge] Nightly purge failed:", e.message);
    }
  }

  // Run once at startup (catches any overdue records), then every 24 hours
  purgeSoftDeleted();
  setInterval(purgeSoftDeleted, 24 * 60 * 60 * 1000);

  // ─── Analytics events TTL cron: delete events older than 90 days ─────────────
  // Runs every Sunday at 2am (checks every hour, fires on Sunday 2am).
  function scheduleAnalyticsTTL() {
    const now = new Date();
    const msTillNextCheck = 60 * 60 * 1000; // check every hour
    setInterval(async () => {
      const d = new Date();
      if (d.getDay() === 0 && d.getHours() === 2) {
        try {
          const result = await pool.query(
            `DELETE FROM analytics_events WHERE created_at < NOW() - INTERVAL '90 days'`
          );
          const deleted = result.rowCount ?? 0;
          log(`[analytics-ttl] Purged ${deleted} analytics events older than 90 days`);
        } catch (e: any) {
          console.error("[analytics-ttl] Purge failed:", e.message);
        }
      }
    }, msTillNextCheck);
  }
  scheduleAnalyticsTTL();
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Trial drip email cron: fires daily at 9am ────────────────────────────
  function scheduleDripCron() {
    setInterval(async () => {
      const d = new Date();
      if (d.getHours() === 9 && d.getMinutes() < 60) {
        try {
          await processDripQueue();
        } catch (e: any) {
          console.error("[drip] Cron failed:", e.message);
        }
      }
    }, 60 * 60 * 1000); // check every hour
  }
  scheduleDripCron();

  // ─── Churn signal cron: fires daily at 8am ───────────────────────────────
  function scheduleChurnCron() {
    const now = new Date();
    const next8am = new Date(now);
    next8am.setHours(8, 0, 0, 0);
    if (next8am <= now) next8am.setDate(next8am.getDate() + 1);
    const msUntil8am = next8am.getTime() - now.getTime();
    setTimeout(() => {
      processChurnSignals().catch((e: any) => console.error("Churn cron error:", e));
      setInterval(() => {
        processChurnSignals().catch((e: any) => console.error("Churn cron error:", e));
      }, 24 * 60 * 60 * 1000);
    }, msUntil8am);
  }
  scheduleChurnCron();
  // ─────────────────────────────────────────────────────────────────────────────

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`express server serving on port ${port}`);
    },
  );
})();
