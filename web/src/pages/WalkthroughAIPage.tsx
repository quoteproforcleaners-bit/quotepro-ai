import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiPost } from "../lib/api";
import { queryClient } from "../lib/queryClient";
import {
  Wand2, FileText, ArrowRight, Sparkles, Home,
  PawPrint, AlertCircle, CheckCircle2, Info, Lightbulb, RotateCcw,
  X, RefreshCw, Edit3, DollarSign,
} from "lucide-react";
import { PageHeader, Card, CardHeader, Button, Alert } from "../components/ui";
import { useSubscription } from "../lib/subscription";
import { WebAIConsentGate } from "../components/WebAIConsentGate";
import {
  computeResidentialQuote,
  ADD_ON_OPTIONS,
  DEFAULT_PRICING,
  type PricingSettings,
} from "shared/pricingEngine";

/* ─── Constants ──────────────────────────────────────────────────────────── */

const EXAMPLE_CHIPS = [
  "3 bed 2 bath house, first-time deep clean, 1 dog that sheds, kitchen is greasy.",
  "Move-out clean for 2 bed condo, needs inside oven and fridge, very dirty.",
  "Customer wants biweekly standard clean, 4 bed 2.5 bath, 2 cats, quote by Thursday.",
  "1800 sqft townhouse, recurring monthly, moderate condition, no pets.",
  "Airbnb turnover clean, same-day turnaround, lots of laundry.",
];

const LOADING_STAGES = [
  "Reading your notes...",
  "Extracting property details...",
  "Identifying service requirements...",
  "Building quote assumptions...",
];

// Normalize add-on strings from AI into known ADD_ON_OPTIONS keys
const ADDON_LABEL_TO_KEY: Record<string, string> = {
  "inside oven":         "insideOven",
  "oven":                "insideOven",
  "clean oven":          "insideOven",
  "inside fridge":       "insideFridge",
  "fridge":              "insideFridge",
  "refrigerator":        "insideFridge",
  "inside refrigerator": "insideFridge",
  "inside cabinets":     "insideCabinets",
  "cabinets":            "insideCabinets",
  "interior windows":    "interiorWindows",
  "windows":             "interiorWindows",
  "window cleaning":     "interiorWindows",
  "blinds":              "blindsDetail",
  "blinds detail":       "blindsDetail",
  "baseboards":          "baseboardsDetail",
  "baseboards detail":   "baseboardsDetail",
  "baseboard detail":    "baseboardsDetail",
  "laundry":             "laundryFoldOnly",
  "fold laundry":        "laundryFoldOnly",
  "laundry fold":        "laundryFoldOnly",
  "dishes":              "dishes",
  "organizing":          "organizationTidy",
  "organization":        "organizationTidy",
  "organize":            "organizationTidy",
  "pet hair":            "organizationTidy",
  "pet hair treatment":  "organizationTidy",
};

function normalizeAddonKey(raw: string): string | null {
  const lower = raw.toLowerCase().trim();
  if (ADDON_LABEL_TO_KEY[lower]) return ADDON_LABEL_TO_KEY[lower];
  // Try partial match
  for (const [label, key] of Object.entries(ADDON_LABEL_TO_KEY)) {
    if (lower.includes(label) || label.includes(lower)) return key;
  }
  // Try matching against ADD_ON_OPTIONS keys/labels directly
  for (const opt of ADD_ON_OPTIONS) {
    if (lower.includes(opt.label.toLowerCase()) || opt.label.toLowerCase().includes(lower)) {
      return opt.key;
    }
  }
  return null;
}

// Map AI frequency output → pricing engine frequency
function normalizeFrequency(raw: string | null): string {
  if (!raw) return "one-time";
  const map: Record<string, string> = {
    "one-time": "one-time",
    "weekly": "weekly",
    "bi-weekly": "biweekly",
    "biweekly": "biweekly",
    "monthly": "monthly",
  };
  return map[raw] ?? "one-time";
}

