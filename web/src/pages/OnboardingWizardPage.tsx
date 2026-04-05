import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useSubscription, type PlanTier } from "../lib/subscription";
import { apiPut, apiPatch, apiPost } from "../lib/api";
import { queryClient } from "../lib/queryClient";
import {
  Building2, DollarSign, ArrowRight, ArrowLeft,
  Upload, Check, Sparkles, Mail, MessageSquare, Link2, Gift,
} from "lucide-react";
import AIAgentIntro from "../components/AIAgentIntro";

const PLAN_LABELS: Record<string, { name: string; price: string }> = {
  starter: { name: "Starter", price: "$19/mo" },
  growth:  { name: "Growth",  price: "$49/mo" },
  pro:     { name: "Pro",     price: "$99/mo" },
};

const STEPS = [
  { id: 1, label: "Business" },
  { id: 2, label: "Save Time" },
  { id: 3, label: "Grow" },
  { id: 4, label: "Tips" },
  { id: 5, label: "Pricing" },
  { id: 6, label: "You're all set — unlock everything" },
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
  const { business, user, refresh, setBusiness, pendingPlanIntent, consumePlanIntent } = useAuth();
  const { startCheckout, checkoutLoading } = useSubscription();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [showAIIntro, setShowAIIntro] = useState(false);
  const [showIntentModal, setShowIntentModal] = useState(false);
  const [capturedIntent, setCapturedIntent] = useState<string | null>(null);
  const [upgradeNudgeDismissed, setUpgradeNudgeDismissed] = useState(false);
  const intentConsumedRef = useRef(false);

  // Step 1 fields
  const [companyName, setCompanyName] = useState(business?.companyName || "");
  const [logoUri, setLogoUri] = useState<string | undefined>(business?.logoUri as string | undefined);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const [contactEmail, setContactEmail] = useState("");
  const isRelayEmail = (user?.email || "").endsWith("@privaterelay.appleid.com");

  // Step 2 fields — customer reminder preferences
  const [emailDays, setEmailDays] = useState("3");
  const [smsDays, setSmsDays] = useState("1");

  // Step 3 fields — Grow (Lead Link)
  const [growEmailOption, setGrowEmailOption] = useState<"skip" | "send">("skip");
  const [growSending, setGrowSending] = useState(false);

  // Step 4 fields — Tips
  const [tipsEnabled, setTipsEnabled] = useState(true);

  // Step 5 fields — pricing
  const [minimumTicket, setMinimumTicket] = useState(150);
  const [hourlyRate, setHourlyRate] = useState(55);

  useEffect(() => {
    if (step === 6 && pendingPlanIntent && !intentConsumedRef.current) {
      intentConsumedRef.current = true;
      setCapturedIntent(pendingPlanIntent);
      consumePlanIntent();
      setShowIntentModal(true);
    }
  }, [step, pendingPlanIntent, consumePlanIntent]);

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
      if (isRelayEmail && contactEmail.trim() && contactEmail.includes("@")) {
        await apiPatch("/api/auth/contact-email", { contactEmail: contactEmail.trim() }).catch(() => {});
      }
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
    if (growEmailOption === "send") {
      setGrowSending(true);
      try {
        await apiPost("/api/lead-link/send-guide-email", {}).catch(() => {});
      } finally {
        setGrowSending(false);
      }
    }
    setStep(4);
  };

  const handleStep4Next = async () => {
    setSaving(true);
    try {
      await apiPut("/api/tip-settings", { tipsEnabled, tipPercentageOptions: [18, 22, 25], tipRequestDelay: 2 }).catch(() => {});
    } finally {
      setSaving(false);
    }
    setStep(5);
  };

  const handleStep5Next = async () => {
    setSaving(true);
    try {
      await apiPut("/api/pricing", { minimumTicket, hourlyRate });
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
    } finally {
      setSaving(false);
    }
    setStep(6);
  };

  const handleStep6Go = async () => {
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
          <p className="text-slate-400 text-sm">You're {7 - step} steps from your first quote</p>
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

            {/* Contact email — only shown when Apple hides the user's real address */}
            {isRelayEmail && (
              <div className="mb-5">
                <label className="block text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wide">
                  Your email address
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="text-slate-500 text-xs mt-1.5">Apple hid your email. Add one so we can send you tips and updates.</p>
              </div>
            )}

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
                  <p className="text-slate-300 text-sm font-medium">{logoUri ? "Change logo" : "Upload logo"}</p>
                  <p className="text-slate-500 text-xs">PNG, JPG up to 2MB</p>
                </div>
              </div>
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadLogo(f);
                }}
              />
              {logoUploading && <p className="text-slate-400 text-xs mt-2">Uploading...</p>}
            </div>

            <button
              onClick={handleStep1Next}
              disabled={saving || !companyName.trim()}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold flex items-center justify-center gap-2 transition-all"
            >
              {saving
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <>Next <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {/* ── Step 2 — Save Time (Customer Reminder Config) ─────────── */}
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

        {/* ── Step 3 — Grow (Lead Link) ─────────────────────────────── */}
        {step === 3 && (
          <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm">
            {/* Headline */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/30">
                <Link2 className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-white font-extrabold text-2xl leading-tight mb-3 max-w-sm mx-auto">
                Land more appointments by allowing your website visitors to get a quote. They can request an appointment entirely on their own with your new{" "}
                <span className="bg-teal-500/15 text-teal-300 rounded px-2 py-0.5 italic font-black">QuotePro Lead Link!</span>
              </h2>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                Create a shareable link that captures leads 24/7 — embed it on your website, share it on social media, or put it in your email signature. No technical knowledge required!
              </p>
            </div>

            {/* Phone mockup — Lead Link form preview */}
            <div className="relative mb-6">
              <div className="absolute -top-2 -left-2 z-10 pointer-events-none select-none">
                <span
                  style={{ fontFamily: "'Segoe Script', 'Brush Script MT', cursive", transform: "rotate(-12deg)", display: "block" }}
                  className="text-slate-500 text-sm"
                >
                  Preview
                </span>
                <svg width="40" height="20" viewBox="0 0 40 20" className="ml-4 mt-0.5 opacity-40">
                  <path d="M2 4 Q20 2 36 14" stroke="#94a3b8" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  <path d="M32 10 L36 14 L30 15" stroke="#94a3b8" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {/* Phone shell */}
              <div className="mx-auto w-[200px] relative">
                <div className="bg-slate-800 border-2 border-slate-600 rounded-[28px] p-[6px] shadow-2xl">
                  {/* Notch */}
                  <div className="bg-slate-900 rounded-[22px] overflow-hidden" style={{ height: 260 }}>
                    <div className="flex items-center justify-center py-2 border-b border-slate-700/50">
                      <div className="w-12 h-1 bg-slate-700 rounded-full" />
                    </div>
                    {/* Step indicator */}
                    <div className="px-4 pt-3 pb-2">
                      <div className="flex items-center gap-1.5 mb-3">
                        {[1, 2, 3].map((n) => (
                          <div
                            key={n}
                            className={`h-1 flex-1 rounded-full ${n === 2 ? "bg-teal-500" : n < 2 ? "bg-teal-500/40" : "bg-slate-700"}`}
                          />
                        ))}
                      </div>
                      <p className="text-teal-400 text-[9px] font-bold uppercase tracking-wide mb-2">Step 2: Your Home</p>
                      {/* Form fields */}
                      <div className="space-y-1.5">
                        <p className="text-slate-300 text-[9px] font-semibold">Service Address</p>
                        <div className="bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5">
                          <p className="text-[8px] text-slate-500">Address Line 1</p>
                          <p className="text-[9px] text-slate-300">Street 1</p>
                        </div>
                        <div className="bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5">
                          <p className="text-[8px] text-slate-500">Address Line 2</p>
                          <p className="text-[9px] text-slate-400 italic">Street 2</p>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {["City", "State", "ZIP"].map((label) => (
                            <div key={label} className="bg-slate-800 border border-slate-600 rounded-md px-1.5 py-1.5">
                              <p className="text-[7px] text-slate-500 truncate">{label}</p>
                            </div>
                          ))}
                        </div>
                        {/* Partially visible row — cut off at bottom */}
                        <div className="bg-slate-800 border border-slate-600 rounded-md px-2 py-1.5 overflow-hidden" style={{ maxHeight: 24 }}>
                          <p className="text-[8px] text-slate-400">Is this an empty home?</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Gradient fade at bottom suggesting more content */}
                <div className="absolute bottom-[6px] left-[6px] right-[6px] h-10 rounded-b-[22px] bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />
              </div>
            </div>

            {/* Radio options */}
            <div className="space-y-3 mb-3 max-w-[480px] mx-auto">
              {/* Option 1 — Send email */}
              <button
                onClick={() => setGrowEmailOption("send")}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-[10px] border text-left transition-all ${
                  growEmailOption === "send"
                    ? "border-2 border-teal-500 bg-teal-500/[0.06]"
                    : "border border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/60"
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  growEmailOption === "send" ? "border-teal-500 bg-teal-500" : "border-slate-600 bg-transparent"
                }`}>
                  {growEmailOption === "send" && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-teal-400 flex-shrink-0" />
                  <span className="text-white text-sm font-medium">Send me an email with details and examples</span>
                </div>
              </button>

              {/* Option 2 — Maybe later (default) */}
              <button
                onClick={() => setGrowEmailOption("skip")}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-[10px] border text-left transition-all ${
                  growEmailOption === "skip"
                    ? "border-2 border-teal-500 bg-teal-500/[0.06]"
                    : "border border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/60"
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  growEmailOption === "skip" ? "border-teal-500 bg-teal-500" : "border-slate-600 bg-transparent"
                }`}>
                  {growEmailOption === "skip" && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className="text-white text-sm font-medium">Maybe later</span>
              </button>
            </div>

            <p className="text-center text-slate-500 text-xs mb-5">You can set this up anytime from your settings.</p>

            {/* Nav */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleStep3Next}
                disabled={growSending}
                className="flex-1 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-bold flex items-center justify-center gap-2 transition-all"
              >
                {growSending
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                  : <>Next <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4 — Tips ────────────────────────────────────────── */}
        {step === 4 && (
          <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
                <Gift className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-white font-extrabold text-2xl leading-tight mb-3 max-w-sm mx-auto">
                Earn more with every job using{" "}
                <span className="bg-amber-500/15 text-amber-300 rounded px-2 py-0.5 italic font-black">automated tip requests!</span>
              </h2>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">
                QuotePro sends your customers a personalized tip link 2 hours after each cleaning — so happy clients can easily leave a gratuity, no awkwardness needed.
              </p>
            </div>

            {/* Phone mockup — tip page preview */}
            <div className="relative mb-6">
              <div className="absolute -top-2 -left-2 z-10 pointer-events-none select-none">
                <span
                  style={{ fontFamily: "'Segoe Script', 'Brush Script MT', cursive", transform: "rotate(-12deg)", display: "block" }}
                  className="text-slate-500 text-sm"
                >
                  Preview
                </span>
                <svg width="40" height="20" viewBox="0 0 40 20" className="ml-4 mt-0.5 opacity-40">
                  <path d="M2 4 Q20 2 36 14" stroke="#94a3b8" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  <path d="M32 10 L36 14 L30 15" stroke="#94a3b8" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="mx-auto w-[200px] relative">
                <div className="bg-slate-800 border-2 border-slate-600 rounded-[28px] p-[6px] shadow-2xl">
                  <div className="rounded-[22px] overflow-hidden" style={{ height: 260 }}>
                    {/* Header bar */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-3 pt-3 pb-4 text-center">
                      <div className="flex items-center justify-center py-1.5 mb-1">
                        <div className="w-10 h-1 bg-white/20 rounded-full" />
                      </div>
                      <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center mx-auto mb-1.5">
                        <Gift className="w-3.5 h-3.5 text-white" />
                      </div>
                      <p className="text-white text-[8px] font-bold">Pristine Home Cleaning</p>
                      <p className="text-blue-200 text-[7px]">Thanks! Your home looks great.</p>
                    </div>
                    {/* Body */}
                    <div className="bg-white px-3 py-2.5">
                      <p className="text-slate-700 text-[8px] font-semibold text-center mb-2">Leave a tip for your crew</p>
                      <div className="grid grid-cols-3 gap-1 mb-2">
                        {[{ pct: "18%", amt: "$27" }, { pct: "22%", amt: "$33" }, { pct: "25%", amt: "$37" }].map((t, i) => (
                          <div
                            key={i}
                            className={`rounded-lg py-1.5 text-center border ${i === 1 ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}
                          >
                            <p className={`text-[8px] font-bold ${i === 1 ? "text-blue-700" : "text-slate-700"}`}>{t.amt}</p>
                            <p className={`text-[6px] ${i === 1 ? "text-blue-400" : "text-slate-400"}`}>{t.pct}</p>
                          </div>
                        ))}
                      </div>
                      <div className="bg-blue-600 rounded-lg py-1.5 text-center">
                        <p className="text-white text-[8px] font-bold">Send $33 tip</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enable toggle */}
            <div className="max-w-[480px] mx-auto mb-3">
              <button
                onClick={() => setTipsEnabled(!tipsEnabled)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-[10px] border-2 text-left transition-all ${
                  tipsEnabled ? "border-amber-500 bg-amber-500/[0.06]" : "border-slate-700/50 bg-slate-800/40"
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  tipsEnabled ? "border-amber-500 bg-amber-500" : "border-slate-600 bg-transparent"
                }`}>
                  {tipsEnabled && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Enable automated tip requests</p>
                  <p className="text-slate-400 text-xs mt-0.5">Sent 2 hours after each completed job</p>
                </div>
              </button>
            </div>

            <p className="text-center text-slate-500 text-xs mb-5">You can customize tip percentages and timing in Settings.</p>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleStep4Next}
                disabled={saving}
                className="flex-1 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold flex items-center justify-center gap-2 transition-all"
              >
                {saving
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <>Next <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5 — Pricing ─────────────────────────────────────── */}
        {step === 5 && (
          <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Set your pricing rates</h2>
                <p className="text-slate-400 text-sm">These drive the quote calculator — you can refine them later</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-slate-300 font-semibold text-sm mb-3">What's your minimum for a standard house clean?</p>
              <div className="flex items-center justify-center mb-3">
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

            <div className="mb-6">
              <p className="text-slate-300 font-semibold text-sm mb-3">What's your hourly labor rate?</p>
              <div className="flex items-center justify-center mb-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400 font-bold text-xl">$</span>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Math.max(10, Math.min(500, Number(e.target.value))))}
                    className="w-40 pl-10 pr-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white font-bold text-2xl text-center focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">/hr</span>
                </div>
              </div>
              <input type="range" min={20} max={150} step={5} value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-full accent-green-500" />
              <div className="flex justify-between mt-1 text-xs text-slate-500">
                <span>$20/hr</span>
                <span className="text-green-400 font-medium">Industry avg: $45–$75/hr</span>
                <span>$150/hr</span>
              </div>
              <p className="text-slate-500 text-xs mt-2">This drives the Good / Better / Best quote calculator. You can update it anytime in Settings.</p>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-4 mb-6 text-sm text-slate-400">
              <p>QuotePro AI generates <span className="text-white font-medium">Good / Better / Best</span> quotes from these rates. You can always refine them later.</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(4)} className="px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1.5 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleStep5Next}
                disabled={saving}
                className="flex-1 py-3.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold flex items-center justify-center gap-2 transition-all"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 6 — First Quote ──────────────────────────────────── */}
        {step === 6 && (
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
              onClick={handleStep6Go}
              disabled={saving}
              className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold flex items-center justify-center gap-2 transition-all mb-3"
            >
              {saving
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Sparkles className="w-4 h-4" /> Build my first quote</>}
            </button>

            {/* ── Upgrade nudge card ── */}
            {!upgradeNudgeDismissed && (
              <div className="mt-5 rounded-xl border border-violet-500/30 bg-violet-500/10 p-5 text-left">
                <p className="text-white font-bold text-sm mb-1">
                  Upgrade to Growth and get more from day one
                </p>
                <p className="text-slate-400 text-xs leading-relaxed mb-4">
                  Unlimited quotes, AI follow-up, Lead Link, and appointment reminders — $49/mo or $41/mo annual.
                </p>
                <button
                  onClick={() => startCheckout("growth", "monthly")}
                  disabled={checkoutLoading}
                  className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all mb-3"
                >
                  {checkoutLoading
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    : "Upgrade to Growth"}
                </button>
                <button
                  onClick={() => setUpgradeNudgeDismissed(true)}
                  className="w-full text-slate-500 hover:text-slate-300 text-xs transition-colors text-center"
                >
                  Continue on free trial
                </button>
              </div>
            )}

            <button onClick={() => setStep(5)} className="text-slate-500 hover:text-slate-300 text-sm transition-colors mt-4">
              Back
            </button>
          </div>
        )}
      </div>

      {/* ── Intent modal overlay ──────────────────────────────────── */}
      {showIntentModal && (() => {
        const plan = pendingPlanIntent && PLAN_LABELS[pendingPlanIntent]
          ? pendingPlanIntent
          : "growth";
        const { name, price } = PLAN_LABELS[plan] || PLAN_LABELS.growth;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-blue-400" />
              </div>
              <h2 className="text-white font-bold text-lg mb-2">
                Complete your {name} setup
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                You were setting up {name} — activate it now to unlock unlimited quotes and AI follow-ups.
              </p>
              <button
                onClick={() => {
                  setShowIntentModal(false);
                  startCheckout(plan as PlanTier);
                }}
                disabled={checkoutLoading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold mb-3 transition-all"
              >
                {checkoutLoading
                  ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : `Activate ${name} (${price})`}
              </button>
              <button
                onClick={() => {
                  setShowIntentModal(false);
                  navigate("/dashboard");
                }}
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
