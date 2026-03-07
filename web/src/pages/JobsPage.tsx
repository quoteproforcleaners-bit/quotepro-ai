import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Clock, CheckCircle, AlertCircle } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    scheduled: "bg-blue-50 text-blue-700",
    in_progress: "bg-amber-50 text-amber-700",
    completed: "bg-green-50 text-green-700",
    canceled: "bg-red-50 text-red-600",
  };
  const icons: Record<string, any> = {
    scheduled: Clock,
    in_progress: AlertCircle,
    completed: CheckCircle,
  };
  const Icon = icons[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || styles.scheduled}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {status.replace(/_/g, " ")}
    </span>
  );
}

const tabs = ["all", "scheduled", "in_progress", "completed"];

export default function JobsPage() {
  const [filter, setFilter] = useState("all");
  const { data: jobs = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/jobs"] });

  const filtered = jobs
    .filter((j: any) => filter === "all" || j.status === filter)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Jobs</h1>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-colors ${
                  filter === t
                    ? "bg-primary-50 text-primary-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                {t.replace(/_/g, " ")}
                {t !== "all" && (
                  <span className="ml-1.5 text-xs">
                    ({jobs.filter((j: any) => j.status === t).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No jobs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Title</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Scheduled</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((j: any) => (
                  <tr key={j.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{j.title || "Cleaning Job"}</td>
                    <td className="px-5 py-3.5 text-slate-500 hidden sm:table-cell">{j.customerName || "—"}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={j.status} /></td>
                    <td className="px-5 py-3.5 text-right text-slate-500 hidden md:table-cell">
                      {j.scheduledDate ? new Date(j.scheduledDate).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
