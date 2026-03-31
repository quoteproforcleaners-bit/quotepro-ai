import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BASE_MINUTES_PER_1000_SQFT,
  TRAFFIC_LEVEL_MULTIPLIER,
  type FacilityType,
  type TrafficLevel,
} from "../lib/pricingEngine";
import { PageHeader, Card, CardHeader } from "../components/ui";
import {
  Settings, RefreshCw, Check, Info, ArrowLeft,
  DollarSign, Sliders, BarChart3, TrendingUp,
} from "lucide-react";
import { Tooltip } from "../components/Tooltip";

// ─── Storage keys (also used by CommercialQuotePage) ────────────────────────

export const COMMERCIAL_SETTINGS_KEY    = "commercialBaseMinutes";
export const COMMERCIAL_DEFAULTS_KEY    = "commercialPricingDefaults";
export const COMMERCIAL_TRAFFIC_KEY     = "commercialTrafficMultipliers";
export const COMMERCIAL_TIER_KEY        = "commercialTierMultipliers";
export const COMMERCIAL_TIER_LABELS_KEY = "commercialTierLabels";

// ─── Default values ──────────────────────────────────────────────────────────

const ISSA_BASE_DEFAULTS = { ...BASE_MINUTES_PER_1000_SQFT };

const ISSA_TRAFFIC_DEFAULTS: Record<TrafficLevel, number> = {
  Low: 0.9, Medium: 1.0, High: 1.15, VeryHigh: 1.3,
};

export const PRICING_DEFAULTS = {
  hourlyRate: 55,
  overheadPct: 15,
  targetMarginPct: 20,
  afterHoursPremiumPct: 25,
};

export const TIER_MULTIPLIER_DEFAULTS = {
  basic: 0.85,
  enhanced: 1.0,
  premium: 1.20,
};

export const TIER_LABEL_DEFAULTS = {
  basic: "Basic",
  enhanced: "Enhanced",
  premium: "Premium",
};

// ─── Helpers to read from localStorage ───────────────────────────────────────

export function readPricingDefaults() {
  try {
    const s = localStorage.getItem(COMMERCIAL_DEFAULTS_KEY);
    return s ? { ...PRICING_DEFAULTS, ...JSON.parse(s) } : { ...PRICING_DEFAULTS };
  } catch { return { ...PRICING_DEFAULTS }; }
}

export function readTrafficMultipliers(): Record<TrafficLevel, number> {
  try {
    const s = localStorage.getItem(COMMERCIAL_TRAFFIC_KEY);
    return s ? { ...ISSA_TRAFFIC_DEFAULTS, ...JSON.parse(s) } : { ...ISSA_TRAFFIC_DEFAULTS };
  } catch { return { ...ISSA_TRAFFIC_DEFAULTS }; }
}

export function readTierMultipliers() {
  try {
    const s = localStorage.getItem(COMMERCIAL_TIER_KEY);
    return s ? { ...TIER_MULTIPLIER_DEFAULTS, ...JSON.parse(s) } : { ...TIER_MULTIPLIER_DEFAULTS };
  } catch { return { ...TIER_MULTIPLIER_DEFAULTS }; }
}

export function readTierLabels(): { basic: string; enhanced: string; premium: string } {
  try {
    const s = localStorage.getItem(COMMERCIAL_TIER_LABELS_KEY);
    return s ? { ...TIER_LABEL_DEFAULTS, ...JSON.parse(s) } : { ...TIER_LABEL_DEFAULTS };
  } catch { return { ...TIER_LABEL_DEFAULTS }; }
}

// ─── Facility info ────────────────────────────────────────────────────────────

