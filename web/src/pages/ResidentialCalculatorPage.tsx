/**
 * ResidentialCalculatorPage — public, no-auth route
 * /residential-cleaning-cost-calculator
 *
 * SEO-optimised 2-step wizard: Property Details → Instant Quote
 * Shareable via URL state (base64-encoded). PDF via window.print().
 */

import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  computeResidentialQuote,
  DEFAULT_PRICING,
  ADD_ON_OPTIONS,
  type ResidentialProperty,
} from "shared/pricingEngine";
import {
  Home,
  ChevronRight,
  ChevronLeft,
  Share2,
  Printer,
  ArrowRight,
  BadgeCheck,
  Copy,
  CheckCircle,
  ChevronDown,
  Sparkles,
  Building2,
  Star,
  Info,
  DollarSign,
  BarChart3,
} from "lucide-react";

// ─── National benchmarks (HomeAdvisor / Angi 2026 True Cost Guide) ────────────
const NATIONAL_BENCHMARKS: Record<string, { low: number; high: number; avg: number; source: string }> = {
  "1": { low: 75,  high: 110, avg: 92,  source: "HomeAdvisor 2026 True Cost Guide" },
  "2": { low: 100, high: 155, avg: 127, source: "HomeAdvisor 2026 True Cost Guide" },
  "3": { low: 130, high: 185, avg: 157, source: "Angi 2026 Cost Report" },
  "4": { low: 175, high: 250, avg: 212, source: "Angi 2026 Cost Report" },
  "5": { low: 220, high: 340, avg: 278, source: "HomeAdvisor 2026 True Cost Guide" },
};

function getBenchmarkKey(beds: number): string {
  return String(Math.min(5, Math.max(1, beds)));
}

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQ_DATA = [
  {
    q: "How much does house cleaning cost in 2026?",
    a: "The national average for professional house cleaning in 2026 is $116–$237 per visit for a standard clean, depending on home size, location, and service level. A 2-bedroom home averages $127/visit; a 4-bedroom averages $212/visit. First-time deep cleans typically cost 20–50% more than recurring maintenance cleans.",
  },
  {
    q: "How is the cleaning price calculated?",
    a: "This calculator uses a flat-rate model: a base rate per 1,000 sq ft, plus per-bedroom and per-bathroom adjustments. Condition, occupancy, and pet factors are applied as multipliers. Frequency discounts (weekly: 25%, biweekly: 15%, monthly: 10%) reflect the lower workload on pre-cleaned homes. The 3 tiers represent different service intensities: Good (surface clean), Better (standard), Best (deep clean).",
  },
  {
    q: "What is the difference between Good, Better, and Best cleaning?",
    a: "Good (Touch-Up) covers surfaces, floors, and quick bathroom refresh — ideal for already-clean homes. Better (Standard Clean) is a full room-by-room clean including counters, appliances, mirrors, and floors. Best (Deep Clean) adds inside appliances, interior cabinets, interior windows, blinds, baseboards, and detailed bathroom disinfection. First-time clients almost always need a Deep Clean.",
  },
  {
    q: "Does frequency affect the price?",
    a: "Yes. Recurring clients receive a significant discount because their homes need less work each visit. Weekly recurring cleans receive a 25% discount off the one-time rate, biweekly receives 15%, and monthly receives 10%. One-time cleans are priced at the full rate because they typically require more time.",
  },
  {
    q: "How does square footage affect cleaning costs?",
    a: "Square footage is the biggest driver of cleaning time and cost. A professional cleaner typically covers 800–1,200 sq ft per hour for a standard clean. Larger homes take proportionally longer. Our calculator uses the industry standard of approximately 40 minutes per 1,000 sq ft for a standard clean, scaling up to 75 minutes per 1,000 sq ft for move-in/out cleans.",
  },
  {
    q: "Can I share or save my estimate?",
    a: "Yes. After viewing your results, click 'Share Estimate' to copy a link that preserves your exact inputs. Anyone with the link sees the same pricing. You can also click 'Download PDF' to save or email a branded copy of your estimate with a QR code so recipients can recalculate.",
  },
  {
    q: "How do I get a professional quote for my clients?",
    a: "This calculator gives homeowners a ballpark estimate. Cleaning professionals can use QuotePro AI to create fully branded proposals with all 3 service tiers, custom add-ons, e-signature, and one-click email delivery — with a 14-day free trial, no credit card required.",
  },
];

