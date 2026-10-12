import { Environment, SignedDataVerifier, type JWSTransactionDecodedPayload } from "@apple/app-store-server-library";
import { accessFromSubscriber, WEEKLY_PRODUCTS } from "../../shared/paidAccess";

// Public trust anchor, downloaded from Apple's certificate authority:
// https://www.apple.com/certificateauthority/AppleRootCA-G3.cer
const ROOT = Buffer.from("MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==", "base64");
export const APPLE_BUNDLE = "app.replit.quotepro";
const legacyProducts = new Set(["com.quotepro.pro.annual", "com.quotepro.pro.monthly",
  "com.quotepro.growth.annual", "com.quotepro.growth.monthly", "quotepro_ai_monthly"]);
export function sandboxPurchasesAllowed() {
  // Production must explicitly opt into sandbox testing. Public release must not.
  return process.env.NODE_ENV !== "production" || process.env.APPLE_PURCHASE_ENVIRONMENT === "Sandbox";
}
function allowedEnvironments() {
  if (process.env.APPLE_PURCHASE_ENVIRONMENT === "Sandbox") return [Environment.SANDBOX];
  return process.env.NODE_ENV === "production" ? [Environment.PRODUCTION] : [Environment.PRODUCTION, Environment.SANDBOX];
}
export async function decodeAppleProof(proof: string): Promise<JWSTransactionDecodedPayload> {
  for (const environment of allowedEnvironments()) {
    try {
      return await new SignedDataVerifier([ROOT], true, environment, APPLE_BUNDLE, 6758575812)
        .verifyAndDecodeTransaction(proof);
    } catch { /* Try the explicitly allowed Apple environment, never trust unsigned payloads. */ }
  }
  throw new Error("Apple purchase evidence could not be verified");
}
export async function fetchPurchaseSubscriber(identity: string) {
  const key = process.env.REVENUECAT_SECRET_KEY;
  if (!key) throw new Error("Purchase verification is not configured");
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(identity)}`, {
    headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Purchase verification is unavailable");
  return (await response.json() as any).subscriber;
}

/** A RevenueCat ID alone is NEVER evidence of business-data ownership. */
export function correlateAppleEvidence(transactions: JWSTransactionDecodedPayload[], subscriber: any, now = Date.now()) {
  const valid = transactions.filter(t =>
    t.bundleId === APPLE_BUNDLE && t.originalTransactionId && t.transactionId && t.productId &&
    (Object.hasOwn(WEEKLY_PRODUCTS, t.productId) || legacyProducts.has(t.productId)) &&
    allowedEnvironments().includes(t.environment as Environment) &&
    !t.revocationDate && t.inAppOwnershipType !== "FAMILY_SHARED");
  const subscriptions: Record<string, any> = {};
  for (const t of valid) {
    const sub = subscriber?.subscriptions?.[t.productId!];
    if (!sub || sub.store !== "app_store" ||
        !!sub.is_sandbox !== (t.environment === Environment.SANDBOX) ||
        ![t.transactionId, t.originalTransactionId].includes(sub.store_transaction_id) ||
        !t.expiresDate || t.expiresDate <= now || t.offerDiscountType === "FREE_TRIAL") continue;
    subscriptions[t.productId!] = { ...sub, expires_date: new Date(Math.min(t.expiresDate, Date.parse(sub.expires_date))).toISOString() };
  }
  const access = accessFromSubscriber({ entitlements: subscriber?.entitlements, subscriptions }, now, sandboxPurchasesAllowed());
  if (access.tier === "free") throw new Error("No verified active paid Apple subscription was found");
  const environment = Object.values(subscriptions)[0]?.is_sandbox ? "Sandbox" : "Production";
  return {
    access,
    anchors: valid.filter(t => t.environment === environment).map(t => ({
      originalId: t.originalTransactionId!, environment: t.environment!,
      productId: t.productId!, purchasedAt: t.originalPurchaseDate ?? t.purchaseDate ?? now,
    })),
  };
}
