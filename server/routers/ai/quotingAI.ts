import multer from "multer";
import { Router, type Request, type Response } from "express";
import { pool } from "../../db";
import { requireAuth, requireGrowth } from "../../middleware";
import { generateText, anthropic, MODEL } from "../../services/ai.service";
import { callAI } from "../../aiClient";
import { sanitizeAndLog } from "../../promptSanitizer";
import { SHARED_PURPOSE_DESCRIPTIONS } from "../../helpers";
import { trackEvent } from "../../analytics";
import {
  getUserById, getBusinessByOwner,
  getQuoteById, getCustomerById, updateQuote,
  getCommunicationsByBusiness,
  createAnalyticsEvent,
} from "../../storage";

const router = Router();

router.post("/ai/analyze-quote", requireAuth, requireGrowth, async (req: Request, res: Response) => {
  try {
    const { quoteId } = req.body;
    if (!quoteId) return res.status(400).json({ message: "quoteId is required" });

    const quote = await getQuoteById(quoteId);
    if (!quote) return res.status(404).json({ message: "Quote not found" });

    const customer = quote.customerId ? await getCustomerById(quote.customerId) : null;
    const comms = await getCommunicationsByBusiness(quote.businessId, { quoteId });

    const ageDays = Math.round(((Date.now() - (quote.sentAt?.getTime() || quote.createdAt.getTime())) / (1000 * 60 * 60 * 24)) * 10) / 10;
    const lastComm = comms.length > 0 ? comms[0] : null;

    const content = await generateText({
      system: `You are an AI sales assistant for a residential cleaning company. Analyze a quote and provide actionable insights. Respond with valid JSON only: {"closeProbability": number 0-100, "suggestedAction": string, "followUpMessage": string, "notes": string}`,
      messages: [{
        role: "user",
        content: `Quote: $${quote.total}, sent ${ageDays} days ago, status: ${quote.status}, ${comms.length} communications sent. Customer: ${customer ? `${customer.firstName} ${customer.lastName}, status: ${customer.status}` : "Unknown"}. Last contact: ${lastComm ? `${lastComm.channel} ${lastComm.createdAt}` : "None"}.`,
      }],
      maxTokens: 400,
    });

    let parsed: any = {};
    try { parsed = JSON.parse(content || "{}"); } catch {}

    await updateQuote(quoteId, {
      closeProbability: parsed.closeProbability || null,
      expectedValue: quote.total * ((parsed.closeProbability || 50) / 100),
      aiNotes: parsed.notes || null,
    });

    return res.json({
      closeProbability: parsed.closeProbability || 50,
      suggestedAction: parsed.suggestedAction || "Follow up with the customer",
      followUpMessage: parsed.followUpMessage || "",
      notes: parsed.notes || "",
    });
  } catch (error: any) {
    console.error("AI analyze quote error:", error);
    return res.status(500).json({ message: "Failed to analyze quote" });
  }
});

