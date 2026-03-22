import { useState, useEffect, useRef } from "react";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronRight, Plus, Minus, Clock,
  DollarSign, Zap, Info,
} from "lucide-react";
import type {
  ResidentialQuoteResult, CommercialQuoteResult, LineItem, Warning,
} from "../lib/pricingEngine";

// ─── Animated Number ──────────────────────────────────────────────────────────

function AnimatedPrice({ value, prefix = "$", className = "" }: { value: number; prefix?: string; className?: string }) {
  const [displayed, setDisplayed] = useState(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prev = useRef(value);

  useEffect(() => {
    if (Math.abs(value - prev.current) < 0.5) { prev.current = value; return; }
    setFlash(value > prev.current ? "up" : "down");
    prev.current = value;

    // Animate from old to new in ~300ms
    const start = displayed;
    const end = value;
    const duration = 280;
    const startTime = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out-cubic
      setDisplayed(Math.round(start + (end - start) * eased));
      if (t < 1) requestAnimationFrame(tick);
      else { setDisplayed(end); setTimeout(() => setFlash(null), 600); }
    };
    requestAnimationFrame(tick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const color = flash === "up" ? "#16a34a" : flash === "down" ? "#dc2626" : undefined;

  return (
    <span
      className={className}
      style={{ color, transition: "color 0.6s ease", display: "inline-block" }}
    >
      {prefix}{Math.round(displayed).toLocaleString()}
    </span>
  );
}

// ─── Line item row ────────────────────────────────────────────────────────────

function LineItemRow({ item }: { item: LineItem & { label: string; amount: number } }) {
  const isNeg = item.amount < 0;
  const color = isNeg ? "text-emerald-600 dark:text-emerald-400" : item.type === "base" ? "text-slate-700 dark:text-slate-300" : "text-slate-600 dark:text-slate-400";
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-slate-500 dark:text-zinc-400 leading-tight">{item.label}</span>
      <span className={`text-xs font-semibold tabular-nums shrink-0 ml-3 ${color}`}>
        {isNeg ? "−" : "+"}${Math.abs(Math.round(item.amount)).toLocaleString()}
      </span>
    </div>
  );
}

// ─── Warning chip ─────────────────────────────────────────────────────────────

function WarningChip({ w }: { w: Warning }) {
  const isInfo = w.type === "missing_sqft";
  return (
    <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs leading-relaxed ${isInfo ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300"}`}>
      {isInfo
        ? <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        : <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
      {w.message}
    </div>
  );
}

// ─── Manual Adjustment ────────────────────────────────────────────────────────

export interface ManualAdjustment { amount: number; note: string; }

function ManualAdjustmentPanel({
  adjustment, onChange,
}: { adjustment: ManualAdjustment; onChange: (a: ManualAdjustment) => void }) {
  const [open, setOpen] = useState(adjustment.amount !== 0);
  const [rawValue, setRawValue] = useState(
    adjustment.amount !== 0 ? String(Math.abs(adjustment.amount)) : ""
  );
  const [sign, setSign] = useState<"+" | "-">(adjustment.amount < 0 ? "-" : "+");

  const commit = (newRaw: string, newSign: "+" | "-") => {
    const n = parseFloat(newRaw);
    const amt = isNaN(n) ? 0 : newSign === "-" ? -n : n;
    onChange({ ...adjustment, amount: Math.round(amt) });
  };

  return (
    <div className="border-t border-slate-100 dark:border-zinc-800 pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Plus className="w-3 h-3" />
          Manual adjustment
        </span>
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
                <button
                  key={s}
                  onClick={() => { setSign(s); commit(rawValue, s); }}
                  className={`w-9 h-9 flex items-center justify-center text-sm font-bold transition-colors ${sign === s ? "bg-primary-600 text-white" : "bg-white dark:bg-zinc-800 text-slate-500 hover:bg-slate-50"}`}
                >
                  {s === "+" ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                min={0}
                value={rawValue}
                onChange={(e) => { setRawValue(e.target.value); commit(e.target.value, sign); }}
                placeholder="0"
                className="w-full pl-6 pr-3 py-2 text-sm border border-slate-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30"
              />
            </div>
          </div>
          <input
            type="text"
            value={adjustment.note}
            onChange={(e) => onChange({ ...adjustment, note: e.target.value })}
            placeholder="Reason (e.g. loyalty discount, referral)"
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
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
      >
        {title}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

// ─── Residential Preview ─────────────────────────────────────────────────────

interface ResidentialPreviewProps {
  result: ResidentialQuoteResult;
  selectedTier: "good" | "better" | "best";
  priceOverride?: number;
  adjustment: ManualAdjustment;
  onAdjustmentChange: (a: ManualAdjustment) => void;
  frequency: string;
}

export function ResidentialLivePreview({
  result, selectedTier, priceOverride, adjustment, onAdjustmentChange, frequency,
}: ResidentialPreviewProps) {
  const tier = result[selectedTier];
  const basePrice = priceOverride ?? tier.price;
  const total = basePrice + adjustment.amount;
  const isRecurring = frequency !== "one-time";

  const allWarnings = tier.warnings;
  const [rulesOpen, setRulesOpen] = useState(true);

  return (
    <div className="space-y-4">
      {/* Total */}
      <div className="text-center py-5 px-4 bg-gradient-to-b from-slate-50 to-white dark:from-zinc-800/60 dark:to-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-700/60">
        <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
          {selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)} · {tier.name}
        </p>
        <AnimatedPrice
          value={total}
          className="text-4xl font-black tracking-tight text-slate-900 dark:text-white"
        />
        {isRecurring && tier.firstCleanPrice ? (
          <div className="mt-2 space-y-0.5">
            <p className="text-xs text-slate-400 dark:text-zinc-500">per visit (recurring)</p>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
              First visit: ${tier.firstCleanPrice.toFixed(0)}
            </p>
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">
            {isRecurring ? "per visit" : "one-time"}
          </p>
        )}

        {/* Hours badge */}
        <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 bg-slate-100 dark:bg-zinc-700 rounded-full">
          <Clock className="w-3 h-3 text-slate-400 dark:text-zinc-400" />
          <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
            ~{tier.totalHours}h labor estimate
          </span>
        </div>
      </div>

      {/* Warnings */}
      {allWarnings.length > 0 && (
        <div className="space-y-2">
          {allWarnings.map((w, i) => <WarningChip key={i} w={w} />)}
        </div>
      )}

      {/* Breakdown */}
      <Section title="Price Breakdown" defaultOpen>
        {tier.lineItems.map((item, i) => <LineItemRow key={i} item={item} />)}
        {adjustment.amount !== 0 && (
          <div className="flex items-center justify-between py-1.5 border-t border-dashed border-slate-200 dark:border-zinc-700 mt-1">
            <span className="text-xs text-slate-500 dark:text-zinc-400 leading-tight italic">
              {adjustment.note || "Manual adjustment"}
            </span>
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

      {/* Applied rules */}
      {tier.appliedRules.length > 0 && (
        <div className="border-t border-slate-100 dark:border-zinc-800 pt-3">
          <button
            onClick={() => setRulesOpen(!rulesOpen)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2"
          >
            <span className="flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              Triggered Rules
            </span>
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

      {/* Tier comparison */}
      <Section title="All Options" defaultOpen={false}>
        {(["good", "better", "best"] as const).map((t) => {
          const d = result[t];
          const isActive = t === selectedTier;
          return (
            <div key={t} className={`flex items-center justify-between py-1.5 px-2 rounded-lg ${isActive ? "bg-primary-50 dark:bg-primary-900/20" : ""}`}>
              <span className={`text-xs capitalize ${isActive ? "font-bold text-primary-700 dark:text-primary-400" : "text-slate-500 dark:text-zinc-400"}`}>
                {t} · {d.name}
              </span>
              <span className={`text-xs font-bold tabular-nums ${isActive ? "text-primary-700 dark:text-primary-400" : "text-slate-600 dark:text-zinc-400"}`}>
                ${d.price.toLocaleString()}
              </span>
            </div>
          );
        })}
      </Section>

      {/* Manual adjustment */}
      <ManualAdjustmentPanel adjustment={adjustment} onChange={onAdjustmentChange} />
    </div>
  );
}

// ─── Commercial Preview ───────────────────────────────────────────────────────

interface CommercialPreviewProps {
  result: CommercialQuoteResult;
  facilityName?: string;
  adjustment: ManualAdjustment;
  onAdjustmentChange: (a: ManualAdjustment) => void;
}

export function CommercialLivePreview({ result, facilityName, adjustment, onAdjustmentChange }: CommercialPreviewProps) {
  const adjPerVisit = result.perVisit + adjustment.amount;
  const adjMonthly = adjPerVisit * result.visitsPerMonth;
  const adjAnnual = adjMonthly * 12;

  const [rulesOpen, setRulesOpen] = useState(true);

  return (
    <div className="space-y-4">
      {/* Primary total */}
      <div className="text-center py-5 px-4 bg-gradient-to-b from-slate-50 to-white dark:from-zinc-800/60 dark:to-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-700/60">
        {facilityName && (
          <p className="text-xs text-slate-400 dark:text-zinc-500 mb-1 truncate">{facilityName}</p>
        )}
        <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Per Visit</p>
        <AnimatedPrice value={adjPerVisit} className="text-4xl font-black tracking-tight text-slate-900 dark:text-white" />
        <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">per cleaning visit</p>

        {/* Hours badge */}
        <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 bg-slate-100 dark:bg-zinc-700 rounded-full">
          <Clock className="w-3 h-3 text-slate-400 dark:text-zinc-400" />
          <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
            ~{result.hours.toFixed(1)}h · {result.recommendedCleaners} cleaner{result.recommendedCleaners > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Revenue breakdown */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Per Visit", value: adjPerVisit },
          { label: `Monthly (×${result.visitsPerMonth})`, value: adjMonthly },
          { label: "Annual", value: adjAnnual },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-50 dark:bg-zinc-800/50 rounded-xl p-3 text-center border border-slate-100 dark:border-zinc-700/50">
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mb-1 leading-tight">{label}</p>
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

      {/* Cost breakdown */}
      <Section title="Cost Breakdown" defaultOpen>
        {result.lineItems.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-1.5">
            <span className="text-xs text-slate-500 dark:text-zinc-400 leading-tight">{item.label}</span>
            <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-zinc-300 ml-3 shrink-0">
              ${Math.round(item.amount).toLocaleString()}
            </span>
          </div>
        ))}
        {adjustment.amount !== 0 && (
          <div className="flex items-center justify-between py-1.5 border-t border-dashed border-slate-200 dark:border-zinc-700 mt-1">
            <span className="text-xs text-slate-500 dark:text-zinc-400 leading-tight italic">
              {adjustment.note || "Manual adjustment"}
            </span>
            <span className={`text-xs font-bold tabular-nums ${adjustment.amount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {adjustment.amount > 0 ? "+" : "−"}${Math.abs(adjustment.amount).toLocaleString()}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-zinc-700 mt-1">
          <span className="text-xs font-bold text-slate-700 dark:text-zinc-200">Per Visit Total</span>
          <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
            ${Math.round(adjPerVisit).toLocaleString()}
          </span>
        </div>
      </Section>

      {/* Key metrics */}
      <Section title="Revenue Metrics" defaultOpen={false}>
        <div className="space-y-1.5">
          {[
            { label: "Weekly estimate", value: `$${Math.round(adjPerVisit * (result.visitsPerMonth / 4.33)).toLocaleString()}` },
            { label: "Monthly estimate", value: `$${Math.round(adjMonthly).toLocaleString()}` },
            { label: "Annual contract value", value: `$${Math.round(adjAnnual).toLocaleString()}` },
            { label: "Visits per month", value: result.visitsPerMonth },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-1">
              <span className="text-xs text-slate-500 dark:text-zinc-400">{label}</span>
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 tabular-nums">{value}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Applied rules */}
      {result.appliedRules.length > 0 && (
        <div className="border-t border-slate-100 dark:border-zinc-800 pt-3">
          <button
            onClick={() => setRulesOpen(!rulesOpen)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2"
          >
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

      {/* Manual adjustment */}
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
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 dark:border-zinc-800 shrink-0 bg-gradient-to-r from-primary-600 to-violet-600">
        <DollarSign className="w-4 h-4 text-white/80" />
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-white/70 font-medium">Live</span>
        </div>
      </div>

      {/* Content */}
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
