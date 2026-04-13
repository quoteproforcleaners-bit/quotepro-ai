import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { useDateFormat } from "../lib/useDateFormat";

const TAB_IDS = ["all", "scheduled", "in_progress", "completed"] as const;

export default function JobsPage() {
  const { t } = useTranslation();
  const { formatDateShort } = useDateFormat();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const { data: jobs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/jobs"],
  });

  const tabKeyMap: Record<string, string> = {
    "all": "jobs.tabs.all",
    "scheduled": "jobs.tabs.scheduled",
    "in_progress": "jobs.tabs.inProgress",
    "completed": "jobs.tabs.completed",
  };

  const tabs = TAB_IDS.map((id) => ({ id, label: t(tabKeyMap[id] || id) }));

  const counts: Record<string, number> = {};
  for (const tab of TAB_IDS) {
    counts[tab] =
      tab === "all"
        ? jobs.length
        : jobs.filter((j: any) => j.status === tab).length;
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
        title={t("jobs.title")}
        subtitle={t("jobs.totalCount", { count: jobs.length })}
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
            title={t("jobs.noJobs")}
            description={t("jobs.noJobsDesc")}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 lg:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t("jobs.table.job")}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">
                    {t("jobs.table.customer")}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {t("jobs.table.status")}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">
                    {t("jobs.table.scheduled")}
                  </th>
                  <th className="text-right px-5 lg:px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">
                    {t("jobs.table.amount")}
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
                        {j.customerName || j.title || t("jobs.cleaningJob")}
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
                          {formatDateShort(j.scheduledDate)}
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
