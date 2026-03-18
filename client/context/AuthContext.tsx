import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest, getApiUrl } from "@/lib/query-client";

function rcLogIn(userId: string) {
  if (Platform.OS === "web") return;
  try {
    const RC = require("react-native-purchases").default;
    RC.logIn(String(userId)).catch(() => {});
  } catch {}
}

function rcLogOut() {
  if (Platform.OS === "web") return;
  try {
    const RC = require("react-native-purchases").default;
    RC.logOut().catch(() => {});
  } catch {}
}

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  subscriptionTier: string;
  createdAt: string | null;
}

interface AuthContextType {
  isLoading: boolean;
  user: AuthUser | null;
  isGuest: boolean;
  needsOnboarding: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  loginWithApple: (data: { identityToken: string; user: string; fullName?: any; email?: string }) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  setAuthData: (user: AuthUser, needsOnboarding: boolean) => void;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
  setNeedsOnboarding: (val: boolean) => void;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  const enterGuestMode = () => setIsGuest(true);
  const exitGuestMode = () => setIsGuest(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/me", baseUrl);
      const res = await fetch(url, { credentials: "include" });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setNeedsOnboarding(data.needsOnboarding);
      }
    } catch (error) {
      console.log("Not authenticated");
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await res.json();
    setUser(data.user);
    setNeedsOnboarding(data.needsOnboarding);
    setIsGuest(false);
    if (data.user?.id) rcLogIn(data.user.id);
  };

  const register = async (email: string, password: string, name?: string) => {
    const res = await apiRequest("POST", "/api/auth/register", { email, password, name });
    const data = await res.json();
    setUser(data.user);
    setNeedsOnboarding(data.needsOnboarding);
    setIsGuest(false);
    if (data.user?.id) rcLogIn(data.user.id);
  };

  const loginWithApple = async (data: {
    identityToken: string;
    user: string;
    fullName?: any;
    email?: string;
  }) => {
    const res = await apiRequest("POST", "/api/auth/apple", data);
    const result = await res.json();
    setUser(result.user);
    setNeedsOnboarding(result.needsOnboarding);
    setIsGuest(false);
    if (result.user?.id) rcLogIn(result.user.id);
  };

  const loginWithGoogle = async (idToken: string) => {
    const res = await apiRequest("POST", "/api/auth/google", { idToken });
    const result = await res.json();
    setUser(result.user);
    setNeedsOnboarding(result.needsOnboarding);
    setIsGuest(false);
    if (result.user?.id) rcLogIn(result.user.id);
  };

  const setAuthData = (authUser: AuthUser, onboarding: boolean) => {
    setUser(authUser);
    setNeedsOnboarding(onboarding);
  };

  const refreshAuth = async () => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/me", baseUrl);
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setNeedsOnboarding(data.needsOnboarding);
      }
    } catch (error) {
      console.log("Auth refresh failed");
    }
  };

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch {}
    rcLogOut();
    queryClient.clear();
    setUser(null);
    setNeedsOnboarding(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        user,
        isGuest,
        needsOnboarding,
        login,
        register,
        loginWithApple,
        loginWithGoogle,
        setAuthData,
        refreshAuth,
        logout,
        setNeedsOnboarding,
        enterGuestMode,
        exitGuestMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
