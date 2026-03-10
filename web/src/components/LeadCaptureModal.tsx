import { useState, useEffect, useRef } from "react";
import { X, Lock, CheckCircle, Mail, User, Sparkles } from "lucide-react";
import { apiPost } from "../lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  resourceTitle: string;
};

export function LeadCaptureModal({ open, onClose, onSuccess, resourceTitle }: Props) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setSuccess(false);
      setError("");
      setEmail("");
      setFirstName("");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
      setTimeout(() => emailRef.current?.focus(), 150);
    } else {
      setAnimateIn(false);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await apiPost("/api/public/toolkit-lead", {
        email: email.trim().toLowerCase(),
        firstName: firstName.trim() || null,
        resource: resourceTitle,
      });
      setSuccess(true);
      onSuccess();
    } catch (err: any) {
      if (err.message?.includes("already")) {
        setSuccess(true);
        onSuccess();
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${
        animateIn ? "bg-slate-900/50 backdrop-blur-sm" : "bg-transparent"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ease-out ${
          animateIn
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {!success ? (
          <>
            <div className="px-6 pt-7 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mb-4 shadow-lg shadow-primary-600/20">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1.5">
                Unlock the Cleaning Business Toolkit
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Get calculators, pricing templates, scripts, and growth tools used by cleaning business owners.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 pb-6">
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      Email
                      <span className="text-red-400">*</span>
                    </span>
                  </label>
                  <input
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all placeholder:text-slate-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      First name
                      <span className="text-slate-300 text-xs font-normal">(optional)</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              {error ? (
                <p className="text-sm text-red-500 mb-3">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/20 hover:from-primary-700 hover:to-primary-800 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Unlock Free Toolkit
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-400 text-center mt-3">
                No spam, ever. Unsubscribe anytime.
              </p>
            </form>
          </>
        ) : (
          <div className="px-6 py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4" style={{ animation: "scaleIn 0.4s ease-out" }}>
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Toolkit Unlocked</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              Check your inbox for your free resources. You can now access this tool.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] transition-all duration-150"
            >
              Continue
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
