import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const DEFAULT_KEYWORDS = [
  "house cleaner", "cleaning service", "maid service",
  "deep cleaning", "move out cleaning", "recurring cleaning",
];
const DEFAULT_SUBREDDITS = ["cleaningtips", "moving", "homeowners"];

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  const add = useCallback(() => {
    const v = input.trim().toLowerCase();
    if (!v || values.includes(v)) { setInput(""); return; }
    onChange([...values, v]);
    setInput("");
  }, [input, values, onChange]);

  return (
    <div className="mb-5">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={placeholder}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
        <button
          onClick={add}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <button
            key={v}
            onClick={() => onChange(values.filter((x) => x !== v))}
            className="flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full border border-violet-200 hover:bg-violet-100"
          >
            {v}
            <span className="text-violet-400">×</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LeadFinderSettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ["/api/lead-finder/settings"],
    queryFn: async () => {
      const res = await fetch("/api/lead-finder/settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const [enabled, setEnabled] = useState(true);
  const [notifyNewLeads, setNotifyNewLeads] = useState(true);
  const [radiusMiles, setRadiusMiles] = useState("25");
  const [targetCities, setTargetCities] = useState<string[]>([]);
  const [targetZips, setTargetZips] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS);
  const [subreddits, setSubreddits] = useState<string[]>(DEFAULT_SUBREDDITS);

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.enabled ?? true);
    setNotifyNewLeads(settings.notifyNewLeads ?? true);
    setRadiusMiles(String(settings.radiusMiles ?? 25));
    setTargetCities((settings.targetCities as string[]) ?? []);
    setTargetZips((settings.targetZips as string[]) ?? []);
    const kw = (settings.keywords as string[]) ?? [];
    setKeywords(kw.length > 0 ? kw : DEFAULT_KEYWORDS);
    const subs = (settings.subreddits as string[]) ?? [];
    setSubreddits(subs.length > 0 ? subs : DEFAULT_SUBREDDITS);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () =>
      fetch("/api/lead-finder/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          enabled, notifyNewLeads,
          radiusMiles: Number(radiusMiles) || 25,
          targetCities, targetZips, keywords, subreddits,
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/lead-finder/settings"] });
      navigate("/lead-finder");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-4">
        <button onClick={() => navigate("/lead-finder")} className="text-sm text-violet-600 hover:underline">
          ← Back
        </button>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Lead Finder Settings</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-4">General</h2>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-gray-800">Enable Lead Finder</div>
            <div className="text-xs text-gray-500">Automatically scan Reddit for new leads every hour</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-violet-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
          </label>
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <div>
            <div className="text-sm font-semibold text-gray-800">Push Notifications</div>
            <div className="text-xs text-gray-500">Notify when new leads are found (mobile)</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={notifyNewLeads} onChange={(e) => setNotifyNewLeads(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-violet-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
          </label>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-4">Service Area</h2>
        <TagInput label="Target Cities" values={targetCities} onChange={setTargetCities} placeholder="e.g. Austin, Dallas" />
        <TagInput label="ZIP Codes" values={targetZips} onChange={setTargetZips} placeholder="e.g. 78701" />
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Radius (miles)</label>
          <input
            type="number"
            value={radiusMiles}
            onChange={(e) => setRadiusMiles(e.target.value)}
            className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">Search Settings</h2>
        <TagInput label="Keywords to Track" values={keywords} onChange={setKeywords} placeholder="e.g. house cleaner" />
        <TagInput label="Subreddits" values={subreddits} onChange={setSubreddits} placeholder="e.g. chicago (no r/)" />
      </div>

      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full py-3 bg-violet-600 text-white rounded-xl text-base font-semibold hover:bg-violet-700 disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {saveMutation.isPending ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
        Save Settings
      </button>
    </div>
  );
}
