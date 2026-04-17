import { describe, it, expect } from "vitest";
import {
  SPAM_FOLDER_HINT_TEXT,
  spamFolderHintHtml,
  buildSendQuoteWithPdfEmail,
  buildOnboardingQuoteEmail,
  buildBookingConfirmationEmail,
} from "./customerEmails";

describe("spam folder hint helper", () => {
  it("exports the hint text used across customer emails", () => {
    expect(SPAM_FOLDER_HINT_TEXT).toBe(
      "Don't see this email next time? Check your spam or junk folder and mark it as not spam.",
    );
  });

  it("renders the hint as an HTML paragraph containing the exact wording", () => {
    const html = spamFolderHintHtml();
    expect(html).toContain(SPAM_FOLDER_HINT_TEXT);
    expect(html).toMatch(/<p[^>]*>.*Check your spam or junk folder.*<\/p>/);
  });
});

const fakeBusiness = {
  companyName: "Sparkle Cleaners",
  phone: "555-1212",
  logoUri: "",
};

describe("buildSendQuoteWithPdfEmail (POST /api/quotes/:id/send-with-pdf)", () => {
  const baseInput = {
    business: fakeBusiness,
    growthSettings: undefined,
    primaryColor: "#2563EB",
    customerName: "Jane Doe",
    customBody: undefined,
    propertyInfoHtml: "",
    optionsCardsHtml: "<tr><td>option</td></tr>",
    replyToEmail: "owner@sparkle.com",
    quoteUrl: "https://app.example.com/q/abc123",
  };

  it("includes the spam folder hint in the HTML body", () => {
    const { html } = buildSendQuoteWithPdfEmail(baseInput);
    expect(html).toContain(SPAM_FOLDER_HINT_TEXT);
  });

  it("includes the spam folder hint in the plain-text alternative", () => {
    const { text } = buildSendQuoteWithPdfEmail(baseInput);
    expect(text).toContain(SPAM_FOLDER_HINT_TEXT);
  });

  it("includes the spam folder hint when a custom body is provided", () => {
    const { html, text } = buildSendQuoteWithPdfEmail({
      ...baseInput,
      customBody: "Thanks for your interest! Here is your quote.",
    });
    expect(html).toContain(SPAM_FOLDER_HINT_TEXT);
    expect(text).toContain(SPAM_FOLDER_HINT_TEXT);
  });
});

describe("buildOnboardingQuoteEmail (POST /api/quotes/:id/onboarding-send)", () => {
  const baseInput = {
    business: fakeBusiness,
    customerName: "Jane Doe",
    propertySummary: "3 Bed &middot; 2 Bath &middot; 1500 Sq Ft",
    cardCells: "<td>card</td>",
    replyToEmail: "owner@sparkle.com",
    quoteUrl: "https://app.example.com/q/abc123",
  };

  it("includes the spam folder hint in the HTML body", () => {
    const { html } = buildOnboardingQuoteEmail(baseInput);
    expect(html).toContain(SPAM_FOLDER_HINT_TEXT);
  });

  it("includes the spam folder hint in the plain-text alternative", () => {
    const { text } = buildOnboardingQuoteEmail(baseInput);
    expect(text).toContain(SPAM_FOLDER_HINT_TEXT);
  });
});

describe("buildBookingConfirmationEmail (POST /q/:token/book)", () => {
  const baseInput = {
    bookingDateStr: "Monday, May 4, 2026",
    bookingTimeStr: "9:00 AM",
    endTimeStr: "12:00 PM",
    address: "123 Main St",
    serviceLabel: "Standard Clean",
    total: 199,
    confirmMsg: "We look forward to seeing you!",
    senderLine: "Sparkle Cleaners",
  };

  it("includes the spam folder hint in the HTML body", () => {
    const { html } = buildBookingConfirmationEmail(baseInput);
    expect(html).toContain(SPAM_FOLDER_HINT_TEXT);
  });

  it("still renders core booking details alongside the spam hint", () => {
    const { html } = buildBookingConfirmationEmail(baseInput);
    expect(html).toContain("Monday, May 4, 2026");
    expect(html).toContain("Standard Clean");
    expect(html).toContain("123 Main St");
  });
});
