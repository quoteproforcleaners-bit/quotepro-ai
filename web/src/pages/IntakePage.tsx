import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  CheckCircle, ChevronRight, ChevronLeft, Sparkles, Home, User, Phone,
  Mail, MessageSquare, Loader2, AlertCircle, MapPin, AlertTriangle, HelpCircle,
} from "lucide-react";

const API_BASE = typeof window !== "undefined" ? window.location.origin : "";

type Step = "contact" | "mode" | "ai-input" | "ai-confirm" | "guided-property" | "guided-service" | "review" | "success";

interface Fields {
  serviceType: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  frequency: string | null;
  pets: boolean | null;
  petType: string | null;
  address: string | null;
  addOns: Record<string, boolean>;
  notes: string | null;
  confidence: string;
  missingFields: string[];
  clarificationQuestions: string[];
}

const SERVICE_OPTIONS = [
  { value: "standard_cleaning", label: "Standard Cleaning", desc: "Regular whole-home cleaning" },
  { value: "deep_clean", label: "Deep Clean", desc: "Thorough first-time or catch-up clean" },
  { value: "move_in_out", label: "Move-In / Move-Out", desc: "Move-ready detailed cleaning" },
  { value: "airbnb", label: "Airbnb / Short-Term Rental", desc: "Quick turnover between guests" },
  { value: "post_construction", label: "Post-Construction", desc: "Heavy-duty post-build cleanup" },
  { value: "recurring", label: "Recurring Service", desc: "Scheduled ongoing cleaning" },
];

const SERVICE_LABELS: Record<string, string> = Object.fromEntries(SERVICE_OPTIONS.map(s => [s.value, s.label]));

const FREQ_OPTIONS = [
  { value: "one-time", label: "Just once" },
  { value: "weekly", label: "Every week" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

const FREQ_LABELS: Record<string, string> = Object.fromEntries(FREQ_OPTIONS.map(f => [f.value, f.label]));

const ADD_ON_OPTIONS = [
  { key: "insideFridge", label: "Inside Fridge" },
  { key: "insideOven", label: "Inside Oven" },
  { key: "insideCabinets", label: "Inside Cabinets" },
  { key: "interiorWindows", label: "Interior Windows" },
  { key: "blindsDetail", label: "Blinds Detail" },
  { key: "baseboardsDetail", label: "Baseboards Detail" },
  { key: "laundryFoldOnly", label: "Laundry Fold" },
  { key: "dishes", label: "Dishes" },
  { key: "organizationTidy", label: "Organization" },
];

function ProgressBar({ step, mode }: { step: Step; mode: "ai" | "guided" | null }) {
  const guidedSteps: Step[] = ["contact", "mode", "guided-property", "guided-service", "review"];
  const aiSteps: Step[] = ["contact", "mode", "ai-input", "ai-confirm", "review"];
  const steps = mode === "ai" ? aiSteps : guidedSteps;
  const idx = steps.indexOf(step);
  const pct = step === "success" ? 100 : idx < 0 ? 10 : Math.round(((idx + 1) / steps.length) * 100);
  return (
    <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden mb-5">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "var(--primary)" }} />
    </div>
  );
}

function ConfidenceAlert({ confidence, missingFields, clarificationQuestions }: {
  confidence: string;
  missingFields: string[];
  clarificationQuestions: string[];
}) {
  if (confidence === "high" && missingFields.length === 0) {
    return (
      <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <p className="text-sm text-emerald-700 font-medium">All key details extracted — looks complete</p>
      </div>
    );
  }
  if (confidence === "low" || missingFields.length >= 3) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
        <div className="flex items-start gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 font-semibold">Some details were unclear</p>
        </div>
        {missingFields.length > 0 && (
          <p className="text-xs text-amber-700 mb-2">Still needed: <span className="font-medium">{missingFields.join(", ")}</span></p>
        )}
        {clarificationQuestions.length > 0 && (
          <div className="space-y-1">
            {clarificationQuestions.map((q, i) => (
              <p key={i} className="text-xs text-amber-700 flex items-start gap-1">
                <span className="font-bold flex-shrink-0">{i + 1}.</span> {q}
              </p>
            ))}
          </div>
        )}
        <p className="text-xs text-amber-600 mt-2 italic">You can fill in or correct any fields below.</p>
      </div>
    );
  }
  if (missingFields.length > 0) {
    return (
      <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4">
        <HelpCircle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs text-slate-600 font-medium mb-0.5">We could use a bit more info:</p>
          <p className="text-xs text-slate-500">{missingFields.join(", ")}</p>
        </div>
      </div>
    );
  }
  return null;
}

