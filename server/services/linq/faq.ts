import type { AiQuoteAssistantSettings } from "../../../shared/schema";

export interface FaqEntry {
  key: string;
  question: string;
  defaultAnswer: string;
}

export const DEFAULT_FAQS: FaqEntry[] = [
  {
    key: "supplies",
    question: "Do you bring your own supplies?",
    defaultAnswer: "Yes! We bring all cleaning supplies and equipment. You don't need to provide anything.",
  },
  {
    key: "insured",
    question: "Are you insured?",
    defaultAnswer: "Yes, we are fully insured and bonded for your peace of mind.",
  },
  {
    key: "service_area",
    question: "Do you service my area?",
    defaultAnswer: "We'd love to help! Could you share your zip code so we can confirm we cover your area?",
  },
  {
    key: "move_out",
    question: "Do you do move-out cleans?",
    defaultAnswer: "Yes! Move-out cleans are one of our specialties. We can do a thorough deep clean to help you get your deposit back.",
  },
  {
    key: "included",
    question: "What is included in a cleaning?",
    defaultAnswer: "Our standard clean includes all rooms, bathrooms, kitchen, and common areas. Dusting, vacuuming, mopping, and sanitizing surfaces are all included. Deep cleans and add-ons are also available.",
  },
  {
    key: "vacuum",
    question: "Do you bring your own vacuum?",
    defaultAnswer: "Yes, we bring all of our own equipment including vacuums.",
  },
  {
    key: "recurring",
    question: "Do you offer recurring service?",
    defaultAnswer: "Yes! We offer weekly, bi-weekly, and monthly recurring service with discounts for regular customers.",
  },
  {
    key: "price",
    question: "How much does it cost?",
    defaultAnswer: "Pricing depends on the size of your home and the type of clean. Let me gather a few details to give you an accurate quote — it only takes a minute!",
  },
  {
    key: "cancel",
    question: "What is your cancellation policy?",
    defaultAnswer: "We ask for at least 24 hours notice for cancellations. Last-minute cancellations may incur a small fee.",
  },
];

export function matchFaq(
  message: string,
  settings: AiQuoteAssistantSettings | null
): { answer: string; confidence: number } | null {
  if (!settings?.allowFaqAutoAnswers) return null;

  const overrides: Record<string, string> = (settings?.faqOverrides as any) || {};
  const lower = message.toLowerCase();

  const matches: Array<{ faq: FaqEntry; score: number }> = [];

  for (const faq of DEFAULT_FAQS) {
    let score = 0;
    const keywords = faq.question.toLowerCase().split(/\s+/);
    for (const kw of keywords) {
      if (kw.length > 3 && lower.includes(kw)) score += 1;
    }
    if (score > 0) matches.push({ faq, score });
  }

  if (matches.length === 0) return null;

  matches.sort((a, b) => b.score - a.score);
  const best = matches[0];
  const confidence = Math.min(95, 50 + best.score * 15);

  const answer = overrides[best.faq.key] || best.faq.defaultAnswer;
  return { answer, confidence };
}
