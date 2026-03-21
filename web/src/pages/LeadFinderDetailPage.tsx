import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, MapPin, Clock, Tag, ExternalLink, Bookmark,
  CheckCircle, EyeOff, Sparkles, Radio, Copy, Check, Zap,
} from "lucide-react";

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

const TONE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  professional: { label: "Professional", bg: "bg-blue-100", text: "text-blue-700" },
  warm: { label: "Warm & Friendly", bg: "bg-violet-100", text: "text-violet-700" },
  concise: { label: "Short & Direct", bg: "bg-emerald-100", text: "text-emerald-700" },
};

function timeAgo(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function QualityBadge({ score }: { score: number }) {
  if (score >= 70) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        High Intent
      </span>
    );
  }
  if (score >= 40) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        Medium Intent
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
      <span className="w-2 h-2 rounded-full bg-slate-300" />
      Low Intent
    </span>
  );
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
    setTimeout(() => setCopied(null), 2500);
  }, []);

  if (isLoading || !lead) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isDemo = lead.externalId?.startsWith("mock_");
  const urgency = lead.metadata?.urgency;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back nav */}
      <div className="mb-5">
        <Link
          to="/lead-finder"
          className="text-sm text-slate-500 hover:text-violet-600 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Lead Radar
        </Link>
      </div>

      {/* Lead post card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {/* Source badge */}
          <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200">
            <Radio className="w-3 h-3" />
            {isDemo ? "Sample Lead" : `r/${lead.subreddit ?? "reddit"}`}
          </span>
          {/* Quality */}
          <QualityBadge score={lead.leadScore ?? 0} />
          {/* Urgency */}
          {urgency === "high" ? (
            <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
              <Zap className="w-3 h-3" />
              Urgent
            </span>
          ) : urgency === "medium" ? (
            <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
              <Clock className="w-3 h-3" />
              Soon
            </span>
          ) : null}
          {/* Status */}
          {lead.status !== "new" ? (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
              lead.status === "saved" ? "bg-blue-100 text-blue-700" :
              lead.status === "contacted" ? "bg-emerald-100 text-emerald-700" :
              "bg-slate-100 text-slate-500"
            }`}>
              {lead.status}
            </span>
          ) : null}
          <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
            <Clock className="w-3 h-3" />
            {lead.postedAt ? timeAgo(lead.postedAt) : "—"}
          </span>
        </div>

        <h1 className="text-lg font-bold text-slate-900 mb-3 leading-snug">{lead.title}</h1>

        {lead.body ? (
          <p className="text-sm text-slate-600 leading-relaxed mb-4 whitespace-pre-line">{lead.body}</p>
        ) : null}

        <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400 mb-4">
          {lead.detectedLocation ? (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {lead.detectedLocation}
            </span>
          ) : null}
          {lead.matchedKeyword ? (
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              Matched: {lead.matchedKeyword}
            </span>
          ) : null}
        </div>

        {lead.postUrl && !isDemo ? (
          <a
            href={lead.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-violet-600 border border-violet-200 rounded-lg px-3 py-1.5 hover:bg-violet-50 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Original Post
          </a>
        ) : null}
        {isDemo ? (
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            Sample lead — run a scan with your city set to see real local leads
          </div>
        ) : null}
      </div>

      {/* AI Analysis */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">AI Analysis</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
          <div>
            <p className="text-xs text-slate-400 mb-1">Intent Type</p>
            <p className="text-sm font-semibold text-slate-800">{INTENT_LABELS[lead.intent ?? ""] ?? "—"}</p>
          </div>
          {lead.detectedLocation ? (
            <div>
              <p className="text-xs text-slate-400 mb-1">Location</p>
              <p className="text-sm font-semibold text-slate-800">{lead.detectedLocation}</p>
            </div>
          ) : null}
          <div>
            <p className="text-xs text-slate-400 mb-1">Confidence</p>
            <p className="text-sm font-semibold text-slate-800">{lead.aiConfidence ?? 0}%</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Lead Score</p>
            <p className={`text-sm font-bold ${
              (lead.leadScore ?? 0) >= 70 ? "text-emerald-600" :
              (lead.leadScore ?? 0) >= 40 ? "text-amber-600" : "text-slate-400"
            }`}>
              {lead.leadScore ?? 0} / 100
            </p>
          </div>
        </div>
        {lead.aiReason ? (
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 border border-slate-100">
            {lead.aiReason}
          </div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => statusMutation.mutate("saved")}
          disabled={lead.status === "saved"}
          className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          <Bookmark className="w-4 h-4" />
          Save
        </button>
        <button
          onClick={() => statusMutation.mutate("contacted")}
          disabled={lead.status === "contacted"}
          className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          Contacted
        </button>
        <button
          onClick={() => { statusMutation.mutate("dismissed"); navigate("/lead-finder"); }}
          className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
        >
          <EyeOff className="w-4 h-4" />
          Dismiss
        </button>
      </div>

      {/* AI Reply Generator */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              AI Outreach Replies
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Crafted to sound helpful and human — not spammy</p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 disabled:opacity-60 transition-colors"
          >
            {generating ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {generating ? "Generating..." : (replies.length > 0 ? "Regenerate" : "Generate Replies")}
          </button>
        </div>

        {replies.length > 0 ? (
          <div className="space-y-3">
            {replies.map((r) => {
              const tone = TONE_STYLES[r.tone] ?? { label: r.tone, bg: "bg-slate-100", text: "text-slate-600" };
              const isCopied = copied === r.tone;
              return (
                <div key={r.id ?? r.tone} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${tone.bg} ${tone.text}`}>
                      {tone.label}
                    </span>
                    <button
                      onClick={() => handleCopy(r.replyText, r.tone)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        isCopied
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700"
                      }`}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {isCopied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{r.replyText}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10">
            <Sparkles className="w-8 h-8 text-violet-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-1">No replies generated yet</p>
            <p className="text-xs text-slate-400">
              Generate 3 tone variants — professional, warm, and concise — tailored to this specific post.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
