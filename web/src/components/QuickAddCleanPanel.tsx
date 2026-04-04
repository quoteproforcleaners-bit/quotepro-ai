import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiGet } from "../lib/api";
import {
  AlertCircle, CheckCircle, Plus, Search, Users, X, Zap,
  MessageSquare, Mail, Send, CalendarDays, MapPin, SkipForward, Repeat,
} from "lucide-react";
import { Button } from "./ui";

// ─── Types ──────────────────────────────────────────────────────────────────

const SERVICE_TYPES = [
  { value: "regular", label: "Regular Clean" },
  { value: "deep-clean", label: "Deep Clean" },
  { value: "move-in", label: "Move-In Clean" },
  { value: "move-out", label: "Move-Out Clean" },
  { value: "post-construction", label: "Post-Construction" },
] as const;

type PriceSource = "quote" | "previous" | "custom";
type CustomerMode = "existing" | "new";
type PanelStep = "form" | "notify";

interface CustomerResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

export interface QuickAddPrefill {
  quoteId: string;
  customerName: string;
  customerId: string | null;
  address: string;
  total: number | null;
  jobType: string;
  customerPhone?: string;
  customerEmail?: string;
}

interface NotifyResult {
  sms?: { success: boolean; message: string };
  email?: { success: boolean; message: string };
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function formatDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  return dt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(timeStr: string): string {
  const [hr, mn] = timeStr.split(":").map(Number);
  const dt = new Date();
  dt.setHours(hr, mn, 0, 0);
  return dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

// ─── Notify Step ─────────────────────────────────────────────────────────────

function NotifyStep({
  savedJobId,
  customerName,
  customerPhone,
  customerEmail,
  displayDate,
  displayTime,
  displayEndTime,
  displayAddress,
  onDone,
}: {
  savedJobId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  displayDate: string;
  displayTime: string;
  displayEndTime: string;
  displayAddress: string;
  onDone: () => void;
}) {
  const hasPhone = !!customerPhone.trim();
  const hasEmail = !!customerEmail.trim();
  const hasBoth = hasPhone && hasEmail;
  const hasNeither = !hasPhone && !hasEmail;

  const [sendSms, setSendSms] = useState(hasPhone);
  const [sendEmail, setSendEmail] = useState(hasEmail);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<NotifyResult | null>(null);

  const arrivalWindow = displayEndTime
    ? `${displayTime} – ${displayEndTime}`
    : displayTime;

  const handleSend = async () => {
    const channels: string[] = [];
    if (sendSms) channels.push("sms");
    if (sendEmail) channels.push("email");
    if (channels.length === 0) { onDone(); return; }

    setLoading(true);
    try {
      const res = await apiPost(`/api/jobs/${savedJobId}/send-confirmation`, { channels });
      setResults((res as any).results || {});
    } catch {
      setResults({ sms: sendSms ? { success: false, message: "Failed to send" } : undefined, email: sendEmail ? { success: false, message: "Failed to send" } : undefined });
    } finally {
      setLoading(false);
    }
  };

  const sentCount = results
    ? Object.values(results).filter((r) => r?.success).length
    : 0;
  const allSent = results !== null && ((!sendSms || results.sms?.success) && (!sendEmail || results.email?.success));

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
      {/* Scheduled summary */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
          <p className="font-bold text-emerald-800 text-sm">Job Scheduled</p>
        </div>
        <p className="font-semibold text-slate-800 text-sm mb-2">{customerName}</p>
        <div className="space-y-1.5 text-xs text-slate-600">
          {displayDate ? (
            <div className="flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{displayDate}{arrivalWindow ? ` · ${arrivalWindow}` : ""}</span>
            </div>
          ) : null}
          {displayAddress ? (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{displayAddress}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Notify section */}
      {results !== null ? (
        /* Result view */
        <div className="space-y-3">
          <p className="text-sm font-bold text-slate-700">
            {sentCount > 0 ? "Confirmation sent" : "Could not send confirmation"}
          </p>
          {results.sms ? (
            <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium ${results.sms.success ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-700"}`}>
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>SMS — {results.sms.success ? "Sent" : results.sms.message}</span>
            </div>
          ) : null}
          {results.email ? (
            <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium ${results.email.success ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-700"}`}>
              <Mail className="w-4 h-4 shrink-0" />
              <span>Email — {results.email.success ? "Sent" : results.email.message}</span>
            </div>
          ) : null}
        </div>
      ) : (
        /* Channel picker */
        <div className="space-y-4">
          <div>
            <p className="text-sm font-bold text-slate-800 mb-0.5">Notify the customer?</p>
            <p className="text-xs text-slate-500">
              {hasNeither
                ? "No contact info available for this customer."
                : hasBoth
                ? "Both SMS and email are ready to send."
                : hasPhone
                ? "Only a phone number is available."
                : "Only an email address is available."}
            </p>
          </div>

          {hasNeither ? (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Add a phone or email to the customer's profile to send appointment confirmations.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {hasPhone ? (
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer hover:border-primary-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={sendSms}
                    onChange={(e) => setSendSms(e.target.checked)}
                    className="w-4 h-4 rounded accent-primary-600"
                    data-testid="checkbox-send-sms"
                  />
                  <MessageSquare className="w-4 h-4 text-primary-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">Text message</p>
                    <p className="text-xs text-slate-500 truncate">{customerPhone}</p>
                  </div>
                </label>
              ) : null}

              {hasEmail ? (
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer hover:border-primary-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="w-4 h-4 rounded accent-primary-600"
                    data-testid="checkbox-send-email"
                  />
                  <Mail className="w-4 h-4 text-primary-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">Email</p>
                    <p className="text-xs text-slate-500 truncate">{customerEmail}</p>
                  </div>
                </label>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function QuickAddCleanPanel({
  open,
  onClose,
  prefill,
  defaultDate,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  prefill?: QuickAddPrefill;
  defaultDate?: Date;
  onSaved?: (job: any) => void;
}) {
  const queryClient = useQueryClient();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<CustomerMode>("existing");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [price, setPrice] = useState(prefill?.total != null ? String(prefill.total) : "");
  const [priceSource, setPriceSource] = useState<PriceSource>(prefill ? "quote" : "custom");
  const [serviceType, setServiceType] = useState(prefill?.jobType || "regular");

  const initDate = defaultDate ? new Date(defaultDate) : new Date();
  initDate.setHours(9, 0, 0, 0);
  const [date, setDate] = useState(initDate.toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("3");

  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [teamInput, setTeamInput] = useState("");
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [notes, setNotes] = useState("");

  const { data: employeeList = [] } = useQuery<{ id: string; name: string; role: string; color: string; isActive: boolean }[]>({
    queryKey: ["/api/admin/employees"],
    queryFn: () => apiGet("/api/admin/employees"),
  });

  const activeEmployees = employeeList.filter(e => e.isActive !== false);
  const filteredEmployees = activeEmployees.filter(e =>
    !teamMembers.includes(e.name) &&
    (teamInput.trim() === "" || e.name.toLowerCase().includes(teamInput.toLowerCase()))
  );
  const [error, setError] = useState("");

  // ── Recurring state ─────────────────────────────────────────────────────────
  const [isRecurring, setIsRecurring] = useState(false);
  const [recFrequency, setRecFrequency] = useState<"weekly" | "biweekly" | "monthly" | "custom">("biweekly");
  const [recInterval, setRecInterval] = useState("1");
  const [recUnit, setRecUnit] = useState<"week" | "month">("week");
  const [recHasEnd, setRecHasEnd] = useState(false);
  const [recEndDate, setRecEndDate] = useState("");

  // ── Notify step state ───────────────────────────────────────────────────────
  const [step, setStep] = useState<PanelStep>("form");
  const [savedJobId, setSavedJobId] = useState<string | null>(null);
  const [notifyPhone, setNotifyPhone] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyCustomerName, setNotifyCustomerName] = useState("");
  const [notifyDate, setNotifyDate] = useState("");
  const [notifyTime, setNotifyTime] = useState("");
  const [notifyEndTime, setNotifyEndTime] = useState("");
  const [notifyAddress, setNotifyAddress] = useState("");
  const [notifyResults, setNotifyResults] = useState<NotifyResult | null>(null);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifySms, setNotifySms] = useState(true);
  const [notifyEmailChecked, setNotifyEmailChecked] = useState(true);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Reset everything when panel opens/closes
  useEffect(() => {
    if (!open) return;
    setStep("form");
    setSavedJobId(null);
    setNotifyResults(null);
    setNotifyLoading(false);
    setMode("existing");
    setSearchQuery(""); setSearchResults([]); setSelectedCustomer(null); setShowDropdown(false);
    setNewFirst(""); setNewLast(""); setNewAddress(""); setNewPhone(""); setNewEmail("");
    setPrice(prefill?.total != null ? String(prefill.total) : "");
    setPriceSource(prefill ? "quote" : "custom");
    setServiceType(prefill?.jobType || "regular");
    const d = defaultDate ? new Date(defaultDate) : new Date();
    d.setHours(9, 0, 0, 0);
    setDate(d.toISOString().slice(0, 10));
    setTime("09:00");
    setDuration("3");
    setTeamMembers([]); setTeamInput(""); setNotes(""); setError("");
    setIsRecurring(false); setRecFrequency("biweekly"); setRecInterval("1"); setRecUnit("week");
    setRecHasEnd(false); setRecEndDate("");
  }, [open]);

  useEffect(() => {
    if (mode !== "existing" || !debouncedSearch.trim()) { setSearchResults([]); setShowDropdown(false); return; }
    setSearchLoading(true);
    fetch(`/api/customers?search=${encodeURIComponent(debouncedSearch.trim())}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: CustomerResult[]) => { setSearchResults(Array.isArray(data) ? data.slice(0, 6) : []); setShowDropdown(true); })
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
  }, [debouncedSearch, mode]);

  const selectCustomer = async (c: CustomerResult) => {
    setSelectedCustomer(c);
    setSearchQuery(`${c.firstName} ${c.lastName}`);
    setSearchResults([]); setShowDropdown(false);
    try {
      const res = await fetch(`/api/customers/${c.id}/last-job`, { credentials: "include" });
      const lastJob = await res.json();
      if (lastJob?.total != null) {
        setPrice(String(lastJob.total));
        setPriceSource("previous");
        if (lastJob.jobType) setServiceType(lastJob.jobType);
      } else {
        setPriceSource("custom");
      }
    } catch { setPriceSource("custom"); }
  };

  const addTeamMember = () => {
    const name = teamInput.trim();
    if (name && !teamMembers.includes(name)) setTeamMembers((p) => [...p, name]);
    setTeamInput("");
  };

  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/customers", data),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/jobs", data),
    onSuccess: (savedJob: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes/unscheduled-accepted"] });
      if (prefill?.quoteId) {
        queryClient.invalidateQueries({ queryKey: [`/api/jobs/quote/${prefill.quoteId}`] });
      }
      onSaved?.(savedJob);

      setSavedJobId(savedJob.id);

      const [y, mo, d] = date.split("-").map(Number);
      const [hr, mn] = time.split(":").map(Number);
      const startDt = new Date(y, mo - 1, d, hr, mn);
      const endDt = new Date(startDt);
      endDt.setHours(endDt.getHours() + parseFloat(duration));

      setNotifyDate(startDt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
      setNotifyTime(startDt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }));
      setNotifyEndTime(endDt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }));

      setStep("notify");
    },
    onError: (e: any) => setError(e?.message || "Failed to save"),
  });

  const saveSeriesMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/recurring-series", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-series"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes/unscheduled-accepted"] });
      onClose();
    },
    onError: (e: any) => setError(e?.message || "Failed to save series"),
  });

  const handleSend = async () => {
    if (!savedJobId) return;
    const channels: string[] = [];
    if (notifySms) channels.push("sms");
    if (notifyEmailChecked) channels.push("email");
    if (channels.length === 0) { onClose(); return; }

    setNotifyLoading(true);
    try {
      const res = await apiPost(`/api/jobs/${savedJobId}/send-confirmation`, { channels });
      setNotifyResults((res as any).results || {});
    } catch {
      setNotifyResults({
        ...(notifySms ? { sms: { success: false, message: "Failed to send" } } : {}),
        ...(notifyEmailChecked ? { email: { success: false, message: "Failed to send" } } : {}),
      });
    } finally {
      setNotifyLoading(false);
    }
  };

  const handleSave = async () => {
    setError("");
    let customerId: string | null = null;
    let address = "";
    let phone = "";
    let email = "";
    let customerName = "";

    if (prefill) {
      customerId = prefill.customerId;
      address = prefill.address;
      phone = prefill.customerPhone || "";
      email = prefill.customerEmail || "";
      customerName = prefill.customerName;
    } else if (mode === "existing") {
      if (!selectedCustomer) { setError("Please search and select a customer."); return; }
      customerId = selectedCustomer.id;
      address = selectedCustomer.address;
      phone = selectedCustomer.phone || "";
      email = selectedCustomer.email || "";
      customerName = `${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim();
    } else {
      if (!newFirst.trim() || !newLast.trim()) { setError("First and last name are required."); return; }
      try {
        const cust: any = await createCustomerMutation.mutateAsync({
          firstName: newFirst.trim(),
          lastName: newLast.trim(),
          address: newAddress.trim(),
          phone: newPhone.trim(),
          email: newEmail.trim(),
        });
        customerId = cust.id;
        address = newAddress.trim();
        phone = newPhone.trim();
        email = newEmail.trim();
        customerName = `${newFirst.trim()} ${newLast.trim()}`.trim();
      } catch (e: any) { setError(e?.message || "Failed to create customer"); return; }
    }

    if (!price.trim() || isNaN(Number(price))) { setError("Please enter a valid price."); return; }

    const [y, mo, d] = date.split("-").map(Number);
    const [hr, mn] = time.split(":").map(Number);
    const startDt = new Date(y, mo - 1, d, hr, mn);
    const endDt = new Date(startDt);
    endDt.setHours(endDt.getHours() + parseFloat(duration));

    if (isRecurring) {
      // Build interval/frequency for series
      let frequencyVal: string;
      let intervalVal: number;
      let unitVal: string;
      if (recFrequency === "weekly") { frequencyVal = "weekly"; intervalVal = 1; unitVal = "week"; }
      else if (recFrequency === "biweekly") { frequencyVal = "biweekly"; intervalVal = 2; unitVal = "week"; }
      else if (recFrequency === "monthly") { frequencyVal = "monthly"; intervalVal = 1; unitVal = "month"; }
      else { frequencyVal = "custom"; intervalVal = parseInt(recInterval) || 1; unitVal = recUnit; }

      saveSeriesMutation.mutate({
        customerId,
        quoteId: prefill?.quoteId || null,
        jobType: serviceType,
        address,
        total: Number(price),
        internalNotes: notes,
        teamMembers,
        frequency: frequencyVal,
        intervalValue: intervalVal,
        intervalUnit: unitVal,
        arrivalTime: time,
        durationHours: parseFloat(duration),
        startDate: date,
        endDate: recHasEnd && recEndDate ? recEndDate : null,
        status: "active",
      });
      return;
    }

    // Stash contact info for the notify step
    setNotifyPhone(phone);
    setNotifyEmail(email);
    setNotifyCustomerName(customerName);
    setNotifyAddress(address);
    // Pre-check both if both exist (as per UX spec)
    setNotifySms(!!phone);
    setNotifyEmailChecked(!!email);

    setNotifyDate(startDt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
    setNotifyTime(startDt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }));
    setNotifyEndTime(endDt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }));

    saveMutation.mutate({
      customerId,
      quoteId: prefill?.quoteId || null,
      jobType: serviceType,
      status: "scheduled",
      startDatetime: startDt.toISOString(),
      endDatetime: endDt.toISOString(),
      address,
      total: Number(price),
      internalNotes: notes,
      teamMembers,
    });
  };

  const priceSourceLabel: Record<PriceSource, string> = {
    quote: "From accepted quote",
    previous: "From previous clean",
    custom: "Custom price",
  };
  const priceSourceColor: Record<PriceSource, string> = {
    quote: "text-primary-600 bg-primary-50",
    previous: "text-emerald-700 bg-emerald-50",
    custom: "text-slate-500 bg-slate-100",
  };

  const hasPhone = !!notifyPhone.trim();
  const hasEmail = !!notifyEmail.trim();
  const hasNeither = !hasPhone && !hasEmail;
  const arrivalWindow = notifyEndTime ? `${notifyTime} – ${notifyEndTime}` : notifyTime;
  const allSent = notifyResults !== null &&
    (!notifySms || notifyResults.sms?.success) &&
    (!notifyEmailChecked || notifyResults.email?.success);

  return (
    <>
      {open ? <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} /> : null}

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="bg-primary-600 px-6 py-5 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-white" />
              <h2 className="text-lg font-bold text-white">Quick Add Clean</h2>
            </div>
            {prefill ? <p className="text-primary-100 text-sm mt-0.5">{prefill.customerName}</p> : null}
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === "form" ? (
          <>
            {/* Form body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {prefill ? (
                <div className="flex items-start gap-3 bg-primary-50 border border-primary-200 rounded-xl p-3">
                  <CheckCircle className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-primary-800 text-sm">{prefill.customerName}</p>
                    {prefill.address ? <p className="text-xs text-slate-500 mt-0.5">{prefill.address}</p> : null}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Customer</label>

                  <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm font-medium">
                    {(["existing", "new"] as CustomerMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => { setMode(m); setSelectedCustomer(null); setSearchQuery(""); setSearchResults([]); setShowDropdown(false); setPriceSource("custom"); setPrice(""); }}
                        className={`flex-1 py-2 transition-colors ${mode === m ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                      >
                        {m === "existing" ? "Existing Customer" : "New Customer"}
                      </button>
                    ))}
                  </div>

                  {mode === "existing" ? (
                    <div className="relative">
                      <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          className="flex-1 outline-none text-sm"
                          placeholder="Search by name, email, or phone…"
                          value={searchQuery}
                          onChange={(e) => { setSearchQuery(e.target.value); if (!e.target.value) setSelectedCustomer(null); }}
                          autoComplete="off"
                          data-testid="input-customer-search"
                        />
                        {searchLoading ? <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /> : null}
                        {selectedCustomer ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> : null}
                      </div>

                      {showDropdown && searchResults.length > 0 ? (
                        <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 z-10 overflow-hidden">
                          {searchResults.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => selectCustomer(c)}
                              className="w-full px-4 py-2.5 text-left hover:bg-slate-50 border-b border-slate-100 last:border-0"
                            >
                              <p className="text-sm font-semibold text-slate-800">{c.firstName} {c.lastName}</p>
                              {c.address ? <p className="text-xs text-slate-500 truncate">{c.address}</p> : null}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {selectedCustomer ? (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mt-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                            {selectedCustomer.address ? <p className="text-xs text-slate-500 truncate">{selectedCustomer.address}</p> : null}
                          </div>
                          <button onClick={() => { setSelectedCustomer(null); setSearchQuery(""); setPriceSource("custom"); setPrice(""); }} className="text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-slate-500 font-medium">First Name *</label>
                          <input type="text" data-testid="input-new-first" className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" value={newFirst} onChange={(e) => setNewFirst(e.target.value)} placeholder="Jane" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 font-medium">Last Name *</label>
                          <input type="text" data-testid="input-new-last" className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" value={newLast} onChange={(e) => setNewLast(e.target.value)} placeholder="Smith" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 font-medium">Address</label>
                        <input type="text" className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="123 Main St, City, ST" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-slate-500 font-medium">Phone</label>
                          <input type="tel" className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="(555) 000-0000" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500 font-medium">Email</label>
                          <input type="email" className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="jane@email.com" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Service Type</label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_TYPES.map((st) => (
                    <button
                      key={st.value}
                      onClick={() => setServiceType(st.value)}
                      data-testid={`service-type-${st.value}`}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        serviceType === st.value
                          ? "bg-primary-600 border-primary-600 text-white"
                          : "border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-700"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Price</label>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${priceSourceColor[priceSource]}`}>
                    {priceSourceLabel[priceSource]}
                  </span>
                </div>
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
                  <span className="px-3 text-slate-400 font-semibold text-lg border-r border-slate-200 py-2">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    data-testid="input-price"
                    className="flex-1 px-3 py-2 text-xl font-bold outline-none"
                    value={price}
                    onChange={(e) => { setPrice(e.target.value); setPriceSource("custom"); }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Date & Time</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500 font-medium">Date</label>
                    <input type="date" className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-medium">Arrival Time</label>
                    <input type="time" className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" value={time} onChange={(e) => setTime(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium">Duration</label>
                  <div className="flex gap-2 mt-1">
                    {["1.5", "2", "3", "4"].map((h) => (
                      <button
                        key={h}
                        onClick={() => setDuration(h)}
                        data-testid={`btn-duration-${h}`}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${
                          duration === h ? "bg-primary-600 border-primary-600 text-white" : "border-slate-200 text-slate-600 hover:border-primary-300"
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recurring section */}
              <div className="space-y-3">
                <button
                  type="button"
                  data-testid="btn-toggle-recurring"
                  onClick={() => setIsRecurring((v) => !v)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-sm font-semibold ${
                    isRecurring
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <Repeat className={`w-4 h-4 ${isRecurring ? "text-violet-600" : "text-slate-400"}`} />
                  <span className="flex-1 text-left">
                    {isRecurring ? "Recurring series" : "Make this a recurring series"}
                  </span>
                  <div className={`w-10 h-5 rounded-full transition-colors flex items-center ${isRecurring ? "bg-violet-500" : "bg-slate-300"}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${isRecurring ? "translate-x-5" : "translate-x-0"}`} />
                  </div>
                </button>

                {isRecurring ? (
                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-4">
                    <div>
                      <p className="text-xs font-bold text-violet-600 uppercase tracking-wide mb-2">Frequency</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(["weekly", "biweekly", "monthly", "custom"] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => setRecFrequency(f)}
                            data-testid={`btn-freq-${f}`}
                            className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                              recFrequency === f
                                ? "bg-violet-600 border-violet-600 text-white"
                                : "border-violet-200 text-violet-600 hover:border-violet-400 bg-white"
                            }`}
                          >
                            {f === "biweekly" ? "Bi-weekly" : f.charAt(0).toUpperCase() + f.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {recFrequency === "custom" ? (
                      <div>
                        <p className="text-xs font-bold text-violet-600 uppercase tracking-wide mb-2">Custom interval</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-violet-700">Every</span>
                          <input
                            type="number"
                            min="1"
                            max="52"
                            data-testid="input-rec-interval"
                            className="w-16 border border-violet-300 rounded-lg px-2 py-1.5 text-sm text-center outline-none focus:ring-2 focus:ring-violet-400"
                            value={recInterval}
                            onChange={(e) => setRecInterval(e.target.value)}
                          />
                          <div className="flex gap-1">
                            {(["week", "month"] as const).map((u) => (
                              <button
                                key={u}
                                onClick={() => setRecUnit(u)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                  recUnit === u
                                    ? "bg-violet-600 text-white border-violet-600"
                                    : "border-violet-200 text-violet-600 bg-white hover:border-violet-400"
                                }`}
                              >
                                {u}s
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-violet-600 uppercase tracking-wide">End date</p>
                        <button
                          onClick={() => setRecHasEnd((v) => !v)}
                          className={`text-xs font-semibold px-2 py-1 rounded-md transition-colors ${recHasEnd ? "bg-violet-200 text-violet-700" : "bg-white border border-violet-200 text-violet-500"}`}
                        >
                          {recHasEnd ? "Set" : "No end date"}
                        </button>
                      </div>
                      {recHasEnd ? (
                        <input
                          type="date"
                          data-testid="input-rec-end-date"
                          className="w-full border border-violet-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-400"
                          value={recEndDate}
                          onChange={(e) => setRecEndDate(e.target.value)}
                          min={date}
                        />
                      ) : null}
                    </div>

                    <div className="bg-white border border-violet-200 rounded-lg px-3 py-2 text-xs text-violet-700 font-medium">
                      {recFrequency === "weekly" && `Repeats every week on the same day`}
                      {recFrequency === "biweekly" && `Repeats every 2 weeks on the same day`}
                      {recFrequency === "monthly" && `Repeats monthly on the same date`}
                      {recFrequency === "custom" && `Repeats every ${recInterval || 1} ${recUnit}${(parseInt(recInterval) || 1) > 1 ? "s" : ""}`}
                      {recHasEnd && recEndDate ? ` · until ${new Date(recEndDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : " · ongoing"}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Team Members
                </label>
                {teamMembers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {teamMembers.map((m) => (
                      <span key={m} className="flex items-center gap-1 bg-primary-50 text-primary-700 border border-primary-200 rounded-full px-2.5 py-1 text-xs font-semibold">
                        {m}
                        <button onClick={() => setTeamMembers((p) => p.filter((x) => x !== m))} className="text-primary-400 hover:text-primary-700 ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="relative">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      data-testid="input-team-member"
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Add team member name…"
                      value={teamInput}
                      onChange={(e) => { setTeamInput(e.target.value); setShowTeamDropdown(true); }}
                      onFocus={() => setShowTeamDropdown(true)}
                      onBlur={() => setTimeout(() => setShowTeamDropdown(false), 150)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTeamMember(); } if (e.key === "Escape") setShowTeamDropdown(false); }}
                      autoComplete="off"
                    />
                    <button
                      onClick={addTeamMember}
                      disabled={!teamInput.trim()}
                      data-testid="btn-add-team-member"
                      className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-primary-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {showTeamDropdown && filteredEmployees.length > 0 && (
                    <div className="mt-1 border border-slate-200 rounded-xl bg-white overflow-hidden">
                      {filteredEmployees.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left transition-colors border-b border-slate-100 last:border-0"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setTeamMembers(p => [...p, emp.name]);
                            setTeamInput("");
                            setShowTeamDropdown(false);
                          }}
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: emp.color || "#0F6E56" }}
                          >
                            {emp.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{emp.name}</div>
                            {emp.role && <div className="text-xs text-slate-400">{emp.role}</div>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {showTeamDropdown && filteredEmployees.length === 0 && teamInput.trim() !== "" && activeEmployees.length > 0 && (
                    <div className="mt-1 border border-slate-200 rounded-xl bg-white px-3 py-2.5">
                      <p className="text-sm text-slate-400">No match — press Enter or + to add "{teamInput}"</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Internal Notes</label>
                <textarea
                  data-testid="input-notes"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={3}
                  placeholder="Access codes, special instructions, parking…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {error ? (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              ) : null}
            </div>

            {/* Save footer */}
            <div className="shrink-0 px-5 py-4 border-t border-slate-100">
              <Button
                onClick={handleSave}
                loading={saveMutation.isPending || saveSeriesMutation.isPending || createCustomerMutation.isPending}
                className={`w-full justify-center ${isRecurring ? "bg-violet-600 hover:bg-violet-700" : ""}`}
                data-testid="btn-save-quick-add"
              >
                {isRecurring ? "Create Recurring Series" : "Save & Schedule Clean"}
              </Button>
            </div>
          </>
        ) : (
          /* ── Notify Step ─────────────────────────────────────────────────── */
          <>
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* Scheduled summary */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <p className="font-bold text-emerald-800 text-sm">Job Scheduled</p>
                </div>
                <p className="font-semibold text-slate-800 text-sm mb-2">{notifyCustomerName}</p>
                <div className="space-y-1.5 text-xs text-slate-600">
                  {notifyDate ? (
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{notifyDate}{arrivalWindow ? ` · ${arrivalWindow}` : ""}</span>
                    </div>
                  ) : null}
                  {notifyAddress ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{notifyAddress}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Results or channel pickers */}
              {notifyResults !== null ? (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700">
                    {Object.values(notifyResults).some((r) => r?.success)
                      ? "Confirmation sent"
                      : "Could not send confirmation"}
                  </p>
                  {notifyResults.sms ? (
                    <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium ${notifyResults.sms.success ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-700"}`}>
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span>SMS — {notifyResults.sms.success ? "Sent" : notifyResults.sms.message}</span>
                    </div>
                  ) : null}
                  {notifyResults.email ? (
                    <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium ${notifyResults.email.success ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-700"}`}>
                      <Mail className="w-4 h-4 shrink-0" />
                      <span>Email — {notifyResults.email.success ? "Sent" : notifyResults.email.message}</span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-bold text-slate-800 mb-0.5">Notify the customer?</p>
                    <p className="text-xs text-slate-500">
                      {hasNeither
                        ? "No contact info is on file for this customer."
                        : hasPhone && hasEmail
                        ? "Send an appointment confirmation via text and email."
                        : hasPhone
                        ? "Send an appointment confirmation via text message."
                        : "Send an appointment confirmation via email."}
                    </p>
                  </div>

                  {hasNeither ? (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Add a phone number or email to this customer's profile to send confirmations in the future.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {hasPhone ? (
                        <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer hover:border-primary-300 transition-colors has-[:checked]:border-primary-400 has-[:checked]:bg-primary-50">
                          <input
                            type="checkbox"
                            checked={notifySms}
                            onChange={(e) => setNotifySms(e.target.checked)}
                            className="w-4 h-4 rounded accent-primary-600"
                            data-testid="checkbox-send-sms"
                          />
                          <MessageSquare className="w-4 h-4 text-primary-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800">Text message</p>
                            <p className="text-xs text-slate-500 truncate">{notifyPhone}</p>
                          </div>
                        </label>
                      ) : null}

                      {hasEmail ? (
                        <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer hover:border-primary-300 transition-colors has-[:checked]:border-primary-400 has-[:checked]:bg-primary-50">
                          <input
                            type="checkbox"
                            checked={notifyEmailChecked}
                            onChange={(e) => setNotifyEmailChecked(e.target.checked)}
                            className="w-4 h-4 rounded accent-primary-600"
                            data-testid="checkbox-send-email"
                          />
                          <Mail className="w-4 h-4 text-primary-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800">Email</p>
                            <p className="text-xs text-slate-500 truncate">{notifyEmail}</p>
                          </div>
                        </label>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notify footer */}
            <div className="shrink-0 px-5 py-4 border-t border-slate-100 space-y-2">
              {notifyResults !== null ? (
                <Button onClick={onClose} className="w-full justify-center" data-testid="btn-notify-done">
                  Done
                </Button>
              ) : hasNeither ? (
                <Button onClick={onClose} variant="secondary" className="w-full justify-center">
                  Close
                </Button>
              ) : (
                <>
                  <Button
                    icon={Send}
                    onClick={handleSend}
                    loading={notifyLoading}
                    disabled={!notifySms && !notifyEmailChecked}
                    className="w-full justify-center"
                    data-testid="btn-send-confirmation"
                  >
                    Send Confirmation
                  </Button>
                  <button
                    onClick={onClose}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
                    data-testid="btn-skip-notify"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    Skip for now
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
