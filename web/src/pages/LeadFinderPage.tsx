import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ProGate } from "../components/ProGate";
import {
  RefreshCw, Settings, MapPin, Clock, Tag, MessageSquare,
  Bookmark, CheckCircle, EyeOff, ExternalLink, Star, AlertCircle,
  Sparkles, ChevronRight,
} from "lucide-react";

const TABS = [
  { key: "all", label: "All Leads" },
  { key: "new", label: "New" },
  { key: "saved", label: "Saved" },
  { key: "contacted", label: "Contacted" },
];

const INTENT_LABELS: Record<string, { label: string; color: string }> = {
  recommendation_request: { label: "Recommendation", color: "bg-violet-100 text-violet-700" },
  quote_request: { label: "Quote Request", color: "bg-blue-100 text-blue-700" },
  recurring_cleaning: { label: "Recurring", color: "bg-emerald-100 text-emerald-700" },
  deep_clean: { label: "Deep Clean", color: "bg-amber-100 text-amber-700" },
  move_out: { label: "Move-Out", color: "bg-orange-100 text-orange-700" },
  move_in: { label: "Move-In", color: "bg-teal-100 text-teal-700" },
  one_time_clean: { label: "One-Time", color: "bg-slate-100 text-slate-600" },
  other: { label: "General", color: "bg-slate-100 text-slate-500" },
};

