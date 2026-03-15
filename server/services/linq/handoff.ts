import type { AiQuoteAssistantSettings } from "../../../shared/schema";
import type { ClassificationResult } from "./types";

export function shouldHandoff(
  classification: ClassificationResult,
  settings: AiQuoteAssistantSettings | null
): { handoff: boolean; reason: string } {
  if (!settings) return { handoff: false, reason: "" };

  if (classification.intent === "human_request") {
    return { handoff: true, reason: "Customer requested a human" };
  }
  if (classification.intent === "angry_or_frustrated" && settings.requireHandoffOnAngry) {
    return { handoff: true, reason: "Customer appears upset" };
  }
  if (classification.intent === "objection" && settings.requireHandoffOnDiscount) {
    return { handoff: true, reason: "Possible discount or objection discussion" };
  }
  if (classification.intent === "commercial_request" && settings.requireHandoffOnCommercial) {
    return { handoff: true, reason: "Commercial cleaning request" };
  }
  if (
    settings.requireHandoffOnLowConfidence &&
    classification.confidence < (settings.lowConfidenceThreshold ?? 70)
  ) {
    return { handoff: true, reason: `Low AI confidence (${classification.confidence}%)` };
  }

  return { handoff: false, reason: "" };
}

export function buildHandoffMessage(businessName: string, reason: string): string {
  return (
    `Thanks for reaching out! One of our team members will be right with you to help. ` +
    `We'll be in touch shortly!`
  );
}
