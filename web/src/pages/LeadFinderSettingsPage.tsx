import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, X, Radio, RefreshCw } from "lucide-react";

const DEFAULT_KEYWORDS = [
  "house cleaner", "cleaning service", "maid service",
  "deep cleaning", "move out cleaning", "recurring cleaning",
  "need a cleaner", "cleaning quote",
];
const DEFAULT_SUBREDDITS = [
  "cleaningtips", "moving", "homeowners", "firsttimehomebuyer",
  "landlord", "airbnb", "PropertyManagement", "Tenant",
];

function TagInput({
  label,
  description,
  values,
  onChange,
  placeholder,
  suggestions,
}: {
  label: string;
  description?: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  suggestions?: string[];
}) {
  const [input, setInput] = useState("");

  const add = useCallback((raw: string) => {
    const v = raw.trim().toLowerCase();
    if (!v || values.includes(v)) { setInput(""); return; }
    onChange([...values, v]);
    setInput("");
  }, [values, onChange]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); add(input); }
    if (e.key === "Backspace" && !input && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  const unusedSuggestions = (suggestions ?? []).filter((s) => !values.includes(s.toLowerCase()));

  return (
    <div className="mb-6">
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
      {description ? <p className="text-xs text-slate-400 mb-2">{description}</p> : null}

      <div className="flex gap-2 mb-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400"
        />
        <button
          type="button"
          onClick={() => add(input)}
          disabled={!input.trim()}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-2">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full border border-violet-200"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="text-violet-400 hover:text-violet-600 transition-colors"
                aria-label={`Remove ${v}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400 mb-2">No items added yet</p>
      )}

      {unusedSuggestions.length > 0 ? (
        <div>
          <p className="text-xs text-slate-400 mb-1.5">Quick add:</p>
          <div className="flex flex-wrap gap-1.5">
            {unusedSuggestions.slice(0, 6).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="px-2.5 py-1 text-xs text-slate-600 border border-slate-200 rounded-full hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 transition-colors"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-violet-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
    </label>
  );
}

export default function LeadFinderSettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const hasLoaded = useRef(false);

  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ["/api/lead-finder/settings"],
    queryFn: async () => {
      const res = await fetch("/api/lead-finder/settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const [enabled, setEnabled] = useState(true);
  const [notifyNewLeads, setNotifyNewLeads] = useState(true);
  const [broadFeed, setBroadFeed] = useState(true);
  const [radiusMiles, setRadiusMiles] = useState("25");
  const [targetCities, setTargetCities] = useState<string[]>([]);
  const [targetZips, setTargetZips] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS);
  const [subreddits, setSubreddits] = useState<string[]>(DEFAULT_SUBREDDITS);

  useEffect(() => {
    if (!settings || hasLoaded.current) return;
    hasLoaded.current = true;
    setEnabled(settings.enabled ?? true);
    setNotifyNewLeads(settings.notifyNewLeads ?? true);
    setBroadFeed(settings.broadFeed ?? true);
    setRadiusMiles(String(settings.radiusMiles ?? 25));
    setTargetCities((settings.targetCities as string[]) ?? []);
    setTargetZips((settings.targetZips as string[]) ?? []);
    const kw = (settings.keywords as string[]) ?? [];
    setKeywords(kw.length > 0 ? kw : DEFAULT_KEYWORDS);
    const subs = (settings.subreddits as string[]) ?? [];
    setSubreddits(subs.length > 0 ? subs : DEFAULT_SUBREDDITS);
  }, [settings]);

  const [saved, setSaved] = useState(false);
  const saveMutation = useMutation({
    mutationFn: () =>
      fetch("/api/lead-finder/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          enabled, notifyNewLeads, broadFeed,
          radiusMiles: Number(radiusMiles) || 25,
          targetCities, targetZips, keywords, subreddits,
        }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/lead-finder/settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const [scanning, setScanning] = useState(false);
  const handleScanNow = async () => {
    setScanning(true);
    try {
      await fetch("/api/lead-finder/poll", { method: "POST", credentials: "include" });
      qc.invalidateQueries({ queryKey: ["/api/lead-finder/leads"] });
      navigate("/lead-finder");
    } catch {}
    setScanning(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/lead-finder")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-violet-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Lead Finder
        </button>
      </div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Lead Finder Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure how QuotePro scans for cleaning leads</p>
        </div>
        <button
          onClick={handleScanNow}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
          {scanning ? "Scanning..." : "Scan Now"}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4 space-y-4">
        <h2 className="font-semibold text-slate-800">General</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-800">Enable Lead Finder</p>
            <p className="text-xs text-slate-400">Automatically scan for new leads every hour</p>
          </div>
          <Toggle checked={enabled} onChange={setEnabled} />
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-sm font-medium text-slate-800">Broader Cleaning Feed</p>
            <p className="text-xs text-slate-400">Show general cleaning leads even without a perfect location match</p>
          </div>
          <Toggle checked={broadFeed} onChange={setBroadFeed} />
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-sm font-medium text-slate-800">Push Notifications</p>
            <p className="text-xs text-slate-400">Notify when new leads are found (mobile)</p>
          </div>
          <Toggle checked={notifyNewLeads} onChange={setNotifyNewLeads} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-slate-800 mb-4">Service Area</h2>
        <TagInput
          label="Target Cities"
          description="Add the cities where you offer cleaning services."
          values={targetCities}
          onChange={setTargetCities}
          placeholder="e.g. Austin"
          suggestions={["New York", "Chicago", "Houston", "Phoenix", "Philadelphia", "Dallas"]}
        />
        <TagInput
          label="ZIP Codes"
          description="Add specific ZIP codes for tighter location matching."
          values={targetZips}
          onChange={setTargetZips}
          placeholder="e.g. 78701"
        />
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Radius (miles)
          </label>
          <p className="text-xs text-slate-400 mb-2">Search within this radius of your target cities</p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={5}
              max={200}
              value={radiusMiles}
              onChange={(e) => setRadiusMiles(e.target.value)}
              className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <span className="text-sm text-slate-500">miles</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-slate-800 mb-4">Search Preferences</h2>
        <TagInput
          label="Keywords to Track"
          description="Phrases that signal someone needs cleaning help."
          values={keywords}
          onChange={setKeywords}
          placeholder="e.g. house cleaner"
          suggestions={DEFAULT_KEYWORDS}
        />
        <TagInput
          label="Subreddits"
          description="Communities to scan for cleaning leads (no r/ prefix needed)."
          values={subreddits}
          onChange={setSubreddits}
          placeholder="e.g. chicago (no r/)"
          suggestions={["chicago", "nyc", "houston", "philadelphia", "dallas", "denver"]}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || saved}
          className="flex-1 py-3 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
        >
          {saveMutation.isPending ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : null}
          {saved ? "Saved!" : "Save Settings"}
        </button>
        <button
          type="button"
          onClick={() => { saveMutation.mutate(); setTimeout(() => handleScanNow(), 500); }}
          disabled={saveMutation.isPending || scanning}
          className="px-5 py-3 border border-violet-300 text-violet-700 rounded-xl text-sm font-semibold hover:bg-violet-50 disabled:opacity-60 transition-colors"
        >
          Save & Scan
        </button>
      </div>
    </div>
  );
}
