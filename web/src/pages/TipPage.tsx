import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";

interface TipPageData {
  jobId: string | null;
  businessName: string;
  logoUri: string | null;
  jobType: string | null;
  total: number | null;
  completedAt: string | null;
  customerName: string | null;
  teamMemberName: string | null;
  percentageOptions: number[];
  alreadyPaid: boolean;
  paidAmount: number | null;
  stripeReady: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default function TipPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const isSuccess = searchParams.get("success") === "1";

  const [data, setData] = useState<TipPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCents, setSelectedCents] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/public/tip-page/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.message) { setError(d.message); setLoading(false); return; }
        setData(d);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load tip page."); setLoading(false); });
  }, [token]);

  const getPresetAmounts = (): { label: string; sublabel: string; cents: number }[] => {
    if (!data) return [];
    if (data.total && data.total > 0) {
      return (data.percentageOptions || [15, 18, 20, 25]).map((pct) => {
        const dollarAmt = data.total! * pct / 100;
        const cents = Math.round(dollarAmt * 100);
        return { label: formatCurrency(cents / 100), sublabel: `${pct}%`, cents };
      }).filter((p) => p.cents >= 100);
    }
    // No job total — show flat amounts
    return [
      { label: "$5",  sublabel: "Small token",  cents: 500  },
      { label: "$10", sublabel: "Nice gesture", cents: 1000 },
      { label: "$15", sublabel: "Appreciated",  cents: 1500 },
      { label: "$20", sublabel: "Exceptional",  cents: 2000 },
      { label: "$25", sublabel: "Outstanding",  cents: 2500 },
      { label: "$30", sublabel: "Amazing!",     cents: 3000 },
    ];
  };

  const effectiveCents = (() => {
    if (selectedCents === -1) {
      const parsed = parseFloat(customAmount);
      return isNaN(parsed) ? 0 : Math.round(parsed * 100);
    }
    return selectedCents || 0;
  })();

  const handlePay = async () => {
    if (effectiveCents < 100) { setPayError("Please enter a tip of at least $1.00"); return; }
    setPaying(true);
    setPayError(null);
    try {
      const r = await fetch(`/api/public/tip-page/${token}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: effectiveCents }),
      });
      const d = await r.json();
      if (d.checkoutUrl) {
        window.location.href = d.checkoutUrl;
      } else {
        setPayError(d.message || "Failed to start payment. Please try again.");
      }
    } catch {
      setPayError("Network error. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-slate-800 font-bold text-lg mb-2">Page Not Found</h2>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const presets = getPresetAmounts();

  if (isSuccess || data.alreadyPaid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center">
          {data.logoUri ? (
            <img src={data.logoUri} alt={data.businessName} className="w-14 h-14 rounded-2xl object-contain mx-auto mb-4 border border-slate-100" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600">
                <path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
              </svg>
            </div>
          )}
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-slate-900 font-bold text-2xl mb-2">Tip received!</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            {data.alreadyPaid && data.paidAmount
              ? `Your ${formatCurrency(data.paidAmount)} tip was received by ${data.businessName}. Thank you for your generosity!`
              : `Thank you! Your tip has been sent to ${data.businessName}. They truly appreciate it.`}
          </p>
          {data.teamMemberName ? (
            <p className="text-slate-400 text-xs mt-3">Special thanks on behalf of {data.teamMemberName}.</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden max-w-sm w-full">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-6 py-8 text-center">
          {data.logoUri ? (
            <img
              src={data.logoUri}
              alt={data.businessName}
              className="w-14 h-14 rounded-2xl object-contain mx-auto mb-3 border-2 border-white/20 bg-white/10"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" />
              </svg>
            </div>
          )}
          <h1 className="text-white font-bold text-xl">{data.businessName}</h1>
          {data.customerName ? (
            <p className="text-blue-100 text-sm mt-1">
              Thanks, {data.customerName.split(" ")[0]}! Your home looks great.
            </p>
          ) : (
            <p className="text-blue-100 text-sm mt-1">Your home looks great. Thank you!</p>
          )}
          {data.completedAt ? (
            <p className="text-blue-200/70 text-xs mt-1">{formatDate(data.completedAt)}</p>
          ) : null}
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <p className="text-slate-700 font-semibold text-center mb-1">
            {data.teamMemberName
              ? `Leave a tip for ${data.teamMemberName}`
              : "Leave a tip for your cleaning crew"}
          </p>
          {data.total ? (
            <p className="text-slate-400 text-xs text-center mb-5">
              Your cleaning total was {formatCurrency(data.total)}
            </p>
          ) : (
            <p className="text-slate-400 text-xs text-center mb-5">Choose a tip amount below</p>
          )}

          {/* Preset amounts */}
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {presets.map(({ label, sublabel, cents }) => (
              <button
                key={cents}
                onClick={() => { setSelectedCents(cents); setCustomAmount(""); }}
                className={`py-3.5 rounded-2xl border-2 text-center transition-all ${
                  selectedCents === cents && selectedCents !== -1
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                }`}
              >
                <p className={`text-base font-bold ${selectedCents === cents && selectedCents !== -1 ? "text-blue-700" : "text-slate-800"}`}>
                  {label}
                </p>
                <p className={`text-xs mt-0.5 ${selectedCents === cents && selectedCents !== -1 ? "text-blue-500" : "text-slate-400"}`}>
                  {sublabel}
                </p>
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <button
            onClick={() => { setSelectedCents(-1); }}
            className={`w-full py-3 rounded-2xl border-2 text-center transition-all mb-4 ${
              selectedCents === -1
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 hover:border-blue-300"
            }`}
          >
            <span className={`text-sm font-semibold ${selectedCents === -1 ? "text-blue-700" : "text-slate-500"}`}>
              Custom amount
            </span>
          </button>

          {selectedCents === -1 ? (
            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">$</span>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="0"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-3 rounded-2xl border-2 border-blue-300 focus:outline-none focus:border-blue-500 text-slate-800 font-semibold text-lg"
                autoFocus
              />
            </div>
          ) : null}

          {payError ? (
            <p className="text-red-500 text-xs text-center mb-3">{payError}</p>
          ) : null}

          <button
            onClick={handlePay}
            disabled={paying || effectiveCents < 100}
            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
          >
            {paying ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
                </svg>
                {effectiveCents >= 100 ? `Send ${formatCurrency(effectiveCents / 100)} tip` : "Send a tip"}
              </>
            )}
          </button>

          <p className="text-slate-400 text-[11px] text-center mt-3 leading-relaxed">
            Secure payment powered by Stripe.{" "}
            {data.stripeReady
              ? `Tips go directly to ${data.businessName}.`
              : `Tips are processed securely on behalf of ${data.businessName}.`}
          </p>
        </div>
      </div>
    </div>
  );
}
