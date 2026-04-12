import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Star, TrendingUp, Upload } from "lucide-react";
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
import { formatCurrency } from "../utils/currency";
import CsvImportModal from "../components/CsvImportModal";

export default function CustomersListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"recent" | "ltv">("recent");
  const [showImport, setShowImport] = useState(false);

  const { data: customers = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  const tabs = ["all", "active", "lead", "inactive"];
  const counts: Record<string, number> = {
    all: customers.length,
    active: customers.filter((c: any) => c.status === "active" || (!c.status && c.isVip)).length,
    lead: customers.filter((c: any) => c.status === "lead").length,
    inactive: customers.filter((c: any) => c.status === "inactive").length,
  };

  const totalLTV = customers.reduce((sum: number, c: any) => sum + (c.lifetimeValue || 0), 0);
  const avgLTV = customers.length > 0 ? totalLTV / customers.filter((c: any) => (c.lifetimeValue || 0) > 0).length || 0 : 0;

  const filtered = customers
    .filter((c: any) => {
      if (filter === "all") return true;
      if (filter === "active") return c.status === "active" || (!c.status && c.isVip);
      return c.status === filter;
    })
    .filter((c: any) => {
      if (!search) return true;
      const q = search.toLowerCase();
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      return (
        name.includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(q)
      );
    })
    .sort((a: any, b: any) => {
      if (sortBy === "ltv") return (b.lifetimeValue || 0) - (a.lifetimeValue || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div>
      <PageHeader
        title={t("customers.title")}
        subtitle={t("customers.totalCount", { count: customers.length })}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <Upload className="w-4 h-4" />
              {t("customers.importCsv")}
            </button>
            <Button icon={Plus} onClick={() => navigate("/customers/new")}>
              {t("customers.addCustomer")}
            </Button>
          </div>
        }
      />

      {/* LTV summary bar */}
      {customers.length > 0 && totalLTV > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 text-center shadow-sm">
            <p className="text-lg font-black text-emerald-600">{formatCurrency(totalLTV, "USD")}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{t("customers.totalRevenue")}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 text-center shadow-sm">
            <p className="text-lg font-black text-slate-900">{formatCurrency(avgLTV, "USD")}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{t("customers.avgLtv")}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 text-center shadow-sm">
            <p className="text-lg font-black text-blue-600">{customers.filter((c: any) => (c.lifetimeValue || 0) > 0).length}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{t("customers.payingClients")}</p>
          </div>
        </div>
      )}

      <Card padding={false}>
        <div className="p-4 lg:p-5 border-b border-slate-100 space-y-3">
          <Tabs tabs={tabs} active={filter} onChange={setFilter} counts={counts} />
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder={t("customers.searchPlaceholder")}
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 shrink-0">
              <button
                onClick={() => setSortBy("recent")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${sortBy === "recent" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {t("customers.sortRecent")}
              </button>
              <button
                onClick={() => setSortBy("ltv")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${sortBy === "ltv" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                <TrendingUp className="w-3 h-3" /> {t("customers.sortTopValue")}
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? t("customers.noResults") : t("customers.noCustomers")}
            description={
              search
                ? t("customers.noResultsHint")
                : t("customers.addFirst")
            }
            action={
              !search ? (
                <Button icon={Plus} onClick={() => navigate("/customers/new")}>
                  {t("customers.addCustomer")}
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
                    {t("customers.table.name")}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                    {t("customers.table.email")}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                    {t("customers.table.phone")}
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                    {t("customers.table.quotes")}
                  </th>
                  <th className="text-right px-5 lg:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t("customers.table.lifetimeValue")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => {
                  const ltv = c.lifetimeValue || 0;
                  const maxLtv = Math.max(...filtered.map((x: any) => x.lifetimeValue || 0), 1);
                  const ltvPct = (ltv / maxLtv) * 100;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/customers/${c.id}`)}
                      className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="px-5 lg:px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
                            {(c.firstName?.[0] || "").toUpperCase()}
                            {(c.lastName?.[0] || "").toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 flex items-center gap-1.5">
                              {c.firstName} {c.lastName}
                              {c.isVip ? (
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              ) : null}
                            </p>
                            <p className="text-xs text-slate-400 sm:hidden">
                              {c.email || c.phone || t("customers.table.noContact")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 hidden sm:table-cell">
                        {c.email || <span className="text-slate-300">&mdash;</span>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">
                        {c.phone || <span className="text-slate-300">&mdash;</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right hidden lg:table-cell">
                        {c.quoteCount > 0 ? (
                          <span className="text-xs font-semibold text-slate-500">{c.quoteCount}</span>
                        ) : (
                          <span className="text-slate-300 text-xs">&mdash;</span>
                        )}
                      </td>
                      <td className="px-5 lg:px-6 py-3.5 text-right">
                        {ltv > 0 ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-sm font-black text-emerald-600">
                              {formatCurrency(ltv, "USD")}
                            </span>
                            <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                                style={{ width: `${ltvPct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showImport && (
        <CsvImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
