/**
 * server/middleware/locationContext.ts
 * Attaches req.activeLocationId to all authenticated requests.
 *
 * Resolution order:
 *   1. X-Location-Id request header (explicit override from client)
 *   2. user.active_location_id (persisted choice in users table)
 *   3. user's primary business_locations row (is_primary = true)
 */

import type { Request, Response, NextFunction } from "express";
import { pool } from "../db";

declare global {
  namespace Express {
    interface Request {
      activeLocationId?: string | null;
    }
  }
}

export async function locationContext(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  // Skip if not authenticated
  if (!req.session?.userId) return next();

  try {
    // 1. Explicit header override
    const headerId = req.headers["x-location-id"] as string | undefined;
    if (headerId) {
      req.activeLocationId = headerId;
      return next();
    }

    // 2. User's persisted active_location_id, or fall back to primary
    const { rows } = await pool.query<{
      active_location_id: string | null;
      primary_id: string | null;
    }>(
      `SELECT u.active_location_id,
              (SELECT bl.id FROM business_locations bl
               WHERE bl.owner_id = u.id AND bl.is_primary = true AND bl.active = true
               LIMIT 1) AS primary_id
       FROM users u
       WHERE u.id = $1`,
      [req.session.userId]
    );

    if (rows[0]) {
      req.activeLocationId = rows[0].active_location_id ?? rows[0].primary_id ?? null;
    } else {
      req.activeLocationId = null;
    }
  } catch {
    req.activeLocationId = null;
  }

  next();
}
