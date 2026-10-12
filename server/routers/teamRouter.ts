/**
 * server/routers/teamRouter.ts
 *
 * Team management + invitations API. Mounted at /api.
 *
 * All routes require authentication. Permission checks use the shared
 * `can()` / `canAssignRole()` / `canModifyMember()` utilities from
 * server/lib/permissions.ts so the role matrix has a single source of
 * truth.
 *
 * Routes:
 *   GET    /api/team/me                       — caller's role + permissions
 *   GET    /api/team/members                  — list members of caller's biz
 *   PATCH  /api/team/members/:userId          — change role / disable / enable
 *   DELETE /api/team/members/:userId          — disable a member
 *   GET    /api/team/invitations              — list pending invites
 *   POST   /api/team/invitations              — create + send invite
 *   POST   /api/team/invitations/:id/resend   — resend invite email
 *   DELETE /api/team/invitations/:id          — revoke pending invite
 *
 *   GET    /api/invitations/preview           — public: ?token=… returns biz/role
 *   POST   /api/invitations/accept            — auth required: accept by token
 */

import { Router, type Request, type Response } from "express";
import { and, desc, eq, gt, gte, isNull, sql } from "drizzle-orm";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { db, pool } from "../db";
import { businesses, businessMembers, userInvitations, users } from "@shared/schema";
import { requireAuth } from "../middleware";
import {
  can,
  canAssignRole,
  canModifyMember,
  isRole,
  ROLES,
  type Action,
  type Role,
} from "../lib/permissions";
import { getMembership, syncOwnerMembership } from "../lib/membership";
import { sendTeamInviteEmail } from "../services/teamInviteEmail";

const router = Router();

const INVITE_TTL_DAYS = 7;
const MAX_INVITES_PER_BIZ_PER_DAY = 20;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Resolve the caller's active membership (and the business it belongs to). */
async function resolveCallerMembership(req: Request): Promise<
  | { ok: true; userId: string; businessId: string; role: Role }
  | { ok: false; status: number; message: string }
> {
  const userId = req.session.userId;
  if (!userId) return { ok: false, status: 401, message: "Authentication required" };

  // Prefer business owned by user (legacy single-tenant flow), then fall
  // back to any active membership (future multi-membership users).
  const ownedRows = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId))
    .limit(1);

  let businessId = ownedRows[0]?.id ?? null;

  if (!businessId) {
    const memberRows = await db
      .select({ businessId: businessMembers.businessId })
      .from(businessMembers)
      .where(and(eq(businessMembers.userId, userId), eq(businessMembers.status, "active")))
      .limit(1);
    businessId = memberRows[0]?.businessId ?? null;
  }

  if (!businessId) return { ok: false, status: 404, message: "No business found for user" };

  const m = await getMembership(userId, businessId);
  if (!m) {
    // The user owns the business via legacy column but has no member row
    // yet — sync ownership lazily so /api/team/me works for accounts that
    // pre-date the RBAC backfill.
    await syncOwnerMembership(businessId, userId);
    return { ok: true, userId, businessId, role: "owner" };
  }
  return { ok: true, userId, businessId, role: m.role };
}

function requirePermission(action: Action) {
  return async (req: Request, res: Response, next: any) => {
    const ctx = await resolveCallerMembership(req);
    if (!ctx.ok) return res.status(ctx.status).json({ message: ctx.message });
    if (!can(ctx.role, action)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    (req as any).teamCtx = ctx;
    next();
  };
}

// ─── Rate limit: invite-send ─────────────────────────────────────────────────
// Per-business cap is enforced at the DB level (see createInvite). The
// express-rate-limit here is a per-IP burst guard.

const inviteIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many invitations sent. Try again later." },
});

// ─── GET /api/team/me ─────────────────────────────────────────────────────────

router.get("/team/me", requireAuth, async (req: Request, res: Response) => {
  const ctx = await resolveCallerMembership(req);
  if (!ctx.ok) return res.status(ctx.status).json({ message: ctx.message });
  return res.json({
    userId: ctx.userId,
    businessId: ctx.businessId,
    role: ctx.role,
  });
});

