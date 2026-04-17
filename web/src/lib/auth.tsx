import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { apiGet, apiPost } from "./api";
import { queryClient } from "./queryClient";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  subscriptionTier?: string;
  trialExpired?: boolean;
  name?: string;
  activeLocationId?: string | null;
  isMultiLocationEnabled?: boolean;
  hasCompletedFirstQuote?: boolean;
}

interface Business {
  id: string;
  companyName: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUri?: string;
  primaryColor?: string;
  onboardingComplete?: boolean;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  business: Business | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  trialExpired: boolean;
  pendingPlanIntent: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setBusiness: (b: Business | null) => void;
  consumePlanIntent: () => Promise<string | null>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  intent?: string;
  ref?: string;
  signupSource?: string;
  signupCampaign?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingPlanIntent, setPendingPlanIntent] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data: any = await apiGet("/api/auth/me");
      if (data.user) {
        setUser(data.user);
        setBusiness(data.business || null);
        setPendingPlanIntent(data.pendingPlanIntent || null);
      } else {
        setUser(null);
        setBusiness(null);
        setPendingPlanIntent(null);
      }
    } catch {
      setUser(null);
      setBusiness(null);
      setPendingPlanIntent(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data: any = await apiPost("/api/auth/login", { email, password });
    setUser(data.user);
    setBusiness(data.business || null);
    setPendingPlanIntent(data.pendingPlanIntent || null);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const res: any = await apiPost("/api/auth/register", data);
    setUser(res.user);
    setBusiness(res.business || null);
    setPendingPlanIntent(res.pendingPlanIntent || null);
  }, []);

  const logout = useCallback(async () => {
    await apiPost("/api/auth/logout");
    queryClient.clear();
    setUser(null);
    setBusiness(null);
    setPendingPlanIntent(null);
  }, []);

  const consumePlanIntent = useCallback(async (): Promise<string | null> => {
    if (!pendingPlanIntent) return null;
    try {
      const res: any = await apiPost("/api/auth/consume-plan-intent", {});
      setPendingPlanIntent(null);
      return res.pendingPlanIntent || null;
    } catch {
      setPendingPlanIntent(null);
      return null;
    }
  }, [pendingPlanIntent]);

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        isLoading,
        isAuthenticated: !!user,
        needsOnboarding: !!user && !business?.onboardingComplete,
        trialExpired: user?.trialExpired ?? false,
        pendingPlanIntent,
        login,
        register,
        logout,
        refresh,
        setBusiness,
        consumePlanIntent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
