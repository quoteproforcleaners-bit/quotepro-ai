import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Bot, MessageCircle, Settings, RefreshCw, Search, UserCheck, Cpu } from "lucide-react";
import { PageHeader } from "../components/ui";

const PURPLE = "#7C3AED";

type Filter = "all" | "ai" | "handoff" | "intake" | "unread";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ai", label: "AI Active" },
  { key: "handoff", label: "Needs Human" },
  { key: "intake", label: "Intake" },
  { key: "unread", label: "Unread" },
];

function getStatusBadge(thread: any): { label: string; color: string; bg: string } {
  if (thread.handoffStatus === "human") return { label: "Needs Human", color: "#DC2626", bg: "#FEE2E2" };
  if (thread.currentState === "intake") return { label: "Intake In Progress", color: "#D97706", bg: "#FEF3C7" };
  if (thread.currentState === "complete") return { label: "Quote Ready", color: "#059669", bg: "#D1FAE5" };
  if (thread.aiStatus === "paused") return { label: "Paused", color: "#6B7280", bg: "#F3F4F6" };
  return { label: "AI Active", color: PURPLE, bg: "#F5F3FF" };
}

export default function AIQuoteAssistantPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const { data: threads = [], isLoading, refetch, isRefetching } = useQuery<any[]>({
    queryKey: ["/api/ai-assistant/threads"],
  });

  const filtered = (threads as any[]).filter((t) => {
    const matchFilter =
      filter === "all" ||
      (filter === "ai" && t.aiStatus === "active") ||
      (filter === "handoff" && t.handoffStatus === "human") ||
      (filter === "intake" && t.currentState === "intake");
    const matchSearch =
      !search ||
      t.phoneNumber?.includes(search) ||
      (t.customerName || "").toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu size={22} color={PURPLE} />
            <h1 className="text-2xl font-bold text-gray-900">AI Quote Assistant</h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: PURPLE }}>BETA</span>
          </div>
          <p className="text-sm text-gray-500">Answer leads faster, collect quote details, and automate common customer questions.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
            disabled={isRefetching}
          >
            <RefreshCw size={16} className={isRefetching ? "animate-spin" : ""} />
          </button>
          <Link to="/ai-quote-assistant/settings" className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
            <Settings size={16} />
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === f.key
                ? "text-white border-transparent"
                : "text-gray-600 border-gray-200 bg-white hover:bg-gray-50"
            }`}
            style={filter === f.key ? { backgroundColor: PURPLE, borderColor: PURPLE } : {}}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Threads */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MessageCircle size={48} className="mx-auto mb-4 opacity-40" />
          <p className="text-lg font-semibold text-gray-600 mb-2">No conversations yet.</p>
          <p className="text-sm max-w-sm mx-auto">Once customers text your business number, their conversations will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((thread) => {
            const badge = getStatusBadge(thread);
            const lastAt = thread.lastMessageAt
              ? new Date(thread.lastMessageAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
              : "";
            return (
              <button
                key={thread.id}
                onClick={() => navigate(`/ai-quote-assistant/${thread.id}`)}
                className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: PURPLE + "20" }}>
                    <UserCheck size={18} color={PURPLE} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900">{thread.customerName || thread.phoneNumber}</span>
                      <span className="text-xs text-gray-400">{lastAt}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{thread.phoneNumber}</p>
                    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: badge.color, backgroundColor: badge.bg }}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
