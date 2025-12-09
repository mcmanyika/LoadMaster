-- ⚠️ SAFE MIGRATION: This script does NOT delete any data
-- Fix RLS policies to allow dispatchers to view pending invite codes
-- Dispatchers need to be able to look up codes before joining
--
-- SAFETY: This migration only:
-- - Adds new RLS policies (no data deletion)
-- - Does NOT delete, truncate, or modify any existing data

-- =====================================================
-- Fix RLS for dispatcher_company_associations
-- Allow dispatchers to view pending invite codes (where dispatcher_id IS NULL)
-- =====================================================

-- Add policy to allow dispatchers to view pending invite codes
-- This is needed so dispatchers can look up codes before joining
-- NOTE: This is an ADDITIONAL policy - it works alongside the existing "Dispatchers can view their own associations" policy from migration 019
-- The existing policy already handles:
-- - Dispatchers viewing their own associations (dispatcher_id = auth.uid())
-- - Owners viewing associations for their companies (including pending invite codes where dispatcher_id IS NULL)
-- This new policy allows ANY dispatcher to view ANY pending invite code (for code lookup)
DROP POLICY IF EXISTS "Dispatchers can view pending invite codes" ON dispatcher_company_associations;

CREATE POLICY "Dispatchers can view pending invite codes"
  ON dispatcher_company_associations FOR SELECT
  TO authenticated
  USING (
    -- Allow viewing associations with invite codes that haven't been used yet
    (invite_code IS NOT NULL 
     AND dispatcher_id IS NULL 
     AND status = 'pending')
  );

-- IMPORTANT: Do NOT drop/recreate "Dispatchers can view their own associations" policy
-- It already exists in migration 019 and must remain intact
-- Dropping it would break owner access to view associations for their companies

-- Allow dispatchers to update associations when using an invite code
-- They need to be able to set dispatcher_id and change status from 'pending' to 'active'
DROP POLICY IF EXISTS "Dispatchers can use invite codes" ON dispatcher_company_associations;

CREATE POLICY "Dispatchers can use invite codes"
  ON dispatcher_company_associations FOR UPDATE
  TO authenticated
  USING (
    -- Can update if it's a pending invite code (not yet used)
    (invite_code IS NOT NULL 
     AND dispatcher_id IS NULL 
     AND status = 'pending')
  )
  WITH CHECK (
    -- After update, dispatcher_id should be set to current user
    (dispatcher_id = auth.uid() 
     AND status = 'active')
  );

-- =====================================================
-- Fix RLS for companies table
-- Allow dispatchers to view companies when looking up invite codes
-- =====================================================

-- Update companies SELECT policy to allow viewing companies via invite codes
-- The existing policy uses can_view_company_by_association which should work,
-- but we need to ensure dispatchers can see companies when they have a pending invite code

-- The existing policy should already allow this via the function, but let's verify
-- and add a more explicit policy if needed

-- Add policy to allow viewing companies that have pending invite codes
-- This ensures dispatchers can see company names when looking up codes
DROP POLICY IF EXISTS "Dispatchers can view companies with invite codes" ON companies;

CREATE POLICY "Dispatchers can view companies with invite codes"
  ON companies FOR SELECT
  TO authenticated
  USING (
    -- Allow viewing if there's a pending invite code for this company
    id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE invite_code IS NOT NULL 
      AND dispatcher_id IS NULL 
      AND status = 'pending'
    )
  );

-- Verify policies were created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'dispatcher_company_associations' 
    AND policyname = 'Dispatchers can view pending invite codes'
  ) THEN
    RAISE NOTICE 'RLS policies for invite codes updated successfully';
  ELSE
    RAISE WARNING 'RLS policies may not have been created';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'companies' 
    AND policyname = 'Dispatchers can view companies with invite codes'
  ) THEN
    RAISE NOTICE 'RLS policy for companies with invite codes created successfully';
  ELSE
    RAISE WARNING 'RLS policy for companies may not have been created';
  END IF;
END $$;

