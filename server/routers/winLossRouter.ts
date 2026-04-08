// server/routers/winLossRouter.ts
// Win/Loss feedback system: automated follow-ups + public response page + dashboard

import { Router, type Request, type Response } from "express";
import { pool, db } from "../db";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middleware";
import { winLossResponses, quotes, customers, businesses } from "../../shared/schema";

const router = Router();

// ─── Public: Get feedback page data ─────────────────────────────────────────
router.get("/feedback/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const rows = await db
      .select({
        id: winLossResponses.id,
        reasonCategory: winLossResponses.reasonCategory,
        respondedAt: winLossResponses.respondedAt,
        quoteId: winLossResponses.quoteId,
        businessId: winLossResponses.businessId,
        customerEmail: winLossResponses.customerEmail,
      })
      .from(winLossResponses)
      .where(eq(winLossResponses.responseToken, token))
      .limit(1);

    if (!rows.length) {
      return res.status(404).json({ message: "Not found" });
    }

    const wlr = rows[0];

    // Get business name
    const bizRows = await db
      .select({ name: businesses.name })
      .from(businesses)
      .where(eq(businesses.id, wlr.businessId))
      .limit(1);

    // Get quote total
    const quoteRows = await db
      .select({ total: quotes.total, selectedOption: quotes.selectedOption })
      .from(quotes)
      .where(eq(quotes.id, wlr.quoteId))
      .limit(1);

    return res.json({
      alreadyResponded: !!wlr.respondedAt,
      businessName: bizRows[0]?.name || "Your cleaning company",
      quoteTotal: quoteRows[0]?.total || null,
    });
  } catch (err: any) {
    console.error("[win-loss] GET /feedback/:token error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

// ─── Public: Submit feedback ─────────────────────────────────────────────────
router.post("/feedback/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { reason_category, competitor_mentioned, reason } = req.body as {
      reason_category: string;
      competitor_mentioned?: string;
      reason?: string;
    };

    const rows = await db
      .select({ id: winLossResponses.id, respondedAt: winLossResponses.respondedAt })
      .from(winLossResponses)
      .where(eq(winLossResponses.responseToken, token))
      .limit(1);

    if (!rows.length) {
      return res.status(404).json({ message: "Not found" });
    }

    if (rows[0].respondedAt) {
      return res.json({ ok: true, message: "Already recorded" });
    }

    await db
      .update(winLossResponses)
      .set({
        reasonCategory: reason_category || "other",
        competitorMentioned: competitor_mentioned || null,
        reason: reason || null,
        respondedAt: new Date(),
      })
      .where(eq(winLossResponses.id, rows[0].id));

    return res.json({ ok: true });
  } catch (err: any) {
    console.error("[win-loss] POST /feedback/:token error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

// ─── Authenticated: Win/Loss dashboard data ──────────────────────────────────
router.get("/api/win-loss", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const bizResult = await pool.query<{ id: string }>(
      `SELECT b.id FROM businesses b JOIN users u ON u.id = b.user_id WHERE u.id = $1 LIMIT 1`,
      [userId],
    );
    if (!bizResult.rows.length) {
      return res.status(404).json({ message: "Business not found" });
    }
    const businessId = bizResult.rows[0].id;

    const rows = await db
      .select({
        id: winLossResponses.id,
        quoteId: winLossResponses.quoteId,
        customerEmail: winLossResponses.customerEmail,
        reasonCategory: winLossResponses.reasonCategory,
        competitorMentioned: winLossResponses.competitorMentioned,
        reason: winLossResponses.reason,
        respondedAt: winLossResponses.respondedAt,
        followUpSentAt: winLossResponses.followUpSentAt,
        createdAt: winLossResponses.createdAt,
        quoteTotal: quotes.total,
      })
      .from(winLossResponses)
      .leftJoin(quotes, eq(quotes.id, winLossResponses.quoteId))
      .where(eq(winLossResponses.businessId, businessId))
      .orderBy(desc(winLossResponses.createdAt))
      .limit(200);

    // Compute stats
    const totalSent = rows.length;
    const responded = rows.filter((r) => r.respondedAt);
    const responseRate = totalSent > 0 ? Math.round((responded.length / totalSent) * 100) : 0;

    const categoryCounts: Record<string, number> = {};
    for (const r of responded) {
      const cat = r.reasonCategory || "no_response_yet";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    const mostCommonReason =
      Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const competitorCounts: Record<string, number> = {};
    for (const r of responded) {
      if (r.competitorMentioned) {
        const name = r.competitorMentioned.trim().toLowerCase();
        competitorCounts[name] = (competitorCounts[name] || 0) + 1;
      }
    }

    const competitors = Object.entries(competitorCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    return res.json({
      totalSent,
      responded: responded.length,
      responseRate,
      mostCommonReason,
      categoryCounts,
      competitors,
      rows: rows.map((r) => ({
        id: r.id,
        quoteId: r.quoteId,
        customerEmail: r.customerEmail,
        reasonCategory: r.reasonCategory,
        competitorMentioned: r.competitorMentioned,
        reason: r.reason,
        respondedAt: r.respondedAt,
        quoteTotal: r.quoteTotal,
        createdAt: r.createdAt,
      })),
    });
  } catch (err: any) {
    console.error("[win-loss] GET /api/win-loss error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
