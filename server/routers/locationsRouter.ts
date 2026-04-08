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
    // Verify multi-location is enabled for this user
    const { rows: userRows } = await pool.query(
      "SELECT is_multi_location_enabled FROM users WHERE id = $1",
      [req.session.userId!]
    );
    if (!userRows[0]?.is_multi_location_enabled) {
      return res.status(403).json({
        error: "not_enabled",
        message: "Multi-location is not enabled for your account. Upgrade to enable it.",
      });
    }

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

    // Cannot deactivate primary
    const { rows: check } = await pool.query(
      "SELECT is_primary FROM business_locations WHERE id = $1 AND owner_id = $2",
      [id, req.session.userId!]
    );
    if (!check[0]) return res.status(404).json({ message: "Location not found" });
    if (check[0].is_primary) {
      return res.status(400).json({ message: "Cannot deactivate the primary location" });
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

// ─── POST /api/locations/:id/switch ──────────────────────────────────────────
// Sets the user's active_location_id to the given location.
router.post("/locations/:id/switch", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const { rows } = await pool.query(
      "SELECT id, name FROM business_locations WHERE id = $1 AND owner_id = $2 AND active = true",
      [id, req.session.userId!]
    );
    if (!rows[0]) return res.status(404).json({ message: "Location not found" });

    await pool.query(
      "UPDATE users SET active_location_id = $1 WHERE id = $2",
      [id, req.session.userId!]
    );

    return res.json({ message: "Switched location", location: rows[0] });
  } catch (e: any) {
    console.error("[locations] switch error:", e.message);
    return res.status(500).json({ message: "Failed to switch location" });
  }
});

export default router;
