import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Zap, Play, Pause, CheckCircle, Clock,
  Users, Mail, Star, ArrowRight, Lock, Loader2, RefreshCw,
} from "lucide-react";
import {
  PageHeader, Card, Badge, Button, Spinner, EmptyState, StatCard,
} from "../components/ui";
import { apiRequest, apiPost } from "../lib/api";
import { useSubscription } from "../lib/subscription";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface AutopilotJob {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_email: string;
  status: "active" | "paused" | "completed" | "failed";
  current_step: number;
  next_action_at: string | null;
  created_at: string;
  log_count: number;
}

interface AutopilotStats {
  total: number;
  active: number;
  completed: number;
  paused: number;
  failed: number;
  emailsSent: number;
}

/* ─── Step labels ─────────────────────────────────────────────────────────── */

const STEP_LABELS: Record<number, { label: string; icon: typeof Mail; color: string }> = {
  1: { label: "Qualify & Quote",   icon: Zap,         color: "text-blue-600" },
  2: { label: "Follow-Up",         icon: RefreshCw,   color: "text-amber-600" },
  3: { label: "Welcome",           icon: CheckCircle, color: "text-green-600" },
  4: { label: "Review Request",    icon: Star,        color: "text-purple-600" },
};

/* ─── Upsell wall ─────────────────────────────────────────────────────────── */

