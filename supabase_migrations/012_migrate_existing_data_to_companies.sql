-- ⚠️ SAFE MIGRATION: This script does NOT delete any data
-- Migration script to assign existing data to companies
-- This creates companies for all existing owners and assigns existing data to the first owner's company
--
-- SAFETY: This migration only:
-- - Creates new companies (no data deletion)
-- - Updates company_id values (no data deletion)
-- - Sets NOT NULL constraints (only after ensuring all rows have values)
-- - Does NOT delete, truncate, or remove any existing data

-- Step 1: Create companies for all existing owners
-- Get the first owner (by created_at) to assign all existing data
DO $$
DECLARE
  first_owner_id UUID;
  owner_record RECORD;
  owner_company_id UUID;
BEGIN
  -- Get the first owner (by created_at in auth.users)
  SELECT id INTO first_owner_id
  FROM auth.users
  WHERE id IN (SELECT id FROM profiles WHERE role = 'owner')
  ORDER BY created_at ASC
  LIMIT 1;

  -- Create companies for all owners
  FOR owner_record IN 
    SELECT p.id, p.name, u.email
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.role = 'owner'
    ORDER BY u.created_at ASC
  LOOP
    -- Create company for this owner
    INSERT INTO companies (name, owner_id)
    VALUES (
      COALESCE(owner_record.name || '''s Company', 'Company ' || owner_record.email),
      owner_record.id
    )
    ON CONFLICT (owner_id) DO NOTHING
    RETURNING id INTO owner_company_id;

    -- Update profile to link to company
    UPDATE profiles
    SET company_id = (
      SELECT id FROM companies WHERE owner_id = owner_record.id
    )
    WHERE id = owner_record.id;
  END LOOP;

  -- Step 2: Assign all existing loads, transporters, and drivers to the first owner's company
  IF first_owner_id IS NOT NULL THEN
    -- Get the first owner's company_id
    SELECT id INTO owner_company_id
    FROM companies
    WHERE owner_id = first_owner_id;

    -- Update all loads to belong to first owner's company
    UPDATE loads
    SET company_id = owner_company_id
    WHERE company_id IS NULL;

    -- Update all transporters to belong to first owner's company
    UPDATE transporters
    SET company_id = owner_company_id
    WHERE company_id IS NULL;

    -- Update all drivers to belong to first owner's company
    UPDATE drivers
    SET company_id = owner_company_id
    WHERE company_id IS NULL;

    -- Update all dispatchers (non-owners) to belong to first owner's company
    UPDATE profiles
    SET company_id = owner_company_id
    WHERE role IN ('dispatcher', 'driver')
    AND company_id IS NULL;
  END IF;
END $$;

-- Step 3: Make company_id NOT NULL for loads, transporters, and drivers
-- First, ensure all rows have a company_id (set to first company if still null)
UPDATE loads SET company_id = (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1) WHERE company_id IS NULL;
UPDATE transporters SET company_id = (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1) WHERE company_id IS NULL;
UPDATE drivers SET company_id = (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1) WHERE company_id IS NULL;

-- Now make the columns NOT NULL
ALTER TABLE loads ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE transporters ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE drivers ALTER COLUMN company_id SET NOT NULL;

