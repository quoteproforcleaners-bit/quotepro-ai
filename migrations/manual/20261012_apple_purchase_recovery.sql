-- Additive only. Apply to the approved TEST database first; never copy customer data.
-- Production application requires a separate reviewed migration/deployment.
BEGIN;
CREATE TABLE IF NOT EXISTS apple_purchase_recovery_config (
  id integer PRIMARY KEY CHECK (id = 1),
  activated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO apple_purchase_recovery_config(id) VALUES (1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS apple_purchase_owners (
  environment text NOT NULL CHECK (environment IN ('Sandbox','Production')),
  original_transaction_id text NOT NULL,
  user_id varchar NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (environment,original_transaction_id)
);
CREATE INDEX IF NOT EXISTS apple_purchase_owners_user_idx ON apple_purchase_owners(user_id);
COMMIT;
