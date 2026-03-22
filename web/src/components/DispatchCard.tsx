import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "../lib/api";
import {
  MapPin, Copy, Navigation, Phone, Mail, CheckCircle,
  ExternalLink, ClipboardList, Send, UserCheck,
  Users, AlertCircle,
} from "lucide-react";
import { Card, CardHeader, Button, Modal } from "./ui";

export interface DispatchData {
  customerName?: string;
  address?: string;
  serviceType?: string;
  scheduledDate?: string;
  startTime?: string;
  endTime?: string;
  total?: number;
  phone?: string;
  email?: string;
  notes?: string;
  customerId?: string;
  jobId?: string;
}

interface Employee {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  status: string;
  color: string;
}

type RecipientTab = "customer" | "employee" | "custom";
type Channel = "sms" | "email";

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatSmsText(d: DispatchData): string {
  const lines: string[] = ["Job details from your cleaning service:"];
  if (d.customerName) lines.push(`Customer: ${d.customerName}`);
  if (d.address) lines.push(`Address: ${d.address}`);
  if (d.serviceType) lines.push(`Service: ${d.serviceType}`);
  if (d.scheduledDate) {
    const date = new Date(d.scheduledDate).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
    });
    if (d.startTime && d.endTime) {
      const fmt = (t: string) =>
        new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      lines.push(`When: ${date}, ${fmt(d.startTime)}–${fmt(d.endTime)}`);
    } else if (d.startTime) {
      const fmt = (t: string) =>
        new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      lines.push(`When: ${date}, ${fmt(d.startTime)}`);
    } else {
      lines.push(`When: ${date}`);
    }
  }
  if (d.total) lines.push(`Pay: $${Number(d.total).toLocaleString()}`);
  if (d.notes) lines.push(`Notes: ${d.notes}`);
  return lines.join("\n");
}

function formatEmailText(d: DispatchData): string {
  const lines: string[] = ["Here are the details for your upcoming job:"];
  if (d.customerName) lines.push(`Customer: ${d.customerName}`);
  if (d.address) lines.push(`Address: ${d.address}`);
  if (d.serviceType) lines.push(`Service: ${d.serviceType}`);
  if (d.scheduledDate) {
    const date = new Date(d.scheduledDate).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    });
    if (d.startTime && d.endTime) {
      const fmt = (t: string) =>
        new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      lines.push(`Date & Time: ${date}, ${fmt(d.startTime)}–${fmt(d.endTime)}`);
    } else {
      lines.push(`Date: ${date}`);
    }
  }
  if (d.total) lines.push(`Amount: $${Number(d.total).toLocaleString()}`);
  if (d.notes) lines.push(`Notes: ${d.notes}`);
  return lines.join("\n");
}

function formatJobDetails(d: DispatchData): string {
  const lines: string[] = [];
  if (d.customerName) lines.push(d.customerName);
  if (d.address) lines.push(d.address);
  if (d.serviceType) lines.push(d.serviceType);
  if (d.scheduledDate) {
    const date = new Date(d.scheduledDate).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    });
    if (d.startTime && d.endTime) {
      const fmt = (t: string) =>
        new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      lines.push(`${date}, ${fmt(d.startTime)}–${fmt(d.endTime)}`);
    } else {
      lines.push(date);
    }
  }
  if (d.total) lines.push(`$${Number(d.total).toLocaleString()}`);
  if (d.notes) lines.push(`Notes: ${d.notes}`);
  return lines.join("\n");
}

function mapsUrl(address: string, provider: "google" | "apple" | "waze") {
  const q = encodeURIComponent(address);
  if (provider === "google") return `https://www.google.com/maps/search/?api=1&query=${q}`;
  if (provider === "apple") return `https://maps.apple.com/?address=${q}`;
  return `https://waze.com/ul?q=${q}`;
}

interface Props {
  data: DispatchData;
  onToast?: (msg: string, variant?: "success" | "error" | "info") => void;
}

