import { Link } from "react-router-dom";
import {
  Zap,
  ArrowRight,
  Check,
  FileText,
  Bot,
  TrendingUp,
  Star,
  Clock,
  DollarSign,
  Shield,
  ChevronRight,
} from "lucide-react";

const STATS = [
  { value: "60 sec", label: "to build a quote" },
  { value: "3x", label: "more quotes closed" },
  { value: "$0", label: "to get started" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Enter the job details",
    desc: "Square footage, bedrooms, service type, frequency — QuotePro handles the rest. No spreadsheets, no guesswork.",
  },
  {
    step: "02",
    title: "Get three professional pricing options",
    desc: "Good, Better, and Best tiers are automatically calculated with the right margin baked in. Every time.",
  },
  {
    step: "03",
    title: "Send it and let the follow-ups run",
    desc: "AI-drafted follow-ups keep your pipeline warm while you're on the job. You close more without working more.",
  },
];

const FEATURES = [
  {
    icon: FileText,
    color: "from-blue-500 to-blue-600",
    title: "Good / Better / Best Quotes",
    desc: "Every quote automatically generates three professional pricing options. Clients pick their tier, you protect your margin.",
  },
  {
    icon: Bot,
    color: "from-violet-500 to-violet-600",
    title: "AI Sales Assistant",
    desc: "Follow-up messages, objection responses, and quote summaries drafted instantly. Close more jobs without more effort.",
  },
  {
    icon: TrendingUp,
    color: "from-emerald-500 to-emerald-600",
    title: "Revenue Intelligence",
    desc: "See exactly where you're leaving money. Dormant customers, underpriced jobs, and missed upsells surfaced automatically.",
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah M.",
    role: "Solo cleaner, 4 years",
    text: "I used to spend 30 minutes on every quote. Now it takes me 90 seconds. My close rate went up because I actually send them same-day.",
    stars: 5,
  },
  {
    name: "Mike R.",
    role: "Owner, 3-person crew",
    text: "Stopped losing money on underpriced quotes the first week. Worth every dollar.",
    stars: 5,
  },
  {
    name: "Lisa K.",
    role: "Residential cleaner",
    text: "The growth dashboard showed me $3,200 in dormant customers I had totally forgotten about. That was eye-opening.",
    stars: 5,
  },
];