export default function IntakePage() {
  const { businessId } = useParams<{ businessId: string }>();
  const [biz, setBiz] = useState<{ companyName: string; logoUri?: string; primaryColor: string } | null>(null);
  const [bizError, setBizError] = useState(false);

  const [step, setStep] = useState<Step>("contact");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [mode, setMode] = useState<"ai" | "guided" | null>(null);
  const [contactError, setContactError] = useState("");

  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [fields, setFields] = useState<Fields>({
    serviceType: null, beds: null, baths: null, sqft: null, frequency: null,
    pets: null, petType: null, address: null, addOns: {}, notes: null,
    confidence: "low", missingFields: [], clarificationQuestions: [],
  });

  const [gBeds, setGBeds] = useState("");
  const [gBaths, setGBaths] = useState("");
  const [gSqft, setGSqft] = useState("");
  const [gService, setGService] = useState("standard_cleaning");
  const [gFreq, setGFreq] = useState("one-time");
  const [gPets, setGPets] = useState<"no" | "yes">("no");
  const [gPetType, setGPetType] = useState("");
  const [gNotes, setGNotes] = useState("");
  const [gAddOns, setGAddOns] = useState<Record<string, boolean>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const primary = biz?.primaryColor || "#2563EB";

  useEffect(() => {
    if (!businessId) return;
    fetch(`${API_BASE}/api/public/intake-business/${businessId}`)
      .then(r => r.json())
      .then(d => { if (d.message) setBizError(true); else setBiz(d); })
      .catch(() => setBizError(true));
  }, [businessId]);

  useEffect(() => {
    document.documentElement.style.setProperty("--primary", primary);
  }, [primary]);

  function validateContact() {
    if (!name.trim()) { setContactError("Your name is required."); return false; }
    if (!email.trim() && !phone.trim()) { setContactError("Please provide at least a phone number or email address."); return false; }
    setContactError("");
    return true;
  }

  async function handleAiExtract() {
    if (!aiText.trim()) return;
    setAiLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/public/intake/${businessId}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiText }),
      });
      const d = await r.json();
      if (d.extracted) {
        setFields(prev => ({
          ...prev,
          ...d.extracted,
          addOns: d.extracted.addOns || {},
          clarificationQuestions: d.extracted.clarificationQuestions || [],
          missingFields: d.extracted.missingFields || [],
        }));
      }
      setStep("ai-confirm");
    } catch {
      setStep("ai-confirm");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const isAi = mode === "ai";
      const extractedFields = isAi
        ? fields
        : {
            serviceType: gService,
            beds: gBeds ? parseInt(gBeds) : null,
            baths: gBaths ? parseFloat(gBaths) : null,
            sqft: gSqft ? parseInt(gSqft) : null,
            frequency: gFreq,
            pets: gPets === "yes",
            petType: gPetType || (gPets === "yes" ? "dog" : null),
            address: address || null,
            addOns: gAddOns,
            notes: gNotes || null,
            confidence: gBeds && gBaths && gSqft ? "high" : "medium",
            missingFields: [
              !gBeds ? "number of bedrooms" : null,
              !gBaths ? "number of bathrooms" : null,
              !gSqft ? "square footage" : null,
            ].filter(Boolean) as string[],
          };

      const r = await fetch(`${API_BASE}/api/public/intake/${businessId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          customerAddress: address,
          rawText: isAi ? aiText : null,
          extractedFields,
          source: "intake_form",
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || "Submit failed");
      }
      setStep("success");
    } catch (e: any) {
      setSubmitError(e.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (bizError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center p-8 max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Link Not Found</h2>
          <p className="text-slate-500 text-sm">This quote request link is invalid or has expired. Please contact the business directly.</p>
        </div>
      </div>
    );
  }

  if (!biz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const btnStyle: React.CSSProperties = { background: primary };
  const ringStyle: React.CSSProperties = { "--tw-ring-color": primary } as any;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <div className="w-full py-3.5 px-5 flex items-center gap-3 bg-white border-b border-slate-100 shadow-sm sticky top-0 z-10">
        {biz.logoUri ? (
          <img src={biz.logoUri} alt={biz.companyName} className="w-8 h-8 rounded-lg object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: primary }}>
            {biz.companyName.charAt(0)}
          </div>
        )}
        <span className="font-semibold text-slate-800 text-sm">{biz.companyName}</span>
        <div className="ml-auto">
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Free Quote</span>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center py-6 px-4">
        <div className="w-full max-w-md">
          <ProgressBar step={step} mode={mode} />

          {/* STEP: Contact */}
          {step === "contact" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Request a Free Quote</h1>
              <p className="text-slate-500 mb-5 text-sm">Just a few details — we'll prepare a personalized estimate for you.</p>
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Your Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                      style={ringStyle}
                      placeholder="Jane Smith"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                      style={ringStyle}
                      placeholder="(555) 555-5555"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                      style={ringStyle}
                      placeholder="jane@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Home Address <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                      style={ringStyle}
                      placeholder="123 Main St, City, State"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {contactError && (
                <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <p className="text-xs font-medium">{contactError}</p>
                </div>
              )}
              <button
                onClick={() => { if (validateContact()) setStep("mode"); }}
                className="mt-5 w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-opacity active:opacity-80"
                style={btnStyle}
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP: Mode */}
          {step === "mode" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">How would you like to share details?</h2>
              <p className="text-slate-500 text-sm mb-5">Choose what's easiest for you — either works.</p>
              <div className="space-y-3">
                <button
                  onClick={() => { setMode("ai"); setStep("ai-input"); }}
                  className="w-full p-4 rounded-xl border-2 border-slate-200 hover:border-blue-400 text-left transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${primary}15` }}>
                      <Sparkles className="w-5 h-5" style={{ color: primary }} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Describe it in your own words</p>
                      <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">Type a quick description and our AI will pull out the details automatically.</p>
                      <p className="text-xs mt-2 font-semibold" style={{ color: primary }}>Fastest option</p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => { setMode("guided"); setStep("guided-property"); }}
                  className="w-full p-4 rounded-xl border-2 border-slate-200 hover:border-blue-400 text-left transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-100">
                      <Home className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Answer a few quick questions</p>
                      <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">Step-by-step form — takes about 90 seconds.</p>
                    </div>
                  </div>
                </button>
              </div>
              <button onClick={() => setStep("contact")} className="mt-4 w-full text-slate-400 text-sm py-2.5 hover:text-slate-600 flex items-center justify-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            </div>
          )}

          {/* STEP: AI Input */}
          {step === "ai-input" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5" style={{ color: primary }} />
                <h2 className="text-xl font-bold text-slate-900">Describe Your Job</h2>
              </div>
              <p className="text-slate-500 text-sm mb-4">Type naturally — our AI picks out all the details for you.</p>

              <div className="bg-slate-50 rounded-xl p-3.5 mb-4 border border-slate-100">
                <p className="text-xs text-slate-500 font-semibold mb-1.5">Examples:</p>
                <p className="text-xs text-slate-600 leading-relaxed">"3 bed 2 bath house, about 1800 sq ft, I have 2 dogs, need a deep clean"</p>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">"Move-out clean for my apartment, 2 bedrooms, want fridge and oven cleaned too"</p>
              </div>

              <textarea
                className="w-full border border-slate-200 rounded-xl p-3.5 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 min-h-[130px]"
                style={ringStyle}
                placeholder="Describe your home and what you need cleaned..."
                value={aiText}
                onChange={e => setAiText(e.target.value)}
              />

              <button
                disabled={!aiText.trim() || aiLoading}
                onClick={handleAiExtract}
                className="mt-4 w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
                style={btnStyle}
              >
                {aiLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing your request...</>
                  : <>Extract Details <Sparkles className="w-4 h-4" /></>}
              </button>
              <button onClick={() => setStep("mode")} className="mt-3 w-full text-slate-400 text-sm py-2 hover:text-slate-600 flex items-center justify-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            </div>
          )}

          {/* STEP: AI Confirm */}
          {step === "ai-confirm" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Confirm Your Details</h2>
              <p className="text-slate-500 text-sm mb-4">Here's what we found — please fix anything that looks off.</p>

              <ConfidenceAlert
                confidence={fields.confidence}
                missingFields={fields.missingFields}
                clarificationQuestions={fields.clarificationQuestions}
              />

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Service Type
                      {!fields.serviceType ? <span className="ml-1.5 text-amber-500 font-normal">— not detected</span> : null}
                    </label>
                    <select
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                      style={{ ...ringStyle, borderColor: !fields.serviceType ? "#FCD34D" : undefined }}
                      value={fields.serviceType || ""}
                      onChange={e => setFields(f => ({ ...f, serviceType: e.target.value || null }))}
                    >
                      <option value="">Unknown</option>
                      {SERVICE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      How Often
                      {!fields.frequency ? <span className="ml-1.5 text-amber-500 font-normal">— not detected</span> : null}
                    </label>
                    <select
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                      style={{ ...ringStyle, borderColor: !fields.frequency ? "#FCD34D" : undefined }}
                      value={fields.frequency || ""}
                      onChange={e => setFields(f => ({ ...f, frequency: e.target.value || null }))}
                    >
                      <option value="">Unknown</option>
                      {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Bedrooms", key: "beds" as const, val: fields.beds, type: "int" },
                    { label: "Bathrooms", key: "baths" as const, val: fields.baths, type: "float" },
                    { label: "Sq Ft", key: "sqft" as const, val: fields.sqft, type: "int" },
                  ].map(({ label, key, val, type }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                        {label}
                        {val == null ? <span className="ml-1 text-amber-500 font-normal">?</span> : null}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={type === "float" ? 0.5 : 1}
                        className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                        style={{ ...ringStyle, borderColor: val == null ? "#FCD34D" : "#E2E8F0" }}
                        placeholder={val == null ? "?" : ""}
                        value={val ?? ""}
                        onChange={e => setFields(f => ({ ...f, [key]: e.target.value ? (type === "float" ? parseFloat(e.target.value) : parseInt(e.target.value)) : null }))}
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pets</label>
                    <select
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                      style={ringStyle}
                      value={fields.petType || ""}
                      onChange={e => setFields(f => ({ ...f, petType: e.target.value || null, pets: !!e.target.value && e.target.value !== "none" }))}
                    >
                      <option value="">No pets / unknown</option>
                      <option value="cat">Cat(s)</option>
                      <option value="dog">Dog(s)</option>
                      <option value="multiple">Multiple pets</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Address (optional)</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                        style={ringStyle}
                        placeholder="Home address"
                        value={fields.address || address || ""}
                        onChange={e => setFields(f => ({ ...f, address: e.target.value || null }))}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Anything else we should know?</label>
                  <textarea
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2"
                    style={ringStyle}
                    rows={2}
                    placeholder="Special requests, access notes, specific rooms..."
                    value={fields.notes || ""}
                    onChange={e => setFields(f => ({ ...f, notes: e.target.value || null }))}
                  />
                </div>
              </div>

              <button
                onClick={() => setStep("review")}
                className="mt-5 w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
                style={btnStyle}
              >
                Looks Good <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setStep("ai-input")} className="mt-2.5 w-full text-slate-400 text-sm py-2 hover:text-slate-600 flex items-center justify-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Edit My Description
              </button>
            </div>
          )}

          {/* STEP: Guided - Property */}
          {step === "guided-property" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">About Your Home</h2>
              <p className="text-slate-500 text-sm mb-5">This helps us price your cleaning accurately.</p>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bedrooms</label>
                    <select
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                      style={ringStyle}
                      value={gBeds}
                      onChange={e => setGBeds(e.target.value)}
                    >
                      <option value="">?</option>
                      {[1,2,3,4,5,6,7].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bathrooms</label>
                    <select
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                      style={ringStyle}
                      value={gBaths}
                      onChange={e => setGBaths(e.target.value)}
                    >
                      <option value="">?</option>
                      {[1,1.5,2,2.5,3,3.5,4,4.5,5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Sq Ft
                      <span className="text-slate-400 font-normal"> (approx)</span>
                    </label>
                    <input
                      type="number"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                      style={ringStyle}
                      placeholder="e.g. 1500"
                      value={gSqft}
                      onChange={e => setGSqft(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Do you have pets?</label>
                  <div className="flex gap-2">
                    {[{ val: "no", label: "No pets" }, { val: "yes", label: "Yes, I have pets" }].map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => { setGPets(opt.val as "no" | "yes"); if (opt.val === "no") setGPetType(""); }}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${gPets === opt.val ? "text-blue-700 bg-blue-50" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                        style={gPets === opt.val ? { borderColor: primary, backgroundColor: primary + "10", color: primary } : {}}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {gPets === "yes" && (
                    <select
                      className="mt-2 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                      style={ringStyle}
                      value={gPetType}
                      onChange={e => setGPetType(e.target.value)}
                    >
                      <option value="">What type of pet?</option>
                      <option value="cat">Cat(s)</option>
                      <option value="dog">Dog(s)</option>
                      <option value="multiple">Multiple pets</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes <span className="font-normal text-slate-400">(optional)</span></label>
                  <textarea
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2"
                    style={ringStyle}
                    rows={2}
                    placeholder="Anything specific? (clutter level, accessibility, key rooms...)"
                    value={gNotes}
                    onChange={e => setGNotes(e.target.value)}
                  />
                </div>
              </div>

              <button
                onClick={() => setStep("guided-service")}
                className="mt-5 w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-opacity"
                style={btnStyle}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setStep("mode")} className="mt-2.5 w-full text-slate-400 text-sm py-2 hover:text-slate-600 flex items-center justify-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            </div>
          )}

          {/* STEP: Guided - Service */}
          {step === "guided-service" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">What Type of Cleaning?</h2>
              <p className="text-slate-500 text-sm mb-4">Select the service that best fits your situation.</p>

              <div className="grid grid-cols-1 gap-2 mb-4">
                {SERVICE_OPTIONS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setGService(s.value)}
                    className={`w-full p-3.5 rounded-xl border-2 text-left transition-all`}
                    style={gService === s.value ? { borderColor: primary, backgroundColor: primary + "08" } : { borderColor: "#E2E8F0" }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{s.label}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{s.desc}</p>
                      </div>
                      {gService === s.value && <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: primary }} />}
                    </div>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">How often?</label>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {FREQ_OPTIONS.map(f => (
                    <button
                      key={f.value}
                      onClick={() => setGFreq(f.value)}
                      className="py-2.5 rounded-xl border-2 text-sm font-medium transition-all"
                      style={gFreq === f.value ? { borderColor: primary, backgroundColor: primary + "10", color: primary } : { borderColor: "#E2E8F0", color: "#475569" }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Any add-ons? <span className="font-normal text-slate-400">(optional)</span></label>
                <div className="flex flex-wrap gap-2">
                  {ADD_ON_OPTIONS.map(ao => (
                    <button
                      key={ao.key}
                      onClick={() => setGAddOns(prev => ({ ...prev, [ao.key]: !prev[ao.key] }))}
                      className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                      style={gAddOns[ao.key]
                        ? { borderColor: primary, backgroundColor: primary + "15", color: primary }
                        : { borderColor: "#E2E8F0", color: "#64748B" }
                      }
                    >
                      {ao.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep("review")}
                className="mt-5 w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2"
                style={btnStyle}
              >
                Review Request <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setStep("guided-property")} className="mt-2.5 w-full text-slate-400 text-sm py-2 hover:text-slate-600 flex items-center justify-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            </div>
          )}

          {/* STEP: Review */}
          {step === "review" && (() => {
            const isAi = mode === "ai";
            const reviewService = isAi ? fields.serviceType : gService;
            const reviewFreq = isAi ? fields.frequency : gFreq;
            const reviewBeds = isAi ? fields.beds : (gBeds ? parseInt(gBeds) : null);
            const reviewBaths = isAi ? fields.baths : (gBaths ? parseFloat(gBaths) : null);
            const reviewSqft = isAi ? fields.sqft : (gSqft ? parseInt(gSqft) : null);
            const reviewPets = isAi ? fields.petType : (gPets === "yes" ? gPetType || "dog" : null);
            const reviewAddOns = isAi ? fields.addOns : gAddOns;
            const reviewNotes = isAi ? fields.notes : gNotes;
            const enabledAddOns = Object.entries(reviewAddOns || {}).filter(([, v]) => v).map(([k]) => ADD_ON_OPTIONS.find(a => a.key === k)?.label || k);

            return (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-1">Review Your Request</h2>
                <p className="text-slate-500 text-sm mb-5">Confirm everything looks right before submitting.</p>

                <div className="space-y-2 mb-5">
                  <div className="flex items-center gap-2 py-2.5 border-b border-slate-100">
                    <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm text-slate-700 flex-1">{name}</span>
                  </div>
                  {phone && (
                    <div className="flex items-center gap-2 py-2.5 border-b border-slate-100">
                      <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{phone}</span>
                    </div>
                  )}
                  {email && (
                    <div className="flex items-center gap-2 py-2.5 border-b border-slate-100">
                      <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{email}</span>
                    </div>
                  )}
                  {(reviewBeds || reviewBaths || reviewSqft) && (
                    <div className="flex items-center gap-2 py-2.5 border-b border-slate-100">
                      <Home className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-700">
                        {[reviewBeds && `${reviewBeds} bed`, reviewBaths && `${reviewBaths} bath`, reviewSqft && `${reviewSqft.toLocaleString()} sqft`].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                  )}
                  {reviewService && (
                    <div className="flex items-center gap-2 py-2.5 border-b border-slate-100">
                      <Sparkles className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-700">{SERVICE_LABELS[reviewService] || reviewService}</span>
                      {reviewFreq && <span className="text-xs text-slate-400 ml-auto">{FREQ_LABELS[reviewFreq] || reviewFreq}</span>}
                    </div>
                  )}
                  {enabledAddOns.length > 0 && (
                    <div className="py-2.5 border-b border-slate-100">
                      <div className="flex flex-wrap gap-1.5">
                        {enabledAddOns.map(a => (
                          <span key={a} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {reviewNotes && (
                    <div className="flex items-start gap-2 py-2.5">
                      <MessageSquare className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700 italic">"{reviewNotes}"</span>
                    </div>
                  )}
                </div>

                {submitError && (
                  <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-3 py-2.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-xs font-medium">{submitError}</p>
                  </div>
                )}

                <button
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="w-full py-3.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style={btnStyle}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {submitting ? "Submitting..." : "Submit My Request"}
                </button>
                <button
                  onClick={() => setStep(mode === "ai" ? "ai-confirm" : "guided-service")}
                  className="mt-2.5 w-full text-slate-400 text-sm py-2 hover:text-slate-600 flex items-center justify-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              </div>
            );
          })()}

          {/* STEP: Success */}
          {step === "success" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: primary + "15" }}>
                <CheckCircle className="w-8 h-8" style={{ color: primary }} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Request Received</h2>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                Thank you, <strong>{name.split(" ")[0]}</strong>! Your quote request has been sent to {biz.companyName}. They'll review your details and follow up shortly.
              </p>
              <div className="bg-slate-50 rounded-xl p-4 text-left">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">What happens next</p>
                {[
                  "Your request is reviewed by the team",
                  "A personalized quote is prepared",
                  "You'll be contacted via " + (phone ? "phone/text" : "email"),
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 mb-2 last:mb-0">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{ background: primary }}>
                      {i + 1}
                    </div>
                    <p className="text-sm text-slate-600">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
