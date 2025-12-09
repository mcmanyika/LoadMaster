-- ⚠️ SAFE MIGRATION: This script does NOT delete any data
-- Fix can_view_profile function to allow owners to view dispatcher profiles
-- that are associated with their companies via dispatcher_company_associations
--
-- THE PROBLEM:
-- When querying dispatcher profiles by ID list, the RLS policy uses can_view_profile()
-- which checks profiles.company_id. But dispatchers associated via junction table
-- might have company_id = NULL in profiles table, causing the check to fail.
--
-- THE SOLUTION:
-- Update can_view_profile to also check dispatcher_company_associations table
-- to see if the dispatcher is associated with a company owned by the current user
--
-- SAFETY: This migration only:
-- - Updates function definition (no data deletion)
-- - Does NOT delete, truncate, or modify any existing data

-- =====================================================
-- Update can_view_profile function to check associations
-- =====================================================

CREATE OR REPLACE FUNCTION can_view_profile(profile_id UUID, profile_company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id UUID;
  user_company_id UUID;
  is_owner BOOLEAN;
  target_profile_role TEXT;
  has_association BOOLEAN;
BEGIN
  current_user_id := auth.uid();

  -- Users can always view their own profile
  IF profile_id = current_user_id THEN
    RETURN TRUE;
  END IF;

  -- Get user's company_id from profiles (safe because function bypasses RLS)
  SELECT company_id INTO user_company_id
  FROM profiles
  WHERE id = current_user_id;

  -- If same company_id in profiles table, allow
  IF user_company_id IS NOT NULL AND profile_company_id = user_company_id THEN
    RETURN TRUE;
  END IF;

  -- Check if current user is an owner
  SELECT EXISTS(
    SELECT 1 FROM companies
    WHERE owner_id = current_user_id
  ) INTO is_owner;

  IF is_owner THEN
    -- If current user is an owner, check if they own the company in the profile
    IF profile_company_id IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM companies
        WHERE id = profile_company_id AND owner_id = current_user_id
      ) INTO is_owner;

      IF is_owner THEN
        RETURN TRUE;
      END IF;
    END IF;

    -- Also check if the dispatcher is associated with any company owned by the current user
    -- This handles cases where dispatcher has company_id = NULL but is associated via junction table
    SELECT EXISTS(
      SELECT 1 
      FROM dispatcher_company_associations dca
      JOIN companies c ON c.id = dca.company_id
      WHERE dca.dispatcher_id = profile_id
      AND c.owner_id = current_user_id
      AND dca.status = 'active'
    ) INTO has_association;

    IF has_association THEN
      RETURN TRUE;
    END IF;

    -- Allow owners to view any dispatcher profile (for invitation purposes)
    -- This is for the invitation system where an owner needs to find a dispatcher by email
    SELECT role INTO target_profile_role
    FROM profiles
    WHERE id = profile_id;

    IF target_profile_role = 'dispatcher' THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- Verify function was updated
DO $$
BEGIN
  RAISE NOTICE 'can_view_profile function updated to check dispatcher_company_associations';
END $$;