router.post("/ai/quote-descriptions", requireAuth, async (req: Request, res: Response) => {
  try {
    const { homeDetails, serviceTypes, addOns, companyName } = req.body;

    if (!homeDetails || !serviceTypes) {
      return res.status(400).json({ message: "homeDetails and serviceTypes are required" });
    }

    const addOnsList: string[] = [];
    if (addOns) {
      if (addOns.insideFridge) addOnsList.push("inside fridge cleaning");
      if (addOns.insideOven) addOnsList.push("inside oven cleaning");
      if (addOns.insideWindows) addOnsList.push("inside window cleaning");
      if (addOns.insideCabinets) addOnsList.push("inside cabinet cleaning");
      if (addOns.laundry) addOnsList.push("laundry");
      if (addOns.dishes) addOnsList.push("dishes");
    }

    const propertyDescription = [
      homeDetails.sqft ? `${homeDetails.sqft} sq ft` : null,
      homeDetails.beds ? `${homeDetails.beds} bedroom(s)` : null,
      homeDetails.baths ? `${homeDetails.baths} bathroom(s)` : null,
      homeDetails.halfBaths ? `${homeDetails.halfBaths} half bath(s)` : null,
      homeDetails.homeType ? `${homeDetails.homeType}` : null,
      homeDetails.petType && homeDetails.petType !== "none" ? `has ${homeDetails.petType}` : null,
      homeDetails.conditionScore ? `condition score ${homeDetails.conditionScore}/5` : null,
    ].filter(Boolean).join(", ");

    const systemPrompt = `You are a professional cleaning company copywriter for ${companyName || "our company"}. Generate scope-of-work descriptions for three cleaning service tiers (good, better, best). Rules:
- Write 1-2 sentences per option, professional but warm tone
- Include specific property details: ${propertyDescription}
- Differentiate clearly between the three options
- Never mention hours or time estimates
- Never mention pricing or costs
${addOnsList.length > 0 ? `- The best option includes these add-ons: ${addOnsList.join(", ")}` : ""}
Respond with a JSON object with keys "good", "better", "best", each containing the description string.`;

    const userPrompt = `Property: ${propertyDescription}
Good tier: ${serviceTypes.good || "Basic Cleaning"}
Better tier: ${serviceTypes.better || "Standard Cleaning"}
Best tier: ${serviceTypes.best || "Deep Clean"}
${addOnsList.length > 0 ? `Add-ons included in best: ${addOnsList.join(", ")}` : ""}`;

    const content = await generateText({
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 400,
    });

    if (!content) {
      return res.status(500).json({ message: "No response from AI" });
    }

    // Strip markdown code fences (```json ... ``` or ``` ... ```)
    const stripped = content
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const FALLBACK = "Description unavailable";

    let parsed: any;
    try {
      parsed = JSON.parse(stripped);
    } catch {
      console.warn("[quote-descriptions] JSON parse failed, raw content:", stripped.slice(0, 200));
      return res.json({
        good: FALLBACK,
        better: FALLBACK,
        best: FALLBACK,
      });
    }

    // Ensure each field is a plain string, not an object or array
    const toStr = (v: any): string => {
      if (typeof v === "string" && v.trim()) return v.trim();
      if (v && typeof v === "object") {
        const s = v.description || v.text || v.content || Object.values(v)[0];
        if (typeof s === "string" && s.trim()) return s.trim();
      }
      return FALLBACK;
    };

    return res.json({
      good: toStr(parsed.good),
      better: toStr(parsed.better),
      best: toStr(parsed.best),
    });
  } catch (error: any) {
    console.error("AI quote descriptions error:", error);
    return res.status(500).json({ message: "Failed to generate quote descriptions" });
  }
});

