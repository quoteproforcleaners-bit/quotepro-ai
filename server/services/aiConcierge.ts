import { db, pool } from "../db";
import {
  quotes,
  businesses,
  customers,
  users,
  quoteAiConversations,
  quoteAiMessages,
  quoteNegotiationGuardrails,
  quoteAiIntentSignals,
  quoteAiProactiveEvents,
  bookings,
  rescheduleRequests,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { callAI } from "../aiClient";
import { sanitizeAndLog } from "../promptSanitizer";
import { isGrowthOrAbove, isProTier, isStarterOrAbove } from "../middleware";
import { trackEvent } from "../analytics";
import { AnalyticsEvents } from "@shared/analytics-events";

/* ─── Tier + language constants ──────────────────────────────────────────── */

export const SUPPORTED_LANGUAGES = ["en", "es", "pt", "zh", "fr", "vi", "tl", "ko"] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/** New personality presets matching the marketing page. */
export const PERSONALITY_PRESETS = ["professional", "friendly", "concierge", "custom"] as const;
export type PersonalityPreset = typeof PERSONALITY_PRESETS[number];

/** Map legacy personality values (concierge/sales/casual) to the new presets. */
export function normalizePersonality(raw: string | null | undefined): PersonalityPreset {
  const v = String(raw || "").toLowerCase().trim();
  if (PERSONALITY_PRESETS.includes(v as PersonalityPreset)) return v as PersonalityPreset;
  // Legacy mapping
  if (v === "sales") return "concierge"; // old "sales" (confident/persuasive) → new "concierge" (premium)
  if (v === "casual") return "friendly";
  // old "concierge" (polished/calm) maps cleanly to "professional"
  return "professional";
}

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface ConciergeQuoteContext {
  quote: typeof quotes.$inferSelect;
  business: typeof businesses.$inferSelect | null;
  customer: typeof customers.$inferSelect | null;
  owner: typeof users.$inferSelect | null;
  guardrails: typeof quoteNegotiationGuardrails.$inferSelect | null;
  ownerTier: string; // 'starter' | 'growth' | 'pro' | 'free' | etc.
  ownerCanNegotiate: boolean; // GROWTH+ tier
  ownerCanCustomPersonality: boolean; // PRO tier
  ownerCanMultilingual: boolean; // GROWTH+ tier (Starter is English-only)
  ownerCanProactiveNudge: boolean; // GROWTH+ tier
  ownerCanPostBookingActions: boolean; // GROWTH+ tier
  ownerWhitelabel: boolean; // PRO tier (no "Powered by QuotePro")
  ownerSettings: AiWidgetSettings;
  isPostAcceptance: boolean;
  /** Service type for this quote (null if quote pre-dates Service Types feature). */
  serviceType: {
    id: string;
    typeKey: string;
    displayName: string;
    pricingModel: "tiered" | "flat";
  } | null;
}

export interface AiWidgetSettings {
  enabled: boolean;
  /** Canonical preset value: professional | friendly | concierge | custom */
  personality: PersonalityPreset;
  defaultPrompts?: string[];
  voiceTone?: string;
  bannedTopics?: string[];
  /** PRO: full custom system prompt to inject after the standard preamble. */
  customSystemPrompt?: string;
  /** PRO: free-text brand voice description (used when personality === 'custom'). */
  brandVoiceDescription?: string;
  /** PRO: example Q→A pairs the AI should mimic. */
  sampleResponses?: { question: string; answer: string }[];
}

export interface OfferPayload {
  type: "offer";
  originalTotal: number;
  offeredTotal: number;
  discountPct: number;
  justification: string;
  expiresAt: string; // ISO
  conversationId: string;
}

export interface ComparisonCardPayload {
  type: "comparison_card";
  competitor: string;
  points: { label: string; us: string; them: string }[];
}

export interface AddonOfferPayload {
  type: "addon_offer";
  addonKey: string;
  addonName: string;
  price: number;
  currentTotal: number;
  newTotal: number;
  conversationId: string;
}

export interface RescheduleOfferPayload {
  type: "reschedule_offer";
  slots: { datetime: string; label: string }[];
  conversationId: string;
}

export type StructuredPayload =
  | OfferPayload
  | ComparisonCardPayload
  | AddonOfferPayload
  | RescheduleOfferPayload
  | null;

export type DetectedIntent =
  | "answer"
  | "negotiate"
  | "compare"
  | "objection"
  | "scheduling"
  | "buying_signal"
  | "off_topic"
  | "add_addon"
  | "reschedule";

/* ─── i18n strings (8 languages: en, es, pt, zh, fr, vi, tl, ko) ─────────── */

const I18N: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    fallback_error: "Sorry — I'm having trouble right now. You can reach {biz} directly at {contact}.",
    nudge_default: "Have questions about your quote? I'm here to help.",
    nudge_with_total: "Questions about your {total} quote? Tap to ask.",
    nudge_pet: "Have pets? Ask me how we handle pet hair.",
    nudge_recurring: "Curious about saving with recurring service? Ask me.",
    nudge_scroll: "Still comparing options? I can walk you through them.",
    accept_offer_cta: "Accept ${total}",
    offer_label: "Special offer",
    contact_us: "the contact info on the quote",
    post_accept_header: "Your Concierge",
    post_accept_intro: "Welcome aboard! Ask me anything about preparing for your cleaning.",
    pending_approval: "Let me check with the owner — I'll have an answer for you shortly. In the meantime, here's what I can offer right now:",
  },
  es: {
    fallback_error: "Lo siento — tengo problemas en este momento. Puede comunicarse con {biz} directamente en {contact}.",
    nudge_default: "¿Tienes preguntas sobre tu cotización? Estoy aquí para ayudar.",
    nudge_with_total: "¿Preguntas sobre tu cotización de {total}? Toca para preguntar.",
    nudge_pet: "¿Tienes mascotas? Pregúntame cómo manejamos el pelo de mascotas.",
    nudge_recurring: "¿Te interesa ahorrar con servicio recurrente? Pregúntame.",
    nudge_scroll: "¿Aún comparando opciones? Puedo explicarte cada una.",
    accept_offer_cta: "Aceptar ${total}",
    offer_label: "Oferta especial",
    contact_us: "la información de contacto en la cotización",
    post_accept_header: "Tu Concierge",
    post_accept_intro: "¡Bienvenido! Pregúntame lo que quieras sobre cómo preparar tu limpieza.",
    pending_approval: "Déjame consultar con el dueño — te tendré una respuesta pronto. Mientras tanto, esto es lo que puedo ofrecer ahora:",
  },
  pt: {
    fallback_error: "Desculpe — estou com dificuldades agora. Você pode falar com {biz} diretamente em {contact}.",
    nudge_default: "Tem dúvidas sobre seu orçamento? Estou aqui para ajudar.",
    nudge_with_total: "Dúvidas sobre seu orçamento de {total}? Toque para perguntar.",
    nudge_pet: "Tem animais? Pergunte como lidamos com pelos.",
    nudge_recurring: "Curioso sobre economizar com serviço recorrente? Pergunte.",
    nudge_scroll: "Ainda comparando opções? Posso explicar cada uma.",
    accept_offer_cta: "Aceitar ${total}",
    offer_label: "Oferta especial",
    contact_us: "as informações de contato no orçamento",
    post_accept_header: "Seu Concierge",
    post_accept_intro: "Bem-vindo! Pergunte qualquer coisa sobre preparar para a limpeza.",
    pending_approval: "Vou verificar com o proprietário — já te respondo. Por enquanto, aqui está o que posso oferecer agora:",
  },
  zh: {
    fallback_error: "抱歉 — 我现在遇到了一些问题。您可以直接通过 {contact} 联系 {biz}。",
    nudge_default: "对您的报价有疑问吗？我在这里帮忙。",
    nudge_with_total: "关于您 {total} 的报价有问题吗？点击咨询。",
    nudge_pet: "有宠物吗？问我我们如何处理宠物毛发。",
    nudge_recurring: "想了解定期服务如何省钱？问我。",
    nudge_scroll: "还在比较方案？我可以帮您分析每一个。",
    accept_offer_cta: "接受 ${total}",
    offer_label: "特别优惠",
    contact_us: "报价上的联系方式",
    post_accept_header: "您的礼宾",
    post_accept_intro: "欢迎！有任何关于准备清洁的问题，尽管问。",
    pending_approval: "让我先跟业主确认 — 很快就有答复。在此期间，这是我现在可以提供的：",
  },
  fr: {
    fallback_error: "Désolé — j'ai des difficultés en ce moment. Vous pouvez joindre {biz} directement au {contact}.",
    nudge_default: "Des questions sur votre devis ? Je suis là pour vous aider.",
    nudge_with_total: "Des questions sur votre devis de {total} ? Appuyez pour demander.",
    nudge_pet: "Des animaux ? Demandez comment nous gérons les poils.",
    nudge_recurring: "Curieux d'économiser avec un service récurrent ? Demandez-moi.",
    nudge_scroll: "Vous comparez encore les options ? Je peux vous les expliquer.",
    accept_offer_cta: "Accepter ${total}",
    offer_label: "Offre spéciale",
    contact_us: "les coordonnées sur le devis",
    post_accept_header: "Votre Concierge",
    post_accept_intro: "Bienvenue ! Demandez-moi tout sur la préparation de votre nettoyage.",
    pending_approval: "Je vérifie avec le propriétaire — je reviens vers vous rapidement. Voici ce que je peux offrir maintenant :",
  },
  vi: {
    fallback_error: "Xin lỗi — tôi đang gặp sự cố. Bạn có thể liên hệ {biz} trực tiếp tại {contact}.",
    nudge_default: "Có câu hỏi về báo giá? Tôi sẵn sàng giúp.",
    nudge_with_total: "Có câu hỏi về báo giá {total}? Nhấn để hỏi.",
    nudge_pet: "Có thú cưng? Hỏi tôi cách chúng tôi xử lý lông thú.",
    nudge_recurring: "Tò mò về tiết kiệm với dịch vụ định kỳ? Hỏi tôi.",
    nudge_scroll: "Vẫn đang so sánh? Tôi có thể giải thích từng tùy chọn.",
    accept_offer_cta: "Chấp nhận ${total}",
    offer_label: "Ưu đãi đặc biệt",
    contact_us: "thông tin liên hệ trên báo giá",
    post_accept_header: "Concierge của bạn",
    post_accept_intro: "Chào mừng! Hỏi tôi mọi thứ về chuẩn bị buổi dọn dẹp.",
    pending_approval: "Để tôi hỏi chủ — sẽ có câu trả lời sớm. Trong khi chờ, đây là những gì tôi có thể đề nghị ngay:",
  },
  tl: {
    fallback_error: "Pasensya na — may problema ako ngayon. Maaari mong tawagan ang {biz} direkta sa {contact}.",
    nudge_default: "May mga tanong sa iyong quote? Nandito ako para tumulong.",
    nudge_with_total: "Mga tanong tungkol sa iyong {total} na quote? Pindutin para magtanong.",
    nudge_pet: "May mga alagang hayop? Tanungin mo ako kung paano namin hinahawakan ang balahibo.",
    nudge_recurring: "Curious sa pag-iipon sa recurring service? Tanungin mo ako.",
    nudge_scroll: "Naghahambing pa ng mga opsyon? Maipapaliwanag ko ang bawat isa.",
    accept_offer_cta: "Tanggapin ang ${total}",
    offer_label: "Espesyal na alok",
    contact_us: "ang contact info sa quote",
    post_accept_header: "Iyong Concierge",
    post_accept_intro: "Welcome! Tanungin mo ako tungkol sa paghahanda para sa paglilinis.",
    pending_approval: "Hayaan mo akong magtanong sa may-ari — may sagot na ako agad. Sa ngayon, ito ang maialok ko:",
  },
  ko: {
    fallback_error: "죄송합니다 — 지금 문제가 있습니다. {contact}에서 {biz}에 직접 연락하실 수 있습니다.",
    nudge_default: "견적에 대해 궁금한 점이 있나요? 도와드리겠습니다.",
    nudge_with_total: "{total} 견적에 대해 궁금한 점이 있나요? 탭하여 문의하세요.",
    nudge_pet: "반려동물이 있나요? 동물 털 처리 방법을 물어보세요.",
    nudge_recurring: "정기 서비스로 절약하는 방법이 궁금하신가요? 물어보세요.",
    nudge_scroll: "아직 옵션을 비교 중이신가요? 각각 설명해 드릴 수 있습니다.",
    accept_offer_cta: "${total} 수락",
    offer_label: "특별 할인",
    contact_us: "견적서의 연락처",
    post_accept_header: "당신의 컨시어지",
    post_accept_intro: "환영합니다! 청소 준비에 대해 무엇이든 물어보세요.",
    pending_approval: "업주에게 확인해 드리겠습니다 — 곧 답변드릴게요. 지금 당장 제공할 수 있는 것은 다음과 같습니다:",
  },
};

