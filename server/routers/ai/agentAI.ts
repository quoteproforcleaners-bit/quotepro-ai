import { Router, type Request, type Response } from "express";
import { requireAuth, requireGrowth } from "../../middleware";
import { generateText, anthropic } from "../../services/ai.service";
import { callAI } from "../../aiClient";
import { sanitizeAndLog } from "../../promptSanitizer";
import { trackEvent } from "../../analytics";
import { AnalyticsEvents } from "../../../shared/analytics-events";
import {
  getBusinessByOwner,
  getQuoteStats, getQuotesByBusiness, getCustomersByBusiness,
  getJobsByBusiness, getCommunicationsByBusiness, createAnalyticsEvent,
} from "../../storage";

const router = Router();

router.post("/ai/sales-chat", requireAuth, requireGrowth, async (req: Request, res: Response) => {
  try {
    const { message, conversationHistory } = req.body;
    if (!message) return res.status(400).json({ message: "message is required" });

    const business = await getBusinessByOwner(req.session.userId!);

    let contextStr = "No business data yet — give general cleaning sales coaching.";
    const now = new Date();

    if (business) {
      const [stats, allQuotes, customers, jobs, comms] = await Promise.all([
        getQuoteStats(business.id),
        getQuotesByBusiness(business.id),
        getCustomersByBusiness(business.id),
        getJobsByBusiness(business.id),
        getCommunicationsByBusiness(business.id),
      ]);

      const sentQuotes = allQuotes.filter(q => q.status === "sent");
      const acceptedQuotes = allQuotes.filter(q => q.status === "accepted");
      const declinedQuotes = allQuotes.filter(q => q.status === "declined");
      const completedJobs = jobs.filter(j => j.status === "completed");
      const scheduledJobs = jobs.filter(j => j.status === "scheduled");
      const customerMap = new Map(customers.map(c => [c.id, c]));
      const pipelineValue = sentQuotes.reduce((s, q) => s + q.total, 0);
      const avgAcceptedTotal = acceptedQuotes.length > 0
        ? acceptedQuotes.reduce((s, q) => s + q.total, 0) / acceptedQuotes.length : 0;
      const recurringCount = acceptedQuotes.filter(q => q.frequencySelected !== "one-time").length;

      const openQuoteDetails = sentQuotes
        .sort((a, b) => (a.sentAt?.getTime() || a.createdAt.getTime()) - (b.sentAt?.getTime() || b.createdAt.getTime()))
        .slice(0, 8)
        .map(q => {
          const cust = q.customerId ? customerMap.get(q.customerId) : null;
          const name = cust ? `${cust.firstName} ${cust.lastName}`.trim() : "Unknown";
          const sentDate = q.sentAt || q.createdAt;
          const ageDays = Math.round((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
          const quoteComms = comms.filter(c => c.quoteId === q.id);
          const followUpAge = quoteComms.length > 0
            ? Math.round((now.getTime() - new Date(quoteComms[0].createdAt).getTime()) / (1000 * 60 * 60 * 24))
            : null;
          return `  - ${name}: $${q.total.toFixed(0)} ${q.frequencySelected} (${q.selectedOption}), ${ageDays}d old${followUpAge !== null ? `, last follow-up ${followUpAge}d ago` : ", no follow-up sent"}`;
        });

      const dormantCount = customers.filter(c => {
        const lastJob = jobs.filter(j => j.customerId === c.id && j.status === "completed")
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
        if (!lastJob) return false;
        return (now.getTime() - new Date(lastJob.updatedAt).getTime()) / (1000 * 60 * 60 * 24) > 45;
      }).length;

      const recentWins = acceptedQuotes
        .sort((a, b) => (b.acceptedAt?.getTime() || 0) - (a.acceptedAt?.getTime() || 0))
        .slice(0, 4)
        .map(q => {
          const name = q.customerId ? (() => { const c = customerMap.get(q.customerId!); return c ? `${c.firstName} ${c.lastName}`.trim() : "Unknown"; })() : "Unknown";
          return `  - ${name}: $${q.total.toFixed(0)} ${q.frequencySelected}`;
        });

      const contextParts = [
        `Business: ${business.companyName} | Date: ${now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`,
        `Close rate: ${stats.closeRate}% | Pipeline: ${sentQuotes.length} quotes worth $${pipelineValue.toFixed(0)} | Avg quote: $${avgAcceptedTotal.toFixed(0)}`,
        `Won: ${stats.acceptedQuotes} quotes (${recurringCount} recurring) | Lost: ${declinedQuotes.length} | Scheduled jobs: ${scheduledJobs.length}`,
        `Customers: ${customers.length} total, ${dormantCount} dormant (45d+), ${customers.filter(c => c.isVip).length} VIP`,
      ];
      if (openQuoteDetails.length > 0) contextParts.push(`Open quotes needing follow-up:\n${openQuoteDetails.join("\n")}`);
      if (recentWins.length > 0) contextParts.push(`Recent wins:\n${recentWins.join("\n")}`);
      contextStr = contextParts.join("\n");
    }

    const businessName = business?.companyName || "your cleaning business";

    const systemPrompt = `You are an elite AI sales coach for "${businessName}", a residential cleaning company. Your job is to help the owner close more jobs, handle objections, and grow recurring revenue.

RESPONSE FORMAT — return ONLY valid JSON, no other text:
{
  "mode": "follow-up" | "objection" | "script" | "strategy" | "coaching",
  "quickTakeaway": "1-2 sentences. The single most important thing to do right now.",
  "approach": "2-4 sentences. The reasoning, framing, and recommended tactic.",
  "scripts": [
    { "label": "Text message", "content": "Ready-to-send script — direct and conversational" },
    { "label": "Email", "content": "Ready-to-send email with subject line on first line" }
  ],
  "alternateVersions": [
    { "label": "More direct", "content": "..." }
  ],
  "nextStep": "1-2 sentences. What to do if no response after 48 hours."
}

RULES:
- scripts: include 1-3 that are relevant. Omit irrelevant types. Always include a text message if a script is needed.
- alternateVersions: include 1-2 when useful (softer, more direct, more premium, recurring-focused, phone). Omit if not helpful.
- All scripts must sound human, not robotic. No placeholders like [Name]. Use real names from data if available.
- Stay focused on cleaning service sales: one-time, recurring, deep clean, weekly/biweekly/monthly, move-in/out, add-ons.
- When business data is available, reference real names, dollar amounts, and timelines. Never be generic.
- Key sales principles: 48hr follow-up sweet spot; recurring = 3-5x value of one-time; price objection = reframe value saved per hour; "thinking about it" = create gentle urgency; deep clean first = sets the standard for recurring.
- Do NOT write essay-length answers. Be direct, decisive, tactical.

BUSINESS DATA:
${contextStr}`;

    const chatMessages: { role: "user" | "assistant"; content: string }[] = [];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-4)) {
        chatMessages.push({ role: msg.role, content: msg.content });
      }
    }
    chatMessages.push({ role: "user", content: message });

    const rawContent = await generateText({
      system: systemPrompt,
      messages: chatMessages,
      maxTokens: 800,
    }) || "";
    if (!rawContent) {
      return res.json({ reply: "I'm having trouble generating a response right now. Please try again.", mode: "coaching", quickTakeaway: "", approach: "", scripts: [], alternateVersions: [], nextStep: "" });
    }

    let structured: any = {};
    try {
      structured = JSON.parse(rawContent);
    } catch {
      structured = { mode: "coaching", quickTakeaway: rawContent, approach: "", scripts: [], alternateVersions: [], nextStep: "" };
    }

    return res.json({
      reply: rawContent,
      mode: structured.mode || "coaching",
      quickTakeaway: structured.quickTakeaway || "",
      approach: structured.approach || "",
      scripts: Array.isArray(structured.scripts) ? structured.scripts : [],
      alternateVersions: Array.isArray(structured.alternateVersions) ? structured.alternateVersions : [],
      nextStep: structured.nextStep || "",
    });
  } catch (error: any) {
    console.error("AI sales chat error:", error?.message || error);
    return res.status(500).json({ message: "Failed to process your question. Please try again." });
  }
});

