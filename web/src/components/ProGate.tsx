import { useSubscription } from"../lib/subscription";
import { useNavigate } from"react-router-dom";
import { ArrowRight, Lock, Zap } from"lucide-react";

const FEATURE_CONFIG: Record<string, { headline: string; bullets: string[]; emoji: string }> = {
  "Automations": {
    headline: "Put your follow-ups on autopilot",
    bullets: [
      "Auto-send follow-ups 24 hrs after every quote",
      "Trigger review requests when a job is marked complete",
      "Set custom rules — no code, no hassle",
    ],
    emoji: "⚡",
  },
  "Booking Widget": {
    headline: "Let customers book directly from your website",
    bullets: [
      "Embed a 'Book Now' button on any site in 60 seconds",
      "Customers pick service, date, and time without calling",
      "New bookings land straight in your jobs list",
    ],
    emoji: "🌐",
  },
  "Objection Assistant": {
    headline: "Word-for-word answers to price pushback",
    bullets: [
      "AI gives you exact scripts for 'that's too expensive'",
      "Tailored responses based on your market and services",
      "Close more jobs without dropping your price",
    ],
    emoji: "🎯",
  },
  "Commercial Quoting": {
    headline: "Win bigger contracts with professional proposals",
    bullets: [
      "Multi-area breakdowns for offices, warehouses, retail",
      "Scope-of-work templates that look enterprise-grade",
      "Commercial jobs are 3–5× the ticket size of residential",
    ],
    emoji: "🏢",
  },
  "Lead Radar": {
    headline: "Find homeowners actively looking for a cleaner",
    bullets: [
      "Real-time leads sourced from local intent signals",
      "Filter by zip code, home size, and move-in/move-out",
      "Get to them before your competitors do",
    ],
    emoji: "📡",
  },
  "Reactivation Campaigns": {
    headline: "Win back customers who went quiet",
    bullets: [
      "AI surfaces your best lapsed-customer opportunities",
      "One-click sends a personalized win-back email",
      "Past customers close at 3× the rate of cold leads",
    ],
    emoji: "🔄",
  },
  "Revenue Intelligence": {
    headline: "See exactly where your money comes from",
    bullets: [
      "Monthly totals, job-type breakdown, and trends",
      "Compare this month vs. last — instantly",
      "Spot your most profitable service types",
    ],
    emoji: "💰",
  },
  "Reviews & Referrals": {
    headline: "Turn every job into a 5-star review",
    bullets: [
      "Auto-request Google reviews after job completion",
      "Track referral credits and who's sending you business",
      "More reviews = more organic leads, forever",
    ],
    emoji: "⭐",
  },
  "Sales Strategy": {
    headline: "A personalized playbook to close more jobs",
    bullets: [
      "AI talking points based on your market and price point",
      "Scripts for price negotiation, objections, and upsells",
      "Updated monthly as your win/loss data grows",
    ],
    emoji: "📋",
  },
  "Growth Tasks": {
    headline: "A prioritized to-do list that grows your business",
    bullets: [
      "AI ranks your highest-impact actions every week",
      "Flags quotes that need follow-up before they expire",
      "Surfaces win-back and upsell opportunities automatically",
    ],
    emoji: "📈",
  },
  "Weekly Recap": {
    headline: "Your business performance in 60 seconds",
    bullets: [
      "Weekly summary: quotes sent, jobs completed, revenue earned",
      "One number that tells you if you're growing",
      "Delivered every Monday morning, in-app and by email",
    ],
    emoji: "📊",
  },
  "Photo Quotes": {
    headline: "Turn a photo into an accurate quote instantly",
    bullets: [
      "Snap a photo of any room — AI estimates the clean time",
      "Stop underquoting jobs you haven't seen in person",
      "Works for bathrooms, kitchens, living rooms, and more",
    ],
    emoji: "📷",
  },
  "Staff": {
    headline: "Give your cleaners a mobile field mode",
    bullets: [
      "Cleaners log in with a PIN — no account needed",
      "Clock in/out, view today's jobs, mark tasks complete",
      "Real-time visibility into who's where and what's done",
    ],
    emoji: "👷",
  },
};

const TIER_PRICE: Record<string, string> = {
  starter: "$19/mo",
  growth: "$49/mo",
  pro: "$99/mo",
};

const TIER_LABEL: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};

export function ProGate({
  children,
  feature,
  minTier = "growth",
}: {
  children: React.ReactNode;
  feature: string;
  minTier?: "starter" | "growth" | "pro";
}) {
  const { isGrowth, isPro, isStarter } = useSubscription();
  const navigate = useNavigate();

  const hasAccess =
    minTier === "pro" ? isPro :
    minTier === "growth" ? (isGrowth || isPro) :
    (isStarter || isGrowth || isPro);

  if (hasAccess) return <>{children}</>;

  const config = FEATURE_CONFIG[feature] ?? {
    headline: `Unlock ${feature.toLowerCase()} and more`,
    bullets: [
      `Access ${feature} on the ${TIER_LABEL[minTier] ?? minTier} plan`,
      "Upgrade in seconds — cancel anytime",
      "14-day free trial included",
    ],
    emoji: "🔓",
  };

  const price = TIER_PRICE[minTier] ?? "$49/mo";
  const tierLabel = TIER_LABEL[minTier] ?? minTier;

  return (
    <div className="relative min-h-[60vh] flex items-center justify-center">
      <div className="relative text-center max-w-md mx-auto px-6 py-10 rounded-2xl bg-white shadow-sm border border-slate-100">

        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-xl shadow-blue-600/25 text-2xl select-none">
          {config.emoji}
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 mb-4">
          <Zap className="w-3 h-3 text-blue-600" />
          <span className="text-xs font-semibold text-blue-700">
            {tierLabel} plan — {price}
          </span>
        </div>

        <h2 className="text-xl font-bold text-slate-900 mb-2 leading-tight">
          {config.headline}
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          {feature} is included on the {tierLabel} plan.
        </p>

        <ul className="text-left mb-7 space-y-3">
          {config.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-slate-700">
              <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {b}
            </li>
          ))}
        </ul>

        <button
          onClick={() => navigate("/pricing")}
          className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
        >
          Unlock {feature} — {price}
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="mt-3 text-xs text-slate-400">
          14-day free trial · Cancel anytime
        </p>
      </div>
    </div>
  );
}

export function StarterGate({
  children,
  feature,
}: {
  children: React.ReactNode;
  feature: string;
}) {
  const { isFree } = useSubscription();
  const navigate = useNavigate();

  if (!isFree) return <>{children}</>;

  return (
    <div className="relative min-h-[40vh] flex items-center justify-center">
      <div className="relative text-center max-w-md mx-auto px-6 py-8 rounded-2xl bg-white border border-slate-100 shadow-sm">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-slate-100 flex items-center justify-center">
          <Lock className="w-5 h-5 text-slate-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          {feature} requires a subscription
        </h2>
        <p className="text-slate-500 mb-4 text-sm">
          Pick a plan to start using {feature.toLowerCase()} — plans start at $19/mo.
        </p>
        <button
          onClick={() => navigate("/pricing")}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors"
        >
          View plans
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
