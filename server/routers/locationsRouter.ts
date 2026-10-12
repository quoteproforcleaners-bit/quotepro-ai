/**
 * server/routers/locationsRouter.ts
 * Multi-location / franchise endpoints — /api/locations/*
 *
 * All routes require owner auth (requireAuth).
 * Creating new locations also requires is_multi_location_enabled.
 */

import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware";
import { getBusinessByOwner } from "../storage";

const router = Router();

// ─── GET /api/locations ───────────────────────────────────────────────────────
router.get("/locations", requireAuth, async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT bl.*,
              (SELECT COUNT(*) FROM quotes q WHERE q.location_id = bl.id AND q.deleted_at IS NULL) AS quote_count,
              (SELECT COUNT(*) FROM jobs j WHERE j.location_id = bl.id) AS job_count,
              (SELECT COUNT(*) FROM customers c WHERE c.location_id = bl.id AND c.deleted_at IS NULL) AS customer_count
       FROM business_locations bl
       WHERE bl.owner_id = $1
       ORDER BY bl.is_primary DESC, bl.name ASC`,
      [req.session.userId!]
    );
    return res.json(rows);
  } catch (e: any) {
    console.error("[locations] list error:", e.message);
    return res.status(500).json({ message: "Failed to load locations" });
  }
});

// ─── POST /api/locations ──────────────────────────────────────────────────────
router.post("/locations", requireAuth, async (req: Request, res: Response) => {
  try {
    // Page-level gating (Pro / trial / preview eligibility) is enforced on
    // the frontend by useSubscription — server just verifies the caller is
    // authenticated and scopes the new row to owner_id. Auto-flip the
    // legacy flag so LocationSwitcher and other UI gates pick it up.
    await pool.query(
      "UPDATE users SET is_multi_location_enabled = true WHERE id = $1 AND COALESCE(is_multi_location_enabled, false) = false",
      [req.session.userId!]
    );

    const { name, address, phone, timezone } = req.body as {
      name: string;
      address?: string;
      phone?: string;
      timezone?: string;
    };

    if (!name?.trim()) {
      return res.status(400).json({ message: "Location name is required" });
    }

    const { rows } = await pool.query(
      `INSERT INTO business_locations (owner_id, name, address, phone, timezone, active, is_primary)
       VALUES ($1, $2, $3, $4, $5, true, false)
       RETURNING *`,
      [
        req.session.userId!,
        name.trim(),
        address ?? null,
        phone ?? null,
        timezone ?? "America/New_York",
      ]
    );

    // First-location-ever for this user → auto-activate so the account is
    // never in a "no operating context" state.
    await pool.query(
      `UPDATE users
         SET active_location_id = $1
       WHERE id = $2 AND active_location_id IS NULL`,
      [rows[0].id, req.session.userId!]
    );

    return res.status(201).json(rows[0]);
  } catch (e: any) {
    console.error("[locations] create error:", e.message);
    return res.status(500).json({ message: "Failed to create location" });
  }
});

// ─── PATCH /api/locations/:id ─────────────────────────────────────────────────
router.patch("/locations/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // NOTE: `active` is intentionally not patchable. Operating context is
    // owned by users.active_location_id; soft-delete is owned by DELETE
    // (which itself is gated on not-being-the-operating-context).
    const { name, address, phone, timezone } = req.body as {
      name?: string;
      address?: string;
      phone?: string;
      timezone?: string;
    };

    const setClauses: string[] = [];
    const vals: unknown[] = [];

    if (name !== undefined) { setClauses.push(`name = $${vals.length + 1}`); vals.push(name); }
    if (address !== undefined) { setClauses.push(`address = $${vals.length + 1}`); vals.push(address); }
    if (phone !== undefined) { setClauses.push(`phone = $${vals.length + 1}`); vals.push(phone); }
    if (timezone !== undefined) { setClauses.push(`timezone = $${vals.length + 1}`); vals.push(timezone); }

    if (setClauses.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    setClauses.push(`updated_at = NOW()`);
    vals.push(id, req.session.userId!);

    const { rows } = await pool.query(
      `UPDATE business_locations
       SET ${setClauses.join(", ")}
       WHERE id = $${vals.length - 1} AND owner_id = $${vals.length}
       RETURNING *`,
      vals
    );

    if (!rows[0]) {
      return res.status(404).json({ message: "Location not found" });
    }

    return res.json(rows[0]);
  } catch (e: any) {
    console.error("[locations] update error:", e.message);
    return res.status(500).json({ message: "Failed to update location" });
  }
});

// ─── DELETE /api/locations/:id ────────────────────────────────────────────────
// Soft-delete: sets active = false. Primary locations cannot be deactivated.
router.delete("/locations/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Cannot deactivate the operating-context location or the primary —
    // active state is changed by ACTIVATING a different location, never by
    // deactivating the current one.
    const { rows: check } = await pool.query(
      `SELECT bl.is_primary,
              (u.active_location_id = bl.id) AS is_operating_context
         FROM business_locations bl
         JOIN users u ON u.id = bl.owner_id
        WHERE bl.id = $1 AND bl.owner_id = $2`,
      [id, req.session.userId!]
    );
    if (!check[0]) return res.status(404).json({ message: "Location not found" });
    if (check[0].is_primary) {
      return res.status(400).json({ message: "Cannot deactivate the primary location" });
    }
    if (check[0].is_operating_context) {
      return res.status(400).json({
        message: "Switch to a different location before deactivating this one.",
      });
    }

    await pool.query(
      `UPDATE business_locations SET active = false, updated_at = NOW()
       WHERE id = $1 AND owner_id = $2`,
      [id, req.session.userId!]
    );

    return res.json({ message: "Location deactivated" });
  } catch (e: any) {
    console.error("[locations] delete error:", e.message);
    return res.status(500).json({ message: "Failed to deactivate location" });
  }
});

// ─── POST /api/locations/:id/activate ────────────────────────────────────────
// Atomically makes :id the user's operating-context location. The previous
// active location is implicitly demoted (single-column FK on users enforces
// "exactly one active" by construction — no partial unique index needed).
// `/switch` is kept as an alias for the old client.
async function activateLocation(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        "SELECT id, name FROM business_locations WHERE id = $1 AND owner_id = $2 AND active = true FOR UPDATE",
        [id, req.session.userId!]
      );
      if (!rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Location not found" });
      }

      await client.query(
        "UPDATE users SET active_location_id = $1 WHERE id = $2",
        [id, req.session.userId!]
      );

      await client.query("COMMIT");
      return res.json({ message: "Activated", location: rows[0] });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (e: any) {
    console.error("[locations] activate error:", e.message);
    return res.status(500).json({ message: "Failed to activate location" });
  }
}
router.post("/locations/:id/activate", requireAuth, activateLocation);
router.post("/locations/:id/switch", requireAuth, activateLocation);

export default router;