export default function DispatchCard({ data, onToast }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [sendModal, setSendModal] = useState(false);
  const [channel, setChannel] = useState<Channel>("sms");
  const [recipientTab, setRecipientTab] = useState<RecipientTab>("employee");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [customPhone, setCustomPhone] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [messageText, setMessageText] = useState("");
  const [assignEmployee, setAssignEmployee] = useState(false);
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const toast = (msg: string, variant: "success" | "error" | "info" = "success") => {
    onToast?.(msg, variant);
  };

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
    queryFn: () => apiGet("/api/employees"),
  });

  const activeEmployees = employees.filter(e => e.status === "active");

  function openSendModal(ch: Channel) {
    setChannel(ch);
    setSuccessMsg("");
    setSelectedEmployee(null);
    setCustomPhone("");
    setCustomEmail("");
    setAssignEmployee(false);
    const msg = ch === "sms" ? formatSmsText(data) : formatEmailText(data);
    setMessageText(msg);
    // Default to employee tab if employees exist, else customer/custom
    if (activeEmployees.length > 0) {
      setRecipientTab("employee");
    } else if (data.customerId) {
      setRecipientTab("customer");
    } else {
      setRecipientTab("custom");
    }
    setSendModal(true);
  }

  function getRecipientInfo(): { name: string; phone?: string; email?: string; valid: boolean; reason?: string } {
    if (recipientTab === "customer") {
      if (!data.customerId) return { name: "", valid: false, reason: "No customer linked to this job" };
      if (channel === "sms" && !data.phone) return { name: data.customerName || "Customer", valid: false, reason: "No phone number on customer record" };
      if (channel === "email" && !data.email) return { name: data.customerName || "Customer", valid: false, reason: "No email on customer record" };
      return { name: data.customerName || "Customer", phone: data.phone, email: data.email, valid: true };
    }
    if (recipientTab === "employee") {
      if (!selectedEmployee) return { name: "", valid: false, reason: "Select a team member" };
      if (channel === "sms" && !selectedEmployee.phone) return { name: selectedEmployee.name, valid: false, reason: `${selectedEmployee.name} has no phone number saved` };
      if (channel === "email" && !selectedEmployee.email) return { name: selectedEmployee.name, valid: false, reason: `${selectedEmployee.name} has no email saved` };
      return { name: selectedEmployee.name, phone: selectedEmployee.phone, email: selectedEmployee.email, valid: true };
    }
    // custom
    if (channel === "sms") {
      if (!customPhone.trim()) return { name: "", valid: false, reason: "Enter a phone number" };
      return { name: customPhone.trim(), phone: customPhone.trim(), valid: true };
    } else {
      if (!customEmail.trim()) return { name: "", valid: false, reason: "Enter an email address" };
      return { name: customEmail.trim(), email: customEmail.trim(), valid: true };
    }
  }

  async function handleSend() {
    const recipient = getRecipientInfo();
    if (!recipient.valid) return;
    setSending(true);
    setSuccessMsg("");
    try {
      const payload: any = {
        channel,
        toName: recipient.name,
        message: messageText,
        subject: `Job Details — ${data.customerName || "Your Cleaning"}`,
      };
      if (channel === "sms") payload.toPhone = recipient.phone;
      else payload.toEmail = recipient.email;
      await apiPost("/api/dispatch/send", payload);

      // Assign employee to job if requested
      if (assignEmployee && selectedEmployee && data.jobId) {
        try {
          await apiPost(`/api/jobs/${data.jobId}/assign`, {
            employeeIds: [selectedEmployee.id],
          });
          queryClient.invalidateQueries({ queryKey: ["/api/jobs", data.jobId] });
        } catch {
          // non-fatal
        }
      }

      const label = channel === "sms"
        ? `Text sent to ${recipient.name}${recipient.phone ? ` at ${recipient.phone}` : ""}`
        : `Email sent to ${recipient.name}${recipient.email ? ` at ${recipient.email}` : ""}`;
      setSuccessMsg(label);
      toast(label);
    } catch (e: any) {
      toast(e?.message || "Failed to send dispatch", "error");
    }
    setSending(false);
  }

  const copyText = async (text: string, key: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast(`${label} copied!`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      toast("Copy failed — please try again", "error");
    }
  };

  if (!data.address && !data.customerName) return null;

  const jobText = formatJobDetails(data);
  const hasSched = !!data.scheduledDate;
  const hasAddress = !!data.address;
  const recipient = sendModal ? getRecipientInfo() : null;

  const ActionBtn = ({
    icon: Icon, label, onClick, disabled, loading, copied,
  }: {
    icon: any; label: string; onClick: () => void;
    disabled?: boolean; loading?: boolean; copied?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-xs font-medium transition-all w-full ${
        copied
          ? "border-green-300 bg-green-50 text-green-700"
          : disabled
          ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
          : "border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 active:scale-95"
      }`}
    >
      {copied ? (
        <CheckCircle className="w-4 h-4 text-green-600" />
      ) : loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <Icon className="w-4 h-4" />
      )}
      <span className="leading-tight text-center">{copied ? "Copied!" : label}</span>
    </button>
  );

  return (
    <>
      <Card>
        <CardHeader title="Dispatch" icon={Navigation} />

        {hasAddress ? (
          <div className="flex items-start gap-3 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <p className="text-sm text-slate-700 leading-snug">{data.address}</p>
          </div>
        ) : null}

        {(hasSched || data.serviceType || data.total) ? (
          <div className="mb-4 space-y-1 text-xs text-slate-500">
            {data.serviceType ? (
              <p><span className="font-medium text-slate-700">{data.serviceType}</span></p>
            ) : null}
            {hasSched ? (
              <p>
                {new Date(data.scheduledDate!).toLocaleDateString("en-US", {
                  weekday: "short", month: "short", day: "numeric",
                })}
                {data.startTime
                  ? `, ${new Date(data.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
                  : ""}
                {data.endTime
                  ? `–${new Date(data.endTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
                  : ""}
              </p>
            ) : null}
            {data.total ? (
              <p className="font-semibold text-slate-700">${Number(data.total).toLocaleString()}</p>
            ) : null}
          </div>
        ) : null}

        {/* Copy row */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <ActionBtn
            icon={Copy}
            label="Copy Address"
            onClick={() => copyText(data.address || "", "addr", "Address")}
            disabled={!hasAddress}
            copied={copiedKey === "addr"}
          />
          <ActionBtn
            icon={ClipboardList}
            label="Copy Job Details"
            onClick={() => copyText(jobText, "job", "Job details")}
            copied={copiedKey === "job"}
          />
        </div>

        {/* Maps row */}
        {hasAddress ? (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(["google", "apple", "waze"] as const).map(key => (
              <a
                key={key}
                href={mapsUrl(data.address!, key)}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 transition-all active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="leading-tight text-center capitalize">{key === "google" ? "Google Maps" : key === "apple" ? "Apple Maps" : "Waze"}</span>
              </a>
            ))}
          </div>
        ) : null}

        {/* Send row */}
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
          <ActionBtn
            icon={Phone}
            label="Text Details"
            onClick={() => openSendModal("sms")}
          />
          <ActionBtn
            icon={Mail}
            label="Email Details"
            onClick={() => openSendModal("email")}
          />
        </div>
      </Card>

      {/* Send Modal */}
      <Modal
        open={sendModal}
        onClose={() => { setSendModal(false); setSuccessMsg(""); }}
        title={channel === "sms" ? "Text Job Details" : "Email Job Details"}
        size="md"
      >
        {successMsg ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-800">Dispatch sent</p>
                <p className="text-sm text-green-700 mt-0.5">{successMsg}</p>
              </div>
            </div>
            <Button
              onClick={() => { setSendModal(false); setSuccessMsg(""); }}
              className="w-full"
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Channel toggle */}
            <div className="flex rounded-lg bg-slate-100 p-1 gap-1">
              {(["sms", "email"] as Channel[]).map(ch => (
                <button
                  key={ch}
                  onClick={() => {
                    setChannel(ch);
                    setMessageText(ch === "sms" ? formatSmsText(data) : formatEmailText(data));
                    setSuccessMsg("");
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    channel === ch ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {ch === "sms" ? <Phone className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                  {ch === "sms" ? "Text Message" : "Email"}
                </button>
              ))}
            </div>

            {/* Recipient tabs */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Send to</p>
              <div className="flex rounded-lg bg-slate-100 p-1 gap-1">
                {[
                  { id: "employee" as RecipientTab, label: "Team Member", icon: Users },
                  { id: "customer" as RecipientTab, label: "Customer", icon: UserCheck },
                  { id: "custom" as RecipientTab, label: "Custom", icon: Phone },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setRecipientTab(id)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                      recipientTab === id ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient details */}
            {recipientTab === "employee" ? (
              <div className="space-y-2">
                {activeEmployees.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                    No team members saved yet.{" "}
                    <button
                      onClick={() => { setSendModal(false); navigate("/employees"); }}
                      className="underline font-medium"
                    >
                      Add your first team member
                    </button>{" "}
                    to dispatch quickly.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {activeEmployees.map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => setSelectedEmployee(selectedEmployee?.id === emp.id ? null : emp)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          selectedEmployee?.id === emp.id
                            ? "border-primary-400 bg-primary-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: emp.color }}
                        >
                          {initials(emp.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{emp.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {emp.role ? `${emp.role} · ` : ""}
                            {channel === "sms" ? (emp.phone || "No phone") : (emp.email || "No email")}
                          </p>
                        </div>
                        {selectedEmployee?.id === emp.id ? (
                          <CheckCircle className="w-4 h-4 text-primary-600 shrink-0" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
                {selectedEmployee && data.jobId ? (
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignEmployee}
                      onChange={e => setAssignEmployee(e.target.checked)}
                      className="rounded border-slate-300 text-primary-600"
                    />
                    <span className="text-xs text-slate-600">
                      Also assign <strong>{selectedEmployee.name}</strong> to this job
                    </span>
                  </label>
                ) : null}
              </div>
            ) : recipientTab === "customer" ? (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                {data.customerId ? (
                  <div>
                    <p className="text-sm font-medium text-slate-900">{data.customerName || "Customer"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {channel === "sms"
                        ? (data.phone ? data.phone : "No phone number on record")
                        : (data.email ? data.email : "No email on record")}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No customer linked to this job.</p>
                )}
              </div>
            ) : (
              <div>
                {channel === "sms" ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={customPhone}
                      onChange={e => setCustomPhone(e.target.value)}
                      placeholder="(484) 555-1212"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={customEmail}
                      onChange={e => setCustomEmail(e.target.value)}
                      placeholder="cleaner@company.com"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Validation warning */}
            {recipient && !recipient.valid && recipient.reason ? (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {recipient.reason}
              </div>
            ) : null}

            {/* Message preview */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Message preview</p>
              <textarea
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                rows={5}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 bg-slate-50 font-mono resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                icon={Send}
                onClick={handleSend}
                loading={sending}
                disabled={!recipient?.valid || !messageText.trim()}
                className="flex-1"
              >
                {sending ? "Sending…" : `Send ${channel === "sms" ? "Text" : "Email"}`}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setSendModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
