import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth";
import { apiPost, apiDelete } from "../../lib/api";
import { AnalyticsEvents } from "../../../../shared/analytics-events";
import AddressAutocompleteLine from "../../components/AddressAutocompleteLine";
import { Toast } from "../../components/ui";
import { OwnHomeIcon } from "../../components/onboarding/OnboardingIcons";

const BRAND_GREEN = "#0F6E56";
const BRAND_GREEN_DARK = "#0B5443";
const BRAND_GOLD = "#C9920A";
const TEXT_DARK = "#1A1A1A";
const TEXT_MUTED = "#6B7280";
const TEXT_FAINT = "#9CA3AF";
const PAGE_BG = "#F8F9FA";
const RECOMMENDED_BG = "#F7FBF9";
const ICON_BG = "#E8F5F0";

function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  apiPost("/api/analytics/events", { eventName, properties: properties || {} }).catch(() => {});
}

// ── AddressForm (own-home flow) ───────────────────────────────────────────
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

// ── Tiny inline icons ─────────────────────────────────────────────────────
const ClockIcon = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const MailIcon = () => (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <polyline points="3,7 12,13 21,7" />
  </svg>
);
const PaperPlaneIcon = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={BRAND_GREEN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" fill="rgba(15,110,86,0.10)" />
  </svg>
);

