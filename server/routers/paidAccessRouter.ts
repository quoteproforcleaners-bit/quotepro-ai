import { Router, type Request, type Response, type NextFunction } from "express";
import { verifyPaidAccess } from "../services/paidAccess";
import type { PaidAccess } from "../../shared/paidAccess";

const router = Router();
async function status(req: Request, res: Response) {
  if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
  try {
    const access = await verifyPaidAccess(req.session.userId);
    res.setHeader("Cache-Control", "no-store");
    return res.json({
      ...access, status: access.tier === "free" ? "cancelled" : "active",
      subscriptionInterval: access.platform === "stripe" ? "monthly" : "weekly",
      currentPeriodEnd: access.expiresAt, isOnTrial: false, trialDaysRemaining: null,
      canManageOnWeb: access.platform === "stripe", canManageOnIOS: access.platform !== "stripe",
    });
  } catch {
    return res.status(503).json({ code: "SUBSCRIPTION_UNAVAILABLE", message: "Unable to verify subscription. Please retry." });
  }
}
router.get("/subscription/status", status);
router.post("/subscription/sync", status);
router.get("/subscription/config", (_req, res) => res.status(410).json({ message: "Use the native store configuration." }));
router.post(["/subscription/create-checkout", "/subscription/upgrade"], (_req, res) =>
  res.status(410).json({ message: "New subscriptions are available in the iPhone app." }));

export function requirePaidAccess(ai = false) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) { res.status(401).json({ message: "Not authenticated" }); return; }
    try {
      const access: PaidAccess = res.locals.paidAccess ?? await verifyPaidAccess(req.session.userId);
      res.locals.paidAccess = access;
      if (access.tier === "free" || (ai && access.tier === "starter")) {
        res.status(403).json({
          code: ai ? "AI_SUBSCRIPTION_REQUIRED" : "SUBSCRIPTION_REQUIRED",
          requiredEntitlement: ai ? "ai" : "basic", requiresUpgrade: true,
          message: ai ? "An AI subscription is required." : "A paid subscription is required to quote.",
        });
        return;
      }
      next();
    } catch {
      res.status(503).json({ code: "SUBSCRIPTION_UNAVAILABLE", message: "Unable to verify subscription. Please retry." });
    }
  };
}
export default router;
