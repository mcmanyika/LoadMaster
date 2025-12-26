-- Allow dispatchers to see all loads for owner companies that their dispatch company serves
-- This extends the loads SELECT policy to follow:
-- dispatcher -> dispatch company's own company -> owner company
-- so dispatchers see all loads for those owner companies, not just loads
-- where dispatcher = their name.

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view loads from their company" ON loads;

-- Create updated SELECT policy
CREATE POLICY "Users can view loads from their company"
  ON loads FOR SELECT
  TO authenticated
  USING (
    -- 1) Owners and dispatch companies: loads from companies they own
    company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR
    -- 2) Dispatchers and dispatch companies: loads from companies they're directly associated with
    company_id IN (
      SELECT company_id
      FROM dispatcher_company_associations
      WHERE dispatcher_id = auth.uid()
        AND status = 'active'
    )
    OR
    -- 3) Dispatchers: loads from owner companies that their dispatch company serves
    company_id IN (
      SELECT dca_owner.company_id
      FROM dispatcher_company_associations dca_dispatcher
      JOIN companies dispatch_co
        ON dispatch_co.id = dca_dispatcher.company_id
      JOIN dispatcher_company_associations dca_owner
        ON dca_owner.dispatcher_id = dispatch_co.owner_id
       AND dca_owner.status = 'active'
      WHERE dca_dispatcher.dispatcher_id = auth.uid()
        AND dca_dispatcher.status = 'active'
    )
    OR
    -- 4) Backward compatibility: profiles.company_id
    company_id IN (
      SELECT company_id
      FROM profiles
      WHERE id = auth.uid()
        AND company_id IS NOT NULL
    )
  );

-- Keep INSERT/UPDATE/DELETE policies from 040_add_dispatch_company_loads_rls.sql as-is


