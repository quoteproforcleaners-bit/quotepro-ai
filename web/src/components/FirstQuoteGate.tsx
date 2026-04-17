import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

const ALLOWED_PATHS = ["/onboarding/", "/quotes", "/pricing", "/logout"];

export function FirstQuoteGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading || !isAuthenticated) return <>{children}</>;

  if (user?.hasCompletedFirstQuote) return <>{children}</>;

  const allowed = ALLOWED_PATHS.some(
    (p) => location.pathname === p || location.pathname.startsWith(p)
  );
  if (allowed) return <>{children}</>;

  return <Navigate to="/onboarding/first-quote" replace />;
}
