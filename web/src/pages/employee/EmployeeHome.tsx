import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, MapPin, Clock, CheckCircle } from "lucide-react";
import EmployeeLayout from "./EmployeeLayout";
import { getTodayJobs, getStoredEmployee, type EmployeeJob, setEnRoute } from "../../lib/employeeApi";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatTime(dt: string | null): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; dot?: boolean }> = {
  assigned:   { label: "Scheduled",    bg: "#F1EFE8", color: "#888780" },
  en_route:   { label: "En Route",     bg: "#FAEEDA", color: "#B57C0A" },
  checked_in: { label: "In Progress",  bg: "#E1F5EE", color: "#0F6E56", dot: true },
  completed:  { label: "Completed",    bg: "#E1F5EE", color: "#1D9E75" },
  no_show:    { label: "No Show",      bg: "#FCEBEB", color: "#E24B4A" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.assigned;
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
      {cfg.dot && (
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.color, display: "inline-block", animation: "pulse 1.2s infinite" }} />
      )}
      {cfg.label}
    </span>
  );
}

function ActionButton({ job, onAction, loading }: { job: EmployeeJob; onAction: (action: string, id: string) => void; loading: boolean }) {
  const { status, assignmentId } = job;
  if (status === "completed" || status === "no_show") return null;

  if (status === "assigned") {
    return (
      <button
        style={{ ...styles.actionBtn, background: "#0F6E56" }}
        disabled={loading}
        onClick={(e) => { e.stopPropagation(); onAction("en_route", assignmentId); }}
      >
        I'm On My Way
      </button>
    );
  }
  if (status === "en_route") {
    return (
      <button
        style={{ ...styles.actionBtn, background: "#0F6E56" }}
        disabled={loading}
        onClick={(e) => { e.stopPropagation(); onAction("checkin", assignmentId); }}
      >
        Check In
      </button>
    );
  }
  if (status === "checked_in") {
    return (
      <button
        style={{ ...styles.actionBtn, background: "#D85A30" }}
        disabled={loading}
        onClick={(e) => { e.stopPropagation(); onAction("checkout", assignmentId); }}
      >
        Check Out
      </button>
    );
  }
  return null;
}

