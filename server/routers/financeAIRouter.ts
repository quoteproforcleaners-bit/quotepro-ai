/**
 * financeAIRouter.ts
 * Finance intelligence AI chat endpoint.
 * Mounts at /api/intelligence
 */
import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware";
import { getBusinessByOwner } from "../storage";
import { anthropic } from "../clients";
import { buildFinanceSnapshot } from "./paymentsRouter";

const router = Router();

const SYSTEM_PROMPT = `You are a financial intelligence assistant for QuotePro AI, helping residential cleaning business owners understand their payment collection, revenue trends, and cash flow.

You have access to a financial snapshot of their business including:
- Jobs in the last 90 days with payment statuses (unpaid, charged, failed, waived)
- Total collected revenue, failed charges, and uncharged completed jobs
- Recent payment events

Answer questions clearly and concisely. Use dollar amounts formatted as $X,XXX. Point out actionable insights when relevant.
If you notice concerning patterns (high failure rate, lots of uncharged jobs, etc.), proactively mention them.
Keep responses focused and practical — this is a business owner checking their finances, not a data scientist.`;

router.post("/finance-chat", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(400).json({ message: "Business not found" });

    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ message: "message required" });

    // Build financial context
    const snapshot = await buildFinanceSnapshot(business.id, business);

    const contextBlock = `
<financial_snapshot>
Business: ${snapshot.companyName}
Period: Last 90 days

SUMMARY:
- Total collected: $${snapshot.totalCollected.toLocaleString()} (${snapshot.totalCollectedCount} jobs)
- Failed charges: ${snapshot.totalFailed} jobs
- Uncharged completed jobs: ${snapshot.totalUncharged} jobs (worth ~$${snapshot.unchargedValue.toLocaleString()})

RECENT JOBS (last 90 days, up to 30 shown):
${snapshot.jobs.slice(0, 30).map((j: any) => {
  const name = [j.first_name, j.last_name].filter(Boolean).join(" ") || "Unknown";
  const amount = j.charge_amount ? `$${(j.charge_amount / 100).toFixed(2)}` : j.quote_total ? `$${parseFloat(j.quote_total).toFixed(2)}` : "$0";
  const date = new Date(j.start_datetime).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `  • ${date} | ${name} | ${amount} | status:${j.status} | payment:${j.payment_status}${j.charge_failure_reason ? ` (fail: ${j.charge_failure_reason})` : ""}`;
}).join("\n")}

RECENT PAYMENT EVENTS:
${snapshot.recentEvents.slice(0, 10).map((e: any) => {
  const date = new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const amt = e.amount_cents ? ` $${(e.amount_cents / 100).toFixed(2)}` : "";
  return `  • ${date} | ${e.event_type}${amt}`;
}).join("\n") || "  No recent events"}
</financial_snapshot>`;

    // Build messages for Claude
    const messages: any[] = [
      ...history.slice(-10).map((h: any) => ({ role: h.role, content: h.content })),
      { role: "user", content: `${contextBlock}\n\nUser question: ${message}` },
    ];

    // Stream SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    if (!res.headersSent) {
      return res.status(500).json({ message: err.message });
    }
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

export default router;
