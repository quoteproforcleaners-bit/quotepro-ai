import { useParams, useNavigate } from"react-router-dom";
import { useQuery, useMutation } from"@tanstack/react-query";
import { queryClient } from"../lib/queryClient";
import { apiPut, apiDelete, apiPost, apiGet } from"../lib/api";
import { useAuth } from"../lib/auth";
import { useSubscription } from"../lib/subscription";
import SendQuoteModal from"../components/SendQuoteModal";
import EditQuoteModal from"../components/EditQuoteModal";
import DispatchCard from"../components/DispatchCard";
import { CommercialBenchmarkBadge, ResidentialBenchmarkBadge } from"../components/BenchmarkBadge";
import {
 ExternalLink,
 Copy,
 Send,
 Download,
 Trash2,
 CheckCircle,
 XCircle,
 Clock,
 CalendarDays,
 Home,
 Bed,
 Bath,
 Maximize,
 PawPrint,
 Users as UsersIcon,
 Sparkles,
 MessageSquare,
 FileText,
 Link2,
 RefreshCw,
 DollarSign,
 Star,
 Gift,
 Calendar,
 Mail,
 Phone,
 Eye,
 CreditCard,
 TrendingUp,
 Lightbulb,
 ChevronDown,
 ChevronUp,
 Zap,
 Receipt,
 Pencil,
 Wand2,
} from"lucide-react";
import { useState, useEffect } from"react";
import {
 PageHeader,
 Card,
 CardHeader,
 Badge,
 Button,
 ConfirmModal,
 Modal,
 Spinner,
 EmptyState,
 Timeline,
 Toggle,
 ProgressBar,
 Toast,
} from"../components/ui";
import { QuickAddCleanPanel } from"../components/QuickAddCleanPanel";

type MessagePurpose ="send_quote"|"follow_up"|"thank_you"|"reminder"|"upsell"|"review_request"|"payment_failed";
type MessageChannel ="email"|"sms";


// ─── QuoteDoctor Inline Card (interactive slider + AI modal) ─────────────────

const RES_BM_DATA: Record<number,{low:number;high:number;avg:number}> = {
  1:{low:75,high:110,avg:92}, 2:{low:100,high:155,avg:127},
  3:{low:130,high:185,avg:157}, 4:{low:175,high:250,avg:212}, 5:{low:220,high:340,avg:278},
};

// Shared zone classification — used by both QuoteDoctor and BenchmarkBadge
function getPriceZone(price: number, adjLow: number, adjAvg: number, adjHigh: number): "below" | "competitive" | "market" | "premium" {
  if (price < adjLow) return "below";
  if (price <= adjAvg) return "competitive";
  if (price <= adjHigh) return "market";
  return "premium";
}

const ZONE_CONFIG = {
  below:       { label: "Underpriced",          color: "#d97706", bg: "rgba(251,191,36,0.15)",    border: "#d9770660" },
  competitive: { label: "Competitive",           color: "#2563eb", bg: "rgba(37,99,235,0.12)",     border: "#2563eb60" },
  market:      { label: "Market rate",           color: "#059669", bg: "rgba(16,185,129,0.15)",    border: "#05966960" },
  premium:     { label: "Premium",               color: "#7c3aed", bg: "rgba(139,92,246,0.15)",    border: "#7c3aed60" },
};

const ZONE_SUGGESTION: Record<string, (vals: { abs: number; adjAvg: number; sliderVal: number }) => string> = {
  below:       ({ abs, adjAvg, sliderVal }) => `${abs}% below market — raise to $${Math.round(adjAvg)} to hit midpoint (+$${Math.round(adjAvg - sliderVal)})`,
  competitive: ({ abs }) => `${abs}% below market average — competitive and close to the sweet spot`,
  market:      () => "Your price is in the national sweet spot — well positioned",
  premium:     ({ sliderVal, adjAvg }) => `Currently $${Math.round(sliderVal - adjAvg)} above avg — be ready to justify premium value`,
};

interface QuoteDoctorCardProps {
  quote: any;
  details: any;
  addOns: any;
  quoteId: string;
  showToast: (msg: string, variant?: "success"|"error"|"info") => void;
  onPriceApplied: (newTotal: number) => void;
  onSliderChange: (val: number) => void;
  onFlashTier: (tierKey: string) => void;
}

function QuoteDoctorCard({ quote, details, addOns, quoteId, showToast, onPriceApplied, onSliderChange, onFlashTier }: QuoteDoctorCardProps) {
  const beds = Number(details?.beds || 0);
  const freq = quote.frequencySelected as string | undefined;
  const bm = beds > 0 ? RES_BM_DATA[Math.min(5, Math.max(1, beds))] : null;
  const adjLow  = bm ? ((freq==="weekly"||freq==="biweekly") ? bm.low*0.8  : bm.low)  : 0;
  const adjHigh = bm ? ((freq==="weekly"||freq==="biweekly") ? bm.high*0.8 : bm.high) : 0;
  const adjAvg  = bm ? (adjLow + adjHigh) / 2 : 0;

  // Bug 4: slider range anchored to benchmark low/high
  const sliderMin = bm ? Math.floor(adjLow * 0.7) : Math.floor(Number(quote.total||0) * 0.5);
  const sliderMax = bm ? Math.ceil(adjHigh * 1.4)  : Math.ceil(Number(quote.total||0) * 1.6);

  const [sliderVal, setSliderVal] = useState<number>(Number(quote.total || 0));
  const [applying, setApplying] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => { setSliderVal(Number(quote.total || 0)); }, [quote.total]);

  const zone = bm ? getPriceZone(sliderVal, adjLow, adjAvg, adjHigh) : "market";
  const zc = ZONE_CONFIG[zone];
  const pctVsAvg = bm && adjAvg > 0 ? Math.round(((sliderVal - adjAvg) / adjAvg) * 100) : 0;
  const abs = Math.abs(pctVsAvg);
  const suggestion = bm ? ZONE_SUGGESTION[zone]({ abs, adjAvg, sliderVal }) : "";

  const toPct = (v: number) => Math.min(100, Math.max(0, ((v - sliderMin) / (sliderMax - sliderMin)) * 100));
  const lowPct   = toPct(adjLow);
  const avgPct   = toPct(adjAvg);
  const highPct  = toPct(adjHigh);
  const pricePct = toPct(sliderVal);

  // Bug 1: scale all tiers proportionally on apply
  const handleApply = async () => {
    if (applying) return;
    setApplying(true);
    try {
      const opts = (quote.options || {}) as Record<string, any>;
      const selectedKey = quote.selectedOption || Object.keys(opts)[0] || "better";
      const currentSelectedPrice = Number(opts[selectedKey]?.price ?? opts[selectedKey] ?? quote.total ?? 0);

      let updatedOptions = { ...opts };
      if (currentSelectedPrice > 0 && Object.keys(opts).length > 0) {
        for (const key of Object.keys(opts)) {
          const tierVal = opts[key];
          const tierPrice = Number(typeof tierVal === "object" ? tierVal?.price : tierVal) || 0;
          if (key === selectedKey) {
            updatedOptions[key] = typeof tierVal === "object"
              ? { ...tierVal, price: sliderVal }
              : sliderVal;
          } else if (tierPrice > 0) {
            const ratio = tierPrice / currentSelectedPrice;
            const scaled = Math.round(ratio * sliderVal);
            updatedOptions[key] = typeof tierVal === "object"
              ? { ...tierVal, price: scaled }
              : scaled;
          }
        }
      }

      await apiPut(`/api/quotes/${quoteId}`, { total: sliderVal, options: updatedOptions });
      queryClient.invalidateQueries({ queryKey: [`/api/quotes/${quoteId}`] });
      onPriceApplied(sliderVal);
      onFlashTier(selectedKey);
      showToast("Price updated to $" + sliderVal.toLocaleString(), "success");
    } catch (e: any) {
      showToast(e?.message || "Failed to update price", "error");
    } finally {
      setApplying(false);
    }
  };

  const priceChanged = Math.abs(sliderVal - Number(quote.total || 0)) > 0.5;

  return (
    <>
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1e40af 100%)",
        borderRadius: 14, padding: "16px 18px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -20, right: -20, width: 120, height: 120,
          background: "radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 70%)",
          borderRadius: "50%", pointerEvents: "none",
        }} />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div style={{ background:"rgba(99,102,241,0.25)", borderRadius:8, padding:6 }}>
              <Wand2 className="w-3.5 h-3.5 text-indigo-300"/>
            </div>
            <span className="text-white font-semibold text-sm">QuoteDoctor</span>
          </div>
          {bm ? (
            <span style={{
              background: zc.bg, border: "1px solid " + zc.border,
              color: zc.color, fontSize: 10, fontWeight: 700,
              padding: "3px 9px", borderRadius: 20,
            }}>{zc.label}</span>
          ) : null}
        </div>

        {bm ? (
          <div style={{ marginBottom: 10 }}>
            <div style={{ position:"relative", height:28, marginBottom:4 }}>
              {/* Floating price label */}
              <div style={{
                position:"absolute", bottom:"100%", marginBottom:6,
                left: pricePct + "%", transform:"translateX(-50%)",
                background: zc.color, color:"#fff",
                fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:8,
                whiteSpace:"nowrap", boxShadow:"0 1px 4px rgba(0,0,0,0.25)",
                pointerEvents:"none", transition:"left 0.05s",
              }}>{"$" + sliderVal.toLocaleString()}</div>

              {/* Base track */}
              <div style={{ position:"absolute", top:12, left:0, right:0, height:6, background:"rgba(255,255,255,0.12)", borderRadius:999 }}/>

              {/* Zone bands */}
              {/* Below-market zone (amber tint) */}
              <div style={{ position:"absolute", top:12, height:6, left:0, width: lowPct + "%", background:"rgba(245,158,11,0.35)", borderRadius:"999px 0 0 999px" }}/>
              {/* Market range zone (green) */}
              <div style={{ position:"absolute", top:12, height:6, left: lowPct + "%", width: (highPct - lowPct) + "%", background:"linear-gradient(90deg,#34d399,#10b981,#34d399)", borderRadius:999 }}/>
              {/* Premium zone (violet tint) */}
              <div style={{ position:"absolute", top:12, height:6, left: highPct + "%", width: (100 - highPct) + "%", background:"rgba(139,92,246,0.35)", borderRadius:"0 999px 999px 0" }}/>
              {/* Avg tick mark */}
              <div style={{ position:"absolute", top:8, height:14, left: avgPct + "%", transform:"translateX(-50%)", width:2, background:"#fff", opacity:0.5, borderRadius:999 }}/>

              {/* Invisible range input */}
              <input
                type="range" min={sliderMin} max={sliderMax} step={5} value={sliderVal}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSliderVal(v);
                  onSliderChange(v);  // Bug 2: live sync with BenchmarkBadge
                }}
                style={{ position:"absolute", top:0, left:0, right:0, width:"100%", height:28, opacity:0, cursor:"pointer", zIndex:3, margin:0 }}
              />
              {/* Thumb */}
              <div style={{
                position:"absolute", top:6, left: pricePct + "%", transform:"translateX(-50%)",
                width:18, height:18, background: zc.color, borderRadius:"50%",
                border:"2.5px solid #fff", boxShadow:"0 0 0 2px " + zc.color + "40, 0 2px 6px rgba(0,0,0,0.3)",
                pointerEvents:"none", zIndex:2, transition:"left 0.05s",
              }}/>
            </div>

            {/* Zone labels */}
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, fontWeight:600, color:"rgba(255,255,255,0.45)" }}>
              <span>{"$" + Math.round(adjLow) + " low"}</span>
              <span style={{ color:"#34d399" }}>{"avg $" + Math.round(adjAvg)}</span>
              <span>{"$" + Math.round(adjHigh) + " high"}</span>
            </div>
          </div>
        ) : null}

        {suggestion ? (
          <p style={{ color:"rgba(203,213,225,1)", fontSize:11, lineHeight:1.45, marginBottom:12 }}>{suggestion}</p>
        ) : (
          <p style={{ color:"rgba(203,213,225,1)", fontSize:11, lineHeight:1.45, marginBottom:12 }}>
            {quote.status === "draft"
              ? "Drag the slider to adjust your price and see how it compares to the market."
              : "Your quote is out. Use QuoteDoctor to rewrite it and close more jobs."}
          </p>
        )}

        <div className="flex gap-2 flex-wrap">
          {bm ? (
            <button
              onClick={handleApply}
              disabled={!priceChanged || applying}
              className="flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 transition-all"
              style={{
                background: priceChanged ? zc.color : "rgba(255,255,255,0.1)",
                color: priceChanged ? "#fff" : "rgba(255,255,255,0.35)",
                border: "none", cursor: priceChanged ? "pointer" : "not-allowed",
              }}
            >
              {applying ? <RefreshCw className="w-3 h-3 animate-spin"/> : <CheckCircle className="w-3 h-3"/>}
              {applying ? "Saving…" : "Apply $" + sliderVal.toLocaleString()}
            </button>
          ) : null}

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-white rounded-lg px-3 py-1.5 transition-all hover:opacity-90"
            style={{ background:"rgba(99,102,241,0.55)", border:"1px solid rgba(99,102,241,0.7)" }}
          >
            <Zap className="w-3 h-3"/>
            AI Rewrite
          </button>
        </div>
      </div>

      {modalOpen ? (
        <QuoteDoctorModal
          quote={quote}
          details={details}
          adjLow={adjLow}
          adjAvg={adjAvg}
          adjHigh={adjHigh}
          sliderVal={sliderVal}
          zone={zone}
          quoteId={quoteId}
          showToast={showToast}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </>
  );
}

