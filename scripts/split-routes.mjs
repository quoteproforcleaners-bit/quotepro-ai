/**
 * Route splitter v2: extracts route handlers from server/routes.ts
 * Uses indentation-based boundary detection (more reliable than brace counting).
 *
 * Usage: node scripts/split-routes.mjs
 */

import fs from "fs";

const src = fs.readFileSync("server/routes.ts", "utf8");
const lines = src.split("\n");

// ─── Route prefix → router assignment ────────────────────────────────────────

function routerFor(path) {
  if (path.startsWith("/api/admin/")) return "admin";
  if (path.startsWith("/api/auth/")) return "auth";
  if (path === "/api/consent" || path === "/api/consent/") return "auth";
  if (path === "/api/crash-report") return "auth";
  if (path.startsWith("/api/quotes")) return "quotes";
  if (path.startsWith("/api/reports/")) return "quotes";
  if (path.startsWith("/api/revenue/")) return "quotes";
  if (path === "/api/forecast") return "quotes";
  if (path.startsWith("/api/follow-ups")) return "quotes";
  if (path.startsWith("/api/followup")) return "quotes";
  if (path.startsWith("/api/opportunities/")) return "quotes";
  if (path.startsWith("/api/upsell")) return "quotes";
  if (path.startsWith("/api/rebook")) return "quotes";
  if (path.startsWith("/api/reminder-templates")) return "quotes";
  if (path.startsWith("/api/quote-preferences")) return "quotes";
  if (path.startsWith("/api/commercial/")) return "quotes";
  if (path.startsWith("/api/invoice-packets")) return "quotes";
  if (path.startsWith("/api/recommendations")) return "quotes";
  if (path.startsWith("/api/calendar-events")) return "quotes";
  if (path.startsWith("/api/weekly-recap")) return "quotes";
  if (path.startsWith("/api/sales-strategy")) return "quotes";
  if (path.startsWith("/api/customers")) return "customers";
  if (path.startsWith("/api/intake-requests")) return "customers";
  if (path.startsWith("/api/jobs")) return "jobs";
  if (path.startsWith("/api/recurring-series")) return "jobs";
  if (path.startsWith("/api/checklist")) return "jobs";
  if (path.startsWith("/api/photos")) return "jobs";
  if (path.startsWith("/api/schedule/")) return "jobs";
  if (path.startsWith("/api/dispatch/")) return "jobs";
  if (path.startsWith("/api/ratings")) return "jobs";
  if (path.startsWith("/api/booking-availability")) return "jobs";
  if (path.startsWith("/api/pricing/")) return "pricing";
  if (path === "/api/pricing") return "pricing";
  if (path.startsWith("/api/ai/")) return "ai";
  if (path.startsWith("/api/send/")) return "ai";
  if (path.startsWith("/api/automations")) return "automations";
  if (path.startsWith("/api/campaigns")) return "automations";
  if (path.startsWith("/api/email-sequences")) return "automations";
  if (path.startsWith("/api/lead-finder")) return "automations";
  if (path.startsWith("/api/growth-tasks")) return "automations";
  if (path.startsWith("/api/growth-automation")) return "automations";
  if (path.startsWith("/api/social/")) return "automations";
  if (path.startsWith("/api/review-requests")) return "automations";
  if (path.startsWith("/api/streaks")) return "automations";
  if (path.startsWith("/api/milestones")) return "automations";
  if (path.startsWith("/api/integrations/")) return "integrations";
  if (path.startsWith("/api/google-calendar/")) return "integrations";
  if (path.startsWith("/api/stripe/")) return "integrations";
  if (path.startsWith("/api/api-keys")) return "integrations";
  if (path.startsWith("/api/webhook-endpoints")) return "integrations";
  if (path.startsWith("/api/webhook-events")) return "integrations";
  if (path.startsWith("/api/internal/cron")) return "integrations";
  if (path.startsWith("/api/business")) return "business";
  if (path.startsWith("/api/settings")) return "business";
  if (path.startsWith("/api/preferences")) return "business";
  if (path.startsWith("/api/employees")) return "business";
  if (path.startsWith("/api/push-token")) return "business";
  if (path.startsWith("/api/files")) return "business";
  if (path.startsWith("/api/communications")) return "business";
  if (path.startsWith("/api/tasks")) return "business";
  if (path.startsWith("/api/badges")) return "business";
  if (path.startsWith("/api/subscription")) return "business";
  if (path.startsWith("/q")) return "public";
  if (path.startsWith("/r/")) return "public";
  if (path.startsWith("/rate/")) return "public";
  if (path.startsWith("/api/public/")) return "public";
  if (path === "/privacy" || path === "/terms" || path === "/delete-account") return "public";
  if (path.startsWith("/calculators")) return "public";
  if (path.startsWith("/house-cleaning")) return "public";
  if (path.startsWith("/deep-cleaning")) return "public";
  if (path.startsWith("/move-in-out")) return "public";
  if (path.startsWith("/cleaning-quote")) return "public";
  if (path.startsWith("/download/")) return "public";
  return null;
}

