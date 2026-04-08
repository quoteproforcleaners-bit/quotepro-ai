import { useState, useRef } from"react";
import { useQuery, useQueryClient } from"@tanstack/react-query";
import {
 Brain, Upload, ClipboardList, BarChart2, Zap, ChevronRight, Plus, Trash2,
 CheckCircle, AlertCircle, TrendingUp, DollarSign, Edit2, X, Play, Eye,
 ToggleLeft, ToggleRight, RefreshCw, ArrowRight, Check, Info, Home,
 ChevronDown, ChevronUp, Sparkles, Lock, Unlock, Calculator,
} from"lucide-react";
import { PageHeader, Card, Spinner } from"../components/ui";
import { apiRequest } from"../lib/api";

type Step ="intro"|"jobs"|"questionnaire"|"analysis"|"calculator";

const SERVICE_TYPES = [
 { value:"standard", label:"Standard Clean"},
 { value:"deep-clean", label:"Deep Clean"},
 { value:"move-in-out", label:"Move-In / Move-Out"},
 { value:"recurring", label:"Recurring Clean"},
 { value:"commercial", label:"Commercial"},
];

const CONDITION_LEVELS = [
 { value:"light", label:"Light — Very clean already"},
 { value:"standard", label:"Standard — Typical home"},
 { value:"heavy", label:"Heavy — Needs extra work"},
];

const FREQUENCY_OPTIONS = [
 { value:"one-time", label:"One-Time"},
 { value:"weekly", label:"Weekly"},
 { value:"biweekly", label:"Biweekly"},
 { value:"monthly", label:"Monthly"},
 { value:"recurring", label:"Recurring (unspecified)"},
];

const RULE_TYPE_LABELS: Record<string, string> = {
 base_price:"Base Price",
 base_by_service:"Base Price by Service",
 sqft_range:"Square Footage Pricing",
 bed_adjustment:"Bedroom Adjustment",
 bath_adjustment:"Bathroom Adjustment",
 half_bath_adjustment:"Half-Bath Adjustment",
 condition_multiplier:"Condition Multiplier",
 frequency_discount:"Frequency Discount",
 pet_surcharge:"Pet Surcharge",
 addon_price:"Add-On Prices",
 zip_surcharge:"Travel / Zip Surcharge",
 first_time_multiplier:"First-Time Multiplier",
 minimum_floor:"Minimum Job Price Floor",
};

const SOURCE_BADGES: Record<string, { label: string; color: string }> = {
 inferred: { label:"Inferred from your data", color:"text-blue-600 bg-blue-50"},
"ai-recommended": { label:"AI Recommended", color:"text-purple-600 bg-purple-50"},
 user: { label:"User-defined", color:"text-slate-600 bg-slate-100"},
};

function emptyJob() {
 return {
 customerName:"",
 serviceType:"standard",
 sqft:"",
 beds:"",
 baths:"",
 halfBaths:"0",
 conditionLevel:"standard",
 pets: false,
 frequency:"one-time",
 zipCode:"",
 estimatedHours:"",
 crewSize:"1",
 finalPrice:"",
 won: true,
 notes:"",
 };
}

interface ImportedJob {
 id: string;
 customerName: string;
 serviceType: string;
 sqft?: number;
 beds?: number;
 baths?: number;
 halfBaths?: number;
 conditionLevel: string;
 pets: boolean;
 frequency: string;
 finalPrice: number;
 won: boolean;
 notes: string;
 createdAt: string;
}

interface PricingRule {
 id: string;
 label: string;
 ruleType: string;
 inputVariables: string[];
 formula: any;
 explanation: string;
 source: string;
 active: boolean;
 sortOrder: number;
}

interface PricingAnalysis {
 id: string;
 status: string;
 jobCount: number;
 inferredSummary: any;
 revenueOpportunities: any[];
 recommendedRules: any[];
 createdAt: string;
}

interface QuoteResult {
 total: number;
 breakdown: Array<{
 ruleId: string;
 label: string;
 effect: number;
 type: string;
 explanation: string;
 runningTotal: number;
 }>;
 rulesApplied: number;
 warnings: string[];
}

