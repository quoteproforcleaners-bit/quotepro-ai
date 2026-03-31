import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  computeCommercialQuote,
  computeCommercialLaborEstimate,
  computeCommercialTiers,
  BASE_MINUTES_PER_1000_SQFT,
  ADDON_MINUTES,
  GLASS_LEVEL_MINUTES,
  FREQUENCY_VISITS_PER_MONTH,
  type CommercialWalkthrough,
  type CommercialLaborEstimate,
  type CommercialPricingConfig,
  type CommercialTier,
  type CommercialFrequency,
  type RoundingRule,
  type SuppliesSurchargeType,
  type FacilityType,
  type GlassLevel,
  type TrafficLevel,
  TRAFFIC_LEVEL_MULTIPLIER,
} from "../lib/pricingEngine";
import { CommercialLivePreview, LivePreviewPanel } from "../components/LiveQuotePreview";
import type { ManualAdjustment } from "../components/LiveQuotePreview";
import { Tooltip, LabelWithTooltip } from "../components/Tooltip";
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
  ExternalLink,
  Printer,
  Eye,
  EyeOff,
  BarChart3,
  X,
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

// ─── UI-only types ─────────────────────────────────────────────────────────────

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
  contactEmail: string;
  contactPhone: string;
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
  const missingContact = !data.contactEmail.trim() || !data.contactPhone.trim();

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
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Contact Email</label>
          <Input
            type="email"
            value={data.contactEmail}
            onChange={(e) => set("contactEmail", e.target.value)}
            placeholder="contact@company.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Contact Phone</label>
          <Input
            type="tel"
            value={data.contactPhone}
            onChange={(e) => set("contactPhone", e.target.value)}
            placeholder="(555) 000-0000"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Site Address</label>
          <Input value={data.siteAddress} onChange={(e) => set("siteAddress", e.target.value)} placeholder="123 Business Blvd, City, State" />
        </div>
        <NumInput label="Total Square Footage *" value={data.totalSqFt} onChange={(v) => set("totalSqFt", v)} placeholder="e.g. 5000" />
        <NumInput label="Number of Floors" value={data.floors} onChange={(v) => set("floors", v)} placeholder="1" min={1} />

        {missingContact && (
          <div className="sm:col-span-2 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              <span className="font-semibold">You'll need an email and phone to send this quote.</span> You can skip them now and add later, but the quote won't be sendable until a contact has both.
            </p>
          </div>
        )}

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

