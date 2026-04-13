/**
 * validate-i18n.mjs
 * Checks three things:
 *   1. All non-English locales have every key that en.json has.
 *   2. Every t('key') call in the source has a matching key in en.json.
 *   3. Every key in en.json is actually used somewhere (optional info).
 *
 * Run: node scripts/validate-i18n.mjs
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const LOCALES_DIR = "web/src/locales";
const SRC_DIR = "web/src";
const LOCALES = ["en", "es", "pt", "ru"];
const SKIP_DIRS = ["node_modules", "dist", "build", "locales", "__tests__"];

// ── Helpers ─────────────────────────────────────────────────────────────────

function flatten(obj, prefix = "") {
  return Object.entries(obj).reduce((acc, [k, v]) => {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(acc, flatten(v, fullKey));
    } else {
      acc[fullKey] = v;
    }
    return acc;
  }, {});
}

function loadLocale(lng) {
  const raw = readFileSync(join(LOCALES_DIR, `${lng}.json`), "utf8");
  return flatten(JSON.parse(raw));
}

function getAllSourceFiles(dir, results = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.includes(name)) getAllSourceFiles(full, results);
    } else if ([".ts", ".tsx", ".js", ".jsx"].includes(extname(name))) {
      results.push(full);
    }
  }
  return results;
}

// Extract keys from t('key') and t("key") calls (not dynamic expressions)
function extractUsedKeys(files) {
  const used = new Set();
  const pattern = /\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g;
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    let m;
    pattern.lastIndex = 0;
    while ((m = pattern.exec(src)) !== null) {
      used.add(m[1]);
    }
  }
  return used;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const en = loadLocale("en");
const enKeys = Object.keys(en);

let errors = 0;
let warnings = 0;

// 1. Check all locales have all en keys
console.log("\n═══════════════════════════════════════");
console.log("  i18n Validation Report");
console.log("═══════════════════════════════════════\n");

for (const lng of LOCALES.filter((l) => l !== "en")) {
  const loc = loadLocale(lng);
  const missing = enKeys.filter((k) => !(k in loc));
  const extra = Object.keys(loc).filter((k) => !(k in en));

  if (missing.length > 0) {
    console.log(`❌ ${lng}.json — ${missing.length} missing keys:`);
    missing.slice(0, 20).forEach((k) => console.log(`   • ${k}`));
    if (missing.length > 20) console.log(`   … and ${missing.length - 20} more`);
    errors += missing.length;
  } else {
    console.log(`✅ ${lng}.json — complete (${enKeys.length} keys)`);
  }

  if (extra.length > 0) {
    console.log(`   ⚠  ${extra.length} extra keys not in en.json (orphans):`);
    extra.slice(0, 10).forEach((k) => console.log(`      – ${k}`));
    warnings += extra.length;
  }
}

// 2. Check source t() calls against en.json
const files = getAllSourceFiles(SRC_DIR);
const usedKeys = extractUsedKeys(files);

const missingFromLocales = [...usedKeys].filter((k) => !(k in en));
const unusedInSource = enKeys.filter((k) => !usedKeys.has(k));

console.log(`\n── Source scan (${files.length} files) ──`);
console.log(`   t() calls found: ${usedKeys.size} unique keys`);

if (missingFromLocales.length > 0) {
  console.log(`\n❌ ${missingFromLocales.length} keys used in source but missing from en.json:`);
  missingFromLocales.slice(0, 30).forEach((k) => console.log(`   • ${k}`));
  if (missingFromLocales.length > 30)
    console.log(`   … and ${missingFromLocales.length - 30} more`);
  errors += missingFromLocales.length;
} else {
  console.log(`   ✅ All source t() keys exist in en.json`);
}

if (unusedInSource.length > 0) {
  console.log(`\n   ⚠  ${unusedInSource.length} keys in en.json not found in source (may be dynamic):`);
  unusedInSource.slice(0, 10).forEach((k) => console.log(`      – ${k}`));
  warnings += unusedInSource.length;
}

// 3. Summary
console.log(`\n═══════════════════════════════════════`);
if (errors === 0) {
  console.log(`✅ PASSED — No errors. ${warnings} warning(s).`);
} else {
  console.log(`❌ FAILED — ${errors} error(s), ${warnings} warning(s).`);
  process.exit(1);
}
console.log("═══════════════════════════════════════\n");
