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

  // ─── Intent scoring ────────────────────────────────────────────────────────
  if (intent === "recommendation_request" || intent === "quote_request") {
    breakdown["Direct request for a cleaner"] = 45;
    score += 45;
  } else if (intent === "recurring_cleaning") {
    breakdown["Recurring cleaning request"] = 40;
    score += 40;
  } else if (intent === "move_out" || intent === "move_in") {
    breakdown["Move-in/out cleaning"] = 35;
    score += 35;
  } else if (intent === "deep_clean") {
    breakdown["Deep clean request"] = 30;
    score += 30;
  } else if (intent === "one_time_clean") {
    breakdown["One-time cleaning"] = 20;
    score += 20;
  } else if (intent !== "other") {
    breakdown["Clear cleaning intent"] = 15;
    score += 15;
  }

  // ─── Location clarity ──────────────────────────────────────────────────────
  if (classification.detectedLocation && classification.detectedLocation.length > 1) {
    breakdown["Location detected"] = 15;
    score += 15;
  }

  // ─── Urgency bonus ─────────────────────────────────────────────────────────
  if (classification.urgency === "high") {
    breakdown["Urgent / time-sensitive"] = 15;
    score += 15;
  } else if (classification.urgency === "medium") {
    breakdown["Planning to hire soon"] = 8;
    score += 8;
  }

  // ─── Recency ───────────────────────────────────────────────────────────────
  const hoursOld = (Date.now() - postedAt.getTime()) / (1000 * 60 * 60);
  if (hoursOld < 6) {
    breakdown["Posted in last 6 hours"] = 15;
    score += 15;
  } else if (hoursOld < 24) {
    breakdown["Posted today"] = 10;
    score += 10;
  } else if (hoursOld < 72) {
    breakdown["Posted in last 3 days"] = 5;
    score += 5;
  }

  // ─── AI confidence bonus ───────────────────────────────────────────────────
  const confidenceBonus = Math.floor((classification.confidence - 60) / 10);
  if (confidenceBonus > 0) {
    breakdown["High AI confidence"] = confidenceBonus;
    score += confidenceBonus;
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown,
  };
}

export function getQualityLabel(score: number): { label: string; tier: "high" | "medium" | "low" } {
  if (score >= 70) return { label: "High Intent", tier: "high" };
  if (score >= 40) return { label: "Medium Intent", tier: "medium" };
  return { label: "Low Intent", tier: "low" };
}
