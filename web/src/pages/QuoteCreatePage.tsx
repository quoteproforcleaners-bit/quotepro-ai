import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiPost } from "../lib/api";
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
} from "lucide-react";
import { PageHeader, Card, CardHeader, Button, Badge, Alert } from "../components/ui";

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

function getSqftBaseHours(sqft: number): number {
  if (sqft <= 1000) return 1.5;
  if (sqft <= 1500) return 2.5;
  if (sqft <= 2000) return 3.0;
  if (sqft <= 2500) return 3.5;
  if (sqft <= 3000) return 4.0;
  if (sqft <= 3500) return 4.5;
  if (sqft <= 4000) return 5.0;
  return 5.0 + Math.ceil((sqft - 4000) / 750);
}

function getConditionMultiplier(score: number): number {
  if (score >= 9) return 0.9;
  if (score >= 7) return 1.0;
  if (score >= 5) return 1.2;
  if (score >= 3) return 1.4;
  return 1.7;
}

function getPeopleMultiplier(count: number): number {
  if (count <= 2) return 1.0;
  if (count <= 4) return 1.1;
  return 1.2;
}

function getPetHours(petType: string, shedding: boolean): number {
  if (petType === "none") return 0;
  if (petType === "cat" && !shedding) return 0.25;
  if (petType === "dog" || shedding) return 0.5;
  if (petType === "multiple") return shedding ? 1.0 : 0.75;
  return 0;
}

function roundToNearest5(value: number): number {
  return Math.round(value / 5) * 5;
}

function roundHours(hours: number): number {
  return Math.round(hours * 2) / 2;
}

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

interface PricingSettings {
  hourlyRate: number;
  minimumTicket: number;
  serviceTypes: Array<{
    id: string;
    name: string;
    multiplier: number;
    scope: string;
  }>;
  goodOptionId: string;
  betterOptionId: string;
  bestOptionId: string;
  addOnPrices: Record<string, number>;
  frequencyDiscounts: { weekly: number; biweekly: number; monthly: number };
  taxRate?: number;
}