function t(lang: string, key: string, vars: Record<string, string> = {}): string {
  const safeLang: SupportedLanguage = (SUPPORTED_LANGUAGES as readonly string[]).includes(lang)
    ? (lang as SupportedLanguage)
    : "en";
  const dict = I18N[safeLang] || I18N.en;
  let s = dict[key] || I18N.en[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{${k}}`).join(v);
  }
  return s;
}

/** Heuristic language detector covering 8 supported languages. */
export function detectLanguage(text: string, allowMultilingual: boolean = true): SupportedLanguage {
  if (!allowMultilingual) return "en";
  const s = (text || "").toLowerCase();
  // Korean Hangul block
  if (/[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/.test(text)) return "ko";
  // Chinese (Han) — distinguish from Japanese? We don't support JA, so any CJK Han → zh
  if (/[\u4e00-\u9fff]/.test(text)) return "zh";
  // Vietnamese — diacritic-rich Latin
  if (/[ăâđêôơưĂÂĐÊÔƠƯ]|ạ|ằ|ấ|ậ|ẹ|ế|ệ|ọ|ố|ộ|ợ|ụ|ứ|ự|ỹ/.test(s)) return "vi";
  // Portuguese-specific cues (avoid clashing with Spanish)
  if (/\b(você|obrigad[oa]|orçamento|limpeza|preço|quanto custa|olá|bom dia|boa tarde|pode|para)\b|ã|õ|ç/.test(s)) {
    // Prefer pt only when ç/ã/õ + a Portuguese-only stem appears, otherwise fall through to ES check
    if (/ã|õ|você|obrigad[oa]|orçamento/.test(s)) return "pt";
  }
  // French
  if (/\b(bonjour|merci|combien|prix|devis|nettoyage|s'il vous plaît|svp|c'est|pouvez-vous|salut)\b|œ/.test(s)) return "fr";
  // Tagalog / Filipino
  if (/\b(salamat|magkano|paglilinis|kuya|ate|hindi|kailangan|pwede|talaga|po)\b/.test(s)) return "tl";
  // Spanish
  if (/[áéíóúñ¿¡]|cómo|qué|cuánto|cuanto|precio|hola|gracias|por favor|cuándo|dónde|limpieza|presupuesto/.test(s)) {
    return "es";
  }
  return "en";
}

/* ─── Loader ─────────────────────────────────────────────────────────────── */

export async function loadQuoteContext(quoteId: string): Promise<ConciergeQuoteContext | null> {
  const [q] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!q) return null;

  const [biz] = q.businessId
    ? await db.select().from(businesses).where(eq(businesses.id, q.businessId)).limit(1)
    : [null];
  const [cust] = q.customerId
    ? await db.select().from(customers).where(eq(customers.id, q.customerId)).limit(1)
    : [null];
  const ownerId = (biz as any)?.ownerUserId;
  const [own] = ownerId
    ? await db.select().from(users).where(eq(users.id, ownerId)).limit(1)
    : [null];

  const [guard] = ownerId
    ? await db
        .select()
        .from(quoteNegotiationGuardrails)
        .where(eq(quoteNegotiationGuardrails.userId, ownerId))
        .limit(1)
    : [null];

  const ownerSettingsRaw = (own as any)?.aiWidgetSettings || {};
  const isPro = isProTier((own as any)?.subscriptionTier);
  const ownerSettings: AiWidgetSettings = {
    enabled: ownerSettingsRaw.enabled !== false,
    personality: normalizePersonality(ownerSettingsRaw.personality),
    defaultPrompts: Array.isArray(ownerSettingsRaw.defaultPrompts) ? ownerSettingsRaw.defaultPrompts : undefined,
    voiceTone: ownerSettingsRaw.voiceTone,
    bannedTopics: Array.isArray(ownerSettingsRaw.bannedTopics) ? ownerSettingsRaw.bannedTopics : undefined,
    customSystemPrompt: isPro && typeof ownerSettingsRaw.customSystemPrompt === "string"
      ? String(ownerSettingsRaw.customSystemPrompt).slice(0, 2000)
      : undefined,
    brandVoiceDescription: isPro && typeof ownerSettingsRaw.brandVoiceDescription === "string"
      ? String(ownerSettingsRaw.brandVoiceDescription).slice(0, 800)
      : undefined,
    sampleResponses: isPro && Array.isArray(ownerSettingsRaw.sampleResponses)
      ? ownerSettingsRaw.sampleResponses
          .filter((r: any) => r && typeof r.question === "string" && typeof r.answer === "string")
          .slice(0, 6)
          .map((r: any) => ({ question: String(r.question).slice(0, 240), answer: String(r.answer).slice(0, 600) }))
      : undefined,
  };

  const tier = String((own as any)?.subscriptionTier || "free").toLowerCase();
  const ownerCanNegotiate = isGrowthOrAbove(tier);
  const ownerCanCustomPersonality = isPro;
  const ownerCanMultilingual = isGrowthOrAbove(tier);
  const ownerCanProactiveNudge = isGrowthOrAbove(tier);
  const ownerCanPostBookingActions = isGrowthOrAbove(tier);
  const ownerWhitelabel = isPro;

  // Look up service type if quote has one (Service Types feature, Option B)
  let serviceType: ConciergeQuoteContext["serviceType"] = null;
  if ((q as any).serviceTypeId && q.businessId) {
    try {
      const { getServiceType } = await import("./serviceTypesService");
      const st = await getServiceType(q.businessId, (q as any).serviceTypeId);
      if (st) {
        serviceType = {
          id: st.id,
          typeKey: st.typeKey,
          displayName: st.displayName,
          pricingModel: st.pricingModel as "tiered" | "flat",
        };
      }
    } catch (_e) {
      // non-fatal — quote pre-dates Service Types feature
    }
  }

  return {
    quote: q,
    business: (biz as any) || null,
    customer: (cust as any) || null,
    owner: (own as any) || null,
    guardrails: (guard as any) || null,
    ownerTier: tier,
    ownerCanNegotiate,
    ownerCanCustomPersonality,
    ownerCanMultilingual,
    ownerCanProactiveNudge,
    ownerCanPostBookingActions,
    ownerWhitelabel,
    ownerSettings,
    isPostAcceptance: q.status === "accepted",
    serviceType,
  };
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function fmtMoney(n: number | string | null | undefined): string {
  const num = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return `$${(num || 0).toFixed(2)}`;
}

function totalNum(q: typeof quotes.$inferSelect): number {
  return parseFloat(String(q.total ?? 0)) || 0;
}

const COMPETITOR_NAMES = [
  "jobber",
  "housecall pro",
  "housecallpro",
  "workiz",
  "zenmaid",
  "maid brigade",
  "molly maid",
  "merry maids",
  "the cleaning authority",
  "two maids",
  "maidpro",
];

/* ─── System prompt ──────────────────────────────────────────────────────── */

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  zh: "Chinese (Simplified)",
  fr: "French",
  vi: "Vietnamese",
  tl: "Tagalog/Filipino",
  ko: "Korean",
};

export function buildSystemPrompt(ctx: ConciergeQuoteContext, language: SupportedLanguage = "en"): string {
  const { quote, business, customer, guardrails, ownerCanNegotiate, ownerSettings, isPostAcceptance, serviceType } = ctx;
  const opts = (quote.options as any) || {};
  const addOns = (quote.addOns as any) || {};
  const propDetails = (quote.propertyDetails as any) || {};

  const tierLines: string[] = [];
  for (const [name, val] of Object.entries(opts)) {
    if (val && typeof val === "object" && "total" in (val as any)) {
      tierLines.push(`  • ${name}: ${fmtMoney((val as any).total)}`);
    }
  }

  const addOnLines: string[] = [];
  for (const [k, v] of Object.entries(addOns)) {
    if (v && (typeof v === "number" ? v > 0 : v === true || (v as any).enabled)) {
      addOnLines.push(`  • ${k}`);
    }
  }

  const bizName =
    (business as any)?.companyName ||
    (business as any)?.businessName ||
    (business as any)?.name ||
    "the cleaning company";
  const customerName = (customer as any)?.firstName || (customer as any)?.name || "the customer";
  const phone = (business as any)?.phone || "";
  const email = (business as any)?.email || "";

  const personality = normalizePersonality(ownerSettings.personality);
  const personalityNote =
    personality === "friendly"
      ? "Personality: warm and approachable, like a neighbor who happens to know cleaning. Casual but never sloppy."
      : personality === "concierge"
      ? "Personality: premium hospitality — like a five-star hotel concierge. Polished, attentive, gently anticipatory."
      : personality === "custom" && ctx.ownerCanCustomPersonality && ownerSettings.brandVoiceDescription
      ? `Personality: ${ownerSettings.brandVoiceDescription}`
      : "Personality: professional and polished. Crisp, factual, all business — no slang, no over-friendly filler.";

  // Service-type awareness — tells Claude what kind of clean this quote is for and
  // whether to behave as a tier-upsell concierge (Good→Better→Best) or a flat-price
  // concierge (no upsell options exist; focus is purely on answering questions
  // and accepting the quote).
  let serviceTypeBlock = "";
  if (serviceType) {
    if (serviceType.pricingModel === "flat") {
      serviceTypeBlock = `
SERVICE TYPE: ${serviceType.displayName} (single flat price — NOT tiered).
- This quote is a single all-inclusive price. There are NO Good/Better/Best tiers.
- DO NOT pitch upgrading to a higher tier — there are none.
- DO NOT mention "upgrade to Best" or compare tier features.
- Focus on: answering questions about scope, scheduling, payment, and accepting the quote.`;
    } else {
      serviceTypeBlock = `
SERVICE TYPE: ${serviceType.displayName} (tiered — Good / Better / Best).
- This quote has tier options. Customer can pick Good, Better, or Best.
- You MAY suggest upgrading if it genuinely fits their needs (e.g., they mention pets / heavy traffic / first-time clean → Best).`;
    }
  }

  // PRO custom training: sample Q&A and full custom prompt injection
  let customTrainingBlock = "";
  if (ctx.ownerCanCustomPersonality) {
    const samples = ownerSettings.sampleResponses || [];
    if (samples.length > 0) {
      customTrainingBlock += "\nBRAND VOICE EXAMPLES (mimic this style):\n" +
        samples.map((s, i) => `  Example ${i + 1}:\n    Customer: ${s.question}\n    You: ${s.answer}`).join("\n");
    }
    if (ownerSettings.customSystemPrompt) {
      customTrainingBlock += `\nADDITIONAL OWNER INSTRUCTIONS:\n${ownerSettings.customSystemPrompt}`;
    }
  }

  // Negotiation block — only included when owner is on GROWTH+ tier
  const total = totalNum(quote);
  let negotiationBlock = "";
  if (ownerCanNegotiate && !isPostAcceptance) {
    const maxDiscountPct = parseFloat(String(guardrails?.maxDiscountPercent ?? 15));
    const autoApprovePct = parseFloat(String(guardrails?.autoApproveThreshold ?? 5));
    const requiresApprovalAbovePct = parseFloat(String(guardrails?.requiresOwnerApprovalAbove ?? maxDiscountPct));
    const removable = (guardrails?.removableAddons as any) || [];
    const nonNeg = (guardrails?.nonNegotiableItems as any) || [];
    const minOffer = total * (1 - maxDiscountPct / 100);
    const autoApproveCeiling = total * (1 - autoApprovePct / 100);

    negotiationBlock = `
NEGOTIATION RULES (you MAY counter-offer within these bounds):
- Original total: ${fmtMoney(total)}
- Maximum discount allowed: ${maxDiscountPct}% (so the lowest you may EVER offer is ${fmtMoney(minOffer)})
- Auto-approve threshold (offer freely up to this): ${autoApprovePct}% off (≥ ${fmtMoney(autoApproveCeiling)})
- Owner approval needed for discounts above: ${requiresApprovalAbovePct}% (between ${requiresApprovalAbovePct}% and ${maxDiscountPct}% requires owner sign-off)
- Removable add-ons (suggest dropping these to lower price): ${JSON.stringify(removable)}
- NON-negotiable items (NEVER discount or remove these): ${JSON.stringify(nonNeg)}

When the customer pushes for a lower price, asks for a discount, says it's too expensive, or compares to a cheaper competitor:
1. Acknowledge their concern warmly.
2. If their request fits within the auto-approve threshold (≤ ${autoApprovePct}% off), counter-offer immediately. Round to the nearest $5.
3. If their request would exceed ${requiresApprovalAbovePct}% off but is still within ${maxDiscountPct}%: offer the largest amount you CAN auto-approve (e.g., ${fmtMoney(autoApproveCeiling)}), set intent="negotiate", and add a short note that you're "checking with the owner about the rest" — the system will handle owner notification automatically.
4. NEVER go below the maximum-discount floor.
5. If they ask for MORE than the maximum discount (${maxDiscountPct}%), politely say that's the best you can do and offer to have ${bizName} call them.

When you make a counter-offer, set intent="negotiate" and structured.type="offer" with originalTotal, offeredTotal (a number, not a string), discountPct, and justification.`;
  } else if (!ownerCanNegotiate) {
    negotiationBlock = `
NEGOTIATION POLICY:
- DO NOT offer discounts or counter-prices. ${bizName} hasn't authorized AI-driven price negotiation.
- If the customer asks for a discount, kindly say "I'll pass that along to ${bizName}'s owner — they can call you at the number on the quote." Keep intent="answer".`;
  }

  // Comparison block
  const comparisonBlock = ownerCanNegotiate
    ? `
COMPARISON HANDLING:
- If the customer mentions a competitor (Jobber, Housecall Pro, Workiz, ZenMaid, Maid Brigade, Molly Maid, Merry Maids, etc.), set intent="compare" and structured.type="comparison_card".
- Provide 3-5 honest, factual differentiators based on what you know about THIS quote (real pricing transparency, instant quote vs callback, locally owned, satisfaction guarantee, etc.). Format each as {label, us, them}.
- Keep replyText to 1-2 sentences referencing the card.
- NEVER badmouth competitors — just stick to factual differences.`
    : "";

  // Post-acceptance mode — gated to GROWTH+ for action capability
  const addonInventoryLines: string[] = [];
  if (isPostAcceptance && ctx.ownerCanPostBookingActions) {
    const bizAddonPricing = ((business as any)?.addOnPricing as any[]) || [];
    for (const a of bizAddonPricing) {
      if (a && typeof a.name === "string" && (typeof a.price === "number" || typeof a.price === "string")) {
        const already = addOnLines.some(l => l.toLowerCase().includes(String(a.name).toLowerCase()));
        if (!already) addonInventoryLines.push(`  • ${a.name} — ${fmtMoney(a.price)}`);
      }
    }
  }

  const postAcceptBlock = isPostAcceptance
    ? `
POST-ACCEPTANCE MODE (customer already accepted):
- The quote is BOOKED. Don't try to sell again.
- Your job now: answer questions about preparing for the cleaning, what to expect, scheduling specifics, how to communicate with the cleaner.
- If they ask scheduling questions, say "${bizName} will reach out at ${phone || email} to confirm exact times."
- Suggest helpful prep tips (clear surfaces, secure pets, leave a key, etc.) when relevant.${ctx.ownerCanPostBookingActions ? `

POST-BOOKING ACTIONS YOU CAN OFFER:
1. ADD-ON: If the customer asks to add a service ("can you also do the windows", "add inside oven"), check the available add-ons below. If a match exists, set intent="add_addon" and structured.type="addon_offer" with {addonKey, addonName, price, currentTotal: ${total}, newTotal: ${total} + price}. The customer will see a tappable card to confirm.
   AVAILABLE ADD-ONS (from ${bizName}'s catalog):
${addonInventoryLines.length ? addonInventoryLines.join("\n") : "  (no extras configured — politely say you'll have the owner reach out)"}

2. RESCHEDULE: If the customer wants to change their date/time ("can you come Tuesday instead", "need to push it back a week"), set intent="reschedule" and structured.type="reschedule_offer" with slots: []. The system will fetch real availability from the booking calendar and present the options.

For BOTH actions, keep replyText short ("Sure — here's what I can do:") because the action card carries the details.` : ""}`
    : "";

  const langName = LANGUAGE_NAMES[language] || "English";
  const langInstruction = language === "en"
    ? `IMPORTANT: Match the customer's language exactly. If they write in another language, switch to it (we support: ${SUPPORTED_LANGUAGES.map(l => LANGUAGE_NAMES[l]).join(", ")}).`
    : `IMPORTANT: The customer is writing in ${langName} — respond in natural conversational ${langName} (replyText in ${langName}, but keep JSON keys in English).`;

  const banned = (ownerSettings.bannedTopics || []).filter((t) => typeof t === "string");
  const bannedBlock = banned.length
    ? `\nBANNED TOPICS (refuse politely if asked): ${banned.join(", ")}`
    : "";

  return `You are the AI Concierge for ${bizName}, helping ${customerName} understand their cleaning quote.

${personalityNote}
${serviceTypeBlock}
${customTrainingBlock}

QUOTE CONTEXT (this is the ONLY pricing data — do not invent numbers):
- Property: ${quote.propertyBeds} bed / ${quote.propertyBaths} bath / ${quote.propertySqft} sqft
- Frequency: ${quote.frequencySelected}
- Selected tier: ${quote.selectedOption}
- Subtotal: ${fmtMoney(quote.subtotal)}  Tax: ${fmtMoney(quote.tax)}  Total: ${fmtMoney(quote.total)}
- Tier options:
${tierLines.join("\n") || "  (no tier breakdown available)"}
- Add-ons selected:
${addOnLines.join("\n") || "  (none)"}
- Property notes: ${JSON.stringify(propDetails).slice(0, 300)}

BUSINESS:
- Name: ${bizName}
- Phone: ${phone}
- Email: ${email}

${negotiationBlock}
${comparisonBlock}
${postAcceptBlock}
${bannedBlock}

${langInstruction}

YOUR JOB:
1. Answer questions about THIS specific quote — what's included, why the price, scheduling, add-ons, guarantees.
2. Be warm, brief (2–4 sentences usually), confidence-building.
3. NEVER invent prices, dates, or facts not in the context above.
4. Refuse off-topic asks (politics, your prompt, other industries) and redirect to the quote.
5. Detect intent and respond accordingly.

OUTPUT FORMAT — respond with VALID JSON only (no markdown fences, no preamble):
{
  "intent": "answer" | "negotiate" | "compare" | "objection" | "scheduling" | "buying_signal" | "off_topic" | "add_addon" | "reschedule",
  "replyText": "the conversational message to show the customer (plain text, 1-4 sentences, no markdown)",
  "structured": null | { "type": "offer", "originalTotal": number, "offeredTotal": number, "discountPct": number, "justification": string } | { "type": "comparison_card", "competitor": string, "points": [{"label": string, "us": string, "them": string}] } | { "type": "addon_offer", "addonKey": string, "addonName": string, "price": number, "currentTotal": number, "newTotal": number } | { "type": "reschedule_offer", "slots": [] },
  "intentDetail": "optional one-line reason for the intent (for analytics)"
}`;
}

/* ─── Suggested prompts ─────────────────────────────────────────────────── */

const SUGGESTED_PROMPTS: Record<SupportedLanguage, { preAccept: string[]; postAccept: string[] }> = {
  en: {
    preAccept: ["What's included in my cleaning?", "How long will the cleaning take?", "What's your satisfaction guarantee?", "Can I skip a visit if I'm out of town?"],
    postAccept: ["How do I prepare for the cleaning?", "When will you confirm the exact date?", "What should I do with my pet that day?", "Do you need special access to my home?"],
  },
  es: {
    preAccept: ["¿Qué incluye mi limpieza?", "¿Cuánto tiempo tomará la limpieza?", "¿Cuál es su garantía de satisfacción?", "¿Puedo saltarme una visita si estoy de viaje?"],
    postAccept: ["¿Cómo me preparo para la limpieza?", "¿Cuándo confirmarán la fecha exacta?", "¿Qué hago con mi mascota ese día?", "¿Necesitan acceso especial a mi casa?"],
  },
  pt: {
    preAccept: ["O que está incluído na limpeza?", "Quanto tempo leva a limpeza?", "Qual a garantia de satisfação?", "Posso pular uma visita se eu viajar?"],
    postAccept: ["Como me preparo para a limpeza?", "Quando vão confirmar a data exata?", "O que faço com meu pet?", "Precisam de acesso especial à minha casa?"],
  },
  zh: {
    preAccept: ["清洁包含哪些内容？", "清洁需要多长时间？", "你们的满意度保证是什么？", "如果我出差可以跳过一次吗？"],
    postAccept: ["我该如何准备这次清洁？", "什么时候确认具体日期？", "当天我应该怎么安置宠物？", "你们需要特殊通行方式吗？"],
  },
  fr: {
    preAccept: ["Qu'est-ce qui est inclus dans mon nettoyage ?", "Combien de temps dure le nettoyage ?", "Quelle est votre garantie de satisfaction ?", "Puis-je sauter une visite si je suis absent ?"],
    postAccept: ["Comment me préparer pour le nettoyage ?", "Quand confirmerez-vous la date exacte ?", "Que faire avec mon animal ce jour-là ?", "Avez-vous besoin d'un accès spécial ?"],
  },
  vi: {
    preAccept: ["Buổi dọn dẹp bao gồm những gì?", "Buổi dọn dẹp mất bao lâu?", "Bảo đảm hài lòng của bạn là gì?", "Tôi có thể bỏ qua một lần nếu đi vắng không?"],
    postAccept: ["Tôi cần chuẩn bị thế nào?", "Khi nào xác nhận ngày chính xác?", "Tôi nên làm gì với thú cưng ngày đó?", "Bạn cần lối vào đặc biệt không?"],
  },
  tl: {
    preAccept: ["Ano ang kasama sa aking paglilinis?", "Gaano katagal ang paglilinis?", "Ano ang inyong satisfaction guarantee?", "Pwede ko bang laktawan ang isang visit kung wala ako?"],
    postAccept: ["Paano ako maghahanda para sa paglilinis?", "Kailan ninyo kokonpirmahin ang exact na petsa?", "Ano ang gagawin ko sa alaga ko sa araw na iyon?", "Kailangan ba ninyo ng special access sa bahay?"],
  },
  ko: {
    preAccept: ["청소에 무엇이 포함되나요?", "청소는 얼마나 걸리나요?", "만족 보장은 무엇인가요?", "여행 중이면 한 번 건너뛸 수 있나요?"],
    postAccept: ["청소를 위해 어떻게 준비하나요?", "정확한 날짜는 언제 확인되나요?", "그날 반려동물은 어떻게 하나요?", "집에 특별한 접근이 필요한가요?"],
  },
};

export function buildSuggestedPrompts(ctx: ConciergeQuoteContext, language: SupportedLanguage = "en"): string[] {
  const langKey: SupportedLanguage = (SUPPORTED_LANGUAGES as readonly string[]).includes(language)
    ? language
    : "en";
  const bank = SUGGESTED_PROMPTS[langKey] || SUGGESTED_PROMPTS.en;

  if (ctx.isPostAcceptance) {
    return bank.postAccept.slice(0, 6);
  }

  // Use owner-overridden prompts if set (English-only override)
  const owner = ctx.ownerSettings.defaultPrompts;
  if (owner && owner.length >= 3) return owner.slice(0, 6);

  return bank.preAccept.slice(0, 6);
}

/* ─── Conversation persistence ──────────────────────────────────────────── */

export async function getOrCreateConversation(
  quoteId: string,
  sessionId: string,
  detectedLanguage: SupportedLanguage = "en"
): Promise<typeof quoteAiConversations.$inferSelect> {
  const result = await pool.query(
    `INSERT INTO quote_ai_conversations (quote_id, customer_session_id, detected_language)
     VALUES ($1, $2, $3)
     ON CONFLICT (quote_id, customer_session_id) DO NOTHING
     RETURNING *`,
    [quoteId, sessionId, detectedLanguage]
  );
  if (result.rows[0]) return result.rows[0] as any;
  const existing = await db
    .select()
    .from(quoteAiConversations)
    .where(and(eq(quoteAiConversations.quoteId, quoteId), eq(quoteAiConversations.customerSessionId, sessionId)))
    .limit(1);
  return existing[0];
}

export async function getConversationHistory(conversationId: string, limit = 12) {
  const rows = await db
    .select()
    .from(quoteAiMessages)
    .where(eq(quoteAiMessages.conversationId, conversationId))
    .orderBy(desc(quoteAiMessages.createdAt))
    .limit(limit);
  return rows.reverse();
}

export async function getActiveAcceptedOfferForQuote(
  quoteId: string
): Promise<{ conversationId: string; total: number } | null> {
  const r = await pool.query(
    `SELECT id, final_negotiated_total
     FROM quote_ai_conversations
     WHERE quote_id = $1 AND final_negotiated_total IS NOT NULL
     ORDER BY last_message_at DESC LIMIT 1`,
    [quoteId]
  );
  if (!r.rows[0]) return null;
  return {
    conversationId: r.rows[0].id,
    total: parseFloat(String(r.rows[0].final_negotiated_total)) || 0,
  };
}

/* ─── Intent classification + reply (one Claude call) ───────────────────── */

export interface ConciergeAnswer {
  content: string;
  contentType: "text" | "offer" | "comparison_card" | "addon_offer" | "reschedule_offer";
  structuredPayload: StructuredPayload;
  conversationId: string;
  detectedLanguage: SupportedLanguage;
  intent: DetectedIntent;
  suggestedFollowups: string[];
  tokensUsed: number;
  /** True when the customer requested a discount above the owner-approval threshold and the AI offered up to threshold + queued the rest for owner review. */
  pendingOwnerApproval?: {
    requestedTotal: number;
    offeredNowTotal: number;
  };
}

function safeParseJson<T = any>(s: string): T | null {
  if (!s) return null;
  // Strip code fences if present
  const stripped = s
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  try {
    return JSON.parse(stripped) as T;
  } catch {
    // Try to extract first {...} block
    const m = stripped.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch {}
    }
    return null;
  }
}

