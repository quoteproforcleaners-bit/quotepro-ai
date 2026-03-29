import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";

interface PortalData {
  customer: {
    firstName: string;
    lastName: string;
    address: string;
    phone: string;
    preferences: any;
  };
  business: {
    name: string;
    phone: string;
    logoUrl: string | null;
    primaryColor: string;
    senderName: string;
    tipsEnabled: boolean;
    welcomeMessage: string | null;
  };
  nextJob: {
    id: string;
    startDatetime: string;
    jobType: string;
    status: string;
    detailedStatus: string;
    assignedCleaner: { firstName: string; photoUrl: string | null } | null;
  } | null;
  lastJob: {
    id: string;
    completedAt: string;
    jobType: string;
    total: number | null;
    assignedCleaner: { firstName: string; photoUrl: string | null } | null;
    photos: { id: string; photoUrl: string; photoType: string; caption: string }[];
    satisfactionRating: number | null;
    tipAmount: number | null;
    tipToken: string | null;
  } | null;
  upcomingJobs: {
    id: string;
    startDatetime: string;
    jobType: string;
    assignedCleaner: { firstName: string } | null;
  }[];
  jobHistory: {
    id: string;
    startDatetime: string;
    completedAt: string | null;
    jobType: string;
    total: number | null;
    photoCount: number;
    satisfactionRating: number | null;
  }[];
  recurrence: string | null;
  portalToken: string;
  viewCount: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function recurrenceLabel(r: string | null): string | null {
  const map: Record<string, string> = {
    weekly: "every week",
    biweekly: "every 2 weeks",
    monthly: "every month",
    quarterly: "every 3 months",
  };
  return r && map[r] ? map[r] : null;
}

function InitialsAvatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#dbeafe",
        border: "2px solid #bfdbfe",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.35,
        fontWeight: 700,
        color: "#1d4ed8",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function SkeletonBox({ h, w = "100%", mb = 0, r = 12 }: { h: number; w?: string | number; mb?: number; r?: number }) {
  return (
    <div
      style={{
        height: h,
        width: w,
        borderRadius: r,
        background: "linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s ease-in-out infinite",
        marginBottom: mb,
        flexShrink: 0,
      }}
    />
  );
}

function StarRating({
  rating,
  onRate,
  size = 28,
}: {
  rating: number | null;
  onRate?: (r: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          onClick={() => onRate?.(s)}
          onMouseEnter={() => onRate && setHover(s)}
          onMouseLeave={() => onRate && setHover(0)}
          style={{
            background: "none",
            border: "none",
            cursor: onRate ? "pointer" : "default",
            padding: 0,
            fontSize: size,
            color: s <= (hover || rating || 0) ? "#f59e0b" : "#d1d5db",
            lineHeight: 1,
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function PreferencesList({ prefs }: { prefs: any }) {
  if (!prefs) return null;
  const items: string[] = [];
  if (prefs.hasPets) {
    const count = prefs.petCount || 1;
    const type = prefs.petType || "pet";
    const note = prefs.petNotes ? ` — ${prefs.petNotes}` : "";
    items.push(`${count} ${type}${count > 1 ? "s" : ""}${note}`);
  }
  if (prefs.accessMethod) {
    const accessMap: Record<string, string> = {
      home: "Someone is home",
      key_mat: "Key under mat",
      lockbox: prefs.accessCode ? `Lockbox — code: ${prefs.accessCode}` : "Lockbox",
      hide_key: prefs.accessLocation ? `Hide-a-key: ${prefs.accessLocation}` : "Hide-a-key",
      garage: prefs.accessCode ? `Garage code: ${prefs.accessCode}` : "Garage code",
    };
    items.push(accessMap[prefs.accessMethod] || prefs.accessMethod);
  }
  if (prefs.specialInstructions) items.push(prefs.specialInstructions);
  if (prefs.areasToSkip?.length) items.push(`Skip: ${prefs.areasToSkip.join(", ")}`);

  if (!items.length) return null;
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6, fontSize: 14, color: "#334155" }}>
          <span style={{ marginTop: 2, color: "#64748b" }}>•</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function CustomerPortalPage() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const photoStripRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery<PortalData>({
    queryKey: ["/api/portal", token],
    queryFn: async () => {
      const res = await fetch(`/api/portal/${token}`, { credentials: "include" });
      if (!res.ok) throw new Error(res.status === 404 ? "not_found" : "error");
      return res.json();
    },
    retry: false,
    staleTime: 30000,
  });

  const rateMutation = useMutation({
    mutationFn: async ({ jobId, rating }: { jobId: string; rating: number }) => {
      const res = await fetch(`/api/portal/${token}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, rating }),
      });
      if (!res.ok) throw new Error("Failed to save rating");
      return res.json();
    },
    onSuccess: () => {
      setRatingSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/portal", token] });
    },
  });

  // PWA install prompt
  useEffect(() => {
    const dismissed = localStorage.getItem("portal_install_dismissed");
    if (dismissed) setBannerDismissed(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler as any);
    return () => window.removeEventListener("beforeinstallprompt", handler as any);
  }, []);

  // Show install banner on 2nd+ visit
  useEffect(() => {
    if (data && data.viewCount >= 2 && installPrompt && !bannerDismissed) {
      setShowInstallBanner(true);
    }
  }, [data, installPrompt, bannerDismissed]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setShowInstallBanner(false);
    setBannerDismissed(true);
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    setBannerDismissed(true);
    localStorage.setItem("portal_install_dismissed", "1");
  };

  if (isLoading) {
    return (
      <>
        <style>{`@keyframes shimmer { 0%,100%{background-position:200% 0} 50%{background-position:0% 0} }`}</style>
        <div style={{ background: "#f8fafc", minHeight: "100vh", maxWidth: 480, margin: "0 auto" }}>
          <SkeletonBox h={120} r={0} mb={0} />
          <div style={{ padding: "20px 16px" }}>
            <SkeletonBox h={28} w="60%" mb={8} />
            <SkeletonBox h={18} w="80%" mb={24} />
            <SkeletonBox h={140} mb={16} />
            <SkeletonBox h={200} mb={16} />
            <SkeletonBox h={120} mb={16} />
          </div>
        </div>
      </>
    );
  }

  if (error || !data) {
    const msg = (error as Error)?.message;
    return (
      <div style={{ background: "#f8fafc", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
            {msg === "not_found" ? "Portal Not Found" : "Something Went Wrong"}
          </h1>
          <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.6 }}>
            {msg === "not_found"
              ? "This link may be invalid. Contact your cleaning service for a new link."
              : "We couldn't load your portal. Please try again or contact your cleaning service."}
          </p>
        </div>
      </div>
    );
  }

  const { customer, business, nextJob, lastJob, upcomingJobs, jobHistory, recurrence } = data;
  const accentColor = business.primaryColor || "#2563EB";
  const freq = recurrenceLabel(recurrence);
  const today = nextJob && isToday(nextJob.startDatetime);

  const card: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 16,
    margin: "0 16px 16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "1px",
    color: "#94a3b8",
    textTransform: "uppercase",
    margin: "16px 16px 8px",
  };

  const btn: (color?: string) => React.CSSProperties = (color = accentColor) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "13px 16px",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    minHeight: 48,
    border: `1.5px solid ${color}`,
    background: "transparent",
    color,
    transition: "opacity 0.15s",
  });

  const btnFilled: React.CSSProperties = {
    ...btn(),
    background: accentColor,
    color: "#fff",
    border: "none",
  };

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%,100%{background-position:200% 0} 50%{background-position:0% 0} }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        button:active { opacity: 0.8; transform: scale(0.98); }
        a { text-decoration: none; color: inherit; }
      `}</style>

      {/* PWA link tag */}
      <link rel="manifest" href={`/portal-manifest/${token}`} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="My Cleaning" />
      <meta name="theme-color" content={accentColor} />

      <div style={{ background: "#f8fafc", minHeight: "100vh", maxWidth: 480, margin: "0 auto", paddingBottom: 24 }}>

        {/* ── SECTION 1: Business Header ── */}
        <div
          style={{
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
            minHeight: 120,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 16px 16px",
          }}
        >
          {business.logoUrl ? (
            <img src={business.logoUrl} alt={business.name} style={{ maxHeight: 60, maxWidth: 200, objectFit: "contain", marginBottom: 8 }} />
          ) : (
            <p style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 4, textAlign: "center" }}>
              {business.name}
            </p>
          )}
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, margin: 0, textAlign: "center" }}>
            Your cleaning service portal
          </p>
        </div>

        {/* ── SECTION 2: Greeting ── */}
        <div style={{ padding: "20px 16px 4px" }}>
          <p style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
            Hi {customer.firstName}
          </p>

          {nextJob ? (
            <p style={{ fontSize: 15, margin: "0 0 8px", color: today ? "#16a34a" : "#0f172a" }}>
              {today
                ? `Your clean is today at ${formatTime(nextJob.startDatetime)}`
                : `Your next clean is ${formatDate(nextJob.startDatetime)}`}
            </p>
          ) : (
            <p style={{ fontSize: 15, margin: "0 0 8px", color: "#64748b" }}>
              No upcoming cleans scheduled
            </p>
          )}

          {freq && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#2563eb" }}>
              Recurs {freq}
            </div>
          )}

          {business.welcomeMessage && (
            <p style={{ fontSize: 14, color: "#64748b", margin: "12px 0 0", fontStyle: "italic" }}>
              "{business.welcomeMessage}"
            </p>
          )}
        </div>

        {/* ── SECTION 3: Next Clean Card ── */}
        {nextJob && (
          <>
            <p style={sectionLabel}>Next Clean</p>
            <div style={card}>
              {/* Top row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "1px", color: "#94a3b8", textTransform: "uppercase" }}>
                  Scheduled
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                  background: today ? "#dcfce7" : "#eff6ff",
                  color: today ? "#16a34a" : "#2563eb",
                }}>
                  {today ? "Today" : nextJob.status.replace(/_/g, " ")}
                </span>
              </div>

              {/* Date & Time */}
              <p style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>
                {formatDate(nextJob.startDatetime)}
              </p>
              <p style={{ fontSize: 16, color: "#64748b", margin: "0 0 16px" }}>
                {formatTime(nextJob.startDatetime)}
              </p>

              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 14, marginBottom: 14 }} />

              {/* Cleaner info */}
              {nextJob.assignedCleaner ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  {nextJob.assignedCleaner.photoUrl ? (
                    <img src={nextJob.assignedCleaner.photoUrl} alt="" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "2px solid #bfdbfe" }} />
                  ) : (
                    <InitialsAvatar name={nextJob.assignedCleaner.firstName} />
                  )}
                  <p style={{ fontSize: 14, color: "#334155", margin: 0 }}>
                    <strong>{nextJob.assignedCleaner.firstName}</strong> will be your cleaner
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 16 }}>Cleaner to be confirmed</p>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8 }}>
                <Link to={`/home/${token}/reschedule`} style={{ flex: 1, display: "block" }}>
                  <button style={btn()}>Reschedule</button>
                </Link>
              </div>
            </div>
          </>
        )}

        {/* ── SECTION 4: Last Clean ── */}
        {lastJob && (
          <>
            <p style={sectionLabel}>Your Last Clean</p>

            {lastJob.photos.length > 0 ? (
              <>
                {/* Photo strip */}
                <div
                  ref={photoStripRef}
                  style={{
                    display: "flex",
                    overflowX: "auto",
                    gap: 8,
                    padding: "0 16px",
                    scrollbarWidth: "none",
                    WebkitOverflowScrolling: "touch",
                    marginBottom: 8,
                  }}
                >
                  {lastJob.photos.slice(0, 6).map((photo) => (
                    <div key={photo.id} style={{ position: "relative", flexShrink: 0 }}>
                      <img
                        src={photo.photoUrl}
                        alt={photo.caption || photo.photoType}
                        style={{ width: 160, height: 200, borderRadius: 12, objectFit: "cover", display: "block" }}
                        loading="lazy"
                      />
                      <span style={{
                        position: "absolute", top: 8, left: 8,
                        background: "rgba(0,0,0,0.5)", color: "#fff",
                        fontSize: 10, padding: "2px 6px", borderRadius: 4,
                        textTransform: "capitalize",
                      }}>
                        {photo.photoType}
                      </span>
                    </div>
                  ))}
                </div>
                {lastJob.photos.length > 6 && (
                  <p style={{ textAlign: "right", margin: "0 16px 8px", fontSize: 13, color: accentColor }}>
                    View all {lastJob.photos.length} photos →
                  </p>
                )}
              </>
            ) : (
              <div style={{ ...card, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, color: "#334155", fontWeight: 600 }}>
                    {formatShortDate(lastJob.completedAt)} · {lastJob.jobType?.replace(/_/g, " ")}
                  </p>
                  {lastJob.assignedCleaner && (
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                      by {lastJob.assignedCleaner.firstName}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Rating */}
            <div style={{ ...card, marginTop: 0 }}>
              {lastJob.satisfactionRating ? (
                <div>
                  <StarRating rating={lastJob.satisfactionRating} />
                  <p style={{ margin: "8px 0 0", fontSize: 14, color: "#64748b" }}>
                    Thanks for your feedback!
                  </p>
                </div>
              ) : ratingSubmitted ? (
                <p style={{ margin: 0, fontSize: 14, color: "#16a34a", fontWeight: 600 }}>
                  Thanks for rating your clean!
                </p>
              ) : (
                <div>
                  <p style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
                    How was your clean?
                  </p>
                  <StarRating
                    rating={null}
                    onRate={(r) => rateMutation.mutate({ jobId: lastJob.id, rating: r })}
                  />
                </div>
              )}

              {/* Tip prompt */}
              {business.tipsEnabled && lastJob.tipToken && (
                <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 14, paddingTop: 12 }}>
                  {lastJob.tipAmount ? (
                    <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
                      You tipped ${lastJob.tipAmount.toFixed(2)}
                      {lastJob.assignedCleaner ? ` — ${lastJob.assignedCleaner.firstName} thanks you!` : ""}
                    </p>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
                        {lastJob.assignedCleaner ? `Leave ${lastJob.assignedCleaner.firstName} a tip?` : "Leave a tip?"}
                      </p>
                      <a
                        href={`/tip/${lastJob.tipToken}`}
                        style={{ fontSize: 13, fontWeight: 600, color: accentColor }}
                      >
                        Leave a Tip →
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── SECTION 5: Home Preferences ── */}
        <>
          <p style={sectionLabel}>Your Home Preferences</p>
          <div style={card}>
            {customer.preferences ? (
              <>
                <PreferencesList prefs={customer.preferences} />
                <Link to={`/home/${token}/preferences`}>
                  <p style={{ margin: "10px 0 0", fontSize: 14, color: accentColor, fontWeight: 600 }}>
                    Edit Preferences →
                  </p>
                </Link>
              </>
            ) : (
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
                  Add notes about your home
                </p>
                <p style={{ margin: "0 0 14px", fontSize: 14, color: "#64748b" }}>
                  Let your cleaner know about pets, access, or special requests
                </p>
                <Link to={`/home/${token}/preferences`}>
                  <button style={btnFilled}>+ Add Preferences</button>
                </Link>
              </div>
            )}
          </div>
        </>

        {/* ── SECTION 6: Upcoming Schedule ── */}
        {upcomingJobs.length > 0 && (
          <>
            <p style={sectionLabel}>Upcoming Cleans</p>
            <div style={card}>
              {upcomingJobs.map((job, i) => (
                <div key={job.id}>
                  {i > 0 && <div style={{ borderTop: "1px solid #f1f5f9", margin: "12px 0" }} />}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                        {formatShortDate(job.startDatetime)}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b" }}>
                        {job.jobType?.replace(/_/g, " ")}
                      </p>
                    </div>
                    {job.assignedCleaner && (
                      <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                        {job.assignedCleaner.firstName}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── SECTION 7: Outstanding Balance (placeholder — not implemented in v1) ── */}

        {/* ── SECTION 8: History ── */}
        {jobHistory.length > 1 && (
          <>
            <p style={sectionLabel}>Clean History</p>
            <div style={card}>
              {jobHistory.slice(0, 3).map((job, i) => (
                <div key={job.id}>
                  {i > 0 && <div style={{ borderTop: "1px solid #f1f5f9", margin: "10px 0" }} />}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                        {job.completedAt ? formatShortDate(job.completedAt) : formatShortDate(job.startDatetime)}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b" }}>
                        {job.jobType?.replace(/_/g, " ")}
                        {job.photoCount > 0 ? ` · ${job.photoCount} photo${job.photoCount > 1 ? "s" : ""}` : ""}
                      </p>
                    </div>
                    {job.satisfactionRating && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ color: "#f59e0b", fontSize: 14 }}>★</span>
                        <span style={{ fontSize: 13, color: "#64748b" }}>{job.satisfactionRating}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── SECTION 9: Footer ── */}
        <div style={{ textAlign: "center", padding: "24px 16px 16px", borderTop: "1px solid #e2e8f0", margin: "16px 16px 0" }}>
          <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "#64748b" }}>
            {business.name}
          </p>
          {business.phone && (
            <a href={`tel:${business.phone}`} style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>
              {business.phone}
            </a>
          )}
          <p style={{ margin: 0, fontSize: 11, color: "#cbd5e1" }}>
            Powered by QuotePro
          </p>
        </div>
      </div>

      {/* ── PWA Install Banner ── */}
      {showInstallBanner && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto",
          background: "#fff", borderTop: "1px solid #e2e8f0", padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 12, zIndex: 100,
          boxShadow: "0 -4px 16px rgba(0,0,0,0.08)",
        }}>
          <span style={{ fontSize: 24 }}>📱</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#0f172a" }}>Add to your home screen</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>Get quick access to your portal anytime</p>
          </div>
          <button onClick={handleInstall} style={{ ...btnFilled, width: "auto", padding: "8px 16px", fontSize: 13 }}>
            Add
          </button>
          <button
            onClick={dismissInstallBanner}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94a3b8", padding: 4 }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
