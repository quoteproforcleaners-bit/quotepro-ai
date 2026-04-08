import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, Mail, Gift, Users, Award, Clock } from "lucide-react";
import { apiRequest } from "../lib/api";
import { PageHeader, Spinner } from "../components/ui";

interface ReferralData {
  referralCode: string;
  referralUrl: string;
  referredCount: number;
  paidReferrals: number;
  creditsEarned: number;
  pendingCredits: number;
  creditsRemaining: number;
}

function QRCodeImage({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(url, { width: 180, margin: 2 }).then(setSrc);
    });
  }, [url]);

  if (!src) return <div className="w-44 h-44 rounded-xl bg-slate-100 animate-pulse" />;
  return (
    <img
      src={src}
      alt="Referral QR code"
      className="w-44 h-44 rounded-xl border border-slate-200 shadow-sm"
    />
  );
}

function StatPill({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 min-w-[100px]">
      <div className="w-8 h-8 rounded-full flex items-center justify-center mb-0.5" style={{ background: `${color}18` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <span className="text-2xl font-bold text-slate-800">{value}</span>
      <span className="text-xs text-slate-500 text-center leading-tight">{label}</span>
    </div>
  );
}

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Share your link",
    desc: "Copy your unique referral link and send it to a cleaning business owner you know.",
    color: "#2563eb",
  },
  {
    step: "2",
    title: "They sign up",
    desc: "Your friend starts a paid QuotePro plan using your link.",
    color: "#7c3aed",
  },
  {
    step: "3",
    title: "You both get a free month",
    desc: "After their first 30 days on a paid plan, you each get one free month of QuotePro.",
    color: "#059669",
  },
];

export default function ReferralPage() {
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<ReferralData>({
    queryKey: ["/api/referrals"],
    queryFn: () => apiRequest("GET", "/api/referrals") as any,
    staleTime: 60_000,
  });

  const handleCopy = () => {
    if (!data?.referralUrl) return;
    navigator.clipboard.writeText(data.referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const mailtoLink = data?.referralUrl
    ? `mailto:?subject=Get%20a%20free%20month%20of%20QuotePro&body=Hey%2C%20I%27ve%20been%20using%20QuotePro%20to%20generate%20cleaning%20quotes%20in%20seconds.%20Sign%20up%20with%20my%20link%20and%20we%27ll%20both%20get%20a%20free%20month%3A%0A%0A${encodeURIComponent(data.referralUrl)}`
    : "#";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Refer &amp; Earn"
        subtitle="Share QuotePro with a fellow cleaning business owner."
      />

      {/* Hero */}
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #7c3aed 100%)",
        }}
      >
        <div className="p-8 md:p-10 relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-6 h-6 text-yellow-300" />
            <span className="text-xs font-bold text-blue-200 uppercase tracking-widest">
              Referral Program
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 leading-tight">
            Give a month,<br />get a month.
          </h1>
          <p className="text-blue-200 text-sm md:text-base max-w-sm leading-relaxed">
            Share your link. When a friend starts a paid plan, you both get a free month of QuotePro — automatically.
          </p>
        </div>
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)",
          }}
        />
      </div>

      {/* Stats row */}
      <div className="flex gap-3 flex-wrap">
        <StatPill icon={Users} value={data?.referredCount ?? 0} label="Friends referred" color="#2563eb" />
        <StatPill icon={Award} value={data?.creditsEarned ?? 0} label="Months earned" color="#7c3aed" />
        <StatPill icon={Clock} value={data?.pendingCredits ?? 0} label="Months pending" color="#f59e0b" />
        <StatPill icon={Gift} value={data?.creditsRemaining ?? 6} label="Months remaining" color="#059669" />
      </div>

      {/* Referral link + QR */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-5">Your referral link</h2>
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
          {/* QR Code */}
          <div className="shrink-0">
            <QRCodeImage url={data?.referralUrl ?? ""} />
            <p className="text-[11px] text-slate-400 text-center mt-2">Scan to share</p>
          </div>

          {/* Link + actions */}
          <div className="flex-1 min-w-0">
            {/* Link display */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4">
              <span className="text-sm text-slate-600 truncate flex-1 font-mono">
                {data?.referralUrl ?? "Loading..."}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150"
                style={{
                  background: copied ? "#dcfce7" : "#2563eb",
                  color: copied ? "#16a34a" : "white",
                  border: "none",
                }}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy Link"}
              </button>

              <a
                href={mailtoLink}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Share via Email
              </a>
            </div>

            <p className="text-xs text-slate-400 mt-4">
              Your code: <span className="font-mono font-semibold text-slate-600">{data?.referralCode}</span>
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-6">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.step} className="flex flex-col gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ background: step.color }}
              >
                {step.step}
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm mb-1">{step.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fine print */}
      <p className="text-xs text-slate-400 text-center pb-4">
        Credit applied after friend's 30-day paid subscription. Max 6 months total credit per account.
      </p>
    </div>
  );
}
