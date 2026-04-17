import { useEffect, useState } from "react";
import { AlertTriangle, ShieldOff, CheckCircle, RefreshCw, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import { apiPost } from "../lib/api";

interface FunnelBreakdownRow {
  key: string;
  businesses_started: number;
  succeeded: number;
  skipped: number;
  conversion_rate_pct: number;
  skip_rate_pct: number;
}
interface OnboardingFunnelDay {
  day: string;
  started: number;
  succeeded: number;
  skipped: number;
}

interface OnboardingFunnel {
  businesses_started: number;
  chose_real_lead: number;
  chose_own_home: number;
  succeeded: number;
  skipped: number;
  retried_and_succeeded: number;
  failed_twice_kept_trying: number;
  conversion_rate_pct: number;
  skip_rate_pct: number;
  retry_success_rate_pct: number;
  window_days?: number;
  daily?: OnboardingFunnelDay[];
  groupBy: "tier" | "source" | null;
  breakdown: FunnelBreakdownRow[] | null;
}

interface PhantomUser {
  id: string;
  name: string | null;
  email: string;
  subscription_tier: string;
  stripe_subscription_status: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  last_active_at: string | null;
}

const TIER_COLORS: Record<string, { bg: string; color: string }> = {
  pro:     { bg: "#faf5ff", color: "#7c3aed" },
  growth:  { bg: "#f0fdf4", color: "#15803d" },
  starter: { bg: "#eff6ff", color: "#1d4ed8" },
  free:    { bg: "#f1f5f9", color: "#64748b" },
};

function TierBadge({ tier }: { tier: string }) {
  const c = TIER_COLORS[tier] ?? TIER_COLORS.free;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
      background: c.bg, color: c.color, textTransform: "capitalize", whiteSpace: "nowrap",
    }}>
      {tier}
    </span>
  );
}

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PhantomAccountsPage() {
  const [secret, setSecret] = useState(() => sessionStorage.getItem("admin_secret") || "");
  const [authed, setAuthed] = useState(false);
  const [accounts, setAccounts] = useState<PhantomUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoteResult, setDemoteResult] = useState<{ total: number; emails: string[] } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [sortField, setSortField] = useState<"tier" | "created_at" | "last_active_at">("tier");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [grantEmail, setGrantEmail] = useState("");
  const [grantTier, setGrantTier] = useState("pro");
  const [grantResult, setGrantResult] = useState<string | null>(null);
  const [funnel, setFunnel] = useState<OnboardingFunnel | null>(null);
  const [funnelGroupBy, setFunnelGroupBy] = useState<"tier" | "source">("tier");
  const [funnelDays, setFunnelDays] = useState<7 | 14 | 30>(7);
  const [funnelLoading, setFunnelLoading] = useState(false);
  const [funnelError, setFunnelError] = useState<string | null>(null);

  async function loadFunnel(s = secret, gb: "tier" | "source" = funnelGroupBy, days = funnelDays) {
    setFunnelLoading(true);
    setFunnelError(null);
    try {
      const res = await fetch(`/api/admin/onboarding-funnel?groupBy=${gb}&days=${days}`, {
        headers: { "x-admin-key": s },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Failed (${res.status})`);
      }
      setFunnel((await res.json()) as OnboardingFunnel);
    } catch (e: any) {
      setFunnelError(e.message);
    } finally {
      setFunnelLoading(false);
    }
  }

  useEffect(() => {
    if (authed) loadFunnel(secret, funnelGroupBy, funnelDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, funnelGroupBy, funnelDays]);

  async function load(s = secret) {
    setLoading(true);
    setError(null);
    setDemoteResult(null);
    try {
      const res = await fetch(`/api/admin/phantom-accounts?secret=${encodeURIComponent(s)}`);
      if (res.status === 403) { setError("Wrong secret key."); setAuthed(false); return; }
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAccounts(data.accounts);
      setAuthed(true);
      sessionStorage.setItem("admin_secret", s);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function demoteAll() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/demote-phantoms?secret=${encodeURIComponent(secret)}`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setDemoteResult({ total: data.total, emails: data.demoted.map((u: any) => u.email) });
      setConfirming(false);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function grantTierToUser() {
    setGrantResult(null);
    try {
      const res = await fetch(`/api/admin/grant-tier?secret=${encodeURIComponent(secret)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: grantEmail, tier: grantTier }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Failed");
      const data = await res.json();
      setGrantResult(`Done — ${data.user.email} is now on ${data.user.subscription_tier}.`);
      setGrantEmail("");
      await load();
    } catch (e: any) {
      setGrantResult(`Error: ${e.message}`);
    }
  }

  const sorted = [...accounts].sort((a, b) => {
    const field = sortField === "tier" ? "subscription_tier" : sortField;
    const av = (a as any)[field] ?? "";
    const bv = (b as any)[field] ?? "";
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const byTier = accounts.reduce<Record<string, number>>((acc, u) => {
    acc[u.subscription_tier] = (acc[u.subscription_tier] || 0) + 1;
    return acc;
  }, {});

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  }

  function SortIcon({ field }: { field: typeof sortField }) {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
  }

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 40, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", width: 360 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <ShieldOff size={22} color="#7c3aed" />
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1e293b" }}>Admin Access</h1>
          </div>
          <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 14 }}>Enter your admin secret key to continue.</p>
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load()}
            placeholder="Admin secret key"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box", marginBottom: 12 }}
          />
          {error && <p style={{ color: "#dc2626", fontSize: 13, margin: "0 0 12px" }}>{error}</p>}
          <button
            onClick={() => load()}
            disabled={loading}
            style={{ width: "100%", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            {loading ? "Checking..." : "Unlock"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "32px 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={22} color="#d97706" />
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1e293b" }}>Phantom Accounts</h1>
            <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
              {accounts.length} found
            </span>
          </div>
          <button
            onClick={() => load()}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#475569" }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Onboarding Funnel Panel */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUp size={18} color="#7c3aed" />
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Onboarding Funnel</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
                {([7, 14, 30] as const).map((d) => (
                  <button
                    key={d}
                    data-testid={`button-window-${d}`}
                    onClick={() => setFunnelDays(d)}
                    style={{
                      background: funnelDays === d ? "#fff" : "transparent",
                      border: "none",
                      borderRadius: 6,
                      padding: "5px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: funnelDays === d ? "#7c3aed" : "#64748b",
                      cursor: "pointer",
                      boxShadow: funnelDays === d ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    }}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Group by</label>
                <select
                  data-testid="select-funnel-groupby"
                  value={funnelGroupBy}
                  onChange={e => setFunnelGroupBy(e.target.value as "tier" | "source")}
                  style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, background: "#fff" }}
                >
                  <option value="tier">Plan tier</option>
                  <option value="source">Signup source</option>
                </select>
              </div>
              <button
                onClick={() => loadFunnel()}
                disabled={funnelLoading}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "#f1f5f9", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#475569" }}
              >
                <RefreshCw size={12} /> {funnelLoading ? "Loading…" : "Refresh"}
              </button>
            </div>
          </div>

          {funnelError && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", marginBottom: 12, color: "#dc2626", fontSize: 13 }} data-testid="text-onboarding-funnel-error">
              {funnelError}
            </div>
          )}
          {funnelLoading && !funnel && <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Loading funnel…</p>}

          {funnel && (
            <div data-testid="panel-onboarding-funnel">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 20 }}>
                <Metric label="Started" value={funnel.businesses_started} testId="metric-started" />
                <Metric label="Chose own home" value={funnel.chose_own_home} testId="metric-chose-own-home" />
                <Metric label="Succeeded" value={funnel.succeeded} testId="metric-succeeded" color="#15803d" />
                <Metric label="Skipped" value={funnel.skipped} testId="metric-skipped" color="#b45309" />
                <Metric label="Retry Success" value={`${funnel.retry_success_rate_pct}%`} testId="metric-retry-rate" color="#0891b2" />
                <Metric label="Conversion" value={`${funnel.conversion_rate_pct}%`} testId="metric-conversion-rate" color="#7c3aed" />
              </div>

              {/* Trend Chart */}
              {funnel.daily && (
                <div style={{ marginBottom: 24, border: "1px solid #f1f5f9", borderRadius: 10, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Daily Trend ({funnelDays}d)
                    </div>
                    <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#475569" }}>
                      <LegendDot color="#1e293b" label="Started" />
                      <LegendDot color="#16a34a" label="Succeeded" />
                      <LegendDot color="#d97706" label="Skipped" />
                    </div>
                  </div>
                  
                  <div
                    data-testid="chart-onboarding-trend"
                    style={{
                      display: "flex", alignItems: "flex-end", gap: 6,
                      height: 160, padding: "0 4px", borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    {funnel.daily.length === 0 && (
                      <div style={{ flex: 1, textAlign: "center", color: "#94a3b8", fontSize: 13, alignSelf: "center" }}>
                        No data for this window.
                      </div>
                    )}
                    {funnel.daily.map((d) => {
                      const maxValue = Math.max(1, ...funnel.daily!.map(x => Math.max(x.started, x.succeeded, x.skipped)));
                      return (
                        <div key={d.day} title={`${d.day}\nStarted: ${d.started}\nSucceeded: ${d.succeeded}\nSkipped: ${d.skipped}`}
                          data-testid={`bar-day-${d.day}`}
                          style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 1, height: "100%", minWidth: 4 }}
                        >
                          <Bar value={d.started} max={maxValue} color="#1e293b" />
                          <Bar value={d.succeeded} max={maxValue} color="#16a34a" />
                          <Bar value={d.skipped} max={maxValue} color="#d97706" />
                        </div>
                      );
                    })}
                  </div>
                  {funnel.daily.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                      <span>{fmtShort(funnel.daily[0].day)}</span>
                      {funnel.daily.length >= 3 && <span>{fmtShort(funnel.daily[Math.floor(funnel.daily.length / 2)].day)}</span>}
                      <span>{fmtShort(funnel.daily[funnel.daily.length - 1].day)}</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 1fr) 2fr", gap: 20, alignItems: "start" }}>
                {/* Secondary Totals/Stats */}
                <div data-testid="funnel-totals" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <FunnelStat label="Total Started" value={funnel.businesses_started} />
                  <FunnelStat label="Total Succeeded" value={funnel.succeeded} />
                  <FunnelStat label="Total Skipped" value={funnel.skipped} />
                  <FunnelStat label="Avg Conversion" value={`${funnel.conversion_rate_pct}%`} accent="#7c3aed" />
                  <FunnelStat label="Avg Skip rate" value={`${funnel.skip_rate_pct}%`} />
                </div>

                {/* Breakdown table */}
                <div data-testid="funnel-breakdown" style={{ overflowX: "auto" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                    Breakdown by {funnelGroupBy === "tier" ? "plan tier" : "signup source"}
                  </div>
                  {(!funnel.breakdown || funnel.breakdown.length === 0) ? (
                    <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>No data yet.</p>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          <th style={breakdownThStyle}>{funnelGroupBy === "tier" ? "Tier" : "Source"}</th>
                          <th style={{ ...breakdownThStyle, textAlign: "right" }}>{funnelGroupBy === "source" ? "Signups" : "Started"}</th>
                          <th style={{ ...breakdownThStyle, textAlign: "right" }}>Succeeded</th>
                          <th style={{ ...breakdownThStyle, textAlign: "right" }}>Skipped</th>
                          <th style={{ ...breakdownThStyle, textAlign: "right" }}>Conv %</th>
                          <th style={{ ...breakdownThStyle, textAlign: "right" }}>Skip %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {funnel.breakdown.map((r, i) => (
                          <tr key={r.key} data-testid={`funnel-breakdown-row-${r.key}`} style={{ borderTop: i === 0 ? "1px solid #e2e8f0" : "1px solid #f1f5f9" }}>
                            <td style={breakdownTdStyle}>
                              <span style={{ fontWeight: 600, color: "#1e293b", textTransform: "capitalize" }}>{r.key}</span>
                            </td>
                            <td style={{ ...breakdownTdStyle, textAlign: "right", color: "#475569" }}>{r.businesses_started}</td>
                            <td style={{ ...breakdownTdStyle, textAlign: "right", color: "#475569" }}>{r.succeeded}</td>
                            <td style={{ ...breakdownTdStyle, textAlign: "right", color: "#475569" }}>{r.skipped}</td>
                            <td style={{ ...breakdownTdStyle, textAlign: "right", fontWeight: 700, color: "#7c3aed" }}>{r.conversion_rate_pct}%</td>
                            <td style={{ ...breakdownTdStyle, textAlign: "right", fontWeight: 700, color: "#b45309" }}>{r.skip_rate_pct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tier summary */}
        {accounts.length > 0 && (
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            {Object.entries(byTier).map(([tier, count]) => (
              <div key={tier} style={{ background: "#fff", borderRadius: 10, padding: "14px 20px", border: "1px solid #e2e8f0", minWidth: 100, textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: TIER_COLORS[tier]?.color ?? "#1e293b" }}>{count}</div>
                <TierBadge tier={tier} />
              </div>
            ))}
          </div>
        )}

        {/* Success banner */}
        {demoteResult && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <CheckCircle size={18} color="#16a34a" style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: "#15803d", fontSize: 14 }}>{demoteResult.total} accounts demoted to Free</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#166534" }}>{demoteResult.emails.slice(0, 5).join(", ")}{demoteResult.emails.length > 5 ? ` + ${demoteResult.emails.length - 5} more` : ""}</p>
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, color: "#dc2626", fontSize: 14 }}>{error}</div>
        )}

        {/* Demote button */}
        {accounts.length > 0 && !confirming && (
          <button
            onClick={() => setConfirming(true)}
            style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 20 }}
          >
            Demote All {accounts.length} to Free
          </button>
        )}
        {confirming && (
          <div style={{ background: "#fff", border: "1.5px solid #fca5a5", borderRadius: 10, padding: 18, marginBottom: 20 }}>
            <p style={{ margin: "0 0 14px", fontWeight: 600, color: "#1e293b", fontSize: 14 }}>
              This will move <strong>{accounts.length} accounts</strong> from their current tier to Free. Are you sure?
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={demoteAll}
                disabled={loading}
                style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                {loading ? "Demoting..." : "Yes, demote all"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                style={{ background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {sorted.length === 0 && !loading && (
          <div style={{ background: "#fff", borderRadius: 12, padding: 40, textAlign: "center", border: "1px solid #e2e8f0", color: "#64748b" }}>
            <CheckCircle size={32} color="#22c55e" style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>No phantom accounts found.</p>
          </div>
        )}

        {sorted.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={thStyle}>Name / Email</th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => toggleSort("tier")}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>Tier <SortIcon field="tier" /></span>
                  </th>
                  <th style={thStyle}>Stripe</th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => toggleSort("created_at")}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>Joined <SortIcon field="created_at" /></span>
                  </th>
                  <th style={{ ...thStyle, cursor: "pointer" }} onClick={() => toggleSort("last_active_at")}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>Last Active <SortIcon field="last_active_at" /></span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: i < sorted.length - 1 ? "1px solid #f1f5f9" : "none", background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: "#1e293b" }}>{u.name || "(no name)"}</div>
                      <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{u.email}</div>
                    </td>
                    <td style={tdStyle}><TierBadge tier={u.subscription_tier} /></td>
                    <td style={tdStyle}>
                      {u.stripe_customer_id
                        ? <span style={{ fontSize: 11, color: "#92400e", background: "#fef3c7", padding: "2px 6px", borderRadius: 4 }}>has cus_id</span>
                        : <span style={{ color: "#94a3b8", fontSize: 12 }}>none</span>}
                    </td>
                    <td style={{ ...tdStyle, color: "#475569" }}>{fmt(u.created_at)}</td>
                    <td style={{ ...tdStyle, color: u.last_active_at ? "#475569" : "#cbd5e1" }}>{fmt(u.last_active_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}


        {/* Grant tier tool */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, marginTop: 28 }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Grant / Change Tier</h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Email</label>
              <input
                type="email"
                value={grantEmail}
                onChange={e => setGrantEmail(e.target.value)}
                placeholder="user@example.com"
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, width: 240 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Tier</label>
              <select
                value={grantTier}
                onChange={e => setGrantTier(e.target.value)}
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "#fff" }}
              >
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <button
              onClick={grantTierToUser}
              disabled={!grantEmail}
              style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: grantEmail ? "pointer" : "not-allowed", opacity: grantEmail ? 1 : 0.5 }}
            >
              Apply
            </button>
          </div>
          {grantResult && (
            <p style={{ margin: "12px 0 0", fontSize: 13, color: grantResult.startsWith("Error") ? "#dc2626" : "#16a34a", fontWeight: 600 }}>
              {grantResult}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

function Metric({ label, value, testId, color }: { label: string; value: number | string; testId: string; color?: string }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid #e2e8f0" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color ?? "#1e293b" }} data-testid={testId}>{value}</div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 12,
  color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em",
};
const tdStyle: React.CSSProperties = { padding: "12px 16px", verticalAlign: "top" };

const breakdownThStyle: React.CSSProperties = {
  padding: "8px 12px", textAlign: "left", fontWeight: 700, fontSize: 11,
  color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em",
};
const breakdownTdStyle: React.CSSProperties = { padding: "10px 12px", verticalAlign: "middle" };

function FunnelStat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div
      data-testid={`funnel-stat-${label.toLowerCase().replace(/\s+/g, "-")}`}
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        padding: "8px 12px", background: "#f8fafc", borderRadius: 8,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 800, color: accent ?? "#1e293b" }}>{value}</span>
    </div>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ flex: 1, height: `${pct}%`, minHeight: value > 0 ? 2 : 0, background: color, borderRadius: "2px 2px 0 0" }} />
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: color }} />
      {label}
    </span>
  );
}

function fmtShort(day: string) {
  const d = new Date(day + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
