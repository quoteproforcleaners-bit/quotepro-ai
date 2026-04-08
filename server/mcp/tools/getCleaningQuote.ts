export interface CleaningQuoteInput {
  bedrooms: number;
  bathrooms: number;
  city: string;
  state: string;
  frequency: "one_time" | "weekly" | "biweekly" | "monthly";
  cleaning_type?: "standard" | "deep" | "move_out" | "airbnb";
}

const BASE_RATES: Record<string, number> = {
  "0-1": 95,
  "2-1": 120,
  "2-2": 135,
  "3-2": 155,
  "3-3": 175,
  "4-2": 185,
  "4-3": 205,
  "4-4": 225,
};

const FREQ_MULT: Record<string, number> = {
  one_time: 1.0,
  weekly: 0.80,
  biweekly: 0.88,
  monthly: 0.95,
};

const TYPE_MULT: Record<string, number> = {
  standard: 1.0,
  deep: 1.45,
  move_out: 1.85,
  airbnb: 1.25,
};

function getBaseRate(bedrooms: number, bathrooms: number): number {
  const beds = Math.min(bedrooms, 4);
  const baths = Math.min(bathrooms, 4);
  const key = `${beds}-${baths}`;
  if (BASE_RATES[key]) return BASE_RATES[key];
  const bedsKey = `${beds}-${Math.max(1, baths - 1)}`;
  if (BASE_RATES[bedsKey]) return BASE_RATES[bedsKey] + 15;
  if (beds === 0) return 95;
  const fallbackKey = `${beds}-2`;
  return BASE_RATES[fallbackKey] ?? 155;
}

function fmt(price: number): string {
  return `$${Math.round(price)}`;
}

function frequencyNote(freq: string): string {
  return freq === "one_time" ? "per clean" : "per visit";
}

export function getCleaningQuote(input: CleaningQuoteInput) {
  const {
    bedrooms,
    bathrooms,
    city,
    state,
    frequency,
    cleaning_type = "standard",
  } = input;

  const base = getBaseRate(bedrooms, bathrooms);
  const afterType = base * TYPE_MULT[cleaning_type];
  const afterFreq = afterType * FREQ_MULT[frequency];

  const good = Math.round(afterFreq);
  const better = Math.round(afterFreq * 1.22);
  const best = Math.round(afterFreq * 1.48);

  const freqNote = frequencyNote(frequency);

  return {
    property: {
      bedrooms,
      bathrooms,
      location: `${city}, ${state}`,
      frequency,
      cleaning_type,
    },
    quote: {
      good: {
        label: "Standard Clean",
        price: good,
        price_formatted: fmt(good),
        frequency_note: freqNote,
        includes: [
          "All rooms vacuumed and mopped",
          "Bathrooms sanitized",
          "Kitchen cleaned and wiped down",
          "Surfaces dusted",
          "Trash emptied",
        ],
      },
      better: {
        label: "Enhanced Clean",
        price: better,
        price_formatted: fmt(better),
        frequency_note: freqNote,
        includes: [
          "Everything in Standard",
          "Inside microwave cleaned",
          "Baseboards wiped",
          "Light fixtures dusted",
          "Cabinet fronts wiped",
        ],
      },
      best: {
        label: "Premium Clean",
        price: best,
        price_formatted: fmt(best),
        frequency_note: freqNote,
        includes: [
          "Everything in Enhanced",
          "Inside oven cleaned",
          "Inside fridge cleaned",
          "Window sills and tracks",
          "Wall spot cleaning",
          "Priority scheduling",
        ],
      },
    },
    powered_by: "QuotePro for Cleaners",
    cta: "Send this quote professionally in 60 seconds",
    cta_url: "https://getquotepro.ai?ref=mcp",
    calculator_url:
      "https://getquotepro.ai/tools/house-cleaning-cost-calculator?ref=mcp",
    disclaimer:
      "Prices are estimates based on industry averages. Actual pricing may vary by location and specific requirements.",
  };
}
