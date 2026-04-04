import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, MapPin, Clock, CheckCircle, ChevronRight, Navigation } from "lucide-react";
import EmployeeLayout from "./EmployeeLayout";
import {
  getUpcomingJobs,
  getStoredEmployee,
  type EmployeeJob,
  type UpcomingGroup,
  setEnRoute,
} from "../../lib/employeeApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(dt: string | null): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function buildWeekDays(): { dateStr: string; dayAbbr: string; dayNum: number; isToday: boolean }[] {
  const days = [];
  const today = new Date();
  const DAY_ABBRS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({
      dateStr: toLocalDateStr(d),
      dayAbbr: i === 0 ? "Today" : DAY_ABBRS[d.getDay()],
      dayNum: d.getDate(),
      isToday: i === 0,
    });
  }
  return days;
}

function formatSectionDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (toLocalDateStr(d) === toLocalDateStr(today)) return "Today";
  if (toLocalDateStr(d) === toLocalDateStr(tomorrow)) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; accent: string; bg: string; text: string }> = {
  assigned:   { label: "Scheduled",   accent: "#CBD0D8", bg: "#F4F5F7", text: "#5A6170" },
  en_route:   { label: "En Route",    accent: "#F5A623", bg: "#FFF8EC", text: "#9A6300" },
  checked_in: { label: "In Progress", accent: "#0F6E56", bg: "#E6F5F0", text: "#0A5040" },
  completed:  { label: "Completed",   accent: "#22C55E", bg: "#F0FDF4", text: "#166534" },
  no_show:    { label: "No Show",     accent: "#EF4444", bg: "#FEF2F2", text: "#991B1B" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS[status] ?? STATUS.assigned;
  return (
    <span style={{
      background: cfg.bg, color: cfg.text,
      borderRadius: 999, padding: "3px 10px",
      fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
      display: "inline-flex", alignItems: "center", gap: 5,
    }}>
      {status === "checked_in" && (
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: cfg.accent, display: "inline-block",
          animation: "livePulse 1.5s ease-in-out infinite",
        }} />
      )}
      {cfg.label}
    </span>
  );
}

function ActionButton({
  job, onAction, loading, isToday,
}: { job: EmployeeJob; onAction: (action: string, id: string) => void; loading: boolean; isToday: boolean }) {
  if (!isToday) return null;
  const { status, assignmentId } = job;
  if (status === "completed" || status === "no_show") return null;

  const btnConfig =
    status === "assigned"   ? { label: "I'm On My Way", action: "en_route", icon: <Navigation size={15} />, color: "#0F6E56" } :
    status === "en_route"   ? { label: "Check In",      action: "checkin",  icon: <MapPin size={15} />,      color: "#0F6E56" } :
    status === "checked_in" ? { label: "Check Out",     action: "checkout", icon: <CheckCircle size={15} />, color: "#D85A30" } :
    null;

  if (!btnConfig) return null;

  return (
    <button
      disabled={loading}
      onClick={(e) => { e.stopPropagation(); onAction(btnConfig.action, assignmentId); }}
      style={{
        marginTop: 14,
        width: "100%", height: 46,
        background: btnConfig.color,
        border: "none", borderRadius: 12,
        color: "white", fontSize: 14, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        transition: "opacity 0.15s",
      }}
    >
      {btnConfig.icon}
      {btnConfig.label}
    </button>
  );
}

