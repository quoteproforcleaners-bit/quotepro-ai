/**
 * web/src/lib/analytics.ts
 * Client-side analytics tracking for the QuotePro web app.
 *
 * - Posts to /api/analytics/events (same endpoint mobile uses)
 * - Offline queue: events held in localStorage if offline, flushed on reconnect
 * - Never throws
 */

import { AnalyticsEvents, type AnalyticsEventName } from "../../../shared/analytics-events";

export { AnalyticsEvents };

const QUEUE_KEY = "qp_analytics_queue";
const API_PATH = "/api/analytics/events";

interface QueuedEvent {
  eventName: string;
  properties: Record<string, any>;
  queuedAt: number;
}

function readQueue(): QueuedEvent[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedEvent[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-50)));
  } catch {}
}

function enqueue(ev: QueuedEvent): void {
  const q = readQueue();
  q.push(ev);
  writeQueue(q);
}

async function postEvent(eventName: string, properties: Record<string, any>): Promise<void> {
  const res = await fetch(API_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ eventName, properties }),
  });
  if (!res.ok) throw new Error(`analytics POST ${res.status}`);
}

async function flushQueue(): Promise<void> {
  const queue = readQueue();
  if (queue.length === 0) return;
  const failed: QueuedEvent[] = [];
  for (const ev of queue) {
    try {
      await postEvent(ev.eventName, ev.properties);
    } catch {
      failed.push(ev);
    }
  }
  writeQueue(failed);
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushQueue().catch(() => {});
  });
}

/**
 * Track a typed funnel event. Fire-and-forget — queues offline.
 */
export function track(
  event: AnalyticsEventName,
  properties?: Record<string, any>
): void {
  const props = { ...properties, timestamp: new Date().toISOString() };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    enqueue({ eventName: event, properties: props, queuedAt: Date.now() });
    return;
  }
  postEvent(event, props).catch(() => {
    enqueue({ eventName: event, properties: props, queuedAt: Date.now() });
  });

  if (import.meta.env.DEV) {
    console.log(`[Analytics] ${event}`, props);
  }
}

// ─── Backward-compatible legacy function ──────────────────────────────────────
type ToolkitEvent =
  | "toolkit_page_view"
  | "toolkit_email_signup"
  | "calculator_click"
  | "template_download"
  | "quotepro_trial_click";

export async function trackEvent(
  name: ToolkitEvent | string,
  params?: Record<string, any>
): Promise<void> {
  const payload = { ...params, timestamp: new Date().toISOString() };
  if (import.meta.env.DEV) {
    console.log(`[Analytics] ${name}`, payload);
  }
  try {
    await postEvent(name, payload);
  } catch {}
}
