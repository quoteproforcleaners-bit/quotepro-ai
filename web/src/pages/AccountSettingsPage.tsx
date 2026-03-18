import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Zap,
  LogOut,
  Trash2,
  ExternalLink,
  User,
} from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  Badge,
  ConfirmModal,
} from "../components/ui";
import { useAuth } from "../lib/auth";
import { useSubscription } from "../lib/subscription";
import { useWebAIConsent } from "../lib/webAIConsent";
import { apiPost } from "../lib/api";

export default function AccountSettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isPro, isGrowth, isStarter, tier, openPortal } = useSubscription();
  const { hasAIConsent, consentData, revokeAIConsent, requestAIConsent } = useWebAIConsent();

  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleManageSubscription = async () => {
    setPortalError(null);
    setPortalLoading(true);
    try {
      await openPortal();
    } catch (err: any) {
      const msg: string = err?.message || "";
      if (msg.includes("No billing account")) {
        setPortalError(
          "Your subscription is managed through the App Store. On your iPhone, go to Settings → your name → Subscriptions to make changes."
        );
      } else {
        setPortalError(
          "Could not open the billing portal. Please try again or contact support."
        );
      }
    } finally {
      setPortalLoading(false);
    }
  };

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

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Account"
        subtitle="Manage your account details, subscription, and privacy settings"
      />

      {/* Account Details */}
      <Card>
        <CardHeader title="Account Details" icon={User} />
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2.5 border-b border-slate-100">
            <span className="text-slate-500">Email</span>
            <span className="text-slate-900 font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between py-2.5">
            <span className="text-slate-500">Name</span>
            <span className="text-slate-900 font-medium">
              {user?.firstName} {user?.lastName}
            </span>
          </div>
        </div>
      </Card>

      {/* Subscription */}
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

      {/* Privacy & Legal */}
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

      {/* Danger Zone */}
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
