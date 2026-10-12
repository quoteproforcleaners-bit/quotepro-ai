/**
 * BenchmarkBadge.tsx — shared industry benchmark comparison components
 *
 * CommercialBenchmarkBadge: compares monthly price vs BSCAI/ISSA national data
 * ResidentialBenchmarkBadge: compares visit price vs HomeAdvisor/Angi 2026 national data
 * TierBenchmarkPill: compact inline pill for use in tier cards
 */

import { BadgeCheck, TrendingUp, TrendingDown, AlertTriangle, Info } from"lucide-react";
import { Tooltip } from"./Tooltip";
import { compareToBenchmark, benchmarkBadgeText, NATIONAL_AVERAGES, BENCHMARK_CITATIONS } from"../lib/benchmarks";
import type { FacilityType } from"shared/pricingEngine";

// ─── Residential benchmark data (size-bracketed) ─────────────────────────────
// Bedroom-only benchmarks were producing false-positive "84% above" warnings
// for larger homes priced normally per-sqft. Now bracketed by square footage,
// which is the single biggest driver of cleaning price.
//
// Source baseline: Angi / HomeAdvisor 2025-2026 national data for Standard
// Clean. Other services scale from Standard at industry-typical multipliers
// (Deep ~1.6x, Move-In/Out ~2.0x, Post-Construction ~3.0x, Airbnb ~0.7x).

export type ResidentialServiceCategory =
  | "standard" | "recurring" | "deep" | "moveinout" | "postconstruct" | "airbnb";

export type SqftBracket = "small" | "medium" | "large" | "xl" | "xxl";

interface BracketRange { low: number; avg: number; high: number; }

const BRACKET_LABEL: Record<SqftBracket, string> = {
  small:  "<1,000 sqft",
  medium: "1,000–1,800 sqft",
  large:  "1,800–2,500 sqft",
  xl:     "2,500–3,500 sqft",
  xxl:    "3,500+ sqft",
};

export function getSqftBracket(sqft: number): SqftBracket {
  if (sqft < 1000) return "small";
  if (sqft < 1800) return "medium";
  if (sqft < 2500) return "large";
  if (sqft < 3500) return "xl";
  return "xxl";
}

const STANDARD_BY_SQFT: Record<SqftBracket, BracketRange> = {
  small:  { low: 90,  avg: 120, high: 150 },
  medium: { low: 130, avg: 160, high: 200 },
  large:  { low: 180, avg: 230, high: 290 },
  xl:     { low: 230, avg: 300, high: 380 },
  xxl:    { low: 300, avg: 400, high: 520 },
};

const SERVICE_SOURCE: Record<ResidentialServiceCategory, string> = {
  standard:      "Angi 2026 · Standard Clean",
  recurring:     "Angi 2026 · Recurring Clean",
  deep:          "HomeAdvisor 2026 · Deep Clean",
  moveinout:     "Angi 2026 · Move In/Out",
  postconstruct: "BSCAI 2024 · Post-Construction",
  airbnb:        "AirDNA 2026 · Turnover Clean",
};

const SERVICE_MULTIPLIER: Record<ResidentialServiceCategory, number> = {
  standard: 1.0, recurring: 1.0, deep: 1.6, moveinout: 2.0, postconstruct: 3.0, airbnb: 0.7,
};

function scaleRange(r: BracketRange, mult: number): BracketRange {
  return {
    low:  Math.round(r.low  * mult),
    avg:  Math.round(r.avg  * mult),
    high: Math.round(r.high * mult),
  };
}

export function getResidentialBenchmark(
  sqft: number | undefined,
  beds: number,
  cleaningType?: ResidentialServiceCategory,
): { low: number; high: number; avg: number; source: string; bracket: SqftBracket; bracketLabel: string } {
  // sqft is the primary key; if missing, infer from bed count (rough fallback).
  const effectiveSqft = sqft && sqft > 0 ? sqft : (beds <= 1 ? 600 : beds <= 2 ? 1200 : beds <= 3 ? 1800 : beds <= 4 ? 2600 : 3600);
  const bracket = getSqftBracket(effectiveSqft);
  const baseline = STANDARD_BY_SQFT[bracket];
  const category = cleaningType ?? "standard";
  const range = SERVICE_MULTIPLIER[category] === 1.0 ? baseline : scaleRange(baseline, SERVICE_MULTIPLIER[category]);
  return {
    low: range.low,
    avg: range.avg,
    high: range.high,
    source: SERVICE_SOURCE[category],
    bracket,
    bracketLabel: BRACKET_LABEL[bracket],
  };
}