const FACILITY_INFO: Record<FacilityType, { label: string; tooltip: string }> = {
  Office:     { label: "Office Building",           tooltip: "Standard open-plan and private-office mix. ISSA 2026 benchmark: 25 min per 1,000 sq ft." },
  Retail:     { label: "Retail Store",              tooltip: "Sales floor with light to moderate foot traffic. ISSA 2026 benchmark: 20 min per 1,000 sq ft." },
  Medical:    { label: "Medical / Dental",          tooltip: "Clinical spaces requiring disinfection protocols. ISSA 2026 benchmark: 35 min per 1,000 sq ft." },
  Gym:        { label: "Gym / Fitness Center",      tooltip: "Equipment areas, locker rooms, high-sweat zones. ISSA 2026 benchmark: 30 min per 1,000 sq ft." },
  School:     { label: "School / Educational",      tooltip: "Classroom and hallway mix, K–12 or university. ISSA 2026 benchmark: 28 min per 1,000 sq ft." },
  Warehouse:  { label: "Warehouse / Industrial",    tooltip: "Large open floor, concrete, minimal office space. ISSA 2026 benchmark: 15 min per 1,000 sq ft." },
  Restaurant: { label: "Restaurant / Food Service", tooltip: "Kitchen, dining room, and front-of-house. ISSA 2026 benchmark: 40 min per 1,000 sq ft." },
  Other:      { label: "Other / General Commercial",tooltip: "General commercial space not listed above. ISSA 2026 benchmark: 25 min per 1,000 sq ft." },
};

const TRAFFIC_INFO: Record<TrafficLevel, { label: string; tooltip: string; issaDefault: number }> = {
  Low:      { label: "Low Traffic",        tooltip: "Low-occupancy facilities, minimal foot traffic. ISSA default ×0.90 (10% less cleaning time).",                     issaDefault: 0.9  },
  Medium:   { label: "Medium Traffic",     tooltip: "Standard commercial occupancy. ISSA baseline multiplier ×1.00 — all base rates are calibrated to this level.",     issaDefault: 1.0  },
  High:     { label: "High Traffic",       tooltip: "Heavy daily use — busy offices, retail. ISSA default ×1.15 (15% more time for soiling).",                         issaDefault: 1.15 },
  VeryHigh: { label: "Very High Traffic",  tooltip: "Extreme occupancy — hospital corridors, transit hubs, schools at peak. ISSA default ×1.30 (30% extra time).",     issaDefault: 1.3  },
};

// ─── Reusable number input ────────────────────────────────────────────────────

