-- scripts/backfill-business-members.sql
--
-- Phase 1 RBAC backfill: every existing business owner becomes an
-- 'owner' member of their business in business_members.
--
-- Idempotent — safe to re-run. Uses ON CONFLICT against the
-- (business_id, user_id) unique index. Skips businesses with NULL
-- owner_user_id (those are orphan rows from older signup flows; they
-- need manual cleanup, not silent membership creation).
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/backfill-business-members.sql
--
-- Verifies counts at the end.

BEGIN;

INSERT INTO business_members (business_id, user_id, role, status, accepted_at)
SELECT id, owner_user_id, 'owner', 'active', NOW()
FROM businesses
WHERE owner_user_id IS NOT NULL
ON CONFLICT (business_id, user_id) DO NOTHING;

COMMIT;

-- Report
SELECT
  (SELECT COUNT(*) FROM businesses WHERE owner_user_id IS NOT NULL) AS owned_businesses,
  (SELECT COUNT(*) FROM businesses WHERE owner_user_id IS NULL)     AS orphan_businesses,
  (SELECT COUNT(*) FROM business_members WHERE role = 'owner')      AS owner_memberships,
  (SELECT COUNT(*) FROM business_members)                           AS total_memberships;
