import { Router, type Request, type Response } from "express";
import { requireAuth, requireGrowth } from "../../middleware";
import { getLangInstruction, getEffectiveLang, getPublicBaseUrl } from "../../clients";
import { generateText } from "../../services/ai.service";
import { callAI } from "../../aiClient";
import { sanitizeAndLog } from "../../promptSanitizer";
import { SHARED_PURPOSE_DESCRIPTIONS } from "../../helpers";
import { trackEvent } from "../../analytics";
import { AnalyticsEvents } from "../../../shared/analytics-events";
import { sendEmail, getBusinessSendParams } from "../../mail";
import {
  getBusinessByOwner, getQuoteById, getCustomerById,
  getGrowthAutomationSettings, createCommunication,
} from "../../storage";
import { db_getBusinessById } from "../../helpers";

const router = Router();

router.post("/ai/job-update-message", requireAuth, requireGrowth, async (req: Request, res: Response) => {
  try {
    const { type, customerName, companyName, senderName, updateLink, language: commLang } = req.body;
    if (!type) return res.status(400).json({ message: "type is required" });

    const jobMsgBusiness = await getBusinessByOwner(req.session.userId!);
    const langInstruction = getLangInstruction(commLang || (jobMsgBusiness as any)?.commLanguage);
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

    const statusDetail = STATUS_CONTEXT[type] || `Your service is in progress.${linkPart}`;

    const isSmsType = type === "sms";
    const systemPrompt = isSmsType
      ? `Write a very short SMS (2-3 sentences max) for a cleaning company. No emojis. Be warm but extremely brief. Start with "Hi ${name}, this is ${sender} from ${company}." Then one short sentence about the update. Nothing else.${langInstruction}`
      : `Write a short, warm text message (3-5 sentences) that a cleaner would send to a customer. No subject line. No emojis. No formal email format. Sign off with just "${sender}". Start with "Hi ${name}," — do NOT use email structure.${langInstruction}`;

    const userPrompt = `Customer update: ${statusDetail} Reply with ONLY the message text, nothing else.`;

    const content = await generateText({
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 150,
    });

    if (!content) return res.status(500).json({ message: "No response from AI" });
    return res.json({ message: content.trim() });
  } catch (error: any) {
    console.error("Job update message error:", error);
    return res.status(500).json({ message: "Failed to generate message" });
  }
});

router.post("/ai/generate-followup", requireAuth, requireGrowth, async (req: Request, res: Response) => {
  try {
    const { quoteId, channel, context, language: commLang } = req.body;
    if (!quoteId) return res.status(400).json({ message: "quoteId is required" });

    const quote = await getQuoteById(quoteId);
    if (!quote) return res.status(404).json({ message: "Quote not found" });

    const customer = quote.customerId ? await getCustomerById(quote.customerId) : null;
    const business = await db_getBusinessById(quote.businessId);
    const ageDays = Math.round(((Date.now() - (quote.sentAt?.getTime() || quote.createdAt.getTime())) / (1000 * 60 * 60 * 24)) * 10) / 10;

    const msgType = channel === "email" ? "email" : "SMS";
    const maxLen = channel === "email" ? 200 : 160;
    const effectiveLang = commLang || await getEffectiveLang(customer?.id, (business as any)?.commLanguage);
    const langInstruction = getLangInstruction(effectiveLang);

    const draft = await generateText({
      system: `Write a ${msgType} follow-up message (under ${maxLen} chars for SMS) for "${business?.companyName || "our company"}". The quote is $${quote.total} sent ${ageDays} days ago. Be warm, not pushy. No emojis. Sign as "${business?.senderName || "Team"}".${context ? ` Context: ${context}` : ""}${langInstruction}`,
      messages: [{
        role: "user",
        content: `Generate a follow-up ${msgType} for ${customer ? `${customer.firstName}` : "the customer"}. Reply with ONLY the message text.`,
      }],
      maxTokens: channel === "email" ? 250 : 100,
    });
    trackEvent(req.session.userId!, AnalyticsEvents.AI_FOLLOWUP_SENT, { quoteId, channel }).catch(() => {});
    return res.json({ draft });
  } catch (error: any) {
    console.error("AI generate followup error:", error);
    return res.status(500).json({ message: "Failed to generate follow-up" });
  }
});

