import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { apiRequest } from "../lib/api";
import { PageHeader, Card, Badge, Button, EmptyState, Avatar } from "../components/ui";
import {
  Inbox, User, Phone, Mail, Home, RefreshCw, Trash2, ChevronRight, ChevronDown, Sparkles,
  Clock, CheckCircle, Copy, ExternalLink, Flag, AlertTriangle, Send, X, Edit3, FileText, Zap,
  XCircle, Loader2,
} from "lucide-react";

const SERVICE_LABELS: Record<string, string> = {
  standard_cleaning: "Standard Clean",
  deep_clean: "Deep Clean",
  move_in_out: "Move-In/Out",
  recurring: "Recurring",
  airbnb: "Airbnb",
  post_construction: "Post-Construction",
};

const FREQ_LABELS: Record<string, string> = {
  "one-time": "One-Time",
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  monthly: "Monthly",
};

const ADD_ON_LABELS: Record<string, string> = {
  insideFridge: "Fridge",
  insideOven: "Oven",
  insideCabinets: "Cabinets",
  interiorWindows: "Windows",
  blindsDetail: "Blinds",
  baseboardsDetail: "Baseboards",
  laundryFoldOnly: "Laundry",
  dishes: "Dishes",
  organizationTidy: "Organize",
};

const SERVICE_OPTIONS = [
  { value: "standard_cleaning", label: "Standard Clean" },
  { value: "deep_clean", label: "Deep Clean" },
  { value: "move_in_out", label: "Move-In/Out" },
  { value: "airbnb", label: "Airbnb Turnover" },
  { value: "post_construction", label: "Post-Construction" },
  { value: "recurring", label: "Recurring" },
];

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

interface IntakeRequest {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  rawText?: string;
  extractedFields: {
    serviceType?: string | null;
    beds?: number | null;
    baths?: number | null;
    sqft?: number | null;
    frequency?: string | null;
    pets?: boolean | null;
    petType?: string | null;
    addOns?: Record<string, boolean>;
    notes?: string | null;
    clarificationQuestions?: string[];
  };
  status: string;
  confidence: "high" | "medium" | "low";
  reviewNotes: string;
  missingFieldFlags: string[];
  followUpSent: boolean;
  source: string;
  createdAt: string;
  autopilotEnrolled?: boolean;
  autopilotEnrolledAt?: string | null;
  autopilotStatus?: "queued" | "generating" | "quote_sent" | "failed" | null;
  autopilotError?: string | null;
  autopilotQuoteSentAt?: string | null;
  quoteEmailSentAt?: string | null;
}

type TabKey = "new" | "review" | "done";

