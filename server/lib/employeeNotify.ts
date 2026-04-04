import { db } from "../db";
import { businesses, users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "../mail";

interface CheckinParams {
  businessId: string;
  employeeName: string;
  customerName: string;
  address: string;
  time: Date;
}

interface CheckoutParams {
  businessId: string;
  employeeName: string;
  customerName: string;
  address: string;
  durationMinutes: number | null;
  time: Date;
}

async function getOwnerEmail(businessId: string): Promise<string | null> {
  try {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
    if (!business) return null;
    const [user] = await db.select().from(users).where(eq(users.id, business.ownerUserId)).limit(1);
    return user?.email ?? null;
  } catch {
    return null;
  }
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDuration(mins: number | null): string {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export async function sendCheckinEmail(params: CheckinParams): Promise<void> {
  const ownerEmail = await getOwnerEmail(params.businessId);
  if (!ownerEmail) return;

  await sendEmail({
    to: ownerEmail,
    subject: `${params.employeeName} checked in at ${params.customerName} — ${formatTime(params.time)}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#0F6E56;margin:0 0 16px">Employee Checked In</h2>
        <p style="margin:0 0 8px"><strong>${params.employeeName}</strong> has arrived at the job site.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <tr><td style="padding:8px 0;color:#666">Customer</td><td style="padding:8px 0;font-weight:600">${params.customerName}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Address</td><td style="padding:8px 0">${params.address}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Check-in time</td><td style="padding:8px 0">${formatTime(params.time)}</td></tr>
        </table>
      </div>
    `,
  });
}

export async function sendCheckoutEmail(params: CheckoutParams): Promise<void> {
  const ownerEmail = await getOwnerEmail(params.businessId);
  if (!ownerEmail) return;

  await sendEmail({
    to: ownerEmail,
    subject: `${params.employeeName} completed ${params.customerName} — ${formatDuration(params.durationMinutes)} job`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1D9E75;margin:0 0 16px">Job Completed</h2>
        <p style="margin:0 0 8px"><strong>${params.employeeName}</strong> has completed the job.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <tr><td style="padding:8px 0;color:#666">Customer</td><td style="padding:8px 0;font-weight:600">${params.customerName}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Address</td><td style="padding:8px 0">${params.address}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Completed at</td><td style="padding:8px 0">${formatTime(params.time)}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Duration</td><td style="padding:8px 0;font-weight:600">${formatDuration(params.durationMinutes)}</td></tr>
        </table>
      </div>
    `,
  });
}
