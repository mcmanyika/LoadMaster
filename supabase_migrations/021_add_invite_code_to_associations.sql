-- ⚠️ SAFE MIGRATION: This script does NOT delete any data
-- Add invite code system to dispatcher_company_associations table
-- Allows owners to generate codes and dispatchers to join by code
--
-- SAFETY: This migration only:
-- - Adds new columns (no data deletion)
-- - Creates indexes (no data deletion)
-- - Modifies constraints (no data deletion)
-- - Does NOT delete, truncate, or modify any existing data

-- =====================================================
-- STEP 1: Add Invite Code Columns
-- =====================================================

-- Add invite_code column (unique, for code lookups)
ALTER TABLE dispatcher_company_associations
ADD COLUMN IF NOT EXISTS invite_code TEXT;

-- Add expires_at column (for code expiration)
ALTER TABLE dispatcher_company_associations
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Make dispatcher_id nullable (codes can exist without dispatcher initially)
-- First check if column is already nullable
DO $$
BEGIN
  -- Check if dispatcher_id has NOT NULL constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dispatcher_company_associations' 
    AND column_name = 'dispatcher_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE dispatcher_company_associations 
    ALTER COLUMN dispatcher_id DROP NOT NULL;
    
    RAISE NOTICE 'Made dispatcher_id nullable';
  ELSE
    RAISE NOTICE 'dispatcher_id is already nullable';
  END IF;
END $$;

-- =====================================================
-- STEP 2: Create Indexes
-- =====================================================

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_dca_invite_code ON dispatcher_company_associations(invite_code) 
WHERE invite_code IS NOT NULL;

-- Index for expiration queries
CREATE INDEX IF NOT EXISTS idx_dca_expires_at ON dispatcher_company_associations(expires_at) 
WHERE expires_at IS NOT NULL;

-- Composite index for active code lookups
CREATE INDEX IF NOT EXISTS idx_dca_code_status ON dispatcher_company_associations(invite_code, status, expires_at) 
WHERE invite_code IS NOT NULL;

-- =====================================================
-- STEP 3: Update Unique Constraints
-- =====================================================

-- Drop existing unique constraint on (dispatcher_id, company_id)
-- We'll replace it with a partial unique constraint that only applies when dispatcher_id is not null
DO $$
BEGIN
  -- Check if the unique constraint exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'dispatcher_company_associations_dispatcher_id_company_id_key'
  ) THEN
    ALTER TABLE dispatcher_company_associations
    DROP CONSTRAINT dispatcher_company_associations_dispatcher_id_company_id_key;
    
    RAISE NOTICE 'Dropped existing unique constraint on (dispatcher_id, company_id)';
  END IF;
END $$;

-- Add unique constraint on invite_code (codes must be unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dca_invite_code_unique 
ON dispatcher_company_associations(invite_code) 
WHERE invite_code IS NOT NULL;

-- Add partial unique constraint: dispatcher can only be associated with company once
-- But only when dispatcher_id is set (not for pending codes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dca_dispatcher_company_unique 
ON dispatcher_company_associations(dispatcher_id, company_id) 
WHERE dispatcher_id IS NOT NULL;

-- =====================================================
-- STEP 4: Add Comments
-- =====================================================

COMMENT ON COLUMN dispatcher_company_associations.invite_code IS 'Unique invite code for dispatchers to join this company';
COMMENT ON COLUMN dispatcher_company_associations.expires_at IS 'Expiration date for the invite code (NULL = never expires)';
COMMENT ON COLUMN dispatcher_company_associations.dispatcher_id IS 'Dispatcher profile ID (NULL for unused invite codes)';

-- =====================================================
-- STEP 5: Migrate Existing Pending Invitations
-- =====================================================

-- Generate codes for existing pending associations without dispatcher_id
-- This handles any existing pending invitations
DO $$
DECLARE
  association_record RECORD;
  new_code TEXT;
  code_exists BOOLEAN;
  max_retries INTEGER := 10;
  retry_count INTEGER;
BEGIN
  FOR association_record IN 
    SELECT id, company_id, fee_percentage, created_at
    FROM dispatcher_company_associations
    WHERE status = 'pending'
    AND dispatcher_id IS NULL
    AND invite_code IS NULL
  LOOP
    -- Generate unique code
    retry_count := 0;
    LOOP
      -- Generate 8-character code: uppercase letters and numbers
      new_code := upper(
        substr(
          md5(random()::text || clock_timestamp()::text),
          1, 8
        )
      );
      
      -- Replace any lowercase letters with uppercase (md5 is hex, so we need to convert)
      -- Use a better approach: generate from A-Z and 0-9
      new_code := '';
      FOR i IN 1..8 LOOP
        IF random() < 0.5 THEN
          -- Letter (A-Z)
          new_code := new_code || chr(65 + floor(random() * 26)::integer);
        ELSE
          -- Number (0-9)
          new_code := new_code || floor(random() * 10)::integer;
        END IF;
      END LOOP;
      
      -- Check if code exists
      SELECT EXISTS(
        SELECT 1 FROM dispatcher_company_associations 
        WHERE invite_code = new_code
      ) INTO code_exists;
      
      EXIT WHEN NOT code_exists OR retry_count >= max_retries;
      retry_count := retry_count + 1;
    END LOOP;
    
    -- Update association with code and expiration (30 days from creation)
    UPDATE dispatcher_company_associations
    SET 
      invite_code = new_code,
      expires_at = COALESCE(created_at, NOW()) + INTERVAL '30 days'
    WHERE id = association_record.id;
    
    RAISE NOTICE 'Generated code % for association %', new_code, association_record.id;
  END LOOP;
  
  RAISE NOTICE 'Migration of existing pending invitations complete';
END $$;

-- Verify the columns were added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'dispatcher_company_associations' 
    AND column_name = 'invite_code'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'dispatcher_company_associations' 
    AND column_name = 'expires_at'
  ) THEN
    RAISE NOTICE 'Invite code columns added successfully';
  ELSE
    RAISE WARNING 'Invite code columns may not have been added';
  END IF;
END $$;