export default function EmployeeHome() {
  const navigate = useNavigate();
  const employee = getStoredEmployee();
  const [jobs, setJobs] = useState<EmployeeJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getTodayJobs();
      setJobs(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (action: string, assignmentId: string) => {
    if (action === "en_route") {
      setActionLoading(true);
      try {
        await setEnRoute(assignmentId);
        await load();
      } catch (e: any) {
        setActionError(e.message || "Failed to update status. Please try again.");
        setTimeout(() => setActionError(null), 4000);
      } finally {
        setActionLoading(false);
      }
      return;
    }
    navigate(`/employee/jobs/${assignmentId}/${action}`);
  };

  const completed = jobs.filter((j) => j.status === "completed").length;
  const totalEst = jobs.reduce((s, j) => s + (j.estimatedDurationMinutes ?? 60), 0);

  return (
    <EmployeeLayout>
      <div style={styles.page}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ ...styles.avatar, background: employee?.color ?? "#0F6E56" }}>
                {initials(employee?.name ?? "?")}
              </div>
              <div>
                <div style={styles.greetingText}>
                  {greeting()}, {employee?.name?.split(" ")[0] ?? "there"}
                </div>
                <div style={styles.dateText}>
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </div>
              </div>
            </div>
            <Bell size={22} color="rgba(255,255,255,0.75)" strokeWidth={1.8} />
          </div>

          {/* Stat strip */}
          <div style={styles.statStrip}>
            {[
              { label: "Today's Jobs", value: jobs.length, Icon: MapPin },
              { label: "Hours Est.", value: `${Math.floor(totalEst / 60)}h ${totalEst % 60}m`, Icon: Clock },
              { label: "Completed", value: completed, Icon: CheckCircle },
            ].map(({ label, value, Icon }) => (
              <div key={label} style={styles.statCard}>
                <Icon size={16} color="#0F6E56" strokeWidth={2} />
                <span style={styles.statValue}>{value}</span>
                <span style={styles.statLabel}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={styles.body}>
          <h2 style={styles.sectionTitle}>Today's Schedule</h2>

          {actionError && (
            <div style={{ background: "#FCEBEB", border: "1px solid #F2B5B5", borderRadius: 12, padding: "12px 16px", color: "#E24B4A", fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
              {actionError}
            </div>
          )}

          {loading && (
            <div style={styles.loadingWrap}>
              {[1, 2].map((i) => (
                <div key={i} style={styles.skeleton} />
              ))}
            </div>
          )}

          {!loading && error && (
            <div style={styles.emptyCard}>
              <p style={{ color: "#E24B4A", fontWeight: 600 }}>{error}</p>
              <button onClick={load} style={styles.retryBtn}>Try Again</button>
            </div>
          )}

          {!loading && !error && jobs.length === 0 && (
            <div style={styles.emptyCard}>
              <div style={styles.emptyIcon}>✓</div>
              <p style={{ fontWeight: 700, fontSize: 18, color: "#1a1a18", margin: "0 0 4px" }}>All caught up!</p>
              <p style={{ fontSize: 14, color: "#888780", margin: 0 }}>No jobs scheduled for today.</p>
            </div>
          )}

          {jobs.map((job) => (
            <div
              key={job.assignmentId}
              style={styles.jobCard}
              onClick={() => navigate(`/employee/jobs/${job.assignmentId}`)}
            >
              <div style={styles.cardTop}>
                <span style={styles.jobTime}>{formatTime(job.scheduledTime)}</span>
                <StatusBadge status={job.status} />
              </div>
              <div style={styles.customerName}>{job.customerName}</div>
              <div style={styles.addressText}>{job.address}</div>
              <div style={styles.metaRow}>
                {job.estimatedDurationMinutes && (
                  <span style={styles.metaChip}>
                    <Clock size={11} /> {Math.floor(job.estimatedDurationMinutes / 60)}h {job.estimatedDurationMinutes % 60}m
                  </span>
                )}
                {job.roomCount && (
                  <span style={styles.metaChip}>{job.roomCount} rooms</span>
                )}
                <span style={styles.metaChip}>{job.serviceType}</span>
              </div>
              <ActionButton job={job} onAction={handleAction} loading={actionLoading} />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </EmployeeLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100svh", fontFamily: "'DM Sans', system-ui, sans-serif" },
  header: {
    background: "linear-gradient(135deg, #0F6E56, #085041)",
    padding: "52px 20px 20px",
  },
  headerTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  avatar: {
    width: 44, height: 44, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16, fontWeight: 700, color: "white",
    border: "2px solid rgba(255,255,255,0.3)",
    flexShrink: 0,
  },
  greetingText: { fontSize: 17, fontWeight: 700, color: "white" },
  dateText: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  statStrip: { display: "flex", gap: 10, marginTop: 4 },
  statCard: {
    flex: 1, background: "rgba(255,255,255,0.12)", borderRadius: 14,
    padding: "12px 10px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: 700, color: "white" },
  statLabel: { fontSize: 10, color: "rgba(255,255,255,0.7)", textAlign: "center" as const, fontWeight: 500 },
  body: { padding: "20px 16px 8px" },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: "#1a1a18", margin: "0 0 14px" },
  loadingWrap: { display: "flex", flexDirection: "column", gap: 12 },
  skeleton: { height: 130, borderRadius: 18, background: "#E8E6DF", animation: "pulse 1.2s infinite" },
  emptyCard: {
    background: "white", borderRadius: 18, padding: "36px 24px",
    textAlign: "center" as const, boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  emptyIcon: {
    width: 56, height: 56, borderRadius: "50%",
    background: "#E1F5EE", color: "#0F6E56",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 24, fontWeight: 700, marginBottom: 12,
  },
  retryBtn: {
    marginTop: 12, padding: "10px 24px", background: "#0F6E56",
    color: "white", border: "none", borderRadius: 10, fontSize: 14,
    fontWeight: 600, cursor: "pointer",
  },
  jobCard: {
    background: "white", borderRadius: 18, padding: "16px",
    marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    cursor: "pointer", transition: "transform 0.1s",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  jobTime: { fontSize: 13, fontWeight: 600, color: "#888780", fontFamily: "'DM Mono', monospace" },
  customerName: { fontSize: 19, fontWeight: 700, color: "#1a1a18", marginBottom: 4 },
  addressText: { fontSize: 13, color: "#888780", fontFamily: "'DM Mono', monospace", marginBottom: 10 },
  metaRow: { display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 12 },
  metaChip: {
    display: "inline-flex", alignItems: "center", gap: 4,
    background: "#F1EFE8", color: "#444441",
    borderRadius: 999, padding: "3px 9px", fontSize: 12, fontWeight: 500,
  },
  actionBtn: {
    width: "100%", height: 48, border: "none", borderRadius: 13,
    fontSize: 15, fontWeight: 700, color: "white", cursor: "pointer",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  },
};
