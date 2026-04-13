import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { CheckCircle, Mail, Clock, Loader2, AlertCircle, Sparkles, ArrowRight, Home, Calendar } from "lucide-react";

const API_BASE = typeof window !== "undefined" ? window.location.origin : "";
const MAX_WAIT = 90;
const POLL_MS = 3000;

type Phase = "waiting" | "success" | "manual" | "error" | "timeout";

interface QuoteData {
  quoteType: "exact" | "range";
  exactAmount?: number;
  rangeMin?: number;
  rangeMax?: number;
  estimatedDuration?: string;
  notes?: string;
  cleanType?: string;
}

const STEPS = [
  { label: "Received your home details",   readyAt: ["queued", "generating", "quoted", "booked"] },
  { label: "AI analyzing pricing factors", readyAt: ["generating", "quoted", "booked"] },
  { label: "Calculating personalized quote", readyAt: ["quoted", "booked"] },
  { label: "Finding available booking slots", readyAt: ["quoted", "booked"] },
  { label: "Sending your quote email",     readyAt: ["quoted", "booked"] },
];

function stepState(stepIdx: number, leadStatus: string, elapsed: number): "done" | "active" | "pending" {
  const step = STEPS[stepIdx];
  if (step.readyAt.includes(leadStatus)) return "done";
  // Animate steps forward using elapsed time as a fallback while waiting
  const timeThresholds = [2, 8, 20, 35, 50];
  if (elapsed >= timeThresholds[stepIdx]) return "active";
  return "pending";
}

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
  const [bizPhone, setBizPhone] = useState("");
  const [leadStatus, setLeadStatus] = useState("queued");
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [bookingToken, setBookingToken] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Load biz info
  useEffect(() => {
    if (!slug) return;
    fetch(`${API_BASE}/api/public/biz-info/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.primaryColor) setBizColor(d.primaryColor);
        if (d.companyName) setBizName(d.companyName);
        if (d.phone) setBizPhone(d.phone);
      })
      .catch(() => {});
  }, [slug]);

  // Polling + timer
  useEffect(() => {
    if (isManual || !leadId) return;

    timerRef.current = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (next >= MAX_WAIT && phaseRef.current === "waiting") {
          clearInterval(timerRef.current!);
          clearInterval(pollRef.current!);
          setPhase("timeout");
        }
        return next;
      });
    }, 1000);

    const doPoll = async () => {
      if (phaseRef.current !== "waiting") return;
      try {
        const resp = await fetch(`${API_BASE}/api/public/quote-status/${leadId}`);
        if (!resp.ok) return;
        const data = await resp.json();

        if (data.status) setLeadStatus(data.status);
        if (data.quoteData) setQuoteData(data.quoteData);
        if (data.emailSent) setEmailSent(true);
        if (data.bookingToken) setBookingToken(data.bookingToken);

        const done = data.emailSent || data.status === "quoted" || data.status === "booked";
        if (done) {
          clearInterval(pollRef.current!);
          clearInterval(timerRef.current!);
          setPhase("success");
        } else if (data.status === "failed") {
          clearInterval(pollRef.current!);
          clearInterval(timerRef.current!);
          setPhase("error");
        }
      } catch {
        // silently ignore transient poll failures
      }
    };

    // Poll immediately, then every POLL_MS
    doPoll();
    pollRef.current = setInterval(doPoll, POLL_MS);

    return () => {
      clearInterval(pollRef.current!);
      clearInterval(timerRef.current!);
    };
  }, [leadId, isManual]);

  const color = bizColor;
  const progress = Math.min((elapsed / 60) * 100, 95);
  const bookingUrl = bookingToken ? `${API_BASE}/book/${bookingToken}` : null;

  return (
    <div style={{ minHeight: "100vh", background: "#F3F4F6", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        @keyframes fadeUp { from { opacity:0;transform:translateY(16px) } to { opacity:1;transform:translateY(0) } }
        @keyframes popIn { 0% { opacity:0;transform:scale(0.88) } 60% { transform:scale(1.04) } 100% { opacity:1;transform:scale(1) } }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ background: color, padding: "18px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{bizName || "QuotePro"}</div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
        <div style={{ maxWidth: 480, width: "100%", animation: "fadeUp .3s ease" }}>

          {/* ── Waiting State ── */}
          {phase === "waiting" && (
            <div style={{ background: "#fff", borderRadius: 20, padding: "40px 32px", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
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

              <div style={{ background: "#F3F4F6", borderRadius: 8, height: 8, overflow: "hidden", marginBottom: 12 }}>
                <div style={{ height: 8, background: color, borderRadius: 8, width: `${progress}%`, transition: "width 1s ease" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#9CA3AF", marginBottom: 32 }}>
                <span>Analyzing home details…</span>
                <span>{elapsed}s / ~60s</span>
              </div>

              <div style={{ textAlign: "left" }}>
                {STEPS.map((step, i) => {
                  const state = stepState(i, leadStatus, elapsed);
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                        background: state === "done" ? color : state === "active" ? rgba(color, 0.15) : "#E5E7EB",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background .3s",
                      }}>
                        {state === "done" ? (
                          <CheckCircle size={14} color="#fff" />
                        ) : state === "active" ? (
                          <Loader2 size={12} style={{ color, animation: "spin 1s linear infinite" }} />
                        ) : (
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D1D5DB" }} />
                        )}
                      </div>
                      <span style={{
                        fontSize: 14,
                        color: state === "done" ? "#111827" : state === "active" ? color : "#9CA3AF",
                        fontWeight: state === "done" ? 600 : state === "active" ? 500 : 400,
                        transition: "color .3s",
                      }}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 24, marginBottom: 0 }}>
                This page will update automatically. You can also check your email.
              </p>
            </div>
          )}

          {/* ── Success State ── */}
          {phase === "success" && (
            <div style={{ background: "#fff", borderRadius: 20, padding: "40px 32px", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", animation: "popIn .4s ease" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <CheckCircle size={36} style={{ color: "#16A34A" }} />
              </div>

              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "0 0 6px" }}>
                Your quote is ready!
              </h2>
              <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 24px" }}>
                Here's your personalized cleaning estimate
              </p>

              {/* Quote card */}
              {quoteData ? (
                <QuoteCard quote={quoteData} color={color} />
              ) : (
                <div style={{ background: "#F9FAFB", borderRadius: 12, padding: "20px", marginBottom: 20, color: "#6B7280", fontSize: 14 }}>
                  Your quote has been calculated and sent to your email.
                </div>
              )}

              {/* Email notice */}
              <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 12, textAlign: "left" }}>
                <Mail size={18} style={{ color: "#16A34A", flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#166534", marginBottom: 2 }}>Full quote sent to {email}</div>
                  <div style={{ fontSize: 12, color: "#15803D" }}>
                    Your email includes booking times — click a slot to reserve your spot instantly.
                  </div>
                </div>
              </div>

              {/* Urgency */}
              <div style={{ background: "#FFF7ED", borderRadius: 12, padding: "12px 16px", fontSize: 12, color: "#92400E", textAlign: "left", display: "flex", gap: 10, marginBottom: 24 }}>
                <Clock size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Booking slots fill up fast — click a time in the email to lock in your spot before it's taken.</span>
              </div>

              {/* CTAs */}
              {bookingUrl && (
                <a href={bookingUrl} style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "14px 24px", background: color, color: "#fff",
                  borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: "none",
                  marginBottom: 10, boxShadow: `0 4px 12px ${rgba(color, 0.35)}`,
                }}>
                  <Calendar size={16} />
                  Book Now
                  <ArrowRight size={16} />
                </a>
              )}
              <div style={{ fontSize: 13, color: "#9CA3AF" }}>
                Or check your inbox for the booking link
              </div>
            </div>
          )}

          {/* ── Timeout State (90s, no error) ── */}
          {phase === "timeout" && (
            <div style={{ background: "#fff", borderRadius: 20, padding: "40px 32px", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: rgba(color, 0.1), display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <Mail size={34} style={{ color }} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 10px" }}>
                Request received!
              </h2>
              <p style={{ fontSize: 15, color: "#6B7280", margin: "0 0 24px", lineHeight: 1.6 }}>
                Your quote request was received. Check your email — <strong>{bizName || "we"}</strong> will send your personalized quote shortly.
              </p>
              <div style={{ background: "#F9FAFB", borderRadius: 12, padding: "16px 18px", textAlign: "left", display: "flex", gap: 12 }}>
                <Mail size={18} style={{ color, flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                  Look for an email at <strong>{email}</strong> from {bizName}. It'll contain your quote and booking options.
                </div>
              </div>
            </div>
          )}

          {/* ── Error State (status = 'failed') ── */}
          {phase === "error" && (
            <div style={{ background: "#fff", borderRadius: 20, padding: "40px 32px", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <AlertCircle size={36} style={{ color: "#EF4444" }} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 10px" }}>
                We hit a snag
              </h2>
              <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 20px", lineHeight: 1.6 }}>
                We had trouble generating your quote automatically. No worries —{" "}
                <strong>{bizName}</strong> will follow up within 24 hours.
                {bizPhone && (
                  <> You can also call <strong>{bizPhone}</strong>.</>
                )}
              </p>
              <a href={`/request/${slug}`} style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 24px", background: color, color: "#fff",
                borderRadius: 10, fontSize: 15, fontWeight: 600, textDecoration: "none",
              }}>
                Try again <ArrowRight size={16} />
              </a>
            </div>
          )}

          {/* ── Manual Mode ── */}
          {phase === "manual" && (
            <div style={{ background: "#fff", borderRadius: 20, padding: "40px 32px", textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: rgba(color, 0.1), display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                <CheckCircle size={36} style={{ color }} />
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

        </div>
      </div>
    </div>
  );
}

// ── Quote Card Component ──────────────────────────────────────────────────────

function QuoteCard({ quote, color }: { quote: QuoteData; color: string }) {
  const priceStr =
    quote.quoteType === "exact"
      ? `$${(quote.exactAmount || 0).toLocaleString()}`
      : `$${(quote.rangeMin || 0).toLocaleString()} – $${(quote.rangeMax || 0).toLocaleString()}`;

  return (
    <div style={{
      background: `linear-gradient(135deg, ${rgba(color, 0.06)}, ${rgba(color, 0.12)})`,
      border: `2px solid ${rgba(color, 0.25)}`,
      borderRadius: 16,
      padding: "24px 20px",
      textAlign: "center",
      marginBottom: 20,
      animation: "popIn .5s ease",
    }}>
      {quote.cleanType && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 10 }}>
          <Home size={14} style={{ color }} />
          <span style={{ fontSize: 13, color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {quote.cleanType}
          </span>
        </div>
      )}

      <div style={{ fontSize: 11, color: "#9CA3AF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
        Your Quote
      </div>
      <div style={{ fontSize: 48, fontWeight: 900, color, lineHeight: 1, marginBottom: 4 }}>
        {priceStr}
      </div>

      {quote.quoteType === "range" && (
        <div style={{ fontSize: 12, color: "#6B7280", marginTop: 6 }}>
          Final price confirmed before your appointment
        </div>
      )}

      {quote.estimatedDuration && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 13, color: "#6B7280", marginTop: 8 }}>
          <Clock size={13} />
          Est. {quote.estimatedDuration}
        </div>
      )}

      {quote.notes && (
        <div style={{
          fontSize: 13, color: "#374151", marginTop: 14,
          padding: "10px 14px", background: "rgba(255,255,255,0.7)",
          borderRadius: 10, fontStyle: "italic", lineHeight: 1.5, textAlign: "left",
        }}>
          "{quote.notes}"
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rgba(hex: string, a: number): string {
  const c = hex.replace("#", "");
  if (c.length < 6) return `rgba(37,99,235,${a})`;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
