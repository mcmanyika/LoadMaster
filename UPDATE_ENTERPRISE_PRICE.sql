-- Quick Update: Change Enterprise price from $499 to $67.47
-- Copy and paste this entire file into Supabase SQL Editor and Run

-- First, verify current price
SELECT plan_id, name, monthly_price, annual_price, annual_total 
FROM subscription_plans 
WHERE plan_id = 'enterprise';

-- Update the price
UPDATE subscription_plans
SET
  monthly_price = 67.47,
  annual_price = 57.35,
  annual_total = 688.20,
  updated_at = NOW()
WHERE plan_id = 'enterprise';

-- Verify the update worked
SELECT plan_id, name, monthly_price, annual_price, annual_total 
FROM subscription_plans 
WHERE plan_id = 'enterprise';

-- Expected result after update:
-- plan_id: enterprise
-- monthly_price: 67.47
-- annual_price: 57.35
-- annual_total: 688.20

