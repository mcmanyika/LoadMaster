-- Comprehensive fix for drivers RLS to allow dispatchers to view drivers from owner companies
-- This uses SECURITY DEFINER functions to avoid RLS recursion issues
-- Handles both direct associations and chain associations (dispatcher -> dispatch company -> owner company)

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view drivers from their company" ON drivers;

-- Create helper function to get dispatcher's associated company IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION get_dispatcher_company_ids_for_drivers(dispatcher_user_id UUID)
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

-- Create helper function to get owner company IDs via dispatch company chain (bypasses RLS)
CREATE OR REPLACE FUNCTION get_owner_companies_via_dispatch_company(dispatcher_user_id UUID)
RETURNS TABLE(company_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT dca2.company_id
  FROM dispatcher_company_associations dca1
  JOIN companies c1 ON c1.id = dca1.company_id
  JOIN profiles p ON p.id = c1.owner_id AND p.role = 'dispatch_company'
  JOIN dispatcher_company_associations dca2 ON dca2.dispatcher_id = c1.owner_id
  WHERE dca1.dispatcher_id = dispatcher_user_id
    AND dca1.status = 'active'
    AND dca2.status = 'active';
END;
$$;

-- Create updated SELECT policy using functions to avoid RLS recursion
CREATE POLICY "Users can view drivers from their company"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    -- Owners can view drivers from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Dispatchers can view drivers from companies they're directly associated with
    -- Use function to avoid RLS recursion
    company_id IN (
      SELECT company_id FROM get_dispatcher_company_ids_for_drivers(auth.uid())
    )
    OR
    -- Dispatchers can view drivers from owner companies via dispatch company chain
    -- Use function to avoid RLS recursion
    company_id IN (
      SELECT company_id FROM get_owner_companies_via_dispatch_company(auth.uid())
    )
    OR
    -- Dispatch companies can view drivers from owner companies they're associated with
    (
      company_id IN (
        SELECT company_id FROM get_dispatcher_company_ids_for_drivers(auth.uid())
      )
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role = 'dispatch_company'
      )
    )
    OR
    -- Drivers can view their own driver record (via profile_id)
    profile_id = auth.uid()
    OR
    -- Drivers can view drivers from companies they're actively associated with
    company_id IN (
      SELECT company_id
      FROM driver_company_associations
      WHERE driver_id = auth.uid()
        AND status = 'active'
    )
    OR
    -- Backward compatibility: Check profiles.company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND company_id IS NOT NULL
    )
  );

-- Verify the policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'drivers' 
    AND policyname = 'Users can view drivers from their company'
  ) THEN
    RAISE NOTICE 'RLS policy for drivers table updated successfully with dispatcher support (using functions)';
  ELSE
    RAISE WARNING 'RLS policy for drivers table may not have been updated';
  END IF;
END $$;