router.post("/send/email", requireAuth, requireGrowth, async (req: Request, res: Response) => {
  try {
    const { to, subject, body, customerId, quoteId, includeQuoteLink } = req.body;
    if (!to || !body) {
      return res.status(400).json({ message: "to and body are required" });
    }

    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const { fromName, replyTo: replyToEmail } = getBusinessSendParams(business);

    let bodyContent = body;
    let quoteButtonHtml = "";
    let optionCardsHtml = "";

    if (quoteId) {
      const quote = await getQuoteById(quoteId);
      if (quote && quote.publicToken) {
        const quoteUrl = `${getPublicBaseUrl(req)}/q/${quote.publicToken}`;
        const qpEmail = (business as any).quotePreferences;
        const primaryColor = qpEmail?.brandColor || business.primaryColor || "#2563EB";

        const opts = (quote.options as any) || {};
        const savedRecommended = (quote as any).recommendedOption || "better";
        const tierCards = (["good", "better", "best"] as const)
          .filter(k => opts[k] !== undefined)
          .map(k => {
            const opt = opts[k];
            const price = Number(opt.price || 0);
            const name = opt.name || opt.serviceTypeName || k.charAt(0).toUpperCase() + k.slice(1);
            const scope = opt.scope || "";
            const isRec = k === savedRecommended;
            const borderColor = isRec ? primaryColor : "#eeeeee";
            const bgColor = isRec ? "#f9f9ff" : "#ffffff";
            const badgeHtml = isRec
              ? `<div style="display:inline-block;background:${primaryColor};color:white;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;margin-bottom:12px;letter-spacing:0.5px;">RECOMMENDED</div><br/>`
              : "";
            return `
<tr><td style="padding:8px 16px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${borderColor};border-radius:8px;background-color:${bgColor};">
    <tr><td style="padding:20px;">
      ${badgeHtml}
      <div style="font-size:18px;font-weight:700;color:#333333;margin-bottom:4px;">${name}</div>
      ${scope ? `<div style="font-size:13px;color:#666666;margin-bottom:14px;line-height:1.4;">${scope}</div>` : ""}
      <div style="font-size:26px;font-weight:700;color:${primaryColor};margin-bottom:16px;">$${price.toFixed(2)}</div>
      <a href="${quoteUrl}?option=${k}" style="display:block;background:${primaryColor};color:white;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;text-align:center;">Accept ${name}</a>
    </td></tr>
  </table>
</td></tr>`;
          })
          .join("");

        if (tierCards) {
          optionCardsHtml = `
<tr><td style="padding:24px 0 8px;text-align:center;border-top:1px solid #eeeeee;">
  <h2 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#333333;">Your Quote Options</h2>
  <p style="margin:0;font-size:13px;color:#666666;">Select the package that works best for you.</p>
</td></tr>
<tr><td>
  <table width="100%" cellpadding="0" cellspacing="0">
    ${tierCards}
  </table>
</td></tr>
<tr><td style="padding:16px;text-align:center;background-color:#f9f9f9;border-top:1px solid #eeeeee;">
  <p style="margin:0;font-size:12px;color:#666666;line-height:1.5;">
    Or reply with <strong>1</strong> (Good), <strong>2</strong> (Better), or <strong>3</strong> (Best) to select your option.
  </p>
</td></tr>`;
        } else if (includeQuoteLink) {
          quoteButtonHtml = `
<div style="margin-top:24px;text-align:center;">
  <a href="${quoteUrl}" style="display:inline-block;background:${primaryColor};color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">View & Accept Your Quote</a>
</div>`;
        }
      }
    }

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#007AFF,#5856D6);padding:24px 32px;">
          <h2 style="color:#ffffff;margin:0;font-size:20px;">${fromName}</h2>
        </td></tr>
        <tr><td style="padding:32px;">
          ${bodyContent.split('\n').map((line: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#333333;">${line}</p>`).join('')}
          ${quoteButtonHtml}
        </td></tr>
        ${optionCardsHtml}
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#999999;">Sent via QuotePro</p>
          <p style="margin:4px 0 0;font-size:11px;color:#bbbbbb;">If you no longer wish to receive these emails, please reply with "unsubscribe".</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await sendEmail({
        to,
        subject: subject || `Message from ${fromName}`,
        html: htmlBody,
        text: bodyContent,
        fromName,
        replyTo: replyToEmail,
      });
    } catch (mailErr: any) {
      console.error("[mail] Send email error:", mailErr);
      return res.status(502).json({ message: "Email could not be delivered. Please try again or contact support." });
    }

    console.log(`[mail] Email sent to ${to}`);

    await createCommunication({
      businessId: business.id,
      customerId: customerId || undefined,
      quoteId: quoteId || undefined,
      channel: "email",
      direction: "outbound",
      content: bodyContent,
      status: "sent",
    });

    return res.json({ success: true, message: "Email sent successfully" });
  } catch (error: any) {
    console.error("Send email error:", error);
    return res.status(500).json({ message: "Failed to send email" });
  }
});

router.post("/ai/generate-campaign-content", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const { campaignName, segment, customPrompt, useAI } = req.body;

    const businessName = business.companyName || "our cleaning company";
    const ownerName = business.senderName || business.companyName || "Your cleaning team";
    const signOff = ownerName;

    const instantTemplates: Record<string, { subject: string; content: string }> = {
      "Holiday Deep Clean": {
        subject: `Holiday Deep Clean - ${businessName}`,
        content: `Hi [Customer],\n\nThe holidays are almost here! Let ${businessName} get your home guest-ready with a thorough deep clean.\n\nWe'll tackle kitchens, bathrooms, and living spaces so every room sparkles for your gatherings.\n\nReply to book and we'll schedule at your convenience.\n\nBest regards,\n${signOff}`,
      },
      "Spring Cleaning Special": {
        subject: `Spring Cleaning Special - ${businessName}`,
        content: `Hi [Customer],\n\nSpring is here! Time to refresh your home after winter with a deep clean from ${businessName}.\n\nWe'll dust, scrub, and polish every corner so your space feels brand new for the warmer months.\n\nReply to book your spring cleaning today.\n\nBest regards,\n${signOff}`,
      },
      "New Year Fresh Start": {
        subject: `Start the New Year Fresh - ${businessName}`,
        content: `Hi [Customer],\n\nHappy New Year! Start fresh with a spotless home from ${businessName}.\n\nA clean home sets the tone for a great year ahead. Let us handle the deep clean so you can focus on your goals.\n\nReply to book and kick off the year right.\n\nBest regards,\n${signOff}`,
      },
      "Back to School Clean": {
        subject: `Back to School Clean - ${businessName}`,
        content: `Hi [Customer],\n\nSchool is starting! Get your home refreshed after a busy summer with ${businessName}.\n\nWe'll deep clean every room so your family can settle into a clean, organized routine.\n\nReply to book your back-to-school cleaning.\n\nBest regards,\n${signOff}`,
      },
      "Win Back Lost Leads": {
        subject: `We'd Love to Hear from You - ${businessName}`,
        content: `Hi [Customer],\n\nIt's been a while since we connected. We'd love the chance to earn your business at ${businessName}.\n\nWhether your needs have changed or you're ready for a fresh quote, we're here to help.\n\nReply to this email and we'll get you taken care of.\n\nBest regards,\n${signOff}`,
      },
      "VIP Customer Appreciation": {
        subject: `Thank You from ${businessName}`,
        content: `Hi [Customer],\n\nThank you for being a valued customer of ${businessName}. We truly appreciate your continued trust.\n\nAs a loyal client, we'd love to offer you priority booking for your next cleaning.\n\nReply to book and we'll schedule you at your preferred time.\n\nWarm regards,\n${signOff}`,
      },
    };

    if (!useAI && !customPrompt?.trim() && instantTemplates[campaignName]) {
      const template = instantTemplates[campaignName];
      return res.json({ content: template.content, subject: template.subject, channel: "email" });
    }

    const targetDesc = segment === "dormant" ? "past customers who haven't booked in a while" : segment === "lost" ? "leads whose quotes expired" : "customers";
    const customInstruction = customPrompt?.trim() ? ` Focus: ${customPrompt.trim()}.` : "";
    const campaignLangInstruction = getLangInstruction((business as any).commLanguage);
    const systemPrompt = `Write a short marketing email for "${businessName}" (${ownerName}) to ${targetDesc}. Theme: "${campaignName}".${customInstruction} Rules: first line "Subject: ..." then blank line then body under 60 words in 3 short paragraphs. Use [Customer] as name. Sign off as ${signOff}. No links, no emojis. End with "Reply to book".${campaignLangInstruction}`;

    let raw = "";
    try {
      const { content: aiRaw } = await callAI(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Write the email." },
        ],
        { userId: req.session.userId, route: "generate-campaign-content" }
      );
      raw = aiRaw;
    } catch (aiErr: any) {
      console.error("AI campaign content error:", aiErr?.message || aiErr);
    }

    if (!raw) {
      const fallback = instantTemplates[campaignName] || { content: `Hi [Customer],\n\nWe wanted to reach out from ${businessName} about our ${campaignName} offer.\n\nWe'd love to serve you${segment === "dormant" ? " again" : ""}. Reply to schedule your next cleaning.\n\nBest regards,\n${signOff}`, subject: campaignName };
      return res.json({ content: fallback.content, subject: fallback.subject, channel: "email" });
    }

    let subject = "";
    let content = raw;
    const subjectMatch = raw.match(/^Subject:\s*(.+)/i);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
      content = raw.substring(raw.indexOf("\n") + 1).trim();
    }

    return res.json({ content, subject: subject || campaignName, channel: "email" });
  } catch (error: any) {
    console.error("AI generate campaign content error:", error?.message || error, error?.code, error?.status);
    return res.status(500).json({ message: "Failed to generate campaign content" });
  }
});

