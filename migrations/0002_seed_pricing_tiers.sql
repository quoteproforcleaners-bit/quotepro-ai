-- 0002_seed_pricing_tiers.sql
-- Seeds the four new tiers. Idempotent via ON CONFLICT.

INSERT INTO pricing_tiers (name, display_name, monthly_price, annual_price, quote_limit, features, active)
VALUES
  ('solo',   'Solo',     3900,   3900,   25,
    '["core_quoting","email_notifications","branded_pdfs","trial_access"]'::jsonb, TRUE),
  ('growth', 'Growth',   7900,   6500,  150,
    '["core_quoting","email_notifications","branded_pdfs","quote_doctor","market_pricing","quote_to_checklist","team_seats_3","trial_access"]'::jsonb, TRUE),
  ('pro',    'Pro',     14900,  12500,  500,
    '["core_quoting","email_notifications","branded_pdfs","quote_doctor","market_pricing","quote_to_checklist","autopilot_included","unlimited_seats","api_access","advanced_analytics"]'::jsonb, TRUE),
  ('scale',  'Scale',   34900,  29900, 2000,
    '["core_quoting","email_notifications","branded_pdfs","quote_doctor","market_pricing","quote_to_checklist","autopilot_included","unlimited_seats","api_access","advanced_analytics","multi_location","white_glove_onboarding","custom_branding","dedicated_support"]'::jsonb, TRUE)
ON CONFLICT (name) DO UPDATE SET
  display_name  = EXCLUDED.display_name,
  monthly_price = EXCLUDED.monthly_price,
  annual_price  = EXCLUDED.annual_price,
  quote_limit   = EXCLUDED.quote_limit,
  features      = EXCLUDED.features,
  active        = EXCLUDED.active,
  updated_at    = NOW();
