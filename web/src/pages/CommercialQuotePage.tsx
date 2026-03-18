import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  ChevronRight,
  ChevronLeft,
  Calculator,
  Save,
  CheckCircle,
  Users,
  Clock,
  DollarSign,
  Layers,
  FileText,
  Loader2,
} from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  Input,
  Select,
  SectionLabel,
  Badge,
} from "../components/ui";
import { ProGate } from "../components/ProGate";
import { apiRequest } from "../lib/api";

type Step = "facility" | "scope" | "pricing" | "summary";

const STEPS: { key: Step; label: string; icon: typeof Building2 }[] = [
  { key: "facility", label: "Facility", icon: Building2 },
  { key: "scope", label: "Scope", icon: Layers },
  { key: "pricing", label: "Pricing", icon: Calculator },
  { key: "summary", label: "Summary", icon: FileText },
];

const FACILITY_TYPES = [
  "Office Building",
  "Medical / Dental",
  "Retail Store",
  "Restaurant / Food Service",
  "Warehouse / Industrial",
  "School / Educational",
  "Gym / Fitness",
  "Church / Community",
  "Other",
];

const FREQUENCIES = [
  { value: "daily", label: "Daily (5x/week)", visitsPerMonth: 22 },
  { value: "3x_week", label: "3x per Week", visitsPerMonth: 13 },
  { value: "2x_week", label: "2x per Week", visitsPerMonth: 8.5 },
  { value: "weekly", label: "Weekly", visitsPerMonth: 4.3 },
  { value: "biweekly", label: "Bi-weekly", visitsPerMonth: 2 },
  { value: "monthly", label: "Monthly", visitsPerMonth: 1 },
  { value: "one_time", label: "One-time", visitsPerMonth: 1 },
];

interface FacilityInfo {
  facilityName: string;
  contactName: string;
  siteAddress: string;
  facilityType: string;
  squareFootage: string;
  floors: string;
  restrooms: string;
}

interface ScopeInfo {
  frequency: string;
  estimatedHoursPerVisit: string;
  numberOfCleaners: string;
  includeSupplies: boolean;
  specialServices: string[];
}

interface PricingInfo {
  hourlyRate: string;
  overheadPct: string;
  marginPct: string;
  suppliesSurcharge: string;
}

