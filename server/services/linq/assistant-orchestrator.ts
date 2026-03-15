import OpenAI from "openai";
import type { AiQuoteAssistantSettings } from "../../../shared/schema";
import type { ClassificationResult, MessageIntent, OrchestratorResult, ConversationState } from "./types";
import { matchFaq } from "./faq";
import { shouldHandoff, buildHandoffMessage } from "./handoff";
import {
  getNextIntakeQuestion,
  calculateCompletionScore,
  isIntakeComplete,
  extractIntakeFieldFromMessage,
  IntakeSession,
} from "./intake";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export async function classifyMessage(
  message: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  businessName: string
): Promise<ClassificationResult> {
  try {
    const systemPrompt = `You are a message classifier for ${businessName}, a cleaning business.
Classify the customer's message into ONE of these intents:
- new_quote_request: asking for a price, quote, or estimate
- faq: asking a common question (supplies, insurance, area, what's included, etc.)
- quote_followup: replying to or asking about an existing quote
- objection: price objection, negotiating, complaining about cost
- scheduling: asking about availability, dates, booking
- service_area_check: asking if you serve their area
- commercial_request: asking about office, commercial, or large-scale cleaning
- angry_or_frustrated: upset, frustrated, threatening, rude
- human_request: explicitly asking to speak to a person
- unknown: can't determine intent clearly

Respond only with valid JSON: { "intent": "...", "confidence": 0-100, "reasoning": "..." }`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-4).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const res = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.1,
      max_tokens: 200,
    });

    const raw = res.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    const intent = (parsed.intent || "unknown") as MessageIntent;
    const confidence = Number(parsed.confidence) || 50;
    const reasoning = parsed.reasoning || "";

    return {
      intent,
      confidence,
      reasoning,
      requiresHandoff: intent === "human_request" || intent === "angry_or_frustrated" || intent === "commercial_request",
    };
  } catch (e: any) {
    console.error("[orchestrator] classifyMessage failed:", e.message);
    return { intent: "unknown", confidence: 0, reasoning: "", requiresHandoff: false };
  }
}

export async function generateFaqReply(
  message: string,
  faqAnswer: string,
  businessName: string,
  tone: string
): Promise<string> {
  try {
    const res = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are the AI assistant for ${businessName}, a cleaning business. Tone: ${tone}. 
Write a short, friendly SMS reply based on the FAQ answer. Keep it under 2 sentences. Do NOT invent details.`,
        },
        { role: "user", content: `Customer asked: "${message}"\nUse this info to reply: ${faqAnswer}` },
      ],
      temperature: 0.4,
      max_tokens: 120,
    });
    return res.choices[0]?.message?.content?.trim() || faqAnswer;
  } catch {
    return faqAnswer;
  }
}

export async function generateIntroReply(businessName: string, tone: string): Promise<string> {
  return `Hi! Thanks for reaching out to ${businessName}. I'm here to help you get a quick cleaning quote. This will only take a minute! What's your ZIP code?`;
}

export async function generateSuggestedHumanReply(
  transcript: Array<{ role: "user" | "assistant"; content: string }>,
  businessName: string,
  context: { customerName?: string; intake?: IntakeSession }
): Promise<string> {
  const res = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a helpful assistant for ${businessName}, a residential cleaning company.
Draft a brief, professional SMS reply from the business owner. Keep it under 3 sentences.
Context: ${JSON.stringify(context)}`,
      },
      ...transcript.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: "Draft my reply:" },
    ],
    temperature: 0.5,
    max_tokens: 150,
  });
  return res.choices[0]?.message?.content?.trim() || "";
}

export async function orchestrate(params: {
  message: string;
  thread: {
    id: string;
    businessId: string;
    currentState: ConversationState;
    aiStatus: string;
    handoffStatus: string;
  };
  intake: IntakeSession;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  settings: AiQuoteAssistantSettings | null;
  businessName: string;
  businessPhone: string;
}): Promise<OrchestratorResult> {
  const { message, thread, intake, history, settings, businessName, businessPhone } = params;

  if (!settings?.enabled || !settings?.autoReplyEnabled || thread.aiStatus !== "active" || thread.handoffStatus === "human") {
    return { reply: null, updatedState: thread.currentState, handoffTriggered: false, intakeSaved: false, quoteCreated: false, confidence: 0, intent: "unknown" };
  }

  const classification = await classifyMessage(message, history, businessName);
  const tone = settings.businessTone || "professional";

  const handoffCheck = shouldHandoff(classification, settings);
  if (handoffCheck.handoff) {
    const reply = buildHandoffMessage(businessName, handoffCheck.reason);
    return { reply, updatedState: "handoff", handoffTriggered: true, intakeSaved: false, quoteCreated: false, confidence: classification.confidence, intent: classification.intent };
  }

  if (classification.intent === "faq" && settings.allowFaqAutoAnswers) {
    const faqMatch = matchFaq(message, settings);
    if (faqMatch && faqMatch.confidence >= (settings.lowConfidenceThreshold ?? 70)) {
      const reply = await generateFaqReply(message, faqMatch.answer, businessName, tone);
      return { reply, updatedState: "faq", handoffTriggered: false, intakeSaved: false, quoteCreated: false, confidence: faqMatch.confidence, intent: "faq" };
    }
  }

  if (
    classification.intent === "new_quote_request" ||
    thread.currentState === "intake" ||
    thread.currentState === "qualifying"
  ) {
    if (settings.allowIntakeAutomation) {
      const nextStep = getNextIntakeQuestion(intake);
      if (!nextStep && isIntakeComplete(intake)) {
        const completionScore = calculateCompletionScore(intake);
        return {
          reply: `Great, I have all the details I need! We'll prepare your quote and get back to you shortly. Thanks!`,
          updatedState: "complete",
          handoffTriggered: false,
          intakeSaved: true,
          quoteCreated: settings.autoCreateQuoteDraft ?? false,
          confidence: classification.confidence,
          intent: classification.intent,
        };
      }

      if (nextStep) {
        const extractedValue = extractIntakeFieldFromMessage(message, nextStep.field);
        const updatedIntake = extractedValue ? { ...intake, [nextStep.field]: extractedValue } : intake;
        const followupStep = getNextIntakeQuestion(updatedIntake);
        const reply = followupStep ? followupStep.question : `Great, I have all the details! We'll get your quote together shortly.`;
        return {
          reply,
          updatedState: "intake",
          handoffTriggered: false,
          intakeSaved: true,
          quoteCreated: !followupStep && (settings.autoCreateQuoteDraft ?? false),
          confidence: classification.confidence,
          intent: classification.intent,
        };
      }

      const introReply = await generateIntroReply(businessName, tone);
      return { reply: introReply, updatedState: "qualifying", handoffTriggered: false, intakeSaved: false, quoteCreated: false, confidence: classification.confidence, intent: classification.intent };
    }
  }

  return { reply: null, updatedState: thread.currentState, handoffTriggered: false, intakeSaved: false, quoteCreated: false, confidence: classification.confidence, intent: classification.intent };
}
