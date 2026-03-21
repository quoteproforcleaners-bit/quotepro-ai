import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useSubscription } from "../lib/subscription";
import {
  PageHeader,
  Card,
  CardHeader,
  Badge,
  Button,
  StatCard,
  ProgressBar,
  MetricRing,
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
  Bot,
  MessageSquare,
  FileEdit,
  Repeat,
  RefreshCw,
  LayoutDashboard,
  TrendingDown,
} from "lucide-react";

// ─── Revenue Protection Score ────────────────────────────────────────────────

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

// ─── Dynamic Hero ─────────────────────────────────────────────────────────────

interface HeroProps {
  isNewUser: boolean;
  followUpQueueCount: number;
  amountAtRisk: number;
  oldestQuoteDays: number;
  estimatedLoss: number;
  closeRate: number;
  protectionScore: { score: number; grade: string };
  followUpHealthPercent: number;
  quotes: any[];
  totalRevenue: number;
  navigate: (path: string) => void;
}

function DynamicHero(p: HeroProps) {
  const { isNewUser, followUpQueueCount, amountAtRisk, oldestQuoteDays, estimatedLoss, closeRate, protectionScore, quotes, navigate } = p;
  const riskState = useMemo(() => getRiskState(oldestQuoteDays), [oldestQuoteDays]);
  const scoreColor = protectionScore.score >= 90 ? "emerald" : protectionScore.score >= 70 ? "amber" : "red";

  // State A — new user, zero quotes
  if (isNewUser) {
    return (
      <div className="rounded-2xl p-6 mb-6 bg-gradient-to-br from-primary-600 to-primary-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)" }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <LayoutDashboard className="w-4 h-4 text-primary-200" />
            <span className="text-xs font-bold uppercase tracking-wider text-primary-200">Get Started</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight leading-tight mb-1">
            Your first $1,000 starts with one quote.
          </h2>
          <p className="text-sm text-primary-100 mb-5 max-w-md">
            QuotePro turns your cleaning rates into professional cleaning quotes in under 2 minutes. Create your first one and start building a real pipeline.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/quotes/new")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-primary-700 font-bold text-sm shadow-lg hover:bg-primary-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Your First Cleaning Quote
            </button>
            <button
              onClick={() => navigate("/settings?tab=pricing")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-700/60 text-white font-semibold text-sm border border-primary-500 hover:bg-primary-700 transition-colors"
            >
              Set Your Cleaning Rates
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State B — has follow-ups needed (revenue at risk)
  if (followUpQueueCount > 0) {
    return (
      <div className={`rounded-2xl p-5 lg:p-6 mb-6 ${riskState.class}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Revenue Leak Detector</span>
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
          {followUpQueueCount} sent {followUpQueueCount === 1 ? "quote" : "quotes"} awaiting a response &middot; Oldest: {oldestQuoteDays} {oldestQuoteDays === 1 ? "day" : "days"} out
        </p>
        <p className="text-xs text-slate-500 mt-1 italic">
          Cleaning quotes older than 3 days close 40% less often. At your current close rate of {Math.round(closeRate || 45)}%, you're likely losing ~${estimatedLoss.toLocaleString()}.
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
        <div className="flex flex-wrap gap-3 mt-5">
          <Button icon={Shield} variant="warning" onClick={() => navigate("/follow-ups")} className="flex-1 animate-pulse-glow">
            Stop the Leak
          </Button>
          <Button icon={Bot} variant="ghost" onClick={() => navigate("/ai-assistant")} className="shrink-0">
            Draft Follow-Up with AI
          </Button>
        </div>
        <button
          onClick={() => navigate("/quotes")}
          className="text-sm text-primary-600 hover:text-primary-700 font-semibold mt-3 flex items-center gap-1 mx-auto"
        >
          See what's leaking <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // State C — active user, all caught up
  const hasActivity = quotes.length > 0;
  const nextAction = closeRate < 40
    ? { label: "Low close rate", tip: "Follow up faster to close more. Most cleaning businesses win 40–60% of sent quotes.", cta: "Review Quotes", path: "/quotes" }
    : quotes.filter((q: any) => q.status === "draft").length > 0
    ? { label: "Drafts waiting", tip: `You have ${quotes.filter((q: any) => q.status === "draft").length} draft cleaning quote${quotes.filter((q: any) => q.status === "draft").length > 1 ? "s" : ""} ready to send. Unsent quotes don't close.`, cta: "Send Drafts", path: "/quotes" }
    : { label: "Keep it going", tip: "Recurring clients drive predictable revenue. Use AI to pitch a recurring cleaning plan on your next job.", cta: "New Cleaning Quote", path: "/quotes/new" };

  return (
    <div className="rounded-2xl p-5 lg:p-6 mb-6 bg-emerald-50/60 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-700/50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">{hasActivity ? "Quote pipeline is clean — no revenue at risk." : "All caught up."}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{nextAction.tip}</p>
          </div>
        </div>
        <Button size="sm" onClick={() => navigate(nextAction.path)} className="shrink-0 hidden sm:flex">
          {nextAction.cta}
        </Button>
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Revenue Protection Score</span>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">100/100 (A+)</span>
        </div>
        <ProgressBar value={100} color="emerald" size="sm" />
      </div>
      <Button size="sm" onClick={() => navigate(nextAction.path)} className="mt-4 w-full sm:hidden">
        {nextAction.cta}
      </Button>
    </div>
  );
}

// ─── Start Here Checklist ────────────────────────────────────────────────────

interface ChecklistProps {
  hasPricing: boolean;
  hasQuotes: boolean;
  hasCustomers: boolean;
  hasFollowUpActivity: boolean;
  navigate: (path: string) => void;
}

function StartHereChecklist({ hasPricing, hasQuotes, hasCustomers, hasFollowUpActivity, navigate }: ChecklistProps) {
  const steps = [
    {
      id: "pricing",
      done: hasPricing,
      label: "Set your cleaning rates",
      description: "Your rates drive every quote. Set them once and QuotePro handles the math.",
      cta: "Set Up Pricing",
      path: "/settings?tab=pricing",
      icon: DollarSign,
    },
    {
      id: "quote",
      done: hasQuotes,
      label: "Create your first cleaning quote",
      description: "Send a professional cleaning quote in under 2 minutes and start building your pipeline.",
      cta: "Create Quote",
      path: "/quotes/new",
      icon: FileText,
    },
    {
      id: "customer",
      done: hasCustomers,
      label: "Add your first cleaning client",
      description: "Build your client list to track cleans, quotes, and reviews in one place.",
      cta: "Add Client",
      path: "/customers/new",
      icon: Users,
    },
    {
      id: "followup",
      done: hasFollowUpActivity,
      label: "Activate follow-up automation",
      description: "Most cleaning jobs close faster when followed up within 48 hours. Turn it on now.",
      cta: "Review Follow-Ups",
      path: "/follow-ups",
      icon: Zap,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  if (allDone) return null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 mb-6 overflow-hidden">
      <div className="px-5 lg:px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
            <Target className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Set Up Your Cleaning Business</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{completedCount} of {steps.length} steps complete</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{Math.round((completedCount / steps.length) * 100)}%</span>
        </div>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {steps.filter((s) => !s.done).slice(0, 3).map((step) => (
          <div key={step.id} className="flex items-center gap-4 px-5 lg:px-6 py-4">
            <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0">
              <step.icon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{step.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">{step.description}</p>
            </div>
            <button
              onClick={() => navigate(step.path)}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 whitespace-nowrap flex items-center gap-1 shrink-0"
            >
              {step.cta} <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        ))}
        {steps.filter((s) => s.done).length > 0 ? (
          <div className="px-5 lg:px-6 py-3 bg-slate-50 dark:bg-slate-800/80 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs text-slate-600 dark:text-slate-300">{steps.filter((s) => s.done).map((s) => s.label).join(", ")} — done</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Today's Revenue Moves ────────────────────────────────────────────────────

interface RevenueAction {
  icon: React.ComponentType<any>;
  iconBg: string;
  iconColor: string;
  tag: string;
  tagColor: string;
  title: string;
  description: string;
  cta: string;
  path: string;
}

interface RevenueMovesProps {
  actions: RevenueAction[];
  navigate: (path: string) => void;
}

function TodaysRevenueMoves({ actions, navigate }: RevenueMovesProps) {
  if (actions.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Today's Revenue Moves</h2>
        <span className="text-xs text-slate-400 dark:text-slate-500">— your highest-impact actions right now</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => navigate(action.path)}
            className="text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg ${action.iconBg} flex items-center justify-center shrink-0`}>
                <action.icon className={`w-4.5 h-4.5 ${action.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${action.tagColor}`}>{action.tag}</div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">{action.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{action.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs font-semibold text-primary-600 dark:text-primary-400 group-hover:text-primary-700 dark:group-hover:text-primary-300">
              {action.cta} <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── AI Growth Tools ──────────────────────────────────────────────────────────

function AIGrowthTools({ navigate }: { navigate: (path: string) => void }) {
  const tools = [
    { icon: MessageSquare, label: "Handle objections", description: "Turn pricing pushback into closed cleaning jobs.", prompt: "help me handle objections" },
    { icon: Send, label: "Draft follow-up", description: "Write a sharp follow-up message in seconds.", prompt: "draft a follow-up message" },
    { icon: FileEdit, label: "Walk-through to quote", description: "Paste your site-visit notes, get a cleaning quote.", prompt: "turn my notes into a quote" },
    { icon: Repeat, label: "Pitch a recurring plan", description: "Generate a script to upsell recurring cleans.", prompt: "recurring upsell script" },
    { icon: RefreshCw, label: "Re-engage a lost client", description: "Bring back a prospect that went quiet.", prompt: "re-engage lost lead" },
  ];

  return (
    <Card className="mb-6">
      <CardHeader
        title="AI Revenue Assist"
        icon={Bot}
        actions={
          <button
            onClick={() => navigate("/ai-assistant")}
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            Open AI <ArrowRight className="w-3 h-3" />
          </button>
        }
      />
      <p className="text-xs text-slate-500 mb-4 -mt-1">AI-powered actions that directly drive revenue for your cleaning business.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {tools.map((tool) => (
          <button
            key={tool.label}
            onClick={() => navigate(`/ai-assistant?prompt=${encodeURIComponent(tool.prompt)}`)}
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-200 dark:hover:border-primary-700 border border-transparent dark:border-slate-700/50 transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0 group-hover:border-primary-300 dark:group-hover:border-primary-600 transition-colors">
              <tool.icon className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">{tool.label}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{tool.description}</p>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}

// ─── Revenue Chart ────────────────────────────────────────────────────────────

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
  const hasAnyRevenue = monthlyData.some((m) => m.revenue > 0);

  return (
    <div>
      {!hasAnyRevenue ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <TrendingUp className="w-8 h-8 text-slate-200 mb-2" />
          <p className="text-sm font-semibold text-slate-500">No accepted quotes yet</p>
          <p className="text-xs text-slate-400 mt-1">Send quotes, follow up, and your accepted revenue builds here.</p>
        </div>
      ) : (
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
      )}
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

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
  const { data: pricing } = useQuery<any>({ queryKey: ["/api/pricing"] });

  // ── Derived state ──────────────────────────────────────────────────────────
  const sentQuotes = quotes.filter((q: any) => q.status === "sent");
  const viewedQuotes = quotes.filter((q: any) => q.status === "viewed" || q.viewedAt);
  const acceptedQuotes = quotes.filter((q: any) => q.status === "accepted");
  const draftQuotes = quotes.filter((q: any) => q.status === "draft");

  const totalRevenue = acceptedQuotes.reduce((sum: number, q: any) => sum + (Number(q.total) || 0), 0);
  const activeJobs = jobs.filter((j: any) => j.status === "scheduled" || j.status === "in_progress");

  const followUpQueueCount = followUpQueue.length;
  const amountAtRisk = useMemo(() => followUpQueue.reduce((sum: number, q: any) => sum + (Number(q.total) || 0), 0), [followUpQueue]);

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

  const protectionScore = useMemo(() => getProtectionScore(followUpHealthPercent, followUpQueueCount, closeRate), [followUpHealthPercent, followUpQueueCount, closeRate]);

  const estimatedLoss = useMemo(() => {
    if (followUpQueueCount === 0) return 0;
    const rate = closeRate > 0 ? closeRate / 100 : 0.45;
    return Math.round(amountAtRisk * (1 - rate));
  }, [amountAtRisk, closeRate, followUpQueueCount]);

  const funnelMax = Math.max(stats?.sentQuotes || sentQuotes.length, viewedQuotes.length, stats?.acceptedQuotes || acceptedQuotes.length, 1);

  const monthlyRevenue = acceptedQuotes
    .filter((q: any) => {
      const d = new Date(q.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s: number, q: any) => s + (Number(q.total) || 0), 0);

  const recentQuotes = [...quotes]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const streakDaysToShow = Math.min(currentStreak, 7);
  const scoreColor = protectionScore.score >= 90 ? "emerald" : protectionScore.score >= 70 ? "amber" : "red";

  // ── User maturity flags ────────────────────────────────────────────────────
  const isNewUser = quotes.length === 0;
  const hasPricing = !!(pricing && (pricing.laborRate > 0 || pricing.baseRate > 0 || pricing.targetMarginPct > 0));
  const hasQuotes = quotes.length > 0;
  const hasCustomers = customers.length > 0;
  const hasFollowUpActivity = currentStreak > 0 || followUpQueueCount > 0;
  const showChecklist = !hasQuotes || !hasCustomers || !hasFollowUpActivity;

  // ── Today's Revenue Moves ──────────────────────────────────────────────────
  const revenueActions = useMemo<RevenueAction[]>(() => {
    const actions: RevenueAction[] = [];

    if (!hasQuotes) {
      actions.push({
        icon: Plus,
        iconBg: "bg-primary-50",
        iconColor: "text-primary-600",
        tag: "High Impact",
        tagColor: "text-primary-600",
        title: "Create your first cleaning quote",
        description: "One quote sets everything in motion. It takes under 2 minutes.",
        cta: "Create Quote",
        path: "/quotes/new",
      });
    }

    if (followUpQueueCount > 0) {
      actions.push({
        icon: PhoneMissed,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
        tag: "Revenue Risk",
        tagColor: "text-amber-600",
        title: `Follow up with ${followUpQueueCount} lead${followUpQueueCount > 1 ? "s" : ""}`,
        description: `$${amountAtRisk.toLocaleString()} is waiting for a response. Most deals close within 48 hours of follow-up.`,
        cta: "Review Follow-Ups",
        path: "/follow-ups",
      });
    }

    if (draftQuotes.length > 0) {
      actions.push({
        icon: Send,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
        tag: "Ready to Send",
        tagColor: "text-blue-600",
        title: `Send ${draftQuotes.length} draft quote${draftQuotes.length > 1 ? "s" : ""}`,
        description: "Drafts sitting unsent earn nothing. Send them and start the clock on closing.",
        cta: "View Drafts",
        path: "/quotes",
      });
    }

    if (closeRate > 0 && closeRate < 35) {
      actions.push({
        icon: TrendingDown,
        iconBg: "bg-red-50",
        iconColor: "text-red-500",
        tag: "Coaching Tip",
        tagColor: "text-red-500",
        title: "Quote close rate needs attention",
        description: `At ${Math.round(closeRate)}%, you're leaving cleans on the table. Use AI to handle pricing objections and write sharper follow-ups.`,
        cta: "Use AI Assist",
        path: "/ai-assistant",
      });
    }

    if (hasQuotes && !hasFollowUpActivity) {
      actions.push({
        icon: Zap,
        iconBg: "bg-violet-50",
        iconColor: "text-violet-600",
        tag: "Growth Move",
        tagColor: "text-violet-600",
        title: "Activate follow-up automation",
        description: "Businesses that follow up within 48 hours win 2x more quotes. Turn it on.",
        cta: "Set Up Follow-Ups",
        path: "/follow-ups",
      });
    }

    if (hasQuotes && hasCustomers && ratingSummary && (ratingSummary.total || 0) === 0) {
      actions.push({
        icon: Star,
        iconBg: "bg-amber-50",
        iconColor: "text-amber-500",
        tag: "Reputation",
        tagColor: "text-amber-600",
        title: "Request your first client review",
        description: "Reviews build trust and win more cleans. One great review can pay for itself 10x.",
        cta: "Get Reviews",
        path: "/reviews",
      });
    }

    if (hasQuotes && hasCustomers && actions.length < 2) {
      actions.push({
        icon: Bot,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        tag: "AI Tool",
        tagColor: "text-emerald-600",
        title: "Turn walk-through notes into a quote",
        description: "Paste your site-visit notes and AI builds a cleaning quote in seconds.",
        cta: "Try AI Assist",
        path: "/ai-assistant",
      });
    }

    return actions.slice(0, 3);
  }, [hasQuotes, followUpQueueCount, amountAtRisk, draftQuotes, closeRate, hasFollowUpActivity, hasCustomers, ratingSummary]);

  // ── Stat card subtitle helpers ─────────────────────────────────────────────
  const quoteSubtitle = quotes.length === 0
    ? "Create your first cleaning quote to build a pipeline"
    : `${draftQuotes.length} draft · ${sentQuotes.length} sent`;
  const customerSubtitle = customers.length === 0
    ? "Add your first cleaning client to get started"
    : undefined;
  const revenueSubtitle = totalRevenue === 0
    ? "Accepted cleaning quotes count toward revenue"
    : undefined;

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

      {/* Free trial banner */}
      {isInFreeTrial ? (
        <button
          onClick={() => navigate("/pricing")}
          className="w-full text-left rounded-2xl p-4 mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Free Trial — {freeTrialDaysLeft} day{freeTrialDaysLeft !== 1 ? "s" : ""} remaining
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              Upgrade to keep unlimited cleaning quotes, AI tools, and automated follow-ups.
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-blue-400 shrink-0" />
        </button>
      ) : null}

      {/* 1. Dynamic Hero */}
      <DynamicHero
        isNewUser={isNewUser}
        followUpQueueCount={followUpQueueCount}
        amountAtRisk={amountAtRisk}
        oldestQuoteDays={oldestQuoteDays}
        estimatedLoss={estimatedLoss}
        closeRate={closeRate}
        protectionScore={protectionScore}
        followUpHealthPercent={followUpHealthPercent}
        quotes={quotes}
        totalRevenue={totalRevenue}
        navigate={navigate}
      />

      {/* 2. Start Here Checklist (new users / low setup) */}
      {showChecklist ? (
        <StartHereChecklist
          hasPricing={hasPricing || hasQuotes}
          hasQuotes={hasQuotes}
          hasCustomers={hasCustomers}
          hasFollowUpActivity={hasFollowUpActivity}
          navigate={navigate}
        />
      ) : null}

      {/* 3. Today's Revenue Moves */}
      <TodaysRevenueMoves actions={revenueActions} navigate={navigate} />

      {/* 4. Core KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Cleaning Quotes"
          value={quotes.length === 0 ? "0" : quotes.length}
          icon={FileText}
          color="primary"
          subtitle={quoteSubtitle}
        />
        <StatCard
          label="Clients"
          value={customers.length === 0 ? "0" : customers.length}
          icon={Users}
          color="violet"
          subtitle={customerSubtitle}
        />
        <StatCard
          label="Scheduled Cleans"
          value={activeJobs.length}
          icon={Briefcase}
          color="amber"
          subtitle={`${jobs.length} total`}
        />
        <StatCard
          label="Revenue Won"
          icon={DollarSign}
          color="emerald"
          value={`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          subtitle={revenueSubtitle}
        />
      </div>

      {/* 5. Sales Momentum / Close Rate / Today at a Glance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader title="Quote Pipeline" icon={TrendingUp} />
          {quotes.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm font-semibold text-slate-500">No quotes sent yet</p>
              <p className="text-xs text-slate-400 mt-1">Send cleaning quotes and track your conversion funnel here.</p>
              <Button size="sm" icon={Plus} onClick={() => navigate("/quotes/new")} className="mt-3 mx-auto">
                Create Quote
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <FunnelBar label="Sent" count={stats?.sentQuotes || sentQuotes.length} total={funnelMax} color="bg-blue-500" icon={Send} />
                <FunnelBar label="Viewed" count={viewedQuotes.length} total={funnelMax} color="bg-violet-500" icon={Eye} />
                <FunnelBar label="Accepted" count={stats?.acceptedQuotes || acceptedQuotes.length} total={funnelMax} color="bg-emerald-500" icon={CheckCircle} />
                <FunnelBar label="Won" count={stats?.acceptedQuotes || acceptedQuotes.length} total={funnelMax} color="bg-green-600" icon={Award} />
              </div>
              <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Close rate</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{Math.round(closeRate)}%</span>
                {closeRate < 40 && closeRate > 0 ? (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">below avg</span>
                ) : closeRate >= 50 ? (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">strong</span>
                ) : null}
              </div>
            </>
          )}
        </Card>

        <Card>
          <CardHeader title="Close Rate" icon={Target} />
          {quotes.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm font-semibold text-slate-500">No quote activity yet</p>
              <p className="text-xs text-slate-400 mt-1">Send quotes and follow up to start tracking your close rate. Top cleaning companies close 40–60%.</p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <MetricRing
                value={closeRate}
                max={100}
                size={90}
                strokeWidth={7}
                color={closeRate >= 60 ? "emerald" : closeRate >= 40 ? "amber" : "red"}
              >
                <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{Math.round(closeRate)}%</span>
              </MetricRing>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className={`w-4 h-4 ${closeRate >= 50 ? "text-emerald-500" : "text-slate-400 dark:text-slate-500"}`} />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {closeRate >= 60 ? "Great — keep it up" : closeRate >= 40 ? "Average — room to grow" : closeRate > 0 ? "Needs improvement" : "No data yet"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {closeRate < 40 && closeRate > 0
                    ? "Follow up faster. Most cleaning jobs close within 48 hours of contact."
                    : `Based on ${(stats?.sentQuotes || sentQuotes.length)} quotes sent`}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Avg value: ${(stats?.avgQuoteValue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Today at a Glance" icon={Sparkles} />
          <div className="space-y-3">
            <div
              className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
              onClick={() => navigate("/follow-ups")}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${followUpQueueCount > 0 ? "bg-amber-50 dark:bg-amber-900/30" : "bg-slate-50 dark:bg-slate-700"}`}>
                  <PhoneMissed className={`w-4 h-4 ${followUpQueueCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-slate-500"}`} />
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-300">Need follow-up</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-bold ${followUpQueueCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-slate-100"}`}>
                  {followUpQueueCount}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
              </div>
            </div>
            <div
              className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
              onClick={() => navigate("/quotes")}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-300">Quotes out</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{sentQuotes.length + viewedQuotes.length}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
              </div>
            </div>
            <div
              className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
              onClick={() => navigate("/opportunities")}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm text-slate-600 dark:text-slate-300">Won this month</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${monthlyRevenue.toLocaleString()}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 6. AI Revenue Assist */}
      <AIGrowthTools navigate={navigate} />

      {/* 7. Follow-Up Streak + Weekly Recap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader title="Follow-Up Streak" icon={Flame} />
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${currentStreak > 0 ? "bg-emerald-100 dark:bg-emerald-800" : "bg-slate-100 dark:bg-slate-700"}`}>
              <Target className={`w-6 h-6 ${currentStreak > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-500"}`} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {currentStreak} {currentStreak === 1 ? "day" : "days"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentStreak >= 7
                  ? "Elite discipline — top closers follow up every day."
                  : currentStreak >= 3
                  ? "Building momentum. Keep going — streaks compound."
                  : currentStreak > 0
                  ? "Good start. Daily follow-up doubles close rates."
                  : "Your streak starts with one follow-up today."}
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
                        : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600"
                    }`}
                  >
                    {active ? <CheckCircle className="w-3.5 h-3.5" /> : null}
                  </div>
                  <span className={`text-[10px] font-semibold ${active ? "text-emerald-600" : "text-slate-400"}`}>{day}</span>
                </div>
              );
            })}
          </div>

          {longestStreak > 0 ? (
            <p className="text-xs text-slate-400 mt-3">
              Best streak: {longestStreak} {longestStreak === 1 ? "day" : "days"} — a {longestStreak >= 7 ? "great" : "solid"} run
            </p>
          ) : null}

          <Button
            icon={Zap}
            variant={currentStreak > 0 ? "success" : "primary"}
            onClick={() => navigate("/follow-ups")}
            className="w-full mt-4"
          >
            {currentStreak > 0 ? "Keep streak alive" : "Start your streak today"}
          </Button>
        </Card>

        <Card>
          <CardHeader title="Weekly Recap" icon={Calendar} />
          {quotes.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm font-semibold text-slate-500">No activity this week yet</p>
              <p className="text-xs text-slate-400 mt-1">The most successful cleaning businesses quote consistently, every week. One quote starts the momentum.</p>
              <Button size="sm" icon={Plus} onClick={() => navigate("/quotes/new")} className="mt-3 mx-auto">
                Start This Week Right
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">Cleaning quotes sent</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {quotes.filter((q: any) => {
                    const d = new Date(q.createdAt);
                    const now = new Date();
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return d >= weekAgo;
                  }).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">Quotes accepted</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {acceptedQuotes.filter((q: any) => {
                    const d = new Date(q.createdAt);
                    const now = new Date();
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return d >= weekAgo;
                  }).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">Revenue this month</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${monthlyRevenue.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-300">Close rate</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${closeRate >= 50 ? "text-emerald-600 dark:text-emerald-400" : closeRate >= 30 ? "text-amber-600 dark:text-amber-400" : "text-red-500 dark:text-red-400"}`}>
                    {Math.round(closeRate)}%
                  </span>
                  {closeRate < 40 && closeRate > 0 ? (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">Follow up faster</span>
                  ) : null}
                </div>
              </div>
              {ratingSummary ? (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                  <span className="text-sm text-slate-600 dark:text-slate-300">Avg rating</span>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{(ratingSummary.average || 0).toFixed(1)}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">({ratingSummary.total || 0})</span>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </div>

      {/* 8. Revenue Chart */}
      <Card className="mb-6">
        <CardHeader
          title="Accepted Revenue"
          icon={BarChart3}
          actions={<span className="text-xs text-slate-400">Last 6 months</span>}
        />
        <RevenueChart quotes={quotes} />
      </Card>

      {/* 9. Recent Quotes */}
      <Card padding={false}>
        <div className="flex items-center justify-between px-5 lg:px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Recent Quotes</h2>
          <button
            onClick={() => navigate("/quotes")}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium flex items-center gap-1"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentQuotes.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <FileText className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">No cleaning quotes sent yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              The fastest path to revenue is sending your first cleaning quote. It takes under 2 minutes.
            </p>
            <Button icon={Plus} onClick={() => navigate("/quotes/new")} className="mt-4 mx-auto">
              Create Your First Cleaning Quote
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-5 lg:px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Type</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 lg:px-6 py-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentQuotes.map((q: any) => (
                  <tr
                    key={q.id}
                    onClick={() => navigate(`/quotes/${q.id}`)}
                    className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/80 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                  >
                    <td className="px-5 lg:px-6 py-3.5 font-medium text-slate-900 dark:text-slate-100">{q.customerName || "No customer"}</td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 capitalize hidden sm:table-cell">
                      {(q.propertyDetails as any)?.quoteType || "residential"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-900 dark:text-slate-100">${Number(q.total || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <Badge status={q.status} dot />
                    </td>
                    <td className="px-5 lg:px-6 py-3.5 text-right text-slate-500 dark:text-slate-400 hidden md:table-cell">
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
