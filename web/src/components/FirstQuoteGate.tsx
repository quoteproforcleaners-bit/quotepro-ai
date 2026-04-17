import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

const ALLOWED_PATHS = ["/onboarding/", "/quotes", "/pricing", "/logout"];

export function FirstQuoteGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading || !isAuthenticated) return <>{children}</>;

  if (user?.hasCompletedFirstQuote) return <>{children}</>;

  // If the user clicked "Skip this step" but the skip API failed, the server
  // still has has_completed_first_quote=false. Without this bypass the gate
  // would bounce them right back to /onboarding/first-quote, defeating the
  // skip. The DashboardPage runs a silent retry that clears this flag once
  // the server is reachable again.
  try {
    if (typeof window !== "undefined" &&
        window.localStorage.getItem("qp_pending_skip_retry") === "1") {
      return <>{children}</>;
    }
  } catch {
    // localStorage unavailable (private mode, etc.) — fall through to gate
  }

  const allowed = ALLOWED_PATHS.some(
    (p) => location.pathname === p || location.pathname.startsWith(p)
  );
  if (allowed) return <>{children}</>;

  return <Navigate to="/onboarding/first-quote" replace />;
}
