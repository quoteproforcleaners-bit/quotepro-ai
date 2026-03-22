import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { computeCommercialQuote, computeCommercialLaborEstimate } from "../lib/pricingEngine";
import { CommercialLivePreview, LivePreviewPanel } from "../components/LiveQuotePreview";
import type { ManualAdjustment } from "../components/LiveQuotePreview";
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
  Zap,
  AlertTriangle,
  Info,
  Settings,
  Star,
  Pencil,
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
  Toggle,
} from "../components/ui";
import { ProGate } from "../components/ProGate";
import { apiRequest } from "../lib/api";

// ─── Types (mirrored from iOS client/features/commercial/types.ts) ────────────

type FacilityType = "Office" | "Retail" | "Medical" | "Gym" | "School" | "Warehouse" | "Restaurant" | "Other";
type GlassLevel = "None" | "Some" | "Lots";
type CommercialFrequency = "1x" | "2x" | "3x" | "5x" | "daily" | "custom";
type RoundingRule = "none" | "5" | "10" | "25";
type SuppliesSurchargeType = "fixed" | "percent";
type Step = "facility" | "walkthrough" | "labor" | "pricing" | "tiers";

const STEPS: { key: Step; label: string; icon: typeof Building2 }[] = [
  { key: "facility", label: "Facility", icon: Building2 },
  { key: "walkthrough", label: "Walkthrough", icon: Layers },
  { key: "labor", label: "Labor", icon: Users },
  { key: "pricing", label: "Pricing", icon: Calculator },
  { key: "tiers", label: "Proposal", icon: FileText },
];

const FACILITY_TYPES: { value: FacilityType; label: string }[] = [
  { value: "Office", label: "Office Building" },
  { value: "Retail", label: "Retail Store" },
  { value: "Medical", label: "Medical / Dental" },
  { value: "Gym", label: "Gym / Fitness Center" },
  { value: "School", label: "School / Educational" },
  { value: "Warehouse", label: "Warehouse / Industrial" },
  { value: "Restaurant", label: "Restaurant / Food Service" },
  { value: "Other", label: "Other" },
];

const FREQUENCY_OPTIONS: { value: CommercialFrequency; label: string; visitsPerMonth: number }[] = [
  { value: "1x", label: "Weekly (1x/week)", visitsPerMonth: 4 },
  { value: "2x", label: "2x per Week", visitsPerMonth: 8 },
  { value: "3x", label: "3x per Week", visitsPerMonth: 12 },
  { value: "5x", label: "5x per Week", visitsPerMonth: 20 },
  { value: "daily", label: "Daily (Mon–Fri)", visitsPerMonth: 22 },
  { value: "custom", label: "Custom / On-Demand", visitsPerMonth: 4 },
];

// ─── Labor Model (ported from iOS client/features/commercial/laborModel.ts) ──

const BASE_MINUTES_PER_1000_SQFT: Record<FacilityType, number> = {
  Office: 25, Retail: 20, Medical: 35, Gym: 30,
  School: 28, Warehouse: 15, Restaurant: 40, Other: 25,
};
const ADDON_MINUTES = {
  perBathroom: 15, perBreakroom: 10, perTrashPoint: 3,
  perConferenceRoom: 5, perPrivateOffice: 5, perOpenArea: 8, perEntryLobby: 10,
};
const GLASS_LEVEL_MINUTES: Record<GlassLevel, number> = { None: 0, Some: 10, Lots: 25 };
const FREQUENCY_VISITS_PER_MONTH: Record<CommercialFrequency, number> = {
  "1x": 4, "2x": 8, "3x": 12, "5x": 20, daily: 22, custom: 4,
};

interface Walkthrough {
  facilityType: FacilityType;
  totalSqFt: number;
  floors: number;
  bathroomCount: number;
  breakroomCount: number;
  conferenceRoomCount: number;
  privateOfficeCount: number;
  openAreaCount: number;
  entryLobbyCount: number;
  trashPointCount: number;
  carpetPercent: number;
  hardFloorPercent: number;
  glassLevel: GlassLevel;
  highTouchFocus: boolean;
  afterHoursRequired: boolean;
  suppliesByClient: boolean;
  restroomConsumablesIncluded: boolean;
  frequency: CommercialFrequency;
  preferredDays: string;
  preferredTimeWindow: string;
  accessConstraints: string;
  notes: string;
}

interface LaborEstimate {
  rawMinutes: number;
  rawHours: number;
  recommendedCleaners: number;
  overrideHours: number | null;
}

interface PricingConfig {
  hourlyRate: number;
  overheadPct: number;
  targetMarginPct: number;
  suppliesSurcharge: number;
  suppliesSurchargeType: SuppliesSurchargeType;
  roundingRule: RoundingRule;
}

interface CommercialTier {
  name: string;
  scopeText: string;
  includedBullets: string[];
  excludedBullets: string[];
  pricePerVisit: number;
  monthlyPrice: number;
}

