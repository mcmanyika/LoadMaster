-- Allow dispatchers to view associations for companies they're associated with
-- This is needed for the RLS chain query in loads table to work
-- The chain query needs to read dca_owner (associations where dispatch company is dispatcher)
-- If dispatchers can't read those associations, the chain breaks

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Dispatchers can view associations for their companies" ON dispatcher_company_associations;

-- Create new SELECT policy for dispatchers
CREATE POLICY "Dispatchers can view associations for their companies"
  ON dispatcher_company_associations FOR SELECT
  TO authenticated
  USING (
    -- Dispatchers can view associations for companies they're associated with
    -- This allows them to see which owner companies their dispatch company works with
    company_id IN (
      SELECT company_id
      FROM dispatcher_company_associations
      WHERE dispatcher_id = auth.uid()
        AND status = 'active'
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
    RAISE NOTICE 'RLS policy for dispatcher_company_associations updated successfully';
  ELSE
    RAISE WARNING 'RLS policy for dispatcher_company_associations may not have been created';
  END IF;
END $$;

