import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { apiPost, apiPut } from "../lib/api";
import { queryClient } from "../lib/queryClient";
import { Building2, DollarSign, ArrowRight, ArrowLeft, Upload, Check, Sparkles } from "lucide-react";
import AIAgentIntro from "../components/AIAgentIntro";

const STEPS = [
  { id: 1, label: "Your Business" },
  { id: 2, label: "Your Pricing" },
  { id: 3, label: "First Quote" },
];

export default function OnboardingWizardPage() {
  const { business, user, refresh, setBusiness } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [showAIIntro, setShowAIIntro] = useState(false);

  // Step 1 fields
  const [companyName, setCompanyName] = useState(business?.companyName || "");
  const [logoUri, setLogoUri] = useState<string | undefined>(business?.logoUri as string | undefined);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  // Step 2 fields
  const [minimumTicket, setMinimumTicket] = useState(150);

  const uploadLogo = async (file: File) => {
    setLogoUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setLogoUri(dataUrl);
        setLogoUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setLogoUploading(false);
    }
  };

  const handleStep1Next = async () => {
    if (!companyName.trim()) return;
    setSaving(true);
    try {
      const payload: any = { companyName: companyName.trim() };
      if (logoUri && logoUri.startsWith("data:")) {
        payload.logoUri = logoUri;
      }
      await apiPost("/api/business", payload).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } finally {
      setSaving(false);
    }
    setStep(2);
  };

  const handleStep2Next = async () => {
    setSaving(true);
    try {
      await apiPut("/api/pricing", { minimumTicket });
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
    } finally {
      setSaving(false);
    }
    setStep(3);
  };

  const handleStep3Go = async () => {
    setSaving(true);
    try {
      await apiPost("/api/business", { onboardingComplete: true }).catch(() => {});
      await refresh();
      setShowAIIntro(true);
    } finally {
      setSaving(false);
    }
  };

  const handleAIIntroComplete = async () => {
    // Ensure onboarding is saved before navigating — retry the flag write
    // in case the original call in handleStep3Go failed silently.
    await apiPost("/api/business", { onboardingComplete: true }).catch(() => {});
    // Force-update local auth state so needsOnboarding is definitely false,
    // even if the API call above failed or refresh returns stale data.
    setBusiness(business ? { ...business, onboardingComplete: true } : business);
    await refresh();
    navigate("/dashboard", { replace: true });
  };

  if (showAIIntro) {
    return <AIAgentIntro onComplete={handleAIIntroComplete} userId={user?.id || ""} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">QuotePro AI</span>
          </div>
          <p className="text-slate-400 text-sm">You're 3 steps from your first quote</p>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-0 mb-10 justify-center">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                step === s.id
                  ? "bg-blue-500 text-white"
                  : step > s.id
                  ? "bg-blue-900/50 text-blue-300"
                  : "bg-slate-800/60 text-slate-500"
              }`}>
                {step > s.id ? <Check className="w-3 h-3" /> : <span>{s.id}</span>}
                <span>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-0.5 mx-1 ${step > s.id ? "bg-blue-700" : "bg-slate-800"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 — Business Name + Logo */}
        {step === 1 && (
          <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">What's your business name?</h2>
                <p className="text-slate-400 text-sm">This appears on every quote you send</p>
              </div>
            </div>

            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Sparkling Clean Co."
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base mb-5"
              onKeyDown={(e) => e.key === "Enter" && handleStep1Next()}
              autoFocus
            />

            {/* Logo upload (optional) */}
            <div className="mb-6">
              <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wide">Logo (optional)</p>
              <div
                className="border-2 border-dashed border-slate-600 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-blue-500/50 transition-colors"
                onClick={() => logoRef.current?.click()}
              >
                {logoUri ? (
                  <img src={logoUri} alt="Logo" className="w-12 h-12 rounded-lg object-contain bg-white p-1" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-slate-500" />
                  </div>
                )}
                <div>
                  <p className="text-white text-sm font-medium">{logoUri ? "Change logo" : "Upload logo"}</p>
                  <p className="text-slate-500 text-xs">PNG, JPG — shown on your quotes</p>
                </div>
                {logoUploading && <div className="ml-auto w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
              </div>
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
              />
            </div>

            <button
              onClick={handleStep1Next}
              disabled={!companyName.trim() || saving}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center gap-2 transition-all"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {/* Step 2 — Pricing */}
        {step === 2 && (
          <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">What's your minimum for a standard house clean?</h2>
                <p className="text-slate-400 text-sm">We'll use this as your baseline pricing</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400 font-bold text-xl">$</span>
                  <input
                    type="number"
                    value={minimumTicket}
                    onChange={(e) => setMinimumTicket(Math.max(50, Math.min(5000, Number(e.target.value))))}
                    className="w-40 pl-10 pr-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white font-bold text-2xl text-center focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <input
                type="range"
                min={50}
                max={500}
                step={5}
                value={minimumTicket}
                onChange={(e) => setMinimumTicket(Number(e.target.value))}
                className="w-full accent-green-500"
              />

              <div className="flex justify-between mt-1 text-xs text-slate-500">
                <span>$50</span>
                <span className="text-green-400 font-medium">Industry avg: $120–$180</span>
                <span>$500+</span>
              </div>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-4 mb-6 text-sm text-slate-400">
              <p>QuotePro AI generates <span className="text-white font-medium">Good / Better / Best</span> quotes from this baseline. You can always refine your rates later.</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1.5 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleStep2Next}
                disabled={saving}
                className="flex-1 py-3.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold flex items-center justify-center gap-2 transition-all"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — First Quote */}
        {step === 3 && (
          <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-8 h-8 text-purple-400" />
            </div>

            <h2 className="text-white font-bold text-xl mb-2">Send your first quote</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              We've pre-filled a sample property so you can see exactly how your quotes look before sending to real clients.
            </p>

            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 mb-6 text-left">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-3">Sample property</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                {[
                  { label: "Bedrooms", value: "3" },
                  { label: "Bathrooms", value: "2" },
                  { label: "Square Feet", value: "1,800" },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-900/60 rounded-lg p-3 text-center">
                    <p className="text-white font-bold text-lg">{item.value}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-slate-500 text-xs mt-3">Standard clean · Average condition · 1-time frequency</p>
            </div>

            <button
              onClick={handleStep3Go}
              disabled={saving}
              className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold flex items-center justify-center gap-2 transition-all mb-3"
            >
              {saving
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Sparkles className="w-4 h-4" /> Build my first quote</>
              }
            </button>

            <button onClick={() => setStep(2)} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
