/**
 * Industry benchmark data for commercial cleaning.
 * Sources: ISSA 2025 Cleaning Industry Benchmarks + BSCAI 2024 Market Survey.
 */

import type { FacilityType } from "./pricingEngine";

// ─── National averages ($/sqft/month) ─────────────────────────────────────────

export interface NationalBenchmark {
  low: number;   // $/sqft/month — 25th percentile
  mid: number;   // $/sqft/month — median
  high: number;  // $/sqft/month — 75th percentile
  source: string;
  year: number;
}

export const NATIONAL_AVERAGES: Record<FacilityType, NationalBenchmark> = {
  Office:     { low: 0.28, mid: 0.38, high: 0.48, source: "BSCAI",  year: 2024 },
  Retail:     { low: 0.24, mid: 0.32, high: 0.40, source: "ISSA",   year: 2025 },
  Medical:    { low: 0.48, mid: 0.60, high: 0.72, source: "ISSA",   year: 2025 },
  Gym:        { low: 0.40, mid: 0.50, high: 0.60, source: "ISSA",   year: 2025 },
  School:     { low: 0.32, mid: 0.42, high: 0.52, source: "BSCAI",  year: 2024 },
  Warehouse:  { low: 0.16, mid: 0.22, high: 0.28, source: "ISSA",   year: 2024 },
  Restaurant: { low: 0.52, mid: 0.66, high: 0.80, source: "ISSA",   year: 2025 },
  Other:      { low: 0.28, mid: 0.38, high: 0.48, source: "ISSA",   year: 2024 },
};

// ─── Benchmark comparison result ─────────────────────────────────────────────

export type BenchmarkPosition = "well_below" | "below" | "within" | "above" | "well_above";

export interface BenchmarkResult {
  position: BenchmarkPosition;
  pctVsMedian: number;   // + = above median, - = below
  pctVsLow: number;
  pctVsHigh: number;
  nationalMonthlyLow: number;
  nationalMonthlyMid: number;
  nationalMonthlyHigh: number;
  source: string;
  year: number;
  facilityType: FacilityType;
}

/**
 * Compare a monthly price to national averages for a facility type & sqft.
 */
export function compareToBenchmark(
  monthlyPrice: number,
  facilityType: FacilityType,
  totalSqFt: number,
): BenchmarkResult | null {
  if (totalSqFt <= 0 || monthlyPrice <= 0) return null;
  const nat = NATIONAL_AVERAGES[facilityType];
  if (!nat) return null;

  const natMonthlyLow  = nat.low  * totalSqFt;
  const natMonthlyMid  = nat.mid  * totalSqFt;
  const natMonthlyHigh = nat.high * totalSqFt;

  const pctVsMedian = ((monthlyPrice - natMonthlyMid) / natMonthlyMid) * 100;
  const pctVsLow    = ((monthlyPrice - natMonthlyLow) / natMonthlyLow) * 100;
  const pctVsHigh   = ((monthlyPrice - natMonthlyHigh) / natMonthlyHigh) * 100;

  let position: BenchmarkPosition;
  if (monthlyPrice < natMonthlyLow * 0.85)        position = "well_below";
  else if (monthlyPrice < natMonthlyLow)           position = "below";
  else if (monthlyPrice <= natMonthlyHigh)         position = "within";
  else if (monthlyPrice <= natMonthlyHigh * 1.20)  position = "above";
  else                                              position = "well_above";

  return {
    position, pctVsMedian, pctVsLow, pctVsHigh,
    nationalMonthlyLow: natMonthlyLow,
    nationalMonthlyMid: natMonthlyMid,
    nationalMonthlyHigh: natMonthlyHigh,
    source: nat.source, year: nat.year, facilityType,
  };
}

/**
 * Human-readable badge text for a benchmark result.
 */
export function benchmarkBadgeText(r: BenchmarkResult): string {
  const abs = Math.abs(Math.round(r.pctVsMedian));
  const facilityLabel = r.facilityType === "Other" ? "commercial" : r.facilityType.toLowerCase();
  switch (r.position) {
    case "well_below": return `${abs}% below national median for ${facilityLabel} — consider reviewing scope`;
    case "below":      return `${abs}% below national median for ${facilityLabel} buildings`;
    case "within":     return `Within national range for ${facilityLabel} facilities`;
    case "above":      return `${abs}% above national median — justified by scope or local market`;
    case "well_above": return `${abs}% above national high — review inputs or add premium justification`;
  }
}

export const BENCHMARK_CITATIONS = {
  ISSA_2025: "ISSA 2025 Cleaning Industry Production Rates",
  ISSA_2024: "ISSA 2024 Cleaning Industry Production Rates",
  BSCAI_2024: "BSCAI 2024 Building Service Contractors Market Survey",
} as const;
