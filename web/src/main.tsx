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

// Intake links live at /intake/:id (outside the /app prefix).
// Use basename "/" for those paths so React Router can match them.
const isIntakePath = window.location.pathname.startsWith("/intake/");
const basename = isIntakePath ? "/" : "/app";

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
