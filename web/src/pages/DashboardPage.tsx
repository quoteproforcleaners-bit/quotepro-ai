import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import {
  PageHeader,
  Card,
  CardHeader,
  Badge,
  Button,
  StatCard,
  Alert,
  EmptyState,
} from "../components/ui";
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
  Target,
  BarChart3,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { business } = useAuth();
  const { data: quotes = [] } = useQuery<any[]>({ queryKey: ["/api/quotes"] });
  const { data: customers = [] } = useQuery<any[]>({ queryKey: ["/api/customers"] });
  const { data: jobs = [] } = useQuery<any[]>({ queryKey: ["/api/jobs"] });
  const { data: followUps = [] } = useQuery<any[]>({ queryKey: ["/api/follow-ups"] });
  const { data: stats } = useQuery<any>({ queryKey: ["/api/reports/stats"] });

  const sentQuotes = quotes.filter((q: any) => q.status === "sent");
  const viewedQuotes = quotes.filter((q: any) => q.status === "viewed");
  const acceptedQuotes = quotes.filter((q: any) => q.status === "accepted");
  const draftQuotes = quotes.filter((q: any) => q.status === "draft");

  const totalRevenue = acceptedQuotes.reduce(
    (sum: number, q: any) => sum + (Number(q.total) || 0),
    0
  );
  const activeJobs = jobs.filter(
    (j: any) => j.status === "scheduled" || j.status === "in_progress"
  );

  const needsFollowUp = quotes.filter((q: any) => {
    if (q.status !== "sent" && q.status !== "viewed") return false;
    const sentDate = new Date(q.sentAt || q.createdAt);
    const daysSince =
      (Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 2;
  });

  const atRiskAmount = needsFollowUp.reduce(
    (sum: number, q: any) => sum + (Number(q.total) || 0),
    0
  );

  const totalSentOrBeyond =
    sentQuotes.length + viewedQuotes.length + acceptedQuotes.length;
  const closeRate =
    totalSentOrBeyond > 0
      ? Math.round((acceptedQuotes.length / totalSentOrBeyond) * 100)
      : 0;

  const monthlyRevenue = acceptedQuotes
    .filter((q: any) => {
      const d = new Date(q.createdAt);
      const now = new Date();
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((s: number, q: any) => s + (Number(q.total) || 0), 0);

  const recentQuotes = [...quotes]
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 6);

  const funnelMax = Math.max(sentQuotes.length, viewedQuotes.length, acceptedQuotes.length, 1);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back${business?.companyName ? `, ${business.companyName}` : ""}`}
        actions={
          <Button icon={Plus} onClick={() => navigate("/quotes/new")}>
            New Quote
          </Button>
        }
      />

      {needsFollowUp.length > 0 ? (
        <div className="mb-6">
          <Alert
            variant="warning"
            icon={AlertTriangle}
            title={`${needsFollowUp.length} quote${needsFollowUp.length !== 1 ? "s" : ""} need follow-up`}
            description={`$${atRiskAmount.toLocaleString()} in potential revenue at risk. These quotes were sent over 2 days ago without a response.`}
            action={
              <button
                onClick={() => navigate("/follow-ups")}
                className="text-sm font-medium text-amber-800 hover:text-amber-900 inline-flex items-center gap-1"
              >
                View follow-up queue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
          />
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Quotes"
          value={quotes.length}
          icon={FileText}
          color="primary"
          subtitle={`${draftQuotes.length} draft, ${sentQuotes.length} sent`}
        />
        <StatCard
          label="Customers"
          value={customers.length}
          icon={Users}
          color="violet"
        />
        <StatCard
          label="Active Jobs"
          value={activeJobs.length}
          icon={Briefcase}
          color="amber"
          subtitle={`${jobs.length} total`}
        />
        <StatCard
          label="Revenue Won"
          icon={DollarSign}
          color="emerald"
          value={`$${totalRevenue.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader title="Sales Funnel" icon={BarChart3} />
          <div className="space-y-3">
            {[
              {
                label: "Sent",
                count: sentQuotes.length,
                icon: Send,
                color: "bg-blue-500",
                bg: "bg-blue-50",
              },
              {
                label: "Viewed",
                count: viewedQuotes.length,
                icon: Eye,
                color: "bg-violet-500",
                bg: "bg-violet-50",
              },
              {
                label: "Accepted",
                count: acceptedQuotes.length,
                icon: CheckCircle,
                color: "bg-emerald-500",
                bg: "bg-emerald-50",
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <item.icon className={`w-3.5 h-3.5 ${item.color.replace("bg-", "text-")}`} />
                    <span className="text-sm text-slate-600">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {item.count}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-500`}
                    style={{
                      width: `${Math.max(
                        (item.count / funnelMax) * 100,
                        item.count > 0 ? 8 : 0
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Close Rate" icon={Target} />
          <div className="flex items-end gap-3">
            <p className="text-4xl font-bold text-slate-900 tracking-tight">
              {closeRate}%
            </p>
            <TrendingUp
              className={`w-5 h-5 mb-1.5 ${
                closeRate >= 50 ? "text-emerald-500" : "text-slate-400"
              }`}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Based on {totalSentOrBeyond} quotes sent
          </p>
          <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                closeRate >= 60
                  ? "bg-emerald-500"
                  : closeRate >= 40
                  ? "bg-amber-500"
                  : "bg-red-400"
              }`}
              style={{ width: `${closeRate}%` }}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Today at a Glance" icon={Sparkles} />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Needs Follow-up</span>
              <span
                className={`text-sm font-semibold ${
                  needsFollowUp.length > 0 ? "text-amber-600" : "text-slate-900"
                }`}
              >
                {needsFollowUp.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Quotes Out</span>
              <span className="text-sm font-semibold text-slate-900">
                {sentQuotes.length + viewedQuotes.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">This Month</span>
              <span className="text-sm font-semibold text-emerald-600">
                ${monthlyRevenue.toLocaleString()}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => navigate("/follow-ups")}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                View follow-ups <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </Card>
      </div>

      <Card padding={false}>
        <div className="flex items-center justify-between px-5 lg:px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Recent Quotes</h2>
          <button
            onClick={() => navigate("/quotes")}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentQuotes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No quotes yet"
            description="Create your first quote to get started"
            action={
              <Button icon={Plus} onClick={() => navigate("/quotes/new")}>
                Create Quote
              </Button>
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
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-5 lg:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentQuotes.map((q: any) => (
                  <tr
                    key={q.id}
                    onClick={() => navigate(`/quotes/${q.id}`)}
                    className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-5 lg:px-6 py-3.5 font-medium text-slate-900">
                      {q.customerName || "No customer"}
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
