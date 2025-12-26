-- Fix driver_company_associations SELECT policy to allow dispatchers to view associations
-- for owner companies via dispatch company chain
-- This matches the logic in migration 051 for the drivers table

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Drivers can view their own associations" ON driver_company_associations;

-- Create updated SELECT policy that allows dispatchers to view associations via dispatch company chain
CREATE POLICY "Drivers can view their own associations"
  ON driver_company_associations FOR SELECT
  TO authenticated
  USING (
    -- Drivers can view their own associations
    driver_id = auth.uid()
    OR
    -- Owners can view associations for their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Dispatchers can view associations for companies they're directly associated with
    -- Use SECURITY DEFINER function to avoid RLS recursion (same function as used in drivers table)
    company_id IN (
      SELECT company_id FROM get_dispatcher_company_ids_for_drivers(auth.uid())
    )
    OR
    -- Dispatchers can view associations for owner companies via dispatch company chain
    -- Use SECURITY DEFINER function to avoid RLS recursion (same function as used in drivers table)
    company_id IN (
      SELECT company_id FROM get_owner_companies_via_dispatch_company(auth.uid())
    )
    OR
    -- Dispatch companies can view associations for owner companies they're associated with
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
    AND tablename = 'driver_company_associations' 
    AND policyname = 'Drivers can view their own associations'
  ) THEN
    RAISE NOTICE 'RLS policy for driver_company_associations updated successfully to allow dispatchers via dispatch company chain';
  ELSE
    RAISE WARNING 'RLS policy for driver_company_associations may not have been updated';
  END IF;
END $$;

