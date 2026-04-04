import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, Phone, Key, Car, AlertTriangle, Bed, Maximize2, ExternalLink } from "lucide-react";
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

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  assigned:   { label: "Scheduled",   bg: "#F1EFE8", color: "#888780" },
  en_route:   { label: "En Route",    bg: "#FAEEDA", color: "#B57C0A" },
  checked_in: { label: "In Progress", bg: "#E1F5EE", color: "#0F6E56" },
  completed:  { label: "Completed",   bg: "#E1F5EE", color: "#1D9E75" },
  no_show:    { label: "No Show",     bg: "#FCEBEB", color: "#E24B4A" },
};

export default function EmployeeJobDetail() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<EmployeeJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assignmentId) return;
    getJobDetail(assignmentId)
      .then(setJob)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const handleEnRoute = async () => {
    if (!assignmentId) return;
    setActionLoading(true);
    try {
      await setEnRoute(assignmentId);
      const updated = await getJobDetail(assignmentId);
      setJob(updated);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const openMaps = () => {
    if (!job) return;
    const q = encodeURIComponent(job.address);
    window.open(`https://maps.apple.com/?q=${q}`, "_blank");
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.navBar}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}><ArrowLeft size={20} /></button>
        </div>
        <div style={{ padding: 20 }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ height: 100, borderRadius: 16, background: "#E8E6DF", marginBottom: 12, animation: "pulse 1.2s infinite" }} />)}
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div style={styles.page}>
        <div style={styles.navBar}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}><ArrowLeft size={20} /></button>
        </div>
        <div style={{ padding: 24, textAlign: "center" as const }}>
          <p style={{ color: "#E24B4A" }}>{error || "Job not found"}</p>
        </div>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.assigned;
  const isCompleted = job.status === "completed";

  return (
    <div style={styles.page}>
      {/* Nav */}
      <div style={styles.navBar}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}><ArrowLeft size={20} /></button>
        <span style={styles.navTitle}>Job Details</span>
        <span style={{ width: 44 }} />
      </div>

      <div style={styles.body}>
        {/* Hero card */}
        <div style={styles.heroCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <div style={styles.customerName}>{job.customerName}</div>
              <div style={styles.serviceType}>{job.serviceType}</div>
            </div>
            <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 999, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>
              {cfg.label}
            </span>
          </div>

          {/* Time + duration */}
          <div style={styles.infoRow}>
            <Clock size={15} color="#888780" />
            <span style={styles.infoMono}>{formatTime(job.scheduledTime)}</span>
            {job.estimatedDurationMinutes && (
              <span style={{ color: "#888780", fontSize: 13 }}>· Est. {formatDuration(job.estimatedDurationMinutes)}</span>
            )}
          </div>

          {/* Checkin summary if completed */}
          {isCompleted && job.checkinTime && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: "#E1F5EE", borderRadius: 10, fontSize: 13 }}>
              <span style={{ color: "#0F6E56", fontWeight: 600 }}>
                Checked in {formatTime(job.checkinTime)} · Completed {formatTime(job.checkoutTime)} · {formatDuration(job.durationMinutes)}
              </span>
            </div>
          )}
        </div>

        {/* Location + Contact */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>Location & Contact</div>
          <div style={styles.infoItem}>
            <MapPin size={16} color="#0F6E56" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={styles.infoMono}>{job.address}</div>
            </div>
            <button onClick={openMaps} style={styles.mapBtn}>
              <ExternalLink size={14} />
              Map
            </button>
          </div>
          {job.customerPhone && (
            <div style={styles.infoItem}>
              <Phone size={16} color="#0F6E56" style={{ flexShrink: 0 }} />
              <a href={`tel:${job.customerPhone}`} style={{ color: "#0F6E56", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                {job.customerPhone}
              </a>
            </div>
          )}
        </div>

        {/* Access Info — amber tinted, only if data exists */}
        {(job.keyLocation || job.accessCode || job.parkingNotes) && (
          <div style={{ ...styles.card, background: "#FAEEDA", border: "1px solid #F3D595" }}>
            <div style={{ ...styles.cardTitle, color: "#B57C0A" }}>Access Information</div>
            {job.keyLocation && (
              <div style={styles.infoItem}>
                <Key size={16} color="#B57C0A" style={{ flexShrink: 0 }} />
                <div>
                  <div style={styles.infoLabel}>Key Location</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a18" }}>{job.keyLocation}</div>
                </div>
              </div>
            )}
            {job.accessCode && (
              <div style={{ ...styles.infoItem, marginTop: job.keyLocation ? 10 : 0 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>🔢</span>
                <div>
                  <div style={styles.infoLabel}>Access Code</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a18", fontFamily: "'DM Mono', monospace", letterSpacing: 3 }}>{job.accessCode}</div>
                </div>
              </div>
            )}
            {job.parkingNotes && (
              <div style={{ ...styles.infoItem, marginTop: 10 }}>
                <Car size={16} color="#B57C0A" style={{ flexShrink: 0 }} />
                <div>
                  <div style={styles.infoLabel}>Parking</div>
                  <div style={{ fontSize: 14, color: "#444441" }}>{job.parkingNotes}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Special Requests — coral tinted */}
        {job.specialRequests && (
          <div style={{ ...styles.card, background: "#FAECE7", border: "1px solid #F2C4B0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <AlertTriangle size={16} color="#D85A30" />
              <span style={{ ...styles.cardTitle, color: "#D85A30", marginBottom: 0 }}>Special Requests</span>
            </div>
            <p style={{ fontSize: 14, color: "#444441", margin: 0, lineHeight: 1.5 }}>{job.specialRequests}</p>
          </div>
        )}

        {/* Job scope */}
        {(job.roomCount || job.squareFootage || job.serviceType) && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>Job Scope</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
              {job.roomCount && (
                <div style={styles.scopeChip}>
                  <Bed size={14} color="#0F6E56" />
                  <span>{job.roomCount} rooms</span>
                </div>
              )}
              {job.squareFootage && (
                <div style={styles.scopeChip}>
                  <Maximize2 size={14} color="#0F6E56" />
                  <span>{job.squareFootage.toLocaleString()} sq ft</span>
                </div>
              )}
              <div style={styles.scopeChip}>
                <span>{job.serviceType}</span>
              </div>
            </div>
          </div>
        )}

        {/* Internal notes */}
        {job.internalNotes && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>Notes from Manager</div>
            <p style={{ fontSize: 14, color: "#444441", margin: 0, lineHeight: 1.5 }}>{job.internalNotes}</p>
          </div>
        )}

        {/* Spacer for bottom actions */}
        <div style={{ height: 24 }} />
      </div>

      {/* Fixed bottom action */}
      {!isCompleted && (
        <div style={styles.bottomAction}>
          {job.status === "assigned" && (
            <div style={{ display: "flex", gap: 10 }}>
              <button
                style={{ ...styles.actionBtn, background: "#EF9F27", flex: 1 }}
                disabled={actionLoading}
                onClick={handleEnRoute}
              >
                I'm On My Way
              </button>
              <button
                style={{ ...styles.actionBtn, background: "#0F6E56", flex: 1 }}
                onClick={() => navigate(`/employee/jobs/${assignmentId}/checkin`)}
              >
                Check In
              </button>
            </div>
          )}
          {job.status === "en_route" && (
            <button
              style={{ ...styles.actionBtn, background: "#0F6E56", width: "100%", fontSize: 18 }}
              onClick={() => navigate(`/employee/jobs/${assignmentId}/checkin`)}
            >
              Check In
            </button>
          )}
          {job.status === "checked_in" && (
            <button
              style={{ ...styles.actionBtn, background: "#D85A30", width: "100%", fontSize: 18 }}
              onClick={() => navigate(`/employee/jobs/${assignmentId}/checkout`)}
            >
              Check Out
            </button>
          )}
        </div>
      )}

      {isCompleted && (
        <div style={styles.bottomAction}>
          <div style={{ textAlign: "center" as const, padding: "4px 0" }}>
            <div style={{ fontSize: 32 }}>✓</div>
            <div style={{ fontWeight: 700, color: "#1D9E75", fontSize: 16 }}>
              Job complete — {formatDuration(job.durationMinutes)}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100svh", background: "#F8F8F6", fontFamily: "'DM Sans', system-ui, sans-serif", paddingBottom: 100 },
  navBar: {
    position: "sticky" as const, top: 0, zIndex: 10,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "white", padding: "16px 16px", paddingTop: "calc(16px + env(safe-area-inset-top, 0px))",
    borderBottom: "1px solid #F1EFE8",
  },
  backBtn: {
    width: 44, height: 44, border: "none", background: "#F1EFE8",
    borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "#0F6E56",
  },
  navTitle: { fontSize: 17, fontWeight: 700, color: "#1a1a18" },
  body: { padding: "16px" },
  heroCard: {
    background: "white", borderRadius: 18, padding: "18px",
    marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  },
  customerName: { fontSize: 22, fontWeight: 700, color: "#1a1a18" },
  serviceType: { fontSize: 13, color: "#888780", marginTop: 2 },
  infoRow: { display: "flex", alignItems: "center", gap: 6, marginTop: 10 },
  infoMono: { fontSize: 14, fontFamily: "'DM Mono', monospace", color: "#444441" },
  card: { background: "white", borderRadius: 18, padding: "16px", marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  cardTitle: { fontSize: 13, fontWeight: 700, color: "#888780", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 12 },
  infoItem: { display: "flex", alignItems: "flex-start", gap: 10 },
  infoLabel: { fontSize: 11, color: "#888780", fontWeight: 600, marginBottom: 2 },
  mapBtn: {
    display: "flex", alignItems: "center", gap: 4,
    background: "#E1F5EE", color: "#0F6E56", border: "none",
    borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  scopeChip: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "#F1EFE8", color: "#444441",
    borderRadius: 10, padding: "6px 12px", fontSize: 13, fontWeight: 600,
  },
  bottomAction: {
    position: "fixed" as const, bottom: 0, left: "50%", transform: "translateX(-50%)",
    width: "100%", maxWidth: 430,
    background: "white", borderTop: "1px solid #F1EFE8",
    padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
  },
  actionBtn: {
    height: 54, border: "none", borderRadius: 14,
    fontSize: 16, fontWeight: 700, color: "white", cursor: "pointer",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  },
};
