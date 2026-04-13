import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChatWidget } from "../components/public/ChatWidget";
import {
  ChevronRight, ChevronLeft, Check, Loader2, AlertCircle,
  Sparkles, Calendar, Phone, Mail, MapPin,
  Clock, MessageSquare, Star, Home,
} from "lucide-react";
import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";

const API_BASE = typeof window !== "undefined" ? window.location.origin : "";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BizInfo {
  companyName: string;
  logoUri?: string;
  primaryColor: string;
  phone?: string;
  email?: string;
  address?: string;
  autopilotEnabled: boolean;
  chatWidgetEnabled?: boolean;
  chatWidgetColor?: string;
  publicQuoteSlug?: string;
}

interface FormData {
  firstName: string; lastName: string; email: string; phone: string;
  street: string; apt: string; city: string; state: string; zip: string;
  lat: number | null; lng: number | null;
  serviceType: string;
  bedrooms: number; bathrooms: number; sqft: string; condition: string; extras: string[];
  preferredDate: string; preferredTime: string; source: string; notes: string;
}

type FormErrors = Partial<Record<keyof FormData, string>>;

const EXTRAS = [
  { id: "oven", label: "Inside oven" },
  { id: "fridge", label: "Inside fridge" },
  { id: "windows", label: "Interior windows" },
  { id: "laundry", label: "Laundry" },
  { id: "garage", label: "Garage" },
  { id: "basement", label: "Basement" },
  { id: "pets", label: "Pets in home" },
  { id: "carpet", label: "Has carpet" },
];

const SERVICE_TYPES = [
  { id: "standard", label: "Standard Clean", desc: "Regular recurring or one-time clean" },
  { id: "deep", label: "Deep Clean", desc: "Thorough top-to-bottom cleaning" },
  { id: "move", label: "Move In/Out", desc: "Moving into or out of a home" },
  { id: "post_construction", label: "Post-Construction", desc: "After renovation or construction" },
];

const CONDITIONS = [
  { id: "great", label: "Well maintained", emoji: "✨" },
  { id: "average", label: "Needs extra attention", emoji: "🧹" },
  { id: "needs_work", label: "Very dirty / long overdue", emoji: "⚠️" },
];

const SQFT_OPTIONS = [
  { id: "", label: "Not sure" },
  { id: "under1000", label: "Under 1,000 sq ft" },
  { id: "1000_1500", label: "1,000 – 1,500 sq ft" },
  { id: "1500_2000", label: "1,500 – 2,000 sq ft" },
  { id: "2000_2500", label: "2,000 – 2,500 sq ft" },
  { id: "2500_3000", label: "2,500 – 3,000 sq ft" },
  { id: "3000plus", label: "3,000+ sq ft" },
];

