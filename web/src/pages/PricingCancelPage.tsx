import { useNavigate } from "react-router-dom";
import { ArrowRight, Shield } from "lucide-react";
import { useSubscription } from "../lib/subscription";
import { useAuth } from "../lib/auth";

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};

const UPGRADE_NUDGE: Record<string, { headline: string; bullets: string[] }> = {
  free: {
    headline: "Upgrade to Growth and get:",
    bullets: [
      "Unlimited quotes — no monthly cap",
      "AI-powered quote builder",
      "Automated follow-up sequences",
      "Full CRM & revenue dashboard",
    ],
  },
  starter: {
    headline: "Upgrade to Growth and get:",
    bullets: [
      "Unlimited quotes — no 20/month cap",
      "AI quote builder with smart pricing",
      "Automated follow-up sequences",
      "Full CRM & revenue dashboard",
    ],
  },
  growth: {
    headline: "Upgrade to Pro and get:",
    bullets: [
      "Advanced automation rules",
      "Revenue intelligence & analytics",
      "Lead finder & outreach tools",
      "Commercial quote builder",
    ],
  },
  pro: {
    headline: "You're already on our best plan.",
    bullets: [],
  },
};

export default function PricingCancelPage() {
  const navigate = useNavigate();
  const { tier } = useSubscription();
  const { isAuthenticated } = useAuth();

  const tierLabel = TIER_LABELS[tier] ?? "Free";
  const nudge = UPGRADE_NUDGE[tier] ?? UPGRADE_NUDGE.free;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-slate-400" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">No worries.</h1>
        <p className="text-slate-500 text-sm mb-8">
          You're still on the <span className="font-semibold text-slate-700">{tierLabel}</span> plan.
          You can upgrade anytime.
        </p>

        {nudge.bullets.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8 text-left">
            <p className="text-sm font-semibold text-slate-700 mb-4">{nudge.headline}</p>
            <ul className="space-y-2.5">
              {nudge.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={() => navigate("/pricing")}
          className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 mb-3"
        >
          See plans
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => navigate(isAuthenticated ? "/dashboard" : "/")}
          className="w-full h-10 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Back to {isAuthenticated ? "dashboard" : "home"}
        </button>
      </div>
    </div>
  );
}
