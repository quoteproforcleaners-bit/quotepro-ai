export type MessageDirection = "inbound" | "outbound";

export type MessageIntent =
  | "new_quote_request"
  | "faq"
  | "quote_followup"
  | "objection"
  | "scheduling"
  | "service_area_check"
  | "commercial_request"
  | "angry_or_frustrated"
  | "human_request"
  | "unknown";

export type AiStatus = "active" | "paused" | "disabled";
export type HandoffStatus = "ai" | "human" | "pending_handoff";
export type ConversationState =
  | "idle"
  | "qualifying"
  | "intake"
  | "faq"
  | "quote_followup"
  | "handoff"
  | "complete";

export interface LinqInboundEvent {
  type: string;
  messageId?: string;
  from: string;
  to: string;
  body: string;
  timestamp?: string;
  workspaceId?: string;
  conversationId?: string;
  raw?: Record<string, any>;
}

export interface ClassificationResult {
  intent: MessageIntent;
  confidence: number;
  reasoning: string;
  requiresHandoff: boolean;
}

export interface IntakeField {
  key: string;
  question: string;
  required: boolean;
}

export interface IntakeProgress {
  completionScore: number;
  nextQuestion: string | null;
  isComplete: boolean;
  collectedFields: Record<string, string>;
}

export interface OrchestratorResult {
  reply: string | null;
  updatedState: ConversationState;
  handoffTriggered: boolean;
  intakeSaved: boolean;
  quoteCreated: boolean;
  confidence: number;
  intent: MessageIntent;
}
