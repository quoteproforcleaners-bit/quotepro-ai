-- 0005_data_migration_legacy_subscriptions.sql
-- Maps existing users.subscription_tier values to rows in the new
-- subscriptions table, locking legacy prices for 12 months.
--
-- Mapping:
--   'starter' ($19/mo) -> 'solo'   tier, locked at $19/mo for 12 months
--   'growth'  ($49/mo) -> 'growth' tier, locked at $49/mo for 12 months
--   'pro'     ($99/mo) -> 'pro'    tier, locked at $99/mo for 12 months
--
-- Idempotent: skips users that already have a subscription row.

INSERT INTO subscriptions (
  user_id,
  pricing_tier_id,
  status,
  interval,
  quotes_used_current_period,
  overage_charges_current_period,
  billing_period_start,
  billing_period_end,
  legacy_plan_name,
  legacy_locked_price,
  legacy_locked_until,
  stripe_subscription_id
)
SELECT
  u.id,
  pt.id,
  COALESCE(NULLIF(u.stripe_subscription_status, ''), 'active'),
  COALESCE(u.subscription_interval, 'monthly'),
  0,
  0,
  COALESCE(u.subscription_started_at, NOW()),
  COALESCE(u.subscription_expires_at,
           COALESCE(u.subscription_started_at, NOW()) + INTERVAL '1 month'),
  u.subscription_tier,
  CASE u.subscription_tier
    WHEN 'starter' THEN 1900
    WHEN 'growth'  THEN 4900
    WHEN 'pro'     THEN 9900
    ELSE NULL
  END,
  CASE
    WHEN u.subscription_tier IN ('starter','growth','pro')
      THEN COALESCE(u.subscription_started_at, NOW()) + INTERVAL '12 months'
    ELSE NULL
  END,
  u.stripe_subscription_id
FROM users u
LEFT JOIN pricing_tiers pt
  ON pt.name = CASE u.subscription_tier
                  WHEN 'starter' THEN 'solo'
                  WHEN 'growth'  THEN 'growth'
                  WHEN 'pro'     THEN 'pro'
                  WHEN 'solo'    THEN 'solo'
                  WHEN 'scale'   THEN 'scale'
                  ELSE NULL
                END
WHERE u.subscription_tier IN ('starter','growth','pro','solo','scale')
  AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = u.id);
