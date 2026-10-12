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
    // 1. Explicit header override — must be a location the caller owns and
    // that is active. Untrusted client input cannot widen scope.
    const headerId = req.headers["x-location-id"] as string | undefined;
    if (headerId) {
      const { rows: ownedHeader } = await pool.query<{ id: string }>(
        "SELECT id FROM business_locations WHERE id = $1 AND owner_id = $2 AND active = true",
        [headerId, req.session.userId]
      );
      if (ownedHeader[0]) {
        req.activeLocationId = ownedHeader[0].id;
        return next();
      }
      // fall through to persisted resolution if header was invalid
    }

    // 2. Resolve persisted active_location_id, validating it still points
    // at an owned, active location. Auto-repair to primary / oldest if not.
    const { rows } = await pool.query<{
      active_location_id: string | null;
      validated_id: string | null;
      fallback_id: string | null;
    }>(
      `SELECT u.active_location_id,
              (SELECT bl.id FROM business_locations bl
                WHERE bl.id = u.active_location_id
                  AND bl.owner_id = u.id
                  AND bl.active = true
                LIMIT 1) AS validated_id,
              (SELECT bl.id FROM business_locations bl
                WHERE bl.owner_id = u.id AND bl.active = true
                ORDER BY bl.is_primary DESC, bl.created_at ASC
                LIMIT 1) AS fallback_id
         FROM users u
        WHERE u.id = $1`,
      [req.session.userId]
    );

    if (!rows[0]) {
      req.activeLocationId = null;
    } else if (rows[0].validated_id) {
      req.activeLocationId = rows[0].validated_id;
    } else if (rows[0].fallback_id) {
      // Stale or null pointer — repair persistently so we don't re-query.
      req.activeLocationId = rows[0].fallback_id;
      pool
        .query("UPDATE users SET active_location_id = $1 WHERE id = $2", [
          rows[0].fallback_id,
          req.session.userId,
        ])
        .catch(() => {});
    } else {
      req.activeLocationId = null;
    }
  } catch {
    req.activeLocationId = null;
  }

  next();
}
