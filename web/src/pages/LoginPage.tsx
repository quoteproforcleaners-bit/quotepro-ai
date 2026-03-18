import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Zap, AlertCircle } from "lucide-react";

const GOOGLE_SVG = (
  <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const BED_BASE: Record<string, number> = {
  "1": 75, "2": 95, "3": 120, "4": 150, "5": 185, "6+": 220,
};
const BATH_EXTRA: Record<string, number> = {
  "1": 0, "2": 20, "3": 40, "4": 60, "5+": 80,
};
const SQFT_EXTRA: Record<string, number> = {
  "Under 1,000": 0, "1,000 – 1,500": 15, "1,500 – 2,000": 25,
  "2,000 – 2,500": 40, "2,500 – 3,000": 55, "3,000+": 75,
};
const CLEAN_MULT: Record<string, number> = {
  "Standard Clean": 1, "Deep Clean": 1.35, "Move-Out Clean": 1.6,
};
const FREQ_DISC: Record<string, number> = {
  "One Time": 0, "Monthly": 0.05, "Biweekly": 0.10, "Weekly": 0.15,
};
const COND_EXTRA: Record<string, number> = {
  "Good Condition": 0, "Average": 20, "Needs Work": 40,
};
const PETS_EXTRA: Record<string, number> = {
  "No Pets": 0, "1–2 Pets": 15, "3+ Pets": 30,
};
const OCC_EXTRA: Record<string, number> = {
  "1–2 People": 0, "3–4 People": 10, "5+ People": 20,
};
const ADDONS = [
  { label: "+$25 Inside Fridge", price: 25 },
  { label: "+$30 Inside Oven",   price: 30 },
  { label: "+$45 Interior Windows", price: 45 },
  { label: "+$30 Laundry Fold",  price: 30 },
  { label: "+$35 Garage Sweep",  price: 35 },
  { label: "+$25 Patio / Balcony", price: 25 },
  { label: "+$40 Cabinet Interiors", price: 40 },
];

function calcQuote(
  beds: string, baths: string, sqft: string,
  cleanType: string, freq: string, cond: string,
  pets: string, occ: string, addons: Set<string>,
) {
  const base = (BED_BASE[beds] ?? 95) + (BATH_EXTRA[baths] ?? 0) + (SQFT_EXTRA[sqft] ?? 0);
  const typed = base * (CLEAN_MULT[cleanType] ?? 1) * (1 - (FREQ_DISC[freq] ?? 0));
  const extras = (COND_EXTRA[cond] ?? 0) + (PETS_EXTRA[pets] ?? 0) + (OCC_EXTRA[occ] ?? 0);
  const addonTotal = [...addons].reduce((s, k) => s + (ADDONS.find((a) => a.label === k)?.price ?? 0), 0);
  return Math.round(typed + extras + addonTotal);
}

function SField({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white/6 border border-white/12 rounded-lg px-2.5 py-1.5 text-[11px] text-white font-medium pr-6 outline-none focus:border-blue-500/60 transition-colors cursor-pointer"
        >
          {options.map((o) => <option key={o} value={o} className="bg-slate-900">{o}</option>)}
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-2.5 h-2.5 text-slate-500" fill="none" viewBox="0 0 10 6">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

function PillGroup({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</div>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
              value === o
                ? "bg-blue-600 border-blue-500 text-white shadow-sm shadow-blue-600/30"
                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function LivePanel() {
  const [beds,      setBeds]      = useState("2");
  const [baths,     setBaths]     = useState("1");
  const [sqft,      setSqft]      = useState("1,000 – 1,500");
  const [cleanType, setCleanType] = useState("Standard Clean");
  const [freq,      setFreq]      = useState("One Time");
  const [cond,      setCond]      = useState("Good Condition");
  const [pets,      setPets]      = useState("No Pets");
  const [occ,       setOcc]       = useState("1–2 People");
  const [addons,    setAddons]    = useState<Set<string>>(new Set());

  const toggleAddon = (label: string) =>
    setAddons((prev) => { const n = new Set(prev); n.has(label) ? n.delete(label) : n.add(label); return n; });

  const recommended = calcQuote(beds, baths, sqft, cleanType, freq, cond, pets, occ, addons);
  const marketLow   = Math.round(recommended * 0.87);
  const marketHigh  = Math.round(recommended * 1.10);

  return (
    <div className="flex flex-col h-full">
      {/* Logo bar */}
      <div className="shrink-0 flex items-center gap-2.5 px-8 pt-8 pb-5">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/40">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-sm tracking-tight">QuotePro</span>
      </div>

      {/* Scrollable calculator body */}
      <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {/* Header */}
        <div>
          <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Free Calculator</div>
          <div className="text-white text-lg font-bold leading-snug">Residential Price Calculator</div>
          <div className="text-slate-400 text-xs mt-1">Customize every detail — see your real quote instantly.</div>
        </div>

        {/* Live price badge */}
        <div className="flex items-center gap-3 py-2 border-b border-white/8">
          {[
            { n: "1", label: "Configure", active: true },
            { n: "2", label: "Analysis",  active: false },
            { n: "3", label: "Quote",     active: false },
          ].map((s) => (
            <div key={s.n} className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${s.active ? "bg-blue-600 border-blue-500 text-white" : "bg-transparent border-white/20 text-slate-500"}`}>
                {s.n}
              </div>
              <span className={`text-[10px] font-semibold ${s.active ? "text-blue-300" : "text-slate-600"}`}>{s.label}</span>
              {s.n !== "3" && <span className="text-slate-700 text-[10px]">—</span>}
            </div>
          ))}
          <div className="ml-auto text-right">
            <div className="text-[9px] text-slate-500 uppercase tracking-wide">Quote</div>
            <div className="text-emerald-400 font-bold text-base tabular-nums">${recommended}</div>
          </div>
        </div>

        {/* Dropdowns grid */}
        <div className="grid grid-cols-2 gap-3">
          <SField label="Bedrooms"      value={beds}      options={Object.keys(BED_BASE)}   onChange={setBeds} />
          <SField label="Bathrooms"     value={baths}     options={Object.keys(BATH_EXTRA)} onChange={setBaths} />
          <SField label="Square Footage" value={sqft}     options={Object.keys(SQFT_EXTRA)} onChange={setSqft} />
          <SField label="Cleaning Type" value={cleanType} options={Object.keys(CLEAN_MULT)} onChange={setCleanType} />
          <SField label="Frequency"     value={freq}      options={Object.keys(FREQ_DISC)}  onChange={setFreq} />
          <SField label="Condition"     value={cond}      options={Object.keys(COND_EXTRA)} onChange={setCond} />
        </div>

        {/* Pill groups */}
        <PillGroup label="Pets in Home" options={["No Pets", "1–2 Pets", "3+ Pets"]} value={pets} onChange={setPets} />
        <PillGroup label="Occupants"    options={["1–2 People", "3–4 People", "5+ People"]} value={occ} onChange={setOcc} />

        {/* Add-ons */}
        <div>
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Add-On Services</div>
          <div className="flex flex-wrap gap-1.5">
            {ADDONS.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => toggleAddon(a.label)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                  addons.has(a.label)
                    ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                    : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recommended Quote result */}
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Recommended Quote</div>
              <div className="text-white text-3xl font-bold tabular-nums leading-none">${recommended}</div>
              <div className="text-slate-400 text-[11px] mt-1">Customers typically accept quotes within this range.</div>
            </div>
            <div className="w-7 h-7 rounded-full border-2 border-emerald-500/50 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 14 14">
                <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-emerald-500/15">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Market Range</span>
            <span className="text-emerald-400 text-[11px] font-bold tabular-nums">${marketLow} – ${marketHigh}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "account_exists") {
      setError("An account with this email already exists. Please sign in with your original method.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const res = await fetch("/api/auth/google/start?platform=web", { credentials: "include" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Google sign-in is not available right now.");
        setGoogleLoading(false);
      }
    } catch {
      setError("Failed to start Google sign-in.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 bg-[#0a0f1a] flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_40%_-5%,rgba(37,99,235,0.16),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_90%_100%,rgba(37,99,235,0.07),transparent)]" />
        <div className="relative h-full overflow-y-auto">
          <LivePanel />
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col bg-slate-50 min-w-0">
        {/* Minimal header — mobile logo only, no acquisition links */}
        <div className="flex items-center px-8 py-5 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-slate-900 font-bold text-sm tracking-tight">QuotePro</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 lg:px-12 py-10">
          {/* Contained card */}
          <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-lg shadow-slate-200/60 border border-slate-200/70 px-8 py-9">

            {/* Header hierarchy */}
            <div className="mb-7">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">
                Welcome back
              </p>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                Close more jobs in minutes
              </h1>
              <p className="text-slate-500 text-sm mt-1.5">Sign in to continue</p>
            </div>

            {error ? (
              <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm leading-snug">{error}</p>
              </div>
            ) : null}

            {/* Google — full width, matches input width */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full h-[44px] flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 transition-colors disabled:opacity-60 shadow-sm"
            >
              {GOOGLE_SVG}
              {googleLoading ? "Redirecting..." : "Continue with Google"}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-slate-400">or</span>
              </div>
            </div>

            {/* Tightly grouped form */}
            <form onSubmit={handleSubmit}>
              <div className="space-y-2.5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@company.com"
                    autoComplete="email"
                    className="w-full h-[42px] px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full h-[42px] px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full h-[48px] flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-md shadow-blue-600/30"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  "Continue closing jobs"
                )}
              </button>
            </form>

            {/* Micro trust line */}
            <p className="text-center text-[11px] text-slate-400 mt-3 tracking-wide">
              Secure login&nbsp;&nbsp;•&nbsp;&nbsp;Used by cleaning businesses
            </p>

            {/* Account link — moved out of header, kept subtle */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500">
                Don't have an account?{" "}
                <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Start free
                </Link>
              </p>
              <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">Privacy Policy</a>
                {" "}&middot;{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">Terms of Use</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
