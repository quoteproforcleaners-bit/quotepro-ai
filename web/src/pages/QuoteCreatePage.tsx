import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiPost } from "../lib/api";
import { queryClient } from "../lib/queryClient";
import { ArrowLeft, ArrowRight, Check, Plus } from "lucide-react";

const steps = ["Customer", "Property", "Services", "Review"];

const conditionOptions = [
  { value: "well-maintained", label: "Well Maintained" },
  { value: "average", label: "Average" },
  { value: "needs-attention", label: "Needs Attention" },
  { value: "heavy-cleaning", label: "Heavy Cleaning Needed" },
];

const frequencyOptions = [
  { value: "one-time", label: "One Time" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
];

const addOnOptions = [
  { key: "insideFridge", label: "Inside Fridge" },
  { key: "insideOven", label: "Inside Oven" },
  { key: "insideCabinets", label: "Inside Cabinets" },
  { key: "interiorWindows", label: "Interior Windows" },
  { key: "baseboardsDetail", label: "Baseboards Detail" },
  { key: "blindsDetail", label: "Blinds Detail" },
  { key: "laundryFoldOnly", label: "Laundry (Fold Only)" },
  { key: "dishes", label: "Dishes" },
  { key: "organizationTidy", label: "Organization & Tidy" },
];

export default function QuoteCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [customerId, setCustomerId] = useState("");
  const [newCustomer, setNewCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", address: "",
  });
  const [property, setProperty] = useState({
    beds: 3, baths: 2, sqft: 1500, condition: "average",
  });
  const [services, setServices] = useState({
    frequency: "one-time",
    addOns: {} as Record<string, boolean>,
  });

  const { data: customers = [] } = useQuery<any[]>({ queryKey: ["/api/customers"] });
  const { data: pricing } = useQuery<any>({ queryKey: ["/api/pricing"] });

  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/customers", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/customers"] }),
  });

  const createQuoteMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/quotes", data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      navigate(`/quotes/${data.id}`);
    },
  });

  const calculatePrice = () => {
    if (!pricing) return { good: 0, better: 0, best: 0 };
    const baseRate = Number(pricing.baseRate || 120);
    const sqftMultiplier = property.sqft / 1000;
    const bedMultiplier = 1 + (property.beds - 1) * 0.1;
    const bathMultiplier = 1 + (property.baths - 1) * 0.15;
    const conditionMultipliers: Record<string, number> = {
      "well-maintained": 0.9, average: 1.0, "needs-attention": 1.2, "heavy-cleaning": 1.5,
    };
    const condMult = conditionMultipliers[property.condition] || 1.0;
    const basePrice = baseRate * sqftMultiplier * bedMultiplier * bathMultiplier * condMult;
    const freqDiscounts: Record<string, number> = {
      "one-time": 1.0, weekly: 0.75, biweekly: 0.85, monthly: 0.9,
    };
    const freqMult = freqDiscounts[services.frequency] || 1.0;
    const price = basePrice * freqMult;
    return {
      good: Math.round(price * 0.85),
      better: Math.round(price),
      best: Math.round(price * 1.2),
    };
  };

  const prices = calculatePrice();

  const handleSubmit = async () => {
    let cid = customerId;

    if (newCustomer) {
      try {
        const c: any = await createCustomerMutation.mutateAsync(customerForm);
        cid = c.id;
      } catch { return; }
    }

    const selectedCustomer = customers.find((c: any) => c.id === cid);

    const quoteData = {
      customerId: cid || undefined,
      customerName: selectedCustomer
        ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim()
        : newCustomer
        ? `${customerForm.firstName} ${customerForm.lastName}`.trim()
        : undefined,
      status: "draft",
      total: prices.better,
      frequencySelected: services.frequency,
      recommendedOption: "better",
      selectedOption: "better",
      options: {
        good: { price: prices.good, name: "Good - Essential Clean" },
        better: { price: prices.better, name: "Better - Deep Clean" },
        best: { price: prices.best, name: "Best - Premium Service" },
      },
      addOns: Object.fromEntries(
        Object.entries(services.addOns).map(([k, v]) => [k, { selected: v, price: 0 }])
      ),
      propertyDetails: {
        quoteType: "residential",
        beds: property.beds,
        baths: property.baths,
        sqft: property.sqft,
        condition: property.condition,
        customerName: selectedCustomer
          ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim()
          : newCustomer
          ? `${customerForm.firstName} ${customerForm.lastName}`.trim()
          : "",
        customerAddress: selectedCustomer?.address || customerForm.address || "",
      },
    };

    createQuoteMutation.mutate(quoteData);
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/quotes")}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to quotes
      </button>

      <h1 className="text-2xl font-bold text-slate-900">New Quote</h1>

      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < step
                  ? "bg-primary-600 text-white"
                  : i === step
                  ? "bg-primary-100 text-primary-700 ring-2 ring-primary-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm hidden sm:inline ${
              i === step ? "font-medium text-slate-900" : "text-slate-400"
            }`}>{s}</span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-slate-200 hidden sm:block" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-900">Select Customer</h2>
            {!newCustomer ? (
              <>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select a customer...</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} {c.email ? `(${c.email})` : ""}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setNewCustomer(true)}
                  className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add new customer
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    placeholder="First name"
                    value={customerForm.firstName}
                    onChange={(e) => setCustomerForm(p => ({ ...p, firstName: e.target.value }))}
                    className="h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    placeholder="Last name"
                    value={customerForm.lastName}
                    onChange={(e) => setCustomerForm(p => ({ ...p, lastName: e.target.value }))}
                    className="h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <input
                  placeholder="Email"
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <input
                  placeholder="Phone"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <input
                  placeholder="Address"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={() => setNewCustomer(false)}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Select existing customer instead
                </button>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-900">Property Details</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Bedrooms</label>
                <input
                  type="number" min={1} max={10}
                  value={property.beds}
                  onChange={(e) => setProperty(p => ({ ...p, beds: +e.target.value }))}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Bathrooms</label>
                <input
                  type="number" min={1} max={10} step={0.5}
                  value={property.baths}
                  onChange={(e) => setProperty(p => ({ ...p, baths: +e.target.value }))}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Sq Ft</label>
                <input
                  type="number" min={100} step={100}
                  value={property.sqft}
                  onChange={(e) => setProperty(p => ({ ...p, sqft: +e.target.value }))}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Condition</label>
                <select
                  value={property.condition}
                  onChange={(e) => setProperty(p => ({ ...p, condition: e.target.value }))}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {conditionOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-semibold text-slate-900">Service Options</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Frequency</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {frequencyOptions.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setServices(s => ({ ...s, frequency: o.value }))}
                    className={`h-11 rounded-lg text-sm font-medium border transition-colors ${
                      services.frequency === o.value
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Add-Ons</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {addOnOptions.map((o) => (
                  <label
                    key={o.key}
                    className={`flex items-center gap-3 h-11 px-3 rounded-lg border cursor-pointer transition-colors ${
                      services.addOns[o.key]
                        ? "border-primary-500 bg-primary-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!services.addOns[o.key]}
                      onChange={() =>
                        setServices(s => ({
                          ...s,
                          addOns: { ...s.addOns, [o.key]: !s.addOns[o.key] },
                        }))
                      }
                      className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700">{o.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-semibold text-slate-900">Review & Create</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(["good", "better", "best"] as const).map((tier) => (
                <div
                  key={tier}
                  className={`rounded-xl border-2 p-5 ${
                    tier === "better" ? "border-primary-500 bg-primary-50" : "border-slate-200"
                  }`}
                >
                  {tier === "better" && (
                    <span className="text-[10px] font-semibold uppercase bg-primary-600 text-white px-2 py-0.5 rounded mb-2 inline-block">
                      Recommended
                    </span>
                  )}
                  <h3 className="font-semibold text-slate-900 capitalize">{tier}</h3>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    ${prices[tier].toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-1">
              <p>Property: {property.beds} bed, {property.baths} bath, {property.sqft} sqft</p>
              <p>Condition: <span className="capitalize">{property.condition.replace(/-/g, " ")}</span></p>
              <p>Frequency: <span className="capitalize">{services.frequency.replace(/-/g, " ")}</span></p>
              {Object.entries(services.addOns).filter(([, v]) => v).length > 0 && (
                <p>Add-ons: {Object.entries(services.addOns).filter(([, v]) => v).map(([k]) => 
                  addOnOptions.find(o => o.key === k)?.label || k
                ).join(", ")}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => step > 0 ? setStep(step - 1) : navigate("/quotes")}
          className="flex items-center gap-1.5 h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 0 ? "Cancel" : "Back"}
        </button>
        {step < steps.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="flex items-center gap-1.5 h-10 px-4 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={createQuoteMutation.isPending}
            className="flex items-center gap-1.5 h-10 px-5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60"
          >
            {createQuoteMutation.isPending ? "Creating..." : "Create Quote"}
          </button>
        )}
      </div>
    </div>
  );
}
