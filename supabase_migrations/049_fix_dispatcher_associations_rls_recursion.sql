-- Fix RLS recursion issue in dispatcher_company_associations policy
-- The previous policy had a recursive subquery that could cause issues
-- This version uses a SECURITY DEFINER function to bypass RLS for the check

-- Drop the problematic policy
DROP POLICY IF EXISTS "Dispatchers can view associations for their companies" ON dispatcher_company_associations;

-- Create a helper function that bypasses RLS to check associations
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

-- Create the policy using the function to avoid recursion
CREATE POLICY "Dispatchers can view associations for their companies"
  ON dispatcher_company_associations FOR SELECT
  TO authenticated
  USING (
    -- Dispatchers can view associations for companies they're associated with
    -- Use function to avoid RLS recursion
    company_id IN (
      SELECT company_id FROM get_dispatcher_company_ids(auth.uid())
    )
    OR
    -- Also allow viewing their own associations (existing behavior)
    dispatcher_id = auth.uid()
  );

-- Verify the policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'dispatcher_company_associations' 
    AND policyname = 'Dispatchers can view associations for their companies'
  ) THEN
    RAISE NOTICE 'RLS policy for dispatcher_company_associations fixed successfully';
  ELSE
    RAISE WARNING 'RLS policy for dispatcher_company_associations may not have been created';
  END IF;
END $$;

