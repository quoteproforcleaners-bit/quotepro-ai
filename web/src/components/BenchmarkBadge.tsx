/**
 * BenchmarkBadge.tsx — shared industry benchmark comparison components
 *
 * CommercialBenchmarkBadge: compares monthly price vs BSCAI/ISSA national data
 * ResidentialBenchmarkBadge: compares visit price vs HomeAdvisor/Angi 2026 national data
 * TierBenchmarkPill: compact inline pill for use in tier cards
 */

import { BadgeCheck, TrendingUp, TrendingDown, AlertTriangle, Info } from "lucide-react";
import { Tooltip } from "./Tooltip";
import { compareToBenchmark, benchmarkBadgeText, NATIONAL_AVERAGES, BENCHMARK_CITATIONS } from "../lib/benchmarks";
import type { FacilityType } from "../lib/pricingEngine";

// ─── Residential benchmark data (HomeAdvisor / Angi 2026) ────────────────────

const RESIDENTIAL_BENCHMARKS: Record<number, { low: number; high: number; avg: number; source: string }> = {
  1: { low: 75,  high: 110, avg: 92,  source: "HomeAdvisor 2026" },
  2: { low: 100, high: 155, avg: 127, source: "HomeAdvisor 2026" },
  3: { low: 130, high: 185, avg: 157, source: "Angi 2026" },
  4: { low: 175, high: 250, avg: 212, source: "Angi 2026" },
  5: { low: 220, high: 340, avg: 278, source: "HomeAdvisor 2026" },
};

function getResidentialBenchmark(beds: number) {
  return RESIDENTIAL_BENCHMARKS[Math.min(5, Math.max(1, beds))] ?? RESIDENTIAL_BENCHMARKS[3];
}

// ─── Shared style config ─────────────────────────────────────────────────────

type Position = "well_below" | "below" | "within" | "above" | "well_above";