// ─── Shared style config ─────────────────────────────────────────────────────

type Position ="well_below"|"below"|"within"|"above"|"well_above";

const POSITION_CONFIG: Record<Position, { bg: string; border: string; text: string; Icon: typeof BadgeCheck }> = {
 well_below: { bg:"bg-amber-50", border:"border-amber-200", text:"text-amber-700", Icon: AlertTriangle },
 below: { bg:"bg-blue-50", border:"border-blue-200", text:"text-blue-700", Icon: TrendingDown },
 within: { bg:"bg-emerald-50", border:"border-emerald-200", text:"text-emerald-700", Icon: BadgeCheck },
 above: { bg:"bg-violet-50", border:"border-violet-200", text:"text-violet-700", Icon: TrendingUp },
 well_above: { bg:"bg-red-50", border:"border-red-200", text:"text-red-700", Icon: AlertTriangle },
};

function positionFromPrice(price: number, low: number, high: number): Position {
 const mid = (low + high) / 2;
 const pct = (price - mid) / mid;
 if (pct < -0.25) return"well_below";
 if (pct < -0.08) return"below";
 if (pct > 0.25) return"well_above";
 if (pct > 0.08) return"above";
 return"within";
}

/**
 * Tiered position relative to a size-bracketed range.
 * Spec:
 *  - within bracket → "within" (in line with national pricing)
 *  - 1–25% above high → "above" (above national average — verify scope)
 *  - 25%+ above high → "well_above" (review your pricing)
 *  - below low → "below" / "well_below" (verify margin)
 */
function bracketedPosition(price: number, low: number, high: number): Position {
  if (price >= low && price <= high) return "within";
  if (price > high) return price > high * 1.25 ? "well_above" : "above";
  return price < low * 0.75 ? "well_below" : "below";
}

// ─── Prominent Price Range Slider ────────────────────────────────────────────

function PriceSlider({
  price, low, high, colorClass,
}: {
  price: number;
  low: number;
  high: number;
  colorClass: string;
}) {
  const span = high - low;
  const extendedMin = Math.min(low * 0.85, price * 0.85);
  const extendedMax = Math.max(high * 1.15, price * 1.15);
  const totalSpan = extendedMax - extendedMin;

  const toPct = (v: number) =>
    Math.min(98, Math.max(2, ((v - extendedMin) / totalSpan) * 100));

  const lowPct = toPct(low);
  const highPct = toPct(high);
  const pricePct = toPct(price);
  const avgPct = toPct((low + high) / 2);

  const inRange = price >= low && price <= high;

  // Track color: green inside range, amber/red outside
  const thumbColor = inRange
    ? "#059669"
    : price < low
    ? "#d97706"
    : "#dc2626";

  return (
    <div style={{ marginTop: 14 }}>
      {/* Track */}
      <div style={{ position: "relative", height: 28 }}>
        {/* Background track */}
        <div style={{
          position: "absolute", top: 10, left: 0, right: 0, height: 8,
          background: "#e2e8f0", borderRadius: 999,
        }} />

        {/* Market range highlight (green zone) */}
        <div style={{
          position: "absolute", top: 10, height: 8,
          left: `${lowPct}%`,
          width: `${highPct - lowPct}%`,
          background: "linear-gradient(90deg, #bbf7d0, #34d399, #bbf7d0)",
          borderRadius: 999,
        }} />

        {/* Average midpoint tick */}
        <div style={{
          position: "absolute", top: 6, height: 16,
          left: `${avgPct}%`,
          transform: "translateX(-50%)",
          width: 2, background: "#10b981", borderRadius: 999, opacity: 0.6,
        }} />

        {/* Price thumb */}
        <div style={{
          position: "absolute", top: 4,
          left: `${pricePct}%`,
          transform: "translateX(-50%)",
          width: 20, height: 20,
          background: thumbColor,
          borderRadius: "50%",
          border: "3px solid #fff",
          boxShadow: `0 0 0 2px ${thumbColor}40, 0 2px 6px rgba(0,0,0,0.2)`,
          zIndex: 2,
        }} />

        {/* Price label above thumb */}
        <div style={{
          position: "absolute", bottom: 22,
          left: `${pricePct}%`,
          transform: "translateX(-50%)",
          background: thumbColor,
          color: "#fff",
          fontSize: 10,
          fontWeight: 700,
          padding: "2px 6px",
          borderRadius: 6,
          whiteSpace: "nowrap",
          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
        }}>
          ${Math.round(price).toLocaleString()}
        </div>
      </div>

      {/* Labels row */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        marginTop: 4, fontSize: 10, color: "#64748b",
      }}>
        <span style={{ fontWeight: 600 }}>${Math.round(low)} low</span>
        <span style={{ color: "#10b981", fontWeight: 600 }}>
          ${Math.round((low + high) / 2)} avg
        </span>
        <span style={{ fontWeight: 600 }}>${Math.round(high)} high</span>
      </div>
    </div>
  );
}

