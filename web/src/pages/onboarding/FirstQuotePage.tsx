import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth";
import { apiPost, apiDelete } from "../../lib/api";
import { AnalyticsEvents } from "../../../../shared/analytics-events";
import AddressAutocompleteLine from "../../components/AddressAutocompleteLine";
import { Toast } from "../../components/ui";

const BRAND_GREEN = "#0F6E56";
const BRAND_GREEN_DARK = "#0B5443";
const BRAND_GOLD = "#C9920A";

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
    <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 480 }}>
      <div style={{ marginBottom: 18 }}>
        <label style={styles.label}>Your home address</label>
        <AddressAutocompleteLine
          value={address}
          onChange={setAddress}
          placeholder="Start typing your address..."
          inputStyle={styles.input}
        />
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Bedrooms</label>
          <input type="number" min={1} max={10} style={styles.input} value={beds} onChange={(e) => setBeds(Number(e.target.value))} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Bathrooms</label>
          <input type="number" min={1} max={10} step={0.5} style={styles.input} value={baths} onChange={(e) => setBaths(Number(e.target.value))} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Sq ft</label>
          <input type="number" min={200} max={10000} step={100} style={styles.input} value={sqft} onChange={(e) => setSqft(Number(e.target.value))} />
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
      <button type="submit" className="qp-primary-btn" style={styles.primaryBtn} disabled={loading}>
        {loading ? (
          <span style={styles.btnInner}>
            <span style={styles.btnSpinner} aria-hidden="true" />
            Generating quote...
          </span>
        ) : failureCount > 0 ? "Try again" : "Generate my quote"}
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
          ) : "Skip this step and go to the dashboard"}
        </button>
      )}
    </form>
  );
}

