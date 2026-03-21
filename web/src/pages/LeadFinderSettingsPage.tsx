import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, X, Radio, RefreshCw, MapPin, Tag,
  Layers, ChevronDown, ChevronUp, Info,
} from "lucide-react";

// ─── Keyword Packs ─────────────────────────────────────────────────────────────

const KEYWORD_PACKS: Record<string, { label: string; description: string; keywords: string[] }> = {
  recommendation: {
    label: "Recommendations",
    description: "People asking for cleaner referrals",
    keywords: [
      "house cleaner recommendation", "cleaning service recommendation",
      "maid service recommendation", "recommend a cleaner",
      "cleaning lady recommendation", "good house cleaner",
      "anyone know a good cleaner", "looking for a house cleaner",
    ],
  },
  intent: {
    label: "Direct Need",
    description: "Clear statements of needing to hire",
    keywords: [
      "need a cleaner", "need cleaning service", "looking for cleaning service",
      "hire a cleaner", "hire cleaning service", "cleaning quote",
      "house cleaner", "maid service", "cleaning service",
    ],
  },
  service_type: {
    label: "Service Types",
    description: "Specific cleaning service searches",
    keywords: [
      "deep cleaning", "move out cleaning", "move-out cleaning",
      "move in cleaning", "recurring cleaning", "biweekly cleaning",
      "weekly cleaning", "apartment cleaning", "one time cleaning",
    ],
  },
  high_value: {
    label: "High-Value",
    description: "Commercial, Airbnb, and specialty cleans",
    keywords: [
      "airbnb cleaning", "airbnb cleaner", "vacation rental cleaning",
      "post construction cleaning", "estate cleaning",
    ],
  },
};

const DEFAULT_KEYWORDS = [
  "house cleaner", "cleaning service", "maid service",
  "need a cleaner", "cleaning service recommendation",
  "deep cleaning", "move out cleaning", "recurring cleaning",
  "biweekly cleaning", "looking for a house cleaner",
];

const DEFAULT_SUBREDDITS = [
  "homeowners", "moving", "firsttimehomebuyer",
  "airbnb", "landlord", "PropertyManagement", "Tenant",
];

const SUGGESTED_CITIES = [
  "Austin", "Chicago", "Dallas", "Houston", "Phoenix",
  "Seattle", "Denver", "Atlanta", "Miami", "Boston",
  "Portland", "San Francisco", "Nashville", "Los Angeles",
];

const SUGGESTED_SUBREDDITS = [
  "homeowners", "moving", "firsttimehomebuyer", "airbnb",
  "landlord", "PropertyManagement", "Tenant", "personalfinance",
  "malelivingspace", "femalelivingspace", "ApartmentHacks",
];

// ─── Components ────────────────────────────────────────────────────────────────

