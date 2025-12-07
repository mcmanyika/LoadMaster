-- Fix RLS policy for companies table to allow dispatchers to view their company
-- Dispatchers need to see company information but cannot edit it
-- IMPORTANT: This migration does NOT delete any data - it only updates RLS policies

-- Ensure profiles.company_id has ON DELETE SET NULL to protect dispatchers
DO $$
DECLARE
  constraint_exists BOOLEAN;
  constraint_action TEXT;
BEGIN
  -- Check if the foreign key constraint exists and what its delete action is
  SELECT EXISTS(
    SELECT 1 
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc 
      ON tc.constraint_name = rc.constraint_name
    WHERE tc.table_name = 'profiles'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND EXISTS (
        SELECT 1 
        FROM information_schema.key_column_usage kcu
        WHERE kcu.constraint_name = tc.constraint_name
        AND kcu.column_name = 'company_id'
      )
  ) INTO constraint_exists;

  IF constraint_exists THEN
    -- Get the current delete rule
    SELECT rc.delete_rule INTO constraint_action
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc 
      ON tc.constraint_name = rc.constraint_name
    WHERE tc.table_name = 'profiles'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND EXISTS (
        SELECT 1 
        FROM information_schema.key_column_usage kcu
        WHERE kcu.constraint_name = tc.constraint_name
        AND kcu.column_name = 'company_id'
      )
    LIMIT 1;

    -- If it's not SET NULL, update it
    IF constraint_action != 'SET NULL' THEN
      RAISE NOTICE 'Updating foreign key constraint to ON DELETE SET NULL to protect dispatchers';
      -- Drop and recreate with SET NULL
      ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_company_id_fkey;
      ALTER TABLE profiles
      ADD CONSTRAINT profiles_company_id_fkey
      FOREIGN KEY (company_id)
      REFERENCES companies(id)
      ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Users can view their company" ON companies;

-- Create updated SELECT policy that allows:
-- 1. Owners to view their own company (by owner_id)
-- 2. Dispatchers to view the company they belong to (by company_id in profiles)
CREATE POLICY "Users can view their company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    -- Owners can view their own company
    (auth.uid() = owner_id)
    OR
    -- Dispatchers can view the company they belong to
    id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND company_id IS NOT NULL
    )
  );

-- Verify the policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'companies' 
    AND policyname = 'Users can view their company'
  ) THEN
    RAISE NOTICE 'SELECT policy for companies table updated successfully';
  ELSE
    RAISE WARNING 'SELECT policy for companies table may not have been created';
  END IF;
END $$;

