import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Camera, MapPin, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { getJobDetail, checkIn, type EmployeeJob } from "../../lib/employeeApi";

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function metersToFeet(m: number): number { return Math.round(m * 3.28084); }

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { "User-Agent": "QuoteProAI-EmployeeApp/1.0" }, signal: AbortSignal.timeout(6000) });
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch { return null; }
}

const PROXIMITY_THRESHOLD_M = 152;

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [now, setNow] = useState(new Date());
  const [proximityWarning, setProximityWarning] = useState<{
    visible: boolean; distanceFt: number; userLat: number; userLng: number;
  } | null>(null);

  useEffect(() => {
    if (!assignmentId) return;
    getJobDetail(assignmentId)
      .then(setJob)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assignmentId]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const doCheckin = async (opts: { lat?: number; lng?: number; proximityWarning?: boolean; distanceFt?: number }) => {
    if (!assignmentId) return;
    setSubmitting(true);
    setError(null);
    try {
      await checkIn(assignmentId, opts);
      setSuccess(true);
      setTimeout(() => navigate(`/employee/jobs/${assignmentId}`, { replace: true }), 2400);
    } catch (err: any) {
      setError(err.message || "Check-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckin = async () => {
    if (!assignmentId || !job) return;
    setSubmitting(true);
    setError(null);
    let lat: number | undefined, lng: number | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      setSubmitting(false);
      doCheckin({});
      return;
    }
    const jobCoords = await geocodeAddress(job.address);
    if (jobCoords && lat !== undefined && lng !== undefined) {
      const distM = haversineMeters(lat, lng, jobCoords.lat, jobCoords.lon);
      if (distM > PROXIMITY_THRESHOLD_M) {
        setSubmitting(false);
        setProximityWarning({ visible: true, distanceFt: metersToFeet(distM), userLat: lat, userLng: lng });
        return;
      }
    }
    setSubmitting(false);
    doCheckin({ lat, lng });
  };

  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.nav}>
          <button onClick={() => navigate(-1)} style={S.backBtn}><ArrowLeft size={20} /></button>
          <span style={S.navTitle}>Check In</span>
          <span style={{ width: 40 }} />
        </div>
        <div style={{ padding: 40, textAlign: "center" as const, color: "#94a3b8" }}>Loading job details...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={S.successPage}>
        <style>{`@keyframes popin{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={S.successRing}>
          <div style={S.successInner}>
            <CheckCircle2 size={48} color="#fff" strokeWidth={2.5} />
          </div>
        </div>
        <h2 style={{ fontSize: 30, fontWeight: 800, color: "#fff", margin: "24px 0 8px", animation: "fadeUp 0.4s 0.3s both" }}>Checked In!</h2>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.8)", textAlign: "center" as const, lineHeight: 1.5, margin: "0 0 8px", animation: "fadeUp 0.4s 0.45s both" }}>
          You're now at<br /><strong style={{ color: "#fff" }}>{job?.customerName}</strong>
        </p>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 15, fontWeight: 600, animation: "fadeUp 0.4s 0.6s both" }}>{timeStr}</p>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        button:active { opacity: 0.82; transform: scale(0.98); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={S.nav}>
        <button onClick={() => navigate(-1)} style={S.backBtn}><ArrowLeft size={20} /></button>
        <span style={S.navTitle}>Check In</span>
        <span style={{ width: 40 }} />
      </div>

      <div style={S.body}>
        {/* Time spotlight */}
        <div style={S.timeBanner}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.55)", textTransform: "uppercase" as const, letterSpacing: "0.08em", margin: "0 0 6px" }}>Checking in at</p>
          <p style={{ fontSize: 44, fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace", margin: 0, lineHeight: 1 }}>{timeStr}</p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: "8px 0 0", display: "flex", alignItems: "center", gap: 5 }}>
            <MapPin size={12} color="rgba(255,255,255,0.5)" />
            Your location will be recorded
          </p>
        </div>

        {/* Job card */}
        {job && (
          <div style={S.card}>
            <p style={S.cardLabel}>Job</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>{job.customerName}</p>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 }}>{job.address}</p>
            {job.scheduledTime && (
              <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>
                Scheduled {new Date(job.scheduledTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
              </p>
            )}
          </div>
        )}

        {/* Photo section */}
        <div style={S.card}>
          <p style={S.cardLabel}>Arrival Photo <span style={{ color: "#cbd5e1", fontWeight: 400 }}>(optional)</span></p>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoChange} />
          {photoPreview ? (
            <div style={{ position: "relative" as const, borderRadius: 14, overflow: "hidden" as const }}>
              <img src={photoPreview} alt="Arrival" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
              <button
                onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                style={{ position: "absolute" as const, top: 10, right: 10, background: "rgba(0,0,0,0.65)", color: "white", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} style={S.photoBtn}>
              <div style={S.photoBtnIcon}><Camera size={22} color="#0F6E56" /></div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>Take Arrival Photo</p>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0" }}>Documents your arrival time & condition</p>
              </div>
            </button>
          )}
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 10 }}>
            <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 14, color: "#dc2626", margin: 0, fontWeight: 500 }}>{error}</p>
          </div>
        )}

        <div style={{ height: 24 }} />
      </div>

      {/* CTA */}
      <div style={S.bottomBar}>
        <button
          style={{ ...S.confirmBtn, opacity: submitting ? 0.75 : 1 }}
          onClick={handleCheckin}
          disabled={submitting}
        >
          {submitting ? (
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={S.spinner} />
              Verifying location...
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={20} strokeWidth={2.5} />
              Confirm Check In
            </span>
          )}
        </button>
      </div>

      {/* Proximity warning sheet */}
      {proximityWarning?.visible && (
        <div style={S.overlay} onClick={() => setProximityWarning(null)}>
          <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={S.sheetHandle} />
            <div style={{ width: 56, height: 56, borderRadius: 16, background: "#fffbeb", border: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
              <AlertTriangle size={26} color="#d97706" />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 10px" }}>Away from job site</h3>
            <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.6, margin: "0 0 24px" }}>
              You appear to be <strong style={{ color: "#0f172a" }}>{proximityWarning.distanceFt.toLocaleString()} ft</strong> from the job address. Your manager will be notified if you continue.
            </p>
            <button
              style={{ width: "100%", height: 54, background: "linear-gradient(135deg, #d97706, #b45309)", border: "none", borderRadius: 15, fontSize: 15, fontWeight: 700, color: "white", cursor: "pointer", fontFamily: "inherit", marginBottom: 10 }}
              onClick={() => {
                const { userLat, userLng, distanceFt } = proximityWarning!;
                setProximityWarning(null);
                doCheckin({ lat: userLat, lng: userLng, proximityWarning: true, distanceFt });
              }}
            >
              Check In Anyway
            </button>
            <button
              style={{ width: "100%", height: 50, background: "#f1f5f9", border: "none", borderRadius: 15, fontSize: 15, fontWeight: 600, color: "#475569", cursor: "pointer", fontFamily: "inherit" }}
              onClick={() => setProximityWarning(null)}
            >
              Go Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100svh", background: "#f8fafc", fontFamily: "'Inter', system-ui, -apple-system, sans-serif", paddingBottom: 100 },
  successPage: {
    minHeight: "100svh",
    background: "linear-gradient(160deg, #0d4f3a 0%, #0F6E56 60%, #1a9070 100%)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    fontFamily: "'Inter', system-ui, sans-serif", padding: 32,
  },
  successRing: {
    width: 110, height: 110, borderRadius: "50%",
    background: "rgba(255,255,255,0.12)", border: "2px solid rgba(255,255,255,0.25)",
    display: "flex", alignItems: "center", justifyContent: "center",
    animation: "popin 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards",
  },
  successInner: {
    width: 80, height: 80, borderRadius: "50%",
    background: "rgba(255,255,255,0.18)",
    display: "flex", alignItems: "center", justifyContent: "center",
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
  body: { padding: "0 16px 0" },
  timeBanner: {
    background: "linear-gradient(160deg, #0d4f3a 0%, #0F6E56 100%)",
    borderRadius: "0 0 24px 24px",
    padding: "28px 24px 32px",
    marginBottom: 16,
    marginLeft: -16,
    marginRight: -16,
  },
  card: {
    background: "#fff", borderRadius: 18, padding: 18, marginBottom: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)",
    border: "1px solid rgba(0,0,0,0.04)",
  },
  cardLabel: {
    fontSize: 11, fontWeight: 700, color: "#94a3b8",
    textTransform: "uppercase" as const, letterSpacing: "0.07em", margin: "0 0 12px",
  },
  photoBtn: {
    width: "100%", border: "2px dashed #e2e8f0", borderRadius: 14,
    background: "none", cursor: "pointer", padding: "16px 14px",
    display: "flex", alignItems: "center", gap: 14,
    fontFamily: "inherit", transition: "border-color 0.15s",
  },
  photoBtnIcon: {
    width: 46, height: 46, borderRadius: 12, background: "#f0fdf4",
    border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center",
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
    background: "linear-gradient(135deg, #059669, #0F6E56)",
    border: "none", borderRadius: 16, fontSize: 16, fontWeight: 700,
    color: "white", cursor: "pointer", fontFamily: "inherit",
    touchAction: "manipulation", display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 14px rgba(15,110,86,0.3)",
    transition: "opacity 0.15s",
  },
  spinner: {
    width: 18, height: 18, borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white",
    display: "inline-block", animation: "spin 0.7s linear infinite",
  },
  overlay: {
    position: "fixed" as const, inset: 0, zIndex: 100,
    background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
  },
  sheet: {
    background: "white", borderRadius: "24px 24px 0 0",
    padding: "20px 24px 28px", paddingBottom: "calc(28px + env(safe-area-inset-bottom, 0px))",
    width: "100%", maxWidth: 480,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, background: "#e2e8f0",
    margin: "0 auto 24px",
  },
};
