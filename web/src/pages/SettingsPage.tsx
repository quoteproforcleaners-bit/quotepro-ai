import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AddressAutocompleteLine from "../components/AddressAutocompleteLine";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useSubscription } from "../lib/subscription";
import { apiPut, apiPost, apiGet, apiDelete, apiPatch } from "../lib/api";
import { applyLanguage } from "../lib/i18n";
import { useTranslation } from "react-i18next";
import { CURRENCIES, type SupportedCurrency } from "../utils/currency";
import { queryClient } from "../lib/queryClient";
import {
  Building2,
  CreditCard,
  Link2,
  MessageSquare,
  Save,
  CheckCircle,
  TrendingUp,
  XCircle,
  DollarSign,
  FileText,
  Settings,
  Zap,
  Calendar,
  Key,
  Webhook,
  Bot,
  Copy,
  Plus,
  User,
  Award,
  Mail,
  Edit3,
  Clock,
  Moon,
  Bell,
  Star,
  Gift,
  Globe,
  Briefcase,
  Sliders,
  Upload,
  Trash2,
  Image,
  Home,
  ExternalLink,
  Users,
  MapPin,
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
  beta = false,
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
  beta?: boolean;
}) {
  const { t } = useTranslation();
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
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-medium text-slate-900">{name}</h3>
            {beta ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide bg-red-100 text-red-600 border border-red-200 leading-none">
                BETA
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        ) : connected ? (
          <>
            <Badge status="accepted" label={t("common.connected")} dot />
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
    <div className="setting-row-apple">
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--t1)", margin: 0 }}>{label}</p>
        {description ? (
          <p style={{ fontSize: "11px", color: "var(--t3)", margin: "2px 0 0" }}>{description}</p>
        ) : null}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function SettingGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="setting-group-label">{label}</p>
      <div className="setting-group-card">{children}</div>
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

function ReferralTab() {
  const { t } = useTranslation();
  const { tier, startCheckout } = useSubscription();
  const [copied, setCopied] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["/api/referrals"] });
  const referrals = data as any;

  const handleCopy = () => {
    if (referrals?.referralUrl) {
      navigator.clipboard.writeText(referrals.referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader title={t("settings.referrals.yourLink")} icon={Gift} />
        <p className="text-sm text-slate-500 mb-5">
          {t("settings.referrals.yourLinkDesc")}
        </p>

        {isLoading ? (
          <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-mono truncate">
              {referrals?.referralUrl || t("settings.referrals.generatingLink")}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? t("settings.referrals.copied") : t("settings.referrals.copy")}
            </button>
          </div>
        )}

        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
          {t("settings.referrals.yourCode")} <strong>{referrals?.referralCode || "..."}</strong>
        </div>
      </Card>

      <Card>
        <CardHeader title={t("settings.referrals.stats")} icon={TrendingUp} />
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-xl">
            <p className="text-2xl font-bold text-slate-900">{referrals?.referredCount ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">{t("settings.referrals.signedUp")}</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-xl">
            <p className="text-2xl font-bold text-slate-900">{referrals?.paidReferrals ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">{t("settings.referrals.convertedPaid")}</p>
          </div>
          <div className="text-center p-4 bg-emerald-50 rounded-xl">
            <p className="text-2xl font-bold text-emerald-700">{referrals?.creditsEarned ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">{t("settings.referrals.freeMonths")}</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title={t("settings.referrals.howItWorks")} icon={Star} />
        <ol className="space-y-3">
          {[
            t("settings.referrals.step1"),
            t("settings.referrals.step2"),
            t("settings.referrals.step3"),
            t("settings.referrals.step4"),
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-slate-700">{step}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, business, refresh } = useAuth();
  const { isPro, isGrowth, isStarter, tier, startCheckout, checkoutLoading } = useSubscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(() => searchParams.get("tab") || "business");
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
    sendgridApiKey: "" as string | null,
  });

  const [brandingForm, setBrandingForm] = useState({
    senderName: "",
    senderTitle: "",
    bookingLink: "",
    emailSignature: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    venmoHandle: "",
    cashappHandle: "",
    paymentNotes: "",
  });

  const [paymentMethods, setPaymentMethods] = useState<Record<string, boolean>>({});
  const [autoChargeEnabled, setAutoChargeEnabled] = useState(false);
  const [autoChargeTime, setAutoChargeTime] = useState("17:00");
  const [autoChargeTimezone, setAutoChargeTimezone] = useState("America/New_York");
  const [autoChargeSaved, setAutoChargeSaved] = useState(false);

  const { data: autoChargeSettings } = useQuery<any>({ queryKey: ["/api/payments/auto-charge-settings"] });
  const { data: stripeConnectStatus } = useQuery<any>({ queryKey: ["/api/payments/stripe-connect-status"] });

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
    pricePerSqft: 85,
    pricePerBedroom: 15,
    pricePerBathroom: 18,
    hourlyRate: 45,
    minimumTicket: 100,
    taxRate: 0,
  });
  const [addOnPrices, setAddOnPrices] = useState<Record<string, number>>({});

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

  // Reminder preferences state
  const [reminderEmailDays, setReminderEmailDays] = useState<string>("3");
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderTestSending, setReminderTestSending] = useState(false);
  const [reminderTestSent, setReminderTestSent] = useState(false);

  const { data: reminderPrefs } = useQuery<any>({ queryKey: ["/api/reminder-preferences"] });

  const { data: portalSettings } = useQuery<any>({ queryKey: ["/api/portal-settings"] });
  const { data: portalStats } = useQuery<any>({ queryKey: ["/api/portal-stats"] });

  const [portalEnabled, setPortalEnabled] = useState(true);
  const [portalColor, setPortalColor] = useState("");
  const [portalWelcomeMessage, setPortalWelcomeMessage] = useState("");

  useEffect(() => {
    if (portalSettings) {
      setPortalEnabled(portalSettings.portalEnabled !== false);
      setPortalColor(portalSettings.portalColor || "");
      setPortalWelcomeMessage(portalSettings.portalWelcomeMessage || "");
    }
  }, [portalSettings]);

  const savePortalSettings = useMutation({
    mutationFn: () =>
      apiPut("/api/portal-settings", { portalEnabled, portalColor, portalWelcomeMessage }) as Promise<any>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal-settings"] });
      showSaved("portal");
    },
  });

  // Cleaner notification preferences state
  const [cleanerEnabled, setCleanerEnabled] = useState(true);
  const [cleanerEmail, setCleanerEmail] = useState(true);
  const [cleanerTiming, setCleanerTiming] = useState("both");
  const [cleanerSaving, setCleanerSaving] = useState(false);
  const [cleanerTestSending, setCleanerTestSending] = useState(false);
  const [cleanerTestSent, setCleanerTestSent] = useState(false);

  const { data: cleanerPrefs } = useQuery<any>({ queryKey: ["/api/cleaner-notification-preferences"] });
  const { data: teamMembers = [] } = useQuery<any[]>({ queryKey: ["/api/employees"] });
  const { data: tipSettings, refetch: refetchTipSettings } = useQuery<any>({ queryKey: ["/api/tip-settings"] });
  const { data: tipHistory = [] } = useQuery<any[]>({ queryKey: ["/api/tips"] });
  const [tipsForm, setTipsForm] = useState({ tipsEnabled: false, tipPercentageOptions: [15, 18, 20, 25], tipRequestDelay: 2 });
  const [tipsSaved, setTipsSaved] = useState(false);
  useEffect(() => {
    if (tipSettings) {
      setTipsForm({
        tipsEnabled: tipSettings.tipsEnabled ?? false,
        tipPercentageOptions: tipSettings.tipPercentageOptions || [15, 18, 20, 25],
        tipRequestDelay: tipSettings.tipRequestDelay ?? 2,
      });
    }
  }, [tipSettings]);
  const saveTipSettings = async () => {
    try {
      await apiPut("/api/tip-settings", tipsForm);
      refetchTipSettings();
      setTipsSaved(true);
      setTimeout(() => setTipsSaved(false), 3000);
      showSaved("tips");
    } catch (err: any) {
      console.error("saveTipSettings error:", err);
      alert(err?.message || "Failed to save tip settings. Please try again.");
    }
  };

  useEffect(() => {
    if (!reminderPrefs) return;
    setReminderEmailDays(reminderPrefs.emailReminderDays === null ? "null" : String(reminderPrefs.emailReminderDays ?? 3));
  }, [reminderPrefs]);

  useEffect(() => {
    if (!cleanerPrefs) return;
    setCleanerEnabled(cleanerPrefs.enabled ?? true);
    setCleanerEmail(cleanerPrefs.email ?? true);
    setCleanerTiming(cleanerPrefs.timing ?? "both");
  }, [cleanerPrefs]);

  const handleSaveReminders = async () => {
    setReminderSaving(true);
    try {
      await apiPut("/api/reminder-preferences", {
        emailReminderDays: reminderEmailDays === "null" ? null : Number(reminderEmailDays),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reminder-preferences"] });
      showSaved("reminders");
    } catch {}
    setReminderSaving(false);
  };

  const handleTestReminder = async () => {
    setReminderTestSending(true);
    try {
      await apiPost("/api/reminder-preferences/test", {});
      setReminderTestSent(true);
      setTimeout(() => setReminderTestSent(false), 5000);
    } catch {}
    setReminderTestSending(false);
  };

  const handleSaveCleanerNotifications = async () => {
    setCleanerSaving(true);
    try {
      await apiPut("/api/cleaner-notification-preferences", {
        enabled: cleanerEnabled,
        email: cleanerEmail,
        timing: cleanerTiming,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cleaner-notification-preferences"] });
      showSaved("reminders");
    } catch {}
    setCleanerSaving(false);
  };

  const handleTestCleanerNotification = async (employeeId?: string) => {
    setCleanerTestSending(true);
    try {
      await apiPost("/api/cleaner-notification-preferences/test", { employeeId });
      setCleanerTestSent(true);
      setTimeout(() => setCleanerTestSent(false), 5000);
    } catch {}
    setCleanerTestSending(false);
  };

  const [commercialEnabled, setCommercialEnabled] = useState(false);
  const [appLanguage, setAppLanguage] = useState("en");
  const [commLanguage, setCommLanguage] = useState("en");
  const [currency, setCurrency] = useState<SupportedCurrency>("USD");
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const PRESET_LOGOS = [
    {
      id: "broom",
      label: "Broom",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="16" fill="#2563EB"/><rect x="37" y="12" width="6" height="38" rx="3" fill="white"/><rect x="20" y="48" width="40" height="14" rx="7" fill="white" opacity="0.9"/><rect x="20" y="62" width="4" height="10" rx="2" fill="white" opacity="0.8"/><rect x="30" y="62" width="4" height="12" rx="2" fill="white" opacity="0.8"/><rect x="40" y="62" width="4" height="10" rx="2" fill="white" opacity="0.8"/><rect x="50" y="62" width="4" height="11" rx="2" fill="white" opacity="0.8"/><rect x="58" y="62" width="4" height="9" rx="2" fill="white" opacity="0.8"/></svg>`,
    },
    {
      id: "mop",
      label: "Mop",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="16" fill="#0D9488"/><rect x="37" y="10" width="6" height="42" rx="3" fill="white"/><rect x="20" y="50" width="40" height="10" rx="5" fill="white" opacity="0.9"/><rect x="22" y="60" width="5" height="12" rx="2.5" fill="white" opacity="0.75"/><rect x="31" y="60" width="5" height="14" rx="2.5" fill="white" opacity="0.75"/><rect x="40" y="60" width="5" height="11" rx="2.5" fill="white" opacity="0.75"/><rect x="49" y="60" width="5" height="13" rx="2.5" fill="white" opacity="0.75"/><rect x="58" y="60" width="5" height="10" rx="2.5" fill="white" opacity="0.75"/></svg>`,
    },
    {
      id: "soap",
      label: "Soap",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="16" fill="#7C3AED"/><rect x="14" y="40" width="52" height="28" rx="10" fill="white" opacity="0.9"/><rect x="24" y="52" width="32" height="4" rx="2" fill="#7C3AED" opacity="0.3"/><circle cx="26" cy="28" r="7" fill="white" opacity="0.65"/><circle cx="48" cy="22" r="5" fill="white" opacity="0.5"/><circle cx="62" cy="30" r="4" fill="white" opacity="0.55"/></svg>`,
    },
    {
      id: "sparkles",
      label: "Sparkles",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="16" fill="#D97706"/><path d="M40 14 L43.5 27 L57 27 L46 35 L49.5 48 L40 41 L30.5 48 L34 35 L23 27 L36.5 27 Z" fill="white"/><path d="M65 12 L66.5 17 L72 17 L68 20 L69.5 25 L65 22 L60.5 25 L62 20 L58 17 L63.5 17 Z" fill="white" opacity="0.7"/><path d="M16 55 L17.5 60 L23 60 L19 63 L20.5 68 L16 65 L11.5 68 L13 63 L9 60 L14.5 60 Z" fill="white" opacity="0.7"/></svg>`,
    },
    {
      id: "spray",
      label: "Spray",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="16" fill="#059669"/><rect x="32" y="34" width="20" height="30" rx="5" fill="white" opacity="0.9"/><rect x="32" y="26" width="12" height="11" rx="3" fill="white" opacity="0.85"/><rect x="20" y="30" width="14" height="6" rx="3" fill="white" opacity="0.8"/><rect x="16" y="24" width="6" height="10" rx="3" fill="white" opacity="0.75"/><circle cx="55" cy="22" r="3" fill="white" opacity="0.6"/><circle cx="61" cy="16" r="2.5" fill="white" opacity="0.5"/><circle cx="60" cy="28" r="2" fill="white" opacity="0.45"/></svg>`,
    },
    {
      id: "bucket",
      label: "Bucket",
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="16" fill="#0EA5E9"/><path d="M24 36 L31 72 L49 72 L56 36 Z" fill="white" opacity="0.9"/><rect x="20" y="29" width="40" height="10" rx="5" fill="white"/><path d="M30 29 Q40 14 50 29" fill="none" stroke="white" stroke-width="5" stroke-linecap="round"/><path d="M28 52 Q40 48 52 52" fill="none" stroke="#0EA5E9" stroke-width="3" opacity="0.4"/></svg>`,
    },
  ];

  const uploadLogo = async (imageData: string | null) => {
    setLogoUploading(true);
    try {
      const data = await apiPost<{ logoUri: string | null }>("/api/business/logo", { imageData });
      setLogoUri(data.logoUri);
      queryClient.invalidateQueries({ queryKey: ["/api/business"] });
    } catch (e) {
      console.error("Logo upload failed:", e);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUri = ev.target?.result as string;
      uploadLogo(dataUri);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const svgToDataUri = (svg: string) =>
    `data:image/svg+xml,${encodeURIComponent(svg)}`;

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const [bookingForm, setBookingForm] = useState({
    enabled: false,
    allowedDays: [1, 2, 3, 4, 5] as number[],
    timeWindows: [{ start: "08:00", end: "17:00" }] as { start: string; end: string }[],
    slotDurationHours: 3,
    slotIntervalHours: 2,
    minNoticeHours: 24,
    maxJobsPerDay: 4,
    blackoutDates: [] as string[],
    serviceAreaNotes: "",
    confirmationMessage: "",
  });
  const [newBlackout, setNewBlackout] = useState("");

  const [chatWidgetForm, setChatWidgetForm] = useState({ enabled: true, color: "" });
  const { data: chatWidgetData } = useQuery<any>({
    queryKey: ["/api/business/chat-widget"],
  });
  useEffect(() => {
    if (chatWidgetData) {
      setChatWidgetForm({ enabled: chatWidgetData.enabled ?? true, color: chatWidgetData.color || "" });
    }
  }, [chatWidgetData]);
  const saveChatWidget = useMutation({
    mutationFn: (data: any) => apiPatch("/api/business/chat-widget", data),
    onSuccess: () => showSaved("chatWidget"),
  });

  const { data: bookingAvailability, isLoading: bookingLoading } = useQuery<any>({
    queryKey: ["/api/booking-availability"],
  });

  const saveBooking = useMutation({
    mutationFn: (data: any) => apiPut("/api/booking-availability", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/booking-availability"] });
      showSaved("booking");
    },
  });

  useEffect(() => {
    if (business) {
      setBusinessForm({
        companyName: business.companyName || "",
        phone: business.phone || "",
        email: business.email || "",
        address: business.address || "",
        sendgridApiKey: (business as any).sendgridApiKey || "",
      });
      setBrandingForm({
        senderName: (business as any).senderName || "",
        senderTitle: (business as any).senderTitle || "",
        bookingLink: (business as any).bookingLink || "",
        emailSignature: (business as any).emailSignature || "",
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
      setCurrency(((business as any).currency as SupportedCurrency) || "USD");
      setLogoUri((business as any).logoUri || null);
    }
  }, [business]);

  useEffect(() => {
    if (pricing) {
      setPricingForm({
        pricePerSqft:    pricing.pricePerSqft    ?? 85,
        pricePerBedroom: pricing.pricePerBedroom  ?? 15,
        pricePerBathroom:pricing.pricePerBathroom ?? 18,
        hourlyRate:      pricing.hourlyRate       ?? 45,
        minimumTicket:   pricing.minimumTicket    ?? 100,
        taxRate:         pricing.taxRate          ?? 0,
      });
      setAddOnPrices(pricing.addOnPrices || {});
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
    if (autoChargeSettings) {
      setAutoChargeEnabled(autoChargeSettings.enabled ?? false);
      setAutoChargeTime(autoChargeSettings.time ?? "17:00");
      setAutoChargeTimezone(autoChargeSettings.timezone ?? "America/New_York");
    }
  }, [autoChargeSettings]);

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

  useEffect(() => {
    if (bookingAvailability) {
      setBookingForm({
        enabled: bookingAvailability.enabled ?? false,
        allowedDays: bookingAvailability.allowedDays || [1, 2, 3, 4, 5],
        timeWindows: bookingAvailability.timeWindows?.length
          ? bookingAvailability.timeWindows
          : [{ start: "08:00", end: "17:00" }],
        slotDurationHours: bookingAvailability.slotDurationHours ?? 3,
        slotIntervalHours: bookingAvailability.slotIntervalHours ?? 2,
        minNoticeHours: bookingAvailability.minNoticeHours ?? 24,
        maxJobsPerDay: bookingAvailability.maxJobsPerDay ?? 4,
        blackoutDates: bookingAvailability.blackoutDates || [],
        serviceAreaNotes: bookingAvailability.serviceAreaNotes || "",
        confirmationMessage: bookingAvailability.confirmationMessage || "",
      });
    }
  }, [bookingAvailability]);

  const updateBusiness = useMutation({
    mutationFn: (data: any) => apiPut("/api/business", data),
    onSuccess: () => {
      refresh();
      showSaved("business");
    },
  });

  const patchLanguage = useMutation({
    mutationFn: (data: { appLanguage?: string; commLanguage?: string }) =>
      apiPut<{ appLanguage: string; commLanguage: string }>("/api/settings/language", {
        ...data,
        languageSelected: true,
      }),
    onSuccess: (response) => {
      if (response?.appLanguage) {
        setAppLanguage(response.appLanguage);
        applyLanguage(response.appLanguage as any);
      }
      if (response?.commLanguage) setCommLanguage(response.commLanguage);
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

  const handleSaveBranding = () => {
    updateBusiness.mutate({
      senderName: brandingForm.senderName || "",
      senderTitle: brandingForm.senderTitle || "",
      bookingLink: brandingForm.bookingLink || "",
      emailSignature: brandingForm.emailSignature || "",
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

  const handleSaveAutoCharge = async () => {
    try {
      await apiPatch("/api/payments/auto-charge-settings", {
        enabled: autoChargeEnabled,
        time: autoChargeTime,
        timezone: autoChargeTimezone,
      });
      setAutoChargeSaved(true);
      setTimeout(() => setAutoChargeSaved(false), 2500);
    } catch {}
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
    { id: "business",     label: t("settings.tabs.business") },
    { id: "branding",     label: t("settings.tabs.branding") },
    { id: "payments",     label: t("settings.tabs.payments") },
    { id: "automations",  label: t("settings.tabs.automations") },
    { id: "reminders",    label: t("settings.tabs.reminders") },
    { id: "reviews",      label: t("settings.tabs.reviews") },
    { id: "tips",         label: t("settings.tabs.tips") },
    { id: "features",     label: t("settings.tabs.features") },
    { id: "booking",      label: t("settings.tabs.booking") },
    { id: "integrations", label: t("settings.tabs.integrations") },
    { id: "referrals",    label: t("settings.tabs.referrals") },
    { id: "developer",    label: t("settings.tabs.developer") },
  ];

  return (
    <div>
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle2")} />

      <div className="mb-6">
        <Tabs tabs={settingsTabs} active={tab} onChange={setTab} />
      </div>

      {saved ? (
        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 animate-scale-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">{t("settings.savedSuccessfully")}</span>
        </div>
      ) : null}

      {tab === "business" ? (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader title={t("settings.business.profile")} icon={Building2} />
            <div className="space-y-4">
              <Input
                label={t("settings.business.companyName")}
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
                  label={t("settings.business.phone")}
                  value={businessForm.phone}
                  onChange={(e) =>
                    setBusinessForm((p) => ({ ...p, phone: e.target.value }))
                  }
                />
                <Input
                  label={t("settings.business.businessEmail")}
                  type="email"
                  value={businessForm.email}
                  onChange={(e) =>
                    setBusinessForm((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </div>

              {/* Email sending info */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                  <p className="font-semibold text-slate-800 text-sm">{t("settings.business.emailSentTitle")}</p>
                </div>
                <div className="p-4 space-y-3 text-sm text-slate-600 leading-relaxed">
                  <p>
                    {t("settings.business.emailSentDesc1")}
                    <strong className="text-slate-800"> {businessForm.companyName || t("settings.business.companyName")}</strong>.
                  </p>
                  <p>
                    {t("settings.business.emailSentDesc2")}
                    {businessForm.email ? (
                      <strong className="text-slate-800"> {businessForm.email}</strong>
                    ) : (
                      <span className="text-amber-600 font-medium"> {t("settings.business.emailSentNoEmail")}</span>
                    )}
                  </p>
                  <p className="text-slate-400 text-xs">
                    {t("settings.business.emailSentFooter")}
                  </p>
                </div>
              </div>
              <AddressAutocompleteLine
                label={t("settings.business.address")}
                value={businessForm.address}
                onChange={(val) => setBusinessForm((p) => ({ ...p, address: val }))}
              />
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <Button
                  icon={Save}
                  onClick={() => updateBusiness.mutate(businessForm)}
                  loading={updateBusiness.isPending}
                  size="sm"
                >
                  {t("settings.business.saveChanges")}
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title={t("settings.business.pricingConfig")} icon={DollarSign} />
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t("settings.business.residentialBasePricing")}</p>
                <p className="text-xs text-slate-500 mb-3">{t("settings.business.residentialBasePricingDesc")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label={t("settings.business.pricePerSqft")}
                    type="number"
                    value={pricingForm.pricePerSqft}
                    onChange={(e) =>
                      setPricingForm((p) => ({ ...p, pricePerSqft: +e.target.value }))
                    }
                  />
                  <Input
                    label={t("settings.business.pricePerBedroom")}
                    type="number"
                    value={pricingForm.pricePerBedroom}
                    onChange={(e) =>
                      setPricingForm((p) => ({ ...p, pricePerBedroom: +e.target.value }))
                    }
                  />
                  <Input
                    label={t("settings.business.pricePerBathroom")}
                    type="number"
                    value={pricingForm.pricePerBathroom}
                    onChange={(e) =>
                      setPricingForm((p) => ({ ...p, pricePerBathroom: +e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{t("settings.business.otherPricing")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label={t("settings.business.hourlyRate")}
                    type="number"
                    value={pricingForm.hourlyRate}
                    onChange={(e) =>
                      setPricingForm((p) => ({ ...p, hourlyRate: +e.target.value }))
                    }
                  />
                  <Input
                    label={t("settings.business.minimumJobPrice")}
                    type="number"
                    value={pricingForm.minimumTicket}
                    onChange={(e) =>
                      setPricingForm((p) => ({ ...p, minimumTicket: +e.target.value }))
                    }
                  />
                  <Input
                    label={t("settings.business.taxRate")}
                    type="number"
                    value={pricingForm.taxRate}
                    onChange={(e) =>
                      setPricingForm((p) => ({ ...p, taxRate: +e.target.value }))
                    }
                  />
                </div>
              </div>
              <Button
                icon={Save}
                onClick={() => updatePricing.mutate(pricingForm)}
                loading={updatePricing.isPending}
                size="sm"
              >
                {t("settings.business.savePricing")}
              </Button>
            </div>
          </Card>

          {pricing?.serviceTypes ? (
            <Card>
              <CardHeader title={t("settings.business.serviceTypes")} />
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
              <CardHeader title={t("settings.business.frequencyDiscounts")} />
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
            <CardHeader title={t("settings.business.addonPricing")} icon={Plus} />
            <p className="text-xs text-slate-500 mb-4">{t("settings.business.addonPricingDesc")}</p>
            <div className="space-y-3">
              {([
                { key: "insideFridge",   labelKey: "settings.business.addons.insideFridge" },
                { key: "insideOven",     labelKey: "settings.business.addons.insideOven" },
                { key: "insideWindows",  labelKey: "settings.business.addons.insideWindows" },
                { key: "insideCabinets", labelKey: "settings.business.addons.insideCabinets" },
                { key: "laundry",        labelKey: "settings.business.addons.laundry" },
                { key: "dishes",         labelKey: "settings.business.addons.dishes" },
                { key: "organizing",     labelKey: "settings.business.addons.organizing" },
                { key: "garage",         labelKey: "settings.business.addons.garage" },
                { key: "baseboards",     labelKey: "settings.business.addons.baseboards" },
                { key: "blinds",         labelKey: "settings.business.addons.blinds" },
                { key: "carpetCleaning", labelKey: "settings.business.addons.carpetCleaning" },
                { key: "wallWashing",    labelKey: "settings.business.addons.wallWashing" },
              ] as { key: string; labelKey: string }[]).map((addon) => (
                <div key={addon.key} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                  <span className="text-sm font-medium text-slate-700">{t(addon.labelKey)}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">$</span>
                    <input
                      type="number"
                      className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400"
                      value={addOnPrices[addon.key] ?? ""}
                      placeholder="0"
                      onChange={(e) => {
                        const val = e.target.value;
                        setAddOnPrices((p) => ({
                          ...p,
                          [addon.key]: val ? Number(val) : 0,
                        }));
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button
                icon={Save}
                onClick={() => updatePricing.mutate({ addOnPrices })}
                loading={updatePricing.isPending}
                size="sm"
              >
                {t("settings.business.saveAddonPrices")}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "branding" ? (
        <div className="max-w-2xl space-y-6">
          {/* ─── Business Logo ─── */}
          <Card>
            <CardHeader title={t("settings.branding.businessLogo")} icon={Image} />
            <p className="text-sm text-slate-500 mb-5">
              {t("settings.branding.businessLogoDesc")}
            </p>

            {/* Current logo preview */}
            {logoUri ? (
              <div className="mb-5 flex items-center gap-4">
                <img
                  src={logoUri}
                  alt="Business logo"
                  className="h-16 w-16 rounded-xl object-contain border border-slate-200 bg-white p-1"
                />
                <div>
                  <p className="text-sm font-medium text-slate-700">{t("settings.branding.currentLogo")}</p>
                  <button
                    onClick={() => uploadLogo(null)}
                    disabled={logoUploading}
                    className="mt-1 flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={12} />
                    {t("settings.branding.removeLogo")}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Preset icons */}
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              {t("settings.branding.presetIcons")}
            </p>
            <div className="flex flex-wrap gap-3 mb-5">
              {PRESET_LOGOS.map((preset) => {
                const uri = svgToDataUri(preset.svg);
                const isActive = logoUri === uri;
                return (
                  <button
                    key={preset.id}
                    onClick={() => uploadLogo(uri)}
                    disabled={logoUploading}
                    title={preset.label}
                    className={`rounded-xl border-2 p-1 transition-all ${
                      isActive
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <img
                      src={uri}
                      alt={preset.label}
                      className="h-12 w-12 rounded-lg object-contain"
                    />
                  </button>
                );
              })}
            </div>

            {/* Custom upload */}
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              {t("settings.branding.uploadOwn")}
            </p>
            <label
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors ${logoUploading ? "opacity-50 pointer-events-none" : ""}`}
            >
              <Upload size={16} />
              {logoUploading ? t("settings.branding.uploading") : t("settings.branding.chooseImage")}
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                className="sr-only"
                onChange={handleLogoFileChange}
                disabled={logoUploading}
              />
            </label>
            <p className="mt-2 text-xs text-slate-400">{t("settings.branding.maxSize")}</p>
          </Card>

          <Card>
            <CardHeader title={t("settings.branding.senderIdentity")} icon={User} />
            <p className="text-sm text-slate-500 mb-4">
              {t("settings.branding.senderIdentityDesc")}
            </p>
            <div className="space-y-4">
              <Input
                label={t("settings.branding.senderName")}
                value={brandingForm.senderName}
                onChange={(e) => setBrandingForm((p) => ({ ...p, senderName: e.target.value }))}
                placeholder="e.g. Sarah Johnson"
              />
              <Input
                label={t("settings.branding.senderTitle")}
                value={brandingForm.senderTitle}
                onChange={(e) => setBrandingForm((p) => ({ ...p, senderTitle: e.target.value }))}
                placeholder="e.g. Owner & Lead Cleaner"
              />
              <Input
                label={t("settings.branding.bookingLink")}
                value={brandingForm.bookingLink}
                onChange={(e) => setBrandingForm((p) => ({ ...p, bookingLink: e.target.value }))}
                placeholder="https://calendly.com/your-link"
                helper={t("settings.branding.bookingLinkHelper")}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title={t("settings.branding.signatures")} icon={Edit3} />
            <p className="text-sm text-slate-500 mb-4">
              {t("settings.branding.signaturesDesc")}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {t("settings.branding.emailSignature")}
                </label>
                <textarea
                  value={brandingForm.emailSignature}
                  onChange={(e) => setBrandingForm((p) => ({ ...p, emailSignature: e.target.value }))}
                  placeholder="Best regards,&#10;Sarah Johnson&#10;Sparkle Clean LLC"
                  rows={3}
                  className="w-full px-3.5 py-3 rounded-lg border border-slate-200 hover:border-slate-300 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-none"
                />
              </div>
            </div>
          </Card>

          <div className="flex items-center gap-3">
            <Button
              icon={Save}
              onClick={handleSaveBranding}
              loading={updateBusiness.isPending}
              size="sm"
            >
              {t("settings.branding.saveBranding")}
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "payments" ? (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader title={t("settings.payments.paymentHandles")} icon={DollarSign} />
            <p className="text-sm text-slate-500 mb-4">
              {t("settings.payments.paymentHandlesDesc")}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("settings.payments.venmoHandle")}</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("settings.payments.cashAppTag")}</label>
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
            <CardHeader title={t("settings.payments.acceptedMethods")} icon={CreditCard} />
            <p className="text-sm text-slate-500 mb-4">
              {t("settings.payments.acceptedMethodsDesc")}
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
            <CardHeader title={t("settings.payments.paymentNotes")} />
            <p className="text-sm text-slate-500 mb-3">
              {t("settings.payments.paymentNotesDesc")}
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
              {t("settings.payments.savePaymentSettings")}
            </Button>
          </div>

          {/* ─── Stripe Connect Status ── */}
          {stripeConnectStatus?.connected ? (
            <Card className="mt-2">
              <CardHeader title={t("settings.payments.stripeConnectStatus")} icon={CreditCard} />
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-600">{t("settings.payments.account")}</span>
                  <span className="font-medium text-slate-900">{stripeConnectStatus.displayName || stripeConnectStatus.accountId}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-600">{t("settings.payments.chargesEnabled")}</span>
                  <span className={stripeConnectStatus.chargesEnabled ? "text-emerald-600 font-medium" : "text-red-500"}>
                    {stripeConnectStatus.chargesEnabled ? t("settings.payments.yes") : t("settings.payments.noActionRequired")}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-600">{t("settings.payments.payoutsEnabled")}</span>
                  <span className={stripeConnectStatus.payoutsEnabled ? "text-emerald-600 font-medium" : "text-amber-500"}>
                    {stripeConnectStatus.payoutsEnabled ? t("settings.payments.yes") : t("settings.payments.pending")}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-600">{t("settings.payments.countryCurrency")}</span>
                  <span className="font-medium text-slate-900">{[stripeConnectStatus.country, stripeConnectStatus.currency?.toUpperCase()].filter(Boolean).join(" · ")}</span>
                </div>
              </div>
            </Card>
          ) : null}

          {/* ─── Auto-Charge Settings ── */}
          <Card className="mt-2">
            <CardHeader title={t("settings.payments.autoCharge")} icon={CreditCard} />
            <p className="text-sm text-slate-500 mb-4">
              {t("settings.payments.autoChargeDesc")}
            </p>
            {autoChargeSaved ? (
              <div className="mb-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle className="w-4 h-4" />
                {t("settings.payments.autoChargeSaved")}
              </div>
            ) : null}
            <SettingRow label={t("settings.payments.enableAutoCharge")}>
              <Toggle checked={autoChargeEnabled} onChange={setAutoChargeEnabled} />
            </SettingRow>
            {autoChargeEnabled ? (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("settings.payments.chargeTime")}</label>
                  <input
                    type="time"
                    value={autoChargeTime}
                    onChange={(e) => setAutoChargeTime(e.target.value)}
                    className="h-11 px-3.5 rounded-lg border border-slate-200 hover:border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("settings.payments.timezone")}</label>
                  <select
                    value={autoChargeTimezone}
                    onChange={(e) => setAutoChargeTimezone(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-slate-200 hover:border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  >
                    <option value="America/New_York">Eastern (ET)</option>
                    <option value="America/Chicago">Central (CT)</option>
                    <option value="America/Denver">Mountain (MT)</option>
                    <option value="America/Los_Angeles">Pacific (PT)</option>
                    <option value="America/Anchorage">Alaska (AKT)</option>
                    <option value="Pacific/Honolulu">Hawaii (HT)</option>
                  </select>
                </div>
              </div>
            ) : null}
            <div className="mt-4">
              <Button size="sm" icon={Save} onClick={handleSaveAutoCharge}>
                {t("settings.payments.saveAutoCharge")}
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "automations" ? (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader title={t("settings.automations.dailyFollowUp")} icon={Bell} />
            <p className="text-sm text-slate-500 mb-4">
              {t("settings.automations.dailyFollowUpDesc")}
            </p>
            <div className="space-y-4">
              <SettingRow label={t("settings.automations.enableDailyPulse")} description={t("settings.automations.enableDailyPulseDesc")}>
                <Toggle
                  checked={prefsForm.dailyPulseEnabled}
                  onChange={(v) => setPrefsForm((p) => ({ ...p, dailyPulseEnabled: v }))}
                />
              </SettingRow>
              {prefsForm.dailyPulseEnabled ? (
                <Select
                  label={t("settings.automations.reminderTime")}
                  value={prefsForm.dailyPulseTime}
                  onChange={(e) => setPrefsForm((p) => ({ ...p, dailyPulseTime: e.target.value }))}
                  options={TIME_OPTIONS}
                />
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title={t("settings.automations.weeklyRecap")} icon={Calendar} />
            <p className="text-sm text-slate-500 mb-4">
              {t("settings.automations.weeklyRecapDesc")}
            </p>
            <div className="space-y-4">
              <SettingRow label={t("settings.automations.enableWeeklyRecap")} description={t("settings.automations.enableWeeklyRecapDesc")}>
                <Toggle
                  checked={prefsForm.weeklyRecapEnabled}
                  onChange={(v) => setPrefsForm((p) => ({ ...p, weeklyRecapEnabled: v }))}
                />
              </SettingRow>
              {prefsForm.weeklyRecapEnabled ? (
                <Select
                  label={t("settings.automations.recapDay")}
                  value={String(prefsForm.weeklyRecapDay)}
                  onChange={(e) => setPrefsForm((p) => ({ ...p, weeklyRecapDay: Number(e.target.value) }))}
                  options={DAY_OPTIONS}
                />
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title={t("settings.automations.quietHours")} icon={Moon} />
            <p className="text-sm text-slate-500 mb-4">
              {t("settings.automations.quietHoursDesc")}
            </p>
            <div className="space-y-4">
              <SettingRow label={t("settings.automations.enableQuietHours")} description={t("settings.automations.enableQuietHoursDesc")}>
                <Toggle
                  checked={prefsForm.quietHoursEnabled}
                  onChange={(v) => setPrefsForm((p) => ({ ...p, quietHoursEnabled: v }))}
                />
              </SettingRow>
              {prefsForm.quietHoursEnabled ? (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label={t("settings.automations.startTime")}
                    value={prefsForm.quietHoursStart}
                    onChange={(e) => setPrefsForm((p) => ({ ...p, quietHoursStart: e.target.value }))}
                    placeholder="21:00"
                  />
                  <Input
                    label={t("settings.automations.endTime")}
                    value={prefsForm.quietHoursEnd}
                    onChange={(e) => setPrefsForm((p) => ({ ...p, quietHoursEnd: e.target.value }))}
                    placeholder="08:00"
                  />
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader title={t("settings.automations.followUpBehavior")} icon={Clock} />
            <div className="space-y-4">
              <Select
                label={t("settings.automations.dormantThreshold")}
                value={String(prefsForm.dormantThresholdDays)}
                onChange={(e) => setPrefsForm((p) => ({ ...p, dormantThresholdDays: Number(e.target.value) }))}
                options={[
                  { value: "30", label: t("settings.automations.days", { count: 30 }) },
                  { value: "60", label: t("settings.automations.days", { count: 60 }) },
                  { value: "90", label: t("settings.automations.days", { count: 90 }) },
                  { value: "120", label: t("settings.automations.days", { count: 120 }) },
                  { value: "180", label: t("settings.automations.days", { count: 180 }) },
                ]}
              />
              <Select
                label={t("settings.automations.maxFollowUps")}
                value={String(prefsForm.maxFollowUpsPerDay)}
                onChange={(e) => setPrefsForm((p) => ({ ...p, maxFollowUpsPerDay: Number(e.target.value) }))}
                options={[
                  { value: "1", label: t("settings.automations.perDay", { count: 1 }) },
                  { value: "2", label: t("settings.automations.perDay", { count: 2 }) },
                  { value: "3", label: t("settings.automations.perDay", { count: 3 }) },
                  { value: "5", label: t("settings.automations.perDay", { count: 5 }) },
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
              {t("settings.automations.saveAutomation")}
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "reminders" ? (
        <div className="max-w-2xl space-y-6">
          {/* Header card */}
          <Card>
            <CardHeader title={t("settings.reminders.automatedReminders")} icon={Bell} />
            <p className="text-sm text-slate-500 mb-6">
              {t("settings.reminders.automatedRemindersDesc")}
            </p>

            {/* Email */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-slate-800">{t("settings.reminders.emailReminder")}</span>
              </div>
              <select
                value={reminderEmailDays}
                onChange={(e) => setReminderEmailDays(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">{t("settings.reminders.emailOneDay")}</option>
                <option value="2">{t("settings.reminders.emailTwoDays")}</option>
                <option value="3">{t("settings.reminders.emailThreeDays")}</option>
                <option value="7">{t("settings.reminders.emailOneWeek")}</option>
                <option value="null">{t("settings.reminders.emailNone")}</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <Button icon={Save} onClick={handleSaveReminders} loading={reminderSaving} size="sm">
                {t("settings.reminders.saveReminders")}
              </Button>
            </div>
          </Card>

          {/* Preview card */}
          {reminderEmailDays !== "null" && (
            <Card>
              <CardHeader title={t("settings.reminders.messagePreview")} icon={Mail} />
              <p className="text-sm text-slate-500 mb-4">{t("settings.reminders.messagePreviewDesc")}</p>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-blue-600 text-xs font-bold uppercase tracking-wider">Email</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 mb-1">
                  {reminderEmailDays === "0"
                    ? "Reminder: Your cleaning is TODAY"
                    : reminderEmailDays === "1"
                    ? "You've got a cleaning appointment scheduled for tomorrow"
                    : `Your cleaning appointment is in ${reminderEmailDays} days`}
                </p>
                <p className="text-xs text-slate-500">
                  Your cleaning is scheduled {reminderEmailDays === "0" ? "TODAY" : reminderEmailDays === "1" ? "tomorrow at 09:00 AM" : `in ${reminderEmailDays} days at 09:00 AM`}. Contact us to cancel or reschedule.
                </p>
              </div>
            </Card>
          )}

          {/* Test send card */}
          <Card>
            <CardHeader title={t("settings.reminders.sendTest")} icon={Zap} />
            <p className="text-sm text-slate-500 mb-4">
              {t("settings.reminders.sendTestDesc")}
            </p>
            {reminderTestSent ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
                <CheckCircle className="w-4 h-4" /> {t("settings.reminders.testSent")}
              </div>
            ) : (
              <Button
                icon={Zap}
                variant="secondary"
                size="sm"
                onClick={handleTestReminder}
                loading={reminderTestSending}
              >
                {t("settings.reminders.sendTestBtn")}
              </Button>
            )}
          </Card>

          {/* Team Notifications section */}
          <Card>
            <CardHeader title={t("settings.reminders.cleanerNotifications")} icon={Bell} />
            <p className="text-sm text-slate-500 mb-5">
              {t("settings.reminders.cleanerNotificationsDesc")}
            </p>

            {/* Master toggle */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">{t("settings.reminders.notifyCleaners")}</p>
                <p className="text-xs text-slate-400">{t("settings.reminders.notifyCleanersDesc")}</p>
              </div>
              <button
                onClick={() => setCleanerEnabled(!cleanerEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${cleanerEnabled ? "bg-primary-500" : "bg-slate-200"}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${cleanerEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            {cleanerEnabled ? (
              <div className="space-y-4 pl-0">
                {/* Email sub-toggle */}
                <div className="flex items-center justify-between py-2.5 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-slate-700">{t("settings.reminders.sendEmailNotifications")}</span>
                  </div>
                  <button
                    onClick={() => setCleanerEmail(!cleanerEmail)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${cleanerEmail ? "bg-blue-500" : "bg-slate-200"}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${cleanerEmail ? "translate-x-4" : "translate-x-1"}`} />
                  </button>
                </div>

                {/* Timing */}
                <div className="py-2.5 border-t border-slate-100">
                  <p className="text-sm font-medium text-slate-700 mb-2">{t("settings.reminders.notifyCleanersWhen")}</p>
                  <select
                    value={cleanerTiming}
                    onChange={(e) => setCleanerTiming(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
                  >
                    <option value="assign">{t("settings.reminders.timingAssign")}</option>
                    <option value="day_before">{t("settings.reminders.timingDayBefore")}</option>
                    <option value="both">{t("settings.reminders.timingBoth")}</option>
                  </select>
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex items-center gap-3">
              <Button icon={Save} onClick={handleSaveCleanerNotifications} loading={cleanerSaving} size="sm">
                {t("settings.reminders.saveCleanerSettings")}
              </Button>
            </div>
          </Card>

          {/* Team member list */}
          {teamMembers.length > 0 ? (
            <Card>
              <CardHeader title={t("settings.reminders.teamMemberNotifications")} icon={Bell} />
              <p className="text-sm text-slate-500 mb-4">{t("settings.reminders.teamMemberNotificationsDesc")}</p>
              <div className="space-y-3">
                {teamMembers.map((emp: any) => (
                  <div key={emp.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: emp.color || "#6366f1" }}
                      >
                        {(emp.name || "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          {emp.phone ? <span>{emp.phone}</span> : null}
                          {emp.email ? <span>{emp.email}</span> : (
                            <span className="text-amber-600 font-medium">{t("settings.reminders.noEmailOnFile")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestCleanerNotification(emp.id)}
                      loading={cleanerTestSending}
                    >
                      {t("settings.reminders.sendTest")}
                    </Button>
                  </div>
                ))}
              </div>
              {cleanerTestSent ? (
                <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
                  <CheckCircle className="w-4 h-4" /> {t("settings.reminders.teamTestSent")}
                </div>
              ) : null}
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === "reviews" ? (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader title={t("settings.reviews.googleReviews")} icon={Star} />
            <p className="text-sm text-slate-500 mb-4">
              {t("settings.reviews.googleReviewsDesc")}
            </p>
            <div className="space-y-4">
              <Input
                label={t("settings.reviews.googleReviewUrl")}
                value={growthForm.googleReviewLink}
                onChange={(e) => setGrowthForm((p) => ({ ...p, googleReviewLink: e.target.value }))}
                placeholder="https://g.page/r/your-business/review"
                helper={t("settings.reviews.googleReviewUrlHelper")}
              />
              <SettingRow label={t("settings.reviews.includeOnPdf")} description={t("settings.reviews.includeOnPdfDesc")}>
                <Toggle
                  checked={growthForm.includeReviewOnPdf}
                  onChange={(v) => setGrowthForm((p) => ({ ...p, includeReviewOnPdf: v }))}
                />
              </SettingRow>
              <SettingRow label={t("settings.reviews.includeInMessages")} description={t("settings.reviews.includeInMessagesDesc")}>
                <Toggle
                  checked={growthForm.includeReviewInMessages}
                  onChange={(v) => setGrowthForm((p) => ({ ...p, includeReviewInMessages: v }))}
                />
              </SettingRow>
              <SettingRow label={t("settings.reviews.askAfterJob")} description={t("settings.reviews.askAfterJobDesc")}>
                <Toggle
                  checked={growthForm.askReviewAfterComplete}
                  onChange={(v) => setGrowthForm((p) => ({ ...p, askReviewAfterComplete: v }))}
                />
              </SettingRow>
            </div>
          </Card>

          <Card>
            <CardHeader title={t("settings.reviews.referralProgram")} icon={Gift} />
            <p className="text-sm text-slate-500 mb-4">
              {t("settings.reviews.referralProgramDesc")}
            </p>
            <div className="space-y-4">
              <Input
                label={t("settings.reviews.referralOfferAmount")}
                type="number"
                value={growthForm.referralOfferAmount}
                onChange={(e) => setGrowthForm((p) => ({ ...p, referralOfferAmount: Number(e.target.value) }))}
                helper={t("settings.reviews.referralOfferAmountHelper")}
              />
              <Input
                label={t("settings.reviews.referralBookingLink")}
                value={growthForm.referralBookingLink}
                onChange={(e) => setGrowthForm((p) => ({ ...p, referralBookingLink: e.target.value }))}
                placeholder="https://your-booking-link.com"
                helper={t("settings.reviews.referralBookingLinkHelper")}
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
              {t("settings.reviews.saveReviewSettings")}
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "features" ? (
        <div className="max-w-2xl space-y-6">

          {/* Customer Portal */}
          <Card>
            <CardHeader title={t("settings.features.customerPortal")} icon={Home} />
            <p className="text-sm text-slate-500 mb-4">
              {t("settings.features.customerPortalDesc")}
            </p>

            {/* Stats row */}
            {portalStats && (
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: t("settings.features.activePortals"), value: portalStats.totalPortals },
                  { label: t("settings.features.viewedThisMonth"), value: portalStats.viewedThisMonth },
                  { label: t("settings.features.totalViews"), value: portalStats.viewedPortals },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
                    <p className="text-2xl font-bold text-primary-600">{s.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4">
              {/* Toggle */}
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-800">{t("settings.features.enablePortals")}</p>
                  <p className="text-xs text-slate-500">{t("settings.features.enablePortalsDesc")}</p>
                </div>
                <Toggle checked={portalEnabled} onChange={setPortalEnabled} />
              </div>

              {/* Brand color */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("settings.features.portalAccentColor")}</label>
                <p className="text-xs text-slate-500 mb-2">{t("settings.features.portalAccentColorDesc")}</p>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={portalColor || "#2563EB"}
                    onChange={(e) => setPortalColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <Input
                    value={portalColor}
                    onChange={(e) => setPortalColor(e.target.value)}
                    placeholder="#2563EB"
                    className="max-w-xs"
                  />
                </div>
              </div>

              {/* Welcome message */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("settings.features.welcomeMessage")}</label>
                <p className="text-xs text-slate-500 mb-2">{t("settings.features.welcomeMessageDesc")}</p>
                <textarea
                  value={portalWelcomeMessage}
                  onChange={(e) => setPortalWelcomeMessage(e.target.value)}
                  placeholder="Thanks for trusting us with your home! We look forward to your visit."
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-primary-300 text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {t("settings.features.shareLinksHint")}
                </p>
                <Button
                  icon={Save}
                  onClick={() => savePortalSettings.mutate()}
                  disabled={savePortalSettings.isPending}
                  size="sm"
                >
                  {saved && savedSection === "portal" ? t("common.saved") : t("settings.features.savePortalSettings")}
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title={t("settings.features.featuresTitle")} icon={Sliders} />
            <p className="text-sm text-slate-500 mb-4">
              {t("settings.features.featuresTitleDesc")}
            </p>
            <div className="space-y-1">
              <SettingRow
                label={t("settings.features.enableCommercial")}
                description={t("settings.features.enableCommercialDesc")}
              >
                <Toggle
                  checked={commercialEnabled}
                  onChange={(v) => setCommercialEnabled(v)}
                />
              </SettingRow>
            </div>
          </Card>

          <Card>
            <CardHeader title={t("settings.features.languageCurrency")} icon={Globe} />
            <p className="text-sm text-slate-500 mb-4">
              {t("settings.features.languageCurrencyDesc")}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("settings.features.appLanguage")}</label>
                <p className="text-xs text-slate-500 mb-2">
                  {t("settings.features.appLanguageDesc")}
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
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("settings.features.commLanguage")}</label>
                <p className="text-xs text-slate-500 mb-2">{t("settings.features.commLanguageDesc")}</p>
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
              <Divider />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("settings.features.currency")}</label>
                <p className="text-xs text-slate-500 mb-2">{t("settings.features.currencyDesc")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        setCurrency(c.code);
                        apiPut<{ currency: string }>("/api/settings/language", { currency: c.code }).then((res) => {
                          if (res?.currency) setCurrency(res.currency as SupportedCurrency);
                          showSaved("features");
                        });
                      }}
                      className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all border text-left flex items-center gap-2 ${
                        currency === c.code
                          ? "bg-primary-50 text-primary-700 border-primary-200"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-base font-bold w-8 text-center">{c.symbol}</span>
                      <span>{c.label}</span>
                      {currency === c.code ? (
                        <CheckCircle className="w-3.5 h-3.5 ml-auto text-primary-600" />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "booking" ? (
        <div className="max-w-2xl space-y-6">
          {!isPro && !isGrowth ? (
            <div className="px-4 py-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <Calendar className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">{t("settings.booking.planRequired")}</p>
                <p className="text-sm text-amber-700 mt-0.5">{t("settings.booking.planRequiredDesc")}</p>
                <Button size="sm" className="mt-3" onClick={() => startCheckout("growth")}>{t("settings.booking.upgradeToGrowth")}</Button>
              </div>
            </div>
          ) : null}
          <Card>
            <CardHeader title={t("settings.booking.selfBooking")} icon={Calendar} />
            <p className="text-sm text-slate-500 mb-4">
              {t("settings.booking.selfBookingDesc")}
            </p>
            {bookingLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                {t("common.loading")}
              </div>
            ) : (
              <SettingRow label={t("settings.booking.enableSelfBooking")} description={t("settings.booking.enableSelfBookingDesc")}>
                <Toggle
                  checked={bookingForm.enabled}
                  onChange={(v) => {
                    if (!isPro && !isGrowth) return;
                    setBookingForm((f) => ({ ...f, enabled: v }));
                  }}
                />
              </SettingRow>
            )}
          </Card>

          <Card>
            <CardHeader title={t("settings.booking.availableDays")} icon={Calendar} />
            <p className="text-sm text-slate-500 mb-4">{t("settings.booking.availableDaysDesc")}</p>
            <div className="flex flex-wrap gap-2">
              {DAY_NAMES.map((name, idx) => {
                const selected = bookingForm.allowedDays.includes(idx);
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setBookingForm((f) => ({
                        ...f,
                        allowedDays: selected
                          ? f.allowedDays.filter((d) => d !== idx)
                          : [...f.allowedDays, idx].sort((a, b) => a - b),
                      }));
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      selected
                        ? "bg-primary-50 text-primary-700 border-primary-300"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title={t("settings.booking.timeWindows")} icon={Clock} />
            <p className="text-sm text-slate-500 mb-4">{t("settings.booking.timeWindowsDesc")}</p>
            <div className="space-y-3">
              {bookingForm.timeWindows.map((win, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">{t("settings.booking.start")}</label>
                      <Input
                        type="time"
                        value={win.start}
                        onChange={(e) => {
                          const updated = [...bookingForm.timeWindows];
                          updated[idx] = { ...updated[idx], start: e.target.value };
                          setBookingForm((f) => ({ ...f, timeWindows: updated }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">{t("settings.booking.end")}</label>
                      <Input
                        type="time"
                        value={win.end}
                        onChange={(e) => {
                          const updated = [...bookingForm.timeWindows];
                          updated[idx] = { ...updated[idx], end: e.target.value };
                          setBookingForm((f) => ({ ...f, timeWindows: updated }));
                        }}
                      />
                    </div>
                  </div>
                  {bookingForm.timeWindows.length > 1 ? (
                    <button
                      onClick={() => setBookingForm((f) => ({ ...f, timeWindows: f.timeWindows.filter((_, i) => i !== idx) }))}
                      className="text-red-400 hover:text-red-600 transition-colors mt-4 text-lg"
                      title={t("common.remove")}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              ))}
              <button
                onClick={() => setBookingForm((f) => ({ ...f, timeWindows: [...f.timeWindows, { start: "08:00", end: "17:00" }] }))}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 mt-1"
              >
                <Plus size={14} /> {t("settings.booking.addTimeWindow")}
              </button>
            </div>

            <Divider />

            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("settings.booking.slotDuration")}</label>
                <p className="text-xs text-slate-400 mb-2">{t("settings.booking.slotDurationDesc")}</p>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  step={0.5}
                  value={bookingForm.slotDurationHours}
                  onChange={(e) => setBookingForm((f) => ({ ...f, slotDurationHours: parseFloat(e.target.value) || 3 }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("settings.booking.slotInterval")}</label>
                <p className="text-xs text-slate-400 mb-2">{t("settings.booking.slotIntervalDesc")}</p>
                <Input
                  type="number"
                  min={0.5}
                  max={12}
                  step={0.5}
                  value={bookingForm.slotIntervalHours}
                  onChange={(e) => setBookingForm((f) => ({ ...f, slotIntervalHours: parseFloat(e.target.value) || 2 }))}
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title={t("settings.booking.bookingRules")} icon={Settings} />
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("settings.booking.minNotice")}</label>
                <p className="text-xs text-slate-400 mb-2">{t("settings.booking.minNoticeDesc")}</p>
                <Input
                  type="number"
                  min={1}
                  max={168}
                  value={bookingForm.minNoticeHours}
                  onChange={(e) => setBookingForm((f) => ({ ...f, minNoticeHours: parseInt(e.target.value) || 24 }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("settings.booking.maxPerDay")}</label>
                <p className="text-xs text-slate-400 mb-2">{t("settings.booking.maxPerDayDesc")}</p>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={bookingForm.maxJobsPerDay}
                  onChange={(e) => setBookingForm((f) => ({ ...f, maxJobsPerDay: parseInt(e.target.value) || 4 }))}
                />
              </div>

              <Divider />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("settings.booking.blackoutDates")}</label>
                <p className="text-xs text-slate-400 mb-2">{t("settings.booking.blackoutDatesDesc")}</p>
                <div className="flex gap-2 mb-2">
                  <Input
                    type="date"
                    value={newBlackout}
                    onChange={(e) => setNewBlackout(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (newBlackout && !bookingForm.blackoutDates.includes(newBlackout)) {
                        setBookingForm((f) => ({ ...f, blackoutDates: [...f.blackoutDates, newBlackout].sort() }));
                        setNewBlackout("");
                      }
                    }}
                  >
                    <Plus size={14} /> Add
                  </Button>
                </div>
                {bookingForm.blackoutDates.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {bookingForm.blackoutDates.map((date) => (
                      <span
                        key={date}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-full text-sm text-slate-600"
                      >
                        {new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        <button
                          onClick={() => setBookingForm((f) => ({ ...f, blackoutDates: f.blackoutDates.filter((d) => d !== date) }))}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">{t("settings.booking.noBlackoutDates")}</p>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title={t("settings.booking.customerMessaging")} icon={Mail} />
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("settings.booking.confirmationMessage")}</label>
                <p className="text-xs text-slate-400 mb-2">{t("settings.booking.confirmationMessageDesc")}</p>
                <Textarea
                  value={bookingForm.confirmationMessage}
                  onChange={(e) => setBookingForm((f) => ({ ...f, confirmationMessage: e.target.value }))}
                  placeholder="We look forward to seeing you! If you need to reschedule, please contact us..."
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t("settings.booking.serviceAreaNotes")}</label>
                <p className="text-xs text-slate-400 mb-2">{t("settings.booking.serviceAreaNotesDesc")}</p>
                <Input
                  value={bookingForm.serviceAreaNotes}
                  onChange={(e) => setBookingForm((f) => ({ ...f, serviceAreaNotes: e.target.value }))}
                  placeholder="We service Denver, Aurora, Lakewood, and surrounding areas"
                />
              </div>
            </div>
          </Card>

          {/* Chat Widget */}
          <Card>
            <CardHeader title="AI Chat Widget" icon={MessageSquare} />
            <p className="text-sm text-slate-500 mb-4">
              Add a chat assistant to your public quote page. It answers questions, gives price estimates, and captures leads automatically.
            </p>
            <div className="space-y-4">
              <SettingRow label="Enable chat widget" description="Show the chat bubble on your public quote request page">
                <Toggle
                  checked={chatWidgetForm.enabled}
                  onChange={(v) => setChatWidgetForm((f) => ({ ...f, enabled: v }))}
                />
              </SettingRow>
              {chatWidgetForm.enabled && (
                <SettingRow label="Widget accent color" description="Match your brand color (defaults to your primary color)">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={chatWidgetForm.color || (business as any)?.primaryColor || "#0F6E56"}
                      onChange={(e) => setChatWidgetForm((f) => ({ ...f, color: e.target.value }))}
                      style={{ width: 40, height: 36, padding: 2, border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer" }}
                    />
                    <span className="text-sm text-slate-500">{chatWidgetForm.color || (business as any)?.primaryColor || "#0F6E56"}</span>
                    {chatWidgetForm.color && (
                      <button
                        className="text-xs text-slate-400 hover:text-slate-600 underline"
                        onClick={() => setChatWidgetForm((f) => ({ ...f, color: "" }))}
                      >
                        Reset to primary
                      </button>
                    )}
                  </div>
                </SettingRow>
              )}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button
                size="sm"
                onClick={() => saveChatWidget.mutate({ enabled: chatWidgetForm.enabled, color: chatWidgetForm.color || null })}
                disabled={saveChatWidget.isPending}
              >
                {saveChatWidget.isPending ? "Saving..." : <><Save size={13} /> Save widget settings</>}
              </Button>
              {savedSection === "chatWidget" && (
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle size={14} /> Saved
                </span>
              )}
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={() => saveBooking.mutate(bookingForm)}
              disabled={saveBooking.isPending}
            >
              {saveBooking.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2"><Save size={14} /> {t("settings.booking.saveBookingSettings")}</span>
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "integrations" ? (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader title={t("settings.integrations.paymentAccounting")} icon={CreditCard} />
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
              beta
            />
          </Card>
          <Card>
            <CardHeader title={t("settings.integrations.operationsScheduling")} icon={Calendar} />
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
            <IntegrationCard
              name="Google Business Profile"
              description="Auto-create draft quotes from reviews and Q&A on your Google listing"
              icon={MapPin}
              statusUrl="/api/gbp/status"
              connectUrl="/api/gbp/connect"
              connectMethod="GET"
              disconnectUrl="/api/gbp/disconnect"
              disconnectMethod="DELETE"
              color="blue"
            />
          </Card>
          <Card className="bg-slate-50 border-dashed border-slate-300">
            <div className="text-center py-6">
              <p className="text-sm text-slate-500 mb-1">{t("settings.integrations.comingSoon")}</p>
              <p className="text-xs text-slate-400">{t("settings.integrations.comingSoonDesc")}</p>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "tips" ? (
        <div className="max-w-2xl space-y-6">
          {tipsSaved ? (
            <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 animate-scale-in">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">{t("settings.tips.tipsSaved")}</span>
            </div>
          ) : null}

          <Card>
            <CardHeader title={t("settings.tips.automatedTips")} icon={Gift} />
            <p className="text-sm text-slate-500 mb-4">
              {t("settings.tips.automatedTipsDesc")}
            </p>

            <div className="flex items-center justify-between py-3 border-b border-slate-100 mb-4">
              <div>
                <p className="text-sm font-medium text-slate-800">{t("settings.tips.enableTips")}</p>
                <p className="text-xs text-slate-500 mt-0.5">{t("settings.tips.enableTipsDesc")}</p>
              </div>
              <Toggle
                checked={tipsForm.tipsEnabled}
                onChange={(v) => setTipsForm((f) => ({ ...f, tipsEnabled: v }))}
              />
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-slate-700 mb-2">{t("settings.tips.suggestedPercentages")}</p>
              <p className="text-xs text-slate-500 mb-3">{t("settings.tips.suggestedPercentagesDesc")}</p>
              <div className="flex flex-wrap gap-2">
                {[10, 15, 18, 20, 22, 25, 30].map((pct) => {
                  const isSelected = tipsForm.tipPercentageOptions.includes(pct);
                  return (
                    <button
                      key={pct}
                      onClick={() => setTipsForm((f) => ({
                        ...f,
                        tipPercentageOptions: isSelected
                          ? f.tipPercentageOptions.filter((p) => p !== pct)
                          : [...f.tipPercentageOptions, pct].sort((a, b) => a - b),
                      }))}
                      className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                        isSelected
                          ? "border-amber-500 bg-amber-50 text-amber-700"
                          : "border-slate-200 text-slate-500 hover:border-amber-300"
                      }`}
                    >
                      {pct}%
                    </button>
                  );
                })}
              </div>
              {tipsForm.tipPercentageOptions.length === 0 ? (
                <p className="text-xs text-red-500 mt-1">{t("settings.tips.selectAtLeastOne")}</p>
              ) : null}
            </div>

            <div className="mb-5">
              <p className="text-sm font-medium text-slate-700 mb-2">{t("settings.tips.sendTipRequest")}</p>
              <Select
                value={String(tipsForm.tipRequestDelay)}
                onChange={(e) => setTipsForm((f) => ({ ...f, tipRequestDelay: Number((e.target as HTMLSelectElement).value) }))}
                options={[
                  { value: "1", label: t("settings.tips.tipDelayOptions.1h") },
                  { value: "2", label: t("settings.tips.tipDelayOptions.2h") },
                  { value: "4", label: t("settings.tips.tipDelayOptions.4h") },
                  { value: "8", label: t("settings.tips.tipDelayOptions.8h") },
                  { value: "24", label: t("settings.tips.tipDelayOptions.24h") },
                ]}
              />
            </div>

            <Button variant="primary" icon={Save} onClick={saveTipSettings}>
              {t("settings.tips.saveTipSettings")}
            </Button>
          </Card>

          <Card>
            <CardHeader title={t("settings.tips.tipHistory")} icon={DollarSign} />
            {tipHistory.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Gift className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm">{t("settings.tips.noTipsYet")}</p>
                <p className="text-slate-400 text-xs mt-1">{t("settings.tips.tipsWillAppear")}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {tipHistory.slice(0, 20).map((tip: any) => (
                  <div key={tip.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {tip.first_name ? `${tip.first_name} ${tip.last_name || ""}`.trim() : "Anonymous"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {tip.job_type || "Cleaning"} &middot; {tip.paid_at
                          ? new Date(tip.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                          : new Date(tip.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-700">
                        ${parseFloat(tip.amount).toFixed(2)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        tip.status === "paid"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {tip.status === "paid" ? t("common.paid") : t("common.pending")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {tab === "referrals" ? (
        <ReferralTab />
      ) : null}

      {tab === "developer" ? (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader title={t("settings.developer.apiKeys")} icon={Key} />
            <p className="text-sm text-slate-500 mb-4">
              {t("settings.developer.apiKeysDesc")}
            </p>
            {apiKeys.length === 0 ? (
              <p className="text-sm text-slate-400 py-4">{t("settings.developer.noApiKeys")}</p>
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
              {t("settings.developer.generateApiKey")}
            </Button>
          </Card>

          <Card>
            <CardHeader title={t("settings.developer.webhooks")} icon={Webhook} />
            <p className="text-sm text-slate-500">
              {t("settings.developer.webhooksDesc")}
            </p>
          </Card>
        </div>
      ) : null}

    </div>
  );
}
