import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle, CalendarDays, Clock } from "lucide-react";

const DAY_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function JobCard({ job }: { job: any }) {
  const dt = new Date(job.startDatetime);
  const time = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const day = DAY_ORDER[dt.getDay()];
  const mapUrl = job.address ? `https://maps.google.com/?q=${encodeURIComponent(job.address)}` : null;
  const teammates = (job.teamMemberNames || []).filter((n: string) => n !== "");

  return (
    <div className="border-l-4 border-indigo-400 pl-4 py-2">
      <div className="font-semibold text-slate-800">{time} — {job.customerName || "Client"}</div>
      {job.address ? (
        <div className="text-slate-500 text-sm mt-0.5">
          {job.address}
          {mapUrl ? <> · <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline-offset-2 underline text-xs">Directions</a></> : null}
        </div>
      ) : null}
      {job.jobType ? <div className="text-slate-500 text-sm">Service: {job.jobType}</div> : null}
      {teammates.length > 0 ? <div className="text-slate-500 text-sm">Teammate{teammates.length > 1 ? "s" : ""}: {teammates.join(", ")}</div> : null}
      {job.cleanerNotes ? (
        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
          Note: {job.cleanerNotes}
        </div>
      ) : null}
    </div>
  );
}

export default function ScheduleAckPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [submitted, setSubmitted] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(searchParams.get("flag") === "1");
  const [issueMessage, setIssueMessage] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading, isError } = useQuery<any>({
    queryKey: ["/api/schedule/ack", token],
    queryFn: () => fetch(`/api/schedule/ack/${token}`).then(r => {
      if (!r.ok) throw new Error("Not found");
      return r.json();
    }),
  });

  const ackMutation = useMutation({
    mutationFn: async (body: { action: string; issueMessage?: string }) => {
      const res = await fetch(`/api/schedule/ack/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to submit");
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
    onError: () => setError("Failed to submit response. Please try again."),
  });

  const handleAck = (action: "acknowledged" | "issue" | "unavailable", msg?: string) => {
    setError("");
    ackMutation.mutate({ action, issueMessage: msg || "" });
  };

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (isError) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Schedule Not Found</h2>
        <p className="text-slate-500 text-sm">This link may have expired or is invalid. Contact your office for your schedule.</p>
      </div>
    </div>
  );

  if (submitted || data?.ackStatus === "acknowledged") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Got it, {data?.cleanerName}!</h2>
        <p className="text-slate-500 text-sm">Your schedule for <strong>{data?.weekLabel}</strong> has been acknowledged. See you out there!</p>
      </div>
    </div>
  );

  // Group jobs by day
  const jobs: any[] = data?.jobs || [];
  const grouped: Record<string, any[]> = {};
  for (const j of jobs) {
    const day = DAY_ORDER[new Date(j.startDatetime).getDay()];
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(j);
  }
  const daysWithJobs = DAY_ORDER.filter(d => grouped[d]);
  const totalJobs = jobs.length;
  const estHours = jobs.reduce((a, j) => a + (j.durationHours || 3), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-8 text-white">
        <div className="max-w-lg mx-auto">
          <p className="text-indigo-200 text-sm font-medium mb-1">Your Schedule</p>
          <h1 className="text-2xl font-bold mb-1">{data?.weekLabel}</h1>
          <p className="text-indigo-200 text-sm">Hi {data?.cleanerName}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-6">
        {/* Already flagged / unavailable state */}
        {(data?.ackStatus === "issue" || data?.ackStatus === "unavailable") && !submitted ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-800 font-semibold text-sm">
              {data?.ackStatus === "issue" ? "You previously flagged an issue with this schedule." : "You marked yourself as unavailable."}
            </p>
          </div>
        ) : null}

        {/* Summary */}
        <div className="flex gap-4">
          <div className="flex-1 bg-white rounded-xl border border-slate-100 p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-slate-900">{totalJobs}</div>
            <div className="text-xs text-slate-500 mt-0.5">Jobs</div>
          </div>
          <div className="flex-1 bg-white rounded-xl border border-slate-100 p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-slate-900">{estHours.toFixed(1)}</div>
            <div className="text-xs text-slate-500 mt-0.5">Est. Hours</div>
          </div>
          <div className="flex-1 bg-white rounded-xl border border-slate-100 p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-slate-900">{daysWithJobs.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">Days</div>
          </div>
        </div>

        {/* Schedule by day */}
        {daysWithJobs.map(day => (
          <div key={day} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{day}</h3>
            </div>
            <div className="px-4 py-3 space-y-4">
              {(grouped[day] || []).sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()).map((j, i) => (
                <JobCard key={i} job={j} />
              ))}
            </div>
          </div>
        ))}

        {jobs.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No jobs found for this week</p>
          </div>
        ) : null}

        {/* Acknowledge / Flag section */}
        {showIssueForm ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-slate-800">Flag an Issue</h3>
            <textarea
              value={issueMessage}
              onChange={e => setIssueMessage(e.target.value)}
              placeholder="Describe the issue (e.g. conflict, I can't make Tuesday, etc.)"
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            {error ? <p className="text-rose-600 text-sm">{error}</p> : null}
            <div className="flex gap-3">
              <button
                onClick={() => handleAck("issue", issueMessage)}
                disabled={ackMutation.isPending}
                className="flex-1 py-3 bg-rose-600 text-white font-semibold rounded-xl text-sm hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {ackMutation.isPending ? "Submitting..." : "Submit Issue"}
              </button>
              <button
                onClick={() => setShowIssueForm(false)}
                className="px-4 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h3 className="font-bold text-slate-800">Confirm Your Schedule</h3>
            <p className="text-slate-500 text-sm">Review your jobs above and let us know you're good to go.</p>
            {error ? <p className="text-rose-600 text-sm">{error}</p> : null}
            <button
              onClick={() => handleAck("acknowledged")}
              disabled={ackMutation.isPending}
              className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl text-base hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              {ackMutation.isPending ? "Confirming..." : "Acknowledge Schedule"}
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setShowIssueForm(true)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl text-sm hover:bg-slate-50 transition-colors"
              >
                Flag an Issue
              </button>
              <button
                onClick={() => handleAck("unavailable")}
                disabled={ackMutation.isPending}
                className="flex-1 py-2.5 border border-amber-200 text-amber-700 font-medium rounded-xl text-sm hover:bg-amber-50 transition-colors"
              >
                I'm Unavailable
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