const POSITION_CONFIG: Record<Position, { bg: string; border: string; text: string; Icon: typeof BadgeCheck }> = {
  well_below: { bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-400",   Icon: AlertTriangle },
  below:      { bg: "bg-blue-50 dark:bg-blue-900/20",   border: "border-blue-200 dark:border-blue-800",   text: "text-blue-700 dark:text-blue-400",     Icon: TrendingDown  },
  within:     { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-400", Icon: BadgeCheck },
  above:      { bg: "bg-violet-50 dark:bg-violet-900/20",   border: "border-violet-200 dark:border-violet-800",   text: "text-violet-700 dark:text-violet-400",   Icon: TrendingUp  },
  well_above: { bg: "bg-red-50 dark:bg-red-900/20",         border: "border-red-200 dark:border-red-800",         text: "text-red-700 dark:text-red-400",          Icon: AlertTriangle },
};

function positionFromPrice(price: number, low: number, high: number): Position {
  const mid = (low + high) / 2;
  const pct = (price - mid) / mid;
  if (pct < -0.25) return "well_below";
  if (pct < -0.08) return "below";
  if (pct >  0.25) return "well_above";
  if (pct >  0.08) return "above";
  return "within";
}

// ─── Mini bar visualisation ──────────────────────────────────────────────────

function MiniBar({ price, low, high }: { price: number; low: number; high: number }) {
  const maxVal = Math.max(high * 1.25, price * 1.1);
  const lowPct  = Math.min(100, (low   / maxVal) * 100);
  const highPct = Math.min(100, (high  / maxVal) * 100);
  const yourPct = Math.min(100, (price / maxVal) * 100);
  return (
    <div className="mt-2.5 relative h-2 bg-white dark:bg-zinc-800 rounded-full overflow-hidden border border-slate-100 dark:border-zinc-700">
      <div className="absolute h-full bg-slate-200 dark:bg-zinc-600 rounded-full"
        style={{ left: `${lowPct}%`, width: `${Math.max(0, highPct - lowPct)}%` }} />
      <div className="absolute h-full w-0.5 bg-current rounded-full" style={{ left: `${yourPct}%` }} />
    </div>
  );
}

// ─── CommercialBenchmarkBadge ────────────────────────────────────────────────

export interface CommercialBenchmarkBadgeProps {
  monthlyPrice: number;
  facilityType?: FacilityType;
  totalSqFt?: number;
  /** "full" (default) | "compact" — compact omits the mini bar and source line */
  size?: "full" | "compact";
}

export function CommercialBenchmarkBadge({
  monthlyPrice, facilityType, totalSqFt, size = "full",
}: CommercialBenchmarkBadgeProps) {
  if (!facilityType || !totalSqFt || totalSqFt <= 0) return null;
  const bm = compareToBenchmark(monthlyPrice, facilityType, totalSqFt);
  if (!bm) return null;

  const text = benchmarkBadgeText(bm);
  const c = POSITION_CONFIG[bm.position as Position];
  const { Icon } = c;
  const natRange = NATIONAL_AVERAGES[facilityType];

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${c.bg} ${c.border}`}>
      <div className={`flex items-start gap-2 ${c.text}`}>
        <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-tight">Industry Benchmark</p>
          <p className="text-[11px] mt-0.5 leading-relaxed">{text}</p>
        </div>
        <Tooltip
          text={`National range for ${facilityType} buildings: $${bm.nationalMonthlyLow.toLocaleString(undefined, { maximumFractionDigits: 0 })}–$${bm.nationalMonthlyHigh.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo (${totalSqFt.toLocaleString()} sq ft × $${natRange ? `${natRange.low.toFixed(2)}–${natRange.high.toFixed(2)}` : "?"}/sqft/mo). Median: $${bm.nationalMonthlyMid.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo.`}
          source={`${bm.source} ${bm.year}`}
          side="left"
        />
      </div>
      {size === "full" && (
        <>
          <MiniBar price={monthlyPrice} low={bm.nationalMonthlyLow} high={bm.nationalMonthlyHigh} />
          <div className="flex justify-between text-[10px] mt-1 opacity-60">
            <span>${bm.nationalMonthlyLow.toLocaleString(undefined, { maximumFractionDigits: 0 })} low</span>
            <span>Your estimate</span>
            <span>${bm.nationalMonthlyHigh.toLocaleString(undefined, { maximumFractionDigits: 0 })} high</span>
          </div>
          <p className="text-[10px] mt-1 opacity-50">Source: {bm.source} {bm.year}</p>
        </>
      )}
    </div>
  );
}

// ─── ResidentialBenchmarkBadge ───────────────────────────────────────────────

export interface ResidentialBenchmarkBadgeProps {
  visitPrice: number;
  beds: number;
  frequency?: string;
  size?: "full" | "compact";
}

export function ResidentialBenchmarkBadge({
  visitPrice, beds, frequency, size = "full",
}: ResidentialBenchmarkBadgeProps) {
  if (!beds || beds <= 0) return null;
  const bm = getResidentialBenchmark(beds);

  // Adjust benchmark for recurring (recurring cleans are typically cheaper one-time equivalent)
  const adjustedLow  = frequency === "weekly" || frequency === "biweekly" ? bm.low  * 0.8 : bm.low;
  const adjustedHigh = frequency === "weekly" || frequency === "biweekly" ? bm.high * 0.8 : bm.high;
  const adjustedAvg  = (adjustedLow + adjustedHigh) / 2;

  const position = positionFromPrice(visitPrice, adjustedLow, adjustedHigh);
  const c = POSITION_CONFIG[position];
  const { Icon } = c;

  const pctVsAvg = ((visitPrice - adjustedAvg) / adjustedAvg) * 100;
  const abs = Math.abs(Math.round(pctVsAvg));

  const labelMap: Record<Position, string> = {
    well_below: `${abs}% below national average — consider raising your rate`,
    below:      `${abs}% below national average for a ${beds}-bed home`,
    within:     `Within national range for a ${beds}-bed home`,
    above:      `${abs}% above national average — justified by premium service`,
    well_above: `${abs}% above national high — review your pricing`,
  };

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${c.bg} ${c.border}`}>
      <div className={`flex items-start gap-2 ${c.text}`}>
        <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-tight">National Benchmark</p>
          <p className="text-[11px] mt-0.5 leading-relaxed">{labelMap[position]}</p>
        </div>
        <Tooltip
          text={`National range for ${beds}-bedroom homes: $${Math.round(adjustedLow)}–$${Math.round(adjustedHigh)} per visit${frequency && frequency !== "one-time" ? " (recurring discount applied)" : ""}. Average: $${Math.round(adjustedAvg)}.`}
          source={bm.source}
          side="left"
        />
      </div>
      {size === "full" && (
        <>
          <MiniBar price={visitPrice} low={adjustedLow} high={adjustedHigh} />
          <div className="flex justify-between text-[10px] mt-1 opacity-60">
            <span>${Math.round(adjustedLow)} low</span>
            <span>Your price</span>
            <span>${Math.round(adjustedHigh)} high</span>
          </div>
          <p className="text-[10px] mt-1 opacity-50">Source: {bm.source} · one-time standard clean</p>
        </>
      )}
    </div>
  );
}

// ─── TierBenchmarkPill — compact inline pill for tier cards ──────────────────

export interface TierBenchmarkPillProps {
  /** The tier's price (per visit for residential, per month for commercial) */
  price: number;
  /** For commercial: facilityType + totalSqFt. For residential: beds */
  facilityType?: FacilityType;
  totalSqFt?: number;
  beds?: number;
  mode: "commercial" | "residential";
}

export function TierBenchmarkPill({ price, facilityType, totalSqFt, beds, mode }: TierBenchmarkPillProps) {
  let position: Position | null = null;
  let labelShort = "";

  if (mode === "commercial" && facilityType && totalSqFt) {
    const bm = compareToBenchmark(price, facilityType, totalSqFt);
    if (!bm) return null;
    position = bm.position as Position;
    const pct = Math.abs(Math.round(bm.pctVsMedian));
    labelShort = position === "within" ? "Market rate" : `${pct}% ${["above","well_above"].includes(position) ? "above" : "below"} avg`;
  } else if (mode === "residential" && beds) {
    const bm = getResidentialBenchmark(beds);
    position = positionFromPrice(price, bm.low, bm.high);
    const avg = (bm.low + bm.high) / 2;
    const pct = Math.abs(Math.round(((price - avg) / avg) * 100));
    labelShort = position === "within" ? "Market rate" : `${pct}% ${["above","well_above"].includes(position) ? "above" : "below"} avg`;
  }

  if (!position) return null;
  const c = POSITION_CONFIG[position];
  const { Icon } = c;

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.bg} ${c.border} ${c.text}`}>
      <Icon className="w-3 h-3 shrink-0" />
      {labelShort}
    </span>
  );
}

// ─── ISSATooltip — reusable tooltip for ISSA citation ───────────────────────

export function ISSATooltip({ facilityType, minutesPer1k }: { facilityType: string; minutesPer1k: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
      <Info className="w-3 h-3" />
      ISSA 2026
      <Tooltip
        text={`ISSA 2026 production rate for ${facilityType}: ${minutesPer1k} min per 1,000 sq ft. Industry-standard benchmark used by BSC companies and facility managers worldwide.`}
        source={BENCHMARK_CITATIONS.ISSA_2025}
        side="right"
      />
    </span>
  );
}