// ─── QuoteDoctor AI Rewrite Modal ──────────────────────────────────────────────

interface QuoteDoctorModalProps {
  quote: any;
  details: any;
  adjLow: number;
  adjAvg: number;
  adjHigh: number;
  sliderVal: number;
  zone: "below" | "competitive" | "market" | "premium";
  quoteId: string;
  showToast: (msg: string, variant?: "success"|"error"|"info") => void;
  onClose: () => void;
}

function QuoteDoctorModal({ quote, details, adjLow, adjAvg, adjHigh, sliderVal, zone, quoteId, showToast, onClose }: QuoteDoctorModalProps) {
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string|null>(null);

  // Map zone to the 3-bucket the backend needs
  const priceZone = zone === "below" ? "below" : zone === "premium" ? "above" : "at";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiPost("/api/quote-doctor/justify", {
          priceZone,
          price: sliderVal,
          adjAvg: Math.round(adjAvg),
          beds: Number(details?.beds || 0),
          sqft: Number(details?.sqft || 0),
          condition: details?.condition || "",
          frequency: quote.frequencySelected || "one-time",
        }) as any;
        if (!cancelled) setMessage(data.message || "");
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "AI generation failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleCopyToQuote = async () => {
    if (copying) return;
    setCopying(true);
    try {
      await apiPut(`/api/quotes/${quoteId}`, { notes: message });
      queryClient.invalidateQueries({ queryKey: [`/api/quotes/${quoteId}`] });
      setCopied(true);
      showToast("Message copied to quote notes", "success");
      setTimeout(() => { setCopied(false); onClose(); }, 1200);
    } catch (e: any) {
      showToast("Failed to save to quote", "error");
    } finally {
      setCopying(false);
    }
  };

  const zc = ZONE_CONFIG[zone];
  const zoneLabels: Record<string, string> = {
    below: "Value-Forward Message",
    competitive: "Competitive Positioning",
    market: "Confident Market Rate",
    premium: "Premium Justification",
  };

  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(15,23,42,0.7)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background:"#fff", borderRadius:20, maxWidth:500, width:"100%", boxShadow:"0 24px 80px rgba(0,0,0,0.25)", overflow:"hidden" }}>
        {/* Header */}
        <div style={{ background:"linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1e40af 100%)", padding:"18px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ background:"rgba(99,102,241,0.25)", borderRadius:8, padding:7 }}><Zap className="w-4 h-4 text-indigo-300"/></div>
            <div>
              <p style={{ color:"#fff", fontWeight:700, fontSize:14 }}>AI Rewrite</p>
              <p style={{ color:"rgba(148,163,184,1)", fontSize:11, marginTop:1 }}>{zoneLabels[zone]}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", border:"none", borderRadius:8, padding:"6px 8px", color:"rgba(255,255,255,0.7)", cursor:"pointer", fontSize:16, lineHeight:1 }}>&#x2715;</button>
        </div>

        <div style={{ padding:"20px 20px 22px" }}>
          {/* Price zone badge */}
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <span style={{ background: zc.bg, border:"1px solid " + zc.border, color: zc.color, fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20 }}>{zc.label}</span>
            <span style={{ fontSize:11, color:"#94a3b8" }}>
              {"$" + Math.round(sliderVal) + " · national range $" + Math.round(adjLow) + "–$" + Math.round(adjHigh)}
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign:"center", padding:"36px 0" }}>
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-3"/>
              <p style={{ color:"#64748b", fontSize:13, fontWeight:500 }}>Writing your message…</p>
            </div>
          ) : error ? (
            <div style={{ color:"#dc2626", fontSize:13, textAlign:"center", padding:"20px 0" }}>{error}</div>
          ) : (
            <>
              <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:"14px 16px", marginBottom:16 }}>
                <p style={{ fontSize:13, color:"#1e293b", lineHeight:1.65 }}>{message}</p>
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button
                  onClick={handleCopyToQuote}
                  disabled={copying}
                  style={{
                    flex:1, padding:"11px 0", borderRadius:10, border:"none",
                    background: copied ? "#059669" : "#2563eb",
                    color:"#fff", fontSize:13, fontWeight:700, cursor: copying ? "wait" : "pointer",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:7,
                    transition:"background 0.2s",
                  }}
                >
                  {copying
                    ? <><RefreshCw className="w-4 h-4 animate-spin"/> Saving…</>
                    : copied
                    ? <><CheckCircle className="w-4 h-4"/> Saved to Quote</>
                    : <><FileText className="w-4 h-4"/> Copy to Quote Notes</>
                  }
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(message); showToast("Message copied to clipboard"); }}
                  style={{ padding:"11px 14px", borderRadius:10, border:"1px solid #e2e8f0", background:"#fff", color:"#475569", fontSize:13, fontWeight:600, cursor:"pointer" }}
                >
                  Copy
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuoteDetailPage() {
 const { id } = useParams();
 const navigate = useNavigate();
 const { business } = useAuth();
 const { isFree, isStarter, startCheckout } = useSubscription();
 const [copied, setCopied] = useState(false);
 const [portalLinkCopied, setPortalLinkCopied] = useState(false);
 const [portalLinkLoading, setPortalLinkLoading] = useState(false);
 const [sendModalOpen, setSendModalOpen] = useState(false);
 const [deleteOpen, setDeleteOpen] = useState(false);
 const [aiDrafts, setAiDrafts] = useState<Record<string, string>>({});
 const [aiDraftLoading, setAiDraftLoading] = useState<string | null>(null);
 const [smsEditMode, setSmsEditMode] = useState(false);
 const [depositEditing, setDepositEditing] = useState(false);
 const [depositAmount, setDepositAmount] = useState("");
 const [depositRequired, setDepositRequired] = useState(false);
 const [calendarLoading, setCalendarLoading] = useState(false);
 const [invoiceLoading, setInvoiceLoading] = useState(false);
 const [generatedPacket, setGeneratedPacket] = useState<{ id: string; invoiceNumber: string } | null>(null);
 const [editModalOpen, setEditModalOpen] = useState(false);
 const [syncingQbo, setSyncingQbo] = useState(false);
 const [playChannels, setPlayChannels] = useState<Record<number,"sms"|"email">>({});
 const [playDrafts, setPlayDrafts] = useState<Record<number, string>>({});
 const [playGenerating, setPlayGenerating] = useState<Record<number, boolean>>({});
 const [playSending, setPlaySending] = useState<Record<number, boolean>>({});
 const [aiCommsSending, setAiCommsSending] = useState(false);
 const [reviewModalOpen, setReviewModalOpen] = useState(false);
 const [reviewEmailSubject, setReviewEmailSubject] = useState("");
 const [reviewEmailContent, setReviewEmailContent] = useState("");
 const [reviewGenerating, setReviewGenerating] = useState(false);
 const [reviewSending, setReviewSending] = useState(false);
 const [expandedRec, setExpandedRec] = useState<number | null>(null);
 const [msgChannel, setMsgChannel] = useState<MessageChannel>("email");
 const [msgPurpose, setMsgPurpose] = useState<MessagePurpose>("follow_up");
 const [followUpEditOpen, setFollowUpEditOpen] = useState(false);
 const [followUpEditText, setFollowUpEditText] = useState("");
 const [followUpSendingNow, setFollowUpSendingNow] = useState(false);
 const [followUpPreviewLoading, setFollowUpPreviewLoading] = useState(false);
 const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
 const [acceptedUpgradeOpen, setAcceptedUpgradeOpen] = useState(false);
 const [toast, setToast] = useState<{ message: string; variant:"success"|"error"|"info"} | null>(null);
 const [stripeInvoiceSending, setStripeInvoiceSending] = useState(false);
 const [stripeInvoiceSuccess, setStripeInvoiceSuccess] = useState<string | null>(null);
 // QuoteDoctor live sync state
 const [livePrice, setLivePrice] = useState<number | null>(null);
 const [flashTier, setFlashTier] = useState<string | null>(null);

 const showToast = (message: string, variant:"success"|"error"|"info"="success") => {
 setToast({ message, variant });
 };

 const { data: quote, isLoading } = useQuery<any>({
 queryKey: [`/api/quotes/${id}`],
 });

 const { data: recommendations } = useQuery<any[]>({
 queryKey: [`/api/quotes/${id}/recommendations`],
 enabled: !!quote,
 });

 const { data: calendarEvents } = useQuery<any[]>({
 queryKey: [`/api/jobs/quote/${id}`],
 enabled: !!quote,
 });

 const { data: settings } = useQuery<any>({
 queryKey: ["/api/settings"],
 });

 const { data: businessProfile } = useQuery<any>({
 queryKey: ["/api/business"],
 });

 const { data: quoteCustomer } = useQuery<any>({
 queryKey: [`/api/customers/${quote?.customerId}`],
 enabled: !!quote?.customerId,
 });

 const { data: automationRules, refetch: refetchAutomation } = useQuery<any>({
 queryKey: ["/api/automations"],
 });

 const { data: scheduledFollowUps, refetch: refetchFollowUps } = useQuery<any[]>({
 queryKey: [`/api/quotes/${id}/scheduled-followups`],
 enabled: !!quote && quote.status ==="sent",
 refetchInterval: 30000,
 });

 const toggleFollowUpsMutation = useMutation({
 mutationFn: (enabled: boolean) => apiPut("/api/automations", { quoteFollowupsEnabled: enabled }),
 onSuccess: () => {
 refetchAutomation();
 if (!automationRules?.quoteFollowupsEnabled) {
 refetchFollowUps();
 }
 },
 });

 const updateTimingMutation = useMutation({
 mutationFn: (minutes: number) => apiPut("/api/automations", {
 followupSchedule: [{ delayMinutes: minutes, templateKey: `followup_${minutes}m` }],
 }),
 onSuccess: () => refetchAutomation(),
 });

 const cancelFollowUpMutation = useMutation({
 mutationFn: (commId: string) => apiDelete(`/api/communications/${commId}`),
 onSuccess: () => refetchFollowUps(),
 });

 const updateFollowUpMutation = useMutation({
 mutationFn: ({ commId, content }: { commId: string; content: string }) =>
 apiPut(`/api/communications/${commId}`, { content }),
 onSuccess: () => { refetchFollowUps(); setFollowUpEditOpen(false); },
 });

 const { data: linkedJobs = [] } = useQuery<any[]>({
 queryKey: [`/api/jobs`, { quoteId: id }],
 queryFn: () =>
 fetch(`/api/jobs?quoteId=${id}`, { credentials:"include"}).then((r) => r.json()),
 enabled: !!id,
 });

 const linkedJob = linkedJobs?.[0] || null;

 const statusMutation = useMutation({
 mutationFn: (status: string) => apiPut(`/api/quotes/${id}`, { status }),
 onSuccess: (_data, status) => {
 queryClient.invalidateQueries({ queryKey: [`/api/quotes/${id}`] });
 queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
 if (status ==="accepted") {
 setScheduleModalOpen(true);
 if (isFree || isStarter) {
 setTimeout(() => setAcceptedUpgradeOpen(true), 1200);
 }
 }
 },
 });

 const deleteMutation = useMutation({
 mutationFn: () => apiDelete(`/api/quotes/${id}`),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
 navigate("/quotes");
 },
 });

 const depositMutation = useMutation({
 mutationFn: (data: { depositRequired: boolean; depositAmount: number; depositPaid?: boolean }) =>
 apiPut(`/api/quotes/${id}`, data),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: [`/api/quotes/${id}`] });
 setDepositEditing(false);
 },
 });

 const recMutation = useMutation({
 mutationFn: ({ recId, status }: { recId: number; status: string }) =>
 apiPut(`/api/recommendations/${recId}`, { status }),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: [`/api/quotes/${id}/recommendations`] });
 },
 });

 const sendStripeInvoiceMutation = useMutation({
 mutationFn: () => apiPost(`/api/quotes/${id}/invoice`, {}),
 onSuccess: (data: any) => {
 queryClient.invalidateQueries({ queryKey: [`/api/quotes/${id}`] });
 setStripeInvoiceSuccess(`Invoice sent to ${data.email}`);
 showToast(`Invoice sent to ${data.email}`,"success");
 },
 onError: (err: any) => {
 showToast(err?.message ||"Failed to send invoice","error");
 },
 });

 if (isLoading) return <Spinner />;

 if (!quote) {
 return (
 <EmptyState
 icon={FileText}
 title="Quote not found"
 description="This quote may have been deleted"
 action={
 <Button variant="secondary"onClick={() => navigate("/quotes")}>
 Back to quotes
 </Button>
 }
 />
 );
 }

 const details = (quote.propertyDetails || {}) as any;
 const opts = (quote.options || {}) as any;
 const addOns = (quote.addOns || {}) as any;
 const baseUrl = window.location.origin;
 const quoteUrl = `${baseUrl}/q/${quote.publicToken}`;

 const copyLink = () => {
 navigator.clipboard.writeText(quoteUrl);
 setCopied(true);
 setTimeout(() => setCopied(false), 2000);
 };

 const previewQuote = () => window.open(quoteUrl,"_blank");

 const copyPortalLink = async () => {
   if (!quote?.customerId) return;
   setPortalLinkLoading(true);
   try {
     const res = await apiGet(`/api/portal/customer/${quote.customerId}/preferences`) as any;
     const portalToken = res?.token;
     if (portalToken) {
       const url = `${window.location.origin}/home/${portalToken}`;
       await navigator.clipboard.writeText(url);
       setPortalLinkCopied(true);
       setTimeout(() => setPortalLinkCopied(false), 2500);
     }
   } catch { /* ignore */ }
   setPortalLinkLoading(false);
 };

 const sendQuote = () => setSendModalOpen(true);

 const downloadPdf = () => {
 const pdfUrl =
 details?.quoteType ==="commercial"
 ? `/api/quotes/${id}/commercial-pdf`
 : `/api/quotes/${id}/pdf`;
 window.open(pdfUrl,"_blank");
 };

 const generateDraft = async (purpose: MessagePurpose, channel: MessageChannel) => {
 const key = `${purpose}_${channel}`;
 setAiDraftLoading(key);
 try {
 const res = await apiPost(`/api/ai/generate-message`, {
 purpose,
 channel,
 quoteId: quote.id,
 customerName: quote.customerName,
 companyName: businessProfile?.companyName ||"",
 senderName: businessProfile?.senderName ||"",
 total: quote.total,
 status: quote.status,
 quoteLink: quote.publicToken ? `${window.location.origin}/q/${quote.publicToken}` :"",
 bookingLink: businessProfile?.bookingLink ||"",
 });
 const text = (res as any).draft || (res as any).message ||"";
 setAiDrafts((prev) => ({ ...prev, [key]: text }));
 } catch {
 setAiDrafts((prev) => ({ ...prev, [key]:"Unable to generate message."}));
 }
 setAiDraftLoading(null);
 };

 const sendAiDraft = async () => {
 const draft = aiDrafts[currentDraftKey];
 if (!draft?.trim()) return;
 if (!quote?.customerId) {
 showToast("No customer linked to this quote","error");
 return;
 }
 setAiCommsSending(true);

 // SMS: copy to clipboard + open native SMS app — no server-side SMS delivery
 if (msgChannel === "sms") {
   try {
     const content = draft.trim();
     await navigator.clipboard.writeText(content);
     const phone = quoteCustomer?.phone || quote?.propertyDetails?.customerPhone || "";
     if (phone) {
       const smsUrl = `sms:${phone}?body=${encodeURIComponent(content)}`;
       window.open(smsUrl, "_self");
     }
     showToast("Message copied! Opening SMS app…", "success");
     setAiDrafts((prev) => ({ ...prev, [currentDraftKey]: "" }));
   } catch {
     showToast("Could not copy message to clipboard", "error");
   }
   setAiCommsSending(false);
   return;
 }

 try {
 // Extract subject line if the draft starts with"Subject: ..."
 const subjectMatch = draft.match(/^Subject:\s*(.+)/i);
 const subject = subjectMatch
 ? subjectMatch[1].trim()
 : `${messagePurposes.find((m) => m.value === msgPurpose)?.label ||"Message"} from ${business?.companyName ||"Us"}`;
 const content = subjectMatch ? draft.replace(/^Subject:.*\n\n?/i,"").trim() : draft;

 await apiPost("/api/communications/send-direct", {
 customerId: quote.customerId,
 channel: msgChannel,
 content,
 ...(msgChannel ==="email"? { subject } : {}),
 ...(msgPurpose ==="send_quote"&& msgChannel ==="email"? { quoteId: quote.id } : {}),
 });
 showToast("Email sent! If they don't see it, ask them to check their spam folder.","success");
 setAiDrafts((prev) => ({ ...prev, [currentDraftKey]:""}));
 } catch (e: any) {
 showToast(e?.message ||"Failed to send","error");
 }
 setAiCommsSending(false);
 };

 const recTypeToPurpose = (type: string): MessagePurpose => {
 switch (type) {
 case"follow_up": return"follow_up";
 case"review_request": return"review_request";
 case"referral_ask": return"follow_up";
 default: return"upsell";
 }
 };

 const generatePlayDraft = async (recIndex: number, recType: string, channel:"sms"|"email") => {
 setPlayGenerating((prev) => ({ ...prev, [recIndex]: true }));
 const purpose = recTypeToPurpose(recType);
 try {
 const res: any = await apiPost("/api/ai/generate-message", {
 purpose,
 channel,
 customerName: quote.customerName,
 companyName: businessProfile?.companyName ||"",
 senderName: businessProfile?.senderName ||"",
 total: quote.total,
 status: quote.status,
 quoteLink: quote.publicToken ? `${window.location.origin}/q/${quote.publicToken}` :"",
 bookingLink: businessProfile?.bookingLink ||"",
 });
 const text = res.draft || res.message ||"";
 setPlayDrafts((prev) => ({ ...prev, [recIndex]: text }));
 } catch {
 setPlayDrafts((prev) => ({ ...prev, [recIndex]:"Unable to generate message."}));
 }
 setPlayGenerating((prev) => ({ ...prev, [recIndex]: false }));
 };

 const sendPlayMessage = async (rec: any, recIndex: number) => {
 const channel = playChannels[recIndex] || "sms";
 const draft = playDrafts[recIndex];
 if (!draft?.trim()) return;
 if (!quote?.customerId) {
   showToast("No customer linked to this quote", "error");
   return;
 }
 setPlaySending((prev) => ({ ...prev, [recIndex]: true }));

 // SMS: copy to clipboard + open native SMS app
 if (channel === "sms") {
   try {
     const content = draft.trim();
     await navigator.clipboard.writeText(content);
     const phone = quoteCustomer?.phone || quote?.propertyDetails?.customerPhone || "";
     if (phone) {
       window.open(`sms:${phone}?body=${encodeURIComponent(content)}`, "_self");
     }
     recMutation.mutate({ recId: rec.id, status: "done" });
     showToast("Message copied! Opening SMS app…", "success");
     setPlayDrafts((prev) => ({ ...prev, [recIndex]: "" }));
     setExpandedRec(null);
   } catch {
     showToast("Could not copy message to clipboard", "error");
   }
   setPlaySending((prev) => ({ ...prev, [recIndex]: false }));
   return;
 }

 try {
   await apiPost("/api/communications/send-direct", {
     customerId: quote.customerId,
     channel,
     content: draft,
     subject: rec.title || "A message from us",
   });
   recMutation.mutate({ recId: rec.id, status: "done" });
   showToast("Email sent! If they don't see it, ask them to check their spam folder.", "success");
   setPlayDrafts((prev) => ({ ...prev, [recIndex]: "" }));
   setExpandedRec(null);
 } catch (e: any) {
   showToast(e?.message || "Failed to send", "error");
 }
 setPlaySending((prev) => ({ ...prev, [recIndex]: false }));
 };

 const generateInvoicePacket = async () => {
 setInvoiceLoading(true);
 try {
 const res: any = await apiPost(`/api/quotes/${id}/invoice-packet`, {});
 const packet = res?.packet;
 if (!packet?.id) throw new Error("No packet returned");
 setGeneratedPacket({ id: packet.id, invoiceNumber: packet.invoiceNumber || packet.id });
 showToast("Invoice packet generated!","success");
 queryClient.invalidateQueries({ queryKey: [`/api/quotes/${id}`] });
 } catch (e: any) {
 showToast(e?.message ||"Failed to generate invoice packet","error");
 }
 setInvoiceLoading(false);
 };

 const createCalendarEvent = async () => {
 setCalendarLoading(true);
 try {
 const res = await apiPost(`/api/quotes/${id}/calendar-event`, {
 title: `Cleaning - ${quote.customerName}`,
 description: `Quote #${id} - $${Number(quote.total || 0).toLocaleString()}`,
 location: details.customerAddress ||"",
 startDate: new Date(Date.now() + 86400000).toISOString(),
 durationMinutes: 120,
 });
 const result = res as any;
 if (result.icsContent) {
 const blob = new Blob([result.icsContent], { type:"text/calendar"});
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = `cleaning-${quote.customerName?.replace(/\s+/g,"-")}.ics`;
 a.click();
 URL.revokeObjectURL(url);
 }
 if (result.googleCalendarUrl) {
 window.open(result.googleCalendarUrl,"_blank");
 }
 queryClient.invalidateQueries({ queryKey: [`/api/calendar-events/quote/${id}`] });
 } catch {}
 setCalendarLoading(false);
 };

 const openReviewModal = async () => {
 setReviewEmailSubject("We'd love your feedback!");
 setReviewEmailContent("");
 setReviewModalOpen(true);
 setReviewGenerating(true);
 try {
 const res: any = await apiPost("/api/ai/generate-review-email", {});
 const subject = res.subject ||"We'd love your feedback!";
 const rawBody = res.content || res.body ||"";
 const body = rawBody.replace(/^Subject:\s*.+?\n/i,"").trim();
 setReviewEmailSubject(subject);
 setReviewEmailContent(body ||"Thank you for trusting us with your home! We'd love it if you could take a moment to share your experience with a quick review. It means the world to a small business like ours.");
 } catch {
 setReviewEmailContent("Thank you for trusting us with your home! We'd love it if you could take a moment to share your experience with a quick review. It means the world to a small business like ours.");
 } finally {
 setReviewGenerating(false);
 }
 };

 const handleSendReview = async () => {
 if (!quote?.customerId) {
 showToast("No customer linked to this quote","error");
 return;
 }
 setReviewSending(true);
 try {
 await apiPost("/api/review-requests", { customerId: quote.customerId });
 await apiPost("/api/communications", {
 customerId: quote.customerId,
 type:"email",
 channel:"email",
 subject: reviewEmailSubject,
 content: reviewEmailContent,
 });
 queryClient.invalidateQueries({ queryKey: ["/api/review-requests"] });
 setReviewModalOpen(false);
 showToast("Review request sent!","success");
 } catch (e: any) {
 showToast(e?.message ||"Failed to send review request","error");
 } finally {
 setReviewSending(false);
 }
 };


 const syncQbo = async () => {
 setSyncingQbo(true);
 try {
 const result: any = await apiPost(`/api/integrations/qbo/create-invoice`, { quoteId: id });
 showToast(result?.message ||"QuickBooks invoice created successfully.","success");
 } catch (e: any) {
 showToast(e?.message ||"Failed to create QBO invoice","error");
 } finally {
 setSyncingQbo(false);
 }
 };

 const optionLabels: Record<string, string> = {
 good:"Good",
 better:"Better",
 best:"Best",
 };
 const optionEntries = Object.entries(opts).filter(
 ([_, v]: any) => v !== undefined && v !== null
 );

 const propertyRows = [
 { icon: Home, label:"Home Type", value: details.homeType },
 { icon: Maximize, label:"Square Feet", value: details.sqft ? `${details.sqft} sqft` : null },
 { icon: Bed, label:"Bedrooms", value: details.beds },
 { icon: Bath, label:"Full Baths", value: details.baths },
 { icon: Bath, label:"Half Baths", value: details.halfBaths },
 { icon: UsersIcon, label:"Residents", value: details.peopleCount },
 {
 icon: PawPrint,
 label:"Pets",
 value:
 details.petType && details.petType !=="none"
 ? `${details.petType}${details.petShedding ?"(heavy shedding)":""}`
 : null,
 },
 {
 icon: Sparkles,
 label:"Condition",
 value:
 details.condition || (details.conditionScore ? `Score: ${details.conditionScore}/10` : null),
 },
 ].filter((r) => r.value);

 const daysSinceSent = quote.sentAt
 ? Math.floor((Date.now() - new Date(quote.sentAt).getTime()) / (1000 * 60 * 60 * 24))
 : null;

 const statusOrder = ["draft","sent","viewed","accepted"];
 const currentStatusIndex = statusOrder.indexOf(quote.status);

 const timelineItems = [
 {
 icon: FileText,
 title:"Created",
 time: new Date(quote.createdAt).toLocaleDateString("en-US", {
 month:"short",
 day:"numeric",
 hour:"numeric",
 minute:"2-digit",
 }),
 active: true,
 iconBg:"bg-slate-100",
 iconColor:"text-slate-600",
 },
 {
 icon: Send,
 title:"Sent",
 time: quote.sentAt
 ? new Date(quote.sentAt).toLocaleDateString("en-US", {
 month:"short",
 day:"numeric",
 hour:"numeric",
 minute:"2-digit",
 })
 : undefined,
 active: currentStatusIndex >= 1,
 iconBg:"bg-blue-100",
 iconColor:"text-blue-600",
 },
 {
 icon: Eye,
 title:"Viewed",
 time: quote.viewedAt
 ? new Date(quote.viewedAt).toLocaleDateString("en-US", {
 month:"short",
 day:"numeric",
 hour:"numeric",
 minute:"2-digit",
 })
 : undefined,
 active: currentStatusIndex >= 2,
 iconBg:"bg-violet-100",
 iconColor:"text-violet-600",
 },
 {
 icon: CheckCircle,
 title: quote.status ==="declined"?"Declined":"Accepted",
 time: quote.acceptedAt
 ? new Date(quote.acceptedAt).toLocaleDateString("en-US", {
 month:"short",
 day:"numeric",
 hour:"numeric",
 minute:"2-digit",
 })
 : undefined,
 active: currentStatusIndex >= 3 || quote.status ==="declined",
 iconBg: quote.status ==="declined"?"bg-red-100":"bg-emerald-100",
 iconColor: quote.status ==="declined"?"text-red-600":"text-emerald-600",
 },
 ];

 const messagePurposes: Array<{ value: MessagePurpose; label: string; icon: typeof Send }> = [
 { value:"send_quote", label:"Send Quote", icon: Send },
 { value:"follow_up", label:"Follow Up", icon: MessageSquare },
 { value:"thank_you", label:"Thank You", icon: Star },
 { value:"reminder", label:"Reminder", icon: Clock },
 { value:"upsell", label:"Upsell", icon: TrendingUp },
 { value:"review_request", label:"Review Ask", icon: Star },
 { value:"payment_failed", label:"Payment Issue", icon: CreditCard },
 ];

 const venmoHandle = settings?.venmoHandle;
 const cashAppTag = settings?.cashAppTag;
 const googleReviewUrl = settings?.googleReviewUrl;
 const referralAmount = settings?.referralOfferAmount;

 const currentDraftKey = `${msgPurpose}_${msgChannel}`;

 return (
 <div>
 <PageHeader
 title={quote.customerName ||"Quote"}
 backTo="/quotes"
 actions={
 <div className="flex items-center gap-2 flex-wrap">
 <Button variant="secondary"icon={ExternalLink} onClick={previewQuote} size="sm">
 Preview
 </Button>
 <Button
 variant="secondary"
 icon={Copy}
 onClick={copyLink}
 size="sm"
 >
 {copied ?"Copied!":"Copy Link"}
 </Button>
 <Button
 icon={Send}
 onClick={sendQuote}
 size="sm"
 >
 Send Quote
 </Button>
 </div>
 }
 />

 <div className="flex items-center gap-3 mb-6 flex-wrap">
 <Badge status={quote.status} dot />
 <span className="text-sm text-slate-500">
 Created {new Date(quote.createdAt).toLocaleDateString()}
 </span>
 {quote.sentAt ? (
 <span className="text-sm text-slate-500">
 Sent {new Date(quote.sentAt).toLocaleDateString()}
 </span>
 ) : null}
 {daysSinceSent !== null && daysSinceSent > 2 && quote.status ==="sent"? (
 <Badge status="warning"label={`${daysSinceSent}d no response`} />
 ) : null}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="lg:col-span-2 space-y-6">
 {propertyRows.length > 0 ? (
 <Card>
 <CardHeader title="Property Details"icon={Home} />
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
 {propertyRows.map((row, i) => (
 <div key={i} className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
 <row.icon className="w-4 h-4 text-slate-400"/>
 </div>
 <div>
 <p className="text-xs text-slate-400">{row.label}</p>
 <p className="text-sm font-medium text-slate-900 capitalize">
 {row.value}
 </p>
 </div>
 </div>
 ))}
 </div>
 {details.customerAddress ? (
 <p className="text-sm text-slate-500 mt-4 pt-4 border-t border-slate-100">
 {details.customerAddress}
 </p>
 ) : null}
 {quote.frequencySelected && quote.frequencySelected !=="one-time"? (
 <div className="mt-4 pt-4 border-t border-slate-100">
 <Badge status="info"label={`${quote.frequencySelected} service`} />
 </div>
 ) : null}
 </Card>
 ) : null}

 {optionEntries.length > 0 ? (
 <Card>
 <CardHeader title="Pricing Options"/>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 {optionEntries.map(([key, val]: any) => {
 const price = typeof val ==="object"? val.price : val;
 const name =
 typeof val ==="object"&& val.name
 ? val.name
 : optionLabels[key] || key;
 const scope =
 typeof val ==="object"&& val.scope ? val.scope :"";
 const isSelected = quote.selectedOption === key;
 const isRecommended = quote.recommendedOption === key;
 const isFlashing = flashTier === key;
 return (
 <div
 key={key}
 className={`rounded-xl border-2 p-4 transition-all ${
 isFlashing
 ?"border-emerald-500 bg-emerald-50/60 shadow-md shadow-emerald-600/10"
 : isSelected
 ?"border-primary-500 bg-primary-50/50 shadow-sm shadow-primary-600/5"
 :"border-slate-200 hover:border-slate-300"
 }`}
 >
 <div className="flex items-center gap-2 mb-1">
 <h3 className="font-semibold text-slate-900 text-sm">
 {name}
 </h3>
 {isRecommended ? (
 <span className="text-[10px] font-semibold uppercase bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded">
 Recommended
 </span>
 ) : null}
 </div>
 {scope ? (
 <p className="text-xs text-slate-500 mb-3 line-clamp-2">
 {scope}
 </p>
 ) : null}
 <p className="text-2xl font-bold text-slate-900 tracking-tight">
 ${Number(price).toLocaleString()}
 </p>
 {isSelected ? (
 <div className="flex items-center gap-1 mt-2">
 <CheckCircle className="w-3.5 h-3.5 text-primary-600"/>
 <span className="text-xs text-primary-600 font-medium">
 Selected
 </span>
 </div>
 ) : null}
 </div>
 );
 })}
 </div>
 </Card>
 ) : null}

 {Object.keys(addOns).length > 0 ? (
 <Card>
 <CardHeader title="Add-Ons"/>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 {Object.entries(addOns).map(([key, val]: any) => {
 const isSelected =
 typeof val ==="object"? val.selected : val;
 const price = typeof val ==="object"? val.price : 0;
 const label = key
 .replace(/([A-Z])/g," $1")
 .replace(/^./, (s: string) => s.toUpperCase());
 return (
 <div
 key={key}
 className={`flex items-center justify-between py-2.5 px-3 rounded-lg border ${
 isSelected
 ?"bg-emerald-50 border-emerald-200"
 :"bg-white border-slate-200"
 }`}
 >
 <span
 className={`text-sm ${
 isSelected
 ?"text-emerald-900 font-medium"
 :"text-slate-600"
 }`}
 >
 {label}
 </span>
 <div className="flex items-center gap-2">
 {price > 0 ? (
 <span className="text-xs text-slate-500">
 +${Number(price).toFixed(0)}
 </span>
 ) : null}
 <span
 className={`w-5 h-5 rounded-full flex items-center justify-center ${
 isSelected
 ?"bg-emerald-100 text-emerald-600"
 :"bg-slate-100 text-slate-400"
 }`}
 >
 {isSelected ? (
 <CheckCircle className="w-3.5 h-3.5"/>
 ) : (
 <XCircle className="w-3.5 h-3.5"/>
 )}
 </span>
 </div>
 </div>
 );
 })}
 </div>
 </Card>
 ) : null}

 {recommendations && recommendations.length > 0 ? (
 <Card>
 <CardHeader title="AI Revenue Playbook"icon={Lightbulb} badge={<Badge status="pro"label={`${recommendations.length} plays`} size="sm"/>} />
 <div className="space-y-3">
 {recommendations.map((rec: any, i: number) => (
 <div key={rec.id || i} className={`rounded-xl border transition-all ${rec.status ==="done"?"border-emerald-200 bg-emerald-50/30": rec.status ==="dismissed"?"border-slate-100 bg-slate-50/50 opacity-60":"border-slate-200 hover:border-primary-200"}`}>
 <button
 onClick={() => setExpandedRec(expandedRec === i ? null : i)}
 className="w-full flex items-center justify-between p-4 text-left"
 >
 <div className="flex items-center gap-3 flex-1 min-w-0">
 <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${rec.status ==="done"?"bg-emerald-100 text-emerald-600":"bg-primary-50 text-primary-600"}`}>
 <Zap className="w-4 h-4"/>
 </div>
 <div className="min-w-0 flex-1">
 <p className="text-sm font-medium text-slate-900 truncate">{rec.title}</p>
 <p className="text-xs text-slate-500">{rec.type?.replace(/_/g,"")}</p>
 </div>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 {rec.status ? <Badge status={rec.status} size="sm"/> : null}
 {expandedRec === i ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
 </div>
 </button>
 {expandedRec === i ? (
 <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
 {/* Rationale */}
 <p className="text-sm text-slate-600 leading-relaxed">{rec.rationale || rec.description}</p>
 {rec.suggestedDate ? (
 <p className="text-xs text-slate-400">
 Suggested: {new Date(rec.suggestedDate).toLocaleDateString()}
 </p>
 ) : null}

 {rec.status !=="done"&& rec.status !=="dismissed"? (
 <>
 {/* Channel selector */}
 <div className="flex items-center gap-2">
 <div className="inline-flex bg-slate-100 rounded-lg p-0.5">
 <button
 onClick={() => {
 setPlayChannels((p) => ({ ...p, [i]:"sms"}));
 setPlayDrafts((p) => ({ ...p, [i]:""}));
 }}
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${(playChannels[i] ||"sms") ==="sms"?"bg-white text-slate-900 shadow-sm":"text-slate-500 hover:text-slate-700"}`}
 >
 <Phone className="w-3 h-3"/>
 SMS
 </button>
 <button
 onClick={() => {
 setPlayChannels((p) => ({ ...p, [i]:"email"}));
 setPlayDrafts((p) => ({ ...p, [i]:""}));
 }}
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${playChannels[i] ==="email"?"bg-white text-slate-900 shadow-sm":"text-slate-500 hover:text-slate-700"}`}
 >
 <Mail className="w-3 h-3"/>
 Email
 </button>
 </div>
 <Button
 size="xs"
 variant="secondary"
 icon={Sparkles}
 loading={playGenerating[i]}
 onClick={() => generatePlayDraft(i, rec.type, playChannels[i] ||"sms")}
 >
 Generate Draft
 </Button>
 </div>

 {/* AI Draft editor */}
 {playDrafts[i] ? (
 <div className="space-y-2">
 <div className="flex items-center gap-1.5">
 <Sparkles className="w-3 h-3 text-violet-500"/>
 <p className="text-xs font-semibold text-violet-700">AI Draft — edit before sending</p>
 </div>
 <textarea
 value={playDrafts[i]}
 onChange={(e) => setPlayDrafts((p) => ({ ...p, [i]: e.target.value }))}
 rows={5}
 className="w-full px-3 py-2 rounded-lg border border-violet-200 bg-violet-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none leading-relaxed"
 />
 <div className="flex gap-2">
 <Button
 size="xs"
 variant="primary"
 icon={Send}
 loading={playSending[i]}
 disabled={!playDrafts[i]?.trim()}
 onClick={() => sendPlayMessage(rec, i)}
 >
 Send {(playChannels[i] ||"sms") ==="sms"?"SMS":"Email"}
 </Button>
 <Button
 size="xs"
 variant="ghost"
 icon={XCircle}
 onClick={() => recMutation.mutate({ recId: rec.id, status:"dismissed"})}
 >
 Dismiss
 </Button>
 </div>
 </div>
 ) : (
 /* Before generating draft — just Done/Dismiss */
 <div className="flex gap-2">
 <Button
 size="xs"
 variant="success"
 icon={CheckCircle}
 onClick={() => recMutation.mutate({ recId: rec.id, status:"done"})}
 >
 Mark Done
 </Button>
 <Button
 size="xs"
 variant="ghost"
 icon={XCircle}
 onClick={() => recMutation.mutate({ recId: rec.id, status:"dismissed"})}
 >
 Dismiss
 </Button>
 </div>
 )}
 </>
 ) : null}
 </div>
 ) : null}
 </div>
 ))}
 </div>
 </Card>
 ) : null}

 <Card>
 <CardHeader title="AI Communications"icon={Sparkles} />
 <div className="space-y-4">
 <div className="flex flex-wrap gap-1.5">
 {messagePurposes.map((mp) => (
 <button
 key={mp.value}
 onClick={() => setMsgPurpose(mp.value)}
 className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
 msgPurpose === mp.value
 ?"bg-primary-50 text-primary-700 ring-1 ring-primary-200"
 :"bg-slate-50 text-slate-600 hover:bg-slate-100"
 }`}
 >
 <mp.icon className="w-3 h-3"/>
 {mp.label}
 </button>
 ))}
 </div>

 {/* Channel toggle */}
 <div className="flex items-center gap-1 self-start">
 <button
 onClick={() => setMsgChannel("email")}
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg text-xs font-semibold border transition-all ${
 msgChannel === "email"
 ? "bg-primary-600 text-white border-primary-600"
 : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
 }`}
 >
 Email
 </button>
 <button
 onClick={() => setMsgChannel("sms")}
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-r-lg text-xs font-semibold border border-l-0 transition-all ${
 msgChannel === "sms"
 ? "bg-primary-600 text-white border-primary-600"
 : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
 }`}
 >
 SMS
 </button>
 </div>

 <Button
 variant="secondary"
 icon={Sparkles}
 onClick={() => generateDraft(msgPurpose, msgChannel)}
 loading={aiDraftLoading === currentDraftKey}
 size="sm"
 >
 Generate {messagePurposes.find((m) => m.value === msgPurpose)?.label} ({msgChannel.toUpperCase()})
 </Button>

 {aiDrafts[currentDraftKey] ? (
 <div className="rounded-xl border border-violet-200 bg-violet-50 overflow-hidden">
 <div className="flex items-center justify-between px-4 pt-3 pb-2">
   <div className="flex items-center gap-2">
     <Sparkles className="w-3.5 h-3.5 text-violet-500"/>
     <p className="text-xs font-semibold text-violet-700">
       AI {msgChannel === "email" ? "Email" : "SMS"} Draft — edit before sending
     </p>
   </div>
   {msgChannel === "sms" && !smsEditMode && (
     <button
       onClick={() => setSmsEditMode(true)}
       className="text-xs text-violet-500 underline hover:text-violet-700"
     >
       Edit
     </button>
   )}
 </div>
 {msgChannel === "sms" && !smsEditMode ? (
   <div className="px-4 pb-3 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap min-h-[8rem]">
     {(() => {
       const parts = aiDrafts[currentDraftKey].split(/(https?:\/\/[^\s]+)/g);
       return parts.map((part, i) =>
         /^https?:\/\//.test(part) ? (
           <a key={i} href={part} target="_blank" rel="noopener noreferrer"
             className="font-semibold text-violet-600 underline">
             SEE QUOTE
           </a>
         ) : (
           <span key={i}>{part}</span>
         )
       );
     })()}
   </div>
 ) : (
   <textarea
     value={aiDrafts[currentDraftKey]}
     onChange={(e) => setAiDrafts((prev) => ({ ...prev, [currentDraftKey]: e.target.value }))}
     onBlur={() => { if (msgChannel === "sms") setSmsEditMode(false); }}
     rows={8}
     autoFocus={msgChannel === "sms" && smsEditMode}
     className="w-full px-4 pb-3 bg-transparent text-sm text-slate-800 focus:outline-none resize-none leading-relaxed"
   />
 )}
 <div className="px-4 pb-4 flex gap-2 border-t border-violet-200 pt-3">
 <Button
 size="sm"
 variant="primary"
 icon={Send}
 loading={aiCommsSending}
 disabled={!aiDrafts[currentDraftKey]?.trim()}
 onClick={sendAiDraft}
 >
 Send {msgChannel ==="sms"?"SMS":"Email"}
 </Button>
 <Button
 size="sm"
 variant="ghost"
 onClick={() => { setAiDrafts((prev) => ({ ...prev, [currentDraftKey]:""})); setSmsEditMode(false); }}
 disabled={aiCommsSending}
 >
 Clear
 </Button>
 </div>
 </div>
 ) : null}
 </div>
 </Card>

 <Card>
 <CardHeader title="Activity Timeline"icon={Clock} />
 <Timeline items={timelineItems} />
 </Card>
 </div>

 <div className="space-y-4">
 <Card>
 <CardHeader title="Summary"/>
 <div className="space-y-3 text-sm">

 {/* Send Quote CTA — top of card for draft quotes */}
 {quote.status ==="draft"? (
 <button
 onClick={sendQuote}
 className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
 style={{
 background:"linear-gradient(135deg, #2563eb, #4f46e5)",
 boxShadow:"0 4px 14px rgba(37,99,235,0.35)",
 }}
 >
 <Send className="w-4 h-4"/>
 Send Quote to Customer
 </button>
 ) : null}

 <div className="flex justify-between items-end">
 <span className="text-slate-500">
 {details?.quoteType ==="commercial"?"Monthly Total":"Total"}
 </span>
 <div className="flex items-center gap-2">
 {livePrice !== null && Math.abs(livePrice - Number(quote.total || 0)) > 0.5 ? (
   <span className="text-xs text-slate-400 line-through">${Number(quote.total || 0).toLocaleString()}</span>
 ) : null}
 <span className={`text-2xl font-bold tracking-tight transition-colors ${livePrice !== null && Math.abs(livePrice - Number(quote.total || 0)) > 0.5 ? "text-indigo-700" : "text-slate-900"}`}>
 ${(livePrice !== null ? livePrice : Number(quote.total || 0)).toLocaleString()}
 </span>
 </div>
 </div>
 {quote.expiresAt ? (
 <div className="flex items-center gap-1.5 text-slate-500">
 <Clock className="w-3.5 h-3.5"/>
 Expires {new Date(quote.expiresAt).toLocaleDateString()}
 </div>
 ) : null}

 {/* Industry benchmark badge for commercial quotes */}
 {details?.quoteType ==="commercial"&& details?.facilityType && details?.totalSqFt ? (
 <CommercialBenchmarkBadge
 monthlyPrice={Number(quote.total || 0)}
 facilityType={details.facilityType}
 totalSqFt={Number(details.totalSqFt)}
 size="full"
 />
 ) : null}

 {/* National benchmark badge for residential quotes — syncs with QuoteDoctor slider */}
 {details?.quoteType !=="commercial"&& details?.beds && Number(quote.total || 0) > 0 ? (
 <ResidentialBenchmarkBadge
 visitPrice={livePrice !== null ? livePrice : Number(quote.total || 0)}
 beds={Number(details.beds)}
 frequency={quote.frequencySelected ?? undefined}
 size="full"
 />
 ) : null}

 {quote.stripeInvoiceStatus ? (
 <div className="flex items-center justify-between pt-2 border-t border-slate-100">
 <span className="text-slate-500">Invoice</span>
 <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
 quote.stripeInvoiceStatus ==="paid"
 ?"bg-emerald-50 text-emerald-700"
 : quote.stripeInvoiceStatus ==="sent"
 ?"bg-blue-50 text-blue-700"
 : quote.stripeInvoiceStatus ==="overdue"
 ?"bg-red-50 text-red-700"
 :"bg-slate-100 text-slate-600"
 }`}>
 <span className={`w-1.5 h-1.5 rounded-full ${
 quote.stripeInvoiceStatus ==="paid"?"bg-emerald-500"
 : quote.stripeInvoiceStatus ==="sent"?"bg-blue-500"
 : quote.stripeInvoiceStatus ==="overdue"?"bg-red-500"
 :"bg-slate-400"
 }`} />
 {quote.stripeInvoiceStatus ==="paid"?"Paid"
 : quote.stripeInvoiceStatus ==="sent"?"Invoice Sent"
 : quote.stripeInvoiceStatus ==="overdue"?"Overdue"
 : quote.stripeInvoiceStatus}
 </span>
 </div>
 ) : null}
 </div>
 </Card>

 <Card>
 <CardHeader title="Customer View"icon={Eye} />
 <div className="space-y-2">
 <Button
 variant="secondary"
 icon={Eye}
 onClick={() => window.open(quoteUrl,"_blank")}
 className="w-full justify-start"
 size="sm"
 >
 Preview Customer Quote
 </Button>
 {venmoHandle ? (
 <Button
 variant="secondary"
 icon={DollarSign}
 onClick={() => window.open(`https://venmo.com/${venmoHandle}?txn=pay&amount=${quote.depositRequired ? quote.depositAmount : quote.total}`,"_blank")}
 className="w-full justify-start"
 size="sm"
 >
 Venmo ({venmoHandle})
 </Button>
 ) : null}
 {cashAppTag ? (
 <Button
 variant="secondary"
 icon={DollarSign}
 onClick={() => window.open(`https://cash.app/${cashAppTag}/${quote.depositRequired ? quote.depositAmount : quote.total}`,"_blank")}
 className="w-full justify-start"
 size="sm"
 >
 Cash App ({cashAppTag})
 </Button>
 ) : null}
 </div>
 </Card>

 {/* QuoteDoctor — inline interactive card */}
 {(quote.status === "draft" || quote.status === "sent") ? (
 <QuoteDoctorCard
   quote={quote}
   details={details}
   addOns={addOns}
   quoteId={id || ""}
   showToast={showToast}
   onPriceApplied={(newTotal) => {
     setLivePrice(null);
     queryClient.invalidateQueries({ queryKey: [`/api/quotes/${id}`] });
   }}
   onSliderChange={(val) => setLivePrice(val)}
   onFlashTier={(tierKey) => {
     setFlashTier(tierKey);
     setTimeout(() => setFlashTier(null), 2000);
   }}
 />
 ) : null}

 {(details.customerAddress || quote.customerName) ? (
 <DispatchCard
 data={{
 customerName: quote.customerName,
 address: details.customerAddress,
 serviceType: opts.better?.name || opts.good?.name || opts.best?.name || undefined,
 total: quote.total,
 phone: quoteCustomer?.phone || undefined,
 email: quoteCustomer?.email || undefined,
 customerId: quote.customerId || undefined,
 notes: quote.notes || undefined,
 }}
 onToast={showToast}
 />
 ) : null}

 {quote.status ==="sent"? (
 <Card>
 <CardHeader title="Follow-Up Automation"icon={Zap} />
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-slate-800">Auto Follow-Up</p>
 <p className="text-xs text-slate-500 mt-0.5">Send a reminder if not accepted</p>
 </div>
 <Toggle
 checked={automationRules?.quoteFollowupsEnabled !== false}
 onChange={async (val) => {
 toggleFollowUpsMutation.mutate(val);
 if (!val) {
 for (const fu of scheduledFollowUps || []) {
 cancelFollowUpMutation.mutate(fu.id);
 }
 }
 }}
 label=""
 />
 </div>

 {automationRules?.quoteFollowupsEnabled !== false ? (
 <>
 <div>
 <p className="text-xs font-medium text-slate-500 mb-2">Timing</p>
 <div className="flex gap-2">
 {[{ label:"12h", minutes: 720 }, { label:"24h", minutes: 1440 }, { label:"48h", minutes: 2880 }].map((opt) => {
 const current = (automationRules?.followupSchedule as any[])?.[0]?.delayMinutes ?? 1440;
 const isActive = current === opt.minutes;
 return (
 <button
 key={opt.label}
 onClick={() => updateTimingMutation.mutate(opt.minutes)}
 className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${isActive ?"bg-primary-600 text-white border-primary-600":"bg-white text-slate-600 border-slate-200 hover:border-primary-300"}`}
 >
 {opt.label}
 </button>
 );
 })}
 </div>
 </div>

 {scheduledFollowUps && scheduledFollowUps.length > 0 ? (
 scheduledFollowUps.map((fu: any) => {
 const fuDate = new Date(fu.scheduledFor);
 const diffMs = fuDate.getTime() - Date.now();
 const diffHrs = diffMs / (1000 * 60 * 60);
 const timeLabel = diffHrs < 1 ?"Less than an hour": diffHrs < 24 ? `In ${Math.round(diffHrs)} hours` : fuDate.toLocaleDateString("en-US", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"});
 return (
 <div key={fu.id} className="border border-primary-100 bg-primary-50/40 rounded-xl p-3 space-y-2">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-1.5 text-primary-700">
 <Clock className="w-3.5 h-3.5"/>
 <span className="text-xs font-semibold">{timeLabel}</span>
 </div>
 <span className="text-xs text-slate-400 capitalize">via {fu.channel}</span>
 </div>
 {fu.content ? (
 <p className="text-xs text-slate-600 italic line-clamp-2">{fu.content}</p>
 ) : (
 <p className="text-xs text-slate-400 italic">AI will generate message at send time</p>
 )}
 <div className="flex gap-2 pt-1">
 <Button
 size="xs"
 loading={followUpSendingNow}
 onClick={async () => {
 setFollowUpSendingNow(true);
 try {
 const res = await apiPost(`/api/communications/${fu.id}/send-now`, {});
 refetchFollowUps();
 } catch (e: any) {
 showToast(e?.message ||"Failed to send","error");
 } finally {
 setFollowUpSendingNow(false);
 }
 }}
 >
 Send Now
 </Button>
 <Button
 size="xs"
 variant="ghost"
 onClick={() => { setFollowUpEditText(fu.content ||""); setFollowUpEditOpen(true); }}
 >
 Edit
 </Button>
 <Button
 size="xs"
 variant="ghost"
 onClick={() => cancelFollowUpMutation.mutate(fu.id)}
 loading={cancelFollowUpMutation.isPending}
 >
 Cancel
 </Button>
 </div>
 </div>
 );
 })
 ) : (
 <p className="text-xs text-slate-400 italic">No follow-up scheduled. Re-send the quote to schedule one.</p>
 )}
 </>
 ) : null}

 {followUpEditOpen ? (
 <div className="border border-slate-200 rounded-xl p-3 space-y-3 bg-slate-50">
 <p className="text-xs font-semibold text-slate-700">Edit Follow-Up Message</p>
 <textarea
 value={followUpEditText}
 onChange={(e) => setFollowUpEditText(e.target.value)}
 className="w-full text-sm border border-slate-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 bg-white"
 rows={5}
 placeholder="Leave empty for AI to generate at send time..."
 />
 <div className="flex gap-2">
 <Button
 size="xs"
 variant="ghost"
 loading={followUpPreviewLoading}
 onClick={async () => {
 setFollowUpPreviewLoading(true);
 try {
 const fu = (scheduledFollowUps || [])[0];
 const data = await apiPost(`/api/quotes/${id}/followup-preview`, { channel: fu?.channel ||"sms"}) as any;
 if (data?.draft) setFollowUpEditText(data.draft);
 } catch {}
 setFollowUpPreviewLoading(false);
 }}
 >
 AI Generate
 </Button>
 <Button
 size="xs"
 onClick={() => {
 const fu = (scheduledFollowUps || [])[0];
 if (fu) updateFollowUpMutation.mutate({ commId: fu.id, content: followUpEditText });
 }}
 loading={updateFollowUpMutation.isPending}
 >
 Save
 </Button>
 <Button size="xs"variant="ghost"onClick={() => setFollowUpEditOpen(false)}>
 Cancel
 </Button>
 </div>
 </div>
 ) : null}
 </div>
 </Card>
 ) : null}

 <Card>
 <CardHeader
 title="Deposit"
 icon={DollarSign}
 actions={
 !depositEditing ? (
 <button
 onClick={() => {
 setDepositRequired(!!quote.depositRequired);
 setDepositAmount(String(quote.depositAmount ||""));
 setDepositEditing(true);
 }}
 className="text-xs text-primary-600 font-medium hover:text-primary-700"
 >
 Edit
 </button>
 ) : null
 }
 />
 {depositEditing ? (
 <div className="space-y-3">
 <Toggle
 checked={depositRequired}
 onChange={setDepositRequired}
 label="Require deposit"
 description="Customer pays upfront before service"
 />
 {depositRequired ? (
 <div>
 <label className="text-xs font-medium text-slate-600 mb-1 block">Amount ($)</label>
 <input
 type="number"
 value={depositAmount}
 onChange={(e) => setDepositAmount(e.target.value)}
 className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
 placeholder="50"
 />
 </div>
 ) : null}
 <div className="flex gap-2">
 <Button
 size="xs"
 onClick={() =>
 depositMutation.mutate({
 depositRequired,
 depositAmount: Number(depositAmount) || 0,
 })
 }
 loading={depositMutation.isPending}
 >
 Save
 </Button>
 <Button size="xs"variant="ghost"onClick={() => setDepositEditing(false)}>
 Cancel
 </Button>
 </div>
 </div>
 ) : (
 <div className="space-y-2">
 {quote.depositRequired ? (
 <>
 <div className="flex justify-between items-center">
 <span className="text-sm text-slate-500">Deposit</span>
 <span className="text-sm font-semibold text-slate-900">
 ${Number(quote.depositAmount || 0).toLocaleString()}
 </span>
 </div>
 <div className="flex justify-between items-center">
 <span className="text-sm text-slate-500">Status</span>
 <Badge
 status={quote.depositPaid ?"accepted":"pending"}
 label={quote.depositPaid ?"Paid":"Pending"}
 size="sm"
 />
 </div>
 {!quote.depositPaid ? (
 <Button
 size="xs"
 variant="success"
 icon={CheckCircle}
 className="w-full mt-2"
 onClick={() =>
 depositMutation.mutate({
 depositRequired: true,
 depositAmount: Number(quote.depositAmount || 0),
 depositPaid: true,
 })
 }
 loading={depositMutation.isPending}
 >
 Mark as Paid
 </Button>
 ) : null}
 <div className="flex justify-between items-center pt-2 border-t border-slate-100">
 <span className="text-sm text-slate-500">Balance Due</span>
 <span className="text-sm font-semibold text-slate-900">
 ${Math.max(0, Number(quote.total || 0) - Number(quote.depositAmount || 0)).toLocaleString()}
 </span>
 </div>
 </>
 ) : (
 <p className="text-sm text-slate-400">No deposit required</p>
 )}
 </div>
 )}
 </Card>

 <Card>
 <CardHeader title="Actions"/>
 <div className="space-y-2">
 {quote.status ==="accepted"&& quote.stripeInvoiceStatus !=="paid"? (
 <div className="flex flex-col gap-1.5">
 <Button
 variant="primary"
 icon={Send}
 onClick={() => sendStripeInvoiceMutation.mutate()}
 loading={sendStripeInvoiceMutation.isPending}
 className="w-full justify-start"
 size="sm"
 >
 {quote.stripeInvoiceStatus ==="sent"|| quote.stripeInvoiceStatus ==="overdue"
 ?"Resend Invoice"
 :"Send Invoice"}
 </Button>
 {stripeInvoiceSuccess ? (
 <p className="text-xs text-emerald-600 pl-1">{stripeInvoiceSuccess}</p>
 ) : null}
 </div>
 ) : null}

 {quote.status ==="accepted"&& !linkedJob ? (
 <Button
 variant="primary"
 icon={CalendarDays}
 onClick={() => setScheduleModalOpen(true)}
 className="w-full justify-start"
 size="sm"
 >
 Schedule This Clean
 </Button>
 ) : null}
 {linkedJob ? (
 <Button
 variant="secondary"
 icon={CalendarDays}
 onClick={() => navigate(`/jobs/${linkedJob.id}`)}
 className="w-full justify-start"
 size="sm"
 >
 View Scheduled Job
 </Button>
 ) : null}
 {quote.status !=="accepted"? (
 <Button
 variant="success"
 icon={CheckCircle}
 onClick={() => statusMutation.mutate("accepted")}
 className="w-full justify-start"
 size="sm"
 >
 Mark Accepted
 </Button>
 ) : null}
 {quote.status !=="declined"? (
 <Button
 variant="ghost"
 icon={XCircle}
 onClick={() => statusMutation.mutate("declined")}
 className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
 size="sm"
 >
 Mark Declined
 </Button>
 ) : null}
 {quote.status ==="draft"? (
 <Button
 variant="ghost"
 icon={Send}
 onClick={() => statusMutation.mutate("sent")}
 className="w-full justify-start"
 size="sm"
 >
 Mark as Sent
 </Button>
 ) : null}
 {quote.status !=="accepted"? (
 <Button
 variant="primary"
 icon={Pencil}
 onClick={() => setEditModalOpen(true)}
 className="w-full justify-start"
 size="sm"
 >
 Edit Quote
 </Button>
 ) : null}
 <Button
 variant="secondary"
 icon={Download}
 onClick={downloadPdf}
 className="w-full justify-start"
 size="sm"
 >
 Download PDF
 </Button>
 <Button
 variant="secondary"
 icon={Receipt}
 onClick={generateInvoicePacket}
 loading={invoiceLoading}
 className="w-full justify-start"
 size="sm"
 >
 Generate Invoice Packet
 </Button>
 {generatedPacket ? (
 <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-2">
 <p className="text-xs font-semibold text-green-800 flex items-center gap-1.5">
 <CheckCircle className="w-3.5 h-3.5"/>
 {generatedPacket.invoiceNumber} ready
 </p>
 <div className="flex flex-col gap-1.5">
 <a
 href={`/api/invoice-packets/${generatedPacket.id}/csv`}
 download
 className="flex items-center gap-1.5 text-xs text-green-700 font-medium hover:text-green-900 hover:underline"
 >
 <FileText className="w-3 h-3"/>
 Download CSV (QuickBooks import)
 </a>
 <a
 href={`/api/invoice-packets/${generatedPacket.id}/pdf`}
 target="_blank"
 rel="noreferrer"
 className="flex items-center gap-1.5 text-xs text-green-700 font-medium hover:text-green-900 hover:underline"
 >
 <Download className="w-3 h-3"/>
 View Invoice PDF
 </a>
 </div>
 </div>
 ) : null}
 <Button
 variant="ghost"
 icon={Trash2}
 onClick={() => setDeleteOpen(true)}
 className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
 size="sm"
 >
 Delete Quote
 </Button>
 </div>
 </Card>

 <Card>
 <CardHeader title="Calendar"icon={Calendar} />
 <div className="space-y-2">
 <Button
 variant="secondary"
 icon={Calendar}
 onClick={() => setScheduleModalOpen(true)}
 className="w-full justify-start"
 size="sm"
 >
 Add to Calendar
 </Button>
 {calendarEvents && calendarEvents.length > 0 ? (
 <div className="pt-2 border-t border-slate-100">
 <p className="text-xs text-slate-400 mb-2">Scheduled events</p>
 {calendarEvents.map((ev: any, i: number) => (
 <div key={i} className="flex items-center gap-2 py-1.5">
 <CalendarDays className="w-3.5 h-3.5 text-emerald-500 shrink-0"/>
 <span className="text-xs text-slate-700 truncate font-medium">
 {ev.jobType ? ev.jobType.replace(/-/g,"").replace(/\b\w/g, (c: string) => c.toUpperCase()) :"Cleaning"}
 </span>
 {ev.startDatetime ? (
 <span className="text-xs text-slate-400 shrink-0 ml-auto">
 {new Date(ev.startDatetime).toLocaleDateString("en-US", { month:"short", day:"numeric"})}
 </span>
 ) : null}
 </div>
 ))}
 </div>
 ) : null}
 </div>
 </Card>

 <Card>
 <CardHeader title="Reviews & Referrals"icon={Star} />
 <div className="space-y-2">
 {quote.status ==="accepted"? (
 <>
 <Button
 variant="secondary"
 icon={Star}
 onClick={openReviewModal}
 className="w-full justify-start"
 size="sm"
 >
 Request Review
 </Button>
 {googleReviewUrl ? (
 <Button
 variant="ghost"
 icon={ExternalLink}
 onClick={() => window.open(googleReviewUrl,"_blank")}
 className="w-full justify-start"
 size="sm"
 >
 Google Review Link
 </Button>
 ) : null}
 <Button
 variant="secondary"
 icon={Gift}
 onClick={() => {
 const msg = `Thanks for choosing us! Refer a friend and ${referralAmount ? `get $${referralAmount} off` :"earn a discount on"} your next clean.`;
 navigator.clipboard.writeText(msg);
 }}
 className="w-full justify-start"
 size="sm"
 >
 Copy Referral Offer
 </Button>
 </>
 ) : (
 <p className="text-xs text-slate-400">Available after quote is accepted</p>
 )}
 </div>
 </Card>

 <Card>
 <CardHeader title="Integrations"icon={Link2} />
 <div className="space-y-2">
 <Button
 variant="secondary"
 icon={RefreshCw}
 onClick={syncQbo}
 disabled={syncingQbo}
 className="w-full justify-start"
 size="sm"
 >
 {syncingQbo ?"Creating...":"Create QBO Invoice"}
 </Button>
 </div>
 </Card>

 <Card>
 <CardHeader title="Quick Share"icon={ExternalLink} />
 <div className="space-y-2">
 <Button
 variant="secondary"
 icon={ExternalLink}
 onClick={previewQuote}
 className="w-full justify-start"
 size="sm"
 >
 Preview Page
 </Button>
 <Button
 variant="secondary"
 icon={Copy}
 onClick={copyLink}
 className="w-full justify-start"
 size="sm"
 >
 {copied ?"Link Copied!":"Copy Link"}
 </Button>
 {quote.customerId ? (
   <Button
     variant="secondary"
     icon={Link2}
     onClick={copyPortalLink}
     disabled={portalLinkLoading}
     className="w-full justify-start"
     size="sm"
   >
     {portalLinkLoading ? "Getting link…" : portalLinkCopied ? "Portal Link Copied!" : "Copy Customer Portal Link"}
   </Button>
 ) : null}
 </div>
 <p className="text-[11px] text-slate-400 mt-3 break-all leading-relaxed">
 {quoteUrl}
 </p>
 </Card>

 {quote.status ==="accepted"&& (isFree || isStarter) ? (
 <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
 <p className="text-sm font-semibold text-blue-900 mb-1">
 Quote accepted — keep the momentum
 </p>
 <p className="text-xs text-blue-700 mb-3 leading-relaxed">
 Upgrade to Growth for automated follow-ups, unlimited quotes, and AI tools that turn wins into repeat business.
 </p>
 <button
 onClick={() => startCheckout("growth","monthly")}
 className="w-full h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
 >
 Upgrade to Growth
 </button>
 </div>
 ) : null}
 </div>
 </div>

 <ConfirmModal
 open={deleteOpen}
 onClose={() => setDeleteOpen(false)}
 onConfirm={() => deleteMutation.mutate()}
 title="Delete Quote"
 description="Are you sure you want to delete this quote? This action cannot be undone."
 confirmLabel="Delete"
 loading={deleteMutation.isPending}
 />

 {sendModalOpen && quote ? (
 <SendQuoteModal
 quoteId={id!}
 quote={quote}
 business={business}
 onClose={() => setSendModalOpen(false)}
 onSent={() => {
 queryClient.invalidateQueries({ queryKey: [`/api/quotes/${id}`] });
 queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
 }}
 />
 ) : null}

 {editModalOpen && quote ? (
 <EditQuoteModal
 open={editModalOpen}
 onClose={() => setEditModalOpen(false)}
 quote={quote}
 />
 ) : null}

 {/* Review Request Modal */}
 <Modal
 open={reviewModalOpen}
 onClose={() => !reviewSending && setReviewModalOpen(false)}
 title="Send Review Request"
 >
 <div className="space-y-4">
 <p className="text-sm text-slate-500">
 An AI-drafted email will be sent to{""}
 <span className="font-medium text-slate-700">
 {quote?.customerName ||"the customer"}
 </span>{""}
 asking for a review.
 </p>

 {reviewGenerating ? (
 <div className="flex items-center gap-3 py-6 justify-center text-slate-500">
 <Spinner size="sm" />
 <span className="text-sm">Drafting your review request…</span>
 </div>
 ) : (
 <div className="space-y-3">
 <div>
 <label className="block text-xs font-semibold text-slate-600 mb-1">Subject</label>
 <input
 type="text"
 value={reviewEmailSubject}
 onChange={(e) => setReviewEmailSubject(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-slate-600 mb-1">Message</label>
 <textarea
 value={reviewEmailContent}
 onChange={(e) => setReviewEmailContent(e.target.value)}
 rows={8}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
 />
 </div>
 </div>
 )}

 <div className="flex gap-3 pt-1">
 <Button
 variant="ghost"
 onClick={() => setReviewModalOpen(false)}
 disabled={reviewSending}
 className="flex-1"
 >
 Cancel
 </Button>
 <Button
 variant="primary"
 icon={Star}
 onClick={handleSendReview}
 loading={reviewSending}
 disabled={reviewGenerating || !reviewEmailContent.trim()}
 className="flex-1"
 >
 Send Request
 </Button>
 </div>
 </div>
 </Modal>

 {/* Quick Add Clean Panel */}
 <QuickAddCleanPanel
 open={scheduleModalOpen}
 onClose={() => setScheduleModalOpen(false)}
 prefill={quote ? {
 quoteId: id!,
 customerName: quote.customerName || quote.propertyDetails?.customerName ||'',
 customerId: quote.customerId || null,
 address: quote.propertyDetails?.customerAddress ||'',
 total: quote.total,
 jobType: quote.options?.[quote.selectedOption]?.name ||'regular',
 customerPhone: quote.customerPhone ||'',
 customerEmail: quote.customerEmail ||'',
 } : undefined}
 />

 {toast ? (
 <Toast
 message={toast.message}
 variant={toast.variant}
 onClose={() => setToast(null)}
 />
 ) : null}

 {/* Accepted quote upgrade nudge modal */}
 {acceptedUpgradeOpen ? (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
 <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-scale-in text-center">
 <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-50 flex items-center justify-center">
 <CheckCircle className="w-8 h-8 text-emerald-500"/>
 </div>
 <h2 className="text-xl font-bold text-slate-900 mb-2">Quote accepted — nice work!</h2>
 <p className="text-slate-500 text-sm mb-6">
 You're building momentum. Upgrade to Growth or Pro to unlock unlimited quotes, automated follow-ups, and the full AI coaching suite.
 </p>
 <div className="space-y-3">
 <button
 onClick={() => { setAcceptedUpgradeOpen(false); startCheckout("growth","monthly"); }}
 className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
 >
 Upgrade to Growth — $49/mo
 </button>
 <button
 onClick={() => setAcceptedUpgradeOpen(false)}
 className="w-full py-2 text-slate-500 text-sm hover:text-slate-700 transition-colors"
 >
 Maybe later
 </button>
 </div>
 </div>
 </div>
 ) : null}
 </div>
 );
}
