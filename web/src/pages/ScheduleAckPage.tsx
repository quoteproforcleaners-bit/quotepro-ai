import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, MapPin, Clock, Users, FileText, ChevronDown, ChevronUp, X } from "lucide-react";

const DAY_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const JOB_TYPE_LABEL: Record<string, string> = {
  regular: "Regular Clean",
  deep_clean: "Deep Clean",
  move_out: "Move-Out Clean",
  move_in: "Move-In Clean",
  post_construction: "Post-Construction",
  office: "Office Clean",
  airbnb: "Airbnb Turnover",
  other: "Other",
};

function formatDuration(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function JobCard({ job, myName }: { job: any; myName: string }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const dt = new Date(job.startDatetime);
  const time = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const endDt = job.endDatetime ? new Date(job.endDatetime) : null;
  const endTime = endDt ? endDt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : null;
  const mapUrl = job.address ? `https://maps.google.com/?q=${encodeURIComponent(job.address)}` : null;
  const teammates = (job.teamMemberNames || []).filter((n: string) => n && n !== myName);
  const label = JOB_TYPE_LABEL[job.jobType] || job.jobType || "Clean";

  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8eaed", overflow: "hidden", marginBottom: 12 }}>
      {/* Time bar */}
      <div style={{ background: "#f8f9fa", padding: "12px 16px", borderBottom: "1px solid #e8eaed", display: "flex", alignItems: "center", gap: 8 }}>
        <Clock size={14} color="#6b7280" />
        <span style={{ fontSize: 15, fontWeight: 700, color: "#111827", letterSpacing: "-0.01em" }}>
          {time}{endTime ? ` – ${endTime}` : ""}
        </span>
        {job.durationHours ? (
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>
            {formatDuration(job.durationHours)}
          </span>
        ) : null}
      </div>

      {/* Job info */}
      <div style={{ padding: "14px 16px" }}>
        {/* Service type badge */}
        <div style={{ display: "inline-block", fontSize: 11, fontWeight: 600, color: "#4f46e5", background: "#eef2ff", borderRadius: 6, padding: "3px 8px", marginBottom: 10, letterSpacing: "0.02em", textTransform: "uppercase" }}>
          {label}
        </div>

        {/* Address */}
        {job.address ? (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
            <MapPin size={16} color="#9ca3af" style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 15, color: "#111827", fontWeight: 500, lineHeight: 1.4 }}>{job.address}</div>
              {mapUrl ? (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 13, color: "#4f46e5", textDecoration: "none", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 3, marginTop: 3 }}
                >
                  Get directions
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Teammates */}
        {teammates.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Users size={15} color="#9ca3af" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: "#6b7280" }}>
              With {teammates.join(" & ")}
            </span>
          </div>
        ) : null}

        {/* Notes toggle */}
        {job.cleanerNotes ? (
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => setNoteOpen(o => !o)}
              style={{ background: "none", border: "none", padding: "6px 0", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#92400e" }}
            >
              <FileText size={13} color="#92400e" />
              Note from office
              {noteOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {noteOpen ? (
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "#78350f", lineHeight: 1.5, marginTop: 4 }}>
                {job.cleanerNotes}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DaySection({ day, jobs, myName }: { day: string; jobs: any[]; myName: string }) {
  const sorted = [...jobs].sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime());
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>{day}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", background: "#f3f4f6", borderRadius: 20, padding: "2px 10px" }}>
          {sorted.length} job{sorted.length !== 1 ? "s" : ""}
        </div>
      </div>
      {sorted.map((j, i) => <JobCard key={i} job={j} myName={myName} />)}
    </div>
  );
}

function IssueSheet({ onSubmit, onCancel, isPending }: { onSubmit: (msg: string) => void; onCancel: () => void; isPending: boolean }) {
  const [msg, setMsg] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "#fff", width: "100%", maxWidth: 480, borderRadius: "20px 20px 0 0", padding: "28px 20px 40px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>Flag an Issue</div>
          <button onClick={onCancel} style={{ background: "#f3f4f6", border: "none", borderRadius: 20, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={16} color="#6b7280" />
          </button>
        </div>
        <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16, lineHeight: 1.5 }}>
          Tell your office what's going on — they'll get back to you.
        </p>
        <textarea
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder="e.g. I can't make Tuesday, I have a conflict with the Thursday morning job..."
          rows={4}
          style={{ width: "100%", padding: "12px 14px", border: "2px solid #e5e7eb", borderRadius: 12, fontSize: 15, color: "#111827", outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.5 }}
          autoFocus
        />
        <button
          onClick={() => onSubmit(msg)}
          disabled={isPending || !msg.trim()}
          style={{ marginTop: 14, width: "100%", background: isPending || !msg.trim() ? "#e5e7eb" : "#dc2626", color: isPending || !msg.trim() ? "#9ca3af" : "#fff", border: "none", borderRadius: 14, padding: "16px 0", fontSize: 16, fontWeight: 700, cursor: isPending || !msg.trim() ? "not-allowed" : "pointer", transition: "background 0.15s" }}
        >
          {isPending ? "Sending..." : "Send to Office"}
        </button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100dvh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#4f46e5", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ErrorScreen({ message }: { message?: string }) {
  return (
    <div style={{ minHeight: "100dvh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ textAlign: "center", maxWidth: 320 }}>
        <div style={{ width: 56, height: 56, background: "#fee2e2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <AlertTriangle size={24} color="#dc2626" />
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Link Not Found</div>
        <div style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.6 }}>
          {message || "This link may be expired or invalid. Contact your office for your schedule."}
        </div>
      </div>
    </div>
  );
}

function ConfirmedScreen({ name, weekLabel, ackStatus, issueMessage }: { name: string; weekLabel: string; ackStatus: string; issueMessage?: string }) {
  if (ackStatus === "issue") {
    return (
      <div style={{ minHeight: "100dvh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <div style={{ width: 64, height: 64, background: "#fef3c7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <AlertTriangle size={30} color="#d97706" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Issue Reported</div>
          <div style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.6, marginBottom: 16 }}>
            Your office has been notified about your schedule for <strong>{weekLabel}</strong>.
          </div>
          {issueMessage ? (
            <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 14px", fontSize: 14, color: "#78350f", textAlign: "left", lineHeight: 1.5 }}>
              "{issueMessage}"
            </div>
          ) : null}
        </div>
      </div>
    );
  }
  if (ackStatus === "unavailable") {
    return (
      <div style={{ minHeight: "100dvh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <div style={{ width: 64, height: 64, background: "#fee2e2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <X size={30} color="#dc2626" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Marked Unavailable</div>
          <div style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.6 }}>
            Your office knows you're unavailable for this week. They'll follow up with you.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ minHeight: "100dvh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ textAlign: "center", maxWidth: 320 }}>
        <div style={{ width: 64, height: 64, background: "#d1fae5", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <CheckCircle2 size={32} color="#059669" />
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", marginBottom: 8 }}>You're confirmed!</div>
        <div style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.6 }}>
          Thanks, <strong>{name}</strong>. Your schedule for <strong>{weekLabel}</strong> is confirmed. See you out there.
        </div>
      </div>
    </div>
  );
}

export default function ScheduleAckPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const [showIssue, setShowIssue] = useState(searchParams.get("flag") === "1");
  const [done, setDone] = useState<{ status: string; msg?: string } | null>(null);
  const [error, setError] = useState("");

  const { data, isLoading, isError } = useQuery<any>({
    queryKey: ["/api/schedule/ack", token],
    queryFn: () =>
      fetch(`/api/schedule/ack/${token}`).then(r => {
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
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (_r, vars) => {
      setShowIssue(false);
      setDone({ status: vars.action, msg: vars.issueMessage });
    },
    onError: () => setError("Something went wrong. Please try again."),
  });

  if (isLoading) return <LoadingScreen />;
  if (isError) return <ErrorScreen />;

  const alreadyDone = done || (data?.ackStatus && data.ackStatus !== "pending");
  if (alreadyDone) {
    const status = done?.status || data?.ackStatus;
    const msg = done?.msg || data?.issueMessage;
    return <ConfirmedScreen name={data?.cleanerName || ""} weekLabel={data?.weekLabel || ""} ackStatus={status} issueMessage={msg} />;
  }

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
  const myName = data?.cleanerName || "";

  return (
    <div style={{ minHeight: "100dvh", background: "#f9fafb", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Issue sheet overlay */}
      {showIssue ? (
        <IssueSheet
          isPending={ackMutation.isPending}
          onCancel={() => setShowIssue(false)}
          onSubmit={msg => ackMutation.mutate({ action: "issue", issueMessage: msg })}
        />
      ) : null}

      {/* Header */}
      <div style={{ background: "#4f46e5", padding: "28px 20px 24px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
            Your Schedule
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
            {data?.weekLabel}
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
            Hi {myName}
          </div>
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", padding: "0 20px" }}>
          {[
            { value: totalJobs, label: "Jobs" },
            { value: `${estHours.toFixed(1)}h`, label: "Est. hours" },
            { value: daysWithJobs.length, label: "Days" },
          ].map(({ value, label }) => (
            <div key={label} style={{ flex: 1, textAlign: "center", padding: "14px 0" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>{value}</div>
              <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px 180px" }}>
        {/* Updated banner */}
        {data?.isUpdate ? (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertTriangle size={16} color="#d97706" style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontSize: 14, color: "#92400e", lineHeight: 1.5 }}>
              <strong>Schedule updated.</strong> Your office has made changes — please review carefully.
            </div>
          </div>
        ) : null}

        {/* Days */}
        {daysWithJobs.length > 0
          ? daysWithJobs.map(day => <DaySection key={day} day={day} jobs={grouped[day]} myName={myName} />)
          : (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}>
              <div style={{ fontSize: 15 }}>No jobs found for this week.</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Contact your office for details.</div>
            </div>
          )
        }
      </div>

      {/* Sticky bottom CTA */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #e5e7eb", padding: "16px 20px 32px", zIndex: 20 }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          {error ? (
            <div style={{ fontSize: 13, color: "#dc2626", marginBottom: 10, textAlign: "center" }}>{error}</div>
          ) : null}
          <button
            onClick={() => ackMutation.mutate({ action: "acknowledged" })}
            disabled={ackMutation.isPending}
            style={{
              width: "100%",
              background: ackMutation.isPending ? "#a5b4fc" : "#4f46e5",
              color: "#fff",
              border: "none",
              borderRadius: 14,
              padding: "17px 0",
              fontSize: 17,
              fontWeight: 700,
              cursor: ackMutation.isPending ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              letterSpacing: "-0.01em",
              transition: "background 0.15s",
            }}
          >
            <CheckCircle2 size={20} />
            {ackMutation.isPending ? "Confirming..." : "Got It — I'm Good to Go"}
          </button>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button
              onClick={() => setShowIssue(true)}
              style={{ flex: 1, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer" }}
            >
              Flag an Issue
            </button>
            <button
              onClick={() => ackMutation.mutate({ action: "unavailable" })}
              disabled={ackMutation.isPending}
              style={{ flex: 1, background: "#f9fafb", border: "1px solid #fecaca", borderRadius: 12, padding: "13px 0", fontSize: 14, fontWeight: 600, color: "#dc2626", cursor: "pointer" }}
            >
              I'm Unavailable
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
