import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Camera } from "lucide-react";
import { getJobDetail, checkIn, type EmployeeJob } from "../../lib/employeeApi";

export default function EmployeeCheckin() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<EmployeeJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [checkmark, setCheckmark] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!assignmentId) return;
    getJobDetail(assignmentId)
      .then(setJob)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    const url = URL.createObjectURL(f);
    setPhotoPreview(url);
  };

  const handleCheckin = async () => {
    if (!assignmentId) return;
    setSubmitting(true);
    setError(null);

    let lat: number | undefined;
    let lng: number | undefined;

    // Try to get geolocation — non-blocking
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      // Proceed without location
    }

    try {
      await checkIn(assignmentId, { lat, lng });
      setSuccess(true);
      setCheckmark(true);
      setTimeout(() => {
        navigate(`/employee/jobs/${assignmentId}`, { replace: true });
      }, 2200);
    } catch (err: any) {
      setError(err.message || "Check-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={{ padding: "80px 24px", textAlign: "center" as const, color: "#888780" }}>Loading...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={styles.successPage}>
        <div style={{ ...styles.checkCircle, animation: checkmark ? "popin 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards" : "none" }}>
          ✓
        </div>
        <h2 style={styles.successTitle}>Checked In!</h2>
        <p style={styles.successSub}>
          You're now checked in at<br />
          <strong>{job?.customerName}</strong>
        </p>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
          {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
        </p>
        <style>{`
          @keyframes popin { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Nav */}
      <div style={styles.navBar}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}><ArrowLeft size={20} /></button>
        <span style={styles.navTitle}>Check In</span>
        <span style={{ width: 44 }} />
      </div>

      <div style={styles.body}>
        {/* Job summary */}
        <div style={styles.card}>
          <div style={styles.bigName}>{job?.customerName}</div>
          <div style={styles.address}>{job?.address}</div>
          <div style={{ fontSize: 15, color: "#888780", marginTop: 4 }}>
            {job?.scheduledTime
              ? new Date(job.scheduledTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
              : ""}
          </div>
        </div>

        <div style={styles.nowCard}>
          <span style={styles.nowLabel}>Checking in at</span>
          <span style={styles.nowTime}>
            {new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
          </span>
        </div>

        {/* Optional photo */}
        <div style={styles.card}>
          <div style={styles.sectionLabel}>Arrival Photo (optional)</div>
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
              <img src={photoPreview} alt="Arrival" style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 12 }} />
              <button
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                style={{ position: "absolute" as const, top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 16 }}
              >
                ×
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} style={styles.photoBtn}>
              <Camera size={20} color="#0F6E56" />
              <span>Take Arrival Photo</span>
            </button>
          )}
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}
      </div>

      {/* Bottom CTA */}
      <div style={styles.bottomAction}>
        <button
          style={{ ...styles.confirmBtn, opacity: submitting ? 0.7 : 1 }}
          onClick={handleCheckin}
          disabled={submitting}
        >
          {submitting ? "Checking in..." : "Confirm Check In"}
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
    minHeight: "100svh", background: "linear-gradient(135deg, #0F6E56, #085041)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    fontFamily: "'DM Sans', system-ui, sans-serif", padding: 24,
  },
  checkCircle: {
    width: 100, height: 100, borderRadius: "50%",
    background: "rgba(255,255,255,0.2)", border: "3px solid white",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 48, color: "white", marginBottom: 24,
  },
  successTitle: { fontSize: 32, fontWeight: 700, color: "white", margin: "0 0 8px" },
  successSub: { fontSize: 18, color: "rgba(255,255,255,0.85)", textAlign: "center" as const, lineHeight: 1.4, margin: "0 0 8px" },
  navBar: {
    position: "sticky" as const, top: 0, zIndex: 10,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "white", padding: "16px", paddingTop: "calc(16px + env(safe-area-inset-top, 0px))",
    borderBottom: "1px solid #F1EFE8",
  },
  backBtn: {
    width: 44, height: 44, border: "none", background: "#F1EFE8",
    borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "#0F6E56",
  },
  navTitle: { fontSize: 17, fontWeight: 700, color: "#1a1a18" },
  body: { padding: 16 },
  card: { background: "white", borderRadius: 18, padding: 18, marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  bigName: { fontSize: 22, fontWeight: 700, color: "#1a1a18" },
  address: { fontSize: 14, color: "#888780", fontFamily: "'DM Mono', monospace", marginTop: 4 },
  nowCard: {
    background: "#E1F5EE", borderRadius: 18, padding: "16px 20px", marginBottom: 12,
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  nowLabel: { fontSize: 14, color: "#0F6E56", fontWeight: 600 },
  nowTime: { fontSize: 22, fontWeight: 700, color: "#0F6E56", fontFamily: "'DM Mono', monospace" },
  sectionLabel: { fontSize: 13, fontWeight: 700, color: "#888780", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 12 },
  photoBtn: {
    width: "100%", height: 52, border: "2px dashed #C4C2BB", borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    background: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#0F6E56",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  errorBox: {
    background: "#FCEBEB", border: "1px solid #F2B5B5", borderRadius: 12,
    padding: "12px 16px", color: "#E24B4A", fontSize: 14, fontWeight: 500, marginBottom: 12,
  },
  bottomAction: {
    position: "fixed" as const, bottom: 0, left: "50%", transform: "translateX(-50%)",
    width: "100%", maxWidth: 430,
    background: "white", borderTop: "1px solid #F1EFE8",
    padding: "12px 16px", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
  },
  confirmBtn: {
    width: "100%", height: 56, background: "#0F6E56",
    border: "none", borderRadius: 14, fontSize: 17, fontWeight: 700,
    color: "white", cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
    touchAction: "manipulation",
  },
};