function JobCard({
  job, onAction, actionLoading, isToday, onClick,
}: { job: EmployeeJob; onAction: (a: string, id: string) => void; actionLoading: boolean; isToday: boolean; onClick: () => void }) {
  const cfg = STATUS[job.status] ?? STATUS.assigned;
  const mins = job.estimatedDurationMinutes ?? 0;
  const durLabel = mins > 0 ? `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ""}` : null;

  return (
    <div
      onClick={onClick}
      style={{
        background: "white",
        borderRadius: 18,
        marginBottom: 12,
        boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
        cursor: "pointer",
        overflow: "hidden",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        display: "flex",
      }}
    >
      {/* Left accent strip */}
      <div style={{ width: 5, background: cfg.accent, flexShrink: 0 }} />

      {/* Content */}
      <div style={{ flex: 1, padding: "16px 16px 16px 14px" }}>
        {/* Top row: time + status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#9098A3", letterSpacing: 0.2 }}>
            {formatTime(job.scheduledTime)}
            {job.endDatetime ? ` – ${formatTime(job.endDatetime)}` : ""}
          </span>
          <StatusPill status={job.status} />
        </div>

        {/* Customer name */}
        <div style={{ fontSize: 18, fontWeight: 800, color: "#0D1117", marginBottom: 3, lineHeight: 1.2 }}>
          {job.customerName}
        </div>

        {/* Address */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
          <MapPin size={12} color="#9098A3" strokeWidth={2} />
          <span style={{ fontSize: 13, color: "#9098A3", letterSpacing: 0.1 }}>{job.address}</span>
        </div>

        {/* Chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 2 }}>
          {durLabel && (
            <span style={chip}>
              <Clock size={11} strokeWidth={2} />
              {durLabel}
            </span>
          )}
          {job.roomCount ? <span style={chip}>{job.roomCount} rooms</span> : null}
          <span style={chip}>{job.serviceType}</span>
        </div>

        <ActionButton job={job} onAction={onAction} loading={actionLoading} isToday={isToday} />
      </div>

      {/* Chevron for non-actionable states on future days */}
      {!isToday && (
        <div style={{ display: "flex", alignItems: "center", paddingRight: 12 }}>
          <ChevronRight size={18} color="#CBD0D8" />
        </div>
      )}
    </div>
  );
}

const chip: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4,
  background: "#F4F5F7", color: "#5A6170",
  borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 500,
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EmployeeHome() {
  const navigate = useNavigate();
  const employee = getStoredEmployee();
  const weekDays = buildWeekDays();
  const todayStr = weekDays[0].dateStr;

  const [groups, setGroups] = useState<UpcomingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const stripRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await getUpcomingJobs();
      setGroups(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Scroll selected pill into view
  useEffect(() => {
    const el = stripRef.current?.querySelector(`[data-date="${selectedDate}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedDate]);

  const handleAction = async (action: string, assignmentId: string) => {
    if (action === "en_route") {
      setActionLoading(true);
      try {
        await setEnRoute(assignmentId);
        await load();
      } catch (e: any) {
        setActionError(e.message || "Failed to update status. Try again.");
        setTimeout(() => setActionError(null), 4000);
      } finally {
        setActionLoading(false);
      }
      return;
    }
    navigate(`/employee/jobs/${assignmentId}/${action}`);
  };

  // Data helpers
  const jobCountByDate = (dateStr: string) => groups.find((g) => g.date === dateStr)?.jobs.length ?? 0;
  const selectedJobs = groups.find((g) => g.date === selectedDate)?.jobs ?? [];
  const todayJobs = groups.find((g) => g.date === todayStr)?.jobs ?? [];
  const todayCompleted = todayJobs.filter((j) => j.status === "completed").length;
  const todayMins = todayJobs.reduce((s, j) => s + (j.estimatedDurationMinutes ?? 60), 0);

  return (
    <EmployeeLayout>
      <div style={{ minHeight: "100svh", fontFamily: "'DM Sans', system-ui, sans-serif", background: "#F4F5F7" }}>

        {/* ── Header ── */}
        <div style={{
          background: "linear-gradient(155deg, #083D2D 0%, #0F6E56 55%, #1A8A6C 100%)",
          padding: "52px 20px 0",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Decorative blur orbs */}
          <div style={{
            position: "absolute", top: -40, right: -40,
            width: 180, height: 180, borderRadius: "50%",
            background: "rgba(255,255,255,0.06)", pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: 30, left: -30,
            width: 120, height: 120, borderRadius: "50%",
            background: "rgba(255,255,255,0.04)", pointerEvents: "none",
          }} />

          {/* Greeting row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <div style={{
                width: 46, height: 46, borderRadius: "50%",
                background: employee?.color ?? "#0F6E56",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 800, color: "white",
                border: "2.5px solid rgba(255,255,255,0.35)",
                flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}>
                {initials(employee?.name ?? "?")}
              </div>
              <div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 500, letterSpacing: 0.3, marginBottom: 2 }}>
                  {greeting()}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "white", lineHeight: 1.1 }}>
                  {employee?.name?.split(" ")[0] ?? "there"}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </div>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "9px 11px" }}>
              <Bell size={19} color="rgba(255,255,255,0.8)" strokeWidth={1.8} />
            </div>
          </div>

          {/* Today stats */}
          <div style={{ display: "flex", gap: 10, marginBottom: 24, position: "relative" }}>
            {[
              { label: "Today's Jobs", value: todayJobs.length, Icon: MapPin },
              { label: "Est. Hours",   value: todayMins > 0 ? `${Math.floor(todayMins / 60)}h ${todayMins % 60}m` : "—", Icon: Clock },
              { label: "Completed",   value: todayCompleted, Icon: CheckCircle },
            ].map(({ label, value, Icon }) => (
              <div key={label} style={{
                flex: 1,
                background: "rgba(255,255,255,0.11)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                borderRadius: 16,
                padding: "13px 10px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                border: "1px solid rgba(255,255,255,0.14)",
              }}>
                <Icon size={14} color="rgba(255,255,255,0.55)" strokeWidth={2} />
                <span style={{ fontSize: 22, fontWeight: 800, color: "white", lineHeight: 1 }}>{value}</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", textAlign: "center", fontWeight: 600, letterSpacing: 0.3 }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Week strip */}
          <div
            ref={stripRef}
            style={{
              display: "flex", gap: 6,
              overflowX: "auto", paddingBottom: 20,
              scrollbarWidth: "none", msOverflowStyle: "none",
              position: "relative",
            }}
          >
            {weekDays.map((day) => {
              const isSelected = day.dateStr === selectedDate;
              const count = jobCountByDate(day.dateStr);
              return (
                <button
                  key={day.dateStr}
                  data-date={day.dateStr}
                  onClick={() => setSelectedDate(day.dateStr)}
                  style={{
                    flexShrink: 0,
                    minWidth: 58,
                    background: isSelected ? "white" : "rgba(255,255,255,0.1)",
                    border: isSelected ? "none" : "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 14,
                    padding: "9px 8px 8px",
                    cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    transition: "all 0.18s",
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 0.4,
                    color: isSelected ? "#0F6E56" : "rgba(255,255,255,0.6)",
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                  }}>
                    {day.dayAbbr}
                  </span>
                  <span style={{
                    fontSize: 17, fontWeight: 800, lineHeight: 1.1,
                    color: isSelected ? "#0D1117" : "white",
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                  }}>
                    {day.dayNum}
                  </span>
                  {/* Job dot indicator */}
                  <div style={{
                    width: 5, height: 5, borderRadius: "50%", marginTop: 1,
                    background: count > 0
                      ? (isSelected ? "#0F6E56" : "rgba(255,255,255,0.7)")
                      : "transparent",
                    transition: "background 0.18s",
                  }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "20px 16px 32px" }}>

          {/* Section label */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0D1117", margin: 0 }}>
              {formatSectionDate(selectedDate)}
            </h2>
            {selectedJobs.length > 0 && (
              <span style={{ fontSize: 13, color: "#9098A3", fontWeight: 600 }}>
                {selectedJobs.length} job{selectedJobs.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Action error */}
          {actionError && (
            <div style={{
              background: "#FEF2F2", border: "1px solid #FECACA",
              borderRadius: 12, padding: "12px 16px",
              color: "#991B1B", fontSize: 14, fontWeight: 500,
              marginBottom: 12,
            }}>
              {actionError}
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{
                  height: 130, borderRadius: 18,
                  background: "linear-gradient(90deg, #E8E9EB 25%, #F0F1F3 50%, #E8E9EB 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.4s infinite",
                }} />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{
              background: "white", borderRadius: 18, padding: "32px 24px",
              textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}>
              <p style={{ color: "#EF4444", fontWeight: 600, margin: "0 0 12px" }}>{error}</p>
              <button onClick={load} style={{
                padding: "10px 24px", background: "#0F6E56",
                color: "white", border: "none", borderRadius: 10,
                fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>Try Again</button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && selectedJobs.length === 0 && (
            <div style={{
              background: "white", borderRadius: 20, padding: "40px 24px",
              textAlign: "center", boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
              display: "flex", flexDirection: "column", alignItems: "center",
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: "50%",
                background: "linear-gradient(135deg, #E6F5F0, #CCF0E3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 14,
              }}>
                <CheckCircle size={26} color="#0F6E56" strokeWidth={2} />
              </div>
              <p style={{ fontWeight: 800, fontSize: 17, color: "#0D1117", margin: "0 0 6px" }}>
                {selectedDate === todayStr ? "All caught up!" : "No jobs scheduled"}
              </p>
              <p style={{ fontSize: 14, color: "#9098A3", margin: 0, lineHeight: 1.5 }}>
                {selectedDate === todayStr
                  ? "You have no jobs scheduled for today."
                  : `Nothing planned for ${formatSectionDate(selectedDate)}.`}
              </p>
            </div>
          )}

          {/* Job cards */}
          {!loading && !error && selectedJobs.map((job) => (
            <JobCard
              key={job.assignmentId}
              job={job}
              onAction={handleAction}
              actionLoading={actionLoading}
              isToday={selectedDate === todayStr}
              onClick={() => navigate(`/employee/jobs/${job.assignmentId}`)}
            />
          ))}

          {/* Week-ahead summary if today selected and has future jobs */}
          {!loading && !error && selectedDate === todayStr && (
            (() => {
              const upcoming = weekDays.slice(1).filter((d) => jobCountByDate(d.dateStr) > 0);
              if (upcoming.length === 0) return null;
              return (
                <div style={{ marginTop: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#9098A3", margin: "0 0 10px", letterSpacing: 0.3, textTransform: "uppercase" as const }}>
                    Coming up
                  </h3>
                  {upcoming.map((d) => (
                    <button
                      key={d.dateStr}
                      onClick={() => setSelectedDate(d.dateStr)}
                      style={{
                        width: "100%", background: "white", border: "none",
                        borderRadius: 14, padding: "13px 16px", marginBottom: 8,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        cursor: "pointer", boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
                        touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: "#F4F5F7",
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: "#9098A3", letterSpacing: 0.3 }}>
                            {d.dayAbbr.toUpperCase()}
                          </span>
                          <span style={{ fontSize: 15, fontWeight: 800, color: "#0D1117", lineHeight: 1.1 }}>
                            {d.dayNum}
                          </span>
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 600, color: "#0D1117", fontFamily: "'DM Sans', system-ui" }}>
                          {jobCountByDate(d.dateStr)} job{jobCountByDate(d.dateStr) !== 1 ? "s" : ""} scheduled
                        </span>
                      </div>
                      <ChevronRight size={18} color="#CBD0D8" />
                    </button>
                  ))}
                </div>
              );
            })()
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </EmployeeLayout>
  );
}
