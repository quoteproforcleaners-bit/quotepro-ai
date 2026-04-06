/**
 * Market Rate Intelligence Seed Script
 * Generates realistic residential cleaning market rate data for the top 50 US metros
 * using Claude AI and inserts it into the market_rates table.
 *
 * Run: node scripts/seed-market-rates.js
 * Idempotent: safe to re-run (uses ON CONFLICT DO UPDATE)
 */

"use strict";

const { Pool } = require("pg");
const Anthropic = require("@anthropic-ai/sdk").default;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Top 50 US metros by cleaning business density, with representative zip codes
const METROS = [
  { city: "New York",        state: "NY", zip: "10001" },
  { city: "Los Angeles",     state: "CA", zip: "90001" },
  { city: "Chicago",         state: "IL", zip: "60601" },
  { city: "Houston",         state: "TX", zip: "77001" },
  { city: "Phoenix",         state: "AZ", zip: "85001" },
  { city: "Philadelphia",    state: "PA", zip: "19101" },
  { city: "San Antonio",     state: "TX", zip: "78201" },
  { city: "San Diego",       state: "CA", zip: "92101" },
  { city: "Dallas",          state: "TX", zip: "75201" },
  { city: "San Jose",        state: "CA", zip: "95101" },
  { city: "Austin",          state: "TX", zip: "78701" },
  { city: "Jacksonville",    state: "FL", zip: "32099" },
  { city: "Fort Worth",      state: "TX", zip: "76101" },
  { city: "Columbus",        state: "OH", zip: "43085" },
  { city: "Charlotte",       state: "NC", zip: "28201" },
  { city: "Indianapolis",    state: "IN", zip: "46201" },
  { city: "San Francisco",   state: "CA", zip: "94102" },
  { city: "Seattle",         state: "WA", zip: "98101" },
  { city: "Denver",          state: "CO", zip: "80201" },
  { city: "Nashville",       state: "TN", zip: "37201" },
  { city: "Oklahoma City",   state: "OK", zip: "73101" },
  { city: "El Paso",         state: "TX", zip: "79901" },
  { city: "Washington",      state: "DC", zip: "20001" },
  { city: "Las Vegas",       state: "NV", zip: "89101" },
  { city: "Louisville",      state: "KY", zip: "40201" },
  { city: "Memphis",         state: "TN", zip: "38101" },
  { city: "Portland",        state: "OR", zip: "97201" },
  { city: "Baltimore",       state: "MD", zip: "21201" },
  { city: "Milwaukee",       state: "WI", zip: "53201" },
  { city: "Albuquerque",     state: "NM", zip: "87101" },
  { city: "Tucson",          state: "AZ", zip: "85701" },
  { city: "Fresno",          state: "CA", zip: "93701" },
  { city: "Mesa",            state: "AZ", zip: "85201" },
  { city: "Sacramento",      state: "CA", zip: "95801" },
  { city: "Atlanta",         state: "GA", zip: "30301" },
  { city: "Kansas City",     state: "MO", zip: "64101" },
  { city: "Omaha",           state: "NE", zip: "68101" },
  { city: "Colorado Springs",state: "CO", zip: "80901" },
  { city: "Raleigh",         state: "NC", zip: "27601" },
  { city: "Long Beach",      state: "CA", zip: "90801" },
  { city: "Virginia Beach",  state: "VA", zip: "23450" },
  { city: "Minneapolis",     state: "MN", zip: "55401" },
  { city: "Tampa",           state: "FL", zip: "33601" },
  { city: "New Orleans",     state: "LA", zip: "70112" },
  { city: "Arlington",       state: "TX", zip: "76001" },
  { city: "Wichita",         state: "KS", zip: "67201" },
  { city: "Bakersfield",     state: "CA", zip: "93301" },
  { city: "Aurora",          state: "CO", zip: "80010" },
  { city: "Anaheim",         state: "CA", zip: "92801" },
  { city: "Santa Ana",       state: "CA", zip: "92701" },
];

const BEDROOMS = [1, 2, 3, 4, 5];
const BATHROOMS = [1.0, 1.5, 2.0, 2.5, 3.0];
const FREQUENCIES = ["weekly", "biweekly", "monthly", "onetime"];

