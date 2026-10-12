import { describe, expect, it } from "vitest";
import { accessFromSubscriber, isWeeklyProduct } from "./paidAccess";
import { FREE_TRIAL_DAYS, getQuoteCap } from "./plans";

const now = Date.parse("2026-10-11T12:00:00Z");
const expiry = new Date(now + 3600000).toISOString();
function subscriber(tier = "basic", product = "quotepro_basic_weekly", transaction = {}) {
  return {
    entitlements: { [tier]: { product_identifier: product, expires_date: expiry } },
    subscriptions: { [product]: { expires_date: expiry, period_type: "normal", store: "app_store", is_sandbox: false, ...transaction } },
  };
}
describe("paid-only weekly subscriptions", () => {
  it("grants Basic for paid Basic", () => expect(accessFromSubscriber(subscriber(), now).tier).toBe("starter"));
  it("grants AI for paid AI", () => expect(accessFromSubscriber(subscriber("ai", "quotepro_ai_weekly"), now).tier).toBe("growth"));
  it("does not grant AI to a misconfigured Basic product", () => expect(accessFromSubscriber(subscriber("ai"), now).tier).toBe("starter"));
  it.each([
    { period_type: "trial" }, { period_type: "TRIAL" }, { refunded_at: expiry },
    { expires_date: new Date(now - 1).toISOString() }, { store: "promotional" }, { is_sandbox: true },
  ])("rejects unpaid or invalid transaction %j", transaction => {
    expect(accessFromSubscriber(subscriber("basic", undefined, transaction), now).tier).toBe("free");
  });
  it("allows sandbox only with explicit test-mode evaluation", () => {
    expect(accessFromSubscriber(subscriber("basic", undefined, { is_sandbox: true }), now, true).tier).toBe("starter");
  });
  it("retains paid time after cancellation", () => {
    expect(accessFromSubscriber(subscriber("basic", undefined, { unsubscribe_detected_at: new Date(now).toISOString() }), now).tier).toBe("starter");
  });
  it("does not grant access without a transaction", () => {
    const data = subscriber(); data.subscriptions = {};
    expect(accessFromSubscriber(data, now).tier).toBe("free");
  });
  it("honors an existing paid legacy Pro entitlement", () => {
    expect(accessFromSubscriber(subscriber("pro", "legacy_pro"), now).tier).toBe("pro");
  });
  it("rejects lifetime entitlement grants", () => {
    const data = subscriber(); data.entitlements.basic.expires_date = "";
    expect(accessFromSubscriber(data, now).tier).toBe("free");
  });
  it("only sells the approved weekly products without introductory offers", () => {
    expect(isWeeklyProduct({ identifier: "quotepro_basic_weekly", subscriptionPeriod: "P1W" })).toBe(true);
    expect(isWeeklyProduct({ identifier: "quotepro_ai_weekly", subscriptionPeriod: "P1W" })).toBe(true);
    expect(isWeeklyProduct({ identifier: "legacy_pro", subscriptionPeriod: "P1W" })).toBe(false);
    expect(isWeeklyProduct({ identifier: "quotepro_basic_weekly", subscriptionPeriod: "P1M" })).toBe(false);
    expect(isWeeklyProduct({ identifier: "quotepro_basic_weekly", subscriptionPeriod: "P1W", introPrice: { price: 0 } })).toBe(false);
  });
  it("never gives free quotes, even with a legacy trial flag", () => {
    expect(FREE_TRIAL_DAYS).toBe(0);
    expect(getQuoteCap("free", true)).toBe(0);
    expect(getQuoteCap("free", false)).toBe(0);
    expect(getQuoteCap("starter", false)).toBe(Infinity);
    expect(getQuoteCap("growth", false)).toBe(Infinity);
  });
});
