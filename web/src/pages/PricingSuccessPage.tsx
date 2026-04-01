import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, ArrowRight, Zap, TrendingUp, Crown } from "lucide-react";
import { apiRequest } from "../lib/api";
import { useAuth } from "../lib/auth";

const TIER_CONTENT: Record<string, { icon: typeof Zap; color: string; title: string; subtitle: string; features: string[] }> = {
  starter: {
    icon: Zap,
    color: "text-slate-600",
    title: "Welcome to Starter!",
    subtitle: "You're set up to send professional quotes and capture more leads.",
    features: [
      "20 quotes per month",
      "Good / Better / Best quoting",
      "Branded intake form for your website",
      "Basic CRM & lead capture",
      "Email support",
    ],
  },
  growth: {
    icon: TrendingUp,
    color: "text-blue-600",
    title: "Welcome to Growth!",
    subtitle: "Unlimited quotes, AI tools, and follow-up automation — all unlocked.",
    features: [
      "Unlimited quotes — no caps ever",
      "AI quote builder with smart pricing",
      "Automated follow-up sequences",
      "Full CRM & customer management",
      "Revenue dashboard & insights",
      "Public quote request page",
      "Weekly performance recap",
    ],
  },
  pro: {
    icon: Crown,
    color: "text-amber-500",
    title: "Welcome to Pro!",
    subtitle: "Full access to every feature we've built. Let's grow your business.",
    features: [
      "Everything in Growth",
      "Advanced automation rules",
      "Revenue intelligence & analytics",
      "Lead finder & outreach tools",
      "Commercial quote builder",
      "QuickBooks integrations",
      "Priority phone & chat support",
      "Early access to new features",
    ],
  },
};

export default function PricingSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refetch } = useAuth();
  const [tier, setTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setLoading(false);
      return;
    }
    apiRequest("GET", `/api/subscription/verify-session?session_id=${encodeURIComponent(sessionId)}`)
      .then((res) => res.json())
      .then((data: any) => {
        if (data?.tier) setTier(data.tier);
        return refetch();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const content = tier ? TIER_CONTENT[tier] : null;
  const Icon = content?.icon ?? CheckCircle;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        {/* Checkmark */}
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {content?.title ?? "You're upgraded!"}
        </h1>
        <p className="text-slate-500 text-sm mb-8">
          {content?.subtitle ?? "Your subscription is active. Here's what's now unlocked."}
        </p>

        {/* Features unlocked */}
        {content && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8 text-left">
            <div className="flex items-center gap-2 mb-4">
              <Icon className={`w-5 h-5 ${content.color}`} />
              <span className="text-sm font-semibold text-slate-700">What's now unlocked</span>
            </div>
            <ul className="space-y-2.5">
              {content.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-slate-700">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={() => navigate("/dashboard")}
          className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 mb-3"
        >
          Start exploring
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => navigate("/quotes/new")}
          className="w-full h-10 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Create your first quote
        </button>
      </div>
    </div>
  );
}
