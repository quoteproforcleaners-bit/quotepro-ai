/**
 * extract-i18n.mjs
 *
 * Two jobs in one:
 *   A) Sync: reads every t('key') call in source files and ensures the key
 *      exists in en.json (adds missing keys with English value from source
 *      context when possible, otherwise '__NEEDS_TRANSLATION__').
 *
 *   B) Audit: prints a report of hardcoded UI strings that look like they
 *      should be translated but aren't wrapped in t() yet.
 *
 * Run: node scripts/extract-i18n.mjs [--audit-only]
 *
 * Flags:
 *   --audit-only   Only print the hardcoded-string audit; don't touch files.
 *   --write        Actually update en.json with newly discovered keys.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, extname, relative } from "path";

const LOCALES_DIR = "web/src/locales";
const SRC_DIR = "web/src";
const SKIP_DIRS = ["node_modules", "dist", "build", "locales", "__tests__", ".git"];
const SKIP_FILES = ["main.tsx", "vite-env.d.ts", "i18n.ts"];

const AUDIT_ONLY = process.argv.includes("--audit-only");
const WRITE = process.argv.includes("--write");

// ── Helpers ──────────────────────────────────────────────────────────────────

function flatten(obj, prefix = "") {
  return Object.entries(obj).reduce((acc, [k, v]) => {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(acc, flatten(v, full));
    } else {
      acc[full] = v;
    }
    return acc;
  }, {});
}

function unflatten(flat) {
  const result = {};
  for (const [dotKey, value] of Object.entries(flat)) {
    const keys = dotKey.split(".");
    let cur = result;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!cur[keys[i]] || typeof cur[keys[i]] !== "object") cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
  }
  return result;
}

function getAllSourceFiles(dir, results = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.includes(name)) getAllSourceFiles(full, results);
    } else if (
      [".ts", ".tsx", ".js", ".jsx"].includes(extname(name)) &&
      !SKIP_FILES.includes(name)
    ) {
      results.push(full);
    }
  }
  return results;
}

// ── Load locale data ─────────────────────────────────────────────────────────

const enPath = `${LOCALES_DIR}/en.json`;
const enData = existsSync(enPath) ? JSON.parse(readFileSync(enPath, "utf8")) : {};
const enFlat = flatten(enData);

// ── Scan source files for t() keys ───────────────────────────────────────────

const files = getAllSourceFiles(SRC_DIR);
const usedKeys = new Map(); // key → [file, ...]
const tKeyPattern = /\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]/g;

for (const file of files) {
  const src = readFileSync(file, "utf8");
  let m;
  tKeyPattern.lastIndex = 0;
  while ((m = tKeyPattern.exec(src)) !== null) {
    const key = m[1];
    if (!usedKeys.has(key)) usedKeys.set(key, []);
    usedKeys.get(key).push(relative(SRC_DIR, file));
  }
}

// ── Report: keys used in source but missing from en.json ─────────────────────

const missingFromEn = [...usedKeys.keys()].filter((k) => !(k in enFlat));

console.log("\n═══════════════════════════════════════");
console.log("  i18n Extraction Report");
console.log("═══════════════════════════════════════\n");
console.log(`Scanned: ${files.length} source files`);
console.log(`t() keys found: ${usedKeys.size} unique`);
console.log(`en.json keys:   ${Object.keys(enFlat).length}`);

if (missingFromEn.length > 0) {
  console.log(`\n❌ ${missingFromEn.length} t() keys used in source missing from en.json:\n`);
  for (const k of missingFromEn) {
    const firstFile = usedKeys.get(k)[0];
    console.log(`   • ${k}  (${firstFile})`);
  }

  if (WRITE) {
    const updated = { ...enFlat };
    for (const k of missingFromEn) {
      updated[k] = "__NEEDS_TRANSLATION__";
    }
    writeFileSync(enPath, JSON.stringify(unflatten(updated), null, 2) + "\n");
    console.log(`\n💾 Wrote ${missingFromEn.length} placeholder(s) to en.json`);
    console.log(`   Run: node scripts/translate-keys.mjs  to fill them in`);
  } else {
    console.log(`\n   Run with --write to add placeholders to en.json`);
  }
} else {
  console.log(`\n✅ All t() keys exist in en.json`);
}

// ── Audit: hardcoded UI strings not using t() ─────────────────────────────────

if (AUDIT_ONLY || !WRITE) {
  console.log("\n── Hardcoded String Audit ──────────────────────────────────────\n");

  // Patterns that strongly suggest a hardcoded user-facing string
  const hardcodedPatterns = [
    // JSX text content between tags (capital letter, multiple words)
    />\s*([A-Z][a-z]+(?:\s+[a-zA-Z]+){2,})\s*</g,
    // placeholder="Sentence that looks like UI text"
    /placeholder="([A-Z][^"]{5,60})"/g,
    // Common button/label patterns
    /(?:title|aria-label)="([A-Z][^"]{4,60})"/g,
  ];

  const foundHardcoded = new Map(); // string → file

  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const rel = relative(SRC_DIR, file);

    // Skip files that are mostly non-JSX
    if (!src.includes("return (") && !src.includes("return <")) continue;

    for (const pattern of hardcodedPatterns) {
      pattern.lastIndex = 0;
      let m;
      while ((m = pattern.exec(src)) !== null) {
        const str = m[1].trim();
        // Skip if it contains JS interpolation, is very short, or already looks like a key
        if (
          str.includes("{") ||
          str.includes("`") ||
          str.includes("$") ||
          str.length < 6 ||
          str.length > 100 ||
          /^[^a-zA-Z]+$/.test(str) ||
          str.includes("\n") ||
          /^(true|false|null|undefined|string|number|boolean)$/.test(str)
        )
          continue;

        if (!foundHardcoded.has(str)) {
          foundHardcoded.set(str, rel);
        }
      }
    }
  }

  if (foundHardcoded.size > 0) {
    console.log(`Found ${foundHardcoded.size} potentially hardcoded strings:\n`);
    let count = 0;
    for (const [str, file] of foundHardcoded) {
      if (count++ >= 50) {
        console.log(`   … and ${foundHardcoded.size - 50} more`);
        break;
      }
      console.log(`   "${str}"`);
      console.log(`      → ${file}`);
    }
  } else {
    console.log("✅ No obviously hardcoded UI strings detected.");
  }
}

console.log("\n═══════════════════════════════════════\n");