const SPECIAL_SERVICES = [
  "Floor stripping & waxing",
  "Carpet extraction",
  "Window cleaning",
  "Pressure washing",
  "Disinfection/sanitization",
  "Post-construction",
];

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isDone = idx < currentIndex;
        const isActive = idx === currentIndex;
        return (
          <div key={step.key} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary-600 text-white"
                  : isDone
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              {step.label}
            </div>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FacilityStep({
  data,
  onChange,
  onNext,
}: {
  data: FacilityInfo;
  onChange: (d: FacilityInfo) => void;
  onNext: () => void;
}) {
  const update = (key: keyof FacilityInfo, value: string) =>
    onChange({ ...data, [key]: value });

  return (
    <Card>
      <CardHeader title="Facility Information" />
      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Facility / Business Name</label>
          <Input
            value={data.facilityName}
            onChange={(e) => update("facilityName", e.target.value)}
            placeholder="e.g. Westside Medical Center"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Contact Name</label>
          <Input
            value={data.contactName}
            onChange={(e) => update("contactName", e.target.value)}
            placeholder="e.g. John Smith"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Facility Type</label>
          <Select
            value={data.facilityType}
            onChange={(e) => update("facilityType", e.target.value)}
            options={FACILITY_TYPES.map((t) => ({ value: t, label: t }))}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Site Address</label>
          <Input
            value={data.siteAddress}
            onChange={(e) => update("siteAddress", e.target.value)}
            placeholder="123 Business Blvd, City, State"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Square Footage</label>
          <Input
            type="number"
            value={data.squareFootage}
            onChange={(e) => update("squareFootage", e.target.value)}
            placeholder="e.g. 5000"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Number of Floors</label>
          <Input
            type="number"
            value={data.floors}
            onChange={(e) => update("floors", e.target.value)}
            placeholder="e.g. 2"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Number of Restrooms</label>
          <Input
            type="number"
            value={data.restrooms}
            onChange={(e) => update("restrooms", e.target.value)}
            placeholder="e.g. 4"
          />
        </div>
        <div className="sm:col-span-2 flex justify-end pt-2">
          <Button variant="primary" icon={ChevronRight} onClick={onNext}>
            Next: Scope
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ScopeStep({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: ScopeInfo;
  onChange: (d: ScopeInfo) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const update = <K extends keyof ScopeInfo>(key: K, value: ScopeInfo[K]) =>
    onChange({ ...data, [key]: value });

  const toggleService = (service: string) => {
    const next = data.specialServices.includes(service)
      ? data.specialServices.filter((s) => s !== service)
      : [...data.specialServices, service];
    update("specialServices", next);
  };

  return (
    <Card>
      <CardHeader title="Scope of Work" />
      <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Cleaning Frequency</label>
          <Select
            value={data.frequency}
            onChange={(e) => update("frequency", e.target.value)}
            options={FREQUENCIES.map((f) => ({ value: f.value, label: f.label }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            <Clock className="w-3 h-3 inline mr-1" />
            Hours per Visit
          </label>
          <Input
            type="number"
            value={data.estimatedHoursPerVisit}
            onChange={(e) => update("estimatedHoursPerVisit", e.target.value)}
            placeholder="e.g. 3.5"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            <Users className="w-3 h-3 inline mr-1" />
            Number of Cleaners
          </label>
          <Input
            type="number"
            value={data.numberOfCleaners}
            onChange={(e) => update("numberOfCleaners", e.target.value)}
            placeholder="e.g. 2"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-2">Special Services (optional)</label>
          <div className="flex flex-wrap gap-2">
            {SPECIAL_SERVICES.map((service) => {
              const selected = data.specialServices.includes(service);
              return (
                <button
                  key={service}
                  onClick={() => toggleService(service)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    selected
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {service}
                </button>
              );
            })}
          </div>
        </div>
        <div className="sm:col-span-2 flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <input
            type="checkbox"
            id="supplies"
            checked={data.includeSupplies}
            onChange={(e) => update("includeSupplies", e.target.checked)}
            className="w-4 h-4 text-primary-600 rounded"
          />
          <label htmlFor="supplies" className="text-sm text-slate-700 cursor-pointer">
            Include cleaning supplies in the quote
          </label>
        </div>
        <div className="sm:col-span-2 flex justify-between pt-2">
          <Button variant="secondary" icon={ChevronLeft} onClick={onBack}>Back</Button>
          <Button variant="primary" icon={ChevronRight} onClick={onNext}>Next: Pricing</Button>
        </div>
      </div>
    </Card>
  );
}

function PricingStep({
  data,
  onChange,
  onNext,
  onBack,
  scopeData,
}: {
  data: PricingInfo;
  onChange: (d: PricingInfo) => void;
  onNext: () => void;
  onBack: () => void;
  scopeData: ScopeInfo;
}) {
  const update = (key: keyof PricingInfo, value: string) =>
    onChange({ ...data, [key]: value });

  const hourlyRate = parseFloat(data.hourlyRate) || 0;
  const overheadPct = parseFloat(data.overheadPct) || 0;
  const marginPct = parseFloat(data.marginPct) || 0;
  const suppliesSurcharge = parseFloat(data.suppliesSurcharge) || 0;
  const hoursPerVisit = parseFloat(scopeData.estimatedHoursPerVisit) || 0;
  const cleaners = parseFloat(scopeData.numberOfCleaners) || 1;
  const freq = FREQUENCIES.find((f) => f.value === scopeData.frequency);
  const visitsPerMonth = freq?.visitsPerMonth || 4.3;

  const totalHoursPerVisit = hoursPerVisit * cleaners;
  const laborCostPerVisit = totalHoursPerVisit * hourlyRate;
  const withOverhead = laborCostPerVisit * (1 + overheadPct / 100);
  const withMargin = withOverhead / (1 - marginPct / 100);
  const pricePerVisit = withMargin + suppliesSurcharge;
  const monthlyPrice = pricePerVisit * visitsPerMonth;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Pricing Configuration" />
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Hourly Rate (per cleaner)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                value={data.hourlyRate}
                onChange={(e) => update("hourlyRate", e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="55"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Overhead %</label>
            <div className="relative">
              <input
                type="number"
                value={data.overheadPct}
                onChange={(e) => update("overheadPct", e.target.value)}
                className="w-full pr-8 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="15"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Target Margin %</label>
            <div className="relative">
              <input
                type="number"
                value={data.marginPct}
                onChange={(e) => update("marginPct", e.target.value)}
                className="w-full pr-8 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Supplies Surcharge</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                value={data.suppliesSurcharge}
                onChange={(e) => update("suppliesSurcharge", e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Price Estimate" />
        <div className="px-4 pb-4 space-y-2">
          {[
            { label: "Hours per visit", value: `${totalHoursPerVisit.toFixed(1)} hrs (${cleaners} cleaner${cleaners > 1 ? "s" : ""})` },
            { label: "Labor cost per visit", value: `$${laborCostPerVisit.toFixed(2)}` },
            { label: "With overhead", value: `$${withOverhead.toFixed(2)}` },
            { label: "Price per visit", value: `$${pricePerVisit.toFixed(2)}`, highlight: true },
          ].map((row) => (
            <div
              key={row.label}
              className={`flex justify-between items-center py-2 ${row.highlight ? "border-t border-slate-200 mt-2 pt-3" : ""}`}
            >
              <span className={`text-sm ${row.highlight ? "font-semibold text-slate-900" : "text-slate-600"}`}>
                {row.label}
              </span>
              <span className={`text-sm ${row.highlight ? "font-semibold text-primary-700" : "text-slate-900"}`}>
                {row.value}
              </span>
            </div>
          ))}
          <div className="mt-3 p-3 rounded-xl bg-primary-50 border border-primary-100 flex justify-between items-center">
            <span className="font-semibold text-primary-900 text-sm">Monthly Total</span>
            <span className="font-bold text-primary-700 text-lg">${monthlyPrice.toFixed(2)}</span>
          </div>
          <p className="text-xs text-slate-400 text-center pt-1">
            {visitsPerMonth.toFixed(1)} visits/month × ${pricePerVisit.toFixed(2)}/visit
          </p>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="secondary" icon={ChevronLeft} onClick={onBack}>Back</Button>
        <Button variant="primary" icon={ChevronRight} onClick={onNext}>Review Summary</Button>
      </div>
    </div>
  );
}

function SummaryStep({
  facility,
  scope,
  pricing,
  onBack,
}: {
  facility: FacilityInfo;
  scope: ScopeInfo;
  pricing: PricingInfo;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const hourlyRate = parseFloat(pricing.hourlyRate) || 0;
  const overheadPct = parseFloat(pricing.overheadPct) || 0;
  const marginPct = parseFloat(pricing.marginPct) || 0;
  const suppliesSurcharge = parseFloat(pricing.suppliesSurcharge) || 0;
  const hoursPerVisit = parseFloat(scope.estimatedHoursPerVisit) || 0;
  const cleaners = parseFloat(scope.numberOfCleaners) || 1;
  const freq = FREQUENCIES.find((f) => f.value === scope.frequency);
  const visitsPerMonth = freq?.visitsPerMonth || 4.3;
  const totalHoursPerVisit = hoursPerVisit * cleaners;
  const laborCostPerVisit = totalHoursPerVisit * hourlyRate;
  const withOverhead = laborCostPerVisit * (1 + overheadPct / 100);
  const withMargin = withOverhead / (1 - marginPct / 100);
  const pricePerVisit = withMargin + suppliesSurcharge;
  const monthlyPrice = pricePerVisit * visitsPerMonth;

  const handleSaveQuote = async () => {
    setSaving(true);
    setError("");
    try {
      const lineItems = [
        {
          description: `Commercial Cleaning - ${facility.facilityType || "Facility"} (${freq?.label || scope.frequency})`,
          quantity: visitsPerMonth,
          unitPrice: pricePerVisit,
          total: monthlyPrice,
        },
        ...scope.specialServices.map((s) => ({
          description: s,
          quantity: 1,
          unitPrice: 0,
          total: 0,
        })),
      ];

      const notes = [
        facility.siteAddress && `Address: ${facility.siteAddress}`,
        facility.squareFootage && `Sq. Footage: ${facility.squareFootage} sq ft`,
        facility.floors && `Floors: ${facility.floors}`,
        facility.restrooms && `Restrooms: ${facility.restrooms}`,
        `Hours/visit: ${totalHoursPerVisit.toFixed(1)} (${cleaners} cleaner${cleaners > 1 ? "s" : ""})`,
        scope.includeSupplies ? "Supplies included" : null,
        scope.specialServices.length > 0 && `Special services: ${scope.specialServices.join(", ")}`,
      ]
        .filter(Boolean)
        .join("\n");

      const res = await apiRequest("POST", "/api/quotes", {
        serviceType: `Commercial – ${facility.facilityType || "Facility"}`,
        serviceAddress: facility.siteAddress,
        frequency: scope.frequency,
        total: monthlyPrice,
        lineItems,
        notes,
        status: "draft",
      });
      const quote = await res.json();
      navigate(`/quotes/${quote.id}`);
    } catch (e: any) {
      setError(e?.message || "Failed to save quote.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Quote Summary" />
        <div className="px-4 pb-4 space-y-4">
          <div>
            <SectionLabel>Facility</SectionLabel>
            <div className="mt-2 space-y-1">
              <p className="text-sm font-medium text-slate-900">{facility.facilityName || "—"}</p>
              {facility.contactName && <p className="text-sm text-slate-600">{facility.contactName}</p>}
              {facility.siteAddress && <p className="text-sm text-slate-500">{facility.siteAddress}</p>}
              <div className="flex gap-2 flex-wrap mt-1">
                {facility.facilityType && <Badge status="lead" label={facility.facilityType} />}
                {facility.squareFootage && <Badge status="draft" label={`${Number(facility.squareFootage).toLocaleString()} sq ft`} />}
                {facility.floors && <Badge status="draft" label={`${facility.floors} floor${Number(facility.floors) > 1 ? "s" : ""}`} />}
                {facility.restrooms && <Badge status="draft" label={`${facility.restrooms} restrooms`} />}
              </div>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <SectionLabel>Scope</SectionLabel>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-slate-700">{freq?.label || scope.frequency}</p>
              <p className="text-sm text-slate-600">{totalHoursPerVisit.toFixed(1)} hrs/visit ({cleaners} cleaner{Number(cleaners) > 1 ? "s" : ""})</p>
              {scope.includeSupplies && <Badge status="active" label="Supplies included" />}
              {scope.specialServices.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {scope.specialServices.map((s) => (
                    <Badge key={s} status="draft" label={s} />
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <SectionLabel>Pricing</SectionLabel>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-500">Per Visit</p>
                <p className="font-semibold text-slate-900">${pricePerVisit.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary-50 border border-primary-100">
                <p className="text-xs text-primary-600">Monthly</p>
                <p className="font-bold text-primary-700 text-lg">${monthlyPrice.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <div className="flex justify-between">
        <Button variant="secondary" icon={ChevronLeft} onClick={onBack}>Back</Button>
        <Button
          variant="primary"
          icon={saving ? Loader2 : Save}
          onClick={handleSaveQuote}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save as Draft Quote"}
        </Button>
      </div>
    </div>
  );
}

function CommercialQuoteContent() {
  const [step, setStep] = useState<Step>("facility");
  const [facility, setFacility] = useState<FacilityInfo>({
    facilityName: "",
    contactName: "",
    siteAddress: "",
    facilityType: FACILITY_TYPES[0],
    squareFootage: "",
    floors: "",
    restrooms: "",
  });
  const [scope, setScope] = useState<ScopeInfo>({
    frequency: "weekly",
    estimatedHoursPerVisit: "",
    numberOfCleaners: "1",
    includeSupplies: false,
    specialServices: [],
  });
  const [pricingInfo, setPricingInfo] = useState<PricingInfo>({
    hourlyRate: "55",
    overheadPct: "15",
    marginPct: "20",
    suppliesSurcharge: "0",
  });

  return (
    <div className="max-w-2xl mx-auto">
      <StepIndicator current={step} />
      {step === "facility" && (
        <FacilityStep
          data={facility}
          onChange={setFacility}
          onNext={() => setStep("scope")}
        />
      )}
      {step === "scope" && (
        <ScopeStep
          data={scope}
          onChange={setScope}
          onNext={() => setStep("pricing")}
          onBack={() => setStep("facility")}
        />
      )}
      {step === "pricing" && (
        <PricingStep
          data={pricingInfo}
          onChange={setPricingInfo}
          onNext={() => setStep("summary")}
          onBack={() => setStep("scope")}
          scopeData={scope}
        />
      )}
      {step === "summary" && (
        <SummaryStep
          facility={facility}
          scope={scope}
          pricing={pricingInfo}
          onBack={() => setStep("pricing")}
        />
      )}
    </div>
  );
}

export default function CommercialQuotePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Commercial Quote Calculator"
        subtitle="Build accurate quotes for offices, medical facilities, and more"
      />
      <ProGate feature="Commercial Quoting" minTier="pro">
        <CommercialQuoteContent />
      </ProGate>
    </div>
  );
}
