-- Create subscription_plans table to store pricing centrally
-- This allows prices to be updated without code changes

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL UNIQUE, -- essential, professional, enterprise
  name TEXT NOT NULL, -- Display name: Essential, Professional, Enterprise
  monthly_price NUMERIC(10, 2) NOT NULL, -- Monthly price in USD
  annual_price NUMERIC(10, 2) NOT NULL, -- Annual price per month (with discount) in USD
  annual_total NUMERIC(10, 2) NOT NULL, -- Total annual price (annual_price * 12)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE subscription_plans IS 'Stores subscription plan pricing - single source of truth';
COMMENT ON COLUMN subscription_plans.plan_id IS 'Unique plan identifier: essential, professional, enterprise';
COMMENT ON COLUMN subscription_plans.monthly_price IS 'Monthly subscription price in USD';
COMMENT ON COLUMN subscription_plans.annual_price IS 'Monthly equivalent price for annual billing (with discount)';
COMMENT ON COLUMN subscription_plans.annual_total IS 'Total annual price (annual_price * 12)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscription_plans_plan_id ON subscription_plans(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active) WHERE is_active = true;

-- Insert current pricing
INSERT INTO subscription_plans (plan_id, name, monthly_price, annual_price, annual_total, is_active)
VALUES
  ('essential', 'Essential', 24.98, 21.24, 254.88, true),
  ('professional', 'Professional', 44.98, 38.24, 458.88, true),
  ('enterprise', 'Enterprise', 67.47, 57.35, 688.20, true)
ON CONFLICT (plan_id) DO UPDATE
SET
  monthly_price = EXCLUDED.monthly_price,
  annual_price = EXCLUDED.annual_price,
  annual_total = EXCLUDED.annual_total,
  updated_at = NOW();

-- Enable Row Level Security (RLS)
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view active plans
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON subscription_plans;
CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans
  FOR SELECT
  USING (is_active = true);

-- Only allow service role to insert/update/delete (for admin updates)
-- Regular users can view but not modify