// ─── Shareable state encoding ─────────────────────────────────────────────────
interface CalcState {
  beds: number;
  halfBaths: number;
  baths: number;
  sqft: number;
  homeType: string;
  conditionScore: number;
  peopleCount: number;
  petType: string;
  petShedding: boolean;
  frequency: string;
  addOns: Record<string, boolean>;
}

const DEFAULT_STATE: CalcState = {
  beds: 3, halfBaths: 0, baths: 2, sqft: 1500,
  homeType: "house", conditionScore: 7, peopleCount: 2,
  petType: "none", petShedding: false,
  frequency: "one-time",
  addOns: {},
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
    document.title = "Residential Cleaning Cost Calculator 2026 — Instant Price Estimate";
    const metas: [string, string, string][] = [
      ["name",     "description",    "Free residential house cleaning cost calculator for 2026. Get instant pricing for standard, deep, and move-in/out cleans — powered by HomeAdvisor & Angi benchmark data. No email required."],
      ["name",     "keywords",       "residential cleaning cost calculator, house cleaning prices 2026, how much does cleaning cost, maid service pricing, home cleaning estimate, cleaning cost per bedroom"],
      ["property", "og:title",       "Residential Cleaning Cost Calculator 2026"],
      ["property", "og:description", "Instant house cleaning prices by bedrooms, bathrooms, and square footage. Based on 2026 HomeAdvisor & Angi benchmark data. Free, no login required."],
      ["property", "og:type",        "website"],
      ["name",     "robots",         "index, follow"],
    ];
    const added: Element[] = [];
    metas.forEach(([k, v, content]) => {
      let el = document.querySelector(`meta[${k}="${v}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(k, v); document.head.appendChild(el); added.push(el); }
      el.setAttribute("content", content);
    });

    // JSON-LD FAQ schema
    const faqScript = document.createElement("script");
    faqScript.type = "application/ld+json";
    faqScript.id = "res-calc-faq-schema";
    faqScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_DATA.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
    document.head.appendChild(faqScript);

    // JSON-LD HowTo schema
    const howToScript = document.createElement("script");
    howToScript.type = "application/ld+json";
    howToScript.id = "res-calc-howto-schema";
    howToScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to Calculate Residential Cleaning Costs",
      description: "Use our free calculator to get an instant price estimate for professional house cleaning based on your home's size, condition, and cleaning frequency.",
      step: [
        { "@type": "HowToStep", name: "Enter property details", text: "Enter the number of bedrooms, bathrooms, and total square footage of your home." },
        { "@type": "HowToStep", name: "Select cleaning frequency", text: "Choose one-time, weekly, biweekly, or monthly service to see your recurring discount." },
        { "@type": "HowToStep", name: "Get your instant estimate", text: "See three service tier prices (Good, Better, Best) with cost breakdowns and national benchmark comparisons." },
      ],
    });
    document.head.appendChild(howToScript);

    return () => {
      document.title = prev;
      added.forEach((el) => el.remove());
      document.getElementById("res-calc-faq-schema")?.remove();
      document.getElementById("res-calc-howto-schema")?.remove();
    };
  }, []);
}

// ─── Print styles ─────────────────────────────────────────────────────────────
const PRINT_STYLE = `
  @media print {
    body > * { display: none !important; }
    #res-pdf-root { display: block !important; }
    #res-pdf-root, #res-pdf-root * { visibility: visible !important; }
    #res-pdf-root {
      position: fixed; top: 0; left: 0; width: 100%; background: white;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 32px; box-sizing: border-box; color: #0f172a;
    }
    @page { size: A4; margin: 0; }
  }
`;

// ─── Reusable UI atoms ────────────────────────────────────────────────────────
function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2].map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            n < current ? "bg-emerald-500 text-white" : n === current ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
          }`}>
            {n < current ? <CheckCircle className="w-4 h-4" /> : n}
          </div>
          <span className={`text-xs font-medium ${n === current ? "text-slate-800" : "text-slate-400"}`}>
            {n === 1 ? "Property" : "Your Estimate"}
          </span>
          {n < 2 && <ChevronRight className="w-4 h-4 text-slate-300" />}
        </div>
      ))}
    </div>
  );
}

