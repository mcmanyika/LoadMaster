-- Allow dispatchers to view driver associations for companies they're associated with
-- This is needed for dispatchers to see driver names in the LoadForm dropdown

-- Update the SELECT policy to include dispatchers
DROP POLICY IF EXISTS "Drivers can view their own associations" ON driver_company_associations;

CREATE POLICY "Drivers can view their own associations"
  ON driver_company_associations FOR SELECT
  TO authenticated
  USING (
    driver_id = auth.uid()
    OR
    -- Owners can view associations for their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Dispatchers can view associations for companies they're actively associated with
    company_id IN (
      SELECT company_id
      FROM dispatcher_company_associations
      WHERE dispatcher_id = auth.uid()
      AND status = 'active'
    )
  );

-- Verify the policy was updated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'driver_company_associations'
    AND policyname = 'Drivers can view their own associations'
  ) THEN
    RAISE NOTICE 'RLS policy for driver_company_associations updated successfully to allow dispatchers';
  ELSE
    RAISE WARNING 'RLS policy for driver_company_associations may not have been updated';
  END IF;
END $$;

