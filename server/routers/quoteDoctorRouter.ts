import { Router, Request, Response } from "express";
import { openai } from "../clients";

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

const ADJUST_SYSTEM = `You are Quote Doctor, a cleaning industry proposal expert. The user has an optimized cleaning quote and wants to make specific changes to it.

Apply the requested changes precisely:
- Keep the overall structure and quality of the proposal
- Only modify what the user asks to change
- Maintain professional tone throughout
- Do not add explanations or commentary
- Return ONLY the revised proposal`;

// ─── Optimize existing quote ──────────────────────────────────────────────────

quoteDoctorRouter.post("/api/quote-doctor/optimize", async (req: Request, res: Response) => {
  try {
    const { quoteText, imageBase64, imageMimeType } = req.body as {
      quoteText?: string;
      imageBase64?: string;
      imageMimeType?: string;
    };

    console.log("[QuoteDoctor] request — hasText:", !!quoteText, "hasImage:", !!imageBase64,
      imageBase64 ? `(~${Math.round(imageBase64.length * 0.75 / 1024)}KB)` : "");

    if (!quoteText && !imageBase64) {
      return res.status(400).json({ error: "Quote text or image required" });
    }

    const model = imageBase64 ? "gpt-4o" : "gpt-4o-mini";

    const messages: any[] = imageBase64
      ? [
          { role: "system", content: QUOTE_DOCTOR_SYSTEM },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${imageMimeType || "image/jpeg"};base64,${imageBase64}`,
                  detail: "low",
                },
              },
              {
                type: "text",
                text: "Read this cleaning quote image carefully. DO NOT reproduce the extracted text. Write ONLY the optimized rewritten quote.",
              },
            ],
          },
        ]
      : [
          { role: "system", content: QUOTE_DOCTOR_SYSTEM },
          { role: "user", content: `Optimize this cleaning quote:\n\n${quoteText}` },
        ];

    const completion = await openai.chat.completions.create({ model, messages, max_tokens: 900 });
    const optimized = completion.choices[0]?.message?.content?.trim() ?? "";
    console.log("[QuoteDoctor] success — output length:", optimized.length);
    return res.json({ optimized });
  } catch (err: any) {
    console.error("[QuoteDoctor] error:", err?.message || err, err?.status, err?.code);
    const msg = err?.message?.includes("image") || err?.code === "invalid_request_error"
      ? "Could not read the image. Please try a clearer screenshot or paste the quote as text."
      : "Failed to optimize quote. Please try again.";
    return res.status(500).json({ error: msg });
  }
});

// ─── Generate scope of work ───────────────────────────────────────────────────

quoteDoctorRouter.post("/api/quote-doctor/scope", async (req: Request, res: Response) => {
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SCOPE_GENERATOR_SYSTEM },
        { role: "user", content: `Generate a professional cleaning scope of work for:\n\n${contextParts}` },
      ],
      max_tokens: 1200,
    });

    const scope = completion.choices[0]?.message?.content?.trim() ?? "";
    console.log("[QuoteDoctor/scope] success — output length:", scope.length);
    return res.json({ scope });
  } catch (err: any) {
    console.error("[QuoteDoctor/scope] error:", err?.message || err);
    return res.status(500).json({ error: "Failed to generate scope. Please try again." });
  }
});

// ─── AI adjust existing proposal ──────────────────────────────────────────────

quoteDoctorRouter.post("/api/quote-doctor/adjust", async (req: Request, res: Response) => {
  try {
    const { currentProposal, instructions } = req.body as {
      currentProposal?: string;
      instructions?: string;
    };

    if (!currentProposal || !instructions) {
      return res.status(400).json({ error: "Proposal and adjustment instructions required" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: ADJUST_SYSTEM },
        {
          role: "user",
          content: `Here is the current proposal:\n\n${currentProposal}\n\n---\n\nPlease make these specific changes:\n${instructions}`,
        },
      ],
      max_tokens: 900,
    });

    const adjusted = completion.choices[0]?.message?.content?.trim() ?? "";
    console.log("[QuoteDoctor/adjust] success — output length:", adjusted.length);
    return res.json({ adjusted });
  } catch (err: any) {
    console.error("[QuoteDoctor/adjust] error:", err?.message || err);
    return res.status(500).json({ error: "Failed to adjust proposal. Please try again." });
  }
});