router.post("/ai/pricing-suggestion", requireAuth, async (req: Request, res: Response) => {
  try {
    const { homeDetails, addOns, frequency, currentPrices, pricingSettings: ps, businessHistory } = req.body;
    if (!homeDetails || !currentPrices) return res.status(400).json({ message: "homeDetails and currentPrices required" });

    const propertyDesc = [
      homeDetails.sqft ? `${homeDetails.sqft} sqft` : null,
      homeDetails.beds ? `${homeDetails.beds} bed` : null,
      homeDetails.baths ? `${homeDetails.baths} bath` : null,
      homeDetails.halfBaths ? `${homeDetails.halfBaths} half bath` : null,
      homeDetails.homeType || null,
      homeDetails.conditionScore ? `condition ${homeDetails.conditionScore}/10` : null,
      homeDetails.peopleCount ? `${homeDetails.peopleCount} people` : null,
      homeDetails.petType && homeDetails.petType !== "none" ? `pet: ${homeDetails.petType}${homeDetails.petShedding ? " (shedding)" : ""}` : null,
    ].filter(Boolean).join(", ");

    const addOnsList: string[] = [];
    if (addOns) {
      Object.entries(addOns).forEach(([k, v]) => { if (v) addOnsList.push(k.replace(/([A-Z])/g, " $1").toLowerCase().trim()); });
    }

    const historyContext = businessHistory
      ? `Business stats: ${businessHistory.totalQuotes || 0} quotes sent, ${businessHistory.acceptRate || 0}% acceptance rate, avg quote $${businessHistory.avgQuote || 0}, hourly rate $${ps?.hourlyRate || 55}. ${businessHistory.recentAccepted ? `Recent accepted quotes ranged $${businessHistory.recentAcceptedMin}-$${businessHistory.recentAcceptedMax}.` : ""}`
      : `Hourly rate: $${ps?.hourlyRate || 55}. No historical data available.`;

    const systemPrompt = `You are a pricing strategist for residential cleaning. The "base prices" shown are the MINIMUM prices calculated by the business owner's own pricing formula — your suggested prices must NEVER be lower than these base prices. You may suggest higher prices when market factors, property difficulty, add-ons, or business history justify it. Round to nearest $5.

CRITICAL RULES:
1. suggestedPrice must always be >= the base price for that tier. Never suggest a lower price.
2. If you cannot justify a higher price, match the base price exactly.
3. Your reasoning must explicitly compare to the base price and explain WHY the price is higher (or why the base is already optimal).
4. Be specific about what factors drive the price up (pet shedding, condition score, add-ons, market positioning).
5. Also estimate the typical US residential cleaning market price range for this specific property (size, beds, baths, frequency). Return marketRange.min and marketRange.max as realistic low/high dollar amounts, and a label describing where the better-tier base price sits in that range.

Respond with valid JSON only — no markdown, no code fences:
{"good":{"suggestedPrice":number,"reasoning":"1-2 sentences"},"better":{"suggestedPrice":number,"reasoning":"1-2 sentences"},"best":{"suggestedPrice":number,"reasoning":"1-2 sentences"},"overallAssessment":"1-2 sentences","confidence":"low"|"medium"|"high","keyInsight":"1 sentence","marketRange":{"min":number,"max":number,"label":"Below market"|"Competitively priced"|"At market rate"|"Slightly above market"|"Above market"}}`;

    const userPrompt = `Property: ${propertyDesc}
Frequency: ${frequency || "one-time"}
Add-ons: ${addOnsList.length > 0 ? addOnsList.join(", ") : "none"}

BASE PRICES (your formula minimum — never go below these):
- Good: $${currentPrices.good}
- Better: $${currentPrices.better}
- Best: $${currentPrices.best}

${historyContext}`;

    const content = await generateText({
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 400,
    });

    if (!content) return res.status(500).json({ message: "No response from AI" });

    // Strip markdown code fences before parsing
    const stripped = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(stripped);
    } catch {
      console.warn("[pricing-suggestion] JSON parse failed, raw:", stripped.slice(0, 300));
      return res.status(500).json({ message: "Invalid AI response format" });
    }

    const floorPrice = (aiPrice: number | undefined, base: number): number => {
      const ai = typeof aiPrice === "number" && !isNaN(aiPrice) ? aiPrice : base;
      return Math.max(Math.round(ai / 5) * 5, base);
    };

    const goodPrice = floorPrice(parsed.good?.suggestedPrice, currentPrices.good);
    const betterPrice = floorPrice(parsed.better?.suggestedPrice, currentPrices.better);
    const bestPrice = floorPrice(parsed.best?.suggestedPrice, currentPrices.best);

    // Build marketRange — clamp and validate the AI's numbers
    const mrMin = typeof parsed.marketRange?.min === "number" ? Math.round(parsed.marketRange.min) : 0;
    const mrMax = typeof parsed.marketRange?.max === "number" ? Math.round(parsed.marketRange.max) : 0;
    const mrLabel = typeof parsed.marketRange?.label === "string" ? parsed.marketRange.label : "Market data unavailable";

    return res.json({
      good: {
        suggestedPrice: goodPrice,
        reasoning: parsed.good?.reasoning || "",
        flooredToBase: goodPrice === currentPrices.good,
      },
      better: {
        suggestedPrice: betterPrice,
        reasoning: parsed.better?.reasoning || "",
        flooredToBase: betterPrice === currentPrices.better,
      },
      best: {
        suggestedPrice: bestPrice,
        reasoning: parsed.best?.reasoning || "",
        flooredToBase: bestPrice === currentPrices.best,
      },
      overallAssessment: parsed.overallAssessment || "",
      confidence: parsed.confidence || "medium",
      keyInsight: parsed.keyInsight || "",
      baselinePrices: { good: currentPrices.good, better: currentPrices.better, best: currentPrices.best },
      marketRange: { min: mrMin, max: mrMax, label: mrLabel },
    });
  } catch (error: any) {
    console.error("AI pricing suggestion error:", error);
    return res.status(500).json({ message: "Failed to generate pricing suggestion" });
  }
});

