-- Migration: Add fee_percentage column to profiles table
-- This column stores the commission/fee percentage for dispatchers
-- Run this in your Supabase SQL Editor

-- Add fee_percentage column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS fee_percentage NUMERIC(5,2) DEFAULT 12.00;

-- Add comment to explain the column (optional but helpful)
COMMENT ON COLUMN profiles.fee_percentage IS 'Commission fee percentage for dispatchers (e.g., 12.00 for 12%)';

-- Update existing dispatchers to have default 12% if null
UPDATE profiles
SET fee_percentage = 12.00
WHERE role = 'dispatcher' AND (fee_percentage IS NULL OR fee_percentage = 0);
