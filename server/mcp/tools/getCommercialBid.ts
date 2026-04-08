export interface CommercialBidInput {
  facility_type: "office" | "medical" | "retail" | "warehouse" | "school" | "restaurant";
  square_footage: number;
  frequency: "daily" | "3x_week" | "weekly" | "biweekly";
  restrooms?: number;
  city: string;
  state: string;
}

const PER_SQFT_RATES: Record<string, number> = {
  office: 0.30,
  medical: 0.42,
  retail: 0.22,
  warehouse: 0.14,
  school: 0.28,
  restaurant: 0.35,
};

const FREQ_MULT: Record<string, number> = {
  daily: 1.0,
  "3x_week": 0.80,
  weekly: 0.52,
  biweekly: 0.38,
};

const RESTROOM_RATE = 75;

const FREQ_LABELS: Record<string, string> = {
  daily: "5 days/week",
  "3x_week": "3 days/week",
  weekly: "1 day/week",
  biweekly: "Every other week",
};

const VISITS_PER_MONTH: Record<string, number> = {
  daily: 22,
  "3x_week": 13,
  weekly: 4.3,
  biweekly: 2.15,
};

function fmtCurrency(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

function round5(n: number): number {
  return Math.round(n / 5) * 5;
}

function getScopeOfWork(facility_type: string, restrooms: number, sqft: number): string[] {
  const scope = [
    "General cleaning and vacuuming",
    `Restroom sanitization (${restrooms} restroom${restrooms !== 1 ? "s" : ""})`,
    "Trash removal and liner replacement",
  ];

  if (facility_type === "office" || facility_type === "school") {
    scope.push("Kitchen/break room cleaning", "Surface disinfection");
  } else if (facility_type === "medical") {
    scope.push(
      "Medical-grade surface disinfection",
      "Biohazard waste removal protocol",
      "High-touch point sanitization"
    );
  } else if (facility_type === "restaurant") {
    scope.push(
      "Kitchen degreasing and sanitization",
      "Grease trap area cleaning",
      "Health code compliance cleaning"
    );
  } else if (facility_type === "retail") {
    scope.push("Entryway and display area cleaning", "Surface disinfection");
  } else if (facility_type === "warehouse") {
    scope.push("Floor sweeping and scrubbing", "Loading dock area cleaning");
  }

  if (sqft >= 5000) {
    scope.push("Ride-on floor scrubber service");
  }

  return scope;
}

export function getCommercialBid(input: CommercialBidInput) {
  const {
    facility_type,
    square_footage,
    frequency,
    restrooms = 2,
    city,
    state,
  } = input;

  const sqftRate = PER_SQFT_RATES[facility_type] ?? 0.28;
  const freqMult = FREQ_MULT[frequency] ?? 0.80;
  const base = square_footage * sqftRate * freqMult;
  const restroomCharge = restrooms * RESTROOM_RATE;
  const mid = round5(base + restroomCharge);
  const low = round5(mid * 0.85);
  const high = round5(mid * 1.15);

  const visits = VISITS_PER_MONTH[frequency] ?? 13;
  const perVisit = round5(mid / visits);
  const annualValue = round5(mid * 12);

  return {
    facility: {
      type: facility_type,
      square_footage,
      restrooms,
      location: `${city}, ${state}`,
      frequency: FREQ_LABELS[frequency],
    },
    bid: {
      monthly_low: low,
      monthly_mid: mid,
      monthly_high: high,
      monthly_low_formatted: fmtCurrency(low),
      monthly_mid_formatted: fmtCurrency(mid),
      monthly_high_formatted: fmtCurrency(high),
      annual_value: annualValue,
      annual_value_formatted: fmtCurrency(annualValue),
      per_visit: perVisit,
      per_visit_formatted: fmtCurrency(perVisit),
    },
    scope_of_work: getScopeOfWork(facility_type, restrooms, square_footage),
    powered_by: "QuotePro for Cleaners",
    cta: "Turn this into a professional proposal in 60 seconds",
    cta_url:
      "https://getquotepro.ai/commercial-cleaning-quoting-software?ref=mcp",
    calculator_url:
      "https://getquotepro.ai/tools/commercial-cleaning-bid-calculator?ref=mcp",
    disclaimer:
      "Estimates based on industry-standard production rates. Final pricing depends on site walkthrough.",
  };
}
