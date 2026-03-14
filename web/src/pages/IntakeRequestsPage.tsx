import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { apiRequest } from "../lib/api";
import { PageHeader, Card, Badge, Button, EmptyState } from "../components/ui";
import {
  Inbox, User, Phone, Mail, Home, RefreshCw, Trash2, ChevronRight, ChevronDown, Sparkles,
  Clock, CheckCircle, Copy, ExternalLink, Flag, AlertTriangle, Send, X, Edit3, FileText,
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

function IntakeCard({ req, tab, onRefresh }: { req: IntakeRequest; tab: TabKey; onRefresh: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [reviewNotes, setReviewNotes] = useState(req.reviewNotes || "");
  const [editFields, setEditFields] = useState({ ...req.extractedFields });

  const dismiss = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/intake-requests/${req.id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/intake-requests"] }); onRefresh(); },
  });

  const patch = useMutation({
    mutationFn: (data: Record<string, any>) => apiRequest("PATCH", `/api/intake-requests/${req.id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/intake-requests"] }); onRefresh(); },
  });

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

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-700 font-semibold text-sm">{req.customerName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="font-semibold text-slate-900 text-sm">{req.customerName}</span>
              {!isDone ? <ConfidenceBadge level={req.confidence || "low"} /> : null}
              {f.frequency && f.frequency !== "one-time" && (
                <Badge variant="success">{FREQ_LABELS[f.frequency]}</Badge>
              )}
              {req.status === "converted" && <Badge variant="success">Converted</Badge>}
              {req.status === "dismissed" && <Badge variant="default">Dismissed</Badge>}
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
        <div className="border-t border-slate-100 px-4 py-3 flex items-center gap-2 bg-slate-50/50">
          <Button
            size="sm"
            onClick={() => navigate(`/quotes/new?${buildQueryString(f)}`)}
            className="flex-1"
          >
            <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Build Quote
          </Button>
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

  const intakeUrl = business ? `${window.location.origin}/intake/${business.id}` : "";

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
      setSendErr("Failed to send. Check your SendGrid configuration.");
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
        action={
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

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-8 h-8 text-slate-400" />}
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
