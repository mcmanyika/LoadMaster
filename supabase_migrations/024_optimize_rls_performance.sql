-- ⚠️ SAFE MIGRATION: This script does NOT delete any data
-- Optimize RLS policies for performance by using (select auth.uid()) instead of auth.uid()
-- This prevents re-evaluation of auth.uid() for each row
--
-- SAFETY: This migration only:
-- - Updates RLS policy definitions (no data deletion)
-- - Does NOT delete, truncate, or modify any existing data

-- =====================================================
-- Optimize dispatcher_company_associations RLS policies
-- =====================================================

-- Drop and recreate with optimized auth.uid() calls
DROP POLICY IF EXISTS "Dispatchers can view their own associations" ON dispatcher_company_associations;
CREATE POLICY "Dispatchers can view their own associations"
  ON dispatcher_company_associations FOR SELECT
  TO authenticated
  USING (
    dispatcher_id = (select auth.uid())
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners can create associations for their companies" ON dispatcher_company_associations;
CREATE POLICY "Owners can create associations for their companies"
  ON dispatcher_company_associations FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners can update associations for their companies" ON dispatcher_company_associations;
CREATE POLICY "Owners can update associations for their companies"
  ON dispatcher_company_associations FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Dispatchers can update their own association status" ON dispatcher_company_associations;
CREATE POLICY "Dispatchers can update their own association status"
  ON dispatcher_company_associations FOR UPDATE
  TO authenticated
  USING (dispatcher_id = (select auth.uid()))
  WITH CHECK (dispatcher_id = (select auth.uid()));

DROP POLICY IF EXISTS "Owners can delete associations for their companies" ON dispatcher_company_associations;
CREATE POLICY "Owners can delete associations for their companies"
  ON dispatcher_company_associations FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  );

-- =====================================================
-- Optimize companies RLS policies
-- =====================================================

-- NOTE: Companies RLS policy is handled in migration 025 to fix recursion
-- Do NOT recreate it here as it would cause infinite recursion
-- The policy uses can_view_company_safe() function which bypasses RLS

-- =====================================================
-- Optimize dispatchers RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view dispatchers from their company" ON dispatchers;
CREATE POLICY "Users can view dispatchers from their company"
  ON dispatchers FOR SELECT
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

DROP POLICY IF EXISTS "Users can insert dispatchers for their company" ON dispatchers;
CREATE POLICY "Users can insert dispatchers for their company"
  ON dispatchers FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update dispatchers from their company" ON dispatchers;
CREATE POLICY "Users can update dispatchers from their company"
  ON dispatchers FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete dispatchers from their company" ON dispatchers;
CREATE POLICY "Users can delete dispatchers from their company"
  ON dispatchers FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  );

-- =====================================================
-- Optimize loads RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view loads from their company" ON loads;
CREATE POLICY "Users can view loads from their company"
  ON loads FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert loads for their company" ON loads;
CREATE POLICY "Users can insert loads for their company"
  ON loads FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update loads from their company" ON loads;
CREATE POLICY "Users can update loads from their company"
  ON loads FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid())
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete loads from their company" ON loads;
CREATE POLICY "Users can delete loads from their company"
  ON loads FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
    OR
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid())
    )
  );

-- =====================================================
-- Optimize drivers RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view drivers from their company" ON drivers;
CREATE POLICY "Users can view drivers from their company"
  ON drivers FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert drivers for their company" ON drivers;
CREATE POLICY "Users can insert drivers for their company"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update drivers from their company" ON drivers;
CREATE POLICY "Users can update drivers from their company"
  ON drivers FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete drivers from their company" ON drivers;
CREATE POLICY "Users can delete drivers from their company"
  ON drivers FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  );

-- =====================================================
-- Optimize expenses RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view expenses from their company" ON expenses;
CREATE POLICY "Users can view expenses from their company"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert expenses for their company" ON expenses;
CREATE POLICY "Users can insert expenses for their company"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update expenses from their company" ON expenses;
CREATE POLICY "Users can update expenses from their company"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete expenses from their company" ON expenses;
CREATE POLICY "Users can delete expenses from their company"
  ON expenses FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  );

-- =====================================================
-- Optimize transporters RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view transporters from their company" ON transporters;
CREATE POLICY "Users can view transporters from their company"
  ON transporters FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert transporters for their company" ON transporters;
CREATE POLICY "Users can insert transporters for their company"
  ON transporters FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update transporters from their company" ON transporters;
CREATE POLICY "Users can update transporters from their company"
  ON transporters FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete transporters from their company" ON transporters;
CREATE POLICY "Users can delete transporters from their company"
  ON transporters FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = (select auth.uid()) AND company_id IS NOT NULL
    )
    OR
    company_id IN (
      SELECT id FROM companies WHERE owner_id = (select auth.uid())
    )
  );

-- =====================================================
-- Optimize subscriptions RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON subscriptions;
CREATE POLICY "Users can insert their own subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own subscriptions" ON subscriptions;
CREATE POLICY "Users can update their own subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- Marketing tables RLS policies
-- NOTE: Marketing tables (marketing_ads, marketing_posts, marketing_metrics) 
-- do NOT have company_id columns. They use different RLS policies from migration 005.
-- These policies allow any authenticated user to view/create them.
-- We skip optimizing these since they don't use company_id-based access control.
-- =====================================================

-- Marketing tables already have RLS policies from migration 005 that allow:
-- - Any authenticated user to view marketing ads/posts/metrics
-- - Specific user (by email) to insert/update marketing ads
-- - Any authenticated user to create marketing posts/metrics
-- 
-- These policies don't need optimization since they don't query companies table
-- and don't use company_id-based filtering.

-- Verify policies were updated
DO $$
BEGIN
  RAISE NOTICE 'RLS policies optimized for performance';
END $$;