function WalkthroughStep({ data, onChange, onNext, onBack, hiddenFields, onToggleField }: {
  data: CommercialWalkthrough;
  onChange: (d: CommercialWalkthrough) => void;
  onNext: () => void;
  onBack: () => void;
  hiddenFields: Set<HiddenFieldId>;
  onToggleField: (id: HiddenFieldId, hide: boolean) => void;
}) {
  const set = <K extends keyof CommercialWalkthrough>(k: K, v: CommercialWalkthrough[K]) => onChange({ ...data, [k]: v });
  const [fieldPanelOpen, setFieldPanelOpen] = useState(false);
  const h = (id: HiddenFieldId) => hiddenFields.has(id);

  const handleCarpetChange = (v: number) => {
    const clamped = Math.min(100, Math.max(0, v));
    onChange({ ...data, carpetPercent: clamped, hardFloorPercent: 100 - clamped });
  };

  const hiddenCount = hiddenFields.size;

  return (
    <div className="space-y-4">
      {/* Admin header strip */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setFieldPanelOpen(true)}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
            hiddenCount > 0
              ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
              : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          {hiddenCount > 0 ? `${hiddenCount} field${hiddenCount > 1 ? "s" : ""} hidden` : "Customize fields"}
        </button>
      </div>

      {fieldPanelOpen && (
        <FieldTogglePanel hidden={hiddenFields} onToggle={onToggleField} onClose={() => setFieldPanelOpen(false)} />
      )}

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
          {!h("elevators") && (
            <NumInput label="Elevators (if multi-floor)" value={data.elevatorCount} onChange={(v) => set("elevatorCount", v)} placeholder="0" />
          )}
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
                  <span>0% carpet</span><span>100% carpet</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-0.5 w-20 text-center shrink-0">
                <div className="text-xs font-semibold text-slate-800">{data.hardFloorPercent}%</div>
                <div className="text-[10px] text-slate-400">Hard Floor</div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <label className="block text-xs font-medium text-slate-600">Glass / Windows Level</label>
              <Tooltip text="Adds cleaning time for glass surfaces. None = 0 min, Some = +10 min, Lots = +25 min per visit." source="ISSA 2025 Production Rates" />
            </div>
            <div className="flex gap-2">
              {(["None", "Some", "Lots"] as GlassLevel[]).map((g) => (
                <button key={g} onClick={() => set("glassLevel", g)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${data.glassLevel === g ? "border-primary-500 bg-primary-50 text-primary-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  {g}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">None = +0 min · Some = +10 min · Lots = +25 min per visit</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {!h("buildingAge") && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-xs font-medium text-slate-600">Building Age (years)</label>
                  <Tooltip text="Older buildings take longer to clean. &gt;20 yrs: ×1.15 multiplier. &gt;40 yrs: ×1.25 multiplier on total labor time." source="ISSA 2025" />
                </div>
                <NumInput label="" value={data.buildingAge} onChange={(v) => set("buildingAge", v)} placeholder="0" />
              </div>
            )}
            {!h("parkingLot") && (
              <NumInput label="Parking Lot (sq ft)" value={data.parkingLotSqFt ?? 0} onChange={(v) => set("parkingLotSqFt", v > 0 ? v : undefined)} placeholder="0" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <label className="text-xs font-medium text-slate-600">Foot Traffic Level</label>
              <Tooltip text="High foot traffic means faster re-soiling, requiring more cleaning time. Low=×0.9, Medium=×1.0, High=×1.15, Very High=×1.3." source="BSCAI 2024" />
            </div>
            <div className="flex gap-2">
              {([
                ["Low", "Low", "×0.9"],
                ["Medium", "Medium", "×1.0"],
                ["High", "High", "×1.15"],
                ["VeryHigh", "Very High", "×1.3"],
              ] as [TrafficLevel, string, string][]).map(([v, label, mult]) => (
                <button key={v} onClick={() => set("trafficLevel", v)}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors text-center ${data.trafficLevel === v ? "border-primary-500 bg-primary-50 text-primary-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  <div>{label}</div>
                  <div className="text-[10px] font-normal opacity-70">{mult}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!h("highTouch") && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-sm font-medium text-slate-800">High-Touch Focus</p>
                  <p className="text-xs text-slate-500">Disinfect handles, switches, railings (+15 min)</p>
                </div>
                <Toggle checked={data.highTouchFocus} onChange={(v) => set("highTouchFocus", v)} />
              </div>
            )}
            {!h("afterHours") && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-sm font-medium text-slate-800">After-Hours Service</p>
                  <p className="text-xs text-slate-500">
                    Cleaning after business hours
                    {data.afterHoursRequired && (
                      <span className="block text-amber-600 font-medium mt-0.5">
                        After-hours typically adds 25% — set premium in Pricing step.
                      </span>
                    )}
                  </p>
                </div>
                <Toggle checked={data.afterHoursRequired} onChange={(v) => set("afterHoursRequired", v)} />
              </div>
            )}
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
          {!h("preferredDays") && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Preferred Days</label>
              <Input value={data.preferredDays} onChange={(e) => set("preferredDays", e.target.value)} placeholder="e.g. Mon, Wed, Fri" />
            </div>
          )}
          {!h("preferredTime") && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Preferred Time Window</label>
              <Input value={data.preferredTimeWindow} onChange={(e) => set("preferredTimeWindow", e.target.value)} placeholder="e.g. 6pm – 9pm" />
            </div>
          )}
          {!h("suppliesByClient") && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-sm font-medium text-slate-800">Client Provides Supplies</p>
                <p className="text-xs text-slate-500">Client supplies chemicals and equipment</p>
              </div>
              <Toggle checked={data.suppliesByClient} onChange={(v) => set("suppliesByClient", v)} />
            </div>
          )}
          {!h("consumables") && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-sm font-medium text-slate-800">Restroom Consumables</p>
                <p className="text-xs text-slate-500">Include soap, paper products in quote</p>
              </div>
              <Toggle checked={data.restroomConsumablesIncluded} onChange={(v) => set("restroomConsumablesIncluded", v)} />
            </div>
          )}
          {!h("accessConstraints") && (
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
          )}
          {!h("notes") && (
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
          )}
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

function LaborStep({ walkthrough, laborEst, setLaborEst, onNext, onBack, customBaseMinutes }: {
  walkthrough: CommercialWalkthrough;
  laborEst: CommercialLaborEstimate;
  setLaborEst: (l: CommercialLaborEstimate) => void;
  onNext: () => void;
  onBack: () => void;
  customBaseMinutes?: Partial<Record<FacilityType, number>>;
}) {
  const auto = useMemo(() => computeCommercialLaborEstimate(walkthrough, customBaseMinutes), [walkthrough, customBaseMinutes]);
  const effectiveHours = laborEst.overrideHours ?? auto.rawHours;

  const effectiveBaseMin = customBaseMinutes?.[walkthrough.facilityType] ?? BASE_MINUTES_PER_1000_SQFT[walkthrough.facilityType];
  const breakdown = [
    { label: `Base time (sq ft × ${effectiveBaseMin} min/1,000 sqft)`, mins: Math.round((walkthrough.totalSqFt / 1000) * effectiveBaseMin) },
    walkthrough.bathroomCount > 0 && { label: `Bathrooms (${walkthrough.bathroomCount} × ${ADDON_MINUTES.perBathroom} min)`, mins: walkthrough.bathroomCount * ADDON_MINUTES.perBathroom },
    walkthrough.breakroomCount > 0 && { label: `Breakrooms (${walkthrough.breakroomCount} × ${ADDON_MINUTES.perBreakroom} min)`, mins: walkthrough.breakroomCount * ADDON_MINUTES.perBreakroom },
    walkthrough.conferenceRoomCount > 0 && { label: `Conference rooms (${walkthrough.conferenceRoomCount} × ${ADDON_MINUTES.perConferenceRoom} min)`, mins: walkthrough.conferenceRoomCount * ADDON_MINUTES.perConferenceRoom },
    walkthrough.privateOfficeCount > 0 && { label: `Private offices (${walkthrough.privateOfficeCount} × ${ADDON_MINUTES.perPrivateOffice} min)`, mins: walkthrough.privateOfficeCount * ADDON_MINUTES.perPrivateOffice },
    walkthrough.openAreaCount > 0 && { label: `Open areas (${walkthrough.openAreaCount} × ${ADDON_MINUTES.perOpenArea} min)`, mins: walkthrough.openAreaCount * ADDON_MINUTES.perOpenArea },
    walkthrough.entryLobbyCount > 0 && { label: `Entry lobbies (${walkthrough.entryLobbyCount} × ${ADDON_MINUTES.perEntryLobby} min)`, mins: walkthrough.entryLobbyCount * ADDON_MINUTES.perEntryLobby },
    walkthrough.trashPointCount > 0 && { label: `Trash points (${walkthrough.trashPointCount} × ${ADDON_MINUTES.perTrashPoint} min)`, mins: walkthrough.trashPointCount * ADDON_MINUTES.perTrashPoint },
    walkthrough.glassLevel !== "None" && { label: `Glass level: ${walkthrough.glassLevel}`, mins: GLASS_LEVEL_MINUTES[walkthrough.glassLevel] },
    walkthrough.highTouchFocus && { label: "High-touch focus", mins: 15 },
    walkthrough.floors > 1 && walkthrough.elevatorCount > 0 && {
      label: `Elevator access (${walkthrough.elevatorCount} × 8 min, multi-floor)`,
      mins: walkthrough.elevatorCount * 8,
    },
    (walkthrough.parkingLotSqFt ?? 0) > 0 && {
      label: `Parking lot exterior (${walkthrough.parkingLotSqFt?.toLocaleString()} sq ft × 0.02)`,
      mins: Math.round((walkthrough.parkingLotSqFt ?? 0) * 0.02),
    },
  ].filter(Boolean) as { label: string; mins: number }[];

  const ageMultiplier = walkthrough.buildingAge > 40 ? 1.25 : walkthrough.buildingAge > 20 ? 1.15 : 1.0;
  const trafficMultiplier = TRAFFIC_LEVEL_MULTIPLIER[walkthrough.trafficLevel];

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
                <span>Subtotal (before surface &amp; floor multipliers)</span>
                <span>{auto.rawMinutes} min (final)</span>
              </div>
            </div>
          </div>

          {/* Adjustment factors */}
          {(ageMultiplier !== 1.0 || trafficMultiplier !== 1.0) && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 space-y-1.5">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Applied Multipliers</p>
              {ageMultiplier !== 1.0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-amber-700">Building age &gt;{walkthrough.buildingAge > 40 ? "40" : "20"} yrs complexity</span>
                  <span className="font-semibold text-amber-800">×{ageMultiplier.toFixed(2)}</span>
                </div>
              )}
              {trafficMultiplier !== 1.0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-amber-700">Traffic level: {walkthrough.trafficLevel}</span>
                  <span className="font-semibold text-amber-800">×{trafficMultiplier.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

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
  config: CommercialPricingConfig;
  onChange: (c: CommercialPricingConfig) => void;
  laborEst: CommercialLaborEstimate;
  walkthrough: CommercialWalkthrough;
  onNext: () => void;
  onBack: () => void;
}) {
  const set = <K extends keyof CommercialPricingConfig>(k: K, v: CommercialPricingConfig[K]) => onChange({ ...config, [k]: v });
  const calc = useMemo(() => computeCommercialQuote(laborEst, config, walkthrough.frequency), [laborEst, config, walkthrough.frequency]);
  const canProceed = config.hourlyRate > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Pricing Configuration" icon={DollarSign} />
        <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumInput label="Hourly Rate (per cleaner)" value={config.hourlyRate} onChange={(v) => set("hourlyRate", v)} placeholder="55" prefix="$" />
          <NumInput label="Overhead %" value={config.overheadPct} onChange={(v) => set("overheadPct", v)} placeholder="15" suffix="%" />
          <NumInput label="Target Margin %" value={config.targetMarginPct} onChange={(v) => set("targetMarginPct", Math.min(v, 99))} placeholder="20" suffix="%" />
          {walkthrough.afterHoursRequired && (
            <div>
              <NumInput
                label="After-Hours Premium %"
                value={config.afterHoursPremiumPct}
                onChange={(v) => set("afterHoursPremiumPct", Math.max(0, v))}
                placeholder="25"
                suffix="%"
              />
              <p className="text-[11px] text-slate-400 mt-1">Added on top of margin — shown as a separate line item on the quote.</p>
            </div>
          )}

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
            { label: "Labor cost per visit", value: `$${calc.laborCost.toFixed(2)}` },
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

// ─── Tier bar chart ───────────────────────────────────────────────────────────

function TierComparisonChart({ tiers, selectedTier }: { tiers: CommercialTier[]; selectedTier: number }) {
  const maxMonthly = Math.max(...tiers.map((t) => t.monthlyPrice));
  const tierColors = [
    { bar: "bg-slate-400", text: "text-slate-600", label: "Basic" },
    { bar: "bg-primary-500", text: "text-primary-700", label: "Enhanced" },
    { bar: "bg-violet-500", text: "text-violet-700", label: "Premium" },
  ];

  return (
    <Card>
      <div className="px-5 pt-4 pb-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Tier Price Comparison</span>
          <Tooltip
            text="Visual comparison of all three service tiers. The Enhanced tier is our recommended starting point — priced at 1× the base rate. Basic = 0.82×, Premium = 1.25×."
            source="ISSA 2025 tiering guidelines"
          />
        </div>
        <div className="space-y-3">
          {tiers.map((tier, i) => {
            const pct = maxMonthly > 0 ? (tier.monthlyPrice / maxMonthly) * 100 : 0;
            const isSelected = i === selectedTier;
            const c = tierColors[i];
            return (
              <div key={tier.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold ${isSelected ? c.text : "text-slate-500"}`}>
                    {tier.name}
                    {isSelected && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">Selected</span>}
                  </span>
                  <div className="text-right">
                    <span className={`text-sm font-bold tabular-nums ${isSelected ? c.text : "text-slate-600"}`}>
                      ${tier.monthlyPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}<span className="text-xs font-normal text-slate-400">/mo</span>
                    </span>
                    <span className="text-[10px] text-slate-400 ml-2">${tier.pricePerVisit.toLocaleString(undefined, { maximumFractionDigits: 0 })}/visit</span>
                  </div>
                </div>
                <div className="h-6 bg-slate-100 rounded-lg overflow-hidden">
                  <div
                    className={`h-full ${c.bar} rounded-lg transition-all duration-500 flex items-center justify-end pr-2`}
                    style={{ width: `${pct}%` }}
                  >
                    {pct > 30 && <span className="text-[10px] text-white font-bold">{pct.toFixed(0)}%</span>}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{tier.scopeText}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400">Pricing based on ISSA 2025 production rates</span>
          <Tooltip text="ISSA (International Sanitary Supply Association) 2025 Cleaning Industry Production Rate standards are the industry benchmark for calculating commercial cleaning labor times and costs." source="ISSA 2025" side="right" />
        </div>
      </div>
    </Card>
  );
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

function usePDFExport() {
  const printRef = useRef<HTMLDivElement>(null);

  const exportPDF = useCallback(() => {
    const el = printRef.current;
    if (!el) return;
    // Temporarily show the hidden print area, trigger print, then hide
    el.style.display = "block";
    window.print();
    el.style.display = "none";
  }, []);

  return { printRef, exportPDF };
}

interface PDFContentProps {
  facility: FacilityInfo;
  walkthrough: CommercialWalkthrough;
  laborEst: CommercialLaborEstimate;
  calc: ReturnType<typeof computeCommercialQuote>;
  tiers: CommercialTier[];
  selectedTier: number;
  recommendedTier: number;
}

function PDFContent({ facility, walkthrough, laborEst, calc, tiers, selectedTier, recommendedTier }: PDFContentProps) {
  const tier = tiers[selectedTier];
  const freq = FREQUENCY_OPTIONS.find((f) => f.value === walkthrough.frequency);
  const calcUrl = `${window.location.origin}/commercial-cleaning-calculator`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(calcUrl)}&bgcolor=ffffff&color=1e293b&margin=4`;

  return (
    <div style={{ fontFamily: "Georgia, serif", color: "#1e293b", fontSize: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #e2e8f0", paddingBottom: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#6d28d9" }}>QuotePro AI</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>Commercial Cleaning Proposal</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Generated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Powered by ISSA 2025 production rates</div>
        </div>
      </div>

      {/* Facility */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Facility Information</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, backgroundColor: "#f8fafc", padding: 12, borderRadius: 8 }}>
          {[
            ["Facility Name", facility.facilityName],
            ["Contact", facility.contactName || "—"],
            ["Type", facility.facilityType],
            ["Square Footage", `${facility.totalSqFt.toLocaleString()} sq ft`],
            ["Frequency", freq?.label || walkthrough.frequency],
            ["Est. Hours/Visit", `${laborEst.overrideHours ?? laborEst.rawHours} hrs`],
            ["After-Hours", walkthrough.afterHoursRequired ? "Yes" : "No"],
            ["Est. Cleaners", laborEst.recommendedCleaners.toString()],
          ].map(([label, value]) => (
            <div key={label} style={{ padding: "4px 0" }}>
              <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tier comparison */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Service Tier Options</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ backgroundColor: "#6d28d9", color: "white" }}>
              <th style={{ padding: "8px 12px", textAlign: "left", borderRadius: "4px 0 0 0" }}>Tier</th>
              <th style={{ padding: "8px 12px", textAlign: "right" }}>Per Visit</th>
              <th style={{ padding: "8px 12px", textAlign: "right" }}>Monthly</th>
              <th style={{ padding: "8px 12px", textAlign: "right", borderRadius: "0 4px 0 0" }}>Annual Value</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t, i) => (
              <tr key={t.name} style={{ backgroundColor: i === selectedTier ? "#ede9fe" : i % 2 === 0 ? "#f8fafc" : "white", fontWeight: i === selectedTier ? 700 : 400 }}>
                <td style={{ padding: "8px 12px" }}>
                  {t.name}
                  {i === selectedTier && <span style={{ marginLeft: 6, fontSize: 9, backgroundColor: "#6d28d9", color: "white", padding: "2px 6px", borderRadius: 4 }}>SELECTED</span>}
                  {i === recommendedTier && i !== selectedTier && <span style={{ marginLeft: 6, fontSize: 9, backgroundColor: "#0ea5e9", color: "white", padding: "2px 6px", borderRadius: 4 }}>RECOMMENDED</span>}
                </td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>${t.pricePerVisit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>${t.monthlyPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style={{ padding: "8px 12px", textAlign: "right" }}>${(t.monthlyPrice * 12).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cost breakdown */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Cost Breakdown — Enhanced Tier</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <tbody>
            {calc.lineItems.map((item) => (
              <tr key={item.label} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "6px 12px", color: "#475569" }}>{item.label}</td>
                <td style={{ padding: "6px 12px", textAlign: "right", fontWeight: 600 }}>${Math.round(item.amount).toLocaleString()}</td>
              </tr>
            ))}
            <tr style={{ borderTop: "2px solid #e2e8f0", fontWeight: 700 }}>
              <td style={{ padding: "8px 12px" }}>Per Visit Total</td>
              <td style={{ padding: "8px 12px", textAlign: "right", color: "#6d28d9", fontSize: 13 }}>${calc.perVisit.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tier scope */}
      {tier && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Selected Scope — {tier.name}</div>
          <p style={{ color: "#64748b", fontSize: 11, marginBottom: 8 }}>{tier.scopeText}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {tier.includedBullets.map((b) => (
              <div key={b} style={{ fontSize: 10, color: "#166534" }}>✓ {b}</div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p style={{ fontSize: 9, color: "#94a3b8" }}>Pricing calculated using ISSA 2025 Cleaning Industry Production Rate standards</p>
          <p style={{ fontSize: 9, color: "#94a3b8" }}>and BSCAI 2024 Building Service Contractors Market Survey benchmarks.</p>
          <p style={{ fontSize: 9, color: "#94a3b8", marginTop: 4 }}>This proposal was generated by QuotePro AI · quotepro.ai</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <img src={qrUrl} alt="QR Code" style={{ width: 60, height: 60 }} />
          <p style={{ fontSize: 8, color: "#94a3b8", marginTop: 2 }}>Scan for online calculator</p>
        </div>
      </div>
    </div>
  );
}

// ─── Print stylesheet (injected into <head> once) ─────────────────────────────
const PRINT_STYLE = `
@media print {
  body > *:not(#quotepro-print-root) { display: none !important; }
  #quotepro-print-root { display: block !important; }
  @page { margin: 20mm; size: A4 portrait; }
}
`;

function ensurePrintStyle() {
  if (document.getElementById("quotepro-print-style")) return;
  const s = document.createElement("style");
  s.id = "quotepro-print-style";
  s.textContent = PRINT_STYLE;
  document.head.appendChild(s);
}

// ─── Step 5: Tiers / Proposal ─────────────────────────────────────────────────

function TiersStep({ facility, walkthrough, laborEst, pricingConfig, onBack }: {
  facility: FacilityInfo;
  walkthrough: CommercialWalkthrough;
  laborEst: CommercialLaborEstimate;
  pricingConfig: CommercialPricingConfig;
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
  const printRef = useRef<HTMLDivElement>(null);

  const exportPDF = useCallback(() => {
    ensurePrintStyle();
    const el = printRef.current;
    if (!el) return;
    el.style.display = "block";
    el.id = "quotepro-print-root";
    window.print();
    el.style.display = "none";
  }, []);

  const calc = useMemo(() => computeCommercialQuote(laborEst, pricingConfig, walkthrough.frequency), [laborEst, pricingConfig, walkthrough.frequency]);
  const tiers = useMemo(() => computeCommercialTiers(facility.facilityName, calc.perVisit, walkthrough.frequency, pricingConfig.roundingRule), [facility.facilityName, calc.perVisit, walkthrough.frequency, pricingConfig.roundingRule]);
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
      // Auto-create customer from facility contact info if any contact data exists
      let customerId: string | undefined;
      const hasContactInfo = facility.contactName.trim() || facility.contactEmail.trim() || facility.contactPhone.trim();
      if (hasContactInfo) {
        try {
          const nameParts = facility.contactName.trim().split(" ");
          const firstName = nameParts[0] || facility.facilityName;
          const lastName = nameParts.slice(1).join(" ") || "";
          const custRes = await apiRequest("POST", "/api/customers", {
            firstName,
            lastName,
            email: facility.contactEmail.trim() || undefined,
            phone: facility.contactPhone.trim() || undefined,
            address: facility.siteAddress.trim() || undefined,
            company: facility.facilityName.trim() || undefined,
            type: "commercial",
          });
          const custData = await custRes.json();
          if (custData.id) customerId = custData.id;
        } catch {
          // Non-fatal: proceed without customer link
        }
      }

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
        customerId: customerId || undefined,
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
          contactEmail: facility.contactEmail,
          contactPhone: facility.contactPhone,
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
      {/* Tier comparison chart */}
      <TierComparisonChart tiers={effectiveTiers} selectedTier={selectedTier} />

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

      <div className="flex justify-between items-center">
        <Button variant="secondary" icon={ChevronLeft} onClick={onBack}>Back</Button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Export PDF
          </button>
          <Button variant="primary" icon={saving ? Loader2 : Save} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : `Save "${tier.name}" as Draft`}
          </Button>
        </div>
      </div>

      {/* Hidden print area — shown only during window.print() */}
      <div ref={printRef} style={{ display: "none" }}>
        <PDFContent
          facility={facility}
          walkthrough={walkthrough}
          laborEst={laborEst}
          calc={calc}
          tiers={effectiveTiers}
          selectedTier={selectedTier}
          recommendedTier={recommendedTier}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const DEFAULT_WALKTHROUGH: CommercialWalkthrough = {
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
  buildingAge: 0,
  elevatorCount: 0,
  parkingLotSqFt: undefined,
  trafficLevel: "Medium",
};

const COMMERCIAL_SETTINGS_KEY = "commercialBaseMinutes";
const HIDDEN_FIELDS_KEY = "commercialHiddenFields";

// ─── Admin field visibility ────────────────────────────────────────────────────

type HiddenFieldId =
  | "elevators" | "buildingAge" | "parkingLot" | "highTouch"
  | "afterHours" | "suppliesByClient" | "consumables"
  | "accessConstraints" | "notes" | "preferredDays" | "preferredTime";

const FIELD_LABELS: Record<HiddenFieldId, string> = {
  elevators: "Elevators",
  buildingAge: "Building Age",
  parkingLot: "Parking Lot (sq ft)",
  highTouch: "High-Touch Focus toggle",
  afterHours: "After-Hours Service toggle",
  suppliesByClient: "Client Provides Supplies toggle",
  consumables: "Restroom Consumables toggle",
  accessConstraints: "Access Constraints notes",
  notes: "Additional Notes",
  preferredDays: "Preferred Days",
  preferredTime: "Preferred Time Window",
};

function useHiddenFields(): [Set<HiddenFieldId>, (id: HiddenFieldId, hidden: boolean) => void] {
  const [hidden, setHidden] = useState<Set<HiddenFieldId>>(() => {
    try {
      const stored = localStorage.getItem(HIDDEN_FIELDS_KEY);
      return stored ? new Set(JSON.parse(stored) as HiddenFieldId[]) : new Set();
    } catch { return new Set(); }
  });

  const toggle = useCallback((id: HiddenFieldId, shouldHide: boolean) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (shouldHide) next.add(id); else next.delete(id);
      try { localStorage.setItem(HIDDEN_FIELDS_KEY, JSON.stringify([...next])); } catch { /* */ }
      return next;
    });
  }, []);

  return [hidden, toggle];
}

function FieldTogglePanel({ hidden, onToggle, onClose }: {
  hidden: Set<HiddenFieldId>;
  onToggle: (id: HiddenFieldId, hide: boolean) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end" onClick={onClose}>
      <div
        className="mt-16 mr-4 w-72 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-zinc-200">Field Visibility</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-400 px-4 pt-3 pb-1">Toggle optional fields on/off. Saved to your browser.</p>
        <div className="px-4 pb-4 space-y-2 max-h-96 overflow-y-auto mt-2">
          {(Object.entries(FIELD_LABELS) as [HiddenFieldId, string][]).map(([id, label]) => {
            const isHidden = hidden.has(id);
            return (
              <label key={id} className="flex items-center justify-between gap-3 cursor-pointer group">
                <span className={`text-xs ${isHidden ? "text-slate-400 line-through" : "text-slate-600 dark:text-zinc-300"}`}>{label}</span>
                <button
                  type="button"
                  onClick={() => onToggle(id, !isHidden)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors border ${
                    isHidden
                      ? "bg-slate-100 text-slate-400 border-slate-200"
                      : "bg-primary-50 text-primary-700 border-primary-200"
                  }`}
                >
                  {isHidden ? <><EyeOff className="w-3 h-3" />Hidden</> : <><Eye className="w-3 h-3" />Visible</>}
                </button>
              </label>
            );
          })}
        </div>
        <div className="px-4 pb-3">
          <button
            onClick={() => (Object.keys(FIELD_LABELS) as HiddenFieldId[]).forEach((id) => onToggle(id, false))}
            className="w-full text-xs text-center text-primary-600 hover:text-primary-700 font-semibold py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
          >
            Show all fields
          </button>
        </div>
      </div>
    </div>
  );
}

function useCustomBaseMinutes(): Partial<Record<FacilityType, number>> | undefined {
  const [overrides, setOverrides] = useState<Partial<Record<FacilityType, number>> | undefined>(() => {
    try {
      const stored = localStorage.getItem(COMMERCIAL_SETTINGS_KEY);
      return stored ? JSON.parse(stored) : undefined;
    } catch { return undefined; }
  });
  return overrides;
}

function CommercialQuoteContent() {
  const { data: pricing } = useQuery<any>({ queryKey: ["/api/pricing"] });
  const customBaseMinutes = useCustomBaseMinutes();
  const [hiddenFields, onToggleField] = useHiddenFields();

  const defaultHourlyRate = pricing?.laborRate || 55;
  const defaultOverhead = pricing?.overheadPct || 15;
  const defaultMargin = pricing?.targetMarginPct || 20;

  const [step, setStep] = useState<Step>("facility");
  const [facility, setFacility] = useState<FacilityInfo>({
    facilityName: "", contactName: "", contactEmail: "", contactPhone: "", siteAddress: "",
    facilityType: "Office", totalSqFt: 0, floors: 1,
  });
  const [walkthrough, setWalkthrough] = useState<CommercialWalkthrough>({ ...DEFAULT_WALKTHROUGH });
  const [laborEst, setLaborEst] = useState<CommercialLaborEstimate>({
    rawMinutes: 0, rawHours: 0, recommendedCleaners: 1, overrideHours: null,
  });
  const [pricingConfig, setPricingConfig] = useState<CommercialPricingConfig>({
    hourlyRate: defaultHourlyRate,
    overheadPct: defaultOverhead,
    targetMarginPct: defaultMargin,
    suppliesSurcharge: 0,
    suppliesSurchargeType: "fixed",
    roundingRule: "none",
    afterHoursPremiumPct: 25,
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
      : { ...computeCommercialLaborEstimate(walkthrough, customBaseMinutes), overrideHours: null };
    return computeCommercialQuote(est, pricingConfig, walkthrough.frequency, walkthrough);
  }, [laborEst, pricingConfig, walkthrough, facility.totalSqFt, customBaseMinutes]);

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
          hiddenFields={hiddenFields}
          onToggleField={onToggleField}
        />
      )}
      {step === "labor" && (
        <LaborStep
          walkthrough={walkthrough}
          laborEst={laborEst}
          setLaborEst={setLaborEst}
          onNext={() => setStep("pricing")}
          onBack={() => setStep("walkthrough")}
          customBaseMinutes={customBaseMinutes}
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
              facilityType={facility.facilityType}
              totalSqFt={facility.totalSqFt || undefined}
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
  const navigate = useNavigate();
  return (
    <div>
      <div className="flex items-start justify-between mb-2">
        <PageHeader
          title="Commercial Quote"
          subtitle="Site walkthrough to tiered proposal — powered by the same engine as the mobile app"
        />
        <button
          onClick={() => navigate("/commercial-settings")}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary-600 font-medium transition-colors mt-1 shrink-0"
        >
          <Settings className="w-3.5 h-3.5" />
          Labor Settings
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
      <ProGate feature="Commercial Quoting">
        <CommercialQuoteContent />
      </ProGate>
    </div>
  );
}
