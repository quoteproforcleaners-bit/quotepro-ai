import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { CheckCircle, Mail, Clock, Loader2, AlertCircle, Sparkles, ArrowRight } from "lucide-react";

const API_BASE = typeof window !== "undefined" ? window.location.origin : "";

type Phase = "loading" | "waiting" | "success" | "manual" | "error";

export default function LeadPendingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const leadId = params.get("leadId");
  const email = params.get("email") || "";
  const isManual = params.get("mode") === "manual";

  const [phase, setPhase] = useState<Phase>(isManual ? "manual" : "waiting");
  const [elapsed, setElapsed] = useState(0);
  const [bizColor, setBizColor] = useState("#2563EB");
  const [bizName, setBizName] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const MAX_WAIT = 90;

  useEffect(() => {
    if (slug) {
      fetch(`${API_BASE}/api/public/biz-info/${slug}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.primaryColor) setBizColor(d.primaryColor);
          if (d.companyName) setBizName(d.companyName);
        })
        .catch(() => {});
    }
  }, [slug]);

  useEffect(() => {
    if (isManual || !leadId) return;

    // Elapsed timer
    timerRef.current = setInterval(() => {
      setElapsed((e) => {
        if (e >= MAX_WAIT) {
          clearInterval(timerRef.current!);
          setPhase("success");
          return e;
        }
        return e + 1;
      });
    }, 1000);

    // Poll for quote status
    pollRef.current = setInterval(async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/public/quote-status/${leadId}`);
        const data = await resp.json();
        if (data.emailSent || data.status === "quoted" || data.status === "booked") {
          clearInterval(pollRef.current!);
          clearInterval(timerRef.current!);
          setPhase("success");
        }
      } catch {
        // ignore poll errors
      }
    }, 5000);

    return () => {
      clearInterval(pollRef.current!);
      clearInterval(timerRef.current!);
    };
  }, [leadId, isManual]);

  const color = bizColor;
  const progress = Math.min((elapsed / 60) * 100, 95);

  return (
    <div style={{ minHeight: "100vh", background: "#F3F4F6", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes fadeUp { from { opacity:0;transform:translateY(12px) } to { opacity:1;transform:translateY(0) } }
        @keyframes fillBar { from { width:0% } to { width:var(--w) } }
        * { box-sizing: border-box; }
      `}</style>

      {/* Header */}
      <div style={{ background: color, padding: "18px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{bizName || "QuotePro"}</div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
        <div style={{ maxWidth: 480, width: "100%", animation: "fadeUp .3s ease" }}>

          {/* ── Waiting State ── */}
          {phase === "waiting" && (
            <div style={{ background: "#fff", borderRadius: 20, padding: "40px 32px", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
              {/* Animated icon */}
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: rgba(color, 0.1), display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <Sparkles size={36} style={{ color, animation: "pulse 2s ease-in-out infinite" }} />
              </div>

              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "0 0 10px" }}>
                Generating your quote…
              </h2>
              <p style={{ fontSize: 15, color: "#6B7280", margin: "0 0 32px", lineHeight: 1.6 }}>
                Our AI is calculating a personalized price for your home. You'll receive an email at{" "}
                <strong style={{ color: "#111827" }}>{email}</strong> with your quote and available booking times.
              </p>

              {/* Progress bar */}
              <div style={{ background: "#F3F4F6", borderRadius: 8, height: 8, overflow: "hidden", marginBottom: 12 }}>
                <div style={{
                  height: 8, background: color, borderRadius: 8,
                  width: `${progress}%`, transition: "width 1s ease",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9CA3AF", marginBottom: 32 }}>
                <span>Analyzing home details…</span>
                <span>{elapsed}s / ~60s</span>
              </div>

              {/* Steps */}
              <div style={{ textAlign: "left" }}>
                {[
                  { label: "Received your home details", done: elapsed >= 2 },
                  { label: "AI analyzing pricing factors", done: elapsed >= 10 },
                  { label: "Calculating personalized quote", done: elapsed >= 25 },
                  { label: "Finding available booking slots", done: elapsed >= 40 },
                  { label: "Sending your quote email", done: elapsed >= 55 },
                ].map((step, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: step.done ? color : "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .3s" }}>
                      {step.done ? (
                        <CheckCircle size={14} color="#fff" />
                      ) : elapsed >= (i === 0 ? 1 : i * 10) ? (
                        <Loader2 size={12} color="#9CA3AF" style={{ animation: "spin 1s linear infinite" }} />
                      ) : (
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D1D5DB" }} />
                      )}
                    </div>
                    <span style={{ fontSize: 14, color: step.done ? "#111827" : "#9CA3AF", fontWeight: step.done ? 600 : 400, transition: "color .3s" }}>{step.label}</span>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 24, marginBottom: 0 }}>
                This page will update automatically. You can also check your email.
              </p>
            </div>
          )}

          {/* ── Success State ── */}
          {phase === "success" && (
            <div style={{ background: "#fff", borderRadius: 20, padding: "40px 32px", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <CheckCircle size={40} style={{ color: "#16A34A" }} />
              </div>

              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "0 0 10px" }}>
                Your quote is on the way!
              </h2>
              <p style={{ fontSize: 15, color: "#6B7280", margin: "0 0 28px", lineHeight: 1.6 }}>
                We sent your personalized cleaning quote to{" "}
                <strong style={{ color: "#111827" }}>{email}</strong>. Check your inbox — it includes your price and available booking times.
              </p>

              <div style={{ background: "#F9FAFB", borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 12, textAlign: "left" }}>
                <Mail size={20} style={{ color, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Check your email</div>
                  <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>
                    Look for an email from <strong>{bizName}</strong>. The email contains your personalized quote and one-click booking buttons for available time slots.
                  </div>
                </div>
              </div>

              <div style={{ background: "#FFF7ED", borderRadius: 12, padding: "14px 18px", fontSize: 13, color: "#92400E", textAlign: "left", display: "flex", gap: 10 }}>
                <Clock size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>Booking slots fill up fast. Click a time in the email to reserve your spot before it's gone.</span>
              </div>
            </div>
          )}

          {/* ── Manual Mode ── */}
          {phase === "manual" && (
            <div style={{ background: "#fff", borderRadius: 20, padding: "40px 32px", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: rgba(color, 0.1), display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <CheckCircle size={40} style={{ color }} />
              </div>

              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "0 0 10px" }}>
                Request received!
              </h2>
              <p style={{ fontSize: 15, color: "#6B7280", margin: "0 0 28px", lineHeight: 1.6 }}>
                Thanks! We've received your quote request and will be in touch at{" "}
                <strong style={{ color: "#111827" }}>{email}</strong> shortly.
              </p>

              <div style={{ background: "#F9FAFB", borderRadius: 12, padding: "16px 20px", textAlign: "left", display: "flex", gap: 12 }}>
                <Mail size={20} style={{ color, flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                  {bizName} will review your details and reach out with a personalized quote. Typical response time is within a few hours.
                </div>
              </div>
            </div>
          )}

          {/* ── Error State ── */}
          {phase === "error" && (
            <div style={{ background: "#fff", borderRadius: 20, padding: "40px 32px", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
              <AlertCircle size={48} style={{ color: "#EF4444", margin: "0 auto 20px", display: "block" }} />
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>Something went wrong</h2>
              <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 20px" }}>
                We encountered an issue. Please go back and try again, or contact {bizName} directly.
              </p>
              <a href={`/request/${slug}`}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", background: color, color: "#fff", borderRadius: 10, fontSize: 15, fontWeight: 600, textDecoration: "none" }}>
                Try again <ArrowRight size={16} />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function rgba(hex: string, a: number): string {
  const c = hex.replace("#", "");
  if (c.length < 6) return `rgba(37,99,235,${a})`;
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
