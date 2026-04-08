import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  Plus,
  Pencil,
  ToggleLeft,
  Phone,
  Clock,
  FileText,
  Briefcase,
  Users,
  Star,
  X,
  Check,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import { PageHeader, Button, Card } from "../components/ui";
import { useSubscription } from "../lib/subscription";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Location {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  active: boolean;
  is_primary: boolean;
  quote_count: string;
  job_count: string;
  customer_count: string;
  created_at: string;
}

interface LocationForm {
  name: string;
  address: string;
  phone: string;
  timezone: string;
}

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];

const EMPTY_FORM: LocationForm = {
  name: "",
  address: "",
  phone: "",
  timezone: "America/New_York",
};

// ─── Location Form Modal ──────────────────────────────────────────────────────

function LocationModal({
  location,
  onClose,
  onSave,
  isSaving,
}: {
  location: Location | null;
  onClose: () => void;
  onSave: (data: LocationForm) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<LocationForm>(
    location
      ? {
          name: location.name,
          address: location.address ?? "",
          phone: location.phone ?? "",
          timezone: location.timezone,
        }
      : EMPTY_FORM
  );

  function set(key: keyof LocationForm, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">
            {location ? "Edit Location" : "New Location"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Location Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Philadelphia Main Line"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="123 Main St, Philadelphia, PA"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="(215) 555-0100"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Timezone</label>
            <select
              value={form.timezone}
              onChange={(e) => set("timezone", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace("America/", "").replace("Pacific/", "Pacific/")}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={isSaving || !form.name.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {isSaving ? "Saving…" : location ? "Save Changes" : "Create Location"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Location Card ────────────────────────────────────────────────────────────

function LocationCard({
  location,
  onEdit,
  onDeactivate,
  onSwitch,
  isActive,
}: {
  location: Location;
  onEdit: () => void;
  onDeactivate: () => void;
  onSwitch: () => void;
  isActive: boolean;
}) {
  return (
    <Card className={`p-5 transition-all ${isActive ? "ring-2 ring-primary-500" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-base font-bold text-slate-900 truncate">{location.name}</h3>
            {location.is_primary && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                <Star className="w-3 h-3" /> Primary
              </span>
            )}
            {isActive && (
              <span className="px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">
                Active
              </span>
            )}
            {!location.active && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
                Inactive
              </span>
            )}
          </div>
          <div className="space-y-1 text-sm text-slate-500">
            {location.address && (
              <p className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                {location.address}
              </p>
            )}
            {location.phone && (
              <p className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                {location.phone}
              </p>
            )}
            <p className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {location.timezone}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isActive && location.active && (
            <button
              onClick={onSwitch}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700"
            >
              Switch
            </button>
          )}
          <button
            onClick={onEdit}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {!location.is_primary && location.active && (
            <button
              onClick={onDeactivate}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
              title="Deactivate"
            >
              <ToggleLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-5">
        <Stat icon={FileText} label="Quotes" value={location.quote_count} />
        <Stat icon={Briefcase} label="Jobs" value={location.job_count} />
        <Stat icon={Users} label="Customers" value={location.customer_count} />
      </div>
    </Card>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-600">
      <Icon className="w-3.5 h-3.5 text-slate-400" />
      <span className="font-semibold text-slate-900">{value}</span>
      <span className="text-slate-400">{label}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LocationsPage() {
  const { isPro, isGrowth, startCheckout } = useSubscription();
  const isEnabled = isPro; // Multi-location is a Pro feature
  const qc = useQueryClient();

  const [modal, setModal] = useState<"new" | Location | null>(null);

  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
    queryFn: async () => {
      const res = await fetch("/api/locations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 30000,
  });

  const { data: userData } = useQuery<{ activeLocationId: string | null }>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const d = await res.json();
      return { activeLocationId: d.activeLocationId ?? null };
    },
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data: LocationForm) =>
      apiRequest("POST", "/api/locations", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/locations"] });
      setModal(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: LocationForm }) =>
      apiRequest("PATCH", `/api/locations/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/locations"] });
      setModal(null);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/locations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/locations"] }),
  });

  const switchMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/locations/${id}/switch`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/locations"] });
      qc.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  function handleSave(data: LocationForm) {
    if (!data.name.trim()) return;
    if (modal === "new") {
      createMutation.mutate(data);
    } else if (modal && typeof modal === "object") {
      updateMutation.mutate({ id: modal.id, data });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Upgrade gate ─────────────────────────────────────────────────────────────
  if (!isEnabled) {
    return (
      <div className="max-w-2xl mx-auto">
        <PageHeader
          title="Locations"
          subtitle="Manage multiple service areas from one account"
        />
        <Card className="p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-7 h-7 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Multi-Location Support</h2>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
            Manage multiple service areas, assign cleaners by location, and track revenue
            per location — built for cleaning businesses that are growing beyond one market.
          </p>
          <ul className="text-sm text-slate-600 text-left max-w-xs mx-auto mb-6 space-y-2">
            {[
              "Add unlimited service locations",
              "Switch active location from anywhere",
              "Per-location quote, job & customer tracking",
              "Foundation for franchise-level operations",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary-600 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => startCheckout("pro", "monthly")}
          >
            Upgrade to Pro
          </Button>
          {locations.length > 0 && (
            <p className="mt-4 text-xs text-slate-400">
              You currently have {locations.length} location{locations.length !== 1 ? "s" : ""} configured.
            </p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Locations"
        subtitle="Manage your service areas"
        actions={
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setModal("new")}
          >
            Add Location
          </Button>
        }
      />

      {isLoading ? (
        <div className="text-center py-10 text-slate-400">Loading locations…</div>
      ) : locations.length === 0 ? (
        <Card className="p-8 text-center">
          <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No locations found. Add your first one above.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {locations.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              isActive={loc.id === userData?.activeLocationId}
              onEdit={() => setModal(loc)}
              onDeactivate={() => deactivateMutation.mutate(loc.id)}
              onSwitch={() => switchMutation.mutate(loc.id)}
            />
          ))}
        </div>
      )}

      {modal !== null && (
        <LocationModal
          location={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
