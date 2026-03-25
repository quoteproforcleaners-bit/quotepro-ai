import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useSubscription } from "../lib/subscription";
import { buildAddress } from "../lib/address";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiPost, apiRequest } from "../lib/api";
import { queryClient } from "../lib/queryClient";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Home,
  Building,
  Search,
  Sparkles,
  FileText,
  Pencil,
} from "lucide-react";
import { PageHeader, Card, CardHeader, Button, Badge, Alert } from "../components/ui";
import { computeResidentialQuote } from "../lib/pricingEngine";
import { ResidentialLivePreview, LivePreviewPanel } from "../components/LiveQuotePreview";
import type { ManualAdjustment } from "../components/LiveQuotePreview";

const steps = ["Customer", "Property", "Services", "Review"];

const homeTypeOptions = [
  { value: "house", label: "House", icon: Home },
  { value: "apartment", label: "Apartment", icon: Building },
  { value: "townhome", label: "Townhome", icon: Home },
];

const petTypeOptions = [
  { value: "none", label: "No Pets" },
  { value: "cat", label: "Cat" },
  { value: "dog", label: "Dog" },
  { value: "multiple", label: "Multiple Pets" },
];

const frequencyOptions = [
  { value: "one-time", label: "One Time", discount: null },
  { value: "weekly", label: "Weekly", discount: "Best value" },
  { value: "biweekly", label: "Biweekly", discount: "Popular" },
  { value: "monthly", label: "Monthly", discount: "Save" },
];

const addOnOptions = [
  { key: "insideFridge", label: "Inside Fridge", hours: 0.5 },
  { key: "insideOven", label: "Inside Oven", hours: 0.5 },
  { key: "insideCabinets", label: "Inside Cabinets", hours: 1.0 },
  { key: "interiorWindows", label: "Interior Windows", hours: 1.0 },
  { key: "blindsDetail", label: "Blinds Detail", hours: 1.0 },
  { key: "baseboardsDetail", label: "Baseboards Detail", hours: 1.0 },
  { key: "laundryFoldOnly", label: "Laundry (Fold Only)", hours: 0.5 },
  { key: "dishes", label: "Dishes", hours: 0.5 },
  { key: "organizationTidy", label: "Organization & Tidy", hours: 1.0 },
];

const DEFAULT_ADD_ON_PRICES: Record<string, number> = {
  insideFridge: 25,
  insideOven: 25,
  insideCabinets: 40,
  interiorWindows: 40,
  blindsDetail: 35,
  baseboardsDetail: 35,
  laundryFoldOnly: 20,
  dishes: 15,
  organizationTidy: 45,
};

interface PropertyState {
  beds: number;
  halfBaths: number;
  baths: number;
  sqft: number;
  homeType: string;
  conditionScore: number;
  peopleCount: number;
  petType: string;
  petShedding: boolean;
}

const conditionLabels: Record<number, string> = {
  1: "Very Dirty",
  2: "Dirty",
  3: "Below Average",
  4: "Fair",
  5: "Average",
  6: "Above Average",
  7: "Clean",
  8: "Very Clean",
  9: "Near Spotless",
  10: "Spotless",
};

function StepperButton({
  value,
  onDecrease,
  onIncrease,
}: {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={onDecrease}
        className="w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 text-lg flex items-center justify-center transition-colors"
      >
        -
      </button>
      <span className="w-8 text-center font-semibold text-slate-900 text-sm">
        {value}
      </span>
      <button
        onClick={onIncrease}
        className="w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 text-lg flex items-center justify-center transition-colors"
      >
        +
      </button>
    </div>
  );
}

