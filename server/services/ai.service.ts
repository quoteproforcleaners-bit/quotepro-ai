/**
 * Unified AI service — single abstraction over the Anthropic SDK.
 * All AI calls in this codebase should go through generateText().
 * To switch models, change MODEL in one place.
 */

import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "../clients";

// ─── Model config ─────────────────────────────────────────────────────────────

export const MODEL = "claude-sonnet-4-5";

// Re-export the singleton so callers that need raw SDK access (e.g. vision
// calls with array content) can do so without importing from clients directly.
export { anthropic };

// ─── Types ────────────────────────────────────────────────────────────────────

export type TextMessage = {
  role: "user" | "assistant";
  content: string;
};

interface GenerateTextOptionsBase {
  system?: string;
  messages: TextMessage[];
  maxTokens?: number;
}

export interface GenerateTextOptionsNonStream extends GenerateTextOptionsBase {
  stream?: false;
}

export interface GenerateTextOptionsStream extends GenerateTextOptionsBase {
  stream: true;
}

// ─── JSON fence stripper ──────────────────────────────────────────────────────
/**
 * Strip Markdown code fences that Claude sometimes wraps JSON responses in.
 * e.g. ```json\n{...}\n``` → {...}
 * Safe to call on plain JSON strings — returns them unchanged.
 */
export function stripJsonFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

// ─── generateText overloads ───────────────────────────────────────────────────

export async function generateText(opts: GenerateTextOptionsStream): Promise<Anthropic.MessageStream>;
export async function generateText(opts: GenerateTextOptionsNonStream): Promise<string>;
export async function generateText(
  opts: GenerateTextOptionsBase & { stream?: boolean }
): Promise<string | Anthropic.MessageStream>;

/**
 * Generate text from Claude.
 *
 * - stream: false (default) → awaits the full response and returns a string.
 * - stream: true → returns the Anthropic MessageStream for the caller to iterate.
 *
 * Non-streaming calls include one automatic retry on HTTP 429 or 529
 * (rate limit / service overload) with a 2-second delay.
 */
export async function generateText({
  system,
  messages,
  maxTokens = 1000,
  stream = false,
}: GenerateTextOptionsBase & { stream?: boolean }): Promise<string | Anthropic.MessageStream> {
  const params = {
    model: MODEL,
    max_tokens: maxTokens,
    messages: messages as Anthropic.MessageParam[],
    ...(system ? { system } : {}),
  };

  if (stream) {
    return anthropic.messages.stream(params);
  }

  // Non-streaming: one retry on 429 / 529
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise<void>((r) => setTimeout(r, 2000));
    }
    try {
      const response = await anthropic.messages.create({ ...params, stream: false });
      return (response.content[0] as Anthropic.TextBlock).text?.trim() ?? "";
    } catch (err: any) {
      lastErr = err;
      if (err.status === 429 || err.status === 529) continue;
      throw err;
    }
  }
  throw lastErr;
}