router.post("/ai/generate-review-email", requireAuth, async (req: Request, res: Response) => {
  try {
    const business = await getBusinessByOwner(req.session.userId!);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const businessName = business.companyName || "our cleaning company";
    const ownerName = business.senderName || "";

    const growthSettings = await getGrowthAutomationSettings(business.id);
    const googleReviewLink = growthSettings?.googleReviewLink?.trim() || "";

    const linkInstruction = googleReviewLink
      ? `Include this Google review link in the email naturally: ${googleReviewLink} — encourage them to click it to leave a review.`
      : `No links/URLs. Ask them to reply with their feedback or leave a review.`;

    const reviewLangInstruction = getLangInstruction((business as any).commLanguage);
    const systemPrompt = `Write a short, warm email from "${businessName}"${ownerName ? ` (${ownerName})` : ""} asking a customer for a review of their cleaning service. Format: first line "Subject: ...", blank line, then body under 100 words. Use [Customer] for their name. No placeholders for company/owner - use real names. ${linkInstruction} No emojis. Keep it personal and genuine.${reviewLangInstruction}`;

    let rawReview = "";
    try {
      const { content: aiRaw } = await callAI(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate a review request email." },
        ],
        { maxTokens: 250, userId: req.session.userId, route: "generate-review-email" }
      );
      rawReview = aiRaw;
    } catch (aiErr: any) {
      console.error("AI generate review email error:", aiErr?.message || aiErr);
    }

    const raw = rawReview;
    let subject = "";
    let content = raw;
    if (raw.startsWith("Subject:")) {
      const lines = raw.split("\n");
      subject = lines[0].replace("Subject:", "").trim();
      content = lines.slice(1).join("\n").trim();
    }

    const fallbackLink = googleReviewLink ? `\n\nLeave us a review here: ${googleReviewLink}` : "";
    if (!content) {
      return res.json({
        content: `Dear [Customer],\n\nThank you for choosing ${businessName}. We hope you were happy with our service.\n\nWould you take a moment to share your experience? Your feedback helps us improve and means a lot to our team.${fallbackLink}\n\nWe appreciate your time!\n\nBest regards,\n${ownerName || businessName}`,
        subject: "We would love your feedback",
        channel: "email",
      });
    }

    return res.json({ content, subject, channel: "email" });
  } catch (error: any) {
    console.error("AI generate review email error:", error?.message || error);
    const business = await getBusinessByOwner(req.session.userId!).catch(() => null);
    const businessName = business?.companyName || "our cleaning company";
    const ownerName = business?.senderName || businessName;
    let fallbackLink = "";
    try {
      if (business) {
        const gs = await getGrowthAutomationSettings(business.id);
        if (gs?.googleReviewLink?.trim()) fallbackLink = `\n\nLeave us a review here: ${gs.googleReviewLink.trim()}`;
      }
    } catch {}
    return res.json({
      content: `Dear [Customer],\n\nThank you for choosing ${businessName}. We hope you were happy with our service.\n\nWould you take a moment to share your experience? Your feedback helps us improve and means a lot to our team.${fallbackLink}\n\nWe appreciate your time!\n\nBest regards,\n${ownerName}`,
      subject: "We would love your feedback",
      channel: "email",
    });
  }
});

