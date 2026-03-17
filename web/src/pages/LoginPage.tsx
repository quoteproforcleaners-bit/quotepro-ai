import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Zap, AlertCircle, CheckCircle, Eye, TrendingUp, Clock } from "lucide-react";

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

function LivePanel() {
  return (
    <div className="flex flex-col h-full px-10 py-9">
      {/* Logo */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/40">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-sm tracking-tight">QuotePro</span>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center min-h-0 py-8">
        {/* Revenue signal — bold & front-and-center */}
        <div className="mb-7">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 mb-5">
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
        <div className="space-y-2 mb-7">
          {ACTIVITY.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={`flex items-center gap-3 p-3 rounded-xl border ${item.bg} transition-all`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${item.highlight ? "bg-emerald-500/20" : "bg-white/5"}`}>
                  <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold leading-none mb-0.5 ${item.highlight ? "text-white" : "text-slate-300"}`}>
                    {item.label}
                  </div>
                  <div className="text-slate-500 text-[11px] truncate">{item.sub}</div>
                </div>
                <div className="text-[10px] text-slate-600 shrink-0">{item.time}</div>
              </div>
            );
          })}
        </div>

        {/* Quote preview card — elevated, product screenshot feel */}
        <div className="relative">
          {/* Shadow layer behind for depth */}
          <div className="absolute inset-0 translate-y-2 translate-x-1 rounded-2xl bg-blue-600/10 blur-sm" />
          <div className="absolute inset-0 translate-y-1 rounded-2xl bg-black/30" />

          {/* Main card */}
          <div className="relative rounded-2xl overflow-hidden border border-white/12 shadow-2xl shadow-black/50">
            {/* Browser bar */}
            <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2.5 border-b border-white/8">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 mx-2 h-4.5 bg-slate-700/70 rounded flex items-center px-2.5">
                <span className="text-slate-400 text-[9px] font-mono">app.quotepro.io/quotes/new</span>
              </div>
            </div>

            {/* Quote content */}
            <div className="bg-[#0d1117] p-4 space-y-3.5">
              {/* Customer header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-white text-sm font-semibold">Johnson Residence</div>
                  <div className="text-slate-400 text-xs mt-0.5">3 bed · 2 bath · 1,850 sqft · deep clean</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[9px] font-semibold uppercase tracking-wide border border-blue-500/20">
                    Recurring
                  </span>
                  <span className="text-slate-500 text-[9px]">10% discount</span>
                </div>
              </div>

              {/* Tier cards */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { tier: "Good", price: "$148", detail: "Standard" },
                  { tier: "Better", price: "$189", detail: "Deep clean", popular: true },
                  { tier: "Best", price: "$249", detail: "+ Add-ons" },
                ].map((t) => (
                  <div
                    key={t.tier}
                    className={`rounded-xl p-2.5 text-center border relative ${
                      t.popular
                        ? "bg-blue-500/20 border-blue-400/40 shadow-lg shadow-blue-500/10"
                        : "bg-white/4 border-white/8"
                    }`}
                  >
                    {t.popular && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                        <span className="px-1.5 py-0.5 bg-blue-500 rounded text-[8px] text-white font-bold whitespace-nowrap">
                          Popular
                        </span>
                      </div>
                    )}
                    <div className={`text-[9px] font-semibold uppercase tracking-wide mb-1 ${t.popular ? "text-blue-300" : "text-slate-500"}`}>
                      {t.tier}
                    </div>
                    <div className={`text-base font-bold leading-none ${t.popular ? "text-white" : "text-slate-300"}`}>
                      {t.price}
                    </div>
                    <div className={`text-[9px] mt-1 ${t.popular ? "text-blue-300/70" : "text-slate-600"}`}>
                      {t.detail}
                    </div>
                  </div>
                ))}
              </div>

              {/* Line items */}
              <div className="space-y-1.5">
                {[
                  { label: "All rooms + hallways", check: true },
                  { label: "Kitchen & bathroom deep clean", check: true },
                  { label: "Inside oven & fridge available", check: false },
                ].map((line) => (
                  <div key={line.label} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full flex items-center justify-center shrink-0 ${line.check ? "bg-emerald-500/25" : "bg-white/5"}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${line.check ? "bg-emerald-400" : "bg-slate-600"}`} />
                    </div>
                    <span className={`text-[11px] ${line.check ? "text-slate-300" : "text-slate-600"}`}>{line.label}</span>
                  </div>
                ))}
              </div>

              {/* Action bar */}
              <div className="flex items-center gap-2 pt-0.5">
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
          { value: "60 sec", label: "avg. quote time" },
          { value: "+$412", label: "revenue today" },
          { value: "3 jobs", label: "closed this week" },
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
      <div className="flex-1 flex flex-col bg-white min-w-0">
        <div className="flex items-center justify-between px-8 py-5 lg:px-10 border-b border-slate-100">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-slate-900 font-bold text-sm tracking-tight">QuotePro</span>
          </div>
          <div className="hidden lg:block" />
          <p className="text-sm text-slate-500">
            New to QuotePro?{" "}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
              Start free
            </Link>
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 lg:px-12 py-10">
          <div className="w-full max-w-[340px]">
            <div className="mb-6">
              <h1 className="text-[22px] font-bold text-slate-900 tracking-tight leading-snug">
                Sign in to continue<br />closing jobs
              </h1>
              <p className="text-slate-500 text-sm mt-1.5">Your pipeline is waiting.</p>
            </div>

            {error ? (
              <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm leading-snug">{error}</p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full h-[42px] flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 transition-colors disabled:opacity-60 shadow-sm"
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

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
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

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[42px] flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-md shadow-blue-600/25"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <p className="text-xs text-slate-400 text-center mt-6">
              By signing in you agree to our{" "}
              <span className="underline cursor-pointer hover:text-slate-600">Terms</span>{" "}
              and{" "}
              <span className="underline cursor-pointer hover:text-slate-600">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
