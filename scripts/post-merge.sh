#!/bin/bash
set -e

echo "[post-merge] Installing dependencies..."
npm install --ignore-scripts 2>&1 | tail -5

echo "[post-merge] Building web app..."
cd web && npx vite build --logLevel warn 2>&1 | tail -10
cd ..

echo "[post-merge] Running DB schema sync..."
npm run db:push --force 2>&1 | tail -10 || true

echo "[post-merge] Done."
