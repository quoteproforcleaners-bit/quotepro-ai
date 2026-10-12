import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Zap, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Something went wrong. Try again.");
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="w-full max-w-[440px]">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-slate-900 font-bold text-base tracking-tight">QuotePro</span>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-emerald-800 text-sm font-semibold leading-snug">Check your email</p>
                <p className="text-emerald-700 text-sm mt-1 leading-relaxed">
                  If an account exists for <strong>{email}</strong>, we sent a password reset link.
                  It expires in 60 minutes.
                </p>
              </div>
            </div>
            <Link
              to="/login"
              className="block w-full h-[48px] flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-md shadow-blue-600/30"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug">
              Reset your password
            </h1>
            <p className="text-slate-500 text-sm mt-1.5 mb-6">
              Enter your email and we'll send you a link to set a new password.
            </p>

            {error ? (
              <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm leading-snug">{error}</p>
              </div>
            ) : null}

            <form onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                autoComplete="email"
                autoFocus
                className="w-full h-[44px] px-3.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all"
              />

              <button
                type="submit"
                disabled={loading}
                className="mt-4 w-full h-[48px] flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold transition-colors disabled:opacity-60 shadow-md shadow-blue-600/30"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  "Send reset link"
                )}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 mt-5">
              Remembered it?{" "}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