router.post("/ai/agent-chat", requireAuth, async (req: Request, res: Response) => {
  try {
    const { mode = "coach", conversationHistory = [] } = req.body;
    const message = sanitizeAndLog(req.body.message || "", req.session.userId!, "agent-chat");
    if (!message) return res.status(400).json({ message: "message is required" });
    if (!["business", "coach", "teach"].includes(mode)) return res.status(400).json({ message: "invalid mode" });
    trackEvent(req.session.userId!, AnalyticsEvents.AI_AGENT_OPENED, { mode }).catch(() => {});
    if (mode === "business") trackEvent(req.session.userId!, AnalyticsEvents.AI_AGENT_MY_BUSINESS_USED, {}).catch(() => {});
    else if (mode === "coach") trackEvent(req.session.userId!, AnalyticsEvents.AI_AGENT_COACH_USED, {}).catch(() => {});

    const business = await getBusinessByOwner(req.session.userId!);
    const businessName = business?.companyName || "your cleaning business";
    const now = new Date();

    let systemPrompt = "";

    if (mode === "business") {
      let dataBlock = "No business data available yet — encourage the user to create quotes and customers to unlock full insights.";

      if (business) {
        const [stats, allQuotes, customers, jobs] = await Promise.all([
          getQuoteStats(business.id),
          getQuotesByBusiness(business.id),
          getCustomersByBusiness(business.id),
          getJobsByBusiness(business.id),
        ]);

        const sentQuotes = allQuotes.filter((q: any) => q.status === "sent" || q.status === "viewed");
        const acceptedQuotes = allQuotes.filter((q: any) => q.status === "accepted");
        const declinedQuotes = allQuotes.filter((q: any) => q.status === "declined");
        const draftQuotes = allQuotes.filter((q: any) => q.status === "draft");
        const customerMap = new Map(customers.map((c: any) => [c.id, c]));

        const totalRevenue = acceptedQuotes.reduce((s: number, q: any) => s + (Number(q.total) || 0), 0);
        const pipelineValue = sentQuotes.reduce((s: number, q: any) => s + (Number(q.total) || 0), 0);
        const avgQuote = acceptedQuotes.length > 0 ? totalRevenue / acceptedQuotes.length : 0;
        const recurringCount = acceptedQuotes.filter((q: any) => q.frequencySelected && q.frequencySelected !== "one-time" && q.frequencySelected !== "One Time").length;

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthRevenue = acceptedQuotes.filter((q: any) => new Date(q.createdAt) >= monthStart).reduce((s: number, q: any) => s + (Number(q.total) || 0), 0);

        const revenueByCustomer: Record<string, { name: string; revenue: number; count: number }> = {};
        for (const q of acceptedQuotes) {
          if (!q.customerId) continue;
          const c = customerMap.get(q.customerId);
          const name = c ? `${c.firstName} ${c.lastName}`.trim() : "Unknown";
          if (!revenueByCustomer[name]) revenueByCustomer[name] = { name, revenue: 0, count: 0 };
          revenueByCustomer[name].revenue += Number(q.total) || 0;
          revenueByCustomer[name].count++;
        }
        const topCustomers = Object.values(revenueByCustomer)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
          .map((c) => `  - ${c.name}: $${c.revenue.toFixed(0)} (${c.count} quote${c.count > 1 ? "s" : ""})`);

        const staleQuotes = sentQuotes
          .filter((q: any) => {
            const sent = q.sentAt || q.createdAt;
            const ageDays = (now.getTime() - new Date(sent).getTime()) / (1000 * 60 * 60 * 24);
            return ageDays >= 5;
          })
          .sort((a: any, b: any) => new Date(a.sentAt || a.createdAt).getTime() - new Date(b.sentAt || b.createdAt).getTime())
          .slice(0, 6)
          .map((q: any) => {
            const c = q.customerId ? customerMap.get(q.customerId) : null;
            const name = c ? `${c.firstName} ${c.lastName}`.trim() : (q.customerName || "Unknown");
            const ageDays = Math.round((now.getTime() - new Date(q.sentAt || q.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            return `  - ${name}: $${Number(q.total || 0).toFixed(0)} (${ageDays}d ago, ${q.frequencySelected || "one-time"})`;
          });

        const serviceTypes: Record<string, { count: number; revenue: number }> = {};
        for (const q of acceptedQuotes) {
          const type = (q.propertyDetails as any)?.selectedOption || q.selectedOption || "Standard";
          if (!serviceTypes[type]) serviceTypes[type] = { count: 0, revenue: 0 };
          serviceTypes[type].count++;
          serviceTypes[type].revenue += Number(q.total) || 0;
        }
        const serviceBreakdown = Object.entries(serviceTypes)
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .slice(0, 5)
          .map(([type, d]) => `  - ${type}: ${d.count} quotes, $${d.revenue.toFixed(0)} revenue`);

        const recentQuotes = [...allQuotes]
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 8)
          .map((q: any) => {
            const c = q.customerId ? customerMap.get(q.customerId) : null;
            const name = c ? `${c.firstName} ${c.lastName}`.trim() : (q.customerName || "Unknown");
            const ageDays = Math.round((now.getTime() - new Date(q.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            return `  - ${name}: $${Number(q.total || 0).toFixed(0)} — ${q.status} (${ageDays}d ago, ${q.frequencySelected || "one-time"})`;
          });

        const dormantCustomers = customers.filter((c: any) => {
          const lastQuote = allQuotes
            .filter((q: any) => q.customerId === c.id)
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
          if (!lastQuote) return false;
          const daysSince = (now.getTime() - new Date(lastQuote.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          return daysSince >= 60;
        });

        const blocks: string[] = [
          `BUSINESS: ${businessName} | Date: ${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`,
          `PIPELINE: ${sentQuotes.length} open quotes worth $${pipelineValue.toFixed(0)} | ${draftQuotes.length} drafts`,
          `REVENUE: $${monthRevenue.toFixed(0)} this month | $${totalRevenue.toFixed(0)} all-time | Avg quote $${avgQuote.toFixed(0)}`,
          `QUOTES: ${allQuotes.length} total — ${acceptedQuotes.length} accepted (${recurringCount} recurring), ${declinedQuotes.length} declined, ${sentQuotes.length} open`,
          `CLOSE RATE: ${stats.closeRate}%`,
          `CUSTOMERS: ${customers.length} total | ${dormantCustomers.length} dormant (60d+) | ${customers.filter((c: any) => c.isVip).length} VIP`,
          `JOBS: ${jobs.length} total | ${jobs.filter((j: any) => j.status === "scheduled").length} scheduled | ${jobs.filter((j: any) => j.status === "completed").length} completed`,
        ];
        if (topCustomers.length > 0) blocks.push(`TOP CUSTOMERS BY REVENUE:\n${topCustomers.join("\n")}`);
        if (staleQuotes.length > 0) blocks.push(`STALE OPEN QUOTES (5d+ no response):\n${staleQuotes.join("\n")}`);
        if (serviceBreakdown.length > 0) blocks.push(`SERVICE TYPE BREAKDOWN:\n${serviceBreakdown.join("\n")}`);
        if (recentQuotes.length > 0) blocks.push(`RECENT QUOTE ACTIVITY:\n${recentQuotes.join("\n")}`);

        dataBlock = blocks.join("\n\n");
      }

      systemPrompt = `You are QuotePro's intelligent business data analyst for "${businessName}". You have direct access to their real business data inside QuotePro. Your job is to answer questions about their business clearly, accurately, and actionably.

RULES:
- Answer directly from the data provided. Never make up numbers.
- If data is missing for a question, say so clearly and suggest what action to take.
- Use the user's real names, numbers, and specifics — never be generic.
- Format responses with clean markdown: use **bold** for key numbers, bullet lists for multiple items, and short paragraph summaries.
- Keep responses concise but complete. Prioritize insight over raw data dump.
- Always end with 1 actionable recommendation when relevant.
- You can answer follow-up questions naturally based on conversation context.

REAL BUSINESS DATA:
${dataBlock}`;

    } else if (mode === "coach") {
      let contextSummary = "New business with no data yet.";

      if (business) {
        const [stats, allQuotes, customers, jobs] = await Promise.all([
          getQuoteStats(business.id),
          getQuotesByBusiness(business.id),
          getCustomersByBusiness(business.id),
          getJobsByBusiness(business.id),
        ]);
        const sentQuotes = allQuotes.filter((q: any) => q.status === "sent" || q.status === "viewed");
        const acceptedQuotes = allQuotes.filter((q: any) => q.status === "accepted");
        const pipelineValue = sentQuotes.reduce((s: number, q: any) => s + (Number(q.total) || 0), 0);
        const avgQuote = acceptedQuotes.length > 0 ? acceptedQuotes.reduce((s: number, q: any) => s + (Number(q.total) || 0), 0) / acceptedQuotes.length : 0;
        const recurringPct = acceptedQuotes.length > 0 ? Math.round(acceptedQuotes.filter((q: any) => q.frequencySelected && q.frequencySelected !== "one-time" && q.frequencySelected !== "One Time").length / acceptedQuotes.length * 100) : 0;

        contextSummary = [
          `Business: ${businessName}`,
          `Close rate: ${stats.closeRate}% | Pipeline: ${sentQuotes.length} open quotes, $${pipelineValue.toFixed(0)}`,
          `Avg accepted quote: $${avgQuote.toFixed(0)} | Recurring: ${recurringPct}% of wins`,
          `Customers: ${customers.length} | Total quotes: ${allQuotes.length}`,
        ].join(" | ");
      }

      systemPrompt = `You are an elite sales and operations coach for cleaning businesses. You're working specifically with "${businessName}". Your job is to help them close more jobs, handle every objection confidently, grow recurring revenue, and build a more profitable business.

YOUR COACHING STYLE:
- Direct, decisive, and tactical — no filler words
- Give specific scripts, exact words, and actionable frameworks
- Reference the user's real business context when relevant
- Sales psychology + cleaning business expertise
- Always explain the "why" behind the tactic
- Keep advice grounded in what actually works in home services

FORMAT:
- Use **bold** for key tactics and scripts
- Use bullet lists for frameworks and options
- Put word-for-word scripts in quotes or a separate block
- Keep responses scannable — not essays
- End with a clear next action when relevant

KEY EXPERTISE AREAS:
- Objection handling (price, timing, "I need to think about it")
- Follow-up sequences (text, email, phone — timing and tone)
- Recurring service conversion (positioning, scripts, timing)
- Deep clean → recurring pipeline building
- Add-on upsells (fridge, oven, windows, laundry)
- Lead response speed and first-contact best practices
- Quote presentation and confidence
- Pipeline prioritization
- Referral and review generation
- Team performance and accountability

CLEANING INDUSTRY PRICING NORMS:
- Standard residential: $100-$200/visit depending on size
- Deep clean: 35-60% premium over standard
- Move-out/in: 60-100% premium
- Recurring discount: 10-15% biweekly, 15-20% weekly
- Add-ons: $20-$50 each (fridge, oven, windows, laundry)
- Commercial: price by sqft ($0.05-$0.15/sqft typical)

BUSINESS CONTEXT: ${contextSummary}`;

    } else {
      const contextNote = business ? `The student runs "${businessName}", a cleaning business using QuotePro.` : "The student runs a cleaning business.";

      systemPrompt = `You are a cleaning industry expert and business educator. Your job is to teach cleaning business owners everything they need to know to run a more profitable, professional, and scalable business.

${contextNote}

YOUR TEACHING STYLE:
- Clear, patient, and thorough — never condescending
- Use real-world examples from the cleaning industry
- Structure learning with definitions, context, and practical application
- Give actionable takeaways the student can use today
- Reference industry norms, data, and best practices

TEACHING FORMAT:
- Start with the core concept clearly explained
- Use **bold** for key terms and important points
- Use bullet lists for frameworks, examples, and options
- Include a "How to apply this" section when relevant
- Keep it practical — not textbook theory

YOUR EXPERTISE COVERS:
RESIDENTIAL CLEANING:
- Service types (standard, deep, move-in/out, post-construction, recurring)
- Room-by-room task standards
- Cleaning supply selection and costs
- Eco-friendly positioning
- Time estimates and labor planning

COMMERCIAL CLEANING:
- Office, retail, medical, industrial
- Bidding by sqft vs by scope
- Walk-through best practices
- Service frequency norms
- Commercial vs residential differences

QUOTING & PRICING:
- How to price residential cleaning correctly
- Square footage vs room-count pricing
- Condition adjustments and risk pricing
- Frequency discounts that don't hurt margins
- Add-on pricing and how to present them
- Common underpricing mistakes
- Regional pricing differences

OPERATIONS:
- Scheduling and routing efficiency
- Team training and quality control
- Supply costs as % of revenue (target: 5-8%)
- Job tracking and completion workflows
- Customer communication standards
- Checklists and accountability

BUSINESS GROWTH:
- Customer acquisition channels (referral, Google, door-to-door, Thumbtack)
- Retention strategies (loyalty, check-ins, seasonal offers)
- Recurring revenue building
- Hiring: W2 vs 1099 considerations
- Profitability benchmarks (target: 15-25% net margin)
- When and how to raise prices
- Adding commercial accounts

SALES & MARKETING:
- Quote-to-close best practices
- Follow-up sequences that work
- Review generation and reputation management
- Google My Business optimization
- Social media for cleaning companies
- Referral programs that actually drive bookings`;
    }

    const chatMessages: any[] = [{ role: "system", content: systemPrompt }];

    if (Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-6)) {
        if (msg.role && msg.content) {
          chatMessages.push({ role: msg.role, content: String(msg.content).slice(0, 1000) });
        }
      }
    }
    chatMessages.push({ role: "user", content: message });

    if (req.headers["accept"] === "text/event-stream") {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      try {
        const systemMsg = chatMessages.find((m: any) => m.role === "system");
        const nonSystemMessages = chatMessages
          .filter((m: any) => m.role !== "system")
          .map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content }));

        const stream = await generateText({
          system: systemMsg?.content,
          messages: nonSystemMessages,
          maxTokens: 900,
          stream: true,
        });

        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            res.write(`data: ${JSON.stringify({ type: "delta", text: chunk.delta.text })}\n\n`);
          }
        }

        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        res.end();
      } catch (err: any) {
        console.error("[agent-chat] Streaming error:", err.message);
        try {
          res.write(`data: ${JSON.stringify({ type: "error", message: "AI streaming failed. Please try again." })}\n\n`);
        } catch {}
        res.end();
      }
      return;
    }

    let reply: string;
    try {
      const { content } = await callAI(chatMessages, {
        maxTokens: 900,
        userId: req.session.userId,
        route: "agent-chat",
      });
      reply = content || "I'm having trouble generating a response right now. Please try again.";
    } catch (aiErr: any) {
      console.error("AI agent chat error:", aiErr?.message || aiErr);
      reply = "I'm temporarily unavailable. Please try again in a moment.";
    }
    return res.json({ reply, mode });

  } catch (error: any) {
    console.error("AI agent chat error:", error?.message || error);
    return res.status(500).json({ message: "Failed to process your question. Please try again." });
  }
});

