-- Comprehensive fix for dispatcher_company_associations RLS policies
-- This ensures dispatchers can see their data when RLS is enabled
-- Fixes recursion issues and ensures all necessary policies are in place

-- Enable RLS (if not already enabled)
ALTER TABLE dispatcher_company_associations ENABLE ROW LEVEL SECURITY;

-- Drop all existing SELECT policies to start fresh
DROP POLICY IF EXISTS "Dispatchers can view associations for their companies" ON dispatcher_company_associations;
DROP POLICY IF EXISTS "Dispatchers can view their own associations" ON dispatcher_company_associations;
DROP POLICY IF EXISTS "Dispatchers can view pending invite codes" ON dispatcher_company_associations;

-- Create helper function that bypasses RLS to check associations
CREATE OR REPLACE FUNCTION get_dispatcher_company_ids(dispatcher_user_id UUID)
RETURNS TABLE(company_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT dca.company_id
  FROM dispatcher_company_associations dca
  WHERE dca.dispatcher_id = dispatcher_user_id
    AND dca.status = 'active';
END;
$$;

-- Policy 1: Dispatchers can view their own associations
CREATE POLICY "Dispatchers can view their own associations"
  ON dispatcher_company_associations FOR SELECT
  TO authenticated
  USING (
    dispatcher_id = auth.uid()
    OR
    -- Owners can view associations for their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- Policy 2: Dispatchers can view associations for companies they're associated with
-- This uses the SECURITY DEFINER function to avoid RLS recursion
CREATE POLICY "Dispatchers can view associations for their companies"
  ON dispatcher_company_associations FOR SELECT
  TO authenticated
  USING (
    -- Use function to avoid RLS recursion
    company_id IN (
      SELECT company_id FROM get_dispatcher_company_ids(auth.uid())
    )
  );

-- Policy 3: Dispatchers can view pending invite codes (where dispatcher_id is NULL)
CREATE POLICY "Dispatchers can view pending invite codes"
  ON dispatcher_company_associations FOR SELECT
  TO authenticated
  USING (
    dispatcher_id IS NULL
    AND status = 'pending'
  );

-- Verify policies were created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'dispatcher_company_associations' 
    AND policyname = 'Dispatchers can view their own associations'
  ) AND EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'dispatcher_company_associations' 
    AND policyname = 'Dispatchers can view associations for their companies'
  ) THEN
    RAISE NOTICE 'All dispatcher_company_associations SELECT policies created successfully';
  ELSE
    RAISE WARNING 'Some dispatcher_company_associations SELECT policies may not have been created';
  END IF;
END $$;

