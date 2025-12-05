-- Migration: Create subscriptions table for tracking subscription history
-- This enables tracking all past and current subscriptions for users
-- Run this in your Supabase SQL Editor

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL, -- essential, professional, enterprise
  interval TEXT NOT NULL, -- month, year
  status TEXT NOT NULL, -- active, canceled, completed, past_due
  amount NUMERIC(10, 2) NOT NULL, -- Amount paid
  currency TEXT DEFAULT 'usd',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_session_id TEXT, -- Checkout session ID
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  next_billing_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE subscriptions IS 'Tracks all subscription history for users';
COMMENT ON COLUMN subscriptions.plan IS 'Subscription plan: essential, professional, enterprise';
COMMENT ON COLUMN subscriptions.interval IS 'Billing interval: month or year';
COMMENT ON COLUMN subscriptions.status IS 'Subscription status: active, canceled, completed, past_due';
COMMENT ON COLUMN subscriptions.amount IS 'Amount paid for this subscription period';
COMMENT ON COLUMN subscriptions.stripe_session_id IS 'Stripe checkout session ID from payment';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON subscriptions(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON subscriptions;

-- Create policy: Users can only view their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own subscriptions
CREATE POLICY "Users can insert their own subscriptions"
  ON subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own subscriptions
CREATE POLICY "Users can update their own subscriptions"
  ON subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists (for re-running migration)
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