function calculateQuote(
  property: PropertyState,
  addOns: Record<string, boolean>,
  frequency: string,
  pricing: PricingSettings | null
) {
  const hourlyRate = pricing?.hourlyRate || 45;
  const minimumTicket = pricing?.minimumTicket || 100;
  const serviceTypes = pricing?.serviceTypes || [
    {
      id: "touch-up",
      name: "Touch Up",
      multiplier: 0.7,
      scope: "Quick surface cleaning",
    },
    {
      id: "standard",
      name: "Standard Clean",
      multiplier: 1.0,
      scope: "Full cleaning of all rooms",
    },
    {
      id: "deep-clean",
      name: "Deep Clean",
      multiplier: 1.5,
      scope: "Thorough deep cleaning",
    },
  ];
  const goodTypeId = pricing?.goodOptionId || "touch-up";
  const betterTypeId = pricing?.betterOptionId || "standard";
  const bestTypeId = pricing?.bestOptionId || "deep-clean";
  const freqDiscounts = pricing?.frequencyDiscounts || {
    weekly: 25,
    biweekly: 15,
    monthly: 10,
  };
  const addOnPrices = { ...DEFAULT_ADD_ON_PRICES, ...(pricing?.addOnPrices || {}) };

  const sqftHours = getSqftBaseHours(property.sqft);
  const bathHours =
    Math.max(0, property.baths - 1) * 0.5 + property.halfBaths * 0.25;
  const bedHours = Math.max(0, property.beds - 2) * 0.25;
  const condMult = getConditionMultiplier(property.conditionScore);
  const peopleMult = getPeopleMultiplier(property.peopleCount);
  const petHrs = getPetHours(property.petType, property.petShedding);
  const baseHours =
    (sqftHours + bathHours + bedHours + petHrs) * condMult * peopleMult;

  let addOnHours = 0;
  let addOnPrice = 0;
  for (const opt of addOnOptions) {
    if (addOns[opt.key]) {
      addOnHours += opt.hours;
      addOnPrice += (addOnPrices as any)[opt.key] || 0;
    }
  }

  const getFreqDiscount = (freq: string) => {
    if (freq === "weekly") return freqDiscounts.weekly / 100;
    if (freq === "biweekly") return freqDiscounts.biweekly / 100;
    if (freq === "monthly") return freqDiscounts.monthly / 100;
    return 0;
  };

  const calcTier = (
    typeId: string,
    includeUserAddOns: boolean,
    extraAddOns?: Record<string, boolean>
  ) => {
    const st = serviceTypes.find((s) => s.id === typeId) || serviceTypes[0];
    const tierAddOns = includeUserAddOns ? addOns : extraAddOns || {};
    let tierAddOnHours = 0;
    let tierAddOnPrice = 0;
    for (const opt of addOnOptions) {
      if ((tierAddOns as any)[opt.key]) {
        tierAddOnHours += opt.hours;
        tierAddOnPrice += (addOnPrices as any)[opt.key] || 0;
      }
    }
    const totalHours = roundHours(baseHours * st.multiplier + tierAddOnHours);
    let price = totalHours * hourlyRate + tierAddOnPrice;
    price = Math.max(price, minimumTicket);
    const canDiscount =
      st.id !== "move-in-out" && st.id !== "post-construction";
    if (canDiscount && frequency !== "one-time") {
      price = price * (1 - getFreqDiscount(frequency));
    }
    price = roundToNearest5(price);
    return {
      price,
      name: st.name,
      scope: st.scope,
      serviceTypeId: st.id,
      totalHours,
    };
  };

  const good = calcTier(goodTypeId, false);
  const better = calcTier(betterTypeId, false);
  const best = calcTier(bestTypeId, false, {
    insideFridge: true,
    insideOven: true,
  });

  return {
    good,
    better,
    best,
    baseHours: roundHours(baseHours),
    addOnHours,
    addOnPrice,
    hourlyRate,
  };
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
  const [step, setStep] = useState(0);
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
    address: "",
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
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      navigate(`/quotes/${data.id}`);
    },
  });

  const quote = calculateQuote(
    property,
    services.addOns,
    services.frequency,
    pricing
  );

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
    let cid = customerId;
    if (newCustomer) {
      try {
        const c: any = await createCustomerMutation.mutateAsync(customerForm);
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

    const quoteData = {
      customerId: cid || undefined,
      customerName: custName,
      status: "draft",
      total: selected.price,
      frequencySelected: services.frequency,
      recommendedOption,
      selectedOption,
      options: {
        good: {
          price: quote.good.price,
          name: `Good - ${quote.good.name}`,
          scope: quote.good.scope,
        },
        better: {
          price: quote.better.price,
          name: `Better - ${quote.better.name}`,
          scope: quote.better.scope,
        },
        best: {
          price: quote.best.price,
          name: `Best - ${quote.best.name}`,
          scope: quote.best.scope,
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
          selectedCustomer?.address || customerForm.address || "",
      },
      preferredDate: preferredDate || undefined,
    };

    createQuoteMutation.mutate(quoteData);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader title="New Quote" backTo="/quotes" />

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
                  {
                    key: "address",
                    label: "Property Address",
                    placeholder: "123 Main St, City, ST",
                    type: "text",
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
                return (
                  <div key={tier} className="relative">
                    <button
                      onClick={() => setSelectedOption(tier)}
                      className={`w-full text-left rounded-xl border-2 p-5 transition-all ${
                        isSelected
                          ? "border-primary-500 bg-primary-50/50 shadow-sm shadow-primary-600/5"
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
                      <p className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">
                        ${data.price.toFixed(0)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {data.scope}
                      </p>
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
              <div className="border-t border-slate-200 mt-4 pt-4 flex justify-between items-center">
                <span className="font-semibold text-slate-900">
                  {selectedOption.charAt(0).toUpperCase() +
                    selectedOption.slice(1)}{" "}
                  - {quote[selectedOption].name}
                </span>
                <span className="text-2xl font-bold text-primary-600 tracking-tight">
                  ${quote[selectedOption].price.toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </Card>

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
  );
}
