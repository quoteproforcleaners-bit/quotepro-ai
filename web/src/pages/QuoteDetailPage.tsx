import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { apiPut, apiDelete, apiPost } from "../lib/api";
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Send,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { useState } from "react";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    sent: "bg-blue-50 text-blue-700",
    accepted: "bg-green-50 text-green-700",
    declined: "bg-red-50 text-red-700",
    "changes-requested": "bg-amber-50 text-amber-700",
    expired: "bg-slate-100 text-slate-500",
  };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${
        styles[status] || styles.draft
      }`}
    >
      {status.replace(/-/g, " ")}
    </span>
  );
}

export default function QuoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: quote, isLoading } = useQuery<any>({
    queryKey: [`/api/quotes/${id}`],
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => apiPut(`/api/quotes/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/quotes/${id}`] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete(`/api/quotes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      navigate("/quotes");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Quote not found</p>
        <button onClick={() => navigate("/quotes")} className="mt-3 text-primary-600 font-medium text-sm">
          Back to quotes
        </button>
      </div>
    );
  }

  const details = (quote.propertyDetails || {}) as any;
  const opts = (quote.options || {}) as any;
  const addOns = (quote.addOns || {}) as any;
  const quoteUrl = `${window.location.origin}/q/${quote.publicToken}`;

  const copyLink = () => {
    navigator.clipboard.writeText(quoteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewQuote = () => {
    window.open(quoteUrl, "_blank");
  };

  const sendQuote = async () => {
    setSending(true);
    try {
      await apiPost(`/api/quotes/${id}/send`, {});
      queryClient.invalidateQueries({ queryKey: [`/api/quotes/${id}`] });
    } catch { }
    setSending(false);
  };

  const downloadPdf = () => {
    const pdfUrl = details?.quoteType === "commercial"
      ? `/api/quotes/${id}/commercial-pdf`
      : `/api/quotes/${id}/pdf`;
    window.open(pdfUrl, "_blank");
  };

  const propertyItems = [];
  if (details.beds) propertyItems.push(`${details.beds} beds`);
  if (details.baths) propertyItems.push(`${details.baths} baths`);
  if (details.sqft) propertyItems.push(`${details.sqft} sqft`);
  if (details.address || details.customerAddress) propertyItems.push(details.address || details.customerAddress);

  const optionLabels: Record<string, string> = { good: "Good", better: "Better", best: "Best" };
  const optionEntries = Object.entries(opts).filter(([_, v]: any) => v !== undefined);

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/quotes")}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to quotes
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {quote.customerName || "Quote"}
            </h1>
            <StatusBadge status={quote.status} />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Created {new Date(quote.createdAt).toLocaleDateString()} &middot; #{quote.id.slice(0, 8)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={previewQuote}
            className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Preview
          </button>
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <button
            onClick={sendQuote}
            disabled={sending}
            className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {propertyItems.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 mb-3">Property Details</h2>
              <div className="flex flex-wrap gap-2">
                {propertyItems.map((item, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 text-sm text-slate-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
              {quote.frequencySelected && (
                <p className="mt-3 text-sm text-slate-500">
                  Frequency: <span className="font-medium text-slate-700 capitalize">{quote.frequencySelected}</span>
                </p>
              )}
            </div>
          )}

          {optionEntries.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 mb-4">Pricing Options</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {optionEntries.map(([key, val]: any) => {
                  const price = typeof val === "object" ? val.price : val;
                  const name = typeof val === "object" && val.name ? val.name : optionLabels[key] || key;
                  const scope = typeof val === "object" && val.scope ? val.scope : "";
                  const isSelected = quote.selectedOption === key;
                  const isRecommended = quote.recommendedOption === key;
                  return (
                    <div
                      key={key}
                      className={`rounded-xl border-2 p-4 ${
                        isSelected
                          ? "border-primary-500 bg-primary-50"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{name}</h3>
                        {isRecommended && (
                          <span className="text-[10px] font-semibold uppercase bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      {scope && (
                        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{scope}</p>
                      )}
                      <p className="text-xl font-bold text-slate-900">
                        ${Number(price).toFixed(2)}
                      </p>
                      {isSelected && (
                        <span className="text-xs text-primary-600 font-medium mt-1 inline-block">
                          Selected
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {Object.keys(addOns).length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 mb-3">Add-Ons</h2>
              <div className="divide-y divide-slate-100">
                {Object.entries(addOns).map(([key, val]: any) => {
                  const isSelected = typeof val === "object" ? val.selected : val;
                  const price = typeof val === "object" ? val.price : 0;
                  const label = key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (s: string) => s.toUpperCase());
                  return (
                    <div key={key} className="flex items-center justify-between py-2.5">
                      <span className={`text-sm ${isSelected ? "text-slate-900" : "text-slate-400"}`}>
                        {label}
                      </span>
                      <div className="flex items-center gap-2">
                        {price > 0 && (
                          <span className="text-sm text-slate-500">${Number(price).toFixed(2)}</span>
                        )}
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isSelected ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                        }`}>
                          {isSelected ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Total</span>
                <span className="font-bold text-lg text-slate-900">
                  ${Number(quote.total || 0).toFixed(2)}
                </span>
              </div>
              {quote.expiresAt && (
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  Expires {new Date(quote.expiresAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Actions</h2>
            <div className="space-y-2">
              {quote.status !== "accepted" && (
                <button
                  onClick={() => statusMutation.mutate("accepted")}
                  className="w-full flex items-center gap-2 h-9 px-3 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Accepted
                </button>
              )}
              {quote.status !== "declined" && (
                <button
                  onClick={() => statusMutation.mutate("declined")}
                  className="w-full flex items-center gap-2 h-9 px-3 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Mark Declined
                </button>
              )}
              <button
                onClick={downloadPdf}
                className="w-full flex items-center gap-2 h-9 px-3 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete this quote? This cannot be undone.")) {
                    deleteMutation.mutate();
                  }
                }}
                className="w-full flex items-center gap-2 h-9 px-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Quote
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Instant Quote Page</h2>
            <div className="space-y-2">
              <button
                onClick={previewQuote}
                className="w-full flex items-center gap-2 h-9 px-3 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Preview Page
              </button>
              <button
                onClick={copyLink}
                className="w-full flex items-center gap-2 h-9 px-3 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copied ? "Link Copied!" : "Copy Link"}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-3 break-all">{quoteUrl}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
