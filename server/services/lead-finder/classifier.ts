import OpenAI from "openai";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export interface ClassificationResult {
  classification: "yes" | "maybe" | "no";
  confidence: number;
  intent:
    | "recommendation_request"
    | "quote_request"
    | "recurring_cleaning"
    | "deep_clean"
    | "move_out"
    | "move_in"
    | "one_time_clean"
    | "other";
  detectedLocation: string;
  reason: string;
}

const SYSTEM_PROMPT = `You are a lead classification assistant for a residential cleaning business.

Your job is to determine if a Reddit post is from a real potential customer who is looking for residential cleaning services.

Classify as "yes" if the post is:
- Someone asking for cleaner/maid service recommendations
- Someone requesting a quote for house cleaning
- Someone looking for recurring, deep clean, move-in, or move-out cleaning
- Clear buying intent for residential cleaning

Classify as "maybe" if the post:
- Could be a cleaning lead but is ambiguous
- Asks general questions about cleaning services/prices without clear location
- Is tangentially related (e.g. "what do you tip cleaners?")

Classify as "no" if the post is:
- A joke, meme, or sarcastic comment
- Someone talking about cleaning their own home themselves
- A job seeker advertising cleaning services
- B2B, commercial, or janitorial company hiring
- A news article or discussion with no buying intent
- Irrelevant use of the word "cleaning" (e.g. computer cleaning, political cleaning)
- Someone complaining about a cleaner they already have

Be conservative. When in doubt between "maybe" and "no", pick "no".
Only "yes" or strong "maybe" posts are worth showing as leads.

Respond ONLY with valid JSON in this exact format:
{
  "classification": "yes" | "maybe" | "no",
  "confidence": 0-100,
  "intent": "recommendation_request" | "quote_request" | "recurring_cleaning" | "deep_clean" | "move_out" | "move_in" | "one_time_clean" | "other",
  "detectedLocation": "city name or empty string",
  "reason": "one sentence explanation"
}`;

export async function classifyLead(
  title: string,
  body: string,
  subreddit: string
): Promise<ClassificationResult | null> {
  const content = `Subreddit: r/${subreddit}\nTitle: ${title}\n\n${body.slice(0, 800)}`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content },
      ],
      max_completion_tokens: 200,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return {
      classification: parsed.classification ?? "no",
      confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
      intent: parsed.intent ?? "other",
      detectedLocation: parsed.detectedLocation ?? "",
      reason: parsed.reason ?? "",
    };
  } catch (e) {
    console.error("[classifier] Error:", e);
    return null;
  }
}

export function shouldStoreLead(result: ClassificationResult): boolean {
  if (result.classification === "yes") return true;
  if (result.classification === "maybe" && result.confidence >= 40) return true;
  return false;
}