function buildPrompt(city, state) {
  const combos = [];
  for (const bed of BEDROOMS) {
    for (const bath of BATHROOMS) {
      for (const freq of FREQUENCIES) {
        combos.push({ bedrooms: bed, bathrooms: bath, frequency: freq });
      }
    }
  }

  return `Generate realistic 2024-2025 residential house cleaning market rate data for ${city}, ${state}.

You must return a JSON array with exactly ${combos.length} objects — one for each combination below.
Base prices on real market conditions for ${city}, ${state}. Account for local cost of living.
All prices in USD. p10 < p25 < p50 < p75 < p90 must always be true.
Recurring services (weekly/biweekly/monthly) are per-visit prices, not annual totals.
Weekly visits are cheapest per-visit. Onetime is the most expensive per-visit.

Combinations to price (in this exact order):
${combos.map((c, i) => `${i + 1}. beds:${c.bedrooms} baths:${c.bathrooms} freq:${c.frequency}`).join("\n")}

Return ONLY valid JSON array, no markdown, no preamble, no explanation:
[
  {
    "zip_code": "${/* use the city's main zip */ ""}",
    "city": "${city}",
    "state": "${state}",
    "bedrooms": <number>,
    "bathrooms": <number>,
    "frequency": "<weekly|biweekly|monthly|onetime>",
    "price_p10": <number>,
    "price_p25": <number>,
    "price_p50": <number>,
    "price_p75": <number>,
    "price_p90": <number>,
    "sample_size": <estimated number of data points, 20-500>
  },
  ...
]`;
}

function buildPromptWithZip(city, state, zip) {
  const combos = [];
  for (const bed of BEDROOMS) {
    for (const bath of BATHROOMS) {
      for (const freq of FREQUENCIES) {
        combos.push({ bedrooms: bed, bathrooms: bath, frequency: freq });
      }
    }
  }

  return `Generate realistic 2024-2025 residential house cleaning market rate data for ${city}, ${state} (zip: ${zip}).

Return a JSON array with exactly ${combos.length} objects — one per combination below.
Base prices on real market conditions for this area. Account for local cost of living.
All prices USD. p10 < p25 < p50 < p75 < p90 must hold. Recurring = per-visit price.
Weekly is cheapest per-visit. Onetime is most expensive. Typical onetime = 1.4-2x weekly price.

${combos.map((c, i) => `${i + 1}. beds:${c.bedrooms} baths:${c.bathrooms} freq:${c.frequency}`).join("\n")}

Return ONLY a valid JSON array, no markdown, no extra text:
[{"zip_code":"${zip}","city":"${city}","state":"${state}","bedrooms":N,"bathrooms":N,"frequency":"...","price_p10":N,"price_p25":N,"price_p50":N,"price_p75":N,"price_p90":N,"sample_size":N},...]`;
}

async function generateForMetro(metro) {
  const { city, state, zip } = metro;
  const prompt = buildPromptWithZip(city, state, zip);

  const expectedRows = BEDROOMS.length * BATHROOMS.length * FREQUENCIES.length;

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        system: "You are a market research analyst specializing in residential cleaning service pricing. Return ONLY valid JSON arrays with no other text.",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 6000,
      });

      const raw = (response.content[0]).text?.trim() || "";
      if (!raw) throw new Error("Empty response from Claude");

      // Strip any markdown fences if present
      const cleaned = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

      let rows;
      try {
        rows = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error(`  [${city}] JSON parse failed on attempt ${attempt}:`, parseErr.message);
        if (attempt >= maxAttempts) throw parseErr;
        await sleep(2000);
        continue;
      }

      if (!Array.isArray(rows)) {
        throw new Error(`Expected array, got ${typeof rows}`);
      }

      if (rows.length < expectedRows * 0.8) {
        console.warn(`  [${city}] WARNING: Got ${rows.length} rows, expected ${expectedRows}. Proceeding anyway.`);
      }

      return rows;
    } catch (err) {
      console.error(`  [${city}] Attempt ${attempt} failed:`, err.message);
      if (attempt >= maxAttempts) throw err;
      await sleep(3000 * attempt);
    }
  }
}

