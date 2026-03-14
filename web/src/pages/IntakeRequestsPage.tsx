import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { apiRequest } from "../lib/api";
import {
  PageHeader,
  Card,
  Badge,
  Button,
  EmptyState,
} from "../components/ui";
import {
  Inbox,
  User,
  Phone,
  Mail,
  Home,
  RefreshCw,
  Trash2,
  ChevronRight,
  Sparkles,
  Clock,
  CheckCircle,
  Copy,
  ExternalLink,
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
    confidence?: string;
  };
  status: string;
  source: string;
  createdAt: string;
}

function IntakeCard({ req, businessId }: { req: IntakeRequest; businessId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const dismiss = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/intake-requests/${req.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/intake-requests"] }),
  });

  const f = req.extractedFields || {};
  const addOns = Object.entries(f.addOns || {}).filter(([, v]) => v).map(([k]) => ADD_ON_LABELS[k] || k);

  function buildQueryString() {
    const p = new URLSearchParams();
    if (req.customerName) p.set("name", req.customerName);
    if (req.customerEmail) p.set("email", req.customerEmail);
    if (req.customerPhone) p.set("phone", req.customerPhone);
    if (f.beds) p.set("beds", String(f.beds));
    if (f.baths) p.set("baths", String(f.baths));
    if (f.sqft) p.set("sqft", String(f.sqft));
    if (f.serviceType) p.set("serviceType", f.serviceType);
    if (f.frequency) p.set("frequency", f.frequency);
    if (f.petType) p.set("petType", f.petType);
    p.set("intakeId", req.id);
    return p.toString();
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 font-semibold text-sm">{req.customerName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-900 text-sm">{req.customerName}</span>
                {f.serviceType && (
                  <Badge variant="default">{SERVICE_LABELS[f.serviceType] || f.serviceType}</Badge>
                )}
                {f.frequency && f.frequency !== "one-time" && (
                  <Badge variant="success">{FREQ_LABELS[f.frequency]}</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {req.customerPhone && (
                  <span className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{req.customerPhone}</span>
                )}
                {req.customerEmail && (
                  <span className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" />{req.customerEmail}</span>
                )}
              </div>
              {(f.beds || f.baths || f.sqft) && (
                <div className="flex items-center gap-2 mt-1">
                  <Home className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-600">
                    {[f.beds && `${f.beds} bed`, f.baths && `${f.baths} bath`, f.sqft && `${f.sqft.toLocaleString()} sq ft`].filter(Boolean).join(" · ")}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(req.createdAt)}</span>
            {req.source === "intake_form" && (
              <Badge variant="default" className="text-xs">Web Form</Badge>
            )}
          </div>
        </div>

        {f.notes && (
          <div className="mt-3 bg-slate-50 rounded-lg px-3 py-2 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-600 italic">"{f.notes}"</p>
          </div>
        )}

        {req.rawText && (
          <button onClick={() => setExpanded(e => !e)} className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
            <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
            {expanded ? "Hide" : "Show"} original message
          </button>
        )}
        {expanded && req.rawText && (
          <div className="mt-2 bg-blue-50 rounded-lg px-3 py-2 text-xs text-slate-700 italic border border-blue-100">
            "{req.rawText}"
          </div>
        )}

        {addOns.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {addOns.map(a => (
              <span key={a} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{a}</span>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 px-4 py-3 flex items-center gap-2 bg-slate-50/50">
        <Button
          size="sm"
          onClick={() => navigate(`/quotes/new?${buildQueryString()}`)}
          className="flex-1"
        >
          <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Convert to Quote
        </Button>
        <button
          onClick={() => dismiss.mutate()}
          disabled={dismiss.isPending}
          className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Dismiss"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
}

export default function IntakeRequestsPage() {
  const { business } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: requests = [], isLoading, refetch } = useQuery<IntakeRequest[]>({
    queryKey: ["/api/intake-requests"],
  });

  const intakeUrl = business ? `${window.location.origin}/intake/${business.id}` : "";

  function copyLink() {
    navigator.clipboard.writeText(intakeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Quote Requests"
        subtitle="Customers who submitted a quote request through your intake form"
        action={
          <button onClick={() => refetch()} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      {/* Intake Link Card */}
      <Card>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <ExternalLink className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm">Your Intake Link</p>
            <p className="text-xs text-slate-500 mt-0.5 mb-2">Share this link with leads — they'll fill out a form and their request appears here.</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 rounded-lg px-3 py-1.5 text-xs text-slate-600 font-mono truncate">
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
      </Card>

      {/* Requests List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-8 h-8 text-slate-400" />}
          title="No pending requests"
          description="When customers submit through your intake form, their requests will appear here so you can convert them to quotes."
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 font-medium">{requests.length} pending request{requests.length !== 1 ? "s" : ""}</p>
          {requests.map(r => (
            <IntakeCard key={r.id} req={r} businessId={business?.id || ""} />
          ))}
        </div>
      )}
    </div>
  );
}
