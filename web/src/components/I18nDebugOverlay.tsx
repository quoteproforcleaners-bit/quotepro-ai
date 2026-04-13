import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

const ENGLISH_INDICATORS = [
  "Dashboard","Customers","Quotes","Settings","Schedule",
  "Jobs","Revenue","Invoice","Payment","Booking","Quote",
  "Customer","Business","Cleaning","Service","Follow",
  "Cancel","Save","Delete","Edit","View","Add","New",
  "Search","Filter","Loading","Error","Success","Back",
  "Next","Skip","Complete","Active","Inactive","Lead",
  "Weekly","Monthly","Annual","Today","Total","Average",
  "Upgrade","Trial","Plan","Account","Team","Profile",
  "Refer","Earn","Support","Help","Tour","Download",
  "Connect","Disconnect","Enable","Disable","Update",
  "Request","Capture","Link","Copy","Share","Send",
  "Charge","Refund","Receipt","Card","Stripe",
  "Intelligence","Autopilot","Running","Stopped",
  "Name","Email","Phone","Address","Notes","Date",
  "Time","Amount","Status","Type","Rate","Price",
  "Overview","Audit","Reports","Finance","Submit",
  "Confirm","Pending","Scheduled","Completed","Failed",
  "Sent","Accepted","Expired","Drafted","Signed",
];

const WORD_RE = new RegExp(`\\b(${ENGLISH_INDICATORS.join("|")})\\b`, "i");

interface Issue {
  text: string;
  path: string;
}

function getElementPath(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  let depth = 0;
  while (current && depth < 5) {
    const id = current.id ? `#${current.id}` : "";
    const cls =
      current.className && typeof current.className === "string"
        ? "." + current.className.trim().split(/\s+/)[0]
        : "";
    parts.unshift(current.tagName.toLowerCase() + id + cls);
    current = current.parentElement;
    depth++;
  }
  return parts.join(" > ");
}

export function I18nDebugOverlay() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [visible, setVisible] = useState(true);
  const [scanning, setScanning] = useState(false);

  const scan = useCallback(() => {
    setScanning(true);
    // Clear previous highlights
    document.querySelectorAll("[data-i18n-missing]").forEach((el) => {
      (el as HTMLElement).style.outline = "";
      (el as HTMLElement).style.backgroundColor = "";
      el.removeAttribute("data-i18n-missing");
    });

    const found: Issue[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (["script", "style", "noscript", "svg", "path"].includes(tag))
          return NodeFilter.FILTER_REJECT;
        if (parent.closest("[data-i18n-debug]")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim() ?? "";
      if (text.length < 3) continue;

      if (WORD_RE.test(text)) {
        const el = node.parentElement;
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) continue;

        const snippet = text.substring(0, 70);
        found.push({ text: snippet, path: getElementPath(el) });

        el.style.outline = "2px solid #ef4444";
        el.style.backgroundColor = "rgba(239,68,68,0.08)";
        el.setAttribute("data-i18n-missing", snippet);
      }
    }

    setIssues(found);
    setVisible(true);
    setScanning(false);

    if (found.length === 0) {
      console.log("%c✅ i18n: No untranslated strings detected on this page", "color:#16a34a;font-weight:bold");
    } else {
      console.group(`%c🔴 i18n: ${found.length} potentially untranslated string(s)`, "color:#dc2626;font-weight:bold");
      found.forEach((f) => console.log(`  "${f.text}"  ←  ${f.path}`));
      console.groupEnd();
    }
  }, []);

  useEffect(() => {
    if (i18n.language === "en") return;
    const timer = setTimeout(scan, 800);
    return () => {
      clearTimeout(timer);
      document.querySelectorAll("[data-i18n-missing]").forEach((el) => {
        (el as HTMLElement).style.outline = "";
        (el as HTMLElement).style.backgroundColor = "";
        el.removeAttribute("data-i18n-missing");
      });
    };
  }, [i18n.language, location.pathname, scan]);

  if (!import.meta.env.DEV) return null;
  if (i18n.language === "en") {
    return (
      <div
        data-i18n-debug="true"
        style={{
          position: "fixed", bottom: 16, right: 16, zIndex: 99999,
          background: "#1a1a2e", color: "#7c3aed", borderRadius: 10,
          padding: "8px 14px", fontSize: 11, fontWeight: 600,
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)", cursor: "pointer",
          border: "1px solid rgba(124,58,237,0.4)",
          fontFamily: "monospace",
        }}
        onClick={() => {
          const langs = ["es", "pt", "ru"];
          i18n.changeLanguage(langs[0]);
        }}
        title="Switch to Spanish to test i18n"
      >
        i18n: EN — click to test ES
      </div>
    );
  }

  return (
    <div data-i18n-debug="true">
      {/* Re-scan button (always visible) */}
      <button
        onClick={scan}
        style={{
          position: "fixed", bottom: 16, right: 16, zIndex: 99999,
          background: issues.length === 0 ? "#16a34a" : "#dc2626",
          color: "#fff", borderRadius: 8, padding: "6px 12px",
          fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)", fontFamily: "monospace",
        }}
        title="Re-scan page for untranslated strings"
      >
        {scanning ? "Scanning…" : issues.length === 0 ? `✅ i18n OK (${i18n.language.toUpperCase()})` : `🔴 ${issues.length} untranslated`}
      </button>

      {/* Issue panel */}
      {visible && issues.length > 0 && (
        <div
          style={{
            position: "fixed", bottom: 52, right: 16, zIndex: 99998,
            background: "#0f172a", color: "#f1f5f9", borderRadius: 12,
            padding: 16, width: 380, maxHeight: 360, overflowY: "auto",
            fontSize: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            border: "1px solid #ef4444",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontWeight: 700, color: "#f87171", fontFamily: "monospace" }}>
              🔴 {issues.length} untranslated — {i18n.language.toUpperCase()}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {["es", "pt", "ru"].map((lng) => (
                <button
                  key={lng}
                  onClick={() => i18n.changeLanguage(lng)}
                  style={{
                    background: i18n.language === lng ? "#3b82f6" : "rgba(255,255,255,0.1)",
                    border: "none", color: "#fff", borderRadius: 4,
                    padding: "2px 7px", cursor: "pointer", fontSize: 10, fontWeight: 700,
                  }}
                >
                  {lng.toUpperCase()}
                </button>
              ))}
              <button
                onClick={() => setVisible(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
              >
                ×
              </button>
            </div>
          </div>

          {issues.map((issue, i) => (
            <div
              key={i}
              style={{
                padding: "5px 8px", marginBottom: 4,
                background: "rgba(239,68,68,0.12)", borderRadius: 6,
                borderLeft: "3px solid #ef4444",
              }}
            >
              <div style={{ color: "#fca5a5", marginBottom: 2, fontFamily: "monospace" }}>
                &ldquo;{issue.text}&rdquo;
              </div>
              <div style={{ color: "#475569", fontSize: 10 }}>{issue.path}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
