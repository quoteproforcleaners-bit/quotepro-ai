import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { apiPut, apiPost, apiGet, apiDelete } from "../lib/api";
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
  Copy,
  Plus,
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
} from "../components/ui";

function IntegrationCard({
  name,
  description,
  icon: Icon,
  statusUrl,
  connectUrl,
  onConnect,
  onDisconnect,
}: {
  name: string;
  description: string;
  icon: any;
  statusUrl: string;
  connectUrl?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
}) {
  const { data, isLoading } = useQuery<any>({
    queryKey: [statusUrl],
    retry: false,
  });
  const connected = data?.connected || data?.status === "connected";

  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-slate-500" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-900">{name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Badge
            status={connected ? "accepted" : "draft"}
            label={connected ? "Connected" : "Not connected"}
            dot
          />
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, business, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("business");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [businessForm, setBusinessForm] = useState({
    companyName: "",
    phone: "",
    email: "",
    address: "",
  });
  const [saved, setSaved] = useState(false);

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

  const [pricingForm, setPricingForm] = useState({
    hourlyRate: 45,
    minimumTicket: 100,
    taxRate: 0,
  });

  useEffect(() => {
    if (business) {
      setBusinessForm({
        companyName: business.companyName || "",
        phone: business.phone || "",
        email: business.email || "",
        address: business.address || "",
      });
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

  const updateBusiness = useMutation({
    mutationFn: (data: any) => apiPut("/api/business", data),
    onSuccess: () => {
      refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const updatePricing = useMutation({
    mutationFn: (data: any) => apiPut("/api/pricing", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
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

  const settingsTabs = [
    "business",
    "pricing",
    "integrations",
    "account",
    "developer",
  ];

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your business and account" />

      <div className="mb-6">
        <Tabs tabs={settingsTabs} active={tab} onChange={setTab} />
      </div>

      {tab === "business" ? (
        <div className="max-w-2xl">
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
                  {saved ? "Saved!" : "Save Changes"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "pricing" ? (
        <div className="max-w-2xl space-y-6">
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
        </div>
      ) : null}

      {tab === "integrations" ? (
        <div className="max-w-2xl">
          <Card>
            <CardHeader title="Connected Services" icon={Link2} />
            <IntegrationCard
              name="Stripe"
              description="Accept online payments and process deposits"
              icon={CreditCard}
              statusUrl="/api/stripe/status"
            />
            <IntegrationCard
              name="QuickBooks Online"
              description="Auto-create invoices and sync financial data"
              icon={FileText}
              statusUrl="/api/integrations/qbo/status"
            />
            <IntegrationCard
              name="Jobber"
              description="Sync jobs, clients, and schedules"
              icon={Zap}
              statusUrl="/api/integrations/jobber/status"
            />
            <IntegrationCard
              name="Google Calendar"
              description="Sync jobs to your Google Calendar"
              icon={Calendar}
              statusUrl="/api/google-calendar/status"
            />
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
