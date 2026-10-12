/**
 * server/lib/membership.ts
 *
 * Lookup helpers for business_members (Phase 1 RBAC).
 *
 * These are additive — existing `getBusinessByOwner(userId)` flows in
 * server/storage.ts continue to work unchanged for owners. New code
 * (and Phase 2 middleware) should prefer these helpers, which support
 * non-owner members.
 */

import { and, asc, eq } from "drizzle-orm";
import { db } from "../db";
import { businessMembers, businesses } from "@shared/schema";
import type { Role } from "./permissions";

/**
 * Canonical ownership truth model:
 * - `business_members(role='owner', status='active')` is the single
 *   source of truth for who owns a business going forward.
 * - `businesses.owner_user_id` is the legacy column. It MUST stay in
 *   sync with the owner-row in business_members. Use
 *   `syncOwnerMembership()` whenever ownership is mutated (signup,
 *   ownership transfer) — never write one without the other.
 */

export type Membership = {
  id: string;
  businessId: string;
  userId: string;
  role: Role;
  status: "pending" | "active" | "disabled";
};

/**
 * Returns the active membership for (userId, businessId), or null if the
 * user isn't a member or is disabled.
 */
export async function getMembership(
  userId: string,
  businessId: string,
): Promise<Membership | null> {
  const [row] = await db
    .select({
      id: businessMembers.id,
      businessId: businessMembers.businessId,
      userId: businessMembers.userId,
      role: businessMembers.role,
      status: businessMembers.status,
    })
    .from(businessMembers)
    .where(
      and(
        eq(businessMembers.userId, userId),
        eq(businessMembers.businessId, businessId),
      ),
    )
    .limit(1);

  if (!row) return null;
  if (row.status !== "active") return null;
  return row as Membership;
}

/**
 * All active memberships for a user (across every business they belong
 * to). Use for the account switcher / "which workspace?" picker.
 */
export async function getActiveMemberships(userId: string): Promise<
  Array<Membership & { businessName: string | null }>
> {
  const rows = await db
    .select({
      id: businessMembers.id,
      businessId: businessMembers.businessId,
      userId: businessMembers.userId,
      role: businessMembers.role,
      status: businessMembers.status,
      businessName: businesses.companyName,
    })
    .from(businessMembers)
    .innerJoin(businesses, eq(businesses.id, businessMembers.businessId))
    .where(
      and(eq(businessMembers.userId, userId), eq(businessMembers.status, "active")),
    )
    // Deterministic order: owner-roles first (alphabetical role), then
    // by businessId for stable fallback selection.
    .orderBy(asc(businessMembers.role), asc(businessMembers.businessId));

  return rows.map((r) => ({
    ...r,
    role: r.role as Role,
    status: r.status as Membership["status"],
  }));
}

/**
 * Atomically keep `businesses.owner_user_id` and the owner row in
 * `business_members` aligned when ownership is created or transferred.
 *
 * Behavior:
 *  - Demotes any existing owner-role members of this business to 'admin'
 *    (status preserved).
 *  - Upserts (businessId, newOwnerUserId) → role='owner', status='active'.
 *  - Updates `businesses.owner_user_id`.
 *
 * Use this for: initial signup (create business + first owner member),
 * ownership transfer, admin recovery flows. Do NOT bypass it.
 */
export async function syncOwnerMembership(
  businessId: string,
  newOwnerUserId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    // Demote any prior owners that aren't the new one.
    await tx
      .update(businessMembers)
      .set({ role: "admin", updatedAt: new Date() })
      .where(
        and(
          eq(businessMembers.businessId, businessId),
          eq(businessMembers.role, "owner"),
        ),
      );

    // Upsert the new owner membership.
    await tx
      .insert(businessMembers)
      .values({
        businessId,
        userId: newOwnerUserId,
        role: "owner",
        status: "active",
        acceptedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [businessMembers.businessId, businessMembers.userId],
        set: { role: "owner", status: "active", updatedAt: new Date() },
      });

    // Update legacy ownership column.
    await tx
      .update(businesses)
      .set({ ownerUserId: newOwnerUserId, updatedAt: new Date() })
      .where(eq(businesses.id, businessId));
  });
}

/**
 * Boot-time sanity check: verifies every business with a non-null
 * owner_user_id has a matching owner row in business_members. Logs a
 * warning if drift is detected. Non-fatal — does not throw.
 */
export async function checkOwnershipDrift(): Promise<{
  drifted: number;
  total: number;
}> {
  const { sql } = await import("drizzle-orm");
  const { rows } = (await db.execute(sql`
    SELECT COUNT(*)::int AS drifted
    FROM businesses b
    WHERE b.owner_user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM business_members m
        WHERE m.business_id = b.id
          AND m.user_id = b.owner_user_id
          AND m.role = 'owner'
          AND m.status = 'active'
      )
  `)) as unknown as { rows: Array<{ drifted: number }> };
  const { rows: totalRows } = (await db.execute(sql`
    SELECT COUNT(*)::int AS total FROM businesses WHERE owner_user_id IS NOT NULL
  `)) as unknown as { rows: Array<{ total: number }> };

  const drifted = rows[0]?.drifted ?? 0;
  const total = totalRows[0]?.total ?? 0;

  if (drifted > 0) {
    console.warn(
      `[rbac] Ownership drift: ${drifted}/${total} businesses missing owner membership row. Run backfill.`,
    );
  } else {
    console.log(`[rbac] Ownership integrity OK (${total} businesses).`);
  }
  return { drifted, total };
}

/**
 * Resolve the "current" business for an authenticated user.
 *
 * Resolution order:
 *   1. If `preferredBusinessId` is provided AND the user has an active
 *      membership there → return that membership.
 *   2. Otherwise return the user's first active membership (alphabetical
 *      by business id for stability).
 *
 * Returns null if the user has no active memberships (a user who hasn't
 * been backfilled — should not happen post-migration, but guard anyway).
 */
export async function resolveCurrentMembership(
  userId: string,
  preferredBusinessId?: string | null,
): Promise<Membership | null> {
  if (preferredBusinessId) {
    const m = await getMembership(userId, preferredBusinessId);
    if (m) return m;
  }
  const all = await getActiveMemberships(userId);
  if (all.length === 0) return null;
  // getActiveMemberships orders owner-roles first, then by businessId,
  // so all[0] is deterministic.
  return all[0];
}
