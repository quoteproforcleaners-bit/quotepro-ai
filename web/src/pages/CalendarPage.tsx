import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiPut } from "../lib/api";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarDays,
  LayoutGrid,
  Clock,
  DollarSign,
  Briefcase,
  X,
  Plus,
  AlertCircle,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { PageHeader, Card, Button } from "../components/ui";

// ─── Types ─────────────────────────────────────────────────────────────────

interface CalendarJob {
  id: string;
  customerId: string | null;
  quoteId: string | null;
  jobType: string;
  status: string;
  startDatetime: string;
  endDatetime: string | null;
  total: number | null;
  address: string;
  internalNotes: string;
  customerName: string;
  customerPhone: string;
}

interface UnscheduledQuote {
  id: string;
  customerName: string;
  customerId: string | null;
  total: number | null;
  selectedOption: string;
  options: any;
  frequencySelected: string;
  propertyDetails: any;
  acceptedAt: string | null;
  address: string;
}

type CalendarView = "month" | "week" | "day";

// ─── Helpers ────────────────────────────────────────────────────────────────

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
function startOfWeek(d: Date) {
  const c = new Date(d);
  c.setDate(c.getDate() - c.getDay());
  c.setHours(0, 0, 0, 0);
  return c;
}
function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}
function formatMoney(n: number | null) {
  if (!n) return "";
  return `$${n.toFixed(0)}`;
}