const TIME_OPTIONS = [
  { id: "morning", label: "Morning (8am–12pm)" },
  { id: "afternoon", label: "Afternoon (12pm–4pm)" },
  { id: "flexible", label: "Flexible" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LeadLinkPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [biz, setBiz] = useState<BizInfo | null>(null);
  const [bizLoading, setBizLoading] = useState(true);
  const [bizError, setBizError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    firstName: "", lastName: "", email: "", phone: "",
    street: "", apt: "", city: "", state: "", zip: "",
    lat: null, lng: null,
    serviceType: "standard",
    bedrooms: 3, bathrooms: 2, sqft: "", condition: "great", extras: [],
    preferredDate: "", preferredTime: "flexible", source: "", notes: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!slug) return;
    fetch(`${API_BASE}/api/public/biz-info/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.message) setBizError("Business not found");
        else setBiz(data);
      })
      .catch(() => setBizError("Failed to load page"))
      .finally(() => setBizLoading(false));
  }, [slug]);

  const minDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const color = biz?.primaryColor || "#2563EB";

  function validateStep1(): boolean {
    const e: FormErrors = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email required";
    if (!form.street.trim()) e.street = "Street address is required";
    if (!form.city.trim()) e.city = "City is required";
    if (!form.zip.trim() || !/^\d{5}/.test(form.zip)) e.zip = "Valid ZIP required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: FormErrors = {};
    if (!form.condition) e.condition = "Please select a condition";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  }

  function handleBack() {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const resp = await fetch(`${API_BASE}/api/public/quote-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessSlug: slug,
          contact: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim() || undefined,
            street: form.street.trim() || undefined,
            apt: form.apt.trim() || undefined,
            city: form.city.trim() || undefined,
            state: form.state.trim() || undefined,
            zip: form.zip.trim(),
            lat: form.lat ?? undefined,
            lng: form.lng ?? undefined,
          },
          home: {
            serviceType: form.serviceType, bedrooms: form.bedrooms,
            bathrooms: form.bathrooms, sqft: form.sqft || undefined,
            condition: form.condition, extras: form.extras,
          },
          preferences: {
            preferredDate: form.preferredDate || undefined,
            preferredTime: form.preferredTime,
            notes: form.notes.trim() || undefined,
            source: form.source || undefined,
          },
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Submission failed");
      navigate(
        `/request/${slug}/pending?leadId=${data.leadId}&email=${encodeURIComponent(form.email)}${data.autopilot ? "" : "&mode=manual"}`
      );
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function handleAddressSelect(parsed: {
    street: string; city: string; state: string; zip: string; lat: number; lng: number;
  }) {
    setForm((f) => ({
      ...f,
      street: parsed.street,
      city: parsed.city,
      state: parsed.state,
      zip: parsed.zip || f.zip,
      lat: parsed.lat,
      lng: parsed.lng,
    }));
    setErrors((e) => ({ ...e, street: undefined, city: undefined, zip: undefined }));
  }

  function toggleExtra(id: string) {
    setForm((f) => ({
      ...f,
      extras: f.extras.includes(id) ? f.extras.filter((x) => x !== id) : [...f.extras, id],
    }));
  }

  if (bizLoading) {
    return (
      <div style={centered}>
        <Loader2 size={36} style={{ color: "#9CA3AF", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (bizError || !biz) {
    return (
      <div style={{ ...centered, padding: 24 }}>
        <AlertCircle size={48} style={{ color: "#EF4444", marginBottom: 16 }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: "0 0 8px" }}>Page not found</h2>
        <p style={{ color: "#6B7280", margin: 0 }}>This quote request page doesn't exist or is no longer available.</p>
      </div>
    );
  }

  const steps = ["Contact Info", "Home Details", "Preferences"];

  return (
    <div style={{ minHeight: "100vh", background: "#F3F4F6", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0;transform:translateY(10px) } to { opacity:1;transform:translateY(0) } }
        * { box-sizing: border-box; }
        input,select,textarea { font-family: inherit; }
        .ll-btn:hover { filter: brightness(0.92); }
        .ll-btn:active { transform: scale(0.98); }
        .addr-item:hover { background: #f0fdf4; }
      `}</style>

      <div style={{ background: color, padding: "22px 16px 18px", textAlign: "center" }}>
        {biz.logoUri ? (
          <img src={biz.logoUri} alt={biz.companyName} style={{ maxHeight: 52, maxWidth: 180, objectFit: "contain", marginBottom: 6 }} />
        ) : (
          <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 2 }}>{biz.companyName}</div>
        )}
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}>Request your free cleaning quote</div>
      </div>

      <div style={{ background: "#fff", borderBottom: "1px solid #E5E7EB", padding: "14px 16px" }}>
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            {steps.map((label, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: step > i + 1 ? color : step === i + 1 ? color : "#E5E7EB",
                  color: step >= i + 1 ? "#fff" : "#9CA3AF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0, transition: "all .2s",
                }}>
                  {step > i + 1 ? <Check size={13} /> : i + 1}
                </div>
                <span style={{ fontSize: 12, fontWeight: step === i + 1 ? 700 : 400, color: step === i + 1 ? "#111827" : "#9CA3AF" }}>{label}</span>
              </div>
            ))}
          </div>
          <div style={{ height: 4, background: "#E5E7EB", borderRadius: 2 }}>
            <div style={{ height: 4, background: color, borderRadius: 2, width: `${((step - 1) / 2) * 100}%`, transition: "width .35s ease" }} />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 540, margin: "0 auto", padding: "24px 16px 56px" }}>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div style={{ animation: "fadeUp .2s ease" }}>
            <h2 style={h2}>Tell us who you are</h2>
            <p style={subtext}>We'll send your personalized quote to your email.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <Field label="First name *" error={errors.firstName}>
                <input value={form.firstName} onChange={(e) => setField("firstName", e.target.value)}
                  placeholder="Jane" style={inp(!!errors.firstName, color)} autoComplete="given-name" />
              </Field>
              <Field label="Last name *" error={errors.lastName}>
                <input value={form.lastName} onChange={(e) => setField("lastName", e.target.value)}
                  placeholder="Smith" style={inp(!!errors.lastName, color)} autoComplete="family-name" />
              </Field>
            </div>

            <Field label="Email address *" error={errors.email} mb={12}>
              <InputIcon icon={<Mail size={15} />}>
                <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)}
                  placeholder="jane@example.com" style={inp(!!errors.email, color)} autoComplete="email" />
              </InputIcon>
            </Field>

            <Field label="Phone (optional)" mb={12}>
              <InputIcon icon={<Phone size={15} />}>
                <input type="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)}
                  placeholder="(555) 000-0000" style={inp(false, color)} autoComplete="tel" />
              </InputIcon>
            </Field>

            {/* Address row */}
            <AddressAutocompleteField
              color={color}
              value={form.street}
              error={errors.street}
              onStreetChange={(v) => setField("street", v)}
              onAddressSelect={handleAddressSelect}
            />

            <Field label="Apt / Unit (optional)" mb={12}>
              <input value={form.apt} onChange={(e) => setField("apt", e.target.value)}
                placeholder="Apt 2B" style={inpNoIcon(false, color)} autoComplete="address-line2" />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 10, marginBottom: 12 }}>
              <Field label="City *" error={errors.city}>
                <input value={form.city} onChange={(e) => setField("city", e.target.value)}
                  placeholder="Brooklyn" style={inpNoIcon(!!errors.city, color)} autoComplete="address-level2" />
              </Field>
              <Field label="State">
                <input value={form.state} onChange={(e) => setField("state", e.target.value)}
                  placeholder="NY" maxLength={2} style={inpNoIcon(false, color)} autoComplete="address-level1" />
              </Field>
              <Field label="ZIP *" error={errors.zip}>
                <input value={form.zip} onChange={(e) => setField("zip", e.target.value)}
                  placeholder="10001" maxLength={10} style={inpNoIcon(!!errors.zip, color)} autoComplete="postal-code" />
              </Field>
            </div>

            <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap", marginBottom: 28, padding: "14px 16px", background: rgba(color, 0.06), borderRadius: 12 }}>
              {[
                { icon: <Sparkles size={14} />, label: "AI-Powered Quote" },
                { icon: <Clock size={14} />, label: "Ready in < 60 Seconds" },
                { icon: <Star size={14} />, label: "No Obligation" },
              ].map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151", fontWeight: 600 }}>
                  <span style={{ color }}>{b.icon}</span>{b.label}
                </div>
              ))}
            </div>

            <Btn color={color} onClick={handleNext} type="button">
              Continue <ChevronRight size={18} />
            </Btn>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div style={{ animation: "fadeUp .2s ease" }}>
            <h2 style={h2}>Tell us about your home</h2>
            <p style={subtext}>This helps us give you an accurate quote.</p>

            {/* Address summary */}
            {form.street && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: rgba(color, 0.07), borderRadius: 10, padding: "10px 14px", marginBottom: 20 }}>
                <Home size={15} style={{ color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#374151" }}>{form.street}{form.apt ? `, ${form.apt}` : ""}, {form.city}, {form.state} {form.zip}</span>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Service type</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {SERVICE_TYPES.map((s) => (
                  <button key={s.id} type="button" onClick={() => setField("serviceType", s.id)}
                    style={card(form.serviceType === s.id, color)}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: "#6B7280" }}>{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div>
                <label style={lbl}>Bedrooms</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setField("bedrooms", n)}
                      style={chip(form.bedrooms === n, color)}>{n === 5 ? "5+" : n}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Bathrooms</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[1, 1.5, 2, 2.5, 3, 4].map((n) => (
                    <button key={n} type="button" onClick={() => setField("bathrooms", n)}
                      style={chip(form.bathrooms === n, color)}>{n === 4 ? "4+" : n}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Home size (optional)</label>
              <select value={form.sqft} onChange={(e) => setField("sqft", e.target.value)} style={sel()}>
                {SQFT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>
                Home condition *
                {errors.condition && <span style={{ color: "#EF4444", marginLeft: 6, fontWeight: 400 }}>{errors.condition}</span>}
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {CONDITIONS.map((c) => (
                  <button key={c.id} type="button" onClick={() => setField("condition", c.id)}
                    style={{ ...card(form.condition === c.id, color), display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
                    <span style={{ fontSize: 22 }}>{c.emoji}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{c.label}</span>
                    {form.condition === c.id && <Check size={16} style={{ color, marginLeft: "auto" }} />}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={lbl}>Add-ons (optional — may affect price)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {EXTRAS.map((ex) => {
                  const on = form.extras.includes(ex.id);
                  return (
                    <button key={ex.id} type="button" onClick={() => toggleExtra(ex.id)}
                      style={{ padding: "7px 14px", border: `2px solid ${on ? color : "#D1D5DB"}`, borderRadius: 20, background: on ? rgba(color, 0.08) : "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: on ? color : "#374151", display: "flex", alignItems: "center", gap: 5, transition: "all .15s" }}>
                      {on && <Check size={12} />}{ex.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <BackBtn onClick={handleBack} />
              <Btn color={color} onClick={handleNext} type="button" flex>
                Continue <ChevronRight size={18} />
              </Btn>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <div style={{ animation: "fadeUp .2s ease" }}>
            <h2 style={h2}>Almost there!</h2>
            <p style={subtext}>A few last details and your quote will be on its way.</p>

            <Field label="Preferred start date (optional)" mb={14}>
              <InputIcon icon={<Calendar size={15} />}>
                <input type="date" value={form.preferredDate} min={minDate}
                  onChange={(e) => setField("preferredDate", e.target.value)}
                  style={inp(false, color)} />
              </InputIcon>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>Must be at least 48 hours from today</div>
            </Field>

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Preferred time</label>
              <div style={{ display: "flex", gap: 8 }}>
                {TIME_OPTIONS.map((t) => (
                  <button key={t.id} type="button" onClick={() => setField("preferredTime", t.id)}
                    style={{ flex: 1, padding: "10px 8px", border: `2px solid ${form.preferredTime === t.id ? color : "#D1D5DB"}`, borderRadius: 10, background: form.preferredTime === t.id ? rgba(color, 0.08) : "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, color: form.preferredTime === t.id ? color : "#374151", transition: "all .15s", textAlign: "center" }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <Field label="How did you hear about us? (optional)" mb={14}>
              <select value={form.source} onChange={(e) => setField("source", e.target.value)} style={sel()}>
                <option value="">Select…</option>
                <option value="google">Google</option>
                <option value="yelp">Yelp</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="nextdoor">Nextdoor</option>
                <option value="referral">Friend / Referral</option>
                <option value="other">Other</option>
              </select>
            </Field>

            <Field label="Special instructions (optional)" mb={24}>
              <InputIcon icon={<MessageSquare size={15} />} top>
                <textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Gate code, pets, areas to focus on…" rows={3}
                  style={{ ...inp(false, color), paddingTop: 10, paddingBottom: 10, resize: "vertical" }} />
              </InputIcon>
            </Field>

            {submitError && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
                <AlertCircle size={16} style={{ color: "#EF4444", flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: "#B91C1C" }}>{submitError}</span>
              </div>
            )}

            <div style={{ background: rgba(color, 0.07), border: `1px solid ${rgba(color, 0.25)}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Sparkles size={18} style={{ color, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 3 }}>
                    {biz.autopilotEnabled ? "Your quote will be ready in under 60 seconds" : "We'll reach out with your quote shortly"}
                  </div>
                  <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
                    {biz.autopilotEnabled
                      ? "Our AI calculates a personalized quote and emails it to you with available booking times — no waiting on hold."
                      : "Your request has been received. We'll review the details and be in touch soon."}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <BackBtn onClick={handleBack} />
              <button type="submit" disabled={submitting} className="ll-btn"
                style={{ flex: 1, padding: "14px 20px", background: submitting ? "#9CA3AF" : color, color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background .2s" }}>
                {submitting ? (
                  <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Submitting…</>
                ) : (
                  <><Sparkles size={18} /> Get My Free Quote</>
                )}
              </button>
            </div>
            <p style={{ textAlign: "center", fontSize: 11, color: "#9CA3AF", marginTop: 12 }}>
              No obligation &bull; No credit card required
            </p>
          </div>
        )}
      </form>

      {biz.chatWidgetEnabled !== false && biz.publicQuoteSlug && (
        <ChatWidget
          businessName={biz.companyName}
          businessSlug={biz.publicQuoteSlug}
          primaryColor={biz.chatWidgetColor || biz.primaryColor || "#0F6E56"}
        />
      )}
    </div>
  );
}

// ─── Address Autocomplete Field ───────────────────────────────────────────────

function AddressAutocompleteField({
  color, value, error, onStreetChange, onAddressSelect,
}: {
  color: string;
  value: string;
  error?: string;
  onStreetChange: (v: string) => void;
  onAddressSelect: (parsed: { street: string; city: string; state: string; zip: string; lat: number; lng: number }) => void;
}) {
  const {
    ready,
    value: inputVal,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: ["us", "ca", "gb"] },
      types: ["address"],
    },
    debounce: 300,
    defaultValue: value,
  });

  // Keep in sync when parent resets
  const prevValue = useRef(value);
  useEffect(() => {
    if (value !== prevValue.current && value !== inputVal) {
      setValue(value, false);
    }
    prevValue.current = value;
  }, [value]);

  const handleSelect = async (description: string) => {
    setValue(description, false);
    clearSuggestions();
    try {
      const results = await getGeocode({ address: description });
      const comps = results[0].address_components;
      const get = (type: string, short = false) => {
        const c = comps.find((c: any) => c.types.includes(type));
        return c ? (short ? c.short_name : c.long_name) : "";
      };
      const streetNum = get("street_number");
      const route = get("route");
      const street = [streetNum, route].filter(Boolean).join(" ");
      const city = get("locality") || get("sublocality") || get("administrative_area_level_3");
      const state = get("administrative_area_level_1", true);
      const zip = get("postal_code");
      const { lat, lng } = await getLatLng(results[0]);
      onAddressSelect({ street, city, state, zip, lat, lng });
    } catch {
      // fallback: just keep what was typed
      onStreetChange(description);
    }
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={lbl}>
        Street address *{error && <span style={{ color: "#EF4444", fontWeight: 400, marginLeft: 6 }}>{error}</span>}
      </label>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }}>
          <MapPin size={15} />
        </span>
        <input
          value={inputVal}
          onChange={(e) => {
            setValue(e.target.value);
            onStreetChange(e.target.value);
          }}
          disabled={!ready}
          placeholder={ready ? "123 Main St" : "Loading…"}
          autoComplete="off"
          style={inp(!!error, color)}
        />

        {status === "OK" && (
          <ul style={{
            position: "absolute", top: "100%", left: 0, right: 0,
            zIndex: 9999, background: "white",
            border: "1px solid #E5E7EB", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            listStyle: "none", margin: "4px 0 0", padding: "4px 0",
            maxHeight: 240, overflowY: "auto",
          }}>
            {data.map(({ place_id, description, structured_formatting: sf }) => (
              <li
                key={place_id}
                className="addr-item"
                onClick={() => handleSelect(description)}
                style={{ padding: "10px 14px", cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start" }}
              >
                <MapPin size={14} style={{ color, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{sf.main_text}</div>
                  <div style={{ fontSize: 12, color: "#6B7280" }}>{sf.secondary_text}</div>
                </div>
              </li>
            ))}
            <li style={{ padding: "6px 14px", textAlign: "right", borderTop: "1px solid #F3F4F6" }}>
              <img
                src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png"
                alt="Powered by Google"
                style={{ height: 14, opacity: 0.7 }}
              />
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, error, children, mb }: { label?: string; error?: string; children: React.ReactNode; mb?: number }) {
  return (
    <div style={{ marginBottom: mb ?? 0 }}>
      {label && <label style={lbl}>{label}</label>}
      {children}
      {error && <div style={{ fontSize: 12, color: "#EF4444", marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function InputIcon({ icon, children, top }: { icon: React.ReactNode; children: React.ReactNode; top?: boolean }) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 12, top: top ? 12 : "50%", transform: top ? undefined : "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }}>{icon}</span>
      {children}
    </div>
  );
}

function Btn({ color, onClick, type, children, flex }: { color: string; onClick?: () => void; type: "button" | "submit"; children: React.ReactNode; flex?: boolean }) {
  return (
    <button type={type} onClick={onClick} className="ll-btn"
      style={{ width: flex ? undefined : "100%", flex: flex ? 1 : undefined, padding: "14px 20px", background: color, color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
      {children}
    </button>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="ll-btn"
      style={{ padding: "14px 18px", border: "2px solid #D1D5DB", borderRadius: 12, background: "#fff", fontSize: 15, fontWeight: 600, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
      <ChevronLeft size={16} /> Back
    </button>
  );
}

// ─── Style atoms ──────────────────────────────────────────────────────────────

const h2: React.CSSProperties = { fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 4px" };
const subtext: React.CSSProperties = { color: "#6B7280", margin: "0 0 24px", fontSize: 14 };
const lbl: React.CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 };
const centered: React.CSSProperties = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F3F4F6", flexDirection: "column" };

function inp(err: boolean, color: string): React.CSSProperties {
  return { width: "100%", padding: "11px 14px 11px 36px", border: `1.5px solid ${err ? "#EF4444" : "#D1D5DB"}`, borderRadius: 10, fontSize: 15, color: "#111827", background: "#fff", outline: "none" };
}
function inpNoIcon(err: boolean, _color: string): React.CSSProperties {
  return { width: "100%", padding: "11px 14px", border: `1.5px solid ${err ? "#EF4444" : "#D1D5DB"}`, borderRadius: 10, fontSize: 15, color: "#111827", background: "#fff", outline: "none" };
}
function sel(): React.CSSProperties {
  return { width: "100%", padding: "11px 14px", border: "1.5px solid #D1D5DB", borderRadius: 10, fontSize: 15, color: "#111827", background: "#fff", outline: "none", appearance: "none" };
}
function chip(on: boolean, color: string): React.CSSProperties {
  return { padding: "7px 13px", border: `2px solid ${on ? color : "#D1D5DB"}`, borderRadius: 8, background: on ? rgba(color, 0.08) : "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700, color: on ? color : "#374151", transition: "all .15s" };
}
function card(on: boolean, color: string): React.CSSProperties {
  return { width: "100%", padding: "12px 14px", border: `2px solid ${on ? color : "#E5E7EB"}`, borderRadius: 10, background: on ? rgba(color, 0.08) : "#fff", cursor: "pointer", textAlign: "left", transition: "all .15s" };
}
function rgba(hex: string, a: number): string {
  const c = hex.replace("#", "");
  if (c.length < 6) return `rgba(37,99,235,${a})`;
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
