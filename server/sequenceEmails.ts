/**
 * sequenceEmails.ts — auto-scheduler for customer email sequences.
 *
 * Handles:
 *   - Sending step 0 immediately after enrollment (called inline from the router)
 *   - Cron-driven sending of subsequent steps based on each step's delayDays
 */

import { db } from "./db";
import { sequenceEnrollments, businesses } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail, getBusinessSendParams } from "./mail";
import { BUILT_IN_SEQUENCES } from "./helpers";

// ─── Core send-step helper ────────────────────────────────────────────────────

export async function sendSequenceStep(enrollmentId: string): Promise<{ sent: boolean; reason?: string }> {
  const [enrollment] = await db
    .select()
    .from(sequenceEnrollments)
    .where(eq(sequenceEnrollments.id, enrollmentId));

  if (!enrollment) return { sent: false, reason: "enrollment_not_found" };
  if (enrollment.status !== "active") return { sent: false, reason: "not_active" };

  const seq = BUILT_IN_SEQUENCES.find((s: any) => s.id === enrollment.sequenceId);
  if (!seq) return { sent: false, reason: "sequence_not_found" };

  const stepIndex = enrollment.currentStep;
  if (stepIndex >= seq.steps.length) {
    await db.update(sequenceEnrollments)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(sequenceEnrollments.id, enrollmentId));
    return { sent: false, reason: "all_steps_done" };
  }

  const step = seq.steps[stepIndex];

  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, enrollment.businessId));

  if (!business) return { sent: false, reason: "business_not_found" };

  const bookingLink = business.bookingLink || "";
  const senderName = business.senderName || business.companyName || "Your Cleaning Team";
  const businessName = business.companyName || "Your Cleaning Company";
  const { fromName, replyTo } = getBusinessSendParams(business);

  const replacePlaceholders = (text: string) =>
    text
      .replace(/\{\{customerName\}\}/g, enrollment.customerName)
      .replace(/\{\{businessName\}\}/g, businessName)
      .replace(/\{\{senderName\}\}/g, senderName)
      .replace(/\{\{bookingLink\}\}/g, bookingLink);

  const subject = replacePlaceholders(step.subject);
  const bodyText = replacePlaceholders(step.body);
  const htmlBody = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;line-height:1.6;">${bodyText.replace(/\n/g, "<br>")}</div>`;

  try {
    await sendEmail({ to: enrollment.customerEmail, subject, html: htmlBody, text: bodyText, fromName, replyTo });
  } catch (mailErr: any) {
    console.error("[sequenceEmails] Send failed for enrollment", enrollmentId, "step", stepIndex, mailErr?.message);
    return { sent: false, reason: "mail_error" };
  }

  const completedSteps = Array.isArray(enrollment.stepsCompleted) ? enrollment.stepsCompleted : [];
  const newCompleted = [...completedSteps, { stepIndex, sentAt: new Date().toISOString(), subject }];
  const newStep = stepIndex + 1;
  const isCompleted = newStep >= seq.steps.length;

  await db.update(sequenceEnrollments)
    .set({
      currentStep: newStep,
      stepsCompleted: newCompleted,
      lastSentAt: new Date(),
      status: isCompleted ? "completed" : "active",
      completedAt: isCompleted ? new Date() : null,
    })
    .where(eq(sequenceEnrollments.id, enrollmentId));

  console.log(`[sequenceEmails] Sent step ${stepIndex} of "${seq.name}" to ${enrollment.customerEmail}`);
  return { sent: true };
}

// ─── Queue processor — called by cron every hour ──────────────────────────────

export async function processSequenceQueue(): Promise<void> {
  const now = new Date();

  const active = await db
    .select()
    .from(sequenceEnrollments)
    .where(eq(sequenceEnrollments.status, "active"));

  let sent = 0;
  let skipped = 0;

  for (const enrollment of active) {
    const seq = BUILT_IN_SEQUENCES.find((s: any) => s.id === enrollment.sequenceId);
    if (!seq) continue;

    const stepIndex = enrollment.currentStep;
    if (stepIndex >= seq.steps.length) continue;

    const step = seq.steps[stepIndex];
    const delayDays: number = typeof step.delayDays === "number" ? step.delayDays : 0;

    // Step 0 with delayDays:0 is handled at enrollment time; skip here if never sent
    if (stepIndex === 0 && !enrollment.lastSentAt) {
      // Not yet sent — might be brand new; auto-send it
      const result = await sendSequenceStep(enrollment.id);
      if (result.sent) sent++;
      continue;
    }

    if (!enrollment.lastSentAt) {
      skipped++;
      continue;
    }

    const dueAt = new Date(enrollment.lastSentAt.getTime() + delayDays * 24 * 60 * 60 * 1000);
    if (now >= dueAt) {
      const result = await sendSequenceStep(enrollment.id);
      if (result.sent) sent++;
    } else {
      skipped++;
    }
  }

  if (sent > 0 || active.length > 0) {
    console.log(`[sequenceEmails] Queue: ${sent} sent, ${skipped} pending, ${active.length} total active`);
  }
}
