import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "../components/ui";
import { AlertTriangle, ThumbsUp, Minus, ThumbsDown, MessageSquare, Users } from "lucide-react";

interface NpsAdminData {
  averageScore: number | null;
  npsIndex: number | null;
  totalResponses: number;
  promoters: number;
  passives: number;
  detractors: number;
  distribution: { score: number; count: number }[];
  responses: {
    id: string;
    name: string;
    email: string;
    score: number;
    comment: string | null;
    surveyedAt: string;
    tier: string;
  }[];
  lowScoreAlerts: {
    id: string;
    name: string;
    score: number;
    comment: string | null;
    surveyedAt: string;
  }[];
}

function ScoreBadge({ score }: { score: number }) {
  const bg = score >= 9 ? "#dcfce7" : score >= 7 ? "#fef9c3" : "#fee2e2";
  const color = score >= 9 ? "#15803d" : score >= 7 ? "#854d0e" : "#b91c1c";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 32, height: 32, borderRadius: "50%",
      background: bg, color, fontWeight: 800, fontSize: 13, flexShrink: 0,
    }}>
      {score}
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    free:    { bg: "#f1f5f9", color: "#64748b" },
    starter: { bg: "#eff6ff", color: "#1d4ed8" },
    growth:  { bg: "#f0fdf4", color: "#15803d" },
    pro:     { bg: "#faf5ff", color: "#7c3aed" },
  };
  const c = colors[tier] ?? colors.free;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
      background: c.bg, color: c.color, textTransform: "capitalize",
    }}>
      {tier}
    </span>
  );
}

const panel: React.CSSProperties = {
  background: "var(--bg-card, #fff)",
  borderRadius: 14,
  border: "0.5px solid var(--border-color, #e8e8e8)",
  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
};

export default function NPSDashboardPage() {
  const { data, isLoading } = useQuery<NpsAdminData>({
    queryKey: ["/api/nps/admin"],
  });

  const maxCount = data
    ? Math.max(...data.distribution.map((d) => d.count), 1)
    : 1;

  const npsColor =
    data?.npsIndex == null ? "#94a3b8" :
    data.npsIndex >= 50 ? "#16a34a" :
    data.npsIndex >= 0  ? "#d97706" : "#dc2626";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const noData = !data || data.totalResponses === 0;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 48px" }}>
      <PageHeader
        title="NPS Dashboard"
        subtitle="Customer satisfaction scores, verbatim feedback, and churn signals"
      />

      {/* Low-score alert banner */}
      {data && data.lowScoreAlerts.length > 0 && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          background: "#fff7ed", border: "0.5px solid #fed7aa",
          borderRadius: 12, padding: "14px 18px", marginBottom: 20,
        }}>
          <AlertTriangle size={16} color="#c2410c" style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#c2410c" }}>
              {data.lowScoreAlerts.length} low-score response{data.lowScoreAlerts.length !== 1 ? "s" : ""} need follow-up
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#9a3412" }}>
              Users who score 6 or below are 3× more likely to cancel within 30 days. Reach out personally.
            </p>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={{ ...panel, padding: "18px 20px", textAlign: "center" }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>NPS Score</p>
          <p style={{ margin: 0, fontSize: 36, fontWeight: 900, color: npsColor, lineHeight: 1 }}>
            {noData ? "—" : (data.npsIndex! >= 0 ? "+" : "") + data.npsIndex}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>
            {noData ? "No data yet" : data.npsIndex! >= 50 ? "Excellent" : data.npsIndex! >= 0 ? "Good" : "Needs work"}
          </p>
        </div>

        <div style={{ ...panel, padding: "18px 20px", textAlign: "center" }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Avg Score</p>
          <p style={{ margin: 0, fontSize: 36, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>
            {noData ? "—" : data.averageScore}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>out of 10</p>
        </div>

        <div style={{ ...panel, padding: "18px 20px", textAlign: "center" }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Responses</p>
          <p style={{ margin: 0, fontSize: 36, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>
            {noData ? "0" : data.totalResponses}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>total surveys</p>
        </div>

        <div style={{ ...panel, padding: "18px 20px" }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Breakdown</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "Promoters (9–10)", count: data?.promoters ?? 0, icon: ThumbsUp,   color: "#16a34a" },
              { label: "Passives (7–8)",   count: data?.passives  ?? 0, icon: Minus,      color: "#d97706" },
              { label: "Detractors (0–6)", count: data?.detractors ?? 0, icon: ThumbsDown, color: "#dc2626" },
            ].map(({ label, count, icon: Icon, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon size={12} color={color} />
                <span style={{ fontSize: 11, color: "#64748b", flex: 1 }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {noData ? (
        <div style={{ ...panel, padding: "48px 24px", textAlign: "center" }}>
          <Users size={32} color="#cbd5e1" style={{ marginBottom: 12 }} />
          <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>No NPS responses yet</p>
          <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>
            Surveys are sent automatically to paid subscribers after 30 days. Check back soon.
          </p>
        </div>
      ) : (
        <>
          {/* Score distribution chart */}
          <div style={{ ...panel, padding: "20px 24px", marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Score Distribution</h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
              {data!.distribution.map(({ score, count }) => {
                const barH = count === 0 ? 4 : Math.max(12, (count / maxCount) * 72);
                const barColor = score >= 9 ? "#16a34a" : score >= 7 ? "#d97706" : "#dc2626";
                return (
                  <div key={score} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600 }}>
                      {count > 0 ? count : ""}
                    </span>
                    <div style={{
                      width: "100%", height: barH,
                      background: count === 0 ? "#f1f5f9" : barColor,
                      borderRadius: "4px 4px 0 0",
                    }} />
                    <span style={{ fontSize: 10, color: "#64748b" }}>{score}</span>
                  </div>
                );
              })}
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>Score (0 = Terrible, 10 = Amazing)</p>
          </div>

          {/* At-risk users */}
          {data!.lowScoreAlerts.length > 0 && (
            <div style={{ ...panel, padding: "20px 24px", marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#dc2626", display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={14} /> At-Risk Users — Follow Up Now
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data!.lowScoreAlerts.map((r) => (
                  <div key={r.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    padding: "12px 14px", background: "#fff7f7",
                    borderRadius: 10, border: "0.5px solid #fecaca",
                  }}>
                    <ScoreBadge score={r.score} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{r.name}</p>
                      {r.comment ? (
                        <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b", fontStyle: "italic" }}>
                          "{r.comment}"
                        </p>
                      ) : null}
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#94a3b8" }}>
                        {new Date(r.surveyedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All responses */}
          <div style={{ ...panel, padding: "20px 24px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
              <MessageSquare size={14} color="#64748b" /> All Responses
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {data!.responses.map((r, i) => (
                <div key={r.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "12px 0",
                  borderTop: i > 0 ? "0.5px solid #f1f5f9" : "none",
                }}>
                  <ScoreBadge score={r.score} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{r.name}</span>
                      <TierBadge tier={r.tier} />
                    </div>
                    {r.comment ? (
                      <p style={{ margin: 0, fontSize: 12, color: "#64748b", fontStyle: "italic" }}>
                        "{r.comment}"
                      </p>
                    ) : (
                      <p style={{ margin: 0, fontSize: 12, color: "#cbd5e1" }}>No comment</p>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>
                    {new Date(r.surveyedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
