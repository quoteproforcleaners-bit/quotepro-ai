import { Router, Request, Response } from "express";
import { anthropic } from "../clients";
import { requireAuth, requireGrowth } from "../middleware";
import { sanitizeForPrompt } from "../promptSanitizer";
import {
  fallbackPricingAnalysis,
  fallbackClientNarrative,
  fallbackOptimize,
  fallbackAdjust,
  fallbackScope,
} from "../aiFallbacks";

export const quoteDoctorRouter = Router();

// ─── System prompts ───────────────────────────────────────────────────────────

const QUOTE_DOCTOR_SYSTEM = `You are Quote Doctor, an expert in helping cleaning business owners win more jobs through better quoting. You have 15 years of experience in the cleaning industry and know exactly what makes a client choose one cleaning company over another.

When given a cleaning business quote, you will:
1. Analyze what's weak or missing
2. Rewrite it as a complete, improved version

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

const SCOPE_GENERATOR_SYSTEM = `You are a professional cleaning scope-of-work writer for the cleaning industry. You write clear, detailed, client-ready cleaning scope documents that define exactly what will be cleaned, how often, and to what standard.

Your scope documents:
- Are structured by area (reception, offices, restrooms, kitchen/break room, common areas, etc.)
- List specific tasks for each area (wipe surfaces, empty trash, mop, vacuum, disinfect, etc.)
- Specify frequency for each task where relevant (daily, weekly, monthly)
- Use professional but clear language
- Follow ISSA 2026 cleaning standards
- Include quality control and verification language
- Are formatted as a professional document with sections and bullet points

FORMAT:
## Scope of Work — [Facility Type] Cleaning Services

### Service Overview
[Brief overview of the engagement]

### Included Areas & Tasks
For each area:
**[Area Name]**
- Task 1 (frequency)
- Task 2 (frequency)
...

### Frequency Schedule
[Summary table or list]

### Quality Standards
[Inspection and quality language]

### What Is Not Included
[Explicit exclusions to set expectations]

Return ONLY the scope document. No preamble or explanations.`;

const PRICING_COACH_SYSTEM = `You are a cleaning industry pricing coach with deep expertise in regional market rates across the United States. You help cleaning business owners understand whether their quotes are competitive, profitable, and market-appropriate.

Your analysis is direct, data-driven, and actionable. You never hedge or give vague answers. When you say a quote is too low, you say exactly why and by how much.

Always respond with ONLY valid JSON — no markdown, no commentary.`;

const ADJUST_SYSTEM = `You are Quote Doctor, a cleaning industry proposal expert. The user has an optimized cleaning quote and wants to make specific changes to it.

