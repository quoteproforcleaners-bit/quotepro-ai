import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./lib/auth";
import { queryClient } from "./lib/queryClient";
import { WebErrorBoundary } from "./components/WebErrorBoundary";
import App from "./App";
import "./index.css";
import "./lib/i18n";

// Some paths live outside the /app prefix and need basename "/":
// - /intake/:id       — public lead capture links (legacy)
// - /request/:slug    — branded lead link microsite
// - /schedule-ack/:t  — schedule acknowledgement links
// - /q/:token         — public quote view links
// - /home/:token      — customer "My Home" portal (Sprint 23)
// - /pricing/*, /subscription/*, /register, /login, /dashboard, /onboarding
//   — top-level routes for direct navigation and ad conversion tracking
const TOP_LEVEL_PATHS = [
  "/intake/", "/request/", "/schedule-ack/", "/q/", "/home/",
  "/pricing", "/subscription", "/register",
  "/login", "/dashboard", "/onboarding", "/upgrade", "/quote-doctor",
];
const isTopLevelPath = TOP_LEVEL_PATHS.some((p) =>
  window.location.pathname === p || window.location.pathname.startsWith(p + "/") || window.location.pathname.startsWith(p)
);
const basename = isTopLevelPath ? "/" : "/app";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WebErrorBoundary>
      <BrowserRouter basename={basename}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </WebErrorBoundary>
  </React.StrictMode>
);