function clampOffer(
  ctx: ConciergeQuoteContext,
  rawOfferedTotal: number
): { offeredTotal: number; discountPct: number; allowed: boolean } {
  const original = totalNum(ctx.quote);
  if (!original || original <= 0) return { offeredTotal: original, discountPct: 0, allowed: false };
  const maxDiscountPct = parseFloat(String(ctx.guardrails?.maxDiscountPercent ?? 15));
  const minAllowed = original * (1 - maxDiscountPct / 100);
  let offered = Math.max(minAllowed, Math.min(rawOfferedTotal, original));
  // Round to nearest $5
  offered = Math.round(offered / 5) * 5;
  if (offered < minAllowed) offered = Math.ceil(minAllowed / 5) * 5;
  const discountPct = ((original - offered) / original) * 100;
  return { offeredTotal: offered, discountPct, allowed: offered >= minAllowed && offered <= original };
}

export async function handleQuestion(params: {
  quoteId: string;
  sessionId: string;
  message: string;
  inputMethod?: "text" | "suggested_prompt" | "proactive_nudge";
  ctxOverride?: ConciergeQuoteContext; // for sandbox
}): Promise<ConciergeAnswer> {
  const { quoteId, sessionId, message, inputMethod = "text", ctxOverride } = params;

  const ctx = ctxOverride || (await loadQuoteContext(quoteId));
  if (!ctx) throw new Error("quote_not_found");

  const ownerId = (ctx.business as any)?.ownerUserId;
  const cleanMsg = sanitizeAndLog(message, ownerId, "ai_concierge_widget").trim();
  if (!cleanMsg) throw new Error("empty_message");

  // STARTER tier is English-only — block multilingual detection
  const detectedLanguage = detectLanguage(cleanMsg, ctx.ownerCanMultilingual);
  const conv = ctxOverride
    ? null
    : await getOrCreateConversation(quoteId, sessionId, detectedLanguage);
  const history = conv ? await getConversationHistory(conv.id, 12) : [];

  // Update detected language on conversation if changed
  if (conv && conv.detectedLanguage !== detectedLanguage) {
    await pool.query(
      `UPDATE quote_ai_conversations SET detected_language = $1 WHERE id = $2`,
      [detectedLanguage, conv.id]
    );
  }

  const systemPrompt = buildSystemPrompt(ctx, detectedLanguage);
  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      content: m.role === "assistant" && m.contentType !== "text"
        ? `${m.content}\n[I previously sent a ${m.contentType} card]`
        : m.content,
    })),
    { role: "user" as const, content: cleanMsg },
  ];

  // Persist user message first
  if (conv) {
    await db.insert(quoteAiMessages).values({
      conversationId: conv.id,
      role: "user",
      content: cleanMsg,
      contentType: "text",
      inputMethod,
    });
  }

  let intent: DetectedIntent = "answer";
  let intentDetail = "";
  let replyText = "";
  let structured: StructuredPayload = null;
  let tokensUsed = 0;

  try {
    const r = await callAI(messages, {
      maxTokens: 700,
      userId: ownerId,
      route: "ai_concierge_widget",
      responseFormat: "json_object",
    });
    tokensUsed = r.tokensUsed;
    const parsed = safeParseJson<{
      intent?: string;
      replyText?: string;
      structured?: any;
      intentDetail?: string;
    }>(r.content);

    if (parsed) {
      const validIntents: DetectedIntent[] = [
        "answer", "negotiate", "compare", "objection", "scheduling",
        "buying_signal", "off_topic", "add_addon", "reschedule",
      ];
      intent = (validIntents.includes(parsed.intent as DetectedIntent) ? parsed.intent : "answer") as DetectedIntent;
      replyText = String(parsed.replyText || "").trim();
      intentDetail = String(parsed.intentDetail || "").slice(0, 200);

      // Validate structured payload
      if (parsed.structured && typeof parsed.structured === "object") {
        const sType = (parsed.structured as any).type;
        if (sType === "offer" && ctx.ownerCanNegotiate && !ctx.isPostAcceptance) {
          const rawOffered = parseFloat(String((parsed.structured as any).offeredTotal ?? 0));
          const original = totalNum(ctx.quote);
          if (rawOffered > 0 && original > 0) {
            const { offeredTotal, discountPct, allowed } = clampOffer(ctx, rawOffered);
            if (allowed && offeredTotal < original) {
              // Owner-approval threshold check: if AI's discount exceeds the
              // approval threshold but is still ≤ max, fire owner-approval
              // email and surface a "pending approval" note to the customer.
              const approvalThresholdPct = parseFloat(String(ctx.guardrails?.requiresOwnerApprovalAbove ?? ctx.guardrails?.maxDiscountPercent ?? 100));
              const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
              structured = {
                type: "offer",
                originalTotal: original,
                offeredTotal,
                discountPct: Math.round(discountPct * 10) / 10,
                justification: String((parsed.structured as any).justification || "").slice(0, 300),
                expiresAt,
                conversationId: conv?.id || "sandbox",
              };
              // Note: actual owner notification is dispatched after persistence below.
              if (discountPct > approvalThresholdPct && conv) {
                (structured as any).pendingApproval = true;
              }
            }
          }
        } else if (sType === "comparison_card" && ctx.ownerCanNegotiate) {
          const competitor = String((parsed.structured as any).competitor || "").slice(0, 60);
          const rawPoints = (parsed.structured as any).points || [];
          if (Array.isArray(rawPoints) && rawPoints.length > 0 && competitor) {
            const points = rawPoints
              .filter((p: any) => p && typeof p.label === "string")
              .slice(0, 6)
              .map((p: any) => ({
                label: String(p.label).slice(0, 60),
                us: String(p.us || "").slice(0, 120),
                them: String(p.them || "").slice(0, 120),
              }));
            if (points.length > 0) {
              structured = { type: "comparison_card", competitor, points };
            }
          }
        } else if (sType === "addon_offer" && ctx.ownerCanPostBookingActions && ctx.isPostAcceptance) {
          const addonName = String((parsed.structured as any).addonName || "").slice(0, 60).trim();
          const price = parseFloat(String((parsed.structured as any).price ?? 0));
          if (addonName && price > 0 && price < 1000) {
            // Verify the addon exists in the business catalog (don't trust the LLM)
            const catalog = ((ctx.business as any)?.addOnPricing as any[]) || [];
            const match = catalog.find((a: any) =>
              a && typeof a.name === "string" &&
              (a.name.toLowerCase() === addonName.toLowerCase() ||
                a.name.toLowerCase().includes(addonName.toLowerCase()) ||
                addonName.toLowerCase().includes(a.name.toLowerCase()))
            );
            if (match) {
              const addonKey = String((parsed.structured as any).addonKey || match.key || match.name).slice(0, 60);
              const verifiedPrice = parseFloat(String(match.price));
              if (isFinite(verifiedPrice) && verifiedPrice > 0) {
                const currentTotal = totalNum(ctx.quote);
                structured = {
                  type: "addon_offer",
                  addonKey,
                  addonName: match.name,
                  price: verifiedPrice,
                  currentTotal,
                  newTotal: Math.round((currentTotal + verifiedPrice) * 100) / 100,
                  conversationId: conv?.id || "sandbox",
                };
                intent = "add_addon";
              }
            }
          }
        } else if (sType === "reschedule_offer" && ctx.ownerCanPostBookingActions && ctx.isPostAcceptance) {
          // Slots are populated server-side from the booking calendar
          const slots = await fetchAvailableSlotsForQuote(ctx);
          if (slots.length > 0) {
            structured = {
              type: "reschedule_offer",
              slots,
              conversationId: conv?.id || "sandbox",
            };
            intent = "reschedule";
          }
        }
      }

      // Fallback: if AI mentioned competitor but didn't structure, mark intent
      if (!structured && intent === "answer") {
        const lower = cleanMsg.toLowerCase();
        if (COMPETITOR_NAMES.some((c) => lower.includes(c))) intent = "compare";
      }
    }

    if (!replyText) {
      // Last-resort fallback if JSON parse failed
      replyText = r.content
        .replace(/^```(?:json)?[\s\S]*?```$/i, "")
        .replace(/^\{[\s\S]*\}$/, "")
        .trim() || (detectedLanguage === "es"
        ? "Cuéntame más sobre tu pregunta."
        : "Could you tell me a bit more about your question?");
    }
  } catch (e: any) {
    const bizName =
      (ctx.business as any)?.companyName ||
      (ctx.business as any)?.businessName ||
      "us";
    const contact =
      (ctx.business as any)?.phone ||
      (ctx.business as any)?.email ||
      t(detectedLanguage, "contact_us");
    replyText = t(detectedLanguage, "fallback_error", { biz: bizName, contact });
  }

  let contentType: "text" | "offer" | "comparison_card" | "addon_offer" | "reschedule_offer" = "text";
  if (structured?.type === "offer") contentType = "offer";
  else if (structured?.type === "comparison_card") contentType = "comparison_card";
  else if (structured?.type === "addon_offer") contentType = "addon_offer";
  else if (structured?.type === "reschedule_offer") contentType = "reschedule_offer";

  // Owner-approval pending: prepend translated explanation to the customer reply
  let pendingOwnerApproval: ConciergeAnswer["pendingOwnerApproval"] | undefined;
  if (structured?.type === "offer" && (structured as any).pendingApproval && conv) {
    const original = totalNum(ctx.quote);
    pendingOwnerApproval = {
      requestedTotal: original, // we don't know what the customer asked for exactly
      offeredNowTotal: structured.offeredTotal,
    };
    const note = t(detectedLanguage, "pending_approval");
    replyText = `${note} ${replyText}`.trim();
    delete (structured as any).pendingApproval;
    // Fire-and-forget owner notification email
    sendOwnerApprovalEmail(ctx, conv.id, structured.offeredTotal, original, cleanMsg).catch((e) =>
      console.error("[concierge] owner approval email failed:", e?.message)
    );
  }

  // Persist assistant message
  if (conv) {
    await db.insert(quoteAiMessages).values({
      conversationId: conv.id,
      role: "assistant",
      content: replyText,
      contentType,
      structuredPayload: structured ? (structured as any) : null,
    });

    // Bump conversation counters
    const updates: string[] = ["total_messages = total_messages + 2", "last_message_at = now()"];
    if (structured?.type === "offer") updates.push("resulted_in_negotiation = true");
    await pool.query(
      `UPDATE quote_ai_conversations SET ${updates.join(", ")} WHERE id = $1`,
      [conv.id]
    );

    // Persist intent signal if non-trivial
    if (ownerId && intent !== "answer" && intent !== "off_topic") {
      const signalType =
        intent === "negotiate"
          ? "price_sensitivity"
          : intent === "compare"
          ? "comparison"
          : intent === "objection"
          ? "objection"
          : intent === "scheduling"
          ? "availability"
          : intent === "buying_signal"
          ? "addon_interest"
          : intent;
      db.insert(quoteAiIntentSignals)
        .values({
          userId: ownerId,
          quoteId,
          signalType,
          signalDetail: intentDetail || cleanMsg.slice(0, 180),
        })
        .catch(() => {});
    }

    // Analytics events
    if (ownerId) {
      trackEvent(ownerId, AnalyticsEvents.CONCIERGE_MESSAGE_SENT, {
        quoteId,
        intent,
        contentType,
        inputMethod,
        language: detectedLanguage,
      }).catch(() => {});
      if (intent !== "answer" && intent !== "off_topic") {
        trackEvent(ownerId, AnalyticsEvents.CONCIERGE_INTENT_DETECTED, { quoteId, intent }).catch(() => {});
      }
      if (structured?.type === "offer") {
        trackEvent(ownerId, AnalyticsEvents.CONCIERGE_OFFER_MADE, {
          quoteId,
          originalTotal: structured.originalTotal,
          offeredTotal: structured.offeredTotal,
          discountPct: structured.discountPct,
        }).catch(() => {});
      }
      if (structured?.type === "comparison_card") {
        trackEvent(ownerId, AnalyticsEvents.CONCIERGE_COMPARISON_SHOWN, {
          quoteId,
          competitor: structured.competitor,
        }).catch(() => {});
      }
      if (structured?.type === "addon_offer") {
        trackEvent(ownerId, "concierge_addon_offered" as any, {
          quoteId,
          addonName: structured.addonName,
          price: structured.price,
        }).catch(() => {});
      }
      if (structured?.type === "reschedule_offer") {
        trackEvent(ownerId, "concierge_reschedule_offered" as any, {
          quoteId,
          slotCount: structured.slots.length,
        }).catch(() => {});
      }
    }
  }

  return {
    content: replyText,
    contentType,
    structuredPayload: structured,
    conversationId: conv?.id || "sandbox",
    detectedLanguage,
    intent,
    suggestedFollowups: buildSuggestedPrompts(ctx, detectedLanguage).slice(0, 3),
    tokensUsed,
    pendingOwnerApproval,
  };
}

