import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useSubscription } from "../lib/subscription";
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
  TrendingDown,
  Clock,
  Inbox,
  AlertCircle,
  Link2,
  X,
} from "lucide-react";
import { Button, Badge, Card, CardHeader, ProgressBar, MetricRing, FunnelBar } from "../components/ui";
import { formatCurrency } from "../utils/currency";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeFmt(currency: string) {
  return (n: number) => formatCurrency(n, currency);
}

function fmt(n: number) {
  return formatCurrency(n, "USD");
}

function getHour() {
  return new Date().getHours();
}

function greeting() {
  const h = getHour();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// ─── Command Header ──────────────────────────────────────────────────────────

function getCloseRateColor(rate: number): string {
  if (rate <= 0) return "#94a3b8";
  if (rate < 25) return "#ef4444";
  if (rate <= 50) return "#f59e0b";
  return "#4ade80";
}

function CommandHeader({
  business,
  todayRevenue,
  monthRevenue,
  weekJobs,
  closeRate,
  followUpQueueCount,
  amountAtRisk,
  oldestQuoteDays,
  isInFreeTrial,
  freeTrialDaysLeft,
  navigate,
}: {
  business: any;
  todayRevenue: number;
  monthRevenue: number;
  weekJobs: number;
  closeRate: number;
  followUpQueueCount: number;
  amountAtRisk: number;
  oldestQuoteDays: number;
  isInFreeTrial: boolean;
  freeTrialDaysLeft: number;
  navigate: (path: string) => void;
}) {
  const hasRisk = followUpQueueCount > 0;
  const closeRateColor = getCloseRateColor(closeRate);
  const dayStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase();

  return (
    <div className="mb-6">
      {/* ── Hero ── */}
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{
          background: "linear-gradient(145deg, #06070d 0%, #0d1225 45%, #0f1e3d 100%)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12)",
        }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none hero-grid-overlay" />
        {/* Blue glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-60px", right: "-40px", width: "360px", height: "360px",
            background: "radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: "-40px", left: "30%", width: "280px", height: "200px",
            background: "radial-gradient(ellipse, rgba(99,102,241,0.1) 0%, transparent 70%)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 px-6 pt-6 pb-5">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              {/* Fix 3: Date label — 11px, 600 weight, 1.5px letter-spacing */}
              <p
                className="mb-2"
                style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1.5px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}
              >
                {dayStr}
              </p>
              {/* Fix 3: Greeting — 32px, 400 weight + company name 32px, 700 weight */}
              <h1 style={{ fontSize: "32px", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.7)" }}>{greeting()}</span>
                {business?.companyName ? (
                  <><br /><span style={{ fontWeight: 700, color: "#ffffff" }}>{business.companyName}</span></>
                ) : null}
              </h1>
              {/* Fix 3: Subtext — 15px, rgba(255,255,255,0.55) */}
              <p className="mt-2" style={{ fontSize: "15px", color: "rgba(255,255,255,0.55)" }}>
                {monthRevenue > 0
                  ? `${fmt(monthRevenue)} recognized this month — keep pushing`
                  : "Your revenue operations command center"}
              </p>
            </div>
            {/* Fix 3: Remove "+ New Quote" button — only show trial badge */}
            {isInFreeTrial ? (
              <div className="shrink-0 mt-0.5">
                <button
                  onClick={() => navigate("/pricing")}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                  style={{ color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.08)" }}
                >
                  Trial: {freeTrialDaysLeft}d left
                </button>
              </div>
            ) : null}
          </div>

          {/* Fix 2 + Fix 3: Stat strip — today's snapshot metrics */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-0 rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.04)" }}
          >
            {[
              {
                icon: DollarSign,
                label: "Today's Revenue",
                value: fmt(todayRevenue),
                valueColor: todayRevenue > 0 ? "#4ade80" : "rgba(255,255,255,0.6)",
                iconColor: "#4ade80",
              },
              {
                icon: Briefcase,
                label: "Jobs This Week",
                value: String(weekJobs),
                valueColor: "white",
                iconColor: "#93c5fd",
              },
              {
                icon: Target,
                label: "Close Rate",
                value: closeRate > 0 ? `${Math.round(closeRate)}%` : "—",
                valueColor: closeRateColor,
                iconColor: "#c4b5fd",
              },
              {
                icon: followUpQueueCount > 0 ? PhoneMissed : CheckCircle,
                label: "Follow-Ups Due Today",
                value: followUpQueueCount > 0 ? String(followUpQueueCount) : "Clear",
                valueColor: followUpQueueCount > 0 ? "#fbbf24" : "#4ade80",
                iconColor: followUpQueueCount > 0 ? "#fbbf24" : "#4ade80",
                clickable: followUpQueueCount > 0,
              },
            ].map((stat, i) => (
              <div
                key={i}
                onClick={stat.clickable ? () => navigate("/follow-ups") : undefined}
                className={`px-5 py-4 flex items-start gap-3 ${i > 0 ? "border-l" : ""} ${stat.clickable ? "cursor-pointer hover:bg-white/5 transition-colors" : ""}`}
                style={{ borderLeftColor: "rgba(255,255,255,0.1)" }}
              >
                <stat.icon
                  className="shrink-0 mt-0.5"
                  style={{ width: "14px", height: "14px", color: stat.iconColor, opacity: 0.85 }}
                />
                <div className="min-w-0">
                  {/* Fix 3: Stat labels — 11px, uppercase, 0.8px letter-spacing, rgba(255,255,255,0.45) */}
                  <p
                    className="mb-1 font-medium uppercase"
                    style={{ fontSize: "11px", letterSpacing: "0.8px", color: "rgba(255,255,255,0.45)" }}
                  >
                    {stat.label}
                  </p>
                  {/* Fix 3: Stat values — 24px, 700 weight */}
                  <p
                    className="leading-none stat-number"
                    style={{ fontSize: "24px", fontWeight: 700, color: stat.valueColor }}
                  >
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alert ribbon */}
        {hasRisk ? (
          <button
            onClick={() => navigate("/follow-ups")}
            className="w-full flex items-center gap-3 px-6 py-2.5 text-left group transition-colors"
            style={{ background: "rgba(245,158,11,0.15)", borderTop: "1px solid rgba(245,158,11,0.2)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(245,158,11,0.22)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(245,158,11,0.15)"; }}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: "#fbbf24" }} />
            <span className="text-[12.5px] font-semibold flex-1" style={{ color: "#fcd34d" }}>
              {followUpQueueCount} quote{followUpQueueCount > 1 ? "s" : ""} need follow-up
              <span style={{ color: "rgba(252,211,77,0.65)", fontWeight: 400 }}>
                {" "}· {fmt(amountAtRisk)} at risk · Oldest {oldestQuoteDays}d
              </span>
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap" style={{ color: "#fcd34d" }}>
              Act now <ArrowRight className="w-3 h-3" />
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "emerald" | "blue" | "amber" | "violet" | "red";
  badge?: string;
  badgePositive?: boolean;
  onClick?: () => void;
}

const KPI_ACCENT: Record<string, { icon: string; value: string; dot: string }> = {
  emerald: { icon: "#059669", value: "#065f46", dot: "#10b981" },
  blue:    { icon: "#2563eb", value: "#1e40af", dot: "#3b82f6" },
  amber:   { icon: "#d97706", value: "#92400e", dot: "#f59e0b" },
  violet:  { icon: "#7c3aed", value: "#4c1d95", dot: "#8b5cf6" },
  red:     { icon: "#dc2626", value: "#7f1d1d", dot: "#ef4444" },
};

function KPICard({ label, value, subtitle, icon: Icon, color, badge, badgePositive, onClick }: KPICardProps) {
  const accent = KPI_ACCENT[color];
  return (
    <div
      onClick={onClick}
      className={`rounded-xl bg-white p-5 ${onClick ? "cursor-pointer active:scale-[0.99]" : ""} transition-all duration-150`}
      style={{
        border: "1px solid rgba(0,0,0,0.07)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
      onMouseEnter={onClick ? (e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
      } : undefined}
      onMouseLeave={onClick ? (e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
        (e.currentTarget as HTMLElement).style.transform = "";
      } : undefined}
    >
      <div className="flex items-start justify-between gap-2 mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${accent.dot}14`, color: accent.icon }}
        >
          <Icon className="w-4.5 h-4.5" style={{ width: "18px", height: "18px" }} />
        </div>
        {badge ? (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={badgePositive
              ? { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" }
              : { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }
            }
          >
            {badge}
          </span>
        ) : null}
      </div>
      <p
        className="text-2xl lg:text-[28px] font-bold tracking-tight leading-none stat-number"
        style={{ color: "#09090b", letterSpacing: "-0.025em" }}
      >
        {value}
      </p>
      <p
        className="text-[11px] font-medium uppercase tracking-wider mt-2"
        style={{ color: "#a1a1aa", letterSpacing: "0.06em" }}
      >
        {label}
      </p>
      {subtitle ? (
        <p className="text-[11.5px] mt-1" style={{ color: accent.icon }}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

// ─── Today's Operations ───────────────────────────────────────────────────────

function TodayOperations({
  todayJobs,
  todayRevenue,
  unscheduledAccepted,
  navigate,
}: {
  todayJobs: any[];
  todayRevenue: number;
  unscheduledAccepted: number;
  navigate: (path: string) => void;
}) {
  const nextJob = todayJobs.find((j: any) => j.status !== "completed") || todayJobs[0];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/40 overflow-hidden mb-6 shadow-sm">
      {/* Fix 9: TODAY header — pulsing green dot, uppercase tracking */}
      <div
        className="flex items-center justify-between px-5 py-3.5 border-b dark:border-slate-700/60"
        style={{ borderBottomColor: "var(--border)", background: "var(--bg-card)" }}
      >
        <div className="flex items-center gap-2.5">
          {/* Fix 9: Pulsing green dot with glow */}
          <div className="relative w-2 h-2">
            <div
              className="absolute inset-0 rounded-full today-dot"
              style={{ background: "#10b981" }}
            />
            <div
              className="absolute -inset-1 rounded-full animate-ping opacity-40"
              style={{ background: "#10b981" }}
            />
          </div>
          <span
            className="font-bold uppercase"
            style={{ fontSize: "11px", letterSpacing: "1.5px", color: "#10b981" }}
          >
            TODAY
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
        <button
          onClick={() => navigate("/calendar")}
          className="flex items-center gap-1 text-xs font-semibold"
          style={{ color: "#2563eb" }}
        >
          View Calendar <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-100">
        {/* Today's cleans */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="text-xs text-slate-500 font-medium">Cleans Today</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{todayJobs.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {todayJobs.filter((j: any) => j.status === "completed").length} completed
          </p>
        </div>

        {/* Revenue today */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-xs text-slate-500 font-medium">Revenue Today</span>
          </div>
          <p className="text-2xl font-black text-emerald-700">{fmt(todayRevenue)}</p>
          <p className="text-xs text-emerald-500 mt-0.5">scheduled</p>
        </div>

        {/* Next clean */}
        <div className="p-5 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <span className="text-xs text-slate-500 font-medium">Next Clean</span>
          </div>
          {nextJob ? (
            <>
              <p className="text-sm font-bold text-slate-900 leading-tight">
                {new Date(nextJob.startDatetime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{nextJob.address || "No address"}</p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-400">None scheduled</p>
              <button
                onClick={() => navigate("/calendar")}
                className="text-xs text-primary-600 font-medium hover:text-primary-700 mt-0.5"
              >
                Schedule a clean
              </button>
            </>
          )}
        </div>

        {/* Unscheduled accepted */}
        <div
          className={`p-5 cursor-pointer transition-colors ${unscheduledAccepted > 0 ? "bg-amber-50/60 hover:bg-amber-50" : "hover:bg-slate-50"}`}
          onClick={() => navigate("/quotes?filter=accepted")}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${unscheduledAccepted > 0 ? "bg-amber-100" : "bg-slate-50"}`}>
              <AlertCircle className={`w-3.5 h-3.5 ${unscheduledAccepted > 0 ? "text-amber-600" : "text-slate-400"}`} />
            </div>
            <span className={`text-xs font-medium ${unscheduledAccepted > 0 ? "text-amber-600" : "text-slate-500"}`}>Needs Scheduling</span>
          </div>
          <p className={`text-2xl font-black ${unscheduledAccepted > 0 ? "text-amber-700" : "text-slate-900"}`}>{unscheduledAccepted}</p>
          <p className={`text-xs mt-0.5 ${unscheduledAccepted > 0 ? "text-amber-500" : "text-slate-400"}`}>accepted quotes</p>
        </div>
      </div>
    </div>
  );
}

// ─── Attention Panel ──────────────────────────────────────────────────────────

interface AttentionItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  description: string;
  path: string;
  severity: "critical" | "warning" | "info";
}

function AttentionPanel({ items, navigate }: { items: AttentionItem[]; navigate: (path: string) => void }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-emerald-800 text-sm">All clear — great job</p>
          <p className="text-xs text-emerald-600 mt-0.5">No urgent items. Your pipeline is healthy and you're caught up on follow-ups.</p>
        </div>
      </div>
    );
  }

  const SEVERITY = {
    critical: { bg: "bg-red-50", border: "border-red-200", icon: "bg-red-100 text-red-600", dot: "bg-red-500", label: "text-red-700" },
    warning: { bg: "bg-amber-50", border: "border-amber-200", icon: "bg-amber-100 text-amber-600", dot: "bg-amber-400", label: "text-amber-700" },
    info: { bg: "bg-blue-50", border: "border-blue-200", icon: "bg-blue-100 text-blue-600", dot: "bg-blue-400", label: "text-blue-700" },
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Needs Attention</p>
      {items.map((item, i) => {
        const s = SEVERITY[item.severity];
        return (
          <button
            key={i}
            onClick={() => navigate(item.path)}
            className={`w-full text-left rounded-xl border p-3.5 flex items-start gap-3 hover:shadow-sm transition-all ${s.bg} ${s.border} group`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${s.icon}`}>
              <item.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${s.label}`}>{item.label}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                <span className={`text-xs font-black ${s.label}`}>{item.count}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 mt-1" />
          </button>
        );
      })}
    </div>
  );
}

// ─── Revenue Moves ────────────────────────────────────────────────────────────

interface RevenueAction {
  icon: React.ComponentType<any>;
  iconBg: string;
  iconColor: string;
  tag: string;
  tagBg: string;
  tagColor: string;
  title: string;
  description: string;
  cta: string;
  path: string;
}

function TodaysRevenueMoves({ actions, navigate }: { actions: RevenueAction[]; navigate: (path: string) => void }) {
  if (actions.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Revenue Moves</h2>
        <span className="text-xs text-slate-400">— highest-impact actions right now</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => navigate(action.path)}
            className="text-left rounded-2xl border border-slate-200 bg-white p-4 hover:border-primary-300 hover:shadow-md transition-all group active:scale-[0.99]"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${action.iconBg} flex items-center justify-center shrink-0`}>
                <action.icon className={`w-5 h-5 ${action.iconColor}`} />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full mt-0.5 ${action.tagBg} ${action.tagColor}`}>
                {action.tag}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 leading-snug mb-1">{action.title}</p>
            <p className="text-xs text-slate-500 leading-relaxed">{action.description}</p>
            <div className="flex items-center gap-1 mt-3 text-xs font-bold text-primary-600 group-hover:text-primary-700 group-hover:gap-2 transition-all">
              {action.cta} <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Pipeline Card ────────────────────────────────────────────────────────────

function PipelineCard({
  sentCount,
  viewedCount,
  acceptedCount,
  closeRate,
  avgValue,
  navigate,
}: {
  sentCount: number;
  viewedCount: number;
  acceptedCount: number;
  closeRate: number;
  avgValue: number;
  navigate: (path: string) => void;
}) {
  const max = Math.max(sentCount, viewedCount, acceptedCount, 1);

  const stages = [
    { label: "Sent", count: sentCount, color: "from-blue-500 to-blue-600", icon: Send, textColor: "text-blue-600" },
    { label: "Viewed", count: viewedCount, color: "from-violet-500 to-violet-600", icon: Eye, textColor: "text-violet-600" },
    { label: "Accepted", count: acceptedCount, color: "from-emerald-500 to-emerald-600", icon: CheckCircle, textColor: "text-emerald-600" },
  ];

  if (sentCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center px-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
          <TrendingUp className="w-6 h-6 text-slate-300" />
        </div>
        <p className="text-sm font-bold text-slate-500">Pipeline is empty</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">Create and send cleaning quotes to start tracking your conversion funnel.</p>
        <button
          onClick={() => navigate("/quotes/new")}
          className="mt-3 flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700"
        >
          <Plus className="w-3.5 h-3.5" /> Create Quote
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3 mb-4">
        {stages.map((stage) => {
          const pct = Math.max((stage.count / max) * 100, stage.count > 0 ? 6 : 0);
          return (
            <div key={stage.label} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0`}>
                <stage.icon className={`w-3.5 h-3.5 ${stage.textColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-600">{stage.label}</span>
                  <span className={`text-xs font-black ${stage.textColor}`}>{stage.count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${stage.color} rounded-full transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className={`text-xl font-black ${closeRate >= 50 ? "text-emerald-600" : closeRate >= 35 ? "text-amber-600" : "text-red-500"}`}>
            {Math.round(closeRate)}%
          </p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Close Rate</p>
          {closeRate < 40 && closeRate > 0 ? (
            <p className="text-[10px] text-amber-500 mt-0.5">below avg</p>
          ) : closeRate >= 50 ? (
            <p className="text-[10px] text-emerald-500 mt-0.5">excellent</p>
          ) : null}
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-xl font-black text-slate-900">{fmt(avgValue)}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Avg Value</p>
        </div>
      </div>

      <button
        onClick={() => navigate("/quotes")}
        className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 py-2 rounded-xl hover:bg-primary-50 transition-colors"
      >
        View all quotes <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Start Here Checklist ────────────────────────────────────────────────────

function StartHereChecklist({
  hasPricing,
  hasQuotes,
  hasCustomers,
  hasFollowUpActivity,
  navigate,
}: {
  hasPricing: boolean;
  hasQuotes: boolean;
  hasCustomers: boolean;
  hasFollowUpActivity: boolean;
  navigate: (path: string) => void;
}) {
  const steps = [
    { id: "pricing", done: hasPricing, label: "Set your cleaning rates", cta: "Set Up Pricing", path: "/settings?tab=pricing", icon: DollarSign },
    { id: "quote", done: hasQuotes, label: "Create your first cleaning quote", cta: "Create Quote", path: "/quotes/new", icon: FileText },
    { id: "customer", done: hasCustomers, label: "Add your first cleaning client", cta: "Add Client", path: "/customers/new", icon: Users },
    { id: "followup", done: hasFollowUpActivity, label: "Activate follow-up automation", cta: "Review Follow-Ups", path: "/follow-ups", icon: Zap },
  ];
  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  const pct = Math.round((completedCount / steps.length) * 100);

  // Fix 4: Celebratory complete state — don't return null
  if (allDone) {
    return (
      <div
        className="rounded-2xl overflow-hidden mb-6 setup-complete-animation"
        style={{ border: "2px solid #10b981", background: "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(5,150,105,0.04) 100%)" }}
      >
        <div className="px-5 py-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-emerald-900 dark:text-emerald-300 text-sm">QuotePro is fully set up</h2>
            <p className="text-xs text-emerald-700 dark:text-emerald-500 mt-0.5">All systems active — automation is running, quotes are live.</p>
          </div>
          <button
            onClick={() => navigate("/growth")}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 shrink-0"
          >
            View Growth Hub <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // Fix 4: Urgent incomplete state — amber warning treatment
  const remainingSteps = steps.filter((s) => !s.done);
  const nextStep = remainingSteps[0];

  return (
    <div
      className="rounded-2xl overflow-hidden mb-6"
      style={{
        border: "2px solid #f59e0b",
        background: "linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(217,119,6,0.03) 100%)",
      }}
    >
      {/* Amber accent bar */}
      <div style={{ height: "3px", background: "linear-gradient(90deg, #f59e0b, #fbbf24)" }} />

      <div className="px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h2 className="font-bold text-amber-900 dark:text-amber-200 text-sm">Complete setup to unlock full automation</h2>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{completedCount} of {steps.length} steps done · {steps.length - completedCount} remaining</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-24 h-1.5 rounded-full bg-amber-100 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-bold text-amber-600">{pct}%</span>
        </div>
      </div>

      {/* Completed steps (greyed) */}
      <div className="px-5 pb-1">
        <div className="divide-y divide-amber-100">
          {steps.filter((s) => s.done).map((step) => (
            <div key={step.id} className="flex items-center gap-3 py-2.5 opacity-50">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-xs font-medium text-slate-500 line-through">{step.label}</p>
            </div>
          ))}

          {/* Next step — prominent amber CTA */}
          {nextStep ? (
            <div className="flex items-center gap-3 py-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "#f59e0b" }}
              >
                <nextStep.icon className="w-3 h-3 text-white" />
              </div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 flex-1">{nextStep.label}</p>
              <button
                onClick={() => navigate(nextStep.path)}
                className="flex items-center gap-1 text-xs font-bold text-white px-3 py-1.5 rounded-lg shrink-0"
                style={{ background: "#f59e0b" }}
              >
                Complete <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ) : null}

          {/* Other remaining steps (dimmer) */}
          {remainingSteps.slice(1).map((step) => (
            <div key={step.id} className="flex items-center gap-3 py-2.5 opacity-60">
              <div className="w-6 h-6 rounded-full border-2 border-amber-200 flex items-center justify-center shrink-0">
                <step.icon className="w-3 h-3 text-amber-400" />
              </div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{step.label}</p>
              <button
                onClick={() => navigate(step.path)}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 shrink-0 ml-auto"
              >
                {step.cta} <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: "4px" }} />
    </div>
  );
}

// ─── AI Growth Tools ──────────────────────────────────────────────────────────

function AIGrowthTools({ navigate }: { navigate: (path: string) => void }) {
  const tools = [
    { icon: MessageSquare, label: "Handle objections", description: "Turn pricing pushback into closed jobs.", prompt: "help me handle objections" },
    { icon: Send, label: "Draft follow-up", description: "Write a sharp follow-up message in seconds.", prompt: "draft a follow-up message" },
    { icon: FileEdit, label: "Walk-through to quote", description: "Paste site-visit notes, get a quote.", prompt: "turn my notes into a quote" },
    { icon: Repeat, label: "Pitch recurring plan", description: "Generate an upsell script for recurring cleans.", prompt: "recurring upsell script" },
    { icon: RefreshCw, label: "Re-engage a lost client", description: "Bring back a prospect that went quiet.", prompt: "re-engage lost lead" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden mb-6 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-primary-900 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">AI Revenue Assist</h2>
            <p className="text-[10px] text-blue-200 mt-0.5">Powered by QuotePro AI</p>
          </div>
        </div>
        <button
          onClick={() => navigate("/ai-assistant")}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-200 hover:text-white transition-colors"
        >
          Open AI <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
        {tools.map((tool) => (
          <button
            key={tool.label}
            onClick={() => navigate(`/ai-assistant?prompt=${encodeURIComponent(tool.prompt)}`)}
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-primary-50 hover:border-primary-200 border border-slate-100 transition-all text-left group"
          >
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 group-hover:border-primary-300 transition-colors">
              <tool.icon className="w-4 h-4 text-slate-400 group-hover:text-primary-600 transition-colors" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-700 group-hover:text-primary-700 transition-colors">{tool.label}</p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">{tool.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Revenue Chart ────────────────────────────────────────────────────────────

function RevenueChart({ quotes, fmt }: { quotes: any[]; fmt: (n: number) => string }) {
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
  const total6mo = monthlyData.reduce((s, m) => s + m.revenue, 0);

  return (
    <div>
      {!hasAnyRevenue ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
            <BarChart3 className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-500">No revenue history yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">Accept cleaning quotes and your revenue chart builds here automatically.</p>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-2 h-36">
            {monthlyData.map((m, i) => {
              const h = Math.max((m.revenue / maxRevenue) * 100, m.revenue > 0 ? 5 : 0);
              const isCurrent = i === monthlyData.length - 1;
              return (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none shadow-lg z-10">
                    {fmt(m.revenue)}
                  </div>
                  <div className="w-full flex items-end justify-center" style={{ height: "100%" }}>
                    <div
                      className={`w-full max-w-[36px] rounded-t-lg transition-all duration-700 ease-out ${
                        isCurrent
                          ? "bg-gradient-to-t from-primary-700 to-primary-400 shadow-md shadow-primary-200"
                          : "bg-gradient-to-t from-slate-200 to-slate-100 group-hover:from-primary-200 group-hover:to-primary-100"
                      }`}
                      style={{ height: `${h}%`, minHeight: m.revenue > 0 ? "5px" : "0px" }}
                    />
                  </div>
                  <span className={`text-[10px] font-bold ${isCurrent ? "text-primary-600" : "text-slate-400"}`}>
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">6-month total</span>
            <span className="text-sm font-black text-emerald-600">{fmt(total6mo)}</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const { business } = useAuth();
  const fmt = makeFmt((business as any)?.currency || "USD");
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
  const { data: pricingStatus } = useQuery<{
    configured: boolean;
    usingDefaultPricing: boolean;
    completionPercent: number;
    missingItems: string[];
  }>({ queryKey: ["/api/lead-link/pricing-status"] });
  const { data: intakeCountData } = useQuery<{ count: number; newCount: number; reviewCount: number }>({
    queryKey: ["/api/intake-requests/count"],
    refetchInterval: 60_000,
  });

  // ── Derived state ──────────────────────────────────────────────────────────
  const sentQuotes = quotes.filter((q: any) => q.status === "sent");
  const viewedQuotes = quotes.filter((q: any) => q.status === "viewed" || q.viewedAt);
  const acceptedQuotes = quotes.filter((q: any) => q.status === "accepted");
  const draftQuotes = quotes.filter((q: any) => q.status === "draft");

  const totalRevenue = acceptedQuotes.reduce((sum: number, q: any) => sum + (Number(q.total) || 0), 0);
  const activeJobs = jobs.filter((j: any) => j.status === "scheduled" || j.status === "in_progress");

  // Pricing banner dismiss (7-day snooze)
  const [pricingBannerDismissed, setPricingBannerDismissed] = useState<boolean>(() => {
    try {
      const ts = localStorage.getItem("qp_pricing_banner_dismissed_until");
      if (ts && Date.now() < parseInt(ts, 10)) return true;
    } catch {}
    return false;
  });

  function dismissPricingBanner() {
    try {
      localStorage.setItem("qp_pricing_banner_dismissed_until", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch {}
    setPricingBannerDismissed(true);
  }

  // Revenue milestone modal
  const MILESTONES = [1000, 5000, 10000];
  const [milestoneModal, setMilestoneModal] = useState<number | null>(null);
  useEffect(() => {
    if (totalRevenue <= 0) return;
    const seenKey = "qp_seen_milestones";
    let seen: number[] = [];
    try { seen = JSON.parse(localStorage.getItem(seenKey) || "[]"); } catch {}
    for (const m of MILESTONES) {
      if (totalRevenue >= m && !seen.includes(m)) {
        setMilestoneModal(m);
        localStorage.setItem(seenKey, JSON.stringify([...seen, m]));
        break;
      }
    }
  }, [totalRevenue]);

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

  // Today's jobs
  const todayStr = new Date().toDateString();
  const todayJobs = useMemo(() =>
    jobs.filter((j: any) => j.startDatetime && new Date(j.startDatetime).toDateString() === todayStr),
    [jobs, todayStr]
  );
  const todayRevenue = todayJobs.reduce((s: number, j: any) => s + (Number(j.total) || 0), 0);

  // Weekly jobs count
  const weekJobs = useMemo(() => {
    const now = Date.now();
    const weekStart = now - 7 * 24 * 60 * 60 * 1000;
    return jobs.filter((j: any) => j.startDatetime && new Date(j.startDatetime).getTime() >= weekStart).length;
  }, [jobs]);

  // Monthly revenue (accepted quotes this month)
  const monthlyRevenue = useMemo(() => acceptedQuotes.filter((q: any) => {
    const d = new Date(q.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s: number, q: any) => s + (Number(q.total) || 0), 0), [acceptedQuotes]);

  // Pipeline value (unscheduled accepted quotes)
  const unscheduledAccepted = useMemo(() => {
    const scheduledQuoteIds = new Set(jobs.map((j: any) => j.quoteId).filter(Boolean));
    return acceptedQuotes.filter((q: any) => !scheduledQuoteIds.has(q.id)).length;
  }, [acceptedQuotes, jobs]);

  const pipelineValue = useMemo(() =>
    acceptedQuotes.filter((q: any) => {
      const scheduledQuoteIds = new Set(jobs.map((j: any) => j.quoteId).filter(Boolean));
      return !scheduledQuoteIds.has(q.id);
    }).reduce((s: number, q: any) => s + (Number(q.total) || 0), 0),
    [acceptedQuotes, jobs]
  );

  // Fix 2: Last month revenue for comparison
  const lastMonthRevenue = useMemo(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return acceptedQuotes
      .filter((q: any) => {
        const d = new Date(q.createdAt);
        return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
      })
      .reduce((s: number, q: any) => s + (Number(q.total) || 0), 0);
  }, [acceptedQuotes]);

  // Fix 2: Next scheduled job
  const nextScheduledJob = useMemo(() => {
    const now = Date.now();
    return jobs
      .filter((j: any) => j.startDatetime && new Date(j.startDatetime).getTime() > now && j.status !== "completed")
      .sort((a: any, b: any) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime())[0] || null;
  }, [jobs]);

  // ── User maturity flags ────────────────────────────────────────────────────
  const isNewUser = quotes.length === 0;
  const hasPricing = !!(pricing && (pricing.laborRate > 0 || pricing.baseRate > 0 || pricing.targetMarginPct > 0));
  const hasQuotes = quotes.length > 0;
  const hasCustomers = customers.length > 0;
  const hasFollowUpActivity = currentStreak > 0 || followUpQueueCount > 0;
  // Fix 4: Always show checklist — component handles incomplete (urgent) vs complete (celebratory)
  const showChecklist = true;

  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const streakDaysToShow = Math.min(currentStreak, 7);

  // ── Fix 7: 3-tier close rate color ────────────────────────────────────────
  const closeRateColor: "emerald" | "amber" | "red" =
    closeRate > 50 ? "emerald" : closeRate >= 25 ? "amber" : "red";

  // ── Attention items ────────────────────────────────────────────────────────
  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];

    if (followUpQueueCount > 0) {
      items.push({
        icon: PhoneMissed,
        label: "Follow-ups needed",
        count: followUpQueueCount,
        description: `${fmt(amountAtRisk)} in sent quotes not yet responded to.`,
        path: "/follow-ups",
        severity: oldestQuoteDays >= 5 ? "critical" : oldestQuoteDays >= 3 ? "warning" : "warning",
      });
    }

    if (draftQuotes.length > 0) {
      items.push({
        icon: Send,
        label: "Drafts ready to send",
        count: draftQuotes.length,
        description: "Unsent quotes can't close. Send them today.",
        path: "/quotes",
        severity: "warning",
      });
    }

    if (unscheduledAccepted > 0) {
      items.push({
        icon: Calendar,
        label: "Accepted, not scheduled",
        count: unscheduledAccepted,
        description: `${fmt(pipelineValue)} in accepted quotes awaiting scheduling.`,
        path: "/quotes?filter=accepted",
        severity: "info",
      });
    }

    if (closeRate > 0 && closeRate < 30) {
      items.push({
        icon: TrendingDown,
        label: "Close rate below average",
        count: Math.round(closeRate),
        description: "Under 30% — follow up faster to close more cleans.",
        path: "/quotes",
        severity: "warning",
      });
    }

    return items.slice(0, 4);
  }, [followUpQueueCount, amountAtRisk, draftQuotes, unscheduledAccepted, pipelineValue, closeRate, oldestQuoteDays]);

  // ── Today's Revenue Moves ──────────────────────────────────────────────────
  const revenueActions = useMemo<RevenueAction[]>(() => {
    const actions: RevenueAction[] = [];

    if (!hasQuotes) {
      actions.push({
        icon: Plus,
        iconBg: "bg-primary-100",
        iconColor: "text-primary-600",
        tag: "High Impact",
        tagBg: "bg-primary-100",
        tagColor: "text-primary-700",
        title: "Create your first cleaning quote",
        description: "One quote sets everything in motion. Under 2 minutes to build.",
        cta: "Create Quote",
        path: "/quotes/new",
      });
    }

    if (followUpQueueCount > 0) {
      actions.push({
        icon: PhoneMissed,
        iconBg: "bg-amber-100",
        iconColor: "text-amber-600",
        tag: "Revenue Risk",
        tagBg: "bg-amber-100",
        tagColor: "text-amber-700",
        title: `Follow up with ${followUpQueueCount} lead${followUpQueueCount > 1 ? "s" : ""}`,
        description: `${fmt(amountAtRisk)} is waiting for your response. Most deals close within 48 hours.`,
        cta: "Review Follow-Ups",
        path: "/follow-ups",
      });
    }

    if (draftQuotes.length > 0) {
      actions.push({
        icon: Send,
        iconBg: "bg-blue-100",
        iconColor: "text-blue-600",
        tag: "Ready to Send",
        tagBg: "bg-blue-100",
        tagColor: "text-blue-700",
        title: `Send ${draftQuotes.length} draft quote${draftQuotes.length > 1 ? "s" : ""}`,
        description: "Drafts sitting unsent earn nothing. Send them and start the clock.",
        cta: "View Drafts",
        path: "/quotes",
      });
    }

    if (closeRate > 0 && closeRate < 35) {
      actions.push({
        icon: TrendingDown,
        iconBg: "bg-red-100",
        iconColor: "text-red-500",
        tag: "Coaching Tip",
        tagBg: "bg-red-100",
        tagColor: "text-red-700",
        title: "Quote close rate needs attention",
        description: `At ${Math.round(closeRate)}%, you're leaving cleans on the table. Use AI to write sharper follow-ups.`,
        cta: "Use AI Assist",
        path: "/ai-assistant",
      });
    }

    if (hasQuotes && !hasFollowUpActivity) {
      actions.push({
        icon: Zap,
        iconBg: "bg-violet-100",
        iconColor: "text-violet-600",
        tag: "Growth Move",
        tagBg: "bg-violet-100",
        tagColor: "text-violet-700",
        title: "Activate follow-up automation",
        description: "Businesses that follow up within 48 hours win 2x more quotes.",
        cta: "Set Up Follow-Ups",
        path: "/follow-ups",
      });
    }

    if (hasQuotes && hasCustomers && ratingSummary && (ratingSummary.total || 0) === 0) {
      actions.push({
        icon: Star,
        iconBg: "bg-amber-100",
        iconColor: "text-amber-500",
        tag: "Reputation",
        tagBg: "bg-amber-100",
        tagColor: "text-amber-700",
        title: "Request your first client review",
        description: "Reviews build trust and win more cleans. One review can pay for itself 10x.",
        cta: "Get Reviews",
        path: "/reviews",
      });
    }

    if (hasQuotes && hasCustomers && actions.length < 2) {
      actions.push({
        icon: Bot,
        iconBg: "bg-emerald-100",
        iconColor: "text-emerald-600",
        tag: "AI Tool",
        tagBg: "bg-emerald-100",
        tagColor: "text-emerald-700",
        title: "Turn walk-through notes into a quote",
        description: "Paste your site-visit notes and AI builds a cleaning quote in seconds.",
        cta: "Try AI Assist",
        path: "/ai-assistant",
      });
    }

    return actions.slice(0, 3);
  }, [hasQuotes, followUpQueueCount, amountAtRisk, draftQuotes, closeRate, hasFollowUpActivity, hasCustomers, ratingSummary]);

  const recentQuotes = useMemo(() =>
    [...quotes]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6),
    [quotes]
  );

  return (
    <div className="max-w-7xl mx-auto">

      {/* 1. Command Header */}
      <CommandHeader
        business={business}
        todayRevenue={todayRevenue}
        monthRevenue={monthlyRevenue}
        weekJobs={weekJobs}
        closeRate={closeRate}
        followUpQueueCount={followUpQueueCount}
        amountAtRisk={amountAtRisk}
        oldestQuoteDays={oldestQuoteDays}
        isInFreeTrial={isInFreeTrial}
        freeTrialDaysLeft={freeTrialDaysLeft}
        navigate={navigate}
      />

      {/* 2. Setup checklist for new users */}
      {showChecklist ? (
        <StartHereChecklist
          hasPricing={hasPricing || hasQuotes}
          hasQuotes={hasQuotes}
          hasCustomers={hasCustomers}
          hasFollowUpActivity={hasFollowUpActivity}
          navigate={navigate}
        />
      ) : null}

      {/* 2b. Pricing not configured banner */}
      {pricingStatus && !pricingStatus.configured && !pricingBannerDismissed && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 mb-6 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <Link2 className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-900">
              Your Lead Link is showing approximate pricing
            </p>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              Customers visiting your quote link see ballpark estimates — not your real rates.
              Finish pricing setup to show accurate prices and win more cleans.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-amber-200 overflow-hidden max-w-[140px]">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${pricingStatus.completionPercent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-amber-600">{pricingStatus.completionPercent}% set up</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate("/lead-capture")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
            >
              Fix Now <ChevronRight className="w-3 h-3" />
            </button>
            <button
              onClick={dismissPricingBanner}
              className="p-1.5 rounded-lg text-amber-400 hover:text-amber-600 hover:bg-amber-100 transition-colors"
              title="Dismiss for 7 days"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. KPI Momentum Row — Fix 2: differentiated monthly view */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Fix 2: Revenue Won This Month */}
        <KPICard
          label="Revenue Won This Month"
          value={fmt(monthlyRevenue)}
          subtitle={lastMonthRevenue > 0
            ? `${monthlyRevenue >= lastMonthRevenue ? "↑" : "↓"} ${Math.abs(Math.round(((monthlyRevenue - lastMonthRevenue) / Math.max(lastMonthRevenue, 1)) * 100))}% vs ${fmt(lastMonthRevenue)} last mo`
            : "vs $0 last month"}
          icon={DollarSign}
          color="emerald"
          badge="Live"
          badgePositive
          onClick={() => navigate("/opportunities")}
        />
        {/* Fix 2: Active Jobs with next job */}
        <KPICard
          label="Active Jobs"
          value={activeJobs.length}
          subtitle={nextScheduledJob
            ? `Next: ${new Date(nextScheduledJob.startDatetime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
            : `${jobs.length} total scheduled`}
          icon={Briefcase}
          color="blue"
          onClick={() => navigate("/jobs")}
        />
        {/* Fix 7: Close Rate with 3-tier badge */}
        <KPICard
          label="Close Rate"
          value={closeRate > 0 ? `${Math.round(closeRate)}%` : "—"}
          subtitle={
            closeRate > 50 ? "Strong close rate" :
            closeRate >= 25 ? "Room to improve" :
            closeRate > 0 ? "Needs attention" :
            "Send quotes to start tracking"
          }
          icon={Target}
          color={closeRateColor}
          badge={closeRate > 50 ? "Strong" : closeRate >= 25 ? "Improving" : closeRate > 0 ? "Needs Attention" : undefined}
          badgePositive={closeRate > 50}
          onClick={() => navigate("/quotes")}
        />
        {/* Fix 2: Pipeline Value */}
        <KPICard
          label="Pipeline Value"
          value={fmt(pipelineValue)}
          subtitle={`${unscheduledAccepted} accepted, need scheduling`}
          icon={TrendingUp}
          color={unscheduledAccepted > 0 ? "amber" : "violet"}
          badge={unscheduledAccepted > 0 ? `${unscheduledAccepted} Pending` : undefined}
          badgePositive={false}
          onClick={() => navigate("/quotes?filter=accepted")}
        />
      </div>

      {/* 4a. Quote Requests Banner */}
      {(intakeCountData?.newCount ?? 0) > 0 ? (
        <button
          onClick={() => navigate("/intake-requests")}
          className="w-full mb-4 rounded-2xl border border-red-200 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-red-300 transition-all text-left group"
        >
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
                <Inbox className="w-5 h-5 text-red-600" />
              </div>
              <span
                className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full bg-red-500 text-white font-bold leading-none"
                style={{ minWidth: "20px", height: "20px", fontSize: "11px", padding: "0 4px" }}
              >
                {(intakeCountData?.newCount ?? 0) > 99 ? "99+" : intakeCountData?.newCount}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 text-sm">
                {intakeCountData?.newCount === 1 ? "1 New Quote Request" : `${intakeCountData?.newCount} New Quote Requests`}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {intakeCountData?.newCount === 1 ? "A lead is waiting for your response" : "Leads are waiting for your response — review and build quotes"}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-red-500 transition-colors shrink-0" />
          </div>
        </button>
      ) : null}

      {/* 4. Today Operations */}
      <TodayOperations
        todayJobs={todayJobs}
        todayRevenue={todayRevenue}
        unscheduledAccepted={unscheduledAccepted}
        navigate={navigate}
      />

      {/* 5. Revenue Moves */}
      <TodaysRevenueMoves actions={revenueActions} navigate={navigate} />

      {/* 6. Pipeline + Attention Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        <div className="lg:col-span-3 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <h2 className="font-bold text-slate-800 text-sm">Quote Pipeline</h2>
            </div>
            <span className="text-xs text-slate-400">{quotes.length} total quotes</span>
          </div>
          <div className="p-5">
            <PipelineCard
              sentCount={stats?.sentQuotes || sentQuotes.length}
              viewedCount={viewedQuotes.length}
              acceptedCount={stats?.acceptedQuotes || acceptedQuotes.length}
              closeRate={closeRate}
              avgValue={stats?.avgQuoteValue || 0}
              navigate={navigate}
            />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-3">
          <AttentionPanel items={attentionItems} navigate={navigate} />
        </div>
      </div>

      {/* 7. AI Growth Tools */}
      <AIGrowthTools navigate={navigate} />

      {/* 8. Follow-Up Streak + Weekly Recap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Streak */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${currentStreak > 0 ? "bg-emerald-100" : "bg-slate-100"}`}>
              <Flame className={`w-3.5 h-3.5 ${currentStreak > 0 ? "text-emerald-600" : "text-slate-400"}`} />
            </div>
            <h2 className="font-bold text-slate-800 text-sm">Follow-Up Streak</h2>
            {currentStreak > 0 ? (
              <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                {currentStreak} day{currentStreak !== 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${currentStreak > 0 ? "bg-emerald-100" : "bg-slate-100"}`}>
                <span className={`text-2xl font-black ${currentStreak > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                  {currentStreak}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {currentStreak >= 7 ? "Elite discipline" : currentStreak >= 3 ? "Building momentum" : currentStreak > 0 ? "Good start" : "Start your streak"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentStreak >= 7 ? "Top closers follow up every day." : currentStreak >= 3 ? "Keep going — streaks compound." : currentStreak > 0 ? "Daily follow-up doubles close rates." : "One follow-up starts the momentum."}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {weekDays.map((day, i) => {
                const active = i < streakDaysToShow;
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${active ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200" : "bg-slate-100 text-slate-300"}`}>
                      {active ? <CheckCircle className="w-4 h-4" /> : null}
                    </div>
                    <span className={`text-[9px] font-bold ${active ? "text-emerald-600" : "text-slate-300"}`}>{day}</span>
                  </div>
                );
              })}
            </div>
            {longestStreak > 0 ? (
              <p className="text-xs text-slate-400 mt-3">Best: {longestStreak} day{longestStreak !== 1 ? "s" : ""}</p>
            ) : null}
            <button
              onClick={() => navigate("/follow-ups")}
              className={`w-full mt-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                currentStreak > 0
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                  : "bg-primary-600 hover:bg-primary-700 text-white"
              }`}
            >
              <Zap className="w-4 h-4" />
              {currentStreak > 0 ? "Keep streak alive" : "Start your streak today"}
            </button>
          </div>
        </div>

        {/* Weekly Recap */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <h2 className="font-bold text-slate-800 text-sm">Weekly Recap</h2>
          </div>
          <div className="p-5">
            {quotes.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm font-bold text-slate-400">No activity this week yet</p>
                <p className="text-xs text-slate-400 mt-1">Quote consistently — it's how the best cleaning businesses grow.</p>
                <button
                  onClick={() => navigate("/quotes/new")}
                  className="mt-3 flex items-center gap-1.5 mx-auto text-xs font-bold text-primary-600 hover:text-primary-700"
                >
                  <Plus className="w-3.5 h-3.5" /> Create a Quote
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {[
                  {
                    label: "Quotes sent this week",
                    value: quotes.filter((q: any) => {
                      const d = new Date(q.createdAt);
                      return Date.now() - d.getTime() <= 7 * 24 * 60 * 60 * 1000;
                    }).length,
                    color: "text-slate-900",
                  },
                  {
                    label: "Quotes accepted this week",
                    value: acceptedQuotes.filter((q: any) => {
                      const d = new Date(q.createdAt);
                      return Date.now() - d.getTime() <= 7 * 24 * 60 * 60 * 1000;
                    }).length,
                    color: "text-emerald-600",
                  },
                  { label: "Revenue this month", value: fmt(monthlyRevenue), color: "text-emerald-600" },
                  {
                    label: "Close rate",
                    value: closeRate > 0 ? `${Math.round(closeRate)}%` : "—",
                    color: closeRate >= 50 ? "text-emerald-600" : closeRate >= 35 ? "text-amber-600" : "text-red-500",
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                    <span className="text-sm text-slate-500">{row.label}</span>
                    <span className={`text-sm font-black ${row.color}`}>{row.value}</span>
                  </div>
                ))}
                {ratingSummary ? (
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-slate-500">Avg client rating</span>
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-black text-slate-900">{(ratingSummary.average || 0).toFixed(1)}</span>
                      <span className="text-xs text-slate-400">({ratingSummary.total || 0})</span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 9. Revenue Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm mb-6">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <h2 className="font-bold text-slate-800 text-sm">Accepted Revenue</h2>
          </div>
          <span className="text-xs text-slate-400">Last 6 months</span>
        </div>
        <div className="p-5">
          <RevenueChart quotes={quotes} fmt={fmt} />
        </div>
      </div>

      {/* 10. Recent Quotes */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <h2 className="font-bold text-slate-800 text-sm">Recent Quotes</h2>
          </div>
          <button
            onClick={() => navigate("/quotes")}
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentQuotes.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-500">No quotes yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Send your first cleaning quote in under 2 minutes and start building your pipeline.
            </p>
            <button
              onClick={() => navigate("/quotes/new")}
              className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Your First Quote
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                  <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Type</th>
                  <th className="text-right px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                  <th className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="text-right px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentQuotes.map((q: any) => (
                  <tr
                    key={q.id}
                    onClick={() => navigate(`/quotes/${q.id}`)}
                    className="border-b border-slate-50 hover:bg-primary-50/50 cursor-pointer transition-colors last:border-0 group"
                  >
                    <td className="px-5 py-3.5 font-semibold text-slate-900 group-hover:text-primary-700 transition-colors">
                      {q.customerName || "No customer"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 capitalize hidden sm:table-cell text-xs">
                      {(q.propertyDetails as any)?.quoteType || "residential"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-slate-900">${Number(q.total || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <Badge status={q.status} dot />
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-slate-400 hidden md:table-cell">
                      {new Date(q.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom spacing */}
      <div className="h-8" />

      {/* Revenue milestone modal */}
      {milestoneModal !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-scale-in text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 flex items-center justify-center">
              <Award className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              ${milestoneModal.toLocaleString()} milestone reached!
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Your cleaning business has now generated ${milestoneModal.toLocaleString()} in tracked revenue through QuotePro. Keep building — the next milestone is waiting.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => { setMilestoneModal(null); navigate("/revenue"); }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
              >
                View Revenue Report
              </button>
              <button
                onClick={() => setMilestoneModal(null)}
                className="w-full py-2 text-slate-500 text-sm hover:text-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
