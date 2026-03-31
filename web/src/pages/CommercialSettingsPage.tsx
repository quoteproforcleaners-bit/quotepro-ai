import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BASE_MINUTES_PER_1000_SQFT,
  TRAFFIC_LEVEL_MULTIPLIER,
  type FacilityType,
} from "../lib/pricingEngine";
import { PageHeader, Card, CardHeader } from "../components/ui";
import { Settings, RefreshCw, Check, Info, ArrowLeft } from "lucide-react";

// ─── Constants ─────────────────────────────────────────────────────────────────

export const COMMERCIAL_SETTINGS_KEY = "commercialBaseMinutes";

const ISSA_DEFAULTS = { ...BASE_MINUTES_PER_1000_SQFT };

const FACILITY_INFO: Record<FacilityType, { label: string; tooltip: string }> = {
  Office: {
    label: "Office Building",
    tooltip:
      "Standard open-plan and private-office mix. ISSA 2025 benchmark: 25 min per 1,000 sq ft.",
  },
  Retail: {
    label: "Retail Store",
    tooltip:
      "Sales floor with light to moderate foot traffic. ISSA 2025 benchmark: 20 min per 1,000 sq ft.",
  },
  Medical: {
    label: "Medical / Dental",
    tooltip:
      "Clinical spaces requiring disinfection protocols. ISSA 2025 benchmark: 35 min per 1,000 sq ft.",
  },
  Gym: {
    label: "Gym / Fitness Center",
    tooltip:
      "Equipment areas, locker rooms, high-sweat zones. ISSA 2025 benchmark: 30 min per 1,000 sq ft.",
  },
  School: {
    label: "School / Educational",
    tooltip:
      "Classroom and hallway mix, K–12 or university. ISSA 2025 benchmark: 28 min per 1,000 sq ft.",
  },
  Warehouse: {
    label: "Warehouse / Industrial",
    tooltip:
      "Large open floor, concrete, minimal office space. ISSA 2025 benchmark: 15 min per 1,000 sq ft.",
  },
  Restaurant: {
    label: "Restaurant / Food Service",
    tooltip:
      "Kitchen, dining room, and front-of-house. ISSA 2025 benchmark: 40 min per 1,000 sq ft.",
  },
  Other: {
    label: "Other / General Commercial",
    tooltip:
      "General commercial space not listed above. ISSA 2025 benchmark: 25 min per 1,000 sq ft.",
  },
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CommercialSettingsPage() {
  const navigate = useNavigate();
  const [savedFlash, setSavedFlash] = useState(false);
  const [openTooltip, setOpenTooltip] = useState<FacilityType | null>(null);

  const [values, setValues] = useState<Record<FacilityType, number>>(() => {
    try {
      const stored = localStorage.getItem(COMMERCIAL_SETTINGS_KEY);
      if (stored) return { ...ISSA_DEFAULTS, ...JSON.parse(stored) };
    } catch {}
    return { ...ISSA_DEFAULTS };
  });

  const flash = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const update = (k: FacilityType, v: number) => {
    const next = { ...values, [k]: Math.max(1, v || ISSA_DEFAULTS[k]) };
    setValues(next);
    localStorage.setItem(COMMERCIAL_SETTINGS_KEY, JSON.stringify(next));
    flash();
  };

  const resetToISSA = () => {
    setValues({ ...ISSA_DEFAULTS });
    localStorage.removeItem(COMMERCIAL_SETTINGS_KEY);
    flash();
  };

  const hasAnyCustom = (Object.keys(ISSA_DEFAULTS) as FacilityType[]).some(
    (k) => values[k] !== ISSA_DEFAULTS[k],
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <PageHeader
            title="Commercial Labor Settings"
            subtitle="Customize base cleaning time benchmarks for each facility type"
          />
        </div>
        <div className="flex items-center gap-3 mt-1 shrink-0">
          {savedFlash && (
            <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
              <Check className="w-4 h-4" />
              Saved
            </span>
          )}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary-600 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Quote
          </button>
        </div>
      </div>

      {/* Base minutes table */}
      <Card>
        <CardHeader title="Base Minutes per 1,000 sq ft" icon={Settings} />
        <div className="px-5 pb-5 space-y-5">
          <p className="text-sm text-slate-500">
            These values determine the base cleaning time for each facility type before room counts,
            floor multipliers, and other factors are applied. Defaults are based on{" "}
            <span className="font-semibold text-slate-700">ISSA 2025 cleaning benchmarks</span>.
            Adjust them to match your team's actual performance on each facility type.
          </p>

          <div className="space-y-3">
            {(Object.keys(ISSA_DEFAULTS) as FacilityType[]).map((k) => {
              const isModified = values[k] !== ISSA_DEFAULTS[k];
              const isOpen = openTooltip === k;
              return (
                <div key={k} className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-700">
                          {FACILITY_INFO[k].label}
                        </span>
                        {isModified && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full">
                            modified
                          </span>
                        )}
                        <button
                          onClick={() => setOpenTooltip(isOpen ? null : k)}
                          className="text-slate-400 hover:text-primary-500 transition-colors"
                          aria-label={`Info for ${FACILITY_INFO[k].label}`}
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={values[k]}
                        onChange={(e) => update(k, parseFloat(e.target.value))}
                        className="w-20 px-2 py-1.5 text-sm text-center border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold"
                      />
                      <span className="text-xs text-slate-400 w-28 shrink-0">
                        min / 1,000 sq ft
                      </span>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="ml-0 mr-32 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                      {FACILITY_INFO[k].tooltip}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={resetToISSA}
              disabled={!hasAnyCustom}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary-600 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset to ISSA 2025 Averages
            </button>
            {hasAnyCustom && (
              <span className="text-xs text-amber-600 font-medium">
                {(Object.keys(ISSA_DEFAULTS) as FacilityType[]).filter((k) => values[k] !== ISSA_DEFAULTS[k]).length} value(s) customized
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Traffic level reference */}
      <Card>
        <CardHeader title="Traffic Level Multipliers (read-only)" icon={Info} />
        <div className="px-5 pb-5 space-y-3">
          <p className="text-sm text-slate-500">
            These multipliers are applied to the total labor estimate based on the foot traffic
            level selected during walkthrough. They are fixed by the ISSA standard and cannot be
            customized here.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(Object.entries(TRAFFIC_LEVEL_MULTIPLIER) as [string, number][]).map(([level, mult]) => (
              <div
                key={level}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center"
              >
                <p className="text-xs font-semibold text-slate-700 mb-0.5">
                  {level === "VeryHigh" ? "Very High" : level}
                </p>
                <p className="text-lg font-extrabold text-primary-700">×{mult.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
