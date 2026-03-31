import { useState, useRef } from "react";
import { Zap, Copy, Download, Upload, FileText, Loader2, X, Check, ArrowRight, Share2, ChevronRight, Star, Wand2, ChevronDown, BookOpen } from "lucide-react";

const FACILITY_TYPES_SCOPE = [
  "Office Building", "Retail Store", "Medical / Dental", "Gym / Fitness Center",
  "School / University", "Warehouse / Industrial", "Restaurant / Food Service",
  "House / Residential", "Apartment Complex", "Hotel / Hospitality", "Church / Religious",
];

const FREQUENCY_OPTIONS_SCOPE = [
  { value: "daily", label: "Daily" },
  { value: "5x/week", label: "5× per week" },
  { value: "3x/week", label: "3× per week" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "one-time", label: "One-time / Move-in-out" },
];

// ─── Proposal Parser ───────────────────────────────────────────────────────────
interface PricingTier {
  label: string;          // "Good", "Better", "Best"
  title: string;          // "Essential Cleaning"
  badge?: string;         // "Most Popular"
  bullets: string[];
  price?: string;
}

interface ParsedProposal {
  intro: string[];
  tiers: PricingTier[];
  closing: string[];
  raw: string;
}

function parseProposal(text: string): ParsedProposal {
  const lines = text.split("\n");
  const tiers: PricingTier[] = [];
  const intro: string[] = [];
  const closing: string[] = [];
  let current: PricingTier | null = null;
  let pastTiers = false;
  let inTierSection = false;

  const TIER_RE = /^[\*\#\s]*(Good|Better|Best)\s*[:–-]\s*(.+)/i;
  const BULLET_RE = /^\s*[-•*]\s+(.+)/;
  const HEADER_RE = /^#+\s+(.+)/;
  const PRICE_RE = /total\s*[:=]?\s*\$?([\d,]+\.?\d*)/i;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line === "---") continue;

    // Strip markdown bold/italic for analysis
    const clean = line.replace(/\*\*/g, "").replace(/\*/g, "").replace(/^#+\s*/, "");

    const tierMatch = TIER_RE.exec(clean);
    if (tierMatch) {
      if (current) tiers.push(current);
      const fullTitle = tierMatch[2].replace(/\(most popular\)/i, "").trim();
      const isMostPopular = /most popular/i.test(tierMatch[2]) || tierMatch[1].toLowerCase() === "better";
      current = {
        label: tierMatch[1],
        title: fullTitle,
        badge: isMostPopular ? "Most Popular" : undefined,
        bullets: [],
      };
      inTierSection = true;
      continue;
    }

    // Section header (### Service Options etc.) — skip label, just mark section
    if (HEADER_RE.test(line)) {
      inTierSection = false;
      continue;
    }

    if (current) {
      const bMatch = BULLET_RE.exec(line);
      if (bMatch) {
        const bulletText = bMatch[1].replace(/\*\*/g, "").replace(/\*/g, "");
        const priceMatch = PRICE_RE.exec(bulletText);
        if (priceMatch) {
          current.price = `$${priceMatch[1]}`;
        } else {
          current.bullets.push(bulletText);
        }
      } else if (line && !HEADER_RE.test(line)) {
        // Non-bullet text after a tier = closing starts
        if (current) { tiers.push(current); current = null; pastTiers = true; }
        closing.push(clean);
      }
    } else if (!inTierSection && !pastTiers) {
      intro.push(clean);
    } else if (pastTiers || (!inTierSection && tiers.length > 0)) {
      closing.push(clean);
    } else {
      intro.push(clean);
    }
  }
  if (current) tiers.push(current);

  return { intro, tiers, closing, raw: text };
}

