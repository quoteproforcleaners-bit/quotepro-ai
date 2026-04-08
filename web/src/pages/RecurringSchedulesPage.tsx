import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Repeat,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Trash2,
  Pause,
  Play,
  CreditCard,
  User,
  Clock,
  DollarSign,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import { PageHeader, Card, Button } from "../components/ui";

// ─── Types ─────────────────────────────────────────────────────────────────

interface RecurringSchedule {
  id: string;
  customerId: string | null;
  customerName: string;
  frequency: string;
  intervalValue: number;
  intervalUnit: string;
  arrivalTime: string;
  durationHours: number;
  defaultPrice: number | null;
  internalNotes: string;
  status: string;
  autoCharge: boolean;
  stripePaymentMethodId: string | null;
  startDate: string;
  nextJobDate?: string;
  createdAt: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatFrequency(s: RecurringSchedule): string {
  if (s.frequency === "weekly")   return "Weekly";
  if (s.frequency === "biweekly") return "Every 2 weeks";
  if (s.frequency === "monthly")  return "Monthly";
  if (s.frequency === "custom")   return `Every ${s.intervalValue} ${s.intervalUnit}`;
  return s.frequency;
}

function formatMoney(val: number | null | undefined): string {
  if (val == null) return "—";
  return "$" + val.toFixed(0);
}

// ─── Slide-over Form ────────────────────────────────────────────────────────

function ScheduleForm({
  initial,
  customers,
  onClose,
  onSaved,
}: {
  initial?: RecurringSchedule;
  customers: Customer[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const qc = useQueryClient();

  const [customerId, setCustomerId]           = useState(initial?.customerId || "");
  const [customerSearch, setCustomerSearch]   = useState(initial?.customerName || "");
  const [frequency, setFrequency]             = useState(initial?.frequency || "weekly");
  const [dayOfWeek, setDayOfWeek]             = useState<number | "">("");
  const [timeOfDay, setTimeOfDay]             = useState(initial?.arrivalTime || "09:00");
  const [durationHours, setDurationHours]     = useState(String(initial?.durationHours || 3));
  const [price, setPrice]                     = useState(
    initial?.defaultPrice != null ? String(Math.round(initial.defaultPrice * 100)) : ""
  );
  const [customIntervalDays, setCustomInterval] = useState("7");
  const [notes, setNotes]                     = useState(initial?.internalNotes || "");
  const [autoCharge, setAutoCharge]           = useState(initial?.autoCharge || false);
  const [error, setError]                     = useState("");

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 8);
    const q = customerSearch.toLowerCase();
    return customers
      .filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [customers, customerSearch]);

  const [showCustomerList, setShowCustomerList] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("POST", "/api/recurring-schedules", data).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/recurring-schedules"] }); onSaved(); },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PATCH", `/api/recurring-schedules/${initial!.id}`, data).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/recurring-schedules"] }); onSaved(); },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!frequency) { setError("Please select a frequency."); return; }
    const priceNum = price ? parseInt(price) : undefined;

    const today = new Date().toISOString().slice(0, 10);

