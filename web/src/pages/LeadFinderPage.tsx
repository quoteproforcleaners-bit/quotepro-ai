import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

const TABS = [
  { key: "new", label: "New" },
  { key: "saved", label: "Saved" },
  { key: "contacted", label: "Contacted" },
  { key: "all", label: "All" },
];

const INTENT_LABELS: Record<string, string> = {
  recommendation_request: "Recommendation",
  quote_request: "Quote Request",
  recurring_cleaning: "Recurring",
  deep_clean: "Deep Clean",
  move_out: "Move-Out",
  move_in: "Move-In",
  one_time_clean: "One-Time",
  other: "General",
};

function timeAgo(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function scoreColor(score: number) {
  if (score >= 70) return { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" };
  if (score >= 40) return { bg: "bg-amber-50 border-amber-200", text: "text-amber-700" };
  return { bg: "bg-gray-100 border-gray-200", text: "text-gray-500" };
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    new: "bg-violet-100 text-violet-700",
    saved: "bg-blue-100 text-blue-700",
    contacted: "bg-emerald-100 text-emerald-700",
    dismissed: "bg-gray-100 text-gray-500",
  };
  return map[status] ?? "bg-gray-100 text-gray-500";
}

export default function LeadFinderPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("new");
  const [polling, setPolling] = useState(false);

  const { data, isLoading } = useQuery<{ leads: any[]; total: number }>({
    queryKey: ["/api/lead-finder/leads", activeTab],
    queryFn: async () => {
      const params = new URLSearchParams({ status: activeTab === "all" ? "" : activeTab, limit: "30" });
      const res = await fetch(`/api/lead-finder/leads?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const leads = data?.leads ?? [];

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/lead-finder/leads/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/lead-finder/leads"] });
    },
  });

  const handlePoll = useCallback(async () => {
    setPolling(true);
    try {
      await fetch("/api/lead-finder/poll", { method: "POST", credentials: "include" });
      await qc.invalidateQueries({ queryKey: ["/api/lead-finder/leads"] });
    } catch {}
    setPolling(false);
  }, [qc]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Local Lead Finder</h1>
            <span className="bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-md">BETA</span>
          </div>
          <p className="text-sm text-gray-500">Find people in your area already asking for cleaning help online.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/lead-finder/settings"
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Settings
          </Link>
          <button
            onClick={handlePoll}
            disabled={polling}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 flex items-center gap-2"
          >
            {polling ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            Run Scan Now
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === t.key
                ? "border-violet-600 text-violet-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 border border-gray-200 rounded-xl bg-gray-50">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="font-semibold text-gray-800 mb-2">No leads yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Try adjusting your cities, ZIP codes, subreddits, or keywords, then run a scan.
          </p>
          <button
            onClick={handlePoll}
            disabled={polling}
            className="px-5 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700"
          >
            Run Scan Now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const sc = scoreColor(lead.leadScore ?? 0);
            return (
              <div key={lead.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-violet-50 text-violet-600 text-xs font-bold px-2 py-1 rounded-full">
                      r/{lead.subreddit ?? "reddit"}
                    </span>
                    <span className="text-xs text-gray-400">{lead.postedAt ? timeAgo(lead.postedAt) : ""}</span>
                    {lead.matchedKeyword ? (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {lead.matchedKeyword}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${sc.bg} ${sc.text}`}>
                      {lead.leadScore ?? 0}
                    </span>
                    {lead.status !== "new" ? (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadge(lead.status)}`}>
                        {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <Link to={`/lead-finder/${lead.id}`} className="block hover:underline">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1">{lead.title}</h3>
                </Link>

                {lead.body ? (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{lead.body}</p>
                ) : null}

                <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                  {lead.detectedLocation ? <span>📍 {lead.detectedLocation}</span> : null}
                  {lead.intent ? <span>{INTENT_LABELS[lead.intent] ?? lead.intent}</span> : null}
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  {lead.status !== "saved" ? (
                    <button
                      onClick={() => statusMutation.mutate({ id: lead.id, status: "saved" })}
                      className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg"
                    >
                      Save Lead
                    </button>
                  ) : null}
                  {lead.status !== "contacted" ? (
                    <button
                      onClick={() => statusMutation.mutate({ id: lead.id, status: "contacted" })}
                      className="text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg"
                    >
                      Mark Contacted
                    </button>
                  ) : null}
                  <Link
                    to={`/lead-finder/${lead.id}`}
                    className="text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg"
                  >
                    Generate Reply
                  </Link>
                  {lead.status !== "dismissed" ? (
                    <button
                      onClick={() => statusMutation.mutate({ id: lead.id, status: "dismissed" })}
                      className="text-xs font-semibold text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg ml-auto"
                    >
                      Dismiss
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