function calculateLaborEstimate(w: Walkthrough): Omit<LaborEstimate, "overrideHours"> {
  let mins = (w.totalSqFt / 1000) * BASE_MINUTES_PER_1000_SQFT[w.facilityType];
  mins += w.bathroomCount * ADDON_MINUTES.perBathroom;
  mins += w.breakroomCount * ADDON_MINUTES.perBreakroom;
  mins += w.trashPointCount * ADDON_MINUTES.perTrashPoint;
  mins += w.conferenceRoomCount * ADDON_MINUTES.perConferenceRoom;
  mins += w.privateOfficeCount * ADDON_MINUTES.perPrivateOffice;
  mins += w.openAreaCount * ADDON_MINUTES.perOpenArea;
  mins += w.entryLobbyCount * ADDON_MINUTES.perEntryLobby;
  mins += GLASS_LEVEL_MINUTES[w.glassLevel];
  if (w.highTouchFocus) mins += 15;
  const carpet = w.carpetPercent / 100;
  const hard = w.hardFloorPercent / 100;
  mins *= carpet * 1.1 + hard * 0.95;
  if (w.floors > 1) mins *= 1 + (w.floors - 1) * 0.05;
  const rawMinutes = Math.round(mins);
  const rawHours = Math.round((rawMinutes / 60) * 100) / 100;
  const recommendedCleaners = Math.max(1, Math.ceil(rawMinutes / 120));
  return { rawMinutes, rawHours, recommendedCleaners };
}

function applyRounding(price: number, rule: RoundingRule): number {
  if (rule === "none") return Math.round(price * 100) / 100;
  const inc = parseInt(rule, 10);
  return Math.ceil(price / inc) * inc;
}

function calculatePricing(laborEst: LaborEstimate, config: PricingConfig, frequency: CommercialFrequency) {
  const hours = laborEst.overrideHours ?? laborEst.rawHours;
  const labor = hours * config.hourlyRate;
  const baseCost = labor * (1 + config.overheadPct / 100);
  const supplies = config.suppliesSurchargeType === "fixed"
    ? config.suppliesSurcharge
    : baseCost * (config.suppliesSurcharge / 100);
  const total = baseCost + supplies;
  const perVisit = applyRounding(total / (1 - config.targetMarginPct / 100), config.roundingRule);
  const visitsPerMonth = FREQUENCY_VISITS_PER_MONTH[frequency];
  const monthly = applyRounding(perVisit * visitsPerMonth, config.roundingRule);
  return { perVisit, monthly, labor, baseCost, hours, visitsPerMonth };
}

function generateTiers(facilityName: string, perVisit: number, frequency: CommercialFrequency, rule: RoundingRule): CommercialTier[] {
  const visits = FREQUENCY_VISITS_PER_MONTH[frequency];
  const basic = applyRounding(perVisit * 0.75, rule);
  const enhanced = applyRounding(perVisit, rule);
  const premium = applyRounding(perVisit * 1.3, rule);
  return [
    {
      name: "Basic Janitorial",
      scopeText: `Standard janitorial service for ${facilityName || "the facility"}`,
      includedBullets: [
        "Trash removal and liner replacement",
        "Restroom cleaning and restocking",
        "Floor sweeping and mopping (hard surfaces)",
        "Surface wiping (desks, counters, tables)",
        "Entrance and lobby tidying",
      ],
      excludedBullets: [
        "Full carpet vacuuming",
        "Deep sanitization",
        "Window and glass cleaning",
        "High-touch point disinfection",
        "Breakroom appliance cleaning",
      ],
      pricePerVisit: basic,
      monthlyPrice: applyRounding(basic * visits, rule),
    },
    {
      name: "Enhanced Sanitation",
      scopeText: `Comprehensive cleaning with enhanced sanitation for ${facilityName || "the facility"}`,
      includedBullets: [
        "All Basic Janitorial services",
        "Full carpet vacuuming",
        "High-touch point disinfection (handles, switches, railings)",
        "Breakroom and kitchen cleaning",
        "Conference room reset and cleaning",
        "Glass and mirror cleaning",
      ],
      excludedBullets: [
        "Deep carpet extraction",
        "Floor stripping and waxing",
        "Exterior window cleaning",
        "Specialty chemical treatments",
      ],
      pricePerVisit: enhanced,
      monthlyPrice: applyRounding(enhanced * visits, rule),
    },
    {
      name: "Premium Maintenance",
      scopeText: `Full-service premium maintenance for ${facilityName || "the facility"}`,
      includedBullets: [
        "All Enhanced Sanitation services",
        "Deep carpet care (monthly extraction)",
        "Hard floor maintenance (buffing / polishing)",
        "Interior window and partition cleaning",
        "Detailed dusting (vents, blinds, fixtures)",
        "Quarterly deep clean included",
        "Priority scheduling and dedicated team",
      ],
      excludedBullets: [
        "Exterior window cleaning",
        "Pressure washing",
        "Specialty hazmat cleaning",
      ],
      pricePerVisit: premium,
      monthlyPrice: applyRounding(premium * visits, rule),
    },
  ];
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-1.5 mb-6 flex-wrap">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isDone = idx < currentIndex;
        const isActive = idx === currentIndex;
        return (
          <div key={step.key} className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isActive ? "bg-primary-600 text-white" : isDone ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
            }`}>
              {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {idx < STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Number Input helper ──────────────────────────────────────────────────────

function NumInput({ label, value, onChange, placeholder, prefix, suffix, min }: {
  label: string; value: number; onChange: (v: number) => void;
  placeholder?: string; prefix?: string; suffix?: string; min?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{prefix}</span>}
        <input
          type="number"
          min={min ?? 0}
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          placeholder={placeholder}
          className={`w-full ${prefix ? "pl-7" : "pl-3"} ${suffix ? "pr-8" : "pr-3"} py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{suffix}</span>}
      </div>
    </div>
  );
}

