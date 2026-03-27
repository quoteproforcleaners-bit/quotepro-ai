import { Router, Request, Response } from "express";
import { openai } from "../clients";
import { pool } from "../db";

export const quoteDoctorRouter = Router();

const FREE_USES_LIMIT = 3;

const SYSTEM_PROMPT = `You are Quote Doctor, an expert in helping cleaning business owners win more jobs through better quoting. You have 15 years of experience in the cleaning industry and know exactly what makes a client choose one cleaning company over another.

When given a cleaning business quote, you will analyze what's weak or missing and rewrite it as a complete, improved version.

Your rewritten quote must:

TONE & PROFESSIONALISM:
- Sound confident and professional without being stiff
- Use warm, trustworthy language
- Address the client by name if provided, otherwise use "Hello" or the property address
- Sign off with the cleaning company owner's name if provided

PRICING PRESENTATION:
- Present pricing clearly using a Good/Better/Best structure if only one price was given
- Add a "Most Popular" badge to the middle option
- Show exactly what's included at each tier
- If recurring service, show monthly vs one-time pricing
- Add an annual savings option if applicable

TRUST SIGNALS:
- Add "Licensed & Insured" if not already present
- Add a satisfaction guarantee statement
- Mention years of experience if provided
- Add a response time commitment: "This quote is valid for 7 days"

URGENCY & CALL TO ACTION:
- Add a clear expiration: "This quote expires in 7 days"
- Include one strong call to action: "Reply to this email or call/text [number] to confirm your booking"
- Add a P.S. that creates soft urgency: "P.S. Our schedule fills up quickly — booking now secures your preferred date."

FOLLOW UP LANGUAGE:
- End with: "I'll follow up in 2 days to answer any questions. Looking forward to working with you!"

FORMAT:
- Return ONLY the rewritten quote
- Do not include explanations, commentary, or preamble
- Use clean formatting with clear sections
- Keep it under 400 words
- Make it feel human and personal, not templated`;

quoteDoctorRouter.post("/api/quote-doctor/optimize", async (req: Request, res: Response) => {
  try {
    const { email, quoteText } = req.body as { email: string; quoteText: string };

    if (!email?.trim() || !quoteText?.trim()) {
      return res.status(400).json({ message: "Email and quote text are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check usage
    const existing = await pool.query(
      `SELECT uses_count FROM quote_doctor_usage WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    const usesCount = existing.rows[0]?.uses_count ?? 0;

    if (usesCount >= FREE_USES_LIMIT) {
      return res.status(429).json({
        message: "limit_reached",
        usesCount,
        limit: FREE_USES_LIMIT,
      });
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Here is the cleaning business quote to optimize:\n\n${quoteText}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const optimized = completion.choices[0]?.message?.content?.trim() || "";

    // Detect what was improved
    const improvements: string[] = [];
    const lower = optimized.toLowerCase();
    if (lower.includes("good") && lower.includes("better") && lower.includes("best")) {
      improvements.push("Good/Better/Best pricing structure added");
    }
    if (lower.includes("licensed") || lower.includes("insured") || lower.includes("guarantee")) {
      improvements.push("Trust signals added");
    }
    if (lower.includes("expires") || lower.includes("valid for") || lower.includes("7 days")) {
      improvements.push("Urgency created");
    }
    if (lower.includes("follow up") || lower.includes("follow-up") || lower.includes("2 days")) {
      improvements.push("Follow-up sequence included");
    }
    improvements.push("Professional tone applied");

    // Upsert usage count
    await pool.query(
      `INSERT INTO quote_doctor_usage (id, email, uses_count, last_used_at)
       VALUES (gen_random_uuid(), $1, 1, NOW())
       ON CONFLICT (LOWER(email))
       DO UPDATE SET uses_count = quote_doctor_usage.uses_count + 1, last_used_at = NOW()`,
      [normalizedEmail]
    );

    const newUsesCount = usesCount + 1;
    const remaining = Math.max(0, FREE_USES_LIMIT - newUsesCount);

    return res.json({ optimized, improvements, usesCount: newUsesCount, remaining });
  } catch (error: any) {
    console.error("quote-doctor optimize error:", error);
    return res.status(500).json({ message: "Failed to optimize quote. Please try again." });
  }
});

quoteDoctorRouter.get("/api/quote-doctor/usage", async (req: Request, res: Response) => {
  try {
    const email = (req.query.email as string)?.toLowerCase().trim();
    if (!email) return res.json({ usesCount: 0, remaining: FREE_USES_LIMIT });

    const result = await pool.query(
      `SELECT uses_count FROM quote_doctor_usage WHERE LOWER(email) = $1`,
      [email]
    );
    const usesCount = result.rows[0]?.uses_count ?? 0;
    const remaining = Math.max(0, FREE_USES_LIMIT - usesCount);
    return res.json({ usesCount, remaining, limit: FREE_USES_LIMIT });
  } catch (error: any) {
    return res.json({ usesCount: 0, remaining: FREE_USES_LIMIT });
  }
});
