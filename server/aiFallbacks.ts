/**
 * Static fallbacks for every Claude API call site.
 *
 * When Claude is unavailable (network error, 5xx, timeout, malformed JSON)
 * the route should call the appropriate fallback here and return 200 with
 * sensible data rather than surfacing a 500 to the user.
 *
 * Every fallback also receives the prompt string so the caller can log it
 * (caller is responsible for the console.error — the fallback just provides
 * the data to return).
 */

// ─── Pricing analysis fallback ─────────────────────────────────────────────────

interface PriceRange {
  low: number;
  high: number;
}

/**
 * Sqft + bed/bath look-up table for residential cleaning.
 * Tiers are intentionally conservative US averages.
 */
function baseRange(beds: number, baths: number, sqft: number): PriceRange {
  // Sqft-driven base; beds/baths refine it
  let low: number;
  let high: number;

  if (sqft > 0) {
    // $/sqft bands
    if (sqft <= 600)        { low = 75;  high = 115; }
    else if (sqft <= 900)   { low = 90;  high = 130; }
    else if (sqft <= 1200)  { low = 110; high = 155; }
    else if (sqft <= 1600)  { low = 135; high = 180; }
    else if (sqft <= 2000)  { low = 155; high = 210; }
    else if (sqft <= 2500)  { low = 180; high = 240; }
    else if (sqft <= 3000)  { low = 210; high = 275; }
    else if (sqft <= 3500)  { low = 240; high = 310; }
    else                    { low = 270; high = 360; }
  } else {
    // Fall back to beds/baths
    const total = beds + baths;
    if (total <= 2)      { low = 90;  high = 130; }
    else if (total <= 3) { low = 115; high = 160; }
    else if (total <= 5) { low = 150; high = 205; }
    else if (total <= 7) { low = 195; high = 260; }
    else                 { low = 240; high = 320; }
  }

  return { low, high };
}

function frequencyMultiplier(frequency: string): number {
  const f = (frequency || "one-time").toLowerCase();
  if (f.includes("weekly") && !f.includes("bi"))  return 0.80;
  if (f.includes("biweekly") || f.includes("bi-weekly") || f.includes("every 2")) return 0.85;
  if (f.includes("monthly"))  return 0.95;
  return 1.0; // one-time, move-in/out, deep clean
}

export function fallbackPricingAnalysis(params: {
  quoteAmount: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  frequency: string;
}): {
  verdict: "too_low" | "fair" | "too_high";
  margin_risk: "high" | "medium" | "low";
  suggested_range_low: number;
  suggested_range_high: number;
  coaching_note: string;
} {
  const { quoteAmount, bedrooms, bathrooms, sqft, frequency } = params;
  const base = baseRange(bedrooms, bathrooms, sqft);
  const mult = frequencyMultiplier(frequency);
  const low  = Math.round(base.low  * mult);
  const high = Math.round(base.high * mult);

  let verdict: "too_low" | "fair" | "too_high";
  let margin_risk: "high" | "medium" | "low";

  if (quoteAmount < low * 0.88) {
    verdict     = "too_low";
    margin_risk = "high";
  } else if (quoteAmount > high * 1.12) {
    verdict     = "too_high";
    margin_risk = "low";
  } else {
    verdict     = "fair";
    margin_risk = quoteAmount < low ? "medium" : "low";
  }

  const coaching_note =
    `Our AI pricing coach is temporarily unavailable — this estimate is based on national rate tables. ` +
    `For a ${bedrooms}bd/${bathrooms}ba ${frequency} clean, the typical market range is $${low}–$${high}; ` +
    `compare your quote against this baseline and check back shortly for a personalized analysis.`;

  return { verdict, margin_risk, suggested_range_low: low, suggested_range_high: high, coaching_note };
}

// ─── Client narrative fallback ─────────────────────────────────────────────────

export function fallbackClientNarrative(params: {
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  frequency: string;
  amount: number;
}): string {
  const { bedrooms, bathrooms, sqft, frequency, amount } = params;
  const sqftClause = sqft > 0 ? `, ${sqft.toLocaleString()} sqft` : "";
  const freqLabel  = frequency === "one-time" ? "one-time clean" : `${frequency} cleaning service`;

  return (
    `Hi! I put together this quote of $${amount} for your ${bedrooms}bd/${bathrooms}ba home${sqftClause} as a ${freqLabel}. ` +
    `We take care of every room thoroughly and show up on time, every time. ` +
    `Feel free to reach out with any questions — I'm happy to walk you through exactly what's included.`
  );
}

