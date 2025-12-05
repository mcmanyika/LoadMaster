-- Migration: Add subscription fields to profiles table
-- This enables tracking user subscription plans and Stripe customer information
-- Run this in your Supabase SQL Editor

-- Add subscription-related columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_plan TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add comments to explain the columns
COMMENT ON COLUMN profiles.subscription_plan IS 'User subscription plan: essential, professional, or enterprise';
COMMENT ON COLUMN profiles.subscription_status IS 'Stripe subscription status: active, trialing, past_due, canceled, incomplete';
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe customer ID for this user';
COMMENT ON COLUMN profiles.stripe_subscription_id IS 'Stripe subscription ID for this user';

-- Create index for faster lookups by Stripe customer ID
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);

-- Create index for subscription status lookups
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status) WHERE subscription_status IS NOT NULL;

