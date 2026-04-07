import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware";
import { callAI } from "../aiClient";

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketRateResult {
  zip: string;
  city: string;
  state: string;
  bedrooms: number;
  bathrooms: number;
  frequency: string;
  price_p25: number;
  price_p50: number;
  price_p75: number;
  source: "db" | "ai_generated";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseRow(row: any): Omit<MarketRateResult, "zip" | "source"> {
  return {
    city: row.city,
    state: row.state,
    bedrooms: Number(row.bedrooms),
    bathrooms: Number(row.bathrooms),
    frequency: row.frequency,
    price_p25: Number(row.price_p25),
    price_p50: Number(row.price_p50),
    price_p75: Number(row.price_p75),
  };
}

/** Average numeric columns across multiple rows (for city/state aggregation). */
function averageRows(rows: any[]): { price_p25: number; price_p50: number; price_p75: number } {
  const avg = (col: string) =>
    Math.round(rows.reduce((sum, r) => sum + Number(r[col] ?? 0), 0) / rows.length);
  return {
    price_p25: avg("price_p25"),
    price_p50: avg("price_p50"),
    price_p75: avg("price_p75"),
  };
}

/** Look up city + state for a zip from any row we already have in the table. */
async function getCityStateFromZip(zip: string): Promise<{ city: string; state: string } | null> {
  const { rows } = await pool.query<{ city: string; state: string }>(
    `SELECT city, state FROM market_rates WHERE zip_code = $1 LIMIT 1`,
    [zip]
  );
  return rows[0] ?? null;
}

/** Generate market rate data on the fly via Claude and cache it. */
async function generateAndCache(
  zip: string,
  city: string,
  state: string,
  bedrooms: number,
  bathrooms: number,
  frequency: string
): Promise<{ price_p25: number; price_p50: number; price_p75: number } | null> {
  const prompt = `A residential cleaning company needs market rate pricing data for:
Location: ${city}, ${state} (zip: ${zip})
Property: ${bedrooms} bedroom(s), ${bathrooms} bathroom(s)
Cleaning frequency: ${frequency}

Based on real 2024-2025 market conditions for this specific area, provide realistic price percentiles for a residential cleaning visit. Account for local cost of living and market competition.

Return ONLY valid JSON, no markdown:
{
  "price_p10": <number>,
  "price_p25": <number>,
  "price_p50": <number>,
  "price_p75": <number>,
  "price_p90": <number>,
  "sample_size": <estimated data points 20-200>
}

Rules:
- p10 < p25 < p50 < p75 < p90 must hold
- Recurring (weekly/biweekly/monthly) prices are per-visit
- Weekly is cheapest per-visit; onetime is most expensive
- Typical onetime = 1.4-2x the weekly per-visit price`;

  let parsed: any;
  try {
    const { content } = await callAI(
      [
        {
          role: "system",
          content:
            "You are a market research analyst specializing in residential cleaning service pricing. Return ONLY valid JSON with no other text.",
        },
        { role: "user", content: prompt },
      ],
      { maxTokens: 1024, route: "market-rates-ai-generate" }
    );

    parsed = JSON.parse(content.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim());
  } catch (err: any) {
    console.error("[marketRates] AI generation failed:", err.message);
    return null;
  }

  const p10 = Number(parsed.price_p10);
  const p25 = Number(parsed.price_p25);
  const p50 = Number(parsed.price_p50);
  const p75 = Number(parsed.price_p75);
  const p90 = Number(parsed.price_p90);
  const sampleSize = parsed.sample_size ? Number(parsed.sample_size) : null;

  if (!p50 || isNaN(p50)) return null;

  // Cache to DB so the next identical request hits the DB path
  try {
    await pool.query(
      `INSERT INTO market_rates
         (zip_code, city, state, bedrooms, bathrooms, frequency,
          price_p10, price_p25, price_p50, price_p75, price_p90, sample_size, last_updated)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       ON CONFLICT (zip_code, bedrooms, bathrooms, frequency)
       DO UPDATE SET
         city        = EXCLUDED.city,
         state       = EXCLUDED.state,
         price_p10   = EXCLUDED.price_p10,
         price_p25   = EXCLUDED.price_p25,
         price_p50   = EXCLUDED.price_p50,
         price_p75   = EXCLUDED.price_p75,
         price_p90   = EXCLUDED.price_p90,
         sample_size = EXCLUDED.sample_size,
         last_updated = NOW()`,
      [zip, city, state, bedrooms, bathrooms, frequency, p10, p25, p50, p75, p90, sampleSize]
    );
    console.log(`[marketRates] Cached AI-generated rate for ${zip} ${bedrooms}bd/${bathrooms}ba ${frequency}`);
  } catch (cacheErr: any) {
    console.warn("[marketRates] DB cache write failed:", cacheErr.message);
  }

  return { price_p25: p25 || p50, price_p50: p50, price_p75: p75 || p50 };
}

// ─── Route ────────────────────────────────────────────────────────────────────

/**
 * GET /api/market-rates
 * Query params: zip, bedrooms, bathrooms, frequency
 *
 * Fallback chain:
 *   1. Exact zip + beds + baths + frequency match
 *   2. City match (same beds/baths/freq), averaged across city records
 *   3. State match (same beds/baths/freq), averaged across state records
 *   4. AI-generated estimate (cached to DB for future requests)
 */
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const { zip, bedrooms, bathrooms, frequency } = req.query;

  if (!zip || !bedrooms || !bathrooms || !frequency) {
    return res
      .status(400)
      .json({ message: "zip, bedrooms, bathrooms, and frequency are required" });
  }

  const zipStr = String(zip).trim();
  const beds = Number(bedrooms);
  const baths = Number(bathrooms);
  const freq = String(frequency).trim().toLowerCase();

  if (isNaN(beds) || beds < 1 || beds > 10) {
    return res.status(400).json({ message: "bedrooms must be between 1 and 10" });
  }
  if (isNaN(baths) || baths < 0.5 || baths > 10) {
    return res.status(400).json({ message: "bathrooms must be between 0.5 and 10" });
  }
  if (!["weekly", "biweekly", "monthly", "onetime"].includes(freq)) {
    return res
      .status(400)
      .json({ message: "frequency must be weekly, biweekly, monthly, or onetime" });
  }

  // ── Step 1: Exact zip + beds + baths + frequency ─────────────────────────
  const exactMatch = await pool.query(
    `SELECT zip_code, city, state, bedrooms, bathrooms, frequency,
            price_p25, price_p50, price_p75
     FROM market_rates
     WHERE zip_code = $1 AND bedrooms = $2 AND bathrooms = $3 AND frequency = $4
     LIMIT 1`,
    [zipStr, beds, baths, freq]
  );

  if (exactMatch.rows.length > 0) {
    const r = exactMatch.rows[0];
    return res.json({
      zip: zipStr,
      ...parseRow(r),
      source: "db",
    } as MarketRateResult);
  }

  // ── Step 2: Look up city/state so we can do a city fallback ──────────────
  const cityState = await getCityStateFromZip(zipStr);

  if (cityState) {
    const cityMatch = await pool.query(
      `SELECT city, state, bedrooms, bathrooms, frequency,
              price_p25, price_p50, price_p75
       FROM market_rates
       WHERE city = $1 AND state = $2 AND bedrooms = $3 AND bathrooms = $4 AND frequency = $5`,
      [cityState.city, cityState.state, beds, baths, freq]
    );

    if (cityMatch.rows.length > 0) {
      const avg = averageRows(cityMatch.rows);
      return res.json({
        zip: zipStr,
        city: cityState.city,
        state: cityState.state,
        bedrooms: beds,
        bathrooms: baths,
        frequency: freq,
        ...avg,
        source: "db",
      } as MarketRateResult);
    }

    // ── Step 3: State fallback (same beds/baths/freq, any city in state) ───
    const stateMatch = await pool.query(
      `SELECT city, state, bedrooms, bathrooms, frequency,
              price_p25, price_p50, price_p75
       FROM market_rates
       WHERE state = $1 AND bedrooms = $2 AND bathrooms = $3 AND frequency = $4
       LIMIT 50`,
      [cityState.state, beds, baths, freq]
    );

    if (stateMatch.rows.length > 0) {
      const avg = averageRows(stateMatch.rows);
      return res.json({
        zip: zipStr,
        city: cityState.city,
        state: cityState.state,
        bedrooms: beds,
        bathrooms: baths,
        frequency: freq,
        ...avg,
        source: "db",
      } as MarketRateResult);
    }
  }

  // ── Step 4: AI-generated estimate (cached to DB) ──────────────────────────
  // We need a city/state for the prompt — either from DB or we ask Claude to infer it
  let inferredCity = cityState?.city ?? "Unknown City";
  let inferredState = cityState?.state ?? "US";

  // If we don't know the city/state, ask Claude to infer from zip (one quick call)
  if (!cityState) {
    try {
      const { content } = await callAI(
        [
          { role: "system", content: "Return ONLY valid JSON, no other text." },
          {
            role: "user",
            content: `What city and state does US zip code ${zipStr} belong to? Return JSON: {"city":"...","state":"XX"}`,
          },
        ],
        { maxTokens: 100, route: "market-rates-zip-lookup" }
      );
      const loc = JSON.parse(content.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim());
      if (loc.city) inferredCity = loc.city;
      if (loc.state) inferredState = loc.state;
    } catch {
      // Keep defaults — Claude will still produce reasonable estimates
    }
  }

  const aiResult = await generateAndCache(zipStr, inferredCity, inferredState, beds, baths, freq);

  if (!aiResult) {
    return res.status(503).json({
      message: "Market rate data is not available for this area yet. Try again later.",
    });
  }

  return res.json({
    zip: zipStr,
    city: inferredCity,
    state: inferredState,
    bedrooms: beds,
    bathrooms: baths,
    frequency: freq,
    ...aiResult,
    source: "ai_generated",
  } as MarketRateResult);
});

export default router;
