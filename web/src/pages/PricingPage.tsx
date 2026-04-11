import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription, type PlanTier, type BillingInterval } from "../lib/subscription";
import { useAuth } from "../lib/auth";
import { Check, Zap, TrendingUp, Crown, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { PLAN_META } from "../../../shared/plans";

const FEATURES = {
  starter: [
    "20 quotes per month",
    "Good / Better / Best quoting",
    "Branded intake form",
    "Basic CRM & lead capture",
    "Email support",
  ],
  growth: [
    "Unlimited quotes",
    "AI quote builder",
    "Smart upsell recommendations",
    "Automated follow-ups",
    "Full CRM & customer management",
    "Revenue dashboard",
    "Public quote request page",
    "Weekly performance recap",
    "Priority email support",
  ],
  pro: [
    "Everything in Growth",
    "Advanced automation rules",
    "Revenue intelligence & analytics",
    "Lead finder & outreach tools",
    "Commercial quote builder",
    "QBO integrations",
    "Priority phone & chat support",
    "Early access to new features",
  ],
};

const FAQS = [
  {
    q: "Can I try QuotePro before paying?",
    a: "Yes. Growth and Pro plans both include a 14-day free trial. You won't be charged until the trial ends, and you can cancel anytime before then.",
  },
  {
    q: "What happens after the 14-day trial?",
    a: "Your card is charged at the start of your billing period. You'll get a reminder email before the trial ends. Cancel anytime if it's not the right fit.",
  },
  {
    q: "Is there an annual discount?",
    a: "Yes — paying annually saves you 2 months on Growth ($490/year vs $588/year monthly) and 2 months on Pro ($990/year vs $1,188/year monthly). Annual pricing is our best deal.",
  },
  {
    q: "What happens if I hit my Starter quote limit?",
    a: "You'll see a clear message when you're close to your 20-quote monthly limit. You can upgrade to Growth anytime for unlimited quotes.",
  },
  {
    q: "Can I upgrade or downgrade later?",
    a: "Yes. You can upgrade at any time and your billing adjusts immediately. Downgrades take effect at the end of your billing period.",
  },
  {
    q: "Which plan is best for a solo cleaner?",
    a: "If you're quoting fewer than 20 jobs per month and want to try the product, Starter is a low-risk entry. Most solo operators who are actively growing choose Growth — unlimited quotes and AI follow-ups pay for themselves with one extra job closed.",
  },
  {
    q: "Which plan is best for a growing team?",
    a: "Growth is built for teams scaling from 1 to multiple crews. Pro adds advanced reporting and automation for operators who want full intelligence across their business.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="max-w-2xl mx-auto space-y-2">
      {FAQS.map((faq, i) => (
        <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
          >
            {faq.q}
            {open === i ? (
              <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 ml-3" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-3" />
            )}
          </button>
          {open === i && (
            <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              {faq.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FeatureRow({ label, starter, growth, pro }: { label: string; starter: boolean; growth: boolean; pro: boolean }) {
  const Tick = ({ on }: { on: boolean }) =>
    on ? (
      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
        <Check className="w-3 h-3 text-emerald-600" />
      </div>
    ) : (
      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mx-auto" />
    );

  return (
    <div className="grid grid-cols-4 py-3 border-b border-slate-100 last:border-0">
      <div className="text-sm text-slate-700 pr-4">{label}</div>
      <div className="text-center"><Tick on={starter} /></div>
      <div className="text-center"><Tick on={growth} /></div>
      <div className="text-center"><Tick on={pro} /></div>
    </div>
  );
}

const COMPARISON = [
  { label: "Quote creation", starter: true, growth: true, pro: true },
  { label: "Good / Better / Best tiers", starter: true, growth: true, pro: true },
  { label: "Branded intake form", starter: true, growth: true, pro: true },
  { label: "Basic CRM", starter: true, growth: true, pro: true },
  { label: "Monthly quotes", starter: false, growth: true, pro: true },
  { label: "Unlimited quotes", starter: false, growth: true, pro: true },
  { label: "AI quote builder", starter: false, growth: true, pro: true },
  { label: "Smart upsell recommendations", starter: false, growth: true, pro: true },
  { label: "Automated follow-ups", starter: false, growth: true, pro: true },
  { label: "Revenue dashboard", starter: false, growth: true, pro: true },
  { label: "Lead finder & outreach", starter: false, growth: false, pro: true },
  { label: "Advanced automation rules", starter: false, growth: false, pro: true },
  { label: "Revenue intelligence", starter: false, growth: false, pro: true },
  { label: "Commercial quote builder", starter: false, growth: false, pro: true },
  { label: "QBO integrations", starter: false, growth: false, pro: true },
  { label: "Priority support", starter: false, growth: false, pro: true },
];

export default function PricingPage() {
  const [interval, setInterval] = useState<BillingInterval>("annual"); // default: annual
  const { startCheckout, checkoutLoading, tier } = useSubscription();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSelect = async (plan: PlanTier) => {
    if (!isAuthenticated) {
      navigate("/register?intent=" + plan);
      return;
    }
    await startCheckout(plan, interval);
  };

  const prices = {
    starter: {
      monthly: PLAN_META.starter.monthlyPrice!,
      annual: PLAN_META.starter.annualMonthlyPrice!,
      annualTotal: PLAN_META.starter.annualMonthlyPrice! * 12,
    },
    growth: {
      monthly: PLAN_META.growth.monthlyPrice!,
      annual: PLAN_META.growth.annualMonthlyPrice!,
      annualTotal: PLAN_META.growth.annualMonthlyPrice! * 12,
    },
    pro: {
      monthly: PLAN_META.pro.monthlyPrice!,
      annual: PLAN_META.pro.annualMonthlyPrice!,
      annualTotal: PLAN_META.pro.annualMonthlyPrice! * 12,
    },
  };

  const displayPrice = (plan: "starter" | "growth" | "pro") =>
    interval === "annual" ? prices[plan].annual : prices[plan].monthly;

  const currentTierRank: Record<string, number> = { free: 0, starter: 1, growth: 2, pro: 3 };
  const userRank = currentTierRank[tier] ?? 0;

  const ctaLabel = (plan: PlanTier, rank: number) => {
    if (userRank >= rank) return "Current plan";
    if (!isAuthenticated) return plan === "growth" ? "Start 14-day free trial" : "Get started";
    if (plan === "starter") return "Upgrade to Starter";
    if (plan === "growth") return "Start 14-day free trial";
    return "Upgrade to Pro";
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-slate-900 text-white text-center px-6 pt-16 pb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold tracking-wide mb-6">
          <Zap className="w-3.5 h-3.5 text-blue-400" />
          Simple, honest pricing
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3 leading-tight">
          Quote faster. Close more jobs.<br />Pick your plan.
        </h1>
        <p className="text-slate-400 text-base max-w-lg mx-auto mb-8">
          Built for residential cleaning businesses that want to grow on purpose.
          Close just one extra job and any plan pays for itself.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center bg-white/10 rounded-xl p-1 gap-1">
          <button
            onClick={() => setInterval("monthly")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              interval === "monthly" ? "bg-white text-slate-900" : "text-slate-400 hover:text-white"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("annual")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              interval === "annual" ? "bg-white text-slate-900" : "text-slate-400 hover:text-white"
            }`}
          >
            Annual
            <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-bold">
              2 months free
            </span>
          </button>
        </div>
      </div>

      {/* Pricing cards */}
      <div className="max-w-5xl mx-auto px-4 -mt-8">
        <div className="grid md:grid-cols-3 gap-4 items-start">

          {/* Starter */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7">
            <div className="mb-5">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
                <Zap className="w-4 h-4 text-slate-500" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Starter</h2>
              <p className="text-slate-500 text-xs mt-1">For solo operators just getting started</p>
            </div>

            <div className="mb-6">
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold text-slate-900">${displayPrice("starter")}</span>
                <span className="text-slate-400 text-sm mb-1">/mo</span>
              </div>
              {interval === "annual" && (
                <div className="text-xs text-slate-400 mt-0.5">Billed ${prices.starter.annualTotal}/year</div>
              )}
            </div>

            <button
              onClick={() => handleSelect("starter")}
              disabled={checkoutLoading || userRank >= 1}
              className="w-full h-10 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 mb-6"
            >
              {ctaLabel("starter", 1)}
            </button>

            <ul className="space-y-2.5">
              {FEATURES.starter.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Growth — featured */}
          <div className="relative bg-blue-600 rounded-2xl shadow-2xl shadow-blue-600/25 p-7 -mt-4 mb-0">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <span className="px-3 py-1 bg-amber-400 text-amber-900 text-[11px] font-bold rounded-full uppercase tracking-wide shadow">
                Most Popular
              </span>
              {interval === "annual" && (
                <span className="px-3 py-1 bg-emerald-500 text-white text-[11px] font-bold rounded-full uppercase tracking-wide shadow">
                  Best Value
                </span>
              )}
            </div>

            <div className="mb-5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mb-3">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-base font-bold text-white">Growth</h2>
              <p className="text-blue-200 text-xs mt-1">Best for most cleaning businesses</p>
            </div>

            <div className="mb-2">
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold text-white">${displayPrice("growth")}</span>
                <span className="text-blue-200 text-sm mb-1">/mo</span>
              </div>
              {interval === "annual" ? (
                <div className="text-xs text-blue-200 mt-0.5">
                  Billed ${prices.growth.annualTotal}/year — save ${prices.growth.monthly * 12 - prices.growth.annualTotal}
                </div>
              ) : (
                <div className="text-xs text-blue-200 mt-0.5">or $41/mo billed annually</div>
              )}
            </div>

            <div className="mb-5 text-xs text-blue-100 bg-white/10 rounded-lg px-3 py-2">
              14-day free trial included — no charge until day 15
            </div>

            <button
              onClick={() => handleSelect("growth")}
              disabled={checkoutLoading || userRank >= 2}
              className="w-full h-10 rounded-xl bg-white text-blue-600 text-sm font-bold hover:bg-blue-50 transition-colors disabled:opacity-50 mb-6 flex items-center justify-center gap-2 shadow-md"
            >
              {ctaLabel("growth", 2)}
              {userRank < 2 && <ArrowRight className="w-4 h-4" />}
            </button>

            <ul className="space-y-2.5">
              {FEATURES.growth.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-white">
                  <Check className="w-4 h-4 text-blue-200 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-sm p-7">
            <div className="mb-5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mb-3">
                <Crown className="w-4 h-4 text-amber-400" />
              </div>
              <h2 className="text-base font-bold text-white">Pro</h2>
              <p className="text-slate-400 text-xs mt-1">For serious operators building a real business</p>
            </div>

            <div className="mb-6">
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold text-white">${displayPrice("pro")}</span>
                <span className="text-slate-400 text-sm mb-1">/mo</span>
              </div>
              {interval === "annual" ? (
                <div className="text-xs text-slate-400 mt-0.5">
                  Billed ${prices.pro.annualTotal}/year — save ${prices.pro.monthly * 12 - prices.pro.annualTotal}
                </div>
              ) : (
                <div className="text-xs text-slate-400 mt-0.5">or $83/mo billed annually</div>
              )}
            </div>

            <button
              onClick={() => handleSelect("pro")}
              disabled={checkoutLoading || userRank >= 3}
              className="w-full h-10 rounded-xl border border-slate-600 text-white text-sm font-semibold hover:bg-white/10 transition-colors disabled:opacity-50 mb-6"
            >
              {ctaLabel("pro", 3)}
            </button>

            <ul className="space-y-2.5">
              {FEATURES.pro.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="max-w-4xl mx-auto px-4 mt-20">
        <h2 className="text-xl font-bold text-slate-900 text-center mb-8">Compare plans</h2>
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-4 px-5 py-3 bg-slate-50 border-b border-slate-200">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Feature</div>
            <div className="text-center text-xs font-bold text-slate-700">Starter</div>
            <div className="text-center text-xs font-bold text-blue-600">Growth</div>
            <div className="text-center text-xs font-bold text-slate-700">Pro</div>
          </div>
          <div className="px-5">
            {COMPARISON.map((row) => (
              <FeatureRow key={row.label} {...row} />
            ))}
          </div>
        </div>
      </div>

      {/* Social proof strip */}
      <div className="max-w-3xl mx-auto px-4 mt-16 mb-16">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { text: "Went from quoting $120 to $189 average in 2 weeks. The upsell engine is incredible.", name: "Sarah M.", role: "Solo cleaner · 4 years" },
            { text: "I was losing jobs because my quotes took 2 days. Now I send same-day. My close rate went way up.", name: "Mike R.", role: "2-crew operation" },
            { text: "The growth dashboard showed me $3,200 in dormant customers I wasn't following up with.", name: "Lisa K.", role: "Residential specialist" },
          ].map((t) => (
            <div key={t.name} className="p-5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex gap-0.5 mb-3">
                {[1,2,3,4,5].map((s) => (
                  <svg key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                ))}
              </div>
              <p className="text-sm text-slate-700 italic mb-3">"{t.text}"</p>
              <p className="text-xs font-semibold text-slate-900">{t.name}</p>
              <p className="text-xs text-slate-500">{t.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-4xl mx-auto px-4 mb-20">
        <h2 className="text-xl font-bold text-slate-900 text-center mb-8">Frequently asked questions</h2>
        <FAQ />
      </div>

      {/* Bottom CTA */}
      <div className="bg-slate-900 text-white text-center px-6 py-16">
        <h2 className="text-2xl font-bold mb-2">Ready to close more jobs?</h2>
        <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
          Start your 14-day free trial on Growth. No credit card required to try it.
        </p>
        <button
          onClick={() => handleSelect("growth")}
          disabled={checkoutLoading}
          className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors disabled:opacity-60 shadow-lg shadow-blue-600/30 inline-flex items-center gap-2"
        >
          Start free trial
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-slate-600 text-xs mt-3">No credit card required. Cancel anytime.</p>
      </div>
    </div>
  );
}
