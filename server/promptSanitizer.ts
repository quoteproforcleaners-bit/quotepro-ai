import { trackEvent } from "./helpers";

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions?/gi,
  /you\s+are\s+now\s+/gi,
  /forget\s+(all\s+)?previous/gi,
  /system\s*:/gi,
  /\[system\]/gi,
  /\[user\]/gi,
  /\[assistant\]/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /###\s*instruction/gi,
  /act\s+as\s+(if\s+you\s+are|a)\s+/gi,
  /pretend\s+(you\s+are|to\s+be)\s+/gi,
  /reveal\s+(your\s+)?(system\s+)?prompt/gi,
  /show\s+me\s+your\s+(system\s+)?instructions/gi,
];

const MAX_INPUT_LENGTH = 2000;

export function sanitizeForPrompt(input: string): string {
  if (typeof input !== "string") return "";
  let sanitized = input;
  INJECTION_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "[removed]");
  });
  return sanitized.slice(0, MAX_INPUT_LENGTH);
}

export function sanitizeAndLog(
  input: string,
  userId?: string,
  context?: string
): string {
  const sanitized = sanitizeForPrompt(input);
  const wasModified = sanitized !== input.slice(0, MAX_INPUT_LENGTH);
  if (wasModified && userId) {
    trackEvent(userId, "PROMPT_INJECTION_DETECTED", {
      context,
      originalSnippet: input.slice(0, 200),
    }).catch(() => {});
  }
  return sanitized;
}
