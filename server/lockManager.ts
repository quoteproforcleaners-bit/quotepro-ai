import { pool } from "./db";

// Stable per-process identifier so logs show which instance holds a lock
const instanceId =
  process.env.DYNO ||
  process.env.HOSTNAME ||
  `local-${process.pid}`;

/**
 * Try to acquire a distributed cron lock backed by the job_locks table.
 *
 * Returns true  → this instance acquired the lock and should run the job.
 * Returns false → another instance holds the lock; skip this run.
 *
 * The trick: ON CONFLICT DO UPDATE WHERE only updates (and returns a row) when
 * the existing lock has expired.  A silent no-op (lock still held) produces
 * rowCount = 0, which we use to detect "lock already taken".
 */
export async function acquireLock(
  jobName: string,
  ttlMinutes = 5
): Promise<boolean> {
  try {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const result = await pool.query(
      `INSERT INTO job_locks (job_name, locked_at, locked_by, expires_at)
       VALUES ($1, NOW(), $2, $3)
       ON CONFLICT (job_name) DO UPDATE SET
         locked_at = NOW(),
         locked_by  = $2,
         expires_at = $3
       WHERE job_locks.expires_at < NOW()
       RETURNING job_name`,
      [jobName, instanceId, expiresAt]
    );
    return (result.rowCount ?? 0) > 0;
  } catch (err: any) {
    console.error(`[lockManager] acquireLock(${jobName}) error:`, err.message);
    return false;
  }
}

/**
 * Release a lock early (after the job finishes) so the TTL does not
 * artificially delay the next scheduled run on another instance.
 */
export async function releaseLock(jobName: string): Promise<void> {
  try {
    await pool.query(
      `DELETE FROM job_locks WHERE job_name = $1 AND locked_by = $2`,
      [jobName, instanceId]
    );
  } catch (err: any) {
    console.error(`[lockManager] releaseLock(${jobName}) error:`, err.message);
  }
}
