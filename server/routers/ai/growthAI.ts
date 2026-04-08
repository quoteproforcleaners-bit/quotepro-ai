import { Router, type Request, type Response } from "express";
import { pool, db } from "../../db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireGrowth } from "../../middleware";
import { generateText } from "../../services/ai.service";
import { callAI } from "../../aiClient";
import { getBusinessByOwner } from "../../storage";
import { winLossResponses } from "../../../shared/schema";

const router = Router();

router.post("/lead-finder/leads/:id/generate-replies", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const leadRows = await pool.query("SELECT * FROM social_leads WHERE id = $1 AND business_id = $2 LIMIT 1", [id, business.id]);
    const lead = leadRows.rows[0];
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const businessName = business.companyName || "our cleaning company";
    const ownerName = business.senderName || businessName;
    const platform = lead.platform || "social media";
    const postText = lead.post_text || lead.postText || "";
    const leadName = lead.name || "the potential client";

    const systemPrompt = `You are a sales assistant for "${businessName}", a residential cleaning company. Generate 3 concise reply messages to a potential client on ${platform}. The replies should be friendly, professional, and designed to convert a lead into a booked cleaning appointment. Each reply must be under 60 words. Vary the tone: one direct/confident, one warm/conversational, one question-focused. Return a JSON object: { "replies": ["reply1", "reply2", "reply3"] }. No emojis.`;
    const userPrompt = `Lead name: ${leadName}. Their post/comment: "${postText || "Inquiry about cleaning services"}". Generate 3 reply options as JSON.`;

    let replies: string[] = [];
    try {
      const { content } = await callAI(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        { responseFormat: "json_object", maxTokens: 400, userId: req.session.userId, route: "generate-replies" }
      );
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.replies)) {
        replies = parsed.replies.filter((r: any) => typeof r === "string").slice(0, 3);
      }
    } catch (aiErr: any) {
      console.error("AI generate replies error:", aiErr?.message || aiErr);
    }

    if (replies.length === 0) {
      replies = [
        `Hi ${leadName}, thanks for reaching out! We'd love to help with your cleaning needs. When would be a good time for a quick chat about what you're looking for?`,
        `Hello! ${businessName} here. We specialize in residential cleaning and would be happy to give you a quote. What area are you located in?`,
        `Thanks for your interest! We're currently taking new clients. Could you tell me a bit more about the space you need cleaned so we can get you the best rate?`,
      ];
    }

    return res.json({ replies });
  } catch (error: any) {
    console.error("Generate replies error:", error?.message || error);
    return res.status(500).json({ message: "Failed to generate replies" });
  }
});

router.post("/ai/win-loss-insight", requireAuth, requireGrowth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const bizResult = await pool.query<{ id: string; name: string }>(
      `SELECT b.id, b.name FROM businesses b JOIN users u ON u.id = b.user_id WHERE u.id = $1 LIMIT 1`,
      [userId],
    );
    if (!bizResult.rows.length) {
      return res.status(404).json({ message: "Business not found" });
    }
    const { id: businessId, name: businessName } = bizResult.rows[0];

    const rows = await db
      .select({
        reasonCategory: winLossResponses.reasonCategory,
        competitorMentioned: winLossResponses.competitorMentioned,
        reason: winLossResponses.reason,
      })
      .from(winLossResponses)
      .where(
        eq(winLossResponses.businessId, businessId),
      )
      .orderBy(desc(winLossResponses.createdAt))
      .limit(30);

    const responded = rows.filter((r) => r.reasonCategory && r.reasonCategory !== "no_response_yet");

    if (responded.length < 2) {
      return res.json({
        insight:
          "You haven't received enough feedback yet to identify patterns. Once customers respond to your win/loss follow-ups, AI will surface actionable pricing and positioning insights here.",
      });
    }

    const dataLines = responded
      .map((r, i) => {
        let line = `${i + 1}. Category: ${r.reasonCategory}`;
        if (r.competitorMentioned) line += `, Competitor: ${r.competitorMentioned}`;
        if (r.reason) line += `, Note: "${r.reason}"`;
        return line;
      })
      .join("\n");

    const text = await generateText({
      system:
        "You are a business strategy consultant specializing in residential cleaning companies. " +
        "Be direct and specific. No fluff. No emojis. Respond in 2-3 sentences only.",
      messages: [
        {
          role: "user",
          content:
            `Here are the reasons customers didn't book with ${businessName || "this cleaning business"}:\n\n` +
            dataLines +
            "\n\nIn 2-3 sentences, what is the most important pattern you see, and what is one specific pricing or positioning change they should make?",
        },
      ],
      maxTokens: 200,
    }) as string;

    return res.json({ insight: text.trim() });
  } catch (err: any) {
    console.error("[ai] win-loss-insight error:", err?.message || err);
    return res.status(500).json({ message: "Failed to generate insight" });
  }
});

export default router;
