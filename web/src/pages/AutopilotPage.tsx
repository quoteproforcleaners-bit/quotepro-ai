import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Zap, Play, Pause, CheckCircle, Clock,
  Users, Mail, Star, Lock, Loader2, RefreshCw,
  Settings, BarChart3, MessageSquare,
} from "lucide-react";
import { Badge, Button, Spinner, StatCard, Avatar } from "../components/ui";
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

interface AutopilotSettings {
  autopilotEnabled: boolean;
  googleReviewLink: string | null;
}

/* ─── Hero card ───────────────────────────────────────────────────────────── */

function AutopilotHeroCard({ enabled, onToggle, loading, stats }: {
  enabled: boolean;
  onToggle: () => void;
  loading: boolean;
  stats?: AutopilotStats;
}) {
  return (
    <div style={{
      background: "linear-gradient(140deg, #007aff 0%, #0062cc 40%, #5856d6 100%)",
      borderRadius: "var(--r16)",
      padding: "20px 22px",
      boxShadow: "0 2px 12px rgba(0,122,255,0.28), 0 1px 3px rgba(0,0,0,0.08)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Decorative circles */}
      {[
        { w: 200, h: 200, top: -60,  right: -40  },
        { w: 130, h: 130, top: "auto" as any, bottom: -50, right: 80 },
        { w: 80,  h: 80,  top: 10,   right: 160  },
      ].map((c, i) => (
        <div key={i} style={{
          position: "absolute",
          width: c.w, height: c.h,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
          top: c.top,
          bottom: (c as any).bottom,
          right: c.right,
          pointerEvents: "none",
        }} />
      ))}

      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
        {/* Left: headline number */}
        <div style={{ flex: 1, minWidth: "140px" }}>
          <p style={{ fontSize: "10px", fontWeight: 600, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 4px" }}>
            Autopilot
          </p>
          <p style={{ fontSize: "38px", fontWeight: 700, color: "white", letterSpacing: "-1.5px", lineHeight: 1, margin: "0 0 4px" }}>
            {stats?.total ?? 0}
          </p>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)", margin: 0 }}>
            leads in pipeline
          </p>
        </div>

        {/* Right: 3 mini stats + hero toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
          {[
            { label: "Follow-ups", value: stats?.emailsSent ?? 0 },
            { label: "Completed",  value: stats?.completed  ?? 0 },
            { label: "Active",     value: stats?.active     ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <p style={{ fontSize: "20px", fontWeight: 700, color: "white", letterSpacing: "-0.5px", margin: "0 0 2px" }}>{value}</p>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.55)", margin: 0 }}>{label}</p>
            </div>
          ))}

          {/* Hero toggle — special white/blue variant */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <button
              onClick={onToggle}
              disabled={loading}
              role="switch"
              aria-checked={enabled}
              style={{
                position: "relative",
                width: "42px", height: "26px",
                borderRadius: "13px",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                background: enabled ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.25)",
                transition: "background .20s cubic-bezier(0.23, 0.93, 0.58, 1.2)",
                flexShrink: 0,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <Loader2 style={{ position: "absolute", top: "5px", left: "11px", width: "16px", height: "16px", color: enabled ? "#007aff" : "white" }} className="animate-spin" />
              ) : (
                <span style={{
                  position: "absolute",
                  top: "3px",
                  left: enabled ? "19px" : "3px",
                  width: "20px", height: "20px",
                  borderRadius: "50%",
                  background: enabled ? "#007aff" : "white",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.22)",
                  transition: "left .20s cubic-bezier(0.23, 0.93, 0.58, 1.2), background .20s",
                }} />
              )}
            </button>
            <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.55)", margin: 0, textTransform: "uppercase", letterSpacing: ".04em" }}>
              {enabled ? "ON" : "OFF"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Locked state ────────────────────────────────────────────────────────── */

function AutopilotLockedState({ isGrowth }: { isGrowth: boolean }) {
  const [loading, setLoading] = useState(false);
  const handleCheckout = async () => {
    setLoading(true);
    try {
      const data = await apiPost<{ url: string }>("/api/autopilot/checkout");
      if (data?.url) window.location.href = data.url;
    } catch { } finally { setLoading(false); }
  };

  return (
    <div style={{
      border: "1.5px dashed rgba(0,0,0,0.10)",
      borderRadius: "var(--r16)",
      background: "rgba(0,0,0,0.015)",
      padding: "56px 24px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: "14px",
    }}>
      <div style={{
        width: "56px", height: "56px",
        borderRadius: "16px",
        background: "rgba(0,122,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Zap style={{ width: "32px", height: "32px", color: "var(--blue)" }} />
      </div>

      <div>
        <h2 style={{ fontSize: "17px", fontWeight: 600, color: "var(--t1)", margin: "0 0 6px" }}>
          QuotePro Autopilot
        </h2>
        <p style={{ fontSize: "14px", color: "var(--t3)", lineHeight: 1.6, maxWidth: "320px", margin: "0 auto" }}>
          A 4-step AI pipeline that qualifies leads, sends quotes, follows up, and requests reviews — automatically.
        </p>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", marginTop: "4px" }}>
        {isGrowth ? (
          <>
            <Button onClick={handleCheckout} disabled={loading} icon={Zap}>
              {loading ? "Loading..." : "Add Autopilot — $29/mo"}
            </Button>
            <Button variant="ghost" onClick={() => window.location.href = "/pricing"}>
              View plans
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => window.location.href = "/pricing"} icon={Zap}>
              Get Pro
            </Button>
            <Button variant="ghost" onClick={handleCheckout} disabled={loading}>
              {loading ? "Loading..." : "Add to Growth $29/mo"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Job row ─────────────────────────────────────────────────────────────── */

const STATUS_MAP: Record<string, string> = {
  active: "active", paused: "warning", completed: "completed", failed: "error",
};

function JobRow({ job, onPause, onResume }: {
  job: AutopilotJob;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}) {
  const STEP_LABELS: Record<number, string> = {
    1: "Qualify & Quote", 2: "Follow-Up", 3: "Welcome", 4: "Review Request",
  };
  const name = job.lead_name || job.lead_email || "Unknown";
  const meta = [
    STEP_LABELS[job.current_step],
    job.log_count > 0 ? `${job.log_count} email${job.log_count !== 1 ? "s" : ""} sent` : null,
    job.next_action_at
      ? `Next: ${new Date(job.next_action_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="list-row-apple" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <Avatar name={name} size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--t1)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </p>
        <p style={{ fontSize: "11px", color: "var(--t4)", margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "240px" }}>
          {meta}
        </p>
      </div>

      <Badge status={STATUS_MAP[job.status] ?? "draft"} />

      <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--t3)", minWidth: "40px", textAlign: "right", flexShrink: 0 }}>
        Step {job.current_step}
      </span>

      {job.status === "active" && (
        <button onClick={() => onPause(job.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: "6px", color: "var(--t4)", flexShrink: 0 }} title="Pause">
          <Pause style={{ width: "14px", height: "14px" }} />
        </button>
      )}
      {job.status === "paused" && (
        <button onClick={() => onResume(job.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", borderRadius: "6px", color: "var(--t4)", flexShrink: 0 }} title="Resume">
          <Play style={{ width: "14px", height: "14px" }} />
        </button>
      )}

      {/* Disclosure chevron */}
      <span style={{ display: "inline-block", width: "6px", height: "6px", borderRight: "1.5px solid var(--t4)", borderTop: "1.5px solid var(--t4)", transform: "rotate(45deg)", opacity: 0.7, flexShrink: 0 }} />
    </div>
  );
}

/* ─── Quick actions grid ──────────────────────────────────────────────────── */

function QuickActions({ navigate }: { navigate: (path: string) => void }) {
  const actions = [
    { icon: Settings,      label: "Configure Pipeline", sub: "Edit steps and timing",    bg: "rgba(88,86,214,0.10)",  ic: "#5856d6",        to: "/settings" },
    { icon: BarChart3,     label: "View Analytics",     sub: "Conversion rates & trends", bg: "rgba(0,122,255,0.10)", ic: "var(--blue)",    to: "/growth" },
    { icon: MessageSquare, label: "Email Templates",    sub: "Customize follow-up copy", bg: "rgba(255,149,0,0.10)", ic: "var(--orange)",  to: "/email-sequences" },
    { icon: Star,          label: "Review Settings",    sub: "Google review link",        bg: "rgba(40,205,65,0.10)", ic: "var(--green)",   to: "/settings" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
      {actions.map(({ icon: Icon, label, sub, bg, ic, to }) => (
        <button
          key={label}
          onClick={() => navigate(to)}
          className="card-apple-clickable"
          style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", border: "none", cursor: "pointer", textAlign: "left", width: "100%", background: "white" }}
        >
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon style={{ width: "18px", height: "18px", color: ic }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--t1)", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
            <p style={{ fontSize: "11px", color: "var(--t3)", margin: 0 }}>{sub}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ─── Main dashboard ──────────────────────────────────────────────────────── */

function AutopilotDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: settings, isLoading: settingsLoading } = useQuery<AutopilotSettings>({
    queryKey: ["/api/autopilot/settings"],
  });
  const { data: jobs = [], isLoading: jobsLoading } = useQuery<AutopilotJob[]>({
    queryKey: ["/api/autopilot/jobs"],
  });
  const { data: stats } = useQuery<AutopilotStats>({
    queryKey: ["/api/autopilot/stats"],
  });

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("POST", "/api/autopilot/settings", { autopilotEnabled: enabled });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/autopilot/settings"] }),
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

  if (jobsLoading || settingsLoading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}><Spinner size="lg" /></div>;
  }

  const isEnabled = settings?.autopilotEnabled ?? false;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Hero card */}
      <AutopilotHeroCard
        enabled={isEnabled}
        onToggle={() => toggleMutation.mutate(!isEnabled)}
        loading={toggleMutation.isPending}
        stats={stats}
      />

      {/* Metrics row — 3 cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
        <StatCard label="Enrolled"    value={stats?.total       ?? 0} icon={Users}       color="primary" />
        <StatCard label="Emails Sent" value={stats?.emailsSent  ?? 0} icon={Mail}        color="amber"   />
        <StatCard label="Completed"   value={stats?.completed   ?? 0} icon={CheckCircle} color="emerald" />
      </div>

      {/* Job list */}
      <div className="card-apple-lg" style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--t1)", margin: 0 }}>Active Pipelines</p>
          <p style={{ fontSize: "11px", color: "var(--t4)", margin: 0 }}>{jobs.length} lead{jobs.length !== 1 ? "s" : ""}</p>
        </div>

        {jobs.length === 0 ? (
          <div style={{ padding: "32px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <Zap style={{ width: "24px", height: "24px", color: "var(--t4)" }} />
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--t1)", margin: 0 }}>
              {isEnabled ? "Waiting for new leads" : "Autopilot is off"}
            </p>
            <p style={{ fontSize: "12px", color: "var(--t3)", margin: 0, textAlign: "center", maxWidth: "260px" }}>
              {isEnabled
                ? "New leads from your intake form will appear here automatically."
                : "Toggle Autopilot ON above to start processing leads."}
            </p>
          </div>
        ) : (
          <div>
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} onPause={pause} onResume={resume} />
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <QuickActions navigate={navigate} />

      {/* Info strip */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: "10px",
        padding: "10px 14px",
        background: "rgba(0,122,255,0.05)",
        border: "0.5px solid rgba(0,122,255,0.14)",
        borderRadius: "var(--r12)",
      }}>
        <Clock style={{ width: "14px", height: "14px", color: "var(--blue)", flexShrink: 0, marginTop: "1px" }} />
        <p style={{ fontSize: "12px", color: "var(--t2)", margin: 0, lineHeight: 1.5 }}>
          Autopilot runs every 15 minutes. When ON, every new lead from your intake form is automatically enrolled — no action needed.
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
  const showUpsell = !isPro && !isGrowth;

  return (
    <div style={{ padding: "16px 18px" }}>
      {/* Page header */}
      <div style={{ marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
          <h1 style={{ fontSize: "17px", fontWeight: 600, color: "var(--t1)", margin: 0 }}>Autopilot</h1>
          {!isPro && !isGrowth && (
            <Badge status="pro" label="Pro" />
          )}
        </div>
        <p style={{ fontSize: "12px", color: "var(--t3)", margin: 0 }}>
          AI-powered lead nurturing — qualify, quote, follow up, and request reviews automatically
        </p>
      </div>

      {showUpsell ? <AutopilotLockedState isGrowth={isGrowth} /> : <AutopilotDashboard />}
    </div>
  );
}
