/**
 * run-translations.ts
 * Run with: npx tsx scripts/run-translations.ts
 *
 * Uses the same Anthropic client as the server to translate missing locale keys.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import Anthropic from "@anthropic-ai/sdk";

const LOCALES_DIR = "web/src/locales";
const LOCALES: Record<string, string> = {
  es: "Mexican/US Spanish for a cleaning business SaaS app. Natural, conversational — not overly formal.",
  pt: "Brazilian Portuguese (pt-BR) for a cleaning business SaaS app. Natural and professional.",
  ru: "Russian for a cleaning business SaaS app. Professional tone.",
};
const BATCH_SIZE = 60;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY2 || process.env.ANTHROPIC_API_KEY,
});

function flatten(obj: any, prefix = ""): Record<string, string> {
  return Object.entries(obj).reduce((acc: any, [k, v]) => {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(acc, flatten(v, full));
    } else {
      acc[full] = v;
    }
    return acc;
  }, {});
}

function unflatten(flat: Record<string, any>): any {
  const result: any = {};
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

function loadJson(path: string): any {
  if (!existsSync(path)) return {};
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return {}; }
}

async function translateBatch(
  batch: Record<string, string>,
  targetLng: string,
  instructions: string
): Promise<Record<string, string>> {
  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Translate these UI strings for a residential cleaning business SaaS app.
Target language: ${targetLng}
Instructions: ${instructions}

Rules:
- Keep {{interpolation}} placeholders exactly as-is (double curly braces)
- Return ONLY a valid JSON object mapping each exact key to its translation
- No markdown fences, no explanation, just the raw JSON object
- Match casing style of the English source
- Keep numbers, symbols, and proper nouns unchanged

Strings to translate:
${JSON.stringify(batch, null, 2)}`,
      },
    ],
  });

  const text = (msg.content[0] as any).text?.trim() ?? "";
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Failed to parse response as JSON");
  }
}

async function main() {
  const enPath = `${LOCALES_DIR}/en.json`;
  const enFlat = flatten(loadJson(enPath));
  const enKeys = Object.keys(enFlat);

  console.log(`\n📖 en.json: ${enKeys.length} keys\n`);
  let totalTranslated = 0;

  for (const [lng, instructions] of Object.entries(LOCALES)) {
    const path = `${LOCALES_DIR}/${lng}.json`;
    const existing = flatten(loadJson(path));

    const missing = enKeys.filter(
      (k) => !(k in existing) || existing[k] === "__MISSING__" || existing[k] === "" || existing[k] === "__NEEDS_TRANSLATION__"
    );

    if (missing.length === 0) {
      console.log(`✅ ${lng}.json — complete (${enKeys.length} keys)`);
      continue;
    }

    console.log(`🌐 ${lng}.json — ${missing.length} missing keys...`);
    const translated = { ...existing };
    const batches = Math.ceil(missing.length / BATCH_SIZE);

    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
      const batchKeys = missing.slice(i, i + BATCH_SIZE);
      const batch: Record<string, any> = {};
      batchKeys.forEach((k) => (batch[k] = enFlat[k]));

      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      process.stdout.write(`   Batch ${batchNum}/${batches} (${batchKeys.length} keys)... `);

      try {
        const result = await translateBatch(batch as Record<string, string>, lng, instructions);
        let added = 0;
        for (const [k, v] of Object.entries(result)) {
          if (k in enFlat) { translated[k] = v; added++; }
        }
        console.log(`✓ (${added} translated)`);
        totalTranslated += added;
      } catch (err: any) {
        console.log(`❌ FAILED: ${err.message}`);
      }

      if (i + BATCH_SIZE < missing.length) await new Promise((r) => setTimeout(r, 400));
    }

    // Rebuild with en.json key ordering
    const ordered: Record<string, any> = {};
    for (const k of enKeys) { if (k in translated) ordered[k] = translated[k]; }
    for (const k of Object.keys(existing)) { if (!(k in ordered)) ordered[k] = existing[k]; }

    writeFileSync(path, JSON.stringify(unflatten(ordered), null, 2) + "\n");
    console.log(`   💾 Saved ${lng}.json\n`);
  }

  console.log(`✅ Done — ${totalTranslated} keys translated across ${Object.keys(LOCALES).length} locales.\n`);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
