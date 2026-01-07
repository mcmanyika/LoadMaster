-- =====================================================
-- ADD SUPERUSER ROLE SUPPORT
-- Updates role constraint to include 'superuser' role
-- Superusers bypass all subscription checks
-- =====================================================

-- Step 1: Drop existing CHECK constraint on the role column
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find the constraint name for role column CHECK constraint
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'profiles'::regclass
    AND contype = 'c'
    AND conkey::text LIKE '%' || (
      SELECT attnum::text 
      FROM pg_attribute 
      WHERE attrelid = 'profiles'::regclass 
        AND attname = 'role'
    ) || '%';
  
  -- Drop the constraint if it exists
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
    RAISE NOTICE 'Dropped existing role constraint: %', constraint_name;
  END IF;
END $$;

-- Step 2: Add CHECK constraint that includes superuser role
DO $$
BEGIN
  -- Check if role column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    -- Add CHECK constraint to allow all valid roles including superuser
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('owner', 'dispatcher', 'driver', 'dispatch_company', 'superuser'));
    
    RAISE NOTICE 'Added role constraint to include superuser';
  ELSE
    RAISE WARNING 'Role column not found in profiles table';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Role constraint already exists with correct values';
END $$;

-- Step 3: Add comment explaining superuser role
COMMENT ON COLUMN profiles.role IS 'User role: owner, dispatcher, driver, dispatch_company, or superuser. Superusers bypass all subscription access checks.';

