#!/bin/bash
set -e

echo "[post-merge] Installing dependencies..."
npm install --ignore-scripts 2>&1 | tail -5

echo "[post-merge] Building web app..."
cd web && npx vite build --logLevel warn 2>&1 | tail -10
cd ..

echo "[post-merge] Applying additive column migrations..."
# Idempotent ALTER TABLE statements for new columns. Drizzle's interactive
# rename prompts can hang/abort with stdin closed in this environment, so
# guarantee these columns exist before the schema sync runs. Each ADD COLUMN
# uses IF NOT EXISTS so reruns are safe.
node -e "
const { Pool } = require('pg');
(async () => {
  if (!process.env.DATABASE_URL) { console.log('[post-merge] DATABASE_URL not set, skipping'); return; }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const stmts = [
    \"ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_source text\",
    \"ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_campaign text\",
  ];
  for (const s of stmts) { try { await pool.query(s); console.log('[post-merge] ok:', s); } catch (e) { console.log('[post-merge] skip:', s, e.message); } }
  await pool.end();
})();
" 2>&1 | tail -20 || true

echo "[post-merge] Running DB schema sync..."
npm run db:push --force 2>&1 | tail -10 || true

echo "[post-merge] Done."
