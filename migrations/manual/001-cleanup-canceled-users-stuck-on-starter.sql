-- RUN SELECT FIRST, REVIEW COUNT, THEN MANUALLY RUN UPDATE.
--
-- Context: prior versions of the Stripe subscription webhook handlers
-- (customer.subscription.deleted and customer.subscription.updated) downgraded
-- canceled / inactive users to subscription_tier = 'starter'. Starter is a
-- $19/mo PAID tier (20 quotes/mo, AI follow-ups, etc. per shared/plans.ts) and
-- isStarterOrAbove("starter") returns true, so those users have retained
-- paid-tier product access without an active subscription. The handlers now
-- downgrade to 'free' instead. This migration cleans up the historical leak.

-- 1) Count how many users are currently in the leaked state.
SELECT COUNT(*) AS leaked_users
FROM users
WHERE subscription_tier = 'starter'
  AND (
    stripe_subscription_status IN ('canceled', 'unpaid', 'incomplete_expired', 'past_due')
    OR (stripe_subscription_id IS NULL AND subscription_platform IS NULL)
    OR subscription_expires_at < NOW()
  );

-- 2) After reviewing the count above, run this UPDATE manually to fix them.
-- UPDATE users
--    SET subscription_tier = 'free',
--        subscription_synced_at = NOW()
--  WHERE subscription_tier = 'starter'
--    AND (
--      stripe_subscription_status IN ('canceled', 'unpaid', 'incomplete_expired', 'past_due')
--      OR (stripe_subscription_id IS NULL AND subscription_platform IS NULL)
--      OR subscription_expires_at < NOW()
--    );
