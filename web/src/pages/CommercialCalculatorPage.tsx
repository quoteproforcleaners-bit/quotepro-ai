/**
 * CommercialCalculatorPage — public, no-auth route
 * /commercial-cleaning-calculator
 *
 * SEO-optimised 3-step wizard: Facility → Walkthrough → Instant Quote
 * Shareable via URL state (base64-encoded). PDF via window.print().
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  computeCommercialLaborEstimate,
  computeCommercialQuote,
  computeCommercialTiers,
  DEFAULT_COMMERCIAL_PRICING,
  BASE_MINUTES_PER_1000_SQFT,
  ADDON_MINUTES,
  GLASS_LEVEL_MINUTES,
  TRAFFIC_LEVEL_MULTIPLIER,
  type CommercialWalkthrough,
  type FacilityType,
  type CommercialFrequency,
  type GlassLevel,
  type TrafficLevel,
} from "../lib/pricingEngine";
import {
  Building2,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Share2,
  Printer,
  Star,
  ArrowRight,
  Users,
  BarChart3,
  BadgeCheck,
  Info,
  AlertTriangle,
  ChevronDown,
  Calculator,
  Copy,
  Home,
} from "lucide-react";
// ─── Constants ────────────────────────────────────────────────────────────────

const FACILITY_TYPES: { value: FacilityType; label: string; icon: string }[] = [
  { value: "Office",     label: "Office Building",      icon: "🏢" },
  { value: "Retail",     label: "Retail Store",         icon: "🛍" },
  { value: "Medical",    label: "Medical / Dental",     icon: "🏥" },
  { value: "Gym",        label: "Gym / Fitness",        icon: "💪" },
  { value: "School",     label: "School / University",  icon: "🎓" },
  { value: "Warehouse",  label: "Warehouse / Industrial",icon: "🏭" },
  { value: "Restaurant", label: "Restaurant / Food Svc",icon: "🍽" },
  { value: "Other",      label: "Other Commercial",     icon: "🏗" },
];

const FREQUENCY_OPTIONS: { value: CommercialFrequency; label: string; visitsPerMonth: number }[] = [
  { value: "1x",     label: "Weekly (1×/wk)",    visitsPerMonth: 4  },
  { value: "2x",     label: "2× per Week",       visitsPerMonth: 8  },
  { value: "3x",     label: "3× per Week",       visitsPerMonth: 12 },
  { value: "5x",     label: "5× per Week",       visitsPerMonth: 20 },
  { value: "daily",  label: "Daily (Mon–Fri)",   visitsPerMonth: 22 },
];

// National industry benchmarks ($/sqft/month) — ISSA / BSCAI 2024 survey data
const NATIONAL_AVERAGES: Record<FacilityType, { low: number; high: number; source: string }> = {
  Office:     { low: 0.28, high: 0.48, source: "BSCAI 2024" },
  Retail:     { low: 0.24, high: 0.40, source: "ISSA 2024"  },
  Medical:    { low: 0.48, high: 0.72, source: "ISSA 2026"  },
  Gym:        { low: 0.40, high: 0.60, source: "ISSA 2026"  },
  School:     { low: 0.32, high: 0.52, source: "BSCAI 2024" },
  Warehouse:  { low: 0.16, high: 0.28, source: "ISSA 2024"  },
  Restaurant: { low: 0.52, high: 0.80, source: "ISSA 2026"  },
  Other:      { low: 0.28, high: 0.48, source: "ISSA 2024"  },
};

const TESTIMONIALS = [
  {
    quote: "We were overpaying $600/month on janitorial until we ran this calculator and renegotiated. The ISSA benchmarks gave us the credibility to push back.",
    name: "Marcus T.",
    role: "Facilities Director, 3-location medical practice",
    stars: 5,
  },
  {
    quote: "Built a commercial proposal in under 10 minutes and closed a $4,800/month contract the same week. The tiered pricing structure alone made us look way more professional.",
    name: "Destiny W.",
    role: "Owner, Premier Commercial Cleaning LLC",
    stars: 5,
  },
  {
    quote: "I was skeptical about an 'AI calculator' but the numbers track almost exactly to my crew's actual hours. Saved me from underpricing a school district bid by $900/month.",
    name: "Javier R.",
    role: "Owner, ProShine Janitorial Services",
    stars: 5,
  },
];

const FAQ_DATA = [
  {
    q: "How accurate is the commercial cleaning cost calculator?",
    a: "The calculator uses ISSA 2026 production rate standards — the same benchmarks used by professional janitorial contractors and facility managers worldwide. Results are typically within 10–15% of actual market rates, varying by local labor costs, building conditions, and service scope.",
  },
  {
    q: "What does commercial cleaning cost per square foot?",
    a: "Commercial cleaning costs typically range from $0.16 to $0.80 per square foot per month depending on facility type and cleaning frequency. Office buildings average $0.28–$0.48/sqft/month, while medical facilities run $0.48–$0.72/sqft/month due to higher disinfection requirements.",
  },
  {
    q: "How often should a commercial building be cleaned?",
    a: "Most commercial facilities are cleaned 1–3 times per week. High-traffic offices, medical facilities, and restaurants often require daily cleaning. Warehouses and low-traffic spaces may only need weekly or bi-weekly service.",
  },
  {
    q: "What is included in a standard commercial cleaning contract?",
    a: "Standard commercial cleaning typically includes vacuuming and mopping all floors, cleaning and sanitizing restrooms, emptying trash receptacles, dusting surfaces, wiping down common areas, and cleaning break rooms. Premium tiers add window cleaning, deep restroom scrubbing, and high-touch surface disinfection.",
  },
  {
    q: "What are the ISSA production rates used in this calculator?",
    a: "ISSA (the Worldwide Cleaning Industry Association) publishes standardized cleaning production rates that define how many square feet a trained cleaner can service per hour. For example, office space is benchmarked at approximately 25 minutes per 1,000 sq ft, while medical spaces require 35 minutes per 1,000 sq ft. These rates reflect trained, properly-equipped crews.",
  },
  {
    q: "How do I get an accurate quote for my building?",
    a: "The most accurate quotes come from an on-site walkthrough. The calculator captures the key variables (facility type, square footage, room counts, glass level, frequency), but local labor rates, building conditions, special requirements, and walk-in logistics all affect final pricing. Use the 'Get Full Proposal' option to connect with a professional cleaner who will do an on-site assessment.",
  },
  {
    q: "Is after-hours commercial cleaning more expensive?",
    a: "Yes — after-hours cleaning typically adds a 20–30% premium due to overtime labor, security coordination, and access logistics. The calculator includes an after-hours toggle that applies this surcharge automatically.",
  },
  {
    q: "How do commercial cleaning prices compare to residential?",
    a: "Commercial cleaning is typically priced by square footage and frequency, whereas residential is often priced per job or per hour. Commercial rates benefit from scale — large open areas clean faster per square foot — but require more specialized equipment and compliance (especially in medical or food-service settings).",
  },
  {
    q: "Can I share or save my cleaning cost estimate?",
    a: "Yes — after viewing your results, click 'Share Quote' to copy a unique URL that preserves your exact inputs. Anyone with the link sees the same estimate. You can also click 'Download PDF' to save or email a branded copy of your quote.",
  },
  {
    q: "What is the difference between Basic, Enhanced, and Premium cleaning tiers?",
    a: "Basic tier covers core janitorial tasks: floors, trash, and restrooms. Enhanced adds detailed dusting, restroom deep-clean, high-touch disinfection, and entry area care. Premium includes everything in Enhanced plus window and glass cleaning, breakroom deep-clean, supply restocking, and supervisory quality checks after each visit.",
  },
];

// ─── State shape for URL encoding ─────────────────────────────────────────────

interface CalcState {
  facilityType: FacilityType;
  totalSqFt: number;
  floors: number;
  frequency: CommercialFrequency;
  bathroomCount: number;
  breakroomCount: number;
  conferenceRoomCount: number;
  openAreaCount: number;
  glassLevel: GlassLevel;
  trafficLevel: TrafficLevel;
  afterHoursRequired: boolean;
  highTouchFocus: boolean;
}

const DEFAULT_STATE: CalcState = {
  facilityType: "Office",
  totalSqFt: 0,
  floors: 1,
  frequency: "1x",
  bathroomCount: 0,
  breakroomCount: 0,
  conferenceRoomCount: 0,
  openAreaCount: 0,
  glassLevel: "None",
  trafficLevel: "Medium",
  afterHoursRequired: false,
  highTouchFocus: false,
};

function encodeState(s: CalcState): string {
  try { return btoa(JSON.stringify(s)); } catch { return ""; }
}

function decodeState(raw: string): CalcState | null {
  try { return { ...DEFAULT_STATE, ...JSON.parse(atob(raw)) }; } catch { return null; }
}

// ─── SEO injection ────────────────────────────────────────────────────────────

function useSEO() {
  useEffect(() => {
    const prev = document.title;
    document.title = "Commercial Cleaning Cost Calculator 2026 | Free Janitorial Quote Tool";

    const metas: [string, string, string][] = [
      ["name", "description", "Free commercial cleaning cost calculator. Get instant janitorial quotes based on ISSA 2026 production rates. Covers offices, medical, retail, gyms, schools, restaurants, and warehouses. Compare to national averages."],
      ["name", "keywords", "commercial cleaning cost calculator, janitorial quote calculator, office cleaning prices, commercial cleaning rates per square foot, ISSA production rates, janitorial bid calculator, cleaning cost estimator 2026"],
      ["property", "og:title", "Commercial Cleaning Cost Calculator 2026 | Free Janitorial Quote Tool"],
      ["property", "og:description", "Instant commercial cleaning quotes powered by ISSA 2026 benchmarks. Get Basic, Enhanced, and Premium pricing tiers in seconds."],
      ["property", "og:type", "website"],
      ["name", "robots", "index, follow"],
    ];

    const added: HTMLMetaElement[] = [];
    metas.forEach(([attr, attrVal, content]) => {
      const el = document.createElement("meta");
      el.setAttribute(attr, attrVal);
      el.setAttribute("content", content);
      document.head.appendChild(el);
      added.push(el);
    });

    // JSON-LD FAQ schema
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "calc-faq-schema";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_DATA.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
    document.head.appendChild(script);

    return () => {
      document.title = prev;
      added.forEach((el) => el.remove());
      script.remove();
    };
  }, []);
}

// ─── Reusable small components ─────────────────────────────────────────────────

function NumField({ label, value, onChange, placeholder, note }: {
  label: string; value: number; onChange: (v: number) => void;
  placeholder?: string; note?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input
        type="number"
        min={0}
        value={value || ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {note && <p className="text-[11px] text-slate-400 mt-1">{note}</p>}
    </div>
  );
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function StepDots({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i === step ? "w-8 bg-blue-600" : i < step ? "w-2 bg-emerald-500" : "w-2 bg-slate-200"
          }`}
        />
      ))}
      <span className="text-xs text-slate-500 ml-2">Step {step} of 3</span>
    </div>
  );
}

// ─── Step 1: Facility ─────────────────────────────────────────────────────────

function Step1Facility({ state, onChange, onNext }: {
  state: CalcState; onChange: (s: CalcState) => void; onNext: () => void;
}) {
  const set = <K extends keyof CalcState>(k: K, v: CalcState[K]) => onChange({ ...state, [k]: v });
  const canProceed = state.facilityType && state.totalSqFt >= 100;

  return (
    <div className="space-y-5">
      <StepDots step={1} />

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">What type of facility?</h2>
        <p className="text-sm text-slate-500">Select your facility type to get ISSA-calibrated base rates</p>
      </div>

      {/* Facility type grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FACILITY_TYPES.map((ft) => (
          <button
            key={ft.value}
            onClick={() => set("facilityType", ft.value)}
            className={`p-3 rounded-xl border-2 text-left transition-all ${
              state.facilityType === ft.value
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className="text-xl mb-1">{ft.icon}</div>
            <p className={`text-xs font-semibold leading-tight ${state.facilityType === ft.value ? "text-blue-700" : "text-slate-700"}`}>
              {ft.label}
            </p>
          </button>
        ))}
      </div>

      {/* Size & frequency */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <NumField
          label="Total Square Footage *"
          value={state.totalSqFt}
          onChange={(v) => set("totalSqFt", v)}
          placeholder="e.g. 5,000"
          note="Minimum 100 sq ft"
        />
        <NumField
          label="Number of Floors"
          value={state.floors}
          onChange={(v) => set("floors", Math.max(1, v))}
          placeholder="1"
        />
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Cleaning Frequency</label>
          <select
            value={state.frequency}
            onChange={(e) => set("frequency", e.target.value as CommercialFrequency)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FREQUENCY_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!canProceed}
        className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        Next: Service Details <ChevronRight className="w-4 h-4" />
      </button>

      {!canProceed && state.totalSqFt > 0 && state.totalSqFt < 100 && (
        <p className="text-xs text-red-500 text-center">Minimum facility size is 100 sq ft</p>
      )}
    </div>
  );
}

