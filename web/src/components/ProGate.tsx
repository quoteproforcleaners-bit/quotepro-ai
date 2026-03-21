import { useSubscription, type PlanTier } from "../lib/subscription";
import { useNavigate } from "react-router-dom";
import { TrendingUp, ArrowRight, Lock, Shield } from "lucide-react";

const TIER_CONFIG: Record<"growth" | "pro", {
  label: string;
  price: string;
  icon: typeof TrendingUp;
  features: string[];
}> = {
  growth: {
    label: "Growth",
    price: "$49/mo",
    icon: TrendingUp,
    features: [
      "Unlimited quotes",
      "AI quote builder",
      "Automated follow-ups",
      "Full CRM & customer management",
      "Revenue dashboard",
    ],
  },
  pro: {
    label: "Pro",
    price: "$99/mo",
    icon: Shield,
    features: [
      "Everything in Growth",
      "Commercial quote builder",
      "Lead finder & outreach",
      "Advanced automation rules",
      "Jobber & QuickBooks integrations",
    ],
  },
};

const FEATURE_TAGLINES: Record<string, string> = {
  "AI Quote Builder": "Generate accurate, professional quotes in seconds — not minutes.",
  "Follow-Up Queue": "Never let a hot lead go cold. Automated nudges that win jobs.",
  "Automations": "Set triggers and rules that run your business while you're on jobs.",
  "Commercial Quoting": "Win bigger commercial contracts with professional proposals.",
  "Lead Finder": "Find homeowners actively looking for cleaning services near you.",
  "Revenue Dashboard": "See exactly what's earning and where your next dollar is coming from.",
};

export function ProGate({
  children,
  feature,
  minTier = "growth",
}: {
  children: React.ReactNode;
  feature: string;
  minTier?: "growth" | "pro";
}) {
  const { isGrowth, isPro } = useSubscription();
  const navigate = useNavigate();

  const hasAccess = minTier === "pro" ? isPro : isGrowth;
  if (hasAccess) return <>{children}</>;

  const config = TIER_CONFIG[minTier];
  const Icon = config.icon;
  const tagline = FEATURE_TAGLINES[feature] ?? `Upgrade to ${config.label} to unlock ${feature.toLowerCase()} and more.`;

  return (
    <div className="relative min-h-[60vh] flex items-center justify-center">
      <div className="relative text-center max-w-md mx-auto px-6 py-10 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/25">
          <Lock className="w-7 h-7 text-white" />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {feature}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm leading-relaxed">
          {tagline}
        </p>

        <ul className="text-left mb-6 space-y-2">
          {config.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <Icon className="w-4 h-4 text-blue-500 shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        <button
          onClick={() => navigate("/pricing")}
          className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-600/25"
        >
          <Icon className="w-4 h-4" />
          Upgrade to {config.label}
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          14-day free trial&nbsp;&nbsp;·&nbsp;&nbsp;{config.price}&nbsp;&nbsp;·&nbsp;&nbsp;Cancel anytime
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
      <div className="relative text-center max-w-md mx-auto px-6 py-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
          <Lock className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          {feature} requires a subscription
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-4 text-sm">
          Pick a plan to start using {feature.toLowerCase()}.
        </p>
        <button
          onClick={() => navigate("/pricing")}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white text-sm font-semibold transition-colors"
        >
          View plans
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
