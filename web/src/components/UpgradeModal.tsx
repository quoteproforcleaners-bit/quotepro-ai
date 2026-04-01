import { X, Zap, TrendingUp, Crown, Check } from "lucide-react";
import { useSubscription, type PlanTier } from "../lib/subscription";

const PLANS: Array<{
  id: PlanTier;
  name: string;
  price: number;
  icon: typeof Zap;
  color: string;
  bg: string;
  border: string;
  highlights: string[];
  recommended?: boolean;
}> = [
  {
    id: "starter",
    name: "Starter",
    price: 19,
    icon: Zap,
    color: "#3b82f6",
    bg: "#eff6ff",
    border: "#bfdbfe",
    highlights: [
      "20 quotes per month",
      "Good / Better / Best quoting",
      "Branded intake form",
      "Basic CRM & lead capture",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 49,
    icon: TrendingUp,
    color: "#6366f1",
    bg: "#eef2ff",
    border: "#a5b4fc",
    recommended: true,
    highlights: [
      "Unlimited quotes",
      "AI quote builder",
      "Smart upsell recommendations",
      "Automated follow-ups",
      "Full CRM & customer management",
      "Revenue dashboard",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 99,
    icon: Crown,
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fcd34d",
    highlights: [
      "Everything in Growth",
      "Advanced automation rules",
      "Revenue intelligence & analytics",
      "Lead finder & outreach tools",
      "Commercial quote builder",
      "QBO integrations",
    ],
  },
];

export default function UpgradeModal() {
  const { paywallVisible, hidePaywall, startCheckout, checkoutLoading, tier } = useSubscription();

  if (!paywallVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(2, 6, 23, 0.93)" }}
      onClick={(e) => { if (e.target === e.currentTarget) hidePaywall(); }}
    >
      <div className="relative w-full max-w-2xl my-auto rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#ffffff" }}
      >
        {/* Close */}
        <button
          onClick={hidePaywall}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-1">Upgrade QuotePro AI</p>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">You've used all your free quotes</h2>
          <p className="text-sm text-slate-500">Choose a plan to keep sending quotes and growing your business.</p>
        </div>

        {/* Plans */}
        <div className="p-6 grid grid-cols-3 gap-3">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = tier === plan.id;
            return (
              <div
                key={plan.id}
                className="relative rounded-xl flex flex-col"
                style={{
                  border: `2px solid ${plan.recommended ? plan.color : plan.border}`,
                  background: plan.recommended ? "#f5f3ff" : "#fafafa",
                }}
              >
                {plan.recommended && (
                  <div
                    className="text-center py-1 text-xs font-bold text-white"
                    style={{ background: plan.color }}
                  >
                    Most Popular
                  </div>
                )}
                <div className="p-4 flex flex-col flex-1">
                  {/* Plan name & icon */}
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: plan.bg }}
                    >
                      <Icon className="w-4 h-4" style={{ color: plan.color }} />
                    </div>
                    <span className="font-bold text-sm text-slate-800">{plan.name}</span>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <span className="text-3xl font-extrabold text-slate-900">${plan.price}</span>
                    <span className="text-xs text-slate-400 ml-1">/mo</span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-5 flex-1">
                    {plan.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                        <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: plan.color }} />
                        {h}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isCurrent ? (
                    <div className="w-full text-center py-2 rounded-lg text-xs font-medium text-slate-400 bg-slate-100">
                      Current plan
                    </div>
                  ) : (
                    <button
                      onClick={() => startCheckout(plan.id)}
                      disabled={checkoutLoading}
                      className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
                      style={{ background: plan.color }}
                    >
                      {checkoutLoading ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : null}
                      Choose {plan.name}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-slate-400">7-day free trial on Growth & Pro &nbsp;·&nbsp; Cancel anytime &nbsp;·&nbsp; No commitment</p>
        </div>
      </div>
    </div>
  );
}
