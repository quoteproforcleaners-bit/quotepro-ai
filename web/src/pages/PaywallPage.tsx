import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useSubscription } from "../lib/subscription";
import { useAuth } from "../lib/auth";
import { apiGet } from "../lib/api";
import {
  Zap,
  Check,
  Users,
  TrendingUp,
  Bot,
  FileText,
  Shield,
  Star,
  ArrowRight,
  Sparkles,
  Crown,
} from "lucide-react";
import { Button } from "../components/ui";

const FEATURES = [
  { icon: FileText, title: "Unlimited Quotes", desc: "Create unlimited quotes with Good/Better/Best tiers and smart pricing" },
  { icon: Users, title: "Full CRM", desc: "Manage customers, track VIPs, and build lasting relationships" },
  { icon: Bot, title: "AI Sales Assistant", desc: "Generate follow-ups, analyze quotes, and get AI-powered revenue recommendations" },
  { icon: TrendingUp, title: "Growth Dashboard", desc: "Track your growth score, manage reviews, launch reactivation campaigns" },
  { icon: Shield, title: "Revenue Protection", desc: "Follow-up streak tracking, revenue leak detection, and pipeline monitoring" },
  { icon: Sparkles, title: "Smart Automations", desc: "Daily pulse emails, weekly recaps, and intelligent follow-up reminders" },
];

const TESTIMONIALS = [
  { name: "Sarah M.", role: "Solo Cleaner", text: "QuotePro doubled my close rate in the first month. The AI follow-ups are a game changer.", stars: 5 },
  { name: "Mike R.", role: "Cleaning Co. Owner", text: "Finally stopped losing money on underpriced quotes. Worth every penny.", stars: 5 },
  { name: "Lisa K.", role: "Residential Cleaner", text: "The growth dashboard helped me identify $3,200 in dormant customer revenue.", stars: 5 },
];

export default function PaywallPage() {
  const { startCheckout, checkoutLoading, isPro } = useSubscription();
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const source = searchParams.get("source") || "general";

  useEffect(() => {
    if (sessionId) {
      apiGet(`/api/subscription/verify-session?session_id=${sessionId}`)
        .then((data: any) => {
          if (data.success) {
            refresh().then(() => navigate("/dashboard", { replace: true }));
          }
        })
        .catch(console.error);
    }
  }, [sessionId, refresh, navigate]);

  if (isPro && !sessionId) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  if (sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome to Pro!</h1>
          <p className="text-slate-500">Activating your subscription...</p>
          <div className="w-6 h-6 mx-auto border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const headline = source === "quote_limit"
    ? "You've used all 3 free quotes"
    : source === "feature_gate"
    ? "This feature requires Pro"
    : "Unlock your full potential";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/30 to-violet-50/30">
      <div className="max-w-6xl mx-auto px-4 py-12 lg:py-20">
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100/80 text-primary-700 text-sm font-medium mb-6 backdrop-blur-sm">
            <Crown className="w-4 h-4" />
            <span>QuotePro AI Pro</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            {headline}
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Join hundreds of cleaning professionals who close more deals, recover lost revenue, and grow their business with AI.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          <div className="space-y-4">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-xl bg-white/70 backdrop-blur-sm border border-white/80 shadow-sm hover:shadow-md transition-all duration-200 group"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shrink-0 shadow-sm shadow-primary-600/20 group-hover:scale-105 transition-transform">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">{f.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
                </div>
                <Check className="w-5 h-5 text-emerald-500 shrink-0 ml-auto mt-1" />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center">
            <div className="w-full max-w-sm">
              <div className="rounded-2xl bg-white shadow-xl shadow-slate-900/5 border border-slate-200/80 overflow-hidden">
                <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-violet-700 p-8 text-center text-white relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />
                  <div className="relative">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 shadow-lg shadow-black/10">
                      <Zap className="w-7 h-7 text-white" />
                    </div>
                    <p className="text-primary-100 text-sm font-medium mb-2">Pro Plan</p>
                    <div className="flex items-end justify-center gap-1 mb-1">
                      <span className="text-5xl font-bold tracking-tight">$19</span>
                      <span className="text-2xl font-bold text-primary-200">.99</span>
                      <span className="text-primary-200 text-sm mb-1.5">/mo</span>
                    </div>
                    <p className="text-primary-200 text-sm">7-day free trial included</p>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <Button
                    variant="primary"
                    size="lg"
                    icon={ArrowRight}
                    onClick={startCheckout}
                    loading={checkoutLoading}
                    className="w-full justify-center text-base font-semibold py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg shadow-primary-600/25"
                  >
                    Start Free Trial
                  </Button>

                  <div className="space-y-2.5">
                    {["Unlimited quotes", "Full CRM & customer management", "AI follow-ups & sales assistant", "Growth dashboard & analytics", "Revenue protection tools", "All integrations"].map((item, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                        <div className="w-4.5 h-4.5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-emerald-600" />
                        </div>
                        {item}
                      </div>
                    ))}
                  </div>

                  <p className="text-center text-xs text-slate-400 pt-2">
                    Cancel anytime. No commitment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-lg font-semibold text-slate-900 mb-6">
            Loved by cleaning professionals
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="p-5 rounded-xl bg-white/70 backdrop-blur-sm border border-white/80 shadow-sm">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-600 mb-3 italic">"{t.text}"</p>
                <div>
                  <p className="text-sm font-medium text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
