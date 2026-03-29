import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  ChevronRight, ChevronLeft, Check, Loader2, AlertCircle, Shield,
  Share2, Clock, Star, Home, Wind, RefreshCw, ArrowRight, Plus, Minus, Zap, AlertTriangle,
} from "lucide-react";
import { calculateLeadLinkEstimate } from "../lib/leadLinkPricingEngine";
import type { LeadLinkPricingConfig, QuoteInputs, AddOnKey } from "../lib/leadLinkPricingEngine";

const API_BASE = typeof window !== "undefined" ? window.location.origin : "";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeadLinkConfig {
  slug: string;
  businessId: string;
  companyName: string;
  logoUri?: string;
  primaryColor: string;
  senderName?: string;
  rating?: number;
  pricing: {
    hourlyRate: number;
    minimumTicket: number;
    sqftFactor?: number;
  };
  pricingConfig?: LeadLinkPricingConfig;
  pricingConfigured: boolean;
  usingDefaultPricing: boolean;
  pricingCompletionPercent: number;
  pricingMissingItems: string[];
}

type FlowStep = "step1" | "calculating" | "reveal" | "step2" | "step3" | "step4";
type ServiceType = "standard" | "deep" | "move" | "recurring";
type Condition = "great" | "average" | "needs_work";
type SqftRange = "under1000" | "1000_1500" | "1500_2000" | "2000_2500" | "2500_3000" | "3000plus";

interface Step2Data {
  sqft: SqftRange | null;
  condition: Condition | null;
  pets: boolean;
  petCount: number;
  addOns: Record<string, boolean>;
  preferredDate: string;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

function getSessionId(): string {
  const key = "ll_session";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, id);
  }
  return id;
}

async function trackEvent(slug: string, eventType: string) {
  try {
    await fetch(`${API_BASE}/api/public/lead-link-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, eventType, sessionId: getSessionId() }),
    });
  } catch {}
}

async function trackEventWithMeta(slug: string, eventType: string, usedDefaultPricing: boolean) {
  try {
    await fetch(`${API_BASE}/api/public/lead-link-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, eventType, sessionId: getSessionId(), usedDefaultPricing }),
    });
  } catch {}
}

// ─── Price Calculation ───────────────────────────────────────────────────────

const SQFT_MIDPOINTS: Record<SqftRange, number> = {
  under1000: 900,
  "1000_1500": 1250,
  "1500_2000": 1750,
  "2000_2500": 2250,
  "2500_3000": 2750,
  "3000plus": 3500,
};

function calcPriceRange(
  beds: number,
  baths: number,
  serviceType: ServiceType,
  pricing: LeadLinkConfig["pricing"],
  sqft?: SqftRange | null,
  condition?: Condition | null,
  pets?: boolean,
  petCount?: number,
): { low: number; high: number } {
  const hourlyRate = pricing.hourlyRate || 40;
  const minTicket = pricing.minimumTicket || 80;
  const sqftFactor = pricing.sqftFactor || 0.0085;

  const sqftMid = sqft ? SQFT_MIDPOINTS[sqft] : beds * 450 + baths * 100;
  let baseHours = sqftMid * sqftFactor + beds * 0.25 + baths * 0.4;

  const typeMultiplier: Record<ServiceType, number> = {
    standard: 1.0,
    deep: 1.55,
    move: 2.1,
    recurring: 0.88,
  };
  baseHours *= typeMultiplier[serviceType];

  const condMultiplier: Record<Condition, number> = {
    great: 1.0,
    average: 1.1,
    needs_work: 1.3,
  };
  if (condition) baseHours *= condMultiplier[condition];

  if (pets) {
    const pc = petCount || 1;
    baseHours *= pc === 1 ? 1.06 : pc === 2 ? 1.12 : 1.18;
  }

  const base = hourlyRate * baseHours;
  const low = Math.round(Math.max(minTicket, base * 0.85) / 5) * 5;
  const high = Math.round(base * 1.25 / 5) * 5;
  return { low, high };
}

