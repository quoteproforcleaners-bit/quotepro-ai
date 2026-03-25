import OpenAI from "openai";
import { pool } from "./db";
import { openai } from "./clients";

/* ─── Typed Error ─────────────────────────────────────────────────────────── */

export class AIError extends Error {
  code: string;
  retryable: boolean;
  statusCode?: number;

  constructor(code: string, message: string, retryable: boolean, statusCode?: number) {
    super(message);
    this.name = "AIError";
    this.code = code;
    this.retryable = retryable;
    this.statusCode = statusCode;
  }
}

/* ─── Retry config ────────────────────────────────────────────────────────── */

const RETRYABLE_STATUS = new Set([429, 500, 502, 503]);
const NON_RETRYABLE_STATUS = new Set([400, 401]);
const MAX_RETRIES = 2;
const BACKOFF_MS = [1000, 2000];
const TIMEOUT_MS = 15_000;

/* ─── Log to DB ───────────────────────────────────────────────────────────── */

async function logUsage(params: {
  userId?: string;
  route?: string;
  tokensUsed: number;
  responseTimeMs: number;
  success: boolean;
  errorCode?: string;
}) {
  try {
    await pool.query(
      `INSERT INTO ai_usage_logs (user_id, route, tokens_used, response_time_ms, success, error_code, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        params.userId ?? null,
        params.route ?? null,
        params.tokensUsed,
        params.responseTimeMs,
        params.success,
        params.errorCode ?? null,
      ]
    );
  } catch (err: any) {
    // Never crash on logging failure
    console.warn("[aiClient] Log write failed:", err.message);
  }
}

/* ─── Main callAI function ────────────────────────────────────────────────── */

export interface CallAIOptions {
  model?: string;
  maxTokens?: number;
  responseFormat?: "json_object" | "text";
  userId?: string;
  route?: string;
}

export async function callAI(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: CallAIOptions = {}
): Promise<{ content: string; tokensUsed: number }> {
  const {
    model = "gpt-4o-mini",
    maxTokens,
    responseFormat,
    userId,
    route = "unknown",
  } = options;

  let lastError: AIError | null = null;
  const startMs = Date.now();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const attemptStart = Date.now();

    // Exponential backoff (skip on first attempt)
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
        model,
        messages,
        ...(maxTokens ? { max_completion_tokens: maxTokens } : {}),
        ...(responseFormat ? { response_format: { type: responseFormat } } : {}),
      };

      const completion = await openai.chat.completions.create(params, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - attemptStart;
      const tokensUsed = completion.usage?.total_tokens ?? 0;
      const content = completion.choices[0]?.message?.content?.trim() ?? "";

      await logUsage({ userId, route, tokensUsed, responseTimeMs, success: true });

      if (attempt > 0) {
        console.log(`[aiClient] ${route} succeeded on attempt ${attempt + 1} (${responseTimeMs}ms)`);
      }

      return { content, tokensUsed };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const responseTimeMs = Date.now() - attemptStart;

      let code = "unknown";
      let statusCode: number | undefined;
      let retryable = false;
      let message = "AI request failed";

      if (err.name === "AbortError" || err.code === "ECONNABORTED") {
        code = "timeout";
        message = "AI request timed out after 15 seconds";
        retryable = attempt < MAX_RETRIES;
      } else if (err.status) {
        statusCode = err.status;
        code = `http_${err.status}`;
        message = err.message || `HTTP ${err.status}`;
        retryable = RETRYABLE_STATUS.has(err.status) && !NON_RETRYABLE_STATUS.has(err.status) && attempt < MAX_RETRIES;
      } else {
        code = err.code || "unknown";
        message = err.message || "Unknown AI error";
        retryable = attempt < MAX_RETRIES;
      }

      console.error(
        `[aiClient] ${route} attempt ${attempt + 1} failed: code=${code} status=${statusCode ?? "n/a"} time=${responseTimeMs}ms error=${message}`
      );

      await logUsage({ userId, route, tokensUsed: 0, responseTimeMs, success: false, errorCode: code });

      lastError = new AIError(code, message, retryable, statusCode);

      if (!retryable) break;
    }
  }

  throw lastError ?? new AIError("unknown", "AI request failed", false);
}
