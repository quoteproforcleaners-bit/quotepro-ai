import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  Link2Off,
  Activity,
  Upload,
  UserPlus,
  RefreshCw,
  Zap,
  Clock,
  AlertTriangle,
  Briefcase,
  Inbox,
  Info,
  CheckCircle,
  User,
  Mail,
  Phone,
  MapPin,
  SkipForward,
  AlertCircle,
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
  Tabs,
  Modal,
} from "../components/ui";
import { apiRequest } from "../lib/api";

type JobberStatus = {
  connected: boolean;
  status?: string;
  connectedAt?: string;
  autoCreateJobOnQuoteAccept?: boolean;
  lastError?: string | null;
};

type SyncLogEntry = {
  id: string;
  action: string;
  status: string;
  errorMessage: string | null;
  quoteId: string | null;
  createdAt: string;
};

interface JobberClient {
  jobberId: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  alreadyImported: boolean;
}

interface JobberClientsResponse {
  clients: JobberClient[];
  hasNextPage: boolean;
  endCursor: string | null;
  totalCount: number;
}

interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
}

const ACTION_ICONS: Record<string, typeof Link> = {
  connect: Link,
  disconnect: Link2Off,
  test_connection: Activity,
  sync_quote: Upload,
  create_client: UserPlus,
  refresh: RefreshCw,
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
  return `${days}d ago`;
}

function ConnectionTab() {
  const queryClient = useQueryClient();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const { data: jobberStatus, isLoading, refetch } = useQuery<JobberStatus>({
    queryKey: ["/api/integrations/jobber/status"],
  });

  const isConnected = jobberStatus?.connected === true;
  const needsReauth = jobberStatus?.status === "needs_reauth";

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await apiRequest("GET", "/api/integrations/jobber/connect");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch (e: any) {
      alert(e?.message || "Failed to start Jobber connection");
    }
    setConnecting(false);
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await apiRequest("POST", "/api/integrations/jobber/disconnect");
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/jobber/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/jobber/logs"] });
      refetch();
    } catch {}
    setDisconnecting(false);
    setConfirmDisconnect(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await apiRequest("POST", "/api/integrations/jobber/test");
      setTestResult("Connection successful");
    } catch {
      setTestResult("Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  const handleToggleAutoSync = async (value: boolean) => {
    setSettingsSaving(true);
    try {
      await apiRequest("PUT", "/api/integrations/jobber/settings", { autoCreateJobOnQuoteAccept: value });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/jobber/status"] });
    } catch {}
    setSettingsSaving(false);
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>Connection</SectionLabel>
        <Card className="mt-3">
          {isConnected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <p className="font-semibold text-slate-900 flex-1">Connected</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">Active</span>
              </div>
              {jobberStatus?.connectedAt && (
                <p className="text-xs text-slate-400">Connected {formatRelativeTime(jobberStatus.connectedAt)}</p>
              )}
            </div>
          ) : needsReauth ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900 text-sm">Reconnection Required</p>
                  <p className="text-sm text-slate-500 mt-0.5">Your Jobber session has expired. Please reconnect.</p>
                  {jobberStatus?.lastError && <p className="text-xs text-red-600 mt-1">{jobberStatus.lastError}</p>}
                </div>
              </div>
              <Button variant="warning" icon={RefreshCw} onClick={handleConnect} disabled={connecting}>
                {connecting ? "Opening Jobber..." : "Reconnect"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <p className="font-semibold text-slate-900">Not Connected</p>
              </div>
              <p className="text-sm text-slate-500">
                Connect Jobber to automatically turn accepted QuotePro quotes into Jobber clients and jobs.
              </p>
              <Button variant="primary" icon={Briefcase} onClick={handleConnect} disabled={connecting}>
                {connecting ? "Opening Jobber..." : "Connect Jobber"}
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
              <button onClick={handleTest} disabled={testing} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left">
                <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4.5 h-4.5 text-primary-600" />
                </div>
                <span className="flex-1 text-sm font-medium text-slate-900">Test Connection</span>
                {testing ? <Spinner size="sm" /> : <span className="text-slate-300">›</span>}
              </button>
              <button onClick={() => setConfirmDisconnect(true)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 transition-colors text-left">
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
                  <p className="font-medium text-slate-900 text-sm">Auto-sync on Accept</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Automatically create a Jobber client and job when a quote is accepted
                  </p>
                </div>
                <Toggle checked={jobberStatus?.autoCreateJobOnQuoteAccept || false} onChange={handleToggleAutoSync} />
              </div>
            </Card>
          </div>
        </>
      )}

      <ConfirmModal
        open={confirmDisconnect}
        onClose={() => setConfirmDisconnect(false)}
        onConfirm={handleDisconnect}
        title="Disconnect Jobber"
        description="Are you sure you want to disconnect your Jobber account? This will stop automatic job creation."
        confirmLabel="Disconnect"
        variant="danger"
        loading={disconnecting}
      />
    </div>
  );
}