router.post("/ai/walkthrough-extract", requireAuth, requireGrowth, async (req: Request, res: Response) => {
  try {
    const rawInput = req.body.description || req.body.notes || "";
    const description = sanitizeAndLog(
      typeof rawInput === "string" ? rawInput.trim() : "",
      req.session.userId!,
      "walkthrough-extract"
    );
    if (!description) {
      return res.status(400).json({ message: "A job description is required" });
    }

    const business = await getBusinessByOwner(req.session.userId!);
    if (business) {
      try {
        await createAnalyticsEvent({
          businessId: business.id,
          eventName: "walkthrough_analysis_started",
          properties: { descriptionLength: description.length },
        });
      } catch (_e) {}
    }

    const systemPrompt = `You are an expert quoting assistant for residential and commercial cleaning businesses. A cleaning company owner will paste rough notes, walkthrough text, a customer message, or a property description. Your job is to extract all useful quoting details and return a structured JSON response.

You understand cleaning-industry terminology:
- "first-time clean" or "initial clean" → isFirstTimeClean: true, often implies deep clean
- "maintenance clean" or "recurring" → standard recurring service
- "deep clean" → isDeepClean: true, serviceCategory: "deep"
- "move-in" / "move-out" / "vacant" → isMoveInOut: true, serviceCategory: "move-in-out"
- "biweekly" / "every two weeks" → frequency: "bi-weekly"
- "very dirty" / "hasn't been cleaned in months" / "heavy buildup" → conditionLevel: "heavy" or "extreme"
- "light" / "pretty clean" / "just needs a touch-up" → conditionLevel: "light"
- "inside fridge" / "inside oven" → add to addOns
- "Airbnb" / "turnover clean" / "short-term rental" → note in serviceNotes, may be recurring one-time
- "salon" / "office" / "boutique" / "medical" / "restaurant" → isCommercial: true, set propertyType

Return ONLY a valid JSON object with this exact structure:
{
  "extractedFields": {
    "propertyType": "house" | "apartment" | "condo" | "townhouse" | "office" | "retail" | "medical" | "restaurant" | "gym" | "airbnb" | "other" | null,
    "serviceCategory": "standard" | "deep" | "move-in-out" | "post-construction" | "recurring" | "one-time" | null,
    "isCommercial": boolean,
    "bedrooms": number | null,
    "bathrooms": number | null,
    "halfBaths": number | null,
    "sqft": number | null,
    "occupants": number | null,
    "frequency": "one-time" | "weekly" | "bi-weekly" | "monthly" | null,
    "isFirstTimeClean": boolean,
    "isDeepClean": boolean,
    "isMoveInOut": boolean,
    "petCount": number | null,
    "petType": "dog" | "cat" | "both" | "other" | "none" | null,
    "petShedding": boolean | null,
    "addOns": string[],
    "conditionLevel": "light" | "moderate" | "heavy" | "extreme" | null,
    "conditionReasoning": string | null,
    "urgency": "normal" | "rush" | "flexible" | null,
    "customerName": string | null,
    "address": string | null,
    "serviceNotes": string | null
  },
  "missingFields": string[],
  "recommendations": string[],
  "serviceReasoning": string,
  "assumptions": string[],
  "confidence": "high" | "medium" | "low"
}

Field rules:
- Use null for any field not mentioned or inferable. Never guess without strong signal.
- isFirstTimeClean / isDeepClean / isMoveInOut default to false if not mentioned.
- isCommercial defaults to false.
- addOns: use plain English strings like "inside oven", "inside fridge", "window cleaning", "laundry", "organizing", "baseboards", "blinds", "carpet cleaning", "wall washing", "garage", "pet hair treatment".
- missingFields: list what a cleaner would need to finalize a quote but couldn't determine, e.g. ["square footage", "service frequency", "cleaning type"].
- recommendations: 1-3 short, practical suggestions for the cleaner, e.g. "First-time deep clean recommended given language about dirtiness", "Ask about preferred recurring schedule after initial clean".
- serviceReasoning: one sentence explaining why you chose the serviceCategory you did.
- assumptions: list any inferences you made that aren't explicitly stated.
- confidence: high = most key fields filled, medium = some gaps, low = very sparse.
- NEVER include prices, costs, rates, or dollar amounts.`;

    let aiContent: string;
    try {
      const { content: raw } = await callAI(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: description },
        ],
        {
          responseFormat: "json_object",
          userId: req.session.userId,
          route: "walkthrough-extract",
        }
      );
      aiContent = raw;
    } catch (aiError: any) {
      console.error("Walkthrough AI call failed:", aiError?.message || aiError);
      return res.status(503).json({ message: "AI service is temporarily unavailable. Please try again in a moment." });
    }

    const content = aiContent;
    if (!content) {
      console.error("Walkthrough AI empty response");
      return res.status(500).json({ message: "AI returned an empty response. Please try again." });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Walkthrough AI JSON parse failed:", content?.slice(0, 200));
      return res.status(500).json({ message: "AI response could not be parsed. Please try again." });
    }

    const extractedFields = parsed.extractedFields || {};
    const missingFields = Array.isArray(parsed.missingFields) ? parsed.missingFields : [];
    const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
    const serviceReasoning = typeof parsed.serviceReasoning === "string" ? parsed.serviceReasoning : "";
    const assumptions = Array.isArray(parsed.assumptions) ? parsed.assumptions : [];
    const confidence = ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "low";

    if (business) {
      try {
        await createAnalyticsEvent({
          businessId: business.id,
          eventName: "walkthrough_analysis_completed",
          properties: {
            confidence,
            isCommercial: extractedFields.isCommercial || false,
            propertyType: extractedFields.propertyType || "unknown",
            assumptionCount: assumptions.length,
          },
        });
      } catch (_e) {}
    }

    return res.json({
      extractedFields,
      missingFields,
      recommendations,
      serviceReasoning,
      assumptions,
      confidence,
    });
  } catch (error: any) {
    console.error("AI walkthrough extract error:", error);
    return res.status(500).json({ message: "Failed to analyze the job description. Please try again." });
  }
});

