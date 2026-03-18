import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { apiPost } from "../lib/api";
import { queryClient } from "../lib/queryClient";
import {
  Wand2,
  FileText,
  ArrowRight,
  Sparkles,
  Home,
  Bed,
  Bath,
  Maximize,
  PawPrint,
  AlertCircle,
  CheckCircle2,
  Info,
  Lightbulb,
  RotateCcw,
  X,
  Building2,
  RefreshCw,
  Star,
} from "lucide-react";
import { PageHeader, Card, CardHeader, Button, Alert } from "../components/ui";
import { useSubscription } from "../lib/subscription";

const EXAMPLE_CHIPS = [
  "3 bed 2 bath house, first-time deep clean, 1 dog that sheds, kitchen is greasy.",
  "Move-out clean for 2 bed condo, needs inside oven and fridge, very dirty.",
  "Customer wants biweekly standard clean, 4 bed 2.5 bath, 2 cats, quote by Thursday.",
  "3,000 sq ft office, bathrooms and kitchenette, biweekly.",
  "Airbnb turnover clean, same-day turnaround, lots of laundry.",
];

const LOADING_STAGES = [
  "Reading your notes...",
  "Extracting property details...",
  "Identifying service requirements...",
  "Building quote assumptions...",
];

function ConditionDot({ level }: { level: string | null }) {
  const map: Record<string, { color: string; label: string }> = {
    light: { color: "bg-emerald-500", label: "Light" },
    moderate: { color: "bg-amber-400", label: "Moderate" },
    heavy: { color: "bg-orange-500", label: "Heavy" },
    extreme: { color: "bg-red-500", label: "Extreme" },
  };
  const val = level ? map[level] : null;
  if (!val) return <span className="text-slate-400">—</span>;
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${val.color}`} />
      {val.label}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-400 font-medium uppercase tracking-wide shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 text-right">{value}</span>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: React.ElementType;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className={`flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 ${color}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

function ExtractionResults({ result, onCreateQuote, creating }: {
  result: any;
  onCreateQuote: () => void;
  creating: boolean;
}) {
  const f = result.extractedFields || {};
  const missingFields: string[] = result.missingFields || [];
  const recommendations: string[] = result.recommendations || [];
  const assumptions: string[] = result.assumptions || [];
  const confidence: string = result.confidence || "low";

  const confidenceMap: Record<string, { label: string; cls: string }> = {
    high: { label: "High confidence", cls: "bg-emerald-100 text-emerald-700" },
    medium: { label: "Medium confidence", cls: "bg-amber-100 text-amber-700" },
    low: { label: "Low confidence", cls: "bg-slate-100 text-slate-500" },
  };
  const conf = confidenceMap[confidence] || confidenceMap.low;

  const serviceCategoryLabel: Record<string, string> = {
    standard: "Standard Clean",
    deep: "Deep Clean",
    "move-in-out": "Move-In / Move-Out",
    "post-construction": "Post-Construction",
    recurring: "Recurring",
    "one-time": "One-Time",
  };

  const frequencyLabel: Record<string, string> = {
    "one-time": "One-time",
    weekly: "Weekly",
    "bi-weekly": "Bi-Weekly",
    monthly: "Monthly",
  };

  const addOns: string[] = Array.isArray(f.addOns) ? f.addOns : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Extraction Results</h3>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${conf.cls}`}>{conf.label}</span>
      </div>

      {result.serviceReasoning ? (
        <div className="rounded-lg bg-primary-50 border border-primary-100 px-4 py-3">
          <p className="text-sm text-primary-700">{result.serviceReasoning}</p>
        </div>
      ) : null}

      <SectionCard icon={Home} title="Property" color="text-blue-700 bg-blue-50">
        {f.isCommercial ? (
          <DetailRow label="Type" value={<span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-purple-500" />Commercial{f.propertyType ? ` — ${f.propertyType}` : ""}</span>} />
        ) : (
          <DetailRow label="Type" value={f.propertyType ? <span className="capitalize">{f.propertyType}</span> : <span className="text-slate-400">—</span>} />
        )}
        {f.bedrooms != null ? <DetailRow label="Bedrooms" value={`${f.bedrooms} bed`} /> : null}
        {f.bathrooms != null ? (
          <DetailRow
            label="Bathrooms"
            value={f.halfBaths ? `${f.bathrooms} full, ${f.halfBaths} half` : `${f.bathrooms} bath`}
          />
        ) : null}
        {f.sqft != null ? <DetailRow label="Sq Footage" value={`${f.sqft.toLocaleString()} sq ft`} /> : null}
        {f.occupants != null ? <DetailRow label="Occupants" value={`${f.occupants} people`} /> : null}
        {f.address ? <DetailRow label="Address" value={f.address} /> : null}
        {f.customerName ? <DetailRow label="Customer" value={f.customerName} /> : null}
        {!f.propertyType && f.bedrooms == null && f.bathrooms == null && f.sqft == null ? (
          <p className="text-sm text-slate-400 py-3">No property details found</p>
        ) : null}
      </SectionCard>

      <SectionCard icon={Sparkles} title="Service Details" color="text-purple-700 bg-purple-50">
        {f.serviceCategory ? (
          <DetailRow label="Service Type" value={
            <span className="flex items-center gap-1.5">
              {serviceCategoryLabel[f.serviceCategory] || f.serviceCategory}
              {f.isDeepClean ? <Star className="w-3.5 h-3.5 text-amber-500" /> : null}
            </span>
          } />
        ) : null}
        {f.frequency ? <DetailRow label="Frequency" value={frequencyLabel[f.frequency] || f.frequency} /> : null}
        {f.conditionLevel ? (
          <DetailRow label="Condition" value={<ConditionDot level={f.conditionLevel} />} />
        ) : null}
        {f.conditionReasoning ? (
          <div className="py-2 text-xs text-slate-500 italic">{f.conditionReasoning}</div>
        ) : null}
        {f.isFirstTimeClean ? <DetailRow label="First-Time Clean" value={<span className="text-emerald-600 font-medium">Yes</span>} /> : null}
        {f.isMoveInOut ? <DetailRow label="Move-In / Move-Out" value={<span className="text-emerald-600 font-medium">Yes</span>} /> : null}
        {f.urgency && f.urgency !== "normal" ? (
          <DetailRow label="Urgency" value={
            <span className={f.urgency === "rush" ? "text-red-600 font-medium capitalize" : "capitalize text-slate-700"}>
              {f.urgency}
            </span>
          } />
        ) : null}
        {f.serviceNotes ? (
          <div className="py-2 text-xs text-slate-500">{f.serviceNotes}</div>
        ) : null}
        {!f.serviceCategory && !f.frequency && !f.conditionLevel ? (
          <p className="text-sm text-slate-400 py-3">No service details found</p>
        ) : null}
      </SectionCard>

      {(f.petType && f.petType !== "none") || f.petCount != null ? (
        <SectionCard icon={PawPrint} title="Pets" color="text-amber-700 bg-amber-50">
          {f.petType && f.petType !== "none" ? (
            <DetailRow label="Pet Type" value={<span className="capitalize">{f.petType}</span>} />
          ) : null}
          {f.petCount != null ? <DetailRow label="Pet Count" value={`${f.petCount}`} /> : null}
          {f.petShedding ? <DetailRow label="Shedding" value={<span className="text-amber-600 font-medium">Yes</span>} /> : null}
        </SectionCard>
      ) : null}

      {addOns.length > 0 ? (
        <SectionCard icon={CheckCircle2} title="Add-Ons / Special Requests" color="text-emerald-700 bg-emerald-50">
          <div className="flex flex-wrap gap-2 py-3">
            {addOns.map((a, i) => (
              <span key={i} className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium capitalize">
                {a}
              </span>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {missingFields.length > 0 ? (
        <SectionCard icon={AlertCircle} title="Missing Information" color="text-orange-700 bg-orange-50">
          <ul className="py-2 space-y-1.5">
            {missingFields.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                {m}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-400 pb-3">Confirm these details before finalizing the quote.</p>
        </SectionCard>
      ) : null}

      {recommendations.length > 0 ? (
        <SectionCard icon={Lightbulb} title="Recommendations" color="text-indigo-700 bg-indigo-50">
          <ul className="py-2 space-y-2">
            {recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

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

      <Button
        icon={ArrowRight}
        onClick={onCreateQuote}
        loading={creating}
        className="w-full"
      >
        Create Quote Draft
      </Button>
    </div>
  );
}

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

export default function WalkthroughAIPage() {
  const navigate = useNavigate();
  const { tier } = useSubscription();
  const isGrowth = tier === "growth" || tier === "pro";

  const [notes, setNotes] = useState("");
  const [extracted, setExtracted] = useState<any>(null);
  const [extracting, setExtracting] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState("");

  const stageIntervalRef: { current: ReturnType<typeof setInterval> | null } = { current: null };

  const extractDetails = async () => {
    if (!notes.trim()) return;
    setExtracting(true);
    setError("");
    setExtracted(null);
    setLoadingStage(0);

    stageIntervalRef.current = setInterval(() => {
      setLoadingStage((s) => Math.min(s + 1, LOADING_STAGES.length - 1));
    }, 1200);

    try {
      const res = await apiPost("/api/ai/walkthrough-extract", {
        description: notes.trim(),
      });
      setExtracted(res);
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

  const createQuoteFromExtracted = () => {
    if (!extracted) return;
    const f = extracted.extractedFields || {};

    createQuoteMutation.mutate({
      customerName: f.customerName || "",
      status: "draft",
      total: 0,
      propertyDetails: {
        quoteType: f.isCommercial ? "commercial" : "residential",
        beds: f.bedrooms ?? 3,
        baths: f.bathrooms ?? 2,
        halfBaths: f.halfBaths ?? 0,
        sqft: f.sqft ?? 1500,
        homeType: f.propertyType || "house",
        conditionScore: f.conditionLevel === "extreme" ? 3 : f.conditionLevel === "heavy" ? 4 : f.conditionLevel === "light" ? 8 : 6,
        peopleCount: f.occupants ?? 2,
        petType: f.petType || "none",
        petShedding: f.petShedding || false,
        condition: f.conditionLevel ? (f.conditionLevel.charAt(0).toUpperCase() + f.conditionLevel.slice(1)) : "Average",
        customerName: f.customerName || "",
        customerAddress: f.address || "",
      },
      addOns: (f.addOns || []).reduce((acc: Record<string, boolean>, a: string) => {
        const key = a.toLowerCase().replace(/\s+/g, "_");
        acc[key] = true;
        return acc;
      }, {}),
      options: {
        cleaningType: f.serviceCategory || "standard",
        frequency: f.frequency || "one-time",
        isFirstTimeClean: f.isFirstTimeClean || false,
        isDeepClean: f.isDeepClean || false,
        isMoveInOut: f.isMoveInOut || false,
      },
    });
  };

  if (!isGrowth) {
    return (
      <div>
        <PageHeader
          title="Quote from Notes"
          subtitle="Paste messy notes and let AI build a quote draft"
        />
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
        title="Quote from Notes"
        subtitle="Paste walkthrough notes, texts, or property descriptions — AI extracts quote-ready details"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  onClick={() => setNotes(chip)}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-primary-50 hover:text-primary-700 text-slate-600 text-xs font-medium transition-colors border border-transparent hover:border-primary-200"
                >
                  Example {i + 1}
                </button>
              ))}
            </div>

            <div className="relative">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`Try pasting notes like:\n\n"3 bed, 2 bath home in Malvern. First-time clean, 1 dog, customer wants biweekly if price makes sense."\n\n"Move-out clean for 2,100 sq ft condo. Needs inside oven and fridge. Very dirty kitchen."\n\n"Customer texted: standard clean every 2 weeks, 4 bed, 3 bath, 2 cats, wants quote by Friday."`}
                rows={9}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 hover:border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none transition-colors"
              />
              {notes.length > 0 ? (
                <button
                  onClick={() => { setNotes(""); setExtracted(null); setError(""); }}
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
              {extracted && !extracting ? (
                <button
                  onClick={() => { setExtracted(null); setError(""); }}
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
                "Describe dirtiness level — the AI uses this to flag deep clean",
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

        <div>
          <Card>
            {extracting ? (
              <LoadingPanel stage={loadingStage} />
            ) : extracted ? (
              <ExtractionResults
                result={extracted}
                onCreateQuote={createQuoteFromExtracted}
                creating={createQuoteMutation.isPending}
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
    </div>
  );
}