// ─── GET /api/team/members ────────────────────────────────────────────────────

router.get("/team/members", requireAuth, async (req: Request, res: Response) => {
  try {
    const ctx = await resolveCallerMembership(req);
    if (!ctx.ok) return res.status(ctx.status).json({ message: ctx.message });

    const rows = await db
      .select({
        userId: businessMembers.userId,
        role: businessMembers.role,
        status: businessMembers.status,
        invitedAt: businessMembers.invitedAt,
        acceptedAt: businessMembers.acceptedAt,
        lastActiveAt: businessMembers.lastActiveAt,
        email: users.email,
        name: users.name,
      })
      .from(businessMembers)
      .innerJoin(users, eq(users.id, businessMembers.userId))
      .where(eq(businessMembers.businessId, ctx.businessId))
      .orderBy(desc(businessMembers.role), desc(businessMembers.acceptedAt));

    return res.json({ members: rows, callerRole: ctx.role });
  } catch (e: any) {
    console.error("[team] list members error:", e?.message || e);
    return res.status(500).json({ message: "Failed to list team members" });
  }
});

// ─── PATCH /api/team/members/:userId — change role / status ───────────────────

router.patch("/team/members/:userId", requireAuth, async (req: Request, res: Response) => {
  try {
    const ctx = await resolveCallerMembership(req);
    if (!ctx.ok) return res.status(ctx.status).json({ message: ctx.message });

    const targetUserId = req.params.userId;
    if (targetUserId === ctx.userId) {
      return res.status(400).json({ message: "You cannot modify your own membership" });
    }

    const target = await getMembership(targetUserId, ctx.businessId);
    if (!target) return res.status(404).json({ message: "Member not found" });

    if (!canModifyMember(ctx.role, target.role)) {
      return res.status(403).json({ message: "You cannot modify this member" });
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    const { role: newRole, status: newStatus } = req.body || {};

    if (newRole !== undefined) {
      if (!isRole(newRole)) return res.status(400).json({ message: "Invalid role" });
      if (newRole === "owner") {
        return res.status(400).json({ message: "Use ownership transfer to assign Owner" });
      }
      if (!canAssignRole(ctx.role, newRole)) {
        return res.status(403).json({ message: "You cannot assign that role" });
      }
      patch.role = newRole;
    }

    if (newStatus !== undefined) {
      if (newStatus !== "active" && newStatus !== "disabled") {
        return res.status(400).json({ message: "Invalid status" });
      }
      patch.status = newStatus;
    }

    if (Object.keys(patch).length === 1) {
      return res.status(400).json({ message: "No changes provided" });
    }

    await db
      .update(businessMembers)
      .set(patch)
      .where(
        and(
          eq(businessMembers.businessId, ctx.businessId),
          eq(businessMembers.userId, targetUserId),
        ),
      );

    return res.json({ ok: true });
  } catch (e: any) {
    console.error("[team] patch member error:", e?.message || e);
    return res.status(500).json({ message: "Failed to update member" });
  }
});

// ─── DELETE /api/team/members/:userId — disable (preserves history) ───────────

router.delete("/team/members/:userId", requireAuth, async (req: Request, res: Response) => {
  try {
    const ctx = await resolveCallerMembership(req);
    if (!ctx.ok) return res.status(ctx.status).json({ message: ctx.message });

    const targetUserId = req.params.userId;
    if (targetUserId === ctx.userId) {
      return res.status(400).json({ message: "You cannot remove yourself" });
    }
    const target = await getMembership(targetUserId, ctx.businessId);
    if (!target) return res.status(404).json({ message: "Member not found" });
    if (!canModifyMember(ctx.role, target.role)) {
      return res.status(403).json({ message: "You cannot remove this member" });
    }

    await db
      .update(businessMembers)
      .set({ status: "disabled", updatedAt: new Date() })
      .where(
        and(
          eq(businessMembers.businessId, ctx.businessId),
          eq(businessMembers.userId, targetUserId),
        ),
      );

    return res.json({ ok: true });
  } catch (e: any) {
    console.error("[team] delete member error:", e?.message || e);
    return res.status(500).json({ message: "Failed to remove member" });
  }
});

// ─── GET /api/team/invitations — list pending ─────────────────────────────────

router.get("/team/invitations", requireAuth, async (req: Request, res: Response) => {
  try {
    const ctx = await resolveCallerMembership(req);
    if (!ctx.ok) return res.status(ctx.status).json({ message: ctx.message });

    const rows = await db
      .select({
        id: userInvitations.id,
        email: userInvitations.email,
        role: userInvitations.role,
        invitedByUserId: userInvitations.invitedByUserId,
        expiresAt: userInvitations.expiresAt,
        createdAt: userInvitations.createdAt,
      })
      .from(userInvitations)
      .where(
        and(
          eq(userInvitations.businessId, ctx.businessId),
          isNull(userInvitations.acceptedAt),
          isNull(userInvitations.revokedAt),
          gt(userInvitations.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(userInvitations.createdAt));

    return res.json({ invitations: rows });
  } catch (e: any) {
    console.error("[team] list invitations error:", e?.message || e);
    return res.status(500).json({ message: "Failed to list invitations" });
  }
});

// ─── POST /api/team/invitations — create + send ───────────────────────────────

router.post(
  "/team/invitations",
  requireAuth,
  inviteIpLimiter,
  requirePermission("users:invite"),
  async (req: Request, res: Response) => {
    try {
      const ctx = (req as any).teamCtx as { userId: string; businessId: string; role: Role };
      const emailRaw = String(req.body?.email || "").trim().toLowerCase();
      const role = req.body?.role;

      if (!emailRaw || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailRaw)) {
        return res.status(400).json({ message: "Valid email required" });
      }
      if (!isRole(role)) return res.status(400).json({ message: "Invalid role" });
      if (!canAssignRole(ctx.role, role)) {
        return res.status(403).json({ message: "You cannot invite that role" });
      }

      // Per-business daily cap. Excludes revoked invites so a user who
      // mis-typed an email and revoked it isn't locked out for 24h.
      const sinceDate = new Date(Date.now() - 24 * 3600 * 1000);
      const countRows = (await db
        .select({ c: sql<number>`COUNT(*)::int` })
        .from(userInvitations)
        .where(
          and(
            eq(userInvitations.businessId, ctx.businessId),
            gte(userInvitations.createdAt, sinceDate),
            isNull(userInvitations.revokedAt),
          ),
        )) as Array<{ c: number }>;
      if ((countRows[0]?.c ?? 0) >= MAX_INVITES_PER_BIZ_PER_DAY) {
        return res.status(429).json({
          message: `Daily invite limit reached (${MAX_INVITES_PER_BIZ_PER_DAY}/day). Try again tomorrow.`,
        });
      }

      // If the email already belongs to a current active member of this
      // business, short-circuit.
      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, emailRaw))
        .limit(1);
      if (existingUser[0]) {
        const existingMembership = await getMembership(existingUser[0].id, ctx.businessId);
        if (existingMembership) {
          return res.status(409).json({ message: "This person is already a team member" });
        }
      }

      // Generate token, hash for storage. Raw token only ever leaves in
      // the email link.
      const rawToken = generateToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86400 * 1000);

      const [invite] = await db
        .insert(userInvitations)
        .values({
          businessId: ctx.businessId,
          email: emailRaw,
          role,
          tokenHash,
          invitedByUserId: ctx.userId,
          expiresAt,
        })
        .returning();

      // Look up business + inviter for the email payload.
      const [biz] = await db.select().from(businesses).where(eq(businesses.id, ctx.businessId)).limit(1);
      const [inviter] = await db.select().from(users).where(eq(users.id, ctx.userId)).limit(1);

      try {
        await sendTeamInviteEmail({
          toEmail: emailRaw,
          rawToken,
          role: role as Role,
          businessName: biz?.companyName || "QuotePro",
          inviterName: inviter?.name || null,
          inviterEmail: inviter?.email || null,
          expiresAt,
        });
      } catch (mailErr: any) {
        console.error("[team] invite email failed:", mailErr?.message || mailErr);
        // Roll back so the invite can be retried cleanly.
        await db.delete(userInvitations).where(eq(userInvitations.id, invite.id));
        return res.status(502).json({ message: "Failed to send invitation email" });
      }

      return res.json({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
      });
    } catch (e: any) {
      console.error("[team] create invitation error:", e?.message || e);
      return res.status(500).json({ message: "Failed to create invitation" });
    }
  },
);

