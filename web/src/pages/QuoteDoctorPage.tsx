import { useState, useRef } from "react";
import { Zap, Copy, Download, Upload, FileText, Loader2, X, Check, ArrowRight, Share2, ChevronRight } from "lucide-react";

function markdownToHtml(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = escaped.split("\n");
  const out: string[] = [];
  let inList = false;
  for (const raw of lines) {
    let line = raw
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.*?)__/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>");
    if (/^\s*[-•]\s+/.test(raw)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${line.replace(/^\s*[-•]\s+/, "")}</li>`);
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      if (/^#{1,2}\s/.test(raw)) out.push(`<h2>${line.replace(/^#+\s*/, "")}</h2>`);
      else if (line.trim() === "" || line.trim() === "---") out.push("<br>");
      else out.push(`<p>${line}</p>`);
    }
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}

export default function QuoteDoctorPage() {
  const [tab, setTab] = useState<"paste" | "upload">("paste");
  const [quoteText, setQuoteText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState("image/jpeg");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimized, setOptimized] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const compressImage = (dataUrl: string): Promise<{ base64: string; mimeType: string; preview: string }> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1400;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/jpeg", 0.82);
        resolve({ base64: compressed.split(",")[1], mimeType: "image/jpeg", preview: compressed });
      };
      img.src = dataUrl;
    });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const { base64, mimeType, preview } = await compressImage(ev.target?.result as string);
      setImageBase64(base64);
      setImageMimeType(mimeType);
      setImagePreview(preview);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageBase64(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "paste" && !quoteText.trim()) { setError("Please paste your quote text."); return; }
    if (tab === "upload" && !imageBase64) { setError("Please upload a screenshot first."); return; }
    setLoading(true);
    setError(null);
    setOptimized(null);
    try {
      const body: Record<string, string> = {};
      if (tab === "paste") body.quoteText = quoteText.trim();
      else { body.imageBase64 = imageBase64!; body.imageMimeType = imageMimeType; }

      const res = await fetch("/api/quote-doctor/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setOptimized(data.optimized);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!optimized) return;
    await navigator.clipboard.writeText(optimized);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText("https://getquotepro.ai/quote-doctor");
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handlePDF = () => {
    if (!optimized) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Cleaning Services Proposal</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Helvetica Neue',Arial,sans-serif;background:#eef2f7;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.save-bar{background:#1e3a5f;padding:12px 24px;text-align:center;position:sticky;top:0;z-index:10}
.save-bar button{background:#16a34a;color:#fff;border:none;border-radius:8px;padding:10px 32px;font-size:15px;font-weight:700;cursor:pointer;letter-spacing:.01em}
.page{max-width:720px;margin:28px auto 60px;background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.13);overflow:hidden}
.ph{background:linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%);padding:40px 44px 32px}
.ph h1{font-size:28px;font-weight:800;color:#fff;margin-bottom:16px}
.ph .pill{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.9);font-size:11px;font-weight:600;padding:4px 12px;border-radius:100px;margin-right:8px}
.pb{padding:40px 44px}
.pb p{font-size:15px;line-height:1.8;color:#374151;margin-bottom:12px}
.pb h2{font-size:17px;font-weight:700;color:#111827;margin:20px 0 8px}
.pb ul{list-style:none;padding:0;margin:8px 0 16px}
.pb ul li{font-size:14px;color:#374151;padding:4px 0 4px 22px;position:relative;line-height:1.7}
.pb ul li::before{content:"✓";position:absolute;left:0;color:#16a34a;font-weight:800}
.pb br{display:block;height:6px;content:""}
strong{color:#111827;font-weight:700}
@media print{body{background:#fff}.save-bar{display:none}.page{box-shadow:none;border-radius:0;margin:0;max-width:100%}.ph{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="save-bar"><button onclick="window.print()">Save as PDF / Print</button></div>
<div class="page">
  <div class="ph">
    <h1>Cleaning Services Proposal</h1>
    <span class="pill">&#10003; Licensed &amp; Insured</span>
    <span class="pill">Valid for 7 days</span>
  </div>
  <div class="pb">${markdownToHtml(optimized)}</div>
</div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
          <Zap className="w-4 h-4" />
          Free AI Tool
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
          Is Your Quote<br className="hidden sm:block" /> Losing You Jobs?
        </h1>
        <p className="text-lg text-slate-500 max-w-xl mx-auto mb-3">
          Paste your current quote or upload a screenshot. Quote Doctor will rewrite it to convert more jobs — free, in seconds.
        </p>
        <p className="text-sm text-slate-400">No account needed. No credit card. Ever.</p>
      </div>

      {/* Input Section */}
      <div className="max-w-3xl mx-auto px-4 pb-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {(["paste", "upload"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors ${
                  tab === t
                    ? "bg-white text-emerald-600 border-b-2 border-emerald-500"
                    : "bg-gray-50 text-gray-500 hover:text-gray-700"
                }`}>
                {t === "paste"
                  ? <><FileText className="w-4 h-4" />Paste Quote</>
                  : <><Upload className="w-4 h-4" />Upload Screenshot</>}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-4">
            {tab === "paste" ? (
              <textarea
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder={"Paste your current quote here...\n\nExample:\nHi Sarah,\nYour clean is $180. Let me know.\n- Mike"}
                rows={10}
                className="w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Quote screenshot" className="w-full max-h-80 object-contain rounded-xl border border-gray-200" />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow border border-gray-200 text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl p-12 flex flex-col items-center justify-center gap-3 hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors cursor-pointer"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-700">Click to upload a screenshot</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, or WEBP — any quote screenshot works</p>
                    </div>
                  </button>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
                <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold py-4 rounded-xl text-base transition-colors shadow-sm shadow-emerald-200"
            >
              {loading
                ? <><Loader2 className="w-5 h-5 animate-spin" />Optimizing your quote...</>
                : <><Zap className="w-5 h-5" />Optimize My Quote</>}
            </button>

            <p className="text-center text-xs text-gray-400">
              Takes about 10 seconds. No account needed. No credit card. Ever.
            </p>
          </div>
        </form>
      </div>

      {/* Results */}
      {optimized && (
        <div ref={resultRef} className="max-w-3xl mx-auto px-4 pb-8 space-y-5">
          {/* Optimized output */}
          <div className="bg-white rounded-2xl border-2 border-emerald-400 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-emerald-100 bg-emerald-50/60">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-700 uppercase tracking-wide">Optimized Version</span>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">AI Enhanced</span>
            </div>
            <div className="p-6">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">{optimized}</pre>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors"
            >
              {copied ? <><Check className="w-4 h-4 text-emerald-400" />Copied!</> : <><Copy className="w-4 h-4" />Copy Quote</>}
            </button>
            <button
              onClick={handlePDF}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 border-2 border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
              Save as PDF
            </button>
          </div>

          {/* Try again */}
          <div className="text-center">
            <button
              onClick={() => { setOptimized(null); setQuoteText(""); clearImage(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium underline underline-offset-2 transition-colors"
            >
              Optimize another quote
            </button>
          </div>

          {/* Conversion CTA */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-2 border-emerald-200 rounded-2xl p-8 text-center">
            <p className="text-base font-bold text-gray-900 mb-1">
              QuotePro sends quotes like this automatically
            </p>
            <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
              In 60 seconds, from your phone, with built-in follow-up so you never lose a job to a faster competitor.
            </p>
            <a
              href="/register"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-4 rounded-xl text-base transition-colors shadow-sm shadow-emerald-200"
            >
              Start My Free 7-Day Trial <ArrowRight className="w-5 h-5" />
            </a>
            <p className="text-xs text-gray-400 mt-3">No credit card required. Cancel anytime.</p>
          </div>

          {/* Share */}
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">
              Know another cleaning business owner with a weak quote? Share Quote Doctor:
            </p>
            <button
              onClick={copyShareLink}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
            >
              <Share2 className="w-4 h-4" />
              {linkCopied ? "Link copied!" : "Copy Share Link"}
            </button>
          </div>
        </div>
      )}

      {/* Bottom sign-in link (before result) */}
      {!optimized && (
        <div className="max-w-2xl mx-auto px-4 pb-16 text-center">
          <p className="text-sm text-gray-400 mb-2">Already using QuotePro?</p>
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            Sign in to your account <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      )}
    </div>
  );
}
