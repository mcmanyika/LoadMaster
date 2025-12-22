-- =====================================================
-- ADD DISPATCH COMPANY ROLE SUPPORT
-- Updates RLS policies and functions to support dispatch_company role
-- =====================================================

-- Step 1: Update companies table comment to reflect both owner and dispatch_company roles
COMMENT ON TABLE companies IS 'Companies table for multi-tenancy - one company per owner or dispatch_company';

-- Step 2: Check and update role column constraint in profiles table if it exists
-- First, drop any existing CHECK constraint on the role column
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

-- Step 3: Add CHECK constraint that includes dispatch_company role
-- Only add if column exists and doesn't already have the right constraint
DO $$
BEGIN
  -- Check if role column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    -- Add CHECK constraint to allow all valid roles including dispatch_company
    ALTER TABLE profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('owner', 'dispatcher', 'driver', 'dispatch_company'));
    
    RAISE NOTICE 'Added role constraint to include dispatch_company';
  ELSE
    RAISE WARNING 'Role column not found in profiles table';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Role constraint already exists with correct values';
END $$;

-- Step 4: Update handle_new_user function to support dispatch_company role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a profile for the new user with default status 'active'
  INSERT INTO public.profiles (id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::text, 'owner'),
    'active' -- Default status for new users
  )
  ON CONFLICT (id) DO NOTHING; -- Don't error if profile already exists
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The existing RLS policies on companies table already work for dispatch_company
-- because they check auth.uid() = owner_id, and dispatch companies also set owner_id
-- to their user ID when creating a company. No policy changes needed.

-- Note: The dispatcher_company_associations table uses dispatcher_id which can be
-- any user with dispatcher or dispatch_company role. The existing structure should work.