router.post("/ai/communication-draft", requireAuth, requireGrowth, async (req: Request, res: Response) => {
  try {
    const { type, quoteDetails, bookingLink, quoteLink, paymentMethodsText, language: commLang } = req.body;
    const purpose = sanitizeAndLog(req.body.purpose || "", req.session.userId!, "communication-draft-purpose");
    const customerName = sanitizeAndLog(req.body.customerName || "", req.session.userId!, "communication-draft-customer");
    const companyName = sanitizeAndLog(req.body.companyName || "", req.session.userId!, "communication-draft-company");
    const senderName = sanitizeAndLog(req.body.senderName || "", req.session.userId!, "communication-draft-sender");

    if (!type || !purpose) {
      return res.status(400).json({ message: "type and purpose are required" });
    }

    const purposeInstruction = SHARED_PURPOSE_DESCRIPTIONS[purpose] || `purpose: ${purpose}`;

    const quoteContext = quoteDetails
      ? ` Quote: ${quoteDetails.selectedOption || "Cleaning"} $${quoteDetails.price || ""}. ${quoteDetails.scope || ""}. ${quoteDetails.propertyInfo || ""}.`
      : "";

    let systemPrompt: string;
    let userPrompt: string;

    const paymentInfo = paymentMethodsText ? ` Mention accepted payment methods: ${paymentMethodsText}.` : "";

    const langInstruction = commLang === "es" ? " Write entirely in Spanish." : " Write entirely in English.";

    if (type === "sms") {
      systemPrompt = `Write a short SMS (under 160 chars) for a cleaning company called "${companyName || "our company"}". Sign as "${senderName || "Team"}". No hours/time estimates. No emojis. Be friendly but brief.${bookingLink ? ` Include link: ${bookingLink}` : ""}${quoteLink ? ` Include this quote link for the customer to view and accept: ${quoteLink}` : ""}${langInstruction}`;
      userPrompt = `SMS for ${purposeInstruction}. Customer: ${customerName || "Customer"}.${quoteContext}${paymentInfo} Reply with ONLY the message text, nothing else.`;
    } else {
      systemPrompt = `Write a short professional email (under 150 words) for "${companyName || "our company"}". Sign as "${senderName || "Team"}". No hours/time estimates. No emojis.${bookingLink ? ` Include link: ${bookingLink}` : ""}${quoteLink ? ` Do NOT include the raw URL in the email body. Instead, write a sentence like "You can view and accept your quote by clicking the link below." A styled button with the link will be automatically added after your email.` : ""} Start with "Subject: " on line 1, blank line, then body.${langInstruction}`;
      userPrompt = `Email for ${purposeInstruction}. Customer: ${customerName || "Customer"}.${quoteContext}${paymentInfo} Reply with ONLY the email, nothing else.`;
    }

    const content = await generateText({
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: type === "sms" ? 100 : 250,
    });

    if (!content) {
      return res.status(500).json({ message: "No response from AI" });
    }

    let draft = content.trim();
    if (draft.startsWith('"') && draft.endsWith('"')) {
      draft = draft.slice(1, -1);
    }
    if (draft.startsWith('{')) {
      try {
        const parsed = JSON.parse(draft);
        draft = parsed.draft || content;
      } catch {}
    }
    draft = draft.replace(/\\n/g, '\n');

    return res.json({ draft });
  } catch (error: any) {
    console.error("AI communication draft error:", error);
    return res.status(500).json({ message: "Failed to generate communication draft" });
  }
});

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type. Only JPEG, PNG, WEBP, and HEIC images are accepted."));
  },
});