// ─── POST /api/team/invitations/:id/resend ────────────────────────────────────

router.post(
  "/team/invitations/:id/resend",
  requireAuth,
  inviteIpLimiter,
  requirePermission("users:invite"),
  async (req: Request, res: Response) => {
    try {
      const ctx = (req as any).teamCtx as { userId: string; businessId: string; role: Role };
      const id = req.params.id;

      // Resending requires generating a brand-new token (the original
      // raw token isn't stored — only its hash). We rotate the hash and
      // extend the expiry.
      const [existing] = await db
        .select()
        .from(userInvitations)
        .where(and(eq(userInvitations.id, id), eq(userInvitations.businessId, ctx.businessId)))
        .limit(1);

      if (!existing) return res.status(404).json({ message: "Invitation not found" });
      if (existing.acceptedAt) return res.status(400).json({ message: "Already accepted" });
      if (existing.revokedAt) return res.status(400).json({ message: "Invitation was revoked" });
      if (!canAssignRole(ctx.role, existing.role as Role)) {
        return res.status(403).json({ message: "You cannot manage that role" });
      }

      const rawToken = generateToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86400 * 1000);

      await db
        .update(userInvitations)
        .set({ tokenHash, expiresAt })
        .where(eq(userInvitations.id, id));

      const [biz] = await db.select().from(businesses).where(eq(businesses.id, ctx.businessId)).limit(1);
      const [inviter] = await db.select().from(users).where(eq(users.id, ctx.userId)).limit(1);

      await sendTeamInviteEmail({
        toEmail: existing.email,
        rawToken,
        role: existing.role as Role,
        businessName: biz?.companyName || "QuotePro",
        inviterName: inviter?.name || null,
        inviterEmail: inviter?.email || null,
        expiresAt,
      });

      return res.json({ ok: true, expiresAt });
    } catch (e: any) {
      console.error("[team] resend invitation error:", e?.message || e);
      return res.status(500).json({ message: "Failed to resend invitation" });
    }
  },
);

