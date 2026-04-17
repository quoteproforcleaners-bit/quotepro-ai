import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth";
import { apiPost, apiDelete } from "../../lib/api";
import { AnalyticsEvents } from "../../../../shared/analytics-events";
import AddressAutocompleteLine from "../../components/AddressAutocompleteLine";
import { Toast } from "../../components/ui";

function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  apiPost("/api/analytics/events", { eventName, properties: properties || {} }).catch(() => {});
}

function AddressForm({
  initialAddress,
  onSubmit,
  loading,
  error,
  failureCount,
  isServerOrRateLimitError,
  onSkip,
  skipping,
}: {
  initialAddress: string;
  onSubmit: (data: { address: string; beds: number; baths: number; sqft: number }) => void;
  loading: boolean;
  error?: string;
  failureCount: number;
  isServerOrRateLimitError: boolean;
  onSkip: () => void;
  skipping: boolean;
}) {
  const [address, setAddress] = useState(initialAddress);
  const [beds, setBeds] = useState(3);
  const [baths, setBaths] = useState(2);
  const [sqft, setSqft] = useState(1800);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ address, beds, baths, sqft });
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 440 }}>
      <div style={{ marginBottom: 16 }}>
        <label style={styles.label}>Your home address</label>
        <AddressAutocompleteLine
          value={address}
          onChange={setAddress}
          placeholder="Start typing your address..."
          inputStyle={styles.input}
        />
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Bedrooms</label>
          <input
            type="number"
            min={1}
            max={10}
            style={styles.input}
            value={beds}
            onChange={(e) => setBeds(Number(e.target.value))}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Bathrooms</label>
          <input
            type="number"
            min={1}
            max={10}
            step={0.5}
            style={styles.input}
            value={baths}
            onChange={(e) => setBaths(Number(e.target.value))}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Sq ft</label>
          <input
            type="number"
            min={200}
            max={10000}
            step={100}
            style={styles.input}
            value={sqft}
            onChange={(e) => setSqft(Number(e.target.value))}
          />
        </div>
      </div>
      {error && (
        <div style={styles.errorBox}>
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      <button type="submit" style={styles.primaryBtn} disabled={loading}>
        {loading ? "Generating quote..." : failureCount > 0 ? "Try again" : "Generate my quote"}
      </button>
      {(failureCount >= 2 || (failureCount >= 1 && isServerOrRateLimitError)) && (
        <button
          type="button"
          style={{ ...styles.skipLink, ...(skipping ? { opacity: 0.6, cursor: "not-allowed" } : {}) }}
          onClick={onSkip}
          disabled={skipping}
        >
          {skipping ? (
            <span style={styles.skipInner}>
              <span style={styles.skipSpinner} aria-hidden="true" />
              Skipping...
            </span>
          ) : (
            "Skip this step and go to the dashboard"
          )}
        </button>
      )}
    </form>
  );
}