// ─── CommercialBenchmarkBadge ────────────────────────────────────────────────

export interface CommercialBenchmarkBadgeProps {
 monthlyPrice: number;
 facilityType?: FacilityType;
 totalSqFt?: number;
 /**"full"(default) |"compact"— compact omits the slider and source line */
 size?:"full"|"compact";
}

export function CommercialBenchmarkBadge({
 monthlyPrice, facilityType, totalSqFt, size ="full",
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
 <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5"/>
 <div className="flex-1 min-w-0">
 <p className="text-xs font-semibold leading-tight">Industry Benchmark</p>
 <p className="text-[11px] mt-0.5 leading-relaxed">{text}</p>
 </div>
 <Tooltip
 text={`National range for ${facilityType} buildings: $${bm.nationalMonthlyLow.toLocaleString(undefined, { maximumFractionDigits: 0 })}–$${bm.nationalMonthlyHigh.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo (${totalSqFt.toLocaleString()} sq ft × $${natRange ? `${natRange.low.toFixed(2)}–${natRange.high.toFixed(2)}` :"?"}/sqft/mo). Median: $${bm.nationalMonthlyMid.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo.`}
 source={`${bm.source} ${bm.year}`}
 side="left"
 />
 </div>
 {size ==="full"&& (
 <>
 <PriceSlider
   price={monthlyPrice}
   low={bm.nationalMonthlyLow}
   high={bm.nationalMonthlyHigh}
   colorClass={c.text}
 />
 <p className="text-[10px] mt-2 opacity-50">Source: {bm.source} {bm.year}</p>
 </>
 )}
 </div>
 );
}

// ─── ResidentialBenchmarkBadge ───────────────────────────────────────────────

export interface ResidentialBenchmarkBadgeProps {
 visitPrice: number;
 beds: number;
 sqft?: number;
 frequency?: string;
 size?:"full"|"compact";
 /** When set, picks a service-type-aware benchmark range (Airbnb, Deep, Move-In/Out, Post-Construction). Defaults to Standard Clean. */
 cleaningType?: ResidentialServiceCategory;
}

