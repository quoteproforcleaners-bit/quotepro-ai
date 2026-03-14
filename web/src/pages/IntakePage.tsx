import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle, ChevronRight, ChevronLeft, Sparkles, Home, User, Phone, Mail, MessageSquare, Loader2, AlertCircle } from "lucide-react";

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
  addOns: Record<string, boolean>;
  notes: string | null;
  confidence: string;
  missingFields: string[];
}

const SERVICE_LABELS: Record<string, string> = {
  standard_cleaning: "Standard Cleaning",
  deep_clean: "Deep Clean",
  move_in_out: "Move-In / Move-Out",
  recurring: "Recurring Service",
  airbnb: "Airbnb / Short-Term Rental",
  post_construction: "Post-Construction",
};

const FREQ_LABELS: Record<string, string> = {
  "one-time": "One-Time",
  weekly: "Weekly",
  biweekly: "Every 2 Weeks",
  monthly: "Monthly",
};

const ADD_ON_LABELS: Record<string, string> = {
  insideFridge: "Inside Fridge",
  insideOven: "Inside Oven",
  insideCabinets: "Inside Cabinets",
  interiorWindows: "Interior Windows",
  blindsDetail: "Blinds Detail",
  baseboardsDetail: "Baseboards Detail",
  laundryFoldOnly: "Laundry Fold",
  dishes: "Dishes",
  organizationTidy: "Organization / Tidy",
};