export default function FirstQuotePage() {
  const navigate = useNavigate();
  const { user, business, refresh } = useAuth();
  const [mode, setMode] = useState<"select" | "own_home">("select");
  const [apiError, setApiError] = useState<string | undefined>();
  const [failureCount, setFailureCount] = useState(0);
  const [isServerOrRateLimitError, setIsServerOrRateLimitError] = useState(false);
  const [skipWarning, setSkipWarning] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);

  useEffect(() => {
    trackEvent(AnalyticsEvents.ONBOARDING_GATE_STARTED);
  }, []);

  async function handleSkip() {
    if (skipping) return;
    setSkipping(true);
    trackEvent(AnalyticsEvents.ONBOARDING_GATE_OPTION_SELECTED, { option: "skipped_after_error", failureCount });
    try {
      await apiPost("/api/quotes/onboarding-skip", {});
      try { localStorage.removeItem("qp_pending_skip_retry"); } catch {}
    } catch (err) {
      console.error("[handleSkip] onboarding-skip API call failed:", err);
      try { localStorage.setItem("qp_pending_skip_retry", "1"); } catch {}
      setSkipWarning("Couldn't save your progress — you may see this screen again");
      setSkipping(false);
      return;
    }
    await refresh();
    navigate("/dashboard");
  }

  const createQuoteMutation = useMutation({
    mutationFn: async (data: { address: string; beds: number; baths: number; sqft: number }) => {
      const quoteData = {
        serviceName: "Standard Clean",
        status: "draft",
        propertyDetails: {
          address: data.address,
          beds: data.beds,
          baths: data.baths,
          sqft: data.sqft,
          customerName: user?.firstName
            ? `${user.firstName}${user?.name?.split(" ").slice(1).join(" ") ? " " + user.name!.split(" ").slice(1).join(" ") : ""}`
            : user?.name || "Demo Customer",
        },
        options: {
          good: {
            name: "Standard Clean",
            price: Math.round(data.beds * 45 + data.baths * 25 + data.sqft * 0.02),
            scope: "Kitchen, bathrooms, dusting, vacuum, and mop",
            serviceTypeId: "regular",
            serviceTypeName: "Standard Cleaning",
            addOnsIncluded: [],
          },
          better: {
            name: "Deep Clean",
            price: Math.round(data.beds * 60 + data.baths * 35 + data.sqft * 0.03),
            scope: "Standard clean plus baseboards, blinds, and detail work",
            serviceTypeId: "deep-clean",
            serviceTypeName: "Deep Clean",
            addOnsIncluded: ["Baseboards Detail", "Blinds Detail"],
          },
          best: {
            name: "Premium Clean",
            price: Math.round(data.beds * 80 + data.baths * 45 + data.sqft * 0.04),
            scope: "Deep clean plus inside oven, cabinets, and interior windows",
            serviceTypeId: "deep-clean",
            serviceTypeName: "Premium Deep Clean",
            addOnsIncluded: ["Baseboards Detail", "Blinds Detail", "Inside Oven", "Inside Cabinets", "Interior Windows"],
          },
        },
        selectedOption: "best",
        recommendedOption: "best",
        frequencySelected: "one-time",
        subtotal: Math.round(data.beds * 60 + data.baths * 35 + data.sqft * 0.03),
        tax: 0,
        total: Math.round(data.beds * 60 + data.baths * 35 + data.sqft * 0.03),
      };

      const q = await apiPost("/api/quotes", quoteData) as any;

      const emailTo = user?.email;
      if (emailTo && q.id) {
        try {
          await apiPost(`/api/quotes/${q.id}/onboarding-send`, {
            to: emailTo,
            subject: "Here's your QuotePro quote preview",
          });
        } catch (mailErr: any) {
          apiDelete(`/api/quotes/${q.id}`).catch(() => {});
          const rethrown = new Error(
            mailErr?.message || "Quote was created but we couldn't send the preview email. Please try again."
          );
          (rethrown as any).status = mailErr?.status;
          throw rethrown;
        }
      }

      return q;
    },
    onSuccess: (data: any) => {
      trackEvent(AnalyticsEvents.ONBOARDING_GATE_QUOTE_GENERATED, { option: "own_home", failureCount });
      navigate(`/onboarding/complete?quoteId=${data.id}&from=own_home`);
    },
    onError: (error: any) => {
      setFailureCount((prev) => prev + 1);
      const status = error?.status as number | undefined;
      if (status === 429) {
        setIsServerOrRateLimitError(true);
        setApiError("Too many requests — please wait a minute and try again.");
      } else if (status !== undefined && status >= 500) {
        setIsServerOrRateLimitError(true);
        setApiError("Our servers are having trouble right now. Try again in a moment.");
      } else {
        setIsServerOrRateLimitError(false);
        setApiError("Something went wrong generating your quote. Please try again.");
      }
    },
  });

  function handleOptionA() {
    trackEvent(AnalyticsEvents.ONBOARDING_GATE_OPTION_SELECTED, { option: "real_lead" });
    navigate("/quotes/new?from=onboarding");
  }

  function handleOptionBStart() {
    trackEvent(AnalyticsEvents.ONBOARDING_GATE_OPTION_SELECTED, { option: "own_home" });
    setMode("own_home");
  }

  const businessAddress = (business as any)?.address || "";

  return (
    <div style={styles.page}>
      {skipWarning && (
        <Toast
          message={skipWarning}
          variant="error"
          onClose={() => setSkipWarning(null)}
        />
      )}
      <div style={styles.logoRow}>
        <span style={styles.logo}>QuotePro</span>
      </div>

      <div style={styles.center}>
        <div style={styles.header}>
          <h1 style={styles.headline}>Let's send your first quote.</h1>
          <p style={styles.subhead}>
            Takes 90 seconds. You'll see exactly how QuotePro works.
          </p>
        </div>

        {mode === "select" && (
          <div style={styles.cardRow}>
            <div style={styles.card}>
              <div style={styles.iconWrap}>
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <h3 style={styles.cardTitle}>Quote a real lead</h3>
              <p style={styles.cardDesc}>
                Enter a lead's details and generate a real quote you can send right now.
              </p>
              <button style={styles.outlineBtn} onClick={handleOptionA}>
                Start quote
              </button>
            </div>

            <div style={{ ...styles.card, border: "2px solid #0F6E56" }}>
              <div style={styles.recommendedBadge}>Recommended &mdash; fastest way to see it work</div>
              <div style={styles.iconWrap}>
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9,22 9,12 15,12 15,22" />
                </svg>
              </div>
              <h3 style={styles.cardTitle}>Quote your own home</h3>
              <p style={styles.cardDesc}>
                See QuotePro in action using your own address. Your quote will be emailed to you.
              </p>
              <button style={styles.primaryBtn} onClick={handleOptionBStart}>
                Try it on my home
              </button>
            </div>
          </div>
        )}

        {mode === "own_home" && (
          <div style={styles.ownHomeWrap}>
            <button
              style={styles.backLink}
              onClick={() => { setMode("select"); setApiError(undefined); setFailureCount(0); setIsServerOrRateLimitError(false); }}
            >
              &larr; Back
            </button>
            <h2 style={styles.subHeading}>Tell us about your home</h2>
            <p style={styles.subHead2}>We pre-filled what we know &mdash; adjust anything you like.</p>
            <AddressForm
              initialAddress={businessAddress}
              onSubmit={(d) => { setApiError(undefined); setIsServerOrRateLimitError(false); createQuoteMutation.mutate(d); }}
              loading={createQuoteMutation.isPending}
              error={apiError}
              failureCount={failureCount}
              isServerOrRateLimitError={isServerOrRateLimitError}
              onSkip={handleSkip}
              skipping={skipping}
            />
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#FAFAFA",
    display: "flex",
    flexDirection: "column",
  },
  logoRow: {
    padding: "24px 32px",
    borderBottom: "1px solid #F0F0F0",
  },
  logo: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0F6E56",
    letterSpacing: "-0.5px",
  },
  center: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 24px",
  },
  header: {
    textAlign: "center",
    marginBottom: 48,
  },
  headline: {
    fontSize: "clamp(24px, 5vw, 36px)",
    fontWeight: 800,
    color: "#0F172A",
    letterSpacing: "-1px",
    margin: "0 0 12px",
  },
  subhead: {
    fontSize: 18,
    color: "#64748B",
    margin: 0,
    lineHeight: 1.5,
  },
  cardRow: {
    display: "flex",
    gap: 20,
    width: "100%",
    maxWidth: 720,
    flexWrap: "wrap" as const,
    justifyContent: "center",
  },
  card: {
    background: "#fff",
    border: "1.5px solid #E2E8F0",
    borderRadius: 20,
    padding: "32px 28px",
    flex: "1 1 280px",
    maxWidth: 340,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    position: "relative" as const,
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
  },
  recommendedBadge: {
    position: "absolute" as const,
    top: -14,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#0F6E56",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    padding: "4px 14px",
    borderRadius: 20,
    whiteSpace: "nowrap" as const,
    letterSpacing: "0.3px",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: "#F0FDF9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0F172A",
    margin: 0,
  },
  cardDesc: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 1.6,
    margin: "0 0 8px",
    flex: 1,
  },
  primaryBtn: {
    background: "#0F6E56",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "14px 20px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    transition: "background 0.15s",
  },
  outlineBtn: {
    background: "#fff",
    color: "#0F172A",
    border: "1.5px solid #CBD5E1",
    borderRadius: 12,
    padding: "14px 20px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
    transition: "border-color 0.15s",
  },
  ownHomeWrap: {
    width: "100%",
    maxWidth: 440,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  backLink: {
    background: "none",
    border: "none",
    color: "#64748B",
    fontSize: 14,
    cursor: "pointer",
    alignSelf: "flex-start",
    padding: "4px 0",
    marginBottom: 8,
  },
  subHeading: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0F172A",
    margin: "0 0 4px",
    alignSelf: "flex-start",
  },
  subHead2: {
    fontSize: 14,
    color: "#64748B",
    margin: "0 0 20px",
    alignSelf: "flex-start",
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    border: "1.5px solid #E2E8F0",
    borderRadius: 10,
    padding: "11px 14px",
    fontSize: 15,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box" as const,
    background: "#fff",
  },
  errorBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: 10,
    padding: "10px 14px",
    marginBottom: 12,
    fontSize: 13,
    color: "#DC2626",
    lineHeight: 1.5,
  },
  skipLink: {
    background: "none",
    border: "none",
    color: "#94A3B8",
    fontSize: 13,
    cursor: "pointer",
    textDecoration: "underline",
    marginTop: 12,
    padding: "4px 0",
    textAlign: "center" as const,
    width: "100%",
  },
  skipInner: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    textDecoration: "none",
  },
  skipSpinner: {
    display: "inline-block",
    width: 12,
    height: 12,
    border: "2px solid #CBD5E1",
    borderTopColor: "#64748B",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
};
