import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, X, RotateCw, ShieldOff, ShieldCheck, Mail, Clock } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete } from "../lib/api";
import { PageHeader, Card, Button, Modal, Input, Select, Toast } from "../components/ui";

type Role = "owner" | "admin" | "manager" | "estimator" | "cleaner";
type Status = "pending" | "active" | "disabled";

interface Member {
  userId: string;
  role: Role;
  status: Status;
  email: string;
  name: string | null;
  invitedAt: string | null;
  acceptedAt: string | null;
  lastActiveAt: string | null;
}

interface Invitation {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  createdAt: string;
}

interface MembersResponse {
  members: Member[];
  callerRole: Role;
}

const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  estimator: "Estimator",
  cleaner: "Cleaner",
};

const ROLE_DESC: Record<Role, string> = {
  owner: "Full access. Billing, integrations, ownership transfer.",
  admin: "Everything except billing, ownership, and managing other admins.",
  manager: "Quotes, customers, reports, pricing settings.",
  estimator: "Create/send quotes; sees only their own quotes & customers.",
  cleaner: "Field staff — assigned jobs only. No pricing visible.",
};

const ROLE_PILL: Record<Role, string> = {
  owner: "bg-amber-100 text-amber-800 border-amber-200",
  admin: "bg-violet-100 text-violet-800 border-violet-200",
  manager: "bg-blue-100 text-blue-800 border-blue-200",
  estimator: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cleaner: "bg-slate-100 text-slate-700 border-slate-200",
};

function rolesAssignableBy(callerRole: Role): Role[] {
  if (callerRole === "owner") return ["admin", "manager", "estimator", "cleaner"];
  if (callerRole === "admin") return ["manager", "estimator", "cleaner"];
  return [];
}

