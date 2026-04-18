#!/bin/bash
# Build the web app and stage web/dist for commit.
#
# Why this exists:
#   The Replit deploy build script (.replit -> [deployment].build) only
#   rebuilds the Express server, not the Vite web frontend. Without
#   committing a fresh web/dist/ bundle, every "Publish" ships the
#   previously-built bundle and source changes never reach production.
#
# This script is invoked automatically by .githooks/pre-commit whenever
# any web source file is staged.

set -e

cd "$(git rev-parse --show-toplevel)"

echo "[build-web] Building web bundle (vite build)..."
( cd web && npx vite build --logLevel warn ) 2>&1 | tail -8

# Drop any unrelated artifacts that vite copies through (CSV exports, etc.)
find web/dist -maxdepth 1 -type f ! -name "index.html" ! -name "favicon*" -delete 2>/dev/null || true

echo "[build-web] Staging web/dist for commit..."
git add -A web/dist
echo "[build-web] Done."
