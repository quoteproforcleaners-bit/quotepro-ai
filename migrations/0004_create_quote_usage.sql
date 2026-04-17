-- 0004_create_quote_usage.sql
-- Per-quote usage events for monthly counting and overage billing. Idempotent.

CREATE TABLE IF NOT EXISTS quote_usage (
  id              VARCHAR     PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         VARCHAR     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quote_id        VARCHAR     NOT NULL,
  billing_period  VARCHAR(7)  NOT NULL,           -- 'YYYY-MM'
  created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS quote_usage_user_period_idx ON quote_usage(user_id, billing_period);
CREATE INDEX IF NOT EXISTS quote_usage_quote_id_idx    ON quote_usage(quote_id);