// ─── Count-up Animation Hook ─────────────────────────────────────────────────

function useCountUp(target: number, active: boolean, duration = 700) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active || target === 0) return;
    const start = Date.now();
    let frame: number;
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(ease * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, duration]);
  return value;
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: FlowStep }) {
  const steps: FlowStep[] = ["step1", "reveal", "step2", "step3"];
  const labels = ["Home Info", "Your Price", "Details", "Contact"];
  const cur = steps.indexOf(step === "calculating" ? "reveal" : step);
  return (
    <div className="flex items-center gap-2 justify-center mb-6">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: i < cur ? "#10b981" : i === cur ? "#2563eb" : "#e2e8f0",
                color: i <= cur ? "#fff" : "#94a3b8",
              }}
            >
              {i < cur ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className="text-[9px] mt-1 font-medium" style={{ color: i === cur ? "#2563eb" : "#94a3b8" }}>
              {labels[i]}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-8 h-0.5 mb-4" style={{ background: i < cur ? "#10b981" : "#e2e8f0" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function PillSelector({
  options, value, onChange, primary,
}: {
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (v: string) => void;
  primary: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="px-4 py-2.5 rounded-full text-sm font-semibold border-2 transition-all min-h-[44px]"
            style={{
              borderColor: selected ? primary : "#e2e8f0",
              background: selected ? primary : "#fff",
              color: selected ? "#fff" : "#374151",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ServiceCard({
  value, label, icon: Icon, selected, primary, onClick,
}: {
  value: ServiceType;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  selected: boolean;
  primary: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left min-h-[60px]"
      style={{
        borderColor: selected ? primary : "#e2e8f0",
        background: selected ? `${primary}10` : "#fff",
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: selected ? primary : "#f1f5f9" }}
      >
        <Icon className="w-4 h-4" style={{ color: selected ? "#fff" : "#94a3b8" }} />
      </div>
      <span className="text-sm font-semibold" style={{ color: selected ? primary : "#374151" }}>{label}</span>
    </button>
  );
}

function ConditionCard({
  value, emoji, label, desc, selected, primary, onClick,
}: {
  value: Condition;
  emoji: string;
  label: string;
  desc: string;
  selected: boolean;
  primary: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start p-3.5 rounded-xl border-2 transition-all text-left"
      style={{
        borderColor: selected ? primary : "#e2e8f0",
        background: selected ? `${primary}10` : "#fff",
      }}
    >
      <span className="text-xl mb-1">{emoji}</span>
      <span className="text-sm font-bold" style={{ color: selected ? primary : "#374151" }}>{label}</span>
      <span className="text-xs text-slate-400 mt-0.5 leading-tight">{desc}</span>
    </button>
  );
}

function PriceBadge({ low, high, flash = false }: { low: number; high: number; flash?: boolean }) {
  const [flashing, setFlashing] = useState(false);
  useEffect(() => {
    if (flash) {
      setFlashing(true);
      setTimeout(() => setFlashing(false), 600);
    }
  }, [low, high, flash]);
  return (
    <div
      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl mb-5"
      style={{
        background: "#eff6ff",
        transition: "background 0.3s",
        ...(flashing ? { background: "#dbeafe" } : {}),
      }}
    >
      <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: "#2563eb" }} />
      <span className="text-sm font-bold" style={{ color: "#1e40af" }}>
        Estimate: ${low.toLocaleString()}–${high.toLocaleString()}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LeadLinkPage() {
  const { slug } = useParams<{ slug: string }>();
  const [config, setConfig] = useState<LeadLinkConfig | null>(null);
  const [configError, setConfigError] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);

  const [step, setStep] = useState<FlowStep>("step1");

  // Step 1
  const [beds, setBeds] = useState<string | null>(null);
  const [baths, setBaths] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState<ServiceType | null>(null);

  // Price reveal
  const [priceRange, setPriceRange] = useState<{ low: number; high: number } | null>(null);
  const [priceFlash, setPriceFlash] = useState(false);
  const [accuracyTooltip, setAccuracyTooltip] = useState(false);
  const prevSpreadRef = useRef<number | null>(null);
  const lowCount = useCountUp(priceRange?.low ?? 0, step === "reveal");
  const highCount = useCountUp(priceRange?.high ?? 0, step === "reveal");

  // Step 2
  const [s2, setS2] = useState<Step2Data>({
    sqft: null, condition: null, pets: false, petCount: 1, addOns: {}, preferredDate: "",
  });

  // Step 3
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const scrollTopRef = useRef<HTMLDivElement>(null);

  function scrollToTop() {
    setTimeout(() => scrollTopRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  useEffect(() => {
    if (!slug) return;
    fetch(`${API_BASE}/api/public/lead-link-config/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error || d.message) { setConfigError(true); return; }
        setConfig(d);
        document.title = `${d.companyName} — Get a Free Quote`;
        trackEventWithMeta(slug, "leadlink_visit", !!d.usingDefaultPricing);
      })
      .catch(() => setConfigError(true))
      .finally(() => setConfigLoading(false));
  }, [slug]);

  const primary = config?.primaryColor || "#2563eb";
  const step1Valid = beds !== null && baths !== null && serviceType !== null;

  const computePrice = useCallback(
    (sqft?: SqftRange | null, cond?: Condition | null, pets?: boolean, petCount?: number) => {
      if (!config || beds === null || baths === null || serviceType === null) return null;

      // Use the new engine when pricingConfig is available
      if (config.pricingConfig) {
        const condMap: Record<Condition, QuoteInputs["conditionLevel"]> = {
          great: "excellent", average: "average", needs_work: "dirty",
        };
        const cleaningTypeMap: Record<ServiceType, QuoteInputs["cleaningType"]> = {
          standard: "standard", deep: "deep", move: "moveinout", recurring: "recurring",
        };
        const sqftMid = sqft ? SQFT_MIDPOINTS[sqft] : null;
        const inputs: QuoteInputs = {
          bedrooms: parseInt(beds),
          bathrooms: parseFloat(baths),
          sqft: sqftMid,
          cleaningType: cleaningTypeMap[serviceType],
          frequency: serviceType === "recurring" ? "biweekly" : "onetime",
          conditionLevel: cond ? condMap[cond] : "good",
          petCount: pets ? (petCount ?? 1) : 0,
          addOns: [] as AddOnKey[],
          usingDefaultPricing: config.usingDefaultPricing,
        };
        const estimate = calculateLeadLinkEstimate(inputs, config.pricingConfig);
        return { low: estimate.lowEstimate, high: estimate.highEstimate };
      }

      // Legacy fallback
      return calcPriceRange(
        parseInt(beds), parseFloat(baths), serviceType, config.pricing,
        sqft, cond, pets, petCount,
      );
    },
    [config, beds, baths, serviceType],
  );

  function goToReveal() {
    if (!step1Valid || !config) return;
    const price = computePrice();
    if (!price) return;
    setPriceRange(price);
    setStep("calculating");
    trackEventWithMeta(slug!, "leadlink_step1_complete", !!config?.usingDefaultPricing);
    setTimeout(() => setStep("reveal"), 900);
    scrollToTop();
  }

  function goToStep2() {
    setStep("step2");
    trackEvent(slug!, "leadlink_step2_start");
    scrollToTop();
  }

  function handleStep2Change(updates: Partial<Step2Data>) {
    setS2((prev) => {
      const next = { ...prev, ...updates };
      const price = computePrice(next.sqft, next.condition, next.pets, next.petCount);
      if (price) {
        const newSpread = price.high - price.low;
        const prevSpread = prevSpreadRef.current;
        if (prevSpread !== null && newSpread < prevSpread) {
          setAccuracyTooltip(true);
          setTimeout(() => setAccuracyTooltip(false), 1500);
        }
        prevSpreadRef.current = newSpread;
        setPriceRange(price);
        setPriceFlash(true);
        setTimeout(() => setPriceFlash(false), 700);
      }
      return next;
    });
  }

  function goToStep3() {
    setStep("step3");
    trackEvent(slug!, "leadlink_step2_complete");
    scrollToTop();
  }

  async function handleSubmit() {
    setFormError("");
    if (!name.trim()) { setFormError("Please enter your name."); return; }
    if (!phone.trim()) { setFormError("Phone number is required so we can send your quote."); return; }
    if (!address.trim()) { setFormError("Please enter your home address."); return; }
    if (!config) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const r = await fetch(`${API_BASE}/api/public/intake/${config.businessId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim(),
          customerAddress: address.trim(),
          extractedFields: {
            serviceType: serviceType === "standard" ? "standard_cleaning"
              : serviceType === "deep" ? "deep_clean"
              : serviceType === "move" ? "move_in_out"
              : "recurring",
            beds: beds ? parseInt(beds) : null,
            baths: baths ? parseFloat(baths) : null,
            sqft: s2.sqft ? SQFT_MIDPOINTS[s2.sqft] : null,
            frequency: serviceType === "recurring" ? "biweekly" : "one-time",
            pets: s2.pets,
            addOns: s2.addOns,
            condition: s2.condition,
            preferredDate: s2.preferredDate || null,
            confidence: beds && baths && s2.sqft ? "high" : "medium",
            missingFields: [],
          },
          priceRange: priceRange,
          source: "lead_link",
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || "Submission failed. Please try again.");
      }
      trackEventWithMeta(slug!, "leadlink_submitted", !!config?.usingDefaultPricing);
      setStep("step4");
      scrollToTop();
    } catch (e: any) {
      setSubmitError(e.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primary }} />
      </div>
    );
  }

  if (configError || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center p-8 max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Page Not Found</h2>
          <p className="text-slate-500 text-sm">This quote link may be invalid or no longer active. Contact the business directly.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #f8faff 0%, #eff6ff 100%)" }}
    >
      {/* Default pricing disclaimer — sticky at very top */}
      {config.usingDefaultPricing && (
        <div
          style={{
            position: "sticky", top: 0, zIndex: 30,
            background: "#fef3c7",
            borderBottom: "2px solid #f59e0b",
            padding: "10px 16px",
            fontSize: 13,
            textAlign: "center",
            color: "#78350f",
          }}
        >
          <AlertTriangle className="inline w-3.5 h-3.5 mr-1 mb-0.5" style={{ color: "#d97706" }} />
          Estimates on this page are approximate. {config.companyName} will confirm your exact price before any work begins.
        </div>
      )}

      {/* Scroll target */}
      <div ref={scrollTopRef} />

      {/* Sticky top header */}
      <div
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-slate-100"
        style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)" }}
      >
        {config.logoUri ? (
          <img src={config.logoUri} alt={config.companyName} className="w-8 h-8 rounded-lg object-cover shrink-0" />
        ) : (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ background: primary }}
          >
            {config.companyName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="font-semibold text-slate-800 text-sm truncate">{config.companyName}</span>
        <div className="ml-auto shrink-0">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: `${primary}15`, color: primary }}>
            Free Quote
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-start justify-center px-4 py-6 pb-24">
        <div className="w-full" style={{ maxWidth: 480 }}>

          {/* ─── STEP 1: 3 Core Fields ─── */}
          {step === "step1" && (
            <div>
              <ProgressDots step="step1" />

              <div className="text-center mb-6">
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primary, letterSpacing: "1.5px" }}>
                  Step 1 of 3
                </p>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Get Your Price Estimate</h1>
                <p className="text-sm text-slate-500">Takes 60 seconds — see your range instantly</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-6">
                {/* Bedrooms */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Bedrooms</label>
                  <PillSelector
                    primary={primary}
                    value={beds}
                    onChange={setBeds}
                    options={[
                      { value: "0", label: "Studio" },
                      { value: "1", label: "1" },
                      { value: "2", label: "2" },
                      { value: "3", label: "3" },
                      { value: "4", label: "4" },
                      { value: "5", label: "5+" },
                    ]}
                  />
                </div>

                {/* Bathrooms */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Bathrooms</label>
                  <PillSelector
                    primary={primary}
                    value={baths}
                    onChange={setBaths}
                    options={[
                      { value: "1", label: "1" },
                      { value: "1.5", label: "1.5" },
                      { value: "2", label: "2" },
                      { value: "2.5", label: "2.5" },
                      { value: "3", label: "3" },
                      { value: "4", label: "4+" },
                    ]}
                  />
                </div>

                {/* Cleaning Type */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Cleaning Type</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <ServiceCard value="standard" label="Standard Clean" icon={Home} selected={serviceType === "standard"} primary={primary} onClick={() => setServiceType("standard")} />
                    <ServiceCard value="deep" label="Deep Clean" icon={Star} selected={serviceType === "deep"} primary={primary} onClick={() => setServiceType("deep")} />
                    <ServiceCard value="move" label="Move In/Out" icon={Wind} selected={serviceType === "move"} primary={primary} onClick={() => setServiceType("move")} />
                    <ServiceCard value="recurring" label="Recurring" icon={RefreshCw} selected={serviceType === "recurring"} primary={primary} onClick={() => setServiceType("recurring")} />
                  </div>
                </div>
              </div>

              <button
                onClick={goToReveal}
                disabled={!step1Valid}
                className="w-full mt-5 flex items-center justify-center gap-2 font-bold text-white rounded-2xl transition-all"
                style={{
                  height: 56,
                  fontSize: 16,
                  background: step1Valid
                    ? `linear-gradient(135deg, ${primary}, #06b6d4)`
                    : "#e2e8f0",
                  color: step1Valid ? "#fff" : "#94a3b8",
                  transform: step1Valid ? "scale(1)" : "scale(0.98)",
                  boxShadow: step1Valid ? `0 0 24px ${primary}40` : "none",
                  transition: "all 0.2s ease",
                  cursor: step1Valid ? "pointer" : "not-allowed",
                }}
              >
                See My Price <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ─── CALCULATING ─── */}
          {step === "calculating" && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                style={{ background: `${primary}15` }}
              >
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: primary }} />
              </div>
              <p className="text-base font-semibold text-slate-600">Calculating your estimate...</p>
              <p className="text-sm text-slate-400 mt-1">Based on local pricing data</p>
            </div>
          )}

          {/* ─── PRICE REVEAL ─── */}
          {step === "reveal" && priceRange && (
            <div>
              <ProgressDots step="reveal" />

              <div className="text-center mb-4">
                <p className="text-sm text-slate-500 mb-3">
                  Estimate for your{" "}
                  <span className="font-semibold text-slate-700">
                    {beds === "0" ? "Studio" : `${beds} bed`} / {baths} bath home
                  </span>
                </p>
              </div>

              {/* Big price reveal */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
                <div className="text-center">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4" style={{ letterSpacing: "1.5px" }}>
                    {config.usingDefaultPricing ? "Estimated price range" : (
                      <>
                        {serviceType === "standard" ? "Standard Clean"
                          : serviceType === "deep" ? "Deep Clean"
                          : serviceType === "move" ? "Move In/Out Clean"
                          : "Recurring Clean"} · One-time estimate
                      </>
                    )}
                  </p>

                  <div
                    className="font-black leading-none mb-3"
                    style={{ fontSize: "clamp(40px, 12vw, 64px)", color: primary, letterSpacing: "-0.02em" }}
                  >
                    ${lowCount.toLocaleString()} – ${highCount.toLocaleString()}
                  </div>

                  {/* Trust signals */}
                  <div className="flex items-center justify-center gap-4 flex-wrap mb-5">
                    {[
                      "No hidden fees",
                      "Free to get a quote",
                      `${config.companyName} rated ${config.rating ?? 4.9}★`,
                    ].map((t) => (
                      <div key={t} className="flex items-center gap-1 text-xs text-slate-500">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>

                  {config.usingDefaultPricing ? (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Exact pricing depends on your home's specifics and will be confirmed by {config.companyName}.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Exact price depends on home condition and any add-on services.
                      Your final quote will be sent after you share a few more details.
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={goToStep2}
                className="w-full flex items-center justify-center gap-2 font-bold text-white rounded-2xl"
                style={{
                  height: 56,
                  fontSize: 16,
                  background: `linear-gradient(135deg, ${primary}, #06b6d4)`,
                  boxShadow: `0 0 24px ${primary}40`,
                }}
              >
                Get My Exact Quote <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setStep("step1")}
                className="w-full mt-3 py-3 text-sm text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Change my answers
              </button>
            </div>
          )}

          {/* ─── STEP 2: Details ─── */}
          {step === "step2" && priceRange && (
            <div>
              <ProgressDots step="step2" />

              {/* Persistent price bar */}
              <PriceBadge low={priceRange.low} high={priceRange.high} flash={priceFlash} />

              {/* "Getting more accurate" tooltip — fades in/out when range narrows */}
              <div
                style={{
                  overflow: "hidden",
                  maxHeight: accuracyTooltip ? "32px" : "0px",
                  opacity: accuracyTooltip ? 1 : 0,
                  transition: "max-height 0.25s ease, opacity 0.25s ease",
                  marginBottom: accuracyTooltip ? "12px" : "0px",
                  textAlign: "center",
                }}
              >
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: "#dbeafe", color: "#1d4ed8" }}
                >
                  <Zap className="w-3 h-3" />
                  Getting more accurate…
                </span>
              </div>

              <div className="text-center mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primary, letterSpacing: "1.5px" }}>
                  Step 2 of 3
                </p>
                <h2 className="text-xl font-bold text-slate-900">A Few More Details</h2>
                <p className="text-sm text-slate-500 mt-1">Helps narrow your estimate</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-6">

                {/* Home size */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Home Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "under1000", label: "Under 1,000 sq ft" },
                      { value: "1000_1500", label: "1,000–1,500" },
                      { value: "1500_2000", label: "1,500–2,000" },
                      { value: "2000_2500", label: "2,000–2,500" },
                      { value: "2500_3000", label: "2,500–3,000" },
                      { value: "3000plus", label: "3,000+ sq ft" },
                    ].map((opt) => {
                      const sel = s2.sqft === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleStep2Change({ sqft: opt.value as SqftRange })}
                          className="py-3 px-3 rounded-xl border-2 text-sm font-semibold transition-all min-h-[44px]"
                          style={{
                            borderColor: sel ? primary : "#e2e8f0",
                            background: sel ? `${primary}10` : "#fff",
                            color: sel ? primary : "#374151",
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Home Condition</label>
                  <div className="grid grid-cols-3 gap-2">
                    <ConditionCard
                      value="great" emoji="✨" label="Great shape"
                      desc="Recently cleaned, well maintained"
                      selected={s2.condition === "great"} primary={primary}
                      onClick={() => handleStep2Change({ condition: "great" })}
                    />
                    <ConditionCard
                      value="average" emoji="😐" label="Average"
                      desc="Normal everyday mess"
                      selected={s2.condition === "average"} primary={primary}
                      onClick={() => handleStep2Change({ condition: "average" })}
                    />
                    <ConditionCard
                      value="needs_work" emoji="🧹" label="Needs work"
                      desc="Hasn't been cleaned in a while"
                      selected={s2.condition === "needs_work"} primary={primary}
                      onClick={() => handleStep2Change({ condition: "needs_work" })}
                    />
                  </div>
                </div>

                {/* Pets */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-bold text-slate-700">Do you have pets?</label>
                    <button
                      onClick={() => handleStep2Change({ pets: !s2.pets })}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all"
                      style={{
                        borderColor: s2.pets ? primary : "#e2e8f0",
                        background: s2.pets ? `${primary}10` : "#f8fafc",
                        color: s2.pets ? primary : "#94a3b8",
                      }}
                    >
                      {s2.pets ? "Yes" : "No"}
                    </button>
                  </div>
                  {s2.pets && (
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm text-slate-600">How many?</span>
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          onClick={() => handleStep2Change({ petCount: Math.max(1, s2.petCount - 1) })}
                          className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:border-slate-400 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center font-bold text-slate-800">{s2.petCount}</span>
                        <button
                          onClick={() => handleStep2Change({ petCount: Math.min(5, s2.petCount + 1) })}
                          className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:border-slate-400 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Add-ons */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Anything extra?{" "}
                    <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {[
                      { key: "insideFridge", label: "Inside Fridge" },
                      { key: "insideOven", label: "Inside Oven" },
                      { key: "interiorWindows", label: "Interior Windows" },
                      { key: "baseboardsDetail", label: "Baseboards" },
                      { key: "laundryFoldOnly", label: "Laundry Fold" },
                      { key: "insideCabinets", label: "Inside Cabinets" },
                    ].map((addon) => {
                      const sel = !!s2.addOns[addon.key];
                      return (
                        <button
                          key={addon.key}
                          onClick={() => handleStep2Change({ addOns: { ...s2.addOns, [addon.key]: !sel } })}
                          className="px-3.5 py-2 rounded-full text-xs font-semibold border-2 transition-all min-h-[36px]"
                          style={{
                            borderColor: sel ? primary : "#e2e8f0",
                            background: sel ? `${primary}15` : "#fff",
                            color: sel ? primary : "#64748b",
                          }}
                        >
                          {sel ? "✓ " : ""}{addon.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Preferred date */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    When were you thinking?{" "}
                    <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={s2.preferredDate}
                    onChange={(e) => setS2((prev) => ({ ...prev, preferredDate: e.target.value }))}
                    placeholder="e.g. Next week, ASAP, specific date"
                    className="w-full mt-2 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none transition-colors"
                    style={{ minHeight: 48, fontSize: 16 }}
                    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = primary; }}
                    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "#e2e8f0"; }}
                  />
                </div>
              </div>

              {/* Sticky CTA */}
              <div className="fixed bottom-0 left-0 right-0 px-4 pb-5 pt-3" style={{ background: "linear-gradient(to top, rgba(248,250,255,1) 60%, transparent)" }}>
                <div style={{ maxWidth: 480, margin: "0 auto" }}>
                  <button
                    onClick={goToStep3}
                    className="w-full flex items-center justify-center gap-2 font-bold text-white rounded-2xl"
                    style={{
                      height: 56,
                      fontSize: 16,
                      background: `linear-gradient(135deg, ${primary}, #06b6d4)`,
                      boxShadow: `0 0 24px ${primary}40`,
                    }}
                  >
                    Almost done <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 3: Contact Info ─── */}
          {step === "step3" && priceRange && (
            <div>
              <ProgressDots step="step3" />

              {/* Final price display */}
              <div className="text-center mb-5">
                <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-slate-400" style={{ letterSpacing: "1.5px" }}>
                  Your Quote Is Ready
                </p>
                <div
                  className="font-black leading-none mb-2"
                  style={{ fontSize: "clamp(36px, 10vw, 52px)", color: primary, letterSpacing: "-0.02em" }}
                >
                  ${priceRange.low.toLocaleString()} – ${priceRange.high.toLocaleString()}
                </div>
                <p className="text-sm text-slate-500">
                  Enter your info and {config.companyName} will send your exact quote within minutes.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                    style={{ minHeight: 52, fontSize: 16 }}
                    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = primary; }}
                    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "#e2e8f0"; }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Best number to reach you"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                    style={{ minHeight: 52, fontSize: 16 }}
                    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = primary; }}
                    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "#e2e8f0"; }}
                  />
                  <p className="text-xs text-slate-400 mt-1">Your quote will be sent by text</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Email <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email (optional)"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                    style={{ minHeight: 52, fontSize: 16 }}
                    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = primary; }}
                    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "#e2e8f0"; }}
                  />
                  <p className="text-xs text-slate-400 mt-1">Also send quote to my email</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Home Address <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Home address"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                    style={{ minHeight: 52, fontSize: 16 }}
                    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = primary; }}
                    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "#e2e8f0"; }}
                  />
                  <p className="text-xs text-slate-400 mt-1">So we can confirm we serve your area</p>
                </div>

                {(formError || submitError) && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-xs text-red-600 font-medium">{formError || submitError}</p>
                  </div>
                )}
              </div>

              {/* Trust block */}
              <div className="flex items-center gap-2 px-4 py-3 mt-4 bg-slate-50 rounded-xl border border-slate-100">
                <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  Your info is never shared or sold. QuotePro is used by 127+ cleaning businesses.
                </p>
              </div>

              {/* Sticky submit */}
              <div className="fixed bottom-0 left-0 right-0 px-4 pb-5 pt-3" style={{ background: "linear-gradient(to top, rgba(248,250,255,1) 60%, transparent)" }}>
                <div style={{ maxWidth: 480, margin: "0 auto" }}>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl font-bold text-white transition-all"
                    style={{
                      height: 56,
                      fontSize: 18,
                      background: submitting ? "#94a3b8" : `linear-gradient(135deg, #2563eb, #06b6d4)`,
                      boxShadow: submitting ? "none" : "0 0 24px rgba(37,99,235,0.35)",
                      cursor: submitting ? "not-allowed" : "pointer",
                    }}
                  >
                    {submitting
                      ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending your request...</>
                      : <>Send Me My Quote <ArrowRight className="w-5 h-5" /></>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 4: Confirmation ─── */}
          {step === "step4" && (
            <div className="text-center py-4">
              {/* Animated checkmark */}
              <div className="flex justify-center mb-6">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    boxShadow: "0 0 32px rgba(16,185,129,0.4)",
                    animation: "popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)",
                  }}
                >
                  <Check className="w-10 h-10 text-white" strokeWidth={3} />
                </div>
              </div>

              <h1 className="text-2xl font-black text-slate-900 mb-2">
                You're all set, {name.split(" ")[0]}!
              </h1>
              <p className="text-slate-500 text-sm mb-6 max-w-xs mx-auto leading-relaxed">
                {config.companyName} has your details and is preparing your quote now.
                You'll receive a text at {phone} shortly.
              </p>

              {/* Urgency */}
              <div
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl mb-6"
                style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
              >
                <Clock className="w-4 h-4 shrink-0" style={{ color: "#d97706" }} />
                <span className="text-sm font-semibold" style={{ color: "#92400e" }}>
                  Most quotes arrive in under 10 minutes
                </span>
              </div>

              {/* What happens next */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left mb-6">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4" style={{ letterSpacing: "1.2px" }}>
                  What happens next
                </p>
                {[
                  `${config.companyName} reviews your home details`,
                  "You receive your personalized quote by text",
                  "Book directly from the quote link",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                      style={{ background: primary }}
                    >
                      {i + 1}
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>

              {/* Share prompt */}
              <SharePrompt companyName={config.companyName} url={window.location.href} />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Share Prompt ─────────────────────────────────────────────────────────────

function SharePrompt({ companyName, url }: { companyName: string; url: string }) {
  const [visible, setVisible] = useState(false);
  const [shared, setShared] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 3000); return () => clearTimeout(t); }, []);
  if (!visible) return null;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Get a cleaning quote from ${companyName}`, url });
        setShared(true);
      } catch {}
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setShared(true);
    }
  };

  return (
    <div
      className="rounded-2xl border border-slate-100 shadow-sm p-5 text-center"
      style={{ animation: "slideUp 0.4s ease" }}
    >
      <p className="text-sm font-semibold text-slate-700 mb-3">Know someone who needs cleaning?</p>
      <button
        onClick={handleShare}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white transition-all"
        style={{ background: shared ? "#10b981" : "#1e293b" }}
      >
        {shared ? <><Check className="w-4 h-4" /> Shared!</> : <><Share2 className="w-4 h-4" /> Share This Link</>}
      </button>
    </div>
  );
}
