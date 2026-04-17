import { useEffect, useState } from "react";
import { AlertTriangle, ShieldOff, CheckCircle, RefreshCw, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import { apiPost } from "../lib/api";

interface OnboardingFunnel {
  businesses_started: number;
  chose_own_home: number;
  chose_real_lead: number;
  succeeded: number;
  skipped: number;
  retried_and_succeeded: number;
  failed_twice_kept_trying: number;
  conversion_rate_pct: number;
  skip_rate_pct: number;
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
  const [funnelError, setFunnelError] = useState<string | null>(null);
  const [funnelLoading, setFunnelLoading] = useState(false);

  async function loadFunnel(s = secret) {
    setFunnelLoading(true);
    setFunnelError(null);
    try {
      const res = await fetch("/api/admin/onboarding-funnel", {
        headers: { "x-admin-key": s },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Failed (${res.status})`);
      }
      setFunnel(await res.json());
    } catch (e: any) {
      setFunnelError(e.message);
    } finally {
      setFunnelLoading(false);
    }
  }

  useEffect(() => {
    if (authed) loadFunnel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

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
    const av = a[sortField] ?? "";
    const bv = b[sortField] ?? "";
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

        {/* Onboarding Gate panel */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Onboarding Gate</h2>
            <button
              onClick={() => loadFunnel()}
              disabled={funnelLoading}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "#f1f5f9", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#475569" }}
            >
              <RefreshCw size={12} /> {funnelLoading ? "Loading…" : "Refresh"}
            </button>
          </div>
          {funnelError && (
            <p style={{ margin: 0, color: "#dc2626", fontSize: 13 }} data-testid="text-onboarding-funnel-error">{funnelError}</p>
          )}
          {!funnelError && !funnel && !funnelLoading && (
            <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>No data yet.</p>
          )}
          {funnel && (() => {
            const started = funnel.businesses_started || 0;
            const retryRate = started > 0
              ? Math.round((funnel.retried_and_succeeded / started) * 100)
              : 0;
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }} data-testid="panel-onboarding-funnel">
                <Metric label="Started" value={started} testId="metric-started" />
                <Metric label="Chose own home" value={funnel.chose_own_home} testId="metric-chose-own-home" />
                <Metric label="Succeeded" value={funnel.succeeded} testId="metric-succeeded" color="#15803d" />
                <Metric label="Skipped" value={funnel.skipped} testId="metric-skipped" color="#b45309" />
                <Metric label="Retry rate" value={`${retryRate}%`} testId="metric-retry-rate" />
                <Metric label="Conversion rate" value={`${funnel.conversion_rate_pct}%`} testId="metric-conversion-rate" color="#7c3aed" />
              </div>
            );
          })()}
        </div>

        <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
          These users have a paid subscription tier in the database but <strong>no active Stripe subscription</strong>. They were granted access manually (beta testing, admin grant, seed scripts). Demoting moves them to Free — they can still upgrade normally.
        </p>

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

        {/* Onboarding Gate trend */}
        <OnboardingGatePanel secret={secret} />

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

interface OnboardingFunnelDay {
  day: string;
  started: number;
  succeeded: number;
  skipped: number;
}

interface OnboardingFunnelData {
  businesses_started: number;
  succeeded: number;
  skipped: number;
  conversion_rate_pct: number;
  skip_rate_pct: number;
  retry_success_rate_pct: number;
  window_days: number;
  daily: OnboardingFunnelDay[];
}

function OnboardingGatePanel({ secret }: { secret: string }) {
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const [data, setData] = useState<OnboardingFunnelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/onboarding-funnel?days=${days}`,
          { headers: { "x-admin-key": secret } },
        );
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [days, secret]);

  const daily = data?.daily ?? [];
  const maxValue = Math.max(
    1,
    ...daily.map((d) => Math.max(d.started, d.succeeded, d.skipped)),
  );

  return (
    <div
      data-testid="panel-onboarding-gate"
      style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, marginTop: 28 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TrendingUp size={18} color="#7c3aed" />
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Onboarding Gate Trend</h2>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
          {([7, 14, 30] as const).map((d) => (
            <button
              key={d}
              data-testid={`button-window-${d}`}
              onClick={() => setDays(d)}
              style={{
                background: days === d ? "#fff" : "transparent",
                border: "none",
                borderRadius: 6,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 700,
                color: days === d ? "#7c3aed" : "#64748b",
                cursor: "pointer",
                boxShadow: days === d ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
              }}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
      <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 13 }}>
        Daily breakdown of businesses that started, succeeded, or skipped the first-quote gate.
      </p>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 14, color: "#dc2626", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Totals */}
      {data && (
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          <Stat label="Started" value={data.businesses_started} color="#1e293b" testId="stat-started" />
          <Stat label="Succeeded" value={data.succeeded} color="#16a34a" testId="stat-succeeded" />
          <Stat label="Skipped" value={data.skipped} color="#d97706" testId="stat-skipped" />
          <Stat label="Conversion" value={`${data.conversion_rate_pct}%`} color="#7c3aed" testId="stat-conversion" />
          <Stat label="Retry Success" value={`${data.retry_success_rate_pct}%`} color="#0891b2" testId="stat-retry" />
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginBottom: 10, fontSize: 12, color: "#475569", flexWrap: "wrap" }}>
        <LegendDot color="#1e293b" label="Started" />
        <LegendDot color="#16a34a" label="Succeeded" />
        <LegendDot color="#d97706" label="Skipped" />
      </div>

      {/* Bar chart */}
      <div
        data-testid="chart-onboarding-trend"
        style={{
          display: "flex", alignItems: "flex-end", gap: 6,
          height: 160, padding: "0 4px", borderBottom: "1px solid #e2e8f0",
          opacity: loading ? 0.5 : 1,
        }}
      >
        {daily.length === 0 && !loading && (
          <div style={{ flex: 1, textAlign: "center", color: "#94a3b8", fontSize: 13, alignSelf: "center" }}>
            No data for this window.
          </div>
        )}
        {daily.map((d) => (
          <div key={d.day} title={`${d.day}\nStarted: ${d.started}\nSucceeded: ${d.succeeded}\nSkipped: ${d.skipped}`}
            data-testid={`bar-day-${d.day}`}
            style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 1, height: "100%", minWidth: 4 }}
          >
            <Bar value={d.started} max={maxValue} color="#1e293b" />
            <Bar value={d.succeeded} max={maxValue} color="#16a34a" />
            <Bar value={d.skipped} max={maxValue} color="#d97706" />
          </div>
        ))}
      </div>

      {/* X-axis labels (first / mid / last) */}
      {daily.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
          <span>{fmtShort(daily[0].day)}</span>
          {daily.length >= 3 && <span>{fmtShort(daily[Math.floor(daily.length / 2)].day)}</span>}
          <span>{fmtShort(daily[daily.length - 1].day)}</span>
        </div>
      )}
    </div>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ flex: 1, height: `${pct}%`, minHeight: value > 0 ? 2 : 0, background: color, borderRadius: "2px 2px 0 0" }} />
  );
}

function Stat({ label, value, color, testId }: { label: string; value: number | string; color: string; testId: string }) {
  return (
    <div data-testid={testId} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", minWidth: 90 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, marginTop: 2 }}>{value}</div>
    </div>
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
