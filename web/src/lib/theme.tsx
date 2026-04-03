export function useTheme() {
  return { theme: "light" as const, toggleTheme: () => {} };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  if (typeof document !== "undefined") {
    document.documentElement.classList.remove("dark");
    try { localStorage.removeItem("qp-theme"); } catch {}
  }
  return <>{children}</>;
}

import React from "react";