function ProgressBar({ step }: { step: Step }) {
  const steps: Step[] = ["contact", "mode", "guided-property", "review"];
  const aiSteps: Step[] = ["contact", "mode", "ai-input", "ai-confirm", "review"];
  const all = steps;
  const idx = all.indexOf(step);
  const pct = idx < 0 ? 10 : Math.round(((idx + 1) / all.length) * 100);
  return (
    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-6">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: "var(--primary, #2563EB)" }}
      />
    </div>
  );
}

export default function IntakePage() {
  const { businessId } = useParams<{ businessId: string }>();
  const [biz, setBiz] = useState<{ companyName: string; logoUri?: string; primaryColor: string } | null>(null);
  const [bizError, setBizError] = useState(false);

  const [step, setStep] = useState<Step>("contact");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState<"ai" | "guided" | null>(null);

  // AI mode
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [fields, setFields] = useState<Fields>({
    serviceType: null, beds: null, baths: null, sqft: null, frequency: null,
    pets: null, petType: null, addOns: {}, notes: null, confidence: "low", missingFields: [],
  });

  // Guided mode
  const [gBeds, setGBeds] = useState("");
  const [gBaths, setGBaths] = useState("");
  const [gSqft, setGSqft] = useState("");
  const [gService, setGService] = useState("standard_cleaning");
  const [gFreq, setGFreq] = useState("one-time");
  const [gPets, setGPets] = useState(false);
  const [gNotes, setGNotes] = useState("");
  const [gAddOns, setGAddOns] = useState<Record<string, boolean>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const primary = biz?.primaryColor || "#2563EB";

  useEffect(() => {
    if (!businessId) return;
    fetch(`${API_BASE}/api/public/intake-business/${businessId}`)
      .then(r => r.json())
      .then(d => {
        if (d.message) setBizError(true);
        else setBiz(d);
      })
      .catch(() => setBizError(true));
  }, [businessId]);

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
        setFields({ ...fields, ...d.extracted, addOns: d.extracted.addOns || {} });
        setStep("ai-confirm");
      }
    } catch {
      // fallback to manual confirm
      setStep("ai-confirm");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit() {
    if (!name.trim()) return;
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
            pets: gPets,
            addOns: gAddOns,
            notes: gNotes || null,
          };

      const r = await fetch(`${API_BASE}/api/public/intake/${businessId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          rawText: isAi ? aiText : null,
          extractedFields,
          source: "intake_form",
        }),
      });
      if (!r.ok) throw new Error("Submit failed");
      setStep("success");
    } catch (e: any) {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (bizError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Page Not Found</h2>
          <p className="text-slate-500">This quote request link is invalid or expired.</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="w-full py-4 px-6 flex items-center gap-3 bg-white border-b border-slate-100 shadow-sm">
        {biz.logoUri ? (
          <img src={biz.logoUri} alt={biz.companyName} className="w-9 h-9 rounded-lg object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: primary }}>
            {biz.companyName.charAt(0)}
          </div>
        )}
        <span className="font-semibold text-slate-800 text-base">{biz.companyName}</span>
      </div>

      <div className="flex-1 flex items-start justify-center py-8 px-4">
        <div className="w-full max-w-lg">
          <ProgressBar step={step} />

          {/* STEP: Contact Info */}
          {step === "contact" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Request a Quote</h1>
              <p className="text-slate-500 mb-6 text-sm">Tell us how to reach you and we'll send over a personalized quote.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Name <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                      style={{ "--tw-ring-color": primary } as any}
                      placeholder="Jane Smith"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2"
                      placeholder="(555) 555-5555"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2"
                      placeholder="jane@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button
                disabled={!name.trim()}
                onClick={() => setStep("mode")}
                className="mt-6 w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
                style={btnStyle}
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP: Choose Mode */}
          {step === "mode" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">How would you like to request?</h2>
              <p className="text-slate-500 text-sm mb-6">Choose the option that's easiest for you.</p>

              <div className="space-y-3">
                <button
                  onClick={() => { setMode("ai"); setStep("ai-input"); }}
                  className="w-full p-4 rounded-xl border-2 border-slate-200 hover:border-blue-400 text-left transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${primary}15` }}>
                      <Sparkles className="w-5 h-5" style={{ color: primary }} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Describe It Your Way</p>
                      <p className="text-slate-500 text-xs mt-0.5">Type a quick description — our AI will extract the details automatically.</p>
                      <p className="text-xs mt-1.5 font-medium" style={{ color: primary }}>Fastest option</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => { setMode("guided"); setStep("guided-property"); }}
                  className="w-full p-4 rounded-xl border-2 border-slate-200 hover:border-blue-400 text-left transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-100">
                      <Home className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Step-by-Step Form</p>
                      <p className="text-slate-500 text-xs mt-0.5">Answer a few simple questions about your home and the service you need.</p>
                    </div>
                  </div>
                </button>
              </div>

              <button onClick={() => setStep("contact")} className="mt-4 w-full text-slate-400 text-sm py-2 hover:text-slate-600 flex items-center justify-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            </div>
          )}

          {/* STEP: AI Text Input */}
          {step === "ai-input" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5" style={{ color: primary }} />
                <h2 className="text-xl font-bold text-slate-900">Describe Your Job</h2>
              </div>
              <p className="text-slate-500 text-sm mb-5">Just type naturally — our AI will pick out all the details.</p>

              <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-200">
                <p className="text-xs text-slate-500 font-medium mb-1">Examples:</p>
                <p className="text-xs text-slate-600">"I need a deep clean for my 3 bed 2 bath house, about 1800 sq ft, I have 2 dogs"</p>
                <p className="text-xs text-slate-600 mt-1">"Move-out clean, apartment, 2 bedrooms, fridge and oven too"</p>
              </div>

              <textarea
                className="w-full border border-slate-200 rounded-xl p-3.5 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 min-h-[120px]"
                placeholder="Describe your home and what you need cleaned..."
                value={aiText}
                onChange={e => setAiText(e.target.value)}
              />

              <button
                disabled={!aiText.trim() || aiLoading}
                onClick={handleAiExtract}
                className="mt-4 w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                style={btnStyle}
              >
                {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <>Extract Details <Sparkles className="w-4 h-4" /></>}
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
              <p className="text-slate-500 text-sm mb-5">Here's what we extracted — feel free to adjust anything.</p>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Service Type</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={fields.serviceType || ""} onChange={e => setFields(f => ({ ...f, serviceType: e.target.value || null }))}>
                      <option value="">Unknown</option>
                      {Object.entries(SERVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Frequency</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={fields.frequency || ""} onChange={e => setFields(f => ({ ...f, frequency: e.target.value || null }))}>
                      <option value="">Unknown</option>
                      {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Bedrooms</label>
                    <input type="number" min={0} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={fields.beds ?? ""} onChange={e => setFields(f => ({ ...f, beds: e.target.value ? parseInt(e.target.value) : null }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Bathrooms</label>
                    <input type="number" min={0} step={0.5} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={fields.baths ?? ""} onChange={e => setFields(f => ({ ...f, baths: e.target.value ? parseFloat(e.target.value) : null }))} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Sq Ft</label>
                    <input type="number" min={0} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={fields.sqft ?? ""} onChange={e => setFields(f => ({ ...f, sqft: e.target.value ? parseInt(e.target.value) : null }))} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Pets</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={fields.petType || ""} onChange={e => setFields(f => ({ ...f, petType: e.target.value || null, pets: !!e.target.value && e.target.value !== "none" }))}>
                    <option value="">None / Unknown</option>
                    <option value="cat">Cat</option>
                    <option value="dog">Dog</option>
                    <option value="multiple">Multiple Pets</option>
                  </select>
                </div>

                {fields.missingFields && fields.missingFields.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs text-amber-700 font-medium">Still needed: {fields.missingFields.join(", ")}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Additional Notes</label>
                  <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" rows={2} value={fields.notes || ""} onChange={e => setFields(f => ({ ...f, notes: e.target.value || null }))} placeholder="Anything else?" />
                </div>
              </div>

              <button onClick={() => setStep("review")} className="mt-5 w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2" style={btnStyle}>
                Looks Good <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setStep("ai-input")} className="mt-2 w-full text-slate-400 text-sm py-2 hover:text-slate-600 flex items-center justify-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Edit Description
              </button>
            </div>
          )}

          {/* STEP: Guided - Property */}
          {step === "guided-property" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">About Your Home</h2>
              <p className="text-slate-500 text-sm mb-5">Help us understand your property so we can price accurately.</p>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Bedrooms</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm" value={gBeds} onChange={e => setGBeds(e.target.value)}>
                      <option value="">?</option>
                      {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Bathrooms</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm" value={gBaths} onChange={e => setGBaths(e.target.value)}>
                      <option value="">?</option>
                      {[1, 1.5, 2, 2.5, 3, 3.5, 4].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Sq Ft</label>
                    <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm" placeholder="e.g. 1500" value={gSqft} onChange={e => setGSqft(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Pets?</label>
                  <div className="flex gap-2">
                    {["No Pets", "Yes, I have pets"].map((opt, i) => (
                      <button key={opt} onClick={() => setGPets(i === 1)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${gPets === (i === 1) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Additional Notes</label>
                  <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none" rows={2} placeholder="Anything we should know? (e.g. specific rooms, accessibility)" value={gNotes} onChange={e => setGNotes(e.target.value)} />
                </div>
              </div>

              <button onClick={() => setStep("guided-service")} className="mt-5 w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2" style={btnStyle}>
                Next <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setStep("mode")} className="mt-2 w-full text-slate-400 text-sm py-2 hover:text-slate-600 flex items-center justify-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            </div>
          )}

          {/* STEP: Guided - Service */}
          {step === "guided-service" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Service Details</h2>
              <p className="text-slate-500 text-sm mb-5">What type of cleaning do you need?</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Service Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(SERVICE_LABELS).map(([k, v]) => (
                      <button key={k} onClick={() => setGService(k)} className={`py-2.5 px-3 rounded-lg border text-xs font-medium text-left transition-all ${gService === k ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">How Often?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(FREQ_LABELS).map(([k, v]) => (
                      <button key={k} onClick={() => setGFreq(k)} className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-all ${gFreq === k ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Add-Ons (optional)</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(ADD_ON_LABELS).map(([k, v]) => (
                      <button key={k} onClick={() => setGAddOns(a => ({ ...a, [k]: !a[k] }))} className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all text-left ${gAddOns[k] ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500"}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={() => setStep("review")} className="mt-5 w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2" style={btnStyle}>
                Review Request <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setStep("guided-property")} className="mt-2 w-full text-slate-400 text-sm py-2 hover:text-slate-600 flex items-center justify-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            </div>
          )}

          {/* STEP: Review */}
          {step === "review" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">Review Your Request</h2>
              <p className="text-slate-500 text-sm mb-5">Everything look right? We'll send this to {biz.companyName}.</p>

              <div className="space-y-3">
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Your Info</p>
                  <p className="text-sm text-slate-800 font-medium">{name}</p>
                  {phone && <p className="text-sm text-slate-600">{phone}</p>}
                  {email && <p className="text-sm text-slate-600">{email}</p>}
                </div>

                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Job Details</p>
                  {mode === "ai" ? (
                    <>
                      {fields.serviceType && <p className="text-sm text-slate-700"><span className="font-medium">Service:</span> {SERVICE_LABELS[fields.serviceType] || fields.serviceType}</p>}
                      {(fields.beds || fields.baths || fields.sqft) && (
                        <p className="text-sm text-slate-700">
                          {[fields.beds && `${fields.beds} bed`, fields.baths && `${fields.baths} bath`, fields.sqft && `${fields.sqft.toLocaleString()} sq ft`].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {fields.frequency && <p className="text-sm text-slate-700"><span className="font-medium">Frequency:</span> {FREQ_LABELS[fields.frequency] || fields.frequency}</p>}
                      {fields.pets && <p className="text-sm text-slate-700"><span className="font-medium">Pets:</span> {fields.petType || "Yes"}</p>}
                      {fields.notes && <p className="text-sm text-slate-600 italic">"{fields.notes}"</p>}
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-slate-700"><span className="font-medium">Service:</span> {SERVICE_LABELS[gService] || gService}</p>
                      {(gBeds || gBaths || gSqft) && (
                        <p className="text-sm text-slate-700">
                          {[gBeds && `${gBeds} bed`, gBaths && `${gBaths} bath`, gSqft && `${parseInt(gSqft).toLocaleString()} sq ft`].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      <p className="text-sm text-slate-700"><span className="font-medium">Frequency:</span> {FREQ_LABELS[gFreq]}</p>
                      {gPets && <p className="text-sm text-slate-700">Has pets</p>}
                      {Object.entries(gAddOns).filter(([, v]) => v).length > 0 && (
                        <p className="text-sm text-slate-700"><span className="font-medium">Add-ons:</span> {Object.entries(gAddOns).filter(([, v]) => v).map(([k]) => ADD_ON_LABELS[k]).join(", ")}</p>
                      )}
                      {gNotes && <p className="text-sm text-slate-600 italic">"{gNotes}"</p>}
                    </>
                  )}
                </div>
              </div>

              {submitError && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{submitError}</div>
              )}

              <button
                disabled={submitting}
                onClick={handleSubmit}
                className="mt-5 w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={btnStyle}
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : "Send My Request"}
              </button>
              <button onClick={() => setStep(mode === "ai" ? "ai-confirm" : "guided-service")} className="mt-2 w-full text-slate-400 text-sm py-2 hover:text-slate-600 flex items-center justify-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            </div>
          )}

          {/* STEP: Success */}
          {step === "success" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `${primary}15` }}>
                <CheckCircle className="w-8 h-8" style={{ color: primary }} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Request Sent!</h2>
              <p className="text-slate-500 text-sm mb-6">
                {biz.companyName} received your request and will reach out with a personalized quote shortly.
              </p>
              <div className="bg-slate-50 rounded-xl p-4 text-left space-y-1.5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">What happens next?</p>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-bold">1</span>
                  </div>
                  <p className="text-sm text-slate-600">{biz.companyName} reviews your request</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-bold">2</span>
                  </div>
                  <p className="text-sm text-slate-600">They calculate your price using their pricing settings</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-bold">3</span>
                  </div>
                  <p className="text-sm text-slate-600">You receive a personalized quote to review and accept</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
