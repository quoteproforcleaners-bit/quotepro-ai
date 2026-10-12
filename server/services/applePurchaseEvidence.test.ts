import { afterEach, describe, expect, it, vi } from "vitest";
import { Environment } from "@apple/app-store-server-library";
import { APPLE_BUNDLE, correlateAppleEvidence, decodeAppleProof } from "./applePurchaseEvidence";

const now = Date.now();
const proof = { bundleId: APPLE_BUNDLE, productId: "quotepro_basic_weekly", transactionId: "renewal",
  originalTransactionId: "original", environment: Environment.PRODUCTION, expiresDate: now + 60000,
  originalPurchaseDate: now - 1000, inAppOwnershipType: "PURCHASED" };
const subscriber = () => ({
  entitlements: { basic: { product_identifier: proof.productId, expires_date: new Date(now + 60000).toISOString() } },
  subscriptions: { [proof.productId]: { store: "app_store", store_transaction_id: "renewal",
    is_sandbox: false, period_type: "normal", expires_date: new Date(now + 60000).toISOString() } },
});
afterEach(() => vi.unstubAllEnvs());
describe("Apple-signed data ownership and paid access", () => {
  it("correlates verified original transaction, store, environment and paid period", () => {
    expect(correlateAppleEvidence([proof], subscriber(), now).access.tier).toBe("starter");
  });
  it.each([
    { bundleId: "another.app" }, { transactionId: "another", originalTransactionId: "unrelated" },
    { expiresDate: now - 1 }, { revocationDate: now - 1 }, { offerDiscountType: "FREE_TRIAL" },
    { inAppOwnershipType: "FAMILY_SHARED" }, { environment: Environment.SANDBOX },
  ])("rejects invalid or unrelated evidence %j", change => {
    expect(() => correlateAppleEvidence([{ ...proof, ...change }], subscriber(), now)).toThrow();
  });
  it("rejects provider-side refunds and trials", () => {
    for (const change of [{ refunded_at: new Date().toISOString() }, { period_type: "trial" }]) {
      const data = subscriber();
      Object.assign(data.subscriptions[proof.productId], change);
      expect(() => correlateAppleEvidence([proof], data, now)).toThrow();
    }
  });
  it("never accepts sandbox evidence on a public production configuration", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("APPLE_PURCHASE_ENVIRONMENT", "");
    const data = subscriber(); data.subscriptions[proof.productId].is_sandbox = true;
    expect(() => correlateAppleEvidence([{ ...proof, environment: Environment.SANDBOX }], data, now)).toThrow();
  });
  it("rejects an unsigned or invented Apple transaction rather than decoding it as trusted", async () => {
    await expect(decodeAppleProof("eyJhbGciOiJub25lIn0.eyJidW5kbGVJZCI6ImFwcC5yZXBsaXQucXVvdGVwcm8ifQ.")).rejects.toThrow();
  });
  it("does not grant an unproven AI entitlement attached to the same provider customer", () => {
    const data: any = subscriber();
    data.entitlements.ai = { product_identifier: "quotepro_ai_weekly", expires_date: new Date(now + 60000).toISOString() };
    data.subscriptions.quotepro_ai_weekly = { ...data.subscriptions[proof.productId], store_transaction_id: "someone-else" };
    expect(correlateAppleEvidence([proof], data, now).access.tier).toBe("starter");
  });
});
