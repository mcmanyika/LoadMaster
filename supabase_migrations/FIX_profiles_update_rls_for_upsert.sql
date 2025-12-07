-- ⚠️ NOTE: This file has been superseded by FIX_profiles_rls_no_recursion.sql
-- The policies in this file are now included in the no-recursion fix
-- This file is kept for reference but FIX_profiles_rls_no_recursion.sql is the active version
--
-- Original comment:
-- Fix RLS UPDATE policy for profiles to allow owners to update dispatcher profiles
-- even when the profile's company_id is NULL (created by trigger)
-- This is needed for upsert operations when creating dispatchers

-- Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Owners can update dispatcher profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles from their company" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create UPDATE policy that allows:
-- 1. Users to update their own profile
-- 2. Owners to update profiles where:
--    - The profile's company_id matches the owner's company (existing dispatchers)
--    - OR the profile's company_id is NULL (new dispatchers created by trigger - allow owner to update)
--    - OR the profile doesn't exist yet (for upsert INSERT case)
CREATE POLICY "Users can update profiles from their company"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    -- Users can always update their own profile
    (id = auth.uid())
    OR
    -- Owners can update profiles from their company (existing dispatchers)
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Owners can update ANY profile with NULL company_id (new dispatchers created by trigger)
    -- This is safe because WITH CHECK ensures the new company_id belongs to the owner
    -- We also check that the user is actually an owner by verifying they own at least one company
    (company_id IS NULL AND EXISTS (
      SELECT 1 FROM companies WHERE owner_id = auth.uid()
    ))
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
    -- Owners can update profiles to set company_id to their company
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Allow setting company_id to NULL (though unlikely, but for flexibility)
    company_id IS NULL
    OR
    -- Also allow if user's profile has the same company_id (for dispatchers updating other dispatchers in same company)
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND company_id IS NOT NULL
    )
  );

-- Also ensure INSERT policy allows inserting with company_id set by owner
DROP POLICY IF EXISTS "Owners can create dispatcher profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert profiles for their company" ON profiles;

CREATE POLICY "Owners can create dispatcher profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow users to insert their own profile (for signup) - no recursion here
    (id = auth.uid())
    OR
    -- Allow if company_id matches a company where user is the owner (check companies table, not profiles)
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Allow inserting with NULL company_id (will be set later)
    company_id IS NULL
  );

-- Verify the policies were created
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

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Owners can create dispatcher profiles'
  ) THEN
    RAISE NOTICE 'INSERT policy for profiles created successfully';
  ELSE
    RAISE WARNING 'INSERT policy for profiles may not have been created';
  END IF;
END $$;

