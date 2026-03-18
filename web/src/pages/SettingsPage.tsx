import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { useSubscription } from "../lib/subscription";
import { useWebAIConsent } from "../lib/webAIConsent";
import { apiPut, apiPost, apiGet, apiDelete, apiPatch } from "../lib/api";
import { queryClient } from "../lib/queryClient";
import {
  Building2,
  CreditCard,
  Link2,
  Save,
  CheckCircle,
  XCircle,
  LogOut,
  Trash2,
  DollarSign,
  FileText,
  Settings,
  Zap,
  Calendar,
  Key,
  Webhook,
  Bot,
  Shield,
  ExternalLink,
  Copy,
  Plus,
  User,
  Award,
  Mail,
  MessageSquare,
  Edit3,
  Clock,
  Moon,
  Bell,
  Star,
  Gift,
  Globe,
  Briefcase,
  Sliders,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  Input,
  Badge,
  Tabs,
  ConfirmModal,
  Alert,
  Toggle,
  Select,
  Textarea,
  Divider,
} from "../components/ui";

function IntegrationCard({
  name,
  description,
  icon: Icon,
  statusUrl,
  connectUrl,
  disconnectUrl,
  connectMethod = "POST",
  disconnectMethod = "POST",
  color = "slate",
}: {
  name: string;
  description: string;
  icon: any;
  statusUrl: string;
  connectUrl?: string;
  disconnectUrl?: string;
  connectMethod?: string;
  disconnectMethod?: string;
  color?: string;
}) {
  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: [statusUrl],
    retry: false,
  });
  const connected = data?.connected || data?.status === "connected";
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!connectUrl) return;
    setLoading(true);
    try {
      if (connectMethod === "GET") {
        window.location.href = connectUrl;
        return;
      }
      const res: any = await apiPost(connectUrl);
      if (res.url) {
        window.open(res.url, "_blank");
      }
      setTimeout(() => refetch(), 3000);
    } catch (err) {
      console.error("Connect error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectUrl) return;
    setLoading(true);
    try {
      if (disconnectMethod === "DELETE") {
        await apiDelete(disconnectUrl);
      } else {
        await apiPost(disconnectUrl);
      }
      refetch();
    } catch (err) {
      console.error("Disconnect error:", err);
    } finally {
      setLoading(false);
    }
  };

  const colorMap: Record<string, string> = {
    violet: "from-violet-500 to-violet-600",
    blue: "from-blue-500 to-blue-600",
    green: "from-emerald-500 to-emerald-600",
    orange: "from-orange-500 to-orange-600",
    slate: "from-slate-500 to-slate-600",
  };

  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color] || colorMap.slate} flex items-center justify-center shadow-sm`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-900">{name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        ) : connected ? (
          <>
            <Badge status="accepted" label="Connected" dot />
            {disconnectUrl ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                loading={loading}
                className="text-red-500 hover:bg-red-50 text-xs"
              >
                Disconnect
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <Badge status="draft" label="Not connected" dot />
            {connectUrl ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleConnect}
                loading={loading}
                className="text-xs"
              >
                Connect
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {description ? (
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const PAYMENT_METHODS = [
  { key: "cash", label: "Cash", icon: "dollar-sign" },
  { key: "check", label: "Check", icon: "file-text" },
  { key: "venmo", label: "Venmo", icon: "dollar-sign" },
  { key: "cashapp", label: "Cash App", icon: "dollar-sign" },
  { key: "zelle", label: "Zelle", icon: "dollar-sign" },
  { key: "credit_card", label: "Credit Card", icon: "credit-card" },
  { key: "stripe", label: "Stripe Online", icon: "credit-card" },
];

const TIME_OPTIONS = [
  { value: "06:00", label: "6:00 AM" },
  { value: "07:00", label: "7:00 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "12:00", label: "12:00 PM" },
];

const DAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Espanol" },
  { value: "pt", label: "Portugues" },
  { value: "ru", label: "Russkij" },
];

export default function SettingsPage() {
  const { user, business, logout, refresh } = useAuth();
  const { isPro, isGrowth, isStarter, tier, startCheckout, openPortal, checkoutLoading } = useSubscription();
  const { hasAIConsent, consentData, revokeAIConsent, requestAIConsent } = useWebAIConsent();
  const [portalError, setPortalError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleManageSubscription = async () => {
    setPortalError(null);
    setPortalLoading(true);
    try {
      await openPortal();
    } catch (err: any) {
      const msg: string = err?.message || "";
      if (msg.includes("No billing account")) {
        setPortalError("Your subscription is managed through the App Store. On your iPhone, go to Settings → your name → Subscriptions to make changes.");
      } else {
        setPortalError("Could not open the billing portal. Please try again or contact support.");
      }
    } finally {
      setPortalLoading(false);
    }
  };
  const navigate = useNavigate();
  const [tab, setTab] = useState("business");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedSection, setSavedSection] = useState("");

  const showSaved = (section: string) => {
    setSaved(true);
    setSavedSection(section);
    setTimeout(() => { setSaved(false); setSavedSection(""); }, 2500);
  };

  const [businessForm, setBusinessForm] = useState({
    companyName: "",
    phone: "",
    email: "",
    address: "",
  });

  const [brandingForm, setBrandingForm] = useState({
    senderName: "",
    senderTitle: "",
    bookingLink: "",
    emailSignature: "",
    smsSignature: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    venmoHandle: "",
    cashappHandle: "",
    paymentNotes: "",
  });

  const [paymentMethods, setPaymentMethods] = useState<Record<string, boolean>>({});

  const { data: pricing } = useQuery<any>({ queryKey: ["/api/pricing"] });
  const { data: quotePrefs } = useQuery<any>({
    queryKey: ["/api/quote-preferences"],
  });
  const { data: automations } = useQuery<any>({
    queryKey: ["/api/automations"],
  });
  const { data: apiKeys = [] } = useQuery<any[]>({
    queryKey: ["/api/api-keys"],
  });
  const { data: preferences } = useQuery<any>({
    queryKey: ["/api/preferences"],
  });
  const { data: growthSettings } = useQuery<any>({
    queryKey: ["/api/growth-automation-settings"],
  });

  const [pricingForm, setPricingForm] = useState({
    hourlyRate: 45,
    minimumTicket: 100,
    taxRate: 0,
  });

  const [prefsForm, setPrefsForm] = useState({
    dailyPulseEnabled: true,
    dailyPulseTime: "08:00",
    weeklyRecapEnabled: true,
    weeklyRecapDay: 1,
    quietHoursEnabled: false,
    quietHoursStart: "21:00",
    quietHoursEnd: "08:00",
    dormantThresholdDays: 90,
    maxFollowUpsPerDay: 1,
  });

  const [growthForm, setGrowthForm] = useState({
    googleReviewLink: "",
    includeReviewOnPdf: false,
    includeReviewInMessages: false,
    askReviewAfterComplete: true,
    referralOfferAmount: 25,
    referralBookingLink: "",
  });

  const [commercialEnabled, setCommercialEnabled] = useState(false);
  const [appLanguage, setAppLanguage] = useState("en");
  const [commLanguage, setCommLanguage] = useState("en");

  useEffect(() => {
    if (business) {
      setBusinessForm({
        companyName: business.companyName || "",
        phone: business.phone || "",
        email: business.email || "",
        address: business.address || "",
      });
      setBrandingForm({
        senderName: (business as any).senderName || "",
        senderTitle: (business as any).senderTitle || "",
        bookingLink: (business as any).bookingLink || "",
        emailSignature: (business as any).emailSignature || "",
        smsSignature: (business as any).smsSignature || "",
      });
      setPaymentForm({
        venmoHandle: (business as any).venmoHandle || "",
        cashappHandle: (business as any).cashappHandle || "",
        paymentNotes: (business as any).paymentNotes || "",
      });
      const opts = (business as any).paymentOptions || {};
      const methods: Record<string, boolean> = {};
      for (const m of PAYMENT_METHODS) {
        methods[m.key] = opts[m.key]?.enabled || false;
      }
      setPaymentMethods(methods);
      setAppLanguage((business as any).appLanguage || "en");
      setCommLanguage((business as any).commLanguage || "en");
    }
  }, [business]);

  useEffect(() => {
    if (pricing) {
      setPricingForm({
        hourlyRate: pricing.hourlyRate || 45,
        minimumTicket: pricing.minimumTicket || 100,
        taxRate: pricing.taxRate || 0,
      });
    }
  }, [pricing]);

  useEffect(() => {
    if (preferences) {
      setPrefsForm({
        dailyPulseEnabled: preferences.dailyPulseEnabled ?? true,
        dailyPulseTime: preferences.dailyPulseTime || "08:00",
        weeklyRecapEnabled: preferences.weeklyRecapEnabled ?? true,
        weeklyRecapDay: preferences.weeklyRecapDay ?? 1,
        quietHoursEnabled: preferences.quietHoursEnabled ?? false,
        quietHoursStart: preferences.quietHoursStart || "21:00",
        quietHoursEnd: preferences.quietHoursEnd || "08:00",
        dormantThresholdDays: preferences.dormantThresholdDays || 90,
        maxFollowUpsPerDay: preferences.maxFollowUpsPerDay || 1,
      });
    }
  }, [preferences]);

  useEffect(() => {
    if (growthSettings) {
      setGrowthForm({
        googleReviewLink: growthSettings.googleReviewLink || "",
        includeReviewOnPdf: growthSettings.includeReviewOnPdf ?? false,
        includeReviewInMessages: growthSettings.includeReviewInMessages ?? false,
        askReviewAfterComplete: growthSettings.askReviewAfterComplete ?? true,
        referralOfferAmount: growthSettings.referralOfferAmount || 25,
        referralBookingLink: growthSettings.referralBookingLink || "",
      });
    }
  }, [growthSettings]);

  const updateBusiness = useMutation({
    mutationFn: (data: any) => apiPut("/api/business", data),
    onSuccess: () => {
      refresh();
      showSaved("business");
    },
  });

  const patchLanguage = useMutation({
    mutationFn: (data: { appLanguage?: string; commLanguage?: string }) =>
      apiPatch("/api/business", data),
    onSuccess: () => {
      refresh();
      showSaved("features");
    },
  });

  const updatePricing = useMutation({
    mutationFn: (data: any) => apiPut("/api/pricing", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
      showSaved("pricing");
    },
  });

  const updatePreferences = useMutation({
    mutationFn: (data: any) => apiPut("/api/preferences", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/preferences"] });
      showSaved("automations");
    },
  });

  const updateGrowthSettings = useMutation({
    mutationFn: (data: any) => apiPut("/api/growth-automation-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/growth-automation-settings"] });
      showSaved("reviews");
    },
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    try {
      await apiPost("/api/auth/delete-account", {});
      navigate("/login");
    } catch {}
  };

  const handleSaveBranding = () => {
    updateBusiness.mutate({
      ...businessForm,
      senderName: brandingForm.senderName || null,
      senderTitle: brandingForm.senderTitle || null,
      bookingLink: brandingForm.bookingLink || null,
      emailSignature: brandingForm.emailSignature || null,
      smsSignature: brandingForm.smsSignature || null,
    });
  };

  const handleSavePayment = () => {
    const opts: Record<string, any> = {};
    for (const m of PAYMENT_METHODS) {
      opts[m.key] = { enabled: paymentMethods[m.key] || false };
    }
    updateBusiness.mutate({
      venmoHandle: paymentForm.venmoHandle || null,
      cashappHandle: paymentForm.cashappHandle || null,
      paymentNotes: paymentForm.paymentNotes || null,
      paymentOptions: opts,
    });
  };

  const handleSavePreferences = () => {
    updatePreferences.mutate(prefsForm);
  };

  const handleSaveGrowth = () => {
    updateGrowthSettings.mutate({
      ...(growthSettings || {}),
      ...growthForm,
    });
  };

  const settingsTabs = [
    "business",
    "branding",
    "payments",
    "automations",
    "reviews",
    "features",
    "integrations",
    "account",
    "developer",
  ];

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your business, branding, and account" />

      <div className="mb-6">
        <Tabs tabs={settingsTabs} active={tab} onChange={setTab} />
      </div>

      {saved ? (
        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 animate-scale-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">Settings saved successfully</span>
        </div>
      ) : null}

      {tab === "business" ? (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader title="Business Profile" icon={Building2} />
            <div className="space-y-4">
              <Input
                label="Company name"
                value={businessForm.companyName}
                onChange={(e) =>
                  setBusinessForm((p) => ({
                    ...p,
                    companyName: e.target.value,
                  }))
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Phone"
                  value={businessForm.phone}
                  onChange={(e) =>
                    setBusinessForm((p) => ({ ...p, phone: e.target.value }))
                  }
                />
                <Input
                  label="Email"
                  type="email"
                  value={businessForm.email}
                  onChange={(e) =>
                    setBusinessForm((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </div>
              <Input
                label="Address"
                value={businessForm.address}
                onChange={(e) =>
                  setBusinessForm((p) => ({ ...p, address: e.target.value }))
                }
              />
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <Button
                  icon={Save}
                  onClick={() => updateBusiness.mutate(businessForm)}
                  loading={updateBusiness.isPending}
                  size="sm"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Pricing Configuration" icon={DollarSign} />
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Hourly Rate ($)"
                  type="number"
                  value={pricingForm.hourlyRate}
                  onChange={(e) =>
                    setPricingForm((p) => ({
                      ...p,
                      hourlyRate: +e.target.value,
                    }))
                  }
                />
                <Input
                  label="Minimum Ticket ($)"
                  type="number"
                  value={pricingForm.minimumTicket}
                  onChange={(e) =>
                    setPricingForm((p) => ({
                      ...p,
                      minimumTicket: +e.target.value,
                    }))
                  }
                />
                <Input
                  label="Tax Rate (%)"
                  type="number"
                  value={pricingForm.taxRate}
                  onChange={(e) =>
                    setPricingForm((p) => ({
                      ...p,
                      taxRate: +e.target.value,
                    }))
                  }
                />
              </div>
              <Button
                icon={Save}
                onClick={() => updatePricing.mutate(pricingForm)}
                loading={updatePricing.isPending}
                size="sm"
              >
                Save Pricing
              </Button>
            </div>
          </Card>

          {pricing?.serviceTypes ? (
            <Card>
              <CardHeader title="Service Types" />
              <div className="space-y-3">
                {(pricing.serviceTypes as any[]).map((st: any) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {st.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {st.scope || "No description"}
                      </p>
                    </div>
                    <span className="text-sm text-slate-500">
                      {st.multiplier}x
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {pricing?.frequencyDiscounts ? (
            <Card>
              <CardHeader title="Frequency Discounts" />
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(pricing.frequencyDiscounts).map(
                  ([key, val]: any) => (
                    <div
                      key={key}
                      className="text-center p-3 rounded-xl bg-slate-50"
                    >
                      <p className="text-xs text-slate-500 capitalize mb-1">
                        {key}
                      </p>
                      <p className="text-lg font-bold text-slate-900">
                        {val}%
                      </p>
                    </div>
                  )
                )}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Add-on Pricing" icon={Plus} />
            <p className="text-xs text-slate-500 mb-4">Set default prices for add-on services included in quotes.</p>
            <div className="space-y-3">
              {[
                { key: "insideFridge", label: "Inside Fridge" },
                { key: "insideOven", label: "Inside Oven" },
                { key: "insideWindows", label: "Inside Windows" },
                { key: "insideCabinets", label: "Inside Cabinets" },
                { key: "laundry", label: "Laundry" },
                { key: "dishes", label: "Dishes" },
                { key: "organizing", label: "Organizing" },
                { key: "garage", label: "Garage" },
                { key: "baseboards", label: "Baseboards" },
                { key: "blinds", label: "Blinds" },
                { key: "carpetCleaning", label: "Carpet Cleaning" },
                { key: "wallWashing", label: "Wall Washing" },
              ].map((addon) => (
                <div key={addon.key} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                  <span className="text-sm font-medium text-slate-700">{addon.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">$</span>
                    <input
                      type="number"
                      className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
                      value={pricing?.addOnPrices?.[addon.key] || ""}
                      placeholder="0"
                      onChange={(e) => {
                        const val = e.target.value;
                        updatePricing.mutate({
                          addOnPrices: {
                            ...(pricing?.addOnPrices || {}),
                            [addon.key]: val ? Number(val) : 0,
                          },
                        });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "branding" ? (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader title="Sender Identity" icon={User} />
            <p className="text-sm text-slate-500 mb-4">
              How your name and title appear on quotes, emails, and SMS messages.
            </p>
            <div className="space-y-4">
              <Input
                label="Sender Name"
                value={brandingForm.senderName}
                onChange={(e) => setBrandingForm((p) => ({ ...p, senderName: e.target.value }))}
                placeholder="e.g. Sarah Johnson"
              />
              <Input
                label="Sender Title"
                value={brandingForm.senderTitle}
                onChange={(e) => setBrandingForm((p) => ({ ...p, senderTitle: e.target.value }))}
                placeholder="e.g. Owner & Lead Cleaner"
              />
              <Input
                label="Booking Link"
                value={brandingForm.bookingLink}
                onChange={(e) => setBrandingForm((p) => ({ ...p, bookingLink: e.target.value }))}
                placeholder="https://calendly.com/your-link"
                helper="Included in quotes and follow-up messages"
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Signatures" icon={Edit3} />
            <p className="text-sm text-slate-500 mb-4">
              Custom signatures appended to your outgoing emails and SMS messages.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email Signature
                </label>
                <textarea
                  value={brandingForm.emailSignature}
                  onChange={(e) => setBrandingForm((p) => ({ ...p, emailSignature: e.target.value }))}
                  placeholder="Best regards,&#10;Sarah Johnson&#10;Sparkle Clean LLC"
                  rows={3}
                  className="w-full px-3.5 py-3 rounded-lg border border-slate-200 hover:border-slate-300 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                />
              </div>
              <Input
                label="SMS Signature"
                value={brandingForm.smsSignature}
                onChange={(e) => setBrandingForm((p) => ({ ...p, smsSignature: e.target.value }))}
                placeholder="- Sarah, Sparkle Clean"
              />
            </div>
          </Card>

          <div className="flex items-center gap-3">
            <Button
              icon={Save}
              onClick={handleSaveBranding}
              loading={updateBusiness.isPending}
              size="sm"
            >
              Save Branding
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "payments" ? (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader title="Payment Handles" icon={DollarSign} />
            <p className="text-sm text-slate-500 mb-4">
              Add your payment handles so customers can pay you directly.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Venmo Handle</label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm font-medium">@</span>
                  <input
                    value={paymentForm.venmoHandle}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, venmoHandle: e.target.value.replace(/^@/, "") }))}
                    placeholder="your-venmo-username"
                    className="flex-1 h-11 px-3.5 rounded-lg border border-slate-200 hover:border-slate-300 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Cash App Tag</label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm font-medium">$</span>
                  <input
                    value={paymentForm.cashappHandle}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, cashappHandle: e.target.value.replace(/^\$/, "") }))}
                    placeholder="your-cashtag"
                    className="flex-1 h-11 px-3.5 rounded-lg border border-slate-200 hover:border-slate-300 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Accepted Payment Methods" icon={CreditCard} />
            <p className="text-sm text-slate-500 mb-4">
              Choose which payment methods you accept. These are shown on your quotes.
            </p>
            <div className="space-y-1">
              {PAYMENT_METHODS.map((m) => (
                <SettingRow key={m.key} label={m.label}>
                  <Toggle
                    checked={paymentMethods[m.key] || false}
                    onChange={(v) => setPaymentMethods((p) => ({ ...p, [m.key]: v }))}
                  />
                </SettingRow>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Payment Notes" />
            <p className="text-sm text-slate-500 mb-3">
              Additional notes shown on quotes regarding payment terms.
            </p>
            <textarea
              value={paymentForm.paymentNotes}
              onChange={(e) => setPaymentForm((p) => ({ ...p, paymentNotes: e.target.value }))}
              placeholder="e.g. Payment due upon completion of service"
              rows={2}
              className="w-full px-3.5 py-3 rounded-lg border border-slate-200 hover:border-slate-300 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
            />
          </Card>

          <div className="flex items-center gap-3">
            <Button
              icon={Save}
              onClick={handleSavePayment}
              loading={updateBusiness.isPending}
              size="sm"
            >
              Save Payment Settings
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "automations" ? (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader title="Daily Follow-Up Reminder" icon={Bell} />
            <p className="text-sm text-slate-500 mb-4">
              Get a daily notification reminding you to follow up with pending quotes.
            </p>
            <div className="space-y-4">
              <SettingRow label="Enable daily pulse" description="Receive a daily follow-up reminder notification">
                <Toggle
                  checked={prefsForm.dailyPulseEnabled}
                  onChange={(v) => setPrefsForm((p) => ({ ...p, dailyPulseEnabled: v }))}
                />
              </SettingRow>
              {prefsForm.dailyPulseEnabled ? (
                <Select
                  label="Reminder Time"
                  value={prefsForm.dailyPulseTime}
                  onChange={(e) => setPrefsForm((p) => ({ ...p, dailyPulseTime: e.target.value }))}
                  options={TIME_OPTIONS}
                />
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Weekly Recap" icon={Calendar} />
            <p className="text-sm text-slate-500 mb-4">
              Receive a weekly summary of your quotes, revenue, and performance.
            </p>
            <div className="space-y-4">
              <SettingRow label="Enable weekly recap" description="Get a weekly performance summary">
                <Toggle
                  checked={prefsForm.weeklyRecapEnabled}
                  onChange={(v) => setPrefsForm((p) => ({ ...p, weeklyRecapEnabled: v }))}
                />
              </SettingRow>
              {prefsForm.weeklyRecapEnabled ? (
                <Select
                  label="Recap Day"
                  value={String(prefsForm.weeklyRecapDay)}
                  onChange={(e) => setPrefsForm((p) => ({ ...p, weeklyRecapDay: Number(e.target.value) }))}
                  options={DAY_OPTIONS}
                />
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Quiet Hours" icon={Moon} />
            <p className="text-sm text-slate-500 mb-4">
              Pause all automated messages during these hours.
            </p>
            <div className="space-y-4">
              <SettingRow label="Enable quiet hours" description="No automated messages during quiet hours">
                <Toggle
                  checked={prefsForm.quietHoursEnabled}
                  onChange={(v) => setPrefsForm((p) => ({ ...p, quietHoursEnabled: v }))}
                />
              </SettingRow>
              {prefsForm.quietHoursEnabled ? (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Start Time"
                    value={prefsForm.quietHoursStart}
                    onChange={(e) => setPrefsForm((p) => ({ ...p, quietHoursStart: e.target.value }))}
                    placeholder="21:00"
                  />
                  <Input
                    label="End Time"
                    value={prefsForm.quietHoursEnd}
                    onChange={(e) => setPrefsForm((p) => ({ ...p, quietHoursEnd: e.target.value }))}
                    placeholder="08:00"
                  />
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title="Follow-Up Behavior" icon={Clock} />
            <div className="space-y-4">
              <Select
                label="Dormant Customer Threshold"
                value={String(prefsForm.dormantThresholdDays)}
                onChange={(e) => setPrefsForm((p) => ({ ...p, dormantThresholdDays: Number(e.target.value) }))}
                options={[
                  { value: "30", label: "30 days" },
                  { value: "60", label: "60 days" },
                  { value: "90", label: "90 days" },
                  { value: "120", label: "120 days" },
                  { value: "180", label: "180 days" },
                ]}
              />
              <Select
                label="Max Follow-Ups Per Day"
                value={String(prefsForm.maxFollowUpsPerDay)}
                onChange={(e) => setPrefsForm((p) => ({ ...p, maxFollowUpsPerDay: Number(e.target.value) }))}
                options={[
                  { value: "1", label: "1 per day" },
                  { value: "2", label: "2 per day" },
                  { value: "3", label: "3 per day" },
                  { value: "5", label: "5 per day" },
                ]}
              />
            </div>
          </Card>

          <div className="flex items-center gap-3">
            <Button
              icon={Save}
              onClick={handleSavePreferences}
              loading={updatePreferences.isPending}
              size="sm"
            >
              Save Automation Settings
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "reviews" ? (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader title="Google Reviews" icon={Star} />
            <p className="text-sm text-slate-500 mb-4">
              Configure your Google review link and how reviews are requested.
            </p>
            <div className="space-y-4">
              <Input
                label="Google Review URL"
                value={growthForm.googleReviewLink}
                onChange={(e) => setGrowthForm((p) => ({ ...p, googleReviewLink: e.target.value }))}
                placeholder="https://g.page/r/your-business/review"
                helper="Paste your Google Business review link"
              />
              <SettingRow label="Include review link on PDF quotes" description="Add a review request to the bottom of quote PDFs">
                <Toggle
                  checked={growthForm.includeReviewOnPdf}
                  onChange={(v) => setGrowthForm((p) => ({ ...p, includeReviewOnPdf: v }))}
                />
              </SettingRow>
              <SettingRow label="Include review link in messages" description="Add a review request to follow-up messages">
                <Toggle
                  checked={growthForm.includeReviewInMessages}
                  onChange={(v) => setGrowthForm((p) => ({ ...p, includeReviewInMessages: v }))}
                />
              </SettingRow>
              <SettingRow label="Ask for review after job completion" description="Automatically prompt for a review when a job is marked complete">
                <Toggle
                  checked={growthForm.askReviewAfterComplete}
                  onChange={(v) => setGrowthForm((p) => ({ ...p, askReviewAfterComplete: v }))}
                />
              </SettingRow>
            </div>
          </Card>

          <Card>
            <CardHeader title="Referral Program" icon={Gift} />
            <p className="text-sm text-slate-500 mb-4">
              Set up your referral offer to encourage customers to refer friends.
            </p>
            <div className="space-y-4">
              <Input
                label="Referral Offer Amount ($)"
                type="number"
                value={growthForm.referralOfferAmount}
                onChange={(e) => setGrowthForm((p) => ({ ...p, referralOfferAmount: Number(e.target.value) }))}
                helper="Discount offered to customers who refer new clients"
              />
              <Input
                label="Referral Booking Link"
                value={growthForm.referralBookingLink}
                onChange={(e) => setGrowthForm((p) => ({ ...p, referralBookingLink: e.target.value }))}
                placeholder="https://your-booking-link.com"
                helper="Link included in referral messages for easy booking"
              />
            </div>
          </Card>

          <div className="flex items-center gap-3">
            <Button
              icon={Save}
              onClick={handleSaveGrowth}
              loading={updateGrowthSettings.isPending}
              size="sm"
            >
              Save Review & Referral Settings
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "features" ? (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader title="Features" icon={Sliders} />
            <p className="text-sm text-slate-500 mb-4">
              Enable or disable app features.
            </p>
            <div className="space-y-1">
              <SettingRow
                label="Enable Commercial Quoting"
                description="Create quotes for commercial facilities with labor estimates, tiered pricing, and proposals"
              >
                <Toggle
                  checked={commercialEnabled}
                  onChange={(v) => setCommercialEnabled(v)}
                />
              </SettingRow>
            </div>
          </Card>

          <Card>
            <CardHeader title="Language" icon={Globe} />
            <p className="text-sm text-slate-500 mb-4">
              Choose the language used for AI-generated quotes, emails, and customer communications.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">App Language</label>
                <p className="text-xs text-slate-500 mb-2">
                  Sets your preferred language. The app interface is currently English only — full translation coming soon.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button
                      key={lang.value}
                      disabled={patchLanguage.isPending}
                      onClick={() => {
                        setAppLanguage(lang.value);
                        patchLanguage.mutate({ appLanguage: lang.value });
                      }}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                        appLanguage === lang.value
                          ? "bg-primary-50 text-primary-700 border-primary-200"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {lang.label}
                      {appLanguage === lang.value ? (
                        <CheckCircle className="w-3.5 h-3.5 inline-block ml-1.5 text-primary-600" />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
              <Divider />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Communication Language</label>
                <p className="text-xs text-slate-500 mb-2">Language used for AI-generated quotes, emails, and SMS messages sent to customers</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button
                      key={`comm-${lang.value}`}
                      disabled={patchLanguage.isPending}
                      onClick={() => {
                        setCommLanguage(lang.value);
                        patchLanguage.mutate({ commLanguage: lang.value });
                      }}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                        commLanguage === lang.value
                          ? "bg-primary-50 text-primary-700 border-primary-200"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {lang.label}
                      {commLanguage === lang.value ? (
                        <CheckCircle className="w-3.5 h-3.5 inline-block ml-1.5 text-primary-600" />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "integrations" ? (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader title="Payment & Accounting" icon={CreditCard} />
            <IntegrationCard
              name="Stripe"
              description="Accept online payments, process deposits, and manage subscriptions"
              icon={CreditCard}
              statusUrl="/api/stripe/status"
              connectUrl="/api/stripe/connect"
              disconnectUrl="/api/stripe/disconnect"
              disconnectMethod="DELETE"
              color="violet"
            />
            <IntegrationCard
              name="QuickBooks Online"
              description="Auto-create invoices and sync financial data"
              icon={FileText}
              statusUrl="/api/integrations/qbo/status"
              connectUrl="/api/integrations/qbo/connect"
              connectMethod="GET"
              disconnectUrl="/api/integrations/qbo/disconnect"
              color="green"
            />
          </Card>
          <Card>
            <CardHeader title="Operations & Scheduling" icon={Calendar} />
            <IntegrationCard
              name="Jobber"
              description="Sync jobs, clients, and schedules"
              icon={Zap}
              statusUrl="/api/integrations/jobber/status"
              connectUrl="/api/integrations/jobber/connect"
              connectMethod="GET"
              disconnectUrl="/api/integrations/jobber/disconnect"
              color="orange"
            />
            <IntegrationCard
              name="Google Calendar"
              description="Sync jobs and appointments to your Google Calendar"
              icon={Calendar}
              statusUrl="/api/google-calendar/status"
              connectUrl="/api/google-calendar/connect"
              connectMethod="GET"
              disconnectUrl="/api/google-calendar/disconnect"
              disconnectMethod="DELETE"
              color="blue"
            />
          </Card>
          <Card className="bg-slate-50 border-dashed border-slate-300">
            <div className="text-center py-6">
              <p className="text-sm text-slate-500 mb-1">More integrations coming soon</p>
              <p className="text-xs text-slate-400">ServiceTitan, Housecall Pro, Square, and more</p>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "account" ? (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader title="Account Details" icon={Shield} />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2.5">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-900 font-medium">
                  {user?.email}
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-slate-500">Name</span>
                <span className="text-slate-900 font-medium">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Subscription" icon={Zap} />
            {isGrowth ? (
              <div className="p-4 bg-gradient-to-br from-primary-50 to-violet-50 rounded-xl border border-primary-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-sm">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 capitalize">
                    QuotePro {tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </span>
                  <Badge status="accepted" label="Active" dot size="sm" />
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  {isPro
                    ? "Full access to all Pro features including revenue intelligence, lead finder, and advanced automations."
                    : "Unlimited quotes, AI tools, automated follow-ups, and full CRM access."}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleManageSubscription}
                  loading={portalLoading}
                >
                  Manage Subscription
                </Button>
                {portalError ? (
                  <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
                    {portalError}
                  </p>
                ) : null}
              </div>
            ) : isStarter ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-slate-900">Starter Plan</span>
                  <Badge status="accepted" label="Active" dot size="sm" />
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  20 quotes/month. Upgrade to Growth for unlimited quotes and AI tools.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Zap}
                    onClick={() => navigate("/pricing")}
                    className="bg-gradient-to-r from-primary-600 to-primary-700"
                  >
                    Upgrade to Growth
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleManageSubscription}
                    loading={portalLoading}
                  >
                    Manage
                  </Button>
                </div>
                {portalError ? (
                  <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
                    {portalError}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-400 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-slate-900">Free Plan</span>
                  <Badge status="draft" label="Limited" dot size="sm" />
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  3 quotes included. Upgrade for unlimited quotes, AI tools, and CRM.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Zap}
                  onClick={() => navigate("/pricing")}
                  className="bg-gradient-to-r from-primary-600 to-primary-700"
                >
                  View plans
                </Button>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Privacy &amp; Legal" icon={Shield} />
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Privacy Policy</span>
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  View <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Terms of Use</span>
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  View <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="flex items-start justify-between py-2">
                <div>
                  <span className="text-slate-700 font-medium block">AI Data Processing</span>
                  <span className="text-xs text-slate-400 mt-0.5 block">
                    Data sent to OpenAI to power AI features
                  </span>
                  {consentData?.aiConsentAcceptedAt ? (
                    <span className="text-xs text-slate-400 mt-0.5 block">
                      Accepted{" "}
                      {new Date(consentData.aiConsentAcceptedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {consentData.consentVersion ? ` · v${consentData.consentVersion}` : ""}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0 ml-4">
                  {hasAIConsent ? (
                    <>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        Enabled
                      </span>
                      <button
                        onClick={revokeAIConsent}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Revoke
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                        Not enabled
                      </span>
                      <button
                        onClick={requestAIConsent}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        Enable
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Danger Zone" />
            <div className="space-y-3">
              <Button
                variant="secondary"
                icon={LogOut}
                onClick={handleLogout}
                size="sm"
                className="w-full sm:w-auto justify-start"
              >
                Sign out
              </Button>
              <Button
                variant="ghost"
                icon={Trash2}
                onClick={() => setDeleteOpen(true)}
                size="sm"
                className="w-full sm:w-auto justify-start text-red-600 hover:bg-red-50"
              >
                Delete account
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "developer" ? (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader title="API Keys" icon={Key} />
            <p className="text-sm text-slate-500 mb-4">
              Use API keys to access QuotePro data from external applications.
            </p>
            {apiKeys.length === 0 ? (
              <p className="text-sm text-slate-400 py-4">No API keys yet.</p>
            ) : (
              <div className="space-y-2 mb-4">
                {apiKeys.map((key: any) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-lg"
                  >
                    <code className="text-xs text-slate-600 font-mono">
                      {key.key
                        ? `${key.key.slice(0, 12)}...`
                        : key.id}
                    </code>
                    <Badge
                      status={key.active !== false ? "accepted" : "draft"}
                      label={key.active !== false ? "Active" : "Inactive"}
                    />
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="secondary"
              icon={Plus}
              size="sm"
              onClick={async () => {
                try {
                  await apiPost("/api/api-keys", {});
                  queryClient.invalidateQueries({
                    queryKey: ["/api/api-keys"],
                  });
                } catch {}
              }}
            >
              Generate API Key
            </Button>
          </Card>

          <Card>
            <CardHeader title="Webhooks" icon={Webhook} />
            <p className="text-sm text-slate-500">
              Configure webhook endpoints to receive real-time events from
              QuotePro.
            </p>
          </Card>
        </div>
      ) : null}

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        description="This will permanently delete your account and all associated data including quotes, customers, jobs, and settings. This cannot be undone."
        confirmLabel="Delete Account"
      />
    </div>
  );
}
