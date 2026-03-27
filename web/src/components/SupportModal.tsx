import { useState, useRef } from "react";
import { X, Send, Paperclip, CheckCircle, Loader, AlertCircle } from "lucide-react";
import { useSubscription } from "../lib/subscription";
import { useAuth } from "../lib/auth";

const TIER_LABELS: Record<string, string> = {
  free: "Free Trial",
  starter: "Starter ($19/mo)",
  growth: "Growth ($49/mo)",
  pro: "Pro ($99/mo)",
};

interface Props {
  onClose: () => void;
}

interface Screenshot {
  filename: string;
  base64: string;
  mimeType: string;
  preview: string;
}

export function SupportModal({ onClose }: Props) {
  const { user } = useAuth();
  const { tier } = useSubscription();

  const [name, setName] = useState(`${user?.firstName || ""} ${user?.lastName || ""}`.trim());
  const [email, setEmail] = useState(user?.email || "");
  const [message, setMessage] = useState("");
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [ticketId, setTicketId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const tierLabel = TIER_LABELS[tier] || tier || "Free Trial";

  async function compressToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 1200;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        URL.revokeObjectURL(url);
        resolve(dataUrl.split(",")[1]);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = 3 - screenshots.length;
    const toProcess = Array.from(files).slice(0, remaining);
    for (const file of toProcess) {
      if (!file.type.startsWith("image/")) continue;
      const base64 = await compressToBase64(file);
      const preview = `data:image/jpeg;base64,${base64}`;
      setScreenshots(prev => [
        ...prev,
        { filename: file.name, base64, mimeType: "image/jpeg", preview },
      ]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, tier, message, screenshots }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setTicketId(data.ticketId);
      setStatus("success");
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: "92vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4 shrink-0"
          style={{ borderBottom: "1px solid #f1f5f9" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-bold text-gray-900">Contact Support</h2>
              <p className="text-[13px] text-gray-500 mt-0.5">We typically reply within a few hours</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: "rgba(0,0,0,0.06)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.1)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.06)"; }}
            >
              <X size={16} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {status === "success" ? (
            <div className="flex flex-col items-center text-center py-8">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                style={{ background: "linear-gradient(135deg, #d1fae5, #a7f3d0)" }}
              >
                <CheckCircle size={32} style={{ color: "#059669" }} />
              </div>
              <h3 className="text-[17px] font-bold text-gray-900 mb-2">Message sent!</h3>
              <p className="text-[14px] text-gray-600 leading-relaxed mb-3">
                You'll receive a confirmation email shortly. We'll follow up as soon as possible.
              </p>
              <div
                className="px-4 py-2 rounded-lg text-[12px] font-mono font-bold"
                style={{ background: "#f0fdf4", color: "#059669" }}
              >
                Ticket {ticketId}
              </div>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2.5 rounded-xl text-[14px] font-semibold text-white"
                style={{ background: "linear-gradient(135deg, #1e3a8a, #2563eb)" }}
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Your Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Jane Smith"
                    className="w-full px-3.5 py-2.5 rounded-xl text-[14px] text-gray-900 outline-none transition-all"
                    style={{
                      border: "1.5px solid #e2e8f0",
                      background: "#f8fafc",
                    }}
                    onFocus={e => { (e.target as HTMLElement).style.borderColor = "#2563eb"; (e.target as HTMLElement).style.background = "#fff"; }}
                    onBlur={e => { (e.target as HTMLElement).style.borderColor = "#e2e8f0"; (e.target as HTMLElement).style.background = "#f8fafc"; }}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Email Address</label>
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    type="email"
                    placeholder="jane@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl text-[14px] text-gray-900 outline-none transition-all"
                    style={{
                      border: "1.5px solid #e2e8f0",
                      background: "#f8fafc",
                    }}
                    onFocus={e => { (e.target as HTMLElement).style.borderColor = "#2563eb"; (e.target as HTMLElement).style.background = "#fff"; }}
                    onBlur={e => { (e.target as HTMLElement).style.borderColor = "#e2e8f0"; (e.target as HTMLElement).style.background = "#f8fafc"; }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Your Plan</label>
                <div
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[14px]"
                  style={{ border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#64748b" }}
                >
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
                    style={{ background: tier === "free" ? "#64748b" : tier === "starter" ? "#0ea5e9" : tier === "growth" ? "#7c3aed" : "#0f172a" }}
                  >
                    {tierLabel.split(" ")[0].toUpperCase()}
                  </span>
                  <span>{tierLabel}</span>
                  <span className="ml-auto text-[11px]" style={{ color: "#94a3b8" }}>Auto-detected</span>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">Describe the Issue</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  required
                  rows={6}
                  placeholder="Please describe what happened, what you expected to happen, and any steps we can take to reproduce the issue..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-[14px] text-gray-900 outline-none transition-all resize-none"
                  style={{
                    border: "1.5px solid #e2e8f0",
                    background: "#f8fafc",
                    lineHeight: "1.65",
                  }}
                  onFocus={e => { (e.target as HTMLElement).style.borderColor = "#2563eb"; (e.target as HTMLElement).style.background = "#fff"; }}
                  onBlur={e => { (e.target as HTMLElement).style.borderColor = "#e2e8f0"; (e.target as HTMLElement).style.background = "#f8fafc"; }}
                />
              </div>

              {/* Screenshots */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-semibold text-gray-700">Screenshots (optional)</label>
                  <span className="text-[11px]" style={{ color: "#94a3b8" }}>{screenshots.length}/3</span>
                </div>
                {screenshots.length > 0 && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {screenshots.map((s, i) => (
                      <div key={i} className="relative group" style={{ width: 80, height: 80 }}>
                        <img
                          src={s.preview}
                          alt=""
                          className="w-full h-full object-cover rounded-lg"
                          style={{ border: "1.5px solid #e2e8f0" }}
                        />
                        <button
                          type="button"
                          onClick={() => setScreenshots(prev => prev.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "#ef4444" }}
                        >
                          <X size={11} color="white" />
                        </button>
                      </div>
                    ))}
                    {screenshots.length < 3 && (
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex items-center justify-center rounded-lg transition-colors"
                        style={{ width: 80, height: 80, border: "1.5px dashed #cbd5e1", background: "#f8fafc", color: "#94a3b8" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#2563eb"; (e.currentTarget as HTMLElement).style.color = "#2563eb"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#cbd5e1"; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
                      >
                        <Paperclip size={18} />
                      </button>
                    )}
                  </div>
                )}
                {screenshots.length === 0 && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left"
                    style={{ border: "1.5px dashed #cbd5e1", background: "#f8fafc", color: "#64748b" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#2563eb"; (e.currentTarget as HTMLElement).style.color = "#2563eb"; (e.currentTarget as HTMLElement).style.background = "#eff6ff"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#cbd5e1"; (e.currentTarget as HTMLElement).style.color = "#64748b"; (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                  >
                    <Paperclip size={16} />
                    <span className="text-[13px]">Attach screenshots (up to 3)</span>
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => handleFiles(e.target.files)}
                />
              </div>

              {status === "error" && (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-[13px]"
                  style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}
                >
                  <AlertCircle size={15} />
                  <span>{errorMsg}</span>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        {status !== "success" && (
          <div
            className="px-6 py-4 shrink-0"
            style={{ borderTop: "1px solid #f1f5f9" }}
          >
            <button
              onClick={handleSubmit as any}
              disabled={status === "loading" || !name.trim() || !email.trim() || !message.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold text-white transition-all"
              style={{
                background: status === "loading" || !name.trim() || !email.trim() || !message.trim()
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #1e3a8a, #2563eb)",
                cursor: status === "loading" || !name.trim() || !email.trim() || !message.trim() ? "not-allowed" : "pointer",
              }}
            >
              {status === "loading" ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Send Message</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
