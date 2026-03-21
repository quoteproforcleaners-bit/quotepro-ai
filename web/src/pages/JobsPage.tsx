import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  MapPin,
  DollarSign,
  User,
  Calendar,
} from "lucide-react";
import {
  PageHeader,
  Card,
  Badge,
  Tabs,
  EmptyState,
  Spinner,
} from "../components/ui";

export default function JobsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
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
                        <p className="text-xs text-slate-400 mt-0.5 hidden sm:block flex items-center gap-1">
                          <MapPin className="w-3 h-3 inline" />
                          {j.address}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 hidden sm:table-cell">
                      {j.customerName ? (
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {j.customerName}
                        </span>
                      ) : (
                        <span className="text-slate-300">&mdash;</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={j.status} dot />
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">
                      {j.scheduledDate ? (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(j.scheduledDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-slate-300">&mdash;</span>
                      )}
                    </td>
                    <td className="px-5 lg:px-6 py-3.5 text-right font-semibold text-slate-900 hidden lg:table-cell">
                      {j.total ? (
                        <span className="flex items-center justify-end gap-1">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                          {Number(j.total).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-300">&mdash;</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