// ─── DELETE /api/team/invitations/:id — revoke ────────────────────────────────

router.delete(
  "/team/invitations/:id",
  requireAuth,
  requirePermission("users:invite"),
  async (req: Request, res: Response) => {
    try {
      const ctx = (req as any).teamCtx as { userId: string; businessId: string };
      await db
        .update(userInvitations)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(userInvitations.id, req.params.id),
            eq(userInvitations.businessId, ctx.businessId),
            isNull(userInvitations.acceptedAt),
          ),
        );
      return res.json({ ok: true });
    } catch (e: any) {
      console.error("[team] revoke invitation error:", e?.message || e);
      return res.status(500).json({ message: "Failed to revoke invitation" });
    }
  },
);

// ─── PUBLIC: GET /api/invitations/preview?token=… ─────────────────────────────
// Shown to a not-yet-authenticated invitee so they know what they're
// joining before they sign up or sign in.

router.get("/invitations/preview", async (req: Request, res: Response) => {
  try {
    const raw = String(req.query.token || "");
    if (!raw) return res.status(400).json({ message: "Token required" });
    const tokenHash = hashToken(raw);

    const [invite] = await db
      .select({
        email: userInvitations.email,
        role: userInvitations.role,
        businessId: userInvitations.businessId,
        expiresAt: userInvitations.expiresAt,
        acceptedAt: userInvitations.acceptedAt,
        revokedAt: userInvitations.revokedAt,
      })
      .from(userInvitations)
      .where(eq(userInvitations.tokenHash, tokenHash))
      .limit(1);

    if (!invite) return res.status(404).json({ message: "Invitation not found" });
    if (invite.acceptedAt) return res.status(410).json({ message: "Invitation already accepted" });
    if (invite.revokedAt) return res.status(410).json({ message: "Invitation was revoked" });
    if (invite.expiresAt < new Date()) return res.status(410).json({ message: "Invitation expired" });

    const [biz] = await db
      .select({ companyName: businesses.companyName })
      .from(businesses)
      .where(eq(businesses.id, invite.businessId))
      .limit(1);

    return res.json({
      email: invite.email,
      role: invite.role,
      businessName: biz?.companyName || "this business",
      expiresAt: invite.expiresAt,
    });
  } catch (e: any) {
    console.error("[team] preview invitation error:", e?.message || e);
    return res.status(500).json({ message: "Failed to load invitation" });
  }
});

