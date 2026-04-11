import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiPut, apiDelete, apiPost } from "../lib/api";
import { buildAddress, parseAddress } from "../lib/address";
import { SUPPORTED_LANGUAGES } from "../lib/i18n";
import { queryClient } from "../lib/queryClient";
import {
  Save,
  Trash2,
  Star,
  FileText,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  MessageSquare,
  BanIcon,
  Shield,
  Link2,
  Copy,
  Check,
} from "lucide-react";
import { useState, useEffect } from "react";
import DispatchCard from "../components/DispatchCard";
import {
  PageHeader,
  Card,
  CardHeader,
  Badge,
  Button,
  Input,
  ConfirmModal,
  Spinner,
  EmptyState,
} from "../components/ui";

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [portalLinkOpen, setPortalLinkOpen] = useState(false);
  const [portalUrl, setPortalUrl] = useState("");
  const [portalSmsSent, setPortalSmsSent] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const { data: customer, isLoading } = useQuery<any>({
    queryKey: [`/api/customers/${id}`],
  });
  const { data: quotes = [] } = useQuery<any[]>({ queryKey: ["/api/quotes"] });
  const { data: jobs = [] } = useQuery<any[]>({ queryKey: ["/api/jobs"] });
  const { data: marketingPrefs } = useQuery<any>({
    queryKey: [`/api/customers/${id}/marketing-prefs`],
    enabled: !!customer,
  });

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    preferredLanguage: "" as string,
  });

  useEffect(() => {
    if (customer) {
      const addr = parseAddress(customer.address || "");
      setForm({
        firstName: customer.firstName || "",
        lastName: customer.lastName || "",
        email: customer.email || "",
        phone: customer.phone || "",
        street: addr.street,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
        country: addr.country,
        preferredLanguage: customer.preferredLanguage || "",
      });
    }
  }, [customer]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiPut(`/api/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete(`/api/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      navigate("/customers");
    },
  });

  const vipMutation = useMutation({
    mutationFn: () =>
      apiPut(`/api/customers/${id}`, { isVip: !customer?.isVip }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${id}`] });
    },
  });

  const dncMutation = useMutation({
    mutationFn: () =>
      apiPut(`/api/customers/${id}/do-not-contact`, {
        doNotContact: !customer?.doNotContact,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${id}`] });
    },
  });

  const portalLinkMutation = useMutation({
    mutationFn: () =>
      apiPost(`/api/portal/send-link`, { customerId: id }) as Promise<any>,
    onSuccess: (data: any) => {
      setPortalUrl(data.portalUrl || "");
      setPortalSmsSent(data.smsSent || false);
      setPortalLinkOpen(true);
    },
  });

  const copyPortalLink = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // fallback — select text in the field
    }
  };

  const generateMessage = async () => {
    setAiLoading(true);
    try {
      const res = await apiPost(`/api/ai/generate-message`, {
        context: "customer",
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerId: id,
      });
      setAiMessage((res as any).message || "");
    } catch {
      setAiMessage("Unable to generate message.");
    }
    setAiLoading(false);
  };

  const customerQuotes = quotes.filter((q: any) => q.customerId === id);
  const customerJobs = jobs.filter((j: any) => j.customerId === id);

  if (isLoading) return <Spinner />;

  if (!customer) {
    return (
      <EmptyState
        title="Customer not found"
        description="This customer may have been deleted"
        action={
          <Button variant="secondary" onClick={() => navigate("/customers")}>
            Back to customers
          </Button>
        }
      />
    );
  }

  const totalSpent = customerQuotes
    .filter((q: any) => q.status === "accepted")
    .reduce((sum: number, q: any) => sum + (Number(q.total) || 0), 0);

  return (
    <div>
      <PageHeader
        title={`${customer.firstName} ${customer.lastName}`}
        backTo="/customers"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={customer.isVip ? "secondary" : "ghost"}
              icon={Star}
              onClick={() => vipMutation.mutate()}
              size="sm"
              className={customer.isVip ? "border-amber-200 bg-amber-50 text-amber-700" : ""}
            >
              {customer.isVip ? "VIP" : "Set VIP"}
            </Button>
            <Button
              variant="secondary"
              icon={Link2}
              onClick={() => portalLinkMutation.mutate()}
              size="sm"
              disabled={portalLinkMutation.isPending}
            >
              {portalLinkMutation.isPending ? "Getting link..." : "Portal Link"}
            </Button>
            <Button
              icon={FileText}
              onClick={() => navigate("/quotes/new")}
              size="sm"
            >
              Create Quote
            </Button>
          </div>
        }
      />

      <div className="flex items-center gap-2 mb-6">
        {customer.isVip ? <Badge status="warning" label="VIP Customer" dot /> : null}
        {customer.doNotContact ? <Badge status="error" label="Do Not Contact" dot /> : null}
        {customer.status ? <Badge status={customer.status} dot /> : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Contact Information" icon={Mail} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First name"
                value={form.firstName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, firstName: e.target.value }))
                }
              />
              <Input
                label="Last name"
                value={form.lastName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, lastName: e.target.value }))
                }
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phone: e.target.value }))
                }
              />
              <div className="sm:col-span-2">
                <Input
                  label="Street"
                  value={form.street}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, street: e.target.value }))
                  }
                  placeholder="123 Main St"
                />
              </div>
              <Input
                label="City"
                value={form.city}
                onChange={(e) =>
                  setForm((p) => ({ ...p, city: e.target.value }))
                }
                placeholder="Springfield"
              />
              <Input
                label="State"
                value={form.state}
                onChange={(e) =>
                  setForm((p) => ({ ...p, state: e.target.value }))
                }
                placeholder="IL"
              />
              <Input
                label="Zip / Postal Code"
                value={form.zip}
                onChange={(e) =>
                  setForm((p) => ({ ...p, zip: e.target.value }))
                }
                placeholder="62701"
              />
              <Input
                label="Country"
                value={form.country}
                onChange={(e) =>
                  setForm((p) => ({ ...p, country: e.target.value }))
                }
                placeholder="US"
              />
            </div>
            {/* Preferred Language */}
            <div className="sm:col-span-2 mt-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                {t("language.customerLanguage")}
                <span className="text-slate-400 font-normal ml-1">({t("language.customerLanguageDesc")})</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, preferredLanguage: "" }))}
                  className="px-3 py-1.5 rounded-lg border text-xs transition-all"
                  style={{
                    borderColor: form.preferredLanguage === "" ? "#2563eb" : "rgba(0,0,0,0.1)",
                    background: form.preferredLanguage === "" ? "#eff6ff" : "transparent",
                    color: form.preferredLanguage === "" ? "#1d4ed8" : "#6b7280",
                    fontWeight: form.preferredLanguage === "" ? 600 : 400,
                  }}
                >
                  {t("language.noOverride")}
                </button>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, preferredLanguage: lang.code }))}
                    className="px-3 py-1.5 rounded-lg border text-xs transition-all"
                    style={{
                      borderColor: form.preferredLanguage === lang.code ? "#2563eb" : "rgba(0,0,0,0.1)",
                      background: form.preferredLanguage === lang.code ? "#eff6ff" : "transparent",
                      color: form.preferredLanguage === lang.code ? "#1d4ed8" : "#6b7280",
                      fontWeight: form.preferredLanguage === lang.code ? 600 : 400,
                    }}
                  >
                    {lang.nativeLabel}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5 pt-4 border-t border-slate-100 sm:col-span-2">
              <Button
                icon={Save}
                onClick={() => {
                  const { street, city, state, zip, country, ...rest } = form;
                  updateMutation.mutate({
                    ...rest,
                    address: buildAddress({ street, city, state, zip, country }),
                    preferredLanguage: rest.preferredLanguage || null,
                  });
                }}
                loading={updateMutation.isPending}
                size="sm"
              >
                {saved ? "Saved!" : "Save Changes"}
              </Button>
            </div>
          </Card>

          <Card padding={false}>
            <div className="px-5 lg:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Quotes</h2>
              <span className="text-xs text-slate-400">
                {customerQuotes.length} total
              </span>
            </div>
            {customerQuotes.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No quotes yet"
                description="Create a quote for this customer"
                action={
                  <Button
                    icon={FileText}
                    size="sm"
                    onClick={() => navigate("/quotes/new")}
                  >
                    Create Quote
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-right px-5 lg:px-6 py-3 text-xs font-medium text-slate-500 uppercase">
                        Total
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">
                        Status
                      </th>
                      <th className="text-right px-5 lg:px-6 py-3 text-xs font-medium text-slate-500 uppercase">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerQuotes.map((q: any) => (
                      <tr
                        key={q.id}
                        onClick={() => navigate(`/quotes/${q.id}`)}
                        className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="px-5 lg:px-6 py-3 text-right font-semibold text-slate-900">
                          ${Number(q.total || 0).toLocaleString()}
                        </td>
                        <td className="px-5 py-3">
                          <Badge status={q.status} dot />
                        </td>
                        <td className="px-5 lg:px-6 py-3 text-right text-slate-500">
                          {new Date(q.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {customerJobs.length > 0 ? (
            <Card padding={false}>
              <div className="px-5 lg:px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Jobs</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-5 lg:px-6 py-3 text-xs font-medium text-slate-500 uppercase">
                        Title
                      </th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">
                        Status
                      </th>
                      <th className="text-right px-5 lg:px-6 py-3 text-xs font-medium text-slate-500 uppercase">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerJobs.map((j: any) => (
                      <tr
                        key={j.id}
                        onClick={() => navigate(`/jobs`)}
                        className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-colors"
                      >
                        <td className="px-5 lg:px-6 py-3 font-medium text-slate-900">
                          {j.title || "Cleaning Job"}
                        </td>
                        <td className="px-5 py-3">
                          <Badge status={j.status} dot />
                        </td>
                        <td className="px-5 lg:px-6 py-3 text-right text-slate-500">
                          {j.scheduledDate
                            ? new Date(j.scheduledDate).toLocaleDateString()
                            : "Not scheduled"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Customer Summary" />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Quotes</span>
                <span className="font-medium text-slate-900">
                  {customerQuotes.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Spent</span>
                <span className="font-semibold text-emerald-600">
                  ${totalSpent.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jobs</span>
                <span className="font-medium text-slate-900">
                  {customerJobs.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer Since</span>
                <span className="font-medium text-slate-900">
                  {new Date(customer.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </Card>

          {customer.address ? (
            <DispatchCard
              data={{
                customerName: `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || undefined,
                address: customer.address,
                phone: customer.phone || undefined,
                email: customer.email || undefined,
                customerId: customer.id,
              }}
            />
          ) : null}

          <Card>
            <CardHeader title="Sales Assistant" icon={Sparkles} />
            <Button
              variant="secondary"
              icon={MessageSquare}
              onClick={generateMessage}
              loading={aiLoading}
              size="sm"
              className="w-full justify-start"
            >
              Draft Message
            </Button>
            {aiMessage ? (
              <div className="mt-3 bg-violet-50 rounded-lg p-3">
                <p className="text-sm text-violet-900 whitespace-pre-wrap">
                  {aiMessage}
                </p>
                <button
                  onClick={() => navigator.clipboard.writeText(aiMessage)}
                  className="text-xs text-violet-600 font-medium mt-2"
                >
                  Copy
                </button>
              </div>
            ) : null}
          </Card>

          <Card>
            <CardHeader title="Controls" icon={Shield} />
            <div className="space-y-2">
              <Button
                variant="ghost"
                icon={BanIcon}
                onClick={() => dncMutation.mutate()}
                size="sm"
                className={`w-full justify-start ${
                  customer.doNotContact
                    ? "text-red-600 bg-red-50"
                    : ""
                }`}
              >
                {customer.doNotContact
                  ? "Remove Do Not Contact"
                  : "Mark Do Not Contact"}
              </Button>
              <Button
                variant="ghost"
                icon={Trash2}
                onClick={() => setDeleteOpen(true)}
                size="sm"
                className="w-full justify-start text-red-600 hover:bg-red-50"
              >
                Delete Customer
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Customer"
        description="Are you sure you want to delete this customer? All associated data will be lost."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      />

      {/* Portal Link Modal */}
      {portalLinkOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setPortalLinkOpen(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Customer Portal Link</h3>
                <p className="text-xs text-slate-500">
                  {portalSmsSent
                    ? "Link sent via SMS to customer"
                    : "Copy and share this link with your customer"}
                </p>
              </div>
            </div>

            {portalSmsSent && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <p className="text-sm text-emerald-700">
                  SMS sent to {customer.firstName}'s phone number
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                <p className="text-sm text-slate-700 truncate font-mono">{portalUrl}</p>
              </div>
              <button
                onClick={copyPortalLink}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors flex-shrink-0"
              >
                {linkCopied ? (
                  <><Check className="w-4 h-4 text-emerald-500" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy</>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              This link gives {customer.firstName} access to their personal portal — upcoming cleans, photos, and preferences.
            </p>

            <button
              onClick={() => setPortalLinkOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