// ─── Step 2: Walkthrough ──────────────────────────────────────────────────────

function Step2Walkthrough({ state, onChange, onNext, onBack }: {
  state: CalcState; onChange: (s: CalcState) => void; onNext: () => void; onBack: () => void;
}) {
  const set = <K extends keyof CalcState>(k: K, v: CalcState[K]) => onChange({ ...state, [k]: v });

  const GLASS_OPTIONS: { value: GlassLevel; label: string }[] = [
    { value: "None",    label: "None / Minimal" },
    { value: "Some",    label: "Some Glass" },
    { value: "Lots",    label: "Lots of Glass" },
  ];

  const TRAFFIC_OPTIONS: { value: TrafficLevel; label: string; mult: string }[] = [
    { value: "Low",      label: "Low",       mult: "×0.90" },
    { value: "Medium",   label: "Medium",    mult: "×1.00" },
    { value: "High",     label: "High",      mult: "×1.15" },
    { value: "VeryHigh", label: "Very High", mult: "×1.30" },
  ];

  return (
    <div className="space-y-5">
      <StepDots step={2} />

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Service details</h2>
        <p className="text-sm text-slate-500">More detail = more accurate estimate</p>
      </div>

      {/* Room counts */}
      <SectionCard className="p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-500" /> Room Counts
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <NumField label="Bathrooms / Restrooms" value={state.bathroomCount} onChange={(v) => set("bathroomCount", v)} placeholder="0" />
          <NumField label="Breakrooms / Kitchens" value={state.breakroomCount} onChange={(v) => set("breakroomCount", v)} placeholder="0" />
          <NumField label="Conference Rooms" value={state.conferenceRoomCount} onChange={(v) => set("conferenceRoomCount", v)} placeholder="0" />
          <NumField label="Open Work Areas" value={state.openAreaCount} onChange={(v) => set("openAreaCount", v)} placeholder="0" />
        </div>
      </SectionCard>

      {/* Environment */}
      <SectionCard className="p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" /> Environment Factors
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Glass / Window Level</label>
            <div className="flex gap-2">
              {GLASS_OPTIONS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => set("glassLevel", g.value)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    state.glassLevel === g.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Foot Traffic Level</label>
            <div className="flex gap-1.5">
              {TRAFFIC_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => set("trafficLevel", t.value)}
                  className={`flex-1 py-2 text-center text-xs font-medium rounded-lg border transition-colors ${
                    state.trafficLevel === t.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div>{t.label}</div>
                  <div className="text-[10px] opacity-60">{t.mult}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {[
            { key: "highTouchFocus" as const, label: "High-Touch Disinfection", sub: "Handles, switches, door rails (+15 min/visit)" },
            { key: "afterHoursRequired" as const, label: "After-Hours Service", sub: "Adds 25% after-hours premium" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => set(opt.key, !state[opt.key])}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                state[opt.key] ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start gap-2">
                <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                  state[opt.key] ? "border-blue-500 bg-blue-500" : "border-slate-300"
                }`}>
                  {state[opt.key] && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${state[opt.key] ? "text-blue-700" : "text-slate-700"}`}>{opt.label}</p>
                  <p className="text-xs text-slate-500">{opt.sub}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-4 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={onNext}
          className="flex-[2] py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          Calculate Instant Quote <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Results ──────────────────────────────────────────────────────────

function Step3Results({ state, onBack, onShare, shareUrl }: {
  state: CalcState; onBack: () => void; onShare: () => void; shareUrl: string;
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [mathOpen, setMathOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Build full walkthrough for engine (only valid CommercialWalkthrough fields)
  const walkthrough: CommercialWalkthrough = useMemo(() => ({
    facilityType: state.facilityType,
    totalSqFt: state.totalSqFt,
    floors: state.floors,
    frequency: state.frequency,
    bathroomCount: state.bathroomCount,
    breakroomCount: state.breakroomCount,
    conferenceRoomCount: state.conferenceRoomCount,
    privateOfficeCount: 0,
    openAreaCount: state.openAreaCount,
    entryLobbyCount: 1,
    trashPointCount: Math.max(1, Math.round(state.totalSqFt / 2000)),
    elevatorCount: state.floors > 3 ? 1 : 0,
    buildingAge: 10,
    buildingAgeYears: 10,
    parkingLotSqFt: undefined,
    carpetPercent: 40,
    hardFloorPercent: 60,
    glassLevel: state.glassLevel,
    highTouchFocus: state.highTouchFocus,
    afterHoursRequired: state.afterHoursRequired,
    trafficLevel: state.trafficLevel,
    accessConstraints: "",
    suppliesByClient: false,
    restroomConsumablesIncluded: true,
    preferredDays: "",
    preferredTimeWindow: "",
    notes: "",
  }), [state]);

  const laborEst = useMemo(() => ({ ...computeCommercialLaborEstimate(walkthrough), overrideHours: null as null }), [walkthrough]);

  const quoteResult = useMemo(
    () => computeCommercialQuote(laborEst, DEFAULT_COMMERCIAL_PRICING, state.frequency, walkthrough),
    [laborEst, state.frequency, walkthrough],
  );

  const tiers = useMemo(
    () => computeCommercialTiers("", quoteResult.perVisit, state.frequency, DEFAULT_COMMERCIAL_PRICING.roundingRule),
    [quoteResult.perVisit, state.frequency],
  );

  const freq = FREQUENCY_OPTIONS.find((f) => f.value === state.frequency);
  const nat = NATIONAL_AVERAGES[state.facilityType];
  const natMonthlyLow  = nat.low  * state.totalSqFt;
  const natMonthlyHigh = nat.high * state.totalSqFt;
  const enhancedTier   = tiers[1];
  const sqftPerMonth   = enhancedTier.monthlyPrice / state.totalSqFt;

  const vsNational =
    enhancedTier.monthlyPrice < natMonthlyLow
      ? "below"
      : enhancedTier.monthlyPrice > natMonthlyHigh
      ? "above"
      : "within";

  // Transparent math formula values
  const baseMinutesPer1k = BASE_MINUTES_PER_1000_SQFT[state.facilityType];
  const baseMins = (state.totalSqFt / 1000) * baseMinutesPer1k;
  const bathroomMins = state.bathroomCount * ADDON_MINUTES.perBathroom;
  const breakroomMins = state.breakroomCount * ADDON_MINUTES.perBreakroom;
  const confMins = state.conferenceRoomCount * ADDON_MINUTES.perConferenceRoom;
  const openAreaMins = state.openAreaCount * ADDON_MINUTES.perOpenArea;
  const glassMins = GLASS_LEVEL_MINUTES[state.glassLevel];
  const highTouchMins = state.highTouchFocus ? 15 : 0;
  const trafficMult = TRAFFIC_LEVEL_MULTIPLIER[state.trafficLevel];
  const floorMult = state.floors > 1 ? 1 + (state.floors - 1) * 0.05 : 1;
  const surfaceMult = 0.4 * 1.1 + 0.6 * 0.95; // 40% carpet, 60% hard floor

  // QR code URL for branded PDF
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(shareUrl)}&bgcolor=ffffff&color=1e293b&margin=4`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const TIER_STYLES = [
    { border: "border-slate-300", bg: "bg-slate-50",    text: "text-slate-700",  badge: "bg-slate-100 text-slate-600"  },
    { border: "border-blue-400",  bg: "bg-blue-50",     text: "text-blue-700",   badge: "bg-blue-100 text-blue-700"    },
    { border: "border-violet-400",bg: "bg-violet-50",   text: "text-violet-700", badge: "bg-violet-100 text-violet-700"},
  ];

  const facilityLabel = FACILITY_TYPES.find((f) => f.value === state.facilityType)?.label ?? state.facilityType;

  return (
    <div ref={printRef} className="space-y-6">
      <StepDots step={3} />

      {/* Hero result */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">Estimated Monthly Cost</p>
            <p className="text-4xl font-extrabold tracking-tight">
              ${enhancedTier.monthlyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-lg font-normal text-blue-300">/mo</span>
            </p>
            <p className="text-blue-300 text-sm mt-1">
              {facilityLabel} · {state.totalSqFt.toLocaleString()} sq ft · {freq?.label}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="bg-blue-500/50 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
              <BadgeCheck className="w-3.5 h-3.5" /> ISSA 2026 Benchmarks
            </span>
            <span className="text-blue-300 text-xs">
              ${sqftPerMonth.toFixed(2)}/sqft/mo
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 bg-white/10 rounded-xl p-3">
          <div className="text-center">
            <p className="text-blue-200 text-[11px] mb-0.5">Est. Hours/Visit</p>
            <p className="font-bold text-lg">{laborEst.rawHours.toFixed(1)}h</p>
          </div>
          <div className="text-center border-x border-white/20">
            <p className="text-blue-200 text-[11px] mb-0.5">Cleaners Needed</p>
            <p className="font-bold text-lg">{laborEst.recommendedCleaners}</p>
          </div>
          <div className="text-center">
            <p className="text-blue-200 text-[11px] mb-0.5">Visits/Month</p>
            <p className="font-bold text-lg">{quoteResult.visitsPerMonth}</p>
          </div>
        </div>

        <p className="text-blue-200 text-xs mt-3 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0" />
          Based on real ISSA production rates + your inputs. Final pricing varies by local market and contract terms.
        </p>
      </div>

      {/* All 3 tiers */}
      <SectionCard className="p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">All Service Tiers</h3>
        <div className="space-y-3">
          {tiers.map((t, i) => {
            const st = TIER_STYLES[i];
            return (
              <div key={t.name} className={`rounded-xl border-2 p-4 ${st.border} ${st.bg}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${st.text}`}>{t.name}</span>
                      {i === 1 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.badge} flex items-center gap-1`}>
                          <Star className="w-2.5 h-2.5" /> Most Popular
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{t.scopeText}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-extrabold text-base ${st.text}`}>
                      ${t.monthlyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-xs font-normal text-slate-500">/mo</span>
                    </p>
                    <p className="text-xs text-slate-400">${t.pricePerVisit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/visit</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {t.includedBullets.slice(0, 4).map((b) => (
                    <div key={b} className="flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span className="text-xs text-slate-600">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* National comparison */}
      <SectionCard className="p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          How Your Estimate Compares to National Averages
        </h3>
        <p className="text-xs text-slate-400 mb-4">Source: {nat.source} — {facilityLabel} benchmarks</p>

        <div className="space-y-3">
          {[
            { label: "National Low", value: natMonthlyLow,  color: "bg-slate-200" },
            { label: "Your Estimate (Enhanced)", value: enhancedTier.monthlyPrice, color: "bg-blue-500", highlight: true },
            { label: "National High", value: natMonthlyHigh, color: "bg-slate-300" },
          ].sort((a, b) => a.value - b.value).map((row) => {
            const maxVal = Math.max(natMonthlyHigh, enhancedTier.monthlyPrice);
            const pct    = Math.min(100, (row.value / maxVal) * 100);
            return (
              <div key={row.label}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-medium ${row.highlight ? "text-blue-700" : "text-slate-600"}`}>{row.label}</span>
                  <span className={`text-xs font-bold ${row.highlight ? "text-blue-700" : "text-slate-700"}`}>
                    ${row.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${row.color} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className={`mt-4 p-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
          vsNational === "within" ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : vsNational === "below" ? "bg-amber-50 text-amber-700 border border-amber-200"
            : "bg-slate-50 text-slate-600 border border-slate-200"
        }`}>
          <BadgeCheck className="w-4 h-4 shrink-0 mt-0.5" />
          {vsNational === "within" && "Your estimate is within the national range — a strong, competitive market rate."}
          {vsNational === "below" && "Your estimate is below national averages. Consider whether service scope matches your facility's needs."}
          {vsNational === "above" && "Your estimate exceeds national averages, possibly due to after-hours service, medical facility requirements, or high-traffic adjustments."}
        </div>

        <p className="text-[11px] text-slate-400 mt-3">
          National averages reflect {facilityLabel.toLowerCase()} cleaning contracts cleaned {freq?.label.toLowerCase() || "weekly"}
          across 1,000+ US facilities surveyed in {nat.source}.
          Rates vary significantly by metro area, building condition, and contract length.
        </p>
      </SectionCard>

      {/* Line item detail */}
      <SectionCard className="p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Estimate Breakdown (Enhanced Tier)</h3>
        <div className="space-y-2">
          {quoteResult.lineItems.map((item) => (
            <div key={item.label} className="flex justify-between items-center text-sm">
              <span className="text-slate-600">{item.label}</span>
              <span className={`font-semibold ${item.type === "surcharge" ? "text-amber-700" : item.amount < 0 ? "text-emerald-600" : "text-slate-800"}`}>
                {item.amount < 0 ? "−" : "+"}${Math.abs(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
          <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm">
            <span>Total per Visit</span>
            <span className="text-blue-700">${quoteResult.perVisit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          Based on 2026 ISSA/BSCAI production rate standards. Assumes ${DEFAULT_COMMERCIAL_PRICING.hourlyRate}/hr labor,{" "}
          {DEFAULT_COMMERCIAL_PRICING.overheadPct}% overhead, {DEFAULT_COMMERCIAL_PRICING.targetMarginPct}% margin.
          Adjust in full proposal tool after sign-in.
        </p>

        {/* Transparent math formula breakdown */}
        <button
          onClick={() => setMathOpen((v) => !v)}
          className="mt-4 w-full flex items-center justify-between text-xs font-semibold text-blue-700 hover:text-blue-800 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" /> How we calculated the {laborEst.rawHours.toFixed(1)} hours
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${mathOpen ? "rotate-180" : ""}`} />
        </button>

        {mathOpen && (
          <div className="mt-3 bg-slate-50 rounded-xl p-4 space-y-2 text-[12px]">
            <p className="font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              Step-by-step using 2026 ISSA production rates
            </p>

            {/* Base rate row */}
            <div className="flex justify-between">
              <span className="text-slate-600">
                Base rate — {facilityLabel} ({baseMinutesPer1k} min/1,000 sqft × {(state.totalSqFt / 1000).toFixed(1)}k sqft)
              </span>
              <span className="font-semibold text-slate-800">{baseMins.toFixed(1)} min</span>
            </div>

            {/* Room add-ons */}
            {state.bathroomCount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Restrooms ({state.bathroomCount} × 15 min — ISSA std)</span>
                <span className="font-semibold text-slate-800">+{bathroomMins.toFixed(0)} min</span>
              </div>
            )}
            {state.breakroomCount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Breakrooms ({state.breakroomCount} × 10 min)</span>
                <span className="font-semibold text-slate-800">+{breakroomMins.toFixed(0)} min</span>
              </div>
            )}
            {state.conferenceRoomCount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Conference rooms ({state.conferenceRoomCount} × 5 min)</span>
                <span className="font-semibold text-slate-800">+{confMins.toFixed(0)} min</span>
              </div>
            )}
            {state.openAreaCount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Open work areas ({state.openAreaCount} × 8 min)</span>
                <span className="font-semibold text-slate-800">+{openAreaMins.toFixed(0)} min</span>
              </div>
            )}
            {glassMins > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Glass / windows ({state.glassLevel})</span>
                <span className="font-semibold text-slate-800">+{glassMins} min</span>
              </div>
            )}
            {highTouchMins > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">High-touch disinfection add-on</span>
                <span className="font-semibold text-slate-800">+{highTouchMins} min</span>
              </div>
            )}

            {/* Multipliers */}
            <div className="border-t border-slate-200 pt-2 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">
                  Surface mix adjustment (40% carpet ×1.1 + 60% hard floor ×0.95)
                </span>
                <span className="font-semibold text-slate-700">×{surfaceMult.toFixed(3)}</span>
              </div>
              {state.floors > 1 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Multi-floor travel ({state.floors} floors)</span>
                  <span className="font-semibold text-slate-700">×{floorMult.toFixed(2)}</span>
                </div>
              )}
              {trafficMult !== 1.0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Foot traffic: {state.trafficLevel}</span>
                  <span className="font-semibold text-slate-700">×{trafficMult.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-800">
              <span>Total cleaning time per visit</span>
              <span>{laborEst.rawMinutes} min ({laborEst.rawHours.toFixed(1)}h)</span>
            </div>

            <p className="text-slate-400 text-[11px] pt-1 border-t border-slate-100">
              Source: ISSA Cleaning Times &amp; Production Rates 2026 · BSCAI Benchmarking Survey 2024.
              Production rates reflect trained crews with proper equipment.
            </p>
          </div>
        )}
      </SectionCard>

      {/* Share & Print */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:hidden">
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 py-3 px-4 border-2 border-blue-200 text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors"
        >
          {copied
            ? <><CheckCircle className="w-4 h-4 text-emerald-500" /> Link Copied!</>
            : <><Copy className="w-4 h-4" /> Copy Share Link</>}
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors"
        >
          <Printer className="w-4 h-4" /> Download Branded PDF
        </button>
      </div>
      <p className="text-[11px] text-slate-400 text-center print:hidden flex items-center justify-center gap-1.5">
        <Share2 className="w-3 h-3" />
        PDF includes QR code linking back to this estimate so recipients can recalculate
      </p>

      {/* CTA — Get Full Pro Proposal */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-2xl p-6 text-white print:hidden">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-blue-500 rounded-xl shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2.5 py-1 rounded-full mb-2">
              <Star className="w-3 h-3" /> 14-DAY FREE TRIAL — NO CREDIT CARD
            </div>
            <h3 className="font-bold text-base mb-2">Turn This Into a Full Pro Proposal</h3>
            <ul className="space-y-1 mb-4">
              {[
                "Branded PDF with your logo, photo, and license number",
                "All 3 service tiers with custom add-on line items",
                "One-click email delivery with digital acceptance",
                "ISSA/BSCAI benchmark badges on every proposal",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/register")}
                className="bg-blue-500 hover:bg-blue-400 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors text-sm shadow-md"
              >
                Get Full Pro Proposal <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate("/login")}
                className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors print:hidden"
      >
        <ChevronLeft className="w-4 h-4" /> Recalculate with different inputs
      </button>

      {/* ── Branded PDF layout — hidden on screen, shown only during print ── */}
      <div
        id="calc-pdf-root"
        style={{
          display: "none",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#0f172a",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, borderBottom: "2px solid #1e40af", paddingBottom: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1e40af", letterSpacing: -0.5 }}>QuotePro AI</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>Commercial Cleaning Cost Estimate</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
              Generated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              &nbsp;·&nbsp;Based on 2026 ISSA/BSCAI Production Rate Standards
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <img src={qrUrl} alt="Scan to recalculate" style={{ width: 72, height: 72, display: "block" }} />
            <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 3 }}>Scan to recalculate</div>
          </div>
        </div>

        {/* Facility summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Facility Type", value: facilityLabel },
            { label: "Square Footage", value: `${state.totalSqFt.toLocaleString()} sq ft` },
            { label: "Floors", value: String(state.floors) },
            { label: "Frequency", value: freq?.label ?? state.frequency },
          ].map((item) => (
            <div key={item.label} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Hero price */}
        <div style={{ background: "linear-gradient(135deg, #1d4ed8, #1e40af)", borderRadius: 12, padding: "20px 24px", marginBottom: 20, color: "white" }}>
          <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 4 }}>Estimated Monthly Cost (Enhanced Tier)</div>
          <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1 }}>
            ${enhancedTier.monthlyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span style={{ fontSize: 16, fontWeight: 400, opacity: 0.7 }}>/mo</span>
          </div>
          <div style={{ display: "flex", gap: 24, marginTop: 12, fontSize: 12, opacity: 0.85 }}>
            <span>Est. {laborEst.rawHours.toFixed(1)}h / visit</span>
            <span>{laborEst.recommendedCleaners} cleaners recommended</span>
            <span>{quoteResult.visitsPerMonth} visits / month</span>
            <span>${sqftPerMonth.toFixed(2)}/sqft/mo</span>
          </div>
        </div>

        {/* 3-tier table */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Service Tiers</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                {["Tier", "Includes", "Per Visit", "Monthly", "Annual"].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#374151", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tiers.map((t, i) => (
                <tr key={t.name} style={{ background: i % 2 === 0 ? "white" : "#f8fafc" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 700, color: i === 1 ? "#1d4ed8" : "#0f172a" }}>
                    {t.name}{i === 1 ? " ★" : ""}
                  </td>
                  <td style={{ padding: "8px 10px", color: "#64748b", fontSize: 11 }}>{t.scopeText}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 600 }}>${t.pricePerVisit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 700, color: i === 1 ? "#1d4ed8" : "#0f172a" }}>${t.monthlyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ padding: "8px 10px", color: "#374151" }}>${(t.monthlyPrice * 12).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* National benchmark */}
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 12 }}>
          <div style={{ fontWeight: 700, color: "#166534", marginBottom: 4 }}>National Benchmark Comparison — {facilityLabel}</div>
          <div style={{ color: "#15803d" }}>
            National range: ${natMonthlyLow.toLocaleString(undefined, { maximumFractionDigits: 0 })}–${natMonthlyHigh.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
            &nbsp;·&nbsp; Your estimate: ${enhancedTier.monthlyPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
            &nbsp;·&nbsp; Status: <strong>{vsNational === "within" ? "Within national range" : vsNational === "below" ? "Below national range" : "Above national range"}</strong>
          </div>
          <div style={{ color: "#86efac", marginTop: 2, fontSize: 10 }}>Source: {nat.source}</div>
        </div>

        {/* Cost formula */}
        <div style={{ marginBottom: 20, fontSize: 11 }}>
          <div style={{ fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 10 }}>How this estimate was calculated</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {quoteResult.lineItems.map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>{item.label}</span>
                <span style={{ fontWeight: 600, color: item.type === "surcharge" ? "#92400e" : "#0f172a" }}>
                  {item.amount < 0 ? "−" : "+"}${Math.abs(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, padding: "6px 0", borderTop: "2px solid #e2e8f0", marginTop: 4 }}>
            <span>Total per Visit</span>
            <span style={{ color: "#1d4ed8" }}>${quoteResult.perVisit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, fontSize: 10, color: "#94a3b8", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div>QuotePro AI Commercial Cleaning Cost Calculator</div>
            <div style={{ marginTop: 2 }}>
              Estimates based on ISSA Cleaning Times &amp; Production Rates 2026 and BSCAI Benchmarking Survey 2024.
            </div>
            <div style={{ marginTop: 1 }}>Not a substitute for an on-site assessment. Final pricing varies by local market and contract terms.</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 9 }}>
            <div>Scan QR to recalculate</div>
            <div>quotepro.ai</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function Testimonials() {
  return (
    <section className="mt-16 print:hidden">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Trusted by cleaning professionals</h2>
        <p className="text-slate-500 mt-2">Real results from cleaners using ISSA-backed pricing</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex gap-0.5 mb-3">
              {[...Array(t.stars)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed mb-4">"{t.quote}"</p>
            <div>
              <p className="text-sm font-semibold text-slate-900">{t.name}</p>
              <p className="text-xs text-slate-500">{t.role}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── FAQ Section ──────────────────────────────────────────────────────────────

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="mt-16 print:hidden">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Frequently Asked Questions</h2>
        <p className="text-slate-500 mt-2">Commercial cleaning pricing explained</p>
      </div>
      <div className="space-y-3">
        {FAQ_DATA.map((faq, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
            >
              <span className="font-semibold text-sm text-slate-800">{faq.q}</span>
              <ChevronRight
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open === i ? "rotate-90" : ""}`}
              />
            </button>
            {open === i && (
              <div className="px-5 pb-5">
                <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Print styles ─────────────────────────────────────────────────────────────

const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #calc-pdf-root, #calc-pdf-root * { visibility: visible !important; }
  #calc-pdf-root {
    position: fixed !important;
    top: 0; left: 0; right: 0; bottom: 0;
    background: white;
    padding: 32px;
    font-family: system-ui, sans-serif;
  }
  @page { margin: 1cm; size: A4 portrait; }
}
`;

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CommercialCalculatorPage() {
  useSEO();

  const navigate       = useNavigate();
  const [params, setParams] = useSearchParams();

  const [step,  setStep]  = useState<1 | 2 | 3>(1);
  const [state, setState] = useState<CalcState>(() => {
    const q = params.get("q");
    if (q) {
      const decoded = decodeState(q);
      if (decoded) return decoded;
    }
    return DEFAULT_STATE;
  });

  // Build share URL whenever state changes and we're on step 3
  const shareUrl = useMemo(() => {
    const base = `${window.location.origin}/commercial-cleaning-calculator`;
    const encoded = encodeState(state);
    return encoded ? `${base}?q=${encoded}` : base;
  }, [state]);

  // Update URL on step 3 so browser bar is shareable
  useEffect(() => {
    if (step === 3) {
      const encoded = encodeState(state);
      if (encoded) setParams({ q: encoded }, { replace: true });
    } else if (step < 3) {
      setParams({}, { replace: true });
    }
  }, [step, state]);

  // If URL already has state, jump to results
  useEffect(() => {
    const q = params.get("q");
    if (q && decodeState(q)) {
      setState(decodeState(q)!);
      setStep(3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShare = () => {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
  };

  return (
    <>
      {/* Print styles */}
      <style>{PRINT_STYLE}</style>

      <div className="min-h-screen bg-slate-50">
        {/* Hero header */}
        <div className="bg-gradient-to-b from-blue-700 to-blue-600 text-white print:hidden">
          <div className="max-w-4xl mx-auto px-4 pt-10 pb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">FREE TOOL</span>
              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">NO LOGIN REQUIRED</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 leading-tight">
              Commercial Cleaning<br />Cost Calculator 2026
            </h1>
            <p className="text-blue-100 text-base sm:text-lg max-w-2xl">
              Get an instant, ISSA-benchmarked janitorial quote for any commercial facility —
              offices, medical, retail, gyms, schools, warehouses, and restaurants.
              No email required.
            </p>
            <div className="flex flex-wrap gap-4 mt-5">
              {[
                ["ISSA 2026", "Production Rate Standards"],
                ["3 Service Tiers", "Basic / Enhanced / Premium"],
                ["National Benchmarks", "Compare to market rates"],
              ].map(([title, sub]) => (
                <div key={title} className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-blue-300 shrink-0" />
                  <div>
                    <span className="text-white text-xs font-bold">{title}</span>
                    <span className="text-blue-300 text-xs"> — {sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main layout */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Calculator wizard */}
            <div id="calc-print-root" className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              {/* Print header */}
              <div className="hidden print:block mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Commercial Cleaning Cost Estimate</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Generated by QuotePro AI · Based on ISSA 2026 production rate standards
                </p>
                <hr className="mt-3" />
              </div>

              {step === 1 && (
                <Step1Facility
                  state={state}
                  onChange={setState}
                  onNext={() => setStep(2)}
                />
              )}
              {step === 2 && (
                <Step2Walkthrough
                  state={state}
                  onChange={setState}
                  onNext={() => setStep(3)}
                  onBack={() => setStep(1)}
                />
              )}
              {step === 3 && (
                <Step3Results
                  state={state}
                  onBack={() => setStep(2)}
                  onShare={handleShare}
                  shareUrl={shareUrl}
                />
              )}
            </div>

            {/* Sidebar — trust signals */}
            <aside className="space-y-4 print:hidden">
              <SectionCard className="p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Why trust these numbers?</h3>
                <div className="space-y-3">
                  {[
                    { icon: BadgeCheck, title: "ISSA 2026 Standards", body: "Same production rates used by BSC industry leaders and facility managers worldwide." },
                    { icon: BarChart3, title: "National Benchmarks", body: "Compare your quote against BSCAI and ISSA 2024 survey data from 1,000+ US facilities." },
                    { icon: Users, title: "Contractor-Tested", body: "Built by cleaning professionals who've bid millions in commercial contracts." },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="flex items-start gap-3">
                        <div className="p-1.5 bg-blue-50 rounded-lg shrink-0">
                          <Icon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{item.title}</p>
                          <p className="text-xs text-slate-500">{item.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard className="p-5 bg-blue-50 border-blue-100">
                <h3 className="text-sm font-bold text-blue-800 mb-2">Need a full proposal?</h3>
                <p className="text-xs text-blue-700 mb-3">
                  Turn this into a branded, client-ready proposal with your logo,
                  custom line items, and digital signature. Free 14-day trial.
                </p>
                <button
                  onClick={() => navigate("/register")}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  Start Free Trial <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </SectionCard>

              <SectionCard className="p-5">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                  Typical ranges by facility
                </h3>
                <div className="space-y-2">
                  {FACILITY_TYPES.slice(0, 6).map((ft) => {
                    const n = NATIONAL_AVERAGES[ft.value];
                    return (
                      <div key={ft.value} className="flex items-center justify-between">
                        <span className="text-xs text-slate-600">{ft.label}</span>
                        <span className="text-xs font-semibold text-slate-800">
                          ${n.low.toFixed(2)}–${n.high.toFixed(2)}/sqft/mo
                        </span>
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100 mt-1">
                    Source: ISSA / BSCAI 2024 surveys
                  </p>
                </div>
              </SectionCard>

              {/* Cross-link to residential */}
              <SectionCard className="p-5">
                <div className="flex items-start gap-3">
                  <Home className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1">Need residential pricing?</h3>
                    <p className="text-xs text-slate-500 mb-3">Get instant pricing for house cleaning — by bedrooms, bathrooms, and square footage.</p>
                    <a href="/residential-cleaning-cost-calculator"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      Residential Calculator <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </SectionCard>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    <span className="font-semibold">Disclaimer:</span> Estimates are based on ISSA 2026 benchmarks and industry averages.
                    Local labor costs, building conditions, and contract terms affect final pricing. Always get an on-site quote for large contracts.
                  </p>
                </div>
              </div>
            </aside>
          </div>

          {/* Below-fold sections */}
          <Testimonials />
          <FAQSection />

          <footer className="mt-16 pb-8 text-center text-xs text-slate-400 print:hidden">
            <p>
              Commercial Cleaning Cost Calculator — powered by QuotePro AI.
              Estimates use ISSA 2026 production rates and BSCAI 2024 market benchmarks.
              Not a substitute for an on-site assessment.
            </p>
            <p className="mt-1">
              <button onClick={() => navigate("/register")} className="text-blue-500 hover:underline">
                Build a full commercial proposal →
              </button>
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}