// ─── Step 1: Facility ─────────────────────────────────────────────────────────

interface FacilityInfo {
  facilityName: string;
  contactName: string;
  siteAddress: string;
  facilityType: FacilityType;
  totalSqFt: number;
  floors: number;
}

function FacilityStep({ data, onChange, onNext }: {
  data: FacilityInfo; onChange: (d: FacilityInfo) => void; onNext: () => void;
}) {
  const set = <K extends keyof FacilityInfo>(k: K, v: FacilityInfo[K]) => onChange({ ...data, [k]: v });
  const canProceed = data.facilityName.trim() && data.facilityType && data.totalSqFt > 0;

  return (
    <Card>
      <CardHeader title="Facility Information" icon={Building2} />
      <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Facility / Business Name *</label>
          <Input value={data.facilityName} onChange={(e) => set("facilityName", e.target.value)} placeholder="e.g. Westside Medical Center" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Contact Name</label>
          <Input value={data.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="e.g. John Smith" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Facility Type *</label>
          <Select
            value={data.facilityType}
            onChange={(e) => set("facilityType", e.target.value as FacilityType)}
            options={FACILITY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Site Address</label>
          <Input value={data.siteAddress} onChange={(e) => set("siteAddress", e.target.value)} placeholder="123 Business Blvd, City, State" />
        </div>
        <NumInput label="Total Square Footage *" value={data.totalSqFt} onChange={(v) => set("totalSqFt", v)} placeholder="e.g. 5000" />
        <NumInput label="Number of Floors" value={data.floors} onChange={(v) => set("floors", v)} placeholder="1" min={1} />
        <div className="sm:col-span-2 p-3 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            The labor estimate on the next steps is auto-calculated from your facility type, square footage, and room counts — just like the mobile app. You can override it if needed.
          </p>
        </div>
        <div className="sm:col-span-2 flex justify-end pt-1">
          <Button variant="primary" icon={ChevronRight} onClick={onNext} disabled={!canProceed}>Next: Walkthrough</Button>
        </div>
      </div>
    </Card>
  );
}

// ─── Step 2: Walkthrough ──────────────────────────────────────────────────────

function WalkthroughStep({ data, onChange, onNext, onBack }: {
  data: Walkthrough; onChange: (d: Walkthrough) => void; onNext: () => void; onBack: () => void;
}) {
  const set = <K extends keyof Walkthrough>(k: K, v: Walkthrough[K]) => onChange({ ...data, [k]: v });

  const handleCarpetChange = (v: number) => {
    const clamped = Math.min(100, Math.max(0, v));
    onChange({ ...data, carpetPercent: clamped, hardFloorPercent: 100 - clamped });
  };

  return (
    <div className="space-y-4">
      {/* Room counts */}
      <Card>
        <CardHeader title="Room Counts" icon={Layers} />
        <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <NumInput label="Bathrooms / Restrooms" value={data.bathroomCount} onChange={(v) => set("bathroomCount", v)} placeholder="0" />
          <NumInput label="Breakrooms / Kitchens" value={data.breakroomCount} onChange={(v) => set("breakroomCount", v)} placeholder="0" />
          <NumInput label="Conference Rooms" value={data.conferenceRoomCount} onChange={(v) => set("conferenceRoomCount", v)} placeholder="0" />
          <NumInput label="Private Offices" value={data.privateOfficeCount} onChange={(v) => set("privateOfficeCount", v)} placeholder="0" />
          <NumInput label="Open Work Areas" value={data.openAreaCount} onChange={(v) => set("openAreaCount", v)} placeholder="0" />
          <NumInput label="Entry Lobbies" value={data.entryLobbyCount} onChange={(v) => set("entryLobbyCount", v)} placeholder="0" />
          <NumInput label="Trash Collection Points" value={data.trashPointCount} onChange={(v) => set("trashPointCount", v)} placeholder="0" />
        </div>
      </Card>

      {/* Surface & Environment */}
      <Card>
        <CardHeader title="Surface & Environment" icon={Settings} />
        <div className="px-5 pb-5 space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-3">
              Floor Surface Mix <span className="text-slate-400 font-normal">(carpet % / hard floor %)</span>
            </label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Carpet</span>
                  <span className="font-semibold text-slate-800">{data.carpetPercent}%</span>
                </div>
                <input
                  type="range" min={0} max={100} step={5}
                  value={data.carpetPercent}
                  onChange={(e) => handleCarpetChange(parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none bg-slate-200 accent-primary-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0% carpet</span>
                  <span>100% carpet</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-0.5 w-20 text-center shrink-0">
                <div className="text-xs font-semibold text-slate-800">{data.hardFloorPercent}%</div>
                <div className="text-[10px] text-slate-400">Hard Floor</div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Glass / Windows Level</label>
            <div className="flex gap-2">
              {(["None", "Some", "Lots"] as GlassLevel[]).map((g) => (
                <button
                  key={g}
                  onClick={() => set("glassLevel", g)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                    data.glassLevel === g
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              None = +0 min · Some = +10 min · Lots = +25 min per visit
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-sm font-medium text-slate-800">High-Touch Focus</p>
                <p className="text-xs text-slate-500">Disinfect handles, switches, railings (+15 min)</p>
              </div>
              <Toggle checked={data.highTouchFocus} onChange={(v) => set("highTouchFocus", v)} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-sm font-medium text-slate-800">After-Hours Service</p>
                <p className="text-xs text-slate-500">Cleaning performed after business hours</p>
              </div>
              <Toggle checked={data.afterHoursRequired} onChange={(v) => set("afterHoursRequired", v)} />
            </div>
          </div>
        </div>
      </Card>

      {/* Logistics */}
      <Card>
        <CardHeader title="Logistics & Schedule" icon={Clock} />
        <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Cleaning Frequency</label>
            <Select
              value={data.frequency}
              onChange={(e) => set("frequency", e.target.value as CommercialFrequency)}
              options={FREQUENCY_OPTIONS.map((f) => ({ value: f.value, label: f.label }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Preferred Days</label>
            <Input value={data.preferredDays} onChange={(e) => set("preferredDays", e.target.value)} placeholder="e.g. Mon, Wed, Fri" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Preferred Time Window</label>
            <Input value={data.preferredTimeWindow} onChange={(e) => set("preferredTimeWindow", e.target.value)} placeholder="e.g. 6pm – 9pm" />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-800">Client Provides Supplies</p>
              <p className="text-xs text-slate-500">Client supplies chemicals and equipment</p>
            </div>
            <Toggle checked={data.suppliesByClient} onChange={(v) => set("suppliesByClient", v)} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-sm font-medium text-slate-800">Restroom Consumables</p>
              <p className="text-xs text-slate-500">Include soap, paper products in quote</p>
            </div>
            <Toggle checked={data.restroomConsumablesIncluded} onChange={(v) => set("restroomConsumablesIncluded", v)} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Access Constraints / Special Instructions</label>
            <textarea
              value={data.accessConstraints}
              onChange={(e) => set("accessConstraints", e.target.value)}
              placeholder="e.g. Badge access required, server room off-limits"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea
              value={data.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Additional notes about the facility or scope"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
          <div className="sm:col-span-2 flex justify-between pt-1">
            <Button variant="secondary" icon={ChevronLeft} onClick={onBack}>Back</Button>
            <Button variant="primary" icon={ChevronRight} onClick={onNext}>Next: Labor Estimate</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Step 3: Labor ────────────────────────────────────────────────────────────

function LaborStep({ walkthrough, laborEst, setLaborEst, onNext, onBack }: {
  walkthrough: Walkthrough;
  laborEst: LaborEstimate;
  setLaborEst: (l: LaborEstimate) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const auto = useMemo(() => calculateLaborEstimate(walkthrough), [walkthrough]);
  const effectiveHours = laborEst.overrideHours ?? auto.rawHours;

  const breakdown = [
    { label: "Base time (sq ft + facility type)", mins: Math.round((walkthrough.totalSqFt / 1000) * BASE_MINUTES_PER_1000_SQFT[walkthrough.facilityType]) },
    walkthrough.bathroomCount > 0 && { label: `Bathrooms (${walkthrough.bathroomCount} × 15 min)`, mins: walkthrough.bathroomCount * 15 },
    walkthrough.breakroomCount > 0 && { label: `Breakrooms (${walkthrough.breakroomCount} × 10 min)`, mins: walkthrough.breakroomCount * 10 },
    walkthrough.conferenceRoomCount > 0 && { label: `Conference rooms (${walkthrough.conferenceRoomCount} × 5 min)`, mins: walkthrough.conferenceRoomCount * 5 },
    walkthrough.privateOfficeCount > 0 && { label: `Private offices (${walkthrough.privateOfficeCount} × 5 min)`, mins: walkthrough.privateOfficeCount * 5 },
    walkthrough.openAreaCount > 0 && { label: `Open areas (${walkthrough.openAreaCount} × 8 min)`, mins: walkthrough.openAreaCount * 8 },
    walkthrough.entryLobbyCount > 0 && { label: `Entry lobbies (${walkthrough.entryLobbyCount} × 10 min)`, mins: walkthrough.entryLobbyCount * 10 },
    walkthrough.trashPointCount > 0 && { label: `Trash points (${walkthrough.trashPointCount} × 3 min)`, mins: walkthrough.trashPointCount * 3 },
    walkthrough.glassLevel !== "None" && { label: `Glass level: ${walkthrough.glassLevel}`, mins: GLASS_LEVEL_MINUTES[walkthrough.glassLevel] },
    walkthrough.highTouchFocus && { label: "High-touch focus", mins: 15 },
  ].filter(Boolean) as { label: string; mins: number }[];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Auto-Calculated Labor Estimate" icon={Zap} />
        <div className="px-5 pb-5 space-y-4">
          <div className="p-3 rounded-xl bg-primary-50 border border-primary-100">
            <p className="text-xs font-semibold text-primary-700 mb-2 uppercase tracking-wider">Estimate Breakdown</p>
            <div className="space-y-1.5">
              {breakdown.map((row) => (
                <div key={row.label} className="flex justify-between text-xs">
                  <span className="text-slate-600">{row.label}</span>
                  <span className="font-medium text-slate-800">{row.mins} min</span>
                </div>
              ))}
              <div className="border-t border-primary-200 pt-2 flex justify-between text-sm font-semibold text-primary-800 mt-1">
                <span>Total (before surface & floor adjustment)</span>
                <span>{auto.rawMinutes} min</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-xs text-slate-500 mb-1">Est. Hours</p>
              <p className="text-xl font-extrabold text-slate-900">{auto.rawHours}</p>
              <p className="text-[10px] text-slate-400">per visit</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-xs text-slate-500 mb-1">Rec. Cleaners</p>
              <p className="text-xl font-extrabold text-slate-900">{auto.recommendedCleaners}</p>
              <p className="text-[10px] text-slate-400">at 2 hrs each</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-xs text-slate-500 mb-1">Frequency</p>
              <p className="text-base font-extrabold text-slate-900">{walkthrough.frequency}x</p>
              <p className="text-[10px] text-slate-400">{FREQUENCY_VISITS_PER_MONTH[walkthrough.frequency]}x/mo</p>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Override Hours (Optional)" icon={Clock} />
        <div className="px-5 pb-5 space-y-3">
          <p className="text-sm text-slate-500">
            The auto estimate is <span className="font-semibold text-slate-800">{auto.rawHours} hrs</span>. Override below if your walkthrough found different conditions.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <NumInput
                label="Override hours per visit"
                value={laborEst.overrideHours ?? 0}
                onChange={(v) => setLaborEst({ ...laborEst, overrideHours: v > 0 ? v : null })}
                placeholder={`${auto.rawHours} (auto)`}
              />
            </div>
            {laborEst.overrideHours !== null && (
              <button
                onClick={() => setLaborEst({ ...laborEst, overrideHours: null })}
                className="mt-5 text-xs text-primary-600 hover:text-primary-700 font-semibold whitespace-nowrap"
              >
                Reset to auto
              </button>
            )}
          </div>
          {laborEst.overrideHours !== null && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700">
                Using override: <strong>{laborEst.overrideHours} hrs</strong> instead of auto-calculated {auto.rawHours} hrs.
              </p>
            </div>
          )}
          <div className="flex justify-between pt-2">
            <Button variant="secondary" icon={ChevronLeft} onClick={onBack}>Back</Button>
            <Button variant="primary" icon={ChevronRight} onClick={() => {
              setLaborEst({ rawMinutes: auto.rawMinutes, rawHours: auto.rawHours, recommendedCleaners: auto.recommendedCleaners, overrideHours: laborEst.overrideHours });
              onNext();
            }}>Next: Pricing</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Step 4: Pricing ──────────────────────────────────────────────────────────

function PricingStep({ config, onChange, laborEst, walkthrough, onNext, onBack }: {
  config: PricingConfig;
  onChange: (c: PricingConfig) => void;
  laborEst: LaborEstimate;
  walkthrough: Walkthrough;
  onNext: () => void;
  onBack: () => void;
}) {
  const set = <K extends keyof PricingConfig>(k: K, v: PricingConfig[K]) => onChange({ ...config, [k]: v });
  const calc = useMemo(() => calculatePricing(laborEst, config, walkthrough.frequency), [laborEst, config, walkthrough.frequency]);
  const canProceed = config.hourlyRate > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Pricing Configuration" icon={DollarSign} />
        <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumInput label="Hourly Rate (per cleaner)" value={config.hourlyRate} onChange={(v) => set("hourlyRate", v)} placeholder="55" prefix="$" />
          <NumInput label="Overhead %" value={config.overheadPct} onChange={(v) => set("overheadPct", v)} placeholder="15" suffix="%" />
          <NumInput label="Target Margin %" value={config.targetMarginPct} onChange={(v) => set("targetMarginPct", Math.min(v, 99))} placeholder="20" suffix="%" />

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Supplies Surcharge</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  {config.suppliesSurchargeType === "fixed" ? "$" : ""}
                </span>
                <input
                  type="number"
                  min={0}
                  value={config.suppliesSurcharge || ""}
                  onChange={(e) => set("suppliesSurcharge", parseFloat(e.target.value) || 0)}
                  placeholder={config.suppliesSurchargeType === "fixed" ? "0" : "0"}
                  className={`w-full ${config.suppliesSurchargeType === "fixed" ? "pl-7" : "pl-3"} pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500`}
                />
                {config.suppliesSurchargeType === "percent" && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                )}
              </div>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden shrink-0">
                {(["fixed", "percent"] as SuppliesSurchargeType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => set("suppliesSurchargeType", t)}
                    className={`px-3 py-2 text-xs font-medium transition-colors ${config.suppliesSurchargeType === t ? "bg-primary-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    {t === "fixed" ? "$" : "%"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-2">Price Rounding</label>
            <div className="flex gap-2">
              {([["none", "None"], ["5", "Round to $5"], ["10", "Round to $10"], ["25", "Round to $25"]] as [RoundingRule, string][]).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => set("roundingRule", v)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${config.roundingRule === v ? "border-primary-500 bg-primary-50 text-primary-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Live Price Estimate" icon={Calculator} />
        <div className="px-5 pb-5 space-y-2">
          {[
            { label: `Hours per visit (${laborEst.overrideHours ? "override" : "auto"})`, value: `${calc.hours} hrs` },
            { label: "Labor cost per visit", value: `$${calc.labor.toFixed(2)}` },
            { label: `With overhead (${config.overheadPct}%)`, value: `$${calc.baseCost.toFixed(2)}` },
          ].map((row) => (
            <div key={row.label} className="flex justify-between items-center py-1.5">
              <span className="text-sm text-slate-600">{row.label}</span>
              <span className="text-sm font-medium text-slate-900">{row.value}</span>
            </div>
          ))}
          <div className="border-t border-slate-200 mt-2 pt-3 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Per Visit (Enhanced tier)</p>
              <p className="text-lg font-bold text-slate-900">${calc.perVisit.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-primary-50 border border-primary-100">
              <p className="text-xs text-primary-600 mb-1">Monthly (Enhanced tier)</p>
              <p className="text-lg font-bold text-primary-700">${calc.monthly.toLocaleString()}</p>
              <p className="text-[10px] text-primary-400">{calc.visitsPerMonth} visits/mo</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center pt-1">
            Final proposal will show all 3 service tiers (Basic / Enhanced / Premium)
          </p>
        </div>
      </Card>

      <div className="flex justify-between">
        <Button variant="secondary" icon={ChevronLeft} onClick={onBack}>Back</Button>
        <Button variant="primary" icon={ChevronRight} onClick={onNext} disabled={!canProceed}>Build Proposal</Button>
      </div>
    </div>
  );
}

// ─── Step 5: Tiers / Proposal ─────────────────────────────────────────────────

function TiersStep({ facility, walkthrough, laborEst, pricingConfig, onBack }: {
  facility: FacilityInfo;
  walkthrough: Walkthrough;
  laborEst: LaborEstimate;
  pricingConfig: PricingConfig;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedTier, setSelectedTier] = useState(1);
  const [recommendedTier, setRecommendedTier] = useState(1);
  const [priceOverrides, setPriceOverrides] = useState<{ monthly: string; perVisit: string }[]>([
    { monthly: "", perVisit: "" },
    { monthly: "", perVisit: "" },
    { monthly: "", perVisit: "" },
  ]);
  const [editingPrice, setEditingPrice] = useState<number | null>(null);

  const calc = useMemo(() => calculatePricing(laborEst, pricingConfig, walkthrough.frequency), [laborEst, pricingConfig, walkthrough.frequency]);
  const tiers = useMemo(() => generateTiers(facility.facilityName, calc.perVisit, walkthrough.frequency, pricingConfig.roundingRule), [facility.facilityName, calc.perVisit, walkthrough.frequency, pricingConfig.roundingRule]);
  const freq = FREQUENCY_OPTIONS.find((f) => f.value === walkthrough.frequency);

  // Effective prices: use overrides if set, else computed
  const effectiveTiers = useMemo(() => tiers.map((t, i) => {
    const mo = parseFloat(priceOverrides[i]?.monthly);
    const pv = parseFloat(priceOverrides[i]?.perVisit);
    return {
      ...t,
      monthlyPrice: !isNaN(mo) && mo > 0 ? mo : t.monthlyPrice,
      pricePerVisit: !isNaN(pv) && pv > 0 ? pv : t.pricePerVisit,
    };
  }), [tiers, priceOverrides]);

  const tier = effectiveTiers[selectedTier];

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const notes = [
        facility.siteAddress && `Address: ${facility.siteAddress}`,
        `Square Footage: ${facility.totalSqFt.toLocaleString()} sq ft`,
        facility.floors > 1 && `Floors: ${facility.floors}`,
        `Bathrooms: ${walkthrough.bathroomCount}`,
        walkthrough.breakroomCount > 0 && `Breakrooms: ${walkthrough.breakroomCount}`,
        walkthrough.conferenceRoomCount > 0 && `Conference Rooms: ${walkthrough.conferenceRoomCount}`,
        walkthrough.privateOfficeCount > 0 && `Private Offices: ${walkthrough.privateOfficeCount}`,
        `Glass Level: ${walkthrough.glassLevel}`,
        walkthrough.highTouchFocus && "High-touch disinfection focus",
        walkthrough.afterHoursRequired && "After-hours service required",
        walkthrough.suppliesByClient && "Client provides supplies",
        walkthrough.restroomConsumablesIncluded && "Restroom consumables included",
        walkthrough.accessConstraints && `Access: ${walkthrough.accessConstraints}`,
        walkthrough.notes && `Notes: ${walkthrough.notes}`,
        `---`,
        `Proposal Tier: ${tier.name}`,
        tier.includedBullets.map((b) => `✓ ${b}`).join("\n"),
      ].filter(Boolean).join("\n");

      const res = await apiRequest("POST", "/api/quotes", {
        // Required base fields (commercial quotes store data in propertyDetails)
        propertyBeds: 0,
        propertyBaths: 0,
        propertySqft: facility.totalSqFt,
        addOns: {},
        selectedOption: "better",
        options: {},
        subtotal: tier.monthlyPrice,
        tax: 0,
        total: tier.monthlyPrice,
        frequencySelected: walkthrough.frequency,
        status: "draft",
        // Commercial-specific data stored in propertyDetails jsonb
        propertyDetails: {
          quoteType: "commercial",
          facilityName: facility.facilityName,
          contactName: facility.contactName,
          siteAddress: facility.siteAddress,
          facilityType: facility.facilityType,
          facilityTypeLabel: FACILITY_TYPES.find((t) => t.value === facility.facilityType)?.label || facility.facilityType,
          totalSqFt: facility.totalSqFt,
          floors: facility.floors,
          walkthrough,
          laborEstimate: {
            rawMinutes: laborEst.rawMinutes,
            rawHours: laborEst.rawHours,
            recommendedCleaners: laborEst.recommendedCleaners,
            overrideHours: laborEst.overrideHours,
          },
          pricingConfig,
          selectedTierIndex: selectedTier,
          selectedTierName: tier.name,
          recommendedTierIndex: recommendedTier,
          tiers: effectiveTiers.map((t) => ({ name: t.name, pricePerVisit: t.pricePerVisit, monthlyPrice: t.monthlyPrice })),
          frequency: walkthrough.frequency,
          frequencyLabel: freq?.label || walkthrough.frequency,
          notes,
        },
        lineItems: [
          {
            name: `${tier.name} – ${freq?.label || walkthrough.frequency}`,
            description: `${tier.name} – ${freq?.label || walkthrough.frequency}`,
            quantity: calc.visitsPerMonth,
            unitPrice: tier.pricePerVisit,
            totalPrice: tier.monthlyPrice,
          },
        ],
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
      {/* Tier selector */}
      <Card>
        <CardHeader title="Service Tiers — Select One to Save" icon={FileText} />
        <div className="px-5 pb-5 space-y-3">
          {effectiveTiers.map((t, i) => {
            const isSelected = selectedTier === i;
            const isRecommended = recommendedTier === i;
            const tierColors = ["border-slate-200", "border-primary-400", "border-violet-400"];
            const tierBg = ["bg-slate-50", "bg-primary-50", "bg-violet-50"];
            const tierText = ["text-slate-700", "text-primary-700", "text-violet-700"];
            const ringClass = i === 0 ? "ring-slate-300" : i === 1 ? "ring-primary-400" : "ring-violet-400";
            const isEditingThis = editingPrice === i;
            return (
              <div key={t.name} className={`rounded-xl border-2 transition-all ${isSelected ? tierColors[i] + " ring-2 ring-offset-1 " + ringClass : "border-slate-200"} ${isSelected ? tierBg[i] : "bg-white"}`}>
                <button
                  onClick={() => setSelectedTier(i)}
                  className="w-full text-left p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isSelected && <CheckCircle className={`w-4 h-4 ${tierText[i]}`} />}
                      <span className={`font-bold text-sm ${isSelected ? tierText[i] : "text-slate-800"}`}>{t.name}</span>
                      {isRecommended && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 flex items-center gap-1">
                          <Star className="w-2.5 h-2.5" />Recommended
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`font-extrabold text-base ${isSelected ? tierText[i] : "text-slate-900"}`}>
                        ${t.monthlyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span className="text-xs font-normal text-slate-500">/mo</span>
                      </div>
                      <div className="text-xs text-slate-400">${t.pricePerVisit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/visit</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{t.scopeText}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                    {t.includedBullets.slice(0, 3).map((b) => (
                      <div key={b} className="flex items-start gap-1.5">
                        <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-xs text-slate-600">{b}</span>
                      </div>
                    ))}
                  </div>
                </button>

                {/* Per-tier controls: recommend + price edit */}
                <div className="border-t border-slate-100 px-4 py-2.5 flex items-center gap-3 flex-wrap">
                  <button
                    onClick={(e) => { e.stopPropagation(); setRecommendedTier(i); }}
                    className={`text-xs flex items-center gap-1 px-2.5 py-1 rounded-full border transition-colors ${isRecommended ? "bg-primary-50 border-primary-300 text-primary-700 font-semibold" : "border-slate-200 text-slate-500 hover:border-primary-300 hover:text-primary-600"}`}
                  >
                    <Star className={`w-3 h-3 ${isRecommended ? "fill-primary-500 text-primary-500" : ""}`} />
                    {isRecommended ? "Recommended" : "Set as Recommended"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingPrice(isEditingThis ? null : i); }}
                    className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-full border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />Edit Price
                  </button>
                </div>

                {isEditingThis && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">Monthly Price ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={tiers[i].monthlyPrice.toFixed(2)}
                        value={priceOverrides[i].monthly}
                        onChange={(e) => setPriceOverrides((prev) => prev.map((p, idx) => idx === i ? { ...p, monthly: e.target.value } : p))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block mb-1">Per-Visit Price ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={tiers[i].pricePerVisit.toFixed(2)}
                        value={priceOverrides[i].perVisit}
                        onChange={(e) => setPriceOverrides((prev) => prev.map((p, idx) => idx === i ? { ...p, perVisit: e.target.value } : p))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setPriceOverrides((prev) => prev.map((p, idx) => idx === i ? { monthly: "", perVisit: "" } : p)); setEditingPrice(null); }}
                      className="text-xs text-slate-400 hover:text-slate-600 col-span-2 text-left"
                    >
                      Reset to calculated price
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Selected tier full detail */}
      <Card>
        <CardHeader title={`${tier.name} — Full Scope`} icon={CheckCircle} />
        <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <SectionLabel>Included Services</SectionLabel>
            <ul className="mt-2 space-y-1.5">
              {tier.includedBullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionLabel>Not Included</SectionLabel>
            <ul className="mt-2 space-y-1.5">
              {tier.excludedBullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-slate-500">
                  <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0 mt-0.5 text-slate-300 font-bold text-xs">—</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Facility summary */}
      <Card>
        <CardHeader title="Quote Summary" icon={Building2} />
        <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Facility", value: facility.facilityName || "—" },
            { label: "Type", value: FACILITY_TYPES.find((t) => t.value === facility.facilityType)?.label || facility.facilityType },
            { label: "Sq Ft", value: facility.totalSqFt.toLocaleString() },
            { label: "Frequency", value: freq?.label || walkthrough.frequency },
            { label: "Est. Hours/Visit", value: `${laborEst.overrideHours ?? laborEst.rawHours} hrs` },
            { label: "Rec. Cleaners", value: `${laborEst.recommendedCleaners}` },
            { label: "After Hours", value: walkthrough.afterHoursRequired ? "Yes" : "No" },
            { label: "Supplies", value: walkthrough.suppliesByClient ? "By client" : "By cleaner" },
          ].map((r) => (
            <div key={r.label} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{r.label}</p>
              <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">{r.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <div className="flex justify-between">
        <Button variant="secondary" icon={ChevronLeft} onClick={onBack}>Back</Button>
        <Button variant="primary" icon={saving ? Loader2 : Save} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : `Save "${tier.name}" as Draft`}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const DEFAULT_WALKTHROUGH: Walkthrough = {
  facilityType: "Office",
  totalSqFt: 0,
  floors: 1,
  bathroomCount: 0,
  breakroomCount: 0,
  conferenceRoomCount: 0,
  privateOfficeCount: 0,
  openAreaCount: 0,
  entryLobbyCount: 0,
  trashPointCount: 0,
  carpetPercent: 50,
  hardFloorPercent: 50,
  glassLevel: "None",
  highTouchFocus: false,
  afterHoursRequired: false,
  suppliesByClient: false,
  restroomConsumablesIncluded: true,
  frequency: "3x",
  preferredDays: "",
  preferredTimeWindow: "",
  accessConstraints: "",
  notes: "",
};

function CommercialQuoteContent() {
  const { data: pricing } = useQuery<any>({ queryKey: ["/api/pricing"] });

  const defaultHourlyRate = pricing?.laborRate || 55;
  const defaultOverhead = pricing?.overheadPct || 15;
  const defaultMargin = pricing?.targetMarginPct || 20;

  const [step, setStep] = useState<Step>("facility");
  const [facility, setFacility] = useState<FacilityInfo>({
    facilityName: "", contactName: "", siteAddress: "",
    facilityType: "Office", totalSqFt: 0, floors: 1,
  });
  const [walkthrough, setWalkthrough] = useState<Walkthrough>({ ...DEFAULT_WALKTHROUGH });
  const [laborEst, setLaborEst] = useState<LaborEstimate>({
    rawMinutes: 0, rawHours: 0, recommendedCleaners: 1, overrideHours: null,
  });
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>({
    hourlyRate: defaultHourlyRate,
    overheadPct: defaultOverhead,
    targetMarginPct: defaultMargin,
    suppliesSurcharge: 0,
    suppliesSurchargeType: "fixed",
    roundingRule: "none",
  });
  const [adjustment, setAdjustment] = useState<ManualAdjustment>({ amount: 0, note: "" });

  // Keep walkthrough.facilityType in sync with facility.facilityType
  const handleFacilityChange = (f: FacilityInfo) => {
    setFacility(f);
    setWalkthrough((w) => ({ ...w, facilityType: f.facilityType, totalSqFt: f.totalSqFt, floors: f.floors }));
  };

  // Live quote computation for the preview panel
  const liveQuote = useMemo(() => {
    if (laborEst.rawHours === 0 && laborEst.overrideHours === null && facility.totalSqFt === 0) return null;
    const est = laborEst.rawHours > 0
      ? laborEst
      : { ...computeCommercialLaborEstimate(walkthrough), overrideHours: null };
    return computeCommercialQuote(est, pricingConfig, walkthrough.frequency, walkthrough);
  }, [laborEst, pricingConfig, walkthrough, facility.totalSqFt]);

  return (
    <div className="flex gap-6 items-start">
      {/* ─── Left: form steps ──────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
      <StepIndicator current={step} />
      {step === "facility" && (
        <FacilityStep data={facility} onChange={handleFacilityChange} onNext={() => setStep("walkthrough")} />
      )}
      {step === "walkthrough" && (
        <WalkthroughStep
          data={walkthrough}
          onChange={setWalkthrough}
          onNext={() => setStep("labor")}
          onBack={() => setStep("facility")}
        />
      )}
      {step === "labor" && (
        <LaborStep
          walkthrough={walkthrough}
          laborEst={laborEst}
          setLaborEst={setLaborEst}
          onNext={() => setStep("pricing")}
          onBack={() => setStep("walkthrough")}
        />
      )}
      {step === "pricing" && (
        <PricingStep
          config={pricingConfig}
          onChange={setPricingConfig}
          laborEst={laborEst}
          walkthrough={walkthrough}
          onNext={() => setStep("tiers")}
          onBack={() => setStep("labor")}
        />
      )}
      {step === "tiers" && (
        <TiersStep
          facility={facility}
          walkthrough={walkthrough}
          laborEst={laborEst}
          pricingConfig={pricingConfig}
          onBack={() => setStep("pricing")}
        />
      )}
      </div>

      {/* ─── Right: live preview (xl+ screens only) ──────────────────── */}
      <div className="hidden xl:block shrink-0">
        <LivePreviewPanel isEmpty={!liveQuote}>
          {liveQuote ? (
            <CommercialLivePreview
              result={liveQuote}
              facilityName={facility.facilityName || undefined}
              adjustment={adjustment}
              onAdjustmentChange={setAdjustment}
            />
          ) : null}
        </LivePreviewPanel>
      </div>
    </div>
  );
}

export default function CommercialQuotePage() {
  return (
    <div>
      <PageHeader
        title="Commercial Quote"
        subtitle="Site walkthrough to tiered proposal — powered by the same engine as the mobile app"
      />
      <ProGate feature="Commercial Quoting">
        <CommercialQuoteContent />
      </ProGate>
    </div>
  );
}
