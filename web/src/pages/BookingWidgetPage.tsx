import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import { PageHeader } from "../components/ui";
import { ProGate } from "../components/ProGate";
import { Copy, Check, Plus, Trash2, Pencil } from "lucide-react";

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface WidgetService {
  id: string;
  name: string;
  durationHours: number;
  priceCents: number;
}

interface WidgetSettings {
  enabled: boolean;
  accentColor: string;
  businessName: string;
  services: WidgetService[];
  availableDays: number[]; // 0=Sun,6=Sat
  startTime: string;
  endTime: string;
  advanceNoticeHours: number;
}

/* ─── Preset accent colors ─────────────────────────────────────────────────── */

const PRESETS = [
  "#2563eb", "#7c3aed", "#059669", "#dc2626",
  "#d97706", "#0891b2", "#111827",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TIME_OPTIONS: { label: string; value: string }[] = Array.from(
  { length: 24 },
  (_, h) => {
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const label = `${h12}:00 ${ampm}`;
    const value = `${String(h).padStart(2, "0")}:00`;
    return { label, value };
  }
);

/* ─── Service row editor ────────────────────────────────────────────────────── */

interface ServiceEditorProps {
  services: WidgetService[];
  onChange: (s: WidgetService[]) => void;
}

function ServiceEditor({ services, onChange }: ServiceEditorProps) {
  const [editing, setEditing] = useState<Partial<WidgetService> | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const blank = (): Partial<WidgetService> => ({
    id: crypto.randomUUID(),
    name: "",
    durationHours: 2,
    priceCents: 0,
  });

  const openNew = () => {
    setEditing(blank());
    setEditIdx(null);
  };

  const openEdit = (idx: number) => {
    setEditing({ ...services[idx] });
    setEditIdx(idx);
  };

  const save = () => {
    if (!editing?.name?.trim()) return;
    const svc = {
      id: editing.id || crypto.randomUUID(),
      name: editing.name.trim(),
      durationHours: Number(editing.durationHours) || 0,
      priceCents: Math.round((Number(editing.priceCents) || 0) * 100),
    };
    if (editIdx !== null) {
      const next = [...services];
      next[editIdx] = svc;
      onChange(next);
    } else {
      onChange([...services, svc]);
    }
    setEditing(null);
    setEditIdx(null);
  };

  const remove = (idx: number) => onChange(services.filter((_, i) => i !== idx));

  return (
    <div>
      {services.length === 0 && (
        <p className="text-sm text-gray-400 mb-3">No services yet. Add one below.</p>
      )}
      {services.map((svc, i) => (
        <div
          key={svc.id}
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 mb-2 bg-white"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-900 truncate">{svc.name}</p>
            <p className="text-xs text-gray-500">
              {svc.durationHours > 0 ? `${svc.durationHours} hr · ` : ""}
              {svc.priceCents > 0 ? `$${(svc.priceCents / 100).toFixed(0)}` : "Contact for price"}
            </p>
          </div>
          <button
            onClick={() => openEdit(i)}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => remove(i)}
            className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {editing ? (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/40 mb-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="sm:col-span-3">
              <label className="text-xs font-medium text-gray-600 block mb-1">Service name *</label>
              <input
                className="input-field w-full"
                value={editing.name || ""}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. Deep Clean"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Duration (hrs)</label>
              <input
                type="number"
                min={0}
                step={0.5}
                className="input-field w-full"
                value={editing.durationHours ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, durationHours: parseFloat(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Price ($)</label>
              <input
                type="number"
                min={0}
                step={1}
                className="input-field w-full"
                value={editing.priceCents != null ? (editing.priceCents / 100).toFixed(0) : ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    priceCents: Math.round(parseFloat(e.target.value || "0") * 100),
                  })
                }
                placeholder="0 = contact for price"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="btn-primary text-sm py-1.5 px-4">
              {editIdx !== null ? "Save" : "Add Service"}
            </button>
            <button
              onClick={() => {
                setEditing(null);
                setEditIdx(null);
              }}
              className="btn-ghost text-sm py-1.5 px-4"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium mt-1"
        >
          <Plus size={14} /> Add Service
        </button>
      )}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────────────── */

function BookingWidgetInner() {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: settings, isLoading } = useQuery<WidgetSettings>({
    queryKey: ["/api/booking/settings"],
  });

  const { data: embedData } = useQuery<{ scriptTag: string; businessId: string }>({
    queryKey: ["/api/booking/embed-code"],
    enabled: !!settings?.enabled,
  });

  const [draft, setDraft] = useState<Partial<WidgetSettings>>({});

  const merged: WidgetSettings = {
    enabled: draft.enabled ?? settings?.enabled ?? false,
    accentColor: draft.accentColor ?? settings?.accentColor ?? "#2563eb",
    businessName: draft.businessName ?? settings?.businessName ?? "",
    services: draft.services ?? settings?.services ?? [],
    availableDays: draft.availableDays ?? settings?.availableDays ?? [1, 2, 3, 4, 5],
    startTime: draft.startTime ?? settings?.startTime ?? "08:00",
    endTime: draft.endTime ?? settings?.endTime ?? "18:00",
    advanceNoticeHours:
      draft.advanceNoticeHours ?? settings?.advanceNoticeHours ?? 24,
  };

  const patch = useMutation({
    mutationFn: (body: Partial<WidgetSettings>) =>
      apiRequest("PATCH", "/api/booking/settings", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/booking/settings"] });
      qc.invalidateQueries({ queryKey: ["/api/booking/embed-code"] });
      setDraft({});
    },
  });

  const handleSave = () => patch.mutate(merged);

  const copyEmbed = useCallback(() => {
    if (!embedData?.scriptTag) return;
    navigator.clipboard.writeText(embedData.scriptTag).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [embedData]);

  const toggleDay = (d: number) => {
    const curr = merged.availableDays;
    const next = curr.includes(d) ? curr.filter((x) => x !== d) : [...curr, d].sort();
    setDraft((p) => ({ ...p, availableDays: next }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  const hasChanges = Object.keys(draft).length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* ── Enable toggle ── */}
      <div className="card p-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-gray-900">Enable Booking Widget</p>
          <p className="text-sm text-gray-500 mt-0.5">
            Customers can book directly from your website
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={merged.enabled}
            onChange={(e) =>
              setDraft((p) => ({ ...p, enabled: e.target.checked }))
            }
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left column: settings ── */}
        <div className="space-y-5">
          {/* Branding */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Branding</h3>

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Business name (shown in widget)
              </label>
              <input
                className="input-field w-full"
                placeholder="Leave blank to use your default name"
                value={merged.businessName}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, businessName: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Accent color
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setDraft((p) => ({ ...p, accentColor: c }))}
                    className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: merged.accentColor === c ? "#111" : "transparent",
                    }}
                  />
                ))}
                <input
                  type="text"
                  className="input-field w-28 font-mono text-sm"
                  value={merged.accentColor}
                  maxLength={7}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, accentColor: e.target.value }))
                  }
                  placeholder="#2563eb"
                />
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Services</h3>
            <ServiceEditor
              services={merged.services}
              onChange={(s) => setDraft((p) => ({ ...p, services: s }))}
            />
          </div>

          {/* Availability */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Availability</h3>

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Available days
              </label>
              <div className="flex flex-wrap gap-2">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      merged.availableDays.includes(i)
                        ? "border-transparent text-white"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                    }`}
                    style={
                      merged.availableDays.includes(i)
                        ? { backgroundColor: merged.accentColor }
                        : {}
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Start time
                </label>
                <select
                  className="input-field w-full"
                  value={merged.startTime}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, startTime: e.target.value }))
                  }
                >
                  {TIME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  End time
                </label>
                <select
                  className="input-field w-full"
                  value={merged.endTime}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, endTime: e.target.value }))
                  }
                >
                  {TIME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Advance notice required (hours)
              </label>
              <input
                type="number"
                min={0}
                max={168}
                className="input-field w-32"
                value={merged.advanceNoticeHours}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    advanceNoticeHours: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={patch.isPending}
            className="btn-primary w-full"
          >
            {patch.isPending ? "Saving…" : hasChanges ? "Save Changes" : "Saved"}
          </button>
          {patch.isSuccess && !hasChanges && (
            <p className="text-center text-sm text-green-600">Settings saved.</p>
          )}
        </div>

        {/* ── Right column: preview + embed code ── */}
        <div className="space-y-5">
          {/* Live preview */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Widget Preview</h3>
            <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl overflow-hidden"
              style={{ height: 280 }}>
              {/* Simulated webpage */}
              <div className="absolute inset-0 p-5">
                <div className="w-24 h-3 bg-gray-300 rounded mb-3" />
                <div className="w-40 h-3 bg-gray-200 rounded mb-2" />
                <div className="w-32 h-3 bg-gray-200 rounded mb-2" />
                <div className="w-36 h-3 bg-gray-200 rounded" />
              </div>
              {/* "Book Now" button preview */}
              <div className="absolute bottom-4 right-4">
                <div
                  className="rounded-full px-4 py-2 text-white text-sm font-semibold shadow-lg select-none"
                  style={{ backgroundColor: merged.accentColor }}
                >
                  Book Now
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              The "Book Now" button floats in the bottom-right of your website
            </p>
          </div>

          {/* Embed code */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Embed Code</h3>
            <p className="text-sm text-gray-500 mb-4">
              Paste this tag before the{" "}
              <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">&lt;/body&gt;</code>{" "}
              of every page on your website.
            </p>

            {!merged.enabled ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                Enable the widget above to get your embed code.
              </div>
            ) : embedData ? (
              <div>
                <div className="relative">
                  <code className="block bg-gray-900 text-green-400 rounded-lg p-4 text-xs font-mono break-all pr-10 leading-relaxed">
                    {embedData.scriptTag}
                  </code>
                  <button
                    onClick={copyEmbed}
                    className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Business ID: <span className="font-mono">{embedData.businessId}</span>
                </p>
              </div>
            ) : (
              <div className="text-sm text-gray-400">Loading embed code…</div>
            )}
          </div>

          {/* How it works */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">How It Works</h3>
            <ol className="space-y-2 text-sm text-gray-600">
              {[
                "Paste the embed code on your website",
                "A Book Now button appears for visitors",
                "Customers choose a service, date, and time",
                "You receive an email notification instantly",
                "New customer records are created automatically",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-semibold"
                    style={{ backgroundColor: merged.accentColor }}
                  >
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingWidgetPage() {
  return (
    <ProGate feature="Booking Widget">
      <div className="page-container">
        <PageHeader
          title="Booking Widget"
          subtitle="Let customers book directly from your website — no account needed"
        />
        <BookingWidgetInner />
      </div>
    </ProGate>
  );
}
