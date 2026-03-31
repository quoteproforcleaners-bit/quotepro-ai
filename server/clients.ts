/**
 * Shared singletons and pure helpers for QuotePro routers.
 *
 * All modules that need openai, stripe, or utility functions import from here
 * rather than initialising their own instances. This ensures:
 *   • only one OpenAI client exists (avoids duplicate base-URL config issues)
 *   • stripe is lazily initialised exactly once at startup
 *   • helper functions are defined in one place and unit-testable
 */

import OpenAI from "openai";
import Stripe from "stripe";
import type { Request } from "express";
import { getUncachableStripeClient } from "./stripeClient";
import { getCustomerById } from "./storage";

// ─── OpenAI ──────────────────────────────────────────────────────────────────

export const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// ─── Stripe ──────────────────────────────────────────────────────────────────

let _stripe: Stripe | null = null;

export async function initStripeClient(): Promise<void> {
  try {
    _stripe = await getUncachableStripeClient();
    console.log("Stripe client initialized via Replit connection");
  } catch (e) {
    console.warn("Stripe not available:", (e as Error).message);
    _stripe = null;
  }
}

/** Returns the lazily-initialised Stripe client (may be null if not configured). */
export function getStripe(): Stripe | null {
  return _stripe;
}

// ─── Auth token store (used by auth routes and exchange-token endpoint) ───────

export const pendingAuthTokens = new Map<string, {
  userId: string;
  needsOnboarding: boolean;
  expiresAt: number;
}>();

export function generateAuthToken(userId: string, needsOnboarding: boolean): string {
  const token =
    Math.random().toString(36).slice(2) +
    Math.random().toString(36).slice(2) +
    Date.now().toString(36);
  pendingAuthTokens.set(token, {
    userId,
    needsOnboarding,
    expiresAt: Date.now() + 60_000,
  });
  return token;
}

// ─── URL helper ──────────────────────────────────────────────────────────────

/** Returns the public-facing base URL for the current request environment. */
export function getPublicBaseUrl(req: Request): string {
  if (process.env.CUSTOM_DOMAIN) {
    return `https://${process.env.CUSTOM_DOMAIN}`;
  }
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT) {
    const forwardedHost = req.header("x-forwarded-host");
    const host = forwardedHost || req.get("host") || "localhost";
    return `https://${host}`;
  }
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) return `https://${devDomain}:5000`;
  const host = req.get("host") || "localhost:5000";
  return `https://${host}`;
}

// ─── AI language helpers ──────────────────────────────────────────────────────

/** Returns a language instruction to append to any AI system prompt. */
export function getLangInstruction(langCode: string | null | undefined): string {
  switch ((langCode || "en").toLowerCase()) {
    case "es": return " Write the entire response in Spanish.";
    case "pt": return " Write the entire response in Portuguese (Brazilian).";
    case "ru": return " Write the entire response in Russian.";
    default:   return " Write the entire response in English.";
  }
}

/**
 * Returns the effective outbound language for a specific customer,
 * falling back to the business default.
 */
export async function getEffectiveLang(
  customerId: string | null | undefined,
  businessCommLanguage: string | null | undefined
): Promise<string> {
  if (customerId) {
    try {
      const c = await getCustomerById(customerId);
      if (c && (c as any).preferredLanguage) return (c as any).preferredLanguage;
    } catch (_) {}
  }
  return businessCommLanguage || "en";
}

// ─── Revenue playbook helper ──────────────────────────────────────────────────

import { createRecommendation } from "./storage";

