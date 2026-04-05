import { anthropic } from "../../clients";

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
  urgency: "high" | "medium" | "low";
  reason: string;
}

// ─── Pre-filter: cheap keyword check before calling AI ────────────────────────

const STRONG_YES_PATTERNS = [
  /\b(looking for|need|want|searching for|recommend|recommendations?|anyone know)\b.{0,30}\b(cleaner|cleaning service|maid|house cleaner|cleaning company)\b/i,
  /\b(cleaner|cleaning service|maid service)\b.{0,20}\b(recommendations?|recommend|reliable|good|trustworthy|near me|in my area)\b/i,
  /\b(hire|hiring)\b.{0,20}\b(cleaner|cleaning|maid)\b/i,
  /\b(move.?out|move.?in|deep clean)\b.{0,30}\b(clean|service|recommend|help)\b/i,
  /\b(biweekly|bi-weekly|weekly|recurring|regular)\b.{0,20}\b(clean|maid|cleaner)\b/i,
  /\b(cleaning quote|quote for cleaning|cleaning estimate)\b/i,
  /who do you use for cleaning/i,
  /\bclean(er|ing) lady\b/i,
  /\bairbnb clean/i,
];

const STRONG_NO_PATTERNS = [
  /\bI (clean|cleaned|am cleaning|do the cleaning)\b/i,
  /\b(hiring|looking for work|seeking (employment|job|clients))\b.{0,30}\bcleaner?\b/i,
  /\b(DIY|do it yourself)\b.{0,30}\bclean/i,
  /\bI am a (cleaner|maid|cleaning professional)\b/i,
  /\b(political|computer|database|code|data) cleaning\b/i,
];

function preFilter(title: string, body: string): "strong_yes" | "strong_no" | "needs_ai" {
  const text = `${title} ${body}`.toLowerCase();

  for (const pattern of STRONG_NO_PATTERNS) {
    if (pattern.test(text)) return "strong_no";
  }

  for (const pattern of STRONG_YES_PATTERNS) {
    if (pattern.test(text)) return "strong_yes";
  }

  return "needs_ai";
}

function detectUrgency(title: string, body: string): "high" | "medium" | "low" {
  const text = `${title} ${body}`.toLowerCase();
  if (
    /\b(asap|urgent|immediately|end of (month|week)|moving (out|in) (soon|this week|next week|this month)|need by|deadline|today|tomorrow|move out|this weekend)\b/.test(text)
  ) return "high";
  if (/\b(soon|shortly|upcoming|planning to|considering|next month|biweekly|recurring)\b/.test(text)) return "medium";
  return "low";
}

const SYSTEM_PROMPT = `You are a lead classification assistant for a residential cleaning business.

Your job is to determine if a post is from a potential customer who is looking for cleaning services.

Classify as "yes" if the post is:
- Someone asking for cleaner/maid service recommendations or referrals
- Someone requesting a quote or price for house cleaning
- Someone looking for recurring, deep clean, move-in, or move-out cleaning
- Someone who wants to hire a cleaner or cleaning company
- Clear buying intent for any residential cleaning service

Classify as "maybe" if:
- The person is researching cleaning services (asking about prices, what to expect)
- They seem interested but haven't committed to hiring yet
- Location or timeline is unclear but intent seems genuine
- Tangentially related — could realistically be converted with outreach

Classify as "no" ONLY if:
- It's clearly someone cleaning their own home with no intent to hire
- A cleaner advertising their services
- A joke, meme, or irrelevant use of "clean"
- Commercial/janitorial job postings
- News articles with no buying intent

When in doubt between "maybe" and "no", choose "maybe" — an extra lead to evaluate is better than missing a real customer.

Respond ONLY with valid JSON:
{
  "classification": "yes" | "maybe" | "no",
  "confidence": 0-100,
  "intent": "recommendation_request" | "quote_request" | "recurring_cleaning" | "deep_clean" | "move_out" | "move_in" | "one_time_clean" | "other",
  "detectedLocation": "city name or empty string",
  "urgency": "high" | "medium" | "low",
  "reason": "one sentence explanation"
}`;

export async function classifyLead(
  title: string,
  body: string,
  subreddit: string
): Promise<ClassificationResult | null> {
  // Pre-filter with patterns first (fast, no AI call)
  const preResult = preFilter(title, body);

  if (preResult === "strong_no") {
    return {
      classification: "no",
      confidence: 90,
      intent: "other",
      detectedLocation: "",
      urgency: "low",
      reason: "Pre-filter: clear non-lead signal",
    };
  }

  if (preResult === "strong_yes") {
    // Still call AI to get intent + location, but set classification to yes
    const urgency = detectUrgency(title, body);
    try {
      const content = `Subreddit: r/${subreddit}\nTitle: ${title}\n\n${body.slice(0, 600)}`;
      const completion = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
        max_tokens: 200,
      });
      const raw = (completion.content[0] as any).text;
      if (!raw) {
        return {
          classification: "yes",
          confidence: 80,
          intent: "recommendation_request",
          detectedLocation: "",
          urgency,
          reason: "Strong keyword match — likely cleaning lead",
        };
      }
      const parsed = JSON.parse(raw);
      return {
        classification: "yes",
        confidence: Math.max(70, Math.min(100, Number(parsed.confidence) || 80)),
        intent: parsed.intent ?? "recommendation_request",
        detectedLocation: parsed.detectedLocation ?? "",
        urgency: (parsed.urgency as any) ?? urgency,
        reason: parsed.reason ?? "Strong keyword match",
      };
    } catch {
      return {
        classification: "yes",
        confidence: 80,
        intent: "recommendation_request",
        detectedLocation: "",
        urgency,
        reason: "Strong keyword match — likely cleaning lead",
      };
    }
  }

  // needs_ai: call OpenAI for full classification
  const content = `Subreddit: r/${subreddit}\nTitle: ${title}\n\n${body.slice(0, 800)}`;
  try {
    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      max_tokens: 200,
    });

    const raw = (completion.content[0] as any).text;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const urgency = (parsed.urgency as any) ?? detectUrgency(title, body);
    return {
      classification: parsed.classification ?? "no",
      confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
      intent: parsed.intent ?? "other",
      detectedLocation: parsed.detectedLocation ?? "",
      urgency,
      reason: parsed.reason ?? "",
    };
  } catch (e) {
    console.error("[classifier] Error:", e);
    return null;
  }
}

export function shouldStoreLead(result: ClassificationResult): boolean {
  if (result.classification === "yes") return true;
  // Accept maybes with lower confidence threshold — better to show more leads
  if (result.classification === "maybe" && result.confidence >= 30) return true;
  return false;
}