function NumSetting({
  label, value, onChange, min, max, step = 1, suffix = "", prefix = "",
  tooltip, source, modified, onReset,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; suffix?: string; prefix?: string;
  tooltip?: string; source?: string; modified?: boolean; onReset?: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          {modified && (
            <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full">
              modified
            </span>
          )}
          {tooltip && <Tooltip text={tooltip} source={source} side="right" />}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onReset && modified && (
          <button
            onClick={onReset}
            className="text-xs text-slate-400 hover:text-primary-600 underline transition-colors"
          >
            reset
          </button>
        )}
        <div className="relative">
          {prefix && (
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{prefix}</span>
          )}
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            className={`w-24 px-2 py-1.5 text-sm text-center border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold ${
              modified ? "border-amber-300 bg-amber-50" : "border-slate-200"
            } ${prefix ? "pl-6" : ""}`}
          />
          {suffix && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{suffix}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CommercialSettingsPage() {
  const navigate = useNavigate();
  const [savedFlash, setSavedFlash] = useState(false);

  // ── Base minutes per facility type ──────────────────────────────────────────
  const [baseMinutes, setBaseMinutes] = useState<Record<FacilityType, number>>(() => {
    try {
      const s = localStorage.getItem(COMMERCIAL_SETTINGS_KEY);
      return s ? { ...ISSA_BASE_DEFAULTS, ...JSON.parse(s) } : { ...ISSA_BASE_DEFAULTS };
    } catch { return { ...ISSA_BASE_DEFAULTS }; }
  });

  const saveBaseMinutes = (next: Record<FacilityType, number>) => {
    setBaseMinutes(next);
    localStorage.setItem(COMMERCIAL_SETTINGS_KEY, JSON.stringify(next));
    flash();
  };

  const hasCustomBase = (Object.keys(ISSA_BASE_DEFAULTS) as FacilityType[]).some(
    (k) => baseMinutes[k] !== ISSA_BASE_DEFAULTS[k],
  );

  // ── Pricing defaults ────────────────────────────────────────────────────────
  const [pricingDefs, setPricingDefs] = useState(() => readPricingDefaults());

  const savePricingDef = <K extends keyof typeof PRICING_DEFAULTS>(k: K, v: number) => {
    const next = { ...pricingDefs, [k]: v };
    setPricingDefs(next);
    localStorage.setItem(COMMERCIAL_DEFAULTS_KEY, JSON.stringify(next));
    flash();
  };

  const hasCustomPricing = Object.entries(PRICING_DEFAULTS).some(
    ([k, def]) => (pricingDefs as any)[k] !== def,
  );

  const resetPricingDefs = () => {
    setPricingDefs({ ...PRICING_DEFAULTS });
    localStorage.removeItem(COMMERCIAL_DEFAULTS_KEY);
    flash();
  };

  // ── Traffic multipliers ─────────────────────────────────────────────────────
  const [traffic, setTraffic] = useState<Record<TrafficLevel, number>>(() => readTrafficMultipliers());

  const saveTraffic = (k: TrafficLevel, v: number) => {
    const next = { ...traffic, [k]: v };
    setTraffic(next);
    localStorage.setItem(COMMERCIAL_TRAFFIC_KEY, JSON.stringify(next));
    flash();
  };

  const hasCustomTraffic = (Object.keys(ISSA_TRAFFIC_DEFAULTS) as TrafficLevel[]).some(
    (k) => traffic[k] !== ISSA_TRAFFIC_DEFAULTS[k],
  );

  const resetTraffic = () => {
    setTraffic({ ...ISSA_TRAFFIC_DEFAULTS });
    localStorage.removeItem(COMMERCIAL_TRAFFIC_KEY);
    flash();
  };

  // ── Tier multipliers ────────────────────────────────────────────────────────
  const [tierMult, setTierMult] = useState(() => readTierMultipliers());
  const [tierLabels, setTierLabels] = useState<{ basic: string; enhanced: string; premium: string }>(() => readTierLabels());

  const saveTierLabel = (k: "basic" | "enhanced" | "premium", v: string) => {
    const next = { ...tierLabels, [k]: v };
    setTierLabels(next);
    localStorage.setItem(COMMERCIAL_TIER_LABELS_KEY, JSON.stringify(next));
  };

  const resetTierLabels = () => {
    setTierLabels({ ...TIER_LABEL_DEFAULTS });
    localStorage.removeItem(COMMERCIAL_TIER_LABELS_KEY);
  };

  const hasCustomLabels = Object.entries(TIER_LABEL_DEFAULTS).some(
    ([k, v]) => tierLabels[k as keyof typeof TIER_LABEL_DEFAULTS] !== v
  );

  const saveTierMult = <K extends keyof typeof TIER_MULTIPLIER_DEFAULTS>(k: K, v: number) => {
    const next = { ...tierMult, [k]: v };
    setTierMult(next);
    localStorage.setItem(COMMERCIAL_TIER_KEY, JSON.stringify(next));
    flash();
  };

  const hasCustomTier = Object.entries(TIER_MULTIPLIER_DEFAULTS).some(
    ([k, def]) => Math.abs((tierMult as any)[k] - def) > 0.001,
  );

  const resetTierMult = () => {
    setTierMult({ ...TIER_MULTIPLIER_DEFAULTS });
    localStorage.removeItem(COMMERCIAL_TIER_KEY);
    flash();
  };

  const flash = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <PageHeader
            title="Commercial Settings"
            subtitle="Customize ISSA benchmarks, pricing defaults, and tier structure"
          />
        </div>
        <div className="flex items-center gap-3 mt-1 shrink-0">
          {savedFlash && (
            <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
              <Check className="w-4 h-4" /> Saved
            </span>
          )}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary-600 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Quote
          </button>
        </div>
      </div>

      {/* ── Section 1: Global pricing defaults ─────────────────────────────── */}
      <Card>
        <CardHeader title="Global Pricing Defaults" icon={DollarSign} />
        <div className="px-5 pb-5 space-y-4">
          <p className="text-sm text-slate-500">
            These defaults pre-fill the pricing step when you start a new commercial quote.
            You can still override them per-quote. Changes take effect on the next new quote.
          </p>

          <div className="space-y-3">
            <NumSetting
              label="Hourly Rate (per cleaner)"
              value={pricingDefs.hourlyRate}
              onChange={(v) => savePricingDef("hourlyRate", Math.max(10, v))}
              min={10} max={250} step={1} prefix="$"
              tooltip="Your all-in labor cost per cleaner per hour. Typical commercial rate: $40–$85/hr. This drives the Direct Labor line item in every quote."
              source="BSCAI 2024 — US commercial cleaning wage survey"
              modified={pricingDefs.hourlyRate !== PRICING_DEFAULTS.hourlyRate}
              onReset={() => savePricingDef("hourlyRate", PRICING_DEFAULTS.hourlyRate)}
            />
            <NumSetting
              label="Overhead %"
              value={pricingDefs.overheadPct}
              onChange={(v) => savePricingDef("overheadPct", Math.max(0, Math.min(60, v)))}
              min={0} max={60} step={0.5} suffix="%"
              tooltip="Covers insurance, equipment amortization, vehicle costs, admin time, and indirect costs. BSCAI 2024 median: 12–20% of direct labor for commercial contractors."
              source="BSCAI 2024"
              modified={pricingDefs.overheadPct !== PRICING_DEFAULTS.overheadPct}
              onReset={() => savePricingDef("overheadPct", PRICING_DEFAULTS.overheadPct)}
            />
            <NumSetting
              label="Target Gross Margin %"
              value={pricingDefs.targetMarginPct}
              onChange={(v) => savePricingDef("targetMarginPct", Math.max(0, Math.min(70, v)))}
              min={0} max={70} step={0.5} suffix="%"
              tooltip="Applied using the margin formula: Price = Cost ÷ (1 − margin%). A 20% margin means your cost is 80% of the final price — NOT the same as a 20% markup. BSCAI 2024 commercial contractor median: 18–25% gross margin."
              source="BSCAI 2024"
              modified={pricingDefs.targetMarginPct !== PRICING_DEFAULTS.targetMarginPct}
              onReset={() => savePricingDef("targetMarginPct", PRICING_DEFAULTS.targetMarginPct)}
            />
            <NumSetting
              label="After-Hours Premium %"
              value={pricingDefs.afterHoursPremiumPct}
              onChange={(v) => savePricingDef("afterHoursPremiumPct", Math.max(0, Math.min(100, v)))}
              min={0} max={100} step={1} suffix="%"
              tooltip="Surcharge applied when service is required outside standard business hours. Covers overtime labor, security coordination, and access logistics. Industry typical: 20–30%."
              source="BSCAI 2024"
              modified={pricingDefs.afterHoursPremiumPct !== PRICING_DEFAULTS.afterHoursPremiumPct}
              onReset={() => savePricingDef("afterHoursPremiumPct", PRICING_DEFAULTS.afterHoursPremiumPct)}
            />
          </div>

          {hasCustomPricing && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={resetPricingDefs}
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary-600 font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset all to system defaults
              </button>
              <span className="text-xs text-amber-600 font-medium">Custom pricing active</span>
            </div>
          )}
        </div>
      </Card>

      {/* ── Section 2: Base minutes per facility type ───────────────────────── */}
      <Card>
        <CardHeader title="Base Minutes per 1,000 sq ft" icon={Settings} />
        <div className="px-5 pb-5 space-y-5">
          <p className="text-sm text-slate-500">
            Base cleaning time per 1,000 sq ft for each facility type — before room counts,
            floor multipliers, and traffic adjustments. Defaults follow{" "}
            <span className="font-semibold text-slate-700">ISSA 2026 production rate standards</span>.
            Adjust to match your crew's real-world performance.
          </p>

          <div className="space-y-3">
            {(Object.keys(ISSA_BASE_DEFAULTS) as FacilityType[]).map((k) => {
              const isModified = baseMinutes[k] !== ISSA_BASE_DEFAULTS[k];
              return (
                <NumSetting
                  key={k}
                  label={FACILITY_INFO[k].label}
                  value={baseMinutes[k]}
                  onChange={(v) => saveBaseMinutes({ ...baseMinutes, [k]: Math.max(1, v || ISSA_BASE_DEFAULTS[k]) })}
                  min={1} max={120} step={1} suffix="min / 1,000 sqft"
                  tooltip={FACILITY_INFO[k].tooltip}
                  source="ISSA 2026 Cleaning Times & Production Rates"
                  modified={isModified}
                  onReset={() => saveBaseMinutes({ ...baseMinutes, [k]: ISSA_BASE_DEFAULTS[k] })}
                />
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => {
                setBaseMinutes({ ...ISSA_BASE_DEFAULTS });
                localStorage.removeItem(COMMERCIAL_SETTINGS_KEY);
                flash();
              }}
              disabled={!hasCustomBase}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary-600 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset all to ISSA 2026 defaults
            </button>
            {hasCustomBase && (
              <span className="text-xs text-amber-600 font-medium">
                {(Object.keys(ISSA_BASE_DEFAULTS) as FacilityType[]).filter((k) => baseMinutes[k] !== ISSA_BASE_DEFAULTS[k]).length} value(s) modified
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* ── Section 3: Traffic level multipliers ───────────────────────────── */}
      <Card>
        <CardHeader title="Traffic Level Multipliers" icon={BarChart3} />
        <div className="px-5 pb-5 space-y-5">
          <p className="text-sm text-slate-500">
            Multipliers applied to the total labor estimate based on foot traffic level.
            The ISSA standard ranges from ×0.90 (low traffic) to ×1.30 (very high traffic).
            Adjust to match your experience on different site conditions.
          </p>

          <div className="space-y-3">
            {(Object.keys(ISSA_TRAFFIC_DEFAULTS) as TrafficLevel[]).map((k) => {
              const isModified = Math.abs(traffic[k] - ISSA_TRAFFIC_DEFAULTS[k]) > 0.001;
              return (
                <NumSetting
                  key={k}
                  label={TRAFFIC_INFO[k].label}
                  value={traffic[k]}
                  onChange={(v) => saveTraffic(k, Math.max(0.5, Math.min(3.0, v)))}
                  min={0.5} max={3.0} step={0.05} prefix="×"
                  tooltip={TRAFFIC_INFO[k].tooltip}
                  source="ISSA 2026 Production Rate Standards"
                  modified={isModified}
                  onReset={() => saveTraffic(k, TRAFFIC_INFO[k].issaDefault)}
                />
              );
            })}
          </div>

          {hasCustomTraffic && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={resetTraffic}
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary-600 font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset to ISSA defaults
              </button>
              <span className="text-xs text-amber-600 font-medium">Custom traffic multipliers active</span>
            </div>
          )}
        </div>
      </Card>

      {/* ── Section 4: Tier markup multipliers ─────────────────────────────── */}
      <Card>
        <CardHeader title="Service Tier Markups" icon={TrendingUp} />
        <div className="px-5 pb-5 space-y-5">
          <p className="text-sm text-slate-500">
            Multipliers applied to the Enhanced base price to derive Basic and Premium tier prices.
            Enhanced is always ×1.00 (the base). Adjust to change how spread out your tier pricing is.
          </p>

          <div className="space-y-3">
            {([
              {
                key: "basic" as const,
                label: "Basic Tier",
                tooltip: "Basic covers core tasks: floors, trash, restrooms. Priced as a fraction of Enhanced. Default ×0.85 means Basic costs 15% less than Enhanced.",
                default: TIER_MULTIPLIER_DEFAULTS.basic,
              },
              {
                key: "enhanced" as const,
                label: "Enhanced Tier (base)",
                tooltip: "Enhanced is the reference tier — always ×1.00. All other tiers are calculated relative to this. It covers all ISSA standard tasks plus high-touch disinfection.",
                default: TIER_MULTIPLIER_DEFAULTS.enhanced,
              },
              {
                key: "premium" as const,
                label: "Premium Tier",
                tooltip: "Premium adds window/glass cleaning, deep restroom scrubbing, breakroom detailing, consumable restocking, and supervisory checks. Default ×1.20 means 20% above Enhanced.",
                default: TIER_MULTIPLIER_DEFAULTS.premium,
              },
            ]).map(({ key, label, tooltip, default: def }) => {
              const isModified = Math.abs(tierMult[key] - def) > 0.001;
              const isLocked = key === "enhanced";
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-slate-700">{label}</span>
                      {isModified && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full">
                          modified
                        </span>
                      )}
                      {isLocked && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-1.5 py-0.5 rounded-full">
                          fixed
                        </span>
                      )}
                      <Tooltip text={tooltip} side="right" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isLocked && isModified && (
                      <button
                        onClick={() => saveTierMult(key, def)}
                        className="text-xs text-slate-400 hover:text-primary-600 underline transition-colors"
                      >
                        reset
                      </button>
                    )}
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">×</span>
                      <input
                        type="number"
                        min={0.1}
                        max={5}
                        step={0.05}
                        value={tierMult[key]}
                        disabled={isLocked}
                        onChange={(e) => saveTierMult(key, Math.max(0.1, Math.min(5, parseFloat(e.target.value) || def)))}
                        className={`w-24 pl-6 pr-2 py-1.5 text-sm text-center border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold ${
                          isModified ? "border-amber-300 bg-amber-50" : "border-slate-200"
                        } ${isLocked ? "bg-slate-50 text-slate-400 cursor-not-allowed" : ""}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Visual tier spread preview */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-xs font-semibold text-slate-600 mb-3">Tier price spread preview (based on $300 Enhanced)</p>
            <div className="space-y-2">
              {[
                { label: "Basic", mult: tierMult.basic, color: "bg-slate-400" },
                { label: "Enhanced", mult: tierMult.enhanced, color: "bg-primary-500" },
                { label: "Premium", mult: tierMult.premium, color: "bg-violet-500" },
              ].map(({ label, mult, color }) => {
                const price = Math.round(300 * mult);
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-600">{label}</span>
                      <span className="font-bold text-slate-800">×{mult.toFixed(2)} → ${price}/visit</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(100, (mult / (tierMult.premium * 1.1)) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {hasCustomTier && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={resetTierMult}
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary-600 font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset to system defaults
              </button>
              <span className="text-xs text-amber-600 font-medium">Custom tier structure active</span>
            </div>
          )}
        </div>
      </Card>

      {/* ── Section 5: Tier name labels ──────────────────────────────────── */}
      <Card>
        <CardHeader title="Service Tier Names" icon={Settings} />
        <div className="px-5 pb-5 space-y-4">
          <p className="text-sm text-slate-500">
            Customize the display names shown to customers for each service tier. Changes apply to all new commercial quotes.
          </p>
          <div className="space-y-3">
            {([
              { key: "basic" as const,    color: "bg-slate-400",  badge: "text-slate-600 bg-slate-100" },
              { key: "enhanced" as const, color: "bg-primary-500", badge: "text-primary-700 bg-primary-50" },
              { key: "premium" as const,  color: "bg-violet-500",  badge: "text-violet-700 bg-violet-50" },
            ]).map(({ key, color, badge }) => {
              const defaultLabel = TIER_LABEL_DEFAULTS[key];
              const current = tierLabels[key];
              const isModified = current !== defaultLabel;
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${color} shrink-0`} />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={current}
                      maxLength={24}
                      onChange={(e) => saveTierLabel(key, e.target.value || defaultLabel)}
                      className={`w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium ${
                        isModified ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
                      }`}
                      placeholder={defaultLabel}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge}`}>
                      {isModified ? "modified" : "default"}
                    </span>
                    {isModified && (
                      <button
                        onClick={() => saveTierLabel(key, defaultLabel)}
                        className="text-xs text-slate-400 hover:text-primary-600 underline transition-colors"
                      >
                        reset
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {hasCustomLabels && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={resetTierLabels}
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary-600 font-medium transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset all to defaults
              </button>
              <span className="text-xs text-amber-600 font-medium">Custom tier names active</span>
            </div>
          )}
        </div>
      </Card>

      {/* ── Info card ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-700">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
        <div>
          <p className="font-semibold mb-1">How settings are applied</p>
          <ul className="space-y-1 text-blue-600 text-xs">
            <li>• <strong>Pricing defaults</strong> pre-fill hourly rate, overhead, and margin on new commercial quotes</li>
            <li>• <strong>Base minutes</strong> override ISSA defaults for labor time calculations on all facility types</li>
            <li>• <strong>Traffic multipliers</strong> adjust time estimates based on foot traffic level selected in walkthrough</li>
            <li>• <strong>Tier markups</strong> control the spread between Basic, Enhanced, and Premium price points</li>
            <li>• All settings are stored locally per device and do not sync across accounts</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
