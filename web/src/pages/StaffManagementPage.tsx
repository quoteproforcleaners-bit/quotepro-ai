import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  X,
  Clock,
  CheckCircle2,
  QrCode,
  Eye,
  EyeOff,
  Pencil,
  UserX,
  Copy,
  Check,
} from "lucide-react";
import QRCode from "qrcode";
import { apiRequest } from "../lib/api";
import { PageHeader, Button } from "../components/ui";
import { useAuth } from "../lib/auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  hasPin: boolean;
  todayJobCount: number;
  lastClockEvent: { event_type: string; created_at: string } | null;
  createdAt: string;
}

interface StaffForm {
  name: string;
  email: string;
  phone: string;
  pin: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(dt: string): string {
  const diff = Date.now() - new Date(dt).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return new Date(dt).toLocaleDateString();
}

// ─── QR Code Modal ────────────────────────────────────────────────────────────

function QRModal({ businessId, onClose }: { businessId: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, businessId, {
        width: 220,
        margin: 2,
        color: { dark: "#1e293b", light: "#ffffff" },
      });
    }
  }, [businessId]);

  function copy() {
    navigator.clipboard.writeText(businessId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-80 flex flex-col items-center">
        <div className="flex items-center justify-between w-full mb-4">
          <p className="font-bold text-slate-900">Staff Login QR Code</p>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <canvas ref={canvasRef} className="rounded-xl border border-slate-200" />

        <p className="text-xs text-slate-500 text-center mt-3 mb-4">
          Have cleaners scan this QR code in the mobile app to auto-fill your Business ID.
        </p>

        <div className="w-full bg-slate-50 rounded-lg px-3 py-2 flex items-center gap-2 border border-slate-200">
          <p className="text-xs font-mono text-slate-600 flex-1 truncate">{businessId}</p>
          <button
            onClick={copy}
            className="text-slate-400 hover:text-slate-700 flex-shrink-0"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Staff Form Slide-over ────────────────────────────────────────────────────

function StaffForm({
  initial,
  onClose,
  onSaved,
}: {
  initial?: StaffMember;
  onClose: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!initial;
  const [form, setForm] = useState<StaffForm>({
    name: initial?.name || "",
    email: initial?.email || "",
    phone: initial?.phone || "",
    pin: "",
  });
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit
        ? apiRequest("PATCH", `/api/staff/${initial!.id}`, data).then(r => r.json())
        : apiRequest("POST", "/api/staff", data).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/staff"] });
      onSaved();
    },
    onError: (err: any) => setError(err.message || "Failed to save"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (!isEdit && (!form.pin || form.pin.length < 4)) {
      setError("PIN must be at least 4 digits"); return;
    }
    const payload: any = { name: form.name, email: form.email, phone: form.phone };
    if (form.pin) payload.pin = form.pin;
    mutation.mutate(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">
            {isEdit ? "Edit Staff Member" : "Add Staff Member"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name *</label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g. Maria Lopez"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="maria@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone</label>
            <input
              type="tel"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="+1 (555) 000-0000"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              {isEdit ? "New PIN (leave blank to keep current)" : "Login PIN * (4+ digits)"}
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm pr-10 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={isEdit ? "Enter new PIN to change" : "e.g. 4892"}
                inputMode="numeric"
                value={form.pin}
                onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPin(v => !v)}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Staff uses the Business ID + this PIN to log in on their phone.
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSubmit as any} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Staff Member"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Staff Card ───────────────────────────────────────────────────────────────

function StaffCard({
  staff,
  onEdit,
  onDeactivate,
}: {
  staff: StaffMember;
  onEdit: () => void;
  onDeactivate: () => void;
}) {
  const clockedIn = staff.lastClockEvent?.event_type === "clock_in";

  return (
    <div className={`bg-white rounded-xl border-2 p-5 transition-all hover:shadow-sm ${staff.isActive ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${staff.isActive ? "bg-emerald-500" : "bg-slate-400"}`}>
            {staff.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-slate-900">{staff.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {staff.email && <p className="text-xs text-slate-500">{staff.email}</p>}
              {!staff.isActive && (
                <span className="text-xs font-semibold text-slate-400">Deactivated</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {staff.isActive && (
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDeactivate}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600"
              title="Deactivate"
            >
              <UserX className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${clockedIn ? "bg-emerald-500" : "bg-slate-300"}`} />
          <span className="text-xs font-medium text-slate-600">
            {clockedIn ? "Clocked In" : "Off Clock"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-600">{staff.todayJobCount} jobs today</span>
        </div>
        {staff.lastClockEvent && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-600">{formatRelativeTime(staff.lastClockEvent.created_at)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StaffManagementPage() {
  const qc = useQueryClient();
  const { business } = useAuth();

  const [showForm, setShowForm]           = useState(false);
  const [editTarget, setEditTarget]       = useState<StaffMember | null>(null);
  const [showQR, setShowQR]               = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);

  const { data: staff = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff"],
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/staff/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/staff"] });
      setConfirmDeactivate(null);
    },
  });

  const active   = staff.filter(s => s.isActive);
  const inactive = staff.filter(s => !s.isActive);

  const businessId = business?.id || "";

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Staff Management"
        subtitle="Add cleaners, manage their PINs, and track who's clocked in today."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowQR(true)}
              icon={<QrCode className="w-4 h-4" />}
            >
              Business QR Code
            </Button>
            <Button
              onClick={() => { setEditTarget(null); setShowForm(true); }}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Staff Member
            </Button>
          </div>
        }
      />

      {/* Business ID display */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <QrCode className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-700">Business ID for Staff Login</p>
          <p className="text-xs font-mono text-slate-500 mt-0.5 break-all">{businessId}</p>
          <p className="text-xs text-slate-400 mt-1">
            Share this ID or the QR code with cleaners so they can log in on their phone.
          </p>
        </div>
      </div>

      {/* Stats */}
      {staff.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Active Staff", value: active.length, color: "text-emerald-600" },
            { label: "Clocked In Now", value: active.filter(s => s.lastClockEvent?.event_type === "clock_in").length, color: "text-blue-600" },
            { label: "Jobs Today", value: active.reduce((t, s) => t + s.todayJobCount, 0), color: "text-violet-600" },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && staff.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No staff added yet</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm">
            Add your cleaners so they can log in to the mobile app, clock in/out, and complete jobs.
          </p>
          <Button onClick={() => setShowForm(true)} icon={<Plus className="w-4 h-4" />}>
            Add your first cleaner
          </Button>
        </div>
      )}

      {/* Active staff */}
      {active.length > 0 && (
        <div className="space-y-3 mb-6">
          {active.map(s => (
            <StaffCard
              key={s.id}
              staff={s}
              onEdit={() => { setEditTarget(s); setShowForm(true); }}
              onDeactivate={() => setConfirmDeactivate(s.id)}
            />
          ))}
        </div>
      )}

      {/* Inactive */}
      {inactive.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Deactivated</p>
          <div className="space-y-3">
            {inactive.map(s => (
              <StaffCard
                key={s.id}
                staff={s}
                onEdit={() => { setEditTarget(s); setShowForm(true); }}
                onDeactivate={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {/* Form slide-over */}
      {showForm && (
        <StaffForm
          initial={editTarget || undefined}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          onSaved={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {/* QR modal */}
      {showQR && businessId && (
        <QRModal businessId={businessId} onClose={() => setShowQR(false)} />
      )}

      {/* Deactivate confirm */}
      {confirmDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80">
            <h3 className="text-base font-bold text-slate-900 mb-2">Deactivate staff member?</h3>
            <p className="text-sm text-slate-500 mb-5">
              They won't be able to log in to the mobile app anymore. You can reactivate them later.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmDeactivate(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() => deactivateMutation.mutate(confirmDeactivate)}
                disabled={deactivateMutation.isPending}
              >
                {deactivateMutation.isPending ? "Deactivating..." : "Deactivate"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
