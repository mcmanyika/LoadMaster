-- Fix RLS policies for loads table to support dispatchers viewing their assigned loads
-- This migration restores the dispatcher association check that was removed in 024_optimize_rls_performance.sql
-- and adds filtering by dispatcher name so dispatchers only see loads assigned to them

-- =====================================================
-- Update Loads Table RLS Policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view loads from their company" ON loads;
DROP POLICY IF EXISTS "Users can insert loads for their company" ON loads;
DROP POLICY IF EXISTS "Users can update loads from their company" ON loads;
DROP POLICY IF EXISTS "Users can delete loads from their company" ON loads;

-- Users can view loads from their company
-- Owners: Can view all loads from their companies
-- Dispatchers: Can view loads from companies they're associated with AND where dispatcher field matches their name
CREATE POLICY "Users can view loads from their company"
  ON loads FOR SELECT
  TO authenticated
  USING (
    -- Owners can view loads from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatchers can view loads from companies they're associated with
    -- AND where the dispatcher field matches their name
    (
      company_id IN (
        SELECT company_id 
        FROM dispatcher_company_associations 
        WHERE dispatcher_id = (select auth.uid()) 
        AND status = 'active'
      )
      AND
      dispatcher = (
        SELECT name FROM profiles WHERE id = (select auth.uid())
      )
    )
    OR
    -- Backward compatibility: Check profiles.company_id (for users with direct company_id)
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  );

-- Users can insert loads for their company
CREATE POLICY "Users can insert loads for their company"
  ON loads FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Owners can insert loads for their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatchers can insert loads for companies they're associated with
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = (select auth.uid()) 
      AND status = 'active'
    )
    OR
    -- Backward compatibility: Check profiles.company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  );

-- Users can update loads from their company
CREATE POLICY "Users can update loads from their company"
  ON loads FOR UPDATE
  TO authenticated
  USING (
    -- Owners can update loads from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatchers can update loads from companies they're associated with
    -- AND where the dispatcher field matches their name
    (
      company_id IN (
        SELECT company_id 
        FROM dispatcher_company_associations 
        WHERE dispatcher_id = (select auth.uid()) 
        AND status = 'active'
      )
      AND
      dispatcher = (
        SELECT name FROM profiles WHERE id = (select auth.uid())
      )
    )
    OR
    -- Backward compatibility: Check profiles.company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  )
  WITH CHECK (
    -- Owners can update loads from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatchers can update loads for companies they're associated with
    company_id IN (
      SELECT company_id 
      FROM dispatcher_company_associations 
      WHERE dispatcher_id = (select auth.uid()) 
      AND status = 'active'
    )
    OR
    -- Backward compatibility: Check profiles.company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  );

-- Users can delete loads from their company
CREATE POLICY "Users can delete loads from their company"
  ON loads FOR DELETE
  TO authenticated
  USING (
    -- Owners can delete loads from their companies
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    -- Dispatchers can delete loads from companies they're associated with
    -- AND where the dispatcher field matches their name
    (
      company_id IN (
        SELECT company_id 
        FROM dispatcher_company_associations 
        WHERE dispatcher_id = (select auth.uid()) 
        AND status = 'active'
      )
      AND
      dispatcher = (
        SELECT name FROM profiles WHERE id = (select auth.uid())
      )
    )
    OR
    -- Backward compatibility: Check profiles.company_id
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
  );

-- Verify the policies were created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'loads' 
    AND policyname = 'Users can view loads from their company'
  ) THEN
    RAISE NOTICE 'RLS policies for loads table updated successfully';
  ELSE
    RAISE WARNING 'RLS policies for loads table may not have been created';
  END IF;
END $$;