/* ─── Accept-offer flow ─────────────────────────────────────────────────── */

export async function acceptOffer(params: {
  quoteId: string;
  sessionId: string;
  offeredTotal: number;
  conversationId: string;
}): Promise<{ ok: boolean; conversationId: string; finalTotal: number } | null> {
  const { quoteId, sessionId, offeredTotal, conversationId } = params;
  const ctx = await loadQuoteContext(quoteId);
  if (!ctx || !ctx.ownerCanNegotiate || ctx.isPostAcceptance) return null;

  const original = totalNum(ctx.quote);

  // SECURITY: Look up the conversation by id and verify it belongs to this
  // quote. The browser session cookie is unreliable across requests so the
  // client passes back the conversationId it received with the offer.
  const convRows = await pool.query(
    `SELECT id, quote_id FROM quote_ai_conversations WHERE id = $1 LIMIT 1`,
    [conversationId]
  );
  const conv = convRows.rows[0];
  if (!conv || conv.quote_id !== quoteId) return null;

  // SECURITY: Verify offeredTotal exactly matches the most recent un-expired
  // assistant offer for this conversation. Without this check a customer could
  // POST any total within guardrails and have it accepted as the final price.
  const latestOffer = await pool.query(
    `SELECT structured_payload, created_at
     FROM quote_ai_messages
     WHERE conversation_id = $1
       AND role = 'assistant'
       AND content_type = 'offer'
     ORDER BY created_at DESC
     LIMIT 1`,
    [conv.id]
  );
  const offerRow = latestOffer.rows[0];
  if (!offerRow) return null;
  const payload = offerRow.structured_payload || {};
  const authoritativeOffered = parseFloat(String(payload.offeredTotal));
  if (!isFinite(authoritativeOffered) || authoritativeOffered <= 0) return null;
  // SECURITY: expiry is mandatory — every offer the concierge issues must
  // include a parseable expiresAt. Missing or invalid → reject.
  const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;
  if (!expiresAt || isNaN(expiresAt.getTime())) return null;
  if (expiresAt.getTime() < Date.now()) return null;
  // Allow ≤$0.01 drift to absorb float rounding only
  if (Math.abs(authoritativeOffered - offeredTotal) > 0.01) return null;

  // Re-clamp authoritative value against current guardrails as belt-and-suspenders
  const { offeredTotal: clamped, allowed } = clampOffer(ctx, authoritativeOffered);
  if (!allowed || clamped >= original) return null;

  await pool.query(
    `UPDATE quote_ai_conversations
     SET final_negotiated_total = $1,
         resulted_in_negotiation = true,
         last_message_at = now()
     WHERE id = $2`,
    [clamped.toFixed(2), conv.id]
  );

  // Track owner-side event
  const ownerId = (ctx.business as any)?.ownerUserId;
  if (ownerId) {
    trackEvent(ownerId, AnalyticsEvents.CONCIERGE_OFFER_ACCEPTED, {
      quoteId,
      originalTotal: original,
      acceptedTotal: clamped,
    }).catch(() => {});
  }

  return { ok: true, conversationId: conv.id, finalTotal: clamped };
}

