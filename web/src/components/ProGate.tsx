import { useSubscription } from "../lib/subscription";
import { useNavigate } from "react-router-dom";
import { Crown, ArrowRight, Lock } from "lucide-react";
import { Button } from "./ui";

export function ProGate({
  children,
  feature,
}: {
  children: React.ReactNode;
  feature: string;
}) {
  const { isPro } = useSubscription();
  const navigate = useNavigate();

  if (isPro) return <>{children}</>;

  return (
    <div className="relative min-h-[60vh] flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-50/0 via-slate-50/80 to-slate-50 pointer-events-none" />
      <div className="relative text-center max-w-md mx-auto px-6 animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-xl shadow-primary-600/25">
          <Lock className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {feature} is a Pro feature
        </h2>
        <p className="text-slate-500 mb-6 text-sm">
          Upgrade to QuotePro Pro to unlock {feature.toLowerCase()}, unlimited quotes, AI tools, and everything you need to grow your business.
        </p>
        <Button
          variant="primary"
          size="lg"
          icon={ArrowRight}
          onClick={() => navigate("/upgrade?source=feature_gate")}
          className="mx-auto bg-gradient-to-r from-primary-600 to-primary-700 shadow-lg shadow-primary-600/25"
        >
          Upgrade to Pro
        </Button>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Crown className="w-3.5 h-3.5" />
          <span>7-day free trial &middot; $19.99/mo &middot; Cancel anytime</span>
        </div>
      </div>
    </div>
  );
}
