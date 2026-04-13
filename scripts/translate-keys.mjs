/**
 * translate-keys.mjs
 * Finds every key in en.json that is missing from es/pt/ru and translates
 * them in batches using Claude.
 *
 * Run: node scripts/translate-keys.mjs
 * Env: ANTHROPIC_API_KEY must be set
 */

import { readFileSync, writeFileSync, existsSync } from "fs";

const LOCALES_DIR = "web/src/locales";
const LOCALES = {
  es: "Mexican/US Spanish for a cleaning business SaaS app. Natural, conversational tone — not overly formal.",
  pt: "Brazilian Portuguese (pt-BR) for a cleaning business SaaS app. Natural and professional.",
  ru: "Russian for a cleaning business SaaS app. Professional tone.",
};
const BATCH_SIZE = 60;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error("❌ ANTHROPIC_API_KEY not set");
  process.exit(1);
}

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

function loadJson(path) {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {};
  }
}

async function translateBatch(batch, targetLng, instructions) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Translate these UI strings for a residential cleaning business SaaS app.
Target language: ${targetLng}
Instructions: ${instructions}

Rules:
- Keep {{interpolation}} placeholders exactly as-is (double curly braces)
- Keep the same dot-notation keys in the output
- Return ONLY a valid JSON object — no markdown, no explanation, no code fences
- Preserve casing style (sentence case stays sentence case, ALL CAPS stays ALL CAPS)
- Keep numbers and symbols unchanged

Strings to translate (key → English value):
${JSON.stringify(batch, null, 2)}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = (data.content?.[0]?.text || "").trim();

  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Could not parse Claude response as JSON");
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

const enPath = `${LOCALES_DIR}/en.json`;
const enFlat = flatten(loadJson(enPath));
const enKeys = Object.keys(enFlat);

console.log(`\n📖 en.json: ${enKeys.length} keys`);

let totalTranslated = 0;

for (const [lng, instructions] of Object.entries(LOCALES)) {
  const path = `${LOCALES_DIR}/${lng}.json`;
  const existing = flatten(loadJson(path));

  const missing = enKeys.filter(
    (k) => !(k in existing) || existing[k] === "__MISSING__" || existing[k] === ""
  );

  if (missing.length === 0) {
    console.log(`\n✅ ${lng}.json — complete (${enKeys.length} keys). Nothing to translate.`);
    continue;
  }

  console.log(`\n🌐 ${lng}.json — ${missing.length} missing keys. Translating...`);

  const translated = { ...existing };
  const batches = Math.ceil(missing.length / BATCH_SIZE);

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batchKeys = missing.slice(i, i + BATCH_SIZE);
    const batch = {};
    batchKeys.forEach((k) => (batch[k] = enFlat[k]));

    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    process.stdout.write(`   Batch ${batchNum}/${batches} (${batchKeys.length} keys)... `);

    try {
      const result = await translateBatch(batch, lng, instructions);
      let added = 0;
      for (const [k, v] of Object.entries(result)) {
        if (k in enFlat) {
          translated[k] = v;
          added++;
        }
      }
      console.log(`✓ (${added} translated)`);
      totalTranslated += added;
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}`);
      // Keep existing values for this batch, continue
    }

    // Small pause between batches to avoid rate limits
    if (i + BATCH_SIZE < missing.length) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  // Rebuild structured JSON from flat keys (preserve en.json key ordering)
  const ordered = {};
  for (const k of enKeys) {
    if (k in translated) ordered[k] = translated[k];
  }
  // Append any extra keys from existing locale not in en.json
  for (const k of Object.keys(existing)) {
    if (!(k in ordered)) ordered[k] = existing[k];
  }

  const output = unflatten(ordered);
  writeFileSync(path, JSON.stringify(output, null, 2) + "\n");
  console.log(`   💾 Saved ${lng}.json`);
}

console.log(`\n✅ Done — ${totalTranslated} keys translated across ${Object.keys(LOCALES).length} locales.\n`);
