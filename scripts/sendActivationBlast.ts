/**
 * One-shot activation blast: emails non-activated free-tier users on PROD,
 * but is run from this dev environment using SENDGRID_API_KEY + SESSION_SECRET
 * (both global secrets, identical to prod).
 *
 * Usage:
 *   tsx scripts/sendActivationBlast.ts --smoke   # send only to mike@getquotepro.ai
 *   tsx scripts/sendActivationBlast.ts --dry     # list audience, send nothing
 *   tsx scripts/sendActivationBlast.ts           # FIRE for real
 */
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import { Pool } from "pg";

const SESSION_SECRET = process.env.SESSION_SECRET;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
// NOTE: For this founder-voice activation campaign we send from mike@ directly
// (verified sender on the configured SendGrid key). quote@ is the transactional
// sender used by the prod app and is verified on a different key.
const FROM_EMAIL = process.env.ACTIVATION_FROM_EMAIL || "mike@getquotepro.ai";
const APP_URL = "https://app.getquotepro.ai";

if (!SESSION_SECRET) throw new Error("SESSION_SECRET missing");
if (!SENDGRID_API_KEY) throw new Error("SENDGRID_API_KEY missing");

// Allow either PROD_DATABASE_URL override or fall back to DATABASE_URL.
const PROD_DB = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL!;
const pool = new Pool({ connectionString: PROD_DB });

function generateUnsubscribeToken(userId: string) {
  return crypto.createHmac("sha256", SESSION_SECRET!).update(userId).digest("hex");
}
function getFirstName(name: string | null | undefined, email: string): string {
  if (name && name.trim()) return name.trim().split(/\s+/)[0];
  const local = (email || "").split("@")[0];
  return local.replace(/[^a-zA-Z]/g, "").slice(0, 20) || "there";
}

interface User { id: string; email: string; contact_email: string | null; name: string | null; }