function canModify(callerRole: Role, targetRole: Role): boolean {
  if (callerRole === "owner") return targetRole !== "owner";
  if (callerRole === "admin") {
    return targetRole === "manager" || targetRole === "estimator" || targetRole === "cleaner";
  }
  return false;
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86400000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (h < 1) return `${m}m ago`;
  if (d < 1) return `${h}h ago`;
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function TeamPage() {
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info" } | null>(null);

  const membersQ = useQuery<MembersResponse>({
    queryKey: ["/api/team/members"],
    queryFn: () => apiGet("/api/team/members"),
  });
  const invitesQ = useQuery<{ invitations: Invitation[] }>({
    queryKey: ["/api/team/invitations"],
    queryFn: () => apiGet("/api/team/invitations"),
  });

  const callerRole: Role = membersQ.data?.callerRole ?? "cleaner";
  const canInvite = callerRole === "owner" || callerRole === "admin";

  const changeRoleMut = useMutation({
    mutationFn: (vars: { userId: string; role: Role }) =>
      apiPatch(`/api/team/members/${vars.userId}`, { role: vars.role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/team/members"] });
      setToast({ message: "Role updated", variant: "success" });
    },
    onError: (e: any) => setToast({ message: e?.message || "Failed to update role", variant: "error" }),
  });

  const setStatusMut = useMutation({
    mutationFn: (vars: { userId: string; status: "active" | "disabled" }) =>
      apiPatch(`/api/team/members/${vars.userId}`, { status: vars.status }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/team/members"] });
      setToast({
        message: vars.status === "disabled" ? "Member disabled" : "Member re-enabled",
        variant: "success",
      });
    },
    onError: (e: any) => setToast({ message: e?.message || "Failed", variant: "error" }),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/team/invitations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/team/invitations"] });
      setToast({ message: "Invitation revoked", variant: "success" });
    },
    onError: (e: any) => setToast({ message: e?.message || "Failed", variant: "error" }),
  });

  const resendMut = useMutation({
    mutationFn: (id: string) => apiPost(`/api/team/invitations/${id}/resend`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/team/invitations"] });
      setToast({ message: "Invitation resent", variant: "success" });
    },
    onError: (e: any) => setToast({ message: e?.message || "Failed", variant: "error" }),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team"
        subtitle="Invite teammates and assign roles. Each role gets a sensible permission set — no custom configuration."
        actions={
          canInvite ? (
            <Button onClick={() => setInviteOpen(true)} icon={UserPlus}>
              Invite member
            </Button>
          ) : undefined
        }
      />

      {/* Members */}
      <Card padding={false}>
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-base font-semibold text-slate-900">Members</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            People with access to this QuotePro account.
          </p>
        </div>
        {membersQ.isLoading ? (
          <div className="p-6 text-sm text-slate-500">Loading…</div>
        ) : (membersQ.data?.members?.length ?? 0) === 0 ? (
          <div className="p-6 text-sm text-slate-500">No members yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {membersQ.data!.members.map((m) => {
              const editable = canModify(callerRole, m.role);
              const assignable = rolesAssignableBy(callerRole);
              const roleOptions = assignable.includes(m.role)
                ? assignable
                : [m.role, ...assignable];
              return (
                <div key={m.userId} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 truncate">
                        {m.name?.trim() || m.email}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded border ${ROLE_PILL[m.role]}`}>
                        {ROLE_LABEL[m.role]}
                      </span>
                      {m.status === "disabled" ? (
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-600 border border-slate-200">
                          Disabled
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                      {m.email} · last active {fmtRelative(m.lastActiveAt)}
                    </div>
                  </div>

                  {editable ? (
                    <div className="flex items-center gap-2">
                      {m.status === "active" ? (
                        <Select
                          options={roleOptions.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
                          value={m.role}
                          onChange={(e) => {
                            const next = e.target.value as Role;
                            if (next !== m.role) changeRoleMut.mutate({ userId: m.userId, role: next });
                          }}
                          disabled={changeRoleMut.isPending}
                        />
                      ) : null}

                      {m.status === "active" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={ShieldOff}
                          onClick={() => {
                            if (confirm(`Disable ${m.email}? They'll lose access immediately. History is preserved.`)) {
                              setStatusMut.mutate({ userId: m.userId, status: "disabled" });
                            }
                          }}
                        >
                          Disable
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={ShieldCheck}
                          onClick={() => setStatusMut.mutate({ userId: m.userId, status: "active" })}
                        >
                          Re-enable
                        </Button>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Pending invitations */}
      {canInvite ? (
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">Pending invitations</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Invites that haven't been accepted yet. Expire after 7 days.
            </p>
          </div>
          {invitesQ.isLoading ? (
            <div className="p-6 text-sm text-slate-500">Loading…</div>
          ) : (invitesQ.data?.invitations.length ?? 0) === 0 ? (
            <div className="p-6 text-sm text-slate-500">No pending invitations.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {invitesQ.data!.invitations.map((inv) => (
                <div key={inv.id} className="px-6 py-4 flex items-center gap-4">
                  <Mail className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900 truncate">{inv.email}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded border ${ROLE_PILL[inv.role]}`}>
                        {ROLE_LABEL[inv.role]}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={RotateCw}
                    onClick={() => {
                      if (
                        confirm(
                          `Resend the invitation to ${inv.email}?\n\nThis generates a new link and invalidates any previous invitation email — the old link will stop working.`,
                        )
                      ) {
                        resendMut.mutate(inv.id);
                      }
                    }}
                    disabled={resendMut.isPending}
                  >
                    Resend
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={X}
                    onClick={() => {
                      if (confirm(`Revoke invitation for ${inv.email}?`)) revokeMut.mutate(inv.id);
                    }}
                    disabled={revokeMut.isPending}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {inviteOpen ? (
        <InviteModal
          callerRole={callerRole}
          onClose={() => setInviteOpen(false)}
          onSuccess={(email) => {
            setInviteOpen(false);
            qc.invalidateQueries({ queryKey: ["/api/team/invitations"] });
            setToast({ message: `Invitation sent to ${email}`, variant: "success" });
          }}
          onError={(msg) => setToast({ message: msg, variant: "error" })}
        />
      ) : null}

      {toast ? <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} /> : null}
    </div>
  );
}

// ─── Invite modal ────────────────────────────────────────────────────────────

function InviteModal({
  callerRole,
  onClose,
  onSuccess,
  onError,
}: {
  callerRole: Role;
  onClose: () => void;
  onSuccess: (email: string) => void;
  onError: (msg: string) => void;
}) {
  const assignable = rolesAssignableBy(callerRole);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(assignable[assignable.length - 1] || "cleaner");

  const sendMut = useMutation({
    mutationFn: () => apiPost("/api/team/invitations", { email: email.trim().toLowerCase(), role }),
    onSuccess: () => onSuccess(email.trim()),
    onError: (e: any) => onError(e?.message || "Failed to send invitation"),
  });

  return (
    <Modal open onClose={onClose} title="Invite a team member">
      <div className="space-y-4 p-6">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@example.com"
          autoFocus
        />
        <div>
          <Select
            label="Role"
            options={assignable.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          />
          <p className="text-xs text-slate-500 mt-1.5">{ROLE_DESC[role]}</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => sendMut.mutate()}
            disabled={sendMut.isPending || !email.trim()}
            loading={sendMut.isPending}
          >
            Send invitation
          </Button>
        </div>
      </div>
    </Modal>
  );
}
