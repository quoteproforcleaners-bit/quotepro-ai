import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Search, FileText } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    sent: "bg-blue-50 text-blue-700",
    accepted: "bg-green-50 text-green-700",
    declined: "bg-red-50 text-red-700",
    "changes-requested": "bg-amber-50 text-amber-700",
    expired: "bg-slate-100 text-slate-500",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
        styles[status] || styles.draft
      }`}
    >
      {status.replace(/-/g, " ")}
    </span>
  );
}

const tabs = ["all", "draft", "sent", "accepted", "declined"];

export default function QuotesListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { data: quotes = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/quotes"],
  });

  const filtered = quotes
    .filter((q: any) => filter === "all" || q.status === filter)
    .filter(
      (q: any) =>
        !search ||
        (q.customerName || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Quotes</h1>
        <button
          onClick={() => navigate("/quotes/new")}
          className="flex items-center gap-2 h-10 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Quote
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-colors ${
                  filter === t
                    ? "bg-primary-50 text-primary-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                {t}
                {t !== "all" && (
                  <span className="ml-1.5 text-xs">
                    ({quotes.filter((q: any) => q.status === t).length})
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {search ? "No quotes match your search" : "No quotes found"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                    Type
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q: any) => (
                  <tr
                    key={q.id}
                    onClick={() => navigate(`/quotes/${q.id}`)}
                    className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {q.customerName || "No customer"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 capitalize hidden sm:table-cell">
                      {(q.propertyDetails as any)?.quoteType || "residential"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-900">
                      ${Number(q.total || 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-500 hidden md:table-cell">
                      {new Date(q.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