function jobColor(job: CalendarJob): { bg: string; border: string; text: string; dot: string } {
  const type = job.jobType?.toLowerCase() || "";
  const status = job.status?.toLowerCase() || "";
  if (status === "completed") return { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-800", dot: "bg-emerald-400" };
  if (status === "in_progress") return { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800", dot: "bg-amber-400" };
  if (type.includes("deep")) return { bg: "bg-violet-50", border: "border-violet-300", text: "text-violet-800", dot: "bg-violet-500" };
  if (type.includes("move") || type.includes("out")) return { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-800", dot: "bg-orange-400" };
  return { bg: "bg-primary-50", border: "border-primary-300", text: "text-primary-800", dot: "bg-primary-500" };
}

function jobsOnDay(jobs: CalendarJob[], day: Date) {
  return jobs.filter((j) => isSameDay(new Date(j.startDatetime), day));
}

function revenueForJobs(jobs: CalendarJob[]) {
  return jobs.reduce((s, j) => s + (j.total || 0), 0);
}

// ─── Schedule Modal ─────────────────────────────────────────────────────────

function ScheduleModal({
  quote,
  preselectedDate,
  onClose,
  onScheduled,
}: {
  quote: UnscheduledQuote | null;
  preselectedDate: Date | null;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [date, setDate] = useState<string>(
    preselectedDate
      ? preselectedDate.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("3");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const scheduleMutation = useMutation({
    mutationFn: (data: any) => apiPost("/api/jobs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes/unscheduled-accepted"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      onScheduled();
    },
    onError: (e: any) => setError(e?.message || "Failed to schedule"),
  });

  if (!quote) return null;

  const serviceLabel =
    quote.options?.[quote.selectedOption]?.name ||
    `${quote.selectedOption?.charAt(0).toUpperCase()}${quote.selectedOption?.slice(1)} Service`;

  const handleSubmit = () => {
    setError("");
    const start = new Date(`${date}T${time}:00`);
    const end = new Date(start);
    end.setHours(end.getHours() + parseFloat(duration || "2"));
    scheduleMutation.mutate({
      quoteId: quote.id,
      customerId: quote.customerId,
      jobType: serviceLabel,
      startDatetime: start.toISOString(),
      endDatetime: end.toISOString(),
      address: quote.address,
      total: quote.total,
      status: "scheduled",
      internalNotes: notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-primary-200 text-xs font-medium uppercase tracking-wider mb-0.5">Schedule Clean</p>
              <h2 className="text-lg font-bold">{quote.customerName}</h2>
              <p className="text-primary-200 text-sm mt-0.5">{serviceLabel}</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          {quote.total ? (
            <div className="mt-3 inline-flex items-center gap-1.5 bg-white/15 rounded-lg px-3 py-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              <span className="text-sm font-semibold">{formatMoney(quote.total)}</span>
              {quote.frequencySelected && quote.frequencySelected !== "one-time" ? (
                <span className="text-primary-200 text-xs">/ visit · {quote.frequencySelected}</span>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Arrival Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Estimated Duration</label>
            <div className="grid grid-cols-4 gap-2">
              {["1.5", "2", "3", "4"].map((h) => (
                <button
                  key={h}
                  onClick={() => setDuration(h)}
                  className={`h-9 text-xs font-medium rounded-lg border transition-all ${
                    duration === h
                      ? "bg-primary-600 border-primary-600 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:border-primary-300"
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          {quote.address ? (
            <div className="bg-slate-50 rounded-lg px-3 py-2.5">
              <p className="text-xs text-slate-400 mb-0.5">Service address</p>
              <p className="text-sm text-slate-700 font-medium">{quote.address}</p>
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Internal Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Access instructions, special requests…"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {error ? (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          ) : null}

          <Button
            onClick={handleSubmit}
            loading={scheduleMutation.isPending}
            className="w-full justify-center"
            size="md"
          >
            Schedule Clean
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Job Detail Drawer ───────────────────────────────────────────────────────

function JobDrawer({
  job,
  onClose,
  onReschedule,
  onNavigate,
}: {
  job: CalendarJob;
  onClose: () => void;
  onReschedule: (job: CalendarJob) => void;
  onNavigate: (jobId: string) => void;
}) {
  const colors = jobColor(job);
  const start = new Date(job.startDatetime);
  const end = job.endDatetime ? new Date(job.endDatetime) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden">
        {/* Color bar */}
        <div className={`h-1.5 w-full ${colors.dot}`} />
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-0.5">{job.jobType}</p>
              <h2 className="text-xl font-bold text-slate-900">{job.customerName || "Job"}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
                <p className="text-xs text-slate-500">
                  {formatTime(job.startDatetime)}
                  {end ? ` – ${formatTime(job.endDatetime!)}` : ""}
                </p>
              </div>
            </div>

            {job.total ? (
              <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-3">
                <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-sm font-semibold text-emerald-800">{formatMoney(job.total)}</p>
              </div>
            ) : null}

            {job.address ? (
              <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
                <Briefcase className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700">{job.address}</p>
              </div>
            ) : null}

            {job.internalNotes ? (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs text-amber-600 font-medium mb-0.5">Notes</p>
                <p className="text-sm text-amber-800">{job.internalNotes}</p>
              </div>
            ) : null}

            <div className="flex gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                icon={RotateCcw}
                onClick={() => onReschedule(job)}
                className="flex-1 justify-center"
              >
                Reschedule
              </Button>
              <Button
                size="sm"
                icon={ExternalLink}
                onClick={() => onNavigate(job.id)}
                className="flex-1 justify-center"
              >
                View Job
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reschedule Modal ────────────────────────────────────────────────────────

function RescheduleModal({ job, onClose, onSaved }: { job: CalendarJob; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(new Date(job.startDatetime).toISOString().slice(0, 10));
  const [time, setTime] = useState(
    new Date(job.startDatetime).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })
  );
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: any) => apiPut(`/api/jobs/${job.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      onSaved();
    },
    onError: (e: any) => setError(e?.message || "Failed to reschedule"),
  });

  const handleSave = () => {
    const start = new Date(`${date}T${time}:00`);
    let endDatetime: string | undefined;
    if (job.endDatetime) {
      const origDuration = new Date(job.endDatetime).getTime() - new Date(job.startDatetime).getTime();
      endDatetime = new Date(start.getTime() + origDuration).toISOString();
    }
    mutation.mutate({ startDatetime: start.toISOString(), endDatetime });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">Reschedule Clean</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">{job.customerName} · {job.jobType}</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">New Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">New Time</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <Button onClick={handleSave} loading={mutation.isPending} className="w-full justify-center">Save Changes</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Month View ──────────────────────────────────────────────────────────────

function MonthView({
  currentDate,
  jobs,
  onDayClick,
  onJobClick,
}: {
  currentDate: Date;
  jobs: CalendarJob[];
  onDayClick: (day: Date) => void;
  onJobClick: (job: CalendarJob) => void;
}) {
  const today = startOfDay(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Build 6-week grid
  const firstDay = new Date(year, month, 1);
  const startDate = addDays(firstDay, -firstDay.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(startDate, i));

  const totalRevenue = jobs
    .filter((j) => {
      const d = new Date(j.startDatetime);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((s, j) => s + (j.total || 0), 0);

  const jobCount = jobs.filter((j) => {
    const d = new Date(j.startDatetime);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;

  return (
    <div>
      {/* Month revenue header */}
      <div className="mb-4 flex items-center gap-4 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-4 text-white">
        <div>
          <p className="text-primary-200 text-xs font-medium uppercase tracking-wider">Monthly Revenue</p>
          <p className="text-2xl font-bold mt-0.5">${totalRevenue.toLocaleString()}</p>
        </div>
        <div className="h-8 w-px bg-white/20" />
        <div>
          <p className="text-primary-200 text-xs font-medium uppercase tracking-wider">Jobs Scheduled</p>
          <p className="text-2xl font-bold mt-0.5">{jobCount}</p>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l border-t border-slate-100 rounded-lg overflow-hidden">
        {cells.map((day, idx) => {
          const isCurrentMonth = day.getMonth() === month;
          const isToday = isSameDay(day, today);
          const dayJobs = jobsOnDay(jobs, day);
          const dayRevenue = revenueForJobs(dayJobs);

          return (
            <div
              key={idx}
              onClick={() => onDayClick(day)}
              className={`min-h-[110px] border-r border-b border-slate-100 p-1.5 cursor-pointer transition-colors group ${
                isCurrentMonth ? "bg-white hover:bg-slate-50" : "bg-slate-50/50 hover:bg-slate-100/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full transition-colors ${
                    isToday
                      ? "bg-primary-600 text-white"
                      : isCurrentMonth
                      ? "text-slate-700 group-hover:bg-slate-200"
                      : "text-slate-300"
                  }`}
                >
                  {day.getDate()}
                </span>
                {dayRevenue > 0 ? (
                  <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    ${dayRevenue.toFixed(0)}
                  </span>
                ) : null}
              </div>
              <div className="space-y-0.5">
                {dayJobs.slice(0, 3).map((job) => {
                  const c = jobColor(job);
                  return (
                    <button
                      key={job.id}
                      onClick={(e) => { e.stopPropagation(); onJobClick(job); }}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium border truncate transition-all hover:opacity-80 ${c.bg} ${c.border} ${c.text}`}
                    >
                      {job.startDatetime ? `${formatTime(job.startDatetime).replace(":00", "")} · ` : ""}
                      {job.customerName || job.jobType}
                    </button>
                  );
                })}
                {dayJobs.length > 3 ? (
                  <p className="text-[10px] text-slate-400 pl-1">+{dayJobs.length - 3} more</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ───────────────────────────────────────────────────────────────

function WeekView({
  currentDate,
  jobs,
  onJobClick,
}: {
  currentDate: Date;
  jobs: CalendarJob[];
  onJobClick: (job: CalendarJob) => void;
}) {
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const totalRevenue = days.reduce((s, d) => s + revenueForJobs(jobsOnDay(jobs, d)), 0);

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-4 text-white">
        <div>
          <p className="text-primary-200 text-xs font-medium uppercase tracking-wider">Weekly Revenue</p>
          <p className="text-2xl font-bold mt-0.5">${totalRevenue.toLocaleString()}</p>
        </div>
        <div className="h-8 w-px bg-white/20" />
        <div>
          <p className="text-primary-200 text-xs font-medium uppercase tracking-wider">Jobs This Week</p>
          <p className="text-2xl font-bold mt-0.5">{days.reduce((s, d) => s + jobsOnDay(jobs, d).length, 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayJobs = jobsOnDay(jobs, day);
          const isToday = isSameDay(day, today);
          const revenue = revenueForJobs(dayJobs);
          return (
            <div key={day.toISOString()} className="min-h-[200px]">
              <div className={`text-center py-2 rounded-t-lg mb-1 ${isToday ? "bg-primary-600 text-white" : "bg-slate-50"}`}>
                <p className={`text-xs font-medium uppercase ${isToday ? "text-primary-200" : "text-slate-400"}`}>{DAYS[day.getDay()]}</p>
                <p className={`text-lg font-bold ${isToday ? "text-white" : "text-slate-800"}`}>{day.getDate()}</p>
                {revenue > 0 ? (
                  <p className={`text-xs font-medium ${isToday ? "text-primary-200" : "text-emerald-600"}`}>${revenue.toFixed(0)}</p>
                ) : null}
              </div>
              <div className="space-y-1">
                {dayJobs.map((job) => {
                  const c = jobColor(job);
                  return (
                    <button
                      key={job.id}
                      onClick={() => onJobClick(job)}
                      className={`w-full text-left p-2 rounded-lg border text-xs transition-all hover:shadow-sm ${c.bg} ${c.border} ${c.text}`}
                    >
                      <p className="font-semibold truncate">{job.customerName || job.jobType}</p>
                      <p className="opacity-70 mt-0.5">{formatTime(job.startDatetime)}</p>
                      {job.total ? <p className="font-medium mt-0.5">{formatMoney(job.total)}</p> : null}
                    </button>
                  );
                })}
                {dayJobs.length === 0 ? (
                  <div className="h-16 border-2 border-dashed border-slate-100 rounded-lg" />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day View ────────────────────────────────────────────────────────────────

function DayView({
  currentDate,
  jobs,
  onJobClick,
}: {
  currentDate: Date;
  jobs: CalendarJob[];
  onJobClick: (job: CalendarJob) => void;
}) {
  const dayJobs = jobsOnDay(jobs, currentDate);
  const revenue = revenueForJobs(dayJobs);
  const isToday = isSameDay(currentDate, new Date());

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-4 text-white">
        <div>
          <p className="text-primary-200 text-xs font-medium uppercase tracking-wider">Today's Revenue</p>
          <p className="text-2xl font-bold mt-0.5">${revenue.toLocaleString()}</p>
        </div>
        <div className="h-8 w-px bg-white/20" />
        <div>
          <p className="text-primary-200 text-xs font-medium uppercase tracking-wider">Jobs</p>
          <p className="text-2xl font-bold mt-0.5">{dayJobs.length}</p>
        </div>
        {isToday ? (
          <>
            <div className="h-8 w-px bg-white/20" />
            <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-xs font-semibold">
              Today
            </div>
          </>
        ) : null}
      </div>

      {dayJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <CalendarDays className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">No jobs scheduled</p>
          <p className="text-sm mt-1">Use the unscheduled panel to add jobs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayJobs
            .sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime())
            .map((job) => {
              const c = jobColor(job);
              const start = new Date(job.startDatetime);
              const end = job.endDatetime ? new Date(job.endDatetime) : null;
              const duration = end ? Math.round((end.getTime() - start.getTime()) / 3600000 * 10) / 10 : null;
              return (
                <button
                  key={job.id}
                  onClick={() => onJobClick(job)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${c.bg} ${c.border}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-base font-bold ${c.text}`}>{job.customerName || "Job"}</p>
                      <p className={`text-sm font-medium opacity-70 ${c.text}`}>{job.jobType}</p>
                    </div>
                    {job.total ? (
                      <span className={`text-lg font-bold ${c.text}`}>{formatMoney(job.total)}</span>
                    ) : null}
                  </div>
                  <div className={`flex items-center gap-4 mt-3 text-sm ${c.text} opacity-70`}>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTime(job.startDatetime)}
                      {end ? ` – ${formatTime(job.endDatetime!)}` : ""}
                    </span>
                    {duration ? <span>{duration}h</span> : null}
                  </div>
                  {job.address ? (
                    <p className={`mt-1.5 text-xs ${c.text} opacity-60 truncate`}>{job.address}</p>
                  ) : null}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}

// ─── Unscheduled Panel ───────────────────────────────────────────────────────

function UnscheduledPanel({
  quotes,
  onSchedule,
}: {
  quotes: UnscheduledQuote[];
  onSchedule: (q: UnscheduledQuote) => void;
}) {
  const navigate = useNavigate();
  if (!quotes.length) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
        <p className="text-sm font-semibold text-amber-900">
          {quotes.length} accepted {quotes.length === 1 ? "quote" : "quotes"} need scheduling
        </p>
      </div>
      <div className="space-y-2">
        {quotes.map((q) => (
          <div key={q.id} className="bg-white rounded-lg border border-amber-100 p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{q.customerName}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {q.options?.[q.selectedOption]?.name || q.selectedOption} · {q.total ? formatMoney(q.total) : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => navigate(`/quotes/${q.id}`)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                title="View quote"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <button
                onClick={() => onSchedule(q)}
                className="flex items-center gap-1 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-3 h-3" />
                Schedule
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Calendar Page ──────────────────────────────────────────────────────

export default function CalendarPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<CalendarView>("month");
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
  const [scheduleQuote, setScheduleQuote] = useState<UnscheduledQuote | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | null>(null);
  const [selectedJob, setSelectedJob] = useState<CalendarJob | null>(null);
  const [rescheduleJob, setRescheduleJob] = useState<CalendarJob | null>(null);

  // Compute date range to fetch
  const { from, to } = useMemo(() => {
    if (view === "month") {
      const y = currentDate.getFullYear();
      const m = currentDate.getMonth();
      return {
        from: new Date(y, m - 1, 1).toISOString(),
        to: new Date(y, m + 2, 0).toISOString(),
      };
    }
    if (view === "week") {
      const ws = startOfWeek(currentDate);
      return {
        from: ws.toISOString(),
        to: addDays(ws, 7).toISOString(),
      };
    }
    return {
      from: startOfDay(currentDate).toISOString(),
      to: addDays(startOfDay(currentDate), 1).toISOString(),
    };
  }, [view, currentDate]);

  const { data: jobs = [] } = useQuery<CalendarJob[]>({
    queryKey: ["/api/jobs/calendar", from, to],
    queryFn: () =>
      fetch(`/api/jobs/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
        credentials: "include",
      }).then((r) => r.json()),
  });

  const { data: unscheduled = [] } = useQuery<UnscheduledQuote[]>({
    queryKey: ["/api/quotes/unscheduled-accepted"],
    queryFn: () =>
      fetch("/api/quotes/unscheduled-accepted", { credentials: "include" }).then((r) => r.json()),
  });

  // Navigation
  const navigate_ = useCallback(
    (dir: -1 | 1) => {
      setCurrentDate((d) => {
        if (view === "month") {
          const c = new Date(d);
          c.setMonth(c.getMonth() + dir);
          return c;
        }
        if (view === "week") return addDays(d, dir * 7);
        return addDays(d, dir);
      });
    },
    [view]
  );

  const headerLabel = useMemo(() => {
    if (view === "month") return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (view === "week") {
      const ws = startOfWeek(currentDate);
      const we = addDays(ws, 6);
      if (ws.getMonth() === we.getMonth())
        return `${MONTHS[ws.getMonth()]} ${ws.getDate()}–${we.getDate()}, ${ws.getFullYear()}`;
      return `${MONTHS[ws.getMonth()]} ${ws.getDate()} – ${MONTHS[we.getMonth()]} ${we.getDate()}, ${ws.getFullYear()}`;
    }
    return currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }, [view, currentDate]);

  const handleDayClick = (day: Date) => {
    if (view === "month") {
      setCurrentDate(day);
      setView("day");
    }
  };

  const handleJobClick = (job: CalendarJob) => setSelectedJob(job);

  const handleScheduleFromUnscheduled = (q: UnscheduledQuote) => {
    setScheduleQuote(q);
    setScheduleDate(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <PageHeader title="Schedule" />

      {/* Unscheduled accepted quotes banner */}
      <UnscheduledPanel quotes={unscheduled} onSchedule={handleScheduleFromUnscheduled} />

      <Card>
        {/* Calendar toolbar */}
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          {/* View switcher */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
            {(["month", "week", "day"] as CalendarView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  view === v
                    ? "bg-white shadow-sm text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {v === "month" ? <LayoutGrid className="w-3.5 h-3.5" /> : v === "week" ? <Calendar className="w-3.5 h-3.5" /> : <CalendarDays className="w-3.5 h-3.5" />}
                <span className="capitalize">{v}</span>
              </button>
            ))}
          </div>

          {/* Nav controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(startOfDay(new Date()))}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Today
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate_(-1)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => navigate_(1)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            <h2 className="text-base font-semibold text-slate-800 min-w-[180px] text-center">{headerLabel}</h2>
          </div>
        </div>

        {/* Calendar view */}
        {view === "month" ? (
          <MonthView currentDate={currentDate} jobs={jobs} onDayClick={handleDayClick} onJobClick={handleJobClick} />
        ) : view === "week" ? (
          <WeekView currentDate={currentDate} jobs={jobs} onJobClick={handleJobClick} />
        ) : (
          <DayView currentDate={currentDate} jobs={jobs} onJobClick={handleJobClick} />
        )}
      </Card>

      {/* Schedule modal */}
      {scheduleQuote ? (
        <ScheduleModal
          quote={scheduleQuote}
          preselectedDate={scheduleDate}
          onClose={() => setScheduleQuote(null)}
          onScheduled={() => setScheduleQuote(null)}
        />
      ) : null}

      {/* Job detail drawer */}
      {selectedJob && !rescheduleJob ? (
        <JobDrawer
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onReschedule={(j) => { setRescheduleJob(j); setSelectedJob(null); }}
          onNavigate={(id) => { setSelectedJob(null); navigate(`/jobs/${id}`); }}
        />
      ) : null}

      {/* Reschedule modal */}
      {rescheduleJob ? (
        <RescheduleModal
          job={rescheduleJob}
          onClose={() => setRescheduleJob(null)}
          onSaved={() => setRescheduleJob(null)}
        />
      ) : null}
    </div>
  );
}
