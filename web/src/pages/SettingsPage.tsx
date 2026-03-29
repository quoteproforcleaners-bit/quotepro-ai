import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useSubscription } from "../lib/subscription";
import { apiPut, apiPost, apiGet, apiDelete, apiPatch } from "../lib/api";
import { CURRENCIES, type SupportedCurrency } from "../utils/currency";
import { queryClient } from "../lib/queryClient";
import {
  Building2,
  CreditCard,
  Link2,
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
  Upload,
  Trash2,
  Image,
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

function ReferralTab() {
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
        <CardHeader title="Your Referral Link" icon={Gift} />
        <p className="text-sm text-slate-500 mb-5">
          Share your referral link with other cleaning company owners. When they subscribe to any paid plan, you earn one free month of QuotePro.
        </p>

        {isLoading ? (
          <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-mono truncate">
              {referrals?.referralUrl || "Generating your link..."}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}

        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
          Your referral code: <strong>{referrals?.referralCode || "..."}</strong>
        </div>
      </Card>

      <Card>
        <CardHeader title="Referral Stats" icon={TrendingUp} />
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-xl">
            <p className="text-2xl font-bold text-slate-900">{referrals?.referredCount ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">Signed up</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-xl">
            <p className="text-2xl font-bold text-slate-900">{referrals?.paidReferrals ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">Converted to paid</p>
          </div>
          <div className="text-center p-4 bg-emerald-50 rounded-xl">
            <p className="text-2xl font-bold text-emerald-700">{referrals?.creditsEarned ?? 0}</p>
            <p className="text-xs text-slate-500 mt-1">Free months earned</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="How It Works" icon={Star} />
        <ol className="space-y-3">
          {[
            "Copy your unique referral link above",
            "Share it with other residential cleaning company owners",
            "They sign up and subscribe to any paid plan",
            "You automatically earn one free month of QuotePro",
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
  const { user, business, refresh } = useAuth();
  const { isPro, isGrowth, isStarter, tier, startCheckout, checkoutLoading } = useSubscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(() => searchParams.get("tab") || "business");
  const [saved, setSaved] = useState(false);
  const [savedSection, setSavedSection] = useState("");
  const [jobberJustConnected] = useState(() => searchParams.get("jobber") === "connected");

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
  const [reminderSmsDays, setReminderSmsDays] = useState<string>("1");
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderTestSending, setReminderTestSending] = useState(false);
  const [reminderTestSent, setReminderTestSent] = useState(false);

  const { data: reminderPrefs } = useQuery<any>({ queryKey: ["/api/reminder-preferences"] });

  useEffect(() => {
    if (!reminderPrefs) return;
    setReminderEmailDays(reminderPrefs.emailReminderDays === null ? "null" : String(reminderPrefs.emailReminderDays ?? 3));
    setReminderSmsDays(reminderPrefs.smsReminderDays === null ? "null" : String(reminderPrefs.smsReminderDays ?? 1));
  }, [reminderPrefs]);

  const handleSaveReminders = async () => {
    setReminderSaving(true);
    try {
      await apiPut("/api/reminder-preferences", {
        emailReminderDays: reminderEmailDays === "null" ? null : Number(reminderEmailDays),
        smsReminderDays: reminderSmsDays === "null" ? null : Number(reminderSmsDays),
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

  const handleSaveBranding = () => {
    updateBusiness.mutate({
      senderName: brandingForm.senderName || "",
      senderTitle: brandingForm.senderTitle || "",
      bookingLink: brandingForm.bookingLink || "",
      emailSignature: brandingForm.emailSignature || "",
      smsSignature: brandingForm.smsSignature || "",
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
    "reminders",
    "reviews",
    "features",
    "booking",
    "integrations",
    "referrals",
    "developer",
  ];

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your business, pricing, and integrations" />

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
                  label="Business Email"
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
                  <p className="font-semibold text-slate-800 text-sm">How Your Emails Are Sent</p>
                </div>
                <div className="p-4 space-y-3 text-sm text-slate-600 leading-relaxed">
                  <p>
                    When you send quotes, confirmations, or follow-ups, customers see your company name as the sender —
                    <strong className="text-slate-800"> {businessForm.companyName || "your company name"}</strong>.
                  </p>
                  <p>
                    Customer replies go directly to your business email:
                    {businessForm.email ? (
                      <strong className="text-slate-800"> {businessForm.email}</strong>
                    ) : (
                      <span className="text-amber-600 font-medium"> (add your email above so customers can reply to you)</span>
                    )}
                  </p>
                  <p className="text-slate-400 text-xs">
                    No extra setup needed — just keep your business name and email up to date above.
                  </p>
                </div>
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
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Residential Base Pricing</p>
                <p className="text-xs text-slate-500 mb-3">These values are used by Live Quote Preview and all residential quote calculations. Changes affect future quotes.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Price per 1,000 sq ft ($)"
                    type="number"
                    value={pricingForm.pricePerSqft}
                    onChange={(e) =>
                      setPricingForm((p) => ({ ...p, pricePerSqft: +e.target.value }))
                    }
                  />
                  <Input
                    label="Price per Bedroom ($)"
                    type="number"
                    value={pricingForm.pricePerBedroom}
                    onChange={(e) =>
                      setPricingForm((p) => ({ ...p, pricePerBedroom: +e.target.value }))
                    }
                  />
                  <Input
                    label="Price per Bathroom ($)"
                    type="number"
                    value={pricingForm.pricePerBathroom}
                    onChange={(e) =>
                      setPricingForm((p) => ({ ...p, pricePerBathroom: +e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Other Pricing</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Hourly Rate — Pets & Estimates ($)"
                    type="number"
                    value={pricingForm.hourlyRate}
                    onChange={(e) =>
                      setPricingForm((p) => ({ ...p, hourlyRate: +e.target.value }))
                    }
                  />
                  <Input
                    label="Minimum Job Price ($)"
                    type="number"
                    value={pricingForm.minimumTicket}
                    onChange={(e) =>
                      setPricingForm((p) => ({ ...p, minimumTicket: +e.target.value }))
                    }
                  />
                  <Input
                    label="Tax Rate (%)"
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
                Save Add-on Prices
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "branding" ? (
        <div className="max-w-2xl space-y-6">
          {/* ─── Business Logo ─── */}
          <Card>
            <CardHeader title="Business Logo" icon={Image} />
            <p className="text-sm text-slate-500 mb-5">
              Your logo appears on customer-facing quotes when the "Show Logo" toggle is enabled in Quote Preferences.
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
                  <p className="text-sm font-medium text-slate-700">Current logo</p>
                  <button
                    onClick={() => uploadLogo(null)}
                    disabled={logoUploading}
                    className="mt-1 flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={12} />
                    Remove logo
                  </button>
                </div>
              </div>
            ) : null}

            {/* Preset icons */}
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Preset cleaning icons
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
              Upload your own logo
            </p>
            <label
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors ${logoUploading ? "opacity-50 pointer-events-none" : ""}`}
            >
              <Upload size={16} />
              {logoUploading ? "Uploading…" : "Choose image (PNG, JPG, SVG)"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                className="sr-only"
                onChange={handleLogoFileChange}
                disabled={logoUploading}
              />
            </label>
            <p className="mt-2 text-xs text-slate-400">Max recommended size: 400×400 px</p>
          </Card>

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

      {tab === "reminders" ? (
        <div className="max-w-2xl space-y-6">
          {/* Header card */}
          <Card>
            <CardHeader title="Automated Customer Reminders" icon={Bell} />
            <p className="text-sm text-slate-500 mb-6">
              Remind customers before their appointments automatically — reducing no-shows and saving you hours of manual outreach.
            </p>

            {/* Email */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-semibold text-slate-800">Email Reminder</span>
              </div>
              <select
                value={reminderEmailDays}
                onChange={(e) => setReminderEmailDays(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">Email them one day before appointment</option>
                <option value="2">Email them two days before appointment</option>
                <option value="3">Email them three days before appointment</option>
                <option value="7">Email them one week before appointment</option>
                <option value="null">Don't send email reminders</option>
              </select>
            </div>

            {/* SMS */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-cyan-500" />
                <span className="text-sm font-semibold text-slate-800">SMS Reminder</span>
              </div>
              <select
                value={reminderSmsDays}
                onChange={(e) => setReminderSmsDays(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="0">Text them morning of appointment</option>
                <option value="1">Text them one day before appointment</option>
                <option value="2">Text them two days before appointment</option>
                <option value="3">Text them three days before appointment</option>
                <option value="null">Don't send text reminders</option>
              </select>
              <p className="text-xs text-slate-400 mt-1.5">SMS is never sent between 9 PM and 8 AM.</p>
            </div>

            <div className="flex items-center gap-3">
              <Button icon={Save} onClick={handleSaveReminders} loading={reminderSaving} size="sm">
                Save Reminder Settings
              </Button>
            </div>
          </Card>

          {/* Preview card */}
          {(reminderEmailDays !== "null" || reminderSmsDays !== "null") && (
            <Card>
              <CardHeader title="Message Preview" icon={MessageSquare} />
              <p className="text-sm text-slate-500 mb-4">This is what your customers will receive:</p>
              <div className="space-y-3">
                {reminderEmailDays !== "null" && (
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
                )}
                {reminderSmsDays !== "null" && (
                  <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-3.5 h-3.5 text-cyan-500" />
                      <span className="text-cyan-600 text-xs font-bold uppercase tracking-wider">Text</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">From: your business phone</p>
                    <p className="text-sm text-slate-700">
                      Hi [Customer]! Reminder: [Business] is cleaning your home {reminderSmsDays === "0" ? "TODAY" : reminderSmsDays === "1" ? "tomorrow" : `in ${reminderSmsDays} days`}{reminderSmsDays !== "0" ? " at 09:00 AM" : ""}. To reschedule call [Phone]. Reply STOP to opt out.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Test send card */}
          <Card>
            <CardHeader title="Send a Test" icon={Zap} />
            <p className="text-sm text-slate-500 mb-4">
              Send a test reminder to your own phone and email so you can see exactly what customers receive.
            </p>
            {reminderTestSent ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
                <CheckCircle className="w-4 h-4" /> Test sent! Check your phone and email.
              </div>
            ) : (
              <Button
                icon={Zap}
                variant="secondary"
                size="sm"
                onClick={handleTestReminder}
                loading={reminderTestSending}
              >
                Send me a test reminder
              </Button>
            )}
          </Card>
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
            <CardHeader title="Language & Currency" icon={Globe} />
            <p className="text-sm text-slate-500 mb-4">
              Choose the language and currency used across your account, quotes, and customer communications.
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
              <Divider />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                <p className="text-xs text-slate-500 mb-2">Used for all pricing displays, quotes, and revenue figures throughout the app</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        setCurrency(c.code);
                        apiPatch("/api/business", { currency: c.code }).then(() => {
                          refresh();
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
                <p className="text-sm font-semibold text-amber-800">Growth or Pro plan required</p>
                <p className="text-sm text-amber-700 mt-0.5">Self-booking lets accepted customers pick their own appointment time. Upgrade to enable it.</p>
                <Button size="sm" className="mt-3" onClick={() => startCheckout("growth")}>Upgrade to Growth</Button>
              </div>
            </div>
          ) : null}
          <Card>
            <CardHeader title="Self-Booking Portal" icon={Calendar} />
            <p className="text-sm text-slate-500 mb-4">
              When enabled, customers who accept a quote will see a calendar and can book their own appointment — no back-and-forth needed.
            </p>
            {bookingLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                Loading...
              </div>
            ) : (
              <SettingRow label="Enable self-booking" description="Customers can schedule their own appointment after accepting a quote">
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
            <CardHeader title="Available Days" icon={Calendar} />
            <p className="text-sm text-slate-500 mb-4">Which days of the week can customers book appointments?</p>
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
            <CardHeader title="Time Windows" icon={Clock} />
            <p className="text-sm text-slate-500 mb-4">Set the hours when appointments can be booked. You can add multiple windows per day.</p>
            <div className="space-y-3">
              {bookingForm.timeWindows.map((win, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Start</label>
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
                      <label className="block text-xs text-slate-500 mb-1">End</label>
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
                      title="Remove"
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
                <Plus size={14} /> Add time window
              </button>
            </div>

            <Divider />

            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slot duration (hrs)</label>
                <p className="text-xs text-slate-400 mb-2">How long is each job slot?</p>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Slot interval (hrs)</label>
                <p className="text-xs text-slate-400 mb-2">Gap between available start times</p>
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
            <CardHeader title="Booking Rules" icon={Settings} />
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Minimum notice (hours)</label>
                <p className="text-xs text-slate-400 mb-2">How far in advance must customers book?</p>
                <Input
                  type="number"
                  min={1}
                  max={168}
                  value={bookingForm.minNoticeHours}
                  onChange={(e) => setBookingForm((f) => ({ ...f, minNoticeHours: parseInt(e.target.value) || 24 }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max bookings per day</label>
                <p className="text-xs text-slate-400 mb-2">Maximum number of jobs that can be scheduled on the same day</p>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Blackout dates</label>
                <p className="text-xs text-slate-400 mb-2">Dates when no bookings are available (holidays, vacations, etc.)</p>
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
                  <p className="text-xs text-slate-400 italic">No blackout dates set</p>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Customer Messaging" icon={MessageSquare} />
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmation message</label>
                <p className="text-xs text-slate-400 mb-2">Shown to customers after they book and included in the confirmation email</p>
                <Textarea
                  value={bookingForm.confirmationMessage}
                  onChange={(e) => setBookingForm((f) => ({ ...f, confirmationMessage: e.target.value }))}
                  placeholder="We look forward to seeing you! If you need to reschedule, please contact us..."
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Service area notes</label>
                <p className="text-xs text-slate-400 mb-2">Optional note shown on the booking page (e.g., "We service the Denver metro area")</p>
                <Input
                  value={bookingForm.serviceAreaNotes}
                  onChange={(e) => setBookingForm((f) => ({ ...f, serviceAreaNotes: e.target.value }))}
                  placeholder="We service Denver, Aurora, Lakewood, and surrounding areas"
                />
              </div>
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
                <span className="flex items-center gap-2"><Save size={14} /> Save Booking Settings</span>
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "integrations" ? (
        <div className="max-w-2xl space-y-6">
          {jobberJustConnected ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
              <CheckCircle size={16} className="text-emerald-600 shrink-0" />
              Jobber connected successfully — your quotes will now sync as jobs.
            </div>
          ) : null}
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
              beta
            />
          </Card>
          <Card>
            <CardHeader title="Jobber" icon={Zap} />
            <IntegrationCard
              name="Jobber"
              description="Sync accepted quotes directly to Jobber as scheduled jobs"
              icon={Zap}
              statusUrl="/api/integrations/jobber/status"
              connectUrl="/api/integrations/jobber/connect"
              disconnectUrl="/api/integrations/jobber/disconnect"
              disconnectMethod="POST"
              color="green"
              beta
            />
          </Card>
          <Card>
            <CardHeader title="Operations & Scheduling" icon={Calendar} />
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

      {tab === "referrals" ? (
        <ReferralTab />
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

    </div>
  );
}
