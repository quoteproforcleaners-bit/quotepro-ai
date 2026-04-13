import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Ban,
  CreditCard,
  Send,
  Bot,
  BarChart2,
  FileText,
  Activity,
  ChevronRight,
  Download,
} from "lucide-react";
import { PageHeader, Button } from "../components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FinanceSnapshot {
  totalCollected: number;
  totalCollectedCount: number;
  totalFailed: number;
  totalUncharged: number;
  unchargedValue: number;
  jobs: AuditJob[];
  recentEvents: PaymentEvent[];
}

interface AuditJob {
  id: string;
  status: string;
  payment_status: string;
  charge_amount: number | null;
  charge_failure_reason: string | null;
  charged_at: string | null;
  start_datetime: string;
  first_name: string | null;
  last_name: string | null;
  has_payment_method: boolean;
  quote_total: string | null;
  email: string | null;
}

interface AuditData {
  failed: AuditJob[];
  uncharged: AuditJob[];
  missingCard: { id: string; first_name: string; last_name: string; email: string; phone: string }[];
  badgeCount: number;
}

interface PaymentEvent {
  event_type: string;
  amount_cents: number | null;
  created_at: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "audit", label: "Audit", icon: AlertCircle },
  { id: "reports", label: "Reports", icon: BarChart2 },
  { id: "ask-ai", label: "Ask AI", icon: Bot },
] as const;
type Tab = typeof TABS[number]["id"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtMoney(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtMoneyDollar(dollars: number) {
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(str: string) {
  return new Date(str).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function customerName(j: { first_name?: string | null; last_name?: string | null }) {
  return [j.first_name, j.last_name].filter(Boolean).join(" ") || "Unknown";
}

function jobAmount(j: AuditJob) {
  if (j.charge_amount) return fmtMoney(j.charge_amount);
  if (j.quote_total) return `$${parseFloat(j.quote_total).toFixed(2)}`;
  return "—";
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ snapshot }: { snapshot: FinanceSnapshot }) {
  const { t } = useTranslation();
  const collectionRate =
    snapshot.totalCollectedCount + snapshot.totalUncharged > 0
      ? Math.round((snapshot.totalCollectedCount / (snapshot.totalCollectedCount + snapshot.totalUncharged + snapshot.totalFailed)) * 100)
      : 0;

  const cards = [
    {
      label: t("finance.metrics.collected"),
      value: fmtMoneyDollar(snapshot.totalCollected),
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: t("finance.metrics.unchargedJobs"),
      value: `${snapshot.totalUncharged} jobs`,
      sub: fmtMoneyDollar(snapshot.unchargedValue) + " " + t("finance.metrics.pending"),
      icon: DollarSign,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: t("finance.metrics.failedCharges"),
      value: snapshot.totalFailed.toString(),
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: t("finance.metrics.collectionRate"),
      value: `${collectionRate}%`,
      icon: TrendingUp,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  // Last 30 days bar chart data by week
  const now = Date.now();
  const weeks: Record<string, number> = {};
  for (let w = 3; w >= 0; w--) {
    const label = `W${4 - w}`;
    weeks[label] = 0;
  }
  for (const j of snapshot.jobs) {
    if (j.payment_status !== "charged" || !j.charge_amount) continue;
    const ageMs = now - new Date(j.start_datetime).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays > 28) continue;
    const week = `W${4 - Math.floor(ageDays / 7)}`;
    if (week in weeks) weeks[week] += j.charge_amount;
  }
  const maxBar = Math.max(...Object.values(weeks), 1);

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`${c.bg} rounded-2xl p-4 flex flex-col gap-2`}>
            <div className={`flex items-center gap-2 ${c.color}`}>
              <c.icon className="w-4 h-4" />
              <span className="text-xs font-medium">{c.label}</span>
            </div>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            {c.sub ? <p className="text-xs text-slate-500">{c.sub}</p> : null}
          </div>
        ))}
      </div>

      {/* Weekly revenue bar chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <p className="text-sm font-semibold text-slate-800 mb-4">{t("finance.chart.revenueLastWeeks")}</p>
        <div className="flex items-end gap-3 h-32">
          {Object.entries(weeks).map(([label, cents]) => {
            const pct = maxBar > 0 ? (cents / maxBar) * 100 : 0;
            return (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-slate-500">{cents > 0 ? fmtMoney(cents) : ""}</span>
                <div className="w-full flex items-end" style={{ height: "80px" }}>
                  <div
                    className="w-full rounded-t-lg bg-violet-500 transition-all duration-500"
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-600">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent activity feed */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <p className="text-sm font-semibold text-slate-800 mb-3">{t("finance.activity.title")}</p>
        <div className="space-y-2">
          {snapshot.recentEvents.length === 0 ? (
            <p className="text-sm text-slate-400">{t("finance.activity.noEvents")}</p>
          ) : (
            snapshot.recentEvents.slice(0, 8).map((e, i) => {
              const icon =
                e.event_type === "charge_success"
                  ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  : e.event_type === "charge_failed"
                  ? <XCircle className="w-3.5 h-3.5 text-red-500" />
                  : e.event_type === "refund"
                  ? <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                  : e.event_type === "card_added"
                  ? <CreditCard className="w-3.5 h-3.5 text-violet-500" />
                  : <Activity className="w-3.5 h-3.5 text-slate-400" />;
              return (
                <div key={i} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                  {icon}
                  <span className="text-sm text-slate-700 capitalize flex-1">{e.event_type.replace(/_/g, " ")}</span>
                  {e.amount_cents ? (
                    <span className="text-sm font-medium text-slate-800">{fmtMoney(e.amount_cents)}</span>
                  ) : null}
                  <span className="text-xs text-slate-400">{fmtDate(e.created_at)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Audit Tab ────────────────────────────────────────────────────────────────

function AuditTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<AuditData>({ queryKey: ["/api/payments/audit"] });

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => apiRequest("POST", "/api/payments/retry-charge", { jobId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/payments/audit"] }),
  });

  const waiveMutation = useMutation({
    mutationFn: (jobId: string) => apiRequest("PATCH", `/api/payments/waive/${jobId}`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/payments/audit"] }),
  });

  const sendCardMutation = useMutation({
    mutationFn: (customerId: string) => apiRequest("POST", "/api/payments/send-card-request", { customerId }),
    onSuccess: () => {},
  });

  if (isLoading) return <div className="text-center py-12 text-slate-400">{t("finance.audit.loadingData")}</div>;

  const failed = data?.failed || [];
  const uncharged = data?.uncharged || [];
  const missingCard = data?.missingCard || [];

  return (
    <div className="space-y-6">
      {/* Failed charges */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <XCircle className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-semibold text-slate-800">{t("finance.audit.failedCharges")}</h3>
          {failed.length > 0 ? (
            <span className="ml-1 bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium">{failed.length}</span>
          ) : null}
        </div>
        {failed.length === 0 ? (
          <div className="bg-emerald-50 rounded-xl p-4 text-sm text-emerald-700">{t("finance.audit.noFailedCharges")}</div>
        ) : (
          <div className="space-y-2">
            {failed.map((j) => (
              <div key={j.id} className="bg-white border border-red-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{customerName(j)}</p>
                    <p className="text-xs text-slate-400">{fmtDate(j.start_datetime)} · {jobAmount(j)}</p>
                    {j.charge_failure_reason ? (
                      <p className="text-xs text-red-600 mt-1">{j.charge_failure_reason}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => retryMutation.mutate(j.id)}
                      disabled={retryMutation.isPending}
                      className="text-xs px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium"
                    >
                      {t("finance.audit.retry")}
                    </button>
                    <button
                      onClick={() => waiveMutation.mutate(j.id)}
                      disabled={waiveMutation.isPending}
                      className="text-xs px-2 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      {t("finance.audit.waive")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Uncharged completed jobs */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-slate-800">{t("finance.audit.unchargedJobs")}</h3>
          {uncharged.length > 0 ? (
            <span className="ml-1 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">{uncharged.length}</span>
          ) : null}
        </div>
        {uncharged.length === 0 ? (
          <div className="bg-emerald-50 rounded-xl p-4 text-sm text-emerald-700">{t("finance.audit.noUnchargedJobs")}</div>
        ) : (
          <div className="space-y-2">
            {uncharged.map((j) => (
              <div key={j.id} className="bg-white border border-amber-100 rounded-xl p-4 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{customerName(j)}</p>
                  <p className="text-xs text-slate-400">{fmtDate(j.start_datetime)} · {jobAmount(j)}</p>
                  {j.has_payment_method ? (
                    <span className="text-xs text-emerald-600 font-medium">{t("finance.audit.cardOnFile")}</span>
                  ) : (
                    <span className="text-xs text-slate-400">{t("finance.audit.noCard")}</span>
                  )}
                </div>
                {j.has_payment_method ? (
                  <button
                    onClick={() => retryMutation.mutate(j.id)}
                    disabled={retryMutation.isPending}
                    className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors font-medium shrink-0"
                  >
                    {t("finance.audit.chargeNow")}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Missing card */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">{t("finance.audit.missingCard")}</h3>
          {missingCard.length > 0 ? (
            <span className="ml-1 bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">{missingCard.length}</span>
          ) : null}
        </div>
        {missingCard.length === 0 ? (
          <div className="bg-emerald-50 rounded-xl p-4 text-sm text-emerald-700">{t("finance.audit.allHaveCard")}</div>
        ) : (
          <div className="space-y-2">
            {missingCard.map((c) => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{[c.first_name, c.last_name].filter(Boolean).join(" ") || "Unknown"}</p>
                  <p className="text-xs text-slate-400">{c.email}</p>
                </div>
                {c.email ? (
                  <button
                    onClick={() => sendCardMutation.mutate(c.id)}
                    disabled={sendCardMutation.isPending}
                    className="text-xs px-2 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors font-medium flex items-center gap-1 shrink-0"
                  >
                    <Send className="w-3 h-3" />
                    {t("finance.audit.requestCard")}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────

function ReportsTab({ snapshot }: { snapshot: FinanceSnapshot }) {
  const { t } = useTranslation();
  const jobs = snapshot.jobs;

  // Revenue summary by status
  const byStatus: Record<string, { count: number; totalCents: number }> = {};
  for (const j of jobs) {
    const s = j.payment_status || "unpaid";
    if (!byStatus[s]) byStatus[s] = { count: 0, totalCents: 0 };
    byStatus[s].count++;
    byStatus[s].totalCents += j.charge_amount || (j.quote_total ? parseFloat(j.quote_total) * 100 : 0);
  }

  // AR aging buckets (uncharged completed only)
  const agingBuckets = { "0-7": 0, "8-30": 0, "31-60": 0, "60+": 0 };
  const now = Date.now();
  for (const j of jobs) {
    if (j.status !== "completed" || j.payment_status !== "unpaid") continue;
    const ageDays = (now - new Date(j.start_datetime).getTime()) / (1000 * 60 * 60 * 24);
    const cents = j.charge_amount || (j.quote_total ? parseFloat(j.quote_total) * 100 : 0);
    if (ageDays <= 7) agingBuckets["0-7"] += cents;
    else if (ageDays <= 30) agingBuckets["8-30"] += cents;
    else if (ageDays <= 60) agingBuckets["31-60"] += cents;
    else agingBuckets["60+"] += cents;
  }

  // Collection efficiency
  const chargedCents = byStatus["charged"]?.totalCents || 0;
  const totalBillableCents = jobs.reduce((s, j) => s + (j.charge_amount || (j.quote_total ? parseFloat(j.quote_total) * 100 : 0)), 0);
  const efficiency = totalBillableCents > 0 ? Math.round((chargedCents / totalBillableCents) * 100) : 0;

  const exportCSV = () => {
    const rows = [["Date", "Customer", "Status", "Payment Status", "Amount"]];
    for (const j of jobs) {
      rows.push([
        fmtDate(j.start_datetime),
        customerName(j),
        j.status,
        j.payment_status,
        jobAmount(j),
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "finance-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" icon={Download} onClick={exportCSV}>
          {t("finance.reports.exportCsv")}
        </Button>
      </div>

      {/* Revenue summary */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <p className="text-sm font-semibold text-slate-800 mb-4">{t("finance.reports.revenueSummary")}</p>
        <div className="space-y-2">
          {Object.entries(byStatus).map(([status, data]) => (
            <div key={status} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-2">
                {status === "charged" ? <CheckCircle className="w-4 h-4 text-emerald-500" /> :
                 status === "failed" ? <XCircle className="w-4 h-4 text-red-500" /> :
                 status === "waived" ? <Ban className="w-4 h-4 text-slate-400" /> :
                 <DollarSign className="w-4 h-4 text-amber-400" />}
                <span className="text-sm text-slate-700 capitalize">{status}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{fmtMoney(data.totalCents)}</p>
                <p className="text-xs text-slate-400">{data.count} jobs</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Collection efficiency */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <p className="text-sm font-semibold text-slate-800 mb-2">{t("finance.reports.collectionEfficiency")}</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-100 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-700"
              style={{ width: `${efficiency}%` }}
            />
          </div>
          <span className="text-lg font-bold text-slate-800">{efficiency}%</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {fmtMoney(chargedCents)} {t("finance.reports.collected")} {fmtMoney(totalBillableCents)} {t("finance.reports.billed")}
        </p>
      </div>

      {/* AR Aging */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <p className="text-sm font-semibold text-slate-800 mb-4">{t("finance.reports.arAging")}</p>
        <div className="space-y-2">
          {Object.entries(agingBuckets).map(([bucket, cents]) => (
            <div key={bucket} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-600">{bucket} {t("finance.reports.days")}</span>
              <span className={`text-sm font-semibold ${cents > 0 ? "text-amber-700" : "text-slate-400"}`}>
                {fmtMoney(cents)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Ask AI Tab ───────────────────────────────────────────────────────────────

function AskAITab() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamBuffer]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: ChatMessage = { role: "user", content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setStreaming(true);
    setStreamBuffer("");

    try {
      const res = await fetch("/api/intelligence/finance-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text, history: messages }),
      });

      if (!res.ok) throw new Error("Request failed");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              full += parsed.text;
              setStreamBuffer(full);
            }
          } catch {}
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: full }]);
      setStreamBuffer("");
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: t("finance.askAi.error") }]);
    } finally {
      setStreaming(false);
    }
  };

  const allMessages = streamBuffer
    ? [...messages, { role: "assistant" as const, content: streamBuffer }]
    : messages;

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[400px]">
      {/* Chat history */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {allMessages.length === 0 ? (
          <div className="space-y-4 pt-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-violet-100 rounded-2xl mb-3">
                <Bot className="w-7 h-7 text-violet-600" />
              </div>
              <p className="text-base font-semibold text-slate-800">{t("finance.askAi.title")}</p>
              <p className="text-sm text-slate-500 mt-1">{t("finance.askAi.subtitle")}</p>
            </div>
            <div className="space-y-2">
              {(Object.keys(t("finance.askAi.suggestedQuestions", { returnObjects: true })) as string[]).map((key) => {
                const q = t(`finance.askAi.suggestedQuestions.${key}`);
                return (
                  <button
                    key={key}
                    onClick={() => sendMessage(q)}
                    className="w-full text-left text-sm text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-violet-300 hover:bg-violet-50 transition-colors flex items-center justify-between group"
                  >
                    {q}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          allMessages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-violet-600 text-white rounded-br-sm"
                    : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                }`}
              >
                {m.content}
                {i === allMessages.length - 1 && streaming && m.role === "assistant" ? (
                  <span className="inline-block w-1.5 h-4 bg-slate-400 rounded-full animate-pulse ml-0.5 align-middle" />
                ) : null}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 pt-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            placeholder={t("finance.askAi.placeholder")}
            disabled={streaming}
            className="flex-1 text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 disabled:bg-slate-50"
          />
          <Button
            size="sm"
            onClick={() => sendMessage(input)}
            loading={streaming}
            disabled={!input.trim() || streaming}
            className="px-4"
          >
            {t("finance.askAi.send")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { data: snapshot, isLoading: snapshotLoading } = useQuery<FinanceSnapshot>({
    queryKey: ["/api/payments/finance-snapshot"],
  });

  const { data: audit } = useQuery<AuditData>({
    queryKey: ["/api/payments/audit"],
  });

  const badgeCount = audit?.badgeCount || 0;

  return (
    <div className="max-w-4xl mx-auto px-4 pb-16">
      <PageHeader
        title={t("finance.title")}
        description={t("finance.description")}
        icon={DollarSign}
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all relative ${
                isActive ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t(`finance.tabs.${tab.id === "ask-ai" ? "askAi" : tab.id}`)}</span>
              {tab.id === "audit" && badgeCount > 0 ? (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {badgeCount > 9 ? "9+" : badgeCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {snapshotLoading ? (
        <div className="text-center py-16 text-slate-400">{t("finance.loading")}</div>
      ) : snapshot ? (
        <>
          {activeTab === "overview" ? <OverviewTab snapshot={snapshot} /> : null}
          {activeTab === "audit" ? <AuditTab /> : null}
          {activeTab === "reports" ? <ReportsTab snapshot={snapshot} /> : null}
          {activeTab === "ask-ai" ? <AskAITab /> : null}
        </>
      ) : (
        <div className="text-center py-16 text-slate-400">{t("finance.loadError")}</div>
      )}
    </div>
  );
}
