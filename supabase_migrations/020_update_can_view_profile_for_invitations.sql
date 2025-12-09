-- ⚠️ SAFE MIGRATION: This script does NOT delete any data
-- Update can_view_profile function to allow owners to view dispatcher profiles for invitations
-- This enables the invitation system where owners can search for dispatchers by email
--
-- SAFETY: This migration only:
-- - Updates a function (no data deletion)
-- - Does NOT delete, truncate, or modify any existing data

-- =====================================================
-- Update can_view_profile function to allow owners to view dispatcher profiles
-- =====================================================

CREATE OR REPLACE FUNCTION can_view_profile(profile_id UUID, profile_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  user_company_id UUID;
  is_owner BOOLEAN;
  current_user_role TEXT;
  target_profile_role TEXT;
BEGIN
  current_user_id := auth.uid();
  
  -- Users can always view their own profile (no recursion needed)
  IF profile_id = current_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Get user's company_id and role from profiles (safe because function bypasses RLS)
  SELECT company_id, role INTO user_company_id, current_user_role
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
  IF current_user_role = 'owner' THEN
    -- Get the role of the profile being checked
    SELECT role INTO target_profile_role
    FROM profiles
    WHERE id = profile_id;
    
    -- If the profile being checked is a dispatcher, allow owners to view it
    IF target_profile_role = 'dispatcher' THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the function was updated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'can_view_profile'
  ) THEN
    RAISE NOTICE 'can_view_profile function updated successfully';
  ELSE
    RAISE WARNING 'can_view_profile function may not have been updated';
  END IF;
END $$;

