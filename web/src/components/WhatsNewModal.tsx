import { useEffect, useState } from "react";
import { X, Sparkles } from "lucide-react";

const CURRENT_VERSION = "2026.04";

const WHATS_NEW: { title: string; desc: string; badge?: string }[] = [
  {
    title: "Autopilot Lead Nurturing",
    desc: "4-step AI pipeline that qualifies leads, sends quotes, follows up, and requests reviews — fully automated.",
    badge: "New",
  },
  {
    title: "Photo-to-Quote",
    desc: "Snap a photo of any room and AI generates an accurate quote in seconds. No more in-person estimates for basic jobs.",
    badge: "New",
  },
  {
    title: "Multi-Location Support",
    desc: "Manage multiple service areas from one account — assign staff, quotes, and jobs per location.",
    badge: "New",
  },
  {
    title: "Booking Widget",
    desc: "Embed a 'Book Now' button on your website. Customers pick a date and service without calling you.",
    badge: "New",
  },
  {
    title: "Staff Field Mode",
    desc: "Cleaners log in with a PIN on their phone. Clock in/out, view jobs, mark tasks complete — no account needed.",
    badge: "New",
  },
];

export default function WhatsNewModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const key = `whatsNew_seen_${CURRENT_VERSION}`;
    if (!localStorage.getItem(key)) {
      // Small delay so it doesn't pop immediately on load
      const t = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(`whatsNew_seen_${CURRENT_VERSION}`, "1");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "460px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
            padding: "24px 24px 20px",
            position: "relative",
          }}
        >
          <button
            onClick={dismiss}
            style={{
              position: "absolute", top: 14, right: 14,
              background: "rgba(255,255,255,0.15)",
              border: "none", borderRadius: "8px",
              width: 28, height: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "#fff",
            }}
          >
            <X size={14} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "10px",
              background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Sparkles size={16} color="#fff" />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              What's New in QuotePro
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>
            5 new features just shipped
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
            April 2026 update — here's everything that's new.
          </p>
        </div>

        {/* Feature list */}
        <div style={{ padding: "8px 0", maxHeight: 340, overflowY: "auto" }}>
          {WHATS_NEW.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex", gap: "14px", alignItems: "flex-start",
                padding: "14px 24px",
                borderBottom: i < WHATS_NEW.length - 1 ? "0.5px solid #f1f5f9" : "none",
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#2563eb",
                marginTop: 6, flexShrink: 0,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{item.title}</span>
                  {item.badge && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: "#2563eb",
                      background: "#eff6ff", border: "0.5px solid #bfdbfe",
                      borderRadius: "4px", padding: "1px 5px",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "0.5px solid #f1f5f9" }}>
          <button
            onClick={dismiss}
            style={{
              width: "100%", height: 44,
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              fontSize: 14, fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Got it — let's go
          </button>
        </div>
      </div>
    </div>
  );
}
