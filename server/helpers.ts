/**
 * server/helpers.ts
 * Shared helper functions extracted from routes.ts.
 * All route domain files (routers/) import from here.
 */

import crypto from "node:crypto";
import { type Request } from "express";
import { google } from "googleapis";
import { pool, db } from "./db";
import { QBOClient, encryptToken, decryptToken, logSync } from "./qbo-client";
import { getUncachableGoogleCalendarClient } from "./googleCalendarClient";
import { anthropic, getEffectiveLang, getLangInstruction } from "./clients";
import {
  getPendingCommunications,
  getQuoteById,
  getCustomerById,
  getCustomersByBusiness,
  updateCommunication,
  getActiveWebhookEndpointsForBusiness,
  createWebhookEvent,
  createWebhookDelivery,
  updateWebhookDelivery,
  getWebhookEventById,
  getGoogleCalendarToken,
  upsertGoogleCalendarToken,
  getCommunicationById,
  getAllBusinessIds,
  getApiKeysByUserId,
  getPreferencesByBusiness,
  getPushTokensByUser,
  getQuoteStats,
  getStaleQuotesForNudge,
  getUserById,
  getWeeklyQuoteStats,
  markQuoteNudgeSent,
  markWeeklyDigestSent,
  generateSeriesJobs,
} from "./storage";
import {
  sendEmail,
  getBusinessSendParams,
  PLATFORM_FROM_EMAIL,
  PLATFORM_FROM_NAME,
} from "./mail";
import { sendPush } from "./pushNotifications";
import { trackEvent } from "./analytics";
import { AnalyticsEvents } from "../shared/analytics-events";

const BASE_APP_URL = process.env.APP_URL || "https://app.getquotepro.ai/app";

const JOB_TYPE_EMAIL_LABEL: Record<string, string> = {
  regular: "Regular Clean",
  deep_clean: "Deep Clean",
  move_out: "Move-Out Clean",
  move_in: "Move-In Clean",
  post_construction: "Post-Construction",
  office: "Office Clean",
  airbnb: "Airbnb Turnover",
  commercial: "Commercial Clean",
  other: "Clean",
};




// ─── buildJobCardEmail ────────────────────────────────────────────