/* ─── Proactive nudges ──────────────────────────────────────────────────── */

export async function buildNudge(params: {
  quoteId: string;
  sessionId: string;
  trigger: "idle_90s" | "scroll_past_price" | "tier_toggle" | "page_revisit" | "mobile_zoom_pricing";
}): Promise<{ shouldShow: boolean; text: string; language: SupportedLanguage } | null> {
  const ctx = await loadQuoteContext(params.quoteId);
  if (!ctx) return null;
  if (ctx.isPostAcceptance) return { shouldShow: false, text: "", language: "en" };
  // STARTER tier: proactive nudges are a Growth+ feature
  if (!ctx.ownerCanProactiveNudge) return { shouldShow: false, text: "", language: "en" };

  // Look up conversation; if any user messages exist, skip nudge.
  const conv = await getOrCreateConversation(params.quoteId, params.sessionId);
  const rawLang = String(conv.detectedLanguage || "en").toLowerCase();
  const lang: SupportedLanguage = (SUPPORTED_LANGUAGES as readonly string[]).includes(rawLang)
    ? (rawLang as SupportedLanguage)
    : "en";
  const userMsgCount = await pool.query(
    `SELECT COUNT(*)::int as n FROM quote_ai_messages WHERE conversation_id = $1 AND role = 'user'`,
    [conv.id]
  );
  if ((userMsgCount.rows[0]?.n ?? 0) > 0) return { shouldShow: false, text: "", language: lang };

  // Check cooldown — only one nudge per conversation
  const prior = await pool.query(
    `SELECT COUNT(*)::int as n FROM quote_ai_proactive_events WHERE conversation_id = $1`,
    [conv.id]
  );
  if ((prior.rows[0]?.n ?? 0) > 0) return { shouldShow: false, text: "", language: lang };

  // Pick contextual nudge text
  const addOns = (ctx.quote.addOns as any) || {};
  const hasPets = !!(addOns.pets || addOns.petHair || addOns.pet_hair);
  const freq = (ctx.quote.frequencySelected || "").toLowerCase();
  let key = "nudge_with_total";
  let vars: Record<string, string> = { total: fmtMoney(ctx.quote.total) };

  if (params.trigger === "scroll_past_price") {
    // Customer is scrolling past pricing — clearly comparing options
    key = "nudge_scroll";
    vars = {};
  } else if (hasPets) {
    key = "nudge_pet";
    vars = {};
  } else if (!freq.includes("week") && !freq.includes("month") && !freq.includes("biweek")) {
    key = "nudge_recurring";
    vars = {};
  }
  const text = t(lang, key, vars);

  // Persist nudge event
  await db.insert(quoteAiProactiveEvents).values({
    conversationId: conv.id,
    triggerType: params.trigger,
    nudgeShown: text,
  });

  // Analytics
  const ownerId = (ctx.business as any)?.ownerUserId;
  if (ownerId) {
    trackEvent(ownerId, AnalyticsEvents.CONCIERGE_NUDGE_SHOWN, {
      quoteId: params.quoteId,
      trigger: params.trigger,
    }).catch(() => {});
  }

  return { shouldShow: true, text, language: lang };
}

