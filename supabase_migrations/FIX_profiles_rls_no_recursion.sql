-- ⚠️ CRITICAL FIX: Infinite recursion in profiles RLS policies
-- ⚠️ DO NOT OVERWRITE THIS FIX - This is the definitive solution
-- ⚠️ SAFE MIGRATION: This script does NOT delete any data - only modifies RLS policies
-- 
-- This migration replaces any policies that query profiles table within profiles policies
-- Uses SECURITY DEFINER functions and direct companies table queries to avoid recursion
--
-- IMPORTANT: If you need to modify profiles RLS policies:
-- 1. NEVER query profiles table within a profiles policy (causes infinite recursion)
-- 2. Use SECURITY DEFINER functions for SELECT policies
-- 3. Query companies table directly for INSERT/UPDATE policies
-- 4. See README_RLS_NO_RECURSION.md for patterns
--
-- SAFETY: This migration only:
-- - Drops and recreates RLS policies (no data loss)
-- - Creates/updates functions (no data loss)
-- - Does NOT delete, truncate, or modify any table data

-- Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view profiles from their company" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Owners can update dispatcher profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles from their company" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Owners can create dispatcher profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert profiles for their company" ON profiles;

-- =====================================================
-- STEP 1: Create SECURITY DEFINER function for SELECT
-- =====================================================
-- This function bypasses RLS, so it can safely query profiles
CREATE OR REPLACE FUNCTION can_view_profile(profile_id UUID, profile_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  user_company_id UUID;
  is_owner BOOLEAN;
  profile_role TEXT;
BEGIN
  current_user_id := auth.uid();
  
  -- Users can always view their own profile (no recursion needed)
  IF profile_id = current_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Get user's company_id and role from profiles (safe because function bypasses RLS)
  SELECT company_id, role INTO user_company_id, profile_role
  FROM profiles
  WHERE id = current_user_id;
  
  -- If same company, allow
  IF user_company_id IS NOT NULL AND profile_company_id = user_company_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is owner of the company (query companies table directly)
  SELECT EXISTS(
    SELECT 1 FROM companies 
    WHERE id = profile_company_id AND owner_id = current_user_id
  ) INTO is_owner;
  
  IF is_owner THEN
    RETURN TRUE;
  END IF;
  
  -- Allow owners to view dispatcher profiles for invitation purposes
  -- This allows owners to search for dispatchers to invite them
  IF profile_role = 'owner' THEN
    -- Get the profile being checked
    SELECT role INTO profile_role
    FROM profiles
    WHERE id = profile_id;
    
    -- If the profile being checked is a dispatcher, allow owners to view it
    IF profile_role = 'dispatcher' THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 2: Create SELECT policy using the function
-- =====================================================
CREATE POLICY "Users can view profiles from their company"
  ON profiles FOR SELECT
  TO authenticated
  USING (can_view_profile(id, company_id));

-- =====================================================
-- STEP 3: Create INSERT policy (no recursion - direct checks)
-- =====================================================
CREATE POLICY "Owners can create dispatcher profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow users to insert their own profile (for signup) - no recursion
    (id = auth.uid())
    OR
    -- Allow if company_id matches a company where user is the owner (check companies table directly)
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Allow inserting with NULL company_id (will be set later)
    company_id IS NULL
  );

-- =====================================================
-- STEP 4: Create UPDATE policy (no recursion - direct checks)
-- =====================================================
CREATE POLICY "Users can update profiles from their company"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    -- Users can always update their own profile
    (id = auth.uid())
    OR
    -- Owners can update profiles from their company (check companies table directly)
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- Allow updating profiles with NULL company_id (for upsert operations)
    (company_id IS NULL AND EXISTS (
      SELECT 1 FROM companies WHERE owner_id = auth.uid()
    ))
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
  );

-- =====================================================
-- STEP 5: Verify policies were created
-- =====================================================
DO $$
DECLARE
  select_policy_exists BOOLEAN;
  insert_policy_exists BOOLEAN;
  update_policy_exists BOOLEAN;
BEGIN
  -- Check SELECT policy
  SELECT EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can view profiles from their company'
  ) INTO select_policy_exists;

  -- Check INSERT policy
  SELECT EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Owners can create dispatcher profiles'
  ) INTO insert_policy_exists;

  -- Check UPDATE policy
  SELECT EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can update profiles from their company'
  ) INTO update_policy_exists;

  IF select_policy_exists THEN
    RAISE NOTICE 'SELECT policy for profiles created successfully (no recursion)';
  ELSE
    RAISE WARNING 'SELECT policy for profiles may not have been created';
  END IF;

  IF insert_policy_exists THEN
    RAISE NOTICE 'INSERT policy for profiles created successfully (no recursion)';
  ELSE
    RAISE WARNING 'INSERT policy for profiles may not have been created';
  END IF;

  IF update_policy_exists THEN
    RAISE NOTICE 'UPDATE policy for profiles created successfully (no recursion)';
  ELSE
    RAISE WARNING 'UPDATE policy for profiles may not have been created';
  END IF;
END $$;

-- =====================================================
-- Summary
-- =====================================================
-- This migration fixes infinite recursion by:
-- 1. Using SECURITY DEFINER function for SELECT (bypasses RLS safely)
-- 2. Querying companies table directly in INSERT/UPDATE policies (not profiles)
-- 3. Using direct id = auth.uid() checks where possible (no subqueries)
-- 4. Allowing NULL company_id for flexibility in upsert operations

