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
  TrendingUp,
  AlertTriangle,
  Eye,
  Send,
  CheckCircle,
  Clock,
} from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
  subtitle?: string;
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
      {subtitle ? <p className="text-xs text-slate-400 mt-1">{subtitle}</p> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    sent: "bg-blue-50 text-blue-700",
    viewed: "bg-purple-50 text-purple-700",
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

  const sentQuotes = quotes.filter((q: any) => q.status === "sent");
  const viewedQuotes = quotes.filter((q: any) => q.status === "viewed");
  const acceptedQuotes = quotes.filter((q: any) => q.status === "accepted");
  const draftQuotes = quotes.filter((q: any) => q.status === "draft");

  const totalRevenue = acceptedQuotes.reduce(
    (sum: number, q: any) => sum + (Number(q.total) || 0), 0
  );
  const activeJobs = jobs.filter(
    (j: any) => j.status === "scheduled" || j.status === "in_progress"
  );

  const needsFollowUp = quotes.filter((q: any) => {
    if (q.status !== "sent" && q.status !== "viewed") return false;
    const sentDate = new Date(q.sentAt || q.createdAt);
    const daysSince = (Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 2;
  });

  const atRiskAmount = needsFollowUp.reduce(
    (sum: number, q: any) => sum + (Number(q.total) || 0), 0
  );

  const closeRate = quotes.length > 0
    ? Math.round((acceptedQuotes.length / Math.max(1, sentQuotes.length + viewedQuotes.length + acceptedQuotes.length)) * 100)
    : 0;

  const recentQuotes = [...quotes]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
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
          className="flex items-center gap-2 h-10 px-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Quote
        </button>
      </div>

      {needsFollowUp.length > 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">
                {needsFollowUp.length} quote{needsFollowUp.length !== 1 ? "s" : ""} need follow-up
              </h3>
              <p className="text-sm text-amber-700 mt-0.5">
                ${atRiskAmount.toLocaleString()} in potential revenue at risk. These quotes were sent over 2 days ago without a response.
              </p>
              <button
                onClick={() => navigate("/quotes?status=sent")}
                className="text-sm font-medium text-amber-800 hover:text-amber-900 mt-2 inline-flex items-center gap-1"
              >
                View quotes <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Quotes" value={quotes.length} icon={FileText} color="bg-primary-600"
          subtitle={`${draftQuotes.length} draft, ${sentQuotes.length} sent`} />
        <StatCard label="Customers" value={customers.length} icon={Users} color="bg-violet-600" />
        <StatCard label="Active Jobs" value={activeJobs.length} icon={Briefcase} color="bg-amber-500"
          subtitle={`${jobs.length} total`} />
        <StatCard label="Revenue Won" icon={DollarSign} color="bg-green-600"
          value={`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-medium text-slate-500 mb-4">Sales Funnel</h3>
          <div className="space-y-3">
            {[
              { label: "Sent", count: sentQuotes.length, icon: Send, color: "bg-blue-100 text-blue-600" },
              { label: "Viewed", count: viewedQuotes.length, icon: Eye, color: "bg-purple-100 text-purple-600" },
              { label: "Accepted", count: acceptedQuotes.length, icon: CheckCircle, color: "bg-green-100 text-green-600" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center ${item.color}`}>
                    <item.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm text-slate-700">{item.label}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-medium text-slate-500 mb-4">Close Rate</h3>
          <div className="flex items-end gap-3">
            <p className="text-4xl font-bold text-slate-900">{closeRate}%</p>
            <TrendingUp className={`w-5 h-5 mb-1.5 ${closeRate >= 50 ? "text-green-500" : "text-slate-400"}`} />
          </div>
          <p className="text-xs text-slate-400 mt-2">Based on sent, viewed, and accepted quotes</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-medium text-slate-500 mb-4">Today at a Glance</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Needs Follow-up</span>
              <span className={`text-sm font-semibold ${needsFollowUp.length > 0 ? "text-amber-600" : "text-slate-900"}`}>
                {needsFollowUp.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Quotes Out</span>
              <span className="text-sm font-semibold text-slate-900">{sentQuotes.length + viewedQuotes.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Revenue This Month</span>
              <span className="text-sm font-semibold text-green-600">
                ${acceptedQuotes
                  .filter((q: any) => {
                    const d = new Date(q.createdAt);
                    const now = new Date();
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  })
                  .reduce((s: number, q: any) => s + (Number(q.total) || 0), 0)
                  .toLocaleString()}
              </span>
            </div>
          </div>
        </div>
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
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Type</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Date</th>
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
                      ${Number(q.total || 0).toFixed(0)}
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
