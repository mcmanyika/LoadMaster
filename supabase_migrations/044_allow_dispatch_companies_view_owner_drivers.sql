-- Allow dispatch companies to view drivers from owner companies they're associated with
-- This is needed for dispatch companies to see drivers when creating/editing loads
--
-- Update drivers table RLS policy to include dispatch company support

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view drivers from their company" ON drivers;

-- Create updated SELECT policy that includes dispatch companies
CREATE POLICY "Users can view drivers from their company"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    -- Owners can view drivers from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatchers can view drivers from companies they're actively associated with
    company_id IN (
      SELECT company_id
      FROM dispatcher_company_associations
      WHERE dispatcher_id = (select auth.uid())
      AND status = 'active'
    )
    OR
    -- Dispatch companies can view drivers from owner companies they're associated with
    -- A dispatch company is associated with an owner company via dispatcher_company_associations
    -- where the dispatch company's profile ID is the dispatcher_id
    company_id IN (
      SELECT company_id
      FROM dispatcher_company_associations
      WHERE dispatcher_id = (select auth.uid())
      AND status = 'active'
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = (select auth.uid())
        AND role = 'dispatch_company'
      )
    )
    OR
    -- Drivers can view their own driver record (via profile_id)
    profile_id = (select auth.uid())
    OR
    -- Drivers can view drivers from companies they're actively associated with
    company_id IN (
      SELECT company_id
      FROM driver_company_associations
      WHERE driver_id = (select auth.uid())
      AND status = 'active'
    )
    OR
    -- Backward compatibility: Check profiles.company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
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
    RAISE NOTICE 'RLS policy for drivers table updated successfully with dispatch_company support';
  ELSE
    RAISE WARNING 'RLS policy for drivers table may not have been updated';
  END IF;
END $$;

