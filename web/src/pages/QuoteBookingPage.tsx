/**
 * QuoteBookingPage.tsx
 *
 * Customer-facing booking flow:
 *   1. Load token → pick_slot (or pre-selected slot)
 *   2. service_upgrade — Good / Better / Best tier picker
 *   3. address — confirm details
 *   4. confirmed
 */

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ChatWidget } from "../components/public/ChatWidget";
import AddressAutocompleteLine from "../components/AddressAutocompleteLine";
import {
  CheckCircle, Loader2, AlertCircle, Calendar, Clock, Home,
  Check, ChevronRight, Star, ArrowLeft,
} from "lucide-react";

const API_BASE = typeof window !== "undefined" ? window.location.origin : "";

interface ServiceTier {
  id: string;
  name: string;
  description: string;
  priceMin: number;
  priceMax: number;
  tag?: string;   // "Good" | "Better" | "Best" | undefined
  isCurrent: boolean;
}

interface BookingData {
  token: string;
  used: boolean;
  contact: { firstName: string; lastName: string; email: string; phone?: string; zip?: string };
  home: { serviceType: string; bedrooms: number; bathrooms: number; sqft?: string; condition: string; extras: string[] };
  preferences: { preferredDate?: string };
  quote: {
    exactAmount?: number; rangeMin?: number; rangeMax?: number;
    estimatedDuration?: string; breakdown?: { item: string; amount: number }[];
  };
  quoteType: "exact" | "range";
  serviceTiers: ServiceTier[];
  business: {
    companyName: string; logoUri?: string; primaryColor: string;
    phone?: string; email?: string; address?: string; userId: string;
    publicQuoteSlug?: string; chatWidgetEnabled?: boolean; chatWidgetColor?: string;
  };
}

interface AvailableSlot { date: string; dayLabel: string; times: string[] }

type Phase = "loading" | "pick_slot" | "service_upgrade" | "address" | "confirming" | "confirmed" | "expired" | "error";

