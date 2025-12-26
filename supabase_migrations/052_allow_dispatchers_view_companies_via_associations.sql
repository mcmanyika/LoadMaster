-- Allow dispatchers to view companies they're associated with
-- This is needed for dispatchers to see company names when querying dispatcher_company_associations
-- with joins to the companies table (e.g., company:companies(id, name, owner_id))
--
-- The issue: When a dispatcher queries dispatcher_company_associations with company:companies(...),
-- Supabase needs to check RLS on the companies table. The join requires that dispatchers can view
-- the companies they're associated with.

-- Check if the function exists, if not we'll use a direct query
-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Users can view their company" ON companies;

-- Create updated SELECT policy that allows dispatchers to view companies via associations
-- Use a direct check first (simpler and more reliable), then fall back to function if it exists
CREATE POLICY "Users can view their company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    -- Owners can view their own company
    owner_id = auth.uid()
    OR
    -- Dispatchers can view companies they're directly associated with
    -- Use SECURITY DEFINER function to avoid RLS recursion
    id IN (
      SELECT company_id
      FROM get_dispatcher_company_ids(auth.uid())
    )
    OR
    -- Use the existing function if it exists (from migration 019) as a fallback
    (EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'can_view_company_by_association'
    ) AND can_view_company_by_association(id))
    OR
    -- Backward compatibility: Check profiles.company_id
    id IN (
      SELECT company_id
      FROM profiles
      WHERE id = auth.uid()
        AND company_id IS NOT NULL
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
    RAISE NOTICE 'RLS policy for companies table updated successfully to allow dispatchers via associations';
  ELSE
    RAISE WARNING 'RLS policy for companies table may not have been updated';
  END IF;
END $$;

