-- SQL Patch: Ensure dispatcher profile updates work correctly
-- This patch ensures owners can update dispatcher profiles in their company

-- Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing UPDATE policy if it exists (to allow re-running)
DROP POLICY IF EXISTS "Owners can update dispatcher profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles from their company" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create UPDATE policy to allow owners to update dispatcher profiles
-- This policy allows:
-- 1. Users to update their own profile
-- 2. Owners to update any profile in their company
CREATE POLICY "Users can update profiles from their company"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    -- Users can always update their own profile
    (id = auth.uid())
    OR
    -- Owners can update profiles from their company
    -- Check companies table directly to avoid recursion
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Also allow if user's profile has the same company_id (for dispatchers updating other dispatchers in same company)
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND company_id IS NOT NULL
    )
  )
  WITH CHECK (
    -- Users can always update their own profile
    (id = auth.uid())
    OR
    -- Owners can update profiles from their company
    -- Check companies table directly to avoid recursion
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Also allow if user's profile has the same company_id (for dispatchers updating other dispatchers in same company)
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
    AND tablename = 'profiles' 
    AND policyname = 'Users can update profiles from their company'
  ) THEN
    RAISE NOTICE 'UPDATE policy for profiles created successfully';
  ELSE
    RAISE WARNING 'UPDATE policy for profiles may not have been created';
  END IF;
END $$;

