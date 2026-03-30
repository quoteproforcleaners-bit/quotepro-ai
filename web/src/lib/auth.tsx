import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { apiGet, apiPost } from "./api";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  subscriptionTier?: string;
  name?: string;
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
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setBusiness: (b: Business | null) => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data: any = await apiGet("/api/auth/me");
      if (data.user) {
        setUser(data.user);
        setBusiness(data.business || null);
      } else {
        setUser(null);
        setBusiness(null);
      }
    } catch {
      setUser(null);
      setBusiness(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data: any = await apiPost("/api/auth/login", { email, password });
    setUser(data.user);
    setBusiness(data.business || null);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const res: any = await apiPost("/api/auth/register", data);
    setUser(res.user);
    setBusiness(res.business || null);
  }, []);

  const logout = useCallback(async () => {
    await apiPost("/api/auth/logout");
    setUser(null);
    setBusiness(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        isLoading,
        isAuthenticated: !!user,
        needsOnboarding: !!user && !business?.onboardingComplete,
        login,
        register,
        logout,
        refresh,
        setBusiness,
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