router.post(
  "/ai/photo-to-quote",
  requireAuth,
  photoUpload.single("photo"),
  async (req: Request, res: Response) => {
    try {
      const user = await getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ message: "Not found" });

      const tier = user.subscriptionTier ?? "free";
      const used = (user as any).photoQuotesUsedThisMonth ?? 0;
      const limits: Record<string, number> = { free: 0, starter: 3, growth: 20, pro: Infinity };
      const limit = limits[tier] ?? 0;

      if (used >= limit) {
        const upgradeMsg =
          tier === "free"
            ? "Photo-to-Quote requires a Starter plan or higher."
            : tier === "starter"
            ? "You've used all 3 photo quotes this month. Upgrade to Growth for 20/month."
            : `You've used all ${limit} photo quotes this month. Upgrade to Pro for unlimited.`;
        return res.status(403).json({
          error: "limit_reached",
          message: upgradeMsg,
          used,
          limit,
          upgradeUrl: "/pricing",
        });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No photo uploaded." });
      }

      const { buffer, mimetype } = req.file;
      const propertyType = (req.body.propertyType as string) || "residential";

      const base64 = buffer.toString("base64");
      const mediaType = (
        mimetype === "image/heic" || mimetype === "image/heif" ? "image/jpeg" : mimetype
      ) as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

      const visionResponse = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 800,
        system:
          "You are an expert cleaning estimator with 20 years experience. " +
          "Analyze photos and estimate cleaning requirements accurately. " +
          "Always respond with valid JSON only — no markdown, no explanation.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: "text",
                text: `Analyze this photo of a ${propertyType} space to be cleaned. Estimate:
1. Space type (bedroom, bathroom, kitchen, living room, office, etc.)
2. Approximate square footage
3. Cleanliness level (light/standard/deep clean needed) — be specific about what you see
4. Estimated cleaning time in hours (give a range)
5. Suggested price range in USD based on US ${propertyType} cleaning rates ($25-45/hr)
6. Key observations (pet hair, clutter level, surface types visible)

Respond ONLY with valid JSON in this exact format:
{
  "spaceType": string,
  "estimatedSqft": number,
  "cleanLevel": "light" | "standard" | "deep",
  "timeRangeHours": { "min": number, "max": number },
  "priceRange": { "min": number, "max": number },
  "observations": string[],
  "confidence": "low" | "medium" | "high"
}`,
              },
            ],
          },
        ],
      });

      const rawText = (visionResponse.content[0] as any).text?.trim() ?? "";

      const jsonText = rawText.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "");
      let parsed: any;
      try {
        parsed = JSON.parse(jsonText);
      } catch {
        console.error("[photo-to-quote] Invalid JSON from Claude:", rawText.slice(0, 200));
        return res.status(500).json({ message: "AI returned an unexpected response. Please try again." });
      }

      await pool.query(
        "UPDATE users SET photo_quotes_used_this_month = photo_quotes_used_this_month + 1 WHERE id = $1",
        [user.id]
      );

      await trackEvent(user.id, "PHOTO_TO_QUOTE_USED" as any, {
        spaceType: parsed.spaceType,
        cleanLevel: parsed.cleanLevel,
        confidence: parsed.confidence,
        propertyType,
      });

      return res.json(parsed);
    } catch (err: any) {
      if (err.message?.includes("Invalid file type")) {
        return res.status(400).json({ message: err.message });
      }
      console.error("[photo-to-quote] error:", err?.message || err);
      return res.status(500).json({ message: "Failed to analyze photo. Please try again." });
    }
  }
);

export default router;
