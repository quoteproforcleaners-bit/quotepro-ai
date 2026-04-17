/**
 * PostgreSQL-backed store for express-rate-limit.
 *
 * Counters survive server restarts because they are stored in the
 * `rate_limit_counters` table instead of process memory. The table is
 * created automatically on first use.
 *
 * Usage:
 *   import { createPgRateLimitStore } from "./rateLimitStore";
 *   import { pool } from "./db";
 *
 *   const limiter = rateLimit({
 *     store: createPgRateLimitStore(pool, "auth:"),
 *     windowMs: 60_000,
 *     max: 10,
 *   });
 */

import type { Pool } from "pg";
import type { Store, Options, ClientRateLimitInfo } from "express-rate-limit";

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS rate_limit_counters (
    key        TEXT        PRIMARY KEY,
    count      INTEGER     NOT NULL DEFAULT 1,
    expires_at TIMESTAMPTZ NOT NULL
  )
`;

const CREATE_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS rate_limit_counters_expires_at_idx
    ON rate_limit_counters (expires_at)
`;

let tableReady: Promise<void> | null = null;

function ensureTable(pool: Pool): Promise<void> {
  if (!tableReady) {
    tableReady = pool
      .query(CREATE_TABLE_SQL)
      .then(() => pool.query(CREATE_INDEX_SQL))
      .then(() => undefined)
      .catch((err) => {
        tableReady = null;
        throw err;
      });
  }
  return tableReady;
}

/**
 * Returns an express-rate-limit Store backed by PostgreSQL.
 *
 * @param pool        - The `pg` Pool instance from server/db.ts.
 * @param storePrefix - A unique string prefix that namespaces this limiter's
 *                      keys in the shared table (e.g. "auth:", "geocode:").
 */
export function createPgRateLimitStore(pool: Pool, storePrefix: string): Store {
  let windowMs = 60_000;

  const store: Store = {
    prefix: storePrefix,
    localKeys: false,

    init(options: Options): void {
      windowMs = options.windowMs;
    },

    async increment(key: string): Promise<ClientRateLimitInfo> {
      await ensureTable(pool);
      const prefixedKey = `${storePrefix}${key}`;
      const expiresAt = new Date(Date.now() + windowMs);

      const result = await pool.query<{ count: number; expires_at: string }>(
        `INSERT INTO rate_limit_counters (key, count, expires_at)
         VALUES ($1, 1, $2)
         ON CONFLICT (key) DO UPDATE SET
           count = CASE
             WHEN rate_limit_counters.expires_at <= NOW() THEN 1
             ELSE rate_limit_counters.count + 1
           END,
           expires_at = CASE
             WHEN rate_limit_counters.expires_at <= NOW() THEN $2
             ELSE rate_limit_counters.expires_at
           END
         RETURNING count, expires_at`,
        [prefixedKey, expiresAt]
      );

      const row = result.rows[0];
      return {
        totalHits: row.count,
        resetTime: new Date(row.expires_at),
      };
    },

    async decrement(key: string): Promise<void> {
      await ensureTable(pool);
      const prefixedKey = `${storePrefix}${key}`;
      await pool.query(
        `UPDATE rate_limit_counters
         SET count = GREATEST(0, count - 1)
         WHERE key = $1 AND expires_at > NOW()`,
        [prefixedKey]
      );
    },

    async resetKey(key: string): Promise<void> {
      await ensureTable(pool);
      const prefixedKey = `${storePrefix}${key}`;
      await pool.query(`DELETE FROM rate_limit_counters WHERE key = $1`, [prefixedKey]);
    },

    async resetAll(): Promise<void> {
      await ensureTable(pool);
      await pool.query(`DELETE FROM rate_limit_counters WHERE key LIKE $1`, [
        `${storePrefix}%`,
      ]);
    },
  };

  return store;
}
