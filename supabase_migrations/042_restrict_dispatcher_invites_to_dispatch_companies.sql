-- =====================================================
-- RESTRICT DISPATCHER INVITES TO DISPATCH COMPANIES ONLY
-- Updates dispatcher_company_associations RLS policies to only allow
-- dispatch companies (not owners) to create dispatcher invite codes
-- =====================================================

-- Drop existing policy that allows owners to create associations
DROP POLICY IF EXISTS "Owners can create associations for their companies" ON dispatcher_company_associations;

-- Only dispatch companies can create dispatcher invite codes
-- Dispatch companies can create invite codes for their own company
CREATE POLICY "Dispatch companies can create dispatcher invite codes"
  ON dispatcher_company_associations FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only allow if user is a dispatch company
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'dispatch_company'
    )
    AND
    -- Company must be owned by the dispatch company (their own company)
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- Verify the policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'dispatcher_company_associations' 
    AND policyname = 'Dispatch companies can create dispatcher invite codes'
  ) THEN
    RAISE NOTICE 'RLS policy for dispatcher_company_associations updated successfully - only dispatch companies can create invite codes';
  ELSE
    RAISE WARNING 'RLS policy for dispatcher_company_associations may not have been updated';
  END IF;
END $$;

