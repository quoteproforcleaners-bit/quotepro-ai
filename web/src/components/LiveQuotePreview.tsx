import { useState, useEffect, useRef } from "react";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronRight, Plus, Minus, Clock,
  DollarSign, Zap, Info, BadgeCheck, BarChart3,
} from "lucide-react";
import type {
  ResidentialQuoteResult, CommercialQuoteResult, LineItem, Warning,
} from "../lib/pricingEngine";
import type { FacilityType } from "../lib/pricingEngine";
import { compareToBenchmark, benchmarkBadgeText, BENCHMARK_CITATIONS, NATIONAL_AVERAGES } from "../lib/benchmarks";
import { Tooltip, LabelWithTooltip } from "./Tooltip";
import { CommercialBenchmarkBadge, ResidentialBenchmarkBadge } from "./BenchmarkBadge";

// ─── Animated Number ──────────────────────────────────────────────────────────

function AnimatedPrice({ value, prefix = "$", className = "" }: { value: number; prefix?: string; className?: string }) {
  const [displayed, setDisplayed] = useState(value);
  const [flash, setFlash]         = useState<"up" | "down" | null>(null);
  const prev = useRef(value);

  useEffect(() => {
    if (Math.abs(value - prev.current) < 0.5) { prev.current = value; return; }
    setFlash(value > prev.current ? "up" : "down");
    prev.current = value;

    const start = displayed; const end = value; const dur = 280;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      setDisplayed(Math.round(start + (end - start) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(tick);
      else { setDisplayed(end); setTimeout(() => setFlash(null), 600); }
    };
    requestAnimationFrame(tick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const color = flash === "up" ? "#16a34a" : flash === "down" ? "#dc2626" : undefined;
  return (
    <span className={className} style={{ color, transition: "color 0.6s ease", display: "inline-block" }}>
      {prefix}{Math.round(displayed).toLocaleString()}
    </span>
  );
}

// ─── Line item row ────────────────────────────────────────────────────────────

const LINE_ITEM_TOOLTIPS: Record<string, { tip: string; source?: string }> = {
  labor:    { tip: "Direct labor cost = hours per visit × your hourly rate. The ISSA production rate determines hours based on facility size and room counts.", source: BENCHMARK_CITATIONS.ISSA_2025 },
  overhead: { tip: "Overhead covers insurance, equipment amortization, admin time, and indirect costs. Typical range: 12–20% of direct labor.", source: BENCHMARK_CITATIONS.BSCAI_2024 },
  supplies: { tip: "Cleaning supplies surcharge added on top of labor and overhead. Can be a fixed dollar amount or percentage.", source: undefined },
  margin:   { tip: "Your target gross margin. Applied via the formula: Price = Cost ÷ (1 − margin%). A 20% margin means your cost is 80% of the final price.", source: undefined },
  surcharge:{ tip: "After-hours premium applied because service occurs outside normal business hours. Typically 20–30% above standard rate.", source: BENCHMARK_CITATIONS.BSCAI_2024 },
};

function LineItemRow({ item }: { item: LineItem & { label: string; amount: number } }) {
  const isNeg   = item.amount < 0;
  const tooltip = LINE_ITEM_TOOLTIPS[item.type ?? ""] ?? null;
  const color   = isNeg ? "text-emerald-600 dark:text-emerald-400" : item.type === "base" ? "text-slate-700 dark:text-slate-300" : "text-slate-600 dark:text-slate-400";
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-slate-500 dark:text-zinc-400 leading-tight flex items-center gap-1">
        {item.label}
        {tooltip && <Tooltip text={tooltip.tip} source={tooltip.source} side="right" />}
      </span>
      <span className={`text-xs font-semibold tabular-nums shrink-0 ml-3 ${color}`}>
        {isNeg ? "−" : "+"}${Math.abs(Math.round(item.amount)).toLocaleString()}
      </span>
    </div>
  );
}

// ─── Warning chip ─────────────────────────────────────────────────────────────

interface ActionableWarning {
  message: string;
  action?: { label: string; href: string };
  isInfo?: boolean;
}

const HELPFUL_WARNINGS: Record<string, ActionableWarning> = {
  after_hours: {
    message: "After-hours service is on. Add a 20–30% premium in the Pricing step to cover overtime and access logistics.",
    action: { label: "Go to Pricing step", href: "#pricing-step" },
  },
  very_low_estimate: {
    message: "Per-visit price is unusually low. Check your hourly rate — typical commercial rate is $45–$75/hr.",
    action: { label: "Adjust in Settings", href: "/commercial-settings" },
  },
  high_estimate: {
    message: "Estimate is very high. Double-check square footage, room counts, and hourly rate. Large facilities may benefit from multi-crew pricing.",
  },
  low_sqft: {
    message: "Facility size is under 500 sq ft — verify square footage for accurate benchmarking.",
  },
  missing_sqft: {
    message: "Enter the total square footage to generate a full estimate.",
    isInfo: true,
  },
  low_rate: {
    message: "Your hourly rate appears low for commercial work. BSCAI 2024 median is $48–$72/hr for commercial crews.",
    action: { label: "Change in Settings", href: "/commercial-settings" },
  },
  low_margin: {
    message: "Gross margin is below 15%. BSCAI 2024 median for commercial contractors is 18–25%.",
    action: { label: "Adjust margin", href: "/commercial-settings" },
  },
};

function WarningChip({ w }: { w: Warning & { type?: string } }) {
  const config = HELPFUL_WARNINGS[w.type ?? ""] ?? { message: w.message };
  const isInfo = config.isInfo ?? false;
  return (
    <div className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${
      isInfo
        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
        : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"
    }`}>
      <div className="flex items-start gap-2">
        {isInfo
          ? <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          : <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
        <span>{config.message}</span>
      </div>
      {config.action && (
        <a
          href={config.action.href}
          className={`block mt-1.5 ml-5 text-[11px] font-semibold underline underline-offset-2 ${
            isInfo ? "text-blue-600 dark:text-blue-400" : "text-amber-700 dark:text-amber-400"
          }`}
        >
          {config.action.label} →
        </a>
      )}
    </div>
  );
}

// ─── Industry Benchmark Badge ─────────────────────────────────────────────────

// IndustryBenchmarkBadge is now the shared CommercialBenchmarkBadge from BenchmarkBadge.tsx
// kept as alias so existing JSX references (<IndustryBenchmarkBadge ...>) continue to work
const IndustryBenchmarkBadge = CommercialBenchmarkBadge;

// ─── Manual Adjustment ────────────────────────────────────────────────────────

export interface ManualAdjustment { amount: number; note: string; }

function ManualAdjustmentPanel({ adjustment, onChange }: { adjustment: ManualAdjustment; onChange: (a: ManualAdjustment) => void }) {
  const [open, setOpen]       = useState(adjustment.amount !== 0);
  const [rawValue, setRawValue] = useState(adjustment.amount !== 0 ? String(Math.abs(adjustment.amount)) : "");
  const [sign, setSign]       = useState<"+" | "-">(adjustment.amount < 0 ? "-" : "+");

  const commit = (newRaw: string, newSign: "+" | "-") => {
    const n = parseFloat(newRaw);
    onChange({ ...adjustment, amount: Math.round(isNaN(n) ? 0 : newSign === "-" ? -n : n) });
  };

  return (
    <div className="border-t border-slate-100 dark:border-zinc-800 pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
      >
        <span className="flex items-center gap-1.5"><Plus className="w-3 h-3" />Manual adjustment</span>
        {adjustment.amount !== 0 && (
          <span className={`text-xs font-bold ${adjustment.amount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
            {adjustment.amount > 0 ? "+" : "−"}${Math.abs(adjustment.amount)}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700 shrink-0">
              {(["+", "-"] as const).map((s) => (
                <button key={s} onClick={() => { setSign(s); commit(rawValue, s); }}
                  className={`w-9 h-9 flex items-center justify-center text-sm font-bold transition-colors ${sign === s ? "bg-primary-600 text-white" : "bg-white dark:bg-zinc-800 text-slate-500 hover:bg-slate-50"}`}>
                  {s === "+" ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input type="number" min={0} value={rawValue} placeholder="0"
                onChange={(e) => { setRawValue(e.target.value); commit(e.target.value, sign); }}
                className="w-full pl-6 pr-3 py-2 text-sm border border-slate-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>
          </div>
          <input type="text" value={adjustment.note} placeholder="Reason (e.g. loyalty discount, referral)"
            onChange={(e) => onChange({ ...adjustment, note: e.target.value })}
            className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 placeholder-slate-400"
          />
          {rawValue && parseFloat(rawValue) > 0 && (
            <div className={`text-xs font-medium rounded-lg px-3 py-2 flex items-center gap-1.5 ${adjustment.amount > 0 ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"}`}>
              {adjustment.amount > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {adjustment.amount > 0 ? `+$${Math.abs(adjustment.amount)} added to total` : `−$${Math.abs(adjustment.amount)} removed from total`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section toggle ───────────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-slate-100 dark:border-zinc-800 pt-3">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors">
        {title}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

// ─── Residential Preview ──────────────────────────────────────────────────────

interface ResidentialPreviewProps {
  result: ResidentialQuoteResult;
  selectedTier: "good" | "better" | "best";
  priceOverride?: number;
  adjustment: ManualAdjustment;
  onAdjustmentChange: (a: ManualAdjustment) => void;
  frequency: string;
  beds?: number;
}

export function ResidentialLivePreview({ result, selectedTier, priceOverride, adjustment, onAdjustmentChange, frequency, beds }: ResidentialPreviewProps) {
  const tier = result[selectedTier];
  const basePrice = priceOverride ?? tier.price;
  const total = basePrice + adjustment.amount;
  const isRecurring = frequency !== "one-time";
  const [rulesOpen, setRulesOpen] = useState(true);

  return (
    <div className="space-y-4">
      <div className="text-center py-5 px-4 bg-gradient-to-b from-slate-50 to-white dark:from-zinc-800/60 dark:to-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-700/60">
        <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
          {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} · {tier.name}
        </p>
        <AnimatedPrice value={total} className="text-4xl font-black tracking-tight text-slate-900 dark:text-white" />
        {isRecurring && tier.firstCleanPrice ? (
          <div className="mt-2 space-y-0.5">
            <p className="text-xs text-slate-400 dark:text-zinc-500">per visit (recurring)</p>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">First visit: ${tier.firstCleanPrice.toFixed(0)}</p>
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">{isRecurring ? "per visit" : "one-time"}</p>
        )}
        <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 bg-slate-100 dark:bg-zinc-700 rounded-full">
          <Clock className="w-3 h-3 text-slate-400 dark:text-zinc-400" />
          <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">~{tier.totalHours}h labor estimate</span>
          <Tooltip text="Total labor hours estimated for this job using ISSA residential cleaning benchmarks (approx. 30–45 min/room depending on size and condition)." source={BENCHMARK_CITATIONS.ISSA_2025} />
        </div>
      </div>

      {result[selectedTier].warnings.length > 0 && (
        <div className="space-y-2">
          {result[selectedTier].warnings.map((w, i) => <WarningChip key={i} w={w} />)}
        </div>
      )}

      {beds && beds > 0 && total > 0 && (
        <ResidentialBenchmarkBadge visitPrice={total} beds={beds} frequency={frequency} />
      )}

      <Section title="Price Breakdown" defaultOpen>
        {tier.lineItems.map((item, i) => <LineItemRow key={i} item={item} />)}
        {adjustment.amount !== 0 && (
          <div className="flex items-center justify-between py-1.5 border-t border-dashed border-slate-200 dark:border-zinc-700 mt-1">
            <span className="text-xs text-slate-500 dark:text-zinc-400 leading-tight italic">{adjustment.note || "Manual adjustment"}</span>
            <span className={`text-xs font-bold tabular-nums ${adjustment.amount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {adjustment.amount > 0 ? "+" : "−"}${Math.abs(adjustment.amount).toLocaleString()}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-zinc-700 mt-1">
          <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">Total</span>
          <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">${total.toLocaleString()}</span>
        </div>
      </Section>

      {tier.appliedRules.length > 0 && (
        <div className="border-t border-slate-100 dark:border-zinc-800 pt-3">
          <button onClick={() => setRulesOpen(!rulesOpen)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5"><Zap className="w-3 h-3" />Triggered Rules</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${rulesOpen ? "rotate-180" : ""}`} />
          </button>
          {rulesOpen && (
            <div className="space-y-1.5">
              {tier.appliedRules.map((rule, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3 h-3 text-primary-500 shrink-0" />
                  <span className="text-slate-600 dark:text-zinc-400">{rule.label}</span>
                  {rule.impact !== 0 && (
                    <span className={`ml-auto font-semibold shrink-0 ${rule.impact > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {rule.impact > 0 ? "+" : "−"}${Math.abs(Math.round(rule.impact))}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Section title="All Options" defaultOpen={false}>
        {(["good", "better", "best"] as const).map((t) => {
          const d = result[t]; const isActive = t === selectedTier;
          return (
            <div key={t} className={`flex items-center justify-between py-1.5 px-2 rounded-lg ${isActive ? "bg-primary-50 dark:bg-primary-900/20" : ""}`}>
              <span className={`text-xs capitalize ${isActive ? "font-bold text-primary-700 dark:text-primary-400" : "text-slate-500 dark:text-zinc-400"}`}>{t} · {d.name}</span>
              <span className={`text-xs font-bold tabular-nums ${isActive ? "text-primary-700 dark:text-primary-400" : "text-slate-600 dark:text-zinc-400"}`}>${d.price.toLocaleString()}</span>
            </div>
          );
        })}
      </Section>

      <ManualAdjustmentPanel adjustment={adjustment} onChange={onAdjustmentChange} />
    </div>
  );
}

// ─── Commercial Preview ───────────────────────────────────────────────────────

interface CommercialPreviewProps {
  result: CommercialQuoteResult;
  facilityName?: string;
  facilityType?: FacilityType;
  totalSqFt?: number;
  adjustment: ManualAdjustment;
  onAdjustmentChange: (a: ManualAdjustment) => void;
}

export function CommercialLivePreview({ result, facilityName, facilityType, totalSqFt, adjustment, onAdjustmentChange }: CommercialPreviewProps) {
  const adjPerVisit = result.perVisit + adjustment.amount;
  const adjMonthly  = adjPerVisit * result.visitsPerMonth;
  const adjAnnual   = adjMonthly * 12;
  const [rulesOpen, setRulesOpen] = useState(true);

  return (
    <div className="space-y-4">
      {/* Primary total */}
      <div className="text-center py-5 px-4 bg-gradient-to-b from-slate-50 to-white dark:from-zinc-800/60 dark:to-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-700/60">
        {facilityName && <p className="text-xs text-slate-400 dark:text-zinc-500 mb-1 truncate">{facilityName}</p>}
        <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Per Visit (Enhanced)</p>
        <AnimatedPrice value={adjPerVisit} className="text-4xl font-black tracking-tight text-slate-900 dark:text-white" />
        <div className="flex items-center justify-center gap-1 mt-1">
          <p className="text-xs text-slate-400 dark:text-zinc-500">per cleaning visit</p>
          <Tooltip
            text="Price per visit for the Enhanced tier (mid-range). This covers all labor, overhead, supplies, and your target margin. Multiply by visits/month for the monthly total."
            source={BENCHMARK_CITATIONS.ISSA_2025}
          />
        </div>
        <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 bg-slate-100 dark:bg-zinc-700 rounded-full">
          <Clock className="w-3 h-3 text-slate-400 dark:text-zinc-400" />
          <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
            ~{result.hours.toFixed(1)}h · {result.recommendedCleaners} cleaner{result.recommendedCleaners > 1 ? "s" : ""}
          </span>
          <Tooltip
            text={`Labor estimate: ${result.hours.toFixed(1)} hours based on ISSA 2025 production rates for this facility type and size. ${result.recommendedCleaners} cleaner${result.recommendedCleaners > 1 ? "s" : ""} recommended to complete in a standard shift.`}
            source={BENCHMARK_CITATIONS.ISSA_2025}
          />
        </div>
      </div>

      {/* Revenue grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Per Visit",                value: adjPerVisit,  tip: "Price per cleaning visit, after applying your margin and any surcharges." },
          { label: `Monthly (×${result.visitsPerMonth})`, value: adjMonthly, tip: `Monthly total = per-visit price × ${result.visitsPerMonth} visits. Based on your selected cleaning frequency.` },
          { label: "Annual",                   value: adjAnnual,   tip: "Estimated annual contract value = monthly × 12. Useful for contract negotiation and revenue planning." },
        ].map(({ label, value, tip }) => (
          <div key={label} className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-3 text-center border border-slate-100 dark:border-zinc-700/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-tight">{label}</p>
              <Tooltip text={tip} side="bottom" />
            </div>
            <AnimatedPrice value={value} className="text-sm font-bold text-slate-800 dark:text-zinc-100" />
          </div>
        ))}
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="space-y-2">
          {result.warnings.map((w, i) => <WarningChip key={i} w={w as any} />)}
        </div>
      )}

      {/* Industry benchmark */}
      {facilityType && totalSqFt && totalSqFt > 0 && (
        <IndustryBenchmarkBadge
          monthlyPrice={adjMonthly}
          facilityType={facilityType}
          totalSqFt={totalSqFt}
        />
      )}

      {/* Cost breakdown */}
      <Section title="Cost Breakdown" defaultOpen>
        {result.lineItems.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-1.5">
            <span className="text-xs text-slate-500 dark:text-zinc-400 leading-tight flex items-center gap-1">
              {item.label}
              {LINE_ITEM_TOOLTIPS[item.type ?? ""] && (
                <Tooltip text={LINE_ITEM_TOOLTIPS[item.type ?? ""].tip} source={LINE_ITEM_TOOLTIPS[item.type ?? ""].source} side="right" />
              )}
            </span>
            <span className={`text-xs font-semibold tabular-nums ml-3 shrink-0 ${
              item.type === "surcharge" ? "text-amber-700 dark:text-amber-400" : "text-slate-700 dark:text-zinc-300"
            }`}>
              ${Math.round(item.amount).toLocaleString()}
            </span>
          </div>
        ))}
        {adjustment.amount !== 0 && (
          <div className="flex items-center justify-between py-1.5 border-t border-dashed border-slate-200 dark:border-zinc-700 mt-1">
            <span className="text-xs text-slate-500 dark:text-zinc-400 leading-tight italic">{adjustment.note || "Manual adjustment"}</span>
            <span className={`text-xs font-bold tabular-nums ${adjustment.amount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {adjustment.amount > 0 ? "+" : "−"}${Math.abs(adjustment.amount).toLocaleString()}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-zinc-700 mt-1">
          <LabelWithTooltip
            label="Per Visit Total"
            tooltip="Final per-visit price after labor, overhead, supplies surcharge, margin, and any after-hours premium."
            labelClass="text-xs font-bold text-slate-700 dark:text-zinc-200"
          />
          <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">${Math.round(adjPerVisit).toLocaleString()}</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
          <BarChart3 className="w-3 h-3" />
          ISSA 2025 production rate standards · BSCAI 2024 market benchmarks
        </p>
      </Section>

      {/* Revenue metrics */}
      <Section title="Revenue Metrics" defaultOpen={false}>
        <div className="space-y-1.5">
          {[
            { label: "Weekly estimate",        value: `$${Math.round(adjPerVisit * (result.visitsPerMonth / 4.33)).toLocaleString()}`, tip: "Approximate weekly revenue = per-visit price × average visits per week." },
            { label: "Monthly estimate",       value: `$${Math.round(adjMonthly).toLocaleString()}`,                                   tip: `Monthly revenue = $${Math.round(adjPerVisit).toLocaleString()} × ${result.visitsPerMonth} visits.` },
            { label: "Annual contract value",  value: `$${Math.round(adjAnnual).toLocaleString()}`,                                    tip: "Annual value = monthly × 12. This is the number to put on a multi-year contract proposal." },
            { label: "Visits per month",       value: result.visitsPerMonth,                                                          tip: "Cleaning visits scheduled per month based on your selected frequency." },
          ].map(({ label, value, tip }) => (
            <div key={label} className="flex justify-between py-1 items-center">
              <LabelWithTooltip label={label} tooltip={tip} labelClass="text-xs text-slate-500 dark:text-zinc-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 tabular-nums">{value}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Applied rules */}
      {result.appliedRules.length > 0 && (
        <div className="border-t border-slate-100 dark:border-zinc-800 pt-3">
          <button onClick={() => setRulesOpen(!rulesOpen)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
            <span className="flex items-center gap-1.5"><Zap className="w-3 h-3" />Triggered Rules</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${rulesOpen ? "rotate-180" : ""}`} />
          </button>
          {rulesOpen && (
            <div className="space-y-1.5">
              {result.appliedRules.map((rule, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-3 h-3 text-primary-500 shrink-0" />
                  <span className="text-slate-600 dark:text-zinc-400">{rule.label}</span>
                  {rule.impact !== 0 && (
                    <span className={`ml-auto font-semibold shrink-0 ${rule.impact > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {rule.impact > 0 ? "+" : "−"}${Math.abs(Math.round(rule.impact))}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ManualAdjustmentPanel adjustment={adjustment} onChange={onAdjustmentChange} />
    </div>
  );
}

// ─── Wrapper Panel (sticky container) ────────────────────────────────────────

interface PreviewPanelProps {
  title?: string;
  children: React.ReactNode;
  isEmpty?: boolean;
}

export function LivePreviewPanel({ title = "Live Quote Preview", children, isEmpty }: PreviewPanelProps) {
  return (
    <div
      className="sticky top-6 w-80 shrink-0 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-700 shadow-sm overflow-hidden"
      style={{ maxHeight: "calc(100vh - 48px)", display: "flex", flexDirection: "column" }}
    >
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 dark:border-zinc-800 shrink-0 bg-gradient-to-r from-primary-600 to-violet-600">
        <DollarSign className="w-4 h-4 text-white/80" />
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-white/70 font-medium">Live</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "thin" }}>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <ChevronRight className="w-8 h-8 text-slate-200 dark:text-zinc-700 mb-3" />
            <p className="text-sm font-medium text-slate-400 dark:text-zinc-500">Fill in property details</p>
            <p className="text-xs text-slate-300 dark:text-zinc-600 mt-1">Your live price will appear here</p>
          </div>
        ) : children}
      </div>
    </div>
  );
}
