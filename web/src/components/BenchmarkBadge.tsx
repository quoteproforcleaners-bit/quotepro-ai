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

// ─── Residential benchmark data (HomeAdvisor / Angi 2026) ────────────────────

const RESIDENTIAL_BENCHMARKS: Record<number, { low: number; high: number; avg: number; source: string }> = {
 1: { low: 75, high: 110, avg: 92, source:"HomeAdvisor 2026"},
 2: { low: 100, high: 155, avg: 127, source:"HomeAdvisor 2026"},
 3: { low: 130, high: 185, avg: 157, source:"Angi 2026"},
 4: { low: 175, high: 250, avg: 212, source:"Angi 2026"},
 5: { low: 220, high: 340, avg: 278, source:"HomeAdvisor 2026"},
};

function getResidentialBenchmark(beds: number) {
 return RESIDENTIAL_BENCHMARKS[Math.min(5, Math.max(1, beds))] ?? RESIDENTIAL_BENCHMARKS[3];
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
 frequency?: string;
 size?:"full"|"compact";
}

export function ResidentialBenchmarkBadge({
 visitPrice, beds, frequency, size ="full",
}: ResidentialBenchmarkBadgeProps) {
 if (!beds || beds <= 0) return null;
 const bm = getResidentialBenchmark(beds);

 const adjustedLow = frequency ==="weekly"|| frequency ==="biweekly"? bm.low * 0.8 : bm.low;
 const adjustedHigh = frequency ==="weekly"|| frequency ==="biweekly"? bm.high * 0.8 : bm.high;
 const adjustedAvg = (adjustedLow + adjustedHigh) / 2;

 const position = positionFromPrice(visitPrice, adjustedLow, adjustedHigh);
 const c = POSITION_CONFIG[position];
 const { Icon } = c;

 const pctVsAvg = ((visitPrice - adjustedAvg) / adjustedAvg) * 100;
 const abs = Math.abs(Math.round(pctVsAvg));

 const labelMap: Record<Position, string> = {
 well_below: `${abs}% below national average — consider raising your rate`,
 below: `${abs}% below national average for a ${beds}-bed home`,
 within: `Within national range for a ${beds}-bed home`,
 above: `${abs}% above national average — justified by premium service`,
 well_above: `${abs}% above national high — review your pricing`,
 };

 return (
 <div className={`rounded-xl border px-3 py-2.5 ${c.bg} ${c.border}`}>
 <div className={`flex items-start gap-2 ${c.text}`}>
 <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5"/>
 <div className="flex-1 min-w-0">
 <p className="text-xs font-semibold leading-tight">National Benchmark</p>
 <p className="text-[11px] mt-0.5 leading-relaxed">{labelMap[position]}</p>
 </div>
 <Tooltip
 text={`National range for ${beds}-bedroom homes: $${Math.round(adjustedLow)}–$${Math.round(adjustedHigh)} per visit${frequency && frequency !=="one-time"?" (recurring discount applied)":""}. Average: $${Math.round(adjustedAvg)}.`}
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
 <p className="text-[10px] mt-2 opacity-50">Source: HomeAdvisor / Angi 2026 · one-time standard clean</p>
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
 mode:"commercial"|"residential";
}

export function TierBenchmarkPill({ price, facilityType, totalSqFt, beds, mode }: TierBenchmarkPillProps) {
 let position: Position | null = null;
 let labelShort ="";

 if (mode ==="commercial"&& facilityType && totalSqFt) {
 const bm = compareToBenchmark(price, facilityType, totalSqFt);
 if (!bm) return null;
 position = bm.position as Position;
 const pct = Math.abs(Math.round(bm.pctVsMedian));
 labelShort = position ==="within"?"Market rate": `${pct}% ${["above","well_above"].includes(position) ?"above":"below"} avg`;
 } else if (mode ==="residential"&& beds) {
 const bm = getResidentialBenchmark(beds);
 position = positionFromPrice(price, bm.low, bm.high);
 const avg = (bm.low + bm.high) / 2;
 const pct = Math.abs(Math.round(((price - avg) / avg) * 100));
 labelShort = position ==="within"?"Market rate": `${pct}% ${["above","well_above"].includes(position) ?"above":"below"} avg`;
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
