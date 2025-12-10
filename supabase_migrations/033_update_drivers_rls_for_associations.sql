-- ⚠️ SAFE MIGRATION: This script does NOT delete any data
-- Update drivers table RLS to allow drivers to view their own driver record via profile_id
-- and owners to view drivers associated with their companies via associations
--
-- SAFETY: This migration only:
-- - Updates RLS policies (no data deletion)
-- - Does NOT delete, truncate, or modify any existing data

-- =====================================================
-- Update Drivers Table RLS
-- =====================================================

-- Drop existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Users can view drivers from their company" ON drivers;
DROP POLICY IF EXISTS "Users can insert drivers for their company" ON drivers;
DROP POLICY IF EXISTS "Users can update drivers from their company" ON drivers;
DROP POLICY IF EXISTS "Users can delete drivers from their company" ON drivers;

-- Users can view drivers from their company
CREATE POLICY "Users can view drivers from their company"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    -- Owners can view drivers from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatchers can view drivers from companies they're actively associated with
    company_id IN (
      SELECT company_id
      FROM dispatcher_company_associations
      WHERE dispatcher_id = (select auth.uid())
      AND status = 'active'
    )
    OR
    -- Drivers can view their own driver record (via profile_id)
    profile_id = (select auth.uid())
    OR
    -- Drivers can view drivers from companies they're actively associated with
    company_id IN (
      SELECT company_id
      FROM driver_company_associations
      WHERE driver_id = (select auth.uid())
      AND status = 'active'
    )
    OR
    -- Backward compatibility: Check profiles.company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  );

-- Users can insert drivers for their company
CREATE POLICY "Users can insert drivers for their company"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    company_id IN (
      SELECT company_id
      FROM dispatcher_company_associations
      WHERE dispatcher_id = (select auth.uid())
      AND status = 'active'
    )
    OR
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  );

-- Users can update drivers from their company
CREATE POLICY "Users can update drivers from their company"
  ON drivers FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    company_id IN (
      SELECT company_id
      FROM dispatcher_company_associations
      WHERE dispatcher_id = (select auth.uid())
      AND status = 'active'
    )
    OR
    -- Drivers can update their own driver record
    profile_id = (select auth.uid())
    OR
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    company_id IN (
      SELECT company_id
      FROM dispatcher_company_associations
      WHERE dispatcher_id = (select auth.uid())
      AND status = 'active'
    )
    OR
    -- Drivers can update their own driver record
    profile_id = (select auth.uid())
    OR
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  );

-- Users can delete drivers from their company
CREATE POLICY "Users can delete drivers from their company"
  ON drivers FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    company_id IN (
      SELECT company_id
      FROM dispatcher_company_associations
      WHERE dispatcher_id = (select auth.uid())
      AND status = 'active'
    )
    OR
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  );

-- Verify policies were created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'drivers'
    AND policyname = 'Users can view drivers from their company'
  ) THEN
    RAISE NOTICE 'RLS policies for drivers table updated successfully';
  ELSE
    RAISE WARNING 'RLS policies for drivers table may not have been created';
  END IF;
END $$;

