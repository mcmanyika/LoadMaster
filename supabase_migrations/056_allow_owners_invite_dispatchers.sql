-- =====================================================
-- ALLOW OWNERS TO INVITE DISPATCHERS
-- Updates dispatcher_company_associations RLS policies to:
-- 1. Allow dispatch companies to invite dispatchers to their own company (existing)
-- 2. Allow owners to invite dispatch companies to their own company (existing)
-- 3. Allow owners to invite dispatchers to their own company (NEW)
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS "Dispatch companies and owners can create invite codes" ON dispatcher_company_associations;

-- Create updated policy that allows:
-- 1. Dispatch companies to invite dispatchers to their own company
-- 2. Owners to invite dispatch companies to their own company  
-- 3. Owners to invite dispatchers to their own company (NEW)
CREATE POLICY "Dispatch companies and owners can create invite codes"
  ON dispatcher_company_associations FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Company must be owned by the user (their own company)
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    AND
    (
      -- User is a dispatch company (inviting dispatchers)
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'dispatch_company'
      )
      OR
      -- User is an owner (can invite both dispatch companies AND dispatchers)
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'owner'
      )
    )
  );

-- Verify the policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'dispatcher_company_associations' 
    AND policyname = 'Dispatch companies and owners can create invite codes'
  ) THEN
    RAISE NOTICE 'RLS policy for dispatcher_company_associations updated successfully - owners and dispatch companies can create invite codes';
  ELSE
    RAISE WARNING 'RLS policy for dispatcher_company_associations may not have been updated';
  END IF;
END $$;

