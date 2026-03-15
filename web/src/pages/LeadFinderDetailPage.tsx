import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";

const INTENT_LABELS: Record<string, string> = {
  recommendation_request: "Recommendation Request",
  quote_request: "Quote Request",
  recurring_cleaning: "Recurring Cleaning",
  deep_clean: "Deep Clean",
  move_out: "Move-Out Cleaning",
  move_in: "Move-In Cleaning",
  one_time_clean: "One-Time Clean",
  other: "General Inquiry",
};

const TONE_STYLES: Record<string, { color: string; label: string }> = {
  professional: { color: "blue", label: "Professional" },
  warm: { color: "violet", label: "Warm" },
  concise: { color: "emerald", label: "Concise" },
};

function timeAgo(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function LeadFinderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: lead, isLoading } = useQuery<any>({
    queryKey: ["/api/lead-finder/leads", id],
    queryFn: async () => {
      const res = await fetch(`/api/lead-finder/leads/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const [replies, setReplies] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (lead?.replies?.length > 0 && replies.length === 0) {
    setReplies(lead.replies);
  }

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      fetch(`/api/lead-finder/leads/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/lead-finder/leads", id] });
      qc.invalidateQueries({ queryKey: ["/api/lead-finder/leads"] });
    },
  });

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/lead-finder/leads/${id}/generate-replies`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      setReplies(data.replies ?? []);
    } catch {}
    setGenerating(false);
  }, [id]);

  const handleCopy = useCallback(async (text: string, tone: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(tone);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  if (isLoading || !lead) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const scoreColor = lead.leadScore >= 70 ? "text-emerald-600" : lead.leadScore >= 40 ? "text-amber-600" : "text-gray-400";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <Link to="/lead-finder" className="text-sm text-violet-600 hover:underline flex items-center gap-1">
          ← Back to Lead Finder
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-violet-50 text-violet-600 text-xs font-bold px-2 py-1 rounded-full">
            r/{lead.subreddit ?? "reddit"}
          </span>
          <span className="text-xs text-gray-400">{lead.postedAt ? timeAgo(lead.postedAt) : ""}</span>
          <span className={`text-xs font-bold ml-auto ${scoreColor}`}>Score: {lead.leadScore ?? 0}</span>
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">{lead.title}</h1>
        {lead.body ? <p className="text-sm text-gray-600 leading-relaxed mb-4">{lead.body}</p> : null}
        {lead.postUrl ? (
          <a
            href={lead.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-violet-600 border border-violet-200 rounded-lg px-3 py-1.5 hover:bg-violet-50"
          >
            View Original Post ↗
          </a>
        ) : null}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">AI Analysis</h2>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Intent</div>
            <div className="text-sm font-semibold text-gray-800">{INTENT_LABELS[lead.intent ?? ""] ?? lead.intent ?? "—"}</div>
          </div>
          {lead.detectedLocation ? (
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Location</div>
              <div className="text-sm font-semibold text-gray-800">{lead.detectedLocation}</div>
            </div>
          ) : null}
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Confidence</div>
            <div className="text-sm font-semibold text-gray-800">{lead.aiConfidence ?? 0}%</div>
          </div>
        </div>
        {lead.aiReason ? (
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">{lead.aiReason}</div>
        ) : null}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => statusMutation.mutate("saved")}
          disabled={lead.status === "saved"}
          className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          Save Lead
        </button>
        <button
          onClick={() => statusMutation.mutate("contacted")}
          disabled={lead.status === "contacted"}
          className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
        >
          Mark Contacted
        </button>
        <button
          onClick={() => { statusMutation.mutate("dismissed"); navigate("/lead-finder"); }}
          className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50"
        >
          Dismiss
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Suggested Replies</h2>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 disabled:opacity-60"
          >
            {generating ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : null}
            Generate Reply
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Suggested replies are designed to sound helpful and human, not spammy.</p>

        {replies.length > 0 ? (
          <div className="space-y-3">
            {replies.map((r) => {
              const meta = TONE_STYLES[r.tone] ?? { color: "gray", label: r.tone };
              const colorMap: Record<string, string> = {
                blue: "bg-blue-50 text-blue-700",
                violet: "bg-violet-50 text-violet-700",
                emerald: "bg-emerald-50 text-emerald-700",
              };
              const pillClass = colorMap[meta.color] ?? "bg-gray-100 text-gray-600";
              return (
                <div key={r.id ?? r.tone} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pillClass}`}>{meta.label}</span>
                    <button
                      onClick={() => handleCopy(r.replyText, r.tone)}
                      className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1"
                    >
                      {copied === r.tone ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{r.replyText}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-gray-400">
            Tap Generate Reply to create 3 tone variants
          </div>
        )}
      </div>
    </div>
  );
}
