-- ⚠️ SAFE MIGRATION: This script does NOT delete any data
-- Fix infinite recursion in companies RLS policy
-- 
-- THE PROBLEM:
-- 1. Companies RLS uses can_view_company_by_association() which queries companies → recursion
-- 2. Companies RLS queries dispatcher_company_associations, which RLS queries companies → recursion
--
-- THE SOLUTION:
-- Use a SECURITY DEFINER function that bypasses RLS to break the cycle
--
-- SAFETY: This migration only:
-- - Updates RLS policy definitions (no data deletion)
-- - Does NOT delete, truncate, or modify any existing data

-- =====================================================
-- Create SECURITY DEFINER function that bypasses RLS
-- =====================================================

CREATE OR REPLACE FUNCTION can_view_company_safe(company_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Check ownership (bypasses RLS because function is SECURITY DEFINER)
  IF EXISTS (
    SELECT 1 
    FROM companies 
    WHERE id = company_id_param 
    AND owner_id = current_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check active association (bypasses RLS)
  IF EXISTS (
    SELECT 1 
    FROM dispatcher_company_associations 
    WHERE dispatcher_id = current_user_id 
    AND company_id = company_id_param
    AND status = 'active'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check profile company_id (bypasses RLS)
  IF EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = current_user_id
    AND company_id = company_id_param
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- =====================================================
-- Fix companies RLS policy to use the safe function
-- =====================================================

DROP POLICY IF EXISTS "Users can view their company" ON companies;

CREATE POLICY "Users can view their company"
  ON companies FOR SELECT
  TO authenticated
  USING (can_view_company_safe(id));

-- =====================================================
-- Also fix dispatcher_company_associations RLS to not query companies
-- This breaks the recursion cycle from the other direction
-- =====================================================

-- Create a SECURITY DEFINER function to check if user owns a company
CREATE OR REPLACE FUNCTION user_owns_company(company_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM companies 
    WHERE id = company_id_param 
    AND owner_id = auth.uid()
  );
END;
$$;

-- Update dispatcher_company_associations RLS to use the function
DROP POLICY IF EXISTS "Dispatchers can view their own associations" ON dispatcher_company_associations;
CREATE POLICY "Dispatchers can view their own associations"
  ON dispatcher_company_associations FOR SELECT
  TO authenticated
  USING (
    dispatcher_id = (select auth.uid())
    OR
    -- Use SECURITY DEFINER function instead of direct query to avoid recursion
    user_owns_company(company_id)
  );

-- Update other dispatcher_company_associations policies that query companies
DROP POLICY IF EXISTS "Owners can create associations for their companies" ON dispatcher_company_associations;
CREATE POLICY "Owners can create associations for their companies"
  ON dispatcher_company_associations FOR INSERT
  TO authenticated
  WITH CHECK (user_owns_company(company_id));

DROP POLICY IF EXISTS "Owners can update associations for their companies" ON dispatcher_company_associations;
CREATE POLICY "Owners can update associations for their companies"
  ON dispatcher_company_associations FOR UPDATE
  TO authenticated
  USING (user_owns_company(company_id))
  WITH CHECK (user_owns_company(company_id));

DROP POLICY IF EXISTS "Owners can delete associations for their companies" ON dispatcher_company_associations;
CREATE POLICY "Owners can delete associations for their companies"
  ON dispatcher_company_associations FOR DELETE
  TO authenticated
  USING (user_owns_company(company_id));

-- =====================================================
-- Ensure INSERT and UPDATE policies exist
-- =====================================================

-- INSERT policy: Users can insert their own company
DROP POLICY IF EXISTS "Users can insert their own company" ON companies;
CREATE POLICY "Users can insert their own company"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- UPDATE policy: Users can update their own company
DROP POLICY IF EXISTS "Users can update their own company" ON companies;
CREATE POLICY "Users can update their own company"
  ON companies FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Verify policies were created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'companies' 
    AND policyname = 'Users can view their company'
  ) THEN
    RAISE NOTICE 'Companies SELECT RLS policy fixed - recursion resolved using SECURITY DEFINER function';
  ELSE
    RAISE WARNING 'Companies SELECT RLS policy may not have been created';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'companies' 
    AND policyname = 'Users can insert their own company'
  ) THEN
    RAISE NOTICE 'Companies INSERT RLS policy created';
  ELSE
    RAISE WARNING 'Companies INSERT RLS policy may not have been created';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'companies' 
    AND policyname = 'Users can update their own company'
  ) THEN
    RAISE NOTICE 'Companies UPDATE RLS policy created';
  ELSE
    RAISE WARNING 'Companies UPDATE RLS policy may not have been created';
  END IF;
END $$;

