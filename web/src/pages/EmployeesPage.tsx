import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Phone, Mail, Tag, Users, ExternalLink, Eye, EyeOff, ToggleLeft, ToggleRight } from "lucide-react";
import { apiGet, apiPost, apiPatch } from "../lib/api";
import { Card, Button, Modal, Input, Toast, EmptyState, PageHeader } from "../components/ui";

const TEAL_PALETTE = [
  "#0F6E56", "#3b82f6", "#8b5cf6", "#ec4899",
  "#ef4444", "#f97316", "#eab308", "#14b8a6",
  "#06b6d4", "#64748b", "#1e293b", "#22c55e",
];

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

interface Employee {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  status: string;
  color: string;
  isActive: boolean;
  todayJobCount?: number;
}

const EMPTY_FORM = {
  name: "", phone: "", email: "", role: "", pin: "", color: "#0F6E56",
};

type FormShape = typeof EMPTY_FORM;

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<FormShape>(EMPTY_FORM);
  const [showPin, setShowPin] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info" } | null>(null);

  const portalUrl = `${window.location.origin}/employee/login`;

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/admin/employees"],
    queryFn: () => apiGet("/api/admin/employees"),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormShape) => apiPost("/api/admin/employees", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      setModal(false);
      setForm(EMPTY_FORM);
      setToast({ message: "Team member added and can now log in with their PIN", variant: "success" });
    },
    onError: (e: any) => setToast({ message: e?.message || "Failed to add team member", variant: "error" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<FormShape> & { id: string }) =>
      apiPatch(`/api/admin/employees/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      setModal(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      setToast({ message: "Team member updated", variant: "success" });
    },
    onError: (e: any) => setToast({ message: e?.message || "Failed to update", variant: "error" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (emp: Employee) =>
      apiPatch(`/api/admin/employees/${emp.id}`, { isActive: !emp.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
    },
    onError: (e: any) => setToast({ message: e?.message || "Failed to update status", variant: "error" }),
  });

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowPin(false);
    setModal(true);
  }

  function openEdit(emp: Employee) {
    setEditing(emp);
    setForm({ name: emp.name, phone: emp.phone || "", email: emp.email, role: emp.role || "", pin: "", color: emp.color || "#0F6E56" });
    setShowPin(false);
    setModal(true);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.email.trim()) return;
    if (!editing && !form.pin) {
      setToast({ message: "PIN is required for new team members", variant: "error" });
      return;
    }
    const payload: any = { name: form.name, email: form.email, phone: form.phone, role: form.role, color: form.color };
    if (form.pin) payload.pin = form.pin;

    if (editing) {
      updateMutation.mutate({ ...payload, id: editing.id });
    } else {
      createMutation.mutate(payload);
    }
  }

  const active = employees.filter(e => e.isActive !== false && e.status !== "inactive");
  const inactive = employees.filter(e => e.isActive === false || e.status === "inactive");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Team Members"
        subtitle={`${active.length} active${inactive.length > 0 ? `, ${inactive.length} inactive` : ""}`}
        actions={
          <Button icon={Plus} onClick={openAdd} size="sm">
            Add Team Member
          </Button>
        }
      />

      {/* Employee portal link */}
      <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-emerald-800">Employee Portal: </span>
          <span className="text-emerald-700 truncate font-mono text-xs">{portalUrl}</span>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(portalUrl); setToast({ message: "Portal link copied", variant: "success" }); }}
          className="shrink-0 text-xs font-semibold text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 transition-colors"
        >
          Copy
        </button>
        <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-emerald-600 hover:text-emerald-800">
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Add your cleaners so they can log in to the Employee Portal with their PIN and check in/out of jobs."
          action={<Button icon={Plus} onClick={openAdd}>Add Team Member</Button>}
        />
      ) : (
        <div className="space-y-3">
          {employees.map(emp => {
            const isInactive = emp.isActive === false || emp.status === "inactive";
            return (
              <Card key={emp.id} className={isInactive ? "opacity-60" : ""}>
                <div className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ backgroundColor: emp.color || "#0F6E56" }}
                  >
                    {initials(emp.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-semibold text-slate-900 text-sm">{emp.name}</p>
                      {isInactive && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inactive</span>
                      )}
                      {emp.todayJobCount !== undefined && emp.todayJobCount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                          {emp.todayJobCount} job{emp.todayJobCount !== 1 ? "s" : ""} today
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {emp.role && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />{emp.role}
                        </span>
                      )}
                      {emp.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />{emp.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />{emp.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleActiveMutation.mutate(emp)}
                      className={`p-2 rounded-lg transition-colors ${isInactive ? "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" : "text-emerald-600 hover:text-slate-500 hover:bg-slate-100"}`}
                      title={isInactive ? "Activate" : "Deactivate"}
                    >
                      {isInactive ? <ToggleLeft className="w-5 h-5" /> : <ToggleRight className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => openEdit(emp)}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal
        open={modal}
        onClose={() => { setModal(false); setEditing(null); setForm(EMPTY_FORM); }}
        title={editing ? "Edit Team Member" : "Add Team Member"}
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Full Name *"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Sarah Johnson"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="(484) 555-1212"
              type="tel"
            />
            <Input
              label="Email *"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="sarah@company.com"
              type="email"
              disabled={!!editing}
            />
          </div>
          <Input
            label="Role / Title"
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            placeholder="Lead Cleaner"
          />

          {/* PIN field */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              {editing ? "New PIN (leave blank to keep current)" : "Login PIN * (4–6 digits)"}
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={form.pin}
                onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, "") }))}
                placeholder={editing ? "Enter new PIN to change" : "e.g. 4892"}
                className="w-full px-3 py-2 pr-10 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 font-mono tracking-widest"
              />
              <button
                type="button"
                onClick={() => setShowPin(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Employee uses their email + this PIN to log in on their phone.</p>
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Avatar Color</label>
            <div className="flex flex-wrap gap-2">
              {TEAL_PALETTE.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full transition-all ${form.color === c ? "ring-2 ring-offset-2 ring-primary-500 scale-110" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSubmit}
              loading={createMutation.isPending || updateMutation.isPending}
              disabled={!form.name.trim() || !form.email.trim()}
              className="flex-1"
            >
              {editing ? "Save Changes" : "Add Team Member"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setModal(false); setEditing(null); setForm(EMPTY_FORM); }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {toast ? (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      ) : null}
    </div>
  );
}