function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const cfg = {
    high: { bg: "bg-emerald-100", text: "text-emerald-700", label: "High confidence" },
    medium: { bg: "bg-amber-100", text: "text-amber-700", label: "Review fields" },
    low: { bg: "bg-red-100", text: "text-red-700", label: "Needs review" },
  }[level] || { bg: "bg-slate-100", text: "text-slate-600", label: "Unknown" };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${level === "high" ? "bg-emerald-500" : level === "medium" ? "bg-amber-500" : "bg-red-500"}`} />
      {cfg.label}
    </span>
  );
}

// Helper: minimum viability check for autopilot enrollment
function canEnrollInAutopilot(r: IntakeRequest): { ok: boolean; reason: string } {
  if (!r.customerEmail) return { ok: false, reason: "No email address — autopilot requires an email to send the quote" };
  return { ok: true, reason: "" };
}

// Status config for the autopilot status badge
const AUTOPILOT_STATUS_CFG = {
  queued:      { label: "Queued...",          icon: Loader2,      spin: true,  color: "#6366f1", bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.25)" },
  generating:  { label: "Generating quote...", icon: Loader2,      spin: true,  color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
  quote_sent:  { label: "Quote sent",          icon: CheckCircle,  spin: false, color: "#1a7f37", bg: "rgba(52,199,89,0.12)", border: "rgba(52,199,89,0.25)" },
  failed:      { label: "Failed",              icon: XCircle,      spin: false, color: "#dc2626", bg: "rgba(220,38,38,0.08)", border: "rgba(220,38,38,0.2)" },
};

function IntakeCard({ req, tab, onRefresh }: { req: IntakeRequest; tab: TabKey; onRefresh: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [reviewNotes, setReviewNotes] = useState(req.reviewNotes || "");
  const [editFields, setEditFields] = useState({ ...req.extractedFields });
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // Track autopilot status locally so polling updates work without refetching the list
  const [apStatus, setApStatus] = useState<string | null>(req.autopilotStatus ?? (req.autopilotEnrolled ? "queued" : null));
  const [apError, setApError] = useState<string | null>(req.autopilotError ?? null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollCountRef.current = 0;
    pollRef.current = setInterval(async () => {
      pollCountRef.current++;
      if (pollCountRef.current > 24) { // 2 minutes max
        stopPolling();
        return;
      }
      try {
        const data: any = await apiRequest("GET", `/api/autopilot/intake-status/${req.id}`).then(r => r.json());
        if (data.autopilotStatus) {
          setApStatus(data.autopilotStatus);
          setApError(data.autopilotError ?? null);
          if (data.autopilotStatus === "quote_sent" || data.autopilotStatus === "failed") {
            stopPolling();
            // Refresh the list query so data is consistent
            qc.invalidateQueries({ queryKey: ["/api/intake-requests"] });
          }
        }
      } catch {
        // Silently ignore poll errors
      }
    }, 5000);
  }, [req.id, qc, stopPolling]);

  // Start polling automatically if already in-progress state on mount
  useEffect(() => {
    if (apStatus === "queued" || apStatus === "generating") {
      startPolling();
    }
    return stopPolling;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/intake-requests/${req.id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/intake-requests"] }); onRefresh(); },
  });

  const patch = useMutation({
    mutationFn: (data: Record<string, any>) => apiRequest("PATCH", `/api/intake-requests/${req.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/intake-requests"] }); onRefresh(); },
  });

  const enrollAutopilot = useMutation({
    mutationFn: () => apiRequest("POST", `/api/autopilot/enroll-intake/${req.id}`).then(r => r.json()),
    onSuccess: (data: any) => {
      setApStatus(data?.autopilotStatus ?? "queued");
      setApError(null);
      setEnrollError(null);
      startPolling();
      qc.invalidateQueries({ queryKey: ["/api/intake-requests"] });
      qc.invalidateQueries({ queryKey: ["/api/autopilot/jobs"] });
    },
    onError: (err: any) => {
      if (err?.data?.upsell || err?.data?.requiresUpgrade) {
        setEnrollError("Upgrade to Growth or Pro to use Autopilot");
      } else {
        setEnrollError(err?.message || "Failed to enroll — please try again");
      }
    },
  });

  const enrollability = canEnrollInAutopilot(req);

  function buildQueryString(fields: typeof req.extractedFields) {
    const p = new URLSearchParams();
    if (req.customerName) p.set("name", req.customerName);
    if (req.customerEmail) p.set("email", req.customerEmail);
    if (req.customerPhone) p.set("phone", req.customerPhone);
    if (req.customerAddress) p.set("address", req.customerAddress);
    if (fields.beds) p.set("beds", String(fields.beds));
    if (fields.baths) p.set("baths", String(fields.baths));
    if (fields.sqft) p.set("sqft", String(fields.sqft));
    if (fields.serviceType) p.set("serviceType", fields.serviceType);
    if (fields.frequency) p.set("frequency", fields.frequency);
    if (fields.petType) p.set("petType", fields.petType);
    p.set("intakeId", req.id);
    return p.toString();
  }

  const f = editMode ? editFields : req.extractedFields;
  const addOns = Object.entries(f.addOns || {}).filter(([, v]) => v).map(([k]) => ADD_ON_LABELS[k] || k);
  const isDone = tab === "done";

  function handleSaveEdit() {
    patch.mutate({ extractedFields: editFields, reviewNotes });
    setEditMode(false);
  }

  // Urgency: hours since creation
  const hoursOld = Math.floor((Date.now() - new Date(req.createdAt).getTime()) / 3600000);
  const showUrgency = hoursOld >= 1;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar name={req.customerName || "?"} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="font-semibold text-slate-900 text-sm">{req.customerName}</span>
              {showUrgency && !isDone && (
                <span style={{
                  fontSize: "10px", fontWeight: 600,
                  background: "rgba(255,149,0,0.12)",
                  color: "#c47400",
                  border: "0.5px solid rgba(255,149,0,0.25)",
                  borderRadius: "20px",
                  padding: "1px 7px",
                }}>
                  {hoursOld}h old
                </span>
              )}
              {!isDone ? <ConfidenceBadge level={req.confidence || "low"} /> : null}
              {f.frequency && f.frequency !== "one-time" && (
                <Badge status="success" label={FREQ_LABELS[f.frequency] || f.frequency} />
              )}
              {req.status === "converted" && <Badge status="success" label="Converted" />}
              {req.status === "dismissed" && <Badge status="draft" label="Dismissed" />}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {req.customerPhone && (
                <span className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{req.customerPhone}</span>
              )}
              {req.customerEmail && (
                <span className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" />{req.customerEmail}</span>
              )}
            </div>
            {(f.beds || f.baths || f.sqft) && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Home className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-600">
                  {[f.beds && `${f.beds} bed`, f.baths && `${f.baths} bath`, f.sqft && `${f.sqft.toLocaleString()} sq ft`].filter(Boolean).join(" · ")}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(req.createdAt)}</span>
            {f.serviceType && (
              <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full">{SERVICE_LABELS[f.serviceType] || f.serviceType}</span>
            )}
          </div>
        </div>

        {/* Missing fields warning */}
        {!isDone && req.missingFieldFlags && req.missingFieldFlags.length > 0 && (
          <div className="mt-2.5 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              <span className="font-semibold">Missing: </span>
              {req.missingFieldFlags.slice(0, 4).join(", ")}{req.missingFieldFlags.length > 4 ? ` +${req.missingFieldFlags.length - 4}` : ""}
            </p>
          </div>
        )}

        {/* Clarification questions */}
        {!isDone && req.extractedFields.clarificationQuestions && req.extractedFields.clarificationQuestions.length > 0 && (
          <div className="mt-2 bg-slate-50 rounded-lg px-3 py-2">
            <p className="text-xs font-semibold text-slate-500 mb-1">Ask the customer:</p>
            {req.extractedFields.clarificationQuestions.map((q, i) => (
              <p key={i} className="text-xs text-slate-600">{i + 1}. {q}</p>
            ))}
          </div>
        )}

        {/* Notes */}
        {f.notes && (
          <div className="mt-2.5 bg-slate-50 rounded-lg px-3 py-2 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-600 italic">"{f.notes}"</p>
          </div>
        )}

        {/* Add-ons */}
        {addOns.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {addOns.map(a => (
              <span key={a} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{a}</span>
            ))}
          </div>
        )}

        {/* Edit Mode */}
        {editMode && (
          <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <p className="text-xs font-semibold text-slate-600">Edit Extracted Fields</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500">Service Type</label>
                <select
                  className="w-full mt-0.5 border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  value={editFields.serviceType || ""}
                  onChange={e => setEditFields(f => ({ ...f, serviceType: e.target.value || null }))}
                >
                  <option value="">Unknown</option>
                  {SERVICE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Frequency</label>
                <select
                  className="w-full mt-0.5 border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                  value={editFields.frequency || ""}
                  onChange={e => setEditFields(f => ({ ...f, frequency: e.target.value || null }))}
                >
                  <option value="">Unknown</option>
                  <option value="one-time">One-time</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Beds", key: "beds" as const },
                { label: "Baths", key: "baths" as const },
                { label: "Sq Ft", key: "sqft" as const },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-xs text-slate-500">{label}</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full mt-0.5 border border-slate-200 rounded-lg px-2 py-1.5 text-xs"
                    value={editFields[key] ?? ""}
                    onChange={e => setEditFields(f => ({ ...f, [key]: e.target.value ? parseFloat(e.target.value) : null }))}
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs text-slate-500">Review Notes</label>
              <textarea
                className="w-full mt-0.5 border border-slate-200 rounded-lg px-2 py-1.5 text-xs resize-none"
                rows={2}
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                placeholder="Internal notes for this request..."
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={patch.isPending}
                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {patch.isPending ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => { setEditMode(false); setEditFields({ ...req.extractedFields }); setReviewNotes(req.reviewNotes || ""); }}
                className="px-3 py-1.5 border border-slate-200 text-xs text-slate-600 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Review notes (read mode) */}
        {!editMode && req.reviewNotes && (
          <div className="mt-2.5 flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-2">
            <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-600">{req.reviewNotes}</p>
          </div>
        )}

        {/* Raw text toggle */}
        {req.rawText && (
          <button onClick={() => setExpanded(e => !e)} className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
            <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
            {expanded ? "Hide" : "Show"} original message
          </button>
        )}
        {expanded && req.rawText && (
          <div className="mt-1.5 bg-blue-50 rounded-lg px-3 py-2 text-xs text-slate-700 italic border border-blue-100">
            "{req.rawText}"
          </div>
        )}
      </div>

      {/* Action bar */}
      {!isDone ? (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={() => navigate(`/quotes/new?${buildQueryString(f)}`)}
              className="flex-1"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Build Quote
            </Button>
            {(() => {
              const cfg = apStatus ? AUTOPILOT_STATUS_CFG[apStatus as keyof typeof AUTOPILOT_STATUS_CFG] : null;
              const isInProgress = apStatus === "queued" || apStatus === "generating";
              const isTerminal = apStatus === "quote_sent" || apStatus === "failed";
              const canEnroll = enrollability.ok;

              if (cfg && (isInProgress || isTerminal)) {
                const Icon = cfg.icon;
                return (
                  <button
                    onClick={apStatus === "quote_sent" ? () => navigate("/autopilot") : (apStatus === "failed" ? () => { setApStatus(null); setApError(null); } : undefined)}
                    title={apStatus === "failed" ? (apError || "Failed — click to retry") : cfg.label}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "5px",
                      fontSize: "11px", fontWeight: 600,
                      padding: "4px 10px", borderRadius: "8px",
                      background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}`,
                      cursor: apStatus === "failed" ? "pointer" : apStatus === "quote_sent" ? "pointer" : "default",
                      flexShrink: 0,
                    }}
                  >
                    <Icon style={{ width: "11px", height: "11px" }} className={cfg.spin ? "animate-spin" : ""} />
                    {cfg.label}
                    {apStatus === "failed" && <span style={{ fontSize: "10px", opacity: 0.8 }}>(retry)</span>}
                  </button>
                );
              }

              return (
                <button
                  onClick={() => {
                    if (!canEnroll) return;
                    setEnrollError(null);
                    enrollAutopilot.mutate();
                  }}
                  disabled={enrollAutopilot.isPending || !canEnroll}
                  title={!canEnroll ? enrollability.reason : "Send an AI-personalized quote via email automatically"}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    fontSize: "11px", fontWeight: 600,
                    padding: "4px 10px", borderRadius: "8px",
                    background: canEnroll ? "rgba(0,122,255,0.08)" : "rgba(0,0,0,0.04)",
                    color: canEnroll ? "var(--blue)" : "#94a3b8",
                    border: `0.5px solid ${canEnroll ? "rgba(0,122,255,0.18)" : "rgba(0,0,0,0.08)"}`,
                    cursor: canEnroll ? "pointer" : "not-allowed",
                    flexShrink: 0,
                    opacity: enrollAutopilot.isPending ? 0.6 : 1,
                  }}
                >
                  <Zap style={{ width: "11px", height: "11px" }} />
                  {enrollAutopilot.isPending ? "Enrolling…" : "Enroll in Autopilot"}
                </button>
              );
            })()}
            {tab === "new" && (
              <button
                onClick={() => patch.mutate({ status: "needs_review" })}
                disabled={patch.isPending}
                className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 border border-amber-200 transition-colors"
                title="Flag for review"
              >
                <Flag className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setEditMode(e => !e)}
              className={`p-2 rounded-lg transition-colors ${editMode ? "bg-blue-100 text-blue-600" : "text-slate-400 hover:text-blue-500 hover:bg-blue-50"}`}
              title="Edit fields"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => dismiss.mutate()}
              disabled={dismiss.isPending}
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Dismiss"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          {enrollError ? (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />{enrollError}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="border-t border-slate-100 px-4 py-2.5 flex items-center gap-2">
          {req.status === "converted" ? (
            <span className="text-xs text-emerald-600 flex items-center gap-1.5 font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> Converted to quote
            </span>
          ) : (
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <X className="w-3.5 h-3.5" /> Dismissed
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

export default function IntakeRequestsPage() {
  const { business } = useAuth();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("new");
  const [sendLinkEmail, setSendLinkEmail] = useState("");
  const [sendLinkName, setSendLinkName] = useState("");
  const [sendLinkOpen, setSendLinkOpen] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [sendErr, setSendErr] = useState("");

  const { data: requests = [], isLoading, refetch } = useQuery<IntakeRequest[]>({
    queryKey: ["/api/intake-requests", activeTab],
    queryFn: () => apiRequest("GET", `/api/intake-requests?filter=${activeTab}`).then(r => r.json()),
  });

  const { data: countData } = useQuery<{ count: number; newCount: number; reviewCount: number }>({
    queryKey: ["/api/intake-requests/count"],
  });

  const qc = useQueryClient();
  const [enrollAllResult, setEnrollAllResult] = useState<{ enrolled: number; message: string } | null>(null);
  const enrollAll = useMutation({
    mutationFn: () => apiRequest("POST", "/api/autopilot/enroll-all-intake", {}).then(r => r.json()),
    onSuccess: (data: any) => {
      setEnrollAllResult({ enrolled: data.enrolled || 0, message: data.message || "Done!" });
      qc.invalidateQueries({ queryKey: ["/api/intake-requests"] });
      setTimeout(() => setEnrollAllResult(null), 6000);
    },
  });

  const { data: linkData } = useQuery<{ url: string; code: string; businessName: string }>({
    queryKey: ["/api/intake-requests/my-link"],
  });

  const intakeUrl = linkData?.url || "";

  function copyLink() {
    navigator.clipboard.writeText(intakeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleSendLink() {
    if (!sendLinkEmail.trim()) return;
    setSendingLink(true);
    setSendErr("");
    try {
      await apiRequest("POST", "/api/intake-requests/send-link", {
        toEmail: sendLinkEmail.trim(),
        toName: sendLinkName.trim() || undefined,
      });
      setLinkSent(true);
      setSendLinkEmail("");
      setSendLinkName("");
      setTimeout(() => { setLinkSent(false); setSendLinkOpen(false); }, 2500);
    } catch (e: any) {
      setSendErr(e?.message || "Email could not be delivered. Please try again or contact support.");
    } finally {
      setSendingLink(false);
    }
  }

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: "new", label: "New", count: countData?.newCount },
    { key: "review", label: "Needs Review", count: countData?.reviewCount },
    { key: "done", label: "Done" },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <PageHeader
        title="Quote Requests"
        subtitle="Manage leads who submitted requests through your intake form"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSendLinkOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              <Send className="w-4 h-4" /> Send Link
            </button>
            <button onClick={() => refetch()} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Intake link card */}
      <Card>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <ExternalLink className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700">Your Public Intake Link</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-slate-100 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 font-mono truncate">
                {intakeUrl}
              </div>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors flex-shrink-0"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <a href={intakeUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Send Link expansion */}
        {sendLinkOpen && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            <p className="text-xs font-semibold text-slate-600">Send intake link by email</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Contact name (optional)"
                value={sendLinkName}
                onChange={e => setSendLinkName(e.target.value)}
              />
              <input
                type="email"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Email address"
                value={sendLinkEmail}
                onChange={e => setSendLinkEmail(e.target.value)}
              />
            </div>
            {sendErr && <p className="text-xs text-red-600">{sendErr}</p>}
            {linkSent ? (
              <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                <CheckCircle className="w-4 h-4" /> Link sent successfully!
              </div>
            ) : (
              <button
                onClick={handleSendLink}
                disabled={!sendLinkEmail.trim() || sendingLink}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                {sendingLink ? "Sending..." : "Send Link"}
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${tab.key === "review" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alert banner — leads waiting >2hrs OR success after bulk enroll */}
      {activeTab === "new" && (() => {
        const staleleads = requests.filter((r: IntakeRequest) => {
          const hrs = (Date.now() - new Date(r.createdAt).getTime()) / 3600000;
          return hrs >= 2 && !r.autopilotEnrolled;
        });
        const eligibleLeads = requests.filter((r: IntakeRequest) => !r.autopilotEnrolled && !!r.customerEmail);

        if (enrollAllResult) {
          return (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
              background: "rgba(52,199,89,0.08)", border: "0.5px solid rgba(52,199,89,0.2)",
              borderRadius: "var(--r12)", padding: "11px 16px",
            }}>
              <p style={{ fontSize: "12px", color: "#1a7f37", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle style={{ width: "14px", height: "14px" }} />
                {enrollAllResult.message}
              </p>
              <button onClick={() => setEnrollAllResult(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: "2px" }}>
                <X style={{ width: "14px", height: "14px" }} />
              </button>
            </div>
          );
        }

        if (staleleads.length > 0 || eligibleLeads.length > 0) {
          const count = eligibleLeads.length;
          return (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
              background: staleleads.length > 0 ? "rgba(255,149,0,0.08)" : "rgba(99,102,241,0.06)",
              border: `0.5px solid ${staleleads.length > 0 ? "rgba(255,149,0,0.20)" : "rgba(99,102,241,0.18)"}`,
              borderRadius: "var(--r12)", padding: "11px 16px",
            }}>
              <p style={{ fontSize: "12px", color: "var(--t2)", margin: 0 }}>
                {staleleads.length > 0 ? (
                  <>
                    <span style={{ fontWeight: 600, color: "#c47400" }}>
                      {staleleads.length} lead{staleleads.length !== 1 ? "s" : ""}
                    </span>
                    {" "}waiting more than 2 hours — let Autopilot send quotes while you focus on other work.
                  </>
                ) : (
                  <>
                    <span style={{ fontWeight: 600, color: "#6366f1" }}>
                      {count} lead{count !== 1 ? "s" : ""}
                    </span>
                    {" "}ready for Autopilot — send AI-personalized quotes instantly.
                  </>
                )}
              </p>
              <button
                onClick={() => enrollAll.mutate()}
                disabled={enrollAll.isPending || count === 0}
                style={{
                  fontSize: "11px", fontWeight: 600,
                  color: staleleads.length > 0 ? "#c47400" : "#6366f1",
                  background: staleleads.length > 0 ? "rgba(255,149,0,0.12)" : "rgba(99,102,241,0.1)",
                  border: `0.5px solid ${staleleads.length > 0 ? "rgba(255,149,0,0.25)" : "rgba(99,102,241,0.25)"}`,
                  borderRadius: "8px", padding: "4px 10px", cursor: count > 0 ? "pointer" : "default",
                  flexShrink: 0, opacity: enrollAll.isPending || count === 0 ? 0.6 : 1,
                  display: "inline-flex", alignItems: "center", gap: "5px",
                }}
              >
                <Zap style={{ width: "11px", height: "11px" }} />
                {enrollAll.isPending ? "Enrolling…" : `Enroll All${count > 0 ? ` (${count})` : ""}`}
              </button>
            </div>
          );
        }

        return null;
      })()}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={activeTab === "new" ? "No new requests" : activeTab === "review" ? "No requests flagged for review" : "No completed requests"}
          description={
            activeTab === "new"
              ? "When customers submit your intake form, their requests appear here."
              : activeTab === "review"
              ? "Requests are automatically flagged when AI confidence is low or fields are missing."
              : "Converted and dismissed requests will appear here."
          }
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            {requests.length} {activeTab === "new" ? "new" : activeTab === "review" ? "flagged" : "completed"} {requests.length === 1 ? "request" : "requests"}
          </p>
          {requests.map(r => (
            <IntakeCard key={r.id} req={r} tab={activeTab} onRefresh={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}
