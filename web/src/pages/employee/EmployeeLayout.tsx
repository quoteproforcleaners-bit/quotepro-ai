import { useNavigate, useLocation } from "react-router-dom";
import { Home, Calendar, User } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { path: "/employee/home", label: "Today", Icon: Home },
  { path: "/employee/schedule", label: "Schedule", Icon: Calendar },
  { path: "/employee/profile", label: "Profile", Icon: User },
];

export default function EmployeeLayout({ children }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div style={styles.root}>
      <div style={styles.content}>{children}</div>

      <nav style={styles.nav}>
        {NAV_ITEMS.map(({ path, label, Icon }) => {
          const active = pathname === path || pathname.startsWith(path + "/");
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                ...styles.navItem,
                color: active ? "#0F6E56" : "#888780",
              }}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 11, marginTop: 3, fontWeight: active ? 700 : 500 }}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100svh",
    maxWidth: 430,
    margin: "0 auto",
    background: "#F8F8F6",
    fontFamily: "'DM Sans', system-ui, sans-serif",
    position: "relative",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    paddingBottom: "calc(64px + env(safe-area-inset-bottom, 16px))",
  },
  nav: {
    position: "fixed",
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 430,
    display: "flex",
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderTop: "1px solid #E8E6DF",
    paddingBottom: "env(safe-area-inset-bottom, 12px)",
    zIndex: 100,
  },
  navItem: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 0 4px",
    background: "none",
    border: "none",
    cursor: "pointer",
    minHeight: 56,
    transition: "color 0.15s",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  },
};