async function upsertRows(rows) {
  if (!rows || rows.length === 0) return 0;

  const validRows = rows.filter(
    (r) =>
      r.zip_code &&
      r.city &&
      r.state &&
      typeof r.bedrooms === "number" &&
      typeof r.bathrooms === "number" &&
      r.frequency &&
      typeof r.price_p10 === "number" &&
      typeof r.price_p50 === "number" &&
      typeof r.price_p90 === "number"
  );

  if (validRows.length === 0) {
    console.warn("  No valid rows to insert after filtering");
    return 0;
  }

  let inserted = 0;
  for (const r of validRows) {
    try {
      await pool.query(
        `INSERT INTO market_rates
           (zip_code, city, state, bedrooms, bathrooms, frequency,
            price_p10, price_p25, price_p50, price_p75, price_p90, sample_size, last_updated)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
         ON CONFLICT (zip_code, bedrooms, bathrooms, frequency)
         DO UPDATE SET
           city         = EXCLUDED.city,
           state        = EXCLUDED.state,
           price_p10    = EXCLUDED.price_p10,
           price_p25    = EXCLUDED.price_p25,
           price_p50    = EXCLUDED.price_p50,
           price_p75    = EXCLUDED.price_p75,
           price_p90    = EXCLUDED.price_p90,
           sample_size  = EXCLUDED.sample_size,
           last_updated = NOW()`,
        [
          String(r.zip_code),
          String(r.city),
          String(r.state).toUpperCase().slice(0, 2),
          Number(r.bedrooms),
          Number(r.bathrooms),
          String(r.frequency),
          Number(r.price_p10),
          r.price_p25 != null ? Number(r.price_p25) : null,
          Number(r.price_p50),
          r.price_p75 != null ? Number(r.price_p75) : null,
          Number(r.price_p90),
          r.sample_size != null ? Number(r.sample_size) : null,
        ]
      );
      inserted++;
    } catch (rowErr) {
      console.error("  Row insert error:", rowErr.message, r);
    }
  }
  return inserted;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("=".repeat(60));
  console.log("QuotePro AI — Market Rate Intelligence Seed");
  console.log(`Seeding ${METROS.length} metros × ${BEDROOMS.length * BATHROOMS.length * FREQUENCIES.length} combinations`);
  console.log("=".repeat(60));

  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL is not set");
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ERROR: ANTHROPIC_API_KEY is not set");
    process.exit(1);
  }

  // Check existing count
  const { rows: [{ count: existingCount }] } = await pool.query("SELECT COUNT(*) FROM market_rates");
  console.log(`Existing rows in market_rates: ${existingCount}`);

  let totalInserted = 0;
  let totalFailed = 0;

  // Process in batches of 5 to respect rate limits
  const BATCH_SIZE = 5;
  for (let i = 0; i < METROS.length; i += BATCH_SIZE) {
    const batch = METROS.slice(i, i + BATCH_SIZE);
    console.log(`\nBatch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(METROS.length / BATCH_SIZE)}: ${batch.map((m) => m.city).join(", ")}`);

    // Process batch in parallel
    const results = await Promise.allSettled(
      batch.map(async (metro) => {
        process.stdout.write(`  [${metro.city}] Generating...`);
        try {
          const rows = await generateForMetro(metro);
          const inserted = await upsertRows(rows);
          process.stdout.write(` ${inserted} rows\n`);
          return inserted;
        } catch (err) {
          process.stdout.write(` FAILED: ${err.message}\n`);
          throw err;
        }
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        totalInserted += result.value;
      } else {
        totalFailed++;
      }
    }

    // Pause between batches to avoid rate limiting
    if (i + BATCH_SIZE < METROS.length) {
      console.log(`  Waiting 2s before next batch...`);
      await sleep(2000);
    }
  }

  const { rows: [{ count: finalCount }] } = await pool.query("SELECT COUNT(*) FROM market_rates");

  console.log("\n" + "=".repeat(60));
  console.log(`DONE. Rows inserted/updated: ${totalInserted}`);
  console.log(`Failed metros: ${totalFailed}`);
  console.log(`Total rows in market_rates: ${finalCount}`);
  console.log("=".repeat(60));

  await pool.end();
}

main().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