Apply the requested changes precisely:
- Keep the overall structure and quality of the proposal
- Only modify what the user asks to change
- Maintain professional tone throughout
- Do not add explanations or commentary
- Return ONLY the revised proposal`;

// ─── Client narrative (any auth'd user) ──────────────────────────────────────

quoteDoctorRouter.post("/client-narrative", requireAuth, async (req: Request, res: Response) => {
  try {
    const { bedrooms, bathrooms, sqft, frequency, amount } = req.body as {
      bedrooms?: number;
      bathrooms?: number;
      sqft?: number;
      frequency?: string;
      amount?: number;
    };

    if (!amount) {
      return res.status(400).json({ error: "Quote amount is required" });
    }

    const sqftPart = sqft && sqft > 0 ? `${sqft} sqft, ` : "";
    const freqPart = frequency || "one-time";
    const bedsPart = `${bedrooms || 0}bd/${bathrooms || 0}ba`;

    const userPrompt = `You are helping a cleaning business owner write a professional, warm message to send to a potential customer alongside their quote. Job: ${bedsPart}, ${sqftPart}${freqPart}, quote: $${amount}. Write a 3–4 sentence message in a friendly, confident tone. Do not use the word "pristine." Do not be sycophantic. Sound like a real local business owner, not a chatbot. Reply with ONLY the message text — no subject line, no label, no preamble.`;

    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 200,
    });

    const narrative = (completion.content[0] as any).text?.trim() ?? "";
    console.log("[QuoteDoctor/narrative] output length:", narrative.length);
    return res.json({ narrative });
  } catch (err: any) {
    console.error(
      "[QuoteDoctor/narrative] AI failure — prompt snippet:",
      userPrompt.slice(0, 300),
      "| error:", err?.message || err
    );
    const narrative = fallbackClientNarrative({
      bedrooms: bedrooms || 0,
      bathrooms: bathrooms || 0,
      sqft: sqft || 0,
      frequency: frequency || "one-time",
      amount: amount || 0,
    });
    return res.json({ narrative });
  }
});

// ─── Optimize existing quote ──────────────────────────────────────────────────

quoteDoctorRouter.post("/optimize", requireAuth, async (req: Request, res: Response) => {
  try {
    const { quoteText: rawQuoteText, imageBase64, imageMimeType } = req.body as {
      quoteText?: string;
      imageBase64?: string;
      imageMimeType?: string;
    };
    const quoteText = rawQuoteText ? sanitizeForPrompt(rawQuoteText) : undefined;

    console.log("[QuoteDoctor] request — hasText:", !!quoteText, "hasImage:", !!imageBase64,
      imageBase64 ? `(~${Math.round(imageBase64.length * 0.75 / 1024)}KB)` : "");

    if (!quoteText && !imageBase64) {
      return res.status(400).json({ error: "Quote text or image required" });
    }

    const userContent: any = imageBase64
      ? [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: (imageMimeType || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: "Read this cleaning quote image carefully. DO NOT reproduce the extracted text. Write ONLY the optimized rewritten quote.",
          },
        ]
      : `Optimize this cleaning quote:\n\n${quoteText}`;

    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      system: QUOTE_DOCTOR_SYSTEM,
      messages: [{ role: "user", content: userContent }],
      max_tokens: 900,
    });
    const optimized = (completion.content[0] as any).text?.trim() ?? "";
    console.log("[QuoteDoctor] success — output length:", optimized.length);
    return res.json({ optimized });
  } catch (err: any) {
    const isImageError = err?.message?.includes("image") || err?.code === "invalid_request_error";
    console.error(
      "[QuoteDoctor/optimize] AI failure — hasText:", !!quoteText, "hasImage:", !!imageBase64,
      "| error:", err?.message || err
    );
    if (isImageError) {
      return res.status(400).json({ error: "Could not read the image. Please try a clearer screenshot or paste the quote as text." });
    }
    return res.json({ optimized: fallbackOptimize(quoteText || "") });
  }
});

// ─── Generate scope of work ───────────────────────────────────────────────────

quoteDoctorRouter.post("/scope", requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      facilityType,
      sqft,
      floors,
      frequency,
      specialRequirements,
      clientName,
      companyName,
    } = req.body as {
      facilityType?: string;
      sqft?: number;
      floors?: number;
      frequency?: string;
      specialRequirements?: string;
      clientName?: string;
      companyName?: string;
    };

    if (!facilityType) {
      return res.status(400).json({ error: "Facility type is required" });
    }

    const contextParts = [
      `Facility type: ${facilityType}`,
      sqft ? `Size: ${sqft.toLocaleString()} sq ft` : null,
      floors ? `Floors: ${floors}` : null,
      frequency ? `Cleaning frequency: ${frequency}` : null,
      clientName ? `Client name: ${clientName}` : null,
      companyName ? `Cleaning company: ${companyName}` : null,
      specialRequirements ? `Special requirements or notes: ${specialRequirements}` : null,
    ].filter(Boolean).join("\n");

    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      system: SCOPE_GENERATOR_SYSTEM,
      messages: [{ role: "user", content: `Generate a professional cleaning scope of work for:\n\n${contextParts}` }],
      max_tokens: 1200,
    });

    const scope = (completion.content[0] as any).text?.trim() ?? "";
    console.log("[QuoteDoctor/scope] success — output length:", scope.length);
    return res.json({ scope });
  } catch (err: any) {
    console.error(
      "[QuoteDoctor/scope] AI failure — facilityType:", facilityType, "sqft:", sqft,
      "| error:", err?.message || err
    );
    return res.json({ scope: fallbackScope({ facilityType, sqft, floors, frequency, clientName, companyName }) });
  }
});

// ─── Pricing analysis (Growth+ gated) ────────────────────────────────────────

quoteDoctorRouter.post("/analyze", requireAuth, requireGrowth, async (req: Request, res: Response) => {
  try {
    const {
      quoteAmount,
      bedrooms,
      bathrooms,
      sqft,
      frequency,
      city,
      state,
    } = req.body as {
      quoteAmount?: number;
      bedrooms?: number;
      bathrooms?: number;
      sqft?: number;
      frequency?: string;
      city?: string;
      state?: string;
    };

    if (!quoteAmount || !bedrooms || !bathrooms) {
      return res.status(400).json({ error: "Quote amount, bedrooms, and bathrooms are required" });
    }

    const location = [city, state].filter(Boolean).join(", ") || "United States";
    const freq = frequency || "one-time";
    const sqftStr = sqft ? `${sqft.toLocaleString()} sqft` : "unknown sqft";

    const userPrompt = `You are a cleaning industry pricing coach. A cleaning business owner is about to send this quote: $${quoteAmount} for a ${bedrooms}bd/${bathrooms}ba, ${sqftStr} ${freq} clean in ${location}.