export function ResidentialBenchmarkBadge({
 visitPrice, beds, sqft, frequency, size ="full", cleaningType,
}: ResidentialBenchmarkBadgeProps) {
 if (!beds || beds <= 0) return null;
 const bm = getResidentialBenchmark(sqft, beds, cleaningType);

 // Recurring discount only applies to standard/recurring cleans — flat-price
 // service types (Airbnb, deep, move-in/out, post-construction) are typically
 // priced per visit regardless of cadence.
 const recurringDiscountApplies = !cleaningType || cleaningType ==="standard"|| cleaningType ==="recurring";
 const adjustedLow  = recurringDiscountApplies && (frequency ==="weekly"|| frequency ==="biweekly") ? Math.round(bm.low * 0.8) : bm.low;
 const adjustedHigh = recurringDiscountApplies && (frequency ==="weekly"|| frequency ==="biweekly") ? Math.round(bm.high * 0.8) : bm.high;
 const adjustedAvg = Math.round((adjustedLow + adjustedHigh) / 2);

 const position = bracketedPosition(visitPrice, adjustedLow, adjustedHigh);
 const c = POSITION_CONFIG[position];
 const { Icon } = c;

 const pctOverHigh = visitPrice > adjustedHigh ? Math.round(((visitPrice - adjustedHigh) / adjustedHigh) * 100) : 0;
 const pctUnderLow = visitPrice < adjustedLow ? Math.round(((adjustedLow - visitPrice) / adjustedLow) * 100) : 0;

 const labelMap: Record<Position, string> = {
   well_below: `${pctUnderLow}% below national low — verify your margin`,
   below:      `Below national average — verify your margin`,
   within:     `In line with national pricing for ${bm.bracketLabel} homes`,
   above:      `${pctOverHigh}% above national high — verify scope`,
   well_above: `${pctOverHigh}% above national high — review your pricing`,
 };

 const sourceLine = `${bm.source} · ${bm.bracketLabel}${recurringDiscountApplies && frequency && frequency !== "one-time" ? " · recurring discount applied" : ""}`;

 return (
 <div className={`rounded-xl border px-3 py-2.5 ${c.bg} ${c.border}`}>
 <div className={`flex items-start gap-2 ${c.text}`}>
 <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5"/>
 <div className="flex-1 min-w-0">
 <p className="text-xs font-semibold leading-tight">National Benchmark</p>
 <p className="text-[11px] mt-0.5 leading-relaxed">{labelMap[position]}</p>
 </div>
 <Tooltip
 text={`National range for ${bm.bracketLabel} homes (${beds}-bed): $${adjustedLow}–$${adjustedHigh} per visit. Average: $${adjustedAvg}. Note: comparison includes any pet/condition surcharges in your quote — actual market quotes for the same scope may differ.`}
 source={bm.source}
 side="left"
 />
 </div>
 {size ==="full"&& (
 <>
 <PriceSlider
   price={visitPrice}
   low={adjustedLow}
   high={adjustedHigh}
   colorClass={c.text}
 />
 <p className="text-[10px] mt-2 opacity-50">Source: {sourceLine}</p>
 </>
 )}
 </div>
 );
}

// ─── TierBenchmarkPill — compact inline pill for tier cards ──────────────────

export interface TierBenchmarkPillProps {
 price: number;
 facilityType?: FacilityType;
 totalSqFt?: number;
 beds?: number;
 sqft?: number;
 cleaningType?: ResidentialServiceCategory;
 mode:"commercial"|"residential";
}

export function TierBenchmarkPill({ price, facilityType, totalSqFt, beds, sqft, cleaningType, mode }: TierBenchmarkPillProps) {
 let position: Position | null = null;
 let labelShort ="";

 if (mode ==="commercial"&& facilityType && totalSqFt) {
 const bm = compareToBenchmark(price, facilityType, totalSqFt);
 if (!bm) return null;
 position = bm.position as Position;
 const pct = Math.abs(Math.round(bm.pctVsMedian));
 labelShort = position ==="within"?"Market rate": `${pct}% ${["above","well_above"].includes(position) ?"above":"below"} avg`;
 } else if (mode ==="residential"&& beds) {
 // Use the same size-bracketed source of truth as ResidentialBenchmarkBadge
 // so the pill never disagrees with the main badge.
 const bm = getResidentialBenchmark(sqft, beds, cleaningType);
 position = bracketedPosition(price, bm.low, bm.high);
 if (position === "within") {
   labelShort = "Market rate";
 } else if (price > bm.high) {
   const pct = Math.round(((price - bm.high) / bm.high) * 100);
   labelShort = `${pct}% above avg`;
 } else {
   const pct = Math.round(((bm.low - price) / bm.low) * 100);
   labelShort = `${pct}% below avg`;
 }
 }

 if (!position) return null;
 const c = POSITION_CONFIG[position];
 const { Icon } = c;

 return (
 <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.bg} ${c.border} ${c.text}`}>
 <Icon className="w-3 h-3 shrink-0"/>
 {labelShort}
 </span>
 );
}

// ─── ISSATooltip — reusable tooltip for ISSA citation ───────────────────────
export function ISSATooltip({ facilityType, minutesPer1k }: { facilityType: string; minutesPer1k: number }) {
 return (
 <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
 <Info className="w-3 h-3"/>
 ISSA 2026
 <Tooltip
 text={`ISSA 2026 production rate for ${facilityType}: ${minutesPer1k} min per 1,000 sq ft. Industry-standard benchmark used by BSC companies and facility managers worldwide.`}
 source={BENCHMARK_CITATIONS.ISSA_2025}
 side="right"
 />
 </span>
 );
}