const INCLUDED = [
  "Unlimited quotes with Good/Better/Best tiers",
  "AI follow-up and sales assistant",
  "Full CRM — customers, jobs, history",
  "Growth dashboard and revenue tracking",
  "Smart intake form for new leads",
  "Automations and weekly recap emails",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm shadow-primary-600/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-slate-900 font-bold text-base tracking-tight">QuotePro</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm shadow-primary-600/20"
            >
              Start free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(37,99,235,0.07),transparent)]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-sm font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            Built for residential cleaning businesses
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.08] mb-6">
            Quote faster.
            <br />
            <span className="text-primary-600">Close more jobs.</span>
            <br />
            Grow on purpose.
          </h1>

          <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">
            QuotePro generates professional Good/Better/Best quotes in under 60
            seconds — then keeps your pipeline warm with AI follow-ups that
            close while you clean.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-base transition-all shadow-lg shadow-primary-600/25 hover:shadow-primary-600/35"
            >
              Start free — no card needed
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 font-medium text-base transition-all bg-white hover:bg-slate-50"
            >
              Sign in to your account
            </Link>
          </div>

          <p className="text-sm text-slate-400 mt-4">
            Free to start. 7-day Pro trial included when you upgrade.
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-slate-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-3 gap-4 divide-x divide-slate-100">
            {STATS.map((s) => (
              <div key={s.label} className="text-center px-4">
                <div className="text-3xl font-extrabold text-primary-600 tracking-tight">{s.value}</div>
                <div className="text-sm text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product preview — quote tier mockup */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
              Every quote, instantly professional
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Enter the job details once. QuotePro builds three market-calibrated
              pricing options your client can actually understand.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/5 overflow-hidden max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
              <p className="text-primary-100 text-sm font-medium">Quote preview</p>
              <p className="text-white font-semibold text-lg mt-0.5">Smith Residence — 3 bed / 2 bath</p>
              <p className="text-primary-200 text-sm">Standard clean · Biweekly</p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { tier: "Good", price: "$148", sub: "Essentials", color: "border-slate-200 bg-slate-50", label: "", textColor: "text-slate-700" },
                  { tier: "Better", price: "$189", sub: "Most popular", color: "border-primary-300 bg-primary-50", label: "RECOMMENDED", textColor: "text-primary-700" },
                  { tier: "Best", price: "$249", sub: "White glove", color: "border-slate-200 bg-slate-50", label: "", textColor: "text-slate-700" },
                ].map((t) => (
                  <div key={t.tier} className={`rounded-xl border-2 p-4 text-center relative ${t.color}`}>
                    {t.label ? (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-primary-600 text-white text-[10px] font-bold tracking-wide whitespace-nowrap">
                        {t.label}
                      </div>
                    ) : null}
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${t.textColor}`}>{t.tier}</p>
                    <p className={`text-2xl font-extrabold ${t.textColor}`}>{t.price}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.sub}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {["Deep clean of all bathrooms", "Kitchen appliance wipe-downs", "Baseboards and ceiling fans", "Add-ons available (oven, fridge, windows)"].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">This is a sample — your logo and colors appear on real quotes</span>
                <div className="flex items-center gap-1 text-xs text-primary-600 font-medium">
                  <Zap className="w-3 h-3" />
                  Built in 45 seconds
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
              Set up once. Run your business.
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              No training. No learning curve. If you can fill out a form, you can quote with QuotePro.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="relative">
                <div className="text-5xl font-extrabold text-slate-100 leading-none mb-4 select-none">{step.step}</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2 -mt-2">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
              Everything a cleaning business needs to grow
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Not a generic CRM. Not a spreadsheet. A tool built specifically for residential cleaning operators.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-sm`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem/solution callout */}
      <section className="bg-primary-600 py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-tight">
            The average cleaning business loses 40% of leads<br className="hidden sm:block" /> because they quote too slowly or too vaguely.
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
            QuotePro fixes both. Fast, professional quotes with pricing confidence baked in.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-primary-700 font-semibold text-base hover:bg-primary-50 transition-colors shadow-lg"
          >
            Fix that today — free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-white py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
              Real owners. Real results.
            </h2>
            <p className="text-slate-500">Not a big software company. A tool built by people who understand your business.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl border border-slate-100 p-6">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / CTA */}
      <section className="bg-slate-50 py-16 sm:py-20 border-t border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
                Simple pricing.<br />No surprises.
              </h2>
              <p className="text-slate-500 text-lg mb-8">
                Start free. Upgrade when you're ready. Everything you need to run and grow your cleaning business is in one plan.
              </p>

              <div className="space-y-3">
                {INCLUDED.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-slate-700 text-sm">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-emerald-600" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/5 overflow-hidden">
              <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_60%)]" />
                <div className="relative">
                  <p className="text-primary-200 text-sm font-medium mb-2">Pro Plan</p>
                  <div className="flex items-end justify-center gap-1 mb-1">
                    <span className="text-5xl font-extrabold text-white tracking-tight">$19</span>
                    <span className="text-2xl font-bold text-primary-200">.99</span>
                    <span className="text-primary-200 text-sm mb-2">/mo</span>
                  </div>
                  <p className="text-primary-100 text-sm">7-day free trial · Cancel anytime</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <Link
                  to="/register"
                  className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-base transition-all shadow-lg shadow-primary-600/25"
                >
                  Start your free trial
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <div className="flex items-center justify-center gap-6 pt-1">
                  {[
                    { icon: Shield, text: "No credit card to start" },
                    { icon: Clock, text: "Set up in 5 min" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-slate-900 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-white/10 flex items-center justify-center mb-6">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Ready to stop leaving money on the table?
          </h2>
          <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
            Join cleaning business owners who quote faster, follow up smarter, and grow their revenue with QuotePro.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white text-slate-900 font-semibold text-base hover:bg-slate-100 transition-colors"
            >
              Create free account
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-white/20 text-white/80 hover:text-white hover:border-white/40 font-medium text-base transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white/60 text-sm font-medium">QuotePro</span>
          </div>
          <p className="text-white/30 text-sm">Built for cleaning business owners.</p>
        </div>
      </footer>
    </div>
  );
}
