-- Add unique constraint on stripe_session_id to prevent duplicate subscriptions
-- This ensures that each Stripe checkout session can only create one subscription record

-- First, remove any duplicate subscriptions (keep the oldest one)
WITH duplicates AS (
  SELECT 
    id,
    stripe_session_id,
    ROW_NUMBER() OVER (PARTITION BY stripe_session_id ORDER BY created_at ASC) as rn
  FROM subscriptions
  WHERE stripe_session_id IS NOT NULL
)
DELETE FROM subscriptions
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Create unique index on stripe_session_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe_session_id_unique 
ON subscriptions(stripe_session_id) 
WHERE stripe_session_id IS NOT NULL;

-- Add comment
COMMENT ON INDEX idx_subscriptions_stripe_session_id_unique IS 'Ensures each Stripe checkout session creates only one subscription record';