// ── Mini auto-playing demo: a quote that builds itself ────────────────────
function DemoQuoteAnimation() {
  return (
    <div style={styles.demoWrap} aria-hidden="true">
      <div className="qp-demo-card" style={styles.demoCard}>
        {/* Header */}
        <div className="qp-demo-el qp-demo-header" style={styles.demoHeader}>
          <span style={styles.demoLogoMark}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span style={styles.demoLogoText}>QuotePro</span>
          <span style={{ flex: 1 }} />
          <span className="qp-demo-el qp-demo-sent" style={styles.demoSentBadge}>
            <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Sent
          </span>
        </div>

        {/* Address line that "types in" */}
        <div className="qp-demo-el qp-demo-addr" style={styles.demoAddr}>
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={TEXT_MUTED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="qp-demo-typing">123 Maple Street, Austin TX</span>
        </div>

        {/* Property pills */}
        <div style={styles.demoPills}>
          <span className="qp-demo-el qp-demo-pill-1" style={styles.demoPill}>3 bd</span>
          <span className="qp-demo-el qp-demo-pill-2" style={styles.demoPill}>2 ba</span>
          <span className="qp-demo-el qp-demo-pill-3" style={styles.demoPill}>1,800 sqft</span>
        </div>

        {/* Three quote tiers */}
        <div style={styles.demoTiers}>
          <div className="qp-demo-el qp-demo-tier-1" style={styles.demoTier}>
            <div style={styles.demoTierName}>Standard</div>
            <div style={styles.demoTierPrice}>$185</div>
          </div>
          <div className="qp-demo-el qp-demo-tier-2" style={styles.demoTier}>
            <div style={styles.demoTierName}>Deep Clean</div>
            <div style={styles.demoTierPrice}>$245</div>
          </div>
          <div className="qp-demo-el qp-demo-tier-3 qp-demo-tier-best" style={{ ...styles.demoTier, ...styles.demoTierBest }}>
            <div style={styles.demoTierBestBadge}>Best</div>
            <div style={{ ...styles.demoTierName, color: BRAND_GREEN_DARK }}>Premium</div>
            <div style={{ ...styles.demoTierPrice, color: BRAND_GREEN_DARK }}>$310</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Progress stepper ──────────────────────────────────────────────────────
function ProgressStepper() {
  const steps = [
    { label: "Send your first quote", active: true, done: false },
    { label: "Set up your services", active: false, done: false },
    { label: "Connect your calendar", active: false, done: false },
  ];
  return (
    <div style={styles.stepperWrap} aria-label="Onboarding progress">
      <div style={styles.stepperLine} />
      {steps.map((s, i) => (
        <div key={i} style={styles.stepItem}>
          <div style={{ ...styles.stepDot, ...(s.active ? styles.stepDotActive : styles.stepDotIdle) }}>
            {s.active ? <span style={styles.stepDotInner} /> : <span style={styles.stepNumber}>{i + 1}</span>}
          </div>
          <span style={{ ...styles.stepLabel, color: s.active ? BRAND_GREEN_DARK : TEXT_FAINT, fontWeight: s.active ? 700 : 500 }}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
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

      {/* Animated aurora behind hero */}
      <div className="qp-aurora" style={styles.aurora} aria-hidden="true">
        <div className="qp-aurora-blob qp-aurora-green" />
        <div className="qp-aurora-blob qp-aurora-gold" />
      </div>

      {skipWarning && (
        <Toast message={skipWarning} variant="error" onClose={() => setSkipWarning(null)} />
      )}

      {/* Slim brand bar */}
      <header style={styles.topBar}>
        <div style={styles.topBarInner}>
          <div style={styles.logoBlock}>
            <div style={styles.logoMark} aria-hidden="true">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={styles.logoText}>QuotePro</span>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.content}>
          {/* Hero */}
          <section className="qp-fade-up" style={styles.hero}>
            <h1 style={styles.headline}>Let's send your first quote.</h1>
            <p style={styles.subhead}>Takes 90 seconds. You'll see exactly how QuotePro works.</p>
          </section>

          {/* Stepper */}
          <div className="qp-fade-up qp-delay-1">
            <ProgressStepper />
          </div>

          {mode === "select" && (
            <>
              {/* Demo animation */}
              <div className="qp-fade-up qp-delay-2 qp-demo-container">
                <DemoQuoteAnimation />
              </div>

              {/* Cards */}
              <section className="qp-card-grid">
                {/* Card 1 — Quote a real lead */}
                <button
                  type="button"
                  onClick={handleOptionA}
                  className="qp-card qp-fade-up qp-delay-3"
                  style={styles.card}
                  aria-label="Quote a real lead"
                >
                  <div style={{ ...styles.cardIconCircle, background: ICON_BG }}>
                    <PaperPlaneIcon />
                  </div>
                  <h3 style={styles.cardTitle}>Quote a real lead</h3>
                  <p style={styles.cardDesc}>
                    Enter a lead's details and generate a real quote you can send right now.
                  </p>
                  <span style={styles.timeBadge}>
                    <ClockIcon />
                    ~90 seconds
                  </span>
                  <span style={styles.outlineBtn}>
                    Start quote
                    <span style={styles.btnArrow}>→</span>
                  </span>
                </button>

                {/* Card 2 — Try it on your own home (recommended) */}
                <button
                  type="button"
                  onClick={handleOptionBStart}
                  className="qp-card qp-card-recommended qp-fade-up qp-delay-4"
                  style={{ ...styles.card, ...styles.cardRecommended }}
                  aria-label="Try it on your own home (recommended)"
                >
                  <span style={styles.recommendedBadge}>
                    <svg width={10} height={10} viewBox="0 0 24 24" fill={BRAND_GOLD} aria-hidden="true">
                      <polygon points="12,2 15,9 22,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 2,9.5 9,9" />
                    </svg>
                    Recommended — fastest way to see it work
                  </span>
                  <div style={{ ...styles.cardIconCircle, background: ICON_BG }}>
                    <OwnHomeIcon size={44} />
                  </div>
                  <h3 style={styles.cardTitle}>Try it on your own home</h3>
                  <p style={styles.cardDesc}>
                    See QuotePro in action using your own address. Your quote will be emailed to you.
                  </p>
                  <span style={styles.timeBadge}>
                    <MailIcon />
                    Quote arrives in your inbox
                  </span>
                  <span className="qp-primary-btn" style={styles.primaryBtn}>
                    Try it on my home
                    <span style={styles.btnArrow}>→</span>
                  </span>
                </button>
              </section>

              {/* Social proof */}
              <p className="qp-fade-up qp-delay-5" style={styles.socialProof}>
                <svg width={13} height={13} viewBox="0 0 24 24" fill={BRAND_GOLD} aria-hidden="true" style={{ marginRight: 4 }}>
                  <polygon points="12,2 15,9 22,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 2,9.5 9,9" />
                </svg>
                <span style={{ color: BRAND_GOLD, fontWeight: 700 }}>4.9</span>
                &nbsp;from 127 reviews · Trusted by cleaning pros nationwide
              </p>
            </>
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

// ── Page CSS (animations, hover, responsive) ──────────────────────────────
const pageCss = `
@keyframes qpFadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes spin { to { transform: rotate(360deg); } }

@keyframes qpAuroraGreen {
  0%   { transform: translate(-15%, -10%) scale(1); }
  50%  { transform: translate(20%, 10%) scale(1.15); }
  100% { transform: translate(-15%, -10%) scale(1); }
}
@keyframes qpAuroraGold {
  0%   { transform: translate(20%, 5%) scale(1.1); }
  50%  { transform: translate(-10%, -10%) scale(0.95); }
  100% { transform: translate(20%, 5%) scale(1.1); }
}

.qp-fade-up { animation: qpFadeUp 520ms cubic-bezier(0.22, 1, 0.36, 1) both; }
.qp-delay-1 { animation-delay: 120ms; }
.qp-delay-2 { animation-delay: 220ms; }
.qp-delay-3 { animation-delay: 340ms; }
.qp-delay-4 { animation-delay: 460ms; }
.qp-delay-5 { animation-delay: 600ms; }

.qp-aurora-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  will-change: transform;
}
.qp-aurora-green {
  width: 520px; height: 520px;
  top: -120px; left: 10%;
  background: rgba(15, 110, 86, 0.12);
  animation: qpAuroraGreen 18s ease-in-out infinite;
}
.qp-aurora-gold {
  width: 460px; height: 460px;
  top: -80px; right: 5%;
  background: rgba(201, 146, 10, 0.08);
  animation: qpAuroraGold 22s ease-in-out infinite;
}

.qp-card {
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
}
.qp-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.06), 0 12px 28px rgba(0,0,0,0.08);
}
.qp-card-recommended:hover {
  box-shadow: 0 0 28px rgba(15,110,86,0.14), 0 12px 28px rgba(15,110,86,0.12);
  border-color: ${BRAND_GREEN_DARK};
}
.qp-card:focus-visible {
  outline: 3px solid ${BRAND_GREEN};
  outline-offset: 3px;
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

.qp-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  width: 100%;
}
@media (max-width: 720px) {
  .qp-card-grid { grid-template-columns: 1fr; }
  .qp-card-recommended { order: -1; }
  .qp-card:hover { transform: none; }
}
@media (max-width: 480px) {
  .qp-demo-container { display: none; }
}

/* ── Demo animation: builds a quote card over ~8s, loops infinitely ── */
@keyframes qpDemoIn {
  0%, 100% { opacity: 0; transform: translateY(6px); }
  6%, 92%  { opacity: 1; transform: translateY(0); }
}
@keyframes qpDemoTyping {
  0%, 100% { width: 0; }
  10%, 92% { width: 100%; }
}
@keyframes qpDemoBest {
  0%, 38%, 100% {
    box-shadow: 0 0 0 0 rgba(15,110,86,0);
    border-color: rgba(15,110,86,0.10);
    background: #fff;
  }
  44%, 92% {
    box-shadow: 0 0 0 2px ${BRAND_GREEN}, 0 6px 18px -6px rgba(15,110,86,0.30);
    border-color: ${BRAND_GREEN};
    background: ${RECOMMENDED_BG};
  }
}

.qp-demo-card {
  animation: qpDemoIn 8s ease-in-out infinite;
}
.qp-demo-el {
  opacity: 0;
  animation: qpDemoIn 8s ease-in-out infinite;
}
.qp-demo-header  { animation-delay: 0.3s; }
.qp-demo-addr    { animation-delay: 0.9s; }
.qp-demo-pill-1  { animation-delay: 1.6s; }
.qp-demo-pill-2  { animation-delay: 1.8s; }
.qp-demo-pill-3  { animation-delay: 2.0s; }
.qp-demo-tier-1  { animation-delay: 2.6s; }
.qp-demo-tier-2  { animation-delay: 2.9s; }
.qp-demo-tier-3  { animation-delay: 3.2s; }
.qp-demo-sent    { animation-delay: 4.6s; }

.qp-demo-tier-best {
  animation: qpDemoBest 8s ease-in-out infinite;
}
.qp-demo-typing {
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  vertical-align: bottom;
  width: 0;
  animation: qpDemoTyping 8s steps(28, end) infinite;
  animation-delay: 0.9s;
}
`;

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    position: "relative",
    background: PAGE_BG,
    display: "flex",
    flexDirection: "column",
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    overflowX: "hidden",
  },
  aurora: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 520,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: 0,
  },
  topBar: {
    position: "relative",
    zIndex: 2,
    padding: "20px 24px",
  },
  topBarInner: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoBlock: { display: "flex", alignItems: "center", gap: 10 },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: `linear-gradient(135deg, ${BRAND_GREEN} 0%, ${BRAND_GREEN_DARK} 100%)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 10px -2px rgba(15,110,86,0.35)",
  },
  logoText: {
    fontSize: 17,
    fontWeight: 800,
    color: TEXT_DARK,
    letterSpacing: "-0.4px",
    fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
  },
  main: {
    position: "relative",
    zIndex: 1,
    flex: 1,
    display: "flex",
    justifyContent: "center",
    padding: "24px 24px 64px",
  },
  content: {
    width: "100%",
    maxWidth: 720,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 28,
  },
  hero: { textAlign: "center", maxWidth: 640 },
  headline: {
    fontSize: "clamp(1.5rem, 4.4vw, 2.4rem)",
    fontWeight: 800,
    color: TEXT_DARK,
    letterSpacing: "-1.2px",
    lineHeight: 1.1,
    margin: "8px 0 12px",
    fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
  },
  subhead: {
    fontSize: "1.1rem",
    color: TEXT_MUTED,
    margin: 0,
    lineHeight: 1.55,
    fontWeight: 400,
  },

  // Stepper
  stepperWrap: {
    position: "relative",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
    maxWidth: 560,
    margin: "0 auto",
    padding: "0 8px",
  },
  stepperLine: {
    position: "absolute",
    top: 11,
    left: 40,
    right: 40,
    height: 2,
    background: "#E5E7EB",
    zIndex: 0,
  },
  stepItem: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff",
    transition: "all 200ms ease",
  },
  stepDotActive: {
    background: BRAND_GREEN,
    boxShadow: `0 0 0 4px rgba(15,110,86,0.15)`,
  },
  stepDotIdle: {
    background: "#fff",
    border: "2px solid #E5E7EB",
  },
  stepDotInner: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#fff",
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: 700,
    color: TEXT_FAINT,
  },
  stepLabel: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 1.3,
    letterSpacing: "0.1px",
    maxWidth: 120,
  },

  // Demo card
  demoWrap: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    padding: "4px 0",
  },
  demoCard: {
    width: "100%",
    maxWidth: 320,
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    padding: "16px 18px 18px",
    border: "1px solid #EEF1F0",
  },
  demoHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  demoLogoMark: {
    width: 18,
    height: 18,
    borderRadius: 5,
    background: BRAND_GREEN,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  demoLogoText: {
    fontSize: 12,
    fontWeight: 800,
    color: TEXT_DARK,
    letterSpacing: "-0.2px",
    fontFamily: '"Plus Jakarta Sans", sans-serif',
  },
  demoSentBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: "rgba(15,110,86,0.10)",
    color: BRAND_GREEN_DARK,
    fontSize: 10,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 999,
    letterSpacing: "0.3px",
    textTransform: "uppercase",
  },
  demoAddr: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: TEXT_MUTED,
    marginBottom: 10,
    overflow: "hidden",
  },
  demoPills: {
    display: "flex",
    gap: 6,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  demoPill: {
    fontSize: 10.5,
    fontWeight: 600,
    color: TEXT_MUTED,
    background: "#F3F4F6",
    padding: "3px 9px",
    borderRadius: 999,
  },
  demoTiers: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 6,
  },
  demoTier: {
    position: "relative",
    background: "#fff",
    border: "1.5px solid #EEF1F0",
    borderRadius: 10,
    padding: "10px 8px",
    textAlign: "center",
    transition: "all 200ms ease",
  },
  demoTierBest: {},
  demoTierBestBadge: {
    position: "absolute",
    top: -7,
    left: "50%",
    transform: "translateX(-50%)",
    background: BRAND_GREEN,
    color: "#fff",
    fontSize: 8.5,
    fontWeight: 800,
    padding: "2px 7px",
    borderRadius: 999,
    letterSpacing: "0.4px",
    textTransform: "uppercase",
  },
  demoTierName: {
    fontSize: 10,
    fontWeight: 600,
    color: TEXT_MUTED,
    marginBottom: 2,
    letterSpacing: "0.2px",
  },
  demoTierPrice: {
    fontSize: 16,
    fontWeight: 800,
    color: TEXT_DARK,
    fontFamily: '"Plus Jakarta Sans", sans-serif',
    letterSpacing: "-0.3px",
  },

  // Cards
  card: {
    background: "#fff",
    border: "1px solid #EEF1F0",
    borderRadius: 16,
    padding: 28,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    position: "relative",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)",
    minHeight: 280,
  },
  cardRecommended: {
    border: `2px solid ${BRAND_GREEN}`,
    background: RECOMMENDED_BG,
    boxShadow:
      "0 0 20px rgba(15,110,86,0.08), 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)",
    paddingTop: 32,
  },
  recommendedBadge: {
    position: "absolute",
    top: -12,
    left: 20,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#fff",
    color: BRAND_GREEN_DARK,
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    padding: "5px 11px",
    borderRadius: 20,
    border: `2px solid ${BRAND_GREEN}`,
    boxShadow: "0 4px 10px -4px rgba(15,110,86,0.25)",
    whiteSpace: "nowrap",
  },
  cardIconCircle: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: TEXT_DARK,
    margin: 0,
    letterSpacing: "-0.4px",
    fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
  },
  cardDesc: {
    fontSize: 14.5,
    color: TEXT_MUTED,
    lineHeight: 1.55,
    margin: 0,
    flex: 1,
  },
  timeBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 11.5,
    fontWeight: 600,
    color: TEXT_FAINT,
    background: "#F3F4F6",
    padding: "5px 10px",
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  primaryBtn: {
    background: BRAND_GREEN,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "13px 22px",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "0.1px",
    cursor: "pointer",
    width: "100%",
    minHeight: 48,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
    boxShadow: "0 4px 12px -4px rgba(15,110,86,0.35)",
  },
  outlineBtn: {
    background: "#fff",
    color: BRAND_GREEN_DARK,
    border: `1.5px solid ${BRAND_GREEN}`,
    borderRadius: 10,
    padding: "13px 22px",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "0.1px",
    cursor: "pointer",
    width: "100%",
    minHeight: 48,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  btnArrow: { display: "inline-block", transform: "translateY(-1px)" },

  socialProof: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: "0.9rem",
    color: TEXT_FAINT,
    margin: 0,
    textAlign: "center",
    flexWrap: "wrap",
    justifyContent: "center",
  },

  // Own-home form
  ownHomeWrap: {
    width: "100%",
    maxWidth: 560,
    display: "flex",
    flexDirection: "column",
  },
  backLink: {
    background: "none",
    border: "none",
    color: TEXT_MUTED,
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
    background: "#fff",
    border: "1px solid #EEF1F0",
    borderRadius: 16,
    padding: "32px 32px 28px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)",
    display: "flex",
    flexDirection: "column",
  },
  subHeading: {
    fontSize: 22,
    fontWeight: 700,
    color: TEXT_DARK,
    margin: "0 0 6px",
    letterSpacing: "-0.4px",
    fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
  },
  subHead2: { fontSize: 14, color: TEXT_MUTED, margin: "0 0 22px" },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    border: "1.5px solid #E5E7EB",
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
    color: TEXT_FAINT,
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
    borderTopColor: TEXT_MUTED,
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
};
