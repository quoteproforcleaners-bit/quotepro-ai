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

function QuoteMockup() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/40 border border-white/10">
        <div className="bg-slate-800/90 px-4 py-3 flex items-center gap-2 border-b border-white/10">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <div className="flex-1 mx-3">
            <div className="h-5 bg-slate-700/80 rounded-md flex items-center px-3">
              <span className="text-slate-400 text-[10px] font-mono">quotepro.app/quotes/new</span>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/60 backdrop-blur-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white/90 text-sm font-semibold">Johnson Residence</div>
              <div className="text-slate-400 text-xs mt-0.5">3 bed · 2 bath · 1,850 sqft</div>
            </div>
            <div className="px-2 py-1 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
              <span className="text-emerald-400 text-[10px] font-semibold uppercase tracking-wide">Draft</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { tier: "Good", price: "$148", popular: false },
              { tier: "Better", price: "$189", popular: true },
              { tier: "Best", price: "$249", popular: false },
            ].map((t) => (
              <div
                key={t.tier}
                className={`rounded-xl p-3 text-center border ${
                  t.popular
                    ? "bg-blue-500/20 border-blue-400/40"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <div className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${t.popular ? "text-blue-300" : "text-slate-400"}`}>
                  {t.tier}
                </div>
                <div className={`text-lg font-bold leading-none ${t.popular ? "text-white" : "text-slate-300"}`}>
                  {t.price}
                </div>
                {t.popular && (
                  <div className="mt-1.5 text-[9px] text-blue-300 font-medium">Recommended</div>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {["Standard clean of all rooms", "Kitchen & bathroom detail", "Add-ons available"].map((line) => (
              <div key={line} className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/30 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-slate-300 text-xs">{line}</span>
              </div>
            ))}
          </div>
          <div className="pt-1 flex items-center gap-2">
            <div className="flex-1 h-8 bg-blue-600/80 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-semibold">Send Quote</span>
            </div>
            <div className="h-8 px-3 bg-white/10 rounded-lg flex items-center justify-center">
              <span className="text-slate-300 text-xs">Save</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-slate-400 text-[10px] uppercase tracking-wide mb-1">Quote sent</div>
          <div className="text-white text-sm font-semibold">$189</div>
          <div className="text-slate-400 text-[10px] mt-0.5">2 min ago</div>
        </div>
        <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-slate-400 text-[10px] uppercase tracking-wide mb-1">Follow-up</div>
          <div className="text-emerald-400 text-sm font-semibold">Sent auto</div>
          <div className="text-slate-400 text-[10px] mt-0.5">AI drafted</div>
        </div>
        <div className="flex-1 bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="text-slate-400 text-[10px] uppercase tracking-wide mb-1">Revenue</div>
          <div className="text-white text-sm font-semibold">+$41</div>
          <div className="text-slate-400 text-[10px] mt-0.5">Upsell added</div>
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
      {/* Left panel — dark product preview */}
      <div className="hidden lg:flex flex-1 bg-slate-900 flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.18),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_80%,rgba(37,99,235,0.08),transparent)]" />

        <div className="relative flex flex-col h-full px-12 py-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-base tracking-tight">QuotePro</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <div className="mb-8 text-center">
              <h2 className="text-white text-xl font-semibold mb-2 leading-snug">
                Your quotes are running.<br />Your pipeline is warm.
              </h2>
              <p className="text-slate-400 text-sm">Sign back in and pick up where you left off.</p>
            </div>
            <QuoteMockup />
          </div>

          <div className="flex items-center gap-6 pt-4 border-t border-white/10">
            {[
              { value: "60 sec", label: "avg. quote time" },
              { value: "3×", label: "more jobs closed" },
              { value: "$0", label: "to get started" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-white font-bold text-base">{s.value}</div>
                <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — clean form */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex items-center justify-between px-8 py-6 lg:px-12">
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

        <div className="flex-1 flex items-center justify-center px-8 lg:px-16 pb-12">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in</h1>
              <p className="text-slate-500 text-sm mt-1.5">Welcome back to QuotePro</p>
            </div>

            {error ? (
              <div className="mb-5 flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm leading-snug">{error}</p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full h-11 flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 transition-colors disabled:opacity-60 shadow-sm"
            >
              {GOOGLE_SVG}
              {googleLoading ? "Redirecting..." : "Continue with Google"}
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-slate-400">or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-md shadow-blue-600/20 mt-1"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <p className="text-xs text-slate-400 text-center mt-8">
              By signing in you agree to our{" "}
              <span className="underline cursor-pointer">Terms</span> and{" "}
              <span className="underline cursor-pointer">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