export async function generateRevenuePlaybook(
  quote: any,
  business: any,
  customer: any
): Promise<void> {
  const recs: Array<{
    type: string;
    title: string;
    rationale: string;
    suggestedDate?: Date;
  }> = [];
  const total = Number(quote.total) || 0;
  const freq = quote.acceptedFrequency || quote.frequencySelected;
  const now = new Date();

  const followUpDate = new Date(now);
  followUpDate.setDate(followUpDate.getDate() + 2);
  recs.push({
    type: "follow_up",
    title: "Send a thank-you message",
    rationale: `A quick thank-you after acceptance builds trust and sets expectations. Reach out within 48 hours to confirm scheduling details.`,
    suggestedDate: followUpDate,
  });

  if (!freq || freq === "one-time") {
    recs.push({
      type: "frequency_upgrade",
      title: "Suggest recurring service",
      rationale: `This is a one-time booking at $${total.toFixed(2)}. After the first clean, suggest a recurring plan. Bi-weekly clients average 24x/year revenue vs 1x. Potential annual value: $${(total * 24).toFixed(0)}.`,
    });
  }

  recs.push({
    type: "addon_suggestion",
    title: "Offer a deep clean add-on",
    rationale: `After completing the initial service, offer a deep clean upgrade or add-on services like window cleaning, oven cleaning, or organization. This typically adds 30-50% to the base price.`,
  });

  const referralDate = new Date(now);
  referralDate.setDate(referralDate.getDate() + 7);
  recs.push({
    type: "referral_ask",
    title: "Ask for a referral",
    rationale: `Happy customers are your best marketing channel. After a successful first clean, ask if they know anyone who might need cleaning services. Offer a referral discount to incentivize.`,
    suggestedDate: referralDate,
  });

  const reviewDate = new Date(now);
  reviewDate.setDate(reviewDate.getDate() + 3);
  recs.push({
    type: "review_request",
    title: "Request a review",
    rationale: `Online reviews are critical for new customer acquisition. After service completion, send a friendly review request with a direct link to your Google Business page.`,
    suggestedDate: reviewDate,
  });

  const month = now.getMonth();
  if (month >= 2 && month <= 4) {
    recs.push({
      type: "seasonal_offer",
      title: "Promote spring deep cleaning",
      rationale: `Spring is prime time for deep cleaning. Offer a seasonal deep clean package at a special rate to capitalize on the momentum of this booking.`,
    });
  } else if (month >= 9 && month <= 11) {
    recs.push({
      type: "seasonal_offer",
      title: "Holiday prep cleaning package",
      rationale: `The holiday season is approaching. Offer a pre-holiday deep clean package to help customers prepare for gatherings and guests.`,
    });
  }

  for (const rec of recs) {
    try {
      await createRecommendation({
        businessId: quote.businessId,
        quoteId: quote.id,
        customerId: quote.customerId || undefined,
        type: rec.type,
        title: rec.title,
        rationale: rec.rationale,
        suggestedDate: rec.suggestedDate,
      });
    } catch (_e) {}
  }
}

