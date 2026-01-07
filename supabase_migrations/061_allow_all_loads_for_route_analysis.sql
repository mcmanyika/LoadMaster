-- Allow all authenticated users to view all loads for Route Analysis
-- This adds an additional condition to the existing RLS policy to enable
-- route analysis to show all loads regardless of company or user type

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view loads from their company" ON loads;

-- Create updated SELECT policy that includes route analysis access
CREATE POLICY "Users can view loads from their company"
  ON loads FOR SELECT
  TO authenticated
  USING (
    -- 1) Owners and dispatch companies: loads from companies they own
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- 2) Dispatch companies: loads from companies they're directly associated with (no dispatcher name filter)
    (
      company_id IN (
        SELECT company_id
        FROM dispatcher_company_associations
        WHERE dispatcher_id = auth.uid()
          AND status = 'active'
      )
      AND
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'dispatch_company'
      )
    )
    OR
    -- 3) Dispatchers: loads from companies they're directly associated with AND dispatcher field matches their name
    (
      company_id IN (
        SELECT company_id
        FROM dispatcher_company_associations
        WHERE dispatcher_id = auth.uid()
          AND status = 'active'
      )
      AND
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'dispatcher'
      )
      AND
      dispatcher = (
        SELECT name FROM profiles WHERE id = auth.uid()
      )
    )
    OR
    -- 4) Dispatchers: loads from owner companies that their dispatch company serves AND dispatcher field matches their name
    (
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
      AND
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'dispatcher'
      )
      AND
      dispatcher = (
        SELECT name FROM profiles WHERE id = auth.uid()
      )
    )
    OR
    -- 5) Backward compatibility: profiles.company_id
    company_id IN (
      SELECT company_id
      FROM profiles
      WHERE id = auth.uid()
        AND company_id IS NOT NULL
    )
    OR
    -- 6) Route Analysis: Allow all authenticated users to view all loads for route analysis
    -- This enables the Route Analysis page to show all loads regardless of company or user type
    TRUE
  );

-- Verify the policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'loads' 
    AND policyname = 'Users can view loads from their company'
  ) THEN
    RAISE NOTICE 'RLS policy for loads table updated successfully - all authenticated users can view all loads for route analysis';
  ELSE
    RAISE WARNING 'RLS policy for loads table may not have been updated';
  END IF;
END $$;

