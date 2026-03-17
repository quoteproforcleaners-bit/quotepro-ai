import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../components/ui";
import {
  Link2, Copy, Check, ToggleLeft, ToggleRight, ExternalLink, Code2,
  Globe, Search, Instagram, Mail, MessageCircle,
} from "lucide-react";

interface LeadCaptureSettings {
  slug: string;
  enabled: boolean;
  buttonText: string;
  publicUrl: string;
}

export default function LeadCapturePage() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<LeadCaptureSettings>({
    queryKey: ["/api/business/lead-capture-settings"],
  });

  const [slugInput, setSlugInput] = useState("");
  const [buttonTextInput, setButtonTextInput] = useState("Get a Free Quote");
  const [btnColor, setBtnColor] = useState("#2563EB");
  const [btnRadius, setBtnRadius] = useState(8);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "error">("idle");
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (settings) {
      setSlugInput(settings.slug || "");
      setButtonTextInput(settings.buttonText || "Get a Free Quote");
    }
  }, [settings]);

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