Analyze whether this quote is too low, fair, or too high for their market. Consider:
- Regional cleaning market rates for this city/state
- Property size (beds/baths/sqft)
- Cleaning type and frequency (recurring jobs should be priced slightly lower per visit than one-time)
- Typical hourly rates for cleaners in this region ($20-$40/hr labor, plus overhead and profit margin)
- Industry standard: residential cleaning should target 50-60% gross margin

Return ONLY this JSON (no markdown, no explanation):
{
  "verdict": "too_low" | "fair" | "too_high",
  "margin_risk": "high" | "medium" | "low",
  "suggested_range_low": number,
  "suggested_range_high": number,
  "coaching_note": "2 sentences max, direct and actionable advice"
}`;

    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      system: PRICING_COACH_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 300,
    });

    const raw = (completion.content[0] as any).text?.trim() ?? "";
    console.log("[QuoteDoctor/analyze] raw response:", raw.slice(0, 200));

    let result: any;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      result = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error(
        "[QuoteDoctor/analyze] JSON parse failure — raw:", raw.slice(0, 200),
        "| prompt snippet:", userPrompt.slice(0, 200)
      );
      return res.json(fallbackPricingAnalysis({ quoteAmount, bedrooms, bathrooms, sqft: sqft || 0, frequency: freq }));
    }

    const verdict = ["too_low", "fair", "too_high"].includes(result.verdict) ? result.verdict : "fair";
    const marginRisk = ["high", "medium", "low"].includes(result.margin_risk) ? result.margin_risk : "medium";

    return res.json({
      verdict,
      margin_risk: marginRisk,
      suggested_range_low: Number(result.suggested_range_low) || 0,
      suggested_range_high: Number(result.suggested_range_high) || 0,
      coaching_note: String(result.coaching_note || ""),
    });
  } catch (err: any) {
    console.error(
      "[QuoteDoctor/analyze] AI failure — quoteAmount:", quoteAmount, "beds:", bedrooms, "baths:", bathrooms,
      "sqft:", sqft, "freq:", frequency, "| error:", err?.message || err
    );
    return res.json(fallbackPricingAnalysis({ quoteAmount: quoteAmount!, bedrooms: bedrooms!, bathrooms: bathrooms!, sqft: sqft || 0, frequency: freq }));
  }
});

// ─── AI adjust existing proposal ──────────────────────────────────────────────

quoteDoctorRouter.post("/adjust", requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentProposal: rawProposal, instructions: rawInstructions } = req.body as {
      currentProposal?: string;
      instructions?: string;
    };

    if (!rawProposal || !rawInstructions) {
      return res.status(400).json({ error: "Proposal and adjustment instructions required" });
    }
    const currentProposal = sanitizeForPrompt(rawProposal);
    const instructions = sanitizeForPrompt(rawInstructions);

    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      system: ADJUST_SYSTEM,
      messages: [{
        role: "user",
        content: `Here is the current proposal:\n\n${currentProposal}\n\n---\n\nPlease make these specific changes:\n${instructions}`,
      }],
      max_tokens: 900,
    });

    const adjusted = (completion.content[0] as any).text?.trim() ?? "";
    console.log("[QuoteDoctor/adjust] success — output length:", adjusted.length);
    return res.json({ adjusted });
  } catch (err: any) {
    console.error(
      "[QuoteDoctor/adjust] AI failure — instructions snippet:", instructions.slice(0, 150),
      "| error:", err?.message || err
    );
    return res.json({ adjusted: fallbackAdjust(currentProposal) });
  }
});