router.post("/ai/closing-message", requireAuth, requireGrowth, async (req: Request, res: Response) => {
  try {
    const {
      objectionText,
      objectionType: objType,
      tone,
      language: msgLanguage,
      quoteAmount,
      serviceType,
      frequency,
      addOns,
      customerName,
      notes,
      pricingSummary,
      messageType,
    } = req.body;

    if (!tone) {
      return res.status(400).json({ message: "Tone is required" });
    }

    const business = await getBusinessByOwner(req.session.userId!);
    if (business) {
      try {
        await createAnalyticsEvent({
          businessId: business.id,
          eventName: "objection_assistant_used",
          properties: { objectionType: objType || messageType || "general", tone, language: msgLanguage || "en" },
        });
      } catch (_e) {}
    }

    const businessName = business?.companyName || "our company";
    const languageMap: Record<string, string> = { en: "English", es: "Spanish", pt: "Portuguese", ru: "Russian" };
    const targetLanguage = languageMap[msgLanguage || "en"] || "English";

    const systemPrompt = `You are an elite AI sales assistant for cleaning businesses. Your job is to help the business owner craft the perfect response to a customer objection or hesitation so they can close more jobs.

You will analyze the customer's message and generate a structured JSON response with:
1. primaryReply — a ready-to-send message that addresses the objection and guides toward booking
2. alternateReply — a different angle (e.g. softer, more direct, or differently framed)
3. objectionType — classify the objection in 2-4 words (e.g., "Price objection", "Commitment hesitation", "Recurring resistance", "Deep clean resistance", "One-time preference")
4. nextMove — a short tactical tip for what the business owner should do after sending the reply

Rules:
- Write ENTIRELY in ${targetLanguage}
- Tone: ${tone}
- Replies must feel human and genuine — never robotic or salesy
- Keep replies concise and text-message ready (unless the context suggests email)
- Reference cleaning-specific details: deep clean, recurring service, weekly/biweekly/monthly, quote amount, first-time clean
- Use the customer's name if provided; otherwise write naturally without one
- Business: ${businessName}
- Do NOT use emojis
- Do NOT use placeholder brackets like [Name]
- Return ONLY a valid JSON object, no other text

Return exactly this JSON structure:
{
  "primaryReply": "...",
  "alternateReply": "...",
  "objectionType": "...",
  "nextMove": "..."
}`;

    const contextParts: string[] = [];
    if (objectionText) contextParts.push(`Customer's message: "${objectionText}"`);
    if (customerName) contextParts.push(`Customer name: ${customerName}`);
    if (quoteAmount) contextParts.push(`Quote amount: $${Number(quoteAmount).toFixed(2)}`);
    if (serviceType) contextParts.push(`Service type: ${serviceType}`);
    if (frequency) contextParts.push(`Cleaning frequency: ${frequency}`);
    if (addOns && Array.isArray(addOns) && addOns.length > 0) contextParts.push(`Add-ons: ${addOns.join(", ")}`);
    if (notes) contextParts.push(`Additional context: ${notes}`);
    if (pricingSummary) contextParts.push(`Pricing summary: ${pricingSummary}`);
    if (objType || messageType) contextParts.push(`Objection category: ${(objType || messageType || "").replace(/_/g, " ")}`);

    const userMessage = contextParts.length > 0
      ? `Generate an objection response with a ${tone} tone:\n\n${contextParts.join("\n")}`
      : `Generate a sample price objection response with a ${tone} tone for a cleaning business. Example objection: "That's more than I expected."`;

    const content = await generateText({
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      maxTokens: 800,
    });

    if (!content) return res.status(500).json({ message: "No response from AI" });

    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      return res.json({ message: content.trim(), primaryReply: content.trim() });
    }

    return res.json({
      message: parsed.primaryReply || content.trim(),
      primaryReply: parsed.primaryReply || "",
      alternateReply: parsed.alternateReply || "",
      objectionType: parsed.objectionType || "",
      nextMove: parsed.nextMove || "",
    });
  } catch (error: any) {
    console.error("AI objection assistant error:", error);
    return res.status(500).json({ message: "Failed to generate reply. Please try again." });
  }
});

router.post("/ai/objection-extract", requireAuth, requireGrowth, async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ message: "Image is required" });

    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: (mimeType || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: "Extract the visible text from this screenshot of a text message or chat conversation. Return ONLY the extracted text, preserving the conversation flow. Focus especially on the customer's most recent message or objection. Do not add any commentary.",
          },
        ],
      }],
      max_tokens: 400,
    });

    const extractedText = (completion.content[0] as any).text?.trim() || "";
    return res.json({ text: extractedText });
  } catch (error: any) {
    console.error("Objection extract error:", error);
    return res.status(500).json({ message: "Could not extract text from image. Please type the message manually." });
  }
});

export default router;
