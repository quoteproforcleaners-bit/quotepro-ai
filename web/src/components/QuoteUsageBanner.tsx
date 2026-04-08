import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useSubscription } from "../lib/subscription";

interface QuoteCountData {
  count: number;
  limit: number | null;
  isPro: boolean;
}

export default function QuoteUsageBanner() {
  const { hasUnlimitedQuotes, isInFreeTrial, freeTrialDaysLeft, tier, showPaywall, startCheckout, checkoutLoading } = useSubscription();

  const { data } = useQuery<QuoteCountData>({
    queryKey: ["/api/quotes/count"],
    staleTime: 60_000,
  });

  if (!data) return null;
  if (hasUnlimitedQuotes) return null;

  const { count, limit } = data;
  if (limit === null) return null;

  const pct = Math.min(1, count / limit);
  const remaining = Math.max(0, limit - count);
  const isAtLimit = count >= limit;
  const isNearLimit = pct >= 0.8 && !isAtLimit;

  if (!isAtLimit && !isNearLimit && !(isInFreeTrial && freeTrialDaysLeft <= 3)) return null;

  const nextPlan = tier === "starter" ? "Growth" : "Growth";

  return (
    <div
      className="rounded-xl mb-4 overflow-hidden"
      style={{
        border: isAtLimit
          ? "1px solid rgba(239,68,68,0.35)"
          : "1px solid rgba(245,158,11,0.35)",
        background: isAtLimit
          ? "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.04))"
          : "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.04))",
      }}
    >
      <div className="px-4 py-3 flex items-center gap-3 flex-wrap sm:flex-nowrap">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: isAtLimit
              ? "rgba(239,68,68,0.15)"
              : "rgba(245,158,11,0.15)",
          }}
        >
          <AlertTriangle
            className="w-4 h-4"
            style={{ color: isAtLimit ? "#ef4444" : "#f59e0b" }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {isAtLimit
              ? tier === "free"
                ? "Free quote limit reached"
                : "Monthly quote limit reached"
              : isInFreeTrial
              ? `${freeTrialDaysLeft} day${freeTrialDaysLeft !== 1 ? "s" : ""} left in your free trial`
              : `${remaining} quote${remaining !== 1 ? "s" : ""} remaining this month`}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.08)", maxWidth: "160px" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round(pct * 100)}%`,
                  background: isAtLimit
                    ? "linear-gradient(90deg, #ef4444, #dc2626)"
                    : pct >= 0.8
                    ? "linear-gradient(90deg, #f59e0b, #d97706)"
                    : "linear-gradient(90deg, #6366f1, #4f46e5)",
                }}
              />
            </div>
            <span className="text-xs shrink-0" style={{ color: "var(--color-text-tertiary)" }}>
              {count} / {limit} used
            </span>
          </div>
        </div>

        <button
          onClick={isAtLimit ? () => showPaywall() : () => startCheckout("growth")}
          disabled={checkoutLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0"
          style={{
            background: isAtLimit
              ? "linear-gradient(135deg, #6366f1, #7c3aed)"
              : "linear-gradient(135deg, #6366f1, #7c3aed)",
            color: "white",
            opacity: checkoutLoading ? 0.7 : 1,
          }}
        >
          Upgrade to {nextPlan}
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
