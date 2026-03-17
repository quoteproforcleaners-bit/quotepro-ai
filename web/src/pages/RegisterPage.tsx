import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Zap, AlertCircle, Check } from "lucide-react";

const GOOGLE_SVG = (
  <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const TRUST_POINTS = [
  "Good/Better/Best quotes in under 60 seconds",
  "AI follow-ups that keep your pipeline warm",
  "Revenue intelligence built for cleaning businesses",
  "Free to start — no credit card required",
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    companyName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
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
      {/* Left panel — dark, trust-building */}
      <div className="hidden lg:flex w-[420px] xl:w-[480px] shrink-0 bg-slate-900 flex-col relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(37,99,235,0.20),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-[radial-gradient(ellipse_80%_80%_at_20%_120%,rgba(37,99,235,0.12),transparent)]" />

        <div className="relative flex flex-col h-full px-10 py-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-base tracking-tight">QuotePro</span>
          </div>

          <div className="flex-1 flex flex-col justify-center py-12">
            <div className="mb-10">
              <h2 className="text-white text-2xl font-bold leading-snug mb-3">
                The quoting tool cleaning businesses actually use.
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Stop guessing on price. Stop losing jobs to slow follow-ups. QuotePro is built specifically for residential cleaning operators who want to grow on purpose.
              </p>
            </div>

            <div className="space-y-3.5">
              {TRUST_POINTS.map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-blue-400" />
                  </div>
                  <span className="text-slate-300 text-sm leading-snug">{point}</span>
                </div>
              ))}
            </div>

            <div className="mt-12 p-5 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-slate-300 text-sm italic leading-relaxed mb-3">
                "I used to spend 30 minutes on every quote. Now it takes 90 seconds and I actually send them same-day. My close rate went way up."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600/40 flex items-center justify-center text-xs font-bold text-blue-200">
                  SM
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">Sarah M.</p>
                  <p className="text-slate-500 text-xs">Solo cleaner · 4 years</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 pt-4 border-t border-white/10">
            {[
              { value: "60 sec", label: "avg. quote time" },
              { value: "7-day", label: "free Pro trial" },
              { value: "$0", label: "to get started" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-white font-bold text-sm">{s.value}</div>
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
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Sign in
            </Link>
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 lg:px-16 pb-8">
          <div className="w-full max-w-sm">
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h1>
              <p className="text-slate-500 text-sm mt-1.5">Free to start. No credit card required.</p>
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
                <span className="bg-white px-3 text-xs text-slate-400">or sign up with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">First name</label>
                  <input
                    value={form.firstName}
                    onChange={set("firstName")}
                    required
                    placeholder="Jane"
                    autoComplete="given-name"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Last name</label>
                  <input
                    value={form.lastName}
                    onChange={set("lastName")}
                    required
                    placeholder="Smith"
                    autoComplete="family-name"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Company name</label>
                <input
                  value={form.companyName}
                  onChange={set("companyName")}
                  required
                  placeholder="Sparkle Cleaners"
                  autoComplete="organization"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                  required
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={set("password")}
                  required
                  placeholder="8+ characters"
                  autoComplete="new-password"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
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
                  "Create free account"
                )}
              </button>
            </form>

            <p className="text-xs text-slate-400 text-center mt-5 leading-relaxed">
              By creating an account you agree to our{" "}
              <span className="underline cursor-pointer hover:text-slate-600 transition-colors">Terms of Service</span>{" "}
              and{" "}
              <span className="underline cursor-pointer hover:text-slate-600 transition-colors">Privacy Policy</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