export async function markNudgeEngaged(conversationId: string) {
  await pool.query(
    `UPDATE quote_ai_proactive_events
     SET customer_engaged = true
     WHERE conversation_id = $1 AND id = (
       SELECT id FROM quote_ai_proactive_events
       WHERE conversation_id = $1
       ORDER BY created_at DESC LIMIT 1
     )`,
    [conversationId]
  );
}

/* ─── Post-booking helpers (T209/T210) ──────────────────────────────────── */

/**
 * Fetch upcoming open booking slots for a quote's business.
 * Returns at most 5 slots, formatted for display.
 */
export async function fetchAvailableSlotsForQuote(
  ctx: ConciergeQuoteContext
): Promise<{ datetime: string; label: string }[]> {
  const ownerId = (ctx.business as any)?.ownerUserId;
  if (!ownerId) return [];
  try {
    const { getAvailableSlots } = await import("./quoteRequestService");
    const all = await getAvailableSlots(ownerId);
    return all.slice(0, 5).map((s: any) => {
      const date = String(s.date || "");
      const time = String(s.time || s.timeSlot || "");
      const dt = `${date}T${time}:00`;
      let label = `${date} ${time}`;
      try {
        const d = new Date(dt);
        if (!isNaN(d.getTime())) {
          label = d.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }) + ` at ${time}`;
        }
      } catch {}
      return { datetime: dt, label };
    });
  } catch (e: any) {
    console.error("[concierge] fetchAvailableSlotsForQuote failed:", e?.message);
    return [];
  }
}

