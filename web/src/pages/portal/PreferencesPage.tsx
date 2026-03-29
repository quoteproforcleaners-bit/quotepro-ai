import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";

interface PortalPrefs {
  hasPets: boolean;
  petCount: number;
  petType: string;
  petNotes: string;
  accessMethod: string;
  accessCode: string;
  accessLocation: string;
  specialInstructions: string;
  areasToSkip: string[];
}

const AREA_OPTIONS = ["Basement", "Garage", "Office", "Guest Room", "Attic", "Other"];
const ACCESS_OPTIONS = [
  { value: "home", label: "Someone is home" },
  { value: "key_mat", label: "Key under mat" },
  { value: "lockbox", label: "Lockbox" },
  { value: "hide_key", label: "Hide-a-key (describe location)" },
  { value: "garage", label: "Garage code" },
];

export default function PreferencesPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [toast, setToast] = useState("");

  const { data: portal } = useQuery({
    queryKey: ["/api/portal", token],
    queryFn: async () => {
      const res = await fetch(`/api/portal/${token}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    staleTime: 60000,
  });

  const existing = portal?.customer?.preferences;

  const [prefs, setPrefs] = useState<PortalPrefs>({
    hasPets: false,
    petCount: 1,
    petType: "dog",
    petNotes: "",
    accessMethod: "home",
    accessCode: "",
    accessLocation: "",
    specialInstructions: "",
    areasToSkip: [],
  });

  useEffect(() => {
    if (existing) setPrefs({ ...prefs, ...existing });
  }, [existing]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/portal/${token}/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: prefs }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      setToast("Preferences saved! Your cleaner will see these before their next visit.");
      setTimeout(() => navigate(`/home/${token}`), 2000);
    },
  });

  const accentColor = portal?.business?.primaryColor || "#2563EB";

  const input: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    fontSize: 15,
    color: "#0f172a",
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
  };

  const chipBase = (active: boolean): React.CSSProperties => ({
    padding: "8px 16px",
    borderRadius: 20,
    border: `1.5px solid ${active ? accentColor : "#e2e8f0"}`,
    background: active ? `${accentColor}15` : "#fff",
    color: active ? accentColor : "#64748b",
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
    whiteSpace: "nowrap",
  });

  const toggleArea = (a: string) => {
    setPrefs((p) => ({
      ...p,
      areasToSkip: p.areasToSkip.includes(a) ? p.areasToSkip.filter((x) => x !== a) : [...p.areasToSkip, a],
    }));
  };

  return (
    <>
      <style>{`* { box-sizing: border-box; } body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }`}</style>

      {toast && (
        <div style={{
          position: "fixed", top: 16, left: 16, right: 16, zIndex: 200,
          background: "#16a34a", color: "#fff", borderRadius: 12, padding: "14px 16px",
          fontSize: 14, fontWeight: 600, textAlign: "center", maxWidth: 480, margin: "0 auto",
        }}>
          {toast}
        </div>
      )}

      <div style={{ background: "#f8fafc", minHeight: "100vh", maxWidth: 480, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "16px 16px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate(`/home/${token}`)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#64748b", padding: 0, display: "flex", alignItems: "center" }}
          >
            ←
          </button>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Home Preferences</h1>
        </div>

        <div style={{ padding: 16 }}>
          {/* 1. Pets */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Pets</p>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <span style={{ fontSize: 14, color: "#64748b" }}>Do you have pets?</span>
                <div
                  onClick={() => setPrefs((p) => ({ ...p, hasPets: !p.hasPets }))}
                  style={{
                    width: 44, height: 26, borderRadius: 13,
                    background: prefs.hasPets ? accentColor : "#d1d5db",
                    position: "relative", cursor: "pointer", transition: "background 0.2s",
                  }}
                >
                  <div style={{
                    position: "absolute", top: 3, left: prefs.hasPets ? 21 : 3,
                    width: 20, height: 20, borderRadius: "50%", background: "#fff",
                    transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }} />
                </div>
              </label>
            </div>

            {prefs.hasPets && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>How many?</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => setPrefs((p) => ({ ...p, petCount: Math.max(1, p.petCount - 1) }))} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
                    <span style={{ fontSize: 16, fontWeight: 700, minWidth: 24, textAlign: "center" }}>{prefs.petCount}</span>
                    <button onClick={() => setPrefs((p) => ({ ...p, petCount: Math.min(10, p.petCount + 1) }))} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {["Dog", "Cat", "Both", "Other"].map((t) => (
                    <button key={t} onClick={() => setPrefs((p) => ({ ...p, petType: t.toLowerCase() }))} style={chipBase(prefs.petType === t.toLowerCase())}>
                      {t}
                    </button>
                  ))}
                </div>

                <textarea
                  placeholder="Crated during clean, friendly but excitable..."
                  value={prefs.petNotes}
                  onChange={(e) => setPrefs((p) => ({ ...p, petNotes: e.target.value }))}
                  style={{ ...input, minHeight: 80, resize: "vertical" }}
                />
              </div>
            )}
          </div>

          {/* 2. Access */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <p style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Home Access</p>
            <p style={{ margin: "0 0 10px", fontSize: 14, color: "#64748b" }}>How do we access your home?</p>
            {ACCESS_OPTIONS.map((opt) => (
              <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", cursor: "pointer", borderBottom: "1px solid #f8fafc" }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  border: `2px solid ${prefs.accessMethod === opt.value ? accentColor : "#d1d5db"}`,
                  background: prefs.accessMethod === opt.value ? accentColor : "#fff",
                  flexShrink: 0,
                }}
                  onClick={() => setPrefs((p) => ({ ...p, accessMethod: opt.value }))}
                />
                <span style={{ fontSize: 14, color: "#334155" }}>{opt.label}</span>
              </label>
            ))}

            {(prefs.accessMethod === "lockbox" || prefs.accessMethod === "garage") && (
              <input
                type="text"
                placeholder="Enter code"
                value={prefs.accessCode}
                onChange={(e) => setPrefs((p) => ({ ...p, accessCode: e.target.value }))}
                style={{ ...input, marginTop: 12 }}
              />
            )}

            {prefs.accessMethod === "hide_key" && (
              <input
                type="text"
                placeholder="Describe location (e.g., behind the blue pot by the door)"
                value={prefs.accessLocation}
                onChange={(e) => setPrefs((p) => ({ ...p, accessLocation: e.target.value }))}
                style={{ ...input, marginTop: 12 }}
              />
            )}
          </div>

          {/* 3. Special Instructions */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, marginBottom: 12 }}>
            <p style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Anything we should know?</p>
            <textarea
              placeholder="Focus on the kitchen this visit, avoid the home office, please use unscented products..."
              value={prefs.specialInstructions}
              onChange={(e) => setPrefs((p) => ({ ...p, specialInstructions: e.target.value }))}
              style={{ ...input, minHeight: 100, resize: "vertical" }}
            />
          </div>

          {/* 4. Areas to Skip */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, marginBottom: 24 }}>
            <p style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Any areas to skip?</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {AREA_OPTIONS.map((a) => (
                <button key={a} onClick={() => toggleArea(a)} style={chipBase(prefs.areasToSkip.includes(a))}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            style={{
              width: "100%", padding: "15px", borderRadius: 14, background: accentColor, color: "#fff",
              border: "none", fontSize: 16, fontWeight: 700, cursor: "pointer", minHeight: 52,
              opacity: mutation.isPending ? 0.7 : 1,
            }}
          >
            {mutation.isPending ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </>
  );
}
