import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Send, CheckCircle2, Clock, AlertCircle, RefreshCw,
  ChevronLeft, Mail, Users, Calendar, RotateCcw, X,
} from "lucide-react";
import { PageHeader, Card } from "../components/ui";
import { apiRequest } from "../lib/api";

function statusBadge(status: string) {
  if (status === "sent") return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Sent</span>;
  if (status === "failed") return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">Failed</span>;
  if (status === "skipped") return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Skipped</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">Pending</span>;
}

function ackBadge(ackStatus: string) {
  if (ackStatus === "acknowledged") return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Acknowledged</span>;
  if (ackStatus === "issue") return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">Issue Flagged</span>;
  if (ackStatus === "unavailable") return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Unavailable</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">Pending</span>;
}

function PublicationDetail({ pubId, onBack }: { pubId: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [resendingId, setResendingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/schedule/publications/detail", pubId],
    queryFn: () => fetch(`/api/schedule/publications/${pubId}`, { credentials: "include" }).then(r => r.json()),
  });

  const resendMutation = useMutation({
    mutationFn: async ({ pubId, notifId }: { pubId: string; notifId: string }) => {
      const res = await apiRequest("POST", `/api/schedule/publications/${pubId}/resend/${notifId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/publications/detail", pubId] });
      setResendingId(null);
    },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return <p className="text-slate-500 text-center py-8">Publication not found</p>;

  const notifications: any[] = data.notifications || [];
  const sentCount = notifications.filter(n => n.sendStatus === "sent").length;
  const ackCount = notifications.filter(n => n.ackStatus === "acknowledged").length;
  const issueCount = notifications.filter(n => n.ackStatus === "issue").length;

  const weekLabel = (() => {
    const ws = new Date(data.weekStart);
    const we = new Date(data.weekEnd);
    return `${ws.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${we.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{weekLabel}</h2>
          <p className="text-slate-500 text-sm">Version {data.versionNumber} · Published {new Date(data.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">{data.totalJobs}</div>
          <div className="text-xs text-slate-500 mt-0.5">Total Jobs</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-slate-900">{notifications.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Cleaners</div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-700">{sentCount}</div>
          <div className="text-xs text-emerald-600 mt-0.5">Emails Sent</div>
        </div>
        <div className="bg-primary-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-primary-700">{ackCount}</div>
          <div className="text-xs text-primary-600 mt-0.5">Acknowledged</div>
        </div>
      </div>

      {issueCount > 0 ? (
        <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-rose-800 font-semibold text-sm">{issueCount} cleaner{issueCount > 1 ? "s" : ""} flagged an issue</p>
            <p className="text-rose-700 text-xs mt-0.5">Review the cleaner rows below for details.</p>
          </div>
        </div>
      ) : null}

      {/* Cleaner notification table */}
      <Card>
        <div className="divide-y divide-slate-50">
          {notifications.map((n: any) => (
            <div key={n.id} className="flex items-center gap-4 py-4 px-1">
              <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-sm font-bold text-primary-700 shrink-0">
                {n.cleanerName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{n.cleanerName}</p>
                <p className="text-slate-400 text-xs truncate">{n.cleanerEmail || "No email"}</p>
                {n.ackStatus === "issue" && n.issueMessage ? (
                  <p className="text-rose-600 text-xs mt-0.5 italic">"{n.issueMessage}"</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                {statusBadge(n.sendStatus)}
                {ackBadge(n.ackStatus)}
                {n.acknowledgedAt ? (
                  <span className="text-xs text-slate-400">{new Date(n.acknowledgedAt).toLocaleDateString()}</span>
                ) : null}
                {n.cleanerEmail && n.sendStatus !== "skipped" ? (
                  <button
                    onClick={() => { setResendingId(n.id); resendMutation.mutate({ pubId, notifId: n.id }); }}
                    disabled={resendMutation.isPending && resendingId === n.id}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Resend
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {data.notes ? (
        <div className="bg-slate-50 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500 font-medium mb-1">Internal Notes</p>
          <p className="text-slate-700 text-sm">{data.notes}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function SchedulePublishPage() {
  const navigate = useNavigate();
  const [selectedPubId, setSelectedPubId] = useState<string | null>(null);

  const { data: publications = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/schedule/publications"],
    queryFn: () => fetch("/api/schedule/publications", { credentials: "include" }).then(r => r.json()),
  });

  if (selectedPubId) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <PageHeader title="Publish Status" />
        <Card>
          <PublicationDetail pubId={selectedPubId} onBack={() => setSelectedPubId(null)} />
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <PageHeader title="Publish History" />

      <div className="flex items-center gap-3 mb-1">
        <button
          onClick={() => navigate("/calendar")}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
        >
          <Calendar className="w-4 h-4" />
          Back to Schedule
        </button>
        <p className="text-slate-500 text-sm">All published schedule versions across all weeks</p>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : publications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-700 mb-1">No published schedules yet</h3>
            <p className="text-slate-400 text-sm mb-5">Switch to the Week view on the Schedule page and click "Publish Schedule" to get started.</p>
            <button
              onClick={() => navigate("/calendar")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Go to Schedule
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {publications.map((pub: any) => {
              const ws = new Date(pub.weekStart);
              const we = new Date(pub.weekEnd);
              const weekLabel = `${ws.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${we.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
              return (
                <button
                  key={pub.id}
                  onClick={() => setSelectedPubId(pub.id)}
                  className="w-full flex items-center gap-4 py-4 px-2 hover:bg-slate-50 rounded-xl transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                    <Send className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 text-sm">{weekLabel}</span>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">v{pub.versionNumber}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-0.5">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {pub.totalJobs} jobs
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {pub.totalCleaners} cleaners
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(pub.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-300 rotate-180 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