export function buildJobCardEmail(j: any, cleanerName: string): string {
  const time = new Date(j.startDatetime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const endDt = j.endDatetime ? new Date(j.endDatetime) : null;
  const endTime = endDt ? endDt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : null;
  const teammates = (j.teamMemberNames || []).filter((n: string) => n && n !== cleanerName);
  const mapLink = j.address ? `https://maps.google.com/?q=${encodeURIComponent(j.address)}` : null;
  const typeLabel = JOB_TYPE_EMAIL_LABEL[j.jobType] || j.jobType || "Clean";
  const hours = j.durationHours ? (j.durationHours % 1 === 0 ? `${j.durationHours}h` : `${Math.floor(j.durationHours)}h ${Math.round((j.durationHours % 1) * 60)}m`) : null;

  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
<tr>
  <td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#f3f4f6;padding:10px 16px;border-bottom:1px solid #e5e7eb;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:16px;font-weight:700;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                ${time}${endTime ? ` &ndash; ${endTime}` : ""}
              </td>
              ${hours ? `<td align="right" style="font-size:12px;color:#9ca3af;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${hours}</td>` : ""}
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:14px 16px;">
          <div style="display:inline-block;font-size:11px;font-weight:600;color:#4f46e5;background:#eef2ff;border-radius:4px;padding:3px 8px;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${typeLabel}</div>
          ${j.address ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
            <tr>
              <td valign="top" width="20" style="padding-top:1px;color:#9ca3af;font-size:14px;">&#128205;</td>
              <td>
                <div style="font-size:15px;color:#111827;line-height:1.4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${j.address}</div>
                ${mapLink ? `<a href="${mapLink}" style="font-size:13px;color:#4f46e5;text-decoration:none;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Get directions &rarr;</a>` : ""}
              </td>
            </tr>
          </table>` : ""}
          ${teammates.length > 0 ? `
          <div style="font-size:14px;color:#6b7280;margin-bottom:6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
            With: <strong style="color:#374151;">${teammates.join(" &amp; ")}</strong>
          </div>` : ""}
          ${j.cleanerNotes ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">
            <tr>
              <td style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;">
                <div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Note from office</div>
                <div style="font-size:14px;color:#78350f;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${j.cleanerNotes}</div>
              </td>
            </tr>
          </table>` : ""}
        </td>
      </tr>
    </table>
  </td>
</tr>
</table>`;
}

// ─── buildCleanerEmailHtml ────────────────────────────────────────────

export function buildCleanerEmailHtml(opts: {
  cleanerName: string;
  weekLabel: string;
  jobs: any[];
  ackToken: string;
  companyName: string;
  domain: string;
}): string {
  const { cleanerName, weekLabel, jobs, ackToken, companyName, domain } = opts;
  const dayOrder = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const grouped: Record<string, any[]> = {};
  for (const j of jobs) {
    const dt = new Date(j.startDatetime);
    const day = dayOrder[dt.getDay()];
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(j);
  }
  const daysWithJobs = dayOrder.filter(d => grouped[d]);
  const totalJobs = jobs.length;
  const estHours = jobs.reduce((acc, j) => acc + (j.durationHours || 3), 0);
  const estHoursLabel = estHours % 1 === 0 ? `${estHours}h` : `${estHours.toFixed(1)}h`;
  const ackUrl = `https://${domain}/schedule-ack/${ackToken}`;

  const dayBlocks = daysWithJobs.map(day => {
    const dayJobs = [...grouped[day]].sort((a, b) =>
      new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
    );
    const jobCards = dayJobs.map(j => buildJobCardEmail(j, cleanerName)).join("");
    return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
<tr>
  <td>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="padding-bottom:8px;border-bottom:2px solid #111827;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:19px;font-weight:800;color:#111827;letter-spacing:-0.02em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${day}</td>
              <td align="right" style="font-size:12px;color:#9ca3af;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${dayJobs.length} job${dayJobs.length !== 1 ? "s" : ""}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${jobCards}
  </td>
</tr>
</table>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Schedule &mdash; ${weekLabel}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;min-height:100%;">
  <tr>
    <td align="center" style="padding:24px 16px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Header -->
        <tr>
          <td style="background:#4f46e5;border-radius:16px 16px 0 0;padding:28px 28px 24px;">
            <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${companyName}</div>
            <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;line-height:1.1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Your Schedule</div>
            <div style="font-size:15px;color:rgba(255,255,255,0.75);margin-top:4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${weekLabel}</div>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="background:#ffffff;padding:24px 28px 4px;">
            <div style="font-size:16px;color:#374151;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              Hi <strong>${cleanerName}</strong>, here&rsquo;s what&rsquo;s on your plate this week.
            </div>
          </td>
        </tr>

        <!-- Summary bar -->
        <tr>
          <td style="background:#ffffff;padding:16px 28px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;">
              <tr>
                <td align="center" style="padding:14px 8px;border-right:1px solid #e5e7eb;">
                  <div style="font-size:22px;font-weight:800;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${totalJobs}</div>
                  <div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-top:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Jobs</div>
                </td>
                <td align="center" style="padding:14px 8px;border-right:1px solid #e5e7eb;">
                  <div style="font-size:22px;font-weight:800;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${estHoursLabel}</div>
                  <div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-top:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Est. Hours</div>
                </td>
                <td align="center" style="padding:14px 8px;">
                  <div style="font-size:22px;font-weight:800;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${daysWithJobs.length}</div>
                  <div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-top:2px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Days</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="background:#ffffff;padding:0 28px;"><div style="height:1px;background:#f3f4f6;"></div></td></tr>

        <!-- Schedule by day -->
        <tr>
          <td style="background:#ffffff;padding:24px 28px 8px;">
            ${dayBlocks}
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="background:#ffffff;padding:8px 28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:12px;">
                  <a href="${ackUrl}"
                    style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:17px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:12px;letter-spacing:-0.01em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                    Got It &mdash; I&rsquo;m Good to Go
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <a href="${ackUrl}?flag=1" style="font-size:13px;color:#9ca3af;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                    Have an issue? Let us know
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;border-radius:0 0 16px 16px;padding:16px 28px;">
            <div style="font-size:12px;color:#9ca3af;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              Sent by ${companyName} via QuotePro.
              &nbsp;&bull;&nbsp;
              <a href="${ackUrl}" style="color:#9ca3af;text-decoration:underline;">View online</a>
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ─── buildCleanerUpdateEmailHtml ────────────────────────────────────────────

export function buildCleanerUpdateEmailHtml(opts: {
  cleanerName: string;
  weekLabel: string;
  changedJobs: any[];
  companyName: string;
  ackToken: string;
  domain: string;
  allJobs?: any[];
}): string {
  const { cleanerName, weekLabel, changedJobs, companyName, ackToken, domain, allJobs } = opts;
  const ackUrl = `https://${domain}/schedule-ack/${ackToken}`;
  const totalJobs = allJobs?.length || changedJobs.length;
  const estHours = (allJobs || changedJobs).reduce((a, j) => a + (j.durationHours || 3), 0);
  const estHoursLabel = estHours % 1 === 0 ? `${estHours}h` : `${estHours.toFixed(1)}h`;

  const changedJobsHtml = changedJobs.map((j: any) => {
    const time = new Date(j.startDatetime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
<tr>
  <td style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;">
    <div style="font-size:15px;font-weight:700;color:#111827;margin-bottom:4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${time}${j.customerName ? ` &mdash; ${j.customerName}` : ""}</div>
    ${j.address ? `<div style="font-size:14px;color:#6b7280;margin-bottom:4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${j.address}</div>` : ""}
    ${j.changeNote ? `<div style="font-size:13px;color:#92400e;font-weight:600;margin-top:4px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${j.changeNote}</div>` : ""}
  </td>
</tr>
</table>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Schedule Update &mdash; ${weekLabel}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;min-height:100%;">
  <tr>
    <td align="center" style="padding:24px 16px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Header -->
        <tr>
          <td style="background:#d97706;border-radius:16px 16px 0 0;padding:24px 28px 20px;">
            <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${companyName}</div>
            <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Schedule Updated</div>
            <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:3px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${weekLabel}</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:24px 28px 20px;">
            <div style="font-size:16px;color:#374151;line-height:1.6;margin-bottom:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              Hi <strong>${cleanerName}</strong>, your schedule for <strong>${weekLabel}</strong> has changed. Here&rsquo;s what&rsquo;s different:
            </div>
            ${changedJobsHtml}
          </td>
        </tr>

        <!-- Summary -->
        <tr>
          <td style="background:#ffffff;padding:0 28px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;">
              <tr>
                <td align="center" style="padding:12px 8px;border-right:1px solid #e5e7eb;">
                  <div style="font-size:20px;font-weight:800;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${totalJobs}</div>
                  <div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-top:1px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Total Jobs</div>
                </td>
                <td align="center" style="padding:12px 8px;">
                  <div style="font-size:20px;font-weight:800;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${estHoursLabel}</div>
                  <div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;margin-top:1px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Est. Hours</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="background:#ffffff;padding:0 28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:12px;">
                  <a href="${ackUrl}"
                    style="display:inline-block;background:#d97706;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:15px 36px;border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                    View Updated Schedule
                  </a>
                </td>
              </tr>
              <tr>
                <td align="center">
                  <a href="${ackUrl}?flag=1" style="font-size:13px;color:#9ca3af;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                    Have an issue? Let us know
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;border-radius:0 0 16px 16px;padding:16px 28px;">
            <div style="font-size:12px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              Sent by ${companyName} via QuotePro.
              &nbsp;&bull;&nbsp;
              <a href="${ackUrl}" style="color:#9ca3af;text-decoration:underline;">View full schedule online</a>
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ─── getAutoProgressTiming ────────────────────────────────────────────

export function getAutoProgressTiming(jobType: string): { inProgressMinutes: number; finalTouchesMinutes: number } {
  if (jobType === "deep_clean" || jobType === "move_in_out") {
    return { inProgressMinutes: 45, finalTouchesMinutes: 90 };
  }
  return { inProgressMinutes: 30, finalTouchesMinutes: 60 };
}

// ─── computeAutoProgressStatus ────────────────────────────────────────────

export function computeAutoProgressStatus(
  detailedStatus: string,
  jobType: string,
  serviceStartedAt: Date | null,
  completedAt: Date | null
): string {
  if (detailedStatus === "completed" || completedAt) return "completed";
  if (!serviceStartedAt || detailedStatus === "scheduled" || detailedStatus === "en_route") {
    return detailedStatus;
  }
  const { inProgressMinutes, finalTouchesMinutes } = getAutoProgressTiming(jobType || "regular");
  const elapsedMs = Date.now() - serviceStartedAt.getTime();
  const elapsedMinutes = elapsedMs / 60000;
  if (elapsedMinutes >= finalTouchesMinutes) return "final_touches";
  if (elapsedMinutes >= inProgressMinutes) return "in_progress";
  return "service_started";
}

// ─── generateQuotePdfHtml ────────────────────────────────────────────

export async function generateQuotePdfHtml(quote: any, business: any, growthSettings?: any): Promise<string> {
  const customerName = (quote.propertyDetails as any)?.customerName || "Customer";
  const customerEmail = (quote.propertyDetails as any)?.customerEmail || "";
  const customerPhone = (quote.propertyDetails as any)?.customerPhone || "";
  const customerAddress = (quote.propertyDetails as any)?.customerAddress || "";
  const options = quote.options as any;

  const addOnLabels: Record<string, string> = {
    insideFridge: "Inside Fridge",
    insideOven: "Inside Oven",
    insideCabinets: "Inside Cabinets",
    interiorWindows: "Interior Windows",
    blindsDetail: "Blinds Detail",
    baseboardsDetail: "Baseboards Detail",
    laundryFoldOnly: "Laundry (Fold Only)",
    dishes: "Dishes",
    organizationTidy: "Organization/Tidy",
  };

  const activeAddOns = Object.entries(quote.addOns as any || {})
    .filter(([_, v]) => v)
    .map(([k]) => addOnLabels[k] || k);

  const optionRows = ["good", "better", "best"]
    .map((key) => {
      const opt = options?.[key];
      if (!opt) return "";
      const isSelected = quote.selectedOption === key;
      return `<tr style="${isSelected ? "background:#EBF5FF;font-weight:600;" : ""}">
        <td style="padding:12px;border-bottom:1px solid #eee;">${opt.serviceTypeName || opt.name || key}${isSelected ? " *" : ""}</td>
        <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">$${(opt.price || 0).toFixed(2)}</td>
      </tr>`;
    })
    .join("");

  const qp = (business as any).quotePreferences;
  const primaryColor = qp?.brandColor || business.primaryColor || "#2563EB";

  let paymentHtml = "";
  const po = business.paymentOptions as any;
  if (po) {
    const methodLabels: Record<string, string> = { cash: "Cash", check: "Check", creditCard: "Credit Card", venmo: "Venmo", cashApp: "Cash App", zelle: "Zelle", applePay: "Apple Pay", ach: "ACH / Bank Transfer", other: "Other" };
    const pMethods: string[] = [];
    for (const [key, label] of Object.entries(methodLabels)) {
      const opt = po[key];
      if (opt?.enabled) {
        let line = opt.label || label;
        if (key === "venmo" && business.venmoHandle) line += ` (@${business.venmoHandle})`;
        if (key === "cashApp" && business.cashappHandle) line += ` ($${business.cashappHandle})`;
        if (opt.handle && key !== "venmo" && key !== "cashApp") line += ` (${opt.handle})`;
        if (opt.feeNote) line += ` - ${opt.feeNote}`;
        pMethods.push(line);
      }
    }
    if (pMethods.length > 0) {
      paymentHtml = `<div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;"><div style="font-size:14px;font-weight:600;color:${primaryColor};margin-bottom:8px;">Payment Methods Accepted</div><ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#334155;">`;
      for (const m of pMethods) paymentHtml += `<li style="margin-bottom:4px;">${m}</li>`;
      paymentHtml += `</ul>`;
      if (business.paymentNotes) paymentHtml += `<p style="margin:12px 0 0;font-size:12px;color:#64748b;font-style:italic;">${business.paymentNotes}</p>`;
      paymentHtml += `</div>`;
    }
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;margin:0;padding:40px;color:#1a1a1a;font-size:14px;}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;border-bottom:3px solid ${primaryColor};padding-bottom:20px;}
.company{font-size:24px;font-weight:700;color:${primaryColor};}
.company-details{font-size:12px;color:#666;margin-top:4px;}
.quote-badge{background:${primaryColor};color:white;padding:6px 16px;border-radius:20px;font-size:12px;font-weight:600;}
.section{margin-bottom:24px;}
.section-title{font-size:16px;font-weight:600;color:${primaryColor};margin-bottom:12px;border-bottom:1px solid #eee;padding-bottom:6px;}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.info-item{font-size:13px;}.info-label{color:#666;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;}
table{width:100%;border-collapse:collapse;}
th{text-align:left;padding:12px;background:#f8f9fa;border-bottom:2px solid #dee2e6;font-size:13px;}
.total-row{background:${primaryColor};color:white;}
.total-row td{padding:14px;font-size:16px;font-weight:700;}
.footer{margin-top:40px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:16px;}
.addons{display:flex;flex-wrap:wrap;gap:6px;}.addon-tag{background:#f0f4ff;color:${primaryColor};padding:4px 10px;border-radius:12px;font-size:11px;}
#qp-print-bar{position:fixed;top:0;left:0;right:0;z-index:9999;background:#fff;border-bottom:1px solid #e2e8f0;padding:10px 24px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 1px 8px rgba(0,0,0,0.08);}
#qp-print-bar button{background:${primaryColor};color:#fff;border:none;padding:8px 20px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;}
#qp-print-bar button:hover{opacity:0.9;}
@media print{#qp-print-bar{display:none;}body{padding-top:40px;}}
</style></head><body>
<div id="qp-print-bar">
<span style="font-size:13px;color:#64748b;">Open in browser &rarr; File &rarr; Print &rarr; Save as PDF</span>
<button onclick="window.print()">Download PDF</button>
</div>
<div style="margin-top:56px;"></div>
<div class="header">
<div><div class="company">${business.companyName || "QuotePro"}</div>
<div class="company-details">${business.email ? business.email + "<br>" : ""}${business.phone || ""}${business.address ? "<br>" + business.address : ""}</div></div>
<div class="quote-badge">QUOTE</div>
</div>
<div class="section"><div class="section-title">Customer</div>
<div class="info-grid">
<div class="info-item"><div class="info-label">Name</div>${customerName}</div>
<div class="info-item"><div class="info-label">Email</div>${customerEmail || "N/A"}</div>
<div class="info-item"><div class="info-label">Phone</div>${customerPhone || "N/A"}</div>
<div class="info-item"><div class="info-label">Address</div>${customerAddress || "N/A"}</div>
</div></div>
<div class="section"><div class="section-title">Property Details</div>
<div class="info-grid">
<div class="info-item"><div class="info-label">Square Footage</div>${quote.propertySqft} sqft</div>
<div class="info-item"><div class="info-label">Bedrooms</div>${quote.propertyBeds}</div>
<div class="info-item"><div class="info-label">Bathrooms</div>${quote.propertyBaths}</div>
<div class="info-item"><div class="info-label">Frequency</div>${(quote.frequencySelected || "one-time").replace(/-/g, " ")}</div>
</div></div>
${activeAddOns.length > 0 ? `<div class="section"><div class="section-title">Add-On Services</div><div class="addons">${activeAddOns.map(a => `<span class="addon-tag">${a}</span>`).join("")}</div></div>` : ""}
<div class="section"><div class="section-title">Pricing Options</div>
<table><thead><tr><th>Service Level</th><th style="text-align:right;">Price</th></tr></thead>
<tbody>${optionRows}
<tr class="total-row"><td style="padding:14px;">Selected Total</td><td style="padding:14px;text-align:right;">$${(quote.total || 0).toFixed(2)}</td></tr>
</tbody></table></div>
${quote.tax > 0 ? `<div style="text-align:right;margin-top:8px;font-size:13px;color:#666;">Tax: $${quote.tax.toFixed(2)} | Subtotal: $${quote.subtotal.toFixed(2)}</div>` : ""}
${paymentHtml}
${growthSettings?.includeReviewOnPdf && growthSettings?.googleReviewLink?.trim() ? `<div style="margin-top:24px;padding:16px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a;text-align:center;"><div style="font-size:14px;font-weight:600;color:${primaryColor};margin-bottom:6px;">Review Us</div><div style="font-size:12px;color:#64748b;margin-bottom:8px;">If you loved our service, please leave a quick review:</div><a href="${growthSettings.googleReviewLink.trim()}" style="color:${primaryColor};font-size:13px;word-break:break-all;">${growthSettings.googleReviewLink.trim()}</a></div>` : ""}
<div class="footer">Quote generated by ${business.companyName || "QuotePro"} | ${new Date().toLocaleDateString()}</div>
</body></html>`;

  return html;
}

// ─── generateFollowUpMessage ────────────────────────────────────────────

export async function generateFollowUpMessage(quote: any, customer: any, business: any, channel: string): Promise<string> {
  const ageDays = Math.round(((Date.now() - (quote.sentAt?.getTime() || quote.createdAt.getTime())) / (1000 * 60 * 60 * 24)) * 10) / 10;
  const msgType = channel === "email" ? "email" : "SMS";
  const maxLen = channel === "email" ? 200 : 160;
  const quoteUrl = `${process.env.APP_URL || "https://quotepro.app"}/q/${quote.publicToken}`;
  const effectiveLang = await getEffectiveLang(customer?.id, business?.commLanguage);
  const followUpLangInstruction = getLangInstruction(effectiveLang);
  const completion = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    system: `Write a ${msgType} follow-up (under ${maxLen} chars for SMS) for "${business?.companyName || "our cleaning company"}". Quote is $${quote.total} sent ${ageDays} days ago. Quote link: ${quoteUrl}. Be warm, not pushy. No emojis. Sign as "${business?.senderName || "Team"}". For email: start with "Subject: " then blank line then body. Do NOT put the raw URL in the email body; a button will be added automatically.${followUpLangInstruction}`,
    messages: [
      {
        role: "user",
        content: `Write a friendly follow-up ${msgType} for ${customer?.firstName || "the customer"} asking if they had a chance to review their cleaning quote. Reply with ONLY the message text.`,
      },
    ],
    max_tokens: channel === "email" ? 250 : 100,
  });
  return (completion.content[0] as any).text?.trim() || "";
}

// ─── sendFollowUpNow ────────────────────────────────────────────

export async function sendFollowUpNow(commId: string, req: Request): Promise<{ success: boolean; message: string }> {
  const comm = await getCommunicationById(commId);
  if (!comm) return { success: false, message: "Follow-up not found" };

  const quote = comm.quoteId ? await getQuoteById(comm.quoteId) : null;
  if (!quote) return { success: false, message: "Quote not found" };
  if (quote.status === "accepted") return { success: false, message: "Quote already accepted - no follow-up needed" };
  if (quote.status === "expired") return { success: false, message: "Quote has expired" };

  const customer = quote.customerId ? await getCustomerById(quote.customerId) : null;
  const business = await db_getBusinessById(quote.businessId);

  let messageText = comm.content?.trim() || "";
  if (!messageText) {
    messageText = await generateFollowUpMessage(quote, customer, business, comm.channel);
  }

  const channel = comm.channel;

  if (channel === "email") {
    const { fromName, replyTo } = getBusinessSendParams(business);
    const toEmail = customer?.email;
    if (!toEmail) return { success: false, message: "Customer email not found" };
    const quoteUrl = `${process.env.APP_URL || `https://${req.get("host")}`}/q/${quote.publicToken}`;
    const primaryColor = (business as any)?.primaryColor || "#2563EB";
    const quoteButtonHtml = `<div style="margin-top:24px;text-align:center;"><a href="${quoteUrl}" style="display:inline-block;background:${primaryColor};color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">View & Accept Your Quote</a></div>`;
    const subjectMatch = messageText.match(/^Subject:\s*(.+)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : `Following up on your quote from ${fromName}`;
    const body = subjectMatch ? messageText.replace(/^Subject:.*\n\n?/i, "").trim() : messageText;
    const htmlBody = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);"><tr><td style="background:linear-gradient(135deg,#007AFF,#5856D6);padding:24px 32px;"><h2 style="color:#fff;margin:0;font-size:20px;">${fromName}</h2></td></tr><tr><td style="padding:32px;">${body.split('\n').map((l: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333;">${l}</p>`).join('')}${quoteButtonHtml}</td></tr><tr><td style="padding:16px 32px 24px;border-top:1px solid #eee;"><p style="margin:0;font-size:12px;color:#999;">Sent via QuotePro</p></td></tr></table></td></tr></table></body></html>`;
    try {
      await sendEmail({ to: toEmail, subject, html: htmlBody, text: body, fromName, replyTo });
    } catch (mailErr: any) {
      console.error("[mail] Follow-up email error:", mailErr);
      return { success: false, message: "Email could not be delivered. Please try again or contact support." };
    }
  } else {
    return { success: false, message: "SMS is not available. Please use email for customer follow-ups." };
  }

  await updateCommunication(commId, { status: "sent", sentAt: new Date(), content: messageText });
  return { success: true, message: "Follow-up sent successfully" };
}

// ─── createShortLink ────────────────────────────────────────────

export async function createShortLink(destinationUrl: string, businessId?: string, label?: string): Promise<string> {
  const token = crypto.randomBytes(4).toString("base64url").slice(0, 7);
  await pool.query(
    `INSERT INTO short_links (token, destination_url, business_id, label, created_at, expires_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '90 days')
     ON CONFLICT (token) DO NOTHING`,
    [token, destinationUrl, businessId || null, label || null]
  );
  return token;
}

// ─── generateIntakeCode ────────────────────────────────────────────

export function generateIntakeCode(len = 8): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < len; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ─── ensureIntakeCode ────────────────────────────────────────────

export async function ensureIntakeCode(businessId: string): Promise<string> {
  const existing = await pool.query(`SELECT intake_code FROM businesses WHERE id = $1`, [businessId]);
  if (existing.rows[0]?.intake_code) return existing.rows[0].intake_code;
  let code = generateIntakeCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await pool.query(`UPDATE businesses SET intake_code = $1 WHERE id = $2`, [code, businessId]);
      return code;
    } catch {
      code = generateIntakeCode();
    }
  }
  return code;
}

// ─── getOrCreateShortUrl ────────────────────────────────────────────

export async function getOrCreateShortUrl(businessId: string, longUrl: string): Promise<string> {
  try {
    const cached = await pool.query(`SELECT intake_short_url FROM businesses WHERE id = $1`, [businessId]);
    if (cached.rows[0]?.intake_short_url) return cached.rows[0].intake_short_url;
    const resp = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
    if (!resp.ok) return longUrl;
    const shortUrl = (await resp.text()).trim();
    if (shortUrl.startsWith("http")) {
      await pool.query(`UPDATE businesses SET intake_short_url = $1 WHERE id = $2`, [shortUrl, businessId]);
      return shortUrl;
    }
  } catch {
    // fall through to long URL on any error
  }
  return longUrl;
}

// ─── slugify ────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60);
}

// ─── ensurePublicSlug ────────────────────────────────────────────

export async function ensurePublicSlug(businessId: string, companyName: string): Promise<string> {
  const existing = await pool.query(`SELECT public_quote_slug FROM businesses WHERE id = $1`, [businessId]);
  if (existing.rows[0]?.public_quote_slug) return existing.rows[0].public_quote_slug;
  let base = slugify(companyName) || "my-cleaning-co";
  let slug = base;
  for (let i = 2; i <= 20; i++) {
    try {
      await pool.query(`UPDATE businesses SET public_quote_slug = $1 WHERE id = $2`, [slug, businessId]);
      return slug;
    } catch {
      slug = `${base}-${i}`;
    }
  }
  return slug;
}

// ─── lookupIntakeBusiness ────────────────────────────────────────────

export async function lookupIntakeBusiness(codeOrId: string) {
  const r = await pool.query(
    `SELECT id, owner_user_id, company_name, logo_uri, primary_color, phone, email, intake_code FROM businesses WHERE intake_code = $1 OR id = $1 OR public_quote_slug = $1 LIMIT 1`,
    [codeOrId]
  );
  if (!r.rows.length) return null;
  const row = r.rows[0];
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    companyName: row.company_name,
    logoUri: row.logo_uri,
    primaryColor: row.primary_color,
    phone: row.phone,
    email: row.email,
    intakeCode: row.intake_code,
  };
}

// ─── processPendingFollowUps ────────────────────────────────────────────

export async function processPendingFollowUps() {
  const pending = await getPendingCommunications();
  let sent = 0;
  let canceled = 0;
  for (const comm of pending) {
    try {
      if (!comm.quoteId) { await updateCommunication(comm.id, { status: "canceled" }); canceled++; continue; }
      const quote = await getQuoteById(comm.quoteId);
      if (!quote || quote.status === "accepted" || quote.status === "expired") {
        await updateCommunication(comm.id, { status: "canceled" });
        canceled++;
        continue;
      }
      const customer = quote.customerId ? await getCustomerById(quote.customerId) : null;
      const business = await db_getBusinessById(quote.businessId);
      let messageText = comm.content?.trim() || "";
      if (!messageText) {
        messageText = await generateFollowUpMessage(quote, customer, business, comm.channel);
      }
      if (comm.channel === "email") {
        const { fromName, replyTo } = getBusinessSendParams(business);
        const toEmail = customer?.email;
        if (!toEmail) {
          await updateCommunication(comm.id, { status: "failed", errorMessage: "No customer email" });
          continue;
        }
        const quoteUrl = `${process.env.APP_URL || "https://quotepro.app"}/q/${quote.publicToken}`;
        const primaryColor = (business as any)?.primaryColor || "#2563EB";
        const quoteButtonHtml = `<div style="margin-top:24px;text-align:center;"><a href="${quoteUrl}" style="display:inline-block;background:${primaryColor};color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">View & Accept Your Quote</a></div>`;
        const subjectMatch = messageText.match(/^Subject:\s*(.+)/i);
        const subject = subjectMatch ? subjectMatch[1].trim() : `Following up on your quote from ${fromName}`;
        const body = subjectMatch ? messageText.replace(/^Subject:.*\n\n?/i, "").trim() : messageText;
        const htmlBody = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);"><tr><td style="background:linear-gradient(135deg,#007AFF,#5856D6);padding:24px 32px;"><h2 style="color:#fff;margin:0;font-size:20px;">${fromName}</h2></td></tr><tr><td style="padding:32px;">${body.split('\n').map((l: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333;">${l}</p>`).join('')}${quoteButtonHtml}</td></tr><tr><td style="padding:16px 32px 24px;border-top:1px solid #eee;"><p style="margin:0;font-size:12px;color:#999;">Sent via QuotePro</p></td></tr></table></td></tr></table></body></html>`;
        try {
          await sendEmail({ to: toEmail, subject, html: htmlBody, text: body, fromName, replyTo });
        } catch (mailErr: any) {
          console.error("[mail] Auto follow-up email error:", mailErr);
          await updateCommunication(comm.id, { status: "failed", errorMessage: String(mailErr?.message || mailErr).slice(0, 200) });
          continue;
        }
      } else {
        await updateCommunication(comm.id, { status: "failed", errorMessage: "SMS is not available. Customer communication is email-only." });
        continue;
      }
      await updateCommunication(comm.id, { status: "sent", sentAt: new Date(), content: messageText });
      sent++;
      console.log(`Auto follow-up sent: commId=${comm.id}, channel=${comm.channel}, quoteId=${comm.quoteId}`);
    } catch (e) {
      console.error(`Failed to process follow-up ${comm.id}:`, e);
    }
  }
  return { sent, canceled };
}

// ─── sendStaleQuoteNudges ────────────────────────────────────────────

export async function sendStaleQuoteNudges() {
  try {
    const staleQuotes = await getStaleQuotesForNudge(48);
    if (!staleQuotes.length) return;
    for (const q of staleQuotes) {
      try {
        const biz = await (async () => {
          const r = await pool.query("SELECT owner_user_id, company_name FROM businesses WHERE id = $1", [q.businessId]);
          return r.rows[0];
        })();
        if (!biz?.owner_user_id) continue;
        const tokens = await getPushTokensByUser(biz.owner_user_id);
        if (!tokens.length) continue;
        const customerName = (q.propertyDetails as any)?.customerName || "a customer";
        const pushMessages = tokens.map((t: any) => ({
          to: t.token,
          title: "Quote still pending",
          body: `Your quote for ${customerName} ($${ (q.total || 0).toFixed(0)}) hasn't been viewed. A quick follow-up can double your close rate.`,
          data: { screen: "QuoteDetail", quoteId: q.id },
          sound: "default",
        }));
        const res = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(pushMessages.length === 1 ? pushMessages[0] : pushMessages),
        });
        if (res.ok) {
          await markQuoteNudgeSent(q.id);
          console.log(`[nudge] Sent push for quote ${q.id} to business ${q.businessId}`);
        }
      } catch (e) {
        console.error(`[nudge] Error for quote ${q.id}:`, e);
      }
    }
  } catch (e) {
    console.error("[nudge] Failed to send stale quote nudges:", e);
  }
}

// ─── sendWeeklyDigestEmails ────────────────────────────────────────────

export async function sendWeeklyDigestEmails() {
  const now = new Date();
  if (now.getDay() !== 1) return; // Only Mondays
  const hour = now.getHours();
  if (hour < 7 || hour > 9) return; // Only 7-9am


  try {
    const businessIds = await getAllBusinessIds();
    for (const businessId of businessIds) {
      try {
        const prefs = await getPreferencesByBusiness(businessId);
        if (!prefs?.weeklyRecapEnabled) continue;

        const lastSent = prefs.lastWeeklyDigestAt ? new Date(prefs.lastWeeklyDigestAt) : null;
        if (lastSent) {
          const hoursSinceSent = (now.getTime() - lastSent.getTime()) / (60 * 60 * 1000);
          if (hoursSinceSent < 144) continue; // Skip if sent within last 6 days
        }

        const bizRow = await pool.query(
          "SELECT owner_user_id, company_name, email FROM businesses WHERE id = $1",
          [businessId]
        );
        if (!bizRow.rows.length) continue;
        const { owner_user_id, company_name, email: bizEmail } = bizRow.rows[0];

        const user = await getUserById(owner_user_id);
        const toEmail = user?.email || bizEmail;
        if (!toEmail) continue;

        const stats = await getWeeklyQuoteStats(businessId);
        const totalStats = await getQuoteStats(businessId);

        const pendingListHtml = stats.pendingQuotes.length
          ? stats.pendingQuotes.map((q) =>
              `<tr><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;">${q.customerName}</td><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">$${q.total.toFixed(2)}</td></tr>`
            ).join("")
          : `<tr><td colspan="2" style="padding:8px 0;color:#6b7280;">No pending quotes — great job!</td></tr>`;

        const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:20px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
<div style="background:linear-gradient(135deg,#7C3AED,#4F46E5);padding:32px 28px;">
  <p style="color:rgba(255,255,255,0.8);margin:0 0 4px;font-size:13px;">WEEKLY SNAPSHOT</p>
  <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">${company_name || "Your Business"}</h1>
</div>
<div style="padding:28px;">
  <div style="display:flex;gap:12px;margin-bottom:24px;">
    <div style="flex:1;background:#f5f3ff;border-radius:12px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#7C3AED;">${stats.sentCount}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:2px;">Quotes Sent</div>
    </div>
    <div style="flex:1;background:#ecfdf5;border-radius:12px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#059669;">${stats.acceptedCount}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:2px;">Won</div>
    </div>
    <div style="flex:1;background:#eff6ff;border-radius:12px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#2563EB;">$${stats.revenueWon.toFixed(0)}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:2px;">Revenue Won</div>
    </div>
  </div>
  <div style="background:#fafafa;border-radius:12px;padding:16px;margin-bottom:20px;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">All-Time Revenue</p>
    <p style="margin:0;font-size:24px;font-weight:700;color:#111;">$${totalStats.totalRevenue.toFixed(2)}</p>
  </div>
  ${stats.pendingQuotes.length > 0 ? `
  <h3 style="font-size:14px;font-weight:600;color:#374151;margin:0 0 8px;">Quotes Awaiting Reply</h3>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">${pendingListHtml}</table>
  <a href="${process.env.BASE_URL || 'https://quotepro.app'}" style="display:block;text-align:center;background:#7C3AED;color:#fff;padding:14px;border-radius:10px;font-weight:600;text-decoration:none;font-size:15px;">Follow Up Now</a>
  ` : `<p style="text-align:center;color:#6b7280;font-size:14px;">No open quotes — ready to send some new ones?</p>`}
</div>
<div style="padding:16px 28px;border-top:1px solid #f0f0f0;text-align:center;">
  <p style="margin:0;font-size:12px;color:#9ca3af;">QuotePro Weekly Digest &bull; <a href="${process.env.BASE_URL || ''}/settings" style="color:#7C3AED;">Manage notifications</a></p>
</div>
</div>
</body></html>`;

        try {
          await sendEmail({
            to: toEmail,
            subject: `Your week in review — ${stats.sentCount} quote${stats.sentCount !== 1 ? "s" : ""} sent, $${stats.revenueWon.toFixed(0)} won`,
            html: emailHtml,
            text: `${company_name} Weekly Snapshot\nQuotes Sent: ${stats.sentCount}\nWon: ${stats.acceptedCount}\nRevenue Won: $${stats.revenueWon.toFixed(2)}\nAll-Time Revenue: $${totalStats.totalRevenue.toFixed(2)}`,
            fromName: PLATFORM_FROM_NAME,
          });
          await markWeeklyDigestSent(businessId);
          console.log(`[digest] Weekly digest sent to ${toEmail} for business ${businessId}`);
        } catch (err) {
          console.error(`[digest] Mail error for business ${businessId}:`, err);
        }
      } catch (e) {
        console.error(`[digest] Error for business ${businessId}:`, e);
      }
    }
  } catch (e) {
    console.error("[digest] Failed to send weekly digests:", e);
  }
}

// ─── dispatchWebhook ────────────────────────────────────────────

export async function dispatchWebhook(businessId: string, userId: string, eventType: string, data: any) {
  try {
    const endpoints = await getActiveWebhookEndpointsForBusiness(businessId);
    if (endpoints.length === 0) return;

    const matchingEndpoints = endpoints.filter((ep: any) => {
      const enabled = ep.enabledEvents as string[] || [];
      return enabled.length === 0 || enabled.includes(eventType);
    });
    if (matchingEndpoints.length === 0) return;

    const event = await createWebhookEvent({ userId, businessId, eventType, payloadJson: data });

    const payload = {
      event_type: eventType,
      event_id: event.id,
      occurred_at: new Date().toISOString(),
      account_id: businessId,
      data,
    };
    const body = JSON.stringify(payload);

    const keys = await getApiKeysByUserId(userId);
    const activeKey = keys[0];
    const signature = activeKey
      ? crypto.createHmac("sha256", activeKey.keyHash).update(body).digest("hex")
      : "no-api-key";

    for (const ep of matchingEndpoints) {
      deliverWebhook(ep, event.id, body, signature, 1);
    }
  } catch (e) {
    console.error("Webhook dispatch error:", e);
  }
}

// ─── deliverWebhook ────────────────────────────────────────────

export async function deliverWebhook(endpoint: any, eventId: string, body: string, signature: string, attempt: number) {
  const delivery = await createWebhookDelivery({
    webhookEventId: eventId,
    endpointId: endpoint.id,
    attemptNumber: attempt,
    statusCode: null,
    responseBodyExcerpt: null,
    nextRetryAt: null,
    deliveredAt: null,
  });

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-QP-Signature": signature },
      body,
      signal: AbortSignal.timeout(15000),
    });

    const responseText = await response.text().catch(() => "");
    const excerpt = responseText.slice(0, 500);

    if (response.ok) {
      await updateWebhookDelivery(delivery.id, { statusCode: response.status, responseBodyExcerpt: excerpt, deliveredAt: new Date() });
    } else {
      const retryDelays = [60000, 300000, 900000];
      const nextRetry = attempt < 3 ? new Date(Date.now() + retryDelays[attempt - 1]) : null;
      await updateWebhookDelivery(delivery.id, { statusCode: response.status, responseBodyExcerpt: excerpt, nextRetryAt: nextRetry });
      if (nextRetry) {
        setTimeout(() => deliverWebhook(endpoint, eventId, body, signature, attempt + 1), retryDelays[attempt - 1]);
      }
    }
  } catch (err: any) {
    const retryDelays = [60000, 300000, 900000];
    const nextRetry = attempt < 3 ? new Date(Date.now() + retryDelays[attempt - 1]) : null;
    await updateWebhookDelivery(delivery.id, { statusCode: 0, responseBodyExcerpt: err.message?.slice(0, 500), nextRetryAt: nextRetry });
    if (nextRetry) {
      setTimeout(() => deliverWebhook(endpoint, eventId, body, signature, attempt + 1), retryDelays[attempt - 1]);
    }
  }
}

// ─── initQBOTables ────────────────────────────────────────────

export async function initQBOTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS qbo_connections (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id),
        realm_id TEXT,
        access_token_encrypted TEXT,
        refresh_token_encrypted TEXT,
        access_token_expires_at TIMESTAMP,
        refresh_token_last_rotated_at TIMESTAMP,
        connected_at TIMESTAMP,
        disconnected_at TIMESTAMP,
        scopes TEXT,
        environment TEXT NOT NULL DEFAULT 'production',
        status TEXT NOT NULL DEFAULT 'disconnected',
        last_error TEXT,
        company_name TEXT,
        auto_create_invoice BOOLEAN NOT NULL DEFAULT false
      );
      CREATE TABLE IF NOT EXISTS qbo_customer_mappings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        qp_customer_id VARCHAR NOT NULL REFERENCES customers(id),
        qbo_customer_id TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS qbo_invoice_links (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        quote_id VARCHAR NOT NULL REFERENCES quotes(id),
        qbo_invoice_id TEXT NOT NULL,
        qbo_doc_number TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, quote_id)
      );
      CREATE TABLE IF NOT EXISTS qbo_sync_log (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id),
        quote_id VARCHAR,
        action TEXT NOT NULL,
        request_summary JSONB,
        response_summary JSONB,
        status TEXT NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  } catch (e) {
    console.warn("QBO tables init:", (e as Error).message);
  }
}

// ─── initOAuthStatesTable ────────────────────────────────────────────

export async function initOAuthStatesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS oauth_states (
        state VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        provider VARCHAR NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`DELETE FROM oauth_states WHERE created_at < NOW() - INTERVAL '1 hour'`);
  } catch (e) {
    console.warn("OAuth states table init:", (e as Error).message);
  }
}

// ─── createQBOInvoiceForQuote ────────────────────────────────────────────

export async function createQBOInvoiceForQuote(userId: string, quoteId: string): Promise<{ qboInvoiceId: string; docNumber: string | null } | null> {
  const existingLink = await pool.query(
    `SELECT qbo_invoice_id, qbo_doc_number FROM qbo_invoice_links WHERE user_id = $1 AND quote_id = $2`,
    [userId, quoteId]
  );
  if (existingLink.rows.length > 0) {
    return { qboInvoiceId: existingLink.rows[0].qbo_invoice_id, docNumber: existingLink.rows[0].qbo_doc_number };
  }

  const client = new QBOClient(userId);
  const conn = await client.loadConnection();
  if (!conn || conn.status !== "connected") return null;

  const quote = await getQuoteById(quoteId);
  if (!quote) throw new Error("Quote not found");

  let customer: any = null;
  if (quote.customerId) {
    customer = await getCustomerById(quote.customerId);
  }

  let qboCustomerId: string | null = null;

  if (customer) {
    const mapping = await pool.query(
      `SELECT qbo_customer_id FROM qbo_customer_mappings WHERE user_id = $1 AND qp_customer_id = $2`,
      [userId, customer.id]
    );
    if (mapping.rows.length > 0) {
      qboCustomerId = mapping.rows[0].qbo_customer_id;
    } else {
      let found = null;
      if (customer.email) {
        found = await client.queryCustomer(customer.email);
      }
      if (!found && customer.name) {
        found = await client.queryCustomer(undefined, customer.name);
      }

      if (found) {
        qboCustomerId = found.Id;
      } else {
        const newCust = await client.createCustomer(
          customer.name || "Unknown Customer",
          customer.email || undefined,
          customer.phone || undefined,
          customer.address || undefined
        );
        qboCustomerId = newCust.Id;
        await logSync(userId, quoteId, "create_customer", { name: customer.name }, { qboId: newCust.Id }, "ok");
      }

      await pool.query(
        `INSERT INTO qbo_customer_mappings (id, user_id, qp_customer_id, qbo_customer_id) VALUES (gen_random_uuid(), $1, $2, $3)`,
        [userId, customer.id, qboCustomerId]
      );
    }
  } else {
    const defaultCust = await client.queryCustomer(undefined, "QuotePro Customer");
    if (defaultCust) {
      qboCustomerId = defaultCust.Id;
    } else {
      const newCust = await client.createCustomer("QuotePro Customer");
      qboCustomerId = newCust.Id;
    }
  }

  if (!qboCustomerId) throw new Error("Could not resolve QBO customer");

  const lineItems = await pool.query(`SELECT * FROM line_items WHERE quote_id = $1`, [quoteId]);
  const lines: Array<{ description: string; amount: number }> = [];

  if (lineItems.rows.length > 0) {
    for (const li of lineItems.rows) {
      lines.push({
        description: `${li.label || li.type || "Cleaning Service"}${li.description ? " - " + li.description : ""}`,
        amount: parseFloat(li.price) || 0,
      });
    }
  } else {
    const totalAmount = parseFloat(quote.total as any) || 0;
    const desc = quote.propertyDetails
      ? `Cleaning Services - ${(quote.propertyDetails as any)?.sqft || ""} sqft`
      : "Cleaning Services";
    lines.push({ description: desc, amount: totalAmount });
  }

  const privateNote = `QuotePro Quote #${(quote as any).quoteNumber || quoteId}`;
  const txnDate = new Date().toISOString().split("T")[0];

  const invoice = await client.createInvoice(qboCustomerId, lines, privateNote, txnDate);

  await pool.query(
    `INSERT INTO qbo_invoice_links (id, user_id, quote_id, qbo_invoice_id, qbo_doc_number)
     VALUES (gen_random_uuid(), $1, $2, $3, $4)
     ON CONFLICT (user_id, quote_id) DO NOTHING`,
    [userId, quoteId, invoice.Id, invoice.DocNumber || null]
  );

  await logSync(userId, quoteId, "create_invoice", { quoteId, lines: lines.length }, { invoiceId: invoice.Id, docNumber: invoice.DocNumber }, "ok");

  return { qboInvoiceId: invoice.Id, docNumber: invoice.DocNumber || null };
}

// ─── generateICS ────────────────────────────────────────────

export function generateICS(opts: { title: string; description: string; location: string; start: Date; end: Date; id: string }): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escapeICS = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//QuotePro//EN",
    "BEGIN:VEVENT",
    `UID:${opts.id}@quotepro.app`,
    `DTSTART:${fmt(opts.start)}`,
    `DTEND:${fmt(opts.end)}`,
    `SUMMARY:${escapeICS(opts.title)}`,
    `DESCRIPTION:${escapeICS(opts.description)}`,
    `LOCATION:${escapeICS(opts.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

// ─── buildGoogleCalendarUrl ────────────────────────────────────────────

export function buildGoogleCalendarUrl(opts: { title: string; description: string; location: string; start: Date; end: Date }): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${fmt(opts.start)}/${fmt(opts.end)}`,
    details: opts.description,
    location: opts.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ─── generateInvoicePdfHtml ────────────────────────────────────────────

export function generateInvoicePdfHtml(opts: {
  invoiceNumber: string;
  business: any;
  customerInfo: any;
  items: any[];
  totals: { subtotal: number; tax: number; total: number };
  notes: string;
  primaryColor: string;
  quoteDate: string;
}): string {
  const { invoiceNumber, business, customerInfo, items, totals, notes, primaryColor, quoteDate } = opts;
  const itemRows = items.map(
    (item: any) =>
      `<tr><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0">${item.name}</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:center">${item.quantity}</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:right">$${item.unitPrice.toFixed(2)}</td><td style="padding:10px 12px;border-bottom:1px solid #E2E8F0;text-align:right">$${item.amount.toFixed(2)}</td></tr>`
  ).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:40px;color:#1E293B;font-size:14px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
.company{font-size:20px;font-weight:700;color:${primaryColor}}
.invoice-label{font-size:28px;font-weight:700;color:#0F172A;text-align:right}
.invoice-meta{text-align:right;color:#64748B;font-size:13px;margin-top:4px}
.section{margin-bottom:24px}
.section-title{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748B;margin-bottom:8px;font-weight:600}
table{width:100%;border-collapse:collapse}
th{background:${primaryColor};color:#fff;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.5px}
th:nth-child(2),th:nth-child(3),th:nth-child(4){text-align:right}
th:nth-child(2){text-align:center}
.totals{margin-top:20px;text-align:right}
.totals .row{display:flex;justify-content:flex-end;gap:40px;padding:4px 12px}
.totals .total-row{font-weight:700;font-size:18px;color:${primaryColor};border-top:2px solid ${primaryColor};padding-top:8px;margin-top:4px}
.notes{background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-top:24px;font-size:13px;color:#475569}
.disclaimer{margin-top:32px;text-align:center;color:#94A3B8;font-size:11px;border-top:1px solid #E2E8F0;padding-top:16px}
</style></head><body>
<div class="header">
<div><div class="company">${business.companyName || "QuotePro"}</div>
${business.email ? `<div style="color:#64748B;font-size:13px;margin-top:4px">${business.email}</div>` : ""}
${business.phone ? `<div style="color:#64748B;font-size:13px">${business.phone}</div>` : ""}
${business.address ? `<div style="color:#64748B;font-size:13px">${business.address}</div>` : ""}
</div>
<div><div class="invoice-label">INVOICE</div><div class="invoice-meta">${invoiceNumber}<br>Date: ${quoteDate}</div></div>
</div>
<div class="section"><div class="section-title">Bill To</div>
<div style="font-weight:600">${customerInfo.displayName}</div>
${customerInfo.email ? `<div style="color:#64748B">${customerInfo.email}</div>` : ""}
${customerInfo.phone ? `<div style="color:#64748B">${customerInfo.phone}</div>` : ""}
${customerInfo.serviceAddress ? `<div style="color:#64748B">${customerInfo.serviceAddress}</div>` : ""}
</div>
<table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${itemRows}</tbody></table>
<div class="totals">
<div class="row"><span>Subtotal:</span><span>$${totals.subtotal.toFixed(2)}</span></div>
${totals.tax > 0 ? `<div class="row"><span>Tax:</span><span>$${totals.tax.toFixed(2)}</span></div>` : ""}
<div class="row total-row"><span>Total:</span><span>$${totals.total.toFixed(2)}</span></div>
</div>
${notes ? `<div class="notes"><strong>Notes:</strong> ${notes}</div>` : ""}
<div class="disclaimer">Designed for easy entry/import into QuickBooks. Not a live sync.<br>Generated by QuotePro</div>
</body></html>`;
}


// ─── db_getBusinessById ────────────────────────────────────────────

export async function db_getBusinessById(businessId: string) {
  const { db } = await import("./db");
  const { businesses } = await import("@shared/schema");
  const { eq } = await import("drizzle-orm");
  const [b] = await db.select().from(businesses).where(eq(businesses.id, businessId));
  return b;
}

// ─── formatUser ────────────────────────────────────────────

export function formatUser(u: any) {
  const subscriptionTier = u.subscriptionTier || u.subscription_tier || "free";
  const trialStartedAt = u.trialStartedAt || u.trial_started_at;
  const trialExpired =
    subscriptionTier === "free" &&
    trialStartedAt != null &&
    Date.now() > new Date(trialStartedAt).getTime() + 14 * 24 * 60 * 60 * 1000;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    firstName: u.firstName ?? u.first_name ?? null,
    subscriptionTier,
    trialExpired,
    createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
    activeLocationId: u.activeLocationId ?? u.active_location_id ?? null,
    isMultiLocationEnabled: !!(u.isMultiLocationEnabled ?? u.is_multi_location_enabled ?? false),
    autopilotEnabled: !!(u.autopilotEnabled ?? u.autopilot_enabled ?? false),
    hasCompletedFirstQuote: !!(u.hasCompletedFirstQuote ?? u.has_completed_first_quote ?? false),
  };
}

// ─── getQuickQuoteHTML ────────────────────────────────────────────

export function getQuickQuoteHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Get Your Instant Quote</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC;color:#0F172A;min-height:100vh}
.container{max-width:480px;margin:0 auto;padding:20px}
.header{text-align:center;padding:32px 0 24px}
.header h1{font-size:24px;font-weight:700;color:#007AFF;margin-bottom:4px}
.header p{font-size:14px;color:#64748B}
.card{background:#fff;border-radius:16px;padding:24px;margin-bottom:16px}
.card h2{font-size:18px;font-weight:600;margin-bottom:16px}
label{display:block;font-size:13px;font-weight:500;color:#64748B;margin-bottom:6px}
input,select{width:100%;padding:12px;border:1px solid #E2E8F0;border-radius:10px;font-size:15px;margin-bottom:14px;background:#F8FAFC;color:#0F172A;outline:none;transition:border-color .2s}
input:focus,select:focus{border-color:#007AFF}
.row{display:flex;gap:12px}
.row>div{flex:1}
.btn{width:100%;padding:14px;background:#007AFF;color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;transition:opacity .2s}
.btn:hover{opacity:.9}
.btn:disabled{opacity:.5;cursor:not-allowed}
.result{display:none;text-align:center;padding:32px 0}
.result .price{font-size:48px;font-weight:700;color:#007AFF;margin:16px 0 8px}
.result .label{font-size:14px;color:#64748B}
.result .biz{font-size:16px;font-weight:600;margin-top:16px}
.result .contact{font-size:14px;color:#64748B;margin-top:4px}
.powered{text-align:center;padding:16px 0;font-size:12px;color:#94A3B8}
</style>
</head>
<body>
<div class="container">
<div class="header">
<h1>Get Your Instant Quote</h1>
<p>Fill in your details for a quick estimate</p>
</div>
<form id="quoteForm">
<div class="card">
<h2>Your Info</h2>
<label>Full Name</label>
<input type="text" id="name" placeholder="John Smith" required>
<div class="row">
<div><label>Phone</label><input type="tel" id="phone" placeholder="(555) 123-4567"></div>
<div><label>Email</label><input type="email" id="email" placeholder="you@email.com"></div>
</div>
<label>ZIP Code</label>
<input type="text" id="zip" placeholder="12345" maxlength="10">
</div>
<div class="card">
<h2>Property Details</h2>
<div class="row">
<div><label>Bedrooms</label><input type="number" id="beds" value="3" min="1" max="10"></div>
<div><label>Bathrooms</label><input type="number" id="baths" value="2" min="1" max="10"></div>
</div>
<label>Square Footage</label>
<input type="number" id="sqft" value="1500" min="200" max="20000">
<label>Service Type</label>
<select id="serviceType">
<option value="regular">Regular Cleaning</option>
<option value="deep_clean">Deep Clean</option>
<option value="move_in_out">Move In/Out</option>
</select>
<label>Frequency</label>
<select id="frequency">
<option value="one-time">One-Time</option>
<option value="weekly">Weekly</option>
<option value="biweekly">Bi-Weekly</option>
<option value="monthly">Monthly</option>
</select>
</div>
<button type="submit" class="btn" id="submitBtn">Get My Quote</button>
</form>
<div class="result" id="result">
<div style="font-size:48px">&#x2728;</div>
<div class="price" id="priceDisplay">$0</div>
<div class="label">Estimated cleaning cost</div>
<div class="biz" id="bizName"></div>
<div class="contact" id="bizContact"></div>
<button class="btn" onclick="location.reload()" style="margin-top:24px">Get Another Quote</button>
</div>
<div class="powered">Powered by QuotePro</div>
</div>
<script>
const params = new URLSearchParams(location.search);
const businessId = params.get('u') || '';
const channel = params.get('ch') || '';
const conversationId = params.get('cid') || '';
document.getElementById('quoteForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Calculating...';
  try {
    const res = await fetch('/api/public/quick-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId, channel, conversationId,
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        email: document.getElementById('email').value,
        zip: document.getElementById('zip').value,
        beds: parseInt(document.getElementById('beds').value),
        baths: parseInt(document.getElementById('baths').value),
        sqft: parseInt(document.getElementById('sqft').value),
        serviceType: document.getElementById('serviceType').value,
        frequency: document.getElementById('frequency').value,
      }),
    });
    const data = await res.json();
    if (data.quote) {
      document.getElementById('priceDisplay').textContent = '$' + data.quote.total.toFixed(0);
      if (data.business) {
        document.getElementById('bizName').textContent = data.business.companyName || '';
        const contact = [data.business.phone, data.business.email].filter(Boolean).join(' | ');
        document.getElementById('bizContact').textContent = contact;
      }
      document.getElementById('quoteForm').style.display = 'none';
      document.getElementById('result').style.display = 'block';
    }
  } catch(err) {
    btn.disabled = false;
    btn.textContent = 'Get My Quote';
  }
});
</script>
</body>
</html>`;
}

// ─── syncJobToGoogleCalendar ────────────────────────────────────────────

export async function syncJobToGoogleCalendar(userId: string, job: any, customerName: string) {
  try {
    const tokens = await getGoogleCalendarToken(userId);
    if (!tokens) return;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expiry_date: new Date(tokens.expiresAt).getTime(),
    });

    if (new Date(tokens.expiresAt) < new Date()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await upsertGoogleCalendarToken(userId, {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || tokens.refreshToken,
        expiresAt: new Date(credentials.expiry_date!),
      });
      oauth2Client.setCredentials(credentials);
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const endTime = job.endDatetime || new Date(new Date(job.startDatetime).getTime() + 2 * 60 * 60 * 1000);

    await calendar.events.insert({
      calendarId: tokens.calendarId || "primary",
      requestBody: {
        summary: `Clean - ${customerName}`,
        location: job.address || undefined,
        start: { dateTime: new Date(job.startDatetime).toISOString() },
        end: { dateTime: new Date(endTime).toISOString() },
        description: [
          job.jobType ? `Type: ${job.jobType}` : "",
          job.total ? `Total: $${job.total}` : "",
          job.internalNotes || "",
        ].filter(Boolean).join("\n"),
      },
    });
  } catch (error) {
    console.error("Google Calendar sync error:", error);
  }
}

// ─── formatBusiness ────────────────────────────────────────────

export function formatBusiness(b: any) {
  return {
    id: b.id,
    companyName: b.companyName,
    email: b.email,
    phone: b.phone,
    address: b.address,
    logoUri: b.logoUri,
    primaryColor: b.primaryColor,
    senderName: b.senderName,
    senderTitle: b.senderTitle,
    bookingLink: b.bookingLink,
    emailSignature: b.emailSignature,
    smsSignature: b.smsSignature,
    timezone: b.timezone,
    onboardingComplete: b.onboardingComplete,
    venmoHandle: b.venmoHandle || null,
    cashappHandle: b.cashappHandle || null,
    paymentOptions: b.paymentOptions || null,
    paymentNotes: b.paymentNotes || null,
    avatarConfig: b.avatarConfig || null,
    appLanguage: b.appLanguage || "en",
    commLanguage: b.commLanguage || "en",
    currency: b.currency || "USD",
    languageSelected: b.languageSelected ?? false,
  };
}

// ─── getPrivacyPolicyHTML ────────────────────────────────────────────

export function getPrivacyPolicyHTML(): string {
  const styles = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC;color:#1E293B;line-height:1.7}.container{max-width:720px;margin:0 auto;padding:40px 24px}h1{font-size:28px;font-weight:700;color:#0F172A;margin-bottom:8px}h2{font-size:20px;font-weight:600;color:#0F172A;margin-top:32px;margin-bottom:12px}.updated{font-size:14px;color:#64748B;margin-bottom:32px}p,li{font-size:15px;margin-bottom:12px;color:#334155}ul{padding-left:20px}a{color:#2563EB;text-decoration:none}.back{display:inline-block;margin-bottom:24px;font-size:14px;color:#64748B}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Privacy Policy - QuotePro</title><style>${styles}</style></head><body><div class="container">
<a href="/" class="back">&larr; Back to QuotePro</a>
<h1>Privacy Policy</h1>
<p class="updated">Last updated: February 14, 2026</p>

<p>QuotePro ("we," "our," or "us") operates the QuotePro mobile application and web platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.</p>

<h2>Information We Collect</h2>
<p>We collect information you provide directly to us, including:</p>
<ul>
<li><strong>Account Information:</strong> Name, email address, and password when you create an account.</li>
<li><strong>Business Information:</strong> Company name, phone number, address, logo, and branding preferences.</li>
<li><strong>Customer Data:</strong> Names, contact information, property details, and communication history for your customers that you enter into the platform.</li>
<li><strong>Quote and Job Data:</strong> Pricing, service details, job schedules, checklists, and photos you create within the app.</li>
<li><strong>Payment Information:</strong> Subscription payment data is processed by RevenueCat and Apple/Google; we do not store your payment card details.</li>
</ul>

<h2>Third-Party Services</h2>
<p>We integrate with the following third-party services to provide our features:</p>
<ul>
<li><strong>Google Calendar:</strong> With your explicit consent, we access your Google Calendar to create and update events for scheduled jobs. We only request access to create and modify calendar events (calendar.events scope). We do not read your existing calendar data.</li>
<li><strong>SendGrid:</strong> Used to send emails on your behalf to your customers.</li>
<li><strong>Anthropic:</strong> Used to generate AI-powered content such as email drafts and business insights. Your business data may be sent to Anthropic for processing but is not used to train their models.</li>
<li><strong>RevenueCat:</strong> Manages subscription purchases and entitlements.</li>
</ul>

<h2>How We Use Your Information</h2>
<ul>
<li>To provide, maintain, and improve our services.</li>
<li>To create quotes, manage jobs, and track customer communications on your behalf.</li>
<li>To sync your job schedule with Google Calendar when you opt in.</li>
<li>To send emails and notifications related to your account and business.</li>
<li>To generate AI-powered content and business insights.</li>
<li>To process your subscription payments.</li>
</ul>

<h2>Data Storage and Security</h2>
<p>Your data is stored securely in our PostgreSQL database hosted by Neon. We use industry-standard security measures including encrypted connections (HTTPS/TLS), secure session management, and hashed passwords to protect your information.</p>

<h2>Data Sharing</h2>
<p>We do not sell, trade, or rent your personal information to third parties. We only share data with the third-party services listed above as necessary to provide our features, and with your explicit consent where required (such as Google Calendar access).</p>

<h2>Your Rights</h2>
<p>You have the right to:</p>
<ul>
<li>Access, update, or delete your account information.</li>
<li>Disconnect third-party integrations (such as Google Calendar) at any time.</li>
<li>Export your data upon request.</li>
<li>Delete your account and all associated data by contacting us.</li>
</ul>

<h2>Data Retention</h2>
<p>We retain your data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal or regulatory purposes.</p>

<h2>Children's Privacy</h2>
<p>Our service is not directed to children under 13. We do not knowingly collect personal information from children under 13.</p>

<h2>Changes to This Policy</h2>
<p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.</p>

<h2>Contact Us</h2>
<p>If you have questions about this Privacy Policy, please contact us at <a href="mailto:mike@getquotepro.ai">mike@getquotepro.ai</a>.</p>
</div></body></html>`;
}

// ─── getTermsOfServiceHTML ────────────────────────────────────────────

export function getTermsOfServiceHTML(): string {
  const styles = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC;color:#1E293B;line-height:1.7}.container{max-width:720px;margin:0 auto;padding:40px 24px}h1{font-size:28px;font-weight:700;color:#0F172A;margin-bottom:8px}h2{font-size:20px;font-weight:600;color:#0F172A;margin-top:32px;margin-bottom:12px}.updated{font-size:14px;color:#64748B;margin-bottom:32px}p,li{font-size:15px;margin-bottom:12px;color:#334155}ul{padding-left:20px}a{color:#2563EB;text-decoration:none}.back{display:inline-block;margin-bottom:24px;font-size:14px;color:#64748B}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Terms of Service - QuotePro</title><style>${styles}</style></head><body><div class="container">
<a href="/" class="back">&larr; Back to QuotePro</a>
<h1>Terms of Service</h1>
<p class="updated">Last updated: February 14, 2026</p>

<p>Welcome to QuotePro. By using our mobile application and web platform ("Service"), you agree to these Terms of Service ("Terms"). Please read them carefully.</p>

<h2>1. Acceptance of Terms</h2>
<p>By creating an account or using QuotePro, you agree to be bound by these Terms. If you do not agree, do not use the Service.</p>

<h2>2. Description of Service</h2>
<p>QuotePro is a software platform designed for residential cleaning businesses to create quotes, manage customers, schedule jobs, and track communications. The Service includes both free and paid subscription tiers.</p>

<h2>3. Account Registration</h2>
<p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</p>

<h2>4. Subscription and Payments</h2>
<ul>
<li>QuotePro offers a free tier with basic quoting features and a paid "QuotePro AI" tier with additional features.</li>
<li>Paid subscriptions are billed through Apple App Store or Google Play Store via RevenueCat.</li>
<li>Subscription terms, pricing, and refund policies are governed by the respective app store's policies.</li>
<li>We reserve the right to change subscription pricing with reasonable notice.</li>
</ul>

<h2>5. Your Data</h2>
<p>You retain ownership of all data you enter into QuotePro, including customer information, quotes, and business details. You are responsible for ensuring you have the right to store and process your customers' personal information. Please refer to our <a href="/privacy">Privacy Policy</a> for details on how we handle data.</p>

<h2>6. Acceptable Use</h2>
<p>You agree not to:</p>
<ul>
<li>Use the Service for any unlawful purpose.</li>
<li>Attempt to gain unauthorized access to our systems or other users' accounts.</li>
<li>Upload malicious content or interfere with the Service's operation.</li>
<li>Resell or redistribute the Service without our written consent.</li>
<li>Use the Service to send unsolicited or spam communications.</li>
</ul>

<h2>7. Third-Party Integrations</h2>
<p>QuotePro integrates with third-party services including Google Calendar, SendGrid, and Anthropic. Your use of these integrations is subject to the respective third-party terms of service. We are not responsible for the availability or performance of third-party services.</p>

<h2>8. Limitation of Liability</h2>
<p>QuotePro is provided "as is" without warranties of any kind. To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to lost profits, data loss, or business interruption.</p>

<h2>9. Termination</h2>
<p>You may cancel your account at any time. We reserve the right to suspend or terminate accounts that violate these Terms. Upon termination, your right to use the Service ceases, and we may delete your data in accordance with our Privacy Policy.</p>

<h2>10. Changes to Terms</h2>
<p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms. We will notify you of material changes via email or in-app notification.</p>

<h2>11. Governing Law</h2>
<p>These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to conflict of law provisions.</p>

<h2>12. Contact</h2>
<p>For questions about these Terms, please contact us at <a href="mailto:mike@getquotepro.ai">mike@getquotepro.ai</a>.</p>
</div></body></html>`;
}

// ─── getDeleteAccountHTML ────────────────────────────────────────────

export function getDeleteAccountHTML(): string {
  const styles = `*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F8FAFC;color:#1E293B;line-height:1.7}.container{max-width:720px;margin:0 auto;padding:40px 24px}h1{font-size:28px;font-weight:700;color:#0F172A;margin-bottom:8px}h2{font-size:20px;font-weight:600;color:#0F172A;margin-top:32px;margin-bottom:12px}.updated{font-size:14px;color:#64748B;margin-bottom:32px}p,li{font-size:15px;margin-bottom:12px;color:#334155}ul{padding-left:20px}a{color:#2563EB;text-decoration:none}.back{display:inline-block;margin-bottom:24px;font-size:14px;color:#64748B}`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Delete Account - QuotePro</title><style>${styles}</style></head><body><div class="container">
<a href="/" class="back">&larr; Back to QuotePro</a>
<h1>Delete Your Account</h1>
<p class="updated">QuotePro for Cleaners</p>

<h2>How to Request Account Deletion</h2>
<p>To request deletion of your QuotePro account and all associated data, please email us at <a href="mailto:mike@getquotepro.ai">mike@getquotepro.ai</a> with the subject line "Account Deletion Request" and include the email address associated with your account.</p>

<h2>What Happens When You Delete Your Account</h2>
<p>When you request account deletion, the following data will be permanently deleted within 30 days:</p>
<ul>
<li>Your account profile information (name, email address)</li>
<li>All quotes you have created</li>
<li>Customer information you have entered</li>
<li>Business profile and settings</li>
<li>Job history and records</li>
<li>Any AI-generated content associated with your account</li>
</ul>

<h2>Data We May Retain</h2>
<p>We may retain certain data as required by law or for legitimate business purposes, including:</p>
<ul>
<li>Transaction records related to subscription payments (retained for tax and accounting purposes)</li>
<li>Data necessary to comply with legal obligations</li>
</ul>

<h2>Subscription Cancellation</h2>
<p>Deleting your account does not automatically cancel your subscription. Before requesting account deletion, please cancel your subscription through the App Store or Google Play Store to avoid future charges.</p>

<h2>Contact</h2>
<p>If you have questions about the account deletion process, contact us at <a href="mailto:mike@getquotepro.ai">mike@getquotepro.ai</a>.</p>
</div></body></html>`;
}



// ─── Shared constants (used by aiRouter, automationsRouter) ────────────────

export const MILESTONES = [1000, 5000, 10000, 25000, 50000, 100000];

export const SHARED_PURPOSE_DESCRIPTIONS: Record<string, string> = {
    send_quote: "sending a new quote to the customer for the first time - be enthusiastic, highlight the value and services included, mention the quote is ready for them to review, and encourage them to accept. If a quote link is available, invite them to click it to view and accept",
    initial_quote: "sending an initial quote - be enthusiastic and highlight value",
    follow_up: "a gentle follow-up on a previously sent quote - be polite and not pushy",
    thank_you: "thanking the customer for their business - be grateful and warm",
    booking_confirmation: "confirming a booking - be professional and include key details",
    reschedule: "requesting or confirming a reschedule - be understanding and accommodating",
    payment_failed: "notifying the customer that their payment could not be processed - be polite and professional, avoid blaming the customer, keep the tone helpful, encourage quick resolution, mention they can retry the payment. If a payment link or quote link is available include it. Keep under 120 words",
    reminder: "reminding the customer about an upcoming cleaning appointment - be friendly and brief, mention you're looking forward to it, ask them to reach out with any changes",
    upsell: "suggesting an add-on or upgrade to an existing customer (e.g. deep clean, inside oven, inside fridge, windows) - be casual and low-pressure, just plant the seed, don't oversell",
    review_request: "asking a happy customer to leave an online review - sound like a real small business owner asking a genuine favor, keep it short and make it easy to say yes",
  };

export const BUILT_IN_SEQUENCES = [
    {
      id: "seq-welcome-new-customer",
      name: "Welcome New Customer",
      description: "Onboard new clients with a warm 3-step series that sets expectations and encourages their first review.",
      category: "Onboarding",
      icon: "star",
      color: "blue",
      steps: [
        { subject: "Welcome to {{businessName}}! Here's what to expect", delayDays: 0, body: "Hi {{customerName}},\n\nWelcome aboard! We're thrilled to have you as a new customer.\n\nHere's what you can expect from us:\n- Thorough, professional cleaning every time\n- Fully vetted and insured cleaners\n- 100% satisfaction guarantee\n\nIf you have any questions before your first appointment, just reply to this email.\n\nLooking forward to making your home shine!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "How did your first clean go?", delayDays: 3, body: "Hi {{customerName}},\n\nWe hope your first clean with {{businessName}} went wonderfully!\n\nWe'd love to hear your thoughts. Your feedback helps us improve and serve you better.\n\nIf everything was great, we'd really appreciate a quick review — it means the world to a small business like ours:\n{{bookingLink}}\n\nIf anything fell short of your expectations, just reply to this email and we'll make it right.\n\nThank you for trusting us with your home!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Ready to make your cleaning recurring?", delayDays: 10, body: "Hi {{customerName}},\n\nWe've loved cleaning for you! Many of our customers find that scheduling recurring cleanings keeps their home consistently fresh without the hassle of rescheduling each time.\n\nWe offer weekly, bi-weekly, and monthly plans — and recurring clients get priority scheduling.\n\nInterested? Book your next visit here:\n{{bookingLink}}\n\nTalk soon!\n\n{{senderName}}\n{{businessName}}" },
      ],
    },
    {
      id: "seq-spring-cleaning",
      name: "Spring Cleaning Campaign",
      description: "Seasonal campaign to re-engage existing clients and attract new ones with a spring cleaning special.",
      category: "Seasonal",
      icon: "sun",
      color: "green",
      steps: [
        { subject: "Spring is here — is your home ready?", delayDays: 0, body: "Hi {{customerName}},\n\nSpring has arrived and there's no better time to refresh your home from top to bottom!\n\nOur Spring Deep Clean package covers all the spots that need extra attention after winter — baseboards, windows, behind appliances, and more.\n\nBook your spring clean now:\n{{bookingLink}}\n\nSpots are filling fast!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Last chance: Spring cleaning spots are almost gone", delayDays: 5, body: "Hi {{customerName}},\n\nJust a friendly reminder — our spring cleaning calendar is filling up quickly!\n\nDon't miss the chance to start the season with a sparkling clean home.\n\nBook now before we're fully booked:\n{{bookingLink}}\n\nWe'd love to help make your spring fresh and clean!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Still thinking about a spring clean?", delayDays: 10, body: "Hi {{customerName}},\n\nWe know life gets busy, but we wanted to reach out one more time.\n\nA thorough spring clean can make a real difference — less dust, better air quality, and a home you're proud of.\n\nWe still have a few openings. Claim yours here:\n{{bookingLink}}\n\nTalk soon!\n\n{{senderName}}\n{{businessName}}" },
      ],
    },
    {
      id: "seq-mothers-day",
      name: "Mother's Day Special",
      description: "Gift-focused campaign promoting cleaning services as the perfect Mother's Day present.",
      category: "Seasonal",
      icon: "heart",
      color: "pink",
      steps: [
        { subject: "Give Mom the gift of a clean home this Mother's Day", delayDays: 0, body: "Hi {{customerName}},\n\nMother's Day is coming up — and what better gift than a spotlessly clean home?\n\nGive the mom in your life the gift of relaxation with a professional cleaning from {{businessName}}.\n\nIt's thoughtful, practical, and something she'll truly appreciate.\n\nBook a Mother's Day clean here:\n{{bookingLink}}\n\nHappy early Mother's Day from all of us!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Mother's Day is almost here — have you booked Mom's clean?", delayDays: 5, body: "Hi {{customerName}},\n\nMother's Day is just around the corner!\n\nIf you're still searching for the perfect gift, a professional home cleaning is a wonderful way to show you care.\n\nOur team will leave her home looking and smelling amazing.\n\nBook now — limited spots remain:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Last call for Mother's Day cleaning gifts", delayDays: 9, body: "Hi {{customerName}},\n\nToday is your last chance to book a Mother's Day cleaning gift!\n\nWe have a very limited number of spots left before the holiday. Secure yours now:\n{{bookingLink}}\n\nWe'll make sure Mom's home is truly special.\n\n{{senderName}}\n{{businessName}}" },
      ],
    },
    {
      id: "seq-fall-deep-clean",
      name: "Fall Deep Clean",
      description: "Encourage clients to do a thorough clean before the holiday season and colder months ahead.",
      category: "Seasonal",
      icon: "wind",
      color: "orange",
      steps: [
        { subject: "Get your home ready for fall — book your deep clean", delayDays: 0, body: "Hi {{customerName}},\n\nFall is the perfect time to give your home a thorough refresh before the holiday season kicks in!\n\nOur Fall Deep Clean covers all the areas that tend to get overlooked during regular maintenance cleanings — vents, under furniture, kitchen appliances, and more.\n\nBook your fall deep clean now:\n{{bookingLink}}\n\nWarm regards,\n{{senderName}}\n{{businessName}}" },
        { subject: "Holiday season is coming — is your home ready?", delayDays: 7, body: "Hi {{customerName}},\n\nWith the holidays approaching, you'll soon be hosting family and friends. Starting with a beautifully clean home makes all the difference!\n\nOur team can take care of the deep cleaning so you can focus on the fun parts of the season.\n\nSchedule your clean here:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Don't wait until the holidays — book your clean now", delayDays: 14, body: "Hi {{customerName}},\n\nWe're heading into the busiest time of year, and our calendar is filling up fast.\n\nBook now to lock in your preferred date before the holiday rush:\n{{bookingLink}}\n\nWe look forward to helping you enjoy a clean, stress-free home this season!\n\n{{senderName}}\n{{businessName}}" },
      ],
    },
    {
      id: "seq-back-to-school",
      name: "Back to School Clean",
      description: "Target families getting back into routines after summer break with a reset cleaning campaign.",
      category: "Seasonal",
      icon: "book",
      color: "purple",
      steps: [
        { subject: "Back to school = back to routine. Start fresh with a clean home!", delayDays: 0, body: "Hi {{customerName}},\n\nSchool's back in session — and that means schedules, homework, and busy evenings. The last thing you want to worry about is cleaning!\n\nLet us handle it so you can focus on what matters most.\n\nBook your back-to-school clean:\n{{bookingLink}}\n\nHere's to a great school year!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Busy with school? Let us take cleaning off your plate", delayDays: 6, body: "Hi {{customerName}},\n\nWe know back-to-school season can be hectic. Between drop-offs, activities, and work, cleaning often falls to the bottom of the list.\n\nThat's where we come in! Let our team keep your home fresh while you focus on your family.\n\nEasy booking here:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Set up a recurring clean for the school year", delayDays: 12, body: "Hi {{customerName}},\n\nMany of our busiest clients set up recurring cleanings at the start of the school year so they never have to think about it again!\n\nWeekly, bi-weekly, or monthly — we'll work around your schedule.\n\nBook your recurring plan now:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" },
      ],
    },
    {
      id: "seq-win-back",
      name: "Win Back Inactive Client",
      description: "Re-engage clients who haven't booked in a while with a personalized outreach series.",
      category: "Retention",
      icon: "refresh-cw",
      color: "indigo",
      steps: [
        { subject: "We miss you, {{customerName}}!", delayDays: 0, body: "Hi {{customerName}},\n\nIt's been a while since we've had the pleasure of cleaning your home, and we wanted to reach out!\n\nWe've made some improvements to our service and would love the chance to impress you again.\n\nBook a cleaning at your convenience:\n{{bookingLink}}\n\nWe hope to hear from you soon!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Still thinking about booking? We're here for you", delayDays: 7, body: "Hi {{customerName}},\n\nWe wanted to follow up and let you know we'd love to have you back as a client.\n\nIf there's anything that prevented you from booking last time — pricing, scheduling, or otherwise — we'd love to chat and see if we can find a solution that works for you.\n\nJust reply to this email, or book directly here:\n{{bookingLink}}\n\nWarmly,\n{{senderName}}\n{{businessName}}" },
        { subject: "Last check-in from {{businessName}}", delayDays: 14, body: "Hi {{customerName}},\n\nThis is our last check-in, and we promise not to keep nudging you after this!\n\nIf you're ever ready for a fresh, professionally cleaned home, we'd be honored to help.\n\nWe're here whenever you need us:\n{{bookingLink}}\n\nWishing you all the best,\n\n{{senderName}}\n{{businessName}}" },
      ],
    },
    {
      id: "seq-deep-clean-upsell",
      name: "Deep Clean Upsell",
      description: "Upsell regular cleaning clients to a premium deep clean service.",
      category: "Growth",
      icon: "zap",
      color: "yellow",
      steps: [
        { subject: "Have you considered a deep clean? Here's why it's worth it", delayDays: 0, body: "Hi {{customerName}},\n\nYou've been a wonderful regular client, and we truly appreciate your loyalty!\n\nWe wanted to share something that many of our clients find incredibly valuable: our Deep Clean service.\n\nUnlike standard cleanings, our deep clean tackles the hidden spots — inside appliances, light fixtures, grout, behind furniture, and more. It's a full reset for your home.\n\nMany clients schedule one every season or after major events. Want to see what the difference feels like?\n\nBook a deep clean here:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Your home might be due for a deep clean — here's how to know", delayDays: 8, body: "Hi {{customerName}},\n\nHere are some signs it might be time for a deep clean:\n- It's been 6+ months since your last one\n- You're noticing buildup in hard-to-reach areas\n- You have guests coming or just moved in/out\n- Your standard clean doesn't feel thorough enough anymore\n\nOur deep clean goes far beyond the surface. Ready to experience it?\n\nBook now:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Ready for your deep clean?", delayDays: 14, body: "Hi {{customerName}},\n\nWe'd love to give your home the full treatment it deserves!\n\nOur deep clean clients consistently tell us it's one of the best decisions they've made. Schedule yours today:\n{{bookingLink}}\n\nLooking forward to hearing from you!\n\n{{senderName}}\n{{businessName}}" },
      ],
    },
    {
      id: "seq-holiday-special",
      name: "Holiday Cleaning Special",
      description: "Promote holiday cleaning packages to help clients prepare their homes for holiday entertaining.",
      category: "Seasonal",
      icon: "gift",
      color: "red",
      steps: [
        { subject: "Holiday entertaining? Let us get your home party-ready!", delayDays: 0, body: "Hi {{customerName}},\n\nThe holiday season is approaching, and if you're planning to host family and friends, there's no better time to get your home looking its absolute best!\n\nOur Holiday Clean package includes all the extra touches that make your home shine for guests — windows, baseboards, kitchen deep clean, and bathroom detail.\n\nBook your holiday clean:\n{{bookingLink}}\n\nWishing you a wonderful holiday season!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Hosting for the holidays? We've got you covered", delayDays: 6, body: "Hi {{customerName}},\n\nDon't let cleaning be one more thing on your holiday to-do list!\n\nLet our team handle it while you focus on decorating, cooking, and spending time with loved ones.\n\nWe're booking up fast for the holiday season — secure your spot now:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Final holiday cleaning spots available", delayDays: 12, body: "Hi {{customerName}},\n\nThis is it — our last available holiday cleaning slots are going fast!\n\nIf you want your home sparkling clean for the holidays, now is the time to book.\n\nDon't miss out:\n{{bookingLink}}\n\nHappy holidays from the entire {{businessName}} team!\n\n{{senderName}}\n{{businessName}}" },
      ],
    },
    {
      id: "seq-new-year",
      name: "New Year Fresh Start",
      description: "Kick off the new year with a campaign encouraging clients to start fresh with a clean home.",
      category: "Seasonal",
      icon: "sunrise",
      color: "cyan",
      steps: [
        { subject: "New year, fresh home — start 2025 clean!", delayDays: 0, body: "Hi {{customerName}},\n\nHappy New Year!\n\nWhat better way to kick off a fresh start than with a beautifully clean home?\n\nOur New Year Clean-Out package helps you declutter the old and welcome the new with a sparkling, refreshed living space.\n\nBook your new year clean:\n{{bookingLink}}\n\nHere's to a wonderful year ahead!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Still on your new year's list? Let us check 'clean home' off for you", delayDays: 8, body: "Hi {{customerName}},\n\nNew year resolutions are tricky — but a clean home doesn't have to be!\n\nLet us take this one off your plate so you can focus on the resolutions that matter most.\n\nBook your clean today:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Make clean home a habit this year — set up a recurring plan", delayDays: 15, body: "Hi {{customerName}},\n\nThe best way to always have a clean home? Schedule it so you never have to think about it!\n\nSet up a recurring cleaning plan with us this January and enjoy a fresh home all year long.\n\nChoose your plan here:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" },
      ],
    },
    {
      id: "seq-referral-request",
      name: "Referral Request Campaign",
      description: "Ask your happiest clients to refer friends and family to grow your business.",
      category: "Growth",
      icon: "users",
      color: "emerald",
      steps: [
        { subject: "Love your clean home? Share the love!", delayDays: 0, body: "Hi {{customerName}},\n\nWe hope you're loving your clean home! We've truly enjoyed working with you.\n\nIf you know anyone who could use a great cleaning service, we'd love a referral. Word of mouth means everything to a small business like ours.\n\nYou can share our booking link with them:\n{{bookingLink}}\n\nThank you so much for your continued support!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Know anyone who needs a cleaner? We appreciate your referrals!", delayDays: 10, body: "Hi {{customerName}},\n\nJust a friendly follow-up! If you have friends, family, or neighbors who are looking for a reliable cleaning service, we'd really appreciate you passing along our name.\n\nThey can book here:\n{{bookingLink}}\n\nThank you for being such a valued client!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "One last ask — do you know someone who needs a cleaner?", delayDays: 20, body: "Hi {{customerName}},\n\nWe truly value your business and your trust in us. If you've been happy with our service, the biggest compliment you can give us is referring a friend or neighbor.\n\nShare this link with anyone who might benefit:\n{{bookingLink}}\n\nThank you for helping us grow!\n\n{{senderName}}\n{{businessName}}" },
      ],
    },
    {
      id: "seq-summer-refresh",
      name: "Summer Refresh",
      description: "Seasonal campaign for summer cleaning to target clients before vacation season ends.",
      category: "Seasonal",
      icon: "droplet",
      color: "sky",
      steps: [
        { subject: "Beat the summer heat with a clean, fresh home", delayDays: 0, body: "Hi {{customerName}},\n\nSummer is in full swing — which means more foot traffic, open windows, and all the dust and pollen that comes with it!\n\nOur Summer Refresh clean helps you maintain a cool, clean home all season long.\n\nBook your summer refresh:\n{{bookingLink}}\n\nStay cool and enjoy the season!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Summer's almost over — get a clean-up before fall hits", delayDays: 14, body: "Hi {{customerName}},\n\nSummer is winding down, and it's a great time for a thorough clean before the fall season begins.\n\nGet ahead of it now while our schedule still has availability:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" },
        { subject: "End of summer clean — ready to book?", delayDays: 21, body: "Hi {{customerName}},\n\nAs summer comes to a close, treat yourself to a beautifully clean home before the busy fall season kicks off.\n\nBook your end-of-summer clean here:\n{{bookingLink}}\n\nThank you for your business!\n\n{{senderName}}\n{{businessName}}" },
      ],
    },
    {
      id: "seq-move-in-out",
      name: "Move-In / Move-Out Clean",
      description: "Target clients who are moving with a specialized move clean promotion.",
      category: "Promotion",
      icon: "home",
      color: "teal",
      steps: [
        { subject: "Moving soon? We handle the cleaning so you don't have to", delayDays: 0, body: "Hi {{customerName}},\n\nMoving is stressful enough without worrying about cleaning!\n\nOur Move-In / Move-Out cleaning service ensures your old home is spotless for the next occupants and your new home is fresh and ready for you.\n\nWe handle all the deep work — inside cabinets, appliances, closets, and every corner.\n\nBook your move clean:\n{{bookingLink}}\n\nWishing you a smooth move!\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Need a move-out clean? We've got the details covered", delayDays: 5, body: "Hi {{customerName}},\n\nA thorough move-out clean is often required by landlords to get your full deposit back — and we make sure everything meets that standard.\n\nOur team covers every corner so you can focus on your next chapter.\n\nBook now:\n{{bookingLink}}\n\n{{senderName}}\n{{businessName}}" },
        { subject: "Settled into your new home? Let us give it a fresh start", delayDays: 12, body: "Hi {{customerName}},\n\nHope the move went smoothly! Now that you're settling in, a professional move-in clean is a great way to start fresh in your new space.\n\nWe'd love to be your go-to cleaner in your new home!\n\nBook here:\n{{bookingLink}}\n\nWelcome to your new home!\n\n{{senderName}}\n{{businessName}}" },
      ],
    },
  ];

// ─── generateRecurringJobs ────────────────────────────────────────────────────

// ─── Win/Loss Follow-ups ─────────────────────────────────────────────────────
// Sends automated feedback requests to customers whose quotes expired or went cold
export async function sendWinLossFollowUps(): Promise<void> {
  try {
    const appUrl =
      process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : process.env.APP_URL || "https://app.getquotepro.ai";

    // Find quotes that are expired or sent and cold (2+ days past expiry)
    // with a customer email that haven't yet had a win/loss follow-up
    const result = await pool.query<{
      quote_id: string;
      customer_name: string;
      customer_email: string;
      business_id: string;
      business_name: string;
      business_from_name: string;
      business_from_email: string;
      quote_total: number;
    }>(`
      SELECT
        q.id               AS quote_id,
        TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) AS customer_name,
        c.email            AS customer_email,
        b.id               AS business_id,
        b.company_name     AS business_name,
        COALESCE(b.email_from_name, b.company_name, 'Your Cleaning Company') AS business_from_name,
        COALESCE(b.email_from_address, b.email, $1)                  AS business_from_email,
        q.total            AS quote_total
      FROM quotes q
      JOIN customers   c ON c.id = q.customer_id
      JOIN businesses  b ON b.id = q.business_id
      WHERE
        c.email IS NOT NULL AND c.email <> ''
        AND q.deleted_at IS NULL
        AND (
          q.status = 'expired'
          OR (q.status = 'sent' AND q.expires_at < NOW() - INTERVAL '2 days')
        )
        AND NOT EXISTS (
          SELECT 1 FROM win_loss_responses wlr
          WHERE wlr.quote_id = q.id
        )
      ORDER BY q.created_at ASC
      LIMIT 20
    `, [PLATFORM_FROM_EMAIL]);

    for (const row of result.rows) {
      const token = crypto.randomUUID();
      try {
        await pool.query(
          `INSERT INTO win_loss_responses
            (quote_id, business_id, customer_email, response_token, reason_category, follow_up_sent_at)
           VALUES ($1, $2, $3, $4, 'no_response_yet', NOW())`,
          [row.quote_id, row.business_id, row.customer_email, token],
        );

        const firstName = (row.customer_name || "there").split(" ")[0];
        const feedbackUrl = `${appUrl}/feedback/${token}`;
        const businessName = row.business_name || "Your cleaning company";

        const html = `
<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <tr><td style="background:#1e293b;padding:28px 32px">
          <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px">${businessName}</p>
        </td></tr>
        <tr><td style="padding:36px 32px 28px">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3">
            Did you find what you were looking for?
          </h1>
          <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6">
            Hi ${firstName}, we sent you a cleaning quote recently and wanted to check in. Did you end up booking with someone?
          </p>
          <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6">
            Your feedback helps us improve our service and pricing. It takes 10 seconds.
          </p>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${feedbackUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;padding:13px 28px;border-radius:8px;text-decoration:none">
              Share Quick Feedback
            </a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f1f5f9">
          <p style="margin:0;font-size:12px;color:#94a3b8">
            ${businessName} &mdash; Residential cleaning services
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

        await sendEmail({
          to: row.customer_email,
          subject: "Did you find what you were looking for?",
          html,
          text: `Hi ${firstName},\n\nWe sent you a cleaning quote recently and wanted to check in. Did you end up booking with someone?\n\nYour feedback helps us improve. It takes 10 seconds:\n${feedbackUrl}\n\n${businessName}`,
          fromName: row.business_from_name,
        });

        console.log(`[win-loss] Follow-up sent to ${row.customer_email} for quote ${row.quote_id}`);
      } catch (innerErr: any) {
        console.error(`[win-loss] Failed to send follow-up for quote ${row.quote_id}:`, innerErr.message);
      }
    }

    if (result.rows.length > 0) {
      console.log(`[win-loss] Sent ${result.rows.length} win/loss follow-up(s)`);
    }
  } catch (err: any) {
    console.error("[win-loss] sendWinLossFollowUps failed:", err.message);
  }
}

export async function generateRecurringJobs(): Promise<void> {
  try {
    // Fetch all active series with auto_charge info
    const { rows: activeSeries } = await pool.query<{
      id: string;
      business_id: string;
      auto_charge: boolean;
      stripe_payment_method_id: string | null;
      default_price: number | null;
      customer_id: string | null;
      stripe_account_id: string | null;
      stripe_onboarding_complete: boolean;
    }>(`
      SELECT rcs.id, rcs.business_id, rcs.auto_charge, rcs.stripe_payment_method_id,
             rcs.default_price, rcs.customer_id,
             b.stripe_account_id, b.stripe_onboarding_complete
      FROM recurring_clean_series rcs
      JOIN businesses b ON b.id = rcs.business_id
      WHERE rcs.status = 'active'
    `);

    if (!activeSeries.length) return;

    const { getStripe } = await import("./clients");
    const stripe = getStripe();

    for (const series of activeSeries) {
      try {
        // Generate jobs for the next 7 days (incremental — won't duplicate)
        await generateSeriesJobs(series.id, 7);

        // Auto-charge: find newly-created unpaid jobs within the next 7 days
        if (series.auto_charge && series.stripe_payment_method_id && stripe
            && series.stripe_account_id && series.stripe_onboarding_complete) {
          const amountCents = series.default_price ? Math.round(series.default_price * 100) : 0;
          if (amountCents <= 0) continue;

          const { rows: pendingJobs } = await pool.query<{
            id: string;
            start_datetime: Date;
          }>(`
            SELECT id, start_datetime
            FROM jobs
            WHERE series_id     = $1
              AND start_datetime >= NOW()
              AND start_datetime <  NOW() + INTERVAL '7 days'
              AND (total IS NULL OR total = 0)
              AND status        != 'cancelled'
              AND skipped       = false
            ORDER BY start_datetime ASC
            LIMIT 5
          `, [series.id]);

          for (const job of pendingJobs) {
            try {
              const intent = await stripe.paymentIntents.create({
                amount: amountCents,
                currency: "usd",
                customer: undefined,
                payment_method: series.stripe_payment_method_id,
                confirm: true,
                automatic_payment_methods: { enabled: false },
                metadata: { jobId: job.id, seriesId: series.id },
              }, { stripeAccount: series.stripe_account_id });

              if (intent.status === "succeeded") {
                await pool.query(
                  `UPDATE jobs SET total = $1, updated_at = NOW() WHERE id = $2`,
                  [series.default_price, job.id]
                );
                // Look up the business owner for analytics
                const { rows: bizRows } = await pool.query(
                  `SELECT owner_user_id FROM businesses WHERE id = $1`,
                  [series.business_id]
                );
                const userId = bizRows[0]?.owner_user_id;
                if (userId) {
                  trackEvent(userId, "RECURRING_AUTO_CHARGE_SUCCESS" as any, {
                    jobId: job.id, amount: amountCents,
                  }).catch(() => {});
                }
                console.log(`[recurring] Auto-charged $${series.default_price} for job ${job.id}`);
              }
            } catch (chargeErr: any) {
              console.error(`[recurring] Auto-charge failed for job ${job.id}:`, chargeErr.message);

              // Increment failure count and record failure timestamp on the series
              const { rows: updatedSeries } = await pool.query<{ charge_failure_count: number }>(
                `UPDATE recurring_clean_series
                 SET charge_failure_count  = COALESCE(charge_failure_count, 0) + 1,
                     last_charge_failed_at = NOW(),
                     updated_at            = NOW()
                 WHERE id = $1
                 RETURNING charge_failure_count`,
                [series.id]
              );
              const newFailureCount = updatedSeries[0]?.charge_failure_count ?? 1;

              // After 3 failures → pause auto-charge on this series
              if (newFailureCount >= 3) {
                await pool.query(
                  `UPDATE recurring_clean_series
                   SET auto_charge = false, charge_paused_at = NOW(), updated_at = NOW()
                   WHERE id = $1`,
                  [series.id]
                );
                console.log(`[dunning] Series ${series.id} paused after ${newFailureCount} charge failures`);
              }

              // Look up business owner and customer for failure notifications
              const { rows: bizRows } = await pool.query(
                `SELECT owner_user_id, company_name, email FROM businesses WHERE id = $1`,
                [series.business_id]
              );
              const biz = bizRows[0];

              // Email the customer about the failed payment
              if (series.customer_id) {
                const { rows: custRows } = await pool.query<{ email: string; first_name: string }>(
                  `SELECT email, first_name FROM customers WHERE id = $1`,
                  [series.customer_id]
                );
                const cust = custRows[0];
                if (cust?.email) {
                  const attemptNum = newFailureCount;
                  const isPaused = newFailureCount >= 3;
                  const custSubject = isPaused
                    ? `Your recurring cleaning service has been paused — payment issue`
                    : `Action needed: payment issue for your recurring clean (attempt ${attemptNum})`;
                  const custBody = isPaused
                    ? `<p>Hi ${cust.first_name || "there"},</p><p>We were unable to charge your card for your recurring cleaning service after ${newFailureCount} attempts. Your auto-charge has been <strong>paused</strong>. Please contact ${biz?.company_name || "your cleaning company"} to update your payment details and resume service.</p>`
                    : `<p>Hi ${cust.first_name || "there"},</p><p>We had trouble charging your card for your scheduled cleaning on <strong>${new Date(job.start_datetime).toLocaleDateString()}</strong>. We'll try again automatically. If you'd like to update your payment method, please contact ${biz?.company_name || "your cleaning company"}.</p>`;
                  sendEmail({
                    to: cust.email,
                    subject: custSubject,
                    html: custBody,
                    text: custBody.replace(/<[^>]+>/g, ""),
                    fromName: biz?.company_name || PLATFORM_FROM_NAME,
                  }).catch(() => {});
                }
              }

              if (biz?.owner_user_id) {
                trackEvent(biz.owner_user_id, "RECURRING_AUTO_CHARGE_FAILED" as any, {
                  jobId: job.id, error: chargeErr.message, failureCount: newFailureCount,
                }).catch(() => {});

                // Notify business owner — escalate message when paused
                const ownerUser = await getUserById(biz.owner_user_id);
                if (ownerUser?.email) {
                  const isPaused = newFailureCount >= 3;
                  await sendEmail({
                    to: ownerUser.email,
                    subject: isPaused
                      ? "Auto-charge paused after 3 failed attempts — action required"
                      : `Auto-charge failed for a recurring job (attempt ${newFailureCount})`,
                    html: isPaused
                      ? `<p>Hi,</p><p>Auto-charge for a recurring cleaning job has been <strong>paused after 3 failed payment attempts</strong>. Please contact the client to collect payment and update their card on file.</p><p>Job date: ${new Date(job.start_datetime).toLocaleDateString()}</p><p>The QuotePro Team</p>`
                      : `<p>Hi,</p><p>We were unable to automatically charge for a recurring job scheduled on <strong>${new Date(job.start_datetime).toLocaleDateString()}</strong> (attempt ${newFailureCount} of 3). We will retry automatically. Please verify the client's payment method in QuotePro.</p><p>The QuotePro Team</p>`,
                    text: `Recurring job auto-charge failed (attempt ${newFailureCount}) for ${new Date(job.start_datetime).toLocaleDateString()}.`,
                    fromName: PLATFORM_FROM_NAME,
                  }).catch(() => {});
                }
              }
            }
          }
        }
      } catch (seriesErr: any) {
        console.error(`[recurring] Error processing series ${series.id}:`, seriesErr.message);
      }
    }
  } catch (e: any) {
    console.error("[recurring] generateRecurringJobs failed:", e.message);
  }
}

// ─── sendActivationNudges ────────────────────────────────────────────────────

/**
 * 72-hour activation nudge pipeline.
 * Runs hourly. For users who have NOT yet sent their first quote:
 *   - 24 h after signup → email
 *   - 48 h after signup → SMS (if phone on file and not opted out)
 *   - 70 h after signup → email + push notification
 * Capped at one nudge type per user per run.
 * Stops sending once `first_quote_sent_at` is set.
 */
export async function sendActivationNudges(): Promise<void> {
  try {
    const { rows } = await pool.query<{
      id: string;
      email: string;
      name: string | null;
      activation_nudge_24h_sent: boolean;
      activation_nudge_48h_sent: boolean;
      activation_nudge_70h_sent: boolean;
      sms_opted_out: boolean;
      trial_drip_unsubscribed: boolean;
      email_unreachable: boolean;
      phone: string | null;
      created_at: Date;
    }>(`
      SELECT
        u.id,
        u.email,
        u.name,
        u.activation_nudge_24h_sent,
        u.activation_nudge_48h_sent,
        u.activation_nudge_70h_sent,
        u.sms_opted_out,
        u.trial_drip_unsubscribed,
        u.email_unreachable,
        b.phone,
        u.created_at
      FROM users u
      LEFT JOIN businesses b ON b.owner_user_id = u.id
      WHERE u.first_quote_sent_at IS NULL
        AND u.created_at >= NOW() - INTERVAL '72 hours'
        AND u.created_at <= NOW() - INTERVAL '24 hours'
        AND u.subscription_tier != 'free'
        AND u.email IS NOT NULL
    `);

    if (!rows.length) return;

    const appUrl = BASE_APP_URL;

    for (const user of rows) {
      try {
        const ageMs  = Date.now() - new Date(user.created_at).getTime();
        const ageH   = ageMs / (1_000 * 60 * 60);
        const firstName = (user.name || "there").split(" ")[0];

        // ── 24 h — Email ──────────────────────────────────────────────────────
        if (ageH >= 24 && !user.activation_nudge_24h_sent) {
          if (!user.email_unreachable && !user.trial_drip_unsubscribed) {
            const html = `
<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <tr><td style="background:#1a1a2e;padding:28px 32px">
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px">QuotePro</p>
        </td></tr>
        <tr><td style="padding:36px 32px 28px">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3">
            ${firstName}, your first quote takes 60 seconds
          </h1>
          <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6">
            You signed up for QuotePro yesterday. Cleaning companies that send their first quote within 24 hours are <strong>3× more likely to close</strong> their first job.
          </p>
          <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6">
            It takes under a minute — type an address, pick your room count, and tap Send.
          </p>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${appUrl}/quotes/new" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;padding:13px 28px;border-radius:8px;text-decoration:none">
              Send my first quote
            </a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f1f5f9">
          <p style="margin:0;font-size:12px;color:#94a3b8">
            QuotePro &mdash; Built for residential cleaning pros.<br>
            <a href="${appUrl}/settings" style="color:#94a3b8">Unsubscribe from these tips</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

            await sendEmail({
              to: user.email,
              subject: `${firstName}, your first quote takes 60 seconds`,
              html,
              text: `Hi ${firstName},\n\nYou signed up for QuotePro yesterday. Cleaning companies that send their first quote within 24 hours are 3x more likely to close their first job.\n\nIt takes under a minute — open the app, type an address, pick your room count, and tap Send.\n\n${appUrl}/quotes/new\n\nThe QuotePro Team`,
              fromName: PLATFORM_FROM_NAME,
            });
          }

          await pool.query(
            `UPDATE users SET activation_nudge_24h_sent = true WHERE id = $1`,
            [user.id],
          );
          trackEvent(user.id, AnalyticsEvents.ACTIVATION_NUDGE_24H_SENT, { channel: "email" }).catch(() => {});
          continue; // one nudge per user per run
        }

        // ── 48 h — (SMS removed — channel was Twilio, now skipped) ──────────
        if (ageH >= 48 && !user.activation_nudge_48h_sent) {
          await pool.query(
            `UPDATE users SET activation_nudge_48h_sent = true WHERE id = $1`,
            [user.id],
          );
          trackEvent(user.id, AnalyticsEvents.ACTIVATION_NUDGE_48H_SENT, { channel: "none" }).catch(() => {});
          continue; // one nudge per user per run
        }

        // ── 70 h — Email + Push ───────────────────────────────────────────────
        if (ageH >= 70 && !user.activation_nudge_70h_sent) {
          if (!user.email_unreachable && !user.trial_drip_unsubscribed) {
            const html = `
<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <tr><td style="background:#1a1a2e;padding:28px 32px">
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px">QuotePro</p>
        </td></tr>
        <tr><td style="padding:36px 32px 28px">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#dc2626;line-height:1.3">
            ${firstName}, 2 hours left in your activation window
          </h1>
          <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6">
            Your 72-hour activation window closes soon. Users who send at least one quote in the first 72 hours are <strong>5× more likely to become paying customers</strong>.
          </p>
          <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6">
            Don't let this one slip. It takes less than 60 seconds to send your first quote.
          </p>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${appUrl}/quotes/new" style="display:inline-block;background:#dc2626;color:#ffffff;font-size:15px;font-weight:600;padding:13px 28px;border-radius:8px;text-decoration:none">
              Send my first quote now
            </a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f1f5f9">
          <p style="margin:0;font-size:12px;color:#94a3b8">
            QuotePro &mdash; Built for residential cleaning pros.<br>
            <a href="${appUrl}/settings" style="color:#94a3b8">Unsubscribe from these tips</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

            await sendEmail({
              to: user.email,
              subject: `${firstName}, 2 hours left in your activation window`,
              html,
              text: `Hi ${firstName},\n\nYour 72-hour activation window closes soon. Users who send at least one quote in the first 72 hours are 5x more likely to become paying customers.\n\nDon't let this one slip. It takes less than 60 seconds.\n\n${appUrl}/quotes/new\n\nThe QuotePro Team`,
              fromName: PLATFORM_FROM_NAME,
            });
          }

          // Push notification (best-effort)
          await sendPush(user.id, {
            title: "2 hours left in your activation window",
            body: "Send one quote before your 72-hour window closes — it takes 60 seconds.",
            data: { screen: "QuoteCalculator" },
            channel: "growth",
          });

          await pool.query(
            `UPDATE users SET activation_nudge_70h_sent = true WHERE id = $1`,
            [user.id],
          );
          trackEvent(user.id, AnalyticsEvents.ACTIVATION_NUDGE_70H_SENT, { channel: "email_push" }).catch(() => {});
        }
      } catch (e: any) {
        console.error(`[activation-nudge] Error for user ${user.id}:`, e.message);
      }
    }
  } catch (e: any) {
    console.error("[activation-nudge] sendActivationNudges failed:", e.message);
  }
}
