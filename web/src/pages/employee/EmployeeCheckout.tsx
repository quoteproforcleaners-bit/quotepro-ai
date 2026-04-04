import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Camera, X, CheckCircle2 } from "lucide-react";
import { getJobDetail, checkOut, type EmployeeJob } from "../../lib/employeeApi";
import InAppCamera from "../../components/InAppCamera";

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
  const [showCamera, setShowCamera] = useState(false);

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

  useEffect(() => {
    if (!job?.checkinTime) return;
    const interval = setInterval(() => {
      const mins = Math.round((Date.now() - new Date(job.checkinTime!).getTime()) / 60000);
      setDurationMinutes(mins);
    }, 30000);
    return () => clearInterval(interval);
  }, [job?.checkinTime]);

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
    } catch { /* proceed without location */ }

    try {
      await checkOut(assignmentId, { lat, lng, employeeNotes: notes.trim() || undefined });
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

  if (loading) {
    return (
      <div style={S.page}>
        <div style={{ padding: "80px 24px", textAlign: "center" as const, color: "#94a3b8" }}>Loading...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={S.successPage}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@600&display=swap');
          @keyframes popin{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
          @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        `}</style>
        <div style={S.successRing}>
          <CheckCircle2 size={52} color="#fff" strokeWidth={2} />
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#fff", margin: "24px 0 6px", animation: "fadeUp 0.4s 0.3s both" }}>
          Job Complete!
        </h2>
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 16, margin: "0 0 6px", animation: "fadeUp 0.4s 0.45s both" }}>
          You cleaned for
        </p>
        <div style={{ fontSize: 44, fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8, animation: "fadeUp 0.4s 0.55s both" }}>
          {formatDuration(durationMinutes)}
        </div>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 15, marginBottom: 40, animation: "fadeUp 0.4s 0.65s both" }}>
          Great work!
        </p>
        <button
          style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 15, padding: "14px 36px", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", animation: "fadeUp 0.4s 0.75s both" }}
          onClick={() => navigate("/employee/home", { replace: true })}
        >
          Back to Schedule
        </button>
      </div>
    );
  }

  const nowStr = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        button:active { opacity: 0.82; transform: scale(0.98); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* In-app camera overlay */}
      {showCamera && (
        <InAppCamera
          onCapture={(dataUrl) => {
            setPhotoPreview(dataUrl);
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Nav */}
      <div style={S.nav}>
        <button onClick={() => navigate(-1)} style={S.backBtn}><ArrowLeft size={20} /></button>
        <span style={S.navTitle}>Check Out</span>
        <span style={{ width: 40 }} />
      </div>

      {/* Duration banner */}
      <div style={S.timeBanner}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "0 0 4px" }}>
              {job?.customerName}
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", margin: 0 }}>
              Started {formatTime(job?.checkinTime ?? null)}
            </p>
          </div>
          <div style={{ textAlign: "right" as const }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "0 0 2px" }}>Duration</p>
            <p style={{ fontSize: 36, fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace", margin: 0, lineHeight: 1 }}>
              {formatDuration(durationMinutes)}
            </p>
          </div>
        </div>
      </div>

      <div style={S.body}>
        {/* Notes */}
        <div style={S.card}>
          <p style={S.cardLabel}>How did the job go?</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes for your manager... (optional)"
            maxLength={1000}
            style={S.textarea}
          />
          <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "right" as const, marginTop: 4 }}>
            {notes.length}/1000
          </div>
        </div>

        {/* Photo */}
        <div style={S.card}>
          <p style={S.cardLabel}>
            Completion Photo <span style={{ color: "#cbd5e1", fontWeight: 400 }}>(optional)</span>
          </p>
          {photoPreview ? (
            <div style={{ position: "relative" as const, borderRadius: 14, overflow: "hidden" as const }}>
              <img
                src={photoPreview}
                alt="Completion"
                style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }}
              />
              <button
                onClick={() => setPhotoPreview(null)}
                style={{ position: "absolute" as const, top: 10, right: 10, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowCamera(true)} style={S.photoBtn}>
              <div style={S.photoBtnIcon}>
                <Camera size={22} color="#dc2626" />
              </div>
              <div style={{ textAlign: "left" as const }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>Take Completion Photo</p>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0" }}>Photo or choose from library</p>
              </div>
            </button>
          )}
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, padding: "14px 16px", fontSize: 14, color: "#dc2626", fontWeight: 500 }}>
            {error}
          </div>
        )}

        <div style={{ height: 24 }} />
      </div>

      {/* Bottom CTA */}
      <div style={S.bottomBar}>
        <button
          style={{ ...S.confirmBtn, opacity: submitting ? 0.75 : 1 }}
          onClick={handleCheckout}
          disabled={submitting}
        >
          {submitting ? (
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={S.spinner} />
              Checking out...
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={20} strokeWidth={2.5} />
              Confirm Check Out
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100svh", background: "#f8fafc", fontFamily: "'Inter', system-ui, -apple-system, sans-serif", paddingBottom: 100 },
  successPage: {
    minHeight: "100svh",
    background: "linear-gradient(160deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    fontFamily: "'Inter', system-ui, sans-serif", padding: 32,
  },
  successRing: {
    width: 110, height: 110, borderRadius: "50%",
    background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center",
    animation: "popin 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards",
  },
  nav: {
    position: "sticky" as const, top: 0, zIndex: 20,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    padding: "14px 16px", paddingTop: "calc(14px + env(safe-area-inset-top, 0px))",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  },
  backBtn: {
    width: 40, height: 40, border: "none", background: "#f1f5f9",
    borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "#475569",
  },
  navTitle: { fontSize: 16, fontWeight: 700, color: "#0f172a" },
  timeBanner: {
    background: "linear-gradient(160deg, #1e1b4b 0%, #312e81 100%)",
    borderRadius: "0 0 24px 24px",
    padding: "24px 20px 28px",
    marginBottom: 16,
  },
  body: { padding: "0 16px 0" },
  card: {
    background: "#fff", borderRadius: 18, padding: 18, marginBottom: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.04)",
  },
  cardLabel: {
    fontSize: 11, fontWeight: 700, color: "#94a3b8",
    textTransform: "uppercase" as const, letterSpacing: "0.07em", margin: "0 0 12px",
  },
  textarea: {
    width: "100%", minHeight: 120, border: "1.5px solid #e2e8f0", borderRadius: 12,
    padding: "12px 14px", fontSize: 15, fontFamily: "'Inter', system-ui, sans-serif",
    resize: "vertical" as const, outline: "none", background: "#f8fafc", color: "#0f172a",
    boxSizing: "border-box" as const, lineHeight: 1.5,
  },
  photoBtn: {
    width: "100%", border: "2px dashed #e2e8f0", borderRadius: 14,
    background: "none", cursor: "pointer", padding: "14px",
    display: "flex", alignItems: "center", gap: 14,
    fontFamily: "inherit",
  },
  photoBtnIcon: {
    width: 46, height: 46, borderRadius: 12, background: "#fef2f2",
    border: "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  bottomBar: {
    position: "fixed" as const, bottom: 0, left: "50%", transform: "translateX(-50%)",
    width: "100%", maxWidth: 480,
    background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    borderTop: "1px solid rgba(0,0,0,0.07)",
    padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
  },
  confirmBtn: {
    width: "100%", height: 56,
    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    border: "none", borderRadius: 16, fontSize: 16, fontWeight: 700,
    color: "white", cursor: "pointer", fontFamily: "inherit",
    touchAction: "manipulation", display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 14px rgba(109,40,217,0.3)",
    transition: "opacity 0.15s",
  },
  spinner: {
    width: 18, height: 18, borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white",
    display: "inline-block", animation: "spin 0.7s linear infinite",
  },
};
