import type { ClassificationResult } from "./classifier";

export interface ScoreResult {
  score: number;
  breakdown: Record<string, number>;
}

export function scoreLead(
  classification: ClassificationResult,
  postedAt: Date
): ScoreResult {
  const breakdown: Record<string, number> = {};
  let score = 0;

  const intent = classification.intent;
  const isExplicitRequest =
    intent === "recommendation_request" || intent === "quote_request";

  if (isExplicitRequest) {
    breakdown["Explicitly asking for a cleaner"] = 50;
    score += 50;
  } else if (intent !== "other") {
    breakdown["Clear cleaning intent"] = 20;
    score += 20;
  }

  if (classification.detectedLocation && classification.detectedLocation.length > 1) {
    breakdown["Location detected"] = 20;
    score += 20;
  }

  if (intent === "recurring_cleaning") {
    breakdown["Recurring cleaning request"] = 15;
    score += 15;
  }

  if (intent === "move_out" || intent === "deep_clean") {
    breakdown["High-value service type"] = 10;
    score += 10;
  }

  if (intent === "move_in") {
    breakdown["Move-in clean"] = 8;
    score += 8;
  }

  const hoursOld = (Date.now() - postedAt.getTime()) / (1000 * 60 * 60);
  if (hoursOld < 24) {
    breakdown["Posted in last 24 hours"] = 10;
    score += 10;
  }

  const confidenceBonus = Math.floor((classification.confidence - 50) / 10);
  if (confidenceBonus > 0) {
    breakdown["AI confidence bonus"] = confidenceBonus;
    score += confidenceBonus;
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown,
  };
}
