import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Camera } from "lucide-react";
import { getJobDetail, checkOut, type EmployeeJob } from "../../lib/employeeApi";

function formatDuration(mins: number | null): string {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} minutes`;
  return m === 0 ? `${h} hour${h > 1 ? "s" : ""}` : `${h}h ${m}m`;
}

function formatTime(dt: string | null): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export default function EmployeeCheckout() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<EmployeeJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!assignmentId) return;
    getJobDetail(assignmentId)
      .then((j) => {
        setJob(j);
        if (j.checkinTime) {
          const mins = Math.round((Date.now() - new Date(j.checkinTime).getTime()) / 60000);
          setDurationMinutes(mins);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  // Live duration tick
  useEffect(() => {
    if (!job?.checkinTime) return;
    const interval = setInterval(() => {
      const mins = Math.round((Date.now() - new Date(job.checkinTime!).getTime()) / 60000);
      setDurationMinutes(mins);
    }, 30000);
    return () => clearInterval(interval);
  }, [job?.checkinTime]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoPreview(URL.createObjectURL(f));
  };

  const handleCheckout = async () => {
    if (!assignmentId) return;
    setSubmitting(true);
    setError(null);

    let lat: number | undefined;
    let lng: number | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch { /* proceed without */ }

    try {
      await checkOut(assignmentId, {
        lat,
        lng,
        employeeNotes: notes.trim() || undefined,
      });
      // Compute final duration
      if (job?.checkinTime) {
        setDurationMinutes(Math.round((Date.now() - new Date(job.checkinTime).getTime()) / 60000));
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Check-out failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={styles.page}><div style={{ padding: 80, textAlign: "center" as const, color: "#888780" }}>Loading...</div></div>;

  if (success) {
    return (
      <div style={styles.successPage}>
        <div style={styles.checkCircle}>✓</div>
        <h2 style={styles.successTitle}>Job Complete!</h2>
        <p style={styles.successSub}>You cleaned for</p>
        <div style={styles.durationBig}>{formatDuration(durationMinutes)}</div>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, marginBottom: 32 }}>
          See you at the next one!
        </p>
        <button
          style={styles.backToScheduleBtn}
          onClick={() => navigate("/employee/home", { replace: true })}
        >
          Back to Schedule
        </button>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
          @keyframes popin { from{transform:scale(0);opacity:0} to{transform:scale(1);opacity:1} }
        `}</style>
      </div>
    );
  }

  const nowStr = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  return (
    <div style={styles.page}>
      <div style={styles.navBar}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}><ArrowLeft size={20} /></button>
        <span style={styles.navTitle}>Check Out</span>
        <span style={{ width: 44 }} />
      </div>

      <div style={styles.body}>
        {/* Summary card */}
        <div style={styles.summaryCard}>
          <div style={styles.bigName}>{job?.customerName}</div>
          <div style={{ display: "flex", gap: 24, marginTop: 14 }}>
            <div>
              <div style={styles.summaryLabel}>Started</div>
              <div style={styles.summaryVal}>{formatTime(job?.checkinTime ?? null)}</div>
            </div>
            <div>
              <div style={styles.summaryLabel}>Now</div>
              <div style={styles.summaryVal}>{nowStr}</div>
            </div>
            <div>
              <div style={styles.summaryLabel}>Duration</div>
              <div style={{ ...styles.summaryVal, color: "#0F6E56" }}>{formatDuration(durationMinutes)}</div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div style={styles.card}>
          <div style={styles.sectionLabel}>How did the job go?</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes for your manager... (optional)"
            maxLength={1000}
            style={styles.textarea}
          />
          <div style={{ fontSize: 12, color: "#888780", textAlign: "right" as const, marginTop: 4 }}>
            {notes.length}/1000
          </div>
        </div>

        {/* Photo */}
        <div style={styles.card}>
          <div style={styles.sectionLabel}>Completion Photo (optional)</div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handlePhotoChange}
          />
          {photoPreview ? (
            <div style={{ position: "relative" as const }}>
              <img src={photoPreview} alt="Completion" style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 12 }} />
              <button
                onClick={() => setPhotoPreview(null)}
                style={{ position: "absolute" as const, top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 16 }}
              >
                ×
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} style={styles.photoBtn}>
              <Camera size={20} color="#D85A30" />
              <span style={{ color: "#D85A30" }}>Take Completion Photo</span>
            </button>
          )}
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}
      </div>

      <div style={styles.bottomAction}>
        <button
          style={{ ...styles.confirmBtn, opacity: submitting ? 0.7 : 1 }}
          onClick={handleCheckout}
          disabled={submitting}
        >
          {submitting ? "Checking out..." : "Confirm Check Out"}
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100svh", background: "#F8F8F6", fontFamily: "'DM Sans', system-ui, sans-serif", paddingBottom: 100 },
  successPage: {
    minHeight: "100svh", background: "linear-gradient(135deg, #1D9E75, #0F6E56)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    fontFamily: "'DM Sans', system-ui, sans-serif", padding: 32,
  },
  checkCircle: {
    width: 100, height: 100, borderRadius: "50%",
    background: "rgba(255,255,255,0.2)", border: "3px solid white",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 52, color: "white", marginBottom: 24,
    animation: "popin 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards",
  },
  successTitle: { fontSize: 34, fontWeight: 700, color: "white", margin: "0 0 6px" },
  successSub: { color: "rgba(255,255,255,0.8)", fontSize: 16, margin: "0 0 4px" },
  durationBig: { fontSize: 42, fontWeight: 700, color: "white", marginBottom: 8 },
  backToScheduleBtn: {
    background: "white", color: "#0F6E56", border: "none", borderRadius: 14,
    padding: "14px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  navBar: {
    position: "sticky" as const, top: 0, zIndex: 10,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "white", padding: "16px", paddingTop: "calc(16px + env(safe-area-inset-top, 0px))",
    borderBottom: "1px solid #F1EFE8",
  },
  backBtn: {
    width: 44, height: 44, border: "none", background: "#FAECE7",
    borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "#D85A30",
  },
  navTitle: { fontSize: 17, fontWeight: 700, color: "#1a1a18" },
  body: { padding: 16 },
  summaryCard: { background: "white", borderRadius: 18, padding: 18, marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  bigName: { fontSize: 20, fontWeight: 700, color: "#1a1a18" },
  summaryLabel: { fontSize: 11, color: "#888780", fontWeight: 600, textTransform: "uppercase" as const, marginBottom: 2 },
  summaryVal: { fontSize: 18, fontWeight: 700, color: "#1a1a18", fontFamily: "'DM Mono', monospace" },
  card: { background: "white", borderRadius: 18, padding: 18, marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  sectionLabel: { fontSize: 13, fontWeight: 700, color: "#888780", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 12 },
  textarea: {
    width: "100%", minHeight: 120, border: "1.5px solid #E8E6DF", borderRadius: 12,
    padding: "12px 14px", fontSize: 15, fontFamily: "'DM Sans', system-ui, sans-serif",
    resize: "vertical" as const, outline: "none", background: "#F8F8F6", color: "#1a1a18",
    boxSizing: "border-box" as const,
  },
  photoBtn: {
    width: "100%", height: 52, border: "2px dashed #F2C4B0", borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    background: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  errorBox: {
    background: "#FCEBEB", border: "1px solid #F2B5B5", borderRadius: 12,
    padding: "12px 16px", color: "#E24B4A", fontSize: 14, marginBottom: 12,
  },
  bottomAction: {
    position: "fixed" as const, bottom: 0, left: "50%", transform: "translateX(-50%)",
    width: "100%", maxWidth: 430,
    background: "white", borderTop: "1px solid #F1EFE8",
    padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
  },
  confirmBtn: {
    width: "100%", height: 56, background: "#D85A30",
    border: "none", borderRadius: 14, fontSize: 17, fontWeight: 700,
    color: "white", cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
    touchAction: "manipulation",
  },
};
