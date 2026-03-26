import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Sparkles,
  Send,
  Copy,
  RefreshCw,
  Paperclip,
  CheckCircle,
  Mail,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { apiPost } from "../lib/api";
import { Button } from "./ui";
import FileAttachmentPicker from "./FileAttachmentPicker";

type Tone = "professional" | "friendly" | "warm" | "concise";

const TONES: { value: Tone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "warm", label: "Warm" },
  { value: "concise", label: "Concise" },
];

interface Props {
  quoteId: string;
  quote: any;
  business: any;
  onClose: () => void;
  onSent: () => void;
}

export default function SendQuoteModal({ quoteId, quote, business, onClose, onSent }: Props) {
  const customer = quote?.customer;
  const details = (quote?.propertyDetails || {}) as any;
  const opts = (quote?.options || {}) as any;
  const selectedKey = quote?.selectedOption || quote?.recommendedOption || "better";
  const selectedOpt = opts[selectedKey] || {};
  const expiresAt = quote?.expiresAt
    ? new Date(quote.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const defaultEmail = quote?.customerEmail || customer?.email || (quote?.propertyDetails as any)?.customerEmail || "";

  const [to, setTo] = useState(defaultEmail);
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(
    `Your Cleaning Quote from ${business?.companyName || "Us"}`
  );
  const [body, setBody] = useState("");
  const [tone, setTone] = useState<Tone>(() => {
    try { return (localStorage.getItem("qp_email_tone") as Tone) || "professional"; } catch { return "professional"; }
  });
  const [extraContext, setExtraContext] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [attachmentFileIds, setAttachmentFileIds] = useState<string[]>([]);

  const modalRef = useRef<HTMLDivElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    toInputRef.current?.focus();
  }, []);

  useEffect(() => {
    try { localStorage.setItem("qp_email_tone", tone); } catch {}
  }, [tone]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const generateAiEmail = async () => {
    setAiLoading(true);
    setError(null);
    try {
      const res: any = await apiPost(`/api/quotes/${quoteId}/generate-email`, {
        tone,
        extraInstructions: extraContext || undefined,
      });
      if (res.subject) setSubject(res.subject);
      if (res.body) setBody(res.body);
    } catch (e: any) {
      setError(e?.message || "Could not generate email. You can still write your own.");
    }
    setAiLoading(false);
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSend = async () => {
    if (!validateEmail(to)) {
      setError("Please enter a valid recipient email address.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await apiPost(`/api/quotes/${quoteId}/send-with-pdf`, {
        to: to.trim(),
        cc: cc.trim() || undefined,
        subject,
        customBody: body || undefined,
        attachmentFileIds: attachmentFileIds.length > 0 ? attachmentFileIds : undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        onSent();
        onClose();
      }, 1800);
    } catch (e: any) {
      setError(e?.message || "Failed to send email. Please try again.");
    }
    setSending(false);
  };

  const handleSendToSelf = async () => {
    if (!business?.email) {
      setError("Add your business email in Settings to send a test.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await apiPost(`/api/quotes/${quoteId}/send-with-pdf`, {
        to: business.email,
        subject: `[TEST] ${subject}`,
        customBody: body || undefined,
        attachmentFileIds: attachmentFileIds.length > 0 ? attachmentFileIds : undefined,
      });
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to send test email.");
    }
    setSending(false);
  };

  const copyBody = () => {
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col"
        style={{ background: "#1a1f2e", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-600/20 flex items-center justify-center">
              <Mail className="w-4 h-4 text-primary-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Send Quote</h2>
              <p className="text-xs text-slate-400">Deliver a polished email with your quote attached</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {success ? (
          /* Success state */
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Quote sent!</h3>
            <p className="text-slate-400 text-sm">Your quote email has been delivered to {to}</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            {error ? (
              <div className="rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3 text-sm text-red-300">
                <p>{error}</p>
              </div>
            ) : null}

            {/* Recipient */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">To *</label>
                <input
                  ref={toInputRef}
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="customer@email.com"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">CC (optional)</label>
                <input
                  type="email"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@email.com"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                />
              </div>
            </div>

            {/* AI Section */}
            <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)" }}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                <span className="text-xs font-semibold text-primary-300 uppercase tracking-wide">AI Email Generator</span>
              </div>

              {/* Tone */}
              <div>
                <p className="text-xs text-slate-400 mb-2">Tone</p>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTone(t.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        tone === t.value
                          ? "bg-primary-600 text-white"
                          : "text-slate-400 hover:text-white hover:bg-white/10"
                      }`}
                      style={tone !== t.value ? { border: "1px solid rgba(255,255,255,0.12)" } : {}}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Context toggle */}
              <button
                onClick={() => setShowContext(!showContext)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors"
              >
                {showContext ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Add context for AI
              </button>
              {showContext ? (
                <textarea
                  value={extraContext}
                  onChange={(e) => setExtraContext(e.target.value)}
                  placeholder='e.g. "Mention biweekly service and encourage them to book this week."'
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                />
              ) : null}

              <button
                onClick={generateAiEmail}
                disabled={aiLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #6366f1, #2563EB)" }}
              >
                {aiLoading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {body ? "Regenerate Email" : "Generate AI Email"}
              </button>
            </div>

            {/* Email Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-400">Email body</label>
                {body ? (
                  <button
                    onClick={copyBody}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                ) : null}
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={`Hi ${details.customerName || "there"},\n\nThanks for the opportunity to provide your cleaning quote...`}
                rows={8}
                className="w-full px-3.5 py-3 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none transition-all leading-relaxed"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <p className="text-xs text-slate-600 mt-1">The quote option cards will be appended automatically below your message.</p>
            </div>

            {/* PDF attachment + file library attachments */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              {/* Quote PDF row */}
              <div className="flex items-center gap-3 px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0">
                  <Paperclip className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Quote PDF attached automatically</p>
                  <p className="text-xs text-slate-500">quote-{quote?.customerName?.toLowerCase().replace(/\s+/g, "-") || quoteId.slice(0, 8)}.pdf</p>
                </div>
              </div>
              {/* Extra file library attachments */}
              <div className="px-4 py-3" style={{ background: "rgba(255,255,255,0.02)" }}>
                <FileAttachmentPicker
                  selectedFileIds={attachmentFileIds}
                  onChange={setAttachmentFileIds}
                  dark
                />
              </div>
            </div>

            {/* Quote preview */}
            <div>
              <button
                onClick={() => setPreviewOpen(!previewOpen)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors w-full"
              >
                {previewOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Quote summary
              </button>
              {previewOpen ? (
                <div className="mt-2 rounded-xl px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {details.customerName ? <><span className="text-slate-500">Customer</span><span className="text-white font-medium">{details.customerName}</span></> : null}
                  {details.beds ? <><span className="text-slate-500">Property</span><span className="text-white">{details.beds}bd / {details.baths}ba{details.sqft ? `, ${details.sqft} sqft` : ""}</span></> : null}
                  {selectedOpt.name ? <><span className="text-slate-500">Package</span><span className="text-white capitalize">{selectedOpt.name}</span></> : null}
                  {quote?.frequencySelected ? <><span className="text-slate-500">Frequency</span><span className="text-white capitalize">{quote.frequencySelected.replace(/-/g, " ")}</span></> : null}
                  <span className="text-slate-500">Total</span><span className="text-primary-400 font-semibold">${Number(quote?.total || 0).toLocaleString()}</span>
                  {expiresAt ? <><span className="text-slate-500">Expires</span><span className="text-amber-400">{expiresAt}</span></> : null}
                </div>
              ) : null}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1 border-t border-white/10">
              <button
                onClick={handleSendToSelf}
                disabled={sending}
                className="text-xs text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50"
              >
                Send test to myself
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !to}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #2563EB, #1d4ed8)" }}
                >
                  {sending ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send Email
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
