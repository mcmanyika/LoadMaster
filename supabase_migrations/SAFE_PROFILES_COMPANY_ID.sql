-- Safe migration to ensure profiles.company_id has ON DELETE SET NULL
-- This prevents dispatchers from being deleted when companies are modified
-- Run this to ensure the foreign key constraint is safe

-- First, check if the column exists and what its current constraint is
DO $$
DECLARE
  constraint_name TEXT;
  constraint_action TEXT;
BEGIN
  -- Get the current foreign key constraint name and action
  SELECT 
    tc.constraint_name,
    rc.delete_rule
  INTO constraint_name, constraint_action
  FROM information_schema.table_constraints tc
  JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
  WHERE tc.table_name = 'profiles'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND EXISTS (
      SELECT 1 
      FROM information_schema.key_column_usage kcu
      WHERE kcu.constraint_name = tc.constraint_name
      AND kcu.column_name = 'company_id'
    );

  -- If constraint exists and is not SET NULL, we need to update it
  IF constraint_name IS NOT NULL AND constraint_action != 'SET NULL' THEN
    RAISE NOTICE 'Found constraint % with action %. Updating to SET NULL...', constraint_name, constraint_action;
    
    -- Drop the existing constraint
    EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT IF EXISTS %I', constraint_name);
    
    -- Recreate with SET NULL
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_company_id_fkey
    FOREIGN KEY (company_id)
    REFERENCES companies(id)
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Updated constraint to ON DELETE SET NULL';
  ELSIF constraint_name IS NULL THEN
    -- Constraint doesn't exist, create it with SET NULL
    RAISE NOTICE 'No constraint found. Creating with ON DELETE SET NULL...';
    
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_company_id_fkey
    FOREIGN KEY (company_id)
    REFERENCES companies(id)
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Created constraint with ON DELETE SET NULL';
  ELSE
    RAISE NOTICE 'Constraint already has ON DELETE SET NULL. No changes needed.';
  END IF;
END $$;

-- Verify the constraint
SELECT 
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'profiles'
  AND kcu.column_name = 'company_id'
  AND tc.constraint_type = 'FOREIGN KEY';

