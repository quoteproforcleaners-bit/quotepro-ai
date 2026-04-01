import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobDetails {
  id: string;
  status: string;
  address: string;
  startDatetime: string;
  internalNotes: string;
  cleanerNotes: string;
  total: number | null;
  startedAt: string | null;
  completedAt: string | null;
  invoiced: boolean;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
}

type CheckinState = "loading" | "error" | "ready" | "in_progress" | "complete";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    });
  } catch { return iso; }
}

// ─── Photo capture helpers ────────────────────────────────────────────────────

async function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1200;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", 0.75));
    };
    img.src = dataUrl;
  });
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function JobCheckinPage() {
  const { token } = useParams<{ token: string }>();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [state, setState] = useState<CheckinState>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  // In-progress state
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]); // local preview URLs
  const [photoData, setPhotoData] = useState<string[]>([]); // base64 data for upload
  const [uploading, setUploading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load job on mount ──
  useEffect(() => {
    if (!token) { setState("error"); setErrorMsg("Invalid check-in link."); return; }
    fetch(`/api/jobs/checkin/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.message && !data.id) {
          setState("error");
          setErrorMsg(data.message === "Job not found"
            ? "This check-in link is not valid or has expired."
            : data.message);
          return;
        }
        setJob(data);
        if (data.status === "completed") {
          setState("complete");
        } else if (data.status === "in_progress") {
          const ts = data.startedAt ? new Date(data.startedAt).getTime() : Date.now();
          setStartedAt(ts);
          setNotes(data.cleanerNotes || "");
          setState("in_progress");
        } else {
          setState("ready");
        }
      })
      .catch(() => { setState("error"); setErrorMsg("Could not load job. Check your connection."); });
  }, [token]);

  // ── Timer ──
  useEffect(() => {
    if (state === "in_progress" && startedAt) {
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startedAt);
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state, startedAt]);

  // ── Start job ──
  const handleStart = async () => {
    try {
      const r = await fetch(`/api/jobs/checkin/${token}/start`, { method: "POST" });
      const data = await r.json();
      const ts = data.startedAt ? new Date(data.startedAt).getTime() : Date.now();
      setStartedAt(ts);
      setState("in_progress");
    } catch {
      alert("Could not start job. Please check your connection and try again.");
    }
  };

  // ── Photo handling ──
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string;
      const compressed = await compressImage(raw);
      setPhotos(prev => [...prev, compressed]);
      setPhotoData(prev => [...prev, compressed]);
    };
    reader.readAsDataURL(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
    setPhotoData(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Complete job ──
  const handleComplete = async () => {
    setCompleting(true);
    setCompleteError("");
    try {
      // Upload photos first
      let uploadedUrls: string[] = [];
      if (photoData.length > 0) {
        setUploading(true);
        for (const data of photoData) {
          try {
            const r = await fetch(`/api/jobs/checkin/${token}/photos`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ photoData: data, caption: "Check-in photo" }),
            });
            const d = await r.json();
            if (d.url) uploadedUrls.push(d.url);
          } catch { /* continue — don't fail completion for photo issues */ }
        }
        setUploading(false);
      }

      const r = await fetch(`/api/jobs/checkin/${token}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes.trim() || undefined, photoUrls: uploadedUrls }),
      });
      const data = await r.json();
      if (!r.ok) { setCompleteError(data.message || "Could not complete job."); return; }
      setState("complete");
    } catch {
      setCompleteError("Connection error. Please try again.");
    } finally {
      setCompleting(false);
    }
  };

  // ─── Render helpers ───────────────────────────────────────────────────────

  const s: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100svh", background: "#f8fafc",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      WebkitFontSmoothing: "antialiased",
    },
    // top bar
    topBar: {
      background: "linear-gradient(135deg, #1e40af, #3b82f6)",
      padding: "20px 20px 18px", display: "flex", alignItems: "center", gap: "10px",
    },
    topBarTitle: { color: "#fff", fontSize: "16px", fontWeight: 700, margin: 0 },
    topBarSub:   { color: "rgba(255,255,255,.75)", fontSize: "12px" },
    // cards
    card: {
      background: "#fff", borderRadius: "16px", margin: "16px",
      boxShadow: "0 2px 16px rgba(0,0,0,.08)", overflow: "hidden",
    },
    cardBody: { padding: "20px" },
    // buttons
    btnGreen: {
      display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
      width: "100%", padding: "20px", borderRadius: "16px", border: "none",
      background: "linear-gradient(135deg, #16a34a, #15803d)",
      color: "#fff", fontSize: "18px", fontWeight: 800, cursor: "pointer",
      boxShadow: "0 4px 20px rgba(22,163,74,.35)", letterSpacing: ".01em",
      WebkitTapHighlightColor: "transparent",
    },
    btnBlue: {
      display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
      width: "100%", padding: "20px", borderRadius: "16px", border: "none",
      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
      color: "#fff", fontSize: "18px", fontWeight: 800, cursor: "pointer",
      boxShadow: "0 4px 20px rgba(37,99,235,.35)", letterSpacing: ".01em",
      WebkitTapHighlightColor: "transparent",
    },
    btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  };

  // ─── State: loading ───────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "44px", height: "44px", border: "4px solid #dbeafe",
            borderTopColor: "#3b82f6", borderRadius: "50%",
            animation: "spin 0.9s linear infinite", margin: "0 auto 16px",
          }} />
          <p style={{ color: "#64748b", fontSize: "15px" }}>Loading job details...</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ─── State: error ─────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div style={{ ...s.page, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ maxWidth: "360px", textAlign: "center" }}>
          <div style={{
            width: "64px", height: "64px", background: "#fee2e2", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
            fontSize: "28px",
          }}>!</div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b", margin: "0 0 8px" }}>Link not found</h2>
          <p style={{ color: "#64748b", fontSize: "15px", lineHeight: 1.6, margin: 0 }}>{errorMsg}</p>
        </div>
      </div>
    );
  }

  // ─── State: complete ──────────────────────────────────────────────────────
  if (state === "complete") {
    return (
      <div style={s.page}>
        <div style={s.topBar}>
          <div style={{
            width: "36px", height: "36px", background: "rgba(255,255,255,.15)",
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "18px",
          }}>✓</div>
          <div>
            <p style={s.topBarTitle}>QuotePro Check-In</p>
            <p style={s.topBarSub}>{job?.address || "Job"}</p>
          </div>
        </div>

        <div style={{ padding: "32px 16px", textAlign: "center" }}>
          <div style={{
            width: "80px", height: "80px", background: "linear-gradient(135deg,#16a34a,#15803d)",
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", boxShadow: "0 8px 24px rgba(22,163,74,.3)",
            fontSize: "36px", color: "#fff",
          }}>✓</div>
          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#1e293b", margin: "0 0 10px", lineHeight: 1.2 }}>
            Job Complete!
          </h1>
          <p style={{ fontSize: "16px", color: "#64748b", lineHeight: 1.6, margin: "0 auto", maxWidth: "280px" }}>
            Great work. An invoice has been sent to the client automatically.
          </p>

          {job?.total ? (
            <div style={{
              margin: "24px 16px 0", background: "#f0fdf4", borderRadius: "16px",
              padding: "20px", border: "1px solid #bbf7d0",
            }}>
              <p style={{ fontSize: "13px", color: "#15803d", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 4px" }}>Invoice Total</p>
              <p style={{ fontSize: "36px", fontWeight: 900, color: "#15803d", margin: 0 }}>
                ${Number(job.total).toFixed(2)}
              </p>
            </div>
          ) : null}

          <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "32px" }}>
            You can close this page.
          </p>
        </div>
      </div>
    );
  }

  // ─── State: ready ─────────────────────────────────────────────────────────
  if (state === "ready") {
    return (
      <div style={s.page}>
        <div style={s.topBar}>
          <div style={{
            width: "36px", height: "36px", background: "rgba(255,255,255,.15)",
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div>
            <p style={s.topBarTitle}>QuotePro Check-In</p>
            <p style={s.topBarSub}>Ready to start</p>
          </div>
        </div>

        {/* Job info card */}
        <div style={s.card}>
          <div style={s.cardBody}>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 12px" }}>Today's Job</p>

            {job?.customerName ? (
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <div style={{
                  width: "40px", height: "40px", background: "linear-gradient(135deg,#dbeafe,#bfdbfe)",
                  borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "18px", fontWeight: 700, color: "#1d4ed8", flexShrink: 0,
                }}>
                  {job.customerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: "17px", fontWeight: 700, color: "#1e293b", margin: "0 0 2px" }}>{job.customerName}</p>
                  {job.customerPhone ? (
                    <a href={`tel:${job.customerPhone}`} style={{ fontSize: "13px", color: "#3b82f6", textDecoration: "none" }}>
                      {job.customerPhone}
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <InfoRow icon="📍" label="Address" value={job?.address || "—"} />
              {job?.startDatetime ? (
                <InfoRow icon="📅" label="Scheduled" value={formatDate(job.startDatetime)} />
              ) : null}
              {job?.internalNotes ? (
                <InfoRow icon="📋" label="Notes" value={job.internalNotes} />
              ) : null}
              {job?.total ? (
                <InfoRow icon="💰" label="Job Total" value={`$${Number(job.total).toFixed(2)}`} />
              ) : null}
            </div>
          </div>
        </div>

        {/* Start button */}
        <div style={{ padding: "4px 16px 32px" }}>
          <button style={s.btnGreen} onClick={handleStart}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white" stroke="none">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
            Start Job
          </button>
        </div>
      </div>
    );
  }

  // ─── State: in_progress ───────────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={{ ...s.topBar, background: "linear-gradient(135deg, #0f172a, #1e293b)" }}>
        <div style={{
          width: "36px", height: "36px", background: "#16a34a",
          borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={s.topBarTitle}>Job In Progress</p>
          <p style={s.topBarSub}>{job?.address}</p>
        </div>
        <div style={{
          background: "rgba(255,255,255,.1)", borderRadius: "10px", padding: "6px 12px",
          color: "#fff", fontFamily: "ui-monospace, monospace", fontSize: "18px", fontWeight: 700,
          letterSpacing: ".05em",
        }}>
          {formatElapsed(elapsedMs)}
        </div>
      </div>

      {/* Customer info compact */}
      {job?.customerName ? (
        <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "36px", height: "36px", background: "linear-gradient(135deg,#1e40af,#3b82f6)",
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px", fontWeight: 700, color: "#fff", flexShrink: 0,
          }}>
            {job.customerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#1e293b", margin: 0 }}>{job.customerName}</p>
            {job.customerPhone ? (
              <a href={`tel:${job.customerPhone}`} style={{ fontSize: "12px", color: "#3b82f6", textDecoration: "none" }}>
                Call customer
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Job notes reminder */}
      {job?.internalNotes ? (
        <div style={{ margin: "12px 16px 0", background: "#fefce8", borderRadius: "12px", padding: "12px 16px", border: "1px solid #fde68a" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 4px" }}>Job Notes</p>
          <p style={{ fontSize: "14px", color: "#78350f", margin: 0, lineHeight: 1.5 }}>{job.internalNotes}</p>
        </div>
      ) : null}

      {/* Photos */}
      <div style={s.card}>
        <div style={s.cardBody}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#374151", margin: "0 0 10px" }}>Photos</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: photos.length > 0 ? "12px" : 0 }}>
            {photos.map((src, i) => (
              <div key={i} style={{ position: "relative", width: "80px", height: "80px" }}>
                <img src={src} alt="job photo" style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "10px", border: "1px solid #e2e8f0" }} />
                <button
                  onClick={() => removePhoto(i)}
                  style={{
                    position: "absolute", top: "-6px", right: "-6px", width: "22px", height: "22px",
                    background: "#ef4444", borderRadius: "50%", border: "2px solid #fff",
                    color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
                  }}
                >×</button>
              </div>
            ))}
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: "none" }} />
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              width: "100%", padding: "13px", borderRadius: "12px", border: "2px dashed #d1d5db",
              background: "#f9fafb", color: "#6b7280", fontSize: "14px", fontWeight: 600,
              cursor: "pointer", WebkitTapHighlightColor: "transparent",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            {photos.length > 0 ? "Add Another Photo" : "Take or Upload Photo"}
          </button>
        </div>
      </div>

      {/* Notes */}
      <div style={s.card}>
        <div style={s.cardBody}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#374151", margin: "0 0 8px" }}>Completion Notes</p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add any notes about the job — areas cleaned, issues found, supplies used..."
            rows={4}
            style={{
              width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "12px",
              padding: "12px", fontSize: "15px", color: "#1e293b", lineHeight: 1.6,
              resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
              background: "#f8fafc",
            }}
          />
        </div>
      </div>

      {/* Complete button */}
      <div style={{ padding: "4px 16px 32px" }}>
        {completeError ? (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px",
            padding: "12px 16px", marginBottom: "12px", fontSize: "14px", color: "#dc2626",
          }}>
            {completeError}
          </div>
        ) : null}
        <button
          style={{ ...s.btnBlue, ...(completing ? s.btnDisabled : {}) }}
          onClick={handleComplete}
          disabled={completing}
        >
          {completing ? (
            <>
              <div style={{
                width: "20px", height: "20px", border: "3px solid rgba(255,255,255,.3)",
                borderTopColor: "#fff", borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
              {uploading ? "Uploading photos..." : "Marking complete..."}
            </>
          ) : (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Mark Job Complete
            </>
          )}
        </button>
        <p style={{ textAlign: "center", fontSize: "12px", color: "#94a3b8", margin: "10px 0 0" }}>
          This will send an invoice to the client automatically
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Small helper component ───────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
      <span style={{ fontSize: "16px", flexShrink: 0, marginTop: "1px" }}>{icon}</span>
      <div>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".05em", margin: "0 0 1px" }}>{label}</p>
        <p style={{ fontSize: "14px", color: "#374151", margin: 0, lineHeight: 1.5 }}>{value}</p>
      </div>
    </div>
  );
}
