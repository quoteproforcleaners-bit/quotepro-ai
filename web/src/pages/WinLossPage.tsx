import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart2, TrendingDown, Users, MessageSquare, Lightbulb, RefreshCw } from "lucide-react";
import { apiRequest } from "../lib/api";
import { PageHeader, Spinner } from "../components/ui";

const CATEGORY_LABELS: Record<string, string> = {
  price_too_high: "Price too high",
  went_with_competitor: "Went with someone else",
  no_longer_needed: "No longer needed",
  no_response_yet: "No response yet",
  other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  price_too_high: "#ef4444",
  went_with_competitor: "#f97316",
  no_longer_needed: "#8b5cf6",
  no_response_yet: "#94a3b8",
  other: "#6b7280",
};

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#eff6ff" }}>
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-slate-800 leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function WinLossPage() {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const { data, isLoading, error } = useQuery<{
    totalSent: number;
    responded: number;
    responseRate: number;
    mostCommonReason: string | null;
    categoryCounts: Record<string, number>;
    competitors: { name: string; count: number }[];
    rows: {
      id: string;
      quoteId: string;
      customerEmail: string;
      reasonCategory: string | null;
      competitorMentioned: string | null;
      reason: string | null;
      respondedAt: string | null;
      quoteTotal: number | null;
      createdAt: string;
    }[];
  }>({
    queryKey: ["/api/win-loss"],
    queryFn: () => apiRequest("GET", "/api/win-loss") as any,
  });

  const handleGetInsight = async () => {
    setLoadingInsight(true);
    setAiInsight(null);
    try {
      const res = await apiRequest("POST", "/api/ai/win-loss-insight", {}) as any;
      setAiInsight(res.insight || null);
    } catch {
      setAiInsight("Failed to load AI insight. Please try again.");
    } finally {
      setLoadingInsight(false);
    }
  };

  const catEntries = Object.entries(data?.categoryCounts || {}).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...catEntries.map(([, v]) => v), 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-sm text-red-500">Failed to load win/loss data.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Win/Loss Analysis"
        subtitle="Understand why customers don't book — and use it to sharpen your pricing."
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Follow-Ups Sent"
          value={data?.totalSent ?? 0}
          icon={MessageSquare}
          sub="to expired quotes"
        />
        <StatCard
          label="Responses"
          value={data?.responded ?? 0}
          icon={Users}
        />
        <StatCard
          label="Response Rate"
          value={`${data?.responseRate ?? 0}%`}
          icon={BarChart2}
        />
        <StatCard
          label="Top Reason"
          value={
            data?.mostCommonReason
              ? CATEGORY_LABELS[data.mostCommonReason] ?? data.mostCommonReason
              : "—"
          }
          icon={TrendingDown}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reason breakdown */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Reason Breakdown</h2>
          {catEntries.length === 0 ? (
            <p className="text-xs text-slate-400">No responses yet. Follow-up emails go out automatically to expired quotes.</p>
          ) : (
            <div className="space-y-3">
              {catEntries.map(([cat, count]) => {
                const pct = Math.round((count / maxCount) * 100);
                const responded = data?.responded || 1;
                const share = Math.round((count / responded) * 100);
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-slate-600">
                        {CATEGORY_LABELS[cat] ?? cat}
                      </span>
                      <span className="text-xs text-slate-400">{count} ({share}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background: CATEGORY_COLORS[cat] ?? "#6b7280",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Competitor mentions */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Competitor Mentions</h2>
          {!data?.competitors?.length ? (
            <p className="text-xs text-slate-400">
              No competitor names collected yet. They appear when customers select "Went with someone else" and name a competitor.
            </p>
          ) : (
            <div className="space-y-2">
              {data.competitors.slice(0, 10).map((c, i) => (
                <div key={c.name} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-700 capitalize">{c.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-50 rounded-full px-2 py-0.5">
                    {c.count}×
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Insight */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#faf5ff" }}>
              <Lightbulb className="w-4 h-4 text-purple-600" />
            </div>
            <h2 className="text-sm font-semibold text-slate-700">AI Insight</h2>
          </div>
          <button
            onClick={handleGetInsight}
            disabled={loadingInsight}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
          >
            {loadingInsight ? (
              <Spinner size="sm" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {aiInsight ? "Refresh" : "Generate Insight"}
          </button>
        </div>

        {aiInsight ? (
          <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-4">
            {aiInsight}
          </p>
        ) : (
          <p className="text-xs text-slate-400">
            Click "Generate Insight" to get an AI-powered analysis of your win/loss patterns.
          </p>
        )}
      </div>

      {/* Quote-level table */}
      {(data?.rows?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">All Follow-Ups</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">Customer</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Amount</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Reason</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Competitor</th>
                  <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-700 max-w-[180px] truncate">
                      {row.customerEmail}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.quoteTotal != null
                        ? `$${row.quoteTotal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {row.reasonCategory ? (
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{
                            background: `${CATEGORY_COLORS[row.reasonCategory] ?? "#6b7280"}18`,
                            color: CATEGORY_COLORS[row.reasonCategory] ?? "#6b7280",
                          }}
                        >
                          {CATEGORY_LABELS[row.reasonCategory] ?? row.reasonCategory}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {row.competitorMentioned || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {row.respondedAt ? (
                        <span className="text-xs font-medium text-green-600">Responded</span>
                      ) : (
                        <span className="text-xs text-slate-400">Awaiting</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(data?.rows?.length ?? 0) === 0 && !isLoading && (
        <div className="bg-white rounded-xl border border-slate-100 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <BarChart2 className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">No data yet</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Win/loss follow-up emails are sent automatically when quotes expire or go cold for 2+ days. Data will appear here once customers respond.
          </p>
        </div>
      )}
    </div>
  );
}
