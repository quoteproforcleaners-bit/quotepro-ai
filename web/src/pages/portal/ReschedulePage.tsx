import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";

function getNext30Days(): Date[] {
  const days: Date[] = [];
  const now = new Date();
  for (let i = 1; i <= 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    if (d.getDay() !== 0) days.push(d); // exclude Sundays
  }
  return days;
}

function formatDateLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatDateValue(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function ReschedulePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("either");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  const { data: portal } = useQuery({
    queryKey: ["/api/portal", token],
    queryFn: async () => {
      const res = await fetch(`/api/portal/${token}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    staleTime: 60000,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/portal/${token}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: portal?.nextJob?.id || null,
          requestedDate: selectedDate,
          preferredTime,
          customerNote: note,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      return res.json();
    },
    onSuccess: () => setDone(true),
  });

  const accentColor = portal?.business?.primaryColor || "#2563EB";
  const days = getNext30Days();

  const chipBase = (active: boolean): React.CSSProperties => ({
    padding: "12px 16px",
    borderRadius: 12,
    border: `1.5px solid ${active ? accentColor : "#e2e8f0"}`,
    background: active ? `${accentColor}15` : "#fff",
    color: active ? accentColor : "#64748b",
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    flex: 1,
    minHeight: 48,
  });

  if (done) {
    return (
      <div style={{ background: "#f8fafc", minHeight: "100vh", maxWidth: 480, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>✓</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Request Sent!</h2>
          <p style={{ fontSize: 15, color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>
            {portal?.business?.name} will confirm your new date shortly.
          </p>
          <button
            onClick={() => navigate(`/home/${token}`)}
            style={{ padding: "14px 32px", borderRadius: 12, background: accentColor, color: "#fff", border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer" }}
          >
            Back to Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`* { box-sizing: border-box; } body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }`}</style>
      <div style={{ background: "#f8fafc", minHeight: "100vh", maxWidth: 480, margin: "0 auto", paddingBottom: 32 }}>
        {/* Header */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "16px 16px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => navigate(`/home/${token}`)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#64748b", padding: 0 }}>
            ←
          </button>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Reschedule Clean</h1>
        </div>

        <div style={{ padding: 16 }}>
          {portal?.nextJob && (
            <div style={{ background: "#eff6ff", border: "1px solid #dbeafe", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 14, color: "#1e40af" }}>
                <strong>Rescheduling:</strong>{" "}
                {new Date(portal.nextJob.startDatetime).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                {" "}at{" "}
                {new Date(portal.nextJob.startDatetime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          )}

          {/* Date picker */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <p style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Choose a new date</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {days.map((d) => {
                const val = formatDateValue(d);
                const active = selectedDate === val;
                return (
                  <button
                    key={val}
                    onClick={() => setSelectedDate(val)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1.5px solid ${active ? accentColor : "#e2e8f0"}`,
                      background: active ? `${accentColor}15` : "#fff",
                      color: active ? accentColor : "#334155",
                      fontSize: 13,
                      fontWeight: active ? 700 : 400,
                      cursor: "pointer",
                      textAlign: "left",
                      minHeight: 44,
                    }}
                  >
                    {formatDateLabel(d)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferred time */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <p style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Preferred time</p>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { value: "morning", label: "Morning\n8am–12pm" },
                { value: "afternoon", label: "Afternoon\n12pm–4pm" },
                { value: "either", label: "Either\ntime" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPreferredTime(opt.value)}
                  style={chipBase(preferredTime === opt.value)}
                >
                  {opt.label.split("\n").map((line, i) => (
                    <span key={i} style={{ display: "block", fontSize: i === 1 ? 12 : 14 }}>{line}</span>
                  ))}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, marginBottom: 24 }}>
            <p style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Anything we should know?</p>
            <textarea
              placeholder="I have a work call until 11am, please come after..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 15, color: "#0f172a", background: "#fff", outline: "none", minHeight: 80, resize: "vertical", boxSizing: "border-box" }}
            />
          </div>

          <button
            onClick={() => mutation.mutate()}
            disabled={!selectedDate || mutation.isPending}
            style={{
              width: "100%", padding: "15px", borderRadius: 14, background: accentColor, color: "#fff",
              border: "none", fontSize: 16, fontWeight: 700, cursor: selectedDate ? "pointer" : "not-allowed",
              minHeight: 52, opacity: !selectedDate || mutation.isPending ? 0.6 : 1,
            }}
          >
            {mutation.isPending ? "Sending..." : "Request Reschedule"}
          </button>
        </div>
      </div>
    </>
  );
}
