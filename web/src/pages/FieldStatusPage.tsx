import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../lib/api";
import { PageHeader } from "../components/ui";
import { Users, RefreshCw } from "lucide-react";

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
  return new Date(dt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
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

export default function FieldStatusPage() {
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const evtRef = useRef<EventSource | null>(null);

  const { data, isLoading, refetch } = useQuery<{ employees: EmployeeField[]; date: string }>({
    queryKey: ["/api/admin/dashboard/field-status"],
    queryFn: () => apiGet("/api/admin/dashboard/field-status"),
    refetchInterval: 30000, // polling fallback every 30s
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
        }
      } catch { /* ignore */ }
    };

    return () => es.close();
  }, [refetch]);

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
        subtitle={`${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${totalJobs} assignment${totalJobs !== 1 ? "s" : ""}`}
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
    </div>
  );
}
