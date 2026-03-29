import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { apiPut, apiPatch } from "../lib/api";
import { queryClient } from "../lib/queryClient";
import {
  Building2, DollarSign, ArrowRight, ArrowLeft,
  Upload, Check, Sparkles, Mail, MessageSquare,
} from "lucide-react";
import AIAgentIntro from "../components/AIAgentIntro";

const STEPS = [
  { id: 1, label: "Your Business" },
  { id: 2, label: "Save Time" },
  { id: 3, label: "Your Pricing" },
  { id: 4, label: "First Quote" },
];

const EMAIL_OPTIONS = [
  { value: "1",    label: "Email them one day before appointment" },
  { value: "2",    label: "Email them two days before appointment" },
  { value: "3",    label: "Email them three days before appointment" },
  { value: "7",    label: "Email them one week before appointment" },
  { value: "null", label: "Don't send email reminders" },
];
const SMS_OPTIONS = [
  { value: "0",    label: "Text them morning of appointment" },
  { value: "1",    label: "Text them one day before appointment" },
  { value: "2",    label: "Text them two days before appointment" },
  { value: "3",    label: "Text them three days before appointment" },
  { value: "null", label: "Don't send text reminders" },
];

function emailSubject(days: string): string {
  if (days === "null") return "";
  if (days === "0") return "Your cleaning is TODAY";
  if (days === "1") return "You've got a cleaning appointment scheduled for tomorrow";
  return `Your cleaning appointment is in ${days} days`;
}

function emailBody(days: string): string {
  if (days === "null") return "";
  const when = days === "0" ? "TODAY" : days === "1" ? "tomorrow at 09:00 AM" : `in ${days} days at 09:00 AM`;
  return `Your cleaning is scheduled ${when}. Do you want to cancel or reschedule? Con...`;
}

