import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Clock,
  CheckCircle,
  Play,
  Calendar,
  MapPin,
  DollarSign,
  User,
} from "lucide-react";
import { apiPost } from "../lib/api";
import { queryClient } from "../lib/queryClient";
import {
  PageHeader,
  Card,
  CardHeader,
  Badge,
  Button,
  Tabs,
  EmptyState,
  Spinner,
  Modal,
} from "../components/ui";

export default function JobsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const { data: jobs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
  });

  const tabs = ["all", "scheduled", "in_progress", "completed"];
  const counts: Record<string, number> = {};
  for (const t of tabs) {
    counts[t] =
      t === "all"
        ? jobs.length
        : jobs.filter((j: any) => j.status === t).length;
  }

  const filtered = jobs
    .filter((j: any) => filter === "all" || j.status === filter)
    .sort(
      (a: any, b: any) =>
        new Date(b.scheduledDate || b.createdAt).getTime() -
        new Date(a.scheduledDate || a.createdAt).getTime()
    );

  const startMutation = useMutation({
    mutationFn: (jobId: string) => apiPost(`/api/jobs/${jobId}/start`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setSelectedJob(null);
    },
  });

  const completeMutation = useMutation({
    mutationFn: (jobId: string) => apiPost(`/api/jobs/${jobId}/complete`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setSelectedJob(null);
    },
  });

  const syncCalendar = async (jobId: string) => {
    try {
      await apiPost(`/api/google-calendar/sync-job`, { jobId });
    } catch {}
  };

  return (
    <div>
      <PageHeader
        title="Jobs"
        subtitle={`${jobs.length} total jobs`}
      />

      <Card padding={false}>
        <div className="p-4 lg:p-5 border-b border-slate-100">
          <Tabs tabs={tabs} active={filter} onChange={setFilter} counts={counts} />
        </div>

        {isLoading ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No jobs found"
            description="Jobs are created from accepted quotes"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 lg:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Job
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                    Customer
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                    Scheduled
                  </th>
                  <th className="text-right px-5 lg:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((j: any) => (
                  <tr
                    key={j.id}
                    onClick={() => navigate(`/jobs/${j.id}`)}
                    className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-5 lg:px-6 py-3.5">
                      <p className="font-medium text-slate-900">
                        {j.title || "Cleaning Job"}
                      </p>
                      {j.address ? (
                        <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                          {j.address}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 hidden sm:table-cell">
                      {j.customerName || <span className="text-slate-300">&mdash;</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={j.status} dot />
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">
                      {j.scheduledDate
                        ? new Date(j.scheduledDate).toLocaleDateString()
                        : <span className="text-slate-300">&mdash;</span>}
                    </td>
                    <td className="px-5 lg:px-6 py-3.5 text-right font-semibold text-slate-900 hidden lg:table-cell">
                      {j.total
                        ? `$${Number(j.total).toLocaleString()}`
                        : <span className="text-slate-300">&mdash;</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        title={selectedJob?.title || "Job Details"}
        size="md"
      >
        {selectedJob ? (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Badge status={selectedJob.status} dot />
              {selectedJob.isRecurring ? (
                <Badge status="info" label="Recurring" />
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {selectedJob.customerName ? (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Customer</p>
                    <p className="text-sm font-medium text-slate-900">
                      {selectedJob.customerName}
                    </p>
                  </div>
                </div>
              ) : null}
              {selectedJob.scheduledDate ? (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Scheduled</p>
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(selectedJob.scheduledDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ) : null}
              {selectedJob.address ? (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Location</p>
                    <p className="text-sm font-medium text-slate-900">
                      {selectedJob.address}
                    </p>
                  </div>
                </div>
              ) : null}
              {selectedJob.total ? (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Amount</p>
                    <p className="text-sm font-semibold text-slate-900">
                      ${Number(selectedJob.total).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-100">
              {selectedJob.status === "scheduled" ? (
                <Button
                  icon={Play}
                  onClick={() => startMutation.mutate(selectedJob.id)}
                  loading={startMutation.isPending}
                  size="sm"
                >
                  Start Job
                </Button>
              ) : null}
              {selectedJob.status === "in_progress" ? (
                <Button
                  icon={CheckCircle}
                  variant="success"
                  onClick={() => completeMutation.mutate(selectedJob.id)}
                  loading={completeMutation.isPending}
                  size="sm"
                >
                  Complete Job
                </Button>
              ) : null}
              <Button
                variant="secondary"
                icon={Calendar}
                onClick={() => syncCalendar(selectedJob.id)}
                size="sm"
              >
                Sync to Calendar
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
