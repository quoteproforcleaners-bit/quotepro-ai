/**
 * Google Business Profile (GBP) Integration Router
 * Handles OAuth, connection management, status, and lead stats.
 */

import crypto from "node:crypto";
import { google } from "googleapis";
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware";
import { PLATFORM_FROM_EMAIL, PLATFORM_FROM_NAME, sendEmail } from "../mail";

const router = Router();

const GBP_SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
];

function getOAuth2Client(host: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `https://${host}/api/gbp/callback`
  );
}

// ── GET /api/gbp/status ───────────────────────────────────────────────────────
router.get("/status", requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT account_id, location_id, location_name, connected_at, last_synced_at
       FROM gbp_connections WHERE user_id = $1 LIMIT 1`,
      [req.session.userId]
    );
    if (rows.length === 0) return res.json({ connected: false });

    const conn = rows[0];

    // Monthly lead count
    const statsRes = await pool.query(
      `SELECT COUNT(*) AS count FROM gbp_leads
       WHERE user_id = $1 AND processed_at >= date_trunc('month', NOW())`,
      [req.session.userId]
    );
    const monthlyLeads = parseInt(statsRes.rows[0]?.count ?? "0", 10);

    // Unactioned GBP lead quotes
    const unactionedRes = await pool.query(
      `SELECT COUNT(*) AS count FROM quotes
       WHERE business_id = (SELECT id FROM businesses WHERE owner_id = $1 LIMIT 1)
       AND source = 'gbp' AND status = 'draft'`,
      [req.session.userId]
    );
    const unactioned = parseInt(unactionedRes.rows[0]?.count ?? "0", 10);

    return res.json({
      connected: true,
      locationName: conn.location_name,
      accountId: conn.account_id,
      locationId: conn.location_id,
      connectedAt: conn.connected_at,
      lastSyncedAt: conn.last_synced_at,
      monthlyLeads,
      unactionedDrafts: unactioned,
    });
  } catch (e: any) {
    console.error("[GBP] status error:", e.message);
    return res.status(500).json({ message: "Failed to check GBP status" });
  }
});

// ── GET /api/gbp/connect ──────────────────────────────────────────────────────
router.get("/connect", requireAuth, async (req: Request, res: Response) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(503).json({ message: "Google integration is not configured. Contact support." });
    }
    const state = crypto.randomBytes(32).toString("hex");
    await pool.query(
      `INSERT INTO oauth_states (state, user_id, provider, created_at)
       VALUES ($1, $2, 'gbp', NOW())`,
      [state, req.session.userId]
    );
    const oauth2Client = getOAuth2Client(req.get("host") as string);
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: GBP_SCOPES,
      prompt: "consent",
      state,
    });
    return res.redirect(url);
  } catch (e: any) {
    console.error("[GBP] connect error:", e.message);
    return res.status(500).json({ message: "Failed to generate auth URL" });
  }
});

// ── GET /api/gbp/callback ─────────────────────────────────────────────────────
router.get("/callback", async (req: Request, res: Response) => {
  const closeHtml = (title: string, msg: string, success: boolean) => `<!DOCTYPE html>
<html><head><title>${title}</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;}
.card{text-align:center;padding:40px;background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);max-width:360px;}
.icon{font-size:48px;margin-bottom:16px;}h2{margin:0 0 8px;color:#333;}p{color:#666;margin:0;font-size:14px;}</style>
</head><body><div class="card"><div class="icon">${success ? "✓" : "✗"}</div><h2>${title}</h2><p>${msg}</p>
<script>setTimeout(()=>window.close(),2000);</script></div></body></html>`;

  try {
    const { code, state, error } = req.query as Record<string, string>;

    if (error || !code || !state) {
      return res.status(400).send(closeHtml("Connection Failed", error ?? "Missing code or state", false));
    }

    const stateResult = await pool.query(
      `DELETE FROM oauth_states WHERE state = $1 AND provider = 'gbp'
       AND created_at > NOW() - INTERVAL '10 minutes' RETURNING user_id`,
      [state]
    );
    if (stateResult.rows.length === 0) {
      return res.status(403).send(closeHtml("Session Expired", "Please try connecting again.", false));
    }
    const userId = stateResult.rows[0].user_id;

    const oauth2Client = getOAuth2Client(req.get("host") as string);
    const { tokens } = await oauth2Client.getToken(code);

    // Fetch the first account and location to pre-populate
    oauth2Client.setCredentials(tokens);
    let accountId: string | null = null;
    let locationId: string | null = null;
    let locationName: string | null = null;

    try {
      const accountsResp = await fetch(
        "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      if (accountsResp.ok) {
        const accountsData: any = await accountsResp.json();
        const firstAccount = accountsData.accounts?.[0];
        if (firstAccount) {
          accountId = firstAccount.name; // e.g. "accounts/123456789"
          // Fetch locations
          const locResp = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?readMask=name,title`,
            { headers: { Authorization: `Bearer ${tokens.access_token}` } }
          );
          if (locResp.ok) {
            const locData: any = await locResp.json();
            const firstLoc = locData.locations?.[0];
            if (firstLoc) {
              locationId = firstLoc.name; // e.g. "locations/456789"
              locationName = firstLoc.title ?? firstLoc.name;
            }
          }
        }
      }
    } catch (apiErr: any) {
      console.warn("[GBP] Could not fetch initial location:", apiErr.message);
    }

    await pool.query(
      `INSERT INTO gbp_connections (user_id, access_token, refresh_token, expires_at, account_id, location_id, location_name, connected_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         access_token = EXCLUDED.access_token,
         refresh_token = COALESCE(EXCLUDED.refresh_token, gbp_connections.refresh_token),
         expires_at = EXCLUDED.expires_at,
         account_id = COALESCE(EXCLUDED.account_id, gbp_connections.account_id),
         location_id = COALESCE(EXCLUDED.location_id, gbp_connections.location_id),
         location_name = COALESCE(EXCLUDED.location_name, gbp_connections.location_name),
         connected_at = NOW()`,
      [
        userId,
        tokens.access_token,
        tokens.refresh_token ?? null,
        tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        accountId,
        locationId,
        locationName,
      ]
    );

    return res.redirect("/app/settings?tab=integrations&gbp=connected");
  } catch (e: any) {
    console.error("[GBP] callback error:", e.message);
    return res.status(500).send(closeHtml("Connection Failed", "Please try again.", false));
  }
});

// ── DELETE /api/gbp/disconnect ────────────────────────────────────────────────
router.delete("/disconnect", requireAuth, async (req: Request, res: Response) => {
  try {
    await pool.query(`DELETE FROM gbp_connections WHERE user_id = $1`, [req.session.userId]);
    return res.json({ message: "Disconnected" });
  } catch (e: any) {
    console.error("[GBP] disconnect error:", e.message);
    return res.status(500).json({ message: "Failed to disconnect" });
  }
});

export default router;