export default function QuoteBookingPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const preSlot = searchParams.get("slot");

  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<BookingData | null>(null);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(preSlot);
  const [selectedTier, setSelectedTier] = useState<ServiceTier | null>(null);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmedInfo, setConfirmedInfo] = useState<{ displayDate: string; displayTime: string } | null>(null);

  useEffect(() => {
    if (!token) { setPhase("error"); return; }
    fetch(`${API_BASE}/api/booking-token/${token}`)
      .then(async (r) => {
        if (r.status === 404) throw new Error("not_found");
        if (r.status === 410) { setPhase("expired"); return; }
        if (r.status === 409) { setPhase("confirmed"); return; }
        if (!r.ok) throw new Error("fetch_error");
        const d: BookingData = await r.json();
        setData(d);
        // Default selected tier = the tier that matches their original service
        const defaultTier = d.serviceTiers?.find((t) => t.isCurrent) || d.serviceTiers?.[0] || null;
        setSelectedTier(defaultTier);
        if (preSlot) {
          setSelectedSlot(preSlot);
          setPhase(d.serviceTiers?.length > 1 ? "service_upgrade" : "address");
        } else {
          await fetchSlots(token, d.preferences?.preferredDate);
          setPhase("pick_slot");
        }
      })
      .catch(() => {
        setPhase("error");
        setErrorMsg("Unable to load booking page. This link may be invalid or expired.");
      });
  }, [token]);

  async function fetchSlots(tok: string, preferredDate?: string) {
    try {
      const url = preferredDate
        ? `${API_BASE}/api/booking-token/${tok}/slots?preferredDate=${preferredDate}`
        : `${API_BASE}/api/booking-token/${tok}/slots`;
      const r = await fetch(url);
      if (r.ok) {
        const d = await r.json();
        setSlots(d.slots || []);
      }
    } catch { /* slots unavailable */ }
  }

  function handleSlotSelect(slotValue: string) {
    setSelectedSlot(slotValue);
    setPhase(data?.serviceTiers?.length > 1 ? "service_upgrade" : "address");
  }

  async function handleConfirm() {
    if (!selectedSlot || !token) return;
    setPhase("confirming");
    try {
      const body: Record<string, unknown> = {
        slot: selectedSlot,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (selectedTier && !selectedTier.isCurrent) {
        body.serviceType = selectedTier.id;
        body.upgradedPrice = Math.round((selectedTier.priceMin + selectedTier.priceMax) / 2);
      }
      const resp = await fetch(`${API_BASE}/api/booking-token/${token}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await resp.json();
      if (!resp.ok) {
        if (resp.status === 409) {
          setErrorMsg("This slot was just taken. Please choose another time.");
          setPhase("pick_slot");
          setSelectedSlot(null);
          if (token) fetchSlots(token, data?.preferences?.preferredDate);
        } else {
          throw new Error(result.message || "Confirmation failed");
        }
        return;
      }
      setConfirmedInfo({ displayDate: result.booking.displayDate, displayTime: result.booking.displayTime });
      setPhase("confirmed");
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong. Please try again.");
      setPhase("address");
    }
  }

  const color = data?.business.primaryColor || "#2563EB";

  function parseSlot(slot: string) {
    const [date, time] = slot.split("T");
    if (!date || !time) return { date: slot, time: "" };
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    const displayDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
    return { date: displayDate, time: `${h12}:${String(m).padStart(2, "0")} ${period}` };
  }

  const slotInfo = selectedSlot ? parseSlot(selectedSlot) : null;
  const quoteStr = data
    ? (data.quoteType === "exact"
        ? `$${(data.quote.exactAmount || 0).toLocaleString()}`
        : `$${(data.quote.rangeMin || 0).toLocaleString()} – $${(data.quote.rangeMax || 0).toLocaleString()}`)
    : "";
  const SERVICE_LABELS: Record<string, string> = {
    standard: "Standard Clean", deep: "Deep Clean",
    move: "Move In / Move Out", moveinout: "Move In / Move Out",
    post_construction: "Post-Construction Clean", postconstruct: "Post-Construction",
    airbnb: "Airbnb Turnover",
  };
  const serviceLabel = data
    ? (selectedTier?.name || SERVICE_LABELS[data.home.serviceType] || data.home.serviceType)
    : "";

  // Price display for confirmation
  const displayPrice = selectedTier
    ? (selectedTier.isCurrent ? quoteStr : `$${selectedTier.priceMin.toLocaleString()} – $${selectedTier.priceMax.toLocaleString()}`)
    : quoteStr;

  return (
    <div style={{ minHeight: "100vh", background: "#F3F4F6", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0;transform:translateY(10px) } to { opacity:1;transform:translateY(0) } }
        * { box-sizing: border-box; }
        input,textarea { font-family: inherit; }
        .qb-slot:hover { border-color: ${color} !important; background: ${rgba(color, 0.05)} !important; }
        .qb-tier:hover { border-color: ${color} !important; box-shadow: 0 0 0 3px ${rgba(color, 0.1)} !important; }
      `}</style>

      {/* Header */}
      <div style={{ background: color, padding: "20px 16px", textAlign: "center" }}>
        {data?.business.logoUri ? (
          <img src={data.business.logoUri} alt={data.business.companyName} style={{ maxHeight: 48, maxWidth: 160, objectFit: "contain" }} />
        ) : (
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{data?.business.companyName || "QuotePro"}</div>
        )}
      </div>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 16px 48px" }}>

        {/* Loading */}
        {phase === "loading" && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Loader2 size={36} style={{ color: "#9CA3AF", animation: "spin 1s linear infinite", display: "block", margin: "0 auto 16px" }} />
            <div style={{ color: "#6B7280" }}>Loading your booking…</div>
          </div>
        )}

        {/* Confirming */}
        {phase === "confirming" && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Loader2 size={36} style={{ color, animation: "spin 1s linear infinite", display: "block", margin: "0 auto 16px" }} />
            <div style={{ fontWeight: 700, color: "#111827", fontSize: 16 }}>Confirming your booking…</div>
            <div style={{ color: "#6B7280", fontSize: 14, marginTop: 6 }}>Just a moment</div>
          </div>
        )}

        {/* Expired */}
        {phase === "expired" && (
          <Card>
            <AlertCircle size={48} style={{ color: "#F59E0B", display: "block", margin: "0 auto 20px" }} />
            <h2 style={h2}>Link Expired</h2>
            <p style={sub}>This booking link has expired (links are valid for 48 hours). Please contact {data?.business.companyName || "the business"} to get a new quote.</p>
            {data?.business.phone && <ContactInfo phone={data.business.phone} email={data.business.email} />}
          </Card>
        )}

        {/* Error */}
        {phase === "error" && (
          <Card>
            <AlertCircle size={48} style={{ color: "#EF4444", display: "block", margin: "0 auto 20px" }} />
            <h2 style={h2}>Something went wrong</h2>
            <p style={sub}>{errorMsg || "This booking link is invalid or no longer available."}</p>
          </Card>
        )}

        {/* Confirmed */}
        {phase === "confirmed" && (
          <div style={{ animation: "fadeUp .3s ease" }}>
            <Card>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <CheckCircle size={38} style={{ color: "#16A34A" }} />
              </div>
              <h2 style={{ ...h2, color: "#16A34A" }}>Booking Confirmed!</h2>
              {confirmedInfo ? (
                <>
                  <p style={{ ...sub, marginBottom: 20 }}>
                    We've confirmed your appointment and sent a confirmation email to <strong>{data?.contact.email}</strong>.
                  </p>
                  <div style={{ background: "#F9FAFB", borderRadius: 12, padding: "16px 20px", textAlign: "left", marginBottom: 16 }}>
                    <div style={{ fontSize: 14, color: "#374151", marginBottom: 6 }}>
                      <Calendar size={14} style={{ verticalAlign: "middle", marginRight: 6, color }} />
                      <strong>{confirmedInfo.displayDate}</strong>
                    </div>
                    <div style={{ fontSize: 14, color: "#374151", marginBottom: 6 }}>
                      <Clock size={14} style={{ verticalAlign: "middle", marginRight: 6, color }} />
                      <strong>{confirmedInfo.displayTime}</strong>
                    </div>
                    <div style={{ fontSize: 14, color: "#374151" }}>
                      <Home size={14} style={{ verticalAlign: "middle", marginRight: 6, color }} />
                      {serviceLabel} &bull; {data?.home.bedrooms}BR / {data?.home.bathrooms}BA
                    </div>
                  </div>
                </>
              ) : (
                <p style={sub}>Your booking has already been confirmed. Check your email for details.</p>
              )}
              {data?.business.phone && <ContactInfo phone={data.business.phone} email={data.business.email} />}
            </Card>
          </div>
        )}

        {/* ── Pick a slot ───────────────────────────────────────────────────── */}
        {phase === "pick_slot" && data && (
          <div style={{ animation: "fadeUp .25s ease" }}>
            {errorMsg && <ErrorBanner msg={errorMsg} />}
            <Card>
              <h2 style={h2}>Pick a time that works</h2>
              <div style={{ background: "#F9FAFB", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: "#6B7280" }}>{SERVICE_LABELS[data.home.serviceType] || data.home.serviceType} &bull; {data.home.bedrooms}BR / {data.home.bathrooms}BA</div>
                <div style={{ fontSize: 24, fontWeight: 800, color }}>{quoteStr}</div>
              </div>

              {slots.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <p style={{ color: "#6B7280", fontSize: 14 }}>No available slots found. Please contact us to schedule.</p>
                  {data.business.phone && <ContactInfo phone={data.business.phone} email={data.business.email} />}
                </div>
              ) : (
                slots.map((day) => (
                  <div key={day.date} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{day.dayLabel}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {day.times.map((t) => {
                        const slotValue = `${day.date}T${to24(t)}`;
                        const isSelected = selectedSlot === slotValue;
                        return (
                          <button
                            key={t} className="qb-slot"
                            onClick={() => handleSlotSelect(slotValue)}
                            style={{ padding: "9px 16px", border: `2px solid ${isSelected ? color : "#D1D5DB"}`, borderRadius: 8, background: isSelected ? rgba(color, 0.08) : "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, color: isSelected ? color : "#374151", display: "flex", alignItems: "center", gap: 6, transition: "all .15s" }}>
                            {isSelected && <Check size={13} />}
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </Card>
          </div>
        )}

        {/* ── Service Upgrade ───────────────────────────────────────────────── */}
        {phase === "service_upgrade" && data && slotInfo && (
          <div style={{ animation: "fadeUp .25s ease" }}>
            {/* Slot summary pill */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 12, padding: "12px 16px", marginBottom: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <button
                onClick={() => setPhase("pick_slot")}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#6B7280", display: "flex", alignItems: "center" }}>
                <ArrowLeft size={16} />
              </button>
              <Calendar size={15} style={{ color, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{slotInfo.date}</span>
              <Clock size={15} style={{ color, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{slotInfo.time}</span>
            </div>

            <Card>
              <h2 style={h2}>Choose your service</h2>
              <p style={{ ...sub, marginBottom: 20 }}>
                All prices are estimates based on your {data.home.bedrooms}BR / {data.home.bathrooms}BA home.
                Final quote confirmed after your clean.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                {data.serviceTiers.map((tier) => {
                  const isSelected = selectedTier?.id === tier.id;
                  const tagColors: Record<string, { bg: string; text: string; border: string }> = {
                    Good:   { bg: "#F0FDF4", text: "#166534", border: "#86EFAC" },
                    Better: { bg: "#EFF6FF", text: "#1D4ED8", border: "#93C5FD" },
                    Best:   { bg: "#FDF4FF", text: "#7E22CE", border: "#D8B4FE" },
                  };
                  const tagStyle = tier.tag ? tagColors[tier.tag] : null;

                  return (
                    <button
                      key={tier.id}
                      className="qb-tier"
                      onClick={() => setSelectedTier(tier)}
                      style={{
                        width: "100%", textAlign: "left", padding: "16px 18px",
                        border: `2px solid ${isSelected ? color : "#E5E7EB"}`,
                        borderRadius: 14, background: isSelected ? rgba(color, 0.04) : "#fff",
                        cursor: "pointer", transition: "all .15s",
                        boxShadow: isSelected ? `0 0 0 3px ${rgba(color, 0.12)}` : "none",
                        position: "relative",
                      }}>

                      {/* Selected check */}
                      {isSelected && (
                        <div style={{ position: "absolute", top: 14, right: 14, width: 22, height: 22, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Check size={13} color="#fff" strokeWidth={3} />
                        </div>
                      )}

                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{tier.name}</span>
                            {tier.tag && tagStyle && (
                              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: tagStyle.bg, color: tagStyle.text, border: `1px solid ${tagStyle.border}`, letterSpacing: "0.03em" }}>
                                {tier.tag === "Best" && <Star size={9} style={{ verticalAlign: "middle", marginRight: 2 }} />}
                                {tier.tag}
                              </span>
                            )}
                            {tier.isCurrent && !tier.tag && (
                              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "#F3F4F6", color: "#6B7280" }}>Your quote</span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.4 }}>{tier.description}</div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: "right" }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: isSelected ? color : "#111827" }}>
                            ${tier.priceMin.toLocaleString()}
                          </div>
                          <div style={{ fontSize: 12, color: "#9CA3AF" }}>
                            – ${tier.priceMax.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPhase("address")}
                disabled={!selectedTier}
                style={{ width: "100%", padding: "14px", background: selectedTier ? color : "#D1D5DB", color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: selectedTier ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                Continue <ChevronRight size={18} />
              </button>
              <p style={{ textAlign: "center", fontSize: 11, color: "#9CA3AF", marginTop: 10, marginBottom: 0 }}>
                Prices are estimates — final price confirmed after inspection
              </p>
            </Card>
          </div>
        )}

        {/* ── Address / Confirm ─────────────────────────────────────────────── */}
        {phase === "address" && data && slotInfo && (
          <div style={{ animation: "fadeUp .25s ease" }}>
            {errorMsg && <ErrorBanner msg={errorMsg} />}

            <Card>
              <h2 style={h2}>Confirm your booking</h2>
              <p style={sub}>Review your details and confirm below.</p>

              {/* Quote summary */}
              <div style={{ background: "#F9FAFB", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 2 }}>
                      {serviceLabel} &bull; {data.home.bedrooms}BR / {data.home.bathrooms}BA
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, color }}>{displayPrice}</div>
                  </div>
                  {data.serviceTiers.length > 1 && (
                    <button
                      onClick={() => setPhase("service_upgrade")}
                      style={{ fontSize: 13, color, background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0, textDecoration: "underline" }}>
                      Change
                    </button>
                  )}
                </div>

                <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 10 }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                    <Calendar size={14} style={{ color }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{slotInfo.date}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <Clock size={14} style={{ color }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{slotInfo.time}</span>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Service address (optional)</label>
                <AddressAutocompleteLine
                  value={address}
                  onChange={setAddress}
                  placeholder="123 Main St, City, State"
                  inputStyle={{ width: "100%", padding: "11px 14px 11px 36px", border: "1.5px solid #D1D5DB", borderRadius: 10, fontSize: 15, color: "#111827", background: "#fff", outline: "none" }}
                />
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 24 }}>
                <label style={lbl}>Special instructions (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Gate code, parking instructions, pets…"
                  rows={2}
                  style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #D1D5DB", borderRadius: 10, fontSize: 15, color: "#111827", background: "#fff", outline: "none", resize: "vertical", fontFamily: "inherit" }}
                />
              </div>

              <button
                onClick={handleConfirm}
                style={{ width: "100%", padding: "14px", background: color, color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Check size={18} /> Confirm Booking
              </button>

              <p style={{ textAlign: "center", fontSize: 11, color: "#9CA3AF", marginTop: 10, marginBottom: 0 }}>
                No payment required at this time
              </p>
            </Card>
          </div>
        )}
      </div>

      {data?.business?.chatWidgetEnabled !== false && data?.business?.publicQuoteSlug && (
        <ChatWidget
          businessName={data.business.companyName}
          businessSlug={data.business.publicQuoteSlug}
          primaryColor={data.business.chatWidgetColor || data.business.primaryColor || "#0F6E56"}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 20, padding: "32px 28px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", textAlign: "center" }}>
      {children}
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10 }}>
      <AlertCircle size={16} style={{ color: "#EF4444", flexShrink: 0 }} />
      <span style={{ fontSize: 14, color: "#B91C1C" }}>{msg}</span>
    </div>
  );
}

function ContactInfo({ phone, email }: { phone?: string; email?: string }) {
  return (
    <div style={{ marginTop: 16, fontSize: 13, color: "#6B7280" }}>
      {phone && <div>Call us: <a href={`tel:${phone}`} style={{ color: "#2563EB", fontWeight: 600 }}>{phone}</a></div>}
      {email && <div>Email: <a href={`mailto:${email}`} style={{ color: "#2563EB", fontWeight: 600 }}>{email}</a></div>}
    </div>
  );
}

// ─── Style atoms ──────────────────────────────────────────────────────────────
const h2: React.CSSProperties = { fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 10px" };
const sub: React.CSSProperties = { fontSize: 14, color: "#6B7280", lineHeight: 1.6, margin: "0 0 20px" };
const lbl: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 };

function to24(time12: string): string {
  const parts = time12.trim().split(" ");
  if (parts.length < 2) return time12;
  const [timePart, period] = parts;
  const [hStr, mStr] = timePart.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || "00", 10);
  const hour = period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h;
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function rgba(hex: string, a: number): string {
  const c = hex.replace("#", "");
  if (c.length < 6) return `rgba(37,99,235,${a})`;
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
