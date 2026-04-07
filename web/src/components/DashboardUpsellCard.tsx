import { useState } from "react";
import { X, TrendingUp, Zap, ArrowRight, Check, Calendar } from "lucide-react";
import { useSubscription, type BillingInterval } from "../lib/subscription";

/* ─── Value propositions per tier ────────────────────────────────────────── */

const FREE_WINS = [
  "Unlimited quotes — never hit a limit again",
  "AI follow-ups that close 2–3 extra jobs/month",
  "Automated win-back campaigns for past customers",
  "Revenue dashboard to see your real numbers",
];

const STARTER_WINS = [
  "Unlimited quotes (vs your 20/month cap)",
  "AI follow-ups that close 2–3 extra jobs/month",
  "Full CRM, job management & scheduling",
  "Automated win-back campaigns for past customers",
];

/* ─── ROI stats strip ────────────────────────────────────────────────────── */

const ROI_STATS = [
  { value: "$180", label: "avg value of one booked job" },
  { value: "2–3", label: "extra jobs/month from AI follow-ups" },
  { value: "90 days", label: "to see results for most cleaners" },
];

/* ─── DashboardUpsellCard ────────────────────────────────────────────────── */

export default function DashboardUpsellCard() {
  const { isFree, isStarter, isGrowth, isPro, showPaywall, startCheckout, checkoutLoading, trackUpgradeClick, isInFreeTrial } = useSubscription();

  const [dismissed, setDismissed] = useState(() => {
    try {
      const until = localStorage.getItem("qp_upsell_card_dismissed_until");
      if (until && Date.now() < parseInt(until, 10)) return true;
    } catch {}
    return false;
  });
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("annual");

  // Only show for Free (out of trial) or Starter users
  if (isGrowth || isPro || isInFreeTrial || dismissed) return null;
  if (!isFree && !isStarter) return null;

  function dismiss() {
    try {
      localStorage.setItem("qp_upsell_card_dismissed_until", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch {}
    setDismissed(true);
  }

  async function handleUpgrade() {
    trackUpgradeClick("growth", "dashboard_card");
    await startCheckout("growth", billingInterval);
  }

  const wins = isFree ? FREE_WINS : STARTER_WINS;
  const monthlyPrice = 49;
  const annualPrice = 41;
  const displayPrice = billingInterval === "annual" ? annualPrice : monthlyPrice;
  const annualSavings = (monthlyPrice - annualPrice) * 12;

  return (
    <div
      className="rounded-2xl mb-6 overflow-hidden"
      style={{
        border: "1px solid rgba(79,70,229,0.2)",
        background: "linear-gradient(135deg, #fafaff 0%, #f5f3ff 50%, #fafaff 100%)",
        boxShadow: "0 1px 12px rgba(79,70,229,0.08)",
      }}
    >
      {/* ── Header bar ── */}
      <div
        className="px-5 py-3 flex items-center gap-2.5"
        style={{ background: "linear-gradient(135deg, #4f46e5, #6d28d9)", borderBottom: "1px solid rgba(255,255,255,0.1)" }}
      >
        <TrendingUp className="w-4 h-4 text-indigo-200 shrink-0" />
        <p className="text-[13px] font-bold text-white flex-1">
          {isFree
            ? "Unlock Growth — most cleaners add $800–$2,200/mo"
            : "Upgrade to Growth — unlimited quotes + AI that works while you clean"}
        </p>
        <button
          onClick={dismiss}
          className="text-indigo-300 hover:text-white transition-colors shrink-0"
          aria-label="Dismiss for 7 days"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="p-5">
        {/* ROI stat strip */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {ROI_STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-lg font-extrabold text-indigo-700 leading-none">{s.value}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-5 items-start">
          {/* Feature checklist */}
          <ul className="space-y-2">
            {wins.map((w) => (
              <li key={w} className="flex items-start gap-2 text-[13px] text-slate-700">
                <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-2.5 h-2.5 text-indigo-600" />
                </div>
                {w}
              </li>
            ))}
          </ul>

          {/* Pricing + CTA */}
          <div
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: "white", border: "1px solid rgba(79,70,229,0.15)" }}
          >
            {/* Billing toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5 self-start">
              <button
                onClick={() => setBillingInterval("monthly")}
                className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-all ${
                  billingInterval === "monthly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval("annual")}
                className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-all flex items-center gap-1.5 ${
                  billingInterval === "annual" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                Annual
                <span className="px-1 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-bold leading-none">
                  save ${annualSavings}
                </span>
              </button>
            </div>

            {/* Price display */}
            <div>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-extrabold text-slate-900">${displayPrice}</span>
                <span className="text-slate-400 text-sm mb-1">/mo</span>
              </div>
              {billingInterval === "annual" ? (
                <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Billed $490/yr — 2 months free vs monthly
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">
                  or $41/mo billed annually — save $98/yr
                </p>
              )}
            </div>

            {/* CTA */}
            <button
              onClick={handleUpgrade}
              disabled={checkoutLoading}
              className="w-full h-10 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                boxShadow: "0 4px 14px rgba(79,70,229,0.3)",
              }}
            >
              {checkoutLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Start 14-day free trial
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-400 text-center">
              No credit card required during trial &nbsp;·&nbsp; Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
