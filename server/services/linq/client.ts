/**
 * Linq API Client
 *
 * ASSUMPTIONS (update endpoint paths once Linq Zero API docs are confirmed):
 * - POST /messages  → send a message
 * - GET  /phone-numbers → list configured phone numbers
 * - Inbound events arrive via webhook POST (event.type = "message.inbound")
 *
 * Configure via environment variables:
 * LINQ_API_TOKEN     - Bearer token for Linq API
 * LINQ_BASE_URL      - e.g. https://api.linqapp.com/v1
 * LINQ_WEBHOOK_SECRET - used to verify webhook signature (if supported)
 * LINQ_ENVIRONMENT   - "sandbox" | "production"
 */

import type { LinqInboundEvent } from "./types";

function getLinqConfig() {
  const token = process.env.LINQ_API_TOKEN;
  const baseUrl = process.env.LINQ_BASE_URL || "https://api.linqapp.com/v1";
  const environment = process.env.LINQ_ENVIRONMENT || "sandbox";
  return { token, baseUrl, environment };
}

async function linqFetch(path: string, options: RequestInit = {}): Promise<any> {
  const { token, baseUrl } = getLinqConfig();
  if (!token) {
    throw new Error("LINQ_API_TOKEN is not configured");
  }

  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`[linq] ${options.method || "GET"} ${path} → ${res.status}`, body.slice(0, 300));
    throw new Error(`Linq API error ${res.status}: ${body.slice(0, 200)}`);
  }

  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export async function sendLinqMessage(params: {
  from: string;
  to: string;
  body: string;
  workspaceId?: string;
}): Promise<{ messageId?: string; success: boolean }> {
  const { environment } = getLinqConfig();
  if (environment === "sandbox") {
    console.log(`[linq][sandbox] sendMessage from=${params.from} to=${params.to}: ${params.body}`);
    return { messageId: `sandbox_${Date.now()}`, success: true };
  }

  const data = await linqFetch("/messages", {
    method: "POST",
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      body: params.body,
      ...(params.workspaceId ? { workspace_id: params.workspaceId } : {}),
    }),
  });

  return {
    messageId: data?.id || data?.messageId,
    success: true,
  };
}

export async function getLinqPhoneNumbers(workspaceId?: string): Promise<any[]> {
  const { environment } = getLinqConfig();
  if (environment === "sandbox") {
    return [{ id: "sandbox_num", phoneNumber: "+15550000000", displayName: "Sandbox Number", isPrimary: true }];
  }
  const path = workspaceId ? `/phone-numbers?workspace_id=${workspaceId}` : "/phone-numbers";
  const data = await linqFetch(path);
  return Array.isArray(data) ? data : data?.phoneNumbers ?? [];
}

export function parseLinqWebhookEvent(rawBody: any): LinqInboundEvent | null {
  try {
    const payload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    const type = payload?.type || payload?.event_type || "unknown";

    if (!["message.received", "message.inbound", "inbound_message", "message_received"].includes(type)) {
      return null;
    }

    const msg = payload?.message || payload?.data || payload;
    return {
      type,
      messageId: msg?.id || msg?.message_id,
      from: msg?.from || msg?.sender || "",
      to: msg?.to || msg?.recipient || "",
      body: msg?.body || msg?.text || msg?.content || "",
      timestamp: msg?.timestamp || msg?.created_at || new Date().toISOString(),
      workspaceId: payload?.workspace_id,
      conversationId: msg?.conversation_id || msg?.thread_id,
      raw: payload,
    };
  } catch (e) {
    console.error("[linq] Failed to parse webhook event:", e);
    return null;
  }
}

export function verifyLinqWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.LINQ_WEBHOOK_SECRET;
  if (!secret) return true;

  try {
    const crypto = require("crypto");
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    return signature === expected || signature === `sha256=${expected}`;
  } catch {
    return false;
  }
}

export function isLinqConfigured(): boolean {
  return !!(process.env.LINQ_API_TOKEN && process.env.LINQ_BASE_URL);
}
