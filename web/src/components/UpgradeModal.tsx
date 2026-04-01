import { X, Zap, TrendingUp, Crown, Check, ArrowRight, Sparkles } from "lucide-react";
import { useSubscription, type PlanTier } from "../lib/subscription";
import { Button } from "./ui";

const PLANS: Array<{
  id: PlanTier;
  name: string;
  price: number;
  annualPrice: number;
  icon: typeof Zap;
  color: string;
  gradient: string;
  highlights: string[];
  recommended?: boolean;
}> = [
  {
    id: "starter",
    name: "Starter",
    price: 19,
    annualPrice: 19,
    icon: Zap,
    color: "#3b82f6",
    gradient: "from-blue-500 to-blue-600",
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
    annualPrice: 41,
    icon: TrendingUp,
    color: "#6366f1",
    gradient: "from-primary-500 to-violet-600",
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
    annualPrice: 83,
    icon: Crown,
    color: "#f59e0b",
    gradient: "from-amber-500 to-orange-500",
    highlights: [
      "Everything in Growth",
      "Advanced automation rules",
      "Revenue intelligence & analytics",
      "Lead finder & outreach tools",
      "Commercial quote builder",
      "Jobber & QBO integrations",
    ],
  },
];

export default function UpgradeModal() {
  const { paywallVisible, hidePaywall, startCheckout, checkoutLoading, tier } = useSubscription();

  if (!paywallVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) hidePaywall(); }}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
        style={{ background: "var(--color-surface)", maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-violet-700 px-8 py-7 text-white overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.15),transparent_60%)]" />
          <button
            onClick={hidePaywall}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="relative flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-primary-200 font-medium">Upgrade QuotePro AI</p>
              <h2 className="text-xl font-bold">You've reached your free quote limit</h2>
            </div>
          </div>
          <p className="relative text-primary-100 text-sm mt-1">
            Pick a plan and keep building your business — no interruptions, no limits.
          </p>
        </div>

        {/* Plans */}
        <div className="p-6">
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const isCurrent = tier === plan.id;
              return (
                <div
                  key={plan.id}
                  className="relative rounded-xl border overflow-hidden transition-all duration-200"
                  style={{
                    borderColor: plan.recommended
                      ? "var(--color-primary-400)"
                      : "var(--color-border)",
                    boxShadow: plan.recommended
                      ? "0 0 0 2px var(--color-primary-500)"
                      : undefined,
                  }}
                >
                  {plan.recommended && (
                    <div
                      className="text-center py-1 text-xs font-semibold text-white"
                      style={{ background: `linear-gradient(90deg, #6366f1, #7c3aed)` }}
                    >
                      Most Popular
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg, ${plan.color}22, ${plan.color}44)` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: plan.color }} />
                      </div>
                      <span className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>
                        {plan.name}
                      </span>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-end gap-1">
                        <span className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                          ${plan.price}
                        </span>
                        <span className="text-xs mb-1" style={{ color: "var(--color-text-tertiary)" }}>/mo</span>
                      </div>
                    </div>

                    <ul className="space-y-1.5 mb-4">
                      {plan.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                          <Check className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" />
                          {h}
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <div
                        className="w-full text-center py-2 rounded-lg text-xs font-medium"
                        style={{ background: "var(--color-surface-raised)", color: "var(--color-text-tertiary)" }}
                      >
                        Current plan
                      </div>
                    ) : (
                      <Button
                        variant={plan.recommended ? "primary" : "secondary"}
                        size="sm"
                        icon={ArrowRight}
                        onClick={() => startCheckout(plan.id)}
                        loading={checkoutLoading}
                        className="w-full justify-center"
                      >
                        Choose {plan.name}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            7-day free trial on Growth & Pro. Cancel anytime. No commitment.
          </p>
        </div>
      </div>
    </div>
  );
}
