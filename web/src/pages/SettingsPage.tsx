import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import { apiPut, apiPost, apiGet } from "../lib/api";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function IntegrationCard({
  name,
  description,
  statusUrl,
}: {
  name: string;
  description: string;
  statusUrl: string;
}) {
  const { data, isLoading } = useQuery<any>({
    queryKey: [statusUrl],
    retry: false,
  });

  const connected = data?.connected || data?.status === "connected";

  return (
    <div className="flex items-center justify-between py-3.5 border-b border-slate-100 last:border-0">
      <div>
        <h3 className="text-sm font-medium text-slate-900">{name}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      ) : (
        <span
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
            connected
              ? "bg-green-50 text-green-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {connected ? (
            <><CheckCircle className="w-3 h-3" /> Connected</>
          ) : (
            <><XCircle className="w-3 h-3" /> Not connected</>
          )}
        </span>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { user, business, logout, refresh } = useAuth();
  const navigate = useNavigate();

  const [businessForm, setBusinessForm] = useState({
    companyName: "",
    phone: "",
    email: "",
    address: "",
  });
  const [saved, setSaved] = useState(false);

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

  const updateBusiness = useMutation({
    mutationFn: (data: any) => apiPut("/api/business", data),
    onSuccess: () => {
      refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone.")) return;
    if (!confirm("This is your final confirmation. All quotes, customers, jobs, and settings will be deleted forever. Continue?")) return;
    try {
      await apiPost("/api/auth/delete-account", {});
      navigate("/login");
    } catch {}
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-slate-500" />
            <h2 className="font-semibold text-slate-900">Business Profile</h2>
          </div>
          <div className="space-y-3">
            {[
              { key: "companyName", label: "Company name" },
              { key: "phone", label: "Phone" },
              { key: "email", label: "Email", type: "email" },
              { key: "address", label: "Address" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                <input
                  type={f.type || "text"}
                  value={(businessForm as any)[f.key]}
                  onChange={(e) => setBusinessForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => updateBusiness.mutate(businessForm)}
                disabled={updateBusiness.isPending}
                className="flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                {updateBusiness.isPending ? "Saving..." : "Save"}
              </button>
              {saved && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Saved
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="w-5 h-5 text-slate-500" />
            <h2 className="font-semibold text-slate-900">Integrations</h2>
          </div>
          <div>
            <IntegrationCard
              name="Stripe"
              description="Accept online payments"
              statusUrl="/api/stripe/status"
            />
            <IntegrationCard
              name="QuickBooks"
              description="Auto-create invoices"
              statusUrl="/api/integrations/qbo/status"
            />
            <IntegrationCard
              name="Jobber"
              description="Sync jobs & clients"
              statusUrl="/api/integrations/jobber/status"
            />
            <IntegrationCard
              name="Google Calendar"
              description="Sync jobs to calendar"
              statusUrl="/api/google-calendar/status"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-slate-500" />
            <h2 className="font-semibold text-slate-900">Account</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Email</span>
              <span className="text-slate-900 font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Name</span>
              <span className="text-slate-900 font-medium">{user?.firstName} {user?.lastName}</span>
            </div>
            <div className="pt-3 space-y-2 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 h-9 px-3 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
              <button
                onClick={handleDeleteAccount}
                className="w-full flex items-center gap-2 h-9 px-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