export default function QuoteCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { quotesPerMonth, startCheckout } = useSubscription();
  const [step, setStep] = useState(0);
  const [dismissedNudge, setDismissedNudge] = useState(false);
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [newCustomer, setNewCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedOption, setSelectedOption] = useState<
    "good" | "better" | "best"
  >("better");
  const [recommendedOption, setRecommendedOption] = useState<
    "good" | "better" | "best"
  >("better");
  const [customerForm, setCustomerForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  });
  const [property, setProperty] = useState<PropertyState>({
    beds: 3,
    halfBaths: 0,
    baths: 2,
    sqft: 1500,
    homeType: "house",
    conditionScore: 7,
    peopleCount: 2,
    petType: "none",
    petShedding: false,
  });
  const [services, setServices] = useState({
    frequency: "one-time",
    addOns: {} as Record<string, boolean>,
  });
  const [preferredDate, setPreferredDate] = useState("");
  const [aiScopes, setAiScopes] = useState<{good: string; better: string; best: string} | null>(null);
  const [aiScopesLoading, setAiScopesLoading] = useState(false);
  const [aiPricing, setAiPricing] = useState<any | null>(null);
  const [aiPricingLoading, setAiPricingLoading] = useState(false);
  const [aiPriceOverrides, setAiPriceOverrides] = useState<{good: number; better: number; best: number} | null>(null);
  const [manualEdits, setManualEdits] = useState<Set<string>>(new Set());
  const [editingTier, setEditingTier] = useState<"good" | "better" | "best" | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [adjustment, setAdjustment] = useState<ManualAdjustment>({ amount: 0, note: "" });

  // Pre-fill from intake request URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("intakeId");
    if (!id) return;

    setIntakeId(id);
    setNewCustomer(true);

    // Customer info
    const fullName = (params.get("name") || "").trim();
    const spaceIdx = fullName.indexOf(" ");
    const firstName = spaceIdx > -1 ? fullName.slice(0, spaceIdx) : fullName;
    const lastName = spaceIdx > -1 ? fullName.slice(spaceIdx + 1) : "";

    setCustomerForm((prev) => ({
      ...prev,
      firstName,
      lastName,
      email: params.get("email") || "",
      phone: params.get("phone") || "",
      street: params.get("address") || "",
    }));

    // Property
    const beds = parseInt(params.get("beds") || "");
    const baths = parseFloat(params.get("baths") || "");
    const sqft = parseInt(params.get("sqft") || "");
    const petType = params.get("petType") || "none";

    setProperty((prev) => ({
      ...prev,
      ...(beds > 0 ? { beds } : {}),
      ...(baths > 0 ? { baths: Math.floor(baths), halfBaths: baths % 1 >= 0.5 ? 1 : 0 } : {}),
      ...(sqft > 0 ? { sqft } : {}),
      petType: ["none", "cat", "dog", "multiple"].includes(petType) ? petType : "none",
    }));

    // Frequency
    const freq = params.get("frequency");
    if (freq && ["one-time", "weekly", "biweekly", "monthly"].includes(freq)) {
      setServices((prev) => ({ ...prev, frequency: freq }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });
  const { data: pricing } = useQuery<any>({ queryKey: ["/api/pricing"] });

  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/customers", data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] }),
  });

  const createQuoteMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/quotes", data),
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/intake-requests/count"] });
      if (intakeId) {
        try {
          await apiRequest("PATCH", `/api/intake-requests/${intakeId}`, { status: "converted" });
          queryClient.invalidateQueries({ queryKey: ["/api/intake-requests"] });
        } catch {
          // non-fatal — quote was created successfully
        }
      }
      navigate(`/quotes/${data.id}`);
    },
    onError: (err: any) => {
      setSubmitError(err?.message || "Failed to create quote. Please try again.");
    },
  });

  const quote = useMemo(
    () => computeResidentialQuote(property, services.addOns, services.frequency, pricing ?? null),
    [property, services.addOns, services.frequency, pricing]
  );

  const commitPriceEdit = (tier: "good" | "better" | "best") => {
    const parsed = parseFloat(editingValue.replace(/[^0-9.]/g, ""));
    if (!isNaN(parsed) && parsed > 0) {
      const base = {
        good: aiPriceOverrides?.good ?? quote.good.price,
        better: aiPriceOverrides?.better ?? quote.better.price,
        best: aiPriceOverrides?.best ?? quote.best.price,
      };
      setAiPriceOverrides({ ...base, [tier]: Math.round(parsed) });
      setManualEdits((prev) => new Set(prev).add(tier));
    }
    setEditingTier(null);
    setEditingValue("");
  };

  const generateAiScopes = async () => {
    setAiScopesLoading(true);
    try {
      const res: any = await apiPost("/api/ai/quote-descriptions", {
        homeDetails: property,
        serviceTypes: {
          good: quote.good.name,
          better: quote.better.name,
          best: quote.best.name,
        },
        addOns: services.addOns,
        companyName: (pricing as any)?.companyName || undefined,
      });
      setAiScopes(res);
    } catch {
      // silently ignore — requirePro may block non-Growth/Pro users
    }
    setAiScopesLoading(false);
  };

  const generateAiPricing = async () => {
    setAiPricingLoading(true);
    try {
      const res: any = await apiPost("/api/ai/pricing-suggestion", {
        homeDetails: property,
        addOns: services.addOns,
        frequency: services.frequency,
        currentPrices: {
          good: quote.good.price,
          better: quote.better.price,
          best: quote.best.price,
        },
        pricingSettings: pricing,
      });
      setAiPricing(res);
    } catch {
      // silently ignore
    }
    setAiPricingLoading(false);
  };

  const filteredCustomers = customers.filter((c: any) => {
    if (!customerSearch) return true;
    const term = customerSearch.toLowerCase();
    return (
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) ||
      (c.email || "").toLowerCase().includes(term) ||
      (c.phone || "").includes(term)
    );
  });

  const selectedCustomer = customers.find((c: any) => c.id === customerId);

  const canAdvance = () => {
    if (step === 0)
      return customerId || (newCustomer && customerForm.firstName);
    if (step === 1) return property.sqft > 0;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    let cid = customerId;
    if (newCustomer) {
      try {
        const { street, city, state, zip, country, ...formRest } = customerForm;
        const c: any = await createCustomerMutation.mutateAsync({
          ...formRest,
          address: buildAddress({ street, city, state, zip, country }),
        });
        cid = c.id;
      } catch {
        return;
      }
    }

    const custName = selectedCustomer
      ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim()
      : newCustomer
      ? `${customerForm.firstName} ${customerForm.lastName}`.trim()
      : undefined;

    const selected = quote[selectedOption];
    const goodPrice = aiPriceOverrides?.good ?? quote.good.price;
    const betterPrice = aiPriceOverrides?.better ?? quote.better.price;
    const bestPrice = aiPriceOverrides?.best ?? quote.best.price;
    const finalPrices = { good: goodPrice, better: betterPrice, best: bestPrice };
    const finalPrice = finalPrices[selectedOption];

    const quoteData = {
      customerId: cid || undefined,
      customerName: custName,
      status: "draft",
      total: finalPrice,
      subtotal: finalPrice,
      tax: 0,
      propertyBeds: property.beds || 0,
      propertyBaths: (property.baths || 0) + (property.halfBaths || 0) * 0.5,
      propertySqft: property.sqft || 0,
      frequencySelected: services.frequency,
      recommendedOption,
      selectedOption,
      options: {
        good: {
          price: goodPrice,
          firstCleanPrice: quote.good.firstCleanPrice ?? undefined,
          name: "Good",
          serviceTypeName: quote.good.name || "Touch Up",
          serviceTypeId: quote.good.serviceTypeId || "touch-up",
          scope: aiScopes?.good || quote.good.scope || "",
          addOnsIncluded: [],
        },
        better: {
          price: betterPrice,
          firstCleanPrice: quote.better.firstCleanPrice ?? undefined,
          name: "Better",
          serviceTypeName: quote.better.name || "Standard Clean",
          serviceTypeId: quote.better.serviceTypeId || "standard",
          scope: aiScopes?.better || quote.better.scope || "",
          addOnsIncluded: addOnOptions.filter(o => services.addOns[o.key]).map(o => o.label),
        },
        best: {
          price: bestPrice,
          firstCleanPrice: quote.best.firstCleanPrice ?? undefined,
          name: "Best",
          serviceTypeName: quote.best.name || "Deep Clean",
          serviceTypeId: quote.best.serviceTypeId || "deep-clean",
          scope: aiScopes?.best || quote.best.scope || "",
          addOnsIncluded: ["Inside Oven", "Inside Cabinets", "Interior Windows", "Baseboards Detail", "Blinds Detail"],
        },
      },
      addOns: Object.fromEntries(
        addOnOptions.map((o) => [
          o.key,
          {
            selected: !!services.addOns[o.key],
            price: (pricing?.addOnPrices as any)?.[o.key] || 0,
          },
        ])
      ),
      propertyDetails: {
        quoteType: "residential",
        beds: property.beds,
        baths: property.baths,
        halfBaths: property.halfBaths,
        sqft: property.sqft,
        homeType: property.homeType,
        conditionScore: property.conditionScore,
        peopleCount: property.peopleCount,
        petType: property.petType,
        petShedding: property.petShedding,
        condition: conditionLabels[property.conditionScore] || "Average",
        customerName: custName || "",
        customerAddress:
          selectedCustomer?.address || buildAddress({ street: customerForm.street, city: customerForm.city, state: customerForm.state, zip: customerForm.zip, country: customerForm.country }) || "",
      },
      preferredDate: preferredDate || undefined,
    };

    createQuoteMutation.mutate(quoteData);
  };

  const quotaUsed = (user as any)?.quotesThisMonth ?? 0;
  const isQuotaCapped = quotesPerMonth !== Infinity;
  const quotaPct = isQuotaCapped ? quotaUsed / quotesPerMonth : 0;
  const showQuotaNudge = !dismissedNudge && isQuotaCapped && quotaPct >= 0.8;

  return (
    <div className="flex gap-6 items-start">
      {/* ─── Left: form ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
      <PageHeader title="New Quote" backTo="/quotes" />

      {showQuotaNudge && (
        <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              {quotaUsed >= quotesPerMonth
                ? `You've used all ${quotesPerMonth} quotes this month`
                : `${quotaUsed} of ${quotesPerMonth} quotes used this month`}
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Upgrade to Growth for unlimited quotes and AI tools.{" "}
              <button
                onClick={() => startCheckout("growth", "monthly")}
                className="underline font-semibold hover:text-amber-900"
              >
                Upgrade now
              </button>
            </p>
          </div>
          <button
            onClick={() => setDismissedNudge(true)}
            className="text-amber-400 hover:text-amber-600 shrink-0 ml-1"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-center gap-0 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  i < step
                    ? "bg-primary-600 text-white shadow-sm shadow-primary-600/20"
                    : i === step
                    ? "bg-primary-100 text-primary-700 ring-2 ring-primary-500 ring-offset-2"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-sm hidden sm:inline ${
                  i === step
                    ? "font-semibold text-slate-900"
                    : i < step
                    ? "font-medium text-primary-600"
                    : "text-slate-400"
                }`}
              >
                {s}
              </span>
            </div>
            {i < steps.length - 1 ? (
              <div
                className={`flex-1 h-0.5 mx-3 rounded ${
                  i < step ? "bg-primary-400" : "bg-slate-200"
                }`}
              />
            ) : null}
          </div>
        ))}
      </div>

      <Card className="mb-6">
        {step === 0 ? (
          <div className="space-y-4">
            {intakeId ? (
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-800">Pre-filled from quote request</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Customer info, property details, and frequency have been mapped automatically. Review and adjust as needed before continuing.
                  </p>
                </div>
              </div>
            ) : null}
            <CardHeader title="Select Customer" icon={FileText} />
            {!newCustomer ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search customers by name, email, or phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-lg border border-slate-200 hover:border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {filteredCustomers.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => setCustomerId(c.id)}
                      className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-all ${
                        customerId === c.id
                          ? "bg-primary-50 border-2 border-primary-400 shadow-sm shadow-primary-600/5"
                          : "hover:bg-slate-50 border-2 border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">
                          {(c.firstName?.[0] || "").toUpperCase()}
                          {(c.lastName?.[0] || "").toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {c.firstName} {c.lastName}
                            {c.isVip ? (
                              <span className="ml-2 text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                                VIP
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-slate-500">
                            {c.email || c.phone || "No contact info"}
                          </p>
                        </div>
                      </div>
                      {customerId === c.id ? (
                        <Check className="w-4 h-4 text-primary-600" />
                      ) : null}
                    </button>
                  ))}
                  {filteredCustomers.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">
                      No customers found
                    </p>
                  ) : null}
                </div>
                <button
                  onClick={() => setNewCustomer(true)}
                  className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium mt-2"
                >
                  <Plus className="w-4 h-4" />
                  Add new customer
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      key: "firstName",
                      label: "First name *",
                      placeholder: "Jane",
                    },
                    {
                      key: "lastName",
                      label: "Last name",
                      placeholder: "Smith",
                    },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        {f.label}
                      </label>
                      <input
                        placeholder={f.placeholder}
                        value={(customerForm as any)[f.key]}
                        onChange={(e) =>
                          setCustomerForm((p) => ({
                            ...p,
                            [f.key]: e.target.value,
                          }))
                        }
                        className="w-full h-11 px-3.5 rounded-lg border border-slate-200 hover:border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                      />
                    </div>
                  ))}
                </div>
                {[
                  {
                    key: "email",
                    label: "Email",
                    placeholder: "jane@email.com",
                    type: "email",
                  },
                  {
                    key: "phone",
                    label: "Phone",
                    placeholder: "(555) 123-4567",
                    type: "tel",
                  },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {f.label}
                    </label>
                    <input
                      type={f.type}
                      placeholder={f.placeholder}
                      value={(customerForm as any)[f.key]}
                      onChange={(e) =>
                        setCustomerForm((p) => ({
                          ...p,
                          [f.key]: e.target.value,
                        }))
                      }
                      className="w-full h-11 px-3.5 rounded-lg border border-slate-200 hover:border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                    />
                  </div>
                ))}
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Property Address</p>
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      placeholder="Street"
                      value={customerForm.street}
                      onChange={(e) => setCustomerForm((p) => ({ ...p, street: e.target.value }))}
                      className="w-full h-11 px-3.5 rounded-lg border border-slate-200 hover:border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                    />
                    <div className="grid grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="City"
                        value={customerForm.city}
                        onChange={(e) => setCustomerForm((p) => ({ ...p, city: e.target.value }))}
                        className="w-full h-11 px-3.5 rounded-lg border border-slate-200 hover:border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="State"
                        value={customerForm.state}
                        onChange={(e) => setCustomerForm((p) => ({ ...p, state: e.target.value }))}
                        className="w-full h-11 px-3.5 rounded-lg border border-slate-200 hover:border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="Zip / Postal Code"
                        value={customerForm.zip}
                        onChange={(e) => setCustomerForm((p) => ({ ...p, zip: e.target.value }))}
                        className="w-full h-11 px-3.5 rounded-lg border border-slate-200 hover:border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                      />
                      <input
                        type="text"
                        placeholder="Country (US)"
                        value={customerForm.country}
                        onChange={(e) => setCustomerForm((p) => ({ ...p, country: e.target.value }))}
                        className="w-full h-11 px-3.5 rounded-lg border border-slate-200 hover:border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Preferred Date (optional)
                  </label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-200 hover:border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  />
                </div>
                <button
                  onClick={() => setNewCustomer(false)}
                  className="text-sm text-slate-500 hover:text-slate-700 font-medium"
                >
                  Select existing customer instead
                </button>
              </div>
            )}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-6">
            <CardHeader title="Property Details" icon={Home} />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Home Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {homeTypeOptions.map((o) => (
                  <button
                    key={o.value}
                    onClick={() =>
                      setProperty((p) => ({ ...p, homeType: o.value }))
                    }
                    className={`h-12 rounded-xl text-sm font-medium border-2 transition-all flex items-center justify-center gap-2 ${
                      property.homeType === o.value
                        ? "border-primary-500 bg-primary-50 text-primary-700 shadow-sm shadow-primary-600/5"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <o.icon className="w-4 h-4" />
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Square Footage
                </label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={property.sqft}
                  onChange={(e) =>
                    setProperty((p) => ({ ...p, sqft: +e.target.value }))
                  }
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-200 hover:border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bedrooms
                </label>
                <StepperButton
                  value={property.beds}
                  onDecrease={() =>
                    setProperty((p) => ({
                      ...p,
                      beds: Math.max(1, p.beds - 1),
                    }))
                  }
                  onIncrease={() =>
                    setProperty((p) => ({
                      ...p,
                      beds: Math.min(10, p.beds + 1),
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Baths
                </label>
                <StepperButton
                  value={property.baths}
                  onDecrease={() =>
                    setProperty((p) => ({
                      ...p,
                      baths: Math.max(1, p.baths - 1),
                    }))
                  }
                  onIncrease={() =>
                    setProperty((p) => ({
                      ...p,
                      baths: Math.min(10, p.baths + 1),
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Half Baths
                </label>
                <StepperButton
                  value={property.halfBaths}
                  onDecrease={() =>
                    setProperty((p) => ({
                      ...p,
                      halfBaths: Math.max(0, p.halfBaths - 1),
                    }))
                  }
                  onIncrease={() =>
                    setProperty((p) => ({
                      ...p,
                      halfBaths: Math.min(5, p.halfBaths + 1),
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cleanliness:{" "}
                <span className="text-primary-600 font-semibold">
                  {conditionLabels[property.conditionScore]}
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={property.conditionScore}
                onChange={(e) =>
                  setProperty((p) => ({
                    ...p,
                    conditionScore: +e.target.value,
                  }))
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Very Dirty</span>
                <span>Spotless</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Number of Residents
                </label>
                <StepperButton
                  value={property.peopleCount}
                  onDecrease={() =>
                    setProperty((p) => ({
                      ...p,
                      peopleCount: Math.max(1, p.peopleCount - 1),
                    }))
                  }
                  onIncrease={() =>
                    setProperty((p) => ({
                      ...p,
                      peopleCount: Math.min(10, p.peopleCount + 1),
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Pets
                </label>
                <select
                  value={property.petType}
                  onChange={(e) =>
                    setProperty((p) => ({ ...p, petType: e.target.value }))
                  }
                  className="w-full h-11 px-3 rounded-lg border border-slate-200 hover:border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white transition-colors"
                >
                  {petTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {property.petType !== "none" ? (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={property.petShedding}
                  onChange={() =>
                    setProperty((p) => ({
                      ...p,
                      petShedding: !p.petShedding,
                    }))
                  }
                  className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-700">Heavy shedding</span>
              </label>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <CardHeader title="Service Options" icon={Sparkles} />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cleaning Frequency
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {frequencyOptions.map((o) => (
                  <button
                    key={o.value}
                    onClick={() =>
                      setServices((s) => ({ ...s, frequency: o.value }))
                    }
                    className={`h-16 rounded-xl text-sm font-medium border-2 transition-all flex flex-col items-center justify-center ${
                      services.frequency === o.value
                        ? "border-primary-500 bg-primary-50 text-primary-700 shadow-sm shadow-primary-600/5"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    {o.label}
                    {o.discount ? (
                      <span
                        className={`text-[10px] mt-0.5 font-medium ${
                          services.frequency === o.value
                            ? "text-primary-500"
                            : "text-emerald-500"
                        }`}
                      >
                        {o.discount}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Add-Ons
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {addOnOptions.map((o) => {
                  const effectiveAddOnPrices = { ...DEFAULT_ADD_ON_PRICES, ...(pricing?.addOnPrices || {}) };
                  const price = effectiveAddOnPrices[o.key] || 0;
                  return (
                    <label
                      key={o.key}
                      className={`flex items-center justify-between gap-3 h-12 px-4 rounded-xl border-2 cursor-pointer transition-all ${
                        services.addOns[o.key]
                          ? "border-primary-400 bg-primary-50/50"
                          : "border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={!!services.addOns[o.key]}
                          onChange={() =>
                            setServices((s) => ({
                              ...s,
                              addOns: {
                                ...s.addOns,
                                [o.key]: !s.addOns[o.key],
                              },
                            }))
                          }
                          className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-slate-700">
                          {o.label}
                        </span>
                      </div>
                      {price > 0 ? (
                        <span className="text-xs text-slate-400 font-medium">
                          +${price}
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-sm text-slate-500 mb-1">
                Estimated base labor
              </p>
              <p className="text-xl font-bold text-slate-900">
                {quote.baseHours} hours
              </p>
              {quote.addOnHours > 0 ? (
                <p className="text-sm text-slate-500 mt-0.5">
                  + {quote.addOnHours} hours add-ons
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <CardHeader title="Review & Create" icon={Check} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["good", "better", "best"] as const).map((tier) => {
                const data = quote[tier];
                const isSelected = selectedOption === tier;
                const isRecommended = recommendedOption === tier;
                const displayPrice = aiPriceOverrides?.[tier] ?? data.price;
                const aiScope = aiScopes?.[tier];
                return (
                  <div key={tier} className="relative">
                    <button
                      onClick={() => setSelectedOption(tier)}
                      className={`w-full text-left rounded-xl border-2 p-5 transition-all ${
                        isSelected
                          ? "border-primary-500 bg-primary-50/50 shadow-sm shadow-primary-600/5"
                          : aiPriceOverrides
                          ? "border-emerald-400 hover:border-emerald-500"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 capitalize">
                          {tier}
                        </h3>
                        {isRecommended ? (
                          <span className="text-[10px] font-semibold uppercase bg-primary-600 text-white px-2 py-0.5 rounded-full">
                            Recommended
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-500">{data.name}</p>
                      {data.firstCleanPrice ? (
                        <>
                          <p className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">
                            ${data.firstCleanPrice.toFixed(0)}
                            <span className="text-xs font-normal text-slate-400 ml-1">first visit</span>
                          </p>
                          <div
                            className="flex items-center gap-1 mt-0.5 group/price cursor-text"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTier(tier);
                              setEditingValue(String(displayPrice.toFixed(0)));
                            }}
                          >
                            {editingTier === tier ? (
                              <input
                                autoFocus
                                type="number"
                                min={1}
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => commitPriceEdit(tier)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitPriceEdit(tier);
                                  if (e.key === "Escape") { setEditingTier(null); setEditingValue(""); }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-20 text-sm font-semibold text-slate-900 border border-primary-400 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            ) : (
                              <p className="text-xs text-slate-500 font-medium">
                                ${displayPrice.toFixed(0)}/visit thereafter
                                {manualEdits.has(tier) ? (
                                  <span className="text-primary-600 font-semibold ml-1">Edited</span>
                                ) : aiPriceOverrides ? (
                                  <span className="text-emerald-600 font-semibold ml-1">AI</span>
                                ) : null}
                              </p>
                            )}
                            {editingTier !== tier ? (
                              <Pencil className="w-3 h-3 text-slate-300 group-hover/price:text-primary-500 transition-colors" />
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <div
                          className="flex items-center gap-1.5 mt-2 group/price cursor-text"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTier(tier);
                            setEditingValue(String(displayPrice.toFixed(0)));
                          }}
                        >
                          {editingTier === tier ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <span className="text-2xl font-bold text-slate-900 tracking-tight">$</span>
                              <input
                                autoFocus
                                type="number"
                                min={1}
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => commitPriceEdit(tier)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitPriceEdit(tier);
                                  if (e.key === "Escape") { setEditingTier(null); setEditingValue(""); }
                                }}
                                className="w-24 text-2xl font-bold text-slate-900 border border-primary-400 rounded px-2 py-0.5 tracking-tight focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                          ) : (
                            <>
                              <p className="text-2xl font-bold text-slate-900 tracking-tight">
                                ${displayPrice.toFixed(0)}
                                {manualEdits.has(tier) ? (
                                  <span className="text-xs font-normal text-primary-600 ml-1.5">Edited</span>
                                ) : aiPriceOverrides ? (
                                  <span className="text-xs font-normal text-emerald-600 ml-1.5">AI</span>
                                ) : null}
                              </p>
                              <Pencil className="w-3.5 h-3.5 text-slate-300 group-hover/price:text-primary-500 transition-colors mb-0.5" />
                            </>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mt-1 line-clamp-3">
                        {aiScope ? aiScope : data.scope}
                      </p>
                      {aiScope ? (
                        <span className="inline-flex items-center gap-0.5 mt-1 text-[10px] text-primary-600 font-medium">
                          <Sparkles className="w-2.5 h-2.5" /> AI Description
                        </span>
                      ) : null}
                      {isSelected ? (
                        <div className="mt-3 flex items-center gap-1 text-primary-600 text-xs font-medium">
                          <Check className="w-3.5 h-3.5" /> Selected
                        </div>
                      ) : null}
                    </button>
                    {!isRecommended ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRecommendedOption(tier);
                        }}
                        className="mt-1.5 w-full text-center text-[11px] text-slate-400 hover:text-primary-600 transition-colors py-1 rounded-lg hover:bg-primary-50"
                      >
                        Set as Recommended
                      </button>
                    ) : (
                      <div className="mt-1.5 h-7" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* AI Tools Row */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={Sparkles}
                onClick={generateAiScopes}
                loading={aiScopesLoading}
                className="!border-blue-400 !text-blue-700 hover:!border-blue-500 hover:!bg-blue-50"
              >
                {aiScopes ? "Regenerate Descriptions" : "AI Describe Tiers"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={FileText}
                onClick={generateAiPricing}
                loading={aiPricingLoading}
                className="!border-emerald-400 !text-emerald-700 hover:!border-emerald-500 hover:!bg-emerald-50"
              >
                {aiPricing ? "Refresh Price Insight" : "AI Suggest Prices"}
              </Button>
              {aiPriceOverrides ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setAiPriceOverrides(null); setManualEdits(new Set()); }}
                >
                  Reset to Calculated Prices
                </Button>
              ) : null}
            </div>

            {/* AI Pricing Suggestion Panel */}
            {aiPricing ? (
              <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-sm font-semibold text-emerald-900">AI Pricing Insight</span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                    aiPricing.confidence === "high"
                      ? "bg-green-100 text-green-700"
                      : aiPricing.confidence === "medium"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {aiPricing.confidence} confidence
                  </span>
                </div>
                {aiPricing.keyInsight ? (
                  <p className="text-xs text-emerald-700 italic">{aiPricing.keyInsight}</p>
                ) : null}
                <div className="grid grid-cols-3 gap-2">
                  {(["good", "better", "best"] as const).map((tier) => {
                    const suggestion = aiPricing[tier];
                    const basePrice = (aiPricing.baselinePrices as any)?.[tier] ?? quote[tier].price;
                    const diff = suggestion.suggestedPrice - basePrice;
                    const isAboveBase = diff > 0;
                    const isAtBase = suggestion.flooredToBase || diff === 0;
                    return (
                      <div key={tier} className={`rounded-lg p-3 border ${isAboveBase ? "bg-white border-green-200" : "bg-white border-slate-100"}`}>
                        <p className="text-xs text-slate-500 capitalize mb-1">{tier}</p>
                        <p className="text-lg font-bold text-slate-900">${suggestion.suggestedPrice}</p>
                        {isAboveBase ? (
                          <p className="text-[11px] font-semibold text-green-600">+${diff.toFixed(0)} above base</p>
                        ) : isAtBase ? (
                          <p className="text-[11px] font-medium text-slate-400">Base price</p>
                        ) : null}
                        {suggestion.reasoning ? (
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{suggestion.reasoning}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                {aiPricing.overallAssessment ? (
                  <p className="text-xs text-emerald-800">{aiPricing.overallAssessment}</p>
                ) : null}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => setAiPriceOverrides({
                      good: aiPricing.good.suggestedPrice,
                      better: aiPricing.better.suggestedPrice,
                      best: aiPricing.best.suggestedPrice,
                    })}
                  >
                    Apply AI Prices
                  </Button>
                  <p className="text-[11px] text-slate-400">AI prices are always at or above your formula minimum.</p>
                </div>
              </div>
            ) : null}

            <div className="bg-slate-50 rounded-xl p-5">
              <h3 className="font-semibold text-slate-900 text-sm mb-4">
                Quote Summary
              </h3>
              <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
                <span className="text-slate-500">Customer</span>
                <span className="text-slate-900 font-medium">
                  {selectedCustomer
                    ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                    : `${customerForm.firstName} ${customerForm.lastName}`}
                </span>
                <span className="text-slate-500">Property</span>
                <span className="text-slate-900">
                  {property.beds} bed, {property.baths} bath
                  {property.halfBaths > 0
                    ? ` + ${property.halfBaths} half`
                    : ""}
                  , {property.sqft.toLocaleString()} sqft
                </span>
                <span className="text-slate-500">Home Type</span>
                <span className="text-slate-900 capitalize">
                  {property.homeType}
                </span>
                <span className="text-slate-500">Cleanliness</span>
                <span className="text-slate-900">
                  {conditionLabels[property.conditionScore]} (
                  {property.conditionScore}/10)
                </span>
                <span className="text-slate-500">Residents</span>
                <span className="text-slate-900">{property.peopleCount}</span>
                <span className="text-slate-500">Pets</span>
                <span className="text-slate-900 capitalize">
                  {property.petType === "none"
                    ? "None"
                    : `${property.petType}${
                        property.petShedding ? " (heavy shedding)" : ""
                      }`}
                </span>
                <span className="text-slate-500">Frequency</span>
                <span className="text-slate-900 capitalize">
                  {services.frequency.replace(/-/g, " ")}
                </span>
                {Object.entries(services.addOns).filter(([, v]) => v).length >
                0 ? (
                  <>
                    <span className="text-slate-500">Add-ons</span>
                    <span className="text-slate-900">
                      {Object.entries(services.addOns)
                        .filter(([, v]) => v)
                        .map(
                          ([k]) =>
                            addOnOptions.find((o) => o.key === k)?.label || k
                        )
                        .join(", ")}
                    </span>
                  </>
                ) : null}
                {preferredDate ? (
                  <>
                    <span className="text-slate-500">Preferred Date</span>
                    <span className="text-slate-900">
                      {new Date(preferredDate).toLocaleDateString()}
                    </span>
                  </>
                ) : null}
              </div>
              <div className="border-t border-slate-200 mt-4 pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-900">
                    {selectedOption.charAt(0).toUpperCase() +
                      selectedOption.slice(1)}{" "}
                    - {quote[selectedOption].name}
                  </span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary-600 tracking-tight">
                      ${(aiPriceOverrides?.[selectedOption] ?? quote[selectedOption].price).toFixed(0)}
                      {quote[selectedOption].firstCleanPrice ? (
                        <span className="text-sm font-normal text-slate-400 ml-1">
                          /visit
                        </span>
                      ) : null}
                    </div>
                    {quote[selectedOption].firstCleanPrice ? (
                      <div className="text-xs text-amber-600 font-medium mt-0.5">
                        First visit: $
                        {quote[selectedOption].firstCleanPrice.toFixed(0)}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Card>

      {submitError ? (
        <Alert variant="error" title="Could not create quote" description={submitError} />
      ) : null}

      <div className="flex justify-between">
        <Button
          variant="secondary"
          icon={ArrowLeft}
          onClick={() => (step > 0 ? setStep(step - 1) : navigate("/quotes"))}
        >
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < steps.length - 1 ? (
          <Button
            icon={ArrowRight}
            onClick={() => setStep(step + 1)}
            disabled={!canAdvance()}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            loading={createQuoteMutation.isPending}
          >
            Create Quote
          </Button>
        )}
      </div>
      </div>

      {/* ─── Right: live preview (xl+ screens only) ─────────────────── */}
      <div className="hidden xl:block shrink-0">
        <LivePreviewPanel isEmpty={property.sqft === 0 && step < 1}>
          <ResidentialLivePreview
            result={quote}
            selectedTier={selectedOption}
            priceOverride={aiPriceOverrides?.[selectedOption] ?? undefined}
            adjustment={adjustment}
            onAdjustmentChange={setAdjustment}
            frequency={services.frequency}
          />
        </LivePreviewPanel>
      </div>
    </div>
  );
}
