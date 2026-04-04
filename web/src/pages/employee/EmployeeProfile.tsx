import { useNavigate } from "react-router-dom";
import { LogOut, User, Mail, Phone } from "lucide-react";
import EmployeeLayout from "./EmployeeLayout";
import { getStoredEmployee, clearToken } from "../../lib/employeeApi";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function EmployeeProfile() {
  const navigate = useNavigate();
  const employee = getStoredEmployee();

  const handleLogout = () => {
    clearToken();
    navigate("/employee/login", { replace: true });
  };

  return (
    <EmployeeLayout>
      <div style={styles.page}>
        <div style={styles.header}>
          <div style={{ ...styles.avatar, background: employee?.color ?? "#0F6E56" }}>
            {initials(employee?.name ?? "?")}
          </div>
          <div style={styles.name}>{employee?.name ?? "Employee"}</div>
          <div style={styles.role}>{employee?.role || "Team Member"}</div>
        </div>

        <div style={styles.body}>
          {employee?.email && (
            <div style={styles.infoRow}>
              <Mail size={16} color="#0F6E56" />
              <span style={styles.infoText}>{employee.email}</span>
            </div>
          )}

          <button style={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={18} />
            Sign Out
          </button>

          <p style={styles.help}>
            Need to change your PIN or update your info?<br />
            Contact your manager.
          </p>
        </div>
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>
    </EmployeeLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100svh", fontFamily: "'DM Sans', system-ui, sans-serif" },
  header: {
    background: "linear-gradient(135deg, #0F6E56, #085041)",
    padding: "56px 24px 32px",
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  avatar: {
    width: 72, height: 72, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 26, fontWeight: 700, color: "white",
    border: "3px solid rgba(255,255,255,0.3)",
    marginBottom: 12,
  },
  name: { fontSize: 24, fontWeight: 700, color: "white" },
  role: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  body: { padding: 20 },
  infoRow: {
    display: "flex", alignItems: "center", gap: 10,
    background: "white", borderRadius: 14, padding: "14px 16px",
    marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  infoText: { fontSize: 15, color: "#1a1a18" },
  logoutBtn: {
    width: "100%", height: 52, background: "#FCEBEB", color: "#E24B4A",
    border: "1px solid #F2B5B5", borderRadius: 14, fontSize: 15, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif",
    marginBottom: 20,
  },
  help: {
    textAlign: "center" as const, fontSize: 13, color: "#888780", lineHeight: 1.5,
  },
};
