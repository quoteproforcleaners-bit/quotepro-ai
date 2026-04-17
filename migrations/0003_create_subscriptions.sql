-- 0003_create_subscriptions.sql
-- Creates the subscriptions table with usage + overage + billing-period tracking
-- and a legacy_locked_price for grandfathered users. Idempotent.
--
-- Note: subscription state previously lived on the users table. This new table
-- becomes the source of truth going forward; the columns on users remain in
-- place for backward compatibility until the next migration phase.

CREATE TABLE IF NOT EXISTS subscriptions (
  id                              VARCHAR  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                         VARCHAR  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pricing_tier_id                 INTEGER  REFERENCES pricing_tiers(id),
  status                          VARCHAR(32)  NOT NULL DEFAULT 'active',
  interval                        VARCHAR(16)  NOT NULL DEFAULT 'monthly',
  quotes_used_current_period      INTEGER      NOT NULL DEFAULT 0,
  overage_charges_current_period  INTEGER      NOT NULL DEFAULT 0, -- cents
  billing_period_start            TIMESTAMP,
  billing_period_end              TIMESTAMP,
  legacy_plan_name                VARCHAR(32),
  legacy_locked_price             INTEGER,                        -- cents/month
  legacy_locked_until             TIMESTAMP,
  stripe_subscription_id          TEXT,
  created_at                      TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- If the table already existed (e.g. partially built earlier), make sure every
-- required column is present.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS pricing_tier_id                INTEGER REFERENCES pricing_tiers(id);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS quotes_used_current_period     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS overage_charges_current_period INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_period_start           TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing_period_end             TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS legacy_plan_name               VARCHAR(32);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS legacy_locked_price            INTEGER;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS legacy_locked_until            TIMESTAMP;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id         TEXT;

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx         ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subscriptions_pricing_tier_id_idx ON subscriptions(pricing_tier_id);
