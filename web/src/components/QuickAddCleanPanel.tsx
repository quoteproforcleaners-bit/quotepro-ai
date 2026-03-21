import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "../lib/api";
import { AlertCircle, CheckCircle, Plus, Search, Users, X, Zap } from "lucide-react";
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
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function QuickAddCleanPanel({
  open,
  onClose,
  prefill,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  prefill?: QuickAddPrefill;
  defaultDate?: Date;
}) {
  const queryClient = useQueryClient();

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
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (!open) return;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes/unscheduled-accepted"] });
      onClose();
    },
    onError: (e: any) => setError(e?.message || "Failed to save"),
  });

  const handleSave = async () => {
    setError("");
    let customerId: string | null = null;
    let address = "";

    if (prefill) {
      customerId = prefill.customerId;
      address = prefill.address;
    } else if (mode === "existing") {
      if (!selectedCustomer) { setError("Please search and select a customer."); return; }
      customerId = selectedCustomer.id;
      address = selectedCustomer.address;
    } else {
      if (!newFirst.trim() || !newLast.trim()) { setError("First and last name are required."); return; }
      try {
        const cust = await createCustomerMutation.mutateAsync({ firstName: newFirst.trim(), lastName: newLast.trim(), address: newAddress.trim(), phone: newPhone.trim(), email: newEmail.trim() });
        customerId = cust.id;
        address = newAddress.trim();
      } catch (e: any) { setError(e?.message || "Failed to create customer"); return; }
    }

    if (!price.trim() || isNaN(Number(price))) { setError("Please enter a valid price."); return; }

    const [y, mo, d] = date.split("-").map(Number);
    const [hr, mn] = time.split(":").map(Number);
    const startDt = new Date(y, mo - 1, d, hr, mn);
    const endDt = new Date(startDt);
    endDt.setHours(endDt.getHours() + parseFloat(duration));

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

  return (
    <>
      {open ? <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} /> : null}

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
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
            <div className="flex gap-2">
              <input
                type="text"
                data-testid="input-team-member"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Add team member name…"
                value={teamInput}
                onChange={(e) => setTeamInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTeamMember(); } }}
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

        <div className="shrink-0 px-5 py-4 border-t border-slate-100">
          <Button
            onClick={handleSave}
            loading={saveMutation.isPending || createCustomerMutation.isPending}
            className="w-full justify-center"
            data-testid="btn-save-quick-add"
          >
            Save & Schedule Clean
          </Button>
        </div>
      </div>
    </>
  );
}
