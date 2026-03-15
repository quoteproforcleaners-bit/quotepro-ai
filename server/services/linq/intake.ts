export interface IntakeSession {
  serviceType?: string;
  zipCode?: string;
  city?: string;
  squareFootage?: string;
  bedrooms?: string;
  bathrooms?: string;
  pets?: string;
  lastCleaned?: string;
  frequency?: string;
  preferredDate?: string;
  notes?: string;
}

export interface IntakeStep {
  field: keyof IntakeSession;
  question: string;
  required: boolean;
}

export const INTAKE_STEPS: IntakeStep[] = [
  { field: "zipCode", question: "What's your ZIP code?", required: true },
  { field: "serviceType", question: "What type of cleaning are you looking for? (standard, deep clean, move-out, etc.)", required: true },
  { field: "bedrooms", question: "How many bedrooms?", required: true },
  { field: "bathrooms", question: "How many bathrooms?", required: true },
  { field: "squareFootage", question: "Approximately how many square feet is your home? (rough estimate is fine)", required: false },
  { field: "pets", question: "Do you have any pets?", required: false },
  { field: "lastCleaned", question: "When was the home last professionally cleaned?", required: false },
  { field: "frequency", question: "Are you looking for a one-time clean or recurring service?", required: true },
  { field: "preferredDate", question: "What date works best for you? (or a general time frame)", required: false },
];

export function getNextIntakeQuestion(session: IntakeSession): IntakeStep | null {
  for (const step of INTAKE_STEPS) {
    if (!session[step.field]) return step;
  }
  return null;
}

export function calculateCompletionScore(session: IntakeSession): number {
  const required = INTAKE_STEPS.filter((s) => s.required);
  const optional = INTAKE_STEPS.filter((s) => !s.required);

  let score = 0;
  for (const step of required) {
    if (session[step.field]) score += 12;
  }
  for (const step of optional) {
    if (session[step.field]) score += 5;
  }

  return Math.min(100, score);
}

export function isIntakeComplete(session: IntakeSession): boolean {
  const requiredFields = INTAKE_STEPS.filter((s) => s.required).map((s) => s.field);
  return requiredFields.every((f) => !!session[f]);
}

export function extractIntakeFieldFromMessage(
  message: string,
  field: keyof IntakeSession
): string | null {
  const lower = message.toLowerCase().trim();

  if (field === "zipCode") {
    const match = message.match(/\b\d{5}(?:-\d{4})?\b/);
    return match ? match[0] : null;
  }
  if (field === "bedrooms") {
    const match = lower.match(/\b([1-9]|studio|one|two|three|four|five)\b/);
    if (!match) return null;
    const map: Record<string, string> = { one: "1", two: "2", three: "3", four: "4", five: "5", studio: "0" };
    return map[match[1]] || match[1];
  }
  if (field === "bathrooms") {
    const match = lower.match(/\b([1-9](?:\.[05])?|one|two|three|four)\b/);
    if (!match) return null;
    const map: Record<string, string> = { one: "1", two: "2", three: "3", four: "4" };
    return map[match[1]] || match[1];
  }
  if (field === "squareFootage") {
    const match = message.match(/\b(\d{3,4})\b/);
    return match ? match[1] : null;
  }
  if (field === "pets") {
    if (/\bno\b|none|no pet/i.test(lower)) return "no";
    if (/\byes\b|dog|cat|pet/i.test(lower)) return "yes";
    return null;
  }
  if (field === "frequency") {
    if (/week/i.test(lower)) return "weekly";
    if (/bi.?week|every.?two.?week/i.test(lower)) return "bi-weekly";
    if (/month/i.test(lower)) return "monthly";
    if (/one.?time|once|just.?one/i.test(lower)) return "one-time";
    return null;
  }
  if (field === "serviceType") {
    if (/move.?out|move out/i.test(lower)) return "move-out";
    if (/move.?in|move in/i.test(lower)) return "move-in";
    if (/deep/i.test(lower)) return "deep clean";
    if (/standard|regular|basic/i.test(lower)) return "standard";
    if (lower.length > 2) return lower;
    return null;
  }

  return message.trim().length > 0 ? message.trim() : null;
}