function TagInput({
  label,
  description,
  values,
  onChange,
  placeholder,
  suggestions,
  hint,
}: {
  label: string;
  description?: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  suggestions?: string[];
  hint?: string;
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

      {hint ? (
        <p className="text-xs text-violet-600 flex items-center gap-1 mb-2">
          <Info className="w-3 h-3" />
          {hint}
        </p>
      ) : null}

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
        <p className="text-xs text-slate-400 mb-2">None added yet</p>
      )}

      {unusedSuggestions.length > 0 ? (
        <div>
          <p className="text-xs text-slate-400 mb-1.5">Quick add:</p>
          <div className="flex flex-wrap gap-1.5">
            {unusedSuggestions.slice(0, 8).map((s) => (
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

function KeywordPackSelector({ keywords, onChange }: { keywords: string[]; onChange: (v: string[]) => void }) {
  const [expanded, setExpanded] = useState(false);

  const addPack = (packKeywords: string[]) => {
    const merged = [...new Set([...keywords, ...packKeywords])];
    onChange(merged);
  };

  const packActive = (packKeywords: string[]) =>
    packKeywords.every((k) => keywords.includes(k.toLowerCase()));

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-violet-600 transition-colors"
      >
        <Layers className="w-3.5 h-3.5" />
        Keyword Packs
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {expanded ? (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(KEYWORD_PACKS).map(([key, pack]) => {
            const active = packActive(pack.keywords);
            return (
              <div
                key={key}
                className={`border rounded-xl p-3 ${active ? "border-violet-300 bg-violet-50" : "border-slate-200 bg-white"}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{pack.label}</p>
                    <p className="text-xs text-slate-400">{pack.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addPack(pack.keywords)}
                    disabled={active}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ml-2 ${
                      active
                        ? "bg-violet-100 text-violet-500 cursor-default"
                        : "bg-violet-600 text-white hover:bg-violet-700"
                    }`}
                  >
                    {active ? "Added" : "Add Pack"}
                  </button>
                </div>
                <p className="text-xs text-slate-500 line-clamp-1">
                  {pack.keywords.slice(0, 3).join(", ")}...
                </p>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

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

  const hasCities = targetCities.length > 0;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Nav */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate("/lead-finder")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-violet-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Lead Radar
        </button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-sm">
            <Radio className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Lead Radar Settings</h1>
            <p className="text-sm text-slate-500">Configure how your radar scans for leads</p>
          </div>
        </div>
        <button
          onClick={handleScanNow}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-60 transition-colors"
        >
          <Radio className={`w-4 h-4 ${scanning ? "animate-pulse" : ""}`} />
          {scanning ? "Scanning..." : "Scan Now"}
        </button>
      </div>

      {/* City nudge if not set */}
      {!hasCities ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 text-sm text-amber-800 mb-5">
          <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Add your city first</strong> — without a target city, Lead Radar can only search broad topic subreddits.
            City subreddits (r/Austin, r/Chicago, etc.) are where homeowners actually ask for local cleaning recommendations.
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-emerald-800 mb-5">
          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>City targeting active</strong> — scanning local city subreddits for {targetCities.join(", ")}.
          </span>
        </div>
      )}

      {/* Service Area */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-4 h-4 text-violet-500" />
          <h2 className="font-semibold text-slate-800">Service Area</h2>
        </div>
        <TagInput
          label="Target Cities"
          description="Your city gets scanned in dedicated local subreddits (r/Austin, r/Chicago, etc.) — dramatically more relevant leads."
          values={targetCities}
          onChange={setTargetCities}
          placeholder="e.g. Austin"
          suggestions={SUGGESTED_CITIES}
          hint="This is the most impactful setting for finding local leads."
        />
        <TagInput
          label="ZIP Codes (optional)"
          description="Add specific ZIP codes for tighter location matching in lead content."
          values={targetZips}
          onChange={setTargetZips}
          placeholder="e.g. 78701"
        />
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Radius (miles)
          </label>
          <p className="text-xs text-slate-400 mb-2">Used to score location matches in posts</p>
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

      {/* Keywords */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-4 h-4 text-violet-500" />
          <h2 className="font-semibold text-slate-800">Keywords</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          These phrases trigger lead detection. More keywords = broader coverage.
          The scanner uses 30+ built-in phrases regardless — these extend it further.
        </p>
        <KeywordPackSelector keywords={keywords} onChange={setKeywords} />
        <TagInput
          label="Your Keywords"
          description="Custom phrases to track — add anything your ideal customer might write."
          values={keywords}
          onChange={setKeywords}
          placeholder="e.g. cleaning lady Austin"
          suggestions={[
            "apartment cleaning help", "cleaner near me", "biweekly cleaner",
            "cleaning service cost", "who do you use for cleaning",
          ]}
        />
      </div>

      {/* Communities */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Radio className="w-4 h-4 text-violet-500" />
          <h2 className="font-semibold text-slate-800">Reddit Communities</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Topic-based communities to scan. Note: city subreddits are added automatically based on your Target Cities above.
        </p>
        <TagInput
          label="Subreddits"
          description="Add subreddits relevant to your market (no r/ prefix). City subs are auto-added."
          values={subreddits}
          onChange={setSubreddits}
          placeholder="e.g. homeowners"
          suggestions={SUGGESTED_SUBREDDITS}
        />
      </div>

      {/* General settings */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Scan Behavior</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-800">Auto-scan enabled</p>
            <p className="text-xs text-slate-400">Automatically scan for new leads every hour</p>
          </div>
          <Toggle checked={enabled} onChange={setEnabled} />
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-sm font-medium text-slate-800">Broader feed</p>
            <p className="text-xs text-slate-400">Show general cleaning leads even without a location match</p>
          </div>
          <Toggle checked={broadFeed} onChange={setBroadFeed} />
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-sm font-medium text-slate-800">Lead notifications</p>
            <p className="text-xs text-slate-400">Notify when new high-intent leads are found</p>
          </div>
          <Toggle checked={notifyNewLeads} onChange={setNotifyNewLeads} />
        </div>
      </div>

      {/* Save */}
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
