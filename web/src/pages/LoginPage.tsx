import { useState, useEffect, useRef, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Zap, AlertCircle, CheckCircle, Eye, TrendingUp, Clock, Search, Sparkles } from "lucide-react";

const GOOGLE_SVG = (
  <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const ACTIVITY = [
  {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    label: "Quote accepted",
    sub: "Johnson Residence · $189",
    time: "2 min ago",
    highlight: true,
  },
  {
    icon: Eye,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    label: "Customer viewed quote",
    sub: "Martinez Residence · $224",
    time: "11 min ago",
    highlight: false,
  },
  {
    icon: TrendingUp,
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
    label: "Upsell added · +$55",
    sub: "Deep clean + oven detail",
    time: "34 min ago",
    highlight: false,
  },
  {
    icon: Clock,
    color: "text-slate-400",
    bg: "bg-white/5 border-white/10",
    label: "Quote sent in 58 sec",
    sub: "Thompson Residence",
    time: "1 hr ago",
    highlight: false,
  },
];

/* ── Scenarios the AI cycles through ── */
const SCENARIOS = [
  { prompt: "3 bed, 2 bath house — biweekly clean",   client: "Johnson Residence", beds: 3, baths: 2, sqft: 1850, disc: 0.10, recurring: true,  discLabel: "10% discount" },
  { prompt: "Move-out clean, 4 bed home",              client: "Anderson Home",    beds: 4, baths: 2, sqft: 2400, disc: 0,    recurring: false, discLabel: "" },
  { prompt: "Weekly service, 2 bed apartment",         client: "Martinez Apt",    beds: 2, baths: 1, sqft: 1100, disc: 0.15, recurring: true,  discLabel: "15% discount" },
  { prompt: "Large estate, 5 beds — monthly",          client: "Wilson Estate",   beds: 5, baths: 3, sqft: 3200, disc: 0.05, recurring: true,  discLabel: "5% discount" },
  { prompt: "Studio apartment, one-time deep clean",   client: "Park Studio",     beds: 1, baths: 1, sqft: 750,  disc: 0,    recurring: false, discLabel: "" },
];

function calcScenario(s: typeof SCENARIOS[0]) {
  const base = 48 + s.beds * 18 + s.baths * 13 + s.sqft * 0.02;
  const r5 = (n: number) => Math.round(n / 5) * 5;
  return {
    good:   r5(base * (1 - s.disc)),
    better: r5(base * 1.27 * (1 - s.disc)),
    best:   r5(base * 1.68 * (1 - s.disc)),
  };
}

/* ── Chip suggestion groups ── */
const CHIP_GROUPS = [[0, 1, 2], [2, 3, 4], [1, 3, 0]];

function LivePanel() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [promptVisible, setPromptVisible] = useState(true);
  const [cardVisible,   setCardVisible]   = useState(true);
  const [chipGroupIdx,  setChipGroupIdx]  = useState(0);
  const [chipsVisible,  setChipsVisible]  = useState(true);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scenarioTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const chipTimer     = useRef<ReturnType<typeof setInterval> | null>(null);

  const scenario = SCENARIOS[scenarioIdx];
  const { good, better, best } = calcScenario(scenario);

  /* Auto-cycle scenarios every 4 s */
  useEffect(() => {
    scenarioTimer.current = setInterval(() => {
      setPromptVisible(false);
      setCardVisible(false);
      setTimeout(() => {
        setScenarioIdx((i) => (i + 1) % SCENARIOS.length);
        setPromptVisible(true);
        setCardVisible(true);
      }, 350);
    }, 4000);
    return () => { if (scenarioTimer.current) clearInterval(scenarioTimer.current); };
  }, []);

  /* Auto-cycle chips every 5 s */
  useEffect(() => {
    chipTimer.current = setInterval(() => {
      setChipsVisible(false);
      setTimeout(() => {
        setChipGroupIdx((i) => (i + 1) % CHIP_GROUPS.length);
        setChipsVisible(true);
      }, 350);
    }, 5000);
    return () => { if (chipTimer.current) clearInterval(chipTimer.current); };
  }, []);

  const handleChipClick = (idx: number) => {
    setPromptVisible(false);
    setCardVisible(false);
    setTimeout(() => {
      setScenarioIdx(idx);
      setQuery(SCENARIOS[idx].prompt);
      setPromptVisible(true);
      setCardVisible(true);
    }, 200);
  };

  const currentChips = CHIP_GROUPS[chipGroupIdx];

  return (
    <div className="flex flex-col h-full px-8 py-8">
      {/* Logo */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/40">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-sm tracking-tight">QuotePro</span>
      </div>

      <div className="flex-1 flex flex-col justify-center min-h-0 py-5 gap-4">
        {/* Headline */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-xs font-semibold tracking-wide">Live — revenue activity</span>
          </div>
          <h2 className="text-white text-[22px] font-bold leading-tight mb-2">
            Close more cleaning jobs<br />— faster.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Quote in 60 seconds. Follow up automatically. Track every dollar.
          </p>
        </div>

        {/* Live activity feed */}
        <div className="space-y-2">
          {ACTIVITY.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`flex items-center gap-3 p-3 rounded-xl border ${item.bg}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${item.highlight ? "bg-emerald-500/20" : "bg-white/5"}`}>
                  <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold leading-none mb-0.5 ${item.highlight ? "text-white" : "text-slate-300"}`}>{item.label}</div>
                  <div className="text-slate-500 text-[11px] truncate">{item.sub}</div>
                </div>
                <div className="text-[10px] text-slate-600 shrink-0">{item.time}</div>
              </div>
            );
          })}
        </div>

        {/* ── AI Pricing Search ── */}
        <div className={`rounded-2xl border transition-all duration-300 ${focused ? "border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.15)] bg-[#0f1929]" : "border-blue-500/40 shadow-[0_0_14px_rgba(59,130,246,0.20)] bg-[#0d1520]"}`}>
          <div className="px-3 pt-2.5 pb-1 flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-[10px] font-bold text-blue-400 tracking-wide uppercase">Pricing AI</span>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-slate-500 font-medium">Ready</span>
            </div>
          </div>

          <div className="px-3 pb-2.5">
            {/* Animated prompt input */}
            <div className="relative mb-2">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className="w-full bg-transparent text-sm text-white font-medium outline-none placeholder-transparent py-0.5"
                placeholder=" "
              />
              {!query && (
                <span
                  className="absolute top-0 left-0 py-0.5 text-sm text-slate-500 font-medium pointer-events-none transition-opacity duration-300 whitespace-nowrap overflow-hidden max-w-full"
                  style={{ opacity: promptVisible ? 1 : 0 }}
                >
                  {scenario.prompt}
                </span>
              )}
            </div>

            {/* Chips + Calculate button */}
            <div className="flex items-center justify-between pt-2 border-t border-white/8">
              <div
                className="flex gap-1 flex-wrap transition-opacity duration-300"
                style={{ opacity: chipsVisible ? 1 : 0 }}
              >
                {currentChips.map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleChipClick(idx)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/5 hover:bg-blue-500/15 border border-white/10 hover:border-blue-500/30 text-[10px] font-medium text-slate-400 hover:text-blue-300 rounded-full transition-all"
                  >
                    {SCENARIOS[idx].prompt.length > 22 ? SCENARIOS[idx].prompt.slice(0, 22) + "…" : SCENARIOS[idx].prompt}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="shrink-0 ml-2 inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-full transition-colors"
              >
                <Search className="w-2.5 h-2.5" />
                Calculate
              </button>
            </div>
          </div>
        </div>

        {/* ── Quote Result Card (auto-updates with scenario) ── */}
        <div
          className="relative transition-opacity duration-300"
          style={{ opacity: cardVisible ? 1 : 0 }}
        >
          <div className="absolute inset-0 translate-y-2 translate-x-1 rounded-2xl bg-blue-600/10 blur-sm" />
          <div className="absolute inset-0 translate-y-1 rounded-2xl bg-black/30" />
          <div className="relative rounded-2xl overflow-hidden border border-white/12 shadow-2xl shadow-black/50">

            {/* Browser bar */}
            <div className="bg-slate-800 px-3 py-2 flex items-center gap-2 border-b border-white/8">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 mx-2 bg-slate-700/70 rounded px-2 py-0.5">
                <span className="text-slate-400 text-[9px] font-mono">app.quotepro.io/quotes/new</span>
              </div>
            </div>

            <div className="bg-[#0d1117] p-4 space-y-3">
              {/* Client header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-white text-sm font-semibold">{scenario.client}</div>
                  <div className="text-slate-400 text-xs mt-0.5">
                    {scenario.beds} bed · {scenario.baths} bath · {scenario.sqft.toLocaleString()} sqft
                  </div>
                </div>
                {scenario.recurring ? (
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[9px] font-semibold uppercase tracking-wide border border-blue-500/20">
                      Recurring
                    </span>
                    <span className="text-slate-500 text-[9px]">{scenario.discLabel}</span>
                  </div>
                ) : null}
              </div>

              {/* Tier cards — Popular badge sits INSIDE the card (no overflow clipping issue) */}
              <div className="grid grid-cols-3 gap-1.5 pt-3">
                {[
                  { label: "GOOD",   price: good,   sub: "Standard",   pop: false },
                  { label: "BETTER", price: better, sub: "Deep clean",  pop: true  },
                  { label: "BEST",   price: best,   sub: "+ Add-ons",   pop: false },
                ].map((t) => (
                  <div
                    key={t.label}
                    className={`rounded-xl p-2.5 text-center border relative ${
                      t.pop
                        ? "bg-blue-500/20 border-blue-400/40 shadow-lg shadow-blue-500/10"
                        : "bg-white/4 border-white/8"
                    }`}
                  >
                    {t.pop && (
                      <div className="absolute -top-3 left-0 right-0 flex justify-center">
                        <span className="px-1.5 py-0.5 bg-blue-500 rounded text-[8px] text-white font-bold whitespace-nowrap leading-none">
                          Popular
                        </span>
                      </div>
                    )}
                    <div className={`text-[9px] font-semibold uppercase tracking-wide mb-1 ${t.pop ? "text-blue-300" : "text-slate-500"}`}>
                      {t.label}
                    </div>
                    <div className={`text-base font-bold tabular-nums leading-none ${t.pop ? "text-white" : "text-slate-300"}`}>
                      ${t.price}
                    </div>
                    <div className={`text-[9px] mt-1 ${t.pop ? "text-blue-300/70" : "text-slate-600"}`}>
                      {t.sub}
                    </div>
                  </div>
                ))}
              </div>

              {/* Features */}
              <div className="space-y-1.5">
                {[
                  { label: "All rooms + hallways",           on: true },
                  { label: "Kitchen & bathroom deep clean",  on: true },
                  { label: "Inside oven & fridge available", on: false },
                ].map((line) => (
                  <div key={line.label} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${line.on ? "bg-emerald-400" : "bg-slate-600"}`} />
                    <span className={`text-[11px] ${line.on ? "text-slate-300" : "text-slate-600"}`}>{line.label}</span>
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-0.5">
                <div className="flex-1 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-600/30">
                  <span className="text-white text-[11px] font-semibold">Send Quote</span>
                </div>
                <div className="h-7 px-3 bg-white/8 rounded-lg flex items-center justify-center border border-white/8">
                  <span className="text-slate-400 text-[11px]">Preview</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom stats */}
      <div className="shrink-0 flex items-center gap-5 pt-4 border-t border-white/8">
        {[
          { value: "60 sec",  label: "avg. quote time" },
          { value: `+$${better * 3}`, label: "revenue today" },
          { value: "3 jobs",  label: "closed this week" },
        ].map((s) => (
          <div key={s.label}>
            <div className="text-white font-bold text-sm">{s.value}</div>
            <div className="text-slate-600 text-[11px] mt-0.5">{s.label}</div>
          </div>
        ))}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