    if (isEdit) {
      updateMutation.mutate({
        frequency,
        dayOfWeek: dayOfWeek !== "" ? dayOfWeek : undefined,
        timeOfDay,
        durationHours: parseFloat(durationHours) || 3,
        price: priceNum,
        notes,
        autoCharge,
        active: true,
      });
    } else {
      createMutation.mutate({
        customerId: customerId || undefined,
        frequency,
        customIntervalDays: frequency === "custom" ? parseInt(customIntervalDays) : undefined,
        dayOfWeek: dayOfWeek !== "" ? dayOfWeek : undefined,
        timeOfDay,
        durationHours: parseFloat(durationHours) || 3,
        price: priceNum,
        notes,
        autoCharge,
        startDate: today,
      });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutErr = (createMutation.error || updateMutation.error) as any;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">
            {isEdit ? "Edit Schedule" : "New Recurring Schedule"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 px-6 py-6 space-y-5">
          {/* Customer */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Customer (optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Search customers..."
                  value={customerSearch}
                  onChange={e => { setCustomerSearch(e.target.value); setShowCustomerList(true); setCustomerId(""); }}
                  onFocus={() => setShowCustomerList(true)}
                />
                {showCustomerList && filteredCustomers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-44 overflow-y-auto mt-1">
                    {filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0"
                        onClick={() => {
                          setCustomerId(c.id);
                          setCustomerSearch(`${c.firstName} ${c.lastName}`);
                          setShowCustomerList(false);
                        }}
                      >
                        <span className="font-medium">{c.firstName} {c.lastName}</span>
                        {c.phone ? <span className="text-slate-400 ml-2">{c.phone}</span> : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Frequency */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Frequency</label>
            <div className="grid grid-cols-4 gap-2">
              {(["weekly", "biweekly", "monthly", "custom"] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                    frequency === f
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-primary-300"
                  }`}
                >
                  {f === "biweekly" ? "Bi-weekly" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            {frequency === "custom" && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-slate-600">Every</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  className="w-20 border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                  value={customIntervalDays}
                  onChange={e => setCustomInterval(e.target.value)}
                />
                <span className="text-sm text-slate-600">days</span>
              </div>
            )}
          </div>

          {/* Day of week (for weekly/biweekly) */}
          {(frequency === "weekly" || frequency === "biweekly") && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Day of Week</label>
              <div className="grid grid-cols-7 gap-1">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDayOfWeek(dayOfWeek === i ? "" : i)}
                    className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      dayOfWeek === i
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-primary-300"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Time & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Arrival Time</label>
              <input
                type="time"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
                value={timeOfDay}
                onChange={e => setTimeOfDay(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Duration (hours)</label>
              <input
                type="number"
                min={0.5}
                max={12}
                step={0.5}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
                value={durationHours}
                onChange={e => setDurationHours(e.target.value)}
              />
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Price per visit (cents, e.g. 15000 = $150)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="number"
                min={0}
                step={1}
                className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-2.5 text-sm"
                placeholder="e.g. 15000 for $150"
                value={price}
                onChange={e => setPrice(e.target.value)}
              />
            </div>
            {price ? (
              <p className="text-xs text-slate-400 mt-1">${(parseInt(price) / 100).toFixed(2)} per visit</p>
            ) : null}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes (optional)</label>
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none"
              rows={3}
              placeholder="Access codes, special instructions..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Auto-charge toggle */}
          <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setAutoCharge(v => !v)}
              className={`mt-0.5 relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${autoCharge ? "bg-emerald-500" : "bg-slate-300"}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${autoCharge ? "left-6" : "left-1"}`} />
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-800">Auto-charge client</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically charge the saved payment method when each job is generated.
                {autoCharge && !isEdit ? " You can save a payment method after creating the schedule." : ""}
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {mutErr && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {mutErr.message || "Something went wrong. Please try again."}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit as any}
            disabled={isPending}
          >
            {isPending ? "Saving..." : isEdit ? "Save Changes" : "Create Schedule"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Card ───────────────────────────────────────────────────────────

function ScheduleCard({
  schedule,
  onEdit,
  onDelete,
  onTogglePause,
}: {
  schedule: RecurringSchedule;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePause: () => void;
}) {
  const isActive = schedule.status === "active";

  return (
    <div className={`bg-white rounded-xl border-2 p-5 transition-all hover:shadow-md ${isActive ? "border-slate-200" : "border-slate-100 opacity-70"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Repeat className="w-4 h-4 text-violet-600" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">
                {schedule.customerName || "No customer linked"}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}>
                  {isActive ? "Active" : "Paused"}
                </span>
                {schedule.autoCharge && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    Auto-charge
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="flex items-center gap-1.5 text-sm text-slate-600">
              <Repeat className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatFrequency(schedule)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{schedule.arrivalTime} · {schedule.durationHours}h</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatMoney(schedule.defaultPrice)}</span>
            </div>
          </div>

          {schedule.internalNotes && (
            <p className="mt-2 text-xs text-slate-500 truncate">{schedule.internalNotes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button
            onClick={onEdit}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onTogglePause}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1"
          >
            {isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isActive ? "Pause" : "Resume"}
          </button>
          <button
            onClick={onDelete}
            className="text-xs font-medium text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RecurringSchedulesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showForm, setShowForm]           = useState(false);
  const [editTarget, setEditTarget]       = useState<RecurringSchedule | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: schedules = [], isLoading } = useQuery<RecurringSchedule[]>({
    queryKey: ["/api/recurring-schedules"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/recurring-schedules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/recurring-schedules"] });
      setConfirmDelete(null);
    },
  });

  const pauseMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiRequest("PATCH", `/api/recurring-schedules/${id}`, { active }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/recurring-schedules"] }),
  });

  const active   = schedules.filter(s => s.status === "active");
  const inactive = schedules.filter(s => s.status !== "active");

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Recurring Schedules"
        subtitle="Set up repeating cleans that auto-generate jobs and optionally bill clients automatically."
        actions={
          <Button
            onClick={() => { setEditTarget(null); setShowForm(true); }}
            icon={Plus}
          >
            New Recurring Schedule
          </Button>
        }
      />

      {/* Stats bar */}
      {schedules.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Active", value: active.length, color: "text-emerald-600" },
            { label: "Paused", value: inactive.length, color: "text-slate-400" },
            {
              label: "Monthly Recurring",
              value: active.reduce((s, r) => {
                if (!r.defaultPrice) return s;
                const perMonth = r.frequency === "weekly" ? 4 : r.frequency === "biweekly" ? 2 : 1;
                return s + r.defaultPrice * perMonth;
              }, 0),
              format: (v: number) => `$${v.toFixed(0)}`,
              color: "text-primary-600",
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>
                {typeof stat.value === "number" && (stat as any).format
                  ? (stat as any).format(stat.value)
                  : stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && schedules.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
            <Repeat className="w-8 h-8 text-violet-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No recurring schedules yet</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm">
            Set up repeating cleans for your regular clients. Jobs are generated automatically so you never miss a booking.
          </p>
          <Button onClick={() => setShowForm(true)} icon={Plus}>
            Create your first schedule
          </Button>
        </div>
      )}

      {/* Active schedules */}
      {active.length > 0 && (
        <div className="space-y-3 mb-6">
          {active.map(s => (
            <ScheduleCard
              key={s.id}
              schedule={s}
              onEdit={() => { setEditTarget(s); setShowForm(true); }}
              onDelete={() => setConfirmDelete(s.id)}
              onTogglePause={() => pauseMutation.mutate({ id: s.id, active: false })}
            />
          ))}
        </div>
      )}

      {/* Paused/cancelled schedules */}
      {inactive.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Paused</p>
          <div className="space-y-3">
            {inactive.map(s => (
              <ScheduleCard
                key={s.id}
                schedule={s}
                onEdit={() => { setEditTarget(s); setShowForm(true); }}
                onDelete={() => setConfirmDelete(s.id)}
                onTogglePause={() => pauseMutation.mutate({ id: s.id, active: true })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Slide-over form */}
      {showForm && (
        <ScheduleForm
          initial={editTarget || undefined}
          customers={customers}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          onSaved={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80">
            <h3 className="text-base font-bold text-slate-900 mb-2">Cancel recurring schedule?</h3>
            <p className="text-sm text-slate-500 mb-5">
              This will cancel the schedule and all future unstarted jobs. Completed jobs are not affected.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(null)}>
                Keep it
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() => deleteMutation.mutate(confirmDelete)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Cancelling..." : "Cancel Schedule"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
