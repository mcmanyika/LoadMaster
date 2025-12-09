-- ⚠️ SAFE MIGRATION: This script does NOT delete any data
-- Fix companies INSERT policy syntax
-- The (select auth.uid()) syntax may not work correctly in WITH CHECK clauses
-- Use direct auth.uid() instead
--
-- SAFETY: This migration only:
-- - Updates RLS policy definitions (no data deletion)
-- - Does NOT delete, truncate, or modify any existing data

-- =====================================================
-- Fix companies INSERT policy
-- =====================================================

-- Drop and recreate with correct syntax
DROP POLICY IF EXISTS "Users can insert their own company" ON companies;
CREATE POLICY "Users can insert their own company"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Also fix UPDATE policy syntax for consistency
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
    AND policyname = 'Users can insert their own company'
  ) THEN
    RAISE NOTICE 'Companies INSERT RLS policy fixed with correct syntax';
  ELSE
    RAISE WARNING 'Companies INSERT RLS policy may not have been created';
  END IF;
END $$;