// ─── Job update page HTML generator ──────────────────────────────────────────
export function generateJobUpdatePageHtml(apiUrl: string, assetsBase: string, token: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Live Service Update</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F8FAFC; color: #1E293B; min-height: 100vh; }
  .header { padding: 24px 20px 20px; text-align: center; color: white; position: relative; }
  .header::after { content: ''; position: absolute; bottom: -20px; left: 0; right: 0; height: 40px; background: inherit; border-radius: 0 0 24px 24px; }
  .logo-container { width: 56px; height: 56px; border-radius: 16px; background: rgba(255,255,255,0.2); margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; overflow: hidden; backdrop-filter: blur(10px); }
  .logo-container img { width: 100%; height: 100%; object-fit: cover; }
  .logo-placeholder { font-size: 24px; font-weight: 700; color: white; }
  .company-name { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
  .container { max-width: 480px; margin: 0 auto; padding: 8px 16px 40px; }
  .card { background: white; border-radius: 16px; padding: 20px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  .card-title { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #94A3B8; margin-bottom: 12px; }
  .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; }
  .progress-bar-bg { width: 100%; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden; margin-top: 12px; }
  .progress-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
  .progress-pct { font-size: 28px; font-weight: 700; margin-top: 4px; }
  .detail-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #F1F5F9; }
  .detail-row:last-child { border-bottom: none; }
  .detail-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
  .detail-label { font-size: 12px; color: #94A3B8; }
  .detail-value { font-size: 14px; font-weight: 500; }
  .timeline-item { display: flex; gap: 12px; padding-bottom: 16px; position: relative; }
  .timeline-item:not(:last-child)::after { content: ''; position: absolute; left: 15px; top: 32px; bottom: 0; width: 2px; background: #E2E8F0; }
  .timeline-dot { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 14px; }
  .timeline-content { flex: 1; padding-top: 4px; }
  .timeline-status { font-size: 14px; font-weight: 600; }
  .timeline-time { font-size: 12px; color: #94A3B8; margin-top: 2px; }
  .timeline-note { font-size: 13px; color: #64748B; margin-top: 4px; }
  .checklist-group { margin-bottom: 16px; }
  .checklist-group-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
  .checklist-count { font-size: 12px; color: #94A3B8; font-weight: 400; }
  .checklist-item { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
  .check-icon { width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; }
  .check-done { background: #10B981; color: white; }
  .check-pending { background: #E2E8F0; color: #94A3B8; }
  .checklist-label { font-size: 14px; }
  .checklist-label.done { text-decoration: line-through; color: #94A3B8; }
  .photo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .photo-item { border-radius: 12px; overflow: hidden; aspect-ratio: 1; position: relative; }
  .photo-item img { width: 100%; height: 100%; object-fit: cover; }
  .photo-badge { position: absolute; bottom: 6px; left: 6px; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; color: white; }
  .note-item { padding: 12px; background: #F8FAFC; border-radius: 10px; margin-bottom: 8px; font-size: 14px; line-height: 1.5; }
  .note-time { font-size: 11px; color: #94A3B8; margin-top: 4px; }
  .completed-banner { text-align: center; padding: 24px; background: linear-gradient(135deg, #10B981, #059669); color: white; border-radius: 16px; margin-bottom: 12px; }
  .completed-banner h2 { font-size: 20px; margin-bottom: 4px; }
  .completed-banner p { font-size: 14px; opacity: 0.9; }
  .pulse { animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
  .loading { text-align: center; padding: 40px; color: #94A3B8; }
  .empty-state { text-align: center; padding: 20px; color: #94A3B8; font-size: 14px; }
</style>
</head>
<body>
<div id="app">
  <div class="loading"><p>Loading service update...</p></div>
</div>
<script>
  const API_URL = "${apiUrl}";
  const ASSETS_BASE = "${assetsBase}";

  const STATUS_LABELS = {
    scheduled: "Scheduled",
    en_route: "En Route",
    service_started: "Service Started",
    in_progress: "In Progress",
    final_touches: "Final Touches",
    completed: "Completed"
  };

  const STATUS_COLORS = {
    scheduled: { bg: "#EFF6FF", text: "#2563EB", dot: "#2563EB" },
    en_route: { bg: "#FFF7ED", text: "#EA580C", dot: "#EA580C" },
    service_started: { bg: "#F0FDF4", text: "#16A34A", dot: "#16A34A" },
    in_progress: { bg: "#FFFBEB", text: "#D97706", dot: "#D97706" },
    final_touches: { bg: "#FAF5FF", text: "#9333EA", dot: "#9333EA" },
    completed: { bg: "#F0FDF4", text: "#16A34A", dot: "#16A34A" }
  };

  const STATUS_ICONS = {
    scheduled: "&#128197;",
    en_route: "&#128663;",
    service_started: "&#9989;",
    in_progress: "&#128736;",
    final_touches: "&#10024;",
    completed: "&#127937;"
  };

  function getProgress(status) {
    const map = { scheduled: 0, en_route: 15, service_started: 30, in_progress: 55, final_touches: 80, completed: 100 };
    return map[status] || 0;
  }

  function formatTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    const opts = { weekday: 'short', month: 'short', day: 'numeric' };
    return d.toLocaleDateString(undefined, opts);
  }

  function formatDateTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' at ' + formatTime(dateStr);
  }

  function formatMinutes(mins) {
    if (mins >= 60) {
      var h = Math.floor(mins / 60);
      var m = mins % 60;
      return m > 0 ? h + 'h ' + m + 'm' : h + 'h';
    }
    return mins + ' min';
  }

  // Live smooth progress bar animation
  function getLiveProgress(data) {
    var status = data.detailedStatus || data.status || "scheduled";
    if (status === "completed") return 100;
    if (!data.serviceStartedAt) return getProgress(status);
    var started = new Date(data.serviceStartedAt).getTime();
    var now = Date.now();
    var elapsedMs = now - started;
    var timing = data.autoProgressTiming || { inProgressMinutes: 30, finalTouchesMinutes: 60 };
    var ipMs = timing.inProgressMinutes * 60000;
    var ftMs = timing.finalTouchesMinutes * 60000;
    // Interpolate smoothly through the three active zones
    if (elapsedMs < ipMs) {
      // service_started → in_progress: 30% → 55%
      return 30 + Math.min(25, (elapsedMs / ipMs) * 25);
    } else if (elapsedMs < ftMs) {
      // in_progress → final_touches: 55% → 80%
      return 55 + Math.min(25, ((elapsedMs - ipMs) / (ftMs - ipMs)) * 25);
    } else {
      // final_touches → 80% and holding until cleaner taps Complete
      return 80;
    }
  }

  function render(data) {
    const status = data.detailedStatus || data.status || "scheduled";
    const sc = STATUS_COLORS[status] || STATUS_COLORS.scheduled;
    const rawProgress = getProgress(status);
    const liveProgress = status !== "completed" && data.serviceStartedAt ? getLiveProgress(data) : rawProgress;
    const progress = Math.round(liveProgress);
    const brandColor = data.brandColor || "#2563EB";
    const isComplete = status === "completed";

    let html = '<div class="header" style="background:' + brandColor + '">';
    if (data.companyLogo) {
      html += '<div class="logo-container"><img src="' + ASSETS_BASE + data.companyLogo + '" alt="Logo"></div>';
    } else {
      html += '<div class="logo-container"><span class="logo-placeholder">' + (data.companyName || "C").charAt(0) + '</span></div>';
    }
    html += '<div class="company-name">' + (data.companyName || "Cleaning Service") + '</div>';
    html += '</div><div class="container">';

    if (isComplete) {
      html += '<div class="completed-banner"><h2>Service Complete</h2><p>Your cleaning has been finished</p></div>';
    }

    // Status & Progress
    html += '<div class="card">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center">';
    html += '<div><div class="card-title">Status</div>';
    html += '<div class="status-badge" style="background:' + sc.bg + ';color:' + sc.text + '">';
    if (!isComplete) html += '<span class="status-dot pulse" style="background:' + sc.dot + '"></span>';
    html += (STATUS_LABELS[status] || status) + '</div></div>';
    html += '<div style="text-align:right"><div class="progress-pct" style="color:' + brandColor + '">' + progress + '%</div></div>';
    html += '</div>';
    html += '<div class="progress-bar-bg"><div class="progress-bar-fill" style="width:' + progress + '%;background:' + brandColor + '"></div></div>';
    html += '</div>';

    // Details
    html += '<div class="card"><div class="card-title">Service Details</div>';
    var jobTypes = { regular: "Standard Cleaning", deep_clean: "Deep Clean", move_in_out: "Move In/Out", post_construction: "Post Construction", airbnb_turnover: "Airbnb Turnover" };
    var serviceLabel = data.jobType ? (jobTypes[data.jobType] || data.jobType) : "Cleaning Service";
    html += '<div class="detail-row"><div class="detail-icon" style="background:#EFF6FF">&#128466;</div><div><div class="detail-label">Service</div><div class="detail-value">' + serviceLabel + '</div></div></div>';
    if (data.startDatetime) {
      html += '<div class="detail-row"><div class="detail-icon" style="background:#F0FDF4">&#128197;</div><div><div class="detail-label">Date</div><div class="detail-value">' + formatDate(data.startDatetime) + '</div></div></div>';
      html += '<div class="detail-row"><div class="detail-icon" style="background:#FFFBEB">&#128337;</div><div><div class="detail-label">Arrival Window</div><div class="detail-value">' + formatTime(data.startDatetime) + (data.endDatetime ? ' - ' + formatTime(data.endDatetime) : '') + '</div></div></div>';
    }
    if (data.customerName) {
      html += '<div class="detail-row"><div class="detail-icon" style="background:#FAF5FF">&#128100;</div><div><div class="detail-label">Customer</div><div class="detail-value">' + data.customerName + '</div></div></div>';
    }
    html += '</div>';

    // Auto-update hint: show next expected stage when in progress
    if (!isComplete && data.serviceStartedAt && (status === 'service_started' || status === 'in_progress' || status === 'final_touches')) {
      var timing = data.autoProgressTiming || { inProgressMinutes: 30, finalTouchesMinutes: 60 };
      var startedMs = new Date(data.serviceStartedAt).getTime();
      var nowMs = Date.now();
      var elapsedMin = (nowMs - startedMs) / 60000;
      var nextStageLabel = null;
      var minsUntilNext = null;
      if (status === 'service_started' && elapsedMin < timing.inProgressMinutes) {
        nextStageLabel = 'In Progress';
        minsUntilNext = Math.ceil(timing.inProgressMinutes - elapsedMin);
      } else if (status === 'in_progress' && elapsedMin < timing.finalTouchesMinutes) {
        nextStageLabel = 'Final Touches';
        minsUntilNext = Math.ceil(timing.finalTouchesMinutes - elapsedMin);
      }
      if (nextStageLabel && minsUntilNext !== null && minsUntilNext > 0) {
        html += '<div class="card" style="background:#F0F9FF;border:1px solid #BAE6FD">';
        html += '<div style="display:flex;align-items:center;gap:8px">';
        html += '<div style="width:28px;height:28px;border-radius:8px;background:#0EA5E9;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px">&#128336;</div>';
        html += '<div><div style="font-size:13px;font-weight:600;color:#0369A1">Auto-updating to ' + nextStageLabel + '</div>';
        html += '<div style="font-size:12px;color:#0284C7">Expected in ~' + formatMinutes(minsUntilNext) + ' &middot; This page refreshes automatically</div></div>';
        html += '</div></div>';
      }
    }

    // Timeline
    if (data.timeline && data.timeline.length > 0) {
      html += '<div class="card"><div class="card-title">Timeline</div>';
      data.timeline.forEach(function(t) {
        const tsc = STATUS_COLORS[t.status] || STATUS_COLORS.scheduled;
        html += '<div class="timeline-item">';
        html += '<div class="timeline-dot" style="background:' + tsc.bg + '">' + (STATUS_ICONS[t.status] || "&#9679;") + '</div>';
        html += '<div class="timeline-content">';
        var autoTag = t.auto_generated ? ' <span style="font-size:10px;color:#94A3B8;font-weight:400;margin-left:4px">auto</span>' : '';
        html += '<div class="timeline-status">' + (STATUS_LABELS[t.status] || t.status) + autoTag + '</div>';
        html += '<div class="timeline-time">' + formatDateTime(t.created_at) + '</div>';
        if (t.note) html += '<div class="timeline-note">' + t.note + '</div>';
        html += '</div></div>';
      });
      html += '</div>';
    }

    // Checklist
    if (data.checklist && data.checklist.length > 0) {
      html += '<div class="card"><div class="card-title">Checklist</div>';
      var groups = {};
      data.checklist.forEach(function(item) {
        var g = item.room_group || "General";
        if (!groups[g]) groups[g] = [];
        groups[g].push(item);
      });
      Object.keys(groups).forEach(function(groupName) {
        var items = groups[groupName];
        var doneCount = items.filter(function(i) { return i.completed; }).length;
        html += '<div class="checklist-group">';
        html += '<div class="checklist-group-title">' + groupName + '<span class="checklist-count">' + doneCount + '/' + items.length + '</span></div>';
        items.forEach(function(item) {
          html += '<div class="checklist-item">';
          html += '<div class="check-icon ' + (item.completed ? 'check-done' : 'check-pending') + '">' + (item.completed ? '&#10003;' : '') + '</div>';
          html += '<span class="checklist-label ' + (item.completed ? 'done' : '') + '">' + item.label + '</span>';
          html += '</div>';
        });
        html += '</div>';
      });
      html += '</div>';
    }

    // Photos
    if (data.photos && data.photos.length > 0) {
      html += '<div class="card"><div class="card-title">Photos</div>';
      html += '<div class="photo-grid">';
      data.photos.forEach(function(p) {
        html += '<div class="photo-item">';
        html += '<img src="' + ASSETS_BASE + p.photo_url + '" alt="Job photo" loading="lazy">';
        html += '<div class="photo-badge" style="background:' + (p.photo_type === 'before' ? '#D97706' : '#16A34A') + '">' + (p.photo_type === 'before' ? 'Before' : 'After') + '</div>';
        if (p.caption) html += '<div style="position:absolute;bottom:28px;left:6px;right:6px;font-size:11px;color:white;text-shadow:0 1px 2px rgba(0,0,0,0.8)">' + p.caption + '</div>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    // Notes
    if (data.notes && data.notes.length > 0) {
      html += '<div class="card"><div class="card-title">Notes</div>';
      data.notes.forEach(function(n) {
        html += '<div class="note-item">' + n.content + '<div class="note-time">' + formatDateTime(n.created_at) + '</div></div>';
      });
      html += '</div>';
    }

    html += '<div style="text-align:center;padding:20px;color:#CBD5E1;font-size:12px">Powered by QuotePro</div>';
    html += '</div>';
    document.getElementById('app').innerHTML = html;
  }

  function fetchData() {
    fetch(API_URL)
      .then(function(r) { return r.json(); })
      .then(function(data) { render(data); })
      .catch(function(e) {
        document.getElementById('app').innerHTML = '<div class="loading"><p>Unable to load update. Please try again.</p></div>';
      });
  }

  fetchData();
  setInterval(fetchData, 10000);
</script>
</body>
</html>`;
}
