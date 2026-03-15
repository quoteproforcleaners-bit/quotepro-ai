import { Request, Response } from "express";
import { parseLinqWebhookEvent, verifyLinqWebhookSignature, sendLinqMessage } from "./client";
import { orchestrate } from "./assistant-orchestrator";
import {
  getOrCreateConversationThread,
  addConversationMessage,
  listConversationMessages,
  getActiveIntakeSession,
  createOrUpdateIntakeSession,
  completeIntakeSession,
  getAiQuoteAssistantSettings,
  updateThreadState,
  updateThreadHandoffStatus,
  getLinqAccountByBusinessId,
  getLinqPrimaryNumber,
  getBusinessById,
} from "../../storage";
import type { ConversationState } from "./types";
import type { IntakeSession } from "./intake";
import { calculateCompletionScore } from "./intake";

export async function handleLinqWebhook(req: Request, res: Response) {
  try {
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    const signature = (req.headers["x-linq-signature"] || req.headers["x-hub-signature-256"] || "") as string;

    if (signature && !verifyLinqWebhookSignature(rawBody, signature)) {
      console.warn("[linq webhook] Invalid signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const event = parseLinqWebhookEvent(req.body);
    if (!event) {
      return res.status(200).json({ ok: true, skipped: true });
    }

    console.log(`[linq webhook] inbound from=${event.from} to=${event.to} body="${event.body.slice(0, 60)}"`);

    const businessPhone = await findBusinessByPhoneNumber(event.to);
    if (!businessPhone) {
      console.warn(`[linq webhook] No business found for phone ${event.to}`);
      return res.status(200).json({ ok: true, skipped: "no_business" });
    }

    const { businessId } = businessPhone;

    const thread = await getOrCreateConversationThread(businessId, event.from, "sms", {
      externalThreadId: event.conversationId,
      customerName: undefined,
    });

    await addConversationMessage({
      threadId: thread.id,
      direction: "inbound",
      provider: "linq",
      externalMessageId: event.messageId,
      sender: event.from,
      recipient: event.to,
      body: event.body,
      rawPayload: event.raw,
    });

    const settings = await getAiQuoteAssistantSettings(businessId);
    const business = await getBusinessById(businessId);
    const businessName = business?.companyName || "Our Business";

    const messages = await listConversationMessages(thread.id, businessId, 10);
    const history = messages
      .slice()
      .reverse()
      .map((m) => ({
        role: (m.direction === "inbound" ? "user" : "assistant") as "user" | "assistant",
        content: m.body,
      }));

    const intakeRow = await getActiveIntakeSession(thread.id);
    const intake: IntakeSession = {
      serviceType: intakeRow?.serviceType ?? undefined,
      zipCode: intakeRow?.zipCode ?? undefined,
      city: intakeRow?.city ?? undefined,
      squareFootage: intakeRow?.squareFootage ?? undefined,
      bedrooms: intakeRow?.bedrooms ?? undefined,
      bathrooms: intakeRow?.bathrooms ?? undefined,
      pets: intakeRow?.pets ?? undefined,
      lastCleaned: intakeRow?.lastCleaned ?? undefined,
      frequency: intakeRow?.frequency ?? undefined,
      preferredDate: intakeRow?.preferredDate ?? undefined,
      notes: intakeRow?.notes ?? undefined,
    };

    const linqAccount = await getLinqAccountByBusinessId(businessId);
    const primaryNumber = await getLinqPrimaryNumber(businessId);

    const result = await orchestrate({
      message: event.body,
      thread: {
        id: thread.id,
        businessId,
        currentState: (thread.currentState || "idle") as ConversationState,
        aiStatus: thread.aiStatus || "active",
        handoffStatus: thread.handoffStatus || "ai",
      },
      intake,
      history,
      settings: settings || null,
      businessName,
      businessPhone: event.to,
    });

    if (result.intakeSaved) {
      const newIntake = extractIntakeUpdatesFromMessage(event.body, intake);
      const score = calculateCompletionScore({ ...intake, ...newIntake });
      await createOrUpdateIntakeSession(thread.id, businessId, {
        ...intake,
        ...newIntake,
        completionScore: score,
      });
      if (result.quoteCreated) {
        await completeIntakeSession(thread.id);
      }
    }

    if (result.handoffTriggered) {
      await updateThreadHandoffStatus(thread.id, businessId, "human");
    }

    if (result.updatedState && result.updatedState !== thread.currentState) {
      await updateThreadState(thread.id, businessId, result.updatedState);
    }

    if (result.reply) {
      await sendLinqMessage({
        from: event.to,
        to: event.from,
        body: result.reply,
        workspaceId: linqAccount?.linqWorkspaceId ?? undefined,
      });

      await addConversationMessage({
        threadId: thread.id,
        direction: "outbound",
        provider: "linq",
        sender: event.to,
        recipient: event.from,
        body: result.reply,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("[linq webhook] Error:", err.message);
    return res.status(500).json({ error: "Internal error" });
  }
}

async function findBusinessByPhoneNumber(phone: string): Promise<{ businessId: string } | null> {
  try {
    const { pool } = await import("../../db");
    const r = await pool.query(
      `SELECT business_id FROM linq_phone_numbers WHERE phone_number = $1 AND status = 'active' LIMIT 1`,
      [phone]
    );
    if (r.rows.length > 0) return { businessId: r.rows[0].business_id };

    // Fallback: if LINQ_PHONE_NUMBER env var matches, use the first business with AI settings
    const envPhone = process.env.LINQ_PHONE_NUMBER;
    if (envPhone && (phone === envPhone || phone.replace(/\D/g, "") === envPhone.replace(/\D/g, ""))) {
      const fallback = await pool.query(
        `SELECT business_id FROM ai_quote_assistant_settings WHERE enabled = true LIMIT 1`
      );
      if (fallback.rows.length > 0) return { businessId: fallback.rows[0].business_id };
      // If no AI settings yet, just grab the first business
      const anyBiz = await pool.query(`SELECT id FROM businesses LIMIT 1`);
      if (anyBiz.rows.length > 0) return { businessId: anyBiz.rows[0].id };
    }
    return null;
  } catch {
    return null;
  }
}

function extractIntakeUpdatesFromMessage(message: string, existing: IntakeSession): Partial<IntakeSession> {
  const { extractIntakeFieldFromMessage, INTAKE_STEPS } = require("./intake");
  const updates: Partial<IntakeSession> = {};
  for (const step of INTAKE_STEPS) {
    if (!existing[step.field as keyof IntakeSession]) {
      const val = extractIntakeFieldFromMessage(message, step.field);
      if (val) updates[step.field as keyof IntakeSession] = val;
    }
  }
  return updates;
}
