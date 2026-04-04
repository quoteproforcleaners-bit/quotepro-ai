import { db } from "../db";
import { businesses, users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { sendEmail, PLATFORM_FROM_NAME } from "../mail";

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

async function getBusinessName(businessId: string): Promise<string> {
  try {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
    return (business as any)?.companyName || PLATFORM_FROM_NAME;
  } catch {
    return PLATFORM_FROM_NAME;
  }
}

// ─── Employee invite emails ────────────────────────────────────────────────────

interface EmployeeInviteParams {
  businessId: string;
  employeeName: string;
  employeeEmail: string;
  pin: string;
  portalUrl: string;
}

/** Sent when admin creates a new employee — includes PIN so they can log in immediately. */
export async function sendEmployeeWelcomeEmail(params: EmployeeInviteParams): Promise<void> {
  const companyName = await getBusinessName(params.businessId);

  await sendEmail({
    to: params.employeeEmail,
    subject: `You've been invited to the ${companyName} team on QuotePro`,
    html: `
      <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#ffffff">
        <div style="margin-bottom:28px">
          <span style="font-size:22px;font-weight:700;color:#0F6E56">QuotePro</span>
          <span style="font-size:13px;color:#888780;margin-left:6px">Employee Portal</span>
        </div>

        <h2 style="font-size:22px;font-weight:700;color:#1a1a18;margin:0 0 10px">
          Welcome to the team, ${params.employeeName}!
        </h2>
        <p style="font-size:15px;color:#444441;margin:0 0 28px;line-height:1.6">
          <strong>${companyName}</strong> has added you to QuotePro — the app you'll use to view your job schedule, check in and check out of jobs, and stay in sync with your team.
        </p>

        <!-- Login credentials -->
        <div style="background:#F8F8F6;border:1.5px solid #E8E6DF;border-radius:14px;padding:20px 24px;margin-bottom:24px">
          <p style="font-size:12px;font-weight:700;color:#888780;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 14px">Your Login Credentials</p>
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#888780;width:90px">Email</td>
              <td style="padding:6px 0;font-size:15px;font-weight:600;color:#1a1a18;font-family:monospace">${params.employeeEmail}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#888780">PIN</td>
              <td style="padding:6px 0;font-size:24px;font-weight:700;color:#0F6E56;font-family:monospace;letter-spacing:4px">${params.pin}</td>
            </tr>
          </table>
        </div>

        <!-- CTA button -->
        <a href="${params.portalUrl}"
           style="display:block;background:#0F6E56;color:#ffffff;text-decoration:none;text-align:center;padding:16px;border-radius:12px;font-size:16px;font-weight:700;margin-bottom:24px">
          Open Employee Portal →
        </a>

        <!-- How it works -->
        <div style="border-top:1px solid #E8E6DF;padding-top:20px;margin-top:4px">
          <p style="font-size:13px;font-weight:700;color:#888780;margin:0 0 12px">How it works</p>
          <ol style="padding-left:18px;margin:0;font-size:14px;color:#444441;line-height:2">
            <li>Open the portal link above on your phone</li>
            <li>Enter your email and tap Continue</li>
            <li>Enter your 6-digit PIN to log in</li>
            <li>View today's jobs and check in when you arrive</li>
          </ol>
        </div>

        <p style="font-size:12px;color:#888780;margin-top:28px;line-height:1.5">
          Keep this email safe — it contains your PIN. If you need to change your PIN, ask your manager. This invite was sent by ${companyName} via QuotePro.
        </p>
      </div>
    `,
    text: `Welcome to the ${companyName} team on QuotePro!\n\nEmail: ${params.employeeEmail}\nPIN: ${params.pin}\n\nPortal: ${params.portalUrl}`,
  });
}

/** Resend portal access — no PIN included (it's hashed). Employee needs to ask manager for PIN. */
export async function sendEmployeePortalReminderEmail(params: Omit<EmployeeInviteParams, "pin">): Promise<void> {
  const companyName = await getBusinessName(params.businessId);

  await sendEmail({
    to: params.employeeEmail,
    subject: `Your QuotePro Employee Portal access — ${companyName}`,
    html: `
      <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#ffffff">
        <div style="margin-bottom:28px">
          <span style="font-size:22px;font-weight:700;color:#0F6E56">QuotePro</span>
          <span style="font-size:13px;color:#888780;margin-left:6px">Employee Portal</span>
        </div>

        <h2 style="font-size:22px;font-weight:700;color:#1a1a18;margin:0 0 10px">
          Your portal access, ${params.employeeName}
        </h2>
        <p style="font-size:15px;color:#444441;margin:0 0 28px;line-height:1.6">
          Here's the link to the <strong>${companyName}</strong> employee portal. Use your email and the PIN your manager gave you to sign in.
        </p>

        <div style="background:#F8F8F6;border:1.5px solid #E8E6DF;border-radius:14px;padding:20px 24px;margin-bottom:24px">
          <p style="font-size:12px;font-weight:700;color:#888780;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 14px">Your Login Details</p>
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#888780;width:90px">Email</td>
              <td style="padding:6px 0;font-size:15px;font-weight:600;color:#1a1a18;font-family:monospace">${params.employeeEmail}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#888780">PIN</td>
              <td style="padding:6px 0;font-size:14px;color:#888780;font-style:italic">Ask your manager</td>
            </tr>
          </table>
        </div>

        <a href="${params.portalUrl}"
           style="display:block;background:#0F6E56;color:#ffffff;text-decoration:none;text-align:center;padding:16px;border-radius:12px;font-size:16px;font-weight:700;margin-bottom:24px">
          Open Employee Portal →
        </a>

        <p style="font-size:12px;color:#888780;margin-top:8px;line-height:1.5">
          This reminder was sent by ${companyName} via QuotePro.
        </p>
      </div>
    `,
    text: `Your QuotePro Employee Portal\n\nEmail: ${params.employeeEmail}\nPortal: ${params.portalUrl}\n\nAsk your manager for your PIN.`,
  });
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
