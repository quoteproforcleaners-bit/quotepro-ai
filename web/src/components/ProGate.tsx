import { useSubscription } from "../lib/subscription";
import { useNavigate } from "react-router-dom";
import { TrendingUp, ArrowRight, Lock } from "lucide-react";

export function ProGate({
  children,
  feature,
}: {
  children: React.ReactNode;
  feature: string;
}) {
  const { isGrowth } = useSubscription();
  const navigate = useNavigate();

  if (isGrowth) return <>{children}</>;

  return (
    <div className="relative min-h-[60vh] flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/0 via-slate-50/80 to-slate-50 pointer-events-none" />
      <div className="relative text-center max-w-md mx-auto px-6">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/25">
          <Lock className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {feature} is a Growth feature
        </h2>
        <p className="text-slate-500 mb-6 text-sm leading-relaxed">
          Upgrade to Growth to unlock {feature.toLowerCase()}, unlimited quotes, AI tools, and automated follow-ups — everything you need to close more jobs.
        </p>
        <button
          onClick={() => navigate("/pricing")}
          className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-blue-600/25"
        >
          <TrendingUp className="w-4 h-4" />
          See Growth plan
          <ArrowRight className="w-4 h-4" />
        </button>
        <p className="mt-4 text-xs text-slate-400">
          7-day free trial&nbsp;&nbsp;·&nbsp;&nbsp;$49/mo&nbsp;&nbsp;·&nbsp;&nbsp;Cancel anytime
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
      <div className="relative text-center max-w-md mx-auto px-6">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-slate-100 flex items-center justify-center">
          <Lock className="w-5 h-5 text-slate-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          {feature} requires a subscription
        </h2>
        <p className="text-slate-500 mb-4 text-sm">
          Pick a plan to start using {feature.toLowerCase()}.
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