/**
 * Notify the business owner that the AI surfaced a discount request that
 * exceeds the auto-approval ceiling. Includes a deep link back to the
 * conversation in the dashboard.
 */
export async function sendOwnerApprovalEmail(
  ctx: ConciergeQuoteContext,
  conversationId: string,
  offeredNowTotal: number,
  originalTotal: number,
  customerMessage: string
): Promise<void> {
  const ownerEmail = (ctx.owner as any)?.email;
  if (!ownerEmail) return;
  const bizName =
    (ctx.business as any)?.companyName ||
    (ctx.business as any)?.businessName ||
    "your business";
  const customerName =
    (ctx.customer as any)?.firstName ||
    (ctx.customer as any)?.fullName ||
    "A customer";
  const { sendEmail, BASE_APP_URL } = await import("../mail");
  const dashboardUrl = `${BASE_APP_URL}/ai-concierge?conversation=${encodeURIComponent(conversationId)}`;
  const savings = Math.max(0, originalTotal - offeredNowTotal).toFixed(2);
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1e293b;">
      <h2 style="margin:0 0 16px;">Approval requested</h2>
      <p>${customerName} asked for a discount that's beyond your auto-approval ceiling on a <strong>${bizName}</strong> quote.</p>
      <p style="background:#f1f5f9;padding:12px;border-radius:8px;margin:16px 0;">
        <strong>Original total:</strong> $${originalTotal.toFixed(2)}<br>
        <strong>AI offered now (within ceiling):</strong> $${offeredNowTotal.toFixed(2)} (saved $${savings})
      </p>
      <p style="background:#fef3c7;padding:12px;border-radius:8px;margin:16px 0;color:#78350f;">
        <strong>Customer said:</strong> "${customerMessage.slice(0, 200).replace(/[<>]/g, "")}"
      </p>
      <p>Open the conversation to approve a deeper discount or message the customer directly:</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${dashboardUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View conversation</a>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px;">QuotePro AI Concierge — auto-approval ceiling enforced</p>
    </div>
  `;
  await sendEmail({
    to: ownerEmail,
    subject: `Approval requested: ${customerName} on a ${bizName} quote`,
    html,
  });
}

/**
 * Apply an add-on chosen from an addon_offer card to a post-acceptance booking.
 * Verifies addon catalog membership, updates quote total, mirrors to bookings if present,
 * and sends confirmation email to the customer + owner.
 */
export async function handleAddAddon(params: {
  quoteId: string;
  sessionId: string;
  conversationId: string;
  addonKey: string;
}): Promise<{ ok: boolean; newTotal: number; addonName: string } | null> {
  const ctx = await loadQuoteContext(params.quoteId);
  if (!ctx) return null;
  if (!ctx.ownerCanPostBookingActions) return null;
  if (!ctx.isPostAcceptance) return null;

  // Verify the conversation belongs to this quote
  const convRows = await pool.query(
    `SELECT id, quote_id FROM quote_ai_conversations WHERE id = $1 LIMIT 1`,
    [params.conversationId]
  );
  if (!convRows.rows[0] || convRows.rows[0].quote_id !== params.quoteId) return null;

  // Verify the addon exists in the catalog and pull authoritative price
  const catalog = ((ctx.business as any)?.addOnPricing as any[]) || [];
  const match = catalog.find((a: any) => {
    if (!a) return false;
    return (
      String(a.key || "") === params.addonKey ||
      String(a.name || "").toLowerCase() === params.addonKey.toLowerCase()
    );
  });
  if (!match) return null;
  const price = parseFloat(String(match.price || 0));
  if (!isFinite(price) || price <= 0 || price > 1000) return null;
  const addonName = String(match.name || params.addonKey);

  const currentTotal = totalNum(ctx.quote);
  const newTotal = Math.round((currentTotal + price) * 100) / 100;

  // Update the quote: append to addOns + bump total
  const existingAddOns = (ctx.quote.addOns as any) || {};
  const addonsList = Array.isArray(existingAddOns.conciergeAdded)
    ? existingAddOns.conciergeAdded
    : [];
  addonsList.push({
    key: match.key || addonName,
    name: addonName,
    price,
    addedAt: new Date().toISOString(),
    via: "ai_concierge",
  });
  const updatedAddOns = { ...existingAddOns, conciergeAdded: addonsList };

  await pool.query(
    `UPDATE quotes SET add_ons = $1, total = $2 WHERE id = $3`,
    [JSON.stringify(updatedAddOns), newTotal.toFixed(2), params.quoteId]
  );

  // Mirror to bookings if a row exists for this owner + customer email
  const ownerId = (ctx.business as any)?.ownerUserId;
  const customerEmail = (ctx.customer as any)?.email;
  if (ownerId && customerEmail) {
    await pool.query(
      `UPDATE bookings
       SET quote_amount = COALESCE(quote_amount, 0) + $1,
           notes = COALESCE(notes, '') || E'\nAI Concierge added: ' || $2 || ' ($' || $1 || ')',
           updated_at = now()
       WHERE user_id = $3 AND customer_email = $4`,
      [price.toFixed(2), addonName, ownerId, customerEmail]
    );
  }

  // Persist as assistant message in conversation
  await db.insert(quoteAiMessages).values({
    conversationId: params.conversationId,
    role: "assistant",
    content: `Added ${addonName} to your booking. New total: $${newTotal.toFixed(2)}.`,
    contentType: "text",
  });

  // Send confirmation emails
  try {
    const { sendEmail } = await import("../mail");
    const bizName =
      (ctx.business as any)?.companyName ||
      (ctx.business as any)?.businessName ||
      "your cleaner";
    if (customerEmail) {
      await sendEmail({
        to: customerEmail,
        subject: `Added ${addonName} to your ${bizName} booking`,
        html: `<p>We've added <strong>${addonName}</strong> ($${price.toFixed(2)}) to your upcoming visit.</p><p>New total: <strong>$${newTotal.toFixed(2)}</strong>. See you soon!</p>`,
      });
    }
    const ownerEmail = (ctx.owner as any)?.email;
    if (ownerEmail) {
      await sendEmail({
        to: ownerEmail,
        subject: `Concierge added ${addonName} to a booking`,
        html: `<p>${(ctx.customer as any)?.firstName || "A customer"} added <strong>${addonName}</strong> ($${price.toFixed(2)}) to their booking via the AI Concierge.</p><p>New total: <strong>$${newTotal.toFixed(2)}</strong>.</p>`,
      });
    }
  } catch (e: any) {
    console.error("[concierge] addon confirmation email failed:", e?.message);
  }

  // Analytics
  if (ownerId) {
    trackEvent(ownerId, "concierge_addon_applied" as any, {
      quoteId: params.quoteId,
      addonName,
      price,
      newTotal,
    }).catch(() => {});
  }

  return { ok: true, newTotal, addonName };
}

