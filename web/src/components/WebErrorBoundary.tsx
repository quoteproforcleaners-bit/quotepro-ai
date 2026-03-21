import React from "react";

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WebErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[QuotePro] Render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          padding: "2rem",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}>
          <div style={{
            maxWidth: "480px",
            width: "100%",
            backgroundColor: "#fff",
            borderRadius: "12px",
            padding: "2.5rem",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              backgroundColor: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              fontSize: "1.75rem",
            }}>
              ⚠️
            </div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.75rem" }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: "0.9375rem", color: "#64748b", margin: "0 0 1.75rem", lineHeight: 1.6 }}>
              QuotePro ran into an unexpected error. Your data is safe — try refreshing the page to continue.
            </p>
            {this.state.error && (
              <details style={{ textAlign: "left", marginBottom: "1.5rem" }}>
                <summary style={{ fontSize: "0.8125rem", color: "#94a3b8", cursor: "pointer", marginBottom: "0.5rem" }}>
                  Error details
                </summary>
                <pre style={{
                  fontSize: "0.75rem",
                  color: "#ef4444",
                  backgroundColor: "#fef2f2",
                  borderRadius: "6px",
                  padding: "0.75rem",
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "0.75rem 1.5rem",
                fontSize: "0.9375rem",
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
