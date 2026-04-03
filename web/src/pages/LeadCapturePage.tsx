import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/ui";
import QRCode from "qrcode";
import {
  Link2, Copy, Check, ToggleLeft, ToggleRight, ExternalLink, Code2,
  Globe, Search, Instagram, Mail, MessageCircle, Download, QrCode,
  Printer, BarChart2, Users, TrendingUp, Zap, AlertTriangle, ChevronRight,
  CheckCircle2, Settings,
} from "lucide-react";

interface LeadCaptureSettings {
  slug: string;
  enabled: boolean;
  buttonText: string;
  publicUrl: string;
}

interface LeadLinkAnalytics {
  visits: number;
  conversions: number;
  conversionRate: number;
}

interface PricingStatus {
  configured: boolean;
  usingDefaultPricing: boolean;
  completionPercent: number;
  missingItems: string[];
}

export default function LeadCapturePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: settings, isLoading } = useQuery<LeadCaptureSettings>({
    queryKey: ["/api/business/lead-capture-settings"],
  });

  const { data: analytics } = useQuery<LeadLinkAnalytics>({
    queryKey: ["/api/business/lead-link-analytics"],
  });

  const { data: pricingStatus } = useQuery<PricingStatus>({
    queryKey: ["/api/lead-link/pricing-status"],
  });

  const [slugInput, setSlugInput] = useState("");
  const [buttonTextInput, setButtonTextInput] = useState("Get a Free Quote");
  const [btnColor, setBtnColor] = useState("#2563EB");
  const [btnRadius, setBtnRadius] = useState(8);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "error">("idle");
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [qrColor, setQrColor] = useState("#1e293b");
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const qrSize = 220;

  const [guideSent, setGuideSent] = useState(false);
  const [guideSending, setGuideSending] = useState(false);
  const [guideError, setGuideError] = useState<string | null>(null);

  const { data: guideStatus } = useQuery<{ sentAt: string | null; hasSlug: boolean }>({
    queryKey: ["/api/lead-link/guide-status"],
  });

  const handleSendGuide = async () => {
    setGuideSending(true);
    setGuideError(null);
    try {
      const res = await fetch("/api/lead-link/send-guide-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setGuideSent(true);
        queryClient.invalidateQueries({ queryKey: ["/api/lead-link/guide-status"] });
      } else {
        const data = await res.json().catch(() => ({}));
        setGuideError(data.message || "Failed to send. Please try again.");
      }
    } catch {
      setGuideError("Failed to send. Please check your connection and try again.");
    } finally {
      setGuideSending(false);
    }
  };

  const showGuideCard = !guideStatus?.sentAt && !guideSent;

  useEffect(() => {
    if (settings) {
      setSlugInput(settings.slug || "");
      setButtonTextInput(settings.buttonText || "Get a Free Quote");
    }
  }, [settings]);

  useEffect(() => {
    if (!qrCanvasRef.current || !settings?.publicUrl) return;
    QRCode.toCanvas(qrCanvasRef.current, settings.publicUrl, {
      width: qrSize,
      margin: 2,
      color: { dark: qrColor, light: "#ffffff" },
      errorCorrectionLevel: "H",
    }).catch(() => {});
  }, [settings?.publicUrl, qrColor, qrSize]);

  const handleDownloadQR = () => {
    if (!qrCanvasRef.current || !settings?.publicUrl) return;
    const slug = settings.slug || "quote-link";

    // Build a higher-res offscreen canvas with padding + label
    const padding = 32;
    const labelHeight = 48;
    const size = qrSize + padding * 2;
    const totalHeight = size + labelHeight;

    const offscreen = document.createElement("canvas");
    offscreen.width = size;
    offscreen.height = totalHeight;
    const ctx = offscreen.getContext("2d")!;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.roundRect(0, 0, size, totalHeight, 16);
    ctx.fill();

    // Draw the rendered QR canvas onto offscreen
    ctx.drawImage(qrCanvasRef.current, padding, padding, qrSize, qrSize);

    // URL label underneath
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(settings.publicUrl.replace(/^https?:\/\//, ""), size / 2, size + 26);

    const link = document.createElement("a");
    link.download = `quotepro-qr-${slug}.png`;
    link.href = offscreen.toDataURL("image/png");
    link.click();
  };

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<{ slug: string; enabled: boolean; buttonText: string }>) => {
      const res = await fetch("/api/business/lead-capture-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/lead-capture-settings"] });
    },
  });

  const checkSlug = async (val: string) => {
    if (!val || val.length < 3) { setSlugStatus("idle"); return; }
    if (val === settings?.slug) { setSlugStatus("available"); return; }
    setSlugStatus("checking");
    try {
      const res = await fetch(`/api/public/slug-available/${encodeURIComponent(val)}`, { credentials: "include" });
      const data = await res.json();
      setSlugStatus(data.available ? "available" : "taken");
    } catch { setSlugStatus("error"); }
  };

  const handleSlugChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/--+/g, "-");
    setSlugInput(clean);
    setSlugStatus("idle");
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    checkTimerRef.current = setTimeout(() => checkSlug(clean), 600);
  };

  const handleSaveSlug = async () => {
    if (slugStatus === "taken") return;
    try {
      await updateMutation.mutateAsync({ slug: slugInput });
    } catch (e: any) { alert(e.message); }
  };

  const handleToggle = () => {
    updateMutation.mutate({ enabled: !(settings?.enabled ?? true) });
  };

  const handleSaveButtonText = () => {
    updateMutation.mutate({ buttonText: buttonTextInput });
  };

  const handleCopy = async (type: "link" | "code") => {
    const text = type === "link" ? (settings?.publicUrl ?? "") : htmlSnippet;
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const htmlSnippet = settings
    ? `<a href="${settings.publicUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;background:${btnColor};color:#fff;text-decoration:none;border-radius:${btnRadius}px;font-weight:600;font-family:sans-serif;">${buttonTextInput || "Get a Free Quote"}</a>`
    : "";

  const slugStatusColor =
    slugStatus === "available" ? "text-emerald-600" :
    slugStatus === "taken" || slugStatus === "error" ? "text-red-500" :
    "text-slate-400";

  const slugStatusText =
    slugStatus === "checking" ? "Checking..." :
    slugStatus === "available" ? (slugInput === settings?.slug ? "Your current URL" : "Available") :
    slugStatus === "taken" ? "Already taken — try another" :
    slugStatus === "error" ? "Could not check availability" : "";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isEnabled = settings?.enabled ?? true;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Lead Capture Link"
        subtitle="Share your link anywhere — customers fill it out, leads land in your inbox automatically."
      />

      {/* Guide email card — shown if guide has not been sent yet */}
      {showGuideCard ? (
        <>
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl p-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-teal-900">Get setup instructions by email</p>
              <p className="text-xs text-teal-700 mt-0.5">We'll send you examples and tips for sharing your Lead Link effectively.</p>
            </div>
            <button
              onClick={handleSendGuide}
              disabled={guideSending}
              className="flex-shrink-0 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {guideSending ? "Sending..." : "Send me the setup guide"}
            </button>
          </div>
          {guideError ? (
            <p className="text-xs text-red-600 mt-2 px-1">{guideError}</p>
          ) : null}
        </>
      ) : guideSent ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-medium text-emerald-800">Sent! Check your inbox for setup instructions.</p>
        </div>
      ) : null}

      {/* Analytics Strip */}
      {analytics && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: Users,
              label: "Visits (30d)",
              value: analytics.visits.toLocaleString(),
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              icon: TrendingUp,
              label: "Requests",
              value: analytics.conversions.toLocaleString(),
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              icon: Zap,
              label: "Conv. Rate",
              value: `${analytics.conversionRate}%`,
              color:
                analytics.conversionRate >= 20 ? "text-emerald-600"
                  : analytics.conversionRate >= 10 ? "text-amber-600"
                  : "text-slate-500",
              bg:
                analytics.conversionRate >= 20 ? "bg-emerald-50"
                  : analytics.conversionRate >= 10 ? "bg-amber-50"
                  : "bg-slate-50",
            },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className={`${bg} border border-slate-100 rounded-xl p-4 text-center`}>
              <Icon className={`w-4 h-4 ${color} mx-auto mb-1.5`} />
              <p className={`text-xl font-black ${color} leading-none mb-1`}>{value}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pricing Health Card */}
      {pricingStatus && (
        <div
          className={`rounded-xl border p-5 ${
            pricingStatus.configured
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50 border-amber-300"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  pricingStatus.configured ? "bg-emerald-500" : "bg-amber-400"
                }`}
              >
                {pricingStatus.configured
                  ? <CheckCircle2 className="w-5 h-5 text-white" />
                  : <AlertTriangle className="w-5 h-5 text-white" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className={`font-bold text-sm ${
                    pricingStatus.configured ? "text-emerald-800" : "text-amber-900"
                  }`}
                >
                  {pricingStatus.configured
                    ? "Pricing configured — estimates are accurate"
                    : "Pricing setup incomplete — customers see approximate estimates"
                  }
                </h3>
                <p
                  className={`text-xs mt-1 leading-relaxed ${
                    pricingStatus.configured ? "text-emerald-700" : "text-amber-800"
                  }`}
                >
                  {pricingStatus.configured
                    ? "Your pricing is set up. Customers on your Lead Link see accurate estimates based on your real rates."
                    : `Customers are seeing ballpark ranges instead of your real prices. Complete your pricing setup to build trust and reduce surprises.`
                  }
                </p>
                {!pricingStatus.configured && pricingStatus.missingItems.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {pricingStatus.missingItems.map(item => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}
                {/* Completion progress bar */}
                {!pricingStatus.configured && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-amber-200 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
                        style={{ width: `${pricingStatus.completionPercent}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-amber-600 shrink-0">
                      {pricingStatus.completionPercent}%
                    </span>
                  </div>
                )}
              </div>
            </div>
            {!pricingStatus.configured && (
              <button
                onClick={() => navigate("/pricing")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors shrink-0"
              >
                <Settings className="w-3.5 h-3.5" />
                Set Up Pricing
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Enable / Disable */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-800">Instant Quote Request Link</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              When on, customers can submit quote requests through your link.
            </p>
          </div>
          <button
            onClick={handleToggle}
            className="flex-shrink-0 text-slate-400 hover:text-blue-600 transition-colors"
            title={isEnabled ? "Disable" : "Enable"}
          >
            {isEnabled
              ? <ToggleRight className="w-9 h-9 text-blue-600" />
              : <ToggleLeft className="w-9 h-9" />}
          </button>
        </div>
        {!isEnabled && (
          <div className="mt-3 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Your quote request page is currently turned off. Visitors will see a "not available" message.
          </div>
        )}
      </div>

      {/* Your Link */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-blue-600" />
          Your Instant Quote Link
        </h3>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
          <span className="text-sm text-blue-600 font-medium truncate flex-1">{settings?.publicUrl || "—"}</span>
          <a
            href={settings?.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-blue-600 flex-shrink-0"
            title="Preview"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleCopy("link")}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            {copied === "link" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied === "link" ? "Copied!" : "Copy Link"}
          </button>
        </div>

        {/* Where to use it */}
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Where to use it</p>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
            {[
              { Icon: Globe, label: "Website" },
              { Icon: Search, label: "Google Business Profile" },
              { Icon: Instagram, label: "Instagram bio" },
              { Icon: Mail, label: "Email signature" },
              { Icon: MessageCircle, label: "Text messages" },
            ].map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-slate-500">
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* QR Code for Print */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <QrCode className="w-4 h-4 text-blue-600" />
            QR Code for Flyers &amp; Brochures
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Customers scan it with their phone camera to request a quote instantly. Download and drop it on any printed material.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* QR preview */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className="border-2 border-slate-200 rounded-xl p-3 bg-white shadow-sm">
              <canvas ref={qrCanvasRef} style={{ display: "block", borderRadius: 6 }} />
            </div>
            <p className="text-[11px] text-slate-400 text-center max-w-[180px] leading-relaxed">
              Scan to test — goes to your live quote link
            </p>
          </div>

          {/* Controls */}
          <div className="flex-1 space-y-4 w-full">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">QR Color</label>
              <div className="flex items-center gap-3">
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: "Dark", color: "#1e293b" },
                    { label: "Blue", color: "#1d4ed8" },
                    { label: "Green", color: "#059669" },
                    { label: "Black", color: "#000000" },
                  ].map(({ label, color }) => (
                    <button
                      key={color}
                      onClick={() => setQrColor(color)}
                      title={label}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${qrColor === color ? "border-blue-500 scale-110" : "border-slate-200 hover:border-slate-400"}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={qrColor}
                      onChange={e => setQrColor(e.target.value)}
                      className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer"
                      title="Custom color"
                    />
                    <span className="text-xs text-slate-400">Custom</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-slate-100 rounded-xl bg-slate-50 p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" />
                Print ideas
              </p>
              <ul className="space-y-1">
                {[
                  "Door hangers with before/after cleaning photos",
                  "Business cards with QR in the corner",
                  "Yard signs after a job",
                  "Vehicle magnets",
                  "Mailer postcards to neighborhoods",
                ].map(tip => (
                  <li key={tip} className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-blue-400 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleDownloadQR}
              disabled={!settings?.publicUrl}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Download QR Code (PNG)
            </button>
            <p className="text-xs text-slate-400">
              High-quality PNG — ready for print at any size. The QR code links directly to your unique quote request page.
            </p>
          </div>
        </div>
      </div>

      {/* Slug editor */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-slate-800">Customize Your URL</h3>
          <p className="text-sm text-slate-500 mt-0.5">Use your business name so customers recognize it.</p>
        </div>
        <div className="space-y-2">
          <div className="flex rounded-lg overflow-hidden border border-slate-200 focus-within:border-blue-500 transition-colors">
            <span className="bg-slate-50 text-slate-400 text-sm px-3 py-2.5 border-r border-slate-200 whitespace-nowrap flex-shrink-0">
              .../request/
            </span>
            <input
              type="text"
              value={slugInput}
              onChange={e => handleSlugChange(e.target.value)}
              className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
              placeholder="your-business-name"
            />
          </div>
          {slugStatusText && (
            <p className={`text-xs ${slugStatusColor}`}>{slugStatusText}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSaveSlug}
            disabled={updateMutation.isPending || slugStatus === "taken" || !slugInput}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {updateMutation.isPending ? "Saving..." : "Save URL"}
          </button>
        </div>
        {updateMutation.isError && (
          <p className="text-sm text-red-500">{(updateMutation.error as Error).message}</p>
        )}
      </div>

      {/* Website Button Generator */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-blue-600" />
            Website Quote Button
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Copy this HTML and paste it into your website to add a quote button.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Button Text</label>
            <input
              type="text"
              value={buttonTextInput}
              onChange={e => setButtonTextInput(e.target.value)}
              onBlur={handleSaveButtonText}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              placeholder="Get a Free Quote"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Button Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={btnColor}
                onChange={e => setBtnColor(e.target.value)}
                className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
              />
              <input
                type="text"
                value={btnColor}
                onChange={e => setBtnColor(e.target.value)}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Corner Radius: {btnRadius}px</label>
            <input
              type="range"
              min={0}
              max={30}
              value={btnRadius}
              onChange={e => setBtnRadius(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Live preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
          <a
            href={settings?.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: btnColor,
              color: "#fff",
              textDecoration: "none",
              borderRadius: btnRadius,
              fontWeight: 600,
              fontFamily: "sans-serif",
            }}
            onClick={e => e.preventDefault()}
          >
            {buttonTextInput || "Get a Free Quote"}
          </a>
        </div>

        {/* Code block */}
        <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-xs text-slate-300 whitespace-pre-wrap break-all">{htmlSnippet}</pre>
        </div>

        <button
          onClick={() => handleCopy("code")}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors"
        >
          {copied === "code" ? <Check className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
          {copied === "code" ? "Copied!" : "Copy Code"}
        </button>
      </div>
    </div>
  );
}
