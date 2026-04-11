import { useState } from "react";
import { X, Zap, TrendingUp, Crown, Check, ArrowRight, Sparkles, Calendar } from "lucide-react";
import { useSubscription, type PlanTier, type BillingInterval, type PaywallTrigger } from "../lib/subscription";
import { PLAN_META } from "../../../shared/plans";

/* ─── Pricing data — sourced from shared/plans.ts ─────────────────────────── */

const PRICES = {
  starter: {
    monthly: PLAN_META.starter.monthlyPrice!,
    annual: PLAN_META.starter.annualMonthlyPrice!,
    annualTotal: PLAN_META.starter.annualMonthlyPrice! * 12,
    annualSavings: (PLAN_META.starter.monthlyPrice! - PLAN_META.starter.annualMonthlyPrice!) * 12,
  },
  growth: {
    monthly: PLAN_META.growth.monthlyPrice!,
    annual: PLAN_META.growth.annualMonthlyPrice!,
    annualTotal: PLAN_META.growth.annualMonthlyPrice! * 12,
    annualSavings: (PLAN_META.growth.monthlyPrice! - PLAN_META.growth.annualMonthlyPrice!) * 12,
  },
  pro: {
    monthly: PLAN_META.pro.monthlyPrice!,
    annual: PLAN_META.pro.annualMonthlyPrice!,
    annualTotal: PLAN_META.pro.annualMonthlyPrice! * 12,
    annualSavings: (PLAN_META.pro.monthlyPrice! - PLAN_META.pro.annualMonthlyPrice!) * 12,
  },
};