async function sendOne(user: User) {
  const effectiveEmail = user.contact_email || user.email;
  const rawFirst = getFirstName(user.name, user.email);
  const greeting = rawFirst && rawFirst.toLowerCase() !== "there" ? `Hi ${rawFirst},` : "Hello,";
  const unsubToken = generateUnsubscribeToken(user.id);
  const unsubUrl = `${APP_URL}/api/email/unsubscribe?uid=${user.id}&token=${unsubToken}`;
  const subject = "Send your first real quote in 2 minutes";

  const plainText = `${greeting}

Saw you signed up for QuotePro AI but haven't sent a real customer quote yet — totally normal, I want to help you get over that first hump.

Here's the 2-minute version:

  1. Open the app and tap "New Quote"
  2. Plug in a real customer's address and what they're asking for (a recurring weekly clean, a deep clean, whatever)
  3. Hit send — your customer gets a clean, branded quote with Good / Better / Best options

That's it. The whole point is to send ONE real quote and watch what happens when your customer accepts. Most owners tell me the moment they "get it" is when they see the customer click through and book on the spot.

If something's tripping you up, hit reply and tell me what's in the way. I read every email myself.

${APP_URL}

— Mike
Founder, QuotePro AI for Cleaners

---
Don't want these? Unsubscribe: ${unsubUrl}`;

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;color:#111827;line-height:1.7;max-width:540px;">
    <p style="margin:0 0 16px">${greeting}</p>
    <p style="margin:0 0 16px">Saw you signed up for QuotePro AI but haven't sent a real customer quote yet &mdash; totally normal, I want to help you get over that first hump.</p>
    <p style="margin:0 0 8px"><strong>Here's the 2-minute version:</strong></p>
    <ol style="margin:0 0 16px;padding-left:20px;">
      <li style="margin-bottom:6px">Open the app and tap <strong>New Quote</strong></li>
      <li style="margin-bottom:6px">Plug in a real customer's address and what they're asking for (recurring weekly clean, deep clean, whatever)</li>
      <li style="margin-bottom:6px">Hit send &mdash; your customer gets a clean, branded quote with Good / Better / Best options</li>
    </ol>
    <p style="margin:0 0 16px">That's it. The whole point is to send ONE real quote and watch what happens when your customer accepts. Most owners tell me the moment they "get it" is when they see the customer click through and book on the spot.</p>
    <p style="margin:0 0 20px">If something's tripping you up, hit reply and tell me what's in the way. I read every email myself.</p>
    <p style="margin:0 0 20px"><a href="${APP_URL}" style="display:inline-block;background:#1d3557;color:#fff;text-decoration:none;font-weight:600;padding:11px 22px;border-radius:8px;">Open QuotePro &rarr;</a></p>
    <p style="margin:0 0 4px">&mdash; Mike</p>
    <p style="margin:0 0 24px;color:#6b7280;font-size:13px;">Founder, QuotePro AI for Cleaners</p>
    <p style="margin:0;font-size:11px;color:#9ca3af;">Don't want these? <a href="${unsubUrl}" style="color:#9ca3af;">Unsubscribe</a></p>
  </div>`;

  const body = {
    personalizations: [{ to: [{ email: effectiveEmail }] }],
    from: { email: FROM_EMAIL, name: "Mike at QuotePro" },
    reply_to: { email: "mike@getquotepro.ai", name: "Mike Quealy" },
    subject,
    content: [
      { type: "text/plain", value: plainText },
      { type: "text/html", value: html },
    ],
  };
  const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (resp.status >= 300) {
    throw new Error(`SendGrid ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const args = new Set(argv);
  const isDry = args.has("--dry");
  const isSmoke = args.has("--smoke");
  const fileArgIdx = argv.indexOf("--from-file");
  const fromFile = fileArgIdx >= 0 ? argv[fileArgIdx + 1] : null;

  if (isSmoke) {
    console.log("[smoke] Sending one test email to mike@getquotepro.ai...");
    await sendOne({ id: "smoketest-" + Date.now(), email: "mike@getquotepro.ai", contact_email: "mike@getquotepro.ai", name: "Mike" });
    console.log("[smoke] Done.");
    await pool.end();
    return;
  }

  let users: User[];
  if (fromFile) {
    users = JSON.parse(fs.readFileSync(fromFile, "utf-8"));
    console.log(`[activation-blast] Loaded ${users.length} users from ${fromFile}`);
  } else {
    const result = await pool.query<User>(`
      SELECT id, email, contact_email, name
      FROM users
      WHERE subscription_tier = 'free'
        AND email IS NOT NULL AND email <> ''
        AND email_unreachable = FALSE
        AND trial_drip_unsubscribed = FALSE
        AND has_completed_first_quote = FALSE
      ORDER BY created_at ASC
    `);
    users = result.rows;
  }
  console.log(`[activation-blast] ${isDry ? "DRY RUN — would send" : "Sending"} to ${users.length} users`);
  if (isDry) {
    users.forEach(u => console.log(` - ${u.contact_email || u.email}  (${u.name || ""})`));
    await pool.end();
    return;
  }

  let sent = 0, failed = 0;
  const failures: Array<{ email: string; err: string }> = [];
  const CONCURRENCY = 5;
  let cursor = 0;
  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= users.length) return;
      const u = users[idx];
      const eff = u.contact_email || u.email;
      try {
        await sendOne(u);
        sent++;
        if (sent % 20 === 0 || sent === users.length) {
          console.log(`  …${sent}/${users.length} sent (last: ${eff})`);
        }
      } catch (err: any) {
        failed++;
        failures.push({ email: eff, err: err.message });
        console.error(`  ✗ ${eff}: ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`\n[activation-blast] DONE — sent ${sent}, failed ${failed}`);
  if (failures.length) {
    console.log("Failures:");
    failures.forEach(f => console.log(`  ${f.email}: ${f.err}`));
  }
  await pool.end();
}

// Only auto-run when executed directly via CLI, never on import.
// (An accidental `tsx -e "import ..."` previously triggered a full send.)
import { fileURLToPath } from "node:url";
const isDirectRun = process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch(e => { console.error(e); process.exit(1); });
} else {
  console.warn("[activation-blast] script imported, not run. Invoke via: tsx scripts/sendActivationBlast.ts");
}
