-- ⚠️ SAFE MIGRATION: This script does NOT delete any data
-- Add status column to profiles table to track active/inactive users
--
-- SAFETY: This migration only:
-- - Adds a new column (no data deletion)
-- - Sets default values for existing records (no data deletion)
-- - Creates an index (no data deletion)
-- - Does NOT delete, truncate, or modify any existing data

-- Add status column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Update all existing profiles to be 'active' by default (if they don't have a status)
UPDATE profiles 
SET status = 'active' 
WHERE status IS NULL;

-- Make status NOT NULL after setting defaults
ALTER TABLE profiles 
ALTER COLUMN status SET NOT NULL;

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Add comment
COMMENT ON COLUMN profiles.status IS 'User status: active or inactive';

-- Verify the column was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'status'
  ) THEN
    RAISE NOTICE 'Status column added to profiles table successfully';
  ELSE
    RAISE WARNING 'Status column may not have been added to profiles table';
  END IF;
END $$;