function StepNav({ current, onClick }: { current: Step; onClick: (s: Step) => void }) {
 const steps: { key: Step; label: string; icon: any }[] = [
 { key:"jobs", label:"Past Jobs", icon: Upload },
 { key:"questionnaire", label:"Your Pricing", icon: ClipboardList },
 { key:"analysis", label:"Analysis & Rules", icon: Brain },
 { key:"calculator", label:"Quote Calculator", icon: Calculator },
 ];
 const order: Step[] = ["jobs","questionnaire","analysis","calculator"];
 const currentIdx = order.indexOf(current ==="intro"?"jobs": current);

 return (
 <div className="flex items-center gap-1 flex-wrap">
 {steps.map((s, i) => {
 const done = i < currentIdx;
 const active = s.key === current;
 const Icon = s.icon;
 return (
 <button
 key={s.key}
 onClick={() => onClick(s.key)}
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
 active
 ?"bg-primary-600 text-white"
 : done
 ?"bg-primary-100 text-primary-700"
 :"text-slate-400 hover:bg-slate-100"
 }`}
 >
 {done ? <Check className="w-3.5 h-3.5"/> : <Icon className="w-3.5 h-3.5"/>}
 {s.label}
 </button>
 );
 })}
 </div>
 );
}

// ===== Import Jobs Step =====
function JobsStep({ onNext }: { onNext: () => void }) {
 const queryClient = useQueryClient();
 const { data: jobs = [], isLoading } = useQuery<ImportedJob[]>({ queryKey: ["/api/pricing/jobs"] });
 const [showForm, setShowForm] = useState(false);
 const [form, setForm] = useState(emptyJob());
 const [saving, setSaving] = useState(false);
 const [csvError, setCsvError] = useState("");
 const [deletingId, setDeletingId] = useState<string | null>(null);
 const fileRef = useRef<HTMLInputElement>(null);

 const handleSave = async () => {
 if (!form.finalPrice) return;
 setSaving(true);
 try {
 await apiRequest("POST","/api/pricing/jobs", form);
 await queryClient.invalidateQueries({ queryKey: ["/api/pricing/jobs"] });
 setForm(emptyJob());
 setShowForm(false);
 } catch (e: any) {
 alert(e.message ||"Failed to save job");
 } finally {
 setSaving(false);
 }
 };

 const handleDelete = async (id: string) => {
 setDeletingId(id);
 try {
 await apiRequest("DELETE", `/api/pricing/jobs/${id}`);
 await queryClient.invalidateQueries({ queryKey: ["/api/pricing/jobs"] });
 } finally {
 setDeletingId(null);
 }
 };

 const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 setCsvError("");
 const reader = new FileReader();
 reader.onload = async (ev) => {
 const text = ev.target?.result as string;
 const lines = text.trim().split("\n");
 if (lines.length < 2) { setCsvError("CSV must have a header row and at least one data row."); return; }
 const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g,"_").replace(/[^a-z_]/g,""));
 const getCol = (row: string[], names: string[]) => {
 for (const n of names) {
 const idx = headers.indexOf(n);
 if (idx >= 0) return row[idx]?.trim() ||"";
 }
 return"";
 };
 let imported = 0;
 for (let i = 1; i < lines.length; i++) {
 const row = lines[i].split(",");
 const price = parseFloat(getCol(row, ["final_price","price","amount","charged"]));
 if (!price) continue;
 try {
 await apiRequest("POST","/api/pricing/jobs", {
 customerName: getCol(row, ["customer_name","customer","name"]),
 serviceType: getCol(row, ["service_type","service","type"]) ||"standard",
 sqft: parseInt(getCol(row, ["sqft","square_feet","square_footage"])) || undefined,
 beds: parseInt(getCol(row, ["beds","bedrooms","bd"])) || undefined,
 baths: parseFloat(getCol(row, ["baths","bathrooms","ba"])) || undefined,
 conditionLevel: getCol(row, ["condition","condition_level"]) ||"standard",
 pets: getCol(row, ["pets"]).toLowerCase() ==="true"|| getCol(row, ["pets"]) ==="1",
 frequency: getCol(row, ["frequency"]) ||"one-time",
 finalPrice: price,
 won: getCol(row, ["won"]).toLowerCase() !=="false"&& getCol(row, ["won"]) !=="0",
 notes: getCol(row, ["notes"]),
 source:"csv",
 });
 imported++;
 } catch { /* skip bad rows */ }
 }
 await queryClient.invalidateQueries({ queryKey: ["/api/pricing/jobs"] });
 if (imported === 0) setCsvError("No valid rows found. Make sure your CSV has a'final_price'or'price'column.");
 };
 reader.readAsText(file);
 e.target.value ="";
 };

 const inp ="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500";
 const lbl ="text-xs font-medium text-slate-500 mb-1 block";

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h2 className="text-lg font-semibold text-slate-900">Step 1 — Import Your Past Jobs</h2>
 <p className="text-sm text-slate-500 mt-0.5">Upload or manually enter 3–20 past jobs. The more you add, the better the analysis.</p>
 </div>
 <div className="flex items-center gap-2">
 <button
 onClick={() => fileRef.current?.click()}
 className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
 >
 <Upload className="w-3.5 h-3.5"/>
 Import CSV
 </button>
 <input ref={fileRef} type="file"accept=".csv"className="hidden"onChange={handleCSV} />
 <button
 onClick={() => setShowForm(!showForm)}
 className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
 >
 <Plus className="w-3.5 h-3.5"/>
 Add Job
 </button>
 </div>
 </div>

 {csvError && (
 <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
 <AlertCircle className="w-4 h-4 shrink-0"/>
 {csvError}
 </div>
 )}

 {/* CSV hint */}
 <div className="p-3 bg-blue-50 rounded-lg flex items-start gap-2 text-sm text-blue-700">
 <Info className="w-4 h-4 mt-0.5 shrink-0"/>
 <span><strong>CSV format:</strong> Include columns like <code className="bg-blue-100 px-1 rounded">customer_name, service_type, sqft, beds, baths, condition, pets, frequency, final_price, won, notes</code>. Only <strong>final_price</strong> is required.</span>
 </div>

 {/* Manual entry form */}
 {showForm && (
 <Card>
 <div className="p-5">
 <h3 className="text-sm font-semibold text-slate-900 mb-4">Add Past Job</h3>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="col-span-2">
 <label className={lbl}>Customer Name</label>
 <input className={inp} placeholder="e.g. Sarah Johnson"value={form.customerName} onChange={e => setForm(f => ({...f, customerName: e.target.value}))} />
 </div>
 <div>
 <label className={lbl}>Service Type</label>
 <select className={inp} value={form.serviceType} onChange={e => setForm(f => ({...f, serviceType: e.target.value}))}>
 {SERVICE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
 </select>
 </div>
 <div>
 <label className={lbl}>Final Price Charged *</label>
 <input className={inp} type="number"placeholder="$150"value={form.finalPrice} onChange={e => setForm(f => ({...f, finalPrice: e.target.value}))} />
 </div>
 <div>
 <label className={lbl}>Sq Ft</label>
 <input className={inp} type="number"placeholder="1400"value={form.sqft} onChange={e => setForm(f => ({...f, sqft: e.target.value}))} />
 </div>
 <div>
 <label className={lbl}>Beds</label>
 <input className={inp} type="number"placeholder="3"value={form.beds} onChange={e => setForm(f => ({...f, beds: e.target.value}))} />
 </div>
 <div>
 <label className={lbl}>Baths</label>
 <input className={inp} type="number"step="0.5"placeholder="2"value={form.baths} onChange={e => setForm(f => ({...f, baths: e.target.value}))} />
 </div>
 <div>
 <label className={lbl}>Half Baths</label>
 <input className={inp} type="number"placeholder="0"value={form.halfBaths} onChange={e => setForm(f => ({...f, halfBaths: e.target.value}))} />
 </div>
 <div>
 <label className={lbl}>Condition</label>
 <select className={inp} value={form.conditionLevel} onChange={e => setForm(f => ({...f, conditionLevel: e.target.value}))}>
 {CONDITION_LEVELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
 </select>
 </div>
 <div>
 <label className={lbl}>Frequency</label>
 <select className={inp} value={form.frequency} onChange={e => setForm(f => ({...f, frequency: e.target.value}))}>
 {FREQUENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
 </select>
 </div>
 <div>
 <label className={lbl}>Zip Code</label>
 <input className={inp} placeholder="30301"value={form.zipCode} onChange={e => setForm(f => ({...f, zipCode: e.target.value}))} />
 </div>
 <div>
 <label className={lbl}>Est. Hours</label>
 <input className={inp} type="number"step="0.5"placeholder="2.5"value={form.estimatedHours} onChange={e => setForm(f => ({...f, estimatedHours: e.target.value}))} />
 </div>
 <div className="flex items-center gap-4 col-span-2 pt-2">
 <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
 <input type="checkbox"checked={form.pets} onChange={e => setForm(f => ({...f, pets: e.target.checked}))} className="w-4 h-4 rounded text-primary-600"/>
 Pets in home
 </label>
 <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
 <input type="checkbox"checked={form.won} onChange={e => setForm(f => ({...f, won: e.target.checked}))} className="w-4 h-4 rounded text-primary-600"/>
 Job was won
 </label>
 </div>
 <div className="col-span-4">
 <label className={lbl}>Notes</label>
 <input className={inp} placeholder="Any observations about this job..."value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
 </div>
 </div>
 <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
 <button onClick={() => { setShowForm(false); setForm(emptyJob()); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
 <button onClick={handleSave} disabled={saving || !form.finalPrice} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
 {saving ? <Spinner /> : <Plus className="w-3.5 h-3.5"/>}
 Add Job
 </button>
 </div>
 </div>
 </Card>
 )}

 {/* Jobs list */}
 {isLoading ? (
 <div className="flex items-center justify-center py-12"><Spinner /></div>
 ) : jobs.length === 0 ? (
 <Card>
 <div className="py-16 text-center">
 <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3"/>
 <p className="text-slate-500 text-sm">No jobs yet. Add your first past job above or import a CSV.</p>
 </div>
 </Card>
 ) : (
 <Card>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-slate-100">
 {["Customer","Service","Sqft","Beds/Baths","Condition","Frequency","Pets","Price","Won",""].map(h => (
 <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
 ))}
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-50">
 {jobs.map(j => (
 <tr key={j.id} className="hover:bg-slate-50">
 <td className="px-4 py-2.5 font-medium text-slate-900">{j.customerName ||"—"}</td>
 <td className="px-4 py-2.5 text-slate-600 capitalize">{j.serviceType?.replace("-","")}</td>
 <td className="px-4 py-2.5 text-slate-500">{j.sqft ? `${j.sqft.toLocaleString()}` :"—"}</td>
 <td className="px-4 py-2.5 text-slate-500">{j.beds ||"—"} / {j.baths ||"—"}</td>
 <td className="px-4 py-2.5">
 <span className={`text-xs px-2 py-0.5 rounded-full ${j.conditionLevel ==="heavy"?"bg-red-50 text-red-600": j.conditionLevel ==="light"?"bg-green-50 text-green-600":"bg-slate-100 text-slate-600"}`}>
 {j.conditionLevel}
 </span>
 </td>
 <td className="px-4 py-2.5 text-slate-500 capitalize">{j.frequency}</td>
 <td className="px-4 py-2.5">{j.pets ? <span className="text-amber-600 text-xs">Yes</span> : <span className="text-slate-400 text-xs">No</span>}</td>
 <td className="px-4 py-2.5 font-semibold text-slate-900">${j.finalPrice.toFixed(0)}</td>
 <td className="px-4 py-2.5">{j.won ? <CheckCircle className="w-4 h-4 text-green-500"/> : <X className="w-4 h-4 text-slate-400"/>}</td>
 <td className="px-4 py-2.5">
 <button onClick={() => handleDelete(j.id)} disabled={deletingId === j.id} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
 {deletingId === j.id ? <Spinner /> : <Trash2 className="w-3.5 h-3.5"/>}
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </Card>
 )}

 <div className="flex items-center justify-between pt-2">
 <p className="text-sm text-slate-500">
 {jobs.length} job{jobs.length !== 1 ?"s":""} imported
 {jobs.length < 3 ?"— add at least 3 for analysis":"— ready for analysis"}
 </p>
 <button
 onClick={onNext}
 disabled={jobs.length < 1}
 className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
 >
 Next: Your Pricing <ChevronRight className="w-4 h-4"/>
 </button>
 </div>
 </div>
 );
}

// ===== Questionnaire Step =====
function QuestionnaireStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
 const queryClient = useQueryClient();
 const { data: existing } = useQuery<any>({ queryKey: ["/api/pricing/questionnaire"] });
 const [form, setForm] = useState({
 minJobPrice: 100, targetHourlyRevenue: 55, preferredCrewSize: 1,
 suppliesIncluded: true, recurringDiscount: 10, deepCleanMultiplier: 1.5,
 moveOutMultiplier: 1.75, petSurcharge: 25, travelSurcharge: 0,
 pricingByCondition: true, pricingByFrequency: true, pricingBySqft: true,
 neverGoBelow: 85, notes:"",
 });
 const [loaded, setLoaded] = useState(false);
 const [saving, setSaving] = useState(false);

 if (existing && !loaded) {
 setLoaded(true);
 setForm({
 minJobPrice: existing.minJobPrice ?? 100,
 targetHourlyRevenue: existing.targetHourlyRevenue ?? 55,
 preferredCrewSize: existing.preferredCrewSize ?? 1,
 suppliesIncluded: existing.suppliesIncluded ?? true,
 recurringDiscount: existing.recurringDiscount ?? 10,
 deepCleanMultiplier: existing.deepCleanMultiplier ?? 1.5,
 moveOutMultiplier: existing.moveOutMultiplier ?? 1.75,
 petSurcharge: existing.petSurcharge ?? 25,
 travelSurcharge: existing.travelSurcharge ?? 0,
 pricingByCondition: existing.pricingByCondition ?? true,
 pricingByFrequency: existing.pricingByFrequency ?? true,
 pricingBySqft: existing.pricingBySqft ?? true,
 neverGoBelow: existing.neverGoBelow ?? 85,
 notes: existing.notes ??"",
 });
 }

 const handleSave = async (andContinue = false) => {
 setSaving(true);
 try {
 await apiRequest("POST","/api/pricing/questionnaire", form);
 await queryClient.invalidateQueries({ queryKey: ["/api/pricing/questionnaire"] });
 if (andContinue) onNext();
 } catch (e: any) {
 alert(e.message ||"Failed to save");
 } finally {
 setSaving(false);
 }
 };

 const num = (field: string, label: string, opts?: { prefix?: string; suffix?: string; step?: number; min?: number }) => (
 <div>
 <label className="text-xs font-medium text-slate-500 mb-1 block">{label}</label>
 <div className="relative">
 {opts?.prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{opts.prefix}</span>}
 <input
 type="number"
 step={opts?.step ?? 1}
 min={opts?.min ?? 0}
 className={`w-full border border-slate-200 rounded-lg py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 ${opts?.prefix ?"pl-8 pr-3": opts?.suffix ?"pl-3 pr-8":"px-3"}`}
 value={(form as any)[field]}
 onChange={e => setForm(f => ({...f, [field]: parseFloat(e.target.value) || 0}))}
 />
 {opts?.suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{opts.suffix}</span>}
 </div>
 </div>
 );

 const tog = (field: string, label: string, hint?: string) => (
 <div className="flex items-center justify-between py-3 border-b border-slate-100">
 <div>
 <p className="text-sm font-medium text-slate-700">{label}</p>
 {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
 </div>
 <button
 onClick={() => setForm(f => ({...f, [field]: !(f as any)[field]}))}
 className={`text-2xl transition-colors ${(form as any)[field] ?"text-primary-600":"text-slate-300"}`}
 >
 {(form as any)[field] ? <ToggleRight /> : <ToggleLeft />}
 </button>
 </div>
 );

 return (
 <div className="space-y-6">
 <div>
 <h2 className="text-lg font-semibold text-slate-900">Step 2 — Your Pricing Assumptions</h2>
 <p className="text-sm text-slate-500 mt-0.5">Tell us how you think about pricing. We'll use this alongside your past jobs to build your rules.</p>
 </div>

 <div className="grid md:grid-cols-2 gap-6">
 <Card>
 <div className="p-5 space-y-4">
 <h3 className="text-sm font-semibold text-slate-900">Baseline Pricing</h3>
 <div className="grid grid-cols-2 gap-4">
 {num("minJobPrice","Minimum Job Price", { prefix:"$"})}
 {num("neverGoBelow","Never Quote Below", { prefix:"$"})}
 {num("targetHourlyRevenue","Target Revenue / Hour", { prefix:"$"})}
 {num("preferredCrewSize","Preferred Crew Size", { suffix:"ppl", min: 1 })}
 </div>
 </div>
 </Card>

 <Card>
 <div className="p-5 space-y-4">
 <h3 className="text-sm font-semibold text-slate-900">Service Multipliers</h3>
 <div className="grid grid-cols-2 gap-4">
 {num("deepCleanMultiplier","Deep Clean Multiplier", { suffix:"x", step: 0.05 })}
 {num("moveOutMultiplier","Move-In/Out Multiplier", { suffix:"x", step: 0.05 })}
 {num("petSurcharge","Pet Surcharge", { prefix:"$"})}
 {num("travelSurcharge","Travel Surcharge", { prefix:"$"})}
 </div>
 </div>
 </Card>

 <Card>
 <div className="p-5">
 <h3 className="text-sm font-semibold text-slate-900 mb-1">Discounts</h3>
 <div className="grid grid-cols-2 gap-4">
 {num("recurringDiscount","Recurring Client Discount", { suffix:"%", step: 0.5 })}
 </div>
 </div>
 </Card>

 <Card>
 <div className="p-5">
 <h3 className="text-sm font-semibold text-slate-900 mb-2">Pricing Factors</h3>
 {tog("suppliesIncluded","Supplies Included","Cleaning supplies are part of your service cost")}
 {tog("pricingBySqft","Price Varies by Square Footage","Larger homes cost more")}
 {tog("pricingByCondition","Price Varies by Condition","Heavy-condition homes cost more")}
 {tog("pricingByFrequency","Discounts for Recurring Clients","Regular clients get a lower rate")}
 </div>
 </Card>
 </div>

 <Card>
 <div className="p-5">
 <label className="text-xs font-medium text-slate-500 mb-1 block">Additional Notes (optional)</label>
 <textarea
 className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 h-20 resize-none"
 placeholder="Anything else about how you price jobs that we should know..."
 value={form.notes}
 onChange={e => setForm(f => ({...f, notes: e.target.value}))}
 />
 </div>
 </Card>

 <div className="flex items-center justify-between pt-2">
 <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm">
 Back
 </button>
 <div className="flex gap-3">
 <button onClick={() => handleSave(false)} disabled={saving} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
 Save
 </button>
 <button onClick={() => handleSave(true)} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
 {saving ? <Spinner /> : null}
 Next: Run Analysis <ChevronRight className="w-4 h-4"/>
 </button>
 </div>
 </div>
 </div>
 );
}

// ===== Analysis + Rules Step =====
function AnalysisStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
 const queryClient = useQueryClient();
 const { data: analysis, isLoading: analysisLoading } = useQuery<PricingAnalysis | null>({ queryKey: ["/api/pricing/analysis"] });
 const { data: rules = [], isLoading: rulesLoading } = useQuery<PricingRule[]>({ queryKey: ["/api/pricing/rules"] });
 const { data: jobs = [] } = useQuery<ImportedJob[]>({ queryKey: ["/api/pricing/jobs"] });
 const [analyzing, setAnalyzing] = useState(false);
 const [publishing, setPublishing] = useState(false);
 const [publishSuccess, setPublishSuccess] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [editForm, setEditForm] = useState<any>({});
 const [expandedId, setExpandedId] = useState<string | null>(null);
 const [activeTab, setActiveTab] = useState<"summary"|"opportunities"|"rules">("summary");

 const runAnalysis = async () => {
 setAnalyzing(true);
 try {
 await apiRequest("POST","/api/pricing/analyze");
 await queryClient.invalidateQueries({ queryKey: ["/api/pricing/analysis"] });
 await queryClient.invalidateQueries({ queryKey: ["/api/pricing/rules"] });
 setActiveTab("summary");
 } catch (e: any) {
 alert(e.message ||"Analysis failed");
 } finally {
 setAnalyzing(false);
 }
 };

 const toggleRule = async (rule: PricingRule) => {
 await apiRequest("PUT", `/api/pricing/rules/${rule.id}`, { active: !rule.active });
 await queryClient.invalidateQueries({ queryKey: ["/api/pricing/rules"] });
 };

 const deleteRule = async (id: string) => {
 await apiRequest("DELETE", `/api/pricing/rules/${id}`);
 await queryClient.invalidateQueries({ queryKey: ["/api/pricing/rules"] });
 };

 const startEdit = (rule: PricingRule) => {
 setEditingId(rule.id);
 setEditForm({
 label: rule.label,
 explanation: rule.explanation,
 formulaValue: typeof rule.formula?.value ==="number"? rule.formula.value : JSON.stringify(rule.formula?.value ??""),
 active: rule.active,
 });
 };

 const saveEdit = async (rule: PricingRule) => {
 let formulaValue: any = parseFloat(editForm.formulaValue);
 if (isNaN(formulaValue)) {
 try { formulaValue = JSON.parse(editForm.formulaValue); } catch { formulaValue = editForm.formulaValue; }
 }
 await apiRequest("PUT", `/api/pricing/rules/${rule.id}`, {
 label: editForm.label,
 explanation: editForm.explanation,
 formula: { ...rule.formula, value: typeof rule.formula?.value !=="number"? rule.formula?.value : formulaValue },
 active: editForm.active,
 });
 setEditingId(null);
 await queryClient.invalidateQueries({ queryKey: ["/api/pricing/rules"] });
 };

 const publish = async () => {
 setPublishing(true);
 try {
 await apiRequest("POST","/api/pricing/publish", { changeSummary: `Published ${rules.filter(r => r.active).length} active pricing rules` });
 setPublishSuccess(true);
 setTimeout(() => setPublishSuccess(false), 4000);
 } catch (e: any) {
 alert(e.message ||"Failed to publish");
 } finally {
 setPublishing(false);
 }
 };

 const inf = (analysis as any)?.inferredSummary || {};
 const opportunities = (analysis as any)?.revenueOpportunities || [];
 const activeRules = rules.filter(r => r.active);

 const inp ="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500";

 return (
 <div className="space-y-6">
 <div className="flex items-start justify-between">
 <div>
 <h2 className="text-lg font-semibold text-slate-900">Step 3 — Analysis & Pricing Rules</h2>
 <p className="text-sm text-slate-500 mt-0.5">Review your inferred pricing patterns, revenue opportunities, and editable pricing rules.</p>
 </div>
 <button
 onClick={runAnalysis}
 disabled={analyzing || jobs.length < 3}
 className="flex items-center gap-2 px-4 py-2 border border-primary-200 text-primary-700 rounded-lg text-sm hover:bg-primary-50 disabled:opacity-50"
 title={jobs.length < 3 ?"Add at least 3 jobs first":"Re-run analysis with latest data"}
 >
 {analyzing ? <Spinner /> : <RefreshCw className="w-4 h-4"/>}
 {analyzing ?"Analyzing...":"Re-run Analysis"}
 </button>
 </div>

 {/* Run analysis CTA if not yet done */}
 {!analysisLoading && !analysis && (
 <Card>
 <div className="py-16 text-center space-y-4">
 <Brain className="w-12 h-12 text-primary-400 mx-auto"/>
 <div>
 <p className="text-lg font-semibold text-slate-900">Ready to analyze your pricing</p>
 <p className="text-sm text-slate-500 mt-1">We'll analyze your {jobs.length} jobs and questionnaire to find patterns and build your pricing rules.</p>
 </div>
 <button
 onClick={runAnalysis}
 disabled={analyzing || jobs.length < 3}
 className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50"
 >
 {analyzing ? <Spinner /> : <Sparkles className="w-4 h-4"/>}
 {analyzing ?"Analyzing...":"Build My Pricing Logic"}
 </button>
 {jobs.length < 3 && <p className="text-xs text-amber-600">Add at least 3 past jobs first (you have {jobs.length}).</p>}
 </div>
 </Card>
 )}

 {analysisLoading && (
 <div className="flex items-center justify-center py-12"><Spinner /></div>
 )}

 {analysis && analysis.status ==="completed"&& (
 <>
 {/* Tab nav */}
 <div className="flex gap-1 border-b border-slate-200">
 {[
 { key:"summary", label:"How You Price Today", icon: BarChart2 },
 { key:"opportunities", label: `Revenue Opportunities (${opportunities.length})`, icon: TrendingUp },
 { key:"rules", label: `Pricing Rules (${rules.length})`, icon: Zap },
 ].map(t => (
 <button
 key={t.key}
 onClick={() => setActiveTab(t.key as any)}
 className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ?"border-primary-600 text-primary-600":"border-transparent text-slate-500 hover:text-slate-700"}`}
 >
 <t.icon className="w-4 h-4"/>
 {t.label}
 </button>
 ))}
 </div>

 {/* Summary tab */}
 {activeTab ==="summary"&& (
 <div className="space-y-4">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {[
 { label:"Avg Standard Clean", value: inf.avgStandardPrice ? `$${Math.round(inf.avgStandardPrice)}` :"—"},
 { label:"Avg Deep Clean", value: inf.avgDeepCleanPrice ? `$${Math.round(inf.avgDeepCleanPrice)}` :"—"},
 { label:"Price per Sq Ft", value: inf.avgPricePerSqft ? `$${inf.avgPricePerSqft.toFixed(2)}` :"—"},
 { label:"Est. Hourly Rate", value: inf.estimatedHourlyRate ? `$${Math.round(inf.estimatedHourlyRate)}/hr` :"—"},
 ].map(s => (
 <Card key={s.label}>
 <div className="p-4">
 <p className="text-xs text-slate-500 mb-1">{s.label}</p>
 <p className="text-xl font-bold text-slate-900">{s.value}</p>
 </div>
 </Card>
 ))}
 </div>
 {inf.pricingStyle && (
 <Card>
 <div className="p-4">
 <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Pricing Style</p>
 <p className="text-sm text-slate-700">{inf.pricingStyle}</p>
 </div>
 </Card>
 )}
 {inf.observations?.length > 0 && (
 <Card>
 <div className="p-4">
 <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Key Observations</p>
 <ul className="space-y-2">
 {inf.observations.map((o: string, i: number) => (
 <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
 <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5"/>
 {o}
 </li>
 ))}
 </ul>
 </div>
 </Card>
 )}
 <p className="text-xs text-slate-400">Analysis ran on {new Date(analysis.createdAt).toLocaleDateString()} using {analysis.jobCount} jobs.</p>
 </div>
 )}

 {/* Opportunities tab */}
 {activeTab ==="opportunities"&& (
 <div className="space-y-4">
 {opportunities.length === 0 ? (
 <Card><div className="py-10 text-center text-slate-400 text-sm">No revenue opportunities identified from current data.</div></Card>
 ) : opportunities.map((op: any, i: number) => (
 <Card key={i}>
 <div className="p-5">
 <div className="flex items-start justify-between gap-4">
 <div className="flex-1">
 <div className="flex items-center gap-2 mb-2">
 <TrendingUp className="w-4 h-4 text-green-500"/>
 <h4 className="text-sm font-semibold text-slate-900">{op.title}</h4>
 <span className={`text-xs px-2 py-0.5 rounded-full ${op.confidence ==="high"?"bg-green-50 text-green-600": op.confidence ==="medium"?"bg-yellow-50 text-yellow-600":"bg-slate-100 text-slate-500"}`}>
 {op.confidence} confidence
 </span>
 </div>
 <p className="text-sm text-slate-600 mb-2">{op.description}</p>
 {op.dataPoints && <p className="text-xs text-slate-400 italic">{op.dataPoints}</p>}
 </div>
 {op.estimatedImpact && (
 <div className="text-right shrink-0">
 <p className="text-xs text-slate-400">Est. Impact</p>
 <p className="text-sm font-bold text-green-600">{op.estimatedImpact}</p>
 </div>
 )}
 </div>
 </div>
 </Card>
 ))}
 </div>
 )}

 {/* Rules tab */}
 {activeTab ==="rules"&& (
 <div className="space-y-3">
 {publishSuccess && (
 <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-xl text-sm">
 <CheckCircle className="w-4 h-4"/>
 Pricing rules published successfully. The quote calculator now uses these rules.
 </div>
 )}

 <div className="flex items-center justify-between">
 <p className="text-sm text-slate-500">{activeRules.length} of {rules.length} rules active</p>
 <button
 onClick={publish}
 disabled={publishing || activeRules.length === 0}
 className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
 >
 {publishing ? <Spinner /> : <Unlock className="w-4 h-4"/>}
 Publish Pricing Rules
 </button>
 </div>

 {rulesLoading ? <div className="flex items-center justify-center py-8"><Spinner /></div> : rules.length === 0 ? (
 <Card><div className="py-10 text-center text-slate-400 text-sm">No rules yet. Run the analysis to generate rules.</div></Card>
 ) : rules.map(rule => {
 const isEditing = editingId === rule.id;
 const isExpanded = expandedId === rule.id;
 const srcBadge = SOURCE_BADGES[rule.source] || SOURCE_BADGES.user;
 const hasSimpleValue = typeof rule.formula?.value ==="number";

 return (
 <Card key={rule.id}>
 <div className="p-4">
 <div className="flex items-center gap-3">
 <button
 onClick={() => toggleRule(rule)}
 className={`shrink-0 text-xl transition-colors ${rule.active ?"text-primary-600":"text-slate-300"}`}
 >
 {rule.active ? <ToggleRight /> : <ToggleLeft />}
 </button>

 <div className="flex-1 min-w-0">
 {isEditing ? (
 <input className="w-full border border-primary-300 rounded-lg px-2 py-1 text-sm bg-white text-slate-900 focus:outline-none"
 value={editForm.label} onChange={e => setEditForm((f: any) => ({...f, label: e.target.value}))} />
 ) : (
 <div className="flex items-center gap-2 flex-wrap">
 <span className={`font-medium text-sm ${rule.active ?"text-slate-900":"text-slate-400"}`}>{rule.label}</span>
 <span className="text-xs text-slate-400">{RULE_TYPE_LABELS[rule.ruleType] || rule.ruleType}</span>
 <span className={`text-xs px-1.5 py-0.5 rounded-full ${srcBadge.color}`}>{srcBadge.label}</span>
 {!rule.active && <span className="text-xs text-slate-400 italic">(inactive)</span>}
 </div>
 )}
 </div>

 {hasSimpleValue && !isEditing && (
 <span className="text-sm font-semibold text-primary-600 shrink-0">
 {rule.ruleType ==="frequency_discount"? `${rule.formula?.value}%` : `$${rule.formula?.value}`}
 </span>
 )}

 <div className="flex items-center gap-1 shrink-0">
 <button onClick={() => setExpandedId(isExpanded ? null : rule.id)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
 {isExpanded ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
 </button>
 {!isEditing && (
 <button onClick={() => startEdit(rule)} className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg hover:bg-slate-100">
 <Edit2 className="w-3.5 h-3.5"/>
 </button>
 )}
 <button onClick={() => deleteRule(rule.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50">
 <Trash2 className="w-3.5 h-3.5"/>
 </button>
 </div>
 </div>

 {(isExpanded || isEditing) && (
 <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
 {isEditing ? (
 <>
 {hasSimpleValue && (
 <div>
 <label className="text-xs font-medium text-slate-500 mb-1 block">
 Value ({rule.ruleType ==="frequency_discount"?"%":"$"})
 </label>
 <input className={inp} type="number"step="0.01"value={editForm.formulaValue}
 onChange={e => setEditForm((f: any) => ({...f, formulaValue: e.target.value}))} />
 </div>
 )}
 <div>
 <label className="text-xs font-medium text-slate-500 mb-1 block">Explanation</label>
 <textarea className={`${inp} h-20 resize-none`} value={editForm.explanation}
 onChange={e => setEditForm((f: any) => ({...f, explanation: e.target.value}))} />
 </div>
 <div className="flex justify-end gap-2">
 <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">Cancel</button>
 <button onClick={() => saveEdit(rule)} className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-1.5">
 <Check className="w-3.5 h-3.5"/> Save
 </button>
 </div>
 </>
 ) : (
 <>
 {rule.explanation && <p className="text-xs text-slate-600">{rule.explanation}</p>}
 {rule.formula?.ranges && (
 <div className="overflow-x-auto">
 <table className="text-xs w-full">
 <thead><tr className="text-slate-400"><th className="text-left py-1">Sqft Range</th><th className="text-right py-1">Price</th></tr></thead>
 <tbody>
 {rule.formula.ranges.map((r: any, i: number) => (
 <tr key={i} className="border-t border-slate-50">
 <td className="py-1 text-slate-600">{r.min.toLocaleString()} – {r.max >= 99999 ?"∞": r.max.toLocaleString()} sqft</td>
 <td className="py-1 text-right font-medium text-slate-900">${r.price}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 {typeof rule.formula?.value ==="object"&& !rule.formula?.ranges && (
 <div className="flex flex-wrap gap-2">
 {Object.entries(rule.formula.value).map(([k, v]: any) => (
 <span key={k} className="text-xs px-2 py-1 bg-slate-100 rounded-lg text-slate-600">
 <strong className="capitalize">{k.replace("-","")}:</strong> {typeof v ==="number"? (v < 10 ? `${v}x` : `$${v}`) : `${v}%`}
 </span>
 ))}
 </div>
 )}
 <p className="text-xs text-slate-400">Variables: {rule.inputVariables?.join(",") ||"none"}</p>
 </>
 )}
 </div>
 )}
 </div>
 </Card>
 );
 })}
 </div>
 )}
 </>
 )}

 <div className="flex items-center justify-between pt-2">
 <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm">
 Back
 </button>
 <button
 onClick={onNext}
 className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
 >
 Next: Quote Calculator <ChevronRight className="w-4 h-4"/>
 </button>
 </div>
 </div>
 );
}

// ===== Quote Calculator Step =====
function CalculatorStep({ onBack }: { onBack: () => void }) {
 const { data: profile } = useQuery<any>({ queryKey: ["/api/pricing/profile"] });
 const { data: rules = [] } = useQuery<PricingRule[]>({ queryKey: ["/api/pricing/rules"] });
 const [job, setJob] = useState({
 serviceType:"standard", sqft:"", beds:"", baths:"", halfBaths:"0",
 conditionLevel:"standard", frequency:"one-time", pets: false,
 zipCode:"", addOns: [] as string[],
 });
 const [result, setResult] = useState<QuoteResult | null>(null);
 const [calculating, setCalculating] = useState(false);
 const [error, setError] = useState("");

 const hasPublished = !!profile;
 const activeRulesCount = rules.filter(r => r.active).length;

 const calculate = async () => {
 setCalculating(true);
 setError("");
 setResult(null);
 try {
 const res = await apiRequest("POST","/api/pricing/calculate", {
 ...job,
 sqft: job.sqft ? parseInt(job.sqft) : undefined,
 beds: job.beds ? parseInt(job.beds) : undefined,
 baths: job.baths ? parseFloat(job.baths) : undefined,
 halfBaths: parseInt(job.halfBaths) || 0,
 });
 setResult(res as any);
 } catch (e: any) {
 setError(e.message ||"Calculation failed");
 } finally {
 setCalculating(false);
 }
 };

 const inp ="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500";
 const lbl ="text-xs font-medium text-slate-500 mb-1 block";

 return (
 <div className="space-y-6">
 <div>
 <h2 className="text-lg font-semibold text-slate-900">Quote Calculator</h2>
 <p className="text-sm text-slate-500 mt-0.5">Enter a new job and get an instant quote based on your published pricing rules.</p>
 </div>

 {!hasPublished && (
 <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
 <AlertCircle className="w-5 h-5 text-amber-600 shrink-0"/>
 <div>
 <p className="text-sm font-medium text-amber-700">Rules not published yet</p>
 <p className="text-xs text-amber-600 mt-0.5">Go back to the Analysis step, review your rules, and click"Publish Pricing Rules"to activate the calculator.</p>
 </div>
 </div>
 )}

 {hasPublished && (
 <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200 text-sm text-green-700">
 <CheckCircle className="w-4 h-4 shrink-0"/>
 Using v{profile.version} of your pricing rules ({activeRulesCount} active rules) — published {new Date(profile.publishedAt).toLocaleDateString()}
 </div>
 )}

 <div className="grid md:grid-cols-2 gap-6">
 <Card>
 <div className="p-5 space-y-4">
 <h3 className="text-sm font-semibold text-slate-900">Job Details</h3>
 <div className="grid grid-cols-2 gap-3">
 <div className="col-span-2">
 <label className={lbl}>Service Type</label>
 <select className={inp} value={job.serviceType} onChange={e => setJob(j => ({...j, serviceType: e.target.value}))}>
 {SERVICE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
 </select>
 </div>
 <div>
 <label className={lbl}>Square Feet</label>
 <input className={inp} type="number"placeholder="1400"value={job.sqft} onChange={e => setJob(j => ({...j, sqft: e.target.value}))} />
 </div>
 <div>
 <label className={lbl}>Bedrooms</label>
 <input className={inp} type="number"placeholder="3"value={job.beds} onChange={e => setJob(j => ({...j, beds: e.target.value}))} />
 </div>
 <div>
 <label className={lbl}>Bathrooms</label>
 <input className={inp} type="number"step="0.5"placeholder="2"value={job.baths} onChange={e => setJob(j => ({...j, baths: e.target.value}))} />
 </div>
 <div>
 <label className={lbl}>Half Baths</label>
 <input className={inp} type="number"placeholder="0"value={job.halfBaths} onChange={e => setJob(j => ({...j, halfBaths: e.target.value}))} />
 </div>
 <div>
 <label className={lbl}>Condition</label>
 <select className={inp} value={job.conditionLevel} onChange={e => setJob(j => ({...j, conditionLevel: e.target.value}))}>
 {CONDITION_LEVELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
 </select>
 </div>
 <div>
 <label className={lbl}>Frequency</label>
 <select className={inp} value={job.frequency} onChange={e => setJob(j => ({...j, frequency: e.target.value}))}>
 {FREQUENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
 </select>
 </div>
 <div>
 <label className={lbl}>Zip Code</label>
 <input className={inp} placeholder="30301"value={job.zipCode} onChange={e => setJob(j => ({...j, zipCode: e.target.value}))} />
 </div>
 <div className="flex items-center gap-2 col-span-2 pt-1">
 <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
 <input type="checkbox"checked={job.pets} onChange={e => setJob(j => ({...j, pets: e.target.checked}))} className="w-4 h-4 rounded text-primary-600"/>
 Pets in home
 </label>
 </div>
 </div>

 <button
 onClick={calculate}
 disabled={calculating || !hasPublished}
 className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 mt-2"
 >
 {calculating ? <Spinner /> : <Calculator className="w-4 h-4"/>}
 {calculating ?"Calculating...":"Calculate Quote"}
 </button>
 {error && <p className="text-sm text-red-600">{error}</p>}
 </div>
 </Card>

 {/* Result panel */}
 <div className="space-y-4">
 {result ? (
 <>
 <Card>
 <div className="p-5 text-center">
 <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Recommended Quote</p>
 <p className="text-5xl font-bold text-primary-600">${result.total.toFixed(0)}</p>
 <p className="text-xs text-slate-400 mt-2">{result.rulesApplied} rule{result.rulesApplied !== 1 ?"s":""} applied</p>
 </div>
 </Card>

 {result.warnings.length > 0 && (
 <div className="p-3 bg-amber-50 rounded-xl text-sm text-amber-700 flex items-start gap-2">
 <AlertCircle className="w-4 h-4 shrink-0 mt-0.5"/>
 <span>{result.warnings[0]}</span>
 </div>
 )}

 <Card>
 <div className="p-4">
 <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Price Breakdown</p>
 <div className="space-y-2">
 {result.breakdown.map((line, i) => (
 <div key={i} className="flex items-center justify-between text-sm">
 <span className="text-slate-600 flex items-center gap-1.5">
 {line.type ==="discount"? <span className="w-2 h-2 rounded-full bg-green-400 shrink-0"/> :
 line.type ==="floor"? <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"/> :
 line.type ==="multiply"? <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0"/> :
 <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0"/>}
 {line.label}
 </span>
 <span className={`font-medium ${line.effect < 0 ?"text-green-600": line.type ==="floor"?"text-amber-600":"text-slate-900"}`}>
 {line.type ==="multiply"? `×${((line.runningTotal / (line.runningTotal - line.effect))).toFixed(2)}` :
 line.effect < 0 ? `−$${Math.abs(line.effect).toFixed(0)}` :
 line.type ==="floor"? `floor $${line.runningTotal}` :
 `+$${line.effect.toFixed(0)}`}
 </span>
 </div>
 ))}
 <div className="border-t border-slate-100 pt-2 flex items-center justify-between font-semibold">
 <span className="text-slate-900">Total</span>
 <span className="text-primary-600 text-lg">${result.total.toFixed(2)}</span>
 </div>
 </div>
 </div>
 </Card>
 </>
 ) : (
 <Card>
 <div className="py-20 text-center">
 <Calculator className="w-10 h-10 text-slate-300 mx-auto mb-3"/>
 <p className="text-sm text-slate-400">Fill in the job details and click Calculate to see your quote.</p>
 </div>
 </Card>
 )}
 </div>
 </div>

 <div className="flex items-center justify-between pt-2">
 <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm">
 Back
 </button>
 </div>
 </div>
 );
}

// ===== Main Page =====
export default function PricingLogicPage() {
 const { data: jobs = [] } = useQuery<ImportedJob[]>({ queryKey: ["/api/pricing/jobs"] });
 const [step, setStep] = useState<Step>(jobs.length === 0 ?"intro":"jobs");

 // Move past intro if jobs exist
 const currentStep = step ==="intro"&& jobs.length > 0 ?"jobs": step;

 if (currentStep ==="intro") {
 return (
 <div className="p-6 max-w-4xl mx-auto">
 <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-8">
 <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
 <Brain className="w-8 h-8 text-primary-600"/>
 </div>
 <div className="max-w-xl space-y-3">
 <h1 className="text-3xl font-bold text-slate-900">Pricing Logic Engine</h1>
 <p className="text-lg text-slate-500">Upload past quotes and we'll build your pricing system — so you quote faster, more consistently, and stop leaving money on the table.</p>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left max-w-2xl w-full">
 {[
 { icon: Zap, title:"Quote faster", desc:"Get instant prices from your own rules"},
 { icon: CheckCircle, title:"Price consistently", desc:"Every quote follows the same logic"},
 { icon: TrendingUp, title:"Find underpriced jobs", desc:"AI identifies revenue you're leaving behind"},
 { icon: ArrowRight, title:"Use it everywhere", desc:"Rules power your entire quoting workflow"},
 ].map(b => (
 <Card key={b.title}>
 <div className="p-4 space-y-1">
 <b.icon className="w-5 h-5 text-primary-500 mb-2"/>
 <p className="text-sm font-semibold text-slate-900">{b.title}</p>
 <p className="text-xs text-slate-500">{b.desc}</p>
 </div>
 </Card>
 ))}
 </div>

 <button
 onClick={() => setStep("jobs")}
 className="flex items-center gap-2 px-8 py-3.5 bg-primary-600 text-white rounded-2xl font-semibold text-lg hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
 >
 <Brain className="w-5 h-5"/>
 Build My Pricing Logic
 </button>

 <p className="text-xs text-slate-400">Takes about 5 minutes. You can edit everything before publishing.</p>
 </div>
 </div>
 );
 }

 return (
 <div className="p-6 max-w-5xl mx-auto space-y-6">
 <PageHeader
 title="Pricing Logic Engine"
 subtitle="Turn your past jobs into a pricing system that quotes consistently and protects your margins."
 />

 <StepNav
 current={currentStep}
 onClick={setStep}
 />

 {currentStep ==="jobs"&& (
 <JobsStep onNext={() => setStep("questionnaire")} />
 )}
 {currentStep ==="questionnaire"&& (
 <QuestionnaireStep onNext={() => setStep("analysis")} onBack={() => setStep("jobs")} />
 )}
 {currentStep ==="analysis"&& (
 <AnalysisStep onNext={() => setStep("calculator")} onBack={() => setStep("questionnaire")} />
 )}
 {currentStep ==="calculator"&& (
 <CalculatorStep onBack={() => setStep("analysis")} />
 )}
 </div>
 );
}