function smsBody(days: string): string {
  if (days === "null") return "";
  const when = days === "0" ? "TODAY" : days === "1" ? "tomorrow" : `in ${days} days`;
  const time = days === "0" ? "" : "at 09:00 AM";
  return `Your cleaning is scheduled ${when}${time ? " " + time : ""}. Contact us to cancel or reschedule.`;
}

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

  // Step 2 fields — reminder preferences
  const [emailDays, setEmailDays] = useState("3");
  const [smsDays, setSmsDays] = useState("1");

  // Step 3 fields — pricing
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
      if (logoUri && logoUri.startsWith("data:")) payload.logoUri = logoUri;
      await apiPatch("/api/business", payload).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } finally {
      setSaving(false);
    }
    setStep(2);
  };

  const handleStep2Next = async () => {
    setSaving(true);
    try {
      await apiPut("/api/reminder-preferences", {
        emailReminderDays: emailDays === "null" ? null : Number(emailDays),
        smsReminderDays: smsDays === "null" ? null : Number(smsDays),
      }).catch(() => {});
    } finally {
      setSaving(false);
    }
    setStep(3);
  };

  const handleStep3Next = async () => {
    setSaving(true);
    try {
      await apiPut("/api/pricing", { minimumTicket });
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
    } finally {
      setSaving(false);
    }
    setStep(4);
  };

  const handleStep4Go = async () => {
    setSaving(true);
    try {
      await apiPatch("/api/business", { onboardingComplete: true });
      await refresh();
      setShowAIIntro(true);
    } finally {
      setSaving(false);
    }
  };

  const handleAIIntroComplete = async () => {
    await apiPatch("/api/business", { onboardingComplete: true }).catch(() => {});
    setBusiness(business ? { ...business, onboardingComplete: true } : business);
    navigate("/dashboard", { replace: true });
  };

  if (showAIIntro) {
    return <AIAgentIntro onComplete={handleAIIntroComplete} userId={user?.id || ""} />;
  }

  const showEmailPreview = emailDays !== "null";
  const showSmsPreview = smsDays !== "null";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col items-center justify-start p-6 pt-10">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">QuotePro AI</span>
          </div>
          <p className="text-slate-400 text-sm">You're {5 - step} steps from your first quote</p>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-0 mb-8 justify-center flex-wrap gap-y-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
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
                <div className={`w-4 h-0.5 mx-0.5 ${step > s.id ? "bg-blue-700" : "bg-slate-800"}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 1 — Business Name + Logo ─────────────────────────── */}
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

            {/* Logo upload */}
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
              <input ref={logoRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            </div>

            <button
              onClick={handleStep1Next}
              disabled={!companyName.trim() || saving}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center gap-2 transition-all"
            >
              {saving
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <>Continue <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {/* ── Step 2 — Save Time (Reminder Config) ─────────────────── */}
        {step === 2 && (
          <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm">
            {/* Headline */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                <span className="text-2xl font-black text-white">Q</span>
              </div>
              <h2 className="text-white font-extrabold text-2xl leading-tight mb-3 max-w-sm mx-auto">
                Save ~9 hours per week and cut your no-shows in HALF by reminding your customers about their appointments,{" "}
                <span className="bg-blue-500/15 text-blue-300 rounded px-2 py-0.5 italic font-black">automagically.</span>
              </h2>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                QuotePro guarantees your customers will see their reminder by sending an SMS notification along with an email.
              </p>
            </div>

            {/* Dropdowns */}
            <div className="space-y-3 mb-3">
              {/* Email */}
              <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-blue-400" />
                </div>
                <select
                  value={emailDays}
                  onChange={(e) => setEmailDays(e.target.value)}
                  className="flex-1 bg-transparent text-white text-sm focus:outline-none cursor-pointer"
                >
                  {EMAIL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-slate-800 text-white">{o.label}</option>
                  ))}
                </select>
              </div>

              {/* SMS */}
              <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/50 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                </div>
                <select
                  value={smsDays}
                  onChange={(e) => setSmsDays(e.target.value)}
                  className="flex-1 bg-transparent text-white text-sm focus:outline-none cursor-pointer"
                >
                  {SMS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} className="bg-slate-800 text-white">{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-center text-slate-500 text-xs mb-5">You can change this anytime in Settings.</p>

            {/* Phone mockup preview */}
            {(showEmailPreview || showSmsPreview) && (
              <div className="relative mb-6">
                {/* Handwritten "Example" label */}
                <div className="absolute -top-2 -left-2 z-10 pointer-events-none select-none">
                  <span
                    style={{ fontFamily: "'Segoe Script', 'Brush Script MT', cursive", transform: "rotate(-12deg)", display: "block" }}
                    className="text-slate-500 text-sm"
                  >
                    Example
                  </span>
                  <svg width="40" height="20" viewBox="0 0 40 20" className="ml-4 mt-0.5 opacity-40">
                    <path d="M2 4 Q20 2 36 14" stroke="#94a3b8" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    <path d="M32 10 L36 14 L30 15" stroke="#94a3b8" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {/* Phone mockup */}
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 mx-4 shadow-xl">
                  <div className="space-y-2.5">
                    {showEmailPreview && (
                      <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/30">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Mail className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                          <span className="text-cyan-400 text-xs font-bold tracking-wider uppercase">Email</span>
                        </div>
                        <p className="text-white text-xs font-semibold mb-0.5 leading-snug">
                          {emailSubject(emailDays)}
                        </p>
                        <p className="text-slate-400 text-xs leading-snug line-clamp-2">
                          {emailBody(emailDays)}
                        </p>
                      </div>
                    )}
                    {showSmsPreview && (
                      <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/30">
                        <div className="flex items-center gap-2 mb-1.5">
                          <MessageSquare className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                          <span className="text-cyan-400 text-xs font-bold tracking-wider uppercase">Text</span>
                        </div>
                        <p className="text-slate-500 text-xs mb-0.5">+1 (610) 555-0142</p>
                        <p className="text-white text-xs leading-snug">{smsBody(smsDays)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Nav */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleStep2Next}
                disabled={saving}
                className="flex-1 py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold flex items-center justify-center gap-2 transition-all"
              >
                {saving
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <>Next <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3 — Pricing ─────────────────────────────────────── */}
        {step === 3 && (
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
              <input type="range" min={50} max={500} step={5} value={minimumTicket}
                onChange={(e) => setMinimumTicket(Number(e.target.value))}
                className="w-full accent-green-500" />
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
              <button onClick={() => setStep(2)} className="px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1.5 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleStep3Next}
                disabled={saving}
                className="flex-1 py-3.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold flex items-center justify-center gap-2 transition-all"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4 — First Quote ──────────────────────────────────── */}
        {step === 4 && (
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
              onClick={handleStep4Go}
              disabled={saving}
              className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold flex items-center justify-center gap-2 transition-all mb-3"
            >
              {saving
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Sparkles className="w-4 h-4" /> Build my first quote</>}
            </button>

            <button onClick={() => setStep(3)} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
