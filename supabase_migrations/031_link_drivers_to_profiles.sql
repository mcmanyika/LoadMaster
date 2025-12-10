-- ⚠️ SAFE MIGRATION: This script does NOT delete any data
-- Link drivers table to profiles table
-- Allows drivers with user profiles to be associated with companies
--
-- SAFETY: This migration only:
-- - Adds new column (no data deletion)
-- - Creates indexes (no data deletion)
-- - Migrates existing data (no data deletion)
-- - Does NOT delete, truncate, or modify any existing data

-- =====================================================
-- STEP 1: Add profile_id column to drivers table
-- =====================================================
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index on profile_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_drivers_profile_id ON drivers(profile_id);

-- Add comment
COMMENT ON COLUMN drivers.profile_id IS 'Reference to the driver profile (for drivers with user accounts)';

-- =====================================================
-- STEP 2: Migrate Existing Drivers
-- =====================================================
-- For existing drivers in drivers table:
-- Try to match by email to find existing profile
-- If profile exists with role='driver', create association and link profile_id
DO $$
DECLARE
  driver_record RECORD;
  profile_record RECORD;
  association_record RECORD;
BEGIN
  -- Migrate from drivers table: try to match by email
  FOR driver_record IN 
    SELECT id, name, email, phone, company_id
    FROM drivers
    WHERE email IS NOT NULL
    AND profile_id IS NULL
  LOOP
    -- Try to find matching profile by email
    SELECT id, role INTO profile_record
    FROM profiles
    WHERE email = driver_record.email
    AND role = 'driver'
    LIMIT 1;
    
    IF profile_record.id IS NOT NULL THEN
      -- Link driver to profile
      UPDATE drivers
      SET profile_id = profile_record.id
      WHERE id = driver_record.id;
      
      -- Create association if company_id exists
      IF driver_record.company_id IS NOT NULL THEN
        -- Check if association already exists
        SELECT id INTO association_record
        FROM driver_company_associations
        WHERE driver_id = profile_record.id
        AND company_id = driver_record.company_id
        LIMIT 1;
        
        IF association_record.id IS NULL THEN
          -- Create association
          INSERT INTO driver_company_associations (
            driver_id,
            company_id,
            status,
            joined_at,
            created_at,
            updated_at
          )
          VALUES (
            profile_record.id,
            driver_record.company_id,
            'active',
            NOW(),
            NOW(),
            NOW()
          )
          ON CONFLICT (driver_id, company_id) DO NOTHING;
          
          RAISE NOTICE 'Created association for driver % (profile %) to company %', 
            driver_record.id, 
            profile_record.id,
            driver_record.company_id;
        END IF;
      END IF;
      
      RAISE NOTICE 'Linked driver % to profile %', driver_record.id, profile_record.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Data migration complete';
END $$;

-- Verify the column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'drivers' 
    AND column_name = 'profile_id'
  ) THEN
    RAISE NOTICE 'profile_id column added successfully to drivers table';
  ELSE
    RAISE WARNING 'profile_id column may not have been added';
  END IF;
END $$;

