import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, Phone, Key, Car, AlertTriangle, Bed, Maximize2, Navigation, CheckCircle2, ChevronRight } from "lucide-react";
import { getJobDetail, setEnRoute, type EmployeeJob } from "../../lib/employeeApi";

function formatTime(dt: string | null): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDuration(mins: number | null): string {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h}h ${m}m`;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  assigned:   { label: "Scheduled",   dot: "#94a3b8", bg: "#f1f5f9", text: "#475569" },
  en_route:   { label: "En Route",    dot: "#f59e0b", bg: "#fffbeb", text: "#92400e" },
  checked_in: { label: "In Progress", dot: "#10b981", bg: "#ecfdf5", text: "#065f46" },
  completed:  { label: "Completed",   dot: "#10b981", bg: "#ecfdf5", text: "#065f46" },
  no_show:    { label: "No Show",     dot: "#ef4444", bg: "#fef2f2", text: "#991b1b" },
};

export default function EmployeeJobDetail() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<EmployeeJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!assignmentId) return;
    getJobDetail(assignmentId)
      .then(setJob)
      .catch((e) => setJob(null))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const handleEnRoute = async () => {
    if (!assignmentId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await setEnRoute(assignmentId);
      const updated = await getJobDetail(assignmentId);
      setJob(updated);
    } catch (e: any) {
      setActionError(e.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const openMaps = () => {
    if (!job) return;
    const q = encodeURIComponent(job.address);
    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua);
    window.open(isIos ? `maps://maps.apple.com/?q=${q}` : `https://maps.google.com/?q=${q}`, "_blank");
  };

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.nav}>
          <button onClick={() => navigate(-1)} style={S.backBtn}><ArrowLeft size={20} /></button>
          <span style={S.navTitle}>Job Details</span>
          <span style={{ width: 44 }} />
        </div>
        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column" as const, gap: 12 }}>
          {[120, 160, 100].map((h, i) => (
            <div key={i} style={{ height: h, borderRadius: 20, background: "linear-gradient(90deg, #f0f0ef 25%, #e8e8e6 50%, #f0f0ef 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
          ))}
        </div>
        <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={S.page}>
        <div style={S.nav}>
          <button onClick={() => navigate(-1)} style={S.backBtn}><ArrowLeft size={20} /></button>
          <span style={S.navTitle}>Job Details</span>
          <span style={{ width: 44 }} />
        </div>
        <div style={{ padding: 40, textAlign: "center" as const }}>
          <p style={{ color: "#94a3b8", fontSize: 16 }}>Job not found</p>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.assigned;
  const isCompleted = job.status === "completed";

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        * { -webkit-tap-highlight-color: transparent; }
        button:active { opacity: 0.85; transform: scale(0.98); }
      `}</style>

      {/* Top nav */}
      <div style={S.nav}>
        <button onClick={() => navigate(-1)} style={S.backBtn}><ArrowLeft size={20} /></button>
        <span style={S.navTitle}>Job Details</span>
        <span style={{ width: 44 }} />
      </div>

      {/* Hero — gradient header */}
      <div style={S.hero}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)", letterSpacing: "0.05em", textTransform: "uppercase" as const, margin: "0 0 6px" }}>
              {job.serviceType || "Cleaning Service"}
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.15 }}>
              {job.customerName}
            </h1>
          </div>
          <span style={{ background: cfg.bg, color: cfg.text, borderRadius: 999, padding: "5px 14px", fontSize: 12, fontWeight: 700, flexShrink: 0, marginLeft: 12, marginTop: 4, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
            {cfg.label}
          </span>
        </div>

        {/* Time row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={S.heroPill}>
            <Clock size={14} color="rgba(255,255,255,0.7)" />
            <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#fff" }}>
              {formatTime(job.scheduledTime)}
            </span>
          </div>
          {job.estimatedDurationMinutes && (
            <div style={S.heroPill}>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                {formatDuration(job.estimatedDurationMinutes)}
              </span>
            </div>
          )}
        </div>

        {/* Completed summary */}
        {isCompleted && job.checkinTime && (
          <div style={{ marginTop: 14, background: "rgba(255,255,255,0.12)", borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={15} color="rgba(255,255,255,0.9)" />
            <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: 600 }}>
              {formatTime(job.checkinTime)} – {formatTime(job.checkoutTime)} · {formatDuration(job.durationMinutes)}
            </span>
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div style={S.body}>

        {/* Action error inline */}
        {actionError && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, padding: "12px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={15} color="#dc2626" />
            <span style={{ fontSize: 14, color: "#dc2626", fontWeight: 500 }}>{actionError}</span>
          </div>
        )}

        {/* Location */}
        <div style={S.card}>
          <p style={S.cardLabel}>Location & Contact</p>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={S.iconWrap}>
              <MapPin size={16} color="#0F6E56" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", margin: 0, lineHeight: 1.4 }}>{job.address}</p>
            </div>
            <button onClick={openMaps} style={S.mapBtn}>
              <Navigation size={13} />
              Maps
            </button>
          </div>
          {job.customerPhone && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
              <div style={S.iconWrap}>
                <Phone size={16} color="#0F6E56" />
              </div>
              <a href={`tel:${job.customerPhone}`} style={{ fontSize: 15, fontWeight: 700, color: "#0F6E56", textDecoration: "none" }}>
                {job.customerPhone}
              </a>
            </div>
          )}
        </div>

        {/* Access info */}
        {(job.keyLocation || job.accessCode || job.parkingNotes) && (
          <div style={{ ...S.card, background: "linear-gradient(135deg, #fffbeb, #fef3c7)", border: "1px solid #fde68a" }}>
            <p style={{ ...S.cardLabel, color: "#92400e" }}>Access Information</p>
            {job.accessCode && (
              <div style={{ marginBottom: job.keyLocation || job.parkingNotes ? 14 : 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#b45309", textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "0 0 4px" }}>Access Code</p>
                <p style={{ fontSize: 30, fontWeight: 800, color: "#1e293b", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.15em", margin: 0 }}>{job.accessCode}</p>
              </div>
            )}
            {job.keyLocation && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: job.parkingNotes ? 12 : 0 }}>
                <Key size={15} color="#b45309" style={{ marginTop: 1, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#b45309", textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "0 0 2px" }}>Key Location</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", margin: 0 }}>{job.keyLocation}</p>
                </div>
              </div>
            )}
            {job.parkingNotes && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <Car size={15} color="#b45309" style={{ marginTop: 1, flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#b45309", textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "0 0 2px" }}>Parking</p>
                  <p style={{ fontSize: 14, color: "#374151", margin: 0, lineHeight: 1.5 }}>{job.parkingNotes}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Special requests */}
        {job.specialRequests && (
          <div style={{ ...S.card, background: "linear-gradient(135deg, #fff7ed, #ffedd5)", border: "1px solid #fed7aa" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <AlertTriangle size={15} color="#c2410c" />
              <p style={{ ...S.cardLabel, color: "#c2410c", margin: 0 }}>Customer Note</p>
            </div>
            <p style={{ fontSize: 14, color: "#431407", lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{job.specialRequests}</p>
          </div>
        )}

        {/* Job scope chips */}
        {(job.roomCount || job.squareFootage || job.serviceType) && (
          <div style={S.card}>
            <p style={S.cardLabel}>Job Scope</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              {job.serviceType && <Chip icon={<span style={{ fontSize: 12 }}>✦</span>} label={job.serviceType} />}
              {job.roomCount && <Chip icon={<Bed size={13} color="#0F6E56" />} label={`${job.roomCount} rooms`} />}
              {job.squareFootage && <Chip icon={<Maximize2 size={13} color="#0F6E56" />} label={`${job.squareFootage.toLocaleString()} sq ft`} />}
            </div>
          </div>
        )}

        {/* Manager notes */}
        {job.internalNotes && (
          <div style={S.card}>
            <p style={S.cardLabel}>Notes from Manager</p>
            <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.65, margin: 0 }}>{job.internalNotes}</p>
          </div>
        )}

        <div style={{ height: 28 }} />
      </div>

      {/* Bottom action bar */}
      {!isCompleted && (
        <div style={S.bottomBar}>
          {job.status === "assigned" && (
            <div style={{ display: "flex", gap: 10 }}>
              <button
                style={{ ...S.actionBtn, background: actionLoading ? "#d97706" : "linear-gradient(135deg, #f59e0b, #d97706)", flex: 1, opacity: actionLoading ? 0.7 : 1 }}
                disabled={actionLoading}
                onClick={handleEnRoute}
              >
                {actionLoading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={S.spinner} />
                    Updating...
                  </span>
                ) : "I'm On My Way"}
              </button>
              <button
                style={{ ...S.actionBtn, background: "linear-gradient(135deg, #059669, #0F6E56)", flex: 1 }}
                onClick={() => navigate(`/employee/jobs/${assignmentId}/checkin`)}
              >
                Check In
              </button>
            </div>
          )}
          {job.status === "en_route" && (
            <button
              style={{ ...S.actionBtn, background: "linear-gradient(135deg, #059669, #0F6E56)", width: "100%" }}
              onClick={() => navigate(`/employee/jobs/${assignmentId}/checkin`)}
            >
              <CheckCircle2 size={18} style={{ marginRight: 8 }} />
              Check In — I'm Here
            </button>
          )}
          {job.status === "checked_in" && (
            <button
              style={{ ...S.actionBtn, background: "linear-gradient(135deg, #dc2626, #b91c1c)", width: "100%" }}
              onClick={() => navigate(`/employee/jobs/${assignmentId}/checkout`)}
            >
              Complete Job — Check Out
            </button>
          )}
        </div>
      )}

      {isCompleted && (
        <div style={S.bottomBar}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <CheckCircle2 size={22} color="#10b981" />
            <span style={{ fontWeight: 700, color: "#065f46", fontSize: 17 }}>
              Completed — {formatDuration(job.durationMinutes)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f0fdf4", color: "#065f46", border: "1px solid #bbf7d0", borderRadius: 10, padding: "6px 12px", fontSize: 13, fontWeight: 600 }}>
      {icon}
      {label}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100svh",
    background: "#f8fafc",
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    paddingBottom: 110,
  },
  nav: {
    position: "sticky" as const,
    top: 0,
    zIndex: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    padding: "14px 16px",
    paddingTop: "calc(14px + env(safe-area-inset-top, 0px))",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  },
  backBtn: {
    width: 40,
    height: 40,
    border: "none",
    background: "#f1f5f9",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#475569",
    transition: "background 0.15s",
  },
  navTitle: { fontSize: 16, fontWeight: 700, color: "#0f172a" },
  hero: {
    background: "linear-gradient(160deg, #0d4f3a 0%, #0F6E56 50%, #1a9070 100%)",
    padding: "24px 20px 28px",
    position: "relative" as const,
    overflow: "hidden" as const,
  },
  heroPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 10,
    padding: "6px 12px",
  },
  body: { padding: "16px 16px 0" },
  card: {
    background: "#ffffff",
    borderRadius: 18,
    padding: "18px",
    marginBottom: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.04)",
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#94a3b8",
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
    margin: "0 0 14px",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  mapBtn: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    background: "#f0fdf4",
    color: "#0F6E56",
    border: "1px solid #bbf7d0",
    borderRadius: 10,
    padding: "7px 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
    fontFamily: "inherit",
  },
  bottomBar: {
    position: "fixed" as const,
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 480,
    background: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderTop: "1px solid rgba(0,0,0,0.07)",
    padding: "12px 16px",
    paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
  },
  actionBtn: {
    height: 54,
    border: "none",
    borderRadius: 15,
    fontSize: 15,
    fontWeight: 700,
    color: "white",
    cursor: "pointer",
    fontFamily: "'Inter', system-ui, sans-serif",
    touchAction: "manipulation",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
    transition: "opacity 0.15s, transform 0.1s",
  },
  spinner: {
    width: 16,
    height: 16,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "white",
    display: "inline-block",
    animation: "spin 0.7s linear infinite",
  },
};
