import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { apiPut, apiDelete, apiPost, apiGet } from "../lib/api";
import {
  ExternalLink,
  Copy,
  Send,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Home,
  Bed,
  Bath,
  Maximize,
  PawPrint,
  Users as UsersIcon,
  Sparkles,
  MessageSquare,
  FileText,
  Link2,
  RefreshCw,
  DollarSign,
  Star,
  Gift,
  Calendar,
  Mail,
  Phone,
  Eye,
  CreditCard,
  TrendingUp,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Zap,
  Receipt,
} from "lucide-react";
import { useState } from "react";
import {
  PageHeader,
  Card,
  CardHeader,
  Badge,
  Button,
  ConfirmModal,
  Spinner,
  EmptyState,
  Timeline,
  Toggle,
  ProgressBar,
} from "../components/ui";

type MessagePurpose = "send_quote" | "follow_up" | "thank_you" | "reminder" | "upsell" | "review_request" | "payment_failed";
type MessageChannel = "email" | "sms";

export default function QuoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [aiDrafts, setAiDrafts] = useState<Record<string, string>>({});
  const [aiDraftLoading, setAiDraftLoading] = useState<string | null>(null);
  const [depositEditing, setDepositEditing] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositRequired, setDepositRequired] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [expandedRec, setExpandedRec] = useState<number | null>(null);
  const [msgChannel, setMsgChannel] = useState<MessageChannel>("sms");
  const [msgPurpose, setMsgPurpose] = useState<MessagePurpose>("follow_up");
  const [followUpEditOpen, setFollowUpEditOpen] = useState(false);
  const [followUpEditText, setFollowUpEditText] = useState("");
  const [followUpSendingNow, setFollowUpSendingNow] = useState(false);
  const [followUpPreviewLoading, setFollowUpPreviewLoading] = useState(false);

  const { data: quote, isLoading } = useQuery<any>({
    queryKey: [`/api/quotes/${id}`],
  });

  const { data: recommendations } = useQuery<any[]>({
    queryKey: [`/api/quotes/${id}/recommendations`],
    enabled: !!quote,
  });

  const { data: calendarEvents } = useQuery<any[]>({
    queryKey: [`/api/calendar-events/quote/${id}`],
    enabled: !!quote,
  });

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/settings"],
  });

  const { data: automationRules, refetch: refetchAutomation } = useQuery<any>({
    queryKey: ["/api/automations"],
  });

  const { data: scheduledFollowUps, refetch: refetchFollowUps } = useQuery<any[]>({
    queryKey: [`/api/quotes/${id}/scheduled-followups`],
    enabled: !!quote && quote.status === "sent",
    refetchInterval: 30000,
  });

  const toggleFollowUpsMutation = useMutation({
    mutationFn: (enabled: boolean) => apiPut("/api/automations", { quoteFollowupsEnabled: enabled }),
    onSuccess: () => {
      refetchAutomation();
      if (!automationRules?.quoteFollowupsEnabled) {
        refetchFollowUps();
      }
    },
  });

  const updateTimingMutation = useMutation({
    mutationFn: (minutes: number) => apiPut("/api/automations", {
      followupSchedule: [{ delayMinutes: minutes, templateKey: `followup_${minutes}m` }],
    }),
    onSuccess: () => refetchAutomation(),
  });

  const cancelFollowUpMutation = useMutation({
    mutationFn: (commId: string) => apiDelete(`/api/communications/${commId}`),
    onSuccess: () => refetchFollowUps(),
  });

  const updateFollowUpMutation = useMutation({
    mutationFn: ({ commId, content }: { commId: string; content: string }) =>
      apiPut(`/api/communications/${commId}`, { content }),
    onSuccess: () => { refetchFollowUps(); setFollowUpEditOpen(false); },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => apiPut(`/api/quotes/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotes/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete(`/api/quotes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      navigate("/quotes");
    },
  });

  const depositMutation = useMutation({
    mutationFn: (data: { depositRequired: boolean; depositAmount: number; depositPaid?: boolean }) =>
      apiPut(`/api/quotes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotes/${id}`] });
      setDepositEditing(false);
    },
  });

  const recMutation = useMutation({
    mutationFn: ({ recId, status }: { recId: number; status: string }) =>
      apiPut(`/api/recommendations/${recId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/quotes/${id}/recommendations`] });
    },
  });

  if (isLoading) return <Spinner />;

  if (!quote) {
    return (
      <EmptyState
        icon={FileText}
        title="Quote not found"
        description="This quote may have been deleted"
        action={
          <Button variant="secondary" onClick={() => navigate("/quotes")}>
            Back to quotes
          </Button>
        }
      />
    );
  }

  const details = (quote.propertyDetails || {}) as any;
  const opts = (quote.options || {}) as any;
  const addOns = (quote.addOns || {}) as any;
  const baseUrl = window.location.origin;
  const quoteUrl = `${baseUrl}/q/${quote.publicToken}`;

  const copyLink = () => {
    navigator.clipboard.writeText(quoteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewQuote = () => window.open(quoteUrl, "_blank");

  const sendQuote = async () => {
    setSending(true);
    try {
      await apiPost(`/api/quotes/${id}/send`, {});
      queryClient.invalidateQueries({ queryKey: [`/api/quotes/${id}`] });
    } catch {}
    setSending(false);
  };

  const downloadPdf = () => {
    const pdfUrl =
      details?.quoteType === "commercial"
        ? `/api/quotes/${id}/commercial-pdf`
        : `/api/quotes/${id}/pdf`;
    window.open(pdfUrl, "_blank");
  };

  const generateDraft = async (purpose: MessagePurpose, channel: MessageChannel) => {
    const key = `${purpose}_${channel}`;
    setAiDraftLoading(key);
    try {
      const res = await apiPost(`/api/ai/generate-message`, {
        context: "quote",
        purpose,
        channel,
        quoteId: id,
        customerName: quote.customerName,
        total: quote.total,
        status: quote.status,
      });
      setAiDrafts((prev) => ({ ...prev, [key]: (res as any).message || "" }));
    } catch {
      setAiDrafts((prev) => ({ ...prev, [key]: "Unable to generate message." }));
    }
    setAiDraftLoading(null);
  };

  const generateInvoicePacket = async () => {
    setInvoiceLoading(true);
    try {
      await apiPost(`/api/quotes/${id}/invoice-packet`, {});
      queryClient.invalidateQueries({ queryKey: [`/api/quotes/${id}`] });
    } catch {}
    setInvoiceLoading(false);
  };

  const createCalendarEvent = async () => {
    setCalendarLoading(true);
    try {
      const res = await apiPost(`/api/quotes/${id}/calendar-event`, {
        title: `Cleaning - ${quote.customerName}`,
        description: `Quote #${id} - $${Number(quote.total || 0).toLocaleString()}`,
        location: details.customerAddress || "",
        startDate: new Date(Date.now() + 86400000).toISOString(),
        durationMinutes: 120,
      });
      const result = res as any;
      if (result.icsContent) {
        const blob = new Blob([result.icsContent], { type: "text/calendar" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cleaning-${quote.customerName?.replace(/\s+/g, "-")}.ics`;
        a.click();
        URL.revokeObjectURL(url);
      }
      if (result.googleCalendarUrl) {
        window.open(result.googleCalendarUrl, "_blank");
      }
      queryClient.invalidateQueries({ queryKey: [`/api/calendar-events/quote/${id}`] });
    } catch {}
    setCalendarLoading(false);
  };

  const sendReviewRequest = async () => {
    try {
      await apiPost(`/api/review-requests`, {
        quoteId: Number(id),
        customerName: quote.customerName,
        customerEmail: quote.customerEmail,
        customerPhone: quote.customerPhone,
      });
    } catch {}
  };

  const syncJobber = async () => {
    try {
      await apiPost(`/api/integrations/jobber/sync-quote/${id}`, {});
    } catch {}
  };

  const syncQbo = async () => {
    try {
      await apiPost(`/api/integrations/qbo/create-invoice`, { quoteId: id });
    } catch {}
  };

  const optionLabels: Record<string, string> = {
    good: "Good",
    better: "Better",
    best: "Best",
  };
  const optionEntries = Object.entries(opts).filter(
    ([_, v]: any) => v !== undefined && v !== null
  );

  const propertyRows = [
    { icon: Home, label: "Home Type", value: details.homeType },
    { icon: Maximize, label: "Square Feet", value: details.sqft ? `${details.sqft} sqft` : null },
    { icon: Bed, label: "Bedrooms", value: details.beds },
    { icon: Bath, label: "Full Baths", value: details.baths },
    { icon: Bath, label: "Half Baths", value: details.halfBaths },
    { icon: UsersIcon, label: "Residents", value: details.peopleCount },
    {
      icon: PawPrint,
      label: "Pets",
      value:
        details.petType && details.petType !== "none"
          ? `${details.petType}${details.petShedding ? " (heavy shedding)" : ""}`
          : null,
    },
    {
      icon: Sparkles,
      label: "Condition",
      value:
        details.condition || (details.conditionScore ? `Score: ${details.conditionScore}/10` : null),
    },
  ].filter((r) => r.value);

  const daysSinceSent = quote.sentAt
    ? Math.floor((Date.now() - new Date(quote.sentAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const statusOrder = ["draft", "sent", "viewed", "accepted"];
  const currentStatusIndex = statusOrder.indexOf(quote.status);

  const timelineItems = [
    {
      icon: FileText,
      title: "Created",
      time: new Date(quote.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      active: true,
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
    },
    {
      icon: Send,
      title: "Sent",
      time: quote.sentAt
        ? new Date(quote.sentAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : undefined,
      active: currentStatusIndex >= 1,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      icon: Eye,
      title: "Viewed",
      time: quote.viewedAt
        ? new Date(quote.viewedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : undefined,
      active: currentStatusIndex >= 2,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    {
      icon: CheckCircle,
      title: quote.status === "declined" ? "Declined" : "Accepted",
      time: quote.acceptedAt
        ? new Date(quote.acceptedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : undefined,
      active: currentStatusIndex >= 3 || quote.status === "declined",
      iconBg: quote.status === "declined" ? "bg-red-100" : "bg-emerald-100",
      iconColor: quote.status === "declined" ? "text-red-600" : "text-emerald-600",
    },
  ];

  const messagePurposes: Array<{ value: MessagePurpose; label: string; icon: typeof Send }> = [
    { value: "send_quote", label: "Send Quote", icon: Send },
    { value: "follow_up", label: "Follow Up", icon: MessageSquare },
    { value: "thank_you", label: "Thank You", icon: Star },
    { value: "reminder", label: "Reminder", icon: Clock },
    { value: "upsell", label: "Upsell", icon: TrendingUp },
    { value: "review_request", label: "Review Ask", icon: Star },
    { value: "payment_failed", label: "Payment Issue", icon: CreditCard },
  ];

  const venmoHandle = settings?.venmoHandle;
  const cashAppTag = settings?.cashAppTag;
  const googleReviewUrl = settings?.googleReviewUrl;
  const referralAmount = settings?.referralOfferAmount;

  const currentDraftKey = `${msgPurpose}_${msgChannel}`;

  return (
    <div>
      <PageHeader
        title={quote.customerName || "Quote"}
        backTo="/quotes"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="secondary" icon={ExternalLink} onClick={previewQuote} size="sm">
              Preview
            </Button>
            <Button
              variant="secondary"
              icon={Copy}
              onClick={copyLink}
              size="sm"
            >
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button
              icon={Send}
              onClick={sendQuote}
              loading={sending}
              size="sm"
            >
              Send Quote
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Badge status={quote.status} dot />
        <span className="text-sm text-slate-500">
          Created {new Date(quote.createdAt).toLocaleDateString()}
        </span>
        {quote.sentAt ? (
          <span className="text-sm text-slate-500">
            Sent {new Date(quote.sentAt).toLocaleDateString()}
          </span>
        ) : null}
        {daysSinceSent !== null && daysSinceSent > 2 && quote.status === "sent" ? (
          <Badge status="warning" label={`${daysSinceSent}d no response`} />
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {propertyRows.length > 0 ? (
            <Card>
              <CardHeader title="Property Details" icon={Home} />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {propertyRows.map((row, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                      <row.icon className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">{row.label}</p>
                      <p className="text-sm font-medium text-slate-900 capitalize">
                        {row.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {details.customerAddress ? (
                <p className="text-sm text-slate-500 mt-4 pt-4 border-t border-slate-100">
                  {details.customerAddress}
                </p>
              ) : null}
              {quote.frequencySelected && quote.frequencySelected !== "one-time" ? (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <Badge status="info" label={`${quote.frequencySelected} service`} />
                </div>
              ) : null}
            </Card>
          ) : null}

          {optionEntries.length > 0 ? (
            <Card>
              <CardHeader title="Pricing Options" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {optionEntries.map(([key, val]: any) => {
                  const price = typeof val === "object" ? val.price : val;
                  const name =
                    typeof val === "object" && val.name
                      ? val.name
                      : optionLabels[key] || key;
                  const scope =
                    typeof val === "object" && val.scope ? val.scope : "";
                  const isSelected = quote.selectedOption === key;
                  const isRecommended = quote.recommendedOption === key;
                  return (
                    <div
                      key={key}
                      className={`rounded-xl border-2 p-4 transition-all ${
                        isSelected
                          ? "border-primary-500 bg-primary-50/50 shadow-sm shadow-primary-600/5"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 text-sm">
                          {name}
                        </h3>
                        {isRecommended ? (
                          <span className="text-[10px] font-semibold uppercase bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">
                            Recommended
                          </span>
                        ) : null}
                      </div>
                      {scope ? (
                        <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                          {scope}
                        </p>
                      ) : null}
                      <p className="text-2xl font-bold text-slate-900 tracking-tight">
                        ${Number(price).toLocaleString()}
                      </p>
                      {isSelected ? (
                        <div className="flex items-center gap-1 mt-2">
                          <CheckCircle className="w-3.5 h-3.5 text-primary-600" />
                          <span className="text-xs text-primary-600 font-medium">
                            Selected
                          </span>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}

          {Object.keys(addOns).length > 0 ? (
            <Card>
              <CardHeader title="Add-Ons" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(addOns).map(([key, val]: any) => {
                  const isSelected =
                    typeof val === "object" ? val.selected : val;
                  const price = typeof val === "object" ? val.price : 0;
                  const label = key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (s: string) => s.toUpperCase());
                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between py-2.5 px-3 rounded-lg ${
                        isSelected ? "bg-emerald-50/50" : "bg-slate-50/50"
                      }`}
                    >
                      <span
                        className={`text-sm ${
                          isSelected ? "text-slate-900 font-medium" : "text-slate-400"
                        }`}
                      >
                        {label}
                      </span>
                      <div className="flex items-center gap-2">
                        {price > 0 ? (
                          <span className="text-xs text-slate-500">
                            +${Number(price).toFixed(0)}
                          </span>
                        ) : null}
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            isSelected
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-slate-100 text-slate-300"
                          }`}
                        >
                          {isSelected ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : null}

          {recommendations && recommendations.length > 0 ? (
            <Card>
              <CardHeader title="AI Revenue Playbook" icon={Lightbulb} badge={<Badge status="pro" label={`${recommendations.length} plays`} size="sm" />} />
              <div className="space-y-3">
                {recommendations.map((rec: any, i: number) => (
                  <div key={rec.id || i} className={`rounded-xl border transition-all ${rec.status === "done" ? "border-emerald-200 bg-emerald-50/30" : rec.status === "dismissed" ? "border-slate-100 bg-slate-50/50 opacity-60" : "border-slate-200 hover:border-primary-200"}`}>
                    <button
                      onClick={() => setExpandedRec(expandedRec === i ? null : i)}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${rec.status === "done" ? "bg-emerald-100 text-emerald-600" : "bg-primary-50 text-primary-600"}`}>
                          <Zap className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 truncate">{rec.title}</p>
                          <p className="text-xs text-slate-500">{rec.type?.replace(/_/g, " ")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {rec.status ? <Badge status={rec.status} size="sm" /> : null}
                        {expandedRec === i ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </button>
                    {expandedRec === i ? (
                      <div className="px-4 pb-4 space-y-3">
                        <p className="text-sm text-slate-600">{rec.rationale || rec.description}</p>
                        {rec.suggestedDate ? (
                          <p className="text-xs text-slate-400">
                            Suggested: {new Date(rec.suggestedDate).toLocaleDateString()}
                          </p>
                        ) : null}
                        {rec.status !== "done" && rec.status !== "dismissed" ? (
                          <div className="flex gap-2">
                            <Button
                              size="xs"
                              variant="success"
                              icon={CheckCircle}
                              onClick={() => recMutation.mutate({ recId: rec.id, status: "done" })}
                            >
                              Done
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              icon={XCircle}
                              onClick={() => recMutation.mutate({ recId: rec.id, status: "dismissed" })}
                            >
                              Dismiss
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="AI Communications" icon={Sparkles} />
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="inline-flex items-center bg-slate-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setMsgChannel("sms")}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                      msgChannel === "sms" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    <Phone className="w-3 h-3" />
                    SMS
                  </button>
                  <button
                    onClick={() => setMsgChannel("email")}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                      msgChannel === "email" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    <Mail className="w-3 h-3" />
                    Email
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {messagePurposes.map((mp) => (
                  <button
                    key={mp.value}
                    onClick={() => setMsgPurpose(mp.value)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      msgPurpose === mp.value
                        ? "bg-primary-50 text-primary-700 ring-1 ring-primary-200"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <mp.icon className="w-3 h-3" />
                    {mp.label}
                  </button>
                ))}
              </div>

              <Button
                variant="secondary"
                icon={Sparkles}
                onClick={() => generateDraft(msgPurpose, msgChannel)}
                loading={aiDraftLoading === currentDraftKey}
                size="sm"
              >
                Generate {messagePurposes.find((m) => m.value === msgPurpose)?.label} ({msgChannel.toUpperCase()})
              </Button>

              {aiDrafts[currentDraftKey] ? (
                <div className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-xl p-4 border border-violet-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                    <p className="text-xs font-semibold text-violet-700">
                      AI {msgChannel === "email" ? "Email" : "SMS"} Draft
                    </p>
                  </div>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {aiDrafts[currentDraftKey]}
                  </p>
                  <button
                    onClick={() => navigator.clipboard.writeText(aiDrafts[currentDraftKey])}
                    className="text-xs text-violet-600 font-medium mt-3 hover:text-violet-800 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy to clipboard
                  </button>
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Activity Timeline" icon={Clock} />
            <Timeline items={timelineItems} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Summary" />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-end">
                <span className="text-slate-500">Total</span>
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  ${Number(quote.total || 0).toLocaleString()}
                </span>
              </div>
              {quote.expiresAt ? (
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  Expires {new Date(quote.expiresAt).toLocaleDateString()}
                </div>
              ) : null}
            </div>
          </Card>

          {quote.status === "sent" ? (
            <Card>
              <CardHeader title="Follow-Up Automation" icon={Zap} />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">Auto Follow-Up</p>
                    <p className="text-xs text-slate-500 mt-0.5">Send a reminder if not accepted</p>
                  </div>
                  <Toggle
                    checked={automationRules?.quoteFollowupsEnabled !== false}
                    onChange={async (val) => {
                      toggleFollowUpsMutation.mutate(val);
                      if (!val) {
                        for (const fu of scheduledFollowUps || []) {
                          cancelFollowUpMutation.mutate(fu.id);
                        }
                      }
                    }}
                    label=""
                  />
                </div>

                {automationRules?.quoteFollowupsEnabled !== false ? (
                  <>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-2">Timing</p>
                      <div className="flex gap-2">
                        {[{ label: "12h", minutes: 720 }, { label: "24h", minutes: 1440 }, { label: "48h", minutes: 2880 }].map((opt) => {
                          const current = (automationRules?.followupSchedule as any[])?.[0]?.delayMinutes ?? 1440;
                          const isActive = current === opt.minutes;
                          return (
                            <button
                              key={opt.label}
                              onClick={() => updateTimingMutation.mutate(opt.minutes)}
                              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${isActive ? "bg-primary-600 text-white border-primary-600" : "bg-white text-slate-600 border-slate-200 hover:border-primary-300"}`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {scheduledFollowUps && scheduledFollowUps.length > 0 ? (
                      scheduledFollowUps.map((fu: any) => {
                        const fuDate = new Date(fu.scheduledFor);
                        const diffMs = fuDate.getTime() - Date.now();
                        const diffHrs = diffMs / (1000 * 60 * 60);
                        const timeLabel = diffHrs < 1 ? "Less than an hour" : diffHrs < 24 ? `In ${Math.round(diffHrs)} hours` : fuDate.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                        return (
                          <div key={fu.id} className="border border-primary-100 bg-primary-50/40 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-primary-700">
                                <Clock className="w-3.5 h-3.5" />
                                <span className="text-xs font-semibold">{timeLabel}</span>
                              </div>
                              <span className="text-xs text-slate-400 capitalize">via {fu.channel}</span>
                            </div>
                            {fu.content ? (
                              <p className="text-xs text-slate-600 italic line-clamp-2">{fu.content}</p>
                            ) : (
                              <p className="text-xs text-slate-400 italic">AI will generate message at send time</p>
                            )}
                            <div className="flex gap-2 pt-1">
                              <Button
                                size="xs"
                                loading={followUpSendingNow}
                                onClick={async () => {
                                  setFollowUpSendingNow(true);
                                  try {
                                    const res = await apiPost(`/api/communications/${fu.id}/send-now`, {});
                                    refetchFollowUps();
                                  } catch (e: any) {
                                    alert(e?.message || "Failed to send");
                                  } finally {
                                    setFollowUpSendingNow(false);
                                  }
                                }}
                              >
                                Send Now
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => { setFollowUpEditText(fu.content || ""); setFollowUpEditOpen(true); }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => cancelFollowUpMutation.mutate(fu.id)}
                                loading={cancelFollowUpMutation.isPending}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-400 italic">No follow-up scheduled. Re-send the quote to schedule one.</p>
                    )}
                  </>
                ) : null}

                {followUpEditOpen ? (
                  <div className="border border-slate-200 rounded-xl p-3 space-y-3 bg-slate-50">
                    <p className="text-xs font-semibold text-slate-700">Edit Follow-Up Message</p>
                    <textarea
                      value={followUpEditText}
                      onChange={(e) => setFollowUpEditText(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
                      rows={5}
                      placeholder="Leave empty for AI to generate at send time..."
                    />
                    <div className="flex gap-2">
                      <Button
                        size="xs"
                        variant="ghost"
                        loading={followUpPreviewLoading}
                        onClick={async () => {
                          setFollowUpPreviewLoading(true);
                          try {
                            const fu = (scheduledFollowUps || [])[0];
                            const data = await apiPost(`/api/quotes/${id}/followup-preview`, { channel: fu?.channel || "sms" }) as any;
                            if (data?.draft) setFollowUpEditText(data.draft);
                          } catch {}
                          setFollowUpPreviewLoading(false);
                        }}
                      >
                        AI Generate
                      </Button>
                      <Button
                        size="xs"
                        onClick={() => {
                          const fu = (scheduledFollowUps || [])[0];
                          if (fu) updateFollowUpMutation.mutate({ commId: fu.id, content: followUpEditText });
                        }}
                        loading={updateFollowUpMutation.isPending}
                      >
                        Save
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => setFollowUpEditOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Deposit"
              icon={DollarSign}
              actions={
                !depositEditing ? (
                  <button
                    onClick={() => {
                      setDepositRequired(!!quote.depositRequired);
                      setDepositAmount(String(quote.depositAmount || ""));
                      setDepositEditing(true);
                    }}
                    className="text-xs text-primary-600 font-medium hover:text-primary-700"
                  >
                    Edit
                  </button>
                ) : null
              }
            />
            {depositEditing ? (
              <div className="space-y-3">
                <Toggle
                  checked={depositRequired}
                  onChange={setDepositRequired}
                  label="Require deposit"
                  description="Customer pays upfront before service"
                />
                {depositRequired ? (
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Amount ($)</label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      placeholder="50"
                    />
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <Button
                    size="xs"
                    onClick={() =>
                      depositMutation.mutate({
                        depositRequired,
                        depositAmount: Number(depositAmount) || 0,
                      })
                    }
                    loading={depositMutation.isPending}
                  >
                    Save
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => setDepositEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {quote.depositRequired ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Deposit</span>
                      <span className="text-sm font-semibold text-slate-900">
                        ${Number(quote.depositAmount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500">Status</span>
                      <Badge
                        status={quote.depositPaid ? "accepted" : "pending"}
                        label={quote.depositPaid ? "Paid" : "Pending"}
                        size="sm"
                      />
                    </div>
                    {!quote.depositPaid ? (
                      <Button
                        size="xs"
                        variant="success"
                        icon={CheckCircle}
                        className="w-full mt-2"
                        onClick={() =>
                          depositMutation.mutate({
                            depositRequired: true,
                            depositAmount: Number(quote.depositAmount || 0),
                            depositPaid: true,
                          })
                        }
                        loading={depositMutation.isPending}
                      >
                        Mark as Paid
                      </Button>
                    ) : null}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <span className="text-sm text-slate-500">Balance Due</span>
                      <span className="text-sm font-semibold text-slate-900">
                        ${Math.max(0, Number(quote.total || 0) - Number(quote.depositAmount || 0)).toLocaleString()}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">No deposit required</p>
                )}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Payment Links" icon={CreditCard} />
            <div className="space-y-2">
              <Button
                variant="secondary"
                icon={CreditCard}
                onClick={() => window.open(quoteUrl, "_blank")}
                className="w-full justify-start"
                size="sm"
              >
                Stripe Checkout
              </Button>
              {venmoHandle ? (
                <Button
                  variant="secondary"
                  icon={DollarSign}
                  onClick={() => window.open(`https://venmo.com/${venmoHandle}?txn=pay&amount=${quote.depositRequired ? quote.depositAmount : quote.total}`, "_blank")}
                  className="w-full justify-start"
                  size="sm"
                >
                  Venmo ({venmoHandle})
                </Button>
              ) : null}
              {cashAppTag ? (
                <Button
                  variant="secondary"
                  icon={DollarSign}
                  onClick={() => window.open(`https://cash.app/${cashAppTag}/${quote.depositRequired ? quote.depositAmount : quote.total}`, "_blank")}
                  className="w-full justify-start"
                  size="sm"
                >
                  Cash App ({cashAppTag})
                </Button>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Actions" />
            <div className="space-y-2">
              {quote.status !== "accepted" ? (
                <Button
                  variant="success"
                  icon={CheckCircle}
                  onClick={() => statusMutation.mutate("accepted")}
                  className="w-full justify-start"
                  size="sm"
                >
                  Mark Accepted
                </Button>
              ) : null}
              {quote.status !== "declined" ? (
                <Button
                  variant="ghost"
                  icon={XCircle}
                  onClick={() => statusMutation.mutate("declined")}
                  className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
                  size="sm"
                >
                  Mark Declined
                </Button>
              ) : null}
              {quote.status === "draft" ? (
                <Button
                  variant="ghost"
                  icon={Send}
                  onClick={() => statusMutation.mutate("sent")}
                  className="w-full justify-start"
                  size="sm"
                >
                  Mark as Sent
                </Button>
              ) : null}
              <Button
                variant="secondary"
                icon={Download}
                onClick={downloadPdf}
                className="w-full justify-start"
                size="sm"
              >
                Download PDF
              </Button>
              <Button
                variant="secondary"
                icon={Receipt}
                onClick={generateInvoicePacket}
                loading={invoiceLoading}
                className="w-full justify-start"
                size="sm"
              >
                Generate Invoice Packet
              </Button>
              <Button
                variant="ghost"
                icon={Trash2}
                onClick={() => setDeleteOpen(true)}
                className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
                size="sm"
              >
                Delete Quote
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Calendar" icon={Calendar} />
            <div className="space-y-2">
              <Button
                variant="secondary"
                icon={Calendar}
                onClick={createCalendarEvent}
                loading={calendarLoading}
                className="w-full justify-start"
                size="sm"
              >
                Add to Calendar
              </Button>
              {calendarEvents && calendarEvents.length > 0 ? (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-2">Scheduled events</p>
                  {calendarEvents.map((ev: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 py-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-600 truncate">{ev.title}</span>
                      {ev.startDate ? (
                        <span className="text-xs text-slate-400 shrink-0">
                          {new Date(ev.startDate).toLocaleDateString()}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Reviews & Referrals" icon={Star} />
            <div className="space-y-2">
              {quote.status === "accepted" ? (
                <>
                  <Button
                    variant="secondary"
                    icon={Star}
                    onClick={sendReviewRequest}
                    className="w-full justify-start"
                    size="sm"
                  >
                    Request Review
                  </Button>
                  {googleReviewUrl ? (
                    <Button
                      variant="ghost"
                      icon={ExternalLink}
                      onClick={() => window.open(googleReviewUrl, "_blank")}
                      className="w-full justify-start"
                      size="sm"
                    >
                      Google Review Link
                    </Button>
                  ) : null}
                  <Button
                    variant="secondary"
                    icon={Gift}
                    onClick={() => {
                      const msg = `Thanks for choosing us! Refer a friend and ${referralAmount ? `get $${referralAmount} off` : "earn a discount on"} your next clean.`;
                      navigator.clipboard.writeText(msg);
                    }}
                    className="w-full justify-start"
                    size="sm"
                  >
                    Copy Referral Offer
                  </Button>
                </>
              ) : (
                <p className="text-xs text-slate-400">Available after quote is accepted</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Integrations" icon={Link2} />
            <div className="space-y-2">
              <Button
                variant="secondary"
                icon={RefreshCw}
                onClick={syncJobber}
                className="w-full justify-start"
                size="sm"
              >
                Sync to Jobber
              </Button>
              <Button
                variant="secondary"
                icon={RefreshCw}
                onClick={syncQbo}
                className="w-full justify-start"
                size="sm"
              >
                Create QBO Invoice
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Quick Share" icon={ExternalLink} />
            <div className="space-y-2">
              <Button
                variant="secondary"
                icon={ExternalLink}
                onClick={previewQuote}
                className="w-full justify-start"
                size="sm"
              >
                Preview Page
              </Button>
              <Button
                variant="secondary"
                icon={Copy}
                onClick={copyLink}
                className="w-full justify-start"
                size="sm"
              >
                {copied ? "Link Copied!" : "Copy Link"}
              </Button>
            </div>
            <p className="text-[11px] text-slate-400 mt-3 break-all leading-relaxed">
              {quoteUrl}
            </p>
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Quote"
        description="Are you sure you want to delete this quote? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