// ─── Quote optimize fallback ───────────────────────────────────────────────────

export function fallbackOptimize(originalText: string): string {
  return originalText ||
    "Quote optimization is temporarily unavailable. Please review your quote text and try again shortly.";
}

// ─── Quote adjust fallback ─────────────────────────────────────────────────────

export function fallbackAdjust(originalProposal: string): string {
  return originalProposal ||
    "Proposal adjustment is temporarily unavailable. Your original proposal is shown above — please try again shortly.";
}

// ─── Scope of work fallback ────────────────────────────────────────────────────

export function fallbackScope(params: {
  facilityType?: string;
  sqft?: number;
  floors?: number;
  frequency?: string;
  clientName?: string;
  companyName?: string;
}): string {
  const { facilityType = "facility", sqft, floors, frequency, clientName, companyName } = params;
  const sqftLine   = sqft   ? ` (${sqft.toLocaleString()} sq ft)` : "";
  const floorsLine = floors ? `, ${floors} floor${floors !== 1 ? "s" : ""}` : "";
  const freqLine   = frequency ? ` on a ${frequency} basis` : "";
  const toLine     = clientName ? ` for ${clientName}` : "";
  const fromLine   = companyName ? ` — ${companyName}` : "";

  return (
    `## Scope of Work${fromLine}\n\n` +
    `This scope of work outlines the cleaning services to be provided${toLine} at the ${facilityType}${sqftLine}${floorsLine}${freqLine}.\n\n` +
    `**Included Services**\n` +
    `- Vacuuming and mopping all floor surfaces\n` +
    `- Dusting surfaces, furniture, and fixtures\n` +
    `- Cleaning and sanitizing all bathrooms\n` +
    `- Cleaning kitchen surfaces and appliances\n` +
    `- Emptying all trash receptacles\n` +
    `- Wiping down doors, handles, and light switches\n\n` +
    `**Not Included (Unless Agreed Separately)**\n` +
    `- Windows (exterior)\n` +
    `- Carpet or upholstery deep cleaning\n` +
    `- Biohazard or specialty cleaning\n\n` +
    `*Note: This scope was generated from our standard template. AI-enhanced scope is temporarily unavailable — contact us to customize.*`
  );
}

// ─── Commercial scope fallback ─────────────────────────────────────────────────

export function fallbackCommercialScope(facilityName: string, facilityType: string): {
  scopeParagraph: string;
  includedTasks: string[];
  excludedTasks: string[];
  rotationTasks: Array<{ task: string; frequency: string }>;
} {
  return {
    scopeParagraph: `Professional janitorial and cleaning services will be provided for ${facilityName} (${facilityType}) in accordance with industry best practices. All high-touch surfaces will be sanitized and common areas maintained to a consistent standard.`,
    includedTasks: [
      "Vacuum all carpeted areas",
      "Mop hard floor surfaces",
      "Clean and sanitize restrooms",
      "Empty trash and replace liners",
      "Dust surfaces and horizontal areas",
      "Clean break room surfaces",
      "Wipe door handles and light switches",
    ],
    excludedTasks: [
      "Exterior window cleaning",
      "Carpet deep cleaning",
      "Pressure washing",
      "Biohazard cleanup",
    ],
    rotationTasks: [
      { task: "High dusting (vents, tops of cabinets)", frequency: "Monthly" },
      { task: "Deep scrub of tile grout", frequency: "Quarterly" },
      { task: "Strip and wax hard floors", frequency: "Quarterly" },
    ],
  };
}

// ─── Commercial risk-scan fallback ─────────────────────────────────────────────

export function fallbackRiskScan(): {
  warnings: Array<{ severity: "high" | "medium" | "low"; title: string; description: string }>;
  suggestedClauses: string[];
  overallAssessment: string;
} {
  return {
    warnings: [
      {
        severity: "medium",
        title: "AI Risk Analysis Unavailable",
        description:
          "Automated risk analysis is temporarily unavailable. Manually review margin, labor hours, and contract terms before sending.",
      },
    ],
    suggestedClauses: [
      "Services will be performed during agreed-upon hours only.",
      "Client must provide access to water and electricity at no charge.",
      "Either party may terminate this agreement with 30 days written notice.",
      "Pricing is subject to annual review and adjustment.",
    ],
    overallAssessment:
      "Manual review recommended — AI risk analysis is temporarily unavailable. Check that your hourly rate covers labor, supplies, overhead, and a 40–55% gross margin before presenting this quote.",
  };
}

