import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../lib/api";
import { AnalyticsEvents } from "../../../../shared/analytics-events";

function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  apiPost("/api/analytics/events", { eventName, properties: properties || {} }).catch(() => {});
}

export default function OnboardingCompletePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quoteId = searchParams.get("quoteId");
  const previewFired = useRef(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const quoteQuery = useQuery<any>({
    queryKey: ["/api/quotes", quoteId],
    queryFn: () => apiGet(`/api/quotes/${quoteId}`),
    enabled: !!quoteId,
  });

  const publicToken = quoteQuery.data?.publicToken;
  const previewUrl = publicToken
    ? `/q/${publicToken}?preview=1`
    : null;

  useEffect(() => {
    if (previewUrl && !previewFired.current) {
      previewFired.current = true;
      trackEvent(AnalyticsEvents.ONBOARDING_GATE_PREVIEW_VIEWED, { quoteId });
    }
  }, [previewUrl, quoteId]);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "qp_tier_click") {
        trackEvent(AnalyticsEvents.ONBOARDING_GATE_PREVIEW_TIER_CLICKED, { tier: e.data.tier });
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  function handleGoToDashboard() {
    trackEvent(AnalyticsEvents.ONBOARDING_GATE_COMPLETED, { cta: "dashboard" });
    navigate("/dashboard", { replace: true });
  }

  function handleSendToLead() {
    trackEvent(AnalyticsEvents.ONBOARDING_GATE_COMPLETED, { cta: "send_lead" });
    navigate("/quotes/new", { replace: true });
  }

  if (quoteQuery.isError || (!quoteId)) {
    return (
      <div style={styles.errorPage}>
        <p style={{ color: "#64748B", fontSize: 15 }}>
          Something went wrong. <button style={styles.linkBtn} onClick={() => navigate("/dashboard")}>Go to dashboard</button>
        </p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.banner}>
        <span style={styles.bannerDot} />
        <span style={styles.bannerText}>
          This is exactly what your customer sees.
        </span>
      </div>

      <div style={styles.iframeWrap}>
        {(!previewUrl || quoteQuery.isLoading) && (
          <div style={styles.loadingState}>
            <div style={styles.spinner} />
            <p style={{ marginTop: 16, color: "#64748B", fontSize: 14 }}>Loading your quote preview...</p>
          </div>
        )}
        {previewUrl && (
          <iframe
            src={previewUrl}
            title="Customer quote preview"
            style={{ ...styles.iframe, opacity: iframeLoaded ? 1 : 0, transition: "opacity 0.3s" }}
            onLoad={() => setIframeLoaded(true)}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        )}
      </div>

      <div style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerLeft}>
            <p style={styles.footerHeadline}>Your customer sees this in their inbox.</p>
            <p style={styles.footerSub}>
              Try selecting a tier or tapping Accept to see how it feels from their side.
            </p>
          </div>
          <div style={styles.ctaRow}>
            <button style={styles.outlineBtn} onClick={handleSendToLead}>
              Quote a real lead
            </button>
            <button style={styles.primaryBtn} onClick={handleGoToDashboard}>
              Go to dashboard &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
    background: "#0F172A",
  },
  banner: {
    background: "#0F6E56",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "10px 20px",
    flexShrink: 0,
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#C9920A",
    flexShrink: 0,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "0.3px",
  },
  iframeWrap: {
    flex: 1,
    position: "relative" as const,
    overflow: "hidden",
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
    display: "block",
  },
  loadingState: {
    position: "absolute" as const,
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#F8FAFC",
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "3px solid #E2E8F0",
    borderTopColor: "#0F6E56",
    animation: "spin 0.8s linear infinite",
  },
  footer: {
    background: "#1E293B",
    borderTop: "1px solid #334155",
    flexShrink: 0,
  },
  footerInner: {
    maxWidth: 800,
    margin: "0 auto",
    padding: "16px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap" as const,
  },
  footerLeft: {
    flex: 1,
    minWidth: 200,
  },
  footerHeadline: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: 700,
    margin: "0 0 4px",
  },
  footerSub: {
    color: "#94A3B8",
    fontSize: 13,
    margin: 0,
    lineHeight: 1.5,
  },
  ctaRow: {
    display: "flex",
    gap: 10,
    flexShrink: 0,
    flexWrap: "wrap" as const,
  },
  primaryBtn: {
    background: "#0F6E56",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "11px 20px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  outlineBtn: {
    background: "transparent",
    color: "#CBD5E1",
    border: "1px solid #475569",
    borderRadius: 10,
    padding: "11px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  errorPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#0F6E56",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 600,
    padding: 0,
  },
};