function SpinCounter({ value, prefix = "$", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  return (
    <span className="tabular-nums">
      {prefix}{Math.round(value).toLocaleString()}{suffix}
    </span>
  );
}

// ─── Step 1: Property Details ─────────────────────────────────────────────────
function Step1Property({ state, onChange, onNext }: {
  state: CalcState;
  onChange: (s: CalcState) => void;
  onNext: () => void;
}) {
  const set = (key: keyof CalcState, value: any) => onChange({ ...state, [key]: value });
  const valid = state.beds > 0 && state.baths > 0;

  return (
    <div className="space-y-6">
      <Stepper current={1} />
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Enter your property details</h2>
        <p className="text-sm text-slate-500">Get an instant estimate based on your home's size and condition.</p>
      </div>

      {/* Bedrooms & Bathrooms */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Bedrooms</label>
          <div className="flex gap-1">
            {[1,2,3,4,5].map((n) => (
              <button key={n} onClick={() => set("beds", n)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-colors ${state.beds === n ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:border-blue-400"}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Full Baths</label>
          <div className="flex gap-1">
            {[1,2,3,4].map((n) => (
              <button key={n} onClick={() => set("baths", n)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-colors ${state.baths === n ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:border-blue-400"}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">Half Baths</label>
          <div className="flex gap-1">
            {[0,1,2].map((n) => (
              <button key={n} onClick={() => set("halfBaths", n)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-colors ${state.halfBaths === n ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:border-blue-400"}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Square Footage */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-2">
          Square Footage <span className="font-normal text-slate-400">(interior living area)</span>
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number" min={200} max={10000} step={50}
            value={state.sqft || ""}
            onChange={(e) => set("sqft", parseInt(e.target.value) || 0)}
            placeholder="e.g. 1,500"
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-slate-400 shrink-0">sq ft</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {[[800,"Small"],[1200,"Medium"],[1800,"Large"],[2500,"XL"],[3500,"Estate"]].map(([v, label]) => (
            <button key={v} onClick={() => set("sqft", v)}
              className="text-xs px-3 py-1 rounded-full border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
              {label} ({Number(v).toLocaleString()})
            </button>
          ))}
        </div>
      </div>

      {/* Frequency */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-2">Cleaning Frequency</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { value: "one-time", label: "One-Time", discount: null },
            { value: "weekly", label: "Weekly", discount: "25% off" },
            { value: "biweekly", label: "Biweekly", discount: "15% off" },
            { value: "monthly", label: "Monthly", discount: "10% off" },
          ].map((opt) => (
            <button key={opt.value} onClick={() => set("frequency", opt.value)}
              className={`py-2.5 px-3 rounded-xl border text-sm font-medium text-center transition-colors ${
                state.frequency === opt.value ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-blue-400"
              }`}>
              <div>{opt.label}</div>
              {opt.discount && <div className={`text-[10px] mt-0.5 font-semibold ${state.frequency === opt.value ? "text-blue-200" : "text-emerald-600"}`}>{opt.discount}</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Home condition */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Home Condition</label>
        <p className="text-xs text-slate-400 mb-2">1 = Needs significant work · 10 = Just cleaned</p>
        <div className="flex items-center gap-3">
          <input type="range" min={1} max={10} step={1} value={state.conditionScore}
            onChange={(e) => set("conditionScore", parseInt(e.target.value))}
            className="flex-1 accent-blue-600" />
          <span className={`text-sm font-bold w-8 text-center ${state.conditionScore >= 8 ? "text-emerald-600" : state.conditionScore >= 5 ? "text-amber-600" : "text-red-600"}`}>
            {state.conditionScore}/10
          </span>
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>Heavily soiled (+70%)</span>
          <span>Standard</span>
          <span>Very clean (−10%)</span>
        </div>
      </div>

      {/* Pets */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-2">Pets</label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "none", label: "No Pets" },
            { value: "cat", label: "Cat" },
            { value: "dog", label: "Dog" },
            { value: "multiple", label: "Multiple Pets" },
          ].map((opt) => (
            <button key={opt.value} onClick={() => set("petType", opt.value)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                state.petType === opt.value ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-blue-400"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
        {state.petType !== "none" && (
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input type="checkbox" checked={state.petShedding} onChange={(e) => set("petShedding", e.target.checked)}
              className="rounded accent-blue-600" />
            <span className="text-sm text-slate-600">Heavy shedder (+time)</span>
          </label>
        )}
      </div>

      {/* Residents */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-2">People in Household</label>
        <div className="flex gap-2">
          {[1,2,3,4,5].map((n) => (
            <button key={n} onClick={() => set("peopleCount", n)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-colors ${state.peopleCount === n ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:border-blue-400"}`}>
              {n}{n === 5 ? "+" : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Optional add-ons */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-2">Add-On Services <span className="text-slate-400 font-normal">(optional)</span></label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ADD_ON_OPTIONS.map((opt) => (
            <label key={opt.key} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
              state.addOns[opt.key] ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300"
            }`}>
              <input type="checkbox" checked={!!state.addOns[opt.key]}
                onChange={(e) => set("addOns", { ...state.addOns, [opt.key]: e.target.checked })}
                className="rounded accent-blue-600 shrink-0" />
              <span className="text-xs text-slate-700 leading-tight">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={onNext}
        disabled={!valid}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-colors text-base shadow-md"
      >
        Get My Instant Estimate <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// ─── Step 2: Results ──────────────────────────────────────────────────────────
function Step2Results({ state, shareUrl, onBack }: {
  state: CalcState;
  shareUrl: string;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const property: ResidentialProperty = {
    beds: state.beds,
    halfBaths: state.halfBaths,
    baths: state.baths,
    sqft: state.sqft,
    homeType: state.homeType,
    conditionScore: state.conditionScore,
    peopleCount: state.peopleCount,
    petType: state.petType,
    petShedding: state.petShedding,
  };

  const result = useMemo(
    () => computeResidentialQuote(property, state.addOns, state.frequency, DEFAULT_PRICING),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(state)],
  );

  const bm = NATIONAL_BENCHMARKS[getBenchmarkKey(state.beds)];
  const freq = state.frequency === "one-time" ? "one-time" : state.frequency;
  const freqLabel = { "one-time": "One-Time", weekly: "Weekly Recurring", biweekly: "Biweekly Recurring", monthly: "Monthly Recurring" }[freq] ?? freq;
  const hasAddOns = Object.values(state.addOns).some(Boolean);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const el = document.getElementById("res-pdf-root");
    if (el) el.style.display = "block";
    window.print();
    if (el) el.style.display = "none";
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(shareUrl)}&bgcolor=ffffff&color=1e293b&margin=4`;

  const tiers = [
    { result: result.good,   label: "Good", sublabel: "Touch-Up",       color: "border-slate-300 bg-white", badge: "" },
    { result: result.better, label: "Better", sublabel: "Standard Clean", color: "border-blue-400 bg-blue-50 ring-2 ring-blue-500/30", badge: "Most Popular" },
    { result: result.best,   label: "Best",  sublabel: "Deep Clean",     color: "border-violet-300 bg-violet-50", badge: "" },
  ];

  return (
    <div className="space-y-6">
      <Stepper current={2} />

      {/* Summary strip */}
      <div className="bg-slate-50 rounded-xl px-4 py-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
        <span><strong>{state.beds}BR / {state.baths}BA</strong></span>
        {state.sqft > 0 && <span>{state.sqft.toLocaleString()} sq ft</span>}
        <span>{freqLabel}</span>
        {state.petType !== "none" && <span>Pets: {state.petType}</span>}
      </div>

      {/* 3 tier cards */}
      <div className="grid grid-cols-3 gap-3">
        {tiers.map(({ result: r, label, sublabel, color, badge }) => (
          <div key={label} className={`relative rounded-2xl border p-4 ${color}`}>
            {badge && (
              <div className="absolute -top-2.5 left-0 right-0 flex justify-center">
                <span className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">{badge}</span>
              </div>
            )}
            <div className="text-xs font-bold text-slate-500 mb-0.5">{label}</div>
            <div className="text-[10px] text-slate-400 mb-2">{sublabel}</div>
            <div className="text-2xl font-black text-slate-900 leading-none">
              <SpinCounter value={r.price} />
            </div>
            <div className="text-[10px] text-slate-400 mt-1">per {freq === "one-time" ? "clean" : "visit"}</div>
            {r.firstCleanPrice && (
              <div className="text-[10px] text-slate-500 mt-1.5 border-t border-slate-200 pt-1.5">
                1st clean: <strong>${r.firstCleanPrice}</strong>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* National benchmark comparison */}
      {bm && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <BarChart3 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800 mb-1">National Market Comparison — {state.beds}-Bedroom Home</p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-center">
                  <div className="text-xs text-emerald-600 font-medium">Market Low</div>
                  <div className="text-lg font-black text-emerald-900">${bm.low}</div>
                </div>
                <div className="h-8 w-px bg-emerald-200" />
                <div className="text-center">
                  <div className="text-xs text-emerald-600 font-medium">National Avg</div>
                  <div className="text-lg font-black text-emerald-900">${bm.avg}</div>
                </div>
                <div className="h-8 w-px bg-emerald-200" />
                <div className="text-center">
                  <div className="text-xs text-emerald-600 font-medium">Market High</div>
                  <div className="text-lg font-black text-emerald-900">${bm.high}</div>
                </div>
                <div className="h-8 w-px bg-emerald-200" />
                <div className="text-center">
                  <div className="text-xs text-emerald-600 font-medium">Your Better</div>
                  <div className={`text-lg font-black ${result.better.price <= bm.avg ? "text-blue-700" : "text-amber-700"}`}>
                    ${result.better.price}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-emerald-600 mt-2">Source: {bm.source} — one-time standard clean pricing for similar-sized homes.</p>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown for Better tier */}
      <details className="group">
        <summary className="flex items-center justify-between cursor-pointer text-sm font-semibold text-slate-700 py-2 border-t border-slate-100 select-none">
          <span>See pricing breakdown (Better / Standard)</span>
          <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
        </summary>
        <div className="pt-3 space-y-1.5">
          {result.better.lineItems.map((item, i) => (
            <div key={i} className="flex justify-between text-sm text-slate-600">
              <span>{item.label}</span>
              <span className={`font-semibold ${item.amount < 0 ? "text-emerald-700" : "text-slate-800"}`}>
                {item.amount < 0 ? "−" : "+"}${Math.abs(Math.round(item.amount)).toLocaleString()}
              </span>
            </div>
          ))}
          {hasAddOns && (
            <div className="flex justify-between text-sm text-blue-700 font-medium pt-1 border-t border-slate-100">
              <span>Add-on services</span>
              <span>+${result.addOnPrice}</span>
            </div>
          )}
          {result.better.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      </details>

      {/* Labor estimate */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl text-xs text-slate-500">
        <Home className="w-3.5 h-3.5 shrink-0" />
        <span>
          Estimated labor: <strong>{result.baseHours + result.addOnHours}h</strong> for a {state.sqft > 0 ? `${state.sqft.toLocaleString()} sq ft home` : "home this size"}.
          {" "}Based on ISSA 2026 production rates at $45/hr.
        </span>
      </div>

      {/* Actions: Share & Print */}
      <div className="flex gap-3">
        <button onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700 transition-colors">
          {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied!" : "Share Estimate"}
        </button>
        <button onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700 transition-colors">
          <Printer className="w-4 h-4" />
          Download PDF
        </button>
      </div>
      <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
        <Share2 className="w-3 h-3" />
        PDF includes QR code so recipients can recalculate with their own inputs
      </p>

      {/* CTA — Get Full Pro Proposal */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-blue-500 rounded-xl shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2.5 py-1 rounded-full mb-2">
              <Star className="w-3 h-3" /> 14-DAY FREE TRIAL — NO CREDIT CARD
            </div>
            <h3 className="font-bold text-base mb-2">Turn This Into a Professional Client Proposal</h3>
            <ul className="space-y-1 mb-4">
              {[
                "Branded PDF with your logo, photo, and contact info",
                "All 3 tiers with custom add-on line items",
                "One-click email delivery with digital acceptance",
                "Auto-follow-up reminders and conversion tracking",
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

      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Recalculate with different inputs
      </button>

      {/* Branded PDF (hidden on screen) */}
      <div id="res-pdf-root" style={{ display: "none", fontFamily: "system-ui, -apple-system, sans-serif", color: "#0f172a" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, borderBottom: "2px solid #2563eb", paddingBottom: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#2563eb", letterSpacing: -0.5 }}>QuotePro AI</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>Residential Cleaning Cost Estimate</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
              Generated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              {" · "}Based on 2026 ISSA Production Rate Standards
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <img src={qrUrl} alt="Scan to recalculate" style={{ width: 72, height: 72, display: "block" }} />
            <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 3 }}>Scan to recalculate</div>
          </div>
        </div>

        {/* Property summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Bedrooms", value: `${state.beds} bed` },
            { label: "Bathrooms", value: `${state.baths} full, ${state.halfBaths} half` },
            { label: "Square Footage", value: state.sqft > 0 ? `${state.sqft.toLocaleString()} sq ft` : "Not provided" },
            { label: "Frequency", value: freqLabel },
          ].map((item) => (
            <div key={item.label} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* 3 tiers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {tiers.map(({ result: r, label, sublabel }) => (
            <div key={label} style={{ background: label === "Better" ? "#eff6ff" : "#f8fafc", borderRadius: 10, padding: "14px 16px", border: label === "Better" ? "2px solid #3b82f6" : "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 8 }}>{sublabel}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: label === "Better" ? "#1d4ed8" : "#0f172a" }}>
                ${r.price.toLocaleString()}
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>per {freq === "one-time" ? "clean" : "visit"}</div>
              {r.firstCleanPrice && (
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 6, paddingTop: 6, borderTop: "1px solid #e2e8f0" }}>
                  1st clean: ${r.firstCleanPrice}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* National benchmark */}
        {bm && (
          <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "14px 16px", border: "1px solid #bbf7d0", marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", marginBottom: 8 }}>
              National Market Comparison — {state.beds}-Bedroom Home (HomeAdvisor/Angi 2026)
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              {[["Market Low", `$${bm.low}`], ["National Average", `$${bm.avg}`], ["Market High", `$${bm.high}`], ["Your Estimate (Better)", `$${result.better.price}`]].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: "#166534", fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#15803d" }}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, fontSize: 10, color: "#94a3b8", lineHeight: 1.5 }}>
          This estimate is for budgeting purposes only. Final prices depend on actual home condition, local labor rates, and additional services. Scan the QR code to recalculate or visit quotepro.ai for a professional branded proposal.
        </div>
      </div>
    </div>
  );
}

// ─── FAQ Section ──────────────────────────────────────────────────────────────
function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div className="mt-12 print:hidden">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Frequently Asked Questions</h2>
      <p className="text-sm text-slate-500 mb-6">Everything you need to know about residential cleaning costs in 2026.</p>
      <div className="space-y-2">
        {FAQ_DATA.map((faq, i) => (
          <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <button
              className="w-full text-left flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
            >
              <span className="font-semibold text-sm text-slate-800">{faq.q}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-3 transition-transform ${openIdx === i ? "rotate-180" : ""}`} />
            </button>
            {openIdx === i && (
              <div className="px-5 pb-4">
                <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar() {
  const navigate = useNavigate();
  return (
    <div className="space-y-4 print:hidden">
      {/* Trust badges */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Why trust this calculator?</h3>
        <div className="space-y-3">
          {[
            { icon: BadgeCheck, text: "ISSA 2026 production rate standards", color: "text-blue-600" },
            { icon: DollarSign, text: "HomeAdvisor & Angi 2026 benchmark data", color: "text-emerald-600" },
            { icon: Home, text: "Covers all home types and configurations", color: "text-violet-600" },
            { icon: Star, text: "Used by 1,000+ cleaning professionals", color: "text-amber-600" },
          ].map(({ icon: Icon, text, color }) => (
            <div key={text} className="flex items-start gap-3">
              <Icon className={`w-4 h-4 ${color} shrink-0 mt-0.5`} />
              <span className="text-xs text-slate-600 leading-tight">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pro CTA sidebar */}
      <div className="bg-gradient-to-b from-blue-700 to-blue-800 text-white rounded-2xl p-5">
        <p className="text-xs font-bold text-blue-300 uppercase tracking-wide mb-1">For Cleaning Pros</p>
        <h3 className="font-bold text-base mb-2">Send Branded Proposals in 60 Seconds</h3>
        <p className="text-xs text-blue-200 mb-4 leading-relaxed">
          Turn this estimate into a client-ready proposal with your logo, 3 service tiers, e-signature, and one-click delivery.
        </p>
        <button
          onClick={() => navigate("/register")}
          className="w-full bg-white text-blue-700 font-bold py-2.5 rounded-xl text-sm hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
        >
          Start Free Trial <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-[10px] text-blue-300 text-center mt-2">14 days free · No credit card required</p>
      </div>

      {/* Commercial CTA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Building2 className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">Need commercial pricing?</h3>
            <p className="text-xs text-slate-500 mb-3">Get ISSA-benchmarked quotes for offices, medical facilities, gyms, schools, and warehouses.</p>
            <a href="/commercial-cleaning-calculator"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Commercial Calculator <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Typical pricing reference */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3">2026 Average Cleaning Prices</h3>
        <div className="space-y-2">
          {[
            ["1 Bedroom", "$75–$110"],
            ["2 Bedrooms", "$100–$155"],
            ["3 Bedrooms", "$130–$185"],
            ["4 Bedrooms", "$175–$250"],
            ["5+ Bedrooms", "$220–$340"],
          ].map(([size, price]) => (
            <div key={size} className="flex justify-between text-xs">
              <span className="text-slate-600">{size}</span>
              <span className="font-semibold text-slate-800">{price}</span>
            </div>
          ))}
          <p className="text-[10px] text-slate-400 mt-2">Source: HomeAdvisor 2026 True Cost Guide. Standard clean, one-time pricing.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ResidentialCalculatorPage() {
  useSEO();
  const [step, setStep] = useState(1);
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState<CalcState>(() => {
    const q = params.get("q");
    if (q) { const decoded = decodeState(q); if (decoded) return decoded; }
    return DEFAULT_STATE;
  });

  const shareUrl = useMemo(() => {
    const base = `${window.location.origin}/residential-cleaning-cost-calculator`;
    const encoded = encodeState(state);
    return encoded ? `${base}?q=${encoded}` : base;
  }, [state]);

  useEffect(() => {
    if (step === 2) {
      const encoded = encodeState(state);
      if (encoded) setParams({ q: encoded }, { replace: true });
    } else {
      setParams({}, { replace: true });
    }
  }, [step, state]);

  useEffect(() => {
    const q = params.get("q");
    if (q && decodeState(q)) {
      setState(decodeState(q)!);
      setStep(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <style>{PRINT_STYLE}</style>
      <div className="min-h-screen bg-slate-50">
        {/* Hero header */}
        <div className="bg-gradient-to-b from-blue-700 to-blue-600 text-white print:hidden">
          <div className="max-w-5xl mx-auto px-4 pt-10 pb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">FREE TOOL</span>
              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">NO LOGIN REQUIRED</span>
              <span className="bg-emerald-500/80 text-white text-xs font-bold px-3 py-1 rounded-full">UPDATED 2026</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 leading-tight">
              Residential Cleaning Cost<br />Calculator 2026
            </h1>
            <p className="text-blue-100 text-base sm:text-lg max-w-2xl">
              Get an instant, benchmark-verified cleaning price for your home — by bedrooms, bathrooms,
              square footage, and frequency. No email required.
            </p>
            <div className="flex flex-wrap gap-4 mt-5">
              {[
                ["Good / Better / Best", "3 service tiers"],
                ["HomeAdvisor 2026", "National benchmark data"],
                ["Shareable Link + PDF", "Send to clients instantly"],
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
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Calculator wizard */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              {step === 1 && (
                <Step1Property state={state} onChange={setState} onNext={() => setStep(2)} />
              )}
              {step === 2 && (
                <Step2Results state={state} shareUrl={shareUrl} onBack={() => setStep(1)} />
              )}
            </div>

            {/* Sidebar */}
            <Sidebar />
          </div>

          {/* FAQ */}
          <FAQSection />

          {/* Bottom cross-link */}
          <div className="mt-8 border-t border-slate-200 pt-8 text-center print:hidden">
            <p className="text-sm text-slate-500 mb-3">Need pricing for a commercial facility?</p>
            <a href="/commercial-cleaning-calculator"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800">
              <Building2 className="w-4 h-4" />
              Commercial Cleaning Cost Calculator →
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
