import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, ChevronRight } from "lucide-react";
import { useAuth } from "../lib/auth";
import { apiPost } from "../lib/api";

const DISMISSED_KEY = "qp_nps_dismissed";

export default function NPSSurvey() {
  const { isAuthenticated } = useAuth();
  const [visible, setVisible] = useState(false);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const shownRef = useRef(false);

  const { data: status } = useQuery<{ shouldShow: boolean; alreadySurveyed?: boolean }>({
    queryKey: ["/api/nps/status"],
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => {
    if (shownRef.current) return;
    if (!status?.shouldShow) return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    // Small delay so it doesn't flash immediately on load
    const t = setTimeout(() => {
      setVisible(true);
      shownRef.current = true;
    }, 3000);
    return () => clearTimeout(t);
  }, [status]);

  if (!visible || !isAuthenticated) return null;

  const followUpLabel =
    selectedScore === null
      ? ""
      : selectedScore >= 9
        ? "What do you love most about QuotePro?"
        : selectedScore >= 7
          ? "What could we improve?"
          : "What's not working for you?";

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  const handleSubmit = async () => {
    if (selectedScore === null) return;
    setSubmitting(true);
    try {
      await apiPost("/api/nps/submit", { score: selectedScore, followUp });
      setSubmitted(true);
    } catch {
      // Swallow — UX shouldn't break on survey failure
    } finally {
      setSubmitting(false);
    }
  };

  const scoreColor = (s: number) =>
    s <= 6 ? "#ef4444" : s <= 8 ? "#f59e0b" : "#22c55e";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        width: 340,
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 8px 40px rgba(0,0,0,0.14)",
        border: "1px solid #e5e7eb",
        fontFamily: "inherit",
        overflow: "hidden",
        animation: "slideUpFade 0.35s ease",
      }}
    >
      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: "#0f172a", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>Quick question</span>
        <button
          onClick={handleDismiss}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 2 }}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: "16px 16px 20px" }}>
        {submitted ? (
          <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🙏</div>
            <p style={{ color: "#0f172a", fontWeight: 600, margin: "0 0 6px", fontSize: 15 }}>
              Thank you so much!
            </p>
            <p style={{ color: "#64748b", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              Your feedback shapes every update we ship.
            </p>
            <button
              onClick={() => setVisible(false)}
              style={{ marginTop: 16, background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <p style={{ color: "#0f172a", fontSize: 14, margin: "0 0 14px", lineHeight: 1.5, fontWeight: 500 }}>
              How likely are you to recommend QuotePro to another cleaning business owner?
            </p>

            {/* 0-10 score selector */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedScore(i)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: selectedScore === i ? "2px solid " + scoreColor(i) : "1px solid #e5e7eb",
                    background: selectedScore === i ? scoreColor(i) : "#f8fafc",
                    color: selectedScore === i ? "#fff" : "#374151",
                    fontWeight: selectedScore === i ? 700 : 500,
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {i}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>Not at all likely</span>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>Extremely likely</span>
            </div>

            {/* Follow-up question */}
            {selectedScore !== null && (
              <div style={{ animation: "slideUpFade 0.2s ease" }}>
                <label style={{ fontSize: 13, color: "#374151", fontWeight: 500, display: "block", marginBottom: 6 }}>
                  {followUpLabel}
                </label>
                <textarea
                  value={followUp}
                  onChange={e => setFollowUp(e.target.value)}
                  placeholder="Optional — but incredibly helpful..."
                  rows={3}
                  style={{
                    width: "100%",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: 13,
                    resize: "vertical",
                    fontFamily: "inherit",
                    color: "#0f172a",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    marginTop: 10,
                    width: "100%",
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 0",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? "Submitting..." : "Submit feedback"}
                  {!submitting && <ChevronRight size={16} />}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
