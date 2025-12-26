-- Fix loads UPDATE policy to allow dispatchers to update loads
-- The issue: After updating a load, dispatchers can't see the updated row due to RLS
-- This migration updates the UPDATE policy to match the SELECT policy logic

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update loads from their company" ON loads;

-- Create updated UPDATE policy that matches SELECT policy logic
CREATE POLICY "Users can update loads from their company"
  ON loads FOR UPDATE
  TO authenticated
  USING (
    -- 1) Owners and dispatch companies: loads from companies they own
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- 2) Dispatchers and dispatch companies: loads from companies they're directly associated with
    -- NO dispatcher name check - dispatchers can update ALL loads for their associated companies
    company_id IN (
      SELECT company_id
      FROM dispatcher_company_associations
      WHERE dispatcher_id = auth.uid()
        AND status = 'active'
    )
    OR
    -- 3) Dispatchers: loads from owner companies that their dispatch company serves
    company_id IN (
      SELECT dca_owner.company_id
      FROM dispatcher_company_associations dca_dispatcher
      JOIN companies dispatch_co
        ON dispatch_co.id = dca_dispatcher.company_id
      JOIN dispatcher_company_associations dca_owner
        ON dca_owner.dispatcher_id = dispatch_co.owner_id
       AND dca_owner.status = 'active'
      WHERE dca_dispatcher.dispatcher_id = auth.uid()
        AND dca_dispatcher.status = 'active'
    )
    OR
    -- 4) Backward compatibility: profiles.company_id
    company_id IN (
      SELECT company_id
      FROM profiles
      WHERE id = auth.uid()
        AND company_id IS NOT NULL
    )
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK (what the updated row must satisfy)
    -- 1) Owners and dispatch companies: loads from companies they own
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- 2) Dispatchers and dispatch companies: loads from companies they're directly associated with
    company_id IN (
      SELECT company_id
      FROM dispatcher_company_associations
      WHERE dispatcher_id = auth.uid()
        AND status = 'active'
    )
    OR
    -- 3) Dispatchers: loads from owner companies that their dispatch company serves
    company_id IN (
      SELECT dca_owner.company_id
      FROM dispatcher_company_associations dca_dispatcher
      JOIN companies dispatch_co
        ON dispatch_co.id = dca_dispatcher.company_id
      JOIN dispatcher_company_associations dca_owner
        ON dca_owner.dispatcher_id = dispatch_co.owner_id
       AND dca_owner.status = 'active'
      WHERE dca_dispatcher.dispatcher_id = auth.uid()
        AND dca_dispatcher.status = 'active'
    )
    OR
    -- 4) Backward compatibility: profiles.company_id
    company_id IN (
      SELECT company_id
      FROM profiles
      WHERE id = auth.uid()
        AND company_id IS NOT NULL
    )
  );

-- Verify the policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'loads' 
    AND policyname = 'Users can update loads from their company'
  ) THEN
    RAISE NOTICE 'RLS policy for loads UPDATE updated successfully to match SELECT policy';
  ELSE
    RAISE WARNING 'RLS policy for loads UPDATE may not have been updated';
  END IF;
END $$;

