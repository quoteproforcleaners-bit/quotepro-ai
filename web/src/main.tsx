import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./lib/auth";
import { queryClient } from "./lib/queryClient";
import App from "./App";
import "./index.css";

// Intake links live at /intake/:id (outside the /app prefix).
// Use basename "/" for those paths so React Router can match them.
const isIntakePath = window.location.pathname.startsWith("/intake/");
const basename = isIntakePath ? "/" : "/app";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
