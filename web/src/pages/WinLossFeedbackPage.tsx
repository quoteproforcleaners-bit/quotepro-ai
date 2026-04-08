import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const CATEGORIES = [
  { id: "price_too_high", label: "Price was too high" },
  { id: "went_with_competitor", label: "Went with someone else" },
  { id: "no_longer_needed", label: "No longer need cleaning" },
  { id: "other", label: "Other reason" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

export default function WinLossFeedbackPage() {
  const { token } = useParams<{ token: string }>();
  const [businessName, setBusinessName] = useState("Your cleaning company");
  const [loading, setLoading] = useState(true);
  const [alreadyResponded, setAlreadyResponded] = useState(false);
  const [selected, setSelected] = useState<CategoryId | null>(null);
  const [competitor, setCompetitor] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/feedback/${token}`)
      .then((r) => r.json())
      .then((data) => {
        setBusinessName(data.businessName || "Your cleaning company");
        setAlreadyResponded(data.alreadyResponded);
      })
      .catch(() => setError("This link appears to be invalid."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    if (!selected || !token) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/feedback/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason_category: selected,
          competitor_mentioned: selected === "went_with_competitor" ? competitor.trim() || undefined : undefined,
          reason: selected === "other" ? otherReason.trim() || undefined : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !selected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center max-w-sm">
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted || alreadyResponded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 max-w-sm w-full text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "#f0fdf4" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-3">Thank you for your feedback</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            {alreadyResponded && !submitted
              ? "We already received your feedback. Thanks for taking the time."
              : `Your response helps ${businessName} improve their service and pricing.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-full max-w-md p-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">Quick Feedback</p>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Thanks for considering {businessName}
          </h1>
          <p className="text-sm text-slate-500">
            What was the main reason you didn't move forward?
          </p>
        </div>

        {/* Category buttons */}
        <div className="space-y-3 mb-5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelected(cat.id)}
              className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-150 font-medium text-sm ${
                selected === cat.id
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    selected === cat.id ? "border-blue-500 bg-blue-500" : "border-slate-300"
                  }`}
                >
                  {selected === cat.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                  )}
                </span>
                {cat.label}
              </span>
            </button>
          ))}
        </div>

        {/* Competitor input */}
        {selected === "went_with_competitor" && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Who did you go with? <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={competitor}
              onChange={(e) => setCompetitor(e.target.value)}
              placeholder="Company name"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
        )}

        {/* Other reason input */}
        {selected === "other" && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Can you tell us more? <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              placeholder="Any details help..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
            />
          </div>
        )}

        {error && (
          <p className="text-xs text-red-500 mb-3">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!selected || submitting}
          className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: selected ? "#2563eb" : undefined,
            color: selected ? "#ffffff" : undefined,
            backgroundColor: !selected ? "#f1f5f9" : undefined,
          }}
        >
          {submitting ? "Submitting..." : "Submit Feedback"}
        </button>

        <p className="text-center text-xs text-slate-400 mt-4">
          Takes 10 seconds. Your response is anonymous.
        </p>
      </div>
    </div>
  );
}
