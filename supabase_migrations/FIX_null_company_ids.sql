-- Fix NULL company_id values in loads, transporters, and drivers tables
-- Run this if you got the error about NULL values when making company_id NOT NULL

-- First, create the companies table if it doesn't exist
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON companies(owner_id);

-- Enable RLS if not already enabled
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'companies' 
    AND policyname = 'Users can view their own company'
  ) THEN
    CREATE POLICY "Users can view their own company"
      ON companies FOR SELECT
      TO authenticated
      USING (auth.uid() = owner_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'companies' 
    AND policyname = 'Users can update their own company'
  ) THEN
    CREATE POLICY "Users can update their own company"
      ON companies FOR UPDATE
      TO authenticated
      USING (auth.uid() = owner_id)
      WITH CHECK (auth.uid() = owner_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'companies' 
    AND policyname = 'Users can insert their own company'
  ) THEN
    CREATE POLICY "Users can insert their own company"
      ON companies FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = owner_id);
  END IF;
END $$;

-- Now ensure we have at least one company
DO $$
DECLARE
  first_owner_id UUID;
  default_company_id UUID;
BEGIN
  -- Check if companies table has data
  IF NOT EXISTS (SELECT 1 FROM companies LIMIT 1) THEN
    -- Get the first owner
    SELECT id INTO first_owner_id
    FROM auth.users
    WHERE id IN (SELECT id FROM profiles WHERE role = 'owner')
    ORDER BY created_at ASC
    LIMIT 1;

    IF first_owner_id IS NOT NULL THEN
      -- Create a company for the first owner
      INSERT INTO companies (name, owner_id)
      VALUES (
        COALESCE(
          (SELECT name FROM profiles WHERE id = first_owner_id) || '''s Company',
          'Default Company'
        ),
        first_owner_id
      )
      ON CONFLICT (owner_id) DO NOTHING;
    END IF;
  END IF;

  -- Get the default company_id
  SELECT id INTO default_company_id
  FROM companies
  ORDER BY created_at ASC
  LIMIT 1;

  IF default_company_id IS NULL THEN
    RAISE EXCEPTION 'No companies found. Please create at least one owner account first.';
  END IF;

  -- Check if company_id columns exist before updating
  -- Add company_id to loads if it doesn't exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loads' AND column_name = 'company_id') THEN
    UPDATE loads
    SET company_id = default_company_id
    WHERE company_id IS NULL;
  END IF;

  -- Add company_id to transporters if it doesn't exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transporters' AND column_name = 'company_id') THEN
    UPDATE transporters
    SET company_id = default_company_id
    WHERE company_id IS NULL;
  END IF;

  -- Add company_id to drivers if it doesn't exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'company_id') THEN
    UPDATE drivers
    SET company_id = default_company_id
    WHERE company_id IS NULL;
  END IF;

  -- Update profiles that don't have company_id
  UPDATE profiles
  SET company_id = default_company_id
  WHERE company_id IS NULL
  AND role IN ('dispatcher', 'driver');

  -- Verify no NULLs remain (only if columns exist)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loads' AND column_name = 'company_id') THEN
    IF EXISTS (SELECT 1 FROM loads WHERE company_id IS NULL) THEN
      RAISE EXCEPTION 'loads table still has NULL company_id values after update';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transporters' AND column_name = 'company_id') THEN
    IF EXISTS (SELECT 1 FROM transporters WHERE company_id IS NULL) THEN
      RAISE EXCEPTION 'transporters table still has NULL company_id values after update';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drivers' AND column_name = 'company_id') THEN
    IF EXISTS (SELECT 1 FROM drivers WHERE company_id IS NULL) THEN
      RAISE EXCEPTION 'drivers table still has NULL company_id values after update';
    END IF;
  END IF;

  RAISE NOTICE 'All NULL company_id values have been fixed';
END $$;

-- Now try to make the columns NOT NULL (if they aren't already)
DO $$
BEGIN
  -- Check if column is already NOT NULL, if not, make it NOT NULL
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'loads' 
    AND column_name = 'company_id' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE loads ALTER COLUMN company_id SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'transporters' 
    AND column_name = 'company_id' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE transporters ALTER COLUMN company_id SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'drivers' 
    AND column_name = 'company_id' 
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE drivers ALTER COLUMN company_id SET NOT NULL;
  END IF;
END $$;

