import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcryptjs";
import { pool } from "./db";
import { processDripQueue } from "./dripEmails";
import { processChurnSignals, computeAndUpdateChurnScores } from "./analytics";
import { sendPush } from "./pushNotifications";
import { initNotificationTables, runNotificationScheduler } from "./notificationScheduler";
import { runAppointmentReminderScheduler, runTipRequestScheduler } from "./appointmentReminderScheduler";
import { runCleanerNotificationScheduler } from "./cleanerNotificationScheduler";
import { seedPristineHomeDemo } from "./seedPristineDemo";
import { initPortalTables, backfillPortalTokens } from "./routers/portalRouter";

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
    // /request/:slug — branded public lead link microsite (served as SPA)
    app.get("/request/:slug", async (req: Request, res: Response) => {
      const slug = req.params.slug?.toLowerCase().trim();
      if (!slug) return res.redirect("/");
      const indexPath = path.join(webDistPath, "index.html");
      if (!fs.existsSync(indexPath)) return res.redirect(`/intake/${slug}`);
      try {
        const { pool } = await import("./db");
        const r = await pool.query(
          `SELECT company_name FROM businesses WHERE public_quote_slug = $1 LIMIT 1`,
          [slug]
        );
        let html = fs.readFileSync(indexPath, "utf8");
        if (r.rows[0]?.company_name) {
          html = html.replace(/<title>[^<]*<\/title>/, `<title>${r.rows[0].company_name} — Get a Free Quote</title>`);
        }
        return res.type("html").send(html);
      } catch {
        return res.sendFile(indexPath);
      }
    });

    // /home/:token — Customer portal with OG meta tag injection
    app.get("/home/:token", async (req: Request, res: Response) => {
      const { token } = req.params;
      const indexPath = path.join(webDistPath, "index.html");
      if (!fs.existsSync(indexPath)) return res.status(404).send("Not found");
      try {
        const { pool } = await import("./db");
        const r = await pool.query(
          `SELECT b.company_name, b.logo_uri,
                  (SELECT jp.photo_url FROM job_photos jp
                   JOIN jobs j ON jp.job_id = j.id
                   WHERE j.customer_id = cp.customer_id
                     AND jp.photo_type = 'after'
                     AND jp.customer_visible = true
                   ORDER BY j.completed_at DESC LIMIT 1) AS last_after_photo
           FROM customer_portals cp
           JOIN businesses b ON cp.business_id = b.id
           WHERE cp.token = $1 LIMIT 1`,
          [token]
        );
        let html = fs.readFileSync(indexPath, "utf8");
        const row = r.rows[0];
        if (row) {
          const ogTitle = `${row.company_name} — Your Cleaning Portal`;
          const ogDesc = "View your upcoming clean, photos from your last visit, and more.";
          const ogImage = row.last_after_photo || row.logo_uri || "";
          const ogTags = [
            `<meta property="og:title" content="${ogTitle.replace(/"/g, "&quot;")}">`,
            `<meta property="og:description" content="${ogDesc}">`,
            `<meta property="og:image" content="${ogImage}">`,
            `<meta property="og:type" content="website">`,
            `<meta name="twitter:card" content="summary_large_image">`,
            `<meta name="twitter:title" content="${ogTitle.replace(/"/g, "&quot;")}">`,
            `<meta name="twitter:description" content="${ogDesc}">`,
            ogImage ? `<meta name="twitter:image" content="${ogImage}">` : "",
            `<title>${ogTitle}</title>`,
          ].filter(Boolean).join("\n    ");
          html = html.replace(/<title>[^<]*<\/title>/, ogTags);
        }
        return res.type("html").send(html);
      } catch {
        return res.sendFile(indexPath);
      }
    });

    // /home/:token/* — sub-pages of portal (preferences, reschedule, etc.)
    app.get("/home/:token/:subpage", (_req: Request, res: Response) => {
      const indexPath = path.join(webDistPath, "index.html");
      if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
      res.status(404).send("Not found");
    });

    // /tip/:token — customer tip page (public, uses same React SPA)
    app.get("/tip/:token", (_req: Request, res: Response) => {
      const indexPath = path.join(webDistPath, "index.html");
      if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
      res.status(404).send("Not found");
    });

    // Top-level web app routes that need SPA fallback (for direct navigation & ad tracking)
    const TOP_LEVEL_SPA_ROUTES = [
      "/pricing/success", "/pricing/cancel", "/pricing", "/upgrade",
      "/subscription/success", "/register", "/login", "/dashboard",
      "/onboarding", "/quote-doctor",
    ];
    for (const route of TOP_LEVEL_SPA_ROUTES) {
      app.get(route, (_req: Request, res: Response) => {
        const indexPath = path.join(webDistPath, "index.html");
        if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
        res.status(404).send("Not found");
      });
    }

    // Public commercial cleaning calculator — inject SEO meta tags server-side
    app.get("/commercial-cleaning-calculator", (_req: Request, res: Response) => {
      const indexPath = path.join(webDistPath, "index.html");
      if (!fs.existsSync(indexPath)) return res.status(404).send("Not found");
      let html = fs.readFileSync(indexPath, "utf8");
      const title = "Commercial Cleaning Cost Calculator 2026 | Free Janitorial Quote Tool";
      const desc  = "Free commercial cleaning cost calculator. Instant janitorial quotes based on ISSA 2025 production rates. Compare to national averages. Covers offices, medical, retail, gyms, schools & warehouses.";
      html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
      // Inject canonical + og meta before </head>
      const seoTags = [
        `<meta name="description" content="${desc}">`,
        `<meta property="og:title" content="${title}">`,
        `<meta property="og:description" content="${desc}">`,
        `<meta property="og:type" content="website">`,
        `<meta name="robots" content="index, follow">`,
        `<link rel="canonical" href="https://quotepro.ai/commercial-cleaning-calculator">`,
      ].join("\n    ");
      html = html.replace("</head>", `    ${seoTags}\n</head>`);
      res.type("html").send(html);
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

async function seedToDoDemo() {
  try {
    const email = "todo@quotepro.com";
    const password = "Demo1234!";
    const existing = await pool.query(`SELECT id FROM users WHERE LOWER(email) = $1`, [email]);
    let userId: string;
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      await pool.query(`UPDATE users SET subscription_tier = 'pro' WHERE LOWER(email) = $1`, [email]);
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
      userId = (await pool.query(`SELECT gen_random_uuid() AS id`)).rows[0].id;
      await pool.query(
        `INSERT INTO users (id, email, password_hash, name, subscription_tier, created_at)
         VALUES ($1, $2, $3, $4, 'pro', NOW())`,
        [userId, email, passwordHash, "Demo User"]
      );
    }
    const biz = await pool.query(`SELECT id FROM businesses WHERE owner_user_id = $1 LIMIT 1`, [userId]);
    if (biz.rows.length === 0) {
      const bizId = (await pool.query(`SELECT gen_random_uuid() AS id`)).rows[0].id;
      await pool.query(
        `INSERT INTO businesses (id, owner_user_id, company_name, sender_name, sender_title, booking_link, email_signature, sms_signature, primary_color, onboarding_complete, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW())`,
        [bizId, userId, "To-Do List Cleaning Service", "Demo User", "Owner", "", "", "", "#6366f1"]
      );
    } else {
      await pool.query(
        `UPDATE businesses SET company_name = 'To-Do List Cleaning Service', onboarding_complete = true WHERE owner_user_id = $1`,
        [userId]
      );
    }
    log(`To-Do demo account ready: ${email} / ${password}`);
  } catch (e: any) {
    console.error("seedToDoDemo error:", e.message);
  }
}

(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  // ─── Demo accounts ────────────────────────────────────────────────────────────
  seedPristineHomeDemo();

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

  // ─── Churn RISK SCORING cron: fires daily at 6am ─────────────────────────
  function scheduleChurnScoringCron() {
    const now = new Date();
    const next6am = new Date(now);
    next6am.setHours(6, 0, 0, 0);
    if (next6am <= now) next6am.setDate(next6am.getDate() + 1);
    const msUntil6am = next6am.getTime() - now.getTime();
    setTimeout(() => {
      computeAndUpdateChurnScores().catch((e: any) => console.error("[churn-score] Cron error:", e));
      setInterval(() => {
        computeAndUpdateChurnScores().catch((e: any) => console.error("[churn-score] Cron error:", e));
      }, 24 * 60 * 60 * 1000);
    }, msUntil6am);
  }
  scheduleChurnScoringCron();

  // ─── Follow-up queue push: daily 8:30am, once per day if queue > 0 ────────
  function scheduleFollowUpQueuePushCron() {
    setInterval(async () => {
      try {
        const d = new Date();
        if (d.getHours() !== 8 || d.getMinutes() > 30) return;
        // Get each business with pending follow-up communications
        const result = await pool.query(
          `SELECT b.owner_user_id, b.id as business_id,
                  COUNT(c.id) as queue_count
           FROM businesses b
           JOIN push_tokens pt ON pt.user_id = b.owner_user_id
           JOIN communications c ON c.business_id = b.id
             AND c.status = 'scheduled'
             AND c.scheduled_for <= NOW() + INTERVAL '24 hours'
             AND c.quote_id IS NOT NULL
           GROUP BY b.owner_user_id, b.id
           HAVING COUNT(c.id) > 0`
        );
        for (const row of result.rows) {
          const n = Number(row.queue_count);
          sendPush(row.owner_user_id, {
            title: `${n} quote${n !== 1 ? "s" : ""} need follow-up today`,
            body: "Your AI is ready to send follow-ups. Tap to review and send.",
            data: { screen: "FollowUpQueue" },
            channel: "quotes",
          }).catch(() => {});
        }
      } catch (e: any) {
        console.error("[followup-push] Error:", e.message);
      }
    }, 60 * 60 * 1000);
  }
  scheduleFollowUpQueuePushCron();

  // ─── Job starting soon: checks every 30 min, pushes 1h before job ────────
  function scheduleJobStartingSoonCron() {
    setInterval(async () => {
      try {
        const now = new Date();
        const in60 = new Date(now.getTime() + 60 * 60 * 1000);
        const in75 = new Date(now.getTime() + 75 * 60 * 1000);
        const result = await pool.query(
          `SELECT j.id, j.scheduled_date, j.scheduled_time, j.address,
                  b.owner_user_id,
                  c.first_name, c.last_name,
                  j.push_notified_starting_soon
           FROM jobs j
           JOIN businesses b ON b.id = j.business_id
           LEFT JOIN customers c ON c.id = j.customer_id
           WHERE j.status IN ('scheduled','confirmed')
             AND j.scheduled_date IS NOT NULL
             AND CONCAT(j.scheduled_date::text, ' ', COALESCE(j.scheduled_time, '09:00'))::timestamp BETWEEN $1 AND $2
             AND (j.push_notified_starting_soon IS NULL OR j.push_notified_starting_soon = false)`,
          [in60, in75]
        ).catch(() => ({ rows: [] }));
        for (const row of result.rows) {
          const customerName = [row.first_name, row.last_name].filter(Boolean).join(" ") || "Your customer";
          const addressShort = (row.address || "").split(",")[0] || "the job site";
          sendPush(row.owner_user_id, {
            title: "Job starting in 1 hour",
            body: `${customerName} at ${addressShort}. Tap to see the checklist.`,
            data: { screen: "JobDetail", jobId: row.id },
            channel: "jobs",
          }).catch(() => {});
          await pool.query(
            `UPDATE jobs SET push_notified_starting_soon = true WHERE id = $1`,
            [row.id]
          ).catch(() => {});
        }
      } catch (e: any) {
        console.error("[job-push] Error:", e.message);
      }
    }, 30 * 60 * 1000);
  }
  scheduleJobStartingSoonCron();

  // ─── Weekly revenue recap PUSH: Sunday 6pm ────────────────────────────────
  function scheduleWeeklyRecapPushCron() {
    setInterval(async () => {
      try {
        const d = new Date();
        if (d.getDay() !== 0) return;       // Sunday only
        if (d.getHours() !== 18) return;    // 6pm only
        if (d.getMinutes() > 30) return;    // within first 30 min of the hour

        const result = await pool.query(
          `SELECT DISTINCT b.owner_user_id, b.id as business_id, b.company_name,
                  up.weekly_recap_enabled,
                  (SELECT COUNT(*) FROM quotes q WHERE q.business_id = b.id
                   AND q.created_at > NOW() - INTERVAL '7 days') as quotes_sent,
                  (SELECT COALESCE(SUM(q.total),0) FROM quotes q WHERE q.business_id = b.id
                   AND q.status = 'accepted' AND q.updated_at > NOW() - INTERVAL '7 days') as revenue_won
           FROM businesses b
           JOIN push_tokens pt ON pt.user_id = b.owner_user_id
           LEFT JOIN user_preferences up ON up.business_id = b.id
           WHERE (up.weekly_recap_enabled IS NULL OR up.weekly_recap_enabled = true)`
        );
        for (const row of result.rows) {
          const quotesSent = Number(row.quotes_sent) || 0;
          const revenueWon = Number(row.revenue_won) || 0;

          // Try AI-personalized insight, fall back to template
          let recapBody: string;
          try {
            const { openai } = await import("./clients");
            const [jobsRes, followUpsRes] = await Promise.all([
              pool.query(
                `SELECT COUNT(*) AS c FROM jobs WHERE business_id = $1 AND status = 'completed' AND updated_at > NOW() - INTERVAL '7 days'`,
                [row.business_id]
              ),
              pool.query(
                `SELECT COUNT(*) AS c FROM communications WHERE business_id = $1 AND status = 'sent' AND created_at > NOW() - INTERVAL '7 days'`,
                [row.business_id]
              ),
            ]);
            const jobsCompleted = Number(jobsRes.rows[0]?.c) || 0;
            const followUpsSent = Number(followUpsRes.rows[0]?.c) || 0;

            const completion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [{
                role: "user",
                content: `Write a 1-sentence motivational weekly recap for a cleaning business. Stats: ${quotesSent} quotes sent, $${revenueWon.toFixed(0)} revenue won, ${jobsCompleted} jobs completed, ${followUpsSent} follow-ups sent. Be specific to the numbers. Max 120 chars.`,
              }],
              max_completion_tokens: 60,
            });
            recapBody = completion.choices[0]?.message?.content?.trim() ||
              (quotesSent > 0
                ? `You sent ${quotesSent} quote${quotesSent !== 1 ? "s" : ""} and earned $${revenueWon.toFixed(0)} this week.`
                : "Ready to review your week and plan the next one?");
          } catch {
            // Template fallback
            if (quotesSent > 0 && revenueWon > 0) {
              recapBody = `${quotesSent} quote${quotesSent !== 1 ? "s" : ""} sent, $${revenueWon.toFixed(0)} won — great week!`;
            } else if (quotesSent > 0) {
              recapBody = `${quotesSent} quote${quotesSent !== 1 ? "s" : ""} out this week. Follow up on open ones to close more.`;
            } else {
              recapBody = "Send a follow-up on your open quotes to close more jobs this week.";
            }
          }

          sendPush(row.owner_user_id, {
            title: "Your week in review",
            body: recapBody,
            data: { screen: "Dashboard" },
            channel: "growth",
          }).catch(() => {});
        }
      } catch (e: any) {
        console.error("[weekly-push] Error:", e.message);
      }
    }, 60 * 60 * 1000);
  }
  scheduleWeeklyRecapPushCron();
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Customer portal tables + token backfill ─────────────────────────────
  await initPortalTables();
  backfillPortalTokens().catch((e: any) => console.error("[portal] Backfill error:", e.message));
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Smart notification trigger scheduler: runs every 5 minutes ──────────
  await initNotificationTables();
  runNotificationScheduler().catch((e: any) => console.error("[notif-scheduler] Initial run failed:", e.message));
  setInterval(() => {
    runNotificationScheduler().catch((e: any) => console.error("[notif-scheduler] Cron failed:", e.message));
  }, 5 * 60 * 1000);
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Appointment reminder scheduler: runs every hour ─────────────────────
  runAppointmentReminderScheduler().catch((e: any) => console.error("[reminders] Initial run failed:", e.message));
  setInterval(() => {
    runAppointmentReminderScheduler().catch((e: any) => console.error("[reminders] Cron failed:", e.message));
  }, 60 * 60 * 1000);

  // ─── Cleaner notification scheduler: runs every hour ─────────────────────
  runCleanerNotificationScheduler().catch((e: any) => console.error("[cleaner-notifications] Initial run failed:", e.message));
  setInterval(() => {
    runCleanerNotificationScheduler().catch((e: any) => console.error("[cleaner-notifications] Cron failed:", e.message));
  }, 60 * 60 * 1000);

  // ─── Tip request scheduler: runs every hour ───────────────────────────────
  runTipRequestScheduler().catch((e: any) => console.error("[tips] Initial run failed:", e.message));
  setInterval(() => {
    runTipRequestScheduler().catch((e: any) => console.error("[tips] Cron failed:", e.message));
  }, 60 * 60 * 1000);
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