function ImportTab() {
  const queryClient = useQueryClient();
  const [allClients, setAllClients] = useState<JobberClient[]>([]);
  const [lastCursor, setLastCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [resultModal, setResultModal] = useState<ImportResult | null>(null);
  const [initialized, setInitialized] = useState(false);

  const { data: clientsData, isLoading } = useQuery<JobberClientsResponse>({
    queryKey: ["/api/integrations/jobber/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/integrations/jobber/clients");
      return res.json();
    },
  });

  useEffect(() => {
    if (clientsData && !initialized) {
      setAllClients(clientsData.clients);
      setHasMore(clientsData.hasNextPage);
      if (clientsData.endCursor) setLastCursor(clientsData.endCursor);
      setInitialized(true);
    }
  }, [clientsData, initialized]);

  const selectableClients = allClients.filter((c) => !c.alreadyImported);
  const allSelected = selectableClients.length > 0 && selectedIds.size === selectableClients.length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(selectableClients.map((c) => c.jobberId)));
  };

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || !lastCursor) return;
    setLoadingMore(true);
    try {
      const res = await apiRequest("GET", `/api/integrations/jobber/clients?cursor=${encodeURIComponent(lastCursor)}`);
      const data: JobberClientsResponse = await res.json();
      setAllClients((prev) => {
        const existingIds = new Set(prev.map((c) => c.jobberId));
        return [...prev, ...data.clients.filter((c) => !existingIds.has(c.jobberId))];
      });
      setHasMore(data.hasNextPage);
      if (data.endCursor) setLastCursor(data.endCursor);
    } catch {}
    setLoadingMore(false);
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) return;
    setImporting(true);
    try {
      const res = await apiRequest("POST", "/api/integrations/jobber/import-clients", {
        clientIds: Array.from(selectedIds),
      });
      const result: ImportResult = await res.json();
      setResultModal(result);
      setSelectedIds(new Set());
      setAllClients((prev) => prev.map((c) => selectedIds.has(c.jobberId) ? { ...c, alreadyImported: true } : c));
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    } catch {}
    setImporting(false);
  };

  if (isLoading && !initialized) {
    return <div className="flex flex-col items-center justify-center py-16 gap-3"><Spinner size="lg" /><p className="text-sm text-slate-500">Loading Jobber clients...</p></div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Select clients from Jobber to import into QuotePro. Already imported clients are marked.
      </p>

      {selectableClients.length > 0 && (
        <button
          onClick={toggleSelectAll}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left"
        >
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${allSelected ? "bg-primary-600 border-primary-600" : "border-slate-300"}`}>
            {allSelected && <CheckCircle className="w-3 h-3 text-white" />}
          </div>
          <span className="flex-1 text-sm font-medium text-slate-900">{allSelected ? "Deselect All" : "Select All"}</span>
          <span className="text-xs text-slate-400">{selectableClients.length} available</span>
        </button>
      )}

      {allClients.length === 0 ? (
        <Card><EmptyState icon={User} title="No Clients Found" description="No clients were found in your Jobber account." /></Card>
      ) : (
        <div className="space-y-2">
          {allClients.map((client) => {
            const isImported = client.alreadyImported;
            const isSelected = selectedIds.has(client.jobberId);
            return (
              <button
                key={client.jobberId}
                onClick={() => { if (!isImported) toggleSelect(client.jobberId); }}
                disabled={isImported}
                className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-colors ${
                  isSelected ? "border-primary-400 bg-primary-50" : isImported ? "border-slate-200 bg-slate-50" : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {isImported ? (
                    <div className="w-5 h-5 rounded bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                  ) : (
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? "bg-primary-600 border-primary-600" : "border-slate-300"}`}>
                      {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{client.firstName} {client.lastName}</p>
                    {isImported && <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Imported</span>}
                  </div>
                  {client.email && <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</p>}
                  {client.phone && <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</p>}
                  {client.address && <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 truncate"><MapPin className="w-3 h-3 flex-shrink-0" />{client.address}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full py-3 rounded-xl border border-slate-200 text-sm text-primary-600 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {loadingMore ? "Loading..." : "Load More"}
        </button>
      )}

      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 bg-white border-t border-slate-200 -mx-6 px-6 py-4">
          <Button variant="primary" onClick={handleImport} disabled={importing} className="w-full">
            {importing ? "Importing..." : `Import Selected (${selectedIds.size})`}
          </Button>
        </div>
      )}

      <Modal isOpen={resultModal !== null} onClose={() => setResultModal(null)} title="Import Complete">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="space-y-2 text-left">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <p className="text-sm text-slate-700">{resultModal?.imported ?? 0} imported</p>
            </div>
            {(resultModal?.skipped ?? 0) > 0 && (
              <div className="flex items-center gap-2">
                <SkipForward className="w-4 h-4 text-amber-600" />
                <p className="text-sm text-slate-700">{resultModal?.skipped} skipped (duplicates)</p>
              </div>
            )}
            {(resultModal?.failed ?? 0) > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-slate-700">{resultModal?.failed} failed</p>
              </div>
            )}
          </div>
          <Button variant="primary" onClick={() => setResultModal(null)} className="w-full">Done</Button>
        </div>
      </Modal>
    </div>
  );
}