// ─── POST /api/invitations/accept — auth required ─────────────────────────────

router.post("/invitations/accept", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const raw = String(req.body?.token || "");
    if (!raw) return res.status(400).json({ message: "Token required" });
    const tokenHash = hashToken(raw);

    // Pre-fetch (no lock) for fast 404 / role validation / email mismatch.
    const [preview] = await db
      .select()
      .from(userInvitations)
      .where(eq(userInvitations.tokenHash, tokenHash))
      .limit(1);

    if (!preview) return res.status(404).json({ message: "Invitation not found" });

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return res.status(401).json({ message: "Not authenticated" });

    if (user.email.toLowerCase() !== preview.email.toLowerCase()) {
      return res.status(403).json({
        message: `This invitation was sent to ${preview.email}. Sign in with that email to accept.`,
      });
    }

    if (!isRole(preview.role)) {
      return res.status(500).json({ message: "Invitation has invalid role" });
    }

    // Race-safe accept: re-read the invitation row inside the transaction
    // with FOR UPDATE so concurrent accepts can't both pass the validity
    // check. The unique (business_id, user_id) index on business_members
    // already prevents duplicate rows; the lock prevents two clients
    // racing to flip acceptedAt out from under each other.
    let acceptedRole: Role | null = null;
    let acceptedBusinessId: string | null = null;

    await db.transaction(async (tx) => {
      const lockedRows = await tx.execute<{
        id: string;
        business_id: string;
        role: string;
        accepted_at: Date | null;
        revoked_at: Date | null;
        expires_at: Date;
        invited_by_user_id: string | null;
        created_at: Date;
      }>(sql`
        SELECT id, business_id, role, accepted_at, revoked_at, expires_at,
               invited_by_user_id, created_at
          FROM user_invitations
         WHERE id = ${preview.id}
         FOR UPDATE
      `);
      const locked = (lockedRows as any).rows?.[0] ?? (lockedRows as any)[0];
      if (!locked) {
        const e: any = new Error("Invitation not found");
        e.statusCode = 404;
        throw e;
      }
      if (locked.accepted_at) {
        const e: any = new Error("Invitation already accepted");
        e.statusCode = 410;
        throw e;
      }
      if (locked.revoked_at) {
        const e: any = new Error("Invitation was revoked");
        e.statusCode = 410;
        throw e;
      }
      if (new Date(locked.expires_at) < new Date()) {
        const e: any = new Error("Invitation expired");
        e.statusCode = 410;
        throw e;
      }

      await tx
        .insert(businessMembers)
        .values({
          businessId: locked.business_id,
          userId,
          role: locked.role,
          status: "active",
          invitedByUserId: locked.invited_by_user_id,
          invitedAt: locked.created_at,
          acceptedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [businessMembers.businessId, businessMembers.userId],
          set: {
            role: locked.role,
            status: "active",
            acceptedAt: new Date(),
            updatedAt: new Date(),
          },
        });

      await tx
        .update(userInvitations)
        .set({ acceptedAt: new Date() })
        .where(eq(userInvitations.id, locked.id));

      acceptedRole = locked.role as Role;
      acceptedBusinessId = locked.business_id;
    });

    return res.json({ ok: true, businessId: acceptedBusinessId, role: acceptedRole });
  } catch (e: any) {
    if (e?.statusCode) return res.status(e.statusCode).json({ message: e.message });
    console.error("[team] accept invitation error:", e?.message || e);
    return res.status(500).json({ message: "Failed to accept invitation" });
  }
});

export default router;
