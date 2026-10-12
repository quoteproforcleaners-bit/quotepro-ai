import { Router } from "express";
import { randomUUID } from "node:crypto";
import { pool } from "../db";
import { authLimiter } from "../middleware";
import { getUserById, getBusinessByOwner } from "../storage";
import { formatUser } from "../helpers";
import { correlateAppleEvidence, decodeAppleProof, fetchPurchaseSubscriber } from "../services/applePurchaseEvidence";
import { WEEKLY_PRODUCTS } from "../../shared/paidAccess";

const router = Router();
router.use(["/auth/purchase-session", "/auth/apple-purchase"], (req, res, next) => {
  // These are native-only JSON endpoints. Prevent a browser from using an
  // existing customer's cookie to bind the attacker's purchase to their records.
  if (req.headers.origin || !req.is("application/json")) {
    return res.status(403).json({ message: "Use the iPhone app to purchase or restore." });
  }
  next();
});
// Explicit migration, not an on-request schema change. Prevent charging against
// an old backend that cannot durably record purchase ownership.
async function ready() {
  await pool.query("SELECT original_transaction_id FROM apple_purchase_owners LIMIT 0");
}
router.post("/auth/purchase-session", authLimiter, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    await ready();
    if (!req.session.purchaseIdentity) {
      const existing = req.session.userId ? await getUserById(req.session.userId) : null;
      req.session.purchaseIdentity = existing?.revenuecatUserId || existing?.id || `qp_purchase_${randomUUID()}`;
    }
    // Verify server credentials BEFORE enabling the purchase button.
    await fetchPurchaseSubscriber(req.session.purchaseIdentity);
    await new Promise<void>((resolve, reject) => req.session.save(e => e ? reject(e) : resolve()));
    return res.json({ purchaseIdentity: req.session.purchaseIdentity, protocol: 1 });
  } catch {
    return res.status(503).json({ message: "Purchases are not ready on this server. No payment has been taken. Please retry later." });
  }
});

router.post("/auth/apple-purchase", authLimiter, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const identity = req.session.purchaseIdentity;
  if (!identity) return res.status(401).json({ message: "Reopen the purchase screen and try again." });
  const proofs = req.body?.signedTransactions;
  if (!Array.isArray(proofs) || !proofs.length || proofs.length > 20 ||
      proofs.some(p => typeof p !== "string" || p.length > 20000)) {
    return res.status(400).json({ message: "Apple purchase evidence is required." });
  }
  let client;
  try {
    // Ignore every client-supplied user ID, email, tier, and original-transaction ID.
    const decoded = await Promise.all(proofs.map(p => decodeAppleProof(p).catch(() => null)));
    const { access, anchors } = correlateAppleEvidence(decoded.filter(t => t !== null), await fetchPurchaseSubscriber(identity));
    client = await pool.connect();
    await client.query("BEGIN");
    // Serialize restorations/upgrades touching the same original transactions.
    const keys = [...new Set(anchors.map(a => `${a.environment}:${a.originalId}`))].sort();
    for (const key of keys) await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
    const known = await client.query(
      "SELECT DISTINCT user_id FROM apple_purchase_owners WHERE environment || ':' || original_transaction_id = ANY($1::text[])", [keys]);
    if (known.rows.length > 1) throw new Error("These purchases are associated with multiple businesses. Contact support for recovery.");
    const boundOwner = known.rows[0]?.user_id;
    // A logged-in legacy user can establish the original ledger binding once.
    // NEVER infer a legacy owner from RC aliases or an appAccountToken.
    if (boundOwner && req.session.userId && boundOwner !== req.session.userId) {
      throw new Error("This Apple purchase belongs to another business. Sign out before restoring it.");
    }
    let owner = boundOwner || req.session.userId;
    if (!owner) {
      // Historical weekly buyers must explicitly recover their original account.
      // The ledger's activation time prevents silently orphaning pre-migration data.
      const activation = await client.query("SELECT activated_at FROM apple_purchase_recovery_config WHERE id = 1");
      const cutoff = activation.rows[0]?.activated_at?.getTime();
      if (!cutoff || anchors.some(a => a.purchasedAt < cutoff) ||
          anchors.some(a => !Object.hasOwn(WEEKLY_PRODUCTS, a.productId))) {
        throw new Error("Recover your existing QuotePro account once to reconnect these earlier purchases and saved records.");
      }
      owner = randomUUID();
      await client.query(
        "INSERT INTO users (id,email,auth_provider,subscription_tier) VALUES ($1,$2,'apple_purchase','free')",
        [owner, `${owner}@purchase.invalid`]);
      await client.query("INSERT INTO businesses (owner_user_id) VALUES ($1)", [owner]);
    }
    const account = await client.query("SELECT auth_provider FROM users WHERE id = $1 FOR UPDATE", [owner]);
    if (!account.rows.length || account.rows[0].auth_provider === "deleted") throw new Error("This account is no longer available.");
    for (const anchor of anchors) {
      await client.query(
        "INSERT INTO apple_purchase_owners (environment,original_transaction_id,user_id) VALUES ($1,$2,$3) ON CONFLICT (environment,original_transaction_id) DO NOTHING",
        [anchor.environment, anchor.originalId, owner]);
    }
    await client.query(
      "UPDATE users SET revenuecat_user_id=$2, subscription_tier=$3, subscription_expires_at=$4, subscription_platform='revenuecat', subscription_synced_at=now(), updated_at=now() WHERE id=$1",
      [owner, identity, access.tier, access.expiresAt]);
    await client.query("COMMIT");
    await new Promise<void>((resolve, reject) => req.session.regenerate(e => e ? reject(e) : resolve()));
    req.session.userId = owner;
    req.session.purchaseIdentity = identity;
    await new Promise<void>((resolve, reject) => req.session.save(e => e ? reject(e) : resolve()));
    const [user, business] = await Promise.all([getUserById(owner), getBusinessByOwner(owner)]);
    return res.json({ user: formatUser(user), needsOnboarding: !business?.onboardingComplete, access });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    // No signed evidence, receipt, or customer records in logs.
    const message = error instanceof Error ? error.message : "Purchase recovery could not be completed";
    return res.status(403).json({ message: message.startsWith("Recover your existing") || message.startsWith("These purchases") ||
      message.startsWith("This Apple purchase") ? message : "Purchase verification is pending or unavailable. Retry Restore Purchases; do not buy again." });
  } finally { client?.release(); }
});
export default router;
