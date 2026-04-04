import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Delete } from "lucide-react";
import { loginEmployee, setToken, isLoggedIn } from "../../lib/employeeApi";

const PIN_PAD = [
  ["1", ""],    ["2", "ABC"], ["3", "DEF"],
  ["4", "GHI"], ["5", "JKL"], ["6", "MNO"],
  ["7", "PQRS"],["8", "TUV"], ["9", "WXYZ"],
  ["", ""],     ["0", ""],    ["⌫", ""],
];

export default function EmployeeLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"email" | "pin">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) navigate("/employee/home", { replace: true });
  }, [navigate]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    setError(null);
    setStep("pin");
  };

  const submitPin = async (pinToSubmit: string) => {
    if (pinToSubmit.length < 4) return;
    setLoading(true);
    setError(null);
    try {
      const result = await loginEmployee(email.trim(), pinToSubmit);
      setToken(result.token, result.employee);
      navigate("/employee/home", { replace: true });
    } catch (err: any) {
      setError(err.message || "Incorrect PIN");
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const handlePinKey = (key: string) => {
    if (loading) return;
    if (key === "⌫") {
      setPin((p) => p.slice(0, -1));
      setError(null);
      return;
    }
    if (!key) return;
    const next = pin + key;
    if (next.length > 6) return;
    setPin(next);
    // Auto-submit at exactly 6 digits
    if (next.length === 6) {
      submitPin(next);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoText}>QuotePro</span>
          <span style={styles.logoSub}>Employee Portal</span>
        </div>
      </div>

      {step === "email" ? (
        <form onSubmit={handleEmailSubmit} style={styles.form}>
          <h2 style={styles.heading}>Welcome back</h2>
          <p style={styles.subtext}>Enter your work email to continue</p>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            autoFocus
            autoComplete="email"
            style={styles.emailInput}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.continueBtn}>
            Continue
          </button>

          <p style={styles.helpText}>
            Don't have an account?{" "}
            <span style={{ color: "#0F6E56" }}>Contact your manager</span>
          </p>
        </form>
      ) : (
        <div style={styles.pinSection}>
          <button
            onClick={() => { setStep("email"); setPin(""); setError(null); }}
            style={styles.backBtn}
          >
            ← {email}
          </button>

          <h2 style={styles.heading}>Enter your PIN</h2>
          <p style={styles.subtext}>4–6 digit PIN</p>

          {/* PIN dots */}
          <div style={{ ...styles.dots, animation: shake ? "shake 0.4s ease" : "none" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  ...styles.dot,
                  background: i < pin.length ? "#0F6E56" : "transparent",
                  border: `2px solid ${i < pin.length ? "#0F6E56" : "#C4C2BB"}`,
                  transform: i < pin.length ? "scale(1.1)" : "scale(1)",
                  transition: "all 0.15s",
                }}
              />
            ))}
          </div>

          {error && <p style={styles.error}>{error}</p>}
          {loading && <p style={{ textAlign: "center", color: "#0F6E56", margin: "4px 0 8px", fontSize: 14 }}>Signing in...</p>}

          {/* Show confirm button for 4-5 digit PINs */}
          {pin.length >= 4 && pin.length < 6 && !loading && (
            <button
              style={styles.confirmPinBtn}
              onClick={() => submitPin(pin)}
            >
              Confirm PIN →
            </button>
          )}

          {/* PIN Pad */}
          <div style={styles.pinGrid}>
            {PIN_PAD.map(([num, letters], idx) => {
              if (num === "") return <div key={idx} style={styles.pinEmpty} />;
              return (
                <button
                  key={idx}
                  onClick={() => handlePinKey(num)}
                  disabled={loading}
                  style={styles.pinKey}
                  onMouseDown={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#E1F5EE";
                    (e.currentTarget as HTMLElement).style.transform = "scale(0.94)";
                  }}
                  onMouseUp={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "white";
                    (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                  }}
                  onTouchStart={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "#E1F5EE";
                    (e.currentTarget as HTMLElement).style.transform = "scale(0.94)";
                  }}
                  onTouchEnd={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "white";
                    (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                  }}
                >
                  {num === "⌫" ? (
                    <Delete size={20} strokeWidth={1.8} color="#444441" />
                  ) : (
                    <>
                      <span style={styles.pinNum}>{num}</span>
                      {letters && <span style={styles.pinLetters}>{letters}</span>}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%,60% { transform: translateX(-8px); }
          40%,80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100svh", maxWidth: 430, margin: "0 auto",
    background: "linear-gradient(160deg, #0F6E56 0%, #085041 40%, #F8F8F6 40%)",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    display: "flex", flexDirection: "column",
    paddingBottom: "env(safe-area-inset-bottom, 24px)",
  },
  header: {
    padding: "56px 24px 32px",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  logo: { display: "flex", flexDirection: "column", alignItems: "center" },
  logoText: { fontSize: 28, fontWeight: 700, color: "white", letterSpacing: "-0.5px" },
  logoSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: 500, marginTop: 2 },
  form: {
    background: "white", borderRadius: "24px 24px 0 0", flex: 1,
    padding: "32px 24px", display: "flex", flexDirection: "column",
  },
  pinSection: {
    background: "white", borderRadius: "24px 24px 0 0", flex: 1,
    padding: "24px 24px 0", display: "flex", flexDirection: "column",
  },
  heading: { fontSize: 24, fontWeight: 700, color: "#1a1a18", margin: "0 0 8px" },
  subtext: { fontSize: 15, color: "#888780", margin: "0 0 24px" },
  emailInput: {
    width: "100%", height: 56, border: "1.5px solid #E8E6DF", borderRadius: 14,
    padding: "0 16px", fontSize: 16, fontFamily: "'DM Sans', system-ui, sans-serif",
    outline: "none", background: "#F8F8F6", boxSizing: "border-box", color: "#1a1a18",
  },
  continueBtn: {
    marginTop: 16, width: "100%", height: 56, background: "#0F6E56",
    color: "white", border: "none", borderRadius: 14, fontSize: 17, fontWeight: 700,
    cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
    touchAction: "manipulation",
  },
  helpText: { textAlign: "center" as const, fontSize: 14, color: "#888780", marginTop: 20 },
  backBtn: {
    background: "none", border: "none", color: "#0F6E56", fontSize: 14,
    fontWeight: 600, cursor: "pointer", padding: "0 0 16px",
    textAlign: "left" as const, fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  dots: { display: "flex", gap: 12, justifyContent: "center", margin: "0 0 12px" },
  dot: { width: 14, height: 14, borderRadius: "50%" },
  error: { textAlign: "center" as const, color: "#E24B4A", fontSize: 14, margin: "4px 0 8px", fontWeight: 500 },
  confirmPinBtn: {
    marginBottom: 8, alignSelf: "center",
    background: "#0F6E56", color: "white", border: "none",
    borderRadius: 12, padding: "10px 24px", fontSize: 15, fontWeight: 700,
    cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
    touchAction: "manipulation",
  },
  pinGrid: {
    display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10, marginTop: 4, flex: 1, alignContent: "center",
  },
  pinKey: {
    height: 78, background: "white", border: "1.5px solid #E8E6DF", borderRadius: 16,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    cursor: "pointer", transition: "all 0.1s", fontFamily: "'DM Sans', system-ui, sans-serif",
    touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
  },
  pinEmpty: { height: 78 },
  pinNum: { fontSize: 28, fontWeight: 600, color: "#1a1a18", lineHeight: 1 },
  pinLetters: { fontSize: 10, color: "#888780", fontWeight: 500, letterSpacing: 1, marginTop: 2 },
};