function LogsTab() {
  const { data: logs = [], isLoading } = useQuery<SyncLogEntry[]>({
    queryKey: ["/api/integrations/jobber/logs"],
  });

  if (isLoading) return <div className="flex justify-center py-10"><Spinner size="lg" /></div>;

  if (logs.length === 0) {
    return <Card><EmptyState icon={Inbox} title="No sync logs yet" description="Jobber sync activity will appear here once you start syncing quotes." /></Card>;
  }

  return (
    <Card className="divide-y divide-slate-100 p-0">
      {logs.map((log) => {
        const isOk = log.status === "ok";
        const ActionIcon = getActionIcon(log.action);
        return (
          <div key={log.id} className="flex items-start gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isOk ? "#dcfce7" : "#fee2e2" }}>
              <ActionIcon className="w-4.5 h-4.5" style={{ color: isOk ? "#16a34a" : "#ef4444" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900">
                {log.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{new Date(log.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
              {log.errorMessage && <p className="text-xs text-red-600 mt-0.5">{log.errorMessage}</p>}
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 mt-0.5" style={{ backgroundColor: isOk ? "#dcfce7" : "#fee2e2", color: isOk ? "#16a34a" : "#ef4444" }}>
              {isOk ? "OK" : "Failed"}
            </span>
          </div>
        );
      })}
    </Card>
  );
}

const TABS = [
  { id: "connection", label: "Connection" },
  { id: "import", label: "Import Clients" },
  { id: "logs", label: "Sync Logs" },
];

export default function JobberPage() {
  const [activeTab, setActiveTab] = useState("connection");
  const [justConnected, setJustConnected] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("connected") === "1";
  });

  useEffect(() => {
    if (justConnected) {
      const t = setTimeout(() => setJustConnected(false), 5000);
      window.history.replaceState({}, "", window.location.pathname);
      return () => clearTimeout(t);
    }
  }, [justConnected]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Jobber"
        subtitle="Sync quotes and import clients from Jobber"
      />
      {justConnected && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-medium text-emerald-800">Jobber connected successfully!</p>
        </div>
      )}
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      <div>
        {activeTab === "connection" && <ConnectionTab />}
        {activeTab === "import" && <ImportTab />}
        {activeTab === "logs" && <LogsTab />}
      </div>
    </div>
  );
}
