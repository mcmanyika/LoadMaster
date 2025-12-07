-- Fix SELECT policy for profiles table to ensure users can view their own profile
-- This is critical - without this, getCompany() fails because it can't fetch the user's profile

-- Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view profiles from their company" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create a simple, direct SELECT policy that allows:
-- 1. Users to ALWAYS view their own profile (by id = auth.uid())
-- 2. Users to view profiles from their company (via company_id)
-- 3. Owners to view profiles from their company (via companies.owner_id)

CREATE POLICY "Users can view profiles from their company"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Users can ALWAYS view their own profile (this is critical!)
    (id = auth.uid())
    OR
    -- Users can view profiles from the same company (via company_id)
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND company_id IS NOT NULL
    )
    OR
    -- Owners can view profiles from their company (check companies table directly)
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
    AND tablename = 'profiles' 
    AND policyname = 'Users can view profiles from their company'
  ) THEN
    RAISE NOTICE 'SELECT policy for profiles table created successfully';
  ELSE
    RAISE WARNING 'SELECT policy for profiles table may not have been created';
  END IF;
END $$;

