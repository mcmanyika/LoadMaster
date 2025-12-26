-- Allow dispatchers to view drivers from owner companies
-- This handles the case where:
-- 1. A dispatcher is associated with a dispatch company's own company
-- 2. That dispatch company is associated with an owner company
-- 3. The drivers are in the owner company
-- The dispatcher should be able to view those drivers
--
-- Update drivers table RLS policy to include this indirect access

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view drivers from their company" ON drivers;

-- Create updated SELECT policy that includes dispatcher -> dispatch company -> owner company chain
CREATE POLICY "Users can view drivers from their company"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    -- Owners can view drivers from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatchers can view drivers from companies they're directly associated with
    company_id IN (
      SELECT company_id
      FROM dispatcher_company_associations
      WHERE dispatcher_id = (select auth.uid())
      AND status = 'active'
    )
    OR
    -- Dispatchers can view drivers from owner companies when:
    -- 1. Dispatcher is associated with a dispatch company's own company
    -- 2. That dispatch company is associated with an owner company
    -- 3. Drivers are in that owner company
    company_id IN (
      SELECT dca2.company_id
      FROM dispatcher_company_associations dca1
      JOIN companies c1 ON c1.id = dca1.company_id
      JOIN profiles p ON p.id = c1.owner_id AND p.role = 'dispatch_company'
      JOIN dispatcher_company_associations dca2 ON dca2.dispatcher_id = c1.owner_id
      WHERE dca1.dispatcher_id = (select auth.uid())
      AND dca1.status = 'active'
      AND dca2.status = 'active'
    )
    OR
    -- Dispatch companies can view drivers from owner companies they're associated with
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
    RAISE NOTICE 'RLS policy for drivers table updated successfully with dispatcher indirect access';
  ELSE
    RAISE WARNING 'RLS policy for drivers table may not have been updated';
  END IF;
END $$;