const PLANS: Array<{
  id: PlanTier;
  name: string;
  icon: typeof Zap;
  accent: string;
  accentLight: string;
  accentBorder: string;
  highlights: string[];
  recommended?: boolean;
}> = [
  {
    id: "starter",
    name: "Starter",
    icon: Zap,
    accent: "#3b82f6",
    accentLight: "#eff6ff",
    accentBorder: "#bfdbfe",
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
    icon: TrendingUp,
    accent: "#4f46e5",
    accentLight: "#eef2ff",
    accentBorder: "#a5b4fc",
    recommended: true,
    highlights: [
      "Unlimited quotes",
      "AI follow-ups (closes 2–3 extra jobs/mo)",
      "Full CRM & customer history",
      "Automated win-back campaigns",
      "Revenue & pipeline dashboard",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    icon: Crown,
    accent: "#b45309",
    accentLight: "#fffbeb",
    accentBorder: "#fcd34d",
    highlights: [
      "Everything in Growth",
      "Commercial quote builder",
      "Advanced automation rules",
      "Revenue intelligence & forecasting",
      "QuickBooks integration",
    ],
  },
];

/* ─── Contextual header copy ─────────────────────────────────────────────── */

function getHeaderCopy(trigger: PaywallTrigger, tier: PlanTier) {
  switch (trigger) {
    case "quote_limit":
      return {
        eyebrow: "Quote limit reached",
        title: "You've used all your quotes this month",
        subtitle: "Growth users send unlimited quotes and close 2–3 extra jobs per month with AI follow-ups — that's $800–$2,200/mo more.",
      };
    case "near_limit":
      return {
        eyebrow: "Running low on quotes",
        title: "Almost out of quotes for this month",
        subtitle: "Upgrade to Growth for unlimited quotes and AI tools that run your follow-ups automatically.",
      };
    case "ai_feature":
      return {
        eyebrow: "Growth feature",
        title: "Unlock AI-powered quoting",
        subtitle: "Let AI build your quotes, follow-up sequences, and win-back campaigns. Growth users average $1,400/mo more in booked revenue.",
      };
    case "pro_feature":
      return {
        eyebrow: "Pro feature",
        title: "This feature requires Pro",
        subtitle: "Pro gives you commercial quoting, advanced automations, and revenue intelligence built for growing cleaning operations.",
      };
    case "better_best":
      return {
        eyebrow: "More revenue per quote",
        title: "See what Better & Best pricing earns you",
        subtitle: "Growth users consistently close at Better or Best tier — that's $40–$80 more per quote, on every job.",
      };
    case "dashboard":
      return {
        eyebrow: tier === "starter" ? "You're on Starter" : "Upgrade QuotePro AI",
        title: tier === "starter"
          ? "Unlock the full power of Growth"
          : "Most cleaners see results in 30 days",
        subtitle: tier === "starter"
          ? "Unlimited quotes, AI follow-ups, and revenue tracking — Growth users add $800–$2,200/mo vs Starter."
          : "Cleaning businesses on Growth average $800–$2,200/mo more. AI follow-ups alone close 2–3 extra jobs per month.",
      };
    default:
      return {
        eyebrow: "Upgrade QuotePro AI",
        title: "Close more jobs. Earn more per quote.",
        subtitle: "Cleaning businesses on Growth average $800–$2,200/mo more in revenue within 90 days. One extra job and the plan pays for itself.",
      };
  }
}

/* ─── UpgradeModal ───────────────────────────────────────────────────────── */

export default function UpgradeModal() {
  const {
    paywallVisible, hidePaywall, startCheckout, checkoutLoading,
    tier, paywallTrigger, trackUpgradeClick,
  } = useSubscription();

  const [interval, setInterval] = useState<BillingInterval>("annual");

  if (!paywallVisible) return null;

  const { eyebrow, title, subtitle } = getHeaderCopy(paywallTrigger, tier);

  const tierRank: Record<string, number> = { free: 0, starter: 1, growth: 2, pro: 3 };
  const userRank = tierRank[tier] ?? 0;

  const handleUpgrade = async (plan: PlanTier) => {
    trackUpgradeClick(plan, paywallTrigger ?? "unknown");
    await startCheckout(plan, interval);
  };

  const displayPrice = (plan: "starter" | "growth" | "pro") =>
    interval === "annual" ? PRICES[plan].annual : PRICES[plan].monthly;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(2,6,23,0.88)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) hidePaywall(); }}
    >
      <div
        className="relative w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#ffffff", maxHeight: "95vh", overflowY: "auto" }}
      >
        {/* Close */}
        <button
          onClick={hidePaywall}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* ── Header ── */}
        <div className="px-6 sm:px-8 pt-7 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">{eyebrow}</p>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1.5 leading-tight">{title}</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{subtitle}</p>
        </div>

        {/* ── Billing toggle ── */}
        <div className="px-6 sm:px-8 pt-4 pb-2">
          <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setInterval("monthly")}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${
                interval === "monthly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval("annual")}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all flex items-center gap-2 ${
                interval === "annual"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Annual
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-bold leading-none">
                2 mo free
              </span>
            </button>
          </div>
          {interval === "annual" && (
            <p className="mt-1.5 text-xs text-emerald-600 font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Growth saves $98/yr · Pro saves $198/yr — billed annually
            </p>
          )}
        </div>

        {/* ── Plan cards ── */}
        <div className="px-6 sm:px-8 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = tier === plan.id;
            const isUpgrade = tierRank[plan.id] > userRank;
            const price = displayPrice(plan.id as "starter" | "growth" | "pro");
            const savings = interval === "annual" ? PRICES[plan.id as "starter" | "growth" | "pro"].annualSavings : 0;

            return (
              <div
                key={plan.id}
                className="relative rounded-2xl flex flex-col"
                style={{
                  border: `2px solid ${plan.recommended ? plan.accent : plan.accentBorder}`,
                  background: plan.recommended ? "#f5f3ff" : "#fafafa",
                }}
              >
                {plan.recommended && (
                  <div
                    className="text-center py-1 text-[11px] font-bold text-white tracking-wide"
                    style={{ background: plan.accent, borderRadius: "14px 14px 0 0" }}
                  >
                    Most Popular
                  </div>
                )}
                <div className="p-4 flex flex-col flex-1">
                  {/* Icon + name */}
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: plan.accentLight }}
                    >
                      <Icon className="w-4 h-4" style={{ color: plan.accent }} />
                    </div>
                    <span className="font-bold text-sm text-slate-800">{plan.name}</span>
                  </div>

                  {/* Price */}
                  <div className="mb-1">
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-extrabold text-slate-900">${price}</span>
                      <span className="text-xs text-slate-400 mb-1">/mo</span>
                    </div>
                    {interval === "annual" && savings > 0 ? (
                      <p className="text-[11px] text-emerald-600 font-semibold">Save ${savings}/yr</p>
                    ) : interval === "annual" && savings === 0 ? (
                      <p className="text-[11px] text-slate-400">No annual discount</p>
                    ) : null}
                  </div>

                  {/* Features */}
                  <ul className="space-y-1.5 mb-4 flex-1 mt-2">
                    {plan.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                        <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: plan.accent }} />
                        {h}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isCurrent ? (
                    <div className="w-full text-center py-2 rounded-xl text-xs font-semibold text-slate-400 bg-slate-100">
                      Current plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={checkoutLoading || !isUpgrade}
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-1.5"
                      style={{
                        background: plan.recommended
                          ? `linear-gradient(135deg, ${plan.accent}, #6d28d9)`
                          : plan.accent,
                        boxShadow: plan.recommended ? `0 4px 14px ${plan.accent}40` : undefined,
                      }}
                    >
                      {checkoutLoading ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          {plan.id === "growth" && userRank < 2 ? "Start 14-day free trial" : `Upgrade to ${plan.name}`}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 sm:px-8 pb-6 text-center space-y-1">
          <p className="text-xs text-slate-400">
            14-day free trial on Growth &amp; Pro &nbsp;·&nbsp; Cancel anytime &nbsp;·&nbsp; No commitment
          </p>
          <p className="text-xs text-slate-400">
            Questions? &nbsp;
            <a href="mailto:mike@getquotepro.ai" className="underline hover:text-slate-600">
              Email us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
