import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../lib/api";
import { PageHeader } from "../components/ui";
import { Users, RefreshCw, LogIn, LogOut, Clock } from "lucide-react";
import { getLocale, fmtDate } from "../lib/locale";

type AssignmentStatus = "assigned" | "en_route" | "checked_in" | "completed" | "no_show";

interface Assignment {
  id: string;
  status: AssignmentStatus;
  checkinTime: string | null;
  checkoutTime: string | null;
  durationMinutes: number | null;
  job: { id: string; address: string; startDatetime: string; estimatedDurationMinutes: number | null } | null;
  customerName: string;
}

interface EmployeeField {
  employee: { id: string; name: string; color: string; role: string; phone: string };
  assignments: Assignment[];
}

const COLUMNS: { key: AssignmentStatus; label: string; bg: string; color: string }[] = [
  { key: "assigned",   label: "Scheduled",   bg: "#F1EFE8", color: "#888780" },
  { key: "en_route",  label: "En Route",    bg: "#FAEEDA", color: "#B57C0A" },
  { key: "checked_in",label: "In Progress", bg: "#E1F5EE", color: "#0F6E56" },
  { key: "completed", label: "Completed",   bg: "#E8F8F0", color: "#1D9E75" },
];

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function formatTime(dt: string | null): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString(getLocale(), { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDuration(mins: number | null): string {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
}

function AssignmentCard({ a, emp }: { a: Assignment; emp: EmployeeField["employee"] }) {
  return (
    <div style={{
      background: "white", borderRadius: 12, padding: "12px",
      marginBottom: 8, boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: emp.color, color: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>
          {initials(emp.name)}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1a1a18" }}>{emp.name}</div>
          <div style={{ fontSize: 11, color: "#888780" }}>{emp.role}</div>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a18", marginBottom: 2 }}>{a.customerName}</div>
      <div style={{ fontSize: 11, color: "#888780", marginBottom: 4 }}>{a.job?.address}</div>
      <div style={{ display: "flex", gap: 6, fontSize: 11, color: "#888780" }}>
        {a.checkinTime && <span>In: {formatTime(a.checkinTime)}</span>}
        {a.checkoutTime && <span>· Out: {formatTime(a.checkoutTime)}</span>}
        {a.durationMinutes && <span>· {formatDuration(a.durationMinutes)}</span>}
      </div>
    </div>
  );
}

interface EventLogItem {
  type: "checkin" | "checkout";
  assignmentId: string;
  employeeName: string;
  employeeColor: string | null;
  customerName: string;
  address: string | null;
  timestamp: string;
  durationMinutes: number | null;
}

export default function FieldStatusPage() {
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const evtRef = useRef<EventSource | null>(null);

  const { data, isLoading, refetch } = useQuery<{ employees: EmployeeField[]; date: string }>({
    queryKey: ["/api/admin/dashboard/field-status"],
    queryFn: () => apiGet("/api/admin/dashboard/field-status"),
    refetchInterval: 30000, // polling fallback every 30s
  });

  const { data: eventLog = [], refetch: refetchLog } = useQuery<EventLogItem[]>({
    queryKey: ["/api/admin/events/log"],
    queryFn: () => apiGet("/api/admin/events/log"),
    refetchInterval: 60000,
  });

  // SSE live updates
  useEffect(() => {
    const es = new EventSource("/api/admin/events/stream");
    evtRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type !== "connected") {
          setLastEvent(`${event.employeeName || "Employee"} ${event.type.replace("employee_", "").replace("_", " ")} · ${new Date(event.timestamp).toLocaleTimeString()}`);
          refetch();
          refetchLog();
        }
      } catch { /* ignore */ }
    };

    return () => es.close();
  }, [refetch, refetchLog]);

  // Build column assignments
  const columns: Record<AssignmentStatus, { assignment: Assignment; employee: EmployeeField["employee"] }[]> = {
    assigned: [], en_route: [], checked_in: [], completed: [], no_show: [],
  };

  for (const empRow of data?.employees ?? []) {
    for (const a of empRow.assignments) {
      const col = a.status as AssignmentStatus;
      if (columns[col]) {
        columns[col].push({ assignment: a, employee: empRow.employee });
      }
    }
  }

  const totalJobs = Object.values(columns).flat().length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Field Status"
        subtitle={`${fmtDate(new Date(), { weekday: "long", month: "long", day: "numeric" })} · ${totalJobs} assignment${totalJobs !== 1 ? "s" : ""}`}
        actions={
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        }
      />

      {lastEvent && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
          {lastEvent}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map(({ key, label, bg, color }) => (
            <div key={key}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color, background: bg, borderRadius: 999, padding: "3px 10px" }}>
                  {label}
                </span>
                <span style={{ fontSize: 12, color: "#888780", fontWeight: 500 }}>
                  {columns[key].length}
                </span>
              </div>

              <div style={{ minHeight: 100 }}>
                {columns[key].length === 0 ? (
                  <div style={{
                    border: "1.5px dashed #E8E6DF", borderRadius: 12, padding: "16px",
                    textAlign: "center" as const, color: "#C4C2BB", fontSize: 12,
                  }}>
                    None
                  </div>
                ) : (
                  columns[key].map(({ assignment, employee }) => (
                    <AssignmentCard key={assignment.id} a={assignment} emp={employee} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Employees with no jobs today */}
      {(data?.employees ?? []).filter((e) => e.assignments.length === 0).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Not Scheduled Today
          </h3>
          <div className="flex flex-wrap gap-3">
            {(data?.employees ?? [])
              .filter((e) => e.assignments.length === 0)
              .map((e) => (
                <div key={e.employee.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100">
                  <div
                    style={{ width: 28, height: 28, borderRadius: "50%", background: e.employee.color, flexShrink: 0 }}
                    className="flex items-center justify-center text-white text-xs font-bold"
                  >
                    {initials(e.employee.name)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{e.employee.name}</div>
                    <div className="text-xs text-slate-400">{e.employee.role}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Notification log — last 20 events */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Recent Activity
        </h3>
        {eventLog.length === 0 ? (
          <div className="px-4 py-6 bg-white rounded-2xl border border-slate-100 text-center text-sm text-slate-400">
            No check-in or check-out events yet today.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
            {eventLog.map((ev, i) => {
              const isCheckin = ev.type === "checkin";
              return (
                <div key={`${ev.assignmentId}-${ev.type}-${i}`} className="flex items-center gap-4 px-4 py-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isCheckin ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isCheckin ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                  </div>

                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: ev.employeeColor ?? "#0F6E56" }}
                  >
                    {initials(ev.employeeName)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">
                      {ev.employeeName}
                      <span className="font-normal text-slate-500">
                        {" "}{isCheckin ? "checked in at" : "completed"}{" "}
                      </span>
                      {ev.customerName}
                    </div>
                    {ev.address && (
                      <div className="text-xs text-slate-400 truncate font-mono">{ev.address}</div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-medium text-slate-600">
                      {new Date(ev.timestamp).toLocaleTimeString(getLocale(), { hour: "numeric", minute: "2-digit", hour12: true })}
                    </div>
                    {ev.durationMinutes !== null && ev.durationMinutes > 0 && (
                      <div className="text-xs text-slate-400">{formatDuration(ev.durationMinutes)}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
