import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  Link2Off,
  Activity,
  FileText,
  UserPlus,
  RefreshCw,
  LogIn,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  Inbox,
  Info,
} from "lucide-react";
import {
  PageHeader,
  Card,
  CardHeader,
  Spinner,
  Toggle,
  SectionLabel,
  Button,
  EmptyState,
  ConfirmModal,
} from "../components/ui";
import { apiRequest } from "../lib/api";

type QBOStatus = {
  status: string;
  companyName: string | null;
  realmId: string | null;
  environment: string;
  lastError: string | null;
  autoCreateInvoice: boolean;
};

type SyncLogEntry = {
  id: string;
  action: string;
  status: string;
  errorMessage: string | null;
  quoteId: string | null;
  createdAt: string;
};

const ACTION_ICONS: Record<string, typeof Link> = {
  connect: Link,
  disconnect: Link2Off,
  test_connection: Activity,
  create_invoice: FileText,
  create_customer: UserPlus,
  refresh_token: RefreshCw,
  oauth_callback: LogIn,
};

function getActionIcon(action: string) {
  return ACTION_ICONS[action] || Zap;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function LogRow({ log }: { log: SyncLogEntry }) {
  const isOk = log.status === "ok";
  const ActionIcon = getActionIcon(log.action);
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: isOk ? "#dcfce7" : "#fee2e2" }}
      >
        <ActionIcon className="w-4 h-4" style={{ color: isOk ? "#16a34a" : "#ef4444" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">
          {log.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </p>
        {log.errorMessage && (
          <p className="text-xs text-red-600 mt-0.5 truncate">{log.errorMessage}</p>
        )}
        <div className="flex items-center gap-1 mt-0.5">
          <Clock className="w-3 h-3 text-slate-400" />
          <span className="text-xs text-slate-400">{formatRelativeTime(log.createdAt)}</span>
          {log.quoteId && (
            <>
              <span className="text-slate-300 mx-1">·</span>
              <FileText className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-400">Quote</span>
            </>
          )}
        </div>
      </div>
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0"
        style={{ backgroundColor: isOk ? "#dcfce7" : "#fee2e2", color: isOk ? "#16a34a" : "#ef4444" }}
      >
        {isOk ? "OK" : "Failed"}
      </span>
    </div>
  );
}

export default function QBOSettingsPage() {
  const queryClient = useQueryClient();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const { data: qboStatus, isLoading, refetch } = useQuery<QBOStatus>({
    queryKey: ["/api/integrations/qbo/status"],
  });

  const { data: logs = [] } = useQuery<SyncLogEntry[]>({
    queryKey: ["/api/integrations/qbo/logs"],
  });

  const isConnected = qboStatus?.status === "connected";
  const needsReauth = qboStatus?.status === "needs_reauth";

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await apiRequest("GET", "/api/integrations/qbo/connect");
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/integrations/qbo/status"] });
          queryClient.invalidateQueries({ queryKey: ["/api/integrations/qbo/logs"] });
          refetch();
        }, 3000);
      }
    } catch (e: any) {
      console.error("QBO connect error:", e);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await apiRequest("POST", "/api/integrations/qbo/disconnect");
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/qbo/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/qbo/logs"] });
      refetch();
    } catch {}
    setDisconnecting(false);
    setConfirmDisconnect(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiRequest("POST", "/api/integrations/qbo/test");
      const data = await res.json();
      setTestResult(data.companyName ? `Connected to ${data.companyName}` : "Connection successful");
    } catch {
      setTestResult("Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleToggleAutoInvoice = async (value: boolean) => {
    setSettingsSaving(true);
    try {
      await apiRequest("PUT", "/api/integrations/qbo/settings", { autoCreateInvoice: value });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/qbo/status"] });
    } catch {}
    setSettingsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="QuickBooks Online"
        subtitle="Sync accepted quotes as invoices in QuickBooks"
      />

      <div>
        <SectionLabel>Connection</SectionLabel>
        <Card className="mt-3">
          {isConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
                <p className="font-semibold text-slate-900 flex-1">Connected</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                  Active
                </span>
              </div>
              {qboStatus?.companyName && (
                <p className="text-sm font-medium text-slate-800">{qboStatus.companyName}</p>
              )}
              {qboStatus?.realmId && (
                <p className="text-xs text-slate-400">Realm ID: {qboStatus.realmId}</p>
              )}
            </div>
          ) : needsReauth ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Reconnection Required</p>
                  <p className="text-sm text-slate-500 mt-0.5">Your QuickBooks session has expired. Please reconnect.</p>
                  {qboStatus?.lastError && (
                    <p className="text-xs text-red-600 mt-1">{qboStatus.lastError}</p>
                  )}
                </div>
              </div>
              <Button variant="warning" icon={RefreshCw} onClick={handleConnect} disabled={connecting}>
                {connecting ? "Opening QuickBooks..." : "Reconnect"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300 flex-shrink-0" />
                <p className="font-semibold text-slate-900">Not Connected</p>
              </div>
              <p className="text-sm text-slate-500">
                Connect your QuickBooks Online account to automatically create invoices from accepted quotes.
              </p>
              <Button variant="primary" icon={BookOpen} onClick={handleConnect} disabled={connecting}>
                {connecting ? "Opening QuickBooks..." : "Connect QuickBooks"}
              </Button>
            </div>
          )}
        </Card>
      </div>

      {isConnected && (
        <>
          <div>
            <SectionLabel>Actions</SectionLabel>
            <Card className="mt-3 divide-y divide-slate-100 p-0">
              <button
                onClick={handleTest}
                disabled={testing}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4.5 h-4.5 text-primary-600" />
                </div>
                <span className="flex-1 text-sm font-medium text-slate-900">Test Connection</span>
                {testing ? <Spinner size="sm" /> : <span className="text-slate-300">›</span>}
              </button>
              <button
                onClick={() => setConfirmDisconnect(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                  <Link2Off className="w-4.5 h-4.5 text-red-500" />
                </div>
                <span className="flex-1 text-sm font-medium text-red-600">Disconnect</span>
                {disconnecting ? <Spinner size="sm" /> : <span className="text-slate-300">›</span>}
              </button>
            </Card>

            {testResult && (
              <div className="mt-2 flex items-center gap-2 p-3 rounded-xl bg-primary-50 border border-primary-100">
                <Info className="w-4 h-4 text-primary-600 flex-shrink-0" />
                <p className="text-sm text-primary-700">{testResult}</p>
              </div>
            )}
          </div>

          <div>
            <SectionLabel>Settings</SectionLabel>
            <Card className="mt-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900 text-sm">Auto-create Invoice</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Automatically create a QuickBooks invoice when a quote is accepted
                  </p>
                </div>
                <Toggle
                  checked={qboStatus?.autoCreateInvoice || false}
                  onChange={handleToggleAutoInvoice}
                />
              </div>
            </Card>
          </div>

          <div>
            <SectionLabel>Sync Logs</SectionLabel>
            <Card className="mt-3">
              {logs.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="No sync activity yet"
                  description="QuickBooks sync activity will appear here once you start creating invoices."
                />
              ) : (
                <div>
                  {logs.map((log) => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      <ConfirmModal
        open={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        onConfirm={handleDisconnect}
        title="Disconnect QuickBooks"
        description="Are you sure you want to disconnect your QuickBooks account? This will stop automatic invoice creation."
        confirmLabel="Disconnect"
        variant="danger"
      />
    </div>
  );
}
