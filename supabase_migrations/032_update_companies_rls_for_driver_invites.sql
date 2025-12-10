-- ⚠️ SAFE MIGRATION: This script does NOT delete any data
-- Update companies RLS to allow drivers to view companies with pending invite codes
-- Drivers need to be able to look up codes before joining
--
-- SAFETY: This migration only:
-- - Updates RLS policies (no data deletion)
-- - Does NOT delete, truncate, or modify any existing data

-- =====================================================
-- Update Companies RLS for Driver Invite Codes
-- =====================================================

-- Add policy to allow viewing companies that have pending driver invite codes
-- This ensures drivers can see company names when looking up codes
DROP POLICY IF EXISTS "Drivers can view companies with invite codes" ON companies;

CREATE POLICY "Drivers can view companies with invite codes"
  ON companies FOR SELECT
  TO authenticated
  USING (
    -- Allow viewing if there's a pending driver invite code for this company
    id IN (
      SELECT company_id 
      FROM driver_company_associations 
      WHERE invite_code IS NOT NULL 
      AND driver_id IS NULL 
      AND status = 'pending'
    )
  );

-- Update can_view_company_by_association function to include driver associations
-- Create or replace the function directly (it should already exist from migration 019)
CREATE OR REPLACE FUNCTION can_view_company_by_association(company_id_param UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  current_user_id UUID;
  is_owner BOOLEAN;
  has_active_association BOOLEAN;
  has_pending_invite_code BOOLEAN;
  user_company_id UUID;
  user_role TEXT;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is owner
  SELECT owner_id = current_user_id INTO is_owner
  FROM companies
  WHERE id = company_id_param;
  
  IF is_owner THEN
    RETURN TRUE;
  END IF;
  
  -- Get user's role and company_id from profiles
  SELECT role, company_id INTO user_role, user_company_id
  FROM profiles
  WHERE id = current_user_id;
  
  -- Check dispatcher associations
  SELECT EXISTS(
    SELECT 1
    FROM dispatcher_company_associations
    WHERE company_id = company_id_param
    AND dispatcher_id = current_user_id
    AND status = 'active'
  ) INTO has_active_association;
  
  IF has_active_association THEN
    RETURN TRUE;
  END IF;
  
  -- Check driver associations
  SELECT EXISTS(
    SELECT 1
    FROM driver_company_associations
    WHERE company_id = company_id_param
    AND driver_id = current_user_id
    AND status = 'active'
  ) INTO has_active_association;
  
  IF has_active_association THEN
    RETURN TRUE;
  END IF;
  
  -- Check for pending dispatcher invite codes
  SELECT EXISTS(
    SELECT 1
    FROM dispatcher_company_associations
    WHERE company_id = company_id_param
    AND invite_code IS NOT NULL
    AND dispatcher_id IS NULL
    AND status = 'pending'
  ) INTO has_pending_invite_code;
  
  IF has_pending_invite_code AND user_role = 'dispatcher' THEN
    RETURN TRUE;
  END IF;
  
  -- Check for pending driver invite codes
  SELECT EXISTS(
    SELECT 1
    FROM driver_company_associations
    WHERE company_id = company_id_param
    AND invite_code IS NOT NULL
    AND driver_id IS NULL
    AND status = 'pending'
  ) INTO has_pending_invite_code;
  
  IF has_pending_invite_code AND user_role = 'driver' THEN
    RETURN TRUE;
  END IF;
  
  -- Backward compatibility: check profiles.company_id
  IF user_company_id = company_id_param THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$function$ LANGUAGE plpgsql;

-- Verify policies were created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'companies' 
    AND policyname = 'Drivers can view companies with invite codes'
  ) THEN
    RAISE NOTICE 'RLS policy for companies with driver invite codes created successfully';
  ELSE
    RAISE WARNING 'RLS policy for companies may not have been created';
  END IF;
END $$;

