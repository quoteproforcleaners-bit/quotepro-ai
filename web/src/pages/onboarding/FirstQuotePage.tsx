import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth";
import { apiPost, apiDelete } from "../../lib/api";
import { AnalyticsEvents } from "../../../../shared/analytics-events";
import AddressAutocompleteLine from "../../components/AddressAutocompleteLine";
import { Toast } from "../../components/ui";
import { OwnHomeIcon } from "../../components/onboarding/OnboardingIcons";

// Cool, restrained palette — no warm beige/tan anywhere on this page.
const BRAND_GREEN = "#0F6E56";
const BRAND_GREEN_DARK = "#0B5443";
const BRAND_GREEN_TINT = "#EEF7F3";
const BRAND_GREEN_RECCARD = "#F6FAF8";
const WIN_GOLD = "#C9920A"; // only for the 4.9 in the social proof line + tiny stars
const TEXT_INK = "#111827";
const TEXT_BODY = "#374151";
const TEXT_MUTED = "#6B7280";
const TEXT_FAINT = "#9CA3AF";
const HAIRLINE = "#E5E7EB";
const COOL_TINT = "#E8EEF4";
const PAGE_GRAD_TOP = "#FFFFFF";
const PAGE_GRAD_BOT = "#F7F9FC";

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

// ── Inline icons ──────────────────────────────────────────────────────────
const ClockIcon = ({ size = 14, color = TEXT_FAINT }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const MailIcon = ({ size = 14, color = TEXT_FAINT }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <polyline points="3,7 12,13 21,7" />
  </svg>
);
const PaperPlaneIcon = ({ size = 22, color = BRAND_GREEN }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" fill="rgba(15,110,86,0.10)" />
  </svg>
);
const StarIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={WIN_GOLD} aria-hidden="true">
    <polygon points="12,2 15,9 22,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 2,9.5 9,9" />
  </svg>
);
const CheckIcon = ({ size = 12, color = "#fff" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Demo glass card: 5-phase animation driven by React state ─────────────
const DEMO_ADDRESS = "123 Maple Street, Austin TX";

function DemoQuoteAnimation() {
  // phase: 0=enter details, 1=AI loading, 2=tiers revealed, 3=send pressed, 4=hold/fade
  const [phase, setPhase] = useState(0);
  const [typed, setTyped] = useState("");
  const [pressed, setPressed] = useState(false);
  const [toast, setToast] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [loopKey, setLoopKey] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    function clearAll() {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    }
    function schedule(ms: number, fn: () => void) {
      timers.current.push(setTimeout(fn, ms));
    }

    // Reset for this loop iteration.
    setPhase(0);
    setTyped("");
    setPressed(false);
    setToast(false);
    setFadingOut(false);

    // Phase 1: type address character-by-character (0 → 1500ms).
    const TYPE_DURATION = 1100;
    const stepMs = Math.max(28, Math.floor(TYPE_DURATION / DEMO_ADDRESS.length));
    for (let i = 1; i <= DEMO_ADDRESS.length; i++) {
      schedule(i * stepMs, () => setTyped(DEMO_ADDRESS.slice(0, i)));
    }

    // Phase 2: AI loading shimmer (1500 → 2500ms).
    schedule(1500, () => setPhase(1));
    // Phase 3: tier rows resolve (2500 → 5500ms).
    schedule(2500, () => setPhase(2));
    // Phase 4: send button + ripple + toast (5500 → 7500ms).
    schedule(5500, () => setPhase(3));
    schedule(6000, () => setPressed(true));
    schedule(6300, () => setToast(true));
    // Phase 5: hold then fade out (7500 → 10000ms).
    schedule(8500, () => setFadingOut(true));
    schedule(10000, () => setLoopKey((k) => k + 1));

    return clearAll;
  }, [loopKey]);

  return (
    <div style={styles.demoWrap} aria-hidden="true">
      <div className={`qp-demo-card${fadingOut ? " qp-demo-fadeout" : ""}`} style={styles.demoCard}>
        {/* In-card sent toast */}
        <div style={{ ...styles.demoToast, opacity: toast ? 1 : 0, transform: toast ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(-10px)" }}>
          <span style={styles.demoToastCheck}><CheckIcon size={10} /></span>
          <span>Quote sent to customer</span>
        </div>

        {/* Phase 1 — form with typing address + property pills */}
        <div style={{ ...styles.demoBlock, opacity: phase === 0 ? 1 : 0, pointerEvents: "none", position: phase === 0 ? "relative" : "absolute" }}>
          <div style={styles.demoFormLabel}>Home details</div>
          <div style={styles.demoInput}>
            <span style={{ color: TEXT_INK }}>{typed}</span>
            <span className="qp-demo-caret" />
          </div>
          <div style={styles.demoPills}>
            <span style={{ ...styles.demoPill, animationDelay: "0.4s" }} className="qp-demo-pill-fade">3 bed</span>
            <span style={{ ...styles.demoPill, animationDelay: "0.65s" }} className="qp-demo-pill-fade">2 bath</span>
            <span style={{ ...styles.demoPill, animationDelay: "0.9s" }} className="qp-demo-pill-fade">1,800 sqft</span>
          </div>
        </div>

        {/* Phase 2 — AI shimmer skeleton */}
        <div style={{ ...styles.demoBlock, opacity: phase === 1 ? 1 : 0, pointerEvents: "none", position: phase === 1 ? "relative" : "absolute" }}>
          <div style={styles.demoFormLabel}>Generating quote</div>
          <div style={styles.demoSkeletonRow}><div className="qp-shimmer" style={styles.demoSkeleton} /></div>
          <div style={styles.demoSkeletonRow}><div className="qp-shimmer" style={styles.demoSkeleton} /></div>
          <div style={styles.demoSkeletonRow}><div className="qp-shimmer" style={styles.demoSkeleton} /></div>
          <div style={styles.demoAILabel} className="qp-pulse">AI analyzing property...</div>
        </div>

        {/* Phase 3+ — three tier rows + send button */}
        <div style={{ ...styles.demoBlock, opacity: phase >= 2 ? 1 : 0, pointerEvents: "none", position: phase >= 2 ? "relative" : "absolute" }}>
          <div style={styles.demoFormLabel}>Your 3-tier quote</div>
          <div style={styles.demoTiers}>
            {[
              { name: "Standard Clean", price: "$185", best: false },
              { name: "Deep Clean", price: "$265", best: false },
              { name: "Premium Clean", price: "$340", best: true },
            ].map((t, i) => (
              <div
                key={t.name}
                className={phase >= 2 ? "qp-tier-in" : ""}
                style={{
                  ...styles.demoTierRow,
                  borderBottom: i < 2 ? `1px solid ${HAIRLINE}` : "none",
                  animationDelay: `${i * 0.15}s`,
                }}
              >
                <span style={{ ...styles.demoTierName, color: TEXT_BODY, fontWeight: t.best ? 700 : 500 }}>{t.name}</span>
                <span style={styles.demoTierRight}>
                  {t.best && <span style={styles.demoBestPill}>Best Value</span>}
                  <span style={{ ...styles.demoTierPrice, color: t.best ? BRAND_GREEN : TEXT_BODY, fontWeight: t.best ? 800 : 600 }}>{t.price}</span>
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            tabIndex={-1}
            disabled
            className={pressed ? "qp-demo-btn qp-demo-btn-pressed" : "qp-demo-btn"}
            style={{
              ...styles.demoSendBtn,
              opacity: phase >= 3 ? 1 : 0,
              transform: phase >= 3 ? "translateY(0)" : "translateY(8px)",
            }}
          >
            Send Quote
          </button>
        </div>
      </div>
      <p style={styles.demoCaption}>This is what your customers will see — in under 60 seconds.</p>
    </div>
  );
}

// ── Progress stepper (responsive: full on desktop, compact on mobile) ─────
function ProgressStepper() {
  const steps = [
    { label: "Send your first quote", active: true },
    { label: "Set up your services", active: false },
    { label: "Connect your calendar", active: false },
  ];
  return (
    <>
      <div style={styles.stepperWrap} className="qp-stepper-full" aria-label="Onboarding progress">
        <div style={styles.stepperLine} />
        {steps.map((s, i) => (
          <div key={i} style={styles.stepItem}>
            <div style={{ ...styles.stepDot, ...(s.active ? styles.stepDotActive : styles.stepDotIdle) }}>
              {s.active ? <span style={styles.stepDotInner} /> : <span style={styles.stepNumber}>{i + 1}</span>}
            </div>
            <span style={{ ...styles.stepLabel, color: s.active ? TEXT_INK : TEXT_FAINT, fontWeight: s.active ? 600 : 500 }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
      <div style={styles.stepperCompact} className="qp-stepper-compact" aria-label="Onboarding progress">
        Step 1 of 3
      </div>
    </>
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

      {/* Subtle cool ambient blobs (very light blue-gray, no warm tones) */}
      <div className="qp-ambient" aria-hidden="true">
        <div className="qp-ambient-blob qp-ambient-a" />
        <div className="qp-ambient-blob qp-ambient-b" />
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
          <div className="qp-fade-up qp-delay-1" style={{ width: "100%", display: "flex", justifyContent: "center" }}>
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
                  <div style={{ ...styles.cardIconCircle, background: BRAND_GREEN_TINT }}>
                    <PaperPlaneIcon size={22} />
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
                  <span style={styles.recommendedBadge}>Recommended</span>
                  <div style={{ ...styles.cardIconCircle, background: BRAND_GREEN_TINT }}>
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
                <span style={styles.starsRow} aria-hidden="true">
                  <StarIcon /><StarIcon /><StarIcon /><StarIcon /><StarIcon />
                </span>
                Rated&nbsp;<span style={{ color: WIN_GOLD, fontWeight: 700 }}>4.9</span>&nbsp;stars by 127 cleaning businesses
              </p>

              {/* Footer breathing room */}
              <div style={{ height: 40 }} />
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

@keyframes qpAmbientA {
  0%   { transform: translate(-10%, -8%) scale(1); }
  50%  { transform: translate(8%, 6%) scale(1.08); }
  100% { transform: translate(-10%, -8%) scale(1); }
}
@keyframes qpAmbientB {
  0%   { transform: translate(8%, 4%) scale(1.05); }
  50%  { transform: translate(-6%, -6%) scale(0.97); }
  100% { transform: translate(8%, 4%) scale(1.05); }
}

.qp-ambient {
  position: absolute;
  inset: 0 0 auto 0;
  height: 560px;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}
.qp-ambient-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  will-change: transform;
}
.qp-ambient-a {
  width: 520px; height: 520px;
  top: -160px; left: 6%;
  background: rgba(232, 238, 244, 0.85);
  animation: qpAmbientA 22s ease-in-out infinite;
}
.qp-ambient-b {
  width: 460px; height: 460px;
  top: -120px; right: 4%;
  background: rgba(15, 110, 86, 0.06);
  animation: qpAmbientB 26s ease-in-out infinite;
}

.qp-fade-up { animation: qpFadeUp 520ms cubic-bezier(0.22, 1, 0.36, 1) both; }
.qp-delay-1 { animation-delay: 100ms; }
.qp-delay-2 { animation-delay: 200ms; }
.qp-delay-3 { animation-delay: 320ms; }
.qp-delay-4 { animation-delay: 440ms; }
.qp-delay-5 { animation-delay: 700ms; }

/* Cards */
.qp-card {
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1),
              border-color 250ms cubic-bezier(0.4, 0, 0.2, 1);
}
.qp-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.06);
  border-color: #D1D5DB;
}
.qp-card-recommended:hover {
  border-color: ${BRAND_GREEN_DARK};
  box-shadow: 0 4px 8px rgba(15,110,86,0.08), 0 16px 36px rgba(15,110,86,0.10);
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
  max-width: 680px;
  margin: 0 auto;
}

/* Stepper visibility */
.qp-stepper-compact { display: none; }

@media (max-width: 768px) {
  .qp-card-grid { grid-template-columns: 1fr; gap: 16px; padding: 0 4px; }
  .qp-card-recommended { order: -1; }
  .qp-card:hover { transform: none; }
}
@media (max-width: 480px) {
  .qp-demo-container { display: none; }
  .qp-stepper-full { display: none !important; }
  .qp-stepper-compact { display: block; }
}

/* ── Demo card animations ── */
@keyframes qpDemoFadeOut {
  to { opacity: 0; transform: translateY(-4px); }
}
.qp-demo-fadeout { animation: qpDemoFadeOut 500ms ease forwards; }

@keyframes qpPillIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.qp-demo-pill-fade {
  opacity: 0;
  animation: qpPillIn 320ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes qpCaretBlink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
.qp-demo-caret {
  display: inline-block;
  width: 1.5px;
  height: 14px;
  margin-left: 2px;
  background: ${BRAND_GREEN};
  vertical-align: -2px;
  animation: qpCaretBlink 700ms steps(1) infinite;
}

@keyframes qpShimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.qp-shimmer {
  background: linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%);
  background-size: 200% 100%;
  animation: qpShimmer 1.4s linear infinite;
}

@keyframes qpPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
.qp-pulse { animation: qpPulse 1.6s ease-in-out infinite; }

@keyframes qpTierIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.qp-tier-in {
  opacity: 0;
  animation: qpTierIn 380ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes qpRipple {
  0%   { box-shadow: 0 0 0 0 rgba(15,110,86,0.45); }
  100% { box-shadow: 0 0 0 14px rgba(15,110,86,0); }
}
.qp-demo-btn-pressed { animation: qpRipple 600ms ease-out 1; }
`;

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    position: "relative",
    background: `linear-gradient(180deg, ${PAGE_GRAD_TOP} 0%, ${PAGE_GRAD_BOT} 100%)`,
    display: "flex",
    flexDirection: "column",
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    overflowX: "hidden",
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
    color: TEXT_INK,
    letterSpacing: "-0.4px",
    fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
  },
  main: {
    position: "relative",
    zIndex: 1,
    flex: 1,
    display: "flex",
    justifyContent: "center",
    padding: "28px 24px 80px",
  },
  content: {
    width: "100%",
    maxWidth: 720,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 32,
  },
  hero: { textAlign: "center", maxWidth: 560, marginTop: 20 },
  headline: {
    fontSize: "clamp(1.75rem, 4.4vw, 2.5rem)",
    fontWeight: 700,
    color: TEXT_INK,
    letterSpacing: "-0.02em",
    lineHeight: 1.1,
    margin: "0 0 16px",
    fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
  },
  subhead: {
    fontSize: "clamp(1rem, 2.4vw, 1.125rem)",
    color: TEXT_MUTED,
    margin: "0 auto",
    lineHeight: 1.55,
    fontWeight: 400,
    maxWidth: 400,
  },

  // Stepper
  stepperWrap: {
    position: "relative",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
    maxWidth: 480,
    padding: "0 8px",
  },
  stepperCompact: {
    fontSize: 13,
    fontWeight: 600,
    color: TEXT_MUTED,
    letterSpacing: "0.3px",
    textTransform: "uppercase",
  },
  stepperLine: {
    position: "absolute",
    top: 11,
    left: 40,
    right: 40,
    height: 2,
    background: HAIRLINE,
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
    boxShadow: `0 0 0 4px rgba(15,110,86,0.12)`,
  },
  stepDotIdle: {
    background: "#fff",
    border: `2px solid ${HAIRLINE}`,
  },
  stepDotInner: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#fff",
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: 700,
    color: TEXT_FAINT,
  },
  stepLabel: {
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 1.3,
    letterSpacing: "0.1px",
    maxWidth: 130,
  },

  // Demo
  demoWrap: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 14,
    padding: "4px 0",
  },
  demoCard: {
    position: "relative",
    width: "100%",
    maxWidth: 440,
    minHeight: 230,
    background: "rgba(255,255,255,0.72)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.6)",
    borderRadius: 20,
    padding: "20px 22px 22px",
    boxShadow:
      "0 1px 2px rgba(17, 24, 39, 0.04), 0 8px 24px rgba(17, 24, 39, 0.06), 0 24px 48px rgba(17, 24, 39, 0.05)",
    transition: "opacity 400ms ease, transform 400ms ease",
  },
  demoBlock: {
    top: 20,
    left: 22,
    right: 22,
    bottom: 22,
    transition: "opacity 380ms cubic-bezier(0.4,0,0.2,1)",
  },
  demoFormLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: TEXT_FAINT,
    letterSpacing: "0.6px",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  demoInput: {
    width: "100%",
    minHeight: 38,
    background: "#fff",
    border: `1px solid ${HAIRLINE}`,
    borderRadius: 10,
    padding: "9px 12px",
    fontSize: 13,
    color: TEXT_INK,
    marginBottom: 12,
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  demoPills: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  demoPill: {
    fontSize: 11.5,
    fontWeight: 600,
    color: TEXT_BODY,
    background: "#F3F4F6",
    padding: "5px 11px",
    borderRadius: 999,
  },
  demoSkeletonRow: { marginBottom: 8, height: 14 },
  demoSkeleton: {
    height: 14,
    borderRadius: 7,
    width: "100%",
  },
  demoAILabel: {
    marginTop: 12,
    fontSize: 12,
    color: TEXT_FAINT,
    textAlign: "center",
    fontWeight: 500,
  },
  demoTiers: {
    background: "#fff",
    border: `1px solid ${HAIRLINE}`,
    borderRadius: 12,
    overflow: "hidden",
  },
  demoTierRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
  },
  demoTierName: {
    fontSize: 13,
    letterSpacing: "-0.1px",
  },
  demoTierRight: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  demoTierPrice: {
    fontSize: 14,
    fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
    letterSpacing: "-0.2px",
  },
  demoBestPill: {
    fontSize: 9.5,
    fontWeight: 700,
    color: "#fff",
    background: BRAND_GREEN,
    padding: "2px 7px",
    borderRadius: 999,
    letterSpacing: "0.4px",
    textTransform: "uppercase",
  },
  demoSendBtn: {
    width: "100%",
    marginTop: 12,
    background: BRAND_GREEN,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "default",
    transition: "opacity 320ms ease, transform 320ms ease",
  },
  demoToast: {
    position: "absolute",
    top: -18,
    left: "50%",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "#fff",
    color: TEXT_BODY,
    fontSize: 12,
    fontWeight: 600,
    padding: "8px 14px 8px 10px",
    borderRadius: 999,
    boxShadow: "0 4px 14px rgba(17, 24, 39, 0.10), 0 1px 3px rgba(17, 24, 39, 0.06)",
    zIndex: 5,
    transition: "opacity 320ms cubic-bezier(0.22,1,0.36,1), transform 320ms cubic-bezier(0.22,1,0.36,1)",
    whiteSpace: "nowrap",
  },
  demoToastCheck: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: BRAND_GREEN,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  demoCaption: {
    fontSize: "0.875rem",
    color: TEXT_FAINT,
    fontStyle: "italic",
    margin: 0,
    textAlign: "center",
  },

  // Cards
  card: {
    background: "#fff",
    border: `1px solid ${HAIRLINE}`,
    borderRadius: 16,
    padding: 32,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    position: "relative",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
    minHeight: 290,
  },
  cardRecommended: {
    border: `2px solid ${BRAND_GREEN}`,
    background: BRAND_GREEN_RECCARD,
    paddingTop: 36,
  },
  recommendedBadge: {
    position: "absolute",
    top: -12,
    left: "50%",
    transform: "translateX(-50%)",
    background: BRAND_GREEN,
    color: "#fff",
    fontSize: "0.6875rem",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    padding: "6px 16px",
    borderRadius: 100,
    whiteSpace: "nowrap",
    boxShadow: "0 4px 10px -4px rgba(15,110,86,0.45)",
  },
  cardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: TEXT_INK,
    margin: 0,
    letterSpacing: "-0.4px",
    fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
  },
  cardDesc: {
    fontSize: "0.9375rem",
    color: TEXT_MUTED,
    lineHeight: 1.6,
    margin: 0,
    flex: 1,
  },
  timeBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    fontWeight: 500,
    color: TEXT_FAINT,
    background: COOL_TINT,
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
    gap: 8,
    fontSize: "0.875rem",
    color: TEXT_FAINT,
    fontWeight: 400,
    margin: "8px 0 0",
    textAlign: "center",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  starsRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
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
    border: `1px solid ${HAIRLINE}`,
    borderRadius: 16,
    padding: "32px 32px 28px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
    display: "flex",
    flexDirection: "column",
  },
  subHeading: {
    fontSize: 22,
    fontWeight: 700,
    color: TEXT_INK,
    margin: "0 0 6px",
    letterSpacing: "-0.4px",
    fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
  },
  subHead2: { fontSize: 14, color: TEXT_MUTED, margin: "0 0 22px" },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: TEXT_BODY,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    border: `1.5px solid ${HAIRLINE}`,
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