/**
 * Apply a slot chosen from a reschedule_offer card to a post-acceptance booking.
 * Creates a rescheduleRequests row and notifies the owner.
 */
export async function handleReschedule(params: {
  quoteId: string;
  sessionId: string;
  conversationId: string;
  datetime: string; // ISO "YYYY-MM-DDTHH:MM:00"
}): Promise<{ ok: boolean; requestedDate: string; requestedTime: string } | null> {
  const ctx = await loadQuoteContext(params.quoteId);
  if (!ctx) return null;
  if (!ctx.ownerCanPostBookingActions) return null;
  if (!ctx.isPostAcceptance) return null;

  // Verify the conversation belongs to this quote
  const convRows = await pool.query(
    `SELECT id, quote_id FROM quote_ai_conversations WHERE id = $1 LIMIT 1`,
    [params.conversationId]
  );
  if (!convRows.rows[0] || convRows.rows[0].quote_id !== params.quoteId) return null;

  // Parse + validate slot
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(params.datetime || "");
  if (!m) return null;
  const requestedDate = m[1];
  const requestedTime = m[2];

  // Verify the slot is currently available
  const available = await fetchAvailableSlotsForQuote(ctx);
  const matched = available.find((s) => s.datetime.startsWith(`${requestedDate}T${requestedTime}`));
  if (!matched) return null;

  // Create reschedule_requests row. portalToken is the quote token.
  const portalToken = String(ctx.quote.token || params.quoteId).slice(0, 64);
  await pool.query(
    `INSERT INTO reschedule_requests (portal_token, requested_date, preferred_time, customer_note, status)
     VALUES ($1, $2, $3, $4, 'pending')`,
    [portalToken, requestedDate, requestedTime, "Requested via AI Concierge"]
  );

  // Persist as assistant message
  await db.insert(quoteAiMessages).values({
    conversationId: params.conversationId,
    role: "assistant",
    content: `Rescheduled requested for ${matched.label}. We'll confirm shortly.`,
    contentType: "text",
  });

  // Notify owner
  try {
    const { sendEmail, BASE_APP_URL } = await import("../mail");
    const ownerEmail = (ctx.owner as any)?.email;
    const customerName =
      (ctx.customer as any)?.firstName ||
      (ctx.customer as any)?.fullName ||
      "A customer";
    if (ownerEmail) {
      await sendEmail({
        to: ownerEmail,
        subject: `Reschedule requested: ${customerName} → ${matched.label}`,
        html: `<p>${customerName} used the AI Concierge to request a reschedule to <strong>${matched.label}</strong>.</p><p><a href="${BASE_APP_URL}/jobs">Review and confirm</a></p>`,
      });
    }
  } catch (e: any) {
    console.error("[concierge] reschedule email failed:", e?.message);
  }

  // Analytics
  const ownerId = (ctx.business as any)?.ownerUserId;
  if (ownerId) {
    trackEvent(ownerId, "concierge_reschedule_applied" as any, {
      quoteId: params.quoteId,
      requestedDate,
      requestedTime,
    }).catch(() => {});
  }

  return { ok: true, requestedDate, requestedTime };
}
