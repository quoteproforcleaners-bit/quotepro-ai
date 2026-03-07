import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import {
  FileText,
  Users,
  Briefcase,
  DollarSign,
  Plus,
  ArrowRight,
} from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-4.5 h-4.5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

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

export default function DashboardPage() {
  const navigate = useNavigate();
  const { business } = useAuth();
  const { data: quotes = [] } = useQuery<any[]>({ queryKey: ["/api/quotes"] });
  const { data: customers = [] } = useQuery<any[]>({ queryKey: ["/api/customers"] });
  const { data: jobs = [] } = useQuery<any[]>({ queryKey: ["/api/jobs"] });

  const acceptedQuotes = quotes.filter((q: any) => q.status === "accepted");
  const totalRevenue = acceptedQuotes.reduce(
    (sum: number, q: any) => sum + (Number(q.total) || 0),
    0
  );
  const activeJobs = jobs.filter(
    (j: any) => j.status === "scheduled" || j.status === "in_progress"
  );

  const recentQuotes = [...quotes]
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {business?.companyName || "Your business"} overview
          </p>
        </div>
        <button
          onClick={() => navigate("/quotes/new")}
          className="hidden sm:flex items-center gap-2 h-10 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Quote
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Quotes"
          value={quotes.length}
          icon={FileText}
          color="bg-primary-600"
        />
        <StatCard
          label="Customers"
          value={customers.length}
          icon={Users}
          color="bg-violet-600"
        />
        <StatCard
          label="Active Jobs"
          value={activeJobs.length}
          icon={Briefcase}
          color="bg-amber-500"
        />
        <StatCard
          label="Revenue"
          value={`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          color="bg-green-600"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Recent Quotes</h2>
          <button
            onClick={() => navigate("/quotes")}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentQuotes.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No quotes yet</p>
            <button
              onClick={() => navigate("/quotes/new")}
              className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Create your first quote
            </button>
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
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentQuotes.map((q: any) => (
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
