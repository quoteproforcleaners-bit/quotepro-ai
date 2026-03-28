// Shared message templates for SMS and email outreach.
// Import from here instead of defining templates inline in individual screens.

// ─── Dormant customer outreach ─────────────────────────────────────────────

export function getDormantSmsTemplate(firstName: string, senderName: string): string {
  return `Hi ${firstName}! It's been a while since your last cleaning. We'd love to have you back - mention this message for a special returning client offer! - ${senderName}`;
}

export function getDormantEmailTemplate(
  firstName: string,
  senderName: string
): { subject: string; body: string } {
  return {
    subject: `We miss you, ${firstName}!`,
    body: `Hi ${firstName},\n\nIt's been a while since we last cleaned for you, and we wanted to reach out! We'd love to get you back on the schedule.\n\nMention this email for a special returning client offer.\n\nBest,\n${senderName}`,
  };
}

// ─── Lost quote recovery ───────────────────────────────────────────────────

export function getLostSmsTemplate(
  firstName: string,
  quoteTotal: number,
  senderName: string
): string {
  return `Hi ${firstName}! I noticed the quote I sent for $${quoteTotal} didn't work out. Would you like me to put together something different? - ${senderName}`;
}

export function getLostEmailTemplate(
  firstName: string,
  quoteTotal: number,
  senderName: string
): { subject: string; body: string } {
  return {
    subject: "Let's revisit your cleaning quote",
    body: `Hi ${firstName},\n\nI wanted to reach out about the cleaning quote for $${quoteTotal} that I sent over. I understand it may not have been the right fit at the time.\n\nI'd love the chance to put together something that works better for you. Whether it's adjusting the scope, frequency, or pricing, I'm happy to make it work.\n\nJust reply to this email and we can get started.\n\nBest,\n${senderName}`,
  };
}

// ─── Review request ────────────────────────────────────────────────────────

const REVIEW_REQUEST_LINES: Record<string, string> = {
  en: "After your service, would you mind leaving a quick review?",
  es: "Después de su servicio, ¿le importaría dejarnos una reseña rápida?",
  pt: "Após o serviço, você se importaria de deixar uma avaliação rápida?",
  ru: "После обслуживания, не могли бы вы оставить быстрый отзыв?",
};

export function getReviewRequestSms(
  customerName: string,
  reviewLink: string,
  senderName: string,
  language?: string
): string {
  const line = REVIEW_REQUEST_LINES[language || "en"] || REVIEW_REQUEST_LINES.en;
  return `Hi ${customerName}! ${line} ${reviewLink}`;
}

// ─── Job update prompt builder ─────────────────────────────────────────────
// Returns the system prompt sent to the AI for generating a job update message.
// The actual AI call is made server-side via POST /api/ai/job-update-message.

export function buildJobUpdatePrompt(
  type: "sms" | "email",
  customerName: string,
  companyName: string,
  senderName: string,
  updateLink: string,
  language?: string
): string {
  const name = customerName || "there";
  const sender = senderName || "your cleaning team";
  const company = companyName || "our company";
  const linkPart = updateLink ? ` Track it live: ${updateLink}` : "";

  const STATUS_CONTEXT: Record<string, string> = {
    en_route: `We are on our way and will arrive shortly.${linkPart}`,
    started: `We have arrived and are getting started on your home.${linkPart}`,
    in_progress: `We are currently cleaning your home and making great progress.${linkPart}`,
    completed: `We have finished cleaning your home — everything looks great!${linkPart}`,
    sms: `Your live service update page is ready.${linkPart}`,
  };

  const langNote = language && language !== "en" ? ` Respond in the language matching locale: ${language}.` : "";
  const isSmsType = type === "sms";
  return isSmsType
    ? `Write a very short SMS (2-3 sentences max) for a cleaning company. No emojis. Be warm but extremely brief. Start with "Hi ${name}, this is ${sender} from ${company}." Then one short sentence about the update. Nothing else.${langNote}`
    : `Write a short, warm text message (3-5 sentences) that a cleaner would send to a customer. No subject line. No emojis. No formal email format. Sign off with just "${sender}". Start with "Hi ${name}," — do NOT use email structure.${langNote}`;
}
