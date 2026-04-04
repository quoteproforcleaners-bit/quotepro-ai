import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, ChevronDown, ChevronRight } from "lucide-react";
import EmployeeLayout from "./EmployeeLayout";
import { getUpcomingJobs, type UpcomingGroup, type EmployeeJob } from "../../lib/employeeApi";

function formatTime(dt: string | null): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase();
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10);
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  assigned:   { label: "Scheduled",   color: "#888780" },
  en_route:   { label: "En Route",    color: "#B57C0A" },
  checked_in: { label: "In Progress", color: "#0F6E56" },
  completed:  { label: "Completed",   color: "#1D9E75" },
  no_show:    { label: "No Show",     color: "#E24B4A" },
};

function CompactJobCard({ job, onClick }: { job: EmployeeJob; onClick: () => void }) {
  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.assigned;
  return (
    <div style={styles.compactCard} onClick={onClick}>
      <div style={styles.compactLeft}>
        <div style={styles.compactTime}>{formatTime(job.scheduledTime)}</div>
        <div style={styles.compactName}>{job.customerName}</div>
        <div style={styles.compactAddress}>{job.address}</div>
      </div>
      <div style={styles.compactRight}>
        <span style={{ color: cfg.color, fontSize: 11, fontWeight: 700 }}>{cfg.label}</span>
        <ChevronRight size={14} color="#C4C2BB" />
      </div>
    </div>
  );
}

function DayGroup({ group, defaultOpen }: { group: UpcomingGroup; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const navigate = useNavigate();

  return (
    <div style={styles.dayGroup}>
      <button style={styles.dayHeader} onClick={() => setOpen(!open)}>
        <div>
          <span style={isToday(group.date) ? styles.todayLabel : styles.dayLabel}>
            {isToday(group.date) ? "TODAY" : formatDate(group.date)}
          </span>
          <span style={styles.dayCount}>{group.jobs.length} job{group.jobs.length !== 1 ? "s" : ""}</span>
        </div>
        {open ? <ChevronDown size={18} color="#888780" /> : <ChevronRight size={18} color="#888780" />}
      </button>

      {open && group.jobs.map((job) => (
        <CompactJobCard
          key={job.assignmentId}
          job={job}
          onClick={() => navigate(`/employee/jobs/${job.assignmentId}`)}
        />
      ))}
    </div>
  );
}

export default function EmployeeSchedule() {
  const [groups, setGroups] = useState<UpcomingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUpcomingJobs()
      .then(setGroups)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <EmployeeLayout>
      <div style={styles.page}>
        <div style={styles.header}>
          <h1 style={styles.heading}>Upcoming Schedule</h1>
          <p style={styles.subtext}>Next 7 days</p>
        </div>

        <div style={styles.body}>
          {loading && (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 80, borderRadius: 14, background: "#E8E6DF", marginBottom: 10, animation: "pulse 1.2s infinite" }} />
              ))}
            </>
          )}

          {!loading && error && (
            <div style={styles.errorCard}>{error}</div>
          )}

          {!loading && !error && groups.length === 0 && (
            <div style={styles.emptyCard}>
              <div style={styles.emptyIcon}>📅</div>
              <p style={{ fontWeight: 700, fontSize: 17, color: "#1a1a18", margin: "0 0 4px" }}>Nothing scheduled</p>
              <p style={{ fontSize: 14, color: "#888780", margin: 0 }}>No jobs in the next 7 days.</p>
            </div>
          )}

          {groups.map((g, i) => (
            <DayGroup key={g.date} group={g} defaultOpen={i === 0} />
          ))}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </EmployeeLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100svh", fontFamily: "'DM Sans', system-ui, sans-serif" },
  header: {
    background: "linear-gradient(135deg, #0F6E56, #085041)",
    padding: "52px 20px 24px",
  },
  heading: { fontSize: 26, fontWeight: 700, color: "white", margin: "0 0 4px" },
  subtext: { fontSize: 14, color: "rgba(255,255,255,0.7)", margin: 0 },
  body: { padding: "16px 16px 8px" },
  dayGroup: { marginBottom: 12 },
  dayHeader: {
    width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "none", border: "none", padding: "10px 0", cursor: "pointer",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    WebkitTapHighlightColor: "transparent",
  },
  todayLabel: { fontSize: 12, fontWeight: 800, color: "#0F6E56", letterSpacing: 1, marginRight: 10 },
  dayLabel: { fontSize: 11, fontWeight: 700, color: "#888780", letterSpacing: 0.5, marginRight: 10 },
  dayCount: { fontSize: 12, color: "#C4C2BB", fontWeight: 500 },
  compactCard: {
    background: "white", borderRadius: 14, padding: "14px 16px", marginBottom: 8,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    boxShadow: "0 1px 8px rgba(0,0,0,0.05)", cursor: "pointer",
    touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
  },
  compactLeft: { flex: 1, minWidth: 0 },
  compactTime: { fontSize: 12, color: "#888780", fontFamily: "'DM Mono', monospace", fontWeight: 500 },
  compactName: { fontSize: 16, fontWeight: 700, color: "#1a1a18", marginTop: 2 },
  compactAddress: { fontSize: 12, color: "#888780", fontFamily: "'DM Mono', monospace", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  compactRight: { display: "flex", alignItems: "center", gap: 6, marginLeft: 8, flexShrink: 0 },
  errorCard: { background: "#FCEBEB", borderRadius: 14, padding: "16px", color: "#E24B4A", fontWeight: 500 },
  emptyCard: {
    background: "white", borderRadius: 18, padding: "36px 24px",
    textAlign: "center" as const, boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
};
