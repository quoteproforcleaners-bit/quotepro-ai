import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Phone, Mail, Tag, Users } from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";
import { Card, Button, Modal, Input, Toast, EmptyState, PageHeader } from "../components/ui";

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4", "#64748b", "#1e293b",
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
  notes: string;
  color: string;
}

const EMPTY_FORM = { name: "", phone: "", email: "", role: "", status: "active", notes: "", color: "#6366f1" };

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info" } | null>(null);

  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    queryFn: () => apiGet("/api/employees"),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) => apiPost("/api/employees", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setModal(false);
      setForm(EMPTY_FORM);
      setToast({ message: "Team member added", variant: "success" });
    },
    onError: (e: any) => setToast({ message: e?.message || "Failed to add", variant: "error" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof EMPTY_FORM & { id: string }) =>
      apiPut(`/api/employees/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setModal(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      setToast({ message: "Team member updated", variant: "success" });
    },
    onError: (e: any) => setToast({ message: e?.message || "Failed to update", variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/employees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setDeleteTarget(null);
      setToast({ message: "Team member removed", variant: "success" });
    },
    onError: (e: any) => setToast({ message: e?.message || "Failed to delete", variant: "error" }),
  });

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModal(true);
  }

  function openEdit(emp: Employee) {
    setEditing(emp);
    setForm({ name: emp.name, phone: emp.phone, email: emp.email, role: emp.role, status: emp.status, notes: emp.notes, color: emp.color });
    setModal(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) return;
    if (editing) {
      updateMutation.mutate({ ...form, id: editing.id });
    } else {
      createMutation.mutate(form);
    }
  }

  const activeCount = employees.filter(e => e.status === "active").length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Team Members"
        subtitle={`${activeCount} active${employees.length > activeCount ? `, ${employees.length - activeCount} inactive` : ""}`}
        actions={
          <Button icon={Plus} onClick={openAdd} size="sm">
            Add Team Member
          </Button>
        }
      />

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
          description="Add your cleaners and staff so you can quickly dispatch jobs and assign work."
          action={<Button icon={Plus} onClick={openAdd}>Add Team Member</Button>}
        />
      ) : (
        <div className="space-y-3">
          {employees.map(emp => (
            <Card key={emp.id}>
              <div className="flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: emp.color }}
                >
                  {initials(emp.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-slate-900 text-sm">{emp.name}</p>
                    {emp.status === "inactive" ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inactive</span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {emp.role ? (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />{emp.role}
                      </span>
                    ) : null}
                    {emp.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />{emp.phone}
                      </span>
                    ) : null}
                    {emp.email ? (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />{emp.email}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Mail className="w-3 h-3" />No email — SMS only
                      </span>
                    )}
                  </div>
                  {emp.notes ? (
                    <p className="text-xs text-slate-400 mt-1 truncate">{emp.notes}</p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(emp)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(emp)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
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
              label="Email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="sarah@company.com"
              type="email"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Role"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              placeholder="Lead Cleaner"
            />
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <Input
            label="Notes"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Any notes about this team member..."
          />
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
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
              disabled={!form.name.trim()}
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

      {/* Delete confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove Team Member"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Remove <strong>{deleteTarget?.name}</strong> from your team? This won't affect existing job records.
          </p>
          <div className="flex gap-3">
            <Button
              variant="danger"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              loading={deleteMutation.isPending}
              className="flex-1"
            >
              Remove
            </Button>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="flex-1">
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
