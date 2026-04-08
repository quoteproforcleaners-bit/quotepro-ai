import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "../lib/subscription";
import { apiPost } from "../lib/api";
import { X, Zap } from "lucide-react";

const DISMISS_KEY = "qp_annual_banner_dismissed_until";
const DISMISS_DAYS = 30;

export function AnnualUpgradeBanner() {
  const { tier, subscriptionInterval, platform, subscriptionStatus } = useSubscription();
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Read localStorage dismissal on mount
  useEffect(() => {
    const until = localStorage.getItem(DISMISS_KEY);
    if (until && Date.now() < parseInt(until, 10)) {
      setDismissed(true);
    }
  }, []);

  // Only show for Growth monthly Stripe subscribers
  const shouldShow =
    !dismissed &&
    !success &&
    tier === "growth" &&
    subscriptionInterval === "monthly" &&
    subscriptionStatus === "active" &&
    (platform === "stripe" || platform === null);

  if (!shouldShow) return null;

  const handleDismiss = () => {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
    setDismissed(true);
  };

  const handleSwitch = async () => {
    setLoading(true);
    try {
      await apiPost("/api/subscription/switch-to-annual", {});
      setSuccess(true);
      // Invalidate subscription status so banner hides and interval updates
      qc.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    } catch (err: any) {
      console.error("[AnnualUpgradeBanner]", err);
      alert(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-600 text-white px-4 py-2.5 flex items-center justify-center gap-3 text-sm">
        <Zap size={14} className="shrink-0" />
        <span className="font-medium">Switched to annual billing — you&apos;re saving $96/year!</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 flex items-center gap-3">
      <Zap size={14} className="shrink-0 text-blue-200" />
      <p className="flex-1 text-sm">
        <span className="font-semibold">Save $96/year</span>
        <span className="text-blue-100"> — switch to annual billing for </span>
        <span className="font-semibold">$41/mo</span>
      </p>
      <button
        onClick={handleSwitch}
        disabled={loading}
        className="shrink-0 bg-white text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors disabled:opacity-70"
      >
        {loading ? "Switching…" : "Switch now"}
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 text-blue-200 hover:text-white transition-colors p-1 rounded"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