function AutopilotUpsell({ isGrowth }: { isGrowth: boolean }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const data = await apiPost<{ url: string }>("/api/autopilot/checkout");
      if (data?.url) window.location.href = data.url;
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 max-w-xl mx-auto text-center gap-6">
      <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center">
        <Zap className="w-8 h-8 text-violet-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">QuotePro Autopilot</h2>
        <p className="text-slate-500 text-base leading-relaxed">
          A 4-step AI pipeline that qualifies leads, sends quotes, follows up, and requests reviews — automatically.
        </p>
      </div>

      <div className="w-full bg-slate-50 rounded-2xl p-5 space-y-3 text-left">
        {[
          { icon: Zap,         label: "Step 1 — AI qualifies the lead and sends a tailored quote" },
          { icon: RefreshCw,   label: "Step 2 — Automated follow-up if no response" },
          { icon: CheckCircle, label: "Step 3 — Welcome email when the quote is accepted" },
          { icon: Star,        label: "Step 4 — Review request after the job is complete" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <p className="text-sm text-slate-700 leading-snug">{label}</p>
          </div>
        ))}
      </div>

      {isGrowth ? (
        <div className="w-full space-y-3">
          <p className="text-sm text-slate-500">
            Autopilot is available as an add-on for Growth plan users for <strong>$29/month</strong>.
          </p>
          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
            Add Autopilot — $29/mo
          </Button>
        </div>
      ) : (
        <div className="w-full space-y-3">
          <p className="text-sm text-slate-500">
            Autopilot is included in the <strong>Pro plan</strong> or available as an add-on on Growth.
          </p>
          <Button onClick={() => window.location.href = "/pricing"} className="w-full">
            <Lock className="w-4 h-4 mr-2" />
            Upgrade to unlock Autopilot
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Status badge ────────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: AutopilotJob["status"] }) {
  const map: Record<AutopilotJob["status"], string> = {
    active:    "active",
    paused:    "warning",
    completed: "completed",
    failed:    "error",
  };
  return <Badge status={map[status] ?? "draft"} />;
}

/* ─── Job row ─────────────────────────────────────────────────────────────── */

function JobRow({ job, onPause, onResume }: {
  job: AutopilotJob;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}) {
  const step = STEP_LABELS[job.current_step];
  const StepIcon = step?.icon ?? Zap;

  const nextAt = job.next_action_at
    ? new Date(job.next_action_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : null;

  return (
    <div className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-0">
      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
        <StepIcon className={`w-4 h-4 ${step?.color ?? "text-slate-500"}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 text-sm truncate">{job.lead_name || job.lead_email}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Step {job.current_step}: {step?.label ?? "Unknown"}
          {nextAt ? ` · Next: ${nextAt}` : ""}
          {" · "}{job.log_count} email{job.log_count !== 1 ? "s" : ""} sent
        </p>
      </div>

      <StatusBadge status={job.status} />

      {job.status === "active" && (
        <button
          onClick={() => onPause(job.id)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          title="Pause"
        >
          <Pause className="w-4 h-4" />
        </button>
      )}
      {job.status === "paused" && (
        <button
          onClick={() => onResume(job.id)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-green-600 transition-colors"
          title="Resume"
        >
          <Play className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/* ─── Main dashboard ──────────────────────────────────────────────────────── */

function AutopilotDashboard() {
  const queryClient = useQueryClient();

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<AutopilotJob[]>({
    queryKey: ["/api/autopilot/jobs"],
  });
  const { data: stats } = useQuery<AutopilotStats>({
    queryKey: ["/api/autopilot/stats"],
  });

  const pause = async (id: string) => {
    await apiRequest("POST", `/api/autopilot/jobs/${id}/pause`);
    queryClient.invalidateQueries({ queryKey: ["/api/autopilot/jobs"] });
    queryClient.invalidateQueries({ queryKey: ["/api/autopilot/stats"] });
  };

  const resume = async (id: string) => {
    await apiRequest("POST", `/api/autopilot/jobs/${id}/resume`);
    queryClient.invalidateQueries({ queryKey: ["/api/autopilot/jobs"] });
    queryClient.invalidateQueries({ queryKey: ["/api/autopilot/stats"] });
  };

  if (jobsLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active"
          value={stats?.active ?? 0}
          icon={Play}
          color="emerald"
        />
        <StatCard
          label="Completed"
          value={stats?.completed ?? 0}
          icon={CheckCircle}
          color="primary"
        />
        <StatCard
          label="Paused"
          value={stats?.paused ?? 0}
          icon={Pause}
          color="amber"
        />
        <StatCard
          label="Emails Sent"
          value={stats?.emailsSent ?? 0}
          icon={Mail}
          color="violet"
        />
      </div>

      {/* How it works strip */}
      <Card>
        <div className="flex flex-wrap gap-3">
          {[
            { step: 1, label: "Qualify + Quote",   icon: Zap,         color: "text-blue-600",   bg: "bg-blue-50" },
            { step: 2, label: "Follow-Up",          icon: RefreshCw,   color: "text-amber-600",  bg: "bg-amber-50" },
            { step: 3, label: "Welcome",            icon: CheckCircle, color: "text-green-600",  bg: "bg-green-50" },
            { step: 4, label: "Review Request",     icon: Star,        color: "text-purple-600", bg: "bg-purple-50" },
          ].map(({ step, label, icon: Icon, color, bg }, i, arr) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${bg}`}>
                <Icon className={`w-4 h-4 ${color}`} />
                <span className={`text-xs font-semibold ${color}`}>Step {step}: {label}</span>
              </div>
              {i < arr.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />}
            </div>
          ))}
        </div>
      </Card>

      {/* Jobs list */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Active Pipelines</h3>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500">{jobs.length} lead{jobs.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {jobs.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No leads enrolled yet"
            description="Enroll a lead from the Quote Requests page to start their automated pipeline."
          />
        ) : (
          <div>
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} onPause={pause} onResume={resume} />
            ))}
          </div>
        )}
      </Card>

      {/* Info */}
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 rounded-xl text-sm text-blue-700">
        <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          Autopilot checks for pending actions every 15 minutes. Enroll leads from the
          <strong> Quote Requests</strong> page using the lightning bolt icon on each card.
        </p>
      </div>
    </div>
  );
}

/* ─── Page shell ──────────────────────────────────────────────────────────── */

export default function AutopilotPage() {
  const { isGrowth, isPro } = useSubscription();

  const { error } = useQuery<AutopilotJob[]>({
    queryKey: ["/api/autopilot/jobs"],
    retry: false,
  });

  const is403 = (error as any)?.status === 403 || (error as any)?.upsell;
  const showUpsell = !isPro && ((!isGrowth) || is403);

  return (
    <div>
      <PageHeader
        title="Autopilot"
        subtitle="AI-powered lead nurturing pipeline — qualify, quote, follow up, and request reviews automatically"
        badge={isPro ? undefined : isGrowth ? <Badge status="warning" label="Add-on" /> : <Badge status="pro" label="Pro" />}
      />

      {showUpsell ? (
        <AutopilotUpsell isGrowth={isGrowth} />
      ) : (
        <AutopilotDashboard />
      )}
    </div>
  );
}