// ── Custom illustrations ──────────────────────────────────────────────────
function LeadIllustration() {
  return (
    <svg width={64} height={64} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="leadGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E6F5EF" />
          <stop offset="100%" stopColor="#D1EDE2" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#leadGrad)" />
      {/* Document */}
      <rect x="16" y="14" width="28" height="36" rx="3" fill="#fff" stroke={BRAND_GREEN} strokeWidth="1.6" />
      <line x1="20" y1="22" x2="36" y2="22" stroke={BRAND_GREEN} strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
      <line x1="20" y1="28" x2="40" y2="28" stroke={BRAND_GREEN} strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
      <line x1="20" y1="34" x2="34" y2="34" stroke={BRAND_GREEN} strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
      {/* Check badge */}
      <circle cx="46" cy="46" r="10" fill={BRAND_GREEN} />
      <path d="M42 46l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function HomeIllustration() {
  return (
    <svg width={64} height={64} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="homeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E6F5EF" />
          <stop offset="100%" stopColor="#C7E8DA" />
        </linearGradient>
        <linearGradient id="roofGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND_GREEN} />
          <stop offset="100%" stopColor={BRAND_GREEN_DARK} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#homeGrad)" />
      {/* House body */}
      <rect x="16" y="30" width="32" height="22" rx="2" fill="#fff" stroke={BRAND_GREEN} strokeWidth="1.6" />
      {/* Roof */}
      <path d="M12 32 L32 14 L52 32 Z" fill="url(#roofGrad)" stroke={BRAND_GREEN_DARK} strokeWidth="1.4" strokeLinejoin="round" />
      {/* Door */}
      <rect x="28" y="38" width="8" height="14" rx="1" fill={BRAND_GREEN} opacity="0.85" />
      <circle cx="34" cy="45" r="0.8" fill={BRAND_GOLD} />
      {/* Windows */}
      <rect x="19" y="36" width="6" height="6" rx="0.8" fill="#E6F5EF" stroke={BRAND_GREEN} strokeWidth="1" />
      <rect x="39" y="36" width="6" height="6" rx="0.8" fill="#E6F5EF" stroke={BRAND_GREEN} strokeWidth="1" />
      {/* Sparkle */}
      <path d="M50 18l1.2 2.6 2.6 1.2-2.6 1.2L50 25.6l-1.2-2.6L46.2 22l2.6-1.2z" fill={BRAND_GOLD} opacity="0.9" />
    </svg>
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
    let skipFailed = false;
    try {
      await apiPost("/api/quotes/onboarding-skip", {});
      try { localStorage.removeItem("qp_pending_skip_retry"); } catch {}
    } catch (err) {
      console.error("[handleSkip] onboarding-skip API call failed:", err);
      skipFailed = true;
      try { localStorage.setItem("qp_pending_skip_retry", "1"); } catch {}
      setSkipWarning("Couldn't save your progress — retrying in the background");
    }
    try { await refresh(); } catch {}
    navigate("/dashboard");
    if (skipFailed) setSkipping(false);
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
      <style>{pageCss}</style>
      <div style={styles.bgDecor} aria-hidden="true" />

      {skipWarning && (
        <Toast message={skipWarning} variant="error" onClose={() => setSkipWarning(null)} />
      )}

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logoBlock}>
            <div style={styles.logoMark} aria-hidden="true">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={styles.logoText}>QuotePro</span>
          </div>

          <div style={styles.progressBlock} aria-label="Step 1 of 2">
            <span style={styles.progressLabel}>Step 1 of 2</span>
            <div style={styles.progressTrack}>
              <div style={styles.progressFill} />
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <main style={styles.main}>
        <div style={styles.content}>
          {/* Hero */}
          <section className="qp-fade-up" style={styles.hero}>
            <span style={styles.eyebrow}>
              <span style={styles.eyebrowDot} />
              Welcome to QuotePro
            </span>
            <h1 style={styles.headline}>Let's send your first quote.</h1>
            <p style={styles.subhead}>
              Takes 90 seconds. You'll see exactly how QuotePro works.
            </p>
            <p style={styles.proof}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={BRAND_GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polygon points="12,2 15,9 22,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 2,9.5 9,9" fill={BRAND_GOLD} />
              </svg>
              Trusted by 500+ cleaning professionals
            </p>
          </section>

          {mode === "select" && (
            <section className="qp-fade-up qp-delay-1" style={styles.cardRow}>
              {/* Option A — secondary */}
              <button
                type="button"
                onClick={handleOptionA}
                className="qp-card"
                style={styles.card}
                aria-label="Quote a real lead"
              >
                <div style={styles.cardIcon}><LeadIllustration /></div>
                <h3 style={styles.cardTitle}>Quote a real lead</h3>
                <p style={styles.cardDesc}>
                  Enter a lead's details and generate a real quote you can send right now.
                </p>
                <span style={styles.outlineBtn}>Start quote</span>
              </button>

              {/* Option B — primary, recommended */}
              <button
                type="button"
                onClick={handleOptionBStart}
                className="qp-card qp-card-recommended"
                style={{ ...styles.card, ...styles.cardRecommended }}
                aria-label="Quote your own home (recommended)"
              >
                <span style={styles.recommendedBadge}>
                  <svg width={10} height={10} viewBox="0 0 24 24" fill={BRAND_GOLD} aria-hidden="true">
                    <polygon points="12,2 15,9 22,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 2,9.5 9,9" />
                  </svg>
                  Recommended
                </span>
                <div style={styles.cardIcon}><HomeIllustration /></div>
                <h3 style={styles.cardTitle}>Quote your own home</h3>
                <p style={styles.cardDesc}>
                  See QuotePro in action using your own address. Your quote will be emailed to you.
                </p>
                <span className="qp-primary-btn" style={styles.primaryBtn}>Try it on my home</span>
              </button>
            </section>
          )}

          {mode === "own_home" && (
            <section className="qp-fade-up" style={styles.ownHomeWrap}>
              <button
                type="button"
                style={styles.backLink}
                onClick={() => { setMode("select"); setApiError(undefined); setFailureCount(0); setIsServerOrRateLimitError(false); }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Back
              </button>
              <div style={styles.formCard}>
                <h2 style={styles.subHeading}>Tell us about your home</h2>
                <p style={styles.subHead2}>We pre-filled what we know — adjust anything you like.</p>
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
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Page CSS (hover, animations, responsive) ──────────────────────────────
const pageCss = `
@keyframes qpFadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes spin { to { transform: rotate(360deg); } }
.qp-fade-up { animation: qpFadeUp 520ms cubic-bezier(0.22, 1, 0.36, 1) both; }
.qp-delay-1 { animation-delay: 120ms; }

.qp-card {
  text-align: left;
  cursor: pointer;
  transition: transform 220ms cubic-bezier(0.22,1,0.36,1), box-shadow 220ms ease, border-color 220ms ease;
  font-family: inherit;
}
.qp-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 24px 48px -16px rgba(15, 110, 86, 0.18), 0 8px 16px -8px rgba(15, 23, 42, 0.08);
}
.qp-card:focus-visible {
  outline: 3px solid ${BRAND_GREEN};
  outline-offset: 3px;
}
.qp-card-recommended:hover {
  border-color: ${BRAND_GREEN_DARK};
}

.qp-primary-btn {
  transition: background 180ms ease, box-shadow 180ms ease, transform 120ms ease;
}
.qp-card:hover .qp-primary-btn,
button.qp-primary-btn:hover {
  background: ${BRAND_GREEN_DARK};
  box-shadow: 0 8px 18px -6px rgba(15, 110, 86, 0.45);
}
button.qp-primary-btn:active { transform: translateY(1px); }
button.qp-primary-btn:disabled { opacity: 0.7; cursor: not-allowed; }

@media (max-width: 720px) {
  .qp-card:hover { transform: none; }
}
`;

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    position: "relative",
    background:
      "radial-gradient(1100px 700px at 85% -10%, rgba(15,110,86,0.10), transparent 60%)," +
      "radial-gradient(900px 600px at -10% 110%, rgba(201,146,10,0.08), transparent 55%)," +
      "linear-gradient(180deg, #FBFCFB 0%, #F5F8F6 100%)",
    display: "flex",
    flexDirection: "column",
    fontFamily:
      '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    overflowX: "hidden",
  },
  bgDecor: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.045) 1px, transparent 0)",
    backgroundSize: "24px 24px",
    opacity: 0.5,
    pointerEvents: "none",
    maskImage: "radial-gradient(ellipse at center, #000 30%, transparent 75%)",
    WebkitMaskImage: "radial-gradient(ellipse at center, #000 30%, transparent 75%)",
  },
  header: {
    position: "relative",
    zIndex: 1,
    padding: "20px 24px",
  },
  headerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  logoBlock: { display: "flex", alignItems: "center", gap: 10 },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: 9,
    background: `linear-gradient(135deg, ${BRAND_GREEN} 0%, ${BRAND_GREEN_DARK} 100%)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 10px -2px rgba(15,110,86,0.35)",
  },
  logoText: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0F172A",
    letterSpacing: "-0.4px",
  },
  progressBlock: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, minWidth: 120 },
  progressLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#64748B",
    letterSpacing: "0.3px",
    textTransform: "uppercase",
  },
  progressTrack: {
    width: 120,
    height: 4,
    background: "rgba(15,110,86,0.12)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    width: "50%",
    height: "100%",
    background: `linear-gradient(90deg, ${BRAND_GREEN} 0%, ${BRAND_GREEN_DARK} 100%)`,
    borderRadius: 999,
  },
  main: {
    position: "relative",
    zIndex: 1,
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 24px 64px",
  },
  content: {
    width: "100%",
    maxWidth: 1100,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  hero: {
    textAlign: "center",
    marginBottom: 48,
    maxWidth: 720,
  },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(15,110,86,0.08)",
    color: BRAND_GREEN_DARK,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
    padding: "6px 14px",
    borderRadius: 999,
    marginBottom: 20,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: BRAND_GREEN,
    boxShadow: `0 0 0 4px rgba(15,110,86,0.18)`,
  },
  headline: {
    fontSize: "clamp(32px, 5.4vw, 52px)",
    fontWeight: 700,
    color: "#0B1620",
    letterSpacing: "-1.6px",
    lineHeight: 1.06,
    margin: "0 0 16px",
  },
  subhead: {
    fontSize: "clamp(16px, 1.8vw, 19px)",
    color: "#475569",
    margin: "0 0 18px",
    lineHeight: 1.55,
    fontWeight: 500,
  },
  proof: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 600,
    color: "#64748B",
    margin: 0,
    letterSpacing: "0.1px",
  },
  cardRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 24,
    width: "100%",
    maxWidth: 880,
  },
  card: {
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: "1.5px solid #E6EBE9",
    borderRadius: 24,
    padding: 40,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    position: "relative",
    boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.08)",
    minHeight: 320,
  },
  cardRecommended: {
    border: `1.5px solid ${BRAND_GREEN}`,
    boxShadow:
      "0 1px 2px rgba(15,110,86,0.08), 0 16px 36px -16px rgba(15,110,86,0.28)",
    background:
      "linear-gradient(180deg, #FFFFFF 0%, #F7FBF9 100%)",
  },
  recommendedBadge: {
    position: "absolute",
    top: -12,
    right: 24,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#fff",
    color: BRAND_GREEN_DARK,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
    padding: "6px 12px",
    borderRadius: 999,
    border: `1.5px solid ${BRAND_GREEN}`,
    boxShadow: "0 4px 10px -4px rgba(15,110,86,0.25)",
  },
  cardIcon: {
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0B1620",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  cardDesc: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 1.6,
    margin: "0 0 12px",
    flex: 1,
  },
  primaryBtn: {
    background: BRAND_GREEN,
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "14px 28px",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "0.1px",
    cursor: "pointer",
    width: "100%",
    minHeight: 48,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px -4px rgba(15,110,86,0.35)",
  },
  outlineBtn: {
    background: "#fff",
    color: BRAND_GREEN_DARK,
    border: `1.5px solid ${BRAND_GREEN}`,
    borderRadius: 12,
    padding: "14px 28px",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "0.1px",
    cursor: "pointer",
    width: "100%",
    minHeight: 48,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  ownHomeWrap: {
    width: "100%",
    maxWidth: 560,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
  },
  backLink: {
    background: "none",
    border: "none",
    color: "#64748B",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    alignSelf: "flex-start",
    padding: "6px 0",
    marginBottom: 14,
    display: "inline-flex",
    alignItems: "center",
  },
  formCard: {
    background: "rgba(255,255,255,0.96)",
    border: "1.5px solid #E6EBE9",
    borderRadius: 24,
    padding: "36px 36px 32px",
    boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 16px 36px -20px rgba(15,23,42,0.18)",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
  },
  subHeading: {
    fontSize: 24,
    fontWeight: 700,
    color: "#0B1620",
    margin: "0 0 6px",
    letterSpacing: "-0.5px",
  },
  subHead2: {
    fontSize: 14,
    color: "#64748B",
    margin: "0 0 22px",
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
    padding: "12px 14px",
    fontSize: 15,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
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
  btnInner: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10 },
  btnSpinner: {
    display: "inline-block",
    width: 14,
    height: 14,
    border: "2px solid rgba(255,255,255,0.45)",
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
  skipLink: {
    background: "none",
    border: "none",
    color: "#94A3B8",
    fontSize: 13,
    cursor: "pointer",
    textDecoration: "underline",
    marginTop: 14,
    padding: "4px 0",
    textAlign: "center",
    width: "100%",
  },
  skipInner: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, textDecoration: "none" },
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