function timeAgo(dateStr: string) {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function scoreBar(score: number) {
  if (score >= 70) return { label: "High", color: "text-emerald-700", bg: "bg-emerald-500" };
  if (score >= 40) return { label: "Med", color: "text-amber-700", bg: "bg-amber-400" };
  return { label: "Low", color: "text-slate-500", bg: "bg-slate-300" };
}

function ScanSummary({ result }: { result: any }) {
  if (!result) return null;
  return (
    <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3 text-sm text-emerald-800 mb-4">
      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
      <span>
        Scan complete — <strong>{result.stored}</strong> new lead{result.stored !== 1 ? "s" : ""} found
        {result.processed > 0 ? `, ${result.processed} posts reviewed` : ""}
        {result.usedLive === false ? " (demo data)" : ""}
      </span>
    </div>
  );
}

function EmptyState({ onScan, scanning, tab }: { onScan: () => void; scanning: boolean; tab: string }) {
  const isFiltered = tab !== "all";
  return (
    <div className="border border-slate-200 rounded-xl bg-slate-50 p-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-7 h-7 text-violet-500" />
      </div>
      {isFiltered ? (
        <>
          <h3 className="font-semibold text-slate-800 mb-1">No {tab} leads</h3>
          <p className="text-sm text-slate-500 mb-4">
            Switch to <strong>All Leads</strong> to see everything, or run a scan to find new opportunities.
          </p>
        </>
      ) : (
        <>
          <h3 className="font-semibold text-slate-800 mb-1">No leads yet — let's fix that</h3>
          <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">
            Run a scan to discover people asking for cleaning help online. The more you scan, the richer your feed gets.
          </p>
        </>
      )}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={onScan}
          disabled={scanning}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
          {scanning ? "Scanning..." : "Run Scan Now"}
        </button>
        <Link
          to="/lead-finder/settings"
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-violet-600 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Adjust Settings
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left">
        {[
          { icon: MapPin, title: "Add your city", desc: "Get geographically relevant leads from your service area" },
          { icon: Tag, title: "Set keywords", desc: "Track specific phrases like 'move out cleaning' or 'need a maid'" },
          { icon: MessageSquare, title: "Generate replies", desc: "AI writes outreach messages tailored to each lead" },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-lg border border-slate-200 bg-white p-3">
            <Icon className="w-4 h-4 text-violet-500 mb-1.5" />
            <p className="text-xs font-semibold text-slate-800 mb-0.5">{title}</p>
            <p className="text-xs text-slate-400">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeadCard({ lead, onStatus }: { lead: any; onStatus: (id: string, status: string) => void }) {
  const intent = INTENT_LABELS[lead.intent] ?? INTENT_LABELS.other;
  const score = scoreBar(lead.leadScore ?? 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-violet-200 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="bg-violet-100 text-violet-700 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
            r/{lead.subreddit ?? "reddit"}
          </span>
          {lead.intent ? (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${intent.color}`}>
              {intent.label}
            </span>
          ) : null}
          {lead.status !== "new" ? (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
              lead.status === "saved" ? "bg-blue-100 text-blue-700" :
              lead.status === "contacted" ? "bg-emerald-100 text-emerald-700" :
              "bg-slate-100 text-slate-500"
            }`}>
              {lead.status}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${score.bg}`} />
            <span className={`text-xs font-bold ${score.color}`}>{lead.leadScore ?? 0}</span>
          </div>
          {lead.postedAt ? (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(lead.postedAt)}
            </span>
          ) : null}
        </div>
      </div>

      <Link to={`/lead-finder/${lead.id}`} className="block group mb-2">
        <h3 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-violet-700 transition-colors">
          {lead.title}
        </h3>
      </Link>

      {lead.body ? (
        <p className="text-xs text-slate-500 line-clamp-2 mb-2 leading-relaxed">{lead.body}</p>
      ) : null}

      <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
        {lead.detectedLocation ? (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {lead.detectedLocation}
          </span>
        ) : null}
        {lead.matchedKeyword ? (
          <span className="flex items-center gap-1">
            <Tag className="w-3 h-3" />
            {lead.matchedKeyword}
          </span>
        ) : null}
        {lead.aiReason ? (
          <span className="flex items-center gap-1 italic text-slate-400 truncate max-w-xs" title={lead.aiReason}>
            <Star className="w-3 h-3 shrink-0" />
            <span className="truncate">{lead.aiReason}</span>
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
        {lead.status !== "saved" ? (
          <button
            onClick={() => onStatus(lead.id, "saved")}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Bookmark className="w-3.5 h-3.5" />
            Save
          </button>
        ) : null}
        {lead.status !== "contacted" ? (
          <button
            onClick={() => onStatus(lead.id, "contacted")}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Contacted
          </button>
        ) : null}
        <Link
          to={`/lead-finder/${lead.id}`}
          className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Generate Reply
          <ChevronRight className="w-3 h-3" />
        </Link>
        {lead.postUrl ? (
          <a
            href={lead.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            View Post
          </a>
        ) : null}
        {lead.status !== "dismissed" ? (
          <button
            onClick={() => onStatus(lead.id, "dismissed")}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5 rounded-lg transition-colors ml-auto"
          >
            <EyeOff className="w-3.5 h-3.5" />
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function LeadFinderPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [polling, setPolling] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<any>(null);

  const { data, isLoading, isFetching } = useQuery<{ leads: any[]; total: number }>({
    queryKey: ["/api/lead-finder/leads", activeTab],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: activeTab === "all" ? "" : activeTab,
        limit: "50",
      });
      const res = await fetch(`/api/lead-finder/leads?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const leads = (data?.leads ?? []).filter((l) => activeTab === "all" ? l.status !== "dismissed" : true);

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
    setLastScanResult(null);
    try {
      const res = await fetch("/api/lead-finder/poll", { method: "POST", credentials: "include" });
      const result = await res.json();
      setLastScanResult(result);
      await qc.invalidateQueries({ queryKey: ["/api/lead-finder/leads"] });
    } catch {}
    setPolling(false);
  }, [qc]);

  return (
    <ProGate feature="Lead Finder" minTier="pro">
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-slate-900">Local Lead Finder</h1>
              <span className="bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-md">BETA</span>
            </div>
            <p className="text-sm text-slate-500">Discover people already asking for cleaning help online.</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/lead-finder/settings"
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <button
              onClick={handlePoll}
              disabled={polling}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${polling ? "animate-spin" : ""}`} />
              {polling ? "Scanning..." : "Scan Now"}
            </button>
          </div>
        </div>

        {lastScanResult ? <ScanSummary result={lastScanResult} /> : null}

        <div className="flex border-b border-slate-200 mb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === t.key
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
          {(isFetching && !isLoading) ? (
            <div className="ml-auto flex items-center py-2.5 pr-1">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <EmptyState onScan={handlePoll} scanning={polling} tab={activeTab} />
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-400">
                {leads.length} lead{leads.length !== 1 ? "s" : ""}
                {activeTab !== "all" ? ` with status "${activeTab}"` : ""}
              </p>
              {leads.length > 0 ? (
                <p className="text-xs text-slate-400">Sorted by relevance score</p>
              ) : null}
            </div>
            <div className="space-y-3">
              {leads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onStatus={(id, status) => statusMutation.mutate({ id, status })}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </ProGate>
  );
}