// Map condition level → condition score (lower = dirtier)
function conditionLevelToScore(level: string | null): number {
  const map: Record<string, number> = {
    extreme: 2,
    heavy:   4,
    moderate: 6,
    light:   8,
  };
  return level ? (map[level] ?? 6) : 6;
}

/* ─── Review data shape ──────────────────────────────────────────────────── */

interface ReviewData {
  customerName: string;
  address: string;
  propertyType: string;
  beds: number;
  baths: number;
  halfBaths: number;
  sqft: number;
  occupants: number;
  conditionLevel: string;
  frequency: string;
  petType: string;
  petShedding: boolean;
  addOns: Record<string, boolean>;   // key → selected
  serviceNotes: string;
}

function buildReviewData(f: any, addOnKeys: string[]): ReviewData {
  const rawAddOns: string[] = Array.isArray(f.addOns) ? f.addOns : [];
  const addOnsMap: Record<string, boolean> = Object.fromEntries(addOnKeys.map(k => [k, false]));
  for (const a of rawAddOns) {
    const k = normalizeAddonKey(a);
    if (k && k in addOnsMap) addOnsMap[k] = true;
  }
  return {
    customerName: f.customerName || "",
    address: f.address || "",
    propertyType: f.propertyType || "house",
    beds: f.bedrooms ?? 3,
    baths: f.bathrooms ?? 2,
    halfBaths: f.halfBaths ?? 0,
    sqft: f.sqft ?? 1500,
    occupants: f.occupants ?? 2,
    conditionLevel: f.conditionLevel || "moderate",
    frequency: normalizeFrequency(f.frequency),
    petType: f.petType || "none",
    petShedding: f.petShedding || false,
    addOns: addOnsMap,
    serviceNotes: f.serviceNotes || "",
  };
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function LoadingPanel({ stage }: { stage: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center">
        <RefreshCw className="w-7 h-7 text-primary-500 animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-800 mb-1">
          {LOADING_STAGES[stage] || "Analyzing notes..."}
        </p>
        <p className="text-xs text-slate-400">This usually takes a few seconds</p>
      </div>
      <div className="flex gap-1.5">
        {LOADING_STAGES.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i <= stage ? "bg-primary-500 w-6" : "bg-slate-200 w-1.5"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function FieldInput({
  label, value, onChange, type = "text", options,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  options?: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</label>
      {options ? (
        <select
          value={String(value)}
          onChange={e => onChange(e.target.value)}
          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
        />
      )}
    </div>
  );
}

function PricingPreview({ review, pricingSettings }: { review: ReviewData; pricingSettings: PricingSettings | null }) {
  const quote = useMemo(() => {
    const property = {
      beds: Number(review.beds) || 0,
      baths: Number(review.baths) || 0,
      halfBaths: Number(review.halfBaths) || 0,
      sqft: Number(review.sqft) || 0,
      homeType: review.propertyType,
      conditionScore: conditionLevelToScore(review.conditionLevel),
      peopleCount: Number(review.occupants) || 1,
      petType: review.petType,
      petShedding: review.petShedding,
    };
    const addOnsBool = Object.fromEntries(Object.entries(review.addOns).map(([k, v]) => [k, Boolean(v)]));
    return computeResidentialQuote(property, addOnsBool, review.frequency, pricingSettings ?? null);
  }, [review, pricingSettings]);

  const isRecurring = review.frequency !== "one-time";

  return (
    <div className="rounded-xl border border-primary-100 bg-primary-50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-primary-100">
        <DollarSign className="w-4 h-4 text-primary-600" />
        <span className="text-sm font-semibold text-primary-800">Estimated Pricing</span>
        {isRecurring && (
          <span className="ml-auto text-[10px] font-semibold text-primary-600 uppercase tracking-wide bg-primary-100 px-2 py-0.5 rounded-full">
            {review.frequency}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 divide-x divide-primary-100">
        {[
          { label: "Good", tier: quote.good },
          { label: "Better", tier: quote.better },
          { label: "Best", tier: quote.best },
        ].map(({ label, tier }) => (
          <div key={label} className="px-3 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-500 mb-1">{label}</p>
            <p className="text-lg font-bold text-primary-900">${tier.price.toFixed(0)}</p>
            {isRecurring && tier.firstCleanPrice ? (
              <p className="text-[10px] text-primary-500 mt-0.5">First: ${tier.firstCleanPrice.toFixed(0)}</p>
            ) : null}
            <p className="text-[10px] text-primary-500 mt-0.5 truncate">{tier.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewPanel({
  extracted,
  review,
  onReviewChange,
  onCreateQuote,
  creating,
  pricingSettings,
}: {
  extracted: any;
  review: ReviewData;
  onReviewChange: (r: ReviewData) => void;
  onCreateQuote: () => void;
  creating: boolean;
  pricingSettings: PricingSettings | null;
}) {
  const missingFields: string[] = extracted?.missingFields || [];
  const recommendations: string[] = extracted?.recommendations || [];
  const assumptions: string[] = extracted?.assumptions || [];
  const confidence: string = extracted?.confidence || "low";
  const serviceReasoning: string = extracted?.serviceReasoning || "";

  const confidenceMap: Record<string, { label: string; cls: string }> = {
    high:   { label: "High confidence",   cls: "bg-emerald-100 text-emerald-700" },
    medium: { label: "Medium confidence", cls: "bg-amber-100 text-amber-700" },
    low:    { label: "Low confidence",    cls: "bg-slate-100 text-slate-500" },
  };
  const conf = confidenceMap[confidence] || confidenceMap.low;

  const set = (key: keyof ReviewData, val: any) => onReviewChange({ ...review, [key]: val });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Review & Edit Details</h3>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${conf.cls}`}>{conf.label}</span>
      </div>

      {serviceReasoning ? (
        <div className="rounded-lg bg-primary-50 border border-primary-100 px-4 py-3">
          <p className="text-sm text-primary-700">{serviceReasoning}</p>
        </div>
      ) : null}

      {/* Property Details */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-blue-50 text-blue-700">
          <Home className="w-4 h-4" />
          <span className="text-sm font-semibold">Property Details</span>
          <Edit3 className="w-3.5 h-3.5 ml-auto opacity-50" />
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          <FieldInput label="Customer Name" value={review.customerName} onChange={v => set("customerName", v)} />
          <FieldInput
            label="Home Type"
            value={review.propertyType}
            onChange={v => set("propertyType", v)}
            options={[
              { value: "house", label: "House" },
              { value: "apartment", label: "Apartment" },
              { value: "condo", label: "Condo" },
              { value: "townhouse", label: "Townhouse" },
            ]}
          />
          <FieldInput label="Bedrooms" value={review.beds} onChange={v => set("beds", Number(v) || 0)} type="number" />
          <FieldInput label="Full Baths" value={review.baths} onChange={v => set("baths", Number(v) || 0)} type="number" />
          <FieldInput label="Half Baths" value={review.halfBaths} onChange={v => set("halfBaths", Number(v) || 0)} type="number" />
          <FieldInput label="Sq Footage" value={review.sqft} onChange={v => set("sqft", Number(v) || 0)} type="number" />
          <FieldInput label="Residents" value={review.occupants} onChange={v => set("occupants", Number(v) || 1)} type="number" />
          <FieldInput
            label="Condition"
            value={review.conditionLevel}
            onChange={v => set("conditionLevel", v)}
            options={[
              { value: "light", label: "Light — Pretty clean" },
              { value: "moderate", label: "Moderate — Average" },
              { value: "heavy", label: "Heavy — Very dirty" },
              { value: "extreme", label: "Extreme — Neglected" },
            ]}
          />
          <div className="col-span-2">
            <FieldInput label="Address (optional)" value={review.address} onChange={v => set("address", v)} />
          </div>
        </div>
      </div>

      {/* Service Details */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-purple-50 text-purple-700">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold">Service Details</span>
          <Edit3 className="w-3.5 h-3.5 ml-auto opacity-50" />
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          <FieldInput
            label="Frequency"
            value={review.frequency}
            onChange={v => set("frequency", v)}
            options={[
              { value: "one-time", label: "One-time" },
              { value: "weekly", label: "Weekly" },
              { value: "biweekly", label: "Bi-weekly" },
              { value: "monthly", label: "Monthly" },
            ]}
          />
          <FieldInput
            label="Pets"
            value={review.petType}
            onChange={v => set("petType", v)}
            options={[
              { value: "none", label: "No pets" },
              { value: "dog", label: "Dog" },
              { value: "cat", label: "Cat" },
              { value: "both", label: "Dog & Cat" },
              { value: "other", label: "Other" },
            ]}
          />
          {review.petType !== "none" ? (
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="petShedding"
                checked={review.petShedding}
                onChange={e => set("petShedding", e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-400"
              />
              <label htmlFor="petShedding" className="text-sm text-slate-600 cursor-pointer">Pet sheds heavily</label>
            </div>
          ) : null}
        </div>
      </div>

      {/* Add-ons */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-sm font-semibold">Add-Ons</span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2">
            {ADD_ON_OPTIONS.map(opt => (
              <label key={opt.key} className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!review.addOns[opt.key]}
                  onChange={e => set("addOns", { ...review.addOns, [opt.key]: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-primary-500 focus:ring-primary-400"
                />
                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing preview */}
      <PricingPreview review={review} pricingSettings={pricingSettings} />

      {/* Missing fields */}
      {missingFields.length > 0 ? (
        <div className="rounded-xl border border-orange-100 bg-orange-50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-orange-100 text-orange-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-semibold">AI Flagged as Missing</span>
          </div>
          <ul className="px-4 py-3 space-y-1.5">
            {missingFields.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                {m}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-400 px-4 pb-3">Edit the fields above before creating the quote.</p>
        </div>
      ) : null}

      {/* Recommendations */}
      {recommendations.length > 0 ? (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-indigo-100 text-indigo-700">
            <Lightbulb className="w-4 h-4" />
            <span className="text-sm font-semibold">Recommendations</span>
          </div>
          <ul className="px-4 py-3 space-y-2">
            {recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Assumptions */}
      {assumptions.length > 0 ? (
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">AI Assumptions</p>
          <ul className="space-y-1">
            {assumptions.map((a, i) => (
              <li key={i} className="text-xs text-slate-500 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Button icon={ArrowRight} onClick={onCreateQuote} loading={creating} className="w-full">
        Create Quote Draft
      </Button>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

export default function WalkthroughAIPage() {
  const navigate = useNavigate();
  const { tier } = useSubscription();
  const isGrowth = tier === "growth" || tier === "pro";

  const [notes, setNotes] = useState("");
  const [extracted, setExtracted] = useState<any>(null);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState("");

  const { data: pricingRaw } = useQuery<any>({ queryKey: ["/api/pricing"] });
  const pricingSettings: PricingSettings | null = pricingRaw
    ? { ...DEFAULT_PRICING, ...pricingRaw }
    : null;

  const addOnKeys = ADD_ON_OPTIONS.map(o => o.key);

  const stageIntervalRef: { current: ReturnType<typeof setInterval> | null } = { current: null };

  const extractDetails = async () => {
    if (!notes.trim()) return;
    setExtracting(true);
    setError("");
    setExtracted(null);
    setReview(null);
    setLoadingStage(0);

    stageIntervalRef.current = setInterval(() => {
      setLoadingStage(s => Math.min(s + 1, LOADING_STAGES.length - 1));
    }, 1200);

    try {
      const res = await apiPost("/api/ai/walkthrough-extract", { description: notes.trim() }) as any;
      setExtracted(res);
      setReview(buildReviewData(res.extractedFields || {}, addOnKeys));
    } catch (err: any) {
      setError(err.message || "Failed to extract details. Please try again.");
    } finally {
      if (stageIntervalRef.current) clearInterval(stageIntervalRef.current);
      setExtracting(false);
    }
  };

  const createQuoteMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/quotes", data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      navigate(`/quotes/${data.id}`);
    },
  });

  const createQuoteFromReview = () => {
    if (!review) return;

    const property = {
      beds:          Number(review.beds)      || 0,
      baths:         Number(review.baths)     || 0,
      halfBaths:     Number(review.halfBaths) || 0,
      sqft:          Number(review.sqft)      || 0,
      homeType:      review.propertyType || "house",
      conditionScore: conditionLevelToScore(review.conditionLevel),
      peopleCount:   Number(review.occupants) || 1,
      petType:       review.petType || "none",
      petShedding:   review.petShedding || false,
    };

    const addOnsBool = Object.fromEntries(
      Object.entries(review.addOns).map(([k, v]) => [k, Boolean(v)])
    );

    const freq = review.frequency || "one-time";
    const quote = computeResidentialQuote(property, addOnsBool, freq, pricingSettings ?? null);

    // Build the addOns map with prices (format expected by the API)
    const ps = pricingSettings ?? DEFAULT_PRICING;
    const addOnPrices = ps.addOnPrices ?? {};
    const addOnsForApi = Object.fromEntries(
      ADD_ON_OPTIONS.map(opt => [
        opt.key,
        {
          selected: Boolean(review.addOns[opt.key]),
          price: Number(addOnPrices[opt.key] ?? 0),
        },
      ])
    );

    // The "Better" add-ons that appear in the Better tier description
    const betterAddOnsIncluded = ADD_ON_OPTIONS
      .filter(opt => review.addOns[opt.key])
      .map(opt => opt.label);

    createQuoteMutation.mutate({
      customerName:      review.customerName || "",
      status:            "draft",
      total:             quote.better.price,
      frequencySelected: freq,
      selectedOption:    "better",
      recommendedOption: "better",
      propertyBeds:      property.beds,
      propertyBaths:     property.baths + property.halfBaths * 0.5,
      propertySqft:      property.sqft,
      options: {
        good: {
          price:           quote.good.price,
          firstCleanPrice: quote.good.firstCleanPrice ?? undefined,
          name:            "Good",
          serviceTypeName: quote.good.name,
          serviceTypeId:   quote.good.serviceTypeId,
          scope:           quote.good.scope,
          addOnsIncluded:  [],
        },
        better: {
          price:           quote.better.price,
          firstCleanPrice: quote.better.firstCleanPrice ?? undefined,
          name:            "Better",
          serviceTypeName: quote.better.name,
          serviceTypeId:   quote.better.serviceTypeId,
          scope:           quote.better.scope,
          addOnsIncluded:  betterAddOnsIncluded,
        },
        best: {
          price:           quote.best.price,
          firstCleanPrice: quote.best.firstCleanPrice ?? undefined,
          name:            "Best",
          serviceTypeName: quote.best.name,
          serviceTypeId:   quote.best.serviceTypeId,
          scope:           quote.best.scope,
          addOnsIncluded:  ["Inside Oven", "Inside Cabinets", "Interior Windows", "Baseboards Detail", "Blinds Detail"],
        },
      },
      addOns: addOnsForApi,
      propertyDetails: {
        quoteType:       "residential",
        beds:            property.beds,
        baths:           property.baths,
        halfBaths:       property.halfBaths,
        sqft:            property.sqft,
        homeType:        property.homeType,
        conditionScore:  property.conditionScore,
        peopleCount:     property.peopleCount,
        petType:         property.petType,
        petShedding:     property.petShedding,
        condition:       review.conditionLevel
          ? review.conditionLevel.charAt(0).toUpperCase() + review.conditionLevel.slice(1)
          : "Average",
        customerName:    review.customerName || "",
        customerAddress: review.address || "",
      },
    });
  };

  if (!isGrowth) {
    return (
      <div>
        <PageHeader title="Voice-to-Quote" subtitle="Paste messy notes and let AI build a quote draft" />
        <Card>
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Wand2 className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900 mb-1">Growth Plan Feature</p>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                AI note extraction is included in the Growth plan. Paste walkthrough notes, texts, or property descriptions and get a ready-to-send quote draft in seconds.
              </p>
            </div>
            <Button onClick={() => navigate("/settings?tab=billing")} icon={ArrowRight}>
              Upgrade to Growth
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Voice-to-Quote"
        subtitle="Paste walkthrough notes, texts, or property descriptions — AI extracts quote-ready details in seconds"
      />

      <WebAIConsentGate>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Left: Notes Input ── */}
          <div className="space-y-4">
            <Card>
              <CardHeader title="Property Notes" icon={Wand2} />
              <p className="text-sm text-slate-500 mb-3">
                Supports walkthrough notes, text threads, customer messages, voicemail transcriptions, or any property description.
              </p>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {EXAMPLE_CHIPS.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => { setNotes(chip); setExtracted(null); setReview(null); setError(""); }}
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-primary-50 hover:text-primary-700 text-slate-600 text-xs font-medium transition-colors border border-transparent hover:border-primary-200"
                  >
                    Example {i + 1}
                  </button>
                ))}
              </div>

              <div className="relative">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={`Try pasting notes like:\n\n"3 bed, 2 bath home in Malvern. First-time clean, 1 dog, customer wants biweekly if price makes sense."\n\n"Move-out clean for 2,100 sq ft condo. Needs inside oven and fridge. Very dirty kitchen."\n\n"Customer texted: standard clean every 2 weeks, 4 bed, 3 bath, 2 cats, wants quote by Friday."`}
                  rows={9}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 hover:border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none transition-colors"
                />
                {notes.length > 0 ? (
                  <button
                    onClick={() => { setNotes(""); setExtracted(null); setReview(null); setError(""); }}
                    className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Clear"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
              </div>

              <div className="mt-3 flex items-center gap-3">
                <Button
                  icon={Sparkles}
                  onClick={extractDetails}
                  loading={extracting}
                  disabled={!notes.trim() || extracting}
                >
                  Extract Details
                </Button>
                {(extracted || review) && !extracting ? (
                  <button
                    onClick={() => { setExtracted(null); setReview(null); setError(""); }}
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                ) : null}
              </div>

              {error ? (
                <div className="mt-3">
                  <Alert variant="error" title="Extraction failed" description={error} />
                  <div className="mt-2">
                    <button
                      onClick={extractDetails}
                      className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Try again
                    </button>
                  </div>
                </div>
              ) : null}
            </Card>

            <Card>
              <CardHeader title="Tips" />
              <ul className="space-y-2 text-sm text-slate-600">
                {[
                  "Include bedrooms, bathrooms, and square footage when available",
                  "Mention pet types (dog, cat) and whether they shed",
                  "Describe dirtiness level — the AI uses this to set the condition score",
                  "List add-ons like inside oven, fridge, windows, laundry",
                  "Paste raw customer texts or call notes — AI handles the mess",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* ── Right: Review Panel ── */}
          <div>
            <Card>
              {extracting ? (
                <LoadingPanel stage={loadingStage} />
              ) : extracted && review ? (
                <ReviewPanel
                  extracted={extracted}
                  review={review}
                  onReviewChange={setReview}
                  onCreateQuote={createQuoteFromReview}
                  creating={createQuoteMutation.isPending}
                  pricingSettings={pricingSettings}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">AI Extraction</p>
                  <p className="text-sm text-slate-500 max-w-xs">
                    Paste your notes on the left and click "Extract Details". AI will pull out property specs, service type, pets, add-ons, and flag missing info.
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-xs">
                    {[
                      { icon: Home, label: "Property Details" },
                      { icon: Sparkles, label: "Service Type" },
                      { icon: PawPrint, label: "Pet Info" },
                      { icon: Lightbulb, label: "Recommendations" },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                        <Icon className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-500">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </WebAIConsentGate>
    </div>
  );
}
