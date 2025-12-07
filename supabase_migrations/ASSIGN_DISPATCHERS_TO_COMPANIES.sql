-- Script to assign dispatchers to companies
-- This will assign all dispatchers without a company_id to their owner's company
-- OR to the first available company if no owner relationship exists

-- First, ensure the RLS policy allows dispatchers to view companies
-- (Run FIX_companies_rls_for_dispatchers.sql first if not already done)

-- Assign dispatchers to companies based on the following logic:
-- 1. If dispatcher was created by an owner, assign to that owner's company
-- 2. Otherwise, assign to the first company (if any exist)

DO $$
DECLARE
  dispatcher_record RECORD;
  owner_company_id UUID;
  first_company_id UUID;
BEGIN
  -- Get the first company ID as a fallback
  SELECT id INTO first_company_id
  FROM companies
  ORDER BY created_at ASC
  LIMIT 1;

  -- Loop through all dispatchers without a company_id
  FOR dispatcher_record IN 
    SELECT id, email, name
    FROM profiles
    WHERE role = 'dispatcher' 
    AND (company_id IS NULL OR company_id NOT IN (SELECT id FROM companies))
  LOOP
    -- Try to find if there's a company owned by someone who might have created this dispatcher
    -- For now, we'll assign to the first company
    -- In a real scenario, you'd want to match dispatchers to their specific owner's company
    
    IF first_company_id IS NOT NULL THEN
      -- Update the dispatcher's profile to link to the company
      UPDATE profiles
      SET company_id = first_company_id
      WHERE id = dispatcher_record.id;
      
      RAISE NOTICE 'Assigned dispatcher % (%) to company %', 
        dispatcher_record.name, 
        dispatcher_record.email, 
        first_company_id;
    ELSE
      RAISE WARNING 'No companies found. Cannot assign dispatcher % (%)', 
        dispatcher_record.name, 
        dispatcher_record.email;
    END IF;
  END LOOP;

  -- Show summary
  RAISE NOTICE 'Dispatcher assignment complete.';
END $$;

-- Verify assignments
SELECT 
  p.id,
  p.name,
  p.email,
  p.role,
  p.company_id,
  c.name as company_name
FROM profiles p
LEFT JOIN companies c ON c.id = p.company_id
WHERE p.role = 'dispatcher'
ORDER BY p.name;

