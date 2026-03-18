import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useSubscription } from "../lib/subscription";
import {
  PageHeader,
  Card,
  CardHeader,
  HeroCard,
  Badge,
  Button,
  StatCard,
  ProgressBar,
  MetricRing,
  EmptyState,
  FunnelBar,
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
  Shield,
  Zap,
  PhoneMissed,
  Calendar,
  Star,
  ChevronRight,
  Flame,
  Award,
} from "lucide-react";

function getRiskState(oldestDays: number) {
  if (oldestDays >= 5)
    return { label: "Critical", class: "risk-critical", badge: "critical" as const, color: "text-red-600", bg: "bg-red-50" };
  if (oldestDays >= 3)
    return { label: "Cold", class: "risk-cold", badge: "cold" as const, color: "text-orange-600", bg: "bg-orange-50" };
  return { label: "Cooling", class: "risk-cooling", badge: "cooling" as const, color: "text-amber-600", bg: "bg-amber-50" };
}

function getProtectionScore(healthPercent: number, followUpCount: number, closeRate: number) {
  if (followUpCount === 0) return { score: 100, grade: "A+" };
  const healthWeight = healthPercent * 0.5;
  const closeWeight = Math.min(closeRate, 100) * 0.3;
  const responsiveness = followUpCount <= 2 ? 20 : followUpCount <= 5 ? 10 : 0;
  const score = Math.round(healthWeight + closeWeight + responsiveness);
  let grade = "F";
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B+";
  else if (score >= 70) grade = "B";
  else if (score >= 60) grade = "C";
  else if (score >= 50) grade = "D";
  return { score, grade };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { business } = useAuth();
  const { isInFreeTrial, freeTrialDaysLeft } = useSubscription();
  const { data: quotes = [] } = useQuery<any[]>({ queryKey: ["/api/quotes"] });
  const { data: customers = [] } = useQuery<any[]>({ queryKey: ["/api/customers"] });
  const { data: jobs = [] } = useQuery<any[]>({ queryKey: ["/api/jobs"] });
  const { data: followUpQueue = [] } = useQuery<any[]>({ queryKey: ["/api/followup-queue"] });
  const { data: stats } = useQuery<any>({ queryKey: ["/api/reports/stats"] });
  const { data: streakData } = useQuery<{
    currentStreak: number;
    longestStreak: number;
    lastActionDate: string | null;
  }>({ queryKey: ["/api/streaks"] });
  const { data: ratingSummary } = useQuery<{
    average: number;
    total: number;
    distribution: Record<number, number>;
  }>({ queryKey: ["/api/ratings/summary"] });

  const sentQuotes = quotes.filter((q: any) => q.status === "sent");
  const viewedQuotes = quotes.filter((q: any) => q.status === "viewed" || q.viewedAt);
  const acceptedQuotes = quotes.filter((q: any) => q.status === "accepted");
  const draftQuotes = quotes.filter((q: any) => q.status === "draft");

  const totalRevenue = acceptedQuotes.reduce(
    (sum: number, q: any) => sum + (Number(q.total) || 0),
    0
  );
  const activeJobs = jobs.filter(
    (j: any) => j.status === "scheduled" || j.status === "in_progress"
  );

  const followUpQueueCount = followUpQueue.length;
  const amountAtRisk = useMemo(() => {
    return followUpQueue.reduce((sum: number, q: any) => sum + (Number(q.total) || 0), 0);
  }, [followUpQueue]);

  const oldestQuoteDays = useMemo(() => {
    if (followUpQueue.length === 0) return 0;
    const now = Date.now();
    let oldest = 0;
    followUpQueue.forEach((q: any) => {
      const sent = q.sentAt ? new Date(q.sentAt).getTime() : new Date(q.createdAt).getTime();
      const days = Math.floor((now - sent) / (1000 * 60 * 60 * 24));
      if (days > oldest) oldest = days;
    });
    return oldest;
  }, [followUpQueue]);

  const closeRate = stats?.closeRate || 0;
  const monthRevenue = stats?.totalRevenue || 0;
  const currentStreak = streakData?.currentStreak || 0;
  const longestStreak = streakData?.longestStreak || 0;

  const followUpHealthPercent = useMemo(() => {
    if (followUpQueueCount === 0) return 100;
    const recentlyFollowedUp = followUpQueue.filter((q: any) => {
      if (!q.lastFollowUpAt) return false;
      const daysSince = (Date.now() - new Date(q.lastFollowUpAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 2;
    }).length;
    return Math.round((recentlyFollowedUp / followUpQueueCount) * 100);
  }, [followUpQueue, followUpQueueCount]);

  const protectionScore = useMemo(() => {
    return getProtectionScore(followUpHealthPercent, followUpQueueCount, closeRate);
  }, [followUpHealthPercent, followUpQueueCount, closeRate]);

  const estimatedLoss = useMemo(() => {
    if (followUpQueueCount === 0) return 0;
    const rate = closeRate > 0 ? closeRate / 100 : 0.45;
    return Math.round(amountAtRisk * (1 - rate));
  }, [amountAtRisk, closeRate, followUpQueueCount]);

  const riskState = useMemo(() => getRiskState(oldestQuoteDays), [oldestQuoteDays]);

  const funnelMax = Math.max(
    stats?.sentQuotes || sentQuotes.length,
    viewedQuotes.length,
    stats?.acceptedQuotes || acceptedQuotes.length,
    1
  );

  const monthlyRevenue = acceptedQuotes
    .filter((q: any) => {
      const d = new Date(q.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s: number, q: any) => s + (Number(q.total) || 0), 0);

  const recentQuotes = [...quotes]
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 6);

  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const streakDaysToShow = Math.min(currentStreak, 7);

  const scoreColor = protectionScore.score >= 90 ? "emerald" : protectionScore.score >= 70 ? "amber" : "red";

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

      {isInFreeTrial ? (
        <button
          onClick={() => navigate("/pricing")}
          className="w-full text-left rounded-2xl p-4 mb-6 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-900">
              Free Trial — {freeTrialDaysLeft} day{freeTrialDaysLeft !== 1 ? "s" : ""} remaining
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              Upgrade now to keep unlimited quoting, AI tools, and automated follow-ups.
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-blue-400 shrink-0" />
        </button>
      ) : null}

      {followUpQueueCount > 0 ? (
        <div className={`rounded-2xl p-5 lg:p-6 mb-6 ${riskState.class}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Revenue Leak Detector
              </span>
            </div>
            <Badge status={riskState.badge} label={riskState.label} />
          </div>

          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-3xl font-extrabold tracking-tight ${riskState.color}`}>
              ${amountAtRisk.toLocaleString()}
            </span>
            <span className="text-sm text-slate-500">at risk</span>
          </div>

          <p className="text-sm text-slate-600 mt-2">
            {followUpQueueCount} {followUpQueueCount === 1 ? "quote" : "quotes"} slipping &middot; Oldest: {oldestQuoteDays} {oldestQuoteDays === 1 ? "day" : "days"}
          </p>

          <p className="text-xs text-slate-500 mt-1 italic">
            If your close rate stays at {Math.round(closeRate || 45)}%, you're likely losing ~${estimatedLoss.toLocaleString()}.
          </p>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-500">Revenue Protection Score</span>
              <span className={`text-xs font-bold ${scoreColor === "emerald" ? "text-emerald-600" : scoreColor === "amber" ? "text-amber-600" : "text-red-600"}`}>
                {protectionScore.score}/100 ({protectionScore.grade})
              </span>
            </div>
            <ProgressBar value={protectionScore.score} color={scoreColor} size="sm" />
          </div>

          <div className="flex gap-3 mt-5">
            <Button
              icon={Shield}
              variant="warning"
              onClick={() => navigate("/follow-ups")}
              className="flex-1 animate-pulse-glow"
            >
              Stop the Leak
            </Button>
          </div>
          <button
            onClick={() => navigate("/quotes")}
            className="text-sm text-primary-600 hover:text-primary-700 font-semibold mt-3 flex items-center gap-1 mx-auto"
          >
            See what's leaking <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="rounded-2xl p-5 lg:p-6 mb-6 bg-emerald-50/50 border border-emerald-200/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-slate-900">All Caught Up</p>
              <p className="text-sm text-slate-500">No revenue at risk. Keep the momentum going.</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-500">Revenue Protection Score</span>
              <span className="text-xs font-bold text-emerald-600">100/100 (A+)</span>
            </div>
            <ProgressBar value={100} color="emerald" size="sm" />
          </div>
        </div>
      )}

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
          <CardHeader title="Sales Momentum" icon={TrendingUp} />
          <div className="space-y-3">
            <FunnelBar label="Sent" count={stats?.sentQuotes || sentQuotes.length} total={funnelMax} color="bg-blue-500" icon={Send} />
            <FunnelBar label="Viewed" count={viewedQuotes.length} total={funnelMax} color="bg-violet-500" icon={Eye} />
            <FunnelBar label="Accepted" count={stats?.acceptedQuotes || acceptedQuotes.length} total={funnelMax} color="bg-emerald-500" icon={CheckCircle} />
            <FunnelBar label="Won" count={stats?.acceptedQuotes || acceptedQuotes.length} total={funnelMax} color="bg-green-600" icon={Award} />
          </div>
          <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400">Close rate</span>
            <span className="text-sm font-bold text-slate-900">{Math.round(closeRate)}%</span>
          </div>
        </Card>

        <Card>
          <CardHeader title="Close Rate" icon={Target} />
          <div className="flex items-center gap-4">
            <MetricRing
              value={closeRate}
              max={100}
              size={90}
              strokeWidth={7}
              color={closeRate >= 60 ? "emerald" : closeRate >= 40 ? "amber" : "red"}
            >
              <span className="text-xl font-extrabold text-slate-900">{Math.round(closeRate)}%</span>
            </MetricRing>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp
                  className={`w-4 h-4 ${closeRate >= 50 ? "text-emerald-500" : "text-slate-400"}`}
                />
                <span className="text-sm font-medium text-slate-700">
                  {closeRate >= 60 ? "Great" : closeRate >= 40 ? "Average" : "Needs work"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Based on {(stats?.sentQuotes || sentQuotes.length) + viewedQuotes.length + (stats?.acceptedQuotes || acceptedQuotes.length)} quotes sent
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Avg value: ${(stats?.avgQuoteValue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Today at a Glance" icon={Sparkles} />
          <div className="space-y-3">
            <div
              className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => navigate("/follow-ups")}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <PhoneMissed className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-sm text-slate-600">Need follow-up</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-bold ${followUpQueueCount > 0 ? "text-amber-600" : "text-slate-900"}`}>
                  {followUpQueueCount}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              </div>
            </div>
            <div
              className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => navigate("/quotes")}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Send className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm text-slate-600">Quotes out</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900">
                  {sentQuotes.length + viewedQuotes.length}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              </div>
            </div>
            <div
              className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => navigate("/opportunities")}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-sm text-slate-600">Won this month</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-emerald-600">
                  ${monthlyRevenue.toLocaleString()}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader title="Follow-Up Streak" icon={Flame} />
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${currentStreak > 0 ? "bg-emerald-100" : "bg-slate-100"}`}>
              <Target className={`w-6 h-6 ${currentStreak > 0 ? "text-emerald-600" : "text-slate-400"}`} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {currentStreak} {currentStreak === 1 ? "day" : "days"}
              </p>
              <p className="text-xs text-slate-500">
                {currentStreak > 0 ? "Top closers follow up daily." : "Start your streak today!"}
              </p>
            </div>
          </div>

          <div className="flex gap-1.5 mt-3">
            {weekDays.map((day, i) => {
              const active = i < streakDaysToShow;
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      active
                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                  >
                    {active ? <CheckCircle className="w-3.5 h-3.5" /> : null}
                  </div>
                  <span className={`text-[10px] font-semibold ${active ? "text-emerald-600" : "text-slate-400"}`}>
                    {day}
                  </span>
                </div>
              );
            })}
          </div>

          {longestStreak > 0 ? (
            <p className="text-xs text-slate-400 mt-3">
              Best streak: {longestStreak} {longestStreak === 1 ? "day" : "days"}
            </p>
          ) : null}

          <Button
            icon={Zap}
            variant={currentStreak > 0 ? "success" : "primary"}
            onClick={() => navigate("/follow-ups")}
            className="w-full mt-4"
          >
            {currentStreak > 0 ? "Keep streak alive" : "Start your streak"}
          </Button>
        </Card>

        <Card>
          <CardHeader title="Weekly Recap" icon={Calendar} />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Quotes created</span>
              <span className="text-sm font-bold text-slate-900">
                {quotes.filter((q: any) => {
                  const d = new Date(q.createdAt);
                  const now = new Date();
                  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                  return d >= weekAgo;
                }).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Quotes accepted</span>
              <span className="text-sm font-bold text-emerald-600">
                {acceptedQuotes.filter((q: any) => {
                  const d = new Date(q.createdAt);
                  const now = new Date();
                  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                  return d >= weekAgo;
                }).length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Revenue this month</span>
              <span className="text-sm font-bold text-emerald-600">
                ${monthlyRevenue.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Close rate</span>
              <span className={`text-sm font-bold ${closeRate >= 50 ? "text-emerald-600" : closeRate >= 30 ? "text-amber-600" : "text-red-500"}`}>
                {Math.round(closeRate)}%
              </span>
            </div>
            {ratingSummary ? (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-sm text-slate-600">Avg rating</span>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-bold text-slate-900">
                    {(ratingSummary.average || 0).toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400">({ratingSummary.total || 0})</span>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Revenue Chart"
          icon={BarChart3}
          actions={
            <span className="text-xs text-slate-400">Monthly</span>
          }
        />
        <RevenueChart quotes={quotes} />
      </Card>

      <div className="mt-6">
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
    </div>
  );
}

function RevenueChart({ quotes }: { quotes: any[] }) {
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { label: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-US", { month: "short" });
      const revenue = quotes
        .filter((q: any) => {
          if (q.status !== "accepted") return false;
          const qd = new Date(q.createdAt);
          return qd.getMonth() === d.getMonth() && qd.getFullYear() === d.getFullYear();
        })
        .reduce((s: number, q: any) => s + (Number(q.total) || 0), 0);
      months.push({ label, revenue });
    }
    return months;
  }, [quotes]);

  const maxRevenue = Math.max(...monthlyData.map((m) => m.revenue), 1);

  return (
    <div>
      <div className="flex items-end gap-2 h-40">
        {monthlyData.map((m, i) => {
          const height = Math.max((m.revenue / maxRevenue) * 100, m.revenue > 0 ? 4 : 0);
          const isCurrentMonth = i === monthlyData.length - 1;
          return (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5 group relative">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap pointer-events-none">
                ${m.revenue.toLocaleString()}
              </div>
              <div className="w-full flex items-end justify-center" style={{ height: "100%" }}>
                <div
                  className={`w-full max-w-[40px] rounded-t-md transition-all duration-700 ease-out ${
                    isCurrentMonth
                      ? "bg-gradient-to-t from-primary-600 to-primary-400"
                      : "bg-gradient-to-t from-slate-200 to-slate-100 group-hover:from-primary-200 group-hover:to-primary-100"
                  }`}
                  style={{ height: `${height}%`, minHeight: m.revenue > 0 ? "4px" : "0px" }}
                />
              </div>
              <span className={`text-[10px] font-medium ${isCurrentMonth ? "text-primary-600 font-bold" : "text-slate-400"}`}>
                {m.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