router.post("/ai/generate-message", requireAuth, async (req: Request, res: Response) => {
  try {
    const { channel, total, status, quoteLink, bookingLink, paymentMethodsText, language: commLang, quoteId } = req.body;
    const purpose = sanitizeAndLog(req.body.purpose || "", req.session.userId!, "generate-message-purpose");
    const customerName = sanitizeAndLog(req.body.customerName || "", req.session.userId!, "generate-message-customer");
    const companyName = sanitizeAndLog(req.body.companyName || "", req.session.userId!, "generate-message-company");
    const senderName = sanitizeAndLog(req.body.senderName || "", req.session.userId!, "generate-message-sender");
    const msgType = (channel || "email") as string;
    const purposeInstruction = SHARED_PURPOSE_DESCRIPTIONS[purpose] || `purpose: ${purpose}`;

    const genMsgBusiness = await getBusinessByOwner(req.session.userId!);
    const paymentInfo = paymentMethodsText ? ` Mention accepted payment methods: ${paymentMethodsText}.` : "";
    const langInstruction = getLangInstruction(commLang || (genMsgBusiness as any)?.commLanguage);

    let quotePackageContext = "";
    let quoteRecommendedName = "";
    if (purpose === "send_quote" && quoteId) {
      try {
        const quoteData = await getQuoteById(quoteId);
        if (quoteData) {
          const opts = (quoteData.options as any) || {};
          const recKey = (quoteData as any).recommendedOption || "better";
          const tierLines = (["good", "better", "best"] as const)
            .filter(k => opts[k] !== undefined)
            .map(k => {
              const o = opts[k];
              const name = o.name || o.serviceTypeName || (k.charAt(0).toUpperCase() + k.slice(1));
              const price = Number(o.price || 0);
              const isRec = k === recKey;
              if (isRec) quoteRecommendedName = name;
              return `${name}: $${price.toFixed(0)}${isRec ? " (recommended)" : ""}`;
            });
          if (tierLines.length > 0) {
            quotePackageContext = ` The quote includes ${tierLines.length} packages: ${tierLines.join(", ")}.`;
          }
        }
      } catch {}
    }
    const quoteContext = quotePackageContext || (total ? ` Quote total: $${total}.` : "");

    let systemPrompt: string;
    let userPrompt: string;

    if (msgType === "sms") {
      systemPrompt = `Write a short SMS (under 160 chars) for a cleaning company called "${companyName || "our company"}". Sign as "${senderName || "Team"}". No hours/time estimates. No emojis. Be friendly but brief.${bookingLink ? ` Include link: ${bookingLink}` : ""}${quoteLink ? ` Include this quote link for the customer to view and accept: ${quoteLink}` : ""}${langInstruction}`;
      userPrompt = `SMS for ${purposeInstruction}. Customer: ${customerName || "Customer"}.${quoteContext}${paymentInfo} Reply with ONLY the message text, nothing else.`;
    } else if (purpose === "send_quote") {
      systemPrompt = `Write a short professional email (under 160 words) for "${companyName || "our company"}". Sign as "${senderName || "Team"}". No hours/time estimates. No emojis. IMPORTANT: Do NOT mention specific dollar amounts — the email will include clickable pricing cards below showing each package with its price. Instead, mention the package names and invite the customer to choose. Do NOT include any URLs in the body — a styled quote button is added automatically. Start with "Subject: " on line 1, blank line, then body.${langInstruction}`;
      userPrompt = `Write a quote delivery email to ${customerName || "the customer"}.${quoteContext}${quoteRecommendedName ? ` Highlight the recommended package "${quoteRecommendedName}" by name.` : ""} The email should: greet ${customerName || "them"} by name, let them know their quote has multiple cleaning packages to choose from (pricing cards will appear below), invite them to reply with questions, sign off warmly from ${senderName || "the team"}.${paymentInfo} Reply with ONLY the email.`;
    } else {
      systemPrompt = `Write a short professional email (under 150 words) for "${companyName || "our company"}". Sign as "${senderName || "Team"}". No hours/time estimates. No emojis.${bookingLink ? ` Include link: ${bookingLink}` : ""}${quoteLink ? ` Do NOT include the raw URL in the email body. Instead, write a sentence like "You can view and accept your quote by clicking the link below." A styled button with the link will be automatically added after your email.` : ""} Start with "Subject: " on line 1, blank line, then body.${langInstruction}`;
      userPrompt = `Email for ${purposeInstruction}. Customer: ${customerName || "Customer"}.${quoteContext}${paymentInfo} Reply with ONLY the email, nothing else.`;
    }

    let draft = "";
    try {
      const { content: aiDraft } = await callAI(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        {
          maxTokens: msgType === "sms" ? 100 : 250,
          userId: req.session.userId,
          route: "generate-message",
        }
      );
      draft = aiDraft;
    } catch (aiErr: any) {
      console.error("AI generate message error:", aiErr?.message || aiErr);
      return res.status(503).json({ message: "AI is temporarily unavailable. Please try again." });
    }

    if (draft.startsWith('"') && draft.endsWith('"')) draft = draft.slice(1, -1);
    if (draft.startsWith('{')) { try { const p = JSON.parse(draft); draft = p.draft || p.message || draft; } catch {} }
    draft = draft.replace(/\\n/g, '\n');

    return res.json({ message: draft, draft });
  } catch (error: any) {
    console.error("AI generate message error:", error);
    return res.status(500).json({ message: "Failed to generate message" });
  }
});

export default router;
