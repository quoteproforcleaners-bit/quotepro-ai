/**
 * server/lib/permissions.ts
 *
 * RBAC permission map + check utilities (Phase 1 of multi-user RBAC).
 *
 * Roles are hardcoded — no dynamic permission builder. The 5 roles and
 * their actions match Mike's spec matrix exactly.
 *
 * Usage:
 *   import { can, canAssignRole, type Role, type Action } from "../lib/permissions";
 *   if (!can(member.role, "billing:manage")) return res.status(403)...
 *
 * Phase 2 will wire `can()` into route middleware. Phase 1 ships the
 * primitive only.
 */

export const ROLES = ["owner", "admin", "manager", "estimator", "cleaner"] as const;
export type Role = (typeof ROLES)[number];

export const ACTIONS = [
  "billing:manage",
  "integrations:manage",
  "users:invite",
  "users:remove",
  "users:change_role",
  "account:settings",
  "quote_settings:edit",   // service types, pricing config
  "quote:create",
  "quote:view_all",
  "quote:view_own",
  "reports:view",
  "customers:manage",
  "customers:manage_own",  // estimator: only customers they created/quoted
  "jobs:view_assigned",
  "jobs:complete",
  "ownership:transfer",
] as const;
export type Action = (typeof ACTIONS)[number];

/**
 * Role → allowed action set. Mirrors the spec matrix.
 * "view_own" / "manage_own" indicate the actor is restricted to records
 * they own; the route handler still has to enforce that scope.
 */
const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Action>> = {
  owner: new Set<Action>([
    "billing:manage",
    "integrations:manage",
    "users:invite",
    "users:remove",
    "users:change_role",
    "account:settings",
    "quote_settings:edit",
    "quote:create",
    "quote:view_all",
    "reports:view",
    "customers:manage",
    "jobs:view_assigned",
    "jobs:complete",
    "ownership:transfer",
  ]),
  admin: new Set<Action>([
    "users:invite",
    "users:remove",
    "users:change_role",
    "account:settings",
    "quote_settings:edit",
    "quote:create",
    "quote:view_all",
    "reports:view",
    "customers:manage",
    "jobs:view_assigned",
    "jobs:complete",
  ]),
  manager: new Set<Action>([
    "quote_settings:edit",
    "quote:create",
    "quote:view_all",
    "reports:view",
    "customers:manage",
    "jobs:view_assigned",
    "jobs:complete",
  ]),
  estimator: new Set<Action>([
    "quote:create",
    "quote:view_own",
    "customers:manage_own",
    "jobs:view_assigned",
    "jobs:complete",
  ]),
  cleaner: new Set<Action>([
    "jobs:view_assigned",
    "jobs:complete",
  ]),
};

export function can(role: Role | null | undefined, action: Action): boolean {
  if (!role) return false;
  const set = ROLE_PERMISSIONS[role];
  return set ? set.has(action) : false;
}

/**
 * Role rank for assignability checks. Higher = more powerful.
 * - Owner can change anyone (handled separately for other Owners)
 * - Admin can change/invite Manager/Estimator/Cleaner only
 */
const ROLE_RANK: Record<Role, number> = {
  owner: 100,
  admin: 80,
  manager: 60,
  estimator: 40,
  cleaner: 20,
};

/**
 * Can `actor` assign `target` role to someone (or change someone to it)?
 * Rules:
 *   - Owner can assign anything except 'owner' (use ownership transfer for that).
 *   - Admin can assign manager / estimator / cleaner.
 *   - Manager+ cannot assign roles.
 */
export function canAssignRole(actorRole: Role | null | undefined, target: Role): boolean {
  if (!actorRole) return false;
  if (actorRole === "owner") return target !== "owner";
  if (actorRole === "admin") {
    return target === "manager" || target === "estimator" || target === "cleaner";
  }
  return false;
}

/**
 * Can `actor` modify (change role / disable / remove) the membership of
 * `target`? Owners can touch anyone except other Owners. Admins can
 * touch Manager/Estimator/Cleaner only.
 */
export function canModifyMember(actorRole: Role | null | undefined, targetRole: Role): boolean {
  if (!actorRole) return false;
  if (actorRole === "owner") return targetRole !== "owner";
  if (actorRole === "admin") return ROLE_RANK[targetRole] < ROLE_RANK.admin;
  return false;
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
