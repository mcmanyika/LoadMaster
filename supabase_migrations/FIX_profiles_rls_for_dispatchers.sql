-- Fix RLS policy for profiles table to allow owners to create dispatcher profiles
-- This allows owners to insert profiles for dispatchers in their company
-- NOTE: We avoid querying profiles table in policies to prevent recursion

-- Check if RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Owners can create dispatcher profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert profiles for their company" ON profiles;

-- Create policy to allow owners to insert dispatcher profiles for their company
-- We check companies table directly to avoid recursion
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
  );

-- Also ensure owners can view profiles from their company
-- Use SECURITY DEFINER function to avoid recursion
DROP POLICY IF EXISTS "Users can view profiles from their company" ON profiles;

-- Create a function to check if user can view a profile (avoids recursion)
CREATE OR REPLACE FUNCTION can_view_profile(profile_id UUID, profile_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  user_company_id UUID;
  is_owner BOOLEAN;
BEGIN
  current_user_id := auth.uid();
  
  -- Users can always view their own profile
  IF profile_id = current_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Get user's company_id from profiles (this is safe as it's in a function)
  SELECT company_id INTO user_company_id
  FROM profiles
  WHERE id = current_user_id;
  
  -- If same company, allow
  IF user_company_id IS NOT NULL AND profile_company_id = user_company_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is owner of the company
  SELECT EXISTS(
    SELECT 1 FROM companies 
    WHERE id = profile_company_id AND owner_id = current_user_id
  ) INTO is_owner;
  
  RETURN is_owner;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Users can view profiles from their company"
  ON profiles FOR SELECT
  TO authenticated
  USING (can_view_profile(id, company_id));

-- Add UPDATE policy to allow owners to update dispatcher profiles
DROP POLICY IF EXISTS "Owners can update dispatcher profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles from their company" ON profiles;

CREATE POLICY "Owners can update dispatcher profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    -- Users can update their own profile
    (id = auth.uid())
    OR
    -- Owners can update profiles from their company (check companies table, not profiles)
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Users can update their own profile
    (id = auth.uid())
    OR
    -- Owners can update profiles from their company (check companies table, not profiles)
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

