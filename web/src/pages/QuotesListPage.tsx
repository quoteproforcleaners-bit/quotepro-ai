import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, FileText, ArrowUpDown, Sparkles, X } from "lucide-react";
import {
  PageHeader,
  Card,
  Badge,
  Button,
  Tabs,
  SearchInput,
  EmptyState,
  Spinner,
} from "../components/ui";

const tabs = ["all", "draft", "sent", "viewed", "accepted", "declined", "expired"];

function AIQuotesNudge({ quotesCount }: { quotesCount: number }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("qp_ai_nudge_quotes") === "1"; } catch { return false; }
  });
  if (dismissed) return null;

  const prompt = quotesCount > 0
    ? "How do I follow up on quotes without being pushy?"
    : "What should I charge for a 3-bedroom house clean?";

  const handleClick = () => {
    sessionStorage.setItem("ai_preload_question", prompt);
    sessionStorage.setItem("ai_preload_mode", quotesCount > 0 ? "coach" : "teach");
    navigate("/ai-assistant");
  };

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem("qp_ai_nudge_quotes", "1");
    setDismissed(true);
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4 cursor-pointer group"
      style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(59,130,246,0.06))", border: "1px solid rgba(99,102,241,0.15)" }}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(99,102,241,0.15)" }}>
        <Sparkles className="w-3.5 h-3.5" style={{ color: "#818cf8" }} />
      </div>
      <p className="text-sm flex-1" style={{ color: "#64748b" }}>
        <span className="font-medium" style={{ color: "#4f46e5" }}>Ask AI: </span>
        <span className="group-hover:underline">{prompt}</span>
      </p>
      <button onClick={dismiss} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <X className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
      </button>
    </div>
  );
}

export default function QuotesListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get("status") || "all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { data: quotes = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/quotes"],
  });

  const counts: Record<string, number> = {};
  for (const t of tabs) {
    counts[t] =
      t === "all"
        ? quotes.length
        : quotes.filter((q: any) => q.status === t).length;
  }

  const filtered = quotes
    .filter((q: any) => filter === "all" || q.status === filter)
    .filter(
      (q: any) =>
        !search ||
        (q.customerName || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a: any, b: any) => {
      if (sortField === "amount") {
        const diff = Number(a.total || 0) - Number(b.total || 0);
        return sortDir === "asc" ? diff : -diff;
      }
      const diff =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? diff : -diff;
    });

  const toggleSort = (field: "date" | "amount") => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const getDaysSince = (date: string) => {
    const days = Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  };

  return (
    <div>
      <PageHeader
        title="Quotes"
        subtitle={`${quotes.length} total quotes`}
        actions={
          <Button icon={Plus} onClick={() => navigate("/quotes/new")}>
            New Quote
          </Button>
        }
      />

      <AIQuotesNudge quotesCount={quotes.length} />

      <Card padding={false}>
        <div className="p-4 lg:p-5 border-b border-slate-100 space-y-3">
          <Tabs tabs={tabs} active={filter} onChange={setFilter} counts={counts} />
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by customer name..."
          />
        </div>

        {isLoading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={search ? "No quotes match your search" : "No quotes found"}
            description={
              search
                ? "Try a different search term"
                : "Create your first quote to get started"
            }
            action={
              !search ? (
                <Button icon={Plus} onClick={() => navigate("/quotes/new")}>
                  Create Quote
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 lg:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                    Type
                  </th>
                  <th
                    onClick={() => toggleSort("amount")}
                    className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      Total
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th
                    onClick={() => toggleSort("date")}
                    className="text-right px-5 lg:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell cursor-pointer hover:text-slate-700 select-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      Created
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q: any) => (
                  <tr
                    key={q.id}
                    onClick={() => navigate(`/quotes/${q.id}`)}
                    className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-5 lg:px-6 py-3.5">
                      <p className="font-medium text-slate-900">
                        {q.customerName || "No customer"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 md:hidden">
                        {getDaysSince(q.createdAt)}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 capitalize hidden sm:table-cell">
                      {(q.propertyDetails as any)?.quoteType || "residential"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                      ${Number(q.total || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={q.status} dot />
                    </td>
                    <td className="px-5 lg:px-6 py-3.5 text-right text-slate-500 hidden md:table-cell">
                      {new Date(q.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