// ─── Beautiful Web Proposal Card ───────────────────────────────────────────────
function ProposalCard({ parsed }: { parsed: ParsedProposal }) {
  const hasTiers = parsed.tiers.length > 0;

  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #2563eb 100%)",
        borderRadius: "20px 20px 0 0",
        padding: "36px 40px 28px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0, opacity: 0.06,
          backgroundImage: "radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <div style={{
              background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "100px", padding: "3px 12px",
              fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.9)",
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>
              Cleaning Services Proposal
            </div>
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", margin: "0 0 16px", lineHeight: 1.2 }}>
            Your Personalized Cleaning Quote
          </h1>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {["✓ Licensed & Insured", "✓ Satisfaction Guaranteed", "Valid for 7 days"].map((b) => (
              <span key={b} style={{
                background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "100px", padding: "4px 12px",
                fontSize: "11.5px", fontWeight: 600, color: "rgba(255,255,255,0.85)",
              }}>{b}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ background: "#f8fafc", padding: "32px 40px", borderRadius: "0 0 20px 20px" }}>

        {/* Intro */}
        {parsed.intro.length > 0 && (
          <div style={{
            background: "#fff", borderRadius: "16px", padding: "24px 28px",
            marginBottom: "28px", border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}>
            {parsed.intro.map((line, i) => (
              <p key={i} style={{
                fontSize: "15px", lineHeight: 1.75, color: "#374151",
                margin: i < parsed.intro.length - 1 ? "0 0 12px" : 0,
              }}>{line}</p>
            ))}
          </div>
        )}

        {/* Service Options */}
        {hasTiers && (
          <>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "14px" }}>
              Service Options
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
              {parsed.tiers.map((tier) => {
                const isPopular = !!tier.badge;
                const colorMap: Record<string, { bg: string; accent: string; ring: string; label: string }> = {
                  good:   { bg: "#fff",     accent: "#0ea5e9", ring: "#e0f2fe", label: "#0369a1" },
                  better: { bg: "#faf5ff",  accent: "#7c3aed", ring: "#ede9fe", label: "#6d28d9" },
                  best:   { bg: "#fffbeb",  accent: "#d97706", ring: "#fde68a", label: "#b45309" },
                };
                const c = colorMap[tier.label.toLowerCase()] || colorMap.good;

                return (
                  <div key={tier.label} style={{
                    background: c.bg, borderRadius: "14px",
                    border: `2px solid ${isPopular ? c.accent : c.ring}`,
                    overflow: "hidden",
                    boxShadow: isPopular ? `0 4px 20px ${c.accent}22` : "0 1px 3px rgba(0,0,0,0.05)",
                    position: "relative",
                  }}>
                    {isPopular && (
                      <div style={{
                        position: "absolute", top: 0, right: 0,
                        background: `linear-gradient(135deg, ${c.accent}, #6d28d9)`,
                        color: "#fff", fontSize: "10px", fontWeight: 800,
                        padding: "4px 14px", borderRadius: "0 12px 0 10px",
                        letterSpacing: "0.05em", textTransform: "uppercase",
                      }}>
                        Most Popular
                      </div>
                    )}
                    <div style={{ padding: "18px 22px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                        <div>
                          <span style={{
                            display: "inline-block", background: c.ring,
                            color: c.label, fontSize: "10px", fontWeight: 800,
                            padding: "2px 10px", borderRadius: "100px",
                            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px",
                          }}>
                            {tier.label}
                          </span>
                          <p style={{ fontSize: "16px", fontWeight: 700, color: "#111827", margin: 0 }}>
                            {tier.title}
                          </p>
                        </div>
                        {tier.price && (
                          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "12px" }}>
                            <p style={{ fontSize: "22px", fontWeight: 800, color: c.label, margin: 0, lineHeight: 1 }}>
                              {tier.price}
                            </p>
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {tier.bullets.map((b, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                            <span style={{ color: c.accent, fontSize: "14px", fontWeight: 700, marginTop: "1px", flexShrink: 0 }}>✓</span>
                            <span style={{ fontSize: "14px", color: "#374151", lineHeight: 1.6 }}>{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Closing */}
        {parsed.closing.length > 0 && (
          <div style={{
            background: "#fff", borderRadius: "16px", padding: "24px 28px",
            border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}>
            {parsed.closing.map((line, i) => (
              <p key={i} style={{
                fontSize: "15px", lineHeight: 1.75, color: "#374151",
                margin: i < parsed.closing.length - 1 ? "0 0 12px" : 0,
              }}>{line}</p>
            ))}
          </div>
        )}

        {/* Fallback: if parsing found nothing */}
        {!hasTiers && parsed.intro.length === 0 && (
          <div style={{ background: "#fff", borderRadius: "16px", padding: "28px", border: "1px solid #e2e8f0" }}>
            <pre style={{ fontSize: "14px", lineHeight: 1.75, color: "#374151", whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>
              {parsed.raw}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PDF Generator ─────────────────────────────────────────────────────────────
function generatePdfHtml(parsed: ParsedProposal): string {
  const tierCardHtml = (tier: PricingTier) => {
    const colorMap: Record<string, { bg: string; accent: string; ring: string; badge: string }> = {
      good:   { bg: "#ffffff", accent: "#0ea5e9", ring: "#e0f2fe", badge: "#0369a1" },
      better: { bg: "#faf5ff", accent: "#7c3aed", ring: "#ede9fe", badge: "#6d28d9" },
      best:   { bg: "#fffbeb", accent: "#d97706", ring: "#fde68a", badge: "#b45309" },
    };
    const c = colorMap[tier.label.toLowerCase()] || colorMap.good;
    const isPopular = !!tier.badge;

    const bulletsHtml = tier.bullets.map(b =>
      `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px">
         <span style="color:${c.accent};font-weight:800;flex-shrink:0;margin-top:1px">✓</span>
         <span style="font-size:13.5px;color:#374151;line-height:1.6">${b.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</span>
       </div>`
    ).join("");

    return `
      <div style="background:${c.bg};border-radius:14px;border:2px solid ${isPopular ? c.accent : c.ring};overflow:hidden;margin-bottom:12px;position:relative;${isPopular ? `box-shadow:0 4px 20px ${c.accent}33` : ""}">
        ${isPopular ? `<div style="position:absolute;top:0;right:0;background:linear-gradient(135deg,${c.accent},#6d28d9);color:#fff;font-size:9px;font-weight:800;padding:4px 14px;border-radius:0 12px 0 10px;letter-spacing:.05em;text-transform:uppercase">Most Popular</div>` : ""}
        <div style="padding:18px 22px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
            <div>
              <span style="display:inline-block;background:${c.ring};color:${c.badge};font-size:9.5px;font-weight:800;padding:2px 10px;border-radius:100px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">${tier.label}</span>
              <p style="font-size:16px;font-weight:700;color:#111827;margin:0">${tier.title.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</p>
            </div>
            ${tier.price ? `<div style="text-align:right;flex-shrink:0;margin-left:12px"><p style="font-size:24px;font-weight:800;color:${c.badge};margin:0;line-height:1">${tier.price}</p></div>` : ""}
          </div>
          ${bulletsHtml}
        </div>
      </div>`;
  };

  const introHtml = parsed.intro.map(l =>
    `<p style="font-size:15px;line-height:1.8;color:#374151;margin:0 0 12px">${l.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</p>`
  ).join("");

  const closingHtml = parsed.closing.map(l =>
    `<p style="font-size:15px;line-height:1.8;color:#374151;margin:0 0 12px">${l.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</p>`
  ).join("");

  const tiersHtml = parsed.tiers.map(tierCardHtml).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Cleaning Services Proposal</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, 'Inter', 'Helvetica Neue', Arial, sans-serif;
    background: #eef2f7;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    color: #1a1a1a;
  }
  .save-bar {
    background: #0f172a;
    padding: 12px 24px;
    text-align: center;
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
  .save-bar button {
    background: linear-gradient(135deg, #16a34a, #059669);
    color: #fff;
    border: none;
    border-radius: 10px;
    padding: 10px 32px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    letter-spacing: .01em;
    box-shadow: 0 2px 8px rgba(22,163,74,0.4);
  }
  .save-bar button:hover { background: linear-gradient(135deg, #15803d, #047857); }
  .save-bar span { color: rgba(255,255,255,0.5); font-size: 13px; }
  .wrapper { max-width: 700px; margin: 32px auto 60px; }
  .card {
    background: #fff;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 8px 48px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
  }
  .header {
    background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #2563eb 100%);
    padding: 44px 48px 36px;
    position: relative;
    overflow: hidden;
  }
  .header::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
    background-size: 24px 24px;
  }
  .header-inner { position: relative; }
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 100px;
    padding: 4px 14px;
    font-size: 10.5px;
    font-weight: 700;
    color: rgba(255,255,255,0.9);
    letter-spacing: .05em;
    text-transform: uppercase;
    margin-bottom: 14px;
  }
  .header h1 {
    font-size: 30px;
    font-weight: 800;
    color: #fff;
    margin: 0 0 18px;
    line-height: 1.15;
    letter-spacing: -.01em;
  }
  .pills { display: flex; gap: 8px; flex-wrap: wrap; }
  .pill {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 100px;
    padding: 4px 13px;
    font-size: 11px;
    font-weight: 600;
    color: rgba(255,255,255,0.85);
  }
  .body { background: #f8fafc; padding: 36px 48px 48px; }
  .section-label {
    font-size: 10.5px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: .08em;
    margin-bottom: 14px;
    margin-top: 28px;
  }
  .text-card {
    background: #fff;
    border-radius: 16px;
    padding: 24px 28px;
    border: 1px solid #e2e8f0;
    margin-bottom: 28px;
  }
  .footer-strip {
    background: linear-gradient(135deg, #f0fdf4, #dcfce7);
    border-top: 2px solid #bbf7d0;
    padding: 28px 48px;
    text-align: center;
  }
  .footer-strip p { font-size: 13px; color: #374151; line-height: 1.6; }
  .footer-strip .trust { display: flex; justify-content: center; gap: 24px; margin-top: 16px; }
  .footer-strip .trust-item { font-size: 12px; font-weight: 600; color: #059669; }
  @media print {
    body { background: #fff; }
    .save-bar { display: none; }
    .wrapper { margin: 0; max-width: 100%; }
    .card { box-shadow: none; border-radius: 0; }
    .header, .header::before { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="save-bar">
    <button onclick="window.print()">Save as PDF / Print</button>
    <span>or press Ctrl/Cmd + P</span>
  </div>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="header-inner">
          <div class="eyebrow">Cleaning Services Proposal</div>
          <h1>Your Personalized<br>Cleaning Quote</h1>
          <div class="pills">
            <span class="pill">✓ Licensed &amp; Insured</span>
            <span class="pill">✓ Satisfaction Guaranteed</span>
            <span class="pill">Valid for 7 days</span>
          </div>
        </div>
      </div>

      <div class="body">
        ${parsed.intro.length > 0 ? `<div class="text-card">${introHtml}</div>` : ""}
        ${parsed.tiers.length > 0 ? `<p class="section-label" style="margin-top:0">Service Options</p>${tiersHtml}` : ""}
        ${parsed.closing.length > 0 ? `<div class="text-card" style="margin-top:28px;margin-bottom:0">${closingHtml}</div>` : ""}
        ${!parsed.intro.length && !parsed.tiers.length && !parsed.closing.length ? `<div class="text-card"><pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.75;color:#374151">${parsed.raw.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre></div>` : ""}
      </div>

      <div class="footer-strip">
        <p>Ready to book? Reply to this proposal or call us to get started.</p>
        <div class="trust">
          <span class="trust-item">✓ Fully Insured</span>
          <span class="trust-item">✓ Background Checked</span>
          <span class="trust-item">✓ Satisfaction Guarantee</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function QuoteDoctorPage() {
  // ── Mode selector ──
  const [mode, setMode] = useState<"optimize" | "scope">("optimize");

  // ── Optimize-quote state ──
  const [tab, setTab] = useState<"paste" | "upload">("paste");
  const [quoteText, setQuoteText] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState("image/jpeg");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimized, setOptimized] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedProposal | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // ── AI Adjust state ──
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustText, setAdjustText] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // ── Scope generator state ──
  const [scopeFacility, setScopeFacility] = useState("Office Building");
  const [scopeSqFt, setScopeSqFt] = useState("");
  const [scopeFloors, setScopeFloors] = useState("1");
  const [scopeFrequency, setScopeFrequency] = useState("weekly");
  const [scopeNotes, setScopeNotes] = useState("");
  const [scopeLoading, setScopeLoading] = useState(false);
  const [scopeResult, setScopeResult] = useState<string | null>(null);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [scopeCopied, setScopeCopied] = useState(false);
  const scopeRef = useRef<HTMLDivElement>(null);

  const compressImage = (dataUrl: string): Promise<{ base64: string; mimeType: string; preview: string }> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 900;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/jpeg", 0.72);
        resolve({ base64: compressed.split(",")[1], mimeType: "image/jpeg", preview: compressed });
      };
      img.src = dataUrl;
    });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const { base64, mimeType, preview } = await compressImage(ev.target?.result as string);
      setImageBase64(base64); setImageMimeType(mimeType); setImagePreview(preview);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageBase64(null); setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "paste" && !quoteText.trim()) { setError("Please paste your quote text."); return; }
    if (tab === "upload" && !imageBase64) { setError("Please upload a screenshot first."); return; }
    setLoading(true); setError(null); setOptimized(null); setParsed(null);
    try {
      const body: Record<string, string> = {};
      if (tab === "paste") {
        body.quoteText = quoteText.trim();
      } else {
        const b64 = imageBase64!;
        if (Math.round(b64.length * 0.75 / 1024) > 1800) {
          setError("Image is too large. Please use a smaller or cropped screenshot.");
          setLoading(false); return;
        }
        body.imageBase64 = b64; body.imageMimeType = imageMimeType;
      }

      const res = await fetch("/api/quote-doctor/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let data: any = {};
      try { data = await res.json(); } catch { /* non-json */ }
      if (!res.ok) { setError(data.error || `Server error (${res.status}). Please try again.`); return; }
      if (!data.optimized) { setError("No optimized quote was returned. Please try again."); return; }

      const p = parseProposal(data.optimized);
      setOptimized(data.optimized);
      setParsed(p);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!optimized) return;
    await navigator.clipboard.writeText(optimized);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleAdjust = async () => {
    if (!optimized || !adjustText.trim()) return;
    setAdjustLoading(true); setAdjustError(null);
    try {
      const res = await fetch("/api/quote-doctor/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentProposal: optimized, instructions: adjustText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Adjustment failed");
      const p = parseProposal(data.adjusted);
      setOptimized(data.adjusted);
      setParsed(p);
      setAdjustText("");
      setAdjustOpen(false);
    } catch (err: any) {
      setAdjustError(err?.message || "Could not apply changes. Please try again.");
    } finally {
      setAdjustLoading(false);
    }
  };

  const handleScope = async (e: React.FormEvent) => {
    e.preventDefault();
    setScopeLoading(true); setScopeError(null); setScopeResult(null);
    try {
      const res = await fetch("/api/quote-doctor/scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityType: scopeFacility,
          sqft: scopeSqFt ? Number(scopeSqFt) : undefined,
          floors: scopeFloors ? Number(scopeFloors) : undefined,
          frequency: scopeFrequency,
          specialRequirements: scopeNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scope generation failed");
      setScopeResult(data.scope);
      setTimeout(() => scopeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    } catch (err: any) {
      setScopeError(err?.message || "Could not generate scope. Please try again.");
    } finally {
      setScopeLoading(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText("https://getquotepro.ai/quote-doctor");
    setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000);
  };

  const handlePDF = () => {
    if (!parsed) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(generatePdfHtml(parsed));
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #f0f4ff 0%, #f8fafc 60%, #fff 100%)" }}>
      {/* Hero */}
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "64px 24px 32px", textAlign: "center" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          background: "linear-gradient(135deg, #d1fae5, #a7f3d0)",
          color: "#065f46", padding: "6px 18px", borderRadius: "100px",
          fontSize: "13px", fontWeight: 700, marginBottom: "24px",
          border: "1px solid #6ee7b7",
        }}>
          <Zap style={{ width: "14px", height: "14px" }} />
          Free AI Tool — No Account Needed
        </div>

        <h1 style={{
          fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, lineHeight: 1.1,
          color: "#0f172a", marginBottom: "20px", letterSpacing: "-0.02em",
        }}>
          Is Your Quote<br />
          <span style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Losing You Jobs?
          </span>
        </h1>

        <p style={{ fontSize: "18px", color: "#64748b", maxWidth: "520px", margin: "0 auto 8px", lineHeight: 1.65 }}>
          Paste your current quote or upload a screenshot. Quote Doctor rewrites it to win more jobs — in seconds.
        </p>
        <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: 0 }}>No credit card. No sign up. Instant results.</p>
      </div>

      {/* Mode selector */}
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 20px 16px", display: "flex", gap: "10px", justifyContent: "center" }}>
        {(["optimize", "scope"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "9px 22px", borderRadius: "100px", border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: "13.5px", transition: "all 0.15s",
            background: mode === m ? "#0f172a" : "#fff",
            color: mode === m ? "#fff" : "#64748b",
            boxShadow: mode === m ? "0 2px 12px rgba(15,23,42,0.2)" : "0 0 0 1.5px #e2e8f0",
          }}>
            {m === "optimize"
              ? <><Wand2 style={{ width: "14px", height: "14px" }} />Optimize Quote</>
              : <><BookOpen style={{ width: "14px", height: "14px" }} />Generate Scope</>}
          </button>
        ))}
      </div>

      {/* Input Card */}
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 20px 40px" }}>
        {mode === "scope" ? (
          /* ── Scope Generator Form ── */
          <form onSubmit={handleScope} style={{
            background: "#fff", borderRadius: "24px",
            border: "1px solid #e2e8f0", boxShadow: "0 4px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}>
            <div style={{ padding: "8px 0 0", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "10px", paddingLeft: "24px" }}>
              <BookOpen style={{ width: "16px", height: "16px", color: "#2563eb" }} />
              <span style={{ fontWeight: 700, fontSize: "14px", color: "#1e293b", padding: "14px 0" }}>Scope of Work Generator</span>
              <span style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "4px" }}>— free, ISSA 2026 standards</span>
            </div>
            <div style={{ padding: "24px", display: "grid", gap: "16px" }}>
              {/* Facility type */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Facility Type</label>
                <div style={{ position: "relative" }}>
                  <select value={scopeFacility} onChange={e => setScopeFacility(e.target.value)}
                    style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "12px 36px 12px 14px", fontSize: "14px", color: "#1e293b", appearance: "none", background: "#f8fafc", fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
                    {FACILITY_TYPES_SCOPE.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <ChevronDown style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", width: "15px", height: "15px", color: "#94a3b8", pointerEvents: "none" }} />
                </div>
              </div>
              {/* Sq ft + Floors row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Square Footage</label>
                  <input type="number" min="100" max="500000" placeholder="e.g. 5000" value={scopeSqFt} onChange={e => setScopeSqFt(e.target.value)}
                    style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "12px 14px", fontSize: "14px", color: "#1e293b", background: "#f8fafc", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Floors</label>
                  <input type="number" min="1" max="50" placeholder="1" value={scopeFloors} onChange={e => setScopeFloors(e.target.value)}
                    style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "12px 14px", fontSize: "14px", color: "#1e293b", background: "#f8fafc", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              {/* Frequency */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Cleaning Frequency</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {FREQUENCY_OPTIONS_SCOPE.map(f => (
                    <button key={f.value} type="button" onClick={() => setScopeFrequency(f.value)}
                      style={{
                        padding: "7px 16px", borderRadius: "100px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600, transition: "all 0.12s",
                        background: scopeFrequency === f.value ? "#2563eb" : "#f1f5f9",
                        color: scopeFrequency === f.value ? "#fff" : "#64748b",
                      }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Special notes */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "#374151", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Special Requirements <span style={{ fontWeight: 400, textTransform: "none", color: "#94a3b8" }}>(optional)</span></label>
                <textarea value={scopeNotes} onChange={e => setScopeNotes(e.target.value)} rows={3}
                  placeholder="e.g. High-traffic lobby, medical waste handling, after-hours only, floor waxing quarterly..."
                  style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "12px 14px", fontSize: "14px", color: "#1e293b", lineHeight: 1.6, resize: "vertical", outline: "none", background: "#f8fafc", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              {scopeError && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "12px 16px", fontSize: "13.5px", color: "#dc2626" }}>
                  <X style={{ width: "15px", height: "15px", flexShrink: 0, marginTop: "1px" }} />
                  {scopeError}
                </div>
              )}
              <button type="submit" disabled={scopeLoading} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                background: scopeLoading ? "#94a3b8" : "linear-gradient(135deg, #2563eb, #7c3aed)",
                color: "#fff", fontWeight: 800, fontSize: "15px", padding: "16px",
                borderRadius: "14px", border: "none", cursor: scopeLoading ? "not-allowed" : "pointer",
                boxShadow: scopeLoading ? "none" : "0 4px 16px rgba(37,99,235,0.35)", transition: "all 0.15s",
              }}>
                {scopeLoading
                  ? <><Loader2 style={{ width: "18px", height: "18px" }} className="animate-spin" />Generating scope...</>
                  : <><BookOpen style={{ width: "18px", height: "18px" }} />Generate Scope of Work — Free</>}
              </button>
              <p style={{ textAlign: "center", fontSize: "12px", color: "#94a3b8", margin: "-4px 0 0" }}>Takes about 10 seconds · ISSA 2026 standards</p>
            </div>
          </form>
        ) : (
        <form onSubmit={handleSubmit} style={{
          background: "#fff", borderRadius: "24px",
          border: "1px solid #e2e8f0", boxShadow: "0 4px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9" }}>
            {(["paste", "upload"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  padding: "14px 0", fontSize: "13.5px", fontWeight: 700, cursor: "pointer", border: "none",
                  background: tab === t ? "#fff" : "#f8fafc",
                  color: tab === t ? "#2563eb" : "#94a3b8",
                  borderBottom: tab === t ? "2px solid #2563eb" : "2px solid transparent",
                  transition: "all 0.15s",
                }}>
                {t === "paste"
                  ? <><FileText style={{ width: "15px", height: "15px" }} />Paste Quote Text</>
                  : <><Upload style={{ width: "15px", height: "15px" }} />Upload Screenshot</>}
              </button>
            ))}
          </div>

          <div style={{ padding: "24px" }}>
            {tab === "paste" ? (
              <textarea
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder={"Paste your current quote here...\n\nExample:\nHi Sarah,\nYour clean is $180. Let me know.\n- Mike"}
                rows={10}
                style={{
                  width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "14px",
                  padding: "16px", fontSize: "14px", color: "#1e293b",
                  lineHeight: 1.7, resize: "none", outline: "none",
                  background: "#f8fafc", fontFamily: "inherit",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => { (e.target as any).style.borderColor = "#2563eb"; (e.target as any).style.background = "#fff"; }}
                onBlur={e => { (e.target as any).style.borderColor = "#e2e8f0"; (e.target as any).style.background = "#f8fafc"; }}
              />
            ) : (
              <div>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} style={{ display: "none" }} />
                {imagePreview ? (
                  <div style={{ position: "relative" }}>
                    <img src={imagePreview} alt="Quote screenshot" style={{ width: "100%", maxHeight: "280px", objectFit: "contain", borderRadius: "14px", border: "1.5px solid #e2e8f0" }} />
                    <button type="button" onClick={clearImage} style={{
                      position: "absolute", top: "8px", right: "8px", background: "#fff", borderRadius: "100%",
                      width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center",
                      border: "1px solid #e2e8f0", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    }}>
                      <X style={{ width: "14px", height: "14px", color: "#64748b" }} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} style={{
                    width: "100%", border: "2px dashed #e2e8f0", borderRadius: "14px",
                    padding: "52px 20px", display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", gap: "12px", cursor: "pointer", background: "#f8fafc",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as any).style.borderColor = "#2563eb"; (e.currentTarget as any).style.background = "#eff6ff"; }}
                  onMouseLeave={e => { (e.currentTarget as any).style.borderColor = "#e2e8f0"; (e.currentTarget as any).style.background = "#f8fafc"; }}
                  >
                    <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "linear-gradient(135deg, #dbeafe, #bfdbfe)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Upload style={{ width: "24px", height: "24px", color: "#2563eb" }} />
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "#374151", margin: "0 0 4px" }}>Click to upload a screenshot</p>
                      <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>PNG, JPG, or WEBP • Any quote screenshot works</p>
                    </div>
                  </button>
                )}
              </div>
            )}

            {error && (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: "8px",
                background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: "12px", padding: "12px 16px", marginTop: "16px",
                fontSize: "13.5px", color: "#dc2626",
              }}>
                <X style={{ width: "15px", height: "15px", flexShrink: 0, marginTop: "1px" }} />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              background: loading ? "#94a3b8" : "linear-gradient(135deg, #16a34a, #059669)",
              color: "#fff", fontWeight: 800, fontSize: "15px", padding: "16px",
              borderRadius: "14px", border: "none", cursor: loading ? "not-allowed" : "pointer",
              marginTop: "16px", boxShadow: loading ? "none" : "0 4px 16px rgba(22,163,74,0.35)",
              transition: "all 0.15s",
            }}>
              {loading
                ? <><Loader2 style={{ width: "18px", height: "18px" }} className="animate-spin" />Optimizing your quote...</>
                : <><Zap style={{ width: "18px", height: "18px" }} />Optimize My Quote — It's Free</>}
            </button>
            <p style={{ textAlign: "center", fontSize: "12px", color: "#94a3b8", margin: "10px 0 0" }}>Takes about 10 seconds</p>
          </div>
        </form>
        )} {/* end mode === "optimize" ternary */}
      </div>

      {/* ─── Scope Results ─── */}
      {mode === "scope" && scopeResult && (
        <div ref={scopeRef} style={{ maxWidth: "760px", margin: "0 auto", padding: "0 20px 60px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "linear-gradient(135deg, #eff6ff, #dbeafe)", border: "1.5px solid #93c5fd", borderRadius: "16px", padding: "14px 20px", marginBottom: "20px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", flexShrink: 0, background: "linear-gradient(135deg, #2563eb, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Check style={{ width: "20px", height: "20px", color: "#fff" }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "14px", fontWeight: 800, color: "#1e3a8a", margin: "0 0 2px" }}>Scope Generated</p>
              <p style={{ fontSize: "12.5px", color: "#1d4ed8", margin: 0 }}>ISSA 2026 standards · Ready to attach to your proposal</p>
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: "20px", border: "1px solid #e2e8f0", padding: "28px 32px", marginBottom: "20px", whiteSpace: "pre-wrap", fontFamily: "ui-monospace, monospace", fontSize: "13px", lineHeight: 1.75, color: "#1e293b", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
            {scopeResult}
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "28px" }}>
            <button onClick={async () => { await navigator.clipboard.writeText(scopeResult); setScopeCopied(true); setTimeout(() => setScopeCopied(false), 2000); }}
              style={{ flex: 1, minWidth: "140px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "14px 20px", borderRadius: "14px", border: "none", cursor: "pointer", background: "#0f172a", color: "#fff", fontSize: "14px", fontWeight: 700, transition: "all 0.15s" }}>
              {scopeCopied ? <><Check style={{ width: "15px", height: "15px", color: "#4ade80" }} />Copied!</> : <><Copy style={{ width: "15px", height: "15px" }} />Copy Scope</>}
            </button>
            <button onClick={() => { setScopeResult(null); setScopeNotes(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{ flex: 1, minWidth: "140px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "14px 20px", borderRadius: "14px", cursor: "pointer", background: "#fff", border: "2px solid #e2e8f0", color: "#374151", fontSize: "14px", fontWeight: 700, transition: "all 0.15s" }}>
              <X style={{ width: "15px", height: "15px" }} />Generate Another
            </button>
          </div>
          {/* Scope upsell */}
          <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)", borderRadius: "20px", padding: "36px 40px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, opacity: 0.05, backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
            <div style={{ position: "relative" }}>
              <p style={{ fontSize: "20px", fontWeight: 800, color: "#fff", marginBottom: "10px", lineHeight: 1.3 }}>Attach this scope to a winning proposal</p>
              <p style={{ fontSize: "14px", color: "rgba(147,197,253,0.9)", maxWidth: "400px", margin: "0 auto 24px", lineHeight: 1.65 }}>QuotePro generates branded proposals with a scope, pricing tiers, and e-signature — in 60 seconds.</p>
              <a href="/register" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "linear-gradient(135deg, #16a34a, #059669)", color: "#fff", fontWeight: 800, padding: "14px 32px", borderRadius: "14px", textDecoration: "none", fontSize: "15px", boxShadow: "0 4px 20px rgba(22,163,74,0.4)" }}>
                Start My Free 7-Day Trial <ArrowRight style={{ width: "18px", height: "18px" }} />
              </a>
              <p style={{ fontSize: "12px", color: "rgba(148,163,184,0.8)", marginTop: "12px" }}>No credit card required. Cancel anytime.</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Results ─── */}
      {optimized && parsed && (
        <div ref={resultRef} style={{ maxWidth: "760px", margin: "0 auto", padding: "0 20px 60px" }}>

          {/* Score banner */}
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
            border: "1.5px solid #86efac", borderRadius: "16px",
            padding: "14px 20px", marginBottom: "20px",
          }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "12px", flexShrink: 0,
              background: "linear-gradient(135deg, #16a34a, #059669)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Check style={{ width: "20px", height: "20px", color: "#fff" }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "14px", fontWeight: 800, color: "#14532d", margin: "0 0 2px" }}>Quote Optimized</p>
              <p style={{ fontSize: "12.5px", color: "#15803d", margin: 0 }}>Rewritten to build trust, justify pricing, and convert more jobs</p>
            </div>
            <div style={{ display: "flex", gap: "2px" }}>
              {[1,2,3,4,5].map(i => <Star key={i} style={{ width: "14px", height: "14px", fill: "#16a34a", color: "#16a34a" }} />)}
            </div>
          </div>

          {/* Proposal preview */}
          <div style={{
            borderRadius: "24px",
            boxShadow: "0 8px 48px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.05)",
            overflow: "hidden",
            marginBottom: "16px",
            border: "1px solid rgba(0,0,0,0.06)",
          }}>
            <ProposalCard parsed={parsed} />
          </div>

          {/* AI Adjust panel */}
          <div style={{ background: "#f8fafc", borderRadius: "16px", border: "1px solid #e2e8f0", marginBottom: "16px", overflow: "hidden" }}>
            <button type="button" onClick={() => setAdjustOpen(o => !o)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Wand2 style={{ width: "15px", height: "15px", color: "#7c3aed" }} />
                <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#1e293b" }}>AI Adjust</span>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>— tweak tone, pricing, expiry, or anything else</span>
              </div>
              <ChevronDown style={{ width: "15px", height: "15px", color: "#94a3b8", transform: adjustOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>
            {adjustOpen && (
              <div style={{ padding: "0 18px 18px", display: "grid", gap: "10px" }}>
                <textarea value={adjustText} onChange={e => setAdjustText(e.target.value)} rows={3}
                  placeholder="e.g. 'Make it sound warmer and less formal' · 'Change the price to $320' · 'Remove the 7-day expiry'"
                  style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "12px 14px", fontSize: "13.5px", color: "#1e293b", lineHeight: 1.6, resize: "vertical", outline: "none", background: "#fff", fontFamily: "inherit", boxSizing: "border-box" }} />
                {adjustError && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#dc2626" }}>
                    <X style={{ width: "14px", height: "14px", flexShrink: 0, marginTop: "1px" }} />
                    {adjustError}
                  </div>
                )}
                <button type="button" onClick={handleAdjust} disabled={adjustLoading || !adjustText.trim()}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    padding: "12px 20px", borderRadius: "12px", border: "none", cursor: adjustLoading || !adjustText.trim() ? "not-allowed" : "pointer",
                    background: adjustLoading || !adjustText.trim() ? "#94a3b8" : "linear-gradient(135deg, #7c3aed, #a855f7)",
                    color: "#fff", fontSize: "14px", fontWeight: 700, transition: "all 0.15s",
                    boxShadow: adjustLoading || !adjustText.trim() ? "none" : "0 4px 14px rgba(124,58,237,0.35)",
                  }}>
                  {adjustLoading
                    ? <><Loader2 style={{ width: "16px", height: "16px" }} className="animate-spin" />Applying changes...</>
                    : <><Wand2 style={{ width: "16px", height: "16px" }} />Apply Changes</>}
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
            <button onClick={handleCopy} style={{
              flex: 1, minWidth: "140px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              padding: "14px 20px", borderRadius: "14px", border: "none", cursor: "pointer",
              background: "#0f172a", color: "#fff", fontSize: "14px", fontWeight: 700,
              transition: "all 0.15s",
            }}>
              {copied ? <><Check style={{ width: "15px", height: "15px", color: "#4ade80" }} />Copied!</> : <><Copy style={{ width: "15px", height: "15px" }} />Copy Raw Text</>}
            </button>
            <button onClick={handlePDF} style={{
              flex: 1, minWidth: "140px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              padding: "14px 20px", borderRadius: "14px", cursor: "pointer",
              background: "#fff", border: "2px solid #e2e8f0", color: "#374151", fontSize: "14px", fontWeight: 700,
              transition: "all 0.15s",
            }}>
              <Download style={{ width: "15px", height: "15px" }} />Save as PDF
            </button>
          </div>

          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <button onClick={() => { setOptimized(null); setParsed(null); setQuoteText(""); clearImage(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#94a3b8", textDecoration: "underline", textUnderlineOffset: "3px" }}>
              Optimize another quote
            </button>
          </div>

          {/* Conversion CTA */}
          <div style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)",
            borderRadius: "20px", padding: "36px 40px", textAlign: "center",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", inset: 0, opacity: 0.05,
              backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }} />
            <div style={{ position: "relative" }}>
              <p style={{ fontSize: "20px", fontWeight: 800, color: "#fff", marginBottom: "10px", lineHeight: 1.3 }}>
                QuotePro sends quotes like this automatically
              </p>
              <p style={{ fontSize: "14px", color: "rgba(147,197,253,0.9)", maxWidth: "400px", margin: "0 auto 24px", lineHeight: 1.65 }}>
                Beautiful proposals, auto follow-up, built-in CRM — from your phone, in 60 seconds.
              </p>
              <a href="/register" style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                background: "linear-gradient(135deg, #16a34a, #059669)",
                color: "#fff", fontWeight: 800, padding: "14px 32px",
                borderRadius: "14px", textDecoration: "none", fontSize: "15px",
                boxShadow: "0 4px 20px rgba(22,163,74,0.4)",
              }}>
                Start My Free 7-Day Trial <ArrowRight style={{ width: "18px", height: "18px" }} />
              </a>
              <p style={{ fontSize: "12px", color: "rgba(148,163,184,0.8)", marginTop: "12px" }}>No credit card required. Cancel anytime.</p>
            </div>
          </div>

          {/* Share */}
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "10px" }}>Know another cleaner with a weak quote? Share this tool:</p>
            <button onClick={copyShareLink} style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "10px 20px", borderRadius: "12px", cursor: "pointer",
              background: "#fff", border: "1.5px solid #e2e8f0", color: "#374151",
              fontSize: "13px", fontWeight: 600, transition: "all 0.15s",
            }}>
              <Share2 style={{ width: "14px", height: "14px" }} />
              {linkCopied ? "Link copied!" : "Copy Share Link"}
            </button>
          </div>
        </div>
      )}

      {/* Bottom sign-in link */}
      {!optimized && (
        <div style={{ maxWidth: "600px", margin: "0 auto", padding: "0 24px 80px", textAlign: "center" }}>
          <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "8px" }}>Already using QuotePro?</p>
          <a href="/login" style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            fontSize: "14px", fontWeight: 700, color: "#374151", textDecoration: "none",
          }}>
            Sign in to your account <ChevronRight style={{ width: "15px", height: "15px" }} />
          </a>
        </div>
      )}
    </div>
  );
}
