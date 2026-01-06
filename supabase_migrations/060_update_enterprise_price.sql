-- Update Enterprise plan price from $499 to $67.47
UPDATE subscription_plans
SET
  monthly_price = 67.47,
  annual_price = 57.35, -- 15% off monthly price
  annual_total = 688.20, -- annual_price * 12
  updated_at = NOW()
WHERE plan_id = 'enterprise';