// ─── Admin content generation fallback ────────────────────────────────────────

export function fallbackAdminContent(type: string, params: Record<string, string>): unknown {
  if (type === "city_page") {
    const city  = params.city  || "Your City";
    const state = params.state || "Your State";
    return {
      h1:    `House Cleaning Cost in ${city}, ${state}: 2025 Pricing Guide`,
      intro: `Wondering what house cleaning costs in ${city}, ${state}? Prices vary based on home size, cleaning type, and frequency. In this guide we break down average costs for studios through large homes so you can budget with confidence.`,
      pricing_table: [
        { room_type: "Studio / Efficiency", price_low: 80,  price_high: 110, unit: "per clean" },
        { room_type: "1 Bedroom",           price_low: 100, price_high: 140, unit: "per clean" },
        { room_type: "2 Bedroom",           price_low: 130, price_high: 175, unit: "per clean" },
        { room_type: "3 Bedroom",           price_low: 160, price_high: 215, unit: "per clean" },
        { room_type: "4 Bedroom+",          price_low: 200, price_high: 280, unit: "per clean" },
      ],
      faqs: [
        { question: `How much does house cleaning cost in ${city}?`,  answer: `Prices typically range from $80 for a small studio to $280+ for a large home, depending on size and services.` },
        { question: "Is recurring cleaning cheaper than one-time?",   answer: "Yes — most services offer 10–20% off for weekly or biweekly recurring schedules." },
        { question: "What's included in a standard cleaning?",        answer: "Vacuuming, mopping, bathroom scrubbing, kitchen surfaces, and trash removal are standard. Deep cleaning costs more." },
        { question: "How do I get an accurate quote?",                answer: "Share your home's square footage, number of bedrooms and bathrooms, and your preferred frequency for the most accurate price." },
        { question: "Are cleaning companies insured?",                answer: "Reputable companies carry general liability insurance. Always verify before booking." },
      ],
      cta: `Ready to get your home sparkling? Get a free, instant quote in under 60 seconds — no obligation. Serving ${city} and surrounding areas.`,
    };
  }

  if (type === "faq") {
    const topic = params.topic || "house cleaning";
    return {
      faqs: [
        { question: `How often should I schedule ${topic}?`,                      answer: "Most households benefit from biweekly service. High-traffic homes with pets or children may prefer weekly." },
        { question: "What is typically included in a standard clean?",             answer: "Vacuuming, mopping, bathroom and kitchen cleaning, dusting, and trash removal." },
        { question: "How should I prepare before cleaners arrive?",                answer: "Declutter surfaces and secure valuables. You don't need to pre-clean — that's what we're here for." },
        { question: "Are your cleaning products safe for kids and pets?",          answer: "We use EPA-approved, low-toxicity products. Let us know about any sensitivities when booking." },
        { question: "What if I'm not happy with the result?",                      answer: "We offer a satisfaction guarantee — contact us within 24 hours and we'll re-clean at no charge." },
        { question: "How do I book or reschedule?",                                answer: "Book online in under a minute. Rescheduling is free with 48 hours notice." },
        { question: "Do I need to be home during the cleaning?",                   answer: "No — many clients provide access instructions. We'll send a confirmation when we're done." },
        { question: "What is your cancellation policy?",                           answer: "Cancel or reschedule with 48 hours notice at no charge. Late cancellations may incur a small fee." },
      ],
    };
  }

  // comparison
  const competitor = params.competitor || "national chains";
  return {
    headline:    `Why Choose Us Over ${competitor}`,
    intro:       `Not all cleaning services are equal. We built our business on showing up reliably, communicating clearly, and delivering results that speak for themselves — without the impersonal experience you get from large national chains.`,
    comparison_table: [
      { category: "Consistency",       us: "Same trained cleaner every visit",    them: "Different cleaners each time" },
      { category: "Communication",     us: "Direct line to your cleaner",         them: "Call center or app only" },
      { category: "Pricing",           us: "Transparent, instant online quotes",  them: "In-home estimate required" },
      { category: "Guarantee",         us: "24-hr satisfaction re-clean, free",   them: "Varies by location" },
      { category: "Local Commitment",  us: "Locally owned and operated",          them: "Franchise or corporate-owned" },
    ],
    closing_cta: `Get an instant quote in under 60 seconds. No obligation, no sales call — just a clear price for a spotless home.`,
  };
}
