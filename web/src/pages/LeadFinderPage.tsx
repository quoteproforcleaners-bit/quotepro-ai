import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ProGate } from "../components/ProGate";
import {
  RefreshCw, Settings, MapPin, Clock, Tag, MessageSquare,
  Bookmark, CheckCircle, EyeOff, ExternalLink, AlertCircle,
  Sparkles, ChevronRight, Radio, Zap, TrendingUp, Target,
  Globe,
} from "lucide-react";

const TABS = [
  { key: "all", label: "All" },
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

function getQualityBadge(score: number): { label: string; color: string; dot: string } {
  if (score >= 70) return { label: "High Intent", color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
  if (score >= 40) return { label: "Med Intent", color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-400" };
  return { label: "Low Intent", color: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-300" };
}

function getUrgencyBadge(lead: any): { label: string; color: string } | null {
  const urgency = lead.metadata?.urgency || lead.urgency;
  if (urgency === "high") return { label: "Urgent", color: "bg-red-100 text-red-700" };
  if (urgency === "medium") return { label: "Soon", color: "bg-amber-50 text-amber-600" };
  return null;
}

function ScanResult({ result }: { result: any }) {
  if (!result) return null;

  const isDemoData = result.usedLive === false;
  const hasHighQuality = result.stored > 0;

  if (isDemoData) {
    return (
      <div className="rounded-xl bg-violet-50 border border-violet-200 px-4 py-3 flex items-start gap-3 text-sm text-violet-800 mb-5">
        <Sparkles className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Sample leads loaded</span> — Reddit returned no live posts for your current settings.
          {" "}<Link to="/lead-finder/settings" className="underline underline-offset-2 hover:text-violet-900">Add your city</Link> to get real local leads.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3 text-sm text-emerald-800 mb-5">
      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
      <span>
        Scan complete —{" "}
        {hasHighQuality ? (
          <><strong>{result.stored}</strong> new lead{result.stored !== 1 ? "s" : ""} found</>
        ) : (
          <>posts reviewed, no new leads (all already seen)</>
        )}
        {result.processed > 0 ? `, ${result.processed} posts analyzed` : ""}
      </span>
    </div>
  );
}

function EmptyState({ onScan, scanning, tab, hasCityTargeting }: { onScan: () => void; scanning: boolean; tab: string; hasCityTargeting: boolean }) {
  const isFiltered = tab !== "all";

  if (isFiltered) {
    return (
      <div className="border border-slate-200 rounded-xl bg-white p-10 text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Target className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="font-semibold text-slate-800 mb-1">No {tab} leads</h3>
        <p className="text-sm text-slate-500 mb-4">
          Switch to <strong>All</strong> to see everything, or run a scan to find new opportunities.
        </p>
        <button
          onClick={() => {}}
          className="text-sm text-violet-600 hover:underline"
        >
          View all leads
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main empty state */}
      <div className="border border-slate-200 rounded-xl bg-white p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Radio className="w-7 h-7 text-white" />
        </div>
        <h3 className="font-bold text-slate-900 text-lg mb-2">Your radar is ready — let's find leads</h3>
        <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto leading-relaxed">
          Lead Radar scans Reddit and public sources for people actively asking for cleaning services in your area.
        </p>
        <button
          onClick={onScan}
          disabled={scanning}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors"
        >
          <Radio className={`w-4 h-4 ${scanning ? "animate-pulse" : ""}`} />
          {scanning ? "Scanning..." : "Run First Scan"}
        </button>
      </div>

      {/* Actionable next steps */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {!hasCityTargeting ? (
          <Link
            to="/lead-finder/settings"
            className="bg-white border-2 border-amber-200 rounded-xl p-4 hover:border-amber-300 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Recommended</span>
            </div>
            <p className="text-sm font-semibold text-slate-800 mb-0.5">Add your city</p>
            <p className="text-xs text-slate-500">City targeting finds 3-5x more local leads in city subreddits</p>
            <p className="text-xs text-violet-600 font-semibold mt-2 group-hover:underline">Open Settings →</p>
          </Link>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Active</span>
            </div>
            <p className="text-sm font-semibold text-slate-800 mb-0.5">City targeting on</p>
            <p className="text-xs text-slate-500">Scanning city subreddits for local leads</p>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
            <Tag className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-sm font-semibold text-slate-800 mb-0.5">30+ keywords tracked</p>
          <p className="text-xs text-slate-500">Covers move-out, recurring, deep clean, recommendations, and more</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center mb-2">
            <MessageSquare className="w-4 h-4 text-violet-600" />
          </div>
          <p className="text-sm font-semibold text-slate-800 mb-0.5">AI reply drafts</p>
          <p className="text-xs text-slate-500">Each lead gets an AI-crafted outreach message you can send in seconds</p>
        </div>
      </div>

      {/* Zero-result guidance */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-slate-400" />
          Why might scans return zero results?
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
          {[
            { icon: Globe, text: "Reddit's API can be intermittent. Scans use multiple endpoints as fallback." },
            { icon: MapPin, text: "No city set — without a target city, scans search broad topic subreddits only." },
            { icon: Tag, text: "Add more keywords or use a broader keyword pack in Settings." },
            { icon: Clock, text: "Lead demand varies — try scanning at different times of day." },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-start gap-2">
              <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>{text}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-3">
          <button
            onClick={onScan}
            disabled={scanning}
            className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scanning..." : "Try again"}
          </button>
          <span className="text-slate-300">|</span>
          <Link to="/lead-finder/settings" className="text-xs font-semibold text-slate-600 hover:text-violet-600 flex items-center gap-1">
            <Settings className="w-3.5 h-3.5" />
            Adjust scan settings
          </Link>
        </div>
      </div>
    </div>
  );
}

function LeadCard({ lead, onStatus }: { lead: any; onStatus: (id: string, status: string) => void }) {
  const intent = INTENT_LABELS[lead.intent] ?? INTENT_LABELS.other;
  const quality = getQualityBadge(lead.leadScore ?? 0);
  const urgency = getUrgencyBadge(lead);
  const isDemo = lead.externalId?.startsWith("mock_");

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-violet-200 hover:shadow-sm transition-all group">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {/* Quality badge — most prominent */}
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${quality.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${quality.dot}`} />
            {quality.label}
          </span>
          {urgency ? (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${urgency.color}`}>
              <Zap className="w-3 h-3" />
              {urgency.label}
            </span>
          ) : null}
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
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {lead.postedAt ? timeAgo(lead.postedAt) : "unknown"}
          </span>
        </div>
      </div>

      {/* Title */}
      <Link to={`/lead-finder/${lead.id}`} className="block mb-2">
        <h3 className="font-semibold text-slate-900 text-sm leading-snug group-hover:text-violet-700 transition-colors">
          {lead.title}
        </h3>
      </Link>

      {/* Body preview */}
      {lead.body ? (
        <p className="text-xs text-slate-500 line-clamp-2 mb-2.5 leading-relaxed">{lead.body}</p>
      ) : null}

      {/* Meta row */}
      <div className="flex items-center gap-3 text-xs text-slate-400 mb-3 flex-wrap">
        {/* Source badge */}
        <span className="flex items-center gap-1 font-medium text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
          <Radio className="w-3 h-3" />
          {isDemo ? "Sample" : `r/${lead.subreddit || "reddit"}`}
        </span>
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
          <span className="flex items-center gap-1 italic truncate max-w-xs" title={lead.aiReason}>
            <TrendingUp className="w-3 h-3 shrink-0" />
            <span className="truncate">{lead.aiReason}</span>
          </span>
        ) : null}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100 flex-wrap">
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
          <Sparkles className="w-3.5 h-3.5" />
          AI Reply
          <ChevronRight className="w-3 h-3" />
        </Link>
        {lead.postUrl && !lead.postUrl.includes("mock") ? (
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

  const { data: settingsData } = useQuery<any>({
    queryKey: ["/api/lead-finder/settings"],
    queryFn: async () => {
      const res = await fetch("/api/lead-finder/settings", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const hasCityTargeting = (settingsData?.targetCities?.length ?? 0) > 0;

  const leads = (data?.leads ?? []).filter((l) => activeTab === "all" ? l.status !== "dismissed" : true);

  const highCount = leads.filter((l) => (l.leadScore ?? 0) >= 70).length;
  const medCount = leads.filter((l) => (l.leadScore ?? 0) >= 40 && (l.leadScore ?? 0) < 70).length;

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
    <ProGate feature="Lead Radar" minTier="pro">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-sm">
                <Radio className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Lead Radar</h1>
              <span className="bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-md">PRO</span>
            </div>
            <p className="text-sm text-slate-500">
              Discover people actively asking for cleaning services — before your competitors do.
            </p>
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
              <Radio className={`w-4 h-4 ${polling ? "animate-pulse" : ""}`} />
              {polling ? "Scanning..." : "Scan Now"}
            </button>
          </div>
        </div>

        {/* Scan result banner */}
        {lastScanResult ? <ScanResult result={lastScanResult} /> : null}

        {/* City targeting nudge */}
        {!hasCityTargeting && !isLoading && leads.length > 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm mb-5">
            <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-amber-800">
              <strong>Add your city</strong> in Settings to scan local city subreddits and find 3-5x more leads.
            </span>
            <Link to="/lead-finder/settings" className="ml-auto text-xs font-bold text-amber-700 hover:text-amber-800 whitespace-nowrap">
              Add City →
            </Link>
          </div>
        ) : null}

        {/* Stats strip */}
        {leads.length > 0 ? (
          <div className="flex items-center gap-4 mb-4 text-xs">
            <span className="text-slate-500 font-medium">{leads.length} lead{leads.length !== 1 ? "s" : ""}</span>
            {highCount > 0 ? (
              <span className="flex items-center gap-1 text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {highCount} High Intent
              </span>
            ) : null}
            {medCount > 0 ? (
              <span className="flex items-center gap-1 text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                {medCount} Med Intent
              </span>
            ) : null}
            <span className="ml-auto text-slate-400">Sorted by relevance</span>
          </div>
        ) : null}

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-4">
          {TABS.map((t) => {
            const count = t.key === "all"
              ? leads.length
              : (data?.leads ?? []).filter((l) => l.status === t.key).length;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === t.key
                    ? "border-violet-600 text-violet-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
                {count > 0 ? (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === t.key ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
          {(isFetching && !isLoading) ? (
            <div className="ml-auto flex items-center py-2.5 pr-1">
              <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
            </div>
          ) : null}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="text-center">
              <Radio className="w-6 h-6 text-violet-500 animate-pulse mx-auto mb-2" />
              <p className="text-sm text-slate-400">Loading leads...</p>
            </div>
          </div>
        ) : leads.length === 0 ? (
          <EmptyState onScan={handlePoll} scanning={polling} tab={activeTab} hasCityTargeting={hasCityTargeting} />
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onStatus={(id, status) => statusMutation.mutate({ id, status })}
              />
            ))}
          </div>
        )}
      </div>
    </ProGate>
  );
}