// ─── Find all route definition line numbers ───────────────────────────────────

// A route definition starts with "  app.<method>(" at column 0+2 spaces
// End of a route handler: "  });" at the same 2-space indent level
// We identify all app.method() call lines, then find their end lines.

const routeStartRe = /^  app\.(get|post|put|patch|delete)\(/;

// First pass: find every line that starts a route
const routeStartLines = [];
for (let i = 0; i < lines.length; i++) {
  if (routeStartRe.test(lines[i])) {
    const pathMatch = lines[i].match(/app\.\w+\(\s*["']([^"']+)["']/);
    if (pathMatch) {
      routeStartLines.push({ lineIdx: i, path: pathMatch[1] });
    }
  }
}

console.log(`Found ${routeStartLines.length} route definitions`);

// Second pass: for each route, find its end line.
// Strategy: count { and } chars, but skip chars inside strings.
function findRouteEnd(startIdx) {
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplate = 0; // nesting depth of template literals
  let inLineComment = false;
  let inBlockComment = false;
  let opened = false;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    inLineComment = false;

    for (let ci = 0; ci < line.length; ci++) {
      const ch = line[ci];
      const next = line[ci + 1];

      // Track line comments
      if (!inSingleQuote && !inDoubleQuote && !inTemplate && !inBlockComment) {
        if (ch === "/" && next === "/") { inLineComment = true; break; }
      }

      // Track block comments
      if (!inSingleQuote && !inDoubleQuote && !inTemplate) {
        if (inBlockComment) {
          if (ch === "*" && next === "/") { inBlockComment = false; ci++; }
          continue;
        }
        if (ch === "/" && next === "*") { inBlockComment = true; ci++; continue; }
      }

      if (inLineComment) break;

      // Track strings
      if (!inBlockComment) {
        if (!inDoubleQuote && !inTemplate && ch === "'" && (ci === 0 || line[ci-1] !== "\\")) {
          inSingleQuote = !inSingleQuote;
          continue;
        }
        if (!inSingleQuote && !inTemplate && ch === '"' && (ci === 0 || line[ci-1] !== "\\")) {
          inDoubleQuote = !inDoubleQuote;
          continue;
        }
        if (!inSingleQuote && !inDoubleQuote) {
          if (ch === "`") {
            if (inTemplate > 0) inTemplate--;
            else inTemplate++;
            continue;
          }
        }
      }

      if (inSingleQuote || inDoubleQuote || inTemplate > 0 || inBlockComment) continue;

      if (ch === "{") { depth++; opened = true; }
      if (ch === "}") {
        depth--;
        if (opened && depth === 0) return i; // route block closed
      }
    }
  }
  return lines.length - 1;
}

// Extract all route blocks
const routerBlocks = {
  admin: [], auth: [], quotes: [], customers: [], jobs: [],
  pricing: [], ai: [], automations: [], integrations: [], business: [], public: [],
};
const unmountedBlocks = [];

for (const { lineIdx, path } of routeStartLines) {
  const endIdx = findRouteEnd(lineIdx);
  const blockLines = lines.slice(lineIdx, endIdx + 1);
  const router = routerFor(path);
  if (router && routerBlocks[router]) {
    routerBlocks[router].push({ path, blockLines });
  } else {
    unmountedBlocks.push({ path, blockLines });
  }
}

// Stats
const routers = Object.keys(routerBlocks);
for (const r of routers) {
  console.log(`${r}: ${routerBlocks[r].length} routes`);
}
console.log(`unmounted (stays in routes.ts): ${unmountedBlocks.length}`);

// Write route blocks to text files for inspection
const routerDir = "server/routers";
if (!fs.existsSync(routerDir)) fs.mkdirSync(routerDir);

for (const r of routers) {
  const blocks = routerBlocks[r];
  if (blocks.length === 0) continue;
  const code = blocks.map(b =>
    b.blockLines.map(l => l.replace(/^  app\./, "  router.")).join("\n")
  ).join("\n\n");
  fs.writeFileSync(`${routerDir}/${r}RouteBlocks.txt`, code);
  console.log(`  → ${routerDir}/${r}RouteBlocks.txt`);
}

if (unmountedBlocks.length > 0) {
  const code = unmountedBlocks.map(b => b.blockLines.join("\n")).join("\n\n");
  fs.writeFileSync(`${routerDir}/unmountedRouteBlocks.txt`, code);
}

console.log("\nRoute totals:", routers.reduce((s, r) => s + routerBlocks[r].length, 0) + unmountedBlocks.length);
