-- 0001_create_pricing_tiers.sql
-- Creates the pricing_tiers catalog table. Idempotent.

CREATE TABLE IF NOT EXISTS pricing_tiers (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(32)  NOT NULL UNIQUE,
  display_name  VARCHAR(64)  NOT NULL,
  monthly_price INTEGER      NOT NULL,            -- cents
  annual_price  INTEGER      NOT NULL,            -- cents (per month, billed annually)
  quote_limit   INTEGER      NOT NULL,
  features      JSONB        NOT NULL DEFAULT '[]'::jsonb,
  active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);
