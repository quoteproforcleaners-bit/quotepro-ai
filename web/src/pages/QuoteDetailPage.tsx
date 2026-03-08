import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { apiPut, apiDelete, apiPost } from "../lib/api";
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
  AlertCircle,
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
  Alert,
} from "../components/ui";

export default function QuoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [aiFollowUp, setAiFollowUp] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiMsgLoading, setAiMsgLoading] = useState(false);

  const { data: quote, isLoading } = useQuery<any>({
    queryKey: [`/api/quotes/${id}`],
  });

  const { data: recommendations } = useQuery<any>({
    queryKey: [`/api/quotes/${id}/recommendations`],
    enabled: !!quote,
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

  const generateFollowUp = async () => {
    setAiLoading(true);
    try {
      const res = await apiPost(`/api/ai/generate-followup`, {
        quoteId: id,
        customerName: quote.customerName,
        total: quote.total,
        status: quote.status,
      });
      setAiFollowUp((res as any).message || (res as any).followUp || "");
    } catch {
      setAiFollowUp("Unable to generate follow-up at this time.");
    }
    setAiLoading(false);
  };

  const generateMessage = async () => {
    setAiMsgLoading(true);
    try {
      const res = await apiPost(`/api/ai/generate-message`, {
        context: "quote",
        quoteId: id,
        customerName: quote.customerName,
        total: quote.total,
      });
      setAiMessage((res as any).message || "");
    } catch {
      setAiMessage("Unable to generate message.");
    }
    setAiMsgLoading(false);
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

      <div className="flex items-center gap-3 mb-6">
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

          <Card>
            <CardHeader title="AI Communications" icon={Sparkles} />
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  icon={MessageSquare}
                  onClick={generateFollowUp}
                  loading={aiLoading}
                  size="sm"
                >
                  Generate Follow-up
                </Button>
                <Button
                  variant="secondary"
                  icon={Sparkles}
                  onClick={generateMessage}
                  loading={aiMsgLoading}
                  size="sm"
                >
                  Draft Message
                </Button>
              </div>
              {aiFollowUp ? (
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-blue-700 mb-1">
                    AI Follow-up
                  </p>
                  <p className="text-sm text-blue-900 whitespace-pre-wrap">
                    {aiFollowUp}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(aiFollowUp);
                    }}
                    className="text-xs text-blue-600 font-medium mt-2 hover:text-blue-800"
                  >
                    Copy to clipboard
                  </button>
                </div>
              ) : null}
              {aiMessage ? (
                <div className="bg-violet-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-violet-700 mb-1">
                    AI Draft
                  </p>
                  <p className="text-sm text-violet-900 whitespace-pre-wrap">
                    {aiMessage}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(aiMessage);
                    }}
                    className="text-xs text-violet-600 font-medium mt-2 hover:text-violet-800"
                  >
                    Copy to clipboard
                  </button>
                </div>
              ) : null}
            </div>
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
              {quote.depositRequired ? (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Deposit</span>
                    <span className="font-medium text-slate-900">
                      ${Number(quote.depositAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <Badge
                    status={quote.depositPaid ? "accepted" : "sent"}
                    label={quote.depositPaid ? "Paid" : "Pending"}
                  />
                </div>
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
